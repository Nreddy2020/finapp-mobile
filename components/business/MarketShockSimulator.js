import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { TrendingDown, TrendingUp, Cpu } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LuxuryCard from '../ui/LuxuryCard';
import { IntelligenceService } from '../../services/intelligence';

export default function MarketShockSimulator() {
    const [scenario, setScenario] = useState(null); // null = normal, 'RECESSION', 'BOOM'
    const [data, setData] = useState({
        profit: '₹8,45,000', // Default
        revenue: '₹12.5L',   // Default
        trend: '0.0%',
        stress: 'NORMAL'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Initial Fetch for "Normal" state or just keep default
        // Let's explicitly fetch 'NORMAL' to prove backend connection on mount
        fetchSimulation('NORMAL');
    }, []);

    const fetchSimulation = async (targetScenario) => {
        setLoading(true);
        // If toggling off (e.g. was Recession, clicking Recession again -> Normal)
        if (targetScenario === scenario) {
            targetScenario = 'NORMAL';
            setScenario(null);
        } else {
            setScenario(targetScenario);
        }

        const result = await IntelligenceService.simulateMarketShock(targetScenario);

        if (result) {
            setData({
                profit: result.profit,
                revenue: result.revenue,
                trend: result.trend,
                stress: result.stress
            });
        }
        setLoading(false);
    };

    const isRecession = scenario === 'RECESSION';
    const isBoom = scenario === 'BOOM';

    return (
        <LuxuryCard style={styles.summaryCardWrapper}>
            <View style={styles.summaryHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Cpu size={16} color="#A1A1AA" />
                    <Text style={styles.summaryTitle}>AI Market Simulator</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => fetchSimulation('RECESSION')}
                        disabled={loading}
                        style={[styles.shockBtn, isRecession && styles.shockRecessionActive]}
                    >
                        <TrendingDown size={14} color={isRecession ? '#FFF' : '#EF4444'} />
                        <Text style={[styles.shockBtnText, isRecession && { color: '#FFF' }]}>Recession</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => fetchSimulation('BOOM')}
                        disabled={loading}
                        style={[styles.shockBtn, isBoom && styles.shockBoomActive]}
                    >
                        <TrendingUp size={14} color={isBoom ? '#FFF' : '#10B981'} />
                        <Text style={[styles.shockBtnText, isBoom && { color: '#FFF' }]}>Boom</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <LinearGradient
                colors={
                    isRecession ? ['#EF444420', '#18181B'] :
                        isBoom ? ['#10B98120', '#18181B'] :
                            ['#27272A', '#18181B'] // Neutral
                }
                style={styles.summaryCard}
            >
                {loading ? (
                    <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color="#FFFFFF" />
                        <Text style={{ color: '#71717A', fontSize: 12, marginTop: 8 }}>Analyzing Portfolio...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.summaryHeader}>
                            <Text style={styles.summaryTitle}>Projected Net Profit</Text>
                            <View style={[styles.trendBadge, {
                                backgroundColor: isRecession ? '#EF444420' : isBoom ? '#10B98120' : '#FFFFFF10'
                            }]}>
                                {isRecession ? <TrendingDown size={14} color="#EF4444" /> : <TrendingUp size={14} color={isBoom ? "#10B981" : "#A1A1AA"} />}
                                <Text style={[styles.trendText, {
                                    color: isRecession ? '#EF4444' : isBoom ? '#10B981' : '#A1A1AA'
                                }]}>
                                    {data.trend}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.summaryAmount}>
                            {data.profit}
                        </Text>
                        <View style={styles.summaryRow}>
                            <View>
                                <Text style={styles.summaryLabel}>Revenue</Text>
                                <Text style={styles.summaryValue}>{data.revenue}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View>
                                <Text style={styles.summaryLabel}>Stress Level</Text>
                                <Text style={[styles.summaryValue, {
                                    color: isRecession ? '#EF4444' : isBoom ? '#10B981' : '#FFFFFF'
                                }]}>
                                    {data.stress}
                                </Text>
                            </View>
                            <View style={styles.divider} />
                            <View>
                                <Text style={styles.summaryLabel}>Active</Text>
                                <Text style={styles.summaryValue}>4 Biz</Text>
                            </View>
                        </View>
                    </>
                )}
            </LinearGradient>
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    summaryCardWrapper: {
        paddingHorizontal: 24,
        marginBottom: 32
    },
    summaryCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    summaryTitle: {
        fontSize: 14,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4
    },
    trendText: {
        fontSize: 12,
        fontWeight: '700'
    },
    summaryAmount: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 24,
        letterSpacing: -1
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    summaryLabel: {
        fontSize: 12,
        color: '#71717A',
        marginBottom: 4
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: '#FFFFFF10'
    },
    shockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#27272A',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    shockBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    shockRecessionActive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444'
    },
    shockBoomActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981'
    }
});
