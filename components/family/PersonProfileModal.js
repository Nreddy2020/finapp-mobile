import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    ScrollView,
    Linking,
    Alert
} from 'react-native';
import {
    X,
    Phone,
    Mail,
    MapPin,
    Heart,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Users,
    GitBranch,
    Home,
    Calendar,
    User,
    Edit3,
    Trash2,
    Lock,
    ExternalLink,
    ChevronRight,
    Tag,
    Plus
} from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { FamilyPeopleViewModel } from '../../services/family/familyPeopleViewModel';
import {
    PROFILE_SECTION_ID,
    SECTION_STATUS,
    FamilyRole,
    CircleCategory,
    PrivacyLevel
} from '../../services/family/familyContracts';

export default function PersonProfileModal({
    visible = false,
    person = null,
    allPersons = [],
    relationships = [],
    households = [],
    activeHousehold = null,
    onClose = () => {},
    onEditPerson = () => {},
    onDeletePerson = () => {},
    onAddRelationship = () => {},
    onSelectRelatedPerson = () => {},
    onSwitchHousehold = () => {}
}) {
    if (!visible || !person) return null;

    const [activeSubTab, setActiveSubTab] = useState('Overview'); // 'Overview' | 'Connections' | 'Medical'

    const pId = person.core?.id || person.id;
    const household = households.find(h => h.id === (person.householdId || person.core?.householdId)) || activeHousehold;

    // Build rich view model
    const vm = FamilyPeopleViewModel.buildPersonProfileViewModel(
        person,
        {
            householdCoHabitants: allPersons
                .filter(p => (p.id || p.core?.id) !== pId && (p.householdId || p.core?.householdId) === (person.householdId || person.core?.householdId))
                .map(p => ({
                    id: p.id || p.core?.id,
                    name: p.name || p.core?.name,
                    role: p.role || p.core?.role,
                    isDependent: Boolean(p.isDependent)
                })),
            directRelationships: relationships
                .filter(r => r.fromPersonId === pId || r.toPersonId === pId)
                .map(r => {
                    const isReverse = r.toPersonId === pId;
                    const otherId = isReverse ? r.fromPersonId : r.toPersonId;
                    const otherPerson = allPersons.find(p => (p.id || p.core?.id) === otherId);
                    return {
                        relationshipId: r.id,
                        relatedPersonId: otherId,
                        relatedPersonName: otherPerson?.name || otherPerson?.core?.name || 'Unknown',
                        relatedPersonRole: otherPerson?.role || otherPerson?.core?.role || 'MEMBER',
                        relationshipType: r.relationshipType,
                        isReciprocal: isReverse,
                        notes: r.notes || ''
                    };
                })
        },
        household
    );

    if (!vm) return null;

    const identitySec = vm.sections.find(s => s.id === PROFILE_SECTION_ID.IDENTITY)?.data || {};
    const roleSec = vm.sections.find(s => s.id === PROFILE_SECTION_ID.ROLE)?.data || {};
    const categorySec = vm.sections.find(s => s.id === PROFILE_SECTION_ID.CATEGORY)?.data || {};
    const contactSec = vm.sections.find(s => s.id === PROFILE_SECTION_ID.CONTACT)?.data || {};
    const householdSec = vm.sections.find(s => s.id === PROFILE_SECTION_ID.HOUSEHOLD)?.data || {};
    const relationshipsSec = vm.sections.find(s => s.id === PROFILE_SECTION_ID.RELATIONSHIPS)?.data || {};
    const medicalSec = vm.sections.find(s => s.id === PROFILE_SECTION_ID.MEDICAL_EMERGENCY)?.data || {};
    const legalSec = vm.sections.find(s => s.id === PROFILE_SECTION_ID.GOVERNANCE_LEGAL)?.data || {};
    const privacySec = vm.sections.find(s => s.id === PROFILE_SECTION_ID.PRIVACY)?.data || {};

    const caps = contactSec.capabilities || { canCall: false, canSms: false, canEmail: false };

    const handleCall = () => {
        if (!caps.canCall) {
            Alert.alert('Call Blocked', caps.contactBlockedReason || 'Phone calling restricted.');
            return;
        }
        if (contactSec.phone) {
            Linking.openURL(`tel:${contactSec.phone.replace(/\s+/g, '')}`).catch(() => {});
        }
    };

    const handleSms = () => {
        if (!caps.canSms) {
            Alert.alert('SMS Blocked', caps.contactBlockedReason || 'Messaging restricted.');
            return;
        }
        if (contactSec.phone) {
            Linking.openURL(`sms:${contactSec.phone.replace(/\s+/g, '')}`).catch(() => {});
        }
    };

    const handleEmail = () => {
        if (!caps.canEmail) {
            Alert.alert('Email Blocked', caps.contactBlockedReason || 'Email restricted.');
            return;
        }
        if (contactSec.email) {
            Linking.openURL(`mailto:${contactSec.email}`).catch(() => {});
        }
    };

    const confirmDelete = () => {
        Alert.alert(
            'Remove Family Member',
            `Are you sure you want to remove ${vm.name}? All linked relationships will be cascade-cleaned.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        onDeletePerson(pId);
                        onClose();
                    }
                }
            ]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.avatarBig, { backgroundColor: vm.color }]}>
                                <Text style={styles.avatarBigText}>{vm.avatarInitials}</Text>
                            </View>
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.profileName} numberOfLines={1}>{vm.name}</Text>
                                </View>
                                {vm.preferredName && (
                                    <Text style={styles.preferredName}>"{vm.preferredName}"</Text>
                                )}
                                <View style={styles.badgeRow}>
                                    <View style={styles.roleBadge}>
                                        <Text style={styles.roleBadgeText}>{vm.role}</Text>
                                    </View>
                                    <View style={styles.categoryBadge}>
                                        <Text style={styles.categoryBadgeText}>{vm.circleCategory}</Text>
                                    </View>
                                    {medicalSec.isEmergencyContact && (
                                        <View style={styles.sosBadge}>
                                            <ShieldAlert size={11} color="#EF4444" />
                                            <Text style={styles.sosBadgeText}>SOS #{medicalSec.emergencyPriority || 1}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#FFFFFF" />
                        </Pressable>
                    </View>

                    {/* Quick Communication Actions */}
                    <View style={styles.commActionsRow}>
                        <Pressable
                            style={[styles.commBtn, !caps.canCall && styles.commBtnDisabled]}
                            onPress={handleCall}
                        >
                            <Phone size={15} color={caps.canCall ? '#3B82F6' : '#71717A'} />
                            <Text style={[styles.commBtnText, !caps.canCall && styles.commBtnTextDisabled]}>
                                Call
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.commBtn, !caps.canSms && styles.commBtnDisabled]}
                            onPress={handleSms}
                        >
                            <Mail size={15} color={caps.canSms ? '#10B981' : '#71717A'} />
                            <Text style={[styles.commBtnText, !caps.canSms && styles.commBtnTextDisabled]}>
                                SMS
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.commBtn, !caps.canEmail && styles.commBtnDisabled]}
                            onPress={handleEmail}
                        >
                            <Mail size={15} color={caps.canEmail ? '#8B5CF6' : '#71717A'} />
                            <Text style={[styles.commBtnText, !caps.canEmail && styles.commBtnTextDisabled]}>
                                Email
                            </Text>
                        </Pressable>
                        <Pressable style={styles.editBtn} onPress={() => onEditPerson(person)}>
                            <Edit3 size={15} color="#F59E0B" />
                            <Text style={styles.editBtnText}>Edit</Text>
                        </Pressable>
                    </View>

                    {/* Sub-tabs */}
                    <View style={styles.subTabsRow}>
                        {['Overview', 'Connections', 'Medical'].map(tab => (
                            <Pressable
                                key={tab}
                                style={[styles.subTabPill, activeSubTab === tab && styles.subTabPillActive]}
                                onPress={() => setActiveSubTab(tab)}
                            >
                                <Text style={[styles.subTabPillText, activeSubTab === tab && styles.subTabPillTextActive]}>
                                    {tab}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Body */}
                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                        {activeSubTab === 'Overview' && (
                            <>
                                {/* Section 1: Identity & Demographics */}
                                <View style={styles.sectionBlock}>
                                    <Text style={styles.sectionTitle}>IDENTITY & DEMOGRAPHICS</Text>
                                    <LuxuryCard style={styles.cardPad}>
                                        <View style={styles.dataRow}>
                                            <Text style={styles.dataLabel}>Legal Name</Text>
                                            <Text style={styles.dataValue}>{identitySec.legalName || '—'}</Text>
                                        </View>
                                        <View style={styles.dataRow}>
                                            <Text style={styles.dataLabel}>Date of Birth</Text>
                                            <Text style={styles.dataValue}>
                                                {identitySec.dateOfBirth ? `${identitySec.dateOfBirth} (${identitySec.age})` : 'Not documented'}
                                            </Text>
                                        </View>
                                        <View style={styles.dataRow}>
                                            <Text style={styles.dataLabel}>Gender</Text>
                                            <Text style={styles.dataValue}>{identitySec.gender || 'Unspecified'}</Text>
                                        </View>
                                        <View style={styles.dataRow}>
                                            <Text style={styles.dataLabel}>National ID</Text>
                                            <View style={styles.protectedIdWrap}>
                                                <Lock size={12} color="#10B981" />
                                                <Text style={styles.protectedIdText}>
                                                    {identitySec.nationalIdMasked || 'Protected identifier'}
                                                </Text>
                                            </View>
                                        </View>
                                    </LuxuryCard>
                                </View>

                                {/* Section 2: Household & Residence */}
                                <View style={styles.sectionBlock}>
                                    <Text style={styles.sectionTitle}>HOUSEHOLD & RESIDENCE</Text>
                                    <LuxuryCard style={styles.cardPad}>
                                        <Pressable
                                            style={styles.householdLinkRow}
                                            onPress={() => onSwitchHousehold(householdSec.householdId)}
                                        >
                                            <View style={styles.houseIconWrap}>
                                                <Home size={15} color="#3B82F6" />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={styles.householdName}>{householdSec.householdName}</Text>
                                                <Text style={styles.householdSub}>
                                                    {householdSec.isPrimaryHousehold ? 'Primary Family Residence' : 'Secondary Residence'}
                                                </Text>
                                            </View>
                                            <ChevronRight size={16} color="#71717A" />
                                        </Pressable>
                                        {contactSec.address ? (
                                            <View style={styles.addressRow}>
                                                <MapPin size={13} color="#9CA3AF" />
                                                <Text style={styles.addressText}>{contactSec.address}</Text>
                                            </View>
                                        ) : null}
                                    </LuxuryCard>
                                </View>

                                {/* Section 3: Governance & Legal */}
                                <View style={styles.sectionBlock}>
                                    <Text style={styles.sectionTitle}>GOVERNANCE & LEGAL TAGS</Text>
                                    <LuxuryCard style={styles.cardPad}>
                                        <View style={styles.tagsGrid}>
                                            <View style={[styles.tagPill, legalSec.isNominee && styles.tagPillActive]}>
                                                <Text style={[styles.tagPillText, legalSec.isNominee && styles.tagPillTextActive]}>
                                                    {legalSec.isNominee ? '✓ Nominee Assigned' : 'Not a Nominee'}
                                                </Text>
                                            </View>
                                            <View style={[styles.tagPill, roleSec.isGuardian && styles.tagPillActive]}>
                                                <Text style={[styles.tagPillText, roleSec.isGuardian && styles.tagPillTextActive]}>
                                                    {roleSec.isGuardian ? '✓ Legal Guardian' : 'Not a Guardian'}
                                                </Text>
                                            </View>
                                            <View style={[styles.tagPill, roleSec.isDependent && styles.tagPillActive]}>
                                                <Text style={[styles.tagPillText, roleSec.isDependent && styles.tagPillTextActive]}>
                                                    {roleSec.isDependent ? '✓ Dependent Member' : 'Self-Sufficient'}
                                                </Text>
                                            </View>
                                        </View>
                                    </LuxuryCard>
                                </View>
                            </>
                        )}

                        {activeSubTab === 'Connections' && (
                            <View style={styles.sectionBlock}>
                                <View style={styles.sectionHeaderBetween}>
                                    <Text style={styles.sectionTitle}>DIRECT RELATIONSHIPS ({relationshipsSec.count || 0})</Text>
                                    <Pressable style={styles.addRelBtn} onPress={() => onAddRelationship(person)}>
                                        <Plus size={12} color="#3B82F6" />
                                        <Text style={styles.addRelBtnText}>Link Person</Text>
                                    </Pressable>
                                </View>

                                {(!relationshipsSec.relationships || relationshipsSec.relationships.length === 0) ? (
                                    <LuxuryCard style={styles.cardPad}>
                                        <Text style={styles.emptyPromptText}>
                                            No direct relationships linked yet. Tap "+ Link Person" to connect family edges.
                                        </Text>
                                    </LuxuryCard>
                                ) : (
                                    relationshipsSec.relationships.map((rel, idx) => (
                                        <Pressable
                                            key={rel.relationshipId || idx}
                                            style={styles.relCard}
                                            onPress={() => onSelectRelatedPerson(rel.relatedPersonId)}
                                        >
                                            <View style={styles.relAvatarCircle}>
                                                <Text style={styles.relAvatarText}>
                                                    {rel.relatedPersonName.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={styles.relPersonName}>{rel.relatedPersonName}</Text>
                                                <View style={styles.relBadgeWrap}>
                                                    <Text style={styles.relTypeTag}>{rel.relationshipType}</Text>
                                                    {rel.isReciprocal && (
                                                        <Text style={styles.reciprocalTag}>Reciprocal</Text>
                                                    )}
                                                </View>
                                            </View>
                                            <ChevronRight size={16} color="#71717A" />
                                        </Pressable>
                                    ))
                                )}

                                {/* Co-habitants in same household */}
                                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                                    HOUSEHOLD CO-HABITANTS ({householdSec.coHabitants?.length || 0})
                                </Text>
                                {householdSec.coHabitants?.length === 0 ? (
                                    <LuxuryCard style={styles.cardPad}>
                                        <Text style={styles.emptyPromptText}>Sole resident in this household.</Text>
                                    </LuxuryCard>
                                ) : (
                                    householdSec.coHabitants?.map(co => (
                                        <Pressable
                                            key={co.id}
                                            style={styles.relCard}
                                            onPress={() => onSelectRelatedPerson(co.id)}
                                        >
                                            <View style={[styles.relAvatarCircle, { backgroundColor: '#10B98120' }]}>
                                                <Text style={[styles.relAvatarText, { color: '#10B981' }]}>
                                                    {co.name.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={styles.relPersonName}>{co.name}</Text>
                                                <Text style={styles.coHabitantRole}>{co.role}</Text>
                                            </View>
                                            <ChevronRight size={16} color="#71717A" />
                                        </Pressable>
                                    ))
                                )}
                            </View>
                        )}

                        {activeSubTab === 'Medical' && (
                            <View style={styles.sectionBlock}>
                                <Text style={styles.sectionTitle}>MEDICAL & EMERGENCY PROTOCOL</Text>
                                <LuxuryCard style={styles.cardPad}>
                                    <View style={styles.dataRow}>
                                        <Text style={styles.dataLabel}>Blood Group</Text>
                                        <Text style={[styles.dataValue, { color: '#EF4444', fontWeight: '700' }]}>
                                            {medicalSec.bloodGroup ? `🩸 ${medicalSec.bloodGroup}` : 'Not documented'}
                                        </Text>
                                    </View>
                                    <View style={styles.dataRow}>
                                        <Text style={styles.dataLabel}>Emergency Contact</Text>
                                        <Text style={styles.dataValue}>
                                            {medicalSec.isEmergencyContact ? `Yes (Priority #${medicalSec.emergencyPriority || 1})` : 'No'}
                                        </Text>
                                    </View>
                                    <View style={styles.dataRow}>
                                        <Text style={styles.dataLabel}>24x7 Reachable</Text>
                                        <Text style={styles.dataValue}>{medicalSec.reachable24x7 ? 'Yes' : 'Standard hours'}</Text>
                                    </View>
                                    {medicalSec.allergies && medicalSec.allergies.length > 0 && (
                                        <View style={{ marginTop: 12 }}>
                                            <Text style={styles.dataLabel}>Allergies</Text>
                                            <Text style={styles.dataValueSub}>{medicalSec.allergies.join(', ')}</Text>
                                        </View>
                                    )}
                                    {medicalSec.emergencyNotes && (
                                        <View style={{ marginTop: 12 }}>
                                            <Text style={styles.dataLabel}>Emergency Notes</Text>
                                            <Text style={styles.dataValueSub}>{medicalSec.emergencyNotes}</Text>
                                        </View>
                                    )}
                                </LuxuryCard>
                            </View>
                        )}

                        {/* Danger zone: Delete person */}
                        <View style={styles.dangerZone}>
                            <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
                                <Trash2 size={16} color="#EF4444" />
                                <Text style={styles.deleteBtnText}>Remove from Family</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#09090B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        minHeight: '65%',
        paddingBottom: 24,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#18181B'
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    avatarBig: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarBigText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800'
    },
    profileName: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700'
    },
    preferredName: {
        color: '#9CA3AF',
        fontSize: 13,
        fontStyle: 'italic',
        marginTop: 1
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4
    },
    roleBadge: {
        backgroundColor: '#3B82F620',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4
    },
    roleBadgeText: {
        color: '#60A5FA',
        fontSize: 10,
        fontWeight: '700'
    },
    categoryBadge: {
        backgroundColor: '#27272A',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4
    },
    categoryBadgeText: {
        color: '#A1A1AA',
        fontSize: 10,
        fontWeight: '600'
    },
    sosBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF444420',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 3
    },
    sosBadgeText: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: '700'
    },
    closeBtn: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: '#18181B'
    },
    commActionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#18181B'
    },
    commBtn: {
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
    commBtnDisabled: {
        opacity: 0.4
    },
    commBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600'
    },
    commBtnTextDisabled: {
        color: '#71717A'
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F59E0B15',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: '#F59E0B40'
    },
    editBtnText: {
        color: '#F59E0B',
        fontSize: 12,
        fontWeight: '600'
    },
    subTabsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 4,
        gap: 10
    },
    subTabPill: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: '#18181B'
    },
    subTabPillActive: {
        backgroundColor: '#3B82F6'
    },
    subTabPillText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '600'
    },
    subTabPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    modalScroll: {
        paddingHorizontal: 20,
        paddingTop: 12
    },
    sectionBlock: {
        marginBottom: 16
    },
    sectionTitle: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8
    },
    sectionHeaderBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    addRelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    addRelBtnText: {
        color: '#3B82F6',
        fontSize: 12,
        fontWeight: '600'
    },
    cardPad: {
        padding: 14
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#18181B'
    },
    dataLabel: {
        color: '#71717A',
        fontSize: 13
    },
    dataValue: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    dataValueSub: {
        color: '#D1D5DB',
        fontSize: 13,
        marginTop: 2
    },
    protectedIdWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    protectedIdText: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: '600'
    },
    householdLinkRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    houseIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#3B82F615',
        alignItems: 'center',
        justifyContent: 'center'
    },
    householdName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600'
    },
    householdSub: {
        color: '#71717A',
        fontSize: 11
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#18181B',
        gap: 6
    },
    addressText: {
        color: '#9CA3AF',
        fontSize: 12
    },
    tagsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    tagPill: {
        backgroundColor: '#18181B',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    tagPillActive: {
        backgroundColor: '#10B98115',
        borderColor: '#10B98140'
    },
    tagPillText: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '600'
    },
    tagPillTextActive: {
        color: '#10B981'
    },
    emptyPromptText: {
        color: '#71717A',
        fontSize: 12,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 8
    },
    relCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121215',
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#1F1F24'
    },
    relAvatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#3B82F620',
        alignItems: 'center',
        justifyContent: 'center'
    },
    relAvatarText: {
        color: '#3B82F6',
        fontWeight: '700',
        fontSize: 15
    },
    relPersonName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    coHabitantRole: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    relBadgeWrap: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 3
    },
    relTypeTag: {
        color: '#60A5FA',
        fontSize: 10,
        fontWeight: '700',
        backgroundColor: '#3B82F615',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 3
    },
    reciprocalTag: {
        color: '#9CA3AF',
        fontSize: 10,
        backgroundColor: '#27272A',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 3
    },
    dangerZone: {
        marginTop: 20,
        marginBottom: 30,
        alignItems: 'center'
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
        backgroundColor: '#EF444410',
        borderWidth: 1,
        borderColor: '#EF444430'
    },
    deleteBtnText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '600'
    }
});
