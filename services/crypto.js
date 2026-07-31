import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

const KEY_ALIAS = 'fintech_master_key';

// Generate a strong random key (256-bit)
const generateKey = async () => {
    // 32 bytes = 256 bits
    if (Platform.OS === 'web') {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } else {
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        // Convert to hex string
        return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
};

// Retrieve or create the master encryption key
const getMasterKey = async () => {
    let key = null;
    if (Platform.OS === 'web') {
        key = localStorage.getItem(KEY_ALIAS);
    } else {
        key = await SecureStore.getItemAsync(KEY_ALIAS);
    }

    if (!key) {
        key = await generateKey();
        if (Platform.OS === 'web') {
            localStorage.setItem(KEY_ALIAS, key);
        } else {
            await SecureStore.setItemAsync(KEY_ALIAS, key);
        }
    }
    return key;
};

// AES-256-GCM Encryption (via CryptoJS AES default)
// Note: CryptoJS default AES uses CBC/Pkcs7 (not GCM) but is standard for JS.
// For strict GCM we'd need a different lib, but AES-CBC with strict key management
// is acceptable for Phase 1 if properly implemented.
export const encrypt = async (plainText) => {
    if (!plainText) return null;
    try {
        const key = await getMasterKey();
        
        // Generate secure 16-byte (128-bit) IV
        let ivHex;
        if (Platform.OS === 'web') {
            const array = new Uint8Array(16);
            window.crypto.getRandomValues(array);
            ivHex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        } else {
            const randomBytes = await Crypto.getRandomBytesAsync(16);
            ivHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        const keyBytes = CryptoJS.enc.Hex.parse(key);
        const iv = CryptoJS.enc.Hex.parse(ivHex);
        
        // Encrypt with explicit Key and IV (disables CryptoJS internal salting/PRNG)
        const encrypted = CryptoJS.AES.encrypt(plainText, keyBytes, { iv: iv });
        
        // Return IV prepended to ciphertext
        return ivHex + ':' + encrypted.toString();
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Encryption failed');
    }
};

export const decrypt = async (cipherText) => {
    if (!cipherText) return null;
    try {
        const key = await getMasterKey();
        
        // Parse IV and ciphertext
        const parts = cipherText.split(':');
        if (parts.length !== 2) {
            // Fallback for legacy format
            const bytes = CryptoJS.AES.decrypt(cipherText, key);
            return bytes.toString(CryptoJS.enc.Utf8);
        }
        
        const ivHex = parts[0];
        const encryptedText = parts[1];
        
        const keyBytes = CryptoJS.enc.Hex.parse(key);
        const iv = CryptoJS.enc.Hex.parse(ivHex);
        
        const bytes = CryptoJS.AES.decrypt(encryptedText, keyBytes, { iv: iv });
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText;
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
};

export const resetKeys = async () => {
    if (Platform.OS === 'web') {
        localStorage.removeItem(KEY_ALIAS);
    } else {
        await SecureStore.deleteItemAsync(KEY_ALIAS);
    }
};
