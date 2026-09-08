/**
 * app/(tabs)/recurring.js
 * 
 * FinLife Recurring Financial Commitments & Liability Management Platform.
 * 
 * Features:
 * - Integer / MoneyPaise standard with zero floating-point arithmetic.
 * - Manages Subscriptions, Loan EMIs, Rent, Insurance, Utilities, and SIP Investments.
 * - Dynamic Hero card with normalized monthly obligation and nature breakdown.
 * - Filter pills: All, Subscriptions, Loans & EMIs, Bills & Rent, Annual.
 * - Chronological upcoming liabilities with countdowns and quick-pay ledger link.
 * - Safe hardware & UI back navigation with modal stack handling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    ScrollView,
    RefreshControl,
    Text,
    StyleSheet,
    TouchableOpacity,
    BackHandler,
    StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Repeat, Calendar, ShieldCheck } from 'lucide-react-native';

import { CommitmentsService } from '../../services/commitments/commitmentsService.js';
import {
    buildRecurringCommitmentsViewModel,
    CommitmentFilterPill
} from '../../services/commitments/commitmentViewModel.js';

import CommitmentHeroCard from '../../components/commitments/CommitmentHeroCard.js';
import CommitmentFilterPills from '../../components/commitments/CommitmentFilterPills.js';
import CommitmentCard from '../../components/commitments/CommitmentCard.js';
import CommitmentDetailModal from '../../components/commitments/CommitmentDetailModal.js';
import AddCommitmentModal from '../../components/commitments/AddCommitmentModal.js';
import RecordPaymentModal from '../../components/commitments/RecordPaymentModal.js';

export default function RecurringScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [refreshing, setRefreshing] = useState(false);
    const [appMode, setAppMode] = useState('DEMO'); // 'DEMO' | 'PRODUCTION'
    const [commitments, setCommitments] = useState([]);
    const [occurrences, setOccurrences] = useState([]);
    const [activeFilter, setActiveFilter] = useState(CommitmentFilterPill.ALL);
    const [templateValues, setTemplateValues] = useState(null);

    // Modals
    const [selectedCommitment, setSelectedCommitment] = useState(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    const [selectedOccurrence, setSelectedOccurrence] = useState(null);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);

    const [addModalVisible, setAddModalVisible] = useState(false);

    // Hardware back handler
    useEffect(() => {
        const onBackPress = () => {
            if (paymentModalVisible) {
                setPaymentModalVisible(false);
                return true;
            }
            if (detailModalVisible) {
                setDetailModalVisible(false);
                return true;
            }
            if (addModalVisible) {
                setAddModalVisible(false);
                return true;
            }
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/(tabs)');
            }
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [paymentModalVisible, detailModalVisible, addModalVisible, router]);

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    const loadData = useCallback(async () => {
        try {
            const data = await CommitmentsService.load({ mode: appMode });
            setCommitments(data.commitments || []);
            setOccurrences(data.occurrences || []);
        } catch (error) {
            console.error('Failed to load commitments:', error);
        } finally {
            setRefreshing(false);
        }
    }, [appMode]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const toggleAppMode = () => {
        const nextMode = appMode === 'DEMO' ? 'PRODUCTION' : 'DEMO';
        setAppMode(nextMode);
    };

    // Build View Model via pure presentation adapter
    const viewModel = buildRecurringCommitmentsViewModel({
        commitments,
        occurrences,
        activeFilter,
        asOfDate: '2026-09-01'
    });

    // Action Handlers
    const handleSaveNewCommitment = async (newCommitment) => {
        try {
            await CommitmentsService.saveCommitment(newCommitment, { mode: appMode });
            setAddModalVisible(false);
            setTemplateValues(null);
            await loadData();
        } catch (err) {
            Alert.alert('Save Failed', err.message);
        }
    };

    const handleConfirmPayment = async (occurrenceId, paymentData) => {
        try {
            await CommitmentsService.executeOccurrencePayment(
                occurrenceId,
                paymentData,
                { mode: appMode }
            );
            setPaymentModalVisible(false);
            setSelectedOccurrence(null);
            await loadData();
        } catch (err) {
            Alert.alert('Payment Reconciliation Failed', err.message);
            await loadData();
        }
    };

    const handleRetryPayment = async (occurrence) => {
        try {
            await CommitmentsService.executeOccurrencePayment(
                occurrence.id,
                {},
                { mode: appMode }
            );
            setDetailModalVisible(false);
            setSelectedOccurrence(null);
            await loadData();
        } catch (err) {
            Alert.alert('Retry Failed', err.message);
            await loadData();
        }
    };

    const handleReversePayment = async (occurrence) => {
        try {
            await CommitmentsService.reverseOccurrencePayment(
                occurrence.id,
                { reason: 'User requested reversal from UI' },
                { mode: appMode }
            );
            setDetailModalVisible(false);
            setSelectedOccurrence(null);
            await loadData();
        } catch (err) {
            Alert.alert('Reversal Failed', err.message);
        }
    };

    const handleTogglePause = async (commitment) => {
        const nextStatus = commitment.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
        await CommitmentsService.saveCommitment({
            ...commitment,
            status: nextStatus
        }, { mode: appMode });
        setDetailModalVisible(false);
        await loadData();
    };

    const handleCancelCommitment = async (commitment) => {
        await CommitmentsService.cancelCommitment(commitment.id, { mode: appMode });
        setDetailModalVisible(false);
        await loadData();
    };

    const handleOpenOccurrence = (occ) => {
        const parent = commitments.find(c => c.id === occ.commitmentId);
        setSelectedCommitment(parent || null);
        setSelectedOccurrence(occ);
        setDetailModalVisible(true);
    };

    const handleQuickPay = (occ) => {
        setSelectedOccurrence(occ);
        setPaymentModalVisible(true);
    };

    const handleOpenCommitmentDetail = (comm) => {
        setSelectedCommitment(comm);
        setSelectedOccurrence(null);
        setDetailModalVisible(true);
    };

    const handleOpenTemplate = (template) => {
        Alert.alert(
            'Starter Template',
            `Create ${template.name} (${template.amountRupees ? `₹${template.amountRupees}` : ''})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Open Creator',
                    onPress: () => {
                        setTemplateValues(template);
                        setAddModalVisible(true);
                    }
                }
            ]
        );
    };

    const dynamicTopPadding = Math.max(insets?.top || 0, 48) + 8;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0914" />

            {/* Navigation Header */}
            <View style={[styles.headerBar, { paddingTop: dynamicTopPadding }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={handleBack}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <ArrowLeft size={22} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerSubtitle}>COMMITMENTS</Text>
                    <Text style={styles.headerTitle}>Recurring</Text>
                </View>

                <TouchableOpacity
                    style={styles.addHeaderBtn}
                    onPress={() => setAddModalVisible(true)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Plus size={22} color="#D946EF" />
                </TouchableOpacity>
            </View>

            {/* Main Scroll Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#D946EF"
                        colors={['#D946EF']}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Card */}
                <CommitmentHeroCard
                    heroMetrics={viewModel.hero}
                    appMode={appMode}
                    onToggleMode={toggleAppMode}
                />

                {/* Filter Pills */}
                <CommitmentFilterPills
                    selectedFilter={activeFilter}
                    onSelectFilter={setActiveFilter}
                    counts={viewModel.filterCounts}
                />

                {/* Overdue Liabilities (High Priority Alert) */}
                {viewModel.hasOverdue && (
                    <View style={styles.section}>
                        <View style={[styles.sectionHeader, { borderColor: '#EF4444' }]}>
                            <View>
                                <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Overdue Liabilities</Text>
                                <Text style={styles.sectionSub}>Action required immediately</Text>
                            </View>
                            <View style={[styles.countBadge, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                                <Text style={[styles.countBadgeText, { color: '#EF4444' }]}>{viewModel.overdueOccurrences.length}</Text>
                            </View>
                        </View>
                        {viewModel.overdueOccurrences.map(occ => (
                            <CommitmentCard
                                key={occ.id}
                                item={occ}
                                isOccurrence={true}
                                onPress={handleOpenOccurrence}
                                onQuickPay={handleQuickPay}
                            />
                        ))}
                    </View>
                )}

                {/* Section 1: Upcoming Liabilities */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Upcoming Liabilities</Text>
                            <Text style={styles.sectionSub}>Scheduled payments due soon</Text>
                        </View>
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{viewModel.upcomingOccurrences.length}</Text>
                        </View>
                    </View>

                    {viewModel.upcomingOccurrences.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <ShieldCheck size={28} color="#34D399" />
                            <Text style={styles.emptyTitle}>All Clear!</Text>
                            <Text style={styles.emptySub}>No liabilities due in the upcoming cycle</Text>
                        </View>
                    ) : (
                        viewModel.upcomingOccurrences.map(occ => (
                            <CommitmentCard
                                key={occ.id}
                                item={occ}
                                isOccurrence={true}
                                onPress={handleOpenOccurrence}
                                onQuickPay={handleQuickPay}
                            />
                        ))
                    )}
                </View>

                {/* Section 2: Failed Reconciliations (Retryable) */}
                {viewModel.hasFailed && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>Failed Reconciliations</Text>
                                <Text style={styles.sectionSub}>Cashbook write failed • Tap to retry</Text>
                            </View>
                            <View style={[styles.countBadge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                                <Text style={[styles.countBadgeText, { color: '#F59E0B' }]}>{viewModel.failedOccurrences.length}</Text>
                            </View>
                        </View>
                        {viewModel.failedOccurrences.map(occ => (
                            <View key={occ.id} style={styles.failedRowCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.failedRowTitle}>{occ.commitmentName}</Text>
                                    <Text style={styles.failedRowDesc}>{occ.errorMessage}</Text>
                                    <Text style={styles.failedRowSub}>Due: {occ.scheduledDate} • {occ.amountFormatted}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.failedRetryBtn}
                                    onPress={() => handleRetryPayment(occ)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.failedRetryText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Section 3: Recent Paid & Reconciled (Collapsible) */}
                {viewModel.recentPaid && viewModel.recentPaid.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Paid & Reconciled</Text>
                                <Text style={styles.sectionSub}>Posted directly to Cashbook ledger</Text>
                            </View>
                            <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>{viewModel.recentPaid.length}</Text>
                            </View>
                        </View>
                        {viewModel.recentPaid.slice(0, 5).map(occ => (
                            <TouchableOpacity
                                key={occ.id}
                                style={styles.paidRowCard}
                                onPress={() => handleOpenOccurrence(occ)}
                                activeOpacity={0.75}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.paidRowTitle}>{occ.commitmentName}</Text>
                                    <Text style={styles.paidRowSub}>Tx: {occ.cashbookTransactionId || 'Matched'} • Paid {occ.paidDate}</Text>
                                </View>
                                <Text style={styles.paidRowAmount}>{occ.amountFormatted}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Section 4: All Active Commitments */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Active Commitments</Text>
                            <Text style={styles.sectionSub}>All repeating financial obligations</Text>
                        </View>
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{viewModel.activeCommitments.length}</Text>
                        </View>
                    </View>

                    {viewModel.activeCommitments.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Repeat size={28} color="#D946EF" />
                            <Text style={styles.emptyTitle}>No Commitments Found</Text>
                            <Text style={styles.emptySub}>
                                {appMode === 'PRODUCTION'
                                    ? 'Add your first recurring EMI, subscription, or bill.'
                                    : 'No commitments match the selected filter.'}
                            </Text>

                            {/* Starter Templates */}
                            <View style={styles.starterWrap}>
                                <Text style={styles.starterTitle}>QUICK STARTER TEMPLATES</Text>
                                <TouchableOpacity
                                    style={styles.starterBtn}
                                    onPress={() => handleOpenTemplate({
                                        name: 'Child School Tuition',
                                        amountRupees: '8000',
                                        type: 'EDUCATION',
                                        financialNature: 'EXPENSE',
                                        category: 'Education',
                                        obligationCategory: 'CHILD_EDUCATION'
                                    })}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.starterBtnText}>+ Child School Tuition (₹8,000/mo)</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.starterBtn}
                                    onPress={() => handleOpenTemplate({
                                        name: 'Home Loan EMI',
                                        amountRupees: '25000',
                                        type: 'LOAN_EMI',
                                        financialNature: 'DEBT',
                                        category: 'Debt & Loans'
                                    })}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.starterBtnText}>+ Home Loan EMI (₹25,000/mo)</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.starterBtn}
                                    onPress={() => handleOpenTemplate({
                                        name: 'Family Health Insurance',
                                        amountRupees: '1500',
                                        type: 'INSURANCE',
                                        financialNature: 'EXPENSE',
                                        category: 'Insurance',
                                        obligationCategory: 'FAMILY_PROTECTION'
                                    })}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.starterBtnText}>+ Family Health Insurance (₹1,500/mo)</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.emptyAddBtn}
                                onPress={() => setAddModalVisible(true)}
                                activeOpacity={0.8}
                            >
                                <Plus size={16} color="#FFFFFF" />
                                <Text style={styles.emptyAddBtnText}>Add Custom Commitment</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        viewModel.activeCommitments.map(comm => (
                            <CommitmentCard
                                key={comm.id}
                                item={comm}
                                isOccurrence={false}
                                onPress={handleOpenCommitmentDetail}
                            />
                        ))
                    )}
                </View>

                {/* Bottom Add Action Button */}
                <TouchableOpacity
                    style={styles.bottomAddButton}
                    onPress={() => setAddModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={styles.bottomAddButtonText}>Add Recurring Commitment</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modals */}
            <CommitmentDetailModal
                visible={detailModalVisible}
                commitment={selectedCommitment}
                occurrence={selectedOccurrence}
                onClose={() => {
                    setDetailModalVisible(false);
                    setSelectedOccurrence(null);
                }}
                onRecordPayment={(comm, occ) => {
                    setDetailModalVisible(false);
                    const targetOcc = occ || occurrences.find(o => o.commitmentId === comm.id && o.status !== 'PAID');
                    if (targetOcc) {
                        setSelectedOccurrence(targetOcc);
                        setPaymentModalVisible(true);
                    }
                }}
                onTogglePause={handleTogglePause}
                onCancelCommitment={handleCancelCommitment}
                onReversePayment={handleReversePayment}
                onRetryPayment={handleRetryPayment}
            />

            <AddCommitmentModal
                visible={addModalVisible}
                initialValues={templateValues}
                onClose={() => {
                    setAddModalVisible(false);
                    setTemplateValues(null);
                }}
                onSave={handleSaveNewCommitment}
            />

            <RecordPaymentModal
                visible={paymentModalVisible}
                occurrence={selectedOccurrence}
                onClose={() => {
                    setPaymentModalVisible(false);
                    setSelectedOccurrence(null);
                }}
                onConfirmPayment={handleConfirmPayment}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0914'
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: '#0A0914',
        borderBottomWidth: 1,
        borderBottomColor: '#1A1829'
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#161426',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#2D2845'
    },
    headerTitleWrap: {
        alignItems: 'center'
    },
    headerSubtitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        color: '#D946EF'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    addHeaderBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#161426',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#2D2845'
    },
    scrollView: {
        flex: 1
    },
    scrollContent: {
        paddingBottom: 30
    },
    section: {
        marginTop: 18
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    sectionSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2
    },
    countBadge: {
        backgroundColor: '#1F1B38',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2D2845'
    },
    countBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#A78BFA'
    },
    emptyCard: {
        backgroundColor: '#141224',
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#201D35',
        gap: 8
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F1F5F9'
    },
    emptySub: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center'
    },
    emptyAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D946EF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
        marginTop: 8
    },
    emptyAddBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    bottomAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#701A75',
        marginHorizontal: 16,
        marginTop: 20,
        paddingVertical: 15,
        borderRadius: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: '#D946EF',
        shadowColor: '#D946EF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6
    },
    bottomAddButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    failedRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1C1318',
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#78350F'
    },
    failedRowTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FDE68A'
    },
    failedRowDesc: {
        fontSize: 11,
        color: '#F87171',
        marginTop: 2
    },
    failedRowSub: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2
    },
    failedRetryBtn: {
        backgroundColor: '#B45309',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 8
    },
    failedRetryText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    paidRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#121922',
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    paidRowTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E2E8F0'
    },
    paidRowSub: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2
    },
    paidRowAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10B981'
    },
    starterWrap: {
        width: '100%',
        marginTop: 12,
        gap: 8
    },
    starterTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1,
        marginBottom: 4
    },
    starterBtn: {
        backgroundColor: '#1C1930',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2D2845'
    },
    starterBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#C084FC'
    }
});
