/**
 * components/cashbook/AddTransactionModal.js
 * 
 * Form modal for recording new Income, Expense, or Transfer movements.
 * Enforces integer paise safety, category compatibility, and account selection.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Check } from 'lucide-react-native';
import {
    TransactionType,
    StandardCategories,
    CashbookType,
    rupeesToMoneyPaise,
    createLoanRepaymentSplit
} from '../../services/cashbook/cashbookContracts.js';
import { createTransferRecord } from '../../services/cashbook/cashbookEngine.js';
import { generateManualIdempotencyKey } from '../../services/cashbook/cashbookIdempotency.js';
import { todayLocal, yesterdayLocal, isValidDateString } from '../../services/cashbook/cashbookDates.js';

const MAX_RUPEES = 999999999999; // 12 digits — keeps paise safely inside integer range

/** Parses a user-entered rupee string strictly ("1,500", "₹ 20.5"). Returns number or null. */
function parseRupees(text) {
    const cleaned = String(text || '').replace(/[₹,\s]/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) && n <= MAX_RUPEES ? n : null;
}

/** Adds two rupee values without floating-point drift (0.1 + 0.2 => "0.3"). */
function sumRupees(a, b) {
    const total = Math.round(a * 100) + Math.round(b * 100);
    return (total / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export default function AddTransactionModal({
    visible,
    onClose,
    accounts = [],
    activeBook = null,
    onSave,
    onAddAccount
}) {
    const insets = useSafeAreaInsets();
    const isLoanBook = activeBook?.type === CashbookType.LOANS_TAKEN;

    // Filter accounts scoped to the active book (or legacy accounts without bookId)
    const bookAccounts = useMemo(() => {
        if (!activeBook?.id) return accounts;
        return accounts.filter(a => a.bookId === activeBook.id || !a.bookId);
    }, [accounts, activeBook?.id]);

    const [type, setType] = useState(TransactionType.EXPENSE);
    const [amountRupees, setAmountRupees] = useState('');
    const [loanPrincipalRupees, setLoanPrincipalRupees] = useState('');
    const [loanInterestRupees, setLoanInterestRupees] = useState('');
    const [sourceAccountId, setSourceAccountId] = useState(bookAccounts[0]?.id || '');
    const [destAccountId, setDestAccountId] = useState(bookAccounts[1]?.id || bookAccounts[0]?.id || '');
    const [category, setCategory] = useState(isLoanBook ? 'debt_emi' : '');
    const [description, setDescription] = useState(isLoanBook ? 'Loan EMI Repayment' : '');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(todayLocal());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fresh form every time the sheet opens (stale date / leftovers after a
    // cancel or after the day rolled over used to be kept).
    useEffect(() => {
        if (!visible) return;
        setType(TransactionType.EXPENSE);
        setAmountRupees('');
        setLoanPrincipalRupees('');
        setLoanInterestRupees('');
        setSourceAccountId(bookAccounts[0]?.id || '');
        setDestAccountId(bookAccounts[1]?.id || bookAccounts[0]?.id || '');
        setCategory(isLoanBook ? 'debt_emi' : '');
        setDescription(isLoanBook ? 'Loan EMI Repayment' : '');
        setNotes('');
        setDate(todayLocal());
        setIsSubmitting(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, bookAccounts]);

    // Selected account ids are validated against the live account list so a
    // stale id (account list changed while sheet was closed) can never be posted.
    const hasAccount = (id) => !!id && bookAccounts.some(a => a.id === id);
    const effSourceId = hasAccount(sourceAccountId) ? sourceAccountId : (bookAccounts[0]?.id || '');
    const effDestId = hasAccount(destAccountId) ? destAccountId : (bookAccounts[1]?.id || bookAccounts[0]?.id || '');

    const categoriesList = type === TransactionType.INCOME
        ? StandardCategories.INCOME
        : StandardCategories.EXPENSE;

    const handleSubmit = async () => {
        if (isSubmitting) return;

        if (bookAccounts.length === 0) {
            Alert.alert('No Account', 'Add at least one account (bank, cash or wallet) before recording transactions.');
            return;
        }

        const num = parseRupees(amountRupees);
        if (num === null || num <= 0) {
            Alert.alert('Invalid Amount', 'Enter an amount greater than zero, with at most 2 decimal places.');
            return;
        }

        if (!description.trim()) {
            Alert.alert('Missing Description', 'Please enter a description for this transaction.');
            return;
        }

        if (!isValidDateString(date)) {
            Alert.alert('Invalid Date', 'Enter the date as YYYY-MM-DD (for example 2025-01-28).');
            return;
        }
        if (date > todayLocal()) {
            Alert.alert('Future Date', 'A cashbook records money that has already moved. Please use today or an earlier date.');
            return;
        }

        if (type === TransactionType.TRANSFER) {
            if (!effSourceId || !effDestId) {
                Alert.alert('Missing Account', 'Please select both source and destination accounts.');
                return;
            }
            if (effSourceId === effDestId) {
                Alert.alert('Invalid Transfer', 'Source and destination accounts cannot be identical.');
                return;
            }
        } else {
            const targetAcc = type === TransactionType.INCOME ? effDestId : effSourceId;
            if (!targetAcc) {
                Alert.alert('Missing Account', 'Please select an account.');
                return;
            }
        }

        // Optional loan EMI split (only meaningful for an expense in a loan book)
        let loanSplit = null;
        const hasSplitInput = isLoanBook && type === TransactionType.EXPENSE &&
            (loanPrincipalRupees.trim() !== '' || loanInterestRupees.trim() !== '');
        if (hasSplitInput) {
            const pNum = parseRupees(loanPrincipalRupees || '0');
            const iNum = parseRupees(loanInterestRupees || '0');
            if (pNum === null || iNum === null) {
                Alert.alert('Invalid EMI Breakdown', 'Principal and interest must be valid amounts with at most 2 decimals.');
                return;
            }
            if (Math.round(pNum * 100) + Math.round(iNum * 100) !== Math.round(num * 100)) {
                Alert.alert('EMI Breakdown Mismatch', 'Principal + Interest must equal the total amount.');
                return;
            }
            loanSplit = createLoanRepaymentSplit({
                principal: rupeesToMoneyPaise(pNum),
                interest: rupeesToMoneyPaise(iNum),
                fees: '0'
            });
        }

        try {
            setIsSubmitting(true);
            const moneyPaise = rupeesToMoneyPaise(num);
            const uuid = Date.now().toString() + Math.random().toString(36).substring(2, 6);
            const idempotencyKey = generateManualIdempotencyKey(uuid);
            const targetBookId = activeBook?.id || 'book_personal_savings';

            if (type === TransactionType.TRANSFER) {
                const transferTxn = createTransferRecord({
                    id: `txn_tr_${uuid}`,
                    sourceAccountId: effSourceId,
                    destinationAccountId: effDestId,
                    amount: moneyPaise,
                    date,
                    description: description.trim(),
                    notes: notes.trim(),
                    idempotencyKey
                });
                transferTxn.bookId = targetBookId;
                await onSave(transferTxn, true);
            } else {
                const txn = {
                    id: `txn_${type === TransactionType.INCOME ? 'inc' : 'exp'}_${uuid}`,
                    bookId: targetBookId,
                    transactionType: type,
                    ...(type === TransactionType.INCOME
                        ? { destinationAccountId: effDestId }
                        : { sourceAccountId: effSourceId }),
                    amount: moneyPaise,
                    category: category || null,
                    date,
                    description: description.trim(),
                    notes: notes.trim(),
                    status: 'POSTED',
                    source: 'MANUAL',
                    loanSplit: loanSplit || undefined,
                    version: 1,
                    idempotencyKey,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await onSave(txn, false);
            }

            onClose(); // form is reset on next open
        } catch (err) {
            // Sheet stays open with the user's input intact
            Alert.alert('Could Not Post Transaction', err.message);
        } finally {
            setIsSubmitting(false);
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
                <View style={styles.modalCard}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Add Transaction</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel="Close"
                        >
                            <X size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.scrollBody}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {bookAccounts.length === 0 && (
                            <View style={styles.noAccountBox}>
                                <Text style={styles.noAccountTitle}>Add an account first</Text>
                                <Text style={styles.noAccountText}>
                                    Transactions move money in or out of an account (bank, cash in hand, UPI wallet).
                                </Text>
                                {onAddAccount && (
                                    <TouchableOpacity style={styles.noAccountBtn} onPress={onAddAccount} activeOpacity={0.8}>
                                        <Text style={styles.noAccountBtnText}>Add Account</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Type Switcher */}
                        <View style={styles.typeSwitcher}>
                            <TouchableOpacity
                                onPress={() => { setType(TransactionType.EXPENSE); setCategory(''); }}
                                style={[styles.typeBtn, type === TransactionType.EXPENSE && styles.typeBtnExpense]}
                            >
                            <ArrowDownLeft size={14} color={type === TransactionType.EXPENSE ? '#FFF' : '#EF4444'} />
                                <Text style={[styles.typeBtnText, type === TransactionType.EXPENSE && styles.typeBtnTextActive]}>
                                    Expense
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => { setType(TransactionType.INCOME); setCategory(''); }}
                                style={[styles.typeBtn, type === TransactionType.INCOME && styles.typeBtnIncome]}
                            >
                                <ArrowUpRight size={14} color={type === TransactionType.INCOME ? '#FFF' : '#10B981'} />
                                <Text style={[styles.typeBtnText, type === TransactionType.INCOME && styles.typeBtnTextActive]}>
                                    Income
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => { setType(TransactionType.TRANSFER); setCategory(''); }}
                                style={[styles.typeBtn, type === TransactionType.TRANSFER && styles.typeBtnTransfer]}
                            >
                                <ArrowLeftRight size={14} color={type === TransactionType.TRANSFER ? '#FFF' : '#3B82F6'} />
                                <Text style={[styles.typeBtnText, type === TransactionType.TRANSFER && styles.typeBtnTextActive]}>
                                    Transfer
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Amount Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>AMOUNT (₹)</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0.00"
                                placeholderTextColor="#64748B"
                                keyboardType="decimal-pad"
                                value={amountRupees}
                                onChangeText={setAmountRupees}
                            />
                        </View>

                        {/* Loan EMI Principal / Interest Split (if loan book) */}
                        {isLoanBook && type === TransactionType.EXPENSE && (
                            <View style={styles.loanSplitSection}>
                                <Text style={styles.loanSplitHeading}>LOAN EMI BREAKDOWN (OPTIONAL)</Text>
                                <View style={styles.loanSplitRow}>
                                    <View style={styles.loanSplitCol}>
                                        <Text style={styles.loanSplitLabel}>Principal (₹)</Text>
                                        <TextInput
                                            style={styles.loanSplitInput}
                                            placeholder="e.g. 90000"
                                            placeholderTextColor="#64748B"
                                            keyboardType="decimal-pad"
                                            value={loanPrincipalRupees}
                                            onChangeText={(t) => {
                                                setLoanPrincipalRupees(t);
                                                const p = parseRupees(t) || 0;
                                                const i = parseRupees(loanInterestRupees) || 0;
                                                if (p + i > 0) setAmountRupees(sumRupees(p, i));
                                            }}
                                        />
                                    </View>
                                    <View style={styles.loanSplitCol}>
                                        <Text style={styles.loanSplitLabel}>Interest (₹)</Text>
                                        <TextInput
                                            style={styles.loanSplitInput}
                                            placeholder="e.g. 40000"
                                            placeholderTextColor="#64748B"
                                            keyboardType="decimal-pad"
                                            value={loanInterestRupees}
                                            onChangeText={(t) => {
                                                setLoanInterestRupees(t);
                                                const p = parseRupees(loanPrincipalRupees) || 0;
                                                const i = parseRupees(t) || 0;
                                                if (p + i > 0) setAmountRupees(sumRupees(p, i));
                                            }}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Description */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>DESCRIPTION</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Blinkit Groceries, Salary, Dinner"
                                placeholderTextColor="#64748B"
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                        {/* Account Selection */}
                        {type === TransactionType.TRANSFER ? (
                            <View style={styles.transferAccountsWrap}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>FROM ACCOUNT (SOURCE)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                                        {bookAccounts.map(acc => (
                                            <TouchableOpacity
                                                key={`src_${acc.id}`}
                                                onPress={() => setSourceAccountId(acc.id)}
                                                style={[styles.accountPill, effSourceId === acc.id && styles.accountPillActive]}
                                            >
                                                <Text style={[styles.accountPillText, effSourceId === acc.id && styles.accountPillTextActive]}>
                                                    {acc.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>TO ACCOUNT (DESTINATION)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                                        {bookAccounts.map(acc => (
                                            <TouchableOpacity
                                                key={`dest_${acc.id}`}
                                                onPress={() => setDestAccountId(acc.id)}
                                                style={[styles.accountPill, effDestId === acc.id && styles.accountPillActive]}
                                            >
                                                <Text style={[styles.accountPillText, effDestId === acc.id && styles.accountPillTextActive]}>
                                                    {acc.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>
                                    {type === TransactionType.INCOME ? 'DEPOSIT INTO ACCOUNT' : 'PAY FROM ACCOUNT'}
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                                    {bookAccounts.map(acc => {
                                        const currentTarget = type === TransactionType.INCOME ? effDestId : effSourceId;
                                        const isSelected = currentTarget === acc.id;
                                        return (
                                            <TouchableOpacity
                                                key={acc.id}
                                                onPress={() => {
                                                    if (type === TransactionType.INCOME) setDestAccountId(acc.id);
                                                    else setSourceAccountId(acc.id);
                                                }}
                                                style={[styles.accountPill, isSelected && styles.accountPillActive]}
                                            >
                                                <Text style={[styles.accountPillText, isSelected && styles.accountPillTextActive]}>
                                                    {acc.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* Category Selector (Hidden for Transfers) */}
                        {type !== TransactionType.TRANSFER && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>CATEGORY</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                                    {categoriesList.map(cat => {
                                        const isSelected = category === cat.id;
                                        return (
                                            <TouchableOpacity
                                                key={cat.id}
                                                onPress={() => setCategory(isSelected ? '' : cat.id)}
                                                style={[styles.catPill, isSelected && styles.catPillActive]}
                                            >
                                                <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]}>
                                                    {cat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* Date */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>DATE (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.textInput}
                                value={date}
                                onChangeText={setDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#94A3B8"
                                maxLength={10}
                                keyboardType="numbers-and-punctuation"
                                autoCorrect={false}
                            />
                            <View style={styles.dateChipsRow}>
                                <TouchableOpacity
                                    style={[styles.dateChip, date === todayLocal() && styles.dateChipActive]}
                                    onPress={() => setDate(todayLocal())}
                                >
                                    <Text style={[styles.dateChipText, date === todayLocal() && styles.dateChipTextActive]}>Today</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.dateChip, date === yesterdayLocal() && styles.dateChipActive]}
                                    onPress={() => setDate(yesterdayLocal())}
                                >
                                    <Text style={[styles.dateChipText, date === yesterdayLocal() && styles.dateChipTextActive]}>Yesterday</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Notes */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>NOTES (OPTIONAL)</Text>
                            <TextInput
                                style={[styles.textInput, { height: 60 }]}
                                placeholder="Additional reference or remarks"
                                placeholderTextColor="#64748B"
                                multiline
                                value={notes}
                                onChangeText={setNotes}
                            />
                        </View>
                    </ScrollView>

                    {/* Submit Button */}
                    <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>
                        <TouchableOpacity
                            style={[styles.submitBtn, (isSubmitting || accounts.length === 0) && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting || accounts.length === 0}
                            activeOpacity={0.8}
                        >
                            <Check size={16} color="#FFFFFF" />
                            <Text style={styles.submitBtnText}>
                                {isSubmitting ? 'Posting...' : 'Post Transaction'}
                            </Text>
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
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end'
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
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
        fontWeight: '700',
        color: '#0F172A'
    },
    closeBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#F1F5F9'
    },
    scrollBody: {
        padding: 20
    },
    typeSwitcher: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 18
    },
    typeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        borderRadius: 10
    },
    typeBtnExpense: {
        backgroundColor: '#EF4444'
    },
    typeBtnIncome: {
        backgroundColor: '#10B981'
    },
    typeBtnTransfer: {
        backgroundColor: '#6366F1'
    },
    typeBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B'
    },
    typeBtnTextActive: {
        color: '#FFFFFF'
    },
    inputGroup: {
        marginBottom: 16
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.8,
        marginBottom: 6
    },
    amountInput: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0F172A',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    textInput: {
        fontSize: 14,
        color: '#0F172A',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    transferAccountsWrap: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    pillsRow: {
        gap: 8,
        paddingVertical: 4
    },
    accountPill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    accountPillActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#6366F1'
    },
    accountPillText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500'
    },
    accountPillTextActive: {
        color: '#6366F1',
        fontWeight: '700'
    },
    catPill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    catPillActive: {
        backgroundColor: '#ECFDF5',
        borderColor: '#10B981'
    },
    catPillText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500'
    },
    catPillTextActive: {
        color: '#10B981',
        fontWeight: '700'
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#6366F1',
        paddingVertical: 14,
        borderRadius: 14
    },
    submitBtnDisabled: {
        opacity: 0.6
    },
    submitBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    noAccountBox: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16
    },
    noAccountTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#92400E',
        marginBottom: 4
    },
    noAccountText: {
        fontSize: 12,
        color: '#92400E',
        lineHeight: 17
    },
    noAccountBtn: {
        alignSelf: 'flex-start',
        marginTop: 10,
        backgroundColor: '#6366F1',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10
    },
    noAccountBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    dateChipsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8
    },
    dateChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    dateChipActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#6366F1'
    },
    dateChipText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600'
    },
    dateChipTextActive: {
        color: '#6366F1',
        fontWeight: '700'
    },
    loanSplitSection: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16
    },
    loanSplitHeading: {
        color: '#6366F1',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.6,
        marginBottom: 8
    },
    loanSplitRow: {
        flexDirection: 'row',
        gap: 10
    },
    loanSplitCol: {
        flex: 1
    },
    loanSplitLabel: {
        color: '#64748B',
        fontSize: 11,
        marginBottom: 4
    },
    loanSplitInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: '#0F172A',
        fontSize: 13
    }
});
