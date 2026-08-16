import InvestingAnalyticsEngine from '../services/investingAnalyticsEngine.js';
import { saveHoldings, saveInvestmentEvents, loadHoldings, loadInvestmentEvents } from '../services/storage.js';
import { EventType, InvestmentEventStatus } from '../services/investingSchemas.js';
import MarketDataService from '../services/marketDataService.js';
import MoneyFlowEngine from '../services/moneyFlowEngine.js';

console.log('================================================================');
console.log('=== Stage C.4.2 Asset Allocation & Concentration 20-Test Suite===');
console.log('================================================================\n');

async function runC42AcceptanceSuite() {
    let passCount = 0;
    const totalTests = 20;

    try {
        await saveInvestmentEvents([]);

        // Scenario 1: Single Asset Class (100% allocation)
        console.log('--- Test 1: Single Asset Class Allocation ---');
        const s1Holdings = [
            { id: 'h_s1_1', portfolioId: 'p_s1', symbol: 'INFY', assetType: 'STOCK', quantity: 10, averageCost: 1000 }
        ];
        MarketDataService.setMockPrice('INFY', 1200); // 10 * 1200 = 12000
        await saveHoldings(s1Holdings);

        const s1Res = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_s1' });
        if (s1Res.assetAllocation.length === 1 &&
            s1Res.assetAllocation[0].assetType === 'STOCK' &&
            s1Res.assetAllocation[0].marketWeightPercent === 100.0 &&
            s1Res.assetAllocation[0].costWeightPercent === 100.0) {
            console.log('✅ Test 1 PASS: Single asset class 100% allocation verified.');
            passCount++;
        } else {
            console.error('❌ Test 1 FAIL: Single asset class mismatch.');
        }

        // Scenario 2: Multiple Asset Classes (Stocks 60k, MF 30k, Gold 10k)
        console.log('\n--- Test 2: Multiple Asset Classes Aggregation ---');
        const s2Holdings = [
            { id: 'h_s2_1', portfolioId: 'p_s2', symbol: 'STOCK_A', assetType: 'STOCK', quantity: 60, averageCost: 1000 },
            { id: 'h_s2_2', portfolioId: 'p_s2', symbol: 'MF_B', assetType: 'MUTUAL_FUND', quantity: 30, averageCost: 1000 },
            { id: 'h_s2_3', portfolioId: 'p_s2', symbol: 'GOLD_C', assetType: 'GOLD', quantity: 10, averageCost: 1000 }
        ];
        MarketDataService.setMockPrice('STOCK_A', 1000); // 60,000 (60%)
        MarketDataService.setMockPrice('MF_B', 1000);    // 30,000 (30%)
        MarketDataService.setMockPrice('GOLD_C', 1000);  // 10,000 (10%)
        await saveHoldings(s2Holdings);

        const s2Res = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_s2' });
        const stockAlloc = s2Res.assetAllocation.find(a => a.assetType === 'STOCK');
        const mfAlloc = s2Res.assetAllocation.find(a => a.assetType === 'MUTUAL_FUND');
        const goldAlloc = s2Res.assetAllocation.find(a => a.assetType === 'GOLD');

        if (stockAlloc?.marketWeightPercent === 60.0 &&
            mfAlloc?.marketWeightPercent === 30.0 &&
            goldAlloc?.marketWeightPercent === 10.0) {
            console.log('✅ Test 2 PASS: Multi-asset aggregation exact (STOCK: 60%, MF: 30%, GOLD: 10%).');
            passCount++;
        } else {
            console.error('❌ Test 2 FAIL: Multi-asset allocation weight mismatch.');
        }

        // Scenario 3: Market-Weight Calculation
        console.log('\n--- Test 3: Market-Weight Calculation Sum ---');
        const sumMktWeights = Number(s2Res.concentration.holdings.reduce((sum, h) => sum + h.marketWeightPercent, 0).toFixed(2));
        if (sumMktWeights === 100.0) {
            console.log('✅ Test 3 PASS: Sum of holding market weights == 100.00%.');
            passCount++;
        } else {
            console.error('❌ Test 3 FAIL: Sum of market weights != 100.00%:', sumMktWeights);
        }

        // Scenario 4: Cost-Weight Calculation
        console.log('\n--- Test 4: Cost-Weight Calculation Sum ---');
        const sumCostWeights = Number(s2Res.concentration.holdings.reduce((sum, h) => sum + h.costWeightPercent, 0).toFixed(2));
        if (sumCostWeights === 100.0) {
            console.log('✅ Test 4 PASS: Sum of holding cost weights == 100.00%.');
            passCount++;
        } else {
            console.error('❌ Test 4 FAIL: Sum of cost weights != 100.00%:', sumCostWeights);
        }

        // Setup 5 Holdings for Concentration & Tier Tests (45k, 25k, 15k, 10k, 5k -> Total = 100k)
        const sConcentrationHoldings = [
            { id: 'hc_1', portfolioId: 'p_conc', symbol: 'H1', assetType: 'STOCK', quantity: 45, averageCost: 1000 }, // 45%
            { id: 'hc_2', portfolioId: 'p_conc', symbol: 'H2', assetType: 'STOCK', quantity: 25, averageCost: 1000 }, // 25%
            { id: 'hc_3', portfolioId: 'p_conc', symbol: 'H3', assetType: 'STOCK', quantity: 15, averageCost: 1000 }, // 15%
            { id: 'hc_4', portfolioId: 'p_conc', symbol: 'H4', assetType: 'STOCK', quantity: 10, averageCost: 1000 }, // 10%
            { id: 'hc_5', portfolioId: 'p_conc', symbol: 'H5', assetType: 'STOCK', quantity: 5, averageCost: 1000 }   // 5%
        ];
        MarketDataService.setMockPrice('H1', 1000);
        MarketDataService.setMockPrice('H2', 1000);
        MarketDataService.setMockPrice('H3', 1000);
        MarketDataService.setMockPrice('H4', 1000);
        MarketDataService.setMockPrice('H5', 1000);
        await saveHoldings(sConcentrationHoldings);

        const sConcRes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_conc' });

        // Scenario 5: Top-1 Concentration
        console.log('\n--- Test 5: Top-1 Concentration ---');
        if (sConcRes.concentration.top1Percent === 45.0) {
            console.log('✅ Test 5 PASS: Top-1 concentration exactly equals 45.00%.');
            passCount++;
        } else {
            console.error('❌ Test 5 FAIL: Top-1 mismatch:', sConcRes.concentration.top1Percent);
        }

        // Scenario 6: Top-3 Concentration
        console.log('\n--- Test 6: Top-3 Concentration ---');
        if (sConcRes.concentration.top3Percent === 85.0) { // 45 + 25 + 15 = 85
            console.log('✅ Test 6 PASS: Top-3 concentration exactly equals 85.00%.');
            passCount++;
        } else {
            console.error('❌ Test 6 FAIL: Top-3 mismatch:', sConcRes.concentration.top3Percent);
        }

        // Scenario 7: Top-5 Concentration
        console.log('\n--- Test 7: Top-5 Concentration ---');
        if (sConcRes.concentration.top5Percent === 100.0) {
            console.log('✅ Test 7 PASS: Top-5 concentration exactly equals 100.00%.');
            passCount++;
        } else {
            console.error('❌ Test 7 FAIL: Top-5 mismatch:', sConcRes.concentration.top5Percent);
        }

        // Scenario 8: HHI Diversification Score (Two 50% holdings -> 50^2 + 50^2 = 5000)
        console.log('\n--- Test 8: HHI Calculation ---');
        const sHHIHoldings = [
            { id: 'hh_1', portfolioId: 'p_hhi', symbol: 'HHI_A', assetType: 'STOCK', quantity: 50, averageCost: 1000 },
            { id: 'hh_2', portfolioId: 'p_hhi', symbol: 'HHI_B', assetType: 'STOCK', quantity: 50, averageCost: 1000 }
        ];
        MarketDataService.setMockPrice('HHI_A', 1000);
        MarketDataService.setMockPrice('HHI_B', 1000);
        await saveHoldings(sHHIHoldings);
        const sHHIRes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_hhi' });
        if (sHHIRes.concentration.hhi === 5000.0) {
            console.log('✅ Test 8 PASS: HHI of two 50% holdings exactly equals 5000.00.');
            passCount++;
        } else {
            console.error('❌ Test 8 FAIL: HHI mismatch:', sHHIRes.concentration.hhi);
        }

        // Scenario 9: HIGH Risk Tier (Top1 > 40.0% -> e.g. 45% in p_conc)
        console.log('\n--- Test 9: HIGH Risk Tier ---');
        if (sConcRes.concentration.riskTier === 'HIGH') {
            console.log('✅ Test 9 PASS: Top1 > 40% (45%) correctly classified as HIGH risk.');
            passCount++;
        } else {
            console.error('❌ Test 9 FAIL: Expected HIGH, got:', sConcRes.concentration.riskTier);
        }

        // Scenario 10: MODERATE Risk Tier (Top1 = 30%, Top3 = 70%)
        console.log('\n--- Test 10: MODERATE Risk Tier ---');
        const sModAdjusted = [
            { id: 'hm_1', portfolioId: 'p_mod', symbol: 'M1', assetType: 'STOCK', quantity: 30, averageCost: 1000 }, // 30%
            { id: 'hm_2', portfolioId: 'p_mod', symbol: 'M2', assetType: 'STOCK', quantity: 20, averageCost: 1000 }, // 20%
            { id: 'hm_3', portfolioId: 'p_mod', symbol: 'M3', assetType: 'STOCK', quantity: 20, averageCost: 1000 }, // 20%
            { id: 'hm_4', portfolioId: 'p_mod', symbol: 'M4', assetType: 'STOCK', quantity: 15, averageCost: 1000 }, // 15%
            { id: 'hm_5', portfolioId: 'p_mod', symbol: 'M5', assetType: 'STOCK', quantity: 15, averageCost: 1000 }  // 15%
        ];
        MarketDataService.setMockPrice('M1', 1000);
        MarketDataService.setMockPrice('M2', 1000);
        MarketDataService.setMockPrice('M3', 1000);
        MarketDataService.setMockPrice('M4', 1000);
        MarketDataService.setMockPrice('M5', 1000);
        await saveHoldings(sModAdjusted);
        const sModRes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_mod' });
        if (sModRes.concentration.riskTier === 'MODERATE' && sModRes.concentration.top1Percent === 30.0 && sModRes.concentration.top3Percent === 70.0) {
            console.log('✅ Test 10 PASS: Top1 = 30% and Top3 = 70% correctly classified as MODERATE risk.');
            passCount++;
        } else {
            console.error('❌ Test 10 FAIL: Expected MODERATE, got:', sModRes.concentration.riskTier);
        }

        // Scenario 11: BALANCED Risk Tier (8 equal holdings of 12.5% -> Top1 = 12.5% <= 25%, Top3 = 37.5% <= 50%)
        console.log('\n--- Test 11: BALANCED Risk Tier ---');
        const sBalEqual = [
            { id: 'hbe_1', portfolioId: 'p_bal_eq', symbol: 'BE1', assetType: 'STOCK', quantity: 10, averageCost: 1000 },
            { id: 'hbe_2', portfolioId: 'p_bal_eq', symbol: 'BE2', assetType: 'STOCK', quantity: 10, averageCost: 1000 },
            { id: 'hbe_3', portfolioId: 'p_bal_eq', symbol: 'BE3', assetType: 'STOCK', quantity: 10, averageCost: 1000 },
            { id: 'hbe_4', portfolioId: 'p_bal_eq', symbol: 'BE4', assetType: 'STOCK', quantity: 10, averageCost: 1000 },
            { id: 'hbe_5', portfolioId: 'p_bal_eq', symbol: 'BE5', assetType: 'STOCK', quantity: 10, averageCost: 1000 },
            { id: 'hbe_6', portfolioId: 'p_bal_eq', symbol: 'BE6', assetType: 'STOCK', quantity: 10, averageCost: 1000 },
            { id: 'hbe_7', portfolioId: 'p_bal_eq', symbol: 'BE7', assetType: 'STOCK', quantity: 10, averageCost: 1000 },
            { id: 'hbe_8', portfolioId: 'p_bal_eq', symbol: 'BE8', assetType: 'STOCK', quantity: 10, averageCost: 1000 }
        ];
        for (let i = 1; i <= 8; i++) {
            MarketDataService.setMockPrice(`BE${i}`, 1000);
        }
        await saveHoldings(sBalEqual);
        const sBalEqualRes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_bal_eq' });
        if (sBalEqualRes.concentration.riskTier === 'BALANCED' && sBalEqualRes.concentration.top1Percent <= 25.0 && sBalEqualRes.concentration.top3Percent <= 50.0) {
            console.log('✅ Test 11 PASS: Top1 <= 25% (12.5%) and Top3 <= 50% (37.5%) correctly classified as BALANCED risk.');
            passCount++;
        } else {
            console.error('❌ Test 11 FAIL: Expected BALANCED, got:', sBalEqualRes.concentration.riskTier);
        }

        // Scenario 12: Empty Portfolio Safe Math
        console.log('\n--- Test 12: Empty Portfolio Safe Math ---');
        const sEmptyRes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'empty_p' });
        if (sEmptyRes.totalMarketValue === 0 &&
            sEmptyRes.assetAllocation.length === 0 &&
            sEmptyRes.concentration.riskTier === 'EMPTY' &&
            sEmptyRes.concentration.hhi === 0 &&
            Number.isFinite(sEmptyRes.concentration.top1Percent)) {
            console.log('✅ Test 12 PASS: Empty portfolio returns zero weights and EMPTY risk tier without NaN.');
            passCount++;
        } else {
            console.error('❌ Test 12 FAIL: Empty portfolio returned invalid structure:', sEmptyRes);
        }

        // Scenario 13: Partial Quote Fallback
        console.log('\n--- Test 13: Partial Quote Fallback ---');
        const sPartHoldings = [
            { id: 'hp_1', portfolioId: 'p_part', symbol: 'PART_LIVE', assetType: 'STOCK', quantity: 10, averageCost: 100 },
            { id: 'hp_2', portfolioId: 'p_part', symbol: 'PART_FAIL', assetType: 'STOCK', quantity: 10, averageCost: 200 }
        ];
        MarketDataService.setMockPrice('PART_LIVE', 150); // Live: 1500
        MarketDataService.setMockPrice('PART_FAIL', 0);   // Fallback: 2000
        await saveHoldings(sPartHoldings);
        const sPartRes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_part' });
        if (sPartRes.valuationBasis === 'PARTIAL_FALLBACK' &&
            sPartRes.quoteCoverage.marketValued === 1 &&
            sPartRes.quoteCoverage.costBasisFallback === 1 &&
            sPartRes.totalMarketValue === 3500) {
            console.log('✅ Test 13 PASS: Partial quote fallback accurately computed (Total: 3500, Basis: PARTIAL_FALLBACK).');
            passCount++;
        } else {
            console.error('❌ Test 13 FAIL: Partial fallback mismatch:', sPartRes);
        }

        // Scenario 14: Full Fallback Valuation
        console.log('\n--- Test 14: Full Fallback Valuation ---');
        const sFullFailHoldings = [
            { id: 'hff_1', portfolioId: 'p_full_fail', symbol: 'FAIL_1', assetType: 'STOCK', quantity: 10, averageCost: 100 },
            { id: 'hff_2', portfolioId: 'p_full_fail', symbol: 'FAIL_2', assetType: 'STOCK', quantity: 10, averageCost: 200 }
        ];
        MarketDataService.setMockPrice('FAIL_1', 0);
        MarketDataService.setMockPrice('FAIL_2', 0);
        await saveHoldings(sFullFailHoldings);
        const sFullFailRes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_full_fail' });
        if (sFullFailRes.valuationBasis === 'COST_BASIS_FALLBACK' &&
            sFullFailRes.quoteCoverage.costBasisFallback === 2 &&
            sFullFailRes.totalMarketValue === 3000) {
            console.log('✅ Test 14 PASS: Full fallback valuation accurately identified (COST_BASIS_FALLBACK).');
            passCount++;
        } else {
            console.error('❌ Test 14 FAIL: Full fallback mismatch:', sFullFailRes);
        }

        // Scenario 15: Multi-Portfolio Isolation
        console.log('\n--- Test 15: Multi-Portfolio Isolation ---');
        const sIsoHoldings = [
            { id: 'h_iso_A', portfolioId: 'p_iso_A', symbol: 'STOCK_A', assetType: 'STOCK', quantity: 10, averageCost: 100 },
            { id: 'h_iso_B', portfolioId: 'p_iso_B', symbol: 'STOCK_B', assetType: 'BOND', quantity: 10, averageCost: 500 }
        ];
        MarketDataService.setMockPrice('STOCK_A', 100);
        MarketDataService.setMockPrice('STOCK_B', 500);
        await saveHoldings(sIsoHoldings);

        const isoARes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_iso_A' });
        const isoBRes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_iso_B' });

        if (isoARes.totalMarketValue === 1000 && isoARes.assetAllocation.length === 1 && isoARes.assetAllocation[0].assetType === 'STOCK' &&
            isoBRes.totalMarketValue === 5000 && isoBRes.assetAllocation.length === 1 && isoBRes.assetAllocation[0].assetType === 'BOND') {
            console.log('✅ Test 15 PASS: Portfolios A and B remain strictly isolated in allocation queries.');
            passCount++;
        } else {
            console.error('❌ Test 15 FAIL: Portfolio isolation leakage detected.');
        }

        // Scenario 16: Unknown assetType Normalized to OTHER
        console.log('\n--- Test 16: Unknown assetType Normalized to OTHER ---');
        const sUnknownHoldings = [
            { id: 'hu_1', portfolioId: 'p_unk', symbol: 'COLLECTIBLE', assetType: 'VINTAGE_WATCH', quantity: 1, averageCost: 50000 },
            { id: 'hu_2', portfolioId: 'p_unk', symbol: 'NULL_ASSET', assetType: null, quantity: 1, averageCost: 10000 }
        ];
        MarketDataService.setMockPrice('COLLECTIBLE', 50000);
        MarketDataService.setMockPrice('NULL_ASSET', 10000);
        await saveHoldings(sUnknownHoldings);
        const sUnkRes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_unk' });
        if (sUnkRes.assetAllocation.length === 1 &&
            sUnkRes.assetAllocation[0].assetType === 'OTHER' &&
            sUnkRes.assetAllocation[0].holdingCount === 2) {
            console.log('✅ Test 16 PASS: Unknown/null asset types normalized cleanly to OTHER.');
            passCount++;
        } else {
            console.error('❌ Test 16 FAIL: Unknown asset type normalization failed:', sUnkRes.assetAllocation);
        }

        // Scenario 17: Read-Only Invariant
        console.log('\n--- Test 17: Read-Only Invariant ---');
        const txsBefore = await MoneyFlowEngine.getTransactions();
        const holdingsBefore = await loadHoldings();
        await InvestingAnalyticsEngine.getAssetAllocationSummary();
        const txsAfter = await MoneyFlowEngine.getTransactions();
        const holdingsAfter = await loadHoldings();

        if (txsBefore.length === txsAfter.length && holdingsBefore.length === holdingsAfter.length) {
            console.log('✅ Test 17 PASS: Zero MoneyFlow transactions or holding mutations created.');
            passCount++;
        } else {
            console.error('❌ Test 17 FAIL: State mutation detected in allocation engine.');
        }

        // Scenario 18: Finite Math & Zero Market Value Guard
        console.log('\n--- Test 18: Zero Market Value Guard ---');
        const sZeroHoldings = [
            { id: 'hz_1', portfolioId: 'p_zero', symbol: 'ZERO_VAL', assetType: 'STOCK', quantity: 10, averageCost: 0 }
        ];
        MarketDataService.setMockPrice('ZERO_VAL', 0);
        await saveHoldings(sZeroHoldings);
        const sZeroRes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_zero' });
        if (Number.isFinite(sZeroRes.concentration.top1Percent) &&
            Number.isFinite(sZeroRes.concentration.hhi) &&
            sZeroRes.concentration.riskTier === 'BALANCED') {
            console.log('✅ Test 18 PASS: Zero market value guarded; returns finite numbers and BALANCED tier.');
            passCount++;
        } else {
            console.error('❌ Test 18 FAIL: Zero market value failed guard:', sZeroRes.concentration);
        }

        // Scenario 19: Same-Symbol Across Separate Portfolios
        console.log('\n--- Test 19: Same-Symbol Across Separate Portfolios ---');
        const sSameSymHoldings = [
            { id: 'h_ss_A', portfolioId: 'p_ss_A', symbol: 'RELIANCE', assetType: 'STOCK', quantity: 100, averageCost: 1000 }, // 100,000
            { id: 'h_ss_B', portfolioId: 'p_ss_B', symbol: 'RELIANCE', assetType: 'STOCK', quantity: 200, averageCost: 1000 }  // 200,000
        ];
        MarketDataService.setMockPrice('RELIANCE', 1000);
        await saveHoldings(sSameSymHoldings);

        const ssARes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_ss_A' });
        const ssBRes = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_ss_B' });
        const ssGlobalRes = await InvestingAnalyticsEngine.getAssetAllocationSummary();

        if (ssARes.totalMarketValue === 100000 && ssARes.concentration.top1Percent === 100.0 &&
            ssBRes.totalMarketValue === 200000 && ssBRes.concentration.top1Percent === 100.0 &&
            ssGlobalRes.concentration.holdings.some(h => h.portfolioId === 'p_ss_A' && h.marketValue === 100000) &&
            ssGlobalRes.concentration.holdings.some(h => h.portfolioId === 'p_ss_B' && h.marketValue === 200000)) {
            console.log('✅ Test 19 PASS: Same-symbol holdings isolated per portfolio and preserved in global concentration.');
            passCount++;
        } else {
            console.error('❌ Test 19 FAIL: Same symbol multi-portfolio handling mismatch.');
        }

        // Scenario 20: C.4.1 Regression Suite Execution
        console.log('\n--- Test 20: C.4.1 Regression Suite Execution ---');
        const c41Res = await InvestingAnalyticsEngine.getPortfolioSummary({ portfolioId: 'p_ss_A' });
        if (c41Res.totalCurrentCostBasis === 100000 &&
            c41Res.totalMarketValue === 100000 &&
            c41Res.unrealizedGain === 0 &&
            c41Res.valuationBasis === 'MARKET_QUOTE') {
            console.log('✅ Test 20 PASS: C.4.1 portfolio summary regression verified 100%.');
            passCount++;
        } else {
            console.error('❌ Test 20 FAIL: C.4.1 regression failed:', c41Res);
        }

        console.log(`\n================================================================`);
        console.log(`=== STAGE C.4.2 ACCEPTANCE RESULT: ${passCount}/${totalTests} TESTS PASSED PERFECTLY ===`);
        console.log(`================================================================\n`);

        if (passCount !== totalTests) {
            console.error(`🚨 HARDENING FAILURE: Only ${passCount}/${totalTests} tests passed. Exiting with code 1.`);
            process.exit(1);
        }

    } catch (err) {
        console.error('C.4.2 Acceptance suite exception:', err);
        process.exit(1);
    }
}

runC42AcceptanceSuite();

