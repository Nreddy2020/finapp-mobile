import {authenticateFamilyDetails} from '../../../services/family/familyDeviceAccess.js';
import {useFocusEffect} from 'expo-router';
import {Notice,Action} from '../../../components/family/navigation/FamilyUI.js';
import {useFamilySelection} from '../../../components/family/navigation/FamilySelection.js';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    AppState,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldAlert } from 'lucide-react-native';

import FamilyHeader from '../../../components/family/navigation/FamilyHeader.js';
import ReadinessHeroCard from '../../../components/family/continuity/ReadinessHeroCard.js';
import CrisisChecklistCard from '../../../components/family/continuity/CrisisChecklistCard.js';
import ReadinessDeficitList from '../../../components/family/continuity/ReadinessDeficitList.js';

import {
    FamilyHouseholdService,
    FamilyContinuityService,
    CONTINUITY_ACCESS_LEVEL
} from '../../../services/family/index.js';

/**
 * Family Emergency Readiness & Crisis Continuity Protocol Screen (/family/more/continuity)
 * 
 * Phase 8: Authoritative offline-first continuity and crisis protocol hub.
 * 
 * Invariants Enforced:
 * - Read-only transient evaluation (zero secondary storage)
 * - Two-level partitioned disclosure (Level 1 Summary vs Level 2 Protected Details)
 * - Safe exit path via ‹ FinLife Home
 * - 1-tap dialer delegation to native OS dialer only
 */
export default function FamilyContinuityScreen() {
    const screenFocused = useRef(false);
    const [loadError,setLoadError] = useState('');
    const {householdId: sharedHouseholdId} = useFamilySelection();
    const router = useRouter();
    const [household, setHousehold] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Protocol state
    const [protocolVM, setProtocolVM] = useState(null);
    const [isLevel2Unlocked, setIsLevel2Unlocked] = useState(false);

    const loadData = useCallback(async (unlockedLevel2 = isLevel2Unlocked) => {
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

            const vm = await FamilyContinuityService.getFamilyContinuityProtocol(currentHh.id, {
                accessLevel: unlockedLevel2
                    ? CONTINUITY_ACCESS_LEVEL.LEVEL_2_PROTECTED
                    : CONTINUITY_ACCESS_LEVEL.LEVEL_1_SUMMARY,
                currentUserRole: 'ADULT_MEMBER'
            });

            setProtocolVM({ unlocked: unlockedLevel2, value: vm });
        } catch (error) {
            setLoadError('Could not load emergency records. Please retry.');
            console.error('[FamilyContinuityScreen] Error loading continuity protocol:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isLevel2Unlocked]);

    useFocusEffect(useCallback(() => { loadData(isLevel2Unlocked); }, [loadData]));
    useFocusEffect(useCallback(() => { screenFocused.current = true; return () => { screenFocused.current = false; setIsLevel2Unlocked(false); }; }, []));

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData(isLevel2Unlocked);
    }, [loadData, isLevel2Unlocked]);

    const handleToggleLevel2 = async () => {
        if (isLevel2Unlocked) { setIsLevel2Unlocked(false); return; }
        try { const unlocked = await authenticateFamilyDetails(); if (screenFocused.current && AppState.currentState === 'active') setIsLevel2Unlocked(unlocked); }
        catch(error) { Alert.alert('Details stay hidden',error.message); }
    };

    useEffect(() => {
        const sub = AppState.addEventListener('change',state => {if(state !== 'active') setIsLevel2Unlocked(false);});
        return () => sub.remove();
    }, []);

    // Never render an earlier protected response after locking or leaving the app.
    const visibleProtocol = protocolVM?.unlocked === isLevel2Unlocked ? protocolVM.value : null;

    return (
        <SafeAreaView style={styles.container} edges={[]}>
            <FamilyHeader
                title="Continuity & Crisis Hub"
                subtitle="Emergency Protocol & Readiness"
                household={household}
                showBack={true}
                fallbackRoute="/family/more"
                showContextBanner={true}
                showTopTabs={false}
            />
            {loadError ? <View style={{padding:16}}><Notice>{loadError}</Notice><Action title="Retry saved records" onPress={() => loadData()}/></View> : null}

            {/* Prominent Global Safe Exit Button */}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#059669" />
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#059669"
                        />
                    }
                >
                    {/* Readiness Hero Card */}
                    <ReadinessHeroCard viewModel={visibleProtocol} />

                    {/* Crisis Checklist & Protocol */}
                    <CrisisChecklistCard
                        viewModel={visibleProtocol}
                        isLevel2Unlocked={isLevel2Unlocked}
                        onToggleLevel2={handleToggleLevel2}
                    />

                    {/* Prioritized Deficits & Remediation Links */}
                    <ReadinessDeficitList deficits={visibleProtocol?.deficits} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090F'
    },
    scrollView: {
        flex: 1
    },
    scrollContent: {
        paddingBottom: 64
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    exitHomeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#1E1B4B',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4338CA'
    },
    exitHomeText: {
        color: '#818CF8',
        fontSize: 12,
        fontWeight: '700'
    },
    topExitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    backBtnText: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '600'
    },
    globalExitBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#171721',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    globalExitText: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '700'
    },
    exitBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#061D15',
        borderBottomWidth: 1,
        borderBottomColor: '#064E3B'
    },
    exitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#064E3B40',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#059669'
    },
    exitButtonText: {
        color: '#10B981',
        fontSize: 13,
        fontWeight: '700'
    },
    exitHelperText: {
        color: '#6EE7B7',
        fontSize: 11,
        fontWeight: '500'
    }
});
