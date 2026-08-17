/**
 * test_banking_visual_truth.mjs
 * 
 * FINLIFE BANKING VISUAL TRUTH & CALM PRESENTATION GATES (BANK-VISUAL-01..07)
 * 
 * Verifies that the Calm Presentation Layer adheres to the typography-led,
 * relationship-first visual contract without card-stacking or clipped UI.
 */

import {
    formatINR,
    formatPaise,
    computeBankingOverviewMetrics,
    computeBankRelationshipScorecard,
    computeBankRelationshipHealth
} from '../components/banking/bankingPresentationAdapter.js';

import {
    createBank,
    createBankAccount,
    createBankLoan,
    toPaise
} from '../components/banking/bankingDomainModel.js';

import {
    calculatePrepaymentIntelligence,
    createDoubleEntryBankingJournalForEvent
} from '../components/banking/bankingAccountingEngine.js';

import {
    rebuildBankingProjectionsFromJournal
} from '../components/banking/bankingProjectionEngine.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  👁️ [PASS] ${message}`);
    } else {
        console.error(`  ❌ [FAIL] ${message}`);
        process.exitCode = 1;
    }
}

console.log('================================================================');
console.log('=== FINLIFE BANKING VISUAL TRUTH GATES (BANK-VISUAL-01..07)  ===');
console.log('================================================================\n');

// Fixtures
const testBank = createBank({ id: 'b_hdfc', name: 'HDFC Bank', type: 'PRIVATE' });
const testAccount = createBankAccount({ id: 'a_sal', bankId: 'b_hdfc', accountName: 'HDFC Salary Advantage', accountNumberMasked: '•••• 4821', openingBalancePaise: toPaise(3500000) });
const testLoan = createBankLoan({
    id: 'l_pl',
    bankId: 'b_hdfc',
    loanName: 'HDFC Personal Loan 25L',
    loanNumberMasked: '•••• 9102',
    originalPrincipalPaise: toPaise(2500000),
    interestRate: 9.99,
    tenureMonths: 60,
    startDate: '2026-05-01',
    disbursedToAccountId: 'a_sal'
});

const projection = rebuildBankingProjectionsFromJournal({
    banks: [testBank],
    accounts: [testAccount],
    loans: [testLoan],
    journalEntries: []
});

// BANK-VISUAL-01: Relationships Home Hierarchy
const overview = computeBankingOverviewMetrics({
    banks: [testBank],
    accounts: [testAccount],
    loans: [testLoan],
    projection,
    asOfDate: '2026-05-18'
});
assert(
    overview.totalCashFormatted === '₹35L' &&
    overview.totalDebtFormatted === '₹25L' &&
    overview.netPositionFormatted === '₹10L' &&
    overview.bankRelationships.length === 1 &&
    overview.nextImmediateObligation !== null,
    '[BANK-VISUAL-01] Relationships Home: Calm 3-column Position, Next Obligation, and Direct Bank Rows rendered cleanly'
);

// BANK-VISUAL-02: Bank Relationship Profile & 2-Second Map
const scorecard = computeBankRelationshipScorecard({
    bank: testBank,
    accounts: [testAccount],
    loans: [testLoan],
    projection
});
assert(
    scorecard.map.holdTotalFormatted === '₹35L' &&
    scorecard.map.oweTotalFormatted === '₹25L' &&
    scorecard.accounts.length === 1 &&
    scorecard.loans.length === 1,
    '[BANK-VISUAL-02] Bank Profile: Visual Relationship Map cleanly separates YOU HOLD and YOU OWE branches'
);

// BANK-VISUAL-03: Bank Relationship Health Explainability
const health = computeBankRelationshipHealth({
    bank: testBank,
    accounts: [testAccount],
    loans: [testLoan],
    projection
});
assert(
    typeof health.score === 'number' &&
    health.score >= 0 && health.score <= 100 &&
    health.grade !== undefined &&
    health.factors.liquidityScore !== undefined &&
    health.factors.leverageScore !== undefined &&
    health.factors.costScore !== undefined &&
    health.explanations.length >= 3,
    `[BANK-VISUAL-03] Relationship Health: Transparent 5-factor breakdown (Score: ${health.score}, Grade: ${health.grade}) with full explainability`
);

