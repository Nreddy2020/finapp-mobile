import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Award, Gift, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AnimatedScreen from '../components/ui/AnimatedScreen';

import Leaderboard from '../components/gamification/Leaderboard';
import AchievementBadges from '../components/gamification/AchievementBadges';
import RewardsStore from '../components/gamification/RewardsStore';

export default function GamificationScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [refreshing, setRefreshing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // Force re-render components

    const onRefresh = () => {
        setRefreshing(true);
        // Simulate refresh
        setTimeout(() => {
            setRefreshKey(prev => prev + 1);
            setRefreshing(false);
        }, 1000);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'leaderboard': return <Leaderboard key={refreshKey} />;
            case 'achievements': return <AchievementBadges key={refreshKey} />;
            case 'rewards': return <RewardsStore key={refreshKey} />;
            default: return <Leaderboard key={refreshKey} />;
        }
    };

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Gamification</Text>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
                    onPress={() => setActiveTab('leaderboard')}
                >
                    <Trophy size={20} color={activeTab === 'leaderboard' ? '#FFF' : '#71717A'} />
                    <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>Rank</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
                    onPress={() => setActiveTab('achievements')}
                >
                    <Award size={20} color={activeTab === 'achievements' ? '#FFF' : '#71717A'} />
                    <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>Badges</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'rewards' && styles.activeTab]}
                    onPress={() => setActiveTab('rewards')}
                >
                    <Gift size={20} color={activeTab === 'rewards' ? '#FFF' : '#71717A'} />
                    <Text style={[styles.tabText, activeTab === 'rewards' && styles.activeTabText]}>Store</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />}
            >
                {renderContent()}
            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: '900', color: '#FFF' },
    tabBar: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: '#18181B', borderRadius: 16, padding: 4, marginBottom: 24 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
    activeTab: { backgroundColor: '#27272A' },
    tabText: { color: '#71717A', fontWeight: '600', fontSize: 13 },
    activeTabText: { color: '#FFF' },
    content: { paddingHorizontal: 24, paddingBottom: 40 }
});
