import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { X, Award, Filter, Search, ChevronRight } from 'lucide-react-native';

export default function ScholarshipFinder({ visible, onClose }) {
    const [scholarships, setScholarships] = useState([
        { id: 1, name: 'Merit Excellence Grant', amount: '₹1,00,000', category: 'Merit', deadline: 'Due in 5 days' },
        { id: 2, name: 'Tech Future Award', amount: '₹50,000', category: 'STEM', deadline: 'Due in 12 days' },
        { id: 3, name: 'Sports Achiever Fund', amount: '₹75,000', category: 'Sports', deadline: 'Open' },
        { id: 4, name: 'Need-Based Support', amount: '₹1,50,000', category: 'Financial', deadline: 'Closing Soon' },
    ]);

    const [filter, setFilter] = useState('All');

    const filteredList = filter === 'All' ? scholarships : scholarships.filter(s => s.category === filter);

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Award size={24} color="#F59E0B" />
                            <Text style={styles.title}>Scholarship Finder</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    {/* Search & Filter */}
                    <View style={styles.searchRow}>
                        <View style={styles.searchBar}>
                            <Search size={16} color="#A1A1AA" />
                            <TextInput placeholder="Search grants..." placeholderTextColor="#52525B" style={styles.input} />
                        </View>
                        <TouchableOpacity style={styles.filterBtn}>
                            <Filter size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Filter Pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll} contentContainerStyle={{ gap: 8 }}>
                        {['All', 'Merit', 'STEM', 'Sports', 'Financial'].map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.pill, filter === cat && styles.activePill]}
                                onPress={() => setFilter(cat)}
                            >
                                <Text style={[styles.pillText, filter === cat && styles.activePillText]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <ScrollView style={styles.list}>
                        {filteredList.map((item) => (
                            <View key={item.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.name}>{item.name}</Text>
                                        <Text style={styles.category}>{item.category} • {item.deadline}</Text>
                                    </View>
                                    <View style={styles.amountBadge}>
                                        <Text style={styles.amount}>{item.amount}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.applyBtn}>
                                    <Text style={styles.applyText}>Apply Now</Text>
                                    <ChevronRight size={14} color="#FFF" />
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
    container: { backgroundColor: '#18181B', height: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    searchRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#27272A', paddingHorizontal: 12, borderRadius: 12, height: 44 },
    input: { flex: 1, color: '#FFF' },
    filterBtn: { width: 44, height: 44, backgroundColor: '#3F3F46', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    pillsScroll: { maxHeight: 36, marginBottom: 20 },
    pill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#FFFFFF10' },
    activePill: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
    pillText: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
    activePillText: { color: '#000' },
    list: { flex: 1 },
    card: { backgroundColor: '#27272A', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF08' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    name: { color: '#FFF', fontWeight: '700', fontSize: 16, marginBottom: 4 },
    category: { color: '#A1A1AA', fontSize: 12 },
    amountBadge: { backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    amount: { color: '#10B981', fontWeight: '700', fontSize: 14 },
    applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F59E0B', padding: 12, borderRadius: 12 },
    applyText: { color: '#000', fontWeight: '700', fontSize: 14 }
});
