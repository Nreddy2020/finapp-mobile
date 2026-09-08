/**
 * Test Suite: FinLife Family Phase 3 Education, Care & Health
 * Verifies assumption-driven education projections, elder care coordination, and privacy-gated health data.
 * Uses neutral identities.
 */

import assert from 'node:assert';
import {
    CircleCategory,
    FamilyRole,
    PrivacyLevel,
    CareHealthStatus,
    DataAvailabilityState,
    createPerson
} from '../../services/family/familyContracts.js';
import {
    calculateEducationProjection,
    FamilyEducationService
} from '../../services/family/familyEducationService.js';
import { FamilyCareService } from '../../services/family/familyCareService.js';
import {
    FamilyHealthService,
    sanitizeMedicalProfile
} from '../../services/family/familyHealthService.js';

let totalAssertions = 0;
function check(condition, message) {
    assert.ok(condition, message);
    totalAssertions++;
}

async function runPhase3Tests() {
    console.log('\n--- Running FinLife Family Phase 3 Education, Care & Health Verification ---');

    // 1. Education Projections - Unconfigured State
    const unconfigured = calculateEducationProjection({
        currentCostPaise: 0n,
        targetYear: null
    });
    check(unconfigured.assumptionStatus === DataAvailabilityState.NOT_CONFIGURED, 'Unconfigured when cost is 0 or year is null');
    check(unconfigured.projectedCostDisplay === '—', 'Unconfigured display is dash');
    check(unconfigured.projectedCostPaiseStr === null, 'Unconfigured paise string is null');

    // 2. Education Projections - Mathematical Compound Calculation
    // 25 Lakhs today, 8.0% p.a. inflation, 3 years remaining (2026 to 2029)
    // 25,00,000 * (1.08)^3 = 31,49,280 rupees = 314928000 paise
    const projected = calculateEducationProjection({
        currentCostPaise: 250000000n, // 25 Lakhs
        inflationRateBps: 800, // 8.0%
        targetYear: 2029,
        currentYear: 2026,
        currentSavingsPaise: 100000000n // 10 Lakhs
    });

    check(projected.assumptionStatus === DataAvailabilityState.AVAILABLE, 'Projected status is AVAILABLE');
    check(projected.yearsRemaining === 3, 'Years remaining is 3');
    check(projected.currentCostDisplay === '₹25.00 L', 'Current cost is ₹25.00 L');
    check(projected.inflationRatePercent === '8.0%', 'Inflation percent is 8.0%');
    check(projected.projectedCostPaiseStr === '314928000', 'Projected cost paise calculated correctly: 314928000');
    check(projected.projectedCostDisplay === '₹31.49 L', 'Projected cost formatted to ₹31.49 L');
    // Shortfall: 314928000 - 100000000 = 214928000 paise = 21.49 L
    check(projected.projectedShortfallPaiseStr === '214928000', 'Shortfall paise calculated correctly');
    check(projected.projectedShortfallDisplay === '₹21.49 L', 'Shortfall displayed as ₹21.49 L');

    // 3. Education Service Summary
    const child1 = createPerson({ id: 'person_p3_child1', name: 'Child 1', role: FamilyRole.CHILD });
    const goals = [
        {
            id: 'edu_p3_1',
            childPersonId: 'person_p3_child1',
            goalTitle: 'College Degree',
            targetYear: 2029,
            currentCostPaise: 250000000n,
            inflationRateBps: 800,
            currentSavingsPaise: 100000000n
        },
        {
            id: 'edu_p3_2',
            childPersonId: 'person_p3_child1',
            goalTitle: 'Unset Goal',
            targetYear: null,
            currentCostPaise: 0n
        }
    ];

    const eduSummary = FamilyEducationService.getEducationSummary(goals, [child1], 2026);
    check(eduSummary.state === DataAvailabilityState.AVAILABLE, 'Summary state is AVAILABLE');
    check(eduSummary.goalsCount === 2, 'Goal count is 2');
    check(eduSummary.totalProjectedCostPaiseStr === '314928000', 'Total projected paise includes configured goals');

    // 4. Parents & Elder Care Service
    const elder1 = createPerson({ id: 'person_p3_elder1', name: 'Elder 1', role: FamilyRole.PARENT });
    const adult1 = createPerson({ id: 'person_p3_adult1', name: 'Adult 1', role: FamilyRole.HEAD });

    const carePlans = [
        {
            id: 'care_p3_1',
            parentPersonId: 'person_p3_elder1',
            careCoordinatorId: 'person_p3_adult1',
            careStatus: CareHealthStatus.MONITORING,
            monthlySupportBudgetPaise: 2000000n, // ₹20,000 / mo
            livingArrangement: 'Independent City Residence'
        }
    ];

    const careSummary = FamilyCareService.getCareSummary(carePlans, [elder1, adult1]);
    check(careSummary.state === DataAvailabilityState.AVAILABLE, 'Care summary is AVAILABLE');
    check(careSummary.totalEldersUnderCare === 1, '1 elder under care');
    check(careSummary.totalMonthlySupportBudgetPaiseStr === '2000000', 'Monthly support budget paise is 2000000');
    check(careSummary.totalMonthlySupportBudgetDisplay === '₹20,000', 'Monthly support budget display is ₹20,000');
    check(careSummary.needsAttentionCount === 1, 'Elder in MONITORING status flagged as needs attention');
    check(careSummary.plansList[0].coordinatorName === 'Adult 1', 'Coordinator mapped to Adult 1');
    check(careSummary.plansList[0].parentName === 'Elder 1', 'Parent mapped to Elder 1');

    // 5. Health & Care Service Privacy Enforcement
    const confidentialPerson = createPerson({
        id: 'person_p3_sensitive',
        name: 'Person Sensitive',
        role: FamilyRole.HEAD,
        privacy: {
            visibility: PrivacyLevel.CARE_TEAM_ONLY,
            createdBy: 'person_p3_sensitive'
        },
        medicalProfile: {
            bloodGroup: 'B+',
            allergies: ['Peanuts', 'Sulfa'],
            chronicConditions: ['Type 2 Diabetes'],
            medications: ['Metformin 500mg'],
            emergencyNotes: 'Severe reaction to sulfa'
        }
    });

    const doctor1 = createPerson({
        id: 'person_p3_doc',
        name: 'Dr. Test Consultant',
        circleCategory: CircleCategory.OTHERS,
        role: FamilyRole.OTHER,
        profile: { occupation: 'Consultant Physician' },
        contact: { phone: '+91 99999 88888' }
    });

    // Standard unauthorized viewer
    const redactedProfile = sanitizeMedicalProfile(
        confidentialPerson.medicalProfile,
        confidentialPerson.privacy,
        'STANDARD',
        'stranger_id'
    );
    check(redactedProfile.isRedacted === true, 'Profile is redacted for standard viewer');
    check(redactedProfile.allergies[0] === '[CONFIDENTIAL]', 'Allergies are confidential');
    check(redactedProfile.medications[0] === '[CONFIDENTIAL]', 'Medications are confidential');
    check(redactedProfile.chronicConditions[0] === '[CONFIDENTIAL]', 'Chronic conditions are confidential');

    // Authorized CARE_TEAM viewer
    const authorizedProfile = sanitizeMedicalProfile(
        confidentialPerson.medicalProfile,
        confidentialPerson.privacy,
        'CARE_TEAM',
        'person_p3_doc'
    );
    check(authorizedProfile.isRedacted === false, 'Profile is not redacted for CARE_TEAM viewer');
    check(authorizedProfile.allergies.includes('Peanuts'), 'Peanuts allergy accessible by care team');
    check(authorizedProfile.medications.includes('Metformin 500mg'), 'Medication accessible by care team');

    // Doctor directory search
    const doctors = FamilyHealthService.getDoctors([child1, adult1, elder1, doctor1]);
    check(doctors.length === 1, 'Doctor found in directory');
    check(doctors[0].core.name === 'Dr. Test Consultant', 'Doctor name is Dr. Test Consultant');

    console.log(`\n[SUCCESS] Phase 3 Education, Care & Health Verified: ${totalAssertions}/${totalAssertions} checks passed (100%).\n`);
}

runPhase3Tests().catch(err => {
    console.error('\n[FAIL] Phase 3 Verification Failed:', err);
    process.exit(1);
});
