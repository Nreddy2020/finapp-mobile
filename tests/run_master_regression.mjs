import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Dynamically discover all test_*.mjs test suites in tests directory
const testsDir = path.resolve(process.cwd(), 'tests');
const allFiles = fs.readdirSync(testsDir);
const testFiles = allFiles
    .filter(file => file.startsWith('test_') && file.endsWith('.mjs'))
    .sort();

console.log('================================================================');
console.log('=== FINLIFE MASTER COMPREHENSIVE REGRESSION RUNNER ===');
console.log(`=== Dynamically Discovered Test Suites: ${testFiles.length} ===`);
console.log('================================================================\n');

let totalSuitesPassed = 0;
let totalSuitesFailed = 0;
const failures = [];

for (const file of testFiles) {
    const fullPath = path.resolve(testsDir, file);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Suite file missing: ${file}`);
        failures.push({ file, error: 'File not found' });
        totalSuitesFailed++;
        continue;
    }

    try {
        process.stdout.write(`Executing ${file.padEnd(42)} ... `);
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
