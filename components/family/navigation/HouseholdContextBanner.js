import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { resolveHouseholdBannerState } from './navigationHelpers.js';
export { resolveHouseholdBannerState };

/**
 * HouseholdContextBanner
 * 
 * Read-only contextual status bar displaying current active household metadata.
 * Prohibits mutations, creation, editing, or hardcoded fallbacks.
 */
export default function HouseholdContextBanner({ household = null, error = null, canChange = false }) {
    const bannerState = resolveHouseholdBannerState(household, error);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title} numberOfLines={1}>
                    {bannerState.title}
                </Text>
                <View style={[styles.badge, { backgroundColor: bannerState.badgeBg }]}>
                    <View style={[styles.dot, { backgroundColor: bannerState.badgeColor }]} />
                    <Text style={[styles.badgeText, { color: bannerState.badgeColor }]}>
                        {bannerState.badgeText}
                    </Text>
                </View>
            </View>
            <Text style={styles.description}>
                {bannerState.description}{canChange ? ' · Change ⌄' : ''}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#171721',
        marginHorizontal: 16,
        marginTop: 0,
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2B2B38'
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
        flex: 1,
        marginRight: 10
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        gap: 5
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3
    },
    description: {
        fontSize: 11,
        lineHeight: 16,
        color: '#A1A1AA',
        fontWeight: '500'
    }
});
