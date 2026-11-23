/**
 * components/cashbook/CreateBookModal.js
 *
 * Create a new purpose-driven cashbook (V3).
 *
 * Replaces the legacy `components/cashbooks/CreateBookModal.js`, which produced the
 * old { balance, total_in, transactions[] } shape that the V3 ledger rejects.
 * This modal only collects the user's choice ({ name, type, description });
 * the screen builds the full entity through createCashbook() so the book carries its
 * complete type configuration (balance mode, closing rules, denomination support...).
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { CashbookType } from '../../services/cashbook/cashbookContracts.js';

const BOOK_TYPE_OPTIONS = [
    { type: CashbookType.SAVINGS, label: 'Personal / Savings', desc: 'Salary, household & personal expenses', color: '#3B82F6' },
    { type: CashbookType.HANDY_CASH, label: 'Handy Cash Register', desc: 'Daily till with cash count & closing', color: '#0EA5E9' },
    { type: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS, label: 'Business', desc: 'Sales, purchases, receivables & payables', color: '#F97316' },
    { type: CashbookType.REGULAR_INCOME, label: 'Regular Income', desc: 'Salary & recurring income tracking', color: '#14B8A6' },
    { type: CashbookType.LOANS_TAKEN, label: 'Loans Taken', desc: 'Money you owe, EMIs and interest', color: '#EAB308' },
    { type: CashbookType.LOANS_GIVEN, label: 'Loans Given', desc: 'Money others owe you', color: '#CA8A04' },
    { type: CashbookType.PF, label: 'PF / Retirement', desc: 'Provident fund & retirement savings', color: '#8B5CF6' },
    { type: CashbookType.INVESTMENTS, label: 'Investments', desc: 'Mutual funds, stocks & other holdings', color: '#10B981' },
    { type: CashbookType.CUSTOM, label: 'Custom Purpose', desc: 'Any dedicated fund (e.g. home project)', color: '#F43F5E' }
];

export default function CreateBookModal({
    visible,
    onClose,
    onCreate,
    existingNames = [],
    initialType = CashbookType.SAVINGS
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState(initialType);
    const [submitting, setSubmitting] = useState(false);

    // Fresh form each time the sheet opens
    useEffect(() => {
        if (visible) {
            setName('');
            setDescription('');
            setType(initialType);
            setSubmitting(false);
        }
    }, [visible, initialType]);

    const handleCreate = async () => {
        if (submitting) return;
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            Alert.alert('Book Name Required', 'Give your cashbook a name (at least 2 characters).');
            return;
        }
        const duplicate = existingNames.some(n => (n || '').trim().toLowerCase() === trimmed.toLowerCase());
        if (duplicate) {
            Alert.alert('Name Already Used', `You already have a cashbook called "${trimmed}". Choose a different name.`);
            return;
        }

        try {
            setSubmitting(true);
            await onCreate({ name: trimmed, type, description: description.trim() });
            onClose();
        } catch (err) {
            // The screen already showed the error; keep the form open for correction.
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>New Cashbook</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel="Close"
                        >
                            <X size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.body}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={styles.label}>BOOK NAME</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Shop Register, Home Project"
                            placeholderTextColor="#94A3B8"
                            value={name}
                            onChangeText={setName}
                            maxLength={40}
                            autoFocus
                        />

                        <Text style={[styles.label, styles.labelSpaced]}>BOOK TYPE</Text>
                        {BOOK_TYPE_OPTIONS.map(opt => {
                            const selected = type === opt.type;
                            return (
                                <TouchableOpacity
                                    key={opt.type}
                                    style={[
                                        styles.typeCard,
                                        selected && { borderColor: opt.color, backgroundColor: '#F8FAFC' }
                                    ]}
                                    onPress={() => setType(opt.type)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.typeDot, { backgroundColor: opt.color }]} />
                                    <View style={styles.typeText}>
                                        <Text style={styles.typeLabel}>{opt.label}</Text>
                                        <Text style={styles.typeDesc}>{opt.desc}</Text>
                                    </View>
                                    {selected && (
                                        <View style={[styles.checkCircle, { backgroundColor: opt.color }]}>
                                            <Check size={12} color="#FFFFFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}

                        <Text style={[styles.label, styles.labelSpaced]}>DESCRIPTION (OPTIONAL)</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="What is this book for?"
                            placeholderTextColor="#94A3B8"
                            value={description}
                            onChangeText={setDescription}
                            maxLength={120}
                            multiline
                        />
                    </ScrollView>

                    <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
                        <TouchableOpacity
                            style={[styles.createBtn, (submitting || name.trim().length < 2) && styles.createBtnDisabled]}
                            onPress={handleCreate}
                            disabled={submitting || name.trim().length < 2}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.createBtnText}>{submitting ? 'Creating...' : 'Create Cashbook'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'flex-end'
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A'
    },
    closeBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#F1F5F9'
    },
    body: {
        padding: 20
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.8,
        marginBottom: 8
    },
    labelSpaced: {
        marginTop: 20
    },
    input: {
        fontSize: 15,
        color: '#0F172A',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    inputMultiline: {
        minHeight: 64,
        textAlignVertical: 'top'
    },
    typeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        marginBottom: 8
    },
    typeDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12
    },
    typeText: {
        flex: 1
    },
    typeLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A'
    },
    typeDesc: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2
    },
    checkCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center'
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    createBtn: {
        backgroundColor: '#6366F1',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center'
    },
    createBtnDisabled: {
        opacity: 0.45
    },
    createBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800'
    }
});
