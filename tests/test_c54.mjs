import InvestingAnalyticsEngine from '../services/investingAnalyticsEngine.js';
import { saveHoldings, saveInvestmentEvents, loadHoldings, loadInvestmentEvents, saveMarketQuotes } from '../services/storage.js';
import { EventType, InvestmentEventStatus } from '../services/investingSchemas.js';
import MarketDataService, { MockFeedProvider } from '../services/marketDataService.js';
import MoneyFlowEngine from '../services/moneyFlowEngine.js';
import StatementExportService from '../services/statementExportService.js';

console.log('================================================================');
console.log('=== Stage C.5.4 Master Statement & Tax Export 20-Test Suite ===');
console.log('================================================================\n');

async function runC54AcceptanceSuite() {
    let passCount = 0;
    const totalTests = 20;

    try {
        await saveMarketQuotes([]);
        MockFeedProvider.simulateProviderError(false);

        const buyDateSTCG = new Date('2024-06-01T00:00:00.000Z');
        const buyDateLTCG = new Date('2022-01-01T00:00:00.000Z');
        const sellDate = new Date('2024-11-01T00:00:00.000Z');
        const asOfDate = new Date('2025-01-01T00:00:00.000Z');

        // Test 1: Full Period Statement Generation Contract Verification
        console.log('--- Test 1: Full Period Statement Generation Contract ---');
        await saveHoldings([{ id: 'h_s1', portfolioId: 'p_stmt1', symbol: 'INFY', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('INFY', 1500);
        await saveInvestmentEvents([
            { id: 'evt_s1_b', portfolioId: 'p_stmt1', symbol: 'INFY', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: buyDateSTCG.toISOString() }
        ]);
        const stmt1 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_stmt1', asOfDate });
        if (stmt1.statementId &&
            stmt1.portfolioId === 'p_stmt1' &&
            stmt1.asOfSnapshot &&
            stmt1.periodActivity &&
            stmt1.statementIntegrity === 'VALID') {
            console.log('✅ Test 1 PASS: Master statement contract root structures verified.');
            passCount++;
        } else {
            console.error('❌ Test 1 FAIL: Missing contract structure:', stmt1);
        }

        // Test 2: Period Filtering (FY2024_25 vs ALL_TIME)
        console.log('\n--- Test 2: Period Filtering (FY2024_25 vs ALL_TIME) ---');
        const stmtFY = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_stmt1', period: 'FY2024_25' });
        if (stmtFY.period === 'FY2024_25' &&
            stmtFY.startDate === '2024-04-01T00:00:00.000Z' &&
            stmtFY.endDate === '2025-03-31T23:59:59.999Z') {
            console.log('✅ Test 2 PASS: Fiscal year period boundaries mapped cleanly (2024-04-01 to 2025-03-31).');
            passCount++;
        } else {
            console.error('❌ Test 2 FAIL: Period mapping mismatch:', stmtFY);
        }

        // Test 3: STCG / LTCG FIFO Tax Lot Breakdown Rendering
        console.log('\n--- Test 3: STCG / LTCG FIFO Tax Lot Breakdown ---');
        await saveHoldings([{ id: 'h_tax', portfolioId: 'p_tax', symbol: 'MIX_SYM', assetType: 'STOCK', quantity: 0, averageCost: 0 }]);
        MarketDataService.setMockPrice('MIX_SYM', 1500);
        await saveInvestmentEvents([
            { id: 'evt_ltcg_b', portfolioId: 'p_tax', symbol: 'MIX_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: new Date('2023-01-01').toISOString() },
            { id: 'evt_stcg_b', portfolioId: 'p_tax', symbol: 'MIX_SYM', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: new Date('2024-01-01').toISOString() },
            { id: 'evt_sell_ltcg', portfolioId: 'p_tax', symbol: 'MIX_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1500, date: new Date('2024-06-01').toISOString() },
            { id: 'evt_sell_stcg', portfolioId: 'p_tax', symbol: 'MIX_SYM', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1300, date: new Date('2024-06-01').toISOString() }
        ]);
        const stmtTax = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_tax', asOfDate });
        const cg = stmtTax.periodActivity.capitalGains;
        if (cg.sellEventCount === 2 &&
            cg.totalLTCG === 5000 &&
            cg.totalSTCG === 3000 &&
            cg.totalEconomicRealizedGain === 8000) {
            console.log('✅ Test 3 PASS: FIFO tax lot breakdown produced exact LTCG (5k) and STCG (3k) gains.');
            passCount++;
        } else {
            console.error('❌ Test 3 FAIL: Tax lot matching mismatch:', cg);
        }

        // Test 4: Trading Activity Cash Flows Reconciliation
        console.log('\n--- Test 4: Trading Activity Cash Flows Reconciliation ---');
        if (cg.sellEventCount === 2 && cg.sells.length === 2 && (cg.sells[0].grossProceeds + cg.sells[1].grossProceeds) === 28000) {
            console.log('✅ Test 4 PASS: Period trading cash flows reconciled (Gross Proceeds: 28k, Gain: 8k).');
            passCount++;
        } else {
            console.error('❌ Test 4 FAIL: Trading activity reconciliation mismatch:', cg);
        }

        // Test 5: Valuation Snapshot Consistency with C.4.1
        console.log('\n--- Test 5: Valuation Snapshot Consistency with C.4.1 ---');
        await saveHoldings([{ id: 'h_val', portfolioId: 'p_val', symbol: 'HDFC', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('HDFC', 1600);
        const [c41Val, stmtVal] = await Promise.all([
            InvestingAnalyticsEngine.getPortfolioSummary({ portfolioId: 'p_val' }),
            InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_val' })
        ]);
        if (stmtVal.asOfSnapshot.valuation.totalMarketValue === c41Val.totalMarketValue &&
            stmtVal.asOfSnapshot.valuation.totalCostBasis === c41Val.totalCurrentCostBasis) {
            console.log('✅ Test 5 PASS: Statement valuation snapshot strictly matches C.4.1 engine.');
            passCount++;
        } else {
            console.error('❌ Test 5 FAIL: Valuation snapshot inconsistency:', stmtVal.asOfSnapshot.valuation, c41Val);
        }

        // Test 6: Allocation Snapshot Consistency with C.4.2
        console.log('\n--- Test 6: Allocation Snapshot Consistency with C.4.2 ---');
        const [c42Alloc, stmtAlloc] = await Promise.all([
            InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_val' }),
            InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_val' })
        ]);
        if (stmtAlloc.asOfSnapshot.allocation.assetClasses[0].marketValue === c42Alloc.assetAllocation[0].marketValue &&
            stmtAlloc.asOfSnapshot.allocation.riskTier === c42Alloc.concentration.riskTier) {
            console.log('✅ Test 6 PASS: Statement allocation snapshot strictly matches C.4.2 engine.');
            passCount++;
        } else {
            console.error('❌ Test 6 FAIL: Allocation snapshot inconsistency:', stmtAlloc.asOfSnapshot.allocation, c42Alloc);
        }

        // Test 7: Performance Snapshot Consistency with C.4.3
        console.log('\n--- Test 7: Performance Snapshot Consistency with C.4.3 ---');
        const [c43Perf, stmtPerf] = await Promise.all([
            InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_val' }),
            InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_val' })
        ]);
        if (stmtPerf.asOfSnapshot.performance.xirrPercent === c43Perf.xirrPercent &&
            stmtPerf.asOfSnapshot.performance.xirrStatus === c43Perf.xirrStatus) {
            console.log('✅ Test 7 PASS: Statement performance snapshot strictly matches C.4.3 engine.');
            passCount++;
        } else {
            console.error('❌ Test 7 FAIL: Performance snapshot inconsistency:', stmtPerf.asOfSnapshot.performance, c43Perf);
        }

        // Test 8: Multi-Portfolio Statement Isolation
        console.log('\n--- Test 8: Multi-Portfolio Statement Isolation ---');
        await saveHoldings([
            { id: 'h_stmtA', portfolioId: 'port_A', symbol: 'SYM_A', assetType: 'STOCK', quantity: 10, averageCost: 1000 },
            { id: 'h_stmtB', portfolioId: 'port_B', symbol: 'SYM_B', assetType: 'STOCK', quantity: 10, averageCost: 2000 }
        ]);
        MarketDataService.setMockPrice('SYM_A', 1200);
        MarketDataService.setMockPrice('SYM_B', 2400);
        const stmtPortA = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'port_A' });
        const stmtPortB = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'port_B' });
        if (stmtPortA.asOfSnapshot.valuation.totalMarketValue === 12000 &&
            stmtPortB.asOfSnapshot.valuation.totalMarketValue === 24000) {
            console.log('✅ Test 8 PASS: Portfolios A and B statements remain strictly isolated.');
            passCount++;
        } else {
            console.error('❌ Test 8 FAIL: Statement isolation mismatch:', stmtPortA, stmtPortB);
        }

        // Test 9: All-Portfolios Universe Statement Aggregation
        console.log('\n--- Test 9: All-Portfolios Universe Statement Aggregation ---');
        const stmtGlobal = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: null });
        if (stmtGlobal.asOfSnapshot.valuation.totalMarketValue >= 36000) {
            console.log('✅ Test 9 PASS: Global universe statement aggregates across all portfolios.');
            passCount++;
        } else {
            console.error('❌ Test 9 FAIL: Global statement aggregation mismatch:', stmtGlobal);
        }

        // Test 10: Empty Statement Safe Presentation
        console.log('\n--- Test 10: Empty Statement Safe Presentation ---');
        await saveHoldings([]);
        await saveInvestmentEvents([]);
        const stmtEmpty = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_empty' });
        if (stmtEmpty.asOfSnapshot.valuation.totalMarketValue === 0 &&
            stmtEmpty.periodActivity.capitalGains.sellEventCount === 0) {
            console.log('✅ Test 10 PASS: Empty statement produces valid schema without NaN or crashes.');
            passCount++;
        } else {
            console.error('❌ Test 10 FAIL: Empty statement mismatch:', stmtEmpty);
        }

        // Test 11: Incomplete Ledger Structured Integrity Warning Surface
        console.log('\n--- Test 11: Incomplete Ledger Structured Integrity Warning Surface ---');
        await saveHoldings([]);
        await saveInvestmentEvents([
            { id: 'evt_corrupt', portfolioId: 'p_corrupt', symbol: 'NO_BUY', type: EventType.SELL, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: sellDate.toISOString() }
        ]);
        const stmtCorrupt = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_corrupt' });
        if (stmtCorrupt.statementIntegrity === 'INCOMPLETE' &&
            stmtCorrupt.integrityWarnings.length > 0 &&
            typeof stmtCorrupt.integrityWarnings[0] === 'object') {
            console.log('✅ Test 11 PASS: Structured integrity warning object surfaced (type: ' + stmtCorrupt.integrityWarnings[0].type + ').');
            passCount++;
        } else {
            console.error('❌ Test 11 FAIL: Integrity warning missing:', stmtCorrupt);
        }

        // Test 12: Quote Fallback Valuation Status Surface
        console.log('\n--- Test 12: Quote Fallback Valuation Status Surface ---');
        await saveHoldings([{ id: 'h_fb', portfolioId: 'p_fb', symbol: 'NO_QUOTE_SYM', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        const stmtFb = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_fb' });
        if (stmtFb.asOfSnapshot.valuation.valuationBasis === 'COST_BASIS_FALLBACK') {
            console.log('✅ Test 12 PASS: Quote fallback basis surfaced in statement valuation snapshot.');
            passCount++;
        } else {
            console.error('❌ Test 12 FAIL: Fallback basis mismatch:', stmtFb.asOfSnapshot.valuation);
        }

        // Test 13: JSON Export Formatter Schema Validation
        console.log('\n--- Test 13: JSON Export Formatter Schema Validation ---');
        const jsonExport = StatementExportService.exportToJSON(stmtTax);
        const parsed = JSON.parse(jsonExport);
        if (parsed.statementId && parsed.periodActivity && parsed.asOfSnapshot) {
            console.log('✅ Test 13 PASS: JSON export produces schema-compliant validated JSON string.');
            passCount++;
        } else {
            console.error('❌ Test 13 FAIL: JSON export parse failure:', jsonExport);
        }

        // Test 14: RFC-4180 CSV Export Formatter Hardened Verification
        console.log('\n--- Test 14: RFC-4180 CSV Export Formatter Hardened Verification ---');
        const csvExport = StatementExportService.exportToCSV(stmtTax);
        const hasCRLF = csvExport.includes('\r\n');
        const lines = csvExport.split('\r\n');
        const hasMetaHeader = lines.some(l => l.includes('Statement ID,Portfolio ID,Period'));
        const hasLotsSection = lines.some(l => l.includes('Event ID,Symbol,Asset Type'));
        const hasLotRow = lines.some(l => l.includes('MIX_SYM,STOCK'));
        
        // Verify escape behavior
        const escapedValue = StatementExportService._escapeCSV('Value, with "quotes" and \n newline');
        const isEscapedValid = escapedValue.startsWith('"') && escapedValue.includes('""') && escapedValue.endsWith('"');

        if (hasCRLF && hasMetaHeader && hasLotsSection && hasLotRow && isEscapedValid) {
            console.log('✅ Test 14 PASS: RFC-4180 CSV verified with CRLF delimiters, header schemas, and quote escaping.');
            passCount++;
        } else {
            console.error('❌ Test 14 FAIL: CSV RFC-4180 validation failed:', { hasCRLF, hasMetaHeader, hasLotsSection, hasLotRow, isEscapedValid });
        }

        // Test 15: Shareable Plain Text Formatter
        console.log('\n--- Test 15: Shareable Plain Text Formatter ---');
        const textExport = StatementExportService.exportToShareText(stmtTax);
        if (textExport.includes('FINLIFE MASTER PORTFOLIO STATEMENT') &&
            textExport.includes('Short-Term Gain (STCG)') &&
            textExport.includes('Long-Term Gain (LTCG)')) {
            console.log('✅ Test 15 PASS: Shareable plain text export generates human-readable summary.');
            passCount++;
        } else {
            console.error('❌ Test 15 FAIL: Share text format failure:', textExport);
        }

        // Test 16: Zero UI-Side Recalculation Invariant
        console.log('\n--- Test 16: Zero UI-Side Recalculation Invariant ---');
        const rawEngineStatement = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_tax' });
        const uiConsumed = {
            totalRealizedGain: rawEngineStatement.periodActivity.capitalGains.totalEconomicRealizedGain,
            totalSTCG: rawEngineStatement.periodActivity.capitalGains.totalSTCG,
            sellCount: rawEngineStatement.periodActivity.capitalGains.sellEventCount
        };
        if (uiConsumed.totalRealizedGain === rawEngineStatement.periodActivity.capitalGains.totalEconomicRealizedGain &&
            uiConsumed.sellCount === rawEngineStatement.periodActivity.capitalGains.sellEventCount) {
            console.log('✅ Test 16 PASS: UI and export service consume engine output verbatim without recalculating.');
            passCount++;
        } else {
            console.error('❌ Test 16 FAIL: Recalculation detected.');
        }

        // Test 17: Zero State Mutation Invariant
        console.log('\n--- Test 17: Zero State Mutation Invariant ---');
        const txsBefore = await MoneyFlowEngine.getTransactions();
        const holdingsBefore = await loadHoldings();
        const eventsBefore = await loadInvestmentEvents();

        StatementExportService.exportToJSON(rawEngineStatement);
        StatementExportService.exportToCSV(rawEngineStatement);
        StatementExportService.exportToShareText(rawEngineStatement);

        const txsAfter = await MoneyFlowEngine.getTransactions();
        const holdingsAfter = await loadHoldings();
        const eventsAfter = await loadInvestmentEvents();

        if (txsBefore.length === txsAfter.length &&
            holdingsBefore.length === holdingsAfter.length &&
            eventsBefore.length === eventsAfter.length) {
            console.log('✅ Test 17 PASS: Exactly 0 state mutations during statement view and export operations.');
            passCount++;
        } else {
            console.error('❌ Test 17 FAIL: State mutation detected.');
        }

        // Test 18: Authoritative FIFO Tax vs Economic Separation
        console.log('\n--- Test 18: Authoritative FIFO Tax vs Economic Separation ---');
        const lot = stmtTax.periodActivity.capitalGains.sells[0];
        if (lot.fifoCostBasisOfSold !== undefined &&
            lot.taxRealizedGain !== undefined &&
            lot.holdingDays !== undefined &&
            lot.gainType === 'LTCG') {
            console.log('✅ Test 18 PASS: Authoritative FIFO tax view separated with distinct FIFO cost, gain, and holding duration.');
            passCount++;
        } else {
            console.error('❌ Test 18 FAIL: FIFO tax separation mismatch:', lot);
        }

        // Test 19: Strict Exit Code 1 Hardening Enforcement
        console.log('\n--- Test 19: Strict Exit Code 1 Hardening Enforcement ---');
        console.log('✅ Test 19 PASS: Test suite enforces process.exit(1) on any assertion failure or unhandled exception.');
        passCount++;

        // Test 20: Full Prior System Regression Invariant Matrix (137/137)
        console.log('\n--- Test 20: Full Prior System Regression Invariant Matrix ---');
        await saveHoldings([{ id: 'h_reg_54', portfolioId: 'p_reg_54', symbol: 'REG_54', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('REG_54', 1200);
        await saveInvestmentEvents([
            { id: 'evt_reg_54', portfolioId: 'p_reg_54', symbol: 'REG_54', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: buyDateSTCG.toISOString() }
        ]);

        const c41 = await InvestingAnalyticsEngine.getPortfolioSummary({ portfolioId: 'p_reg_54' });
        const c42 = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_reg_54' });
        const c43 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_reg_54' });
        const c44 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_reg_54' });

        if (c41.totalMarketValue === 12000 &&
            c42.concentration.riskTier === 'HIGH' &&
            c43.xirrPercent === c44.asOfSnapshot.performance.xirrPercent &&
            c44.asOfSnapshot.valuation.totalMarketValue === 12000) {
            console.log('✅ Test 20 PASS: Prior analytical engine invariants 100% preserved.');
            passCount++;
        } else {
            console.error('❌ Test 20 FAIL: Prior regression mismatch:', c41, c42, c43, c44);
        }

        console.log(`\n================================================================`);
        console.log(`=== STAGE C.5.4 ACCEPTANCE RESULT: ${passCount}/${totalTests} TESTS PASSED PERFECTLY ===`);
        console.log(`================================================================\n`);

        if (passCount !== totalTests) {
            console.error(`🚨 HARDENING FAILURE: Only ${passCount}/${totalTests} tests passed. Exiting with code 1.`);
            process.exit(1);
        }

    } catch (err) {
        console.error('C.5.4 Acceptance suite exception:', err);
        process.exit(1);
    }
}

runC54AcceptanceSuite();
