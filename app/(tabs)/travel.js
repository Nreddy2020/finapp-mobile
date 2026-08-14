import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet } from 'react-native';
import { Plane, Plus, CalendarDays as Calendar, Sparkles, MapPin, Wallet, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getTravelPlans } from '../../services/api';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import { COLORS } from '../../constants/theme';
import { Pressable } from 'react-native';
import { PieChart, Globe } from 'lucide-react-native';

// New Components
import TripItinerary from '../../components/travel/TripItinerary';
import TravelBudget from '../../components/travel/TravelBudget';
import VisaAssistant from '../../components/travel/VisaAssistant';

import { saveData, loadData, STORAGE_KEYS } from '../../services/storage';

export default function TravelScreen() {
    const [travelPlans, setTravelPlans] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showItinerary, setShowItinerary] = useState(false);
    const [showBudget, setShowBudget] = useState(false);
    const [showVisa, setShowVisa] = useState(false);

    const fetchTravelPlans = async () => {
        try {
            // Load from local storage
            const localData = await loadData(STORAGE_KEYS.TRAVEL, []);

            if (localData && localData.length > 0) {
                setTravelPlans(localData);
            } else {
                try {
                    const data = await getTravelPlans();
                    setTravelPlans(data);
                } catch (e) {
                    setTravelPlans([]);
                }
            }
        } catch (error) {
            console.error('Error fetching travel plans:', error);
            setTravelPlans([]);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTravelPlans();
    }, []);

    // Persist changes whenever travel plans update
    useEffect(() => {
        if (!loading) {
            saveData(STORAGE_KEYS.TRAVEL, travelPlans);
        }
    }, [travelPlans, loading]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTravelPlans();
    };

    const totalTripBudget = travelPlans.reduce((sum, trip) => sum + parseFloat(trip.budget || 0), 0);
    const THEME_COLOR = '#4F46E5'; // Indigo

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
                <StackHeader title="Travel" subtitle="Voyages" />

                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={[`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>Total Trip Capital</Text>
                            <Text style={styles.heroAmount}>₹{totalTripBudget.toLocaleString('en-IN')}</Text>
                            <View style={styles.heroFooter}>
                                <View style={styles.heroIconBadge}>
                                    <Plane size={14} color="#FFFFFF" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.heroSubtext}>planned for {travelPlans.length} destinations</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Travel Tools */}
                <View style={styles.toolsRow}>
                    <Pressable style={styles.toolBtn} onPress={() => setShowItinerary(true)}>
                        <View style={[styles.iconBox, { backgroundColor: '#6366F120' }]}>
                            <MapPin size={20} color="#6366F1" />
                        </View>
                        <Text style={styles.toolText}>Itinerary</Text>
                    </Pressable>
                    <Pressable style={styles.toolBtn} onPress={() => setShowBudget(true)}>
                        <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
                            <PieChart size={20} color="#F59E0B" />
                        </View>
                        <Text style={styles.toolText}>Budget</Text>
                    </Pressable>
                    <Pressable style={styles.toolBtn} onPress={() => setShowVisa(true)}>
                        <View style={[styles.iconBox, { backgroundColor: '#10B98120' }]}>
                            <Globe size={20} color="#10B981" />
                        </View>
                        <Text style={styles.toolText}>Visa AI</Text>
                    </Pressable>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Planned Trips</Text>

                    {travelPlans.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <MapPin size={32} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyText}>No trips planned</Text>
                            <Text style={styles.emptySubtext}>The world is waiting for you</Text>
                        </View>
                    ) : (
                        travelPlans.map((trip, index) => {
                            const spent = parseFloat(trip.spent || 0);
                            const budget = parseFloat(trip.budget || 0);
                            const progress = Math.min((spent / (budget || 1)) * 100, 100);
                            const progressColor = progress > 90 ? '#EF4444' : (progress > 60 ? '#F59E0B' : '#10B981');

                            return (
                                <LuxuryCard
                                    key={index}
                                    index={index}
                                    style={styles.tripCard}
                                    onPress={() => { }}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardIcon}>
                                            <Plane size={24} color={THEME_COLOR} strokeWidth={2.5} />
                                        </View>
                                        <View style={styles.headerText}>
                                            <Text style={styles.destName}>{trip.destination}</Text>
                                            <View style={styles.dateRow}>
                                                <Calendar size={12} color="#71717A" />
                                                <Text style={styles.dateText}>
                                                    {(() => {
                                                        const s = trip.start_date || trip.startDate;
                                                        const e = trip.end_date || trip.endDate;
                                                        const sDate = s ? new Date(s) : null;
                                                        const eDate = e ? new Date(e) : null;
                                                        const sStr = sDate && !isNaN(sDate.getTime()) ? sDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Flexible';
                                                        const eStr = eDate && !isNaN(eDate.getTime()) ? eDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '2026';
                                                        return `${sStr} - ${eStr}`;
                                                    })()}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.headerRight}>
                                            <Text style={styles.amount}>₹{budget.toLocaleString('en-IN')}</Text>
                                            <Text style={styles.amountLabel}>Budget</Text>
                                        </View>
                                    </View>

                                    <View style={styles.budgetSection}>
                                        <View style={styles.budgetInfo}>
                                            <Text style={styles.spentLabel}>Spent</Text>
                                            <Text style={[styles.spentAmount, { color: progressColor }]}>₹{spent.toLocaleString('en-IN')}</Text>
                                        </View>
                                        <View style={styles.progressBarBg}>
                                            <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: progressColor }]} />
                                        </View>
                                        <Text style={styles.progressText}>{progress.toFixed(0)}% Utilized</Text>
                                    </View>
                                </LuxuryCard>
                            );
                        })
                    )}
                </View>

                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => { }}
                    index={travelPlans.length + 1}
                >
                    <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                    <Text style={styles.addButtonText}>Plan Voyage</Text>
                </LuxuryCard>
            </ScrollView>
            <TripItinerary visible={showItinerary} onClose={() => setShowItinerary(false)} />
            <TravelBudget visible={showBudget} onClose={() => setShowBudget(false)} />
            <VisaAssistant visible={showVisa} onClose={() => setShowVisa(false)} />
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
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },

    tripCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    cardIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#4F46E510', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: '#4F46E520' },
    headerText: { flex: 1 },
    destName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 4, letterSpacing: -0.3 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    headerRight: { alignItems: 'flex-end' },
    amount: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    amountLabel: { fontSize: 11, color: '#71717A', fontWeight: '600' },

    budgetSection: { backgroundColor: '#00000040', padding: 16, borderRadius: 16 },
    budgetInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
    spentLabel: { fontSize: 13, color: '#A1A1AA', fontWeight: '600' },
    spentAmount: { fontSize: 15, fontWeight: '700' },
    progressBarBg: { height: 6, backgroundColor: '#FFFFFF10', borderRadius: 3, marginBottom: 8 },
    progressBar: { height: '100%', borderRadius: 3 },
    progressText: { fontSize: 11, color: '#71717A', fontWeight: '500', textAlign: 'right' },

    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#4F46E508', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#4F46E515' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#4F46E550' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#4F46E5', letterSpacing: 0.5 },
});
