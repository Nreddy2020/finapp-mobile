import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { GamificationService } from '../../services/gamification';

export default function Leaderboard() {
    const [stats, setStats] = useState({ totalPoints: 0, level: 1, history: [] });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        const data = await GamificationService.getStats();
        setStats(data);
    };

    return (
        <View style={styles.container}>
            <LuxuryCard style={styles.rankCard}>
                <Text style={styles.rankLabel}>CURRENT RANK</Text>
                <Text style={styles.rankValue}>Level {stats.level}</Text>
                <Text style={styles.points}>{stats.totalPoints} PTS</Text>
            </LuxuryCard>

            <Text style={styles.sectionTitle}>History</Text>
            {stats.history.length === 0 ? (
                <Text style={styles.empty}>No points yet. Start saving!</Text>
            ) : (
                stats.history.map((item, index) => (
                    <LuxuryCard key={item.id || index} index={index + 1} style={styles.historyItem}>
                        <View>
                            <Text style={styles.reason}>{item.reason}</Text>
                            <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
                        </View>
                        <Text style={styles.amount}>+{item.amount}</Text>
                    </LuxuryCard>
                ))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 16 },
    rankCard: { alignItems: 'center', padding: 24, backgroundColor: '#F59E0B10', borderColor: '#F59E0B40' },
    rankLabel: { color: '#F59E0B', fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
    rankValue: { fontSize: 32, fontWeight: '900', color: '#FFF', marginBottom: 4 },
    points: { color: '#A1A1AA', fontSize: 16 },
    sectionTitle: { color: '#FFF', fontWeight: '700', fontSize: 18, marginTop: 8 },
    historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    reason: { color: '#FFF', fontWeight: '600', fontSize: 15 },
    date: { color: '#71717A', fontSize: 12, marginTop: 2 },
    amount: { color: '#10B981', fontWeight: '700', fontSize: 16 },
    empty: { color: '#555', fontStyle: 'italic', textAlign: 'center', marginTop: 20 }
});
