import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { X, ArrowRight, Check, ArrowLeft, ArrowDownLeft, ArrowUpRight, User, DollarSign, Calendar, Building2 } from 'lucide-react-native';
import { LOAN_DIRECTION, INTEREST_METHOD, REPAYMENT_FREQUENCY } from './p2pDomainModel';
import { calculateLoanDNA } from './p2pAccountingEngine';
import { formatINR } from './p2pPresentationAdapter';

export default function P2PAddLoanModal({
    visible,
    persons = [],
    initialPerson = null,
    onClose,
    onCreateLoan,
    onAddPerson
}) {
    const [step, setStep] = useState(1); // 1: Type, 2: Person, 3: Amount & Interest, 4: Dates & Account, 5: Review

    const [direction, setDirection] = useState(LOAN_DIRECTION.GIVEN);
    const [selectedPersonId, setSelectedPersonId] = useState(initialPerson ? initialPerson.id : '');
    const [newPersonName, setNewPersonName] = useState('');
    const [newPersonPhone, setNewPersonPhone] = useState('');
    const [isCreatingNewPerson, setIsCreatingNewPerson] = useState(false);

    const [principalInput, setPrincipalInput] = useState('250000');
    const [interestMethod, setInterestMethod] = useState(INTEREST_METHOD.SIMPLE);
    const [interestRateInput, setInterestRateInput] = useState('9.99');
    const [tenureInput, setTenureInput] = useState('12');
    const [startDateInput, setStartDateInput] = useState('2026-08-17');
    const [accountInput, setAccountInput] = useState('HDFC Savings Account');
    const [notesInput, setNotesInput] = useState('');

    const resetForm = () => {
        setStep(1);
        setDirection(LOAN_DIRECTION.GIVEN);
        setSelectedPersonId(initialPerson ? initialPerson.id : '');
        setNewPersonName('');
        setNewPersonPhone('');
        setIsCreatingNewPerson(false);
        setPrincipalInput('250000');
        setInterestMethod(INTEREST_METHOD.SIMPLE);
        setInterestRateInput('9.99');
        setTenureInput('12');
        setStartDateInput('2026-08-17');
        setAccountInput('HDFC Savings Account');
        setNotesInput('');
    };

    const handleNext = async () => {
        if (step === 2) {
            if (isCreatingNewPerson) {
                if (!newPersonName.trim()) {
                    Alert.alert('Required', 'Please enter the person\'s name.');
                    return;
                }
                const created = await onAddPerson({ name: newPersonName, phone: newPersonPhone });
                setSelectedPersonId(created.id);
                setIsCreatingNewPerson(false);
            } else if (!selectedPersonId) {
                Alert.alert('Required', 'Please select or add a person.');
                return;
            }
        }

        if (step === 3) {
            const p = parseFloat(principalInput);
            if (isNaN(p) || p <= 0) {
                Alert.alert('Invalid Amount', 'Please enter a valid loan amount.');
                return;
            }
        }

        if (step < 5) {
            setStep(step + 1);
        } else {
            // Confirm creation
            const newLoan = {
                personId: selectedPersonId,
                direction,
                principal: parseFloat(principalInput),
                interestRate: interestMethod === INTEREST_METHOD.NO_INTEREST ? 0 : parseFloat(interestRateInput) || 0,
                interestMethod,
                tenureMonths: parseInt(tenureInput, 10) || 12,
                startDate: startDateInput,
                accountId: accountInput,
                notes: notesInput
            };
            await onCreateLoan(newLoan);
            resetForm();
            onClose();
        }
    };

    const dna = calculateLoanDNA({
        principal: parseFloat(principalInput) || 0,
        interestRate: interestMethod === INTEREST_METHOD.NO_INTEREST ? 0 : parseFloat(interestRateInput) || 0,
        interestMethod,
        tenureMonths: parseInt(tenureInput, 10) || 12
    });

    const activePersonObj = persons.find(p => p.id === selectedPersonId) || { name: newPersonName || 'Selected Person' };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {step > 1 && (
                                <TouchableOpacity onPress={() => setStep(step - 1)}>
                                    <ArrowLeft size={18} color="#818CF8" />
                                </TouchableOpacity>
                            )}
                            <Text style={styles.headerTitle}>Add P2P Loan (Step {step} of 5)</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={20} color="#71717A" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                        {/* ── STEP 1: LOAN TYPE ── */}
                        {step === 1 && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.stepTitle}>What type of loan is this?</Text>
                                <TouchableOpacity
                                    style={[styles.typeOptionCard, direction === LOAN_DIRECTION.GIVEN && styles.typeOptionActive]}
                                    onPress={() => setDirection(LOAN_DIRECTION.GIVEN)}
                                >
                                    <View style={[styles.typeIcon, { backgroundColor: '#10B98120' }]}>
                                        <ArrowUpRight size={20} color="#10B981" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.typeOptionTitle}>I Gave Money (Lent)</Text>
                                        <Text style={styles.typeOptionDesc}>You lent cash to someone. Money is receivable.</Text>
                                    </View>
                                    {direction === LOAN_DIRECTION.GIVEN && <Check size={18} color="#10B981" />}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.typeOptionCard, direction === LOAN_DIRECTION.TAKEN && styles.typeOptionActive]}
                                    onPress={() => setDirection(LOAN_DIRECTION.TAKEN)}
                                >
                                    <View style={[styles.typeIcon, { backgroundColor: '#EF444420' }]}>
                                        <ArrowDownLeft size={20} color="#EF4444" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.typeOptionTitle}>I Borrowed Money (Taken)</Text>
                                        <Text style={styles.typeOptionDesc}>You took a loan from someone. Money is payable.</Text>
                                    </View>
                                    {direction === LOAN_DIRECTION.TAKEN && <Check size={18} color="#EF4444" />}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* ── STEP 2: PERSON ── */}
                        {step === 2 && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.stepTitle}>Who is the {direction === LOAN_DIRECTION.GIVEN ? 'borrower' : 'lender'}?</Text>
                                {!isCreatingNewPerson ? (
                                    <View style={{ gap: 8 }}>
                                        {persons.map(p => (
                                            <TouchableOpacity
                                                key={p.id}
                                                style={[styles.personChoiceItem, selectedPersonId === p.id && styles.personChoiceActive]}
                                                onPress={() => setSelectedPersonId(p.id)}
                                            >
                                                <Text style={styles.personChoiceName}>{p.name}</Text>
                                                {selectedPersonId === p.id && <Check size={16} color="#818CF8" />}
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity
                                            style={styles.addNewPersonBtn}
                                            onPress={() => setIsCreatingNewPerson(true)}
                                        >
                                            <Text style={styles.addNewPersonText}>+ Add New Person</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={{ gap: 10 }}>
                                        <Text style={styles.inputLabel}>Person Full Name</Text>
                                        <TextInput
                                            placeholder="e.g. Kasapa Reddy Bava"
                                            placeholderTextColor="#71717A"
                                            value={newPersonName}
                                            onChangeText={setNewPersonName}
                                            style={styles.textInput}
                                        />
                                        <Text style={styles.inputLabel}>Phone (Optional)</Text>
                                        <TextInput
                                            placeholder="+91 98450 12345"
                                            placeholderTextColor="#71717A"
                                            value={newPersonPhone}
                                            onChangeText={setNewPersonPhone}
                                            keyboardType="phone-pad"
                                            style={styles.textInput}
                                        />
                                        <TouchableOpacity onPress={() => setIsCreatingNewPerson(false)}>
                                            <Text style={{ color: '#818CF8', fontSize: 11 }}>Choose from existing list</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ── STEP 3: AMOUNT & INTEREST ── */}
                        {step === 3 && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.inputLabel}>Principal Amount (₹)</Text>
                                <TextInput
                                    placeholder="250000"
                                    placeholderTextColor="#71717A"
                                    value={principalInput}
                                    onChangeText={setPrincipalInput}
                                    keyboardType="numeric"
                                    style={[styles.textInput, { fontSize: 18, fontWeight: '900' }]}
                                />

                                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Interest Calculation Method</Text>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {[
                                        { key: INTEREST_METHOD.NO_INTEREST, label: '0% None' },
                                        { key: INTEREST_METHOD.SIMPLE, label: 'Simple' },
                                        { key: INTEREST_METHOD.AMORTIZED, label: 'Amortized' }
                                    ].map(m => (
                                        <TouchableOpacity
                                            key={m.key}
                                            style={[styles.interestMethodBtn, interestMethod === m.key && styles.interestMethodActive]}
                                            onPress={() => setInterestMethod(m.key)}
                                        >
                                            <Text style={[styles.interestMethodText, interestMethod === m.key && styles.interestMethodTextActive]}>
                                                {m.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {interestMethod !== INTEREST_METHOD.NO_INTEREST && (
                                    <View style={{ marginTop: 12 }}>
                                        <Text style={styles.inputLabel}>Annual Interest Rate (%)</Text>
                                        <TextInput
                                            placeholder="9.99"
                                            placeholderTextColor="#71717A"
                                            value={interestRateInput}
                                            onChangeText={setInterestRateInput}
                                            keyboardType="numeric"
                                            style={styles.textInput}
                                        />
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ── STEP 4: DATES & ACCOUNT ── */}
                        {step === 4 && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.inputLabel}>Tenure (Months)</Text>
                                <TextInput
                                    placeholder="12"
                                    placeholderTextColor="#71717A"
                                    value={tenureInput}
                                    onChangeText={setTenureInput}
                                    keyboardType="numeric"
                                    style={styles.textInput}
                                />

                                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Start Date (YYYY-MM-DD)</Text>
                                <TextInput
                                    placeholder="2026-08-17"
                                    placeholderTextColor="#71717A"
                                    value={startDateInput}
                                    onChangeText={setStartDateInput}
                                    style={styles.textInput}
                                />

                                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Funding / Receiving Cash Account</Text>
                                <TextInput
                                    placeholder="HDFC Savings Account"
                                    placeholderTextColor="#71717A"
                                    value={accountInput}
                                    onChangeText={setAccountInput}
                                    style={styles.textInput}
                                />

                                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Purpose / Notes (Optional)</Text>
                                <TextInput
                                    placeholder="e.g. School fees bridge advance"
                                    placeholderTextColor="#71717A"
                                    value={notesInput}
                                    onChangeText={setNotesInput}
                                    style={styles.textInput}
                                />
                            </View>
                        )}

                        {/* ── STEP 5: REVIEW ── */}
                        {step === 5 && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.stepTitle}>Review Loan Contract</Text>
                                <View style={styles.reviewCard}>
                                    <View style={styles.reviewRow}>
                                        <Text style={styles.reviewLabel}>Type</Text>
                                        <Text style={[styles.reviewVal, { color: direction === LOAN_DIRECTION.GIVEN ? '#10B981' : '#EF4444' }]}>
                                            {direction === LOAN_DIRECTION.GIVEN ? 'Money Given (Receivable)' : 'Money Borrowed (Payable)'}
                                        </Text>
                                    </View>
                                    <View style={styles.reviewRow}>
                                        <Text style={styles.reviewLabel}>Person</Text>
                                        <Text style={styles.reviewVal}>{activePersonObj.name}</Text>
                                    </View>
                                    <View style={styles.reviewRow}>
                                        <Text style={styles.reviewLabel}>Principal</Text>
                                        <Text style={[styles.reviewVal, { fontWeight: '900' }]}>{formatINR(dna.principal)}</Text>
                                    </View>
                                    <View style={styles.reviewRow}>
                                        <Text style={styles.reviewLabel}>Interest Method</Text>
                                        <Text style={styles.reviewVal}>{interestMethod} ({dna.annualRate}%)</Text>
                                    </View>
                                    <View style={styles.reviewRow}>
                                        <Text style={styles.reviewLabel}>Expected Monthly</Text>
                                        <Text style={[styles.reviewVal, { color: '#818CF8' }]}>{formatINR(dna.expectedMonthlyPayment)}/mo</Text>
                                    </View>
                                    <View style={[styles.reviewRow, { borderBottomWidth: 0 }]}>
                                        <Text style={styles.reviewLabel}>Total Payout</Text>
                                        <Text style={[styles.reviewVal, { fontWeight: '900', color: '#FFF' }]}>{formatINR(dna.totalExpectedRepayment)}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Bottom Action */}
                    <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8} onPress={handleNext}>
                        <Text style={styles.primaryBtnText}>{step === 5 ? 'Create Loan & Post Journal' : 'Continue'}</Text>
                        <ArrowRight size={16} color="#FFF" />
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
        borderColor: '#2D2F54',
        borderTopWidth: 1.5,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 18
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800'
    },
    stepContainer: {
        gap: 8,
        marginBottom: 12
    },
    stepTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 6
    },
    typeOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8
    },
    typeOptionActive: {
        borderColor: '#4F46E5',
        backgroundColor: '#181938'
    },
    typeIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center'
    },
    typeOptionTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    typeOptionDesc: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    personChoiceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12
    },
    personChoiceActive: {
        borderColor: '#818CF8',
        backgroundColor: '#181938'
    },
    personChoiceName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    addNewPersonBtn: {
        backgroundColor: '#1E2038',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center'
    },
    addNewPersonText: {
        color: '#818CF8',
        fontSize: 12,
        fontWeight: '800'
    },
    inputLabel: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700'
    },
    textInput: {
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FFFFFF',
        fontSize: 13
    },
    interestMethodBtn: {
        flex: 1,
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center'
    },
    interestMethodActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#818CF8'
    },
    interestMethodText: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700'
    },
    interestMethodTextActive: {
        color: '#FFFFFF',
        fontWeight: '800'
    },
    reviewCard: {
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12
    },
    reviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#1E2038'
    },
    reviewLabel: {
        color: '#94A3B8',
        fontSize: 12
    },
    reviewVal: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        paddingVertical: 12,
        marginTop: 10
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    }
});
