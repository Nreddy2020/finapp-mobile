/**
 * tests/assets/test_asset_persistence.mjs
 * 
 * FinLife Assets Module — Persistence, Serialization & Atomic Rollback Tests.
 */

import assert from 'assert';
import { AssetService } from '../../services/assetService.js';
import {
    ASSET_CATEGORY,
    PURITY_BPS,
    WEIGHT_SCALE,
    UNITS_SCALE,
    AssetValidationError
} from '../../components/assets/assetContracts.js';

let passed = 0;
let total = 0;

function it(desc, fn) {
    total++;
    try {
        fn();
        passed++;
    } catch (err) {
        console.error(`❌ FAIL: ${desc}`);
        console.error(err);
        throw err;
    }
}

async function itAsync(desc, fn) {
    total++;
    try {
        await fn();
        passed++;
    } catch (err) {
        console.error(`❌ FAIL: ${desc}`);
        console.error(err);
        throw err;
    }
}

export async function runAssetPersistenceTests() {
    passed = 0;
    total = 0;

    await AssetService.resetToCleanState();

    // 1. Lossless BigInt Serialization & Hydration Across Cold Cache Reset
    await itAsync('BigInt fields survive string serialization, cold cache wipe, and hydration with 0 drift', async () => {
        const added = await AssetService.addAsset({
            name: 'Gold Necklace 22K',
            category: ASSET_CATEGORY.PRECIOUS_METALS,
            grossWeightMicros: 50n * WEIGHT_SCALE, // 50g
            purityBps: PURITY_BPS['22K'],
            ratePerGramPaise: 650_000n, // ₹6,500/g
            purchaseCostPaise: 297_927_50n,
            ownership: [
                { memberId: 'self', shareBps: 6000n },
                { memberId: 'spouse', shareBps: 4000n }
            ]
        });

        // Cold wipe memory cache
        AssetService.clearMemoryCache();

        // Re-fetch from cold AsyncStorage
        const coldAssets = await AssetService.getAssets();
        const reloaded = coldAssets.find(a => a.id === added.id);

        assert.ok(reloaded, 'Asset must be reloaded from disk');
        assert.strictEqual(typeof reloaded.currentValuationPaise, 'bigint');
        assert.strictEqual(reloaded.currentValuationPaise, added.currentValuationPaise);
        assert.strictEqual(typeof reloaded.grossWeightMicros, 'bigint');
        assert.strictEqual(reloaded.grossWeightMicros, 50_000_000n);
        assert.strictEqual(typeof reloaded.ownership[0].shareBps, 'bigint');
        assert.strictEqual(reloaded.ownership[0].shareBps, 6000n);
    });

    // 2. Interrupted Write Isolation (Zero Partial State)
    await itAsync('Interrupted write due to boundary violation leaves zero partial records in storage', async () => {
        const assetsBefore = await AssetService.getAssets();
        const logBefore = await AssetService.getLifecycleLog();
        const opsBefore = await AssetService.getOperations();

        // Attempt creation with boundary violation (> ₹10,000 Crore)
        await assert.rejects(async () => {
            await AssetService.addAsset({
                name: 'Impossible Mega Gold Reserve',
                category: ASSET_CATEGORY.PRECIOUS_METALS,
                purchaseCostPaise: 10_000_000_000_001n // Boundary + 1
            });
        }, (err) => err instanceof AssetValidationError && err.code === 'ERR_LIMIT_EXCEEDED');

        // Verify storage unchanged
        const assetsAfter = await AssetService.getAssets();
        const logAfter = await AssetService.getLifecycleLog();
        const opsAfter = await AssetService.getOperations();

        assert.strictEqual(assetsAfter.length, assetsBefore.length, 'No asset record written');
        assert.strictEqual(logAfter.length, logBefore.length, 'No lifecycle event written');
        assert.strictEqual(opsAfter.length, opsBefore.length, 'No operation marker written');
    });

    // 3. Idempotent Retry Protection
    await itAsync('Duplicate call with identical idempotencyKey returns existing asset without duplicate storage write', async () => {
        const opKey = 'unique_op_key_car_purchase_999';

        const car1 = await AssetService.addAsset({
            name: 'Honda City ZX',
            category: ASSET_CATEGORY.VEHICLES,
            purchaseCostPaise: 12_000_000_00n,
            currentValuationPaise: 8_500_000_00n
        }, opKey);

        const car2 = await AssetService.addAsset({
            name: 'Honda City ZX (Retry)',
            category: ASSET_CATEGORY.VEHICLES,
            purchaseCostPaise: 12_000_000_00n,
            currentValuationPaise: 8_500_000_00n
        }, opKey);

        assert.strictEqual(car1.id, car2.id);

        const allAssets = await AssetService.getAssets();
        const matches = allAssets.filter(a => a.name.startsWith('Honda City ZX'));
        assert.strictEqual(matches.length, 1);
    });

    return { passed, total, name: 'Asset Persistence, Serialization & Idempotency' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    runAssetPersistenceTests()
        .then(res => console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`))
        .catch(err => { console.error(err); process.exit(1); });
}
