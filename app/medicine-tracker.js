import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Pill, Plus, Calendar, Clock, AlertCircle, Check, ChevronLeft, Activity, Heart, Moon, Flame, Watch, Trash2, X, Camera } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import { COLORS } from '../constants/theme';
import { loadData, saveData, STORAGE_KEYS } from '../services/storage';
import NotificationService from '../services/notificationService';
import HealthService from '../services/health.js';

const { width } = Dimensions.get('window');

export default function MedicineTrackerScreen() {
    const router = useRouter();
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [genericModalVisible, setGenericModalVisible] = useState(false);
    const [newMedName, setNewMedName] = useState('');
    const [newMedDosage, setNewMedDosage] = useState('');
    const [newMedStock, setNewMedStock] = useState('');
    const [newMedTime, setNewMedTime] = useState('09:00'); // Default 9 AM

    useEffect(() => {
        loadMedicines();
        loadStats();
        NotificationService.requestPermissions();
    }, []);

    const loadStats = () => {
        setStats(HealthService.getHealthStats());
    };

    const loadMedicines = async () => {
        const data = await loadData(STORAGE_KEYS.MEDICINES, []);
        if (data) setMedicines(data);
        setLoading(false);
    };

    const handlePrescriptionUpload = () => {
        // Fallback since we might not have camera permissions in web or package issues
        Alert.alert(
            "Upload Prescription",
            "Choose a method",
            [
                {
                    text: "Camera (Simulated)", onPress: () => setTimeout(() => {
                        Alert.alert("Success", "Prescription scanned! (Mock: Metformin 500mg added)");
                        setNewMedName("Metformin");
                        setNewMedDosage("500mg");
                        setNewMedStock("30");
                        setModalVisible(true);
                    }, 1000)
                },
                { text: "Gallery", onPress: () => Alert.alert("Gallery", "Opening gallery... (Simulated)") },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const SHOW_GENERIC_SUGGESTIONS = {
        "Paracetamol": { generic: "Acetaminophen", savings: "40%" },
        "Panadol": { generic: "Paracetamol", savings: "50%" },
        "Metformin": { generic: "GlucoPhage Generic", savings: "60%" },
        "Lipitor": { generic: "Atorvastatin", savings: "75%" }
    };

    const checkGeneric = (name) => {
        const match = Object.keys(SHOW_GENERIC_SUGGESTIONS).find(k => name.toLowerCase().includes(k.toLowerCase()));
        if (match) {
            Alert.alert(
                "Savings Alert! 💰",
                `Did you know? '${SHOW_GENERIC_SUGGESTIONS[match].generic}' is the generic version of ${match} and costs ${SHOW_GENERIC_SUGGESTIONS[match].savings} less.\n\nAsk your doctor!`,
                [{ text: "Great, thanks!" }]
            );
        }
    };

    const handleAddMedicine = async () => {
        if (!newMedName || !newMedDosage || !newMedStock) {
            Alert.alert('Missing Fields', 'Please fill in all fields');
            return;
        }

        checkGeneric(newMedName);

        const newMed = {
            id: Date.now().toString(),
            name: newMedName,
            dosage: newMedDosage,
            stock: parseInt(newMedStock),
            time: newMedTime,
            refillIn: parseInt(newMedStock), // Simplify: 1 pill per day assumption for now or calc based on frequency
            nextDose: 'Today, ' + newMedTime,
            notificationId: null
        };

        // Schedule Notification
        const [hour, minute] = newMedTime.split(':').map(Number);
        const notifId = await NotificationService.scheduleDaily(
            `Time for your ${newMedName}`,
            `Take ${newMed.dosage} now.`,
            hour,
            minute
        );
        newMed.notificationId = notifId;

        const updated = [...medicines, newMed];
        setMedicines(updated);
        await saveData(STORAGE_KEYS.MEDICINES, updated);

        setModalVisible(false);
        resetForm();
    };

    const handleDeleteMedicine = async (id, notificationId) => {
        if (notificationId) {
            await NotificationService.cancel(notificationId);
        }
        const updated = medicines.filter(m => m.id !== id);
        setMedicines(updated);
        await saveData(STORAGE_KEYS.MEDICINES, updated);
    };

    const handleLogDose = async (id) => {
        const medicine = medicines.find(m => m.id === id);
        if (!medicine) return;

        // 1. Log to history
        await HealthService.logDose(medicine);

        // 2. Update Stock
        const newStock = Math.max(0, medicine.stock - 1);

        // 3. Check Refill Warning
        if (newStock <= 7 && medicine.stock > 7) {
            await NotificationService.scheduleImmediate(
                'Refill Warning',
                `Your ${medicine.name} is running low (${newStock} left). Time to refill!`
            );
            Alert.alert('Refill Alert', `You only have ${newStock} doses of ${medicine.name} left.`);
        }

        const updated = medicines.map(m => {
            if (m.id === id) {
                return {
                    ...m,
                    stock: newStock,
                    refillIn: newStock,
                    lastTaken: new Date().toISOString() // Track last taken time
                };
            }
            return m;
        });

        setMedicines(updated);
        await saveData(STORAGE_KEYS.MEDICINES, updated);
        Alert.alert("Dose Taken", `Logged ${medicine.name} successfully.`);
    };

    const resetForm = () => {
        setNewMedName('');
        setNewMedDosage('');
        setNewMedStock('');
        setNewMedTime('09:00');
    };

    const healthStats = stats ? [
        { id: 1, label: 'Steps', value: stats.steps.value, goal: stats.steps.goal, icon: Activity, color: '#10B981', unit: 'steps', progress: stats.steps.progress },
        { id: 2, label: 'Sleep', value: stats.sleep.value, goal: stats.sleep.goal, icon: Moon, color: '#6366F1', unit: 'hrs', progress: stats.sleep.progress },
        { id: 3, label: 'Calories', value: stats.calories.value, goal: stats.calories.goal, icon: Flame, color: '#F59E0B', unit: 'kcal', progress: stats.calories.progress },
    ] : [];

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Health & Fitness</Text>
                <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Plus color="#FFFFFF" size={20} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Fitness Dashboard */}
                <Text style={styles.sectionTitle}>Daily Activity</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
                    {healthStats.map((stat, index) => (
                        <LuxuryCard key={stat.id} index={index} style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                                <stat.icon size={20} color={stat.color} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                            <View style={styles.progressContainer}>
                                <View style={[styles.progressBar, { width: `${Math.min(stat.progress * 100, 100)}%`, backgroundColor: stat.color }]} />
                            </View>
                            <Text style={styles.statGoal}>Goal: {stat.goal}</Text>
                        </LuxuryCard>
                    ))}
                </ScrollView>

                {/* Medicine Section */}
                <View style={styles.medicineHeader}>
                    <Text style={styles.sectionTitle}>Medicine Cabinet</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable style={[styles.addMedBtn, { backgroundColor: '#10B98120' }]} onPress={handlePrescriptionUpload}>
                            <Camera size={16} color="#10B981" />
                            <Text style={[styles.addMedText, { color: '#10B981' }]}>Scan</Text>
                        </Pressable>
                        <Pressable style={styles.addMedBtn} onPress={() => setModalVisible(true)}>
                            <Plus size={16} color="#FFF" />
                            <Text style={styles.addMedText}>Add</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Refill Alerts */}
                {medicines.some(m => m.stock <= 7) && (
                    <View style={styles.alertContainer}>
                        <LinearGradient
                            colors={['#EF444420', '#EF444405']}
                            style={styles.alertGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                        <View style={styles.alertRow}>
                            <AlertCircle color="#EF4444" size={20} />
                            <Text style={styles.alertText}>Refills needed this week!</Text>
                        </View>
                    </View>
                )}

                {medicines.length === 0 && !loading && (
                    <View style={styles.emptyState}>
                        <Pill size={48} color="#333" />
                        <Text style={styles.emptyText}>No medicines added yet.</Text>
                    </View>
                )}

                {medicines.map((med, index) => (
                    <LuxuryCard key={med.id} index={index + 3} style={styles.medCard}>
                        <View style={styles.medRow}>
                            <View style={[styles.iconBox, { backgroundColor: med.stock < 7 ? '#EF444420' : '#6366F120' }]}>
                                <Pill size={24} color={med.stock < 7 ? '#EF4444' : '#6366F1'} />
                            </View>
                            <View style={styles.medInfo}>
                                <Text style={styles.medName}>{med.name}</Text>
                                <Text style={styles.medDosage}>{med.dosage} • Stock: {med.stock}</Text>
                                {med.lastTaken && (
                                    <Text style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>
                                        Taken: {new Date(med.lastTaken).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                )}
                            </View>
                            <Pressable
                                style={[styles.deleteBtn]}
                                onPress={() => Alert.alert(
                                    "Remove Medicine",
                                    "Are you sure?",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Delete", style: "destructive", onPress: () => handleDeleteMedicine(med.id, med.notificationId) }
                                    ]
                                )}
                            >
                                <Trash2 size={18} color="#EF4444" />
                            </Pressable>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.actionRow}>
                            <View style={styles.nextDose}>
                                <Clock size={14} color="#A1A1AA" />
                                <Text style={styles.nextDoseText}>Time: {med.time}</Text>
                            </View>
                            <Pressable
                                style={styles.takeBtn}
                                onPress={() => handleLogDose(med.id)}
                            >
                                <Text style={styles.takeBtnText}>Take Dose</Text>
                            </Pressable>
                        </View>
                    </LuxuryCard>
                ))}

            </ScrollView>

            {/* Add Medicine Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Medicine</Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <X color="#FFF" size={24} />
                            </Pressable>
                        </View>

                        <Text style={styles.label}>Medicine Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Paracetamol"
                            placeholderTextColor="#555"
                            value={newMedName}
                            onChangeText={setNewMedName}
                        />

                        <Text style={styles.label}>Dosage</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 500mg"
                            placeholderTextColor="#555"
                            value={newMedDosage}
                            onChangeText={setNewMedDosage}
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.label}>Current Stock</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 10"
                                    placeholderTextColor="#555"
                                    keyboardType="numeric"
                                    value={newMedStock}
                                    onChangeText={setNewMedStock}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.label}>Time (24h)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="09:00"
                                    placeholderTextColor="#555"
                                    value={newMedTime}
                                    onChangeText={setNewMedTime}
                                />
                            </View>
                        </View>

                        <Pressable style={styles.saveBtn} onPress={handleAddMedicine}>
                            <Text style={styles.saveBtnText}>Save Medicine</Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF10' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20, paddingBottom: 100 },

    // Stats Styles
    statsScroll: { marginBottom: 32, marginHorizontal: -20, paddingHorizontal: 20 },
    statCard: { width: 140, padding: 16, marginRight: 12, backgroundColor: '#18181B', borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF10' },
    statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statValue: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 2 },
    statLabel: { fontSize: 12, color: '#A1A1AA', marginBottom: 12, fontWeight: '600' },
    progressContainer: { height: 4, backgroundColor: '#FFFFFF10', borderRadius: 2, marginBottom: 8 },
    progressBar: { height: '100%', borderRadius: 2 },
    statGoal: { fontSize: 10, color: '#FFFFFF60', fontWeight: '500' },

    medicineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    addMedBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#6366F120', borderRadius: 12 },
    addMedText: { color: '#6366F1', fontSize: 12, fontWeight: '700' },

    alertContainer: { marginBottom: 24, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#EF444430' },
    alertGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    alertText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    medCard: { padding: 16, marginBottom: 16 },
    medRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    medInfo: { flex: 1 },
    medName: { fontSize: 17, fontWeight: '700', color: '#FFF', marginBottom: 4 },
    medDosage: { fontSize: 14, color: '#A1A1AA' },
    statusBox: { alignItems: 'flex-end' },
    refillText: { fontSize: 13, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#FFFFFF10', marginVertical: 16 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nextDose: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    nextDoseText: { color: '#A1A1AA', fontSize: 13 },
    takeBtn: { backgroundColor: '#FFFFFF10', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FFFFFF10' },
    takeBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },

    emptyState: { alignItems: 'center', padding: 40, gap: 12 },
    emptyText: { color: '#555', fontSize: 14 },
    deleteBtn: { padding: 8 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#18181B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    label: { fontSize: 13, color: '#A1A1AA', marginBottom: 8, fontWeight: '600' },
    input: { backgroundColor: '#000', borderRadius: 12, padding: 16, color: '#FFF', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
    row: { flexDirection: 'row' },
    saveBtn: { backgroundColor: '#6366F1', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
