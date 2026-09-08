/**
 * tests/assets/test_asset_ui_presentation.mjs
 * 
 * FinLife Assets Module — UI Presentation & Mockup Parity Tests.
 * Certifies exact view model alignment with mockup media_1788794817378.jpg:
 * 1. Overview Screen (Hero, Split Ownership, 8-Category Donut, Insights)
 * 2. Categories Screen (8 Controlled Category Cards with Exact Figures)
 * 3. Gold Jewellery Detail Screen (Fine Weight, Purity, Gain)
 * 4. Vehicle Detail Screen (Valuation, Outstanding Loan, Net Equity)
 * 5. Investment Detail Screen (NAV, Units, Unrealized Gain)
 * 6. Document Vault Screen (5 Classified Documents)
 * 7. Family Ownership Breakdown Screen (Self, Spouse, Children, Parents)
 * 8. Read-only Presentation Invariant (Zero Side-Effects)
 */

import assert from 'assert';
import {
    getOverviewViewModel,
    getCategoriesViewModel,
    getGoldDetailViewModel,
    getVehicleDetailViewModel,
    getInvestmentDetailViewModel,
    getDocumentsViewModel,
    getFamilyOwnershipViewModel,
    formatPaiseToINR,
    formatPaiseToCompactINR,
    CATEGORY_CONFIG
} from '../../components/assets/assetPresentationAdapter.js';
import { ASSET_CATEGORY } from '../../components/assets/assetContracts.js';

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

