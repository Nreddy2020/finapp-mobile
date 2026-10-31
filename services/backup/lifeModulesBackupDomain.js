/**
 * services/backup/lifeModulesBackupDomain.js
 *
 * Unified-backup domain for the stores introduced with Goals & Life Planning,
 * Apartment & Society and Decision Intelligence. Each store keeps its own validator,
 * so a backup can never restore a document those modules would refuse to read.
 * A missing store is represented as `null` and restored as a delete, mirroring the
 * time-planning domain. Older backups without this domain leave the target untouched.
 */
import { StorageService, STORAGE_KEYS } from '../storage.js';
import { LIFE_GOALS_STORAGE_KEY, validateGoals } from '../life/lifeGoalsService.js';
import { FOCUS_STORAGE_KEY, validateFocus } from '../time/focusService.js';
import { HABITS_STORAGE_KEY, validateHabits } from '../time/habitsService.js';
import { validateItems as validateValidityItems } from '../validity/validityService.js';
import { CAREER_STORAGE_KEY, validateCareer } from '../career/careerOsService.js';
import { APARTMENT_SOCIETY_STORAGE_KEY, validateSociety } from '../business/apartmentSocietyService.js';
import { APARTMENT_HOME_STORAGE_KEY, validateHome } from '../apartment.js';
import { MARKETS_STORAGE_KEY, validateMarkets } from '../intelligence/marketsService.js';
import { normalizeProfile } from '../tax/taxEngine.js';

/** store name -> [storage key, validator, empty means "nothing to back up"] */
export const LIFE_MODULE_STORES = Object.freeze({
    lifeGoals: [LIFE_GOALS_STORAGE_KEY, validateGoals, doc => !doc.goals.length],
    focus: [FOCUS_STORAGE_KEY, validateFocus, doc => !doc.sessions.length],
    habits: [HABITS_STORAGE_KEY, validateHabits, doc => !doc.habits.length],
    validity: [STORAGE_KEYS.VALIDITY, rows => { validateValidityItems(rows); return rows; }, rows => !rows.length],
    career: [CAREER_STORAGE_KEY, validateCareer, doc => !doc.goals.length && !doc.skills.length && !doc.learning.length && !doc.applications.length && !doc.incomeHistory.length && !doc.profile.role],
    apartmentSociety: [APARTMENT_SOCIETY_STORAGE_KEY, validateSociety, doc => !doc.units.length && !doc.society.name],
    apartmentHome: [APARTMENT_HOME_STORAGE_KEY, validateHome, doc => !doc.lease && !doc.flatmates.length && !doc.sharedBills.length],
    markets: [MARKETS_STORAGE_KEY, validateMarkets, doc => !doc.watchlist.length && !doc.alerts.length],
    apartmentDues: [STORAGE_KEYS.APARTMENT_DATA, rows => { if (!Array.isArray(rows)) throw new Error('Saved dues could not be read.'); return rows; }, rows => !rows.length],
    taxProfile: [STORAGE_KEYS.TAX_PROFILE, doc => { if (!doc || typeof doc !== 'object') throw new Error('Saved tax profile could not be read.'); normalizeProfile(doc); return doc; }, doc => !doc.income && !doc.otherIncome]
});

export function validateLifeModulesBackup(domain) {
    if (!domain || domain.schemaVersion !== 1 || !domain.stores || typeof domain.stores !== 'object') throw new Error('INVALID_LIFE_BACKUP: Unsupported or incomplete life-modules domain.');
    for (const [name, [, validate]] of Object.entries(LIFE_MODULE_STORES)) {
        if (!Object.prototype.hasOwnProperty.call(domain.stores, name)) throw new Error(`INVALID_LIFE_BACKUP: Missing store ${name}.`);
        if (domain.stores[name] !== null) validate(domain.stores[name]);
    }
    return domain;
}
export async function collectLifeModulesBackup() {
    const stores = {};
    for (const [name, [key]] of Object.entries(LIFE_MODULE_STORES)) stores[name] = await StorageService.load(key, null, { strict: true });
    return validateLifeModulesBackup({ schemaVersion: 1, stores });
}
export async function writeLifeModulesBackup(domain) {
    validateLifeModulesBackup(domain);
    for (const [name, [key]] of Object.entries(LIFE_MODULE_STORES)) {
        const value = domain.stores[name];
        const result = value === null ? await StorageService.delete(key) : await StorageService.save(key, value, { atomic: true });
        if (!result?.success) throw new Error(`LIFE_RESTORE_WRITE_FAILED: ${name}`);
    }
}
export function hasLifeModulesData(domain) {
    return Object.entries(LIFE_MODULE_STORES).some(([name, [, , isEmpty]]) => domain.stores[name] !== null && !isEmpty(domain.stores[name]));
}
export function countLifeModulesEntities(domain) {
    let count = 0;
    for (const [name, value] of Object.entries(domain.stores)) {
        if (value === null) continue;
        if (Array.isArray(value)) count += value.length;
        else if (name === 'taxProfile') count += 1;
        else for (const v of Object.values(value)) if (Array.isArray(v)) count += v.length;
    }
    return count;
}
