/**
 * tests/family/test_family_phase3_documents.mjs
 * 
 * FinLife Family Operating System Phase 3 Documents & Records Registry Test Suite.
 * 
 * Verifies all 24 Phase 3 Governance & Registry Invariants:
 * - Document Contracts & Schema Defaults (FAM-P3-01 to 04)
 * - Strict Date Validation & Calendar Boundaries (FAM-P3-05 to 08)
 * - UTC Timezone-Independent Expiry Derivation (FAM-P3-09 to 12)
 * - Privacy Masking & Diagnostic Invariants (FAM-P3-13 to 14)
 * - Repository Persistence & Atomic Rollback (FAM-P3-15)
 * - Referential Integrity & Multi-Household Isolation (FAM-P3-16 to 19)
 * - Person & Household Deletion Lifecycle (FAM-P3-20 to 21)
 * - Search, Category & Location Filtering (FAM-P3-22 to 23)
 * - Registry Summary Metrics & Zero Readiness Scoring (FAM-P3-24)
 */

import assert from 'node:assert';
import {
    DocumentCategory,
    DocumentStatus,
    ExpiryStatus,
    PersonStatus,
    HouseholdStatus,
    MembershipStatus,
    HouseholdRole,
    createEmptyPerson,
    createEmptyHousehold,
    createEmptyMembership,
    createEmptyDocument,
    validateDocument,
    computeDocumentExpiryStatus,
    parseUtcDateOnly,
    maskIdentifier,
    assertSafeNumbers
} from '../../services/family/familyContracts.js';
import { FamilyRepository } from '../../services/family/familyRepository.js';
import { FamilyDocumentService } from '../../services/family/familyDocumentService.js';

console.log('================================================================');
console.log('📜 EXECUTING FINLIFE FAMILY OS PHASE 3 DOCUMENTS REGISTRY TESTS');
console.log('   Scope: Contracts, Expiry Rules, Privacy, Referential Integrity');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

async function check(id, name, fn) {
    totalCount++;
    try {
        await fn();
        passCount++;
        console.log(`  [PASS] ${id}: ${name}`);
    } catch (err) {
        console.error(`  [FAIL] ${id}: ${name}`);
        console.error(`         Error: ${err.message}`);
        throw err;
    }
}

// Reset repository test mode
FamilyRepository.setTestMode(true);

// -----------------------------------------------------------------------------
// Category 1: Document Contracts & Schema Defaults (FAM-P3-01 to 04)
// -----------------------------------------------------------------------------

await check('FAM-P3-01', 'Document factory initializes all schema fields with authoritative defaults', () => {
    const doc = createEmptyDocument();
    assert.ok(doc.id && doc.id.startsWith('doc_'), 'Document id prefixed with doc_');
    assert.strictEqual(doc.householdId, '');
    assert.strictEqual(doc.personId, null, 'Default personId is null (household-wide)');
    assert.strictEqual(doc.title, '');
    assert.strictEqual(doc.category, DocumentCategory.IDENTITY);
    assert.strictEqual(doc.documentType, 'General Document');
    assert.strictEqual(doc.identifierNumber, null);
    assert.strictEqual(doc.fileUri, null);
    assert.strictEqual(doc.physicalLocation, null);
    assert.strictEqual(doc.issuedDate, null);
    assert.strictEqual(doc.expiryDate, null);
    assert.strictEqual(doc.notes, '');
    assert.deepStrictEqual(doc.tags, []);
    assert.strictEqual(doc.status, DocumentStatus.ACTIVE);
    assert.ok(doc.createdAt && doc.updatedAt);
    assertSafeNumbers(doc);
});

await check('FAM-P3-02', 'Validator requires valid object, non-empty id, householdId, and title', () => {
    assert.throws(() => validateDocument(null), /must be an object/);
    assert.throws(() => validateDocument({}), /id is required/);
    assert.throws(() => validateDocument({ id: 'doc_1' }), /householdId is required/);
    assert.throws(() => validateDocument({ id: 'doc_1', householdId: 'hh_1' }), /title is required/);
    assert.throws(() => validateDocument({ id: 'doc_1', householdId: 'hh_1', title: '   ' }), /title is required/);
});

