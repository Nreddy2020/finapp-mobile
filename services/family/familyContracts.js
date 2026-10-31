/**
 * services/family/familyContracts.js
 * 
 * Authoritative Entity Contracts and Invariants for FinLife Family OS Phase 1.
 * 
 * Hard Rules:
 * 1. Person: Identity only. Stores zero household roles, zero relationships, zero trusted categories.
 * 2. HouseholdMembership: The ONLY authoritative link between a Person and a Household.
 * 3. Household: Container entity. `memberIds` is strictly a derived projection from memberships.
 * 4. Relationship: Canonical directed edge between two people (reciprocal relationship is derived).
 * 5. TrustedCircleEntry: External support / emergency contact for a household. Never creates membership.
 * 6. Snapshots: `educationSnapshot` and `healthSnapshot` are nullable inert fields for forward compatibility.
 * 7. Numeric Safety: No raw BigInt, no NaN, no Infinity.
 */

export const HouseholdType = Object.freeze({
    NUCLEAR: 'NUCLEAR',
    JOINT: 'JOINT',
    EXTENDED: 'EXTENDED',
    INDIVIDUAL: 'INDIVIDUAL',
    OTHER: 'OTHER'
});

export const HouseholdStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    PROVISIONAL: 'PROVISIONAL'
});

export const HouseholdRole = Object.freeze({
    HEAD: 'HEAD',
    PARTNER: 'PARTNER',
    DEPENDENT: 'DEPENDENT',
    MEMBER: 'MEMBER'
});

export const MembershipStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    ARCHIVED: 'ARCHIVED',
    PROVISIONAL_PENDING_CONFIRMATION: 'PROVISIONAL_PENDING_CONFIRMATION'
});

export const RelationshipType = Object.freeze({
    SPOUSE: 'SPOUSE',
    PARENT: 'PARENT',
    CHILD: 'CHILD',
    SIBLING: 'SIBLING',
    GRANDPARENT: 'GRANDPARENT',
    GRANDCHILD: 'GRANDCHILD',
    GUARDIAN: 'GUARDIAN',
    WARD: 'WARD',
    OTHER: 'OTHER'
});

export const RelationshipStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    HISTORICAL: 'HISTORICAL',
    ARCHIVED: 'ARCHIVED'
});

export const TrustedCategory = Object.freeze({
    DOCTOR: 'DOCTOR',
    LAWYER: 'LAWYER',
    FINANCIAL_ADVISOR: 'FINANCIAL_ADVISOR',
    EMERGENCY_CONTACT: 'EMERGENCY_CONTACT',
    NEIGHBOR: 'NEIGHBOR',
    CARETAKER: 'CARETAKER',
    OTHER: 'OTHER'
});

export const PersonStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED'
});

export const Gender = Object.freeze({
    MALE: 'MALE',
    FEMALE: 'FEMALE',
    OTHER: 'OTHER'
});

export const DocumentCategory = Object.freeze({
    IDENTITY: 'IDENTITY',
    FINANCIAL: 'FINANCIAL',
    MEDICAL: 'MEDICAL',
    LEGAL: 'LEGAL',
    PROPERTY: 'PROPERTY',
    VEHICLE: 'VEHICLE',
    EDUCATION: 'EDUCATION',
    OTHER: 'OTHER'
});

export const DocumentStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED'
});

export const ExpiryStatus = Object.freeze({
    VALID: 'VALID',
    EXPIRING_SOON: 'EXPIRING_SOON',
    EXPIRED: 'EXPIRED',
    NO_EXPIRY: 'NO_EXPIRY'
});

/**
 * Generate a collision-resistant prefixed entity ID
 * @param {string} prefix 
 */
export function generateEntityId(prefix = 'ent') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
}

/**
 * Factory for Person entity
 * Stores strictly individual identity and personal attributes.
 */
export function createEmptyPerson(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: overrides.id || generateEntityId('p'),
        fullName: typeof overrides.fullName === 'string' ? overrides.fullName.trim() : '',
        preferredName: typeof overrides.preferredName === 'string' ? overrides.preferredName.trim() : '',
        dob: overrides.dob || null, // YYYY-MM-DD
        gender: overrides.gender || null,
        phone: typeof overrides.phone === 'string' ? overrides.phone.trim() : null,
        email: typeof overrides.email === 'string' ? overrides.email.trim() : null,
        status: overrides.status || PersonStatus.ACTIVE,
        educationSnapshot: null, // Forward-compatible nullable inert field
        healthSnapshot: null,    // Forward-compatible nullable inert field
        migration: overrides.migration || null, // { source, sourceId, migrationVersion, migratedAt }
        createdAt: overrides.createdAt || now,
        updatedAt: overrides.updatedAt || now
    };
}

/**
 * Factory for Household entity
 * Container for address, status, and household metadata.
 */
export function createEmptyHousehold(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: overrides.id || generateEntityId('hh'),
        name: typeof overrides.name === 'string' ? overrides.name.trim() : 'My Household',
        type: overrides.type || HouseholdType.NUCLEAR,
        status: overrides.status || HouseholdStatus.ACTIVE,
        address: {
            line1: overrides.address?.line1 || '',
            line2: overrides.address?.line2 || '',
            city: overrides.address?.city || '',
            state: overrides.address?.state || '',
            postalCode: overrides.address?.postalCode || '',
            country: overrides.address?.country || 'IN'
        },
        createdAt: overrides.createdAt || now,
        updatedAt: overrides.updatedAt || now
    };
}

/**
 * Factory for HouseholdMembership entity
 * The single authoritative association linking a Person to a Household.
 */
export function createEmptyMembership(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: overrides.id || generateEntityId('hm'),
        householdId: overrides.householdId || '',
        personId: overrides.personId || '',
        role: overrides.role || HouseholdRole.MEMBER,
        status: overrides.status || MembershipStatus.ACTIVE,
        joinedAt: overrides.joinedAt || now,
        leftAt: overrides.leftAt || null,
        createdAt: overrides.createdAt || now,
        updatedAt: overrides.updatedAt || now
    };
}

/**
 * Factory for Canonical Directed Relationship entity
 */
export function createEmptyRelationship(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: overrides.id || generateEntityId('rel'),
        fromPersonId: overrides.fromPersonId || '',
        toPersonId: overrides.toPersonId || '',
        type: overrides.type || RelationshipType.OTHER,
        status: overrides.status || RelationshipStatus.ACTIVE,
        createdAt: overrides.createdAt || now,
        updatedAt: overrides.updatedAt || now
    };
}

/**
 * Factory for TrustedCircleEntry entity
 * External support and emergency contact registry for a household.
 */
export function createEmptyTrustedCircleEntry(overrides = {}) {
    const now = new Date().toISOString();
    const priority = Number.isInteger(overrides.emergencyPriority) ? overrides.emergencyPriority : 1;
    return {
        id: overrides.id || generateEntityId('tc'),
        householdId: overrides.householdId || '',
        personId: overrides.personId || '',
        category: overrides.category || TrustedCategory.EMERGENCY_CONTACT,
        emergencyPriority: Math.max(1, priority),
        notes: typeof overrides.notes === 'string' ? overrides.notes.trim() : '',
        createdAt: overrides.createdAt || now,
        updatedAt: overrides.updatedAt || now
    };
}

/**
 * Derive reciprocal relationship type
 */
export function getReciprocalRelationshipType(type, toPersonGender = null) {
    switch (type) {
        case RelationshipType.PARENT:
            return RelationshipType.CHILD;
        case RelationshipType.CHILD:
            return RelationshipType.PARENT;
        case RelationshipType.SPOUSE:
            return RelationshipType.SPOUSE;
        case RelationshipType.SIBLING:
            return RelationshipType.SIBLING;
        case RelationshipType.GRANDPARENT:
            return RelationshipType.GRANDCHILD;
        case RelationshipType.GRANDCHILD:
            return RelationshipType.GRANDPARENT;
        case RelationshipType.GUARDIAN:
            return RelationshipType.WARD;
        case RelationshipType.WARD:
            return RelationshipType.GUARDIAN;
        case RelationshipType.OTHER:
            return RelationshipType.OTHER;
        default:
            throw new Error(`Unsupported relationship type for reciprocal mapping: '${type}'`);
    }
}

/**
 * Factory for FamilyDocument entity
 * Stores authoritative document metadata, physical location, and date tracking.
 */
export function createEmptyDocument(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: overrides.id || generateEntityId('doc'),
        householdId: overrides.householdId || '',
        personId: overrides.personId || null, // null indicates household-wide
        title: typeof overrides.title === 'string' ? overrides.title.trim() : '',
        category: overrides.category || DocumentCategory.IDENTITY,
        documentType: typeof overrides.documentType === 'string' ? overrides.documentType.trim() : 'General Document',
        identifierNumber: typeof overrides.identifierNumber === 'string' ? overrides.identifierNumber.trim() : null,
        fileUri: typeof overrides.fileUri === 'string' ? overrides.fileUri.trim() : null,
        physicalLocation: typeof overrides.physicalLocation === 'string' ? overrides.physicalLocation.trim() : null,
        issuedDate: overrides.issuedDate || null, // YYYY-MM-DD
        expiryDate: overrides.expiryDate || null, // YYYY-MM-DD
        notes: typeof overrides.notes === 'string' ? overrides.notes.trim() : '',
        tags: Array.isArray(overrides.tags) ? overrides.tags.map(t => String(t).trim()).filter(Boolean) : [],
        status: overrides.status || DocumentStatus.ACTIVE,
        createdAt: overrides.createdAt || now,
        updatedAt: overrides.updatedAt || now
    };
}

// -------------------------------------------------------------
// VALIDATION FUNCTIONS
// -------------------------------------------------------------

export function validatePerson(person) {
    if (!person || typeof person !== 'object') {
        throw new Error('Person must be an object');
    }
    if (!person.id || typeof person.id !== 'string') {
        throw new Error('Person id is required and must be a string');
    }
    if (!person.fullName || typeof person.fullName !== 'string' || !person.fullName.trim()) {
        throw new Error('Person fullName is required');
    }
    if (person.status && !Object.values(PersonStatus).includes(person.status)) {
        throw new Error(`Invalid Person status: ${person.status}`);
    }
    if (person.gender && !Object.values(Gender).includes(person.gender)) {
        throw new Error(`Invalid Gender: ${person.gender}`);
    }
    if (person.dob !== null && person.dob !== undefined) {
        if (typeof person.dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(person.dob)) {
            throw new Error(`Invalid Date of Birth format '${person.dob}'; expected YYYY-MM-DD`);
        }
        const [y, m, d] = person.dob.split('-').map(Number);
        const parsed = new Date(Date.UTC(y, m - 1, d));
        if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() !== y || parsed.getUTCMonth() + 1 !== m || parsed.getUTCDate() !== d) {
            throw new Error(`Invalid Date of Birth calendar date '${person.dob}'`);
        }
        if (parsed > new Date()) {
            throw new Error(`Date of Birth '${person.dob}' cannot be in the future`);
        }
    }
    // Hard check: Person must NEVER store household role or trusted category directly
    if ('role' in person || 'householdRole' in person) {
        throw new Error('Household role must not be stored on Person entity; use HouseholdMembership');
    }
    if ('trustedCategory' in person || 'category' in person) {
        throw new Error('Trusted category must not be stored on Person entity; use TrustedCircleEntry');
    }
    assertSafeNumbers(person);
    return true;
}

export function validateHousehold(household) {
    if (!household || typeof household !== 'object') {
        throw new Error('Household must be an object');
    }
    if (!household.id || typeof household.id !== 'string') {
        throw new Error('Household id is required and must be a string');
    }
    if (!household.name || typeof household.name !== 'string' || !household.name.trim()) {
        throw new Error('Household name is required');
    }
    if (household.type && !Object.values(HouseholdType).includes(household.type)) {
        throw new Error(`Invalid Household type: ${household.type}`);
    }
    if (household.status && !Object.values(HouseholdStatus).includes(household.status)) {
        throw new Error(`Invalid Household status: ${household.status}`);
    }
    assertSafeNumbers(household);
    return true;
}

export function validateMembership(membership) {
    if (!membership || typeof membership !== 'object') {
        throw new Error('HouseholdMembership must be an object');
    }
    if (!membership.id || typeof membership.id !== 'string') {
        throw new Error('HouseholdMembership id is required');
    }
    if (!membership.householdId || typeof membership.householdId !== 'string') {
        throw new Error('HouseholdMembership householdId is required');
    }
    if (!membership.personId || typeof membership.personId !== 'string') {
        throw new Error('HouseholdMembership personId is required');
    }
    if (!membership.role || !Object.values(HouseholdRole).includes(membership.role)) {
        throw new Error(`Invalid HouseholdRole: ${membership.role}`);
    }
    if (!membership.status || !Object.values(MembershipStatus).includes(membership.status)) {
        throw new Error(`Invalid MembershipStatus: ${membership.status}`);
    }
    assertSafeNumbers(membership);
    return true;
}

export function validateRelationship(relationship) {
    if (!relationship || typeof relationship !== 'object') {
        throw new Error('Relationship must be an object');
    }
    if (!relationship.id || typeof relationship.id !== 'string') {
        throw new Error('Relationship id is required');
    }
    if (!relationship.fromPersonId || typeof relationship.fromPersonId !== 'string') {
        throw new Error('Relationship fromPersonId is required');
    }
    if (!relationship.toPersonId || typeof relationship.toPersonId !== 'string') {
        throw new Error('Relationship toPersonId is required');
    }
    if (relationship.fromPersonId === relationship.toPersonId) {
        throw new Error('Self-relationship is not permitted: fromPersonId and toPersonId cannot be identical');
    }
    if (!relationship.type || !Object.values(RelationshipType).includes(relationship.type)) {
        throw new Error(`Invalid RelationshipType: ${relationship.type}`);
    }
    if (relationship.status && !Object.values(RelationshipStatus).includes(relationship.status)) {
        throw new Error(`Invalid RelationshipStatus: ${relationship.status}`);
    }
    assertSafeNumbers(relationship);
    return true;
}

export function validateTrustedCircleEntry(entry) {
    if (!entry || typeof entry !== 'object') {
        throw new Error('TrustedCircleEntry must be an object');
    }
    if (!entry.id || typeof entry.id !== 'string') {
        throw new Error('TrustedCircleEntry id is required');
    }
    if (!entry.householdId || typeof entry.householdId !== 'string') {
        throw new Error('TrustedCircleEntry householdId is required');
    }
    if (!entry.personId || typeof entry.personId !== 'string') {
        throw new Error('TrustedCircleEntry personId is required');
    }
    if (!entry.category || !Object.values(TrustedCategory).includes(entry.category)) {
        throw new Error(`Invalid TrustedCategory: ${entry.category}`);
    }
    if (!Number.isInteger(entry.emergencyPriority) || entry.emergencyPriority < 1) {
        throw new Error('TrustedCircleEntry emergencyPriority must be an integer >= 1');
    }
    assertSafeNumbers(entry);
    return true;
}

/**
 * Parse a YYYY-MM-DD calendar date or Date object into a UTC midnight timestamp (ms).
 * Strict calendar-day validation: verifies month 1-12, day bounds, and leap years.
 * Returns null if invalid.
 */
export function parseUtcDateOnly(dateInput) {
    if (!dateInput) return null;
    let y, m, d;
    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        if (!trimmed) return null;
        const datePart = trimmed.includes('T') ? trimmed.split('T')[0] : (trimmed.includes(' ') ? trimmed.split(' ')[0] : trimmed);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
        const parts = datePart.split('-').map(Number);
        y = parts[0];
        m = parts[1];
        d = parts[2];
    } else if (dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
        y = dateInput.getUTCFullYear();
        m = dateInput.getUTCMonth() + 1;
        d = dateInput.getUTCDate();
    } else {
        return null;
    }
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    if (
        Number.isNaN(utcDate.getTime()) ||
        utcDate.getUTCFullYear() !== y ||
        utcDate.getUTCMonth() + 1 !== m ||
        utcDate.getUTCDate() !== d
    ) {
        return null;
    }
    return utcDate.getTime();
}

const MS_PER_DAY = 86400000;

/**
 * Pure timezone-independent UTC calendar-day expiry computation.
 * 
 * Invariants:
 * - null expiryDate -> NO_EXPIRY, daysRemaining: null, isExpiringSoon: false, isExpired: false
 * - daysRemaining < 0 -> EXPIRED, isExpiringSoon: false, isExpired: true
 * - daysRemaining === 0 -> EXPIRING_SOON, isExpiringSoon: true, isExpired: false
 * - 1 <= daysRemaining <= 90 -> EXPIRING_SOON, isExpiringSoon: true, isExpired: false
 * - daysRemaining > 90 (e.g. 91) -> VALID, isExpiringSoon: false, isExpired: false
 */
export function computeDocumentExpiryStatus(expiryDate, referenceDate = new Date()) {
    if (!expiryDate || (typeof expiryDate === 'string' && !expiryDate.trim())) {
        return {
            expiryStatus: ExpiryStatus.NO_EXPIRY,
            daysRemaining: null,
            isExpiringSoon: false,
            isExpired: false
        };
    }

    const expiryUtc = parseUtcDateOnly(expiryDate);
    if (expiryUtc === null) {
        return {
            expiryStatus: ExpiryStatus.NO_EXPIRY,
            daysRemaining: null,
            isExpiringSoon: false,
            isExpired: false
        };
    }

    const refUtc = parseUtcDateOnly(referenceDate);
    if (refUtc === null) {
        throw new Error('Invalid calendar date provided for expiry status calculation');
    }

    const diffMs = expiryUtc - refUtc;
    const daysRemaining = Math.round(diffMs / MS_PER_DAY);

    if (daysRemaining < 0) {
        return {
            expiryStatus: ExpiryStatus.EXPIRED,
            daysRemaining,
            isExpiringSoon: false,
            isExpired: true
        };
    }

    if (daysRemaining <= 90) {
        return {
            expiryStatus: ExpiryStatus.EXPIRING_SOON,
            daysRemaining,
            isExpiringSoon: true,
            isExpired: false
        };
    }

    return {
        expiryStatus: ExpiryStatus.VALID,
        daysRemaining,
        isExpiringSoon: false,
        isExpired: false
    };
}

/**
 * Pure utility to mask document identifiers for UI and diagnostic safety.
 * Never alters stored data. Returns masked string preserving only last 4 characters.
 */
export function maskIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') return '';
    const trimmed = identifier.trim();
    if (!trimmed) return '';
    if (trimmed.length <= 4) {
        return '••••';
    }
    const last4 = trimmed.slice(-4);
    const bulletCount = Math.min(trimmed.length - 4, 6);
    return `${'•'.repeat(bulletCount)} ${last4}`;
}

/**
 * Authoritative validator for FamilyDocument entity
 */
export function validateDocument(document, options = {}) {
    if (!document || typeof document !== 'object') {
        throw new Error('FamilyDocument must be an object');
    }
    if (!document.id || typeof document.id !== 'string') {
        throw new Error('FamilyDocument id is required and must be a string');
    }
    if (!document.householdId || typeof document.householdId !== 'string') {
        throw new Error('FamilyDocument householdId is required and must be a string');
    }
    if (!document.title || typeof document.title !== 'string' || !document.title.trim()) {
        throw new Error('FamilyDocument title is required');
    }
    if (!document.category || !Object.values(DocumentCategory).includes(document.category)) {
        throw new Error(`Invalid DocumentCategory: ${document.category}`);
    }
    if (!document.status || !Object.values(DocumentStatus).includes(document.status)) {
        throw new Error(`Invalid DocumentStatus: ${document.status}`);
    }
    if (document.personId !== null && document.personId !== undefined && typeof document.personId !== 'string') {
        throw new Error('FamilyDocument personId must be a string or null');
    }

    // Strict calendar date validation: issuedDate
    if (document.issuedDate !== null && document.issuedDate !== undefined) {
        const issuedUtc = parseUtcDateOnly(document.issuedDate);
        if (issuedUtc === null) {
            throw new Error(`Invalid issuedDate '${document.issuedDate}'; expected valid YYYY-MM-DD calendar date`);
        }
        if (!options.allowFutureIssuedDate) {
            const refDate = options.referenceDate ? parseUtcDateOnly(options.referenceDate) : parseUtcDateOnly(new Date());
            if (refDate !== null && issuedUtc > refDate) {
                throw new Error(`issuedDate '${document.issuedDate}' cannot be in the future`);
            }
        }
    }

    // Strict calendar date validation: expiryDate
    if (document.expiryDate !== null && document.expiryDate !== undefined) {
        const expiryUtc = parseUtcDateOnly(document.expiryDate);
        if (expiryUtc === null) {
            throw new Error(`Invalid expiryDate '${document.expiryDate}'; expected valid YYYY-MM-DD calendar date`);
        }
        if (document.issuedDate) {
            const issuedUtc = parseUtcDateOnly(document.issuedDate);
            if (issuedUtc !== null && expiryUtc < issuedUtc) {
                throw new Error(`expiryDate cannot be earlier than issuedDate`);
            }
        }
    }

    // Validate fileUri: local-only pointer metadata
    if (document.fileUri !== null && document.fileUri !== undefined) {
        if (typeof document.fileUri !== 'string') {
            throw new Error('FamilyDocument fileUri must be a string');
        }
        const trimmedUri = document.fileUri.trim();
        if (trimmedUri) {
            const isLocal = /^(file:\/\/|content:\/\/|ph:\/\/|\/|\.\/)/i.test(trimmedUri);
            const isRemote = /^(http:\/\/|https:\/\/|ftp:\/\/)/i.test(trimmedUri);
            if (isRemote || !isLocal) {
                throw new Error('FamilyDocument fileUri must be a local file URI (file://, content://, ph://) or local path');
            }
        }
    }

    assertSafeNumbers(document);
    return true;
}

/**
 * Ensures object contains no raw BigInt, no NaN, and no Infinity
 */
export function assertSafeNumbers(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'bigint') {
            throw new Error(`Raw BigInt invariant violation at property '${key}'`);
        }
        if (typeof val === 'number') {
            if (Number.isNaN(val)) {
                throw new Error(`NaN invariant violation at property '${key}'`);
            }
            if (!Number.isFinite(val)) {
                throw new Error(`Infinity invariant violation at property '${key}'`);
            }
        } else if (val && typeof val === 'object') {
            assertSafeNumbers(val);
        }
    }
}

// =============================================================================
// PHASE 4: FAMILY OPERATIONS, TASKS & RESPONSIBILITIES CONTRACTS
// =============================================================================

export const ResponsibilityCategory = Object.freeze({
    HOME_MAINTENANCE: 'HOME_MAINTENANCE',
    CHORES_PANTRY: 'CHORES_PANTRY',
    HEALTH_WELLNESS: 'HEALTH_WELLNESS',
    EDUCATION_ACTIVITIES: 'EDUCATION_ACTIVITIES',
    FINANCIAL_ADMIN: 'FINANCIAL_ADMIN',
    VEHICLE_LOGISTICS: 'VEHICLE_LOGISTICS',
    PET_CARE: 'PET_CARE',
    OTHER: 'OTHER',
});

export const ResponsibilityStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    ARCHIVED: 'ARCHIVED',
});

export const TaskPriority = Object.freeze({
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
});

