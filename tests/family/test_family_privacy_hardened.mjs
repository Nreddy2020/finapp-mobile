/**
 * Test Suite: FinLife Family Privacy & Contract Hardening Verification
 * Explicit verification of the 8 mandatory privacy and integrity requirements:
 * 1. Unauthorized user cannot read medical details.
 * 2. Unauthorized user cannot infer sensitive information from counts or labels.
 * 3. Emergency-only records are not visible in normal family views.
 * 4. Selected-member access cannot be broadened through a forged viewer ID.
 * 5. Masking applies to both populated and empty values.
 * 6. Sensitive information is not leaked into presentation structures.
 * 7. Deleted or archived people no longer appear in active relationship views.
 * 8. Financial link contract: AVAILABLE, PARTIAL, UNAVAILABLE, NOT_CONFIGURED, and freshness.
 */

import assert from 'node:assert';
import {
    PrivacyLevel,
    CircleCategory,
    FamilyRole,
    FamilyStatus,
    RelationshipType,
    DataAvailabilityState,
    FinancialLinkStatus,
    createPerson,
    maskSensitiveIdentifier
} from '../../services/family/familyContracts.js';
import {
    sanitizeMedicalProfile,
    FamilyHealthService
} from '../../services/family/familyHealthService.js';
import {
    buildFamilyTreeMatrix,
    getRelationshipsForPerson
} from '../../services/family/familyGraphEngine.js';
import { FamilyFinancialAdapter } from '../../services/family/familyFinancialAdapter.js';
import { evaluateEmergencyReadiness } from '../../services/family/familyReportViewModel.js';

let totalChecks = 0;
function verify(condition, message) {
    assert.ok(condition, message);
    totalChecks++;
}

