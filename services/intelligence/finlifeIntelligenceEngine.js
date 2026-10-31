/**
 * services/intelligence/finlifeIntelligenceEngine.js
 * 
 * FinLife Canonical Decision Intelligence & Predictive Insights Engine.
 * 
 * Functions:
 * 1. Aggregates real data across Cashbook, Money Flow, Investments, Assets, Loans, P2P.
 * 2. Computes algorithmic Spending DNA (Saver, Builder, Balanced, Lifestyle, Consolidator).
 * 3. Projects 5-Year Compound Net Worth based on real cashflow and savings rate.
 * 4. Generates data-driven financial alerts (Runway, Burn Rate, Spikes, Idle Cash).
 * 5. Computes a multi-pillar Financial Health Score (0 - 100).
 */

import { StorageService, STORAGE_KEYS } from '../storage.js';

export const SPENDING_PERSONAS = {
    WEALTH_BUILDER: {
        id: 'WEALTH_BUILDER',
        title: 'Wealth Builder 🚀',
        desc: 'Over 30% of your net cashflow is deployed into wealth-generating assets.',
        color: '#10B981',
        advice: 'Maintain asset allocation balance across equities, fixed income, and real estate.'
    },
    FRUGAL_SAVER: {
        id: 'FRUGAL_SAVER',
        title: 'Disciplined Saver 🛡️',
        desc: 'You save over 40% of your incoming cashflow with low discretionary burn.',
        color: '#3B82F6',
        advice: 'Consider deploying idle cash from low-yield savings accounts into inflation-beating investments.'
    },
    BALANCED_STRATEGIST: {
        id: 'BALANCED_STRATEGIST',
        title: 'Balanced Strategist ⚖️',
        desc: 'Your cashflow closely follows healthy 50/30/20 budgeting proportions.',
        color: '#8B5CF6',
        advice: 'Continue tracking recurring commitments and optimize tax deductions under Section 80C.'
    },
    LIFESTYLE_SPENDER: {
        id: 'LIFESTYLE_SPENDER',
        title: 'Lifestyle Spender 🛍️',
        desc: 'Discretionary spending (Dining, Entertainment, Shopping) exceeds 35% of income.',
        color: '#F59E0B',
        advice: 'Automate a fixed savings transfer on payday before discretionary spending occurs.'
    },
    DEBT_CONSOLIDATOR: {
        id: 'DEBT_CONSOLIDATOR',
        title: 'Debt Consolidator ⚠️',
        desc: 'Debt obligations and EMIs consume more than 35% of your incoming monthly income.',
        color: '#EF4444',
        advice: 'Prioritize high-interest loans using the debt avalanche or snowball repayment strategy.'
    }
};

