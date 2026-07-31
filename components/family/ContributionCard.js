import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { User, TrendingUp, Wallet } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ContributionCard({ member, totalContribution, onPress }) {
    const percentage = (member.contribution / totalContribution) * 100;

    const getContributionColor = () => {
        if (percentage >= 40) return '#10B981'; // Green - major contributor
        if (percentage >= 25) return '#3B82F6'; // Blue - good contributor
        return '#F59E0B'; // Orange - smaller contributor
    };

    const color = getContributionColor();

    return (
        <Pressable style={styles.card} onPress={onPress}>
            <LinearGradient
                colors={[`${color}15`, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                <User size={24} color={color} strokeWidth={2.5} />
            </View>

            <View style={styles.content}>
                <Text style={styles.name}>{member.name}</Text>
                <View style={styles.row}>
                    <Wallet size={14} color="#A1A1AA" />
                    <Text style={styles.contribution}>
                        ₹{member.contribution.toLocaleString('en-IN')}/month
                    </Text>
                </View>
                {member.dependents && member.dependents.length > 0 && (
                    <Text style={styles.dependents}>
                        Supports: {member.dependents.join(', ')}
                    </Text>
                )}
            </View>

            <View style={styles.right}>
                <View style={[styles.percentageBadge, { backgroundColor: `${color}20` }]}>
                    <Text style={[styles.percentage, { color }]}>
                        {Math.round(percentage)}%
                    </Text>
                </View>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${percentage}%`, backgroundColor: color }
                        ]}
                    />
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
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
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    contribution: {
        fontSize: 14,
        fontWeight: '600',
        color: '#A1A1AA',
    },
    dependents: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600',
        fontStyle: 'italic',
    },
    right: {
        alignItems: 'flex-end',
        gap: 8,
    },
    percentageBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    percentage: {
        fontSize: 16,
        fontWeight: '900',
    },
    progressBar: {
        width: 80,
        height: 6,
        backgroundColor: '#FFFFFF10',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
});
