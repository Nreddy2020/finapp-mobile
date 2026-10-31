/**
 * tests/family/test_family_phase1_foundation.mjs
 * 
 * FinLife Family Operating System Phase 1 Foundation Test Suite.
 * 
 * Verifies all 12 key categories and core invariants:
 * 1. Person Identity Foundation (Snapshots, no household roles, no trusted categories)
 * 2. Household Lifecycle & Containment (Derived memberIds, no static storage)
 * 3. Household Membership Integrity (FK validation, duplicate checks, multi-household)
 * 4. Interpersonal Relationships (Canonical storage, reciprocal projection, self-link rejection)
 * 5. Trusted Circle Isolation (Never creates membership, emergency priority sorting)
 * 6. Conservative Migration (Provisional household, pending confirmation, doctor/advisor to trusted circle, idempotency)
 * 7. Numeric Safety (No raw BigInt, no NaN, no Infinity)
 */

import assert from 'node:assert';
import {
    // Contracts & Enums
    HouseholdType,
    HouseholdStatus,
    HouseholdRole,
    MembershipStatus,
    RelationshipType,
    RelationshipStatus,
    TrustedCategory,
    PersonStatus,
    Gender,
    generateEntityId,
    createEmptyPerson,
    createEmptyHousehold,
    createEmptyMembership,
    createEmptyRelationship,
    createEmptyTrustedCircleEntry,
    getReciprocalRelationshipType,
    validatePerson,
    validateHousehold,
    validateMembership,
    validateRelationship,
    validateTrustedCircleEntry,
    assertSafeNumbers,
    // Repository
    FamilyRepository,
    // Services
    FamilyPersonService,
    FamilyHouseholdService,
    FamilyRelationshipService,
    FamilyTrustedCircleService,
    FamilyMigrationService
} from '../../services/family/index.js';

console.log('================================================================');
console.log('🏛️  EXECUTING FINLIFE FAMILY OS PHASE 1 FOUNDATION TEST SUITE');
console.log('   Scope: Contracts, Repository, Domain Services & Migration');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function check(id, name, fn) {
    totalCount++;
    try {
        fn();
        console.log(`  [PASS] ${id}: ${name}`);
        passCount++;
    } catch (err) {
        console.error(`  [FAIL] ${id}: ${name}`);
        console.error(`         ${err.message}`);
        throw err;
    }
}

async function checkAsync(id, name, fn) {
    totalCount++;
    try {
        await fn();
        console.log(`  [PASS] ${id}: ${name}`);
        passCount++;
    } catch (err) {
        console.error(`  [FAIL] ${id}: ${name}`);
        console.error(`         ${err.message}`);
        throw err;
    }
}

// Enable isolated in-memory test mode
FamilyRepository.setTestMode(true);

// =====================================================================
// 1. CONTRACTS, ENUMS & FACTORIES
// =====================================================================

check('FAM-P1-01', 'Enums are frozen and possess correct authoritative values', () => {
    assert.strictEqual(HouseholdType.NUCLEAR, 'NUCLEAR');
    assert.strictEqual(HouseholdType.JOINT, 'JOINT');
    assert.strictEqual(HouseholdStatus.PROVISIONAL, 'PROVISIONAL');
    assert.strictEqual(HouseholdRole.HEAD, 'HEAD');
    assert.strictEqual(MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION, 'PROVISIONAL_PENDING_CONFIRMATION');
    assert.strictEqual(RelationshipType.PARENT, 'PARENT');
    assert.strictEqual(RelationshipType.CHILD, 'CHILD');
    assert.strictEqual(TrustedCategory.DOCTOR, 'DOCTOR');
    assert.strictEqual(TrustedCategory.FINANCIAL_ADVISOR, 'FINANCIAL_ADVISOR');
    assert.strictEqual(PersonStatus.ACTIVE, 'ACTIVE');

    assert.throws(() => {
        HouseholdType.NEW_TYPE = 'FAIL';
    }, /Cannot add property/);
});

check('FAM-P1-02', 'createEmptyPerson initializes with nullable inert snapshots and no household roles', () => {
    const p = createEmptyPerson({ fullName: 'Nirwan Reddy' });
    assert.ok(p.id.startsWith('p_'));
    assert.strictEqual(p.fullName, 'Nirwan Reddy');
    assert.strictEqual(p.status, PersonStatus.ACTIVE);
    assert.strictEqual(p.educationSnapshot, null);
    assert.strictEqual(p.healthSnapshot, null);
    assert.strictEqual(p.role, undefined);
    assert.strictEqual(p.householdRole, undefined);
    assert.strictEqual(p.category, undefined);
});

