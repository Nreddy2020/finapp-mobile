import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

// Helper for simple hashing (SHA-256 prefered but for device fingerprinting
// a consistent unique string is sufficient if we bind it server-side.
// For local binding, we just need stability.)
const generateWebFingerprint = async () => {
    // On web, we use localStorage to persist an "install ID" 
    // combined with userAgent for some entropy.
    let installId = localStorage.getItem('device_install_id');
    if (!installId) {
        installId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        localStorage.setItem('device_install_id', installId);
    }
    return `${navigator.userAgent}-${installId}`;
};

export const getDeviceFingerprint = async () => {
    let fingerprint;

    if (Platform.OS === 'web') {
        fingerprint = await generateWebFingerprint();
    } else {
        // Native: reliable IDs
        // osInternalBuildId is usually stable for the OS version
        // modelId describes the hardware
        // We also check for an existing install ID in SecureStore to handle OS updates gracefully
        let installId = await SecureStore.getItemAsync('device_install_id');
        if (!installId) {
            installId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            await SecureStore.setItemAsync('device_install_id', installId);
        }

        const buildId = Device.osInternalBuildId || 'unknown_build';
        const modelId = Device.modelId || 'unknown_model';
        fingerprint = `${modelId}-${buildId}-${installId}`;
    }

    return fingerprint;
};

/**
 * DeviceService — compatibility shim for code that expects { DeviceService }
 */
export const DeviceService = {
    getDeviceId: getDeviceFingerprint,
    getFingerprint: getDeviceFingerprint,
};