export const TaskStatus = Object.freeze({
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    ARCHIVED: 'ARCHIVED',
});

export const TaskRecurrence = Object.freeze({
    NONE: 'NONE',
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    BIWEEKLY: 'BIWEEKLY',
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    YEARLY: 'YEARLY',
});

export const TaskDueStatus = Object.freeze({
    NO_DUE_DATE: 'NO_DUE_DATE',
    OVERDUE: 'OVERDUE',
    DUE_TODAY: 'DUE_TODAY',
    DUE_SOON: 'DUE_SOON',
    UPCOMING: 'UPCOMING',
});

export const ALLOWED_TASK_TRANSITIONS = Object.freeze({
    [TaskStatus.TODO]: Object.freeze([TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.ARCHIVED]),
    [TaskStatus.IN_PROGRESS]: Object.freeze([TaskStatus.TODO, TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.ARCHIVED]),
    [TaskStatus.COMPLETED]: Object.freeze([TaskStatus.TODO, TaskStatus.ARCHIVED]),
    [TaskStatus.CANCELLED]: Object.freeze([TaskStatus.TODO, TaskStatus.ARCHIVED]),
    [TaskStatus.ARCHIVED]: Object.freeze([]), // Terminal
});

/**
 * Responsibility factory
 */
export function createEmptyResponsibility(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: overrides.id || `resp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        householdId: overrides.householdId || '',
        title: overrides.title || '',
        category: overrides.category || ResponsibilityCategory.OTHER,
        leadPersonId: overrides.leadPersonId || '',
        backupPersonId: overrides.backupPersonId !== undefined ? overrides.backupPersonId : null,
        description: overrides.description || '',
        status: overrides.status || ResponsibilityStatus.ACTIVE,
        createdAt: overrides.createdAt || now,
        updatedAt: overrides.updatedAt || now,
    };
}

/**
 * Task factory
 * Note: ownerPersonId: null explicitly means the household owns the task.
 * Note: assignedPersonId: null explicitly means the task is in the household pool.
 */
export function createEmptyTask(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: overrides.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        householdId: overrides.householdId || '',
        responsibilityId: overrides.responsibilityId !== undefined ? overrides.responsibilityId : null,
        title: overrides.title || '',
        description: overrides.description || '',
        priority: overrides.priority || TaskPriority.MEDIUM,
        status: overrides.status || TaskStatus.TODO,
        assignedPersonId: overrides.assignedPersonId !== undefined ? overrides.assignedPersonId : null,
        ownerPersonId: overrides.ownerPersonId !== undefined ? overrides.ownerPersonId : null,
        dueDate: overrides.dueDate !== undefined ? overrides.dueDate : null,
        dueTime: overrides.dueTime !== undefined ? overrides.dueTime : null,
        recurrence: overrides.recurrence || TaskRecurrence.NONE,
        recurrenceConfig: overrides.recurrenceConfig !== undefined ? overrides.recurrenceConfig : null,
        seriesId: overrides.seriesId !== undefined ? overrides.seriesId : null,
        parentTaskId: overrides.parentTaskId !== undefined ? overrides.parentTaskId : null,
        instanceNumber: typeof overrides.instanceNumber === 'number' ? overrides.instanceNumber : 1,
        completedAt: overrides.completedAt !== undefined ? overrides.completedAt : null,
        completedByPersonId: overrides.completedByPersonId !== undefined ? overrides.completedByPersonId : null,
        createdAt: overrides.createdAt || now,
        updatedAt: overrides.updatedAt || now,
    };
}

/**
 * Validates a FamilyResponsibility entity
 */
export function validateResponsibility(resp) {
    if (!resp || typeof resp !== 'object') {
        throw new Error('FamilyResponsibility must be an object');
    }
    if (!resp.id || typeof resp.id !== 'string' || !resp.id.trim()) {
        throw new Error('FamilyResponsibility requires a non-empty string id');
    }
    if (!resp.householdId || typeof resp.householdId !== 'string' || !resp.householdId.trim()) {
        throw new Error('FamilyResponsibility requires a non-empty string householdId');
    }
    if (!resp.title || typeof resp.title !== 'string' || !resp.title.trim()) {
        throw new Error('FamilyResponsibility requires a non-empty string title');
    }
    if (!resp.category || !Object.values(ResponsibilityCategory).includes(resp.category)) {
        throw new Error(`Invalid ResponsibilityCategory: ${resp.category}`);
    }
    if (!resp.leadPersonId || typeof resp.leadPersonId !== 'string' || !resp.leadPersonId.trim()) {
        throw new Error('FamilyResponsibility requires a non-empty string leadPersonId');
    }
    if (resp.backupPersonId !== null && resp.backupPersonId !== undefined && typeof resp.backupPersonId !== 'string') {
        throw new Error('FamilyResponsibility backupPersonId must be a string or null');
    }
    if (!resp.status || !Object.values(ResponsibilityStatus).includes(resp.status)) {
        throw new Error(`Invalid ResponsibilityStatus: ${resp.status}`);
    }

    assertSafeNumbers(resp);
    return true;
}

const DUE_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Validates a FamilyTask entity
 */
export function validateTask(task) {
    if (!task || typeof task !== 'object') {
        throw new Error('FamilyTask must be an object');
    }
    if (!task.id || typeof task.id !== 'string' || !task.id.trim()) {
        throw new Error('FamilyTask requires a non-empty string id');
    }
    if (!task.householdId || typeof task.householdId !== 'string' || !task.householdId.trim()) {
        throw new Error('FamilyTask requires a non-empty string householdId');
    }
    if (!task.title || typeof task.title !== 'string' || !task.title.trim()) {
        throw new Error('FamilyTask requires a non-empty string title');
    }
    if (!task.priority || !Object.values(TaskPriority).includes(task.priority)) {
        throw new Error(`Invalid TaskPriority: ${task.priority}`);
    }
    if (!task.status || !Object.values(TaskStatus).includes(task.status)) {
        throw new Error(`Invalid TaskStatus: ${task.status}`);
    }
    if (!task.recurrence || !Object.values(TaskRecurrence).includes(task.recurrence)) {
        throw new Error(`Invalid TaskRecurrence: ${task.recurrence}`);
    }
    if (task.assignedPersonId !== null && task.assignedPersonId !== undefined && typeof task.assignedPersonId !== 'string') {
        throw new Error('FamilyTask assignedPersonId must be a string or null');
    }
    if (task.ownerPersonId !== null && task.ownerPersonId !== undefined && typeof task.ownerPersonId !== 'string') {
        throw new Error('FamilyTask ownerPersonId must be a string or null');
    }
    if (task.responsibilityId !== null && task.responsibilityId !== undefined && typeof task.responsibilityId !== 'string') {
        throw new Error('FamilyTask responsibilityId must be a string or null');
    }
    if (typeof task.instanceNumber !== 'number' || task.instanceNumber < 1 || !Number.isInteger(task.instanceNumber)) {
        throw new Error('FamilyTask instanceNumber must be an integer >= 1');
    }

    // Calendar dueDate validation
    if (task.dueDate !== null && task.dueDate !== undefined) {
        const dueUtc = parseUtcDateOnly(task.dueDate);
        if (dueUtc === null) {
            throw new Error(`Invalid dueDate '${task.dueDate}'; expected valid YYYY-MM-DD calendar date`);
        }
    }

    // Due time validation: HH:mm 24-hour format
    if (task.dueTime !== null && task.dueTime !== undefined) {
        if (typeof task.dueTime !== 'string' || !DUE_TIME_REGEX.test(task.dueTime)) {
            throw new Error(`Invalid dueTime '${task.dueTime}'; expected valid 24-hour HH:mm string`);
        }
    }

    // Completion timestamp validation
    if (task.completedAt !== null && task.completedAt !== undefined) {
        if (typeof task.completedAt !== 'string' || Number.isNaN(Date.parse(task.completedAt))) {
            throw new Error(`Invalid completedAt '${task.completedAt}'; expected valid ISO date string`);
        }
    }
    if (task.completedByPersonId !== null && task.completedByPersonId !== undefined && typeof task.completedByPersonId !== 'string') {
        throw new Error('FamilyTask completedByPersonId must be a string or null');
    }

    assertSafeNumbers(task);
    return true;
}

/**
 * Pure UTC calendar-day due status evaluation.
 * Note: dueTime is scheduling metadata only; calendar day comparison does NOT convert DUE_TODAY to OVERDUE.
 */
export function computeTaskDueStatus(dueDate, status, referenceDate = new Date()) {
    if (!dueDate) {
        return { status: TaskDueStatus.NO_DUE_DATE, daysRemaining: null };
    }

    const dueMs = parseUtcDateOnly(dueDate);
    if (dueMs === null) {
        return { status: TaskDueStatus.NO_DUE_DATE, daysRemaining: null };
    }

    const refMs = parseUtcDateOnly(referenceDate);
    if (refMs === null) {
        return { status: TaskDueStatus.NO_DUE_DATE, daysRemaining: null };
    }

    const diffMs = dueMs - refMs;
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
        return { status: TaskDueStatus.OVERDUE, daysRemaining };
    }
    if (daysRemaining === 0) {
        return { status: TaskDueStatus.DUE_TODAY, daysRemaining: 0 };
    }
    if (daysRemaining <= 7) {
        return { status: TaskDueStatus.DUE_SOON, daysRemaining };
    }
    return { status: TaskDueStatus.UPCOMING, daysRemaining };
}

/**
 * Pure UTC calendar recurrence advancement with month-end boundary clamping.
 * Supported: DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY.
 */
export function computeNextRecurrenceDate(currentDueDate, recurrence, recurrenceConfig = null) {
    if (!currentDueDate || !recurrence || recurrence === TaskRecurrence.NONE) {
        return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(currentDueDate);
    if (!match) return null;

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const day = parseInt(match[3], 10);

    const pad = (n) => String(n).padStart(2, '0');

    if (recurrence === TaskRecurrence.DAILY) {
        const next = new Date(Date.UTC(year, month, day + 1));
        return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
    }

    if (recurrence === TaskRecurrence.WEEKLY) {
        const next = new Date(Date.UTC(year, month, day + 7));
        return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
    }

    if (recurrence === TaskRecurrence.BIWEEKLY) {
        const next = new Date(Date.UTC(year, month, day + 14));
        return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
    }

    if (recurrence === TaskRecurrence.MONTHLY) {
        let targetMonth = month + 1;
        let targetYear = year + Math.floor(targetMonth / 12);
        targetMonth = (targetMonth % 12 + 12) % 12;

        const maxDays = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        const clampedDay = Math.min(day, maxDays);
        return `${targetYear}-${pad(targetMonth + 1)}-${pad(clampedDay)}`;
    }

    if (recurrence === TaskRecurrence.QUARTERLY) {
        // Advance 3 calendar months with month-end boundary clamping
        let targetMonth = month + 3;
        let targetYear = year + Math.floor(targetMonth / 12);
        targetMonth = (targetMonth % 12 + 12) % 12;

        const maxDays = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        const clampedDay = Math.min(day, maxDays);
        return `${targetYear}-${pad(targetMonth + 1)}-${pad(clampedDay)}`;
    }

    if (recurrence === TaskRecurrence.YEARLY) {
        const targetYear = year + 1;
        const targetMonth = month;
        const maxDays = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        const clampedDay = Math.min(day, maxDays);
        return `${targetYear}-${pad(targetMonth + 1)}-${pad(clampedDay)}`;
    }

    return null;
}

/**
 * Pure UTC ISO-8601 week boundaries (Monday 00:00:00 UTC through Sunday 23:59:59.999 UTC)
 */
export function computeIsoWeekBoundaries(referenceDate = new Date()) {
    const ref = new Date(referenceDate);
    const dayOfWeek = ref.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Monday=1, Sunday=7
    const mondayOffset = 1 - isoDay;

    const startOfWeek = new Date(Date.UTC(
        ref.getUTCFullYear(),
        ref.getUTCMonth(),
        ref.getUTCDate() + mondayOffset,
        0, 0, 0, 0
    ));

    const endOfWeek = new Date(Date.UTC(
        ref.getUTCFullYear(),
        ref.getUTCMonth(),
        ref.getUTCDate() + mondayOffset + 6,
        23, 59, 59, 999
    ));

    return { startOfWeek, endOfWeek };
}

/**
 * Returns true if an ISO timestamp falls within the ISO week of referenceDate in UTC
 */
export function isTimestampInIsoWeek(timestamp, referenceDate = new Date()) {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return false;
    const { startOfWeek, endOfWeek } = computeIsoWeekBoundaries(referenceDate);
    const time = date.getTime();
    return time >= startOfWeek.getTime() && time <= endOfWeek.getTime();
}

// -------------------------------------------------------------
// PHASE 5: FAMILY PROTECTION & EMERGENCY READINESS CONTRACTS
// -------------------------------------------------------------

export const EmergencyContactType = Object.freeze({
    PRIMARY: 'PRIMARY',
    SECONDARY: 'SECONDARY',
    MEDICAL_PROXY: 'MEDICAL_PROXY',
    LEGAL_PROXY: 'LEGAL_PROXY',
    GUARDIAN: 'GUARDIAN',
    SERVICE_PROVIDER: 'SERVICE_PROVIDER',
    OTHER: 'OTHER'
});

export const ProtectionType = Object.freeze({
    HEALTHCARE_PROXY: 'HEALTHCARE_PROXY',
    WILL_TRUST: 'WILL_TRUST',
    POWER_OF_ATTORNEY: 'POWER_OF_ATTORNEY',
    LIFE_INSURANCE_RECORD: 'LIFE_INSURANCE_RECORD', // Safe directive identifier
    GUARDIANSHIP_DECLARATION: 'GUARDIANSHIP_DECLARATION',
    CRITICAL_DIRECTIVE: 'CRITICAL_DIRECTIVE'
});

export const ProtectionStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    IN_REVIEW: 'IN_REVIEW',
    DRAFT: 'DRAFT',
    ARCHIVED: 'ARCHIVED'
});

export const ReadinessLevel = Object.freeze({
    CRITICAL_GAPS: 'CRITICAL_GAPS',
    BASIC: 'BASIC',
    SUBSTANTIAL: 'SUBSTANTIAL',
    COMPREHENSIVE: 'COMPREHENSIVE'
});

export const DimensionStatus = Object.freeze({
    COMPLETE: 'COMPLETE',
    PARTIAL: 'PARTIAL',
    CRITICAL_GAP: 'CRITICAL_GAP'
});

/**
 * Factory for FamilyEmergencyContact
 */
export function createEmptyEmergencyContact(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: overrides.id || generateEntityId('emc'),
        householdId: overrides.householdId || '',
        priorityOrder: Number.isInteger(overrides.priorityOrder) && overrides.priorityOrder >= 1 ? overrides.priorityOrder : 1,
        contactType: overrides.contactType || EmergencyContactType.PRIMARY,
        personId: overrides.personId || null,
        trustedCircleMemberId: overrides.trustedCircleMemberId || null,
        displayName: typeof overrides.displayName === 'string' ? overrides.displayName.trim() : '',
        relationship: typeof overrides.relationship === 'string' ? overrides.relationship.trim() : '',
        primaryPhone: typeof overrides.primaryPhone === 'string' ? overrides.primaryPhone.trim() : '',
        secondaryPhone: typeof overrides.secondaryPhone === 'string' ? overrides.secondaryPhone.trim() : null,
        email: typeof overrides.email === 'string' ? overrides.email.trim() : null,
        instructions: typeof overrides.instructions === 'string' ? overrides.instructions.trim() : '',
        isArchived: Boolean(overrides.isArchived),
        createdAt: overrides.createdAt || now,
        updatedAt: overrides.updatedAt || now
    };
}

/**
 * Factory for FamilyProtectionItem
 * Canonical field: physicalLocation (safeLocation is strictly rejected/standardized)
 */
export function createEmptyProtectionItem(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: overrides.id || generateEntityId('prot'),
        householdId: overrides.householdId || '',
        protectionType: overrides.protectionType || ProtectionType.HEALTHCARE_PROXY,
        title: typeof overrides.title === 'string' ? overrides.title.trim() : '',
        designatedPersonId: overrides.designatedPersonId || null,
        designatedBackupPersonId: overrides.designatedBackupPersonId || null,
        subjectPersonId: overrides.subjectPersonId || null,
        documentId: overrides.documentId || null,
        institutionOrIssuer: typeof overrides.institutionOrIssuer === 'string' ? overrides.institutionOrIssuer.trim() : null,
        externalReferenceNumber: typeof overrides.externalReferenceNumber === 'string' ? overrides.externalReferenceNumber.trim() : null,
        physicalLocation: typeof overrides.physicalLocation === 'string' ? overrides.physicalLocation.trim() : null,
        status: overrides.status || ProtectionStatus.ACTIVE,
        notes: typeof overrides.notes === 'string' ? overrides.notes.trim() : '',
        createdAt: overrides.createdAt || now,
        updatedAt: overrides.updatedAt || now
    };
}

/**
 * Validator for FamilyEmergencyContact
 */
export function validateEmergencyContact(contact) {
    if (!contact || typeof contact !== 'object') {
        throw new Error('FamilyEmergencyContact must be an object');
    }
    if (!contact.id || typeof contact.id !== 'string') {
        throw new Error('FamilyEmergencyContact requires a non-empty string id');
    }
    if (!contact.householdId || typeof contact.householdId !== 'string') {
        throw new Error('FamilyEmergencyContact requires a non-empty string householdId');
    }
    if (!Number.isInteger(contact.priorityOrder) || contact.priorityOrder < 1) {
        throw new Error('FamilyEmergencyContact priorityOrder must be an integer >= 1');
    }
    if (!contact.contactType || !Object.values(EmergencyContactType).includes(contact.contactType)) {
        throw new Error(`Invalid EmergencyContactType: ${contact.contactType}`);
    }

    // Reference exclusivity check
    if (contact.personId && contact.trustedCircleMemberId) {
        throw new Error('Emergency contact cannot specify both personId and trustedCircleMemberId');
    }

    if (!contact.displayName || typeof contact.displayName !== 'string' || !contact.displayName.trim()) {
        throw new Error('FamilyEmergencyContact requires a non-empty displayName');
    }
    if (!contact.relationship || typeof contact.relationship !== 'string' || !contact.relationship.trim()) {
        throw new Error('FamilyEmergencyContact requires a non-empty relationship');
    }
    if (!contact.primaryPhone || typeof contact.primaryPhone !== 'string' || !contact.primaryPhone.trim()) {
        throw new Error('FamilyEmergencyContact requires a non-empty primaryPhone');
    }
    if (typeof contact.isArchived !== 'boolean') {
        throw new Error('FamilyEmergencyContact isArchived must be a boolean');
    }

    return true;
}

/**
 * Validator for FamilyProtectionItem
 */
export function validateProtectionItem(item) {
    if (!item || typeof item !== 'object') {
        throw new Error('FamilyProtectionItem must be an object');
    }
    if (!item.id || typeof item.id !== 'string') {
        throw new Error('FamilyProtectionItem requires a non-empty string id');
    }
    if (!item.householdId || typeof item.householdId !== 'string') {
        throw new Error('FamilyProtectionItem requires a non-empty string householdId');
    }
    if (!item.title || typeof item.title !== 'string' || !item.title.trim()) {
        throw new Error('FamilyProtectionItem requires a non-empty title');
    }
    if (!item.protectionType || !Object.values(ProtectionType).includes(item.protectionType)) {
        throw new Error(`Invalid ProtectionType: ${item.protectionType}`);
    }
    if (!item.status || !Object.values(ProtectionStatus).includes(item.status)) {
        throw new Error(`Invalid ProtectionStatus: ${item.status}`);
    }

    // Designation rules
    if (item.designatedBackupPersonId && !item.designatedPersonId) {
        throw new Error('A backup agent cannot be designated without a primary designated agent');
    }
    if (item.designatedPersonId && item.designatedBackupPersonId && item.designatedPersonId === item.designatedBackupPersonId) {
        throw new Error('Designated backup agent cannot be the same person as the primary agent');
    }

    return true;
}

/**
 * Pure, deterministic Family Readiness Evaluator
 * Synthesizes 5 verifiable dimensions into an explainable audit report
 */
export function evaluateHouseholdReadinessPure({
    householdId,
    emergencyContacts = [],
    protectionItems = [],
    documents = []
} = {}) {
    const activeContacts = emergencyContacts.filter(c => !c.isArchived);
    const activeDirectives = protectionItems.filter(p => p.status === ProtectionStatus.ACTIVE);
    const draftDirectives = protectionItems.filter(p => p.status === ProtectionStatus.DRAFT || p.status === ProtectionStatus.IN_REVIEW);
    const activeDocs = documents.filter(d => d.status === DocumentStatus.ACTIVE);

    // Dimension 1: PRIMARY_EMERGENCY_CONTACT
    const primaryContactsWithPhone = activeContacts.filter(
        c => c.contactType === EmergencyContactType.PRIMARY && typeof c.primaryPhone === 'string' && c.primaryPhone.trim().length > 0
    );
    let dim1;
    if (primaryContactsWithPhone.length >= 1) {
        dim1 = {
            id: 'PRIMARY_EMERGENCY_CONTACT',
            title: 'Primary Emergency Dispatch Contact',
            status: DimensionStatus.COMPLETE,
            explanation: 'Primary emergency dispatch contact registered with valid phone',
            actionRequired: null
        };
    } else if (activeContacts.length >= 1) {
        dim1 = {
            id: 'PRIMARY_EMERGENCY_CONTACT',
            title: 'Primary Emergency Dispatch Contact',
            status: DimensionStatus.PARTIAL,
            explanation: 'Emergency contact exists but no primary dispatch contact designated with phone',
            actionRequired: 'Designate a primary emergency contact with valid phone number'
        };
    } else {
        dim1 = {
            id: 'PRIMARY_EMERGENCY_CONTACT',
            title: 'Primary Emergency Dispatch Contact',
            status: DimensionStatus.CRITICAL_GAP,
            explanation: 'No active emergency contacts registered',
            actionRequired: 'Register a primary emergency dispatch contact'
        };
    }

    // Dimension 2: SECONDARY_OR_MEDICAL_CONTACT
    const medicalProxies = activeContacts.filter(c => c.contactType === EmergencyContactType.MEDICAL_PROXY);
    let dim2;
    if (medicalProxies.length >= 1 || activeContacts.length >= 2) {
        dim2 = {
            id: 'SECONDARY_OR_MEDICAL_CONTACT',
            title: 'Secondary Dispatch or Medical Proxy',
            status: DimensionStatus.COMPLETE,
            explanation: 'Secondary contact or medical proxy registered',
            actionRequired: null
        };
    } else if (activeContacts.length === 1) {
        dim2 = {
            id: 'SECONDARY_OR_MEDICAL_CONTACT',
            title: 'Secondary Dispatch or Medical Proxy',
            status: DimensionStatus.PARTIAL,
            explanation: 'Only a single emergency contact registered; secondary or medical proxy recommended',
            actionRequired: 'Add a secondary emergency contact or medical proxy'
        };
    } else {
        dim2 = {
            id: 'SECONDARY_OR_MEDICAL_CONTACT',
            title: 'Secondary Dispatch or Medical Proxy',
            status: DimensionStatus.CRITICAL_GAP,
            explanation: 'No secondary contact or medical proxy registered',
            actionRequired: 'Add secondary contact or medical proxy'
        };
    }

    // Dimension 3: VITAL_DOCUMENTS_INTEGRITY
    const vitalCategories = [DocumentCategory.IDENTITY, DocumentCategory.LEGAL, DocumentCategory.MEDICAL];
    const vitalDocs = activeDocs.filter(d => vitalCategories.includes(d.category));
    let dim3;
    if (vitalDocs.length === 0) {
        dim3 = {
            id: 'VITAL_DOCUMENTS_INTEGRITY',
            title: 'Vital Records & Identity Documents',
            status: DimensionStatus.CRITICAL_GAP,
            explanation: 'No active vital documents registered in Document Vault',
            actionRequired: 'Upload identity or vital documents to the Document Vault'
        };
    } else {
        const expiredVitalDocs = vitalDocs.filter(d => d.expiryStatus === ExpiryStatus.EXPIRED);
        const expiringSoonVitalDocs = vitalDocs.filter(d => d.expiryStatus === ExpiryStatus.EXPIRING_SOON);

        if (expiredVitalDocs.length > 0) {
            dim3 = {
                id: 'VITAL_DOCUMENTS_INTEGRITY',
                title: 'Vital Records & Identity Documents',
                status: DimensionStatus.CRITICAL_GAP,
                explanation: 'One or more vital documents are expired',
                actionRequired: 'Renew expired vital documents immediately'
            };
        } else if (expiringSoonVitalDocs.length > 0) {
            dim3 = {
                id: 'VITAL_DOCUMENTS_INTEGRITY',
                title: 'Vital Records & Identity Documents',
                status: DimensionStatus.PARTIAL,
                explanation: 'One or more vital documents are expiring soon',
                actionRequired: 'Review and prepare renewal for expiring vital documents'
            };
        } else {
            dim3 = {
                id: 'VITAL_DOCUMENTS_INTEGRITY',
                title: 'Vital Records & Identity Documents',
                status: DimensionStatus.COMPLETE,
                explanation: 'All vital documents are current and valid',
                actionRequired: null
            };
        }
    }

    // Dimension 4: HEALTHCARE_OR_LEGAL_DIRECTIVE
    const activeDirectivesWithAgent = activeDirectives.filter(
        p => typeof p.designatedPersonId === 'string' && p.designatedPersonId.trim().length > 0
    );
    let dim4;
    if (activeDirectivesWithAgent.length >= 1) {
        dim4 = {
            id: 'HEALTHCARE_OR_LEGAL_DIRECTIVE',
            title: 'Healthcare Proxy or Legal Directives',
            status: DimensionStatus.COMPLETE,
            explanation: 'Active healthcare or legal directive registered with designated agent',
            actionRequired: null
        };
    } else if (activeDirectives.length >= 1 || draftDirectives.length >= 1) {
        dim4 = {
            id: 'HEALTHCARE_OR_LEGAL_DIRECTIVE',
            title: 'Healthcare Proxy or Legal Directives',
            status: DimensionStatus.PARTIAL,
            explanation: 'Protection directive registered but pending designated agent or finalized review',
            actionRequired: 'Designate an agent and finalize protection directive'
        };
    } else {
        dim4 = {
            id: 'HEALTHCARE_OR_LEGAL_DIRECTIVE',
            title: 'Healthcare Proxy or Legal Directives',
            status: DimensionStatus.CRITICAL_GAP,
            explanation: 'No healthcare or legal directives registered',
            actionRequired: 'Establish a healthcare proxy or durable power of attorney'
        };
    }

    // Dimension 5: PHYSICAL_SAFE_LOCATION_AUDIT
    const activeDocsWithLocation = activeDocs.filter(
        d => typeof d.physicalLocation === 'string' && d.physicalLocation.trim().length > 0
    );
    const activeProtWithLocation = activeDirectives.filter(
        p => typeof p.physicalLocation === 'string' && p.physicalLocation.trim().length > 0
    );
    const totalPhysicalLocations = activeDocsWithLocation.length + activeProtWithLocation.length;
    let dim5;
    if (totalPhysicalLocations >= 1) {
        dim5 = {
            id: 'PHYSICAL_SAFE_LOCATION_AUDIT',
            title: 'Physical Paper & Safe Location Audit',
            status: DimensionStatus.COMPLETE,
            explanation: 'Physical storage location registered for critical family records',
            actionRequired: null
        };
    } else {
        dim5 = {
            id: 'PHYSICAL_SAFE_LOCATION_AUDIT',
            title: 'Physical Paper & Safe Location Audit',
            status: DimensionStatus.CRITICAL_GAP,
            explanation: 'No physical storage location recorded for documents or directives',
            actionRequired: 'Record physical safe location for vital records and paper directives'
        };
    }

    const dimensions = [dim1, dim2, dim3, dim4, dim5];
    const passedCriteriaCount = dimensions.filter(d => d.status === DimensionStatus.COMPLETE).length;
    const totalCriteriaCount = 5;
    const scorePercentage = Math.round((passedCriteriaCount / totalCriteriaCount) * 100);

    let readinessLevel;
    if (passedCriteriaCount === 5) {
        readinessLevel = ReadinessLevel.COMPREHENSIVE;
    } else if (passedCriteriaCount >= 3) {
        readinessLevel = ReadinessLevel.SUBSTANTIAL;
    } else if (passedCriteriaCount >= 1) {
        readinessLevel = ReadinessLevel.BASIC;
    } else {
        readinessLevel = ReadinessLevel.CRITICAL_GAPS;
    }

    const actionableGaps = dimensions
        .filter(d => d.status !== DimensionStatus.COMPLETE && d.actionRequired)
        .map(d => d.actionRequired);

    return {
        householdId: householdId || null,
        evaluatedAt: new Date().toISOString(),
        readinessLevel,
        passedCriteriaCount,
        totalCriteriaCount,
        scorePercentage,
        dimensions,
        actionableGaps
    };
}

// =============================================================================
// PHASE 6: FAMILY FINANCIAL COORDINATION & SHARED OBLIGATIONS CONTRACTS
// =============================================================================

/**
 * Factory for FamilyFinancialLink
 */
export function createEmptyFinancialLink(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: overrides.id || generateEntityId('ffl'),
        householdId: overrides.householdId || null,
        commitmentId: overrides.commitmentId || null,
        responsibilityId: overrides.responsibilityId || null,
        leadPayerPersonId: overrides.leadPayerPersonId || null,
        backupPayerPersonId: overrides.backupPayerPersonId || null,
        notes: typeof overrides.notes === 'string' ? overrides.notes.trim() : '',
        isArchived: overrides.isArchived !== undefined ? !!overrides.isArchived : false,
        createdAt: overrides.createdAt || now,
        updatedAt: overrides.updatedAt || now
    };
}

/**
 * Validates a FamilyFinancialLink record
 */
export function validateFinancialLink(link) {
    if (!link || typeof link !== 'object') {
        throw new Error('Financial link must be an object');
    }
    if (!link.id || typeof link.id !== 'string' || !link.id.trim()) {
        throw new Error("Financial link 'id' is required and must be a non-empty string");
    }
    if (!link.householdId || typeof link.householdId !== 'string' || !link.householdId.trim()) {
        throw new Error("Financial link householdId is required and must be a non-empty string");
    }
    if (!link.commitmentId || typeof link.commitmentId !== 'string' || !link.commitmentId.trim()) {
        throw new Error("Financial link commitmentId is required and must be a non-empty string");
    }
    if (!link.leadPayerPersonId || typeof link.leadPayerPersonId !== 'string' || !link.leadPayerPersonId.trim()) {
        throw new Error("Financial link leadPayerPersonId is required and must be a non-empty string");
    }
    if (link.backupPayerPersonId !== undefined && link.backupPayerPersonId !== null) {
        if (typeof link.backupPayerPersonId !== 'string' || !link.backupPayerPersonId.trim()) {
            throw new Error("Financial link 'backupPayerPersonId' must be a non-empty string if provided");
        }
        if (link.backupPayerPersonId === link.leadPayerPersonId) {
            throw new Error("Backup payer cannot be the same as the lead payer");
        }
    }
    if (link.responsibilityId !== undefined && link.responsibilityId !== null) {
        if (typeof link.responsibilityId !== 'string' || !link.responsibilityId.trim()) {
            throw new Error("Financial link 'responsibilityId' must be a non-empty string if provided");
        }
    }
    return true;
}

/**
 * Parses any supported commitment amount representation to BigInt Paise.
 * Accepts either a commitment object with `.amount` or direct amount representation.
 * Strictly throws if amount is negative, infinite, or invalid.
 */
export function parseCommitmentAmountPaise(input) {
    if (input === undefined || input === null) {
        throw new Error('Commitment amount is missing or undefined');
    }

    let amt = input;
    if (typeof input === 'object' && input !== null) {
        if ('amount' in input && input.amount !== undefined) {
            amt = input.amount;
        } else if ('paise' in input) {
            amt = input;
        } else if ('amountPaise' in input) {
            amt = input;
        }
    }

    if (typeof amt === 'object' && amt !== null) {
        if (amt.paise !== undefined && amt.paise !== null) {
            const strVal = String(amt.paise).trim();
            if (!/^-?\d+$/.test(strVal)) {
                throw new Error(`Invalid paise format: "${amt.paise}"`);
            }
            const bi = BigInt(strVal);
            if (bi < 0n) throw new Error('Negative or invalid paise amount');
            return bi;
        }
        if (amt.amountPaise !== undefined && amt.amountPaise !== null) {
            const bi = typeof amt.amountPaise === 'bigint' ? amt.amountPaise : BigInt(String(amt.amountPaise).trim());
            if (bi < 0n) throw new Error('Negative or invalid paise amount');
            return bi;
        }
    }

    if (typeof amt === 'bigint') {
        if (amt < 0n) throw new Error('Negative or invalid amount: BigInt cannot be negative');
        return amt;
    }

    if (typeof amt === 'number') {
        if (!Number.isFinite(amt) || isNaN(amt) || amt < 0) {
            throw new Error(`Negative or invalid amount: ${amt}`);
        }
        return BigInt(Math.round(amt * 100));
    }

    if (typeof amt === 'string') {
        const trimmed = amt.trim();
        if (/^-?\d+$/.test(trimmed)) {
            const num = BigInt(trimmed);
            if (num < 0n) throw new Error(`Negative or invalid amount: "${amt}"`);
            // String numeric rupees to paise
            return num * 100n;
        }
        const parsedFloat = parseFloat(trimmed);
        if (!Number.isFinite(parsedFloat) || isNaN(parsedFloat) || parsedFloat < 0) {
            throw new Error(`Negative or invalid amount string: "${amt}"`);
        }
        return BigInt(Math.round(parsedFloat * 100));
    }

    throw new Error(`Unable to parse commitment amount of type ${typeof amt}`);
}

/**
 * Checks if a given ISO date string falls in the same calendar month as referenceDate in UTC.
 */
export function isDateInActiveMonthUtc(dateInput, referenceDate = new Date()) {
    if (!dateInput) return false;
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return false;
    const ref = new Date(referenceDate);
    if (isNaN(ref.getTime())) return false;
    return date.getUTCFullYear() === ref.getUTCFullYear() && date.getUTCMonth() === ref.getUTCMonth();
}

/**
 * Safe BigInt division with standard half-up rounding.
 */
function safeBigIntDivRound(numerator, denominator) {
    if (denominator <= 0n) throw new Error('Denominator must be positive');
    if (numerator < 0n) throw new Error('Numerator must be non-negative');
    return (numerator + denominator / 2n) / denominator;
}

/**
 * Normalizes a commitment to its monthly contribution in Paise.
 * - One-time commitments contribute only if due within the active calendar month.
 * - Commitments outside the active month contribute 0.
 * - Recurring commitments normalize based on frequency.
 */
export function normalizeCommitmentMonthlyPaise(commitment, referenceDate = new Date()) {
    const amountPaise = parseCommitmentAmountPaise(commitment);
    const freq = (commitment.frequency || '').toUpperCase();
    const isOneTime = freq === 'ONE_TIME' || commitment.isRecurring === false;

    if (isOneTime) {
        const dueDate = commitment.nextDueDate || commitment.dueDate || commitment.scheduledDate || commitment.startDate;
        if (isDateInActiveMonthUtc(dueDate, referenceDate)) {
            return amountPaise;
        }
        return 0n;
    }

    switch (freq) {
        case 'DAILY':
            return safeBigIntDivRound(amountPaise * 365n, 12n);
        case 'WEEKLY':
            return safeBigIntDivRound(amountPaise * 52n, 12n);
        case 'FORTNIGHTLY':
        case 'BIWEEKLY':
            return safeBigIntDivRound(amountPaise * 26n, 12n);
        case 'MONTHLY':
        case '':
            return amountPaise;
        case 'QUARTERLY':
            return safeBigIntDivRound(amountPaise, 3n);
        case 'HALF_YEARLY':
        case 'SEMI_ANNUAL':
            return safeBigIntDivRound(amountPaise, 6n);
        case 'YEARLY':
        case 'ANNUAL':
            return safeBigIntDivRound(amountPaise, 12n);
        default:
            return amountPaise;
    }
}

/**
 * Pure Deterministic Family Financial Coordination Evaluator
 * 
 * Computes household monthly commitments, member obligations, and domain breakdowns.
 * 
 * Invariants:
 * 1. Only explicitly linked commitments contribute to the main totals.
 * 2. Unlinked commitments are excluded from totals and returned as unlinkedCommitmentCount.
 * 3. Lead payer receives 100% of the obligation allocation.
 * 4. Backup payer is informational only and receives 0 allocation.
 * 5. Commitments remain completely immutable.
 * 6. Reference date is strictly honored for one-time commitments.
 */
export function computeHouseholdFinancialSummaryPure({
    householdId = null,
    financialLinks = [],
    links = [],
    commitments = [],
    householdMembers = [],
    members = [],
    responsibilities = [],
    referenceDate = new Date()
} = {}) {
    const refDate = new Date(referenceDate);
    const effectiveLinks = (links && links.length > 0) ? links : financialLinks;
    const effectiveMembers = (members && members.length > 0) ? members : householdMembers;

    const commitmentMap = new Map();
    for (const c of commitments) {
        if (c && c.id) commitmentMap.set(c.id, c);
    }

    const linkedCommitmentIds = new Set();
    const activeHouseholdLinks = effectiveLinks.filter(l => {
        if (householdId && l.householdId !== householdId) return false;
        if (l.isArchived) return false;
        return true;
    });

    // Track member totals
    const memberObligationMap = new Map();
    for (const m of effectiveMembers) {
        const pId = m.personId || m.id;
        const name = m.fullName || m.displayName || m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member';
        memberObligationMap.set(pId, {
            personId: pId,
            name,
            personName: name,
            role: m.role || 'MEMBER',
            monthlyObligationPaise: 0n,
            commitmentCount: 0,
            asLeadCount: 0,
            asBackupCount: 0
        });
    }

    // Track domain totals
    const domainObligationMap = new Map();
    for (const r of responsibilities) {
        domainObligationMap.set(r.id, {
            responsibilityId: r.id,
            name: r.name || r.title || 'Domain',
            domainTitle: r.name || r.title || 'Domain',
            category: r.category || 'GENERAL',
            color: r.color || '#3B82F6',
            monthlyTotalPaise: 0n,
            commitmentCount: 0
        });
    }
    // General / unassigned domain bucket
    const UNASSIGNED_DOMAIN_ID = 'unassigned_domain';
    domainObligationMap.set(UNASSIGNED_DOMAIN_ID, {
        responsibilityId: null,
        name: 'General Household',
        domainTitle: 'General Household',
        category: 'GENERAL',
        color: '#6B7280',
        monthlyTotalPaise: 0n,
        commitmentCount: 0
    });

    let totalMonthlyPaise = 0n;
    const linkedItems = [];

    for (const link of activeHouseholdLinks) {
        const commitment = commitmentMap.get(link.commitmentId);
        if (!commitment) continue; // Skip if commitment no longer exists

        linkedCommitmentIds.add(link.commitmentId);
        const monthlyPaise = normalizeCommitmentMonthlyPaise(commitment, refDate);
        totalMonthlyPaise += monthlyPaise;

        // Lead payer gets 100% of obligation
        if (link.leadPayerPersonId) {
            if (!memberObligationMap.has(link.leadPayerPersonId)) {
                memberObligationMap.set(link.leadPayerPersonId, {
                    personId: link.leadPayerPersonId,
                    name: 'Household Member',
                    personName: 'Household Member',
                    role: 'MEMBER',
                    monthlyObligationPaise: 0n,
                    commitmentCount: 0,
                    asLeadCount: 0,
                    asBackupCount: 0
                });
            }
            const m = memberObligationMap.get(link.leadPayerPersonId);
            m.monthlyObligationPaise += monthlyPaise;
            m.commitmentCount += 1;
            m.asLeadCount += 1;
        }

        // Backup payer is informational only (0% financial obligation)
        if (link.backupPayerPersonId) {
            if (!memberObligationMap.has(link.backupPayerPersonId)) {
                memberObligationMap.set(link.backupPayerPersonId, {
                    personId: link.backupPayerPersonId,
                    name: 'Household Member',
                    personName: 'Household Member',
                    role: 'MEMBER',
                    monthlyObligationPaise: 0n,
                    commitmentCount: 0,
                    asLeadCount: 0,
                    asBackupCount: 0
                });
            }
            const b = memberObligationMap.get(link.backupPayerPersonId);
            b.asBackupCount += 1;
        }

        // Domain allocation
        const targetDomainId = link.responsibilityId && domainObligationMap.has(link.responsibilityId)
            ? link.responsibilityId
            : UNASSIGNED_DOMAIN_ID;
        const d = domainObligationMap.get(targetDomainId);
        d.monthlyTotalPaise += monthlyPaise;
        d.commitmentCount += 1;

        linkedItems.push({
            linkId: link.id,
            commitmentId: commitment.id,
            commitmentName: commitment.name || commitment.title || 'Commitment',
            type: commitment.type || 'RECURRING',
            frequency: commitment.frequency || 'MONTHLY',
            rawAmount: commitment.amount,
            monthlyPaise: monthlyPaise.toString(),
            monthlyRupees: Number(monthlyPaise / 100n),
            leadPayerPersonId: link.leadPayerPersonId,
            backupPayerPersonId: link.backupPayerPersonId || null,
            responsibilityId: link.responsibilityId || null,
            notes: link.notes || ''
        });
    }

    // Unlinked commitments count
    let unlinkedCommitmentCount = 0;
    for (const c of commitments) {
        if (c && c.id && !linkedCommitmentIds.has(c.id)) {
            unlinkedCommitmentCount++;
        }
    }

    const memberBreakdown = Array.from(memberObligationMap.values()).map(m => {
        const monthlyRupees = Number(m.monthlyObligationPaise / 100n);
        const percentage = totalMonthlyPaise > 0n
            ? Number((m.monthlyObligationPaise * 10000n) / totalMonthlyPaise) / 100
            : 0;
        return {
            ...m,
            monthlyAmountPaise: m.monthlyObligationPaise.toString(),
            monthlyObligationPaise: m.monthlyObligationPaise.toString(),
            monthlyAmountRupees: monthlyRupees,
            monthlyObligationRupees: monthlyRupees,
            percentage,
            linkedCount: m.asLeadCount
        };
    });

    const allDomains = Array.from(domainObligationMap.values());
    const domainBreakdown = allDomains
        .filter(d => d.responsibilityId !== null && (d.commitmentCount > 0 || responsibilities.some(r => r.id === d.responsibilityId)))
        .map(d => {
            const monthlyRupees = Number(d.monthlyTotalPaise / 100n);
            const percentage = totalMonthlyPaise > 0n
                ? Number((d.monthlyTotalPaise * 10000n) / totalMonthlyPaise) / 100
                : 0;
            return {
                ...d,
                monthlyAmountPaise: d.monthlyTotalPaise.toString(),
                monthlyTotalPaise: d.monthlyTotalPaise.toString(),
                monthlyAmountRupees: monthlyRupees,
                monthlyTotalRupees: monthlyRupees,
                percentage,
                linkedCount: d.commitmentCount
            };
        });

    const unassignedRaw = domainObligationMap.get(UNASSIGNED_DOMAIN_ID);
    const unassignedRupees = Number(unassignedRaw.monthlyTotalPaise / 100n);
    const unassignedDomain = {
        responsibilityId: null,
        name: 'General Household',
        color: '#6B7280',
        monthlyAmountPaise: unassignedRaw.monthlyTotalPaise.toString(),
        monthlyAmountRupees: unassignedRupees,
        linkedCount: unassignedRaw.commitmentCount,
        percentage: totalMonthlyPaise > 0n
            ? Number((unassignedRaw.monthlyTotalPaise * 10000n) / totalMonthlyPaise) / 100
            : 0
    };

    const totalRupees = Number(totalMonthlyPaise / 100n);

    return {
        householdId: householdId || null,
        evaluatedAt: new Date().toISOString(),
        referenceDate: refDate.toISOString().split('T')[0],
        referenceMonth: refDate.toISOString().slice(0, 7),
        totalMonthlyPaise: totalMonthlyPaise.toString(),
        totalMonthlyCommitmentsPaise: totalMonthlyPaise.toString(),
        totalMonthlyRupees: totalRupees,
        totalMonthlyCommitmentsRupees: totalRupees,
        missingCommitmentCount: activeHouseholdLinks.filter(link => !commitmentMap.has(link.commitmentId)).length,
        linkedCommitmentCount: linkedItems.length,
        unlinkedCommitmentCount,
        totalCommitmentsCount: commitments.length,
        memberBreakdown,
        memberAllocations: memberBreakdown,
        domainBreakdown,
        domainAllocations: domainBreakdown,
        unassignedDomain,
        linkedItems
    };
}

// ============================================================================
// PHASE 7: HOUSEHOLD ACTION & RENEWAL HORIZON CONTRACTS & ENUMS
// ============================================================================

export const ActionHorizonDomain = Object.freeze({
    FINANCIAL: 'FINANCIAL',
    DOCUMENT: 'DOCUMENT',
    OPERATION: 'OPERATION',
    PROTECTION: 'PROTECTION'
});

export const ActionHorizonTier = Object.freeze({
    OVERDUE: 'OVERDUE',
    IMMEDIATE: 'IMMEDIATE',
    UPCOMING: 'UPCOMING',
    LOOKING_AHEAD: 'LOOKING_AHEAD'
});

export const ActionHorizonRole = Object.freeze({
    LEAD_PAYER: 'LEAD_PAYER',
    DOCUMENT_OWNER: 'DOCUMENT_OWNER',
    TASK_ASSIGNEE: 'TASK_ASSIGNEE',
    DIRECTIVE_PROXY: 'DIRECTIVE_PROXY',
    HOUSEHOLD: 'HOUSEHOLD'
});

export const ACTION_HORIZON_ROUTES = Object.freeze({
    FINANCIAL: '/family/more/financials',
    DOCUMENT: '/family/more/resources',
    OPERATION: '/family/operations',
    PROTECTION: '/family/protection'
});

/**
 * Helper to parse a date string or timestamp into UTC midnight ms.
 * Returns null if invalid or unparseable.
 */
function parseUtcMidnight(dateInput) {
    if (!dateInput) return null;
    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const y = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const d = parseInt(match[3], 10);
            if (m < 1 || m > 12 || d < 1 || d > 31) return null;
            const utc = Date.UTC(y, m - 1, d);
            if (isNaN(utc)) return null;
            return utc;
        }
        const parsed = new Date(trimmed);
        if (isNaN(parsed.getTime())) return null;
        return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
    } else if (dateInput instanceof Date) {
        if (isNaN(dateInput.getTime())) return null;
        return Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate());
    } else if (typeof dateInput === 'number') {
        const parsed = new Date(dateInput);
        if (isNaN(parsed.getTime())) return null;
        return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
    }
    return null;
}

/**
 * Pure evaluation engine for Household Action & Renewal Horizon (Phase 7).
 * 
 * Ingests authoritative records across Financials, Vault Documents, Operations Tasks,
 * and Protection Directives, normalizes temporal urgency against a fixed reference date,
 * and produces a filter-dependent action summary with zero secondary storage.
 * 
 * @param {Object} params
 * @param {string} [params.householdId] - Target household ID for tenancy isolation
 * @param {string} [params.referenceDateUtc] - Canonical UTC reference date (YYYY-MM-DD)
 * @param {Array} [params.financialLinks] - Active FamilyFinancialLink records
 * @param {Array} [params.commitments] - Authoritative Commitments records
 * @param {Array} [params.documents] - Authoritative FamilyDocument records
 * @param {Array} [params.tasks] - Authoritative FamilyTask records
 * @param {Array} [params.protectionItems] - Authoritative FamilyProtectionItem records
 * @param {Array} [params.members] - Authoritative Household Person records
 * @param {Object} [params.filters] - Active view filters { status, domain, personId }
 * @returns {{ items: Array, summary: Object }}
 */
export function computeHouseholdActionHorizonPure({
    householdId = null,
    referenceDateUtc = null,
    financialLinks = [],
    commitments = [],
    documents = [],
    tasks = [],
    protectionItems = [],
    members = [],
    filters = { status: 'ALL', domain: 'ALL', personId: 'ALL' }
} = {}) {
    // 1. Diagnostics (in-memory test verification only, zero persistence)
    const diagnostics = {
        skippedInvalidDate: 0,
        skippedInvalidAmount: 0,
        skippedForeignHousehold: 0
    };

    // 2. Resolve Reference Date (UTC midnight)
    let refUtcMs = parseUtcMidnight(referenceDateUtc);
    if (refUtcMs === null) {
        const now = new Date();
        refUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    }
    const resolvedRefDateString = new Date(refUtcMs).toISOString().slice(0, 10);

    // 3. Build Member Lookup Map (for referential integrity & ownership resolution)
    const safeMembers = Array.isArray(members) ? members : [];
    const memberMap = new Map();
    for (const m of safeMembers) {
        if (!m) continue;
        const pId = m.personId || m.id;
        if (pId) {
            memberMap.set(pId, m);
        }
    }

    const resolveOwnership = (rawPersonId, canonicalRole, isHouseholdWide = false) => {
        if (isHouseholdWide) {
            return {
                assignedPersonId: null,
                assignedPersonName: 'Household Wide',
                ownershipRole: ActionHorizonRole.HOUSEHOLD
            };
        }
        if (!rawPersonId) {
            return {
                assignedPersonId: null,
                assignedPersonName: 'Unassigned',
                ownershipRole: ActionHorizonRole.HOUSEHOLD
            };
        }
        const member = memberMap.get(rawPersonId);
        if (member) {
            const name = member.displayName || member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member';
            return {
                assignedPersonId: rawPersonId,
                assignedPersonName: name,
                ownershipRole: canonicalRole
            };
        }
        // Deleted / orphaned owner fallback (Never invent a phantom person)
        return {
            assignedPersonId: null,
            assignedPersonName: 'Unassigned',
            ownershipRole: ActionHorizonRole.HOUSEHOLD
        };
    };

    // 4. Raw Item Collector across All 4 Domains
    const rawItems = [];

    // --- DOMAIN 1: FINANCIAL COMMITMENTS ---
    const safeLinks = Array.isArray(financialLinks) ? financialLinks : [];
    const safeCommitments = Array.isArray(commitments) ? commitments : [];
    const commitmentMap = new Map();
    for (const c of safeCommitments) {
        if (c && c.id) commitmentMap.set(c.id, c);
    }

    for (const link of safeLinks) {
        if (!link) continue;
        if (householdId && link.householdId && link.householdId !== householdId) {
            diagnostics.skippedForeignHousehold++;
            continue;
        }
        if (link.isArchived === true) continue;

        const commitment = commitmentMap.get(link.commitmentId);
        if (!commitment) continue;

        // Financial amount validation (zero silent coercion)
        let amt = commitment.amount;
        if (amt !== null && amt !== undefined && typeof amt === 'string') {
            amt = parseFloat(amt);
        }
        if (typeof amt !== 'number' || isNaN(amt) || !isFinite(amt) || amt <= 0) {
            diagnostics.skippedInvalidAmount++;
            continue;
        }

        // Due date resolution
        const rawDueDate = commitment.nextDueDate || commitment.dueDate || commitment.date;
        const dueUtcMs = parseUtcMidnight(rawDueDate);
        if (dueUtcMs === null) {
            diagnostics.skippedInvalidDate++;
            continue;
        }

        const daysRemaining = Math.round((dueUtcMs - refUtcMs) / 86400000);
        if (daysRemaining > 90) continue; // Excluded from horizon

        let tier;
        if (daysRemaining < 0) {
            tier = ActionHorizonTier.OVERDUE;
        } else if (daysRemaining <= 7) {
            tier = ActionHorizonTier.IMMEDIATE;
        } else if (daysRemaining <= 30) {
            tier = ActionHorizonTier.UPCOMING;
        } else {
            tier = ActionHorizonTier.LOOKING_AHEAD;
        }

        const ownership = resolveOwnership(link.leadPayerPersonId, ActionHorizonRole.LEAD_PAYER, false);
        const currency = commitment.currency || 'INR';

        rawItems.push({
            id: `FINANCIAL:${commitment.id}`,
            sourceEntityId: commitment.id,
            domain: ActionHorizonDomain.FINANCIAL,
            title: commitment.name || commitment.title || 'Financial Commitment',
            subtitle: commitment.category || commitment.frequency || 'Linked Household Obligation',
            dueDate: new Date(dueUtcMs).toISOString().slice(0, 10),
            daysRemaining,
            status: tier,
            assignedPersonId: ownership.assignedPersonId,
            assignedPersonName: ownership.assignedPersonName,
            ownershipRole: ownership.ownershipRole,
            amount: amt,
            currency,
            targetRoute: ACTION_HORIZON_ROUTES.FINANCIAL,
            priority: tier === ActionHorizonTier.OVERDUE ? 'CRITICAL' : (tier === ActionHorizonTier.IMMEDIATE ? 'HIGH' : 'MEDIUM')
        });
    }

    // --- DOMAIN 2: DOCUMENT VAULT ---
    const safeDocuments = Array.isArray(documents) ? documents : [];
    for (const doc of safeDocuments) {
        if (!doc) continue;
        if (householdId && doc.householdId && doc.householdId !== householdId) {
            diagnostics.skippedForeignHousehold++;
            continue;
        }
        if (doc.status !== 'ACTIVE') continue; // Archived documents strictly excluded
        if (!doc.expiryDate) continue; // Documents without expiry do not expire

        const dueUtcMs = parseUtcMidnight(doc.expiryDate);
        if (dueUtcMs === null) {
            diagnostics.skippedInvalidDate++;
            continue;
        }

        const daysRemaining = Math.round((dueUtcMs - refUtcMs) / 86400000);
        if (daysRemaining > 90) continue; // Excluded from horizon

        let tier;
        if (daysRemaining < 0) {
            tier = ActionHorizonTier.OVERDUE;
        } else if (daysRemaining <= 7) {
            tier = ActionHorizonTier.IMMEDIATE;
        } else if (daysRemaining <= 30) {
            tier = ActionHorizonTier.UPCOMING;
        } else {
            tier = ActionHorizonTier.LOOKING_AHEAD;
        }

        const isHhWide = doc.isHouseholdWide === true || !doc.personId;
        const ownership = resolveOwnership(doc.personId, ActionHorizonRole.DOCUMENT_OWNER, isHhWide);

        rawItems.push({
            id: `DOCUMENT:${doc.id}`,
            sourceEntityId: doc.id,
            domain: ActionHorizonDomain.DOCUMENT,
            title: doc.title || doc.name || 'Document Renewal',
            subtitle: doc.category || 'Vault Document',
            dueDate: new Date(dueUtcMs).toISOString().slice(0, 10),
            daysRemaining,
            status: tier,
            assignedPersonId: ownership.assignedPersonId,
            assignedPersonName: ownership.assignedPersonName,
            ownershipRole: ownership.ownershipRole,
            amount: null,
            currency: null,
            targetRoute: ACTION_HORIZON_ROUTES.DOCUMENT,
            priority: tier === ActionHorizonTier.OVERDUE ? 'CRITICAL' : (tier === ActionHorizonTier.IMMEDIATE ? 'HIGH' : 'MEDIUM')
        });
    }

    // --- DOMAIN 3: OPERATIONS & CHORES ---
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    for (const task of safeTasks) {
        if (!task) continue;
        if (householdId && task.householdId && task.householdId !== householdId) {
            diagnostics.skippedForeignHousehold++;
            continue;
        }
        if (task.status === 'COMPLETED' || task.status === 'CANCELLED') continue; // Inactive tasks excluded
        if (!task.dueDate) continue;

        const dueUtcMs = parseUtcMidnight(task.dueDate);
        if (dueUtcMs === null) {
            diagnostics.skippedInvalidDate++;
            continue;
        }

        const daysRemaining = Math.round((dueUtcMs - refUtcMs) / 86400000);
        if (daysRemaining > 90) continue; // Excluded from horizon

        let tier;
        if (daysRemaining < 0) {
            tier = ActionHorizonTier.OVERDUE;
        } else if (daysRemaining <= 7) {
            tier = ActionHorizonTier.IMMEDIATE;
        } else if (daysRemaining <= 30) {
            tier = ActionHorizonTier.UPCOMING;
        } else {
            tier = ActionHorizonTier.LOOKING_AHEAD;
        }

        const taskAssigneeId = task.assignedPersonId || task.assignedTo || null;
        const ownership = resolveOwnership(taskAssigneeId, ActionHorizonRole.TASK_ASSIGNEE, false);

        let priority = tier === ActionHorizonTier.OVERDUE ? 'CRITICAL' : (tier === ActionHorizonTier.IMMEDIATE ? 'HIGH' : 'MEDIUM');
        if (task.priority && ['CRITICAL', 'HIGH'].includes(String(task.priority).toUpperCase())) {
            priority = String(task.priority).toUpperCase();
        }

        rawItems.push({
            id: `OPERATION:${task.id}`,
            sourceEntityId: task.id,
            domain: ActionHorizonDomain.OPERATION,
            title: task.title || task.name || 'Maintenance Task',
            subtitle: task.category || task.frequency || 'Operations & Maintenance',
            dueDate: new Date(dueUtcMs).toISOString().slice(0, 10),
            daysRemaining,
            status: tier,
            assignedPersonId: ownership.assignedPersonId,
            assignedPersonName: ownership.assignedPersonName,
            ownershipRole: ownership.ownershipRole,
            amount: null,
            currency: null,
            targetRoute: ACTION_HORIZON_ROUTES.OPERATION,
            priority
        });
    }

    // --- DOMAIN 4: PROTECTION & DIRECTIVES ---
    const safeProtectionItems = Array.isArray(protectionItems) ? protectionItems : [];
    for (const item of safeProtectionItems) {
        if (!item) continue;
        if (householdId && item.householdId && item.householdId !== householdId) {
            diagnostics.skippedForeignHousehold++;
            continue;
        }
        if (item.status !== 'ACTIVE') continue; // Archived directives excluded

        const rawDate = item.reviewDate || item.expiryDate || item.nextReviewDate;
        if (!rawDate) continue;

        const dueUtcMs = parseUtcMidnight(rawDate);
        if (dueUtcMs === null) {
            diagnostics.skippedInvalidDate++;
            continue;
        }

        const daysRemaining = Math.round((dueUtcMs - refUtcMs) / 86400000);
        if (daysRemaining > 90) continue; // Excluded from horizon

        let tier;
        if (daysRemaining < 0) {
            tier = ActionHorizonTier.OVERDUE;
        } else if (daysRemaining <= 7) {
            tier = ActionHorizonTier.IMMEDIATE;
        } else if (daysRemaining <= 30) {
            tier = ActionHorizonTier.UPCOMING;
        } else {
            tier = ActionHorizonTier.LOOKING_AHEAD;
        }

        const isHhWide = !item.designatedPersonId && !item.subjectPersonId;
        const targetPersonId = item.designatedPersonId || item.subjectPersonId || null;
        const ownership = resolveOwnership(targetPersonId, ActionHorizonRole.DIRECTIVE_PROXY, isHhWide);

        rawItems.push({
            id: `PROTECTION:${item.id}`,
            sourceEntityId: item.id,
            domain: ActionHorizonDomain.PROTECTION,
            title: item.title || item.name || 'Protection Directive Review',
            subtitle: item.protectionType || item.type || 'Legal & Emergency Continuity',
            dueDate: new Date(dueUtcMs).toISOString().slice(0, 10),
            daysRemaining,
            status: tier,
            assignedPersonId: ownership.assignedPersonId,
            assignedPersonName: ownership.assignedPersonName,
            ownershipRole: ownership.ownershipRole,
            amount: null,
            currency: null,
            targetRoute: ACTION_HORIZON_ROUTES.PROTECTION,
            priority: tier === ActionHorizonTier.OVERDUE ? 'CRITICAL' : (tier === ActionHorizonTier.IMMEDIATE ? 'HIGH' : 'MEDIUM')
        });
    }

    // 5. Deterministic Sort: By daysRemaining ascending, then priority, then title
    const priorityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    rawItems.sort((a, b) => {
        if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
        const pA = priorityWeight[a.priority] || 0;
        const pB = priorityWeight[b.priority] || 0;
        if (pA !== pB) return pB - pA;
        return a.title.localeCompare(b.title);
    });

    // 6. Multi-Criteria Filtering
    const activeFilters = filters || { status: 'ALL', domain: 'ALL', personId: 'ALL' };
    const filteredItems = rawItems.filter(item => {
        if (activeFilters.status && activeFilters.status !== 'ALL' && item.status !== activeFilters.status) {
            return false;
        }
        if (activeFilters.domain && activeFilters.domain !== 'ALL' && item.domain !== activeFilters.domain) {
            return false;
        }
        if (activeFilters.personId && activeFilters.personId !== 'ALL') {
            if (activeFilters.personId === 'UNASSIGNED') {
                if (item.assignedPersonId !== null) return false;
            } else if (item.assignedPersonId !== activeFilters.personId) {
                return false;
            }
        }
        return true;
    });

    // 7. Filter-Dependent Summary Calculation
    const totalActionCount = filteredItems.length;
    let overdueCount = 0;
    let immediateCount = 0;
    let upcomingCount = 0;
    let lookingAheadCount = 0;
    const domainBreakdown = {
        financial: 0,
        document: 0,
        operation: 0,
        protection: 0
    };

    const financialItems = [];
    for (const item of filteredItems) {
        if (item.status === ActionHorizonTier.OVERDUE) overdueCount++;
        else if (item.status === ActionHorizonTier.IMMEDIATE) immediateCount++;
        else if (item.status === ActionHorizonTier.UPCOMING) upcomingCount++;
        else if (item.status === ActionHorizonTier.LOOKING_AHEAD) lookingAheadCount++;

        if (item.domain === ActionHorizonDomain.FINANCIAL) {
            domainBreakdown.financial++;
            if (typeof item.amount === 'number' && item.amount > 0) {
                financialItems.push(item);
            }
        } else if (item.domain === ActionHorizonDomain.DOCUMENT) {
            domainBreakdown.document++;
        } else if (item.domain === ActionHorizonDomain.OPERATION) {
            domainBreakdown.operation++;
        } else if (item.domain === ActionHorizonDomain.PROTECTION) {
            domainBreakdown.protection++;
        }
    }

    // Currency Aggregation: Sum ONLY if all filtered financial items share an identical currency
    let totalMonetaryAmount = null;
    let monetaryCurrency = null;
    if (financialItems.length > 0) {
        const firstCur = financialItems[0].currency || 'INR';
        const isHomogeneous = financialItems.every(f => (f.currency || 'INR') === firstCur);
        if (isHomogeneous) {
            totalMonetaryAmount = financialItems.reduce((acc, curr) => acc + curr.amount, 0);
            monetaryCurrency = firstCur;
        }
    }

    const summary = {
        householdId,
        referenceDate: resolvedRefDateString,
        totalActionCount,
        overdueCount,
        immediateCount,
        upcomingCount,
        lookingAheadCount,
        domainBreakdown,
        totalMonetaryAmount,
        monetaryCurrency,
        diagnostics
    };

    return {
        items: filteredItems,
        summary
    };
}

// ============================================================================
// PHASE 8: FAMILY EMERGENCY READINESS & CRISIS CONTINUITY HUB CONTRACTS
// ============================================================================

export const FAMILY_READINESS_TIER = Object.freeze({
    RESILIENT: 'RESILIENT',       // 90–100 pts: Fully Prepared Household
    PROTECTED: 'PROTECTED',       // 70–89 pts: Substantially Protected
    VULNERABLE: 'VULNERABLE',     // 50–69 pts: Vulnerable (Key Gaps Present)
    CRITICAL: 'CRITICAL'          // 0–49 pts: Critical Action Deficit
});

export const CONTINUITY_ACCESS_LEVEL = Object.freeze({
    LEVEL_1_SUMMARY: 'LEVEL_1_SUMMARY',
    LEVEL_2_PROTECTED: 'LEVEL_2_PROTECTED'
});

export const CONTINUITY_ROUTES = Object.freeze({
    PROTECTION: '/family/protection',
    DOCUMENTS: '/family/more/resources',
    PEOPLE: '/family/people',
    FINANCIALS: '/family/more/financials',
    HOME: '/(tabs)'
});

export const READINESS_DEFICIT_CODES = Object.freeze({
    MISSING_PRIMARY_CONTACT: 'MISSING_PRIMARY_CONTACT',
    MISSING_SECONDARY_CONTACT: 'MISSING_SECONDARY_CONTACT',
    NO_HEALTHCARE_PROXY: 'NO_HEALTHCARE_PROXY',
    MISSING_IDENTITY_DOC: 'MISSING_IDENTITY_DOC',
    MISSING_WILL_DOC: 'MISSING_WILL_DOC',
    EXPIRED_INSURANCE_DOC: 'EXPIRED_INSURANCE_DOC',
    MISSING_MEDICAL_DIRECTIVE: 'MISSING_MEDICAL_DIRECTIVE',
    MISSING_POA_DIRECTIVE: 'MISSING_POA_DIRECTIVE',
    UNASSIGNED_MINOR_GUARDIAN: 'UNASSIGNED_MINOR_GUARDIAN',
    NO_LINKED_FINANCIALS: 'NO_LINKED_FINANCIALS',
    MISSING_LEAD_PAYER: 'MISSING_LEAD_PAYER',
    MISSING_BACKUP_PAYER: 'MISSING_BACKUP_PAYER'
});

export const MANDATORY_CONTINUITY_DISCLAIMER = Object.freeze(
    "Notice & Boundary: The Family Readiness Engine evaluates stored household records and metadata only. " +
    "FinLife does not determine legal enforceability, medical appropriateness, or jurisdictional validity. " +
    "FinLife is an informational continuity protocol and is not an attorney, medical professional, or emergency dispatch service. " +
    "In any life-threatening emergency, immediately contact local emergency services (e.g. 112 / 911 / 999)."
);

/**
 * Validates and sanitizes a phone number for native OS dialer delegation.
 * Rejects null, empty, malformed, non-numeric, or suspicious strings.
 * Sanitizes only dialable characters (+ and 0-9).
 * 
 * @param {string|any} rawPhone 
 * @returns {string|null} Sanitized dialable phone string or null if invalid
 */
export function sanitizePhoneNumberForDialer(rawPhone) {
    if (!rawPhone || typeof rawPhone !== 'string') return null;
    const trimmed = rawPhone.trim();
    if (trimmed.length < 7 || trimmed.length > 25) return null;
    
    // Check for suspicious script injection or non-phone characters
    const validPhonePattern = /^(\+?[0-9\s\-().]{7,25})$/;
    if (!validPhonePattern.test(trimmed)) return null;

    const dialable = trimmed.replace(/[^0-9+]/g, '');
    // Must have at least 7 digits
    const digitsOnly = dialable.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 7) return null;

    return dialable;
}

/**
 * Pure Evaluation Engine for Family Emergency Readiness & Crisis Continuity Protocol (Phase 8).
 * 
 * Ingests authoritative records across Contacts, Documents, Protection, and Financial Links.
 * Computes exact mathematical readiness score (0-100), resilience tier, pillar breakdowns,
 * prioritized deficits, and two-level partitioned emergency data without mutating source records.
 * 
 * @param {Object} params
 * @param {string} [params.householdId] - Target household ID
 * @param {string} params.referenceDateUtc - Mandatory canonical UTC reference date (YYYY-MM-DD)
 * @param {Array} [params.contacts] - Authoritative emergency contacts
 * @param {Array} [params.documents] - Authoritative family documents
 * @param {Array} [params.protectionItems] - Authoritative protection directives
 * @param {Array} [params.financialLinks] - Authoritative family financial links
 * @param {Array} [params.members] - Authoritative household member records
 * @param {string} [params.accessLevel] - LEVEL_1_SUMMARY or LEVEL_2_PROTECTED
 * @param {string} [params.currentUserRole] - Current user role in household
 * @param {boolean} [params.isAuthorizedCaregiver] - Explicit caregiver authorization flag
 * @returns {Object} Deterministic Readiness & Continuity ViewModel
 */
export function computeFamilyReadinessScorePure(rawParams = {}) {
    const params = rawParams && typeof rawParams === 'object' ? rawParams : {};
    const {
        householdId = null,
        referenceDateUtc = null,
        contacts = [],
        documents = [],
        protectionItems = [],
        financialLinks = [],
        members = [],
        accessLevel = CONTINUITY_ACCESS_LEVEL.LEVEL_1_SUMMARY,
        currentUserRole = 'ADULT_MEMBER',
        isAuthorizedCaregiver = false
    } = params;
    // Reference date MUST be explicitly provided for deterministic evaluation
    const refDateUtcString = typeof referenceDateUtc === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(referenceDateUtc.slice(0, 10))
        ? referenceDateUtc.slice(0, 10)
        : '1970-01-01';
    const refTimestamp = parseUtcDateOnly(refDateUtcString) || 0;

    // Filter authoritative collections strictly to target household (tenant isolation)
    const validMembers = (Array.isArray(members) ? members : []).filter(m => 
        m && (!householdId || m.householdId === householdId) && !m.isArchived
    );
    const memberMap = new Map(validMembers.map(m => [m.id, m]));

    const validContacts = (Array.isArray(contacts) ? contacts : []).filter(c => 
        c && (!householdId || c.householdId === householdId)
    );

    const validDocs = (Array.isArray(documents) ? documents : []).filter(d => 
        d && (!householdId || d.householdId === householdId)
    );

    const validProtections = (Array.isArray(protectionItems) ? protectionItems : []).filter(p => 
        p && (!householdId || p.householdId === householdId)
    );

    const validLinks = (Array.isArray(financialLinks) ? financialLinks : []).filter(l => 
        l && (!householdId || l.householdId === householdId)
    );

    // Deficit collector
    const deficits = [];

    // ========================================================================
    // PILLAR 1: Emergency Contacts & Proxies (Max 25 pts)
    // - Primary Contact with valid phone: 10 pts
    // - Secondary Contact with valid phone (distinct person): 5 pts
    // - Healthcare Proxy assigned: 10 pts
    // ========================================================================
    let p1Score = 0;
    const distinctContactPersons = new Set();
    const qualifiedContacts = [];

    for (const c of validContacts) {
        const sanitized = sanitizePhoneNumberForDialer(c.phone || c.phoneNumber);
        const personId = c.personId || c.id;
        if (sanitized && !distinctContactPersons.has(personId)) {
            distinctContactPersons.add(personId);
            qualifiedContacts.push({
                ...c,
                sanitizedPhone: sanitized
            });
        }
    }

    if (qualifiedContacts.length >= 1) {
        p1Score += 10;
    } else {
        deficits.push({
            code: READINESS_DEFICIT_CODES.MISSING_PRIMARY_CONTACT,
            pillar: 1,
            title: 'No Primary Emergency Contact',
            description: 'Designate at least one emergency contact with a dialable phone number.',
            targetRoute: CONTINUITY_ROUTES.PROTECTION,
            pointsLost: 10
        });
    }

    if (qualifiedContacts.length >= 2) {
        p1Score += 5;
    } else {
        deficits.push({
            code: READINESS_DEFICIT_CODES.MISSING_SECONDARY_CONTACT,
            pillar: 1,
            title: 'No Backup Emergency Contact',
            description: 'Add a secondary emergency contact to ensure redundancy during crises.',
            targetRoute: CONTINUITY_ROUTES.PROTECTION,
            pointsLost: 5
        });
    }

    // Healthcare proxy check: Protection item of type HEALTHCARE_PROXY or ADVANCE_HEALTHCARE_DIRECTIVE
    // pointing to a valid, non-archived household member
    let healthcareProxyPerson = null;
    for (const p of validProtections) {
        const pType = (p.type || '').toUpperCase();
        const pCat = (p.category || '').toUpperCase();
        if (p.status === 'ACTIVE' && (pType.includes('PROXY') || pCat.includes('PROXY') || pType.includes('DIRECTIVE') || pCat.includes('MEDICAL'))) {
            const proxyId = p.proxyPersonId || p.assignedPersonId;
            if (proxyId && memberMap.has(proxyId)) {
                healthcareProxyPerson = memberMap.get(proxyId);
                break;
            }
        }
    }

    if (healthcareProxyPerson) {
        p1Score += 10;
    } else {
        deficits.push({
            code: READINESS_DEFICIT_CODES.NO_HEALTHCARE_PROXY,
            pillar: 1,
            title: 'Missing Healthcare Proxy Designation',
            description: 'Designate an active adult household member as medical proxy.',
            targetRoute: CONTINUITY_ROUTES.PROTECTION,
            pointsLost: 10
        });
    }

    // ========================================================================
    // PILLAR 2: Vital Document Coverage (Max 25 pts)
    // - Identity Document present and unexpired: 8 pts
    // - Will / Estate Planning Document present and unexpired: 9 pts
    // - Health Insurance Policy present and unexpired: 8 pts
    // ========================================================================
    let p2Score = 0;
    let hasIdentityDoc = false;
    let hasWillDoc = false;
    let hasHealthInsuranceDoc = false;

    for (const d of validDocs) {
        if (d.status !== 'ACTIVE') continue;

        // Check unexpired status against referenceDateUtc
        let isUnexpired = true;
        if (d.expiryDate) {
            const expTs = parseUtcDateOnly(d.expiryDate);
            if (expTs !== null && expTs < refTimestamp) {
                isUnexpired = false;
            }
        }

        const cat = (d.category || '').toUpperCase();
        const docType = (d.type || '').toUpperCase();

        if (isUnexpired) {
            if (!hasIdentityDoc && (cat === 'IDENTITY' || docType.includes('PASSPORT') || docType.includes('ID') || docType.includes('AADHAAR') || docType.includes('LICENSE'))) {
                hasIdentityDoc = true;
            }
            if (!hasWillDoc && (cat === 'LEGAL' || docType.includes('WILL') || docType.includes('ESTATE') || docType.includes('POA') || docType.includes('POWER_OF_ATTORNEY'))) {
                hasWillDoc = true;
            }
            if (!hasHealthInsuranceDoc && (cat === 'INSURANCE' || docType.includes('HEALTH') || docType.includes('MEDICAL_POLICY') || docType.includes('INSURANCE'))) {
                hasHealthInsuranceDoc = true;
            }
        }
    }

    if (hasIdentityDoc) {
        p2Score += 8;
    } else {
        deficits.push({
            code: READINESS_DEFICIT_CODES.MISSING_IDENTITY_DOC,
            pillar: 2,
            title: 'Missing Active Identity Document',
            description: 'Store an active passport, national ID, or driver license in Document Vault.',
            targetRoute: CONTINUITY_ROUTES.DOCUMENTS,
            pointsLost: 8
        });
    }

    if (hasWillDoc) {
        p2Score += 9;
    } else {
        deficits.push({
            code: READINESS_DEFICIT_CODES.MISSING_WILL_DOC,
            pillar: 2,
            title: 'Missing Will or Estate Plan',
            description: 'Upload will, trust, or estate coordination documentation to Vault.',
            targetRoute: CONTINUITY_ROUTES.DOCUMENTS,
            pointsLost: 9
        });
    }

    if (hasHealthInsuranceDoc) {
        p2Score += 8;
    } else {
        deficits.push({
            code: READINESS_DEFICIT_CODES.EXPIRED_INSURANCE_DOC,
            pillar: 2,
            title: 'Unrecorded or Expired Health Insurance',
            description: 'Add an active, unexpired health insurance policy card or document.',
            targetRoute: CONTINUITY_ROUTES.DOCUMENTS,
            pointsLost: 8
        });
    }

    // ========================================================================
    // PILLAR 3: Protection Directives & Minor Guardianship (Max 25 pts)
    // - Medical Directive recorded and active: 10 pts
    // - Financial POA recorded and active: 8 pts
    // - Minor Child Guardianship: 7 pts (or auto-granted if 0 minors)
    // ========================================================================
    let p3Score = 0;
    let hasMedicalDirective = false;
    let hasPOADirective = false;

    for (const p of validProtections) {
        if (p.status !== 'ACTIVE') continue;
        const pType = (p.type || '').toUpperCase();
        const pCat = (p.category || '').toUpperCase();

        if (!hasMedicalDirective && (pCat === 'MEDICAL' || pType.includes('DIRECTIVE') || pType.includes('DNR') || pType.includes('LIVING_WILL'))) {
            hasMedicalDirective = true;
        }
        if (!hasPOADirective && (pCat === 'LEGAL' || pType.includes('POA') || pType.includes('POWER_OF_ATTORNEY') || pType.includes('FINANCIAL_POA'))) {
            hasPOADirective = true;
        }
    }

    if (hasMedicalDirective) {
        p3Score += 10;
    } else {
        deficits.push({
            code: READINESS_DEFICIT_CODES.MISSING_MEDICAL_DIRECTIVE,
            pillar: 3,
            title: 'Missing Advance Medical Directive',
            description: 'Record healthcare instructions, DNR, or living will directives.',
            targetRoute: CONTINUITY_ROUTES.PROTECTION,
            pointsLost: 10
        });
    }

    if (hasPOADirective) {
        p3Score += 8;
    } else {
        deficits.push({
            code: READINESS_DEFICIT_CODES.MISSING_POA_DIRECTIVE,
            pillar: 3,
            title: 'Missing Power of Attorney Directive',
            description: 'Record financial or durable power of attorney authorizations.',
            targetRoute: CONTINUITY_ROUTES.PROTECTION,
            pointsLost: 8
        });
    }

    // Minor Guardianship evaluation
    const minorDependents = validMembers.filter(m => {
        const role = (m.role || '').toUpperCase();
        const age = typeof m.age === 'number' ? m.age : 99;
        return role === 'CHILD' || role === 'DEPENDENT' || age < 18;
    });

    if (validMembers.length === 0) {
        // Unpopulated household: 0 pts
        p3Score += 0;
    } else if (minorDependents.length === 0) {
        // Childless exemption: adult household with zero minor dependents
        p3Score += 7;
    } else {
        // Must have at least one designated guardian who is a valid, active, non-deleted member
        let hasQualifiedGuardian = false;
        for (const minor of minorDependents) {
            const guardianId = minor.guardianPersonId;
            if (guardianId && memberMap.has(guardianId)) {
                hasQualifiedGuardian = true;
                break;
            }
        }
        // Also check if a protection directive designates a guardian
        if (!hasQualifiedGuardian) {
            for (const p of validProtections) {
                if (p.status === 'ACTIVE' && (p.type || '').toUpperCase().includes('GUARDIAN')) {
                    const gId = p.assignedPersonId || p.proxyPersonId;
                    if (gId && memberMap.has(gId)) {
                        hasQualifiedGuardian = true;
                        break;
                    }
                }
            }
        }

        if (hasQualifiedGuardian) {
            p3Score += 7;
        } else {
            deficits.push({
                code: READINESS_DEFICIT_CODES.UNASSIGNED_MINOR_GUARDIAN,
                pillar: 3,
                title: 'Minor Dependents Without Legal Guardian',
                description: 'Assign a designated adult guardian or custodian for minor household children.',
                targetRoute: CONTINUITY_ROUTES.PEOPLE,
                pointsLost: 7
            });
        }
    }

    // ========================================================================
    // PILLAR 4: Financial & Account Continuity (Max 25 pts)
    // - Primary Financial Linkage recorded: 10 pts
    // - Designated Lead Payer on at least one link: 7 pts
    // - Designated Backup Payer on at least one link: 8 pts
    // ========================================================================
    let p4Score = 0;
    const activeLinks = validLinks.filter(l => l.status === 'ACTIVE' || !l.status);

    if (activeLinks.length > 0) {
        p4Score += 10;
        
        const hasLeadPayer = activeLinks.some(l => l.leadPayerPersonId && memberMap.has(l.leadPayerPersonId));
        if (hasLeadPayer) {
            p4Score += 7;
        } else {
            deficits.push({
                code: READINESS_DEFICIT_CODES.MISSING_LEAD_PAYER,
                pillar: 4,
                title: 'No Lead Payer Assigned',
                description: 'Designate a primary payer responsible for household financial obligations.',
                targetRoute: CONTINUITY_ROUTES.FINANCIALS,
                pointsLost: 7
            });
        }

        const hasBackupPayer = activeLinks.some(l => l.backupPayerPersonId && memberMap.has(l.backupPayerPersonId));
        if (hasBackupPayer) {
            p4Score += 8;
        } else {
            deficits.push({
                code: READINESS_DEFICIT_CODES.MISSING_BACKUP_PAYER,
                pillar: 4,
                title: 'No Backup Payer Configured',
                description: 'Assign a secondary backup payer to safeguard against payment default.',
                targetRoute: CONTINUITY_ROUTES.FINANCIALS,
                pointsLost: 8
            });
        }
    } else {
        deficits.push({
            code: READINESS_DEFICIT_CODES.NO_LINKED_FINANCIALS,
            pillar: 4,
            title: 'No Linked Household Financial Commitments',
            description: 'Link shared household bills and commitments in Financial Coordination.',
            targetRoute: CONTINUITY_ROUTES.FINANCIALS,
            pointsLost: 25
        });
    }

    // ========================================================================
    // TOTAL READINESS SCORE & RESILIENCE TIER
    // ========================================================================
    const totalScore = Math.max(0, Math.min(100, Math.round(p1Score + p2Score + p3Score + p4Score)));

    let tier = FAMILY_READINESS_TIER.CRITICAL;
    if (totalScore >= 90) {
        tier = FAMILY_READINESS_TIER.RESILIENT;
    } else if (totalScore >= 70) {
        tier = FAMILY_READINESS_TIER.PROTECTED;
    } else if (totalScore >= 50) {
        tier = FAMILY_READINESS_TIER.VULNERABLE;
    }

    // Role Authorization for Level 1 vs Level 2
    const isAdultMember = ['HEAD_OF_HOUSEHOLD', 'SPOUSE', 'ADULT_MEMBER'].includes((currentUserRole || '').toUpperCase());
    const isAuthorized = isAdultMember || isAuthorizedCaregiver;

    // Build Dynamic Facts
    const primaryContact = qualifiedContacts[0] || null;
    const secondaryContact = qualifiedContacts[1] || null;
    const primaryContactName = primaryContact ? (primaryContact.name || 'Primary Contact') : null;
    const healthcareProxyName = healthcareProxyPerson ? (healthcareProxyPerson.name || 'Healthcare Proxy') : null;

    // Find first active document location
    const willDoc = validDocs.find(d => d.status === 'ACTIVE' && (d.category === 'LEGAL' || (d.type || '').toUpperCase().includes('WILL')));
    const docLocationDesc = willDoc && willDoc.physicalLocationDescription
        ? willDoc.physicalLocationDescription
        : 'Primary Document Vault';

    // Step-by-step crisis checklist (Static Instructions + Dynamic Facts)
    const checklist = [
        {
            step: 1,
            title: 'Immediate Physical & Medical Safety',
            instruction: 'In any life-threatening emergency, immediately call local emergency dispatch (112 / 911 / 999). FinLife is an informational protocol, not an emergency dispatcher.',
            isCritical: true
        },
        {
            step: 2,
            title: 'Notify Primary Emergency Contact',
            instruction: primaryContactName 
                ? `Reach out directly to ${primaryContactName}. Tap the call button to open your device phone dialer.`
                : 'Primary emergency contact is not yet designated. Tap below to add one.',
            contactName: primaryContactName,
            isCritical: true,
            hasDialAction: Boolean(primaryContact?.sanitizedPhone)
        },
        {
            step: 3,
            title: 'Medical Directives & Healthcare Proxy',
            instruction: healthcareProxyName
                ? `Inform hospital personnel that ${healthcareProxyName} holds designated Healthcare Proxy authority.`
                : 'Healthcare proxy is not designated. Assign a proxy in Protection Directives.',
            proxyName: healthcareProxyName,
            isCritical: false
        },
        {
            step: 4,
            title: 'Retrieve Vital Legal & Insurance Documents',
            instruction: `Vital documentation and policy records can be referenced in ${docLocationDesc} or via Document Vault.`,
            isCritical: false
        }
    ];

    // Partition disclosure into Level 1 Summary and Level 2 Protected
    const emergencySummary = {
        householdId,
        readinessScore: totalScore,
        tier,
        primaryContactName,
        primaryContactRole: primaryContact?.relationshipRole || 'Emergency Contact',
        hasPrimaryDialablePhone: Boolean(primaryContact?.sanitizedPhone),
        primaryDialUri: primaryContact?.sanitizedPhone ? `tel:${primaryContact.sanitizedPhone}` : null,
        secondaryContactName: secondaryContact?.name || null,
        healthcareProxyName,
        documentLocationDescription: docLocationDesc,
        checklist,
        disclaimer: MANDATORY_CONTINUITY_DISCLAIMER
    };

    // Level 2 Protected Details: Only populated if authorized AND requested
    let protectedDetails = null;
    if (accessLevel === CONTINUITY_ACCESS_LEVEL.LEVEL_2_PROTECTED && isAuthorized) {
        protectedDetails = {
            contacts: qualifiedContacts.map(c => ({
                id: c.id,
                name: c.name,
                phone: c.sanitizedPhone,
                role: c.relationshipRole || 'Contact'
            })),
            healthcareProxy: healthcareProxyPerson ? {
                id: healthcareProxyPerson.id,
                name: healthcareProxyPerson.name,
                role: healthcareProxyPerson.role
            } : null,
            vitalDocuments: validDocs.filter(d => d.status === 'ACTIVE').map(d => ({
                id: d.id,
                title: d.title,
                category: d.category,
                expiryDate: d.expiryDate || null,
                location: d.physicalLocationDescription || null
            })),
            financialPayers: activeLinks.map(l => ({
                linkId: l.id,
                commitmentId: l.commitmentId,
                leadPayerName: memberMap.get(l.leadPayerPersonId)?.name || 'Unassigned',
                backupPayerName: memberMap.get(l.backupPayerPersonId)?.name || 'Unassigned'
            }))
        };
    }

    return {
        score: totalScore,
        tier,
        referenceDate: refDateUtcString,
        pillars: {
            contacts: { score: p1Score, maxScore: 25, label: 'Emergency Contacts & Proxies' },
            documents: { score: p2Score, maxScore: 25, label: 'Vital Document Coverage' },
            protection: { score: p3Score, maxScore: 25, label: 'Protection & Directives' },
            financial: { score: p4Score, maxScore: 25, label: 'Financial Continuity' }
        },
        deficits,
        checklist,
        emergencySummary,
        protectedDetails,
        isLevel2Unlocked: Boolean(protectedDetails)
    };
}

// ============================================================================
// PHASE 9: SHARED FAMILY BUDGETING & COLLECTIVE POOL GOVERNANCE CONTRACTS
// ============================================================================

export const BudgetPoolHealthStatus = Object.freeze({
    ON_TRACK: 'ON_TRACK',
    APPROACHING_LIMIT: 'APPROACHING_LIMIT',
    OVER_BUDGET: 'OVER_BUDGET',
    REQUIRES_REVIEW: 'REQUIRES_REVIEW'
});

export const BudgetPoolNumericalStatus = Object.freeze({
    ON_TRACK: 'ON_TRACK',
    APPROACHING_LIMIT: 'APPROACHING_LIMIT',
    OVER_BUDGET: 'OVER_BUDGET'
});

export const BudgetExpenseStatus = Object.freeze({
    SETTLED: 'SETTLED',
    REFUNDED: 'REFUNDED'
});

export const CURRENCY_DIVERGENCE_WARNING = 'Aggregate unavailable because active pools contain different currencies.';

/**
 * Resolves local calendar month boundaries [startUtc, endUtc) given an ISO UTC reference date and IANA timezone.
 * Pure and deterministic.
 */
function resolveMonthBoundaries(referenceDateUtc, timezone) {
    let validTimezone = 'UTC';
    try {
        if (timezone && typeof timezone === 'string') {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            validTimezone = timezone;
        }
    } catch {
        validTimezone = 'UTC';
    }

    const refDate = new Date(referenceDateUtc);
    if (isNaN(refDate.getTime())) {
        throw new Error('INVALID_REFERENCE_DATE');
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: validTimezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    });

    const parts = Object.fromEntries(formatter.formatToParts(refDate).map(p => [p.type, p.value]));
    const year = parseInt(parts.year, 10);
    const month = parseInt(parts.month, 10);
    const currentPeriod = `${year}-${String(month).padStart(2, '0')}`;

    function getTzOffsetMs(date, tz) {
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false
        });
        const p = Object.fromEntries(fmt.formatToParts(date).map(part => [part.type, part.value]));
        const localDate = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour === '24' ? 0 : p.hour, p.minute, p.second));
        return localDate.getTime() - date.getTime();
    }

    const startLocal = Date.UTC(year, month - 1, 1, 0, 0, 0);
    const startOffset = getTzOffsetMs(new Date(startLocal), validTimezone);
    const startUtc = new Date(startLocal - startOffset);

    const endLocal = Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0);
    const endOffset = getTzOffsetMs(new Date(endLocal), validTimezone);
    const endUtc = new Date(endLocal - endOffset);

    return { currentPeriod, startUtc, endUtc, timezone: validTimezone };
}

/**
 * Pure, deterministic evaluation of shared family budget pools.
 * Side-effect free; reads no clocks, network, or storage.
 *
 * @param {Object} params
 * @param {string} params.householdId - Target household ID
 * @param {string} params.referenceDateUtc - ISO UTC reference timestamp (e.g. '2026-09-15T12:00:00.000Z')
 * @param {string} [params.timezone='UTC'] - IANA timezone of the household (e.g. 'Asia/Kolkata')
 * @param {Array} params.pools - Raw pool records from storage
 * @param {Array} params.members - Active household members roster
 * @returns {{ summary: Object, evaluatedPools: Array }}
 */
export function computeHouseholdBudgetPoolsPure({
    householdId,
    referenceDateUtc,
    timezone = 'UTC',
    pools = [],
    members = []
}) {
    if (!householdId) {
        throw new Error('HOUSEHOLD_ID_REQUIRED');
    }
    if (!referenceDateUtc) {
        throw new Error('REFERENCE_DATE_REQUIRED');
    }

    const { currentPeriod, startUtc, endUtc, timezone: resolvedTz } = resolveMonthBoundaries(referenceDateUtc, timezone);
    const startMs = startUtc.getTime();
    const endMs = endUtc.getTime();

    const diagnostics = {
        skippedForeignPools: 0,
        skippedInvalidExpenses: 0,
        unmatchedCurrencies: 0
    };

    const validMembers = Array.isArray(members) ? members : [];
    const memberMap = new Map();
    for (const m of validMembers) {
        if (m && m.id && (m.householdId === householdId || !m.householdId)) {
            memberMap.set(m.id, m);
        }
    }

    const rawPools = Array.isArray(pools) ? pools : [];
    const activePools = [];
    let archivedPoolsCount = 0;

    for (const pool of rawPools) {
        if (!pool || typeof pool !== 'object') continue;
        if (pool.householdId !== householdId) {
            diagnostics.skippedForeignPools++;
            continue;
        }
        if (pool.isArchived === true) {
            archivedPoolsCount++;
            continue;
        }
        activePools.push(pool);
    }

    const evaluatedPools = [];

    for (const pool of activePools) {
        const ceiling = typeof pool.monthlyCeiling === 'number' && !isNaN(pool.monthlyCeiling) && pool.monthlyCeiling >= 0
            ? pool.monthlyCeiling
            : 0;
        const isZeroCap = ceiling === 0;

        // Sum net amounts of linked expenses falling in the current local calendar month [startMs, endMs)
        const rawExpenses = Array.isArray(pool.linkedExpenses) ? pool.linkedExpenses : [];
        let totalSpent = 0;
        const periodExpenses = [];

        for (const exp of rawExpenses) {
            if (!exp || typeof exp !== 'object') continue;
            const expTs = new Date(exp.timestampUtc || exp.timestamp || 0).getTime();
            if (isNaN(expTs) || expTs < startMs || expTs >= endMs) {
                continue; // Not in this evaluation period
            }

            const gross = typeof exp.grossAmount === 'number' && !isNaN(exp.grossAmount)
                ? exp.grossAmount
                : (typeof exp.amount === 'number' && !isNaN(exp.amount) ? exp.amount : NaN);

            if (isNaN(gross) || gross < 0) {
                diagnostics.skippedInvalidExpenses++;
                continue;
            }

            const refund = Math.max(0, typeof exp.effectiveRefundAmount === 'number' && !isNaN(exp.effectiveRefundAmount)
                ? exp.effectiveRefundAmount
                : (typeof exp.refundAmount === 'number' && !isNaN(exp.refundAmount) ? exp.refundAmount : 0));

            const isRefunded = refund >= gross;
            const net = isRefunded ? 0 : Math.max(0, gross - refund);

            totalSpent += net;
            periodExpenses.push({
                ...exp,
                grossAmount: gross,
                effectiveRefundAmount: refund,
                netAmount: net,
                status: isRefunded ? BudgetExpenseStatus.REFUNDED : BudgetExpenseStatus.SETTLED
            });
        }

        totalSpent = Math.round(totalSpent * 100) / 100;

        // Numerical status evaluation
        let numericalStatus;
        let remainingBuffer;
        let utilizationPercent;

        if (isZeroCap) {
            if (totalSpent === 0) {
                numericalStatus = BudgetPoolNumericalStatus.ON_TRACK;
                remainingBuffer = 0;
                utilizationPercent = 0.0;
            } else {
                numericalStatus = BudgetPoolNumericalStatus.OVER_BUDGET;
                remainingBuffer = -totalSpent;
                utilizationPercent = 999.0;
            }
        } else {
            remainingBuffer = Math.round((ceiling - totalSpent) * 100) / 100;
            utilizationPercent = Math.round((totalSpent / ceiling) * 10000) / 100;

            if (utilizationPercent <= 80.0) {
                numericalStatus = BudgetPoolNumericalStatus.ON_TRACK;
            } else if (utilizationPercent <= 100.0) {
                numericalStatus = BudgetPoolNumericalStatus.APPROACHING_LIMIT;
            } else {
                numericalStatus = BudgetPoolNumericalStatus.OVER_BUDGET;
            }
        }

        // Evaluate contributor split version
        let activeSplitVersion = null;
        let reviewRequired = false;
        let statusReason = null;

        const splitVersions = Array.isArray(pool.contributorSplitVersions) ? pool.contributorSplitVersions : [];
        if (splitVersions.length === 0) {
            reviewRequired = true;
            statusReason = 'NO_SPLIT_VERSIONS_DEFINED';
        } else {
            // Find versions where effectivePeriod <= currentPeriod
            const eligibleVersions = splitVersions
                .filter(v => v && typeof v.effectivePeriod === 'string' && v.effectivePeriod <= currentPeriod)
                .sort((a, b) => b.effectivePeriod.localeCompare(a.effectivePeriod));

            if (eligibleVersions.length > 0) {
                activeSplitVersion = eligibleVersions[0];
            } else {
                // Fall back to earliest version
                const sortedAll = [...splitVersions]
                    .filter(v => v && typeof v.effectivePeriod === 'string')
                    .sort((a, b) => a.effectivePeriod.localeCompare(b.effectivePeriod));
                activeSplitVersion = sortedAll[0] || null;
            }

            if (!activeSplitVersion || !Array.isArray(activeSplitVersion.contributorSplits) || activeSplitVersion.contributorSplits.length === 0) {
                reviewRequired = true;
                statusReason = 'NO_SPLIT_VERSIONS_DEFINED';
            } else {
                // Verify split sum
                const splitSum = activeSplitVersion.contributorSplits.reduce((acc, s) => acc + (Number(s.targetRatioPercent) || 0), 0);
                if (Math.abs(splitSum - 100) > 0.01) {
                    reviewRequired = true;
                    statusReason = 'SPLIT_SUM_NOT_100';
                }

                // Verify orphaned contributors
                for (const s of activeSplitVersion.contributorSplits) {
                    if (!memberMap.has(s.personId)) {
                        reviewRequired = true;
                        statusReason = 'ORPHANED_CONTRIBUTOR';
                        break;
                    }
                }
            }
        }

        // Primary status reflects reviewRequired without obscuring numericalStatus
        const primaryStatus = reviewRequired
            ? BudgetPoolHealthStatus.REQUIRES_REVIEW
            : numericalStatus;

        // Compute fairness deltas only if data integrity is valid
        let fairnessBreakdown = null;
        if (!reviewRequired && activeSplitVersion && Array.isArray(activeSplitVersion.contributorSplits)) {
            fairnessBreakdown = activeSplitVersion.contributorSplits.map(split => {
                const member = memberMap.get(split.personId);
                const targetRatio = Number(split.targetRatioPercent) || 0;
                const expectedShare = Math.round((totalSpent * (targetRatio / 100)) * 100) / 100;

                const actualContributed = periodExpenses
                    .filter(e => e.contributedByPersonId === split.personId)
                    .reduce((acc, e) => acc + (e.netAmount || 0), 0);
                const actualRounded = Math.round(actualContributed * 100) / 100;

                const delta = Math.round((actualRounded - expectedShare) * 100) / 100;

                return {
                    personId: split.personId,
                    personName: member ? (member.displayName || member.name || 'Member') : 'Unknown',
                    targetRatioPercent: targetRatio,
                    expectedShareAmount: expectedShare,
                    actualContributedAmount: actualRounded,
                    netBalanceDelta: delta
                };
            });
        }

        evaluatedPools.push({
            poolId: pool.id,
            name: pool.name || 'Untitled Pool',
            category: pool.category || 'GENERAL',
            currency: pool.currency || 'INR',
            monthlyCeiling: ceiling,
            spent: totalSpent,
            remainingBuffer,
            utilizationPercent,
            status: primaryStatus,
            numericalStatus,
            reviewRequired,
            statusReason,
            activeSplitVersion,
            fairnessBreakdown,
            isZeroCap
        });
    }

    // Collective Summary
    const distinctCurrencies = Array.from(new Set(evaluatedPools.map(p => p.currency)));
    let summaryCurrency = null;
    let totalCeiling = null;
    let totalSpent = null;
    let totalRemainingBuffer = null;
    let overallUtilizationPercent = null;
    let overallNumericalStatus = null;
    let currencyDivergenceWarning = null;

    const anyPoolRequiresReview = evaluatedPools.some(p => p.reviewRequired);

    if (distinctCurrencies.length === 0) {
        summaryCurrency = null;
        totalCeiling = 0;
        totalSpent = 0;
        totalRemainingBuffer = 0;
        overallUtilizationPercent = 0.0;
        overallNumericalStatus = BudgetPoolNumericalStatus.ON_TRACK;
    } else if (distinctCurrencies.length === 1) {
        summaryCurrency = distinctCurrencies[0];
        totalCeiling = evaluatedPools.reduce((acc, p) => acc + p.monthlyCeiling, 0);
        totalSpent = evaluatedPools.reduce((acc, p) => acc + p.spent, 0);
        totalCeiling = Math.round(totalCeiling * 100) / 100;
        totalSpent = Math.round(totalSpent * 100) / 100;
        totalRemainingBuffer = Math.round((totalCeiling - totalSpent) * 100) / 100;

        if (totalCeiling === 0) {
            if (totalSpent === 0) {
                overallUtilizationPercent = 0.0;
                overallNumericalStatus = BudgetPoolNumericalStatus.ON_TRACK;
            } else {
                overallUtilizationPercent = 999.0;
                overallNumericalStatus = BudgetPoolNumericalStatus.OVER_BUDGET;
            }
        } else {
            overallUtilizationPercent = Math.round((totalSpent / totalCeiling) * 10000) / 100;
            if (overallUtilizationPercent <= 80.0) {
                overallNumericalStatus = BudgetPoolNumericalStatus.ON_TRACK;
            } else if (overallUtilizationPercent <= 100.0) {
                overallNumericalStatus = BudgetPoolNumericalStatus.APPROACHING_LIMIT;
            } else {
                overallNumericalStatus = BudgetPoolNumericalStatus.OVER_BUDGET;
            }
        }
    } else {
        // Multi-currency divergence: Aggregate values are strictly UNAVAILABLE
        summaryCurrency = null;
        totalCeiling = null;
        totalSpent = null;
        totalRemainingBuffer = null;
        overallUtilizationPercent = null;
        overallNumericalStatus = null;
        currencyDivergenceWarning = CURRENCY_DIVERGENCE_WARNING;
        diagnostics.unmatchedCurrencies = distinctCurrencies.length;
    }

    const reviewRequired = anyPoolRequiresReview || distinctCurrencies.length > 1;
    let overallStatus;
    if (reviewRequired) {
        overallStatus = BudgetPoolHealthStatus.REQUIRES_REVIEW;
    } else {
        overallStatus = overallNumericalStatus;
    }

    const summary = {
        householdId,
        evaluationPeriod: currentPeriod,
        timezone: resolvedTz,
        currency: summaryCurrency,
        totalCeiling,
        totalSpent,
        totalRemainingBuffer,
        overallUtilizationPercent,
        overallStatus,
        overallNumericalStatus,
        reviewRequired,
        currencyDivergenceWarning,
        activePoolsCount: evaluatedPools.length,
        archivedPoolsCount,
        diagnostics
    };

    return {
        summary,
        evaluatedPools
    };
}

// ============================================================================
// PHASE 10: HOUSEHOLD FINANCIAL FORECASTING & SCENARIO PLANNING
// ============================================================================

export const ForecastHorizon = Object.freeze({
    DAYS_7: 7,
    DAYS_30: 30,
    DAYS_90: 90,
    DAYS_365: 365
});

export const ForecastRiskType = Object.freeze({
    LIQUIDITY_DEFICIT: 'LIQUIDITY_DEFICIT',
    COMMITMENT_CLUSTERING: 'COMMITMENT_CLUSTERING',
    BUDGET_EXHAUSTION_RISK: 'BUDGET_EXHAUSTION_RISK',
    SINGLE_EARNER_EXPOSURE: 'SINGLE_EARNER_EXPOSURE',
    DATA_GAP_UNCERTAINTY: 'DATA_GAP_UNCERTAINTY'
});

export const RiskSeverity = Object.freeze({
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
    INFO: 'INFO'
});

export const SEVERITY_PRECEDENCE = Object.freeze({
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    INFO: 1
});

export const IncomeFrequency = Object.freeze({
    WEEKLY: 'WEEKLY',
    BIWEEKLY: 'BIWEEKLY',
    MONTHLY: 'MONTHLY',
    ANNUAL: 'ANNUAL'
});

export const FORECAST_CURRENCY_DIVERGENCE_WARNING =
    'Aggregate forecast unavailable because commitments contain multiple currencies.';

/**
 * Returns number of days in a calendar month, taking leap years into account.
 * @param {number} year 
 * @param {number} month - 1-indexed (1 = Jan, 12 = Dec)
 */
export function getDaysInMonth(year, month) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const daysPerMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysPerMonth[month - 1];
}

/**
 * Factory for creating an empty FamilyForecastScenario
 */
export function createEmptyForecastScenario(overrides = {}) {
    return {
        id: overrides.id || `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        householdId: overrides.householdId || null,
        name: typeof overrides.name === 'string' ? overrides.name.trim() : 'Simulation Scenario',
        description: typeof overrides.description === 'string' ? overrides.description.trim() : '',
        incomeAdjustmentPercent: typeof overrides.incomeAdjustmentPercent === 'number' ? overrides.incomeAdjustmentPercent : 0,
        expenseShocks: Array.isArray(overrides.expenseShocks) ? [...overrides.expenseShocks] : [],
        contributorDefaults: Array.isArray(overrides.contributorDefaults) ? [...overrides.contributorDefaults] : [],
        createdAt: overrides.createdAt || null,
        updatedAt: overrides.updatedAt || null
    };
}

