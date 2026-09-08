/**
 * FinLife Family Master Integration & End-to-End Certification Suite
 * Comprehensive verification of the entire Family Operating System Hub:
 * 1. Bounded sub-models & contracts
 * 2. Strict demo fixture gating & isolation
 * 3. Atomic repository persistence & BigInt safety
 * 4. Relationship graph canonical edge rules, cycles, and 3-generation tree matrix
 * 5. Multi-policy protection, renewal countdowns, nominee checks, uncovered member alerts
 * 6. Responsibility task workflows, urgency ranking, overdue detection
 * 7. Assumption-driven education projections with visible inflation and unconfigured states
 * 8. Parents & elder care coordination and support budgets
 * 9. Health & medical privacy-gated access control
 * 10. Read-only financial synthesis & emergency liquidity runway
 * 11. 9-point Emergency Readiness standard & 9 dedicated report cards
 */

import assert from 'node:assert';
import {
    CircleCategory,
    FamilyRole,
    FamilyStatus,
    PrivacyLevel,
    PolicyType,
    PolicyStatus,
    ResponsibilityCategory,
    ResponsibilityPriority,
    ResponsibilityStatus,
    CareHealthStatus,
    RelationshipType,
    FinancialLinkStatus,
    DataAvailabilityState,
    EMERGENCY_READINESS_ITEMS,
    createPerson,
    createFinancialReference,
    maskSensitiveIdentifier
} from '../../services/family/familyContracts.js';
import {
    isFamilyDemoModeEnabled,
    setFamilyDemoMode,
    getFamilyDemoFixtures
} from '../../services/family/familyDemoFixtures.js';
import { FamilyRepository } from '../../services/family/familyRepository.js';
import {
    validateRelationshipEdge,
    getRelationshipsForPerson,
    getParents,
    getChildren,
    getSpouse,
    getSiblings,
    buildFamilyTreeMatrix
} from '../../services/family/familyGraphEngine.js';
import {
    FamilyProtectionService,
    parseAmountPaise,
    formatPaiseToRupees
} from '../../services/family/familyProtectionService.js';
import { FamilyResponsibilityService } from '../../services/family/familyResponsibilityService.js';
import {
    calculateEducationProjection,
    FamilyEducationService
} from '../../services/family/familyEducationService.js';
import { FamilyCareService } from '../../services/family/familyCareService.js';
import {
    FamilyHealthService,
    sanitizeMedicalProfile
} from '../../services/family/familyHealthService.js';
import { FamilyFinancialAdapter } from '../../services/family/familyFinancialAdapter.js';
import {
    FamilyReportViewModel,
    evaluateEmergencyReadiness
} from '../../services/family/familyReportViewModel.js';

let totalChecks = 0;
function verify(condition, message) {
    assert.ok(condition, message);
    totalChecks++;
}

