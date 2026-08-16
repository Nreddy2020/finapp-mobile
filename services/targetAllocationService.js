/**
 * services/targetAllocationService.js
 * 
 * Stage C.6.1 Target Allocation Policy Engine.
 * Manages custom target allocation policies and battle-tested Model Portfolios
 * across FinLife's certified 8-asset taxonomy with strict 100% sum validation.
 * 
 * Certified Canonical Asset Classes (C.4.2):
 * STOCK, MUTUAL_FUND, ETF, GOLD, CRYPTO, BOND, REAL_ESTATE, OTHER
 * 
 * Preserves the frozen C.4/C.5 foundation and read-only invariants.
 */

import { loadData, saveData } from './storage.js';

export const CANONICAL_ASSET_CLASSES = Object.freeze([
    'STOCK',
    'MUTUAL_FUND',
    'ETF',
    'GOLD',
    'CRYPTO',
    'BOND',
    'REAL_ESTATE',
    'OTHER'
]);

export const DEFAULT_DRIFT_TOLERANCE_PP = 5.0; // ±5.00 percentage points

export const STORAGE_KEY_TARGET_POLICIES = 'target_allocation_policies_v1';

/**
 * Standard Pre-Configured Model Portfolios
 */
export const MODEL_PORTFOLIOS = Object.freeze({
    AGGRESSIVE_GROWTH: Object.freeze({
        policyId: 'model_aggressive_growth_v1',
        policyName: 'Aggressive Growth',
        version: '1.0.0',
        portfolioId: null, // Global template
        effectiveDate: '2024-01-01T00:00:00.000Z',
        assetWeights: Object.freeze({
            STOCK: 50.0,
            MUTUAL_FUND: 25.0,
            ETF: 15.0,
            GOLD: 5.0,
            CRYPTO: 5.0,
            BOND: 0.0,
            REAL_ESTATE: 0.0,
            OTHER: 0.0
        }),
        driftTolerancePercent: 5.0,
        createdAt: '2024-01-01T00:00:00.000Z'
    }),
    MODERATE_BALANCED: Object.freeze({
        policyId: 'model_moderate_balanced_v1',
        policyName: 'Moderate Balanced',
        version: '1.0.0',
        portfolioId: null,
        effectiveDate: '2024-01-01T00:00:00.000Z',
        assetWeights: Object.freeze({
            STOCK: 40.0,
            MUTUAL_FUND: 30.0,
            ETF: 15.0,
            GOLD: 10.0,
            CRYPTO: 0.0,
            BOND: 5.0,
            REAL_ESTATE: 0.0,
            OTHER: 0.0
        }),
        driftTolerancePercent: 5.0,
        createdAt: '2024-01-01T00:00:00.000Z'
    }),
    CONSERVATIVE_WEALTH: Object.freeze({
        policyId: 'model_conservative_wealth_v1',
        policyName: 'Conservative Wealth',
        version: '1.0.0',
        portfolioId: null,
        effectiveDate: '2024-01-01T00:00:00.000Z',
        assetWeights: Object.freeze({
            STOCK: 20.0,
            MUTUAL_FUND: 30.0,
            ETF: 15.0,
            GOLD: 15.0,
            CRYPTO: 0.0,
            BOND: 20.0,
            REAL_ESTATE: 0.0,
            OTHER: 0.0
        }),
        driftTolerancePercent: 4.0,
        createdAt: '2024-01-01T00:00:00.000Z'
    }),
    ALL_WEATHER_CLASSIC: Object.freeze({
        policyId: 'model_all_weather_classic_v1',
        policyName: 'All-Weather Classic',
        version: '1.0.0',
        portfolioId: null,
        effectiveDate: '2024-01-01T00:00:00.000Z',
        assetWeights: Object.freeze({
            STOCK: 30.0,
            MUTUAL_FUND: 20.0,
            ETF: 15.0,
            GOLD: 15.0,
            CRYPTO: 0.0,
            BOND: 20.0,
            REAL_ESTATE: 0.0,
            OTHER: 0.0
        }),
        driftTolerancePercent: 5.0,
        createdAt: '2024-01-01T00:00:00.000Z'
    })
});

