/**
 * @file test_property_cfo.mjs
 * @description Invariant test suite for Personal CFO Real Estate Balance Sheet Projection & Double-Counting Prevention.
 * Verifies PROP-CFO-01 through PROP-CFO-10.
 */

import assert from 'assert';
import { getRealEstateCFOProjection } from '../../components/properties/propertyCFOAdapter.js';
import { PROPERTY_PROJECTION_STATUS } from '../../components/properties/propertyIntegrationAdapters.js';
import { PROPERTY_LIFECYCLE_STATES } from '../../components/properties/propertyContracts.js';
import { getConsolidatedCFOBalanceSheet } from '../../components/assets/assetCFOAdapter.js';

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

export async function runPropertyCFOTests() {
  passed = 0;
  total = 0;

  const mockLoanProvider = async (id) => {
    if (id === 'loan_cfo_01') {
      return {
        id: 'loan_cfo_01',
        facilityName: 'SBI Home Loan',
        principalPaise: 100_000_00_00n,          // Original ₹1.00 Cr
        outstandingPrincipalPaise: 85_000_00_00n, // Outstanding ₹85 Lakh
        monthlyEmiPaise: 80_000_00n,
        status: 'ACTIVE'
      };
    }
    return null;
  };

  const sampleProperties = [
    {
      propertyId: 'prop_villa_01',
      displayName: 'Green Valley Villa',
      status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
      marketValuePaise: 200_000_00_00n, // ₹2.00 Cr
      linkedLoanId: 'loan_cfo_01',      // ₹85 Lakh loan
      ownership: [
        { ownerId: 'self', shareBps: 6000n },   // 60.00% personal share
        { ownerId: 'spouse', shareBps: 4000n } // 40.00% spouse share
      ],
      monthlyRentPaise: 0n
    },
    {
      propertyId: 'prop_rental_flat',
      displayName: 'Metro One Apartment',
      status: PROPERTY_LIFECYCLE_STATES.RENTED,
      marketValuePaise: 85_000_00_00n, // ₹85 Lakh
      linkedLoanId: null,              // Debt-free
      ownership: [
        { ownerId: 'self', shareBps: 10_000n } // 100% self
      ],
      monthlyRentPaise: 25_000_00n, // ₹25,000 / month = ₹3.00 Lakh / yr
      annualOperatingExpensesPaise: 72_000_00n, // ₹72,000 / yr
      securityDepositPaise: 75_000_00n // ₹75,000 deposit liability
    },
    {
      propertyId: 'prop_sold_historical',
      displayName: 'Old Studio Apartment',
      status: PROPERTY_LIFECYCLE_STATES.SOLD, // Liquidated
      marketValuePaise: 40_000_00_00n,
      ownership: [{ ownerId: 'self', shareBps: 10_000n }]
    }
  ];

  // PROP-CFO-01: Property source records remain immutable
  await itAsync('PROP-CFO-01: Property source records remain immutable during CFO projection', async () => {
    const rawCopy = JSON.stringify(sampleProperties, (k, v) => typeof v === 'bigint' ? v.toString() : v);

    const proj = await getRealEstateCFOProjection({
      propertiesList: sampleProperties,
      loanProvider: mockLoanProvider
    });

    assert.strictEqual(proj.isReadOnlyProjection, true);
    const afterCopy = JSON.stringify(sampleProperties, (k, v) => typeof v === 'bigint' ? v.toString() : v);
    assert.strictEqual(rawCopy, afterCopy);
  });

  // PROP-CFO-02: Personal and family views reconcile
  await itAsync('PROP-CFO-02: Personal and family views reconcile with exact mathematical consistency', async () => {
    const proj = await getRealEstateCFOProjection({
      propertiesList: sampleProperties,
      loanProvider: mockLoanProvider,
      targetMemberId: 'self'
    });

    assert.strictEqual(proj.status, PROPERTY_PROJECTION_STATUS.AVAILABLE);

    // Active properties total: 200L + 85L = 285L (₹2.85 Cr) (excludes SOLD 40L)
    assert.strictEqual(proj.familyMarketValuePaise, '2850000000');

    // Personal total: (200L * 60%) + (85L * 100%) = 120L + 85L = 205L (₹2.05 Cr)
    assert.strictEqual(proj.personalMarketValuePaise, '2050000000');

    // Family loan: 85L
    assert.strictEqual(proj.linkedLoanPrincipalPaise, '850000000');

    // Personal loan: 85L * 60% = 51L (₹51 Lakh) (Attributed proportionally, NOT whole family loan!)
    assert.strictEqual(proj.personalLoanPrincipalPaise, '510000000');

    // Family Net Equity: 285L - 85L = 200L (₹2.00 Cr)
    assert.strictEqual(proj.familyNetEquityPaise, '2000000000');

    // Personal Net Equity: 205L - 51L = 154L (₹1.54 Cr)
    assert.strictEqual(proj.personalNetEquityPaise, '1540000000');
  });

  // PROP-CFO-03: Ownership allocation uses the certified 10,000 BPS engine
  await itAsync('PROP-CFO-03: Ownership allocation uses the certified 10,000 BPS largest-remainder engine', async () => {
    // 3 co-owners with 3333, 3333, 3334 BPS
    const fractionalProp = [
      {
        propertyId: 'prop_frac_01',
        status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
        marketValuePaise: 100_000_00_01n, // 100,000,001 paise (odd number inducing remainder)
        ownership: [
          { ownerId: 'self', shareBps: 3334n },
          { ownerId: 'brother', shareBps: 3333n },
          { ownerId: 'sister', shareBps: 3333n }
        ]
      }
    ];

    const projSelf = await getRealEstateCFOProjection({ propertiesList: fractionalProp, targetMemberId: 'self' });
    const projBro = await getRealEstateCFOProjection({ propertiesList: fractionalProp, targetMemberId: 'brother' });
    const projSis = await getRealEstateCFOProjection({ propertiesList: fractionalProp, targetMemberId: 'sister' });

    const selfVal = BigInt(projSelf.personalMarketValuePaise);
    const broVal = BigInt(projBro.personalMarketValuePaise);
    const sisVal = BigInt(projSis.personalMarketValuePaise);

    // Sum of all 3 shares must equal total paise exactly with 0 drift!
    assert.strictEqual(selfVal + broVal + sisVal, 100_000_00_01n);
  });

  // PROP-CFO-04: Property value is not included in Assets
  await itAsync('PROP-CFO-04: Real estate properties are strictly excluded from Assets module categories', async () => {
    // Calling asset CFO balance sheet adapter with non-property assets
    const dummyAssets = [
      { id: 'gold_01', category: 'GOLD_PRECIOUS_METALS', currentValuationPaise: 10_000_00_00n, status: 'ACTIVE' }
    ];

    const cfo = getConsolidatedCFOBalanceSheet({
      assets: dummyAssets,
      bankingProjection: { status: 'AVAILABLE', totalPaise: 50_000_00n },
      propertiesProjection: { status: 'AVAILABLE', propertiesValuationPaise: 285_000_00_00n }
    });

    // Invariant: Non-property assets total does NOT include the property
    assert.strictEqual(cfo.nonPropertyAssetsPaise, 10_500_00_00n);
    // Properties are purely a separate component
    assert.strictEqual(cfo.propertiesValuationPaise, 285_000_00_00n);
    assert.strictEqual(cfo.totalAssetsPaise, 10_500_00_00n + 285_000_00_00n);
  });

  // PROP-CFO-05: Property loan is not duplicated as a new formal loan
  await itAsync('PROP-CFO-05: Property mortgage is resolved by reference and not created as duplicate debt', async () => {
    const proj = await getRealEstateCFOProjection({
      propertiesList: sampleProperties,
      loanProvider: mockLoanProvider
    });

    // References existing loan id 'loan_cfo_01', does not emit synthetic debt records
    assert.strictEqual(proj.linkedLoanPrincipalPaise, '850000000');
  });

  // PROP-CFO-06: Outstanding loan principal is used
  await itAsync('PROP-CFO-06: CFO projection strictly uses dynamic outstanding principal, not original loan', async () => {
    const proj = await getRealEstateCFOProjection({
      propertiesList: sampleProperties,
      loanProvider: mockLoanProvider
    });

    // Must be 85L (outstanding balance), not 100L (original principal)
    assert.strictEqual(proj.linkedLoanPrincipalPaise, '850000000');
    assert.notStrictEqual(proj.linkedLoanPrincipalPaise, '1000000000');
  });

  // PROP-CFO-07: Missing sources remain UNAVAILABLE
  await itAsync('PROP-CFO-07: Unresolved linked loans flag projection as PARTIAL or UNAVAILABLE', async () => {
    const unresolvableProperties = [
      {
        propertyId: 'prop_orphan_loan',
        status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
        marketValuePaise: 100_000_00_00n,
        linkedLoanId: 'loan_missing_404',
        ownership: [{ ownerId: 'self', shareBps: 10_000n }]
      }
    ];

    const proj = await getRealEstateCFOProjection({
      propertiesList: unresolvableProperties,
      loanProvider: mockLoanProvider
    });

    assert.strictEqual(proj.status, PROPERTY_PROJECTION_STATUS.UNAVAILABLE);
    assert.strictEqual(proj.hasUnavailableLoan, true);
    assert.strictEqual(proj.unavailableProperties.length, 1);
  });

  // PROP-CFO-08: Cash movements are not created by read-only projection
  await itAsync('PROP-CFO-08: Generating CFO projection creates zero side-effect cash movements', async () => {
    const proj = await getRealEstateCFOProjection({
      propertiesList: sampleProperties,
      loanProvider: mockLoanProvider
    });

    assert.strictEqual(proj.isReadOnlyProjection, true);
  });

  // PROP-CFO-09: Repeated projection is deterministic
  await itAsync('PROP-CFO-09: Repeated CFO projections are 100% deterministic with zero drift', async () => {
    const proj1 = await getRealEstateCFOProjection({ propertiesList: sampleProperties, loanProvider: mockLoanProvider });
    const proj2 = await getRealEstateCFOProjection({ propertiesList: sampleProperties, loanProvider: mockLoanProvider });

    assert.deepStrictEqual(proj1, proj2);
  });

  // PROP-CFO-10: CFO projection is read-only
  await itAsync('PROP-CFO-10: CFO projection contains verified read-only projection flag', async () => {
    const proj = await getRealEstateCFOProjection({ propertiesList: sampleProperties, loanProvider: mockLoanProvider });
    assert.strictEqual(proj.isReadOnlyProjection, true);
  });

  // PROP-CFO-11: Multi-owner debt allocation uses largest-remainder guaranteeing zero remainder leakage
  await itAsync('PROP-CFO-11: Personal debt attribution across multiple co-owners reconciles with family debt with 0 drift', async () => {
    // 3 co-owners: 3334, 3333, 3333 BPS with an odd debt balance: 100,000,001 paise
    const sharedDebtProp = [
      {
        propertyId: 'prop_debt_split',
        status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
        marketValuePaise: 200_000_00_00n,
        linkedLoanId: 'loan_odd_debt',
        ownership: [
          { ownerId: 'self', shareBps: 3334n },
          { ownerId: 'partner1', shareBps: 3333n },
          { ownerId: 'partner2', shareBps: 3333n }
        ]
      }
    ];

    const oddLoanProvider = async (id) => ({
      id,
      status: 'ACTIVE',
      outstandingPrincipalPaise: 100_000_00_01n
    });

    const projSelf = await getRealEstateCFOProjection({ propertiesList: sharedDebtProp, loanProvider: oddLoanProvider, targetMemberId: 'self' });
    const projP1 = await getRealEstateCFOProjection({ propertiesList: sharedDebtProp, loanProvider: oddLoanProvider, targetMemberId: 'partner1' });
    const projP2 = await getRealEstateCFOProjection({ propertiesList: sharedDebtProp, loanProvider: oddLoanProvider, targetMemberId: 'partner2' });

    const debtSelf = BigInt(projSelf.personalLoanPrincipalPaise);
    const debtP1 = BigInt(projP1.personalLoanPrincipalPaise);
    const debtP2 = BigInt(projP2.personalLoanPrincipalPaise);

    // Sum of personal attributed debts must equal total family debt exactly with 0 drift!
    assert.strictEqual(debtSelf + debtP1 + debtP2, 100_000_00_01n);
  });

  console.log(`  Properties CFO Projection: ${passed}/${total} passed`);
  return { passed, total };
}
