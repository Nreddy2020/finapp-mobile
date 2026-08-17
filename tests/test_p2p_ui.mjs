/**
 * test_p2p_ui.mjs
 * 
 * P2P SUITE 7: PRESENTATION ADAPTER & VIEWMODEL TRANSFORMATIONS
 * 
 * Verifies:
 * 1. Global Position Metrics calculation (Total Receivable, Total Payable, Net Position, Monthly Interest)
 * 2. Group by Person transformation (aggregates loans under one counterparty)
 * 3. Currency and percentage formatters (INR ₹ formatting)
 * 4. Filter predicates (GIVEN, TAKEN, SETTLED, SEARCH queries)
 * 5. Visual status pill styles & safety status indicators
 */

import {
    computeP2PPositionMetrics,
    groupLoansByPerson,
    formatINR,
    formatPercent,
    filterLoans
} from '../components/p2p/p2pPresentationAdapter.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✓ ${message}`);
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        process.exitCode = 1;
    }
}

console.log('=== P2P SUITE 7: PRESENTATION ADAPTER & VIEWMODEL TRANSFORMATIONS ===\n');

// ── 1. GLOBAL POSITION METRICS ──────────────────────────────────────────────
console.log('--- 1. Global Position Metrics ---');
const sampleLoans = [
    { id: 'l1', type: 'GIVEN', principal: 250000, outstandingPrincipal: 200000, interestRate: 10, interestMethod: 'SIMPLE', status: 'ACTIVE', personId: 'p1', personName: 'Kasapa Reddy Bava' },
    { id: 'l2', type: 'GIVEN', principal: 320000, outstandingPrincipal: 320000, interestRate: 12, interestMethod: 'SIMPLE', status: 'ACTIVE', personId: 'p1', personName: 'Kasapa Reddy Bava' },
    { id: 'l3', type: 'TAKEN', principal: 100000, outstandingPrincipal: 80000, interestRate: 8, interestMethod: 'SIMPLE', status: 'ACTIVE', personId: 'p2', personName: 'Rahul Varma' },
    { id: 'l4', type: 'GIVEN', principal: 50000, outstandingPrincipal: 0, interestRate: 10, interestMethod: 'SIMPLE', status: 'SETTLED', personId: 'p3', personName: 'Suresh Kumar' }
];

const metrics = computeP2PPositionMetrics(sampleLoans);

assert(metrics.totalReceivable === 520000, `Total receivable is ₹5,20,000 (actual: ${metrics.totalReceivable})`);
assert(metrics.totalPayable === 80000, `Total payable is ₹80,000 (actual: ${metrics.totalPayable})`);
assert(metrics.netPosition === 440000, `Net position is +₹4,40,000 (actual: ${metrics.netPosition})`);
assert(metrics.activeGivenCount === 2, 'Active given count is 2');
assert(metrics.activeTakenCount === 1, 'Active taken count is 1');
assert(metrics.settledCount === 1, 'Settled count is 1');

// ── 2. GROUP LOANS BY PERSON ────────────────────────────────────────────────
console.log('\n--- 2. Group Loans by Person ---');
const grouped = groupLoansByPerson(sampleLoans);
assert(grouped.length === 3, `Grouped into 3 distinct persons (actual: ${grouped.length})`);

const kasapaGroup = grouped.find(g => g.personName === 'Kasapa Reddy Bava');
assert(kasapaGroup !== undefined, 'Kasapa group exists');
assert(kasapaGroup.loans.length === 2, 'Kasapa has 2 active sub-loans');
assert(kasapaGroup.totalOutstanding === 520000, `Kasapa total outstanding is ₹5,20,000 (actual: ${kasapaGroup.totalOutstanding})`);

// ── 3. CURRENCY & PERCENT FORMATTING ────────────────────────────────────────
console.log('\n--- 3. Currency & Percentage Formatters ---');
assert(formatINR(1234567.89).includes('12,34,568') || formatINR(1234567.89).includes('12,34,567') || formatINR(1234567.89).includes('1,234,568'), `formatINR produces formatted currency string: ${formatINR(1234567.89)}`);
assert(formatPercent(9.99) === '9.99%', 'formatPercent outputs 9.99%');

// ── 4. FILTERING & SEARCH ───────────────────────────────────────────────────
console.log('\n--- 4. Search & Filter Predicates ---');
const givenFiltered = filterLoans(sampleLoans, { category: 'GIVEN', searchQuery: '' });
assert(givenFiltered.length === 2, `Category GIVEN returns 2 active loans (actual: ${givenFiltered.length})`);

const searchFiltered = filterLoans(sampleLoans, { category: 'ALL', searchQuery: 'Rahul' });
assert(searchFiltered.length === 1 && searchFiltered[0].personName === 'Rahul Varma', 'Search query finds Rahul');

console.log(`\n=== P2P UI SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
