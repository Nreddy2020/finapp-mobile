/**
 * tests/loans/test_loan_edge_cases.mjs
 * 
 * LN-03: Edge Cases, Bounds & Zero-Interest Suite (25 checks)
 */

import assert from 'assert';
import { generateAmortizationSchedule } from '../../services/loans/loanAmortization.js';
import { calculateMonthlyEmiPaise, deriveMonthlyScaledRate } from '../../services/loans/loanEngine.js';
import { validateLoanFacility } from '../../services/loans/loanValidation.js';
import { LOAN_CONSTANTS, LOAN_TYPES, RATE_TYPES, LOAN_STATUS } from '../../services/loans/loanContracts.js';

console.log('================================================================');
console.log('🚀 EXECUTING LN-03: EDGE CASES & ZERO-INTEREST SUITE');
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

// 1. Zero-Interest Loans Remainder Policy
test('Check 1: 10,000 paise over 3 months gives 3333, 3333, 3334 with 0 closing balance', () => {
    const s = generateAmortizationSchedule({
        principalPaise: 10000n,
        annualRatePercent: 0.0,
        tenureMonths: 3,
        startDate: '2026-01-01'
    });
    assert.strictEqual(s.schedule.length, 3);
    assert.strictEqual(s.schedule[0].installmentPaise, 3333n);
    assert.strictEqual(s.schedule[1].installmentPaise, 3333n);
    assert.strictEqual(s.schedule[2].installmentPaise, 3334n); // Absorbs 1 remainder
    assert.strictEqual(s.schedule[2].closingPrincipalPaise, 0n);
    assert.strictEqual(s.summary.totalPrincipalPaidPaise, 10000n);
});

test('Check 2: 1-month zero-interest loan produces installment = principal, closing = 0', () => {
    const s = generateAmortizationSchedule({
        principalPaise: 500000n,
        annualRatePercent: 0.0,
        tenureMonths: 1,
        startDate: '2026-01-01'
    });
    assert.strictEqual(s.schedule.length, 1);
    assert.strictEqual(s.schedule[0].installmentPaise, 500000n);
    assert.strictEqual(s.schedule[0].interestComponentPaise, 0n);
    assert.strictEqual(s.schedule[0].closingPrincipalPaise, 0n);
});

test('Check 3: 100,000 paise over 7 months adds remainder 5 strictly to final installment', () => {
    const s = generateAmortizationSchedule({
        principalPaise: 100000n,
        annualRatePercent: 0.0,
        tenureMonths: 7,
        startDate: '2026-01-01'
    });
    // 100000 / 7 = 14285 rem 5
    for (let i = 0; i < 6; i++) {
        assert.strictEqual(s.schedule[i].installmentPaise, 14285n);
    }
    assert.strictEqual(s.schedule[6].installmentPaise, 14290n);
    assert.strictEqual(s.schedule[6].closingPrincipalPaise, 0n);
});

test('Check 4: Zero-interest loan with perfectly divisible principal (120,000 / 12)', () => {
    const s = generateAmortizationSchedule({
        principalPaise: 120000n,
        annualRatePercent: 0.0,
        tenureMonths: 12,
        startDate: '2026-01-01'
    });
    for (const p of s.schedule) {
        assert.strictEqual(p.installmentPaise, 10000n);
    }
    assert.strictEqual(s.schedule[11].closingPrincipalPaise, 0n);
});

test('Check 5: Zero-interest total interest paid is exactly 0n', () => {
    const s = generateAmortizationSchedule({
        principalPaise: 5000000n,
        annualRatePercent: 0.0,
        tenureMonths: 24,
        startDate: '2026-01-01'
    });
    assert.strictEqual(s.summary.totalInterestPaidPaise, 0n);
});

// 2. Minimum and Maximum Bounds
test('Check 6: Minimum principal of 100 paise (₹1.00) calculates cleanly', () => {
    const emi = calculateMonthlyEmiPaise(100n, 10.0, 1);
    assert(emi >= 100n);
});

test('Check 7: Maximum principal of 100 Crore (1,000,000,000,000 paise) executes without overflow', () => {
    const emi = calculateMonthlyEmiPaise(1000000000000n, 9.5, 240);
    assert(emi > 0n);
});

test('Check 8: Minimum tenure of 1 month executes cleanly', () => {
    const s = generateAmortizationSchedule({
        principalPaise: 1000000n,
        annualRatePercent: 12.0,
        tenureMonths: 1,
        startDate: '2026-01-01'
    });
    assert.strictEqual(s.schedule.length, 1);
    assert.strictEqual(s.schedule[0].closingPrincipalPaise, 0n);
});

test('Check 9: Maximum tenure of 480 months executes cleanly with zero final closing balance', () => {
    const s = generateAmortizationSchedule({
        principalPaise: 500000000n,
        annualRatePercent: 8.5,
        tenureMonths: 480,
        startDate: '2026-01-01'
    });
    assert.strictEqual(s.schedule.length, 480);
    assert.strictEqual(s.schedule[479].closingPrincipalPaise, 0n);
});

