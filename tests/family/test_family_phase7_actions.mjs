/**
 * tests/family/test_family_phase7_actions.mjs
 * 
 * Master Regression Suite for FinLife Family OS Phase 7:
 * Household Action & Renewal Horizon (Unified Action Horizon).
 * 
 * Verifies exactly 30 authoritative governance checks (FAM-P7-01 to FAM-P7-30)
 * incorporating all 18 architect-mandated scenarios:
 * - Deterministic pure projection engine across all 4 domains
 * - Exact date boundaries (OVERDUE, Day 0, Day 7, Day 8, Day 30, Day 31, Day 90, Day 91 excluded)
 * - Fault tolerance (invalid dates, invalid amounts, foreign households, corrupted collections)
 * - Referential integrity & ownership fallback (missing owner, deleted owner, household-wide)
 * - Single vs mixed currency aggregation rules
 * - Filter-dependent summary counts and empty filter result sets
 * - Deep-link route contracts matching registered Expo Router screens
 * - Invariant: totalActionCount equals sum of status tiers
 * - Zero-write verification across all source repositories
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

import {
    computeHouseholdActionHorizonPure,
    ActionHorizonDomain,
    ActionHorizonTier,
    ActionHorizonRole,
    ACTION_HORIZON_ROUTES,
    FamilyActionService,
    FamilyRepository
} from '../../services/family/index.js';

let passedChecks = 0;
let totalChecks = 0;

function check(id, description, fn) {
    totalChecks++;
    try {
        fn();
        passedChecks++;
        console.log('  [PASS] ' + id + ': ' + description);
    } catch (err) {
        console.error('  [FAIL] ' + id + ': ' + description);
        console.error('         ' + err.message);
        throw err;
    }
}

async function asyncCheck(id, description, fn) {
    totalChecks++;
    try {
        await fn();
        passedChecks++;
        console.log('  [PASS] ' + id + ': ' + description);
    } catch (err) {
        console.error('  [FAIL] ' + id + ': ' + description);
        console.error('         ' + err.message);
        throw err;
    }
}

console.log('=============================================================');
console.log('🚀 RUNNING PHASE 7: HOUSEHOLD ACTION & RENEWAL HORIZON SUITE');
console.log('=============================================================\n');

const REF_DATE = '2026-09-15';

// Mock Members
const memberAlice = { id: 'p_alice', personId: 'p_alice', displayName: 'Alice Sharma', role: 'HEAD' };
const memberBob = { id: 'p_bob', personId: 'p_bob', displayName: 'Bob Sharma', role: 'PARTNER' };
const mockMembers = [memberAlice, memberBob];

// 1. Synthetic multi-domain projection
check('FAM-P7-01', 'Multi-domain synthesis includes items from all 4 domains in one unified array', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        financialLinks: [{ id: 'fl_1', householdId: 'hh_main', commitmentId: 'c_rent', leadPayerPersonId: 'p_alice' }],
        commitments: [{ id: 'c_rent', name: 'Apartment Rent', amount: 35000, currency: 'INR', nextDueDate: '2026-09-20' }],
        documents: [{ id: 'doc_pass', householdId: 'hh_main', title: 'Passport Alice', status: 'ACTIVE', expiryDate: '2026-10-01', personId: 'p_alice' }],
        tasks: [{ id: 't_ac', householdId: 'hh_main', title: 'AC Service', status: 'PENDING', dueDate: '2026-09-22', assignedPersonId: 'p_bob' }],
        protectionItems: [{ id: 'prot_will', householdId: 'hh_main', title: 'Living Will', status: 'ACTIVE', reviewDate: '2026-11-01', designatedPersonId: 'p_bob' }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 4);
    const domains = new Set(result.items.map(i => i.domain));
    assert.ok(domains.has(ActionHorizonDomain.FINANCIAL));
    assert.ok(domains.has(ActionHorizonDomain.DOCUMENT));
    assert.ok(domains.has(ActionHorizonDomain.OPERATION));
    assert.ok(domains.has(ActionHorizonDomain.PROTECTION));
});

// 2. Overdue classification (daysRemaining < 0)
check('FAM-P7-02', 'Past due date (daysRemaining < 0) is strictly classified as OVERDUE', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_overdue', householdId: 'hh_main', title: 'Overdue Filter', status: 'PENDING', dueDate: '2026-09-10' }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].status, ActionHorizonTier.OVERDUE);
    assert.strictEqual(result.items[0].daysRemaining, -5);
    assert.strictEqual(result.summary.overdueCount, 1);
});

// 3. Mandated Case 1: Day 0 classified as IMMEDIATE
check('FAM-P7-03', 'Mandated Case 1: Due date equal to reference date (Day 0) is strictly classified as IMMEDIATE', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_today', householdId: 'hh_main', title: 'Due Today', status: 'PENDING', dueDate: '2026-09-15' }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].daysRemaining, 0);
    assert.strictEqual(result.items[0].status, ActionHorizonTier.IMMEDIATE);
    assert.strictEqual(result.summary.immediateCount, 1);
});

// 4. Mandated Case 2: Exactly Day 7 classified as IMMEDIATE
check('FAM-P7-04', 'Mandated Case 2: Exactly Day 7 is classified as IMMEDIATE', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_d7', householdId: 'hh_main', title: 'Due Day 7', status: 'PENDING', dueDate: '2026-09-22' }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].daysRemaining, 7);
    assert.strictEqual(result.items[0].status, ActionHorizonTier.IMMEDIATE);
});

// 5. Mandated Case 3: Exactly Day 8 classified as UPCOMING
check('FAM-P7-05', 'Mandated Case 3: Exactly Day 8 is classified as UPCOMING', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_d8', householdId: 'hh_main', title: 'Due Day 8', status: 'PENDING', dueDate: '2026-09-23' }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].daysRemaining, 8);
    assert.strictEqual(result.items[0].status, ActionHorizonTier.UPCOMING);
});

// 6. Mandated Case 4: Exactly Day 30 classified as UPCOMING
check('FAM-P7-06', 'Mandated Case 4: Exactly Day 30 is classified as UPCOMING', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_d30', householdId: 'hh_main', title: 'Due Day 30', status: 'PENDING', dueDate: '2026-10-15' }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].daysRemaining, 30);
    assert.strictEqual(result.items[0].status, ActionHorizonTier.UPCOMING);
});

// 7. Mandated Case 5: Exactly Day 31 classified as LOOKING_AHEAD
check('FAM-P7-07', 'Mandated Case 5: Exactly Day 31 is classified as LOOKING_AHEAD', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_d31', householdId: 'hh_main', title: 'Due Day 31', status: 'PENDING', dueDate: '2026-10-16' }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].daysRemaining, 31);
    assert.strictEqual(result.items[0].status, ActionHorizonTier.LOOKING_AHEAD);
});

// 8. Mandated Case 6: Exactly Day 90 included as LOOKING_AHEAD
check('FAM-P7-08', 'Mandated Case 6: Exactly Day 90 is included as LOOKING_AHEAD', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_d90', householdId: 'hh_main', title: 'Due Day 90', status: 'PENDING', dueDate: '2026-12-14' }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].daysRemaining, 90);
    assert.strictEqual(result.items[0].status, ActionHorizonTier.LOOKING_AHEAD);
});

// 9. Mandated Case 7: Day 91 strictly excluded from horizon
check('FAM-P7-09', 'Mandated Case 7: Day 91 is strictly excluded from the horizon', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_d91', householdId: 'hh_main', title: 'Due Day 91', status: 'PENDING', dueDate: '2026-12-15' }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 0);
    assert.strictEqual(result.summary.totalActionCount, 0);
});

// 10. Mandated Case 8: Invalid dates excluded without crashing
check('FAM-P7-10', 'Mandated Case 8: Records with invalid or unparseable dates are excluded without crashing', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [
            { id: 't_bad1', householdId: 'hh_main', title: 'Bad Date 1', status: 'PENDING', dueDate: 'invalid-date-format' },
            { id: 't_bad2', householdId: 'hh_main', title: 'Bad Date 2', status: 'PENDING', dueDate: null },
            { id: 't_good', householdId: 'hh_main', title: 'Good Date', status: 'PENDING', dueDate: '2026-09-20' }
        ],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].title, 'Good Date');
    assert.strictEqual(result.summary.diagnostics.skippedInvalidDate, 1);
});

// 11. Mandated Case 9: Invalid financial amounts excluded without crashing
check('FAM-P7-11', 'Mandated Case 9: Financial commitments with invalid, NaN, or negative amounts are excluded without crashing', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        financialLinks: [
            { id: 'fl_bad1', householdId: 'hh_main', commitmentId: 'c_nan', leadPayerPersonId: 'p_alice' },
            { id: 'fl_bad2', householdId: 'hh_main', commitmentId: 'c_neg', leadPayerPersonId: 'p_alice' },
            { id: 'fl_good', householdId: 'hh_main', commitmentId: 'c_good', leadPayerPersonId: 'p_alice' }
        ],
        commitments: [
            { id: 'c_nan', name: 'NaN Amt', amount: 'not_a_number', nextDueDate: '2026-09-20' },
            { id: 'c_neg', name: 'Negative Amt', amount: -500, nextDueDate: '2026-09-20' },
            { id: 'c_good', name: 'Valid Amt', amount: 1500, nextDueDate: '2026-09-20' }
        ],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].title, 'Valid Amt');
    assert.strictEqual(result.summary.diagnostics.skippedInvalidAmount, 2);
});

// 12. Mandated Case 10: Foreign household records excluded
check('FAM-P7-12', 'Mandated Case 10: Foreign household records (householdId mismatch) are excluded from horizon', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_target',
        referenceDateUtc: REF_DATE,
        tasks: [
            { id: 't_foreign', householdId: 'hh_other', title: 'Foreign Task', status: 'PENDING', dueDate: '2026-09-20' },
            { id: 't_local', householdId: 'hh_target', title: 'Local Task', status: 'PENDING', dueDate: '2026-09-20' }
        ],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].title, 'Local Task');
    assert.strictEqual(result.summary.diagnostics.skippedForeignHousehold, 1);
});

// 13. Mandated Case 11: Missing owner fallback
check('FAM-P7-13', 'Mandated Case 11: Missing owner (null) falls back to Unassigned / HOUSEHOLD with zero phantom persons', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_unassigned', householdId: 'hh_main', title: 'Unassigned Chore', status: 'PENDING', dueDate: '2026-09-20', assignedPersonId: null }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].assignedPersonId, null);
    assert.strictEqual(result.items[0].assignedPersonName, 'Unassigned');
    assert.strictEqual(result.items[0].ownershipRole, ActionHorizonRole.HOUSEHOLD);
});

// 14. Mandated Case 12: Deleted / orphaned owner fallback
check('FAM-P7-14', 'Mandated Case 12: Deleted/orphaned owner ID falls back to Unassigned / HOUSEHOLD', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_orphan', householdId: 'hh_main', title: 'Orphaned Task', status: 'PENDING', dueDate: '2026-09-20', assignedPersonId: 'p_deleted_person' }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].assignedPersonId, null);
    assert.strictEqual(result.items[0].assignedPersonName, 'Unassigned');
    assert.strictEqual(result.items[0].ownershipRole, ActionHorizonRole.HOUSEHOLD);
});

// 15. Mandated Case 13: Unlinked commitments and backup payers not treated as financial allocations
check('FAM-P7-15', 'Mandated Case 13: Unlinked commitments and backup payers are excluded from financial allocations', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        financialLinks: [
            { id: 'fl_1', householdId: 'hh_main', commitmentId: 'c_linked', leadPayerPersonId: 'p_alice', backupPayerPersonId: 'p_bob' }
        ],
        commitments: [
            { id: 'c_linked', name: 'Linked Wifi', amount: 1200, nextDueDate: '2026-09-20' },
            { id: 'c_unlinked', name: 'Unlinked Gym', amount: 3000, nextDueDate: '2026-09-20' }
        ],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].title, 'Linked Wifi');
    assert.strictEqual(result.items[0].assignedPersonId, 'p_alice');
    assert.strictEqual(result.items[0].ownershipRole, ActionHorizonRole.LEAD_PAYER);
});

// 16. Mandated Case 14: Summary counts reflect active filters
check('FAM-P7-16', 'Mandated Case 14: Summary counts strictly reflect active filtered view (totalActionCount === items.length)', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [
            { id: 't_immed', householdId: 'hh_main', title: 'Task Immediate', status: 'PENDING', dueDate: '2026-09-17' },
            { id: 't_upcom', householdId: 'hh_main', title: 'Task Upcoming', status: 'PENDING', dueDate: '2026-09-28' }
        ],
        members: mockMembers,
        filters: { status: ActionHorizonTier.IMMEDIATE, domain: 'ALL', personId: 'ALL' }
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].title, 'Task Immediate');
    assert.strictEqual(result.summary.totalActionCount, 1);
    assert.strictEqual(result.summary.immediateCount, 1);
    assert.strictEqual(result.summary.upcomingCount, 0);
});

// 17. Mandated Case 15: Empty result after filtering produces zero counts without crashing
check('FAM-P7-17', 'Mandated Case 15: Filter returning zero items produces zero counts and empty list without crashing', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_1', householdId: 'hh_main', title: 'Only Task', status: 'PENDING', dueDate: '2026-09-18' }],
        members: mockMembers,
        filters: { status: ActionHorizonTier.OVERDUE, domain: 'ALL', personId: 'ALL' }
    });

    assert.strictEqual(result.items.length, 0);
    assert.strictEqual(result.summary.totalActionCount, 0);
    assert.strictEqual(result.summary.overdueCount, 0);
    assert.strictEqual(result.summary.immediateCount, 0);
    assert.strictEqual(result.summary.totalMonetaryAmount, null);
});

// 18. Mandated Case 16: Zero-write verification across all source repositories
await asyncCheck('FAM-P7-18', 'Mandated Case 16: Zero writes to storage/repositories during projection calculation', async () => {
    const beforeLinks = await FamilyRepository.listFinancialLinks();
    const beforeDocs = await FamilyRepository.listDocuments();
    const beforeTasks = await FamilyRepository.listTasks();
    const beforeProtections = await FamilyRepository.listProtectionItems();

    await FamilyActionService.getHouseholdActionHorizon('hh_demo', {}, REF_DATE);

    const afterLinks = await FamilyRepository.listFinancialLinks();
    const afterDocs = await FamilyRepository.listDocuments();
    const afterTasks = await FamilyRepository.listTasks();
    const afterProtections = await FamilyRepository.listProtectionItems();

    assert.strictEqual(beforeLinks.length, afterLinks.length, 'Financial links must not mutate');
    assert.strictEqual(beforeDocs.length, afterDocs.length, 'Documents must not mutate');
    assert.strictEqual(beforeTasks.length, afterTasks.length, 'Tasks must not mutate');
    assert.strictEqual(beforeProtections.length, afterProtections.length, 'Protection items must not mutate');
});

// 19. Mandated Case 17: FINANCIAL deep-link route contract
check('FAM-P7-19', 'Mandated Case 17: Emitted targetRoute for FINANCIAL matches /family/more/financials', () => {
    assert.strictEqual(ACTION_HORIZON_ROUTES.FINANCIAL, '/family/more/financials');
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        financialLinks: [{ id: 'fl_1', householdId: 'hh_main', commitmentId: 'c_1', leadPayerPersonId: 'p_alice' }],
        commitments: [{ id: 'c_1', name: 'Test', amount: 100, nextDueDate: '2026-09-20' }],
        members: mockMembers
    });
    assert.strictEqual(result.items[0].targetRoute, '/family/more/financials');
});

// 20. Mandated Case 17: DOCUMENT deep-link route contract
check('FAM-P7-20', 'Mandated Case 17: Emitted targetRoute for DOCUMENT matches /family/more/resources', () => {
    assert.strictEqual(ACTION_HORIZON_ROUTES.DOCUMENT, '/family/more/resources');
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        documents: [{ id: 'd_1', householdId: 'hh_main', status: 'ACTIVE', expiryDate: '2026-09-20' }],
        members: mockMembers
    });
    assert.strictEqual(result.items[0].targetRoute, '/family/more/resources');
});

// 21. Mandated Case 17: OPERATION deep-link route contract
check('FAM-P7-21', 'Mandated Case 17: Emitted targetRoute for OPERATION matches /family/operations', () => {
    assert.strictEqual(ACTION_HORIZON_ROUTES.OPERATION, '/family/operations');
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [{ id: 't_1', householdId: 'hh_main', status: 'PENDING', dueDate: '2026-09-20' }],
        members: mockMembers
    });
    assert.strictEqual(result.items[0].targetRoute, '/family/operations');
});

// 22. Mandated Case 17: PROTECTION deep-link route contract
check('FAM-P7-22', 'Mandated Case 17: Emitted targetRoute for PROTECTION matches /family/protection', () => {
    assert.strictEqual(ACTION_HORIZON_ROUTES.PROTECTION, '/family/protection');
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        protectionItems: [{ id: 'pr_1', householdId: 'hh_main', status: 'ACTIVE', reviewDate: '2026-09-20' }],
        members: mockMembers
    });
    assert.strictEqual(result.items[0].targetRoute, '/family/protection');
});

// 23. Mandated Case 18: All four domain streams in one synthetic projection
check('FAM-P7-23', 'Mandated Case 18: All four domain streams correctly populate domainBreakdown counts', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        financialLinks: [{ id: 'fl_1', householdId: 'hh_main', commitmentId: 'c_1', leadPayerPersonId: 'p_alice' }],
        commitments: [{ id: 'c_1', name: 'Fin 1', amount: 500, nextDueDate: '2026-09-20' }],
        documents: [{ id: 'd_1', householdId: 'hh_main', status: 'ACTIVE', expiryDate: '2026-09-22' }],
        tasks: [{ id: 't_1', householdId: 'hh_main', status: 'PENDING', dueDate: '2026-09-24' }],
        protectionItems: [{ id: 'pr_1', householdId: 'hh_main', status: 'ACTIVE', reviewDate: '2026-09-26' }],
        members: mockMembers
    });

    assert.strictEqual(result.summary.domainBreakdown.financial, 1);
    assert.strictEqual(result.summary.domainBreakdown.document, 1);
    assert.strictEqual(result.summary.domainBreakdown.operation, 1);
    assert.strictEqual(result.summary.domainBreakdown.protection, 1);
    assert.strictEqual(result.summary.totalActionCount, 4);
});

// 24. Single unambiguous currency total
check('FAM-P7-24', 'Single unambiguous currency sums to totalMonetaryAmount with currency code', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        financialLinks: [
            { id: 'fl_1', householdId: 'hh_main', commitmentId: 'c_1', leadPayerPersonId: 'p_alice' },
            { id: 'fl_2', householdId: 'hh_main', commitmentId: 'c_2', leadPayerPersonId: 'p_alice' }
        ],
        commitments: [
            { id: 'c_1', name: 'Water', amount: 800, currency: 'INR', nextDueDate: '2026-09-18' },
            { id: 'c_2', name: 'Power', amount: 2200, currency: 'INR', nextDueDate: '2026-09-19' }
        ],
        members: mockMembers
    });

    assert.strictEqual(result.summary.totalMonetaryAmount, 3000);
    assert.strictEqual(result.summary.monetaryCurrency, 'INR');
});

// 25. Mixed currency prevents aggregation (sets totalMonetaryAmount to null)
check('FAM-P7-25', 'Mixed currencies suppress totalMonetaryAmount to null and monetaryCurrency to null', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        financialLinks: [
            { id: 'fl_1', householdId: 'hh_main', commitmentId: 'c_inr', leadPayerPersonId: 'p_alice' },
            { id: 'fl_2', householdId: 'hh_main', commitmentId: 'c_usd', leadPayerPersonId: 'p_alice' }
        ],
        commitments: [
            { id: 'c_inr', name: 'INR Bill', amount: 5000, currency: 'INR', nextDueDate: '2026-09-18' },
            { id: 'c_usd', name: 'USD Cloud', amount: 50, currency: 'USD', nextDueDate: '2026-09-19' }
        ],
        members: mockMembers
    });

    assert.strictEqual(result.summary.totalMonetaryAmount, null);
    assert.strictEqual(result.summary.monetaryCurrency, null);
    assert.strictEqual(result.items.length, 2);
    assert.strictEqual(result.items[0].currency, 'INR');
    assert.strictEqual(result.items[1].currency, 'USD');
});

// 26. Household-wide protection directive assigns assignedPersonName: 'Household Wide'
check('FAM-P7-26', 'Household-wide protection directive assigns assignedPersonName: Household Wide', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        protectionItems: [{ id: 'pr_trust', householdId: 'hh_main', title: 'Family Trust', status: 'ACTIVE', reviewDate: '2026-09-20', designatedPersonId: null, subjectPersonId: null }],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].assignedPersonName, 'Household Wide');
    assert.strictEqual(result.items[0].ownershipRole, ActionHorizonRole.HOUSEHOLD);
});

// 27. Completed or cancelled tasks excluded from horizon
check('FAM-P7-27', 'Completed or cancelled operations tasks are strictly excluded from the action horizon', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [
            { id: 't_comp', householdId: 'hh_main', title: 'Done Task', status: 'COMPLETED', dueDate: '2026-09-18' },
            { id: 't_canc', householdId: 'hh_main', title: 'Cancelled Task', status: 'CANCELLED', dueDate: '2026-09-18' },
            { id: 't_pend', householdId: 'hh_main', title: 'Pending Task', status: 'PENDING', dueDate: '2026-09-18' }
        ],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].title, 'Pending Task');
});

// 28. Archived documents excluded from horizon
check('FAM-P7-28', 'Archived documents (status !== ACTIVE) are strictly excluded from the action horizon', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        documents: [
            { id: 'd_arch', householdId: 'hh_main', title: 'Old Lease', status: 'ARCHIVED', expiryDate: '2026-09-18' },
            { id: 'd_act', householdId: 'hh_main', title: 'Current Lease', status: 'ACTIVE', expiryDate: '2026-09-18' }
        ],
        members: mockMembers
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].title, 'Current Lease');
});

// 29. Corrupted / null / undefined source collections handled gracefully
check('FAM-P7-29', 'Fault tolerance: null/undefined source collections do not throw and allow other domains to process', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        financialLinks: null,
        commitments: null,
        documents: null,
        tasks: [{ id: 't_ok', householdId: 'hh_main', title: 'Surviving Task', status: 'PENDING', dueDate: '2026-09-20' }],
        protectionItems: undefined,
        members: null
    });

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].title, 'Surviving Task');
    assert.strictEqual(result.summary.domainBreakdown.operation, 1);
    assert.strictEqual(result.summary.domainBreakdown.financial, 0);
});

// 30. Master Invariant: sum of status counts equals totalActionCount
check('FAM-P7-30', 'Master Invariant: overdueCount + immediateCount + upcomingCount + lookingAheadCount === totalActionCount', () => {
    const result = computeHouseholdActionHorizonPure({
        householdId: 'hh_main',
        referenceDateUtc: REF_DATE,
        tasks: [
            { id: 't_1', householdId: 'hh_main', status: 'PENDING', dueDate: '2026-09-10' },
            { id: 't_2', householdId: 'hh_main', status: 'PENDING', dueDate: '2026-09-16' },
            { id: 't_3', householdId: 'hh_main', status: 'PENDING', dueDate: '2026-09-30' },
            { id: 't_4', householdId: 'hh_main', status: 'PENDING', dueDate: '2026-11-15' }
        ],
        members: mockMembers
    });

    const sumTiers = result.summary.overdueCount + result.summary.immediateCount + result.summary.upcomingCount + result.summary.lookingAheadCount;
    assert.strictEqual(sumTiers, result.summary.totalActionCount);
    assert.strictEqual(result.summary.totalActionCount, 4);
    assert.strictEqual(result.items.length, 4);
});

console.log('\n=============================================================');
console.log('🌟 ALL TESTS PASSED: ' + passedChecks + ' / ' + totalChecks + ' checks verified');
console.log('=============================================================');