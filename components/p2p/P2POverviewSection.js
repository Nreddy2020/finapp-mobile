import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
    Users, 
    ChevronRight, 
    ArrowDownLeft, 
    ArrowUpRight, 
    AlertCircle, 
    Clock, 
    PlusCircle, 
    MinusCircle, 
    CheckCircle2, 
    HandCoins
} from 'lucide-react-native';

export default function P2POverviewSection({
    metrics,
    onAddLoan,
    onNavigateTab,
    onAction
}) {
    if (!metrics) return null;

    const healthPct = metrics.relationshipHealthPct !== undefined ? metrics.relationshipHealthPct : 82;
    const activePeople = metrics.activePeopleCount || (metrics.peopleGivenCount + metrics.peopleTakenCount) || 1;
    const needFollowUp = metrics.needFollowUpCount || (metrics.overdueCount > 0 ? 1 : 0);
    const atRisk = metrics.atRiskCount || metrics.overdueCount || 0;
    const settled = metrics.settledCount || 0;

    return (
        <View style={styles.container}>
            {/* ── 1. Real Relationships Banner ── */}
            <View style={styles.bannerRow}>
                <View style={styles.bannerIconBox}>
                    <Users size={22} color="#818CF8" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>P2P Network</Text>
                    <Text style={styles.bannerSubtitle}>Real Relationships. Real Clarity.</Text>
                </View>
            </View>

            {/* ── 2. Top Summary Twin Cards (Receivables / Payables) ── */}
            <View style={styles.twinCardsRow}>
                {/* Green Card: Receivables (Money Others Owe Me) */}
                <TouchableOpacity
                    style={[styles.twinCard, styles.cardGreen]}
                    activeOpacity={0.8}
                    onPress={() => onNavigateTab && onNavigateTab('given')}
                >
                    <View style={styles.twinCardHeader}>
                        <Text style={[styles.twinCardLabel, { color: '#34D399' }]} numberOfLines={2}>
                            Money Others{'\n'}Owe Me (Receivables)
                        </Text>
                        <ChevronRight size={18} color="#10B981" />
                    </View>

                    <View style={styles.twinAmountRow}>
                        <Text style={[styles.twinAmount, { color: '#10B981' }]}>
                            {metrics.totalReceivableFormatted}
                        </Text>
                        <View style={styles.greenTag}>
                            <Text style={styles.greenTagText}>+5%</Text>
                        </View>
                    </View>

                    <Text style={styles.twinFooter}>
                        {metrics.peopleGivenCount} people • {metrics.activeGivenCount} loans
                    </Text>
                </TouchableOpacity>

                {/* Red Card: Payables (Money I Owe Others) */}
                <TouchableOpacity
                    style={[styles.twinCard, styles.cardRed]}
                    activeOpacity={0.8}
                    onPress={() => onNavigateTab && onNavigateTab('taken')}
                >
                    <View style={styles.twinCardHeader}>
                        <Text style={[styles.twinCardLabel, { color: '#F87171' }]} numberOfLines={2}>
                            Money I Owe{'\n'}Others (Payables)
                        </Text>
                        <ChevronRight size={18} color="#EF4444" />
                    </View>

                    <View style={styles.twinAmountRow}>
                        <Text style={[styles.twinAmount, { color: '#EF4444' }]}>
                            {metrics.totalPayableFormatted}
                        </Text>
                        <View style={styles.redTag}>
                            <Text style={styles.redTagText}>-2%</Text>
                        </View>
                    </View>

                    <Text style={styles.twinFooter}>
                        {metrics.peopleTakenCount} people • {metrics.activeTakenCount} loans
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── 3. Net P2P Position Card ── */}
            <View style={styles.netPositionCard}>
                <View style={styles.netPositionLeft}>
                    <Text style={styles.netPositionLabel}>Net P2P Position</Text>
                    <Text style={[styles.netPositionValue, { color: metrics.netPositionColor }]}>
                        {metrics.netPositionFormatted}
                    </Text>
                    <Text style={styles.netPositionSub}>
                        {metrics.plainLanguageNetText}
                    </Text>
                </View>

                <View style={styles.netPositionRight}>
                    {/* Visual mini bar chart illustration */}
                    <View style={styles.miniChartBox}>
                        <View style={[styles.miniBar, { height: 14, backgroundColor: '#4F46E5' }]} />
                        <View style={[styles.miniBar, { height: 26, backgroundColor: '#6366F1' }]} />
                        <View style={[styles.miniBar, { height: 18, backgroundColor: '#818CF8' }]} />
                        <View style={[styles.miniBar, { height: 32, backgroundColor: '#A5B4FC' }]} />
                    </View>
                </View>
            </View>

            {/* ── 4. 2x2 Metric Grid ── */}
            <View style={styles.gridRow}>
                {/* Upcoming Receipts (Lavender) */}
                <View style={[styles.gridCell, styles.gridCellLavender]}>
                    <View style={styles.gridCellHeader}>
                        <View style={[styles.gridIconBox, { backgroundColor: '#8B5CF620' }]}>
                            <ArrowDownLeft size={16} color="#A78BFA" />
                        </View>
                        <Text style={styles.gridCellLabel}>Upcoming Receipts</Text>
                    </View>
                    <Text style={[styles.gridCellValue, { color: '#A78BFA' }]}>
                        {metrics.upcomingReceiptsFormatted}
                    </Text>
                    <Text style={styles.gridCellSub}>Next 30 days</Text>
                </View>

                {/* Upcoming Payments (Peach/Amber) */}
                <View style={[styles.gridCell, styles.gridCellPeach]}>
                    <View style={styles.gridCellHeader}>
                        <View style={[styles.gridIconBox, { backgroundColor: '#F59E0B20' }]}>
                            <ArrowUpRight size={16} color="#FBBF24" />
                        </View>
                        <Text style={styles.gridCellLabel}>Upcoming Payments</Text>
                    </View>
                    <Text style={[styles.gridCellValue, { color: '#FBBF24' }]}>
                        {metrics.upcomingPaymentsFormatted}
                    </Text>
                    <Text style={styles.gridCellSub}>Next 30 days</Text>
                </View>
            </View>

            <View style={styles.gridRow}>
                {/* Overdue Amount (Rose) */}
                <View style={[styles.gridCell, styles.gridCellRose]}>
                    <View style={styles.gridCellHeader}>
                        <View style={[styles.gridIconBox, { backgroundColor: '#EF444420' }]}>
                            <AlertCircle size={16} color="#F87171" />
                        </View>
                        <Text style={styles.gridCellLabel}>Overdue Amount</Text>
                    </View>
                    <Text style={[styles.gridCellValue, { color: '#F87171' }]}>
                        {metrics.overdueAmountFormatted}
                    </Text>
                    <Text style={styles.gridCellSub}>
                        {metrics.overdueCount > 0 ? `${metrics.overdueCount} loans overdue` : 'Clean record'}
                    </Text>
                </View>

                {/* Due Next 30 Days (Sky Blue) */}
                <View style={[styles.gridCell, styles.gridCellBlue]}>
                    <View style={styles.gridCellHeader}>
                        <View style={[styles.gridIconBox, { backgroundColor: '#0284C720' }]}>
                            <Clock size={16} color="#38BDF8" />
                        </View>
                        <Text style={styles.gridCellLabel}>Due Next 30 Days</Text>
                    </View>
                    <Text style={[styles.gridCellValue, { color: '#38BDF8' }]}>
                        {metrics.dueNext30DaysFormatted}
                    </Text>
                    <Text style={styles.gridCellSub}>Cash impact</Text>
                </View>
            </View>

            {/* ── 5. Relationship Health Card ── */}
            <View style={styles.healthCard}>
                <Text style={styles.healthTitle}>Relationship Health</Text>

                <View style={styles.healthBody}>
                    {/* Donut / Circular Health Gauge */}
                    <View style={styles.healthGaugeWrap}>
                        <View style={styles.healthGaugeRing}>
                            <Text style={styles.healthGaugeVal}>{healthPct}%</Text>
                            <Text style={styles.healthGaugeSub}>HEALTH</Text>
                        </View>
                    </View>

                    {/* Status Breakdown Legend */}
                    <View style={styles.healthLegend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.legendText}>{activePeople} Active People</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                            <Text style={styles.legendText}>{needFollowUp} Need Follow-up</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                            <Text style={styles.legendText}>{atRisk} At Risk</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
                            <Text style={styles.legendText}>{settled} Settled (All Good)</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* ── 6. Fast Action Buttons Row ── */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnGreen]}
                    onPress={() => onAction ? onAction('LEND') : onAddLoan && onAddLoan('GIVEN')}
                    activeOpacity={0.8}
                >
                    <PlusCircle size={14} color="#10B981" />
                    <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Lend</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnRed]}
                    onPress={() => onAction ? onAction('BORROW') : onAddLoan && onAddLoan('TAKEN')}
                    activeOpacity={0.8}
                >
                    <MinusCircle size={14} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Borrow</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnBlue]}
                    onPress={() => onAction ? onAction('REPAY') : null}
                    activeOpacity={0.8}
                >
                    <HandCoins size={14} color="#38BDF8" />
                    <Text style={[styles.actionBtnText, { color: '#38BDF8' }]}>Repay</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnIndigo]}
                    onPress={() => onAction ? onAction('SETTLE') : onNavigateTab && onNavigateTab('settlements')}
                    activeOpacity={0.8}
                >
                    <CheckCircle2 size={14} color="#818CF8" />
                    <Text style={[styles.actionBtnText, { color: '#818CF8' }]}>Settle-up</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        gap: 12
    },
    bannerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#1E1B4B30',
        borderColor: '#4338CA40',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 4
    },
    bannerIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#4338CA30',
        justifyContent: 'center',
        alignItems: 'center'
    },
    bannerTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.2
    },
    bannerSubtitle: {
        fontSize: 12,
        color: '#A5B4FC',
        marginTop: 2,
        fontWeight: '500'
    },
    twinCardsRow: {
        flexDirection: 'row',
        gap: 10
    },
    twinCard: {
        flex: 1,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1.5,
        justifyContent: 'space-between',
        minHeight: 130
    },
    cardGreen: {
        backgroundColor: '#064E3B18',
        borderColor: '#05966940'
    },
    cardRed: {
        backgroundColor: '#7F1D1D18',
        borderColor: '#DC262640'
    },
    twinCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    twinCardLabel: {
        fontSize: 11,
        fontWeight: '800',
        lineHeight: 15
    },
    twinAmountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginVertical: 6
    },
    twinAmount: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    greenTag: {
        backgroundColor: '#10B98125',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    greenTagText: {
        color: '#34D399',
        fontSize: 10,
        fontWeight: '800'
    },
    redTag: {
        backgroundColor: '#EF444425',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    redTagText: {
        color: '#F87171',
        fontSize: 10,
        fontWeight: '800'
    },
    twinFooter: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '600'
    },
    netPositionCard: {
        backgroundColor: '#18181B',
        borderColor: '#27272A',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    netPositionLeft: {
        flex: 1
    },
    netPositionLabel: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 2
    },
    netPositionValue: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    netPositionSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 3,
        fontWeight: '500'
    },
    netPositionRight: {
        paddingLeft: 12
    },
    miniChartBox: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
        height: 36,
        padding: 4,
        backgroundColor: '#27272A50',
        borderRadius: 8
    },
    miniBar: {
        width: 6,
        borderRadius: 3
    },
    gridRow: {
        flexDirection: 'row',
        gap: 10
    },
    gridCell: {
        flex: 1,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1
    },
    gridCellLavender: {
        backgroundColor: '#8B5CF60F',
        borderColor: '#8B5CF630'
    },
    gridCellPeach: {
        backgroundColor: '#F59E0B0F',
        borderColor: '#F59E0B30'
    },
    gridCellRose: {
        backgroundColor: '#EF44440F',
        borderColor: '#EF444430'
    },
    gridCellBlue: {
        backgroundColor: '#0284C70F',
        borderColor: '#0284C730'
    },
    gridCellHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6
    },
    gridIconBox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center'
    },
    gridCellLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#A1A1AA'
    },
    gridCellValue: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 2
    },
    gridCellSub: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '500'
    },
    healthCard: {
        backgroundColor: '#18181B',
        borderColor: '#27272A',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16
    },
    healthTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 12
    },
    healthBody: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20
    },
    healthGaugeWrap: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    healthGaugeRing: {
        width: 82,
        height: 82,
        borderRadius: 41,
        borderWidth: 5,
        borderColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#10B98115'
    },
    healthGaugeVal: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF'
    },
    healthGaugeSub: {
        fontSize: 8,
        fontWeight: '800',
        color: '#10B981',
        letterSpacing: 0.5
    },
    healthLegend: {
        flex: 1,
        gap: 6
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    legendText: {
        color: '#D4D4D8',
        fontSize: 11,
        fontWeight: '600'
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 2
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1
    },
    actionBtnGreen: {
        backgroundColor: '#10B98115',
        borderColor: '#10B98140'
    },
    actionBtnRed: {
        backgroundColor: '#EF444415',
        borderColor: '#EF444440'
    },
    actionBtnBlue: {
        backgroundColor: '#38BDF815',
        borderColor: '#38BDF840'
    },
    actionBtnIndigo: {
        backgroundColor: '#818CF815',
        borderColor: '#818CF840'
    },
    actionBtnText: {
        fontSize: 11,
        fontWeight: '800'
    }
});
