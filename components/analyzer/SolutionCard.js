import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Lightbulb, TrendingDown, Clock, Zap, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SolutionCard({ solution, onStart }) {
    const getDifficultyColor = () => {
        switch (solution.difficulty) {
            case 'easy': return '#10B981';
            case 'medium': return '#F59E0B';
            case 'hard': return '#EF4444';
            default: return '#71717A';
        }
    };

    const difficultyColor = getDifficultyColor();

    return (
        <View style={styles.card}>
            <LinearGradient
                colors={['#10B98120', '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Lightbulb size={28} color="#10B981" strokeWidth={2.5} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.action}>{solution.action}</Text>
                    {solution.impact_score && (
                        <View style={styles.impactBadge}>
                            <Text style={styles.impactText}>
                                Impact: {solution.impact_score}/10
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.savingsContainer}>
                <TrendingDown size={20} color="#10B981" />
                <Text style={styles.savingsText}>Save {solution.savings}</Text>
            </View>

            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <Zap size={16} color={difficultyColor} />
                    <Text style={[styles.metaText, { color: difficultyColor }]}>
                        {solution.difficulty}
                    </Text>
                </View>
                <View style={styles.metaItem}>
                    <Clock size={16} color="#A1A1AA" />
                    <Text style={styles.metaText}>{solution.timeframe}</Text>
                </View>
            </View>

            <View style={styles.stepsContainer}>
                <Text style={styles.stepsTitle}>Steps to follow:</Text>
                {solution.steps.map((step, index) => (
                    <View key={index} style={styles.stepRow}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                    </View>
                ))}
            </View>

            {solution.requirements && solution.requirements.length > 0 && (
                <View style={styles.requirementsContainer}>
                    <Text style={styles.requirementsTitle}>Requirements:</Text>
                    <View style={styles.requirementsList}>
                        {solution.requirements.map((req, index) => (
                            <View key={index} style={styles.requirementItem}>
                                <CheckCircle size={14} color="#71717A" />
                                <Text style={styles.requirementText}>{req}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {onStart && (
                <Pressable
                    style={styles.startButton}
                    onPress={onStart}
                >
                    <LinearGradient
                        colors={['#10B981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                    >
                        <Text style={styles.buttonText}>Start This Solution</Text>
                    </LinearGradient>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'relative',
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#10B98130',
        overflow: 'hidden',
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#10B98120',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    action: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 6,
        lineHeight: 22,
    },
    impactBadge: {
        backgroundColor: '#10B98120',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    impactText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },
    savingsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#10B98115',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 12,
    },
    savingsText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#10B981',
    },
    metaRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#A1A1AA',
        textTransform: 'capitalize',
    },
    stepsContainer: {
        backgroundColor: '#FFFFFF05',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    stepsTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    stepRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#10B98120',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    stepNumberText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#10B981',
    },
    stepText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#A1A1AA',
        lineHeight: 18,
    },
    requirementsContainer: {
        marginBottom: 12,
    },
    requirementsTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#71717A',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    requirementsList: {
        gap: 6,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    requirementText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#71717A',
    },
    startButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    buttonGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
});
