import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, ShieldCheck, AlertCircle, Clock, Plus, Sparkles } from 'lucide-react-native';
import { formatINR } from './p2pPresentationAdapter';

export default function P2POverviewSection({
    metrics,
    onAddLoan,
    onNavigateTab,
    onViewIntelligence
}) {
    if (!metrics) return null;

    return (
        <View style={styles.container}>
            {/* Header Title */}
            <View style={styles.headerRow}>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 18 }}>🤝</Text>
                        <Text style={styles.title}>P2P Loans</Text>
                    </View>
                    <Text style={styles.subtitle}>Money you've lent or borrowed</Text>
                </View>
                <TouchableOpacity
                    style={styles.addLoanBtn}
                    activeOpacity={0.8}
                    onPress={onAddLoan}
                >
                    <Plus size={14} color="#FFF" />
                    <Text style={styles.addLoanBtnText}>Add Loan</Text>
                </TouchableOpacity>
            </View>

            {/* Position Card */}
            <View style={styles.positionCard}>
                <View style={styles.positionCardHeader}>
                    <Text style={styles.positionCardTitle}>P2P POSITION</Text>
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>AUDITED</Text>
                    </View>
                </View>

                {/* 3-Column Position Metric Grid */}
                <View style={styles.metricsGrid}>
                    <TouchableOpacity
                        style={styles.metricCol}
                        activeOpacity={0.7}
                        onPress={() => onNavigateTab && onNavigateTab('GIVEN')}
                    >
                        <Text style={styles.metricLabel}>Receivable</Text>
                        <Text style={[styles.metricVal, { color: '#10B981' }]}>{metrics.totalReceivableFormatted}</Text>
                        <Text style={styles.metricSub}>{metrics.totalReceivableFullFormatted}</Text>
                    </TouchableOpacity>

                    <View style={styles.gridDivider} />

                    <TouchableOpacity
                        style={styles.metricCol}
                        activeOpacity={0.7}
                        onPress={() => onNavigateTab && onNavigateTab('TAKEN')}
                    >
                        <Text style={styles.metricLabel}>Payable</Text>
                        <Text style={[styles.metricVal, { color: '#EF4444' }]}>{metrics.totalPayableFormatted}</Text>
                        <Text style={styles.metricSub}>{metrics.totalPayableFullFormatted}</Text>
                    </TouchableOpacity>

                    <View style={styles.gridDivider} />

                    <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Net Position</Text>
                        <Text style={[styles.metricVal, { color: metrics.netPositionColor }]}>{metrics.netPositionFormatted}</Text>
                        <Text style={styles.metricSub}>{metrics.netPosition >= 0 ? 'Net Asset' : 'Net Liability'}</Text>
                    </View>
                </View>
            </View>

            {/* Safety Indicators Grid (Upcoming Receipts, Payments, Overdue, Next 30D) */}
            <View style={styles.safetyGrid}>
                <View style={styles.safetyCard}>
                    <View style={styles.safetyIconRow}>
                        <ArrowDownLeft size={14} color="#10B981" />
                        <Text style={styles.safetyLabel}>Upcoming Receipts</Text>
                    </View>
                    <Text style={[styles.safetyVal, { color: '#10B981' }]}>{metrics.upcomingReceiptsFormatted}</Text>
                    <Text style={styles.safetySub}>Next 30 days</Text>
                </View>

                <View style={styles.safetyCard}>
                    <View style={styles.safetyIconRow}>
                        <ArrowUpRight size={14} color="#F97316" />
                        <Text style={styles.safetyLabel}>Upcoming Payments</Text>
                    </View>
                    <Text style={[styles.safetyVal, { color: '#F97316' }]}>{metrics.upcomingPaymentsFormatted}</Text>
                    <Text style={styles.safetySub}>Next 30 days</Text>
                </View>
            </View>

            <View style={styles.safetyGrid}>
                <View style={[styles.safetyCard, metrics.overdueAmount > 0 && { borderColor: '#EF444450', backgroundColor: '#7F1D1D20' }]}>
                    <View style={styles.safetyIconRow}>
                        <AlertCircle size={14} color={metrics.overdueAmount > 0 ? '#EF4444' : '#71717A'} />
                        <Text style={styles.safetyLabel}>Overdue</Text>
                    </View>
                    <Text style={[styles.safetyVal, { color: metrics.overdueAmount > 0 ? '#EF4444' : '#FFF' }]}>
                        {metrics.overdueAmountFormatted}
                    </Text>
                    <Text style={styles.safetySub}>{metrics.overdueAmount > 0 ? 'Action required' : 'Clean record'}</Text>
                </View>

                <View style={styles.safetyCard}>
                    <View style={styles.safetyIconRow}>
                        <Clock size={14} color="#818CF8" />
                        <Text style={styles.safetyLabel}>Due Next 30 Days</Text>
                    </View>
                    <Text style={[styles.safetyVal, { color: '#818CF8' }]}>{metrics.dueNext30DaysFormatted}</Text>
                    <Text style={styles.safetySub}>Cash impact</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingHorizontal: 4
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.3
    },
    subtitle: {
        fontSize: 12,
        color: '#71717A',
        marginTop: 2
    },
    addLoanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#4F46E5',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        shadowColor: '#4F46E5',
        shadowOpacity: 0.3,
        shadowRadius: 6
    },
    addLoanBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    positionCard: {
        backgroundColor: '#0F1123',
        borderColor: '#2A2B52',
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12
    },
    positionCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14
    },
    positionCardTitle: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.8
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#10B98120',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    liveDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#10B981'
    },
    liveText: {
        color: '#10B981',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5
    },
    metricsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    metricCol: {
        flex: 1,
        alignItems: 'center'
    },
    metricLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 2
    },
    metricVal: {
        fontSize: 17,
        fontWeight: '900'
    },
    metricSub: {
        color: '#64748B',
        fontSize: 9,
        marginTop: 2
    },
    gridDivider: {
        width: 1,
        height: 36,
        backgroundColor: '#2A2B52'
    },
    safetyGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10
    },
    safetyCard: {
        flex: 1,
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12
    },
    safetyIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6
    },
    safetyLabel: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700'
    },
    safetyVal: {
        fontSize: 16,
        fontWeight: '900'
    },
    safetySub: {
        color: '#64748B',
        fontSize: 10,
        marginTop: 2
    }
});