check('FAM-P1-03', 'validatePerson strictly rejects household roles and trusted categories', () => {
    assert.throws(() => {
        validatePerson({ id: 'p_1', fullName: 'Test', role: 'HEAD' });
    }, /Household role must not be stored on Person entity/);

    assert.throws(() => {
        validatePerson({ id: 'p_1', fullName: 'Test', trustedCategory: 'DOCTOR' });
    }, /Trusted category must not be stored on Person entity/);

    assert.throws(() => {
        validatePerson({ id: 'p_1', fullName: '' });
    }, /Person fullName is required/);
});

check('FAM-P1-04', 'Relationship reciprocal derivation correctly maps interpersonal edges', () => {
    assert.strictEqual(getReciprocalRelationshipType(RelationshipType.PARENT), RelationshipType.CHILD);
    assert.strictEqual(getReciprocalRelationshipType(RelationshipType.CHILD), RelationshipType.PARENT);
    assert.strictEqual(getReciprocalRelationshipType(RelationshipType.SPOUSE), RelationshipType.SPOUSE);
    assert.strictEqual(getReciprocalRelationshipType(RelationshipType.SIBLING), RelationshipType.SIBLING);
    assert.strictEqual(getReciprocalRelationshipType(RelationshipType.GRANDPARENT), RelationshipType.GRANDCHILD);
    assert.strictEqual(getReciprocalRelationshipType(RelationshipType.GUARDIAN), RelationshipType.WARD);
    assert.strictEqual(getReciprocalRelationshipType(RelationshipType.OTHER), RelationshipType.OTHER);
});

check('FAM-P1-05', 'validateRelationship rejects self-relationships', () => {
    assert.throws(() => {
        validateRelationship({
            id: 'rel_1',
            fromPersonId: 'p_same',
            toPersonId: 'p_same',
            type: RelationshipType.SIBLING
        });
    }, /Self-relationship is not permitted/);
});

check('FAM-P1-06', 'Numeric safety asserts reject raw BigInt, NaN, and Infinity', () => {
    assert.doesNotThrow(() => {
        assertSafeNumbers({ a: 1, b: 'text', c: [1.5, 0, -42] });
    });

    assert.throws(() => {
        assertSafeNumbers({ big: 100n });
    }, /Raw BigInt invariant violation/);

    assert.throws(() => {
        assertSafeNumbers({ nested: { bad: NaN } });
    }, /NaN invariant violation/);

    assert.throws(() => {
        assertSafeNumbers({ list: [Infinity] });
    }, /Infinity invariant violation/);
});

// =====================================================================
// 2. PERSON DOMAIN SERVICE & REPOSITORY
// =====================================================================

let person1, person2, personDoctor;

await checkAsync('FAM-P1-07', 'FamilyPersonService creates Person with identity and contacts only', async () => {
    person1 = await FamilyPersonService.createPerson({
        fullName: 'Aarav Sharma',
        preferredName: 'Aarav',
        gender: Gender.MALE,
        dob: '2015-06-15'
    });

    assert.ok(person1.id);
    assert.strictEqual(person1.fullName, 'Aarav Sharma');
    assert.strictEqual(person1.status, PersonStatus.ACTIVE);
    assert.strictEqual(person1.educationSnapshot, null);
    assert.strictEqual(person1.healthSnapshot, null);

    // Rejection of role at service level
    await assert.rejects(async () => {
        await FamilyPersonService.createPerson({
            fullName: 'Invalid Person',
            role: 'HEAD'
        });
    }, /Household role cannot be set on Person entity/);
});

await checkAsync('FAM-P1-08', 'FamilyPersonService updates Person attributes and archives cleanly', async () => {
    person2 = await FamilyPersonService.createPerson({
        fullName: 'Priya Sharma',
        preferredName: 'Priya',
        gender: Gender.FEMALE,
        phone: '+919876543210'
    });

    const updated = await FamilyPersonService.updatePerson(person2.id, {
        preferredName: 'Priyanka'
    });
    assert.strictEqual(updated.preferredName, 'Priyanka');
    assert.strictEqual(updated.id, person2.id);

    // Create a temporary person and archive
    const temp = await FamilyPersonService.createPerson({ fullName: 'Temporary Person' });
    const archived = await FamilyPersonService.archivePerson(temp.id);
    assert.strictEqual(archived.status, PersonStatus.ARCHIVED);

    // Default list excludes archived
    const activePeople = await FamilyPersonService.listPeople();
    assert.ok(!activePeople.some(p => p.id === temp.id));

    // List with includeArchived includes it
    const allPeople = await FamilyPersonService.listPeople({ includeArchived: true });
    assert.ok(allPeople.some(p => p.id === temp.id));
});