/**
 * Validates a FamilyForecastScenario bookmark
 */
export function validateForecastScenario(scenario) {
    if (!scenario || typeof scenario !== 'object') {
        throw new Error('Forecast scenario must be an object');
    }
    if (!scenario.id || typeof scenario.id !== 'string' || !scenario.id.trim()) {
        throw new Error("Forecast scenario 'id' is required");
    }
    if (!scenario.householdId || typeof scenario.householdId !== 'string' || !scenario.householdId.trim()) {
        throw new Error("Forecast scenario 'householdId' is required");
    }
    if (typeof scenario.incomeAdjustmentPercent === 'number' && (scenario.incomeAdjustmentPercent < -100 || scenario.incomeAdjustmentPercent > 500)) {
        throw new Error('incomeAdjustmentPercent must be between -100 and +500');
    }
    return true;
}

/**
 * Daily calendar-day budget pool proration engine.
 * Prorates monthly ceilings across interval [startUtc, endUtc) based on actual month lengths.
 */
export function prorateBudgetPoolCeilingsPure({ pools = [], startUtc, endUtc }) {
    const startTime = new Date(startUtc).getTime();
    const endTime = new Date(endUtc).getTime();
    if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) return [];
    const safePools = Array.isArray(pools) ? pools : [];

    return safePools.filter(p => p && !p.isArchived).map(pool => {
        const ceiling = typeof pool.monthlyCeiling === 'number' && !isNaN(pool.monthlyCeiling) && pool.monthlyCeiling >= 0
            ? pool.monthlyCeiling
            : 0;

        if (ceiling === 0) {
            return {
                poolId: pool.id,
                name: pool.name,
                category: pool.category,
                currency: pool.currency || 'INR',
                monthlyCeiling: 0,
                proratedCeiling: 0,
                isZeroCap: true
            };
        }

        let totalProrated = 0;
        let cursor = new Date(startTime);
        const end = new Date(endTime);

        while (cursor < end) {
            const y = cursor.getUTCFullYear();
            const m = cursor.getUTCMonth() + 1;
            const daysInM = getDaysInMonth(y, m);
            const dailyRate = ceiling / daysInM;

            const nextDay = new Date(cursor);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            nextDay.setUTCHours(0, 0, 0, 0);

            const dayWindowStart = Math.max(cursor.getTime(), startTime);
            const dayWindowEnd = Math.min(nextDay.getTime(), endTime);
            const fractionOfDay = Math.max(0, (dayWindowEnd - dayWindowStart) / (24 * 3600 * 1000));

            totalProrated += dailyRate * fractionOfDay;
            cursor = nextDay;
        }

        return {
            poolId: pool.id,
            name: pool.name,
            category: pool.category,
            currency: pool.currency || 'INR',
            monthlyCeiling: ceiling,
            proratedCeiling: Math.round(totalProrated * 100) / 100,
            isZeroCap: false
        };
    });
}

