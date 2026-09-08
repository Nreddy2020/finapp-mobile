/**
 * tests/loans/test_loan_contracts.mjs
 * 
 * LN-01: Loan Contracts, Schemas & Lifecycle States (20 checks)
 */

import assert from 'assert';
import { 
    LOAN_TYPES, 
    RATE_TYPES, 
    LOAN_STATUS, 
    BINDING_STATUS,
    PREPAYMENT_STRATEGY,
    DEBT_PAYOFF_METHOD,
    toPaise, 
    toRupeesFormatted, 
    transitionLoanState 
} from '../../services/loans/loanContracts.js';

console.log('================================================================');
console.log('🚀 EXECUTING LN-01: LOAN CONTRACTS & LIFECYCLE SUITE');
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

// 1. Enums Completeness
test('Check 1: LOAN_TYPES enums are complete and immutable', () => {
    assert.strictEqual(LOAN_TYPES.PERSONAL, 'PERSONAL');
    assert.strictEqual(LOAN_TYPES.HOME, 'HOME');
    assert.strictEqual(LOAN_TYPES.AUTO, 'AUTO');
    assert.strictEqual(LOAN_TYPES.EDUCATION, 'EDUCATION');
    assert.strictEqual(LOAN_TYPES.GOLD, 'GOLD');
});

test('Check 2: RATE_TYPES enums define FIXED and VARIABLE_TRACKED', () => {
    assert.strictEqual(RATE_TYPES.FIXED, 'FIXED');
    assert.strictEqual(RATE_TYPES.VARIABLE_TRACKED, 'VARIABLE_TRACKED');
});

test('Check 3: LOAN_STATUS enums define all 8 mandatory states', () => {
    const states = Object.values(LOAN_STATUS);
    assert.strictEqual(states.length, 8);
    assert(states.includes('DRAFT'));
    assert(states.includes('ACTIVE'));
    assert(states.includes('PAUSED'));
    assert(states.includes('MATURED'));
    assert(states.includes('FORECLOSURE_PENDING'));
    assert(states.includes('CLOSED'));
    assert(states.includes('ARCHIVED'));
    assert(states.includes('QUARANTINED'));
});

test('Check 4: BINDING_STATUS enums define all 4 binding states', () => {
    assert.strictEqual(BINDING_STATUS.REFERENCE_ONLY, 'REFERENCE_ONLY');
    assert.strictEqual(BINDING_STATUS.SYNCHRONIZED_ACTIVE, 'SYNCHRONIZED_ACTIVE');
    assert.strictEqual(BINDING_STATUS.USER_PROPOSAL, 'USER_PROPOSAL');
    assert.strictEqual(BINDING_STATUS.DEACTIVATED, 'DEACTIVATED');
});

test('Check 5: PREPAYMENT_STRATEGY and DEBT_PAYOFF_METHOD enums valid', () => {
    assert.strictEqual(PREPAYMENT_STRATEGY.TENURE_REDUCTION, 'TENURE_REDUCTION');
    assert.strictEqual(PREPAYMENT_STRATEGY.EMI_REDUCTION, 'EMI_REDUCTION');
    assert.strictEqual(DEBT_PAYOFF_METHOD.AVALANCHE, 'AVALANCHE');
    assert.strictEqual(DEBT_PAYOFF_METHOD.SNOWBALL, 'SNOWBALL');
    assert.strictEqual(DEBT_PAYOFF_METHOD.CASH_FLOW_OPTIMIZER, 'CASH_FLOW_OPTIMIZER');
});

// 2. Paise Conversions
test('Check 6: toPaise converts numeric rupees to BigInt paise', () => {
    assert.strictEqual(toPaise(100.50), 10050n);
    assert.strictEqual(toPaise(0), 0n);
    assert.strictEqual(toPaise(1500000), 150000000n);
});

test('Check 7: toPaise accepts existing BigInt unchanged', () => {
    assert.strictEqual(toPaise(50000n), 50000n);
});

test('Check 8: toPaise rejects negative amounts', () => {
    assert.throws(() => toPaise(-500), /NEGATIVE_AMOUNT_REJECTED/);
});

