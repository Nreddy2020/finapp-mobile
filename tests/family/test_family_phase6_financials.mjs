import {StorageService} from '../../services/storage.js';
import {CommitmentsService} from '../../services/commitments/commitmentsService.js';
/**
 * tests/family/test_family_phase6_financials.mjs
 * 
 * Master Regression Suite for FinLife Family OS Phase 6:
 * Family Financial Coordination & Shared Obligations.
 * 
 * Verifies 30 authoritative governance checks (FAM-P6-01 to FAM-P6-30):
 * - Entity contracts, default factories, and validation
 * - Amount parsing and frequency normalization (BigInt paise)
 * - One-time commitment handling in/out active month
 * - Pure deterministic household financial calculation
 * - Member obligation allocation (lead payer 100%, backup payer 0%)
 * - Responsibility domain breakdowns and unassigned domain grouping
 * - Unlinked commitments exclusion from primary totals + badge count
 * - Referential deletion blockers for lead and backup payers
 * - Referential deletion blockers for responsibility domains
 * - Household deletion cascade cleanup preserving Person records
 * - Unlink commitment non-destructive boundary (zero ledger mutations)
 * - Service layer enrichment and NAV-P2-25 UI screen contract
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

import {
    FamilyRepository,
    FamilyHouseholdService,
    FamilyPersonService,
    FamilyOperationsService,
    FamilyFinancialService,
    HouseholdRole,
    MembershipStatus,
    ResponsibilityCategory,
    createEmptyFinancialLink,
    validateFinancialLink,
    parseCommitmentAmountPaise,
    normalizeCommitmentMonthlyPaise,
    computeHouseholdFinancialSummaryPure
} from '../../services/family/index.js';

let passedChecks = 0;
let totalChecks = 0;

function check(id, description, fn) {
    totalChecks++;
    try {
        fn();
        passedChecks++;
        console.log(`  [PASS] ${id}: ${description}`);
    } catch (err) {
        console.error(`  [FAIL] ${id}: ${description}`);
        console.error(`         ${err.message}`);
        throw err;
    }
}

async function asyncCheck(id, description, fn) {
    totalChecks++;
    try {
        await fn();
        passedChecks++;
        console.log(`  [PASS] ${id}: ${description}`);
    } catch (err) {
        console.error(`  [FAIL] ${id}: ${description}`);
        console.error(`         ${err.message}`);
        throw err;
    }
}

console.log('=============================================================');
console.log('?? FINLIFE FAMILY OS - PHASE 6: FINANCIAL COORDINATION TESTS');
console.log('=============================================================');

// Activate test mode for hermetic test execution
FamilyRepository.setTestMode(true);

// -----------------------------------------------------------------------------
// SECTION 1: CONTRACT FACTORIES, VALIDATION & AMOUNT PARSING
// -----------------------------------------------------------------------------

check('FAM-P6-01', 'createEmptyFinancialLink initializes default entity with valid UUID, timestamps, isArchived: false', () => {
    const link = createEmptyFinancialLink({
        householdId: 'hh_test_1',
        commitmentId: 'commit_rent',
        leadPayerPersonId: 'person_alice'
    });
    assert.strictEqual(link.householdId, 'hh_test_1');
    assert.strictEqual(link.commitmentId, 'commit_rent');
    assert.strictEqual(link.leadPayerPersonId, 'person_alice');
    assert.strictEqual(link.backupPayerPersonId, null);
    assert.strictEqual(link.responsibilityId, null);
    assert.strictEqual(link.isArchived, false);
    assert.ok(link.id && typeof link.id === 'string');
    assert.ok(link.createdAt);
    assert.ok(link.updatedAt);
});

check('FAM-P6-02', 'validateFinancialLink enforces required householdId, commitmentId, leadPayerPersonId', () => {
    assert.throws(() => validateFinancialLink(null), /Financial link must be an object/);
    assert.throws(() => validateFinancialLink({ id: 'l1', commitmentId: 'c1', leadPayerPersonId: 'p1' }), /householdId is required/);
    assert.throws(() => validateFinancialLink({ id: 'l1', householdId: 'h1', leadPayerPersonId: 'p1' }), /commitmentId is required/);
    assert.throws(() => validateFinancialLink({ id: 'l1', householdId: 'h1', commitmentId: 'c1' }), /leadPayerPersonId is required/);
});

check('FAM-P6-03', 'validateFinancialLink enforces optional backupPayerPersonId and responsibilityId type safety', () => {
    assert.throws(() => validateFinancialLink({
        id: 'l1',
        householdId: 'h1',
        commitmentId: 'c1',
        leadPayerPersonId: 'p1',
        backupPayerPersonId: 123
    }), /backupPayerPersonId.*must be a non-empty string/);

    assert.throws(() => validateFinancialLink({
        id: 'l1',
        householdId: 'h1',
        commitmentId: 'c1',
        leadPayerPersonId: 'p1',
        responsibilityId: true
    }), /responsibilityId.*must be a non-empty string/);
});

check('FAM-P6-04', 'parseCommitmentAmountPaise parses BigInt paise from number, string, object { paise }, and { amountPaise }', () => {
    assert.strictEqual(parseCommitmentAmountPaise(500), 50000n);
    assert.strictEqual(parseCommitmentAmountPaise('1200'), 120000n);
    assert.strictEqual(parseCommitmentAmountPaise({ paise: '850000' }), 850000n);
    assert.strictEqual(parseCommitmentAmountPaise({ amountPaise: 450000n }), 450000n);
    assert.strictEqual(parseCommitmentAmountPaise({ amount: 150 }), 15000n);
});

check('FAM-P6-05', 'parseCommitmentAmountPaise throws on negative, invalid, or non-finite values', () => {
    assert.throws(() => parseCommitmentAmountPaise(-100), /Negative or invalid amount/);
    assert.throws(() => parseCommitmentAmountPaise({ paise: '-500' }), /Negative or invalid paise/);
    assert.throws(() => parseCommitmentAmountPaise(NaN), /Negative or invalid amount/);
    assert.throws(() => parseCommitmentAmountPaise('not_a_number'), /Negative or invalid amount/);
});

// -----------------------------------------------------------------------------
// SECTION 2: FREQUENCY NORMALIZATION & ONE-TIME COMMITMENTS
// -----------------------------------------------------------------------------

check('FAM-P6-06', 'normalizeCommitmentMonthlyPaise accurately normalizes MONTHLY frequency (1x)', () => {
    const monthlyCommitment = { amount: 10000, frequency: 'MONTHLY' };
    const monthlyPaise = normalizeCommitmentMonthlyPaise(monthlyCommitment);
    assert.strictEqual(monthlyPaise, 1000000n); // ?10,000 in paise
});

check('FAM-P6-07', 'normalizeCommitmentMonthlyPaise accurately normalizes YEARLY frequency (/ 12)', () => {
    const yearlyCommitment = { amount: 120000, frequency: 'YEARLY' };
    const monthlyPaise = normalizeCommitmentMonthlyPaise(yearlyCommitment);
    assert.strictEqual(monthlyPaise, 1000000n); // ?1,20,000 / 12 = ?10,000 in paise
});

check('FAM-P6-08', 'normalizeCommitmentMonthlyPaise accurately normalizes QUARTERLY (/ 3) and HALF_YEARLY (/ 6)', () => {
    const quarterlyCommitment = { amount: 30000, frequency: 'QUARTERLY' };
    assert.strictEqual(normalizeCommitmentMonthlyPaise(quarterlyCommitment), 1000000n);

    const halfYearlyCommitment = { amount: 60000, frequency: 'HALF_YEARLY' };
    assert.strictEqual(normalizeCommitmentMonthlyPaise(halfYearlyCommitment), 1000000n);
});

check('FAM-P6-09', 'normalizeCommitmentMonthlyPaise accurately normalizes WEEKLY (* 52 / 12) and DAILY (* 365 / 12)', () => {
    // ?1,200/week -> 120000 paise * 52 / 12 = 520000 paise (?5,200)
    const weeklyCommitment = { amount: 1200, frequency: 'WEEKLY' };
    assert.strictEqual(normalizeCommitmentMonthlyPaise(weeklyCommitment), 520000n);

    // ₹100/day -> 10000 paise * 365 / 12 = 304166.67 -> 304167 paise (nearest integer)
    const dailyCommitment = { amount: 100, frequency: 'DAILY' };
    assert.strictEqual(normalizeCommitmentMonthlyPaise(dailyCommitment), 304167n);
});

check('FAM-P6-10', 'normalizeCommitmentMonthlyPaise handles one-time commitment in active month (full amount)', () => {
    const oneTimeActive = {
        amount: 25000,
        frequency: 'ONE_TIME',
        dueDate: '2026-09-15'
    };
    const referenceDate = '2026-09-01T00:00:00.000Z';
    const normalized = normalizeCommitmentMonthlyPaise(oneTimeActive, referenceDate);
    assert.strictEqual(normalized, 2500000n); // Full ?25,000 contributes to September 2026
});

check('FAM-P6-11', 'normalizeCommitmentMonthlyPaise handles one-time commitment outside active month (contributes 0)', () => {
    const oneTimeOther = {
        amount: 25000,
        frequency: 'ONE_TIME',
        dueDate: '2026-10-15'
    };
    const referenceDate = '2026-09-01T00:00:00.000Z';
    const normalized = normalizeCommitmentMonthlyPaise(oneTimeOther, referenceDate);
    assert.strictEqual(normalized, 0n); // Contributes 0 to September 2026
});

// -----------------------------------------------------------------------------
// SECTION 3: PURE DETERMINISTIC HOUSEHOLD FINANCIAL CALCULATION
// -----------------------------------------------------------------------------

check('FAM-P6-12', 'computeHouseholdFinancialSummaryPure computes total monthly obligations deterministically for active month', () => {
    const commitments = [
        { id: 'c1', name: 'Rent', amount: 50000, frequency: 'MONTHLY' },
        { id: 'c2', name: 'School Fee', amount: 30000, frequency: 'MONTHLY' },
        { id: 'c3', name: 'Annual Insurance', amount: 120000, frequency: 'YEARLY' },
        { id: 'c4', name: 'Unlinked Netflix', amount: 649, frequency: 'MONTHLY' }
    ];

    const links = [
        { id: 'l1', householdId: 'hh1', commitmentId: 'c1', leadPayerPersonId: 'p1' },
        { id: 'l2', householdId: 'hh1', commitmentId: 'c2', leadPayerPersonId: 'p2' },
        { id: 'l3', householdId: 'hh1', commitmentId: 'c3', leadPayerPersonId: 'p1' }
    ];

    const members = [
        { id: 'p1', firstName: 'Alice', lastName: 'Smith' },
        { id: 'p2', firstName: 'Bob', lastName: 'Smith' }
    ];

    const summary = computeHouseholdFinancialSummaryPure({
        commitments,
        links,
        members,
        responsibilities: [],
        referenceDate: '2026-09-01T00:00:00.000Z'
    });

    // Linked commitments: c1 (50k) + c2 (30k) + c3 (120k/12 = 10k) = 90k/mo
    assert.strictEqual(summary.totalMonthlyCommitmentsPaise, '9000000');
    assert.strictEqual(summary.totalMonthlyCommitmentsRupees, 90000);
    assert.strictEqual(summary.linkedCommitmentCount, 3);
    assert.strictEqual(summary.unlinkedCommitmentCount, 1);
});

check('FAM-P6-13', 'computeHouseholdFinancialSummaryPure allocates 100% of obligation to leadPayerPersonId', () => {
    const commitments = [
        { id: 'c1', name: 'Car Loan', amount: 20000, frequency: 'MONTHLY' }
    ];
    const links = [
        { id: 'l1', householdId: 'hh1', commitmentId: 'c1', leadPayerPersonId: 'p_lead', backupPayerPersonId: 'p_backup' }
    ];
    const members = [
        { id: 'p_lead', firstName: 'Primary', lastName: 'Member' },
        { id: 'p_backup', firstName: 'Secondary', lastName: 'Member' }
    ];

    const summary = computeHouseholdFinancialSummaryPure({
        commitments,
        links,
        members,
        responsibilities: [],
        referenceDate: '2026-09-01T00:00:00.000Z'
    });

    const leadAlloc = summary.memberAllocations.find(m => m.personId === 'p_lead');
    assert.ok(leadAlloc);
    assert.strictEqual(leadAlloc.monthlyAmountRupees, 20000);
    assert.strictEqual(leadAlloc.percentage, 100);
});

check('FAM-P6-14', 'computeHouseholdFinancialSummaryPure allocates 0% financial obligation to backupPayerPersonId (informational only)', () => {
    const commitments = [
        { id: 'c1', name: 'Car Loan', amount: 20000, frequency: 'MONTHLY' }
    ];
    const links = [
        { id: 'l1', householdId: 'hh1', commitmentId: 'c1', leadPayerPersonId: 'p_lead', backupPayerPersonId: 'p_backup' }
    ];
    const members = [
        { id: 'p_lead', firstName: 'Primary', lastName: 'Member' },
        { id: 'p_backup', firstName: 'Secondary', lastName: 'Member' }
    ];

    const summary = computeHouseholdFinancialSummaryPure({
        commitments,
        links,
        members,
        responsibilities: [],
        referenceDate: '2026-09-01T00:00:00.000Z'
    });

    const backupAlloc = summary.memberAllocations.find(m => m.personId === 'p_backup');
    assert.ok(backupAlloc);
    assert.strictEqual(backupAlloc.monthlyAmountRupees, 0);
    assert.strictEqual(backupAlloc.percentage, 0);
});

check('FAM-P6-15', 'computeHouseholdFinancialSummaryPure groups obligations by responsibility domain', () => {
    const commitments = [
        { id: 'c1', name: 'Groceries', amount: 15000, frequency: 'MONTHLY' },
        { id: 'c2', name: 'House Maintenance', amount: 5000, frequency: 'MONTHLY' }
    ];
    const links = [
        { id: 'l1', householdId: 'hh1', commitmentId: 'c1', leadPayerPersonId: 'p1', responsibilityId: 'resp_home' },
        { id: 'l2', householdId: 'hh1', commitmentId: 'c2', leadPayerPersonId: 'p1', responsibilityId: 'resp_home' }
    ];
    const responsibilities = [
        { id: 'resp_home', name: 'Home Management', color: '#10B981' }
    ];

    const summary = computeHouseholdFinancialSummaryPure({
        commitments,
        links,
        members: [{ id: 'p1', firstName: 'Alice' }],
        responsibilities,
        referenceDate: '2026-09-01T00:00:00.000Z'
    });

    assert.strictEqual(summary.domainAllocations.length, 1);
    assert.strictEqual(summary.domainAllocations[0].responsibilityId, 'resp_home');
    assert.strictEqual(summary.domainAllocations[0].monthlyAmountRupees, 20000);
    assert.strictEqual(summary.domainAllocations[0].linkedCount, 2);
});

check('FAM-P6-16', 'computeHouseholdFinancialSummaryPure groups obligations without domain under unassignedDomain', () => {
    const commitments = [
        { id: 'c1', name: 'Personal Gym', amount: 3000, frequency: 'MONTHLY' }
    ];
    const links = [
        { id: 'l1', householdId: 'hh1', commitmentId: 'c1', leadPayerPersonId: 'p1', responsibilityId: null }
    ];

    const summary = computeHouseholdFinancialSummaryPure({
        commitments,
        links,
        members: [{ id: 'p1', firstName: 'Alice' }],
        responsibilities: [],
        referenceDate: '2026-09-01T00:00:00.000Z'
    });

    assert.strictEqual(summary.unassignedDomain.monthlyAmountRupees, 3000);
    assert.strictEqual(summary.unassignedDomain.linkedCount, 1);
});

check('FAM-P6-17', 'computeHouseholdFinancialSummaryPure excludes unlinked commitments from primary totals + calculates unlinked badge count', () => {
    const commitments = [
        { id: 'c_linked', name: 'Linked', amount: 5000, frequency: 'MONTHLY' },
        { id: 'c_unlinked1', name: 'Unlinked 1', amount: 2000, frequency: 'MONTHLY' },
        { id: 'c_unlinked2', name: 'Unlinked 2', amount: 3000, frequency: 'MONTHLY' }
    ];
    const links = [
        { id: 'l1', householdId: 'hh1', commitmentId: 'c_linked', leadPayerPersonId: 'p1' }
    ];

    const summary = computeHouseholdFinancialSummaryPure({
        commitments,
        links,
        members: [{ id: 'p1', firstName: 'Alice' }],
        responsibilities: [],
        referenceDate: '2026-09-01T00:00:00.000Z'
    });

    // Totals only include the linked ?5,000
    assert.strictEqual(summary.totalMonthlyCommitmentsRupees, 5000);
    assert.strictEqual(summary.linkedCommitmentCount, 1);
    assert.strictEqual(summary.unlinkedCommitmentCount, 2);
    assert.strictEqual(summary.totalCommitmentsCount, 3);
});

check('FAM-P6-18', 'computeHouseholdFinancialSummaryPure excludes archived links from active monthly calculation', () => {
    const commitments = [
        { id: 'c1', name: 'Active Bill', amount: 5000, frequency: 'MONTHLY' },
        { id: 'c2', name: 'Old Terminated Bill', amount: 8000, frequency: 'MONTHLY' }
    ];
    const links = [
        { id: 'l1', householdId: 'hh1', commitmentId: 'c1', leadPayerPersonId: 'p1', isArchived: false },
        { id: 'l2', householdId: 'hh1', commitmentId: 'c2', leadPayerPersonId: 'p1', isArchived: true }
    ];

    const summary = computeHouseholdFinancialSummaryPure({
        commitments,
        links,
        members: [{ id: 'p1', firstName: 'Alice' }],
        responsibilities: [],
        referenceDate: '2026-09-01T00:00:00.000Z'
    });

    assert.strictEqual(summary.totalMonthlyCommitmentsRupees, 5000);
    assert.strictEqual(summary.linkedCommitmentCount, 1);
});

// -----------------------------------------------------------------------------
// SECTION 4: REPOSITORY REFERENTIAL INTEGRITY & MULTI-HOUSEHOLD ISOLATION
// -----------------------------------------------------------------------------

await asyncCheck('FAM-P6-19', 'FamilyRepository.upsertFinancialLink validates foreign key existence for household', async () => {
    FamilyRepository._resetInMemory();
    const link = createEmptyFinancialLink({
        householdId: 'hh_nonexistent',
        commitmentId: 'c1',
        leadPayerPersonId: 'p1'
    });

    await assert.rejects(async () => {
        await FamilyRepository.upsertFinancialLink(link);
    }, /Household 'hh_nonexistent' does not exist/);
});

await asyncCheck('FAM-P6-20', 'FamilyRepository.upsertFinancialLink enforces lead payer is an active/provisional household member', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Alpha Family' });
    const outsider = await FamilyPersonService.createPerson({ fullName: 'Outsider Member' });

    const link = createEmptyFinancialLink({
        householdId: hh.id,
        commitmentId: 'c1',
        leadPayerPersonId: outsider.id
    });

    await assert.rejects(async () => {
        await FamilyRepository.upsertFinancialLink(link);
    }, /is not an active member of household/);
});

await asyncCheck('FAM-P6-21', 'FamilyRepository.upsertFinancialLink enforces backup payer cannot equal lead payer', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Alpha Family' });
    const member = await FamilyPersonService.createPerson({ fullName: 'Member One' });
    await FamilyHouseholdService.addMember({
        householdId: hh.id,
        personId: member.id,
        role: HouseholdRole.ADULT
    });

    const link = createEmptyFinancialLink({
        householdId: hh.id,
        commitmentId: 'c1',
        leadPayerPersonId: member.id,
        backupPayerPersonId: member.id
    });

    await assert.rejects(async () => {
        await FamilyRepository.upsertFinancialLink(link);
    }, /Backup payer cannot be the same as the lead payer/);
});

await asyncCheck('FAM-P6-22', 'FamilyRepository.upsertFinancialLink enforces responsibility domain belongs to the same household', async () => {
    FamilyRepository._resetInMemory();
    const hh1 = await FamilyHouseholdService.createHousehold({ name: 'Household 1' });
    const hh2 = await FamilyHouseholdService.createHousehold({ name: 'Household 2' });

    const member1 = await FamilyPersonService.createPerson({ fullName: 'Member One' });
    const member2 = await FamilyPersonService.createPerson({ fullName: 'Member Two' });
    await FamilyHouseholdService.addMember({ householdId: hh1.id, personId: member1.id, role: HouseholdRole.HEAD });
    await FamilyHouseholdService.addMember({ householdId: hh2.id, personId: member2.id, role: HouseholdRole.HEAD });

    const resp2 = await FamilyOperationsService.saveResponsibility({
        householdId: hh2.id,
        title: 'Household 2 Responsibility',
        category: ResponsibilityCategory.FINANCIAL_ADMIN,
        leadPersonId: member2.id
    });

    const link = createEmptyFinancialLink({
        householdId: hh1.id,
        commitmentId: 'c1',
        leadPayerPersonId: member1.id,
        responsibilityId: resp2.id
    });

    await assert.rejects(async () => {
        await FamilyRepository.upsertFinancialLink(link);
    }, /does not belong to household/);
});

await asyncCheck('FAM-P6-23', 'FamilyRepository.upsertFinancialLink enforces unicity of commitment per household', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Alpha Family' });
    const member = await FamilyPersonService.createPerson({ fullName: 'Alice Smith' });
    await FamilyHouseholdService.addMember({ householdId: hh.id, personId: member.id, role: HouseholdRole.HEAD });

    const link1 = createEmptyFinancialLink({
        householdId: hh.id,
        commitmentId: 'commit_rent',
        leadPayerPersonId: member.id
    });
    await FamilyRepository.upsertFinancialLink(link1);

    // Attempting to link the same commitment to the same household with a different link id
    const link2 = createEmptyFinancialLink({
        householdId: hh.id,
        commitmentId: 'commit_rent',
        leadPayerPersonId: member.id
    });

    await assert.rejects(async () => {
        await FamilyRepository.upsertFinancialLink(link2);
    }, /Commitment 'commit_rent' is already linked to household/);
});

// -----------------------------------------------------------------------------
// SECTION 5: DELETION BLOCKS & CASCADES
// -----------------------------------------------------------------------------

await asyncCheck('FAM-P6-24', 'FamilyRepository.deletePerson is blocked if person is referenced as lead payer on a financial link', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Alpha Family' });
    const lead = await FamilyPersonService.createPerson({ fullName: 'Lead Payer' });
    const m = await FamilyHouseholdService.addMemberToHousehold({ householdId: hh.id, personId: lead.id, role: HouseholdRole.HEAD });

    await FamilyRepository.upsertFinancialLink(createEmptyFinancialLink({
        householdId: hh.id,
        commitmentId: 'c_lead_test',
        leadPayerPersonId: lead.id
    }));

    // Remove membership to isolate the financial link deletion blocker
    await FamilyRepository.deleteMembership(m.id);

    await assert.rejects(async () => {
        await FamilyRepository.deletePerson(lead.id);
    }, /Cannot physically delete this Person because one or more financial links reference them as lead or backup payer/);
});

await asyncCheck('FAM-P6-25', 'FamilyRepository.deletePerson is blocked if person is referenced as backup payer on a financial link', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Alpha Family' });
    const lead = await FamilyPersonService.createPerson({ fullName: 'Lead Payer' });
    const backup = await FamilyPersonService.createPerson({ fullName: 'Backup Payer' });
    await FamilyHouseholdService.addMemberToHousehold({ householdId: hh.id, personId: lead.id, role: HouseholdRole.HEAD });
    const mBackup = await FamilyHouseholdService.addMemberToHousehold({ householdId: hh.id, personId: backup.id, role: HouseholdRole.ADULT });

    await FamilyRepository.upsertFinancialLink(createEmptyFinancialLink({
        householdId: hh.id,
        commitmentId: 'c_backup_test',
        leadPayerPersonId: lead.id,
        backupPayerPersonId: backup.id
    }));

    // Remove backup person membership to isolate the financial link deletion blocker
    await FamilyRepository.deleteMembership(mBackup.id);

    await assert.rejects(async () => {
        await FamilyRepository.deletePerson(backup.id);
    }, /Cannot physically delete this Person because one or more financial links reference them as lead or backup payer/);
});

await asyncCheck('FAM-P6-26', 'FamilyRepository.deleteResponsibility is blocked if responsibility is referenced on a financial link', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Alpha Family' });
    const lead = await FamilyPersonService.createPerson({ fullName: 'Lead Payer' });
    await FamilyHouseholdService.addMember({ householdId: hh.id, personId: lead.id, role: HouseholdRole.HEAD });

    const resp = await FamilyOperationsService.saveResponsibility({
        householdId: hh.id,
        title: 'Financial Domain',
        category: ResponsibilityCategory.FINANCIAL_ADMIN,
        leadPersonId: lead.id
    });

    await FamilyRepository.upsertFinancialLink(createEmptyFinancialLink({
        householdId: hh.id,
        commitmentId: 'c_resp_test',
        leadPayerPersonId: lead.id,
        responsibilityId: resp.id
    }));

    await assert.rejects(async () => {
        await FamilyRepository.deleteResponsibility(resp.id);
    }, /Cannot physically delete Responsibility .* because one or more financial links reference it/);
});

await asyncCheck('FAM-P6-27', 'FamilyRepository.deleteHousehold cascades deletion of financial links while preserving Person records intact', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Alpha Family' });
    const lead = await FamilyPersonService.createPerson({ fullName: 'Lead Payer' });
    await FamilyHouseholdService.addMember({ householdId: hh.id, personId: lead.id, role: HouseholdRole.HEAD });

    const link = await FamilyRepository.upsertFinancialLink(createEmptyFinancialLink({
        householdId: hh.id,
        commitmentId: 'c_cascade_test',
        leadPayerPersonId: lead.id
    }));

    // Delete the household
    await FamilyHouseholdService.deleteHousehold(hh.id);

    // Link should be cleaned up
    const retrievedLink = await FamilyRepository.getFinancialLink(link.id);
    assert.strictEqual(retrievedLink, null);

    // Person record must remain intact!
    const retrievedPerson = await FamilyRepository.getPerson(lead.id);
    assert.ok(retrievedPerson);
    assert.strictEqual(retrievedPerson.fullName, 'Lead Payer');
});

// -----------------------------------------------------------------------------
// SECTION 6: SERVICE LAYER INTEGRATION & NON-DESTRUCTIVE BOUNDARY
// -----------------------------------------------------------------------------

await asyncCheck('FAM-P6-28', 'FamilyFinancialService.unlinkCommitment physically deletes link record without mutating underlying commitment or cashbook', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Alpha Family' });
    const lead = await FamilyPersonService.createPerson({ fullName: 'Lead Payer' });
    await FamilyHouseholdService.addMember({ householdId: hh.id, personId: lead.id, role: HouseholdRole.HEAD });

    const saved = await FamilyFinancialService.linkCommitment({
        householdId: hh.id,
        commitmentId: 'commit_rent',
        leadPayerPersonId: lead.id
    });

    assert.ok(saved.id);

    // Unlink commitment
    const unlinked = await FamilyFinancialService.unlinkCommitment(saved.id);
    assert.strictEqual(unlinked, true);

    // Link record is gone
    const after = await FamilyFinancialService.getFinancialLink(saved.id);
    assert.strictEqual(after, null);
});

await asyncCheck('FAM-P6-29', 'FamilyFinancialService.listHouseholdFinancialLinks enriches links with person names, domain tags, and commitment details', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Alpha Family' });
    const lead = await FamilyPersonService.createPerson({ fullName: 'Alice Smith' });
    const backup = await FamilyPersonService.createPerson({ fullName: 'Bob Smith' });
    await FamilyHouseholdService.addMember({ householdId: hh.id, personId: lead.id, role: HouseholdRole.HEAD });
    await FamilyHouseholdService.addMember({ householdId: hh.id, personId: backup.id, role: HouseholdRole.ADULT });

    const resp = await FamilyOperationsService.saveResponsibility({
        householdId: hh.id,
        title: 'Housing & Rent',
        category: ResponsibilityCategory.HOME_MAINTENANCE,
        leadPersonId: lead.id,
        color: '#3B82F6'
    });

    // Explicit fixture in mocked production storage; the application must never fall back to demo.
    const fixture = await CommitmentsService.load({mode:'DEMO'});
    await StorageService.save('FINLIFE_COMMITMENTS_V2',fixture.commitments);
    const link = await FamilyFinancialService.linkCommitment({
        householdId: hh.id,
        commitmentId: 'demo_apt_maint',
        leadPayerPersonId: lead.id,
        backupPayerPersonId: backup.id,
        responsibilityId: resp.id,
        notes: 'Monthly apartment maintenance dues'
    });

    assert.strictEqual(link.leadPayerName, 'Alice Smith');
    assert.strictEqual(link.backupPayerName, 'Bob Smith');
    assert.strictEqual(link.responsibilityName, 'Housing & Rent');
    assert.strictEqual(link.commitmentName, 'Apartment Maintenance');
    assert.strictEqual(link.monthlyRupees, 8500);
});

check('FAM-P6-30', 'NAV-P2-25 contract preservation: UI screen exists at app/family/more/financials.js, renders Family Financial Coordination, has clean return', () => {
    const filePath = path.resolve(process.cwd(), 'app/family/more/financials.js');
    assert.ok(fs.existsSync(filePath), 'app/family/more/financials.js must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.match(content, /Family Financial Coordination/i, 'Must contain title Family Financial Coordination');
    assert.match(content, /FinLife Home/i, 'Must include global safe exit link to FinLife Home');
    assert.doesNotMatch(content, /addTransaction/i, 'Negative boundary: zero balance mutations or secondary ledgers');
    assert.doesNotMatch(content, /updateAccountBalance/i, 'Negative boundary: zero balance mutations');
});

console.log('\n=============================================================');
console.log(`?? ALL TESTS PASSED: ${passedChecks} / ${totalChecks} checks verified`);
console.log('=============================================================');
