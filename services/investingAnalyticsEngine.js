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

export const CANONICAL_ASSET_TYPES = new Set([
    'STOCK',
    'MUTUAL_FUND',
    'ETF',
    'GOLD',
    'CRYPTO',
    'BOND',
    'REAL_ESTATE',
    'OTHER'
]);

function normalizeAssetType(type) {
    if (!type || typeof type !== 'string') return 'OTHER';
    const upper = type.trim().toUpperCase();
    return CANONICAL_ASSET_TYPES.has(upper) ? upper : 'OTHER';
}

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
            const ledgerKey = `${evt.portfolioId || 'default'}:${(evt.holdingId || sym).toUpperCase()}`;
            if (!perSecurityLedger[ledgerKey]) {
                perSecurityLedger[ledgerKey] = { symbol: sym, portfolioId: evt.portfolioId, netQuantity: 0, totalInvestedCost: 0, averageCost: 0 };
            }

            const sec = perSecurityLedger[ledgerKey];


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
                const availableQtyBeforeSale = sec.netQuantity;
                const oversellDetected = qty > availableQtyBeforeSale;
                let sellQty = qty;

                // Integrity Check: Detect historical oversell
                if (oversellDetected) {
                    integrityWarnings.push({
                        type: 'HISTORICAL_OVERSELL',
                        eventId: evt.id,
                        symbol: sym,
                        requestedSellQty: qty,
                        availableQty: availableQtyBeforeSale,
                        message: `Historical SELL event ${evt.id} for ${sym} requested ${qty} units but reconstructed available quantity was ${availableQtyBeforeSale}`
                    });
                    sellQty = Math.max(0, availableQtyBeforeSale);
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
                    oversellFlag: oversellDetected
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
                assetType: normalizeAssetType(h.assetType),
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
    },

    /**
     * Stage C.4.2: Asset Allocation & Concentration Metrics Engine.
     * 
     * Calculates portfolio asset class distributions, holding weight rankings,
     * Top-N concentration ratios, HHI diversification score, and risk tiering.
     * 
     * @param {Object} options { portfolioId = null }
     * @returns {Object} Asset allocation and concentration snapshot
     */
    async getAssetAllocationSummary(options = {}) {
        const { portfolioId = null } = options;

        // 1. Consume C.4.1 Portfolio Valuation directly to guarantee quote/fallback consistency
        const portfolioSummary = await this.getPortfolioSummary({ portfolioId });
        const totalCost = portfolioSummary.totalCurrentCostBasis;
        const totalMkt = portfolioSummary.totalMarketValue;
        const holdings = portfolioSummary.holdings || [];

        // 2. Safe Empty Portfolio Handler
        if (holdings.length === 0) {
            return {
                portfolioId: portfolioId || 'ALL_PORTFOLIOS',
                totalCurrentCostBasis: 0,
                totalMarketValue: 0,
                assetAllocation: [],
                concentration: {
                    totalHoldings: 0,
                    holdings: [],
                    top1Percent: 0,
                    top3Percent: 0,
                    top5Percent: 0,
                    hhi: 0,
                    riskTier: 'EMPTY'
                },
                valuationBasis: 'EMPTY',
                quoteCoverage: {
                    totalHoldings: 0,
                    marketValued: 0,
                    costBasisFallback: 0
                }
            };
        }

        // 3. Asset Class Aggregation
        const classMap = {};
        for (const type of CANONICAL_ASSET_TYPES) {
            classMap[type] = {
                assetType: type,
                holdingCount: 0,
                costBasis: 0,
                marketValue: 0
            };
        }

        for (const h of holdings) {
            const normType = normalizeAssetType(h.assetType);
            const entry = classMap[normType];
            entry.holdingCount += 1;
            entry.costBasis = Number((entry.costBasis + h.costBasis).toFixed(2));
            entry.marketValue = Number((entry.marketValue + h.marketValue).toFixed(2));
        }

        const assetAllocation = Object.values(classMap)
            .filter(c => c.holdingCount > 0)
            .map(c => {
                const costWeightPercent = totalCost > 0 ? Number(((c.costBasis / totalCost) * 100).toFixed(2)) : 0;
                const marketWeightPercent = totalMkt > 0 ? Number(((c.marketValue / totalMkt) * 100).toFixed(2)) : 0;
                const unrealizedGain = Number((c.marketValue - c.costBasis).toFixed(2));
                const unrealizedReturnPercent = c.costBasis > 0 ? Number(((unrealizedGain / c.costBasis) * 100).toFixed(2)) : 0;
                return {
                    assetType: c.assetType,
                    holdingCount: c.holdingCount,
                    costBasis: c.costBasis,
                    marketValue: c.marketValue,
                    costWeightPercent,
                    marketWeightPercent,
                    unrealizedGain,
                    unrealizedReturnPercent
                };
            });

        // 4. Holding-Level Weights & Concentration Analysis
        const holdingWeights = holdings.map(h => {
            const marketWeightPercent = totalMkt > 0 ? Number(((h.marketValue / totalMkt) * 100).toFixed(2)) : 0;
            const costWeightPercent = totalCost > 0 ? Number(((h.costBasis / totalCost) * 100).toFixed(2)) : 0;
            return {
                holdingId: h.holdingId || null,
                portfolioId: h.portfolioId,
                symbol: h.symbol,
                name: h.name,
                assetType: normalizeAssetType(h.assetType),
                costBasis: h.costBasis,
                marketValue: h.marketValue,
                costWeightPercent,
                marketWeightPercent
            };
        });

        // Sort descending by marketValue
        holdingWeights.sort((a, b) => b.marketValue - a.marketValue);

        // Top-N concentration ratios
        const top1Percent = holdingWeights[0] ? holdingWeights[0].marketWeightPercent : 0;
        const top3Percent = Number(holdingWeights.slice(0, 3).reduce((sum, h) => sum + h.marketWeightPercent, 0).toFixed(2));
        const top5Percent = Number(holdingWeights.slice(0, 5).reduce((sum, h) => sum + h.marketWeightPercent, 0).toFixed(2));

        // HHI Diversification Index: Sum(marketWeightPercent^2)
        const hhi = Number(holdingWeights.reduce((sum, h) => sum + Math.pow(h.marketWeightPercent, 2), 0).toFixed(2));

        // Concentration Risk Tiering (Strict > Boundaries)
        let riskTier = 'BALANCED';
        if (holdingWeights.length === 0) {
            riskTier = 'EMPTY';
        } else if (top1Percent > 40.0 || top3Percent > 70.0) {
            riskTier = 'HIGH';
        } else if (top1Percent > 25.0 || top3Percent > 50.0) {
            riskTier = 'MODERATE';
        } else {
            riskTier = 'BALANCED';
        }

        return {
            portfolioId: portfolioId || 'ALL_PORTFOLIOS',
            totalCurrentCostBasis: totalCost,
            totalMarketValue: totalMkt,
            assetAllocation,
            concentration: {
                totalHoldings: holdingWeights.length,
                holdings: holdingWeights,
                top1Percent,
                top3Percent,
                top5Percent,
                hhi,
                riskTier
            },
            valuationBasis: portfolioSummary.valuationBasis,
            quoteCoverage: portfolioSummary.quoteCoverage
        };
    },

    /**
     * Stage C.4.3: Money-Weighted Returns (XIRR) & Time-Weighted Performance (CAGR) Engine.
     * 
     * Extracts chronological cash flows, executes Newton-Raphson XIRR solver with progressive
     * bisection fallback, computes point-to-point active CAGR, and surfaces audit integrity.
     * 
     * @param {Object} options { portfolioId = null, symbol = null, asOfDate = new Date() }
     * @returns {Object} Performance snapshot including XIRR, CAGR, and cash flow accounting
     */
    async getPerformanceMetrics(options = {}) {
        const { portfolioId = null, symbol = null, asOfDate: rawAsOfDate = new Date() } = options;
        const asOfDate = (rawAsOfDate instanceof Date && !isNaN(rawAsOfDate.getTime())) ? rawAsOfDate : new Date(rawAsOfDate);
        const asOfTimeMs = !isNaN(asOfDate.getTime()) ? asOfDate.getTime() : Date.now();

        const allEvents = await loadInvestmentEvents();
        const allHoldings = await loadHoldings();
        const holdingMap = new Map(allHoldings.map(h => [h.id, h.symbol]));

        const integrityWarnings = [];
        let skippedEventCount = 0;
        const relevantEvents = [];

        for (const evt of allEvents) {
            if (evt.status !== InvestmentEventStatus.CONFIRMED) continue;
            if (portfolioId && evt.portfolioId !== portfolioId) continue;
            const evtSym = (evt.symbol || evt.metadata?.symbol || holdingMap.get(evt.holdingId) || '').toUpperCase();
            if (symbol && evtSym && evtSym !== symbol.toUpperCase()) continue;

            const dateVal = evt.date || evt.createdAt;
            const eventDate = new Date(dateVal);
            if (isNaN(eventDate.getTime())) {
                skippedEventCount++;
                integrityWarnings.push({
                    type: 'INVALID_EVENT_DATE',
                    eventId: evt.id,
                    eventType: evt.type,
                    message: `Event ${evt.id} skipped due to invalid date "${dateVal}"`
                });
                continue;
            }

            if (eventDate.getTime() > asOfTimeMs) {
                skippedEventCount++;
                integrityWarnings.push({
                    type: 'FUTURE_EVENT_DATE',
                    eventId: evt.id,
                    eventType: evt.type,
                    message: `Event ${evt.id} skipped because date is after evaluation asOfDate`
                });
                continue;
            }

            relevantEvents.push({
                ...evt,
                parsedDate: eventDate,
                parsedTimeMs: eventDate.getTime(),
                symbol: evtSym
            });
        }

        // Sort chronologically ascending
        relevantEvents.sort((a, b) => a.parsedTimeMs - b.parsedTimeMs);

        // Build historical cash flow vector
        const cashFlows = [];
        let historicalInflows = 0;
        let historicalOutflows = 0;

        for (const evt of relevantEvents) {
            const qty = Number(evt.quantity) || 0;
            const price = Number(evt.price) || 0;
            const fees = Number(evt.fees) || 0;
            const taxes = Number(evt.taxes) || 0;
            const amount = Number(evt.amount) || 0;

            if (evt.type === EventType.BUY) {
                const outflow = Number((qty * price + fees + taxes).toFixed(2));
                if (outflow > 0) {
                    cashFlows.push({ amount: -outflow, dateMs: evt.parsedTimeMs, type: 'BUY' });
                    historicalOutflows = Number((historicalOutflows + outflow).toFixed(2));
                }
            } else if (evt.type === EventType.SELL) {
                const inflow = Number((qty * price - fees - taxes).toFixed(2));
                if (inflow > 0) {
                    cashFlows.push({ amount: inflow, dateMs: evt.parsedTimeMs, type: 'SELL' });
                    historicalInflows = Number((historicalInflows + inflow).toFixed(2));
                }
            } else if (evt.type === EventType.DIVIDEND) {
                const netDiv = evt.metadata?.netDividend !== undefined 
                    ? Number(evt.metadata.netDividend) 
                    : Number((amount - taxes).toFixed(2));
                if (netDiv > 0) {
                    cashFlows.push({ amount: netDiv, dateMs: evt.parsedTimeMs, type: 'DIVIDEND' });
                    historicalInflows = Number((historicalInflows + netDiv).toFixed(2));
                }
            } else if (evt.type === EventType.FEE) {
                const feeAmt = evt.metadata?.feeAmount !== undefined ? Number(evt.metadata.feeAmount) : (fees || amount);
                if (feeAmt > 0) {
                    cashFlows.push({ amount: -feeAmt, dateMs: evt.parsedTimeMs, type: 'FEE' });
                    historicalOutflows = Number((historicalOutflows + feeAmt).toFixed(2));
                }
            } else if (evt.type === EventType.TAX) {
                const taxAmt = evt.metadata?.taxAmount !== undefined ? Number(evt.metadata.taxAmount) : (taxes || amount);
                if (taxAmt > 0) {
                    cashFlows.push({ amount: -taxAmt, dateMs: evt.parsedTimeMs, type: 'TAX' });
                    historicalOutflows = Number((historicalOutflows + taxAmt).toFixed(2));
                }
            }
            // BONUS and SPLIT create ₹0 cash flows
        }

        // Terminal Market Value and Current Cost Basis from C.4.1
        const portfolioSummary = await this.getPortfolioSummary({ portfolioId });
        let terminalMarketValue = 0;
        let currentCostBasis = 0;
        let targetHoldings = portfolioSummary.holdings || [];

        if (symbol) {
            targetHoldings = targetHoldings.filter(h => (h.symbol || '').toUpperCase() === symbol.toUpperCase());
        }

        for (const h of targetHoldings) {
            terminalMarketValue = Number((terminalMarketValue + h.marketValue).toFixed(2));
            currentCostBasis = Number((currentCostBasis + h.costBasis).toFixed(2));
        }

        // Append Terminal Valuation as positive inflow if > 0
        if (terminalMarketValue > 0) {
            cashFlows.push({
                amount: terminalMarketValue,
                dateMs: asOfTimeMs,
                type: 'TERMINAL_VALUATION'
            });
        }

        // Sort cash flows by dateMs
        cashFlows.sort((a, b) => a.dateMs - b.dateMs);

        // Solve XIRR
        const xirrResult = solveXIRR(cashFlows);

        // Holding Period, CAGR & Absolute Return
        const firstEventDateMs = relevantEvents.length > 0 ? relevantEvents[0].parsedTimeMs : asOfTimeMs;
        const holdingPeriodMs = Math.max(0, asOfTimeMs - firstEventDateMs);
        const holdingPeriodDays = Math.round(holdingPeriodMs / (24 * 60 * 60 * 1000));
        const holdingPeriodYears = Number((holdingPeriodDays / 365.25).toFixed(2));

        let cagrPercent = 0;
        let absoluteReturnPercent = 0;
        const performanceType = holdingPeriodYears >= 1.0 ? 'CAGR' : 'ABSOLUTE';

        if (terminalMarketValue === 0 && currentCostBasis > 0 && holdingPeriodYears >= 1.0) {
            cagrPercent = -100.00;
        } else if (currentCostBasis > 0 && terminalMarketValue > 0 && holdingPeriodYears >= 1.0) {
            cagrPercent = Number(((Math.pow(terminalMarketValue / currentCostBasis, 1 / holdingPeriodYears) - 1) * 100).toFixed(2));
        }

        if (currentCostBasis > 0) {
            absoluteReturnPercent = Number((((terminalMarketValue - currentCostBasis) / currentCostBasis) * 100).toFixed(2));
        }

        return {
            portfolioId: portfolioId || 'ALL_PORTFOLIOS',
            symbol: symbol ? symbol.toUpperCase() : null,
            asOfDate: asOfDate.toISOString(),

            xirrPercent: xirrResult.xirrPercent,
            xirrStatus: xirrResult.xirrStatus,

            cagrPercent,
            absoluteReturnPercent,
            performanceType,

            holdingPeriodDays,
            holdingPeriodYears,

            cashFlowSummary: {
                historicalInflows,
                historicalOutflows,
                netHistoricalCapitalDeployed: Number((historicalOutflows - historicalInflows).toFixed(2)),
                terminalMarketValue,
                cashFlowCount: cashFlows.length
            },

            performanceIntegrity: integrityWarnings.length === 0 ? 'VALID' : 'INCOMPLETE',
            integrityWarnings,
            skippedEventCount,

            valuationBasis: portfolioSummary.valuationBasis,
            quoteCoverage: portfolioSummary.quoteCoverage
        };
    }
};

