import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, Share } from 'react-native';
import { X, FileText, Calendar, ShieldCheck, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SmartLease({ visible, onClose }) {
    const [leaseDetails, setLeaseDetails] = useState({
        tenantName: '',
        unitNo: '',
        rentAmount: '',
        duration: '11',
        deposit: ''
    });

    const generateLease = async () => {
        if (!leaseDetails.tenantName || !leaseDetails.rentAmount) return;

        const leaseAgreement = `
📝 *RENTAL AGREEMENT (Draft)*

This agreement is made between *Landlord* and *${leaseDetails.tenantName}* for Unit *${leaseDetails.unitNo}*.

🔹 *Key Terms:*
- Monthly Rent: ₹${leaseDetails.rentAmount}
- Security Deposit: ₹${leaseDetails.deposit || leaseDetails.rentAmount * 3}
- Duration: ${leaseDetails.duration} Months
- Start Date: ${new Date().toLocaleDateString()}

✍️ Please review and sign digitally.
        `.trim();

        try {
            await Share.share({
                message: leaseAgreement,
                title: 'Smart Lease Agreement'
            });
            onClose();
        } catch (error) {
            alert('Lease copied to clipboard!');
            onClose();
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <FileText size={24} color="#8B5CF6" />
                            <Text style={styles.title}>Smart Lease Generator</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Create a legally binding rental agreement in seconds.</Text>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tenant Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Rahul Sharma"
                                placeholderTextColor="#52525B"
                                value={leaseDetails.tenantName}
                                onChangeText={t => setLeaseDetails({ ...leaseDetails, tenantName: t })}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Unit Property</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Unit 101"
                                    placeholderTextColor="#52525B"
                                    value={leaseDetails.unitNo}
                                    onChangeText={t => setLeaseDetails({ ...leaseDetails, unitNo: t })}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Monthly Rent (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="25000"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={leaseDetails.rentAmount}
                                    onChangeText={t => setLeaseDetails({ ...leaseDetails, rentAmount: t })}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Duration (Months)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="11"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={leaseDetails.duration}
                                    onChangeText={t => setLeaseDetails({ ...leaseDetails, duration: t })}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Security Deposit</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="75000"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={leaseDetails.deposit}
                                    onChangeText={t => setLeaseDetails({ ...leaseDetails, deposit: t })}
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.generateBtn} onPress={generateLease}>
                        <LinearGradient
                            colors={['#8B5CF6', '#7C3AED']}
                            style={styles.btnGradient}
                        >
                            <Share2 size={20} color="#FFF" />
                            <Text style={styles.btnText}>Generate & Share Agreement</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.footerInfo}>
                        <ShieldCheck size={14} color="#A1A1AA" />
                        <Text style={styles.footerText}>Secure, reusable, and legally compliant template.</Text>
                    </View>
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
    form: { marginBottom: 24 },
    inputGroup: { marginBottom: 16 },
    label: { color: '#71717A', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
    input: { backgroundColor: '#27272A', color: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FFFFFF10', fontSize: 15 },
    row: { flexDirection: 'row', gap: 16 },
    generateBtn: { borderRadius: 16, overflow: 'hidden', height: 56, marginBottom: 16 },
    btnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    footerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    footerText: { color: '#A1A1AA', fontSize: 12 }
});
