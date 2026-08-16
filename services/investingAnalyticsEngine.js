/**
 * services/investingAnalyticsEngine.js
 * 
 * Stage C.4.1 Portfolio Valuation, Aggregation & Performance P&L Engine.
 * 
 * ARCHITECTURAL RESPONSIBILITIES:
 * 1. Pure Read-Only Calculation: Zero mutations to Cash, MoneyFlow, Holdings, or Events.
 * 2. Chronological Event Replay: Accurately reconstructs point-in-time WAC for historical SELL events.
 * 3. Non-Double-Counting Net Economic Return:
 *    netEconomicReturn = unrealizedGain + realizedGain + netDividends - standaloneFees - standaloneTaxes
 * 4. Multi-Portfolio Scoping: Supports single portfolioId queries and global portfolio aggregation.
 * 5. Quote Fallback & Coverage Tracking: Exposes valuationBasis (MARKET_QUOTE | PARTIAL_FALLBACK | COST_BASIS_FALLBACK | EMPTY).
 * 6. Finite-Safe Math: Guards against NaN and division-by-zero on empty/zero portfolios.
 */

import { loadHoldings, loadInvestmentEvents } from './storage.js';
import MarketDataService from './marketDataService.js';
import { EventType, InvestmentEventStatus } from './investingSchemas.js';

