/**
 * FinLife Family Contracts & Schemas
 * Authoritative schemas, bounded sub-models, enums, and state contracts.
 * Conforms to FinLife Family Operating System Functional Scope V1.
 */

export const DEFAULT_EMERGENCY_CONFIG = Object.freeze({
    countryCode: 'IN',
    emergencyServices: [
        {
            id: 'national',
            label: 'National Emergency',
            number: '112',
            category: 'NATIONAL'
        },
        {
            id: 'ambulance',
            label: 'Ambulance',
            number: '102',
            category: 'MEDICAL'
        },
        {
            id: 'police',
            label: 'Police',
            number: '100',
            category: 'POLICE'
        }
    ]
});

export const RelationshipValidationResult = Object.freeze({
    VALID: 'VALID',
    SELF_LINK: 'SELF_LINK',
    DUPLICATE_RELATIONSHIP: 'DUPLICATE_RELATIONSHIP',
    RECIPROCAL_CONFLICT: 'RECIPROCAL_CONFLICT',
    ANCESTOR_CYCLE: 'ANCESTOR_CYCLE',
    INVALID_RELATIONSHIP_TYPE: 'INVALID_RELATIONSHIP_TYPE'
});

export const PROFILE_SECTION_ID = Object.freeze({
    IDENTITY: 'identity',
    ROLE: 'role',
    CATEGORY: 'category',
    CONTACT: 'contact',
    HOUSEHOLD: 'household',
    RELATIONSHIPS: 'relationships',
    MEDICAL_EMERGENCY: 'medicalEmergency',
    GOVERNANCE_LEGAL: 'governanceLegal',
    DEPENDENCY: 'dependency',
    PRIVACY: 'privacy',
    LIFECYCLE: 'lifecycle'
});

export const SECTION_STATUS = Object.freeze({
    AVAILABLE: 'AVAILABLE',
    EMPTY: 'EMPTY',
    PARTIAL: 'PARTIAL',
    UNAVAILABLE: 'UNAVAILABLE',
    NOT_CONFIGURED: 'NOT_CONFIGURED',
    ERROR: 'ERROR'
});

export const DependencyType = Object.freeze({
    FINANCIAL: 'FINANCIAL',
    MEDICAL: 'MEDICAL',
    EDUCATIONAL: 'EDUCATIONAL',
    CARE: 'CARE',
    NONE: 'NONE'
});

export const DASHBOARD_STATE = Object.freeze({
    LOADING: 'LOADING',
    NOT_CONFIGURED: 'NOT_CONFIGURED',
    EMPTY: 'EMPTY',
    AVAILABLE: 'AVAILABLE',
    PARTIAL: 'PARTIAL',
    UNAVAILABLE: 'UNAVAILABLE',
    NEEDS_REVIEW: 'NEEDS_REVIEW',
    ERROR: 'ERROR'
});

export const RelationshipType = Object.freeze({
    SPOUSE_OF: 'SPOUSE_OF',
    CHILD_OF: 'CHILD_OF',
    PARENT_OF: 'PARENT_OF',
    SIBLING_OF: 'SIBLING_OF',
    GRANDPARENT_OF: 'GRANDPARENT_OF',
    GRANDCHILD_OF: 'GRANDCHILD_OF',
    GUARDIAN_OF: 'GUARDIAN_OF',
    WARD_OF: 'WARD_OF',
    FRIEND_OF: 'FRIEND_OF',
    CARE_PROVIDER_FOR: 'CARE_PROVIDER_FOR',
    CARE_RECEIVER_FROM: 'CARE_RECEIVER_FROM',
    DEPENDENT_OF: 'DEPENDENT_OF',
    PROVIDER_FOR: 'PROVIDER_FOR',
    DOCTOR_OF: 'DOCTOR_OF',
    PATIENT_OF: 'PATIENT_OF',
    ADVISOR_OF: 'ADVISOR_OF',
    CLIENT_OF: 'CLIENT_OF',
    TEACHER_OF: 'TEACHER_OF',
    STUDENT_OF: 'STUDENT_OF',
    OTHER: 'OTHER'
});