/**
 * Generates commitment occurrences within [startUtc, endUtc) with calendar clamping & leap-year rules.
 */
export function generateCommitmentOccurrencesPure({ commitments = [], startUtc, endUtc }) {
    const startTime = new Date(startUtc).getTime();
    const endTime = new Date(endUtc).getTime();
    const occurrences = [];
    const diagnostics = { skippedInvalidCommitments: 0 };

    if (isNaN(startTime) || isNaN(endTime)) return { occurrences, diagnostics };
    const safeCommitments = Array.isArray(commitments) ? commitments : [];

    for (const c of safeCommitments) {
        if (!c || c.status !== 'ACTIVE') continue;

        const amount = typeof c.amount === 'number' ? c.amount : parseFloat(c.amount);
        if (isNaN(amount) || amount < 0) {
            diagnostics.skippedInvalidCommitments++;
            continue;
        }

        const anchorIso = c.nextDueDateUtc || c.dueDateUtc || c.anchorDateUtc || c.createdAt;
        if (!anchorIso) {
            diagnostics.skippedInvalidCommitments++;
            continue;
        }

        const anchorDate = new Date(anchorIso);
        if (isNaN(anchorDate.getTime())) {
            diagnostics.skippedInvalidCommitments++;
            continue;
        }

        const frequency = (c.frequency || 'MONTHLY').toUpperCase();
        const currency = c.currency || 'INR';
        const anchorDay = anchorDate.getUTCDate();

        if (frequency === 'ONE_TIME') {
            const t = anchorDate.getTime();
            if (t >= startTime && t < endTime) {
                occurrences.push({
                    occurrenceId: `${c.id}_${t}`,
                    commitmentId: c.id,
                    name: c.name || 'Commitment',
                    amount,
                    currency,
                    occurrenceTimestampUtc: new Date(t).toISOString(),
                    frequency
                });
            }
            continue;
        }

        let cursor = new Date(anchorDate.getTime());
        let iterations = 0;
        const MAX_ITERATIONS = 500;

        while (cursor.getTime() < endTime && iterations < MAX_ITERATIONS) {
            iterations++;
            const t = cursor.getTime();

            if (t >= startTime && t < endTime) {
                occurrences.push({
                    occurrenceId: `${c.id}_${t}`,
                    commitmentId: c.id,
                    name: c.name || 'Commitment',
                    amount,
                    currency,
                    occurrenceTimestampUtc: new Date(t).toISOString(),
                    frequency
                });
            }

            if (frequency === 'WEEKLY') {
                cursor.setUTCDate(cursor.getUTCDate() + 7);
            } else if (frequency === 'BIWEEKLY') {
                cursor.setUTCDate(cursor.getUTCDate() + 14);
            } else if (frequency === 'MONTHLY' || frequency === 'QUARTERLY' || frequency === 'SEMI_ANNUAL') {
                const monthsToAdd = frequency === 'MONTHLY' ? 1 : (frequency === 'QUARTERLY' ? 3 : 6);
                const targetYear = cursor.getUTCFullYear() + Math.floor((cursor.getUTCMonth() + monthsToAdd) / 12);
                const targetMonth = ((cursor.getUTCMonth() + monthsToAdd) % 12) + 1;
                const daysInTargetMonth = getDaysInMonth(targetYear, targetMonth);
                const targetDay = Math.min(anchorDay, daysInTargetMonth);
                cursor = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay, anchorDate.getUTCHours(), anchorDate.getUTCMinutes(), anchorDate.getUTCSeconds(), anchorDate.getUTCMilliseconds()));
            } else if (frequency === 'ANNUAL') {
                const targetYear = cursor.getUTCFullYear() + 1;
                const targetMonth = anchorDate.getUTCMonth() + 1;
                const daysInTargetMonth = getDaysInMonth(targetYear, targetMonth);
                const targetDay = Math.min(anchorDay, daysInTargetMonth);
                cursor = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay, anchorDate.getUTCHours(), anchorDate.getUTCMinutes(), anchorDate.getUTCSeconds(), anchorDate.getUTCMilliseconds()));
            } else {
                cursor.setUTCMonth(cursor.getUTCMonth() + 1);
            }
        }
    }

    return { occurrences, diagnostics };
}

