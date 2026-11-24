/**
 * tests/test_p2p_no_destructive_autoseed.mjs
 *
 * Regression test for the P2P data-loss bug (same class as Group Expenses SC-12).
 *
 * The P2P screen used to treat "persons and loans both read empty" as a first run and call
 * P2PService.loadDemoFixtures(), which starts with resetToCleanState() and overwrites every P2P
 * store with []. But the regular getters use non-strict loadData(), which returns [] on ANY
 * read / decrypt / parse failure, so one unreadable file permanently destroyed real loans (and
 * seeded fake Rs 25L / Rs 4L loans plus Money Flow rows for genuinely new users).
 *
 * Invariants:
 *  1. A genuinely empty store is reported as such by probeStorage().
 *  2. A store holding real data is reported as hasData.
 *  3. A corrupted store is distinguishable from an empty one (this is what the getters CANNOT do).
 *  4. probeStorage() is read-only: the corrupted bytes are untouched afterwards.
 *  5. The screen's load path never calls loadDemoFixtures(); it exists only behind the
 *     __DEV__-gated, confirmed handler.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { P2PService } from '../services/p2pService.js';
import { STORAGE_KEYS } from '../services/storage.js';

console.log('--- [P2P] Testing storage probe and no destructive auto-seed ---');

// Test setup only: start from a known-clean store.
await P2PService.resetToCleanState();
P2PService.clearMemoryCache();

// 1. Genuinely empty
const empty = await P2PService.probeStorage();
assert.strictEqual(empty.isGenuinelyEmpty, true, 'Clean store must be genuinely empty');
assert.strictEqual(empty.hasData, false);
assert.deepStrictEqual(empty.unreadable, []);
console.log('✓ Invariant 1: a clean store is reported as genuinely empty');

// 2. Real data
await P2PService.addPerson({ id: 'real_person_1', name: 'Real Counterparty' });
P2PService.clearMemoryCache();
const withData = await P2PService.probeStorage();
assert.strictEqual(withData.hasData, true, 'Store with a saved person must report hasData');
assert.strictEqual(withData.isGenuinelyEmpty, false);
assert.deepStrictEqual(withData.unreadable, []);
console.log('✓ Invariant 2: a store with real data is reported as having data');

// 3. Corrupt the persons file directly (same technique as other persistence tests).
const CORRUPT = '{{{ not valid json or ciphertext';
global.localStorage.setItem(STORAGE_KEYS.P2P_PERSONS, CORRUPT);
P2PService.clearMemoryCache();

// The ordinary getter masks the corruption as an empty list. This is the root cause.
const maskedByGetter = await P2PService.getPersons();
assert.strictEqual(maskedByGetter.length, 0, 'Non-strict getter reports [] for a corrupt store (the root cause)');

P2PService.clearMemoryCache();
const corrupted = await P2PService.probeStorage();
assert.strictEqual(corrupted.isGenuinelyEmpty, false, 'A corrupt store must NOT be reported as genuinely empty');
assert.ok(corrupted.unreadable.includes(STORAGE_KEYS.P2P_PERSONS), 'Corrupt persons key must be listed as unreadable');
console.log('✓ Invariant 3: a corrupt store is distinguishable from an empty one');

// 4. probeStorage must not write.
assert.strictEqual(
    global.localStorage.getItem(STORAGE_KEYS.P2P_PERSONS),
    CORRUPT,
    'probeStorage must leave the unreadable bytes exactly as they were'
);
console.log('✓ Invariant 4: probeStorage never mutates storage');

// 5. Static guard on the screen: load path must not seed/reset.
const screenSource = fs.readFileSync(path.resolve(process.cwd(), 'app', '(tabs)', 'p2p.js'), 'utf8');
const loadStart = screenSource.indexOf('const loadAllData');
const loadEnd = screenSource.indexOf('const handleRefresh');
assert.ok(loadStart > -1 && loadEnd > loadStart, 'Could not locate loadAllData in p2p.js');
const loadBody = screenSource.slice(loadStart, loadEnd);
assert.ok(!loadBody.includes('loadDemoFixtures'), 'loadAllData must never call loadDemoFixtures');
assert.ok(!loadBody.includes('resetToCleanState'), 'loadAllData must never call resetToCleanState');

const demoCalls = screenSource.split('loadDemoFixtures(').length - 1;
assert.strictEqual(demoCalls, 1, 'loadDemoFixtures must be called from exactly one place');
const demoIdx = screenSource.indexOf('loadDemoFixtures(');
const handlerIdx = screenSource.indexOf('const handleLoadDemoData');
assert.ok(handlerIdx > -1 && handlerIdx < demoIdx, 'The only call must be inside handleLoadDemoData');
assert.ok(/\{__DEV__ && \(\s*<TouchableOpacity[^]*?onPress=\{handleLoadDemoData\}/.test(screenSource), 'handleLoadDemoData must only be reachable behind __DEV__');
console.log('✓ Invariant 5: the screen load path cannot seed or reset; the demo loader is __DEV__-gated');

// Leave the shared mock store clean for any suite run after this one.
await P2PService.resetToCleanState();
P2PService.clearMemoryCache();

console.log('--- [P2P] All no-destructive-autoseed invariants passed ---');