export const HIERARCHICAL_RELATIONSHIPS = Object.freeze([
    RelationshipType.PARENT_OF,
    RelationshipType.CHILD_OF,
    RelationshipType.GUARDIAN_OF,
    RelationshipType.WARD_OF,
    RelationshipType.DEPENDENT_OF,
    RelationshipType.PROVIDER_FOR,
    RelationshipType.CARE_PROVIDER_FOR,
    RelationshipType.CARE_RECEIVER_FROM
]);

export const CircleCategory = Object.freeze({
    FAMILY: 'FAMILY',
    TRUSTED_CIRCLE: 'TRUSTED_CIRCLE',
    PROFESSIONAL: 'PROFESSIONAL',
    FRIENDS: 'FRIENDS',
    OTHERS: 'OTHERS'
});

export const PrivacyLevel = Object.freeze({
    PUBLIC: 'PUBLIC',
    PRIVATE: 'PRIVATE',
    RESTRICTED: 'RESTRICTED',
    CONFIDENTIAL: 'CONFIDENTIAL',
    OWNER_ONLY: 'OWNER_ONLY',
    FAMILY_ONLY: 'FAMILY_ONLY',
    SELECTED_MEMBERS: 'SELECTED_MEMBERS',
    EMERGENCY_ONLY: 'EMERGENCY_ONLY',
    CARE_TEAM_ONLY: 'CARE_TEAM_ONLY'
});

export const FamilyRole = Object.freeze({
    HEAD: 'HEAD',
    SPOUSE: 'SPOUSE',
    CHILD: 'CHILD',
    PARENT: 'PARENT',
    GRANDPARENT: 'GRANDPARENT',
    SIBLING: 'SIBLING',
    RELATIVE: 'RELATIVE',
    GUARDIAN: 'GUARDIAN',
    DEPENDENT: 'DEPENDENT',
    CAREGIVER: 'CAREGIVER',
    DOCTOR: 'DOCTOR',
    ADVISOR: 'ADVISOR',
    TEACHER: 'TEACHER',
    NOMINEE: 'NOMINEE',
    EMERGENCY_CONTACT: 'EMERGENCY_CONTACT',
    MEMBER: 'MEMBER',
    OTHER: 'OTHER'
});

export const FamilyStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    ARCHIVED: 'ARCHIVED',
    DELETED: 'DELETED'
});

export const PolicyType = Object.freeze({
    TERM_LIFE: 'TERM_LIFE',
    HEALTH: 'HEALTH',
    CRITICAL_ILLNESS: 'CRITICAL_ILLNESS',
    ACCIDENTAL: 'ACCIDENTAL',
    VEHICLE: 'VEHICLE',
    HOME: 'HOME',
    OTHER: 'OTHER'
});

export const PolicyStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    EXPIRING_SOON: 'EXPIRING_SOON',
    EXPIRED: 'EXPIRED',
    PENDING_RENEWAL: 'PENDING_RENEWAL',
    LAPSED: 'LAPSED'
});

export const ResponsibilityCategory = Object.freeze({
    EDUCATION: 'EDUCATION',
    HEALTHCARE: 'HEALTHCARE',
    CHORES: 'CHORES',
    CARE: 'CARE',
    LEGAL: 'LEGAL',
    FINANCIAL: 'FINANCIAL',
    HOME: 'HOME',
    OTHER: 'OTHER'
});

export const ResponsibilityPriority = Object.freeze({
    URGENT: 'URGENT',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
});

export const ResponsibilityStatus = Object.freeze({
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    OVERDUE: 'OVERDUE'
});

export const CareHealthStatus = Object.freeze({
    GOOD: 'GOOD',
    MONITORING: 'MONITORING',
    CRITICAL: 'CRITICAL',
    ATTENTION_NEEDED: 'ATTENTION_NEEDED',
    STABLE: 'STABLE'
});

export const FinancialLinkStatus = Object.freeze({
    LINKED_VERIFIED: 'LINKED_VERIFIED',
    LINKED_UNVERIFIED: 'LINKED_UNVERIFIED',
    UNLINKED: 'UNLINKED',
    SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE'
});

export const DataAvailabilityState = Object.freeze({
    AVAILABLE: 'AVAILABLE',
    EMPTY: 'EMPTY',
    NOT_CONFIGURED: 'NOT_CONFIGURED',
    PARTIAL: 'PARTIAL',
    UNAVAILABLE: 'UNAVAILABLE',
    ATTENTION_REQUIRED: 'ATTENTION_REQUIRED'
});

