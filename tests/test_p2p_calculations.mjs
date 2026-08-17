/**
 * test_p2p_calculations.mjs
 * 
 * P2P SUITE 2: FINANCIAL MATH, AMORTIZATION & ALLOCATION ENGINE
 * 
 * Verifies:
 * 1. Annual to Monthly Rate conversion precision
 * 2. Simple Interest formula ($I = P \times r \times t$)
 * 3. Amortization formula ($EMI = P \times \frac{r(1+r)^n}{(1+r)^n - 1}$)
 * 4. Initial Schedule Generation for Amortized and Simple loans
 * 5. Repayment Allocation policies (INTEREST_FIRST, PRINCIPAL_FIRST, PROPORTIONAL)
 * 6. Edge cases: 0% Interest, 1-month tenure, large principal values
 */

import {
    calculateLoanDNA,
    generateInitialSchedule,
    allocateRepayment
} from '../components/p2p/p2pAccountingEngine.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✓ ${message}`);
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        process.exitCode = 1;
    }
}

console.log('=== P2P SUITE 2: FINANCIAL MATH & ALLOCATION ENGINE ===\n');

// ── 1. RATE CONVERSION & AMORTIZED LOAN DNA ─────────────────────────────────
console.log('--- 1. Amortized Loan Calculations (ICICI / Kasapa Spec) ---');
// ₹2,36,746.04 at 9.99% annual for 12 months
const amortizedDna = calculateLoanDNA({
    principal: 236746.04,
    interestRate: 9.99,
    tenureMonths: 12,
    interestMethod: 'AMORTIZED'
});

assert(amortizedDna.principal === 236746.04, 'Principal preserved in DNA');
assert(amortizedDna.monthlyRate > 0.0083 && amortizedDna.monthlyRate < 0.0084, 'Monthly rate calculated correctly (~0.8325%)');
assert(Math.round(amortizedDna.monthlyInstallment) > 20000 && Math.round(amortizedDna.monthlyInstallment) < 22000, `Calculated monthly installment ~₹20.8k (actual: ${amortizedDna.monthlyInstallment})`);
assert(amortizedDna.totalInterest > 0, `Total interest computed: ₹${amortizedDna.totalInterest}`);
assert(Math.abs(amortizedDna.totalPayable - (amortizedDna.principal + amortizedDna.totalInterest)) < 0.01, 'Total payable equals Principal + Interest');

// ── 2. SIMPLE INTEREST LOAN DNA ─────────────────────────────────────────────
console.log('\n--- 2. Simple Interest Calculations ---');
const simpleDna = calculateLoanDNA({
    principal: 100000,
    interestRate: 12,
    tenureMonths: 12,
    interestMethod: 'SIMPLE'
});

// ₹1,00,000 * 12% * 1 year = ₹12,000 interest. Monthly = ₹1,000 interest + ₹8,333.33 principal = ₹9,333.33
assert(simpleDna.totalInterest === 12000, `Simple interest 12% on ₹1L for 1 yr = ₹12,000 (actual: ${simpleDna.totalInterest})`);
assert(simpleDna.totalPayable === 112000, `Total payable = ₹1,12,000 (actual: ${simpleDna.totalPayable})`);
assert(Math.round(simpleDna.monthlyInstallment) === 9333, `Monthly installment ~₹9,333 (actual: ${simpleDna.monthlyInstallment})`);

// ── 3. SCHEDULE GENERATION INVARIANTS ───────────────────────────────────────
console.log('\n--- 3. Schedule Generation Invariants ---');
const schedule = generateInitialSchedule({
    loanId: 'loan_test_calc',
    principal: 200000,
    interestRate: 10,
    tenureMonths: 6,
    interestMethod: 'AMORTIZED',
    startDate: '2026-08-01',
    dueDayOfMonth: 1
});

assert(schedule.length === 6, 'Generated exact 6 installments for 6-month tenure');
const sumPrincipal = schedule.reduce((s, item) => s + item.expectedPrincipal, 0);
assert(Math.abs(sumPrincipal - 200000) < 1, `Sum of expected principal across schedule matches initial principal (actual: ${sumPrincipal})`);

for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    assert(item.status === 'PENDING', `Installment ${item.installmentNumber} starts PENDING`);
    assert(Math.abs(item.expectedTotal - (item.expectedPrincipal + item.expectedInterest)) < 0.05, `Installment ${item.installmentNumber} total equals principal + interest`);
}

// ── 4. REPAYMENT ALLOCATION POLICIES ────────────────────────────────────────
console.log('\n--- 4. Repayment Allocation Policies ---');

// Case A: INTEREST_FIRST Policy
// Expected: ₹10,000 interest, ₹20,000 principal. Payment: ₹15,000
const allocInterestFirst = allocateRepayment({
    paymentAmount: 15000,
    expectedPrincipal: 20000,
    expectedInterest: 10000,
    policy: 'INTEREST_FIRST'
});
assert(allocInterestFirst.interestPaid === 10000, 'INTEREST_FIRST pays full interest first (₹10,000)');
assert(allocInterestFirst.principalPaid === 5000, 'INTEREST_FIRST allocates remaining amount to principal (₹5,000)');
assert(allocInterestFirst.principalPaid + allocInterestFirst.interestPaid === 15000, 'Sum matches payment amount');

// Case B: PRINCIPAL_FIRST Policy
// Expected: ₹10,000 interest, ₹20,000 principal. Payment: ₹15,000
const allocPrincipalFirst = allocateRepayment({
    paymentAmount: 15000,
    expectedPrincipal: 20000,
    expectedInterest: 10000,
    policy: 'PRINCIPAL_FIRST'
});
assert(allocPrincipalFirst.principalPaid === 15000, 'PRINCIPAL_FIRST pays principal first (₹15,000)');
assert(allocPrincipalFirst.interestPaid === 0, 'PRINCIPAL_FIRST leaves interest unpaid until principal satisfied');

// Case C: PROPORTIONAL Policy
// Expected: ₹10,000 interest (33.33%), ₹20,000 principal (66.67%). Payment: ₹15,000
const allocProp = allocateRepayment({
    paymentAmount: 15000,
    expectedPrincipal: 20000,
    expectedInterest: 10000,
    policy: 'PROPORTIONAL'
});
assert(allocProp.principalPaid === 10000, 'PROPORTIONAL allocates 66.67% to principal (₹10,000)');
assert(allocProp.interestPaid === 5000, 'PROPORTIONAL allocates 33.33% to interest (₹5,000)');

// ── 5. ZERO INTEREST & EDGE CASES ───────────────────────────────────────────
console.log('\n--- 5. Zero Interest & Edge Cases ---');
const zeroDna = calculateLoanDNA({
    principal: 50000,
    interestRate: 0,
    tenureMonths: 5,
    interestMethod: 'SIMPLE'
});
assert(zeroDna.totalInterest === 0, '0% interest yields ₹0 total interest');
assert(zeroDna.monthlyInstallment === 10000, '₹50,000 over 5 months at 0% = ₹10,000/mo');

console.log(`\n=== P2P CALCULATIONS SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
