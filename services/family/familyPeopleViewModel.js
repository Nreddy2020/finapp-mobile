/**
 * FinLife Family People & Relationships View-Model
 * Domain-to-presentation synthesizer for Family Tree, Trusted Circle, and Person Profile.
 * Conforms to FinLife Family Operating System Scope V1 (Phase 2).
 * Enforces presentation safety: 0 raw BigInt, 0 non-finite numbers, immutable defensive cloning.
 */

import {
    CircleCategory,
    FamilyRole,
    PrivacyLevel,
    FamilyStatus,
    PROFILE_SECTION_ID,
    SECTION_STATUS,
    DEFAULT_EMERGENCY_CONFIG,
    calculateAge,
    evaluateContactCapabilities,
    validatePersonContractGroups
} from './familyContracts.js';

import {
    buildFamilyTreeMatrix,
    getPersonConnections,
    getRelationshipsForPerson
} from './familyGraphEngine.js';

/**
 * Deep sanitization helper: converts BigInt to string and ensures finite numbers.
 */
function sanitizePresentationValue(val) {
    if (val === null || val === undefined) return val;
    if (typeof val === 'bigint') return val.toString();
    if (typeof val === 'number') {
        if (!Number.isFinite(val)) return 0;
        return val;
    }
    if (Array.isArray(val)) {
        return val.map(sanitizePresentationValue);
    }
    if (typeof val === 'object') {
        const res = {};
        for (const [k, v] of Object.entries(val)) {
            res[k] = sanitizePresentationValue(v);
        }
        return res;
    }
    return val;
}

