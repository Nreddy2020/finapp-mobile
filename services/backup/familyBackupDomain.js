import AsyncStorage from '@react-native-async-storage/async-storage';
import {StorageService, STORAGE_KEYS} from '../storage.js';
import {FamilyLifeEventStore, LIFE_EVENTS_STORAGE_KEY} from '../family/familyLifeEventStore.js';

const legacy = {people:'PEOPLE',households:'HOUSEHOLDS',memberships:'MEMBERSHIPS',relationships:'RELATIONSHIPS',trustedCircle:'TRUSTED_CIRCLE',documents:'DOCUMENTS',responsibilities:'RESPONSIBILITIES',tasks:'TASKS',emergencyContacts:'EMERGENCY_CONTACTS',protectionItems:'PROTECTION_ITEMS',financialLinks:'FINANCIAL_LINKS',budgetPools:'BUDGET_POOLS',forecastScenarios:'FORECAST_SCENARIOS',goals:'GOALS',memberIncomeStreams:null};
export const FAMILY_BACKUP_COLLECTIONS = Object.freeze(Object.keys(legacy));
function rows(value, name) {
    if (!Array.isArray(value)) throw new Error('INVALID_FAMILY_BACKUP: Missing collection '+name);
    const ids=new Set();
    for(const row of value) {
        if(!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error('INVALID_FAMILY_BACKUP: Invalid or duplicate id in '+name);
        ids.add(row.id);
    }
}
export function validateFamilyBackup(domain) {
    if (!domain || domain.schemaVersion !== 1 || domain.snapshot?.version !== 2 || !domain.snapshot.collections) throw new Error('INVALID_FAMILY_BACKUP: Unsupported schema');
    const collections=domain.snapshot.collections;
    if(Object.keys(collections).some(name=>!FAMILY_BACKUP_COLLECTIONS.includes(name))) throw new Error('INVALID_FAMILY_BACKUP: Unknown collection');
    for(const name of FAMILY_BACKUP_COLLECTIONS) rows(collections[name],name);
    rows(domain.lifeEvents,'lifeEvents');
    if(domain.selection !== null && (typeof domain.selection !== 'string' || !collections.households.some(h=>h.id===domain.selection))) throw new Error('INVALID_FAMILY_BACKUP: Invalid household selection');
    return domain;
}
export async function collectFamilyBackup() {
    let snapshot=await StorageService.load(STORAGE_KEYS.FAMILY_SNAPSHOT,null,{strict:true});
    if(snapshot===null) {
        const collections={};
        for(const [name,suffix] of Object.entries(legacy)) collections[name]=suffix ? await StorageService.load(STORAGE_KEYS['FAMILY_'+suffix],[],{strict:true}) : [];
        snapshot={version:2,collections};
    }
    const storedSelection=await StorageService.load(STORAGE_KEYS.FAMILY_SELECTION,null,{strict:true});
    const selection=snapshot.collections?.households?.some?.(h=>h.id===storedSelection) ? storedSelection : null;
    return validateFamilyBackup({schemaVersion:1,snapshot,selection,lifeEvents:await FamilyLifeEventStore.load()});
}
export async function writeFamilyBackup(domain) {
    validateFamilyBackup(domain);
    for(const [key,value] of [[STORAGE_KEYS.FAMILY_SNAPSHOT,domain.snapshot],[STORAGE_KEYS.FAMILY_SELECTION,domain.selection]]) {
        const result=await StorageService.save(key,value,{atomic:true});
        if(!result?.success) throw new Error('FAMILY_RESTORE_WRITE_FAILED: '+key);
    }
    await FamilyLifeEventStore.save(domain.lifeEvents);
}
// Capture the separate encrypted owner verbatim so rollback preserves even key absence.
export const captureLifeEventsRaw=()=>AsyncStorage.getItem(LIFE_EVENTS_STORAGE_KEY);
export const restoreLifeEventsRaw=raw=>raw===null ? AsyncStorage.removeItem(LIFE_EVENTS_STORAGE_KEY) : AsyncStorage.setItem(LIFE_EVENTS_STORAGE_KEY,raw);
export function hasFamilyBackupData(domain) {
    return domain.lifeEvents.length>0 || Object.values(domain.snapshot.collections).some(records=>records.length>0);
}
