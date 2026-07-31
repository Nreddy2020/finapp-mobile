import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { X, Utensils, Sparkles, Filter, Leaf } from 'lucide-react-native';

export default function SmartMenu({ visible, onClose }) {
    const [veganFilter, setVeganFilter] = useState(false);
    const [menu, setMenu] = useState([
        { id: 1, name: 'Butter Chicken', type: 'chicken', tags: ['Spicy'] },
        { id: 2, name: 'Paneer Tikka', type: 'veg', tags: ['Vegan Option', 'GF'] },
        { id: 3, name: 'Dal Makhani', type: 'veg', tags: ['GF'] },
        { id: 4, name: 'Vegan Salad', type: 'veg', tags: ['Vegan', 'Healthy'] },
    ]);

    const filteredMenu = veganFilter
        ? menu.filter(m => m.tags.includes('Vegan') || m.tags.includes('Vegan Option'))
        : menu;

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Utensils size={24} color="#F97316" />
                            <Text style={styles.title}>Smart Menu AI</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Dynamic filtering and dietary personalization.</Text>

                    <View style={styles.filterRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Leaf size={18} color={veganFilter ? "#10B981" : "#71717A"} />
                            <Text style={[styles.filterLabel, veganFilter && { color: '#10B981' }]}>Vegan Only</Text>
                        </View>
                        <Switch
                            value={veganFilter}
                            onValueChange={setVeganFilter}
                            trackColor={{ false: '#3F3F46', true: '#10B98150' }}
                            thumbColor={veganFilter ? '#10B981' : '#A1A1AA'}
                        />
                    </View>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {filteredMenu.map((item) => (
                            <View key={item.id} style={styles.card}>
                                <View>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <View style={styles.tags}>
                                        {item.tags.map((tag, idx) => (
                                            <View key={idx} style={styles.tagBadge}>
                                                <Text style={styles.tagText}>{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.aiBtn}>
                                    <Sparkles size={14} color="#F97316" />
                                    <Text style={styles.aiText}>Desc</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, backgroundColor: '#27272A', padding: 16, borderRadius: 12 },
    filterLabel: { color: '#A1A1AA', fontWeight: '700', fontSize: 14 },
    list: { flex: 1 },
    card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27272A', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF08' },
    itemName: { color: '#FFF', fontWeight: '700', fontSize: 16, marginBottom: 6 },
    tags: { flexDirection: 'row', gap: 6 },
    tagBadge: { backgroundColor: '#3F3F46', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    tagText: { color: '#A1A1AA', fontSize: 10, fontWeight: '600' },
    aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9731620', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    aiText: { color: '#F97316', fontSize: 11, fontWeight: '700' }
});
