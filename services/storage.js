import { Platform } from 'react-native';
// Use legacy import to avoid SDK 54 deprecation errors
import * as FileSystem from 'expo-file-system/legacy';
import { encrypt, decrypt } from './crypto';

// Lazy init for DATA_FILE to avoid top-level native access on web
const getStorageFile = (filename) => {
    if (Platform.OS === 'web') return null;
    return (FileSystem.documentDirectory || '') + filename;
};

// Helper to check for web
const isWeb = Platform.OS === 'web';

// Storage keys
export const STORAGE_KEYS = {
    TRANSACTIONS: 'user_transactions',
    INCOME: 'user_income',
    BUDGETS: 'budgets_data',
    PROPERTIES: 'properties_data_v2',
    INVESTMENTS: 'investments_data',
    ASSETS: 'assets_data',
    COMMUNITY_POOLS: 'community_pools_data',
    GROUP_EXPENSES: 'group_expenses_data',
    CROWDFUNDING_CAMPAIGNS: 'crowdfunding_campaigns_data',
    EDUCATION_PROGRESS: 'education_progress_data_v2',
    LITERACY_SCORES: 'literacy_scores_data',
    TAX_PROFILE: 'tax_profile_data',
    USER_POINTS: 'user_points_data',
    USER_BADGES: 'user_badges_data',
    USER_SETTINGS: 'user_settings_data',
    BUSINESS_DATA: 'business_data',
    PLANNING_DEBT: 'planning_debt',
    PLANNING_EMERGENCY: 'planning_emergency',
    INCOME_CALENDAR: 'income_calendar',
    FEES: 'fees',
    PENDING_ITEMS: 'pending_items',
    FEEDBACK_LOGS: 'feedback_logs',
    NOTIFICATIONS: 'user_notifications',
    TODOS: 'user_todos',
    RECURRING_PAYMENTS: 'recurring_payments',
    APARTMENT_DATA: 'apartment_data',
    HOSTEL_DATA: 'hostel_data',
    AFFIRMATIONS_DATA: 'affirmations_data',
    SAVINGS: 'user_savings',
    LOANS: 'user_loans',
    EMIS: 'user_emis',
    BILLS: 'user_bills',
    TRAVEL: 'user_travel',
    CAREER: 'user_career_goals',
    FINANCIAL_HEALTH: 'user_financial_health',
    SETTINGS: 'user_settings',
    MEDICINES: 'user_medicines',
    EMERGENCY_FUND: 'user_emergency_fund',
    CASHBOOKS: 'user_cashbooks',
    VALIDITY: 'user_validity',
    FAMILY_MEMBERS: 'user_family_members_v2',
    FAMILY_EXPENSES: 'user_family_expenses_v2',
    CAREER_GOALS: 'user_career_goals_v3',
    CAREER_DOI: 'user_career_roi_history_v2',
    INVESTMENT_PORTFOLIOS: 'finlife_investment_portfolios_v1',
    INVESTMENT_HOLDINGS: 'finlife_investment_holdings_v1',
    INVESTMENT_EVENTS: 'finlife_investment_events_v1',
    SIP_SCHEDULES: 'finlife_sip_schedules_v1',
    INVESTMENT_MARKET_QUOTES: 'finlife_investment_market_quotes_v1',
    INCOME_SOURCES: 'user_income_sources',
    ACCOUNTS: 'user_bank_accounts',
    METALS_HISTORY: 'metals_price_history_v1',
    FINLIFE_SCHEMA: 'finlife_schema_version',
    P2P_LOANS: 'finlife_p2p_loans_v1',
    P2P_PERSONS: 'finlife_p2p_persons_v1',
    P2P_JOURNAL: 'finlife_p2p_journal_v1',
    P2P_ADVANCES: 'finlife_p2p_advances_v1',
    P2P_REPAYMENTS: 'finlife_p2p_repayments_v1',
    P2P_SETTINGS: 'finlife_p2p_settings_v1',
    P2P_OPERATIONS: 'finlife_p2p_operations_v1',
    P2P_SCHEDULES: 'finlife_p2p_schedules_v1',
    BANKING_BANKS: 'finlife_banking_banks_v1',
    BANKING_ACCOUNTS: 'finlife_banking_accounts_v1',
    BANKING_LOANS: 'finlife_banking_loans_v1',
    BANKING_JOURNAL: 'finlife_banking_journal_v1',
    BANKING_SCHEDULES: 'finlife_banking_schedules_v1',
    BANKING_DOCUMENTS: 'finlife_banking_documents_v1',
    BANKING_OPERATIONS: 'finlife_banking_operations_v1',
    BANKING_SETTINGS: 'finlife_banking_settings_v1'
};

