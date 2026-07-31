import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Clock, Zap, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function DailyScheduleCard({ slot, onStart }) {
    const getPriorityConfig = () => {
        switch (slot.priority) {
            case 'CRITICAL':
                return { color: '#EF4444', icon: '🔴', label: 'CRITICAL' };
            case 'HIGH':
                return { color: '#F59E0B', icon: '🟠', label: 'HIGH' };
            case 'MEDIUM':
                return { color: '#EAB308', icon: '🟡', label: 'MEDIUM' };
            default:
                return { color: '#10B981', icon: '🟢', label: 'LOW' };
        }
    };

    const config = getPriorityConfig();

    return (
        <View style={[styles.card, slot.locked && styles.lockedCard]}>
            <LinearGradient
                colors={slot.priority ? [`${config.color}15`, '#00000000'] : ['#FFFFFF05', '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.header}>
                <View style={styles.timeContainer}>
                    <Clock size={16} color="#71717A" />
                    <Text style={styles.time}>{slot.time}</Text>
                </View>
                {slot.priority && (
                    <View style={[styles.priorityBadge, { backgroundColor: `${config.color}20` }]}>
                        <Text style={styles.priorityIcon}>{config.icon}</Text>
                        <Text style={[styles.priorityText, { color: config.color }]}>
                            {config.label}
                        </Text>
                    </View>
                )}
            </View>

            <Text style={styles.activity}>{slot.activity}</Text>

            {slot.description && (
                <Text style={styles.description}>{slot.description}</Text>
            )}

            {slot.financial_impact && (
                <View style={styles.impactContainer}>
                    <TrendingUp size={14} color="#10B981" />
                    <Text style={styles.impactText}>
                        Financial Impact: {slot.financial_impact}
                    </Text>
                </View>
            )}

            {slot.reason && (
                <View style={styles.reasonContainer}>
                    <Text style={styles.reasonText}>💡 {slot.reason}</Text>
                </View>
            )}

            {slot.energy_required && slot.energy_required !== 'none' && (
                <View style={styles.energyContainer}>
                    <Zap size={14} color="#F59E0B" />
                    <Text style={styles.energyText}>
                        Energy: {slot.energy_required}
                    </Text>
                </View>
            )}

            {!slot.locked && onStart && (
                <Pressable
                    style={[styles.startButton, { backgroundColor: `${config.color}20` }]}
                    onPress={() => onStart(slot)}
                >
                    <Text style={[styles.startButtonText, { color: config.color }]}>
                        Start Now
                    </Text>
                </Pressable>
            )}

            {slot.locked && (
                <View style={styles.lockedBadge}>
                    <Text style={styles.lockedText}>🔒 Scheduled</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'relative',
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        overflow: 'hidden',
    },
    lockedCard: {
        opacity: 0.7,
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    time: {
        fontSize: 13,
        fontWeight: '700',
        color: '#71717A',
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    priorityIcon: {
        fontSize: 10,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    activity: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
        marginBottom: 8,
    },
    impactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    impactText: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '700',
    },
    reasonContainer: {
        backgroundColor: '#FFFFFF05',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
    },
    reasonText: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '600',
        lineHeight: 16,
    },
    energyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    energyText: {
        fontSize: 12,
        color: '#F59E0B',
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    startButton: {
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    startButtonText: {
        fontSize: 14,
        fontWeight: '800',
    },
    lockedBadge: {
        paddingVertical: 6,
        alignItems: 'center',
    },
    lockedText: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '700',
    },
});
