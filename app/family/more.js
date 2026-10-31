import {useFamilySelection} from '../../components/family/navigation/FamilySelection.js';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, FileText, Wallet, Activity, Calendar, ShieldAlert, PieChart, TrendingUp, Target } from 'lucide-react-native';
import FamilyHeader from '../../components/family/navigation/FamilyHeader.js';
import FamilyEmptyState from '../../components/family/navigation/FamilyEmptyState.js';
import { FamilyHouseholdService } from '../../services/family/index.js';

/**
 * More Hub Scaffold (/family/more)
 * 
 * Phase 2 Navigation Shell — Minimal structural placeholder.
 * Provides gateway navigation into secondary deferred modules.
 */
export default function FamilyMoreScreen() {
    const {household} = useFamilySelection();
    const loading = false;
    const router = useRouter();
    const gateways = [
        { id: 'life-events', title: 'Life Events', subtitle: 'Prepare for a new school year with linked Operations tasks', icon: Calendar, route: '/family/more/life-events' },
        {
            id: 'goals',
            title: 'Goals & milestones',
            subtitle: 'Set savings targets and track family contributions',
            icon: Target,
            route: '/family/more/goals'
        },
        {
            id: 'forecast',
            title: 'Financial forecast',
            subtitle: 'See upcoming income, expenses and possible shortfalls',
            icon: TrendingUp,
            route: '/family/more/forecast'
        },
        {
            id: 'budgeting',
            title: 'Shared budgets',
            subtitle: 'Plan shared spending and contributions',
            icon: PieChart,
            route: '/family/more/budgeting'
        },
        {
            id: 'continuity',
            title: 'Continuity & Crisis Hub',
            subtitle: 'Keep emergency plans and essential contacts together',
            icon: ShieldAlert,
            route: '/family/more/continuity'
        },
        {
            id: 'actions',
            title: 'Upcoming actions',
            subtitle: 'Upcoming tasks, payments and renewals',
            icon: Calendar,
            route: '/family/more/actions'
        },
        {
            id: 'resources',
            title: 'Documents & records',
            subtitle: 'Document Vault & physical records registry',
            icon: FileText,
            route: '/family/more/resources'
        },
        {
            id: 'financials',
            title: 'Financial Coordination',
            subtitle: 'Read-only view across budgets & obligations',
            icon: Wallet,
            route: '/family/more/financials'
        },
        {
            id: 'readiness',
            title: 'Protection readiness',
            subtitle: 'Review protection gaps and next steps',
            icon: Activity,
            route: '/family/more/readiness'
        }
    ];

    return (
        <SafeAreaView style={styles.safeArea} edges={[]}>
            <FamilyHeader 
                title="More" 
                subtitle="Plans, records and money"
                household={household}
                showBack={false}
                showContextBanner={true}
                showTopTabs={true}
            />

            <ScrollView 
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {!loading && !household && (
                    <FamilyEmptyState />
                )}

                <View style={styles.gatewaysContainer}>
                    <Text style={styles.sectionHeader}>EXPLORE FAMILY</Text>
                    {gateways.map((g) => {
                        const IconComponent = g.icon;
                        return (
                            <TouchableOpacity
                                key={g.id}
                                style={styles.gatewayCard}
                                onPress={() => router.push(g.route)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={g.title}
                            >
                                <View style={styles.iconCircle}>
                                    <IconComponent size={20} color="#DB2777" />
                                </View>
                                <View style={styles.gatewayInfo}>
                                    <Text style={styles.gatewayTitle}>{g.title}</Text>
                                    <Text style={styles.gatewaySubtitle}>{g.subtitle}</Text>
                                </View>
                                <ChevronRight size={18} color="#71717A" />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#09090F'
    },
    container: {
        flex: 1,
        backgroundColor: '#09090F'
    },
    content: {
        padding: 16,
        paddingBottom: 64
    },
    sectionHeader: {
        fontSize: 11,
        color: '#A1A1B5',
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
        paddingLeft: 4
    },
    gatewaysContainer: {
        gap: 10
    },
    gatewayCard: {
        backgroundColor: '#171721',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center'
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#DB277715',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: '#DB277730'
    },
    gatewayInfo: {
        flex: 1
    },
    gatewayTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 3
    },
    gatewaySubtitle: {
        fontSize: 12,
        color: '#A1A1AA',
        lineHeight: 16
    }
});
