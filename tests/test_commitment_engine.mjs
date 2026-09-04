/**
 * tests/test_commitment_engine.mjs
 * 
 * Master Test Suite for Recurring Commitments Domain Engine.
 * Covers:
 * - BigInt integer division with half-up rounding policy
 * - All recurrence normalizations (Weekly, Fortnightly, Monthly, Quarterly, Half-Yearly, Yearly)
 * - Deterministic occurrence generation, month-end clamping, and leap years
 * - Exact ₹1,42,500 demo fixture assertion (14250000 paise & 171000000 yearly paise)
 * - Lifecycle state machine and immutable past history on cancellation
 * - Confidence-based ledger matcher (Strong, Medium requires confirmation, Weak)
 */

import assert from 'assert';
import {
    FinancialNature,
    CommitmentType,
    AmountMode,
    RecurrenceFrequency,
    CommitmentStatus,
    PaymentOccurrenceStatus,
    LedgerMatchConfidence,
    createMoneyPaise,
    rupeesToMoneyPaise,
    moneyToBigInt,
    formatMoneyPaise,
    validateCommitment
} from '../services/commitments/commitmentContracts.js';

import {
    bigIntDivRound,
    normalizeToMonthlyPaise,
    normalizeToYearlyPaise,
    computeCommitmentMetrics
} from '../services/commitments/commitmentCalculator.js';

import {
    isLeapYear,
    getDaysInMonth,
    getNextOccurrenceDate
} from '../services/commitments/commitmentDateUtils.js';

import {
    generateOccurrences,
    recordPaymentOccurrence,
    skipPaymentOccurrence,
    cancelCommitmentWithOccurrences,
    pauseCommitment,
    resumeCommitment,
    matchTransactionToOccurrence
} from '../services/commitments/commitmentEngine.js';

import { buildDemoFixtures } from '../services/commitments/commitmentsService.js';

console.log('--- START TEST SUITE: COMMITMENT ENGINE INVARIANTS ---');
let assertionsPassed = 0;

function it(desc, fn) {
    fn();
    assertionsPassed++;
    console.log(`  ✓ ${desc}`);
}

// ── 1. BigInt Math & MoneyPaise Serialization ──
it('creates valid MoneyPaise with integer string representation', () => {
    const m1 = createMoneyPaise(64900);
    assert.strictEqual(m1.paise, '64900');
    assert.strictEqual(m1.currency, 'INR');

    const m2 = rupeesToMoneyPaise(649);
    assert.strictEqual(m2.paise, '64900');

    // Safe for JSON
    const serialized = JSON.stringify(m2);
    const parsed = JSON.parse(serialized);
    assert.strictEqual(parsed.paise, '64900');

    // Deserializes to BigInt
    const bi = moneyToBigInt(parsed);
    assert.strictEqual(bi, 64900n);
});

it('rejects negative or invalid monetary values', () => {
    assert.throws(() => createMoneyPaise(-500), /non-negative/);
    assert.throws(() => createMoneyPaise('abc'), /Invalid paise/);
    assert.throws(() => rupeesToMoneyPaise(-10), /non-negative/);
});

// ── 2. Safe BigInt Half-Up Division ──
it('executes exact half-up integer division', () => {
    // 10 / 3 = 3.333 -> 3
    assert.strictEqual(bigIntDivRound(10n, 3n), 3n);
    // 11 / 3 = 3.666 -> 4
    assert.strictEqual(bigIntDivRound(11n, 3n), 4n);
    // 25 / 10 = 2.5 -> 3 (half-up)
    assert.strictEqual(bigIntDivRound(25n, 10n), 3n);
    // 24 / 10 = 2.4 -> 2
    assert.strictEqual(bigIntDivRound(24n, 10n), 2n);

    // Rejects non-positive denominator
    assert.throws(() => bigIntDivRound(100n, 0n), /Denominator must be positive/);
    assert.throws(() => bigIntDivRound(100n, -2n), /Denominator must be positive/);
});

