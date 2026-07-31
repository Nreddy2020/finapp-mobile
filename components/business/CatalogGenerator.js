import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Image, Share } from 'react-native';
import { X, Share2, Grid, CheckCircle2 } from 'lucide-react-native';

export default function CatalogGenerator({ visible, onClose, products }) {
    const [selectedProducts, setSelectedProducts] = useState([]);

    const toggleProduct = (id) => {
        if (selectedProducts.includes(id)) {
            setSelectedProducts(selectedProducts.filter(pid => pid !== id));
        } else {
            setSelectedProducts([...selectedProducts, id]);
        }
    };

    const selectAll = () => {
        if (selectedProducts.length === products.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(products.map(p => p.id));
        }
    };

    const shareCatalog = async () => {
        const catalogItems = products.filter(p => selectedProducts.includes(p.id));
        const catalogText = `
🛍️ *Laxmi General Store - Product Catalog*
Here are our latest products & prices:

${catalogItems.map(p => `🔹 *${p.name}*
   Price: ₹${p.price} / ${p.unit}
   ${p.stock > 0 ? '✅ In Stock' : '❌ Out of Stock'}`).join('\n\n')}

📍 Order via WhatsApp reply!
        `.trim();

        try {
            await Share.share({
                message: catalogText,
                title: 'Product Catalog'
            });
            onClose();
        } catch (error) {
            alert('Catalog copied!');
            onClose();
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Grid size={24} color="#10B981" />
                            <Text style={styles.title}>WhatsApp Catalog</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={selectAll} style={styles.selectAllBtn}>
                        <Text style={styles.selectAllText}>
                            {selectedProducts.length === products.length ? 'Deselect All' : 'Select All'}
                        </Text>
                    </TouchableOpacity>

                    <ScrollView style={styles.grid} contentContainerStyle={styles.gridContent}>
                        {products.map(item => {
                            const isSelected = selectedProducts.includes(item.id);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.card, isSelected && styles.cardSelected]}
                                    onPress={() => toggleProduct(item.id)}
                                >
                                    <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                                        {isSelected && <CheckCircle2 size={16} color="#FFF" />}
                                    </View>
                                    <View style={styles.cardIcon}>
                                        <Text style={{ fontSize: 24 }}>📦</Text>
                                    </View>
                                    <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                                    <Text style={styles.price}>₹{item.price}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.footer}>
                        <View>
                            <Text style={styles.summaryLabel}>Selected</Text>
                            <Text style={styles.summaryValue}>{selectedProducts.length} Items</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.shareBtn, selectedProducts.length === 0 && styles.disabledBtn]}
                            onPress={shareCatalog}
                            disabled={selectedProducts.length === 0}
                        >
                            <Share2 size={20} color="#FFF" />
                            <Text style={styles.shareBtnText}>Share on WhatsApp</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '85%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    selectAllBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#27272A', borderRadius: 20, marginBottom: 16 },
    selectAllText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    grid: { flex: 1 },
    gridContent: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 20 },
    card: { width: '31%', backgroundColor: '#27272A', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF10', alignItems: 'center' },
    cardSelected: { borderColor: '#10B981', backgroundColor: '#10B98110' },
    checkCircle: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#52525B', alignItems: 'center', justifyContent: 'center' },
    checkCircleSelected: { backgroundColor: '#10B981', borderColor: '#10B981' },
    cardIcon: { width: 40, height: 40, backgroundColor: '#000', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    name: { color: '#FFF', fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 4, height: 30 },
    price: { color: '#10B981', fontSize: 12, fontWeight: '700' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#FFFFFF10' },
    summaryLabel: { color: '#A1A1AA', fontSize: 12 },
    summaryValue: { color: '#FFF', fontSize: 20, fontWeight: '700' },
    shareBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    disabledBtn: { backgroundColor: '#52525B' },
    shareBtnText: { color: '#FFF', fontWeight: '700' }
});
