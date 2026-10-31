import AsyncStorage from '@react-native-async-storage/async-storage';
import { encrypt, decrypt } from '../crypto.js';

export const LIFE_EVENTS_STORAGE_KEY = 'finlife_family_life_events_v1';

// One encrypted document. A failed read never becomes an empty, writable store.
export const FamilyLifeEventStore = {
    async load() {
        const raw = await AsyncStorage.getItem(LIFE_EVENTS_STORAGE_KEY);
        if (raw === null) return [];
        const plain = await decrypt(raw);
        if (!plain) throw new Error('Life Events could not be read. Retry without changing saved data.');
        return JSON.parse(plain);
    },
    async save(events) {
        const encrypted = await encrypt(JSON.stringify(events));
        if (!encrypted) throw new Error('Life Events could not be encrypted.');
        await AsyncStorage.setItem(LIFE_EVENTS_STORAGE_KEY, encrypted);
    }
};
