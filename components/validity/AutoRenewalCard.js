import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AlertCircle, ArrowRight } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function AutoRenewalCard({ item }) {
    if (!item) return null;

    const renewalPrice = item.renewalPrice || 12000; // Mock price if missing

    return (
        <LuxuryCard style={styles.section} index={0}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: '#EF444420' }]}>
                    <AlertCircle size={16} color="#EF4444" />
                </View>
                <View>
                    <Text style={styles.title}>Action Required</Text>
                    <Text style={styles.subtitle}>Immediate renewal needed</Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.row}>
                    <View>
                        <Text style={styles.itemName}>{item.item}</Text>
                        <Text style={styles.expiryText}>Expires in {item.days_left} days</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>Renewal Cost</Text>
                        <Text style={styles.price}>₹{renewalPrice.toLocaleString()}</Text>
                    </View>
                </View>

                <Pressable
                    style={styles.renewBtn}
                    onPress={() => alert(`Redirecting to insurer portal for ${item.item}...`)}
                >
                    <Text style={styles.renewText}>Renew Now</Text>
                    <ArrowRight size={14} color="#FFF" />
                </Pressable>
            </View>
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 24, paddingHorizontal: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 12 },
    content: { backgroundColor: '#EF444410', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EF444430' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    itemName: { color: '#FFF', fontWeight: '700', fontSize: 16, marginBottom: 4 },
    expiryText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
    label: { color: '#A1A1AA', fontSize: 11 },
    price: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    renewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EF4444', paddingVertical: 12, borderRadius: 12 },
    renewText: { color: '#FFF', fontWeight: '700', fontSize: 14 }
});
