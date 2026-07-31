import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Hotel, BedDouble, CalendarDays, Plus, ArrowLeft, MoreVertical, Star, Users, Coffee, X, Globe, Zap, ConciergeBell } from 'lucide-react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { updateBusinessStats } from '../../services/storage';

// New Components
import ChannelManager from '../../components/business/hospitality/ChannelManager';
import DynamicPricing from '../../components/business/hospitality/DynamicPricing';
import GuestExperience from '../../components/business/hospitality/GuestExperience';

export default function HospitalityModule() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [showChannels, setShowChannels] = useState(false);
    const [showPricing, setShowPricing] = useState(false);
    const [showGuestExp, setShowGuestExp] = useState(false);

    // Mock Data State
    const [rooms, setRooms] = useState([
        { id: 101, type: 'Deluxe Suite', guest: 'Mr. Kapoor', status: 'occupied', checkout: 'Tomorrow', price: 5000 },
        { id: 102, type: 'Standard', guest: '-', status: 'available', checkout: '-', price: 2500 },
        { id: 103, type: 'Standard', guest: 'Ms. Verma', status: 'occupied', checkout: 'Today', price: 2500 },
        { id: 104, type: 'Family Suite', guest: '-', status: 'cleaning', checkout: '-', price: 6000 },
        { id: 105, type: 'Standard', guest: '-', status: 'available', checkout: '-', price: 2500 },
        { id: 106, type: 'Deluxe Suite', guest: 'Mr. Singh', status: 'occupied', checkout: 'In 2 days', price: 5000 },
    ]);

    // New Booking Form State
    const [booking, setBooking] = useState({ guestName: '', roomNumber: '' });

    // Derived Stats
    const stats = useMemo(() => {
        const totalRooms = rooms.length;
        const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
        const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);

        // RevPAR = Total Revenue / Total Available Rooms
        const currentRevenue = rooms.filter(r => r.status === 'occupied').reduce((sum, r) => sum + r.price, 0);
        const revpar = Math.round(currentRevenue / totalRooms);

        return {
            occupancy: occupancyRate,
            revpar: revpar,
            checkins: rooms.filter(r => r.status === 'occupied').length, // Mock logic
            checkouts: rooms.filter(r => r.checkout === 'Today').length
        };
    }, [rooms]);

    // Persist Stats
    React.useEffect(() => {
        updateBusinessStats('hospitality', {
            calculatedRevenue: stats.occupancy * 4500 * 30,
            ...stats
        });
    }, [stats]);

    const handleNewBooking = () => {
        if (!booking.guestName || !booking.roomNumber) return;

        const roomId = parseInt(booking.roomNumber);
        const roomIndex = rooms.findIndex(r => r.id === roomId);

        if (roomIndex === -1) {
            alert("Invalid Room Number");
            return;
        }

        if (rooms[roomIndex].status === 'occupied') {
            alert("Room is already occupied!");
            return;
        }

        const updatedRooms = [...rooms];
        updatedRooms[roomIndex] = {
            ...updatedRooms[roomIndex],
            guest: booking.guestName,
            status: 'occupied',
            checkout: 'In 1 day' // Default stay
        };

        setRooms(updatedRooms);
        setBooking({ guestName: '', roomNumber: '' });
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
                        <Text style={styles.title}>Hospitality</Text>
                    </View>
                    <TouchableOpacity style={styles.menuButton}>
                        <MoreVertical size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Hero Card */}
                <View style={styles.heroCardWrapper}>
                    <LinearGradient
                        colors={['#3B82F6', '#2563EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroHeader}>
                            <View style={styles.iconBadge}>
                                <Hotel size={20} color="#FFFFFF" />
                            </View>
                            <Text style={styles.heroTitle}>Grand Horizon Hotel</Text>
                        </View>

                        <View style={styles.mainStat}>
                            <Text style={styles.mainStatLabel}>Occupancy Rate</Text>
                            <Text style={styles.mainStatValue}>{stats.occupancy}%</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>RevPAR</Text>
                                <Text style={styles.miniStatValue}>₹{stats.revpar}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Check-ins</Text>
                                <Text style={styles.miniStatValue}>{stats.checkins}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Check-outs</Text>
                                <Text style={styles.miniStatValue}>{stats.checkouts}</Text>
                            </View>
                        </View>
                    </LinearGradient>


                    {/* Quick Actions */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => setShowChannels(true)}>
                            <LinearGradient
                                colors={['#18181B', '#18181B']}
                                style={styles.actionGradient}
                            >
                                <Globe size={24} color="#3B82F6" />
                                <Text style={styles.actionText}>Channels</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => setShowPricing(true)}>
                            <LinearGradient
                                colors={['#18181B', '#18181B']}
                                style={styles.actionGradient}
                            >
                                <Zap size={24} color="#3B82F6" />
                                <Text style={styles.actionText}>Pricing AI</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => setShowGuestExp(true)}>
                            <LinearGradient
                                colors={['#18181B', '#18181B']}
                                style={styles.actionGradient}
                            >
                                <Star size={24} color="#3B82F6" />
                                <Text style={styles.actionText}>Concierge</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Room Status */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Room Status</Text>
                            <TouchableOpacity style={styles.filterButton} onPress={() => setModalVisible(true)}>
                                <Plus size={14} color="#FFF" style={{ marginRight: 4 }} />
                                <Text style={styles.filterText}>New Booking</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.grid}>
                            {rooms.map((room) => (
                                <View key={room.id} style={styles.roomCard}>
                                    <View style={styles.roomHeader}>
                                        <Text style={styles.roomNumber}>{room.id}</Text>
                                        <View style={[
                                            styles.statusDot,
                                            room.status === 'occupied' ? styles.dotOccupied :
                                                room.status === 'available' ? styles.dotAvailable : styles.dotCleaning
                                        ]} />
                                    </View>

                                    <Text style={styles.roomType}>{room.type}</Text>

                                    <View style={styles.guestInfo}>
                                        <Users size={12} color="#71717A" />
                                        <Text style={styles.guestName}>{room.guest}</Text>
                                    </View>

                                    {room.status === 'occupied' && (
                                        <View style={styles.checkoutBadge}>
                                            <Text style={styles.checkoutText}>Out: {room.checkout}</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* New Booking Modal */}
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
                            <Text style={styles.modalTitle}>New Booking</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Guest Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. John Smith"
                                placeholderTextColor="#52525B"
                                value={booking.guestName}
                                onChangeText={(text) => setBooking({ ...booking, guestName: text })}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Room Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 102"
                                placeholderTextColor="#52525B"
                                keyboardType="numeric"
                                value={booking.roomNumber}
                                onChangeText={(text) => setBooking({ ...booking, roomNumber: text })}
                            />
                            <Text style={styles.helperText}>Available Rooms: {rooms.filter(r => r.status === 'available').map(r => r.id).join(', ')}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleNewBooking}
                        >
                            <LinearGradient
                                colors={['#3B82F6', '#2563EB']}
                                style={styles.saveGradient}
                            >
                                <Text style={styles.saveText}>Check In Guest</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Feature Modals */}
            <ChannelManager visible={showChannels} onClose={() => setShowChannels(false)} />
            <DynamicPricing visible={showPricing} onClose={() => setShowPricing(false)} />
            <GuestExperience visible={showGuestExp} onClose={() => setShowGuestExp(false)} />
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
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12
    },
    roomCard: {
        width: '48%',
        backgroundColor: '#18181B',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    roomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    roomNumber: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    dotOccupied: { backgroundColor: '#EF4444' },
    dotAvailable: { backgroundColor: '#10B981' },
    dotCleaning: { backgroundColor: '#F59E0B' },
    roomType: {
        fontSize: 12,
        color: '#71717A',
        marginBottom: 12
    },
    guestInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12
    },
    guestName: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '500'
    },
    checkoutBadge: {
        backgroundColor: '#EF444415',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    checkoutText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#EF4444'
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
    helperText: {
        fontSize: 11,
        color: '#71717A',
        marginTop: 8
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
