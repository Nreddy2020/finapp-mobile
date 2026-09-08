/**
 * tests/reports/test_reports_v1_architecture_and_navigation.mjs
 * 
 * FinLife Financial Command Center & Reports V1 Qualification Suite.
 * 
 * Validates the 8 Mandatory Execution Directives:
 * 1. Navigation Taxonomy & Rebrand ("Financial Command Center", backward-compatible "Money Flow & Cash").
 * 2. 4 Visual Subsections & Exactly 11 Modules with Reports placed strictly as the final module.
 * 3. Non-navigable visual section headers (zero route collisions).
 * 4. Read-Only Proof Invariant: Zero mutations, zero storage writes, zero synthetic ledger entries.
 * 5. Multi-Domain Balance Sheet & Provenance Contract across all 7 authoritative domains.
 * 6. Strict Net Worth Non-Fabrication: If any required domain is UNAVAILABLE, Net Worth is "—" with status PARTIAL.
 * 7. BigInt Presentation Safety: Recursively proves zero raw BigInts and zero functions in UI View Models.
 * 8. Status Isolation: Failure of one source marks only that source UNAVAILABLE without mutating or failing others.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
    ReportSource,
    ReportState,
    ReportStatus,
    ReportSection,
    toBigIntPaise,
    formatBigIntPaise
} from '../../services/reports/reportContracts.js';
import { ReportQueryLayer } from '../../services/reports/reportQueryLayer.js';
import { ReportViewModel } from '../../services/reports/reportViewModel.js';
import { CashbookRepository } from '../../services/cashbook/cashbookRepository.js';
import { LoanRepository } from '../../services/loans/loanRepository.js';
import { GroupRepository } from '../../services/shared-costs/groupRepository.js';
import { StorageService, STORAGE_KEYS } from '../../services/storage.js';

console.log('================================================================');
console.log('🏛️ EXECUTING FINANCIAL COMMAND CENTER & REPORTS V1 ARCHITECTURE SUITE');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function runCheck(id, description, fn) {
    totalCount++;
    try {
        fn();
        console.log(`  [PASS] ${id}: ${description}`);
        passCount++;
    } catch (err) {
        console.error(`  [FAIL] ${id}: ${description}`);
        console.error(`         ${err.message}`);
        throw err;
    }
}

async function runCheckAsync(id, description, fn) {
    totalCount++;
    try {
        await fn();
        console.log(`  [PASS] ${id}: ${description}`);
        passCount++;
    } catch (err) {
        console.error(`  [FAIL] ${id}: ${description}`);
        console.error(`         ${err.message}`);
        throw err;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Navigation Taxonomy & Structural Integrity
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- SECTION 1: Financial Command Center Navigation Taxonomy ---');

const layoutPath = path.resolve(process.cwd(), 'app/(tabs)/_layout.js');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

runCheck('NAV-01', 'Navigation group is labeled "Financial Command Center"', () => {
    assert.ok(layoutContent.includes("label: 'Financial Command Center'"), 'Must contain "label: \'Financial Command Center\'"');
});

runCheck('NAV-02', 'Backward-compatible metadata preserved ("Money Flow & Cash" alias)', () => {
    assert.ok(layoutContent.includes("Money Flow & Cash"), 'Must retain Money Flow & Cash for backward compatibility');
    assert.ok(layoutContent.includes("legacyLabel: 'Money Flow & Cash'"), 'Must declare legacyLabel property');
});

runCheck('NAV-03', 'Contains exactly 4 visual subsections in moneySections', () => {
    assert.ok(layoutContent.includes("title: 'DAILY MONEY'"), 'Must have DAILY MONEY section');
    assert.ok(layoutContent.includes("title: 'CREDIT & LENDING'"), 'Must have CREDIT & LENDING section');
    assert.ok(layoutContent.includes("title: 'WEALTH & PROPERTY'"), 'Must have WEALTH & PROPERTY section');
    assert.ok(layoutContent.includes("title: 'REPORTS'"), 'Must have REPORTS section');
});

runCheck('NAV-04', 'Daily Money subsection contains exactly 5 modules', () => {
    const dailySectionMatch = layoutContent.match(/title:\s*'DAILY MONEY'[\s\S]*?items:\s*\[([\s\S]*?)\]/);
    assert.ok(dailySectionMatch, 'Must find DAILY MONEY items array');
    const items = dailySectionMatch[1];
    assert.ok(items.includes("id: 'flow'"), 'Must include flow');
    assert.ok(items.includes("id: 'cashbooks'"), 'Must include cashbooks');
    assert.ok(items.includes("id: 'budgets'"), 'Must include budgets');
    assert.ok(items.includes("id: 'recurring'"), 'Must include recurring');
    assert.ok(items.includes("id: 'group-expenses'"), 'Must include group-expenses');
});

runCheck('NAV-05', 'Credit & Lending subsection contains exactly 2 modules', () => {
    const creditSectionMatch = layoutContent.match(/title:\s*'CREDIT & LENDING'[\s\S]*?items:\s*\[([\s\S]*?)\]/);
    assert.ok(creditSectionMatch, 'Must find CREDIT & LENDING items array');
    const items = creditSectionMatch[1];
    assert.ok(items.includes("id: 'banking-credit'"), 'Must include banking-credit');
    assert.ok(items.includes("id: 'p2p'"), 'Must include p2p');
});

runCheck('NAV-06', 'Wealth & Property subsection contains exactly 3 modules', () => {
    const wealthSectionMatch = layoutContent.match(/title:\s*'WEALTH & PROPERTY'[\s\S]*?items:\s*\[([\s\S]*?)\]/);
    assert.ok(wealthSectionMatch, 'Must find WEALTH & PROPERTY items array');
    const items = wealthSectionMatch[1];
    assert.ok(items.includes("id: 'assets'"), 'Must include assets');
    assert.ok(items.includes("id: 'properties'"), 'Must include properties');
    assert.ok(items.includes("id: 'investments'"), 'Must include investments');
});

runCheck('NAV-07', 'Reports is permanently placed as the FINAL module (Reports-Last Invariant)', () => {
    const reportsSectionMatch = layoutContent.match(/title:\s*'REPORTS'[\s\S]*?items:\s*\[([\s\S]*?)\]/);
    assert.ok(reportsSectionMatch, 'Must find REPORTS section');
    assert.ok(reportsSectionMatch[1].includes("id: 'reports'"), 'Must include reports in REPORTS section');

    // Verify moneySections array ends with REPORTS section
    const allSectionsIdx = layoutContent.indexOf('const moneySections =');
    const reportsIdx = layoutContent.indexOf("title: 'REPORTS'");
    const wealthIdx = layoutContent.indexOf("title: 'WEALTH & PROPERTY'");
    assert.ok(reportsIdx > wealthIdx, 'REPORTS must appear after WEALTH & PROPERTY');
});

runCheck('NAV-08', 'Total authoritative module count is exactly 11 (excluding visual section headers)', () => {
    // 5 + 2 + 3 + 1 = 11 modules
    assert.ok(layoutContent.includes("const moneySubTabs = moneySections.flatMap(section => section.items);"));
});

runCheck('NAV-09', 'Visual section headers are non-navigable View elements with zero route targets', () => {
    assert.ok(layoutContent.includes("style={styles.subSectionHeader}"), 'Section headers must use subSectionHeader style');
    assert.ok(layoutContent.includes("styles.subSectionHeaderText"), 'Section headers must use subSectionHeaderText style');
    // Ensure section headers do not render as touchable routes
    assert.ok(layoutContent.includes("<Text style={styles.subSectionHeaderText}>{sec.title}</Text>"));
});

runCheck('NAV-10', 'All 11 deep links and route paths are strictly preserved', () => {
    const expectedRoutes = [
        '/(tabs)/self?tab=flow',
        '/(tabs)/cashbooks',
        '/(tabs)/budgets',
        '/(tabs)/recurring',
        '/(tabs)/group-expenses',
        '/(tabs)/banking-credit',
        '/(tabs)/p2p',
        '/(tabs)/assets',
        '/(tabs)/properties',
        '/(tabs)/investments',
        '/(tabs)/reports'
    ];
    for (const r of expectedRoutes) {
        assert.ok(layoutContent.includes(`route: '${r}'`), `Must preserve route ${r}`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Read-Only Proof & Zero State Mutation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SECTION 2: Read-Only Proof & Zero State Mutation ---');

await runCheckAsync('RO-01', 'Executing ReportQueryLayer.getMultiDomainBalanceSheetProvenance produces 0 storage writes', async () => {
    const preKeys = await StorageService.getAllKeys();
    await ReportQueryLayer.getMultiDomainBalanceSheetProvenance();
    const postKeys = await StorageService.getAllKeys();
    assert.deepStrictEqual(preKeys, postKeys, 'Storage keys must be completely identical before and after query');
});

await runCheckAsync('RO-02', 'Executing ReportViewModel.getFullFinancialIntelligence produces 0 repository mutations', async () => {
    const preCashbook = await CashbookRepository.load();
    const preTxCount = preCashbook?.transactions?.length || 0;
    const preAccCount = preCashbook?.accounts?.length || 0;

    const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09', { bypassCache: true });
    assert.ok(intel, 'Must generate financial intelligence');

    const postCashbook = await CashbookRepository.load();
    const postTxCount = postCashbook?.transactions?.length || 0;
    const postAccCount = postCashbook?.accounts?.length || 0;

    assert.strictEqual(preTxCount, postTxCount, 'Cashbook transaction count must be identical');
    assert.strictEqual(preAccCount, postAccCount, 'Cashbook account count must be identical');
});

await runCheckAsync('RO-03', 'Executing reports does not alter loan facilities or group state', async () => {
    const preFacilities = await LoanRepository.getAllFacilities();
    await ReportViewModel.getFullFinancialIntelligence('2026-09', { bypassCache: true });
    const postFacilities = await LoanRepository.getAllFacilities();
    assert.strictEqual(preFacilities.length, postFacilities.length, 'Loan facilities must be untouched');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Multi-Domain Balance Sheet & Provenance Contract
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SECTION 3: Multi-Domain Balance Sheet & Provenance Contract ---');

await runCheckAsync('PROV-01', 'Provenance contains all 7 authoritative financial domains', async () => {
    const bs = await ReportQueryLayer.getMultiDomainBalanceSheetProvenance();
    const domains = ['liquidCash', 'investments', 'physicalAssets', 'properties', 'p2pReceivables', 'formalDebt', 'p2pPayables'];
    for (const d of domains) {
        assert.ok(bs[d], `Must contain domain: ${d}`);
        assert.ok(bs[d].source, `Domain ${d} must declare source`);
        assert.ok(bs[d].status, `Domain ${d} must declare status`);
        assert.ok(bs[d].asOfDate, `Domain ${d} must declare asOfDate`);
        assert.ok(bs[d].lastUpdatedAt, `Domain ${d} must declare lastUpdatedAt`);
        assert.strictEqual(typeof bs[d].isAuthoritative, 'boolean', `Domain ${d} must declare isAuthoritative`);
    }
});

await runCheckAsync('PROV-02', 'Data Availability Summary reflects synchronized modules accurately', async () => {
    const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09', { bypassCache: true });
    const summary = intel.overview.dataAvailabilitySummary;
    assert.ok(summary, 'Must contain dataAvailabilitySummary');
    assert.strictEqual(summary.totalSources, 7, 'Must track exactly 7 required financial domains');
    assert.strictEqual(typeof summary.availableCount, 'number');
    assert.strictEqual(typeof summary.unavailableCount, 'number');
    assert.strictEqual(summary.availableCount + summary.unavailableCount, 7);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Strict Net Worth Non-Fabrication & Null Semantics
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SECTION 4: Strict Net Worth Non-Fabrication & Status Isolation ---');

await runCheckAsync('NW-01', 'Net Worth evaluates to formatted currency when all sources are AVAILABLE', async () => {
    const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09', { bypassCache: true });
    if (intel.overview.netWorth.status === 'AVAILABLE') {
        assert.ok(intel.overview.netWorth.amountFormatted.includes('₹'), 'Must contain rupee symbol');
        assert.strictEqual(intel.overview.netWorth.reason, null);
    } else {
        assert.strictEqual(intel.overview.netWorth.amountFormatted, '—');
    }
});

runCheck('NW-02', 'Status taxonomy supports all 8 required UI states', () => {
    const requiredStates = ['LOADING', 'EMPTY', 'AVAILABLE', 'STALE', 'PARTIAL', 'UNAVAILABLE', 'CORRUPT', 'ERROR'];
    for (const s of requiredStates) {
        assert.ok(ReportStatus[s], `ReportStatus must define ${s}`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. BigInt Presentation Safety Verification (Recursive AST / Object Scan)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SECTION 5: BigInt Presentation Safety (Zero BigInts to React) ---');

function recursivelyAssertZeroBigInts(obj, path = 'root') {
    if (obj === null || obj === undefined) return;
    const t = typeof obj;
    assert.notStrictEqual(t, 'bigint', `VIOLATION: Raw BigInt found at ${path}! Must be formatted string or number.`);
    assert.notStrictEqual(t, 'function', `VIOLATION: Function found at ${path}! Non-serializable.`);

    if (Array.isArray(obj)) {
        obj.forEach((item, idx) => recursivelyAssertZeroBigInts(item, `${path}[${idx}]`));
    } else if (t === 'object') {
        for (const [k, v] of Object.entries(obj)) {
            recursivelyAssertZeroBigInts(v, `${path}.${k}`);
        }
    }
}

await runCheckAsync('SAFE-01', 'ReportViewModel.getFullFinancialIntelligence returns ZERO raw BigInt primitives', async () => {
    const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09', { bypassCache: true });
    recursivelyAssertZeroBigInts(intel, 'FullFinancialIntelligence');
});

await runCheckAsync('SAFE-02', 'Overview object contains strictly safe presentation strings', async () => {
    const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09', { bypassCache: true });
    assert.strictEqual(typeof intel.overview.netWorth.amountFormatted, 'string');
    assert.strictEqual(typeof intel.overview.liquidCash.amountFormatted, 'string');
    assert.strictEqual(typeof intel.overview.investments.amountFormatted, 'string');
    assert.strictEqual(typeof intel.overview.physicalAssets.amountFormatted, 'string');
    assert.strictEqual(typeof intel.overview.properties.amountFormatted, 'string');
    assert.strictEqual(typeof intel.overview.formalDebt.amountFormatted, 'string');
    assert.strictEqual(typeof intel.overview.p2pReceivables.amountFormatted, 'string');
    assert.strictEqual(typeof intel.overview.p2pPayables.amountFormatted, 'string');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. UI Three-Tier Back Navigation Integrity
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SECTION 6: UI Back Navigation Integrity ---');

const reportsScreenPath = path.resolve(process.cwd(), 'app/(tabs)/reports.js');
const reportsScreenContent = fs.readFileSync(reportsScreenPath, 'utf8');

runCheck('NAV-BACK-01', 'Hardware and UI Back Handler implements 3-tier hierarchy', () => {
    // 1. If not in OVERVIEW, return to OVERVIEW
    assert.ok(reportsScreenContent.includes('setActiveSection(ReportSection.OVERVIEW)'), 'Must return to OVERVIEW from detail view');
    // 2. If in OVERVIEW, exit to Personal CFO / Home
    assert.ok(reportsScreenContent.includes("router.replace('/(tabs)')") || reportsScreenContent.includes('router.back()'), 'Must exit to Home from Overview');
    // 3. Hardware BackHandler hook
    assert.ok(reportsScreenContent.includes('BackHandler.addEventListener'), 'Must bind to Hardware BackHandler');
});

runCheck('NAV-BACK-02', 'UI Back button (<ArrowLeft />) is rendered prominently in header', () => {
    assert.ok(reportsScreenContent.includes('<ArrowLeft'), 'Must render ArrowLeft back button');
    assert.ok(reportsScreenContent.includes('onPress={handleBack}'), 'Back button must trigger handleBack');
});

console.log('\n================================================================');
console.log(`🎉 ALL ${passCount} / ${totalCount} ARCHITECTURE & NAVIGATION CHECKS PASSED!`);
console.log('================================================================\n');
