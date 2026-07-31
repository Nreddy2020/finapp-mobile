import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { X, Store, User, Handshake, Plane, ChevronRight, Check } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function CreateBookModal({ visible, onClose, onCreate, editMode = false, initialData = null }) {
    const [name, setName] = useState(initialData?.name || '');
    const [selectedType, setSelectedType] = useState(initialData?.type || 'shop');

    const TEMPLATES = [
        { id: 'shop', label: 'Shop Register', desc: 'Sales, Inventory, Wages', icon: Store, color: '#F59E0B' },
        { id: 'personal', label: 'Personal Pocket', desc: 'Food, Transport, Fun', icon: User, color: '#10B981' },
        { id: 'credit', label: 'Udhaar / Credit', desc: 'Track Lending & Borrowing', icon: Handshake, color: '#EF4444' },
        { id: 'trip', label: 'Trip Fund', desc: 'Multi-Currency Travel', icon: Plane, color: '#3B82F6' },
    ];

    const handleCreate = () => {
        if (!name.trim()) return;

        if (editMode && initialData) {
            // Update existing book
            const updatedBook = {
                ...initialData,
                name: name,
                type: selectedType,
                last_updated: new Date().toLocaleDateString()
            };
            onCreate(updatedBook);
        } else {
            // Create new book
            const newBook = {
                id: Date.now().toString(),
                name: name,
                type: selectedType,
                balance: 0,
                total_in: 0,
                total_out: 0,
                transactions: [],
                last_updated: 'Just now',
                currency: selectedType === 'trip' ? '$' : '₹'
            };
            onCreate(newBook);
        }

        setName('');
        setSelectedType('shop');
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{editMode ? 'Edit Cashbook' : 'New Cashbook'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>BOOK NAME</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. My Bakery, Goa Trip"
                            placeholderTextColor="#52525B"
                            value={name}
                            onChangeText={setName}
                            autoFocus
                        />

                        <Text style={[styles.label, { marginTop: 24 }]}>SELECT TEMPLATE</Text>
                        <View style={styles.grid}>
                            {TEMPLATES.map((template) => {
                                const Icon = template.icon;
                                const isSelected = selectedType === template.id;
                                return (
                                    <TouchableOpacity
                                        key={template.id}
                                        style={[styles.card, isSelected && { borderColor: template.color, backgroundColor: `${template.color}10` }]}
                                        onPress={() => setSelectedType(template.id)}
                                    >
                                        <View style={[styles.iconBox, { backgroundColor: `${template.color}20` }]}>
                                            <Icon size={24} color={template.color} />
                                        </View>
                                        <View style={styles.cardContent}>
                                            <Text style={[styles.cardTitle, isSelected && { color: template.color }]}>{template.label}</Text>
                                            <Text style={styles.cardDesc}>{template.desc}</Text>
                                        </View>
                                        {isSelected && (
                                            <View style={[styles.checkCircle, { backgroundColor: template.color }]}>
                                                <Check size={12} color="#000" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.createBtn, !name.trim() && styles.disabledBtn]}
                            onPress={handleCreate}
                            disabled={!name.trim()}
                        >
                            <Text style={styles.createBtnText}>Create Cashbook</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContainer: { height: '80%', backgroundColor: '#09090B', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#FFFFFF10' },
    title: { fontSize: 20, fontWeight: '800', color: '#fff' },
    closeBtn: { padding: 8, backgroundColor: '#27272A', borderRadius: 20 },
    content: { flex: 1, padding: 24 },
    label: { color: '#71717A', fontSize: 12, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
    input: { backgroundColor: '#18181B', color: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46', fontSize: 16, fontWeight: '600' },
    grid: { gap: 12 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#18181B', borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF08', gap: 16 },
    iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    cardContent: { flex: 1 },
    cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
    cardDesc: { color: '#71717A', fontSize: 13 },
    checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#FFFFFF10' },
    createBtn: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 16, alignItems: 'center' },
    disabledBtn: { backgroundColor: '#27272A', opacity: 0.5 },
    createBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
});