export class FinlifeIntelligenceEngine {
    /**
     * Loads and normalizes all canonical financial records.
     */
    static async loadFinancialSnapshot() {
        // Canonical stores first (STORAGE_KEYS), legacy keys kept as additive fallbacks.
        const safe = async (key, fallback) => { try { const v = await StorageService.load(key, fallback); return v ?? fallback; } catch { return fallback; } };
        const merge = (...lists) => lists.flatMap(l => (Array.isArray(l) ? l : []));
        const [
            legacyCashAccounts, bankAccounts, cashbooks,
            canonicalTransactions, legacyTransactions,
            canonicalInvestments, legacyInvestments,
            canonicalAssets, legacyAssets,
            p2pRecords,
            canonicalLoans, legacyLoans, emis,
            recurringPayments, incomeSources
        ] = await Promise.all([
            safe('finlife_cashbook_accounts_v2', []), safe(STORAGE_KEYS.ACCOUNTS, []), safe(STORAGE_KEYS.CASHBOOKS, []),
            safe(STORAGE_KEYS.TRANSACTIONS, []), safe('transactions', []),
            safe(STORAGE_KEYS.INVESTMENTS, []), safe('investments', []),
            safe(STORAGE_KEYS.ASSETS, []), safe('assets', []),
            safe('p2p_records', []),
            safe(STORAGE_KEYS.LOANS, []), safe('loans', []), safe(STORAGE_KEYS.EMIS, []),
            safe(STORAGE_KEYS.RECURRING_PAYMENTS, []), safe(STORAGE_KEYS.INCOME_SOURCES, [])
        ]);
        const cashbookAccounts = merge(legacyCashAccounts, bankAccounts, cashbooks);
        const transactions = merge(canonicalTransactions, legacyTransactions);
        const investments = merge(canonicalInvestments, legacyInvestments);
        const assets = merge(canonicalAssets, legacyAssets);
        const loans = merge(canonicalLoans, legacyLoans, (Array.isArray(emis) ? emis : []).map(e => ({ remainingAmount: e.outstanding ?? e.outstanding_amount ?? 0 })));
        const recurring = recurringPayments;

        // 1. Calculate liquid cash in accounts
        let liquidCashPaise = 0;
        if (Array.isArray(cashbookAccounts)) {
            for (const acc of cashbookAccounts) {
                liquidCashPaise += Math.round(Number(acc.balancePaise || (acc.balance * 100) || 0));
            }
        }

        // 2. Calculate investment portfolio value
        let investmentValuationPaise = 0;
        if (Array.isArray(investments)) {
            for (const inv of investments) {
                const val = Number(inv.currentValuation || inv.currentValue || inv.investedAmount || 0);
                investmentValuationPaise += Math.round(val * 100);
            }
        }

        // 3. Calculate physical / property assets value
        let physicalAssetsPaise = 0;
        if (Array.isArray(assets)) {
            for (const a of assets) {
                const val = Number(a.estimatedValue || a.currentValue || a.value || 0);
                physicalAssetsPaise += Math.round(val * 100);
            }
        }

        // 4. Calculate P2P Net balance (Receivables - Payables)
        let p2pReceivablesPaise = 0;
        let p2pPayablesPaise = 0;
        if (Array.isArray(p2pRecords)) {
            for (const r of p2pRecords) {
                const bal = Math.round(Number(r.principalPaise || (r.principal * 100) || 0));
                if (r.type === 'GIVEN' || r.type === 'LENT') {
                    p2pReceivablesPaise += bal;
                } else if (r.type === 'TAKEN' || r.type === 'BORROWED') {
                    p2pPayablesPaise += bal;
                }
            }
        }

        // 5. Calculate outstanding loans
        let outstandingDebtPaise = 0;
        if (Array.isArray(loans)) {
            for (const l of loans) {
                const remaining = Number(l.remainingAmount || l.principal || 0);
                outstandingDebtPaise += Math.round(remaining * 100);
            }
        }
        outstandingDebtPaise += p2pPayablesPaise;

        // 6. Net Worth Calculation
        const totalAssetsPaise = liquidCashPaise + investmentValuationPaise + physicalAssetsPaise + p2pReceivablesPaise;
        const netWorthPaise = totalAssetsPaise - outstandingDebtPaise;

        // 7. Monthly Cashflow & Category Breakdown
        let monthlyIncomePaise = 0;
        let monthlyExpensePaise = 0;
        const categoryMapPaise = {};

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        if (Array.isArray(transactions)) {
            for (const tx of transactions) {
                const txDate = new Date(tx.date || tx.createdAt || now);
                const isRecent = txDate >= thirtyDaysAgo;
                const amtPaise = Math.abs(Math.round(Number(tx.amountPaise || (tx.amount * 100) || 0)));

                if (String(tx.type || '').toUpperCase() === 'INCOME') {
                    if (isRecent) monthlyIncomePaise += amtPaise;
                } else if (String(tx.type || 'EXPENSE').toUpperCase() === 'EXPENSE') {
                    if (isRecent) monthlyExpensePaise += amtPaise;
                    const cat = (tx.category || 'Other').trim();
                    categoryMapPaise[cat] = (categoryMapPaise[cat] || 0) + amtPaise;
                }
            }
        }

        // Declared income sources are the honest fallback when no income transactions exist.
        let hasIncomeData = monthlyIncomePaise > 0;
        if (monthlyIncomePaise === 0 && Array.isArray(incomeSources) && incomeSources.length) {
            const perMonth = { daily: 30, weekly: 4.33, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12, annual: 1 / 12 };
            for (const src of incomeSources) {
                const factor = perMonth[String(src.frequency || 'monthly').toLowerCase()] ?? 1;
                monthlyIncomePaise += Math.round(Number(src.amount || 0) * factor * 100);
            }
            hasIncomeData = monthlyIncomePaise > 0;
        }

        return {
            liquidCashPaise,
            investmentValuationPaise,
            physicalAssetsPaise,
            p2pReceivablesPaise,
            p2pPayablesPaise,
            outstandingDebtPaise,
            totalAssetsPaise,
            netWorthPaise,
            monthlyIncomePaise,
            monthlyExpensePaise,
            categoryMapPaise,
            hasIncomeData,
            transactionsCount: Array.isArray(transactions) ? transactions.length : 0,
            recurringCommitmentsCount: Array.isArray(recurring) ? recurring.length : 0
        };
    }