export const FamilyPeopleViewModel = {
    /**
     * Synthesizes Family Tree presentation model.
     */
    buildFamilyTreeViewModel(persons = [], edges = [], activeHousehold = null) {
        const matrix = buildFamilyTreeMatrix(persons, edges);
        const activePersons = persons.filter(p => {
            const stat = p.core?.status || p.status;
            return stat !== FamilyStatus.ARCHIVED && stat !== FamilyStatus.INACTIVE && stat !== FamilyStatus.DELETED;
        });

        const formattedTiers = matrix.tiers.map(tier => ({
            id: tier.id,
            label: tier.label,
            generation: tier.generation,
            count: tier.members.length,
            members: tier.members.map(p => {
                const pId = p.core?.id || p.id;
                const name = p.core?.name || p.name || 'Member';
                const role = p.core?.role || p.role || FamilyRole.MEMBER;
                const blood = p.profile?.bloodGroup || p.medicalProfile?.bloodGroup;
                const isEmergency = Boolean(p.emergencyProfile?.isEmergencyContact || p.isEmergencyContact);
                const priority = p.emergencyProfile?.priorityOrder || 1;
                const isNominee = Boolean(p.legalTags?.isNominee || role === FamilyRole.NOMINEE);
                const isDependent = Boolean(p.isDependent || role === FamilyRole.DEPENDENT);
                const color = p.core?.color || '#3B82F6';

                return {
                    id: pId,
                    name,
                    role,
                    color,
                    avatarInitials: name.charAt(0).toUpperCase(),
                    bloodGroup: blood && blood !== '—' ? blood : null,
                    isEmergency,
                    emergencyPriority: isEmergency ? priority : null,
                    isNominee,
                    isDependent,
                    householdId: p.householdId || p.core?.householdId || 'household_primary'
                };
            })
        }));

        const vm = {
            state: activePersons.length > 0 ? SECTION_STATUS.AVAILABLE : SECTION_STATUS.EMPTY,
            tiers: formattedTiers,
            stats: {
                eldersCount: matrix.stats.eldersCount,
                adultsCount: matrix.stats.adultsCount,
                childrenCount: matrix.stats.childrenCount,
                othersCount: matrix.stats.othersCount,
                generationsRepresented: matrix.stats.generationsRepresented,
                totalMembers: matrix.stats.totalMembers,
                totalRelationships: matrix.stats.totalRelationships
            },
            activeHouseholdName: activeHousehold?.name || 'Primary Household',
            totalMembers: activePersons.length
        };

        return sanitizePresentationValue(vm);
    },

    /**
     * Synthesizes Trusted Circle presentation model with search, emergency ranking, and capabilities.
     */
    buildTrustedCircleViewModel(persons = [], selectedCategory = CircleCategory.FAMILY, searchQuery = '') {
        const query = String(searchQuery || '').toLowerCase().trim();
        const activePersons = persons.filter(p => {
            const stat = p.core?.status || p.status;
            return stat !== FamilyStatus.ARCHIVED && stat !== FamilyStatus.INACTIVE && stat !== FamilyStatus.DELETED;
        });

        // Category counts
        const familyCount = activePersons.filter(p => {
            const cat = p.core?.circleCategory || p.circleCategory || CircleCategory.FAMILY;
            return cat === CircleCategory.FAMILY;
        }).length;

        const friendsCount = activePersons.filter(p => {
            const cat = p.core?.circleCategory || p.circleCategory;
            return cat === CircleCategory.FRIENDS;
        }).length;

        const othersCount = activePersons.filter(p => {
            const cat = p.core?.circleCategory || p.circleCategory;
            return cat === CircleCategory.OTHERS || cat === CircleCategory.PROFESSIONAL || cat === CircleCategory.TRUSTED_CIRCLE;
        }).length;

        // Filter by category
        let categoryPersons = activePersons.filter(p => {
            const cat = p.core?.circleCategory || p.circleCategory || CircleCategory.FAMILY;
            if (selectedCategory === CircleCategory.OTHERS) {
                return cat === CircleCategory.OTHERS || cat === CircleCategory.PROFESSIONAL || cat === CircleCategory.TRUSTED_CIRCLE;
            }
            return cat === selectedCategory;
        });

        // Apply search query
        if (query) {
            categoryPersons = categoryPersons.filter(p => {
                const name = (p.core?.name || p.name || '').toLowerCase();
                const preferred = (p.preferredName || p.core?.preferredName || '').toLowerCase();
                const role = (p.core?.role || p.role || '').toLowerCase();
                const occupation = (p.profile?.occupation || '').toLowerCase();
                const phone = (p.contact?.phone || '').toLowerCase();
                return name.includes(query) || preferred.includes(query) || role.includes(query) || occupation.includes(query) || phone.includes(query);
            });
        }

        // Sort: Emergency contacts first by priorityOrder ascending, then alphabetically by name
        categoryPersons.sort((a, b) => {
            const aEm = a.emergencyProfile?.isEmergencyContact || a.isEmergencyContact;
            const bEm = b.emergencyProfile?.isEmergencyContact || b.isEmergencyContact;
            if (aEm && !bEm) return -1;
            if (!aEm && bEm) return 1;
            if (aEm && bEm) {
                const aPrio = a.emergencyProfile?.priorityOrder || 5;
                const bPrio = b.emergencyProfile?.priorityOrder || 5;
                if (aPrio !== bPrio) return aPrio - bPrio;
            }
            const nameA = a.core?.name || a.name || '';
            const nameB = b.core?.name || b.name || '';
            return nameA.localeCompare(nameB);
        });

        const contacts = categoryPersons.map(p => {
            const pId = p.core?.id || p.id;
            const name = p.core?.name || p.name || 'Contact';
            const role = p.core?.role || p.role || FamilyRole.MEMBER;
            const isEmergency = Boolean(p.emergencyProfile?.isEmergencyContact || p.isEmergencyContact);
            const priority = p.emergencyProfile?.priorityOrder || 1;
            const capabilities = evaluateContactCapabilities(p);
            const color = p.core?.color || '#3B82F6';

            return {
                id: pId,
                name,
                preferredName: p.preferredName || p.core?.preferredName || null,
                role,
                occupation: p.profile?.occupation || null,
                employer: p.profile?.employer || null,
                color,
                avatarInitials: name.charAt(0).toUpperCase(),
                phone: capabilities.canViewContact ? (p.contact?.phone || null) : 'Protected',
                email: capabilities.canViewContact ? (p.contact?.email || null) : 'Protected',
                address: p.contact?.address || null,
                isEmergency,
                emergencyPriority: isEmergency ? priority : null,
                isNominee: Boolean(p.legalTags?.isNominee || role === FamilyRole.NOMINEE),
                isGuardian: Boolean(p.isGuardian || p.core?.isGuardian || role === FamilyRole.GUARDIAN),
                isDependent: Boolean(p.isDependent || p.core?.isDependent),
                bloodGroup: p.profile?.bloodGroup || p.medicalProfile?.bloodGroup || null,
                privacyLevel: p.privacy?.visibility || PrivacyLevel.FAMILY_ONLY,
                capabilities
            };
        });

        const vm = {
            state: contacts.length > 0 ? SECTION_STATUS.AVAILABLE : SECTION_STATUS.EMPTY,
            selectedCategory,
            counts: {
                family: familyCount,
                friends: friendsCount,
                others: othersCount,
                total: activePersons.length
            },
            searchQuery: query,
            contacts
        };

        return sanitizePresentationValue(vm);
    },

    /**
     * Synthesizes comprehensive Person Profile with 10 stable section IDs.
     */
    buildPersonProfileViewModel(person, connections = {}, household = null) {
        if (!person) return null;

        const pId = person.core?.id || person.id;
        const name = person.core?.name || person.name || 'Family Member';
        const role = person.core?.role || person.role || FamilyRole.MEMBER;
        const category = person.core?.circleCategory || person.circleCategory || CircleCategory.FAMILY;
        const dob = person.core?.dateOfBirth || person.dateOfBirth;
        const age = calculateAge(dob);
        const contactCaps = evaluateContactCapabilities(person);
        const groupsValidation = validatePersonContractGroups(person);

        // Masked national identifier: labeled "Protected identifier"
        const rawMasked = person.nationalIdMasked || person.core?.nationalIdMasked;
        const maskedIdDisplay = rawMasked ? rawMasked : null;

        const sections = [
            // 1. Identity & Demographics
            {
                id: PROFILE_SECTION_ID.IDENTITY,
                title: 'Identity & Demographics',
                status: dob ? SECTION_STATUS.AVAILABLE : SECTION_STATUS.PARTIAL,
                data: {
                    id: pId,
                    legalName: name,
                    preferredName: person.preferredName || person.core?.preferredName || null,
                    gender: person.core?.gender || person.gender || 'UNSPECIFIED',
                    dateOfBirth: dob || null,
                    age: age !== null ? `${age} yrs` : null,
                    nationalIdMasked: maskedIdDisplay,
                    nationalIdLabel: 'Protected identifier',
                    isProtected: Boolean(maskedIdDisplay)
                },
                missingFields: dob ? [] : ['dateOfBirth']
            },

            // 2. Functional Role
            {
                id: PROFILE_SECTION_ID.ROLE,
                title: 'Role & Responsibility',
                status: SECTION_STATUS.AVAILABLE,
                data: {
                    role,
                    familyRole: person.familyRole || role,
                    isHead: role === FamilyRole.HEAD,
                    isSpouse: role === FamilyRole.SPOUSE,
                    isChild: role === FamilyRole.CHILD,
                    isParent: role === FamilyRole.PARENT,
                    isGuardian: Boolean(person.isGuardian || person.core?.isGuardian || role === FamilyRole.GUARDIAN),
                    isDependent: Boolean(person.isDependent || person.core?.isDependent || role === FamilyRole.DEPENDENT)
                }
            },

            // 3. Circle Category
            {
                id: PROFILE_SECTION_ID.CATEGORY,
                title: 'Circle Classification',
                status: SECTION_STATUS.AVAILABLE,
                data: {
                    circleCategory: category,
                    relationshipCategory: person.relationshipCategory || category,
                    isFamilyCircle: category === CircleCategory.FAMILY
                }
            },

            // 4. Contact & Communications
            {
                id: PROFILE_SECTION_ID.CONTACT,
                title: 'Contact Details',
                status: (person.contact?.phone || person.contact?.email) ? SECTION_STATUS.AVAILABLE : SECTION_STATUS.EMPTY,
                data: {
                    phone: contactCaps.canViewContact ? (person.contact?.phone || null) : 'Protected by Privacy Settings',
                    email: contactCaps.canViewContact ? (person.contact?.email || null) : 'Protected by Privacy Settings',
                    address: person.contact?.address || null,
                    isSharedAddress: Boolean(person.contact?.isSharedAddress),
                    capabilities: contactCaps
                },
                missingFields: [
                    !person.contact?.phone && 'phone',
                    !person.contact?.email && 'email'
                ].filter(Boolean)
            },

            // 5. Household Association
            {
                id: PROFILE_SECTION_ID.HOUSEHOLD,
                title: 'Household & Residence',
                status: household ? SECTION_STATUS.AVAILABLE : SECTION_STATUS.PARTIAL,
                data: {
                    householdId: household?.id || person.householdId || person.core?.householdId || 'household_primary',
                    householdName: household?.name || 'Primary Household',
                    isPrimaryHousehold: Boolean(household?.isPrimary),
                    coHabitants: connections.householdCoHabitants || []
                }
            },

            // 6. Direct Relationships & Reciprocals
            {
                id: PROFILE_SECTION_ID.RELATIONSHIPS,
                title: 'Relationships & Connections',
                status: (connections.directRelationships?.length > 0) ? SECTION_STATUS.AVAILABLE : SECTION_STATUS.EMPTY,
                data: {
                    count: connections.directRelationships?.length || 0,
                    relationships: connections.directRelationships || []
                }
            },

            // 7. Medical & Emergency Profile
            {
                id: PROFILE_SECTION_ID.MEDICAL_EMERGENCY,
                title: 'Medical & Emergency Protocol',
                status: (person.profile?.bloodGroup || person.medicalProfile?.bloodGroup || person.emergencyProfile?.isEmergencyContact) ?
                    SECTION_STATUS.AVAILABLE : SECTION_STATUS.NOT_CONFIGURED,
                data: {
                    bloodGroup: person.profile?.bloodGroup || person.medicalProfile?.bloodGroup || null,
                    isEmergencyContact: Boolean(person.emergencyProfile?.isEmergencyContact || person.isEmergencyContact),
                    emergencyPriority: person.emergencyProfile?.priorityOrder || null,
                    reachable24x7: Boolean(person.emergencyProfile?.reachable24x7),
                    allergies: person.medicalProfile?.allergies || [],
                    chronicConditions: person.medicalProfile?.chronicConditions || [],
                    emergencyNotes: person.medicalProfile?.emergencyNotes || person.emergencyProfile?.notes || null
                },
                missingFields: [
                    !(person.profile?.bloodGroup || person.medicalProfile?.bloodGroup) && 'bloodGroup',
                    !(person.medicalProfile?.allergies?.length) && 'allergies'
                ].filter(Boolean)
            },

            // 8. Governance & Legal Tags
            {
                id: PROFILE_SECTION_ID.GOVERNANCE_LEGAL,
                title: 'Governance & Legal Designation',
                status: (person.legalTags?.isNominee || person.legalTags?.willBeneficiary || person.legalTags?.poaDesignated) ?
                    SECTION_STATUS.AVAILABLE : SECTION_STATUS.EMPTY,
                data: {
                    isNominee: Boolean(person.legalTags?.isNominee || role === FamilyRole.NOMINEE),
                    willBeneficiary: Boolean(person.legalTags?.willBeneficiary),
                    poaDesignated: Boolean(person.legalTags?.poaDesignated)
                }
            },

            // 9. Dependency Status
            {
                id: PROFILE_SECTION_ID.DEPENDENCY,
                title: 'Dependency Status',
                status: SECTION_STATUS.AVAILABLE,
                data: {
                    isDependent: Boolean(person.isDependent || person.core?.isDependent),
                    dependencyType: (person.isDependent || person.core?.isDependent) ? 'FINANCIAL' : 'NONE'
                }
            },

            // 10. Privacy & Data Protection
            {
                id: PROFILE_SECTION_ID.PRIVACY,
                title: 'Privacy & Permissions',
                status: SECTION_STATUS.AVAILABLE,
                data: {
                    visibility: person.privacy?.visibility || PrivacyLevel.FAMILY_ONLY,
                    accessScope: person.privacy?.accessScope || 'STANDARD',
                    lastAccessedAt: person.privacy?.lastAccessedAt || null
                }
            },

            // 11. Lifecycle Audit
            {
                id: PROFILE_SECTION_ID.LIFECYCLE,
                title: 'Lifecycle & Record Audit',
                status: SECTION_STATUS.AVAILABLE,
                data: {
                    status: person.core?.status || person.status || FamilyStatus.ACTIVE,
                    createdAt: person.core?.createdAt || null,
                    updatedAt: person.core?.updatedAt || null,
                    contractGroupsSatisfied: groupsValidation.isValid
                }
            }
        ];

        const vm = {
            id: pId,
            name,
            preferredName: person.preferredName || person.core?.preferredName || null,
            role,
            circleCategory: category,
            color: person.core?.color || '#3B82F6',
            avatarInitials: name.charAt(0).toUpperCase(),
            householdId: household?.id || person.householdId || person.core?.householdId || 'household_primary',
            householdName: household?.name || 'Primary Household',
            sections,
            contractGroups: groupsValidation
        };

        return sanitizePresentationValue(vm);
    }
};
