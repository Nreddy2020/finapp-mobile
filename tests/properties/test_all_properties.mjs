/**
 * @file test_all_properties.mjs
 * @description Master Invariant Certification Runner for the FinLife Properties Module (Phases 1 & 2).
 */

import { runPropertyContractsTests } from './test_property_contracts.mjs';
import { runPropertyCalculationsTests } from './test_property_calculations.mjs';
import { runPropertyOwnershipTests } from './test_property_ownership.mjs';
import { runPropertyLifecycleTests } from './test_property_lifecycle.mjs';
import { runPropertyValuationTests } from './test_property_valuation.mjs';
import { runPropertyPersistenceTests } from './test_property_persistence.mjs';
import { runPropertyIntegrationTests } from './test_property_integrations.mjs';
import { runPropertyRentalEngineTests } from './test_property_rental_engine.mjs';
import { runPropertyCFOTests } from './test_property_cfo.mjs';
import { runPropertyFailureModeTests } from './test_property_failure_modes.mjs';
import { runPropertyPresentationTests } from './test_property_presentation.mjs';
import { runPropertyUpgradePersistenceTests } from './test_property_upgrade_persistence.mjs';

async function runAllPropertiesTests() {
  console.log('================================================================');
  console.log('=== FINLIFE PROPERTIES MODULE MASTER INVARIANT CERTIFICATION ===');
  console.log('================================================================\n');

  const results = [];

  // PHASE 1: DOMAIN FOUNDATION & INVARIANT ENGINE
  // 1. Contracts & Domain Boundaries
  const res1 = runPropertyContractsTests();
  results.push({ name: 'Property Domain Contracts & Boundaries', ...res1 });

  // 2. Financial & Area Calculations
  const res2 = runPropertyCalculationsTests();
  results.push({ name: 'Property Financial & Area Calculations', ...res2 });

  // 3. Ownership & Largest-Remainder Allocation
  const res3 = runPropertyOwnershipTests();
  results.push({ name: 'Property Ownership & BPS Allocation', ...res3 });

  // 4. Lifecycle State Machine & Active Exclusion
  const res4 = runPropertyLifecycleTests();
  results.push({ name: 'Property Lifecycle State Machine & Active Exclusion', ...res4 });

  // 5. Valuation Records & Historical Logs
  const res5 = runPropertyValuationTests();
  results.push({ name: 'Property Valuation Engine & Historical Logs', ...res5 });

  // 6. Persistence, Serialization, Idempotency & Recovery
  const res6 = await runPropertyPersistenceTests();
  results.push({ name: 'Property Persistence, Serialization & Idempotency', ...res6 });

  // PHASE 2: FINANCIAL INTEGRATIONS & RENTAL ENGINE
  // 7. Financial Integration & Loan Boundaries
  const res7 = await runPropertyIntegrationTests();
  results.push({ name: 'Property Financial Integrations & Boundaries', ...res7 });

  // 8. Rental Economics, Tenancies, OpEx & Yields
  const res8 = await runPropertyRentalEngineTests();
  results.push({ name: 'Property Rental Engine, Tenancies & Yields', ...res8 });

  // 9. Personal CFO Balance Sheet Projections
  const res9 = await runPropertyCFOTests();
  results.push({ name: 'Property CFO Balance Sheet Projections', ...res9 });

  // 10. Failure Modes, Missing Sources & Recovery
  const res10 = await runPropertyFailureModeTests();
  results.push({ name: 'Property Failure Modes & Recovery', ...res10 });

  // PHASE 3: PRESENTATION ARCHITECTURE & MOCKUP PARITY
  // 11. Presentation Truth & Mockup Parity
  const res11 = await runPropertyPresentationTests();
  results.push({ name: 'Property UI Presentation & Mockup Parity', ...res11 });

  // 12. In-Place Upgrade Persistence & Non-Regression
  const res12 = await runPropertyUpgradePersistenceTests();
  results.push({ name: 'Property In-Place Upgrade Persistence & Non-Regression', ...res12 });

  // Summary Report
  console.log('\nFINLIFE PROPERTIES CERTIFICATION REPORT (PHASES 1, 2 & 3)');
  console.log('═'.repeat(80));
  console.log(
    'Suite Name'.padEnd(52) +
    'Passed'.padStart(8) +
    'Total'.padStart(8) +
    '    Status'
  );
  console.log('─'.repeat(80));

  let grandTotal = 0;
  let grandPassed = 0;

  for (const r of results) {
    grandTotal += r.total;
    grandPassed += r.passed;
    const status = r.passed === r.total ? 'PASS' : 'FAIL';
    console.log(
      r.name.padEnd(52) +
      r.passed.toString().padStart(8) +
      r.total.toString().padStart(8) +
      `      ${status}`
    );
  }

  console.log('═'.repeat(80));
  console.log(
    'PROPERTIES MODULE (PHASES 1, 2 & 3) TOTAL CHECKS'.padEnd(52) +
    grandPassed.toString().padStart(8) +
    grandTotal.toString().padStart(8) +
    `      ${grandPassed === grandTotal ? 'PASS' : 'FAIL'}`
  );
  console.log('═'.repeat(80));

  if (grandPassed !== grandTotal) {
    console.error(`\n❌ CERTIFICATION FAILED: ${grandTotal - grandPassed} tests failed.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL ${grandTotal} PROPERTY PHASE 1, 2 & 3 INVARIANT TESTS PASSED!\n`);
  }
}

runAllPropertiesTests().catch(err => {
  console.error('Fatal error running Properties test suite:', err);
  process.exit(1);
});
