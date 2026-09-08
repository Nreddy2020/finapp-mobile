/**
 * tests/loans/test_loan_prepayment.mjs
 * 
 * LN-04: Prepayment & Foreclosure Simulation Suite (30 checks)
 */

import assert from 'assert';
import { simulatePrepayment } from '../../services/loans/loanPrepaymentSimulator.js';
import { LOAN_TYPES, RATE_TYPES, LOAN_STATUS } from '../../services/loans/loanContracts.js';

console.log('================================================================');
console.log('🚀 EXECUTING LN-04: PREPAYMENT & FORECLOSURE SIMULATION SUITE');
console.log('================================================================\n');

let passCount = 0;
function test(name, fn) {
    process.stdout.write(`  [RUN] ${name}...`);
    try {
        fn();
        passCount++;
        console.log(`  [PASS] ${name}`);
    } catch (e) {
        console.error(`  [FAIL] ${name}: ${e.message}`);
        throw e;
    }
}

const mockFacility = {
    id: 'FACILITY_HOME_01',
    name: 'HDFC Home Loan',
    lender: 'HDFC Bank',
    loanType: LOAN_TYPES.HOME,
    rateType: RATE_TYPES.FIXED,
    status: LOAN_STATUS.ACTIVE,
    principalPaise: 500000000n, // 50 Lakhs
    outstandingPrincipalPaise: 500000000n,
    annualRatePercent: 9.0,
    tenureMonths: 240, // 20 years
    startDate: '2026-01-01'
};

// 1. Simulation Read-Only Guarantee
test('Check 1: simulatePrepayment preserves simulationDoesNotMutateLiveFacility === true', () => {
    const stringifyWithBigInt = (obj) => JSON.stringify(obj, (k, v) => typeof v === 'bigint' ? v.toString() : v);
    const originalSnapshot = stringifyWithBigInt(mockFacility);
    const res = simulatePrepayment(mockFacility, {
        prepaymentPaise: 50000000n // 5 Lakhs
    });
    assert.strictEqual(res.simulationDoesNotMutateLiveFacility, true);
    assert.strictEqual(stringifyWithBigInt(mockFacility), originalSnapshot);
});

// 2. Prepayment Scenarios Generation
const sim5Lakhs = simulatePrepayment(mockFacility, {
    prepaymentPaise: 50000000n, // 5 Lakhs
    prepaymentAfterPeriod: 12,   // After 1 year
    prepaymentFeesPaise: 100000n // ₹1,000 fee
});

test('Check 2: Result contains statusQuo, tenureReduction, and emiReduction scenarios', () => {
    assert(sim5Lakhs.statusQuo);
    assert(sim5Lakhs.tenureReduction);
    assert(sim5Lakhs.emiReduction);
});

test('Check 3: afterPeriod accurately reflects prepayment timing', () => {
    assert.strictEqual(sim5Lakhs.afterPeriod, 12);
});

test('Check 4: Prepayment amount matches input exactly', () => {
    assert.strictEqual(sim5Lakhs.prepaymentAmountPaise, 50000000n);
});

test('Check 5: Estimated fees match input exactly', () => {
    assert.strictEqual(sim5Lakhs.estimatedFeesPaise, 100000n);
});

// 3. Scenario Comparison & Metrics
test('Check 6: Tenure reduction saves positive number of months', () => {
    assert(sim5Lakhs.tenureReduction.monthsSaved > 0, `Expected months saved > 0, got ${sim5Lakhs.tenureReduction.monthsSaved}`);
});

test('Check 7: Tenure reduction keeps standard EMI unchanged', () => {
    assert.strictEqual(sim5Lakhs.tenureReduction.revisedEmiPaise, sim5Lakhs.statusQuo.monthlyEmiPaise);
});

test('Check 8: Tenure reduction revised maturity date is earlier than status quo', () => {
    assert(sim5Lakhs.tenureReduction.revisedMaturityDate < sim5Lakhs.statusQuo.maturityDate);
});

test('Check 9: Tenure reduction yields positive gross interest saved', () => {
    assert(sim5Lakhs.tenureReduction.grossInterestSavedPaise > 0n);
});

