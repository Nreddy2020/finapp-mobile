import { StorageService, STORAGE_KEYS } from './storage';
import { normalizeProfile, defaultProfile, computeRegime, compareRegimes, deductionOpportunities, advanceTaxSchedule, filingChecklist, FINANCIAL_YEARS } from './tax/taxEngine.js';

/**
 * TaxService — personal tax profile owner. Calculations delegate to the deterministic
 * tax engine; the return shape of calculateTax stays backward compatible
 * ({ taxableIncome, taxPayload, cess, totalTax }) and adds the full breakdown.
 */
export const TaxService = {
    FINANCIAL_YEARS,
    getProfile: async () => {
        const data = await StorageService.load(STORAGE_KEYS.TAX_PROFILE);
        return normalizeProfile(data || defaultProfile());
    },
    saveProfile: async (profile) => {
        const normalized = normalizeProfile(profile);
        const saved = await StorageService.save(STORAGE_KEYS.TAX_PROFILE, normalized, { atomic: true });
        if (!saved?.success) throw new Error('Your tax profile could not be saved. Keep your changes and retry.');
        return normalized;
    },
    calculateTax: (profile) => {
        const p = normalizeProfile(profile);
        const result = computeRegime(p, p.regime);
        return { ...result, taxableIncome: result.taxableIncome, taxPayload: result.taxAfterRebate + result.capitalGains.total + result.surcharge, cess: result.cess, totalTax: result.totalTax };
    },
    compare: profile => compareRegimes(profile),
    opportunities: profile => deductionOpportunities(profile),
    advanceTax: (profile, today) => advanceTaxSchedule(profile, null, today),
    checklist: profile => filingChecklist(profile)
};
