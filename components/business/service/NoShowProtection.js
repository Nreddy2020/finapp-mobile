import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { X, Shield, Lock, CreditCard, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function NoShowProtection({ visible, onClose }) {
    const [enabled, setEnabled] = useState(true);
    const [depositAmount, setDepositAmount] = useState('50');

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Shield size={24} color="#3B82F6" />
                            <Text style={styles.title}>No-Show Protection</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Protect your revenue by requiring upfront deposits.</Text>

                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.iconBox}>
                                <Lock size={20} color="#3B82F6" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>Require Deposit</Text>
                                <Text style={styles.optionDesc}>Charge a fee for late cancellations.</Text>
                            </View>
                            <Switch
                                value={enabled}
                                onValueChange={setEnabled}
                                trackColor={{ false: '#3F3F46', true: '#3B82F650' }}
                                thumbColor={enabled ? '#3B82F6' : '#A1A1AA'}
                            />
                        </View>
                    </View>

                    {enabled && (
                        <View style={styles.statsContainer}>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>Revenue Protected</Text>
                                <Text style={styles.statValue}>₹12,500</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>No-Show Rate</Text>
                                <Text style={styles.statValue}>1.2%</Text>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={styles.policyBtn}>
                        <LinearGradient
                            colors={['#27272A', '#27272A']}
                            style={styles.btnGradient}
                        >
                            <CreditCard size={18} color="#A1A1AA" />
                            <Text style={styles.btnText}>Edit Cancellation Policy</Text>
                            <ChevronRight size={18} color="#A1A1AA" style={{ marginLeft: 'auto' }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    card: { backgroundColor: '#27272A', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F620', borderRadius: 10 },
    optionTitle: { color: '#FFF', fontWeight: '700', fontSize: 16, marginBottom: 4 },
    optionDesc: { color: '#A1A1AA', fontSize: 12 },
    statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: '#27272A', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08' },
    statLabel: { color: '#A1A1AA', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { color: '#FFF', fontSize: 20, fontWeight: '800' },
    policyBtn: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF10' },
    btnGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    btnText: { color: '#A1A1AA', fontWeight: '600', fontSize: 14 }
});
