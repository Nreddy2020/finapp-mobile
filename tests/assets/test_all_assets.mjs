/**
 * tests/assets/test_all_assets.mjs
 * 
 * Master Runner for FinLife Assets Module Phase 1 Invariant Suites.
 */

import { runAssetContractsTests } from './test_asset_contracts.mjs';
import { runAssetSourceBoundariesTests } from './test_asset_source_boundaries.mjs';
import { runAssetOwnershipInvariantsTests } from './test_asset_ownership_invariants.mjs';
import { runAssetLifecycleTests } from './test_asset_lifecycle.mjs';
import { runAssetRoundingAndFixedPointTests } from './test_asset_rounding_and_fixed_point.mjs';
import { runAssetNoDoubleCountingTests } from './test_asset_no_double_counting.mjs';
import { runAssetNegativeEquityTests } from './test_asset_negative_equity.mjs';
import { runAssetPersistenceTests } from './test_asset_persistence.mjs';
import { runAssetPhase2IntegrationTests } from './test_asset_phase2_integrations.mjs';
import { runAssetUIPresentationTests } from './test_asset_ui_presentation.mjs';

export async function runAllAssetTests() {
    console.log('================================================================');
    console.log('=== FINLIFE ASSETS MODULE MASTER INVARIANT CERTIFICATION     ===');
    console.log('================================================================\n');

    const results = [];

    // 1. Contracts & Domain Bounds
    results.push(runAssetContractsTests());

    // 2. Source Boundaries & Property Isolation
    results.push(await runAssetSourceBoundariesTests());

    // 3. Ownership Invariants & Allocation
    results.push(runAssetOwnershipInvariantsTests());

    // 4. Lifecycle & Audit Trail
    results.push(await runAssetLifecycleTests());

    // 5. Rounding & Fixed-Point Mathematics
    results.push(runAssetRoundingAndFixedPointTests());

    // 6. Double-Counting Prevention
    results.push(await runAssetNoDoubleCountingTests());

    // 7. Signed Vehicle Net Equity
    results.push(runAssetNegativeEquityTests());

    // 8. Persistence, Hydration & Rollback
    results.push(await runAssetPersistenceTests());

    // 9. Phase 2 Integrations & 10 Mandatory Invariants
    results.push(await runAssetPhase2IntegrationTests());

    // 10. Phase 3 UI Presentation & Mockup Parity
    results.push(runAssetUIPresentationTests());

    console.log('\nFINLIFE ASSETS CERTIFICATION REPORT (PHASES 1, 2 & 3)');
    console.log('═'.repeat(79));
    console.log('Suite Name                                     Passed   Total    Status');
    console.log('─'.repeat(79));

    let grandPassed = 0;
    let grandTotal = 0;

    for (const r of results) {
        grandPassed += r.passed;
        grandTotal += r.total;
        const status = r.passed === r.total ? 'PASS' : 'FAIL';
        console.log(`${r.name.padEnd(46)} ${String(r.passed).padStart(6)}   ${String(r.total).padStart(5)}      ${status}`);
    }

    console.log('═'.repeat(79));
    console.log(`ASSETS (PHASE 1 + PHASE 2) TOTAL CHECKS        ${String(grandPassed).padStart(6)}   ${String(grandTotal).padStart(5)}      ${grandPassed === grandTotal ? 'PASS' : 'FAIL'}`);
    console.log('═'.repeat(79));

    if (grandPassed !== grandTotal) {
        throw new Error(`Asset tests failed: ${grandPassed}/${grandTotal}`);
    }

    return { grandPassed, grandTotal };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    runAllAssetTests()
        .then(() => console.log('\n🎉 ALL ASSET PHASE 1 INVARIANT TESTS PASSED!'))
        .catch(err => { console.error(err); process.exit(1); });
}
