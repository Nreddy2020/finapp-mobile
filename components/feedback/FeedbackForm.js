import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Send, AlertCircle } from 'lucide-react-native';

const CATEGORIES = ['General', 'Bug Report', 'Feature Request', 'Other'];

export default function FeedbackForm({ onSubmit, isSubmitting }) {
    const [text, setText] = useState('');
    const [category, setCategory] = useState('General');

    const handleSubmit = () => {
        if (text.trim().length === 0) return;
        onSubmit({ text, category });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.catRow}>
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, category === cat && styles.activeCat]}
                        onPress={() => setCategory(cat)}
                    >
                        <Text style={[styles.catText, category === cat && styles.activeCatText]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Your Message</Text>
            <TextInput
                style={styles.input}
                multiline
                placeholder="Tell us what you think..."
                placeholderTextColor="#52525B"
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
            />

            <TouchableOpacity
                style={[styles.submitBtn, (!text.trim() || isSubmitting) && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={!text.trim() || isSubmitting}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <>
                        <Send size={20} color={!text.trim() ? '#52525B' : '#FFF'} />
                        <Text style={[styles.submitText, !text.trim() && styles.disabledText]}>Submit Feedback</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 16 },
    label: { color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginLeft: 4 },
    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#FFFFFF10' },
    activeCat: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    catText: { color: '#A1A1AA', fontSize: 13, fontWeight: '500' },
    activeCatText: { color: '#FFF', fontWeight: '700' },
    input: { backgroundColor: '#18181B', color: '#FFF', borderRadius: 16, padding: 16, height: 160, fontSize: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', padding: 16, borderRadius: 16, gap: 12, marginTop: 8 },
    disabledBtn: { backgroundColor: '#27272A' },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    disabledText: { color: '#52525B' }
});