    /**
     * Determines the user's spending DNA based on empirical cashflow.
     */
    static computeSpendingDNA(snapshot) {
        const { monthlyIncomePaise, monthlyExpensePaise, categoryMapPaise, outstandingDebtPaise, investmentValuationPaise } = snapshot;

        const income = monthlyIncomePaise > 0 ? monthlyIncomePaise : 1;
        const savingsRate = Math.max(0, (income - monthlyExpensePaise) / income);
        const debtRatio = outstandingDebtPaise / (income * 12);

        // Discretionary categories: Food/Dining, Entertainment, Shopping, Travel
        let discretionarySpendPaise = 0;
        const discretionaryKeywords = ['food', 'dining', 'swiggy', 'zomato', 'restaurant', 'shopping', 'entertainment', 'movie', 'travel', 'luxury'];

        for (const [cat, amt] of Object.entries(categoryMapPaise)) {
            const lower = cat.toLowerCase();
            if (discretionaryKeywords.some(kw => lower.includes(kw))) {
                discretionarySpendPaise += amt;
            }
        }

        const discretionaryRatio = monthlyExpensePaise > 0 ? discretionarySpendPaise / monthlyExpensePaise : 0;

        if (debtRatio > 0.4) {
            return SPENDING_PERSONAS.DEBT_CONSOLIDATOR;
        }
        if (discretionaryRatio > 0.35) {
            return SPENDING_PERSONAS.LIFESTYLE_SPENDER;
        }
        if (investmentValuationPaise > income * 6 || savingsRate > 0.35) {
            return SPENDING_PERSONAS.WEALTH_BUILDER;
        }
        if (savingsRate > 0.4) {
            return SPENDING_PERSONAS.FRUGAL_SAVER;
        }
        return SPENDING_PERSONAS.BALANCED_STRATEGIST;
    }

    /**
     * Projects 5-year wealth accumulation compounding trajectory.
     */
    static computeWealthForecast(snapshot, expectedAnnualReturnPct = 12) {
        const currentNetWorth = Math.max(0, snapshot.netWorthPaise / 100);
        const annualSavings = Math.max(0, (snapshot.monthlyIncomePaise - snapshot.monthlyExpensePaise) * 12 / 100);

        const currentYear = new Date().getFullYear();
        const r = expectedAnnualReturnPct / 100;
        const forecast = [];

        let runningWealth = currentNetWorth;

        for (let i = 0; i <= 5; i++) {
            forecast.push({
                year: currentYear + i,
                value: Math.round(runningWealth),
                formattedValue: `₹${(runningWealth / 100000).toFixed(2)}L`,
                annualSavingsContrib: Math.round(annualSavings * i)
            });
            runningWealth = (runningWealth + annualSavings) * (1 + r);
        }

        return forecast;
    }

