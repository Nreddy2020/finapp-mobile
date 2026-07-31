import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { X, Globe, CheckCircle, FileText, AlertCircle } from 'lucide-react-native';

export default function VisaAssistant({ visible, onClose }) {
    const [country, setCountry] = useState('France (Schengen)');
    const [status, setStatus] = useState('Documents Needed');

    const requirements = [
        { id: 1, name: 'Passport (6 months validity)', done: true },
        { id: 2, name: 'Flight Itinerary', done: true },
        { id: 3, name: 'Travel Insurance (€30k coverage)', done: false },
        { id: 4, name: 'Bank Statements (3 months)', done: false },
        { id: 5, name: 'Hotel Booking', done: true },
    ];

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Globe size={24} color="#10B981" />
                            <Text style={styles.title}>Visa Assistant</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Check eligibility & requirements.</Text>

                    <View style={styles.countrySelector}>
                        <Text style={styles.label}>Destination</Text>
                        <TextInput style={styles.input} value={country} onChangeText={setCountry} />
                    </View>

                    <View style={styles.statusBox}>
                        <AlertCircle size={20} color="#F59E0B" />
                        <Text style={styles.statusText}>Status: {status}</Text>
                    </View>

                    <Text style={styles.sectionTitle}>Document Checklist</Text>

                    <ScrollView style={styles.list}>
                        {requirements.map((req) => (
                            <TouchableOpacity key={req.id} style={styles.reqRow}>
                                <CheckCircle size={20} color={req.done ? '#10B981' : '#3F3F46'} />
                                <Text style={[styles.reqName, req.done && styles.reqDone]}>{req.name}</Text>
                                <FileText size={16} color="#71717A" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.checkBtn}>
                        <Text style={styles.checkBtnText}>Check Eligibility AI</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    countrySelector: { marginBottom: 16 },
    label: { color: '#71717A', fontSize: 12, marginBottom: 6 },
    input: { backgroundColor: '#27272A', padding: 12, borderRadius: 12, color: '#FFF', fontSize: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    statusBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F59E0B20', padding: 12, borderRadius: 12, marginBottom: 24 },
    statusText: { color: '#F59E0B', fontWeight: '600' },
    sectionTitle: { color: '#71717A', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    list: { flex: 1 },
    reqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#FFFFFF08' },
    reqName: { flex: 1, color: '#FFF', fontSize: 14 },
    reqDone: { color: '#71717A', textDecorationLine: 'line-through' },
    checkBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
    checkBtnText: { color: '#FFF', fontWeight: '700' }
});
