/**
 * tests/test_decision_intelligence.mjs
 * Decision engine: affordability, EMI, subscriptions, leaks, what-if, goals, debt payoff,
 * action plan, assistant answers, and the snapshot reading canonical stores.
 */
import assert from 'node:assert/strict';
import { clearAllData, saveData, STORAGE_KEYS } from '../services/storage.js';
import { emi, affordability, subscriptionAudit, savingsLeaks, whatIf, goalFeasibility, debtPayoff, actionPlan, weeklyDigest, answerQuestion, loadDecisionContext } from '../services/intelligence/decisionEngine.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
await clearAllData();

await test('EMI formula', async () => { assert.equal(emi(100000, 12, 12), 8884.88); assert.equal(emi(120000, 0, 12), 10000); });
await test('Affordability verdicts with reasons', async () => {
    const ok = affordability({ price: 20000, monthlyIncome: 80000, monthlyExpenses: 40000, liquidCash: 400000 });
    assert.equal(ok.verdict, 'comfortable');
    const stretch = affordability({ price: 150000, monthlyIncome: 80000, monthlyExpenses: 40000, liquidCash: 250000 });
    assert.equal(stretch.verdict, 'stretch'); assert.ok(stretch.reasons.join(' ').includes('months of living costs'));
    const avoid = affordability({ price: 300000, monthlyIncome: 80000, monthlyExpenses: 40000, liquidCash: 250000 });
    assert.equal(avoid.verdict, 'avoid'); assert.ok(avoid.monthsToSaveBeforeBuying > 0);
    const financed = affordability({ price: 600000, monthlyIncome: 80000, monthlyExpenses: 40000, liquidCash: 400000, financing: { downPayment: 100000, annualRatePct: 10, months: 60 } });
    assert.equal(financed.emi, emi(500000, 10, 60)); assert.ok(['comfortable', 'stretch'].includes(financed.verdict));
});
await test('Subscription audit annualises and flags waste', async () => {
    const a = subscriptionAudit([{ name: 'Video Plus', amount: 499, frequency: 'monthly', usage: 'never' }, { name: 'Music', amount: 1200, frequency: 'yearly', usage: 'daily' }, { name: 'Video Max', amount: 299, frequency: 'monthly' }]);
    assert.equal(a.annualTotal, 499 * 12 + 1200 + 299 * 12); assert.equal(a.wastePerYear, 5988); assert.ok(a.suggestions.length >= 2);
});
await test('Savings leaks aggregate small frequent spends', async () => {
    const today = new Date('2026-09-11T00:00:00Z');
    const tx = [];
    for (let i = 0; i < 20; i++) tx.push({ amount: 120, type: 'EXPENSE', category: 'Tea & snacks', date: new Date(today.getTime() - i * 3 * 86400000).toISOString() });
    tx.push({ amount: 15000, type: 'EXPENSE', category: 'Rent', date: today.toISOString() });
    tx.push({ amount: 100, type: 'INCOME', category: 'Refund', date: today.toISOString() });
    const l = savingsLeaks(tx, { today });
    assert.equal(l.leaks.length, 1); assert.equal(l.leaks[0].count, 20); assert.equal(l.leaks[0].total, 2400); assert.ok(l.yearlyTotal > 9000);
});
await test('What-if paths and runway', async () => {
    const w = whatIf({ monthlyIncome: 0, monthlyExpenses: 30000, liquidCash: 90000, months: 6 });
    assert.equal(w.runsOutInMonth, 4); assert.equal(w.runwayMonths, 3);
    const g = whatIf({ monthlyIncome: 50000, monthlyExpenses: 30000, liquidCash: 10000, months: 3, incomeDeltaPct: 10 });
    assert.equal(g.monthlySurplus, 25000); assert.equal(g.endCash, 85000);
});
await test('Goal feasibility and required monthly', async () => {
    const f = goalFeasibility({ target: 120000, saved: 0, monthlyContribution: 5000, months: 12 });
    assert.equal(f.projected, 60000); assert.equal(f.requiredMonthly, 10000); assert.equal(f.onTrack, false); assert.equal(f.monthsToTargetAtCurrentPace, 24);
});
await test('Debt payoff: avalanche orders by rate, snowball by balance, and finishes', async () => {
    const loans = [{ name: 'Card', balance: 50000, ratePct: 36, minPayment: 2500 }, { name: 'Bike', balance: 30000, ratePct: 12, minPayment: 3000 }];
    const av = debtPayoff(loans, 5000, 'avalanche'); const sn = debtPayoff(loans, 5000, 'snowball');
    assert.deepEqual(av.order, ['Card', 'Bike']); assert.deepEqual(sn.order, ['Bike', 'Card']);
    assert.ok(av.months > 0 && av.months < 30); assert.ok(av.totalInterest <= sn.totalInterest);
});
await test('Action plan prioritises runway and debt; digest is plain language', async () => {
    const snap = { monthlyIncomePaise: 8000000, monthlyExpensePaise: 6000000, liquidCashPaise: 6000000, outstandingDebtPaise: 60000000, categoryMapPaise: { Rent: 2000000 }, transactionsCount: 5, netWorthPaise: 0, investmentValuationPaise: 0 };
    const plan = actionPlan(snap, { validity: { needsAction: 2 } });
    assert.equal(plan[0].id, 'runway'); assert.ok(plan.some(a => a.id === 'debt') && plan.some(a => a.id === 'validity'));
    const lines = weeklyDigest(snap, { validity: { next: { title: 'Passport', expiryDate: '2026-10-01' } } });
    assert.ok(lines.some(l => l.includes('Passport')));
});
await test('Assistant answers from the user\'s own numbers', async () => {
    const ctx = { monthlyIncome: 80000, monthlyExpenses: 40000, liquidCash: 400000, monthlyDebt: 0, loans: [], recurring: [], transactions: [], savingsGoals: [], snapshot: { outstandingDebtPaise: 0 } };
    assert.ok(answerQuestion('Can I afford 20,000 for a phone?', ctx).startsWith('Yes'));
    assert.ok(answerQuestion('can i afford 2 lakh', ctx).includes('stretch') || answerQuestion('can i afford 2 lakh', ctx).includes('wait'));
    assert.ok(answerQuestion('what is my runway', ctx).includes('10 months'));
    assert.ok(answerQuestion('help', ctx).includes('income'));
});
await test('Snapshot reads canonical stores and declared income', async () => {
    await saveData(STORAGE_KEYS.TRANSACTIONS, [{ amount: 5000, type: 'expense', category: 'Groceries', date: new Date().toISOString() }]);
    await saveData(STORAGE_KEYS.INCOME_SOURCES, [{ amount: 60000, frequency: 'monthly' }]);
    await saveData(STORAGE_KEYS.ACCOUNTS, [{ balance: 150000 }]);
    await saveData(STORAGE_KEYS.LOANS, [{ outstanding_amount: 20000, remainingAmount: 20000 }]);
    const ctx = await loadDecisionContext();
    assert.equal(ctx.monthlyExpenses, 5000); assert.equal(ctx.monthlyIncome, 60000); assert.equal(ctx.liquidCash, 150000); assert.equal(ctx.snapshot.outstandingDebtPaise, 2000000); assert.equal(ctx.hasIncomeData, true);
});
console.log(count + ' decision intelligence cases passed using fixture storage only.');
