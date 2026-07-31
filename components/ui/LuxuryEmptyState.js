import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';

export default function LuxuryEmptyState({
    title = "Nothing here yet",
    subtitle = "Get started by adding your first item.",
    icon: Icon = Sparkles,
    themeColor = "#F59E0B"
}) {
    return (
        <View style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
                <Icon size={32} color={themeColor} strokeWidth={2.5} />
            </View>
            <Text style={styles.emptyText}>{title}</Text>
            <Text style={styles.emptySubtext}>{subtitle}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    emptyCard: {
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 48,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        borderStyle: 'dashed',
        marginBottom: 16
    },
    emptyIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF05',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    emptyText: {
        fontSize: 17,
        color: '#FFFFFF',
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center'
    },
    emptySubtext: {
        fontSize: 14,
        color: '#71717A',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 20
    },
});
