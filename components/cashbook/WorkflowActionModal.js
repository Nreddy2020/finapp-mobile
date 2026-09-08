/**
 * components/cashbook/WorkflowActionModal.js
 * 
 * Adaptive, purpose-driven action modal for FinLife Universal Cashbook (V3).
 * Adapts form fields based on the selected actionId (e.g. RECORD_SALE, RECORD_EMI,
 * ADD_CONTRIBUTION, RECEIVE_CASH, etc.) and compiles a balanced LedgerTransaction
 * via compileWorkflowAction before persisting.
 */

import React, { useState, useEffect } from 'react';
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
    Platform,
    Switch
} from 'react-native';
import {
    X,
    Check,
    ArrowDownLeft,
    ArrowUpRight,
    Briefcase,
    Store,
    CreditCard,
    Shield,
    Users,
    Truck,
    Calendar,
    Wallet
} from 'lucide-react-native';

import {
    rupeesToMoneyPaise,
    createMoneyPaise
} from '../../services/cashbook/cashbookContracts.js';
import { compileWorkflowAction } from '../../services/cashbook/cashbookWorkflowCompiler.js';

export default function WorkflowActionModal({
    visible,
    onClose,
    actionId,
    profile,
    accounts = [],
    activeBook = null,
    onSaveWorkflow
}) {
    // Basic fields
    const [amountRupees, setAmountRupees] = useState('');
    const [description, setDescription] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [destAccountId, setDestAccountId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Counterparty / Name
    const [counterpartyName, setCounterpartyName] = useState('');

    // Business Credit toggle
    const [isCredit, setIsCredit] = useState(false);

    // Loan Split fields
    const [principalRupees, setPrincipalRupees] = useState('');
    const [interestRupees, setInterestRupees] = useState('');
    const [feesRupees, setFeesRupees] = useState('');

    // PF Provenance fields
    const [employeeRupees, setEmployeeRupees] = useState('');
    const [employerRupees, setEmployerRupees] = useState('');

    // Submitting state
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset or initialize state when actionId changes or modal opens
    useEffect(() => {
        if (visible) {
            setAmountRupees('');
            setCounterpartyName('');
            setIsCredit(false);
            setPrincipalRupees('');
            setInterestRupees('');
            setFeesRupees('');
            setEmployeeRupees('');
            setEmployerRupees('');
            setDate(new Date().toISOString().split('T')[0]);

            // Set default account
            const defaultAcc = accounts[0]?.id || '';
            setSelectedAccountId(defaultAcc);
            setDestAccountId(accounts[1]?.id || defaultAcc);

            // Default description based on action
            switch (actionId) {
                case 'RECORD_SALE':
                    setDescription('Customer Sale');
                    break;
                case 'RECORD_PURCHASE':
                    setDescription('Stock / Goods Purchase');
                    break;
                case 'RECEIVE_PAYMENT':
                    setDescription('Customer Outstanding Payment');
                    break;
                case 'PAY_SUPPLIER':
                    setDescription('Supplier Bill Payment');
                    break;
                case 'RECORD_EMI':
                    setDescription('Monthly EMI Repayment');
                    break;
                case 'PREPAY_LOAN':
                    setDescription('Part-Prepayment of Loan Principal');
                    break;
                case 'ADD_CONTRIBUTION':
                    setDescription('EPF Monthly Contribution');
                    break;
                case 'ADD_INTEREST':
                    setDescription('EPFO Annual Interest Credit');
                    break;
                case 'RECEIVE_CASH':
                    setDescription('Handy Cash Received');
                    break;
                case 'PAY_CASH':
                    setDescription('Handy Cash Paid');
                    break;
                case 'ADD_INCOME':
                    setDescription('Salary / Household Income');
                    break;
                case 'ADD_EXPENSE':
                    setDescription('Household Expense');
                    break;
                case 'PAY_BILL':
                    setDescription('Utility Bill Payment');
                    break;
                case 'TRANSFER':
                    setDescription('Internal Account Transfer');
                    break;
                default:
                    setDescription('');
            }
        }
    }, [visible, actionId, accounts]);

    if (!visible || !actionId) return null;

    const getActionTitle = () => {
        switch (actionId) {
            case 'RECORD_SALE': return 'Record Sale';
            case 'RECORD_PURCHASE': return 'Record Purchase';
            case 'RECEIVE_PAYMENT': return 'Collect Customer Payment';
            case 'PAY_SUPPLIER': return 'Pay Supplier';
            case 'RECORD_EMI': return 'Pay Monthly EMI';
            case 'PREPAY_LOAN': return 'Loan Prepayment';
            case 'ADD_CONTRIBUTION': return 'Add PF Contribution';
            case 'ADD_INTEREST': return 'Credit PF Interest';
            case 'RECEIVE_CASH': return 'Receive Till Cash';
            case 'PAY_CASH': return 'Pay Till Cash';
            case 'ADD_INCOME': return 'Add Income';
            case 'ADD_EXPENSE': return 'Add Expense';
            case 'PAY_BILL': return 'Pay Bill';
            case 'TRANSFER': return 'Account Transfer';
            default: return 'Financial Action';
        }
    };

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);

            // Prepare workflow input
            const input = {
                date,
                description: description.trim() || getActionTitle()
            };

            const bookId = activeBook?.id || 'book_default';

            if (actionId === 'RECORD_SALE') {
                const amt = parseFloat(amountRupees);
                if (isNaN(amt) || amt <= 0) throw new Error('Valid sale amount is required');
                if (!counterpartyName.trim()) throw new Error('Customer name is required');
                if (!isCredit && !selectedAccountId) throw new Error('Deposit account is required for cash sale');

                input.amountPaise = rupeesToMoneyPaise(amt).paise;
                input.customerName = counterpartyName.trim();
                input.isCredit = isCredit;
                input.accountId = selectedAccountId;
            } else if (actionId === 'RECORD_PURCHASE') {
                const amt = parseFloat(amountRupees);
                if (isNaN(amt) || amt <= 0) throw new Error('Valid purchase amount is required');
                if (!counterpartyName.trim()) throw new Error('Supplier name is required');
                if (!isCredit && !selectedAccountId) throw new Error('Payment account is required for cash purchase');

                input.amountPaise = rupeesToMoneyPaise(amt).paise;
                input.supplierName = counterpartyName.trim();
                input.isCredit = isCredit;
                input.accountId = selectedAccountId;
            } else if (actionId === 'RECEIVE_PAYMENT') {
                const amt = parseFloat(amountRupees);
                if (isNaN(amt) || amt <= 0) throw new Error('Valid payment amount is required');
                if (!counterpartyName.trim()) throw new Error('Customer name is required');
                if (!selectedAccountId) throw new Error('Deposit account is required');

                input.amountPaise = rupeesToMoneyPaise(amt).paise;
                input.customerName = counterpartyName.trim();
                input.destinationAccountId = selectedAccountId;
            } else if (actionId === 'PAY_SUPPLIER') {
                const amt = parseFloat(amountRupees);
                if (isNaN(amt) || amt <= 0) throw new Error('Valid payment amount is required');
                if (!counterpartyName.trim()) throw new Error('Supplier name is required');
                if (!selectedAccountId) throw new Error('Source account is required');

                input.amountPaise = rupeesToMoneyPaise(amt).paise;
                input.supplierName = counterpartyName.trim();
                input.sourceAccountId = selectedAccountId;
            } else if (actionId === 'RECORD_EMI') {
                const pAmt = parseFloat(principalRupees);
                const iAmt = parseFloat(interestRupees);
                const fAmt = feesRupees ? parseFloat(feesRupees) : 0;

                if (isNaN(pAmt) || pAmt < 0) throw new Error('Principal reduction amount must be non-negative');
                if (isNaN(iAmt) || iAmt < 0) throw new Error('Interest expense must be non-negative');
                if (pAmt + iAmt + fAmt <= 0) throw new Error('Total EMI must be greater than zero');
                if (!selectedAccountId) throw new Error('Source bank account is required');

                input.principalPaise = rupeesToMoneyPaise(pAmt).paise;
                input.interestPaise = rupeesToMoneyPaise(iAmt).paise;
                input.feesPaise = rupeesToMoneyPaise(fAmt).paise;
                input.sourceAccountId = selectedAccountId;
                input.loanAccountId = 'acc_loan_liability';
                input.lenderName = counterpartyName.trim() || 'Bank Lender';
            } else if (actionId === 'PREPAY_LOAN') {
                const amt = parseFloat(amountRupees);
                if (isNaN(amt) || amt <= 0) throw new Error('Valid prepayment amount is required');
                if (!selectedAccountId) throw new Error('Source bank account is required');

                input.amountPaise = rupeesToMoneyPaise(amt).paise;
                input.sourceAccountId = selectedAccountId;
                input.loanAccountId = 'acc_loan_liability';
                input.lenderName = counterpartyName.trim() || 'Bank Lender';
            } else if (actionId === 'ADD_CONTRIBUTION') {
                const eeAmt = parseFloat(employeeRupees);
                const erAmt = parseFloat(employerRupees);
                if (isNaN(eeAmt) || eeAmt < 0) throw new Error('Employee share is required');
                if (isNaN(erAmt) || erAmt < 0) throw new Error('Employer share is required');
                if (eeAmt + erAmt <= 0) throw new Error('Total contribution must be greater than zero');

                input.employeePaise = rupeesToMoneyPaise(eeAmt).paise;
                input.employerPaise = rupeesToMoneyPaise(erAmt).paise;
                input.sourceAccountId = selectedAccountId || 'demo_acc_hdfc';
                input.pfAccountId = 'acc_epfo_uan';
            } else if (actionId === 'ADD_INTEREST') {
                const amt = parseFloat(amountRupees);
                if (isNaN(amt) || amt <= 0) throw new Error('Interest amount is required');

                input.interestPaise = rupeesToMoneyPaise(amt).paise;
                input.pfAccountId = 'acc_epfo_uan';
            } else if (actionId === 'RECEIVE_CASH') {
                const amt = parseFloat(amountRupees);
                if (isNaN(amt) || amt <= 0) throw new Error('Valid cash amount is required');

                input.amountPaise = rupeesToMoneyPaise(amt).paise;
                input.destinationAccountId = selectedAccountId || 'acc_handy_till';
                input.payerName = counterpartyName.trim();
                input.category = 'cash_received';
            } else if (actionId === 'PAY_CASH') {
                const amt = parseFloat(amountRupees);
                if (isNaN(amt) || amt <= 0) throw new Error('Valid cash amount is required');

                input.amountPaise = rupeesToMoneyPaise(amt).paise;
                input.sourceAccountId = selectedAccountId || 'acc_handy_till';
                input.payeeName = counterpartyName.trim();
                input.category = 'cash_paid';
            } else if (actionId === 'TRANSFER') {
                const amt = parseFloat(amountRupees);
                if (isNaN(amt) || amt <= 0) throw new Error('Valid transfer amount is required');
                if (!selectedAccountId || !destAccountId) throw new Error('Source and destination accounts are required');
                if (selectedAccountId === destAccountId) throw new Error('Source and destination accounts cannot be identical');

                input.amountPaise = rupeesToMoneyPaise(amt).paise;
                input.sourceAccountId = selectedAccountId;
                input.destinationAccountId = destAccountId;
            } else if (actionId === 'ADD_INCOME') {
                const amt = parseFloat(amountRupees);
                if (isNaN(amt) || amt <= 0) throw new Error('Valid income amount is required');
                if (!selectedAccountId) throw new Error('Destination account is required');

                input.amountPaise = rupeesToMoneyPaise(amt).paise;
                input.destinationAccountId = selectedAccountId;
                input.category = 'salary';
            } else {
                // ADD_EXPENSE or PAY_BILL
                const amt = parseFloat(amountRupees);
                if (isNaN(amt) || amt <= 0) throw new Error('Valid expense amount is required');
                if (!selectedAccountId) throw new Error('Source account is required');

                input.amountPaise = rupeesToMoneyPaise(amt).paise;
                input.sourceAccountId = selectedAccountId;
                input.category = actionId === 'PAY_BILL' ? 'utilities' : 'household_supplies';
                if (actionId === 'PAY_BILL') input.billerName = counterpartyName.trim();
            }

            // Compile through pure compiler
            const compiledTxn = compileWorkflowAction({
                profile,
                actionId,
                input,
                context: {
                    activeBook,
                    accounts,
                    currentDate: date
                }
            });

            // Persist via callback
            if (onSaveWorkflow) {
                await onSaveWorkflow(compiledTxn);
            }

            onClose();
        } catch (err) {
            Alert.alert('Workflow Validation Error', err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalSubtitle}>{profile?.displayName || 'FINANCIAL WORKFLOW'}</Text>
                            <Text style={styles.modalTitle}>{getActionTitle()}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                        {/* 1. Primary Amount or Amortization / Provenance Inputs */}
                        {actionId === 'RECORD_EMI' ? (
                            <View style={styles.splitInputContainer}>
                                <Text style={styles.inputLabel}>PRINCIPAL REDUCTION (₹) *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="0.00"
                                    placeholderTextColor="#64748B"
                                    keyboardType="numeric"
                                    value={principalRupees}
                                    onChangeText={setPrincipalRupees}
                                />

                                <Text style={[styles.inputLabel, { marginTop: 12 }]}>INTEREST EXPENSE (₹) *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="0.00"
                                    placeholderTextColor="#64748B"
                                    keyboardType="numeric"
                                    value={interestRupees}
                                    onChangeText={setInterestRupees}
                                />

                                <Text style={[styles.inputLabel, { marginTop: 12 }]}>FEES / CHARGES (₹)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="0.00 (Optional)"
                                    placeholderTextColor="#64748B"
                                    keyboardType="numeric"
                                    value={feesRupees}
                                    onChangeText={setFeesRupees}
                                />

                                <View style={styles.splitTotalBox}>
                                    <Text style={styles.splitTotalLabel}>Total Monthly EMI:</Text>
                                    <Text style={styles.splitTotalValue}>
                                        ₹{((parseFloat(principalRupees) || 0) + (parseFloat(interestRupees) || 0) + (parseFloat(feesRupees) || 0)).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        ) : actionId === 'ADD_CONTRIBUTION' ? (
                            <View style={styles.splitInputContainer}>
                                <Text style={styles.inputLabel}>EMPLOYEE SHARE (12% EPF) (₹) *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="0.00"
                                    placeholderTextColor="#64748B"
                                    keyboardType="numeric"
                                    value={employeeRupees}
                                    onChangeText={setEmployeeRupees}
                                />

                                <Text style={[styles.inputLabel, { marginTop: 12 }]}>EMPLOYER SHARE (3.67% EPF + EPS) (₹) *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="0.00"
                                    placeholderTextColor="#64748B"
                                    keyboardType="numeric"
                                    value={employerRupees}
                                    onChangeText={setEmployerRupees}
                                />

                                <View style={styles.splitTotalBox}>
                                    <Text style={styles.splitTotalLabel}>Total PF Contribution:</Text>
                                    <Text style={styles.splitTotalValue}>
                                        ₹{((parseFloat(employeeRupees) || 0) + (parseFloat(employerRupees) || 0)).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.amountWrap}>
                                <Text style={styles.amountLabel}>AMOUNT (₹) *</Text>
                                <View style={styles.amountRow}>
                                    <Text style={styles.currencySymbol}>₹</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="0.00"
                                        placeholderTextColor="#475569"
                                        keyboardType="numeric"
                                        value={amountRupees}
                                        onChangeText={setAmountRupees}
                                        autoFocus
                                    />
                                </View>
                            </View>
                        )}

                        {/* 2. Business Credit Switch for Sale / Purchase */}
                        {(actionId === 'RECORD_SALE' || actionId === 'RECORD_PURCHASE') && (
                            <View style={styles.switchRow}>
                                <View style={styles.switchInfo}>
                                    <Text style={styles.switchTitle}>
                                        {actionId === 'RECORD_SALE' ? 'Credit Sale (Customer Receivable)' : 'Credit Purchase (Supplier Payable)'}
                                    </Text>
                                    <Text style={styles.switchDesc}>
                                        {isCredit ? 'Payment pending settlement' : 'Settled immediately via Cash / Bank'}
                                    </Text>
                                </View>
                                <Switch
                                    value={isCredit}
                                    onValueChange={setIsCredit}
                                    trackColor={{ false: '#334155', true: '#10B981' }}
                                    thumbColor={isCredit ? '#F8FAFC' : '#94A3B8'}
                                />
                            </View>
                        )}

                        {/* 3. Counterparty Name */}
                        {(actionId === 'RECORD_SALE' || actionId === 'RECORD_PURCHASE' || actionId === 'RECEIVE_PAYMENT' || actionId === 'PAY_SUPPLIER' || actionId === 'RECORD_EMI' || actionId === 'PREPAY_LOAN' || actionId === 'PAY_BILL') && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    {actionId === 'RECORD_SALE' || actionId === 'RECEIVE_PAYMENT' ? 'CUSTOMER NAME *' :
                                     actionId === 'RECORD_PURCHASE' || actionId === 'PAY_SUPPLIER' ? 'SUPPLIER / VENDOR NAME *' :
                                     actionId === 'PAY_BILL' ? 'BILLER / UTILITY NAME *' : 'LENDER / BANK NAME'}
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter entity name"
                                    placeholderTextColor="#64748B"
                                    value={counterpartyName}
                                    onChangeText={setCounterpartyName}
                                />
                            </View>
                        )}

                        {/* 4. Description / Particulars */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>PARTICULARS / DESCRIPTION</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter description"
                                placeholderTextColor="#64748B"
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                        {/* 5. Account Selection */}
                        {(!isCredit || actionId === 'TRANSFER') && accounts.length > 0 && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    {actionId === 'TRANSFER' ? 'SOURCE ACCOUNT' :
                                     actionId === 'ADD_INCOME' || actionId === 'RECEIVE_PAYMENT' || actionId === 'RECEIVE_CASH' ? 'DEPOSIT ACCOUNT' : 'PAYMENT ACCOUNT'}
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountPillsScroll}>
                                    {accounts.map(acc => (
                                        <TouchableOpacity
                                            key={acc.id}
                                            style={[styles.accountPill, selectedAccountId === acc.id && styles.accountPillActive]}
                                            onPress={() => setSelectedAccountId(acc.id)}
                                        >
                                            <Wallet size={12} color={selectedAccountId === acc.id ? '#090D16' : '#94A3B8'} />
                                            <Text style={[styles.accountPillText, selectedAccountId === acc.id && styles.accountPillTextActive]}>
                                                {acc.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* 6. Destination Account for Transfer */}
                        {actionId === 'TRANSFER' && accounts.length > 0 && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>DESTINATION ACCOUNT</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountPillsScroll}>
                                    {accounts.map(acc => (
                                        <TouchableOpacity
                                            key={acc.id}
                                            style={[styles.accountPill, destAccountId === acc.id && styles.accountPillActive]}
                                            onPress={() => setDestAccountId(acc.id)}
                                        >
                                            <Wallet size={12} color={destAccountId === acc.id ? '#090D16' : '#94A3B8'} />
                                            <Text style={[styles.accountPillText, destAccountId === acc.id && styles.accountPillTextActive]}>
                                                {acc.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* 7. Date */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>DATE (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#64748B"
                                value={date}
                                onChangeText={setDate}
                            />
                        </View>
                    </ScrollView>

                    {/* Submit Button */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            activeOpacity={0.8}
                        >
                            <Check size={18} color="#090D16" />
                            <Text style={styles.submitButtonText}>
                                {isSubmitting ? 'Recording...' : `Record ${getActionTitle()}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 24,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B'
    },
    modalSubtitle: {
        color: '#38BDF8',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8
    },
    modalTitle: {
        color: '#F8FAFC',
        fontSize: 20,
        fontWeight: '800',
        marginTop: 2
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center'
    },
    formScroll: {
        paddingHorizontal: 20,
        paddingTop: 16
    },
    amountWrap: {
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: '#111827',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginBottom: 16
    },
    amountLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 8
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    currencySymbol: {
        color: '#38BDF8',
        fontSize: 32,
        fontWeight: '800',
        marginRight: 6
    },
    amountInput: {
        color: '#F8FAFC',
        fontSize: 36,
        fontWeight: '800',
        minWidth: 140,
        textAlign: 'center'
    },
    splitInputContainer: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginBottom: 16
    },
    splitTotalBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155'
    },
    splitTotalLabel: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600'
    },
    splitTotalValue: {
        color: '#38BDF8',
        fontSize: 16,
        fontWeight: '800'
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#111827',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    switchInfo: {
        flex: 1,
        marginRight: 12
    },
    switchTitle: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '700'
    },
    switchDesc: {
        color: '#64748B',
        fontSize: 11,
        marginTop: 2
    },
    inputGroup: {
        marginBottom: 16
    },
    inputLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.6,
        marginBottom: 6
    },
    textInput: {
        backgroundColor: '#111827',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#F8FAFC',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    accountPillsScroll: {
        flexDirection: 'row',
        marginTop: 4
    },
    accountPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#111827',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    accountPillActive: {
        backgroundColor: '#38BDF8',
        borderColor: '#38BDF8'
    },
    accountPillText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600'
    },
    accountPillTextActive: {
        color: '#090D16',
        fontWeight: '700'
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#1E293B'
    },
    submitButton: {
        backgroundColor: '#38BDF8',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8
    },
    submitButtonDisabled: {
        opacity: 0.6
    },
    submitButtonText: {
        color: '#090D16',
        fontSize: 15,
        fontWeight: '700'
    }
});
