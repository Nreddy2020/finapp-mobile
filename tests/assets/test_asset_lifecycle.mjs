/**
 * tests/assets/test_asset_lifecycle.mjs
 * 
 * FinLife Assets Module — Lifecycle Transitions & Audit History Tests.
 */

import assert from 'assert';
import { AssetService } from '../../services/assetService.js';
import {
    ASSET_LIFECYCLE_STATUS,
    ASSET_CATEGORY,
    validateLifecycleTransition,
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

export async function runAssetLifecycleTests() {
    passed = 0;
    total = 0;

    await AssetService.resetToCleanState();

    // 1. Legal Lifecycle Transitions Pass
    it('Legal transitions are approved by transition validator', () => {
        assert.doesNotThrow(() => validateLifecycleTransition('DRAFT', 'ACTIVE'));
        assert.doesNotThrow(() => validateLifecycleTransition('ACTIVE', 'PARTIALLY_DISPOSED'));
        assert.doesNotThrow(() => validateLifecycleTransition('ACTIVE', 'TRANSFERRED'));
        assert.doesNotThrow(() => validateLifecycleTransition('ACTIVE', 'SOLD'));
        assert.doesNotThrow(() => validateLifecycleTransition('ACTIVE', 'ARCHIVED'));
        assert.doesNotThrow(() => validateLifecycleTransition('PARTIALLY_DISPOSED', 'SOLD'));
        assert.doesNotThrow(() => validateLifecycleTransition('TRANSFERRED', 'ARCHIVED'));
        assert.doesNotThrow(() => validateLifecycleTransition('SOLD', 'ARCHIVED'));
    });

    // 2. Illegal Lifecycle Transitions Throw
    it('Illegal transitions are strictly rejected with ERR_INVALID_TRANSITION', () => {
        assert.throws(() => {
            validateLifecycleTransition('DRAFT', 'SOLD');
        }, (err) => err instanceof AssetValidationError && err.code === 'ERR_INVALID_TRANSITION');

        assert.throws(() => {
            validateLifecycleTransition('SOLD', 'ACTIVE'); // Cannot un-sell an asset
        }, (err) => err instanceof AssetValidationError && err.code === 'ERR_INVALID_TRANSITION');

        assert.throws(() => {
            validateLifecycleTransition('ARCHIVED', 'ACTIVE'); // Archived is terminal
        }, (err) => err instanceof AssetValidationError && err.code === 'ERR_INVALID_TRANSITION');
    });

    // 3. End-to-End Asset Lifecycle Transition & Audit Trail
    await itAsync('Asset lifecycle transition creates immutable audit history', async () => {
        const asset = await AssetService.addAsset({
            name: 'Gold Ring 22K',
            category: ASSET_CATEGORY.PRECIOUS_METALS,
            purchaseCostPaise: 50_000_00n,
            status: ASSET_LIFECYCLE_STATUS.DRAFT
        });

        assert.strictEqual(asset.status, ASSET_LIFECYCLE_STATUS.DRAFT);

        // Transition: DRAFT -> ACTIVE
        const activeAsset = await AssetService.transitionLifecycle(asset.id, ASSET_LIFECYCLE_STATUS.ACTIVE, {
            actor: 'USER_1',
            reason: 'VERIFIED_APPRAISAL',
            note: 'Confirmed hallmarking and receipt'
        });
        assert.strictEqual(activeAsset.status, ASSET_LIFECYCLE_STATUS.ACTIVE);

        // Transition: ACTIVE -> SOLD
        const soldAsset = await AssetService.transitionLifecycle(asset.id, ASSET_LIFECYCLE_STATUS.SOLD, {
            actor: 'USER_1',
            reason: 'JEWELLERY_EXCHANGE',
            note: 'Sold for exchange'
        });
        assert.strictEqual(soldAsset.status, ASSET_LIFECYCLE_STATUS.SOLD);

        // Verify audit log has 3 events (1 create + 2 transitions)
        const log = await AssetService.getLifecycleLog();
        const assetEvents = log.filter(e => e.assetId === asset.id);
        assert.strictEqual(assetEvents.length, 3);
        assert.strictEqual(assetEvents[0].toStatus, 'DRAFT');
        assert.strictEqual(assetEvents[1].toStatus, 'ACTIVE');
        assert.strictEqual(assetEvents[2].toStatus, 'SOLD');
        assert.strictEqual(assetEvents[2].reason, 'JEWELLERY_EXCHANGE');
    });

    return { passed, total, name: 'Asset Lifecycle & Audit Log' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    runAssetLifecycleTests()
        .then(res => console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`))
        .catch(err => { console.error(err); process.exit(1); });
}