async function runMasterCertification() {
    console.log('\n=============================================================');
    console.log('  FinLife Family Hub: Master Integration Certification Suite ');
    console.log('=============================================================\n');

    // --- CHECK 1: Strict Demo Fixture Gating ---
    setFamilyDemoMode(false);
    verify(isFamilyDemoModeEnabled() === false, 'Demo mode disabled initially');

    // --- CHECK 2: Bounded Sub-Models ---
    const personA = createPerson({
        id: 'person_master_a',
        name: 'Person A',
        preferredName: 'Alice',
        gender: 'FEMALE',
        circleCategory: CircleCategory.FAMILY,
        role: FamilyRole.HEAD,
        contact: { phone: '+91 91111 00001', address: 'Apartment 101, FinLife Heights', isSharedAddress: true },
        profile: { occupation: 'Data Scientist', bloodGroup: 'O+' },
        privacy: { visibility: PrivacyLevel.FAMILY_ONLY, accessScope: 'ADMIN' },
        medicalProfile: { bloodGroup: 'O+', allergies: ['Sulfa'], medications: ['Vitamin D'] },
        emergencyProfile: { isEmergencyContact: true, priorityOrder: 1, reachable24x7: true }
    });

    const personB = createPerson({
        id: 'person_master_b',
        name: 'Person B',
        preferredName: 'Bob',
        gender: 'MALE',
        circleCategory: CircleCategory.FAMILY,
        role: FamilyRole.SPOUSE,
        contact: { phone: '+91 91111 00002', isSharedAddress: true },
        profile: { bloodGroup: 'A+' },
        privacy: { visibility: PrivacyLevel.FAMILY_ONLY, accessScope: 'ADMIN' },
        emergencyProfile: { isEmergencyContact: true, priorityOrder: 2, reachable24x7: true }
    });

    const child1 = createPerson({
        id: 'person_master_child1',
        name: 'Child 1',
        preferredName: 'Charlie',
        gender: 'MALE',
        circleCategory: CircleCategory.FAMILY,
        role: FamilyRole.CHILD,
        contact: { isSharedAddress: true },
        profile: { bloodGroup: 'O+', occupation: 'Student Grade 8' },
        medicalProfile: { bloodGroup: 'O+', allergies: ['Dust'] }
    });

    const elder1 = createPerson({
        id: 'person_master_elder1',
        name: 'Elder 1',
        preferredName: 'David',
        gender: 'MALE',
        circleCategory: CircleCategory.FAMILY,
        role: FamilyRole.PARENT,
        contact: { phone: '+91 91111 00004', address: 'Heritage Villa, Old Town', isSharedAddress: false },
        profile: { bloodGroup: 'B+' },
        medicalProfile: { bloodGroup: 'B+', chronicConditions: ['Hypertension'] }
    });

    const doctor1 = createPerson({
        id: 'person_master_doc1',
        name: 'Dr. Physician 1',
        circleCategory: CircleCategory.OTHERS,
        role: FamilyRole.OTHER,
        contact: { phone: '+91 91111 99999' },
        profile: { occupation: 'Family Physician' }
    });

    const allPersons = [personA, personB, child1, elder1, doctor1];

    verify(personA.core.id === 'person_master_a', 'Person A core ID matches');
    verify(personA.contact.isSharedAddress === true, 'Person A address is marked shared');
    verify(child1.profile.bloodGroup === 'O+', 'Child 1 blood group recorded');

    // --- CHECK 3: Repository Persistence & BigInt Invariants ---
    await FamilyRepository.resetFamilyData();
    for (const p of allPersons) {
        await FamilyRepository.savePerson(p);
    }
    const storedPersons = await FamilyRepository.getPersons();
    verify(storedPersons.length === 5, 'Stored exactly 5 persons in repository');

    // --- CHECK 4: Relationship Graph & Ancestor Cycle Rejection ---
    const edges = [
        { id: 'rel_m_1', fromPersonId: 'person_master_a', toPersonId: 'person_master_b', relationshipType: RelationshipType.SPOUSE_OF },
        { id: 'rel_m_2', fromPersonId: 'person_master_child1', toPersonId: 'person_master_a', relationshipType: RelationshipType.CHILD_OF },
        { id: 'rel_m_3', fromPersonId: 'person_master_child1', toPersonId: 'person_master_b', relationshipType: RelationshipType.CHILD_OF },
        { id: 'rel_m_4', fromPersonId: 'person_master_a', toPersonId: 'person_master_elder1', relationshipType: RelationshipType.CHILD_OF }
    ];

    for (const e of edges) {
        await FamilyRepository.saveRelationship(e);
    }

    // Verify self-relationship rejection
    const invalidSelf = validateRelationshipEdge({
        fromPersonId: 'person_master_a',
        toPersonId: 'person_master_a',
        relationshipType: RelationshipType.SPOUSE_OF
    }, edges);
    verify(invalidSelf.isValid === false, 'Self-relationship rejected');

    // Verify ancestor cycle rejection: Elder 1 cannot become child of Child 1
    const invalidCycle = validateRelationshipEdge({
        fromPersonId: 'person_master_elder1',
        toPersonId: 'person_master_child1',
        relationshipType: RelationshipType.CHILD_OF
    }, edges);
    verify(invalidCycle.isValid === false, 'Ancestor cycle rejected');

    // Verify reciprocal projections
    const relsForB = getRelationshipsForPerson('person_master_b', edges);
    verify(relsForB.some(r => r.relatedPersonId === 'person_master_a' && r.type === RelationshipType.SPOUSE_OF), 'Reciprocal spouse projection verified');
    verify(relsForB.some(r => r.relatedPersonId === 'person_master_child1' && r.type === RelationshipType.PARENT_OF), 'Reciprocal parent-of projection verified');

    // Verify generational tree matrix
    const matrix = buildFamilyTreeMatrix(storedPersons, edges);
    verify(matrix.tiers.length === 3, 'Generational matrix has 3 tiers');
    verify(matrix.tiers[0].members.some(m => (m.core?.id || m.id) === 'person_master_elder1'), 'Elder placed in elders tier');
    verify(matrix.tiers[2].members.some(m => (m.core?.id || m.id) === 'person_master_child1'), 'Child placed in next generation tier');

    // --- CHECK 5: Protection Service, Masking & Countdown ---
    const refDate = new Date('2026-09-08');
    const policies = [
        {
            id: 'pol_master_term',
            provider: 'LifeGuard',
            policyNumber: 'LG-TERM-884411',
            policyType: PolicyType.TERM_LIFE,
            status: PolicyStatus.ACTIVE,
            insuredPersonIds: ['person_master_a'],
            nomineePersonIds: ['person_master_b'],
            nomineeCompleteness: true,
            coverageAmountPaise: 2000000000n, // ₹2.00 Cr
            premiumAmountPaise: 3000000n, // ₹30,000
            renewalDate: '2026-11-20'
        },
        {
            id: 'pol_master_health',
            provider: 'HealthGuard',
            policyNumber: 'HG-FLT-119933',
            policyType: PolicyType.HEALTH,
            status: PolicyStatus.ACTIVE,
            insuredPersonIds: ['person_master_a', 'person_master_b', 'person_master_child1'], // Elder 1 missing
            nomineePersonIds: ['person_master_b'],
            nomineeCompleteness: true,
            coverageAmountPaise: 250000000n, // ₹25.00 L
            premiumAmountPaise: 3500000n, // ₹35,000
            renewalDate: '2026-09-24' // 16 days away -> Expiring soon!
        }
    ];

    for (const p of policies) {
        await FamilyRepository.savePolicy(p);
    }

    const protSummary = FamilyProtectionService.getProtectionSummary(storedPersons, policies, refDate);
    verify(protSummary.totalTermCoverageDisplay === '₹2.00 Cr', 'Term coverage is ₹2.00 Cr');
    verify(protSummary.totalHealthCoverageDisplay === '₹25.00 L', 'Health coverage is ₹25.00 L');
    verify(protSummary.expiringSoonCount === 1, 'Detected 1 policy expiring within 30 days');
    verify(protSummary.uncoveredMembers.length === 1, 'Detected 1 uncovered family member');
    verify(protSummary.uncoveredMembers[0].id === 'person_master_elder1', 'Uncovered member is Elder 1');
    verify(protSummary.policiesList[0].policyNumberMasked === '•••• 4411', 'Policy number masked with 4 visible chars');

    // --- CHECK 6: Responsibility Task Workflows ---
    const responsibilities = [
        {
            id: 'resp_m_1',
            title: 'School Fees Due',
            category: ResponsibilityCategory.EDUCATION,
            assignedPersonId: 'person_master_a',
            affectedPersonId: 'person_master_child1',
            priority: ResponsibilityPriority.URGENT,
            status: ResponsibilityStatus.PENDING,
            dueDate: '2026-09-02', // Overdue relative to 2026-09-08
            estimatedAmountPaise: 6000000n // ₹60,000
        },
        {
            id: 'resp_m_2',
            title: 'Health Insurance Renewal',
            category: ResponsibilityCategory.HEALTHCARE,
            assignedPersonId: 'person_master_a',
            affectedPersonId: 'person_master_a',
            priority: ResponsibilityPriority.HIGH,
            status: ResponsibilityStatus.PENDING,
            dueDate: '2026-09-24',
            estimatedAmountPaise: 3500000n
        }
    ];

    for (const r of responsibilities) {
        await FamilyRepository.saveResponsibility(r);
    }

    const respView = FamilyResponsibilityService.getResponsibilitiesView({
        responsibilities,
        persons: storedPersons,
        filter: 'ALL',
        today: refDate
    });
    verify(respView.totalCount === 2, 'Total tasks count is 2');
    verify(respView.overdueCount === 1, 'Overdue task identified');
    verify(respView.tasks[0].id === 'resp_m_1', 'Urgent overdue task sorted first');
    verify(respView.tasks[0].estimatedAmountDisplay === '₹60,000', 'Amount formatted to ₹60,000');

    // --- CHECK 7: Assumption-Driven Education Horizon ---
    // Test unconfigured goal
    const unconfiguredGoal = calculateEducationProjection({ currentCostPaise: 0n, targetYear: null });
    verify(unconfiguredGoal.assumptionStatus === DataAvailabilityState.NOT_CONFIGURED, 'Unconfigured goal returns NOT_CONFIGURED');
    verify(unconfiguredGoal.projectedCostDisplay === '—', 'Unconfigured goal returns dash for projected cost');

    // Test configured goal: ₹30.00 L today, 8.0% inflation, 3 years (2026 -> 2029)
    // 30,00,000 * (1.08)^3 = 37,79,136 rupees = 377913600 paise
    const configuredGoal = calculateEducationProjection({
        currentCostPaise: 300000000n,
        inflationRateBps: 800,
        targetYear: 2029,
        currentYear: 2026,
        currentSavingsPaise: 150000000n // 15 Lakhs
    });
    verify(configuredGoal.assumptionStatus === DataAvailabilityState.AVAILABLE, 'Configured goal is AVAILABLE');
    verify(configuredGoal.projectedCostPaiseStr === '377913600', 'Compounded projected cost is 377913600 paise');
    verify(configuredGoal.projectedCostDisplay === '₹37.79 L', 'Projected cost display is ₹37.79 L');
    verify(configuredGoal.projectedShortfallDisplay === '₹22.79 L', 'Shortfall display is ₹22.79 L');

    // --- CHECK 8: Parents & Elder Care Framework ---
    const carePlans = [
        {
            id: 'care_m_1',
            parentPersonId: 'person_master_elder1',
            careCoordinatorId: 'person_master_b',
            careStatus: CareHealthStatus.MONITORING,
            monthlySupportBudgetPaise: 2500000n, // ₹25,000
            livingArrangement: 'Heritage Villa, Old Town',
            emergencyEscalationPlan: 'Neighbor Mr. Joshi has key; Dr. Physician 1 on speed dial'
        }
    ];

    for (const c of carePlans) {
        await FamilyRepository.saveElderCarePlan(c);
    }

    const careSummary = FamilyCareService.getCareSummary(carePlans, storedPersons);
    verify(careSummary.totalEldersUnderCare === 1, '1 elder under family care');
    verify(careSummary.totalMonthlySupportBudgetDisplay === '₹25,000', 'Monthly support budget display is ₹25,000');
    verify(careSummary.needsAttentionCount === 1, 'Elder in MONITORING status flags attention');

    // --- CHECK 9: Health & Medical Privacy Access Control ---
    const confidentialMedicalPerson = createPerson({
        id: 'person_sensitive_x',
        name: 'Person X',
        role: FamilyRole.MEMBER,
        privacy: { visibility: PrivacyLevel.CARE_TEAM_ONLY, createdBy: 'person_sensitive_x' },
        medicalProfile: { bloodGroup: 'AB+', chronicConditions: ['Asthma'], medications: ['Inhaler'] }
    });

    const redacted = sanitizeMedicalProfile(confidentialMedicalPerson.medicalProfile, confidentialMedicalPerson.privacy, 'STANDARD', 'other_user');
    verify(redacted.isRedacted === true, 'Confidential profile is redacted for standard viewer');
    verify(redacted.chronicConditions[0] === '[CONFIDENTIAL]', 'Chronic conditions marked confidential');

    const authorized = sanitizeMedicalProfile(confidentialMedicalPerson.medicalProfile, confidentialMedicalPerson.privacy, 'CARE_TEAM', 'person_master_doc1');
    verify(authorized.isRedacted === false, 'Confidential profile accessible by care team');
    verify(authorized.chronicConditions.includes('Asthma'), 'Asthma diagnosis accessible by authorized doctor');

    // --- CHECK 10: Financial Read-Only Synthesis & Emergency Liquidity Runway ---
    const nwSnapshot = await FamilyFinancialAdapter.getFamilyNetWorthSnapshot();
    verify(nwSnapshot.state !== undefined, 'Net worth snapshot computed with state');
    verify(typeof nwSnapshot.totalAssetsPaiseStr === 'string', 'Assets represented as string');

    const runway = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(40000000n, 5000000n); // 8 months
    verify(runway.runwayMonths === 8.0, 'Runway is 8.0 months');
    verify(runway.status === 'EXCELLENT', 'Runway status is EXCELLENT');
    verify(runway.meetsThreeMonthStandard === true, 'Meets 3-month standard');

    // --- CHECK 11: 9-Point Emergency Readiness Checklist & 9 Report Cards ---
    const documents = [
        { id: 'doc_m_1', title: 'Passport & Will', category: 'LEGAL' }
    ];

    const reportsData = FamilyReportViewModel.buildReportsData({
        persons: storedPersons,
        relationships: edges,
        policies,
        responsibilities,
        educationGoals: [{ childPersonId: 'person_master_child1', currentCostPaise: 300000000n, targetYear: 2029, inflationRateBps: 800 }],
        elderCarePlans: carePlans,
        documents,
        netWorthSnapshot: nwSnapshot,
        runwayMetrics: runway
    });

    verify(reportsData.reportCards.length === 9, 'Generates exactly 9 family report cards');
    verify(reportsData.emergencyReadiness.totalCount === 9, 'Emergency readiness standard contains 9 items');
    verify(reportsData.emergencyReadiness.completedCount >= 8, 'At least 8 standards fulfilled with test configuration');
    verify(reportsData.emergencyReadiness.readinessStatus === 'EXCELLENT', 'Emergency readiness status is EXCELLENT');

    // Verify zero BigInt leakage across reportCards
    const serializedReports = JSON.stringify(reportsData.reportCards);
    verify(typeof serializedReports === 'string', 'Report cards serialized to JSON without BigInt error');

    // Clean up
    await FamilyRepository.resetFamilyData();

    console.log(`\n=============================================================`);
    console.log(`[SUCCESS] Master Family Certification: ${totalChecks}/${totalChecks} checks passed (100%).`);
    console.log('=============================================================\n');
}

runMasterCertification().catch(err => {
    console.error('\n[FAIL] Master Certification Failed:', err);
    process.exit(1);
});