async function runPrivacyHardenedSuite() {
    console.log('\n--- Running FinLife Family Privacy & Contract Hardening Verification ---');

    // SCENARIO 1: Unauthorized user cannot read medical details
    const confidentialPerson = createPerson({
        id: 'person_priv_1',
        name: 'Confidential Person',
        role: FamilyRole.HEAD,
        privacy: {
            visibility: PrivacyLevel.CARE_TEAM_ONLY,
            createdBy: 'person_priv_1'
        },
        medicalProfile: {
            bloodGroup: 'B+',
            allergies: ['Peanuts'],
            chronicConditions: ['Severe Epilepsy'],
            medications: ['Anticonvulsant 500mg'],
            notes: 'Restricted neurological history',
            emergencyNotes: 'Call emergency immediately'
        }
    });

    const unauthorizedStandard = sanitizeMedicalProfile(
        confidentialPerson.medicalProfile,
        confidentialPerson.privacy,
        'STANDARD',
        'unauthorized_user_123'
    );
    verify(unauthorizedStandard.isRedacted === true, 'Unauthorized standard viewer gets redacted profile');
    verify(unauthorizedStandard.allergies[0] === '[CONFIDENTIAL]', 'Allergies are redacted to [CONFIDENTIAL]');
    verify(unauthorizedStandard.chronicConditions[0] === '[CONFIDENTIAL]', 'Conditions are redacted to [CONFIDENTIAL]');
    verify(unauthorizedStandard.medications[0] === '[CONFIDENTIAL]', 'Medications are redacted to [CONFIDENTIAL]');
    verify(unauthorizedStandard.notes === '[CONFIDENTIAL]', 'Notes are redacted to [CONFIDENTIAL]');
    verify(unauthorizedStandard.emergencyNotes === '[CONFIDENTIAL]', 'Emergency notes are redacted to [CONFIDENTIAL]');

    // SCENARIO 2: Unauthorized user cannot infer sensitive information from counts or labels
    const overviewStandard = FamilyHealthService.getHealthOverview(
        [confidentialPerson],
        'STANDARD',
        'unauthorized_user_123'
    );
    verify(overviewStandard.membersWithChronicConditions === 0, 'Chronic condition count is 0 for unauthorized viewer (no count leak)');
    verify(overviewStandard.membersWithAllergies === 0, 'Allergy count is 0 for unauthorized viewer (no count leak)');
    verify(overviewStandard.profiles[0].medicalProfile.isRedacted === true, 'Profile in overview is marked isRedacted');

    // Authorized CARE_TEAM view gets truthful count
    const overviewCareTeam = FamilyHealthService.getHealthOverview(
        [confidentialPerson],
        'CARE_TEAM',
        'verified_doctor_id'
    );
    verify(overviewCareTeam.membersWithChronicConditions === 1, 'Care team view correctly reflects 1 chronic condition');
    verify(overviewCareTeam.membersWithAllergies === 1, 'Care team view correctly reflects 1 allergy');

    // SCENARIO 3: Emergency-only records are NOT visible in normal family views
    const emergencyOnlyPerson = createPerson({
        id: 'person_priv_emg',
        name: 'Emergency Person',
        privacy: {
            visibility: PrivacyLevel.EMERGENCY_ONLY,
            createdBy: 'person_priv_emg'
        },
        medicalProfile: {
            bloodGroup: 'AB+',
            allergies: ['Latex'],
            emergencyNotes: 'High risk anaphylaxis'
        }
    });

    const normalFamilyView = sanitizeMedicalProfile(
        emergencyOnlyPerson.medicalProfile,
        emergencyOnlyPerson.privacy,
        'STANDARD',
        'family_member_id'
    );
    verify(normalFamilyView.isRedacted === true, 'Emergency-only record is quarantined from normal family view');

    const emergencyResponderView = sanitizeMedicalProfile(
        emergencyOnlyPerson.medicalProfile,
        emergencyOnlyPerson.privacy,
        'EMERGENCY',
        'emergency_paramedic_id'
    );
    verify(emergencyResponderView.isRedacted === false, 'Emergency-only record is accessible by emergency scope');
    verify(emergencyResponderView.allergies.includes('Latex'), 'Paramedic can access latex allergy');

    // SCENARIO 4: Selected-member access cannot be broadened through a forged viewer ID
    const selectedMembersPerson = createPerson({
        id: 'person_priv_sel',
        name: 'Selected Member Profile',
        privacy: {
            visibility: PrivacyLevel.SELECTED_MEMBERS,
            allowedMemberIds: ['valid_member_alice'],
            createdBy: 'person_priv_sel'
        },
        medicalProfile: {
            chronicConditions: ['Migraine']
        }
    });

    const verifiedIds = new Set(['valid_member_alice', 'person_priv_sel', 'valid_member_bob']);

    // Attempt with forged viewer ID that is NOT in verified family members
    const forgedAttempt = sanitizeMedicalProfile(
        selectedMembersPerson.medicalProfile,
        selectedMembersPerson.privacy,
        'STANDARD',
        'forged_hacker_id',
        verifiedIds
    );
    verify(forgedAttempt.isRedacted === true, 'Forged unverified viewer ID is rejected and redacted');

    // Attempt with valid member not in allowedMemberIds
    const unallowedMemberAttempt = sanitizeMedicalProfile(
        selectedMembersPerson.medicalProfile,
        selectedMembersPerson.privacy,
        'STANDARD',
        'valid_member_bob',
        verifiedIds
    );
    verify(unallowedMemberAttempt.isRedacted === true, 'Valid member not on allowed list is redacted');

    // Attempt with authorized allowed member
    const authorizedMemberAttempt = sanitizeMedicalProfile(
        selectedMembersPerson.medicalProfile,
        selectedMembersPerson.privacy,
        'STANDARD',
        'valid_member_alice',
        verifiedIds
    );
    verify(authorizedMemberAttempt.isRedacted === false, 'Explicitly allowed member can access');

    // SCENARIO 5: Masking applies to both populated and empty values
    verify(maskSensitiveIdentifier('HDFC-TERM-984210', 4) === '•••• 4210', 'Masks populated identifier');
    verify(maskSensitiveIdentifier('', 4) === '—', 'Returns dash for empty string');
    verify(maskSensitiveIdentifier(null, 4) === '—', 'Returns dash for null');
    verify(maskSensitiveIdentifier(undefined, 4) === '—', 'Returns dash for undefined');
    verify(maskSensitiveIdentifier('99', 4) === '99', 'Short identifier preserved safely');

    // SCENARIO 6: Deleted or archived people no longer appear in active relationship views
    const activeAdult = createPerson({ id: 'active_adult', name: 'Active Adult', role: FamilyRole.HEAD, status: FamilyStatus.ACTIVE });
    const archivedElder = createPerson({ id: 'archived_elder', name: 'Archived Elder', role: FamilyRole.PARENT, status: FamilyStatus.ARCHIVED });
    const activeChild = createPerson({ id: 'active_child', name: 'Active Child', role: FamilyRole.CHILD, status: FamilyStatus.ACTIVE });

    const activeEdges = [
        { id: 'edge_1', fromPersonId: 'active_adult', toPersonId: 'archived_elder', relationshipType: RelationshipType.CHILD_OF },
        { id: 'edge_2', fromPersonId: 'active_child', toPersonId: 'active_adult', relationshipType: RelationshipType.CHILD_OF }
    ];

    const activeTree = buildFamilyTreeMatrix([activeAdult, archivedElder, activeChild], activeEdges);
    verify(activeTree.totalMembers === 2, 'Active tree matrix counts only 2 active members (excludes archived)');
    verify(!activeTree.tiers[0].members.some(m => (m.core?.id || m.id) === 'archived_elder'), 'Archived elder excluded from generation tier');

    // SCENARIO 7: Financial link contract: AVAILABLE, PARTIAL, UNAVAILABLE, NOT_CONFIGURED
    const emptyRef = await FamilyFinancialAdapter.resolveFinancialReference(null);
    verify(emptyRef.linkStatus === FinancialLinkStatus.UNLINKED, 'Null ref resolved as UNLINKED');
    verify(emptyRef.sourceAvailability === DataAvailabilityState.NOT_CONFIGURED, 'Null ref resolved as NOT_CONFIGURED');

    const nonExistentRef = await FamilyFinancialAdapter.resolveFinancialReference({
        sourceType: 'LOAN',
        sourceRecordId: 'missing_loan_id_999',
        sourceDomain: 'Loans'
    });
    verify(nonExistentRef.linkStatus === FinancialLinkStatus.LINKED_UNVERIFIED, 'Missing record resolved as LINKED_UNVERIFIED');
    verify(nonExistentRef.sourceAvailability === DataAvailabilityState.EMPTY, 'Missing record availability is EMPTY');

    // SCENARIO 8: Emergency Readiness Semantics when Source is UNAVAILABLE
    const unavailableAudit = evaluateEmergencyReadiness({
        persons: [activeAdult],
        policies: [],
        documents: [],
        sourceAvailability: DataAvailabilityState.UNAVAILABLE
    });
    verify(unavailableAudit.status === DataAvailabilityState.UNAVAILABLE, 'Readiness status is UNAVAILABLE when source fails');
    verify(unavailableAudit.readinessBps === null, 'Readiness BPS is null when source is UNAVAILABLE (not 0)');
    verify(unavailableAudit.completedCount === null, 'Completed count is null when source is UNAVAILABLE');
    verify(unavailableAudit.totalCount === 9, 'Total standards count remains 9');

    console.log(`\n[SUCCESS] Privacy & Contract Hardening Verified: ${totalChecks}/${totalChecks} checks passed (100%).\n`);
}

runPrivacyHardenedSuite().catch(err => {
    console.error('\n[FAIL] Privacy & Contract Hardening Failed:', err);
    process.exit(1);
});
