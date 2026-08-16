import InvestingAnalyticsEngine from '../services/investingAnalyticsEngine.js';
import { saveInvestmentEvents, saveHoldings, loadInvestmentEvents, loadHoldings } from '../services/storage.js';
import { EventType, InvestmentEventStatus } from '../services/investingSchemas.js';
import MarketDataService from '../services/marketDataService.js';
import MoneyFlowEngine from '../services/moneyFlowEngine.js';

console.log('================================================================');
console.log('=== Stage C.4.1 Comprehensive Consolidated Acceptance Suite  ===');
console.log('================================================================\n');

async function runConsolidatedSuite() {
    let passCount = 0;
    const totalTests = 7;

    try {
        // Test 1: Same Symbol in Multiple Portfolios Isolation
        console.log('--- Test 1: Same-Symbol Multi-Portfolio Replay Isolation ---');
        const crossPortfolioEvents = [
            // Portfolio A: BUY 10 RELIANCE @ 100
            {
                id: 'evt_pA_buy',
                portfolioId: 'portfolio_A',
                symbol: 'RELIANCE',
                type: EventType.BUY,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: 10,
                price: 100,
                amount: 1000,
                date: '2026-01-01T10:00:00.000Z'
            },
            // Portfolio B: BUY 10 RELIANCE @ 300
            {
                id: 'evt_pB_buy',
                portfolioId: 'portfolio_B',
                symbol: 'RELIANCE',
                type: EventType.BUY,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: 10,
                price: 300,
                amount: 3000,
                date: '2026-01-02T10:00:00.000Z'
            },
            // Portfolio A: SELL 10 RELIANCE @ 200 (WAC must be 100, NOT 200 blended!)
            {
                id: 'evt_pA_sell',
                portfolioId: 'portfolio_A',
                symbol: 'RELIANCE',
                type: EventType.SELL,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: 10,
                price: 200,
                amount: 2000,
                fees: 0,
                taxes: 0,
                date: '2026-01-03T10:00:00.000Z'
            }
        ];
        await saveInvestmentEvents(crossPortfolioEvents);
        await saveHoldings([]);

        const resPortfolioA = await InvestingAnalyticsEngine.reconstructRealizationMetrics({ portfolioId: 'portfolio_A' });
        const resPortfolioB = await InvestingAnalyticsEngine.reconstructRealizationMetrics({ portfolioId: 'portfolio_B' });
        const resGlobal = await InvestingAnalyticsEngine.reconstructRealizationMetrics();

        console.log('Portfolio A Result:', {
            realizedGain: resPortfolioA.totalRealizedGain,
            sellQty: resPortfolioA.sellSummary[0]?.sellQty,
            pointInTimeWAC: resPortfolioA.sellSummary[0]?.pointInTimeWAC
        });
        console.log('Portfolio B Result:', {
            realizedGain: resPortfolioB.totalRealizedGain,
            sellCount: resPortfolioB.sellSummary.length
        });

        if (resPortfolioA.totalRealizedGain === 1000 &&
            resPortfolioA.sellSummary[0]?.pointInTimeWAC === 100 &&
            resPortfolioB.totalRealizedGain === 0 &&
            resPortfolioB.sellSummary.length === 0 &&
            resGlobal.totalRealizedGain === 1000) {
            console.log('✅ Test 1 PASS: Multi-portfolio same-symbol replay strictly isolated (Portfolio A WAC = 100, Gain = 1000; Portfolio B = 0).');
            passCount++;
        } else {
            console.error('❌ Test 1 FAIL: Cross-portfolio WAC leakage detected!');
        }

        // Test 2: BUY -> BONUS -> SELL Sequence
        console.log('\n--- Test 2: BUY -> BONUS -> SELL Sequence ---');
        const bonusSeqEvents = [
            // BUY 10 @ 200 (Cost = 2000, WAC = 200)
            {
                id: 'evt_seq_buy_bonus',
                portfolioId: 'portfolio_bonus',
                symbol: 'INFY',
                type: EventType.BUY,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: 10,
                price: 200,
                amount: 2000,
                date: '2026-01-01T10:00:00.000Z'
            },
            // 1:1 BONUS (+10 shares -> 20 shares, Cost = 2000, WAC = 100)
            {
                id: 'evt_seq_bonus_issue',
                portfolioId: 'portfolio_bonus',
                symbol: 'INFY',
                type: EventType.BONUS,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: 10,
                price: 0,
                date: '2026-01-02T10:00:00.000Z'
            },
            // SELL 10 @ 300 (WAC = 100 -> Cost of Sold = 1000, Proceeds = 3000 -> Realized Gain = 2000)
            {
                id: 'evt_seq_sell_bonus',
                portfolioId: 'portfolio_bonus',
                symbol: 'INFY',
                type: EventType.SELL,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: 10,
                price: 300,
                amount: 3000,
                fees: 0,
                taxes: 0,
                date: '2026-01-03T10:00:00.000Z'
            }
        ];
        await saveInvestmentEvents(bonusSeqEvents);
        const bonusSeqRes = await InvestingAnalyticsEngine.reconstructRealizationMetrics({ portfolioId: 'portfolio_bonus' });
        console.log('Bonus Sequence Result:', {
            realizedGain: bonusSeqRes.totalRealizedGain,
            pointInTimeWAC: bonusSeqRes.sellSummary[0]?.pointInTimeWAC,
            costBasisOfSold: bonusSeqRes.sellSummary[0]?.costBasisOfSold,
            grossProceeds: bonusSeqRes.sellSummary[0]?.grossProceeds
        });

        if (bonusSeqRes.totalRealizedGain === 2000 &&
            bonusSeqRes.sellSummary[0]?.pointInTimeWAC === 100 &&
            bonusSeqRes.sellSummary[0]?.costBasisOfSold === 1000) {
            console.log('✅ Test 2 PASS: BUY -> BONUS -> SELL verified (WAC adjusted from 200 to 100, Gain = ₹2,000).');
            passCount++;
        } else {
            console.error('❌ Test 2 FAIL: Bonus WAC adjustment failed in sell calculation.');
        }

        // Test 3: BUY -> SPLIT -> SELL Sequence
        console.log('\n--- Test 3: BUY -> SPLIT -> SELL Sequence ---');
        const splitSeqEvents = [
            // BUY 10 @ 200 (Cost = 2000, WAC = 200)
            {
                id: 'evt_seq_buy_split',
                portfolioId: 'portfolio_split',
                symbol: 'WIPRO',
                type: EventType.BUY,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: 10,
                price: 200,
                amount: 2000,
                date: '2026-01-01T10:00:00.000Z'
            },
            // 1:2 SPLIT (QuantityAfter = 20 shares, Cost = 2000, WAC = 100)
            {
                id: 'evt_seq_split_event',
                portfolioId: 'portfolio_split',
                symbol: 'WIPRO',
                type: EventType.SPLIT,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: 10,
                price: 0,
                metadata: { quantityAfter: 20, splitFactor: 2 },
                date: '2026-01-02T10:00:00.000Z'
            },
            // SELL 10 @ 300 (WAC = 100 -> Cost of Sold = 1000, Proceeds = 3000 -> Realized Gain = 2000)
            {
                id: 'evt_seq_sell_split',
                portfolioId: 'portfolio_split',
                symbol: 'WIPRO',
                type: EventType.SELL,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: 10,
                price: 300,
                amount: 3000,
                fees: 0,
                taxes: 0,
                date: '2026-01-03T10:00:00.000Z'
            }
        ];
        await saveInvestmentEvents(splitSeqEvents);
        const splitSeqRes = await InvestingAnalyticsEngine.reconstructRealizationMetrics({ portfolioId: 'portfolio_split' });
        console.log('Split Sequence Result:', {
            realizedGain: splitSeqRes.totalRealizedGain,
            pointInTimeWAC: splitSeqRes.sellSummary[0]?.pointInTimeWAC,
            costBasisOfSold: splitSeqRes.sellSummary[0]?.costBasisOfSold
        });

        if (splitSeqRes.totalRealizedGain === 2000 &&
            splitSeqRes.sellSummary[0]?.pointInTimeWAC === 100 &&
            splitSeqRes.sellSummary[0]?.costBasisOfSold === 1000) {
            console.log('✅ Test 3 PASS: BUY -> SPLIT -> SELL verified (WAC adjusted from 200 to 100, Gain = ₹2,000).');
            passCount++;
        } else {
            console.error('❌ Test 3 FAIL: Split WAC adjustment failed in sell calculation.');
        }

        // Test 4: Complete Oversell Matrix (4 Scenarios)
        console.log('\n--- Test 4: 4-Case Oversell Matrix ---');
        const oversellCases = [
            // 1. Partial: 10 BUY -> 6 SELL
            { pId: 'p_ov_1', buy: 10, sell: 6, expectedFlag: false, expectedInteg: 'VALID' },
            // 2. Exact: 10 BUY -> 10 SELL
            { pId: 'p_ov_2', buy: 10, sell: 10, expectedFlag: false, expectedInteg: 'VALID' },
            // 3. Oversell: 10 BUY -> 15 SELL
            { pId: 'p_ov_3', buy: 10, sell: 15, expectedFlag: true, expectedInteg: 'INCONSISTENT' },
            // 4. Zero Holdings: 0 BUY -> 5 SELL
            { pId: 'p_ov_4', buy: 0, sell: 5, expectedFlag: true, expectedInteg: 'INCONSISTENT' }
        ];

        let matrixPass = 0;
        for (const oc of oversellCases) {
            const evts = [];
            if (oc.buy > 0) {
                evts.push({
                    id: `evt_${oc.pId}_b`,
                    portfolioId: oc.pId,
                    symbol: 'TEST',
                    type: EventType.BUY,
                    status: InvestmentEventStatus.CONFIRMED,
                    quantity: oc.buy,
                    price: 100,
                    date: '2026-01-01T10:00:00.000Z'
                });
            }
            evts.push({
                id: `evt_${oc.pId}_s`,
                portfolioId: oc.pId,
                symbol: 'TEST',
                type: EventType.SELL,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: oc.sell,
                price: 150,
                date: '2026-01-02T10:00:00.000Z'
            });
            await saveInvestmentEvents(evts);
            const res = await InvestingAnalyticsEngine.reconstructRealizationMetrics({ portfolioId: oc.pId });
            if (res.sellSummary[0]?.oversellFlag === oc.expectedFlag && res.ledgerIntegrity === oc.expectedInteg) {
                matrixPass++;
            }
        }
        if (matrixPass === 4) {
            console.log('✅ Test 4 PASS: All 4 oversell matrix scenarios matched expected flags and integrity states.');
            passCount++;
        } else {
            console.error(`❌ Test 4 FAIL: Oversell matrix passed ${matrixPass}/4`);
        }

        // Test 5: Quote Fallback & Coverage Classifications
        console.log('\n--- Test 5: Quote Fallback & Coverage Classifications ---');
        MarketDataService.setMockPrice('LIVE_STOCK', 500);
        MarketDataService.setMockPrice('FALLBACK_STOCK', 0); // unavailable

        const fallbackHoldings = [
            { id: 'h_live', portfolioId: 'p_quote', symbol: 'LIVE_STOCK', quantity: 10, averageCost: 400 },
            { id: 'h_fall', portfolioId: 'p_quote', symbol: 'FALLBACK_STOCK', quantity: 10, averageCost: 200 }
        ];
        await saveHoldings(fallbackHoldings);
        await saveInvestmentEvents([]);

        const quoteSummary = await InvestingAnalyticsEngine.getPortfolioSummary({ portfolioId: 'p_quote' });
        console.log('Quote Summary:', {
            totalCurrentCostBasis: quoteSummary.totalCurrentCostBasis,
            totalMarketValue: quoteSummary.totalMarketValue,
            valuationBasis: quoteSummary.valuationBasis,
            quoteCoverage: quoteSummary.quoteCoverage
        });

        // LIVE: 10 * 500 = 5000; FALLBACK: 10 * 200 = 2000 -> Total = 7000. Cost = 4000 + 2000 = 6000.
        if (quoteSummary.totalCurrentCostBasis === 6000 &&
            quoteSummary.totalMarketValue === 7000 &&
            quoteSummary.valuationBasis === 'PARTIAL_FALLBACK' &&
            quoteSummary.quoteCoverage.marketValued === 1 &&
            quoteSummary.quoteCoverage.costBasisFallback === 1) {
            console.log('✅ Test 5 PASS: Partial quote fallback computed correctly (Market: 5000, Fallback: 2000 -> Total 7000).');
            passCount++;
        } else {
            console.error('❌ Test 5 FAIL: Quote fallback computation mismatch.');
        }

        // Test 6: Net Economic Return Formula (Zero Double Counting)
        console.log('\n--- Test 6: Net Economic Return (No Double Counting) ---');
        // Unrealized = 1000 (from Test 5)
        // Add SELL Gain (400 net of 50 fee, 50 tax), Dividends (200 net), Demat Standalone Fee (100)
        const netRetEvents = [
            {
                id: 'evt_ret_buy',
                portfolioId: 'p_quote',
                symbol: 'LIVE_STOCK',
                type: EventType.BUY,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: 5,
                price: 300,
                date: '2026-01-01T10:00:00.000Z'
            },
            {
                id: 'evt_ret_sell',
                portfolioId: 'p_quote',
                symbol: 'LIVE_STOCK',
                type: EventType.SELL,
                status: InvestmentEventStatus.CONFIRMED,
                quantity: 5,
                price: 400,
                fees: 50,
                taxes: 50,
                date: '2026-01-02T10:00:00.000Z'
            }, // Realized = (5 * 400) - (5 * 300) - 50 - 50 = 400
            {
                id: 'evt_ret_div',
                portfolioId: 'p_quote',
                symbol: 'LIVE_STOCK',
                type: EventType.DIVIDEND,
                status: InvestmentEventStatus.CONFIRMED,
                amount: 250,
                taxes: 50,
                metadata: { netDividend: 200 },
                date: '2026-01-03T10:00:00.000Z'
            },
            {
                id: 'evt_ret_fee',
                portfolioId: 'p_quote',
                symbol: 'LIVE_STOCK',
                type: EventType.FEE,
                status: InvestmentEventStatus.CONFIRMED,
                amount: 100,
                metadata: { feeAmount: 100 },
                date: '2026-01-04T10:00:00.000Z'
            }
        ];
        await saveInvestmentEvents(netRetEvents);
        const netRetSummary = await InvestingAnalyticsEngine.getPortfolioSummary({ portfolioId: 'p_quote' });
        console.log('Net Economic Return Output:', {
            unrealizedGain: netRetSummary.unrealizedGain,
            realizedGain: netRetSummary.realizedGain,
            netDividends: netRetSummary.netDividends,
            standaloneFees: netRetSummary.standaloneFees,
            netEconomicReturn: netRetSummary.netEconomicReturn
        });

        // Net Economic Return = Unrealized (1000) + Realized (400) + Net Dividends (200) - Standalone Fee (100) = 1500
        if (netRetSummary.unrealizedGain === 1000 &&
            netRetSummary.realizedGain === 400 &&
            netRetSummary.netDividends === 200 &&
            netRetSummary.standaloneFees === 100 &&
            netRetSummary.netEconomicReturn === 1500) {
            console.log('✅ Test 6 PASS: Net Economic Return equals ₹1,500 without double-counting trade fees.');
            passCount++;
        } else {
            console.error('❌ Test 6 FAIL: Net economic return calculation mismatch.');
        }

        // Test 7: Read-Only / Zero Cash Mutation Invariant
        console.log('\n--- Test 7: Read-Only Mutation Invariant ---');
        const initialTxs = await MoneyFlowEngine.getTransactions();
        await InvestingAnalyticsEngine.getPortfolioSummary({ portfolioId: 'p_quote' });
        await InvestingAnalyticsEngine.reconstructRealizationMetrics();
        const postTxs = await MoneyFlowEngine.getTransactions();

        if (initialTxs.length === postTxs.length) {
            console.log('✅ Test 7 PASS: Zero MoneyFlow transactions or state mutations created during analytics execution.');
            passCount++;
        } else {
            console.error('❌ Test 7 FAIL: State mutation detected in analytics engine!');
        }

        console.log(`\n================================================================`);
        console.log(`=== CONSOLIDATED ACCEPTANCE RESULT: ${passCount}/${totalTests} TESTS PASSED PERFECTLY ===`);
        console.log(`================================================================\n`);

    } catch (err) {
        console.error('Consolidated test exception:', err);
    }
}

runConsolidatedSuite();
