import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { X, Save, Trash2, Edit2, Info, Utensils, ShoppingBag, Car, Home, Heart, Zap, Smartphone, Plane, GraduationCap, Gift, Wallet } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Copied from Transactions - ideal to move to constants/Categories.js later
const CATEGORIES = {
    'Food & Dining': { icon: Utensils, color: '#F59E0B' },
    'Shopping': { icon: ShoppingBag, color: '#EC4899' },
    'Transportation': { icon: Car, color: '#3B82F6' },
    'Housing': { icon: Home, color: '#8B5CF6' },
    'Healthcare': { icon: Heart, color: '#EF4444' },
    'Utilities': { icon: Zap, color: '#10B981' },
    'Entertainment': { icon: Smartphone, color: '#6366F1' },
    'Travel': { icon: Plane, color: '#14B8A6' },
    'Education': { icon: GraduationCap, color: '#F97316' },
    'Gifts': { icon: Gift, color: '#EC4899' },
    'Other': { icon: Wallet, color: '#71717A' },
};

import { CATEGORY_TYPE_MAPPING } from '../../services/budget/budgetContracts.js';

export default function AddBudgetModal({ visible, onClose, onSave, onDelete, editingBudget = null }) {
    const [category, setCategory] = useState(editingBudget?.category || 'Food & Dining');
    const [limit, setLimit] = useState(editingBudget?.limit?.toString() || '');
    const [period, setPeriod] = useState(editingBudget?.period || 'Monthly');
    const [allocationType, setAllocationType] = useState(editingBudget?.type || CATEGORY_TYPE_MAPPING['Food & Dining'] || 'Needs');
    const [showCategorySelector, setShowCategorySelector] = useState(false);

    // Sync state
    useEffect(() => {
        if (editingBudget) {
            setCategory(editingBudget.category);
            setLimit(editingBudget.limit.toString());
            setPeriod(editingBudget.period || 'Monthly');
            setAllocationType(editingBudget.type || CATEGORY_TYPE_MAPPING[editingBudget.category] || 'Needs');
        } else {
            resetForm();
        }
    }, [editingBudget]);

    const resetForm = () => {
        setCategory('Food & Dining');
        setLimit('');
        setPeriod('Monthly');
        setAllocationType('Needs');
        setShowCategorySelector(false);
    };

    const handleSave = () => {
        if (!limit.trim()) {
            alert('Please set a budget limit');
            return;
        }

        const budgetData = {
            id: editingBudget?.id || Date.now().toString(),
            category,
            type: allocationType,
            limit: parseFloat(limit),
            period,
            spent: editingBudget?.spent || 0, // Preserve spent amount if editing, else 0
            updatedAt: new Date().toISOString()
        };

        onSave(budgetData);
        if (!editingBudget) resetForm();
    };

    const handleDelete = () => {
        if (onDelete && editingBudget) {
            onDelete(editingBudget.id);
        }
    };


    const categoryConfig = CATEGORIES[category] || CATEGORIES['Other'];
    const CategoryIcon = categoryConfig.icon;

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editingBudget ? 'Edit Budget' : 'Set New Budget'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                        {/* Category Selector */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Budget Category</Text>
                            <TouchableOpacity
                                style={styles.categoryButton}
                                onPress={() => setShowCategorySelector(!showCategorySelector)}
                            >
                                <LinearGradient
                                    colors={[`${categoryConfig.color}20`, `${categoryConfig.color}10`]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.categoryButtonGradient}
                                />
                                <View style={[styles.categoryIcon, { backgroundColor: `${categoryConfig.color}20` }]}>
                                    <CategoryIcon size={20} color={categoryConfig.color} strokeWidth={2.5} />
                                </View>
                                <Text style={styles.categoryButtonText}>{category}</Text>
                                <Edit2 size={16} color="#71717A" />
                            </TouchableOpacity>

                            {/* Collapsible Category Grid */}
                            {showCategorySelector && (
                                <View style={styles.categoryGrid}>
                                    {Object.entries(CATEGORIES).map(([catName, config]) => {
                                        const Icon = config.icon;
                                        const isSelected = category === catName;
                                        return (
                                            <TouchableOpacity
                                                key={catName}
                                                style={[
                                                    styles.gridItem,
                                                    isSelected && { borderColor: config.color, backgroundColor: config.color + '10' }
                                                ]}
                                                onPress={() => {
                                                    setCategory(catName);
                                                    setShowCategorySelector(false);
                                                }}
                                            >
                                                <Icon size={18} color={isSelected ? config.color : '#71717A'} />
                                                <Text style={[styles.gridText, isSelected && { color: config.color }]}>
                                                    {catName}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>

                        {/* Allocation Bucket (Needs / Wants / Future) */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Allocation Bucket</Text>
                            <View style={styles.bucketRow}>
                                {['Needs', 'Wants', 'Future'].map(b => (
                                    <TouchableOpacity
                                        key={b}
                                        style={[styles.bucketBtn, allocationType === b && styles.bucketBtnSelected]}
                                        onPress={() => setAllocationType(b)}
                                    >
                                        <Text style={[styles.bucketBtnText, allocationType === b && styles.bucketBtnTextSelected]}>{b}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Limit Input */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Monthly Limit (₹)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 5000"
                                placeholderTextColor="#71717A"
                                value={limit}
                                onChangeText={setLimit}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Frequency Pill (Static for now) */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Frequency</Text>
                            <View style={styles.frequencyRow}>
                                <View style={styles.pillActive}>
                                    <Text style={styles.pillTextActive}>Monthly</Text>
                                </View>
                                <View style={styles.pill}>
                                    <Text style={styles.pillText}>Weekly (Coming Soon)</Text>
                                </View>
                            </View>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <LinearGradient
                                colors={['#6366F1', '#4F46E5']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.saveButtonGradient}
                            >
                                <Save size={20} color="#FFFFFF" strokeWidth={2.5} />
                                <Text style={styles.saveButtonText}>
                                    {editingBudget ? 'Update Budget' : 'Set Budget'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Delete Button */}
                        {editingBudget && (
                            <TouchableOpacity
                                style={[styles.saveButton, { marginTop: 16 }]}
                                onPress={handleDelete}
                            >
                                <View style={[styles.saveButtonGradient, { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#EF444450', borderRadius: 20 }]}>
                                    <Trash2 size={20} color="#EF4444" strokeWidth={2.5} />
                                    <Text style={[styles.saveButtonText, { color: '#EF4444' }]}>
                                        Remove Budget
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        <View style={styles.infoBox}>
                            <Info size={16} color="#71717A" />
                            <Text style={styles.infoText}>
                                Budgets help you track spending. We'll alert you when you reach 80% and 100% of your limit.
                            </Text>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#18181B', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%', borderWidth: 1, borderColor: '#FFFFFF10'
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#FFFFFF10'
    },
    modalTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
    closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center' },
    formScroll: { padding: 24 },
    formGroup: { marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '700', color: '#A1A1AA', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    input: {
        backgroundColor: '#27272A', borderRadius: 16, padding: 20, fontSize: 24, fontWeight: '700', color: '#FFFFFF', borderWidth: 1, borderColor: '#FFFFFF10'
    },
    categoryButton: {
        position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FFFFFF10', overflow: 'hidden'
    },
    categoryButtonGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    categoryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    categoryButtonText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    gridItem: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#27272A', borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF05' },
    gridText: { fontSize: 12, fontWeight: '600', color: '#A1A1AA' },

    frequencyRow: { flexDirection: 'row', gap: 12 },
    pillActive: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#6366F120', borderRadius: 20, borderWidth: 1, borderColor: '#6366F1' },
    pill: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#27272A', borderRadius: 20 },
    pillTextActive: { color: '#6366F1', fontWeight: '700', fontSize: 13 },
    pillText: { color: '#71717A', fontWeight: '600', fontSize: 13 },

    saveButton: { borderRadius: 20, overflow: 'hidden' },
    saveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 12 },
    saveButtonText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },

    bucketRow: { flexDirection: 'row', gap: 10 },
    bucketBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#27272A', borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF10' },
    bucketBtnSelected: { backgroundColor: '#3B82F620', borderColor: '#3B82F6' },
    bucketBtnText: { color: '#71717A', fontSize: 13, fontWeight: '600' },
    bucketBtnTextSelected: { color: '#3B82F6', fontWeight: '700' },

    infoBox: { flexDirection: 'row', gap: 12, backgroundColor: '#27272A50', padding: 16, borderRadius: 16, marginTop: 24 },
    infoText: { flex: 1, fontSize: 13, color: '#A1A1AA', lineHeight: 20 }
});