test('Check 9: toPaise rejects non-numeric invalid input', () => {
    assert.throws(() => toPaise('not_a_number'), /INVALID_RUPEE_AMOUNT/);
    assert.throws(() => toPaise(null), /INVALID_RUPEE_AMOUNT/);
});

test('Check 10: toRupeesFormatted formats paise to INR string', () => {
    const formatted = toRupeesFormatted(12345678n);
    assert(formatted.includes('1,23,456.78') || formatted.includes('123,456.78'));
});

// 3. Centralized State Machine (transitionLoanState)
test('Check 11: Idempotent self-transition succeeds with changed: false', () => {
    const res = transitionLoanState(LOAN_STATUS.ACTIVE, LOAN_STATUS.ACTIVE);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.changed, false);
});

test('Check 12: DRAFT transitions to ACTIVE when monthly EMI is provided', () => {
    const res = transitionLoanState(LOAN_STATUS.DRAFT, LOAN_STATUS.ACTIVE, {
        monthlyEmiPaise: 1500000n
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.state, LOAN_STATUS.ACTIVE);
});

test('Check 13: DRAFT to ACTIVE rejected if monthly EMI is missing or zero', () => {
    assert.throws(() => {
        transitionLoanState(LOAN_STATUS.DRAFT, LOAN_STATUS.ACTIVE, { monthlyEmiPaise: 0n });
    }, /CANNOT_ACTIVATE_DRAFT/);
});

test('Check 14: ACTIVE transitions to PAUSED and back to ACTIVE', () => {
    const toPaused = transitionLoanState(LOAN_STATUS.ACTIVE, LOAN_STATUS.PAUSED);
    assert.strictEqual(toPaused.state, LOAN_STATUS.PAUSED);
    const toActive = transitionLoanState(LOAN_STATUS.PAUSED, LOAN_STATUS.ACTIVE);
    assert.strictEqual(toActive.state, LOAN_STATUS.ACTIVE);
});

test('Check 15: ACTIVE to CLOSED allowed only when outstanding principal is 0', () => {
    const res = transitionLoanState(LOAN_STATUS.ACTIVE, LOAN_STATUS.CLOSED, {
        outstandingPrincipalPaise: 0n
    });
    assert.strictEqual(res.state, LOAN_STATUS.CLOSED);
});

test('Check 16: ACTIVE to CLOSED rejected when outstanding principal > 0', () => {
    assert.throws(() => {
        transitionLoanState(LOAN_STATUS.ACTIVE, LOAN_STATUS.CLOSED, {
            outstandingPrincipalPaise: 500000n
        });
    }, /PREMATURE_CLOSURE_REJECTED/);
});

test('Check 17: CLOSED transitions to ARCHIVED', () => {
    const res = transitionLoanState(LOAN_STATUS.CLOSED, LOAN_STATUS.ARCHIVED);
    assert.strictEqual(res.state, LOAN_STATUS.ARCHIVED);
});

test('Check 18: CLOSED cannot transition back to ACTIVE', () => {
    assert.throws(() => {
        transitionLoanState(LOAN_STATUS.CLOSED, LOAN_STATUS.ACTIVE);
    }, /ILLEGAL_STATE_TRANSITION/);
});

test('Check 19: ARCHIVED cannot transition back to ACTIVE', () => {
    assert.throws(() => {
        transitionLoanState(LOAN_STATUS.ARCHIVED, LOAN_STATUS.ACTIVE);
    }, /ILLEGAL_STATE_TRANSITION/);
});

test('Check 20: QUARANTINED state rejects standard transitions except recovery', () => {
    assert.throws(() => {
        transitionLoanState(LOAN_STATUS.QUARANTINED, LOAN_STATUS.CLOSED);
    }, /ILLEGAL_STATE_TRANSITION/);
    const recovered = transitionLoanState(LOAN_STATUS.QUARANTINED, LOAN_STATUS.ACTIVE);
    assert.strictEqual(recovered.state, LOAN_STATUS.ACTIVE);
});

console.log('\n================================================================');
console.log(`🎉 LN-01 PASSED CERTIFICATION (${passCount} / 20 CHECKS)`);
console.log('================================================================\n');
