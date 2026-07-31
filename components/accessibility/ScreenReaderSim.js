import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ear, Volume2 } from 'lucide-react-native';

export default function ScreenReaderSim() {
    const [focused, setFocused] = useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ear size={24} color="#10B981" />
                <Text style={styles.title}>Screen Reader Simulator</Text>
            </View>

            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setFocused(!focused)}
                style={[styles.testBtn, focused && styles.focusedBtn]}
            >
                <Text style={styles.btnText}>Tap to Focus Me</Text>
            </TouchableOpacity>

            {focused && (
                <View style={styles.readerToast}>
                    <Volume2 size={20} color="#FFF" />
                    <Text style={styles.readerText}>
                        "Button. Tap to Focus Me. Double tap to activate."
                    </Text>
                </View>
            )}

            <Text style={styles.note}>
                Simulates VoiceOver/TalkBack announcements for UI elements.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    title: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    testBtn: { backgroundColor: '#27272A', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'transparent' },
    focusedBtn: { borderColor: '#10B981', backgroundColor: '#10B98120' },
    btnText: { color: '#FFF', fontWeight: '600' },
    readerToast: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#000', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF30' },
    readerText: { color: '#FFF', fontStyle: 'italic', flex: 1 },
    note: { color: '#71717A', fontSize: 12, textAlign: 'center' }
});