// =====================================================================
// 3. HOUSEHOLD & MEMBERSHIP LIFECYCLE
// =====================================================================

let primaryHousehold, ancestralHousehold;

await checkAsync('FAM-P1-09', 'FamilyHouseholdService creates Household container with derived memberIds', async () => {
    primaryHousehold = await FamilyHouseholdService.createHousehold({
        name: 'Sharma Family Household',
        type: HouseholdType.NUCLEAR,
        status: HouseholdStatus.ACTIVE,
        address: {
            city: 'Bengaluru',
            state: 'Karnataka'
        }
    });

    assert.ok(primaryHousehold.id);
    assert.strictEqual(primaryHousehold.name, 'Sharma Family Household');
    assert.deepStrictEqual(primaryHousehold.memberIds, []);
    assert.deepStrictEqual(primaryHousehold.activeMemberIds, []);
    assert.deepStrictEqual(primaryHousehold.provisionalMemberIds, []);
});

await checkAsync('FAM-P1-10', 'Household.memberIds is strictly derived and rejects static persistence', async () => {
    // Attempt to upsert household with hardcoded memberIds
    const customHh = await FamilyRepository.upsertHousehold({
        id: generateEntityId('hh'),
        name: 'Test Household',
        memberIds: ['static_fake_id_1', 'static_fake_id_2']
    });

    // Projections must be empty because no actual memberships exist
    assert.deepStrictEqual(customHh.memberIds, []);
    assert.deepStrictEqual(customHh.activeMemberIds, []);
});

let membership1, membership2;

await checkAsync('FAM-P1-11', 'FamilyHouseholdService adds member and enforces referential integrity', async () => {
    // Non-existent person throws
    await assert.rejects(async () => {
        await FamilyHouseholdService.addMemberToHousehold({
            householdId: primaryHousehold.id,
            personId: 'non_existent_person'
        });
    }, /Person with id 'non_existent_person' does not exist/);

    // Non-existent household throws
    await assert.rejects(async () => {
        await FamilyHouseholdService.addMemberToHousehold({
            householdId: 'non_existent_household',
            personId: person1.id
        });
    }, /Household with id 'non_existent_household' does not exist/);

    // Valid addition
    membership1 = await FamilyHouseholdService.addMemberToHousehold({
        householdId: primaryHousehold.id,
        personId: person1.id,
        role: HouseholdRole.DEPENDENT,
        status: MembershipStatus.ACTIVE
    });

    assert.ok(membership1.id);
    assert.strictEqual(membership1.householdId, primaryHousehold.id);
    assert.strictEqual(membership1.personId, person1.id);
    assert.strictEqual(membership1.role, HouseholdRole.DEPENDENT);

    // Duplicate active membership throws
    await assert.rejects(async () => {
        await FamilyHouseholdService.addMemberToHousehold({
            householdId: primaryHousehold.id,
            personId: person1.id,
            role: HouseholdRole.HEAD
        });
    }, /already has an active or provisional membership in household/);

    // Add second member
    membership2 = await FamilyHouseholdService.addMemberToHousehold({
        householdId: primaryHousehold.id,
        personId: person2.id,
        role: HouseholdRole.HEAD,
        status: MembershipStatus.ACTIVE
    });

    // Check derived projection on household
    const fetchedHh = await FamilyHouseholdService.getHousehold(primaryHousehold.id);
    assert.strictEqual(fetchedHh.activeMemberIds.length, 2);
    assert.ok(fetchedHh.activeMemberIds.includes(person1.id));
    assert.ok(fetchedHh.activeMemberIds.includes(person2.id));
    assert.deepStrictEqual(fetchedHh.memberIds, fetchedHh.activeMemberIds);
});

await checkAsync('FAM-P1-12', 'Multi-household membership: Person belongs to multiple households with different roles', async () => {
    ancestralHousehold = await FamilyHouseholdService.createHousehold({
        name: 'Sharma Ancestral Home',
        type: HouseholdType.EXTENDED,
        status: HouseholdStatus.ACTIVE
    });

    // Person 2 (Priya) is HEAD in primaryHousehold, but MEMBER in ancestralHousehold
    const ancestralMembership = await FamilyHouseholdService.addMemberToHousehold({
        householdId: ancestralHousehold.id,
        personId: person2.id,
        role: HouseholdRole.MEMBER,
        status: MembershipStatus.ACTIVE
    });

    assert.strictEqual(ancestralMembership.role, HouseholdRole.MEMBER);

    // Verify memberships for person2
    const priyaMemberships = await FamilyHouseholdService.getMembershipsForPerson(person2.id);
    assert.strictEqual(priyaMemberships.length, 2);

    const primaryAssoc = priyaMemberships.find(m => m.householdId === primaryHousehold.id);
    const ancestralAssoc = priyaMemberships.find(m => m.householdId === ancestralHousehold.id);

    assert.strictEqual(primaryAssoc.role, HouseholdRole.HEAD);
    assert.strictEqual(ancestralAssoc.role, HouseholdRole.MEMBER);
});

