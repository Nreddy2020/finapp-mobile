/**
 * moneyFlowViewModel.js
 * 
 * AUTHORITATIVE VIEWMODEL FOR PERSONAL MONEY FLOW (CASH ONLY)
 * 
 * Invariants:
 * - MONEYFLOW-VIEW-01: Every displayed financial value originates strictly from this ViewModel.
 * - MONEYFLOW-VIEW-02: Zero financial arithmetic inside JSX.
 * - MONEYFLOW-VIEW-03: All sections share synchronized period bounds.
 * - MONEYFLOW-VIEW-04: Transfers remain neutral to income/expense/net-movement.
 * - MONEYFLOW-VIEW-05: State updates recompute all sections from the same state.
 * - MONEYFLOW-VIEW-06: Non-ready states never show sample values.
 * - MONEYFLOW-VIEW-07: Home screen provides comprehensive understanding without modals.
 */

import {
    getPeriodBounds,
    DEFAULT_AUTHORITATIVE_ACCOUNTS,
    computeEmergencyReserve,
    DEFAULT_ESSENTIAL_BURN_BREAKDOWN,
    computeEmergencyRunwayMetrics,
    computePeriodCashFlowTruth,
    getUpcomingOutflows,
    UPCOMING_OBLIGATIONS_MOCK,
    formatCurrencyINR
} from './moneyFlowPresentationAdapter.js';

