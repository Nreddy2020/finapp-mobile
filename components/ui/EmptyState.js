import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

export default function EmptyState({
    icon: Icon,
    iconColor = '#6366F1',
    title,
    subtitle,
    actionText,
    onAction,
    style
}) {
    return (
        <View style={[styles.container, style]}>
            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}08` }]}>
                <Icon size={32} color={iconColor} strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {actionText && onAction && (
                <Pressable style={styles.actionButton} onPress={onAction}>
                    <Text style={[styles.actionText, { color: iconColor }]}>{actionText}</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 48,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        borderStyle: 'dashed',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
    },
    title: {
        fontSize: 17,
        color: '#FFFFFF',
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#71717A',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 20,
    },
    actionButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#FFFFFF15',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
