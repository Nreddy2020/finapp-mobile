import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';
import { Building, Plus, Receipt, Sparkles, AlertCircle, Calculator, Zap, FileText, CheckCircle, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';

// New Components
import RentVsBuy from '../../components/housing/RentVsBuy';
import UtilitySplitter from '../../components/housing/UtilitySplitter';
import LeaseManager from '../../components/housing/LeaseManager';
import { ApartmentService } from '../../services/apartment';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';

export default function ApartmentScreen() {
    const [maintenance, setMaintenance] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // Modals
    const [showRentVsBuy, setShowRentVsBuy] = useState(false);
    const [showUtility, setShowUtility] = useState(false);
    const [showLease, setShowLease] = useState(false);
    const [showAddLog, setShowAddLog] = useState(false);

    // Form
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('2024');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');

    const fetchMaintenance = async () => {
        const data = await ApartmentService.seedDefaults();
        setMaintenance(data);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchMaintenance();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMaintenance();
    };

    const handleAddLog = async () => {
        if (!month || !amount) return;
        await ApartmentService.addMaintenanceLog({ month, year, amount, due_date: date, status: 'pending' });
        setShowAddLog(false);
        setMonth('');
        setAmount('');
        setDate('');
        fetchMaintenance();
    };

    const markAsPaid = async (id) => {
        const updated = await ApartmentService.updateLogStatus(id, 'paid');
        setMaintenance(updated);
    };

    const totalUnpaid = maintenance.filter(m => m.status === 'pending').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
    const THEME_COLOR = '#F43F5E'; // Rose

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
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerLabel}>Society Dues</Text>
                        <Text style={styles.title}>Apartment</Text>
                    </View>
                </View>

                {/* Hero Card */}
                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={[`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>Total Outstanding</Text>
                            <Text style={styles.heroAmount}>₹{totalUnpaid.toLocaleString('en-IN')}</Text>
                            <View style={styles.heroFooter}>
                                <View style={styles.heroIconBadge}>
                                    <AlertCircle size={14} color="#FFFFFF" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.heroSubtext}>pending for current quarter</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Housing Tools */}
                <View style={styles.toolsRow}>
                    <Pressable style={styles.toolBtn} onPress={() => setShowRentVsBuy(true)}>
                        <View style={[styles.iconBox, { backgroundColor: '#F43F5E20' }]}>
                            <Calculator size={20} color="#F43F5E" />
                        </View>
                        <Text style={styles.toolText}>Rent vs Buy</Text>
                    </Pressable>
                    <Pressable style={styles.toolBtn} onPress={() => setShowUtility(true)}>
                        <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
                            <Zap size={20} color="#F59E0B" />
                        </View>
                        <Text style={styles.toolText}>Split Bills</Text>
                    </Pressable>
                    <Pressable style={styles.toolBtn} onPress={() => setShowLease(true)}>
                        <View style={[styles.iconBox, { backgroundColor: '#8B5CF620' }]}>
                            <FileText size={20} color="#8B5CF6" />
                        </View>
                        <Text style={styles.toolText}>Lease</Text>
                    </Pressable>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Maintenance Logs</Text>

                    {maintenance.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <Building size={32} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyText}>No logs found</Text>
                            <Text style={styles.emptySubtext}>Your maintenance history is clean</Text>
                        </View>
                    ) : (
                        maintenance.map((m, index) => (
                            <LuxuryCard
                                key={m.id || index}
                                index={index}
                                style={styles.maintCard}
                                onPress={() => { if (m.status === 'pending') markAsPaid(m.id); }}
                            >
                                <LinearGradient
                                    colors={[`${THEME_COLOR}10`, '#00000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.cardGlow}
                                />
                                <View style={styles.cardIcon}>
                                    <Receipt size={24} color={THEME_COLOR} strokeWidth={2.5} />
                                </View>
                                <View style={styles.cardContent}>
                                    <View style={styles.maintHeader}>
                                        <Text style={styles.monthName}>{m.month ? `${m.month} ${m.year || ''}` : (m.unit || m.title || 'Unit 402')}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: m.status === 'paid' ? '#10B98120' : '#EF444420' }]}>
                                            <Text style={[styles.statusText, { color: m.status === 'paid' ? '#10B981' : '#EF4444' }]}>
                                                {(m.status || 'pending').toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.dueDate}>Due by {m.due_date || m.dueDate || '10th of month'}</Text>
                                </View>
                                <View style={styles.cardRight}>
                                    <Text style={styles.amount}>₹{(parseFloat(m.amount) || 0).toLocaleString('en-IN')}</Text>
                                    {m.status === 'pending' && <Text style={{ fontSize: 10, color: '#A1A1AA', marginTop: 4 }}>Tap to Pay</Text>}
                                </View>
                            </LuxuryCard>
                        ))
                    )}
                </View>

                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => setShowAddLog(true)}
                    index={maintenance.length + 1}
                >
                    <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                    <Text style={styles.addButtonText}>Record Payment</Text>
                </LuxuryCard>
            </ScrollView>

            {/* Add Log Modal */}
            <Modal visible={showAddLog} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Dues</Text>
                            <TouchableOpacity onPress={() => setShowAddLog(false)}>
                                <X size={24} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Month</Text>
                        <TextInput style={styles.input} placeholder="e.g. August" placeholderTextColor="#52525B" value={month} onChangeText={setMonth} />

                        <Text style={styles.inputLabel}>Year</Text>
                        <TextInput style={styles.input} placeholder="2024" placeholderTextColor="#52525B" keyboardType="numeric" value={year} onChangeText={setYear} />

                        <Text style={styles.inputLabel}>Amount (₹)</Text>
                        <TextInput style={styles.input} placeholder="3500" placeholderTextColor="#52525B" keyboardType="numeric" value={amount} onChangeText={setAmount} />

                        <Text style={styles.inputLabel}>Due Date</Text>
                        <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#52525B" value={date} onChangeText={setDate} />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleAddLog}>
                            <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <RentVsBuy visible={showRentVsBuy} onClose={() => setShowRentVsBuy(false)} />
            <UtilitySplitter visible={showUtility} onClose={() => setShowUtility(false)} />
            <LeaseManager visible={showLease} onClose={() => setShowLease(false)} />
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
    heroCardWrapper: { marginHorizontal: 24, marginBottom: 24 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },

    toolsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 32 },
    toolBtn: { flex: 1, backgroundColor: '#18181B', padding: 12, borderRadius: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FFFFFF08' },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    toolText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F43F5E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },
    maintCard: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 140, opacity: 1 },
    cardIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#F43F5E10', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1, borderColor: '#F43F5E20' },
    cardContent: { flex: 1 },
    maintHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    monthName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    dueDate: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    cardRight: { alignItems: 'flex-end' },
    amount: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F43F5E08', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#F43F5E15' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#F43F5E50' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#F43F5E', letterSpacing: 0.5 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#18181B', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#333' },
    modalHeader: { flexDirection: 'row', justifyConent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#FFF' },
    inputLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
    input: { backgroundColor: '#000', color: '#FFF', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#3F3F46' },
    saveBtn: { backgroundColor: '#F43F5E', padding: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
