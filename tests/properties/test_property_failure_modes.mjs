/**
 * @file test_property_failure_modes.mjs
 * @description Invariant test suite for Missing Source, Disconnected Modules, and Fault Injection.
 * Verifies PROP-FAIL-01 through PROP-FAIL-08.
 */

import assert from 'assert';
import {
  getLinkedPropertyLoanProjection,
  calculatePropertyNetEquityWithLoan,
  PROPERTY_PROJECTION_STATUS
} from '../../components/properties/propertyIntegrationAdapters.js';
import { getRealEstateCFOProjection } from '../../components/properties/propertyCFOAdapter.js';
import {
  createTenancyAgreement,
  processSecurityDepositSettlement
} from '../../components/properties/propertyRentalEngine.js';
import { PropertyService } from '../../services/propertyService.js';
import { PROPERTY_LIFECYCLE_STATES, PROPERTY_TYPES } from '../../components/properties/propertyContracts.js';

import { validatePropertyOwnership } from '../../components/properties/propertyOwnershipEngine.js';

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

export async function runPropertyFailureModeTests() {
  passed = 0;
  total = 0;

  // PROP-FAIL-01: Loan subsystem outage flags projection as UNAVAILABLE without throwing uncaught exceptions
  await itAsync('PROP-FAIL-01: Loan subsystem outage gracefully yields UNAVAILABLE status', async () => {
    const proj = await getLinkedPropertyLoanProjection('loan_failing_sys', {
      isAvailable: false
    });

    assert.strictEqual(proj.status, PROPERTY_PROJECTION_STATUS.UNAVAILABLE);
    assert.strictEqual(proj.outstandingPrincipalPaise, null);
  });

  // PROP-FAIL-02: Archived / settled loan reports zero balance if closed
  await itAsync('PROP-FAIL-02: Settled loan facility with 0 balance reflects zero debt accurately', async () => {
    const mockSettledLoanProvider = async (id) => ({
      id,
      status: 'CLOSED',
      outstandingPrincipalPaise: 0n,
      monthlyEmiPaise: 0n
    });

    const proj = await getLinkedPropertyLoanProjection('loan_settled_01', {
      isAvailable: true,
      loanProvider: mockSettledLoanProvider
    });

    assert.strictEqual(proj.status, PROPERTY_PROJECTION_STATUS.AVAILABLE);
    assert.strictEqual(proj.outstandingPrincipalPaise, 0n);

    const property = { marketValuePaise: 120_000_00_00n };
    const equity = calculatePropertyNetEquityWithLoan(property, proj);
    assert.strictEqual(equity.netEquityPaise, 120_000_00_00n);
    assert.strictEqual(equity.isUnderwater, false);
  });

  // PROP-FAIL-03: Deleted linked loan ID fails closed to UNAVAILABLE
  await itAsync('PROP-FAIL-03: Deleted linked loan fails closed to UNAVAILABLE and never assumes zero debt', async () => {
    const mockEmptyLoanProvider = async () => null;

    const proj = await getLinkedPropertyLoanProjection('loan_deleted_404', {
      isAvailable: true,
      loanProvider: mockEmptyLoanProvider
    });

    assert.strictEqual(proj.status, PROPERTY_PROJECTION_STATUS.UNAVAILABLE);
    assert.strictEqual(proj.outstandingPrincipalPaise, null);

    const equity = calculatePropertyNetEquityWithLoan({ marketValuePaise: 50_000_00_00n }, proj);
    assert.strictEqual(equity.status, PROPERTY_PROJECTION_STATUS.UNAVAILABLE);
    assert.strictEqual(equity.netEquityPaise, null);
  });

  // PROP-FAIL-04: Transitioning property to SOLD immediately removes it from active CFO projections
  await itAsync('PROP-FAIL-04: Sold property is strictly excluded from active CFO real estate total', async () => {
    const properties = [
      {
        propertyId: 'p_active',
        status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
        marketValuePaise: 100_000_00_00n
      },
      {
        propertyId: 'p_sold',
        status: PROPERTY_LIFECYCLE_STATES.SOLD,
        marketValuePaise: 80_000_00_00n
      }
    ];

    const cfo = await getRealEstateCFOProjection({ propertiesList: properties });
    assert.strictEqual(cfo.familyMarketValuePaise, '1000000000'); // Strictly 100L, excludes 80L sold
    assert.strictEqual(cfo.activePropertiesCount, 1);
  });

  // PROP-FAIL-05: Transitioning property to ARCHIVED immediately removes it from active CFO projections
  await itAsync('PROP-FAIL-05: Archived property is strictly excluded from active CFO real estate total', async () => {
    const properties = [
      {
        propertyId: 'p_active',
        status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
        marketValuePaise: 100_000_00_00n
      },
      {
        propertyId: 'p_archived',
        status: PROPERTY_LIFECYCLE_STATES.ARCHIVED,
        marketValuePaise: 250_000_00_00n
      }
    ];

    const cfo = await getRealEstateCFOProjection({ propertiesList: properties });
    assert.strictEqual(cfo.familyMarketValuePaise, '1000000000'); // Excludes 250L archived
    assert.strictEqual(cfo.activePropertiesCount, 1);
  });

  // PROP-FAIL-06: Corrupted property ownership array fails validation before calculation
  it('PROP-FAIL-06: Corrupted ownership array (not summing to 10,000 BPS) fails validation', () => {
    const badOwnership = [
      { ownerId: 'self', shareBps: 5000n } // Only 50.00%
    ];

    assert.throws(
      () => validatePropertyOwnership(badOwnership),
      /total ownership must equal exactly 10000n BPS/
    );
  });

  // PROP-FAIL-07: Excessive security deposit refund exceeding liability throws RangeError
  it('PROP-FAIL-07: Security deposit refund exceeding liability throws RangeError', () => {
    const tenancy = createTenancyAgreement({
      tenancyId: 'ten_dep_fail',
      propertyId: 'prop_01',
      tenantName: 'Anil Kumar',
      monthlyRentPaise: 30_000_00n,
      securityDepositPaise: 50_000_00n // ₹50,000 deposit
    });

    assert.throws(
      () => processSecurityDepositSettlement(tenancy, {
        refundPaise: 60_000_00n // ₹60,000 exceeds ₹50,000!
      }),
      /exceeds current deposit liability/
    );
  });

  // PROP-FAIL-08: Cold cache reload preserves integration states without leaving partial records
  await itAsync('PROP-FAIL-08: Cold cache wipe and re-hydration preserves clean service state', async () => {
    await PropertyService.resetToCleanState();

    const created = await PropertyService.addProperty({
      propertyId: 'prop_cold_fail_test',
      displayName: 'Safe Haven Home',
      propertyType: PROPERTY_TYPES.RESIDENTIAL_HOUSE,
      status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
      marketValuePaise: 110_000_00_00n,
      linkedLoanId: 'loan_external_99'
    });

    assert.strictEqual(created.propertyId, 'prop_cold_fail_test');

    // Cold memory clear
    PropertyService.clearMemoryCache();

    const reloaded = await PropertyService.getPropertyById('prop_cold_fail_test');
    assert.strictEqual(reloaded.propertyId, 'prop_cold_fail_test');
    assert.strictEqual(reloaded.linkedLoanId, 'loan_external_99');
  });

  console.log(`  Properties Failure Modes: ${passed}/${total} passed`);
  return { passed, total };
}
