/**
 * tests/assets/test_asset_ownership_invariants.mjs
 * 
 * FinLife Assets Module — Ownership Invariants & Allocation Tests.
 */

import assert from 'assert';
import {
    BPS_SCALE,
    validateOwnershipShares,
    AssetValidationError
} from '../../components/assets/assetContracts.js';
import { allocateAssetSharesPaise } from '../../components/assets/assetFamilyEngine.js';

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

export function runAssetOwnershipInvariantsTests() {
    passed = 0;
    total = 0;

    // 1. Exact 10,000 BPS Ownership Passes
    it('Single 100% owner (10,000 BPS) passes validation', () => {
        const ownership = [{ memberId: 'self', shareBps: 10_000n }];
        assert.doesNotThrow(() => validateOwnershipShares(ownership));
    });

    // 2. Exact 50/50 Joint Ownership Passes
    it('Joint 50/50 ownership (5000 BPS + 5000 BPS = 10,000 BPS) passes validation', () => {
        const ownership = [
            { memberId: 'self', shareBps: 5000n },
            { memberId: 'spouse', shareBps: 5000n }
        ];
        assert.doesNotThrow(() => validateOwnershipShares(ownership));
    });

    // 3. Ownership Sum < 10,000 BPS Rejection
    it('Ownership summing to < 10,000 BPS is rejected with ERR_OWNERSHIP_SUM_MISMATCH', () => {
        const under = [
            { memberId: 'self', shareBps: 5000n },
            { memberId: 'spouse', shareBps: 4000n } // Total 9000 BPS
        ];
        assert.throws(() => {
            validateOwnershipShares(under);
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_OWNERSHIP_SUM_MISMATCH';
        });
    });

    // 4. Ownership Sum > 10,000 BPS Rejection
    it('Ownership summing to > 10,000 BPS is rejected with ERR_OWNERSHIP_SUM_MISMATCH', () => {
        const over = [
            { memberId: 'self', shareBps: 6000n },
            { memberId: 'spouse', shareBps: 5000n } // Total 11000 BPS
        ];
        assert.throws(() => {
            validateOwnershipShares(over);
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_OWNERSHIP_SUM_MISMATCH';
        });
    });

    // 5. Negative Share BPS Rejection
    it('Negative individual share BPS is rejected with ERR_INVALID_SHARE_BPS', () => {
        const invalid = [
            { memberId: 'self', shareBps: 11000n },
            { memberId: 'spouse', shareBps: -1000n }
        ];
        assert.throws(() => {
            validateOwnershipShares(invalid);
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_INVALID_SHARE_BPS';
        });
    });

    // 6. Duplicate Member ID Rejection
    it('Duplicate memberId in ownership array is rejected with ERR_DUPLICATE_MEMBER', () => {
        const dupes = [
            { memberId: 'self', shareBps: 5000n },
            { memberId: 'self', shareBps: 5000n }
        ];
        assert.throws(() => {
            validateOwnershipShares(dupes);
        }, (err) => {
            return err instanceof AssetValidationError && err.code === 'ERR_DUPLICATE_MEMBER';
        });
    });

    // 7. Multi-Member Allocation Zero Penny Leakage Invariant
    it('Odd-fraction allocation allocates exact remainder to last member with zero paise leakage', () => {
        // 3 owners splitting ₹100.00 (10,000 paise): 3333 BPS, 3333 BPS, 3334 BPS = 10,000 BPS
        const ownership = [
            { memberId: 'user1', shareBps: 3333n },
            { memberId: 'user2', shareBps: 3333n },
            { memberId: 'user3', shareBps: 3334n }
        ];
        const totalPaise = 10_000n; // ₹100.00
        const allocation = allocateAssetSharesPaise(totalPaise, ownership);

        const share1 = allocation.get('user1');
        const share2 = allocation.get('user2');
        const share3 = allocation.get('user3');

        // Sum must strictly equal 10,000n
        assert.strictEqual(share1 + share2 + share3, totalPaise);
        assert.strictEqual(share1, 3333n);
        assert.strictEqual(share2, 3333n);
        assert.strictEqual(share3, 3334n); // Last member absorbs roundoff
    });

    return { passed, total, name: 'Asset Ownership Invariants & Allocation' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    const res = runAssetOwnershipInvariantsTests();
    console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`);
}