/**
 * Save data to storage (FileSystem or localStorage)
 * ENFORCES AES-256-GCM ENCRYPTION FOR ALL DATA
 * @param {string} key - Storage key
 * @param {any} value - Data to save
 */
export const saveData = async (key, value) => {
    try {
        const jsonString = JSON.stringify(value);

        // 🔒 SECURE ENCRYPTION
        // We encrypt EVERYTHING, not just sensitive keys.
        // This ensures full privacy compliance (metadata protection).
        const encryptedData = await encrypt(jsonString);

        if (!encryptedData) throw new Error('Encryption failed');

        if (isWeb) {
            localStorage.setItem(key, encryptedData);
            return { success: true };
        } else {
            const SPECIFIC_FILE = getStorageFile(key + '.json');
            await FileSystem.writeAsStringAsync(SPECIFIC_FILE, encryptedData);
            return { success: true };
        }
    } catch (error) {
        console.error(`Error saving ${key}:`, error);
        return { success: false, error };
    }
};

/**
 * Load data from storage
 * DECRYPTS AES-256-GCM DATA
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 */
export const loadData = async (key, defaultValue = null) => {
    try {
        let content;
        if (isWeb) {
            content = localStorage.getItem(key);
        } else {
            const SPECIFIC_FILE = getStorageFile(key + '.json');
            const fileInfo = await FileSystem.getInfoAsync(SPECIFIC_FILE);
            if (!fileInfo.exists) return defaultValue;
            content = await FileSystem.readAsStringAsync(SPECIFIC_FILE);
        }

        if (!content) return defaultValue;

        // 🔓 ATTEMPT DECRYPTION
        let decrypted = await decrypt(content);

        // MIGRATION / FALLBACK
        // If decryption returns null, it might be legacy plaintext data (from before encryption).
        // In a real rollout, we would migrate immediately, but for now we fallback to plain JSON parse.
        if (decrypted === null) {
            console.warn(`[Storage] Warning: Loading legacy unencrypted data for ${key}. This data will be encrypted on next save.`);
            try {
                // Try parsing content directly (legacy plaintext)
                return JSON.parse(content);
            } catch (e) {
                // If it's not JSON, return default
                return defaultValue;
            }
        }

        try {
            return JSON.parse(decrypted);
        } catch (parseError) {
            console.warn(`[Storage] Warning: invalid JSON for ${key}, returning defaultValue`, parseError);
            return defaultValue;
        }
    } catch (error) {
        console.error(`Error loading ${key}:`, error);
        return defaultValue;
    }
};

/**
 * Delete data from storage
 * @param {string} key - Storage key
 */
export const deleteData = async (key) => {
    try {
        if (isWeb) {
            localStorage.removeItem(key);
            return { success: true };
        } else {
            const SPECIFIC_FILE = getStorageFile(key + '.json');
            await FileSystem.deleteAsync(SPECIFIC_FILE, { idempotent: true });
            return { success: true };
        }
    } catch (error) {
        console.error(`Error deleting ${key}:`, error);
        return { success: false, error };
    }
};

/**
 * Clear all app data
 * Note: On native this only clears the specific files we know about or all JSONS in doc dir
 */
export const clearAllData = async () => {
    try {
        if (isWeb) {
            localStorage.clear();
            return { success: true };
        } else {
            // Read directory
            const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            await Promise.all(jsonFiles.map(async file => {
                await FileSystem.deleteAsync(getStorageFile(file), { idempotent: true });
            }));
            return { success: true };
        }
    } catch (error) {
        console.error('Error clearing data:', error);
        return { success: false, error };
    }
};

