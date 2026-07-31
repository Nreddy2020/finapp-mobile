import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Type } from 'lucide-react-native';

export default function FontSizeSlider() {
    const [scale, setScale] = useState(1);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Type size={24} color="#3B82F6" />
                <Text style={styles.title}>Dynamic Type</Text>
            </View>

            <View style={styles.previewBox}>
                <Text style={[styles.previewText, { fontSize: 16 * scale }]}>
                    The quick brown fox jumps over the lazy dog.
                </Text>
                <Text style={[styles.previewSub, { fontSize: 13 * scale }]}>
                    Adjust the slider below to change text size.
                </Text>
            </View>

            <View style={styles.controls}>
                <TouchableOpacity onPress={() => setScale(Math.max(0.8, scale - 0.1))} style={styles.btn}>
                    <Text style={styles.btnText}>-</Text>
                </TouchableOpacity>
                <View style={styles.bar}>
                    <View style={[styles.fill, { width: `${(scale - 0.8) / 0.7 * 100}%` }]} />
                </View>
                <TouchableOpacity onPress={() => setScale(Math.min(1.5, scale + 0.1))} style={styles.btn}>
                    <Text style={styles.btnText}>+</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.valueText}>Scale: {Math.round(scale * 100)}%</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#18181B', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    title: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    previewBox: { backgroundColor: '#000', padding: 16, borderRadius: 12, marginBottom: 16, minHeight: 100, justifyContent: 'center' },
    previewText: { color: '#FFF', marginBottom: 8 },
    previewSub: { color: '#71717A' },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    btn: { width: 40, height: 40, backgroundColor: '#27272A', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
    bar: { flex: 1, height: 4, backgroundColor: '#27272A', borderRadius: 2, overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: '#3B82F6' },
    valueText: { color: '#3B82F6', textAlign: 'center', marginTop: 8, fontWeight: '600' }
});
