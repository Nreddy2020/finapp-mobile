import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, TextInput, Modal, Alert, FlatList, Image } from 'react-native';
import { Home, ChevronLeft, Plus, DollarSign, TrendingUp, MapPin, Building, Key } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import LuxuryEmptyState from '../components/ui/LuxuryEmptyState';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { PropertiesService } from '../services/properties';

export default function PropertiesScreen() {
    const router = useRouter();
    const [properties, setProperties] = useState([]);
    const [totalValue, setTotalValue] = useState(0);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState('Apartment');
    const [location, setLocation] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [currentValue, setCurrentValue] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await PropertiesService.getProperties();
        setProperties(data);
        setTotalValue(PropertiesService.calculateTotalValue(data));
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!name || !currentValue) {
            Alert.alert('Missing Fields', 'Name and Current Value are required.');
            return;
        }

        const newProperty = {
            name,
            type,
            location,
            purchasePrice,
            currentValue
        };

        const updated = await PropertiesService.addProperty(newProperty);
        setProperties(updated);
        setTotalValue(PropertiesService.calculateTotalValue(updated));
        setModalVisible(false);
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setType('Apartment');
        setLocation('');
        setPurchasePrice('');
        setCurrentValue('');
    };

    const handleDelete = async (id) => {
        Alert.alert('Delete Property', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const updated = await PropertiesService.deleteProperty(id);
                    setProperties(updated);
                    setTotalValue(PropertiesService.calculateTotalValue(updated));
                }
            }
        ]);
    };

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Real Estate</Text>
                <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Plus color="#FFFFFF" size={24} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Summary Card */}
                <LuxuryCard style={styles.summaryCard}>
                    <View style={styles.summaryContent}>
                        <View>
                            <Text style={styles.summaryLabel}>PORTFOLIO VALUE</Text>
                            <Text style={styles.summaryValue}>₹{totalValue.toLocaleString()}</Text>
                        </View>
                        <View style={styles.iconBox}>
                            <Building size={24} color="#8B5CF6" />
                        </View>
                    </View>
                </LuxuryCard>

                <Text style={styles.sectionTitle}>My Properties</Text>

                {properties.length === 0 ? (
                    <LuxuryEmptyState
                        title="No Properties"
                        subtitle="Add your homes, land, or commercial properties."
                        icon={Home}
                        themeColor="#8B5CF6"
                    />
                ) : (
                    properties.map((prop, index) => (
                        <LuxuryCard key={prop.id} index={index} style={styles.propertyCard} onPress={() => handleDelete(prop.id)}>
                            <View style={styles.cardHeader}>
                                <View style={styles.typeTag}>
                                    <Home size={12} color="#8B5CF6" />
                                    <Text style={styles.typeText}>{prop.type}</Text>
                                </View>
                                <Text style={styles.value}>₹{parseFloat(prop.currentValue).toLocaleString()}</Text>
                            </View>

                            <Text style={styles.propName}>{prop.name}</Text>

                            {prop.location ? (
                                <View style={styles.locationRow}>
                                    <MapPin size={12} color="#A1A1AA" />
                                    <Text style={styles.locationText}>{prop.location}</Text>
                                </View>
                            ) : null}

                            <View style={styles.divider} />

                            <View style={styles.statsRow}>
                                <View>
                                    <Text style={styles.statLabel}>PURCHASED</Text>
                                    <Text style={styles.statValue}>₹{parseFloat(prop.purchasePrice).toLocaleString()}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.statLabel}>APPRECIATION</Text>
                                    <Text style={[styles.statValue, { color: '#10B981' }]}>
                                        {prop.purchasePrice > 0
                                            ? `+${(((prop.currentValue - prop.purchasePrice) / prop.purchasePrice) * 100).toFixed(1)}%`
                                            : 'N/A'}
                                    </Text>
                                </View>
                            </View>
                        </LuxuryCard>
                    ))
                )}
            </ScrollView>

            {/* Modal */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Property</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Property Name (e.g. Dream House)"
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                        />

                        <View style={styles.typeRow}>
                            {['Apartment', 'House', 'Land', 'Commercial'].map(t => (
                                <Pressable
                                    key={t}
                                    style={[styles.typeChip, type === t && styles.activeTypeChip]}
                                    onPress={() => setType(t)}
                                >
                                    <Text style={[styles.typeChipText, type === t && { color: '#FFF' }]}>{t}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Location (City, Area)"
                            placeholderTextColor="#666"
                            value={location}
                            onChangeText={setLocation}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Purchase Price (₹)"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={purchasePrice}
                                onChangeText={setPurchasePrice}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Current Value (₹)"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={currentValue}
                                onChangeText={setCurrentValue}
                            />
                        </View>

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
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#8B5CF6' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },
    summaryCard: { padding: 24, marginBottom: 32, backgroundColor: '#18181B' },
    summaryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 13, color: '#A1A1AA', letterSpacing: 1, marginBottom: 8 },
    summaryValue: { fontSize: 32, fontWeight: '900', color: '#FFF' },
    iconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8B5CF620', justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },

    propertyCard: { padding: 16, marginBottom: 16, backgroundColor: '#18181B' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    typeTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8B5CF620', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    typeText: { fontSize: 12, color: '#8B5CF6', fontWeight: '700' },
    value: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    propName: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 4 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
    locationText: { fontSize: 13, color: '#A1A1AA' },
    divider: { height: 1, backgroundColor: '#FFFFFF10', marginVertical: 12 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statLabel: { fontSize: 10, color: '#71717A', marginBottom: 4 },
    statValue: { fontSize: 14, color: '#FFF', fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 16 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#333' },
    activeTypeChip: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    typeChipText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, backgroundColor: '#333', borderRadius: 16, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 16, backgroundColor: '#8B5CF6', borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
