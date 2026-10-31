/**
 * tests/family/test_family_phase5_protection.mjs
 * 
 * Master Regression Suite for FinLife Family OS Phase 5:
 * Family Protection & Emergency Readiness.
 * 
 * Verifies:
 * - Domain entities & contracts (EmergencyContact, ProtectionItem, enums)
 * - Reference exclusivity (personId XOR trustedCircleMemberId XOR external third-party)
 * - Multi-household isolation across contacts and protection items
 * - Physical deletion blockers for referenced Persons and Documents
 * - Cascading household deletion cleanup preserving Persons
 * - Pure deterministic Family Readiness Engine:
 *   - Empty household -> CRITICAL_GAPS (0/5, 0%)
 *   - Primary contact -> BASIC (1/5, 20%)
 *   - Vital document -> BASIC (2/5, 40%)
 *   - Healthcare/legal directive -> SUBSTANTIAL (3/5, 60%)
 *   - Physical location -> SUBSTANTIAL (4/5, 80%)
 *   - Full coverage -> COMPREHENSIVE (5/5, 100%)
 *   - Expired vital document -> exact downgrade to SUBSTANTIAL (4/5, 80%) with exact message
 * - Archived entity exclusion from readiness audit
 * - Archived entity retrieval via includeArchived: true
 * - NAV-P2-27 scaffolding honesty: matches /Protection & Care/i, forbids /insurancePolicyId/i
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

import {
    FamilyRepository,
    FamilyProtectionService,
    FamilyHouseholdService,
    FamilyPersonService,
    FamilyDocumentService,
    EmergencyContactType,
    ProtectionType,
    ProtectionStatus,
    ReadinessLevel,
    DimensionStatus,
    DocumentCategory,
    DocumentStatus,
    ExpiryStatus,
    HouseholdRole,
    MembershipStatus,
    createEmptyEmergencyContact,
    createEmptyProtectionItem,
    validateEmergencyContact,
    validateProtectionItem,
    evaluateHouseholdReadinessPure
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
console.log('🧪 FINLIFE FAMILY OS - PHASE 5: PROTECTION & EMERGENCY TESTS');
console.log('=============================================================');

// Activate test mode for hermetic test execution
FamilyRepository.setTestMode(true);

// -----------------------------------------------------------------------------
// SECTION 1: CONTRACT FACTORIES & VALIDATION
// -----------------------------------------------------------------------------

check('FAM-P5-01', 'createEmptyEmergencyContact creates valid default entity with priorityOrder and isArchived: false', () => {
    const contact = createEmptyEmergencyContact({
        householdId: 'hh_alpha',
        displayName: 'Dr. Jane Smith',
        relationship: 'Pediatrician',
        primaryPhone: '+1-555-0199'
    });
    assert.strictEqual(contact.householdId, 'hh_alpha');
    assert.strictEqual(contact.displayName, 'Dr. Jane Smith');
    assert.strictEqual(contact.contactType, EmergencyContactType.PRIMARY);
    assert.strictEqual(contact.priorityOrder, 1);
    assert.strictEqual(contact.isArchived, false);
    assert.strictEqual(typeof contact.id, 'string');
    assert.strictEqual(validateEmergencyContact(contact), true);
});

check('FAM-P5-02', 'validateEmergencyContact enforces required fields (id, householdId, displayName, relationship, primaryPhone)', () => {
    assert.throws(() => validateEmergencyContact(null), /FamilyEmergencyContact must be an object/);
    assert.throws(() => validateEmergencyContact({ id: '', householdId: 'hh_1' }), /non-empty string id/);
    assert.throws(() => validateEmergencyContact({ id: 'emc_1', householdId: '' }), /non-empty string householdId/);
    assert.throws(() => validateEmergencyContact({
        id: 'emc_1',
        householdId: 'hh_1',
        priorityOrder: 0
    }), /priorityOrder must be an integer >= 1/);
    assert.throws(() => validateEmergencyContact({
        id: 'emc_1',
        householdId: 'hh_1',
        priorityOrder: 1,
        contactType: 'UNKNOWN'
    }), /Invalid EmergencyContactType/);
    assert.throws(() => validateEmergencyContact({
        id: 'emc_1',
        householdId: 'hh_1',
        priorityOrder: 1,
        contactType: EmergencyContactType.PRIMARY,
        displayName: '',
        relationship: 'Spouse',
        primaryPhone: '555-0100',
        isArchived: false
    }), /requires a non-empty displayName/);
});

check('FAM-P5-03', 'validateEmergencyContact strictly enforces reference exclusivity: rejects both personId and trustedCircleMemberId', () => {
    const dualContact = createEmptyEmergencyContact({
        householdId: 'hh_1',
        displayName: 'John Doe',
        relationship: 'Brother',
        primaryPhone: '555-0101',
        personId: 'p_internal_1',
        trustedCircleMemberId: 'tc_external_1'
    });
    assert.throws(() => validateEmergencyContact(dualContact), /Emergency contact cannot specify both personId and trustedCircleMemberId/);
});

check('FAM-P5-04', 'createEmptyProtectionItem standardizes exclusively on canonical physicalLocation', () => {
    const item = createEmptyProtectionItem({
        householdId: 'hh_alpha',
        title: 'Healthcare Proxy Declaration',
        protectionType: ProtectionType.HEALTHCARE_PROXY,
        physicalLocation: 'Master Bedroom Fireproof Safe B2'
    });
    assert.strictEqual(item.title, 'Healthcare Proxy Declaration');
    assert.strictEqual(item.protectionType, ProtectionType.HEALTHCARE_PROXY);
    assert.strictEqual(item.status, ProtectionStatus.ACTIVE);
    assert.strictEqual(item.physicalLocation, 'Master Bedroom Fireproof Safe B2');
    assert.strictEqual(validateProtectionItem(item), true);
});

check('FAM-P5-05', 'validateProtectionItem enforces required fields (id, householdId, title, protectionType, status)', () => {
    assert.throws(() => validateProtectionItem(null), /FamilyProtectionItem must be an object/);
    assert.throws(() => validateProtectionItem({ id: '', householdId: 'hh_1' }), /non-empty string id/);
    assert.throws(() => validateProtectionItem({ id: 'prot_1', householdId: '' }), /non-empty string householdId/);
    assert.throws(() => validateProtectionItem({ id: 'prot_1', householdId: 'hh_1', title: '' }), /non-empty title/);
    assert.throws(() => validateProtectionItem({
        id: 'prot_1',
        householdId: 'hh_1',
        title: 'Will',
        protectionType: 'INVALID'
    }), /Invalid ProtectionType/);
});

check('FAM-P5-06', 'validateProtectionItem designation rules: rejects backup agent without primary designated agent', () => {
    const item = createEmptyProtectionItem({
        householdId: 'hh_1',
        title: 'Durable Power of Attorney',
        protectionType: ProtectionType.POWER_OF_ATTORNEY,
        designatedPersonId: null,
        designatedBackupPersonId: 'p_backup_1'
    });
    assert.throws(() => validateProtectionItem(item), /A backup agent cannot be designated without a primary designated agent/);
});

check('FAM-P5-07', 'validateProtectionItem designation rules: rejects backup agent identical to primary agent', () => {
    const item = createEmptyProtectionItem({
        householdId: 'hh_1',
        title: 'Durable Power of Attorney',
        protectionType: ProtectionType.POWER_OF_ATTORNEY,
        designatedPersonId: 'p_john',
        designatedBackupPersonId: 'p_john'
    });
    assert.throws(() => validateProtectionItem(item), /Designated backup agent cannot be the same person as the primary agent/);
});

// -----------------------------------------------------------------------------
// SECTION 2: REPOSITORY CRUD & REFERENTIAL INTEGRITY
// -----------------------------------------------------------------------------

await asyncCheck('FAM-P5-08', 'Emergency Contact CRUD: upsert, get, list, archive, and delete work as expected', async () => {
    FamilyRepository._resetInMemory();

    const hh = await FamilyHouseholdService.createHousehold({ name: 'Alpha Family' });
    const contact = await FamilyProtectionService.saveEmergencyContact({
        householdId: hh.id,
        displayName: 'Local Dispatch Police',
        relationship: 'Emergency Authority',
        primaryPhone: '911',
        priorityOrder: 1
    });

    assert.strictEqual(contact.displayName, 'Local Dispatch Police');
    const retrieved = await FamilyProtectionService.getEmergencyContact(contact.id);
    assert.strictEqual(retrieved.id, contact.id);

    const list = await FamilyProtectionService.listEmergencyContacts(hh.id);
    assert.strictEqual(list.length, 1);

    const archived = await FamilyProtectionService.archiveEmergencyContact(contact.id);
    assert.strictEqual(archived.isArchived, true);

    const activeList = await FamilyProtectionService.listEmergencyContacts(hh.id);
    assert.strictEqual(activeList.length, 0);

    const allList = await FamilyProtectionService.listEmergencyContacts(hh.id, { includeArchived: true });
    assert.strictEqual(allList.length, 1);

    const deleted = await FamilyProtectionService.deleteEmergencyContact(contact.id);
    assert.strictEqual(deleted, true);
    const finalList = await FamilyProtectionService.listEmergencyContacts(hh.id, { includeArchived: true });
    assert.strictEqual(finalList.length, 0);
});

await asyncCheck('FAM-P5-09', 'Emergency contact reordering updates priorityOrder deterministically', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Reorder Household' });

    const c1 = await FamilyProtectionService.saveEmergencyContact({
        householdId: hh.id,
        displayName: 'Contact 1',
        relationship: 'Friend',
        primaryPhone: '555-01',
        priorityOrder: 1
    });
    const c2 = await FamilyProtectionService.saveEmergencyContact({
        householdId: hh.id,
        displayName: 'Contact 2',
        relationship: 'Doctor',
        primaryPhone: '555-02',
        priorityOrder: 2
    });

    const reordered = await FamilyProtectionService.reorderEmergencyContacts(hh.id, [c2.id, c1.id]);
    assert.strictEqual(reordered[0].id, c2.id);
    assert.strictEqual(reordered[0].priorityOrder, 1);
    assert.strictEqual(reordered[1].id, c1.id);
    assert.strictEqual(reordered[1].priorityOrder, 2);
});

await asyncCheck('FAM-P5-10', 'Emergency contact multi-household isolation: rejects personId from another household', async () => {
    FamilyRepository._resetInMemory();
    const hhA = await FamilyHouseholdService.createHousehold({ name: 'Household A' });
    const hhB = await FamilyHouseholdService.createHousehold({ name: 'Household B' });

    const personB = await FamilyPersonService.createPerson({ fullName: 'Bob from B' });
    await FamilyHouseholdService.addMemberToHousehold({ householdId: hhB.id, personId: personB.id, role: HouseholdRole.MEMBER });

    await assert.rejects(async () => {
        await FamilyProtectionService.saveEmergencyContact({
            householdId: hhA.id,
            personId: personB.id,
            displayName: 'Bob',
            relationship: 'Brother',
            primaryPhone: '555-9999'
        });
    }, /Multi-household isolation error.*not an active member of household/);
});

await asyncCheck('FAM-P5-11', 'Protection Item CRUD: upsert, get, list, archive, and delete work as expected', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Protection Test HH' });
    const person = await FamilyPersonService.createPerson({ fullName: 'Alice Lead' });
    await FamilyHouseholdService.addMemberToHousehold({ householdId: hh.id, personId: person.id, role: HouseholdRole.HEAD });

    const prot = await FamilyProtectionService.saveProtectionItem({
        householdId: hh.id,
        title: 'Advance Healthcare Directive',
        protectionType: ProtectionType.HEALTHCARE_PROXY,
        designatedPersonId: person.id,
        physicalLocation: 'Safe Drawer #1'
    });

    assert.strictEqual(prot.title, 'Advance Healthcare Directive');
    assert.strictEqual(prot.designatedPersonName, 'Alice Lead');

    const list = await FamilyProtectionService.listProtectionItems(hh.id);
    assert.strictEqual(list.length, 1);

    const archived = await FamilyProtectionService.archiveProtectionItem(prot.id);
    assert.strictEqual(archived.status, ProtectionStatus.ARCHIVED);

    const activeList = await FamilyProtectionService.listProtectionItems(hh.id);
    assert.strictEqual(activeList.length, 0);

    const deleted = await FamilyProtectionService.deleteProtectionItem(prot.id);
    assert.strictEqual(deleted, true);
});

await asyncCheck('FAM-P5-12', 'Protection item multi-household isolation: rejects designated agent from outside household', async () => {
    FamilyRepository._resetInMemory();
    const hhA = await FamilyHouseholdService.createHousehold({ name: 'Household A' });
    const hhB = await FamilyHouseholdService.createHousehold({ name: 'Household B' });

    const personB = await FamilyPersonService.createPerson({ fullName: 'Foreign Agent' });
    await FamilyHouseholdService.addMemberToHousehold({ householdId: hhB.id, personId: personB.id, role: HouseholdRole.MEMBER });

    await assert.rejects(async () => {
        await FamilyProtectionService.saveProtectionItem({
            householdId: hhA.id,
            title: 'Proxy Outside HH',
            protectionType: ProtectionType.HEALTHCARE_PROXY,
            designatedPersonId: personB.id
        });
    }, /Multi-household isolation error.*not an active member of household/);
});

await asyncCheck('FAM-P5-13', 'Protection item multi-household isolation: rejects documentId from different household', async () => {
    FamilyRepository._resetInMemory();
    const hhA = await FamilyHouseholdService.createHousehold({ name: 'Household A' });
    const hhB = await FamilyHouseholdService.createHousehold({ name: 'Household B' });

    const docB = await FamilyDocumentService.createDocument({
        householdId: hhB.id,
        title: 'Will of B',
        category: DocumentCategory.LEGAL
    });

    await assert.rejects(async () => {
        await FamilyProtectionService.saveProtectionItem({
            householdId: hhA.id,
            title: 'Will Reference',
            protectionType: ProtectionType.WILL_TRUST,
            documentId: docB.id
        });
    }, /Multi-household isolation error.*does not belong to household/);
});

await asyncCheck('FAM-P5-14', 'Document deletion protection: FamilyRepository.deleteDocument is blocked if referenced by active or archived protection items', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Doc Protection HH' });

    const doc = await FamilyDocumentService.createDocument({
        householdId: hh.id,
        title: 'Family Trust Deed',
        category: DocumentCategory.LEGAL
    });

    const prot = await FamilyProtectionService.saveProtectionItem({
        householdId: hh.id,
        title: 'Revocable Living Trust',
        protectionType: ProtectionType.WILL_TRUST,
        documentId: doc.id
    });

    // 1. Active protection item references document -> physical deletion blocked
    await assert.rejects(async () => {
        await FamilyRepository.deleteDocument(doc.id);
    }, /Cannot physically delete document because one or more protection directives reference it/);

    // 2. Archived protection item references document -> physical deletion ALSO blocked
    await FamilyProtectionService.archiveProtectionItem(prot.id);
    await assert.rejects(async () => {
        await FamilyRepository.deleteDocument(doc.id);
    }, /Cannot physically delete document because one or more protection directives reference it/);

    // 3. Archiving the document remains fully permitted
    const archivedDoc = await FamilyDocumentService.archiveDocument(doc.id);
    assert.strictEqual(archivedDoc.status, DocumentStatus.ARCHIVED);

    // 4. Archived protection records remain queryable with includeArchived: true
    const listWithArchived = await FamilyProtectionService.listProtectionItems(hh.id, { includeArchived: true });
    assert.strictEqual(listWithArchived.length, 1);
    assert.strictEqual(listWithArchived[0].id, prot.id);
    assert.strictEqual(listWithArchived[0].status, ProtectionStatus.ARCHIVED);
});

await asyncCheck('FAM-P5-15', 'Person deletion protection: deletePerson is blocked if referenced by emergency contact', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Person Guard HH' });
    const person = await FamilyPersonService.createPerson({ fullName: 'Contact Person' });
    const membership = await FamilyHouseholdService.addMemberToHousehold({ householdId: hh.id, personId: person.id, role: HouseholdRole.MEMBER });

    await FamilyProtectionService.saveEmergencyContact({
        householdId: hh.id,
        personId: person.id,
        displayName: 'Contact Person',
        relationship: 'Emergency Contact',
        primaryPhone: '555-0109'
    });

    // Remove membership first to isolate the emergency contact guard
    await FamilyRepository.deleteMembership(membership.id);

    await assert.rejects(async () => {
        await FamilyRepository.deletePerson(person.id);
    }, /Cannot physically delete this Person because one or more emergency contacts or protection directives reference them/);
});

await asyncCheck('FAM-P5-16', 'Person deletion protection: deletePerson is blocked if referenced by protection item', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Person Prot Guard HH' });
    const person = await FamilyPersonService.createPerson({ fullName: 'Designated Agent' });
    const membership = await FamilyHouseholdService.addMemberToHousehold({ householdId: hh.id, personId: person.id, role: HouseholdRole.HEAD });

    await FamilyProtectionService.saveProtectionItem({
        householdId: hh.id,
        title: 'Medical Power of Attorney',
        protectionType: ProtectionType.HEALTHCARE_PROXY,
        designatedPersonId: person.id
    });

    // Remove membership first to isolate protection guard
    await FamilyRepository.deleteMembership(membership.id);

    await assert.rejects(async () => {
        await FamilyRepository.deletePerson(person.id);
    }, /Cannot physically delete this Person because one or more emergency contacts or protection directives reference them/);
});

await asyncCheck('FAM-P5-17', 'Household deletion cascade: deletes emergency contacts & protection items while preserving Persons intact', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Cascade HH' });
    const person = await FamilyPersonService.createPerson({ fullName: 'Preserved Person' });
    await FamilyHouseholdService.addMemberToHousehold({ householdId: hh.id, personId: person.id, role: HouseholdRole.HEAD });

    await FamilyProtectionService.saveEmergencyContact({
        householdId: hh.id,
        displayName: 'Local Doctor',
        relationship: 'Doctor',
        primaryPhone: '555-0111'
    });

    await FamilyProtectionService.saveProtectionItem({
        householdId: hh.id,
        title: 'Emergency Instructions',
        protectionType: ProtectionType.CRITICAL_DIRECTIVE
    });

    await FamilyHouseholdService.deleteHousehold(hh.id);

    // Household, contacts, and protection items deleted
    const contacts = await FamilyProtectionService.listEmergencyContacts(hh.id, { includeArchived: true });
    const protections = await FamilyProtectionService.listProtectionItems(hh.id, { includeArchived: true });
    assert.strictEqual(contacts.length, 0);
    assert.strictEqual(protections.length, 0);

    // Person entity PRESERVED
    const preservedPerson = await FamilyPersonService.getPerson(person.id);
    assert.strictEqual(preservedPerson.fullName, 'Preserved Person');
});

// -----------------------------------------------------------------------------
// SECTION 3: DETERMINISTIC FAMILY READINESS ENGINE (0/5 TO 5/5 PROGRESSION)
// -----------------------------------------------------------------------------

check('FAM-P5-18', 'Readiness Step 1: Empty household evaluates to CRITICAL_GAPS (0/5, 0%)', () => {
    const audit = evaluateHouseholdReadinessPure({
        householdId: 'hh_test',
        emergencyContacts: [],
        protectionItems: [],
        documents: []
    });

    assert.strictEqual(audit.readinessLevel, ReadinessLevel.CRITICAL_GAPS);
    assert.strictEqual(audit.passedCriteriaCount, 0);
    assert.strictEqual(audit.totalCriteriaCount, 5);
    assert.strictEqual(audit.scorePercentage, 0);
    assert.strictEqual(audit.dimensions.length, 5);
    assert.strictEqual(audit.actionableGaps.length, 5);
});

check('FAM-P5-19', 'Readiness Step 2: Adding primary emergency contact with phone advances to BASIC (1/5, 20%)', () => {
    const audit = evaluateHouseholdReadinessPure({
        householdId: 'hh_test',
        emergencyContacts: [
            createEmptyEmergencyContact({
                contactType: EmergencyContactType.PRIMARY,
                displayName: 'Jane Doe',
                primaryPhone: '555-0199'
            })
        ],
        protectionItems: [],
        documents: []
    });

    assert.strictEqual(audit.readinessLevel, ReadinessLevel.BASIC);
    assert.strictEqual(audit.passedCriteriaCount, 1);
    assert.strictEqual(audit.scorePercentage, 20);
    assert.strictEqual(audit.dimensions[0].id, 'PRIMARY_EMERGENCY_CONTACT');
    assert.strictEqual(audit.dimensions[0].status, DimensionStatus.COMPLETE);
});

check('FAM-P5-20', 'Readiness Step 3: Adding active vital document (Phase 3) advances to BASIC (2/5, 40%)', () => {
    const audit = evaluateHouseholdReadinessPure({
        householdId: 'hh_test',
        emergencyContacts: [
            createEmptyEmergencyContact({
                contactType: EmergencyContactType.PRIMARY,
                displayName: 'Jane Doe',
                primaryPhone: '555-0199'
            })
        ],
        protectionItems: [],
        documents: [
            {
                id: 'doc_1',
                category: DocumentCategory.IDENTITY,
                status: DocumentStatus.ACTIVE,
                expiryStatus: ExpiryStatus.VALID
            }
        ]
    });

    assert.strictEqual(audit.readinessLevel, ReadinessLevel.BASIC);
    assert.strictEqual(audit.passedCriteriaCount, 2);
    assert.strictEqual(audit.scorePercentage, 40);
    assert.strictEqual(audit.dimensions[2].id, 'VITAL_DOCUMENTS_INTEGRITY');
    assert.strictEqual(audit.dimensions[2].status, DimensionStatus.COMPLETE);
});

check('FAM-P5-21', 'Readiness Step 4: Adding healthcare/legal directive with agent advances to SUBSTANTIAL (3/5, 60%)', () => {
    const audit = evaluateHouseholdReadinessPure({
        householdId: 'hh_test',
        emergencyContacts: [
            createEmptyEmergencyContact({
                contactType: EmergencyContactType.PRIMARY,
                displayName: 'Jane Doe',
                primaryPhone: '555-0199'
            })
        ],
        protectionItems: [
            createEmptyProtectionItem({
                title: 'Healthcare Directive',
                protectionType: ProtectionType.HEALTHCARE_PROXY,
                designatedPersonId: 'p_agent_1',
                status: ProtectionStatus.ACTIVE
            })
        ],
        documents: [
            {
                id: 'doc_1',
                category: DocumentCategory.IDENTITY,
                status: DocumentStatus.ACTIVE,
                expiryStatus: ExpiryStatus.VALID
            }
        ]
    });

    assert.strictEqual(audit.readinessLevel, ReadinessLevel.SUBSTANTIAL);
    assert.strictEqual(audit.passedCriteriaCount, 3);
    assert.strictEqual(audit.scorePercentage, 60);
    assert.strictEqual(audit.dimensions[3].id, 'HEALTHCARE_OR_LEGAL_DIRECTIVE');
    assert.strictEqual(audit.dimensions[3].status, DimensionStatus.COMPLETE);
});

check('FAM-P5-22', 'Readiness Step 5: Registering physical safe location advances to SUBSTANTIAL (4/5, 80%)', () => {
    const audit = evaluateHouseholdReadinessPure({
        householdId: 'hh_test',
        emergencyContacts: [
            createEmptyEmergencyContact({
                contactType: EmergencyContactType.PRIMARY,
                displayName: 'Jane Doe',
                primaryPhone: '555-0199'
            })
        ],
        protectionItems: [
            createEmptyProtectionItem({
                title: 'Healthcare Directive',
                protectionType: ProtectionType.HEALTHCARE_PROXY,
                designatedPersonId: 'p_agent_1',
                physicalLocation: 'Safe Drawer #1',
                status: ProtectionStatus.ACTIVE
            })
        ],
        documents: [
            {
                id: 'doc_1',
                category: DocumentCategory.IDENTITY,
                status: DocumentStatus.ACTIVE,
                expiryStatus: ExpiryStatus.VALID
            }
        ]
    });

    assert.strictEqual(audit.readinessLevel, ReadinessLevel.SUBSTANTIAL);
    assert.strictEqual(audit.passedCriteriaCount, 4);
    assert.strictEqual(audit.scorePercentage, 80);
    assert.strictEqual(audit.dimensions[4].id, 'PHYSICAL_SAFE_LOCATION_AUDIT');
    assert.strictEqual(audit.dimensions[4].status, DimensionStatus.COMPLETE);
});

check('FAM-P5-23', 'Readiness Step 6: Full coverage with secondary/medical contact advances to COMPREHENSIVE (5/5, 100%)', () => {
    const audit = evaluateHouseholdReadinessPure({
        householdId: 'hh_test',
        emergencyContacts: [
            createEmptyEmergencyContact({
                contactType: EmergencyContactType.PRIMARY,
                displayName: 'Jane Doe',
                primaryPhone: '555-0199'
            }),
            createEmptyEmergencyContact({
                contactType: EmergencyContactType.SECONDARY,
                displayName: 'John Doe',
                primaryPhone: '555-0198'
            })
        ],
        protectionItems: [
            createEmptyProtectionItem({
                title: 'Healthcare Directive',
                protectionType: ProtectionType.HEALTHCARE_PROXY,
                designatedPersonId: 'p_agent_1',
                physicalLocation: 'Safe Drawer #1',
                status: ProtectionStatus.ACTIVE
            })
        ],
        documents: [
            {
                id: 'doc_1',
                category: DocumentCategory.IDENTITY,
                status: DocumentStatus.ACTIVE,
                expiryStatus: ExpiryStatus.VALID
            }
        ]
    });

    assert.strictEqual(audit.readinessLevel, ReadinessLevel.COMPREHENSIVE);
    assert.strictEqual(audit.passedCriteriaCount, 5);
    assert.strictEqual(audit.scorePercentage, 100);
    assert.strictEqual(audit.actionableGaps.length, 0);
});

// -----------------------------------------------------------------------------
// SECTION 4: LOCKED DOWNGRADE BEHAVIOR & EXPIRED DOCUMENTS
// -----------------------------------------------------------------------------

check('FAM-P5-24', 'Locked Expired Document Downgrade: 5/5 COMPREHENSIVE downgrades to SUBSTANTIAL (4/5) with exact explanation', () => {
    const audit = evaluateHouseholdReadinessPure({
        householdId: 'hh_test',
        emergencyContacts: [
            createEmptyEmergencyContact({
                contactType: EmergencyContactType.PRIMARY,
                displayName: 'Jane Doe',
                primaryPhone: '555-0199'
            }),
            createEmptyEmergencyContact({
                contactType: EmergencyContactType.SECONDARY,
                displayName: 'John Doe',
                primaryPhone: '555-0198'
            })
        ],
        protectionItems: [
            createEmptyProtectionItem({
                title: 'Healthcare Directive',
                protectionType: ProtectionType.HEALTHCARE_PROXY,
                designatedPersonId: 'p_agent_1',
                physicalLocation: 'Safe Drawer #1',
                status: ProtectionStatus.ACTIVE
            })
        ],
        documents: [
            {
                id: 'doc_1',
                category: DocumentCategory.IDENTITY,
                status: DocumentStatus.ACTIVE,
                expiryStatus: ExpiryStatus.EXPIRED // Expired passport!
            }
        ]
    });

    assert.strictEqual(audit.readinessLevel, ReadinessLevel.SUBSTANTIAL);
    assert.strictEqual(audit.passedCriteriaCount, 4);
    assert.strictEqual(audit.scorePercentage, 80);
    assert.strictEqual(audit.dimensions[2].id, 'VITAL_DOCUMENTS_INTEGRITY');
    assert.strictEqual(audit.dimensions[2].status, DimensionStatus.CRITICAL_GAP);
    assert.strictEqual(audit.dimensions[2].explanation, 'One or more vital documents are expired');
});

check('FAM-P5-25', 'Archived records exclusion: archived contacts and directives are strictly excluded from readiness audit', () => {
    const audit = evaluateHouseholdReadinessPure({
        householdId: 'hh_test',
        emergencyContacts: [
            createEmptyEmergencyContact({
                contactType: EmergencyContactType.PRIMARY,
                displayName: 'Old Contact',
                primaryPhone: '555-0199',
                isArchived: true // Archived!
            })
        ],
        protectionItems: [
            createEmptyProtectionItem({
                title: 'Archived Directive',
                protectionType: ProtectionType.HEALTHCARE_PROXY,
                designatedPersonId: 'p_agent_1',
                physicalLocation: 'Safe #1',
                status: ProtectionStatus.ARCHIVED // Archived!
            })
        ],
        documents: []
    });

    // Since archived records are excluded, household should evaluate to CRITICAL_GAPS (0/5)
    assert.strictEqual(audit.readinessLevel, ReadinessLevel.CRITICAL_GAPS);
    assert.strictEqual(audit.passedCriteriaCount, 0);
    assert.strictEqual(audit.scorePercentage, 0);
});

check('FAM-P5-26', 'Vital document category strictness: non-vital categories (VEHICLE, PROPERTY) do not satisfy vital documents audit', () => {
    const audit = evaluateHouseholdReadinessPure({
        householdId: 'hh_test',
        emergencyContacts: [],
        protectionItems: [],
        documents: [
            {
                id: 'doc_vehicle',
                category: DocumentCategory.VEHICLE,
                status: DocumentStatus.ACTIVE,
                expiryStatus: ExpiryStatus.VALID
            }
        ]
    });

    assert.strictEqual(audit.dimensions[2].id, 'VITAL_DOCUMENTS_INTEGRITY');
    assert.strictEqual(audit.dimensions[2].status, DimensionStatus.CRITICAL_GAP);
    assert.strictEqual(audit.dimensions[2].explanation, 'No active vital documents registered in Document Vault');
});

// -----------------------------------------------------------------------------
// SECTION 5: GOVERNANCE & NEGATIVE BOUNDARIES
// -----------------------------------------------------------------------------

check('FAM-P5-27', 'NAV-P2-27 Scaffolding Honesty: app/family/protection.js matches /Protection & Care/i and forbids /insurancePolicyId/i', () => {
    const protPath = path.resolve(process.cwd(), 'app/family/protection.js');
    assert.strictEqual(fs.existsSync(protPath), true);
    const protContent = fs.readFileSync(protPath, 'utf8');

    assert.match(protContent, /Protection & Care/i);
    assert.doesNotMatch(protContent, /insurancePolicyId/i);
});

check('FAM-P5-28', 'Zero occurrences of insurancePolicyId across all Phase 5 files', () => {
    const filesToCheck = [
        'services/family/familyContracts.js',
        'services/family/familyRepository.js',
        'services/family/familyProtectionService.js',
        'app/family/protection.js'
    ];

    for (const relPath of filesToCheck) {
        const fullPath = path.resolve(process.cwd(), relPath);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            assert.doesNotMatch(content, /insurancePolicyId/i, `${relPath} must not contain insurancePolicyId`);
        }
    }
});

await asyncCheck('FAM-P5-29', 'Service layer integration: FamilyProtectionService.evaluateReadiness executes against live repository', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Service Readiness HH' });
    const person = await FamilyPersonService.createPerson({ fullName: 'Ready Person' });
    await FamilyHouseholdService.addMemberToHousehold({ householdId: hh.id, personId: person.id, role: HouseholdRole.HEAD });

    await FamilyProtectionService.saveEmergencyContact({
        householdId: hh.id,
        displayName: 'Primary Emergency',
        relationship: 'Spouse',
        primaryPhone: '555-0100',
        contactType: EmergencyContactType.PRIMARY
    });

    const liveAudit = await FamilyProtectionService.evaluateReadiness(hh.id);
    assert.strictEqual(liveAudit.readinessLevel, ReadinessLevel.BASIC);
    assert.strictEqual(liveAudit.passedCriteriaCount, 1);
});

await asyncCheck('FAM-P5-30', 'Service layer enrichment: resolves linked Person names and linked Document titles', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Enrichment HH' });
    const person = await FamilyPersonService.createPerson({ fullName: 'Agent Person', preferredName: 'Agent P' });
    await FamilyHouseholdService.addMemberToHousehold({ householdId: hh.id, personId: person.id, role: HouseholdRole.HEAD });

    const doc = await FamilyDocumentService.createDocument({
        householdId: hh.id,
        title: 'Original Medical Directive Document',
        category: DocumentCategory.LEGAL
    });

    const prot = await FamilyProtectionService.saveProtectionItem({
        householdId: hh.id,
        title: 'Advance Medical Directive',
        protectionType: ProtectionType.HEALTHCARE_PROXY,
        designatedPersonId: person.id,
        documentId: doc.id
    });

    assert.strictEqual(prot.designatedPersonName, 'Agent P');
    assert.strictEqual(prot.linkedDocumentTitle, 'Original Medical Directive Document');
});

await asyncCheck('FAM-P5-31', 'Archived records retrieval: archived contacts and directives remain accessible with includeArchived: true', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Archive Query HH' });

    const c = await FamilyProtectionService.saveEmergencyContact({
        householdId: hh.id,
        displayName: 'Historical Contact',
        relationship: 'Ex-Coworker',
        primaryPhone: '555-0000'
    });
    await FamilyProtectionService.archiveEmergencyContact(c.id);

    const activeList = await FamilyProtectionService.listEmergencyContacts(hh.id);
    assert.strictEqual(activeList.length, 0);

    const allList = await FamilyProtectionService.listEmergencyContacts(hh.id, { includeArchived: true });
    assert.strictEqual(allList.length, 1);
    assert.strictEqual(allList[0].id, c.id);
    assert.strictEqual(allList[0].isArchived, true);
});

await asyncCheck('FAM-P5-32', 'Document deletion protection: archiving a referenced document is permitted, physical deletion is blocked', async () => {
    FamilyRepository._resetInMemory();
    const hh = await FamilyHouseholdService.createHousehold({ name: 'Archive Permitted HH' });

    const doc = await FamilyDocumentService.createDocument({
        householdId: hh.id,
        title: 'Archivable Trust Document',
        category: DocumentCategory.LEGAL
    });

    await FamilyProtectionService.saveProtectionItem({
        householdId: hh.id,
        title: 'Family Trust',
        protectionType: ProtectionType.WILL_TRUST,
        documentId: doc.id
    });

    // Archiving document should succeed
    const archivedDoc = await FamilyDocumentService.archiveDocument(doc.id);
    assert.strictEqual(archivedDoc.status, DocumentStatus.ARCHIVED);

    // Physical deletion must still be blocked!
    await assert.rejects(async () => {
        await FamilyRepository.deleteDocument(doc.id);
    }, /Cannot physically delete document because one or more protection directives reference it/);
});

check('FAM-P5-33', 'Sanitized diagnostics: no sensitive phone numbers or private instructions leaked in errors', () => {
    try {
        validateEmergencyContact({
            id: 'emc_test',
            householdId: 'hh_test',
            displayName: 'Secret Contact',
            relationship: 'Confidential',
            primaryPhone: '123-SECRET-PHONE',
            instructions: 'Top secret safe combination 1234',
            isArchived: false,
            priorityOrder: 0 // invalid
        });
        assert.fail('Should have thrown');
    } catch (err) {
        assert.strictEqual(err.message.includes('123-SECRET-PHONE'), false, 'Phone must not leak in error');
        assert.strictEqual(err.message.includes('Top secret'), false, 'Instructions must not leak in error');
    }
});

check('FAM-P5-34', 'Negative boundary: zero readiness score formulas or fake weights leaked into operations or document services', () => {
    const opsFile = fs.readFileSync(path.resolve(process.cwd(), 'services/family/familyOperationsService.js'), 'utf8');
    const docFile = fs.readFileSync(path.resolve(process.cwd(), 'services/family/familyDocumentService.js'), 'utf8');

    assert.doesNotMatch(opsFile, /readinessLevel/i);
    assert.doesNotMatch(docFile, /readinessLevel/i);
});

console.log('\n=============================================================');
console.log(`🎉 ALL TESTS PASSED: ${passedChecks} / ${totalChecks} checks verified`);
console.log('=============================================================');
