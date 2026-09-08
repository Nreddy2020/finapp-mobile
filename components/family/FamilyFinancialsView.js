import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, ShieldCheck, PieChart, Landmark, FileText, CheckCircle2, AlertCircle, Users, AlertTriangle } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function FamilyFinancialsView({
    netWorthSnapshot = null,
    runwayMetrics = null,
    familyObligations = null
}) {
    const nw = netWorthSnapshot || {};
    const rm = runwayMetrics || {};
    const fo = familyObligations || null;

    const runwayStatusColor = rm.status === 'EXCELLENT' ? '#10B981' :
        rm.status === 'ADEQUATE' ? '#3B82F6' :
        rm.status === 'CRITICAL' ? '#EF4444' : '#71717A';

    return (
        <View style={styles.container}>
            {/* Provenance Disclaimer Banner */}
            <View style={styles.provenanceBanner}>
                <ShieldCheck size={16} color="#10B981" />
                <Text style={styles.provenanceText}>
                    Read-only consumer of financial truth. All balances derive authoritatively from Cashbook, Banking, Commitments, and Investment modules without duplicate entries.
                </Text>
            </View>

            {/* Net Worth Hero Card */}
            <LuxuryCard style={styles.heroCard}>
                <View style={styles.heroHeader}>
                    <View style={styles.iconWrap}>
                        <TrendingUp size={22} color="#10B981" />
                    </View>
                    <View style={styles.heroTextWrap}>
                        <Text style={styles.heroLabel}>Total Family Net Worth</Text>
                        <Text style={styles.heroVal}>{nw.netWorthDisplay || '—'}</Text>
                    </View>
                </View>

                <View style={styles.metricsRow}>
                    <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Total Assets</Text>
                        <Text style={[styles.metricVal, { color: '#10B981' }]}>{nw.totalAssetsDisplay || '—'}</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Total Liabilities</Text>
                        <Text style={[styles.metricVal, { color: '#EF4444' }]}>{nw.totalLiabilitiesDisplay || '—'}</Text>
                    </View>
                </View>
            </LuxuryCard>

            {/* Emergency Reserve & Runway Card */}
            <LuxuryCard style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Landmark size={18} color="#3B82F6" />
                        <Text style={styles.cardTitle}>Emergency Liquidity Reserve</Text>
                    </View>
                    <View style={[styles.runwayBadge, { backgroundColor: `${runwayStatusColor}20` }]}>
                        <Text style={[styles.runwayBadgeText, { color: runwayStatusColor }]}>
                            {rm.status || 'UNCONFIGURED'}
                        </Text>
                    </View>
                </View>

                <View style={styles.runwayMetricsGrid}>
                    <View style={styles.runwayItem}>
                        <Text style={styles.runwayItemLabel}>Liquid Cash & Savings</Text>
                        <Text style={styles.runwayItemVal}>{nw.liquidDisplay || '—'}</Text>
                    </View>
                    <View style={styles.runwayItem}>
                        <Text style={styles.runwayItemLabel}>Runway Months</Text>
                        <Text style={[styles.runwayItemVal, { color: runwayStatusColor }]}>
                            {rm.runwayDisplay || '—'}
                        </Text>
                    </View>
                </View>

                <Text style={styles.runwayNote}>
                    Standard recommendation is at least 3 to 6 months of basic household expenses preserved in liquid accounts. Baseline runway is based on known fixed and estimated obligations, excluding unbounded variable obligations.
                </Text>
            </LuxuryCard>

            {/* Family Financial Obligations Section */}
            {fo && (
                <View style={styles.sectionWrap}>
                    <Text style={styles.sectionHeader}>FAMILY RECURRING FINANCIAL OBLIGATIONS</Text>
                    <LuxuryCard style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardHeaderLeft}>
                                <Users size={18} color="#D946EF" />
                                <Text style={styles.cardTitle}>Total Monthly Family Outflow</Text>
                            </View>
                            <Text style={[styles.cardTitle, { color: '#D946EF', fontWeight: '800' }]}>
                                {fo.totalFamilyMonthlyDisplay || '₹0'}
                            </Text>
                        </View>

                        {/* Orphaned / Archived Warning */}
                        {fo.orphanedCount > 0 && (
                            <View style={styles.orphanNotice}>
                                <AlertTriangle size={14} color="#F59E0B" />
                                <Text style={styles.orphanNoticeText}>
                                    {fo.orphanedCount} commitment(s) linked to archived or removed family member profiles. Historical allocations preserved.
                                </Text>
                            </View>
                        )}

                        {/* Member-by-Member Breakdown */}
                        {fo.byPerson && fo.byPerson.length > 0 ? (
                            <View style={styles.memberObligationsList}>
                                <Text style={styles.subSectionTitle}>BY FAMILY MEMBER</Text>
                                {fo.byPerson.map(p => (
                                    <View key={p.personId} style={styles.memberObligationRow}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={styles.memberObligationName}>{p.personName}</Text>
                                                {p.familyRole && (
                                                    <View style={styles.roleTag}>
                                                        <Text style={styles.roleTagText}>{p.familyRole}</Text>
                                                    </View>
                                                )}
                                                {p.isOrphaned && (
                                                    <View style={[styles.roleTag, { backgroundColor: '#78350F' }]}>
                                                        <Text style={[styles.roleTagText, { color: '#FDE68A' }]}>Archived</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.memberObligationSub}>
                                                {p.commitmentsCount} commitment{p.commitmentsCount !== 1 ? 's' : ''} configured
                                            </Text>
                                        </View>
                                        <Text style={styles.memberObligationAmount}>{p.monthlyCommittedDisplay}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.emptyObligationsText}>
                                No family-linked recurring obligations configured.
                            </Text>
                        )}

                        {/* Category Breakdown */}
                        {fo.byCategory && fo.byCategory.filter(c => c.commitmentsCount > 0).length > 0 && (
                            <View style={[styles.memberObligationsList, { marginTop: 12 }]}>
                                <Text style={styles.subSectionTitle}>BY OBLIGATION CATEGORY</Text>
                                <View style={styles.categoryPillsWrap}>
                                    {fo.byCategory.filter(c => c.commitmentsCount > 0).map(c => (
                                        <View key={c.category} style={styles.categoryPill}>
                                            <Text style={styles.categoryPillLabel}>{c.category}</Text>
                                            <Text style={styles.categoryPillAmount}>{c.monthlyCommittedDisplay}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        <Text style={[styles.runwayNote, { marginTop: 10 }]}>
                            Derived dynamically from Commitments V2. Cashbook remains the single financial ledger; paid commitments reconcile idempotently without double-counting.
                        </Text>
                    </LuxuryCard>
                </View>
            )}

            {/* Asset Breakdown */}
            <View style={styles.sectionWrap}>
                <Text style={styles.sectionHeader}>ASSET ALLOCATION BREAKDOWN</Text>
                <View style={styles.breakdownGrid}>
                    <LuxuryCard style={styles.breakdownCard}>
                        <Text style={styles.breakdownLabel}>Investments</Text>
                        <Text style={styles.breakdownVal}>{nw.investmentsDisplay || '—'}</Text>
                        <Text style={styles.breakdownDomain}>Authoritative: InvestmentService</Text>
                    </LuxuryCard>

                    <LuxuryCard style={styles.breakdownCard}>
                        <Text style={styles.breakdownLabel}>Real Estate & Property</Text>
                        <Text style={styles.breakdownVal}>{nw.propertiesDisplay || '—'}</Text>
                        <Text style={styles.breakdownDomain}>Authoritative: PropertyService</Text>
                    </LuxuryCard>

                    <LuxuryCard style={styles.breakdownCard}>
                        <Text style={styles.breakdownLabel}>Physical Assets</Text>
                        <Text style={styles.breakdownVal}>{nw.physicalAssetsDisplay || '—'}</Text>
                        <Text style={styles.breakdownDomain}>Authoritative: AssetService</Text>
                    </LuxuryCard>

                    <LuxuryCard style={styles.breakdownCard}>
                        <Text style={styles.breakdownLabel}>Liquid Bank Deposits</Text>
                        <Text style={styles.breakdownVal}>{nw.liquidDisplay || '—'}</Text>
                        <Text style={styles.breakdownDomain}>Authoritative: BankingService</Text>
                    </LuxuryCard>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24
    },
    provenanceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#10B98115',
        borderWidth: 1,
        borderColor: '#10B98130',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16
    },
    provenanceText: {
        color: '#D1D5DB',
        fontSize: 11,
        flex: 1,
        lineHeight: 16
    },
    heroCard: {
        padding: 16,
        marginBottom: 16
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#10B98120',
        justifyContent: 'center',
        alignItems: 'center'
    },
    heroTextWrap: {
        flex: 1
    },
    heroLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500'
    },
    heroVal: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
        marginTop: 2
    },
    metricsRow: {
        flexDirection: 'row',
        backgroundColor: '#18181B',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    metricCol: {
        flex: 1,
        alignItems: 'center'
    },
    metricDivider: {
        width: 1,
        backgroundColor: '#27272A'
    },
    metricLabel: {
        color: '#71717A',
        fontSize: 11,
        marginBottom: 4
    },
    metricVal: {
        fontSize: 15,
        fontWeight: '700'
    },
    card: {
        padding: 14,
        marginBottom: 16
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600'
    },
    runwayBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    runwayBadgeText: {
        fontSize: 10,
        fontWeight: '700'
    },
    runwayMetricsGrid: {
        flexDirection: 'row',
        backgroundColor: '#18181B',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10
    },
    runwayItem: {
        flex: 1
    },
    runwayItemLabel: {
        color: '#71717A',
        fontSize: 10,
        marginBottom: 2
    },
    runwayItemVal: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    },
    runwayNote: {
        color: '#71717A',
        fontSize: 11,
        fontStyle: 'italic'
    },
    sectionWrap: {
        marginBottom: 16
    },
    sectionHeader: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 10,
        paddingHorizontal: 4
    },
    breakdownGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    breakdownCard: {
        width: '48.5%',
        padding: 12
    },
    breakdownLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        marginBottom: 4
    },
    breakdownVal: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 6
    },
    breakdownDomain: {
        color: '#71717A',
        fontSize: 9
    },
    orphanNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#78350F25',
        borderWidth: 1,
        borderColor: '#78350F60',
        borderRadius: 8,
        padding: 8,
        marginBottom: 12
    },
    orphanNoticeText: {
        color: '#FDE68A',
        fontSize: 11,
        flex: 1
    },
    memberObligationsList: {
        marginTop: 6
    },
    subSectionTitle: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8
    },
    memberObligationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    memberObligationName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    memberObligationSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    memberObligationAmount: {
        color: '#D946EF',
        fontSize: 13,
        fontWeight: '700'
    },
    roleTag: {
        backgroundColor: '#1E1B4B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    roleTagText: {
        color: '#A5B4FC',
        fontSize: 9,
        fontWeight: '700'
    },
    emptyObligationsText: {
        color: '#71717A',
        fontSize: 12,
        fontStyle: 'italic',
        paddingVertical: 8
    },
    categoryPillsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    categoryPill: {
        backgroundColor: '#18181B',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A',
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    categoryPillLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '500'
    },
    categoryPillAmount: {
        color: '#F472B6',
        fontSize: 11,
        fontWeight: '700'
    }
});