/**
 * Get all keys (For debugging)
 */
export const getStorageSchemaVersion = async () => {
    const version = await loadData(STORAGE_KEYS.FINLIFE_SCHEMA, 1);
    return Number(version) || 1;
};

export const setStorageSchemaVersion = async (version) => {
    return saveData(STORAGE_KEYS.FINLIFE_SCHEMA, Number(version) || 1);
};

export const getAllKeys = async () => {
    try {
        if (isWeb) {
            return Object.keys(localStorage);
        } else {
            const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
        }
    } catch (error) {
        console.error('Error getting keys:', error);
        return [];
    }
};

// --- Backwards Compatibility / Legacy Adapters ---

// Alias for generic saveItem (used by some existing code)
export const saveItem = async (key, value) => {
    const result = await saveData(key, value);
    return result.success;
};

// Alias for generic getItem (used by some existing code)
export const getItem = async (key) => {
    return await loadData(key, null);
};

// Legacy financial data helpers (can typically delegate to generic storage now)
// Keeping specific implementation if it was different, but mapping to new scheme is better
export const saveFinancialData = async (data) => {
    return saveData('dashboard_stats', data);
};

export const getFinancialData = async () => {
    return loadData('dashboard_stats', null);
};

export const updateBusinessStats = async (moduleName, stats) => {
    try {
        const currentData = await getFinancialData() || {};
        if (!currentData.business) currentData.business = {};

        currentData.business[moduleName] = stats;
        currentData.business[moduleName].lastUpdated = new Date().toISOString();

        await saveFinancialData(currentData);
        return true;
    } catch (error) {
        console.error(`Error updating ${moduleName} stats:`, error);
        return false;
    }
};

export const updateCareerStats = async (goals) => {
    try {
        const currentData = await getFinancialData() || {};
        currentData.careerGoals = goals;
        currentData.careerLastUpdated = new Date().toISOString();

        await saveFinancialData(currentData);
        return true;
    } catch (error) {
        console.error('Error updating career stats:', error);
        return false;
    }
};

// Named export for backward compatibility
export const StorageService = {
    load: loadData,
    save: saveData,
    delete: deleteData,
    clear: clearAllData,
    getAllKeys,
    getStorageSchemaVersion,
    setStorageSchemaVersion
};

export default {
    saveData,
    loadData,
    deleteData,
    clearAllData,
    getAllKeys,
    saveItem,
    getItem,
    STORAGE_KEYS
};

// C.3 Investing Module Additive Storage Helpers
export const loadPortfolios = async () => (await loadData(STORAGE_KEYS.INVESTMENT_PORTFOLIOS, [])) || [];
export const savePortfolios = async (portfolios) => await saveData(STORAGE_KEYS.INVESTMENT_PORTFOLIOS, portfolios);

export const loadHoldings = async () => (await loadData(STORAGE_KEYS.INVESTMENT_HOLDINGS, [])) || [];
export const saveHoldings = async (holdings) => await saveData(STORAGE_KEYS.INVESTMENT_HOLDINGS, holdings);

export const loadInvestmentEvents = async () => (await loadData(STORAGE_KEYS.INVESTMENT_EVENTS, [])) || [];
export const saveInvestmentEvents = async (events) => await saveData(STORAGE_KEYS.INVESTMENT_EVENTS, events);

export const loadSipSchedules = async () => (await loadData(STORAGE_KEYS.SIP_SCHEDULES, [])) || [];
export const saveSipSchedules = async (schedules) => await saveData(STORAGE_KEYS.SIP_SCHEDULES, schedules);

export const loadMarketQuotes = async () => (await loadData(STORAGE_KEYS.INVESTMENT_MARKET_QUOTES, [])) || [];
export const saveMarketQuotes = async (quotes) => await saveData(STORAGE_KEYS.INVESTMENT_MARKET_QUOTES, quotes);

