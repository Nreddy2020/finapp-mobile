import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ShieldCheck, Plus, Clock, Trash2, Camera, FileText, Search, Filter, CalendarDays as CalendarIcon, Download, Upload as UploadIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getValidityItems } from '../../services/api';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';

// New Components
// New Components
import AutoRenewalCard from '../../components/validity/AutoRenewalCard';
import FamilySync from '../../components/validity/FamilySync';
import AddDocumentModal from '../../components/validity/AddDocumentModal'; // New Import
import { loadData, saveData, STORAGE_KEYS } from '../../services/storage'; // Persistence
import ErrorBoundary from '../../components/ErrorBoundary';
import { cancelDocumentNotifications } from '../../services/notifications';
import { addExpiryToCalendar, authenticateWithBiometrics } from '../../services/calendar';
import { exportToCSV, bulkUploadDocuments } from '../../services/export';

export default function ValidityScreen() {
    const [items, setItems] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [expiryFilter, setExpiryFilter] = useState('All'); // 'All' or 'Expiring Soon'

    const fetchItems = async () => {
        try {
            const data = await loadData(STORAGE_KEYS.VALIDITY, []);
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleDeleteItem = async (id) => {
        // Cancel scheduled notifications for this document
        await cancelDocumentNotifications(id);

        const updatedItems = items.filter(i => i.id !== id);
        setItems(updatedItems);
        await saveData(STORAGE_KEYS.VALIDITY, updatedItems);
    };

    const handleEditItem = (item) => {
        setEditingItem(item);
        setEditMode(true);
        setModalVisible(true);
    };

    const handleSaveEdit = async (updatedItem) => {
        const updatedItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
        setItems(updatedItems);
        await saveData(STORAGE_KEYS.VALIDITY, updatedItems);
        setEditMode(false);
        setEditingItem(null);
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchItems();
    };

    // Filter logic
    const filteredItems = (items || []).filter(item => {
        const itemName = String(item?.item || item?.title || item?.name || '');
        const matchesSearch = itemName.toLowerCase().includes(String(searchQuery || '').toLowerCase());
        const matchesCategory = categoryFilter === 'All' || item?.category === categoryFilter;
        const matchesExpiry = expiryFilter === 'All' || (expiryFilter === 'Expiring Soon' && (item?.days_left ?? 999) <= 30);
        return matchesSearch && matchesCategory && matchesExpiry;
    });

    const expiringSoon = filteredItems.filter(i => (i?.days_left ?? 999) <= 30);
    const urgentItem = expiringSoon.length > 0 ? expiringSoon[0] : null;

    const THEME_COLOR = '#06B6D4'; // Cyan
    const CATEGORIES = ['All', 'License', 'Passport', 'Insurance', 'Subscription'];

    return (
        <ErrorBoundary>
            <AnimatedScreen style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={THEME_COLOR}
                            colors={[THEME_COLOR]}
                            progressBackgroundColor="#18181B"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <StackHeader title="Validity" subtitle="Expirations" />

                    {/* Search and Filter Bar */}
                    <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="🔍 Search documents..."
                                    placeholderTextColor="#52525B"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>
                        </View>

                        {/* Filter Pills */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Text style={{ color: '#71717A', fontSize: 12, fontWeight: '700', marginRight: 8, alignSelf: 'center' }}>FILTER:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        onPress={() => setCategoryFilter(cat)}
                                        style={[
                                            styles.filterPill,
                                            categoryFilter === cat && styles.filterPillActive
                                        ]}
                                    >
                                        <Text style={[
                                            styles.filterPillText,
                                            categoryFilter === cat && styles.filterPillTextActive
                                        ]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    onPress={() => setExpiryFilter(prev => prev === 'All' ? 'Expiring Soon' : 'All')}
                                    style={[
                                        styles.filterPill,
                                        expiryFilter === 'Expiring Soon' && { backgroundColor: '#EF444420', borderColor: '#EF4444' }
                                    ]}
                                >
                                    <Clock size={12} color={expiryFilter === 'Expiring Soon' ? '#EF4444' : '#71717A'} />
                                    <Text style={[
                                        styles.filterPillText,
                                        expiryFilter === 'Expiring Soon' && { color: '#EF4444' }
                                    ]}>Expiring Soon</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>

                    <View style={styles.heroCardWrapper}>
                        <View style={styles.heroCard}>
                            <LinearGradient
                                colors={[`${THEME_COLOR}60`, '#00000000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.heroGlow}
                            />
                            <View style={styles.heroContent}>
                                <Text style={styles.heroLabel}>Documents Active</Text>
                                <Text style={styles.heroAmount}>{items.length}</Text>
                                <View style={styles.heroFooter}>
                                    <View style={[styles.heroIconBadge, { backgroundColor: expiringSoon.length > 0 ? '#F59E0B' : '#10B981' }]}>
                                        <Clock size={14} color="#FFFFFF" strokeWidth={2.5} />
                                    </View>
                                    <Text style={styles.heroSubtext}>
                                        {expiringSoon.length > 0 ? `${expiringSoon.length} expiring soon` : 'All valid & secure'}
                                    </Text>
                                </View>
                                <View style={{ height: 6, backgroundColor: '#FFFFFF15', borderRadius: 3, marginTop: 18, overflow: 'hidden' }}>
                                    <View style={{ height: '100%', width: `${items.length > 0 ? Math.min(100, Math.round(((items.length - expiringSoon.length) / items.length) * 100)) : 100}%`, backgroundColor: expiringSoon.length > 0 ? '#F59E0B' : '#10B981' }} />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Auto-Renewal Card for most urgent item */}
                    {urgentItem && <AutoRenewalCard item={urgentItem} />}

                    {/* Family Sync Settings */}
                    <FamilySync />

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Document Vault</Text>

                        {filteredItems.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <View style={styles.emptyIconContainer}>
                                    <ShieldCheck size={32} color={THEME_COLOR} strokeWidth={2.5} />
                                </View>
                                <Text style={styles.emptyText}>{searchQuery || categoryFilter !== 'All' || expiryFilter !== 'All' ? 'No matching documents' : 'No documents'}</Text>
                                <Text style={styles.emptySubtext}>{searchQuery || categoryFilter !== 'All' || expiryFilter !== 'All' ? 'Try adjusting your filters' : 'Track licenses, IDs & subscriptions'}</Text>
                            </View>
                        ) : (
                            filteredItems.map((item, index) => {
                                const isUrgent = item.days_left <= 30;
                                return (
                                    <LuxuryCard
                                        key={index}
                                        index={index}
                                        style={styles.docCard}
                                        onPress={() => { }}
                                    >
                                        <LinearGradient
                                            colors={[`${THEME_COLOR}10`, '#00000000']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.cardGlow}
                                        />
                                        <View style={styles.cardIcon}>
                                            <ShieldCheck size={24} color={THEME_COLOR} strokeWidth={2.5} />
                                        </View>
                                        <View style={styles.cardContent}>
                                            <Text style={styles.docName}>{item.item}</Text>
                                            <Text style={styles.docDate}>Expires {item.expiry_date} {item.image && '📷'}</Text>
                                        </View>
                                        <View style={styles.cardRight}>
                                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: item.days_left <= 0 ? '#EF444420' : item.days_left <= 30 ? '#F59E0B20' : '#10B98120', borderWidth: 1, borderColor: item.days_left <= 0 ? '#EF4444' : item.days_left <= 30 ? '#F59E0B' : '#10B981' }}>
                                                    <Text style={{ fontSize: 9, fontWeight: '900', color: item.days_left <= 0 ? '#EF4444' : item.days_left <= 30 ? '#F59E0B' : '#10B981' }}>
                                                        {item.days_left <= 0 ? 'EXPIRED' : item.days_left <= 30 ? 'EXPIRING' : 'VALID'}
                                                    </Text>
                                                </View>
                                                <View style={[styles.daysBadge, { backgroundColor: isUrgent ? '#EF444420' : '#10B98120' }]}>
                                                    <Text style={[styles.daysText, { color: isUrgent ? '#EF4444' : '#10B981' }]}>
                                                        {item.days_left <= 0 ? 'Overdue' : `${item.days_left} Days`}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, alignSelf: 'flex-end' }}>
                                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleEditItem(item) }}>
                                                    <FileText size={14} color="#A1A1AA" />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteItem(item.id) }}>
                                                    <Trash2 size={14} color="#52525B" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </LuxuryCard>
                                );
                            })
                        )}
                    </View>

                    <LuxuryCard
                        style={styles.addButton}
                        onPress={() => setModalVisible(true)}
                        index={items.length + 1}
                    >
                        <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                        <Text style={styles.addButtonText}>Add Document</Text>
                    </LuxuryCard>
                </ScrollView>

                <AddDocumentModal
                    visible={modalVisible}
                    onClose={() => {
                        setModalVisible(false);
                        setEditMode(false);
                        setEditingItem(null);
                    }}
                    onAdd={async (item) => {
                        if (editMode) {
                            await handleSaveEdit(item);
                        } else {
                            const updatedItems = [item, ...items];
                            setItems(updatedItems);
                            await saveData(STORAGE_KEYS.VALIDITY, updatedItems);
                        }
                    }}
                    editMode={editMode}
                    initialData={editingItem}
                />
            </AnimatedScreen>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 24 },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    heroCardWrapper: { marginHorizontal: 24, marginBottom: 40 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },
    docCard: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 140, opacity: 1 },
    cardIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#06B6D410', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1, borderColor: '#06B6D420' },
    cardContent: { flex: 1 },
    docName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.3 },
    docDate: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    cardRight: { alignItems: 'flex-end' },
    daysBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    daysText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#06B6D408', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#06B6D415' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#06B6D450' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#06B6D4', letterSpacing: 0.5 },
    searchInput: { backgroundColor: '#18181B', color: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', fontSize: 14 },
    filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#3F3F46', marginRight: 8 },
    filterPillActive: { backgroundColor: '#06B6D420', borderColor: '#06B6D4' },
    filterPillText: { fontSize: 12, fontWeight: '700', color: '#71717A' },
    filterPillTextActive: { color: '#06B6D4' },
});
