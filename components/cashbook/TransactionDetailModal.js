/**
 * components/cashbook/TransactionDetailModal.js
 * 
 * Displays complete transaction metadata, audit information,
 * and allows voiding non-immutable transactions with a mandatory reason.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    Platform
} from 'react-native';
import { X, Trash2, Ban, ShieldCheck, Clock, Hash } from 'lucide-react-native';
import { TransactionType, TransactionStatus } from '../../services/cashbook/cashbookContracts.js';

export default function TransactionDetailModal({
    visible,
    transaction,
    onClose,
    onVoid
}) {
    const [isVoiding, setIsVoiding] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (!transaction) return null;

    const raw = transaction.rawTxn || transaction;
    const isVoided = raw.status === TransactionStatus.VOIDED;
    const isOpening = raw.transactionType === TransactionType.OPENING_BALANCE;

    const handleConfirmVoid = async () => {
        if (!voidReason.trim()) {
            Alert.alert('Void Reason Required', 'Please provide a mandatory reason for voiding this transaction.');
            return;
        }

        try {
            setLoading(true);
            await onVoid(raw.id, voidReason.trim());
            setIsVoiding(false);
            setVoidReason('');
            onClose();
        } catch (err) {
            Alert.alert('Void Failed', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleWrap}>
                            <Text style={styles.headerTitle}>Transaction Details</Text>
                            <Text style={styles.headerId}>{raw.id}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                        {/* Amount & Status Hero */}
                        <View style={styles.amountHero}>
                            <Text style={[styles.heroAmount, { color: transaction.amountColor || '#F8FAFC' }]}>
                                {transaction.formattedAmount}
                            </Text>
                            <View style={[styles.statusBadge, isVoided && styles.statusBadgeVoided]}>
                                <Text style={[styles.statusText, isVoided && styles.statusTextVoided]}>
                                    {raw.status}
                                </Text>
                            </View>
                        </View>

                        {/* Voided Details Notice */}
                        {isVoided && (
                            <View style={styles.voidNotice}>
                                <Ban size={14} color="#EF4444" />
                                <View style={styles.voidNoticeContent}>
                                    <Text style={styles.voidNoticeTitle}>Transaction Voided</Text>
                                    <Text style={styles.voidNoticeReason}>Reason: "{raw.voidReason}"</Text>
                                    {raw.voidedAt && (
                                        <Text style={styles.voidNoticeDate}>At: {raw.voidedAt}</Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Info Grid */}
                        <View style={styles.infoSection}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Type</Text>
                                <Text style={styles.infoValue}>{raw.transactionType}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Date</Text>
                                <Text style={styles.infoValue}>{raw.date}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Description</Text>
                                <Text style={styles.infoValue}>{raw.description}</Text>
                            </View>

                            {raw.category ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Category</Text>
                                    <Text style={styles.infoValue}>{raw.category}</Text>
                                </View>
                            ) : null}

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Account</Text>
                                <Text style={styles.infoValue}>{transaction.accountDisplay || raw.accountId}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Source</Text>
                                <Text style={styles.infoValue}>{raw.source || 'MANUAL'}</Text>
                            </View>

                            {raw.idempotencyKey ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Idempotency Key</Text>
                                    <Text style={[styles.infoValue, styles.monoText]}>{raw.idempotencyKey}</Text>
                                </View>
                            ) : null}

                            {raw.transferGroupId ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Transfer Group</Text>
                                    <Text style={[styles.infoValue, styles.monoText]}>{raw.transferGroupId}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Voiding Form */}
                        {isVoiding && (
                            <View style={styles.voidForm}>
                                <Text style={styles.voidFormLabel}>MANDATORY VOID REASON</Text>
                                <TextInput
                                    style={styles.voidInput}
                                    placeholder="Enter reason for voiding (e.g. Billed twice, Entered wrong amount)"
                                    placeholderTextColor="#64748B"
                                    value={voidReason}
                                    onChangeText={setVoidReason}
                                />
                                <View style={styles.voidFormActions}>
                                    <TouchableOpacity
                                        onPress={() => setIsVoiding(false)}
                                        style={styles.cancelVoidBtn}
                                    >
                                        <Text style={styles.cancelVoidText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleConfirmVoid}
                                        style={styles.confirmVoidBtn}
                                        disabled={loading}
                                    >
                                        <Text style={styles.confirmVoidText}>
                                            {loading ? 'Voiding...' : 'Confirm Void'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer Actions */}
                    {!isVoided && !isOpening && !isVoiding && (
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.voidActionBtn}
                                onPress={() => setIsVoiding(true)}
                                activeOpacity={0.8}
                            >
                                <Trash2 size={16} color="#EF4444" />
                                <Text style={styles.voidActionText}>Void Transaction</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        padding: 20
    },
    card: {
        backgroundColor: '#0F172A',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
        maxHeight: '85%',
        overflow: 'hidden'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B'
    },
    headerTitleWrap: {
        flex: 1
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    headerId: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
    },
    closeBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#1E293B'
    },
    body: {
        padding: 20
    },
    amountHero: {
        alignItems: 'center',
        marginBottom: 20
    },
    heroAmount: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 6
    },
    statusBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    statusBadgeVoided: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#10B981'
    },
    statusTextVoided: {
        color: '#EF4444'
    },
    voidNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.25)',
        marginBottom: 16,
        gap: 10
    },
    voidNoticeContent: {
        flex: 1
    },
    voidNoticeTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#EF4444',
        marginBottom: 2
    },
    voidNoticeReason: {
        fontSize: 12,
        color: '#CBD5E1'
    },
    voidNoticeDate: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 3
    },
    infoSection: {
        backgroundColor: '#1E293B',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)'
    },
    infoLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600'
    },
    infoValue: {
        fontSize: 12,
        color: '#F8FAFC',
        fontWeight: '500',
        maxWidth: '65%',
        textAlign: 'right'
    },
    monoText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 10
    },
    voidForm: {
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        marginTop: 4
    },
    voidFormLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#EF4444',
        marginBottom: 8
    },
    voidInput: {
        backgroundColor: '#1E293B',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        color: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 12
    },
    voidFormActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8
    },
    cancelVoidBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#334155'
    },
    cancelVoidText: {
        fontSize: 12,
        color: '#CBD5E1',
        fontWeight: '600'
    },
    confirmVoidBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#EF4444'
    },
    confirmVoidText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '700'
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#1E293B',
        backgroundColor: '#0F172A'
    },
    voidActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    voidActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#EF4444'
    }
});