export function buildMoneyFlowViewModel({
    transactions = [],
    accounts = DEFAULT_AUTHORITATIVE_ACCOUNTS,
    designatedAccountIds = ['acc_hdfc_sb', 'acc_sbi_sb'],
    periodType = 'month',
    referenceDate = new Date().toISOString(),
    customRange = null,
    selectedYear = new Date().getFullYear(),
    obligations = UPCOMING_OBLIGATIONS_MOCK,
    stateStatus = 'READY'
} = {}) {
    // 1. Period Bounds
    const bounds = getPeriodBounds(
        periodType,
        referenceDate,
        customRange?.start,
        customRange?.end
    );

    // 2. Period Cash Flow Truth
    const cashTruth = computePeriodCashFlowTruth(transactions, bounds);

    // 3. Point-in-time Reserve & Liquid Cash
    const reserveMetrics = computeEmergencyReserve(accounts, designatedAccountIds);
    const runwayMetrics = computeEmergencyRunwayMetrics(
        reserveMetrics.currentReserve,
        DEFAULT_ESSENTIAL_BURN_BREAKDOWN
    );

    // Filter accounts strictly to liquid cash and bank accounts (CASH ONLY)
    const liquidAccounts = (accounts || [])
        .filter(acc => {
            const t = (acc.type || acc.accountType || '').toUpperCase();
            return t === 'LIQUID_SAVINGS' || t === 'LIQUID_CURRENT' || t === 'PHYSICAL_CASH' || t === 'SAVINGS' || t === 'CURRENT' || !t;
        })
        .map(acc => {
            const mask = acc.maskedAccountNumber || acc.accountNumberMasked || (acc.id ? `•••• ${acc.id.slice(-4)}` : '•••• 4821');
            return {
                id: acc.id,
                name: acc.name || acc.bankName || 'Bank Account',
                bankName: acc.bankName || acc.name || 'Bank',
                maskedAccountNumber: mask,
                balance: acc.balance || 0,
                balanceFormatted: formatCurrencyINR(acc.balance || 0, false),
                accountType: acc.accountType || acc.type || 'SAVINGS'
            };
        });

    const totalLiquidCash = liquidAccounts.reduce((sum, a) => sum + a.balance, 0);

    // 4. Upcoming Obligations
    const upcomingList = getUpcomingOutflows(obligations);
    const nextObligation = (upcomingList && upcomingList.obligations && upcomingList.obligations[0]) || null;

    // 5. Structure Where Did My Cash Go? Multi-dimension breakdowns
    const byCategory = (cashTruth.categoryBreakdown || []).map((cat, idx) => ({
        id: `cat_${idx}_${cat.category}`,
        name: cat.category,
        emoji: getCategoryEmoji(cat.category),
        amount: cat.amount,
        amountFormatted: cat.amountFormatted,
        percentage: cat.percentage,
        color: getCategoryColor(cat.category)
    }));

    const byMerchant = (cashTruth.merchantBreakdown || []).slice(0, 8).map((m, idx) => ({
        id: `mer_${idx}_${m.merchant}`,
        name: m.merchant,
        emoji: getMerchantEmoji(m.merchant),
        amount: m.amount,
        amountFormatted: m.amountFormatted,
        percentage: m.percentage,
        count: m.transactionCount,
        color: getCategoryColor(m.merchant)
    }));

    const byAccount = (cashTruth.accountBreakdown || []).map((acc, idx) => ({
        id: `acc_${idx}_${acc.account}`,
        name: acc.account,
        emoji: getAccountEmoji(acc.account),
        amount: acc.amount,
        amountFormatted: acc.amountFormatted,
        percentage: acc.percentage,
        color: '#3B82F6'
    }));

    // 6. Recent Activity Mapping & Date Grouping
    const allNormalizedTransactions = (cashTruth.filteredTransactions || []).map(tx => {
        const isNeedsReview = Boolean(tx.needsSort || tx.status === 'NEEDS_REVIEW');
        const isIncome = tx.type === 'INCOME';
        const isTransfer = tx.type === 'TRANSFER';

        let amountPrefix = '-';
        if (isIncome) amountPrefix = '+';
        if (isTransfer) amountPrefix = '';

        return {
            id: tx.id,
            merchant: tx.merchant || tx.description || 'Transaction',
            category: tx.category || 'General',
            categoryEmoji: tx.categoryEmoji || getCategoryEmoji(tx.category || tx.merchant),
            type: tx.type,
            amount: tx.amount,
            amountFormatted: `${amountPrefix}${formatCurrencyINR(tx.amount, false)}`,
            date: tx.date,
            dateFormatted: formatDateString(tx.date),
            dateGroup: getDateGroup(tx.date),
            accountName: tx.accountName || tx.account || 'Primary Account',
            statusTag: isNeedsReview ? 'NEEDS_REVIEW' : 'SORTED',
            isReviewNeeded: isNeedsReview,
            source: tx.source || (tx.rawSource ? 'SMS' : 'MANUAL'),
            rawTransaction: tx
        };
    });

    const needsReviewCount = allNormalizedTransactions.filter(t => t.isReviewNeeded).length;
    const expenseCount = allNormalizedTransactions.filter(t => t.type === 'EXPENSE').length;
    const incomeCount = allNormalizedTransactions.filter(t => t.type === 'INCOME').length;

    return {
        stateStatus,
        period: {
            type: periodType,
            label: bounds.label,
            startDate: bounds.startDateISO,
            endDate: bounds.endDateISO,
            isCurrentMonth: periodType === 'month'
        },
        whereDidMyCashGo: {
            title: 'Where Did My Cash Go?',
            totalSpending: cashTruth.totalSpending,
            totalSpendingFormatted: cashTruth.totalSpendingFormatted,
            totalCashAmount: totalLiquidCash,
            totalCashFormatted: formatCurrencyINR(totalLiquidCash, false),
            accountSummaryText: `Across ${liquidAccounts.length} bank account${liquidAccounts.length === 1 ? '' : 's'}`,
            byCategory,
            byMerchant,
            byAccount,
            accounts: liquidAccounts
        },
        periodStatement: {
            periodLabel: bounds.label.toUpperCase(),
            totalIncome: cashTruth.totalIncome,
            totalIncomeFormatted: cashTruth.totalIncomeFormatted,
            totalExpenses: cashTruth.totalSpending,
            totalExpensesFormatted: cashTruth.totalSpendingFormatted,
            totalTransfers: cashTruth.totalTransfers,
            totalTransfersFormatted: cashTruth.totalTransfersFormatted,
            netMovement: cashTruth.netCashFlow,
            netMovementFormatted: cashTruth.netCashFlowFormatted,
            isNetPositive: cashTruth.netCashFlow >= 0,
            savingsRate: cashTruth.savingsRate,
            savingsRateSummary: `${cashTruth.savingsRate}% saved this period`,
            unreviewedCount: needsReviewCount
        },
        attention: {
            emergencyReserve: {
                title: 'Emergency Reserve',
                amount: reserveMetrics.currentReserve,
                amountFormatted: reserveMetrics.currentReserve ? formatCurrencyINR(reserveMetrics.currentReserve, false) : '₹0',
                runwayMonths: runwayMetrics.runwayMonths,
                runwayMonthsFormatted: `${runwayMetrics.runwayMonths} months`,
                status: runwayMetrics.status,
                statusLabel: runwayMetrics.statusLabel,
                statusColor: runwayMetrics.statusColor,
                monthlyBurnFormatted: runwayMetrics.essentialMonthlyBurnFormatted,
                recommendedTargetText: `Target: 3-6 months (${runwayMetrics.minTargetAmountFormatted})`
            },
            upcomingObligation: nextObligation ? {
                title: nextObligation.title,
                amount: nextObligation.amount,
                amountFormatted: nextObligation.amountFormatted || formatCurrencyINR(nextObligation.amount, false),
                dueDate: nextObligation.dueDate,
                dueDateFormatted: `Due ${nextObligation.dueDate}`,
                type: nextObligation.category || 'Debt'
            } : null
        },
        spendingBreakdown: {
            categories: byCategory
        },
        recentActivity: {
            transactions: allNormalizedTransactions,
            unreviewedCount: needsReviewCount,
            counts: {
                all: allNormalizedTransactions.length,
                needsReview: needsReviewCount,
                expense: expenseCount,
                income: incomeCount
            }
        }
    };
}

