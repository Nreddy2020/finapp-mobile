/**
 * FinLife Family Operating System — Phase 2: People & Relationships Certification Suite
 * Comprehensive verification of:
 * - Group 1: 10-Group Person Contract Validation
 * - Group 2: Sensitive Identifier Protection (Input, Persistence, Presentation)
 * - Group 3: Relationship Graph Integrity & Reciprocal Projections
 * - Group 4: Type-Specific Cycle & Ancestor Prevention
 * - Group 5: Multi-Generational Tree Matrix & Generational Statistics
 * - Group 6: Trusted Circle Categorization, Search & SOS Ranking
 * - Group 7: Person Profile Synthesis & Relational Connections
 * - Group 8: Privacy-Gated Contact Capabilities
 * - Group 9: Cascade Deletion & Orphan Edge Prevention
 * - Group 10: Presentation Safety & Idempotent Audit Logging
 */

import assert from 'assert';
import {
    CircleCategory,
    FamilyRole,
    PrivacyLevel,
    FamilyStatus,
    RelationshipType,
    RelationshipValidationResult,
    PROFILE_SECTION_ID,
    SECTION_STATUS,
    DEFAULT_EMERGENCY_CONFIG,
    createPerson,
    createRelationship,
    createHousehold,
    createActivityRecord,
    maskSensitiveIdentifier,
    calculateAge,
    evaluateContactCapabilities,
    validatePersonContractGroups
} from '../../services/family/familyContracts.js';

import {
    validateRelationshipEdge,
    getReciprocalRelationshipType,
    getRelationshipsForPerson,
    buildFamilyTreeMatrix,
    getPersonConnections,
    validatePersonDeletion
} from '../../services/family/familyGraphEngine.js';

import { FamilyRepository } from '../../services/family/familyRepository.js';
import { FamilyPeopleViewModel } from '../../services/family/familyPeopleViewModel.js';

console.log('\n=============================================================');
console.log('🚀 RUNNING PHASE 2: PEOPLE & RELATIONSHIPS CERTIFICATION SUITE');
console.log('=============================================================\n');

let checksPassed = 0;

function check(condition, message) {
    assert.ok(condition, message);
    checksPassed++;
}

