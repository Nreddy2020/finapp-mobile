/**
 * tests/assets/test_asset_negative_equity.mjs
 * 
 * FinLife Assets Module — Signed Vehicle Net Equity Tests.
 */

import assert from 'assert';
import { calculateVehicleNetEquityPaise } from '../../components/assets/assetCalculations.js';
import { AssetValidationError } from '../../components/assets/assetContracts.js';

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

export function runAssetNegativeEquityTests() {
    passed = 0;
    total = 0;

    // 1. Positive Net Vehicle Equity
    it('Positive vehicle equity: Valuation ₹8.5L - Loan ₹4.2L = ₹4.3L net equity', () => {
        const valPaise = 850_000_00n;  // ₹8,50,000 (Honda City)
        const loanPaise = 420_000_00n; // ₹4,20,000 (Car Loan)

        const netEquity = calculateVehicleNetEquityPaise(valPaise, loanPaise);
        assert.strictEqual(netEquity, 430_000_00n); // ₹4,30,000 positive equity
    });

    // 2. Negative Net Vehicle Equity (Underwater Loan)
    it('Negative vehicle equity (underwater loan): Valuation ₹5.0L - Loan ₹7.0L = -₹2.0L net equity', () => {
        const valPaise = 500_000_00n;  // ₹5,00,000 (Depreciated car)
        const loanPaise = 700_000_00n; // ₹7,00,000 (Remaining balance)

        const netEquity = calculateVehicleNetEquityPaise(valPaise, loanPaise);
        assert.strictEqual(netEquity, -200_000_00n); // -₹2,00,000 negative equity
    });

    // 3. Zero Net Equity
    it('Zero net equity: Valuation exactly equals loan balance', () => {
        const valPaise = 600_000_00n;
        const loanPaise = 600_000_00n;

        const netEquity = calculateVehicleNetEquityPaise(valPaise, loanPaise);
        assert.strictEqual(netEquity, 0n);
    });

    // 4. Negative Valuation Rejection
    it('Negative vehicle valuation input is rejected', () => {
        assert.throws(() => {
            calculateVehicleNetEquityPaise(-500_000_00n, 100_000_00n);
        }, (err) => err instanceof AssetValidationError && err.code === 'ERR_NEGATIVE_ASSET_VALUE');
    });

    // 5. Negative Loan Balance Rejection
    it('Negative loan balance input is rejected', () => {
        assert.throws(() => {
            calculateVehicleNetEquityPaise(500_000_00n, -100_000_00n);
        }, (err) => err instanceof AssetValidationError && err.code === 'ERR_NEGATIVE_ASSET_VALUE');
    });

    return { passed, total, name: 'Asset Signed Vehicle Net Equity' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    const res = runAssetNegativeEquityTests();
    console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`);
}
