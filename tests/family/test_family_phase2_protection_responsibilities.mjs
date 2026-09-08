/**
 * Test Suite: FinLife Family Phase 2 Protection & Responsibilities
 * Verifies insurance aggregation, renewal countdowns, nominee checks, uncovered member alerts,
 * and responsibility task workflows using neutral identities.
 */

import assert from 'node:assert';
import {
    PolicyType,
    PolicyStatus,
    ResponsibilityCategory,
    ResponsibilityPriority,
    ResponsibilityStatus,
    CircleCategory,
    FamilyRole,
    FamilyStatus,
    createPerson
} from '../../services/family/familyContracts.js';
import {
    FamilyProtectionService,
    parseAmountPaise,
    formatPaiseToRupees
} from '../../services/family/familyProtectionService.js';
import { FamilyResponsibilityService } from '../../services/family/familyResponsibilityService.js';

let totalAssertions = 0;
function check(condition, message) {
    assert.ok(condition, message);
    totalAssertions++;
}

async function runPhase2Tests() {
    console.log('\n--- Running FinLife Family Phase 2 Protection & Responsibilities Verification ---');

    // 1. Amount Parsing & Formatting
    check(parseAmountPaise(100000n) === 100000n, 'BigInt parse preserves value');
    check(parseAmountPaise('5000000') === 5000000n, 'String parse converted to BigInt');
    check(parseAmountPaise(25000) === 25000n, 'Number parse converted to BigInt');
    check(formatPaiseToRupees(1500000000n) === '₹1.50 Cr', 'Formatted ₹1.5 Cr properly');
    check(formatPaiseToRupees(25000000n) === '₹2.50 L', 'Formatted ₹2.5 L properly');
    check(formatPaiseToRupees(500000n) === '₹5,000', 'Formatted ₹5,000 properly');

    // 2. Setup Neutral Test Persons
    const personA = createPerson({ id: 'person_p2_a', name: 'Person A', role: FamilyRole.HEAD });
    const personB = createPerson({ id: 'person_p2_b', name: 'Person B', role: FamilyRole.SPOUSE });
    const child1 = createPerson({ id: 'person_p2_child1', name: 'Child 1', role: FamilyRole.CHILD });
    const elder1 = createPerson({ id: 'person_p2_elder1', name: 'Elder 1', role: FamilyRole.PARENT });

    const persons = [personA, personB, child1, elder1];

    // 3. Setup Test Policies
    const refDate = new Date('2026-09-08');

    const policies = [
        {
            id: 'pol_p2_term_a',
            provider: 'SafeLife',
            policyNumber: 'SL-TERM-112233',
            policyType: PolicyType.TERM_LIFE,
            status: PolicyStatus.ACTIVE,
            insuredPersonIds: ['person_p2_a'],
            nomineePersonIds: ['person_p2_b'],
            nomineeCompleteness: true,
            coverageAmountPaise: 2000000000n, // ₹2.00 Cr
            premiumAmountPaise: 3000000n, // ₹30,000
            renewalDate: '2026-12-15' // ~98 days away
        },
        {
            id: 'pol_p2_health_floater',
            provider: 'CareMax',
            policyNumber: 'CM-HLT-998877',
            policyType: PolicyType.HEALTH,
            status: PolicyStatus.ACTIVE,
            insuredPersonIds: ['person_p2_a', 'person_p2_b', 'person_p2_child1'], // Elder 1 is NOT covered
            nomineePersonIds: ['person_p2_b'],
            nomineeCompleteness: true,
            coverageAmountPaise: 250000000n, // ₹25.00 L
            premiumAmountPaise: 4000000n, // ₹40,000
            renewalDate: '2026-09-25' // 17 days away -> EXPIRING_SOON!
        },
        {
            id: 'pol_p2_incomplete_nominee',
            provider: 'OldShield',
            policyNumber: 'OS-CRIT-001122',
            policyType: PolicyType.CRITICAL_ILLNESS,
            status: PolicyStatus.ACTIVE,
            insuredPersonIds: ['person_p2_a'],
            nomineePersonIds: [], // Missing nominee!
            nomineeCompleteness: false,
            coverageAmountPaise: 50000000n, // ₹5.00 L
            premiumAmountPaise: 1000000n,
            renewalDate: '2027-01-10'
        }
    ];

    // 4. Test Protection Summary
    const summary = FamilyProtectionService.getProtectionSummary(persons, policies, refDate);

    check(summary.state === 'AVAILABLE', 'Summary state is AVAILABLE');
    check(summary.totalTermCoveragePaiseStr === '2000000000', 'Term coverage summed to 2 Cr paise');
    check(summary.totalTermCoverageDisplay === '₹2.00 Cr', 'Term coverage displayed as ₹2.00 Cr');
    check(summary.totalHealthCoveragePaiseStr === '250000000', 'Health coverage summed to 25 L paise');
    check(summary.totalHealthCoverageDisplay === '₹25.00 L', 'Health coverage displayed as ₹25.00 L');
    check(summary.totalAnnualPremiumDisplay === '₹80,000', 'Total premium summed correctly (30k+40k+10k)');

    // Check renewal countdown and expiring soon
    check(summary.expiringSoonCount === 1, 'CareMax detected as expiring soon (17 days)');
    const careMax = summary.policiesList.find(p => p.id === 'pol_p2_health_floater');
    check(careMax.daysUntilRenewal === 17, 'CareMax days until renewal is exactly 17');
    check(careMax.isExpiringSoon === true, 'CareMax marked as expiring soon');
    check(careMax.policyNumberMasked === '•••• 8877', 'Masked policy number has 4 visible trailing chars');

    // Check uncovered family members detection
    check(summary.uncoveredMembers.length === 1, 'Detected exactly 1 uncovered family member');
    check(summary.uncoveredMembers[0].id === 'person_p2_elder1', 'Elder 1 identified as uncovered in health policy');

    // Check incomplete nominee detection
    check(summary.incompleteNomineePolicies.length === 1, 'Detected 1 policy with incomplete nominee');
    check(summary.incompleteNomineePolicies[0].policyId === 'pol_p2_incomplete_nominee', 'OldShield identified with incomplete nominee');

    // Check readiness badge
    check(summary.readinessScoreBadge === 'NEEDS_ATTENTION', 'Readiness score is NEEDS_ATTENTION due to uncovered member and incomplete nominee');

    // 5. Test Responsibilities View
    const responsibilities = [
        {
            id: 'resp_p2_1',
            title: 'Child 1 School Term Fee',
            category: ResponsibilityCategory.EDUCATION,
            assignedPersonId: 'person_p2_a',
            affectedPersonId: 'person_p2_child1',
            priority: ResponsibilityPriority.URGENT,
            status: ResponsibilityStatus.PENDING,
            dueDate: '2026-09-05', // Past date -> OVERDUE relative to 2026-09-08
            estimatedAmountPaise: 5000000n
        },
        {
            id: 'resp_p2_2',
            title: 'Health Floater Renewal',
            category: ResponsibilityCategory.HEALTHCARE,
            assignedPersonId: 'person_p2_a',
            affectedPersonId: 'person_p2_a',
            priority: ResponsibilityPriority.HIGH,
            status: ResponsibilityStatus.PENDING,
            dueDate: '2026-09-25',
            estimatedAmountPaise: 4000000n
        },
        {
            id: 'resp_p2_3',
            title: 'Elder 1 Medicine Ordering',
            category: ResponsibilityCategory.CARE,
            assignedPersonId: 'person_p2_b',
            affectedPersonId: 'person_p2_elder1',
            priority: ResponsibilityPriority.MEDIUM,
            status: ResponsibilityStatus.IN_PROGRESS,
            dueDate: '2026-09-12'
        },
        {
            id: 'resp_p2_4',
            title: 'Annual Tax Filing Review',
            category: ResponsibilityCategory.FINANCIAL,
            assignedPersonId: 'person_p2_a',
            affectedPersonId: 'person_p2_a',
            priority: ResponsibilityPriority.LOW,
            status: ResponsibilityStatus.COMPLETED,
            dueDate: '2026-07-31'
        }
    ];

    const respViewAll = FamilyResponsibilityService.getResponsibilitiesView({
        responsibilities,
        persons,
        filter: 'ALL',
        today: refDate
    });

    check(respViewAll.totalCount === 4, 'Total tasks count is 4');
    check(respViewAll.pendingCount === 3, 'Pending tasks count is 3');
    check(respViewAll.overdueCount === 1, 'Overdue tasks count is 1');

    // Overdue task inspection
    const overdueTask = respViewAll.tasks.find(t => t.id === 'resp_p2_1');
    check(overdueTask.isOverdue === true, 'School fee tagged as overdue');
    check(overdueTask.statusBadge === ResponsibilityStatus.OVERDUE, 'Status badge is OVERDUE');
    check(overdueTask.assignedPersonName === 'Person A', 'Assigned name is Person A');
    check(overdueTask.affectedPersonName === 'Child 1', 'Affected name is Child 1');
    check(overdueTask.estimatedAmountDisplay === '₹50,000', 'Formatted amount is ₹50,000');

    // Filter 'MY_TASKS' for Person B
    const respViewMyB = FamilyResponsibilityService.getResponsibilitiesView({
        responsibilities,
        persons,
        filter: 'MY_TASKS',
        currentUserId: 'person_p2_b',
        today: refDate
    });
    check(respViewMyB.tasks.length === 1, 'Person B has exactly 1 assigned task');
    check(respViewMyB.tasks[0].id === 'resp_p2_3', 'Person B task is Elder 1 medicine ordering');

    // Filter 'BY_PERSON' for Elder 1
    const respViewElder1 = FamilyResponsibilityService.getResponsibilitiesView({
        responsibilities,
        persons,
        filter: 'BY_PERSON',
        personId: 'person_p2_elder1',
        today: refDate
    });
    check(respViewElder1.tasks.length === 1, 'Elder 1 has 1 affected task');
    check(respViewElder1.tasks[0].id === 'resp_p2_3', 'Elder 1 task is medicine ordering');

    // Filter 'URGENT'
    const respViewUrgent = FamilyResponsibilityService.getResponsibilitiesView({
        responsibilities,
        persons,
        filter: 'URGENT',
        today: refDate
    });
    check(respViewUrgent.tasks.length === 1, '1 task returned in urgent filter');
    check(respViewUrgent.tasks[0].id === 'resp_p2_1', 'Urgent task is Child 1 fee');

    // Sorting order check: completed task must be at the bottom
    check(respViewAll.tasks[3].id === 'resp_p2_4', 'Completed task is sorted at the bottom');
    check(respViewAll.tasks[0].id === 'resp_p2_1', 'Urgent/overdue task is sorted at the very top');

    console.log(`\n[SUCCESS] Phase 2 Protection & Responsibilities Verified: ${totalAssertions}/${totalAssertions} checks passed (100%).\n`);
}

runPhase2Tests().catch(err => {
    console.error('\n[FAIL] Phase 2 Verification Failed:', err);
    process.exit(1);
});
