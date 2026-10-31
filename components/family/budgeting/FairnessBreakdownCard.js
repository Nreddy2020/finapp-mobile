import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react-native';

export default function FairnessBreakdownCard({ fairnessBreakdown, currency, reviewRequired }) {
    if (reviewRequired || !fairnessBreakdown || fairnessBreakdown.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Users size={14} color="#9CA3AF" />
                    <Text style={styles.headerTitle}>Member Contribution Fairness</Text>
                </View>
                <View style={styles.suppressedBanner}>
                    <AlertCircle size={14} color="#F59E0B" />
                    <Text style={styles.suppressedText}>
                        Fairness calculations suppressed because member allocations require review.
                    </Text>
                </View>
            </View>
        );
    }

    const formatAmount = (val) => {
        const sym = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : `${currency} `);
        return `${sym}${Math.abs(val || 0).toLocaleString()}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Users size={14} color="#60A5FA" />
                <Text style={styles.headerTitle}>Member Contribution Fairness</Text>
                <Text style={styles.subNote}>Target vs Paid</Text>
            </View>

            <View style={styles.list}>
                {fairnessBreakdown.map((item) => {
                    const isOwed = item.netBalanceDelta > 0;
                    const isOwes = item.netBalanceDelta < 0;
                    const isEven = item.netBalanceDelta === 0;

                    return (
                        <View key={item.personId} style={styles.memberRow}>
                            <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>{item.personName}</Text>
                                <Text style={styles.memberSplit}>
                                    Target {item.targetRatioPercent}% • Share {formatAmount(item.expectedShareAmount)}
                                </Text>
                            </View>

                            <View style={styles.amountsCol}>
                                <Text style={styles.actualAmount}>Paid: {formatAmount(item.actualContributedAmount)}</Text>
                                <View style={styles.deltaBadge}>
                                    {isOwed && <ArrowUpRight size={12} color="#10B981" />}
                                    {isOwes && <ArrowDownLeft size={12} color="#EF4444" />}
                                    <Text style={[
                                        styles.deltaText,
                                        isOwed && { color: '#10B981' },
                                        isOwes && { color: '#EF4444' },
                                        isEven && { color: '#9CA3AF' }
                                    ]}>
                                        {isOwed ? `+${formatAmount(item.netBalanceDelta)}` :
                                         isOwes ? `-${formatAmount(item.netBalanceDelta)}` : 'Balanced'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#232330',
        borderRadius: 12,
        padding: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10
    },
    headerTitle: {
        color: '#E2E8F0',
        fontSize: 12,
        fontWeight: '700',
        flex: 1
    },
    subNote: {
        color: '#94A3B8',
        fontSize: 10
    },
    suppressedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#78350F20',
        borderRadius: 6,
        padding: 8
    },
    suppressedText: {
        color: '#FDE68A',
        fontSize: 11,
        flex: 1
    },
    list: {
        gap: 8
    },
    memberRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121219',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    memberInfo: {
        flex: 1
    },
    memberName: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600'
    },
    memberSplit: {
        color: '#94A3B8',
        fontSize: 11,
        marginTop: 2
    },
    amountsCol: {
        alignItems: 'flex-end'
    },
    actualAmount: {
        color: '#CBD5E1',
        fontSize: 12,
        fontWeight: '500'
    },
    deltaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: 2
    },
    deltaText: {
        fontSize: 11,
        fontWeight: '700'
    }
});
