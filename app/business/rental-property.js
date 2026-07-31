import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Building, Users, Wallet, ArrowLeft, MoreVertical, CheckCircle2, AlertCircle, Clock, X, FileText, Megaphone } from 'lucide-react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { updateBusinessStats } from '../../services/storage';

// New Business Components
import TenantList from '../../components/business/rental/TenantList';
import SmartLease from '../../components/business/rental/SmartLease';
import VacancyMarketing from '../../components/business/rental/VacancyMarketing';

export default function RentalPropertyModule() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [showLeaseModal, setShowLeaseModal] = useState(false);
    const [showMarketingModal, setShowMarketingModal] = useState(false);

    // Mock Data State
    const [tenants, setTenants] = useState([
        { id: 1, name: 'Rahul Sharma', unit: '101', rent: 25000, status: 'paid', due: '5th' },
        { id: 2, name: 'Priya Patel', unit: '102', rent: 22000, status: 'pending', due: '1st' },
        { id: 3, name: 'Amit Singh', unit: '201', rent: 28000, status: 'overdue', due: '10th' },
        { id: 4, name: 'Neha Gupta', unit: '202', rent: 24000, status: 'paid', due: '5th' },
    ]);

    // New Tenant Form State
    const [newTenant, setNewTenant] = useState({ name: '', unit: '', rent: '', due: '' });

    // Derived Stats
    const stats = useMemo(() => {
        const totalRent = tenants.reduce((sum, t) => sum + t.rent, 0);
        const collectedRent = tenants.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.rent, 0);
        const pendingRent = totalRent - collectedRent;
        const occupiedUnits = tenants.length;
        const totalUnits = 6; // Assuming 6 units total for this property
        const occupancyRate = Math.round((occupiedUnits / totalUnits) * 100);

        return {
            monthlyRevenue: totalRent,
            collected: collectedRent,
            pending: pendingRent,
            occupancy: occupancyRate
        };
    }, [tenants]);

    // Persist Stats
    React.useEffect(() => {
        updateBusinessStats('rental', {
            calculatedRevenue: stats.monthlyRevenue,
            ...stats
        });
    }, [stats]);

    const handleAddTenant = () => {
        if (!newTenant.name || !newTenant.unit || !newTenant.rent) return;

        const tenant = {
            id: Date.now(),
            name: newTenant.name,
            unit: newTenant.unit,
            rent: parseFloat(newTenant.rent),
            status: 'pending', // Default status
            due: newTenant.due || '1st'
        };

        setTenants([...tenants, tenant]);
        setNewTenant({ name: '', unit: '', rent: '', due: '' });
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
                        <Text style={styles.title}>Rental Properties</Text>
                    </View>
                    <TouchableOpacity style={styles.menuButton}>
                        <MoreVertical size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Hero Card */}
                <View style={styles.heroCardWrapper}>
                    <LinearGradient
                        colors={['#8B5CF6', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroHeader}>
                            <View style={styles.iconBadge}>
                                <Building size={20} color="#FFFFFF" />
                            </View>
                            <Text style={styles.heroTitle}>Greenwood Apartments</Text>
                        </View>

                        <View style={styles.mainStat}>
                            <Text style={styles.mainStatLabel}>Monthly Revenue</Text>
                            <Text style={styles.mainStatValue}>₹{(stats.monthlyRevenue / 1000).toFixed(1)}k</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Occupancy</Text>
                                <Text style={styles.miniStatValue}>{stats.occupancy}%</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Collected</Text>
                                <Text style={styles.miniStatValue}>₹{(stats.collected / 1000).toFixed(1)}k</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Pending</Text>
                                <Text style={styles.miniStatValue}>₹{(stats.pending / 1000).toFixed(1)}k</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>



                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <Users size={24} color="#8B5CF6" />
                            <Text style={styles.actionText}>Add Tenant</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowLeaseModal(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <FileText size={24} color="#8B5CF6" />
                            <Text style={styles.actionText}>Smart Lease</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowMarketingModal(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <Megaphone size={24} color="#8B5CF6" />
                            <Text style={styles.actionText}>Post Ad</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Tenant List */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Tenants</Text>
                    <TouchableOpacity style={styles.filterButton}>
                        <Text style={styles.filterText}>All Units</Text>
                    </TouchableOpacity>
                </View>

                {/* Extracted Tenant List Component */}
                <TenantList tenants={tenants} />

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Add Tenant Modal */}
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
                            <Text style={styles.modalTitle}>Add New Tenant</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Tenant Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. John Doe"
                                placeholderTextColor="#52525B"
                                value={newTenant.name}
                                onChangeText={(text) => setNewTenant({ ...newTenant, name: text })}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Unit No.</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 101"
                                    placeholderTextColor="#52525B"
                                    value={newTenant.unit}
                                    onChangeText={(text) => setNewTenant({ ...newTenant, unit: text })}
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Rent Amount</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="₹"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newTenant.rent}
                                    onChangeText={(text) => setNewTenant({ ...newTenant, rent: text })}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Due Date</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 5th of every month"
                                placeholderTextColor="#52525B"
                                value={newTenant.due}
                                onChangeText={(text) => setNewTenant({ ...newTenant, due: text })}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleAddTenant}
                        >
                            <LinearGradient
                                colors={['#8B5CF6', '#7C3AED']}
                                style={styles.saveGradient}
                            >
                                <Text style={styles.saveText}>Add Tenant</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>


            {/* Feature Modals */}
            <SmartLease visible={showLeaseModal} onClose={() => setShowLeaseModal(false)} />
            <VacancyMarketing visible={showMarketingModal} onClose={() => setShowMarketingModal(false)} />
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
    tenantCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#18181B',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    tenantInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    tenantName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 2
    },
    unitText: {
        fontSize: 12,
        color: '#71717A'
    },
    rentInfo: {
        alignItems: 'flex-end',
        gap: 6
    },
    rentAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1
    },
    statusPaid: { backgroundColor: '#10B98115', borderColor: '#10B98130' },
    statusOverdue: { backgroundColor: '#EF444415', borderColor: '#EF444430' },
    statusPending: { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' },
    statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    textPaid: { color: '#10B981' },
    textOverdue: { color: '#EF4444' },
    textPending: { color: '#F59E0B' },
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
