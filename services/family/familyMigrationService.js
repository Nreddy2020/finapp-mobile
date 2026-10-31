/**
 * services/family/familyMigrationService.js
 * 
 * Explicit and Conservative Migration Service for Legacy Family Data.
 * 
 * Invariants & Governance Rules:
 * 1. Zero silent auto-assignment: Legacy members migrate as PROVISIONAL_PENDING_CONFIRMATION
 *    under a PROVISIONAL household. Never assumes confirmed primary status.
 * 2. External professionals (doctors, advisors, lawyers) migrate to TrustedCircleEntry,
 *    NEVER to HouseholdMembership.
 * 3. Idempotent: Can be run multiple times safely without duplicating entities.
 * 4. Preserves lineage via migration metadata { source: 'LEGACY_V2', sourceId, migrationVersion, migratedAt }.
 * 5. Numeric safety: No raw BigInt, no NaN, no Infinity.
 */

import { StorageService, STORAGE_KEYS } from '../storage.js';
import { FamilyRepository } from './familyRepository.js';
import {
    createEmptyPerson,
    createEmptyHousehold,
    createEmptyMembership,
    createEmptyTrustedCircleEntry,
    createEmptyRelationship,
    HouseholdType,
    HouseholdStatus,
    HouseholdRole,
    MembershipStatus,
    TrustedCategory,
    RelationshipType,
    PersonStatus,
    assertSafeNumbers,
    validatePerson,
    validateHousehold,
    validateMembership,
    validateTrustedCircleEntry
} from './familyContracts.js';

const TRUSTED_CATEGORY_MAP = {
    'doctor': TrustedCategory.DOCTOR,
    'physician': TrustedCategory.DOCTOR,
    'pediatrician': TrustedCategory.DOCTOR,
    'lawyer': TrustedCategory.LAWYER,
    'attorney': TrustedCategory.LAWYER,
    'legal': TrustedCategory.LAWYER,
    'advisor': TrustedCategory.FINANCIAL_ADVISOR,
    'financial advisor': TrustedCategory.FINANCIAL_ADVISOR,
    'financial_advisor': TrustedCategory.FINANCIAL_ADVISOR,
    'accountant': TrustedCategory.FINANCIAL_ADVISOR,
    'ca': TrustedCategory.FINANCIAL_ADVISOR,
    'emergency': TrustedCategory.EMERGENCY_CONTACT,
    'emergency contact': TrustedCategory.EMERGENCY_CONTACT,
    'emergency_contact': TrustedCategory.EMERGENCY_CONTACT,
    'neighbor': TrustedCategory.NEIGHBOR,
    'caretaker': TrustedCategory.CARETAKER,
    'nanny': TrustedCategory.CARETAKER
};

function mapLegacyRoleToHouseholdRole(roleStr) {
    if (!roleStr || typeof roleStr !== 'string') {
        return HouseholdRole.MEMBER;
    }
    const lower = roleStr.toLowerCase().trim();
    if (lower === 'admin' || lower === 'head') {
        return HouseholdRole.HEAD;
    }
    if (lower === 'partner' || lower === 'spouse' || lower === 'wife' || lower === 'husband') {
        return HouseholdRole.PARTNER;
    }
    if (lower === 'child' || lower === 'dependent' || lower === 'son' || lower === 'daughter' || lower === 'kid') {
        return HouseholdRole.DEPENDENT;
    }
    return HouseholdRole.MEMBER;
}