export const EMERGENCY_READINESS_ITEMS = Object.freeze([
    { id: 'PRIMARY_CONTACT', label: 'Primary Emergency Contact Designated', weight: 1 },
    { id: 'SECONDARY_CONTACT', label: 'Secondary Emergency Contact Designated', weight: 1 },
    { id: 'BLOOD_GROUPS', label: 'Blood Group Documented for Primary Members', weight: 1 },
    { id: 'DOCTOR_CONTACT', label: 'Emergency Doctor / Hospital Contact Configured', weight: 1 },
    { id: 'HEALTH_INSURANCE', label: 'Active Health Insurance Coverage in Place', weight: 1 },
    { id: 'LIFE_INSURANCE', label: 'Active Term Life Coverage for Income Earners', weight: 1 },
    { id: 'CRITICAL_ALLERGIES', label: 'Critical Care / Allergy Records Updated', weight: 1 },
    { id: 'ESSENTIAL_DOCS', label: 'Essential Family Documents Available / Tagged', weight: 1 },
    { id: 'EMERGENCY_RESERVE', label: 'Emergency Liquidity Reserve >= 3 Months', weight: 1 }
]);

/**
 * Safely masks a sensitive identifier.
 * Input-level protection: Rejects oversized/invalid inputs and never returns or persists raw identifiers.
 */
export function maskSensitiveIdentifier(str = '', visibleTrailing = 4) {
    if (str === null || str === undefined) return '—';
    const s = String(str).trim();
    if (!s || s === 'null' || s === 'undefined') return '—';
    if (s.length > 50) return '—'; // Reject oversized input
    if (s.startsWith('••••')) return s; // Already masked
    if (s.length <= visibleTrailing) return s;
    const trailing = s.slice(-visibleTrailing);
    return `•••• ${trailing}`;
}

/**
 * Calculates accurate age from an ISO date string (YYYY-MM-DD).
 */
export function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
        age--;
    }
    return Math.max(0, age);
}

/**
 * Evaluates contact actions based on PrivacyLevel and contact availability.
 * Separates capability eligibility from physical data availability.
 */
export function evaluateContactCapabilities(person) {
    const privacy = person?.privacy?.visibility || person?.visibility || PrivacyLevel.FAMILY_ONLY;
    const phone = (person?.contact?.phone || '').trim();
    const email = (person?.contact?.email || '').trim();

    const hasPhone = Boolean(phone);
    const hasEmail = Boolean(email);

    if (privacy === PrivacyLevel.RESTRICTED || privacy === PrivacyLevel.PRIVATE) {
        return {
            canViewContact: false,
            canCall: false,
            canSms: false,
            canEmail: false,
            contactBlockedReason: 'Restricted privacy level requires explicit administrator authorization.'
        };
    }

    if (privacy === PrivacyLevel.CONFIDENTIAL || privacy === PrivacyLevel.OWNER_ONLY) {
        return {
            canViewContact: true,
            canCall: hasPhone,
            canSms: false,
            canEmail: false,
            contactBlockedReason: hasPhone ? null : 'No phone number on file.'
        };
    }

    // FAMILY_ONLY, SELECTED_MEMBERS, EMERGENCY_ONLY, or standard
    return {
        canViewContact: true,
        canCall: hasPhone,
        canSms: hasPhone,
        canEmail: hasEmail,
        contactBlockedReason: null
    };
}

/**
 * Validates that a Person entity satisfies the 10 contract groups.
 */