    /**
     * Generates actionable algorithmic intelligence tips.
     */
    static generateIntelligenceAlerts(snapshot) {
        const tips = [];
        const monthlyBurn = snapshot.monthlyExpensePaise / 100;
        const liquidCash = snapshot.liquidCashPaise / 100;

        // 1. Emergency Runway Check
        const runwayMonths = monthlyBurn > 0 ? (liquidCash / monthlyBurn).toFixed(1) : 12;
        if (runwayMonths < 3) {
            tips.push({
                id: 'RUNWAY_CRITICAL',
                type: 'alert',
                title: 'Low Emergency Buffer',
                msg: `Liquid reserves cover only ${runwayMonths} months of expenses. Target at least 6 months (₹${((monthlyBurn * 6) / 1000).toFixed(0)}k).`,
                color: '#EF4444'
            });
        } else if (runwayMonths > 9) {
            tips.push({
                id: 'IDLE_CASH_OPPORTUNITY',
                type: 'opportunity',
                title: 'High Idle Cash Reserves',
                msg: `You have ${runwayMonths} months of cash in checking/savings. Consider moving excess to liquid funds or short-term FDs for ~7% yields.`,
                color: '#10B981'
            });
        }

        // 2. Category Spikes
        let highestCat = 'General';
        let highestSpend = 0;
        for (const [cat, amt] of Object.entries(snapshot.categoryMapPaise)) {
            if (amt > highestSpend) {
                highestSpend = amt;
                highestCat = cat;
            }
        }
        if (highestSpend > 0 && snapshot.monthlyExpensePaise > 0) {
            const pct = Math.round((highestSpend / snapshot.monthlyExpensePaise) * 100);
            if (pct >= 30) {
                tips.push({
                    id: 'CATEGORY_CONCENTRATION',
                    type: 'alert',
                    title: `${highestCat} Spike`,
                    msg: `${highestCat} represents ${pct}% of your total spending this month (₹${(highestSpend / 100).toLocaleString('en-IN')}).`,
                    color: '#F59E0B'
                });
            }
        }

        // 3. Investment Habit
        const invRatio = snapshot.monthlyIncomePaise > 0 ? (snapshot.investmentValuationPaise / snapshot.monthlyIncomePaise) : 0;
        if (invRatio > 5) {
            tips.push({
                id: 'INVESTMENT_STRENGTH',
                type: 'tip',
                title: 'Compounding In Effect',
                msg: 'Your investment assets exceed 5x your monthly income. Dividend & capital appreciation are outpacing inflation.',
                color: '#8B5CF6'
            });
        } else {
            tips.push({
                id: 'SIP_RECOMMENDATION',
                type: 'tip',
                title: 'Systematic Investment Plan',
                msg: 'Automating a monthly SIP of ₹5,000 in broad-market index funds can add ₹4.1L to your wealth over 5 years.',
                color: '#3B82F6'
            });
        }

        return tips;
    }

    /**
     * Calculates the composite Financial Health Score (0 - 100).
     */
    static computeHealthScore(snapshot) {
        let score = 50; // Baseline

        // 1. Savings Rate (+20 max)
        const income = snapshot.monthlyIncomePaise;
        const expenses = snapshot.monthlyExpensePaise;
        if (income > 0) {
            const savingsRatio = Math.max(0, (income - expenses) / income);
            if (savingsRatio >= 0.4) score += 20;
            else if (savingsRatio >= 0.2) score += 12;
            else if (savingsRatio >= 0.1) score += 5;
            else score -= 10;
        }

        // 2. Emergency Runway (+15 max)
        const monthlyBurn = expenses / 100;
        const liquid = snapshot.liquidCashPaise / 100;
        const runway = monthlyBurn > 0 ? liquid / monthlyBurn : 6;
        if (runway >= 6) score += 15;
        else if (runway >= 3) score += 8;
        else score -= 15;

        // 3. Debt Burden (+15 max)
        const debt = snapshot.outstandingDebtPaise / 100;
        const annualIncome = (income * 12) / 100;
        const debtToIncome = annualIncome > 0 ? debt / annualIncome : 0;
        if (debtToIncome === 0) score += 15;
        else if (debtToIncome < 0.2) score += 10;
        else if (debtToIncome < 0.4) score += 0;
        else score -= 15;

        return Math.max(10, Math.min(99, Math.round(score)));
    }
}
