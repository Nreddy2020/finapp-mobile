import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    Linking,
    Alert
} from 'react-native';
import {
    Users,
    UserCheck,
    Stethoscope,
    Phone,
    Mail,
    MapPin,
    AlertCircle,
    ShieldAlert,
    Search,
    X,
    Plus,
    Lock
} from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { CircleCategory, PrivacyLevel } from '../../services/family/familyContracts';
import { FamilyPeopleViewModel } from '../../services/family/familyPeopleViewModel';

export default function PeopleTrustedCircleView({
    persons = [],
    onSelectPerson = () => {},
    onAddPerson = () => {}
}) {
    const [selectedCategory, setSelectedCategory] = useState(CircleCategory.FAMILY);
    const [searchQuery, setSearchQuery] = useState('');

    const vm = FamilyPeopleViewModel.buildTrustedCircleViewModel(persons, selectedCategory, searchQuery);

    const handleCall = (contact) => {
        if (!contact.capabilities.canCall) {
            Alert.alert('Call Gated', contact.capabilities.contactBlockedReason || 'Phone call not available.');
            return;
        }
        if (contact.phone && contact.phone !== 'Protected') {
            Linking.openURL(`tel:${contact.phone.replace(/\s+/g, '')}`).catch(() => {});
        }
    };

    const handleEmail = (contact) => {
        if (!contact.capabilities.canEmail) {
            Alert.alert('Email Gated', contact.capabilities.contactBlockedReason || 'Email not available.');
            return;
        }
        if (contact.email && contact.email !== 'Protected') {
            Linking.openURL(`mailto:${contact.email}`).catch(() => {});
        }
    };

    return (
        <View style={styles.container}>
            {/* Search Input Bar */}
            <View style={styles.searchBar}>
                <Search size={15} color="#71717A" />
                <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search by name, role, or occupation..."
                    placeholderTextColor="#71717A"
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                        <X size={14} color="#A1A1AA" />
                    </Pressable>
                )}
            </View>

            {/* Category Tabs */}
            <View style={styles.categoryTabsRow}>
                {[
                    { id: CircleCategory.FAMILY, label: 'Family', count: vm.counts.family, icon: Users },
                    { id: CircleCategory.FRIENDS, label: 'Friends', count: vm.counts.friends, icon: UserCheck },
                    { id: CircleCategory.OTHERS, label: 'Care & Advisors', count: vm.counts.others, icon: Stethoscope }
                ].map(cat => {
                    const IconComp = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                        <Pressable
                            key={cat.id}
                            style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <IconComp size={13} color={isActive ? '#FFFFFF' : '#71717A'} />
                            <Text style={[styles.categoryTabLabel, isActive && styles.categoryTabLabelActive]}>
                                {cat.label} ({cat.count})
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Contacts Stream */}
            <View style={styles.listContainer}>
                {vm.contacts.length === 0 ? (
                    <LuxuryCard style={styles.emptyCard}>
                        <AlertCircle size={28} color="#71717A" />
                        <Text style={styles.emptyTitle}>
                            {searchQuery ? 'No contacts match your query' : `No contacts in ${selectedCategory}`}
                        </Text>
                        <Text style={styles.emptySub}>
                            Register trusted people, doctors, or advisors to unlock coordinated care.
                        </Text>
                        <Pressable style={styles.addBtn} onPress={onAddPerson}>
                            <Plus size={14} color="#FFFFFF" />
                            <Text style={styles.addBtnText}>Add Person</Text>
                        </Pressable>
                    </LuxuryCard>
                ) : (
                    vm.contacts.map(c => {
                        const originalPerson = persons.find(p => (p.core?.id || p.id) === c.id) || c;
                        return (
                            <LuxuryCard
                                key={c.id}
                                style={styles.contactCard}
                                onPress={() => onSelectPerson(originalPerson)}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.headerLeft}>
                                        <View style={[styles.avatar, { backgroundColor: c.color }]}>
                                            <Text style={styles.avatarText}>{c.avatarInitials}</Text>
                                        </View>
                                        <View style={styles.nameBlock}>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.personName}>{c.name}</Text>
                                                {c.isEmergency && (
                                                    <View style={styles.emergencyBadge}>
                                                        <ShieldAlert size={10} color="#EF4444" />
                                                        <Text style={styles.emergencyText}>SOS #{c.emergencyPriority || 1}</Text>
                                                    </View>
                                                )}
                                                {c.privacyLevel === PrivacyLevel.RESTRICTED && (
                                                    <View style={styles.privacyBadge}>
                                                        <Lock size={9} color="#F59E0B" />
                                                        <Text style={styles.privacyText}>Protected</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.personRole}>
                                                {c.role} {c.occupation ? `• ${c.occupation}` : ''}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Tag Row */}
                                <View style={styles.tagsRow}>
                                    {c.bloodGroup && (
                                        <View style={styles.tagPill}>
                                            <Text style={[styles.tagPillText, { color: '#EF4444' }]}>🩸 {c.bloodGroup}</Text>
                                        </View>
                                    )}
                                    {c.isNominee && (
                                        <View style={styles.tagPill}>
                                            <Text style={styles.tagPillText}>Nominee</Text>
                                        </View>
                                    )}
                                    {c.isGuardian && (
                                        <View style={styles.tagPill}>
                                            <Text style={styles.tagPillText}>Guardian</Text>
                                        </View>
                                    )}
                                    {c.isDependent && (
                                        <View style={styles.tagPill}>
                                            <Text style={styles.tagPillText}>Dependent</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Actions Row */}
                                <View style={styles.actionsRow}>
                                    <Pressable
                                        style={[styles.actionBtn, !c.capabilities.canCall && styles.actionBtnDisabled]}
                                        onPress={() => handleCall(c)}
                                    >
                                        <Phone size={13} color={c.capabilities.canCall ? '#3B82F6' : '#71717A'} />
                                        <Text style={[styles.actionBtnText, !c.capabilities.canCall && styles.actionBtnTextDisabled]}>
                                            {c.capabilities.canCall ? (c.phone || 'Call') : 'Protected'}
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.actionBtn, !c.capabilities.canEmail && styles.actionBtnDisabled]}
                                        onPress={() => handleEmail(c)}
                                    >
                                        <Mail size={13} color={c.capabilities.canEmail ? '#8B5CF6' : '#71717A'} />
                                        <Text style={[styles.actionBtnText, !c.capabilities.canEmail && styles.actionBtnTextDisabled]}>
                                            {c.capabilities.canEmail ? (c.email ? 'Email' : 'No Email') : 'Protected'}
                                        </Text>
                                    </Pressable>
                                </View>
                            </LuxuryCard>
                        );
                    })
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 40
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121215',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#1F1F24',
        marginBottom: 12,
        gap: 8
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 13,
        padding: 0
    },
    clearSearchBtn: {
        padding: 4
    },
    categoryTabsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14
    },
    categoryTab: {
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
    categoryTabActive: {
        backgroundColor: '#27272A',
        borderColor: '#3B82F6'
    },
    categoryTabLabel: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '600'
    },
    categoryTabLabelActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    listContainer: {
        gap: 12
    },
    emptyCard: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginTop: 10
    },
    emptySub: {
        color: '#71717A',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 14
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 8
    },
    addBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    contactCard: {
        padding: 14
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    nameBlock: {
        marginLeft: 12,
        flex: 1
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    personName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    emergencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF444415',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
        gap: 2
    },
    emergencyText: {
        color: '#EF4444',
        fontSize: 9,
        fontWeight: '700'
    },
    privacyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B15',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
        gap: 2
    },
    privacyText: {
        color: '#F59E0B',
        fontSize: 9,
        fontWeight: '700'
    },
    personRole: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#18181B'
    },
    tagPill: {
        backgroundColor: '#18181B',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4
    },
    tagPillText: {
        color: '#A1A1AA',
        fontSize: 10,
        fontWeight: '600'
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181B',
        paddingVertical: 7,
        borderRadius: 6,
        gap: 6,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    actionBtnDisabled: {
        opacity: 0.4
    },
    actionBtnText: {
        color: '#E4E4E7',
        fontSize: 11,
        fontWeight: '600'
    },
    actionBtnTextDisabled: {
        color: '#71717A'
    }
});
