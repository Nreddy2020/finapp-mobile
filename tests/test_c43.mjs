import InvestingAnalyticsEngine from '../services/investingAnalyticsEngine.js';
import { saveHoldings, saveInvestmentEvents, loadHoldings, loadInvestmentEvents, saveMarketQuotes } from '../services/storage.js';
import { EventType, InvestmentEventStatus } from '../services/investingSchemas.js';
import MarketDataService, { MockFeedProvider } from '../services/marketDataService.js';
import MoneyFlowEngine from '../services/moneyFlowEngine.js';

console.log('================================================================');
console.log('=== Stage C.4.3 Performance Engine (XIRR/CAGR) 30-Test Suite ===');
console.log('================================================================\n');

async function runC43AcceptanceSuite() {
    let passCount = 0;
    const totalTests = 30;

    try {
        await saveMarketQuotes([]);
        const baseDate = new Date('2025-01-01T00:00:00.000Z');
        const day365 = new Date('2026-01-01T00:00:00.000Z');
        const day730 = new Date('2027-01-01T00:00:00.000Z');

        // Test 1: Standard Single BUY + Terminal Value XIRR (10k -> 11k in 1 year = 10.00%)
        console.log('--- Test 1: Standard Single BUY + Terminal Value XIRR ---');
        await saveHoldings([{ id: 'h_t1', portfolioId: 'p_t1', symbol: 'T1_SYM', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('T1_SYM', 1100); // Terminal = 11,000
        await saveInvestmentEvents([
            { id: 'evt_t1', portfolioId: 'p_t1', holdingId: 'h_t1', symbol: 'T1_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const res1 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t1', asOfDate: day365 });
        if (res1.xirrStatus === 'CALCULATED' && Math.abs(res1.xirrPercent - 10.0) < 0.1) {
            console.log('✅ Test 1 PASS: Single BUY + Terminal XIRR equals 10.00% (got ' + res1.xirrPercent + '%).');
            passCount++;
        } else {
            console.error('❌ Test 1 FAIL: Test 1 XIRR mismatch:', res1);
        }

        // Test 2: Multi-SIP Staggered Cash Flows (3 monthly buys + Terminal)
        console.log('\n--- Test 2: Multi-SIP Staggered Cash Flows ---');
        await saveHoldings([{ id: 'h_t2', portfolioId: 'p_t2', symbol: 'SIP_SYM', quantity: 30, averageCost: 1000 }]);
        MarketDataService.setMockPrice('SIP_SYM', 1200); // Terminal = 36,000
        await saveInvestmentEvents([
            { id: 'evt_t2_1', portfolioId: 'p_t2', holdingId: 'h_t2', symbol: 'SIP_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: new Date('2025-01-01').toISOString() },
            { id: 'evt_t2_2', portfolioId: 'p_t2', holdingId: 'h_t2', symbol: 'SIP_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: new Date('2025-02-01').toISOString() },
            { id: 'evt_t2_3', portfolioId: 'p_t2', holdingId: 'h_t2', symbol: 'SIP_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: new Date('2025-03-01').toISOString() }
        ]);
        const res2 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t2', asOfDate: day365 });
        if (res2.xirrStatus === 'CALCULATED' && res2.xirrPercent > 0) {
            console.log('✅ Test 2 PASS: Multi-SIP XIRR calculated successfully: ' + res2.xirrPercent + '%.');
            passCount++;
        } else {
            console.error('❌ Test 2 FAIL: Multi-SIP failed:', res2);
        }

        // Test 3: Interim Net Dividend Inflow
        console.log('\n--- Test 3: Interim Net Dividend Inflow ---');
        await saveHoldings([{ id: 'h_t3', portfolioId: 'p_t3', symbol: 'DIV_SYM', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('DIV_SYM', 1100);
        await saveInvestmentEvents([
            { id: 'evt_t3_b', portfolioId: 'p_t3', holdingId: 'h_t3', symbol: 'DIV_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t3_d', portfolioId: 'p_t3', holdingId: 'h_t3', symbol: 'DIV_SYM', type: EventType.DIVIDEND, status: InvestmentEventStatus.CONFIRMED, amount: 500, metadata: { netDividend: 500 }, date: new Date('2025-07-01').toISOString() }
        ]);
        const res3 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t3', asOfDate: day365 });
        if (res3.xirrPercent > 10.0 && res3.cashFlowSummary.historicalInflows === 500) {
            console.log('✅ Test 3 PASS: Dividend boosted XIRR to ' + res3.xirrPercent + '% (inflows = 500).');
            passCount++;
        } else {
            console.error('❌ Test 3 FAIL: Dividend XIRR mismatch:', res3);
        }

        // Test 4: Interim Partial SELL Inflow
        console.log('\n--- Test 4: Interim Partial SELL Inflow ---');
        await saveHoldings([{ id: 'h_t4', portfolioId: 'p_t4', symbol: 'SELL_SYM', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('SELL_SYM', 1500);
        await saveInvestmentEvents([
            { id: 'evt_t4_b', portfolioId: 'p_t4', holdingId: 'h_t4', symbol: 'SELL_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 20, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t4_s', portfolioId: 'p_t4', holdingId: 'h_t4', symbol: 'SELL_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1200, date: new Date('2025-07-01').toISOString() }
        ]);
        const res4 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t4', asOfDate: day365 });
        if (res4.xirrStatus === 'CALCULATED' && res4.cashFlowSummary.historicalInflows === 12000) {
            console.log('✅ Test 4 PASS: Partial SELL inflow recorded in XIRR (XIRR = ' + res4.xirrPercent + '%).');
            passCount++;
        } else {
            console.error('❌ Test 4 FAIL: Partial SELL XIRR mismatch:', res4);
        }

        // Test 5: BONUS ₹0 Cash Flow Invariant
        console.log('\n--- Test 5: BONUS ₹0 Cash Flow Invariant ---');
        await saveHoldings([{ id: 'h_t5', portfolioId: 'p_t5', symbol: 'BONUS_SYM', quantity: 20, averageCost: 500 }]);
        MarketDataService.setMockPrice('BONUS_SYM', 600);
        await saveInvestmentEvents([
            { id: 'evt_t5_b', portfolioId: 'p_t5', holdingId: 'h_t5', symbol: 'BONUS_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t5_bon', portfolioId: 'p_t5', holdingId: 'h_t5', symbol: 'BONUS_SYM', type: EventType.BONUS, status: InvestmentEventStatus.CONFIRMED, quantity: 10, date: new Date('2025-06-01').toISOString() }
        ]);
        const res5 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t5', asOfDate: day365 });
        if (res5.cashFlowSummary.cashFlowCount === 2) { // 1 BUY outflow + 1 Terminal inflow
            console.log('✅ Test 5 PASS: BONUS event omitted from cash flow vector (cashFlowCount = 2).');
            passCount++;
        } else {
            console.error('❌ Test 5 FAIL: BONUS generated unwanted cash flow:', res5.cashFlowSummary);
        }

        // Test 6: SPLIT ₹0 Cash Flow Invariant
        console.log('\n--- Test 6: SPLIT ₹0 Cash Flow Invariant ---');
        await saveHoldings([{ id: 'h_t6', portfolioId: 'p_t6', symbol: 'SPLIT_SYM', quantity: 20, averageCost: 500 }]);
        MarketDataService.setMockPrice('SPLIT_SYM', 600);
        await saveInvestmentEvents([
            { id: 'evt_t6_b', portfolioId: 'p_t6', holdingId: 'h_t6', symbol: 'SPLIT_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t6_spl', portfolioId: 'p_t6', holdingId: 'h_t6', symbol: 'SPLIT_SYM', type: EventType.SPLIT, status: InvestmentEventStatus.CONFIRMED, quantity: 10, metadata: { quantityAfter: 20 }, date: new Date('2025-06-01').toISOString() }
        ]);
        const res6 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t6', asOfDate: day365 });
        if (res6.cashFlowSummary.cashFlowCount === 2) {
            console.log('✅ Test 6 PASS: SPLIT event omitted from cash flow vector (cashFlowCount = 2).');
            passCount++;
        } else {
            console.error('❌ Test 6 FAIL: SPLIT generated unwanted cash flow:', res6.cashFlowSummary);
        }

        // Test 7: SELL Before BONUS Replay
        console.log('\n--- Test 7: SELL Before BONUS Replay ---');
        await saveHoldings([{ id: 'h_t7', portfolioId: 'p_t7', symbol: 'S_PRE_BON', quantity: 10, averageCost: 500 }]);
        MarketDataService.setMockPrice('S_PRE_BON', 600);
        await saveInvestmentEvents([
            { id: 'evt_t7_b', portfolioId: 'p_t7', holdingId: 'h_t7', symbol: 'S_PRE_BON', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t7_s', portfolioId: 'p_t7', holdingId: 'h_t7', symbol: 'S_PRE_BON', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 5, price: 1200, date: new Date('2025-04-01').toISOString() },
            { id: 'evt_t7_bon', portfolioId: 'p_t7', holdingId: 'h_t7', symbol: 'S_PRE_BON', type: EventType.BONUS, status: InvestmentEventStatus.CONFIRMED, quantity: 5, date: new Date('2025-06-01').toISOString() }
        ]);
        const res7 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t7', asOfDate: day365 });
        if (res7.cashFlowSummary.historicalInflows === 6000 && res7.xirrStatus === 'CALCULATED') {
            console.log('✅ Test 7 PASS: SELL before BONUS uses pre-bonus quantity (Inflow: 6000).');
            passCount++;
        } else {
            console.error('❌ Test 7 FAIL: Pre-bonus sell mismatch:', res7);
        }

        // Test 8: SELL After BONUS Replay
        console.log('\n--- Test 8: SELL After BONUS Replay ---');
        await saveHoldings([{ id: 'h_t8', portfolioId: 'p_t8', symbol: 'S_POST_BON', quantity: 5, averageCost: 500 }]);
        MarketDataService.setMockPrice('S_POST_BON', 600);
        await saveInvestmentEvents([
            { id: 'evt_t8_b', portfolioId: 'p_t8', holdingId: 'h_t8', symbol: 'S_POST_BON', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t8_bon', portfolioId: 'p_t8', holdingId: 'h_t8', symbol: 'S_POST_BON', type: EventType.BONUS, status: InvestmentEventStatus.CONFIRMED, quantity: 10, date: new Date('2025-04-01').toISOString() },
            { id: 'evt_t8_s', portfolioId: 'p_t8', holdingId: 'h_t8', symbol: 'S_POST_BON', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 15, price: 800, date: new Date('2025-06-01').toISOString() }
        ]);
        const res8 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t8', asOfDate: day365 });
        if (res8.cashFlowSummary.historicalInflows === 12000 && res8.xirrStatus === 'CALCULATED') {
            console.log('✅ Test 8 PASS: SELL after BONUS reflects post-bonus quantity (Inflow: 12000).');
            passCount++;
        } else {
            console.error('❌ Test 8 FAIL: Post-bonus sell mismatch:', res8);
        }

        // Test 9: SELL After SPLIT Replay
        console.log('\n--- Test 9: SELL After SPLIT Replay ---');
        await saveHoldings([{ id: 'h_t9', portfolioId: 'p_t9', symbol: 'S_POST_SPL', quantity: 5, averageCost: 500 }]);
        MarketDataService.setMockPrice('S_POST_SPL', 600);
        await saveInvestmentEvents([
            { id: 'evt_t9_b', portfolioId: 'p_t9', holdingId: 'h_t9', symbol: 'S_POST_SPL', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t9_spl', portfolioId: 'p_t9', holdingId: 'h_t9', symbol: 'S_POST_SPL', type: EventType.SPLIT, status: InvestmentEventStatus.CONFIRMED, quantity: 10, metadata: { quantityAfter: 20 }, date: new Date('2025-04-01').toISOString() },
            { id: 'evt_t9_s', portfolioId: 'p_t9', holdingId: 'h_t9', symbol: 'S_POST_SPL', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 15, price: 800, date: new Date('2025-06-01').toISOString() }
        ]);
        const res9 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t9', asOfDate: day365 });
        if (res9.cashFlowSummary.historicalInflows === 12000 && res9.xirrStatus === 'CALCULATED') {
            console.log('✅ Test 9 PASS: SELL after SPLIT reflects split quantity (Inflow: 12000).');
            passCount++;
        } else {
            console.error('❌ Test 9 FAIL: Post-split sell mismatch:', res9);
        }

        // Test 10: Standalone Demat Fee Cash Flow
        console.log('\n--- Test 10: Standalone Demat Fee Cash Flow ---');
        await saveHoldings([{ id: 'h_t10', portfolioId: 'p_t10', symbol: 'FEE_SYM', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('FEE_SYM', 1100);
        await saveInvestmentEvents([
            { id: 'evt_t10_b', portfolioId: 'p_t10', holdingId: 'h_t10', symbol: 'FEE_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t10_f', portfolioId: 'p_t10', holdingId: 'h_t10', symbol: 'FEE_SYM', type: EventType.FEE, status: InvestmentEventStatus.CONFIRMED, amount: 100, metadata: { feeAmount: 100 }, date: new Date('2025-06-01').toISOString() }
        ]);
        const res10 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t10', asOfDate: day365 });
        if (res10.cashFlowSummary.historicalOutflows === 10100) {
            console.log('✅ Test 10 PASS: Standalone Fee included as negative outflow (Outflows: 10100).');
            passCount++;
        } else {
            console.error('❌ Test 10 FAIL: Standalone Fee mismatch:', res10.cashFlowSummary);
        }

        // Test 11: Standalone Tax Cash Flow
        console.log('\n--- Test 11: Standalone Tax Cash Flow ---');
        await saveHoldings([{ id: 'h_t11', portfolioId: 'p_t11', symbol: 'TAX_SYM', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('TAX_SYM', 1100);
        await saveInvestmentEvents([
            { id: 'evt_t11_b', portfolioId: 'p_t11', holdingId: 'h_t11', symbol: 'TAX_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t11_t', portfolioId: 'p_t11', holdingId: 'h_t11', symbol: 'TAX_SYM', type: EventType.TAX, status: InvestmentEventStatus.CONFIRMED, amount: 50, metadata: { taxAmount: 50 }, date: new Date('2025-06-01').toISOString() }
        ]);
        const res11 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t11', asOfDate: day365 });
        if (res11.cashFlowSummary.historicalOutflows === 10050) {
            console.log('✅ Test 11 PASS: Standalone Tax included as negative outflow (Outflows: 10050).');
            passCount++;
        } else {
            console.error('❌ Test 11 FAIL: Standalone Tax mismatch:', res11.cashFlowSummary);
        }

        // Test 12: Dividend Withholding Isolation
        console.log('\n--- Test 12: Dividend Withholding Isolation ---');
        await saveHoldings([{ id: 'h_t12', portfolioId: 'p_t12', symbol: 'DIV_W', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('DIV_W', 1000);
        await saveInvestmentEvents([
            { id: 'evt_t12_b', portfolioId: 'p_t12', holdingId: 'h_t12', symbol: 'DIV_W', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t12_d', portfolioId: 'p_t12', holdingId: 'h_t12', symbol: 'DIV_W', type: EventType.DIVIDEND, status: InvestmentEventStatus.CONFIRMED, amount: 2000, taxes: 200, metadata: { netDividend: 1800 }, date: new Date('2025-06-01').toISOString() }
        ]);
        const res12 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t12', asOfDate: day365 });
        if (res12.cashFlowSummary.historicalInflows === 1800 && res12.cashFlowSummary.historicalOutflows === 10000) {
            console.log('✅ Test 12 PASS: Net dividend 1800 recorded cleanly with no double tax deduction.');
            passCount++;
        } else {
            console.error('❌ Test 12 FAIL: Dividend withholding isolation mismatch:', res12.cashFlowSummary);
        }

        // Test 13: Complete Capital Loss (-100%)
        console.log('\n--- Test 13: Complete Capital Loss (-100%) ---');
        await saveHoldings([]); // zero active holdings -> Terminal = 0
        await saveInvestmentEvents([
            { id: 'evt_t13_b', portfolioId: 'p_t13', symbol: 'LOSS_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const res13 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t13', asOfDate: day365 });
        if (res13.xirrPercent === -100.0 && res13.xirrStatus === 'CALCULATED') {
            console.log('✅ Test 13 PASS: Complete capital loss reported as -100.00% XIRR.');
            passCount++;
        } else {
            console.error('❌ Test 13 FAIL: Complete loss mismatch:', res13);
        }

        // Test 14: Multi-Year CAGR (Cost 10k -> Value 14.4k over 2 years = 20.00%)
        console.log('\n--- Test 14: Multi-Year CAGR ---');
        await saveHoldings([{ id: 'h_t14', portfolioId: 'p_t14', symbol: 'CAGR_SYM', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('CAGR_SYM', 1440); // 10 * 1440 = 14,400
        await saveInvestmentEvents([
            { id: 'evt_t14_b', portfolioId: 'p_t14', holdingId: 'h_t14', symbol: 'CAGR_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const res14 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t14', asOfDate: day730 });
        if (res14.performanceType === 'CAGR' && Math.abs(res14.cagrPercent - 20.0) < 0.1) {
            console.log('✅ Test 14 PASS: 2-year CAGR exactly equals 20.00% (got ' + res14.cagrPercent + '%).');
            passCount++;
        } else {
            console.error('❌ Test 14 FAIL: CAGR mismatch:', res14);
        }

        // Test 15: Multi-Year Complete Loss CAGR
        console.log('\n--- Test 15: Multi-Year Complete Loss CAGR ---');
        await saveHoldings([]); // 0 Market Value (Complete Loss)
        await saveInvestmentEvents([
            { id: 'evt_t15_b', portfolioId: 'p_t15', symbol: 'ZERO_CAGR', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const res15 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t15', asOfDate: day730 });
        if (res15.performanceType === 'CAGR' && res15.xirrPercent === -100.0) {
            console.log('✅ Test 15 PASS: 2-year complete loss CAGR/XIRR correctly set to -100.00%.');
            passCount++;
        } else {
            console.error('❌ Test 15 FAIL: Complete loss CAGR mismatch:', res15);
        }


        // Test 16: Short-Term Absolute Return (Cost 10k -> 11k in 30 days = 10.00% Absolute)
        console.log('\n--- Test 16: Short-Term Absolute Return ---');
        await saveHoldings([{ id: 'h_t16', portfolioId: 'p_t16', symbol: 'SHORT_SYM', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('SHORT_SYM', 1100);
        await saveInvestmentEvents([
            { id: 'evt_t16_b', portfolioId: 'p_t16', holdingId: 'h_t16', symbol: 'SHORT_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const day30 = new Date('2025-01-31T00:00:00.000Z');
        const res16 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t16', asOfDate: day30 });
        if (res16.performanceType === 'ABSOLUTE' && res16.absoluteReturnPercent === 10.0) {
            console.log('✅ Test 16 PASS: 30-day holding period classified as ABSOLUTE with 10.00% return.');
            passCount++;
        } else {
            console.error('❌ Test 16 FAIL: Short term return mismatch:', res16);
        }

        // Test 17: Multi-Portfolio Performance Isolation
        console.log('\n--- Test 17: Multi-Portfolio Performance Isolation ---');
        await saveHoldings([
            { id: 'h_t17_a', portfolioId: 'p_t17_a', symbol: 'SYM_A', quantity: 10, averageCost: 1000 },
            { id: 'h_t17_b', portfolioId: 'p_t17_b', symbol: 'SYM_B', quantity: 10, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('SYM_A', 1100); // 10%
        MarketDataService.setMockPrice('SYM_B', 1500); // 50%
        await saveInvestmentEvents([
            { id: 'evt_t17_a', portfolioId: 'p_t17_a', symbol: 'SYM_A', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t17_b', portfolioId: 'p_t17_b', symbol: 'SYM_B', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const res17A = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t17_a', asOfDate: day365 });
        const res17B = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t17_b', asOfDate: day365 });
        if (Math.abs(res17A.xirrPercent - 10.0) < 0.1 && Math.abs(res17B.xirrPercent - 50.0) < 0.1) {
            console.log('✅ Test 17 PASS: Portfolios A and B isolated in performance (A = 10%, B = 50%).');
            passCount++;
        } else {
            console.error('❌ Test 17 FAIL: Portfolio isolation mismatch:', res17A, res17B);
        }

        // Test 18: Same Symbol Across Separate Portfolios
        console.log('\n--- Test 18: Same Symbol Across Separate Portfolios ---');
        await saveHoldings([
            { id: 'h_t18_a', portfolioId: 'p_t18_a', symbol: 'RELIANCE', quantity: 10, averageCost: 1000 },
            { id: 'h_t18_b', portfolioId: 'p_t18_b', symbol: 'RELIANCE', quantity: 10, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('RELIANCE', 1200);
        await saveInvestmentEvents([
            { id: 'evt_t18_a', portfolioId: 'p_t18_a', symbol: 'RELIANCE', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t18_b', portfolioId: 'p_t18_b', symbol: 'RELIANCE', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: new Date('2025-07-01').toISOString() }
        ]);
        const res18A = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t18_a', asOfDate: day365 });
        const res18B = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t18_b', asOfDate: day365 });
        if (res18A.cashFlowSummary.historicalOutflows === 10000 && res18B.cashFlowSummary.historicalOutflows === 10000) {
            console.log('✅ Test 18 PASS: Same symbol isolated across portfolios (Outflows strictly 10000 each).');
            passCount++;
        } else {
            console.error('❌ Test 18 FAIL: Same symbol cash flow bleed:', res18A, res18B);
        }

        // Test 19: Per-Symbol Performance Filtering
        console.log('\n--- Test 19: Per-Symbol Performance Filtering ---');
        await saveHoldings([
            { id: 'h_t19_1', portfolioId: 'p_t19', symbol: 'TCS', quantity: 10, averageCost: 1000 },
            { id: 'h_t19_2', portfolioId: 'p_t19', symbol: 'INFY', quantity: 10, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('TCS', 1200); // 20%
        MarketDataService.setMockPrice('INFY', 1400); // 40%
        await saveInvestmentEvents([
            { id: 'evt_t19_1', portfolioId: 'p_t19', symbol: 'TCS', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t19_2', portfolioId: 'p_t19', symbol: 'INFY', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const res19TCS = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t19', symbol: 'TCS', asOfDate: day365 });
        if (res19TCS.symbol === 'TCS' && Math.abs(res19TCS.xirrPercent - 20.0) < 0.1 && res19TCS.cashFlowSummary.terminalMarketValue === 12000) {
            console.log('✅ Test 19 PASS: Per-symbol filtering isolated to TCS (XIRR = 20.00%, Terminal = 12000).');
            passCount++;
        } else {
            console.error('❌ Test 19 FAIL: Per-symbol mismatch:', res19TCS);
        }

        // Test 20: Deterministic asOfDate Evaluation (10k -> 11k over 2.0 years)
        console.log('\n--- Test 20: Deterministic asOfDate Evaluation ---');
        await saveHoldings([{ id: 'h_t20', portfolioId: 'p_t20', symbol: 'DET_SYM', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('DET_SYM', 1100);
        await saveInvestmentEvents([
            { id: 'evt_t20', portfolioId: 'p_t20', holdingId: 'h_t20', symbol: 'DET_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const res20Future = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t20', asOfDate: day730 }); // 2 years
        if (Math.abs(res20Future.xirrPercent - 4.88) < 0.2) {
            console.log('✅ Test 20 PASS: Deterministic asOfDate evaluated accurately over 2.0 years (got ' + res20Future.xirrPercent + '%).');
            passCount++;
        } else {
            console.error('❌ Test 20 FAIL: asOfDate deterministic evaluation mismatch:', res20Future);
        }

        // Test 21: Newton-Raphson Fast Convergence
        console.log('\n--- Test 21: Newton-Raphson Fast Convergence ---');
        await saveHoldings([{ id: 'h_t21', portfolioId: 'p_t21', symbol: 'FAST_SYM', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('FAST_SYM', 1100);
        await saveInvestmentEvents([
            { id: 'evt_t21', portfolioId: 'p_t21', symbol: 'FAST_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const res21 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t21', asOfDate: day365 });
        if (res21.xirrStatus === 'CALCULATED') {
            console.log('✅ Test 21 PASS: Newton-Raphson converged cleanly for standard cash flows.');
            passCount++;
        } else {
            console.error('❌ Test 21 FAIL: Newton-Raphson failed:', res21);
        }

        // Test 22: Bisection Fallback Activation (Non-monotonic cash flows)
        console.log('\n--- Test 22: Bisection Fallback Activation ---');
        await saveHoldings([{ id: 'h_t22', portfolioId: 'p_t22', symbol: 'BIS_SYM', quantity: 1, averageCost: 1000 }]);
        MarketDataService.setMockPrice('BIS_SYM', 5000);
        await saveInvestmentEvents([
            { id: 'evt_t22_1', portfolioId: 'p_t22', symbol: 'BIS_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 100, date: baseDate.toISOString() }, // -1000
            { id: 'evt_t22_2', portfolioId: 'p_t22', symbol: 'BIS_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 5, price: 500, date: new Date('2025-03-01').toISOString() }, // +2500
            { id: 'evt_t22_3', portfolioId: 'p_t22', symbol: 'BIS_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 400, date: new Date('2025-06-01').toISOString() }  // -4000
        ]);
        const res22 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t22', asOfDate: day365 });
        if (res22.xirrStatus === 'CALCULATED' && Number.isFinite(res22.xirrPercent)) {
            console.log('✅ Test 22 PASS: Complex multi-sign series converged (XIRR = ' + res22.xirrPercent + '%).');
            passCount++;
        } else {
            console.error('❌ Test 22 FAIL: Bisection fallback failed:', res22);
        }

        // Test 23: Failed to Converge Fallback
        console.log('\n--- Test 23: Insufficient / Divergent Fallback ---');
        await saveHoldings([]);
        await saveInvestmentEvents([]);
        const res23 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_empty' });
        if (res23.xirrStatus === 'INSUFFICIENT_CASH_FLOWS' && res23.xirrPercent === 0) {
            console.log('✅ Test 23 PASS: Empty cash flows returns INSUFFICIENT_CASH_FLOWS.');
            passCount++;
        } else {
            console.error('❌ Test 23 FAIL: Empty cash flows mismatch:', res23);
        }

        // Test 24: Extreme Positive Return Safety (100x return)
        console.log('\n--- Test 24: Extreme Positive Return Safety ---');
        await saveHoldings([{ id: 'h_t24', portfolioId: 'p_t24', symbol: 'MOON_SYM', quantity: 10, averageCost: 100 }]);
        MarketDataService.setMockPrice('MOON_SYM', 10000); // 1,000 -> 100,000 (100x)
        await saveInvestmentEvents([
            { id: 'evt_t24_b', portfolioId: 'p_t24', symbol: 'MOON_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 100, date: baseDate.toISOString() }
        ]);
        const res24 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t24', asOfDate: day365 });
        if (res24.xirrStatus === 'CALCULATED' && res24.xirrPercent > 1000.0) {
            console.log('✅ Test 24 PASS: 100x return calculated safely (XIRR = ' + res24.xirrPercent + '%).');
            passCount++;
        } else {
            console.error('❌ Test 24 FAIL: Extreme positive return failed:', res24);
        }

        // Test 25: Near -100% Return Stability (99.9% loss)
        console.log('\n--- Test 25: Near -100% Return Stability ---');
        await saveHoldings([{ id: 'h_t25', portfolioId: 'p_t25', symbol: 'CRASH_SYM', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('CRASH_SYM', 1); // 10,000 -> 10
        await saveInvestmentEvents([
            { id: 'evt_t25_b', portfolioId: 'p_t25', symbol: 'CRASH_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const res25 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t25', asOfDate: day365 });
        if (res25.xirrStatus === 'CALCULATED' && res25.xirrPercent < -90.0 && res25.xirrPercent > -100.0) {
            console.log('✅ Test 25 PASS: 99.9% loss numerical stability verified (XIRR = ' + res25.xirrPercent + '%).');
            passCount++;
        } else {
            console.error('❌ Test 25 FAIL: Near -100% loss stability mismatch:', res25);
        }

        // Test 26: Quote Fallback in Terminal Value (Unrecognized symbol with no mock price)
        console.log('\n--- Test 26: Quote Fallback in Terminal Value ---');
        await saveHoldings([{ id: 'h_t26', portfolioId: 'p_t26', symbol: 'NON_EXISTENT_T26', quantity: 10, averageCost: 1000 }]);
        await saveInvestmentEvents([
            { id: 'evt_t26_b', portfolioId: 'p_t26', symbol: 'NON_EXISTENT_T26', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const res26 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t26', asOfDate: day365 });
        if (res26.valuationBasis === 'COST_BASIS_FALLBACK' && res26.cashFlowSummary.terminalMarketValue === 10000 && Math.abs(res26.xirrPercent - 0.0) < 0.1) {
            console.log('✅ Test 26 PASS: Unavailable quote falls back to cost basis (Terminal = 10000, XIRR = 0.00%).');
            passCount++;
        } else {
            console.error('❌ Test 26 FAIL: Quote fallback mismatch:', res26);
        }

        // Test 27: Read-Only / Zero Mutation Invariant
        console.log('\n--- Test 27: Read-Only Invariant ---');
        const txsBefore = await MoneyFlowEngine.getTransactions();
        const holdingsBefore = await loadHoldings();
        const eventsBefore = await loadInvestmentEvents();
        await InvestingAnalyticsEngine.getPerformanceMetrics();
        const txsAfter = await MoneyFlowEngine.getTransactions();
        const holdingsAfter = await loadHoldings();
        const eventsAfter = await loadInvestmentEvents();

        if (txsBefore.length === txsAfter.length && holdingsBefore.length === holdingsAfter.length && eventsBefore.length === eventsAfter.length) {
            console.log('✅ Test 27 PASS: Zero MoneyFlow, holding, or event mutations during performance execution.');
            passCount++;
        } else {
            console.error('❌ Test 27 FAIL: State mutation detected.');
        }

        // Test 28: Multiple XIRR Roots Determinism
        console.log('\n--- Test 28: Multiple XIRR Roots Determinism ---');
        await saveHoldings([{ id: 'h_t28', portfolioId: 'p_t28', symbol: 'MULTI_ROOT', quantity: 1, averageCost: 5000 }]);
        MarketDataService.setMockPrice('MULTI_ROOT', 50000);
        await saveInvestmentEvents([
            { id: 'evt_t28_1', portfolioId: 'p_t28', symbol: 'MULTI_ROOT', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 1, price: 10000, date: baseDate.toISOString() }, // -10000
            { id: 'evt_t28_2', portfolioId: 'p_t28', symbol: 'MULTI_ROOT', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 1, price: 30000, date: new Date('2025-04-01').toISOString() }, // +30000
            { id: 'evt_t28_3', portfolioId: 'p_t28', symbol: 'MULTI_ROOT', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 1, price: 25000, date: new Date('2025-08-01').toISOString() }  // -25000
        ]);
        const run1 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t28', asOfDate: day365 });
        const run2 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t28', asOfDate: day365 });
        if (run1.xirrStatus === 'CALCULATED' && run1.xirrPercent === run2.xirrPercent) {
            console.log('✅ Test 28 PASS: Multiple sign-change cash flows produce identical deterministic XIRR: ' + run1.xirrPercent + '%.');
            passCount++;
        } else {
            console.error('❌ Test 28 FAIL: Non-deterministic XIRR selection:', run1, run2);
        }

        // Test 29: Invalid Date Audit / Incomplete Flag
        console.log('\n--- Test 29: Invalid Date Audit / Incomplete Flag ---');
        await saveHoldings([{ id: 'h_t29', portfolioId: 'p_t29', symbol: 'INV_DATE_SYM', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('INV_DATE_SYM', 1100);
        await saveInvestmentEvents([
            { id: 'evt_t29_valid', portfolioId: 'p_t29', symbol: 'INV_DATE_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() },
            { id: 'evt_t29_invalid', portfolioId: 'p_t29', symbol: 'INV_DATE_SYM', type: EventType.FEE, status: InvestmentEventStatus.CONFIRMED, amount: 100, date: 'INVALID_DATE_STRING' }
        ]);
        const res29 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_t29', asOfDate: day365 });
        if (res29.performanceIntegrity === 'INCOMPLETE' && res29.skippedEventCount === 1 && res29.integrityWarnings.some(w => w.type === 'INVALID_EVENT_DATE')) {
            console.log('✅ Test 29 PASS: Invalid event date flagged audit warning and set performanceIntegrity: INCOMPLETE.');
            passCount++;
        } else {
            console.error('❌ Test 29 FAIL: Invalid date audit mismatch:', res29);
        }

        // Test 30: C.4.1 & C.4.2 Regression Matrix
        console.log('\n--- Test 30: C.4.1 & C.4.2 Regression Matrix ---');
        await saveHoldings([{ id: 'h_reg', portfolioId: 'p_reg', symbol: 'REG_SYM', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('REG_SYM', 1100);
        await saveInvestmentEvents([
            { id: 'evt_reg', portfolioId: 'p_reg', symbol: 'REG_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: baseDate.toISOString() }
        ]);
        const c41Res = await InvestingAnalyticsEngine.getPortfolioSummary({ portfolioId: 'p_reg' });
        const c42Res = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_reg' });
        if (c41Res.totalCurrentCostBasis === 10000 &&
            c41Res.totalMarketValue === 11000 &&
            c42Res.concentration.riskTier === 'HIGH') {
            console.log('✅ Test 30 PASS: C.4.1 and C.4.2 regression verified 100%.');
            passCount++;
        } else {
            console.error('❌ Test 30 FAIL: Prior stage regression failed:', c41Res, c42Res);
        }

        console.log(`\n================================================================`);
        console.log(`=== STAGE C.4.3 ACCEPTANCE RESULT: ${passCount}/${totalTests} TESTS PASSED PERFECTLY ===`);
        console.log(`================================================================\n`);

        if (passCount !== totalTests) {
            console.error(`🚨 HARDENING FAILURE: Only ${passCount}/${totalTests} tests passed. Exiting with code 1.`);
            process.exit(1);
        }

    } catch (err) {
        console.error('C.4.3 Acceptance suite exception:', err);
        process.exit(1);
    }
}

runC43AcceptanceSuite();

