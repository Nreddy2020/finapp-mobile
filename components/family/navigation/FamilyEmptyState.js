import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users } from 'lucide-react-native';

/**
 * FamilyEmptyState
 * 
 * Displayed when no household entities exist in the repository.
 * Honest empty state with zero fake data.
 */
export default function FamilyEmptyState({
    title = 'No Family Household Configured',
    subtitle = 'Set up a family household to organize members, roles, and continuity planning.'
}) {
    return (
        <View style={styles.container}>
            <View style={styles.iconCircle}>
                <Users size={32} color="#71717A" />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#18181B',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 24,
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 16
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#27272A50',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 13,
        color: '#71717A',
        textAlign: 'center',
        lineHeight: 18
    }
});
