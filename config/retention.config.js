/**
 * Data Retention Configuration
 * Defines retention periods and deletion policies per data type
 * GDPR Article 5(1)(e): Storage limitation principle
 */

export const RETENTION_CONFIG = {
    // Retention periods in days
    RETENTION_PERIODS: {
        // Financial data (regulatory requirement)
        transactions: 2555,        // 7 years (tax/audit requirement)
        budgets: 2555,             // 7 years
        savings: 2555,             // 7 years
        loans: 2555,               // 7 years

        // Audit & compliance (legal requirement)
        auditLogs: 2555,           // 7 years (PCI-DSS requirement)
        consentHistory: 730,       // 2 years (GDPR recommendation)

        // Session & temporary data
        sessions: 30,              // 30 days
        revokedTokens: 7,          // 7 days (after token expiry)

        // User activity
        loginHistory: 90,          // 90 days
        deviceHistory: 180,        // 6 months

        // User data (kept until account deletion)
        userData: null,            // No automatic deletion
        preferences: null          // No automatic deletion
    },

    // Grace period before deletion (warning period)
    GRACE_PERIOD_DAYS: 7,

    // Deletion job schedule
    DELETION_JOB_INTERVAL: 24 * 60 * 60 * 1000, // Daily (24 hours)

    // Legal hold (prevent deletion even if expired)
    LEGAL_HOLD_ENABLED: false,
    LEGAL_HOLD_CATEGORIES: [],

    // Data categories that require user notification before deletion
    NOTIFY_BEFORE_DELETE: [
        'transactions',
        'budgets',
        'savings'
    ],

    // Minimum retention period (cannot be less than this)
    MINIMUM_RETENTION_DAYS: 30,

    // Maximum retention period (cannot be more than this)
    MAXIMUM_RETENTION_DAYS: 3650 // 10 years
};

/**
 * Calculate deletion date for a data item
 */
export const calculateDeletionDate = (dataType, createdAt) => {
    const retentionDays = RETENTION_CONFIG.RETENTION_PERIODS[dataType];

    if (retentionDays === null) {
        return null; // Never delete
    }

    const createdDate = new Date(createdAt);
    const deletionDate = new Date(createdDate);
    deletionDate.setDate(deletionDate.getDate() + retentionDays + RETENTION_CONFIG.GRACE_PERIOD_DAYS);

    return deletionDate;
};

/**
 * Check if data should be deleted
 */
export const shouldDelete = (dataType, createdAt) => {
    const deletionDate = calculateDeletionDate(dataType, createdAt);

    if (!deletionDate) return false;

    return new Date() >= deletionDate;
};