/**
 * Calculates Net Present Value (NPV) for rate r across cash flows.
 */
function calculateNPV(rate, cashFlows, firstDateMs) {
    let npv = 0;
    for (const cf of cashFlows) {
        const yearFraction = (cf.dateMs - firstDateMs) / (365 * 24 * 60 * 60 * 1000);
        npv += cf.amount / Math.pow(1 + rate, yearFraction);
    }
    return npv;
}

/**
 * Calculates the derivative of NPV with respect to rate r.
 */
function calculateNPVDerivative(rate, cashFlows, firstDateMs) {
    let derivative = 0;
    for (const cf of cashFlows) {
        const yearFraction = (cf.dateMs - firstDateMs) / (365 * 24 * 60 * 60 * 1000);
        derivative += (-yearFraction * cf.amount) / Math.pow(1 + rate, yearFraction + 1);
    }
    return derivative;
}

/**
 * Solves for XIRR using Newton-Raphson with deterministic ascending progressive bisection fallback.
 */
function solveXIRR(cashFlows) {
    if (!cashFlows || cashFlows.length === 0) {
        return { xirrPercent: 0, xirrStatus: 'INSUFFICIENT_CASH_FLOWS' };
    }

    let hasPositive = false;
    let hasNegative = false;

    for (const cf of cashFlows) {
        if (cf.amount > 0) {
            hasPositive = true;
        } else if (cf.amount < 0) {
            hasNegative = true;
        }
    }

    // Complete Capital Loss business convention
    if (hasNegative && !hasPositive) {
        return { xirrPercent: -100.00, xirrStatus: 'CALCULATED' };
    }

    if (!hasPositive || !hasNegative || cashFlows.length < 2) {
        return { xirrPercent: 0, xirrStatus: 'INSUFFICIENT_CASH_FLOWS' };
    }


    const firstDateMs = cashFlows[0].dateMs;

    // 1. Primary Solver: Newton-Raphson starting at r0 = 0.10 (10%)
    let rate = 0.10;
    const maxIterations = 100;
    const tolerance = 1e-6;
    let converged = false;

    for (let i = 0; i < maxIterations; i++) {
        if (rate <= -1.0) {
            rate = -0.999;
        }
        const npv = calculateNPV(rate, cashFlows, firstDateMs);
        if (Math.abs(npv) < tolerance) {
            converged = true;
            break;
        }
        const derivative = calculateNPVDerivative(rate, cashFlows, firstDateMs);
        if (Math.abs(derivative) < 1e-12) {
            break; // Switch to bisection
        }
        const nextRate = rate - npv / derivative;
        if (Math.abs(nextRate - rate) < tolerance) {
            rate = nextRate;
            converged = true;
            break;
        }
        rate = nextRate;
        if (rate <= -1.0) {
            rate = -0.999;
        }
    }

    if (converged && Number.isFinite(rate) && rate > -1.0) {
        return { xirrPercent: Number((rate * 100).toFixed(2)), xirrStatus: 'CALCULATED' };
    }

    // 2. Deterministic Ascending Progressive Bisection Fallback
    const progressiveUpperBounds = [10.0, 25.0, 50.0, 100.0];
    const low = -0.999;
    const npvLow = calculateNPV(low, cashFlows, firstDateMs);

    for (const high of progressiveUpperBounds) {
        const npvHigh = calculateNPV(high, cashFlows, firstDateMs);
        if (Math.sign(npvLow) !== Math.sign(npvHigh)) {
            let bLow = low;
            let bHigh = high;
            let bMid = (bLow + bHigh) / 2;

            for (let bStep = 0; bStep < 100; bStep++) {
                bMid = (bLow + bHigh) / 2;
                const npvMid = calculateNPV(bMid, cashFlows, firstDateMs);

                if (Math.abs(npvMid) < tolerance || (bHigh - bLow) < tolerance) {
                    return { xirrPercent: Number((bMid * 100).toFixed(2)), xirrStatus: 'CALCULATED' };
                }

                if (Math.sign(npvMid) === Math.sign(npvLow)) {
                    bLow = bMid;
                } else {
                    bHigh = bMid;
                }
            }
            return { xirrPercent: Number((bMid * 100).toFixed(2)), xirrStatus: 'CALCULATED' };
        }
    }

    return { xirrPercent: 0, xirrStatus: 'FAILED_TO_CONVERGE' };
}

