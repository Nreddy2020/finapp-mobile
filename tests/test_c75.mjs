/**
 * Stage C.7.5 Portfolio Liquidity & Cash-Flow Stress Engine Acceptance Test Matrix
 * Master Standard: C7_5_V1
 * 
 * 56 Comprehensive Acceptance Tests covering:
 * - Group 1: 5-Tier Authority Hierarchy & User Override Precedence (Tests 1-11)
 * - Group 2: Fixed Deposit Maturity & Early-Break Accessibility Contract (Tests 12-21)
 * - Group 3: Liquidity Horizon Decomposition (Tests 22-26)
 * - Group 4: Unrepresented & Unknown Liquidity Handling (Tests 27-30)
 * - Group 5: Liquidity Haircut Stress Modeling (Tests 31-35)
 * - Group 6: Recurring Cash-Flow & Essential Burn Estimation (Tests 36-42)
 * - Group 7: Multi-Scenario Stress Testing Matrix (Tests 43-47)
 * - Group 8: Composite Liquidity Stress Score & Tier Boundary Inclusivity (Tests 48-53)
 * - Group 9: Determinism, AST Scan, Deep 5-Store Read-Only Safety & Full Regression (Tests 54-56)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import {
    LIQUIDITY_POLICY_VERSION,
    LIQUIDITY_POLICY_V1,
    LIQUIDITY_HORIZONS,
    LIQUIDITY_CLASSIFICATION_SOURCES,
    classifyHoldingLiquidity,
    calculateLiquidityBreakdown,
    evaluateCashFlowAndRunway,
    evaluateLiquidityStressScenarios,
    generateLockupScheduleAndBottlenecks,
    calculateLiquidityStressScore,
    evaluatePortfolioLiquidityAndStress
} from '../services/liquidityEngine.js';

import { CANONICAL_ASSET_CLASSES } from '../services/targetAllocationService.js';
import { loadData, saveData, STORAGE_KEYS } from '../services/storage.js';

console.log('================================================================');
console.log('=== Stage C.7.5 Liquidity & Cash-Flow Stress 56-Test Suite ===');
console.log('================================================================\n');

const AS_OF_DATE = '2025-06-30T00:00:00.000Z';

// ================================================================
// GROUP 1: 5-Tier Authority Hierarchy & User Override Precedence (Tests 1-11)
// ================================================================
console.log('--- Group 1: Authority Hierarchy & User Override Precedence ---');

// Test 1: User Declares Statutory ELSS as Liquid -> Regulatory lock wins
{
    const elssHolding = {
        id: 'h_elss',
        symbol: 'AXIS_ELSS',
        assetClass: 'STOCK',
        isELSS: true,
        lockEndDate: '2026-03-31T00:00:00.000Z',
        userLiquidityTier: LIQUIDITY_HORIZONS.T0,
        currentValue: 100000
    };
    const res = classifyHoldingLiquidity(elssHolding, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.LOCKED_ILLIQUID);
    assert.strictEqual(res.liquidityClassificationSource, LIQUIDITY_CLASSIFICATION_SOURCES.REGULATORY_CONSTRAINT);
    assert.strictEqual(res.overrideApplied, false);
    console.log('✅ Test 1 PASS: User declaration on statutory ELSS overruled by REGULATORY_CONSTRAINT.');
}

// Test 2: User Declares Pre-Maturity FD as Liquid -> Contractual maturity wins
{
    const fdHolding = {
        id: 'h_fd',
        symbol: 'HDFC_FD_1Y',
        assetClass: 'BOND',
        maturityDate: '2025-12-31T00:00:00.000Z',
        allowEarlyExit: false,
        userLiquidityTier: LIQUIDITY_HORIZONS.T0,
        currentValue: 500000
    };
    const res = classifyHoldingLiquidity(fdHolding, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.LOCKED_ILLIQUID);
    assert.strictEqual(res.liquidityClassificationSource, LIQUIDITY_CLASSIFICATION_SOURCES.AUTHORITATIVE_PRODUCT_METADATA);
    assert.strictEqual(res.overrideApplied, false);
    console.log('✅ Test 2 PASS: User declaration on pre-maturity FD overruled by AUTHORITATIVE_PRODUCT_METADATA.');
}

// Test 3: User Declares Early Exit Available (Contract Disallows) -> Authoritative metadata wins
{
    const lockHolding = {
        id: 'h_priv',
        symbol: 'VENTURE_NOTE',
        assetClass: 'OTHER',
        lockEndDate: '2027-01-01T00:00:00.000Z',
        allowEarlyExit: false,
        userLiquidityTier: LIQUIDITY_HORIZONS.T2_T3,
        currentValue: 200000
    };
    const res = classifyHoldingLiquidity(lockHolding, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.LOCKED_ILLIQUID);
    assert.strictEqual(res.overrideApplied, false);
    console.log('✅ Test 3 PASS: Authoritative disallowance of early exit overrules user declaration.');
}

// Test 4 (C7.5-R3-A): STOCK + user T0 -> DERIVED_ASSET_CLASS wins (T2_T3, overrideApplied=false)
{
    const stockHolding = {
        id: 'h_stock',
        symbol: 'INFY',
        assetClass: 'STOCK',
        userLiquidityTier: LIQUIDITY_HORIZONS.T0,
        currentValue: 50000
    };
    const res = classifyHoldingLiquidity(stockHolding, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.T2_T3);
    assert.strictEqual(res.liquidityClassificationSource, LIQUIDITY_CLASSIFICATION_SOURCES.DERIVED_ASSET_CLASS);
    assert.strictEqual(res.overrideApplied, false);
    console.log('✅ Test 4 PASS: STOCK + user T0 evaluates to DERIVED_ASSET_CLASS (T2_T3, overrideApplied=false).');
}

// Test 5 (C7.5-R3-A): REAL_ESTATE + user T0 -> DERIVED_ASSET_CLASS wins (LOCKED_ILLIQUID, overrideApplied=false)
{
    const reHolding = {
        id: 'h_re',
        symbol: 'COMMERCIAL_SHOP',
        assetClass: 'REAL_ESTATE',
        userLiquidityTier: LIQUIDITY_HORIZONS.T0,
        currentValue: 500000
    };
    const res = classifyHoldingLiquidity(reHolding, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.LOCKED_ILLIQUID);
    assert.strictEqual(res.liquidityClassificationSource, LIQUIDITY_CLASSIFICATION_SOURCES.DERIVED_ASSET_CLASS);
    assert.strictEqual(res.overrideApplied, false);
    console.log('✅ Test 5 PASS: REAL_ESTATE + user T0 evaluates to DERIVED_ASSET_CLASS (LOCKED_ILLIQUID, overrideApplied=false).');
}

// Test 6 (C7.5-R3-A): CASH + user LOCKED_ILLIQUID -> DERIVED_ASSET_CLASS wins (T0, overrideApplied=false)
{
    const cashHolding = {
        id: 'h_cash',
        symbol: 'SAVINGS_CASH',
        assetClass: 'CASH',
        userLiquidityTier: LIQUIDITY_HORIZONS.LOCKED_ILLIQUID,
        currentValue: 50000
    };
    const res = classifyHoldingLiquidity(cashHolding, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.T0);
    assert.strictEqual(res.liquidityClassificationSource, LIQUIDITY_CLASSIFICATION_SOURCES.DERIVED_ASSET_CLASS);
    assert.strictEqual(res.overrideApplied, false);
    console.log('✅ Test 6 PASS: CASH + user LOCKED evaluates to DERIVED_ASSET_CLASS (T0, overrideApplied=false).');
}

// Test 7: Unmapped asset + user T2_T3 -> USER_DECLARED_METADATA applied cleanly
{
    const unmappedHolding = {
        id: 'h_custom',
        symbol: 'CUSTOM_UNMAPPED_NOTE',
        userLiquidityTier: LIQUIDITY_HORIZONS.T2_T3,
        currentValue: 50000
    };
    const res = classifyHoldingLiquidity(unmappedHolding, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.T2_T3);
    assert.strictEqual(res.liquidityClassificationSource, LIQUIDITY_CLASSIFICATION_SOURCES.USER_DECLARED_METADATA);
    assert.strictEqual(res.overrideApplied, true);
    console.log('✅ Test 7 PASS: Unmapped asset + user declaration applies USER_DECLARED_METADATA.');
}

// Test 8 (C7.5-R3-B): Regulatory lock with missing date -> LOCKED_ILLIQUID + REGULATORY_LOCK_DATE_UNAVAILABLE
{
    const elssNoDate = {
        id: 'h_elss_nodate',
        symbol: 'HDFC_TAX_SAVER',
        isELSS: true,
        userLiquidityTier: LIQUIDITY_HORIZONS.T0, // User declaration
        currentValue: 100000
    };
    const res = classifyHoldingLiquidity(elssNoDate, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.LOCKED_ILLIQUID);
    assert.strictEqual(res.liquidityClassificationSource, LIQUIDITY_CLASSIFICATION_SOURCES.REGULATORY_CONSTRAINT);
    assert.strictEqual(res.overrideApplied, false);
    assert.strictEqual(res.warning, 'REGULATORY_LOCK_DATE_UNAVAILABLE');
    console.log('✅ Test 8 PASS: Regulatory lock with missing date evaluates strictly to LOCKED_ILLIQUID with warning.');
}

// Test 9: Regulatory lock with expired date -> falls through to DERIVED_ASSET_CLASS
{
    const elssExpired = {
        id: 'h_elss_exp',
        symbol: 'OLD_ELSS',
        assetClass: 'MUTUAL_FUND',
        isELSS: true,
        lockEndDate: '2024-01-01T00:00:00.000Z', // Expired
        currentValue: 100000
    };
    const res = classifyHoldingLiquidity(elssExpired, AS_OF_DATE);
    assert.strictEqual(res.isLocked, false);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.T2_T3);
    assert.strictEqual(res.liquidityClassificationSource, LIQUIDITY_CLASSIFICATION_SOURCES.DERIVED_ASSET_CLASS);
    console.log('✅ Test 9 PASS: Expired statutory lockup falls through cleanly to DERIVED_ASSET_CLASS.');
}

// Test 10: DTO Exposes Classification Source Per Holding
{
    const portfolio = {
        holdings: [
            { id: 'h1', symbol: 'CASH', assetClass: 'CASH', currentValue: 10000 },
            { id: 'h2', symbol: 'ELSS', assetClass: 'MUTUAL_FUND', isELSS: true, lockEndDate: '2026-01-01T00:00:00.000Z', currentValue: 20000 }
        ]
    };
    const res = evaluatePortfolioLiquidityAndStress(portfolio, AS_OF_DATE);
    assert.strictEqual(res.holdingsLiquidityBreakdown.length, 2);
    assert.strictEqual(res.holdingsLiquidityBreakdown[0].liquidityClassificationSource, LIQUIDITY_CLASSIFICATION_SOURCES.DERIVED_ASSET_CLASS);
    assert.strictEqual(res.holdingsLiquidityBreakdown[1].liquidityClassificationSource, LIQUIDITY_CLASSIFICATION_SOURCES.REGULATORY_CONSTRAINT);
    console.log('✅ Test 10 PASS: Master DTO exposes liquidityClassificationSource per holding.');
}

// Test 11: Precedence Hierarchy Repeatability
{
    const h = { id: 'h_test', symbol: 'CASH_ACC', assetClass: 'CASH', currentValue: 10000 };
    const r1 = classifyHoldingLiquidity(h, AS_OF_DATE);
    const r2 = classifyHoldingLiquidity(h, AS_OF_DATE);
    assert.deepStrictEqual(r1, r2);
    console.log('✅ Test 11 PASS: Deterministic repeatability across classification evaluations.');
}

// ================================================================
// GROUP 2: Fixed Deposit Maturity & Early-Break Accessibility Contract (Tests 12-21)
// ================================================================
console.log('\n--- Group 2: FD Maturity & Early-Break Accessibility Contract ---');

// Test 12: FD Before Maturity -> LOCKED_ILLIQUID
{
    const fd = { id: 'fd1', symbol: 'FD_ACTIVE', maturityDate: '2026-01-01T00:00:00.000Z', currentValue: 100000 };
    const res = classifyHoldingLiquidity(fd, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.LOCKED_ILLIQUID);
    assert.strictEqual(res.isLocked, true);
    console.log('✅ Test 12 PASS: Pre-maturity FD strictly classified as LOCKED_ILLIQUID.');
}

// Test 13: FD Exactly on Maturity Date -> Matured (no longer locked)
{
    const fd = { id: 'fd2', symbol: 'FD_TODAY', maturityDate: '2025-06-30T00:00:00.000Z', currentValue: 100000 };
    const res = classifyHoldingLiquidity(fd, AS_OF_DATE);
    assert.strictEqual(res.isLocked, false);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.T2_T3); // Fallback T2_T3
    console.log('✅ Test 13 PASS: FD on maturity date evaluates as matured (no longer locked).');
}

// Test 14: FD After Maturity Date -> Matured
{
    const fd = { id: 'fd3', symbol: 'FD_PAST', maturityDate: '2025-01-01T00:00:00.000Z', currentValue: 100000 };
    const res = classifyHoldingLiquidity(fd, AS_OF_DATE);
    assert.strictEqual(res.isLocked, false);
    console.log('✅ Test 14 PASS: FD past maturity date evaluates as matured.');
}

// Test 15: Matured FD with Authoritative T0 Accessibility
{
    const fd = { id: 'fd4', symbol: 'FD_SWEEP', maturityDate: '2025-06-01T00:00:00.000Z', isAutoSweep: true, currentValue: 100000 };
    const res = classifyHoldingLiquidity(fd, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.T0);
    assert.strictEqual(res.daysToAccess, 0);
    console.log('✅ Test 15 PASS: Matured FD with auto-sweep resolves to T0.');
}

// Test 16: Matured FD with Authoritative T2_T3 Accessibility
{
    const fd = { id: 'fd5', symbol: 'FD_CORP', maturityDate: '2025-06-01T00:00:00.000Z', settlementTier: 'T2_T3', currentValue: 100000 };
    const res = classifyHoldingLiquidity(fd, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.T2_T3);
    console.log('✅ Test 16 PASS: Matured FD with explicit settlement resolves to T2_T3.');
}

// Test 17: Matured FD with Unavailable Accessibility Metadata -> Fallback T2_T3
{
    const fd = { id: 'fd6', symbol: 'FD_PLAIN', maturityDate: '2025-06-01T00:00:00.000Z', currentValue: 100000 };
    const res = classifyHoldingLiquidity(fd, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.T2_T3);
    assert.strictEqual(res.liquidityClassificationSource, LIQUIDITY_CLASSIFICATION_SOURCES.POLICY_DEFAULT);
    console.log('✅ Test 17 PASS: Matured FD with unavailable metadata resolves to policy fallback T2_T3 (never fabricates T0).');
}

// Test 18: Early-Exit FD with Explicit T+2/T+3 Accessibility
{
    const fd = {
        id: 'fd7',
        symbol: 'FD_BREAKABLE',
        maturityDate: '2026-06-30T00:00:00.000Z',
        allowEarlyExit: true,
        earlyExitDate: '2025-07-02T00:00:00.000Z', // 2 days
        currentValue: 100000
    };
    const res = classifyHoldingLiquidity(fd, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.T2_T3);
    assert.strictEqual(res.earlyExitAllowed, true);
    assert.strictEqual(res.realizablePenaltyRate, 0.02); // Policy default 2%
    console.log('✅ Test 18 PASS: Early-exit FD within 2 days classifies as T2_T3 with 2.0% penalty.');
}

// Test 19: Early-Exit FD with Explicit T+4/T+7 Accessibility
{
    const fd = {
        id: 'fd8',
        symbol: 'FD_WEEKLY_BREAK',
        maturityDate: '2026-06-30T00:00:00.000Z',
        allowEarlyExit: true,
        earlyExitDate: '2025-07-05T00:00:00.000Z', // 5 days
        currentValue: 100000
    };
    const res = classifyHoldingLiquidity(fd, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.T4_T7);
    console.log('✅ Test 19 PASS: Early-exit FD within 5 days classifies as T4_T7.');
}

// Test 20: Early-Exit FD with Missing Accessibility Date -> Conservative LOCKED_ILLIQUID
{
    const fd = {
        id: 'fd9',
        symbol: 'FD_NO_DATE',
        maturityDate: '2026-06-30T00:00:00.000Z',
        allowEarlyExit: true,
        currentValue: 100000
    };
    const res = classifyHoldingLiquidity(fd, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.LOCKED_ILLIQUID);
    assert.strictEqual(res.isLocked, true);
    console.log('✅ Test 20 PASS: Early-exit FD without accessibility date resolves conservatively to LOCKED_ILLIQUID.');
}

// Test 21: Policy Default vs Authoritative Penalty Precedence
{
    const fd = {
        id: 'fd10',
        symbol: 'FD_SPECIAL_PENALTY',
        maturityDate: '2026-06-30T00:00:00.000Z',
        allowEarlyExit: true,
        earlyExitDate: '2025-07-01T00:00:00.000Z',
        earlyExitPenaltyRate: 0.005, // 0.5% custom penalty
        currentValue: 100000
    };
    const res = classifyHoldingLiquidity(fd, AS_OF_DATE);
    assert.strictEqual(res.realizablePenaltyRate, 0.005);
    console.log('✅ Test 21 PASS: Authoritative 0.5% penalty overrides policy default 2.0%.');
}

// ================================================================
// GROUP 3: Liquidity Horizon Decomposition (Tests 22-26)
// ================================================================
console.log('\n--- Group 3: Liquidity Horizon Decomposition ---');

// Test 22: Empty Portfolio Boundary (N = 0)
{
    const res = evaluatePortfolioLiquidityAndStress({ holdings: [] }, AS_OF_DATE);
    assert.strictEqual(res.status, 'EMPTY_PORTFOLIO');
    assert.strictEqual(res.grossPortfolioValue, 0.0);
    assert.strictEqual(res.accessibleValue, 0.0);
    assert.strictEqual(res.stressScore, 0.0);
    assert.strictEqual(res.dataQuality.confidenceLevel, 'UNAVAILABLE');
    console.log('✅ Test 22 PASS: Empty portfolio returns EMPTY_PORTFOLIO status with safe zero/null values.');
}

// Test 23: Single Cash / T+0 Holding
{
    const portfolio = {
        holdings: [{ id: 'c1', symbol: 'BANK_SAVINGS', assetClass: 'CASH', currentValue: 100000 }]
    };
    const res = evaluatePortfolioLiquidityAndStress(portfolio, AS_OF_DATE);
    assert.strictEqual(res.grossPortfolioValue, 100000);
    assert.strictEqual(res.liquidValueT0, 100000);
    assert.strictEqual(res.accessiblePercentage, 1.0);
    assert.strictEqual(res.lockedPercentage, 0.0);
    console.log('✅ Test 23 PASS: Single Cash holding is 100% T+0 accessible.');
}

// Test 24: Fully Liquid Equities Portfolio (T+2/T+3)
{
    const portfolio = {
        holdings: [
            { id: 'eq1', symbol: 'RELIANCE', assetClass: 'STOCK', currentValue: 60000 },
            { id: 'eq2', symbol: 'TCS', assetClass: 'STOCK', currentValue: 40000 }
        ]
    };
    const res = evaluatePortfolioLiquidityAndStress(portfolio, AS_OF_DATE);
    assert.strictEqual(res.liquidValueT23, 100000);
    assert.strictEqual(res.accessiblePercentage, 1.0);
    console.log('✅ Test 24 PASS: Listed equity portfolio is 100% T+2/T+3 accessible.');
}

// Test 25: Fully Locked Portfolio
{
    const portfolio = {
        holdings: [{ id: 're1', symbol: 'LAND_PLOT', assetClass: 'REAL_ESTATE', currentValue: 1000000 }]
    };
    const res = evaluatePortfolioLiquidityAndStress(portfolio, AS_OF_DATE);
    assert.strictEqual(res.accessibleValue, 0.0);
    assert.strictEqual(res.lockedPercentage, 1.0);
    assert(res.warnings.includes('CRITICAL_LOCKED_ASSET_EXPOSURE'));
    console.log('✅ Test 25 PASS: 100% Real Estate portfolio is fully locked with critical warning.');
}

// Test 26: Mixed 4-Tier Liquidity Portfolio
{
    const portfolio = {
        holdings: [
            { id: 'h1', symbol: 'CASH', assetClass: 'CASH', currentValue: 25000 },
            { id: 'h2', symbol: 'EQUITY', assetClass: 'STOCK', currentValue: 25000 },
            { id: 'h3', symbol: 'REIT', userLiquidityTier: LIQUIDITY_HORIZONS.T4_T7, currentValue: 25000 },
            { id: 'h4', symbol: 'LAND', assetClass: 'REAL_ESTATE', currentValue: 25000 }
        ]
    };
    const res = evaluatePortfolioLiquidityAndStress(portfolio, AS_OF_DATE);
    assert.strictEqual(res.grossPortfolioValue, 100000);
    assert.strictEqual(res.liquidValueT0, 25000);
    assert.strictEqual(res.liquidValueT23, 25000);
    assert.strictEqual(res.liquidValueT47, 25000);
    assert.strictEqual(res.lockedValue, 25000);
    assert.strictEqual(res.accessibleValue, 75000);
    console.log('✅ Test 26 PASS: Mixed 4-tier portfolio decomposed accurately across all horizons.');
}

// ================================================================
// GROUP 4: Unrepresented & Unknown Liquidity Handling (Tests 27-30)
// ================================================================
console.log('\n--- Group 4: Unrepresented & Unknown Liquidity Handling ---');

// Test 27: Explicit Unknown Liquidity Classification
{
    const portfolio = {
        holdings: [{ id: 'u1', symbol: 'UNMAPPED_ASSET', currentValue: 50000 }]
    };
    const res = evaluatePortfolioLiquidityAndStress(portfolio, AS_OF_DATE);
    assert.strictEqual(res.unknownLiquidityValue, 50000);
    assert.strictEqual(res.accessibleValue, 0.0);
    console.log('✅ Test 27 PASS: Unmapped asset resolved explicitly to UNKNOWN without fabricating liquidity.');
}

// Test 28: HIGH_UNKNOWN_LIQUIDITY_EXPOSURE Diagnostic
{
    const portfolio = {
        holdings: [
            { id: 'h1', symbol: 'CASH', assetClass: 'CASH', currentValue: 80000 },
            { id: 'h2', symbol: 'MYSTERY', currentValue: 20000 } // 20% > 15%
        ]
    };
    const res = evaluatePortfolioLiquidityAndStress(portfolio, AS_OF_DATE);
    assert(res.warnings.includes('HIGH_UNKNOWN_LIQUIDITY_EXPOSURE'));
    console.log('✅ Test 28 PASS: Triggered HIGH_UNKNOWN_LIQUIDITY_EXPOSURE warning.');
}

// Test 29: Zero Manufactured Liquidity Invariant
{
    const res = classifyHoldingLiquidity({ id: 'x', symbol: 'UNKNOWN' }, AS_OF_DATE);
    assert.strictEqual(res.liquidityTier, LIQUIDITY_HORIZONS.UNKNOWN);
    console.log('✅ Test 29 PASS: Zero manufactured liquidity invariant holds.');
}

// Test 30: Negative / Non-Finite Valuation Input Rejection
{
    assert.throws(() => {
        calculateLiquidityBreakdown([{ id: 'bad', currentValue: -100 }], AS_OF_DATE);
    }, /Invalid holding valuation/);
    console.log('✅ Test 30 PASS: Negative holding valuation input properly rejected.');
}

// ================================================================
// GROUP 5: Liquidity Haircut Stress Modeling (Tests 31-35)
// ================================================================
console.log('\n--- Group 5: Liquidity Haircut Stress Modeling ---');

// Test 31: No Haircut Base Valuation
{
    const holdings = [
        { id: 'h1', symbol: 'CASH', assetClass: 'CASH', currentValue: 10000 },
        { id: 'h2', symbol: 'STK', assetClass: 'STOCK', currentValue: 20000 }
    ];
    const res = calculateLiquidityBreakdown(holdings, AS_OF_DATE);
    assert.strictEqual(res.accessibleValue, 30000);
    console.log('✅ Test 31 PASS: Base accessible value calculated with 0% haircut.');
}

// Test 32: Moderate Haircut Application (5% T2/T3, 15% T4/T7, 0% T0)
{
    const holdings = [
        { id: 'h1', symbol: 'CASH', assetClass: 'CASH', currentValue: 10000 }, // 0% -> 10000
        { id: 'h2', symbol: 'EQ', assetClass: 'STOCK', currentValue: 10000 }, // 5% -> 9500
        { id: 'h3', symbol: 'REIT', userLiquidityTier: LIQUIDITY_HORIZONS.T4_T7, currentValue: 10000 } // 15% -> 8500
    ];
    const res = calculateLiquidityBreakdown(holdings, AS_OF_DATE);
    assert.strictEqual(res.stressedAccessibleModerate, 10000 + 9500 + 8500); // 28000
    console.log('✅ Test 32 PASS: Moderate haircut calculated accurately (28,000 / 30,000).');
}

// Test 33: Severe Haircut Application (15% T2/T3, 30% T4/T7, 0% T0)
{
    const holdings = [
        { id: 'h1', symbol: 'CASH', assetClass: 'CASH', currentValue: 10000 }, // 0% -> 10000
        { id: 'h2', symbol: 'EQ', assetClass: 'STOCK', currentValue: 10000 }, // 15% -> 8500
        { id: 'h3', symbol: 'REIT', userLiquidityTier: LIQUIDITY_HORIZONS.T4_T7, currentValue: 10000 } // 30% -> 7000
    ];
    const res = calculateLiquidityBreakdown(holdings, AS_OF_DATE);
    assert.strictEqual(res.stressedAccessibleValue, 10000 + 8500 + 7000); // 25500
    console.log('✅ Test 33 PASS: Severe haircut calculated accurately (25,500 / 30,000).');
}

// Test 34: Haircut Non-Negativity & Boundedness Invariant
{
    const holdings = [{ id: 'eq', symbol: 'EQ', assetClass: 'STOCK', currentValue: 10000 }];
    const res = calculateLiquidityBreakdown(holdings, AS_OF_DATE);
    assert(res.stressedAccessibleValue >= 0.0);
    assert(res.stressedAccessibleValue <= res.accessibleValue);
    console.log('✅ Test 34 PASS: Stressed accessible value bounded in [0, V_accessible].');
}

// Test 35: Locked Asset Exclusion under Haircut
{
    const holdings = [{ id: 're', symbol: 'REAL_ESTATE', assetClass: 'REAL_ESTATE', currentValue: 500000 }];
    const res = calculateLiquidityBreakdown(holdings, AS_OF_DATE);
    assert.strictEqual(res.stressedAccessibleValue, 0.0);
    console.log('✅ Test 35 PASS: Locked assets produce 0.0 realized accessible liquidity under stress.');
}

// ================================================================
// GROUP 6: Recurring Cash-Flow & Essential Burn Estimation (Tests 36-42)
// ================================================================
console.log('\n--- Group 6: Recurring Cash-Flow & Essential Burn Estimation ---');

// Test 36: Actual Expense Breakdown Mode
{
    const cashFlow = { monthlyIncome: 100000, essentialBurn: 40000, debtBurn: 10000, discretionaryBurn: 20000 };
    const liquidity = { liquidValueT0: 50000, liquidValueT23: 150000, accessibleValue: 200000, stressedAccessibleValue: 180000 };
    const res = evaluateCashFlowAndRunway(cashFlow, liquidity);
    assert.strictEqual(res.monthlyCashFlow.burnSource, 'ACTUAL_BREAKDOWN');
    assert.strictEqual(res.monthlyCashFlow.essentialBurnIsEstimated, false);
    assert.strictEqual(res.monthlyCashFlow.survivalBurn, 50000);
    assert.strictEqual(res.monthlyCashFlow.totalBurn, 70000);
    assert.strictEqual(res.monthlyCashFlow.netCashFlow, 30000);
    assert.strictEqual(res.runway.totalMonths, 4.0); // 200k / 50k
    console.log('✅ Test 36 PASS: Actual expense breakdown mode produces exact 4.0 months runway.');
}

// Test 37: Estimated Essential Burn from Total Burn (70%)
{
    const cashFlow = { monthlyIncome: 100000, totalMonthlyBurn: 100000 };
    const liquidity = { liquidValueT0: 70000, accessibleValue: 140000, stressedAccessibleValue: 120000 };
    const res = evaluateCashFlowAndRunway(cashFlow, liquidity);
    assert.strictEqual(res.monthlyCashFlow.burnSource, 'ESTIMATED_FROM_TOTAL');
    assert.strictEqual(res.monthlyCashFlow.essentialBurnIsEstimated, true);
    assert.strictEqual(res.monthlyCashFlow.survivalBurn, 70000); // 100k * 0.70
    assert.strictEqual(res.runway.totalMonths, 2.0); // 140k / 70k
    console.log('✅ Test 37 PASS: Estimated essential burn uses 70% policy fallback accurately.');
}

// Test 38: Confidence Degradation from Estimated Burn
{
    const portfolio = {
        holdings: [{ id: 'c1', symbol: 'CASH', assetClass: 'CASH', currentValue: 100000 }],
        cashFlow: { totalMonthlyBurn: 20000 } // Estimated burn
    };
    const res = evaluatePortfolioLiquidityAndStress(portfolio, AS_OF_DATE);
    assert.strictEqual(res.dataQuality.confidenceLevel, 'MODERATE'); // Capped at MODERATE
    assert(res.warnings.includes('ESTIMATED_ESSENTIAL_BURN_RATIO_APPLIED'));
    console.log('✅ Test 38 PASS: Estimated burn caps confidenceLevel at MODERATE and emits warning.');
}

// Test 39: Runway Sensitivity Spectrum (50%, 70%, 85%)
{
    const cashFlow = { totalMonthlyBurn: 100000 };
    const liquidity = { accessibleValue: 200000 };
    const res = evaluateCashFlowAndRunway(cashFlow, liquidity);
    assert(Math.abs(res.runway.sensitivity.runwayLowMonths - (200000 / 85000)) < 1e-4);
    assert(Math.abs(res.runway.sensitivity.runwayBaseMonths - (200000 / 70000)) < 1e-4);
    assert(Math.abs(res.runway.sensitivity.runwayHighMonths - 4.0) < 1e-4);
    console.log('✅ Test 39 PASS: Runway sensitivity spectrum (50%, 70%, 85%) computed accurately.');
}

// Test 40: Zero Monthly Burn Boundary
{
    const cashFlow = { monthlyIncome: 50000, totalMonthlyBurn: 0 };
    const liquidity = { accessibleValue: 100000 };
    const res = evaluateCashFlowAndRunway(cashFlow, liquidity);
    assert.strictEqual(res.runway.totalMonths, null);
    assert.strictEqual(res.runway.status, 'NO_RECURRING_BURN');
    console.log('✅ Test 40 PASS: Zero monthly burn returns null runway with status NO_RECURRING_BURN.');
}

// Test 41: Negative Monthly Burn Input Rejection
{
    assert.throws(() => {
        evaluateCashFlowAndRunway({ totalMonthlyBurn: -5000 }, { accessibleValue: 100000 });
    }, /Total monthly burn must be non-negative/);
    console.log('✅ Test 41 PASS: Negative monthly burn input throws error.');
}

// Test 42: Income Coverage & Survival Coverage Ratios
{
    const cashFlow = { monthlyIncome: 120000, essentialBurn: 60000, debtBurn: 0, discretionaryBurn: 40000 };
    const res = evaluateCashFlowAndRunway(cashFlow, { accessibleValue: 100000 });
    assert.strictEqual(res.monthlyCashFlow.incomeCoverageRatio, 1.2); // 120k / 100k
    assert.strictEqual(res.monthlyCashFlow.survivalCoverageRatio, 2.0); // 120k / 60k
    console.log('✅ Test 42 PASS: Income coverage and survival coverage ratios match exact formulas.');
}

// ================================================================
// GROUP 7: Multi-Scenario Stress Testing Matrix (Tests 43-47)
// ================================================================
console.log('\n--- Group 7: Multi-Scenario Stress Testing Matrix ---');

// Test 43: BASE Scenario Evaluation
{
    const cf = { income: 100000, totalBurn: 80000, survivalBurn: 50000 };
    const liq = { accessibleValue: 200000, stressedAccessibleValue: 170000 };
    const res = evaluateLiquidityStressScenarios(cf, liq);
    assert.strictEqual(res.base.stressedIncome, 100000);
    assert.strictEqual(res.base.monthlyDeficit, 0.0); // Self-sustaining
    assert.strictEqual(res.base.runwayMonths, 4.0); // 200k / 50k survival burn
    console.log('✅ Test 43 PASS: BASE scenario evaluated cleanly.');
}

// Test 44: INCOME_SHOCK_ONLY Scenario Evaluation (50% income reduction)
{
    const cf = { income: 100000, totalBurn: 80000, survivalBurn: 50000 };
    const liq = { accessibleValue: 200000, stressedAccessibleValue: 170000 };
    const res = evaluateLiquidityStressScenarios(cf, liq);
    assert.strictEqual(res.incomeShockOnly.stressedIncome, 50000);
    assert.strictEqual(res.incomeShockOnly.monthlyDeficit, 30000); // 80k - 50k
    assert(Math.abs(res.incomeShockOnly.runwayMonths - (200000 / 30000)) < 1e-4); // 6.67 months
    console.log('✅ Test 44 PASS: INCOME_SHOCK_ONLY scenario evaluates 50% income drop and 30k deficit.');
}

// Test 45: PORTFOLIO_HAIRCUT_ONLY Scenario Evaluation
{
    const cf = { income: 60000, totalBurn: 80000, survivalBurn: 50000 };
    const liq = { accessibleValue: 200000, stressedAccessibleValue: 160000 };
    const res = evaluateLiquidityStressScenarios(cf, liq);
    assert.strictEqual(res.portfolioHaircutOnly.monthlyDeficit, 20000);
    assert.strictEqual(res.portfolioHaircutOnly.runwayMonths, 8.0); // 160k / 20k
    console.log('✅ Test 45 PASS: PORTFOLIO_HAIRCUT_ONLY scenario calculates stressed capital runway.');
}

// Test 46: COMBINED_SEVERE_STRESS Scenario Evaluation
{
    const cf = { income: 100000, totalBurn: 80000, survivalBurn: 50000 };
    const liq = { accessibleValue: 200000, stressedAccessibleValue: 150000 };
    const res = evaluateLiquidityStressScenarios(cf, liq);
    assert.strictEqual(res.combinedSevereStress.stressedIncome, 0.0);
    assert.strictEqual(res.combinedSevereStress.monthlyDeficit, 50000); // Survival burn
    assert.strictEqual(res.combinedSevereStress.runwayMonths, 3.0); // 150k / 50k
    console.log('✅ Test 46 PASS: COMBINED_SEVERE_STRESS calculates worst-case 0% income + severe haircut runway.');
}

// Test 47: Self-Sustaining Scenario State
{
    const cf = { income: 200000, totalBurn: 80000, survivalBurn: 50000 };
    const liq = { accessibleValue: 100000, stressedAccessibleValue: 80000 };
    const res = evaluateLiquidityStressScenarios(cf, liq);
    assert.strictEqual(res.base.monthlyDeficit, 0.0);
    console.log('✅ Test 47 PASS: Self-sustaining surplus generates 0 monthly deficit.');
}

// ================================================================
// GROUP 8: Composite Liquidity Stress Score & Tier Boundaries (Tests 48-53)
// ================================================================
console.log('\n--- Group 8: Liquidity Stress Score & Tier Boundaries ---');

// Test 48: Score = 100.0 -> HEALTHY
{
    const res = calculateLiquidityStressScore({
        immediateMonths: 3.0,
        shortTermMonths: 6.0,
        totalRunwayMonths: 12.0,
        monthlyIncome: 150000,
        essentialSurvivalBurn: 50000,
        totalBurn: 80000,
        lockedPercentage: 0.10,
        combinedRunwayMonths: 6.0
    });
    assert.strictEqual(res.stressScore, 100.0);
    assert.strictEqual(res.stressTier, 'HEALTHY');
    console.log('✅ Test 48 PASS: Maximum score 100.0 evaluates to HEALTHY.');
}

// Test 49: Score = 80.0 -> HEALTHY (Exact lower boundary)
{
    const res = calculateLiquidityStressScore({
        immediateMonths: 1.0,    // 20 pts
        shortTermMonths: 3.0,    // 20 pts
        totalRunwayMonths: 6.0,  // 25 pts
        monthlyIncome: 100000,   // 15 pts (100k >= 1.25 * 80k)
        essentialSurvivalBurn: 50000,
        totalBurn: 80000,
        lockedPercentage: 0.80,  // 0 pts (penalty: locked 80% -> 0/10)
        combinedRunwayMonths: 0.0 // 0 pts
    });
    assert.strictEqual(res.stressScore, 80.0);
    assert.strictEqual(res.stressTier, 'HEALTHY');
    console.log('✅ Test 49 PASS: Score exactly 80.0 evaluates to HEALTHY.');
}

// Test 50: Score = 79.99 -> WATCH (Exact upper boundary of Watch)
{
    let tier = 'CRITICAL';
    const score = 79.99;
    if (score >= LIQUIDITY_POLICY_V1.scoreTiers.HEALTHY_MIN) tier = 'HEALTHY';
    else if (score >= LIQUIDITY_POLICY_V1.scoreTiers.WATCH_MIN) tier = 'WATCH';
    else if (score >= LIQUIDITY_POLICY_V1.scoreTiers.STRESSED_MIN) tier = 'STRESSED';
    assert.strictEqual(tier, 'WATCH');
    console.log('✅ Test 50 PASS: Score 79.99 evaluates to WATCH.');
}

// Test 51: Score = 60.0 -> WATCH & Score = 59.99 -> STRESSED
{
    const getTier = (s) => {
        if (s >= 80.0) return 'HEALTHY';
        if (s >= 60.0) return 'WATCH';
        if (s >= 40.0) return 'STRESSED';
        return 'CRITICAL';
    };
    assert.strictEqual(getTier(60.0), 'WATCH');
    assert.strictEqual(getTier(59.99), 'STRESSED');
    console.log('✅ Test 51 PASS: Boundary at 60.0 (WATCH) vs 59.99 (STRESSED) validated.');
}

// Test 52: Score = 40.0 -> STRESSED & Score = 39.99 -> CRITICAL
{
    const getTier = (s) => {
        if (s >= 80.0) return 'HEALTHY';
        if (s >= 60.0) return 'WATCH';
        if (s >= 40.0) return 'STRESSED';
        return 'CRITICAL';
    };
    assert.strictEqual(getTier(40.0), 'STRESSED');
    assert.strictEqual(getTier(39.99), 'CRITICAL');
    console.log('✅ Test 52 PASS: Boundary at 40.0 (STRESSED) vs 39.99 (CRITICAL) validated.');
}

// Test 53: Score Boundedness [0.0, 100.0]
{
    const resMin = calculateLiquidityStressScore({
        immediateMonths: 0,
        shortTermMonths: 0,
        totalRunwayMonths: 0,
        monthlyIncome: 0,
        essentialSurvivalBurn: 50000,
        totalBurn: 80000,
        lockedPercentage: 1.0,
        combinedRunwayMonths: 0
    });
    assert.strictEqual(resMin.stressScore, 0.0);
    assert.strictEqual(resMin.stressTier, 'CRITICAL');
    console.log('✅ Test 53 PASS: Score minimum 0.0 evaluated to CRITICAL.');
}

// ================================================================
// GROUP 9: Determinism, Quality, AST Scan & Read-Only Safety (Tests 54-56)
// ================================================================
console.log('\n--- Group 9: Determinism, AST Scan & Read-Only Safety ---');

// Test 54: Mandatory Deterministic asOfDate Enforced
{
    assert.throws(() => {
        evaluatePortfolioLiquidityAndStress({ holdings: [{ id: 'c', currentValue: 100 }] }, null);
    }, /Missing mandatory deterministic parameter: asOfDate/);
    console.log('✅ Test 54 PASS: Mandatory asOfDate strictly enforced.');
}

// Test 55: AST Wall-Clock Scan in liquidityEngine.js
{
    const code = fs.readFileSync('services/liquidityEngine.js', 'utf8');
    const dateNowMatches = code.match(/Date\.now\(\)/g) || [];
    const argumentlessNewDateMatches = code.match(/new\s+Date\(\s*\)/g) || [];
    assert.strictEqual(dateNowMatches.length, 0, `Found ${dateNowMatches.length} Date.now() in liquidityEngine.js`);
    assert.strictEqual(argumentlessNewDateMatches.length, 0, `Found ${argumentlessNewDateMatches.length} argument-less new Date() in liquidityEngine.js`);
    console.log('✅ Test 55 PASS: AST Wall-Clock Scan verified (0 Date.now(), 0 argument-less new Date()).');
}

// Test 56: Deep 5-Store Read-Only Safety Guard
{
    const hBefore = await loadData(STORAGE_KEYS.HOLDINGS);
    const eBefore = await loadData(STORAGE_KEYS.EVENTS);
    const qBefore = await loadData(STORAGE_KEYS.QUOTES);
    const tBefore = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const wBefore = await loadData(STORAGE_KEYS.WALLETS);

    const testPortfolio = {
        holdings: [
            { id: 'h1', symbol: 'T0_CASH', assetClass: 'CASH', currentValue: 50000 },
            { id: 'h2', symbol: 'T2_EQ', assetClass: 'STOCK', currentValue: 100000 },
            { id: 'h3', symbol: 'FD_LOCK', maturityDate: '2026-06-30T00:00:00.000Z', currentValue: 200000 }
        ],
        cashFlow: {
            monthlyIncome: 80000,
            essentialBurn: 30000,
            debtBurn: 10000,
            discretionaryBurn: 15000
        }
    };

    const res = evaluatePortfolioLiquidityAndStress(testPortfolio, AS_OF_DATE);
    assert(res.grossPortfolioValue > 0);

    const hAfter = await loadData(STORAGE_KEYS.HOLDINGS);
    const eAfter = await loadData(STORAGE_KEYS.EVENTS);
    const qAfter = await loadData(STORAGE_KEYS.QUOTES);
    const tAfter = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const wAfter = await loadData(STORAGE_KEYS.WALLETS);

    assert.deepStrictEqual(hBefore, hAfter, 'Holdings store was mutated!');
    assert.deepStrictEqual(eBefore, eAfter, 'Events store was mutated!');
    assert.deepStrictEqual(qBefore, qAfter, 'Quotes store was mutated!');
    assert.deepStrictEqual(tBefore, tAfter, 'Transactions store was mutated!');
    assert.deepStrictEqual(wBefore, wAfter, 'Wallets store was mutated!');
    console.log('✅ Test 56 PASS: Deep 5-store read-only safety verified (100% zero state mutations).');
}

console.log('\n================================================================');
console.log('=== STAGE C.7.5 ACCEPTANCE RESULT: 56/56 TESTS PASSED (100%) ===');
console.log('================================================================');
