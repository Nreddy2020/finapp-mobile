import assert from 'node:assert/strict';
import {StorageService as storage,STORAGE_KEYS as keys} from '../services/storage.js';
import {FamilyLifeEventStore as events,LIFE_EVENTS_STORAGE_KEY} from '../services/family/familyLifeEventStore.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {FAMILY_BACKUP_COLLECTIONS,collectFamilyBackup,validateFamilyBackup} from '../services/backup/familyBackupDomain.js';
import {FinlifeV4BackupRestoreEngine,RESTORE_MODE,computeCanonicalChecksums,STORAGE_KEYS_IDEMPOTENCY_REGISTRY} from '../services/backup/finlifeV4BackupRestoreEngine.js';
const disk=new Map();let failKey=null,writes=0,count=0;
storage.load=async(k,d)=>disk.has(k)?structuredClone(disk.get(k)):d;
storage.save=async(k,v)=>{writes++;if(k===failKey){failKey=null;return{success:false};}disk.set(k,structuredClone(v));return{success:true};};
storage.delete=async k=>{disk.delete(k);return{success:true};};
storage.getAllKeys=async()=>[...disk.keys()];storage.getStorageSchemaVersion=async()=>4;
const fixture={version:2,collections:Object.fromEntries(FAMILY_BACKUP_COLLECTIONS.map(k=>[k,[{id:k==='households'?'h1':k+'1',householdId:'h1',value:{amountPaise:'12345'}}]]))};
const life=[{id:'event1',householdId:'h1',preparations:[{id:'prep1',taskId:'tasks1'}]}];
const engine=new FinlifeV4BackupRestoreEngine();
async function test(name,fn){await fn();console.log('PASS '+name);count++;}
async function empty(){disk.clear();await AsyncStorage.removeItem(LIFE_EVENTS_STORAGE_KEY);}
async function seed(){await empty();disk.set(keys.FAMILY_SNAPSHOT,structuredClone(fixture));disk.set(keys.FAMILY_SELECTION,'h1');await events.save(life);}
const replace={mode:RESTORE_MODE.REPLACE_EXISTING,approvedReplacement:true};
function rehash(e){const hashes=computeCanonicalChecksums(e.payload);e.manifest.canonicalPayloadSha256=hashes.canonicalPayloadSha256;e.manifest.perDomainSha256=hashes.perDomainSha256;return e;}
await seed();const backup=await engine.exportUnifiedBackup({backupId:'family-full'});
await test('Export includes all 15 collections and separate Life Events',async()=>{assert.deepEqual(backup.payload.family.snapshot,fixture);assert.deepEqual(backup.payload.family.lifeEvents,life);assert.equal(backup.manifest.domainSchemaVersions.FAMILY,1);assert.ok(backup.manifest.perDomainSha256.family);});
await test('Plaintext round trip preserves Family and unrelated storage',async()=>{await empty();disk.set('unrelated',{keep:true});assert.equal((await engine.restoreUnifiedBackup(backup)).status,'SUCCESS');assert.deepEqual(disk.get(keys.FAMILY_SNAPSHOT),fixture);assert.deepEqual(await events.load(),life);assert.equal(disk.get(keys.FAMILY_SELECTION),'h1');assert.deepEqual(disk.get('unrelated'),{keep:true});});
await test('Encrypted envelope round trip',async()=>{await seed();const encrypted=await engine.exportUnifiedBackup({backupId:'encrypted-family',passphrase:'fixture-passphrase'});await empty();assert.equal((await engine.restoreUnifiedBackup(encrypted,{passphrase:'fixture-passphrase'})).status,'SUCCESS');assert.deepEqual(disk.get(keys.FAMILY_SNAPSHOT),fixture);assert.deepEqual(await events.load(),life);});
await test('Family-only target rejects EMPTY_ONLY without writes',async()=>{await seed();const before=writes;assert.equal((await engine.restoreUnifiedBackup(backup)).status,'RESTORE_REJECTED_EXISTING_STATE');assert.equal(writes,before);});
await test('Life Events-only target rejects EMPTY_ONLY',async()=>{await empty();await events.save(life);assert.equal((await engine.restoreUnifiedBackup(backup)).status,'RESTORE_REJECTED_EXISTING_STATE');});
await test('Old backup without Family preserves target Family',async()=>{await seed();const legacy=structuredClone(backup);delete legacy.payload.family;delete legacy.manifest.domainSchemaVersions.FAMILY;legacy.manifest.backupId='pre-family';rehash(legacy);assert.equal((await engine.restoreUnifiedBackup(legacy,replace)).status,'SUCCESS');assert.deepEqual(disk.get(keys.FAMILY_SNAPSHOT),fixture);assert.deepEqual(await events.load(),life);});
await test('Missing, duplicate and future Family payloads reject before writes',async()=>{for(const mutation of [d=>delete d.snapshot.collections.goals,d=>d.snapshot.collections.people.push({...d.snapshot.collections.people[0]}),d=>d.schemaVersion=99]){await empty();const invalid=structuredClone(backup);mutation(invalid.payload.family);rehash(invalid);const before=writes;await assert.rejects(engine.restoreUnifiedBackup(invalid),/INVALID_FAMILY_BACKUP/);assert.equal(writes,before);}});
await test('Declared Family domain without payload rejects',async()=>{await empty();const invalid=structuredClone(backup);delete invalid.payload.family;rehash(invalid);await assert.rejects(engine.restoreUnifiedBackup(invalid),/INVALID_FAMILY_BACKUP/);});
await test('Snapshot write failure rolls back all storage and Life Events',async()=>{await seed();disk.set('unrelated',{keep:true});const before=structuredClone([...disk]);const raw=await AsyncStorage.getItem(LIFE_EVENTS_STORAGE_KEY);failKey=keys.FAMILY_SNAPSHOT;assert.equal((await engine.restoreUnifiedBackup(backup,replace)).status,'FAILED_ROLLED_BACK');assert.deepEqual([...disk],before);assert.equal(await AsyncStorage.getItem(LIFE_EVENTS_STORAGE_KEY),raw);});
await test('Failure after Life Events write restores original ciphertext',async()=>{await seed();await events.save([{id:'existing',householdId:'h1'}]);const raw=await AsyncStorage.getItem(LIFE_EVENTS_STORAGE_KEY);const before=structuredClone([...disk]);failKey=STORAGE_KEYS_IDEMPOTENCY_REGISTRY;assert.equal((await engine.restoreUnifiedBackup(backup,replace)).status,'FAILED_ROLLED_BACK');assert.deepEqual([...disk],before);assert.equal(await AsyncStorage.getItem(LIFE_EVENTS_STORAGE_KEY),raw);});
await test('Rollback preserves separate owner key absence',async()=>{await empty();failKey=STORAGE_KEYS_IDEMPOTENCY_REGISTRY;assert.equal((await engine.restoreUnifiedBackup(backup)).status,'FAILED_ROLLED_BACK');assert.equal(await AsyncStorage.getItem(LIFE_EVENTS_STORAGE_KEY),null);assert.equal(disk.size,0);});
await test('Legacy Family collections migrate read-only without writing source',async()=>{await empty();disk.set(keys.FAMILY_PEOPLE,[{id:'person-old'}]);const before=writes;const data=await collectFamilyBackup();assert.deepEqual(data.snapshot.collections.people,[{id:'person-old'}]);assert.deepEqual(data.snapshot.collections.memberIncomeStreams,[]);assert.equal(writes,before);assert.equal(disk.has(keys.FAMILY_SNAPSHOT),false);});
console.log(count+' isolated backup integration cases passed. No native or user storage used.');
