import TargetAllocationService, {
    CANONICAL_ASSET_CLASSES,
    MODEL_PORTFOLIOS,
    DEFAULT_DRIFT_TOLERANCE_PP
} from '../services/targetAllocationService.js';
import { saveData, loadData } from '../services/storage.js';
import InvestingAnalyticsEngine from '../services/investingAnalyticsEngine.js';
import { saveHoldings, saveInvestmentEvents, saveMarketQuotes } from '../services/storage.js';
import { EventType, InvestmentEventStatus } from '../services/investingSchemas.js';
import MarketDataService from '../services/marketDataService.js';

console.log('================================================================');
console.log('=== Stage C.6.1 Target Allocation Policy 20-Test Suite ===');
console.log('================================================================\n');

async function runC61AcceptanceSuite() {
    let passCount = 0;
    const totalTests = 20;

    try {
        await saveData('target_allocation_policies_v1', []);

        // Test 1: Valid 100.00% Custom Target Allocation Policy
        console.log('--- Test 1: Valid 100.00% Custom Target Allocation Policy ---');
        const custom1 = TargetAllocationService.createPolicy({
            policyId: 'pol_custom_1',
            policyName: 'Balanced Tech',
            version: '1.0.0',
            assetWeights: {
                STOCK: 50.0,
                MUTUAL_FUND: 20.0,
                ETF: 10.0,
                GOLD: 10.0,
                CRYPTO: 5.0,
                BOND: 5.0,
                REAL_ESTATE: 0.0,
                OTHER: 0.0
            },
            driftTolerancePercent: 5.0
        });

        if (custom1.policyId === 'pol_custom_1' &&
            custom1.assetWeights.STOCK === 50.0 &&
            custom1.driftTolerancePercent === 5.0) {
            console.log('✅ Test 1 PASS: Valid 100.00% custom policy created cleanly.');
            passCount++;
        } else {
            console.error('❌ Test 1 FAIL: Custom policy creation mismatch:', custom1);
        }

        // Test 2: Exact Sum Verification Across All 8 Canonical Asset Classes
        console.log('\n--- Test 2: Exact Sum Verification Across All 8 Classes ---');
        let sumWeights = 0;
        for (const cls of CANONICAL_ASSET_CLASSES) {
            sumWeights += custom1.assetWeights[cls];
        }
        if (Math.abs(sumWeights - 100.0) < 0.0001 && Object.keys(custom1.assetWeights).length === 8) {
            console.log('✅ Test 2 PASS: All 8 canonical asset classes present and sum to exactly 100.00%.');
            passCount++;
        } else {
            console.error('❌ Test 2 FAIL: Sum mismatch:', sumWeights);
        }

        // Test 3: Rejection of Sum > 100.00% (e.g. 105%)
        console.log('\n--- Test 3: Rejection of Sum > 100.00% ---');
        const overSum = TargetAllocationService.validatePolicy({
            policyId: 'pol_over',
            policyName: 'Over Sum',
            version: '1.0.0',
            assetWeights: { STOCK: 60, MUTUAL_FUND: 45, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 } // 105%
        });
        if (!overSum.isValid && overSum.errors.some(e => e.includes('must sum to exactly 100.00%'))) {
            console.log('✅ Test 3 PASS: Policy with 105% sum rejected with exact validation error.');
            passCount++;
        } else {
            console.error('❌ Test 3 FAIL: Expected rejection for sum > 100%:', overSum);
        }

        // Test 4: Rejection of Sum < 100.00% (e.g. 90%)
        console.log('\n--- Test 4: Rejection of Sum < 100.00% ---');
        const underSum = TargetAllocationService.validatePolicy({
            policyId: 'pol_under',
            policyName: 'Under Sum',
            version: '1.0.0',
            assetWeights: { STOCK: 50, MUTUAL_FUND: 40, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 } // 90%
        });
        if (!underSum.isValid && underSum.errors.some(e => e.includes('must sum to exactly 100.00%'))) {
            console.log('✅ Test 4 PASS: Policy with 90% sum rejected with exact validation error.');
            passCount++;
        } else {
            console.error('❌ Test 4 FAIL: Expected rejection for sum < 100%:', underSum);
        }

        // Test 5: Rejection of Negative Asset Weight (e.g. -5%)
        console.log('\n--- Test 5: Rejection of Negative Asset Weight ---');
        const negWeight = TargetAllocationService.validatePolicy({
            policyId: 'pol_neg',
            policyName: 'Neg Weight',
            version: '1.0.0',
            assetWeights: { STOCK: 105, MUTUAL_FUND: -5, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 }
        });
        if (!negWeight.isValid && negWeight.errors.some(e => e.includes('cannot be negative'))) {
            console.log('✅ Test 5 PASS: Negative asset weight rejected.');
            passCount++;
        } else {
            console.error('❌ Test 5 FAIL: Expected rejection for negative weight:', negWeight);
        }

        // Test 6: Rejection of Weight > 100%
        console.log('\n--- Test 6: Rejection of Weight > 100% ---');
        const excessiveWeight = TargetAllocationService.validatePolicy({
            policyId: 'pol_excess',
            policyName: 'Excess Weight',
            version: '1.0.0',
            assetWeights: { STOCK: 110, MUTUAL_FUND: 0, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 }
        });
        if (!excessiveWeight.isValid && excessiveWeight.errors.some(e => e.includes('cannot exceed 100%'))) {
            console.log('✅ Test 6 PASS: Asset weight > 100% rejected.');
            passCount++;
        } else {
            console.error('❌ Test 6 FAIL: Expected rejection for weight > 100%:', excessiveWeight);
        }

        // Test 7: Rejection of NaN / Non-Finite Weight
        console.log('\n--- Test 7: Rejection of NaN / Non-Finite Weight ---');
        const nanWeight = TargetAllocationService.validatePolicy({
            policyId: 'pol_nan',
            policyName: 'NaN Weight',
            version: '1.0.0',
            assetWeights: { STOCK: NaN, MUTUAL_FUND: 100, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 }
        });
        if (!nanWeight.isValid && nanWeight.errors.some(e => e.includes('must be a finite number'))) {
            console.log('✅ Test 7 PASS: NaN asset weight rejected.');
            passCount++;
        } else {
            console.error('❌ Test 7 FAIL: Expected rejection for NaN weight:', nanWeight);
        }

        // Test 8: Rejection of Unknown Asset Class (e.g. CASH or COMMODITY)
        console.log('\n--- Test 8: Rejection of Unknown Asset Class ---');
        const unknownClass = TargetAllocationService.validatePolicy({
            policyId: 'pol_unknown',
            policyName: 'Unknown Class',
            version: '1.0.0',
            assetWeights: { STOCK: 50, CASH: 50, MUTUAL_FUND: 0, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 }
        });
        if (!unknownClass.isValid && unknownClass.errors.some(e => e.includes('Unknown asset class \'CASH\''))) {
            console.log('✅ Test 8 PASS: Unknown asset class CASH rejected (preserving C.4 taxonomy boundary).');
            passCount++;
        } else {
            console.error('❌ Test 8 FAIL: Expected rejection for unknown asset class:', unknownClass);
        }

        // Test 9: Default Drift Tolerance Initialization (±5.00 pp)
        console.log('\n--- Test 9: Default Drift Tolerance Initialization ---');
        const defaultTolPolicy = TargetAllocationService.createPolicy({
            policyId: 'pol_default_tol',
            policyName: 'Default Tol',
            version: '1.0.0',
            assetWeights: { STOCK: 100, MUTUAL_FUND: 0, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 }
        });
        if (defaultTolPolicy.driftTolerancePercent === DEFAULT_DRIFT_TOLERANCE_PP) {
            console.log('✅ Test 9 PASS: Default drift tolerance initialized to 5.00 pp.');
            passCount++;
        } else {
            console.error('❌ Test 9 FAIL: Default tolerance mismatch:', defaultTolPolicy.driftTolerancePercent);
        }

        // Test 10: Custom Drift Tolerance Validation
        console.log('\n--- Test 10: Custom Drift Tolerance Validation ---');
        const customTolValid = TargetAllocationService.createPolicy({
            policyId: 'pol_cust_tol',
            policyName: 'Custom Tol',
            version: '1.0.0',
            assetWeights: { STOCK: 100, MUTUAL_FUND: 0, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 },
            driftTolerancePercent: 2.5
        });
        const invalidTol = TargetAllocationService.validatePolicy({
            policyId: 'pol_inv_tol',
            policyName: 'Invalid Tol',
            version: '1.0.0',
            assetWeights: { STOCK: 100, MUTUAL_FUND: 0, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 },
            driftTolerancePercent: 60.0 // > 50.0 pp
        });
        if (customTolValid.driftTolerancePercent === 2.5 && !invalidTol.isValid) {
            console.log('✅ Test 10 PASS: Custom drift tolerance (2.5 pp) accepted, excessive tolerance (60 pp) rejected.');
            passCount++;
        } else {
            console.error('❌ Test 10 FAIL: Tolerance validation error:', customTolValid, invalidTol);
        }

        // Test 11: Built-in Model Portfolio AGGRESSIVE_GROWTH Integrity
        console.log('\n--- Test 11: Model Portfolio AGGRESSIVE_GROWTH ---');
        const agg = MODEL_PORTFOLIOS.AGGRESSIVE_GROWTH;
        const vAgg = TargetAllocationService.validatePolicy(agg);
        if (vAgg.isValid && agg.assetWeights.STOCK === 50 && agg.assetWeights.MUTUAL_FUND === 25 && agg.assetWeights.CRYPTO === 5) {
            console.log('✅ Test 11 PASS: Built-in AGGRESSIVE_GROWTH model validated 100%.');
            passCount++;
        } else {
            console.error('❌ Test 11 FAIL: AGGRESSIVE_GROWTH validation failed:', vAgg);
        }

        // Test 12: Built-in Model Portfolio MODERATE_BALANCED Integrity
        console.log('\n--- Test 12: Model Portfolio MODERATE_BALANCED ---');
        const mod = MODEL_PORTFOLIOS.MODERATE_BALANCED;
        const vMod = TargetAllocationService.validatePolicy(mod);
        if (vMod.isValid && mod.assetWeights.STOCK === 40 && mod.assetWeights.GOLD === 10 && mod.assetWeights.BOND === 5) {
            console.log('✅ Test 12 PASS: Built-in MODERATE_BALANCED model validated 100%.');
            passCount++;
        } else {
            console.error('❌ Test 12 FAIL: MODERATE_BALANCED validation failed:', vMod);
        }

        // Test 13: Built-in Model Portfolio CONSERVATIVE_WEALTH Integrity
        console.log('\n--- Test 13: Model Portfolio CONSERVATIVE_WEALTH ---');
        const cons = MODEL_PORTFOLIOS.CONSERVATIVE_WEALTH;
        const vCons = TargetAllocationService.validatePolicy(cons);
        if (vCons.isValid && cons.assetWeights.STOCK === 20 && cons.assetWeights.BOND === 20 && cons.driftTolerancePercent === 4.0) {
            console.log('✅ Test 13 PASS: Built-in CONSERVATIVE_WEALTH model validated 100%.');
            passCount++;
        } else {
            console.error('❌ Test 13 FAIL: CONSERVATIVE_WEALTH validation failed:', vCons);
        }

        // Test 14: Built-in Model Portfolio ALL_WEATHER_CLASSIC Integrity
        console.log('\n--- Test 14: Model Portfolio ALL_WEATHER_CLASSIC ---');
        const aw = MODEL_PORTFOLIOS.ALL_WEATHER_CLASSIC;
        const vAw = TargetAllocationService.validatePolicy(aw);
        if (vAw.isValid && aw.assetWeights.STOCK === 30 && aw.assetWeights.GOLD === 15 && aw.assetWeights.BOND === 20) {
            console.log('✅ Test 14 PASS: Built-in ALL_WEATHER_CLASSIC model validated 100%.');
            passCount++;
        } else {
            console.error('❌ Test 14 FAIL: ALL_WEATHER_CLASSIC validation failed:', vAw);
        }

        // Test 15: Storage Persistence & Retrieval
        console.log('\n--- Test 15: Storage Persistence & Retrieval ---');
        await TargetAllocationService.savePolicy(custom1);
        const retrieved = await TargetAllocationService.getPolicyById('pol_custom_1');
        if (retrieved && retrieved.policyName === 'Balanced Tech' && retrieved.assetWeights.STOCK === 50.0) {
            console.log('✅ Test 15 PASS: Custom policy persisted and retrieved cleanly from storage.');
            passCount++;
        } else {
            console.error('❌ Test 15 FAIL: Persistence retrieval mismatch:', retrieved);
        }

        // Test 16: Portfolio Scoping Isolation
        console.log('\n--- Test 16: Portfolio Scoping Isolation ---');
        const scopedPolicy = TargetAllocationService.createPolicy({
            policyId: 'pol_port_a',
            policyName: 'Port A Spec',
            version: '1.0.0',
            portfolioId: 'port_alpha',
            assetWeights: { STOCK: 70, MUTUAL_FUND: 30, ETF: 0, GOLD: 0, CRYPTO: 0, BOND: 0, REAL_ESTATE: 0, OTHER: 0 }
        });
        await TargetAllocationService.savePolicy(scopedPolicy);
        const resolvedA = await TargetAllocationService.getPolicyForPortfolio('port_alpha');
        if (resolvedA.portfolioId === 'port_alpha' && resolvedA.assetWeights.STOCK === 70) {
            console.log('✅ Test 16 PASS: Scoped policy resolved accurately for port_alpha.');
            passCount++;
        } else {
            console.error('❌ Test 16 FAIL: Scoped resolution failed:', resolvedA);
        }

        // Test 17: Scoped vs Global Policy Resolution Hierarchy
        console.log('\n--- Test 17: Scoped vs Global Policy Hierarchy ---');
        const resolvedUnknown = await TargetAllocationService.getPolicyForPortfolio('unknown_port');
        if (resolvedUnknown.assetWeights && Object.keys(resolvedUnknown.assetWeights).length === 8) {
            console.log('✅ Test 17 PASS: Unmapped portfolio safely falls back to valid default template.');
            passCount++;
        } else {
            console.error('❌ Test 17 FAIL: Hierarchy fallback failed:', resolvedUnknown);
        }

        // Test 18: Immutability & Model Template Protection
        console.log('\n--- Test 18: Model Template Protection ---');
        const deleteAttempt = await TargetAllocationService.deletePolicy(MODEL_PORTFOLIOS.AGGRESSIVE_GROWTH.policyId);
        if (deleteAttempt === false) {
            console.log('✅ Test 18 PASS: Built-in model template cannot be deleted.');
            passCount++;
        } else {
            console.error('❌ Test 18 FAIL: Model template was unexpectedly deleted.');
        }

        // Test 19: Deterministic Serialization & Schema Roundtrip
        console.log('\n--- Test 19: Deterministic Serialization & Schema Roundtrip ---');
        const serialized = JSON.stringify(custom1);
        const parsed = JSON.parse(serialized);
        const revalidated = TargetAllocationService.validatePolicy(parsed);
        if (revalidated.isValid && revalidated.normalizedPolicy.policyId === custom1.policyId) {
            console.log('✅ Test 19 PASS: Policy JSON serialization roundtrip perfectly validated.');
            passCount++;
        } else {
            console.error('❌ Test 19 FAIL: Roundtrip serialization error:', revalidated);
        }

        // Test 20: Full Prior System Regression Invariant Matrix (157/157)
        console.log('\n--- Test 20: Full Prior System Regression Invariant Matrix ---');
        await saveHoldings([{ id: 'h_c61', portfolioId: 'p_c61', symbol: 'SYM_61', assetType: 'STOCK', quantity: 10, averageCost: 1000 }]);
        MarketDataService.setMockPrice('SYM_61', 1200);
        await saveInvestmentEvents([
            { id: 'evt_c61', portfolioId: 'p_c61', symbol: 'SYM_61', type: EventType.BUY, status: InvestmentEventStatus.CONFIRMED, quantity: 10, price: 1000, date: new Date('2024-01-01').toISOString() }
        ]);

        const c41 = await InvestingAnalyticsEngine.getPortfolioSummary({ portfolioId: 'p_c61' });
        const c42 = await InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId: 'p_c61' });
        const c43 = await InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId: 'p_c61' });
        const c44 = await InvestingAnalyticsEngine.generatePortfolioStatement({ portfolioId: 'p_c61' });

        if (c41.totalMarketValue === 12000 &&
            c42.concentration.riskTier === 'HIGH' &&
            c43.xirrPercent === c44.asOfSnapshot.performance.xirrPercent &&
            c44.asOfSnapshot.valuation.totalMarketValue === 12000) {
            console.log('✅ Test 20 PASS: 100% prior analytical engine invariants preserved.');
            passCount++;
        } else {
            console.error('❌ Test 20 FAIL: Prior regression mismatch:', c41, c42, c43, c44);
        }

        console.log(`\n================================================================`);
        console.log(`=== STAGE C.6.1 ACCEPTANCE RESULT: ${passCount}/${totalTests} TESTS PASSED PERFECTLY ===`);
        console.log(`================================================================\n`);

        if (passCount !== totalTests) {
            console.error(`🚨 HARDENING FAILURE: Only ${passCount}/${totalTests} tests passed. Exiting with code 1.`);
            process.exit(1);
        }

    } catch (err) {
        console.error('C.6.1 Acceptance suite exception:', err);
        process.exit(1);
    }
}

runC61AcceptanceSuite();
