import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { X, Plus, Save, Trash2, Edit2, Calendar, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import IncomeCategorySelector, { INCOME_CATEGORIES } from './IncomeCategorySelector';

export default function AddIncomeModal({ visible, onClose, onSave, onDelete, editingIncome = null }) {
    const [source, setSource] = useState(editingIncome?.source || '');
    const [amount, setAmount] = useState(editingIncome?.amount?.toString() || '');
    const [category, setCategory] = useState(editingIncome?.category || 'salary');
    const [notes, setNotes] = useState(editingIncome?.notes || '');
    const [isRecurring, setIsRecurring] = useState(editingIncome?.isRecurring || false);
    const [showCategorySelector, setShowCategorySelector] = useState(false);

    // Sync state with editingIncome when it changes
    React.useEffect(() => {
        if (editingIncome) {
            setSource(editingIncome.source);
            setAmount(editingIncome.amount.toString());
            setCategory(editingIncome.category);
            setNotes(editingIncome.notes);
            setIsRecurring(editingIncome.isRecurring);
        } else {
            resetForm();
        }
    }, [editingIncome]);

    const handleSave = () => {
        if (!source.trim() || !amount.trim()) {
            alert('Please fill in source and amount');
            return;
        }

        const incomeData = {
            id: editingIncome?.id || Date.now(),
            source: source.trim(),
            amount: parseFloat(amount),
            category,
            notes: notes.trim(),
            isRecurring,
            date: editingIncome?.date || new Date().toISOString(),
            type: 'Income'
        };

        onSave(incomeData);
        if (!editingIncome) resetForm(); // Only reset if adding new, otherwise parent handles close
    };

    const resetForm = () => {
        setSource('');
        setAmount('');
        setCategory('salary');
        setNotes('');
        setIsRecurring(false);
    };

    const handleDelete = () => {
        if (onDelete && editingIncome) {
            onDelete(editingIncome.id);
        }
    };

    const categoryData = INCOME_CATEGORIES[category] || INCOME_CATEGORIES['salary'];
    const CategoryIcon = categoryData.icon;

    return (
        <>
            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingIncome ? 'Edit Income' : 'Add Income'}
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                            {/* Category Selection */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Category</Text>
                                <TouchableOpacity
                                    style={styles.categoryButton}
                                    onPress={() => setShowCategorySelector(true)}
                                >
                                    <LinearGradient
                                        colors={[`${categoryData.color}20`, `${categoryData.color}10`]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.categoryButtonGradient}
                                    />
                                    <View style={[styles.categoryButtonIcon, { backgroundColor: `${categoryData.color}20` }]}>
                                        <CategoryIcon size={20} color={categoryData.color} strokeWidth={2.5} />
                                    </View>
                                    <Text style={styles.categoryButtonText}>{categoryData.label}</Text>
                                    <Edit2 size={16} color="#71717A" />
                                </TouchableOpacity>
                            </View>

                            {/* Source */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Source Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Tech Corp Inc., Freelance Project"
                                    placeholderTextColor="#71717A"
                                    value={source}
                                    onChangeText={setSource}
                                />
                            </View>

                            {/* Amount */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Amount (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor="#71717A"
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* Notes */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Notes (Optional)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Add any additional details..."
                                    placeholderTextColor="#71717A"
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Recurring Toggle */}
                            <TouchableOpacity
                                style={styles.toggleRow}
                                onPress={() => setIsRecurring(!isRecurring)}
                            >
                                <View style={styles.toggleInfo}>
                                    <Calendar size={20} color="#10B981" />
                                    <View style={styles.toggleTextContainer}>
                                        <Text style={styles.toggleLabel}>Recurring Income</Text>
                                        <Text style={styles.toggleDescription}>
                                            Mark if this income repeats monthly
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.toggle, isRecurring && styles.toggleActive]}>
                                    <View style={[styles.toggleThumb, isRecurring && styles.toggleThumbActive]} />
                                </View>
                            </TouchableOpacity>

                            {/* Save Button */}
                            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.saveButtonGradient}
                                >
                                    <Save size={20} color="#FFFFFF" strokeWidth={2.5} />
                                    <Text style={styles.saveButtonText}>
                                        {editingIncome ? 'Update Income' : 'Add Income'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Delete Button */}
                            {editingIncome && (
                                <TouchableOpacity
                                    style={[styles.saveButton, { marginTop: 16 }]}
                                    onPress={handleDelete}
                                >
                                    <View style={[styles.saveButtonGradient, { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#EF444450', borderRadius: 20 }]}>
                                        <Trash2 size={20} color="#EF4444" strokeWidth={2.5} />
                                        <Text style={[styles.saveButtonText, { color: '#EF4444' }]}>
                                            Delete Income
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            <IncomeCategorySelector
                                visible={showCategorySelector}
                                onClose={() => setShowCategorySelector(false)}
                                onSelect={(cat) => {
                                    setCategory(cat);
                                    setShowCategorySelector(false);
                                }}
                                selectedCategory={category}
                            />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#18181B',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#FFFFFF10'
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center'
    },
    formScroll: {
        padding: 24
    },
    formGroup: {
        marginBottom: 24
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#A1A1AA',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    input: {
        backgroundColor: '#27272A',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top'
    },
    categoryButton: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27272A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFFFFF10',
        overflow: 'hidden'
    },
    categoryButtonGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    },
    categoryButtonIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    categoryButtonText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#27272A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    toggleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12
    },
    toggleTextContainer: {
        flex: 1
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4
    },
    toggleDescription: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '500'
    },
    toggle: {
        width: 52,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#3F3F46',
        padding: 2,
        justifyContent: 'center'
    },
    toggleActive: {
        backgroundColor: '#10B981'
    },
    toggleThumb: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF'
    },
    toggleThumbActive: {
        alignSelf: 'flex-end'
    },
    saveButton: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 8
    },
    saveButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        gap: 12
    },
    saveButtonText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFFFFF'
    }
});
