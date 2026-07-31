import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Briefcase, Plus, Shield, X, Save, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAssets } from '../../services/api';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';

// New Vault Components
import DepreciationCard from '../../components/assets/DepreciationCard';
import WarrantyCloud from '../../components/assets/WarrantyCloud';
import DeathProtocol from '../../components/assets/DeathProtocol';

import { loadData, saveData, STORAGE_KEYS } from '../../services/storage';
import { AssetsService } from '../../services/assets';

export default function AssetsScreen() {
    const [assets, setAssets] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [newAsset, setNewAsset] = useState({ name: '', category: 'Other', currentValue: '', purchasePrice: '' });

    const fetchAssets = async () => {
        try {
            const data = await AssetsService.getAssets();
            setAssets(data);
        } catch (error) {
            console.error('Error fetching assets:', error);
            setAssets([]);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAssets();
    };

    const handleAddAsset = async () => {
        if (!newAsset.name || !newAsset.currentValue) {
            Alert.alert('Error', 'Please fill in Name and Current Value');
            return;
        }

        await AssetsService.addAsset({
            ...newAsset,
            purchasePrice: newAsset.purchasePrice || newAsset.currentValue
        });

        setModalVisible(false);
        setNewAsset({ name: '', category: 'Other', currentValue: '', purchasePrice: '' });
        fetchAssets();
    };

    const handleDeleteAsset = async (id) => {
        Alert.alert(
            "Delete Asset",
            "Are you sure you want to remove this asset?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await AssetsService.deleteAsset(id);
                        fetchAssets();
                    }
                }
            ]
        );
    };

    const totalValue = assets.reduce((sum, a) => sum + parseFloat(a.currentValue || 0), 0);
    const THEME_COLOR = '#10B981'; // Emerald

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
                <StackHeader title="Assets" subtitle="Wealth Management" />

                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            pointerEvents="none"
                            colors={[`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>Total Asset Value</Text>
                            <Text style={styles.heroAmount}>₹{totalValue.toLocaleString('en-IN')}</Text>
                            <View style={styles.heroFooter}>
                                <View style={styles.heroIconBadge}>
                                    <Shield size={14} color="#FFFFFF" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.heroSubtext}>secured in your vault</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Vault Section: Depreciation, Warranties, Security */}
                <View style={styles.vaultSection}>
                    <Text style={styles.sectionTitle}>Vault Intelligence</Text>
                    <DepreciationCard />
                    <WarrantyCloud />
                    <DeathProtocol />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Physical Assets</Text>

                    {assets.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <Briefcase size={32} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyText}>No assets logged</Text>
                            <Text style={styles.emptySubtext}>Track jewelry, vehicles, and valuables</Text>
                        </View>
                    ) : (
                        assets.map((asset, index) => (
                            <LuxuryCard
                                key={asset.id || index}
                                index={index}
                                style={styles.assetCard}
                                onPress={() => { }}
                                onLongPress={() => handleDeleteAsset(asset.id)}
                            >
                                <LinearGradient
                                    pointerEvents="none"
                                    colors={[`${THEME_COLOR}10`, '#00000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.cardGlow}
                                />
                                <View style={styles.cardIcon}>
                                    <Briefcase size={24} color={THEME_COLOR} strokeWidth={2.5} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={styles.assetName}>{asset.name}</Text>
                                    <Text style={styles.assetCategory}>{asset.category}</Text>
                                </View>
                                <View style={styles.cardRight}>
                                    <Text style={styles.amount}>₹{parseFloat(asset.currentValue).toLocaleString('en-IN')}</Text>
                                    <TouchableOpacity onPress={() => handleDeleteAsset(asset.id)} style={{ padding: 4, marginTop: 4 }}>
                                        <Text style={{ fontSize: 10, color: '#EF4444' }}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            </LuxuryCard>
                        ))
                    )}
                </View>

                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                    index={assets.length + 1}
                >
                    <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                        <Text style={styles.addButtonText}>Add Asset</Text>
                    </View>
                </LuxuryCard>
            </ScrollView>

            {/* Add Asset Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Asset</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Asset Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Gold Necklace"
                                placeholderTextColor="#52525B"
                                value={newAsset.name}
                                onChangeText={(text) => setNewAsset({ ...newAsset, name: text })}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Category</Text>
                            <View style={styles.categoryRow}>
                                {['Gold', 'Vehicle', 'Electronics', 'Other'].map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.categoryChip,
                                            newAsset.category === cat && { backgroundColor: THEME_COLOR, borderColor: THEME_COLOR }
                                        ]}
                                        onPress={() => setNewAsset({ ...newAsset, category: cat })}
                                    >
                                        <Text style={[
                                            styles.categoryText,
                                            newAsset.category === cat && { color: '#000' }
                                        ]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Current Value (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newAsset.currentValue}
                                    onChangeText={(text) => setNewAsset({ ...newAsset, currentValue: text })}
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
                                    value={newAsset.purchasePrice}
                                    onChangeText={(text) => setNewAsset({ ...newAsset, purchasePrice: text })}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: THEME_COLOR }]} onPress={handleAddAsset}>
                            <Save size={20} color="#000000" />
                            <Text style={styles.saveButtonText}>One-Tap Secure</Text>
                        </TouchableOpacity>
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
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },
    vaultSection: { marginBottom: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#27272A', borderBottomWidth: 1, borderBottomColor: '#27272A' },
    assetCard: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 140, opacity: 1 },
    cardIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#10B98110', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1, borderColor: '#10B98120' },
    cardContent: { flex: 1 },
    assetName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.3 },
    assetCategory: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    cardRight: { alignItems: 'flex-end' },
    amount: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#10B98108', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#10B98115' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#10B98150' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#10B981', letterSpacing: 0.5 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#18181B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: 400, borderTopWidth: 1, borderColor: '#FFFFFF10' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
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
