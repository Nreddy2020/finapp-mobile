/**
 * @file test_property_integrations.mjs
 * @description Invariant test suite for Property Financial Integrations (Loans & Assets Boundaries).
 * Verifies PROP-INT-01 through PROP-INT-10.
 */

import assert from 'assert';
import {
  getLinkedPropertyLoanProjection,
  calculatePropertyNetEquityWithLoan,
  assertNotLoanEmiOperatingExpense,
  PROPERTY_PROJECTION_STATUS,
  LOAN_UNAVAILABLE_REASON
} from '../../components/properties/propertyIntegrationAdapters.js';
import { LoanRepository } from '../../services/loans/loanRepository.js';
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

export async function runPropertyIntegrationTests() {
  passed = 0;
  total = 0;

  // Mock loan repository provider
  const mockLoans = {
    loan_home_01: {
      id: 'loan_home_01',
      facilityName: 'HDFC Home Loan',
      principalPaise: 80_000_00_00n,          // Original ₹80 Lakh
      outstandingPrincipalPaise: 65_000_00_00n, // Unamortized current balance ₹65 Lakh
      monthlyEmiPaise: 72_000_00n,
      interestRateBps: 850n,
      status: 'ACTIVE'
    },
    loan_underwater_01: {
      id: 'loan_underwater_01',
      facilityName: 'Overleveraged Mortgage',
      principalPaise: 150_000_00_00n,
      outstandingPrincipalPaise: 140_000_00_00n, // ₹1.40 Cr debt
      monthlyEmiPaise: 130_000_00n,
      interestRateBps: 900n,
      status: 'ACTIVE'
    }
  };

  const mockLoanProvider = async (id) => mockLoans[id] || null;

  // PROP-INT-01: Loan source remains immutable
  await itAsync('PROP-INT-01: Loan source remains immutable during read-only projection', async () => {
    const originalCopy = JSON.parse(JSON.stringify(mockLoans.loan_home_01, (k, v) => typeof v === 'bigint' ? v.toString() : v));
    
    const proj = await getLinkedPropertyLoanProjection('loan_home_01', {
      isAvailable: true,
      loanProvider: mockLoanProvider
    });

    assert.strictEqual(proj.status, PROPERTY_PROJECTION_STATUS.AVAILABLE);
    assert.strictEqual(proj.isReadOnlyProjection, true);
    
    // Assert loan record in mock source has not been modified
    assert.strictEqual(mockLoans.loan_home_01.outstandingPrincipalPaise, 65_000_00_00n);
    assert.strictEqual(mockLoans.loan_home_01.facilityName, originalCopy.facilityName);
  });

  // PROP-INT-02: Linked outstanding principal is used, not original principal
  await itAsync('PROP-INT-02: Linked outstanding principal is used, not original principal', async () => {
    const proj = await getLinkedPropertyLoanProjection('loan_home_01', {
      isAvailable: true,
      loanProvider: mockLoanProvider
    });

    assert.strictEqual(proj.status, PROPERTY_PROJECTION_STATUS.AVAILABLE);
    // Crucial check: must use 65L (outstanding), not 80L (original principal)
    assert.strictEqual(proj.outstandingPrincipalPaise, 65_000_00_00n);
    assert.notStrictEqual(proj.outstandingPrincipalPaise, mockLoans.loan_home_01.principalPaise);
  });

  // PROP-INT-03: Missing linked loan returns UNAVAILABLE (never 0n)
  await itAsync('PROP-INT-03: Missing linked loan returns UNAVAILABLE, never defaulting to zero debt', async () => {
    const proj = await getLinkedPropertyLoanProjection('non_existent_loan_999', {
      isAvailable: true,
      loanProvider: mockLoanProvider
    });

    assert.strictEqual(proj.status, PROPERTY_PROJECTION_STATUS.UNAVAILABLE);
    assert.strictEqual(proj.reason, LOAN_UNAVAILABLE_REASON);
    assert.strictEqual(proj.outstandingPrincipalPaise, null); // Strictly null, NEVER 0n!

    // Net equity calculation with unavailable loan must also fail-closed to UNAVAILABLE
    const property = { marketValuePaise: 100_000_00_00n };
    const equity = calculatePropertyNetEquityWithLoan(property, proj);
    assert.strictEqual(equity.status, PROPERTY_PROJECTION_STATUS.UNAVAILABLE);
    assert.strictEqual(equity.netEquityPaise, null);
  });

  // PROP-INT-04: Unlinked property has explicitly zero debt
  await itAsync('PROP-INT-04: Unlinked property has explicitly zero debt and 100% equity', async () => {
    const proj = await getLinkedPropertyLoanProjection(null);

    assert.strictEqual(proj.status, PROPERTY_PROJECTION_STATUS.AVAILABLE);
    assert.strictEqual(proj.linkedLoanId, null);
    assert.strictEqual(proj.outstandingPrincipalPaise, 0n);

    const property = { marketValuePaise: 95_000_00_00n };
    const equity = calculatePropertyNetEquityWithLoan(property, proj);
    assert.strictEqual(equity.status, PROPERTY_PROJECTION_STATUS.AVAILABLE);
    assert.strictEqual(equity.netEquityPaise, 95_000_00_00n);
    assert.strictEqual(equity.isUnderwater, false);
    assert.strictEqual(equity.loanToValueBps, 0n);
  });

  // PROP-INT-05: Negative property equity is preserved
  await itAsync('PROP-INT-05: Negative property equity is preserved for underwater mortgages', async () => {
    const proj = await getLinkedPropertyLoanProjection('loan_underwater_01', {
      isAvailable: true,
      loanProvider: mockLoanProvider
    });

    // Property market value: ₹1.00 Cr, Debt: ₹1.40 Cr -> Underwater by ₹40 Lakh
    const property = { marketValuePaise: 100_000_00_00n };
    const equity = calculatePropertyNetEquityWithLoan(property, proj);

    assert.strictEqual(equity.status, PROPERTY_PROJECTION_STATUS.AVAILABLE);
    assert.strictEqual(equity.isUnderwater, true);
    assert.strictEqual(equity.netEquityPaise, -40_000_00_00n); // Signed negative BigInt!
    assert.strictEqual(equity.loanToValueBps, 14_000n); // 140.00% LTV
  });

  // PROP-INT-06: Loan EMI is not treated as property operating expense
  it('PROP-INT-06: Loan EMI is strictly blocked from being recorded as property OpEx', () => {
    assert.throws(
      () => assertNotLoanEmiOperatingExpense('LOAN_EMI'),
      /Financial boundary violation: Loan EMI/
    );
    assert.throws(
      () => assertNotLoanEmiOperatingExpense('MORTGAGE_EMI'),
      /Financial boundary violation: Loan EMI/
    );
    assert.throws(
      () => assertNotLoanEmiOperatingExpense('EMI'),
      /Financial boundary violation: Loan EMI/
    );

    // Valid OpEx categories pass
    assert.strictEqual(assertNotLoanEmiOperatingExpense('SOCIETY_MAINTENANCE'), true);
    assert.strictEqual(assertNotLoanEmiOperatingExpense('PROPERTY_TAX'), true);
  });

  // PROP-INT-07: Loan-to-Value (LTV) calculation in BPS
  await itAsync('PROP-INT-07: LTV calculation correctly scales to Basis Points (BPS)', async () => {
    const proj = await getLinkedPropertyLoanProjection('loan_home_01', {
      isAvailable: true,
      loanProvider: mockLoanProvider
    });

    // Market value ₹1.00 Cr (100,000,000 paise), Loan ₹65 Lakh (65,000,000 paise)
    // LTV = (65,000,000 * 10,000) / 100,000,000 = 6,500 BPS (65.00%)
    const property = { marketValuePaise: 100_000_00_00n };
    const equity = calculatePropertyNetEquityWithLoan(property, proj);

    assert.strictEqual(equity.loanToValueBps, 6500n);
    assert.strictEqual(equity.netEquityPaise, 35_000_00_00n);
  });

  // PROP-INT-08: Repeated loan projection is deterministic and idempotent
  await itAsync('PROP-INT-08: Repeated loan projection produces identical results with zero drift', async () => {
    const p1 = await getLinkedPropertyLoanProjection('loan_home_01', { loanProvider: mockLoanProvider });
    const p2 = await getLinkedPropertyLoanProjection('loan_home_01', { loanProvider: mockLoanProvider });

    assert.deepStrictEqual(p1, p2);
  });

  // PROP-INT-09: Property loan integration never registers a duplicate loan facility
  await itAsync('PROP-INT-09: Loan projection is read-only and registers zero new facilities', async () => {
    const initialKeys = Object.keys(mockLoans);
    await getLinkedPropertyLoanProjection('loan_home_01', { loanProvider: mockLoanProvider });
    const afterKeys = Object.keys(mockLoans);

    assert.strictEqual(initialKeys.length, afterKeys.length);
  });

  // PROP-INT-10: Property is strictly excluded from Assets module totals
  it('PROP-INT-10: Real estate properties are strictly excluded from Assets module categories', () => {
    // Assets categories must not contain REAL_ESTATE or PROPERTY
    const categories = Object.values(ASSET_CATEGORY);
    assert.strictEqual(categories.includes('PROPERTY'), false);
    assert.strictEqual(categories.includes('PROPERTIES'), false);
    assert.strictEqual(categories.includes('REAL_ESTATE'), false);
  });

  console.log(`  Properties Financial Integrations: ${passed}/${total} passed`);
  return { passed, total };
}
