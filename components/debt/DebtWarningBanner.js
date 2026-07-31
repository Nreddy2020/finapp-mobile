import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle, TrendingUp, DollarSign, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function DebtWarningBanner({ dtiRatio, totalDebt, monthlyIncome, onDismiss, onViewDetails }) {
    const getWarningLevel = () => {
        if (dtiRatio >= 50) return 'danger';
        if (dtiRatio >= 35) return 'warning';
        if (dtiRatio >= 20) return 'caution';
        return 'good';
    };

    const getWarningColor = () => {
        const level = getWarningLevel();
        if (level === 'danger') return '#EF4444';
        if (level === 'warning') return '#F59E0B';
        if (level === 'caution') return '#EAB308';
        return '#10B981';
    };

    const getWarningMessage = () => {
        const level = getWarningLevel();
        if (level === 'danger') return 'DEBT TRAP DANGER!';
        if (level === 'warning') return 'High Debt Risk';
        if (level === 'caution') return 'Watch Your Debt';
        return 'Healthy Debt Level';
    };

    const getWarningDescription = () => {
        const level = getWarningLevel();
        if (level === 'danger') return `You're paying ${Math.round(dtiRatio)}% of income on debt. This is dangerous!`;
        if (level === 'warning') return `${Math.round(dtiRatio)}% of income goes to debt. Consider refinancing.`;
        if (level === 'caution') return `${Math.round(dtiRatio)}% of income on debt. Stay careful.`;
        return `Only ${Math.round(dtiRatio)}% on debt. You're doing great!`;
    };

    const warningLevel = getWarningLevel();
    const color = getWarningColor();

    // Only show banner if there's a warning
    if (warningLevel === 'good') return null;

    return (
        <View style={[styles.container, { borderColor: `${color}30` }]}>
            <LinearGradient
                colors={[`${color}20`, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                        <AlertTriangle size={24} color={color} strokeWidth={2.5} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={[styles.title, { color }]}>{getWarningMessage()}</Text>
                        <Text style={styles.description}>{getWarningDescription()}</Text>
                    </View>
                    {onDismiss && (
                        <Pressable onPress={onDismiss} style={styles.closeButton}>
                            <X size={20} color="#71717A" />
                        </Pressable>
                    )}
                </View>

                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <DollarSign size={16} color="#A1A1AA" />
                        <Text style={styles.statLabel}>Monthly Debt</Text>
                        <Text style={styles.statValue}>₹{totalDebt.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <TrendingUp size={16} color="#A1A1AA" />
                        <Text style={styles.statLabel}>Monthly Income</Text>
                        <Text style={styles.statValue}>₹{monthlyIncome.toLocaleString('en-IN')}</Text>
                    </View>
                </View>

                {warningLevel === 'danger' && (
                    <View style={styles.urgentAction}>
                        <Text style={styles.urgentText}>
                            ⚠️ Immediate action needed to avoid financial crisis
                        </Text>
                    </View>
                )}

                <Pressable
                    style={[styles.actionButton, { backgroundColor: color }]}
                    onPress={onViewDetails}
                >
                    <Text style={styles.actionButtonText}>
                        {warningLevel === 'danger' ? 'Get Help Now' : 'See Solutions'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        backgroundColor: '#18181B',
        borderRadius: 20,
        borderWidth: 2,
        overflow: 'hidden',
        marginBottom: 20,
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
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
    title: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    description: {
        fontSize: 14,
        color: '#A1A1AA',
        fontWeight: '600',
        lineHeight: 20,
    },
    closeButton: {
        padding: 4,
    },
    stats: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF05',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    divider: {
        width: 1,
        backgroundColor: '#FFFFFF10',
        marginHorizontal: 12,
    },
    statLabel: {
        fontSize: 11,
        color: '#71717A',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    urgentAction: {
        backgroundColor: '#EF444415',
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
    },
    urgentText: {
        fontSize: 13,
        color: '#EF4444',
        fontWeight: '700',
        textAlign: 'center',
    },
    actionButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
});
