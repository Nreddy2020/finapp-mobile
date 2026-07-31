import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Target, TrendingUp, Heart, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function FlexibleGoalCard({ goal, onPress }) {
    const progress = (goal.current_amount / goal.target_amount) * 100;
    const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));

    const getProgressColor = () => {
        if (progress >= 75) return '#10B981';
        if (progress >= 50) return '#3B82F6';
        if (progress >= 25) return '#F59E0B';
        return '#EF4444';
    };

    const color = getProgressColor();

    // Get last month's savings
    const lastSaving = goal.savings_history && goal.savings_history.length > 0
        ? goal.savings_history[0]
        : null;

    return (
        <Pressable style={styles.card} onPress={onPress}>
            <LinearGradient
                colors={[`${color}15`, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    <Target size={24} color={color} strokeWidth={2.5} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    {goal.flexible && (
                        <View style={styles.flexibleBadge}>
                            <Heart size={12} color="#EC4899" />
                            <Text style={styles.flexibleText}>Flexible - Save when you can</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.amountSection}>
                <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Saved</Text>
                    <Text style={styles.currentAmount}>
                        ₹{goal.current_amount.toLocaleString('en-IN')}
                    </Text>
                </View>
                <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Target</Text>
                    <Text style={styles.targetAmount}>
                        ₹{goal.target_amount.toLocaleString('en-IN')}
                    </Text>
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <Text style={[styles.progressText, { color }]}>
                        {Math.round(progress)}% Complete
                    </Text>
                    <View style={styles.daysLeft}>
                        <Calendar size={12} color="#A1A1AA" />
                        <Text style={styles.daysLeftText}>{daysLeft} days left</Text>
                    </View>
                </View>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${Math.min(progress, 100)}%`, backgroundColor: color }
                        ]}
                    />
                </View>
            </View>

            {lastSaving && (
                <View style={styles.lastSavingSection}>
                    <View style={styles.lastSavingRow}>
                        <TrendingUp size={16} color={lastSaving.amount > 0 ? '#10B981' : '#71717A'} />
                        <Text style={styles.lastSavingText}>
                            {lastSaving.amount > 0
                                ? `Last month: ₹${lastSaving.amount.toLocaleString('en-IN')}`
                                : "Last month: ₹0 (It's okay!)"}
                        </Text>
                    </View>
                    {lastSaving.note && (
                        <Text style={styles.lastSavingNote}>{lastSaving.note}</Text>
                    )}
                </View>
            )}

            {goal.flexible && (
                <View style={styles.encouragement}>
                    <Text style={styles.encouragementText}>
                        💚 No pressure! Save what you can, when you can.
                    </Text>
                </View>
            )}
        </Pressable>
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
        borderColor: '#FFFFFF08',
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
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    goalName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    flexibleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EC489920',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    flexibleText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#EC4899',
    },
    amountSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    amountRow: {
        flex: 1,
    },
    amountLabel: {
        fontSize: 11,
        color: '#71717A',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    currentAmount: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    targetAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#A1A1AA',
    },
    progressSection: {
        marginBottom: 12,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '800',
    },
    daysLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    daysLeftText: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '600',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#FFFFFF10',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    lastSavingSection: {
        backgroundColor: '#FFFFFF05',
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
    },
    lastSavingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    lastSavingText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    lastSavingNote: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600',
        fontStyle: 'italic',
        marginTop: 4,
    },
    encouragement: {
        backgroundColor: '#10B98115',
        borderRadius: 10,
        padding: 10,
    },
    encouragementText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10B981',
        textAlign: 'center',
    },
});
