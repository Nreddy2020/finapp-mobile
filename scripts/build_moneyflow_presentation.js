import fs from 'fs';
import path from 'path';

function writeFile(relPath, content) {
    const fullPath = path.resolve(process.cwd(), relPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
    console.log('  ✓ Generated: ' + relPath);
}

console.log('=== BUILDING MONEY FLOW PRESENTATION ARCHITECTURE ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. mathParser.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/mathParser.js', `/**
 * mathParser.js
 * 
 * SAFE FINANCIAL ARITHMETIC PARSER
 * Pure recursive-descent arithmetic evaluator supporting +, -, *, /, parenthesis, and decimals.
 * Zero dynamic code evaluation (zero eval, zero Function(...)).
 */

export function parseAndEvaluateArithmetic(expression) {
    if (!expression || typeof expression !== 'string') return 0;
    const sanitized = expression.replace(/,/g, '').trim();
    if (!sanitized) return 0;

    if (/[^0-9+\\-*/().\\s]/.test(sanitized)) {
        throw new Error('Invalid characters in arithmetic expression');
    }

    const tokens = [];
    let i = 0;
    while (i < sanitized.length) {
        const ch = sanitized[i];
        if (/\\s/.test(ch)) {
            i++;
            continue;
        }
        if (/[0-9.]/.test(ch)) {
            let numStr = '';
            while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
                numStr += sanitized[i];
                i++;
            }
            const num = parseFloat(numStr);
            if (isNaN(num)) throw new Error('Invalid number: ' + numStr);
            tokens.push({ type: 'NUMBER', value: num });
            continue;
        }
        if ('+-*/()'.includes(ch)) {
            tokens.push({ type: 'OP', value: ch });
            i++;
            continue;
        }
        throw new Error('Unexpected character: ' + ch);
    }

    if (tokens.length === 0) return 0;

    let pos = 0;
    function peek() {
        return tokens[pos];
    }
    function consume(expectedOp) {
        const t = tokens[pos];
        if (!t) throw new Error('Unexpected end of expression');
        if (expectedOp && (t.type !== 'OP' || t.value !== expectedOp)) {
            throw new Error(`Expected '${expectedOp}', got '${t.value}'`);
        }
        pos++;
        return t;
    }

    function parseExpr() {
        let result = parseTerm();
        while (pos < tokens.length && peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
            const op = consume().value;
            const nextTerm = parseTerm();
            if (op === '+') result += nextTerm;
            else result -= nextTerm;
        }
        return result;
    }

    function parseTerm() {
        let result = parseFactor();
        while (pos < tokens.length && peek().type === 'OP' && (peek().value === '*' || peek().value === '/')) {
            const op = consume().value;
            const nextFactor = parseFactor();
            if (op === '*') result *= nextFactor;
            else {
                if (nextFactor === 0) throw new Error('Division by zero');
                result /= nextFactor;
            }
        }
        return result;
    }

    function parseFactor() {
        const token = peek();
        if (!token) throw new Error('Unexpected end of expression');

        if (token.type === 'OP' && (token.value === '+' || token.value === '-')) {
            const sign = consume().value === '-' ? -1 : 1;
            return sign * parseFactor();
        }

        if (token.type === 'NUMBER') {
            consume();
            return token.value;
        }

        if (token.type === 'OP' && token.value === '(') {
            consume('(');
            const val = parseExpr();
            consume(')');
            return val;
        }

        throw new Error(`Unexpected token: ${token.value}`);
    }

    const result = parseExpr();
    if (pos < tokens.length) {
        throw new Error('Unparsed tokens remaining');
    }

    return Number.isFinite(result) ? result : 0;
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. moneyFlowStyles.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/moneyFlowStyles.js', `import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const MF_COLORS = Object.freeze({
    bg: '#0A0D14',
    cardBg: '#111827',
    cardBorder: '#1F2937',
    surfaceSubtle: '#182032',
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    primaryBlue: '#3B82F6',
    primaryBlueSubtle: '#1D3B73',
    incomeGreen: '#10B981',
    incomeGreenSubtle: '#064E3B',
    expenseRed: '#EF4444',
    expenseRedSubtle: '#7F1D1D',
    warningYellow: '#F59E0B',
    warningYellowSubtle: '#78350F',
    divider: '#1E293B',
    modalBg: '#0F172A'
});

export const mfStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: MF_COLORS.bg
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40
    },
    // Header
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: MF_COLORS.divider,
        marginBottom: 16
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: MF_COLORS.cardBg,
        borderWidth: 1,
        borderColor: MF_COLORS.cardBorder,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerTitles: {
        flex: 1
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: MF_COLORS.textPrimary,
        letterSpacing: 0.2
    },
    screenSubtitle: {
        fontSize: 12,
        color: MF_COLORS.textSecondary,
        marginTop: 2
    },
    periodSelectorPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: MF_COLORS.surfaceSubtle,
        borderWidth: 1,
        borderColor: MF_COLORS.cardBorder,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20
    },
    periodPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: MF_COLORS.primaryBlue
    },
    // Section Card (Calm Container)
    sectionBlock: {
        backgroundColor: MF_COLORS.cardBg,
        borderWidth: 1,
        borderColor: MF_COLORS.cardBorder,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    sectionHeading: {
        fontSize: 12,
        fontWeight: '700',
        color: MF_COLORS.textMuted,
        letterSpacing: 0.8,
        textTransform: 'uppercase'
    },
    sectionLinkText: {
        fontSize: 12,
        fontWeight: '600',
        color: MF_COLORS.primaryBlue
    },
    // Hero Balance
    heroBalance: {
        fontSize: 32,
        fontWeight: '800',
        color: MF_COLORS.textPrimary,
        letterSpacing: -0.5
    },
    heroSubtitle: {
        fontSize: 13,
        color: MF_COLORS.textSecondary,
        marginTop: 4,
        marginBottom: 14
    },
    // Inline Accounts
    accountItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: MF_COLORS.divider
    },
    accountLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1
    },
    accountIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: MF_COLORS.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center'
    },
    accountNameText: {
        fontSize: 14,
        fontWeight: '600',
        color: MF_COLORS.textPrimary
    },
    accountSubText: {
        fontSize: 11,
        color: MF_COLORS.textMuted,
        marginTop: 2
    },
    accountBalanceText: {
        fontSize: 14,
        fontWeight: '700',
        color: MF_COLORS.textPrimary
    },
    // Statement Rows
    statementRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8
    },
    statementLabel: {
        fontSize: 14,
        color: MF_COLORS.textSecondary
    },
    statementValueIncome: {
        fontSize: 15,
        fontWeight: '700',
        color: MF_COLORS.incomeGreen
    },
    statementValueExpense: {
        fontSize: 15,
        fontWeight: '700',
        color: MF_COLORS.expenseRed
    },
    statementValueTransfer: {
        fontSize: 14,
        fontWeight: '600',
        color: MF_COLORS.primaryBlue
    },
    statementDivider: {
        height: 1,
        backgroundColor: MF_COLORS.divider,
        marginVertical: 8
    },
    statementNetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4
    },
    statementNetLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: MF_COLORS.textPrimary
    },
    statementNetValuePositive: {
        fontSize: 18,
        fontWeight: '800',
        color: MF_COLORS.incomeGreen
    },
    statementNetValueNegative: {
        fontSize: 18,
        fontWeight: '800',
        color: MF_COLORS.expenseRed
    },
    statusBadgePill: {
        alignSelf: 'flex-start',
        backgroundColor: MF_COLORS.incomeGreenSubtle,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 10
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: MF_COLORS.incomeGreen
    },
    // Attention Item Cards
    attentionCard: {
        backgroundColor: MF_COLORS.surfaceSubtle,
        borderRadius: 10,
        padding: 12,
        marginBottom: 10
    },
    attentionTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    attentionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: MF_COLORS.textPrimary
    },
    attentionMetric: {
        fontSize: 15,
        fontWeight: '700',
        color: MF_COLORS.textPrimary,
        marginTop: 4
    },
    attentionDetail: {
        fontSize: 12,
        color: MF_COLORS.textSecondary,
        marginTop: 2
    },
    attentionBadgeAtRisk: {
        backgroundColor: MF_COLORS.expenseRedSubtle,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    attentionBadgeTextAtRisk: {
        fontSize: 10,
        fontWeight: '700',
        color: MF_COLORS.expenseRed
    },
    // Spending Row
    spendingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8
    },
    spendingCategory: {
        width: 100,
        fontSize: 14,
        fontWeight: '500',
        color: MF_COLORS.textPrimary
    },
    spendingBarContainer: {
        flex: 1,
        height: 6,
        backgroundColor: MF_COLORS.surfaceSubtle,
        borderRadius: 3,
        marginHorizontal: 10,
        overflow: 'hidden'
    },
    spendingBarFill: {
        height: '100%',
        borderRadius: 3
    },
    spendingAmount: {
        width: 80,
        textAlign: 'right',
        fontSize: 13,
        fontWeight: '600',
        color: MF_COLORS.textPrimary
    },
    spendingPercent: {
        width: 36,
        textAlign: 'right',
        fontSize: 11,
        color: MF_COLORS.textMuted
    },
    // Activity
    activityAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: MF_COLORS.primaryBlue,
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 14
    },
    activityAddBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: MF_COLORS.surfaceSubtle,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 12,
        gap: 8
    },
    searchInput: {
        flex: 1,
        color: MF_COLORS.textPrimary,
        fontSize: 13,
        padding: 0
    },
    activityDateGroup: {
        fontSize: 11,
        fontWeight: '700',
        color: MF_COLORS.textMuted,
        letterSpacing: 0.5,
        marginTop: 8,
        marginBottom: 6
    },
    activityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: MF_COLORS.divider
    },
    activityLeftInfo: {
        flex: 1,
        marginRight: 10
    },
    activityMerchantText: {
        fontSize: 14,
        fontWeight: '600',
        color: MF_COLORS.textPrimary
    },
    activityMetaText: {
        fontSize: 11,
        color: MF_COLORS.textMuted,
        marginTop: 2
    },
    activityAmountText: {
        fontSize: 14,
        fontWeight: '700'
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: MF_COLORS.modalBg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '90%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: MF_COLORS.textPrimary
    },
    modalCloseBtn: {
        padding: 4
    }
});
`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. moneyFlowViewModel.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/moneyFlowViewModel.js', `/**
 * moneyFlowViewModel.js
 * 
 * AUTHORITATIVE VIEWMODEL FOR PERSONAL MONEY FLOW
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
    UPCOMING_OBLIGATIONS_MOCK
} from './moneyFlowPresentationAdapter.js';
import { formatCurrencyINR, formatCompactCurrencyINR } from '../../components/investments/decisionPresentationAdapter.js';

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

    // 4. Upcoming Obligations
    const upcomingTruth = getUpcomingOutflows(obligations);
    const nextObligation = upcomingTruth.obligations[0] || null;

    // 5. Layer 1: Cash Position (Where Did My Cash Go? / Where is it held)
    const liquidAccounts = (accounts || [])
        .filter(a => a.type === 'LIQUID_SAVINGS' || a.type === 'LIQUID_CURRENT' || a.type === 'PHYSICAL_CASH' || a.type === 'SAVINGS' || a.type === 'CURRENT')
        .map(acc => {
            const rawBal = Number(acc.balancePaise !== undefined ? acc.balancePaise / 100 : acc.balance) || 0;
            const mask = acc.maskedAccountNumber || acc.accountNumberMasked || (acc.id ? `•••• ${acc.id.slice(-4)}` : '•••• 4821');
            return {
                id: acc.id,
                name: acc.accountName || acc.name || 'Bank Account',
                type: acc.accountType || (acc.type === 'LIQUID_CURRENT' ? 'Current' : 'Savings'),
                mask,
                balance: rawBal,
                balanceFormatted: formatCurrencyINR(rawBal, false),
                balanceCompact: formatCompactCurrencyINR(rawBal),
                institution: acc.institutionName || acc.name?.split(' ')[0] || 'Bank',
                isDesignated: designatedAccountIds.includes(acc.id)
            };
        });

    const totalLiquidCash = liquidAccounts.reduce((sum, a) => sum + a.balance, 0);

    const cashPosition = {
        title: 'Where Did My Cash Go?',
        totalLiquidCash,
        totalLiquidCashFormatted: formatCurrencyINR(totalLiquidCash, false),
        totalLiquidCashCompact: formatCompactCurrencyINR(totalLiquidCash),
        accountCount: liquidAccounts.length,
        accountSummaryText: `Across ${liquidAccounts.length} bank account${liquidAccounts.length === 1 ? '' : 's'}`,
        accounts: liquidAccounts,
        hasAccounts: liquidAccounts.length > 0
    };

    // 6. Layer 2: Period Statement
    const periodLabelUpper = (bounds.label || 'THIS PERIOD').toUpperCase();
    const periodStatement = {
        periodLabel: periodLabelUpper,
        periodSubtitle: bounds.periodSubtitle,
        periodType: bounds.periodType,
        totalIncome: cashTruth.totalIncome,
        totalIncomeFormatted: formatCurrencyINR(cashTruth.totalIncome, false),
        totalExpenses: cashTruth.totalSpending,
        totalExpensesFormatted: formatCurrencyINR(cashTruth.totalSpending, false),
        totalTransfers: cashTruth.totalTransfers,
        totalTransfersFormatted: formatCurrencyINR(cashTruth.totalTransfers, false),
        netMovement: cashTruth.netCashFlow,
        netMovementFormatted: `${cashTruth.netCashFlow >= 0 ? '+' : ''}${formatCurrencyINR(cashTruth.netCashFlow, false)}`,
        isPositive: cashTruth.netCashFlow >= 0,
        savingsRate: cashTruth.savingsRate,
        savingsRateSummary: `${cashTruth.savingsRate}% saved this period`,
        hasActivityInPeriod: cashTruth.filteredTransactions.length > 0
    };

    // 7. Layer 3: Needs Attention & Commitments
    const attention = {
        hasAttentionItems: true,
        reserve: {
            currentReserve: runwayMetrics.currentReserve,
            currentReserveFormatted: runwayMetrics.currentReserveFormatted,
            runwayMonths: runwayMetrics.runwayMonths,
            runwayMonthsFormatted: `${runwayMetrics.runwayMonths} months`,
            essentialMonthlyBurn: runwayMetrics.essentialMonthlyBurn,
            essentialMonthlyBurnFormatted: runwayMetrics.essentialMonthlyBurnFormatted,
            minTargetAmount: runwayMetrics.minTargetAmount,
            minTargetAmountFormatted: runwayMetrics.minTargetAmountFormatted,
            status: runwayMetrics.status,
            statusLabel: runwayMetrics.statusLabel,
            statusColor: runwayMetrics.statusColor,
            isAtRisk: runwayMetrics.runwayMonths < 2.0,
            recommendedTargetText: `Target: 3-6 months (${runwayMetrics.minTargetAmountFormatted})`
        },
        upcomingObligation: nextObligation ? {
            id: nextObligation.id,
            title: nextObligation.title,
            amount: nextObligation.amount,
            amountFormatted: nextObligation.amountFormatted,
            dueDate: nextObligation.dueDate,
            dueDateFormatted: `Due ${nextObligation.dueDate}`,
            merchant: nextObligation.merchant,
            category: nextObligation.category,
            isAutoDebit: nextObligation.isAutoDebit
        } : null
    };

    // 8. Layer 4: Spending Breakdown
    const topCategories = (cashTruth.categoryBreakdown || []).slice(0, 5).map(cat => ({
        ...cat,
        color: getCategoryColor(cat.category)
    }));

    const spending = {
        totalSpending: cashTruth.totalSpending,
        totalSpendingFormatted: cashTruth.totalSpendingFormatted,
        categories: topCategories,
        hasSpending: cashTruth.totalSpending > 0,
        merchantCount: (cashTruth.merchantBreakdown || []).length
    };

    // 9. Layer 5: Cash Activity Feed
    // Group transactions by date
    const dateGroupsMap = {};
    for (const tx of cashTruth.filteredTransactions) {
        const dateKey = tx.date ? tx.date.split('T')[0] : 'Recent';
        if (!dateGroupsMap[dateKey]) {
            dateGroupsMap[dateKey] = [];
        }
        dateGroupsMap[dateKey].push({
            id: tx.id,
            merchant: tx.merchant || tx.rawDescription || 'Transaction',
            category: tx.category || 'Other',
            account: tx.account || 'HDFC Savings',
            amount: tx.amount,
            amountFormatted: `${tx.type === 'INCOME' ? '+' : '-'}${formatCurrencyINR(tx.amount, false)}`,
            type: tx.type,
            date: dateKey,
            time: tx.time || '10:00 AM',
            needsSort: tx.needsSort
        });
    }

    const groupedByDate = Object.entries(dateGroupsMap)
        .map(([date, items]) => ({
            date,
            dateLabel: formatDateLabel(date),
            items
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const recentList = cashTruth.filteredTransactions.slice(0, 5).map(tx => ({
        id: tx.id,
        merchant: tx.merchant || tx.rawDescription || 'Transaction',
        category: tx.category || 'Other',
        account: tx.account || 'HDFC Savings',
        amount: tx.amount,
        amountFormatted: `${tx.type === 'INCOME' ? '+' : '-'}${formatCurrencyINR(tx.amount, false)}`,
        type: tx.type,
        date: tx.date,
        needsSort: tx.needsSort
    }));

    const activity = {
        totalCount: cashTruth.filteredTransactions.length,
        recentList,
        groupedByDate,
        needsReviewCount: cashTruth.needsSortCount,
        hasActivity: cashTruth.filteredTransactions.length > 0
    };

    return {
        stateStatus,
        period: bounds,
        cashPosition,
        periodStatement,
        attention,
        spending,
        activity,
        rawTransactions: transactions
    };
}

function formatDateLabel(dateStr) {
    if (!dateStr || dateStr === 'Recent') return 'Recent';
    try {
        const d = new Date(dateStr);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
        return dateStr;
    }
}

function getCategoryColor(category) {
    const map = {
        'Rent': '#10B981',
        'Housing': '#10B981',
        'Food': '#F97316',
        'Dining': '#F97316',
        'Travel': '#3B82F6',
        'Transport': '#3B82F6',
        'Shopping': '#EC4899',
        'Entertainment': '#8B5CF6',
        'Utilities': '#EAB308',
        'Bills': '#EAB308',
        'Salary': '#10B981',
        'Investment': '#06B6D4'
    };
    return map[category] || '#6B7280';
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. components/moneyflow/presentation/MoneyFlowHeader.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/presentation/MoneyFlowHeader.js', `import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Menu, ChevronDown, Bell } from 'lucide-react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export default function MoneyFlowHeader({
    period,
    onOpenDrawer,
    onOpenPeriodSelector
}) {
    return (
        <View style={mfStyles.headerContainer}>
            <View style={mfStyles.headerLeft}>
                <TouchableOpacity
                    style={mfStyles.menuButton}
                    onPress={onOpenDrawer}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Menu size={20} color={MF_COLORS.textPrimary} />
                </TouchableOpacity>

                <View style={mfStyles.headerTitles}>
                    <Text style={mfStyles.screenTitle}>Personal Money Flow</Text>
                    <Text style={mfStyles.screenSubtitle}>Your cash, simply understood.</Text>
                </View>
            </View>

            <TouchableOpacity
                style={mfStyles.periodSelectorPill}
                onPress={onOpenPeriodSelector}
                activeOpacity={0.7}
            >
                <Text style={mfStyles.periodPillText}>{period?.label || 'This Month'}</Text>
                <ChevronDown size={14} color={MF_COLORS.primaryBlue} />
            </TouchableOpacity>
        </View>
    );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 5. components/moneyflow/presentation/WhereDidMyCashGoSection.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/presentation/WhereDidMyCashGoSection.js', `import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Building2, ChevronRight } from 'lucide-react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export default function WhereDidMyCashGoSection({
    cashPosition,
    onViewAllAccounts
}) {
    if (!cashPosition) return null;

    return (
        <View style={mfStyles.sectionBlock}>
            <View style={mfStyles.sectionHeaderRow}>
                <Text style={mfStyles.sectionHeading}>{cashPosition.title || 'Where Did My Cash Go?'}</Text>
            </View>

            {/* Total Balance Hero */}
            <Text style={mfStyles.heroBalance}>{cashPosition.totalLiquidCashFormatted}</Text>
            <Text style={mfStyles.heroSubtitle}>{cashPosition.accountSummaryText}</Text>

            {/* Inline Bank Accounts List */}
            {cashPosition.accounts && cashPosition.accounts.slice(0, 3).map((acc) => (
                <View key={acc.id} style={mfStyles.accountItem}>
                    <View style={mfStyles.accountLeft}>
                        <View style={mfStyles.accountIconWrap}>
                            <Building2 size={16} color={MF_COLORS.primaryBlue} />
                        </View>
                        <View>
                            <Text style={mfStyles.accountNameText}>{acc.name}</Text>
                            <Text style={mfStyles.accountSubText}>{acc.type} • {acc.mask}</Text>
                        </View>
                    </View>
                    <Text style={mfStyles.accountBalanceText}>{acc.balanceFormatted}</Text>
                </View>
            ))}

            {cashPosition.accounts && cashPosition.accounts.length > 0 && (
                <TouchableOpacity
                    style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={onViewAllAccounts}
                    activeOpacity={0.7}
                >
                    <Text style={mfStyles.sectionLinkText}>View all accounts →</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 6. components/moneyflow/presentation/PeriodStatementSection.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/presentation/PeriodStatementSection.js', `import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export default function PeriodStatementSection({
    periodStatement,
    onViewTrend
}) {
    if (!periodStatement) return null;

    return (
        <View style={mfStyles.sectionBlock}>
            <View style={mfStyles.sectionHeaderRow}>
                <Text style={mfStyles.sectionHeading}>{periodStatement.periodLabel || 'THIS MONTH'}</Text>
                {periodStatement.periodSubtitle ? (
                    <Text style={{ fontSize: 11, color: MF_COLORS.textMuted }}>{periodStatement.periodSubtitle}</Text>
                ) : null}
            </View>

            {/* Financial Statement Rows */}
            <View style={mfStyles.statementRow}>
                <Text style={mfStyles.statementLabel}>Income</Text>
                <Text style={mfStyles.statementValueIncome}>{periodStatement.totalIncomeFormatted}</Text>
            </View>

            <View style={mfStyles.statementRow}>
                <Text style={mfStyles.statementLabel}>Expenses</Text>
                <Text style={mfStyles.statementValueExpense}>{periodStatement.totalExpensesFormatted}</Text>
            </View>

            {periodStatement.totalTransfers > 0 && (
                <View style={mfStyles.statementRow}>
                    <Text style={mfStyles.statementLabel}>Transfers (Neutral)</Text>
                    <Text style={mfStyles.statementValueTransfer}>{periodStatement.totalTransfersFormatted}</Text>
                </View>
            )}

            <View style={mfStyles.statementDivider} />

            {/* Net Movement */}
            <View style={mfStyles.statementNetRow}>
                <Text style={mfStyles.statementNetLabel}>Net movement</Text>
                <Text style={periodStatement.isPositive ? mfStyles.statementNetValuePositive : mfStyles.statementNetValueNegative}>
                    {periodStatement.netMovementFormatted}
                </Text>
            </View>

            {/* Savings Rate Badge */}
            {periodStatement.savingsRate > 0 && (
                <View style={mfStyles.statusBadgePill}>
                    <Text style={mfStyles.statusBadgeText}>{periodStatement.savingsRateSummary}</Text>
                </View>
            )}

            {onViewTrend && (
                <TouchableOpacity
                    style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={onViewTrend}
                    activeOpacity={0.7}
                >
                    <Text style={mfStyles.sectionLinkText}>View cash flow trend →</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 7. components/moneyflow/presentation/MoneyFlowAttentionSection.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/presentation/MoneyFlowAttentionSection.js', `import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ShieldAlert, Calendar, ChevronRight } from 'lucide-react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export default function MoneyFlowAttentionSection({
    attention,
    onOpenReserveDetail,
    onOpenObligationDetail
}) {
    if (!attention) return null;

    const { reserve, upcomingObligation } = attention;

    return (
        <View style={mfStyles.sectionBlock}>
            <View style={mfStyles.sectionHeaderRow}>
                <Text style={mfStyles.sectionHeading}>NEEDS YOUR ATTENTION</Text>
            </View>

            {/* Emergency Reserve Item */}
            {reserve && (
                <TouchableOpacity
                    style={mfStyles.attentionCard}
                    onPress={onOpenReserveDetail}
                    activeOpacity={0.7}
                >
                    <View style={mfStyles.attentionTopRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={mfStyles.attentionTitle}>Emergency reserve</Text>
                            <Text style={mfStyles.attentionMetric}>{reserve.currentReserveFormatted} · {reserve.runwayMonthsFormatted}</Text>
                            <Text style={mfStyles.attentionDetail}>{reserve.recommendedTargetText}</Text>
                        </View>
                        {reserve.isAtRisk && (
                            <View style={mfStyles.attentionBadgeAtRisk}>
                                <Text style={mfStyles.attentionBadgeTextAtRisk}>{reserve.statusLabel || 'At Risk'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Text style={mfStyles.sectionLinkText}>View calculation →</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Upcoming EMI / Obligation Item */}
            {upcomingObligation && (
                <TouchableOpacity
                    style={[mfStyles.attentionCard, { marginBottom: 0 }]}
                    onPress={onOpenObligationDetail}
                    activeOpacity={0.7}
                >
                    <View style={mfStyles.attentionTopRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={mfStyles.attentionTitle}>Upcoming EMI</Text>
                            <Text style={mfStyles.attentionMetric}>{upcomingObligation.title} {upcomingObligation.amountFormatted}</Text>
                            <Text style={mfStyles.attentionDetail}>{upcomingObligation.dueDateFormatted} • {upcomingObligation.merchant || 'Bank'}</Text>
                        </View>
                        <ChevronRight size={16} color={MF_COLORS.textMuted} />
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 8. components/moneyflow/presentation/SpendingBreakdownSection.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/presentation/SpendingBreakdownSection.js', `import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export default function SpendingBreakdownSection({
    spending,
    onViewFullBreakdown
}) {
    if (!spending) return null;

    return (
        <View style={mfStyles.sectionBlock}>
            <View style={mfStyles.sectionHeaderRow}>
                <Text style={mfStyles.sectionHeading}>SPENDING</Text>
                {spending.totalSpending > 0 && (
                    <Text style={{ fontSize: 13, fontWeight: '700', color: MF_COLORS.textPrimary }}>
                        {spending.totalSpendingFormatted}
                    </Text>
                )}
            </View>

            {/* Compact Category Rows with Subtle Visual Bars */}
            {spending.categories && spending.categories.length > 0 ? (
                spending.categories.map((cat, idx) => (
                    <View key={idx} style={mfStyles.spendingRow}>
                        <Text style={mfStyles.spendingCategory} numberOfLines={1}>{cat.category}</Text>
                        <View style={mfStyles.spendingBarContainer}>
                            <View style={[mfStyles.spendingBarFill, { width: `${Math.min(100, Math.max(4, cat.percentage))}%`, backgroundColor: cat.color || MF_COLORS.primaryBlue }]} />
                        </View>
                        <Text style={mfStyles.spendingAmount}>{cat.amountFormatted}</Text>
                        <Text style={mfStyles.spendingPercent}>{cat.percentage}%</Text>
                    </View>
                ))
            ) : (
                <Text style={{ fontSize: 13, color: MF_COLORS.textMuted, marginVertical: 8 }}>
                    No categorized spending recorded for this period.
                </Text>
            )}

            {onViewFullBreakdown && (
                <TouchableOpacity
                    style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={onViewFullBreakdown}
                    activeOpacity={0.7}
                >
                    <Text style={mfStyles.sectionLinkText}>View full breakdown →</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 9. components/moneyflow/presentation/CashActivitySection.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/presentation/CashActivitySection.js', `import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Plus, Search, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ChevronRight } from 'lucide-react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export default function CashActivitySection({
    activity,
    onAddCashActivity,
    onSelectTransaction,
    onViewAllActivity
}) {
    const [searchQuery, setSearchQuery] = useState('');

    if (!activity) return null;

    const filteredItems = searchQuery.trim()
        ? activity.recentList.filter(t => 
            t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : activity.recentList;

    return (
        <View style={mfStyles.sectionBlock}>
            <View style={mfStyles.sectionHeaderRow}>
                <Text style={mfStyles.sectionHeading}>CASH ACTIVITY</Text>
                {activity.totalCount > 0 && (
                    <Text style={{ fontSize: 12, color: MF_COLORS.textMuted }}>{activity.totalCount} items</Text>
                )}
            </View>

            {/* Quick Action: Add Cash Activity */}
            <TouchableOpacity
                style={mfStyles.activityAddBtn}
                onPress={onAddCashActivity}
                activeOpacity={0.8}
            >
                <Plus size={18} color="#FFFFFF" />
                <Text style={mfStyles.activityAddBtnText}>+ Add Cash Activity</Text>
            </TouchableOpacity>

            {/* Search Input */}
            <View style={mfStyles.searchBarContainer}>
                <Search size={14} color={MF_COLORS.textMuted} />
                <TextInput
                    style={mfStyles.searchInput}
                    placeholder="Search transactions..."
                    placeholderTextColor={MF_COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Transaction Items */}
            {filteredItems && filteredItems.length > 0 ? (
                filteredItems.map(tx => {
                    const isIncome = tx.type === 'INCOME';
                    const isTransfer = tx.type === 'TRANSFER';
                    const amountColor = isIncome ? MF_COLORS.incomeGreen : (isTransfer ? MF_COLORS.primaryBlue : MF_COLORS.expenseRed);
                    return (
                        <TouchableOpacity
                            key={tx.id}
                            style={mfStyles.activityRow}
                            onPress={() => onSelectTransaction && onSelectTransaction(tx)}
                            activeOpacity={0.7}
                        >
                            <View style={mfStyles.activityLeftInfo}>
                                <Text style={mfStyles.activityMerchantText} numberOfLines={1}>{tx.merchant}</Text>
                                <Text style={mfStyles.activityMetaText}>{tx.category} • {tx.account}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[mfStyles.activityAmountText, { color: amountColor }]}>{tx.amountFormatted}</Text>
                                {tx.date ? <Text style={mfStyles.activityMetaText}>{tx.date}</Text> : null}
                            </View>
                            <ChevronRight size={14} color={MF_COLORS.textMuted} style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    );
                })
            ) : (
                <Text style={{ fontSize: 13, color: MF_COLORS.textMuted, marginVertical: 8 }}>
                    No cash activity found.
                </Text>
            )}

            {onViewAllActivity && (
                <TouchableOpacity
                    style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={onViewAllActivity}
                    activeOpacity={0.7}
                >
                    <Text style={mfStyles.sectionLinkText}>View all activity →</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 10. components/moneyflow/modals/AddCashActivityModal.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/modals/AddCashActivityModal.js', `import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';
import { parseAndEvaluateArithmetic } from '../mathParser.js';

const CATEGORIES = ['Food', 'Rent', 'Travel', 'Shopping', 'Entertainment', 'Utilities', 'Salary', 'Investment', 'Other'];

export default function AddCashActivityModal({
    visible,
    onClose,
    onSave,
    accounts = []
}) {
    const [type, setType] = useState('EXPENSE'); // EXPENSE, INCOME, TRANSFER
    const [amountStr, setAmountStr] = useState('');
    const [merchant, setMerchant] = useState('');
    const [category, setCategory] = useState('Food');
    const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.name || 'HDFC Savings Account');
    const [toAccount, setToAccount] = useState(accounts[1]?.name || 'SBI Savings Account');
    const [note, setNote] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    if (!visible) return null;

    const handleSave = () => {
        try {
            setErrorMsg('');
            const evaluatedAmount = parseAndEvaluateArithmetic(amountStr);
            if (evaluatedAmount <= 0) {
                setErrorMsg('Please enter a valid positive amount.');
                return;
            }

            const newTx = {
                id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                amount: evaluatedAmount,
                type,
                category: type === 'TRANSFER' ? 'Transfer' : category,
                merchant: merchant.trim() || (type === 'TRANSFER' ? `Transfer to ${toAccount}` : 'General Cash Activity'),
                account: selectedAccount,
                toAccount: type === 'TRANSFER' ? toAccount : undefined,
                description: note.trim() || undefined,
                date: new Date().toISOString(),
                needsSort: false
            };

            onSave(newTx);
            // Reset
            setAmountStr('');
            setMerchant('');
            setNote('');
            setErrorMsg('');
            onClose();
        } catch (err) {
            setErrorMsg(err.message || 'Invalid amount expression');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={mfStyles.modalOverlay}>
                <View style={mfStyles.modalContent}>
                    <View style={mfStyles.modalHeader}>
                        <Text style={mfStyles.modalTitle}>Record Cash Activity</Text>
                        <TouchableOpacity onPress={onClose} style={mfStyles.modalCloseBtn}>
                            <X size={20} color={MF_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Type Toggle: Expense / Income / Transfer */}
                        <View style={{ flexDirection: 'row', backgroundColor: MF_COLORS.surfaceSubtle, borderRadius: 10, padding: 4, marginBottom: 16 }}>
                            {['EXPENSE', 'INCOME', 'TRANSFER'].map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 8,
                                        alignItems: 'center',
                                        borderRadius: 8,
                                        backgroundColor: type === t ? (t === 'INCOME' ? MF_COLORS.incomeGreen : (t === 'TRANSFER' ? MF_COLORS.primaryBlue : MF_COLORS.expenseRed)) : 'transparent'
                                    }}
                                    onPress={() => setType(t)}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: type === t ? '#FFFFFF' : MF_COLORS.textSecondary }}>
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Amount Input */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: MF_COLORS.textSecondary, marginBottom: 6 }}>
                            AMOUNT (₹)
                        </Text>
                        <TextInput
                            style={{
                                backgroundColor: MF_COLORS.surfaceSubtle,
                                borderWidth: 1,
                                borderColor: MF_COLORS.cardBorder,
                                borderRadius: 8,
                                padding: 12,
                                fontSize: 20,
                                fontWeight: '700',
                                color: MF_COLORS.textPrimary,
                                marginBottom: 12
                            }}
                            placeholder="e.g. 1500 or 1000+500"
                            placeholderTextColor={MF_COLORS.textMuted}
                            keyboardType="numeric"
                            value={amountStr}
                            onChangeText={setAmountStr}
                        />

                        {errorMsg ? (
                            <Text style={{ fontSize: 12, color: MF_COLORS.expenseRed, marginBottom: 10 }}>{errorMsg}</Text>
                        ) : null}

                        {/* Merchant / Description Input */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: MF_COLORS.textSecondary, marginBottom: 6 }}>
                            MERCHANT / PAYEE
                        </Text>
                        <TextInput
                            style={{
                                backgroundColor: MF_COLORS.surfaceSubtle,
                                borderWidth: 1,
                                borderColor: MF_COLORS.cardBorder,
                                borderRadius: 8,
                                padding: 12,
                                fontSize: 14,
                                color: MF_COLORS.textPrimary,
                                marginBottom: 12
                            }}
                            placeholder="e.g. Swiggy, Amazon, Salary"
                            placeholderTextColor={MF_COLORS.textMuted}
                            value={merchant}
                            onChangeText={setMerchant}
                        />

                        {/* Category Selector (if not transfer) */}
                        {type !== 'TRANSFER' && (
                            <>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: MF_COLORS.textSecondary, marginBottom: 6 }}>
                                    CATEGORY
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {CATEGORIES.map(cat => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={{
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 16,
                                                    backgroundColor: category === cat ? MF_COLORS.primaryBlue : MF_COLORS.surfaceSubtle,
                                                    borderWidth: 1,
                                                    borderColor: MF_COLORS.cardBorder
                                                }}
                                                onPress={() => setCategory(cat)}
                                            >
                                                <Text style={{ fontSize: 12, fontWeight: '600', color: category === cat ? '#FFFFFF' : MF_COLORS.textSecondary }}>
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </>
                        )}

                        {/* Account Selector */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: MF_COLORS.textSecondary, marginBottom: 6 }}>
                            {type === 'TRANSFER' ? 'FROM ACCOUNT' : 'ACCOUNT'}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                            {accounts.map(acc => (
                                <TouchableOpacity
                                    key={acc.id}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 8,
                                        backgroundColor: selectedAccount === acc.name ? MF_COLORS.primaryBlueSubtle : MF_COLORS.surfaceSubtle,
                                        borderWidth: 1,
                                        borderColor: selectedAccount === acc.name ? MF_COLORS.primaryBlue : MF_COLORS.cardBorder
                                    }}
                                    onPress={() => setSelectedAccount(acc.name)}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: selectedAccount === acc.name ? MF_COLORS.primaryBlue : MF_COLORS.textPrimary }}>
                                        {acc.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: MF_COLORS.primaryBlue,
                                paddingVertical: 14,
                                borderRadius: 10,
                                alignItems: 'center',
                                marginTop: 8,
                                marginBottom: 20
                            }}
                            onPress={handleSave}
                        >
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Save Cash Activity</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 11. components/moneyflow/modals/TransactionDetailModal.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/modals/TransactionDetailModal.js', `import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { X, Trash2, CheckCircle2 } from 'lucide-react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export default function TransactionDetailModal({
    visible,
    transaction,
    onClose,
    onDelete,
    onApproveReview
}) {
    if (!visible || !transaction) return null;

    const isIncome = transaction.type === 'INCOME';
    const isTransfer = transaction.type === 'TRANSFER';
    const amountColor = isIncome ? MF_COLORS.incomeGreen : (isTransfer ? MF_COLORS.primaryBlue : MF_COLORS.expenseRed);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={mfStyles.modalOverlay}>
                <View style={mfStyles.modalContent}>
                    <View style={mfStyles.modalHeader}>
                        <Text style={mfStyles.modalTitle}>Transaction Details</Text>
                        <TouchableOpacity onPress={onClose} style={mfStyles.modalCloseBtn}>
                            <X size={20} color={MF_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Amount & Merchant Hero */}
                    <View style={{ alignItems: 'center', marginVertical: 14 }}>
                        <Text style={{ fontSize: 28, fontWeight: '800', color: amountColor }}>
                            {transaction.amountFormatted || `₹${transaction.amount}`}
                        </Text>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: MF_COLORS.textPrimary, marginTop: 4 }}>
                            {transaction.merchant}
                        </Text>
                        <Text style={{ fontSize: 12, color: MF_COLORS.textMuted, marginTop: 2 }}>
                            {transaction.category} • {transaction.date}
                        </Text>
                    </View>

                    {/* Details Table */}
                    <View style={{ backgroundColor: MF_COLORS.surfaceSubtle, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text style={{ fontSize: 13, color: MF_COLORS.textSecondary }}>Account</Text>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: MF_COLORS.textPrimary }}>{transaction.account}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text style={{ fontSize: 13, color: MF_COLORS.textSecondary }}>Type</Text>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: MF_COLORS.textPrimary }}>{transaction.type}</Text>
                        </View>
                        {transaction.description ? (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                                <Text style={{ fontSize: 13, color: MF_COLORS.textSecondary }}>Note</Text>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: MF_COLORS.textPrimary }}>{transaction.description}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                        {transaction.needsSort && onApproveReview && (
                            <TouchableOpacity
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: MF_COLORS.incomeGreen, paddingVertical: 12, borderRadius: 8 }}
                                onPress={() => { onApproveReview(transaction.id); onClose(); }}
                            >
                                <CheckCircle2 size={16} color="#FFFFFF" />
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Confirm & Add</Text>
                            </TouchableOpacity>
                        )}
                        {onDelete && (
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: MF_COLORS.expenseRedSubtle, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 }}
                                onPress={() => { onDelete(transaction.id); onClose(); }}
                            >
                                <Trash2 size={16} color={MF_COLORS.expenseRed} />
                                <Text style={{ fontSize: 14, fontWeight: '700', color: MF_COLORS.expenseRed }}>Delete</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 12. components/moneyflow/modals/PeriodSelectorModal.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/modals/PeriodSelectorModal.js', `import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

const PERIOD_OPTIONS = [
    { id: 'month', label: 'This Month', subtitle: 'Current calendar month' },
    { id: 'quarter', label: 'This Quarter', subtitle: 'Current quarter to date' },
    { id: 'year', label: 'This Year', subtitle: 'Current calendar year' },
    { id: 'week', label: 'This Week', subtitle: 'Monday to Sunday' },
    { id: 'today', label: 'Today', subtitle: 'Past 24 hours' }
];

export default function PeriodSelectorModal({
    visible,
    selectedPeriod,
    onSelectPeriod,
    onClose
}) {
    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={mfStyles.modalOverlay}>
                <View style={mfStyles.modalContent}>
                    <View style={mfStyles.modalHeader}>
                        <Text style={mfStyles.modalTitle}>Select Period</Text>
                        <TouchableOpacity onPress={onClose} style={mfStyles.modalCloseBtn}>
                            <X size={20} color={MF_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ gap: 8, marginBottom: 16 }}>
                        {PERIOD_OPTIONS.map(opt => {
                            const isSelected = selectedPeriod === opt.id;
                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: 14,
                                        borderRadius: 10,
                                        backgroundColor: isSelected ? MF_COLORS.primaryBlueSubtle : MF_COLORS.surfaceSubtle,
                                        borderWidth: 1,
                                        borderColor: isSelected ? MF_COLORS.primaryBlue : MF_COLORS.cardBorder
                                    }}
                                    onPress={() => { onSelectPeriod(opt.id); onClose(); }}
                                >
                                    <View>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? MF_COLORS.primaryBlue : MF_COLORS.textPrimary }}>
                                            {opt.label}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: MF_COLORS.textMuted, marginTop: 2 }}>
                                            {opt.subtitle}
                                        </Text>
                                    </View>
                                    {isSelected && <Check size={18} color={MF_COLORS.primaryBlue} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 13. components/moneyflow/modals/ReserveCalculationModal.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/modals/ReserveCalculationModal.js', `import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, ShieldCheck } from 'lucide-react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export default function ReserveCalculationModal({
    visible,
    reserveData,
    onClose
}) {
    if (!visible || !reserveData) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={mfStyles.modalOverlay}>
                <View style={mfStyles.modalContent}>
                    <View style={mfStyles.modalHeader}>
                        <Text style={mfStyles.modalTitle}>Emergency Runway Calculation</Text>
                        <TouchableOpacity onPress={onClose} style={mfStyles.modalCloseBtn}>
                            <X size={20} color={MF_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Formula Card */}
                        <View style={{ backgroundColor: MF_COLORS.surfaceSubtle, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: MF_COLORS.textMuted, textTransform: 'uppercase' }}>
                                DETERMINISTIC FORMULA
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: MF_COLORS.textPrimary, marginTop: 6 }}>
                                Designated Reserve ÷ Essential Monthly Burn = Runway
                            </Text>
                            <Text style={{ fontSize: 13, color: MF_COLORS.primaryBlue, marginTop: 4 }}>
                                {reserveData.currentReserveFormatted} ÷ {reserveData.essentialMonthlyBurnFormatted} = {reserveData.runwayMonthsFormatted}
                            </Text>
                        </View>

                        {/* Breakdown Metrics */}
                        <View style={{ backgroundColor: MF_COLORS.surfaceSubtle, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                                <Text style={{ fontSize: 13, color: MF_COLORS.textSecondary }}>Current Designated Reserve</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: MF_COLORS.textPrimary }}>{reserveData.currentReserveFormatted}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                                <Text style={{ fontSize: 13, color: MF_COLORS.textSecondary }}>Essential Monthly Burn</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: MF_COLORS.textPrimary }}>{reserveData.essentialMonthlyBurnFormatted}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                                <Text style={{ fontSize: 13, color: MF_COLORS.textSecondary }}>Target (3 Months Minimum)</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: MF_COLORS.incomeGreen }}>{reserveData.minTargetAmountFormatted}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                                <Text style={{ fontSize: 13, color: MF_COLORS.textSecondary }}>Target Status</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: reserveData.statusColor || MF_COLORS.warningYellow }}>{reserveData.statusLabel}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={{ backgroundColor: MF_COLORS.primaryBlue, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 }}
                            onPress={onClose}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Done</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 14. components/moneyflow/modals/SpendingBreakdownModal.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/modals/SpendingBreakdownModal.js', `import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export default function SpendingBreakdownModal({
    visible,
    spendingData,
    onClose
}) {
    if (!visible || !spendingData) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={mfStyles.modalOverlay}>
                <View style={mfStyles.modalContent}>
                    <View style={mfStyles.modalHeader}>
                        <Text style={mfStyles.modalTitle}>Spending Breakdown</Text>
                        <TouchableOpacity onPress={onClose} style={mfStyles.modalCloseBtn}>
                            <X size={20} color={MF_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={{ fontSize: 13, color: MF_COLORS.textSecondary, marginBottom: 12 }}>
                            Total Spending: <Text style={{ fontWeight: '700', color: MF_COLORS.textPrimary }}>{spendingData.totalSpendingFormatted}</Text>
                        </Text>

                        {spendingData.categories && spendingData.categories.map((cat, idx) => (
                            <View key={idx} style={[mfStyles.spendingRow, { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: MF_COLORS.divider }]}>
                                <Text style={[mfStyles.spendingCategory, { width: 110 }]} numberOfLines={1}>{cat.category}</Text>
                                <View style={mfStyles.spendingBarContainer}>
                                    <View style={[mfStyles.spendingBarFill, { width: `${Math.min(100, Math.max(4, cat.percentage))}%`, backgroundColor: cat.color || MF_COLORS.primaryBlue }]} />
                                </View>
                                <Text style={mfStyles.spendingAmount}>{cat.amountFormatted}</Text>
                                <Text style={mfStyles.spendingPercent}>{cat.percentage}%</Text>
                            </View>
                        ))}

                        <TouchableOpacity
                            style={{ backgroundColor: MF_COLORS.primaryBlue, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 20, marginBottom: 20 }}
                            onPress={onClose}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Close</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 15. components/moneyflow/MoneyFlowView.js
// ─────────────────────────────────────────────────────────────────────────────
writeFile('components/moneyflow/MoneyFlowView.js', `import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StatusBar, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { mfStyles, MF_COLORS } from './moneyFlowStyles.js';
import { buildMoneyFlowViewModel } from './moneyFlowViewModel.js';
import { DEFAULT_AUTHORITATIVE_ACCOUNTS, UPCOMING_OBLIGATIONS_MOCK } from './moneyFlowPresentationAdapter.js';

import MoneyFlowHeader from './presentation/MoneyFlowHeader.js';
import WhereDidMyCashGoSection from './presentation/WhereDidMyCashGoSection.js';
import PeriodStatementSection from './presentation/PeriodStatementSection.js';
import MoneyFlowAttentionSection from './presentation/MoneyFlowAttentionSection.js';
import SpendingBreakdownSection from './presentation/SpendingBreakdownSection.js';
import CashActivitySection from './presentation/CashActivitySection.js';

import AddCashActivityModal from './modals/AddCashActivityModal.js';
import TransactionDetailModal from './modals/TransactionDetailModal.js';
import PeriodSelectorModal from './modals/PeriodSelectorModal.js';
import ReserveCalculationModal from './modals/ReserveCalculationModal.js';
import SpendingBreakdownModal from './modals/SpendingBreakdownModal.js';

const STORAGE_KEY_TRANSACTIONS = '@finlife_money_flow_transactions_v2';
const STORAGE_KEY_ACCOUNTS = '@finlife_money_flow_accounts_v2';
const STORAGE_KEY_DESIGNATED = '@finlife_money_flow_designated_v2';

const INITIAL_SEED_TRANSACTIONS = [
    { id: 'tx_seed_1', amount: 191000, type: 'INCOME', category: 'Salary', merchant: 'Salary', account: 'HDFC Savings Account', date: '2026-09-01' },
    { id: 'tx_seed_2', amount: 56000, type: 'EXPENSE', category: 'Rent', merchant: 'Prestige Society', account: 'HDFC Savings Account', date: '2026-09-02' },
    { id: 'tx_seed_3', amount: 14450, type: 'EXPENSE', category: 'Food', merchant: 'Swiggy', account: 'HDFC Savings Account', date: '2026-09-03' },
    { id: 'tx_seed_4', amount: 4200, type: 'EXPENSE', category: 'Travel', merchant: 'Uber', account: 'SBI Savings Account', date: '2026-09-03' },
    { id: 'tx_seed_5', amount: 2250, type: 'EXPENSE', category: 'Shopping', merchant: 'Amazon', account: 'HDFC Savings Account', date: '2026-09-03' },
    { id: 'tx_seed_6', amount: 999, type: 'EXPENSE', category: 'Entertainment', merchant: 'Netflix', account: 'HDFC Savings Account', date: '2026-09-04' },
    { id: 'tx_seed_7', amount: 450, type: 'EXPENSE', category: 'Food', merchant: 'Starbucks', account: 'HDFC Savings Account', date: '2026-09-04' }
];

export default function MoneyFlowView({ onOpenDrawer }) {
    const [transactions, setTransactions] = useState(INITIAL_SEED_TRANSACTIONS);
    const [accounts, setAccounts] = useState(DEFAULT_AUTHORITATIVE_ACCOUNTS);
    const [designatedAccountIds, setDesignatedAccountIds] = useState(['acc_hdfc_sb', 'acc_sbi_sb']);
    const [periodType, setPeriodType] = useState('month');
    const [customRange, setCustomRange] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Modal Visibility States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [showReserveModal, setShowReserveModal] = useState(false);
    const [showSpendingModal, setShowSpendingModal] = useState(false);

    // Load persisted state on mount
    useEffect(() => {
        (async () => {
            try {
                const storedTx = await AsyncStorage.getItem(STORAGE_KEY_TRANSACTIONS);
                if (storedTx) {
                    const parsed = JSON.parse(storedTx);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setTransactions(parsed);
                    }
                }
                const storedAcc = await AsyncStorage.getItem(STORAGE_KEY_ACCOUNTS);
                if (storedAcc) {
                    const parsed = JSON.parse(storedAcc);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setAccounts(parsed);
                    }
                }
                const storedDes = await AsyncStorage.getItem(STORAGE_KEY_DESIGNATED);
                if (storedDes) {
                    const parsed = JSON.parse(storedDes);
                    if (Array.isArray(parsed)) {
                        setDesignatedAccountIds(parsed);
                    }
                }
            } catch (err) {
                console.warn('[MoneyFlowView] Failed to restore persisted state:', err);
            }
        })();
    }, []);

    // Save helper
    const persistTransactions = async (newTxList) => {
        setTransactions(newTxList);
        try {
            await AsyncStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(newTxList));
        } catch (e) {
            console.warn('[MoneyFlowView] Error saving transactions:', e);
        }
    };

    // Build Authoritative ViewModel (MONEYFLOW-VIEW-01 .. 07)
    const viewModel = useMemo(() => {
        return buildMoneyFlowViewModel({
            transactions,
            accounts,
            designatedAccountIds,
            periodType,
            referenceDate: new Date().toISOString(),
            customRange,
            selectedYear: new Date().getFullYear(),
            obligations: UPCOMING_OBLIGATIONS_MOCK,
            stateStatus: 'READY'
        });
    }, [transactions, accounts, designatedAccountIds, periodType, customRange]);

    // Handlers
    const handleAddTransaction = useCallback((newTx) => {
        persistTransactions([newTx, ...transactions]);
    }, [transactions]);

    const handleDeleteTransaction = useCallback((txId) => {
        persistTransactions(transactions.filter(t => t.id !== txId));
    }, [transactions]);

    const handleApproveReview = useCallback((txId) => {
        persistTransactions(transactions.map(t => t.id === txId ? { ...t, needsSort: false } : t));
    }, [transactions]);

    const handleSelectTransaction = useCallback((tx) => {
        setSelectedTransaction(tx);
        setShowDetailModal(true);
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500);
    }, []);

    return (
        <SafeAreaView style={mfStyles.container}>
            <StatusBar barStyle="light-content" backgroundColor={MF_COLORS.bg} />
            <ScrollView
                style={mfStyles.container}
                contentContainerStyle={mfStyles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={MF_COLORS.primaryBlue}
                        colors={[MF_COLORS.primaryBlue]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <MoneyFlowHeader
                    period={viewModel.period}
                    onOpenDrawer={onOpenDrawer}
                    onOpenPeriodSelector={() => setShowPeriodModal(true)}
                />

                {/* Layer 1: Where Did My Cash Go? */}
                <WhereDidMyCashGoSection
                    cashPosition={viewModel.cashPosition}
                    onViewAllAccounts={() => {}}
                />

                {/* Layer 2: Period Financial Statement */}
                <PeriodStatementSection
                    periodStatement={viewModel.periodStatement}
                    onViewTrend={() => {}}
                />

                {/* Layer 3: Needs Your Attention */}
                <MoneyFlowAttentionSection
                    attention={viewModel.attention}
                    onOpenReserveDetail={() => setShowReserveModal(true)}
                    onOpenObligationDetail={() => {}}
                />

                {/* Layer 4: Spending Breakdown */}
                <SpendingBreakdownSection
                    spending={viewModel.spending}
                    onViewFullBreakdown={() => setShowSpendingModal(true)}
                />

                {/* Layer 5: Cash Activity */}
                <CashActivitySection
                    activity={viewModel.activity}
                    onAddCashActivity={() => setShowAddModal(true)}
                    onSelectTransaction={handleSelectTransaction}
                    onViewAllActivity={() => {}}
                />
            </ScrollView>

            {/* Modals */}
            <AddCashActivityModal
                visible={showAddModal}
                accounts={viewModel.cashPosition.accounts}
                onClose={() => setShowAddModal(false)}
                onSave={handleAddTransaction}
            />

            <TransactionDetailModal
                visible={showDetailModal}
                transaction={selectedTransaction}
                onClose={() => { setShowDetailModal(false); setSelectedTransaction(null); }}
                onDelete={handleDeleteTransaction}
                onApproveReview={handleApproveReview}
            />

            <PeriodSelectorModal
                visible={showPeriodModal}
                selectedPeriod={periodType}
                onSelectPeriod={setPeriodType}
                onClose={() => setShowPeriodModal(false)}
            />

            <ReserveCalculationModal
                visible={showReserveModal}
                reserveData={viewModel.attention.reserve}
                onClose={() => setShowReserveModal(false)}
            />

            <SpendingBreakdownModal
                visible={showSpendingModal}
                spendingData={viewModel.spending}
                onClose={() => setShowSpendingModal(false)}
            />
        </SafeAreaView>
    );
}
`);

console.log('✓ All Money Flow presentation modules built successfully!');
`);