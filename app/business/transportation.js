import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Truck, MapPin, Package, Clock, Plus, ArrowLeft, MoreVertical, Navigation, Fuel, X, Map, CheckSquare } from 'lucide-react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { updateBusinessStats } from '../../services/storage';

// New Components
import RouteOptimizer from '../../components/business/logistics/RouteOptimizer';
import ProofOfDelivery from '../../components/business/logistics/ProofOfDelivery';
import FleetTracker from '../../components/business/logistics/FleetTracker';

export default function TransportationModule() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [showRoutes, setShowRoutes] = useState(false);
    const [showPOD, setShowPOD] = useState(false);
    const [showFleet, setShowFleet] = useState(false);

    // Mock Data
    const [deliveries, setDeliveries] = useState([
        { id: 'TRK-01', driver: 'Rajesh Kumar', destination: 'Mumbai Central', status: 'in-transit', eta: '2 hrs', fuel: 5000 },
        { id: 'TRK-03', driver: 'Amit Singh', destination: 'Pune Warehouse', status: 'loading', eta: '4 hrs', fuel: 2000 },
        { id: 'TRK-02', driver: 'Vikram Malhotra', destination: 'Thane Hub', status: 'completed', eta: '-', fuel: 4500 },
    ]);

    // New Trip Form State
    const [newTrip, setNewTrip] = useState({ vehicleId: '', destination: '', driver: '' });

    // Derived Stats
    const stats = useMemo(() => {
        const activeTrips = deliveries.filter(d => d.status === 'in-transit' || d.status === 'loading').length;
        const completedTrips = deliveries.filter(d => d.status === 'completed').length;
        const totalTrips = deliveries.length;

        // Mock calculations
        const onTimeRate = totalTrips > 0 ? 96 : 100;
        const totalFuel = deliveries.reduce((sum, d) => sum + (d.fuel || 0), 0) + 75000; // +75k historical

        return {
            activeTrips: activeTrips,
            onTimeRate: onTimeRate,
            fleetStatus: `${activeTrips + 5}/15 Active`, // Mock fleet total
            monthlyFuel: totalFuel
        };
    }, [deliveries]);

    // Persist Stats
    React.useEffect(() => {
        updateBusinessStats('transportation', {
            calculatedRevenue: stats.activeTrips * 15000, // Est revenue per trip
            ...stats
        });
    }, [stats]);

    const handleAddTrip = () => {
        if (!newTrip.vehicleId || !newTrip.destination || !newTrip.driver) return;

        const trip = {
            id: newTrip.vehicleId,
            driver: newTrip.driver,
            destination: newTrip.destination,
            status: 'loading',
            eta: 'TBD',
            fuel: 0
        };

        setDeliveries([trip, ...deliveries]);
        setNewTrip({ vehicleId: '', destination: '', driver: '' });
        setModalVisible(false);
    };

    return (
        <AnimatedScreen style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>Business Module</Text>
                        <Text style={styles.title}>Logistics</Text>
                    </View>
                    <TouchableOpacity style={styles.menuButton}>
                        <MoreVertical size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Hero Card */}
                <View style={styles.heroCardWrapper}>
                    <LinearGradient
                        colors={['#06B6D4', '#0891B2']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroHeader}>
                            <View style={styles.iconBadge}>
                                <Truck size={20} color="#FFFFFF" />
                            </View>
                            <Text style={styles.heroTitle}>FastTrack Logistics</Text>
                        </View>

                        <View style={styles.mainStat}>
                            <Text style={styles.mainStatLabel}>Active Deliveries</Text>
                            <Text style={styles.mainStatValue}>{stats.activeTrips}</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>On-Time</Text>
                                <Text style={styles.miniStatValue}>{stats.onTimeRate}%</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Fuel Cost</Text>
                                <Text style={styles.miniStatValue}>₹{(stats.monthlyFuel / 1000).toFixed(1)}k</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Fleet</Text>
                                <Text style={styles.miniStatValue}>{stats.fleetStatus}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Quick Actions */}
                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowRoutes(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <Map size={24} color="#06B6D4" />
                            <Text style={styles.actionText}>Optimize</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowPOD(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <CheckSquare size={24} color="#06B6D4" />
                            <Text style={styles.actionText}>e-POD</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowFleet(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <Truck size={24} color="#06B6D4" />
                            <Text style={styles.actionText}>Live Fleet</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Fleet Status */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Live Tracking</Text>
                        <TouchableOpacity style={styles.filterButton} onPress={() => setModalVisible(true)}>
                            <Plus size={14} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.filterText}>New Trip</Text>
                        </TouchableOpacity>
                    </View>

                    {deliveries.map((trip) => (
                        <View key={trip.id} style={styles.tripCard}>
                            <View style={styles.tripIcon}>
                                <Truck size={20} color={trip.status === 'in-transit' ? '#06B6D4' : '#71717A'} />
                            </View>

                            <View style={styles.tripInfo}>
                                <View style={styles.tripHeader}>
                                    <Text style={styles.vehicleId}>{trip.id}</Text>
                                    <View style={[
                                        styles.statusPill,
                                        trip.status === 'in-transit' ? styles.statusActive :
                                            trip.status === 'loading' ? styles.statusLoading : styles.statusDone
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            trip.status === 'in-transit' ? styles.textActive :
                                                trip.status === 'loading' ? styles.textLoading : styles.textDone
                                        ]}>{trip.status}</Text>
                                    </View>
                                </View>

                                <Text style={styles.driverName}>{trip.driver}</Text>

                                <View style={styles.tripMeta}>
                                    <View style={styles.metaItem}>
                                        <MapPin size={12} color="#71717A" />
                                        <Text style={styles.metaText}>{trip.destination}</Text>
                                    </View>
                                    {trip.eta !== '-' && (
                                        <View style={styles.metaItem}>
                                            <Clock size={12} color="#71717A" />
                                            <Text style={styles.metaText}>ETA: {trip.eta}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* New Trip Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Dispatch New Trip</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Vehicle ID</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. TRK-09"
                                placeholderTextColor="#52525B"
                                value={newTrip.vehicleId}
                                onChangeText={(text) => setNewTrip({ ...newTrip, vehicleId: text })}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Driver Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Sunil Kumar"
                                placeholderTextColor="#52525B"
                                value={newTrip.driver}
                                onChangeText={(text) => setNewTrip({ ...newTrip, driver: text })}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Destination</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Delhi Warehouse"
                                placeholderTextColor="#52525B"
                                value={newTrip.destination}
                                onChangeText={(text) => setNewTrip({ ...newTrip, destination: text })}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleAddTrip}
                        >
                            <LinearGradient
                                colors={['#06B6D4', '#0891B2']}
                                style={styles.saveGradient}
                            >
                                <Text style={styles.saveText}>Start Trip</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Feature Modals */}
            <RouteOptimizer visible={showRoutes} onClose={() => setShowRoutes(false)} />
            <ProofOfDelivery visible={showPOD} onClose={() => setShowPOD(false)} />
            <FleetTracker visible={showFleet} onClose={() => setShowFleet(false)} />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10',
        marginLeft: 'auto'
    },
    headerLabel: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 4
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    heroCardWrapper: {
        paddingHorizontal: 24,
        marginBottom: 24
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        position: 'relative'
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24
    },
    iconBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    heroTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    mainStat: {
        marginBottom: 24
    },
    mainStatLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 4
    },
    mainStatValue: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 16,
        justifyContent: 'space-between'
    },
    miniStat: {
        alignItems: 'center',
        flex: 1
    },
    miniStatLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: '600'
    },
    miniStatValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    divider: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    actionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 32
    },
    actionButton: {
        flex: 1,
        height: 70,
        borderRadius: 16,
        overflow: 'hidden'
    },
    actionGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#FFFFFF10',
        borderRadius: 16
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    section: {
        paddingHorizontal: 24
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#27272A',
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    filterText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    tripCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        gap: 16
    },
    tripIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center'
    },
    tripInfo: {
        flex: 1
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    vehicleId: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6
    },
    statusActive: { backgroundColor: '#06B6D420' },
    statusLoading: { backgroundColor: '#F59E0B20' },
    statusDone: { backgroundColor: '#10B98120' },
    statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    textActive: { color: '#06B6D4' },
    textLoading: { color: '#F59E0B' },
    textDone: { color: '#10B981' },
    driverName: {
        fontSize: 13,
        color: '#A1A1AA',
        marginBottom: 8
    },
    tripMeta: {
        flexDirection: 'row',
        gap: 12
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    metaText: {
        fontSize: 12,
        color: '#71717A'
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#18181B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#FFFFFF10'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    inputContainer: {
        marginBottom: 20
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#71717A',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    input: {
        backgroundColor: '#27272A',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    saveButton: {
        marginTop: 12,
        height: 56,
        borderRadius: 16,
        overflow: 'hidden'
    },
    saveGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    saveText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    }
});