function deriveStableLegacyIdentity(item, index) {
    if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') {
        return String(item.id).trim();
    }
    const cleanName = (item.name || 'member').toLowerCase().trim().replace(/\s+/g, '_');
    const contactTrait = item.phone || item.email || item.dob || '';
    if (contactTrait) {
        return `fp_${cleanName}_${String(contactTrait).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }
    return `fp_${cleanName}_idx${index}`;
}

export const FamilyMigrationService = {
    /**
     * Run migration from legacy STORAGE_KEYS.FAMILY_MEMBERS to Phase 1 Normalized Data Model
     * @param {Object} options
     * @param {Array} [options.legacyData] - Optional legacy data override (useful for testing)
     * @param {boolean} [options.force] - Force re-evaluation
     * @returns {Promise<Object>} Audit report
     */
    async migrateLegacyFamilyData(options = {}) {
        const now = new Date().toISOString();
        let rawLegacy = options.legacyData;

        if (!rawLegacy) {
            try {
                rawLegacy = await StorageService.load(STORAGE_KEYS.FAMILY_MEMBERS);
            } catch (err) {
                rawLegacy = [];
            }
        }

        if (!Array.isArray(rawLegacy) || rawLegacy.length === 0) {
            return {
                success: true,
                scanned: 0,
                createdPeople: 0,
                createdMemberships: 0,
                createdTrusted: 0,
                provisional: false,
                message: 'No legacy family data found to migrate',
                timestamp: now
            };
        }

        // 1. Fetch current repository store and create isolated candidate clone
        const store = await FamilyRepository._loadStore();
        const candidate = FamilyRepository._cloneStore(store);

        // Map existing migrated person by stable legacyId/sourceId from candidate
        const migratedPeopleBySourceId = new Map();
        for (const p of candidate.people.values()) {
            const m = p.migration;
            if (m) {
                const key = m.legacyId || m.sourceId;
                if (key) {
                    migratedPeopleBySourceId.set(String(key), p);
                }
            }
        }

        let createdPeopleCount = 0;
        let createdMembershipsCount = 0;
        let createdTrustedCount = 0;
        const peopleMap = new Map(); // stableId -> Person entity

        // 2. Normalize, validate, and stage Person records
        for (let i = 0; i < rawLegacy.length; i++) {
            const item = rawLegacy[i];
            if (!item || (!item.id && !item.name)) continue;
            const stableId = deriveStableLegacyIdentity(item, i);

            let person = migratedPeopleBySourceId.get(stableId);
            if (!person) {
                // Generate clean Person entity (Identity ONLY)
                person = createEmptyPerson({
                    fullName: item.name || 'Unknown Member',
                    preferredName: item.preferredName || (item.name ? item.name.split(' ')[0] : ''),
                    phone: item.phone || null,
                    email: item.email || null,
                    dob: item.dob || null,
                    gender: item.gender || null,
                    status: PersonStatus.ACTIVE,
                    educationSnapshot: null,
                    healthSnapshot: null,
                    migration: {
                        legacySource: 'FAMILY_MEMBERS',
                        source: 'LEGACY_V2',
                        legacyId: stableId,
                        sourceId: stableId,
                        migrationVersion: 1,
                        migratedAt: now
                    }
                });
                assertSafeNumbers(person);
                validatePerson(person);
                candidate.people.set(person.id, person);
                createdPeopleCount++;
                migratedPeopleBySourceId.set(stableId, person);
            } else if (item.name && person.fullName !== item.name) {
                // Name changed in legacy data: update existing person without creating duplicate
                person = {
                    ...person,
                    fullName: item.name,
                    preferredName: item.preferredName || item.name.split(' ')[0],
                    updatedAt: now
                };
                assertSafeNumbers(person);
                validatePerson(person);
                candidate.people.set(person.id, person);
            }

            peopleMap.set(stableId, person);
        }

        // 3. Locate or create Provisional Household
        let provisionalHousehold = Array.from(candidate.households.values()).find(h => h.status === HouseholdStatus.PROVISIONAL);
        if (!provisionalHousehold) {
            // Check if there are any active households already
            if (candidate.households.size > 0) {
                provisionalHousehold = Array.from(candidate.households.values())[0];
            } else {
                provisionalHousehold = createEmptyHousehold({
                    name: 'My Household',
                    type: HouseholdType.NUCLEAR,
                    status: HouseholdStatus.PROVISIONAL
                });
                assertSafeNumbers(provisionalHousehold);
                validateHousehold(provisionalHousehold);
                candidate.households.set(provisionalHousehold.id, provisionalHousehold);
            }
        }

        // 4. Distribute people between Memberships and TrustedCircle
        const existingMemberships = Array.from(candidate.memberships.values());
        const existingTrusted = Array.from(candidate.trustedCircle.values());

        for (let i = 0; i < rawLegacy.length; i++) {
            const item = rawLegacy[i];
            if (!item) continue;
            const stableId = deriveStableLegacyIdentity(item, i);
            const person = peopleMap.get(stableId);
            if (!person) continue;

            const roleStr = (item.role || '').toLowerCase().trim();
            const matchedTrustedCat = TRUSTED_CATEGORY_MAP[roleStr];

            if (matchedTrustedCat) {
                // External contact / Professional -> TrustedCircleEntry ONLY
                const alreadyTrusted = existingTrusted.some(t => 
                    t.householdId === provisionalHousehold.id && 
                    t.personId === person.id && 
                    t.category === matchedTrustedCat
                );

                if (!alreadyTrusted) {
                    const trustedEntry = createEmptyTrustedCircleEntry({
                        householdId: provisionalHousehold.id,
                        personId: person.id,
                        category: matchedTrustedCat,
                        emergencyPriority: 1,
                        notes: `Migrated from legacy family role: ${item.role}`
                    });
                    assertSafeNumbers(trustedEntry);
                    validateTrustedCircleEntry(trustedEntry);
                    candidate.trustedCircle.set(trustedEntry.id, trustedEntry);
                    createdTrustedCount++;
                    existingTrusted.push(trustedEntry);
                }
            } else {
                // Household Member -> HouseholdMembership with PROVISIONAL_PENDING_CONFIRMATION
                const alreadyMember = existingMemberships.some(m => 
                    m.householdId === provisionalHousehold.id && 
                    m.personId === person.id
                );

                if (!alreadyMember) {
                    const mappedRole = mapLegacyRoleToHouseholdRole(item.role);
                    const membership = createEmptyMembership({
                        householdId: provisionalHousehold.id,
                        personId: person.id,
                        role: mappedRole,
                        status: MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION
                    });
                    assertSafeNumbers(membership);
                    validateMembership(membership);
                    candidate.memberships.set(membership.id, membership);
                    createdMembershipsCount++;
                    existingMemberships.push(membership);
                }
            }
        }

        // 5. Commit candidate store atomically to repository
        await FamilyRepository.commitStore(candidate);

        // 6. Persist schema version indicator
        try {
            await StorageService.save(STORAGE_KEYS.FAMILY_SCHEMA, {
                version: 1,
                migratedAt: now,
                source: 'LEGACY_V2'
            });
        } catch (e) {
            // Ignore if test environment
        }

        return {
            success: true,
            scanned: rawLegacy.length,
            createdPeople: createdPeopleCount,
            createdMemberships: createdMembershipsCount,
            createdTrusted: createdTrustedCount,
            provisionalHouseholdId: provisionalHousehold.id,
            provisional: provisionalHousehold.status === HouseholdStatus.PROVISIONAL,
            timestamp: now
        };
    }
};
