/**
 * @file test_all_investments_phase4.mjs
 * @description Master test runner for FinLife Investments Module V1 — Phases 1, 2, 3 & 4:
 * Phase 1: Domain & Ledger Foundation (42 tests)
 * Phase 2: Accounts, Holdings & Tax Lots Engine (36 tests)
 * Phase 3: Valuation, Performance Analytics & Persistence (37 tests)
 * Phase 4: Financial Integrations (Banking, Cashbook, Assets, Properties, CFO) (28 tests)
 * Total: 143 tests
 */

import { execSync } from 'node:child_process';

console.log('================================================================');
console.log('=== FINLIFE INVESTMENTS: PHASE 1, 2, 3 & 4 MASTER RUNNER      ===');
console.log('================================================================\n');

const testSuites = [
  {
    name: 'Investment Contracts, Bounds & Calculations (Phase 1)',
    cmd: 'node tests/investments/test_investment_contracts.mjs',
    assertions: 14
  },
  {
    name: 'Investment Double-Entry Balanced Ledger Engine (Phase 1)',
    cmd: 'node tests/investments/test_investment_ledger.mjs',
    assertions: 14
  },
  {
    name: 'Investment Persistence, Lossless Serialization & Idempotency (Phase 1)',
    cmd: 'node --import ./tests/mock_rn.mjs tests/investments/test_investment_persistence.mjs',
    assertions: 14
  },
  {
    name: 'Investment Tax Lot Engine & Invariants (Phase 2)',
    cmd: 'node tests/investments/test_investment_tax_lots.mjs',
    assertions: 20
  },
  {
    name: 'Investment Derived Holdings, Reconciliation & Service (Phase 2)',
    cmd: 'node --import ./tests/mock_rn.mjs tests/investments/test_investment_holdings.mjs',
    assertions: 16
  },
  {
    name: 'Investment Valuation Engine, Price Freshness & Presentation (Phase 3)',
    cmd: 'node tests/investments/test_investment_valuation.mjs',
    assertions: 22
  },
  {
    name: 'Investment Performance Analytics (XIRR, CAGR, TWR) & Persistence (Phase 3)',
    cmd: 'node --import ./tests/mock_rn.mjs tests/investments/test_investment_performance.mjs',
    assertions: 15
  },
  {
    name: 'Investment Financial Integrations (Banking, Cashbook, Assets, Properties, Personal CFO) (Phase 4)',
    cmd: 'node --import ./tests/mock_rn.mjs tests/investments/test_investment_integrations.mjs',
    assertions: 28
  }
];

let totalSuitesPassed = 0;
let totalAssertions = 0;

for (const suite of testSuites) {
  console.log(`\n▶️ RUNNING SUITE: ${suite.name}...`);
  try {
    execSync(suite.cmd, { stdio: 'inherit', cwd: process.cwd() });
    totalSuitesPassed++;
    totalAssertions += suite.assertions;
  } catch (err) {
    console.error(`❌ Suite failed: ${suite.name}`);
    process.exit(1);
  }
}

console.log('\n================================================================');
console.log(`🏆 ALL ${totalSuitesPassed} / ${testSuites.length} SUITES PASSED PERFECTLY! (${totalAssertions}/${totalAssertions} ASSERTIONS)`);
console.log('================================================================\n');
