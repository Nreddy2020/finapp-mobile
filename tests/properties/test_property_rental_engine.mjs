/**
 * @file test_property_rental_engine.mjs
 * @description Invariant test suite for Property Rental Engine, Tenancies, OpEx & Yield Mathematics.
 * Verifies PROP-RENT-01 through PROP-RENT-12.
 */

import assert from 'assert';
import {
  createTenancyAgreement,
  processSecurityDepositSettlement,
  recordPropertyOperatingExpense,
  calculateAnnualGrossRent,
  calculateNetRentalIncome,
  calculateGrossRentalYieldBps,
  calculateNetRentalYieldBps,
  calculateRentalMarginBps,
  calculateRentalPerformanceWithVacancy,
  TENANCY_STATUS,
  RENTAL_OPEX_CATEGORIES
} from '../../components/properties/propertyRentalEngine.js';

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

export async function runPropertyRentalEngineTests() {
  passed = 0;
  total = 0;

  // PROP-RENT-01: Security deposit never becomes income
  it('PROP-RENT-01: Security deposit is classified strictly as a liability, never rental income', () => {
    const tenancy = createTenancyAgreement({
      tenancyId: 'ten_01',
      propertyId: 'prop_apt_101',
      tenantName: 'Rahul Verma',
      monthlyRentPaise: 45_000_00n, // ₹45,000 / month
      securityDepositPaise: 150_000_00n, // ₹1.50 Lakh deposit
      leaseStartDate: '2025-01-01',
      leaseEndDate: '2025-12-31'
    });

    assert.strictEqual(tenancy.isLiability, true);
    assert.strictEqual(tenancy.isRentalIncome, false);
    assert.strictEqual(tenancy.securityDepositLiabilityPaise, 150_000_00n);

    // Annual gross rent calculation must completely ignore the deposit
    const annualRent = calculateAnnualGrossRent(tenancy.monthlyRentPaise);
    assert.strictEqual(annualRent, 45_000_00n * 12n);
    assert.strictEqual(annualRent, 540_000_00n); // ₹5.40 Lakh
  });

  // PROP-RENT-02: Security deposit never enters cost basis
  it('PROP-RENT-02: Security deposit never enters property acquisition cost basis', () => {
    const tenancy = createTenancyAgreement({
      tenancyId: 'ten_02',
      propertyId: 'prop_apt_102',
      tenantName: 'Priya Sharma',
      monthlyRentPaise: 60_000_00n,
      securityDepositPaise: 200_000_00n
    });

    assert.strictEqual(tenancy.isCapitalizedCostBasis, false);
  });

  // PROP-RENT-03: OpEx is deducted exactly once
  it('PROP-RENT-03: OpEx is deducted exactly once from gross rent to yield net rent', () => {
    const grossRentPaise = 600_000_00n; // ₹6 Lakh annual gross rent
    const expenses = [
      recordPropertyOperatingExpense({
        expenseId: 'exp_01',
        propertyId: 'prop_apt_102',
        category: RENTAL_OPEX_CATEGORIES.SOCIETY_MAINTENANCE,
        amountPaise: 60_000_00n // ₹60,000 maintenance
      }),
      recordPropertyOperatingExpense({
        expenseId: 'exp_02',
        propertyId: 'prop_apt_102',
        category: RENTAL_OPEX_CATEGORIES.PROPERTY_TAX,
        amountPaise: 24_000_00n // ₹24,000 property tax
      })
    ];

    const netRent = calculateNetRentalIncome(grossRentPaise, expenses);
    // Net Rent = 6,00,000 - 84,000 = 5,16,000
    assert.strictEqual(netRent, 516_000_00n);
  });

  // PROP-RENT-04: Vacancy produces no artificial rent
  it('PROP-RENT-04: Vacant periods produce zero rental income without artificial accrual', () => {
    const perf = calculateRentalPerformanceWithVacancy({
      monthlyRentPaise: 50_000_00n,
      marketValuePaise: 150_000_00_00n, // ₹1.50 Cr
      vacantMonths: 3,                  // 3 months vacant
      totalMonths: 12,
      operatingExpenses: 50_000_00n
    });

    assert.strictEqual(perf.vacantMonths, 3);
    assert.strictEqual(perf.occupiedMonths, 9);
    // Realized Gross Rent = 50,000 * 9 = 4,50,000 (NOT 6,00,000)
    assert.strictEqual(perf.realizedGrossRentPaise, 450_000_00n);
    assert.strictEqual(perf.vacancyLossPaise, 150_000_00n);
    assert.strictEqual(perf.occupancyRateBps, 7500n); // 75.00%
  });

  // PROP-RENT-05: Gross yield uses market value
  it('PROP-RENT-05: Gross yield is floor(Annual Gross Rent * 10,000 / Market Value)', () => {
    // Annual Rent ₹6.00 Lakh (60,000,000 paise), Market Value ₹2.00 Cr (200,000,000 paise)
    // Yield = (60,000,000 * 10,000) / 200,000,000 = 300 BPS (3.00%)
    const grossRent = 600_000_00n;
    const marketValue = 200_000_00_00n;

    const yieldBps = calculateGrossRentalYieldBps(grossRent, marketValue);
    assert.strictEqual(yieldBps, 300n);
  });

  // PROP-RENT-06: Net yield uses net rental income
  it('PROP-RENT-06: Net yield uses net rental income after OpEx deductions', () => {
    // Gross Rent ₹6.00 Lakh, OpEx ₹1.00 Lakh -> Net Rent ₹5.00 Lakh
    // Market Value ₹2.00 Cr
    // Net Yield = (50,000,000 * 10,000) / 200,000,000 = 250 BPS (2.50%)
    const netRent = 500_000_00n;
    const marketValue = 200_000_00_00n;

    const yieldBps = calculateNetRentalYieldBps(netRent, marketValue);
    assert.strictEqual(yieldBps, 250n);
  });

  // PROP-RENT-07: Zero denominators are handled deterministically
  it('PROP-RENT-07: Zero denominators return deterministic zero without throwing division errors', () => {
    assert.strictEqual(calculateGrossRentalYieldBps(500_000_00n, 0n), 0n);
    assert.strictEqual(calculateNetRentalYieldBps(500_000_00n, 0n), 0n);
    assert.strictEqual(calculateRentalMarginBps(500_000_00n, 0n), 0n);
  });

  // PROP-RENT-08: Rental calculations do not mutate source ledgers
  it('PROP-RENT-08: Rental calculations do not mutate source tenancy or expense objects', () => {
    const expense = {
      expenseId: 'exp_immut_01',
      propertyId: 'prop_01',
      category: RENTAL_OPEX_CATEGORIES.PROPERTY_TAX,
      amountPaise: 10_000_00n
    };
    const copy = { ...expense };

    calculateNetRentalIncome(100_000_00n, [expense]);
    assert.deepStrictEqual(expense, copy);
  });

  // PROP-RENT-09: Annual gross rent correctly scales monthly rent by 12
  it('PROP-RENT-09: Annual gross rent exactly equals monthlyRentPaise * 12n', () => {
    const monthly = 37_500_00n;
    assert.strictEqual(calculateAnnualGrossRent(monthly), 450_000_00n);
  });

  // PROP-RENT-10: Security deposit refund reduces liability balance
  it('PROP-RENT-10: Security deposit refund reduces balance sheet liability with zero income recognition', () => {
    const tenancy = createTenancyAgreement({
      tenancyId: 'ten_settle_01',
      propertyId: 'prop_01',
      tenantName: 'Sameer Patel',
      monthlyRentPaise: 40_000_00n,
      securityDepositPaise: 100_000_00n
    });

    const settlement = processSecurityDepositSettlement(tenancy, {
      refundPaise: 90_000_00n,
      deductionsPaise: 10_000_00n,
      deductionReason: 'Deep cleaning and painting repairs'
    });

    assert.strictEqual(settlement.remainingDepositLiabilityPaise, 0n);
    assert.strictEqual(settlement.isLiabilitySettled, true);
    assert.strictEqual(settlement.refundedPaise, 90_000_00n);
    assert.strictEqual(settlement.deductionsPaise, 10_000_00n);
  });

  // PROP-RENT-11: Negative net rental income produces signed negative net yield
  it('PROP-RENT-11: Negative net rental income preserves signed negative yield', () => {
    // Net Rent -₹50,000 (-5,000,000 paise), Market Value ₹1.00 Cr (100,000,000 paise)
    // Yield = (-5,000,000 * 10,000) / 100,000,000 = -500 BPS (-5.00%)
    const netRent = -50_000_00n;
    const marketValue = 100_000_00_00n;

    const netYield = calculateNetRentalYieldBps(netRent, marketValue);
    assert.strictEqual(netYield, -50n); // -0.50%
  });

  // PROP-RENT-12: Rental margin BPS scales accurately to 10,000 BPS
  it('PROP-RENT-12: Rental margin BPS accurately measures Net Rent as % of Gross Rent', () => {
    // Gross: ₹10 Lakh, Net: ₹8 Lakh -> 80.00% = 8,000 BPS
    const margin = calculateRentalMarginBps(800_000_00n, 1000_000_00n);
    assert.strictEqual(margin, 8000n);
  });

  // PROP-RENT-13: Mathematical floor division correctly floors negative non-divisible yield down
  it('PROP-RENT-13: Non-divisible negative net rental income uses true mathematical floor, flooring down', () => {
    // Net Rent -₹10,000 (-1,000,000 paise), Market Value ₹30 Lakh (300,000,000 paise)
    // Numerator = -1,000,000 * 10,000 = -10,000,000,000
    // Denominator = 300,000,000 -> Ratio = -33.333... BPS
    // Standard JS division truncates toward zero to -33n
    // True mathematical floor correctly floors down to -34n
    const netRent = -10_000_00n;
    const marketValue = 30_000_00_00n;

    const netYield = calculateNetRentalYieldBps(netRent, marketValue);
    assert.strictEqual(netYield, -34n); // True mathematical floor: floor(-33.333...) === -34
  });

  // PROP-RENT-14: Rental performance distinguishes contractual, accrued, realized, vacancy-adjusted, and receivable
  it('PROP-RENT-14: Rental performance clearly separates contractual, accrued, realized, and receivable figures', () => {
    const perf = calculateRentalPerformanceWithVacancy({
      monthlyRentPaise: 50_000_00n,
      marketValuePaise: 100_000_00_00n,
      vacantMonths: 2, // 2 months vacant, 10 months occupied
      totalMonths: 12,
      realizedRentPaise: 400_000_00n // Only 8 months collected so far
    });

    assert.strictEqual(perf.contractualGrossRentPaise, 600_000_00n); // 12 * 50,000 = ₹6.00 Lakh
    assert.strictEqual(perf.vacancyLossPaise, 100_000_00n);          // 2 * 50,000 = ₹1.00 Lakh
    assert.strictEqual(perf.vacancyAdjustedRentPaise, 500_000_00n);  // 10 * 50,000 = ₹5.00 Lakh
    assert.strictEqual(perf.accruedGrossRentPaise, 500_000_00n);
    assert.strictEqual(perf.realizedGrossRentPaise, 400_000_00n);    // ₹4.00 Lakh collected
    assert.strictEqual(perf.outstandingReceivablePaise, 100_000_00n); // ₹1.00 Lakh receivable
  });

  console.log(`  Properties Rental Engine: ${passed}/${total} passed`);
  return { passed, total };
}
