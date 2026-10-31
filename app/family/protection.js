import {useFocusEffect} from 'expo-router';
import {Notice,Action} from '../../components/family/navigation/FamilyUI.js';
import {useFamilySelection} from '../../components/family/navigation/FamilySelection.js';
import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    RefreshControl,
    Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
    Shield, 
    Phone, 
    Plus, 
    Archive, 
    FileText, 
    CheckCircle2, 
    AlertTriangle,
    HeartHandshake
} from 'lucide-react-native';
import FamilyHeader from '../../components/family/navigation/FamilyHeader.js';
import FamilyEmptyState from '../../components/family/navigation/FamilyEmptyState.js';
import ReadinessAuditCard from '../../components/family/protection/ReadinessAuditCard.js';
import EmergencyContactCard from '../../components/family/protection/EmergencyContactCard.js';
import EmergencyContactModal from '../../components/family/protection/EmergencyContactModal.js';
import ProtectionItemCard from '../../components/family/protection/ProtectionItemCard.js';
import ProtectionItemModal from '../../components/family/protection/ProtectionItemModal.js';
import { 
    FamilyHouseholdService, 
    FamilyProtectionService,
    FamilyDocumentService,
    FamilyRepository,
    ReadinessLevel
} from '../../services/family/index.js';

/**
 * Phase 5 Protection & Care Hub (/family/protection)
 * Coordinates emergency contacts, healthcare/legal directives, and deterministic family readiness.
 */
