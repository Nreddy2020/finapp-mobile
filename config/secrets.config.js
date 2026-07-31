/**
 * Secrets Configuration
 * Defines all secret keys used in the application
 * Production: These map to cloud vault secret paths
 */

export const SECRETS = {
    // Authentication
    AUTH_ADMIN_PASSWORD: 'auth/admin/password',
    JWT_SECRET: 'auth/jwt-secret',
    JWT_REFRESH_SECRET: 'auth/jwt-refresh-secret',

    // Encryption
    MASTER_ENCRYPTION_KEY: 'crypto/master-key',

    // SSL Pinning
    SSL_PIN_API: 'ssl/pins/api-server',
    SSL_PIN_AUTH: 'ssl/pins/auth-server',

    // API Keys (if needed)
    API_KEY_BACKEND: 'api/backend-key',

    // Device Binding Salt
    DEVICE_SALT: 'device/fingerprint-salt'
};

/**
 * Default secrets for development/testing
 * Production: These should NEVER be used
 */
export const DEV_SECRETS = {
    [SECRETS.AUTH_ADMIN_PASSWORD]: 'dev_password_123',
    [SECRETS.JWT_SECRET]: 'dev_jwt_secret_change_in_production',
    [SECRETS.JWT_REFRESH_SECRET]: 'dev_refresh_secret_change_in_production',
    [SECRETS.MASTER_ENCRYPTION_KEY]: null, // Generated dynamically
    [SECRETS.SSL_PIN_API]: 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    [SECRETS.SSL_PIN_AUTH]: 'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
    [SECRETS.API_KEY_BACKEND]: 'dev_api_key',
    [SECRETS.DEVICE_SALT]: 'dev_device_salt_123'
};
