import {Notice,Action} from '../../../components/family/navigation/FamilyUI.js';
import {useFocusEffect} from 'expo-router';
import {useFamilySelection} from '../../../components/family/navigation/FamilySelection.js';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    DollarSign,
    Plus,
    Link2,
    Unlink,
    User,
    Shield,
    Layers,
    ChevronLeft,
    Tag,
    Calendar,
    AlertCircle
} from 'lucide-react-native';

import FamilyHeader from '../../../components/family/navigation/FamilyHeader.js';
import FamilyEmptyState from '../../../components/family/navigation/FamilyEmptyState.js';
import HouseholdFinancialCard from '../../../components/family/financials/HouseholdFinancialCard.js';
import MemberObligationCard from '../../../components/family/financials/MemberObligationCard.js';
import DomainObligationCard from '../../../components/family/financials/DomainObligationCard.js';
import LinkCommitmentModal from '../../../components/family/financials/LinkCommitmentModal.js';

import {
    FamilyHouseholdService,
    FamilyFinancialService,
    FamilyOperationsService,
    FamilyRepository
} from '../../../services/family/index.js';

/**
 * Family Financial Coordination Hub (/family/more/financials)
 * 
 * Phase 6: Bridges household members and responsibility domains to existing commitments.
 * Provides household-level visibility into shared obligations and payer allocations.
 * Strict Invariants:
 * - Zero secondary ledgers or balance mutations
 * - Lead payer allocated 100% of obligation
 * - Backup payer allocated 0% (informational only)
 * - Safe exit path via · FinLife Home
 */