// ── 3. Exact Normalization across all 6 frequencies ──
it('normalizes Weekly, Fortnightly, Monthly, Quarterly, Half-Yearly, Yearly', () => {
    // ₹1,000 weekly -> round(1000 * 52 / 12) = round(4333.33) = ₹4,333
    const weekly = rupeesToMoneyPaise(1000);
    const weeklyMonthly = normalizeToMonthlyPaise(weekly, RecurrenceFrequency.WEEKLY);
    assert.strictEqual(weeklyMonthly.paise, '433333');

    // ₹2,000 fortnightly -> round(2000 * 26 / 12) = round(4333.33) = ₹4,333
    const fortnightly = rupeesToMoneyPaise(2000);
    const fortMonthly = normalizeToMonthlyPaise(fortnightly, RecurrenceFrequency.FORTNIGHTLY);
    assert.strictEqual(fortMonthly.paise, '433333');

    // ₹649 monthly -> ₹649
    const monthly = rupeesToMoneyPaise(649);
    const monMonthly = normalizeToMonthlyPaise(monthly, RecurrenceFrequency.MONTHLY);
    assert.strictEqual(monMonthly.paise, '64900');

    // ₹30,000 quarterly -> round(30000 / 3) = ₹10,000
    const quarterly = rupeesToMoneyPaise(30000);
    const qtrMonthly = normalizeToMonthlyPaise(quarterly, RecurrenceFrequency.QUARTERLY);
    assert.strictEqual(qtrMonthly.paise, '1000000');

    // ₹60,000 half-yearly -> round(60000 / 6) = ₹10,000
    const halfYearly = rupeesToMoneyPaise(60000);
    const hyMonthly = normalizeToMonthlyPaise(halfYearly, RecurrenceFrequency.HALF_YEARLY);
    assert.strictEqual(hyMonthly.paise, '1000000');

    // ₹24,000 yearly -> round(24000 / 12) = ₹2,000
    const yearly = rupeesToMoneyPaise(24000);
    const yrMonthly = normalizeToMonthlyPaise(yearly, RecurrenceFrequency.YEARLY);
    assert.strictEqual(yrMonthly.paise, '200000');

    // Yearly normalizations
    assert.strictEqual(normalizeToYearlyPaise(weekly, RecurrenceFrequency.WEEKLY).paise, '5200000');
    assert.strictEqual(normalizeToYearlyPaise(fortnightly, RecurrenceFrequency.FORTNIGHTLY).paise, '5200000');
    assert.strictEqual(normalizeToYearlyPaise(monthly, RecurrenceFrequency.MONTHLY).paise, '778800'); // 649 * 12 = 7788
    assert.strictEqual(normalizeToYearlyPaise(quarterly, RecurrenceFrequency.QUARTERLY).paise, '12000000'); // 30000 * 4 = 120000
    assert.strictEqual(normalizeToYearlyPaise(halfYearly, RecurrenceFrequency.HALF_YEARLY).paise, '12000000'); // 60000 * 2 = 120000
    assert.strictEqual(normalizeToYearlyPaise(yearly, RecurrenceFrequency.YEARLY).paise, '2400000');
});

// ── 4. Deterministic Calendar Stepping & Month-End Clamp ──
it('handles month-end clamping and leap years deterministically', () => {
    assert.strictEqual(isLeapYear(2024), true);
    assert.strictEqual(isLeapYear(2026), false);
    assert.strictEqual(isLeapYear(2000), true);
    assert.strictEqual(isLeapYear(1900), false);

    assert.strictEqual(getDaysInMonth(2024, 2), 29);
    assert.strictEqual(getDaysInMonth(2026, 2), 28);

    // Step from 31 Jan 2026 monthly -> clamps to 28 Feb
    const febNext = getNextOccurrenceDate('2026-01-31', RecurrenceFrequency.MONTHLY, 31);
    assert.strictEqual(febNext, '2026-02-28');

    // Step from 28 Feb 2026 monthly with targetDay 31 -> restores to 31 Mar (never decays to 28!)
    const marNext = getNextOccurrenceDate('2026-02-28', RecurrenceFrequency.MONTHLY, 31);
    assert.strictEqual(marNext, '2026-03-31');

    // On leap year 2024: 31 Jan -> 29 Feb
    const febLeap = getNextOccurrenceDate('2024-01-31', RecurrenceFrequency.MONTHLY, 31);
    assert.strictEqual(febLeap, '2024-02-29');
});