export const TAX_RULE_VERSION = 'C44_V1';

function getTaxHoldingPeriodThreshold(assetType) {
    const norm = normalizeAssetType(assetType);
    if (norm === 'STOCK' || norm === 'ETF') {
        return 365;
    }
    return 730;
}

function resolvePeriodDates(period, startDate, endDate, asOfDate) {
    if (startDate && endDate) {
        return {
            start: new Date(startDate),
            end: new Date(endDate)
        };
    }

    if (period === 'FY2024_25') {
        return {
            start: new Date('2024-04-01T00:00:00.000Z'),
            end: new Date('2025-03-31T23:59:59.999Z')
        };
    } else if (period === 'FY2023_24') {
        return {
            start: new Date('2023-04-01T00:00:00.000Z'),
            end: new Date('2024-03-31T23:59:59.999Z')
        };
    } else if (period === 'FY2025_26') {
        return {
            start: new Date('2025-04-01T00:00:00.000Z'),
            end: new Date('2026-03-31T23:59:59.999Z')
        };
    } else if (period === 'YTD') {
        const year = asOfDate.getUTCFullYear();
        return {
            start: new Date(`${year}-01-01T00:00:00.000Z`),
            end: new Date(asOfDate.getTime())
        };
    }

    // Default: ALL_TIME
    return {
        start: new Date(0),
        end: new Date(asOfDate.getTime())
    };
}

