import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Switch } from 'react-native';
import { X, Save, Trash2, Bell, Calendar, CreditCard, Zap, Smartphone, Wifi, Tv } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BILL_CATEGORIES = [
    { icon: Zap, label: 'Utilities', color: '#F59E0B' },
    { icon: Wifi, label: 'Internet', color: '#3B82F6' },
    { icon: Smartphone, label: 'Mobile', color: '#10B981' },
    { icon: Tv, label: 'Entertainment', color: '#8B5CF6' },
    { icon: CreditCard, label: 'Loan/EMI', color: '#EC4899' },
    { icon: Bell, label: 'Other', color: '#71717A' },
];

export default function AddBillModal({ visible, onClose, onSave, onDelete, editingBill = null }) {
    const [name, setName] = useState(editingBill?.name || '');
    const [amount, setAmount] = useState(editingBill?.amount?.toString() || '');
    const [dueDate, setDueDate] = useState(editingBill?.due_date ? new Date(editingBill.due_date).getDate().toString() : '');
    const [isAutoPay, setIsAutoPay] = useState(editingBill?.auto_pay || false);
    const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);

    useEffect(() => {
        if (editingBill) {
            setName(editingBill.name);
            setAmount(editingBill.amount.toString());
            // Extract day from date string if possible, or just use the field if we stored day separately
            // For simplicity, assuming due_date is ISO string, getting the day.
            const date = new Date(editingBill.due_date);
            setDueDate(date.getDate().toString());
            setIsAutoPay(editingBill.auto_pay || false);
        } else {
            resetForm();
        }
    }, [editingBill]);

    const handleSave = () => {
        if (!name.trim() || !amount.trim() || !dueDate.trim()) {
            alert('Please fill in name, amount and due day');
            return;
        }

        const day = parseInt(dueDate);
        if (isNaN(day) || day < 1 || day > 31) {
            alert('Due day must be between 1 and 31');
            return;
        }

        // Construct a due date for the current/next month
        const today = new Date();
        let targetDate = new Date(today.getFullYear(), today.getMonth(), day);
        if (targetDate < today) {
            targetDate = new Date(today.getFullYear(), today.getMonth() + 1, day);
        }

        const billData = {
            id: editingBill?.id || Date.now(),
            name: name.trim(),
            amount: parseFloat(amount),
            due_date: targetDate.toISOString(),
            auto_pay: isAutoPay,
            paid: editingBill?.paid || false,
            updatedAt: new Date().toISOString()
        };

        onSave(billData);
        if (!editingBill) resetForm();
    };

    const handleDelete = () => {
        if (onDelete && editingBill) {
            onDelete(editingBill.id);
        }
    };

    const resetForm = () => {
        setName('');
        setAmount('');
        setDueDate('');
        setIsAutoPay(false);
        setSelectedCategoryIndex(0);
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editingBill ? 'Edit Bill Reminder' : 'Add Bill Reminder'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                        {/* Category/Icon Selection */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                            {BILL_CATEGORIES.map((item, index) => {
                                const Icon = item.icon;
                                const isSelected = selectedCategoryIndex === index;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.iconButton, isSelected && { backgroundColor: item.color + '20', borderColor: item.color }]}
                                        onPress={() => setSelectedCategoryIndex(index)}
                                    >
                                        <Icon size={20} color={isSelected ? item.color : '#71717A'} />
                                        <Text style={[styles.iconLabel, isSelected && { color: item.color }]}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Name Input */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Bill Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Electric Bill, Rent"
                                placeholderTextColor="#71717A"
                                value={name}
                                onChangeText={setName}
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

                        {/* Due Day */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Due Day of Month</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 5 (for 5th of every month)"
                                placeholderTextColor="#71717A"
                                value={dueDate}
                                onChangeText={setDueDate}
                                keyboardType="numeric"
                                maxLength={2}
                            />
                        </View>

                        {/* Auto Pay Toggle */}
                        <View style={styles.toggleRow}>
                            <Text style={styles.toggleLabel}>Auto-Pay Enabled</Text>
                            <Switch
                                trackColor={{ false: "#27272A", true: "#10B981" }}
                                thumbColor={isAutoPay ? "#FFFFFF" : "#f4f3f4"}
                                onValueChange={setIsAutoPay}
                                value={isAutoPay}
                            />
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <LinearGradient
                                colors={['#F59E0B', '#D97706']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.saveButtonGradient}
                            >
                                <Save size={20} color="#FFFFFF" strokeWidth={2.5} />
                                <Text style={styles.saveButtonText}>
                                    {editingBill ? 'Update Bill' : 'Add Bill'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Delete Button */}
                        {editingBill && (
                            <TouchableOpacity
                                style={[styles.saveButton, { marginTop: 16 }]}
                                onPress={handleDelete}
                            >
                                <View style={[styles.saveButtonGradient, { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#EF444450', borderRadius: 20 }]}>
                                    <Trash2 size={20} color="#EF4444" strokeWidth={2.5} />
                                    <Text style={[styles.saveButtonText, { color: '#EF4444' }]}>
                                        Delete Bill
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

    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, backgroundColor: '#27272A', padding: 16, borderRadius: 16 },
    toggleLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    saveButton: { borderRadius: 20, overflow: 'hidden' },
    saveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 12 },
    saveButtonText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
});
