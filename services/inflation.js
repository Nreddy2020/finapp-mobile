/**
 * Inflation Service - Frontend
 * Handles all inflation-related API calls and data management
 */

import { api } from './api';

class InflationService {
    /**
     * Get current inflation rate
     * @param {string} source - Data source (RBI, WorldBank, IMF, Manual)
     * @param {string} category - Category (overall, food, housing, etc.)
     * @param {string} countryCode - Country code (default: IND)
     * @param {string} region - Optional region
     * @returns {Promise<Object>} Inflation rate data
     */
    static async getCurrentInflation(source = 'RBI', category = 'overall', countryCode = 'IND', region = null) {
        try {
            const params = new URLSearchParams({
                source,
                category,
                country_code: countryCode
            });

            if (region) {
                params.append('region', region);
            }

            // Secure API call (Auto-Auth, Auto-Device-ID)
            return await api.get(`/inflation/current?${params.toString()}`);

        } catch (error) {
            console.error('Error fetching current inflation:', error);
            // Fallback for offline resilience
            return {
                rate: 6.0,
                source: source,
                category,
                period_end: new Date().toISOString(),
                is_forecast: false,
                is_fallback: true
            };
        }
    }

    /**
     * Get historical inflation data
     */
    static async getHistoricalInflation(source = 'RBI', category = 'overall', startDate = null, endDate = null, countryCode = 'IND') {
        try {
            const params = new URLSearchParams({
                source,
                category,
                country_code: countryCode
            });

            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            return await api.get(`/inflation/historical?${params.toString()}`);
        } catch (error) {
            console.error('Error fetching historical inflation:', error);
            return { data: [], count: 0 };
        }
    }

    /**
     * Get category-specific inflation rates
     */
    static async getCategoryInflation(source = 'RBI', countryCode = 'IND') {
        try {
            const params = new URLSearchParams({
                source,
                country_code: countryCode
            });

            return await api.get(`/inflation/categories?${params.toString()}`);
        } catch (error) {
            console.error('Error fetching category inflation:', error);
            return { overall: 6.0 };
        }
    }

    /**
     * Get personalized inflation rate
     */
    static async getPersonalizedInflation(userId, source = 'RBI') {
        try {
            const params = new URLSearchParams({ source });
            return await api.get(`/inflation/personalized/${userId}?${params.toString()}`);
        } catch (error) {
            console.error('Error fetching personalized inflation:', error);
            return null;
        }
    }

    /**
     * Get user inflation preferences
     */
    static async getUserPreferences(userId) {
        try {
            return await api.get(`/inflation/preferences/${userId}`);
        } catch (error) {
            console.error('Error fetching user preferences:', error);
            return {
                user_id: userId,
                preferred_source: 'RBI',
                auto_update_enabled: true
            };
        }
    }

    /**
     * Update user inflation preferences
     */
    static async updateUserPreferences(userId, preferences) {
        try {
            return await api.post(`/inflation/preferences/${userId}`, preferences);
        } catch (error) {
            console.error('Error updating user preferences:', error);
            throw error;
        }
    }

    /**
     * Calculate inflation impact
     */
    static async calculateInflationImpact(amount, years, inflationRate = null, source = 'RBI') {
        try {
            const params = new URLSearchParams({ source });
            return await api.post(`/inflation/impact?${params.toString()}`, {
                amount,
                years,
                inflation_rate: inflationRate
            });
        } catch (error) {
            console.error('Error calculating inflation impact:', error);
            // Fallback calculation
            const rate = inflationRate || 6.0;
            const futureValue = amount * Math.pow(1 + rate / 100, years);
            return {
                current_amount: amount,
                future_nominal_value: futureValue,
                purchasing_power_loss: futureValue - amount,
                real_value_today: amount / Math.pow(1 + rate / 100, years),
                inflation_rate: rate,
                years
            };
        }
    }

    /**
     * Get available data sources
     */
    static async getAvailableSources() {
        try {
            return await api.get('/inflation/sources');
        } catch (error) {
            console.error('Error fetching sources:', error);
            return [{ id: 'RBI', name: 'Reserve Bank of India' }];
        }
    }

    /**
     * Refresh inflation data from source
     */
    static async refreshInflationData(source, category = 'overall') {
        try {
            const params = new URLSearchParams({ category });
            return await api.post(`/inflation/refresh/${source}?${params.toString()}`, {});
        } catch (error) {
            console.error('Error refreshing inflation data:', error);
            return { success: false };
        }
    }

    /**
     * Subscribe to inflation updates (polling-based for now)
     */
    static subscribeToInflationUpdates(callback, interval = 6 * 60 * 60 * 1000, source = 'RBI', category = 'overall') {
        this.getCurrentInflation(source, category).then(callback);
        return setInterval(() => {
            this.getCurrentInflation(source, category).then(callback);
        }, interval);
    }

    static unsubscribeFromInflationUpdates(subscriptionId) {
        if (subscriptionId) {
            clearInterval(subscriptionId);
        }
    }
}

export { InflationService };
