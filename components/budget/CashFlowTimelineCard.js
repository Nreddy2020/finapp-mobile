import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, ChevronRight, Home, CreditCard, GraduationCap, Shield, Zap, Wallet } from 'lucide-react-native';
import { formatCurrency } from '../../services/budget/budgetViewModel.js';

const COMMITMENT_ICONS = {
    'Rent': Home,
    'Personal EMI': CreditCard,
    'School Fees': GraduationCap,
    'Insurance': Shield,
    'Utilities': Zap,
    'Salary Expected': Wallet
};

export default function CashFlowTimelineCard({ cashFlow, onSelectLowBalance, onSelectCommitment, onSeeAll }) {
    if (!cashFlow) return null;

    const buckets = cashFlow.timelineBuckets || [];
    const maxVal = 60000; // Visual scale max

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Text style={styles.cardTitle}>Cash Flow Timeline</Text>
                <View style={styles.dropdownBadge}>
                    <Text style={styles.dropdownText}>This Month ▼</Text>
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendLabel}>Income</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.legendLabel}>Expenses</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.legendLabel}>Committed</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.legendLabel}>Projected</Text>
                </View>
            </View>

            {/* Bar Chart Area */}
            <View style={styles.chartContainer}>
                {/* Y-axis labels */}
                <View style={styles.yAxisCol}>
                    <Text style={styles.axisLabel}>60K</Text>
                    <Text style={styles.axisLabel}>30K</Text>
                    <Text style={styles.axisLabel}>0</Text>
                </View>

                {/* Bars */}
                <View style={styles.barsArea}>
                    {buckets.map((b, idx) => {
                        const incHeight = Math.min(80, (b.income / maxVal) * 80);
                        const expHeight = Math.min(80, (b.expenses / maxVal) * 80);
                        const comHeight = Math.min(80, (b.committed / maxVal) * 80);
                        const prjHeight = Math.min(80, (b.projected / maxVal) * 80);

                        return (
                            <View key={idx} style={styles.barGroup}>
                                <View style={styles.barsRow}>
                                    {incHeight > 0 && <View style={[styles.singleBar, { height: incHeight, backgroundColor: '#10B981' }]} />}
                                    {expHeight > 0 && <View style={[styles.singleBar, { height: expHeight, backgroundColor: '#EF4444' }]} />}
                                    {comHeight > 0 && <View style={[styles.singleBar, { height: comHeight, backgroundColor: '#F59E0B' }]} />}
                                    {prjHeight > 0 && <View style={[styles.singleBar, { height: prjHeight, backgroundColor: '#3B82F6' }]} />}
                                </View>
                                <Text style={styles.barDateLabel}>{b.label}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Low Balance Warning Banner */}
            {cashFlow.hasLowBalanceRisk && (
                <TouchableOpacity
                    style={styles.lowBalanceBanner}
                    onPress={onSelectLowBalance}
                    activeOpacity={0.8}
                >
                    <AlertCircle size={18} color="#F59E0B" />
                    <Text style={styles.lowBalanceText}>{cashFlow.lowBalancePeriodLabel || 'Low balance period: 12-18 Sep'}</Text>
                    <ChevronRight size={16} color="#F59E0B" />
                </TouchableOpacity>
            )}

            {/* Upcoming Commitments Header */}
            <View style={[styles.headerRow, { marginTop: 20, marginBottom: 12 }]}>
                <Text style={styles.cardTitle}>Upcoming Commitments</Text>
                <TouchableOpacity onPress={onSeeAll}>
                    <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
            </View>

            {/* Commitments List */}
            <View style={styles.commitmentsList}>
                {(cashFlow.commitments || []).map((c, i) => {
                    const IconComp = COMMITMENT_ICONS[c.title] || Wallet;
                    const dateParts = c.dueDate ? c.dueDate.split('-') : ['2026', '09', '05'];
                    const dayNum = String(c.day || dateParts[2]).padStart(2, '0');

                    return (
                        <TouchableOpacity
                            key={c.id || i}
                            style={styles.commitmentRow}
                            onPress={() => onSelectCommitment && onSelectCommitment(c)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.dateBadge}>
                                <Text style={styles.dateMonthText}>SEP</Text>
                                <Text style={styles.dateDayText}>{dayNum}</Text>
                            </View>

                            <View style={styles.commitmentInfo}>
                                <Text style={styles.commitmentTitle}>{c.title}</Text>
                                <Text style={styles.commitmentTag}>{c.tag || c.category}</Text>
                            </View>

                            <View style={styles.amountCol}>
                                <Text style={[styles.commitmentAmount, c.isIncome && { color: '#10B981' }]}>
                                    {formatCurrency(c.amount)}
                                </Text>
                            </View>

                            <ChevronRight size={16} color="#64748B" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0F172A',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginHorizontal: 16,
        marginBottom: 16
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    cardTitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700'
    },
    dropdownBadge: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    dropdownText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '500'
    },
    legendRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3
    },
    legendLabel: {
        color: '#94A3B8',
        fontSize: 11
    },
    chartContainer: {
        flexDirection: 'row',
        height: 100,
        alignItems: 'flex-end',
        paddingBottom: 4
    },
    yAxisCol: {
        height: 80,
        justifyContent: 'space-between',
        paddingRight: 8
    },
    axisLabel: {
        color: '#475569',
        fontSize: 10
    },
    barsArea: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 80,
        borderBottomWidth: 1,
        borderBottomColor: '#334155'
    },
    barGroup: {
        alignItems: 'center',
        flex: 1
    },
    barsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
        height: 80
    },
    singleBar: {
        width: 4,
        borderRadius: 2
    },
    barDateLabel: {
        color: '#64748B',
        fontSize: 10,
        marginTop: 6
    },
    lowBalanceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B15',
        borderRadius: 12,
        padding: 12,
        marginTop: 14,
        borderWidth: 1,
        borderColor: '#F59E0B30',
        gap: 8
    },
    lowBalanceText: {
        color: '#FDE68A',
        fontSize: 12,
        fontWeight: '600',
        flex: 1
    },
    seeAllText: {
        color: '#3B82F6',
        fontSize: 13,
        fontWeight: '600'
    },
    commitmentsList: {
        gap: 8
    },
    commitmentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B40',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    dateBadge: {
        width: 42,
        height: 42,
        borderRadius: 8,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    dateMonthText: {
        color: '#3B82F6',
        fontSize: 9,
        fontWeight: '700'
    },
    dateDayText: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700'
    },
    commitmentInfo: {
        flex: 1
    },
    commitmentTitle: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2
    },
    commitmentTag: {
        color: '#94A3B8',
        fontSize: 11
    },
    amountCol: {
        alignItems: 'flex-end'
    },
    commitmentAmount: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700'
    }
});
