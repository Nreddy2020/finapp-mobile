import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Switch, Image } from 'react-native';
import { X, DollarSign, Calendar, CreditCard, PiggyBank } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AllowanceManager({ visible, onClose }) {
    const [kids, setKids] = useState([
        { id: 1, name: 'Rohan', amount: 500, balance: 1250, autoPay: true, avatar: '👦' },
        { id: 2, name: 'Aisha', amount: 300, balance: 800, autoPay: false, avatar: '👧' },
    ]);

    const toggleAutoPay = (id) => {
        setKids(kids.map(kid => kid.id === id ? { ...kid, autoPay: !kid.autoPay } : kid));
    };

    const payAllowance = (id) => {
        setKids(kids.map(kid => kid.id === id ? { ...kid, balance: kid.balance + kid.amount } : kid));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <PiggyBank size={24} color="#6366F1" />
                            <Text style={styles.title}>Allowance Manager</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Automate weekly pocket money.</Text>

                    <View style={styles.list}>
                        {kids.map((kid) => (
                            <View key={kid.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.kidInfo}>
                                        <View style={styles.avatar}>
                                            <Text style={{ fontSize: 20 }}>{kid.avatar}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.kidName}>{kid.name}</Text>
                                            <Text style={styles.kidBalance}>Bal: ₹{kid.balance}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.allowanceBadge}>
                                        <Text style={styles.badgeText}>₹{kid.amount}/wk</Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.actions}>
                                    <View style={styles.setting}>
                                        <Text style={styles.settingLabel}>Auto-Pay</Text>
                                        <Switch
                                            value={kid.autoPay}
                                            onValueChange={() => toggleAutoPay(kid.id)}
                                            trackColor={{ false: '#3F3F46', true: '#6366F150' }}
                                            thumbColor={kid.autoPay ? '#6366F1' : '#A1A1AA'}
                                        />
                                    </View>
                                    <TouchableOpacity style={styles.payBtn} onPress={() => payAllowance(kid.id)}>
                                        <Text style={styles.payBtnText}>Pay Now</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '50%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    list: { gap: 16 },
    card: { backgroundColor: '#27272A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    kidInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3F3F46', alignItems: 'center', justifyContent: 'center' },
    kidName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    kidBalance: { color: '#A1A1AA', fontSize: 12 },
    allowanceBadge: { backgroundColor: '#6366F120', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { color: '#6366F1', fontWeight: '700', fontSize: 12 },
    divider: { height: 1, backgroundColor: '#FFFFFF10', marginBottom: 16 },
    actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    setting: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    settingLabel: { color: '#A1A1AA', fontSize: 12 },
    payBtn: { backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    payBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 }
});
