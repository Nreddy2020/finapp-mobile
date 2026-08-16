export const Platform = { OS: 'web' };

const storageMap = new Map();

global.localStorage = {
    getItem: (key) => storageMap.get(key) || null,
    setItem: (key, value) => storageMap.set(key, String(value)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear(),
    key: (i) => Array.from(storageMap.keys())[i] || null,
    get length() { return storageMap.size; }
};

global.window = {
    crypto: {
        getRandomValues: (arr) => {
            for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
            return arr;
        },
        subtle: {
            importKey: async () => ({}),
            encrypt: async (algo, key, data) => new Uint8Array(data),
            decrypt: async (algo, key, data) => new Uint8Array(data)
        }
    }
};

export const getRandomBytesAsync = async (size) => new Uint8Array(size);
export const encrypt = async (data) => data;
export const decrypt = async (data) => data;
export const getRandomBytes = (size) => new Uint8Array(size);
export const requireNativeModule = () => ({ setItemAsync: () => {}, getItemAsync: () => null });
export const getItemAsync = async () => null;
export const setItemAsync = async () => true;
export const deleteItemAsync = async () => true;

export default {
    Platform,
    getRandomBytesAsync,
    encrypt,
    decrypt,
    getRandomBytes,
    requireNativeModule,
    getItemAsync,
    setItemAsync,
    deleteItemAsync
};
