/**
 * Consent Configuration
 * Defines consent versions, permissions, and policy history
 */

export const CONSENT_CONFIG = {
    // Current consent version (increment on policy changes)
    CURRENT_VERSION: '1.0.0',

    // Minimum version required (force re-consent if user has older)
    MINIMUM_VERSION: '1.0.0',

    // Required permissions (cannot use app without these)
    REQUIRED_PERMISSIONS: [
        'dataProcessing'
    ],

    // Optional permissions (user can toggle)
    OPTIONAL_PERMISSIONS: [
        'analytics',
        'marketing',
        'thirdPartySharing'
    ],

    // Permission descriptions
    PERMISSION_DESCRIPTIONS: {
        dataProcessing: {
            title: 'Data Processing',
            description: 'Allow us to process your financial data to provide core app functionality.',
            required: true
        },
        analytics: {
            title: 'Analytics & Insights',
            description: 'Help us improve the app by sharing anonymous usage data.',
            required: false
        },
        marketing: {
            title: 'Marketing Communications',
            description: 'Receive personalized offers and product updates.',
            required: false
        },
        thirdPartySharing: {
            title: 'Third-Party Services',
            description: 'Share data with trusted partners for enhanced features (e.g., credit score).',
            required: false
        }
    },

    // Version history (for audit trail)
    VERSION_HISTORY: [
        {
            version: '1.0.0',
            releaseDate: '2026-01-05',
            changes: 'Initial consent policy',
            requiresReconsent: false
        }
        // Future versions will be added here
        // {
        //     version: '1.1.0',
        //     releaseDate: '2026-02-01',
        //     changes: 'Added third-party sharing permission',
        //     requiresReconsent: true
        // }
    ]
};

/**
 * Check if consent version requires re-consent
 */
export const requiresReconsent = (userVersion) => {
    if (!userVersion) return true;

    const userVersionNum = parseVersion(userVersion);
    const minVersionNum = parseVersion(CONSENT_CONFIG.MINIMUM_VERSION);

    return userVersionNum < minVersionNum;
};

/**
 * Parse version string to number for comparison
 */
const parseVersion = (version) => {
    const [major, minor, patch] = version.split('.').map(Number);
    return major * 10000 + minor * 100 + patch;
};