export function validatePersonContractGroups(person) {
    if (!person || typeof person !== 'object') {
        return { isValid: false, missingGroups: ['root'], groupsVerified: {} };
    }
    const checks = {
        identity: Boolean(person.id && (person.name || person.core?.name)),
        role: Boolean(person.role || person.familyRole || person.core?.role),
        category: Boolean(person.circleCategory || person.relationshipCategory || person.core?.circleCategory),
        contact: Boolean(person.contact && typeof person.contact === 'object'),
        household: Boolean(person.householdId || person.core?.householdId),
        medical: Boolean((person.medicalProfile && typeof person.medicalProfile === 'object') || (person.profile && typeof person.profile === 'object')),
        legal: Boolean(person.legalTags && typeof person.legalTags === 'object'),
        dependency: typeof person.isDependent === 'boolean',
        privacy: Boolean(person.privacy && typeof person.privacy === 'object'),
        lifecycle: Boolean(person.status || person.core?.status)
    };

    const missingGroups = Object.keys(checks).filter(k => !checks[k]);
    return {
        isValid: missingGroups.length === 0,
        missingGroups,
        groupsVerified: checks
    };
}

export function createFinancialReference({
    sourceType = '',
    sourceRecordId = '',
    sourceDomain = '',
    linkStatus = FinancialLinkStatus.UNLINKED,
    lastVerifiedAt = null,
    label = '',
    notes = ''
} = {}) {
    return {
        sourceType: String(sourceType || ''),
        sourceRecordId: String(sourceRecordId || ''),
        sourceDomain: String(sourceDomain || ''),
        linkStatus: Object.values(FinancialLinkStatus).includes(linkStatus) ? linkStatus : FinancialLinkStatus.UNLINKED,
        lastVerifiedAt: lastVerifiedAt ? String(lastVerifiedAt) : null,
        label: String(label || ''),
        notes: String(notes || '')
    };
}

/**
 * Creates an authoritative Person entity conforming to Family OS V1.
 * Supports contract groups: identity, contact, role, category, household, dependency, medical, legal, privacy, and emergency.
 */
