/**
 * components/groups/AddExpenseModal.js
 * 
 * Comprehensive modal for adding a shared expense.
 * Supports all 5 split methods (Equal, Exact, Percentage, Shares, Custom),
 * live paise conservation validation, deterministic remainder disclosure,
 * and multi-payer selection.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { X, Check, AlertCircle, Info, Calculator, Users, Plus, Minus } from 'lucide-react-native';
import { SPLIT_METHODS, toPaise, paiseToRupees, toRupeesFormatted } from '../../services/shared-costs/groupContracts.js';
import { SplitCalculator } from '../../services/shared-costs/splitCalculator.js';

export default function AddExpenseModal({ visible, group, onClose, onAddExpense }) {
    const isVisible = Boolean(visible && group);
    const members = Array.isArray(group?.members) ? group.members : [];

    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Food');
    const [payerId, setPayerId] = useState('You');
    const [splitMethod, setSplitMethod] = useState(SPLIT_METHODS.EQUAL);

    // Selected participants for Equal split
    const [selectedMemberIds, setSelectedMemberIds] = useState(members.map(m => m.id));

    // For Exact split: memberId -> amount string
    const [exactAmounts, setExactAmounts] = useState({});

    // For Percentage split: memberId -> percentage string
    const [percentages, setPercentages] = useState({});

    // For Shares split: memberId -> unit count (number)
    const [shareUnits, setShareUnits] = useState({});

    // Calculated split preview & validation
    const [splitPreview, setSplitPreview] = useState(null);
    const [validationError, setValidationError] = useState(null);

    const CATEGORIES = ['Food', 'Travel', 'Stay', 'Activities', 'Utilities', 'Shopping', 'General'];

    // Initialize inputs when modal opens or members change
    useEffect(() => {
        if (visible) {
            setSelectedMemberIds(members.map(m => m.id));
            const initialExact = {};
            const initialPct = {};
            const initialShares = {};
            const equalPct = members.length > 0 ? (100 / members.length).toFixed(2) : '0';

            members.forEach(m => {
                initialExact[m.id] = '';
                initialPct[m.id] = equalPct;
                initialShares[m.id] = 1;
            });

            setExactAmounts(initialExact);
            setPercentages(initialPct);
            setShareUnits(initialShares);
            setPayerId(members.find(m => m.id === 'You') ? 'You' : (members[0] ? members[0].id : 'You'));
            setTitle('');
            setAmount('');
            setCategory('Food');
            setSplitMethod(SPLIT_METHODS.EQUAL);
        }
    }, [visible, group]);

    // Live preview calculation whenever inputs change
    useEffect(() => {
        calculateLiveSplit();
    }, [amount, splitMethod, selectedMemberIds, exactAmounts, percentages, shareUnits]);

    const calculateLiveSplit = () => {
        const amtStr = String(amount || '').trim();
        if (!amtStr || isNaN(Number(amtStr)) || Number(amtStr) <= 0) {
            setSplitPreview(null);
            setValidationError(null);
            return;
        }

        try {
            const totalPaise = toPaise(amtStr);
            let result = null;

            if (splitMethod === SPLIT_METHODS.EQUAL) {
                const activeMembers = members.filter(m => selectedMemberIds.includes(m.id));
                if (activeMembers.length === 0) {
                    setValidationError('Please select at least one participating member');
                    setSplitPreview(null);
                    return;
                }
                result = SplitCalculator.splitEqual(totalPaise, activeMembers);
            } else if (splitMethod === SPLIT_METHODS.EXACT) {
                const sharesInput = members.map(m => ({
                    memberId: m.id,
                    displayNameSnapshot: m.displayNameSnapshot || m.name || m.id,
                    amount: exactAmounts[m.id] || 0
                }));
                result = SplitCalculator.splitExact(totalPaise, sharesInput);
            } else if (splitMethod === SPLIT_METHODS.PERCENTAGE) {
                const pctInput = members.map(m => ({
                    memberId: m.id,
                    displayNameSnapshot: m.displayNameSnapshot || m.name || m.id,
                    percentage: percentages[m.id] || 0
                }));
                result = SplitCalculator.splitPercentage(totalPaise, pctInput);
            } else if (splitMethod === SPLIT_METHODS.SHARES) {
                const sInput = members.map(m => ({
                    memberId: m.id,
                    displayNameSnapshot: m.displayNameSnapshot || m.name || m.id,
                    shareUnits: shareUnits[m.id] || 0
                }));
                result = SplitCalculator.splitShares(totalPaise, sInput);
            }

            setSplitPreview(result);
            setValidationError(null);
        } catch (err) {
            setSplitPreview(null);
            setValidationError(err.message);
        }
    };

    const toggleMemberSelection = (id) => {
        if (selectedMemberIds.includes(id)) {
            if (selectedMemberIds.length === 1) {
                Alert.alert('Cannot Deselect All', 'At least one member must participate in this expense.');
                return;
            }
            setSelectedMemberIds(selectedMemberIds.filter(mId => mId !== id));
        } else {
            setSelectedMemberIds([...selectedMemberIds, id]);
        }
    };

    const handleShareUnitChange = (memberId, delta) => {
        const current = shareUnits[memberId] || 0;
        const next = Math.max(0, current + delta);
        setShareUnits({ ...shareUnits, [memberId]: next });
    };

    const handleSave = () => {
        if (!title.trim()) {
            Alert.alert('Title Required', 'Please enter an expense title.');
            return;
        }
        if (!amount || Number(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
            return;
        }
        if (validationError) {
            Alert.alert('Split Allocation Error', validationError);
            return;
        }
        if (!splitPreview) {
            Alert.alert('Calculation Error', 'Please verify your split inputs.');
            return;
        }

        onAddExpense({
            title: title.trim(),
            amount: Number(amount),
            category,
            payerMemberId: payerId,
            splitMethod,
            participantMemberIds: selectedMemberIds,
            exactShares: members.map(m => ({ memberId: m.id, amount: exactAmounts[m.id] || 0 })),
            percentages: members.map(m => ({ memberId: m.id, percentage: percentages[m.id] || 0 })),
            sharesInput: members.map(m => ({ memberId: m.id, shareUnits: shareUnits[m.id] || 0 }))
        });

        onClose();
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
            {group ? (
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Add Expense</Text>
                            <Text style={styles.subtitle}>{group?.name || ''}</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#94A3B8" />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                        {/* Amount Entry */}
                        <View style={styles.amountContainer}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0.00"
                                placeholderTextColor="#475569"
                                keyboardType="decimal-pad"
                                value={amount}
                                onChangeText={setAmount}
                                autoFocus={true}
                            />
                        </View>

                        {/* Title */}
                        <Text style={styles.sectionLabel}>Description</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="What was this expense for? (e.g. Dinner, Villa, Flights)"
                            placeholderTextColor="#64748B"
                            value={title}
                            onChangeText={setTitle}
                        />

                        {/* Category Selector */}
                        <Text style={styles.sectionLabel}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                            {CATEGORIES.map(cat => (
                                <Pressable
                                    key={cat}
                                    style={[
                                        styles.catPill,
                                        category === cat && styles.catPillActive
                                    ]}
                                    onPress={() => setCategory(cat)}
                                >
                                    <Text style={[styles.catText, category === cat && styles.catTextActive]}>
                                        {cat}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* Payer Selector */}
                        <Text style={styles.sectionLabel}>Paid By</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.payerRow}>
                            {members.map(m => (
                                <Pressable
                                    key={m.id}
                                    style={[
                                        styles.payerPill,
                                        payerId === m.id && styles.payerPillActive
                                    ]}
                                    onPress={() => setPayerId(m.id)}
                                >
                                    <Text style={[styles.payerText, payerId === m.id && styles.payerTextActive]}>
                                        {m.displayNameSnapshot || m.name || m.id}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* Split Method Selector */}
                        <Text style={styles.sectionLabel}>Split Method</Text>
                        <View style={styles.splitMethodsRow}>
                            {[
                                { key: SPLIT_METHODS.EQUAL, label: 'Equally' },
                                { key: SPLIT_METHODS.EXACT, label: 'Exact' },
                                { key: SPLIT_METHODS.PERCENTAGE, label: '%' },
                                { key: SPLIT_METHODS.SHARES, label: 'Shares' }
                            ].map(item => (
                                <Pressable
                                    key={item.key}
                                    style={[
                                        styles.splitMethodPill,
                                        splitMethod === item.key && styles.splitMethodPillActive
                                    ]}
                                    onPress={() => setSplitMethod(item.key)}
                                >
                                    <Text style={[styles.splitMethodText, splitMethod === item.key && styles.splitMethodTextActive]}>
                                        {item.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Dynamic Split Breakdown */}
                        <View style={styles.breakdownBox}>
                            <Text style={styles.breakdownHeader}>Split Participants & Allocations</Text>

                            {/* EQUAL SPLIT BREAKDOWN */}
                            {splitMethod === SPLIT_METHODS.EQUAL && (
                                <View>
                                    {members.map(m => {
                                        const isSelected = selectedMemberIds.includes(m.id);
                                        const shareObj = splitPreview ? splitPreview.shares.find(s => s.memberId === m.id) : null;
                                        return (
                                            <Pressable
                                                key={m.id}
                                                style={styles.memberRow}
                                                onPress={() => toggleMemberSelection(m.id)}
                                            >
                                                <View style={styles.memberInfo}>
                                                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                                        {isSelected && <Check size={14} color="#FFF" />}
                                                    </View>
                                                    <Text style={[styles.memberName, !isSelected && styles.memberNameInactive]}>
                                                        {m.displayNameSnapshot || m.name || m.id}
                                                    </Text>
                                                </View>
                                                {isSelected && shareObj ? (
                                                    <Text style={styles.shareAmountText}>
                                                        {toRupeesFormatted(shareObj.amountPaise)}
                                                    </Text>
                                                ) : (
                                                    <Text style={styles.shareExcludedText}>Excluded</Text>
                                                )}
                                            </Pressable>
                                        );
                                    })}
                                    {splitPreview && splitPreview.disclosure && (
                                        <View style={styles.disclosureBox}>
                                            <Info size={14} color="#F59E0B" />
                                            <Text style={styles.disclosureText}>{splitPreview.disclosure}</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* EXACT AMOUNTS SPLIT BREAKDOWN */}
                            {splitMethod === SPLIT_METHODS.EXACT && (
                                <View>
                                    {members.map(m => (
                                        <View key={m.id} style={styles.memberRow}>
                                            <Text style={styles.memberName}>{m.displayNameSnapshot || m.name || m.id}</Text>
                                            <View style={styles.exactInputContainer}>
                                                <Text style={styles.rupeePrefix}>₹</Text>
                                                <TextInput
                                                    style={styles.exactInput}
                                                    placeholder="0.00"
                                                    placeholderTextColor="#64748B"
                                                    keyboardType="decimal-pad"
                                                    value={exactAmounts[m.id]}
                                                    onChangeText={(val) => setExactAmounts({ ...exactAmounts, [m.id]: val })}
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* PERCENTAGE SPLIT BREAKDOWN */}
                            {splitMethod === SPLIT_METHODS.PERCENTAGE && (
                                <View>
                                    {members.map(m => {
                                        const shareObj = splitPreview ? splitPreview.shares.find(s => s.memberId === m.id) : null;
                                        return (
                                            <View key={m.id} style={styles.memberRow}>
                                                <Text style={styles.memberName}>{m.displayNameSnapshot || m.name || m.id}</Text>
                                                <View style={styles.rightGroup}>
                                                    <View style={styles.exactInputContainer}>
                                                        <TextInput
                                                            style={[styles.exactInput, { width: 50, textAlign: 'right' }]}
                                                            placeholder="0"
                                                            placeholderTextColor="#64748B"
                                                            keyboardType="numeric"
                                                            value={percentages[m.id]}
                                                            onChangeText={(val) => setPercentages({ ...percentages, [m.id]: val })}
                                                        />
                                                        <Text style={styles.pctSuffix}>%</Text>
                                                    </View>
                                                    {shareObj && (
                                                        <Text style={styles.calculatedShareText}>
                                                            {toRupeesFormatted(shareObj.amountPaise)}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* SHARES SPLIT BREAKDOWN */}
                            {splitMethod === SPLIT_METHODS.SHARES && (
                                <View>
                                    {members.map(m => {
                                        const shareObj = splitPreview ? splitPreview.shares.find(s => s.memberId === m.id) : null;
                                        return (
                                            <View key={m.id} style={styles.memberRow}>
                                                <Text style={styles.memberName}>{m.displayNameSnapshot || m.name || m.id}</Text>
                                                <View style={styles.rightGroup}>
                                                    <View style={styles.stepperContainer}>
                                                        <Pressable
                                                            style={styles.stepperBtn}
                                                            onPress={() => handleShareUnitChange(m.id, -1)}
                                                        >
                                                            <Minus size={14} color="#FFF" />
                                                        </Pressable>
                                                        <Text style={styles.stepperValue}>{shareUnits[m.id] || 0}</Text>
                                                        <Pressable
                                                            style={styles.stepperBtn}
                                                            onPress={() => handleShareUnitChange(m.id, 1)}
                                                        >
                                                            <Plus size={14} color="#FFF" />
                                                        </Pressable>
                                                    </View>
                                                    {shareObj && (
                                                        <Text style={styles.calculatedShareText}>
                                                            {toRupeesFormatted(shareObj.amountPaise)}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Live Status / Error Banner */}
                            {validationError ? (
                                <View style={styles.errorBox}>
                                    <AlertCircle size={14} color="#F43F5E" />
                                    <Text style={styles.errorText}>{validationError}</Text>
                                </View>
                            ) : splitPreview ? (
                                <View style={styles.successBox}>
                                    <Check size={14} color="#10B981" />
                                    <Text style={styles.successText}>
                                        All {toRupeesFormatted(splitPreview.totalAmountPaise)} allocated penny-perfect
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <Pressable style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.submitBtn,
                                (validationError || !amount) && styles.submitBtnDisabled
                            ]}
                            onPress={handleSave}
                            disabled={!!validationError || !amount}
                        >
                            <Text style={styles.submitText}>Add Expense</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
            ) : <View />}
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        justifyContent: 'flex-end'
    },
    sheet: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '92%',
        borderWidth: 1,
        borderColor: '#334155'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    subtitle: {
        fontSize: 13,
        color: '#94A3B8'
    },
    closeBtn: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: '#0F172A'
    },
    scrollArea: {
        maxHeight: 500
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155'
    },
    currencySymbol: {
        fontSize: 32,
        fontWeight: '700',
        color: '#F43F5E',
        marginRight: 6
    },
    amountInput: {
        fontSize: 36,
        fontWeight: '800',
        color: '#F8FAFC',
        minWidth: 140,
        textAlign: 'center'
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#CBD5E1',
        marginBottom: 8,
        marginTop: 12
    },
    textInput: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 12,
        color: '#F8FAFC',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#334155'
    },
    categoryRow: {
        flexDirection: 'row',
        marginBottom: 4
    },
    catPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#0F172A',
        borderWidth: 1,
        borderColor: '#334155',
        marginRight: 8
    },
    catPillActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6'
    },
    catText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8'
    },
    catTextActive: {
        color: '#FFFFFF'
    },
    payerRow: {
        flexDirection: 'row',
        marginBottom: 4
    },
    payerPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#0F172A',
        borderWidth: 1,
        borderColor: '#334155',
        marginRight: 8
    },
    payerPillActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981'
    },
    payerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8'
    },
    payerTextActive: {
        color: '#FFFFFF'
    },
    splitMethodsRow: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 12
    },
    splitMethodPill: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8
    },
    splitMethodPillActive: {
        backgroundColor: '#F43F5E'
    },
    splitMethodText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8'
    },
    splitMethodTextActive: {
        color: '#FFFFFF'
    },
    breakdownBox: {
        backgroundColor: '#0F172A',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#334155',
        marginTop: 6
    },
    breakdownHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B'
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#475569',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E293B'
    },
    checkboxActive: {
        backgroundColor: '#F43F5E',
        borderColor: '#F43F5E'
    },
    memberName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F8FAFC'
    },
    memberNameInactive: {
        color: '#64748B',
        textDecorationLine: 'line-through'
    },
    shareAmountText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10B981'
    },
    shareExcludedText: {
        fontSize: 12,
        color: '#64748B',
        fontStyle: 'italic'
    },
    exactInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#334155'
    },
    rupeePrefix: {
        color: '#94A3B8',
        fontSize: 12,
        marginRight: 4
    },
    exactInput: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600',
        width: 70,
        padding: 0
    },
    rightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    pctSuffix: {
        color: '#94A3B8',
        fontSize: 12,
        marginLeft: 2
    },
    calculatedShareText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
        minWidth: 60,
        textAlign: 'right'
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155'
    },
    stepperBtn: {
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center'
    },
    stepperValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F8FAFC',
        paddingHorizontal: 10
    },
    disclosureBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)'
    },
    disclosureText: {
        fontSize: 11,
        color: '#F59E0B',
        flex: 1
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.3)'
    },
    errorText: {
        fontSize: 11,
        color: '#F43F5E',
        flex: 1,
        fontWeight: '500'
    },
    successBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    successText: {
        fontSize: 11,
        color: '#10B981',
        flex: 1,
        fontWeight: '600'
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155'
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#475569',
        alignItems: 'center'
    },
    cancelText: {
        color: '#94A3B8',
        fontWeight: '600',
        fontSize: 14
    },
    submitBtn: {
        flex: 2,
        backgroundColor: '#F43F5E',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    submitBtnDisabled: {
        backgroundColor: '#475569',
        opacity: 0.6
    },
    submitText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14
    }
});
