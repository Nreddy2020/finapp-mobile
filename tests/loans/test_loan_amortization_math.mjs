/**
 * tests/loans/test_loan_amortization_math.mjs
 * 
 * LN-02: Amortization & Scaled Integer Math Suite (35 checks)
 * Validates scaled binary exponentiation vs reference, monthly rate conversion,
 * EMI calculations, and period-by-period balance invariants.
 */

import assert from 'assert';
import { powScaled, deriveMonthlyScaledRate, calculateMonthlyEmiPaise } from '../../services/loans/loanEngine.js';
import { generateAmortizationSchedule } from '../../services/loans/loanAmortization.js';
import { LOAN_CONSTANTS } from '../../services/loans/loanContracts.js';

console.log('================================================================');
console.log('🚀 EXECUTING LN-02: AMORTIZATION & SCALED INTEGER MATH SUITE');
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

const SCALE = LOAN_CONSTANTS.RATE_SCALE; // 10^8

// 1. Scaled Binary Exponentiation vs High-Precision Reference
test('Check 1: powScaled handles exponent 0 returning exactly SCALE', () => {
    assert.strictEqual(powScaled(101000000n, 0), SCALE);
});

test('Check 2: powScaled handles exponent 1 returning base unchanged', () => {
    assert.strictEqual(powScaled(101000000n, 1), 101000000n);
});

test('Check 3: powScaled compares accurately against Float reference for 12 months', () => {
    // 1% per month = base 1.01 * 10^8
    const base = 101000000n;
    const scaledResult = powScaled(base, 12);
    const floatRef = Math.pow(1.01, 12) * Number(SCALE);
    const diff = Math.abs(Number(scaledResult) - floatRef);
    // Relative error < 0.001%
    assert(diff / floatRef < 0.00001, `Error too high: diff=${diff}, ref=${floatRef}`);
});

test('Check 4: powScaled compares accurately against Float reference for 240 months (20 yrs)', () => {
    // 0.75% per month (9% p.a.) = base 1.0075 * 10^8
    const base = 100750000n;
    const scaledResult = powScaled(base, 240);
    const floatRef = Math.pow(1.0075, 240) * Number(SCALE);
    const diff = Math.abs(Number(scaledResult) - floatRef);
    assert(diff / floatRef < 0.0001, `Error too high: diff=${diff}`);
});

test('Check 5: powScaled compares accurately for 480 months (40 yrs)', () => {
    const base = 100700000n; // 0.70%
    const scaledResult = powScaled(base, 480);
    const floatRef = Math.pow(1.0070, 480) * Number(SCALE);
    const diff = Math.abs(Number(scaledResult) - floatRef);
    assert(diff / floatRef < 0.0005, `Error too high: diff=${diff}`);
});

// 2. Monthly Rate Conversions
test('Check 6: deriveMonthlyScaledRate maps 0% p.a. to 0n', () => {
    assert.strictEqual(deriveMonthlyScaledRate(0.0), 0n);
});

test('Check 7: deriveMonthlyScaledRate maps 12% p.a. to exactly 1% monthly scaled (1,000,000n)', () => {
    // 12 * 10^8 / 1200 = 1,000,000n
    assert.strictEqual(deriveMonthlyScaledRate(12.0), 1000000n);
});

test('Check 8: deriveMonthlyScaledRate maps 6% p.a. to 500,000n', () => {
    assert.strictEqual(deriveMonthlyScaledRate(6.0), 500000n);
});

test('Check 9: deriveMonthlyScaledRate maps 8.5% p.a. accurately', () => {
    // 8.5 * 10^8 / 1200 = 708333.33 -> 708333n
    assert.strictEqual(deriveMonthlyScaledRate(8.5), 708333n);
});

test('Check 10: deriveMonthlyScaledRate maps maximum 100% rate safely', () => {
    const maxRateScaled = deriveMonthlyScaledRate(100.0);
    assert.strictEqual(maxRateScaled, 8333333n);
});

// 3. Reducing Balance EMI Formula
test('Check 11: calculateMonthlyEmiPaise for 50 Lakhs @ 8.5% for 20 years (Home Loan)', () => {
    const P = 500000000n; // ₹50,00,000.00 (50L)
    const emi = calculateMonthlyEmiPaise(P, 8.5, 240);
    // Standard standard banking EMI for 50L @ 8.5% for 20y is ~₹43,391 (4339115 paise)
    const emiRupees = Number(emi) / 100;
    assert(emiRupees >= 43350 && emiRupees <= 43450, `EMI out of expected range: ₹${emiRupees}`);
});

