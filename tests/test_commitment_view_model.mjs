/**
 * tests/test_commitment_view_model.mjs
 * 
 * Master Test Suite for Recurring Commitments Presentation Adapter.
 * Covers:
 * - Zero arithmetic in presentation layer
 * - Pixel-accurate formatted INR strings (₹1,42,500, ₹17,10,000, ₹12,000)
 * - Category filter partitioning (All, Subscriptions, Loans, Bills, Annual)
 * - Upcoming chronological sorting & days remaining countdowns
 * - Empty state integrity in production mode
 */

import assert from 'assert';
import {
    FilterPill,
    PeriodFilter,
    buildRecurringCommitmentsViewModel,
    getCommitmentVisualMeta
} from '../services/commitments/commitmentViewModel.js';

import { buildDemoFixtures } from '../services/commitments/commitmentsService.js';
import { CommitmentType, RecurrenceFrequency } from '../services/commitments/commitmentContracts.js';

console.log('--- START TEST SUITE: COMMITMENT VIEW MODEL TRUTH ---');
let assertionsPassed = 0;

function it(desc, fn) {
    fn();
    assertionsPassed++;
    console.log(`  ✓ ${desc}`);
}

const { commitments, occurrences } = buildDemoFixtures('2026-09-04');

// ── 1. Hero Card Financial Truth ──
it('formats hero card metrics with exact Indian currency numbering and zero math in UI', () => {
    const vm = buildRecurringCommitmentsViewModel({
        commitments,
        occurrences,
        asOfDate: '2026-09-04',
        appMode: 'DEMO'
    });

    assert.strictEqual(vm.hero.monthlyCommittedFormatted, '₹1,42,500');
    assert.strictEqual(vm.hero.yearlyCommittedFormatted, '₹17,10,000');
    assert.strictEqual(vm.hero.overdueFormatted, '₹12,000');
    assert.strictEqual(vm.hero.activeCountLabel, '18 Active Commitments');
    assert.strictEqual(vm.hero.hasOverdue, true);
    assert.strictEqual(vm.isEmpty, false);
});

// ── 2. Filter Pill Partitioning ──
it('partitions active commitments correctly by filter pill', () => {
    // 1. All (18 commitments)
    const vmAll = buildRecurringCommitmentsViewModel({ commitments, occurrences, activeFilter: FilterPill.ALL });
    assert.strictEqual(vmAll.activeCommitments.length, 18);

    // 2. Subscriptions
    const vmSubs = buildRecurringCommitmentsViewModel({ commitments, occurrences, activeFilter: FilterPill.SUBSCRIPTIONS });
    assert.ok(vmSubs.activeCommitments.length >= 4);
    assert.ok(vmSubs.activeCommitments.every(c => c.type === CommitmentType.SUBSCRIPTION));

    // 3. Loans
    const vmLoans = buildRecurringCommitmentsViewModel({ commitments, occurrences, activeFilter: FilterPill.LOANS });
    assert.strictEqual(vmLoans.activeCommitments.length, 2); // Home loan & Car loan
    assert.ok(vmLoans.activeCommitments.every(c => c.type === CommitmentType.LOAN_EMI));

    // 4. Bills
    const vmBills = buildRecurringCommitmentsViewModel({ commitments, occurrences, activeFilter: FilterPill.BILLS });
    assert.ok(vmBills.activeCommitments.length >= 5);
    assert.ok(vmBills.activeCommitments.every(c => c.type === CommitmentType.UTILITY_BILL || c.type === CommitmentType.RENT));

    // 5. Annual
    const vmAnnual = buildRecurringCommitmentsViewModel({ commitments, occurrences, activeFilter: FilterPill.ANNUAL });
    assert.ok(vmAnnual.activeCommitments.length >= 4);
    assert.ok(vmAnnual.activeCommitments.every(c => c.rawCommitment.frequency === RecurrenceFrequency.YEARLY));
});

// ── 3. Upcoming Chronological Sorting & Countdown ──
it('sorts upcoming commitments chronologically and computes human-readable countdowns', () => {
    const vm = buildRecurringCommitmentsViewModel({
        commitments,
        occurrences,
        asOfDate: '2026-09-04'
    });

    assert.ok(vm.upcoming.length > 0);
    // Upcoming items must be in non-decreasing order of scheduled date
    for (let i = 0; i < vm.upcoming.length - 1; i++) {
        assert.ok(vm.upcoming[i].rawOccurrence.scheduledDate <= vm.upcoming[i + 1].rawOccurrence.scheduledDate);
    }

    // Earliest upcoming must be 2026-09-05 (due tomorrow / in 1 day)
    assert.strictEqual(vm.upcoming[0].rawOccurrence.scheduledDate, '2026-09-05');
    assert.ok(vm.upcoming[0].dueInLabel.includes('Tomorrow') || vm.upcoming[0].dueInLabel.includes('in 1 day'));
});

// ── 4. Normalized Monthly Display on Annual/Quarterly Items ──
it('provides normalized monthly equivalent for non-monthly commitments', () => {
    const vm = buildRecurringCommitmentsViewModel({
        commitments,
        occurrences,
        asOfDate: '2026-09-04'
    });

    const insuranceItem = vm.activeCommitments.find(c => c.name === 'Term Life Insurance');
    assert.ok(insuranceItem);
    assert.strictEqual(insuranceItem.frequencyBadge, '₹24,000 / year');
    // On the right side, it must display the normalized monthly amount: ₹2,000!
    assert.strictEqual(insuranceItem.normalizedMonthlyFormatted, '₹2,000');
    assert.strictEqual(insuranceItem.isNormalizedDifferent, true);

    const netflixItem = vm.activeCommitments.find(c => c.name === 'Netflix');
    assert.ok(netflixItem);
    assert.strictEqual(netflixItem.frequencyBadge, '₹649 / month');
    assert.strictEqual(netflixItem.normalizedMonthlyFormatted, '₹649');
    assert.strictEqual(netflixItem.isNormalizedDifferent, false);
});

// ── 5. Clean Empty State in Production Mode ──
it('returns clean empty state when no commitments exist in production mode', () => {
    const emptyVM = buildRecurringCommitmentsViewModel({
        commitments: [],
        occurrences: [],
        asOfDate: '2026-09-04',
        appMode: 'PRODUCTION'
    });

    assert.strictEqual(emptyVM.isEmpty, true);
    assert.strictEqual(emptyVM.hero.monthlyCommittedFormatted, '₹0');
    assert.strictEqual(emptyVM.hero.yearlyCommittedFormatted, '₹0');
    assert.strictEqual(emptyVM.hero.activeCountLabel, '0 Active Commitments');
    assert.strictEqual(emptyVM.activeCommitments.length, 0);
    assert.strictEqual(emptyVM.upcoming.length, 0);
});

console.log(`\n--- ALL ${assertionsPassed} COMMITMENT VIEW MODEL ASSERTIONS PASSED ---\n`);
