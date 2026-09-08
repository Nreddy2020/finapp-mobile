/**
 * tests/assets/test_asset_contracts.mjs
 * 
 * FinLife Assets Module — Contracts & Domain Invariant Test Suite.
 */

import assert from 'assert';
import {
    MIN_ASSET_PAISE,
    MAX_ASSET_PAISE,
    MIN_SIGNED_PAISE,
    MAX_SIGNED_PAISE,
    WEIGHT_SCALE,
    UNITS_SCALE,
    BPS_SCALE,
    PURITY_BPS,
    ASSET_CATEGORY,
    validateAssetPaiseBounds,
    toBigIntPaise,
    roundHalfUp,
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

export function runAssetContractsTests() {
    passed = 0;
    total = 0;

    // 1. Monetary Domain Constants
    it('Monetary domain limits are strictly configured', () => {
        assert.strictEqual(MIN_ASSET_PAISE, 0n);
        assert.strictEqual(MAX_ASSET_PAISE, 10_000_000_000_000n); // ₹10,000 Crore in paise
        assert.strictEqual(MIN_SIGNED_PAISE, -9_223_372_036_854_775_808n);
        assert.strictEqual(MAX_SIGNED_PAISE,  9_223_372_036_854_775_807n);
    });

    // 2. Fixed-Point Scale Constants
    it('Fixed-point scale constants are configured to 1,000,000n and 10,000n', () => {
        assert.strictEqual(WEIGHT_SCALE, 1_000_000n);
        assert.strictEqual(UNITS_SCALE,  1_000_000n);
        assert.strictEqual(BPS_SCALE,    10_000n);
    });

    // 3. Precious Metal Purity BPS
    it('Purity basis points are accurately mapped', () => {
        assert.strictEqual(PURITY_BPS['24K'], 10_000n);
        assert.strictEqual(PURITY_BPS['22K'],  9_167n);
        assert.strictEqual(PURITY_BPS['18K'],  7_500n);
        assert.strictEqual(PURITY_BPS['14K'],  5_833n);
        assert.strictEqual(PURITY_BPS['999'],  9_990n);
        assert.strictEqual(PURITY_BPS['925'],  9_250n);
    });

    // 4. ₹10,000 Crore Boundary Acceptance
    it('Exact ₹10,000 Crore boundary is accepted without error', () => {
        const exactLimit = 10_000_000_000_000n;
        assert.doesNotThrow(() => validateAssetPaiseBounds(exactLimit));
        assert.strictEqual(validateAssetPaiseBounds(exactLimit), exactLimit);
    });

    // 5. ₹10,000 Crore + 1 Paisa Rejection
    it('₹10,000 Crore + 1 paisa is strictly rejected with ERR_LIMIT_EXCEEDED', () => {
        const overLimit = 10_000_000_000_001n;
        assert.throws(() => {
            validateAssetPaiseBounds(overLimit);
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_LIMIT_EXCEEDED';
        });
    });

    // 6. Negative Asset Valuation Rejection
    it('Negative asset values are rejected in unsigned domain', () => {
        assert.throws(() => {
            validateAssetPaiseBounds(-100n);
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_NEGATIVE_ASSET_VALUE';
        });
    });

    // 7. Signed Domain Overflow
    it('Values exceeding 64-bit signed boundaries are rejected', () => {
        assert.throws(() => {
            validateAssetPaiseBounds(MAX_SIGNED_PAISE + 1n, { signed: true });
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_DOMAIN_OVERFLOW';
        });
    });

    // 8. Float Rejection
    it('Floating-point values are strictly rejected', () => {
        assert.throws(() => {
            toBigIntPaise(10500.75);
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_FLOAT_DISALLOWED';
        });
    });

    // 9. Controlled Categories Exclude Property
    it('Controlled categories contain exactly 8 non-property groups', () => {
        const cats = Object.keys(ASSET_CATEGORY);
        assert.strictEqual(cats.length, 8);
        assert.ok(!cats.includes('PROPERTY'));
        assert.ok(!cats.includes('PROPERTIES'));
    });

    return { passed, total, name: 'Asset Domain Contracts & Boundaries' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    const res = runAssetContractsTests();
    console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`);
}
