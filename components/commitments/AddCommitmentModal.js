/**
 * components/commitments/AddCommitmentModal.js
 * 
 * Dynamic creation modal for recurring financial commitments.
 * Validates against strict MoneyPaise contract and auto-classifies financial nature.
 */

import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import {
    CommitmentType,
    FinancialNature,
    AmountMode,
    RecurrenceFrequency,
    FamilyObligationCategory,
    rupeesToMoneyPaise,
    validateCommitment
} from '../../services/commitments/commitmentContracts.js';
import { FamilyRepository } from '../../services/family/familyRepository.js';

const TYPE_OPTIONS = [
    { label: 'Subscription', value: CommitmentType.SUBSCRIPTION, defaultNature: FinancialNature.EXPENSE, defaultCat: 'Entertainment' },
    { label: 'Loan / EMI', value: CommitmentType.LOAN_EMI, defaultNature: FinancialNature.DEBT, defaultCat: 'Debt & Loans' },
    { label: 'Rent', value: CommitmentType.RENT, defaultNature: FinancialNature.EXPENSE, defaultCat: 'Housing' },
    { label: 'Parent Support', value: CommitmentType.PARENT_SUPPORT, defaultNature: FinancialNature.EXPENSE, defaultCat: 'Family' },
    { label: 'Medical Care', value: CommitmentType.MEDICAL_CARE, defaultNature: FinancialNature.EXPENSE, defaultCat: 'Healthcare' },
    { label: 'Education', value: CommitmentType.EDUCATION, defaultNature: FinancialNature.EXPENSE, defaultCat: 'Education' },
    { label: 'Insurance', value: CommitmentType.INSURANCE, defaultNature: FinancialNature.EXPENSE, defaultCat: 'Insurance' },
    { label: 'Utility Bill', value: CommitmentType.UTILITY_BILL, defaultNature: FinancialNature.EXPENSE, defaultCat: 'Utilities' },
    { label: 'Investment SIP', value: CommitmentType.INVESTMENT_SIP, defaultNature: FinancialNature.INVESTMENT, defaultCat: 'Investments' },
    { label: 'Other', value: CommitmentType.OTHER, defaultNature: FinancialNature.EXPENSE, defaultCat: 'General' }
];

const CATEGORY_OPTIONS = [
    { label: 'Child Education', value: FamilyObligationCategory.CHILD_EDUCATION },
    { label: 'Family Protection & Insurance', value: FamilyObligationCategory.FAMILY_PROTECTION },
    { label: 'Parent Support', value: FamilyObligationCategory.PARENT_SUPPORT },
    { label: 'Health & Care', value: FamilyObligationCategory.HEALTH_AND_CARE },
    { label: 'Household Shared', value: FamilyObligationCategory.HOUSEHOLD_SHARED },
    { label: 'Other Family Obligation', value: FamilyObligationCategory.OTHER_FAMILY }
];

const FREQUENCY_OPTIONS = [
    { label: 'Monthly', value: RecurrenceFrequency.MONTHLY },
    { label: 'Quarterly', value: RecurrenceFrequency.QUARTERLY },
    { label: 'Yearly', value: RecurrenceFrequency.YEARLY },
    { label: 'Weekly', value: RecurrenceFrequency.WEEKLY },
    { label: 'Fortnightly', value: RecurrenceFrequency.FORTNIGHTLY }
];

