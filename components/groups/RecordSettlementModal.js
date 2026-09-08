/**
 * components/groups/RecordSettlementModal.js
 * 
 * Modal for recording a debt settlement between two members.
 * Supports prefilled settlement suggestions, payment method selector, and notes.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { X, ArrowRight, Check, Send } from 'lucide-react-native';
import { SETTLEMENT_METHODS, toRupeesFormatted, paiseToRupees } from '../../services/shared-costs/groupContracts.js';

export default function RecordSettlementModal({
    visible,
    group,
    prefilledSettlement = null,
    onClose,
    onRecordSettlement
}) {
    const isVisible = Boolean(visible && group);
    const members = Array.isArray(group?.members) ? group.members : [];

    const [fromMemberId, setFromMemberId] = useState('');
    const [toMemberId, setToMemberId] = useState('');
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState(SETTLEMENT_METHODS.UPI);
    const [note, setNote] = useState('');

    useEffect(() => {
        if (visible) {
            if (prefilledSettlement) {
                setFromMemberId(prefilledSettlement.fromMemberId || '');
                setToMemberId(prefilledSettlement.toMemberId || '');
                setAmount(prefilledSettlement.amountPaise ? paiseToRupees(prefilledSettlement.amountPaise).toString() : '');
                setNote(prefilledSettlement.description || '');
            } else {
                setFromMemberId(members[0] ? members[0].id : '');
                setToMemberId(members[1] ? members[1].id : '');
                setAmount('');
                setNote('');
            }
            setMethod(SETTLEMENT_METHODS.UPI);
        }
    }, [visible, prefilledSettlement, group]);

    const handleSave = () => {
        if (!fromMemberId || !toMemberId) {
            Alert.alert('Members Required', 'Please select both the paying member and receiving member.');
            return;
        }
        if (fromMemberId === toMemberId) {
            Alert.alert('Invalid Selection', 'A member cannot settle with themselves.');
            return;
        }
        if (!amount || Number(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid settlement amount.');
            return;
        }

        onRecordSettlement({
            fromMemberId,
            toMemberId,
            amount: Number(amount),
            method,
            note: note.trim()
        });

        onClose();
    };

    const fromName = (members.find(m => m.id === fromMemberId) || {}).displayNameSnapshot || fromMemberId;
    const toName = (members.find(m => m.id === toMemberId) || {}).displayNameSnapshot || toMemberId;

    return (
        <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
            {group ? (
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Record Settlement</Text>
                            <Text style={styles.subtitle}>{group?.name || ''}</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#94A3B8" />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                        {/* Interactive Transfer Banner */}
                        <View style={styles.transferBanner}>
                            <View style={styles.personBox}>
                                <Text style={styles.personLabel}>Who Paid</Text>
                                <Text style={styles.personName}>{fromName || 'Select'}</Text>
                            </View>

                            <View style={styles.arrowCircle}>
                                <ArrowRight size={18} color="#10B981" />
                            </View>

                            <View style={styles.personBox}>
                                <Text style={styles.personLabel}>Who Received</Text>
                                <Text style={styles.personName}>{toName || 'Select'}</Text>
                            </View>
                        </View>

                        {/* Amount Entry */}
                        <View style={styles.amountContainer}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0.00"
                                placeholderTextColor="#475569"
                                keyboardType="decimal-pad"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>

                        {/* Paying Member Selector */}
                        <Text style={styles.sectionLabel}>Select Payer (Sent Money)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
                            {members.map(m => (
                                <Pressable
                                    key={m.id}
                                    style={[
                                        styles.memberPill,
                                        fromMemberId === m.id && styles.fromPillActive
                                    ]}
                                    onPress={() => setFromMemberId(m.id)}
                                >
                                    <Text style={[styles.pillText, fromMemberId === m.id && styles.pillTextActive]}>
                                        {m.displayNameSnapshot || m.name || m.id}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* Receiving Member Selector */}
                        <Text style={styles.sectionLabel}>Select Recipient (Received Money)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
                            {members.map(m => (
                                <Pressable
                                    key={m.id}
                                    style={[
                                        styles.memberPill,
                                        toMemberId === m.id && styles.toPillActive,
                                        fromMemberId === m.id && styles.memberPillDisabled
                                    ]}
                                    onPress={() => {
                                        if (fromMemberId !== m.id) setToMemberId(m.id);
                                    }}
                                    disabled={fromMemberId === m.id}
                                >
                                    <Text style={[styles.pillText, toMemberId === m.id && styles.pillTextActive]}>
                                        {m.displayNameSnapshot || m.name || m.id}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* Method Selector */}
                        <Text style={styles.sectionLabel}>Payment Mode</Text>
                        <View style={styles.methodsRow}>
                            {['UPI', 'CASH', 'BANK_TRANSFER'].map(mth => (
                                <Pressable
                                    key={mth}
                                    style={[styles.methodPill, method === mth && styles.methodPillActive]}
                                    onPress={() => setMethod(mth)}
                                >
                                    <Text style={[styles.methodText, method === mth && styles.methodTextActive]}>
                                        {mth.replace('_', ' ')}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Note */}
                        <Text style={styles.sectionLabel}>Note (Optional)</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. GPay ref #91823, Settling beach shack dinner"
                            placeholderTextColor="#64748B"
                            value={note}
                            onChangeText={setNote}
                        />
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Pressable style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable style={styles.submitBtn} onPress={handleSave}>
                            <Text style={styles.submitText}>Save Settlement</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
            ) : <View />}
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        justifyContent: 'flex-end'
    },
    sheet: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: '#334155'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    subtitle: {
        fontSize: 13,
        color: '#94A3B8'
    },
    closeBtn: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: '#0F172A'
    },
    scrollArea: {
        maxHeight: 480
    },
    transferBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16
    },
    personBox: {
        flex: 1,
        alignItems: 'center'
    },
    personLabel: {
        fontSize: 11,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4
    },
    personName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    arrowCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16
    },
    currencySymbol: {
        fontSize: 28,
        fontWeight: '700',
        color: '#10B981',
        marginRight: 6
    },
    amountInput: {
        fontSize: 32,
        fontWeight: '800',
        color: '#F8FAFC',
        minWidth: 120,
        textAlign: 'center'
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#CBD5E1',
        marginBottom: 8,
        marginTop: 10
    },
    pillRow: {
        flexDirection: 'row',
        marginBottom: 8
    },
    memberPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: '#0F172A',
        borderWidth: 1,
        borderColor: '#334155',
        marginRight: 8
    },
    fromPillActive: {
        backgroundColor: '#F43F5E',
        borderColor: '#F43F5E'
    },
    toPillActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981'
    },
    memberPillDisabled: {
        opacity: 0.3
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8'
    },
    pillTextActive: {
        color: '#FFFFFF'
    },
    methodsRow: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 8
    },
    methodPill: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8
    },
    methodPillActive: {
        backgroundColor: '#3B82F6'
    },
    methodText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8'
    },
    methodTextActive: {
        color: '#FFFFFF'
    },
    textInput: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 12,
        color: '#F8FAFC',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#334155'
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155'
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#475569',
        alignItems: 'center'
    },
    cancelText: {
        color: '#94A3B8',
        fontWeight: '600',
        fontSize: 14
    },
    submitBtn: {
        flex: 2,
        backgroundColor: '#10B981',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    submitText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14
    }
});
