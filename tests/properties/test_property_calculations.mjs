/**
 * @file test_property_calculations.mjs
 * @description Invariant test suite for Property Financial & Area Calculations.
 * Verifies PROP-CALC-01 through PROP-CALC-12.
 */

import assert from 'assert';
import {
  calculateTotalCostBasis,
  calculateUnrealizedGainLoss,
  calculateAppreciationRateBps,
  calculateNetPropertyEquity,
  calculateNetRentalIncome,
  calculateGrossRentalYieldBps,
  calculateNetRentalYieldBps,
  calculateRentalMarginBps,
  areaSqFtToMicros,
  areaMicrosToSqFtString
} from '../../components/properties/propertyCalculations.js';

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

export function runPropertyCalculationsTests() {
  passed = 0;
  total = 0;

  // PROP-CALC-01: Cost basis adds purchase price, registration, stamp duty, brokerage, legal fees, improvements
  it('PROP-CALC-01: Total cost basis aggregates all capitalized acquisition components', () => {
    // Mockup 4 values:
    // Purchase: ₹75,00,000 (75_000_00_00n)
    // Registration: ₹4,50,000 (4_500_00_00n)
    // Stamp Duty: ₹3,75,000 (3_750_00_00n)
    // Legal Fees: ₹1,00,000 (1_000_00_00n)
    // Brokerage: ₹50,000 (500_00_00n)
    // Improvements: ₹25,000 (250_00_00n)
    // Total = ₹85,00,000 (85_000_00_00n)
    const basis = calculateTotalCostBasis({
      purchasePricePaise: 75_000_00_00n,
      registrationChargesPaise: 4_500_00_00n,
      stampDutyPaise: 3_750_00_00n,
      legalFeesPaise: 1_000_00_00n,
      brokeragePaise: 500_00_00n,
      capitalizedImprovementsPaise: 250_00_00n
    });
    assert.strictEqual(basis, 85_000_00_00n);
  });

  // PROP-CALC-02: Cost basis calculation throws on negative components
  it('PROP-CALC-02: Cost basis throws when any acquisition component is negative', () => {
    assert.throws(
      () => calculateTotalCostBasis({ purchasePricePaise: 50_000_00_00n, stampDutyPaise: -1n }),
      /cannot be negative/
    );
  });

  // PROP-CALC-03: Unrealized gain when market value > cost basis
  it('PROP-CALC-03: Unrealized gain is calculated correctly when market value exceeds cost basis', () => {
    // Market: ₹1,20,00,000 (120_000_00_00n)
    // Cost: ₹85,00,000 (85_000_00_00n)
    // Gain = +₹35,00,000 (35_000_00_00n)
    const gain = calculateUnrealizedGainLoss(120_000_00_00n, 85_000_00_00n);
    assert.strictEqual(gain, 35_000_00_00n);
  });

  // PROP-CALC-04: Unrealized loss when market value < cost basis (supports signed negative)
  it('PROP-CALC-04: Unrealized loss returns negative signed BigInt when market value is below cost basis', () => {
    // Market: ₹70,00,000 (70_000_00_00n)
    // Cost: ₹85,00,000 (85_000_00_00n)
    // Loss = -₹15,00,000 (-15_000_00_00n)
    const loss = calculateUnrealizedGainLoss(70_000_00_00n, 85_000_00_00n);
    assert.strictEqual(loss, -15_000_00_00n);
  });

  // PROP-CALC-05: Appreciation rate calculation in BPS
  it('PROP-CALC-05: Appreciation rate is calculated accurately in basis points', () => {
    // Gain: ₹35,00,000 (35_000_00_00n)
    // Cost: ₹85,00,000 (85_000_00_00n)
    // Appreciation = (35 / 85) * 10000 = 4117 BPS (41.17%)
    const rateBps = calculateAppreciationRateBps(35_000_00_00n, 85_000_00_00n);
    assert.strictEqual(rateBps, 4117n);
  });

  // PROP-CALC-06: Appreciation rate returns 0n when cost basis is 0n
  it('PROP-CALC-06: Appreciation rate returns 0n when cost basis is zero', () => {
    const rateBps = calculateAppreciationRateBps(50_000_00n, 0n);
    assert.strictEqual(rateBps, 0n);
  });

  // PROP-CALC-07: Net property equity without linked loan equals market value
  it('PROP-CALC-07: Net equity without linked loan returns full market value and 0n debt', () => {
    const result = calculateNetPropertyEquity({
      marketValuePaise: 120_000_00_00n,
      isLoanLinked: false
    });
    assert.strictEqual(result.status, 'AVAILABLE');
    assert.strictEqual(result.marketValuePaise, 120_000_00_00n);
    assert.strictEqual(result.outstandingLoanPaise, 0n);
    assert.strictEqual(result.netEquityPaise, 120_000_00_00n);
  });

  // PROP-CALC-08: Net property equity with available linked loan returns market value - loan
  it('PROP-CALC-08: Net equity with linked loan calculates equity correctly', () => {
    // Market Value: ₹1,20,00,000
    // Loan: ₹45,00,000
    // Equity: ₹75,00,000
    const result = calculateNetPropertyEquity({
      marketValuePaise: 120_000_00_00n,
      isLoanLinked: true,
      linkedLoanId: 'loan_hdfc_01',
      outstandingLoanPaise: 45_000_00_00n
    });
    assert.strictEqual(result.status, 'AVAILABLE');
    assert.strictEqual(result.marketValuePaise, 120_000_00_00n);
    assert.strictEqual(result.outstandingLoanPaise, 45_000_00_00n);
    assert.strictEqual(result.netEquityPaise, 75_000_00_00n);
  });

  // PROP-CALC-09: Net property equity supports signed negative equity
  it('PROP-CALC-09: Net equity supports signed negative equity when mortgage exceeds value', () => {
    // Market Value: ₹50,00,000
    // Loan: ₹60,00,000
    // Equity: -₹10,00,000
    const result = calculateNetPropertyEquity({
      marketValuePaise: 50_000_00_00n,
      isLoanLinked: true,
      linkedLoanId: 'loan_sbi_01',
      outstandingLoanPaise: 60_000_00_00n
    });
    assert.strictEqual(result.status, 'AVAILABLE');
    assert.strictEqual(result.netEquityPaise, -10_000_00_00n);
  });

  // PROP-CALC-10: Net property equity with missing linked loan returns UNAVAILABLE (never defaults to 0)
  it('PROP-CALC-10: Net equity returns UNAVAILABLE when loan is linked but balance is missing', () => {
    const result = calculateNetPropertyEquity({
      marketValuePaise: 120_000_00_00n,
      isLoanLinked: true,
      linkedLoanId: 'loan_hdfc_01',
      outstandingLoanPaise: null
    });
    assert.strictEqual(result.status, 'UNAVAILABLE');
    assert.strictEqual(result.reason, 'LINKED_LOAN_BALANCE_UNAVAILABLE');
    assert.strictEqual(result.outstandingLoanPaise, undefined);
  });

  // PROP-CALC-11: Rental economics: Net rent, Gross & Net yield, and Margin
  it('PROP-CALC-11: Rental economics calculates net income, yields, and margin deterministically', () => {
    // Mockup 5 values:
    // Monthly Rent: ₹25,000 -> Annual Gross: ₹3,00,000 (300_000_00n)
    // Operating Expenses: Society (₹36k) + Tax (₹18k) + Ins (₹6k) + Repairs (₹12k) = ₹72,000 (72_000_00n)
    // Net Rent = ₹2,28,000 (228_000_00n)
    // Market Value: ₹1,20,00,000 (120_000_00_00n)
    const grossRent = 300_000_00n;
    const opExpenses = 72_000_00n;
    const netRent = calculateNetRentalIncome(grossRent, opExpenses);
    assert.strictEqual(netRent, 228_000_00n);

    // Gross Yield = (3,00,000 * 10000) / 1,20,00,000 = 250 BPS (2.50%)
    const grossYield = calculateGrossRentalYieldBps(grossRent, 120_000_00_00n);
    assert.strictEqual(grossYield, 250n);

    // Net Yield = (2,28,000 * 10000) / 1,20,00,000 = 190 BPS (1.90%)
    const netYield = calculateNetRentalYieldBps(netRent, 120_000_00_00n);
    assert.strictEqual(netYield, 190n);

    // Margin = (2,28,000 * 10000) / 3,00,000 = 7600 BPS (76.00%)
    const margin = calculateRentalMarginBps(netRent, grossRent);
    assert.strictEqual(margin, 7600n);
  });

  // PROP-CALC-12: Area conversion: sq ft to micro units and back to formatted string
  it('PROP-CALC-12: Area micro-unit conversion preserves fractional square feet precision', () => {
    // 2,400.50 sq ft
    const micros = areaSqFtToMicros('2400.50');
    assert.strictEqual(micros, 2_400_500_000n);
    const formatted = areaMicrosToSqFtString(micros);
    assert.strictEqual(formatted, '2400.50');
  });

  return { passed, total };
}
