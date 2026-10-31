/**
 * tests/test_life_modules_backup.mjs
 * Unified backup / restore for the Goals & Life Planning, Apartment & Society and
 * Decision Intelligence stores. Fixture storage only.
 */
import assert from 'node:assert/strict';
import { StorageService as storage, STORAGE_KEYS as keys } from '../services/storage.js';
import { FinlifeV4BackupRestoreEngine, RESTORE_MODE, computeCanonicalChecksums, STORAGE_KEYS_IDEMPOTENCY_REGISTRY } from '../services/backup/finlifeV4BackupRestoreEngine.js';
import { LIFE_MODULE_STORES, collectLifeModulesBackup, validateLifeModulesBackup, hasLifeModulesData } from '../services/backup/lifeModulesBackupDomain.js';
import { LifeGoalsService, LIFE_GOALS_STORAGE_KEY } from '../services/life/lifeGoalsService.js';
import { HabitsService, HABITS_STORAGE_KEY } from '../services/time/habitsService.js';
import { ValidityService } from '../services/validity/validityService.js';
import { CareerOsService, CAREER_STORAGE_KEY } from '../services/career/careerOsService.js';
import { ApartmentSocietyService, APARTMENT_SOCIETY_STORAGE_KEY } from '../services/business/apartmentSocietyService.js';
import { MarketsService, MARKETS_STORAGE_KEY } from '../services/intelligence/marketsService.js';

const disk = new Map(); let failKey = null, writes = 0, count = 0;
storage.load = async (k, d) => (disk.has(k) ? structuredClone(disk.get(k)) : d);
storage.save = async (k, v) => { writes++; if (failKey === k) { failKey = null; return { success: false }; } disk.set(k, structuredClone(v)); return { success: true }; };
storage.delete = async k => { disk.delete(k); return { success: true }; };
storage.getAllKeys = async () => [...disk.keys()];
storage.getStorageSchemaVersion = async () => 4;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
const engine = new FinlifeV4BackupRestoreEngine(), replace = { mode: RESTORE_MODE.REPLACE_EXISTING, approvedReplacement: true };
function rehash(e) { const h = computeCanonicalChecksums(e.payload); e.manifest.canonicalPayloadSha256 = h.canonicalPayloadSha256; e.manifest.perDomainSha256 = h.perDomainSha256; return e; }

async function seed() {
    disk.clear();
    await LifeGoalsService.add({ title: 'Emergency fund', category: 'financial', targetAmount: 100000 });
    await HabitsService.add({ title: 'Walk', schedule: { type: 'daily' } });
    await ValidityService.add({ title: 'Passport', category: 'Passport', expiryDate: '2030-01-01' });
    await CareerOsService.updateProfile({ role: 'Nurse', monthlyIncome: 40000 });
    await ApartmentSocietyService.updateSociety({ name: 'Green Meadows', flatAmount: 2500 });
    await ApartmentSocietyService.addUnit({ number: '101', block: 'A' });
    await MarketsService.addWatch({ symbol: 'GOLD', type: 'gold', price: 7000 });
    disk.set(keys.TODOS, [{ id: 1, task: 'Legacy', status: 'pending' }]);
    disk.set('unrelated', { keep: true });
}

