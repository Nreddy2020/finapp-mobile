import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { X, Save, Trash2, Target, Calendar, Wallet, Car, Home, Plane, Gift, Smartphone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GOAL_ICONS = [
    { icon: Target, label: 'General', color: '#14B8A6' },
    { icon: Car, label: 'Vehicle', color: '#3B82F6' },
    { icon: Home, label: 'Home', color: '#8B5CF6' },
    { icon: Plane, label: 'Travel', color: '#F59E0B' },
    { icon: Smartphone, label: 'Gadget', color: '#EC4899' },
    { icon: Gift, label: 'Gift', color: '#EF4444' },
    { icon: Wallet, label: 'Emergency', color: '#10B981' },
];

export default function AddGoalModal({ visible, onClose, onSave, onDelete, editingGoal = null }) {
    const [name, setName] = useState(editingGoal?.name || '');
    const [targetAmount, setTargetAmount] = useState(editingGoal?.target_amount?.toString() || '');
    const [currentAmount, setCurrentAmount] = useState(editingGoal?.current_amount?.toString() || '0');
    const [selectedIconIndex, setSelectedIconIndex] = useState(0);

    useEffect(() => {
        if (editingGoal) {
            setName(editingGoal.name);
            setTargetAmount(editingGoal.target_amount.toString());
            setCurrentAmount(editingGoal.current_amount.toString());
            // Logic to match existing icon would go here, defaulting to 0 for now
        } else {
            resetForm();
        }
    }, [editingGoal]);

    const handleSave = () => {
        if (!name.trim() || !targetAmount.trim()) {
            alert('Please set a goal name and target amount');
            return;
        }

        const goalData = {
            id: editingGoal?.id || Date.now(),
            name: name.trim(),
            target_amount: parseFloat(targetAmount),
            current_amount: parseFloat(currentAmount),
            icon: 'Target', // Placeholder, could save actual icon name
            updatedAt: new Date().toISOString()
        };

        onSave(goalData);
        if (!editingGoal) resetForm();
    };

    const handleDelete = () => {
        if (onDelete && editingGoal) {
            onDelete(editingGoal.id);
        }
    };

    const resetForm = () => {
        setName('');
        setTargetAmount('');
        setCurrentAmount('0');
        setSelectedIconIndex(0);
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editingGoal ? 'Edit Savings Goal' : 'New Savings Goal'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                        {/* Icon Selection */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                            {GOAL_ICONS.map((item, index) => {
                                const Icon = item.icon;
                                const isSelected = selectedIconIndex === index;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.iconButton, isSelected && { backgroundColor: item.color + '20', borderColor: item.color }]}
                                        onPress={() => setSelectedIconIndex(index)}
                                    >
                                        <Icon size={20} color={isSelected ? item.color : '#71717A'} />
                                        <Text style={[styles.iconLabel, isSelected && { color: item.color }]}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Name Input */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Goal Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. New Car, Europe Trip"
                                placeholderTextColor="#71717A"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* Target Amount */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Target Amount (₹)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                placeholderTextColor="#71717A"
                                value={targetAmount}
                                onChangeText={setTargetAmount}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Current Progress */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Current Savings (₹)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                placeholderTextColor="#71717A"
                                value={currentAmount}
                                onChangeText={setCurrentAmount}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <LinearGradient
                                colors={['#14B8A6', '#0D9488']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.saveButtonGradient}
                            >
                                <Save size={20} color="#FFFFFF" strokeWidth={2.5} />
                                <Text style={styles.saveButtonText}>
                                    {editingGoal ? 'Update Goal' : 'Create Goal'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Delete Button */}
                        {editingGoal && (
                            <TouchableOpacity
                                style={[styles.saveButton, { marginTop: 16 }]}
                                onPress={handleDelete}
                            >
                                <View style={[styles.saveButtonGradient, { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#EF444450', borderRadius: 20 }]}>
                                    <Trash2 size={20} color="#EF4444" strokeWidth={2.5} />
                                    <Text style={[styles.saveButtonText, { color: '#EF4444' }]}>
                                        Delete Goal
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

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
        backgroundColor: '#27272A', borderRadius: 16, padding: 20, fontSize: 18, fontWeight: '600', color: '#FFFFFF', borderWidth: 1, borderColor: '#FFFFFF10'
    },
    iconScroll: { marginBottom: 24, paddingBottom: 8 },
    iconButton: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#27272A', marginRight: 12, gap: 8, borderWidth: 1, borderColor: '#FFFFFF10' },
    iconLabel: { fontSize: 12, fontWeight: '600', color: '#71717A' },

    saveButton: { borderRadius: 20, overflow: 'hidden' },
    saveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 12 },
    saveButtonText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
});
