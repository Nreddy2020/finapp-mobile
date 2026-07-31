import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Cloud, ShieldCheck, AlertCircle, Upload } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function WarrantyCloud() {
    const [warranties] = useState([
        { id: 1, item: 'MacBook Pro', expires: '2025-12-01', status: 'active' },
        { id: 2, item: 'Sony XM5', expires: '2024-02-15', status: 'expiring_soon' },
        { id: 3, item: 'Dyson Airwrap', expires: '2023-10-10', status: 'expired' },
    ]);

    return (
        <LuxuryCard style={styles.section} index={1}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
                    <Cloud size={16} color="#3B82F6" />
                </View>
                <View>
                    <Text style={styles.title}>Warranty Cloud</Text>
                    <Text style={styles.subtitle}>Digital receipts & coverage</Text>
                </View>
                <Pressable style={styles.uploadBtn}>
                    <Upload size={14} color="#3B82F6" />
                </Pressable>
            </View>

            <View style={{ gap: 12 }}>
                {warranties.map((w) => (
                    <View key={w.id} style={styles.row}>
                        <View style={styles.itemLeft}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(w.status) }]} />
                            <View>
                                <Text style={styles.itemName}>{w.item}</Text>
                                <Text style={styles.expiryText}>
                                    {w.status === 'expired' ? 'Expired on' : 'Valid until'} {w.expires}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.badge, { backgroundColor: getStatusColor(w.status) + '20', borderColor: getStatusColor(w.status) + '40' }]}>
                            <Text style={[styles.badgeText, { color: getStatusColor(w.status) }]}>
                                {w.status === 'expiring_soon' ? 'EXPIRING' : w.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        </LuxuryCard>
    );
}

function getStatusColor(status) {
    switch (status) {
        case 'active': return '#10B981';
        case 'expiring_soon': return '#F59E0B';
        case 'expired': return '#EF4444';
        default: return '#71717A';
    }
}

const styles = StyleSheet.create({
    section: { marginBottom: 24, paddingHorizontal: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 12 },
    uploadBtn: { marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, backgroundColor: '#3B82F620', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#3B82F640' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27272A', padding: 12, borderRadius: 12 },
    itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    itemName: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    expiryText: { color: '#A1A1AA', fontSize: 11 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    badgeText: { fontSize: 10, fontWeight: '700' }
});