InvestingAnalyticsEngine.generatePortfolioStatement = async function(options = {}) {
    const {
        portfolioId = null,
        period = 'ALL_TIME',
        startDate = null,
        endDate = null,
        asOfDate: rawAsOfDate = new Date()
    } = options;

    const asOfDate = (rawAsOfDate instanceof Date && !isNaN(rawAsOfDate.getTime())) ? rawAsOfDate : new Date(rawAsOfDate);
    const { start: periodStart, end: periodEnd } = resolvePeriodDates(period, startDate, endDate, asOfDate);
    const periodStartMs = periodStart.getTime();
    const periodEndMs = periodEnd.getTime();

    const allEvents = await loadInvestmentEvents();
    const allHoldings = await loadHoldings();
    const holdingMap = new Map(allHoldings.map(h => [h.id, h.symbol]));

    const integrityWarnings = [];
    let skippedEventCount = 0;

    // Validate dates and filter confirmed events
    const confirmedEvents = [];
    for (const evt of allEvents) {
        if (evt.status !== InvestmentEventStatus.CONFIRMED) continue;
        if (portfolioId && evt.portfolioId !== portfolioId) continue;

        const dateVal = evt.date || evt.createdAt;
        const eventDate = new Date(dateVal);
        if (isNaN(eventDate.getTime())) {
            skippedEventCount++;
            integrityWarnings.push({
                type: 'INVALID_EVENT_DATE',
                eventId: evt.id,
                eventType: evt.type,
                message: `Event ${evt.id} skipped due to invalid date string "${dateVal}"`
            });
            continue;
        }

        confirmedEvents.push({
            ...evt,
            parsedDate: eventDate,
            parsedTimeMs: eventDate.getTime()
        });
    }

    confirmedEvents.sort((a, b) => a.parsedTimeMs - b.parsedTimeMs);

    // Dual Chronological Replay: WAC (Economic) + FIFO (Tax)
    const fifoLots = {};
    const wacLedger = {};

    let totalEconomicRealizedGain = 0;
    let totalTaxRealizedGain = 0;
    let totalSTCG = 0;
    let totalLTCG = 0;
    let totalTradeFees = 0;
    let totalTradeTaxes = 0;
    let totalGrossDividends = 0;
    let totalDividendTaxesWithheld = 0;
    let totalNetDividends = 0;
    let dividendEventCount = 0;
    let totalStandaloneFees = 0;
    let totalStandaloneTaxes = 0;
    const periodSells = [];

    for (const evt of confirmedEvents) {
        const sym = (evt.symbol || evt.metadata?.symbol || holdingMap.get(evt.holdingId) || 'UNKNOWN').toUpperCase();
        const ledgerKey = `${evt.portfolioId || 'default'}:${(evt.holdingId || sym).toUpperCase()}`;
        const holdingRecord = allHoldings.find(h => h.id === evt.holdingId || (h.symbol && h.symbol.toUpperCase() === sym));
        const assetType = normalizeAssetType(evt.assetType || evt.metadata?.assetType || holdingRecord?.assetType);

        if (!fifoLots[ledgerKey]) fifoLots[ledgerKey] = [];
        if (!wacLedger[ledgerKey]) wacLedger[ledgerKey] = { netQuantity: 0, totalInvestedCost: 0, averageCost: 0 };

        const sec = wacLedger[ledgerKey];
        const lotQueue = fifoLots[ledgerKey];

        const qty = Number(evt.quantity) || 0;
        const price = Number(evt.price) || 0;
        const fees = Number(evt.fees) || 0;
        const taxes = Number(evt.taxes) || 0;
        const amount = Number(evt.amount) || 0;

        if (evt.type === EventType.BUY) {
            sec.netQuantity = Number((sec.netQuantity + qty).toFixed(4));
            sec.totalInvestedCost = Number((sec.totalInvestedCost + (qty * price)).toFixed(2));
            sec.averageCost = sec.netQuantity > 0 ? Number((sec.totalInvestedCost / sec.netQuantity).toFixed(4)) : 0;

            lotQueue.push({
                quantity: qty,
                buyDate: evt.parsedDate,
                buyPrice: price,
                assetType
            });
        } else if (evt.type === EventType.BONUS) {
            sec.netQuantity = Number((sec.netQuantity + qty).toFixed(4));
            sec.averageCost = sec.netQuantity > 0 ? Number((sec.totalInvestedCost / sec.netQuantity).toFixed(4)) : 0;

            const precedingBuyDate = lotQueue.length > 0 ? lotQueue[0].buyDate : evt.parsedDate;
            lotQueue.push({
                quantity: qty,
                buyDate: precedingBuyDate,
                buyPrice: 0,
                assetType
            });
        } else if (evt.type === EventType.SPLIT) {
            const factor = evt.metadata?.ratio || (evt.metadata?.quantityAfter && sec.netQuantity > 0 ? (evt.metadata.quantityAfter / sec.netQuantity) : 2);
            if (evt.metadata && evt.metadata.quantityAfter) {
                sec.netQuantity = Number(evt.metadata.quantityAfter);
            } else if (qty > 0) {
                sec.netQuantity = Number((sec.netQuantity + qty).toFixed(4));
            }
            sec.averageCost = sec.netQuantity > 0 ? Number((sec.totalInvestedCost / sec.netQuantity).toFixed(4)) : 0;

            for (const lot of lotQueue) {
                lot.quantity = Number((lot.quantity * factor).toFixed(4));
                lot.buyPrice = factor > 0 ? Number((lot.buyPrice / factor).toFixed(4)) : lot.buyPrice;
            }
        } else if (evt.type === EventType.SELL) {
            const isWithinPeriod = evt.parsedTimeMs >= periodStartMs && evt.parsedTimeMs <= periodEndMs;

            const pointInTimeWAC = sec.averageCost;
            const availableQtyBeforeSale = sec.netQuantity;
            const oversellDetected = qty > availableQtyBeforeSale;
            let sellQty = qty;

            if (oversellDetected) {
                integrityWarnings.push({
                    type: 'HISTORICAL_OVERSELL',
                    eventId: evt.id,
                    symbol: sym,
                    requestedSellQty: qty,
                    availableQty: availableQtyBeforeSale,
                    message: `Historical SELL event ${evt.id} for ${sym} requested ${qty} units but available quantity was ${availableQtyBeforeSale}`
                });
                sellQty = Math.max(0, availableQtyBeforeSale);
            }

            const wacCostBasisOfSold = Number((sellQty * pointInTimeWAC).toFixed(2));
            const grossProceeds = Number((sellQty * price).toFixed(2));
            const economicRealizedGain = Number((grossProceeds - wacCostBasisOfSold - fees - taxes).toFixed(2));

            sec.netQuantity = Number((Math.max(0, sec.netQuantity - sellQty)).toFixed(4));
            sec.totalInvestedCost = Number((Math.max(0, sec.totalInvestedCost - wacCostBasisOfSold)).toFixed(2));
            sec.averageCost = sec.netQuantity > 0 ? Number((sec.totalInvestedCost / sec.netQuantity).toFixed(4)) : 0;

            let remainingToConsume = sellQty;
            let fifoCostBasisOfSold = 0;
            let primaryAcquisitionDate = evt.parsedDate;
            let oldestLotHoldingDays = 0;

            while (remainingToConsume > 0 && lotQueue.length > 0) {
                const oldestLot = lotQueue[0];
                if (oldestLotHoldingDays === 0) {
                    primaryAcquisitionDate = oldestLot.buyDate;
                    const holdingDaysMs = Math.max(0, evt.parsedTimeMs - new Date(oldestLot.buyDate).getTime());
                    oldestLotHoldingDays = Math.round(holdingDaysMs / (24 * 3600 * 1000));
                }

                const takeQty = Math.min(remainingToConsume, oldestLot.quantity);
                fifoCostBasisOfSold += takeQty * oldestLot.buyPrice;
                oldestLot.quantity -= takeQty;
                remainingToConsume -= takeQty;

                if (oldestLot.quantity <= 0.00001) {
                    lotQueue.shift();
                }
            }

            fifoCostBasisOfSold = Number(fifoCostBasisOfSold.toFixed(2));
            const taxRealizedGain = Number((grossProceeds - fifoCostBasisOfSold - fees - taxes).toFixed(2));

            const taxThreshold = getTaxHoldingPeriodThreshold(assetType);
            const gainType = oldestLotHoldingDays > taxThreshold ? 'LTCG' : 'STCG';

            if (isWithinPeriod) {
                totalTradeFees = Number((totalTradeFees + fees).toFixed(2));
                totalTradeTaxes = Number((totalTradeTaxes + taxes).toFixed(2));
                totalEconomicRealizedGain = Number((totalEconomicRealizedGain + economicRealizedGain).toFixed(2));
                totalTaxRealizedGain = Number((totalTaxRealizedGain + taxRealizedGain).toFixed(2));

                if (gainType === 'LTCG') {
                    totalLTCG = Number((totalLTCG + taxRealizedGain).toFixed(2));
                } else {
                    totalSTCG = Number((totalSTCG + taxRealizedGain).toFixed(2));
                }

                periodSells.push({
                    eventId: evt.id,
                    symbol: sym,
                    assetType,
                    quantity: sellQty,
                    sellPrice: price,
                    grossProceeds,
                    fees,
                    taxes,

                    // Economic WAC view
                    pointInTimeWAC,
                    wacCostBasisOfSold,
                    economicRealizedGain,

                    // Tax FIFO view
                    acquisitionDate: new Date(primaryAcquisitionDate).toISOString(),
                    fifoCostBasisOfSold,
                    taxRealizedGain,
                    holdingDays: oldestLotHoldingDays,
                    gainType,
                    oversellFlag: oversellDetected
                });
            }
        } else if (evt.type === EventType.DIVIDEND) {
            const isWithinPeriod = evt.parsedTimeMs >= periodStartMs && evt.parsedTimeMs <= periodEndMs;
            const grossDiv = evt.metadata?.grossDividend !== undefined ? Number(evt.metadata.grossDividend) : (evt.amount ? Number(evt.amount) : 0);
            const divTax = evt.metadata?.dividendTaxWithheld !== undefined ? Number(evt.metadata.dividendTaxWithheld) : (evt.taxes ? Number(evt.taxes) : 0);
            const netDiv = evt.metadata?.netDividend !== undefined ? Number(evt.metadata.netDividend) : Number((grossDiv - divTax).toFixed(2));

            if (Math.abs((grossDiv - divTax) - netDiv) > 0.01) {
                integrityWarnings.push({
                    type: 'DIVIDEND_DATA_MISMATCH',
                    eventId: evt.id,
                    grossDividend: grossDiv,
                    taxWithheld: divTax,
                    netDividend: netDiv,
                    message: `Dividend event ${evt.id} gross (${grossDiv}) minus tax (${divTax}) does not equal net (${netDiv})`
                });
            }

            if (isWithinPeriod) {
                totalGrossDividends = Number((totalGrossDividends + grossDiv).toFixed(2));
                totalDividendTaxesWithheld = Number((totalDividendTaxesWithheld + divTax).toFixed(2));
                totalNetDividends = Number((totalNetDividends + netDiv).toFixed(2));
                dividendEventCount++;
            }
        } else if (evt.type === EventType.FEE) {
            const isWithinPeriod = evt.parsedTimeMs >= periodStartMs && evt.parsedTimeMs <= periodEndMs;
            const feeAmt = evt.metadata?.feeAmount !== undefined ? Number(evt.metadata.feeAmount) : (fees || amount);
            if (isWithinPeriod) {
                totalStandaloneFees = Number((totalStandaloneFees + feeAmt).toFixed(2));
            }
        } else if (evt.type === EventType.TAX) {
            const isWithinPeriod = evt.parsedTimeMs >= periodStartMs && evt.parsedTimeMs <= periodEndMs;
            const taxAmt = evt.metadata?.taxAmount !== undefined ? Number(evt.metadata.taxAmount) : (taxes || amount);
            if (isWithinPeriod) {
                totalStandaloneTaxes = Number((totalStandaloneTaxes + taxAmt).toFixed(2));
            }
        }
    }

    // 2. Synthesize As-Of Snapshot Metrics (C.4.1, C.4.2, C.4.3)
    const portfolioSummary = await this.getPortfolioSummary({ portfolioId });
    const allocationSummary = await this.getAssetAllocationSummary({ portfolioId });
    const performanceSummary = await this.getPerformanceMetrics({ portfolioId, asOfDate });

    const totalInvestmentExpenses = Number((totalTradeFees + totalTradeTaxes + totalStandaloneFees + totalStandaloneTaxes).toFixed(2));
    const netPeriodEconomicReturn = Number((totalEconomicRealizedGain + totalNetDividends - totalStandaloneFees - totalStandaloneTaxes).toFixed(2));

    return {
        statementId: `stmt_${Date.now()}`,
        portfolioId: portfolioId || 'ALL_PORTFOLIOS',
        period,
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString(),
        asOfDate: asOfDate.toISOString(),

        // 1. Period-Scoped Activity Statement
        periodActivity: {
            capitalGains: {
                totalEconomicRealizedGain,
                totalTaxRealizedGain,
                totalSTCG,
                totalLTCG,
                sellEventCount: periodSells.length,
                sells: periodSells
            },
            dividends: {
                totalGrossDividends,
                totalTaxesWithheld: totalDividendTaxesWithheld,
                totalNetDividends,
                dividendEventCount
            },
            expenses: {
                totalTradeFees,
                totalTradeTaxes,
                totalStandaloneFees,
                totalStandaloneTaxes,
                totalInvestmentExpenses
            },
            netPeriodEconomicReturn
        },

        // 2. Point-in-Time Snapshot Valuation (asOfDate)
        asOfSnapshot: {
            valuation: {
                totalCostBasis: portfolioSummary.totalCurrentCostBasis,
                totalMarketValue: portfolioSummary.totalMarketValue,
                unrealizedGain: portfolioSummary.unrealizedGain,
                unrealizedReturnPercent: portfolioSummary.unrealizedReturnPercent,
                valuationBasis: portfolioSummary.valuationBasis,
                quoteCoverage: portfolioSummary.quoteCoverage
            },
            allocation: {
                assetClasses: allocationSummary.assetAllocation,
                top1Percent: allocationSummary.concentration.top1Percent,
                top3Percent: allocationSummary.concentration.top3Percent,
                hhi: allocationSummary.concentration.hhi,
                riskTier: allocationSummary.concentration.riskTier
            },
            performance: {
                xirrPercent: performanceSummary.xirrPercent,
                xirrStatus: performanceSummary.xirrStatus,
                cagrPercent: performanceSummary.cagrPercent,
                absoluteReturnPercent: performanceSummary.absoluteReturnPercent,
                performanceType: performanceSummary.performanceType,
                holdingPeriodYears: performanceSummary.holdingPeriodYears
            }
        },

        taxPolicy: {
            version: TAX_RULE_VERSION
        },

        // 3. Statement Audit & Integrity
        statementIntegrity: integrityWarnings.length === 0 ? 'VALID' : 'INCOMPLETE',
        integrityWarnings,
        skippedEventCount
    };
};

export default InvestingAnalyticsEngine;



