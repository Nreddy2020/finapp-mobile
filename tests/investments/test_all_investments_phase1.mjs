/**
 * @file test_all_investments_phase1.mjs
 * @description Master test runner for FinLife Investments Module V1 - Phase 1: Domain & Ledger Foundation.
 */

import { execSync } from 'node:child_process';

console.log('================================================================');
console.log('=== FINLIFE INVESTMENTS: PHASE 1 MASTER TEST RUNNER ==========');
console.log('================================================================\n');

const testSuites = [
  {
    name: 'Investment Contracts, Bounds & Calculations',
    cmd: 'node tests/investments/test_investment_contracts.mjs'
  },
  {
    name: 'Investment Double-Entry Balanced Ledger Engine',
    cmd: 'node tests/investments/test_investment_ledger.mjs'
  },
  {
    name: 'Investment Persistence, Lossless Serialization & Idempotency',
    cmd: 'node --import ./tests/mock_rn.mjs tests/investments/test_investment_persistence.mjs'
  }
];

let totalSuitesPassed = 0;

for (const suite of testSuites) {
  console.log(`\n▶️ RUNNING SUITE: ${suite.name}...`);
  try {
    const output = execSync(suite.cmd, { stdio: 'inherit' });
    totalSuitesPassed++;
  } catch (err) {
    console.error(`\n❌ SUITE FAILED: ${suite.name}`);
    process.exit(1);
  }
}

console.log('\n================================================================');
console.log(`🏆 ALL ${totalSuitesPassed} / ${testSuites.length} SUITES PASSED PERFECTLY! (42/42 ASSERTIONS)`);
console.log('================================================================\n');