export default function AddCommitmentModal({
    visible,
    onClose,
    onSave,
    initialValues = null
}) {
    const [name, setName] = useState('');
    const [amountRupees, setAmountRupees] = useState('');
    const [selectedType, setSelectedType] = useState(CommitmentType.BILL);
    const [nature, setNature] = useState(FinancialNature.EXPENSE);
    const [category, setCategory] = useState('Utilities');
    const [frequency, setFrequency] = useState(RecurrenceFrequency.MONTHLY);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [isVariable, setIsVariable] = useState(false);

    // Family Linkage state
    const [familyMembers, setFamilyMembers] = useState([]);
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [obligationCategory, setObligationCategory] = useState(FamilyObligationCategory.CHILD_EDUCATION);

    // Load active family members on open
    React.useEffect(() => {
        if (visible) {
            FamilyRepository.loadFamilyEnvelope()
                .then(envelope => {
                    const rawPersons = envelope?.data?.persons || [];
                    const active = rawPersons
                        .filter(p => {
                            const status = p.status || p.core?.status || 'ACTIVE';
                            return status !== 'ARCHIVED' && status !== 'DELETED';
                        })
                        .map(p => ({
                            id: p.id || p.core?.id,
                            name: p.name || p.profile?.displayName || p.core?.fullName || 'Family Member',
                            role: p.role || p.core?.relationship || p.profile?.relationship || 'MEMBER'
                        }));
                    setFamilyMembers(active);
                })
                .catch(() => setFamilyMembers([]));

            if (initialValues) {
                if (initialValues.name) setName(initialValues.name);
                if (initialValues.amountRupees) setAmountRupees(initialValues.amountRupees);
                if (initialValues.type) setSelectedType(initialValues.type);
                if (initialValues.financialNature) setNature(initialValues.financialNature);
                if (initialValues.category) setCategory(initialValues.category);
                if (initialValues.frequency) setFrequency(initialValues.frequency);
                if (initialValues.personId) setSelectedMemberId(initialValues.personId);
                if (initialValues.obligationCategory) setObligationCategory(initialValues.obligationCategory);
            }
        }
    }, [visible, initialValues]);

    const handleSelectType = (opt) => {
        setSelectedType(opt.value);
        setNature(opt.defaultNature);
        setCategory(opt.defaultCat);
    };

    const handleSelectFamilyCategory = (cat) => {
        setObligationCategory(cat);
        if (cat === FamilyObligationCategory.EDUCATION) {
            setSelectedType(CommitmentType.EDUCATION);
            setNature(FinancialNature.EXPENSE);
            setCategory('Education');
        } else if (cat === FamilyObligationCategory.INSURANCE) {
            setSelectedType(CommitmentType.INSURANCE);
            setNature(FinancialNature.EXPENSE);
            setCategory('Insurance');
        } else if (cat === FamilyObligationCategory.PARENT_SUPPORT) {
            setSelectedType(CommitmentType.PARENT_SUPPORT);
            setNature(FinancialNature.EXPENSE);
            setCategory('Family');
        } else if (cat === FamilyObligationCategory.HEALTHCARE) {
            setSelectedType(CommitmentType.MEDICAL_CARE);
            setNature(FinancialNature.EXPENSE);
            setCategory('Healthcare');
        }
    };

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Missing Field', 'Please enter a name for this commitment.');
            return;
        }

        const numRupees = parseFloat(amountRupees);
        if (isNaN(numRupees) || numRupees <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
            return;
        }

        try {
            const moneyPaise = rupeesToMoneyPaise(numRupees);
            const newCommitment = {
                id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: name.trim(),
                type: selectedType,
                financialNature: nature,
                amountMode: isVariable ? AmountMode.VARIABLE : AmountMode.FIXED,
                amount: moneyPaise,
                frequency,
                startDate,
                nextDueDate: startDate,
                status: 'ACTIVE',
                version: 1,
                category
            };

            // Attach validated familyContext if selected
            if (selectedMemberId) {
                const member = familyMembers.find(m => m.id === selectedMemberId);
                if (member) {
                    newCommitment.familyContext = {
                        personId: member.id,
                        familyRole: member.role,
                        obligationCategory
                    };
                    newCommitment.familyMemberName = member.name;
                }
            }

            validateCommitment(newCommitment);
            onSave(newCommitment);

            // Reset
            setName('');
            setAmountRupees('');
            setSelectedType(CommitmentType.SUBSCRIPTION);
            setFrequency(RecurrenceFrequency.MONTHLY);
            setSelectedMemberId(null);
            onClose();
        } catch (error) {
            Alert.alert('Validation Error', error.message);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>New Recurring Commitment</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                            <X size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                        {/* Type Picker */}
                        <Text style={styles.sectionLabel}>Commitment Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                            {TYPE_OPTIONS.map(opt => {
                                const isSelected = selectedType === opt.value;
                                return (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[styles.typeChip, isSelected && styles.typeChipActive]}
                                        onPress={() => handleSelectType(opt)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Name Input */}
                        <Text style={styles.sectionLabel}>Commitment Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. HDFC Home Loan, Netflix, Office Rent"
                            placeholderTextColor="#64748B"
                            value={name}
                            onChangeText={setName}
                        />

                        {/* Amount & Frequency Row */}
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionLabel}>Amount (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 15000"
                                    placeholderTextColor="#64748B"
                                    keyboardType="numeric"
                                    value={amountRupees}
                                    onChangeText={setAmountRupees}
                                />
                            </View>
                        </View>

                        {/* Frequency Selector */}
                        <Text style={styles.sectionLabel}>Billing Frequency</Text>
                        <View style={styles.freqGrid}>
                            {FREQUENCY_OPTIONS.map(freq => {
                                const isSelected = frequency === freq.value;
                                return (
                                    <TouchableOpacity
                                        key={freq.value}
                                        style={[styles.freqChip, isSelected && styles.freqChipActive]}
                                        onPress={() => setFrequency(freq.value)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.freqChipText, isSelected && styles.freqChipTextActive]}>
                                            {freq.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Due Date & Category Row */}
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionLabel}>Next Due Date (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="2026-09-15"
                                    placeholderTextColor="#64748B"
                                    value={startDate}
                                    onChangeText={setStartDate}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionLabel}>Category</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Category"
                                    placeholderTextColor="#64748B"
                                    value={category}
                                    onChangeText={setCategory}
                                />
                            </View>
                        </View>

                        {/* Family Linkage (Optional) */}
                        {familyMembers.length > 0 && (
                            <View style={styles.familySection}>
                                <Text style={styles.sectionLabel}>Link to Family Member (Optional)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                                    <TouchableOpacity
                                        style={[styles.typeChip, !selectedMemberId && styles.typeChipActive]}
                                        onPress={() => setSelectedMemberId(null)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.typeChipText, !selectedMemberId && styles.typeChipTextActive]}>
                                            None (Self)
                                        </Text>
                                    </TouchableOpacity>
                                    {familyMembers.map(mem => {
                                        const isSelected = selectedMemberId === mem.id;
                                        return (
                                            <TouchableOpacity
                                                key={mem.id}
                                                style={[styles.typeChip, isSelected && styles.typeChipActive]}
                                                onPress={() => setSelectedMemberId(mem.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                                                    {mem.name} ({mem.role})
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {selectedMemberId && (
                                    <View style={{ marginTop: 6 }}>
                                        <Text style={styles.subSectionLabel}>Obligation Category</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                                            {CATEGORY_OPTIONS.map(cat => {
                                                const isSelected = obligationCategory === cat.value;
                                                return (
                                                    <TouchableOpacity
                                                        key={cat.value}
                                                        style={[styles.catChip, isSelected && styles.catChipActive]}
                                                        onPress={() => handleSelectFamilyCategory(cat.value)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                                                            {cat.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Save Button */}
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSave}
                            activeOpacity={0.8}
                        >
                            <Check size={18} color="#FFFFFF" />
                            <Text style={styles.saveBtnText}>Save Commitment</Text>
                        </TouchableOpacity>
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
    sheet: {
        backgroundColor: '#161426',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: '#2D2845'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#242038'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#242038',
        alignItems: 'center',
        justifyContent: 'center'
    },
    body: {
        paddingHorizontal: 20
    },
    bodyContent: {
        paddingVertical: 18,
        gap: 14
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 6
    },
    typeScroll: {
        marginBottom: 8
    },
    typeChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#1E1B2E',
        borderWidth: 1,
        borderColor: '#2D2845',
        marginRight: 8
    },
    typeChipActive: {
        backgroundColor: '#701A75',
        borderColor: '#D946EF'
    },
    typeChipText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '600'
    },
    typeChipTextActive: {
        color: '#FFFFFF'
    },
    input: {
        backgroundColor: '#1E1B2E',
        borderWidth: 1,
        borderColor: '#2D2845',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#FFFFFF',
        fontSize: 14
    },
    row: {
        flexDirection: 'row',
        gap: 12
    },
    freqGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 4
    },
    freqChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#1E1B2E',
        borderWidth: 1,
        borderColor: '#2D2845'
    },
    freqChipActive: {
        backgroundColor: '#2D2845',
        borderColor: '#A78BFA'
    },
    freqChipText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600'
    },
    freqChipTextActive: {
        color: '#A78BFA'
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D946EF',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
        marginTop: 10
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    familySection: {
        backgroundColor: '#1E1B2E',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#2D2845'
    },
    subSectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#A78BFA',
        marginBottom: 6
    },
    catChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#161426',
        borderWidth: 1,
        borderColor: '#2D2845',
        marginRight: 6
    },
    catChipActive: {
        backgroundColor: '#3B0764',
        borderColor: '#C084FC'
    },
    catChipText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500'
    },
    catChipTextActive: {
        color: '#F3E8FF',
        fontWeight: '600'
    }
});