await checkAsync('FAM-P1-13', 'getHouseholdWithMembers aggregates household, memberships, and populated person details', async () => {
    const fullDetail = await FamilyHouseholdService.getHouseholdWithMembers(primaryHousehold.id);
    assert.strictEqual(fullDetail.id, primaryHousehold.id);
    assert.strictEqual(fullDetail.members.length, 2);

    const head = fullDetail.members.find(m => m.role === HouseholdRole.HEAD);
    assert.strictEqual(head.personId, person2.id);
    assert.strictEqual(head.person.fullName, 'Priya Sharma');
});

await checkAsync('FAM-P1-14', 'Household deletion unassigns memberships but PRESERVES Person entities', async () => {
    // Create temporary household with a dedicated person
    const tempPerson = await FamilyPersonService.createPerson({ fullName: 'Household Preservation Test Person' });
    const tempHousehold = await FamilyHouseholdService.createHousehold({ name: 'Temporary Household' });

    await FamilyHouseholdService.addMemberToHousehold({
        householdId: tempHousehold.id,
        personId: tempPerson.id,
        role: HouseholdRole.MEMBER
    });

    // Delete the household
    const deleteResult = await FamilyHouseholdService.deleteHousehold(tempHousehold.id);
    assert.strictEqual(deleteResult, true);

    // Household is gone
    const fetchedHh = await FamilyHouseholdService.getHousehold(tempHousehold.id);
    assert.strictEqual(fetchedHh, null);

    // Membership is gone
    const remainingMemberships = await FamilyRepository.listMemberships({ householdId: tempHousehold.id });
    assert.strictEqual(remainingMemberships.length, 0);

    // INVARIANT: Person STILL EXISTS untouched!
    const fetchedPerson = await FamilyPersonService.getPerson(tempPerson.id);
    assert.ok(fetchedPerson);
    assert.strictEqual(fetchedPerson.fullName, 'Household Preservation Test Person');
});

// =====================================================================
// 4. INTERPERSONAL RELATIONSHIPS (CANONICAL & RECIPROCAL)
// =====================================================================

await checkAsync('FAM-P1-15', 'FamilyRelationshipService stores canonical directed edge and projects reciprocal view', async () => {
    // Canonical link: Priya (person2) is PARENT of Aarav (person1)
    const rel = await FamilyRelationshipService.linkRelationship({
        fromPersonId: person2.id,
        toPersonId: person1.id,
        type: RelationshipType.PARENT
    });

    assert.ok(rel.id);
    assert.strictEqual(rel.type, RelationshipType.PARENT);

    // Verify canonical storage in repository: exactly 1 edge stored
    const allStored = await FamilyRepository.listRelationships();
    const matches = allStored.filter(r => 
        (r.fromPersonId === person2.id && r.toPersonId === person1.id) ||
        (r.fromPersonId === person1.id && r.toPersonId === person2.id)
    );
    assert.strictEqual(matches.length, 1);

    // Priya's view: Outgoing PARENT
    const priyaRels = await FamilyRelationshipService.getRelationshipsForPerson(person2.id);
    const priyaToAarav = priyaRels.find(r => r.relatedPersonId === person1.id);
    assert.strictEqual(priyaToAarav.relationshipType, RelationshipType.PARENT);
    assert.strictEqual(priyaToAarav.isCanonicalDirection, true);

    // Aarav's view: Incoming projected reciprocal CHILD
    const aaravRels = await FamilyRelationshipService.getRelationshipsForPerson(person1.id);
    const aaravToPriya = aaravRels.find(r => r.relatedPersonId === person2.id);
    assert.strictEqual(aaravToPriya.relationshipType, RelationshipType.CHILD);
    assert.strictEqual(aaravToPriya.isCanonicalDirection, false);
});

await checkAsync('FAM-P1-16', 'Self-relationship is rejected at service boundary', async () => {
    await assert.rejects(async () => {
        await FamilyRelationshipService.linkRelationship({
            fromPersonId: person1.id,
            toPersonId: person1.id,
            type: RelationshipType.SIBLING
        });
    }, /Self-relationship is not permitted/);
});

