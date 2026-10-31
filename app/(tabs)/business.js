/**
 * app/(tabs)/business.js — Business Hub
 * Entry to every business module. Stats shown are read from saved data where a module
 * keeps real records (Apartment / Society); modules without saved data show no numbers.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Building2, ShoppingBag, Briefcase, Plus, Hotel, Factory, Truck, Building, Home } from 'lucide-react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import BusinessCard from '../../components/business/BusinessCard';
import MarketShockSimulator from '../../components/business/MarketShockSimulator';
import { Sheet, Btn, ui, useMoney } from '../../components/ui/ModuleUI';
import { ApartmentSocietyService, dashboard } from '../../services/business/apartmentSocietyService';
import { todayLocal } from '../../components/ui/ModuleUI';

const MODULES = [
    { id: 'apartment', title: 'Apartment & Society', icon: Building, color: '#F43F5E', description: 'Units, maintenance dues, expenses, complaints, notices, visitors, funds and reports.', route: '/business/apartment' },
    { id: 'rental', title: 'Rental Properties', icon: Building2, color: '#8B5CF6', description: 'Manage tenants, rent collection, and property maintenance.', route: '/business/rental-property' },
    { id: 'retail', title: 'Retail Shop', icon: ShoppingBag, color: '#EC4899', description: 'Track inventory, daily sales, and profit margins.', route: '/business/retail' },
    { id: 'hospitality', title: 'Hospitality', icon: Hotel, color: '#3B82F6', description: 'Room bookings, occupancy rates, and guest services.', route: '/business/hospitality' },
    { id: 'service', title: 'Service Business', icon: Briefcase, color: '#3B82F6', description: 'Client bookings, service rates, and resource utilization.', route: '/business/service' },
    { id: 'manufacturing', title: 'Manufacturing', icon: Factory, color: '#D97706', description: 'Track production batches, efficiency, and material costs.', route: '/business/manufacturing' },
    { id: 'transportation', title: 'Logistics', icon: Truck, color: '#06B6D4', description: 'Fleet tracking, delivery status, and fuel management.', route: '/business/transportation' }
];

export default function BusinessDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const money = useMoney();
    const moneyRef = useRef(money); moneyRef.current = money;
    const [picker, setPicker] = useState(false);
    const [societyStats, setSocietyStats] = useState(null);

    const handleBack = useCallback(() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }, [router]);
    useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (picker) { setPicker(false); return true; } handleBack(); return true; }); return () => sub.remove(); }, [handleBack, picker]);
    useFocusEffect(useCallback(() => {
        let alive = true;
        (async () => {
            try { const doc = await ApartmentSocietyService.load(); const d = dashboard(doc, todayLocal()); if (alive) setSocietyStats(doc.units.length ? [{ label: 'Occupancy', value: d.occupancy.occupancyRate === null ? '—' : `${d.occupancy.occupancyRate}%` }, { label: 'Collected', value: moneyRef.current.format(d.collection.collected) }] : null); }
            catch { if (alive) setSocietyStats(null); }
        })();
        return () => { alive = false; };
    }, []));

    return (
        <AnimatedScreen style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) + 12 }]} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Go back" accessibilityRole="button">
                            <ArrowLeft size={20} color="#F8FAFC" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerLabel}>Management</Text>
                            <Text style={styles.title}>Business Hub</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.addButton} accessibilityRole="button" accessibilityLabel="Start a business module" onPress={() => setPicker(true)}>
                        <Plus size={24} color="#000000" />
                    </TouchableOpacity>
                </View>

                <MarketShockSimulator />

                <View style={styles.grid}>
                    {MODULES.map((biz) => (
                        <BusinessCard key={biz.id} title={biz.title} icon={biz.icon} color={biz.color} description={biz.description} stats={biz.id === 'apartment' ? societyStats : undefined} onPress={() => router.push(biz.route)} />
                    ))}
                    <TouchableOpacity style={styles.addNewCard} accessibilityRole="button" accessibilityLabel="Start new business" onPress={() => setPicker(true)}>
                        <View style={styles.addNewIcon}><Plus size={24} color="#71717A" /></View>
                        <Text style={styles.addNewText}>Start New Business</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.addNewCard, { height: 88, marginTop: 12 }]} accessibilityRole="button" accessibilityLabel="Open my apartment" onPress={() => router.push('/(tabs)/apartment')}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Home size={20} color="#A1A1AA" /><Text style={styles.addNewText}>Living in a flat? Your personal rent, dues and flatmates are in My Apartment.</Text></View>
                    </TouchableOpacity>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            <Sheet visible={picker} title="Start a business module" onClose={() => setPicker(false)}>
                <Text style={ui.muted}>Choose what you run. Each module keeps its own records on this device.</Text>
                {MODULES.map(m => <Btn key={m.id} title={m.title} secondary onPress={() => { setPicker(false); router.push(m.route); }} />)}
            </Sheet>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingTop: 60, paddingBottom: 40 },
    header: { paddingHorizontal: 24, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#18181B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272A' },
    headerLabel: { fontSize: 13, color: '#71717A', fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
    title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    addButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
    grid: { paddingHorizontal: 24 },
    addNewCard: { width: '100%', height: 120, borderRadius: 24, borderWidth: 2, borderColor: '#FFFFFF08', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B50', paddingHorizontal: 16 },
    addNewIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF05', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    addNewText: { fontSize: 14, fontWeight: '600', color: '#71717A', flexShrink: 1 }
});
