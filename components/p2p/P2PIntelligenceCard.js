import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, AlertTriangle, ArrowUpRight, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { formatINR } from './p2pPresentationAdapter';

export default function P2PIntelligenceCard({
    overviewMetrics,
    personSummaries = [],
    onSelectPerson
}) {
    if (!overviewMetrics) return null;

    const hasOverdue = overviewMetrics.overdueAmount > 0;
    const hasPressure = overviewMetrics.upcomingPayments > 50000;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#818CF8" />
                    <Text style={styles.headerTitle}>P2P DECISION INTELLIGENCE</Text>
                </View>
                <View style={styles.engineBadge}>
                    <Text style={styles.engineBadgeText}>ENGINE C.8</Text>
                </View>
            </View>

            {/* Insight 1: Collection Risk */}
            {overviewMetrics.upcomingReceipts > 0 && (
                <View style={styles.insightCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14 }}>⚠️</Text>
                        <Text style={[styles.insightTitle, { color: '#F59E0B' }]}>COLLECTION OUTLOOK</Text>
                    </View>
                    <Text style={styles.insightDesc}>
                        {overviewMetrics.upcomingReceiptsFormatted} expected from borrowers within the next 30 days across structured loan schedules.
                    </Text>
                </View>
            )}

            {/* Insight 2: Cash Pressure */}
            {hasPressure && (
                <View style={[styles.insightCard, { borderColor: '#EF444450', backgroundColor: '#7F1D1D20' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14 }}>🔴</Text>
                        <Text style={[styles.insightTitle, { color: '#EF4444' }]}>UPCOMING CASH PRESSURE</Text>
                    </View>
                    <Text style={styles.insightDesc}>
                        {overviewMetrics.upcomingPaymentsFormatted} P2P repayments are due within 30 days. Maintain sufficient liquid balance in funding accounts.
                    </Text>
                </View>
            )}

            {/* Insight 3: Clean Audit */}
            {!hasOverdue && (
                <View style={[styles.insightCard, { borderColor: '#10B98150', backgroundColor: '#065F4620' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={14} color="#10B981" />
                        <Text style={[styles.insightTitle, { color: '#10B981' }]}>LEDGER HEALTHY</Text>
                    </View>
                    <Text style={styles.insightDesc}>
                        Zero overdue installments. All P2P cash inflows and outflows are reconciled with Money Flow.
                    </Text>
                </View>
            )}
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
        marginBottom: 8,
        paddingHorizontal: 4
    },
    headerTitle: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.8
    },
    engineBadge: {
        backgroundColor: '#312E8140',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    engineBadgeText: {
        color: '#A5B4FC',
        fontSize: 9,
        fontWeight: '800'
    },
    insightCard: {
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        gap: 4
    },
    insightTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    insightDesc: {
        color: '#D4D4D8',
        fontSize: 12,
        lineHeight: 16
    }
});