/**
 * Generates member income stream occurrences within [startUtc, endUtc).
 */
export function generateIncomeOccurrencesPure({ incomeStreams = [], members = [], startUtc, endUtc }) {
    const startTime = new Date(startUtc).getTime();
    const endTime = new Date(endUtc).getTime();
    const occurrences = [];
    const diagnostics = {
        noActiveStreams: false,
        inactiveStreamsCount: 0,
        unpricedStreamsCount: 0
    };

    const safeMembers = Array.isArray(members) ? members : [];
    const safeStreams = Array.isArray(incomeStreams) ? incomeStreams : [];

    const activeMemberIds = new Set(
        safeMembers.filter(m => m && (!m.status || m.status === 'ACTIVE')).map(m => m.id)
    );

    const activeStreams = safeStreams.filter(s => {
        if (!s) return false;
        if (s.status !== 'ACTIVE') {
            diagnostics.inactiveStreamsCount++;
            return false;
        }
        if (s.personId && !activeMemberIds.has(s.personId)) {
            return false;
        }
        return true;
    });

    if (activeStreams.length === 0) {
        diagnostics.noActiveStreams = true;
        return { occurrences, diagnostics };
    }

    for (const s of activeStreams) {
        const amount = typeof s.amount === 'number' ? s.amount : parseFloat(s.amount);
        if (isNaN(amount) || amount < 0) {
            diagnostics.unpricedStreamsCount++;
            continue;
        }

        const currency = s.currency || 'INR';
        const startBound = s.effectiveStartDateUtc ? new Date(s.effectiveStartDateUtc).getTime() : startTime;
        const endBound = s.effectiveEndDateUtc ? new Date(s.effectiveEndDateUtc).getTime() : endTime;

        const effectiveWindowStart = Math.max(startTime, startBound);
        const effectiveWindowEnd = Math.min(endTime, endBound);
        if (effectiveWindowStart >= effectiveWindowEnd) continue;

        const frequency = (s.frequency || 'MONTHLY').toUpperCase();
        const payDay = typeof s.payDayOfMonth === 'number' ? s.payDayOfMonth : 1;

        let cursor;
        if (frequency === 'MONTHLY') {
            const startYear = new Date(effectiveWindowStart).getUTCFullYear();
            const startMonth = new Date(effectiveWindowStart).getUTCMonth() + 1;
            const daysInM = getDaysInMonth(startYear, startMonth);
            const clampedDay = Math.min(payDay, daysInM);
            const candidateThisMonth = new Date(Date.UTC(startYear, startMonth - 1, clampedDay, 9, 0, 0, 0));

            if (candidateThisMonth.getTime() >= effectiveWindowStart) {
                cursor = candidateThisMonth;
            } else {
                const nextYear = startYear + Math.floor(startMonth / 12);
                const nextMonth = (startMonth % 12) + 1;
                const clampedNextDay = Math.min(payDay, getDaysInMonth(nextYear, nextMonth));
                cursor = new Date(Date.UTC(nextYear, nextMonth - 1, clampedNextDay, 9, 0, 0, 0));
            }
        } else {
            cursor = new Date(effectiveWindowStart);
        }

        let iterations = 0;

        while (cursor.getTime() < effectiveWindowEnd && iterations < 500) {
            iterations++;
            const t = cursor.getTime();
            if (t >= effectiveWindowStart && t < effectiveWindowEnd) {
                occurrences.push({
                    occurrenceId: `inc_${s.id}_${t}`,
                    streamId: s.id,
                    personId: s.personId,
                    name: s.name || 'Income',
                    amount,
                    currency,
                    occurrenceTimestampUtc: new Date(t).toISOString()
                });
            }

            if (frequency === 'WEEKLY') {
                cursor.setUTCDate(cursor.getUTCDate() + 7);
            } else if (frequency === 'BIWEEKLY') {
                cursor.setUTCDate(cursor.getUTCDate() + 14);
            } else if (frequency === 'MONTHLY') {
                const targetYear = cursor.getUTCFullYear() + Math.floor((cursor.getUTCMonth() + 1) / 12);
                const targetMonth = ((cursor.getUTCMonth() + 1) % 12) + 1;
                const daysInMonth = getDaysInMonth(targetYear, targetMonth);
                const clampedDay = Math.min(payDay, daysInMonth);
                cursor = new Date(Date.UTC(targetYear, targetMonth - 1, clampedDay, 9, 0, 0, 0));
            } else {
                cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
            }
        }
    }

    return { occurrences, diagnostics };
}

