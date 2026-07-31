import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';

export default function BusinessCard({ title, icon: Icon, color, description, onPress, stats }) {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <LinearGradient
                colors={[`${color}15`, `${color}05`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20`, borderColor: `${color}30` }]}>
                    <Icon size={24} color={color} strokeWidth={2.5} />
                </View>
                <View style={[styles.arrowContainer, { backgroundColor: `${color}10` }]}>
                    <ArrowRight size={16} color={color} />
                </View>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>

            {stats && (
                <View style={styles.statsContainer}>
                    {stats.map((stat, index) => {
                        const StatWrapper = stat.onPress ? TouchableOpacity : View;
                        return (
                            <StatWrapper
                                key={index}
                                style={styles.statItem}
                                onPress={stat.onPress}
                            >
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </StatWrapper>
                        );
                    })}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        overflow: 'hidden',
        position: 'relative'
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1
    },
    arrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 6,
        letterSpacing: -0.5
    },
    description: {
        fontSize: 13,
        color: '#A1A1AA',
        lineHeight: 20,
        marginBottom: 20
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#FFFFFF08'
    },
    statItem: {
        flex: 1
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 2
    },
    statLabel: {
        fontSize: 11,
        color: '#71717A',
        textTransform: 'uppercase',
        fontWeight: '600'
    }
});
