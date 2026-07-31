import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Pressable } from 'react-native';
import { Home, Users, UtensilsCrossed, Wrench, UserPlus, Calendar, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HostelService } from '../../services/hostel';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';

export default function HostelScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [hostelData, setHostelData] = useState({
        nextPayment: { amount: 0, dueDate: '', daysLeft: 0 },
        messUtilization: 0,
        messRefund: 0,
        pendingSettlements: 0,
        roomNumber: '...',
        block: ''
    });

    const fetchData = async () => {
        const data = await HostelService.getData();
        setHostelData(data);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const THEME_COLOR = '#8B5CF6'; // Purple

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Home },
        { id: 'fees', label: 'Fees', icon: Shield },
        { id: 'roommates', label: 'Roommates', icon: Users },
        { id: 'mess', label: 'Mess', icon: UtensilsCrossed },
        { id: 'room', label: 'Room', icon: Wrench },
        { id: 'visitors', label: 'Visitors', icon: UserPlus },
        { id: 'leave', label: 'Leave', icon: Calendar },
    ];

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
                        <Text style={styles.headerLabel}>Student Living</Text>
                        <Text style={styles.title}>Hostel Management</Text>
                    </View>
                    <View style={styles.roomBadge}>
                        <Text style={styles.roomText}>{hostelData.roomNumber}</Text>
                    </View>
                </View>

                {/* Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsContainer}
                    contentContainerStyle={styles.tabsContent}
                >
                    {tabs.map((tab) => (
                        <Pressable
                            key={tab.id}
                            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                            onPress={() => setActiveTab(tab.id)}
                        >
                            <tab.icon
                                size={18}
                                color={activeTab === tab.id ? THEME_COLOR : '#71717A'}
                                strokeWidth={2.5}
                            />
                            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Overview Tab Content */}
                {activeTab === 'overview' && (
                    <>
                        {/* Next Payment Card */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>UPCOMING PAYMENT</Text>
                            <View style={styles.heroCard}>
                                <LinearGradient
                                    colors={[`${THEME_COLOR}60`, '#00000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.heroGlow}
                                />
                                <View style={styles.heroContent}>
                                    <Text style={styles.heroLabel}>Next Payment Due</Text>
                                    <Text style={styles.heroAmount}>₹{hostelData.nextPayment.amount.toLocaleString('en-IN')}</Text>
                                    <View style={styles.heroFooter}>
                                        <View style={styles.daysLeftBadge}>
                                            <Text style={styles.daysLeftText}>{hostelData.nextPayment.daysLeft} days left</Text>
                                        </View>
                                        <Text style={styles.dueDateText}>Due: {hostelData.nextPayment.dueDate}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Quick Stats */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>QUICK STATS</Text>
                            <View style={styles.statsGrid}>
                                <LuxuryCard style={styles.statCard} index={0}>
                                    <View style={[styles.statIcon, { backgroundColor: `${THEME_COLOR}15` }]}>
                                        <UtensilsCrossed size={20} color={THEME_COLOR} strokeWidth={2.5} />
                                    </View>
                                    <Text style={styles.statValue}>{hostelData.messUtilization}%</Text>
                                    <Text style={styles.statLabel}>Mess Used</Text>
                                    <Text style={styles.statSubtext}>₹{hostelData.messRefund} refund</Text>
                                </LuxuryCard>

                                <LuxuryCard style={styles.statCard} index={1}>
                                    <View style={[styles.statIcon, { backgroundColor: '#EC489915' }]}>
                                        <Users size={20} color="#EC4899" strokeWidth={2.5} />
                                    </View>
                                    <Text style={styles.statValue}>₹{hostelData.pendingSettlements}</Text>
                                    <Text style={styles.statLabel}>Pending</Text>
                                    <Text style={styles.statSubtext}>From roommates</Text>
                                </LuxuryCard>
                            </View>
                        </View>
                    </>
                )}

                {/* Other Tabs - Coming Soon */}
                {activeTab !== 'overview' && (
                    <View style={styles.section}>
                        <View style={styles.comingSoonCard}>
                            <View style={styles.comingSoonIcon}>
                                <Home size={32} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.comingSoonTitle}>{tabs.find(t => t.id === activeTab)?.label} - Coming Soon</Text>
                            <Text style={styles.comingSoonText}>
                                This feature is under development and will be available soon.
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    roomBadge: { backgroundColor: '#8B5CF615', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#8B5CF630' },
    roomText: { fontSize: 16, fontWeight: '800', color: '#8B5CF6', letterSpacing: 0.5 },

    // Tabs
    tabsContainer: { marginBottom: 24 },
    tabsContent: { paddingHorizontal: 24, gap: 8 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A' },
    tabActive: { backgroundColor: '#8B5CF615', borderColor: '#8B5CF630' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#71717A' },
    tabTextActive: { color: '#8B5CF6' },

    // Section
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase' },

    // Hero Card
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    daysLeftBadge: { backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    daysLeftText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
    dueDateText: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600' },

    // Stats Grid
    statsGrid: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: '#18181B', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#FFFFFF08', alignItems: 'center' },
    statIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statValue: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4, letterSpacing: -0.5 },
    statLabel: { fontSize: 12, color: '#71717A', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
    statSubtext: { fontSize: 11, color: '#8B5CF6', fontWeight: '600' },

    // Coming Soon
    comingSoonCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08' },
    comingSoonIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#8B5CF608', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#8B5CF615' },
    comingSoonTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '800', marginBottom: 12, textAlign: 'center' },
    comingSoonText: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20, marginBottom: 20 },
});
