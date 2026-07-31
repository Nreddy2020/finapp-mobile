import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProblemCard({ problem, onViewSolution }) {
    const getConfig = () => {
        switch (problem.severity) {
            case 'critical':
                return {
                    color: '#EF4444',
                    icon: AlertTriangle,
                    bgColor: '#EF444420'
                };
            case 'warning':
                return {
                    color: '#F59E0B',
                    icon: AlertCircle,
                    bgColor: '#F59E0B20'
                };
            default:
                return {
                    color: '#EAB308',
                    icon: Info,
                    bgColor: '#EAB30820'
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;

    return (
        <View style={[styles.card, { borderColor: `${config.color}30` }]}>
            <LinearGradient
                colors={[config.bgColor, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
                    <Icon size={24} color={config.color} strokeWidth={2.5} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.title}>{problem.title}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: config.bgColor }]}>
                        <Text style={[styles.severityText, { color: config.color }]}>
                            {problem.severity.toUpperCase()}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.message}>{problem.message}</Text>
                <View style={styles.impactContainer}>
                    <Text style={styles.impactLabel}>Impact:</Text>
                    <Text style={styles.impactText}>{problem.impact}</Text>
                </View>
            </View>

            {problem.detected_from && (
                <View style={styles.meta}>
                    <Text style={styles.metaText}>
                        Detected from: {problem.detected_from}
                    </Text>
                </View>
            )}

            {onViewSolution && (
                <Pressable
                    style={[styles.solutionButton, { backgroundColor: `${config.color}15` }]}
                    onPress={onViewSolution}
                >
                    <Text style={[styles.buttonText, { color: config.color }]}>
                        See Solution
                    </Text>
                    <ChevronRight size={18} color={config.color} />
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
        borderWidth: 2,
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
    title: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    severityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    severityText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    content: {
        marginBottom: 12,
    },
    message: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    impactContainer: {
        backgroundColor: '#FFFFFF05',
        borderRadius: 10,
        padding: 10,
    },
    impactLabel: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    impactText: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
        lineHeight: 18,
    },
    meta: {
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#FFFFFF08',
        marginBottom: 8,
    },
    metaText: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600',
        fontStyle: 'italic',
    },
    solutionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '800',
    },
});