async function runSuite() {
    await FamilyRepository.resetFamilyData();

    // -------------------------------------------------------------
    // GROUP 1: 10-Group Person Contract Validation
    // -------------------------------------------------------------
    console.log('--- Group 1: 10-Group Person Contract Validation ---');

    const personP1 = createPerson({
        id: 'person_nagarjuna',
        name: 'Nagarjuna Rao',
        preferredName: 'Naga',
        gender: 'MALE',
        dateOfBirth: '1984-04-12',
        role: FamilyRole.HEAD,
        circleCategory: CircleCategory.FAMILY,
        householdId: 'household_primary',
        nationalIdMasked: '123456789012',
        contact: {
            phone: '+91 98765 43210',
            email: 'naga@example.com',
            address: 'Flat 402, Green Meadows',
            isSharedAddress: true
        },
        profile: {
            bloodGroup: 'O+',
            occupation: 'Architect'
        },
        medicalProfile: {
            bloodGroup: 'O+',
            allergies: ['Penicillin']
        },
        emergencyProfile: {
            isEmergencyContact: true,
            priorityOrder: 1,
            reachable24x7: true
        },
        legalTags: {
            isNominee: true,
            isGuardian: true
        },
        privacy: {
            visibility: PrivacyLevel.FAMILY_ONLY
        }
    });

    const validationP1 = validatePersonContractGroups(personP1);
    check(validationP1.isValid === true, 'Person entity satisfies 10 canonical contract groups');
    check(validationP1.groupsVerified.identity === true, 'Identity contract group verified');
    check(validationP1.groupsVerified.role === true, 'Role contract group verified');
    check(validationP1.groupsVerified.category === true, 'Category contract group verified');
    check(validationP1.groupsVerified.contact === true, 'Contact contract group verified');
    check(validationP1.groupsVerified.household === true, 'Household contract group verified');
    check(validationP1.groupsVerified.medical === true, 'Medical contract group verified');
    check(validationP1.groupsVerified.legal === true, 'Legal contract group verified');
    check(validationP1.groupsVerified.dependency === true, 'Dependency contract group verified');
    check(validationP1.groupsVerified.privacy === true, 'Privacy contract group verified');
    check(validationP1.groupsVerified.lifecycle === true, 'Lifecycle contract group verified');

    // Functional role decoupled from presentation category
    check(personP1.role === FamilyRole.HEAD, 'Functional role is HEAD');
    check(personP1.circleCategory === CircleCategory.FAMILY, 'Circle category is FAMILY');
    check(calculateAge(personP1.core.dateOfBirth) >= 40, 'Age calculated accurately from date of birth');

    // -------------------------------------------------------------
    // GROUP 2: Sensitive Identifier Protection (Input, Persistence, Presentation)
    // -------------------------------------------------------------
    console.log('--- Group 2: Sensitive Identifier Protection ---');

    check(maskSensitiveIdentifier('123456789012', 4) === '•••• 9012', 'Masks 12-digit national ID to last 4 digits');
    check(maskSensitiveIdentifier('•••• 9012') === '•••• 9012', 'Preserves already masked identifier without double-masking');
    check(maskSensitiveIdentifier('A'.repeat(60)) === '—', 'Rejects oversized invalid identifiers safely');
    check(maskSensitiveIdentifier(null) === '—', 'Returns dash for null identifier');
    check(maskSensitiveIdentifier('') === '—', 'Returns dash for empty identifier');

    // Input-level protection: raw identifier never stored in repository
    const personWithId = createPerson({
        id: 'person_with_id',
        name: 'Protected Person',
        nationalIdMasked: '987654321098'
    });
    check(personWithId.nationalIdMasked === '•••• 1098', 'createPerson transforms raw ID to masked representation');
    check(personWithId.core.nationalIdMasked === '•••• 1098', 'core.nationalIdMasked is masked');

    // -------------------------------------------------------------
    // GROUP 3: Relationship Graph Integrity & Reciprocals
    // -------------------------------------------------------------
    console.log('--- Group 3: Relationship Graph Integrity & Reciprocals ---');

    const personSpouse = createPerson({
        id: 'person_ananya',
        name: 'Ananya Sharma',
        role: FamilyRole.SPOUSE,
        circleCategory: CircleCategory.FAMILY
    });
    const personChild = createPerson({
        id: 'person_aarav',
        name: 'Aarav Rao',
        role: FamilyRole.CHILD,
        circleCategory: CircleCategory.FAMILY
    });
    const personElder = createPerson({
        id: 'person_vr_reddy',
        name: 'V. R. Reddy',
        role: FamilyRole.PARENT,
        circleCategory: CircleCategory.FAMILY
    });
    const personDoctor = createPerson({
        id: 'person_dr_verma',
        name: 'Dr. Verma',
        role: FamilyRole.DOCTOR,
        circleCategory: CircleCategory.OTHERS
    });

    await FamilyRepository.savePerson(personP1);
    await FamilyRepository.savePerson(personSpouse);
    await FamilyRepository.savePerson(personChild);
    await FamilyRepository.savePerson(personElder);
    await FamilyRepository.savePerson(personDoctor);

    // Save relationship: Nagarjuna SPOUSE_OF Ananya
    const relSpouse = await FamilyRepository.saveRelationship({
        id: 'rel_naga_ananya',
        fromPersonId: 'person_nagarjuna',
        toPersonId: 'person_ananya',
        relationshipType: RelationshipType.SPOUSE_OF
    });
    check(relSpouse.id === 'rel_naga_ananya', 'Spouse relationship created');

    // Reciprocal projection test
    const allRels = await FamilyRepository.getRelationships();
    const ananyaRels = getRelationshipsForPerson('person_ananya', allRels);
    const reciprocalSpouse = ananyaRels.find(r => r.relatedPersonId === 'person_nagarjuna');
    check(reciprocalSpouse !== undefined, 'Reciprocal relationship projected for Ananya');
    check(reciprocalSpouse.relationshipType === RelationshipType.SPOUSE_OF, 'Reciprocal spouse type matches');
    check(reciprocalSpouse.isReciprocal === true, 'Marked as isReciprocal = true');

    // Parent-Child relationship
    const relParentChild = await FamilyRepository.saveRelationship({
        id: 'rel_naga_aarav',
        fromPersonId: 'person_nagarjuna',
        toPersonId: 'person_aarav',
        relationshipType: RelationshipType.PARENT_OF
    });
    const aaravRels = getRelationshipsForPerson('person_aarav', await FamilyRepository.getRelationships());
    const reciprocalChild = aaravRels.find(r => r.relatedPersonId === 'person_nagarjuna');
    check(reciprocalChild.relationshipType === RelationshipType.CHILD_OF, 'Nagarjuna PARENT_OF Aarav reciprocates to Aarav CHILD_OF Nagarjuna');

    // -------------------------------------------------------------
    // GROUP 4: Type-Specific Cycle & Ancestor Prevention
    // -------------------------------------------------------------
    console.log('--- Group 4: Type-Specific Cycle & Ancestor Prevention ---');

    const existingRels = await FamilyRepository.getRelationships();

    // 1. Self-link rejection
    const selfValidation = validateRelationshipEdge({
        fromPersonId: 'person_nagarjuna',
        toPersonId: 'person_nagarjuna',
        relationshipType: RelationshipType.FRIEND_OF
    }, existingRels);
    check(selfValidation.isValid === false, 'Self-link is rejected');
    check(selfValidation.code === RelationshipValidationResult.SELF_LINK, 'Self-link returns SELF_LINK code');

    // 2. Duplicate edge rejection
    const dupValidation = validateRelationshipEdge({
        fromPersonId: 'person_nagarjuna',
        toPersonId: 'person_ananya',
        relationshipType: RelationshipType.SPOUSE_OF
    }, existingRels);
    check(dupValidation.isValid === false, 'Duplicate edge is rejected');
    check(dupValidation.code === RelationshipValidationResult.DUPLICATE_RELATIONSHIP, 'Duplicate returns DUPLICATE_RELATIONSHIP code');

    // 3. Hierarchical cycle: making parent child of their own child
    const cycleValidation = validateRelationshipEdge({
        fromPersonId: 'person_nagarjuna',
        toPersonId: 'person_aarav',
        relationshipType: RelationshipType.CHILD_OF
    }, existingRels);
    check(cycleValidation.isValid === false, 'Hierarchical ancestor cycle rejected');
    check(cycleValidation.code === RelationshipValidationResult.ANCESTOR_CYCLE, 'Cycle returns ANCESTOR_CYCLE code');

    // 4. Non-hierarchical social loop: A is friend of B, B is friend of C, C is friend of A
    // Must NOT be rejected
    const friendEdge1 = { id: 'f1', fromPersonId: 'p_a', toPersonId: 'p_b', relationshipType: RelationshipType.FRIEND_OF };
    const friendEdge2 = { id: 'f2', fromPersonId: 'p_b', toPersonId: 'p_c', relationshipType: RelationshipType.FRIEND_OF };
    const nonHierarchicalCycle = validateRelationshipEdge({
        fromPersonId: 'p_c',
        toPersonId: 'p_a',
        relationshipType: RelationshipType.FRIEND_OF
    }, [friendEdge1, friendEdge2]);
    check(nonHierarchicalCycle.isValid === true, 'Non-hierarchical social cycles are permitted');

    // -------------------------------------------------------------
    // GROUP 5: Multi-Generational Tree Matrix & Generational Statistics
    // -------------------------------------------------------------
    console.log('--- Group 5: Multi-Generational Tree Matrix & Stats ---');

    // Link Elder V.R. Reddy as PARENT_OF Nagarjuna
    await FamilyRepository.saveRelationship({
        id: 'rel_vr_naga',
        fromPersonId: 'person_vr_reddy',
        toPersonId: 'person_nagarjuna',
        relationshipType: RelationshipType.PARENT_OF
    });

    const currentPersons = await FamilyRepository.getPersons();
    const currentRels = await FamilyRepository.getRelationships();

    const treeVm = FamilyPeopleViewModel.buildFamilyTreeViewModel(currentPersons, currentRels);
    check(treeVm.state === SECTION_STATUS.AVAILABLE, 'Tree ViewModel state is AVAILABLE');
    check(treeVm.tiers.length === 3, 'Tree has 3 generational tiers');
    check(treeVm.tiers[0].id === 'TIER_ELDERS', 'Tier 0 is TIER_ELDERS');
    check(treeVm.tiers[1].id === 'TIER_ADULTS', 'Tier 1 is TIER_ADULTS');
    check(treeVm.tiers[2].id === 'TIER_CHILDREN', 'Tier 2 is TIER_CHILDREN');

    // Check generational stats
    check(treeVm.stats.generationsRepresented === 3, 'All 3 generations represented (Elders, Adults, Children)');
    check(treeVm.stats.eldersCount >= 1, 'Elders tier has member (V. R. Reddy)');
    check(treeVm.stats.adultsCount >= 2, 'Adults tier has members (Nagarjuna, Ananya)');
    check(treeVm.stats.childrenCount >= 1, 'Children tier has member (Aarav)');

    // -------------------------------------------------------------
    // GROUP 6: Trusted Circle Categorization, Search & SOS Ranking
    // -------------------------------------------------------------
    console.log('--- Group 6: Trusted Circle Categorization & Ranking ---');

    const circleVmFamily = FamilyPeopleViewModel.buildTrustedCircleViewModel(currentPersons, CircleCategory.FAMILY);
    check(circleVmFamily.counts.family >= 4, 'Family category has >= 4 members');
    check(circleVmFamily.counts.others >= 1, 'Others category has Doctor Verma');

    const circleVmOthers = FamilyPeopleViewModel.buildTrustedCircleViewModel(currentPersons, CircleCategory.OTHERS);
    check(circleVmOthers.contacts.some(c => c.name === 'Dr. Verma'), 'Dr. Verma appears in Others / Care & Advisors circle');

    // Search query filter
    const searchVm = FamilyPeopleViewModel.buildTrustedCircleViewModel(currentPersons, CircleCategory.FAMILY, 'Aarav');
    check(searchVm.contacts.length === 1 && searchVm.contacts[0].name === 'Aarav Rao', 'Search filters precisely to Aarav');

    // SOS ranking order: emergency contacts sorted first by priorityOrder asc
    const circleSorted = FamilyPeopleViewModel.buildTrustedCircleViewModel(currentPersons, CircleCategory.FAMILY);
    const firstContact = circleSorted.contacts[0];
    check(firstContact.isEmergency === true && firstContact.emergencyPriority === 1, 'Priority #1 emergency contact ranks first');

    // -------------------------------------------------------------
    // GROUP 7: Person Profile Synthesis & Relational Connections
    // -------------------------------------------------------------
    console.log('--- Group 7: Person Profile Synthesis & Connections ---');

    const connections = getPersonConnections('person_nagarjuna', currentPersons, currentRels);
    check(connections.directRelationships.length >= 2, 'Synthesizes Nagarjuna direct relations');
    check(connections.totalConnections >= 2, 'Total connections calculated');

    const profileVm = FamilyPeopleViewModel.buildPersonProfileViewModel(personP1, connections);
    check(profileVm.id === 'person_nagarjuna', 'Profile VM has person ID');
    check(profileVm.sections.length === 11, 'Profile VM contains all 11 stable section IDs');

    const identitySec = profileVm.sections.find(s => s.id === PROFILE_SECTION_ID.IDENTITY);
    check(identitySec.data.nationalIdLabel === 'Protected identifier', 'National ID labeled as Protected identifier');
    check(identitySec.data.isProtected === true, 'National ID isProtected flag is true');

    const medSec = profileVm.sections.find(s => s.id === PROFILE_SECTION_ID.MEDICAL_EMERGENCY);
    check(medSec.data.bloodGroup === 'O+', 'Blood group synthesized in Medical section');
    check(medSec.data.isEmergencyContact === true, 'Emergency contact status synthesized');

    // -------------------------------------------------------------
    // GROUP 8: Privacy-Gated Contact Capabilities
    // -------------------------------------------------------------
    console.log('--- Group 8: Privacy-Gated Contact Capabilities ---');

    // Public / Family contact: allowed
    const publicPerson = createPerson({ id: 'p_pub', name: 'Public Contact', contact: { phone: '123' }, privacy: { visibility: PrivacyLevel.FAMILY_ONLY } });
    const publicCaps = evaluateContactCapabilities(publicPerson);
    check(publicCaps.canCall === true, 'Family privacy allows call when phone exists');
    check(publicCaps.canViewContact === true, 'Family privacy allows viewing contact');

    // Restricted contact: disabled
    const restrictedPerson = createPerson({ id: 'p_res', name: 'Restricted Contact', contact: { phone: '999' }, privacy: { visibility: PrivacyLevel.RESTRICTED } });
    const restrictedCaps = evaluateContactCapabilities(restrictedPerson);
    check(restrictedCaps.canCall === false, 'Restricted privacy blocks call');
    check(restrictedCaps.canViewContact === false, 'Restricted privacy conceals contact details');
    check(restrictedCaps.contactBlockedReason !== null, 'Restricted privacy exposes blocked reason');

    // Confidential contact: call allowed, sms/email blocked
    const confPerson = createPerson({ id: 'p_conf', name: 'Confidential Contact', contact: { phone: '555', email: 'c@c.com' }, privacy: { visibility: PrivacyLevel.CONFIDENTIAL } });
    const confCaps = evaluateContactCapabilities(confPerson);
    check(confCaps.canCall === true, 'Confidential allows voice call');
    check(confCaps.canSms === false, 'Confidential blocks SMS');

    // -------------------------------------------------------------
    // GROUP 9: Cascade Deletion & Orphan Edge Prevention
    // -------------------------------------------------------------
    console.log('--- Group 9: Cascade Deletion & Orphan Edge Prevention ---');

    const deletionPreview = await FamilyRepository.validatePersonDeletion('person_aarav');
    check(deletionPreview.canDelete === true, 'validatePersonDeletion confirms person can be deleted');
    check(deletionPreview.cascadeCount >= 1, 'Reports relationship edge cascade count');

    // Perform atomic deletion
    await FamilyRepository.deletePerson('person_aarav');
    const remainingPersons = await FamilyRepository.getPersons();
    check(!remainingPersons.some(p => p.id === 'person_aarav'), 'Aarav removed from persons');

    const remainingRels = await FamilyRepository.getRelationships();
    const orphanEdges = remainingRels.filter(r => r.fromPersonId === 'person_aarav' || r.toPersonId === 'person_aarav');
    check(orphanEdges.length === 0, 'Zero orphan relationship edges remain after person deletion');

    // -------------------------------------------------------------
    // GROUP 10: Presentation Safety, Config-Driven Emergency & Audit
    // -------------------------------------------------------------
    console.log('--- Group 10: Presentation Safety & Audit Logging ---');

    // 1. Recursive scanner: verify 0 raw BigInt, 0 non-finite numbers in ViewModels
    function scanSafety(obj, path = '') {
        if (obj === null || obj === undefined) return;
        if (typeof obj === 'bigint') {
            throw new Error(`Raw BigInt found at ${path}`);
        }
        if (typeof obj === 'number') {
            if (!Number.isFinite(obj)) {
                throw new Error(`Non-finite number found at ${path}: ${obj}`);
            }
        }
        if (typeof obj === 'object') {
            for (const [k, v] of Object.entries(obj)) {
                scanSafety(v, `${path}.${k}`);
            }
        }
    }

    scanSafety(treeVm, 'TreeViewModel');
    scanSafety(circleVmFamily, 'CircleViewModel');
    scanSafety(profileVm, 'ProfileViewModel');
    check(true, 'Zero raw BigInt and zero non-finite numbers across all Phase 2 ViewModels');

    // 2. Internationalized Emergency Config
    check(DEFAULT_EMERGENCY_CONFIG.countryCode === 'IN', 'Default country code is IN');
    check(DEFAULT_EMERGENCY_CONFIG.emergencyServices.length === 3, 'Emergency config contains 3 speed dial services');
    check(DEFAULT_EMERGENCY_CONFIG.emergencyServices[0].number === '112', 'National emergency is 112');

    // 3. Activity Log idempotency & redaction
    const actRecord = createActivityRecord({
        actionType: 'PERSON_UPDATED',
        description: 'Profile updated for Nagarjuna Rao',
        metadata: {
            nationalId: 'SECRET_RAW_123',
            safeNote: 'Updated contact'
        }
    });
    check(actRecord.metadata.nationalId === undefined, 'Raw national ID automatically cleansed from activity record metadata');
    check(actRecord.idempotencyKey !== undefined, 'Activity record has deterministic idempotencyKey');

    const activityLogs = await FamilyRepository.getFamilyActivityLog();
    check(activityLogs.length > 0, 'Append-only activity log records Phase 2 lifecycle events');
    check(activityLogs.every(l => !l.description.includes('SECRET_RAW')), 'Zero raw secrets leak into activity audit log');

    console.log('\n=============================================================');
    console.log(`[SUCCESS] Phase 2 People & Relationships: ${checksPassed}/${checksPassed} checks passed (100%).`);
    console.log('=============================================================\n');
}

runSuite().catch(err => {
    console.error('[FAIL] Phase 2 Certification Suite Failed:', err);
    process.exit(1);
});
