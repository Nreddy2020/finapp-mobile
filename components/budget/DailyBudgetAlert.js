import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function DailyBudgetAlert({ dailyBudget, todaySpent, monthlyBudget, monthSpent }) {
    const remaining = dailyBudget - todaySpent;
    const percentageUsed = (todaySpent / dailyBudget) * 100;

    const getStatus = () => {
        if (percentageUsed >= 100) return 'exceeded';
        if (percentageUsed >= 80) return 'warning';
        if (percentageUsed >= 50) return 'caution';
        return 'good';
    };

    const getColor = () => {
        const status = getStatus();
        if (status === 'exceeded') return '#EF4444';
        if (status === 'warning') return '#F59E0B';
        if (status === 'caution') return '#EAB308';
        return '#10B981';
    };

    const getMessage = () => {
        const status = getStatus();
        if (status === 'exceeded') return 'Budget exceeded!';
        if (status === 'warning') return 'Almost at limit';
        if (status === 'caution') return 'Watch spending';
        return 'On track';
    };

    const getAdvice = () => {
        const status = getStatus();
        if (status === 'exceeded') return 'Try to avoid non-essential expenses today';
        if (status === 'warning') return 'Only spend on essentials for rest of day';
        if (status === 'caution') return 'You have some room, but be careful';
        return `You have ₹${remaining.toLocaleString('en-IN')} left for today`;
    };

    const color = getColor();
    const status = getStatus();

    return (
        <View style={[styles.container, { borderColor: `${color}30` }]}>
            <LinearGradient
                colors={[`${color}15`, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    {status === 'good' ? (
                        <CheckCircle size={24} color={color} strokeWidth={2.5} />
                    ) : (
                        <AlertTriangle size={24} color={color} strokeWidth={2.5} />
                    )}
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color }]}>{getMessage()}</Text>
                    <Text style={styles.subtitle}>{getAdvice()}</Text>
                </View>
            </View>

            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${Math.min(percentageUsed, 100)}%`,
                                backgroundColor: color
                            }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    ₹{todaySpent.toLocaleString('en-IN')} / ₹{dailyBudget.toLocaleString('en-IN')}
                </Text>
            </View>

            <View style={styles.stats}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Today Remaining</Text>
                    <Text style={[styles.statValue, { color: remaining >= 0 ? '#10B981' : '#EF4444' }]}>
                        ₹{Math.abs(remaining).toLocaleString('en-IN')}
                    </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Month Remaining</Text>
                    <Text style={styles.statValue}>
                        ₹{(monthlyBudget - monthSpent).toLocaleString('en-IN')}
                    </Text>
                </View>
            </View>

            {remaining < 0 && (
                <View style={styles.warningBox}>
                    <TrendingDown size={16} color="#EF4444" />
                    <Text style={styles.warningText}>
                        You've overspent by ₹{Math.abs(remaining).toLocaleString('en-IN')} today
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 16,
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
    },
    subtitle: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#FFFFFF10',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    stats: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF05',
        borderRadius: 12,
        padding: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
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
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EF444415',
        padding: 10,
        borderRadius: 10,
        marginTop: 12,
    },
    warningText: {
        fontSize: 13,
        color: '#EF4444',
        fontWeight: '700',
        flex: 1,
    },
});
