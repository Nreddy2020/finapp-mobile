/**
 * tests/test_banking_no_destructive_autoseed.mjs
 *
 * Regression test for the Banking data-loss bug (same class as Group Expenses SC-12 and P2P).
 *
 * BankingMainView used to treat "banks and loans both read empty" as a first run and call
 * BankingService.resetToDemoFixture(), which overwrites banks, accounts, loans, schedules, journal,
 * documents and operations. The service getters use non-strict loadData(), which returns [] on ANY
 * read/decrypt/parse failure, so one unreadable file destroyed real data. Separately, every
 * mutation read-modify-wrote through those getters, so an unreadable journal followed by one EMI
 * payment would replace the entire ledger with a single entry.
 *
 * Invariants:
 *  1. probeStorage() reports a clean store as genuinely empty.
 *  2. probeStorage() reports a store holding data as hasData.
 *  3. probeStorage() distinguishes a corrupt store from an empty one (the getters cannot).
 *  4. probeStorage() is read-only.
 *  5. Mutations refuse to write over an unreadable store and leave its bytes untouched.
 *  6. The main view's load path cannot seed or reset; the demo loader is __DEV__-gated.
 *  7. Every BankingService method the UI calls actually exists (the prepayment modal called a
 *     method that was never defined).
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { BankingService } from '../services/bankingService.js';
import { saveData, STORAGE_KEYS } from '../services/storage.js';

console.log('--- [BANKING] Testing storage probe, write-protection and no destructive auto-seed ---');

const KEYS = [
    STORAGE_KEYS.BANKING_BANKS,
    STORAGE_KEYS.BANKING_ACCOUNTS,
    STORAGE_KEYS.BANKING_LOANS,
    STORAGE_KEYS.BANKING_JOURNAL,
    STORAGE_KEYS.BANKING_SCHEDULES,
    STORAGE_KEYS.BANKING_DOCUMENTS,
    STORAGE_KEYS.BANKING_OPERATIONS
];
async function cleanStore() {
    for (const k of KEYS) await saveData(k, k === STORAGE_KEYS.BANKING_SCHEDULES ? {} : []);
}
const CORRUPT = '{{{ not valid json or ciphertext';

// 1. Genuinely empty
await cleanStore();
const empty = await BankingService.probeStorage();
assert.strictEqual(empty.isGenuinelyEmpty, true, 'Clean store must be genuinely empty');
assert.strictEqual(empty.hasData, false);
assert.deepStrictEqual(empty.unreadable, []);
console.log('✓ Invariant 1: a clean store is reported as genuinely empty');

// 2. Real data
await BankingService.saveBank({ id: 'bank_real_1', name: 'Real Bank' });
const withData = await BankingService.probeStorage();
assert.strictEqual(withData.hasData, true);
assert.strictEqual(withData.isGenuinelyEmpty, false);
assert.deepStrictEqual(withData.unreadable, []);
console.log('✓ Invariant 2: a store with real data is reported as having data');

// 3. Corrupt the banks file. The public getter masks it as empty (the root cause).
global.localStorage.setItem(STORAGE_KEYS.BANKING_BANKS, CORRUPT);
const maskedByGetter = await BankingService.getBanks();
assert.strictEqual(maskedByGetter.length, 0, 'Non-strict getter reports [] for a corrupt store (the root cause)');
await assert.rejects(
    () => BankingService.getBanks({ strict: true }),
    (e) => e.code === 'BANKING_STORAGE_UNREADABLE',
    'Strict getter must throw BANKING_STORAGE_UNREADABLE for corrupt store'
);
const corrupted = await BankingService.probeStorage();
assert.strictEqual(corrupted.isGenuinelyEmpty, false, 'A corrupt store must NOT be reported as genuinely empty');
assert.ok(corrupted.unreadable.includes(STORAGE_KEYS.BANKING_BANKS));
console.log('✓ Invariant 3: a corrupt store is distinguishable from an empty one');

// 4. Probe is read-only
assert.strictEqual(global.localStorage.getItem(STORAGE_KEYS.BANKING_BANKS), CORRUPT, 'probeStorage must not touch the bytes');
console.log('✓ Invariant 4: probeStorage never mutates storage');

// 5a. saveBank must refuse to overwrite the unreadable banks file.
await assert.rejects(
    () => BankingService.saveBank({ id: 'bank_new', name: 'New Bank' }),
    (e) => e.code === 'BANKING_STORAGE_UNREADABLE',
    'saveBank must throw BANKING_STORAGE_UNREADABLE instead of overwriting'
);
assert.strictEqual(global.localStorage.getItem(STORAGE_KEYS.BANKING_BANKS), CORRUPT, 'Unreadable banks bytes must be untouched after a refused save');

// 5b. The journal drives every balance. An unreadable journal + an EMI payment must not wipe it.
await cleanStore();
await saveData(STORAGE_KEYS.BANKING_LOANS, [{
    id: 'loan_real_1', bankId: 'bank_real_1', loanName: 'Home Loan', repaymentAccountId: null,
    originalPrincipalPaise: '500000000', status: 'ACTIVE', startDate: '2026-05-01'
}]);
global.localStorage.setItem(STORAGE_KEYS.BANKING_JOURNAL, CORRUPT);
await assert.rejects(
    () => BankingService.payScheduledEMI({
        loanId: 'loan_real_1', amountPaise: 150000n, principalPaise: 100000n, interestPaise: 50000n, date: '2026-11-24'
    }),
    (e) => e.code === 'BANKING_STORAGE_UNREADABLE',
    'payScheduledEMI must throw BANKING_STORAGE_UNREADABLE instead of replacing the ledger'
);
assert.strictEqual(global.localStorage.getItem(STORAGE_KEYS.BANKING_JOURNAL), CORRUPT, 'Unreadable journal bytes must be untouched after a refused payment');
console.log('✓ Invariant 5: mutations refuse to overwrite an unreadable store and leave it untouched');

// 6. Static guards on the main view.
const view = fs.readFileSync(path.resolve(process.cwd(), 'components', 'banking', 'BankingMainView.js'), 'utf8');
const loadStart = view.indexOf('const loadData = async');
const loadEnd = view.indexOf('useEffect(() => {', loadStart);
assert.ok(loadStart > -1 && loadEnd > loadStart, 'Could not locate loadData in BankingMainView.js');
const loadBody = view.slice(loadStart, loadEnd);
assert.ok(!loadBody.includes('resetToDemoFixture'), 'loadData must never call resetToDemoFixture');
assert.strictEqual(view.split('resetToDemoFixture(').length - 1, 1, 'resetToDemoFixture must be called from exactly one place');
assert.ok(view.indexOf('const handleLoadDemoData') > -1 && view.indexOf('const handleLoadDemoData') < view.indexOf('resetToDemoFixture('), 'The only call must be inside handleLoadDemoData');
assert.ok(/\{__DEV__ && \([^]*?onPress=\{handleLoadDemoData\}/.test(view), 'handleLoadDemoData must only be reachable behind __DEV__');
console.log('✓ Invariant 6: the main view load path cannot seed or reset; the demo loader is __DEV__-gated');

// 7. UI -> service contract: every BankingService.<method>( the UI calls must exist.
const uiDirs = [path.resolve(process.cwd(), 'components', 'banking'), path.resolve(process.cwd(), 'components', 'banking', 'modals')];
const missing = [];
for (const dir of uiDirs) {
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
        const src = fs.readFileSync(path.join(dir, f), 'utf8');
        for (const m of src.matchAll(/BankingService\.(\w+)\s*\(/g)) {
            if (typeof BankingService[m[1]] !== 'function') missing.push(`${f}: BankingService.${m[1]}`);
        }
    }
}
assert.deepStrictEqual(missing, [], `UI calls BankingService methods that do not exist: ${missing.join(', ')}`);
console.log('✓ Invariant 7: every BankingService method called by the UI exists');

await cleanStore();
console.log('--- [BANKING] All no-destructive-autoseed invariants passed ---');
