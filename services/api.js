import { AuthService } from './auth';
import { getDeviceFingerprint } from './device';
import { loadData, saveData, STORAGE_KEYS } from './storage';
import { API_BASE_URL } from './runtimeConfig';

const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;

const simulateApiResponse = (endpoint, options) => {
    const cleanEndpoint = endpoint.split('?')[0];
    
    if (cleanEndpoint.startsWith('/inflation/current')) {
        return {
            rate: 5.4,
            source: 'RBI',
            category: 'overall',
            period_end: new Date().toISOString(),
            is_forecast: false
        };
    }
    if (cleanEndpoint.startsWith('/inflation/categories')) {
        return {
            overall: 5.4,
            food: 6.2,
            housing: 4.5,
            fuel: 3.8
        };
    }
    if (cleanEndpoint.startsWith('/inflation/personalized')) {
        return {
            rate: 5.8,
            personalized_rate: 5.8,
            source: 'RBI',
            period_end: new Date().toISOString(),
            is_forecast: false
        };
    }
    if (cleanEndpoint.startsWith('/inflation/sources')) {
        return [
            { id: 'RBI', name: 'Reserve Bank of India' },
            { id: 'WB', name: 'World Bank' }
        ];
    }
    if (cleanEndpoint.startsWith('/metals/prices')) {
        return {
            gold_24k: 160000,
            gold_22k: 146672,
            gold: 160000,
            silver: 350000,
            timestamp: new Date().toISOString()
        };
    }
    if (cleanEndpoint.startsWith('/loans')) {
        return [];
    }
    if (options.method === 'POST' || options.method === 'PUT') {
        return { success: true };
    }
    return [];
};

// Resolved at runtime so it works in Expo web (relative) AND native (env var or localhost).
// Set EXPO_PUBLIC_API_URL in your .env / eas.json for production.
const BASE_URL = API_BASE_URL;

/**
 * Generates a UUID-like string for Idempotency Keys.
 * (Simple implementation suitable for frontend generation)
 */
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const api = {
    /**
     * Generic fetch wrapper with security headers.
     * @param {string} endpoint - e.g., '/transactions'
     * @param {object} options - Request options (method, body, etc.)
     * @param {boolean} requiresIdempotency - Auto-generate Idempotency-Key for POST/PUT
     */
    request: async (endpoint, options = {}, requiresIdempotency = false) => {
        const token = await AuthService.getAccessToken();
        const deviceId = await getDeviceFingerprint();

        const headers = {
            'Content-Type': 'application/json',
            'X-Device-ID': deviceId,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        };

        // Auto-inject Idempotency Key for mutations if requested
        if (requiresIdempotency && (options.method === 'POST' || options.method === 'PUT')) {
            headers['Idempotency-Key'] = generateUUID();
        }

        const { API_ORIGIN, DEMO_MODE_ENABLED } = require('./runtimeConfig');
        if (!API_ORIGIN && DEMO_MODE_ENABLED) {
            console.log(`[API Interceptor] Simulating response for endpoint: ${endpoint}`);
            return simulateApiResponse(endpoint, options);
        }

        const config = {
            ...options,
            headers
        };

        try {
            let response = await fetch(`${BASE_URL}${endpoint}`, config);

            // Handle 401 Unauthorized (Token Expiry)
            if (response.status === 401) {
                console.log('API 401: Attempting Token Refresh...');
                // Note: AuthService.getSession() handles refresh logic internally if expired,
                // but if the backend rejected it, we might need a force refresh or logout.
                // For MVP, we'll try to re-fetch the token once.

                const newToken = await AuthService.getAccessToken(); // This might trigger refresh logic if implemented
                if (newToken && newToken !== token) {
                    // Retry with new token
                    headers['Authorization'] = `Bearer ${newToken}`;
                    config.headers = headers;
                    response = await fetch(`${BASE_URL}${endpoint}`, config);
                } else {
                    // Refresh failed or returned same invalid token
                    await AuthService.logout();
                    throw new Error('Session expired. Please login again.');
                }
            }

            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // If not JSON (e.g., 404 HTML), read as text and throw
                const text = await response.text();
                console.warn(`API Non-JSON Response [${endpoint}]:`, text.substring(0, 100));
                throw new Error(`API returned non-JSON response: ${response.status}`);
            }

            if (!response.ok) {
                throw new Error(data.detail || data.message || 'API Request Failed');
            }

            return data;

        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    get: (endpoint) => api.request(endpoint, { method: 'GET' }),

    post: (endpoint, body, requiresIdempotency = true) =>
        api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }, requiresIdempotency),

    put: (endpoint, body, requiresIdempotency = true) =>
        api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }, requiresIdempotency),

    delete: (endpoint) => api.request(endpoint, { method: 'DELETE' })
};

