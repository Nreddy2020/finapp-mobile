import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { CONSENT_CONFIG, requiresReconsent } from '../config/consent.config';
import { AuditService } from './audit';
import { getDeviceFingerprint } from './device';

const CONSENT_KEY = 'user_consent';

/**
 * Consent Service
 * Manages user consent with versioning and enforcement
 */
export const ConsentService = {

    /**
     * Get current user consent
     */
    getConsent: async () => {
        try {
            let consentString;

            if (Platform.OS === 'web') {
                consentString = localStorage.getItem(CONSENT_KEY);
            } else {
                consentString = await SecureStore.getItemAsync(CONSENT_KEY);
            }

            if (!consentString) return null;

            return JSON.parse(consentString);
        } catch (error) {
            console.error('Failed to get consent:', error);
            return null;
        }
    },

    /**
     * Save user consent
     */
    saveConsent: async (permissions, userId = 'current_user') => {
        try {
            const deviceId = await getDeviceFingerprint();

            const consent = {
                userId,
                version: CONSENT_CONFIG.CURRENT_VERSION,
                acceptedAt: new Date().toISOString(),
                permissions,
                deviceId,
                ipAddress: 'N/A' // In production, get from backend
            };

            const consentString = JSON.stringify(consent);

            if (Platform.OS === 'web') {
                localStorage.setItem(CONSENT_KEY, consentString);
            } else {
                await SecureStore.setItemAsync(CONSENT_KEY, consentString);
            }

            // Audit consent acceptance
            await AuditService.logEvent(
                userId,
                'CONSENT_ACCEPTED',
                'consent',
                {
                    version: consent.version,
                    permissions: consent.permissions
                }
            );

            return consent;
        } catch (error) {
            console.error('Failed to save consent:', error);
            throw error;
        }
    },

    /**
     * Update consent permissions
     */
    updateConsent: async (permissions, userId = 'current_user') => {
        try {
            const currentConsent = await ConsentService.getConsent();

            if (!currentConsent) {
                throw new Error('No existing consent found');
            }

            const updatedConsent = {
                ...currentConsent,
                permissions,
                updatedAt: new Date().toISOString()
            };

            const consentString = JSON.stringify(updatedConsent);

            if (Platform.OS === 'web') {
                localStorage.setItem(CONSENT_KEY, consentString);
            } else {
                await SecureStore.setItemAsync(CONSENT_KEY, consentString);
            }

            // Audit consent update
            await AuditService.logEvent(
                userId,
                'CONSENT_UPDATED',
                'consent',
                {
                    version: updatedConsent.version,
                    oldPermissions: currentConsent.permissions,
                    newPermissions: permissions
                }
            );

            return updatedConsent;
        } catch (error) {
            console.error('Failed to update consent:', error);
            throw error;
        }
    },

    /**
     * Check if consent is valid and up-to-date
     */
    isConsentValid: async () => {
        const consent = await ConsentService.getConsent();

        if (!consent) return false;

        // Check if version requires re-consent
        if (requiresReconsent(consent.version)) {
            return false;
        }

        // Check if all required permissions are granted
        const hasRequiredPermissions = CONSENT_CONFIG.REQUIRED_PERMISSIONS.every(
            perm => consent.permissions[perm] === true
        );

        return hasRequiredPermissions;
    },

    /**
     * Check if user has permission for specific action
     */
    hasPermission: async (permission) => {
        const consent = await ConsentService.getConsent();

        if (!consent) return false;

        return consent.permissions[permission] === true;
    },

    /**
     * Enforce consent before action
     * Throws error if permission not granted
     */
    enforcePermission: async (permission, action) => {
        const hasPermission = await ConsentService.hasPermission(permission);

        if (!hasPermission) {
            throw new Error(`PERMISSION_DENIED: ${action} requires ${permission} permission`);
        }
    },

    /**
     * Revoke consent (for account deletion)
     */
    revokeConsent: async (userId = 'current_user') => {
        try {
            if (Platform.OS === 'web') {
                localStorage.removeItem(CONSENT_KEY);
            } else {
                await SecureStore.deleteItemAsync(CONSENT_KEY);
            }

            // Audit consent revocation
            await AuditService.logEvent(
                userId,
                'CONSENT_REVOKED',
                'consent',
                { reason: 'Account deletion' }
            );
        } catch (error) {
            console.error('Failed to revoke consent:', error);
            throw error;
        }
    },

    /**
     * Get consent history (from audit logs)
     */
    getConsentHistory: async (userId = 'current_user') => {
        // In production, query audit logs for consent events
        // For MVP, return current consent only
        const consent = await ConsentService.getConsent();
        return consent ? [consent] : [];
    }
};
