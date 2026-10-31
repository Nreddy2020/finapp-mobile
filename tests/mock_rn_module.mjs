import nodeCrypto from 'node:crypto';
global.__FINLIFE_CRYPTO__ = nodeCrypto;

export const Platform = { OS: 'web' };

export const PermissionsAndroid = {
    PERMISSIONS: {
        RECEIVE_SMS: 'android.permission.RECEIVE_SMS',
        READ_SMS: 'android.permission.READ_SMS'
    },
    RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied',
        NEVER_ASK_AGAIN: 'never_ask_again'
    },
    request: async () => 'granted',
    check: async () => true
};

export const DeviceEventEmitter = {
    addListener: (event, handler) => ({
        remove: () => {}
    }),
    emit: (event, data) => {}
};

export class NativeEventEmitter {
    constructor() {}
    addListener(event, handler) {
        return { remove: () => {} };
    }
}

export const NativeModules = {};

const storageMap = new Map();

global.localStorage = {
    getItem: (key) => storageMap.get(key) ?? null,
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

export const getItem = async (key) => storageMap.get(key) ?? null;
export const setItem = async (key, val) => { storageMap.set(key, String(val)); return true; };
export const removeItem = async (key) => { storageMap.delete(key); return true; };
export const clear = async () => { storageMap.clear(); return true; };
export const getAllKeys = async () => Array.from(storageMap.keys());
export const multiSet = async (pairs) => {
    for (const [k, v] of pairs) {
        storageMap.set(k, String(v));
    }
    return true;
};
export const multiRemove = async (keys) => {
    for (const k of keys) {
        storageMap.delete(k);
    }
    return true;
};
export const multiGet = async (keys) => {
    return keys.map(k => [k, storageMap.get(k) || null]);
};

export class UnavailabilityError extends Error {}
export class EventEmitter {
    addListener() { return { remove: () => {} }; }
}

// React Native UI primitives
export const StyleSheet = { create: (s) => s };
export const View = 'View';
export const Text = 'Text';
export const TouchableOpacity = 'TouchableOpacity';
export const ScrollView = 'ScrollView';
export const SafeAreaView = 'SafeAreaView';
export const ActivityIndicator = 'ActivityIndicator';

// expo-router stubs
export const useRouter = () => ({
    push: () => {},
    replace: () => {},
    back: () => {},
    canGoBack: () => false
});
export const usePathname = () => '/family';
export const Redirect = () => null;
export const Stack = Object.assign(() => null, { Screen: () => null });

// lucide-react-native stubs
export const ArrowLeft = () => null;
export const ChevronLeft = () => null;
export const ChevronRight = () => null;
export const Home = () => null;
export const FileText = () => null;
export const DollarSign = () => null;
export const ShieldCheck = () => null;
export const Users = () => null;
export const CheckCircle = () => null;
export const CheckCircle2 = () => null;
export const Clock = () => null;
export const AlertCircle = () => null;
export const AlertTriangle = () => null;
export const Plus = () => null;
export const Calendar = () => null;
export const UserCheck = () => null;
export const Building = () => null;
export const Building2 = () => null;
export const Wallet = () => null;
export const TrendingUp = () => null;
export const TrendingDown = () => null;
export const ArrowUpRight = () => null;
export const ArrowDownLeft = () => null;
export const Search = () => null;
export const Filter = () => null;
export const Car = () => null;
export const Wrench = () => null;
export const Shield = () => null;
export const Zap = () => null;
export const Droplets = () => null;
export const Sparkles = () => null;
export const Landmark = () => null;
export const Receipt = () => null;
export const CreditCard = () => null;
export const Check = () => null;
export const X = () => null;
export const FileSpreadsheet = () => null;
export const Layers = () => null;
export const Activity = () => null;
export const Phone = () => null;
export const Mail = () => null;
export const Info = () => null;
export const Tag = () => null;
export const Share2 = () => null;
export const Send = () => null;
export const MessageCircle = () => null;
export const ExternalLink = () => null;

export default {
    Platform,
    UnavailabilityError,
    EventEmitter,
    getRandomBytesAsync,
    encrypt,
    decrypt,
    getRandomBytes,
    requireNativeModule,
    getItemAsync,
    setItemAsync,
    deleteItemAsync,
    getItem,
    setItem,
    removeItem,
    clear,
    getAllKeys,
    multiSet,
    multiRemove,
    multiGet,
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    useRouter,
    usePathname,
    Redirect,
    Stack
};
