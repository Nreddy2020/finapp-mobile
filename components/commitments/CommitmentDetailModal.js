/**
 * components/commitments/CommitmentDetailModal.js
 * 
 * Detailed inspection modal for a recurring financial commitment.
 * Displays financial nature, frequency breakdown, audit history,
 * and lifecycle actions (Record Payment, Pause/Resume, Cancel).
 */

import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert
} from 'react-native';
import {
    X,
    Calendar,
    DollarSign,
    CheckCircle,
    PauseCircle,
    PlayCircle,
    XCircle,
    Tag,
    Clock,
    CreditCard,
    HeartHandshake,
    AlertTriangle,
    RotateCcw
} from 'lucide-react-native';

export default function CommitmentDetailModal({
    visible,
    commitment,
    occurrence = null,
    onClose,
    onRecordPayment,
    onTogglePause,
    onCancelCommitment,
    onReversePayment,
    onRetryPayment
}) {
    if (!commitment && !occurrence) return null;

    const activeItem = commitment || {};
    const isPaused = activeItem.status === 'PAUSED';
    const isCancelled = activeItem.status === 'CANCELLED';
    const isPaid = occurrence?.status === 'PAID';
    const isFailed = occurrence?.status === 'FAILED_RECONCILIATION';

    const handleCancel = () => {
        Alert.alert(
            'Cancel Commitment',
            `Are you sure you want to cancel ${activeItem.name}? All historical payment records will be preserved, but upcoming occurrences will be cancelled.`,
            [
                { text: 'No, Keep It', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: () => onCancelCommitment && onCancelCommitment(activeItem)
                }
            ]
        );
    };

    const handleReverse = () => {
        Alert.alert(
            'Reverse Payment',
            `Are you sure you want to reverse this payment of ${occurrence?.amountFormatted || ''}? A refund transaction will be posted to Cashbook and this occurrence will return to UPCOMING.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Reverse',
                    style: 'destructive',
                    onPress: () => onReversePayment && onReversePayment(occurrence)
                }
            ]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.typeLabel}>{activeItem.type || 'COMMITMENT'} • {activeItem.financialNature || 'EXPENSE'}</Text>
                            <Text style={styles.title}>{activeItem.name || occurrence?.commitmentName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                            <X size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                        {/* Family Linkage Badge */}
                        {(activeItem.familyMemberLabel || activeItem.familyContext) && (
                            <View style={styles.familyBadge}>
                                <HeartHandshake size={14} color="#F472B6" />
                                <Text style={styles.familyBadgeText}>
                                    For: {activeItem.familyMemberLabel || activeItem.familyContext?.familyRole}
                                    {activeItem.isOrphaned ? ' (Orphaned)' : ''}
                                </Text>
                            </View>
                        )}

                        {/* Failed Reconciliation Alert */}
                        {isFailed && (
                            <View style={styles.failedAlert}>
                                <AlertTriangle size={18} color="#EF4444" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.failedAlertTitle}>Reconciliation Failed</Text>
                                    <Text style={styles.failedAlertDesc}>
                                        {occurrence?.errorMessage || occurrence?.lastReconciliationError || 'Cashbook write failed'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Paid & Reconciled Badge */}
                        {isPaid && (
                            <View style={styles.paidBadge}>
                                <CheckCircle size={16} color="#10B981" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.paidBadgeTitle}>Paid & Reconciled to Cashbook</Text>
                                    <Text style={styles.paidBadgeSub}>
                                        Tx: {occurrence?.cashbookTransactionId || occurrence?.transactionId || 'Matched'} • Paid on {occurrence?.paidDate}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Amount Card */}
                        <View style={styles.amountCard}>
                            <Text style={styles.amountLabel}>
                                {isPaid ? 'Amount Paid' : 'Scheduled Amount'}
                            </Text>
                            <Text style={styles.amountValue}>
                                {occurrence?.amountFormatted || activeItem.amountFormatted || `₹${activeItem.amount?.paise ? (Number(activeItem.amount.paise) / 100).toLocaleString('en-IN') : '0'}`}
                            </Text>
                            <Text style={styles.frequencyText}>
                                {activeItem.frequencyLabel ? `Billed ${activeItem.frequencyLabel}` : `Due: ${occurrence?.scheduledDate || activeItem.nextDueDate}`}
                                {activeItem.normalizedMonthlyNote ? ` • ${activeItem.normalizedMonthlyNote}` : ''}
                            </Text>
                        </View>

                        {/* Details Grid */}
                        <View style={styles.detailsGrid}>
                            <View style={styles.detailRow}>
                                <View style={styles.detailItem}>
                                    <Clock size={16} color="#A78BFA" />
                                    <View>
                                        <Text style={styles.itemLabel}>Due Date</Text>
                                        <Text style={styles.itemValue}>{occurrence?.scheduledDate || activeItem.nextDueDate || 'None'}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailItem}>
                                    <Tag size={16} color="#F472B6" />
                                    <View>
                                        <Text style={styles.itemLabel}>Category</Text>
                                        <Text style={styles.itemValue}>{activeItem.category || 'General'}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.detailRow}>
                                <View style={styles.detailItem}>
                                    <Calendar size={16} color="#34D399" />
                                    <View>
                                        <Text style={styles.itemLabel}>Started On</Text>
                                        <Text style={styles.itemValue}>{activeItem.startDate || 'N/A'}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailItem}>
                                    <CheckCircle size={16} color="#38BDF8" />
                                    <View>
                                        <Text style={styles.itemLabel}>Status</Text>
                                        <Text style={[
                                            styles.itemValue,
                                            isPaused && styles.statusPaused,
                                            isCancelled && styles.statusCancelled,
                                            isPaid && { color: '#10B981' },
                                            isFailed && { color: '#EF4444' }
                                        ]}>
                                            {occurrence?.status || activeItem.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionsWrap}>
                            {isPaid ? (
                                <TouchableOpacity
                                    style={[styles.primaryActionBtn, { backgroundColor: '#7F1D1D' }]}
                                    onPress={handleReverse}
                                    activeOpacity={0.8}
                                >
                                    <RotateCcw size={18} color="#FFFFFF" />
                                    <Text style={styles.primaryActionText}>Reverse Payment</Text>
                                </TouchableOpacity>
                            ) : isFailed ? (
                                <TouchableOpacity
                                    style={[styles.primaryActionBtn, { backgroundColor: '#D97706' }]}
                                    onPress={() => onRetryPayment && onRetryPayment(occurrence)}
                                    activeOpacity={0.8}
                                >
                                    <RotateCcw size={18} color="#FFFFFF" />
                                    <Text style={styles.primaryActionText}>Retry Cashbook Reconciliation</Text>
                                </TouchableOpacity>
                            ) : !isCancelled && (
                                <TouchableOpacity
                                    style={styles.primaryActionBtn}
                                    onPress={() => onRecordPayment && onRecordPayment(activeItem, occurrence)}
                                    activeOpacity={0.8}
                                >
                                    <CheckCircle size={18} color="#FFFFFF" />
                                    <Text style={styles.primaryActionText}>Record Payment</Text>
                                </TouchableOpacity>
                            )}

                            {commitment && !isCancelled && (
                                <View style={styles.secondaryActionsRow}>
                                    <TouchableOpacity
                                        style={styles.secondaryActionBtn}
                                        onPress={() => onTogglePause && onTogglePause(activeItem)}
                                        activeOpacity={0.7}
                                    >
                                        {isPaused ? (
                                            <>
                                                <PlayCircle size={16} color="#34D399" />
                                                <Text style={[styles.secondaryActionText, { color: '#34D399' }]}>Resume</Text>
                                            </>
                                        ) : (
                                            <>
                                                <PauseCircle size={16} color="#FBBF24" />
                                                <Text style={[styles.secondaryActionText, { color: '#FBBF24' }]}>Pause</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.secondaryActionBtn, styles.cancelBtn]}
                                        onPress={handleCancel}
                                        activeOpacity={0.7}
                                    >
                                        <XCircle size={16} color="#EF4444" />
                                        <Text style={[styles.secondaryActionText, { color: '#EF4444' }]}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end'
    },
    sheet: {
        backgroundColor: '#161426',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: '#2D2845'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#242038'
    },
    typeLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#D946EF',
        letterSpacing: 0.8,
        marginBottom: 4
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#242038',
        alignItems: 'center',
        justifyContent: 'center'
    },
    body: {
        paddingHorizontal: 20
    },
    bodyContent: {
        paddingVertical: 20,
        gap: 16
    },
    amountCard: {
        backgroundColor: '#1F1B38',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(217, 70, 239, 0.2)'
    },
    amountLabel: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 6,
        fontWeight: '500'
    },
    amountValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    frequencyText: {
        fontSize: 13,
        color: '#CBD5E1',
        marginTop: 6,
        fontWeight: '500'
    },
    detailsGrid: {
        backgroundColor: '#1A172E',
        borderRadius: 16,
        padding: 16,
        gap: 16,
        borderWidth: 1,
        borderColor: '#242038'
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1
    },
    itemLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500'
    },
    itemValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F1F5F9',
        marginTop: 2
    },
    statusPaused: {
        color: '#FBBF24'
    },
    statusCancelled: {
        color: '#EF4444'
    },
    actionsWrap: {
        gap: 10,
        marginTop: 8
    },
    primaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D946EF',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8
    },
    primaryActionText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    secondaryActionsRow: {
        flexDirection: 'row',
        gap: 10
    },
    secondaryActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#242038',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6
    },
    cancelBtn: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)'
    },
    secondaryActionText: {
        fontSize: 13,
        fontWeight: '600'
    },
    familyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2E1065',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#701A75'
    },
    familyBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F472B6'
    },
    failedAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderWidth: 1,
        borderColor: '#EF4444',
        borderRadius: 12,
        padding: 12,
        gap: 10,
        marginBottom: 8
    },
    failedAlertTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#EF4444'
    },
    failedAlertDesc: {
        fontSize: 11,
        color: '#FCA5A5',
        marginTop: 2
    },
    paidBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 1,
        borderColor: '#10B981',
        borderRadius: 12,
        padding: 12,
        gap: 10,
        marginBottom: 8
    },
    paidBadgeTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10B981'
    },
    paidBadgeSub: {
        fontSize: 11,
        color: '#6EE7B7',
        marginTop: 2
    }
});