// ── 5. Exact Demo Fixture Invariant ──
it('mathematically calculates the exact ₹1,42,500 monthly and ₹17,10,000 yearly demo baseline', () => {
    const { commitments, occurrences } = buildDemoFixtures('2026-09-04');
    
    // Exactly 18 commitments
    assert.strictEqual(commitments.length, 18);

    // Compute metrics
    const metrics = computeCommitmentMetrics(commitments, occurrences, '2026-09-04');

    // Assert monthly committed = ₹1,42,500 (14250000 paise)
    assert.strictEqual(metrics.monthlyCommitted.paise, '14250000');

    // Assert yearly committed = ₹17,10,000 (171000000 paise)
    assert.strictEqual(metrics.yearlyCommitted.paise, '171000000');

    // Assert overdue = ₹12,000 (1200000 paise)
    assert.strictEqual(metrics.overdue.paise, '1200000');

    // Assert next due is in 2 days (Apartment Maintenance or Home Loan on 5 Sep)
    assert.ok(metrics.nextDue !== null);
    assert.strictEqual(metrics.nextDue.daysRemaining, 1); // 2026-09-05 vs 2026-09-04
});

// ── 6. Deterministic Occurrence Generation & Idempotency ──
it('generates occurrences deterministically without recreating or deleting', () => {
    const testCommitment = {
        id: 'c_test_sub',
        name: 'Test Sub',
        type: CommitmentType.SUBSCRIPTION,
        financialNature: FinancialNature.EXPENSE,
        amountMode: AmountMode.FIXED,
        amount: rupeesToMoneyPaise(500),
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: '2026-08-01',
        nextDueDate: '2026-08-01',
        status: CommitmentStatus.ACTIVE,
        version: 1
    };

    const firstRun = generateOccurrences({
        commitment: testCommitment,
        existingOccurrences: [],
        startDate: '2026-08-01',
        endDate: '2026-10-31',
        asOfDate: '2026-09-04'
    });

    // 3 occurrences: 2026-08-01, 2026-09-01, 2026-10-01
    assert.strictEqual(firstRun.length, 3);
    assert.strictEqual(firstRun[0].scheduledDate, '2026-08-01');
    assert.strictEqual(firstRun[0].status, PaymentOccurrenceStatus.OVERDUE); // August is past
    assert.strictEqual(firstRun[1].status, PaymentOccurrenceStatus.OVERDUE); // Sep 1 is past
    assert.strictEqual(firstRun[2].status, PaymentOccurrenceStatus.UPCOMING); // Oct 1 is future

    // Re-running with existing occurrences must be 100% idempotent
    const secondRun = generateOccurrences({
        commitment: testCommitment,
        existingOccurrences: firstRun,
        startDate: '2026-08-01',
        endDate: '2026-10-31',
        asOfDate: '2026-09-04'
    });
    assert.strictEqual(secondRun.length, 3);
    assert.strictEqual(secondRun[0].id, firstRun[0].id);
});

// ── 7. Payment Recording & Skipping ──
it('records actual payment and preserves historical immutability', () => {
    const occ = {
        id: 'occ_101',
        commitmentId: 'c_1',
        expectedAmount: rupeesToMoneyPaise(649),
        status: PaymentOccurrenceStatus.UPCOMING,
        scheduledDate: '2026-09-08'
    };

    const paid = recordPaymentOccurrence(occ, {
        actualPaidDate: '2026-09-08',
        actualAmount: rupeesToMoneyPaise(649),
        transactionId: 'tx_bank_999'
    });

    assert.strictEqual(paid.status, PaymentOccurrenceStatus.PAID);
    assert.strictEqual(paid.actualPaidDate, '2026-09-08');
    assert.strictEqual(paid.transactionId, 'tx_bank_999');

    // Cannot pay twice
    assert.throws(() => recordPaymentOccurrence(paid), /already been paid/);
});