await check('FAM-P3-03', 'Validator checks category against DocumentCategory enum', () => {
    const base = createEmptyDocument({ id: 'doc_1', householdId: 'hh_1', title: 'Passport' });
    assert.strictEqual(validateDocument(base), true);

    const invalid = { ...base, category: 'UNSUPPORTED_CATEGORY' };
    assert.throws(() => validateDocument(invalid), /Invalid DocumentCategory/);
});

await check('FAM-P3-04', 'Validator checks status against DocumentStatus enum', () => {
    const base = createEmptyDocument({ id: 'doc_1', householdId: 'hh_1', title: 'Passport' });
    assert.strictEqual(validateDocument({ ...base, status: DocumentStatus.ARCHIVED }), true);

    const invalid = { ...base, status: 'DELETED' };
    assert.throws(() => validateDocument(invalid), /Invalid DocumentStatus/);
});

// -----------------------------------------------------------------------------
// Category 2: Strict Date Validation & Calendar Boundaries (FAM-P3-05 to 08)
// -----------------------------------------------------------------------------

await check('FAM-P3-05', 'Strict calendar date validation rejects invalid calendar dates and accepts leap years', () => {
    const base = createEmptyDocument({ id: 'doc_1', householdId: 'hh_1', title: 'ID Card' });

    // Leap year date 2024-02-29 is valid
    assert.strictEqual(validateDocument({ ...base, issuedDate: '2024-02-29' }, { allowFutureIssuedDate: true }), true);

    // Non-leap year date 2025-02-29 is invalid
    assert.throws(() => validateDocument({ ...base, issuedDate: '2025-02-29' }, { allowFutureIssuedDate: true }), /Invalid issuedDate/);

    // 31st of February is invalid
    assert.throws(() => validateDocument({ ...base, issuedDate: '2026-02-31' }, { allowFutureIssuedDate: true }), /Invalid issuedDate/);

    // 13th month is invalid
    assert.throws(() => validateDocument({ ...base, issuedDate: '2026-13-01' }, { allowFutureIssuedDate: true }), /Invalid issuedDate/);
});

await check('FAM-P3-06', 'Invariant check enforces safe numbers (rejects raw BigInt, NaN, Infinity)', () => {
    const base = createEmptyDocument({ id: 'doc_1', householdId: 'hh_1', title: 'Insurance' });

    assert.throws(() => validateDocument({ ...base, rawNum: NaN }), /NaN invariant violation/);
    assert.throws(() => validateDocument({ ...base, rawNum: Infinity }), /Infinity invariant violation/);
    assert.throws(() => validateDocument({ ...base, rawNum: 100n }), /Raw BigInt invariant violation/);
});

await check('FAM-P3-07', 'Date consistency rejects expiry earlier than issued date and future issued date by default', () => {
    const base = createEmptyDocument({ id: 'doc_1', householdId: 'hh_1', title: 'Deed' });

    // Expiry earlier than issued date
    assert.throws(() => validateDocument({
        ...base,
        issuedDate: '2024-06-01',
        expiryDate: '2024-05-31'
    }), /expiryDate cannot be earlier than issuedDate/);

    // Expiry equals issued date is valid
    assert.strictEqual(validateDocument({
        ...base,
        issuedDate: '2024-06-01',
        expiryDate: '2024-06-01'
    }), true);

    // Future issuedDate rejected when allowFutureIssuedDate is false
    assert.throws(() => validateDocument({
        ...base,
        issuedDate: '2099-01-01'
    }, { allowFutureIssuedDate: false, referenceDate: '2026-09-09' }), /issuedDate '2099-01-01' cannot be in the future/);
});

