import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, TextInput, Modal, Alert, FlatList } from 'react-native';
import { Gem, ChevronLeft, Plus, DollarSign, Tag, Calendar, ShoppingBag, Watch } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import LuxuryEmptyState from '../components/ui/LuxuryEmptyState';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AssetsService } from '../services/assets';

export default function AssetsScreen() {
    const router = useRouter();
    const [assets, setAssets] = useState([]);
    const [totalValue, setTotalValue] = useState(0);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Gold');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await AssetsService.getAssets();
        setAssets(data);
        setTotalValue(AssetsService.calculateTotalValue(data));
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!name || !currentValue) {
            Alert.alert('Missing Fields', 'Name and Current Value are required.');
            return;
        }

        const newAsset = {
            name,
            category,
            purchasePrice,
            currentValue,
            description
        };

        const updated = await AssetsService.addAsset(newAsset);
        setAssets(updated);
        setTotalValue(AssetsService.calculateTotalValue(updated));
        setModalVisible(false);
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setCategory('Gold');
        setPurchasePrice('');
        setCurrentValue('');
        setDescription('');
    };

    const handleDelete = async (id) => {
        Alert.alert('Delete Asset', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const updated = await AssetsService.deleteAsset(id);
                    setAssets(updated);
                    setTotalValue(AssetsService.calculateTotalValue(updated));
                }
            }
        ]);
    };

    const getIcon = (cat) => {
        switch (cat) {
            case 'Gold': return Gem;
            case 'Electronics': return ShoppingBag;
            case 'Watch': return Watch;
            default: return Tag;
        }
    };

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Physical Assets</Text>
                <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Plus color="#FFFFFF" size={24} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Summary Card */}
                <LuxuryCard style={styles.summaryCard}>
                    <View style={styles.summaryContent}>
                        <View>
                            <Text style={styles.summaryLabel}>TOTAL VALUE</Text>
                            <Text style={styles.summaryValue}>₹{totalValue.toLocaleString()}</Text>
                        </View>
                        <View style={styles.iconBox}>
                            <Gem size={24} color="#14B8A6" />
                        </View>
                    </View>
                </LuxuryCard>

                <Text style={styles.sectionTitle}>My Valuables</Text>

                {assets.length === 0 ? (
                    <LuxuryEmptyState
                        title="No Assets"
                        subtitle="Add your Gold, Electronics, or other valuables."
                        icon={Gem}
                        themeColor="#14B8A6"
                    />
                ) : (
                    assets.map((asset, index) => {
                        const Icon = getIcon(asset.category);
                        return (
                            <LuxuryCard key={asset.id} index={index} style={styles.assetCard} onPress={() => handleDelete(asset.id)}>
                                <View style={styles.cardRow}>
                                    <View style={[styles.cardIcon, { backgroundColor: '#14B8A620' }]}>
                                        <Icon size={20} color="#14B8A6" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.assetName}>{asset.name}</Text>
                                        <Text style={styles.assetCat}>{asset.category}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.assetValue}>₹{parseFloat(asset.currentValue).toLocaleString()}</Text>
                                        {asset.purchasePrice > 0 && (
                                            <Text style={styles.boughtFor}>Bought: ₹{parseFloat(asset.purchasePrice).toLocaleString()}</Text>
                                        )}
                                    </View>
                                </View>
                            </LuxuryCard>
                        );
                    })
                )}
            </ScrollView>

            {/* Modal */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Asset</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Name (e.g. Gold Necklace)"
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                        />

                        <View style={styles.typeRow}>
                            {['Gold', 'Electronics', 'Vehicle', 'Watch', 'Art', 'Other'].map(c => (
                                <Pressable
                                    key={c}
                                    style={[styles.typeChip, category === c && styles.activeTypeChip]}
                                    onPress={() => setCategory(c)}
                                >
                                    <Text style={[styles.typeChipText, category === c && { color: '#FFF' }]}>{c}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Bought For (₹)"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={purchasePrice}
                                onChangeText={setPurchasePrice}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Value (₹)"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={currentValue}
                                onChangeText={setCurrentValue}
                            />
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Description (Optional)"
                            placeholderTextColor="#666"
                            value={description}
                            onChangeText={setDescription}
                        />

                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleAdd}>
                                <Text style={styles.btnText}>Save</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#14B8A6' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },

    summaryCard: { padding: 24, marginBottom: 32, backgroundColor: '#18181B' },
    summaryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 13, color: '#A1A1AA', letterSpacing: 1, marginBottom: 8 },
    summaryValue: { fontSize: 32, fontWeight: '900', color: '#FFF' },
    iconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#14B8A620', justifyContent: 'center', alignItems: 'center' },

    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },

    assetCard: { padding: 16, marginBottom: 12, backgroundColor: '#18181B' },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    cardIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    assetName: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 2 },
    assetCat: { fontSize: 12, color: '#71717A' },
    assetValue: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    boughtFor: { fontSize: 11, color: '#52525B' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 16 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#333' },
    activeTypeChip: { backgroundColor: '#14B8A6', borderColor: '#14B8A6' },
    typeChipText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, backgroundColor: '#333', borderRadius: 16, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 16, backgroundColor: '#14B8A6', borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