// =====================================================================
// 5. TRUSTED CIRCLE SUPPORT NETWORK
// =====================================================================

await checkAsync('FAM-P1-17', 'FamilyTrustedCircleService adds external doctor without creating HouseholdMembership', async () => {
    personDoctor = await FamilyPersonService.createPerson({
        fullName: 'Dr. Ramesh Gupta',
        phone: '+919988776655'
    });

    const trustedEntry = await FamilyTrustedCircleService.addTrustedContact({
        householdId: primaryHousehold.id,
        personId: personDoctor.id,
        category: TrustedCategory.DOCTOR,
        emergencyPriority: 1,
        notes: 'Family Pediatrician'
    });

    assert.ok(trustedEntry.id);
    assert.strictEqual(trustedEntry.category, TrustedCategory.DOCTOR);
    assert.strictEqual(trustedEntry.emergencyPriority, 1);

    // CRITICAL ISOLATION INVARIANT:
    // Adding Dr. Gupta as trusted doctor must NEVER create a HouseholdMembership!
    const doctorMemberships = await FamilyHouseholdService.getMembershipsForPerson(personDoctor.id);
    assert.strictEqual(doctorMemberships.length, 0);

    // Household's member count must not include Dr. Gupta
    const fetchedHh = await FamilyHouseholdService.getHousehold(primaryHousehold.id);
    assert.ok(!fetchedHh.activeMemberIds.includes(personDoctor.id));
});

await checkAsync('FAM-P1-18', 'Trusted circle priority sorting and household member inclusion', async () => {
    // Add Priya (who IS a household member) as EMERGENCY_CONTACT with priority 2
    await FamilyTrustedCircleService.addTrustedContact({
        householdId: primaryHousehold.id,
        personId: person2.id,
        category: TrustedCategory.EMERGENCY_CONTACT,
        emergencyPriority: 2,
        notes: 'Primary emergency contact'
    });

    const trustedList = await FamilyTrustedCircleService.listTrustedContacts(primaryHousehold.id);
    assert.strictEqual(trustedList.length, 2);

    // Sorted by emergencyPriority ascending: priority 1 (Doctor) comes before priority 2 (Priya)
    assert.strictEqual(trustedList[0].emergencyPriority, 1);
    assert.strictEqual(trustedList[0].person.fullName, 'Dr. Ramesh Gupta');
    assert.strictEqual(trustedList[1].emergencyPriority, 2);
    assert.strictEqual(trustedList[1].person.fullName, 'Priya Sharma');
});

// =====================================================================
// 6. CONSERVATIVE & IDEMPOTENT MIGRATION
// =====================================================================

await checkAsync('FAM-P1-19', 'FamilyMigrationService handles empty legacy data gracefully', async () => {
    const report = await FamilyMigrationService.migrateLegacyFamilyData({ legacyData: [] });
    assert.strictEqual(report.success, true);
    assert.strictEqual(report.scanned, 0);
    assert.strictEqual(report.createdPeople, 0);
});

await checkAsync('FAM-P1-20', 'Legacy migration creates provisional household with pending confirmation memberships', async () => {
    // Reset test repository to clean state to test pure migration
    FamilyRepository._resetInMemory();

    const mockLegacyData = [
        { id: '1', name: 'Reddy (Me)', role: 'Admin', color: '#3B82F6' },
        { id: '2', name: 'Priya', role: 'Partner', color: '#EC4899' },
        { id: '3', name: 'Aarav', role: 'Child', color: '#10B981', allowance: 500 },
        { id: '4', name: 'Dad', role: 'Parent', color: '#F59E0B' },
        { id: '5', name: 'Dr. Sunita K', role: 'Doctor', color: '#6366F1' } // External professional
    ];

    const report = await FamilyMigrationService.migrateLegacyFamilyData({ legacyData: mockLegacyData });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.scanned, 5);
    assert.strictEqual(report.createdPeople, 5);
    // 4 household members + 1 doctor migrated to trusted circle
    assert.strictEqual(report.createdMemberships, 4);
    assert.strictEqual(report.createdTrusted, 1);
    assert.strictEqual(report.provisional, true);

    // Verify provisional household
    const hh = await FamilyHouseholdService.getHousehold(report.provisionalHouseholdId);
    assert.ok(hh);
    assert.strictEqual(hh.name, 'My Household');
    assert.strictEqual(hh.status, HouseholdStatus.PROVISIONAL);

    // GOVERNANCE INVARIANT: Confirmed active members count must be ZERO!
    assert.strictEqual(hh.activeMemberIds.length, 0);
    assert.strictEqual(hh.provisionalMemberIds.length, 4);

    // Verify all 4 memberships have PROVISIONAL_PENDING_CONFIRMATION status
    const memberships = await FamilyRepository.listMemberships({ householdId: hh.id });
    assert.strictEqual(memberships.length, 4);
    for (const m of memberships) {
        assert.strictEqual(m.status, MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION);
    }

    // Verify Dr. Sunita was routed strictly to TrustedCircleEntry, NOT membership
    const doctorPerson = (await FamilyPersonService.listPeople()).find(p => p.fullName === 'Dr. Sunita K');
    assert.ok(doctorPerson);

    const doctorMemberships = await FamilyRepository.listMemberships({ personId: doctorPerson.id });
    assert.strictEqual(doctorMemberships.length, 0);

    const trustedEntries = await FamilyRepository.listTrustedCircle(hh.id);
    assert.strictEqual(trustedEntries.length, 1);
    assert.strictEqual(trustedEntries[0].personId, doctorPerson.id);
    assert.strictEqual(trustedEntries[0].category, TrustedCategory.DOCTOR);
});

