import {Notice,Action} from '../../../components/family/navigation/FamilyUI.js';
import {useFocusEffect} from 'expo-router';
import {useFamilySelection} from '../../../components/family/navigation/FamilySelection.js';
/**
 * Family Resources Screen (/family/more/resources)
 * 
 * FinLife Family OS Phase 3 — Authoritative Document Vault & Records Registry.
 * Secure metadata tracking for identity, property, medical, and legal documents.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    StyleSheet, 
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
    Search, 
    Plus, 
    AlertTriangle, 
    Filter, 
    Lock, 
    FileText, 
    X,
    Archive,
    ShieldCheck
} from 'lucide-react-native';
import FamilyHeader from '../../../components/family/navigation/FamilyHeader.js';
import DocumentCard from '../../../components/family/documents/DocumentCard.js';
import DocumentFormModal from '../../../components/family/documents/DocumentFormModal.js';
import { FamilyDocumentService } from '../../../services/family/familyDocumentService.js';
import { FamilyRepository } from '../../../services/family/familyRepository.js';
import { 
    DocumentCategory, 
    DocumentStatus, 
    ExpiryStatus,
    PersonStatus,
    createEmptyHousehold,
    createEmptyPerson,
    createEmptyMembership,
    HouseholdRole,
    MembershipStatus
} from '../../../services/family/familyContracts.js';

const CATEGORIES = [
    'ALL',
    DocumentCategory.IDENTITY,
    DocumentCategory.FINANCIAL,
    DocumentCategory.MEDICAL,
    DocumentCategory.LEGAL,
    DocumentCategory.PROPERTY,
    DocumentCategory.VEHICLE,
    DocumentCategory.EDUCATION,
    DocumentCategory.OTHER
];

export default function FamilyResourcesScreen() {
    const [loadError,setLoadError] = useState('');
    const {householdId: sharedHouseholdId} = useFamilySelection();
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [household, setHousehold] = useState(null);
    const [peopleMap, setPeopleMap] = useState({});
    const [activeMembers, setActiveMembers] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [metrics, setMetrics] = useState({
        totalDocuments: 0,
        expiringSoon: 0,
        expired: 0,
        valid: 0,
        noExpiry: 0,
        physicalLocationsCount: 0
    });
    const [physicalLocations, setPhysicalLocations] = useState([]);

    // Filters
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [includeArchived, setIncludeArchived] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState(null);

    const loadData = useCallback(async () => {
        setLoadError('');
        try {
            // 1. Ensure at least one active household exists
            let households = await FamilyRepository.listHouseholds();
            let currentHh = households.find(h => h.id === sharedHouseholdId) || null;

            if (!currentHh) throw new Error('Choose an active household first.');

            setHousehold(currentHh);

            // 2. Load all people to map names and archived state
            const allPeople = await FamilyRepository.listPeople({ includeArchived: true });
            const pMap = {};
            const activeList = [];

            for (const p of allPeople) {
                pMap[p.id] = p;
                // Active member picker: person must be active and have active membership
                if (p.status === PersonStatus.ACTIVE && currentHh.memberIds?.includes(p.id)) {
                    activeList.push(p);
                }
            }

            setPeopleMap(pMap);
            setActiveMembers(activeList);

            // 3. Load documents for this household
            const docs = await FamilyDocumentService.listDocuments({
                householdId: currentHh.id,
                includeArchived
            });
            setDocuments(docs);

            // 4. Load summary metrics & locations
            const summary = await FamilyDocumentService.getSummaryMetrics(currentHh.id);
            setMetrics(summary);

            const locations = await FamilyDocumentService.getPhysicalLocations(currentHh.id);
            setPhysicalLocations(locations);

        } catch (err) {
            setLoadError('Could not load saved records. Please retry.');
            console.error('Family screen load failed:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [includeArchived]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadData();
    };

    // Filtered documents list
    const filteredDocuments = documents.filter(doc => {
        if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
            return false;
        }
        if (selectedLocation && doc.physicalLocation !== selectedLocation) {
            return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const matchTitle = doc.title?.toLowerCase().includes(q);
            const matchType = doc.documentType?.toLowerCase().includes(q);
            const matchNotes = doc.notes?.toLowerCase().includes(q);
            const matchTags = Array.isArray(doc.tags) && doc.tags.some(t => t.toLowerCase().includes(q));
            if (!matchTitle && !matchType && !matchNotes && !matchTags) {
                return false;
            }
        }
        return true;
    });

    const handleOpenAdd = () => {
        setEditingDoc(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (doc) => {
        setEditingDoc(doc);
        setIsModalOpen(true);
    };

    const handleSaveDocument = async (docData) => {
        if (editingDoc) {
            await FamilyDocumentService.updateDocument(editingDoc.id, docData);
        } else {
            await FamilyDocumentService.createDocument(docData);
        }
        await loadData();
    };

    const handleArchiveToggle = async (doc) => {
        try {
            if (doc.status === DocumentStatus.ARCHIVED) {
                // Restore to active
                await FamilyDocumentService.updateDocument(doc.id, { status: DocumentStatus.ACTIVE });
            } else {
                await FamilyDocumentService.archiveDocument(doc.id);
            }
            await loadData();
        } catch (err) {
            Alert.alert('Archive Error', err.message);
        }
    };

    const handleDeleteDocument = (doc) => {
        Alert.alert(
            'Delete Document',
            `Are you sure you want to permanently delete "${doc.title}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            await FamilyDocumentService.deleteDocument(doc.id);
                            await loadData();
                        } catch (err) {
                            Alert.alert('Delete Error', err.message);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={[]}>
            <FamilyHeader 
                title="Family Resources" 
                subtitle="Document Vault & Registry"
                showBack={true}
                fallbackRoute="/family/more"
                showContextBanner={false}
                showTopTabs={false}
            />
            {loadError ? <View style={{padding:16}}><Notice>{loadError}</Notice><Action title="Retry saved records" onPress={() => loadData()}/></View> : null}

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Loading Document Registry...</Text>
                </View>
            ) : (
                <ScrollView 
                    style={styles.container}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl 
                            refreshing={isRefreshing} 
                            onRefresh={handleRefresh}
                            tintColor="#3B82F6"
                        />
                    }
                >
                    {/* Top Action Bar: Title + "+ Add Document" button */}
                    <View style={styles.actionBar}>
                        <View>
                            <Text style={styles.sectionTitle}>Document Vault</Text>
                            <Text style={styles.sectionSubtitle}>
                                Authoritative records & physical safe tracker
                            </Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.addBtn}
                            onPress={handleOpenAdd}
                            activeOpacity={0.8}
                        >
                            <Plus size={16} color="#000000" />
                            <Text style={styles.addBtnText}>Add Document</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Registry Metrics Summary Bar */}
                    <View style={styles.metricsBar}>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>{metrics.totalDocuments}</Text>
                            <Text style={styles.metricLabel}>Total Active</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                            <Text style={[styles.metricValue, metrics.expiringSoon > 0 && styles.metricWarning]}>
                                {metrics.expiringSoon}
                            </Text>
                            <Text style={styles.metricLabel}>Expiring Soon</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                            <Text style={[styles.metricValue, metrics.expired > 0 && styles.metricDanger]}>
                                {metrics.expired}
                            </Text>
                            <Text style={styles.metricLabel}>Expired</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>{metrics.physicalLocationsCount}</Text>
                            <Text style={styles.metricLabel}>Safe Locations</Text>
                        </View>
                    </View>

                    {/* Expiration Alert Banner if any expired or expiring soon */}
                    {(metrics.expired > 0 || metrics.expiringSoon > 0) && (
                        <View style={styles.alertBanner}>
                            <AlertTriangle size={18} color="#FBBF24" />
                            <View style={styles.alertContent}>
                                <Text style={styles.alertTitle}>Action Required: Document Expiration</Text>
                                <Text style={styles.alertDescription}>
                                    {metrics.expired > 0 ? `${metrics.expired} document(s) have expired. ` : ''}
                                    {metrics.expiringSoon > 0 ? `${metrics.expiringSoon} document(s) expire within 90 days.` : ''}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Search Bar */}
                    <View style={styles.searchRow}>
                        <View style={styles.searchBox}>
                            <Search size={16} color="#71717A" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by title, tag, or notes..."
                                placeholderTextColor="#71717A"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <X size={16} color="#71717A" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity 
                            style={[styles.archiveFilterBtn, includeArchived && styles.archiveFilterBtnActive]}
                            onPress={() => setIncludeArchived(prev => !prev)}
                        >
                            <Archive size={14} color={includeArchived ? '#60A5FA' : '#71717A'} />
                            <Text style={[styles.archiveFilterText, includeArchived && styles.archiveFilterTextActive]}>
                                Archived
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Category Filter Pills */}
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoryFilterRow}
                    >
                        {CATEGORIES.map(cat => {
                            const isSelected = selectedCategory === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Physical Location Chips (if any exist) */}
                    {physicalLocations.length > 0 && (
                        <View style={styles.locationFilterSection}>
                            <Text style={styles.locationSectionLabel}>Filter by Storage Location:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <TouchableOpacity
                                    style={[styles.locFilterChip, selectedLocation === null && styles.locFilterChipSelected]}
                                    onPress={() => setSelectedLocation(null)}
                                >
                                    <Text style={[styles.locFilterText, selectedLocation === null && styles.locFilterTextSelected]}>
                                        All Places
                                    </Text>
                                </TouchableOpacity>
                                {physicalLocations.map(item => {
                                    const isSelected = selectedLocation === item.location;
                                    return (
                                        <TouchableOpacity
                                            key={item.location}
                                            style={[styles.locFilterChip, isSelected && styles.locFilterChipSelected]}
                                            onPress={() => setSelectedLocation(isSelected ? null : item.location)}
                                        >
                                            <Lock size={11} color={isSelected ? '#FBBF24' : '#71717A'} />
                                            <Text style={[styles.locFilterText, isSelected && styles.locFilterTextSelected]}>
                                                {item.location} ({item.count})
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* Document List Header */}
                    <View style={styles.listHeader}>
                        <Text style={styles.listCountText}>
                            Showing {filteredDocuments.length} of {documents.length} document{documents.length !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    {/* Document Cards / Empty State */}
                    {filteredDocuments.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <FileText size={32} color="#3F3F46" />
                            <Text style={styles.emptyTitle}>No Documents Found</Text>
                            <Text style={styles.emptyDesc}>
                                {documents.length === 0 
                                    ? 'No documents registered in this household yet. Tap "+ Add Document" to register your family IDs, deeds, or policies.'
                                    : 'No documents match the current filter criteria.'}
                            </Text>
                            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAdd}>
                                <Plus size={14} color="#000000" />
                                <Text style={styles.emptyAddBtnText}>Add First Document</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        filteredDocuments.map(doc => {
                            const person = doc.personId ? peopleMap[doc.personId] : null;
                            const isPersonArchived = person?.status === PersonStatus.ARCHIVED;
                            return (
                                <DocumentCard
                                    key={doc.id}
                                    document={doc}
                                    personName={person?.fullName || null}
                                    isPersonArchived={isPersonArchived}
                                    onEdit={handleOpenEdit}
                                    onArchive={handleArchiveToggle}
                                    onDelete={handleDeleteDocument}
                                />
                            );
                        })
                    )}
                </ScrollView>
            )}

            {/* Add / Edit Document Modal */}
            <DocumentFormModal
                visible={isModalOpen}
                document={editingDoc}
                householdId={household?.id || ''}
                activeMembers={activeMembers}
                existingLocations={physicalLocations.map(l => l.location)}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveDocument}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#09090F'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#09090F'
    },
    loadingText: {
        marginTop: 12,
        color: '#A1A1AA',
        fontSize: 14
    },
    container: {
        flex: 1,
        backgroundColor: '#09090F'
    },
    content: {
        padding: 16,
        paddingBottom: 64
    },
    actionBar: {
        flexDirection: 'column',
        gap: 12,
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#71717A',
        marginTop: 2
    },
    addBtn: {
        alignSelf: 'stretch',
        justifyContent: 'center',
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 8
    },
    addBtnText: {
        color: '#000000',
        fontSize: 13,
        fontWeight: '700'
    },
    metricsBar: {
        flexDirection: 'row',
        backgroundColor: '#171721',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        paddingVertical: 12,
        paddingHorizontal: 8,
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 16
    },
    metricItem: {
        alignItems: 'center',
        flex: 1
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    metricLabel: {
        fontSize: 10,
        color: '#71717A',
        marginTop: 3,
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    metricWarning: {
        color: '#FBBF24'
    },
    metricDanger: {
        color: '#F43F5E'
    },
    metricDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#27272A'
    },
    alertBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: '#78350F20',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#D9770640',
        padding: 14,
        marginBottom: 16
    },
    alertContent: {
        flex: 1
    },
    alertTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FBBF24',
        marginBottom: 2
    },
    alertDescription: {
        fontSize: 12,
        color: '#FDE68A',
        lineHeight: 18
    },
    searchRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#171721',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A',
        paddingHorizontal: 12,
        paddingVertical: 8
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 13
    },
    archiveFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#171721',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A',
        paddingHorizontal: 12,
        paddingVertical: 8
    },
    archiveFilterBtnActive: {
        borderColor: '#3B82F6',
        backgroundColor: '#1E3A8A20'
    },
    archiveFilterText: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600'
    },
    archiveFilterTextActive: {
        color: '#60A5FA'
    },
    categoryFilterRow: {
        flexDirection: 'row',
        marginBottom: 12
    },
    filterChip: {
        backgroundColor: '#171721',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    filterChipSelected: {
        backgroundColor: '#27272A',
        borderColor: '#60A5FA'
    },
    filterChipText: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    filterChipTextSelected: {
        color: '#FFFFFF'
    },
    locationFilterSection: {
        marginBottom: 12
    },
    locationSectionLabel: {
        fontSize: 11,
        color: '#71717A',
        marginBottom: 6,
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    locFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#171721',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        marginRight: 6,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    locFilterChipSelected: {
        borderColor: '#F59E0B',
        backgroundColor: '#78350F25'
    },
    locFilterText: {
        fontSize: 11,
        color: '#A1A1AA'
    },
    locFilterTextSelected: {
        color: '#FBBF24',
        fontWeight: '700'
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    listCountText: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600'
    },
    emptyCard: {
        backgroundColor: '#171721',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 32,
        alignItems: 'center',
        marginTop: 12
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 12,
        marginBottom: 6
    },
    emptyDesc: {
        fontSize: 13,
        color: '#71717A',
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 20
    },
    emptyAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 8
    },
    emptyAddBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#000000'
    }
});
