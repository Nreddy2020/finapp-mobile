/**
 * Test Suite: FinLife Family Phase 1 Foundation
 * Verifies bounded models, repository persistence, demo isolation, and graph engine invariants.
 * Uses neutral identities (Person A, Person B, Child 1, Elder 1, Doctor 1).
 */

import assert from 'node:assert';
import {
    RelationshipType,
    CircleCategory,
    FamilyRole,
    FamilyStatus,
    PrivacyLevel,
    PolicyType,
    PolicyStatus,
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
    buildFamilyTreeMatrix,
    getReciprocalRelationshipType
} from '../../services/family/familyGraphEngine.js';

let totalAssertions = 0;
function check(condition, message) {
    assert.ok(condition, message);
    totalAssertions++;
}

async function runPhase1Tests() {
    console.log('\n--- Running FinLife Family Phase 1 Foundation Verification ---');

    // 1. Contract & Sub-Model Tests
    const personA = createPerson({
        id: 'person_test_a',
        name: 'Person A',
        preferredName: 'Alice',
        gender: 'FEMALE',
        circleCategory: CircleCategory.FAMILY,
        role: FamilyRole.HEAD,
        contact: { phone: '+91 90000 00001', email: 'alice@test.org' },
        profile: { bloodGroup: 'O+' },
        privacy: { visibility: PrivacyLevel.FAMILY_ONLY },
        emergencyProfile: { isEmergencyContact: true, priorityOrder: 1 }
    });

    check(personA.core.id === 'person_test_a', 'Person A core ID matches');
    check(personA.core.name === 'Person A', 'Person A name matches');
    check(personA.contact.phone === '+91 90000 00001', 'Person A phone matches');
    check(personA.profile.bloodGroup === 'O+', 'Person A blood group uppercase matches');
    check(personA.privacy.visibility === PrivacyLevel.FAMILY_ONLY, 'Person A privacy level matches');
    check(personA.emergencyProfile.isEmergencyContact === true, 'Person A emergency contact matches');

    // 2. Financial Reference Tests
    const finRef = createFinancialReference({
        sourceType: 'INVESTMENT_GOAL',
        sourceRecordId: 'inv_123',
        sourceDomain: 'InvestmentService',
        label: 'Higher Education Fund'
    });
    check(finRef.sourceType === 'INVESTMENT_GOAL', 'Financial ref sourceType matches');
    check(finRef.sourceDomain === 'InvestmentService', 'Financial ref sourceDomain matches');
    check(finRef.linkStatus === 'UNLINKED', 'Default linkStatus is UNLINKED');

    // 3. Mask Sensitive Identifier Tests
    check(maskSensitiveIdentifier('HDFC-TERM-984210', 4) === '•••• 4210', 'Masks policy number with 4 trailing digits');
    check(maskSensitiveIdentifier('', 4) === '—', 'Returns dash for empty identifier');
    check(maskSensitiveIdentifier('123', 4) === '123', 'Leaves short string intact without crashing');

    // 4. Emergency Readiness Items Check
    check(EMERGENCY_READINESS_ITEMS.length === 9, 'Emergency readiness standard contains exactly 9 items');

    // 5. Demo Fixture Isolation
    setFamilyDemoMode(false);
    check(isFamilyDemoModeEnabled() === false, 'Demo mode disabled initially');

    // 6. Repository Atomic Save & Load with BigInt Invariants
    await FamilyRepository.resetFamilyData();
    const initialPersons = await FamilyRepository.getPersons();
    check(initialPersons.length === 0, 'Reset family data yields empty persons list');

    const personB = createPerson({
        id: 'person_test_b',
        name: 'Person B',
        preferredName: 'Bob',
        role: FamilyRole.SPOUSE
    });
    const child1 = createPerson({
        id: 'person_test_child_1',
        name: 'Child 1',
        preferredName: 'Charlie',
        role: FamilyRole.CHILD
    });
    const elder1 = createPerson({
        id: 'person_test_elder_1',
        name: 'Elder 1',
        preferredName: 'David',
        role: FamilyRole.PARENT
    });

    await FamilyRepository.savePerson(personA);
    await FamilyRepository.savePerson(personB);
    await FamilyRepository.savePerson(child1);
    await FamilyRepository.savePerson(elder1);

    const savedPersons = await FamilyRepository.getPersons();
    check(savedPersons.length === 4, 'Saved 4 distinct neutral persons');

    const fetchedPersonA = await FamilyRepository.getPersonById('person_test_a');
    check(fetchedPersonA.core.name === 'Person A', 'Fetched Person A by ID matches');

    // Test Policy with BigInt amounts
    const policyA = {
        id: 'pol_test_1',
        provider: 'National Assurance',
        policyNumber: 'NA-TERM-001',
        policyType: PolicyType.TERM_LIFE,
        coverageAmountPaise: 1500000000n, // ₹1.5 Cr
        premiumAmountPaise: 2500000n, // ₹25,000
        status: PolicyStatus.ACTIVE
    };
    await FamilyRepository.savePolicy(policyA);

    const loadedPolicies = await FamilyRepository.getPolicies();
    check(loadedPolicies.length === 1, 'Policy loaded from repository');
    check(typeof loadedPolicies[0].coverageAmountPaise === 'bigint', 'Policy coverageAmountPaise deserialized as BigInt');
    check(loadedPolicies[0].coverageAmountPaise === 1500000000n, 'Policy coverageAmountPaise preserves exact BigInt value');

    // 7. Graph Engine Validation Tests
    const existingEdges = [
        { id: 'edge_1', fromPersonId: 'person_test_a', toPersonId: 'person_test_b', relationshipType: RelationshipType.SPOUSE_OF },
        { id: 'edge_2', fromPersonId: 'person_test_child_1', toPersonId: 'person_test_a', relationshipType: RelationshipType.CHILD_OF },
        { id: 'edge_3', fromPersonId: 'person_test_child_1', toPersonId: 'person_test_b', relationshipType: RelationshipType.CHILD_OF },
        { id: 'edge_4', fromPersonId: 'person_test_a', toPersonId: 'person_test_elder_1', relationshipType: RelationshipType.CHILD_OF }
    ];

    // Check self-relationship rejection
    const selfEdgeValidation = validateRelationshipEdge({
        fromPersonId: 'person_test_a',
        toPersonId: 'person_test_a',
        relationshipType: RelationshipType.SPOUSE_OF
    }, existingEdges);
    check(selfEdgeValidation.isValid === false, 'Self-relationship rejected correctly');

    // Check duplicate edge rejection
    const dupEdgeValidation = validateRelationshipEdge({
        fromPersonId: 'person_test_a',
        toPersonId: 'person_test_b',
        relationshipType: RelationshipType.SPOUSE_OF
    }, existingEdges);
    check(dupEdgeValidation.isValid === false, 'Duplicate relationship edge rejected correctly');

    // Check parent-child direct loop rejection (A is parent of Child 1, Child 1 cannot be parent of A)
    const directLoopValidation = validateRelationshipEdge({
        fromPersonId: 'person_test_a',
        toPersonId: 'person_test_child_1',
        relationshipType: RelationshipType.CHILD_OF
    }, existingEdges);
    check(directLoopValidation.isValid === false, 'Direct parent-child loop rejected correctly');

    // Check generational ancestor loop rejection (Elder 1 cannot be child of Child 1)
    const ancestorLoopValidation = validateRelationshipEdge({
        fromPersonId: 'person_test_elder_1',
        toPersonId: 'person_test_child_1',
        relationshipType: RelationshipType.CHILD_OF
    }, existingEdges);
    check(ancestorLoopValidation.isValid === false, 'Generational ancestor cycle rejected correctly');

    // 8. Graph Projections & Traversal
    const relsForA = getRelationshipsForPerson('person_test_a', existingEdges);
    // person A has:
    // - direct SPOUSE_OF B
    // - direct CHILD_OF Elder 1
    // - projected PARENT_OF Child 1
    check(relsForA.length === 3, 'Person A has 3 combined direct & projected relationships');

    const spouseOfA = getSpouse('person_test_a', existingEdges);
    check(spouseOfA === 'person_test_b', 'Spouse of Person A is Person B');

    const spouseOfB = getSpouse('person_test_b', existingEdges);
    check(spouseOfB === 'person_test_a', 'Projected spouse of Person B is Person A');

    const childrenOfA = getChildren('person_test_a', existingEdges);
    check(childrenOfA.includes('person_test_child_1'), 'Children of Person A includes Child 1');

    const parentsOfChild1 = getParents('person_test_child_1', existingEdges);
    check(parentsOfChild1.length === 2, 'Child 1 has 2 parents');
    check(parentsOfChild1.includes('person_test_a') && parentsOfChild1.includes('person_test_b'), 'Child 1 parents are Person A and Person B');

    const parentsOfA = getParents('person_test_a', existingEdges);
    check(parentsOfA.includes('person_test_elder_1'), 'Parent of Person A is Elder 1');

    // 9. Family Tree Matrix Generation
    const matrix = buildFamilyTreeMatrix(savedPersons, existingEdges);
    check(matrix.tiers.length === 3, 'Matrix has 3 generational tiers');
    const elderTier = matrix.tiers.find(t => t.id === 'TIER_ELDERS');
    const adultTier = matrix.tiers.find(t => t.id === 'TIER_ADULTS');
    const childTier = matrix.tiers.find(t => t.id === 'TIER_CHILDREN');

    check(elderTier.members.some(m => m.core.id === 'person_test_elder_1'), 'Elder 1 placed in TIER_ELDERS');
    check(adultTier.members.some(m => m.core.id === 'person_test_a'), 'Person A placed in TIER_ADULTS');
    check(adultTier.members.some(m => m.core.id === 'person_test_b'), 'Person B placed in TIER_ADULTS');
    check(childTier.members.some(m => m.core.id === 'person_test_child_1'), 'Child 1 placed in TIER_CHILDREN');

    // 10. Clean up test data
    await FamilyRepository.resetFamilyData();

    console.log(`\n[SUCCESS] Phase 1 Foundation Verified: ${totalAssertions}/${totalAssertions} checks passed (100%).\n`);
}

runPhase1Tests().catch(err => {
    console.error('\n[FAIL] Phase 1 Foundation Test Failed:', err);
    process.exit(1);
});
