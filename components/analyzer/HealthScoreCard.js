import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingDown, TrendingUp, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function HealthScoreCard({ score, level, dataPeriod }) {
    const getConfig = () => {
        switch (level) {
            case 'critical':
                return {
                    color: '#EF4444',
                    label: 'CRITICAL',
                    icon: TrendingDown,
                    message: 'Immediate action needed'
                };
            case 'warning':
                return {
                    color: '#F59E0B',
                    label: 'WARNING',
                    icon: AlertCircle,
                    message: 'Needs attention'
                };
            case 'caution':
                return {
                    color: '#EAB308',
                    label: 'CAUTION',
                    icon: AlertCircle,
                    message: 'Monitor closely'
                };
            default:
                return {
                    color: '#10B981',
                    label: 'GOOD',
                    icon: TrendingUp,
                    message: 'Keep it up!'
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;

    return (
        <View style={styles.card}>
            <LinearGradient
                colors={[`${config.color}20`, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.header}>
                <Text style={styles.title}>Financial Health Score</Text>
                {dataPeriod && (
                    <Text style={styles.period}>Based on {dataPeriod}</Text>
                )}
            </View>

            <View style={styles.scoreContainer}>
                <View style={[styles.scoreCircle, { borderColor: config.color }]}>
                    <Text style={[styles.score, { color: config.color }]}>{score}</Text>
                    <Text style={styles.outOf}>/100</Text>
                </View>

                <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
                        <Icon size={20} color={config.color} strokeWidth={2.5} />
                        <Text style={[styles.statusLabel, { color: config.color }]}>
                            {config.label}
                        </Text>
                    </View>
                    <Text style={styles.message}>{config.message}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {score < 50 ? '🚨 ' : score < 70 ? '⚠️ ' : '✅ '}
                    {score < 50
                        ? 'Critical issues detected'
                        : score < 70
                            ? 'Some concerns found'
                            : 'Financial health is good'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'relative',
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
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
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    period: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '600',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    scoreCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    score: {
        fontSize: 36,
        fontWeight: '900',
    },
    outOf: {
        fontSize: 14,
        color: '#71717A',
        fontWeight: '700',
    },
    statusContainer: {
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    statusLabel: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 14,
        color: '#A1A1AA',
        fontWeight: '600',
    },
    footer: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#FFFFFF08',
    },
    footerText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
        textAlign: 'center',
    },
});
