import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Modal, Pressable, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Home, Plus, MapPin, Sparkles, TrendingUp, DollarSign, Calendar, X, Wrench, Users, TrendingDown, Save } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getProperties } from '../../services/api';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import StatCard from '../../components/ui/StatCard';

import { PropertiesService } from '../../services/properties';

export default function PropertiesScreen() {
    const [properties, setProperties] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [loading, setLoading] = useState(true);

    // Add Property Modal State
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newProperty, setNewProperty] = useState({
        name: '',
        type: 'Apartment',
        location: '',
        purchasePrice: '',
        currentValue: '',
        isRented: false,
        rentalIncome: ''
    });

    const fetchProperties = async () => {
        try {
            const data = await PropertiesService.getProperties();
            setProperties(data);
        } catch (error) {
            console.error('Error fetching properties:', error);
            setProperties([]);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchProperties();
    };

    const handleAddProperty = async () => {
        if (!newProperty.name || !newProperty.currentValue) {
            Alert.alert('Error', 'Please enter Property Name and Current Value');
            return;
        }

        await PropertiesService.addProperty({
            ...newProperty,
            purchasePrice: newProperty.purchasePrice || newProperty.currentValue
        });

        setAddModalVisible(false);
        setNewProperty({
            name: '',
            type: 'Apartment',
            location: '',
            purchasePrice: '',
            currentValue: '',
            isRented: false,
            rentalIncome: ''
        });
        fetchProperties();
    };

    const handleDeleteProperty = async (id) => {
        Alert.alert(
            "Delete Property",
            "Are you sure you want to remove this property?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await PropertiesService.deleteProperty(id);
                        fetchProperties();
                    }
                }
            ]
        );
    };

    const totalValue = properties.reduce((sum, p) => sum + parseFloat(p.current_value || 0), 0);
    const totalRentalIncome = properties.reduce((sum, p) => sum + parseFloat(p.rental_income || 0), 0);
    const rentedCount = properties.filter(p => p.is_rented).length;
    const totalAppreciation = properties.reduce((sum, p) => {
        const appreciation = p.current_value - (p.purchase_value || p.current_value);
        return sum + appreciation;
    }, 0);
    const THEME_COLOR = '#8B5CF6'; // Violet

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const calculateROI = (property) => {
        if (!property || !property.purchase_value) return 0;
        const appreciation = property.current_value - property.purchase_value;
        return ((appreciation / property.purchase_value) * 100).toFixed(1);
    };

    return (
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
                <StackHeader title="Properties" subtitle="Real Estate" />

                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={[`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>Total Portfolio Value</Text>
                            <Text style={styles.heroAmount}>₹{(totalValue / 10000000).toFixed(2)} Cr</Text>
                            <View style={styles.heroFooter}>
                                <View style={styles.heroIconBadge}>
                                    <TrendingUp size={14} color="#FFFFFF" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.heroSubtext}>across {properties.length} prime holdings</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <StatCard
                        label="Rental Income"
                        value={`₹${(totalRentalIncome / 1000).toFixed(0)}K`}
                        icon={DollarSign}
                        iconColor="#10B981"
                        subtitle="monthly total"
                        style={styles.statCard}
                    />
                    <StatCard
                        label="Appreciation"
                        value={`₹${(totalAppreciation / 100000).toFixed(1)}L`}
                        icon={TrendingUp}
                        iconColor="#10B981"
                        trend="+12%"
                        trendDirection="up"
                        style={styles.statCard}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Holdings</Text>

                    {properties.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <Home size={32} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyText}>No properties found</Text>
                            <Text style={styles.emptySubtext}>Start building your real estate legacy</Text>
                        </View>
                    ) : (
                        properties.map((prop, index) => (
                            <LuxuryCard
                                key={prop.id || index}
                                index={index}
                                style={styles.propCard}
                                onPress={() => setSelectedProperty(prop)}
                                onLongPress={() => handleDeleteProperty(prop.id)}
                            >
                                <LinearGradient
                                    colors={[`${THEME_COLOR}10`, '#00000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.cardGlow}
                                />
                                <View style={styles.cardIcon}>
                                    <Home size={24} color={THEME_COLOR} strokeWidth={2.5} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={styles.propName}>{prop.name}</Text>
                                    <View style={styles.locationRow}>
                                        <MapPin size={12} color="#71717A" />
                                        <Text style={styles.locationText}>{prop.location}</Text>
                                    </View>
                                    {prop.isRented && (
                                        <View style={styles.rentalBadge}>
                                            <Users size={10} color="#10B981" strokeWidth={2.5} />
                                            <Text style={styles.rentalText}>RENTED • ₹{prop.rentalIncome.toLocaleString('en-IN')}/mo</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.cardRight}>
                                    <Text style={styles.value}>₹{(parseFloat(prop.currentValue) / 100000).toFixed(1)} L</Text>
                                    <View style={styles.roiBadge}>
                                        <TrendingUp size={10} color="#10B981" strokeWidth={2.5} />
                                        <Text style={styles.roiText}>+{calculateROI(prop)}%</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteProperty(prop.id)} style={{ padding: 4, marginTop: 4 }}>
                                        <Text style={{ fontSize: 10, color: '#EF4444' }}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            </LuxuryCard>
                        ))
                    )}
                </View>

                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => setAddModalVisible(true)}
                    index={properties.length + 1}
                >
                    <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                    <Text style={styles.addButtonText}>Add Property</Text>
                </LuxuryCard>
            </ScrollView>

            {/* Add Property Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={addModalVisible}
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.addModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Property</Text>
                            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                                <X size={24} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Property Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., 2BHK Apartment"
                                    placeholderTextColor="#52525B"
                                    value={newProperty.name}
                                    onChangeText={(text) => setNewProperty({ ...newProperty, name: text })}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Type</Text>
                                <View style={styles.categoryRow}>
                                    {['Apartment', 'House', 'Land', 'Commercial'].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.categoryChip,
                                                newProperty.type === type && { backgroundColor: THEME_COLOR, borderColor: THEME_COLOR }
                                            ]}
                                            onPress={() => setNewProperty({ ...newProperty, type })}
                                        >
                                            <Text style={[
                                                styles.categoryText,
                                                newProperty.type === type && { color: '#000' }
                                            ]}>{type}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Location</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Mumbai, Maharashtra"
                                    placeholderTextColor="#52525B"
                                    value={newProperty.location}
                                    onChangeText={(text) => setNewProperty({ ...newProperty, location: text })}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputContainer, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Current Value (₹)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        placeholderTextColor="#52525B"
                                        keyboardType="numeric"
                                        value={newProperty.currentValue}
                                        onChangeText={(text) => setNewProperty({ ...newProperty, currentValue: text })}
                                    />
                                </View>
                                <View style={{ width: 16 }} />
                                <View style={[styles.inputContainer, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Purchase Price (₹)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Optional"
                                        placeholderTextColor="#52525B"
                                        keyboardType="numeric"
                                        value={newProperty.purchasePrice}
                                        onChangeText={(text) => setNewProperty({ ...newProperty, purchasePrice: text })}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Rental Income (₹/month)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0 if not rented"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newProperty.rentalIncome}
                                    onChangeText={(text) => {
                                        setNewProperty({
                                            ...newProperty,
                                            rentalIncome: text,
                                            isRented: parseFloat(text) > 0
                                        });
                                    }}
                                />
                            </View>

                            <TouchableOpacity style={[styles.saveButton, { backgroundColor: THEME_COLOR }]} onPress={handleAddProperty}>
                                <Save size={20} color="#000000" />
                                <Text style={styles.saveButtonText}>Add to Portfolio</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Property Detail Modal */}
            <Modal
                visible={selectedProperty !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedProperty(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{selectedProperty?.name}</Text>
                                <View style={styles.modalLocationRow}>
                                    <MapPin size={14} color="#A1A1AA" strokeWidth={2.5} />
                                    <Text style={styles.modalSubtitle}>{selectedProperty?.location}</Text>
                                </View>
                            </View>
                            <Pressable onPress={() => setSelectedProperty(null)} style={styles.closeButton}>
                                <X size={24} color="#FFFFFF" strokeWidth={2.5} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            {/* Property Stats */}
                            <View style={styles.modalStats}>
                                <View style={styles.modalStatItem}>
                                    <Text style={styles.modalStatLabel}>Current Value</Text>
                                    <Text style={styles.modalStatValue}>
                                        ₹{((selectedProperty?.current_value || 0) / 10000000).toFixed(2)} Cr
                                    </Text>
                                </View>
                                <View style={styles.modalStatItem}>
                                    <Text style={styles.modalStatLabel}>ROI</Text>
                                    <Text style={[styles.modalStatValue, { color: '#10B981' }]}>
                                        +{calculateROI(selectedProperty)}%
                                    </Text>
                                </View>
                                <View style={styles.modalStatItem}>
                                    <Text style={styles.modalStatLabel}>Type</Text>
                                    <Text style={styles.modalStatValue}>{selectedProperty?.type}</Text>
                                </View>
                            </View>

                            {/* Rental Info */}
                            {selectedProperty?.is_rented && (
                                <View style={styles.infoSection}>
                                    <Text style={styles.infoSectionTitle}>Rental Information</Text>
                                    <View style={styles.rentalCard}>
                                        <View style={styles.rentalHeader}>
                                            <View style={styles.rentalIcon}>
                                                <Users size={20} color="#10B981" strokeWidth={2.5} />
                                            </View>
                                            <View style={styles.rentalContent}>
                                                <Text style={styles.tenantName}>{selectedProperty.tenant_name}</Text>
                                                <Text style={styles.rentalIncome}>
                                                    ₹{selectedProperty.rental_income.toLocaleString('en-IN')}/month
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.leaseInfo}>
                                            <View style={styles.leaseItem}>
                                                <Text style={styles.leaseLabel}>Lease Start</Text>
                                                <Text style={styles.leaseValue}>{formatDate(selectedProperty.lease_start)}</Text>
                                            </View>
                                            <View style={styles.leaseItem}>
                                                <Text style={styles.leaseLabel}>Lease End</Text>
                                                <Text style={styles.leaseValue}>{formatDate(selectedProperty.lease_end)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Value History */}
                            <View style={styles.infoSection}>
                                <Text style={styles.infoSectionTitle}>Value History</Text>
                                {selectedProperty?.value_history?.map((record, index) => (
                                    <View key={index} style={styles.historyItem}>
                                        <View style={styles.historyIcon}>
                                            <TrendingUp size={16} color="#10B981" strokeWidth={2.5} />
                                        </View>
                                        <View style={styles.historyContent}>
                                            <Text style={styles.historyDate}>{record.date}</Text>
                                        </View>
                                        <Text style={styles.historyValue}>
                                            ₹{(record.value / 100000).toFixed(1)}L
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Maintenance History */}
                            {selectedProperty?.maintenance_history && selectedProperty.maintenance_history.length > 0 && (
                                <View style={styles.infoSection}>
                                    <Text style={styles.infoSectionTitle}>Maintenance History</Text>
                                    {selectedProperty.maintenance_history.map((record, index) => (
                                        <View key={index} style={styles.maintenanceItem}>
                                            <View style={styles.maintenanceIcon}>
                                                <Wrench size={16} color="#F59E0B" strokeWidth={2.5} />
                                            </View>
                                            <View style={styles.maintenanceContent}>
                                                <Text style={styles.maintenanceDesc}>{record.description}</Text>
                                                <Text style={styles.maintenanceDate}>{formatDate(record.date)}</Text>
                                            </View>
                                            <Text style={styles.maintenanceAmount}>
                                                ₹{record.amount.toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Tax Info */}
                            {selectedProperty?.property_tax && (
                                <View style={styles.infoSection}>
                                    <Text style={styles.infoSectionTitle}>Tax Information</Text>
                                    <View style={styles.taxCard}>
                                        <View style={styles.taxRow}>
                                            <Text style={styles.taxLabel}>Annual Property Tax</Text>
                                            <Text style={styles.taxValue}>
                                                ₹{selectedProperty.property_tax.toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                        <View style={styles.taxRow}>
                                            <Text style={styles.taxLabel}>Due Date</Text>
                                            <Text style={styles.taxDueDate}>{formatDate(selectedProperty.tax_due_date)}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
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
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },
    propCard: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 140, opacity: 1 },
    cardIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#8B5CF610', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1, borderColor: '#8B5CF620' },
    cardContent: { flex: 1 },
    propName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.3 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationText: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    cardRight: { alignItems: 'flex-end' },
    value: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#8B5CF608', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#8B5CF615' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#8B5CF650' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#8B5CF6', letterSpacing: 0.5 },
    statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 24 },
    statCard: { flex: 1 },
    rentalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#10B98115', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
    rentalText: { fontSize: 10, fontWeight: '800', color: '#10B981', letterSpacing: 0.5 },
    roiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: '#10B98115', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
    roiText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
    modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#09090B', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%', paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, borderBottomWidth: 1, borderBottomColor: '#FFFFFF08' },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 6 },
    modalLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modalSubtitle: { fontSize: 13, color: '#A1A1AA', fontWeight: '600' },
    closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },
    modalScroll: { padding: 24 },
    modalStats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    modalStatItem: { flex: 1, backgroundColor: '#18181B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    modalStatLabel: { fontSize: 11, color: '#A1A1AA', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    modalStatValue: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
    infoSection: { marginBottom: 24 },
    infoSectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase' },
    rentalCard: { backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#10B98120' },
    rentalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    rentalIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#10B98115', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    rentalContent: { flex: 1 },
    tenantName: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    rentalIncome: { fontSize: 20, fontWeight: '900', color: '#10B981', letterSpacing: -0.5 },
    leaseInfo: { flexDirection: 'row', gap: 12 },
    leaseItem: { flex: 1, backgroundColor: '#FFFFFF05', padding: 12, borderRadius: 12 },
    leaseLabel: { fontSize: 11, color: '#A1A1AA', fontWeight: '600', marginBottom: 4 },
    leaseValue: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
    historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF08' },
    historyIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10B98115', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    historyContent: { flex: 1 },
    historyDate: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    historyValue: { fontSize: 16, fontWeight: '800', color: '#10B981', letterSpacing: -0.5 },
    maintenanceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF08' },
    maintenanceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F59E0B15', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    maintenanceContent: { flex: 1 },
    maintenanceDesc: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
    maintenanceDate: { fontSize: 12, color: '#A1A1AA', fontWeight: '500' },
    maintenanceAmount: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    taxCard: { backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    taxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    taxLabel: { fontSize: 13, color: '#A1A1AA', fontWeight: '600' },
    taxValue: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
    taxDueDate: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },

    // Add Modal Styles
    addModalContent: { backgroundColor: '#18181B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%', borderTopWidth: 1, borderColor: '#FFFFFF10' },
    inputContainer: { marginBottom: 20 },
    inputLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: '#000000', borderRadius: 16, padding: 16, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    row: { flexDirection: 'row' },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF20', backgroundColor: '#000000' },
    categoryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 24, marginTop: 20, gap: 10 },
    saveButtonText: { color: '#000000', fontSize: 16, fontWeight: '800' }
});