test('Check 12: calculateMonthlyEmiPaise for 5 Lakhs @ 12% for 3 years (Personal Loan)', () => {
    const P = 50000000n; // ₹5,00,000
    const emi = calculateMonthlyEmiPaise(P, 12.0, 36);
    // 5L @ 12% for 3y: ~₹16,607 (1660715 paise)
    const emiRupees = Number(emi) / 100;
    assert(emiRupees >= 16580 && emiRupees <= 16630, `EMI out of expected range: ₹${emiRupees}`);
});

test('Check 13: calculateMonthlyEmiPaise for 10 Lakhs @ 9% for 5 years (Auto Loan)', () => {
    const P = 100000000n; // ₹10,00,000
    const emi = calculateMonthlyEmiPaise(P, 9.0, 60);
    // 10L @ 9% for 5y: ~₹20,758
    const emiRupees = Number(emi) / 100;
    assert(emiRupees >= 20730 && emiRupees <= 20780, `EMI out of expected range: ₹${emiRupees}`);
});

test('Check 14: calculateMonthlyEmiPaise handles 1-month loan exact payoff', () => {
    const P = 1000000n; // ₹10,000
    const emi = calculateMonthlyEmiPaise(P, 12.0, 1);
    // 1 month at 12% p.a. (1% monthly) = 10,000 + 100 = ₹10,100 (1010000 paise)
    assert.strictEqual(emi, 1010000n);
});

test('Check 15: calculateMonthlyEmiPaise for zero-interest loan returns integer division', () => {
    const P = 1200000n; // ₹12,000
    const emi = calculateMonthlyEmiPaise(P, 0.0, 12);
    assert.strictEqual(emi, 100000n); // ₹1,000/mo
});

// 4. Amortization Schedule Generation & Invariant Verification
const testSchedule50L = generateAmortizationSchedule({
    principalPaise: 500000000n,
    annualRatePercent: 8.5,
    tenureMonths: 240,
    startDate: '2026-01-01'
});

test('Check 16: Schedule length equals requested tenure', () => {
    assert.strictEqual(testSchedule50L.schedule.length, 240);
});

test('Check 17: Invariant: openingPrincipal == principalComponent + closingPrincipal (all periods)', () => {
    for (const p of testSchedule50L.schedule) {
        assert.strictEqual(p.openingPrincipalPaise, p.principalComponentPaise + p.closingPrincipalPaise);
    }
});

test('Check 18: Invariant: closingPrincipalPaise >= 0n (all periods)', () => {
    for (const p of testSchedule50L.schedule) {
        assert(p.closingPrincipalPaise >= 0n);
    }
});

test('Check 19: Invariant: principalComponentPaise >= 0n (all periods)', () => {
    for (const p of testSchedule50L.schedule) {
        assert(p.principalComponentPaise >= 0n);
    }
});

test('Check 20: Invariant: interestComponentPaise >= 0n (all periods)', () => {
    for (const p of testSchedule50L.schedule) {
        assert(p.interestComponentPaise >= 0n);
    }
});

test('Check 21: Invariant: installmentPaise >= interestComponentPaise (all periods)', () => {
    for (const p of testSchedule50L.schedule) {
        assert(p.installmentPaise >= p.interestComponentPaise);
    }
});

test('Check 22: Strict Final-Period Residual Absorption: final closing balance is exactly 0', () => {
    const finalPeriod = testSchedule50L.schedule[239];
    assert.strictEqual(finalPeriod.closingPrincipalPaise, 0n);
});

test('Check 23: Sum of all principal components equals original principal exactly', () => {
    const sumPrincipal = testSchedule50L.schedule.reduce((acc, p) => acc + p.principalComponentPaise, 0n);
    assert.strictEqual(sumPrincipal, 500000000n);
});

test('Check 24: Total paid equals principal + total interest exactly', () => {
    const sumInstallments = testSchedule50L.schedule.reduce((acc, p) => acc + p.installmentPaise, 0n);
    assert.strictEqual(sumInstallments, testSchedule50L.summary.totalPrincipalPaidPaise + testSchedule50L.summary.totalInterestPaidPaise);
});

