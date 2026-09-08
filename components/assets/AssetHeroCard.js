/**
 * components/assets/AssetHeroCard.js
 * 
 * FinLife Assets Module — Hero Card with Total Family Assets & Split Ownership.
 * Matching Screen 1 in mockup media_1788794817378.jpg.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart3 } from 'lucide-react-native';

export default function AssetHeroCard({ hero, splitOwnership }) {
    if (!hero) return null;

    return (
        <View style={styles.container}>
            {/* Top Row: Title & Bar Chart Icon */}
            <View style={styles.topRow}>
                <View>
                    <Text style={styles.title}>{hero.title}</Text>
                    <Text style={styles.amount}>{hero.amountFormatted}</Text>
                </View>
                <View style={styles.iconContainer}>
                    <BarChart3 size={24} color="#3B82F6" />
                </View>
            </View>

            {/* Growth Pill */}
            <View style={styles.growthBadge}>
                <Text style={styles.growthText}>{hero.yoyGrowthText}</Text>
            </View>

            {/* Split Ownership Row */}
            {splitOwnership && (
                <View style={styles.splitRow}>
                    <View style={styles.splitCard}>
                        <Text style={styles.splitLabel}>{splitOwnership.yourAssets.label}</Text>
                        <Text style={styles.splitValue}>{splitOwnership.yourAssets.amountFormatted}</Text>
                    </View>
                    <View style={styles.splitCard}>
                        <Text style={styles.splitLabel}>{splitOwnership.familyAssets.label}</Text>
                        <Text style={styles.splitValue}>{splitOwnership.familyAssets.amountFormatted}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#111827', // Dark Slate Blue
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    title: {
        fontSize: 13,
        fontWeight: '600',
        color: '#9CA3AF',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    amount: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    growthBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 16
    },
    growthText: {
        color: '#22C55E',
        fontSize: 12,
        fontWeight: '700'
    },
    splitRow: {
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
        paddingTop: 16
    },
    splitCard: {
        flex: 1,
        backgroundColor: '#1E293B',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#334155'
    },
    splitLabel: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4
    },
    splitValue: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700'
    }
});
