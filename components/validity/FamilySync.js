import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, Image } from 'react-native';
import { Users, BellRing } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function FamilySync() {
    const [toggles, setToggles] = useState({
        spouse: true,
        parents: false
    });

    return (
        <LuxuryCard style={styles.section} index={2}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
                    <Users size={16} color="#8B5CF6" />
                </View>
                <View>
                    <Text style={styles.title}>Family Sync</Text>
                    <Text style={styles.subtitle}>Notify others on lapse</Text>
                </View>
            </View>

            <View style={{ gap: 12 }}>
                <View style={styles.row}>
                    <View style={styles.userRow}>
                        <View style={[styles.avatar, { backgroundColor: '#A1A1AA' }]}>
                            <Text style={styles.avatarText}>S</Text>
                        </View>
                        <View>
                            <Text style={styles.userName}>Spouse</Text>
                            <Text style={styles.userStatus}>{toggles.spouse ? 'Notified via WhatsApp' : 'Notification Off'}</Text>
                        </View>
                    </View>
                    <Switch
                        value={toggles.spouse}
                        onValueChange={(v) => setToggles(p => ({ ...p, spouse: v }))}
                        trackColor={{ false: '#3F3F46', true: '#8B5CF6' }}
                        thumbColor={'#FFF'}
                    />
                </View>

                <View style={styles.row}>
                    <View style={styles.userRow}>
                        <View style={[styles.avatar, { backgroundColor: '#52525B' }]}>
                            <Text style={styles.avatarText}>P</Text>
                        </View>
                        <View>
                            <Text style={styles.userName}>Parents</Text>
                            <Text style={styles.userStatus}>{toggles.parents ? 'Notified via SMS' : 'Notification Off'}</Text>
                        </View>
                    </View>
                    <Switch
                        value={toggles.parents}
                        onValueChange={(v) => setToggles(p => ({ ...p, parents: v }))}
                        trackColor={{ false: '#3F3F46', true: '#8B5CF6' }}
                        thumbColor={'#FFF'}
                    />
                </View>
            </View>

            <View style={styles.infoBox}>
                <BellRing size={12} color="#8B5CF6" />
                <Text style={styles.infoText}>Family will receive alerts 7 days before critical expiry.</Text>
            </View>
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 24, paddingHorizontal: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 12 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#27272A', borderRadius: 12 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#FFF', fontWeight: '700' },
    userName: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    userStatus: { color: '#A1A1AA', fontSize: 11 },
    infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 4 },
    infoText: { color: '#8B5CF6', fontSize: 11 }
});
