/**
 * tests/assets/test_asset_no_double_counting.mjs
 * 
 * FinLife Assets Module — Double-Counting Prevention Tests.
 */

import assert from 'assert';
import { AssetService } from '../../services/assetService.js';
import {
    ASSET_CATEGORY,
    SOURCE_TYPE,
    ASSET_LIFECYCLE_STATUS
} from '../../components/assets/assetContracts.js';
import { calculateFamilyWealthSummary } from '../../components/assets/assetFamilyEngine.js';

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

export async function runAssetNoDoubleCountingTests() {
    passed = 0;
    total = 0;

    await AssetService.resetToCleanState();

    // 1. Sold and Archived Assets are excluded from Active Wealth Summary
    await itAsync('Sold and archived assets are completely excluded from active family wealth totals', async () => {
        const activeGold = await AssetService.addAsset({
            name: 'Gold Ring',
            category: ASSET_CATEGORY.PRECIOUS_METALS,
            currentValuationPaise: 60_000_00n, // ₹60,000
            status: ASSET_LIFECYCLE_STATUS.ACTIVE
        });

        const soldCar = await AssetService.addAsset({
            name: 'Old Maruti Alto',
            category: ASSET_CATEGORY.VEHICLES,
            currentValuationPaise: 150_000_00n, // ₹1,50,000
            status: ASSET_LIFECYCLE_STATUS.SOLD
        });

        const archivedPhone = await AssetService.addAsset({
            name: 'Broken iPhone 8',
            category: ASSET_CATEGORY.HOUSEHOLD_VALUABLES,
            currentValuationPaise: 5_000_00n, // ₹5,000
            status: ASSET_LIFECYCLE_STATUS.ARCHIVED
        });

        const allAssets = await AssetService.getAssets();
        const summary = calculateFamilyWealthSummary(allAssets, 'self');

        // Only activeGold must be in totalFamilyPaise (₹60,000)
        assert.strictEqual(summary.totalFamilyPaise, 60_000_00n);
        assert.strictEqual(summary.activeAssetCount, 1);
    });

    // 2. Linked Assets Maintain Single Projection Identity
    await itAsync('Linked asset uses external sourceId to prevent shadow duplicate creation', async () => {
        const p2pSourceId = 'p2p_loan_contract_456';

        const linkedReceivable = await AssetService.addAsset({
            name: 'Rahul Lent Balance',
            category: ASSET_CATEGORY.RECEIVABLES,
            sourceType: SOURCE_TYPE.P2P,
            sourceId: p2pSourceId,
            isReadOnlyProjection: true,
            currentValuationPaise: 100_000_00n
        }, p2pSourceId); // Pass sourceId as idempotency key

        // Second ingestion with same sourceId idempotently returns existing asset
        const duplicateIngest = await AssetService.addAsset({
            name: 'Rahul Lent Balance Attempt 2',
            category: ASSET_CATEGORY.RECEIVABLES,
            sourceType: SOURCE_TYPE.P2P,
            sourceId: p2pSourceId,
            isReadOnlyProjection: true,
            currentValuationPaise: 100_000_00n
        }, p2pSourceId);

        assert.strictEqual(linkedReceivable.id, duplicateIngest.id);

        const assets = await AssetService.getAssets();
        const matching = assets.filter(a => a.sourceId === p2pSourceId);
        assert.strictEqual(matching.length, 1, 'Zero duplicate asset records created for same authoritative sourceId');
    });

    return { passed, total, name: 'Asset Double-Counting Prevention' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    runAssetNoDoubleCountingTests()
        .then(res => console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`))
        .catch(err => { console.error(err); process.exit(1); });
}
