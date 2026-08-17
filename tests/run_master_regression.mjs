import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const testFiles = [
    'test_c41.mjs', 'test_c42.mjs', 'test_c43.mjs', 'test_c44.mjs',
    'test_c51.mjs', 'test_c52.mjs', 'test_c53.mjs', 'test_c54.mjs',
    'test_c61.mjs', 'test_c62.mjs', 'test_c63.mjs', 'test_c64.mjs',
    'test_c71.mjs', 'test_c72.mjs', 'test_c73.mjs', 'test_c74.mjs',
    'test_c75.mjs', 'test_c76.mjs', 'test_c77.mjs', 'test_c78.mjs',
    'test_c81.mjs', 'test_c82.mjs', 'test_c83.mjs', 'test_c84.mjs',
    'test_c85.mjs', 'test_c86.mjs', 'test_c87.mjs', 'test_c88.mjs',
    'test_pv2_user_journey.mjs',
    'test_pv3_persona_validation.mjs',
    'test_pv4_decision_quality.mjs',
    'test_pv5_ux_cognitive_load.mjs',
    'test_pv6_security_regulatory.mjs',
    'test_pv7_performance_reliability.mjs',
    'test_pv8_commercial_pmf.mjs',
    'test_pv9_final_architecture_review.mjs',
    'test_ui_comprehensive_suite.mjs',
    'test_ax1_unified_experience.mjs',
    'test_ax2_money_flow_cash_truth.mjs'
];

console.log('================================================================');
console.log('=== FINLIFE MASTER COMPREHENSIVE REGRESSION RUNNER ===');
console.log(`=== Total Test Suites to Execute: ${testFiles.length} ===`);
console.log('================================================================\n');

let totalSuitesPassed = 0;
let totalSuitesFailed = 0;
const failures = [];

for (const file of testFiles) {
    const fullPath = path.resolve(process.cwd(), 'tests', file);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Suite file missing: ${file}`);
        failures.push({ file, error: 'File not found' });
        totalSuitesFailed++;
        continue;
    }

    try {
        process.stdout.write(`Executing ${file.padEnd(38)} ... `);
        const output = execSync(`node --import ./tests/mock_rn.mjs ./tests/${file}`, {
            cwd: process.cwd(),
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        process.stdout.write(`🟢 PASS\n`);
        totalSuitesPassed++;
    } catch (err) {
        process.stdout.write(`❌ FAIL\n`);
        failures.push({ file, error: err.stderr || err.stdout || err.message });
        totalSuitesFailed++;
    }
}

console.log('\n================================================================');
console.log(`=== MASTER REGRESSION RESULT: ${totalSuitesPassed} / ${testFiles.length} SUITES PASSED (${totalSuitesFailed === 0 ? '100%' : 'FAILED'}) ===`);
console.log('================================================================');

if (failures.length > 0) {
    console.error('\nFailures Detail:');
    for (const f of failures) {
        console.error(`\n--- ${f.file} ---`);
        console.error(f.error);
    }
    process.exit(1);
} else {
    console.log('\n🌟 100% REGRESSION CERTIFIED: ZERO REGRESSIONS ACROSS ENTIRE FINLIFE REPOSITORY.');
    process.exit(0);
}
