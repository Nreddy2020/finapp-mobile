import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, FileText, Calendar, Phone, AlertTriangle } from 'lucide-react-native';

export default function LeaseManager({ visible, onClose }) {
    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <FileText size={24} color="#8B5CF6" />
                            <Text style={styles.title}>Lease Agreement</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    {/* Lease Status */}
                    <View style={styles.statusCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <View style={styles.activeDot} />
                            <Text style={styles.statusText}>Active Lease</Text>
                        </View>
                        <Text style={styles.address}>Flat 402, Sunshine Heights, Mumbai</Text>
                    </View>

                    <Text style={styles.sectionTitle}>Key Dates</Text>
                    <View style={styles.datesRow}>
                        <View style={styles.dateBox}>
                            <Text style={styles.dateLabel}>Start Date</Text>
                            <Text style={styles.dateValue}>01 Apr 2024</Text>
                        </View>
                        <View style={styles.dateBox}>
                            <Text style={styles.dateLabel}>End Date</Text>
                            <Text style={styles.dateValue}>31 Mar 2025</Text>
                        </View>
                    </View>

                    <View style={styles.renewalAlert}>
                        <AlertTriangle size={20} color="#F59E0B" />
                        <Text style={styles.alertText}>Renewal due in 85 days</Text>
                    </View>

                    <Text style={styles.sectionTitle}>Landlord Details</Text>
                    <View style={styles.landlordCard}>
                        <View>
                            <Text style={styles.landlordName}>Mr. Sharma</Text>
                            <Text style={styles.landlordRole}>Points of Contact</Text>
                        </View>
                        <TouchableOpacity style={styles.callBtn}>
                            <Phone size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.viewDocBtn}>
                        <Text style={styles.viewDocText}>View Digital Contract</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    statusCard: { backgroundColor: '#8B5CF620', padding: 16, borderRadius: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#8B5CF6' },
    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    statusText: { color: '#10B981', fontWeight: '700', fontSize: 13, textTransform: 'uppercase' },
    address: { color: '#FFF', fontSize: 15, fontWeight: '600' },
    sectionTitle: { color: '#71717A', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    datesRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    dateBox: { flex: 1, backgroundColor: '#27272A', padding: 16, borderRadius: 12 },
    dateLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 4 },
    dateValue: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    renewalAlert: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F59E0B20', padding: 16, borderRadius: 12, marginBottom: 24 },
    alertText: { color: '#F59E0B', fontWeight: '600' },
    landlordCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27272A', padding: 16, borderRadius: 16, marginBottom: 24 },
    landlordName: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 2 },
    landlordRole: { color: '#A1A1AA', fontSize: 12 },
    callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
    viewDocBtn: { width: '100%', padding: 16, backgroundColor: '#3F3F46', borderRadius: 12, alignItems: 'center' },
    viewDocText: { color: '#FFF', fontWeight: '700' }
});
