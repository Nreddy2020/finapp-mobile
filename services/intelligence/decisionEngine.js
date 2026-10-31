/**
 * services/intelligence/decisionEngine.js
 *
 * Plain-language decision tools for everyday money choices. Every function here is
 * deterministic and works in any currency; amounts are in the user's currency units.
 * Nothing is fetched from the network and nothing is fabricated: if the app has no
 * data for a question, the answer says so.
 */
import { StorageService, STORAGE_KEYS } from '../storage.js';
import { FinlifeIntelligenceEngine } from './finlifeIntelligenceEngine.js';
import { money } from '../life/storeKit.js';

const r2 = n => Math.round(n * 100) / 100;
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

/** Standard loan instalment for `months` at `annualRatePct`. */
export function emi(principal, annualRatePct, months) {
    const p = num(principal), n = Math.max(1, Math.round(num(months, 1))), r = num(annualRatePct) / 1200;
    if (p <= 0) return 0;
    if (r === 0) return r2(p / n);
    return r2((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

/**
 * "Can I afford this?" Answers with a verdict and the reasons, using the emergency
 * buffer, debt-to-income and post-purchase runway the user would be left with.
 */
export function affordability({ price, monthlyIncome, monthlyExpenses, liquidCash, monthlyDebt = 0, emergencyMonths = 6, financing = null }) {
    const cost = money(price, 'price'), income = num(monthlyIncome), expenses = num(monthlyExpenses), cash = num(liquidCash), debt = num(monthlyDebt);
    const reasons = [];
    let upfront = cost, newEmi = 0;
    if (financing && num(financing.months) > 0) {
        upfront = Math.min(cost, num(financing.downPayment));
        newEmi = emi(cost - upfront, financing.annualRatePct, financing.months);
    }
    const cashAfter = cash - upfront;
    const burn = expenses + debt + newEmi;
    const runwayAfter = burn > 0 ? cashAfter / burn : (cashAfter > 0 ? 99 : 0);
    const surplus = income - expenses - debt;
    const surplusAfter = surplus - newEmi;
    const dtiAfter = income > 0 ? ((debt + newEmi) / income) * 100 : null;
    const requiredBuffer = (expenses + debt) * emergencyMonths;
    let verdict = 'comfortable';
    if (cashAfter < 0) { verdict = 'avoid'; reasons.push('You do not have the cash for the upfront amount.'); }
    if (runwayAfter < 3 && cashAfter >= 0) { verdict = verdict === 'avoid' ? 'avoid' : 'stretch'; reasons.push(`After paying, your cash covers only ${r2(runwayAfter)} months of living costs.`); }
    if (runwayAfter < 1) verdict = 'avoid';
    if (surplusAfter < 0) { verdict = 'avoid'; reasons.push('The monthly instalment would exceed what you have left after expenses.'); }
    else if (newEmi > 0 && surplusAfter < surplus * 0.5) { if (verdict === 'comfortable') verdict = 'stretch'; reasons.push('The instalment would eat more than half of your monthly surplus.'); }
    if (dtiAfter !== null && dtiAfter > 40) { verdict = verdict === 'comfortable' ? 'stretch' : verdict; reasons.push(`Debt payments would take ${Math.round(dtiAfter)}% of income (keep it under 40%).`); }
    if (cashAfter < requiredBuffer && cashAfter >= 0 && runwayAfter >= 3) { if (verdict === 'comfortable') verdict = 'stretch'; reasons.push(`It dips below your ${emergencyMonths}-month emergency buffer.`); }
    if (!reasons.length) reasons.push('Cash, emergency buffer and monthly surplus all stay healthy.');
    const monthsToSave = surplus > 0 && cashAfter < requiredBuffer ? Math.ceil((requiredBuffer - cashAfter) / surplus) : 0;
    return { verdict, reasons, upfront: r2(upfront), emi: newEmi, cashAfter: r2(cashAfter), runwayAfterMonths: r2(runwayAfter), surplusAfter: r2(surplusAfter), dtiAfterPercent: dtiAfter === null ? null : Math.round(dtiAfter), monthsToSaveBeforeBuying: monthsToSave, requiredBuffer: r2(requiredBuffer), costAsMonthsOfIncome: income > 0 ? r2(cost / income) : null };
}

const FREQ_PER_YEAR = { daily: 365, weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, 'half-yearly': 2, yearly: 1, once: 0 };
export function annualize(amount, frequency) { const f = String(frequency || 'monthly').toLowerCase().replace('_', '-'); return r2(num(amount) * (FREQ_PER_YEAR[f] ?? 12)); }

/** Finds money quietly leaving through subscriptions the user rarely uses. */
export function subscriptionAudit(items) {
    const rows = (items || []).map(i => ({ name: i.name || i.title || 'Subscription', amount: num(i.amount), frequency: i.frequency || 'monthly', usage: i.usage || null, annual: annualize(i.amount, i.frequency) }));
    const total = r2(rows.reduce((s, r) => s + r.annual, 0));
    const lowUsage = rows.filter(r => ['rarely', 'never'].includes(String(r.usage || '').toLowerCase()));
    const waste = r2(lowUsage.reduce((s, r) => s + r.annual, 0));
    const suggestions = [];
    if (lowUsage.length) suggestions.push(`Cancel or pause ${lowUsage.map(r => r.name).join(', ')} to keep ${waste} a year.`);
    const dupes = rows.filter((r, i) => rows.findIndex(o => o.name.toLowerCase().split(' ')[0] === r.name.toLowerCase().split(' ')[0]) !== i);
    if (dupes.length) suggestions.push('You may be paying twice for similar services; check for overlapping plans.');
    const yearlySwitch = rows.filter(r => String(r.frequency).toLowerCase() === 'monthly' && r.annual >= 1000);
    if (yearlySwitch.length) suggestions.push('Monthly plans usually cost 15-20% more than annual ones for services you keep.');
    return { items: rows.sort((a, b) => b.annual - a.annual), annualTotal: total, monthlyTotal: r2(total / 12), lowUsage, wastePerYear: waste, suggestions };
}

/** Small, frequent expenses that add up. Works on the app's transaction list. */
export function savingsLeaks(transactions, { days = 90, smallAmount = 500, today = new Date() } = {}) {
    const since = new Date(today.getTime() - days * 86400000);
    const groups = {};
    let considered = 0;
    for (const tx of transactions || []) {
        const amount = Math.abs(num(tx.amount ?? (tx.amountPaise ? tx.amountPaise / 100 : 0)));
        const type = String(tx.type || 'EXPENSE').toUpperCase();
        if (type === 'INCOME' || amount <= 0 || amount > smallAmount) continue;
        const date = new Date(tx.date || tx.createdAt || today);
        if (Number.isNaN(date.getTime()) || date < since) continue;
        considered++;
        const key = String(tx.merchant || tx.description || tx.category || 'Other').trim().toLowerCase().slice(0, 40) || 'other';
        groups[key] = groups[key] || { name: tx.merchant || tx.description || tx.category || 'Other', count: 0, total: 0 };
        groups[key].count++; groups[key].total += amount;
    }
    const months = Math.max(1, days / 30.4375);
    const leaks = Object.values(groups).filter(g => g.count >= 3).map(g => ({ ...g, total: r2(g.total), monthly: r2(g.total / months), yearly: r2((g.total / months) * 12), average: r2(g.total / g.count) })).sort((a, b) => b.total - a.total).slice(0, 8);
    return { days, considered, leaks, monthlyTotal: r2(leaks.reduce((s, l) => s + l.monthly, 0)), yearlyTotal: r2(leaks.reduce((s, l) => s + l.yearly, 0)) };
}

/** Month-by-month path of cash and net worth under a change in income, expenses or a one-time shock. */
export function whatIf({ monthlyIncome, monthlyExpenses, liquidCash, netWorth = null, incomeDeltaPct = 0, expenseDeltaPct = 0, oneTimeShock = 0, months = 12, annualReturnPct = 0 }) {
    const income = num(monthlyIncome) * (1 + num(incomeDeltaPct) / 100);
    const expenses = num(monthlyExpenses) * (1 + num(expenseDeltaPct) / 100);
    let cash = num(liquidCash) - num(oneTimeShock);
    let worth = (netWorth === null ? num(liquidCash) : num(netWorth)) - num(oneTimeShock);
    const r = num(annualReturnPct) / 1200;
    const path = [];
    let runOut = null;
    for (let m = 1; m <= Math.max(1, Math.min(120, num(months, 12))); m++) {
        cash += income - expenses;
        worth = worth * (1 + r) + (income - expenses);
        if (cash < 0 && runOut === null) runOut = m;
        path.push({ month: m, cash: r2(cash), netWorth: r2(worth) });
    }
    const monthlySurplus = r2(income - expenses);
    return { monthlyIncome: r2(income), monthlyExpenses: r2(expenses), monthlySurplus, runsOutInMonth: runOut, runwayMonths: expenses > income ? r2(Math.max(0, num(liquidCash) - num(oneTimeShock)) / (expenses - income)) : null, path, endCash: path[path.length - 1].cash, endNetWorth: path[path.length - 1].netWorth };
}

export function goalFeasibility({ target, saved = 0, monthlyContribution = 0, months, annualReturnPct = 0 }) {
    const t = money(target, 'target'), s = num(saved), c = num(monthlyContribution), n = Math.max(1, Math.round(num(months, 1))), r = num(annualReturnPct) / 1200;
    const growth = r === 0 ? 1 : Math.pow(1 + r, n);
    const projected = r2(s * growth + (r === 0 ? c * n : c * ((growth - 1) / r)));
    const required = r === 0 ? Math.max(0, (t - s) / n) : Math.max(0, (t - s * growth) / ((growth - 1) / r));
    return { target: t, projected, shortfall: r2(Math.max(0, t - projected)), requiredMonthly: r2(required), onTrack: projected >= t, monthsToTargetAtCurrentPace: c > 0 || s >= t ? (s >= t ? 0 : (r === 0 ? Math.ceil((t - s) / c) : Math.ceil(Math.log((t * r + c) / (s * r + c)) / Math.log(1 + r)))) : null };
}

/** Debt payoff plan: avalanche (highest rate first) or snowball (smallest balance first). */
export function debtPayoff(loans, extraMonthly = 0, strategy = 'avalanche') {
    const rows = (loans || []).map(l => ({ name: l.name || 'Loan', balance: num(l.balance ?? l.outstanding_amount ?? l.remainingAmount ?? l.principal), rate: num(l.ratePct ?? l.interest_rate ?? l.rate), minPayment: num(l.minPayment ?? l.emi ?? l.amount) })).filter(l => l.balance > 0);
    if (!rows.length) return { months: 0, totalInterest: 0, order: [], schedule: [] };
    const order = [...rows].sort((a, b) => (strategy === 'snowball' ? a.balance - b.balance : b.rate - a.rate)).map(l => l.name);
    const state = rows.map(l => ({ ...l, paidOffMonth: null }));
    let month = 0, totalInterest = 0; const schedule = [];
    while (state.some(l => l.balance > 0.005) && month < 600) {
        month++;
        let extra = num(extraMonthly);
        for (const l of state) { if (l.balance <= 0) continue; const interest = l.balance * (l.rate / 1200); totalInterest += interest; l.balance += interest; const pay = Math.min(l.balance, Math.max(l.minPayment, l.balance > 0 ? Math.min(l.minPayment, l.balance) : 0) || l.balance); l.balance -= pay; }
        for (const name of order) { const l = state.find(x => x.name === name); if (!l || l.balance <= 0 || extra <= 0) continue; const pay = Math.min(extra, l.balance); l.balance -= pay; extra -= pay; }
        for (const l of state) if (l.balance <= 0.005 && l.paidOffMonth === null) { l.balance = 0; l.paidOffMonth = month; }
        if (month <= 120) schedule.push({ month, remaining: r2(state.reduce((s, l) => s + l.balance, 0)) });
        if (state.every(l => l.minPayment <= 0) && num(extraMonthly) <= 0) break;
    }
    return { strategy, months: month, totalInterest: r2(totalInterest), order, payoffMonths: state.map(l => ({ name: l.name, month: l.paidOffMonth })), schedule };
}

/** Prioritised, plain-language action plan from the financial snapshot. */
export function actionPlan(snapshot, extras = {}) {
    const income = snapshot.monthlyIncomePaise / 100, expenses = snapshot.monthlyExpensePaise / 100, cash = snapshot.liquidCashPaise / 100, debt = snapshot.outstandingDebtPaise / 100;
    const runway = expenses > 0 ? cash / expenses : null;
    const savingsRate = income > 0 ? (income - expenses) / income : null;
    const actions = [];
    if (runway !== null && runway < 3) actions.push({ id: 'runway', priority: 1, title: 'Build a 3-month cushion first', why: `Cash covers ${r2(runway)} months of expenses. Aim for ${r2(expenses * 3)} before anything optional.`, route: '/(tabs)/emergency' });
    if (debt > 0 && income > 0 && debt / (income * 12) > 0.4) actions.push({ id: 'debt', priority: 1, title: 'Attack high-interest debt', why: 'Debt is over 40% of yearly income. Pay the costliest loan first and avoid new credit.', route: '/(tabs)/loans' });
    if (savingsRate !== null && savingsRate < 0.1) actions.push({ id: 'savings', priority: 2, title: 'Move savings to the start of the month', why: 'Less than 10% of income is saved. Automate a transfer on payday, even a small one.', route: '/(tabs)/budgets' });
    if (extras.validity?.needsAction) actions.push({ id: 'validity', priority: 2, title: `${extras.validity.needsAction} document${extras.validity.needsAction === 1 ? '' : 's'} need renewal`, why: 'Lapsed insurance or licences turn small fees into big losses.', route: '/(tabs)/validity' });
    if (extras.subscriptions?.wastePerYear > 0) actions.push({ id: 'subs', priority: 3, title: 'Cut unused subscriptions', why: `Rarely-used plans cost ${extras.subscriptions.wastePerYear} a year.`, route: '/(tabs)/recurring' });
    if (runway !== null && runway > 9 && cash > 0) actions.push({ id: 'idle', priority: 3, title: 'Put idle cash to work', why: `${r2(runway)} months of cash is more than needed; move the excess beyond 6 months into safer growth options.`, route: '/(tabs)/investments' });
    if (extras.goals?.behind > 0) actions.push({ id: 'goals', priority: 3, title: `${extras.goals.behind} goal${extras.goals.behind === 1 ? ' is' : 's are'} behind pace`, why: 'Small monthly top-ups now avoid a scramble later.', route: '/(tabs)/todos' });
    if (extras.tax?.unusedDeductions > 0) actions.push({ id: 'tax', priority: 3, title: 'Use your remaining tax deductions', why: `About ${extras.tax.unusedDeductions} of deductions are still unused this year.`, route: '/(tabs)/tax' });
    if (!actions.length) actions.push({ id: 'steady', priority: 4, title: 'You are in good shape', why: 'Keep the buffer, keep investing, and review this plan monthly.', route: '/(tabs)/insights' });
    return actions.sort((a, b) => a.priority - b.priority);
}

/** Short weekly digest in plain statements. */
export function weeklyDigest(snapshot, extras = {}) {
    const income = snapshot.monthlyIncomePaise / 100, expenses = snapshot.monthlyExpensePaise / 100, cash = snapshot.liquidCashPaise / 100;
    const lines = [];
    lines.push(snapshot.transactionsCount ? `Spending in the last 30 days: ${r2(expenses)} against income ${r2(income)}.` : 'No transactions recorded yet. Add a few and this digest gets specific.');
    if (expenses > 0) lines.push(`Your cash would last ${r2(cash / expenses)} months if income stopped today.`);
    const top = Object.entries(snapshot.categoryMapPaise || {}).sort((a, b) => b[1] - a[1])[0];
    if (top) lines.push(`Biggest spending category: ${top[0]} (${r2(top[1] / 100)}).`);
    if (extras.validity?.next) lines.push(`Next expiry: ${extras.validity.next.title} on ${extras.validity.next.expiryDate}.`);
    if (extras.tasks) lines.push(`${extras.tasks.overdue} overdue and ${extras.tasks.dueToday} due today in Tasks.`);
    if (extras.goals?.total) lines.push(`${extras.goals.total} active goals, ${extras.goals.onTrack} on track.`);
    return lines;
}

/** Loads everything the decision tools need from the app's own stores. Never throws; missing stores read as empty. */
export async function loadDecisionContext() {
    const safe = async (key, fallback) => { try { const v = await StorageService.load(key, fallback); return v ?? fallback; } catch { return fallback; } };
    const snapshot = await FinlifeIntelligenceEngine.loadFinancialSnapshot();
    const [transactions, recurring, loans, emis, savingsGoals] = await Promise.all([
        safe(STORAGE_KEYS.TRANSACTIONS, []), safe(STORAGE_KEYS.RECURRING_PAYMENTS, []), safe(STORAGE_KEYS.LOANS, []), safe(STORAGE_KEYS.EMIS, []), safe(STORAGE_KEYS.SAVINGS, [])
    ]);
    const monthlyDebt = (Array.isArray(emis) ? emis : []).reduce((s, e) => s + num(e.amount), 0);
    return {
        snapshot,
        monthlyIncome: snapshot.monthlyIncomePaise / 100,
        monthlyExpenses: snapshot.monthlyExpensePaise / 100,
        liquidCash: snapshot.liquidCashPaise / 100,
        netWorth: snapshot.netWorthPaise / 100,
        monthlyDebt: r2(monthlyDebt),
        transactions: Array.isArray(transactions) ? transactions : [],
        recurring: Array.isArray(recurring) ? recurring : [],
        loans: Array.isArray(loans) ? loans : [],
        emis: Array.isArray(emis) ? emis : [],
        savingsGoals: Array.isArray(savingsGoals) ? savingsGoals : [],
        hasIncomeData: snapshot.hasIncomeData !== false
    };
}

/** Rule-based assistant answering common money questions from the user's own numbers. */
export function answerQuestion(query, ctx) {
    const q = String(query || '').toLowerCase();
    const f = n => r2(n).toLocaleString();
    if (!ctx) return 'I am still loading your numbers. Ask again in a moment.';
    const amountMatch = q.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|l|lakh|lac|cr|crore|m)?/);
    const parseAmount = () => { if (!amountMatch) return null; let v = Number(amountMatch[1].replace(/,/g, '')); const u = amountMatch[2]; if (u === 'k') v *= 1e3; if (u === 'l' || u === 'lakh' || u === 'lac') v *= 1e5; if (u === 'cr' || u === 'crore') v *= 1e7; if (u === 'm') v *= 1e6; return v; };
    if (/afford|buy|purchase|should i (get|spend)/.test(q)) {
        const price = parseAmount();
        if (!price) return 'Tell me the price, for example "Can I afford 45,000 for a phone?"';
        const a = affordability({ price, monthlyIncome: ctx.monthlyIncome, monthlyExpenses: ctx.monthlyExpenses, liquidCash: ctx.liquidCash, monthlyDebt: ctx.monthlyDebt });
        const head = a.verdict === 'comfortable' ? 'Yes, comfortably.' : a.verdict === 'stretch' ? 'Possible, but it is a stretch.' : 'I would wait.';
        return `${head} ${a.reasons.join(' ')}${a.monthsToSaveBeforeBuying ? ` Saving for about ${a.monthsToSaveBeforeBuying} more months would make it comfortable.` : ''}`;
    }
    if (/runway|emergency|buffer|lose my job|job loss/.test(q)) {
        const months = ctx.monthlyExpenses > 0 ? ctx.liquidCash / ctx.monthlyExpenses : null;
        return months === null ? 'Add some expenses first so I can measure your runway.' : `Your cash of ${f(ctx.liquidCash)} covers ${r2(months)} months of expenses. ${months < 3 ? 'Build this to at least 3 months before optional spending.' : months < 6 ? 'Good start; 6 months is the comfortable target.' : 'That is a strong cushion.'}`;
    }
    if (/debt|loan|emi|borrow/.test(q)) {
        const debt = ctx.snapshot.outstandingDebtPaise / 100;
        if (debt <= 0 && !ctx.loans.length) return 'You have no recorded debt. Keep it that way and put freed cash into your goals.';
        const plan = debtPayoff(ctx.loans, 0, 'avalanche');
        return `You owe about ${f(debt)}. Paying the highest-rate loan first (${plan.order[0] || 'your costliest loan'}) saves the most interest. Add any extra amount to it before investing elsewhere.`;
    }
    if (/save|saving rate|how much should i save/.test(q)) {
        const rate = ctx.monthlyIncome > 0 ? ((ctx.monthlyIncome - ctx.monthlyExpenses) / ctx.monthlyIncome) * 100 : null;
        return rate === null ? 'Record your income so I can compute a savings rate.' : `You save about ${Math.round(rate)}% of income. ${rate < 10 ? 'Start with an automatic 10% transfer on payday.' : rate < 20 ? 'Try nudging it to 20% by trimming one category.' : 'Excellent; direct the surplus to goals and investments.'}`;
    }
    if (/subscription|recurring|leak/.test(q)) {
        const audit = subscriptionAudit(ctx.recurring);
        const leaks = savingsLeaks(ctx.transactions);
        return `Recurring payments cost about ${f(audit.annualTotal)} a year. ${audit.suggestions[0] || ''} Small frequent spends add another ${f(leaks.yearlyTotal)} a year${leaks.leaks[0] ? `, led by ${leaks.leaks[0].name}` : ''}.`;
    }
    if (/invest|sip|wealth|stock|mutual/.test(q)) {
        const surplus = ctx.monthlyIncome - ctx.monthlyExpenses - ctx.monthlyDebt;
        return surplus > 0 ? `You have about ${f(surplus)} a month free. A steady monthly investment of even half of it, kept for 10 years, matters more than picking the perfect fund. Check Markets for the SIP calculator.` : 'There is no monthly surplus right now, so fix cashflow before investing.';
    }
    if (/tax/.test(q)) return 'Open the Tax module: it compares both regimes on your numbers, shows unused deductions and the advance-tax dates.';
    if (/goal/.test(q)) return `You have ${ctx.savingsGoals.length} savings goals recorded. Use Tasks & Goals to attach milestones and see the monthly amount each one needs.`;
    return `Here is where you stand: income ${f(ctx.monthlyIncome)}, spending ${f(ctx.monthlyExpenses)}, cash ${f(ctx.liquidCash)}. Ask me "can I afford 20,000", "my runway", "my debt", "subscriptions" or "how much should I save".`;
}