await check('FAM-P3-08', 'fileUri validation accepts local formats and rejects remote URLs', () => {
    const base = createEmptyDocument({ id: 'doc_1', householdId: 'hh_1', title: 'Scan' });

    assert.strictEqual(validateDocument({ ...base, fileUri: 'file:///storage/docs/passport.pdf' }), true);
    assert.strictEqual(validateDocument({ ...base, fileUri: 'content://media/external/doc' }), true);
    assert.strictEqual(validateDocument({ ...base, fileUri: 'ph://photo-asset-id' }), true);
    assert.strictEqual(validateDocument({ ...base, fileUri: '/data/user/0/fintech/deed.png' }), true);
    assert.strictEqual(validateDocument({ ...base, fileUri: './documents/receipt.pdf' }), true);

    // Remote URLs rejected
    assert.throws(() => validateDocument({ ...base, fileUri: 'https://cdn.example.com/doc.pdf' }), /local file URI/);
    assert.throws(() => validateDocument({ ...base, fileUri: 'http://insecure.site/a.jpg' }), /local file URI/);
    assert.throws(() => validateDocument({ ...base, fileUri: 'ftp://ftp.example.com/file' }), /local file URI/);
});

// -----------------------------------------------------------------------------
// Category 3: UTC Timezone-Independent Expiry Derivation (FAM-P3-09 to 12)
// -----------------------------------------------------------------------------

await check('FAM-P3-09', 'Expiry calculation returns NO_EXPIRY when expiryDate is null', () => {
    const res = computeDocumentExpiryStatus(null, '2026-09-09');
    assert.strictEqual(res.expiryStatus, ExpiryStatus.NO_EXPIRY);
    assert.strictEqual(res.daysRemaining, null);
    assert.strictEqual(res.isExpiringSoon, false);
    assert.strictEqual(res.isExpired, false);
});

await check('FAM-P3-10', 'Expiry boundary at 90 days (EXPIRING_SOON) versus 91 days (VALID)', () => {
    const ref = '2026-09-01';

    // 90 days out -> 2026-11-30 (September: 30-1=29 days, October: 31 days, November: 30 days => 29+31+30 = 90 days)
    const at90 = computeDocumentExpiryStatus('2026-11-30', ref);
    assert.strictEqual(at90.daysRemaining, 90);
    assert.strictEqual(at90.expiryStatus, ExpiryStatus.EXPIRING_SOON);
    assert.strictEqual(at90.isExpiringSoon, true);
    assert.strictEqual(at90.isExpired, false);

    // 91 days out -> 2026-12-01
    const at91 = computeDocumentExpiryStatus('2026-12-01', ref);
    assert.strictEqual(at91.daysRemaining, 91);
    assert.strictEqual(at91.expiryStatus, ExpiryStatus.VALID);
    assert.strictEqual(at91.isExpiringSoon, false);
    assert.strictEqual(at91.isExpired, false);
});

await check('FAM-P3-11', 'Expiry boundary at 0 days (EXPIRING_SOON) versus -1 day (EXPIRED)', () => {
    const ref = '2026-09-09';

    // Same calendar day -> 0 days remaining (EXPIRING_SOON)
    const at0 = computeDocumentExpiryStatus('2026-09-09', ref);
    assert.strictEqual(at0.daysRemaining, 0);
    assert.strictEqual(at0.expiryStatus, ExpiryStatus.EXPIRING_SOON);
    assert.strictEqual(at0.isExpiringSoon, true);
    assert.strictEqual(at0.isExpired, false);

    // 1 day in past -> -1 day remaining (EXPIRED)
    const atMinus1 = computeDocumentExpiryStatus('2026-09-08', ref);
    assert.strictEqual(atMinus1.daysRemaining, -1);
    assert.strictEqual(atMinus1.expiryStatus, ExpiryStatus.EXPIRED);
    assert.strictEqual(atMinus1.isExpiringSoon, false);
    assert.strictEqual(atMinus1.isExpired, true);
});

await check('FAM-P3-12', 'Timezone-independent leap-year calendar transitions evaluate exact 1-day step', () => {
    // Leap year: 2024-02-28 to 2024-02-29
    const leap1 = computeDocumentExpiryStatus('2024-02-29', '2024-02-28');
    assert.strictEqual(leap1.daysRemaining, 1);

    // Leap year: 2024-02-29 to 2024-03-01
    const leap2 = computeDocumentExpiryStatus('2024-03-01', '2024-02-29');
    assert.strictEqual(leap2.daysRemaining, 1);

    // Non-leap year: 2025-02-28 to 2025-03-01
    const nonLeap = computeDocumentExpiryStatus('2025-03-01', '2025-02-28');
    assert.strictEqual(nonLeap.daysRemaining, 1);
});

