/**
 * components/cashbook/AccountManageModal.js
 * 
 * Account management modal: displays registered accounts and allows adding
 * a new account with an initial immutable opening balance.
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
    Alert
} from 'react-native';
import { X, Plus, Landmark, Wallet, CreditCard, ShieldCheck } from 'lucide-react-native';
import { AccountType, createAccount, createOpeningBalanceRecord, rupeesToMoneyPaise } from '../../services/cashbook/cashbookContracts.js';

export default function AccountManageModal({
    visible,
    accounts = [],
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

        const openingNum = parseFloat(openingRupees || '0');
        if (isNaN(openingNum) || openingNum < 0) {
            Alert.alert('Invalid Opening Balance', 'Opening balance must be a non-negative number.');
            return;
        }

        try {
            setLoading(true);
            const accountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const newAccount = createAccount({
                id: accountId,
                name: accountName.trim(),
                type: accountType,
                institution: institution.trim(),
                accountNumberLast4: accountLast4.trim()
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
            <View style={styles.overlay}>
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Managed Accounts</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                        {/* Existing Accounts List */}
                        {!isAdding && (
                            <View style={styles.accountsSection}>
                                <Text style={styles.sectionTitle}>REGISTERED ACCOUNTS</Text>
                                {accounts.length === 0 ? (
                                    <View style={styles.emptyWrap}>
                                        <Text style={styles.emptyText}>No accounts registered yet.</Text>
                                    </View>
                                ) : (
                                    accounts.map(acc => (
                                        <View key={acc.id} style={styles.accountItem}>
                                            <View style={styles.accountItemLeft}>
                                                <View style={styles.accountIconWrap}>
                                                    {acc.type === AccountType.BANK ? (
                                                        <Landmark size={16} color="#38BDF8" />
                                                    ) : acc.type === AccountType.CREDIT_CARD ? (
                                                        <CreditCard size={16} color="#F472B6" />
                                                    ) : (
                                                        <Wallet size={16} color="#34D399" />
                                                    )}
                                                </View>
                                                <View>
                                                    <Text style={styles.accName}>{acc.name}</Text>
                                                    <Text style={styles.accMeta}>
                                                        {acc.type} {acc.accountNumberLast4 ? `• **** ${acc.accountNumberLast4}` : ''}
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
                                    <Plus size={16} color="#0F172A" />
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
                                    <Text style={styles.label}>INITIAL OPENING BALANCE (₹)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0.00"
                                        placeholderTextColor="#64748B"
                                        keyboardType="numeric"
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
    card: {
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: '#334155',
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
        borderBottomColor: '#1E293B'
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    closeBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#1E293B'
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
        backgroundColor: '#1E293B',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#334155',
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
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center'
    },
    accName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F8FAFC'
    },
    accMeta: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2
    },
    accBalance: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    accBalanceNegative: {
        color: '#EF4444'
    },
    addTriggerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#38BDF8',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 14
    },
    addTriggerText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A'
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
        backgroundColor: '#1E293B',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#334155'
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
        backgroundColor: '#1E293B',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },
    typePillActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        borderColor: '#38BDF8'
    },
    typePillText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500'
    },
    typePillTextActive: {
        color: '#38BDF8',
        fontWeight: '700'
    },
    addFormActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#334155',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center'
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#CBD5E1'
    },
    confirmAddBtn: {
        flex: 2,
        backgroundColor: '#38BDF8',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center'
    },
    confirmAddText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A'
    }
});