test('Check 10: Maximum annual rate of 100.0% executes without arithmetic error', () => {
    const emi = calculateMonthlyEmiPaise(10000000n, 100.0, 12);
    assert(emi > 0n);
});

// 3. Input Out-of-Bounds Rejection
test('Check 11: Principal below 100 paise is rejected', () => {
    assert.throws(() => {
        calculateMonthlyEmiPaise(50n, 10.0, 12);
    }, /PRINCIPAL_OUT_OF_BOUNDS/);
});

test('Check 12: Principal above 100 Crore is rejected', () => {
    assert.throws(() => {
        calculateMonthlyEmiPaise(2000000000000n, 10.0, 12);
    }, /PRINCIPAL_OUT_OF_BOUNDS/);
});

test('Check 13: Negative annual rate is rejected', () => {
    assert.throws(() => {
        deriveMonthlyScaledRate(-2.5);
    }, /INVALID_ANNUAL_RATE/);
});

test('Check 14: Annual rate above 100% is rejected', () => {
    assert.throws(() => {
        deriveMonthlyScaledRate(105.0);
    }, /INVALID_ANNUAL_RATE/);
});

test('Check 15: Tenure of 0 months is rejected', () => {
    assert.throws(() => {
        calculateMonthlyEmiPaise(1000000n, 10.0, 0);
    }, /TENURE_OUT_OF_BOUNDS/);
});

test('Check 16: Tenure above 480 months is rejected', () => {
    assert.throws(() => {
        calculateMonthlyEmiPaise(1000000n, 10.0, 481);
    }, /TENURE_OUT_OF_BOUNDS/);
});

// 4. Facility Schema Boundary Validation
test('Check 17: Facility validator accepts valid full facility', () => {
    const facility = {
        id: 'LOAN_TEST_01',
        name: 'SBI Home Loan',
        lender: 'State Bank of India',
        loanType: LOAN_TYPES.HOME,
        rateType: RATE_TYPES.FIXED,
        status: LOAN_STATUS.ACTIVE,
        principalPaise: 400000000n,
        annualRatePercent: 8.4,
        tenureMonths: 180,
        startDate: '2026-03-01',
        emiDueDayOfMonth: 10
    };
    assert.strictEqual(validateLoanFacility(facility), true);
});

test('Check 18: Facility validator rejects empty ID', () => {
    assert.throws(() => {
        validateLoanFacility({ id: '', name: 'Test' });
    }, /VALIDATION_FAILED/);
});

test('Check 19: Facility validator rejects missing name', () => {
    assert.throws(() => {
        validateLoanFacility({ id: 'LN1', name: '' });
    }, /VALIDATION_FAILED/);
});

test('Check 20: Facility validator rejects invalid loanType', () => {
    assert.throws(() => {
        validateLoanFacility({ id: 'LN1', name: 'Test', loanType: 'INVALID_TYPE' });
    }, /VALIDATION_FAILED/);
});

test('Check 21: Facility validator rejects invalid rateType', () => {
    assert.throws(() => {
        validateLoanFacility({ id: 'LN1', name: 'Test', loanType: LOAN_TYPES.PERSONAL, rateType: 'CRYPTO' });
    }, /VALIDATION_FAILED/);
});

test('Check 22: Facility validator rejects non-integer tenure', () => {
    assert.throws(() => {
        validateLoanFacility({ 
            id: 'LN1', 
            name: 'Test', 
            loanType: LOAN_TYPES.PERSONAL,
            principalPaise: 1000000n,
            annualRatePercent: 12.0,
            tenureMonths: 12.5 
        });
    }, /VALIDATION_FAILED/);
});

test('Check 23: Facility validator rejects invalid emiDueDayOfMonth > 31', () => {
    assert.throws(() => {
        validateLoanFacility({ 
            id: 'LN1', 
            name: 'Test', 
            loanType: LOAN_TYPES.PERSONAL,
            principalPaise: 1000000n,
            annualRatePercent: 12.0,
            tenureMonths: 12,
            emiDueDayOfMonth: 32
        });
    }, /VALIDATION_FAILED/);
});

test('Check 24: Facility validator rejects invalid date format', () => {
    assert.throws(() => {
        validateLoanFacility({ 
            id: 'LN1', 
            name: 'Test', 
            loanType: LOAN_TYPES.PERSONAL,
            principalPaise: 1000000n,
            annualRatePercent: 12.0,
            tenureMonths: 12,
            startDate: 'invalid-date-string'
        });
    }, /VALIDATION_FAILED/);
});

test('Check 25: Facility validator rejects non-object input', () => {
    assert.throws(() => {
        validateLoanFacility(null);
    }, /VALIDATION_FAILED/);
    assert.throws(() => {
        validateLoanFacility('string');
    }, /VALIDATION_FAILED/);
});

console.log('\n================================================================');
console.log(`🎉 LN-03 PASSED CERTIFICATION (${passCount} / 25 CHECKS)`);
console.log('================================================================\n');
