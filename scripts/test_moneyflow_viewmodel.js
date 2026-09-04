import { buildMoneyFlowViewModel } from '../components/moneyflow/moneyFlowViewModel.js';
import { parseAndEvaluateArithmetic } from '../components/moneyflow/mathParser.js';
import { getPeriodBounds, computeEmergencyReserve, computeEmergencyRunwayMetrics } from '../components/moneyflow/moneyFlowPresentationAdapter.js';

let passed = 0;
let total = 0;

function assert(cond, msg) {
    total++;
    if (cond) {
        passed++;
        console.log(`  ✓ ${msg}`);
    } else {
        console.error(`  ✗ FAIL: ${msg}`);
        process.exitCode = 1;
    }
}

console.log('=== VERIFYING MONEY FLOW PRESENTATION ARCHITECTURE & VIEWMODEL ===\n');

// 1. Invariant MONEYFLOW-VIEW-01 & MONEYFLOW-VIEW-07: Layer 1 Heading & Complete View
const sampleTx = [
    { id: 'tx_1', amount: 120000, type: 'INCOME', category: 'Salary', date: '2026-08-01', merchant: 'Tech Corp' },
    { id: 'tx_2', amount: 28000, type: 'EXPENSE', category: 'Rent', date: '2026-08-02', merchant: 'Landlord' },
    { id: 'tx_3', amount: 6500, type: 'EXPENSE', category: 'Food', date: '2026-08-03', merchant: 'Supermarket' },
    { id: 'tx_4', amount: 15000, type: 'TRANSFER', category: 'Transfer', date: '2026-08-04', merchant: 'Transfer' }
];

const vm = buildMoneyFlowViewModel({
    transactions: sampleTx,
    periodType: 'month',
    referenceDate: '2026-08-15T00:00:00.000Z'
});

assert(vm.whereDidMyCashGo.title === 'Where Did My Cash Go?', 'Layer 1 title must be "Where Did My Cash Go?"');
assert(vm.whereDidMyCashGo.accounts.length > 0, 'Liquid bank accounts listed in whereDidMyCashGo');
assert(vm.periodStatement.totalIncome === 120000, `Period income is ₹1,20,000 (actual: ${vm.periodStatement.totalIncome})`);
assert(vm.periodStatement.totalExpenses === 34500, `Period expenses are ₹34,500 (actual: ${vm.periodStatement.totalExpenses})`);
assert(vm.periodStatement.netMovement === 85500, `Net movement is +₹85,500 (actual: ${vm.periodStatement.netMovement})`);
assert(vm.periodStatement.isNetPositive === true, 'Net movement is positive');
assert(vm.periodStatement.savingsRate === 71, `Savings rate is 71% (actual: ${vm.periodStatement.savingsRate})`);

// 2. Invariant MONEYFLOW-VIEW-04: Transfer Neutrality
assert(sampleTx.some(t => t.type === 'TRANSFER'), 'Sample contains transfer');
assert(vm.periodStatement.totalIncome === 120000 && vm.periodStatement.totalExpenses === 34500, 'Transfers do not affect Income or Expenses');

// 3. Invariant MONEYFLOW-VIEW-03: Synchronized Period Bounds
assert(vm.period.label === 'Aug 2026', `Period label synchronized to "Aug 2026" (actual: ${vm.period.label})`);
assert(vm.recentActivity.transactions.length === 4, 'Activity reflects August transactions');

// 4. Attention Section: Reserve & Obligations
assert(vm.attention.emergencyReserve.title === 'Emergency Reserve', 'Attention contains Emergency Reserve');
assert(vm.attention.emergencyReserve.runwayMonths > 0, 'Runway months calculated');
assert(vm.attention.upcomingObligation !== null, 'Upcoming obligation surfaced');

// 5. Safe Math Parser
assert(parseAndEvaluateArithmetic('2500 + 750 * 2') === 4000, 'Math parser evaluates correctly');
assert(parseAndEvaluateArithmetic('10000 / (2 + 3)') === 2000, 'Math parser handles parentheses');

console.log(`\nResults: ${passed}/${total} assertions passed.`);
