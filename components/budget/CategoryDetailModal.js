import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, MoreVertical, Car, Utensils, ShoppingBag, Zap, Heart, Plane, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { generateExplainableCategoryInsight } from '../../services/budget/budgetEngine.js';
import { formatCurrency } from '../../services/budget/budgetViewModel.js';

const CATEGORY_ICONS = {
    'Food & Dining': Utensils,
    'Transportation': Car,
    'Shopping': ShoppingBag,
    'Utilities': Zap,
    'Healthcare': Heart,
    'Travel': Plane
};

export default function CategoryDetailModal({ visible, category, onClose, onAdjustBudget, onViewTransactions }) {
    const [activeSubTab, setActiveSubTab] = useState('Overview');
    
    const activeCat = category || {
        category: 'Transportation',
        spent: 9200,
        limit: 10000,
        percentUsed: 92,
        formattedSpent: '₹9,200',
        formattedLimit: '₹10,000',
        formattedRemaining: '₹800'
    };

    const IconComp = CATEGORY_ICONS[activeCat.category] || Car;
    const runRate = activeCat.runRate || {};

    const insight = generateExplainableCategoryInsight({
        category: activeCat.category,
        spent: activeCat.spent,
        budgetLimit: activeCat.limit,
        daysElapsed: 18,
        daysRemaining: runRate.daysRemaining || 12,
        recentSurgePct: 46
    });

    const isExceeding = (runRate.overspendAmount && runRate.overspendAmount > 0) || activeCat.percentUsed >= 90;

    return (
        <Modal visible={!!visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
                        <ArrowLeft size={22} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>{activeCat.category}</Text>
                    <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
                        <MoreVertical size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                {/* Sub-tabs */}
                <View style={styles.subTabRow}>
                    {['Overview', 'Transactions', 'Trends', 'Settings'].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.subTabItem, activeSubTab === tab && styles.subTabItemActive]}
                            onPress={() => setActiveSubTab(tab)}
                        >
                            <Text style={[styles.subTabText, activeSubTab === tab && styles.subTabTextActive]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                    {/* Main Category Card */}
                    <View style={styles.mainCard}>
                        <View style={styles.mainHeader}>
                            <View style={[styles.iconBox, { backgroundColor: '#3B82F620' }]}>
                                <IconComp size={22} color="#3B82F6" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={styles.mainTitle}>{activeCat.category}</Text>
                                    <View style={styles.tagBadge}>
                                        <Text style={styles.tagText}>{activeCat.type || 'Needs'}</Text>
                                    </View>
                                </View>
                                <Text style={styles.mainBudgetLabel}>
                                    Monthly Budget: <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{activeCat.formattedLimit}</Text>
                                </Text>
                            </View>
                            <Text style={[styles.mainPercent, { color: isExceeding ? '#EF4444' : '#10B981' }]}>
                                {activeCat.percentUsed}%
                            </Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${Math.min(100, activeCat.percentUsed || 0)}%`,
                                        backgroundColor: isExceeding ? '#EF4444' : '#10B981'
                                    }
                                ]}
                            />
                        </View>

                        <View style={styles.spentRemainingRow}>
                            <Text style={styles.spentRemText}>{activeCat.formattedSpent} spent</Text>
                            <Text style={styles.spentRemText}>{activeCat.formattedRemaining} remaining</Text>
                        </View>
                    </View>

                    {/* Spending Analysis */}
                    <View style={styles.analysisCard}>
                        <Text style={styles.cardHeaderTitle}>Spending Analysis</Text>

                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Daily average (so far)</Text>
                            <Text style={styles.tableValue}>₹{Math.round(runRate.dailyAverage || 410).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Allowed daily average</Text>
                            <Text style={styles.tableValue}>₹{Math.round(runRate.allowedDailyAverage || 92).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Days remaining</Text>
                            <Text style={styles.tableValue}>{runRate.daysRemaining || 12}</Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Projected month-end</Text>
                            <Text style={styles.tableValue}>₹{Math.round(runRate.projectedSpend || 11700).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.tableLabel}>Likely overspend</Text>
                            <Text style={[styles.tableValue, { color: '#EF4444' }]}>
                                ₹{Math.round(runRate.overspendAmount || 1700).toLocaleString('en-IN')}
                            </Text>
                        </View>
                    </View>

                    {/* Alert Banner */}
                    {isExceeding && (
                        <View style={styles.alertBanner}>
                            <AlertTriangle size={20} color="#F59E0B" />
                            <Text style={styles.alertText}>{insight.headline}</Text>
                        </View>
                    )}

                    {/* Why? Card */}
                    <View style={styles.insightCard}>
                        <Text style={styles.insightTitle}>Why?</Text>
                        <Text style={styles.insightBody}>{insight.why}</Text>
                    </View>

                    {/* Suggested Actions Card */}
                    <View style={styles.insightCard}>
                        <Text style={styles.insightTitle}>Suggested Actions</Text>
                        {insight.suggestedActions.map((action, i) => (
                            <View key={i} style={styles.bulletRow}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bulletText}>{action}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>

                {/* Bottom CTAs */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={styles.adjustBtn}
                        onPress={() => onAdjustBudget && onAdjustBudget(category)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.adjustBtnText}>Adjust Budget</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.viewTxnsBtn}
                        onPress={() => onViewTransactions && onViewTransactions(category)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.viewTxnsBtnText}>View Transactions</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030712'
    },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12
    },
    backBtn: {
        padding: 4
    },
    navTitle: {
        color: '#F8FAFC',
        fontSize: 17,
        fontWeight: '700'
    },
    moreBtn: {
        padding: 4
    },
    subTabRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
        gap: 20
    },
    subTabItem: {
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent'
    },
    subTabItemActive: {
        borderBottomColor: '#3B82F6'
    },
    subTabText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '600'
    },
    subTabTextActive: {
        color: '#3B82F6'
    },
    scrollArea: {
        flex: 1
    },
    scrollContent: {
        padding: 16,
        gap: 14
    },
    mainCard: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    mainHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    mainTitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700'
    },
    tagBadge: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    tagText: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '600'
    },
    mainBudgetLabel: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 2
    },
    mainPercent: {
        fontSize: 18,
        fontWeight: '800'
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#1E293B',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3
    },
    spentRemainingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    spentRemText: {
        color: '#94A3B8',
        fontSize: 12
    },
    analysisCard: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    cardHeaderTitle: {
        color: '#F8FAFC',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12
    },
    tableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B50'
    },
    tableLabel: {
        color: '#94A3B8',
        fontSize: 13
    },
    tableValue: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600'
    },
    alertBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B15',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F59E0B30',
        gap: 10
    },
    alertText: {
        color: '#FDE68A',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
        lineHeight: 18
    },
    insightCard: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    insightTitle: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8
    },
    insightBody: {
        color: '#CBD5E1',
        fontSize: 13,
        lineHeight: 18
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 6
    },
    bulletDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#3B82F6',
        marginTop: 6
    },
    bulletText: {
        color: '#94A3B8',
        fontSize: 12,
        flex: 1,
        lineHeight: 17
    },
    bottomBar: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#0F172A',
        borderTopWidth: 1,
        borderTopColor: '#1E293B',
        gap: 12
    },
    adjustBtn: {
        flex: 1,
        backgroundColor: '#1E293B',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155'
    },
    adjustBtnText: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '600'
    },
    viewTxnsBtn: {
        flex: 1,
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center'
    },
    viewTxnsBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600'
    }
});
