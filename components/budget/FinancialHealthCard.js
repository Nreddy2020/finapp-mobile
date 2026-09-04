import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CheckCircle2, AlertCircle } from 'lucide-react-native';

export default function FinancialHealthCard({ financialHealth, onSeeDetails }) {
    if (!financialHealth) return null;

    const size = 160;
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    // Progress for available cash (arbitrary visual target 70%)
    const progress = 0.72;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Text style={styles.cardTitle}>Financial Health</Text>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{financialHealth.status || 'STABLE'}</Text>
                </View>
            </View>
            <Text style={styles.subtitle}>{financialHealth.statusLabel || "You're on track this month!"}</Text>

            {/* Center Donut Ring */}
            <View style={styles.donutContainer}>
                <View style={{ width: size, height: size, position: 'relative' }}>
                    <Svg width={size} height={size}>
                        {/* Background track */}
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke="#1E293B"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        {/* Animated/Active stroke */}
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke="#10B981"
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${circumference} ${circumference}`}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="none"
                            transform={`rotate(-90 ${center} ${center})`}
                        />
                    </Svg>
                    {/* Inner Label */}
                    <View style={styles.donutInner}>
                        <Text style={styles.donutSub}>Available</Text>
                        <Text style={styles.donutMain}>{financialHealth.formattedAvailableCash}</Text>
                    </View>
                </View>
            </View>

            {/* Safe to spend today & Projected Month-end */}
            <View style={styles.metricsRow}>
                <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Safe to spend today</Text>
                    <Text style={[styles.metricValue, { color: '#10B981' }]}>
                        {financialHealth.formattedSafeToSpendToday}
                    </Text>
                    <Text style={styles.metricNote}>
                        Total: {financialHealth.formattedSafeToSpendUntilMonthEnd}
                    </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Projected month-end balance</Text>
                    <Text style={styles.metricValue}>
                        {financialHealth.formattedProjectedMonthEndBalance}
                    </Text>
                    <Text style={styles.metricNote}>Healthy surplus</Text>
                </View>
            </View>

            {/* Breakdown Row: Income | Spent | Committed */}
            <View style={styles.summaryBar}>
                <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>Income</Text>
                    <Text style={styles.summaryAmount}>{financialHealth.formattedIncome}</Text>
                </View>
                <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>Spent</Text>
                    <Text style={styles.summaryAmount}>{financialHealth.formattedSpent}</Text>
                </View>
                <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>Committed</Text>
                    <Text style={styles.summaryAmount}>{financialHealth.formattedCommitted}</Text>
                </View>
            </View>

            {/* Essentials Pill */}
            <View style={styles.statusPill}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={styles.statusPillText}>
                    {financialHealth.essentialsStatusText || 'Essentials are covered. You can spend comfortably.'}
                </Text>
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
        marginBottom: 4
    },
    cardTitle: {
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: '700'
    },
    statusBadge: {
        backgroundColor: '#10B98120',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#10B98140'
    },
    statusText: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    subtitle: {
        color: '#94A3B8',
        fontSize: 13,
        marginBottom: 16
    },
    donutContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12
    },
    donutInner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center'
    },
    donutSub: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '500'
    },
    donutMain: {
        color: '#F8FAFC',
        fontSize: 22,
        fontWeight: '800',
        marginTop: 2
    },
    metricsRow: {
        flexDirection: 'row',
        backgroundColor: '#1E293B50',
        borderRadius: 14,
        padding: 14,
        marginTop: 12,
        alignItems: 'center'
    },
    metricCol: {
        flex: 1,
        alignItems: 'center'
    },
    metricDivider: {
        width: 1,
        height: 36,
        backgroundColor: '#334155'
    },
    metricLabel: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 4
    },
    metricValue: {
        color: '#F8FAFC',
        fontSize: 17,
        fontWeight: '700'
    },
    metricNote: {
        color: '#64748B',
        fontSize: 10,
        marginTop: 2
    },
    summaryBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#1E293B'
    },
    summaryCol: {
        alignItems: 'center',
        flex: 1
    },
    summaryLabel: {
        color: '#64748B',
        fontSize: 11,
        marginBottom: 2
    },
    summaryAmount: {
        color: '#E2E8F0',
        fontSize: 13,
        fontWeight: '600'
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B98115',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: '#10B98130'
    },
    statusPillText: {
        color: '#A7F3D0',
        fontSize: 12,
        fontWeight: '500',
        flex: 1
    }
});
