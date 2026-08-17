/**
 * FinLife Banking Relationship Intelligence — CFO Insights (Decision Brain)
 * 
 * Answers key CFO questions:
 * 1. Cost: Which loan is costing me the most?
 * 2. Opportunity: Where can I save interest?
 * 3. Risk: Can I comfortably cover the next 30/90 days?
 * 4. Timeline: When will I become debt-free?
 * 5. Comparison: Bank vs Bank leverage and costs.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { TrendingDown, ShieldCheck, Zap, AlertTriangle, Calendar, Layers, CheckCircle2 } from 'lucide-react-native';
import { formatPaise } from './bankingPresentationAdapter';

export default function BankingInsightsView({
    banks = [],
    accounts = [],
    loans = [],
    projection = null,
    overview
}) {
    const activeLoans = loans.filter(l => {
        const lp = projection?.loans?.[l.id];
        return (lp ? lp.status : l.status) === 'ACTIVE';
    });

    const highestLoan = overview.highestCostLoan;
    const opp = overview.dynamicPrepaymentOpportunity;
    const coverage = overview.obligationsNext30DaysPaise > 0
        ? (overview.totalCashPaise / overview.obligationsNext30DaysPaise).toFixed(1)
        : '∞';

    // Projected debt-free date
    let latestDueDate = '2031-06-01';
    Object.values(projection?.schedules || {}).forEach(sch => {
        if (sch.length > 0) {
            const last = sch[sch.length - 1];
            if (last.dueDate > latestDueDate) latestDueDate = last.dueDate;
        }
    });

    return (
        <View style={styles.container}>
            {/* 1. Debt Intelligence (Cost) */}
            <View style={styles.card}>
                <Text style={styles.cardHeader}>DEBT INTELLIGENCE & COST</Text>
                {highestLoan ? (
                    <View style={{ gap: 4 }}>
                        <Text style={styles.cardTitle}>Highest Cost Debt: {highestLoan.loanName}</Text>
                        <Text style={styles.cardSub}>
                            Interest Rate: <Text style={{ color: '#F87171', fontWeight: '800' }}>{highestLoan.interestRate}% p.a.</Text> • Outstanding: {formatPaise(highestLoan.outstandingPrincipalPaise, true)}
                        </Text>
                        <Text style={styles.cardDesc}>
                            Average cost of debt across all active facilities is {overview.averageEffectiveRate}% p.a. Prioritizing principal payments against {highestLoan.loanName} reduces lifetime compounding fastest.
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.cardSub}>Zero active debt obligations.</Text>
                )}
            </View>

            {/* 2. Prepayment Opportunity */}
            {opp && (
                <View style={[styles.card, { borderColor: '#78350F', backgroundColor: '#1C1917' }]}>
                    <Text style={[styles.cardHeader, { color: '#F59E0B' }]}>PREPAYMENT OPPORTUNITY</Text>
                    <Text style={[styles.cardTitle, { color: '#FDE68A' }]}>
                        Prepaying {opp.prepaymentAmountFormatted} on {opp.loanName}
                    </Text>
                    <Text style={styles.cardSub}>
                        Potential Net Saving: <Text style={{ color: '#10B981', fontWeight: '800' }}>{opp.netBenefitFormatted}</Text> ({opp.monthsSaved} months earlier debt-free).
                    </Text>
                    <Text style={[styles.cardDesc, { color: '#A8A29E' }]}>
                        {opp.explanation}
                    </Text>
                </View>
            )}

            {/* 3. Cash Pressure & 30-Day Coverage */}
            <View style={styles.card}>
                <Text style={styles.cardHeader}>CASH PRESSURE & 30-DAY COVERAGE</Text>
                <View style={styles.gridRow}>
                    <View>
                        <Text style={styles.metricVal}>{overview.obligationsNext30DaysFormatted}</Text>
                        <Text style={styles.metricLabel}>30-Day Obligations</Text>
                    </View>
                    <View>
                        <Text style={styles.metricVal}>{overview.totalCashFormatted}</Text>
                        <Text style={styles.metricLabel}>Bank Cash</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.metricVal, { color: '#10B981' }]}>{coverage}×</Text>
                        <Text style={styles.metricLabel}>Liquidity Coverage</Text>
                    </View>
                </View>
                <Text style={styles.cardDesc}>
                    {Number(coverage) >= 3.0
                        ? `Strong liquidity: You can service next month's debt obligations ${coverage} times over with existing liquid bank balances.`
                        : `Attention: Liquidity buffer is tight (${coverage}× coverage). Maintain adequate cash reserves.`}
                </Text>
            </View>

            {/* 4. Timeline to Debt-Free */}
            <View style={styles.card}>
                <Text style={styles.cardHeader}>PROJECTED DEBT-FREE TIMELINE</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.cardTitle}>Final Contractual Payoff</Text>
                    <Text style={[styles.cardTitle, { color: '#818CF8' }]}>{latestDueDate}</Text>
                </View>
                <Text style={styles.cardDesc}>
                    Following current contractual schedules without early prepayments, all bank loans will be fully extinguished by {latestDueDate}.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12
    },
    card: {
        backgroundColor: '#121324',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8
    },
    cardHeader: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    cardSub: {
        color: '#E5E7EB',
        fontSize: 12,
        lineHeight: 16
    },
    cardDesc: {
        color: '#94A3B8',
        fontSize: 11,
        lineHeight: 16,
        marginTop: 2
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4
    },
    metricVal: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    metricLabel: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    }
});
