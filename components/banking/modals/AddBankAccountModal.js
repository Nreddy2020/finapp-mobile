/**
 * FinLife Banking Relationship Intelligence — Add Bank Account Modal
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { X, CreditCard } from 'lucide-react-native';
import { BankingService } from '../../../services/bankingService';
import { createBankAccount, BANK_ACCOUNT_TYPE, toPaise } from '../bankingDomainModel';

export default function AddBankAccountModal({ visible, banks = [], onClose, onAccountAdded }) {
    const [selectedBankId, setSelectedBankId] = useState(banks[0]?.id || '');
    const [accountName, setAccountName] = useState('');
    const [maskedAcc, setMaskedAcc] = useState('•••• 0000');
    const [openingBalance, setOpeningBalance] = useState('0');
    const [accountType, setAccountType] = useState(BANK_ACCOUNT_TYPE.SAVINGS);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!selectedBankId) {
            Alert.alert('Validation Error', 'Please select a bank.');
            return;
        }
        if (!accountName.trim()) {
            Alert.alert('Validation Error', 'Account name is required.');
            return;
        }
        try {
            setLoading(true);
            const openPaise = toPaise(openingBalance || 0);
            const acc = createBankAccount({
                bankId: selectedBankId,
                accountName,
                maskedAccountNumber: maskedAcc,
                accountType,
                openingBalancePaise: openPaise
            });

            await BankingService.saveAccount(acc, openPaise);
            Alert.alert('Account Created', `${acc.accountName} successfully added.`);
            setAccountName('');
            setOpeningBalance('0');
            onAccountAdded?.();
            onClose();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to create account.');
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <ScrollView style={styles.modalCard} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <CreditCard size={20} color="#818CF8" />
                            <Text style={styles.modalTitle}>Add Bank Account</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}><X size={20} color="#94A3B8" /></TouchableOpacity>
                    </View>

                    {/* Bank Selection */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>SELECT BANK</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 6 }}>
                            {banks.map(b => (
                                <TouchableOpacity
                                    key={b.id}
                                    style={[styles.bankPill, (selectedBankId || banks[0]?.id) === b.id && styles.bankPillActive]}
                                    onPress={() => setSelectedBankId(b.id)}
                                >
                                    <Text style={[styles.bankPillText, (selectedBankId || banks[0]?.id) === b.id && styles.bankPillTextActive]}>
                                        {b.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>ACCOUNT NAME</Text>
                        <TextInput
                            style={styles.input}
                            value={accountName}
                            onChangeText={setAccountName}
                            placeholder="e.g. Salary Account"
                            placeholderTextColor="#71717A"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>MASKED NUMBER</Text>
                        <TextInput
                            style={styles.input}
                            value={maskedAcc}
                            onChangeText={setMaskedAcc}
                            placeholder="•••• 4821"
                            placeholderTextColor="#71717A"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>OPENING BALANCE (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={openingBalance}
                            onChangeText={setOpeningBalance}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor="#71717A"
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        <Text style={styles.submitBtnText}>{loading ? 'Creating...' : 'Save Account'}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end'
    },
    modalCard: {
        backgroundColor: '#0F1026',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderColor: '#232548',
        borderWidth: 1,
        padding: 20,
        maxHeight: '85%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    inputGroup: {
        gap: 4
    },
    inputLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700'
    },
    bankPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: '#16182E',
        borderWidth: 1,
        borderColor: '#232548',
        marginRight: 6
    },
    bankPillActive: {
        backgroundColor: '#3730A3',
        borderColor: '#6366F1'
    },
    bankPillText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700'
    },
    bankPillTextActive: {
        color: '#FFFFFF'
    },
    input: {
        backgroundColor: '#16182E',
        borderColor: '#232548',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    submitBtn: {
        backgroundColor: '#4F46E5',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    }
});