export default function FamilyProtectionScreen() {
    const {householdId: sharedHouseholdId} = useFamilySelection();
    const [household, setHousehold] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Active tab: 'contacts' | 'directives'
    const [activeTab, setActiveTab] = useState('contacts');

    // Data lists
    const [readiness, setReadiness] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [protectionItems, setProtectionItems] = useState([]);
    const [members, setMembers] = useState([]);
    const [documents, setDocuments] = useState([]);

    // Filter
    const [showArchived, setShowArchived] = useState(false);

    // Modals
    const [contactModalVisible, setContactModalVisible] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);

    const [protectionModalVisible, setProtectionModalVisible] = useState(false);
    const [selectedProtectionItem, setSelectedProtectionItem] = useState(null);

    const [loadError,setLoadError] = useState('');

    // Load active household & data
    const loadData = useCallback(async () => {
        setLoadError('');
        try {
            const hh = await FamilyHouseholdService.getHousehold(sharedHouseholdId);
            if (!hh) throw new Error('Household is unavailable. Choose another household.');
            setHousehold(hh);
            const [evalResult, contactList, protList, memberList, docList] = await Promise.all([
                FamilyProtectionService.evaluateReadiness(hh.id),
                FamilyProtectionService.listEmergencyContacts(hh.id, { includeArchived: showArchived }),
                FamilyProtectionService.listProtectionItems(hh.id, { includeArchived: showArchived }),
                FamilyRepository.getMembers(hh.id),
                FamilyDocumentService.listDocuments({householdId:hh.id})
            ]);

            setReadiness(evalResult);
            setContacts(contactList || []);
            setProtectionItems(protList || []);
            setMembers(memberList || []);
            setDocuments(docList || []);
        } catch (err) {
            setReadiness(null); setLoadError('Could not load Protection. Please retry.');
            console.error('Error loading protection data:', err);
        } finally {setLoading(false);setRefreshing(false);}
    }, [sharedHouseholdId, showArchived]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // -------------------------------------------------------------------------
    // EMERGENCY CONTACT ACTIONS
    // -------------------------------------------------------------------------

    const handleOpenAddContact = () => {
        setSelectedContact(null);
        setContactModalVisible(true);
    };

    const handleEditContact = (contact) => {
        setSelectedContact(contact);
        setContactModalVisible(true);
    };

    const handleSaveContact = async (formData) => {
        try {
            await FamilyProtectionService.saveEmergencyContact({
                ...formData,
                householdId: household.id
            });
            setContactModalVisible(false);
            setSelectedContact(null);
            await loadData();
        } catch (err) {
            throw err;
        }
    };

    const handleArchiveContact = (contact) => {
        Alert.alert(
            'Archive Emergency Contact',
            `Are you sure you want to archive ${contact.displayName}? It will be excluded from active emergency readiness.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Archive',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await FamilyProtectionService.archiveEmergencyContact(contact.id);
                            await loadData();
                        } catch (err) {
                            Alert.alert('Archive Error', err.message);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteContact = (contact) => {
        Alert.alert(
            'Delete Emergency Contact',
            `Permanently delete ${contact.displayName}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await FamilyProtectionService.deleteEmergencyContact(contact.id);
                            await loadData();
                        } catch (err) {
                            Alert.alert('Delete Blocked', err.message);
                        }
                    }
                }
            ]
        );
    };

    // -------------------------------------------------------------------------
    // PROTECTION DIRECTIVE ACTIONS
    // -------------------------------------------------------------------------

    const handleOpenAddProtection = () => {
        setSelectedProtectionItem(null);
        setProtectionModalVisible(true);
    };

    const handleEditProtection = (item) => {
        setSelectedProtectionItem(item);
        setProtectionModalVisible(true);
    };

    const handleSaveProtection = async (formData) => {
        try {
            await FamilyProtectionService.saveProtectionItem({
                ...formData,
                householdId: household.id
            });
            setProtectionModalVisible(false);
            setSelectedProtectionItem(null);
            await loadData();
        } catch (err) {
            throw err;
        }
    };

    const handleArchiveProtection = (item) => {
        Alert.alert(
            'Archive Protection Directive',
            `Archive "${item.title}"? It will no longer satisfy active readiness standards.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Archive',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await FamilyProtectionService.archiveProtectionItem(item.id);
                            await loadData();
                        } catch (err) {
                            Alert.alert('Archive Error', err.message);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteProtection = (item) => {
        Alert.alert(
            'Delete Protection Directive',
            `Permanently delete "${item.title}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await FamilyProtectionService.deleteProtectionItem(item.id);
                            await loadData();
                        } catch (err) {
                            Alert.alert('Delete Blocked', err.message);
                        }
                    }
                }
            ]
        );
    };

    const activeContactsCount = contacts.filter(c => !c.isArchived).length;
    const activeDirectivesCount = protectionItems.filter(p => p.status !== 'ARCHIVED').length;

    return (
        <SafeAreaView style={styles.safeArea} edges={[]}>
            <FamilyHeader 
                title="Protection & Care" 
                subtitle="Continuity & Safety"
                household={household}
                showBack={false}
                showContextBanner={true}
                showTopTabs={true}
            />

            {loadError ? <View style={{padding:16}}><Notice>{loadError}</Notice><Action title="Retry Protection" onPress={loadData}/></View> : null}
            <ScrollView 
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        tintColor="#10B981" 
                    />
                }
            >
                {!loading && !household ? (
                    <FamilyEmptyState />
                ) : (
                    <View>
                        {/* Authoritative Family Readiness Audit Card */}
                        {readiness && (
                            <ReadinessAuditCard 
                                readiness={readiness} 
                                onRefresh={loadData}
                            />
                        )}

                        {/* Segmented Switcher: Contacts vs Protection Items */}
                        <View style={styles.tabsContainer}>
                            <TouchableOpacity 
                                style={[styles.tabBtn, activeTab === 'contacts' && styles.tabBtnActive]}
                                onPress={() => setActiveTab('contacts')}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel="Emergency Contacts Tab"
                            >
                                <Phone size={14} color={activeTab === 'contacts' ? '#10B981' : '#71717A'} />
                                <Text style={[styles.tabBtnText, activeTab === 'contacts' && styles.tabBtnTextActive]}>
                                    Contacts ({contacts.length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.tabBtn, activeTab === 'directives' && styles.tabBtnActive]}
                                onPress={() => setActiveTab('directives')}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel="Protection & Directives Tab"
                            >
                                <Shield size={14} color={activeTab === 'directives' ? '#8B5CF6' : '#71717A'} />
                                <Text style={[styles.tabBtnText, activeTab === 'directives' && styles.tabBtnTextActive]}>
                                    Directives ({protectionItems.length})
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Controls bar: Archive toggle + Add Action */}
                        <View style={styles.controlsBar}>
                            <TouchableOpacity 
                                style={[styles.archiveToggle, showArchived && styles.archiveToggleActive]}
                                onPress={() => setShowArchived(!showArchived)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel="Toggle archived records"
                            >
                                <Archive size={12} color={showArchived ? '#F59E0B' : '#71717A'} />
                                <Text style={[styles.archiveToggleText, showArchived && styles.archiveToggleTextActive]}>
                                    {showArchived ? 'Archived Visible' : 'Show Archived'}
                                </Text>
                            </TouchableOpacity>

                            {activeTab === 'contacts' ? (
                                <TouchableOpacity 
                                    style={styles.addBtn}
                                    onPress={handleOpenAddContact}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel="Add Emergency Contact"
                                >
                                    <Plus size={14} color="#FFFFFF" />
                                    <Text style={styles.addBtnText}>Add Contact</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity 
                                    style={[styles.addBtn, { backgroundColor: '#8B5CF6' }]}
                                    onPress={handleOpenAddProtection}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel="Add Protection Directive"
                                >
                                    <Plus size={14} color="#FFFFFF" />
                                    <Text style={styles.addBtnText}>Add Directive</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Content Area: Contacts Tab */}
                        {activeTab === 'contacts' && (
                            <View style={styles.listSection}>
                                {contacts.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Phone size={32} color="#52525B" style={{ marginBottom: 10 }} />
                                        <Text style={styles.emptyTitle}>No Emergency Contacts Registered</Text>
                                        <Text style={styles.emptySubtitle}>
                                            Add primary and secondary dispatch contacts to ensure critical continuity during family emergencies.
                                        </Text>
                                        <TouchableOpacity 
                                            style={styles.emptyAddBtn}
                                            onPress={handleOpenAddContact}
                                            activeOpacity={0.7}
                                        >
                                            <Plus size={14} color="#FFFFFF" />
                                            <Text style={styles.emptyAddBtnText}>Add First Contact</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    contacts.map(contact => (
                                        <EmergencyContactCard 
                                            key={contact.id}
                                            contact={contact}
                                            onEdit={handleEditContact}
                                            onArchive={handleArchiveContact}
                                            onDelete={handleDeleteContact}
                                        />
                                    ))
                                )}
                            </View>
                        )}

                        {/* Content Area: Directives Tab */}
                        {activeTab === 'directives' && (
                            <View style={styles.listSection}>
                                {protectionItems.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Shield size={32} color="#52525B" style={{ marginBottom: 10 }} />
                                        <Text style={styles.emptyTitle}>No Protection Directives Registered</Text>
                                        <Text style={styles.emptySubtitle}>
                                            Establish healthcare proxies, living trusts, durable powers of attorney, or guardianship declarations.
                                        </Text>
                                        <TouchableOpacity 
                                            style={[styles.emptyAddBtn, { backgroundColor: '#8B5CF6' }]}
                                            onPress={handleOpenAddProtection}
                                            activeOpacity={0.7}
                                        >
                                            <Plus size={14} color="#FFFFFF" />
                                            <Text style={styles.emptyAddBtnText}>Add First Directive</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    protectionItems.map(item => (
                                        <ProtectionItemCard 
                                            key={item.id}
                                            item={item}
                                            onEdit={handleEditProtection}
                                            onArchive={handleArchiveProtection}
                                            onDelete={handleDeleteProtection}
                                        />
                                    ))
                                )}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Modals */}
            <EmergencyContactModal 
                visible={contactModalVisible}
                contact={selectedContact}
                members={members}
                onClose={() => { setContactModalVisible(false); setSelectedContact(null); }}
                onSave={handleSaveContact}
            />

            <ProtectionItemModal 
                visible={protectionModalVisible}
                item={selectedProtectionItem}
                members={members}
                documents={documents}
                onClose={() => { setProtectionModalVisible(false); setSelectedProtectionItem(null); }}
                onSave={handleSaveProtection}
            />
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
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#171721',
        borderRadius: 10,
        padding: 4,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 16
    },
    tabBtn: {
        minHeight: 44,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6
    },
    tabBtnActive: {
        backgroundColor: '#27272A'
    },
    tabBtnText: {
        flexShrink: 1,
        color: '#A1A1B5',
        fontSize: 12,
        fontWeight: '600'
    },
    tabBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    controlsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14
    },
    archiveToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#171721',
        borderWidth: 1,
        borderColor: '#27272A',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 6
    },
    archiveToggleActive: {
        borderColor: 'rgba(245, 158, 11, 0.4)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)'
    },
    archiveToggleText: {
        color: '#A1A1B5',
        fontSize: 11,
        fontWeight: '600'
    },
    archiveToggleTextActive: {
        color: '#FBBF24'
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#047857',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        gap: 6
    },
    addBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    listSection: {
        marginBottom: 20
    },
    emptyCard: {
        backgroundColor: '#171721',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'center'
    },
    emptySubtitle: {
        color: '#A1A1B5',
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        marginBottom: 16,
        maxWidth: 280
    },
    emptyAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6
    },
    emptyAddBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    }
});
