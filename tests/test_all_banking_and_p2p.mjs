/**
 * test_all_banking_and_p2p.mjs
 * 
 * FINLIFE MASTER CERTIFICATION SUITE (P2P + BANKING ENGINE + UI VISUAL TRUTH)
 * 
 * Machine-aggregated, zero-hardcoding test runner that executes all individual
 * test suites as child processes, dynamically parses individual assertion counts,
 * and prints an authoritative certification table.
 */

import { execSync } from 'child_process';
import path from 'path';

const SUITES = [
    // ── P2P FROZEN BASELINE (UNTOUCHED) ──
    { group: 'P2P Frozen Baseline', name: 'P2P Domain Primitives & Models', file: 'test_p2p_domain.mjs' },
    { group: 'P2P Frozen Baseline', name: 'P2P Financial Calculations', file: 'test_p2p_calculations.mjs' },
    { group: 'P2P Frozen Baseline', name: 'P2P Interest Engine & Progression', file: 'test_p2p_interest.mjs' },
    { group: 'P2P Frozen Baseline', name: 'P2P Repayment Processing & Allocations', file: 'test_p2p_repayment.mjs' },
    { group: 'P2P Frozen Baseline', name: 'P2P Settlement Reconciliation & Closures', file: 'test_p2p_settlement.mjs' },
    { group: 'P2P Frozen Baseline', name: 'P2P Lifecycle & Invariants (A-Y, Z1-8)', file: 'test_p2p_lifecycle_invariants.mjs' },
    { group: 'P2P Frozen Baseline', name: 'P2P Presentation Adapter & ViewModel', file: 'test_p2p_ui.mjs' },
    { group: 'P2P Frozen Baseline', name: 'P2P UI Financial Truth & Comprehension', file: 'test_p2p_ui_financial_truth.mjs' },

    // ── BANKING RELATIONSHIP PLATFORM ──
    { group: 'Banking Platform', name: 'Banking Core Accounting Invariants', file: 'test_banking_invariants.mjs' },
    { group: 'Banking Platform', name: 'Banking UI Financial Truth (UX-01..20)', file: 'test_banking_ui_truth.mjs' },
    { group: 'Banking Platform', name: 'Banking Financial Corruption Detector', file: 'test_banking_validation.mjs' },
    { group: 'Banking Platform', name: 'Banking Visual Truth & Calm Gates', file: 'test_banking_visual_truth.mjs' }
];

console.log('================================================================');
console.log('=== FINLIFE AUTOMATED MASTER CERTIFICATION TEST RUNNER       ===');
console.log('================================================================\n');

const results = [];
let anyFailed = false;

for (let i = 0; i < SUITES.length; i++) {
    const suite = SUITES[i];
    process.stdout.write(`[${i + 1}/${SUITES.length}] Running ${suite.name}... `);

    try {
        const stdout = execSync(`node tests/${suite.file}`, {
            cwd: process.cwd(),
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Parse test count summary from stdout
        // Patterns: "(\d+)/(\d+) (TESTS|GATES|CHECKS) PASSED" or count checkmarks
        let passed = 0;
        let total = 0;

        const summaryMatch = stdout.match(/(\d+)\/(\d+)\s+(?:TESTS|GATES|CHECKS)\s+PASSED/i) ||
                             stdout.match(/PASSED:\s*(\d+)\s*\|\s*FAILED:\s*(\d+)/i);

        if (summaryMatch) {
            if (summaryMatch[0].includes('FAILED:')) {
                passed = parseInt(summaryMatch[1], 10);
                const failed = parseInt(summaryMatch[2], 10);
                total = passed + failed;
            } else {
                passed = parseInt(summaryMatch[1], 10);
                total = parseInt(summaryMatch[2], 10);
            }
        } else {
            // Count passes by checkmarks in output
            const passMatches = stdout.match(/(?:✓|🟢\s*\[PASS\]|👁️\s*\[PASS\]|🛡️\s*\[VAL-\d+\]\s*PASS)/g) || [];
            passed = passMatches.length;
            total = passMatches.length;
        }

        results.push({
            ...suite,
            passed,
            total,
            status: 'PASS'
        });
        console.log(`🟢 PASS (${passed}/${total})`);
    } catch (err) {
        anyFailed = true;
        results.push({
            ...suite,
            passed: 0,
            total: 0,
            status: 'FAIL',
            error: err.message
        });
        console.log(`❌ FAIL\n${err.stdout || err.stderr || err.message}`);
    }
}

// ── DYNAMIC MACHINE-GENERATED SUMMARY ──
console.log('\n');
console.log('FINLIFE BANKING + P2P MASTER CERTIFICATION REPORT');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log(String('Suite Name').padEnd(45) + String('Passed').padStart(8) + String('Total').padStart(8) + String('Status').padStart(10));
console.log('───────────────────────────────────────────────────────────────────────────────');

let p2pCorePassed = 0;
let p2pCoreTotal = 0;
let p2pPresPassed = 0;
let p2pPresTotal = 0;
let bankingPassed = 0;
let bankingTotal = 0;

results.forEach(r => {
    if (r.name.includes('Presentation Adapter')) {
        p2pPresPassed += r.passed;
        p2pPresTotal += r.total;
    } else if (r.group === 'P2P Frozen Baseline') {
        p2pCorePassed += r.passed;
        p2pCoreTotal += r.total;
    } else {
        bankingPassed += r.passed;
        bankingTotal += r.total;
    }
    const line = String(r.name).padEnd(45) + String(r.passed).padStart(8) + String(r.total).padStart(8) + String(r.status).padStart(10);
    console.log(line);
});

const p2pTotalPassed = p2pCorePassed + p2pPresPassed;
const p2pTotalExpected = p2pCoreTotal + p2pPresTotal;
const totalPassed = results.reduce((sum, s) => sum + s.passed, 0);
const totalTests = results.reduce((sum, s) => sum + s.total, 0);

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log(String('P2P CORE FROZEN BASELINE (Original)').padEnd(45) + String(p2pCorePassed).padStart(8) + String(p2pCoreTotal).padStart(8) + String(p2pCorePassed === p2pCoreTotal ? 'PASS' : 'FAIL').padStart(10));
console.log(String('P2P PRESENTATION EXTENDED REGRESSION').padEnd(45) + String(p2pPresPassed).padStart(8) + String(p2pPresTotal).padStart(8) + String(p2pPresPassed === p2pPresTotal ? 'PASS' : 'FAIL').padStart(10));
console.log(String('P2P TOTAL REGRESSION SUITE').padEnd(45) + String(p2pTotalPassed).padStart(8) + String(p2pTotalExpected).padStart(8) + String(p2pTotalPassed === p2pTotalExpected ? 'PASS' : 'FAIL').padStart(10));
console.log(String('BANKING RELATIONSHIP PLATFORM').padEnd(45) + String(bankingPassed).padStart(8) + String(bankingTotal).padStart(8) + String(bankingPassed === bankingTotal ? 'PASS' : 'FAIL').padStart(10));
console.log('───────────────────────────────────────────────────────────────────────────────');
console.log(String('FINLIFE MASTER REGRESSION CERTIFICATION').padEnd(45) + String(totalPassed).padStart(8) + String(totalTests).padStart(8) + String(totalPassed === totalTests && !anyFailed ? 'PASS' : 'FAIL').padStart(10));
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

if (anyFailed || totalPassed !== totalTests) {
    process.exitCode = 1;
}