await test('Empty stores collect as null and count as no data', async () => {
    disk.clear();
    const domain = await collectLifeModulesBackup();
    assert.equal(Object.keys(domain.stores).length, Object.keys(LIFE_MODULE_STORES).length);
    assert.ok(Object.values(domain.stores).every(v => v === null));
    assert.equal(hasLifeModulesData(domain), false);
});
let backup;
await test('Export includes every life-module store with schema version and checksum', async () => {
    await seed();
    backup = await engine.exportUnifiedBackup({ backupId: 'life1' });
    assert.equal(backup.manifest.domainSchemaVersions.LIFE_MODULES, 1);
    assert.ok(backup.manifest.perDomainSha256.lifeModules);
    assert.equal(backup.payload.lifeModules.stores.lifeGoals.goals.length, 1);
    assert.equal(backup.payload.lifeModules.stores.apartmentSociety.units.length, 1);
    assert.equal(backup.manifest.domainEntityCounts.lifeModules, 5, "1 goal + 1 habit + 1 validity + 1 unit + 1 watch");
    assert.equal(hasLifeModulesData(backup.payload.lifeModules), true);
});
await test('Encrypted round trip restores every store byte-for-byte and leaves unrelated keys alone', async () => {
    const before = Object.fromEntries(Object.values(LIFE_MODULE_STORES).map(([k]) => [k, structuredClone(disk.get(k) ?? null)]));
    const encrypted = await engine.exportUnifiedBackup({ backupId: 'life-enc', passphrase: 'fixture-pass' });
    disk.clear(); disk.set('unrelated', { keep: true });
    assert.equal((await engine.restoreUnifiedBackup(encrypted, { passphrase: 'fixture-pass' })).status, 'SUCCESS');
    for (const [k, v] of Object.entries(before)) assert.deepEqual(disk.get(k) ?? null, v, k);
    assert.deepEqual(disk.get('unrelated'), { keep: true });
    assert.equal((await LifeGoalsService.list())[0].title, 'Emergency fund');
});
await test('Life data alone blocks EMPTY_ONLY restore', async () => {
    disk.clear();
    await MarketsService.addWatch({ symbol: 'GOLD', type: 'gold' });
    assert.equal((await engine.restoreUnifiedBackup(backup)).status, 'RESTORE_REJECTED_EXISTING_STATE');
});
await test('Older backups without the domain preserve the target life stores', async () => {
    await seed();
    const original = structuredClone([...disk]);
    const old = structuredClone(backup);
    delete old.payload.lifeModules; delete old.manifest.domainSchemaVersions.LIFE_MODULES; delete old.manifest.domainEntityCounts.lifeModules; old.manifest.backupId = 'oldlife'; rehash(old);
    assert.equal((await engine.restoreUnifiedBackup(old, replace)).status, 'SUCCESS');
    for (const [k, v] of original) if (Object.values(LIFE_MODULE_STORES).some(([key]) => key === k)) assert.deepEqual(disk.get(k), v, k);
});
await test('Corrupt or incomplete life payloads reject before any write', async () => {
    for (const change of [e => delete e.payload.lifeModules.stores.habits, e => { e.payload.lifeModules.stores.lifeGoals = { version: 9 }; }, e => { e.payload.lifeModules.stores.markets.watchlist = 'nope'; }, e => { e.payload.lifeModules.schemaVersion = 2; e.manifest.domainSchemaVersions.LIFE_MODULES = 2; }]) {
        await seed();
        const bad = structuredClone(backup); change(bad); rehash(bad);
        const before = writes;
        await assert.rejects(engine.restoreUnifiedBackup(bad, replace));
        assert.equal(writes, before);
    }
    assert.throws(() => validateLifeModulesBackup({ schemaVersion: 1 }), /INVALID_LIFE_BACKUP/);
});
await test('A failure after life stores are written rolls every store back', async () => {
    await seed();
    const original = structuredClone([...disk]);
    failKey = STORAGE_KEYS_IDEMPOTENCY_REGISTRY;
    assert.equal((await engine.restoreUnifiedBackup(backup, replace)).status, 'FAILED_ROLLED_BACK');
    assert.deepEqual([...disk], original);
});
await test('Null store in backup deletes the target store on restore', async () => {
    await seed();
    const withoutHabits = structuredClone(backup);
    withoutHabits.payload.lifeModules.stores.habits = null; withoutHabits.manifest.backupId = 'nohabits'; rehash(withoutHabits);
    assert.equal((await engine.restoreUnifiedBackup(withoutHabits, replace)).status, 'SUCCESS');
    assert.equal(disk.has(HABITS_STORAGE_KEY), false);
    assert.equal(disk.has(LIFE_GOALS_STORAGE_KEY) && disk.has(CAREER_STORAGE_KEY) && disk.has(APARTMENT_SOCIETY_STORAGE_KEY) && disk.has(MARKETS_STORAGE_KEY), true);
});
console.log(count + ' life-module backup cases passed using fixture storage only.');
