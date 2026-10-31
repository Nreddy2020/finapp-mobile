import {PLANNER_STORAGE_KEY} from './time/plannerContracts.js';
import {loadData,getAllKeys,STORAGE_KEYS} from './storage.js';
import {FamilyLifeEventStore,LIFE_EVENTS_STORAGE_KEY} from './family/familyLifeEventStore.js';
export async function collectUserData() {
    const allData = {};
    const keys = await getAllKeys();
    const snapshot = await loadData(STORAGE_KEYS.FAMILY_SNAPSHOT, null, {strict:true});
    for (const key of keys) {
        if (/auth|token|secret|encryption|crypto|(?:private|master).?key/i.test(key)) continue;
        // Once migrated, the snapshot supersedes legacy Family collection files.
        if (snapshot && key.startsWith('finlife_family_') && ![STORAGE_KEYS.FAMILY_SNAPSHOT, STORAGE_KEYS.FAMILY_SCHEMA, STORAGE_KEYS.FAMILY_SELECTION].includes(key)) continue;
        const data = await loadData(key, null, {strict:true});
        if (data !== null) allData[key] = data;
    }
    for (const key of [STORAGE_KEYS.TODOS, PLANNER_STORAGE_KEY]) {
        const value = await loadData(key, null, {strict:true});
        if (value !== null) allData[key] = value;
    }
    if (snapshot) allData[STORAGE_KEYS.FAMILY_SNAPSHOT] = snapshot;
    allData[LIFE_EVENTS_STORAGE_KEY] = await FamilyLifeEventStore.load();
    return allData;
}