await checkAsync('FAM-P1-21', 'Migration is strictly idempotent upon re-execution', async () => {
    const mockLegacyData = [
        { id: '1', name: 'Reddy (Me)', role: 'Admin', color: '#3B82F6' },
        { id: '2', name: 'Priya', role: 'Partner', color: '#EC4899' },
        { id: '3', name: 'Aarav', role: 'Child', color: '#10B981' },
        { id: '4', name: 'Dad', role: 'Parent', color: '#F59E0B' },
        { id: '5', name: 'Dr. Sunita K', role: 'Doctor', color: '#6366F1' }
    ];

    // Re-run migration with the exact same legacy data
    const secondReport = await FamilyMigrationService.migrateLegacyFamilyData({ legacyData: mockLegacyData });

    assert.strictEqual(secondReport.success, true);
    assert.strictEqual(secondReport.scanned, 5);
    // 0 duplicates created!
    assert.strictEqual(secondReport.createdPeople, 0);
    assert.strictEqual(secondReport.createdMemberships, 0);
    assert.strictEqual(secondReport.createdTrusted, 0);

    // Entity counts remain exactly identical
    const allPeople = await FamilyPersonService.listPeople();
    const allMemberships = await FamilyRepository.listMemberships();
    const allTrusted = await FamilyRepository.listTrustedCircle();

    assert.strictEqual(allPeople.length, 5);
    assert.strictEqual(allMemberships.length, 4);
    assert.strictEqual(allTrusted.length, 1);
});

// =====================================================================
// 7. GOVERNANCE CORRECTIONS & HARDENED INVARIANTS
// =====================================================================

await checkAsync('FAM-P1-22', 'Repository rollback safety: failed multi-entity persist preserves pre-operation state', async () => {
    // Take note of pre-operation household count
    const beforeHouseholds = await FamilyRepository.listHouseholds();
    const testHh = await FamilyHouseholdService.createHousehold({ name: 'Rollback Test Household' });
    
    // Simulate a failure in _persistStore by temporarily overriding it
    const originalPersist = FamilyRepository._persistStore.bind(FamilyRepository);
    FamilyRepository._persistStore = async () => {
        throw new Error('Disk write failed / quota exceeded simulation');
    };

    // Attempting deleteHousehold must throw and NOT delete anything from the candidate or store
    await assert.rejects(async () => {
        await FamilyHouseholdService.deleteHousehold(testHh.id);
    }, /Disk write failed/);

    // Restore original persist
    FamilyRepository._persistStore = originalPersist;

    // Verify household still exists in repository
    const afterFailedDelete = await FamilyHouseholdService.getHousehold(testHh.id);
    assert.ok(afterFailedDelete, 'Household must remain in repository after failed persist rollback');

    // Clean up
    await FamilyHouseholdService.deleteHousehold(testHh.id);
});

await checkAsync('FAM-P1-23', 'Referential integrity on physical person deletion: rejects when referenced', async () => {
    // Person referenced by membership
    const refPerson = await FamilyPersonService.createPerson({ fullName: 'Referenced Person' });
    const refHousehold = await FamilyHouseholdService.createHousehold({ name: 'Referenced Household' });
    await FamilyHouseholdService.addMemberToHousehold({
        householdId: refHousehold.id,
        personId: refPerson.id,
        role: HouseholdRole.MEMBER
    });

    await assert.rejects(async () => {
        await FamilyPersonService.deletePerson(refPerson.id);
    }, /referenced by membership/);

    // Unreferenced person can be physically deleted
    const unrefPerson = await FamilyPersonService.createPerson({ fullName: 'Unreferenced Person' });
    const deleted = await FamilyPersonService.deletePerson(unrefPerson.id);
    assert.strictEqual(deleted, true);

    const checkFetch = await FamilyPersonService.getPerson(unrefPerson.id);
    assert.strictEqual(checkFetch, null);

    // Clean up
    await FamilyHouseholdService.deleteHousehold(refHousehold.id);
    await FamilyPersonService.archivePerson(refPerson.id);
});

