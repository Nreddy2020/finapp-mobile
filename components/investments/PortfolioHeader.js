/**
 * components/investments/PortfolioHeader.js
 * 
 * Stage C.5.1 Multi-Portfolio Switcher and Header.
 * Dynamic discovery from holdings/events without mutating storage.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Briefcase, Layers } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';

export default function PortfolioHeader({
    selectedPortfolioId = null,
    availablePortfolios = [],
    onSelectPortfolio = () => {},
    lastRefreshTime = null
}) {
    const formatRefreshTime = (timestamp) => {
        if (!timestamp) return 'Never refreshed';
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return 'Recently';
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <View style={styles.titleContainer}>
                    <Briefcase size={20} color={COLORS.primaryLight || '#6366F1'} style={styles.titleIcon} />
                    <Text style={styles.titleText}>Investment Portfolios</Text>
                </View>
                {lastRefreshTime && (
                    <Text style={styles.refreshTimeText}>
                        Updated {formatRefreshTime(lastRefreshTime)}
                    </Text>
                )}
            </View>

            {/* Horizontal Portfolio Picker */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={styles.portfolioScroll}
            >
                {/* 1. All Portfolios Option */}
                <TouchableOpacity
                    style={[
                        styles.chip,
                        selectedPortfolioId === null && styles.activeChip
                    ]}
                    onPress={() => onSelectPortfolio(null)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Select All Portfolios"
                    accessibilityState={{ selected: selectedPortfolioId === null }}
                >
                    <Layers
                        size={14}
                        color={selectedPortfolioId === null ? '#FFFFFF' : COLORS.textSecondary}
                        style={styles.chipIcon}
                    />
                    <Text
                        style={[
                            styles.chipText,
                            selectedPortfolioId === null && styles.activeChipText
                        ]}
                    >
                        All Portfolios
                    </Text>
                </TouchableOpacity>

                {/* 2. Discovered Individual Portfolios */}
                {availablePortfolios.map((p) => {
                    const isSelected = selectedPortfolioId === p.id;
                    return (
                        <TouchableOpacity
                            key={p.id}
                            style={[
                                styles.chip,
                                isSelected && styles.activeChip
                            ]}
                            onPress={() => onSelectPortfolio(p.id)}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={`Select portfolio ${p.name || p.id}`}
                            accessibilityState={{ selected: isSelected }}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    isSelected && styles.activeChipText
                                ]}
                            >
                                {p.name || p.id}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    titleIcon: {
        marginRight: SPACING.xs + 2
    },
    titleText: {
        fontSize: TYPOGRAPHY.h3 || 20,
        fontWeight: '700',
        color: COLORS.textPrimary || '#FFFFFF',
        letterSpacing: 0.3
    },
    refreshTimeText: {
        fontSize: TYPOGRAPHY.caption || 11,
        color: COLORS.textTertiary || '#71717A'
    },
    portfolioScroll: {
        flexDirection: 'row'
    },
    scrollContent: {
        paddingVertical: 4
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.card || '#18181B',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border || 'rgba(255,255,255,0.08)',
        marginRight: SPACING.sm
    },
    activeChip: {
        backgroundColor: COLORS.primary || '#4F46E5',
        borderColor: COLORS.primaryLight || '#6366F1'
    },
    chipIcon: {
        marginRight: 6
    },
    chipText: {
        fontSize: TYPOGRAPHY.bodySmall || 13,
        fontWeight: '500',
        color: COLORS.textSecondary || '#A1A1AA'
    },
    activeChipText: {
        color: '#FFFFFF',
        fontWeight: '700'
    }
});
