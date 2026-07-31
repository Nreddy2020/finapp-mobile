import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Switch, Image } from 'react-native';
import { X, Globe, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChannelManager({ visible, onClose }) {
    const [channels, setChannels] = useState([
        { id: 1, name: 'Booking.com', connected: true, rate: 4500, fees: '15%' },
        { id: 2, name: 'Airbnb', connected: true, rate: 4800, fees: '3%' },
        { id: 3, name: 'Expedia', connected: false, rate: 4400, fees: '18%' },
        { id: 4, name: 'Agoda', connected: true, rate: 4500, fees: '12%' },
    ]);

    const toggleChannel = (id) => {
        setChannels(channels.map(c =>
            c.id === id ? { ...c, connected: !c.connected } : c
        ));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Globe size={24} color="#3B82F6" />
                            <Text style={styles.title}>Channel Manager</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Sync inventory and rates across all OTAs instantly.</Text>

                    <View style={styles.list}>
                        {channels.map((channel) => (
                            <View key={channel.id} style={styles.channelRow}>
                                <View style={styles.channelInfo}>
                                    <Text style={styles.channelName}>{channel.name}</Text>
                                    <Text style={styles.channelMeta}>Comm: {channel.fees} • Rate: ₹{channel.rate}</Text>
                                </View>
                                <View style={styles.controls}>
                                    <View style={[styles.statusBadge, channel.connected ? styles.statusOn : styles.statusOff]}>
                                        <Text style={[styles.statusText, channel.connected ? styles.textOn : styles.textOff]}>
                                            {channel.connected ? 'SYNCED' : 'PAUSED'}
                                        </Text>
                                    </View>
                                    <Switch
                                        value={channel.connected}
                                        onValueChange={() => toggleChannel(channel.id)}
                                        trackColor={{ false: '#3F3F46', true: '#3B82F6' }}
                                        thumbColor={'#FFF'}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.syncBtn}>
                            <RefreshCw size={18} color="#FFF" />
                            <Text style={styles.btnText}>Force Sync Inventory</Text>
                        </TouchableOpacity>
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
    list: { gap: 12, marginBottom: 24 },
    channelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27272A', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    channelName: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
    channelMeta: { color: '#71717A', fontSize: 12 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
    statusOn: { backgroundColor: '#10B98110', borderColor: '#10B98120' },
    statusOff: { backgroundColor: '#71717A10', borderColor: '#71717A20' },
    statusText: { fontSize: 10, fontWeight: '700' },
    textOn: { color: '#10B981' },
    textOff: { color: '#71717A' },
    footer: { marginTop: 8 },
    syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B82F6', padding: 16, borderRadius: 16 },
    btnText: { color: '#FFF', fontWeight: '700' }
});