import {
    mockDashboardData,
    mockBankAccounts,
    mockAssets,
    mockBillReminders,
    mockInvestments,
    mockProperties,
    mockAIInsights,
    mockBudgets,
    mockTaxReminders,
    mockRecurringPayments,
    mockSavingsGoals,
    mockExpenses,
    mockIncome,
    mockLoans,
    mockCareerGoals
} from './mockData';

/**
 * Dashboard API Functions
 * These functions fetch data for the dashboard.
 * Currently using mock data as backend endpoints are being developed.
 */

export const getDashboardData = async () => {
    try {
        // TODO: Replace with actual API call when backend endpoint is ready
        // return await api.get('/dashboard');

        // For now, return mock data with active_accounts added
        return {
            ...mockDashboardData,
            active_accounts: mockBankAccounts.map(acc => ({
                ...acc,
                current_balance: acc.balance
            }))
        };
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return mockDashboardData;
    }
};

export const getDailySurvivalStatus = async () => {
    try {
        // TODO: Replace with actual API call
        // return await api.get('/survival/daily-status');

        // Calculate mock survival data
        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const daysRemaining = Math.ceil((endOfMonth - today) / (1000 * 60 * 60 * 24));
        const remainingToSpend = 25000; // Mock value
        const dailyLimit = Math.floor(remainingToSpend / daysRemaining);

        return {
            dailyLimit,
            remainingToSpend,
            daysRemaining,
            spentToday: 0
        };
    } catch (error) {
        console.error('Error fetching survival status:', error);
        return { dailyLimit: 0, remainingToSpend: 0, daysRemaining: 1, spentToday: 0 };
    }
};

export const getAssets = async () => {
    try {
        // TODO: Replace with actual API call
        // return await api.get('/assets');
        return mockAssets;
    } catch (error) {
        console.error('Error fetching assets:', error);
        return [];
    }
};

export const getLoans = async () => {
    try {
        // Try real backend first
        const data = await api.get('/loans');
        // Cache successful response locally for offline use
        if (isNonEmptyArray(data)) await saveData(STORAGE_KEYS.LOANS, data);
        return data;
    } catch (error) {
        // Backend unavailable — fall back to local storage, then mock
        const cached = await loadData(STORAGE_KEYS.LOANS, null);
        if (isNonEmptyArray(cached)) return cached;
        console.warn('[API] getLoans: backend unavailable, using mock data');
        return mockLoans;
    }
};

/**
 * Fetch live precious-metal prices from the backend.
 * Falls back to MetalsService simulated prices if the endpoint is unreachable.
 */
