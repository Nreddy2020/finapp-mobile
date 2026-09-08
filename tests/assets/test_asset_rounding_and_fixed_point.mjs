/**
 * tests/assets/test_asset_rounding_and_fixed_point.mjs
 * 
 * FinLife Assets Module — Rounding & Fixed-Point Calculation Tests.
 */

import assert from 'assert';
import {
    roundHalfUp,
    PURITY_BPS,
    WEIGHT_SCALE,
    UNITS_SCALE,
    BPS_SCALE
} from '../../components/assets/assetContracts.js';
import {
    calculateFineWeightMicros,
    calculateMetalValuationPaise,
    calculateInvestmentValuationPaise,
    calculateGainLossPaise,
    calculateGainLossBps,
    calculateDepreciatedBookValuePaise
} from '../../components/assets/assetCalculations.js';

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

export function runAssetRoundingAndFixedPointTests() {
    passed = 0;
    total = 0;

    // 1. Deterministic Half-Up Rounding
    it('roundHalfUp rounds correctly on exact half and boundaries', () => {
        // 5 / 2 = 2.5 -> 3
        assert.strictEqual(roundHalfUp(5n, 2n), 3n);
        // 4 / 2 = 2.0 -> 2
        assert.strictEqual(roundHalfUp(4n, 2n), 2n);
        // -5 / 2 = -2.5 -> -3
        assert.strictEqual(roundHalfUp(-5n, 2n), -3n);
        // 1 / 3 = 0.333... -> 0
        assert.strictEqual(roundHalfUp(1n, 3n), 0n);
        // 2 / 3 = 0.666... -> 1
        assert.strictEqual(roundHalfUp(2n, 3n), 1n);
    });

    // 2. Gold Fine Weight: 100g 22K (91.67%)
    it('100g 22K gold yields exactly 91.67g (91,670,000 micros) fine weight', () => {
        const grossWeightMicros = 100n * WEIGHT_SCALE; // 100,000,000 micros (100.000000g)
        const purity22K = PURITY_BPS['22K'];          // 9,167 BPS (91.67%)

        const fineWeightMicros = calculateFineWeightMicros(grossWeightMicros, purity22K);
        assert.strictEqual(fineWeightMicros, 91_670_000n); // 91.67 grams
    });

    // 3. Gold Valuation Determinism: Fine Weight * Rate
    it('Gold valuation produces deterministic integer paise with zero drift', () => {
        const fineWeightMicros = 91_670_000n;        // 91.67 grams
        const ratePerGramPaise = 666_000n;           // ₹6,660 per gram = 666,000 paise/g

        // Expected = 91.67 * 6660 = ₹6,10,522.20 = 61,052,220 paise
        const val1 = calculateMetalValuationPaise(fineWeightMicros, ratePerGramPaise);
        const val2 = calculateMetalValuationPaise(fineWeightMicros, ratePerGramPaise);

        assert.strictEqual(val1, 61_052_220n);
        assert.strictEqual(val1, val2, 'Zero variance across repeated calculation runs');
    });

    // 4. Investment Valuation & Gain/Loss
    it('Investment units * NAV calculation is exact', () => {
        const unitsMicros = 1_250n * UNITS_SCALE; // 1,250.000000 units
        const navPaise = 9_480n;                 // ₹94.80 per unit = 9,480 paise

        // 1250 * 94.80 = ₹1,18,500 = 11,850,000 paise
        const val = calculateInvestmentValuationPaise(unitsMicros, navPaise);
        assert.strictEqual(val, 11_850_000n);

        const investedPaise = 10_000_000n; // ₹1,00,000 = 10,000,000 paise
        const gainPaise = calculateGainLossPaise(val, investedPaise);
        assert.strictEqual(gainPaise, 1_850_000n); // ₹18,500

        const gainBps = calculateGainLossBps(val, investedPaise);
        assert.strictEqual(gainBps, 1_850n); // 18.50% = 1850 BPS
    });

    // 5. Straight-Line Depreciation
    it('Depreciated book value correctly decreases over asset lifetime', () => {
        const costPaise = 90_000_00n;    // ₹90,000 Laptop
        const salvagePaise = 10_000_00n; // ₹10,000 Salvage
        const usefulLifeMonths = 48n;    // 4 years

        // At age 0: full cost
        assert.strictEqual(calculateDepreciatedBookValuePaise(costPaise, salvagePaise, usefulLifeMonths, 0n), costPaise);

        // At age 24 (halfway): ₹90,000 - ((80,000) * 24/48) = ₹50,000
        assert.strictEqual(calculateDepreciatedBookValuePaise(costPaise, salvagePaise, usefulLifeMonths, 24n), 50_000_00n);

        // At age 48 (end): salvage value ₹10,000
        assert.strictEqual(calculateDepreciatedBookValuePaise(costPaise, salvagePaise, usefulLifeMonths, 48n), salvagePaise);
    });

    return { passed, total, name: 'Asset Rounding & Fixed-Point Mathematics' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    const res = runAssetRoundingAndFixedPointTests();
    console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`);
}