/**
 * Detects rolling 72-hour commitment clustering:
 * Triggers when at least 3 distinct commitment occurrences fall in [t, t + 72h).
 */
export function detectRollingCommitmentClustering({ occurrences = [], windowHours = 72 }) {
    if (!occurrences || occurrences.length < 3) return null;

    const sorted = [...occurrences].sort((a, b) =>
        new Date(a.occurrenceTimestampUtc).getTime() - new Date(b.occurrenceTimestampUtc).getTime()
    );

    const windowMs = windowHours * 3600 * 1000;

    for (let i = 0; i < sorted.length; i++) {
        const windowStart = new Date(sorted[i].occurrenceTimestampUtc).getTime();
        const windowEnd = windowStart + windowMs;

        const clusterItems = [];
        for (let j = i; j < sorted.length; j++) {
            const t = new Date(sorted[j].occurrenceTimestampUtc).getTime();
            if (t >= windowStart && t < windowEnd) {
                clusterItems.push(sorted[j]);
            } else if (t >= windowEnd) {
                break;
            }
        }

        if (clusterItems.length >= 3) {
            return {
                riskType: ForecastRiskType.COMMITMENT_CLUSTERING,
                severity: RiskSeverity.MEDIUM,
                onsetTimestampUtc: sorted[i].occurrenceTimestampUtc,
                windowHours,
                count: clusterItems.length,
                commitmentIds: Array.from(new Set(clusterItems.map(c => c.commitmentId))),
                totalAmount: clusterItems.reduce((acc, c) => acc + c.amount, 0),
                description: `${clusterItems.length} fixed commitments cluster within a 72-hour window starting ${sorted[i].occurrenceTimestampUtc.substring(0, 10)}.`
            };
        }
    }

    return null;
}

