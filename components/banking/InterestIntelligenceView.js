/**
 * FinLife Banking Relationship Intelligence — Interest Intelligence View
 * 
 * Analyzes cost of debt, interest vs principal ratio over time,
 * lifetime interest burden, and debt heatmaps.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingDown, AlertTriangle, ShieldCheck, Flame } from 'lucide-react-native';
import { formatPaise } from './bankingPresentationAdapter';

export default function InterestIntelligenceView({
    loan,
    schedule = [],
    loanProjection = {}
}) {
    const totalExpInterest = schedule.reduce((s, item) => s + item.expectedInterestPaise, 0);
    const paidInterest = loanProjection.interestPaidPaise || 0;
    const remainingInterest = Math.max(0, totalExpInterest - paidInterest);

    const totalPrincipal = loan.originalPrincipalPaise || 0;
    const totalRepayment = totalPrincipal + totalExpInterest;
    const interestRatioPct = totalRepayment > 0 ? Math.round((totalExpInterest / totalRepayment) * 100) : 0;

    return (
        <View style={styles.container}>
            {/* Interest Burden Hero Card */}
            <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.cardHeader}>LIFETIME INTEREST BURDEN</Text>
                    <Flame size={16} color="#F87171" />
                </View>
                <Text style={styles.interestAmount}>{formatPaise(totalExpInterest)}</Text>
                <Text style={styles.interestSub}>
                    Interest represents <Text style={{ color: '#F87171', fontWeight: '800' }}>{interestRatioPct}%</Text> of total loan cash outlays.
                </Text>

                <View style={styles.barContainer}>
                    <View style={[styles.barPrincipal, { flex: 100 - interestRatioPct }]} />
                    <View style={[styles.barInterest, { flex: interestRatioPct }]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={styles.barLabel}>Principal: {formatPaise(totalPrincipal, true)}</Text>
                    <Text style={[styles.barLabel, { color: '#F87171' }]}>Interest: {formatPaise(totalExpInterest, true)}</Text>
                </View>
            </View>

            {/* Interest Paid vs Remaining */}
            <View style={styles.splitGrid}>
                <View style={styles.splitCard}>
                    <Text style={styles.splitLabel}>INTEREST PAID TO DATE</Text>
                    <Text style={[styles.splitVal, { color: '#10B981' }]}>{formatPaise(paidInterest)}</Text>
                </View>
                <View style={styles.splitCard}>
                    <Text style={styles.splitLabel}>INTEREST REMAINING</Text>
                    <Text style={[styles.splitVal, { color: '#F87171' }]}>{formatPaise(remainingInterest)}</Text>
                </View>
            </View>

            {/* Optimization Recommendation */}
            <View style={styles.tipCard}>
                <Text style={styles.tipTitle}>💡 FINLIFE REPAYMENT OPTIMIZATION</Text>
                <Text style={styles.tipText}>
                    In amortized loans, early installments are heavily weighted towards interest. Prepaying even ₹50,000 to ₹1,00,000 principal early will save multiple months of high interest compounding.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        gap: 10
    },
    card: {
        backgroundColor: '#121324',
        borderColor: '#232548',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14
    },
    cardHeader: {
        color: '#818CF8',
        fontSize: 10,
        fontWeight: '800'
    },
    interestAmount: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        marginVertical: 4
    },
    interestSub: {
        color: '#94A3B8',
        fontSize: 11,
        lineHeight: 15
    },
    barContainer: {
        flexDirection: 'row',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 12
    },
    barPrincipal: {
        backgroundColor: '#3B82F6'
    },
    barInterest: {
        backgroundColor: '#EF4444'
    },
    barLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '600'
    },
    splitGrid: {
        flexDirection: 'row',
        gap: 10
    },
    splitCard: {
        flex: 1,
        backgroundColor: '#121324',
        borderColor: '#232548',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12
    },
    splitLabel: {
        color: '#71717A',
        fontSize: 9,
        fontWeight: '700'
    },
    splitVal: {
        fontSize: 15,
        fontWeight: '800',
        marginTop: 2
    },
    tipCard: {
        backgroundColor: '#1E1B4B40',
        borderColor: '#4338CA',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 4
    },
    tipTitle: {
        color: '#A5B4FC',
        fontSize: 11,
        fontWeight: '800'
    },
    tipText: {
        color: '#E0E7FF',
        fontSize: 11,
        lineHeight: 16
    }
});
