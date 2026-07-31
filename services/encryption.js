// ⚠️ DEPRECATED: Do not use this file directly.
// Use services/crypto.js instead.
// This file is kept for backward compatibility to prevent crashes
// but redirects all calls to the secure implementation.

import { encrypt as secureEncrypt, decrypt as secureDecrypt } from './crypto';

// Legacy hardcoded key REMOVED for security
// const SECRET_KEY = "REMOVED"; 

export const encrypt = async (text) => {
    console.warn('Using deprecated encryption.js. Please migrate to crypto.js');
    return await secureEncrypt(text);
};

export const decrypt = async (text) => {
    console.warn('Using deprecated encryption.js. Please migrate to crypto.js');
    return await secureDecrypt(text);
};

// Backwards compatibility for old function names
export const encryptData = encrypt;
export const decryptData = decrypt;

export default {
    encrypt,
    decrypt,
    encryptData,
    decryptData
};
