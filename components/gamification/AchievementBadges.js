import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { GamificationService, BADGE_DETAILS } from '../../services/gamification';

export default function AchievementBadges() {
    const [badges, setBadges] = useState([]);

    useEffect(() => {
        loadBadges();
    }, []);

    const loadBadges = async () => {
        const stats = await GamificationService.getStats();
        setBadges(stats.badges);
    };

    const allBadges = Object.keys(BADGE_DETAILS);

    return (
        <View style={styles.grid}>
            {allBadges.map((badgeKey, index) => {
                const isUnlocked = badges.includes(badgeKey);
                const details = BADGE_DETAILS[badgeKey];

                return (
                    <LuxuryCard
                        key={badgeKey}
                        index={index}
                        style={[styles.card, !isUnlocked && styles.locked]}
                    >
                        <View style={styles.iconContainer}>
                            <Text style={[styles.icon, !isUnlocked && { opacity: 0.3 }]}>
                                {details.icon}
                            </Text>
                        </View>
                        <Text style={[styles.name, !isUnlocked && { color: '#555' }]}>{details.name}</Text>
                        <Text style={styles.desc}>{isUnlocked ? 'Unlocked' : 'Locked'}</Text>
                        <Text style={styles.req}>{details.desc}</Text>
                    </LuxuryCard>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    card: { width: '48%', padding: 16, alignItems: 'center' },
    locked: { borderColor: '#333', backgroundColor: '#111' },
    iconContainer: { marginBottom: 12 },
    icon: { fontSize: 40 },
    name: { color: '#FFF', fontWeight: '700', fontSize: 14, marginBottom: 4, textAlign: 'center' },
    desc: { color: '#F59E0B', fontSize: 12, fontWeight: '700', marginBottom: 4 },
    req: { color: '#71717A', fontSize: 10, textAlign: 'center' }
});