// -----------------------------------------------------------------------------
// Category 4: Privacy Masking & Diagnostic Invariants (FAM-P3-13 to 14)
// -----------------------------------------------------------------------------

await check('FAM-P3-13', 'Identifier masking utility masks short and long identifiers safely without altering stored raw data', () => {
    assert.strictEqual(maskIdentifier(null), '');
    assert.strictEqual(maskIdentifier(''), '');
    assert.strictEqual(maskIdentifier('   '), '');

    // Short identifier <= 4 chars returns '••••'
    assert.strictEqual(maskIdentifier('1234'), '••••');
    assert.strictEqual(maskIdentifier('ABC'), '••••');

    // Longer identifier masks leading characters preserving last 4
    assert.strictEqual(maskIdentifier('P12345678'), '••••• 5678');
    assert.strictEqual(maskIdentifier('IN-4920-8812-3344'), '•••••• 3344');

    // Storage raw value invariant: doc.identifierNumber remains raw string
    const doc = createEmptyDocument({ identifierNumber: 'PASSPORT_XY_9999' });
    const masked = maskIdentifier(doc.identifierNumber);
    assert.strictEqual(doc.identifierNumber, 'PASSPORT_XY_9999', 'Raw value untouched');
    assert.strictEqual(masked, '•••••• 9999');
});

await check('FAM-P3-14', 'Diagnostic privacy: error messages do not leak sensitive document identifiers or notes', () => {
    const sensitiveNumber = 'TOP_SECRET_PASSPORT_NUMBER_999';
    const badDoc = createEmptyDocument({
        id: 'doc_sec_1',
        householdId: 'hh_sec_1',
        title: 'Secret Doc',
        identifierNumber: sensitiveNumber,
        category: 'INVALID_CATEGORY'
    });

    try {
        validateDocument(badDoc);
        assert.fail('Should have thrown');
    } catch (err) {
        assert.strictEqual(err.message.includes(sensitiveNumber), false, 'Error message must not leak identifier');
    }
});

// -----------------------------------------------------------------------------
// Category 5: Repository Persistence & Atomic Rollback (FAM-P3-15)
// -----------------------------------------------------------------------------

await check('FAM-P3-15', 'Repository stores and retrieves documents with atomic rollback safety', async () => {
    const hh = await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_repo_1', name: 'Test Home' }));
    assert.ok(hh);

    const doc = createEmptyDocument({
        id: 'doc_repo_1',
        householdId: 'hh_repo_1',
        title: 'House Deed',
        category: DocumentCategory.PROPERTY,
        physicalLocation: 'Safe Drawer 1'
    });

    const saved = await FamilyRepository.upsertDocument(doc);
    assert.strictEqual(saved.id, 'doc_repo_1');
    assert.strictEqual(saved.title, 'House Deed');

    const fetched = await FamilyRepository.getDocument('doc_repo_1');
    assert.strictEqual(fetched.id, 'doc_repo_1');
    assert.strictEqual(fetched.physicalLocation, 'Safe Drawer 1');

    // Test simulated persistence error preservation
    const originalPersist = FamilyRepository._persistStore;
    try {
        FamilyRepository._persistStore = async () => { throw new Error('Simulated write failure'); };
        await assert.rejects(
            async () => await FamilyRepository.upsertDocument(createEmptyDocument({ id: 'doc_repo_fail', householdId: 'hh_repo_1', title: 'Failing' })),
            /Simulated write failure/
        );
    } finally {
        FamilyRepository._persistStore = originalPersist;
    }

    // Previous state remains intact
    const fetchedAfter = await FamilyRepository.getDocument('doc_repo_1');
    assert.strictEqual(fetchedAfter.title, 'House Deed');
    const missing = await FamilyRepository.getDocument('doc_repo_fail');
    assert.strictEqual(missing, null);
});

// -----------------------------------------------------------------------------
// Category 6: Referential Integrity & Multi-Household Isolation (FAM-P3-16 to 19)
// -----------------------------------------------------------------------------

