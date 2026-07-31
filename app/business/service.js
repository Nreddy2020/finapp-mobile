import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Briefcase, Calendar, Users, Clock, Plus, ArrowLeft, MoreVertical, DollarSign, Star, CheckCircle, X, MapPin, Shield } from 'lucide-react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { updateBusinessStats } from '../../services/storage';

// New Components
import NoShowProtection from '../../components/business/service/NoShowProtection';
import WaitlistAI from '../../components/business/service/WaitlistAI';
import TechnicianTracker from '../../components/business/service/TechnicianTracker';

export default function ServiceBusinessModule() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [showNoShow, setShowNoShow] = useState(false);
    const [showWaitlist, setShowWaitlist] = useState(false);
    const [showTracker, setShowTracker] = useState(false);

    // Mock Data
    const [appointments, setAppointments] = useState([
        { id: 1, client: 'Anjali Menon', service: 'Business Consulting', time: '10:00 AM', status: 'upcoming', price: 5000 },
        { id: 2, client: 'Rohit Verma', service: 'Tax Filing', time: '2:30 PM', status: 'upcoming', price: 2500 },
        { id: 3, client: 'TechStart Inc', service: 'Retainer', time: 'Today', status: 'completed', price: 15000 },
    ]);

    // New Booking Form State
    const [newBooking, setNewBooking] = useState({ client: '', service: '', time: '', price: '' });

    // Derived Stats
    const stats = useMemo(() => {
        const totalRevenue = appointments.reduce((sum, apt) => sum + apt.price, 0);
        const uniqueClients = new Set(appointments.map(a => a.client)).size;
        const pendingCount = appointments.filter(a => a.status === 'upcoming').length;

        // Mock utilization calculation
        const utilization = Math.min(100, Math.round((appointments.length / 8) * 100)); // Assuming 8 slots per day capacity

        return {
            activeClients: uniqueClients + 25, // +25 mock historical clients
            pendingBookings: pendingCount,
            monthlyRevenue: totalRevenue + 100000, // +100k mock previous revenue
            utilization: utilization
        };
    }, [appointments]);

    // Persist Stats
    React.useEffect(() => {
        updateBusinessStats('service', {
            calculatedRevenue: stats.revenue,
            ...stats
        });
    }, [stats]);

    const handleBookSlot = () => {
        if (!newBooking.client || !newBooking.service || !newBooking.price) return;

        const booking = {
            id: Date.now(),
            client: newBooking.client,
            service: newBooking.service,
            time: newBooking.time || 'TBD',
            status: 'upcoming',
            price: parseFloat(newBooking.price)
        };

        setAppointments([booking, ...appointments]);
        setNewBooking({ client: '', service: '', time: '', price: '' });
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
                        <Text style={styles.title}>Consulting Firm</Text>
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
                                <Briefcase size={20} color="#FFFFFF" />
                            </View>
                            <Text style={styles.heroTitle}>Elite Solutions</Text>
                        </View>

                        <View style={styles.mainStat}>
                            <Text style={styles.mainStatLabel}>Monthly Revenue</Text>
                            <Text style={styles.mainStatValue}>₹{(stats.monthlyRevenue / 1000).toFixed(1)}k</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Active Clients</Text>
                                <Text style={styles.miniStatValue}>{stats.activeClients}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Pending</Text>
                                <Text style={styles.miniStatValue}>{stats.pendingBookings}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Utilization</Text>
                                <Text style={styles.miniStatValue}>{stats.utilization}%</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowNoShow(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <Shield size={24} color="#3B82F6" />
                            <Text style={styles.actionText}>Protection</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowWaitlist(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <Users size={24} color="#3B82F6" />
                            <Text style={styles.actionText}>Waitlist AI</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowTracker(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <MapPin size={24} color="#3B82F6" />
                            <Text style={styles.actionText}>Team Map</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Upcoming Appointments */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
                        <TouchableOpacity style={styles.viewAllButton} onPress={() => setModalVisible(true)}>
                            <Plus size={14} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.viewAllText}>Booking</Text>
                        </TouchableOpacity>
                    </View>

                    {appointments.map((apt) => (
                        <View key={apt.id} style={styles.appointmentCard}>
                            <View style={styles.timeColumn}>
                                <Text style={styles.timeText}>{apt.time}</Text>
                                <View style={[styles.statusDot, apt.status === 'completed' ? styles.dotCompleted : styles.dotUpcoming]} />
                            </View>

                            <View style={styles.aptInfo}>
                                <Text style={styles.clientName}>{apt.client}</Text>
                                <Text style={styles.serviceName}>{apt.service}</Text>
                            </View>

                            <View style={styles.priceColumn}>
                                <Text style={styles.priceText}>₹{apt.price.toLocaleString()}</Text>
                                {apt.status === 'completed' && <CheckCircle size={14} color="#10B981" />}
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Book Slot Modal */}
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
                            <Text style={styles.modalTitle}>Book Session</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Client Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Acme Corp"
                                placeholderTextColor="#52525B"
                                value={newBooking.client}
                                onChangeText={(text) => setNewBooking({ ...newBooking, client: text })}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Service Type</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Strategy Consultation"
                                placeholderTextColor="#52525B"
                                value={newBooking.service}
                                onChangeText={(text) => setNewBooking({ ...newBooking, service: text })}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Time</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 4:00 PM"
                                    placeholderTextColor="#52525B"
                                    value={newBooking.time}
                                    onChangeText={(text) => setNewBooking({ ...newBooking, time: text })}
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Price (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newBooking.price}
                                    onChangeText={(text) => setNewBooking({ ...newBooking, price: text })}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleBookSlot}
                        >
                            <LinearGradient
                                colors={['#3B82F6', '#2563EB']}
                                style={styles.saveGradient}
                            >
                                <Text style={styles.saveText}>Confirm Booking</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Feature Modals */}
            <NoShowProtection visible={showNoShow} onClose={() => setShowNoShow(false)} />
            <WaitlistAI visible={showWaitlist} onClose={() => setShowWaitlist(false)} />
            <TechnicianTracker visible={showTracker} onClose={() => setShowTracker(false)} />
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
    viewAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#27272A',
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    viewAllText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    appointmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    timeColumn: {
        alignItems: 'center',
        gap: 6,
        paddingRight: 16,
        borderRightWidth: 1,
        borderRightColor: '#FFFFFF08',
        width: 80
    },
    timeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3
    },
    dotUpcoming: { backgroundColor: '#3B82F6' },
    dotCompleted: { backgroundColor: '#10B981' },
    aptInfo: {
        flex: 1,
        paddingLeft: 16
    },
    clientName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4
    },
    serviceName: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '500'
    },
    priceColumn: {
        alignItems: 'flex-end',
        gap: 4
    },
    priceText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#3B82F6'
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
    row: {
        flexDirection: 'row',
        gap: 16
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