export function createPerson({
    id = '',
    name = '',
    preferredName = '',
    gender = 'UNSPECIFIED',
    dateOfBirth = null,
    circleCategory = CircleCategory.FAMILY,
    relationshipCategory = null,
    role = FamilyRole.MEMBER,
    familyRole = null,
    status = FamilyStatus.ACTIVE,
    avatarUrl = null,
    color = '#10B981',
    householdId = 'household_primary',
    isDependent = false,
    isGuardian = false,
    nationalIdMasked = null,
    contact = {},
    profile = {},
    privacy = {},
    medicalProfile = {},
    emergencyProfile = {},
    legalTags = {}
} = {}) {
    const personId = String(id || `person_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
    const now = new Date().toISOString();

    const normalizedRole = familyRole || role || FamilyRole.MEMBER;
    const finalRole = Object.values(FamilyRole).includes(normalizedRole) ? normalizedRole : FamilyRole.MEMBER;

    const normalizedCategory = relationshipCategory || circleCategory || CircleCategory.FAMILY;
    const finalCategory = Object.values(CircleCategory).includes(normalizedCategory) ? normalizedCategory : CircleCategory.FAMILY;

    let finalMaskedId = null;
    if (nationalIdMasked) {
        finalMaskedId = maskSensitiveIdentifier(nationalIdMasked, 4);
    }

    const personObj = {
        // Top-level convenience properties
        id: personId,
        name: String(name || '').trim(),
        preferredName: String(preferredName || '').trim(),
        role: finalRole,
        familyRole: finalRole,
        circleCategory: finalCategory,
        relationshipCategory: finalCategory,
        status: Object.values(FamilyStatus).includes(status) ? status : FamilyStatus.ACTIVE,
        householdId: String(householdId || 'household_primary'),
        isDependent: Boolean(isDependent || finalRole === FamilyRole.DEPENDENT || finalRole === FamilyRole.CHILD),
        isGuardian: Boolean(isGuardian || finalRole === FamilyRole.GUARDIAN),
        nationalIdMasked: finalMaskedId,

        // Canonical contract groups
        core: {
            id: personId,
            name: String(name || '').trim(),
            preferredName: String(preferredName || '').trim(),
            gender: String(gender || 'UNSPECIFIED'),
            dateOfBirth: dateOfBirth ? String(dateOfBirth) : null,
            circleCategory: finalCategory,
            relationshipCategory: finalCategory,
            role: finalRole,
            familyRole: finalRole,
            status: Object.values(FamilyStatus).includes(status) ? status : FamilyStatus.ACTIVE,
            avatarUrl: avatarUrl ? String(avatarUrl) : null,
            color: String(color || '#10B981'),
            householdId: String(householdId || 'household_primary'),
            isDependent: Boolean(isDependent || finalRole === FamilyRole.DEPENDENT || finalRole === FamilyRole.CHILD),
            isGuardian: Boolean(isGuardian || finalRole === FamilyRole.GUARDIAN),
            nationalIdMasked: finalMaskedId,
            createdAt: now,
            updatedAt: now
        },
        contact: {
            phone: String(contact.phone || ''),
            email: String(contact.email || ''),
            address: String(contact.address || ''),
            isSharedAddress: Boolean(contact.isSharedAddress)
        },
        profile: {
            occupation: String(profile.occupation || ''),
            employer: String(profile.employer || ''),
            bloodGroup: String(profile.bloodGroup || medicalProfile.bloodGroup || '').toUpperCase().trim(),
            notes: String(profile.notes || '')
        },
        privacy: {
            visibility: Object.values(PrivacyLevel).includes(privacy.visibility) ? privacy.visibility : PrivacyLevel.FAMILY_ONLY,
            accessScope: privacy.accessScope ? String(privacy.accessScope) : 'STANDARD',
            allowedMemberIds: Array.isArray(privacy.allowedMemberIds) ? privacy.allowedMemberIds.map(String) : [],
            createdBy: String(privacy.createdBy || 'user_primary'),
            updatedBy: String(privacy.updatedBy || 'user_primary'),
            lastAccessedAt: privacy.lastAccessedAt ? String(privacy.lastAccessedAt) : now
        },
        medicalProfile: {
            bloodGroup: String(medicalProfile.bloodGroup || profile.bloodGroup || '').toUpperCase().trim(),
            allergies: Array.isArray(medicalProfile.allergies) ? medicalProfile.allergies.map(String) : [],
            chronicConditions: Array.isArray(medicalProfile.chronicConditions) ? medicalProfile.chronicConditions.map(String) : [],
            medications: Array.isArray(medicalProfile.medications) ? medicalProfile.medications.map(String) : [],
            doctorIds: Array.isArray(medicalProfile.doctorIds) ? medicalProfile.doctorIds.map(String) : [],
            insurancePolicyIds: Array.isArray(medicalProfile.insurancePolicyIds) ? medicalProfile.insurancePolicyIds.map(String) : [],
            primaryDoctorName: String(medicalProfile.primaryDoctorName || ''),
            primaryDoctorPhone: String(medicalProfile.primaryDoctorPhone || ''),
            hospitalAffiliation: String(medicalProfile.hospitalAffiliation || ''),
            notes: String(medicalProfile.notes || ''),
            emergencyNotes: String(medicalProfile.emergencyNotes || '')
        },
        emergencyProfile: {
            isEmergencyContact: Boolean(emergencyProfile.isEmergencyContact || finalRole === FamilyRole.EMERGENCY_CONTACT),
            priorityOrder: Number.isFinite(emergencyProfile.priorityOrder) ? Math.max(1, Math.min(5, Number(emergencyProfile.priorityOrder))) : 1,
            reachable24x7: Boolean(emergencyProfile.reachable24x7),
            notes: String(emergencyProfile.notes || '')
        },
        legalTags: {
            isNominee: Boolean(legalTags.isNominee || finalRole === FamilyRole.NOMINEE),
            willBeneficiary: Boolean(legalTags.willBeneficiary),
            poaDesignated: Boolean(legalTags.poaDesignated)
        }
    };

    return personObj;
}

/**
 * Creates an authoritative Relationship entity.
 */
export function createRelationship({
    id = '',
    fromPersonId = '',
    toPersonId = '',
    personAId = '',
    personBId = '',
    relationshipType = RelationshipType.OTHER,
    sinceDate = null,
    householdId = 'household_primary',
    isCareResponsibility = false,
    isFinancialDependency = false,
    emergencyPriority = 1,
    privacyLevel = PrivacyLevel.FAMILY_ONLY,
    notes = ''
} = {}) {
    const srcA = fromPersonId || personAId;
    const srcB = toPersonId || personBId;
    const relId = String(id || `rel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);

    const validPriority = Number.isFinite(emergencyPriority) ? Math.max(1, Math.min(5, Number(emergencyPriority))) : 1;

    return {
        id: relId,
        fromPersonId: String(srcA || ''),
        toPersonId: String(srcB || ''),
        personAId: String(srcA || ''),
        personBId: String(srcB || ''),
        relationshipType: Object.values(RelationshipType).includes(relationshipType) ? relationshipType : RelationshipType.OTHER,
        sinceDate: sinceDate ? String(sinceDate) : new Date().toISOString().split('T')[0],
        householdId: String(householdId || 'household_primary'),
        isCareResponsibility: Boolean(isCareResponsibility),
        isFinancialDependency: Boolean(isFinancialDependency),
        emergencyPriority: validPriority,
        privacyLevel: Object.values(PrivacyLevel).includes(privacyLevel) ? privacyLevel : PrivacyLevel.FAMILY_ONLY,
        notes: String(notes || ''),
        createdAt: new Date().toISOString()
    };
}

