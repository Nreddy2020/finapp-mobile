import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { Gift } from 'lucide-react-native';

export default function RewardsStore() {
    const rewards = [
        { id: 1, name: 'Premium Theme', cost: 500, icon: '🎨' },
        { id: 2, name: 'Export Data to CSV', cost: 1000, icon: '📊' },
        { id: 3, name: '1-on-1 Advisor Call', cost: 5000, icon: '📞' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.balance}>
                <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
                <Text style={styles.balanceAmount}>0 PTS</Text>
            </View>

            {rewards.map((item, index) => (
                <LuxuryCard key={item.id} index={index} style={styles.card}>
                    <Text style={styles.icon}>{item.icon}</Text>
                    <View style={styles.details}>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.cost}>{item.cost} PTS</Text>
                    </View>
                    <Pressable style={styles.btn}>
                        <Text style={styles.btnText}>Redeem</Text>
                    </Pressable>
                </LuxuryCard>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 16 },
    balance: { padding: 16, alignItems: 'center', marginBottom: 8 },
    balanceLabel: { color: '#71717A', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    balanceAmount: { color: '#FFF', fontSize: 24, fontWeight: '900' },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
    icon: { fontSize: 24 },
    details: { flex: 1 },
    name: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    cost: { color: '#F59E0B', fontWeight: '600' },
    btn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFFFFF10', borderRadius: 20 },
    btnText: { color: '#FFF', fontSize: 12, fontWeight: '700' }
});