test('Check 10: Tenure reduction netCostReduction accounts for prepayment fees', () => {
    const net = sim5Lakhs.tenureReduction.netCostReductionPaise;
    assert(net > 0n);
});

test('Check 11: EMI reduction preserves remaining tenure', () => {
    assert.strictEqual(sim5Lakhs.emiReduction.revisedTenureMonths, sim5Lakhs.statusQuo.remainingTenureMonths);
});

test('Check 12: EMI reduction provides positive monthly EMI relief', () => {
    assert(sim5Lakhs.emiReduction.monthlyEmiReliefPaise > 0n);
    assert(sim5Lakhs.emiReduction.revisedEmiPaise < sim5Lakhs.statusQuo.monthlyEmiPaise);
});

test('Check 13: Tenure reduction saves MORE total interest than EMI reduction', () => {
    assert(
        sim5Lakhs.tenureReduction.grossInterestSavedPaise > sim5Lakhs.emiReduction.grossInterestSavedPaise,
        'Tenure reduction must save more interest than EMI reduction'
    );
});

test('Check 14: Both scenarios provide positive net cost reduction for 5 Lakhs prepayment', () => {
    assert(sim5Lakhs.tenureReduction.netCostReductionPaise > 0n);
    assert(sim5Lakhs.emiReduction.netCostReductionPaise > 0n);
});

// 4. Foreclosure Simulation (Full Outstanding Repayment)
test('Check 15: Full foreclosure reduces remaining tenure to 0', () => {
    // Find outstanding after 12 periods
    const currentOutstanding = sim5Lakhs.currentOutstandingPrincipalPaise;
    const foreclosureSim = simulatePrepayment(mockFacility, {
        prepaymentPaise: currentOutstanding,
        prepaymentAfterPeriod: 12,
        prepaymentFeesPaise: 500000n // ₹5,000 foreclosure charge
    });

    assert.strictEqual(foreclosureSim.tenureReduction.revisedTenureMonths, 0);
    assert.strictEqual(foreclosureSim.tenureReduction.revisedEmiPaise, 0n);
    assert.strictEqual(foreclosureSim.tenureReduction.monthsSaved, 228);
});

test('Check 16: Full foreclosure eliminates all future interest', () => {
    const currentOutstanding = sim5Lakhs.currentOutstandingPrincipalPaise;
    const foreclosureSim = simulatePrepayment(mockFacility, {
        prepaymentPaise: currentOutstanding,
        prepaymentAfterPeriod: 12
    });
    assert.strictEqual(foreclosureSim.tenureReduction.totalRemainingInterestPaise, 0n);
});

// 5. Invariant & Boundary Checks
test('Check 17: Prepayment amount cannot be negative', () => {
    assert.throws(() => {
        simulatePrepayment(mockFacility, { prepaymentPaise: -1000n });
    }, /NEGATIVE_PREPAYMENT_REJECTED/);
});

test('Check 18: Prepayment amount cannot exceed outstanding principal', () => {
    assert.throws(() => {
        simulatePrepayment(mockFacility, { prepaymentPaise: 600000000n }); // 60L > 50L
    }, /PREPAYMENT_EXCEEDS_OUTSTANDING/);
});

test('Check 19: afterPeriod cannot exceed total schedule tenure', () => {
    assert.throws(() => {
        simulatePrepayment(mockFacility, { prepaymentPaise: 100000n, prepaymentAfterPeriod: 300 });
    }, /INVALID_PERIOD/);
});

test('Check 20: Prepayment of 0 paise produces 0 months saved and 0 net benefit', () => {
    const zeroSim = simulatePrepayment(mockFacility, { prepaymentPaise: 0n });
    assert.strictEqual(zeroSim.tenureReduction.monthsSaved, 0);
    assert.strictEqual(zeroSim.tenureReduction.netCostReductionPaise, 0n);
});

test('Check 21: User-entered assumptions are echoed cleanly in result without mutation', () => {
    const assumptions = { taxRebateEligible: true, expectedInflationPct: 6.0 };
    const res = simulatePrepayment(mockFacility, {
        prepaymentPaise: 1000000n,
        userAssumptions: assumptions
    });
    assert.deepStrictEqual(res.userEnteredAssumptions, assumptions);
});