// ── 8. Cancellation Preserves History ──
it('cancelling commitment marks future occurrences CANCELLED while preserving past history', () => {
    const commitment = {
        id: 'c_gym',
        name: 'Gym',
        type: CommitmentType.MEMBERSHIP,
        financialNature: FinancialNature.EXPENSE,
        amountMode: AmountMode.FIXED,
        amount: rupeesToMoneyPaise(1000),
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: '2026-07-01',
        nextDueDate: '2026-07-01',
        status: CommitmentStatus.ACTIVE,
        version: 1
    };

    const occurrences = [
        { id: 'o1', commitmentId: 'c_gym', scheduledDate: '2026-07-01', status: PaymentOccurrenceStatus.PAID },
        { id: 'o2', commitmentId: 'c_gym', scheduledDate: '2026-08-01', status: PaymentOccurrenceStatus.OVERDUE },
        { id: 'o3', commitmentId: 'c_gym', scheduledDate: '2026-09-15', status: PaymentOccurrenceStatus.UPCOMING },
        { id: 'o4', commitmentId: 'c_gym', scheduledDate: '2026-10-15', status: PaymentOccurrenceStatus.UPCOMING }
    ];

    const { updatedCommitment, updatedOccurrences } = cancelCommitmentWithOccurrences(commitment, occurrences, '2026-09-04');

    assert.strictEqual(updatedCommitment.status, CommitmentStatus.CANCELLED);
    // Past Paid occurrence is strictly unchanged
    assert.strictEqual(updatedOccurrences[0].status, PaymentOccurrenceStatus.PAID);
    // Past Overdue occurrence is strictly unchanged
    assert.strictEqual(updatedOccurrences[1].status, PaymentOccurrenceStatus.OVERDUE);
    // Future upcoming occurrences are CANCELLED, NOT deleted
    assert.strictEqual(updatedOccurrences[2].status, PaymentOccurrenceStatus.CANCELLED);
    assert.strictEqual(updatedOccurrences[3].status, PaymentOccurrenceStatus.CANCELLED);
    assert.strictEqual(updatedOccurrences.length, 4);
});

// ── 9. Ledger Matching Confidence Tiers ──
it('enforces confidence tiers: Strong auto-link, Medium user confirmation, Weak no auto-link', () => {
    const occ = {
        id: 'occ_netflix',
        commitmentId: 'c_netflix',
        commitmentName: 'Netflix',
        paymentAccountId: 'acc_hdfc_card',
        expectedAmount: rupeesToMoneyPaise(649),
        scheduledDate: '2026-09-08'
    };

    // 1. Strong: Exact transactionId match
    const occWithTx = { ...occ, transactionId: 'tx_exact_123' };
    const strongMatch = matchTransactionToOccurrence(occWithTx, { id: 'tx_exact_123' });
    assert.strictEqual(strongMatch.match, true);
    assert.strictEqual(strongMatch.confidence, LedgerMatchConfidence.STRONG);

    // 2. Medium: Same account + same amount + date within 2 days
    const mediumTx = {
        id: 'tx_med_456',
        accountId: 'acc_hdfc_card',
        amountPaise: '64900',
        date: '2026-09-09'
    };
    const mediumMatch = matchTransactionToOccurrence(occ, mediumTx);
    assert.strictEqual(mediumMatch.match, true);
    assert.strictEqual(mediumMatch.confidence, LedgerMatchConfidence.MEDIUM);
    assert.ok(mediumMatch.reason.includes('requires user confirmation'));

    // 3. Weak: Description similarity only
    const weakTx = {
        id: 'tx_weak_789',
        accountId: 'other_acc',
        amountPaise: '75000', // different amount
        date: '2026-09-20',
        description: 'Netflix Entertainment Services Mumbai'
    };
    const weakMatch = matchTransactionToOccurrence(occ, weakTx);
    assert.strictEqual(weakMatch.match, true);
    assert.strictEqual(weakMatch.confidence, LedgerMatchConfidence.WEAK);
    assert.ok(weakMatch.reason.includes('explicit user confirmation'));
});

console.log(`\n--- ALL ${assertionsPassed} COMMITMENT ENGINE ASSERTIONS PASSED ---\n`);