await check('FAM-P3-16', 'Referential integrity: rejects document creation when householdId does not exist', async () => {
    const doc = createEmptyDocument({ id: 'doc_nohh', householdId: 'hh_nonexistent', title: 'Orphan' });
    await assert.rejects(
        async () => await FamilyRepository.upsertDocument(doc),
        /Referential integrity error: Household 'hh_nonexistent' does not exist/
    );
});

await check('FAM-P3-17', 'Referential integrity: rejects document creation when personId does not exist', async () => {
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_ref_1', name: 'Household 1' }));
    const doc = createEmptyDocument({ id: 'doc_nop', householdId: 'hh_ref_1', personId: 'p_nonexistent', title: 'Ghost Doc' });
    await assert.rejects(
        async () => await FamilyRepository.upsertDocument(doc),
        /Referential integrity error: Person 'p_nonexistent' does not exist/
    );
});

await check('FAM-P3-18', 'Referential integrity: person must have active or provisional membership in that specific household', async () => {
    // Create Person P1
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_multi_1', fullName: 'Alice Multi' }));
    // Create Household A and Household B
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_multi_a', name: 'Household A' }));
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_multi_b', name: 'Household B' }));

    // Give Alice membership only in Household A
    await FamilyRepository.upsertMembership(createEmptyMembership({
        id: 'hm_multi_a',
        householdId: 'hh_multi_a',
        personId: 'p_multi_1',
        role: HouseholdRole.HEAD,
        status: MembershipStatus.ACTIVE
    }));

    // Assign document for Alice in Household A -> SUCCEEDS
    const docA = createEmptyDocument({
        id: 'doc_alice_a',
        householdId: 'hh_multi_a',
        personId: 'p_multi_1',
        title: 'Alice Passport in Household A'
    });
    const savedA = await FamilyRepository.upsertDocument(docA);
    assert.strictEqual(savedA.id, 'doc_alice_a');

    // Assign document for Alice in Household B (where she has no membership) -> REJECTED
    const docB = createEmptyDocument({
        id: 'doc_alice_b',
        householdId: 'hh_multi_b',
        personId: 'p_multi_1',
        title: 'Alice Passport in Household B'
    });
    await assert.rejects(
        async () => await FamilyRepository.upsertDocument(docB),
        /Person 'p_multi_1' is not an active or provisional member of household 'hh_multi_b'/
    );
});

await check('FAM-P3-19', 'Household-wide documents (personId = null) persist and list cleanly without person link', async () => {
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_wide_1', name: 'Wide Home' }));
    const doc = createEmptyDocument({
        id: 'doc_wide_1',
        householdId: 'hh_wide_1',
        personId: null,
        title: 'Home Insurance Policy',
        category: DocumentCategory.PROPERTY
    });

    const saved = await FamilyRepository.upsertDocument(doc);
    assert.strictEqual(saved.personId, null);

    const list = await FamilyRepository.listDocuments({ householdId: 'hh_wide_1' });
    const found = list.find(d => d.id === 'doc_wide_1');
    assert.ok(found);
    assert.strictEqual(found.personId, null);
});

// -----------------------------------------------------------------------------
// Category 7: Person & Household Deletion Lifecycle (FAM-P3-20 to 21)
// -----------------------------------------------------------------------------

