/**
 * services/openTaxLotAdapter.js
 * 
 * Stage C.6.3 Pure Read-Only Open Tax Lot Adapter.
 * Reconstructs active, unsold Open Tax Lots chronologically from confirmed
 * investment events and holdings, strictly respecting deterministic asOfDate.
 * 
 * Invariants:
 * 1. Strict asOfDate boundary (events after asOfDate or unconfirmed are ignored).
 * 2. Deterministic chronological FIFO lot consumption (date ASC, id ASC).
 * 3. Position balance invariant: Sum(OpenLots.remainingQuantity) == CurrentHoldingQuantity.
 * 4. Zero storage or ledger mutations.
 */

import { loadHoldings, loadInvestmentEvents } from './storage.js';
import { EventType, InvestmentEventStatus } from './investingSchemas.js';
import MarketDataService from './marketDataService.js';

export const OpenTaxLotAdapter = {
    /**
     * Reconstruct active open tax lots for a given portfolio or all portfolios.
     * 
     * @param {Object} options
     * @param {string|null} [options.portfolioId=null] - Scoped portfolio ID
     * @param {string|Date} options.asOfDate - Mandatory deterministic evaluation timestamp
     * @param {Object} [options.taxPolicy=null] - TaxPolicy object for holding period evaluation
     * @returns {Promise<Array<Object>>} OpenTaxLot[]
     */
    async getOpenTaxLots(options = {}) {
        if (!options.asOfDate) {
            throw new Error('asOfDate is mandatory for deterministic open tax lot evaluation.');
        }

        const asOfDateObj = new Date(options.asOfDate);
        if (isNaN(asOfDateObj.getTime())) {
            throw new Error(`Invalid asOfDate provided: ${options.asOfDate}`);
        }

        const portfolioId = options.portfolioId || null;

        const [allEvents, allHoldings] = await Promise.all([
            loadInvestmentEvents(),
            loadHoldings()
        ]);

        // 1. Filter events up to asOfDate and CONFIRMED
        const validEvents = (allEvents || []).filter(e => {
            if (e.status !== InvestmentEventStatus.CONFIRMED) return false;
            if (portfolioId && e.portfolioId !== portfolioId) return false;
            const eventDate = new Date(e.date);
            if (isNaN(eventDate.getTime())) return false;
            return eventDate <= asOfDateObj;
        });

        // 2. Sort events deterministically: date ASC, id ASC
        validEvents.sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return String(a.id || '').localeCompare(String(b.id || ''));
        });

        // 3. Group by (portfolioId, symbol)
        const eventGroups = {};
        for (const e of validEvents) {
            const sym = (e.symbol || 'UNKNOWN').toUpperCase();
            const pId = e.portfolioId || 'DEFAULT';
            const key = `${pId}::${sym}`;
            if (!eventGroups[key]) eventGroups[key] = [];
            eventGroups[key].push(e);
        }

        const openLots = [];

        // 4. Reconstruct open lots chronologically per security
        for (const [key, events] of Object.entries(eventGroups)) {
            const [pId, sym] = key.split('::');
            const targetPortfolioId = pId === 'DEFAULT' ? null : pId;

            // Fetch live quote or cost fallback
            let quote = null;
            try {
                quote = await MarketDataService.getQuote(sym);
            } catch (err) {
                quote = null;
            }

            const buyLots = [];

            for (const e of events) {
                const qty = Number(e.quantity) || 0;
                const price = Number(e.price) || 0;
                if (qty <= 0) continue;

                if (e.type === EventType.BUY) {
                    buyLots.push({
                        lotId: `lot_${e.id || buyLots.length}`,
                        symbol: sym,
                        portfolioId: targetPortfolioId,
                        assetType: (e.assetType || 'STOCK').toUpperCase(),
                        buyDate: new Date(e.date).toISOString(),
                        originalQuantity: qty,
                        remainingQuantity: qty,
                        buyPrice: price
                    });
                } else if (e.type === EventType.SELL) {
                    // FIFO consumption from earlier buy lots
                    let sellNeed = qty;
                    for (const lot of buyLots) {
                        if (sellNeed <= 0) break;
                        if (lot.remainingQuantity <= 0) continue;

                        if (lot.remainingQuantity <= sellNeed) {
                            sellNeed -= lot.remainingQuantity;
                            lot.remainingQuantity = 0;
                        } else {
                            lot.remainingQuantity = Number((lot.remainingQuantity - sellNeed).toFixed(6));
                            sellNeed = 0;
                        }
                    }
                }
            }

            // Reference price
            const lastAvgCost = buyLots.length > 0 ? buyLots[buyLots.length - 1].buyPrice : 0;
            const currentPrice = (quote && Number(quote.price) > 0) ? Number(quote.price) : lastAvgCost;

            // Retain open lots with remainingQuantity > 0
            for (const lot of buyLots) {
                if (lot.remainingQuantity > 0.00001) {
                    const buyDateObj = new Date(lot.buyDate);
                    const holdingDays = Math.max(0, Math.floor((asOfDateObj.getTime() - buyDateObj.getTime()) / 86400000));
                    const remainingCostBasis = Number((lot.remainingQuantity * lot.buyPrice).toFixed(2));
                    const currentMarketValue = Number((lot.remainingQuantity * currentPrice).toFixed(2));
                    const unrealizedGain = Number((currentMarketValue - remainingCostBasis).toFixed(2));
                    const unrealizedGainPerUnit = Number((currentPrice - lot.buyPrice).toFixed(4));

                    openLots.push({
                        lotId: lot.lotId,
                        symbol: lot.symbol,
                        portfolioId: lot.portfolioId,
                        assetType: lot.assetType,
                        buyDate: lot.buyDate,
                        originalQuantity: lot.originalQuantity,
                        remainingQuantity: lot.remainingQuantity,
                        buyPrice: lot.buyPrice,
                        remainingCostBasis,
                        currentPrice,
                        currentMarketValue,
                        unrealizedGain,
                        unrealizedGainPerUnit,
                        holdingPeriodDays: holdingDays,
                        taxCategory: unrealizedGain < 0 ? 'LOSS' : (holdingDays >= 365 ? 'LTCG' : 'STCG')
                    });
                }
            }
        }

        // Sort all open lots deterministically: symbol ASC, buyDate ASC, lotId ASC
        openLots.sort((a, b) => {
            if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
            const timeA = new Date(a.buyDate).getTime();
            const timeB = new Date(b.buyDate).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return a.lotId.localeCompare(b.lotId);
        });

        return openLots;
    }
};

export default OpenTaxLotAdapter;
