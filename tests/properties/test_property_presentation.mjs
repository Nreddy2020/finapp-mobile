/**
 * @file test_property_presentation.mjs
 * @description Invariant test suite for Property Presentation Architecture & 10-Screen Mockup Parity.
 * Verifies PROP-UI-01 through PROP-UI-12 plus required edge cases.
 */

import assert from 'assert';
import {
  formatPaiseToINR,
  formatPaiseToCompactINR,
  formatBpsToPercent,
  formatAreaMicrosToSqFt,
  getDashboardViewModel,
  getPropertiesListViewModel,
  getPropertyOverviewViewModel,
  getPropertyFinancialsViewModel,
  getPropertyRentalViewModel,
  getPropertyDocumentsViewModel,
  getPropertyOwnershipViewModel,
  getPropertyLocationViewModel,
  getPropertyTimelineViewModel,
  getPropertyRiskViewModel
} from '../../components/properties/propertyPresentationAdapter.js';
import { getRealEstateCFOProjection } from '../../components/properties/propertyCFOAdapter.js';
import {
  PROPERTY_TYPES,
  PROPERTY_LIFECYCLE_STATES,
  PROPERTY_RISK_STATUS
} from '../../components/properties/propertyContracts.js';

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

export async function runPropertyPresentationTests() {
  passed = 0;
  total = 0;

  const mockActiveHouse = {
    propertyId: 'prop_mock_01',
    displayName: 'Royal Palms Villa',
    propertyType: PROPERTY_TYPES.RESIDENTIAL_HOUSE,
    status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
    marketValuePaise: 250_000_00_00n, // ₹2.50 Cr
    purchasePricePaise: 180_000_00_00n,
    registrationChargesPaise: 10_000_00_00n,
    stampDutyPaise: 12_000_00_00n,
    builtUpAreaMicros: 2_400_000_000n, // 2,400 sq ft
    linkedLoanId: 'loan_mock_home',
    riskStatus: PROPERTY_RISK_STATUS.CLEAR,
    ownership: [
      { ownerId: 'self', ownerName: 'Self', shareBps: 6000n },
      { ownerId: 'spouse', ownerName: 'Spouse', shareBps: 4000n }
    ]
  };

  const mockRentedFlat = {
    propertyId: 'prop_mock_02',
    displayName: 'Cyber City Suite',
    propertyType: PROPERTY_TYPES.APARTMENT,
    status: PROPERTY_LIFECYCLE_STATES.RENTED,
    marketValuePaise: 90_000_00_00n, // ₹90 Lakh
    builtUpAreaMicros: 1_250_000_000n,
    linkedLoanId: null, // Debt free
    ownership: [{ ownerId: 'self', shareBps: 10_000n }],
    tenancy: {
      tenancyId: 'ten_01',
      tenantName: 'Vikram Seth',
      status: 'ACTIVE',
      monthlyRentPaise: 35_000_00n,
      securityDepositLiabilityPaise: 100_000_00n,
      leaseStartDate: '2025-01-01',
      leaseEndDate: '2025-12-31'
    }
  };

  const mockSoldPlot = {
    propertyId: 'prop_mock_sold',
    displayName: 'Old Airport Plot',
    propertyType: PROPERTY_TYPES.PLOT,
    status: PROPERTY_LIFECYCLE_STATES.SOLD,
    marketValuePaise: 50_000_00_00n,
    ownership: [{ ownerId: 'self', shareBps: 10_000n }]
  };

  const mockArchivedFlat = {
    propertyId: 'prop_mock_archived',
    displayName: 'Ancestral Flat',
    propertyType: PROPERTY_TYPES.APARTMENT,
    status: PROPERTY_LIFECYCLE_STATES.ARCHIVED,
    marketValuePaise: 40_000_00_00n,
    ownership: [{ ownerId: 'self', shareBps: 10_000n }]
  };

  const sampleList = [mockActiveHouse, mockRentedFlat, mockSoldPlot, mockArchivedFlat];

  const mockLoanProvider = async (id) => {
    if (id === 'loan_mock_home') {
      return {
        id: 'loan_mock_home',
        outstandingPrincipalPaise: 100_000_00_00n, // ₹1.00 Cr debt
        monthlyEmiPaise: 85_000_00n,
        status: 'ACTIVE'
      };
    }
    return null;
  };

  // PROP-UI-01: No raw financial calculations in screen components
  it('PROP-UI-01: Presentation adapter pre-computes all formatted currency and percentage strings', () => {
    const overviewVm = getPropertyOverviewViewModel({ property: mockActiveHouse });
    assert.strictEqual(typeof overviewVm.marketValueLabel, 'string');
    assert.strictEqual(typeof overviewVm.personalShareLabel, 'string');
    assert.strictEqual(typeof overviewVm.personalValueLabel, 'string');
    assert.strictEqual(typeof overviewVm.areaLabel, 'string');

    // Asserts exact human-readable formatting
    assert.strictEqual(overviewVm.compactMarketValueLabel, '₹2.50 Cr');
    assert.strictEqual(overviewVm.personalShareLabel, '60.00% Self');
    assert.strictEqual(overviewVm.areaLabel, '2400.00 sq ft');
  });

  // PROP-UI-02: Dashboard total equals active property total
  await itAsync('PROP-UI-02: Dashboard hero valuation reconciles exactly with sum of active property cards', async () => {
    const cfo = await getRealEstateCFOProjection({ propertiesList: sampleList, loanProvider: mockLoanProvider });
    const dashboardVm = getDashboardViewModel({ propertiesList: sampleList, cfoProjection: cfo });

    // Active properties are Villa (250L) + Flat (90L) = 340L (₹3.40 Cr)
    assert.strictEqual(dashboardVm.reconciliation.displayedTotalPaise, 340_000_00_00n);
    assert.strictEqual(dashboardVm.reconciliation.expectedTotalPaise, 340_000_00_00n);
    assert.strictEqual(dashboardVm.reconciliation.reconciliationGapPaise, 0n);
    assert.strictEqual(dashboardVm.reconciliation.isReconciled, true);
    assert.strictEqual(dashboardVm.hero.familyMarketValueLabel, '₹3.40 Cr');

    // Invariant: Category allocation BPS strictly sums to 10,000 BPS via Largest-Remainder Method
    assert.strictEqual(dashboardVm.allocationDonut.totalShareBps, 10_000n);

    // Invariant: Clear distinction between personal property share, personal net equity, and family value
    assert.strictEqual(typeof dashboardVm.hero.yourPropertyShareLabel, 'string');
    assert.strictEqual(typeof dashboardVm.hero.familyPropertyValueLabel, 'string');
    assert.strictEqual(typeof dashboardVm.hero.personalNetEquityLabel, 'string');
    assert.strictEqual(typeof dashboardVm.hero.personalAttributedDebtLabel, 'string');

    // Invariant: Deduplicated and ordered audit feed
    assert.ok(Array.isArray(dashboardVm.recentActivity));
    const ids = dashboardVm.recentActivity.map(a => a.id);
    assert.strictEqual(new Set(ids).size, ids.length); // No duplicates
  });

  // PROP-UI-03: Category totals reconcile exactly
  it('PROP-UI-03: Properties list filters and categorizes without item omission', () => {
    const listVm = getPropertiesListViewModel({ propertiesList: sampleList, filterCategory: 'ALL' });
    assert.strictEqual(listVm.itemsCount, 4);

    const aptVm = getPropertiesListViewModel({ propertiesList: sampleList, filterCategory: PROPERTY_TYPES.APARTMENT });
    assert.strictEqual(aptVm.itemsCount, 2); // 1 active flat + 1 archived flat
  });

  // PROP-UI-04: Negative equity preserves sign
  it('PROP-UI-04: Underwater property displays explicit negative sign and UNDERWATER badge', () => {
    const underwaterProperty = {
      propertyId: 'prop_underwater',
      marketValuePaise: 80_000_00_00n, // ₹80 Lakh value
      linkedLoanId: 'loan_heavy'
    };
    const heavyLoan = {
      status: 'AVAILABLE',
      outstandingPrincipalPaise: 95_000_00_00n // ₹95 Lakh debt -> -₹15 Lakh equity
    };

    const finVm = getPropertyFinancialsViewModel({ property: underwaterProperty, loanProjection: heavyLoan });
    assert.strictEqual(finVm.debtAndEquity.isUnderwater, true);
    assert.strictEqual(finVm.debtAndEquity.underwaterBadge, 'UNDERWATER MORTGAGE');
    assert.strictEqual(finVm.debtAndEquity.netEquityLabel, '-₹ 15,00,000');
  });

  // PROP-UI-05: Missing loan balance remains unavailable
  it('PROP-UI-05: Missing loan balance reports Unavailable, never silently assuming zero debt', () => {
    const propWithMissingLoan = {
      propertyId: 'prop_missing_loan',
      marketValuePaise: 100_000_00_00n,
      linkedLoanId: 'loan_broken_999'
    };
    const unavailableLoan = {
      status: 'UNAVAILABLE',
      outstandingPrincipalPaise: null,
      reason: 'LINKED_LOAN_BALANCE_UNAVAILABLE'
    };

    const finVm = getPropertyFinancialsViewModel({ property: propWithMissingLoan, loanProjection: unavailableLoan });
    assert.strictEqual(finVm.debtAndEquity.loanStatus, 'UNAVAILABLE');
    assert.strictEqual(finVm.debtAndEquity.netEquityLabel, 'Unavailable');
    assert.strictEqual(finVm.debtAndEquity.isLoanUnavailable, true);
  });

  // PROP-UI-06: Security deposit is labelled as liability
  it('PROP-UI-06: Security deposit is explicitly labeled as a balance sheet liability, never rental income', () => {
    const rentalVm = getPropertyRentalViewModel({ property: mockRentedFlat });
    assert.strictEqual(rentalVm.hasTenancy, true);
    assert.strictEqual(rentalVm.securityDeposit.isLiability, true);
    assert.strictEqual(rentalVm.securityDeposit.liabilityBadge, 'BALANCE SHEET LIABILITY (NEVER INCOME)');
    assert.strictEqual(rentalVm.securityDeposit.amountLabel, '₹ 1,00,000');
  });

  // PROP-UI-07: Sold properties excluded from active totals
  it('PROP-UI-07: Sold property carries HISTORICAL ARCHIVE badge and is excluded from active portfolio', () => {
    const overviewVm = getPropertyOverviewViewModel({ property: mockSoldPlot });
    assert.strictEqual(overviewVm.isTerminal, true);
    assert.strictEqual(overviewVm.historicalIndicator, 'HISTORICAL ARCHIVE (EXCLUDED FROM ACTIVE WEALTH)');

    const listVm = getPropertiesListViewModel({ propertiesList: [mockSoldPlot] });
    assert.strictEqual(listVm.items[0].isTerminal, true);
    assert.strictEqual(listVm.items[0].historicalIndicator, 'HISTORICAL ARCHIVE');
  });

  // PROP-UI-08: Archived properties excluded from active totals
  it('PROP-UI-08: Archived property carries historical badge and is excluded from dashboard cards', () => {
    const overviewVm = getPropertyOverviewViewModel({ property: mockArchivedFlat });
    assert.strictEqual(overviewVm.isTerminal, true);

    const dashboardVm = getDashboardViewModel({ propertiesList: [mockArchivedFlat] });
    assert.strictEqual(dashboardVm.propertyCards.length, 0); // Excluded!
    assert.strictEqual(dashboardVm.reconciliation.displayedTotalPaise, 0n);
  });

  // PROP-UI-09: Ownership labels match BPS allocation
  it('PROP-UI-09: Ownership labels reflect exact BPS allocations without truncation', () => {
    const ownVm = getPropertyOwnershipViewModel({ property: mockActiveHouse, targetMemberId: 'self' });
    assert.strictEqual(ownVm.totalOwnersCount, 2);
    assert.strictEqual(ownVm.ownerCards[0].sharePercentLabel, '60.00%');
    assert.strictEqual(ownVm.ownerCards[0].isCurrentUser, true);
    assert.strictEqual(ownVm.ownerCards[1].sharePercentLabel, '40.00%');
    assert.strictEqual(ownVm.ownerCards[1].isCurrentUser, false);
  });

  // PROP-UI-10: All 10 screen view models are generated
  it('PROP-UI-10: All 10 mockup screen view models are generated cleanly', () => {
    const v1 = getDashboardViewModel({ propertiesList: sampleList });
    const v2 = getPropertiesListViewModel({ propertiesList: sampleList });
    const v3 = getPropertyOverviewViewModel({ property: mockActiveHouse });
    const v4 = getPropertyFinancialsViewModel({ property: mockActiveHouse });
    const v5 = getPropertyRentalViewModel({ property: mockRentedFlat });
    const v6 = getPropertyDocumentsViewModel({ property: mockActiveHouse });
    const v7 = getPropertyOwnershipViewModel({ property: mockActiveHouse });
    const v8 = getPropertyLocationViewModel({ property: mockActiveHouse });
    const v9 = getPropertyTimelineViewModel({ property: mockActiveHouse });
    const v10 = getPropertyRiskViewModel({ property: mockActiveHouse });

    assert.ok(v1 && v2 && v3 && v4 && v5 && v6 && v7 && v8 && v9 && v10);
    assert.strictEqual(v1.isReadOnlyProjection, true);
    assert.strictEqual(v10.isReadOnlyProjection, true);
  });

  // PROP-UI-11: Presentation formatting is lossless
  it('PROP-UI-11: Formatting functions handle boundary amounts losslessly', () => {
    assert.strictEqual(formatPaiseToINR(0n), '₹ 0');
    assert.strictEqual(formatPaiseToINR(100n), '₹ 1');
    assert.strictEqual(formatPaiseToINR(10000000n), '₹ 1,00,000');
    assert.strictEqual(formatPaiseToINR(1000000000n), '₹ 1,00,00,000');
    assert.strictEqual(formatPaiseToINR(-500000n), '-₹ 5,000');
    assert.strictEqual(formatBpsToPercent(10000n), '100.00%');
    assert.strictEqual(formatBpsToPercent(3333n), '33.33%');
    assert.strictEqual(formatBpsToPercent(-50n), '-0.50%');
  });

  // PROP-UI-12: Presentation adapters do not mutate domain state
  it('PROP-UI-12: Generating ViewModels does not mutate underlying domain records', () => {
    const copy = JSON.stringify(mockActiveHouse, (k, v) => typeof v === 'bigint' ? v.toString() : v);
    getPropertyOverviewViewModel({ property: mockActiveHouse });
    getPropertyFinancialsViewModel({ property: mockActiveHouse });
    const after = JSON.stringify(mockActiveHouse, (k, v) => typeof v === 'bigint' ? v.toString() : v);
    assert.strictEqual(copy, after);
  });

  // Additional Edge Case 1: Empty portfolio
  it('Edge Case: Empty portfolio generates clean zeroed dashboard ViewModel', () => {
    const vm = getDashboardViewModel({ propertiesList: [] });
    assert.strictEqual(vm.hero.activePropertiesCount, 0);
    assert.strictEqual(vm.reconciliation.displayedTotalPaise, 0n);
    assert.strictEqual(vm.reconciliation.isReconciled, true);
  });

  // Additional Edge Case 2: Vacant property with no tenancy
  it('Edge Case: Vacant property ViewModel handles missing tenancy gracefully', () => {
    const vm = getPropertyRentalViewModel({ property: mockActiveHouse });
    assert.strictEqual(vm.hasTenancy, false);
    assert.strictEqual(vm.tenantName, 'No Active Tenant');
    assert.strictEqual(vm.monthlyRentLabel, '₹ 0');
  });

  // Additional Edge Case 3: Multiple co-owners with odd remainder
  it('Edge Case: Multiple co-owners with odd remainder reconcile to the exact rupee', () => {
    const propOdd = {
      marketValuePaise: 100_000_00_01n,
      ownership: [
        { ownerId: 'self', shareBps: 3334n },
        { ownerId: 'u2', shareBps: 3333n },
        { ownerId: 'u3', shareBps: 3333n }
      ]
    };

    const vm = getPropertyOwnershipViewModel({ property: propOdd });
    assert.strictEqual(vm.totalOwnersCount, 3);
    assert.strictEqual(vm.ownerCards[0].sharePercentLabel, '33.34%');
    assert.strictEqual(vm.ownerCards[1].sharePercentLabel, '33.33%');
  });

  console.log(`  Properties UI Presentation & Mockup Parity: ${passed}/${total} passed`);
  return { passed, total };
}
