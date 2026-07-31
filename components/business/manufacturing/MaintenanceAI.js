import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { X, Wrench, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function MaintenanceAI({ visible, onClose }) {
    const [machines, setMachines] = useState([
        { id: 'M-01', name: 'CNC Cutter', status: 'healthy', health: 98 },
        { id: 'M-02', name: 'Hydraulic Press', status: 'critical', health: 45 },
        { id: 'M-03', name: 'Conveyor Belt', status: 'warning', health: 72 },
    ]);

    const [scanning, setScanning] = useState(false);

    const runDiagnostics = () => {
        setScanning(true);
        setTimeout(() => {
            setMachines(machines.map(m =>
                m.status === 'critical' ? { ...m, status: 'healthy', health: 100 } : m
            ));
            setScanning(false);
        }, 1500);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Wrench size={24} color="#EF4444" />
                            <Text style={styles.title}>Maintenance AI</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>IoT-enabled real-time machine health monitoring.</Text>

                    <View style={styles.list}>
                        {machines.map((machine) => (
                            <View key={machine.id} style={styles.card}>
                                <View style={styles.iconBox}>
                                    {machine.status === 'healthy' ? <CheckCircle2 size={24} color="#10B981" /> :
                                        machine.status === 'warning' ? <AlertTriangle size={24} color="#F59E0B" /> :
                                            <AlertTriangle size={24} color="#EF4444" />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.machineName}>{machine.name}</Text>
                                        <Text style={[styles.healthText, {
                                            color: machine.status === 'healthy' ? '#10B981' :
                                                machine.status === 'warning' ? '#F59E0B' : '#EF4444'
                                        }]}>{machine.health}% Health</Text>
                                    </View>
                                    <View style={styles.healthBarBg}>
                                        <View style={[styles.healthBarFill, {
                                            width: `${machine.health}%`,
                                            backgroundColor: machine.status === 'healthy' ? '#10B981' :
                                                machine.status === 'warning' ? '#F59E0B' : '#EF4444'
                                        }]} />
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.scanBtn} onPress={runDiagnostics} disabled={scanning}>
                        <LinearGradient
                            colors={['#EF4444', '#B91C1C']}
                            style={styles.scanGradient}
                        >
                            {scanning ? (
                                <Text style={styles.btnText}>Running Diagnostics...</Text>
                            ) : (
                                <>
                                    <RotateCcw size={20} color="#FFF" />
                                    <Text style={styles.btnText}>Run System Diagnostics</Text>
                                </>
                            )}
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
    list: { gap: 16, marginBottom: 32 },
    card: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#27272A', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3F3F46', borderRadius: 10 },
    machineName: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    healthText: { fontWeight: '700', fontSize: 13 },
    healthBarBg: { height: 4, backgroundColor: '#3F3F46', borderRadius: 2, marginTop: 8 },
    healthBarFill: { height: '100%', borderRadius: 2 },
    scanBtn: { height: 56, borderRadius: 16, overflow: 'hidden' },
    scanGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});