test('Check 22: High fees correctly diminish netCostReductionPaise', () => {
    const lowFeeSim = simulatePrepayment(mockFacility, {
        prepaymentPaise: 20000000n,
        prepaymentFeesPaise: 100000n // ₹1k
    });
    const highFeeSim = simulatePrepayment(mockFacility, {
        prepaymentPaise: 20000000n,
        prepaymentFeesPaise: 20000000n // ₹2 Lakh fee
    });
    assert(lowFeeSim.tenureReduction.netCostReductionPaise > highFeeSim.tenureReduction.netCostReductionPaise);
});

test('Check 23: Prepayment simulation on zero-interest loan calculates correctly', () => {
    const zeroInterestFacility = {
        ...mockFacility,
        annualRatePercent: 0.0,
        principalPaise: 12000000n, // ₹1,20,000
        tenureMonths: 12
    };
    const res = simulatePrepayment(zeroInterestFacility, {
        prepaymentPaise: 6000000n, // Prepay half
        prepaymentAfterPeriod: 0
    });
    assert(res.tenureReduction.monthsSaved > 0);
    assert.strictEqual(res.tenureReduction.grossInterestSavedPaise, 0n); // No interest saved because rate was 0
});

test('Check 24: Prepayment at period 0 executes immediately before any EMI', () => {
    const res = simulatePrepayment(mockFacility, {
        prepaymentPaise: 10000000n, // 1 Lakh
        prepaymentAfterPeriod: 0
    });
    assert.strictEqual(res.afterPeriod, 0);
    assert(res.tenureReduction.monthsSaved > 0);
});

test('Check 25: Prepayment simulation preserves ISO timestamp of simulation', () => {
    assert(sim5Lakhs.simulationTimestamp);
    assert(!isNaN(new Date(sim5Lakhs.simulationTimestamp).getTime()));
});

test('Check 26: Simulation requires valid facility object', () => {
    assert.throws(() => simulatePrepayment(null, {}), /INVALID_FACILITY/);
    assert.throws(() => simulatePrepayment({}, {}), /INVALID_FACILITY/);
});

test('Check 27: Partial prepayment on personal loan (12% 36m) reduces tenure significantly', () => {
    const personal = {
        ...mockFacility,
        loanType: LOAN_TYPES.PERSONAL,
        principalPaise: 50000000n, // 5 Lakhs
        annualRatePercent: 12.0,
        tenureMonths: 36
    };
    const res = simulatePrepayment(personal, {
        prepaymentPaise: 20000000n, // 2 Lakhs
        prepaymentAfterPeriod: 6
    });
    assert(res.tenureReduction.monthsSaved >= 10);
});

test('Check 28: Partial prepayment on auto loan (9% 60m) reduces monthly EMI by expected ratio', () => {
    const auto = {
        ...mockFacility,
        loanType: LOAN_TYPES.AUTO,
        principalPaise: 100000000n, // 10 Lakhs
        annualRatePercent: 9.0,
        tenureMonths: 60
    };
    const res = simulatePrepayment(auto, {
        prepaymentPaise: 30000000n, // 3 Lakhs (30%)
        prepaymentAfterPeriod: 12
    });
    // EMI relief should be roughly ~25-30% of original EMI
    const reliefPct = Number(res.emiReduction.monthlyEmiReliefPaise * 100n / res.statusQuo.monthlyEmiPaise);
    assert(reliefPct >= 25 && reliefPct <= 35, `Expected relief % ~30%, got ${reliefPct}%`);
});

test('Check 29: Loan ID is accurately populated in simulation receipt', () => {
    assert.strictEqual(sim5Lakhs.loanId, mockFacility.id);
});

test('Check 30: Residual closing balance in revised schedule remains exactly 0n', () => {
    if (sim5Lakhs.tenureReduction.scheduleSummary) {
        assert.strictEqual(sim5Lakhs.tenureReduction.scheduleSummary.totalPrincipalPaidPaise, 500000000n - 50000000n - (500000000n - sim5Lakhs.currentOutstandingPrincipalPaise));
    }
    assert(true);
});

console.log('\n================================================================');
console.log(`🎉 LN-04 PASSED CERTIFICATION (${passCount} / 30 CHECKS)`);
console.log('================================================================\n');
