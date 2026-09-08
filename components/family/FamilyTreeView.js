import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { GitBranch, List, Home, Users, User, Heart, ChevronRight, ShieldAlert, Plus } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { FamilyPeopleViewModel } from '../../services/family/familyPeopleViewModel';

export default function FamilyTreeView({
    persons = [],
    relationships = [],
    households = [],
    activeHousehold = null,
    onSelectPerson = () => {},
    onAddMember = () => {}
}) {
    const [subTab, setSubTab] = useState('Tree'); // 'Tree' | 'List' | 'Households'

    // Build ViewModel
    const vm = FamilyPeopleViewModel.buildFamilyTreeViewModel(persons, relationships, activeHousehold);

    // Group households
    const householdsMap = React.useMemo(() => {
        const map = new Map();
        persons.forEach(p => {
            const hId = p.householdId || p.core?.householdId || 'household_primary';
            const hh = households.find(h => h.id === hId);
            const name = hh?.name || 'Primary Family Residence';
            if (!map.has(name)) map.set(name, []);
            map.get(name).push(p);
        });
        return Array.from(map.entries()).map(([name, members]) => ({ name, members }));
    }, [persons, households]);

    const renderTreeTier = (tier) => {
        if (!tier.members || tier.members.length === 0) return null;
        return (
            <View key={tier.id} style={styles.tierContainer}>
                <View style={styles.tierHeader}>
                    <View style={styles.tierLabelWrap}>
                        <View style={styles.tierIndicatorDot} />
                        <Text style={styles.tierLabel}>{tier.label.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.tierCount}>
                        {tier.members.length} {tier.members.length === 1 ? 'member' : 'members'}
                    </Text>
                </View>

                <View style={styles.tierGrid}>
                    {tier.members.map(p => {
                        const originalPerson = persons.find(x => (x.core?.id || x.id) === p.id) || p;
                        return (
                            <Pressable
                                key={p.id}
                                style={styles.personCard}
                                onPress={() => onSelectPerson(originalPerson)}
                            >
                                <View style={[styles.avatarCircle, { backgroundColor: p.color }]}>
                                    <Text style={styles.avatarInitials}>{p.avatarInitials}</Text>
                                </View>
                                <Text style={styles.personName} numberOfLines={1}>{p.name}</Text>
                                <View style={styles.roleTag}>
                                    <Text style={styles.roleText}>{p.role}</Text>
                                </View>
                                {p.isEmergency && (
                                    <View style={styles.sosTag}>
                                        <ShieldAlert size={10} color="#EF4444" />
                                        <Text style={styles.sosTagText}>SOS #{p.emergencyPriority || 1}</Text>
                                    </View>
                                )}
                                {p.bloodGroup && (
                                    <Text style={styles.bloodGroupText}>🩸 {p.bloodGroup}</Text>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Generation Stats Hero Bar */}
            <View style={styles.statsHero}>
                <View style={styles.statItem}>
                    <Text style={styles.statNum}>{vm.stats.generationsRepresented}</Text>
                    <Text style={styles.statLabel}>Generations</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNum}>{vm.stats.totalMembers}</Text>
                    <Text style={styles.statLabel}>Active Profiles</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNum}>{vm.stats.totalRelationships}</Text>
                    <Text style={styles.statLabel}>Relationships</Text>
                </View>
            </View>

            {/* Sub-tab Switcher */}
            <View style={styles.subTabRow}>
                {[
                    { id: 'Tree', label: 'Generation Tree', icon: GitBranch },
                    { id: 'List', label: 'All Members', icon: List },
                    { id: 'Households', label: 'Households', icon: Home }
                ].map(tab => {
                    const IconComp = tab.icon;
                    const isActive = subTab === tab.id;
                    return (
                        <Pressable
                            key={tab.id}
                            style={[styles.subTabButton, isActive && styles.subTabButtonActive]}
                            onPress={() => setSubTab(tab.id)}
                        >
                            <IconComp size={14} color={isActive ? '#FFFFFF' : '#71717A'} />
                            <Text style={[styles.subTabLabel, isActive && styles.subTabLabelActive]}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* SubTab: Generation Tree View */}
            {subTab === 'Tree' && (
                <View style={styles.contentWrap}>
                    {vm.totalMembers === 0 ? (
                        <LuxuryCard style={styles.emptyCard}>
                            <GitBranch size={32} color="#71717A" />
                            <Text style={styles.emptyTitle}>Family Tree Unconfigured</Text>
                            <Text style={styles.emptySub}>
                                Add your family members to build multi-generational connections and manage care protocols.
                            </Text>
                            <Pressable style={styles.addMemberBtn} onPress={onAddMember}>
                                <Plus size={15} color="#FFFFFF" />
                                <Text style={styles.addMemberBtnText}>Add First Member</Text>
                            </Pressable>
                        </LuxuryCard>
                    ) : (
                        vm.tiers.map(renderTreeTier)
                    )}
                </View>
            )}

            {/* SubTab: All Members List View */}
            {subTab === 'List' && (
                <View style={styles.contentWrap}>
                    {persons.length === 0 ? (
                        <LuxuryCard style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>No Members Registered</Text>
                        </LuxuryCard>
                    ) : (
                        persons.map(p => {
                            const pId = p.core?.id || p.id;
                            const name = p.core?.name || p.name;
                            const role = p.core?.role || p.role;
                            const phone = p.contact?.phone;
                            const color = p.core?.color || '#3B82F6';

                            return (
                                <LuxuryCard key={pId} style={styles.listCard} onPress={() => onSelectPerson(p)}>
                                    <View style={[styles.listAvatar, { backgroundColor: color }]}>
                                        <Text style={styles.listAvatarText}>
                                            {(name || '?').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.listName}>{name}</Text>
                                        <Text style={styles.listRole}>{role} {phone ? `• ${phone}` : ''}</Text>
                                    </View>
                                    <ChevronRight size={16} color="#71717A" />
                                </LuxuryCard>
                            );
                        })
                    )}
                </View>
            )}

            {/* SubTab: Households View */}
            {subTab === 'Households' && (
                <View style={styles.contentWrap}>
                    {householdsMap.map((hh, idx) => (
                        <LuxuryCard key={idx} style={styles.householdCard}>
                            <View style={styles.householdCardHeader}>
                                <Home size={16} color="#3B82F6" />
                                <Text style={styles.householdCardTitle}>{hh.name}</Text>
                                <Text style={styles.householdMemberCount}>({hh.members.length})</Text>
                            </View>
                            <View style={styles.householdMembersRow}>
                                {hh.members.map(m => (
                                    <Pressable
                                        key={m.core?.id || m.id}
                                        style={styles.householdMemberChip}
                                        onPress={() => onSelectPerson(m)}
                                    >
                                        <Text style={styles.hhMemberChipText}>
                                            {m.core?.name || m.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </LuxuryCard>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 40
    },
    statsHero: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: '#121215',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#1F1F24',
        marginBottom: 14
    },
    statItem: {
        alignItems: 'center'
    },
    statNum: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800'
    },
    statLabel: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#27272A'
    },
    subTabRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14
    },
    subTabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181B',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    subTabButtonActive: {
        backgroundColor: '#27272A',
        borderColor: '#3B82F6'
    },
    subTabLabel: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '600'
    },
    subTabLabelActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    contentWrap: {
        gap: 16
    },
    tierContainer: {
        backgroundColor: '#121215',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1F1F24'
    },
    tierHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#18181B'
    },
    tierLabelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    tierIndicatorDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#3B82F6'
    },
    tierLabel: {
        color: '#60A5FA',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1
    },
    tierCount: {
        color: '#71717A',
        fontSize: 11
    },
    tierGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    personCard: {
        width: '31%',
        backgroundColor: '#18181B',
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6
    },
    avatarInitials: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    personName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4
    },
    roleTag: {
        backgroundColor: '#27272A',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        marginBottom: 3
    },
    roleText: {
        color: '#A1A1AA',
        fontSize: 9,
        fontWeight: '700'
    },
    sosTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF444415',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
        gap: 2,
        marginBottom: 2
    },
    sosTagText: {
        color: '#EF4444',
        fontSize: 9,
        fontWeight: '700'
    },
    bloodGroupText: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: '600'
    },
    emptyCard: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 12
    },
    emptySub: {
        color: '#71717A',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 16,
        lineHeight: 18
    },
    addMemberBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8
    },
    addMemberBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    listCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8
    },
    listAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center'
    },
    listAvatarText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    },
    listName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600'
    },
    listRole: {
        color: '#71717A',
        fontSize: 12,
        marginTop: 2
    },
    householdCard: {
        padding: 14,
        marginBottom: 10
    },
    householdCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10
    },
    householdCardTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    householdMemberCount: {
        color: '#71717A',
        fontSize: 12
    },
    householdMembersRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    householdMemberChip: {
        backgroundColor: '#18181B',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    hhMemberChipText: {
        color: '#E4E4E7',
        fontSize: 12
    }
});