export const InvestingAnalyticsEngine = {
    /**
     * Reconstructs chronological realization history and calculates point-in-time realized P&L.
     * 
     * @param {Object} filter { portfolioId, symbol }
     * @returns {Object} { realizedGain, netDividends, standaloneFees, standaloneTaxes, sellEventsSummary }
     */
    async reconstructRealizationMetrics(filter = {}) {
        const { portfolioId = null, symbol = null } = filter;
        const allEvents = await loadInvestmentEvents();
        const allHoldings = await loadHoldings();
        const holdingMap = new Map(allHoldings.map(h => [h.id, h.symbol]));

        // Filter confirmed events matching scope
        const confirmedEvents = allEvents.filter(e => {
            if (e.status !== InvestmentEventStatus.CONFIRMED) return false;
            if (portfolioId && e.portfolioId !== portfolioId) return false;
            const evtSym = (e.symbol || e.metadata?.symbol || holdingMap.get(e.holdingId) || '').toUpperCase();
            if (symbol && evtSym && evtSym !== symbol.toUpperCase()) return false;
            return true;
        });

        // Sort chronologically by date / createdAt
        confirmedEvents.sort((a, b) => {
            const timeA = new Date(a.date || a.createdAt).getTime();
            const timeB = new Date(b.date || b.createdAt).getTime();
            return timeA - timeB;
        });

        const perSecurityLedger = {}; // symbol -> { netQuantity, totalInvestedCost, averageCost }
        let totalRealizedGain = 0;
        let totalNetDividends = 0;
        let totalStandaloneFees = 0;
        let totalStandaloneTaxes = 0;
        const sellSummary = [];
        const integrityWarnings = [];

        for (const evt of confirmedEvents) {
            const sym = (evt.symbol || evt.metadata?.symbol || holdingMap.get(evt.holdingId) || 'UNKNOWN').toUpperCase();
            if (!perSecurityLedger[sym]) {
                perSecurityLedger[sym] = { netQuantity: 0, totalInvestedCost: 0, averageCost: 0 };
            }

            const sec = perSecurityLedger[sym];

            const qty = Number(evt.quantity) || 0;
            const price = Number(evt.price) || 0;
            const fees = Number(evt.fees) || 0;
            const taxes = Number(evt.taxes) || 0;
            const amount = Number(evt.amount) || 0;

            if (evt.type === EventType.BUY) {
                sec.netQuantity = Number((sec.netQuantity + qty).toFixed(4));
                sec.totalInvestedCost = Number((sec.totalInvestedCost + (qty * price)).toFixed(2));
                sec.averageCost = sec.netQuantity > 0 ? Number((sec.totalInvestedCost / sec.netQuantity).toFixed(4)) : 0;
            } else if (evt.type === EventType.BONUS) {
                // Bonus shares increase quantity with 0 added cost
                sec.netQuantity = Number((sec.netQuantity + qty).toFixed(4));
                sec.averageCost = sec.netQuantity > 0 ? Number((sec.totalInvestedCost / sec.netQuantity).toFixed(4)) : 0;
            } else if (evt.type === EventType.SPLIT) {
                // Stock split adjusts quantity while preserving cost basis
                if (evt.metadata && evt.metadata.quantityAfter) {
                    sec.netQuantity = Number(evt.metadata.quantityAfter);
                } else if (qty > 0) {
                    sec.netQuantity = Number((sec.netQuantity + qty).toFixed(4));
                }
                sec.averageCost = sec.netQuantity > 0 ? Number((sec.totalInvestedCost / sec.netQuantity).toFixed(4)) : 0;
            } else if (evt.type === EventType.SELL) {
                // Point-in-time WAC immediately before sale
                const pointInTimeWAC = sec.averageCost;
                let sellQty = qty;

                // Integrity Check: Detect historical oversell
                if (qty > sec.netQuantity) {
                    integrityWarnings.push({
                        type: 'HISTORICAL_OVERSELL',
                        eventId: evt.id,
                        symbol: sym,
                        requestedSellQty: qty,
                        availableQty: sec.netQuantity,
                        message: `Historical SELL event ${evt.id} for ${sym} requested ${qty} units but reconstructed available quantity was ${sec.netQuantity}`
                    });
                    sellQty = Math.max(0, sec.netQuantity);
                }

                const costBasisOfSold = Number((sellQty * pointInTimeWAC).toFixed(2));
                const grossProceeds = Number((sellQty * price).toFixed(2));
                const sellRealizedGain = Number((grossProceeds - costBasisOfSold - fees - taxes).toFixed(2));

                totalRealizedGain = Number((totalRealizedGain + sellRealizedGain).toFixed(2));
                sec.netQuantity = Number((Math.max(0, sec.netQuantity - sellQty)).toFixed(4));
                sec.totalInvestedCost = Number((Math.max(0, sec.totalInvestedCost - costBasisOfSold)).toFixed(2));
                sec.averageCost = sec.netQuantity > 0 ? Number((sec.totalInvestedCost / sec.netQuantity).toFixed(4)) : 0;

                sellSummary.push({
                    eventId: evt.id,
                    symbol: sym,
                    sellQty,
                    sellPrice: price,
                    grossProceeds,
                    pointInTimeWAC,
                    costBasisOfSold,
                    fees,
                    taxes,
                    netRealizedGain: sellRealizedGain,
                    oversellFlag: qty > sec.netQuantity
                });
            } else if (evt.type === EventType.DIVIDEND) {
                const netDiv = evt.metadata?.netDividend !== undefined 
                    ? Number(evt.metadata.netDividend) 
                    : Number((amount - taxes).toFixed(2));
                totalNetDividends = Number((totalNetDividends + netDiv).toFixed(2));
            } else if (evt.type === EventType.FEE) {
                const feeAmt = evt.metadata?.feeAmount !== undefined ? Number(evt.metadata.feeAmount) : (fees || amount);
                totalStandaloneFees = Number((totalStandaloneFees + feeAmt).toFixed(2));
            } else if (evt.type === EventType.TAX) {
                const taxAmt = evt.metadata?.taxAmount !== undefined ? Number(evt.metadata.taxAmount) : (taxes || amount);
                totalStandaloneTaxes = Number((totalStandaloneTaxes + taxAmt).toFixed(2));
            }
        }

        return {
            totalRealizedGain,
            totalNetDividends,
            totalStandaloneFees,
            totalStandaloneTaxes,
            sellSummary,
            ledgerIntegrity: integrityWarnings.length === 0 ? 'VALID' : 'INCONSISTENT',
            integrityWarnings
        };

    },

    /**
     * Calculates the complete portfolio valuation, aggregation, and P&L breakdown.
     * 
     * @param {Object} options { portfolioId = null }
     * @returns {Object} Portfolio analytics snapshot
     */
    async getPortfolioSummary(options = {}) {
        const { portfolioId = null } = options;

        // 1. Load active holdings
        const allHoldings = await loadHoldings();
        const activeHoldings = allHoldings.filter(h => {
            if (h.status === 'DELETED') return false;
            if (portfolioId && h.portfolioId !== portfolioId) return false;
            const qty = Number(h.quantity);
            return Number.isFinite(qty) && qty > 0;
        });

        // 2. Fetch realization metrics via chronological event replay
        const realization = await this.reconstructRealizationMetrics({ portfolioId });

        if (activeHoldings.length === 0) {
            return {
                portfolioId: portfolioId || 'ALL_PORTFOLIOS',
                totalCurrentCostBasis: 0,
                totalMarketValue: 0,
                unrealizedGain: 0,
                unrealizedReturnPercent: 0,
                realizedGain: realization.totalRealizedGain,
                netDividends: realization.totalNetDividends,
                standaloneFees: realization.totalStandaloneFees,
                standaloneTaxes: realization.totalStandaloneTaxes,
                netEconomicReturn: Number((realization.totalRealizedGain + realization.totalNetDividends - realization.totalStandaloneFees - realization.totalStandaloneTaxes).toFixed(2)),
                netEconomicReturnPercent: 0,
                valuationBasis: 'EMPTY',
                ledgerIntegrity: realization.ledgerIntegrity,
                integrityWarnings: realization.integrityWarnings,
                quoteCoverage: {
                    totalHoldings: 0,
                    marketValued: 0,
                    costBasisFallback: 0
                },
                holdings: []
            };
        }


        let totalCurrentCostBasis = 0;
        let totalMarketValue = 0;
        let marketValuedCount = 0;
        let costBasisFallbackCount = 0;
        const holdingBreakdown = [];

        for (const h of activeHoldings) {
            const sym = (h.symbol || 'UNKNOWN').toUpperCase();
            const qty = Number(h.quantity);
            const avgCost = Number(h.averageCost);
            const costBasis = Number((qty * avgCost).toFixed(2));
            totalCurrentCostBasis = Number((totalCurrentCostBasis + costBasis).toFixed(2));

            // Fetch quote
            let quote = null;
            try {
                quote = await MarketDataService.getQuote(sym);
            } catch (err) {
                quote = { quoteStatus: 'UNAVAILABLE', price: avgCost };
            }

            const isQuoteAvailable = quote && 
                                     (quote.quoteStatus === 'LIVE' || quote.quoteStatus === 'STALE') && 
                                     Number.isFinite(Number(quote.price)) && 
                                     Number(quote.price) > 0;

            let currentPrice = avgCost;
            let mktVal = costBasis;
            let unrlGain = 0;
            let unrlPercent = 0;
            let holdingValBasis = 'COST_BASIS_FALLBACK';

            if (isQuoteAvailable) {
                currentPrice = Number(quote.price);
                mktVal = Number((qty * currentPrice).toFixed(2));
                unrlGain = Number((mktVal - costBasis).toFixed(2));
                unrlPercent = costBasis > 0 ? Number(((unrlGain / costBasis) * 100).toFixed(2)) : 0;
                holdingValBasis = 'MARKET_QUOTE';
                marketValuedCount++;
            } else {
                costBasisFallbackCount++;
            }

            totalMarketValue = Number((totalMarketValue + mktVal).toFixed(2));

            holdingBreakdown.push({
                holdingId: h.id || null,
                portfolioId: h.portfolioId,
                symbol: sym,
                name: h.name || sym,
                assetType: h.assetType || 'STOCK',
                quantity: qty,
                averageCost: avgCost,
                costBasis,
                currentPrice,
                marketValue: mktVal,
                unrealizedGain: unrlGain,
                unrealizedReturnPercent: unrlPercent,
                quoteStatus: quote?.quoteStatus || 'UNAVAILABLE',
                valuationBasis: holdingValBasis
            });
        }

        const totalUnrealizedGain = Number((totalMarketValue - totalCurrentCostBasis).toFixed(2));
        const unrealizedReturnPercent = totalCurrentCostBasis > 0 
            ? Number(((totalUnrealizedGain / totalCurrentCostBasis) * 100).toFixed(2)) 
            : 0;

        const netEconomicReturn = Number((
            totalUnrealizedGain + 
            realization.totalRealizedGain + 
            realization.totalNetDividends - 
            realization.totalStandaloneFees - 
            realization.totalStandaloneTaxes
        ).toFixed(2));

        const netEconomicReturnPercent = totalCurrentCostBasis > 0 
            ? Number(((netEconomicReturn / totalCurrentCostBasis) * 100).toFixed(2)) 
            : 0;

        let portfolioValuationBasis = 'MARKET_QUOTE';
        if (marketValuedCount === 0) {
            portfolioValuationBasis = 'COST_BASIS_FALLBACK';
        } else if (costBasisFallbackCount > 0) {
            portfolioValuationBasis = 'PARTIAL_FALLBACK';
        }

        return {
            portfolioId: portfolioId || 'ALL_PORTFOLIOS',
            totalCurrentCostBasis,
            totalMarketValue,
            unrealizedGain: totalUnrealizedGain,
            unrealizedReturnPercent,
            realizedGain: realization.totalRealizedGain,
            netDividends: realization.totalNetDividends,
            standaloneFees: realization.totalStandaloneFees,
            standaloneTaxes: realization.totalStandaloneTaxes,
            netEconomicReturn,
            netEconomicReturnPercent,
            valuationBasis: portfolioValuationBasis,
            ledgerIntegrity: realization.ledgerIntegrity,
            integrityWarnings: realization.integrityWarnings,
            quoteCoverage: {
                totalHoldings: activeHoldings.length,
                marketValued: marketValuedCount,
                costBasisFallback: costBasisFallbackCount
            },

            holdings: holdingBreakdown
        };
    }
};

export default InvestingAnalyticsEngine;