export const getMetalPrices = async () => {
    try {
        const data = await api.get('/metals/prices');
        // Normalise to the shape MetalsService.getLivePrices() returns
        return {
            GOLD_24K: data.gold_24k ?? data.GOLD_24K,
            GOLD_22K: data.gold_22k ?? data.GOLD_22K,
            GOLD: data.gold_24k ?? data.GOLD_24K,
            SILVER: data.silver ?? data.SILVER,
            GOLD_24K_PER_GRAM: Math.round((data.gold_24k ?? data.GOLD_24K ?? 160000) / 10),
            GOLD_22K_PER_GRAM: Math.round((data.gold_22k ?? data.GOLD_22K ?? 147000) / 10),
            SILVER_PER_GRAM: Math.round((data.silver ?? data.SILVER ?? 350000) / 1000),
            timestamp: data.timestamp ?? new Date().toISOString(),
        };
    } catch {
        // Fall through to MetalsService simulation
        const { MetalsService } = require('./metals');
        return MetalsService.getLivePrices();
    }
};

export const getBillReminders = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.BILLS, null);
        return isNonEmptyArray(saved) ? saved : mockBillReminders;
    } catch (error) {
        console.error('Error fetching bill reminders:', error);
        return mockBillReminders;
    }
};

export const getBankAccounts = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.ACCOUNTS, null);
        return isNonEmptyArray(saved) ? saved : mockBankAccounts;
    } catch (error) {
        console.error('Error fetching bank accounts:', error);
        return mockBankAccounts;
    }
};

export const getInvestments = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.INVESTMENTS, null);
        return isNonEmptyArray(saved) ? saved : mockInvestments;
    } catch (error) {
        console.error('Error fetching investments:', error);
        return mockInvestments;
    }
};

export const getProperties = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.PROPERTIES, null);
        return isNonEmptyArray(saved) ? saved : mockProperties;
    } catch (error) {
        console.error('Error fetching properties:', error);
        return mockProperties;
    }
};

export const getAIInsights = async () => {
    try {
        // TODO: Replace with actual API call
        // return await api.get('/insights/ai');
        return mockAIInsights;
    } catch (error) {
        console.error('Error fetching AI insights:', error);
        return { health_score: 0, recommendations: [] };
    }
};

export const getLendingSummary = async () => {
    try {
        // TODO: Replace with actual API call
        // return await api.get('/loans/lending-summary');

        // Calculate from mock loans
        const lendingLoans = mockLoans.filter(loan => loan.is_lending);
        const borrowingLoans = mockLoans.filter(loan => !loan.is_lending);

        return {
            lent: lendingLoans.reduce((sum, loan) => sum + loan.outstanding, 0),
            borrowed: borrowingLoans.reduce((sum, loan) => sum + loan.outstanding, 0)
        };
    } catch (error) {
        console.error('Error fetching lending summary:', error);
        return { lent: 0, borrowed: 0 };
    }
};

export const getBudgets = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.BUDGETS, null);
        return isNonEmptyArray(saved) ? saved : mockBudgets;
    } catch (error) {
        console.error('Error fetching budgets:', error);
        return mockBudgets;
    }
};

export const getCreditScore = async () => {
    try {
        // TODO: Replace with actual API call
        // return await api.get('/credit-score');
        return {
            score: 750,
            status: 'Good',
            last_updated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error fetching credit score:', error);
        return null;
    }
};

export const getTaxReminders = async () => {
    try {
        // TODO: Replace with actual API call
        // return await api.get('/tax/reminders');
        return mockTaxReminders;
    } catch (error) {
        console.error('Error fetching tax reminders:', error);
        return [];
    }
};

export const getInvestmentsSummary = async () => {
    try {
        // TODO: Replace with actual API call
        // return await api.get('/investments/summary');

        // Calculate from mock investments
        const total = mockInvestments.reduce((sum, inv) => sum + inv.current_value, 0);
        const invested = mockInvestments.reduce((sum, inv) => sum + inv.invested, 0);
        const change = total - invested;

        return { total, invested, change };
    } catch (error) {
        console.error('Error fetching investments summary:', error);
        return { total: 0, invested: 0, change: 0 };
    }
};

export const getSavingsSummary = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.SAVINGS, null);
        const source = isNonEmptyArray(saved) ? saved : (mockSavingsGoals || []);
        return source.map(goal => ({
            ...goal,
            current_amount: goal.saved,
            target_amount: goal.target
        }));
    } catch (error) {
        console.error('Error fetching savings summary:', error);
        return (mockSavingsGoals || []).map(goal => ({
            ...goal,
            current_amount: goal.saved,
            target_amount: goal.target
        }));
    }
};

