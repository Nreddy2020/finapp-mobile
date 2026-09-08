/**
 * components/reports/ReportsSegmentedTabs.js
 * 
 * Segmented horizontal selector for Reports sections matching mockup:
 * [Overview] [Spending] [Cash Flow] [Debt] [Groups] [Budget] [Recurring]
 */

import React, { useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ReportSection } from '../../services/reports/reportContracts.js';

const TABS = [
    { id: ReportSection.OVERVIEW, label: 'Overview' },
    { id: ReportSection.SPENDING, label: 'Spending' },
    { id: ReportSection.CASH_FLOW, label: 'Cash Flow' },
    { id: ReportSection.DEBT, label: 'Debt' },
    { id: ReportSection.GROUPS, label: 'Groups' },
    { id: ReportSection.BUDGET, label: 'Budget' },
    { id: ReportSection.RECURRING, label: 'Recurring' },
    { id: ReportSection.DIAGNOSTICS, label: 'Diagnostics' }
];

export default function ReportsSegmentedTabs({ activeSection, onSelectSection }) {
    const scrollViewRef = useRef(null);
    const tabLayouts = useRef({});

    useEffect(() => {
        if (activeSection && tabLayouts.current[activeSection] && scrollViewRef.current) {
            const layout = tabLayouts.current[activeSection];
            scrollViewRef.current.scrollTo({
                x: Math.max(0, layout.x - 24),
                animated: true
            });
        }
    }, [activeSection]);

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {TABS.map(tab => {
                    const isActive = activeSection === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tabButton, isActive && styles.tabButtonActive]}
                            onPress={() => onSelectSection(tab.id)}
                            onLayout={event => {
                                tabLayouts.current[tab.id] = event.nativeEvent.layout;
                                if (activeSection === tab.id && scrollViewRef.current) {
                                    scrollViewRef.current.scrollTo({
                                        x: Math.max(0, event.nativeEvent.layout.x - 24),
                                        animated: true
                                    });
                                }
                            }}
                            activeOpacity={0.7}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                        >
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                {tab.label}
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
        marginBottom: 16
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 8
    },
    tabButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    tabButtonActive: {
        backgroundColor: '#2563EB',
        borderColor: '#3B82F6'
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    tabTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    }
});