export default function FamilyFinancialsScreen() {
    const loadSequence = useRef(0);
    const [loadError,setLoadError] = useState('');
    const {householdId: sharedHouseholdId} = useFamilySelection();
    const router = useRouter();
    const [household, setHousehold] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Financial data state
    const [summary, setSummary] = useState(null);
    const [links, setLinks] = useState([]);
    const [unlinkedCommitments, setUnlinkedCommitments] = useState([]);
    const [members, setMembers] = useState([]);
    const [responsibilities, setResponsibilities] = useState([]);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);

    const loadData = useCallback(async () => {
        const sequence = ++loadSequence.current;
        setLoading(true);
        setSummary(null);
        setLinks([]);
        setLoadError('');
        try {
            const households = await FamilyHouseholdService.listHouseholds();
            if (!households || households.length === 0) {
                setHousehold(null);
                setLoading(false);
                return;
            }

            const currentHh = households.find(h => h.id === sharedHouseholdId);
            if (!currentHh) throw new Error('Choose a household');
            const fullHh = await FamilyHouseholdService.getHousehold(currentHh.id);
            if (sequence !== loadSequence.current) return;
            setHousehold(fullHh);

            // Fetch members and responsibilities
            const [memberships, respList] = await Promise.all([
                FamilyRepository.listMemberships({ householdId: currentHh.id }),
                FamilyOperationsService.listResponsibilities({householdId:currentHh.id})
            ]);

            const activeMemberships = memberships.filter(m => m.status === 'ACTIVE');
            const memberPersons = await Promise.all(
                activeMemberships.map(async m => {
                    const p = await FamilyRepository.getPerson(m.personId);
                    return p ? { ...p, role: m.role } : null;
                })
            );
            const validMembers = memberPersons.filter(Boolean);
            if (sequence !== loadSequence.current) return;
            setMembers(validMembers);
            setResponsibilities(respList || []);

            // Fetch financial summary and links
            const [finSummary, finLinks, unlinked] = await Promise.all([
                FamilyFinancialService.getHouseholdFinancialSummary(currentHh.id),
                FamilyFinancialService.listHouseholdFinancialLinks(currentHh.id),
                FamilyFinancialService.getUnlinkedCommitments(currentHh.id)
            ]);

            if (sequence !== loadSequence.current) return;
            setSummary(finSummary);
            setLinks(finLinks || []);
            setUnlinkedCommitments(unlinked || []);
        } catch (err) {
            if (sequence !== loadSequence.current) return;
            setLoadError('Could not load saved records. Please retry.');
            console.error('Error loading family financials:', err);
        } finally {
            if (sequence !== loadSequence.current) return;
            setLoading(false);
            setRefreshing(false);
        }
    }, [sharedHouseholdId]);

    useFocusEffect(useCallback(() => { loadData(); return () => { loadSequence.current++; }; }, [loadData]));

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    const handleLinkCommitment = async (linkData) => {
        await FamilyFinancialService.linkCommitment(linkData);
        await loadData();
    };

    const handleUnlink = (link) => {
        Alert.alert(
            'Unlink Commitment',
            `Remove "${link.commitmentName || 'this commitment'}" from household coordination? The underlying commitment will remain intact.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unlink',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await FamilyFinancialService.unlinkCommitment(link.id);
                            await loadData();
                        } catch (err) {
                            Alert.alert('Error', err.message || 'Failed to unlink commitment');
                        }
                    }
                }
            ]
        );
    };

    const handleHomeExit = () => {
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={[]}>
            <FamilyHeader 
                title="Family Financial Coordination" 
                subtitle="Shared Obligations & Allocations"
                showBack={true}
                fallbackRoute="/family/more"
                showContextBanner={false}
                showTopTabs={false}
            />
            {loadError ? <View style={{padding:16}}><Notice>{loadError}</Notice><Action title="Retry saved records" onPress={() => loadData()}/></View> : null}

            {/* Prominent Global Safe Exit Button */}

            <ScrollView 
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        tintColor="#38BDF8"
                    />
                }
            >
                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color="#38BDF8" />
                        <Text style={styles.loadingText}>Loading household financial coordination...</Text>
                    </View>
                ) : !household ? (
                    <FamilyEmptyState />
                ) : (
                    <View>
                        {/* 1. Household Financial Summary Card */}
                        <HouseholdFinancialCard 
                            summary={summary}
                            
                        />

                        {summary?.missingCommitmentCount > 0 && <View style={{gap: 10, marginBottom: 16}}><Notice>A linked expense is unavailable. Totals are incomplete. Your saved link is preserved.</Notice><Action title="Retry linked expenses" onPress={loadData}/></View>}
                        {/* 2. Action Bar: Link Commitment & Unlinked Alert */}
                        <View style={styles.actionSection}>
                            <View style={styles.actionHeaderRow}>
                                <Text style={styles.sectionTitle}>Linked Commitments ({links.length})</Text>
                                <TouchableOpacity
                                    style={styles.linkButton}
                                    onPress={() => setModalVisible(true)}
                                >
                                    <Plus size={14} color="#000000" />
                                    <Text style={styles.linkButtonText}>Link Commitment</Text>
                                </TouchableOpacity>
                            </View>

                            {unlinkedCommitments.length > 0 && (
                                <View style={styles.unlinkedNotice}>
                                    <AlertCircle size={14} color="#F59E0B" />
                                    <Text style={styles.unlinkedNoticeText}>
                                        {unlinkedCommitments.length} commitment{unlinkedCommitments.length === 1 ? '' : 's'} available to link.
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* 3. Linked Commitments List */}
                        {links.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Link2 size={32} color="#52525B" style={{ alignSelf: 'center', marginBottom: 8 }} />
                                <Text style={styles.emptyTitle}>No Commitments Linked Yet</Text>
                                <Text style={styles.emptyDesc}>
                                    Link your rent, utility bills, subscriptions, or insurance to track who is responsible for each payment in the household.
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyLinkBtn}
                                    onPress={() => setModalVisible(true)}
                                >
                                    <Plus size={14} color="#38BDF8" />
                                    <Text style={styles.emptyLinkBtnText}>Link First Commitment</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.commitmentsList}>
                                {links.map(link => (
                                    <View key={link.id} style={styles.commitmentCard}>
                                        <View style={styles.commTopRow}>
                                            <View style={styles.commTitleGroup}>
                                                <Text style={styles.commName}>{link.commitmentName}</Text>
                                                <Text style={styles.commMeta}>
                                                    {link.commitmentCategory || 'General'} · {link.commitmentFrequency || 'MONTHLY'}
                                                </Text>
                                            </View>
                                            <View style={styles.commAmountGroup}>
                                                <Text style={styles.commAmount}>{link.sourceUnavailable ? 'Unavailable' : `₹${link.monthlyRupees?.toLocaleString('en-IN')}`}</Text>
                                                <Text style={styles.commPeriod}>/ mo</Text>
                                            </View>
                                        </View>

                                        <View style={styles.commPillRow}>
                                            <View style={styles.payerPill}>
                                                <User size={10} color="#38BDF8" />
                                                <Text style={styles.payerPillText}>Lead: {link.leadPayerName} (100%)</Text>
                                            </View>

                                            {link.backupPayerName && (
                                                <View style={styles.backupPill}>
                                                    <Shield size={10} color="#A1A1AA" />
                                                    <Text style={styles.backupPillText}>Backup: {link.backupPayerName} (0%)</Text>
                                                </View>
                                            )}

                                            {link.responsibilityName && (
                                                <View style={[styles.domainPill, { borderColor: (link.responsibilityColor || '#3B82F6') + '40' }]}>
                                                    <Layers size={10} color={link.responsibilityColor || '#3B82F6'} />
                                                    <Text style={[styles.domainPillText, { color: link.responsibilityColor || '#3B82F6' }]}>
                                                        {link.responsibilityName}
                                                    </Text>
                                                </View>
                                            )}

                                            <TouchableOpacity 
                                                style={styles.unlinkBtn}
                                                onPress={() => handleUnlink(link)}
                                            >
                                                <Unlink size={11} color="#EF4444" />
                                                <Text style={styles.unlinkText}>Unlink</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {link.notes ? (
                                            <Text style={styles.commNotes}>"{link.notes}"</Text>
                                        ) : null}
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* 4. Member Obligation Breakdown */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Member Obligations Breakdown</Text>
                            <Text style={styles.sectionSubtitle}>
                                Lead payers carry 100% of obligation · Backup payers carry 0%
                            </Text>
                            {!summary?.missingCommitmentCount && summary?.memberAllocations?.map(member => (
                                <MemberObligationCard 
                                    key={member.personId}
                                    member={member}
                                    totalMonthlyRupees={summary.totalMonthlyCommitmentsRupees}
                                />
                            ))}
                        </View>

                        {/* 5. Responsibility Domain Breakdown */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Obligations by Domain</Text>
                            <Text style={styles.sectionSubtitle}>
                                Grouped by household responsibility area
                            </Text>
                            {!summary?.missingCommitmentCount && summary?.domainAllocations?.map(domain => (
                                <DomainObligationCard 
                                    key={domain.responsibilityId}
                                    domain={domain}
                                    totalMonthlyRupees={summary.totalMonthlyCommitmentsRupees}
                                />
                            ))}

                            {/* Unassigned / General Household bucket */}
                            {!summary?.missingCommitmentCount && summary?.unassignedDomain && summary.unassignedDomain.linkedCount > 0 && (
                                <DomainObligationCard 
                                    domain={summary.unassignedDomain}
                                    totalMonthlyRupees={summary.totalMonthlyCommitmentsRupees}
                                />
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Link Commitment Form Modal */}
            <LinkCommitmentModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleLinkCommitment}
                householdId={household?.id}
                unlinkedCommitments={unlinkedCommitments}
                householdMembers={members}
                responsibilities={responsibilities}
            />
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
        backgroundColor: '#09090F',
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    exitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: 'rgba(219, 39, 119, 0.1)'
    },
    exitButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#DB2777'
    },
    exitHelperText: {
        fontSize: 11,
        color: '#71717A'
    },
    container: {
        flex: 1,
        backgroundColor: '#09090F'
    },
    content: {
        padding: 16,
        paddingBottom: 64
    },
    loadingBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12
    },
    loadingText: {
        color: '#71717A',
        fontSize: 13
    },
    actionSection: {
        marginBottom: 14
    },
    actionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    section: {
        marginTop: 20
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    sectionSubtitle: {
        fontSize: 11,
        color: '#71717A',
        marginTop: 2,
        marginBottom: 12
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#38BDF8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8
    },
    linkButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000000'
    },
    unlinkedNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)'
    },
    unlinkedNoticeText: {
        fontSize: 11,
        color: '#FCD34D',
        fontWeight: '500',
        flex: 1
    },
    emptyCard: {
        backgroundColor: '#171721',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 16
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 6
    },
    emptyDesc: {
        fontSize: 12,
        color: '#71717A',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16
    },
    emptyLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)'
    },
    emptyLinkBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#38BDF8'
    },
    commitmentsList: {
        gap: 10,
        marginBottom: 16
    },
    commitmentCard: {
        backgroundColor: '#171721',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    commTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10
    },
    commTitleGroup: {
        flex: 1
    },
    commName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    commMeta: {
        fontSize: 11,
        color: '#71717A',
        marginTop: 2
    },
    commAmountGroup: {
        flexDirection: 'row',
        alignItems: 'baseline'
    },
    commAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#38BDF8'
    },
    commPeriod: {
        fontSize: 11,
        color: '#71717A',
        marginLeft: 2
    },
    commPillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center'
    },
    payerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)'
    },
    payerPillText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#38BDF8'
    },
    backupPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(161, 161, 170, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(161, 161, 170, 0.2)'
    },
    backupPillText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    domainPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        backgroundColor: '#171721'
    },
    domainPillText: {
        fontSize: 10,
        fontWeight: '600'
    },
    unlinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        marginLeft: 'auto'
    },
    unlinkText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#EF4444'
    },
    commNotes: {
        fontSize: 11,
        color: '#A1A1AA',
        fontStyle: 'italic',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    }
});
