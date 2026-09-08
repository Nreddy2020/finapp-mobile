import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { HeartHandshake, ShieldAlert, Home, UserCheck, AlertCircle, Plus, PhoneCall } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { CareHealthStatus } from '../../services/family/familyContracts';

export default function ParentsElderCareView({
    careSummary = {},
    persons = [],
    onSelectCarePlan = () => {},
    onAddCarePlan = () => {}
}) {
    const { plansList = [], totalEldersUnderCare = 0, totalMonthlySupportBudgetDisplay = '—', needsAttentionCount = 0 } = careSummary;

    const getCareStatusStyle = (status) => {
        switch (status) {
            case CareHealthStatus.GOOD:
            case CareHealthStatus.STABLE:
                return { bg: '#10B98120', text: '#10B981' };
            case CareHealthStatus.MONITORING:
                return { bg: '#F59E0B20', text: '#F59E0B' };
            case CareHealthStatus.CRITICAL:
            case CareHealthStatus.ATTENTION_NEEDED:
                return { bg: '#EF444420', text: '#EF4444' };
            default:
                return { bg: '#27272A', text: '#9CA3AF' };
        }
    };

    return (
        <View style={styles.container}>
            {/* Care Hero Card */}
            <LuxuryCard style={styles.heroCard}>
                <View style={styles.heroHeader}>
                    <View style={styles.heroIconWrap}>
                        <HeartHandshake size={22} color="#6366F1" />
                    </View>
                    <View style={styles.heroTextWrap}>
                        <Text style={styles.heroTitle}>Parents & Elder Care Network</Text>
                        <Text style={styles.heroSub}>
                            {totalEldersUnderCare} Elder(s) • Total Monthly Support: {totalMonthlySupportBudgetDisplay}
                        </Text>
                    </View>
                    {needsAttentionCount > 0 && (
                        <View style={styles.attentionPill}>
                            <Text style={styles.attentionPillText}>{needsAttentionCount} ALERT</Text>
                        </View>
                    )}
                </View>
            </LuxuryCard>

            {/* Plans List */}
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>INDIVIDUAL CARE PLANS</Text>
                <Pressable style={styles.addPlanBtn} onPress={onAddCarePlan}>
                    <Plus size={14} color="#6366F1" />
                    <Text style={styles.addPlanBtnText}>Add Care Plan</Text>
                </Pressable>
            </View>

            <View style={styles.plansStack}>
                {plansList.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <HeartHandshake size={32} color="#71717A" />
                        <Text style={styles.emptyTitle}>No Elder Care Plans Configured</Text>
                        <Text style={styles.emptySub}>Setup care coordinators, emergency plans, and support budgets for parents.</Text>
                    </View>
                ) : (
                    plansList.map(plan => {
                        const statusStyle = getCareStatusStyle(plan.careStatus);

                        return (
                            <LuxuryCard key={plan.id} style={styles.planCard} onPress={() => onSelectCarePlan(plan)}>
                                <View style={styles.planCardTop}>
                                    <View style={styles.parentNameRow}>
                                        <Text style={styles.parentName}>{plan.parentName}</Text>
                                        {plan.parentAge ? (
                                            <Text style={styles.parentAge}>({plan.parentAge} yrs)</Text>
                                        ) : null}
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                                            {plan.careStatus}
                                        </Text>
                                    </View>
                                </View>

                                {/* Coordinator and Budget Row */}
                                <View style={styles.detailsRow}>
                                    <View style={styles.detailBox}>
                                        <View style={styles.detailLabelRow}>
                                            <UserCheck size={12} color="#71717A" />
                                            <Text style={styles.detailLabel}>Coordinator</Text>
                                        </View>
                                        <Text style={styles.detailVal}>{plan.coordinatorName}</Text>
                                    </View>

                                    <View style={styles.detailDivider} />

                                    <View style={styles.detailBox}>
                                        <Text style={styles.detailLabel}>Monthly Support</Text>
                                        <Text style={[styles.detailVal, { color: '#10B981' }]}>
                                            {plan.monthlySupportBudgetDisplay}/mo
                                        </Text>
                                    </View>
                                </View>

                                {plan.livingArrangement ? (
                                    <View style={styles.metaRow}>
                                        <Home size={12} color="#71717A" />
                                        <Text style={styles.metaText} numberOfLines={1}>
                                            {plan.livingArrangement}
                                        </Text>
                                    </View>
                                ) : null}

                                {plan.emergencyEscalationPlan ? (
                                    <View style={[styles.metaRow, styles.escalationRow]}>
                                        <ShieldAlert size={12} color="#F59E0B" />
                                        <Text style={styles.escalationText} numberOfLines={2}>
                                            {plan.emergencyEscalationPlan}
                                        </Text>
                                    </View>
                                ) : null}
                            </LuxuryCard>
                        );
                    })
                )}
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
        alignItems: 'center',
        gap: 12
    },
    heroIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#6366F120',
        justifyContent: 'center',
        alignItems: 'center'
    },
    heroTextWrap: {
        flex: 1
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
    attentionPill: {
        backgroundColor: '#EF444420',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    attentionPillText: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: '800'
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4
    },
    sectionTitle: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1
    },
    addPlanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    addPlanBtnText: {
        color: '#6366F1',
        fontSize: 12,
        fontWeight: '600'
    },
    plansStack: {
        gap: 12
    },
    planCard: {
        padding: 14
    },
    planCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    parentNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    parentName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    parentAge: {
        color: '#9CA3AF',
        fontSize: 13
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700'
    },
    detailsRow: {
        flexDirection: 'row',
        backgroundColor: '#18181B',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10
    },
    detailBox: {
        flex: 1
    },
    detailDivider: {
        width: 1,
        backgroundColor: '#27272A',
        marginHorizontal: 8
    },
    detailLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2
    },
    detailLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 2
    },
    detailVal: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
    },
    metaText: {
        color: '#9CA3AF',
        fontSize: 11,
        flex: 1
    },
    escalationRow: {
        backgroundColor: '#27272A',
        padding: 8,
        borderRadius: 8,
        marginTop: 4
    },
    escalationText: {
        color: '#D1D5DB',
        fontSize: 11,
        flex: 1
    },
    emptyCard: {
        padding: 32,
        alignItems: 'center',
        backgroundColor: '#18181B',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginTop: 10,
        marginBottom: 4
    },
    emptySub: {
        color: '#71717A',
        fontSize: 12,
        textAlign: 'center'
    }
});