export const getRecurringPayments = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.RECURRING_PAYMENTS, null);
        return isNonEmptyArray(saved) ? saved : mockRecurringPayments;
    } catch (error) {
        console.error('Error fetching recurring payments:', error);
        return mockRecurringPayments;
    }
};

// ============================================================================
// DOMAIN SPECIFIC API CALLS (Mapped to Mock Data for V1)
// ============================================================================

export const getTransactions = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.TRANSACTIONS, null);
        return isNonEmptyArray(saved) ? saved : (mockExpenses || []);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return mockExpenses || [];
    }
};

export const getIncome = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.INCOME_SOURCES, null);
        return isNonEmptyArray(saved) ? saved : (mockIncome || []);
    } catch (error) {
        console.error('Error fetching income:', error);
        return mockIncome || [];
    }
};

export const getBills = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.BILLS, null);
        return isNonEmptyArray(saved) ? saved : (mockBillReminders || []);
    } catch (error) {
        console.error('Error fetching bills:', error);
        return mockBillReminders || [];
    }
};

export const getSavings = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.SAVINGS, null);
        const source = isNonEmptyArray(saved) ? saved : (mockSavingsGoals || []);
        return source.map(g => ({
            ...g,
            currentAmount: g.saved,
            targetAmount: g.target
        }));
    } catch (error) {
        console.error('Error fetching savings:', error);
        return (mockSavingsGoals || []).map(g => ({
            ...g,
            currentAmount: g.saved,
            targetAmount: g.target
        }));
    }
};

export const getInsights = async () => {
    return mockAIInsights || null;
};

// ============ ADDITIONAL API STUBS (backed by storage/mock data) ============

/**
 * Alias for getTransactions — some screens call getExpenses
 */
export const getExpenses = getTransactions;

/**
 * Career Goals — loaded from storage, falls back to mockCareerGoals
 */
export const getCareerGoals = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.CAREER_GOALS, null);
        if (isNonEmptyArray(saved)) return saved;
        return mockCareerGoals || [];
    } catch {
        return mockCareerGoals || [];
    }
};

/**
 * Travel Plans — loaded from storage
 */
export const getTravelPlans = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.TRAVEL, null);
        return isNonEmptyArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

/**
 * Validity / Documents — loaded from storage
 */
export const getValidityItems = async () => {
    try {
        const saved = await loadData(STORAGE_KEYS.VALIDITY, null);
        return isNonEmptyArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

/**
 * Financial Health Metrics — returns AI insights / health score
 */
export const getFinancialHealthMetrics = async () => {
    return mockAIInsights || { health_score: 75, recommendations: [] };
};

/**
 * Savings Goals — alias backed by SavingsService / storage
 */
export const getSavingsGoals = getSavingsSummary;

// Aliases for compatibility if needed elsewhere
export const getSaved = getSavings;

export default {
    ...api,
    getDashboardData,
    getDailySurvivalStatus,
    getAssets,
    getLoans,
    getBillReminders,
    getBankAccounts,
    getInvestments,
    getProperties,
    getAIInsights,
    getLendingSummary,
    getBudgets,
    getCreditScore,
    getTaxReminders,
    getInvestmentsSummary,
    getSavingsSummary,
    getRecurringPayments,
    getTransactions,
    getIncome,
    getBills,
    getSavings,
    getInsights,
    getExpenses,
    getCareerGoals,
    getTravelPlans,
    getValidityItems,
    getFinancialHealthMetrics,
    getSavingsGoals,
    getMetalPrices,
};