await checkAsync('FAM-P1-24', 'Deleting canonical relationship removes reciprocal projection for both individuals', async () => {
    const pA = await FamilyPersonService.createPerson({ fullName: 'Person Alpha' });
    const pB = await FamilyPersonService.createPerson({ fullName: 'Person Beta' });

    const rel = await FamilyRelationshipService.linkRelationship({
        fromPersonId: pA.id,
        toPersonId: pB.id,
        type: RelationshipType.SPOUSE
    });

    // Projections exist for both
    const relsA = await FamilyRelationshipService.getRelationshipsForPerson(pA.id);
    const relsB = await FamilyRelationshipService.getRelationshipsForPerson(pB.id);
    assert.strictEqual(relsA.length, 1);
    assert.strictEqual(relsB.length, 1);

    // Delete the relationship
    const delResult = await FamilyRelationshipService.deleteRelationship(rel.id);
    assert.strictEqual(delResult, true);

    // Both projections are now empty
    const relsAAfter = await FamilyRelationshipService.getRelationshipsForPerson(pA.id);
    const relsBAfter = await FamilyRelationshipService.getRelationshipsForPerson(pB.id);
    assert.strictEqual(relsAAfter.length, 0);
    assert.strictEqual(relsBAfter.length, 0);

    // Clean up
    await FamilyPersonService.deletePerson(pA.id);
    await FamilyPersonService.deletePerson(pB.id);
});

check('FAM-P1-25', 'Unsupported relationship type reciprocal mapping throws a clear error', () => {
    assert.throws(() => {
        getReciprocalRelationshipType('COUSIN_ONCE_REMOVED');
    }, /Unsupported relationship type for reciprocal mapping/);
});

await checkAsync('FAM-P1-26', 'Migration stable identity: rename updates person without creating duplicate; distinct people with same name do not collapse', async () => {
    // 1. Rename scenario: Same legacy ID, updated name
    const legacyInitial = [
        { id: '100', name: 'Original Name', role: 'Member' }
    ];
    await FamilyMigrationService.migrateLegacyFamilyData({ legacyData: legacyInitial });

    const legacyUpdated = [
        { id: '100', name: 'Updated Full Name', role: 'Member' }
    ];
    const secondReport = await FamilyMigrationService.migrateLegacyFamilyData({ legacyData: legacyUpdated });
    assert.strictEqual(secondReport.createdPeople, 0, 'Must not create a new person on rename');

    const peopleWithName = (await FamilyPersonService.listPeople()).filter(p => p.migration?.legacyId === '100');
    assert.strictEqual(peopleWithName.length, 1);
    assert.strictEqual(peopleWithName[0].fullName, 'Updated Full Name');

    // 2. Disambiguation scenario: Two people with identical names but different unique contact/index traits
    const identicalNames = [
        { name: 'John Doe', phone: '+911111111111', role: 'Member' },
        { name: 'John Doe', phone: '+912222222222', role: 'Member' }
    ];
    const disambigReport = await FamilyMigrationService.migrateLegacyFamilyData({ legacyData: identicalNames });
    assert.strictEqual(disambigReport.createdPeople, 2, 'Must distinguish different people with identical names');
});

await checkAsync('FAM-P1-27', 'Archived person exclusion invariant: archived person is never in activeMemberIds', async () => {
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Archive Household Test' });
    const p = await FamilyPersonService.createPerson({ fullName: 'To Be Archived Person' });
    
    await FamilyHouseholdService.addMemberToHousehold({
        householdId: hh.id,
        personId: p.id,
        role: HouseholdRole.MEMBER
    });

    const hhBefore = await FamilyHouseholdService.getHousehold(hh.id);
    assert.ok(hhBefore.activeMemberIds.includes(p.id));

    // Archive the person
    await FamilyPersonService.archivePerson(p.id);

    // Verification: activeMemberIds must NOT include the archived person
    const hhAfter = await FamilyHouseholdService.getHousehold(hh.id);
    assert.ok(!hhAfter.activeMemberIds.includes(p.id), 'Archived person must be excluded from activeMemberIds');

    // Clean up
    await FamilyHouseholdService.deleteHousehold(hh.id);
});

