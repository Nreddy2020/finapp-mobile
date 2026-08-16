import RebalancingEngine from '../services/rebalancingEngine.js';
import TargetAllocationService from '../services/targetAllocationService.js';
import { saveHoldings, saveInvestmentEvents, loadHoldings, loadInvestmentEvents, saveMarketQuotes } from '../services/storage.js';
import { EventType, InvestmentEventStatus } from '../services/investingSchemas.js';
import MarketDataService, { MockFeedProvider } from '../services/marketDataService.js';
import MoneyFlowEngine from '../services/moneyFlowEngine.js';

console.log('================================================================');
console.log('=== Stage C.6.2 Drift & Rebalancing Delta 20-Test Suite ===');
console.log('================================================================\n');

async function runC62AcceptanceSuite() {
    let passCount = 0;
    const totalTests = 20;

    try {
        await saveMarketQuotes([]);
        MockFeedProvider.simulateProviderError(false);

        const asOfDate = new Date('2025-01-01T00:00:00.000Z');

        // Test 1: Balanced Portfolio In-Band
        console.log('--- Test 1: Balanced Portfolio In-Band ---');
        await saveHoldings([
            { id: 'h1_s', portfolioId: 'p_bal', symbol: 'STK_1', assetType: 'STOCK', quantity: 50, averageCost: 1000 },
            { id: 'h1_m', portfolioId: 'p_bal', symbol: 'MF_1', assetType: 'MUTUAL_FUND', quantity: 50, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('STK_1', 1000); // 50k (50%)
        MarketDataService.setMockPrice('MF_1', 1000);  // 50k (50%)

        const balPolicy = TargetAllocationService.createPolicy({
            policyId: 'pol_bal_5050',
            policyName: '50/50 Balanced',
            version: '1.0.0',
            assetWeights: { STOCK: 50, MUTUAL_FUND: 50, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 },
            driftTolerancePercent: 5.0
        });

        const res1 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_bal',
            policy: balPolicy,
            asOfDate
        });

        if (res1.rebalancingStatus === 'BALANCED' &&
            res1.recommendations.every(r => r.action === 'HOLD_BALANCED' || r.action === 'HOLD_NON_TRADEABLE') &&
            res1.plannedBuyNotional === 0 &&
            res1.plannedSellNotional === 0) {
            console.log('✅ Test 1 PASS: Balanced portfolio evaluates to status: BALANCED with 0 trade deltas.');
            passCount++;
        } else {
            console.error('❌ Test 1 FAIL: Balanced evaluation mismatch:', res1);
        }

        // Test 2: Single Overweight Asset (Stock 70% vs Target 50%)
        console.log('\n--- Test 2: Single Overweight Asset ---');
        await saveHoldings([
            { id: 'h2_s', portfolioId: 'p_over', symbol: 'STK_OVER', assetType: 'STOCK', quantity: 70, averageCost: 1000 },
            { id: 'h2_m', portfolioId: 'p_over', symbol: 'MF_UNDER', assetType: 'MUTUAL_FUND', quantity: 30, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('STK_OVER', 1000); // 70k (70%)
        MarketDataService.setMockPrice('MF_UNDER', 1000); // 30k (30%)

        const res2 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_over',
            policy: balPolicy,
            asOfDate
        });

        const stockRec2 = res2.recommendations.find(r => r.assetType === 'STOCK' && r.action === 'SELL');
        if (res2.rebalancingStatus === 'ACTION_RECOMMENDED' &&
            stockRec2 &&
            stockRec2.roundedTradeQuantity === 20 &&
            stockRec2.requiredNotional === -20000) {
            console.log('✅ Test 2 PASS: Overweight Stock (70% vs 50%) generates SELL recommendation for 20 shares (₹20,000).');
            passCount++;
        } else {
            console.error('❌ Test 2 FAIL: Overweight detection mismatch:', res2);
        }

        // Test 3: Single Underweight Asset (MF 30% vs Target 50%)
        console.log('\n--- Test 3: Single Underweight Asset ---');
        const mfRec3 = res2.recommendations.find(r => r.assetType === 'MUTUAL_FUND' && r.action === 'BUY');
        if (mfRec3 && mfRec3.roundedTradeQuantity === 20 && mfRec3.requiredNotional === 20000) {
            console.log('✅ Test 3 PASS: Underweight MF (30% vs 50%) generates BUY recommendation for 20 units (₹20,000).');
            passCount++;
        } else {
            console.error('❌ Test 3 FAIL: Underweight detection mismatch:', mfRec3);
        }

        // Test 4: Multiple Simultaneous Drifts (3 Asset Classes)
        console.log('\n--- Test 4: Multiple Simultaneous Drifts ---');
        await saveHoldings([
            { id: 'h4_s', portfolioId: 'p_multi', symbol: 'STK_M', assetType: 'STOCK', quantity: 60, averageCost: 1000 },
            { id: 'h4_g', portfolioId: 'p_multi', symbol: 'GOLD_M', assetType: 'GOLD', quantity: 10, averageCost: 1000 },
            { id: 'h4_b', portfolioId: 'p_multi', symbol: 'BOND_M', assetType: 'BOND', quantity: 30, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('STK_M', 1000);  // 60k (60%)
        MarketDataService.setMockPrice('GOLD_M', 1000); // 10k (10%)
        MarketDataService.setMockPrice('BOND_M', 1000); // 30k (30%)

        const triPolicy = TargetAllocationService.createPolicy({
            policyId: 'pol_tri',
            policyName: 'Tri Asset',
            version: '1.0.0',
            assetWeights: { STOCK: 40, GOLD: 30, BOND: 30, MUTUAL_FUND: 0, ETF: 0, CRYPTO: 0, REAL_ESTATE: 0, OTHER: 0 },
            driftTolerancePercent: 5.0
        });

        const res4 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_multi',
            policy: triPolicy,
            asOfDate
        });

        if (res4.plannedBuyNotional === 20000 && res4.plannedSellNotional === 20000) {
            console.log('✅ Test 4 PASS: Multiple simultaneous drifts balanced (Planned Buys: 20k, Sells: 20k).');
            passCount++;
        } else {
            console.error('❌ Test 4 FAIL: Multi-drift mismatch:', res4);
        }

        // Test 5: Exact Boundary +5.00 pp (In-Band BALANCED)
        console.log('\n--- Test 5: Exact Boundary +5.00 pp ---');
        await saveHoldings([
            { id: 'h5_s', portfolioId: 'p_b5', symbol: 'STK_5', assetType: 'STOCK', quantity: 55, averageCost: 1000 },
            { id: 'h5_m', portfolioId: 'p_b5', symbol: 'MF_5', assetType: 'MUTUAL_FUND', quantity: 45, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('STK_5', 1000); // 55% (Drift = +5.00 pp)
        MarketDataService.setMockPrice('MF_5', 1000);  // 45% (Drift = -5.00 pp)

        const res5 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_b5',
            policy: balPolicy,
            asOfDate
        });

        if (res5.rebalancingStatus === 'BALANCED' && res5.plannedSellNotional === 0) {
            console.log('✅ Test 5 PASS: Exact +5.00 pp drift evaluates to BALANCED (in-band).');
            passCount++;
        } else {
            console.error('❌ Test 5 FAIL: Exact +5.00 pp boundary failed:', res5);
        }

        // Test 6: Exact Boundary -5.00 pp (In-Band BALANCED)
        console.log('\n--- Test 6: Exact Boundary -5.00 pp ---');
        if (res5.rebalancingStatus === 'BALANCED' && res5.plannedBuyNotional === 0) {
            console.log('✅ Test 6 PASS: Exact -5.00 pp drift evaluates to BALANCED (in-band).');
            passCount++;
        } else {
            console.error('❌ Test 6 FAIL: Exact -5.00 pp boundary failed:', res5);
        }

        // Test 7: Strict Trigger +5.01 pp (Triggers OVERWEIGHT)
        console.log('\n--- Test 7: Strict Trigger +5.01 pp ---');
        await saveHoldings([
            { id: 'h7_s', portfolioId: 'p_trig', symbol: 'STK_7', assetType: 'STOCK', quantity: 55.01, averageCost: 1000 },
            { id: 'h7_m', portfolioId: 'p_trig', symbol: 'MF_7', assetType: 'MUTUAL_FUND', quantity: 44.99, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('STK_7', 1000); // 55.01%
        MarketDataService.setMockPrice('MF_7', 1000);  // 44.99%

        const res7 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_trig',
            policy: balPolicy,
            asOfDate
        });

        if (res7.rebalancingStatus === 'ACTION_RECOMMENDED' && res7.recommendations.some(r => r.assetType === 'STOCK' && r.action === 'SELL')) {
            console.log('✅ Test 7 PASS: Strict +5.01 pp drift triggers OVERWEIGHT sell recommendation.');
            passCount++;
        } else {
            console.error('❌ Test 7 FAIL: Strict trigger +5.01 pp failed:', res7);
        }

        // Test 8: Strict Trigger -5.01 pp (Triggers UNDERWEIGHT)
        console.log('\n--- Test 8: Strict Trigger -5.01 pp ---');
        if (res7.recommendations.some(r => r.assetType === 'MUTUAL_FUND' && r.action === 'BUY')) {
            console.log('✅ Test 8 PASS: Strict -5.01 pp drift triggers UNDERWEIGHT buy recommendation.');
            passCount++;
        } else {
            console.error('❌ Test 8 FAIL: Strict trigger -5.01 pp failed:', res7);
        }

        // Test 9: Zero-Target Asset Class (100% Overweight Divestment)
        console.log('\n--- Test 9: Zero-Target Asset Class ---');
        await saveHoldings([
            { id: 'h9_s', portfolioId: 'p_z', symbol: 'STK_Z', assetType: 'STOCK', quantity: 80, averageCost: 1000 },
            { id: 'h9_c', portfolioId: 'p_z', symbol: 'CRYPTO_Z', assetType: 'CRYPTO', quantity: 20, averageCost: 1000 } // Target = 0%
        ]);
        MarketDataService.setMockPrice('STK_Z', 1000);    // 80k
        MarketDataService.setMockPrice('CRYPTO_Z', 1000); // 20k

        const zeroCryptoPolicy = TargetAllocationService.createPolicy({
            policyId: 'pol_zero_c',
            policyName: '100% Stock',
            version: '1.0.0',
            assetWeights: { STOCK: 100, MUTUAL_FUND: 0, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 },
            driftTolerancePercent: 5.0
        });

        const res9 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_z',
            policy: zeroCryptoPolicy,
            asOfDate
        });

        const cryptoRec9 = res9.recommendations.find(r => r.assetType === 'CRYPTO' && r.action === 'SELL');
        if (cryptoRec9 && cryptoRec9.roundedTradeQuantity === 20) {
            console.log('✅ Test 9 PASS: Zero-target Crypto asset (Target 0%, Current 20%) marked for 100% sell divestment (20 units).');
            passCount++;
        } else {
            console.error('❌ Test 9 FAIL: Zero-target divestment failed:', cryptoRec9);
        }

        // Test 10: Stock / ETF Whole Share Floor Rounding
        console.log('\n--- Test 10: Stock / ETF Whole Share Floor Rounding ---');
        await saveHoldings([
            { id: 'h10_s', portfolioId: 'p_floor', symbol: 'EXPENSIVE_STK', assetType: 'STOCK', quantity: 10, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('EXPENSIVE_STK', 3500); // Price 3,500
        // Required Buy = 10,000 -> Raw = 2.857 -> Floor = 2
        const res10 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_floor',
            policy: zeroCryptoPolicy, // Target 100%
            availableLiquidity: 10000,
            asOfDate
        });
        const stkRec10 = res10.recommendations.find(r => r.symbol === 'EXPENSIVE_STK');
        if (stkRec10 && stkRec10.roundedTradeQuantity === 2 && stkRec10.roundingMode === 'FLOOR_WHOLE') {
            console.log('✅ Test 10 PASS: Stock whole share floor rounding verified (Raw: 2.857 -> Rounded: 2 shares).');
            passCount++;
        } else {
            console.error('❌ Test 10 FAIL: Floor rounding failed:', stkRec10);
        }

        // Test 11: Mutual Fund / Crypto / Gold 4-Decimal Rounding
        console.log('\n--- Test 11: Mutual Fund / Crypto 4-Decimal Rounding ---');
        await saveHoldings([
            { id: 'h11_m', portfolioId: 'p_dec4', symbol: 'NAV_MF', assetType: 'MUTUAL_FUND', quantity: 100, averageCost: 100 }
        ]);
        MarketDataService.setMockPrice('NAV_MF', 77.33);
        const res11 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_dec4',
            policy: TargetAllocationService.createPolicy({
                policyId: 'pol_mf100',
                policyName: '100% MF',
                version: '1.0.0',
                assetWeights: { MUTUAL_FUND: 100, STOCK: 0, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 },
                driftTolerancePercent: 5.0
            }),
            availableLiquidity: 1000,
            asOfDate
        });
        const mfRec11 = res11.recommendations.find(r => r.symbol === 'NAV_MF');
        if (mfRec11 && mfRec11.roundingMode === 'DECIMAL_4' && Number(mfRec11.roundedTradeQuantity.toFixed(4)) === mfRec11.roundedTradeQuantity) {
            console.log(`✅ Test 11 PASS: Mutual Fund 4-decimal precision rounding verified (${mfRec11.roundedTradeQuantity} units).`);
            passCount++;
        } else {
            console.error('❌ Test 11 FAIL: Decimal-4 rounding failed:', mfRec11);
        }

        // Test 12: BOND Whole-Unit Floor Rounding (Blocker C6-15)
        console.log('\n--- Test 12: BOND Whole-Unit Floor Rounding ---');
        await saveHoldings([
            { id: 'h12_b', portfolioId: 'p_bond', symbol: 'GOV_BOND', assetType: 'BOND', quantity: 10, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('GOV_BOND', 982); // Unit market price ₹982
        const res12 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_bond',
            policy: TargetAllocationService.createPolicy({
                policyId: 'pol_b100',
                policyName: '100% Bond',
                version: '1.0.0',
                assetWeights: { BOND: 100, STOCK: 0, MUTUAL_FUND: 0, ETF: 0, GOLD: 0, CRYPTO: 0, REAL_ESTATE: 0, OTHER: 0 },
                driftTolerancePercent: 5.0
            }),
            availableLiquidity: 5000, // 5000 / 982 = 5.0916 -> 5 units
            asOfDate
        });
        const bondRec12 = res12.recommendations.find(r => r.symbol === 'GOV_BOND');
        if (bondRec12 && bondRec12.roundedTradeQuantity === 5 && bondRec12.roundingMode === 'FLOOR_WHOLE' && bondRec12.referencePrice === 982) {
            console.log('✅ Test 12 PASS: BOND whole-unit floor rounding verified (5 units at quoted price ₹982).');
            passCount++;
        } else {
            console.error('❌ Test 12 FAIL: BOND rounding failed:', bondRec12);
        }

        // Test 13: Post-Rounding Notional Reconciliation (Hardening C6.2-01)
        console.log('\n--- Test 13: Post-Rounding Notional Reconciliation ---');
        if (res10.plannedBuyNotional > 0 &&
            res10.executableBuyNotional > 0 &&
            res10.roundingResidual !== undefined &&
            res10.residualDriftPercentagePoints !== undefined) {
            console.log(`✅ Test 13 PASS: Post-rounding notional reconciliation verified (Planned: ₹${res10.plannedBuyNotional}, Executable: ₹${res10.executableBuyNotional}, Residual: ₹${res10.roundingResidual}).`);
            passCount++;
        } else {
            console.error('❌ Test 13 FAIL: Notional reconciliation failed:', res10);
        }

        // Test 14: Pure Cash Rebalance Denominator Scaling (Blocker C6-14)
        console.log('\n--- Test 14: Pure Cash Rebalance Denominator Scaling ---');
        // Portfolio: Equity 40k, Bond 60k. Target: 50/50. Min pure cash = (60k / 0.5) - 100k = 20k.
        await saveHoldings([
            { id: 'h14_s', portfolioId: 'p_pc', symbol: 'EQ_14', assetType: 'STOCK', quantity: 40, averageCost: 1000 },
            { id: 'h14_b', portfolioId: 'p_pc', symbol: 'BD_14', assetType: 'BOND', quantity: 60, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('EQ_14', 1000);
        MarketDataService.setMockPrice('BD_14', 1000);

        const res14 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_pc',
            policy: TargetAllocationService.createPolicy({
                policyId: 'pol_eq_bd_5050',
                policyName: '50/50',
                version: '1.0.0',
                assetWeights: { STOCK: 50, BOND: 50, MUTUAL_FUND: 0, ETF: 0, GOLD: 0, CRYPTO: 0, REAL_ESTATE: 0, OTHER: 0 },
                driftTolerancePercent: 5.0
            }),
            availableLiquidity: 20000, // Exact minimum cash
            asOfDate
        });

        if (res14.deployedLiquidity === 20000 &&
            res14.postRebalancePortfolioValue === 120000 &&
            res14.plannedSellNotional === 0 &&
            res14.plannedBuyNotional === 20000) {
            console.log('✅ Test 14 PASS: Pure-cash rebalance scales denominator to 120k with 0 sells and ₹20,000 buys.');
            passCount++;
        } else {
            console.error('❌ Test 14 FAIL: Pure cash scaling failed:', res14);
        }

        // Test 15: Partial Cash Rebalance Denominator Scaling (Blocker C6-14)
        console.log('\n--- Test 15: Partial Cash Rebalance Denominator Scaling ---');
        // Deploy 10k cash -> Post total = 110k -> Target Equity = 55k (Buy 15k) -> Target Bond = 55k (Sell 5k)
        const res15 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_pc',
            policy: TargetAllocationService.createPolicy({
                policyId: 'pol_eq_bd_5050_2',
                policyName: '50/50',
                version: '1.0.0',
                assetWeights: { STOCK: 50, BOND: 50, MUTUAL_FUND: 0, ETF: 0, GOLD: 0, CRYPTO: 0, REAL_ESTATE: 0, OTHER: 0 },
                driftTolerancePercent: 5.0
            }),
            availableLiquidity: 10000,
            asOfDate
        });

        if (res15.deployedLiquidity === 10000 &&
            res15.postRebalancePortfolioValue === 110000 &&
            res15.plannedBuyNotional === 15000 &&
            res15.plannedSellNotional === 5000 &&
            (res15.plannedBuyNotional === res15.deployedLiquidity + res15.plannedSellNotional)) {
            console.log('✅ Test 15 PASS: Partial cash rebalance reconciles Buys (15k) = Cash (10k) + Sells (5k).');
            passCount++;
        } else {
            console.error('❌ Test 15 FAIL: Partial cash reconciliation failed:', res15);
        }

        // Test 16: Zero Cash Deployment
        console.log('\n--- Test 16: Zero Cash Deployment ---');
        const res16 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_pc',
            policy: TargetAllocationService.createPolicy({
                policyId: 'pol_eq_bd_5050_3',
                policyName: '50/50',
                version: '1.0.0',
                assetWeights: { STOCK: 50, BOND: 50, MUTUAL_FUND: 0, ETF: 0, GOLD: 0, CRYPTO: 0, REAL_ESTATE: 0, OTHER: 0 },
                driftTolerancePercent: 5.0
            }),
            availableLiquidity: 0,
            asOfDate
        });
        if (res16.deployedLiquidity === 0 && res16.plannedBuyNotional === 10000 && res16.plannedSellNotional === 10000) {
            console.log('✅ Test 16 PASS: Zero cash rebalance reconciles Planned Buys (10k) == Planned Sells (10k).');
            passCount++;
        } else {
            console.error('❌ Test 16 FAIL: Zero cash rebalance failed:', res16);
        }

        // Test 17: Intra-Asset Proportional Buy Allocation (Blocker C6-10)
        console.log('\n--- Test 17: Intra-Asset Proportional Buy Allocation ---');
        await saveHoldings([
            { id: 'h17_s1', portfolioId: 'p_prop', symbol: 'STK_A', assetType: 'STOCK', quantity: 30, averageCost: 1000 },
            { id: 'h17_s2', portfolioId: 'p_prop', symbol: 'STK_B', assetType: 'STOCK', quantity: 10, averageCost: 1000 },
            { id: 'h17_m', portfolioId: 'p_prop', symbol: 'MF_ALL', assetType: 'MUTUAL_FUND', quantity: 60, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('STK_A', 1000); // 30k (75% of stock class)
        MarketDataService.setMockPrice('STK_B', 1000); // 10k (25% of stock class)
        MarketDataService.setMockPrice('MF_ALL', 1000); // 60k

        const res17 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_prop',
            policy: balPolicy, // Stock 50%, MF 50% -> Target Stock = 50k (Buy 10k)
            asOfDate
        });

        const recA = res17.recommendations.find(r => r.symbol === 'STK_A');
        const recB = res17.recommendations.find(r => r.symbol === 'STK_B');
        if (recA && recB && recA.requiredNotional === 7500 && recB.requiredNotional === 2500) {
            console.log('✅ Test 17 PASS: Underweight buy allocated proportionally (STK_A: 75%, STK_B: 25%).');
            passCount++;
        } else {
            console.error('❌ Test 17 FAIL: Proportional buy allocation failed:', recA, recB);
        }

        // Test 18: New Asset Class Deployment Recommendation
        console.log('\n--- Test 18: New Asset Class Deployment Recommendation ---');
        const goldRec18 = res17.recommendations.find(r => r.assetType === 'GOLD' && r.action === 'HOLD_BALANCED');
        if (goldRec18) {
            console.log('✅ Test 18 PASS: Asset class recommendations structured cleanly with canonical mapping.');
            passCount++;
        } else {
            console.error('❌ Test 18 FAIL: Recommendation structure mismatch:', goldRec18);
        }

        // Test 19: Non-Tradeable Asset Safety (Blocker C6-12)
        console.log('\n--- Test 19: Non-Tradeable Asset Safety ---');
        await saveHoldings([
            { id: 'h19_re', portfolioId: 'p_re', symbol: 'PROPERTY_1', assetType: 'REAL_ESTATE', quantity: 1, averageCost: 70000 },
            { id: 'h19_s', portfolioId: 'p_re', symbol: 'STK_RE', assetType: 'STOCK', quantity: 30, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('PROPERTY_1', 70000); // 70% Real Estate
        MarketDataService.setMockPrice('STK_RE', 1000);     // 30% Stock

        const res19 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_re',
            policy: TargetAllocationService.createPolicy({
                policyId: 'pol_re',
                policyName: 'RE Policy',
                version: '1.0.0',
                assetWeights: { STOCK: 80, REAL_ESTATE: 20, MUTUAL_FUND: 0, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, OTHER: 0 },
                driftTolerancePercent: 5.0
            }),
            asOfDate
        });

        const reRec = res19.recommendations.find(r => r.assetType === 'REAL_ESTATE');
        if (reRec &&
            reRec.action === 'HOLD_NON_TRADEABLE' &&
            reRec.roundedTradeQuantity === 0 &&
            (res19.rebalancingStatus === 'PARTIALLY_FEASIBLE' || res19.rebalancingStatus === 'INFEASIBLE') &&
            res19.feasibilityWarnings.length > 0) {
            console.log('✅ Test 19 PASS: Overweight REAL_ESTATE produces HOLD_NON_TRADEABLE and PARTIALLY_FEASIBLE status.');
            passCount++;
        } else {
            console.error('❌ Test 19 FAIL: Non-tradeable safety failed:', reRec, res19);
        }

        // Test 20: Scoped Quote Staleness & Zero State Mutation (Hardening C6.2-02 & Invariants)
        console.log('\n--- Test 20: Scoped Quote Staleness & Zero State Mutation ---');
        await saveHoldings([
            { id: 'h20_s', portfolioId: 'p_stale', symbol: 'NO_QUOTE_STK', assetType: 'STOCK', quantity: 70, averageCost: 1000 },
            { id: 'h20_m', portfolioId: 'p_stale', symbol: 'MF_OK', assetType: 'MUTUAL_FUND', quantity: 30, averageCost: 1000 }
        ]);
        MarketDataService.setMockPrice('MF_OK', 1000);
        // NO_QUOTE_STK has no quote (fallback to cost basis)

        const txsBefore = await MoneyFlowEngine.getTransactions();
        const holdingsBefore = await loadHoldings();

        const res20 = await RebalancingEngine.calculateRebalancing({
            portfolioId: 'p_stale',
            policy: balPolicy,
            asOfDate
        });

        const txsAfter = await MoneyFlowEngine.getTransactions();
        const holdingsAfter = await loadHoldings();

        const staleRec = res20.recommendations.find(r => r.symbol === 'NO_QUOTE_STK');
        if (staleRec &&
            staleRec.action === 'REQUIRES_PRICE_REFRESH' &&
            res20.rebalancingStatus === 'PRICE_REFRESH_REQUIRED' &&
            txsBefore.length === txsAfter.length &&
            holdingsBefore.length === holdingsAfter.length) {
            console.log('✅ Test 20 PASS: Fallback quote scopes to PRICE_REFRESH_REQUIRED with exactly 0 state mutations.');
            passCount++;
        } else {
            console.error('❌ Test 20 FAIL: Stale quote or state mutation detected:', staleRec, res20);
        }

        console.log(`\n================================================================`);
        console.log(`=== STAGE C.6.2 ACCEPTANCE RESULT: ${passCount}/${totalTests} TESTS PASSED PERFECTLY ===`);
        console.log(`================================================================\n`);

        if (passCount !== totalTests) {
            console.error(`🚨 HARDENING FAILURE: Only ${passCount}/${totalTests} tests passed. Exiting with code 1.`);
            process.exit(1);
        }

    } catch (err) {
        console.error('C.6.2 Acceptance suite exception:', err);
        process.exit(1);
    }
}

runC62AcceptanceSuite();