export function runAssetUIPresentationTests() {
    passed = 0;
    total = 0;

    // 1. Currency Formatting
    it('Currency formatting formats paise to standard Indian notation', () => {
        assert.strictEqual(formatPaiseToINR(12_450_000_00n), '₹ 1,24,50,000');
        assert.strictEqual(formatPaiseToINR(7_230_000_00n), '₹ 72,30,000');
        assert.strictEqual(formatPaiseToINR(610_000_00n), '₹ 6,10,000');
        assert.strictEqual(formatPaiseToINR(-200_000_00n), '- ₹ 2,00,000');
    });

    // 2. Compact Currency Notation
    it('Compact notation formats large values to Cr and L cleanly', () => {
        assert.strictEqual(formatPaiseToCompactINR(12_450_000_00n), '₹1.24 Cr');
        assert.strictEqual(formatPaiseToCompactINR(7_230_000_00n), '₹72.30L');
        assert.strictEqual(formatPaiseToCompactINR(850_000_00n), '₹8.50L');
    });

    // 3. Mockup Screen 1: Overview View Model
    it('Overview view model matches Screen 1 mockup structure and figures', () => {
        const vm = getOverviewViewModel({
            totalFamilyPaise: 12_450_000_00n,
            personalPaise: 7_230_000_00n
        });

        assert.strictEqual(vm.hero.title, 'Total Family Assets');
        assert.strictEqual(vm.hero.amountFormatted, '₹ 1,24,50,000');
        assert.strictEqual(vm.hero.yoyGrowthText, '↑ 12% vs last year');
        assert.strictEqual(vm.splitOwnership.yourAssets.amountFormatted, '₹ 72,30,000');
        assert.strictEqual(vm.splitOwnership.familyAssets.amountFormatted, '₹ 1,24,50,000');
        assert.strictEqual(vm.donut.centerAmount, '₹1.24 Cr');
        assert.strictEqual(vm.donut.centerSubtext, 'Total Assets');
        assert.strictEqual(vm.donut.segments.length, 8);
        assert.strictEqual(vm.insights.text, 'Your liquid assets can cover 14 months of current expenses.');
    });

    // 4. Mockup Screen 2: Categories View Model
    it('Categories view model returns the 8 controlled categories matching Screen 2 mockup', () => {
        const cats = getCategoriesViewModel();
        assert.strictEqual(cats.length, 8);

        const money = cats.find(c => c.category === ASSET_CATEGORY.MONEY_CASH);
        assert.strictEqual(money.label, 'Money & Cash');
        assert.strictEqual(money.amountFormatted, '₹ 6,20,000');
        assert.strictEqual(money.assetCount, 3);

        const inv = cats.find(c => c.category === ASSET_CATEGORY.INVESTMENTS);
        assert.strictEqual(inv.label, 'Investments');
        assert.strictEqual(inv.amountFormatted, '₹ 47,10,000');
        assert.strictEqual(inv.assetCount, 12);

        const gold = cats.find(c => c.category === ASSET_CATEGORY.PRECIOUS_METALS);
        assert.strictEqual(gold.label, 'Gold & Precious Metals');
        assert.strictEqual(gold.amountFormatted, '₹ 22,40,000');
        assert.strictEqual(gold.assetCount, 5);

        const veh = cats.find(c => c.category === ASSET_CATEGORY.VEHICLES);
        assert.strictEqual(veh.label, 'Vehicles');
        assert.strictEqual(veh.amountFormatted, '₹ 15,00,000');
        assert.strictEqual(veh.assetCount, 2);

        const rec = cats.find(c => c.category === ASSET_CATEGORY.RECEIVABLES);
        assert.strictEqual(rec.label, 'Receivables');
        assert.strictEqual(rec.amountFormatted, '₹ 7,40,000');
        assert.strictEqual(rec.assetCount, 4);

        const other = cats.find(c => c.category === ASSET_CATEGORY.OTHER_ASSETS);
        assert.strictEqual(other.label, 'Other Assets');
        assert.strictEqual(other.amountFormatted, '₹ 4,60,000');
        assert.strictEqual(other.assetCount, 3);
    });

    // 5. Mockup Screen 3: Gold Jewellery Detail View Model
    it('Gold detail view model matches Screen 3 mockup specifications', () => {
        const gold = getGoldDetailViewModel();
        assert.strictEqual(gold.title, 'Gold Jewellery');
        assert.strictEqual(gold.subtitle, 'Personal Asset | Jewellery');
        assert.strictEqual(gold.twinCards.currentValueFormatted, '₹ 6,10,000');
        assert.strictEqual(gold.twinCards.purchaseCostFormatted, '₹ 4,20,000');

        const fineWeightSpec = gold.specs.find(s => s.label === 'Fine Weight');
        assert.strictEqual(fineWeightSpec.value, '91.67 grams');

        const puritySpec = gold.specs.find(s => s.label === 'Purity');
        assert.strictEqual(puritySpec.value, '22K');

        assert.strictEqual(gold.gainBanner.formattedValue, '+ ₹ 1,90,000 (45.2%)');
    });

    // 6. Mockup Screen 4: Vehicle Detail View Model with Net Equity
    it('Vehicle detail view model matches Screen 4 mockup and net vehicle equity calculation', () => {
        const veh = getVehicleDetailViewModel();
        assert.strictEqual(veh.title, 'Honda City');
        assert.strictEqual(veh.subtitle, 'Vehicle | Car');
        assert.strictEqual(veh.twinCards.currentValueFormatted, '₹ 8,50,000');
        assert.strictEqual(veh.twinCards.purchaseCostFormatted, '₹ 12,00,000');

        const loanSpec = veh.specs.find(s => s.label === 'Outstanding Loan');
        assert.strictEqual(loanSpec.value, '₹ 4,20,000');

        const equitySpec = veh.specs.find(s => s.label === 'Net Vehicle Equity');
        assert.strictEqual(equitySpec.value, '₹ 4,30,000');
    });

    // 7. Mockup Screen 5: Investment Detail View Model
    it('Investment detail view model matches Screen 5 mockup and NAV performance', () => {
        const inv = getInvestmentDetailViewModel();
        assert.strictEqual(inv.title, 'HDFC Index Fund');
        assert.strictEqual(inv.subtitle, 'Mutual Fund | Investment');
        assert.strictEqual(inv.twinCards.currentValueFormatted, '₹ 1,18,500');
        assert.strictEqual(inv.twinCards.investedAmountFormatted, '₹ 1,00,000');

        const gainSpec = inv.specs.find(s => s.label === 'Unrealized Gain');
        assert.strictEqual(gainSpec.value, '+ ₹ 18,500 (18.5%)');

        const navSpec = inv.specs.find(s => s.label === 'Current NAV');
        assert.strictEqual(navSpec.value, '₹ 94.80');
    });

    // 8. Mockup Screen 6: Document Vault View Model
    it('Document vault view model lists the 5 classified documents', () => {
        const docs = getDocumentsViewModel();
        assert.strictEqual(docs.length, 5);
        assert.strictEqual(docs[0].title, 'Gold Purchase Bill');
        assert.strictEqual(docs[1].title, 'Car RC');
        assert.strictEqual(docs[2].title, 'Insurance Policy');
        assert.strictEqual(docs[3].title, 'Mutual Fund Statement');
        assert.strictEqual(docs[4].title, 'Warranty Document');
    });

    // 9. Mockup Screen 7: Family Ownership Breakdown View Model
    it('Family ownership view model matches Screen 7 breakdown', () => {
        const fam = getFamilyOwnershipViewModel();
        assert.strictEqual(fam.length, 4);

        const self = fam.find(f => f.member === 'Self');
        assert.strictEqual(self.assetCount, 18);
        assert.strictEqual(self.totalFormatted, '₹ 72,30,000');

        const spouse = fam.find(f => f.member === 'Spouse');
        assert.strictEqual(spouse.assetCount, 12);
        assert.strictEqual(spouse.totalFormatted, '₹ 38,40,000');

        const children = fam.find(f => f.member === 'Children');
        assert.strictEqual(children.assetCount, 4);
        assert.strictEqual(children.totalFormatted, '₹ 8,50,000');

        const parents = fam.find(f => f.member === 'Parents');
        assert.strictEqual(parents.assetCount, 3);
        assert.strictEqual(parents.totalFormatted, '₹ 5,30,000');
    });

    // 10. Read-only Presentation Invariant
    it('Presentation adapters perform zero mutations on input structures', () => {
        const inputTotals = Object.freeze({
            [ASSET_CATEGORY.MONEY_CASH]: 620_000_00n
        });

        const vm = getOverviewViewModel({ categoryTotals: inputTotals });
        assert.ok(vm);
        assert.strictEqual(inputTotals[ASSET_CATEGORY.MONEY_CASH], 620_000_00n);
    });

    // 11. ASSET-UI-INV-11: Category Total Equals Hero Total Family Assets Invariant
    it('ASSET-UI-INV-11: sum(category presentation values) === authoritative total family assets', () => {
        // Baseline verification: Ensure the 8 default category values sum EXACTLY to the hero amount
        const cats = getCategoriesViewModel();
        const overview = getOverviewViewModel();

        const categorySumPaise = cats.reduce((acc, c) => acc + c.amountPaise, 0n);
        assert.strictEqual(categorySumPaise, 12_450_000_00n);
        assert.strictEqual(formatPaiseToINR(categorySumPaise), overview.hero.amountFormatted);
        assert.strictEqual(overview.hero.amountFormatted, '₹ 1,24,50,000');
        assert.strictEqual(overview.splitOwnership.familyAssets.amountFormatted, '₹ 1,24,50,000');

        // Dynamic multi-category input verification: Ensure no penny leakage under arbitrary distributions
        const customTotals = {
            [ASSET_CATEGORY.MONEY_CASH]: 500_000_00n,
            [ASSET_CATEGORY.INVESTMENTS]: 1_500_000_00n,
            [ASSET_CATEGORY.PRECIOUS_METALS]: 1_000_000_00n,
            [ASSET_CATEGORY.VEHICLES]: 800_000_00n,
            [ASSET_CATEGORY.HOUSEHOLD_VALUABLES]: 200_000_00n,
            [ASSET_CATEGORY.BUSINESS_ASSETS]: 300_000_00n,
            [ASSET_CATEGORY.RECEIVABLES]: 100_000_00n,
            [ASSET_CATEGORY.OTHER_ASSETS]: 600_000_00n
        };
        const customSummaries = Object.entries(customTotals).map(([cat, totalPaise]) => ({
            category: cat,
            totalPaise,
            assetCount: 1
        }));
        const dynamicCats = getCategoriesViewModel(customSummaries);
        const dynamicSum = dynamicCats.reduce((acc, c) => acc + c.amountPaise, 0n);
        const expectedTotal = 5_000_000_00n; // 500+1500+1000+800+200+300+100+600 = 5000 Lakh * 10000 paise = ₹50,00,000
        assert.strictEqual(dynamicSum, expectedTotal);

        const dynamicOverview = getOverviewViewModel({
            totalFamilyPaise: expectedTotal,
            categoryTotals: customTotals
        });
        assert.strictEqual(formatPaiseToINR(dynamicSum), dynamicOverview.hero.amountFormatted);
        assert.strictEqual(dynamicOverview.hero.amountFormatted, '₹ 50,00,000');
    });

    return { passed, total, name: 'Assets UI Presentation & Mockup Parity' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    const res = runAssetUIPresentationTests();
    console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`);
}
