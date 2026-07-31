import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Skull, HeartPulse, Lock } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function DeathProtocol() {
    const [enabled, setEnabled] = useState(false);

    return (
        <LuxuryCard style={styles.section} index={2}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: enabled ? '#10B98120' : '#27272A' }]}>
                    <Skull size={16} color={enabled ? '#10B981' : '#71717A'} />
                </View>
                <View>
                    <Text style={styles.title}>Death Protocol</Text>
                    <Text style={styles.subtitle}>Dead Man's Switch</Text>
                </View>
                <Switch
                    value={enabled}
                    onValueChange={setEnabled}
                    trackColor={{ false: '#3F3F46', true: '#10B981' }}
                    thumbColor={'#FFF'}
                    style={{ marginLeft: 'auto', transform: [{ scale: 0.8 }] }}
                />
            </View>

            <View style={[styles.statusBox, { borderColor: enabled ? '#10B98130' : '#3F3F46' }]}>
                <View style={styles.statusRow}>
                    <HeartPulse size={16} color={enabled ? '#10B981' : '#52525B'} />
                    <Text style={[styles.statusText, { color: enabled ? '#FFF' : '#52525B' }]}>
                        {enabled ? 'System Armed' : 'System Disarmed'}
                    </Text>
                </View>
                <Text style={styles.desc}>
                    {enabled
                        ? "If you don't check in for 30 days, your vault access will be sent to your trusted contacts."
                        : "Enable this to automatically transfer asset access to loved ones if something happens to you."}
                </Text>
            </View>

            {enabled && (
                <View style={styles.trustedContact}>
                    <Lock size={12} color="#A1A1AA" />
                    <Text style={styles.contactText}>Access Key encrypted for: <Text style={{ color: '#FFF' }}>Nira (Spouse)</Text></Text>
                </View>
            )}
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 24, paddingHorizontal: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 12 },
    statusBox: { padding: 16, borderRadius: 12, borderWidth: 1, backgroundColor: '#27272A' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    statusText: { fontWeight: '700', fontSize: 13 },
    desc: { color: '#A1A1AA', fontSize: 12, lineHeight: 18 },
    trustedContact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
    contactText: { color: '#A1A1AA', fontSize: 11 }
});
