import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Landmark, Plus, FileText, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import { TaxService } from '../../services/tax';

export default function TaxScreen() {
    const [profile, setProfile] = useState(null);
    const [calculation, setCalculation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Edit Modal
    const [editVisible, setEditVisible] = useState(false);
    const [income, setIncome] = useState('');
    const [deduction80C, setDeduction80C] = useState('');
    const [deduction80D, setDeduction80D] = useState('');
    const [regime, setRegime] = useState('New');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await TaxService.getProfile();
        setProfile(data);
        setCalculation(TaxService.calculateTax(data));
        setLoading(false);
        setRefreshing(false);
    };

    const handleSave = async () => {
        const newProfile = {
            ...profile,
            income: parseFloat(income) || 0,
            regime: regime,
            deductions: {
                ...profile.deductions,
                '80C': parseFloat(deduction80C) || 0,
                '80D': parseFloat(deduction80D) || 0,
            }
        };
        const updated = await TaxService.saveProfile(newProfile);
        setProfile(updated);
        setCalculation(TaxService.calculateTax(updated));
        setEditVisible(false);
    };

    const openEdit = () => {
        if (profile) {
            setIncome(profile.income.toString());
            setDeduction80C(profile.deductions['80C'].toString());
            setDeduction80D(profile.deductions['80D'].toString());
            setRegime(profile.regime);
            setEditVisible(true);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const THEME_COLOR = '#F97316'; // Orange

    if (loading) return null;

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME_COLOR} />
                }
            >
                <StackHeader title="Tax" subtitle="Compliance">
                    <View style={styles.fyBadge}>
                        <Text style={styles.fyText}>FY 24-25</Text>
                    </View>
                </StackHeader>

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
                            <Text style={styles.heroLabel}>Estimated Liability ({(profile?.regime || 'Old')} Regime)</Text>
                            <Text style={styles.heroAmount}>₹{(calculation?.totalTax || 0).toLocaleString('en-IN')}</Text>
                            <View style={styles.heroFooter}>
                                <Text style={styles.heroSubtext}>Taxable Income: ₹{(calculation?.taxableIncome || 0).toLocaleString('en-IN')}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Details Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Profile</Text>
                    <LuxuryCard style={styles.detailsCard}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Gross Income</Text>
                            <Text style={styles.value}>₹{(profile?.income || 0).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>80C Deduction</Text>
                            <Text style={styles.value}>₹{(profile?.deductions?.['80C'] || 0).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>80D Deduction</Text>
                            <Text style={styles.value}>₹{(profile?.deductions?.['80D'] || 0).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.label, { color: THEME_COLOR }]}>Tax Payload</Text>
                            <Text style={[styles.value, { color: THEME_COLOR }]}>₹{(calculation?.taxPayload || 0).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Cess (4%)</Text>
                            <Text style={styles.value}>₹{(calculation?.cess || 0).toLocaleString('en-IN')}</Text>
                        </View>
                    </LuxuryCard>
                </View>

                <LuxuryCard
                    style={styles.addButton}
                    onPress={openEdit}
                >
                    <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                    <Text style={styles.addButtonText}>Update Tax Profile</Text>
                </LuxuryCard>

            </ScrollView>

            {/* Edit Modal */}
            <Modal visible={editVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Profile</Text>

                        <Text style={styles.inputLabel}>Annual Income</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Income" placeholderTextColor="#666"
                            keyboardType="numeric" value={income} onChangeText={setIncome}
                        />

                        <Text style={styles.inputLabel}>80C Investments</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="80C" placeholderTextColor="#666"
                            keyboardType="numeric" value={deduction80C} onChangeText={setDeduction80C}
                        />

                        <Text style={styles.inputLabel}>80D Health Insurance</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="80D" placeholderTextColor="#666"
                            keyboardType="numeric" value={deduction80D} onChangeText={setDeduction80D}
                        />

                        <Text style={styles.inputLabel}>Regime</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                            <Pressable
                                style={[styles.regimeBtn, regime === 'New' && styles.regimeBtnActive]}
                                onPress={() => setRegime('New')}
                            >
                                <Text style={[styles.regimeText, regime === 'New' && { color: '#FFF' }]}>New</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.regimeBtn, regime === 'Old' && styles.regimeBtnActive]}
                                onPress={() => setRegime('Old')}
                            >
                                <Text style={[styles.regimeText, regime === 'Old' && { color: '#FFF' }]}>Old</Text>
                            </Pressable>
                        </View>


                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.btnText}>Save Calculation</Text>
                            </Pressable>
                        </View>
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
    header: { padding: 24, paddingTop: 60, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    fyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, backgroundColor: '#FFFFFF10', borderWidth: 1, borderColor: '#FFFFFF10' },
    fyText: { fontSize: 12, fontWeight: '700', color: '#A1A1AA' },

    heroCardWrapper: { marginHorizontal: 24, marginBottom: 40 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', marginBottom: 12, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },

    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },

    detailsCard: { padding: 24, backgroundColor: '#18181B' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    label: { color: '#A1A1AA', fontSize: 14 },
    value: { color: '#FFF', fontWeight: '700', fontSize: 14 },

    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#F9731650' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#F97316', letterSpacing: 0.5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    inputLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 4, marginLeft: 4 },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 16 },

    regimeBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#333', alignItems: 'center' },
    regimeBtnActive: { backgroundColor: '#F97316' },
    regimeText: { color: '#AAA', fontWeight: '700' },

    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, backgroundColor: '#333', borderRadius: 16, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 16, backgroundColor: '#F97316', borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