/**
 * Creates an authoritative Household entity.
 */
export function createHousehold({
    id = '',
    name = 'Primary Household',
    headPersonId = null,
    memberPersonIds = [],
    isPrimary = true,
    status = 'ACTIVE'
} = {}) {
    const householdId = String(id || `hh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
    return {
        id: householdId,
        name: String(name || 'Primary Household').trim(),
        headPersonId: headPersonId ? String(headPersonId) : null,
        memberPersonIds: Array.from(new Set(Array.isArray(memberPersonIds) ? memberPersonIds.map(String) : [])),
        isPrimary: Boolean(isPrimary),
        status: status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Creates a sanitized, append-only, and idempotent Family Activity Log entry.
 * Conforms to Phase 2 audit requirements: No raw national IDs or raw PII in logs.
 */
export function createActivityRecord({
    id = '',
    eventId = null,
    actionType = '',
    eventType = null,
    description = '',
    redactedChangeSummary = null,
    actorPersonId = null,
    actorId = null,
    subjectPersonId = null,
    entityType = 'PERSON',
    entityId = null,
    sourceDomain = 'FAMILY',
    sourceRecordId = null,
    metadata = {},
    schemaVersion = 1,
    idempotencyKey = null,
    createdAt = null,
    occurredAt = null
} = {}) {
    const actId = String(id || eventId || `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
    const finalActionType = String(actionType || eventType || 'UNKNOWN');
    const finalDescription = String(description || redactedChangeSummary || '');
    const finalActorId = actorPersonId || actorId ? String(actorPersonId || actorId) : null;
    const finalEntityId = entityId || subjectPersonId || sourceRecordId ? String(entityId || subjectPersonId || sourceRecordId) : null;
    const finalTimestamp = String(occurredAt || createdAt || new Date().toISOString());
    const finalIdempotencyKey = String(idempotencyKey || `${actId}_${finalActionType}_${finalTimestamp.slice(0, 16)}`);

    // Cleanse metadata: strictly strip any raw national IDs or raw sensitive values
    let sanitizedMetadata = {};
    if (metadata && typeof metadata === 'object') {
        const rawJson = JSON.parse(JSON.stringify(metadata));
        if (rawJson.nationalId) delete rawJson.nationalId;
        if (rawJson.rawNationalId) delete rawJson.rawNationalId;
        if (rawJson.ssn) delete rawJson.ssn;
        if (rawJson.aadhaar) delete rawJson.aadhaar;
        if (rawJson.pan) delete rawJson.pan;
        sanitizedMetadata = rawJson;
    }

    return {
        id: actId,
        eventId: actId,
        actionType: finalActionType,
        eventType: finalActionType,
        description: finalDescription,
        redactedChangeSummary: finalDescription,
        actorPersonId: finalActorId,
        actorId: finalActorId,
        subjectPersonId: finalEntityId,
        entityType: String(entityType || sourceDomain || 'PERSON'),
        entityId: finalEntityId,
        sourceDomain: String(sourceDomain || 'FAMILY'),
        sourceRecordId: sourceRecordId ? String(sourceRecordId) : finalEntityId,
        metadata: sanitizedMetadata,
        schemaVersion: Number(schemaVersion || 1),
        idempotencyKey: finalIdempotencyKey,
        createdAt: finalTimestamp,
        occurredAt: finalTimestamp
    };
}
