/**
 * components/cashbook/AccountManageModal.js
 * 
 * Account management modal: displays registered accounts and allows adding
 * a new account with an initial immutable opening balance.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { X, Plus, Landmark, Wallet, CreditCard, ShieldCheck } from 'lucide-react-native';
import { AccountType, createAccount, createOpeningBalanceRecord, rupeesToMoneyPaise } from '../../services/cashbook/cashbookContracts.js';

export default function AccountManageModal({
    visible,
    accounts = [],
    bookId,
    onClose,
    onSaveAccount
}) {
    const [isAdding, setIsAdding] = useState(false);
    const [accountName, setAccountName] = useState('');
    const [accountType, setAccountType] = useState(AccountType.BANK);
    const [institution, setInstitution] = useState('');
    const [accountLast4, setAccountLast4] = useState('');
    const [openingRupees, setOpeningRupees] = useState('0');
    const [loading, setLoading] = useState(false);

    // Warn in development if required bookId prop is missing
    useEffect(() => {
        if (!bookId && typeof __DEV__ !== 'undefined' && __DEV__) {
            console.warn('[AccountManageModal] Missing required prop "bookId"');
        }
    }, [bookId]);

    // Scope accounts to the current book (or legacy accounts with no bookId)
    const bookAccounts = useMemo(() => {
        if (!bookId) return accounts;
        return accounts.filter(a => a.bookId === bookId || !a.bookId);
    }, [accounts, bookId]);

    // Always reopen on the account list, never half-way through the add form
    useEffect(() => {
        if (!visible) {
            setIsAdding(false);
            setLoading(false);
        }
    }, [visible]);

    const TYPE_LABELS = {
        BANK: 'Bank Account',
        CASH: 'Cash in Hand',
        WALLET: 'UPI / Wallet',
        CREDIT_CARD: 'Credit Card',
        LOAN: 'Loan Account',
        INVESTMENT: 'Investment',
        OTHER: 'Other'
    };
    const isLiabilityType = accountType === AccountType.CREDIT_CARD || accountType === AccountType.LOAN;

    const accountTypeOptions = [
        { type: AccountType.BANK, label: 'Bank Account' },
        { type: AccountType.CASH, label: 'Cash in Hand' },
        { type: AccountType.WALLET, label: 'UPI / Wallet' },
        { type: AccountType.CREDIT_CARD, label: 'Credit Card' },
        { type: AccountType.LOAN, label: 'Loan Account' }
    ];

    const handleCreateAccount = async () => {
        if (!accountName.trim()) {
            Alert.alert('Missing Name', 'Please provide an account name.');
            return;
        }

        const duplicate = bookAccounts.some(
            a => (a.name || '').trim().toLowerCase() === accountName.trim().toLowerCase()
        );
        if (duplicate) {
            Alert.alert('Duplicate Account', `An account named "${accountName.trim()}" already exists.`);
            return;
        }

        const openingText = (openingRupees || '0').replace(/[₹,\s]/g, '');
        if (!/^\d+(\.\d{1,2})?$/.test(openingText) || Number(openingText) > 999999999999) {
            Alert.alert('Invalid Opening Balance', 'Enter a non-negative amount with at most 2 decimal places.');
            return;
        }
        const openingNum = Number(openingText);

        try {
            setLoading(true);
            const accountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const newAccount = createAccount({
                id: accountId,
                name: accountName.trim(),
                type: accountType,
                institution: institution.trim(),
                accountNumberLast4: accountLast4.trim(),
                bookId: bookId || null
            });

            const openingRecord = createOpeningBalanceRecord({
                id: `op_${accountId}`,
                accountId: newAccount.id,
                amount: rupeesToMoneyPaise(openingNum),
                description: `Opening Balance - ${newAccount.name}`
            });

            await onSaveAccount(newAccount, openingRecord);

            // Reset
            setAccountName('');
            setInstitution('');
            setAccountLast4('');
            setOpeningRupees('0');
            setIsAdding(false);
        } catch (err) {
            Alert.alert('Account Creation Failed', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Managed Accounts</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.body}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Existing Accounts List */}
                        {!isAdding && (
                            <View style={styles.accountsSection}>
                                <Text style={styles.sectionTitle}>REGISTERED ACCOUNTS</Text>
                                {bookAccounts.length === 0 ? (
                                    <View style={styles.emptyWrap}>
                                        <Text style={styles.emptyText}>No accounts registered for this cashbook yet.</Text>
                                    </View>
                                ) : (
                                    bookAccounts.map(acc => (
                                        <View key={acc.id} style={styles.accountItem}>
                                            <View style={styles.accountItemLeft}>
                                                <View style={styles.accountIconWrap}>
                                                    {acc.type === AccountType.BANK ? (
                                                        <Landmark size={16} color="#6366F1" />
                                                    ) : acc.type === AccountType.CREDIT_CARD ? (
                                                        <CreditCard size={16} color="#F472B6" />
                                                    ) : (
                                                        <Wallet size={16} color="#34D399" />
                                                    )}
                                                </View>
                                                <View>
                                                    <Text style={styles.accName}>{acc.name}</Text>
                                                    <Text style={styles.accMeta}>
                                                        {TYPE_LABELS[acc.type] || acc.type} {acc.accountNumberLast4 ? `• **** ${acc.accountNumberLast4}` : ''}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.accBalance, acc.isNegative && styles.accBalanceNegative]}>
                                                {acc.formattedBalance}
                                            </Text>
                                        </View>
                                    ))
                                )}

                                <TouchableOpacity
                                    style={styles.addTriggerBtn}
                                    onPress={() => setIsAdding(true)}
                                    activeOpacity={0.8}
                                >
                                    <Plus size={16} color="#FFFFFF" />
                                    <Text style={styles.addTriggerText}>Add New Account</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Add Account Form */}
                        {isAdding && (
                            <View style={styles.addForm}>
                                <Text style={styles.sectionTitle}>NEW ACCOUNT DETAILS</Text>

                                {/* Account Type */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>ACCOUNT TYPE</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                                        {accountTypeOptions.map(opt => (
                                            <TouchableOpacity
                                                key={opt.type}
                                                onPress={() => setAccountType(opt.type)}
                                                style={[styles.typePill, accountType === opt.type && styles.typePillActive]}
                                            >
                                                <Text style={[styles.typePillText, accountType === opt.type && styles.typePillTextActive]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Name */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>ACCOUNT NAME</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. HDFC Salary, Home Cash"
                                        placeholderTextColor="#64748B"
                                        value={accountName}
                                        onChangeText={setAccountName}
                                    />
                                </View>

                                {/* Institution */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>INSTITUTION (OPTIONAL)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. HDFC Bank, SBI"
                                        placeholderTextColor="#64748B"
                                        value={institution}
                                        onChangeText={setInstitution}
                                    />
                                </View>

                                {/* Last 4 digits */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>LAST 4 DIGITS (OPTIONAL)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. 4092"
                                        placeholderTextColor="#64748B"
                                        keyboardType="numeric"
                                        maxLength={4}
                                        value={accountLast4}
                                        onChangeText={setAccountLast4}
                                    />
                                </View>

                                {/* Opening Balance */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>
                                        {isLiabilityType ? 'AMOUNT CURRENTLY OWED (₹)' : 'INITIAL OPENING BALANCE (₹)'}
                                    </Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0.00"
                                        placeholderTextColor="#64748B"
                                        keyboardType="decimal-pad"
                                        value={openingRupees}
                                        onChangeText={setOpeningRupees}
                                    />
                                    <Text style={styles.fieldNote}>
                                        This creates an immutable ledger baseline record.
                                    </Text>
                                </View>

                                <View style={styles.addFormActions}>
                                    <TouchableOpacity
                                        onPress={() => setIsAdding(false)}
                                        style={styles.cancelBtn}
                                    >
                                        <Text style={styles.cancelBtnText}>Back</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleCreateAccount}
                                        style={styles.confirmAddBtn}
                                        disabled={loading}
                                    >
                                        <Text style={styles.confirmAddText}>
                                            {loading ? 'Creating...' : 'Create Account'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end'
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        maxHeight: '85%'
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
        fontWeight: '700',
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
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: '#64748B',
        marginBottom: 12
    },
    accountsSection: {
        marginBottom: 10
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8
    },
    accountItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    accountIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center'
    },
    accName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A'
    },
    accMeta: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2
    },
    accBalance: {
        fontSize: 15,
        fontWeight: '700',
        color: '#10B981'
    },
    accBalanceNegative: {
        color: '#EF4444'
    },
    addTriggerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 14
    },
    addTriggerText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    emptyWrap: {
        padding: 24,
        alignItems: 'center'
    },
    emptyText: {
        fontSize: 13,
        color: '#64748B'
    },
    addForm: {
        paddingBottom: 20
    },
    formGroup: {
        marginBottom: 14
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.8,
        marginBottom: 6
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0F172A',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    fieldNote: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 4
    },
    pillsRow: {
        gap: 8,
        paddingVertical: 4
    },
    typePill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    typePillActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#6366F1'
    },
    typePillText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500'
    },
    typePillTextActive: {
        color: '#6366F1',
        fontWeight: '700'
    },
    addFormActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center'
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B'
    },
    confirmAddBtn: {
        flex: 2,
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center'
    },
    confirmAddText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    }
});