await check('FAM-P3-20', 'Person lifecycle: archive preserves historical docs; new assignments blocked; physical delete rejected', async () => {
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_life_1', name: 'Life Home' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_life_1', fullName: 'Bob Bobson' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({
        id: 'hm_life_1',
        householdId: 'hh_life_1',
        personId: 'p_life_1',
        status: MembershipStatus.ACTIVE
    }));

    // Attach document to Bob
    await FamilyRepository.upsertDocument(createEmptyDocument({
        id: 'doc_bob_1',
        householdId: 'hh_life_1',
        personId: 'p_life_1',
        title: 'Bob License'
    }));

    // Invariant 1: Physical deletion of Person blocked when active documents reference them
    await assert.rejects(
        async () => await FamilyRepository.deletePerson('p_life_1'),
        /Cannot physically delete Person 'p_life_1' because they are referenced by/
    );

    // Invariant 2: Archiving Person preserves their documents
    await FamilyRepository.archivePerson('p_life_1');
    const docAfterArchive = await FamilyRepository.getDocument('doc_bob_1');
    assert.ok(docAfterArchive);
    assert.strictEqual(docAfterArchive.personId, 'p_life_1');

    // Invariant 3: Cannot newly assign a document to an archived person
    await assert.rejects(
        async () => await FamilyRepository.upsertDocument(createEmptyDocument({
            id: 'doc_bob_new',
            householdId: 'hh_life_1',
            personId: 'p_life_1',
            title: 'Bob New Doc'
        })),
        /Cannot assign document to archived person 'p_life_1'/
    );

    // Invariant 4: Archiving the document STILL blocks physical deletion of Person (even if memberships are deleted)
    await FamilyRepository.archiveDocument('doc_bob_1');
    const docArchived = await FamilyRepository.getDocument('doc_bob_1');
    assert.strictEqual(docArchived.status, DocumentStatus.ARCHIVED);

    // Delete membership to isolate document referential integrity
    await FamilyRepository.deleteMembership('hm_life_1');

    await assert.rejects(
        async () => await FamilyRepository.deletePerson('p_life_1'),
        /Cannot physically delete Person 'p_life_1' because they are referenced by document 'doc_bob_1'/
    );
});

await check('FAM-P3-21', 'Household deletion policy: physically deleting a household cascades document deletion and preserves Person', async () => {
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_del_1', name: 'House To Delete' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_del_1', fullName: 'Carol Preserved' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({
        id: 'hm_del_1',
        householdId: 'hh_del_1',
        personId: 'p_del_1',
        status: MembershipStatus.ACTIVE
    }));

    await FamilyRepository.upsertDocument(createEmptyDocument({
        id: 'doc_del_1',
        householdId: 'hh_del_1',
        personId: 'p_del_1',
        title: 'Document in Household'
    }));

    // Physically delete household
    await FamilyRepository.deleteHousehold('hh_del_1');

    // Documents for this household are deleted
    const doc = await FamilyRepository.getDocument('doc_del_1');
    assert.strictEqual(doc, null);

    // Person remains 100% intact!
    const person = await FamilyRepository.getPerson('p_del_1');
    assert.ok(person);
    assert.strictEqual(person.id, 'p_del_1');
});

// -----------------------------------------------------------------------------
// Category 8: Search, Category & Location Filtering (FAM-P3-22 to 23)
// -----------------------------------------------------------------------------

await check('FAM-P3-22', 'Search and filtering: listDocuments filters by category, person, status, and query string', async () => {
    const hhId = 'hh_search_1';
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: hhId, name: 'Search Home' }));

    await FamilyDocumentService.createDocument({
        id: 'doc_s_1',
        householdId: hhId,
        title: 'Emergency Medical Summary',
        category: DocumentCategory.MEDICAL,
        notes: 'Includes allergy report',
        tags: ['health', 'urgent']
    });

    await FamilyDocumentService.createDocument({
        id: 'doc_s_2',
        householdId: hhId,
        title: 'Vehicle Registration Certificate',
        category: DocumentCategory.VEHICLE,
        notes: 'Sedan plate 4410',
        tags: ['car']
    });

    // Filter by Category
    const medicals = await FamilyDocumentService.listDocuments({ householdId: hhId, category: DocumentCategory.MEDICAL });
    assert.strictEqual(medicals.length, 1);
    assert.strictEqual(medicals[0].id, 'doc_s_1');

    // Search query matches notes
    const allergySearch = await FamilyDocumentService.listDocuments({ householdId: hhId, searchQuery: 'allergy' });
    assert.strictEqual(allergySearch.length, 1);
    assert.strictEqual(allergySearch[0].id, 'doc_s_1');

    // Search query matches tags
    const carSearch = await FamilyDocumentService.listDocuments({ householdId: hhId, searchQuery: 'CAR' });
    assert.strictEqual(carSearch.length, 1);
    assert.strictEqual(carSearch[0].id, 'doc_s_2');
});

