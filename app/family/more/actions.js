import {useFocusEffect} from 'expo-router';
import {Notice,Action} from '../../../components/family/navigation/FamilyUI.js';
import {useFamilySelection} from '../../../components/family/navigation/FamilySelection.js';
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Calendar, Inbox } from 'lucide-react-native';

import FamilyHeader from '../../../components/family/navigation/FamilyHeader.js';
import FamilyEmptyState from '../../../components/family/navigation/FamilyEmptyState.js';
import HouseholdActionOverviewCard from '../../../components/family/actions/HouseholdActionOverviewCard.js';
import ActionHorizonFilterBar from '../../../components/family/actions/ActionHorizonFilterBar.js';
import ActionHorizonItemCard from '../../../components/family/actions/ActionHorizonItemCard.js';

import {
    FamilyHouseholdService,
    FamilyActionService
} from '../../../services/family/index.js';

/**
 * Household Action & Renewal Horizon Screen (/family/more/actions)
 * 
 * Phase 7: Unified Coordination Engine for time-sensitive obligations
 * across Financials, Vault Documents, Operations Tasks, and Protection Directives.
 * 
 * Invariants Enforced:
 * - Read-only transient projection (zero secondary storage)
 * - Deep-link handoff to authoritative domain screens
 * - Authoritative safe exit path via ‹ FinLife Home
 */
export default function HouseholdActionsScreen() {
    const [loadError,setLoadError] = useState('');
    const {householdId: sharedHouseholdId} = useFamilySelection();
    const router = useRouter();
    const [household, setHousehold] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filter states
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [domainFilter, setDomainFilter] = useState('ALL');

    // Horizon data
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState(null);

    const loadData = useCallback(async (currentStatus = statusFilter, currentDomain = domainFilter) => {
        setLoadError('');
        try {
            const households = await FamilyHouseholdService.listHouseholds();
            if (!households || households.length === 0) {
                setHousehold(null);
                setLoading(false);
                return;
            }

            const currentHh = households.find(h => h.id === sharedHouseholdId);
            const fullHh = await FamilyHouseholdService.getHousehold(currentHh.id);
            setHousehold(fullHh);

            // Compute pure horizon across all 4 domains
            const horizon = await FamilyActionService.getHouseholdActionHorizon(
                currentHh.id,
                { status: currentStatus, domain: currentDomain, personId: 'ALL' }
            );

            setItems(horizon.items || []);
            setSummary(horizon.summary || null);
        } catch (err) {
            setLoadError('Could not load saved records. Please retry.');
            console.error('Family screen load failed:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter, domainFilter]);

    useFocusEffect(useCallback(() => { loadData(statusFilter, domainFilter); }, [loadData]));

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData(statusFilter, domainFilter);
    }, [statusFilter, domainFilter, loadData]);

    const handleHomeExit = () => {
        router.replace('/(tabs)');
    };

    const handleSelectStatus = (status) => {
        setStatusFilter(status);
    };

    const handleSelectDomain = (domain) => {
        setDomainFilter(domain);
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={[]}>
            <FamilyHeader 
                title="Action Horizon" 
                subtitle="Household Renewal & Coordination"
                household={household}
                showBack={true}
                fallbackRoute="/family/more"
                showContextBanner={true}
                showTopTabs={false}
            />
            {loadError ? <View style={{padding:16}}><Notice>{loadError}</Notice><Action title="Retry saved records" onPress={() => loadData()}/></View> : null}

            {/* Prominent Global Safe Exit Button */}

            <ScrollView 
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DB2777" />
                }
            >
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#DB2777" />
                        <Text style={styles.loadingText}>Synthesizing household obligations...</Text>
                    </View>
                ) : !household ? (
                    <FamilyEmptyState />
                ) : (
                    <View>
                        {/* 1. Overview Summary Card */}
                        <HouseholdActionOverviewCard summary={summary} />

                        {/* 2. Filter Bar */}
                        <ActionHorizonFilterBar 
                            activeStatus={statusFilter}
                            activeDomain={domainFilter}
                            onSelectStatus={handleSelectStatus}
                            onSelectDomain={handleSelectDomain}
                        />

                        {/* 3. Action Items List */}
                        <View style={styles.listContainer}>
                            <View style={styles.listHeader}>
                                <Text style={styles.listTitle}>
                                    ACTIVE HORIZON ({items.length})
                                </Text>
                                {(statusFilter !== 'ALL' || domainFilter !== 'ALL') && (
                                    <TouchableOpacity 
                                        onPress={() => { setStatusFilter('ALL'); setDomainFilter('ALL'); }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.clearFilterText}>Reset Filters</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {items.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <Inbox size={32} color="#52525B" style={{ alignSelf: 'center', marginBottom: 8 }} />
                                    <Text style={styles.emptyTitle}>No Obligations in this Filter</Text>
                                    <Text style={styles.emptyDesc}>
                                        There are no upcoming deadlines, document expiries, tasks, or directives matching the selected criteria.
                                    </Text>
                                </View>
                            ) : (
                                items.map((item) => (
                                    <ActionHorizonItemCard key={item.id} item={item} />
                                ))
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#09090F'
    },
    exitBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#121215',
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    exitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(219, 39, 119, 0.12)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(219, 39, 119, 0.3)',
        gap: 4
    },
    exitButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#DB2777'
    },
    exitHelperText: {
        fontSize: 11,
        color: '#71717A'
    },
    container: {
        flex: 1
    },
    content: {
        padding: 16,
        paddingBottom: 64
    },
    centerContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center'
    },
    loadingText: {
        marginTop: 12,
        fontSize: 13,
        color: '#A1A1AA'
    },
    listContainer: {
        marginTop: 4
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 2
    },
    listTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#A1A1AA',
        letterSpacing: 0.8
    },
    clearFilterText: {
        fontSize: 12,
        color: '#EC4899',
        fontWeight: '600'
    },
    emptyCard: {
        backgroundColor: '#171721',
        borderRadius: 14,
        padding: 24,
        borderWidth: 1,
        borderColor: '#27272A',
        alignItems: 'center',
        marginTop: 8
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#E4E4E7',
        marginBottom: 6
    },
    emptyDesc: {
        fontSize: 12,
        color: '#71717A',
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 280
    }
});
