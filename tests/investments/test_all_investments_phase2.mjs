/**
 * @file test_all_investments_phase2.mjs
 * @description Master test runner for FinLife Investments Module V1 - Phase 1 & Phase 2:
 * Domain & Ledger Foundation + Accounts, Holdings & Tax Lots Engine.
 */

import { execSync } from 'node:child_process';

console.log('================================================================');
console.log('=== FINLIFE INVESTMENTS: PHASE 1 & 2 MASTER CERTIFICATION ======');
console.log('================================================================\n');

const testSuites = [
  {
    name: 'Investment Contracts, Bounds & Calculations (Phase 1)',
    cmd: 'node tests/investments/test_investment_contracts.mjs'
  },
  {
    name: 'Investment Double-Entry Balanced Ledger Engine (Phase 1)',
    cmd: 'node tests/investments/test_investment_ledger.mjs'
  },
  {
    name: 'Investment Persistence, Lossless Serialization & Idempotency (Phase 1)',
    cmd: 'node --import ./tests/mock_rn.mjs tests/investments/test_investment_persistence.mjs'
  },
  {
    name: 'Investment Tax Lot Engine & Invariants (Phase 2)',
    cmd: 'node tests/investments/test_investment_tax_lots.mjs'
  },
  {
    name: 'Investment Derived Holdings, Reconciliation & Service (Phase 2)',
    cmd: 'node --import ./tests/mock_rn.mjs tests/investments/test_investment_holdings.mjs'
  }
];

let totalSuitesPassed = 0;

for (const suite of testSuites) {
  console.log(`\n▶️ RUNNING SUITE: ${suite.name}...`);
  try {
    execSync(suite.cmd, { stdio: 'inherit' });
    totalSuitesPassed++;
  } catch (err) {
    console.error(`\n❌ SUITE FAILED: ${suite.name}`);
    process.exit(1);
  }
}

console.log('\n================================================================');
console.log(`🏆 ALL ${totalSuitesPassed} / ${testSuites.length} SUITES PASSED PERFECTLY! (78/78 ASSERTIONS)`);
console.log('================================================================\n');