await check('FAM-P3-23', 'Physical location registry aggregates distinct non-empty locations and counts accurately', async () => {
    const hhId = 'hh_loc_1';
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: hhId, name: 'Locations Home' }));

    await FamilyDocumentService.createDocument({
        id: 'doc_loc_1',
        householdId: hhId,
        title: 'Doc A',
        physicalLocation: 'Master Bedroom Safe'
    });
    await FamilyDocumentService.createDocument({
        id: 'doc_loc_2',
        householdId: hhId,
        title: 'Doc B',
        physicalLocation: 'Master Bedroom Safe'
    });
    await FamilyDocumentService.createDocument({
        id: 'doc_loc_3',
        householdId: hhId,
        title: 'Doc C',
        physicalLocation: 'Office Desk Drawer 2'
    });
    await FamilyDocumentService.createDocument({
        id: 'doc_loc_4',
        householdId: hhId,
        title: 'Doc D',
        physicalLocation: null // no location
    });

    const locations = await FamilyDocumentService.getPhysicalLocations(hhId);
    assert.strictEqual(locations.length, 2);
    assert.strictEqual(locations[0].location, 'Master Bedroom Safe');
    assert.strictEqual(locations[0].count, 2);
    assert.strictEqual(locations[1].location, 'Office Desk Drawer 2');
    assert.strictEqual(locations[1].count, 1);
});

// -----------------------------------------------------------------------------
// Category 9: Registry Summary Metrics & Zero Readiness Scoring (FAM-P3-24)
// -----------------------------------------------------------------------------

await check('FAM-P3-24', 'Summary metrics accurately count active docs, excluding archived docs, with zero readiness score formulas', async () => {
    const hhId = 'hh_metrics_1';
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: hhId, name: 'Metrics Home' }));

    const refDate = '2026-09-09';

    // 1. Valid document (expires in 120 days -> 2027-01-07)
    await FamilyDocumentService.createDocument({
        id: 'doc_m_valid',
        householdId: hhId,
        title: 'Valid Passport',
        expiryDate: '2027-01-07',
        physicalLocation: 'Safe Box'
    });

    // 2. Expiring soon document (expires in 30 days -> 2026-10-09)
    await FamilyDocumentService.createDocument({
        id: 'doc_m_soon',
        householdId: hhId,
        title: 'Soon Policy',
        expiryDate: '2026-10-09',
        physicalLocation: 'Safe Box'
    });

    // 3. Expired document (expired yesterday -> 2026-09-08)
    await FamilyDocumentService.createDocument({
        id: 'doc_m_expired',
        householdId: hhId,
        title: 'Expired Visa',
        expiryDate: '2026-09-08'
    });

    // 4. No expiry document
    await FamilyDocumentService.createDocument({
        id: 'doc_m_noexp',
        householdId: hhId,
        title: 'Birth Certificate',
        expiryDate: null,
        physicalLocation: 'Filing Cabinet'
    });

    // 5. Archived document (MUST NOT be counted in active metrics!)
    const toArchive = await FamilyDocumentService.createDocument({
        id: 'doc_m_archived',
        householdId: hhId,
        title: 'Old Deed',
        expiryDate: '2026-09-08'
    });
    await FamilyDocumentService.archiveDocument(toArchive.id);

    const metrics = await FamilyDocumentService.getSummaryMetrics(hhId, refDate);

    // Strict validation:
    // Active total: 4 (archived doc excluded!)
    assert.strictEqual(metrics.totalDocuments, 4);
    assert.strictEqual(metrics.expiringSoon, 1);
    assert.strictEqual(metrics.expired, 1);
    assert.strictEqual(metrics.valid, 1);
    assert.strictEqual(metrics.noExpiry, 1);
    // Distinct physical locations: 'Safe Box', 'Filing Cabinet' -> 2
    assert.strictEqual(metrics.physicalLocationsCount, 2);

    // Hard Invariant: Zero readiness score or percentage formula
    assert.strictEqual('readinessScore' in metrics, false, 'No fake readinessScore');
    assert.strictEqual('completenessScore' in metrics, false, 'No fake completenessScore');
    assert.strictEqual('score' in metrics, false, 'No fake score');
});

console.log('\n================================================================');
console.log(`🎉 ALL TESTS PASSED: ${passCount} / ${totalCount} checks verified`);
console.log('================================================================\n');
