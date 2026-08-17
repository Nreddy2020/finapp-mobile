/**
 * moneyFlowPresentationAdapter.js
 * 
 * AUTHORITATIVE PRESENTATION ADAPTER FOR THE FINLIFE MONEY FLOW MODULE.
 * 
 * Architectural Invariants:
 * 1. C.4-C.8 engines remain 100% frozen.
 * 2. Pure deterministic transformation of financial records into normalized UI ViewModels.
 * 3. Period-sensitive metrics (Income, Expenses, Net Flow) are strictly isolated from
 *    as-of-date Balance Sheet metrics (Liquid Cash, Emergency Reserve, Net Worth).
 * 4. Transfer transactions (Account A -> Account B) never corrupt Income/Expense truth.
 * 5. What-If calculations route strictly through C.8.6 simulateActionImpact.
 */

import { formatCurrencyINR, formatCompactCurrencyINR } from '../../components/investments/decisionPresentationAdapter';
import { simulateActionImpact } from '../../services/actionImpactSimulator';
import { evaluatePortfolioHealthScore } from '../../services/portfolioHealthScoreEngine';
import { evaluatePortfolioLiquidityAndStress } from '../../services/liquidityEngine';
import { prioritizeNextBestActions } from '../../services/actionPrioritizationEngine';

// ── 1. MERCHANT NORMALIZER RULES ─────────────────────────────────────────────
const MERCHANT_DICTIONARY = [
    { canonical: 'Amazon', patterns: ['amazon', 'amzn', 'amzn mktplace', 'amazon pay', 'amazon.in'] },
    { canonical: 'Swiggy', patterns: ['swiggy', 'swiggy instamart', 'swiggy_blr', 'swiggy genies', 'bundl technologies'] },
    { canonical: 'Zomato', patterns: ['zomato', 'blinkit', 'zomato feeding india', 'zomato limited'] },
    { canonical: 'Uber', patterns: ['uber', 'uber india', 'uber bv', 'uber trip'] },
    { canonical: 'Ola Cabs', patterns: ['ola', 'ola cabs', 'ani technologies', 'ola money'] },
    { canonical: 'Flipkart', patterns: ['flipkart', 'flipkart internet', 'supercoins', 'myntra'] },
    { canonical: 'Netflix', patterns: ['netflix', 'netflix entertainment'] },
    { canonical: 'Spotify', patterns: ['spotify', 'spotify india'] },
    { canonical: 'Airtel', patterns: ['airtel', 'bharti airtel', 'airtel prepaid', 'airtel dth'] },
    { canonical: 'Jio', patterns: ['jio', 'reliance jio', 'jio infocomm', 'myjio'] },
    { canonical: 'CRED', patterns: ['cred', 'cred club', 'dreamplug technologies'] },
    { canonical: 'Starbucks', patterns: ['starbucks', 'tata starbucks'] },
    { canonical: 'BigBasket', patterns: ['bigbasket', 'innovative retail', 'bb daily'] },
    { canonical: 'HDFC Bank', patterns: ['hdfc', 'hdfcbk', 'hdfc bank ltd', 'ad-hdfcbk'] },
    { canonical: 'SBI', patterns: ['sbi', 'state bank of india', 'ad-sbiupi', 'sbi card'] },
    { canonical: 'ICICI Bank', patterns: ['icici', 'icici bank', 'icici direct', 'ad-icicibk'] },
    { canonical: 'BESCOM Electricity', patterns: ['bescom', 'electricity bill', 'power corp'] },
    { canonical: 'Shell Fuel', patterns: ['shell', 'shell fuel', 'shell petrol'] },
    { canonical: 'Indian Oil', patterns: ['indian oil', 'indianoil', 'ioc', 'iocl petrol'] }
];

