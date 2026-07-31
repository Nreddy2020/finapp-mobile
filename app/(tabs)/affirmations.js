import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, TextInput, ImageBackground, Alert } from 'react-native';
import { Brain, Play, BookOpen, Sparkles, CheckCircle2, Lock, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AffirmationService } from '../../services/affirmations';

export default function AffirmationsScreen() {
    const [journalEntry, setJournalEntry] = useState('');
    const [gratitudeList, setGratitudeList] = useState(['', '', '']);

    const affirmations = [
        "Money flows to me easily and effortlessly.",
        "I am a magnet for financial abundance.",
        "I deserve to be wealthy and successful.",
        "My potential for wealth is infinite.",
        "I release all resistance to money.",
    ];

    const [currentAffirmation, setCurrentAffirmation] = useState(affirmations[0]);

    const changeAffirmation = () => {
        const randomIndex = Math.floor(Math.random() * affirmations.length);
        setCurrentAffirmation(affirmations[randomIndex]);
    };

    const handleJournalSubmit = async () => {
        if (journalEntry.trim()) {
            await AffirmationService.saveJournalEntry(journalEntry);
            Alert.alert("Released", "Your limiting belief has been released into the universe.");
            setJournalEntry('');
        }
    };

    const handleGratitudeSubmit = async () => {
        const filledCount = gratitudeList.filter(t => t.trim().length > 0).length;
        if (filledCount === 3) {
            await AffirmationService.saveGratitudeLog(gratitudeList);
            Alert.alert("Abundance Activated", "Your gratitude has been logged! Higher vibration = Higher wealth.");
            setGratitudeList(['', '', '']); // Clear
        } else {
            Alert.alert("Keep Going", "Please fill all 3 gratitudes to complete your daily abundance ritual.");
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#000000', '#1A1A1A']}
                style={styles.background}
            />

            <ScrollView style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Rewire Your Brain</Text>
                    <Text style={styles.headerSubtitle}>Abundance Mindset</Text>
                </View>

                {/* 1. Daily Affirmations */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Brain size={24} color="#A855F7" />
                        <Text style={styles.sectionTitle}>Daily Affirmation</Text>
                    </View>

                    <Pressable onPress={changeAffirmation}>
                        <LinearGradient
                            colors={['#2E1065', '#581C87']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.affirmationCard}
                        >
                            <Sparkles size={32} color="#F3E8FF" style={styles.sparkleIcon} />
                            <Text style={styles.affirmationText}>"{currentAffirmation}"</Text>
                            <Text style={styles.tapTip}>Tap to reveal new mantra</Text>
                        </LinearGradient>
                    </Pressable>
                </View>

                {/* 2. Success Visualization */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Play size={24} color="#3B82F6" />
                        <Text style={styles.sectionTitle}>Success Visualization</Text>
                    </View>

                    <View style={styles.vizCard}>
                        <Text style={styles.vizTitle}>5-Minute Wealth Manifestation</Text>
                        <Text style={styles.vizDesc}>Close your eyes and visualize your ideal financial life.</Text>

                        <Pressable style={styles.playButton}>
                            <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                            <Text style={styles.playText}>Start Session</Text>
                        </Pressable>
                    </View>
                </View>

                {/* 3. Blockage Breaker Journal */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <BookOpen size={24} color="#EC4899" />
                        <Text style={styles.sectionTitle}>Blockage Breaker</Text>
                    </View>

                    <View style={styles.journalCard}>
                        <Text style={styles.journalPrompt}>What limiting belief about money did you catch yourself thinking today?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Write it down to release it..."
                            placeholderTextColor="#52525B"
                            multiline
                            numberOfLines={4}
                            value={journalEntry}
                            onChangeText={setJournalEntry}
                        />
                        <Pressable style={styles.submitButton} onPress={handleJournalSubmit}>
                            <Text style={styles.submitText}>Release & Rewire</Text>
                        </Pressable>
                    </View>
                </View>

                {/* 4. Gratitude Log (New) */}
                <View style={[styles.section, { marginBottom: 100 }]}>
                    <View style={styles.sectionHeader}>
                        <Heart size={24} color="#EF4444" fill="#EF4444" />
                        <Text style={styles.sectionTitle}>Financial Gratitude</Text>
                    </View>

                    <View style={styles.gratitudeCard}>
                        <Text style={styles.gratitudePrompt}>List 3 money wins you are grateful for today:</Text>
                        {[0, 1, 2].map((index) => (
                            <View key={index} style={styles.gratitudeRow}>
                                <Text style={styles.number}>{index + 1}.</Text>
                                <TextInput
                                    style={styles.gratitudeInput}
                                    placeholder="I am grateful for..."
                                    placeholderTextColor="#52525B"
                                    value={gratitudeList[index]}
                                    onChangeText={(text) => {
                                        const newLog = [...gratitudeList];
                                        newLog[index] = text;
                                        setGratitudeList(newLog);
                                    }}
                                />
                            </View>
                        ))}
                        <Pressable
                            style={[styles.submitButton, { backgroundColor: '#10B981', marginTop: 16 }]}
                            onPress={handleGratitudeSubmit}
                        >
                            <Text style={styles.submitText}>Save Gratitude</Text>
                        </Pressable>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    content: { flex: 1, padding: 24, paddingTop: 60 },

    header: { marginBottom: 32 },
    headerTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    headerSubtitle: { fontSize: 16, color: '#A1A1AA', fontWeight: '500' },

    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },

    affirmationCard: { padding: 32, borderRadius: 24, alignItems: 'center', justifyContent: 'center', minHeight: 200, borderWidth: 1, borderColor: '#FFFFFF20' },
    affirmationText: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', lineHeight: 34, fontStyle: 'italic' },
    sparkleIcon: { marginBottom: 20, opacity: 0.8 },
    tapTip: { position: 'absolute', bottom: 16, fontSize: 12, color: '#FFFFFF60', fontWeight: '500' },

    vizCard: { backgroundColor: '#18181B', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF10' },
    vizTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
    vizDesc: { fontSize: 14, color: '#A1A1AA', marginBottom: 24 },
    playButton: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 12 },
    playText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

    journalCard: { backgroundColor: '#18181B', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF10' },
    journalPrompt: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16, lineHeight: 24 },
    input: { backgroundColor: '#000000', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 15, minHeight: 100, marginBottom: 16, textAlignVertical: 'top', borderWidth: 1, borderColor: '#FFFFFF10' },
    submitButton: { backgroundColor: '#EC4899', padding: 16, borderRadius: 12, alignItems: 'center' },
    submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

    gratitudeCard: { backgroundColor: '#18181B', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF10' },
    gratitudePrompt: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
    gratitudeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    number: { color: '#A1A1AA', fontSize: 16, fontWeight: '700', marginRight: 12, width: 20 },
    gratitudeInput: { flex: 1, backgroundColor: '#000000', borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 14, borderWidth: 1, borderColor: '#FFFFFF10' },
});