export const TargetAllocationService = {
    /**
     * Validate a Target Allocation Policy object strictly against financial rules.
     * @param {Object} policy 
     * @returns {{ isValid: boolean, normalizedPolicy: Object|null, errors: string[] }}
     */
    validatePolicy(policy) {
        const errors = [];

        if (!policy || typeof policy !== 'object') {
            return { isValid: false, normalizedPolicy: null, errors: ['Policy must be a non-null object.'] };
        }

        if (!policy.policyId || typeof policy.policyId !== 'string' || policy.policyId.trim().length === 0) {
            errors.push('policyId is required and must be a non-empty string.');
        }

        if (!policy.policyName || typeof policy.policyName !== 'string' || policy.policyName.trim().length === 0) {
            errors.push('policyName is required and must be a non-empty string.');
        }

        if (!policy.version || typeof policy.version !== 'string') {
            errors.push('version is required (e.g., "1.0.0").');
        }

        const effectiveDate = policy.effectiveDate || new Date().toISOString();
        if (isNaN(new Date(effectiveDate).getTime())) {
            errors.push('effectiveDate must be a valid ISO-8601 date string.');
        }

        if (!policy.assetWeights || typeof policy.assetWeights !== 'object') {
            errors.push('assetWeights object is required.');
            return { isValid: false, normalizedPolicy: null, errors };
        }

        // Validate canonical asset classes
        const normalizedWeights = {};
        let totalWeight = 0;

        for (const assetClass of CANONICAL_ASSET_CLASSES) {
            const rawWeight = policy.assetWeights[assetClass];
            const weight = Number(rawWeight !== undefined ? rawWeight : 0);

            if (isNaN(weight) || !isFinite(weight)) {
                errors.push(`Weight for asset class ${assetClass} must be a finite number.`);
            } else if (weight < 0) {
                errors.push(`Weight for asset class ${assetClass} cannot be negative (got ${weight}%).`);
            } else if (weight > 100) {
                errors.push(`Weight for asset class ${assetClass} cannot exceed 100% (got ${weight}%).`);
            } else {
                normalizedWeights[assetClass] = Number(weight.toFixed(4));
                totalWeight += normalizedWeights[assetClass];
            }
        }

        // Check for any unknown / invalid asset class keys
        for (const key of Object.keys(policy.assetWeights)) {
            if (!CANONICAL_ASSET_CLASSES.includes(key)) {
                errors.push(`Unknown asset class '${key}'. Only canonical classes (${CANONICAL_ASSET_CLASSES.join(', ')}) are supported.`);
            }
        }

        // Validate 100.00% target sum with numerical tolerance
        const sumDiff = Math.abs(totalWeight - 100.0);
        if (sumDiff > 0.001) {
            errors.push(`Total target weights must sum to exactly 100.00% (current sum: ${totalWeight.toFixed(4)}%).`);
        }

        // Validate Drift Tolerance (in percentage points)
        const driftTol = Number(policy.driftTolerancePercent !== undefined ? policy.driftTolerancePercent : DEFAULT_DRIFT_TOLERANCE_PP);
        if (isNaN(driftTol) || !isFinite(driftTol) || driftTol < 0.1 || driftTol > 50.0) {
            errors.push(`driftTolerancePercent must be between 0.1 pp and 50.0 pp (got ${driftTol}).`);
        }

        if (errors.length > 0) {
            return { isValid: false, normalizedPolicy: null, errors };
        }

        const normalizedPolicy = {
            policyId: policy.policyId.trim(),
            policyName: policy.policyName.trim(),
            version: policy.version.trim(),
            portfolioId: policy.portfolioId || null,
            effectiveDate: new Date(effectiveDate).toISOString(),
            assetWeights: normalizedWeights,
            driftTolerancePercent: Number(driftTol.toFixed(2)),
            createdAt: policy.createdAt ? new Date(policy.createdAt).toISOString() : new Date().toISOString()
        };

        return { isValid: true, normalizedPolicy, errors: [] };
    },

    /**
     * Factory to create and validate a new Target Allocation Policy.
     * @param {Object} params
     * @returns {Object} Validated TargetAllocationPolicy
     * @throws {Error} if validation fails
     */
    createPolicy(params) {
        const { isValid, normalizedPolicy, errors } = this.validatePolicy(params);
        if (!isValid) {
            throw new Error(`TargetAllocationPolicy validation failed: ${errors.join('; ')}`);
        }
        return normalizedPolicy;
    },

    /**
     * Get list of all standard built-in model portfolios.
     * @returns {Object[]}
     */
    getModelPortfolios() {
        return Object.values(MODEL_PORTFOLIOS).map(p => JSON.parse(JSON.stringify(p)));
    },

    /**
     * Load all saved policies from storage.
     * @returns {Promise<Object[]>}
     */
    async getAllPolicies() {
        const data = await loadData(STORAGE_KEY_TARGET_POLICIES);
        if (!data || !Array.isArray(data) || data.length === 0) {
            return this.getModelPortfolios();
        }
        return data;
    },

    /**
     * Save or update a policy in storage.
     * @param {Object} policy 
     * @returns {Promise<Object>} Validated and saved policy
     */
    async savePolicy(policy) {
        const validated = this.createPolicy(policy);
        const allPolicies = await this.getAllPolicies();
        const index = allPolicies.findIndex(p => p.policyId === validated.policyId);

        if (index >= 0) {
            allPolicies[index] = validated;
        } else {
            allPolicies.push(validated);
        }

        await saveData(STORAGE_KEY_TARGET_POLICIES, allPolicies);
        return validated;
    },

    /**
     * Find a policy by its unique policyId.
     * @param {string} policyId 
     * @returns {Promise<Object|null>}
     */
    async getPolicyById(policyId) {
        if (!policyId) return null;
        const allPolicies = await this.getAllPolicies();
        return allPolicies.find(p => p.policyId === policyId) || null;
    },

    /**
     * Get the active policy for a specific portfolio (or fallback to global / default).
     * @param {string|null} portfolioId 
     * @returns {Promise<Object>}
     */
    async getPolicyForPortfolio(portfolioId = null) {
        const allPolicies = await this.getAllPolicies();

        if (portfolioId) {
            const scoped = allPolicies.find(p => p.portfolioId === portfolioId);
            if (scoped) return scoped;
        }

        // Fallback to global user policy
        const globalPolicy = allPolicies.find(p => p.portfolioId === null && !p.policyId.startsWith('model_'));
        if (globalPolicy) return globalPolicy;

        // Default to Moderate Balanced model portfolio
        return JSON.parse(JSON.stringify(MODEL_PORTFOLIOS.MODERATE_BALANCED));
    },

    /**
     * Delete a custom policy by ID (Built-in models cannot be deleted).
     * @param {string} policyId 
     * @returns {Promise<boolean>}
     */
    async deletePolicy(policyId) {
        if (!policyId || Object.values(MODEL_PORTFOLIOS).some(m => m.policyId === policyId)) {
            return false; // Prevent deleting model templates
        }

        const allPolicies = await this.getAllPolicies();
        const filtered = allPolicies.filter(p => p.policyId !== policyId);
        if (filtered.length !== allPolicies.length) {
            await saveData(STORAGE_KEY_TARGET_POLICIES, filtered);
            return true;
        }
        return false;
    }
};

export default TargetAllocationService;
