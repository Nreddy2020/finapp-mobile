/**
 * components/cashbook/AddTransactionModal.js
 * 
 * Form modal for recording new Income, Expense, or Transfer movements.
 * Enforces integer paise safety, category compatibility, and account selection.
 */

import React, { useState } from 'react';
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

export default function AddTransactionModal({
    visible,
    onClose,
    accounts = [],
    activeBook = null,
    onSave
}) {
    const isLoanBook = activeBook?.type === CashbookType.LOANS_TAKEN;
    const isHandyCash = activeBook?.type === CashbookType.HANDY_CASH;

    const [type, setType] = useState(isLoanBook ? TransactionType.EXPENSE : TransactionType.EXPENSE);
    const [amountRupees, setAmountRupees] = useState('');
    const [loanPrincipalRupees, setLoanPrincipalRupees] = useState('');
    const [loanInterestRupees, setLoanInterestRupees] = useState('');
    const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');
    const [destAccountId, setDestAccountId] = useState(accounts[1]?.id || '');
    const [category, setCategory] = useState(isLoanBook ? 'debt_emi' : '');
    const [description, setDescription] = useState(isLoanBook ? 'Loan EMI Repayment' : '');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categoriesList = type === TransactionType.INCOME
        ? StandardCategories.INCOME
        : StandardCategories.EXPENSE;

    const handleSubmit = async () => {
        const num = parseFloat(amountRupees);
        if (isNaN(num) || num <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount greater than zero.');
            return;
        }

        if (!description.trim()) {
            Alert.alert('Missing Description', 'Please enter a description for this transaction.');
            return;
        }

        if (type === TransactionType.TRANSFER) {
            if (!sourceAccountId || !destAccountId) {
                Alert.alert('Missing Account', 'Please select both source and destination accounts.');
                return;
            }
            if (sourceAccountId === destAccountId) {
                Alert.alert('Invalid Transfer', 'Source and destination accounts cannot be identical.');
                return;
            }
        } else {
            const targetAcc = type === TransactionType.INCOME ? destAccountId : sourceAccountId;
            if (!targetAcc) {
                Alert.alert('Missing Account', 'Please select an account.');
                return;
            }
        }

        try {
            setIsSubmitting(true);
            const moneyPaise = rupeesToMoneyPaise(num);
            const uuid = Date.now().toString() + Math.random().toString(36).substring(2, 6);
            const idempotencyKey = generateManualIdempotencyKey(uuid);
            const targetBookId = activeBook?.id || 'book_personal_savings';

            let loanSplit = null;
            if (isLoanBook && loanPrincipalRupees && loanInterestRupees) {
                const pNum = parseFloat(loanPrincipalRupees);
                const iNum = parseFloat(loanInterestRupees);
                if (!isNaN(pNum) && !isNaN(iNum) && pNum >= 0 && iNum >= 0) {
                    loanSplit = createLoanRepaymentSplit({
                        principal: rupeesToMoneyPaise(pNum),
                        interest: rupeesToMoneyPaise(iNum),
                        fees: '0'
                    });
                }
            }

            if (type === TransactionType.TRANSFER) {
                const transferTxn = createTransferRecord({
                    id: `txn_tr_${uuid}`,
                    sourceAccountId,
                    destinationAccountId: destAccountId,
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
                        ? { destinationAccountId: destAccountId }
                        : { sourceAccountId }),
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

            // Reset form and close
            setAmountRupees('');
            setLoanPrincipalRupees('');
            setLoanInterestRupees('');
            setDescription('');
            setNotes('');
            setCategory('');
            onClose();
        } catch (err) {
            Alert.alert('Error Posting Transaction', err.message);
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
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
                        {/* Type Switcher */}
                        <View style={styles.typeSwitcher}>
                            <TouchableOpacity
                                onPress={() => { setType(TransactionType.EXPENSE); setCategory(''); }}
                                style={[styles.typeBtn, type === TransactionType.EXPENSE && styles.typeBtnExpense]}
                            >
                                <ArrowUpRight size={14} color={type === TransactionType.EXPENSE ? '#FFF' : '#EF4444'} />
                                <Text style={[styles.typeBtnText, type === TransactionType.EXPENSE && styles.typeBtnTextActive]}>
                                    Expense
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => { setType(TransactionType.INCOME); setCategory(''); }}
                                style={[styles.typeBtn, type === TransactionType.INCOME && styles.typeBtnIncome]}
                            >
                                <ArrowDownLeft size={14} color={type === TransactionType.INCOME ? '#FFF' : '#10B981'} />
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
                                keyboardType="numeric"
                                value={amountRupees}
                                onChangeText={setAmountRupees}
                            />
                        </View>

                        {/* Loan EMI Principal / Interest Split (if loan book) */}
                        {isLoanBook && (
                            <View style={styles.loanSplitSection}>
                                <Text style={styles.loanSplitHeading}>LOAN EMI BREAKDOWN (OPTIONAL)</Text>
                                <View style={styles.loanSplitRow}>
                                    <View style={styles.loanSplitCol}>
                                        <Text style={styles.loanSplitLabel}>Principal (₹)</Text>
                                        <TextInput
                                            style={styles.loanSplitInput}
                                            placeholder="e.g. 90000"
                                            placeholderTextColor="#64748B"
                                            keyboardType="numeric"
                                            value={loanPrincipalRupees}
                                            onChangeText={(t) => {
                                                setLoanPrincipalRupees(t);
                                                const p = parseFloat(t) || 0;
                                                const i = parseFloat(loanInterestRupees) || 0;
                                                if (p + i > 0) setAmountRupees((p + i).toString());
                                            }}
                                        />
                                    </View>
                                    <View style={styles.loanSplitCol}>
                                        <Text style={styles.loanSplitLabel}>Interest (₹)</Text>
                                        <TextInput
                                            style={styles.loanSplitInput}
                                            placeholder="e.g. 40000"
                                            placeholderTextColor="#64748B"
                                            keyboardType="numeric"
                                            value={loanInterestRupees}
                                            onChangeText={(t) => {
                                                setLoanInterestRupees(t);
                                                const p = parseFloat(loanPrincipalRupees) || 0;
                                                const i = parseFloat(t) || 0;
                                                if (p + i > 0) setAmountRupees((p + i).toString());
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
                                        {accounts.map(acc => (
                                            <TouchableOpacity
                                                key={`src_${acc.id}`}
                                                onPress={() => setSourceAccountId(acc.id)}
                                                style={[styles.accountPill, sourceAccountId === acc.id && styles.accountPillActive]}
                                            >
                                                <Text style={[styles.accountPillText, sourceAccountId === acc.id && styles.accountPillTextActive]}>
                                                    {acc.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>TO ACCOUNT (DESTINATION)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                                        {accounts.map(acc => (
                                            <TouchableOpacity
                                                key={`dest_${acc.id}`}
                                                onPress={() => setDestAccountId(acc.id)}
                                                style={[styles.accountPill, destAccountId === acc.id && styles.accountPillActive]}
                                            >
                                                <Text style={[styles.accountPillText, destAccountId === acc.id && styles.accountPillTextActive]}>
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
                                    {accounts.map(acc => {
                                        const currentTarget = type === TransactionType.INCOME ? destAccountId : sourceAccountId;
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
                            />
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
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            activeOpacity={0.8}
                        >
                            <Check size={16} color="#0F172A" />
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end'
    },
    modalCard: {
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: '#334155',
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
    scrollBody: {
        padding: 20
    },
    typeSwitcher: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
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
        backgroundColor: '#3B82F6'
    },
    typeBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8'
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
        color: '#F8FAFC',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },
    textInput: {
        fontSize: 14,
        color: '#F8FAFC',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },
    transferAccountsWrap: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        padding: 12,
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155'
    },
    pillsRow: {
        gap: 8,
        paddingVertical: 4
    },
    accountPill: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },
    accountPillActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        borderColor: '#38BDF8'
    },
    accountPillText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500'
    },
    accountPillTextActive: {
        color: '#38BDF8',
        fontWeight: '700'
    },
    catPill: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },
    catPillActive: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10B981'
    },
    catPillText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500'
    },
    catPillTextActive: {
        color: '#10B981',
        fontWeight: '700'
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#1E293B'
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#38BDF8',
        paddingVertical: 14,
        borderRadius: 14
    },
    submitBtnDisabled: {
        opacity: 0.6
    },
    submitBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A'
    },
    loanSplitSection: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16
    },
    loanSplitHeading: {
        color: '#C084FC',
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
        color: '#94A3B8',
        fontSize: 11,
        marginBottom: 4
    },
    loanSplitInput: {
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: '#F8FAFC',
        fontSize: 13
    }
});
