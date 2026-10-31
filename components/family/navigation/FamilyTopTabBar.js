import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

import { FAMILY_TABS, getActiveTabFromPathname } from './navigationHelpers.js';
export { FAMILY_TABS, getActiveTabFromPathname };

/**
 * FamilyTopTabBar
 * 
 * Segmented top navigation bar strictly synchronized with Expo Router's pathname.
 * Maintains zero independent authoritative navigation state.
 */
export default function FamilyTopTabBar() {
    const router = useRouter();
    const pathname = usePathname();
    const activeTab = getActiveTabFromPathname(pathname);

    return (
        <View style={styles.container}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.tabsRow}>
                    {FAMILY_TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: isActive }}
                                accessibilityLabel={tab.label}
                                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                                onPress={() => {
                                    if (tab.route !== pathname) {
                                        router.replace(tab.route);
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <Text 
                                    style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit minimumFontScale={0.85}
                                >
                                    {tab.label}
                                </Text>
                                {isActive && <View style={styles.activeIndicator} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#09090F',
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
        paddingVertical: 2
    },
    scrollContent: {
        flexGrow: 1
    },
    tabsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        
        paddingHorizontal: 12
    },
    tabButton: {
        flex: 1,
        minWidth: 0,
        minHeight: 44,
        paddingVertical: 10,
        paddingHorizontal: 3,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    tabButtonActive: {
        // active styling
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A1A1AA',
        letterSpacing: 0.1,
        textAlign: 'center'
    },
    tabLabelActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 6,
        right: 6,
        height: 2.5,
        backgroundColor: '#DB2777', // FinLife Family pink accent
        borderRadius: 1.5
    }
});
