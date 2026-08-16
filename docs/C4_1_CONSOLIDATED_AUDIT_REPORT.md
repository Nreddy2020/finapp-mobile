# Stage C.4.1 — Consolidated Architecture, Code Audit & Certification Document

**Branch**: `fintech-using-chatgpt`  
**Baseline Commit**: [`961e57b`](https://github.com/Nreddy2020/finapp-mobile/commit/961e57b)  
**Module Implemented**: [`services/investingAnalyticsEngine.js`](https://github.com/Nreddy2020/finapp-mobile/blob/fintech-using-chatgpt/services/investingAnalyticsEngine.js)  
**Status**: Ready for Consolidated Certification Audit 🟢

---

## 1. Executive Summary & Git Scope Reconciliation

Relative to the certified main baseline commit `961e57b`, the active development branch `fintech-using-chatgpt` contains four explicit paths:

| File Path | Nature of Change | Purpose & Scope Justification |
| :--- | :---: | :--- |
| `services/investingAnalyticsEngine.js` | **[NEW]** (+320 lines) | Core Stage C.4.1 Portfolio Valuation, Aggregation & P&L Engine. |
| `services/investingCorporateActionsService.js` | **[MODIFIED]** (+33/-16) | Certified C.3.6 storage-hardening patch (safe storage throw-on-false wrappers). |
| `tests/e2e/run_suite.js` | **[NEW]** (+101 lines) | GitHub Actions CI headless E2E test runner fix. |
| `README.md` | **[MODIFIED]** | Project-wide architecture, investment engine, and CI/CD documentation. |

---

## 2. Core Mathematical & Accounting Contracts

### A. Net Economic Return (Zero Double-Counting)
Historical SELL realized P&L is calculated at the point of sale:
```
sellRealizedGain = grossProceeds - (sellQty * pointInTimeWAC) - sellFees - sellTaxes
totalRealizedGain = Sum(sellRealizedGain)
```
Net Economic Return combines balance-sheet capital appreciation with realized performance without subtracting trade-level fees a second time:
```
netEconomicReturn = totalUnrealizedGain + totalRealizedGain + totalNetDividends - totalStandaloneFees - totalStandaloneTaxes
```

### B. Same-Symbol Multi-Portfolio Replay Isolation
Historical event replay is strictly keyed by `portfolioId` and security identity:
```javascript
const ledgerKey = `${evt.portfolioId || 'default'}:${(evt.holdingId || sym).toUpperCase()}`;
```
This guarantees that transactions in `Portfolio A` never contaminate the point-in-time WAC or cost basis of `Portfolio B`, even when holding identical ticker symbols.

### C. Corporate Actions Zero Profit Invariant
`BONUS` and `SPLIT` events modify quantity and WAC dynamically during replay without contributing ₹0 to `totalRealizedGain` or `totalNetDividends`.

### D. Pre-Sale Immutable Oversell Detection
Oversell conditions (`requestedQty > availableQtyBeforeSale`) are evaluated against the immutable pre-sale available balance:
- If an oversell occurs, `ledgerIntegrity` is flagged as `'INCONSISTENT'`.
- An audit warning is appended to `integrityWarnings: []`.
- `sellSummary[i].oversellFlag` records `true`.
- Valid partial sales (e.g. 10 BUY -> 6 SELL) maintain `oversellFlag: false` and `ledgerIntegrity: 'VALID'`.

---

## 3. Comprehensive Acceptance Test Matrix (`scratch/test_c41_comprehensive_matrix.mjs`)

| # | Test Scenario | Execution Condition | Reconstructed WAC / Gain | Result |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **Same-Symbol Multi-Portfolio Isolation** | Portfolio A (BUY 10 @ 100, SELL 10 @ 200); Portfolio B (BUY 10 @ 300) | Portfolio A WAC: 100, Gain: ₹1,000; Portfolio B: ₹0 gain | **PASS** ✅ |
| 2 | **BUY -> BONUS -> SELL Sequence** | BUY 10 @ 200; 1:1 BONUS (+10 shares); SELL 10 @ 300 | Post-bonus WAC: 100; Sold Cost: 1,000; Realized Gain: ₹2,000 | **PASS** ✅ |
| 3 | **BUY -> SPLIT -> SELL Sequence** | BUY 10 @ 200; 1:2 SPLIT (20 shares); SELL 10 @ 300 | Post-split WAC: 100; Sold Cost: 1,000; Realized Gain: ₹2,000 | **PASS** ✅ |
| 4 | **4-Case Oversell Matrix** | 10->6 (`false`), 10->10 (`false`), 10->15 (`true`), 0->5 (`true`) | Strict pre-sale quantity check; flags `INCONSISTENT` on oversell | **PASS** ✅ |
| 5 | **Quote Fallback Classifications** | 1 Live Quote (500), 1 Unavailable Quote (Fallback to 200 Cost) | Sets `valuationBasis: 'PARTIAL_FALLBACK'`, Value: ₹7,000, Cost: ₹6,000 | **PASS** ✅ |
| 6 | **Net Economic Return Invariant** | Unrealized (1,000) + Realized (400) + Div (200) - Standalone Fee (100) | Net Economic Return = ₹1,500 without double-counting trade fees | **PASS** ✅ |
| 7 | **Read-Only / Zero Mutation Invariant** | Inspect MoneyFlow & Storage before and after execution | Exactly 0 MoneyFlow transactions or state mutations created | **PASS** ✅ |

---

## 4. Source Code Implementation Reference

```javascript
/**
 * services/investingAnalyticsEngine.js
 */
import { loadHoldings, loadInvestmentEvents } from './storage.js';
import MarketDataService from './marketDataService.js';
import { EventType, InvestmentEventStatus } from './investingSchemas.js';

export const InvestingAnalyticsEngine = {
    async reconstructRealizationMetrics(filter = {}) {
        const { portfolioId = null, symbol = null } = filter;
        const allEvents = await loadInvestmentEvents();
        const allHoldings = await loadHoldings();
        const holdingMap = new Map(allHoldings.map(h => [h.id, h.symbol]));

        const confirmedEvents = allEvents.filter(e => {
            if (e.status !== InvestmentEventStatus.CONFIRMED) return false;
            if (portfolioId && e.portfolioId !== portfolioId) return false;
            const evtSym = (e.symbol || e.metadata?.symbol || holdingMap.get(e.holdingId) || '').toUpperCase();
            if (symbol && evtSym && evtSym !== symbol.toUpperCase()) return false;
            return true;
        });

        confirmedEvents.sort((a, b) => {
            const timeA = new Date(a.date || a.createdAt).getTime();
            const timeB = new Date(b.date || b.createdAt).getTime();
            return timeA - timeB;
        });

        const perSecurityLedger = {};
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
                sec.netQuantity = Number((sec.netQuantity + qty).toFixed(4));
                sec.averageCost = sec.netQuantity > 0 ? Number((sec.totalInvestedCost / sec.netQuantity).toFixed(4)) : 0;
            } else if (evt.type === EventType.SPLIT) {
                if (evt.metadata && evt.metadata.quantityAfter) {
                    sec.netQuantity = Number(evt.metadata.quantityAfter);
                } else if (qty > 0) {
                    sec.netQuantity = Number((sec.netQuantity + qty).toFixed(4));
                }
                sec.averageCost = sec.netQuantity > 0 ? Number((sec.totalInvestedCost / sec.netQuantity).toFixed(4)) : 0;
            } else if (evt.type === EventType.SELL) {
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

    async getPortfolioSummary(options = {}) {
        const { portfolioId = null } = options;
        const allHoldings = await loadHoldings();
        const activeHoldings = allHoldings.filter(h => {
            if (h.status === 'DELETED') return false;
            if (portfolioId && h.portfolioId !== portfolioId) return false;
            const qty = Number(h.quantity);
            return Number.isFinite(qty) && qty > 0;
        });

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
```

---

## 5. Certification Checklist & Gate Decision

| Review Area | Verification Finding | Status |
| :--- | :--- | :---: |
| **Git Scope & Commit Alignment** | Reconciled across 4 explicit paths with full justification | 🟢 PASS |
| **Same-Symbol Multi-Portfolio Replay** | Replay keyed by `portfolioId + holdingId/symbol`; 0 leakage | 🟢 PASS |
| **BUY -> BONUS -> SELL Replay** | Point-in-time WAC halved post-bonus; verified ₹2,000 gain | 🟢 PASS |
| **BUY -> SPLIT -> SELL Replay** | Point-in-time WAC adjusted post-split; verified ₹2,000 gain | 🟢 PASS |
| **4-Case Oversell Matrix** | Verified against immutable pre-sale available quantity | 🟢 PASS |
| **Net Economic Return Math** | `Unrealized + Realized + Dividends - Fees - Taxes`; 0 double count | 🟢 PASS |
| **Quote Fallback & Coverage** | `MARKET_QUOTE`, `PARTIAL_FALLBACK`, `COST_BASIS_FALLBACK`, `EMPTY` | 🟢 PASS |
| **Read-Only Invariant** | Strictly read-only; 0 MoneyFlow or storage mutations | 🟢 PASS |
| **Zero-Division & Finite Math** | 100% guarded against empty portfolios and zero cost basis | 🟢 PASS |
