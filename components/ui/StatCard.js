import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function StatCard({
    label,
    value,
    icon: Icon,
    iconColor = '#6366F1',
    subtitle,
    trend,
    trendDirection = 'up', // 'up' or 'down'
    style
}) {
    const trendColor = trendDirection === 'up' ? '#10B981' : '#EF4444';

    return (
        <View style={[styles.container, style]}>
            <LinearGradient
                colors={[`${iconColor}15`, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.label}>{label}</Text>
                    {Icon && (
                        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                            <Icon size={16} color={iconColor} strokeWidth={2.5} />
                        </View>
                    )}
                </View>
                <Text style={styles.value}>{value}</Text>
                {(subtitle || trend) && (
                    <View style={styles.footer}>
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                        {trend && (
                            <Text style={[styles.trend, { color: trendColor }]}>
                                {trendDirection === 'up' ? '↑' : '↓'} {trend}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 20,
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
        opacity: 0.8,
    },
    content: {
        position: 'relative',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10',
    },
    value: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '500',
    },
    trend: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
