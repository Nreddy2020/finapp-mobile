import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Shield, AlertCircle, Clock, CheckCircle2, UserCheck, Umbrella, Plus } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { PolicyType, PolicyStatus } from '../../services/family/familyContracts';

export default function FamilyProtectionView({
    protectionSummary = {},
    persons = [],
    onSelectPolicy = () => {},
    onAddPolicy = () => {}
}) {
    const {
        totalTermCoverageDisplay = '₹0',
        totalHealthCoverageDisplay = '₹0',
        totalAnnualPremiumDisplay = '₹0',
        activePoliciesCount = 0,
        expiringSoonCount = 0,
        uncoveredMembers = [],
        incompleteNomineePolicies = [],
        policiesList = [],
        readinessScoreBadge = 'CHECKING'
    } = protectionSummary;

    const personsMap = React.useMemo(() => {
        const m = new Map();
        persons.forEach(p => m.set(p.core?.id || p.id, p));
        return m;
    }, [persons]);

    return (
        <View style={styles.container}>
            {/* Protection Hero Card */}
            <LuxuryCard style={styles.heroCard}>
                <View style={styles.heroHeader}>
                    <View style={styles.heroTitleWrap}>
                        <View style={styles.shieldIconWrap}>
                            <Shield size={20} color="#10B981" />
                        </View>
                        <View>
                            <Text style={styles.heroTitle}>Family Protection Umbrella</Text>
                            <Text style={styles.heroSub}>{activePoliciesCount} Active Policies Verified</Text>
                        </View>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: readinessScoreBadge === 'EXCELLENT' ? '#10B98125' : '#F59E0B25' }]}>
                        <Text style={[styles.statusPillText, { color: readinessScoreBadge === 'EXCELLENT' ? '#10B981' : '#F59E0B' }]}>
                            {readinessScoreBadge}
                        </Text>
                    </View>
                </View>

                <View style={styles.coverageRow}>
                    <View style={styles.coverageCol}>
                        <Text style={styles.coverageLabel}>Term Life Shield</Text>
                        <Text style={styles.coverageValue}>{totalTermCoverageDisplay}</Text>
                    </View>
                    <View style={styles.coverageDivider} />
                    <View style={styles.coverageCol}>
                        <Text style={styles.coverageLabel}>Health Coverage</Text>
                        <Text style={styles.coverageValue}>{totalHealthCoverageDisplay}</Text>
                    </View>
                    <View style={styles.coverageDivider} />
                    <View style={styles.coverageCol}>
                        <Text style={styles.coverageLabel}>Annual Premium</Text>
                        <Text style={styles.coverageValue}>{totalAnnualPremiumDisplay}</Text>
                    </View>
                </View>
            </LuxuryCard>

            {/* Uncovered Members Alert */}
            {uncoveredMembers.length > 0 && (
                <View style={styles.warningBanner}>
                    <AlertCircle size={18} color="#EF4444" />
                    <View style={styles.warningTextCol}>
                        <Text style={styles.warningTitle}>Uncovered Family Members</Text>
                        <Text style={styles.warningSub}>
                            {uncoveredMembers.map(m => m.name).join(', ')} currently lack health insurance coverage.
                        </Text>
                    </View>
                </View>
            )}

            {/* Incomplete Nominees Alert */}
            {incompleteNomineePolicies.length > 0 && (
                <View style={[styles.warningBanner, styles.warningBannerAmber]}>
                    <AlertCircle size={18} color="#F59E0B" />
                    <View style={styles.warningTextCol}>
                        <Text style={[styles.warningTitle, { color: '#F59E0B' }]}>Incomplete Nominee Registration</Text>
                        <Text style={styles.warningSub}>
                            {incompleteNomineePolicies.map(p => `${p.policyName} (${p.policyNumberMasked})`).join(', ')} missing verified nominee.
                        </Text>
                    </View>
                </View>
            )}

            {/* Policy List */}
            <View style={styles.listHeaderRow}>
                <Text style={styles.sectionHeading}>INSURANCE POLICIES ({policiesList.length})</Text>
                <Pressable style={styles.addPolicyButton} onPress={onAddPolicy}>
                    <Plus size={14} color="#3B82F6" />
                    <Text style={styles.addPolicyText}>Add Policy</Text>
                </Pressable>
            </View>

            <View style={styles.policiesStack}>
                {policiesList.map(pol => {
                    const isExpiring = pol.isExpiringSoon;
                    const daysLeft = pol.daysUntilRenewal;

                    return (
                        <LuxuryCard key={pol.id} style={styles.policyCard} onPress={() => onSelectPolicy(pol)}>
                            <View style={styles.policyCardTop}>
                                <View style={styles.policyProviderRow}>
                                    <View style={[styles.policyTypeBadge, { backgroundColor: pol.policyType === PolicyType.TERM_LIFE ? '#3B82F620' : '#10B98120' }]}>
                                        <Umbrella size={14} color={pol.policyType === PolicyType.TERM_LIFE ? '#3B82F6' : '#10B981'} />
                                        <Text style={[styles.policyTypeText, { color: pol.policyType === PolicyType.TERM_LIFE ? '#60A5FA' : '#34D399' }]}>
                                            {pol.policyType}
                                        </Text>
                                    </View>
                                    <Text style={styles.policyNumberMasked}>{pol.policyNumberMasked}</Text>
                                </View>

                                {daysLeft !== null && daysLeft >= 0 && (
                                    <View style={[styles.renewalBadge, isExpiring && styles.renewalBadgeExpiring]}>
                                        <Clock size={11} color={isExpiring ? '#F59E0B' : '#9CA3AF'} />
                                        <Text style={[styles.renewalText, isExpiring && styles.renewalTextExpiring]}>
                                            {daysLeft <= 0 ? 'Due Today' : `${daysLeft}d left`}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.policyProvider}>{pol.provider}</Text>
                            <Text style={styles.policyNameText}>{pol.policyName || 'Standard Policy'}</Text>

                            <View style={styles.policyMetricsRow}>
                                <View style={styles.policyMetricCol}>
                                    <Text style={styles.policyMetricLabel}>Coverage</Text>
                                    <Text style={styles.policyMetricVal}>{pol.coverageDisplay}</Text>
                                </View>
                                <View style={styles.policyMetricCol}>
                                    <Text style={styles.policyMetricLabel}>Premium</Text>
                                    <Text style={styles.policyMetricVal}>{pol.premiumDisplay}/yr</Text>
                                </View>
                                <View style={styles.policyMetricCol}>
                                    <Text style={styles.policyMetricLabel}>Renewal Date</Text>
                                    <Text style={styles.policyMetricVal}>{pol.renewalDate || '—'}</Text>
                                </View>
                            </View>

                            {/* Covered Members Tag Row */}
                            <View style={styles.coveredMembersRow}>
                                <Text style={styles.coveredLabel}>Covered: </Text>
                                {(pol.insuredPersonIds || []).map((id, idx) => {
                                    const p = personsMap.get(id);
                                    return (
                                        <View key={idx} style={styles.memberTag}>
                                            <Text style={styles.memberTagText}>
                                                {p?.core?.preferredName || p?.core?.name || 'Member'}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </LuxuryCard>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24
    },
    heroCard: {
        padding: 16,
        marginBottom: 16
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    heroTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    shieldIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#10B98120',
        justifyContent: 'center',
        alignItems: 'center'
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    heroSub: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '700'
    },
    coverageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    coverageCol: {
        flex: 1,
        alignItems: 'center'
    },
    coverageDivider: {
        width: 1,
        height: 28,
        backgroundColor: '#27272A'
    },
    coverageLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4
    },
    coverageValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#EF444415',
        borderWidth: 1,
        borderColor: '#EF444435',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12
    },
    warningBannerAmber: {
        backgroundColor: '#F59E0B15',
        borderColor: '#F59E0B35'
    },
    warningTextCol: {
        flex: 1
    },
    warningTitle: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2
    },
    warningSub: {
        color: '#D1D5DB',
        fontSize: 12
    },
    listHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4
    },
    sectionHeading: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1
    },
    addPolicyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    addPolicyText: {
        color: '#3B82F6',
        fontSize: 12,
        fontWeight: '600'
    },
    policiesStack: {
        gap: 12
    },
    policyCard: {
        padding: 14
    },
    policyCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    policyProviderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    policyTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    policyTypeText: {
        fontSize: 10,
        fontWeight: '700'
    },
    policyNumberMasked: {
        color: '#71717A',
        fontSize: 12,
        fontFamily: 'monospace'
    },
    renewalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#27272A',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    renewalBadgeExpiring: {
        backgroundColor: '#F59E0B20'
    },
    renewalText: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '600'
    },
    renewalTextExpiring: {
        color: '#F59E0B'
    },
    policyProvider: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    policyNameText: {
        color: '#9CA3AF',
        fontSize: 13,
        marginBottom: 12
    },
    policyMetricsRow: {
        flexDirection: 'row',
        backgroundColor: '#18181B',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10
    },
    policyMetricCol: {
        flex: 1
    },
    policyMetricLabel: {
        color: '#71717A',
        fontSize: 10,
        marginBottom: 2
    },
    policyMetricVal: {
        color: '#E4E4E7',
        fontSize: 12,
        fontWeight: '600'
    },
    coveredMembersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6
    },
    coveredLabel: {
        color: '#71717A',
        fontSize: 11
    },
    memberTag: {
        backgroundColor: '#27272A',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6
    },
    memberTagText: {
        color: '#D1D5DB',
        fontSize: 11
    }
});
