import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { X, TrendingUp, AlertTriangle, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function DynamicPricing({ visible, onClose }) {
    const [applied, setApplied] = useState(false);

    const applyPricing = () => {
        setApplied(true);
        setTimeout(() => {
            alert('Rates updated successfully across all channels.');
            setApplied(false);
            onClose();
        }, 500);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Zap size={24} color="#F59E0B" />
                            <Text style={styles.title}>Dynamic Pricing AI</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>AI suggests rate adjustments based on local demand.</Text>

                    <View style={styles.insightCard}>
                        <View style={styles.insightHeader}>
                            <TrendingUp size={20} color="#10B981" />
                            <Text style={styles.insightTitle}>High Demand Detected</Text>
                        </View>
                        <Text style={styles.insightText}>Local events causing 40% surge in bookings for this weekend. Competitors have raised rates by ~15%.</Text>
                    </View>

                    <View style={styles.comparison}>
                        <View style={styles.rateBox}>
                            <Text style={styles.rateLabel}>Current Rate</Text>
                            <Text style={styles.oldPrice}>₹4,500</Text>
                        </View>
                        <View style={styles.arrow}>
                            <TrendingUp size={24} color="#F59E0B" />
                        </View>
                        <View style={[styles.rateBox, styles.newRateBox]}>
                            <Text style={[styles.rateLabel, { color: '#F59E0B' }]}>Suggested</Text>
                            <Text style={styles.newPrice}>₹5,200</Text>
                            <Text style={styles.surgeText}>+15% Surge</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.applyBtn} onPress={applyPricing}>
                        <LinearGradient
                            colors={['#F59E0B', '#D97706']}
                            style={styles.btnGradient}
                        >
                            <Zap size={20} color="#FFF" />
                            <Text style={styles.btnText}>Apply Surge Pricing</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    insightCard: { backgroundColor: '#10B98110', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#10B98120' },
    insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    insightTitle: { color: '#10B981', fontWeight: '700', fontSize: 14 },
    insightText: { color: '#A1A1AA', fontSize: 13, lineHeight: 20 },
    comparison: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
    rateBox: { flex: 1, backgroundColor: '#27272A', padding: 16, borderRadius: 16, alignItems: 'center' },
    newRateBox: { backgroundColor: '#F59E0B10', borderWidth: 1, borderColor: '#F59E0B30' },
    rateLabel: { fontSize: 11, color: '#71717A', textTransform: 'uppercase', marginBottom: 4, fontWeight: '700' },
    oldPrice: { fontSize: 20, fontWeight: '700', color: '#FFF', textDecorationLine: 'line-through', opacity: 0.5 },
    newPrice: { fontSize: 24, fontWeight: '900', color: '#F59E0B' },
    surgeText: { fontSize: 10, color: '#F59E0B', fontWeight: '700', marginTop: 4 },
    arrow: { paddingHorizontal: 12 },
    applyBtn: { borderRadius: 16, overflow: 'hidden', height: 56 },
    btnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});
