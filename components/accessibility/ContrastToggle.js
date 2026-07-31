import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';

export default function ContrastToggle() {
    const [isHighContrast, setIsHighContrast] = useState(false);

    return (
        <View style={[styles.container, isHighContrast && styles.hcContainer]}>
            <View style={styles.header}>
                {isHighContrast ? <Sun size={24} color="#000" /> : <Moon size={24} color="#F59E0B" />}
                <Text style={[styles.title, isHighContrast && styles.hcText]}>High Contrast Mode</Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.desc, isHighContrast && styles.hcText]}>
                    Increases contrast and simplifies colors for better visibility.
                </Text>
                <Switch
                    value={isHighContrast}
                    onValueChange={setIsHighContrast}
                    trackColor={{ false: '#27272A', true: '#FFFF00' }}
                    thumbColor={isHighContrast ? '#000' : '#f4f3f4'}
                />
            </View>

            {isHighContrast && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>ACTIVE</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#18181B', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    hcContainer: { backgroundColor: '#FFFFFF', borderColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    title: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    hcText: { color: '#000' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
    desc: { flex: 1, color: '#A1A1AA', fontSize: 13 },
    badge: { marginTop: 12, backgroundColor: '#FFFF00', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeText: { color: '#000', fontWeight: '900', fontSize: 10 }
});