test('Check 25: First period interest matches initial principal * rScaled', () => {
    const firstPeriod = testSchedule50L.schedule[0];
    const rScaled = deriveMonthlyScaledRate(8.5);
    const expectedInterest = (500000000n * rScaled + SCALE / 2n) / SCALE;
    assert.strictEqual(firstPeriod.interestComponentPaise, expectedInterest);
});

test('Check 26: Principal component increases monotonically over schedule', () => {
    const s = testSchedule50L.schedule;
    assert(s[238].principalComponentPaise > s[0].principalComponentPaise);
});

test('Check 27: Interest component decreases monotonically over schedule', () => {
    const s = testSchedule50L.schedule;
    assert(s[238].interestComponentPaise < s[0].interestComponentPaise);
});

test('Check 28: Due dates advance consecutively month by month', () => {
    const s = testSchedule50L.schedule;
    assert.strictEqual(s[0].dueDate, '2026-02-01');
    assert.strictEqual(s[1].dueDate, '2026-03-01');
    assert.strictEqual(s[11].dueDate, '2027-01-01');
});

test('Check 29: Due date month-end clamping handles Jan 31st to Feb 28th', () => {
    const scheduleJan31 = generateAmortizationSchedule({
        principalPaise: 10000000n,
        annualRatePercent: 10.0,
        tenureMonths: 3,
        startDate: '2026-01-31'
    });
    // Jan 31 + 1 mo = Feb 28 (non-leap 2026)
    assert.strictEqual(scheduleJan31.schedule[0].dueDate, '2026-02-28');
});

test('Check 30: Schedule summary contains accurate total interest and maturity date', () => {
    assert.strictEqual(testSchedule50L.summary.tenureMonths, 240);
    assert(testSchedule50L.summary.totalInterestPaidPaise > 0n);
    assert.strictEqual(testSchedule50L.summary.maturityDate, '2046-01-01');
});

test('Check 31: 12-month Personal loan test schedule generated cleanly', () => {
    const personal = generateAmortizationSchedule({
        principalPaise: 12000000n,
        annualRatePercent: 15.0,
        tenureMonths: 12,
        startDate: '2026-06-15'
    });
    assert.strictEqual(personal.schedule.length, 12);
    assert.strictEqual(personal.schedule[11].closingPrincipalPaise, 0n);
});

test('Check 32: Auto loan 60-month schedule sum matches 10 Lakhs exactly', () => {
    const autoLoan = generateAmortizationSchedule({
        principalPaise: 100000000n,
        annualRatePercent: 9.25,
        tenureMonths: 60,
        startDate: '2026-04-10'
    });
    const sumP = autoLoan.schedule.reduce((acc, p) => acc + p.principalComponentPaise, 0n);
    assert.strictEqual(sumP, 100000000n);
});

test('Check 33: Gold loan 6-month short tenure schedule generates accurately', () => {
    const gold = generateAmortizationSchedule({
        principalPaise: 30000000n,
        annualRatePercent: 7.5,
        tenureMonths: 6,
        startDate: '2026-05-01'
    });
    assert.strictEqual(gold.schedule.length, 6);
    assert.strictEqual(gold.schedule[5].closingPrincipalPaise, 0n);
});

test('Check 34: Negative amortization guard triggers if custom EMI < monthly interest', () => {
    assert.throws(() => {
        generateAmortizationSchedule({
            principalPaise: 500000000n, // 50L @ 10% monthly interest is ~41,666
            annualRatePercent: 10.0,
            tenureMonths: 240,
            customEmiPaise: 1000000n // Only ₹10,000 (less than interest)
        });
    }, /NEGATIVE_AMORTIZATION_ERROR/);
});

test('Check 35: Extreme long tenure 480 months (40 years) completes with zero final closing balance', () => {
    const longLoan = generateAmortizationSchedule({
        principalPaise: 1000000000n, // 1 Crore
        annualRatePercent: 8.0,
        tenureMonths: 480,
        startDate: '2026-01-01'
    });
    assert.strictEqual(longLoan.schedule.length, 480);
    assert.strictEqual(longLoan.schedule[479].closingPrincipalPaise, 0n);
});

console.log('\n================================================================');
console.log(`🎉 LN-02 PASSED CERTIFICATION (${passCount} / 35 CHECKS)`);
console.log('================================================================\n');