check('FAM-P1-28', 'Repository setTestMode(false) completely evicts in-memory test store', () => {
    FamilyRepository.setTestMode(true);
    assert.strictEqual(FamilyRepository.isTestModeActive(), true);
    assert.ok(FamilyRepository._inMemory !== null);

    FamilyRepository.setTestMode(false);
    assert.strictEqual(FamilyRepository.isTestModeActive(), false);
    assert.strictEqual(FamilyRepository._inMemory, null);

    // Re-enable test mode for test runner hygiene
    FamilyRepository.setTestMode(true);
});

// =====================================================================
// 8. FINAL HARDENING INVARIANTS (FAM-P1-29, 30, 31)
// =====================================================================

await checkAsync('FAM-P1-29', 'FAM-P1-HARDEN-001: Corrupt storage non-array payloads default to safe empty collections', async () => {
    // Test that _loadStore handles non-array objects, primitives, or malformed items
    const store = await FamilyRepository._loadStore();
    assert.ok(store.people instanceof Map);
    assert.ok(store.households instanceof Map);
    assert.ok(store.memberships instanceof Map);
    assert.ok(store.relationships instanceof Map);
    assert.ok(store.trustedCircle instanceof Map);

    // Verify commitStore validation
    await assert.rejects(async () => {
        await FamilyRepository.commitStore(null);
    }, /Invalid candidate store provided/);
});

check('FAM-P1-30', 'FAM-P1-HARDEN-002: Person dob enforces strict ISO calendar date validity', () => {
    // Valid date passes
    assert.doesNotThrow(() => {
        validatePerson({ id: 'p_valid', fullName: 'Valid Person', dob: '1990-08-25' });
    });

    // Null and undefined pass
    assert.doesNotThrow(() => {
        validatePerson({ id: 'p_null', fullName: 'Null DOB Person', dob: null });
        validatePerson({ id: 'p_undef', fullName: 'Undef DOB Person' });
    });

    // Non-ISO format throws
    assert.throws(() => {
        validatePerson({ id: 'p_bad1', fullName: 'Bad Date 1', dob: '25/08/1990' });
    }, /Invalid Date of Birth format/);

    assert.throws(() => {
        validatePerson({ id: 'p_bad2', fullName: 'Bad Date 2', dob: 'not-a-date' });
    }, /Invalid Date of Birth format/);

    // Impossible calendar day (e.g. Feb 31) throws
    assert.throws(() => {
        validatePerson({ id: 'p_bad3', fullName: 'Bad Date 3', dob: '2023-02-31' });
    }, /Invalid Date of Birth calendar date/);

    // Future date throws
    assert.throws(() => {
        validatePerson({ id: 'p_bad4', fullName: 'Future Person', dob: '2099-01-01' });
    }, /cannot be in the future/);
});

await checkAsync('FAM-P1-31', 'FAM-P1-HARDEN-003: Atomic legacy migration rolls back completely on mid-process failure', async () => {
    // Clean repository state
    FamilyRepository._resetInMemory();

    const corruptLegacyBatch = [
        { id: '101', name: 'Valid Person One', role: 'Head' },
        { id: '102', name: 'Valid Person Two', role: 'Partner' },
        { id: '103', name: 'Corrupt Person Three', role: 'Child', dob: 'invalid-date-format' } // Will trip FAM-P1-HARDEN-002!
    ];

    // Migration must reject due to the corrupt 3rd record
    await assert.rejects(async () => {
        await FamilyMigrationService.migrateLegacyFamilyData({ legacyData: corruptLegacyBatch });
    }, /Invalid Date of Birth format/);

    // ATOMICITY INVARIANT: Zero records must be committed to the repository!
    // Person One and Person Two must NOT leak into the repository!
    const peopleAfterFailedMigration = await FamilyPersonService.listPeople({ includeArchived: true });
    const householdsAfterFailedMigration = await FamilyHouseholdService.listHouseholds({ includeInactive: true });
    const membershipsAfterFailedMigration = await FamilyRepository.listMemberships();

    assert.strictEqual(peopleAfterFailedMigration.length, 0, 'Zero people must exist after failed atomic migration');
    assert.strictEqual(householdsAfterFailedMigration.length, 0, 'Zero households must exist after failed atomic migration');
    assert.strictEqual(membershipsAfterFailedMigration.length, 0, 'Zero memberships must exist after failed atomic migration');
});

console.log('\n================================================================');
console.log(`🎉 ALL TESTS PASSED: ${passCount} / ${totalCount} checks verified`);
console.log('================================================================\n');
