import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Home, ChevronLeft, Calculator, ArrowRight } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import { useRouter } from 'expo-router';
import { CalculatorService } from '../services/calculator';

export default function HostelCalculatorScreen() {
    const router = useRouter();

    const [commuteCost, setCommuteCost] = useState('1200');
    const [homeFood, setHomeFood] = useState('0');
    const [commuteTime, setCommuteTime] = useState('60'); // Minutes

    const [hostelRent, setHostelRent] = useState('5000');
    const [hostelFood, setHostelFood] = useState('3000');
    const [hostelTravel, setHostelTravel] = useState('500');

    const result = CalculatorService.compare({
        rent: hostelRent,
        food: hostelFood,
        utilities: hostelTravel,
        commuteCost: commuteCost,
        commuteTimeMinutes: commuteTime,
        hourlyRate: 100 // Default value
    });

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Hostel Calculator</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Comparison Card */}
                <LuxuryCard style={styles.compareCard}>
                    <View style={styles.col}>
                        <View style={styles.colHeader}>
                            <Home size={20} color="#10B981" />
                            <Text style={styles.colTitle}>Home</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Commute Fare (Daily)</Text>
                            <TextInput
                                style={styles.input}
                                value={commuteCost}
                                onChangeText={setCommuteCost}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Commute Time (Min)</Text>
                            <TextInput
                                style={styles.input}
                                value={commuteTime}
                                onChangeText={setCommuteTime}
                                keyboardType="numeric"
                            />
                        </View>
                        <Text style={styles.totalText}>Mth Cost: ₹{result.monthlyCommuteFare.toFixed(0)}</Text>
                        <Text style={styles.subText}>+ Time Value: ₹{result.timeValue.toFixed(0)}</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Hostel Column */}
                    <View style={styles.col}>
                        <View style={styles.colHeader}>
                            <Home size={20} color="#EC4899" />
                            <Text style={styles.colTitle}>Hostel</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Rent / P.G.</Text>
                            <TextInput
                                style={styles.input}
                                value={hostelRent}
                                onChangeText={setHostelRent}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Mess / Food</Text>
                            <TextInput
                                style={styles.input}
                                value={hostelFood}
                                onChangeText={setHostelFood}
                                keyboardType="numeric"
                            />
                        </View>
                        <Text style={styles.totalText}>Total: ₹{result.monthlyRentCost}</Text>
                    </View>
                </LuxuryCard>

                {/* Verdict */}
                <LuxuryCard style={styles.verdictCard}>
                    <Calculator size={24} color="#F59E0B" />
                    <View style={styles.verdictText}>
                        <Text style={styles.verdictTitle}>
                            Verdict: {result.recommendation}
                        </Text>
                        <Text style={styles.verdictAmount}>
                            Saves ₹{result.savings.toFixed(0)} / mo
                        </Text>
                    </View>
                    <ArrowRight size={20} color="#FFF" />
                </LuxuryCard>

                <Text style={styles.note}>
                    * Including the value of your time (₹100/hr), you save ₹{(result.savings * 12).toFixed(0)} per year by choosing {result.recommendation}!
                </Text>

            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },
    compareCard: { flexDirection: 'row', padding: 20, gap: 16 },
    col: { flex: 1 },
    colHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    colTitle: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    inputGroup: { marginBottom: 16 },
    label: { color: '#71717A', fontSize: 10, marginBottom: 4 },
    input: { backgroundColor: '#000', borderWidth: 1, borderColor: '#FFFFFF20', borderRadius: 8, padding: 8, color: '#FFF', fontWeight: '700' },
    totalText: { color: '#FFF', fontWeight: '700', fontSize: 14, marginTop: 4 },
    subText: { color: '#71717A', fontSize: 10, marginTop: 2 },
    divider: { width: 1, backgroundColor: '#FFFFFF10' },
    verdictCard: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16, marginTop: 24, backgroundColor: '#F59E0B10', borderColor: '#F59E0B40' },
    verdictText: { flex: 1 },
    verdictTitle: { color: '#F59E0B', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    verdictAmount: { color: '#FFF', fontSize: 20, fontWeight: '900' },
    note: { color: '#71717A', fontSize: 12, textAlign: 'center', marginTop: 24, fontStyle: 'italic' }
});