/**
 * Evaluates budget exhaustion pace risks:
 * Triggers when spending pace indicates ceiling will deplete before 70% of month elapsed.
 */
export function evaluateBudgetExhaustionRiskPure({ budgetPools = [], referenceDateUtc }) {
    const refDate = new Date(referenceDateUtc);
    const y = refDate.getUTCFullYear();
    const m = refDate.getUTCMonth() + 1;
    const daysInMonth = getDaysInMonth(y, m);
    const daysElapsed = Math.max(1, refDate.getUTCDate());

    const safePools = Array.isArray(budgetPools) ? budgetPools : [];
    const risks = [];

    for (const pool of safePools) {
        if (!pool || pool.isArchived) continue;
        const ceiling = typeof pool.monthlyCeiling === 'number' ? pool.monthlyCeiling : 0;
        if (ceiling <= 0) continue; // Zero-cap pools strictly excluded

        const spent = typeof pool.spent === 'number' ? pool.spent : (typeof pool.totalSpent === 'number' ? pool.totalSpent : 0);
        if (spent <= 0) continue; // No spend yet

        const spendPace = spent / daysElapsed;
        const depletionDay = Math.ceil(ceiling / spendPace);
        const thresholdDay = Math.ceil(0.70 * daysInMonth);

        if (depletionDay <= thresholdDay) {
            risks.push({
                riskType: ForecastRiskType.BUDGET_EXHAUSTION_RISK,
                severity: RiskSeverity.MEDIUM,
                poolId: pool.id,
                poolName: pool.name,
                currency: pool.currency || 'INR',
                depletionDay,
                thresholdDay,
                ceiling,
                spent,
                description: `Spending pace in pool '${pool.name}' indicates ceiling will deplete on Day ${depletionDay} (before 70% of month elapsed).`
            });
        }
    }

    return risks;
}

/**
 * Sorts and deduplicates risk indicators by severity precedence, onset timestamp, and type.
 */
export function orderAndDeduplicateRiskIndicators(indicators = []) {
    const map = new Map();
    for (const ind of indicators) {
        const key = `${ind.riskType}_${ind.poolId || ind.commitmentId || ind.onsetTimestampUtc || 'gen'}`;
        if (!map.has(key)) {
            map.set(key, ind);
        }
    }

    const uniqueList = Array.from(map.values());

    return uniqueList.sort((a, b) => {
        const pA = SEVERITY_PRECEDENCE[a.severity] || 0;
        const pB = SEVERITY_PRECEDENCE[b.severity] || 0;
        if (pB !== pA) return pB - pA;

        const tA = a.onsetTimestampUtc ? new Date(a.onsetTimestampUtc).getTime() : 0;
        const tB = b.onsetTimestampUtc ? new Date(b.onsetTimestampUtc).getTime() : 0;
        if (tA !== tB) return tA - tB;

        return (a.riskType || '').localeCompare(b.riskType || '');
    });
}

/**
 * Pure, deterministic cash-flow forecasting engine for Phase 10.
 * Ingests fixed commitments, budget pool allowances, renewals, and member income streams.
 * Clock-independent: never calls new Date() or Date.now().
 */
export function computeHouseholdFinancialForecastPure({
    householdId,
    referenceDateUtc,
    horizonDays = 30,
    commitments = [],
    budgetPools = [],
    incomeStreams = [],
    renewalActions = [],
    members = []
}) {
    if (!householdId) throw new Error('householdId is required');
    if (!referenceDateUtc) throw new Error('referenceDateUtc is required');

    const startTime = new Date(referenceDateUtc).getTime();
    if (isNaN(startTime)) throw new Error(`Invalid referenceDateUtc: ${referenceDateUtc}`);

    const safeCommitments = Array.isArray(commitments) ? commitments : [];
    const safePools = Array.isArray(budgetPools) ? budgetPools : [];
    const safeIncomeStreams = Array.isArray(incomeStreams) ? incomeStreams : [];
    const safeRenewals = Array.isArray(renewalActions) ? renewalActions : [];
    const safeMembers = Array.isArray(members) ? members : [];

    const horizonMs = (horizonDays || 30) * 86400000;
    const endTime = startTime + horizonMs;
    const endUtc = new Date(endTime).toISOString();

    const diagnostics = {
        skippedInvalidRecords: 0,
        unpricedRenewalsCount: 0
    };

    // 1. Generate commitment occurrences in [startUtc, endUtc)
    const { occurrences: commitmentOccurrences, diagnostics: commitDiag } =
        generateCommitmentOccurrencesPure({ commitments: safeCommitments, startUtc: referenceDateUtc, endUtc });
    diagnostics.skippedInvalidRecords += commitDiag.skippedInvalidCommitments;

    // 2. Daily prorated budget pool allowances in [startUtc, endUtc)
    const proratedPools = prorateBudgetPoolCeilingsPure({ pools: safePools, startUtc: referenceDateUtc, endUtc });

    // 3. Renewal outflows from Phase 7 renewal actions in [startUtc, endUtc)
    const renewalOccurrences = [];
    for (const r of safeRenewals) {
        if (!r) continue;
        const renewalDate = r.dueDateUtc || r.expirationDateUtc;
        if (!renewalDate) continue;
        const t = new Date(renewalDate).getTime();
        if (t >= startTime && t < endTime) {
            const cost = typeof r.renewalEstimatedCost === 'number' ? r.renewalEstimatedCost : (typeof r.cost === 'number' ? r.cost : null);
            if (cost !== null && !isNaN(cost) && cost > 0) {
                renewalOccurrences.push({
                    occurrenceId: `ren_${r.id}_${t}`,
                    actionId: r.id,
                    name: r.title || r.name || 'Renewal',
                    amount: cost,
                    currency: r.currency || 'INR',
                    occurrenceTimestampUtc: new Date(t).toISOString()
                });
            } else {
                diagnostics.unpricedRenewalsCount++;
            }
        }
    }

    // 4. Generate income occurrences in [startUtc, endUtc)
    const { occurrences: incomeOccurrences, diagnostics: incomeDiag } =
        generateIncomeOccurrencesPure({ incomeStreams: safeIncomeStreams, members: safeMembers, startUtc: referenceDateUtc, endUtc });

    // 5. Multi-Currency Analysis
    const distinctCurrencies = new Set();
    commitmentOccurrences.forEach(c => distinctCurrencies.add(c.currency));
    proratedPools.forEach(p => distinctCurrencies.add(p.currency));
    renewalOccurrences.forEach(r => distinctCurrencies.add(r.currency));
    incomeOccurrences.forEach(i => distinctCurrencies.add(i.currency));

    const isCurrencyDivergent = distinctCurrencies.size > 1;
    const singleCurrency = distinctCurrencies.size === 1 ? Array.from(distinctCurrencies)[0] : (distinctCurrencies.size === 0 ? 'INR' : null);

    let projectedInflow = null;
    let projectedOutflow = null;
    let netProjectedLiquidityDelta = null;
    let currencyDivergenceWarning = null;

    if (isCurrencyDivergent) {
        currencyDivergenceWarning = FORECAST_CURRENCY_DIVERGENCE_WARNING;
    } else {
        const totalInflows = incomeOccurrences.reduce((acc, i) => acc + i.amount, 0);
        const totalCommitments = commitmentOccurrences.reduce((acc, c) => acc + c.amount, 0);
        const totalProratedPools = proratedPools.reduce((acc, p) => acc + p.proratedCeiling, 0);
        const totalRenewals = renewalOccurrences.reduce((acc, r) => acc + r.amount, 0);

        projectedInflow = Math.round(totalInflows * 100) / 100;
        projectedOutflow = Math.round((totalCommitments + totalProratedPools + totalRenewals) * 100) / 100;
        netProjectedLiquidityDelta = Math.round((projectedInflow - projectedOutflow) * 100) / 100;
    }

    // 6. Confidence Scoring Contract
    let confidenceScore = 100;
    const missingFactors = [];

    // Check Assertion 13 contract:
    // A household with no active income streams flags NO_INCOME_RECORD_FOUND.
    // A household with at least one active income stream whose amount is 0 does not flag NO_INCOME_RECORD_FOUND.
    if (incomeDiag.noActiveStreams) {
        confidenceScore -= 30;
        missingFactors.push('NO_INCOME_RECORD_FOUND');
    }
    if (diagnostics.unpricedRenewalsCount > 0) {
        confidenceScore -= Math.min(40, diagnostics.unpricedRenewalsCount * 20);
        missingFactors.push('MISSING_RENEWAL_COSTS');
    }

    confidenceScore = Math.max(0, Math.min(100, confidenceScore));
    const confidenceRating = confidenceScore >= 80 ? 'HIGH' : (confidenceScore >= 50 ? 'MEDIUM' : 'LOW');

    // 7. Risk Indicators
    const rawRisks = [];

    if (confidenceScore <= 50) {
        rawRisks.push({
            riskType: ForecastRiskType.DATA_GAP_UNCERTAINTY,
            severity: RiskSeverity.INFO,
            missingFactors,
            score: confidenceScore,
            description: 'Forecast confidence is limited due to missing income or unpriced renewals.'
        });
    }

    if (!isCurrencyDivergent && netProjectedLiquidityDelta !== null && netProjectedLiquidityDelta < 0) {
        rawRisks.push({
            riskType: ForecastRiskType.LIQUIDITY_DEFICIT,
            severity: RiskSeverity.HIGH,
            deficitAmount: Math.abs(netProjectedLiquidityDelta),
            onsetTimestampUtc: referenceDateUtc,
            description: `Projected outflows exceed inflows by ${Math.abs(netProjectedLiquidityDelta)} over the ${horizonDays}-day horizon.`
        });
    }

    // Rolling 72-hour clustering
    const clusteringRisk = detectRollingCommitmentClustering({ occurrences: commitmentOccurrences, windowHours: 72 });
    if (clusteringRisk) {
        if (isCurrencyDivergent) {
            clusteringRisk.totalAmount = null; // Multi-currency suppression
        }
        rawRisks.push(clusteringRisk);
    }

    // Budget exhaustion risks
    const exhaustionRisks = evaluateBudgetExhaustionRiskPure({ budgetPools: safePools, referenceDateUtc });
    rawRisks.push(...exhaustionRisks);

    // Single-earner exposure
    if (incomeOccurrences.length > 0) {
        const incomePerPerson = {};
        let totalIncome = 0;
        for (const inc of incomeOccurrences) {
            incomePerPerson[inc.personId] = (incomePerPerson[inc.personId] || 0) + inc.amount;
            totalIncome += inc.amount;
        }
        if (totalIncome > 0) {
            for (const [pId, pIncome] of Object.entries(incomePerPerson)) {
                const ratio = pIncome / totalIncome;
                if (ratio >= 0.80) {
                    rawRisks.push({
                        riskType: ForecastRiskType.SINGLE_EARNER_EXPOSURE,
                        severity: RiskSeverity.LOW,
                        personId: pId,
                        concentrationRatio: Math.round(ratio * 100) / 100,
                        description: `A single household member contributes ${Math.round(ratio * 100)}% of projected household inflows.`
                    });
                }
            }
        }
    }

    const riskIndicators = orderAndDeduplicateRiskIndicators(rawRisks);
    const overallRiskLevel = riskIndicators.length > 0 ? riskIndicators[0].severity : 'NOMINAL';

    // 8. Timeline Buckets
    const timelineBuckets = [];
    const numBuckets = horizonDays <= 7 ? horizonDays : (horizonDays <= 30 ? 4 : (horizonDays <= 90 ? 3 : 12));
    const bucketDurationMs = horizonMs / numBuckets;

    for (let b = 0; b < numBuckets; b++) {
        const bStartMs = startTime + b * bucketDurationMs;
        const bEndMs = bStartMs + bucketDurationMs;
        const bItems = [];

        for (const c of commitmentOccurrences) {
            const t = new Date(c.occurrenceTimestampUtc).getTime();
            if (t >= bStartMs && t < bEndMs) {
                bItems.push({ type: 'COMMITMENT', ...c });
            }
        }
        for (const inc of incomeOccurrences) {
            const t = new Date(inc.occurrenceTimestampUtc).getTime();
            if (t >= bStartMs && t < bEndMs) {
                bItems.push({ type: 'INCOME', ...inc });
            }
        }
        for (const ren of renewalOccurrences) {
            const t = new Date(ren.occurrenceTimestampUtc).getTime();
            if (t >= bStartMs && t < bEndMs) {
                bItems.push({ type: 'RENEWAL', ...ren });
            }
        }

        const bucketInflows = isCurrencyDivergent ? null : bItems.filter(i => i.type === 'INCOME').reduce((acc, i) => acc + i.amount, 0);
        const bucketOutflows = isCurrencyDivergent ? null : bItems.filter(i => i.type !== 'INCOME').reduce((acc, i) => acc + i.amount, 0);
        const bucketNet = isCurrencyDivergent ? null : ((bucketInflows || 0) - (bucketOutflows || 0));

        timelineBuckets.push({
            bucketIndex: b,
            startDateUtc: new Date(bStartMs).toISOString(),
            endDateUtc: new Date(bEndMs).toISOString(),
            inflows: bucketInflows,
            outflows: bucketOutflows,
            net: bucketNet,
            items: bItems
        });
    }

    const summary = {
        householdId,
        referenceDateUtc,
        horizonDays,
        currency: singleCurrency,
        projectedInflow,
        projectedOutflow,
        netProjectedLiquidityDelta,
        currencyDivergenceWarning,
        confidenceScore: {
            score: confidenceScore,
            rating: confidenceRating,
            missingFactors
        },
        overallRiskLevel,
        commitmentOccurrencesCount: commitmentOccurrences.length,
        proratedPoolsCount: proratedPools.length,
        renewalOccurrencesCount: renewalOccurrences.length,
        incomeOccurrencesCount: incomeOccurrences.length,
        diagnostics
    };

    return {
        summary,
        proratedPools,
        timelineBuckets,
        riskIndicators,
        diagnostics
    };
}

/**
 * Pure scenario simulation engine.
 * Applies functional perturbations (income percentage, expense shocks, contributor defaults)
 * to baseline data without mutating baseline objects or source records.
 */
export function simulateForecastScenarioPure({
    baselineForecast,
    scenario = {},
    commitments = [],
    budgetPools = [],
    incomeStreams = [],
    renewalActions = [],
    members = []
}) {
    if (!baselineForecast || !baselineForecast.summary) {
        throw new Error('Valid baselineForecast is required for simulation');
    }

    const refDateUtc = baselineForecast.summary.referenceDateUtc;
    const horizonDays = baselineForecast.summary.horizonDays;

    // 1. Perturb Income Streams
    const incomeAdjustmentPercent = typeof scenario.incomeAdjustmentPercent === 'number'
        ? scenario.incomeAdjustmentPercent
        : 0;
    const incomeMultiplier = Math.max(0, 1 + (incomeAdjustmentPercent / 100));

    const simulatedIncomeStreams = (incomeStreams || []).map(s => ({
        ...s,
        amount: Math.max(0, Math.round(s.amount * incomeMultiplier * 100) / 100)
    }));

    // 2. Perturb Outflows with Expense Shocks
    const simulatedCommitments = [...commitments];
    if (Array.isArray(scenario.expenseShocks)) {
        for (const shock of scenario.expenseShocks) {
            const shockAmount = typeof shock.amount === 'number' ? shock.amount : 0;
            const dueDayOffset = typeof shock.dueDayOffset === 'number' ? shock.dueDayOffset : 0;
            const shockDate = new Date(new Date(refDateUtc).getTime() + dueDayOffset * 86400000).toISOString();

            simulatedCommitments.push({
                id: `shock_${Math.random().toString(36).substring(2, 7)}`,
                name: shock.name || 'Expense Shock',
                amount: shockAmount,
                currency: shock.currency || baselineForecast.summary.currency || 'INR',
                status: 'ACTIVE',
                frequency: 'ONE_TIME',
                nextDueDateUtc: shockDate
            });
        }
    }

    // 3. Contributor Default Handling (Hypothetical Reallocation)
    let hypotheticalReallocations = [];
    if (Array.isArray(scenario.contributorDefaults) && scenario.contributorDefaults.length > 0) {
        for (const def of scenario.contributorDefaults) {
            const pool = (budgetPools || []).find(p => p.id === def.poolId);
            if (pool) {
                const ceiling = pool.monthlyCeiling || 0;
                const defaultedPersonId = def.personId;
                const defaultRatio = def.defaultRatioPercent || 100;

                const activeOtherMembers = (members || []).filter(m => m.id !== defaultedPersonId);
                const shortfall = Math.round((ceiling * (defaultRatio / 100)) * 100) / 100;
                const reallocatedSharePerMember = activeOtherMembers.length > 0
                    ? Math.round((shortfall / activeOtherMembers.length) * 100) / 100
                    : shortfall;

                hypotheticalReallocations.push({
                    poolId: pool.id,
                    poolName: pool.name,
                    defaultedPersonId,
                    shortfallAmount: shortfall,
                    reallocatedSharePerMember,
                    activeOtherMemberIds: activeOtherMembers.map(m => m.id),
                    label: 'Hypothetical contribution reallocation (Advisory Only — Pool Unchanged)'
                });
            }
        }
    }

    // 4. Run Pure Engine on Perturbed Inputs
    const simulatedProjection = computeHouseholdFinancialForecastPure({
        householdId: baselineForecast.summary.householdId,
        referenceDateUtc: refDateUtc,
        horizonDays,
        commitments: simulatedCommitments,
        budgetPools,
        incomeStreams: simulatedIncomeStreams,
        renewalActions,
        members
    });

    return {
        ...simulatedProjection,
        isSimulation: true,
        scenarioName: scenario.name || 'Simulated Scenario',
        hypotheticalReallocations,
        baselineDelta: {
            inflowDelta: (simulatedProjection.summary.projectedInflow !== null && baselineForecast.summary.projectedInflow !== null)
                ? Math.round((simulatedProjection.summary.projectedInflow - baselineForecast.summary.projectedInflow) * 100) / 100
                : null,
            outflowDelta: (simulatedProjection.summary.projectedOutflow !== null && baselineForecast.summary.projectedOutflow !== null)
                ? Math.round((simulatedProjection.summary.projectedOutflow - baselineForecast.summary.projectedOutflow) * 100) / 100
                : null,
            netLiquidityDeltaChange: (simulatedProjection.summary.netProjectedLiquidityDelta !== null && baselineForecast.summary.netProjectedLiquidityDelta !== null)
                ? Math.round((simulatedProjection.summary.netProjectedLiquidityDelta - baselineForecast.summary.netProjectedLiquidityDelta) * 100) / 100
                : null
        }
    };
}

// ============================================================================
// PHASE 11: COLLECTIVE FAMILY GOALS, MILESTONES & CAPITAL ALLOCATION PLANNING
// ============================================================================

export const FamilyGoalCategory = Object.freeze({
    EDUCATION: 'EDUCATION',
    HOUSING: 'HOUSING',
    EMERGENCY_FUND: 'EMERGENCY_FUND',
    VEHICLE: 'VEHICLE',
    HEALTHCARE: 'HEALTHCARE',
    RETIREMENT: 'RETIREMENT',
    TRAVEL: 'TRAVEL',
    OTHER: 'OTHER'
});

export const FamilyGoalPriority = Object.freeze({
    CRITICAL: 'CRITICAL',
    IMPORTANT: 'IMPORTANT',
    DISCRETIONARY: 'DISCRETIONARY'
});

export const FamilyGoalStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    ARCHIVED: 'ARCHIVED'
});

export const MilestoneStatus = Object.freeze({
    PENDING: 'PENDING',
    REACHED: 'REACHED',
    EXPIRED: 'EXPIRED'
});

export const MemberPledgeFrequency = Object.freeze({
    MONTHLY: 'MONTHLY',
    ONE_TIME_TARGET: 'ONE_TIME_TARGET',
    PERCENTAGE_SHARE: 'PERCENTAGE_SHARE'
});

export const GoalPaceHealth = Object.freeze({
    COMPLETED: 'COMPLETED',
    PAST_DUE: 'PAST_DUE',
    NO_PACE_DATA: 'NO_PACE_DATA',
    AHEAD: 'AHEAD',
    ON_TRACK: 'ON_TRACK',
    BEHIND: 'BEHIND',
    AT_RISK: 'AT_RISK'
});

export const GoalScenarioType = Object.freeze({
    STANDARD: 'STANDARD',
    PLEDGE_REDUCTION: 'PLEDGE_REDUCTION',
    SURPLUS_ALLOCATION: 'SURPLUS_ALLOCATION',
    HORIZON_CHANGE: 'HORIZON_CHANGE'
});

export const GoalScenarioClassification = Object.freeze({
    ACCELERATION: 'ACCELERATION',
    DECELERATION: 'DECELERATION',
    NEUTRAL: 'NEUTRAL'
});

export const DAYS_IN_AVERAGE_MONTH = 30.4375;
export const STALE_ASSET_SNAPSHOT_MS = 90 * MS_PER_DAY; // Exactly 7,776,000,000 ms

/**
 * Validates a Family Goal entity against Phase 11 contracts
 */
export function validateFamilyGoal(goal) {
    if (!goal || typeof goal !== 'object') {
        throw new Error('INVALID_GOAL: Goal must be an object');
    }
    if (!goal.householdId || typeof goal.householdId !== 'string') {
        throw new Error('INVALID_GOAL_HOUSEHOLD: householdId is required');
    }
    if (!goal.title || typeof goal.title !== 'string' || goal.title.trim().length === 0) {
        throw new Error('INVALID_GOAL_TITLE: title is required');
    }
    if (typeof goal.targetAmount !== 'number' || isNaN(goal.targetAmount) || goal.targetAmount <= 0) {
        throw new Error('INVALID_GOAL_TARGET_AMOUNT: Target amount must be greater than 0');
    }
    if (!goal.currency || typeof goal.currency !== 'string') {
        throw new Error('INVALID_GOAL_CURRENCY: currency is required');
    }
    if (!goal.targetDateUtc || typeof goal.targetDateUtc !== 'string' || isNaN(new Date(goal.targetDateUtc).getTime())) {
        throw new Error('INVALID_TARGET_DATE_FORMAT: targetDateUtc must be a valid ISO date string');
    }
    return true;
}

