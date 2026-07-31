import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, TextInput, Share } from 'react-native';
import { X, ShoppingCart, Truck, Check, Copy } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function SupplierOrderModal({ visible, onClose, lowStockItems }) {
    const [selectedItems, setSelectedItems] = useState(
        lowStockItems.map(item => ({ ...item, orderQty: 10 })) // Default order qty
    );

    const toggleItem = (id) => {
        if (selectedItems.find(i => i.id === id)) {
            setSelectedItems(selectedItems.filter(i => i.id !== id));
        } else {
            const item = lowStockItems.find(i => i.id === id);
            if (item) setSelectedItems([...selectedItems, { ...item, orderQty: 10 }]);
        }
    };

    const updateQty = (id, qty) => {
        setSelectedItems(selectedItems.map(i => i.id === id ? { ...i, orderQty: parseInt(qty) || 0 } : i));
    };

    const generatePO = async () => {
        const poText = `
📦 *PURCHASE ORDER Request*
To: Supplier
Date: ${new Date().toLocaleDateString()}

Please send the following items urgently:

${selectedItems.map(i => `- ${i.name}: ${i.orderQty} ${i.unit}`).join('\n')}

📍 Deliver to: Laxmi General Store, Main Market.
📞 Contact: 9876543210
        `.trim();

        try {
            await Share.share({
                message: poText,
                title: 'Purchase Order'
            });
            onClose();
        } catch (error) {
            alert('PO Copied to clipboard!');
            onClose();
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Truck size={24} color="#EC4899" />
                            <Text style={styles.title}>Supplier AI</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        {lowStockItems.length} items are running low. Select items to reorder.
                    </Text>

                    <ScrollView style={styles.list}>
                        {lowStockItems.map(item => {
                            const isSelected = selectedItems.find(i => i.id === item.id);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                                    onPress={() => toggleItem(item.id)}
                                >
                                    <View style={styles.itemRow}>
                                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                            {isSelected && <Check size={12} color="#FFF" />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <Text style={styles.stockText}>Current Stock: {item.stock} {item.unit}</Text>
                                        </View>

                                        {isSelected && (
                                            <View style={styles.qtyBox}>
                                                <Text style={styles.qtyLabel}>Qty</Text>
                                                <TextInput
                                                    style={styles.qtyInput}
                                                    value={String(isSelected.orderQty)}
                                                    onChangeText={(t) => updateQty(item.id, t)}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.footer}>
                        <View>
                            <Text style={styles.summaryLabel}>Total Items</Text>
                            <Text style={styles.summaryValue}>{selectedItems.length}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.generateBtn, selectedItems.length === 0 && styles.disabledBtn]}
                            onPress={generatePO}
                            disabled={selectedItems.length === 0}
                        >
                            <ShoppingCart size={20} color="#FFF" />
                            <Text style={styles.generateBtnText}>Generate PO (WhatsApp)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '80%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', marginBottom: 20 },
    list: { flex: 1 },
    itemCard: { padding: 16, borderRadius: 12, backgroundColor: '#27272A', marginBottom: 10, borderWidth: 1, borderColor: '#FFFFFF10' },
    itemCardSelected: { borderColor: '#EC4899', backgroundColor: '#EC489910' },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#52525B', alignItems: 'center', justifyContent: 'center' },
    checkboxSelected: { backgroundColor: '#EC4899', borderColor: '#EC4899' },
    itemName: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    stockText: { color: '#EF4444', fontSize: 12 },
    qtyBox: { alignItems: 'center' },
    qtyLabel: { color: '#A1A1AA', fontSize: 10, marginBottom: 2 },
    qtyInput: { backgroundColor: '#000', color: '#FFF', width: 50, padding: 4, borderRadius: 6, textAlign: 'center', fontSize: 14, fontWeight: '700' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#FFFFFF10' },
    summaryLabel: { color: '#A1A1AA', fontSize: 12 },
    summaryValue: { color: '#FFF', fontSize: 20, fontWeight: '700' },
    generateBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#EC4899', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    disabledBtn: { backgroundColor: '#52525B' },
    generateBtnText: { color: '#FFF', fontWeight: '700' }
});
