/**
 * FinLife Banking Relationship Intelligence — Add Bank Modal
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { X, Landmark } from 'lucide-react-native';
import { BankingService } from '../../../services/bankingService';
import { createBank, BANK_TYPE } from '../bankingDomainModel';

export default function AddBankModal({ visible, onClose, onBankAdded }) {
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [type, setType] = useState(BANK_TYPE.PRIVATE);
    const [contact, setContact] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Bank name is required.');
            return;
        }
        try {
            setLoading(true);
            const bank = createBank({
                name,
                shortName,
                type,
                primaryContact: contact
            });
            await BankingService.saveBank(bank);
            Alert.alert('Bank Added', `${bank.name} relationship created.`);
            setName('');
            setShortName('');
            setContact('');
            onBankAdded?.();
            onClose();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to create bank.');
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Landmark size={20} color="#818CF8" />
                            <Text style={styles.modalTitle}>Add Bank Relationship</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}><X size={20} color="#94A3B8" /></TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>BANK / LENDER NAME</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. State Bank of India"
                            placeholderTextColor="#71717A"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>SHORT NAME</Text>
                        <TextInput
                            style={styles.input}
                            value={shortName}
                            onChangeText={setShortName}
                            placeholder="e.g. SBI"
                            placeholderTextColor="#71717A"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>CONTACT / HELPLINE</Text>
                        <TextInput
                            style={styles.input}
                            value={contact}
                            onChangeText={setContact}
                            placeholder="e.g. 1800 1234"
                            placeholderTextColor="#71717A"
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        <Text style={styles.submitBtnText}>{loading ? 'Creating...' : 'Save Bank'}</Text>
                    </TouchableOpacity>
                </View>
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
        gap: 12
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