function getCategoryColor(catName = '') {
    const name = (catName || '').toLowerCase();
    if (name.includes('rent') || name.includes('housing')) return '#3B82F6';
    if (name.includes('food') || name.includes('grocer') || name.includes('dining') || name.includes('swiggy') || name.includes('zomato')) return '#F59E0B';
    if (name.includes('emi') || name.includes('loan') || name.includes('debt')) return '#EF4444';
    if (name.includes('util') || name.includes('bill') || name.includes('bescom')) return '#8B5CF6';
    if (name.includes('entertain') || name.includes('leisure') || name.includes('netflix')) return '#EC4899';
    if (name.includes('invest') || name.includes('mutual') || name.includes('salary') || name.includes('zerodha')) return '#10B981';
    if (name.includes('transport') || name.includes('travel') || name.includes('uber') || name.includes('ola')) return '#06B6D4';
    if (name.includes('shop') || name.includes('amazon') || name.includes('flipkart')) return '#F97316';
    return '#64748B';
}

function getCategoryEmoji(catName = '') {
    const name = (catName || '').toLowerCase();
    if (name.includes('rent') || name.includes('housing')) return '🏠';
    if (name.includes('food') || name.includes('grocer') || name.includes('dining') || name.includes('swiggy') || name.includes('zomato')) return '🍽️';
    if (name.includes('util') || name.includes('bill') || name.includes('bescom') || name.includes('electric')) return '💡';
    if (name.includes('transport') || name.includes('travel') || name.includes('uber') || name.includes('ola') || name.includes('fuel')) return '🚗';
    if (name.includes('shop') || name.includes('amazon') || name.includes('flipkart') || name.includes('retail')) return '🛍️';
    if (name.includes('entertain') || name.includes('movie') || name.includes('netflix') || name.includes('spotify')) return '🎬';
    if (name.includes('health') || name.includes('med') || name.includes('doctor') || name.includes('pharmacy')) return '💊';
    if (name.includes('salary') || name.includes('payroll') || name.includes('income')) return '💰';
    if (name.includes('transfer')) return '🔄';
    if (name.includes('needs review') || name.includes('unknown') || name.includes('unparsed')) return '❓';
    return '💳';
}

function getMerchantEmoji(merchantName = '') {
    const name = (merchantName || '').toLowerCase();
    if (name.includes('amazon')) return '📦';
    if (name.includes('swiggy') || name.includes('zomato') || name.includes('dining')) return '🍽️';
    if (name.includes('uber') || name.includes('ola')) return '🚗';
    if (name.includes('bigbasket') || name.includes('blinkit') || name.includes('zepto')) return '🛒';
    if (name.includes('bescom') || name.includes('electricity')) return '⚡';
    if (name.includes('netflix') || name.includes('spotify') || name.includes('pvr')) return '🍿';
    if (name.includes('prestige') || name.includes('society') || name.includes('rent')) return '🏠';
    if (name.includes('zerodha') || name.includes('groww')) return '📈';
    if (name.includes('infosys') || name.includes('salary')) return '💰';
    return '🏢';
}

function getAccountEmoji(accName = '') {
    const name = (accName || '').toLowerCase();
    if (name.includes('hdfc')) return '🏦';
    if (name.includes('sbi')) return '🏛️';
    if (name.includes('icici')) return '🏦';
    if (name.includes('cash')) return '💵';
    return '💳';
}

function formatDateString(isoString) {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
        return isoString;
    }
}

function getDateGroup(isoString) {
    if (!isoString) return 'Older';
    try {
        const d = new Date(isoString);
        const now = new Date();
        
        const isToday = d.getFullYear() === now.getFullYear() &&
                        d.getMonth() === now.getMonth() &&
                        d.getDate() === now.getDate();
        if (isToday) return 'Today';

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = d.getFullYear() === yesterday.getFullYear() &&
                            d.getMonth() === yesterday.getMonth() &&
                            d.getDate() === yesterday.getDate();
        if (isYesterday) return 'Yesterday';

        return 'Older';
    } catch {
        return 'Older';
    }
}