/**
 * Validates milestone monotonicity: 0 < M1 <= M2 <= ... <= goal.targetAmount
 */
export function validateMilestonesMonotonicity(milestones, goalTargetAmount) {
    if (!Array.isArray(milestones) || milestones.length === 0) return true;

    // Filter monetary milestones for progression checks
    const monetaryMilestones = milestones.filter(m => !m.isCheckpointOnly);
    for (let i = 0; i < monetaryMilestones.length; i++) {
        const m = monetaryMilestones[i];
        if (typeof m.targetAmount !== 'number' || m.targetAmount <= 0) {
            throw new Error('INVALID_MILESTONE_PROGRESSION: Milestone target amount must be > 0');
        }
        if (typeof goalTargetAmount === 'number' && m.targetAmount > goalTargetAmount) {
            throw new Error('INVALID_MILESTONE_PROGRESSION: Milestone target exceeds goal target amount');
        }
        if (i > 0) {
            const prev = monetaryMilestones[i - 1];
            if (m.targetAmount < prev.targetAmount) {
                throw new Error('INVALID_MILESTONE_PROGRESSION: Milestones must be non-decreasing cumulative checkpoints');
            }
        }
    }
    return true;
}

/**
 * Deterministic milestone sorter:
 * targetAmount ascending -> targetDateUtc ascending -> id ascending
 */
export function sortMilestonesDeterministically(milestones) {
    if (!Array.isArray(milestones)) return [];
    return [...milestones].sort((a, b) => {
        const targetA = typeof a.targetAmount === 'number' ? a.targetAmount : 0;
        const targetB = typeof b.targetAmount === 'number' ? b.targetAmount : 0;
        if (targetA !== targetB) return targetA - targetB;

        const dateA = a.targetDateUtc ? new Date(a.targetDateUtc).getTime() : 0;
        const dateB = b.targetDateUtc ? new Date(b.targetDateUtc).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;

        const idA = String(a.id || '');
        const idB = String(b.id || '');
        return idA.localeCompare(idB);
    });
}

/**
 * Pure evaluation engine for a single Family Goal.
 * 100% clock-independent (uses referenceDateUtc).
 * 
 * @param {Object} goal
 * @param {string} referenceDateUtc
 * @param {Object} [options]
 * @param {number|null} [options.phase10ProjectedMonthlySurplus]
 * @param {boolean} [options.divergentCurrenciesAllowed=false]
 * @returns {Object} FamilyGoalEvaluationResult
 */
export function evaluateFamilyGoalPure(goal, referenceDateUtc, options = {}) {
    validateFamilyGoal(goal);
    if (!referenceDateUtc || isNaN(new Date(referenceDateUtc).getTime())) {
        throw new Error('INVALID_REFERENCE_DATE: referenceDateUtc must be a valid ISO date string');
    }

    const diagnostics = [];
    const refMs = new Date(referenceDateUtc).getTime();
    const targetMs = new Date(goal.targetDateUtc).getTime();
    const phase10Surplus = typeof options.phase10ProjectedMonthlySurplus === 'number'
        ? options.phase10ProjectedMonthlySurplus
        : null;

    // 1. Accumulations & Capital Verification
    let totalManualAccumulation = 0;
    let verifiedAccumulatedAmount = 0;

    if (Array.isArray(goal.accumulations)) {
        for (const entry of goal.accumulations) {
            if (typeof entry.amount === 'number' && entry.amount > 0) {
                if (entry.currency && entry.currency !== goal.currency) {
                    diagnostics.push(`CURRENCY_DIVERGENCE_IN_ACCUMULATION: Entry ${entry.id || 'unknown'} has currency ${entry.currency}`);
                    continue; // Exclude divergent currency entry
                }
                totalManualAccumulation += entry.amount;
                if (entry.verifiedAtUtc) {
                    verifiedAccumulatedAmount += entry.amount;
                }
            }
        }
    }

    // 2. Asset Link Snapshots & Stale 90-Day Boundary
    let totalLinkedAssets = 0;
    if (Array.isArray(goal.linkedAssets)) {
        for (const link of goal.linkedAssets) {
            if (link.currency && link.currency !== goal.currency) {
                diagnostics.push(`CURRENCY_DIVERGENCE_IN_ASSET: Asset ${link.id || link.assetName} has currency ${link.currency}`);
                continue;
            }
            if (!link.asOfUtc || isNaN(new Date(link.asOfUtc).getTime())) {
                diagnostics.push(`ASSET_SNAPSHOT_INVALID_DATE: Asset ${link.id || link.assetName}`);
                continue;
            }
            const asOfMs = new Date(link.asOfUtc).getTime();
            const ageMs = refMs - asOfMs;

            // Exact boundary rule: age > 90 days (7,776,000,000 ms) is stale; exactly 90d is valid.
            if (ageMs > STALE_ASSET_SNAPSHOT_MS) {
                diagnostics.push(`ASSET_SNAPSHOT_STALE: Asset ${link.id || link.assetName} snapshot is older than 90 days`);
            } else {
                const snapshotAmount = typeof link.snapshotAmount === 'number' ? link.snapshotAmount : 0;
                totalLinkedAssets += snapshotAmount;
            }
        }
    }

    const effectiveAccumulatedAmount = totalManualAccumulation + totalLinkedAssets;
    const remainingTargetAmount = Math.max(0, Math.round((goal.targetAmount - effectiveAccumulatedAmount) * 100) / 100);
    const progressPercentage = Math.min(100, Math.round(((effectiveAccumulatedAmount / goal.targetAmount) * 100) * 100) / 100);

    // 3. Required Monthly Pace Math (Fixed 30.4375-day month divisor)
    let requiredMonthlyPace = 0;
    const daysRemaining = (targetMs - refMs) / MS_PER_DAY;
    const monthsRemaining = daysRemaining / DAYS_IN_AVERAGE_MONTH;

    if (remainingTargetAmount === 0) {
        requiredMonthlyPace = 0;
    } else if (monthsRemaining <= 0) {
        // Incomplete and past-due: immediate requirement equals remaining target amount
        requiredMonthlyPace = remainingTargetAmount;
    } else {
        requiredMonthlyPace = Math.round((remainingTargetAmount / monthsRemaining) * 100) / 100;
    }

    // 4. Effective Monthly Pledges
    let fixedPledgePace = 0;
    let totalPercentageRatio = 0;
    let oneTimePledgesTotal = 0;

    if (Array.isArray(goal.pledges)) {
        for (const pledge of goal.pledges) {
            if (pledge.status !== 'ACTIVE') continue;

            // Currency validation
            if (pledge.currency && pledge.currency !== goal.currency) {
                diagnostics.push(`CURRENCY_DIVERGENCE_IN_PLEDGES: Pledge ${pledge.id} has currency ${pledge.currency}`);
                continue;
            }

            // Effective date window check
            if (pledge.effectiveFromUtc) {
                const fromMs = new Date(pledge.effectiveFromUtc).getTime();
                if (refMs < fromMs) continue; // Future pledge, inactive as of refMs
            }
            if (pledge.effectiveToUtc) {
                const toMs = new Date(pledge.effectiveToUtc).getTime();
                if (refMs > toMs) continue; // Expired pledge
            }

            if (pledge.frequency === MemberPledgeFrequency.MONTHLY) {
                const amt = typeof pledge.amount === 'number' ? pledge.amount : 0;
                fixedPledgePace += amt;
            } else if (pledge.frequency === MemberPledgeFrequency.PERCENTAGE_SHARE) {
                const pct = typeof pledge.amount === 'number' ? pledge.amount : 0;
                if (pct <= 0 || pct > 100) {
                    throw new Error(`INVALID_PLEDGE_PERCENTAGE: Individual percentage pledge must be in (0, 100], got ${pct}`);
                }
                totalPercentageRatio += (pct / 100);
            } else if (pledge.frequency === MemberPledgeFrequency.ONE_TIME_TARGET) {
                const amt = typeof pledge.amount === 'number' ? pledge.amount : 0;
                oneTimePledgesTotal += amt;
                if (pledge.targetDateUtc && new Date(pledge.targetDateUtc).getTime() < refMs) {
                    diagnostics.push(`ONE_TIME_PLEDGE_EXPIRED: Pledge ${pledge.id} target date has passed`);
                }
            }
        }
    }

    // Additive percentage share calculation decoupled from circular ETA:
    // percentage contribution = totalPercentageRatio * requiredMonthlyPace
    let percentagePledgePace = 0;
    if (requiredMonthlyPace > 0 && monthsRemaining > 0) {
        percentagePledgePace = Math.round((totalPercentageRatio * requiredMonthlyPace) * 100) / 100;
    }

    // 5. Phase 10 Surplus Allocation Integration
    let surplusPace = 0;
    if (typeof phase10Surplus === 'number' && phase10Surplus > 0) {
        const rawAllocPct = typeof goal.phase10SurplusAllocationPercent === 'number'
            ? goal.phase10SurplusAllocationPercent
            : 0;
        // Strictly clamped to [0, 100]%
        const allocPct = Math.min(100, Math.max(0, rawAllocPct));
        surplusPace = Math.round((phase10Surplus * (allocPct / 100)) * 100) / 100;
    }

    const effectiveMonthlyPace = Math.round((fixedPledgePace + percentagePledgePace + surplusPace) * 1000000) / 1000000;

    // 6. Pace Ratio
    let paceRatio = 0;
    if (remainingTargetAmount === 0) {
        paceRatio = 1.0;
    } else if (requiredMonthlyPace > 0 && effectiveMonthlyPace === 0) {
        paceRatio = 0;
    } else if (requiredMonthlyPace > 0) {
        paceRatio = Math.round((effectiveMonthlyPace / requiredMonthlyPace) * 1000000) / 1000000;
    }

    // 7. Projected ETA
    let projectedEtaUtc = null;
    let projectedDaysNeeded = null;
    let etaLabel = 'Unfunded / No Pace';

    if (remainingTargetAmount === 0) {
        projectedEtaUtc = referenceDateUtc;
        projectedDaysNeeded = 0;
        etaLabel = 'Target Achieved';
    } else if (effectiveMonthlyPace <= 0) {
        projectedEtaUtc = null;
        projectedDaysNeeded = null;
        etaLabel = 'Unfunded / No Pace';
    } else {
        const monthsNeeded = remainingTargetAmount / effectiveMonthlyPace;
        const exactDaysNeeded = monthsNeeded * DAYS_IN_AVERAGE_MONTH;
        projectedDaysNeeded = Math.round(exactDaysNeeded * 100) / 100;
        const etaMs = refMs + Math.round(exactDaysNeeded * MS_PER_DAY);
        projectedEtaUtc = new Date(etaMs).toISOString();
        const ymd = projectedEtaUtc.substring(0, 10);
        etaLabel = `Projected ETA (Estimate): ${ymd}`;
    }

    // 8. Strict Pace Health Precedence Cascade (Continuous Intervals, No Gaps)
    let paceHealth = GoalPaceHealth.AT_RISK;

    if (remainingTargetAmount === 0) {
        paceHealth = GoalPaceHealth.COMPLETED;
    } else if (refMs > targetMs) {
        paceHealth = GoalPaceHealth.PAST_DUE;
    } else if (effectiveMonthlyPace <= 0) {
        paceHealth = GoalPaceHealth.NO_PACE_DATA;
    } else {
        const etaMs = projectedEtaUtc ? new Date(projectedEtaUtc).getTime() : Infinity;
        const earlyDiffDays = (targetMs - etaMs) / MS_PER_DAY;
        const absDiffDays = Math.abs(etaMs - targetMs) / MS_PER_DAY;

        // Step 4: AHEAD (paceRatio >= 1.15 OR projected ETA is more than 15 days early)
        if (paceRatio >= 1.15 || earlyDiffDays > 15) {
            paceHealth = GoalPaceHealth.AHEAD;
        }
        // Step 5: ON_TRACK (0.95 <= paceRatio < 1.15 OR projected ETA within 15 days)
        else if ((paceRatio >= 0.95 && paceRatio < 1.15) || absDiffDays <= 15) {
            paceHealth = GoalPaceHealth.ON_TRACK;
        }
        // Step 6: BEHIND (0.60 <= paceRatio < 0.95)
        else if (paceRatio >= 0.60 && paceRatio < 0.95) {
            paceHealth = GoalPaceHealth.BEHIND;
        }
        // Step 7: AT_RISK (paceRatio < 0.60)
        else {
            paceHealth = GoalPaceHealth.AT_RISK;
        }
    }

    // 9. Evaluate Individual Milestones
    let evaluatedMilestones = [];
    if (Array.isArray(goal.milestones)) {
        validateMilestonesMonotonicity(goal.milestones, goal.targetAmount);
        const sorted = sortMilestonesDeterministically(goal.milestones);
        evaluatedMilestones = sorted.map(m => {
            let status = m.status || MilestoneStatus.PENDING;
            let reachedAtUtc = m.reachedAtUtc || null;
            if (!m.isCheckpointOnly && typeof m.targetAmount === 'number') {
                if (effectiveAccumulatedAmount >= m.targetAmount) {
                    status = MilestoneStatus.REACHED;
                    if (!reachedAtUtc) reachedAtUtc = referenceDateUtc;
                } else if (m.targetDateUtc && new Date(m.targetDateUtc).getTime() < refMs) {
                    status = MilestoneStatus.EXPIRED;
                }
            }
            return {
                ...m,
                status,
                reachedAtUtc
            };
        });
    }

    return {
        goalId: goal.id,
        householdId: goal.householdId,
        currency: goal.currency,
        referenceDateUtc,
        lifecycleStatus: goal.status || FamilyGoalStatus.ACTIVE, // Preserved exactly as on goal
        paceHealth,
        targetAmount: goal.targetAmount,
        totalManualAccumulation: Math.round(totalManualAccumulation * 100) / 100,
        totalLinkedAssets: Math.round(totalLinkedAssets * 100) / 100,
        effectiveAccumulatedAmount: Math.round(effectiveAccumulatedAmount * 100) / 100,
        verifiedAccumulatedAmount: Math.round(verifiedAccumulatedAmount * 100) / 100,
        verifiedAccumulatedCapital: Math.round(verifiedAccumulatedAmount * 100) / 100,
        remainingTargetAmount,
        progressPercentage,
        requiredMonthlyPace,
        effectiveMonthlyPace,
        fixedPledgePace: Math.round(fixedPledgePace * 100) / 100,
        percentagePledgePace,
        surplusPace,
        oneTimePledgesTotal: Math.round(oneTimePledgesTotal * 100) / 100,
        paceRatio,
        projectedEtaUtc,
        projectedDaysNeeded,
        etaLabel,
        milestones: evaluatedMilestones,
        diagnostics
    };
}

/**
 * Pure Goal Scenario Simulator.
 * Ephemeral "What-If" perturbation engine. Mutates zero state.
 */
export function simulateGoalScenarioPure(baselineResult, goal, scenarioInput, referenceDateUtc) {
    if (!scenarioInput || typeof scenarioInput !== 'object') {
        throw new Error('INVALID_SCENARIO_INPUT: scenarioInput is required');
    }
    const scenarioType = scenarioInput.scenarioType || GoalScenarioType.STANDARD;

    // Rule: lump sum cannot be negative
    if (typeof scenarioInput.hypotheticalLumpSum === 'number' && scenarioInput.hypotheticalLumpSum < 0) {
        throw new Error('INVALID_SCENARIO_INPUT: Lump sum cannot be negative');
    }

    // Rule: negative pledge delta requires PLEDGE_REDUCTION scenario type
    if (typeof scenarioInput.hypotheticalMonthlyPledgeDelta === 'number' && scenarioInput.hypotheticalMonthlyPledgeDelta < 0) {
        if (scenarioType !== GoalScenarioType.PLEDGE_REDUCTION) {
            throw new Error('INVALID_SCENARIO_INPUT: Negative pledge delta requires PLEDGE_REDUCTION scenario type');
        }
    }

    const lumpSum = typeof scenarioInput.hypotheticalLumpSum === 'number' ? scenarioInput.hypotheticalLumpSum : 0;
    const pledgeDelta = typeof scenarioInput.hypotheticalMonthlyPledgeDelta === 'number' ? scenarioInput.hypotheticalMonthlyPledgeDelta : 0;
    const simulatedTargetDateUtc = scenarioInput.hypotheticalTargetDateUtc || goal.targetDateUtc;

    // Clone goal and apply hypothetical modifications
    const perturbedGoal = {
        ...goal,
        targetDateUtc: simulatedTargetDateUtc,
        accumulations: [
            ...(goal.accumulations || []),
            ...(lumpSum > 0 ? [{
                id: `hypothetical_lump_${Date.now()}`,
                goalId: goal.id,
                personId: 'hypothetical_simulator',
                amount: lumpSum,
                currency: goal.currency,
                recordedAtUtc: referenceDateUtc,
                verifiedAtUtc: referenceDateUtc,
                notes: 'Hypothetical lump-sum scenario injection'
            }] : [])
        ],
        pledges: [
            ...(goal.pledges || []),
            ...(pledgeDelta !== 0 ? [{
                id: `hypothetical_pledge_${Date.now()}`,
                goalId: goal.id,
                personId: 'hypothetical_simulator',
                frequency: MemberPledgeFrequency.MONTHLY,
                amount: pledgeDelta,
                currency: goal.currency,
                effectiveFromUtc: referenceDateUtc,
                status: 'ACTIVE'
            }] : [])
        ]
    };

    const simulatedResult = evaluateFamilyGoalPure(perturbedGoal, referenceDateUtc);

    // Classification calculation across all 6 permutations:
    let classification = GoalScenarioClassification.NEUTRAL;
    const baseEta = baselineResult.projectedEtaUtc;
    const simEta = simulatedResult.projectedEtaUtc;

    if (baseEta === null && simEta !== null) {
        classification = GoalScenarioClassification.ACCELERATION;
    } else if (baseEta !== null && simEta === null) {
        classification = GoalScenarioClassification.DECELERATION;
    } else if (baseEta === null && simEta === null) {
        classification = GoalScenarioClassification.NEUTRAL;
    } else {
        const baseMs = new Date(baseEta).getTime();
        const simMs = new Date(simEta).getTime();
        if (simMs < baseMs) {
            classification = GoalScenarioClassification.ACCELERATION;
        } else if (simMs > baseMs) {
            classification = GoalScenarioClassification.DECELERATION;
        } else {
            classification = GoalScenarioClassification.NEUTRAL;
        }
    }

    return {
        scenarioName: scenarioInput.scenarioName || 'Unnamed Scenario',
        scenarioType,
        isSimulation: true,
        classification,
        baselineEtaUtc: baseEta,
        simulatedEtaUtc: simEta,
        simulatedResult
    };
}

/**
 * Deterministic Goal Sorter (5-level tie-breaking precedence):
 * Priority -> Health Severity -> Target Date Asc -> Created At Asc -> ID Asc
 */
export function sortGoalsDeterministically(goalsWithEvaluations) {
    if (!Array.isArray(goalsWithEvaluations)) return [];

    const priorityRank = {
        [FamilyGoalPriority.CRITICAL]: 1,
        [FamilyGoalPriority.IMPORTANT]: 2,
        [FamilyGoalPriority.DISCRETIONARY]: 3
    };

    const healthRank = {
        [GoalPaceHealth.PAST_DUE]: 1,
        [GoalPaceHealth.AT_RISK]: 2,
        [GoalPaceHealth.BEHIND]: 3,
        [GoalPaceHealth.NO_PACE_DATA]: 4,
        [GoalPaceHealth.ON_TRACK]: 5,
        [GoalPaceHealth.AHEAD]: 6,
        [GoalPaceHealth.COMPLETED]: 7
    };

    return [...goalsWithEvaluations].sort((a, b) => {
        const pA = priorityRank[a.goal.priority] || 99;
        const pB = priorityRank[b.goal.priority] || 99;
        if (pA !== pB) return pA - pB;

        const hA = healthRank[a.evaluation.paceHealth] || 99;
        const hB = healthRank[b.evaluation.paceHealth] || 99;
        if (hA !== hB) return hA - hB;

        const dateA = a.goal.targetDateUtc ? new Date(a.goal.targetDateUtc).getTime() : 0;
        const dateB = b.goal.targetDateUtc ? new Date(b.goal.targetDateUtc).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;

        const createdA = a.goal.createdAtUtc ? new Date(a.goal.createdAtUtc).getTime() : 0;
        const createdB = b.goal.createdAtUtc ? new Date(b.goal.createdAtUtc).getTime() : 0;
        if (createdA !== createdB) return createdA - createdB;

        const idA = String(a.goal.id || '');
        const idB = String(b.goal.id || '');
        return idA.localeCompare(idB);
    });
}

/**
 * Aggregates goals into household overview strictly partitioned per currency.
 * Prohibits mixed-currency addition and multi-goal horizon aggregation.
 */
export function buildHouseholdGoalsOverviewPure(householdId, goalsWithEvaluations, asOfUtc) {
    const perCurrencySummaries = {};
    const statusCounts = {
        [GoalPaceHealth.COMPLETED]: 0,
        [GoalPaceHealth.PAST_DUE]: 0,
        [GoalPaceHealth.NO_PACE_DATA]: 0,
        [GoalPaceHealth.AHEAD]: 0,
        [GoalPaceHealth.ON_TRACK]: 0,
        [GoalPaceHealth.BEHIND]: 0,
        [GoalPaceHealth.AT_RISK]: 0
    };

    for (const item of goalsWithEvaluations) {
        const { goal, evaluation } = item;
        // Include active goals in count
        if (goal.status === FamilyGoalStatus.ACTIVE) {
            const curr = goal.currency || 'UNKNOWN';
            if (!perCurrencySummaries[curr]) {
                perCurrencySummaries[curr] = {
                    currency: curr,
                    activeGoalsCount: 0,
                    totalTargetAmount: 0,
                    totalAccumulatedAmount: 0,
                    totalRequiredMonthlyPace: 0,
                    totalEffectiveMonthlyPace: 0,
                    overallProgressRatio: 0
                };
            }
            const s = perCurrencySummaries[curr];
            s.activeGoalsCount += 1;
            s.totalTargetAmount += goal.targetAmount;
            s.totalAccumulatedAmount += evaluation.effectiveAccumulatedAmount;
            s.totalRequiredMonthlyPace += evaluation.requiredMonthlyPace;
            s.totalEffectiveMonthlyPace += evaluation.effectiveMonthlyPace;
            s.overallProgressRatio = s.totalTargetAmount > 0
                ? Math.round((s.totalAccumulatedAmount / s.totalTargetAmount) * 10000) / 10000
                : 1.0;
        }

        if (evaluation && evaluation.paceHealth && statusCounts[evaluation.paceHealth] !== undefined) {
            statusCounts[evaluation.paceHealth] += 1;
        }
    }

    return {
        householdId,
        asOfUtc,
        perCurrencySummaries,
        statusCounts,
        unsupportedMixedCurrencyTotal: null // Explicitly null to prohibit cross-currency summation
    };
}


