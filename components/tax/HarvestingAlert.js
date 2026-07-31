import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TrendingDown } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function HarvestingAlert() {
    const [harvestingOpp, setHarvestingOpp] = useState([
        { ticker: 'NIFTYBEES', loss: 5200, saveTax: 1560 },
        { ticker: 'TATASTEEL', loss: 2100, saveTax: 630 }
    ]);

    return (
        <LuxuryCard style={styles.section} index={1}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <TrendingDown size={16} color="#EF4444" />
                </View>
                <View>
                    <Text style={styles.title}>Tax Harvesting</Text>
                    <Text style={styles.subtitle}>Book losses to offset gains</Text>
                </View>
            </View>

            {harvestingOpp.map((item, idx) => (
                <View key={idx} style={[
                    styles.itemRow,
                    idx === harvestingOpp.length - 1 && styles.lastItem
                ]}>
                    <View>
                        <Text style={styles.ticker}>{item.ticker}</Text>
                        <Text style={styles.lossText}>Unrealized Loss: -₹{item.loss}</Text>
                    </View>
                    <Pressable
                        onPress={() => alert(`Sell order placed for ${item.ticker} to save ₹${item.saveTax} in taxes.`)}
                        style={styles.sellButton}
                    >
                        <Text style={styles.sellButtonText}>SELL & SAVE ₹{item.saveTax}</Text>
                    </Pressable>
                </View>
            ))}
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: 24, marginBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 12 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF10' },
    lastItem: { marginBottom: 0, paddingBottom: 0, borderBottomWidth: 0 },
    ticker: { color: '#FFF', fontWeight: '700' },
    lossText: { color: '#EF4444', fontSize: 12 },
    sellButton: { backgroundColor: '#EF444420', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#EF444440' },
    sellButtonText: { color: '#EF4444', fontWeight: '700', fontSize: 11 }
});
