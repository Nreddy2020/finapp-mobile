import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import {
    Shield,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    GitBranch,
    Users,
    Umbrella,
    CheckSquare,
    GraduationCap,
    HeartHandshake,
    Activity,
    TrendingUp,
    X
} from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

const ICON_MAP = {
    Shield,
    GitBranch,
    Users,
    Umbrella,
    CheckSquare,
    GraduationCap,
    HeartHandshake,
    Activity,
    TrendingUp
};

export default function FamilyReportsView({
    reportsData = {},
    onNavigateTab = () => {}
}) {
    const { emergencyReadiness = {}, reportCards = [] } = reportsData;
    const [selectedReport, setSelectedReport] = useState(null);

    return (
        <View style={styles.container}>
            {/* 9-Point Emergency Readiness Standard Inspection */}
            <LuxuryCard style={styles.readinessCard}>
                <View style={styles.readinessHeader}>
                    <View style={styles.readinessTitleWrap}>
                        <View style={styles.shieldWrap}>
                            <Shield size={20} color="#10B981" />
                        </View>
                        <View>
                            <Text style={styles.readinessHeading}>9-Point Emergency Readiness</Text>
                            <Text style={styles.readinessSub}>
                                {emergencyReadiness.completedCount} of {emergencyReadiness.totalCount} Standards Complete ({emergencyReadiness.scorePercent}%)
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.readinessPill, { backgroundColor: emergencyReadiness.readinessStatus === 'EXCELLENT' ? '#10B98125' : '#F59E0B25' }]}>
                        <Text style={[styles.readinessPillText, { color: emergencyReadiness.readinessStatus === 'EXCELLENT' ? '#10B981' : '#F59E0B' }]}>
                            {emergencyReadiness.readinessStatus}
                        </Text>
                    </View>
                </View>

                <View style={styles.checklistStack}>
                    {(emergencyReadiness.checklist || []).map(item => (
                        <View key={item.id} style={styles.checklistItem}>
                            {item.isComplete ? (
                                <CheckCircle2 size={16} color="#10B981" />
                            ) : (
                                <AlertTriangle size={16} color="#F59E0B" />
                            )}
                            <View style={styles.itemTextWrap}>
                                <Text style={[styles.itemLabel, !item.isComplete && styles.itemLabelPending]}>
                                    {item.label}
                                </Text>
                                <Text style={styles.itemDetail}>{item.detail}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </LuxuryCard>

            {/* 9 Dedicated Family Report Cards */}
            <Text style={styles.sectionHeading}>FAMILY OPERATING SYSTEM REPORTS (9)</Text>

            <View style={styles.cardsGrid}>
                {reportCards.map(card => {
                    const IconComp = ICON_MAP[card.icon] || Shield;

                    return (
                        <LuxuryCard
                            key={card.id}
                            style={styles.reportCard}
                            onPress={() => setSelectedReport(card)}
                        >
                            <View style={styles.reportCardTop}>
                                <View style={[styles.reportIconWrap, { backgroundColor: `${card.color}20` }]}>
                                    <IconComp size={18} color={card.color} />
                                </View>
                                <View style={styles.badgeWrap}>
                                    <Text style={[styles.cardBadge, { color: card.color }]}>{card.badge}</Text>
                                </View>
                            </View>

                            <Text style={styles.cardTitle}>{card.title}</Text>
                            <Text style={styles.cardSummary} numberOfLines={2}>{card.summary}</Text>

                            <View style={styles.cardFooter}>
                                <Text style={styles.viewReportText}>Deep Inspection</Text>
                                <ArrowRight size={13} color="#60A5FA" />
                            </View>
                        </LuxuryCard>
                    );
                })}
            </View>

            {/* Inspection Modal */}
            {selectedReport && (
                <Modal
                    visible={!!selectedReport}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSelectedReport(null)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{selectedReport.title}</Text>
                                <Pressable onPress={() => setSelectedReport(null)}>
                                    <X size={20} color="#FFFFFF" />
                                </Pressable>
                            </View>

                            <ScrollView style={styles.modalBody}>
                                <Text style={styles.modalSummary}>{selectedReport.summary}</Text>
                                <View style={styles.modalBadgeRow}>
                                    <Text style={styles.modalLabel}>Audit Status:</Text>
                                    <Text style={[styles.modalStatus, { color: selectedReport.color }]}>
                                        {selectedReport.badge}
                                    </Text>
                                </View>

                                {selectedReport.incompleteList?.length > 0 && (
                                    <View style={styles.modalPendingBox}>
                                        <Text style={styles.modalPendingTitle}>Incomplete Standards:</Text>
                                        {selectedReport.incompleteList.map((inc, i) => (
                                            <Text key={i} style={styles.modalPendingItem}>• {inc}</Text>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>

                            <Pressable
                                style={styles.modalCloseBtn}
                                onPress={() => setSelectedReport(null)}
                            >
                                <Text style={styles.modalCloseBtnText}>Close Inspection</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24
    },
    readinessCard: {
        padding: 16,
        marginBottom: 20
    },
    readinessHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    readinessTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    shieldWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#10B98120',
        justifyContent: 'center',
        alignItems: 'center'
    },
    readinessHeading: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    },
    readinessSub: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2
    },
    readinessPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8
    },
    readinessPillText: {
        fontSize: 10,
        fontWeight: '700'
    },
    checklistStack: {
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingTop: 12
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10
    },
    itemTextWrap: {
        flex: 1
    },
    itemLabel: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '500'
    },
    itemLabelPending: {
        color: '#F59E0B'
    },
    itemDetail: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 1
    },
    sectionHeading: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
        paddingHorizontal: 4
    },
    cardsGrid: {
        gap: 12
    },
    reportCard: {
        padding: 14
    },
    reportCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    reportIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    badgeWrap: {
        backgroundColor: '#18181B',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    cardBadge: {
        fontSize: 10,
        fontWeight: '700'
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4
    },
    cardSummary: {
        color: '#9CA3AF',
        fontSize: 12,
        marginBottom: 10,
        lineHeight: 16
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    viewReportText: {
        color: '#60A5FA',
        fontSize: 12,
        fontWeight: '600'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        maxHeight: '80%',
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
        paddingBottom: 12
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        flex: 1
    },
    modalBody: {
        marginBottom: 16
    },
    modalSummary: {
        color: '#E4E4E7',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16
    },
    modalBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16
    },
    modalLabel: {
        color: '#9CA3AF',
        fontSize: 13
    },
    modalStatus: {
        fontSize: 13,
        fontWeight: '700'
    },
    modalPendingBox: {
        backgroundColor: '#27272A',
        padding: 12,
        borderRadius: 10
    },
    modalPendingTitle: {
        color: '#F59E0B',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6
    },
    modalPendingItem: {
        color: '#D1D5DB',
        fontSize: 12,
        marginBottom: 4
    },
    modalCloseBtn: {
        backgroundColor: '#27272A',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center'
    },
    modalCloseBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600'
    }
});
