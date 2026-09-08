/**
 * tests/assets/test_asset_source_boundaries.mjs
 * 
 * FinLife Assets Module — Source Boundaries & Non-Property Isolation Tests.
 */

import assert from 'assert';
import { AssetService } from '../../services/assetService.js';
import {
    SOURCE_TYPE,
    ASSET_CATEGORY,
    ASSET_LIFECYCLE_STATUS,
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

export async function runAssetSourceBoundariesTests() {
    passed = 0;
    total = 0;

    await AssetService.resetToCleanState();

    // 1. Strict Property Rejection
    await itAsync('Creating an asset with category PROPERTY is strictly rejected with ERR_PROPERTY_DISALLOWED', async () => {
        await assert.rejects(async () => {
            await AssetService.addAsset({
                name: 'My Apartment in Whitefield',
                category: 'PROPERTY',
                purchaseCostPaise: 85_000_000_00n
            });
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_PROPERTY_DISALLOWED';
        });
    });

    // 2. Strict Properties (plural) Rejection
    await itAsync('Creating an asset with category PROPERTIES is also strictly rejected', async () => {
        await assert.rejects(async () => {
            await AssetService.addAsset({
                name: 'Agricultural Land Plot',
                category: 'PROPERTIES',
                purchaseCostPaise: 1_20_000_000_00n
            });
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_PROPERTY_DISALLOWED';
        });
    });

    // 3. Read-Only Projection Mutation Rejection
    await itAsync('Mutating a read-only projection asset is strictly rejected with ERR_READONLY_PROJECTION', async () => {
        const linkedP2P = await AssetService.addAsset({
            name: 'P2P Receivable from Rahul',
            category: ASSET_CATEGORY.RECEIVABLES,
            sourceType: SOURCE_TYPE.P2P,
            sourceId: 'loan_rahul_123',
            isReadOnlyProjection: true,
            currentValuationPaise: 50_000_00n
        });

        assert.strictEqual(linkedP2P.isReadOnlyProjection, true);

        // Attempt to modify valuation directly through Assets
        await assert.rejects(async () => {
            await AssetService.updateValuation(linkedP2P.id, 60_000_00n);
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_READONLY_PROJECTION';
        });

        // Attempt to modify lifecycle status directly through Assets
        await assert.rejects(async () => {
            await AssetService.transitionLifecycle(linkedP2P.id, ASSET_LIFECYCLE_STATUS.SOLD);
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_READONLY_PROJECTION';
        });
    });

    // 4. Authoritative Source Tracking
    await itAsync('Source types are preserved with sourceId references', async () => {
        const linkedInvestment = await AssetService.addAsset({
            name: 'HDFC Index Fund',
            category: ASSET_CATEGORY.INVESTMENTS,
            sourceType: SOURCE_TYPE.INVESTMENT_LEDGER,
            sourceId: 'portfolio_hdfc_idx',
            isReadOnlyProjection: true,
            currentValuationPaise: 1_18_500_00n
        });

        assert.strictEqual(linkedInvestment.sourceType, SOURCE_TYPE.INVESTMENT_LEDGER);
        assert.strictEqual(linkedInvestment.sourceId, 'portfolio_hdfc_idx');
        assert.strictEqual(linkedInvestment.isReadOnlyProjection, true);
    });

    return { passed, total, name: 'Asset Source Boundaries & Property Isolation' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    runAssetSourceBoundariesTests()
        .then(res => console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`))
        .catch(err => { console.error(err); process.exit(1); });
}
