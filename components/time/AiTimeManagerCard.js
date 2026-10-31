import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Bot, Sparkles, Calendar, CheckCircle2 } from 'lucide-react-native';

export default function AiTimeManagerCard({ onApplyGeneratedPlan }) {
    const [promptText, setPromptText] = useState(
        'I have an exam on Friday. I need to finish chapters 3, 4 and 5. I can study 2 hours every day.'
    );
    const [isGenerating, setIsGenerating] = useState(false);
    const [planGenerated, setPlanGenerated] = useState(false);

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setPlanGenerated(true);
        }, 600);
    };

    const SCHEDULE_DAYS = [
        { day: 'Monday', task1: 'Chapter 3 concepts (45m)', task2: 'Chapter 3 questions (45m)' },
        { day: 'Tuesday', task1: 'Chapter 4 concepts (45m)', task2: 'Chapter 4 questions (45m)' },
        { day: 'Wednesday', task1: 'Chapter 5 concepts (45m)', task2: 'Chapter 5 questions (45m)' },
        { day: 'Thursday', task1: 'Full revision (60m)', task2: 'Mock test (60m)' },
        { day: 'Friday', task1: 'Light revision (30m)', task2: '' },
    ];

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View style={styles.botIconWrap}>
                    <Bot size={18} color="#38BDF8" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>AI Time Manager</Text>
                    <Text style={styles.cardDesc}>Tell me what you need and I'll create a plan for you.</Text>
                </View>
            </View>

            {/* Prompt Input Box */}
            <View style={styles.promptContainer}>
                <TextInput
                    style={styles.promptInput}
                    value={promptText}
                    onChangeText={setPromptText}
                    multiline
                    placeholder="Describe your goals and daily availability..."
                    placeholderTextColor="#64748B"
                />
            </View>

            {/* Action Button */}
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Generate AI Plan"
                onPress={handleGenerate}
                style={[styles.generateButton, isGenerating && { opacity: 0.7 }]}
                disabled={isGenerating}
            >
                <Sparkles size={14} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>
                    {isGenerating ? 'Generating Schedule...' : 'Generate Plan'}
                </Text>
            </Pressable>

            {/* AI Generated Plan Table Preview */}
            <View style={styles.previewContainer}>
                <View style={styles.previewHeader}>
                    <Calendar size={14} color="#38BDF8" />
                    <Text style={styles.previewTitle}>AI Plan (Example)</Text>
                </View>

                <View style={styles.daysList}>
                    {SCHEDULE_DAYS.map((d, idx) => (
                        <View key={d.day} style={styles.dayRow}>
                            <Text style={styles.dayName}>{d.day}</Text>
                            <View style={styles.dayTasksCol}>
                                <Text style={styles.taskLine}>{d.task1}</Text>
                                {d.task2 ? <Text style={styles.taskLine}>{d.task2}</Text> : null}
                            </View>
                        </View>
                    ))}
                </View>

                {planGenerated && (
                    <View style={styles.planSuccessBanner}>
                        <CheckCircle2 size={14} color="#10B981" />
                        <Text style={styles.planSuccessText}>AI Schedule mapped to your deep-work energy slots!</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    botIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#38BDF815',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#38BDF830',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    cardDesc: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    promptContainer: {
        backgroundColor: '#1E293B50',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#33415560',
    },
    promptInput: {
        fontSize: 13,
        color: '#F8FAFC',
        lineHeight: 19,
        minHeight: 48,
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#2563EB',
        paddingVertical: 11,
        borderRadius: 10,
        marginBottom: 16,
    },
    generateButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    previewContainer: {
        backgroundColor: '#1E293B30',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#33415550',
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#33415550',
    },
    previewTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#38BDF8',
    },
    daysList: {
        gap: 8,
    },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    dayName: {
        width: 85,
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
    },
    dayTasksCol: {
        flex: 1,
        gap: 2,
    },
    taskLine: {
        fontSize: 11,
        color: '#E2E8F0',
        fontWeight: '500',
    },
    planSuccessBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#10B98115',
        padding: 8,
        borderRadius: 8,
        marginTop: 10,
    },
    planSuccessText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#10B981',
    },
});
