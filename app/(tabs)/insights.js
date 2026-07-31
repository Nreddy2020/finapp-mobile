import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { Brain, TrendingUp, AlertTriangle, MessageSquare, Sparkles, User, Lightbulb, ArrowRight, Zap, History } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import { COLORS } from '../../constants/theme';
import { getItem } from '../../services/storage';

export default function InsightsScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const [persona, setPersona] = useState('Analysing...');
    const [forecastData, setForecastData] = useState([]);
    const [aiTips, setAiTips] = useState([]);
    const [chatVisible, setChatVisible] = useState(false);

    // Mock "Spending DNA" Logic
    const analyzeDNA = async () => {
        // In a real app, we'd aggregate 'transactions' from storage
        // Simulating result based on randomness for demo
        const personas = [
            { title: 'The Foodie 🍔', desc: '40% of your expenses are on Dining & Swiggy.', color: '#F59E0B' },
            { title: 'The Traveler ✈️', desc: 'You spend more on Travel than 90% of users.', color: '#3B82F6' },
            { title: 'The Saver 💰', desc: 'Great job! You save 50% of your income.', color: '#10B981' },
            { title: 'Tech Enthusiast 💻', desc: 'Heavy spending on Gadgets & Subscriptions.', color: '#8B5CF6' }
        ];
        setPersona(personas[Math.floor(Math.random() * personas.length)]);
    };

    // Wealth Forecast Logic
    const generateForecast = () => {
        const currentNetWorth = 500000; // Mock starting point
        const growthRate = 0.12; // 12% annual growth
        const data = [];
        for (let i = 0; i <= 5; i++) {
            data.push({
                year: 2026 + i,
                value: currentNetWorth * Math.pow(1 + growthRate, i)
            });
        }
        setForecastData(data);
    };

    const generateAiTips = () => {
        setAiTips([
            { id: 1, type: 'alert', title: 'Unusual Spike', msg: 'Dining spend is +40% higher than your average.', icon: AlertTriangle, color: '#EF4444' },
            { id: 2, type: 'opportunity', title: 'Idle Cash', msg: 'You have ₹25k in savings. Invest in NIFTY 50?', icon: TrendingUp, color: '#10B981' },
            { id: 3, type: 'tip', title: 'Subscription Check', msg: 'You haven\'t used "Netflix" in 20 days.', icon: Lightbulb, color: '#F59E0B' },
        ]);
    };

    useEffect(() => {
        analyzeDNA();
        generateForecast();
        generateAiTips();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        analyzeDNA(); // Re-roll persona for demo fun
        setTimeout(() => setRefreshing(false), 1000);
    };

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} progressBackgroundColor="#18181B" />}
            >
                {/* Header */}
                <StackHeader title="Insights 🧠" subtitle="AI Financial Guardian">
                    <View style={styles.aiBadge}>
                        <Sparkles size={16} color="#8B5CF6" />
                        <Text style={styles.aiBadgeText}>AI Active</Text>
                    </View>
                </StackHeader>

                {/* Spending DNA Card */}
                <View style={styles.section}>
                    <LuxuryCard style={styles.dnaCard}>
                        <LinearGradient
                            colors={[`${persona.color}20`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.cardGlow}
                        />
                        <View style={styles.dnaHeader}>
                            <View style={[styles.iconBox, { backgroundColor: `${persona.color}20` }]}>
                                <User size={24} color={persona.color} />
                            </View>
                            <View>
                                <Text style={[styles.dnaLabel, { color: persona.color }]}>SPENDING DNA</Text>
                                <Text style={styles.dnaTitle}>{persona.title}</Text>
                            </View>
                        </View>
                        <Text style={styles.dnaDesc}>{persona.desc}</Text>
                    </LuxuryCard>
                </View>

                {/* Wealth Forecast */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Wealth Forecast (5 Years)</Text>
                    <LuxuryCard style={styles.forecastCard}>
                        <View style={styles.chartContainer}>
                            {forecastData.map((point, index) => (
                                <View key={index} style={styles.chartBarWrapper}>
                                    <View style={[styles.chartBar, { height: `${(point.value / forecastData[5].value) * 100}%`, backgroundColor: index === 5 ? '#10B981' : '#3F3F46' }]}>
                                        {index === 5 && (
                                            <View style={styles.chartTooltip}>
                                                <Text style={styles.tooltipText}>₹{(point.value / 1000).toFixed(0)}k</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.chartLabel}>{point.year}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.forecastCaption}>
                            At your current savings rate, you will hit <Text style={{ color: '#10B981' }}>₹{(forecastData[5]?.value / 1000).toFixed(0)}k</Text> by 2031.
                        </Text>
                    </LuxuryCard>
                </View>

                {/* Smart Alerts */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Smart Alerts</Text>
                    <View style={{ gap: 12 }}>
                        {aiTips.map((tip) => (
                            <LuxuryCard key={tip.id} style={styles.alertCard}>
                                <View style={[styles.alertIcon, { backgroundColor: `${tip.color}20` }]}>
                                    <tip.icon size={20} color={tip.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.alertTitle}>{tip.title}</Text>
                                    <Text style={styles.alertMsg}>{tip.msg}</Text>
                                </View>
                                <ArrowRight size={16} color="#52525B" />
                            </LuxuryCard>
                        ))}
                    </View>
                </View>

                {/* "Ask AI" Fab */}
                <TouchableOpacity style={styles.fab} onPress={() => setChatVisible(!chatVisible)}>
                    <LinearGradient
                        colors={['#8B5CF6', '#6366F1']}
                        style={styles.fabGradient}
                    >
                        <MessageSquare size={24} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Simple AI Chat Overlay (Mock) */}
                {chatVisible && (
                    <View style={styles.chatOverlay}>
                        <View style={styles.chatHeader}>
                            <Sparkles size={16} color="#8B5CF6" />
                            <Text style={styles.chatTitle}>Fintech AI Assistant</Text>
                        </View>
                        <View style={styles.chatBody}>
                            <Text style={styles.chatMsg}>Hello! I analyzed your finances. You are doing great on savings, but your food expenses are high. How can I help?</Text>
                            <View style={styles.chatSuggestions}>
                                <TouchableOpacity style={styles.suggestionChip}>
                                    <Text style={styles.suggestionText}>How to save tax?</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.suggestionChip}>
                                    <Text style={styles.suggestionText}>Analyze my debt</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollContent: { paddingBottom: 100 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },

    aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8B5CF620', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#8B5CF640' },
    aiBadgeText: { color: '#8B5CF6', fontWeight: '700', fontSize: 12 },

    section: { paddingHorizontal: 24, marginBottom: 32 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },

    dnaCard: { padding: 24, backgroundColor: '#18181B', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF08' },
    cardGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.4 },
    dnaHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dnaLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    dnaTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
    dnaDesc: { fontSize: 15, color: '#A1A1AA', lineHeight: 22 },

    forecastCard: { padding: 24, backgroundColor: '#18181B', borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF08' },
    chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, marginBottom: 20 },
    chartBarWrapper: { alignItems: 'center', gap: 8, flex: 1 },
    chartBar: { width: 8, borderRadius: 4, position: 'relative', alignItems: 'center' },
    chartLabel: { fontSize: 12, color: '#52525B', fontWeight: '600' },
    chartTooltip: { position: 'absolute', top: -30, backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    tooltipText: { fontSize: 10, color: '#000', fontWeight: '800' },
    forecastCaption: { color: '#A1A1AA', fontSize: 13, textAlign: 'center', lineHeight: 20 },

    alertCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: '#18181B', borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF05' },
    alertIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    alertTitle: { color: '#FFF', fontWeight: '700', fontSize: 14, marginBottom: 2 },
    alertMsg: { color: '#A1A1AA', fontSize: 13 },

    fab: { position: 'absolute', bottom: 100, right: 24, width: 56, height: 56, borderRadius: 28, elevation: 8, shadowColor: '#8B5CF6', shadowOpacity: 0.4, shadowRadius: 10 },
    fabGradient: { flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },

    chatOverlay: { position: 'absolute', bottom: 170, right: 24, width: 300, backgroundColor: '#18181B', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#8B5CF640', elevation: 10 },
    chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    chatTitle: { color: '#8B5CF6', fontWeight: '700', fontSize: 13 },
    chatMsg: { color: '#FFF', fontSize: 14, lineHeight: 20, marginBottom: 16 },
    chatSuggestions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    suggestionChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#27272A', borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF10' },
    suggestionText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
});
