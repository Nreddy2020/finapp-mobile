import InvestingAnalyticsEngine, { TAX_RULE_VERSION } from '../services/investingAnalyticsEngine.js';
import { saveHoldings, saveInvestmentEvents, loadHoldings, loadInvestmentEvents, saveMarketQuotes } from '../services/storage.js';
import { EventType, InvestmentEventStatus } from '../services/investingSchemas.js';
import MarketDataService from '../services/marketDataService.js';
import MoneyFlowEngine from '../services/moneyFlowEngine.js';

console.log('================================================================');
console.log('=== Stage C.4.4 Master Statement & Tax Report 20-Test Suite ===');
console.log('================================================================\n');

async function runC44AcceptanceSuite() {
    let passCount = 0;
    const totalTests = 20;

    try {
        await saveMarketQuotes([]);
        const baseDate = new Date('2024-05-01T00:00:00.000Z');
        const fy2024Start = new Date('2024-04-01T00:00:00.000Z');
        const fy2024End = new Date('2025-03-31T23:59:59.999Z');

        // Test 1: All-Time Master Statement
        console.log('--- Test 1: All-Time Master Statement ---');
        await saveHoldings([{ id: 'h_t1', portfolioId: 'p_t1', symbol: 'T1_SYM', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('T1_SYM', 1200);
        await saveInvestmentEvents([
            { id: 'evt_t1_b', portfolioId: 'p_t1', symbol: 'T1_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const res1 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t1' });
        if (res1.period === 'ALL_TIME' &&
            res1.asOfSnapshot.valuation.totalCostBasis === 10000 &&
            res1.asOfSnapshot.valuation.totalMarketValue === 12000 &&
            res1.statementIntegrity === 'VALID') {
            console.log('✅ Test 1 PASS: All-Time master statement generated cleanly.');
            passCount++;
        } else {
            console.error('❌ Test 1 FAIL: All-Time statement mismatch:', res1);
        }

        // Test 2: Financial Year Period Scoping (FY2024_25)
        console.log('\n--- Test 2: Financial Year Period Scoping (FY2024_25) ---');
        await saveHoldings([{ id: 'h_t2', portfolioId: 'p_t2', symbol: 'FY_SYM', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('FY_SYM', 1500);
        await saveInvestmentEvents([
            { id: 'evt_t2_b', portfolioId: 'p_t2', symbol: 'FY_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 20, price: 1000, date: new Date('2024-05-01').toISOString() },
            { id: 'evt_t2_s1', portfolioId: 'p_t2', symbol: 'FY_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1200, date: new Date('2024-10-01').toISOString() }, // in FY2024_25
            { id: 'evt_t2_s2', portfolioId: 'p_t2', symbol: 'FY_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 5, price: 1400, date: new Date('2025-05-01').toISOString() }  // in FY2025_26 (out of scope)
        ]);
        const res2 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t2', period: 'FY2024_25' });
        if (res2.periodActivity.capitalGains.sellEventCount === 1 &&
            res2.periodActivity.capitalGains.totalEconomicRealizedGain === 2000) {
            console.log('✅ Test 2 PASS: FY2024_25 period filtering correctly included 1 sale (Gain = ₹2,000).');
            passCount++;
        } else {
            console.error('❌ Test 2 FAIL: FY2024_25 filtering mismatch:', res2.periodActivity.capitalGains);
        }

        // Test 3: Custom Date Range Statement
        console.log('\n--- Test 3: Custom Date Range Statement ---');
        await saveHoldings([{ id: 'h_t3', portfolioId: 'p_t3', symbol: 'CUST_SYM', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('CUST_SYM', 1500);
        await saveInvestmentEvents([
            { id: 'evt_t3_b', portfolioId: 'p_t3', symbol: 'CUST_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 20, price: 1000, date: new Date('2024-01-01').toISOString() },
            { id: 'evt_t3_s1', portfolioId: 'p_t3', symbol: 'CUST_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1200, date: new Date('2024-06-15').toISOString() }
        ]);
        const res3 = await InvestingAnalyticsEngine.generatePortfolioStatement({
            portfolioId: 'p_t3',
            startDate: '2024-06-01T00:00:00.000Z',
            endDate: '2024-06-30T23:59:59.999Z'
        });
        if (res3.periodActivity.capitalGains.sellEventCount === 1 && res3.periodActivity.capitalGains.totalEconomicRealizedGain === 2000) {
            console.log('✅ Test 3 PASS: Custom date range statement correctly captured June 2024 sale.');
            passCount++;
        } else {
            console.error('❌ Test 3 FAIL: Custom date range mismatch:', res3);
        }

        // Test 4: Short-Term Capital Gain (STCG <= 365 days)
        console.log('\n--- Test 4: Short-Term Capital Gain (STCG <= 365 days) ---');
        await saveHoldings([{ id: 'h_t4', portfolioId: 'p_t4', symbol: 'STCG_SYM', assetType: 'STOCK', quantity: 0, averageCost: 0 }]);
        MarketDataService.setMockPrice('STCG_SYM', 1200);
        await saveInvestmentEvents([
            { id: 'evt_t4_b', portfolioId: 'p_t4', symbol: 'STCG_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: new Date('2024-01-01').toISOString() },
            { id: 'evt_t4_s', portfolioId: 'p_t4', symbol: 'STCG_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1200, date: new Date('2024-06-01').toISOString() } // 152 days
        ]);
        const res4 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t4' });
        if (res4.periodActivity.capitalGains.totalSTCG === 2000 &&
            res4.periodActivity.capitalGains.totalLTCG === 0 &&
            res4.periodActivity.capitalGains.sells[0].gainType === 'STCG') {
            console.log('✅ Test 4 PASS: 152-day stock holding correctly classified as STCG (₹2,000).');
            passCount++;
        } else {
            console.error('❌ Test 4 FAIL: STCG mismatch:', res4.periodActivity.capitalGains);
        }

        // Test 5: Long-Term Capital Gain (LTCG > 365 days)
        console.log('\n--- Test 5: Long-Term Capital Gain (LTCG > 365 days) ---');
        await saveHoldings([{ id: 'h_t5', portfolioId: 'p_t5', symbol: 'LTCG_SYM', assetType: 'STOCK', quantity: 0, averageCost: 0 }]);
        MarketDataService.setMockPrice('LTCG_SYM', 1500);
        await saveInvestmentEvents([
            { id: 'evt_t5_b', portfolioId: 'p_t5', symbol: 'LTCG_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: new Date('2023-01-01').toISOString() },
            { id: 'evt_t5_s', portfolioId: 'p_t5', symbol: 'LTCG_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1500, date: new Date('2024-06-01').toISOString() } // 517 days
        ]);
        const res5 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t5' });
        if (res5.periodActivity.capitalGains.totalLTCG === 5000 &&
            res5.periodActivity.capitalGains.totalSTCG === 0 &&
            res5.periodActivity.capitalGains.sells[0].gainType === 'LTCG') {
            console.log('✅ Test 5 PASS: 517-day stock holding correctly classified as LTCG (₹5,000).');
            passCount++;
        } else {
            console.error('❌ Test 5 FAIL: LTCG mismatch:', res5.periodActivity.capitalGains);
        }

        // Test 6: Mixed STCG + LTCG in Statement
        console.log('\n--- Test 6: Mixed STCG + LTCG in Statement ---');
        await saveHoldings([{ id: 'h_t6', portfolioId: 'p_t6', symbol: 'MIX_SYM', assetType: 'STOCK', quantity: 0, averageCost: 0 }]);
        MarketDataService.setMockPrice('MIX_SYM', 1500);
        await saveInvestmentEvents([
            { id: 'evt_t6_b1', portfolioId: 'p_t6', symbol: 'MIX_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: new Date('2023-01-01').toISOString() },
            { id: 'evt_t6_b2', portfolioId: 'p_t6', symbol: 'MIX_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: new Date('2024-01-01').toISOString() },
            { id: 'evt_t6_s1', portfolioId: 'p_t6', symbol: 'MIX_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1500, date: new Date('2024-06-01').toISOString() }, // Consumes Lot 1 (LTCG: 5000)
            { id: 'evt_t6_s2', portfolioId: 'p_t6', symbol: 'MIX_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1300, date: new Date('2024-06-01').toISOString() }  // Consumes Lot 2 (STCG: 3000)
        ]);
        const res6 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t6' });
        if (res6.periodActivity.capitalGains.totalLTCG === 5000 &&
            res6.periodActivity.capitalGains.totalSTCG === 3000 &&
            res6.periodActivity.capitalGains.totalTaxRealizedGain === 8000) {
            console.log('✅ Test 6 PASS: Mixed STCG (3,000) and LTCG (5,000) correctly aggregated to ₹8,000.');
            passCount++;
        } else {
            console.error('❌ Test 6 FAIL: Mixed STCG/LTCG mismatch:', res6.periodActivity.capitalGains);
        }

        // Test 7: Dividend Breakdown in Statement
        console.log('\n--- Test 7: Dividend Breakdown in Statement ---');
        await saveHoldings([{ id: 'h_t7', portfolioId: 'p_t7', symbol: 'DIV_SYM', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('DIV_SYM', 1000);
        await saveInvestmentEvents([
            { id: 'evt_t7_b', portfolioId: 'p_t7', symbol: 'DIV_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t7_d', portfolioId: 'p_t7', symbol: 'DIV_SYM', type: EventType.DIVIDEND, status: InvestmentEventStatus.CONFIRMED, amount: 2000, taxes: 200, metadata: { grossDividend: 2000, dividendTaxWithheld: 200, netDividend: 1800 }, date: new Date('2024-07-01').toISOString() }
        ]);
        const res7 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t7' });
        if (res7.periodActivity.dividends.totalGrossDividends === 2000 &&
            res7.periodActivity.dividends.totalTaxesWithheld === 200 &&
            res7.periodActivity.dividends.totalNetDividends === 1800) {
            console.log('✅ Test 7 PASS: Dividend statement verified (Gross: 2000, TDS: 200, Net: 1800).');
            passCount++;
        } else {
            console.error('❌ Test 7 FAIL: Dividend statement mismatch:', res7.periodActivity.dividends);
        }

        // Test 8: Expense & Fee Statement Audit
        console.log('\n--- Test 8: Expense & Fee Statement Audit ---');
        await saveHoldings([{ id: 'h_t8', portfolioId: 'p_t8', symbol: 'EXP_SYM', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('EXP_SYM', 1000);
        await saveInvestmentEvents([
            { id: 'evt_t8_b', portfolioId: 'p_t8', symbol: 'EXP_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, fees: 50, taxes: 25, date: baseDate.toISOString() },
            { id: 'evt_t8_f', portfolioId: 'p_t8', symbol: 'EXP_SYM', type: EventType.FEE, status: InvestmentEventStatus.CONFIRMED, amount: 100, metadata: { feeAmount: 100 }, date: new Date('2024-06-01').toISOString() }
        ]);
        const res8 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t8' });
        if (res8.periodActivity.expenses.totalTradeFees === 0 && // BUY trade fees belong to buy cost; SELL trade fees tracked in sells
            res8.periodActivity.expenses.totalStandaloneFees === 100) {
            console.log('✅ Test 8 PASS: Standalone fee ₹100 cleanly segregated from trade costs.');
            passCount++;
        } else {
            console.error('❌ Test 8 FAIL: Expense statement mismatch:', res8.periodActivity.expenses);
        }

        // Test 9: Multi-Portfolio Isolation
        console.log('\n--- Test 9: Multi-Portfolio Isolation ---');
        await saveHoldings([
            { id: 'h_t9_a', portfolioId: 'p_t9_a', symbol: 'ISO_A', assetType: 'STOCK', quantity: 10, averageCost: 1000 },
            { id: 'h_t9_b', portfolioId: 'p_t9_b', symbol: 'ISO_B', assetType: 'STOCK', quantity: 10, averageCost: 2000 }
        ]);
        MarketDataService.setMockPrice('ISO_A', 1100);
        MarketDataService.setMockPrice('ISO_B', 2500);
        await saveInvestmentEvents([
            { id: 'evt_t9_a', portfolioId: 'p_t9_a', symbol: 'ISO_A', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t9_b', portfolioId: 'p_t9_b', symbol: 'ISO_B', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 2000, date: baseDate.toISOString() }
        ]);
        const res9A = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t9_a' });
        const res9B = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t9_b' });
        if (res9A.asOfSnapshot.valuation.totalCostBasis === 10000 && res9B.asOfSnapshot.valuation.totalCostBasis === 20000) {
            console.log('✅ Test 9 PASS: Multi-portfolio statement generation strictly isolated (A = 10k, B = 20k).');
            passCount++;
        } else {
            console.error('❌ Test 9 FAIL: Portfolio isolation mismatch:', res9A, res9B);
        }

        // Test 10: Empty Portfolio Safe Statement
        console.log('\n--- Test 10: Empty Portfolio Safe Statement ---');
        await saveHoldings([]);
        await saveInvestmentEvents([]);
        const res10 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_empty' });
        if (res10.statementIntegrity === 'VALID' &&
            res10.asOfSnapshot.valuation.totalCostBasis === 0 &&
            res10.periodActivity.capitalGains.totalRealizedGain === undefined &&
            res10.periodActivity.capitalGains.totalEconomicRealizedGain === 0) {
            console.log('✅ Test 10 PASS: Empty portfolio produces valid zeroed statement without errors.');
            passCount++;
        } else {
            console.error('❌ Test 10 FAIL: Empty portfolio mismatch:', res10);
        }

        // Test 11: Invalid Event Date Audit
        console.log('\n--- Test 11: Invalid Event Date Audit ---');
        await saveHoldings([{ id: 'h_t11', portfolioId: 'p_t11', symbol: 'INV_DATE', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('INV_DATE', 1100);
        await saveInvestmentEvents([
            { id: 'evt_t11_v', portfolioId: 'p_t11', symbol: 'INV_DATE', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t11_inv', portfolioId: 'p_t11', symbol: 'INV_DATE', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 5, price: 1200, date: 'INVALID_DATE_STRING' }
        ]);
        const res11 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t11' });
        if (res11.statementIntegrity === 'INCOMPLETE' && res11.skippedEventCount === 1 && res11.integrityWarnings.some(w => w.type === 'INVALID_EVENT_DATE')) {
            console.log('✅ Test 11 PASS: Invalid event date flagged statementIntegrity: INCOMPLETE with audit log.');
            passCount++;
        } else {
            console.error('❌ Test 11 FAIL: Invalid date audit mismatch:', res11);
        }

        // Test 12: Read-Only Invariant
        console.log('\n--- Test 12: Read-Only Invariant ---');
        const txsBefore = await MoneyFlowEngine.getTransactions();
        const holdingsBefore = await loadHoldings();
        const eventsBefore = await loadInvestmentEvents();
        await InvestingAnalyticsEngine.generatePortfolioStatement();
        const txsAfter = await MoneyFlowEngine.getTransactions();
        const holdingsAfter = await loadHoldings();
        const eventsAfter = await loadInvestmentEvents();

        if (txsBefore.length === txsAfter.length && holdingsBefore.length === holdingsAfter.length && eventsBefore.length === eventsAfter.length) {
            console.log('✅ Test 12 PASS: Zero MoneyFlow or storage mutations created during statement generation.');
            passCount++;
        } else {
            console.error('❌ Test 12 FAIL: State mutation detected.');
        }

        // Test 13: Multiple BUYs Before SELL (FIFO vs WAC)
        console.log('\n--- Test 13: Multiple BUYs Before SELL (FIFO vs WAC) ---');
        await saveHoldings([{ id: 'h_t13', portfolioId: 'p_t13', symbol: 'DUAL_REAL', assetType: 'STOCK', quantity: 10, averageCost: 1500 }]);
        MarketDataService.setMockPrice('DUAL_REAL', 250);
        await saveInvestmentEvents([
            { id: 'evt_t13_b1', portfolioId: 'p_t13', symbol: 'DUAL_REAL', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 100, date: new Date('2024-01-01').toISOString() }, // Lot 1
            { id: 'evt_t13_b2', portfolioId: 'p_t13', symbol: 'DUAL_REAL', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 200, date: new Date('2024-06-01').toISOString() }, // Lot 2 (WAC = 150)
            { id: 'evt_t13_s', portfolioId: 'p_t13', symbol: 'DUAL_REAL', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 250, date: new Date('2024-12-01').toISOString() }   // Sell 10 @ 250
        ]);
        const res13 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t13' });
        const sellRecord = res13.periodActivity.capitalGains.sells[0];
        if (sellRecord.pointInTimeWAC === 150 &&
            sellRecord.wacCostBasisOfSold === 1500 &&
            sellRecord.economicRealizedGain === 1000 &&
            sellRecord.fifoCostBasisOfSold === 1000 &&
            sellRecord.taxRealizedGain === 1500 &&
            sellRecord.gainType === 'STCG') {
            console.log('✅ Test 13 PASS: Dual realization verified (Economic WAC Cost: ₹1500, Gain: ₹1000; Tax FIFO Cost: ₹1000, Gain: ₹1500).');
            passCount++;
        } else {
            console.error('❌ Test 13 FAIL: Dual realization mismatch:', sellRecord);
        }

        // Test 14: Multiple Partial SELLs (FIFO Lot Tracking)
        console.log('\n--- Test 14: Multiple Partial SELLs (FIFO Lot Tracking) ---');
        await saveHoldings([{ id: 'h_t14', portfolioId: 'p_t14', symbol: 'PART_FIFO', assetType: 'STOCK', quantity: 5, averageCost: 200 }]);
        MarketDataService.setMockPrice('PART_FIFO', 300);
        await saveInvestmentEvents([
            { id: 'evt_t14_b1', portfolioId: 'p_t14', symbol: 'PART_FIFO', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 100, date: new Date('2024-01-01').toISOString() }, // Lot 1 (10 @ 100)
            { id: 'evt_t14_b2', portfolioId: 'p_t14', symbol: 'PART_FIFO', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 200, date: new Date('2024-02-01').toISOString() }, // Lot 2 (10 @ 200)
            { id: 'evt_t14_s1', portfolioId: 'p_t14', symbol: 'PART_FIFO', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 5, price: 250, date: new Date('2024-06-01').toISOString() },  // Consumes 5 of Lot 1 (cost: 500)
            { id: 'evt_t14_s2', portfolioId: 'p_t14', symbol: 'PART_FIFO', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 300, date: new Date('2024-07-01').toISOString() }  // Consumes 5 of Lot 1 (500) + 5 of Lot 2 (1000) = 1500
        ]);
        const res14 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t14' });
        const s1 = res14.periodActivity.capitalGains.sells[0];
        const s2 = res14.periodActivity.capitalGains.sells[1];
        if (s1.fifoCostBasisOfSold === 500 && s2.fifoCostBasisOfSold === 1500) {
            console.log('✅ Test 14 PASS: Staggered partial sells consumed FIFO lots in exact sequence (500, 1500).');
            passCount++;
        } else {
            console.error('❌ Test 14 FAIL: Staggered FIFO mismatch:', s1, s2);
        }

        // Test 15: BONUS Before SELL Lot History
        console.log('\n--- Test 15: BONUS Before SELL Lot History ---');
        await saveHoldings([{ id: 'h_t15', portfolioId: 'p_t15', symbol: 'BON_FIFO', assetType: 'STOCK', quantity: 5, averageCost: 50 }]);
        MarketDataService.setMockPrice('BON_FIFO', 150);
        await saveInvestmentEvents([
            { id: 'evt_t15_b', portfolioId: 'p_t15', symbol: 'BON_FIFO', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 100, date: new Date('2023-01-01').toISOString() }, // 10 @ 100
            { id: 'evt_t15_bon', portfolioId: 'p_t15', symbol: 'BON_FIFO', type: EventType.BONUS, status: InvestmentEventStatus.CONFIRMED, quantity: 10, date: new Date('2023-06-01').toISOString() },        // 10 @ 0
            { id: 'evt_t15_s', portfolioId: 'p_t15', symbol: 'BON_FIFO', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 15, price: 150, date: new Date('2024-06-01').toISOString() }   // Sell 15 -> Consumes 10 @ 100 (1000) + 5 @ 0 (0) = 1000
        ]);
        const res15 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t15' });
        const sBon = res15.periodActivity.capitalGains.sells[0];
        if (sBon.fifoCostBasisOfSold === 1000 && sBon.taxRealizedGain === 1250 && sBon.gainType === 'LTCG') {
            console.log('✅ Test 15 PASS: BONUS lot history verified with ₹0 artificial cost and LTCG classification.');
            passCount++;
        } else {
            console.error('❌ Test 15 FAIL: BONUS lot history mismatch:', sBon);
        }

        // Test 16: SPLIT Before SELL Lot History
        console.log('\n--- Test 16: SPLIT Before SELL Lot History ---');
        await saveHoldings([{ id: 'h_t16', portfolioId: 'p_t16', symbol: 'SPL_FIFO', assetType: 'STOCK', quantity: 5, averageCost: 50 }]);
        MarketDataService.setMockPrice('SPL_FIFO', 150);
        await saveInvestmentEvents([
            { id: 'evt_t16_b', portfolioId: 'p_t16', symbol: 'SPL_FIFO', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 100, date: new Date('2023-01-01').toISOString() }, // 10 @ 100 (cost 1000)
            { id: 'evt_t16_spl', portfolioId: 'p_t16', symbol: 'SPL_FIFO', type: EventType.SPLIT, status: InvestmentEventStatus.CONFIRMED, quantity: 10, metadata: { ratio: 2 }, date: new Date('2023-06-01').toISOString() }, // 20 @ 50 (cost 1000)
            { id: 'evt_t16_s', portfolioId: 'p_t16', symbol: 'SPL_FIFO', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 15, price: 150, date: new Date('2024-06-01').toISOString() }    // Sell 15 @ 150 (cost 15 * 50 = 750, proceeds 2250, gain 1500)
        ]);
        const res16 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t16' });
        const sSpl = res16.periodActivity.capitalGains.sells[0];
        if (sSpl.fifoCostBasisOfSold === 750 && sSpl.taxRealizedGain === 1500 && sSpl.gainType === 'LTCG') {
            console.log('✅ Test 16 PASS: SPLIT lot adjustment verified with adjusted unit cost and LTCG classification.');
            passCount++;
        } else {
            console.error('❌ Test 16 FAIL: SPLIT lot adjustment mismatch:', sSpl);
        }

        // Test 17: Trade-Fee Double-Counting Guard
        console.log('\n--- Test 17: Trade-Fee Double-Counting Guard ---');
        await saveHoldings([{ id: 'h_t17', portfolioId: 'p_t17', symbol: 'FEE_GUARD', assetType: 'STOCK', quantity: 0, averageCost: 0 }]);
        MarketDataService.setMockPrice('FEE_GUARD', 1200);
        await saveInvestmentEvents([
            { id: 'evt_t17_b', portfolioId: 'p_t17', symbol: 'FEE_GUARD', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t17_s', portfolioId: 'p_t17', symbol: 'FEE_GUARD', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1200, fees: 50, taxes: 25, date: new Date('2024-08-01').toISOString() }, // proceeds 12000 - cost 10000 - 75 = 1925
            { id: 'evt_t17_f', portfolioId: 'p_t17', symbol: 'FEE_GUARD', type: EventType.FEE, status: InvestmentEventStatus.CONFIRMED, amount: 25, metadata: { feeAmount: 25 }, date: new Date('2024-09-01').toISOString() }
        ]);
        const res17 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t17' });
        // netPeriodEconomicReturn = economicRealizedGain (1925) + netDividends (0) - standaloneFees (25) = 1900
        if (res17.periodActivity.capitalGains.totalEconomicRealizedGain === 1925 &&
            res17.periodActivity.netPeriodEconomicReturn === 1900) {
            console.log('✅ Test 17 PASS: Trade fees deducted only once; Net Period Economic Return = ₹1,900.');
            passCount++;
        } else {
            console.error('❌ Test 17 FAIL: Trade fee double counting detected:', res17.periodActivity);
        }

        // Test 18: Dividend Data Invariant Guard (Mismatch flags INCOMPLETE)
        console.log('\n--- Test 18: Dividend Data Invariant Guard ---');
        await saveHoldings([{ id: 'h_t18', portfolioId: 'p_t18', symbol: 'DIV_MISMATCH', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('DIV_MISMATCH', 1000);
        await saveInvestmentEvents([
            { id: 'evt_t18_b', portfolioId: 'p_t18', symbol: 'DIV_MISMATCH', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t18_d', portfolioId: 'p_t18', symbol: 'DIV_MISMATCH', type: EventType.DIVIDEND, status: InvestmentEventStatus.CONFIRMED, amount: 2000, taxes: 200, metadata: { grossDividend: 2000, dividendTaxWithheld: 200, netDividend: 1700 }, date: new Date('2024-07-01').toISOString() } // 2000 - 200 !== 1700
        ]);
        const res18 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t18' });
        if (res18.statementIntegrity === 'INCOMPLETE' && res18.integrityWarnings.some(w => w.type === 'DIVIDEND_DATA_MISMATCH')) {
            console.log('✅ Test 18 PASS: Inconsistent dividend metadata flagged statementIntegrity: INCOMPLETE.');
            passCount++;
        } else {
            console.error('❌ Test 18 FAIL: Dividend mismatch not detected:', res18);
        }

        // Test 19: Period vs Snapshot Date Separation
        console.log('\n--- Test 19: Period vs Snapshot Date Separation ---');
        await saveHoldings([{ id: 'h_t19', portfolioId: 'p_t19', symbol: 'SEP_SYM', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('SEP_SYM', 1500); // Current valuation = 15,000
        await saveInvestmentEvents([
            { id: 'evt_t19_b', portfolioId: 'p_t19', symbol: 'SEP_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 20, price: 1000, date: new Date('2024-05-01').toISOString() },
            { id: 'evt_t19_s', portfolioId: 'p_t19', symbol: 'SEP_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1200, date: new Date('2024-08-01').toISOString() } // FY24-25 gain = 2000
        ]);
        const laterAsOf = new Date('2026-08-16T00:00:00.000Z');
        const res19 = await InvestingAnalyticsEngine.generatePortfolioStatement({
            portfolioId: 'p_t19',
            period: 'FY2024_25',
            asOfDate: laterAsOf
        });
        if (res19.startDate === '2024-04-01T00:00:00.000Z' &&
            res19.endDate === '2025-03-31T23:59:59.999Z' &&
            res19.asOfDate === laterAsOf.toISOString() &&
            res19.periodActivity.capitalGains.totalEconomicRealizedGain === 2000 &&
            res19.asOfSnapshot.valuation.totalMarketValue === 15000) {
            console.log('✅ Test 19 PASS: Explicit separation between FY period activity and asOfSnapshot valuation.');
            passCount++;
        } else {
            console.error('❌ Test 19 FAIL: Period vs Snapshot separation mismatch:', res19);
        }

        // Test 20: Full Regression Invariant Matrix
        console.log('\n--- Test 20: Full Regression Invariant Matrix ---');
        await saveHoldings([{ id: 'h_t20', portfolioId: 'p_t20', symbol: 'REG_SYM', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('REG_SYM', 1100);
        await saveInvestmentEvents([
            { id: 'evt_t20_b', portfolioId: 'p_t20', symbol: 'REG_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const c41Res = await InvestingAnalyticsEngine.getPortfolioSummary({ portfolioId: 'p_t20' });
        const c42Res = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_t20' });
        const c43Res = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t20', asOfDate: new Date('2025-05-01T00:00:00.000Z') });
        const c44Res = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_t20', asOfDate: new Date('2025-05-01T00:00:00.000Z') });

        if (c41Res.totalCurrentCostBasis === 10000 &&
            c41Res.totalMarketValue === 11000 &&
            c42Res.concentration.riskTier === 'HIGH' &&
            c43Res.xirrPercent === 10.0 &&
            c44Res.asOfSnapshot.valuation.totalMarketValue === c41Res.totalMarketValue &&
            c44Res.asOfSnapshot.performance.xirrPercent === c43Res.xirrPercent) {
            console.log('✅ Test 20 PASS: C.4.1, C.4.2, C.4.3 regression output invariant verified 100%.');
            passCount++;
        } else {
            console.error('❌ Test 20 FAIL: Regression invariant mismatch:', c41Res, c42Res, c43Res, c44Res);
        }

        console.log(`\n================================================================`);
        console.log(`=== STAGE C.4.4 ACCEPTANCE RESULT: ${passCount}/${totalTests} TESTS PASSED PERFECTLY ===`);
        console.log(`================================================================\n`);

    } catch (err) {
        console.error('C.4.4 Acceptance suite exception:', err);
    }
}

runC44AcceptanceSuite();
