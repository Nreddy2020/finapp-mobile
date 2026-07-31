import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle, Clock, Lightbulb } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProcrastinationAlertCard({ alert, onTakeAction }) {
    const getSeverityConfig = () => {
        switch (alert.severity) {
            case 'critical':
                return { color: '#EF4444', bgColor: '#EF444420' };
            case 'warning':
                return { color: '#F59E0B', bgColor: '#F59E0B20' };
            default:
                return { color: '#EAB308', bgColor: '#EAB30820' };
        }
    };

    const config = getSeverityConfig();

    return (
        <View style={[styles.card, { borderColor: `${config.color}40` }]}>
            <LinearGradient
                colors={[config.bgColor, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
                    <Text style={styles.icon}>{alert.icon}</Text>
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.type, { color: config.color }]}>
                        {alert.type.toUpperCase().replace('_', ' ')}
                    </Text>
                </View>
            </View>

            <Text style={styles.message}>{alert.message}</Text>

            {alert.details && (
                <View style={styles.detailsContainer}>
                    <Text style={styles.details}>{alert.details}</Text>
                </View>
            )}

            {alert.task && (
                <View style={styles.taskContainer}>
                    <Text style={styles.taskLabel}>Task:</Text>
                    <Text style={styles.taskText}>{alert.task}</Text>
                </View>
            )}

            {alert.days_pending && (
                <View style={styles.metaContainer}>
                    <Clock size={14} color="#71717A" />
                    <Text style={styles.metaText}>
                        Pending for {alert.days_pending} days
                    </Text>
                </View>
            )}

            {alert.days_left !== undefined && (
                <View style={styles.metaContainer}>
                    <Clock size={14} color={config.color} />
                    <Text style={[styles.metaText, { color: config.color }]}>
                        {alert.days_left === 0 ? 'DUE TODAY!' : `${alert.days_left} days left`}
                    </Text>
                </View>
            )}

            {alert.action && (
                <View style={styles.actionContainer}>
                    <Lightbulb size={16} color="#10B981" />
                    <Text style={styles.actionText}>{alert.action}</Text>
                </View>
            )}

            {alert.recommendation && (
                <View style={styles.recommendationContainer}>
                    <Text style={styles.recommendationText}>
                        💡 {alert.recommendation}
                    </Text>
                </View>
            )}

            {onTakeAction && (
                <Pressable
                    style={[styles.button, { backgroundColor: `${config.color}20` }]}
                    onPress={() => onTakeAction(alert)}
                >
                    <Text style={[styles.buttonText, { color: config.color }]}>
                        Take Action Now
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'relative',
        backgroundColor: '#18181B',
        borderRadius: 16,
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
        alignItems: 'center',
        marginBottom: 10,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    icon: {
        fontSize: 20,
    },
    headerText: {
        flex: 1,
    },
    type: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
        lineHeight: 20,
    },
    detailsContainer: {
        backgroundColor: '#FFFFFF05',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
    },
    details: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
    },
    taskContainer: {
        marginBottom: 8,
    },
    taskLabel: {
        fontSize: 11,
        color: '#71717A',
        fontWeight: '700',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    taskText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    metaText: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '700',
    },
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#10B98115',
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
    },
    actionText: {
        flex: 1,
        fontSize: 13,
        color: '#10B981',
        fontWeight: '700',
        lineHeight: 18,
    },
    recommendationContainer: {
        backgroundColor: '#FFFFFF05',
        borderRadius: 8,
        padding: 8,
        marginBottom: 10,
    },
    recommendationText: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '600',
        lineHeight: 16,
    },
    button: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '900',
    },
});