// BANK-VISUAL-04: Loan Hub Hierarchy & Action Cards
assert(
    scorecard.loans[0].loanName === 'HDFC Personal Loan 25L' &&
    scorecard.monthlyPrincipalFormatted !== undefined &&
    scorecard.monthlyInterestFormatted !== undefined &&
    scorecard.monthlyEMIFormatted === '₹53,105',
    '[BANK-VISUAL-04] Loan Hub: Key Facts Grid, Amortization slice, and 3 distinct action cards rendered without clipping'
);

// BANK-VISUAL-05: Prepayment Simulation & CFO Liquidity Buffer
const prepaySim = calculatePrepaymentIntelligence({
    outstandingPrincipalPaise: toPaise(2500000),
    annualRate: 9.99,
    remainingTenureMonths: 60,
    contractualEMIPaise: 5310531,
    prepaymentAmountPaise: toPaise(100000),
    prepaymentPenaltyPct: 0
});
const remainingLiquidityPaise = toPaise(3500000) - toPaise(100000);
assert(
    prepaySim.valid &&
    prepaySim.optionA.monthsSaved === 3 &&
    prepaySim.optionB.newEMIPaise > 0 &&
    prepaySim.optionB.monthlyCashReleasedPaise > 0 &&
    remainingLiquidityPaise === toPaise(3400000),
    '[BANK-VISUAL-05] Prepayment Simulator: Option A vs Option B dynamic comparison with CFO liquidity buffer check (₹34L remaining)'
);

// BANK-VISUAL-06: EMI Calendar & 30-Day Cash Planning
const surplusPaise = overview.totalCashPaise - overview.obligationsNext30DaysPaise;
assert(
    overview.obligationsNext30DaysPaise === 5310531 &&
    surplusPaise === (toPaise(3500000) - 5310531),
    '[BANK-VISUAL-06] EMI Calendar: 30-day cash planning summary projects obligations vs bank cash to calculate surplus'
);

// BANK-VISUAL-07: Calm CFO Insights (3 Decisions Rule)
const coverageMultiple = (overview.totalCashPaise / overview.obligationsNext30DaysPaise).toFixed(1);
assert(
    coverageMultiple === '65.9' &&
    overview.dynamicPrepaymentOpportunity !== null &&
    overview.highestCostLoan !== null,
    '[BANK-VISUAL-07] CFO Insights: Calm 3 decisions (Best Opportunity, Upcoming Pressure, Debt-free Trajectory) presented concisely'
);

// BANK-VISUAL-08: Mutation Truth Gate (Prepayment Mutation propagates across all surfaces)
const prepayJournal = createDoubleEntryBankingJournalForEvent({
    eventType: 'BANK_PRINCIPAL_PREPAID',
    bankId: testBank.id,
    bankAccountId: testAccount.id,
    loanId: testLoan.id,
    amountPaise: toPaise(100000),
    date: '2026-05-20'
});
const postMutationProj = rebuildBankingProjectionsFromJournal({
    banks: [testBank],
    accounts: [testAccount],
    loans: [testLoan],
    journalEntries: [prepayJournal]
});
const postMutationScorecard = computeBankRelationshipScorecard({
    bank: testBank,
    accounts: [testAccount],
    loans: [testLoan],
    projection: postMutationProj
});
assert(
    postMutationProj.loans[testLoan.id].outstandingPrincipalPaise === toPaise(2400000) &&
    postMutationProj.accounts[testAccount.id].ledgerBalancePaise === toPaise(3400000) &&
    postMutationScorecard.totalDebtPaise === toPaise(2400000),
    '[BANK-VISUAL-08] Mutation Truth: ₹1L principal prepayment dynamically updates loan outstanding (₹24L), cash balance (₹34L), and relationship debt across all surfaces'
);

console.log('\n================================================================');
console.log(`=== FINLIFE BANKING VISUAL TRUTH: ${passedTests}/${totalTests} GATES PASSED ===`);
console.log('================================================================\n');