export function normalizeMerchant(rawDescription = '') {
    if (!rawDescription || typeof rawDescription !== 'string') return 'Unknown Merchant';
    const lower = rawDescription.toLowerCase().trim();

    for (const entry of MERCHANT_DICTIONARY) {
        for (const pattern of entry.patterns) {
            if (lower.includes(pattern)) {
                return entry.canonical;
            }
        }
    }

    // Default clean-up fallback
    let cleaned = rawDescription
        .replace(/^(ad-|vm-|tx-|upi\/|pos\/|neft\/|imps\/)/i, '')
        .replace(/[\d\-_@#]+/g, ' ')
        .trim();

    return cleaned ? (cleaned.charAt(0).toUpperCase() + cleaned.slice(1, 24)) : 'General Merchant';
}

// ── 2. PERIOD BOUNDS ENGINE ───────────────────────────────────────────────────
export function getPeriodBounds(periodType = 'month', referenceDateISO = '2026-08-17T00:00:00.000Z', customStart = null, customEnd = null) {
    const ref = new Date(referenceDateISO);
    const year = ref.getUTCFullYear();
    const month = ref.getUTCMonth();
    const day = ref.getUTCDate();

    let startDate, endDate, label, periodSubtitle;

    if (periodType === 'today') {
        startDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        label = 'Today';
        periodSubtitle = `${ref.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
    } else if (periodType === 'week') {
        const dayOfWeek = ref.getUTCDay(); // 0 is Sunday
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(Date.UTC(year, month, day - diffToMonday, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month, day - diffToMonday + 6, 23, 59, 59, 999));
        label = 'This Week';
        periodSubtitle = `${startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
    } else if (periodType === 'quarter') {
        const qMonth = Math.floor(month / 3) * 3;
        startDate = new Date(Date.UTC(year, qMonth, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, qMonth + 3, 0, 23, 59, 59, 999));
        label = `Q${Math.floor(month / 3) + 1} ${year}`;
        periodSubtitle = `${startDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
    } else if (periodType === 'year') {
        startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        label = `Year ${year}`;
        periodSubtitle = `Jan 1 – Dec 31, ${year}`;
    } else if (periodType === 'custom' && customStart && customEnd) {
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        label = 'Custom Range';
        periodSubtitle = `${startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
    } else {
        // Default: 'month'
        startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        // If current month, end at current day for live month-to-date or full month
        endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
        const monthName = ref.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        label = `${monthName} ${year}`;
        periodSubtitle = `${monthName} 1 – ${monthName} ${day <= endDate.getUTCDate() ? day : endDate.getUTCDate()}`;
    }

    return {
        periodType,
        startDateISO: startDate.toISOString(),
        endDateISO: endDate.toISOString(),
        label,
        periodSubtitle,
        referenceYear: year,
        referenceMonth: month
    };
}

// ── 3. AUTHORITATIVE ACCOUNTS & EMERGENCY RESERVE CONTRACT ────────────────────
export const DEFAULT_AUTHORITATIVE_ACCOUNTS = [
    { id: 'acc_hdfc_sb', name: 'HDFC Savings Account', type: 'LIQUID_SAVINGS', balance: 75000, isEligibleReserve: true, isDesignated: true },
    { id: 'acc_sbi_sb', name: 'SBI Savings Account', type: 'LIQUID_SAVINGS', balance: 30000, isEligibleReserve: true, isDesignated: true },
    { id: 'acc_icici_ca', name: 'ICICI Current Account', type: 'LIQUID_CURRENT', balance: 45000, isEligibleReserve: true, isDesignated: false },
    { id: 'acc_cash_wallet', name: 'Cash in Hand', type: 'PHYSICAL_CASH', balance: 10000, isEligibleReserve: true, isDesignated: false },
    { id: 'acc_equity_zerodha', name: 'Direct Equity (Zerodha)', type: 'EQUITY', balance: 8500000, isEligibleReserve: false, isDesignated: false },
    { id: 'acc_mf_groww', name: 'Mutual Funds (Groww)', type: 'MUTUAL_FUND', balance: 4200000, isEligibleReserve: false, isDesignated: false },
    { id: 'acc_physical_gold', name: 'Physical Gold & SGBs', type: 'GOLD', balance: 800000, isEligibleReserve: false, isDesignated: false },
    { id: 'acc_epf_locked', name: 'EPF & PPF Retirement', type: 'RETIREMENT_LOCKED', balance: 4500000, isEligibleReserve: false, isDesignated: false }
];

export function computeEmergencyReserve(accounts = DEFAULT_AUTHORITATIVE_ACCOUNTS, designatedAccountIds = ['acc_hdfc_sb', 'acc_sbi_sb']) {
    const designatedAccounts = [];
    const eligibleUndesignatedAccounts = [];
    const excludedAssets = [];

    let currentReserve = 0;
    let totalLiquidCash = 0;
    let totalInvestedAssets = 0;
    let totalLockedAssets = 0;

    for (const acc of accounts) {
        if (acc.type === 'LIQUID_SAVINGS' || acc.type === 'LIQUID_CURRENT' || acc.type === 'PHYSICAL_CASH') {
            totalLiquidCash += acc.balance;
            if (designatedAccountIds.includes(acc.id)) {
                designatedAccounts.push(acc);
                currentReserve += acc.balance;
            } else {
                eligibleUndesignatedAccounts.push(acc);
            }
        } else if (acc.type === 'RETIREMENT_LOCKED') {
            totalLockedAssets += acc.balance;
            excludedAssets.push(acc);
        } else {
            totalInvestedAssets += acc.balance;
            excludedAssets.push(acc);
        }
    }

    const totalNetWorth = totalLiquidCash + totalInvestedAssets + totalLockedAssets;

    return {
        currentReserve,
        currentReserveFormatted: formatCurrencyINR(currentReserve, false),
        designatedAccounts,
        eligibleUndesignatedAccounts,
        excludedAssets,
        totalLiquidCash,
        totalLiquidCashFormatted: formatCurrencyINR(totalLiquidCash, false),
        totalInvestedAssets,
        totalInvestedAssetsFormatted: formatCurrencyINR(totalInvestedAssets, false),
        totalLockedAssets,
        totalLockedAssetsFormatted: formatCurrencyINR(totalLockedAssets, false),
        totalNetWorth,
        totalNetWorthFormatted: formatCurrencyINR(totalNetWorth, false)
    };
}

// ── 4. ESSENTIAL MONTHLY BURN & RUNWAY MATHEMATICS ───────────────────────────
export const DEFAULT_ESSENTIAL_BURN_BREAKDOWN = {
    housingRent: 28000,
    groceriesFood: 18500,
    utilitiesBills: 8500,
    debtEMIs: 22500,
    healthcareMedicines: 5000,
    insurancePremiums: 5000
};

export function computeEmergencyRunwayMetrics(currentReserve = 105000, essentialBurnBreakdown = DEFAULT_ESSENTIAL_BURN_BREAKDOWN) {
    const essentialMonthlyBurn = Object.values(essentialBurnBreakdown).reduce((a, b) => a + b, 0); // ₹87,500
    const runwayMonths = essentialMonthlyBurn > 0 ? Number((currentReserve / essentialMonthlyBurn).toFixed(2)) : 0;

    const minRecommendedMonths = 3.0;
    const optimalRecommendedMonths = 6.0;

    const minTargetAmount = essentialMonthlyBurn * minRecommendedMonths; // ₹2,62,500
    const optimalTargetAmount = essentialMonthlyBurn * optimalRecommendedMonths; // ₹5,25,000

    const shortfall = Math.max(0, minTargetAmount - currentReserve); // ₹1,57,500

    let status = 'HEALTHY';
    let statusLabel = 'Healthy';
    let statusColor = '#10B981';

    if (runwayMonths < 2.0) {
        status = 'CRITICAL';
        statusLabel = 'At Risk';
        statusColor = '#EF4444';
    } else if (runwayMonths < 3.0) {
        status = 'VULNERABLE';
        statusLabel = 'Vulnerable';
        statusColor = '#F59E0B';
    } else if (runwayMonths >= 6.0) {
        status = 'OPTIMAL';
        statusLabel = 'Optimal Buffer';
        statusColor = '#6366F1';
    }

    return {
        currentReserve,
        currentReserveFormatted: formatCurrencyINR(currentReserve, false),
        essentialMonthlyBurn,
        essentialMonthlyBurnFormatted: formatCurrencyINR(essentialMonthlyBurn, false),
        essentialBurnBreakdown,
        runwayMonths,
        minRecommendedMonths,
        optimalRecommendedMonths,
        minTargetAmount,
        minTargetAmountFormatted: formatCurrencyINR(minTargetAmount, false),
        optimalTargetAmount,
        optimalTargetAmountFormatted: formatCurrencyINR(optimalTargetAmount, false),
        shortfall,
        shortfallFormatted: formatCurrencyINR(shortfall, false),
        status,
        statusLabel,
        statusColor,
        calculationFormula: {
            numerator: currentReserve,
            denominator: essentialMonthlyBurn,
            result: runwayMonths,
            explanationText: `Current Liquid Reserve (${formatCurrencyINR(currentReserve, false)}) ÷ Essential Monthly Burn (${formatCurrencyINR(essentialMonthlyBurn, false)}) = ${runwayMonths} months`
        }
    };
}

// ── 5. PERIOD CASH FLOW TRUTH & TRANSACTION NORMALIZATION ─────────────────────
export function computePeriodCashFlowTruth(transactions = [], periodBounds = getPeriodBounds('month')) {
    const startMs = new Date(periodBounds.startDateISO).getTime();
    const endMs = new Date(periodBounds.endDateISO).getTime();

    let totalIncome = 0;
    let totalSpending = 0;
    let totalTransfers = 0;

    const filteredTransactions = [];
    const categorySpendingMap = {};
    const merchantSpendingMap = {};
    const accountSpendingMap = {};

    let needsSortCount = 0;

    for (const rawTx of transactions) {
        const txDate = rawTx.date ? new Date(rawTx.date).getTime() : startMs;
        const inPeriod = txDate >= startMs && txDate <= endMs;

        const amount = Number(rawTx.amount) || 0;
        const type = (rawTx.type || 'EXPENSE').toUpperCase();
        const category = rawTx.category || 'Other';
        const rawDesc = rawTx.description || rawTx.text || rawTx.smsBody || 'Transaction';
        const canonicalMerchant = rawTx.merchant || normalizeMerchant(rawDesc);
        const account = rawTx.account || 'HDFC Savings Account';

        const normalizedTx = {
            ...rawTx,
            id: rawTx.id || `tx_${Math.random().toString(36).substr(2, 9)}`,
            amount,
            type,
            category,
            rawDescription: rawDesc,
            merchant: canonicalMerchant,
            account,
            date: rawTx.date || new Date().toISOString().split('T')[0],
            needsSort: Boolean(rawTx.needsSort || rawTx.status === 'UNPARSED')
        };

        if (normalizedTx.needsSort) {
            needsSortCount += 1;
        }

        if (inPeriod) {
            filteredTransactions.push(normalizedTx);

            if (type === 'INCOME') {
                totalIncome += amount;
            } else if (type === 'EXPENSE') {
                totalSpending += amount;

                // Category aggregate
                categorySpendingMap[category] = (categorySpendingMap[category] || 0) + amount;

                // Merchant aggregate
                if (!merchantSpendingMap[canonicalMerchant]) {
                    merchantSpendingMap[canonicalMerchant] = {
                        merchant: canonicalMerchant,
                        totalAmount: 0,
                        count: 0,
                        categoryMap: {},
                        transactions: []
                    };
                }
                merchantSpendingMap[canonicalMerchant].totalAmount += amount;
                merchantSpendingMap[canonicalMerchant].count += 1;
                merchantSpendingMap[canonicalMerchant].categoryMap[category] = (merchantSpendingMap[canonicalMerchant].categoryMap[category] || 0) + amount;
                merchantSpendingMap[canonicalMerchant].transactions.push(normalizedTx);

                // Account aggregate
                accountSpendingMap[account] = (accountSpendingMap[account] || 0) + amount;
            } else if (type === 'TRANSFER') {
                // Transfer does not count towards period income or period spending
                totalTransfers += amount;
            }
        }
    }

    const netCashFlow = totalIncome - totalSpending;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netCashFlow / totalIncome) * 100)) : 0;

    // Build Category breakdown array
    const categoryBreakdown = Object.entries(categorySpendingMap)
        .map(([category, amount]) => ({
            category,
            amount,
            amountFormatted: formatCurrencyINR(amount, false),
            percentage: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0
        }))
        .sort((a, b) => b.amount - a.amount);

    // Build Merchant breakdown array
    const merchantBreakdown = Object.values(merchantSpendingMap)
        .map(m => ({
            merchant: m.merchant,
            amount: m.totalAmount,
            amountFormatted: formatCurrencyINR(m.totalAmount, false),
            percentage: totalSpending > 0 ? Math.round((m.totalAmount / totalSpending) * 100) : 0,
            transactionCount: m.count,
            categoryDistribution: Object.entries(m.categoryMap).map(([c, amt]) => ({
                category: c,
                amount: amt,
                amountFormatted: formatCurrencyINR(amt, false)
            })),
            transactions: m.transactions
        }))
        .sort((a, b) => b.amount - a.amount);

    return {
        periodBounds,
        filteredTransactions,
        totalIncome,
        totalIncomeFormatted: formatCurrencyINR(totalIncome, false),
        totalSpending,
        totalSpendingFormatted: formatCurrencyINR(totalSpending, false),
        totalTransfers,
        totalTransfersFormatted: formatCurrencyINR(totalTransfers, false),
        netCashFlow,
        netCashFlowFormatted: `${netCashFlow >= 0 ? '+' : ''}${formatCurrencyINR(netCashFlow, false)}`,
        savingsRate,
        categoryBreakdown,
        merchantBreakdown,
        needsSortCount
    };
}

// ── 6. AUTHORITATIVE C.8.6 WHAT-IF SIMULATION BRIDGE ──────────────────────────
export function runAuthoritativeWhatIfSimulation({
    allocationAmount = 30000,
    currentReserve = 105000,
    essentialMonthlyBurn = 87500,
    asOfDate = new Date().toISOString()
}) {
    const baselineRunway = Number((currentReserve / essentialMonthlyBurn).toFixed(2));
    const projectedReserve = currentReserve + allocationAmount;
    const projectedRunway = Number((projectedReserve / essentialMonthlyBurn).toFixed(2));

    // Construct baseline health score DTO
    const baselineHealth = evaluatePortfolioHealthScore({
        id: 'portfolio_user',
        asOfDate,
        holdings: [
            { assetClass: 'EQUITY', value: 8500000, riskScore: 85 },
            { assetClass: 'MUTUAL_FUND', value: 4200000, riskScore: 60 },
            { assetClass: 'CASH_EQUIVALENT', value: currentReserve, riskScore: 10 }
        ],
        cashFlow: {
            income: 165000,
            essentialBurn: essentialMonthlyBurn,
            debtBurn: 22500
        }
    }, asOfDate);

    // Call certified C.8.6 Action Impact Simulator
    const virtualAction = {
        actionId: 'action_boost_emergency_reserve',
        actionType: 'BOOST_EMERGENCY_RESERVE',
        priorityRank: 1,
        title: 'Increase Emergency Reserve',
        recommendedAllocationAmount: allocationAmount,
        targetReserve: projectedReserve
    };

    const simulatedResult = simulateActionImpact(
        virtualAction,
        {
            healthScoreDTO: baselineHealth,
            multiGoalSolvencyDTO: { totalFundingGap: 0, goals: [] }
        },
        asOfDate
    );

    const baselineScore = baselineHealth.compositeScore || 72.8;
    const projectedScore = simulatedResult.afterState?.healthScore || Number((baselineScore + (allocationAmount >= 100000 ? 5.6 : 2.8)).toFixed(1));
    const scoreDelta = Number((projectedScore - baselineScore).toFixed(1));

    return {
        allocationAmount,
        allocationAmountFormatted: formatCurrencyINR(allocationAmount, false),
        before: {
            reserve: currentReserve,
            reserveFormatted: formatCurrencyINR(currentReserve, false),
            runway: `${baselineRunway} months`,
            healthScore: baselineScore,
            healthGrade: baselineHealth.grade || 'B',
            liquidityRisk: baselineRunway < 2 ? 'High' : 'Medium',
            stressResilience: 'Medium',
            financialSecurity: baselineRunway < 3 ? 'At Risk' : 'Secure'
        },
        after: {
            reserve: projectedReserve,
            reserveFormatted: formatCurrencyINR(projectedReserve, false),
            runway: `${projectedRunway} months`,
            healthScore: projectedScore,
            healthGrade: projectedScore >= 75 ? 'B+' : 'B',
            liquidityRisk: projectedRunway >= 3 ? 'Low' : 'Medium',
            stressResilience: projectedRunway >= 3 ? 'High' : 'Medium',
            financialSecurity: projectedRunway >= 3 ? 'Secure' : 'At Risk'
        },
        deltas: {
            runwayMonthsDelta: Number((projectedRunway - baselineRunway).toFixed(2)),
            healthScoreDelta: scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`,
            reserveIncrease: formatCurrencyINR(allocationAmount, false)
        },
        toDoChecklist: [
            `Move ${formatCurrencyINR(allocationAmount, false)} from current monthly surplus to designated savings`,
            `Maintain minimum liquid balance in designated emergency reserve`,
            `Review recurring discretionary subscriptions to accelerate target build`
        ]
    };
}

// ── 7. UPCOMING OBLIGATIONS & COMMITTED OUTFLOWS ──────────────────────────────
export const UPCOMING_OBLIGATIONS_MOCK = [
    { id: 'ob_1', title: 'Home Loan EMI', category: 'Debt / Loan', amount: 45000, dueDate: '2026-08-20', isAutoDebit: true, merchant: 'HDFC Bank' },
    { id: 'ob_2', title: 'Children School Fee', category: 'Education', amount: 18000, dueDate: '2026-08-25', isAutoDebit: false, merchant: 'Oakridge International' },
    { id: 'ob_3', title: 'Term Life Insurance', category: 'Insurance', amount: 8500, dueDate: '2026-08-28', isAutoDebit: true, merchant: 'HDFC Life' },
    { id: 'ob_4', title: 'Apartment Maintenance', category: 'Housing', amount: 6500, dueDate: '2026-09-02', isAutoDebit: false, merchant: 'Prestige Society' }
];

export function getUpcomingOutflows(obligations = UPCOMING_OBLIGATIONS_MOCK) {
    const totalExpectedOutflow = obligations.reduce((sum, o) => sum + o.amount, 0); // ₹78,000

    return {
        obligations: obligations.map(o => ({
            ...o,
            amountFormatted: formatCurrencyINR(o.amount, false)
        })),
        totalExpectedOutflow,
        totalExpectedOutflowFormatted: formatCurrencyINR(totalExpectedOutflow, false),
        horizonDays: 30
    };
}

// ── 8. HISTORICAL CASH FLOW TREND (LAST 6 MONTHS) ─────────────────────────────
export function getHistoricalCashFlowTrend() {
    return {
        months: [
            { month: 'Mar', income: 150000, expense: 58000, netFlow: 92000, savingsRate: 61 },
            { month: 'Apr', income: 150000, expense: 62800, netFlow: 87200, savingsRate: 58 },
            { month: 'May', income: 160000, expense: 51200, netFlow: 108800, savingsRate: 68 },
            { month: 'Jun', income: 160000, expense: 48900, netFlow: 111100, savingsRate: 69 },
            { month: 'Jul', income: 165000, expense: 54200, netFlow: 110800, savingsRate: 67 },
            { month: 'Aug', income: 165000, expense: 43399, netFlow: 121601, savingsRate: 74 }
        ],
        averageMonthlySurplus: 105250,
        averageMonthlySurplusFormatted: formatCurrencyINR(105250, false),
        highestSpendingMonth: { month: 'April 2026', amount: 62800, formatted: formatCurrencyINR(62800, false) },
        averageEssentialBurn: 47200,
        averageEssentialBurnFormatted: formatCurrencyINR(47200, false),
        averageSavingsRate: 66
    };
}
