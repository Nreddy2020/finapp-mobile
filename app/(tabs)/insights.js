import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, RefreshControl, Dimensions, TextInput, BackHandler, KeyboardAvoidingView, Platform } from 'react-native';
import { Brain, TrendingUp, AlertTriangle, MessageSquare, Sparkles, User, Lightbulb, ArrowRight, Zap, History, X, Send, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import { COLORS } from '../../constants/theme';
import { FinlifeIntelligenceEngine, SPENDING_PERSONAS } from '../../services/intelligence/finlifeIntelligenceEngine.js';

export default function InsightsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [snapshot, setSnapshot] = useState(null);
    const [persona, setPersona] = useState(SPENDING_PERSONAS.BALANCED_STRATEGIST);
    const [forecastData, setForecastData] = useState([]);
    const [aiTips, setAiTips] = useState([]);
    const [chatVisible, setChatVisible] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([]);

    const handleBack = useCallback(() => {
        if (chatVisible) {
            setChatVisible(false);
            return;
        }
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    }, [chatVisible, router]);

    useEffect(() => {
        const onBackPress = () => {
            handleBack();
            return true;
        };
        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
    }, [handleBack]);

    const loadIntelligence = async () => {
        try {
            const snap = await FinlifeIntelligenceEngine.loadFinancialSnapshot();
            setSnapshot(snap);

            const computedPersona = FinlifeIntelligenceEngine.computeSpendingDNA(snap);
            setPersona(computedPersona);

            const forecast = FinlifeIntelligenceEngine.computeWealthForecast(snap, 12);
            setForecastData(forecast);

            const alerts = FinlifeIntelligenceEngine.generateIntelligenceAlerts(snap);
            setAiTips(alerts);

            // Initialize chat welcome message
            const netWorthLakhs = (snap.netWorthPaise / 10000000).toFixed(2);
            const monthlyBurn = (snap.monthlyExpensePaise / 100).toLocaleString('en-IN');
            setChatMessages([
                {
                    sender: 'ai',
                    text: `Hello! I have analyzed your financial ledger. Your current tracked net worth is ₹${netWorthLakhs} Lakhs with a monthly burn rate of ₹${monthlyBurn}. How can I assist your financial strategy today?`
                }
            ]);
        } catch (err) {
            console.warn('[Insights] Failed to load intelligence snapshot:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadIntelligence();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadIntelligence();
    };

    const handleSendMessage = (userQuery) => {
        const query = (userQuery || chatInput).trim();
        if (!query) return;

        const newMessages = [...chatMessages, { sender: 'user', text: query }];
        setChatMessages(newMessages);
        setChatInput('');

        // Generate context-aware AI response based on real snapshot
        setTimeout(() => {
            let reply = '';
            const q = query.toLowerCase();

            if (!snapshot) {
                reply = "I am currently loading your financial state. Please try again in a moment.";
            } else if (q.includes('tax') || q.includes('save tax')) {
                reply = "Under Section 80C, you can invest up to ₹1.5L in ELSS, PPF, or EPF. If opting for the New Regime, focus on standard deductions and NPS under 80CCD(2).";
            } else if (q.includes('debt') || q.includes('loan')) {
                const debt = (snapshot.outstandingDebtPaise / 100).toLocaleString('en-IN');
                reply = `You have ₹${debt} in outstanding liabilities. We recommend deploying any surplus bonus to high-interest loans first to eliminate finance charges.`;
            } else if (q.includes('invest') || q.includes('wealth') || q.includes('stocks')) {
                const invVal = (snapshot.investmentValuationPaise / 100).toLocaleString('en-IN');
                reply = `Your active investments stand at ₹${invVal}. At an average 12% CAGR, compounding will double your portfolio in approximately 6 years (Rule of 72).`;
            } else if (q.includes('emergency') || q.includes('buffer') || q.includes('runway')) {
                const burn = snapshot.monthlyExpensePaise / 100;
                const liquid = snapshot.liquidCashPaise / 100;
                const months = burn > 0 ? (liquid / burn).toFixed(1) : '12+';
                reply = `You currently have ₹${liquid.toLocaleString('en-IN')} in liquid cash, covering ${months} months of your monthly expenses. Target at least 6 months.`;
            } else {
                reply = `Based on your ${persona.title} profile, ${persona.advice}`;
            }

            setChatMessages([...newMessages, { sender: 'ai', text: reply }]);
        }, 400);
    };

    const maxForecastVal = forecastData.length > 0 ? Math.max(...forecastData.map(p => p.value), 1) : 1;
    const finalPoint = forecastData.length > 0 ? forecastData[forecastData.length - 1] : null;

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) + 12 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} progressBackgroundColor="#18181B" />}
            >
                {/* Header with Back Button */}
                <View style={styles.topBar}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ArrowLeft size={20} color="#F8FAFC" />
                    </TouchableOpacity>
                    <View style={styles.headerTitles}>
                        <Text style={styles.headerCategory}>DECISION INTELLIGENCE</Text>
                        <Text style={styles.headerTitle}>Insights 🧠</Text>
                    </View>
                    <View style={styles.aiBadge}>
                        <Sparkles size={14} color="#8B5CF6" />
                        <Text style={styles.aiBadgeText}>AI Active</Text>
                    </View>
                </View>

                {/* Spending DNA Card */}
                <View style={styles.section}>
                    <LuxuryCard style={styles.dnaCard}>
                        <LinearGradient
                            colors={[`${persona.color}25`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.cardGlow}
                        />
                        <View style={styles.dnaHeader}>
                            <View style={[styles.iconBox, { backgroundColor: `${persona.color}20` }]}>
                                <User size={24} color={persona.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.dnaLabel, { color: persona.color }]}>SPENDING DNA PERSONA</Text>
                                <Text style={styles.dnaTitle}>{persona.title}</Text>
                            </View>
                        </View>
                        <Text style={styles.dnaDesc}>{persona.desc}</Text>
                        <View style={styles.adviceBox}>
                            <Lightbulb size={16} color={persona.color} style={{ marginTop: 2 }} />
                            <Text style={[styles.adviceText, { color: '#D4D4D8' }]}>{persona.advice}</Text>
                        </View>
                    </LuxuryCard>
                </View>

                {/* Wealth Forecast */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Wealth Forecast (5 Years @ 12% CAGR)</Text>
                    <LuxuryCard style={styles.forecastCard}>
                        <View style={styles.chartContainer}>
                            {forecastData.map((point, index) => {
                                const heightPct = Math.max(12, Math.round((point.value / maxForecastVal) * 100));
                                const isFinal = index === forecastData.length - 1;
                                return (
                                    <View key={point.year} style={styles.chartBarWrapper}>
                                        <View style={[styles.chartBar, { height: `${heightPct}%`, backgroundColor: isFinal ? '#10B981' : '#3F3F46' }]}>
                                            {isFinal && (
                                                <View style={styles.chartTooltip}>
                                                    <Text style={styles.tooltipText}>{point.formattedValue}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.chartLabel}>{point.year}</Text>
                                    </View>
                                );
                            })}
                        </View>
                        <Text style={styles.forecastCaption}>
                            At your current savings rate, projected net worth reaches <Text style={{ color: '#10B981', fontWeight: '700' }}>{finalPoint?.formattedValue || '₹0'}</Text> by {finalPoint?.year || '2031'}.
                        </Text>
                    </LuxuryCard>
                </View>

                {/* Smart Alerts */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Smart Algorithmic Alerts</Text>
                    <View style={{ gap: 12 }}>
                        {aiTips.map((tip) => (
                            <LuxuryCard key={tip.id} style={styles.alertCard}>
                                <View style={[styles.alertIcon, { backgroundColor: `${tip.color}20` }]}>
                                    <AlertTriangle size={20} color={tip.color} />
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

            </ScrollView>

            {/* "Ask AI" Fab */}
            <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 90 }]} onPress={() => setChatVisible(!chatVisible)}>
                <LinearGradient
                    colors={['#8B5CF6', '#6366F1']}
                    style={styles.fabGradient}
                >
                    {chatVisible ? <X size={24} color="#FFF" /> : <MessageSquare size={24} color="#FFF" />}
                </LinearGradient>
            </TouchableOpacity>

            {/* Interactive Context-Aware AI Chat Overlay */}
            {chatVisible && (
                <View style={[styles.chatOverlay, { bottom: insets.bottom + 155 }]}>
                    <View style={styles.chatHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Sparkles size={16} color="#8B5CF6" />
                            <Text style={styles.chatTitle}>FinLife AI Assistant</Text>
                        </View>
                        <TouchableOpacity onPress={() => setChatVisible(false)}>
                            <X size={18} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.chatMessagesScroll} contentContainerStyle={{ gap: 10 }}>
                        {chatMessages.map((msg, idx) => (
                            <View
                                key={idx}
                                style={[
                                    styles.chatBubble,
                                    msg.sender === 'user' ? styles.userBubble : styles.aiBubble
                                ]}
                            >
                                <Text style={msg.sender === 'user' ? styles.userBubbleText : styles.aiBubbleText}>
                                    {msg.text}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Quick suggestion chips */}
                    <View style={styles.chatSuggestions}>
                        <TouchableOpacity style={styles.suggestionChip} onPress={() => handleSendMessage('How to save tax?')}>
                            <Text style={styles.suggestionText}>Tax Tips</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.suggestionChip} onPress={() => handleSendMessage('Analyze my debt')}>
                            <Text style={styles.suggestionText}>Debt Strategy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.suggestionChip} onPress={() => handleSendMessage('Emergency fund runway')}>
                            <Text style={styles.suggestionText}>Runway</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Chat Input Bar */}
                    <View style={styles.chatInputRow}>
                        <TextInput
                            style={styles.chatTextInput}
                            placeholder="Ask about your finances..."
                            placeholderTextColor="#71717A"
                            value={chatInput}
                            onChangeText={setChatInput}
                            onSubmitEditing={() => handleSendMessage()}
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={() => handleSendMessage()}>
                            <Send size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollContent: { paddingBottom: 120 },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 20
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    headerTitles: { flex: 1, marginLeft: 16 },
    headerCategory: { fontSize: 11, fontWeight: '800', color: '#71717A', letterSpacing: 1.5 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },

    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#8B5CF620',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#8B5CF640'
    },
    aiBadgeText: { color: '#8B5CF6', fontWeight: '700', fontSize: 12 },

    section: { paddingHorizontal: 24, marginBottom: 28 },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: '#71717A', marginBottom: 14, letterSpacing: 1.5, textTransform: 'uppercase' },

    dnaCard: { padding: 20, backgroundColor: '#18181B', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF10' },
    cardGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 },
    dnaHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
    iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dnaLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    dnaTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
    dnaDesc: { fontSize: 14, color: '#A1A1AA', lineHeight: 20, marginBottom: 12 },
    adviceBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#27272A80',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#3F3F4650'
    },
    adviceText: { flex: 1, fontSize: 13, lineHeight: 18 },

    forecastCard: { padding: 20, backgroundColor: '#18181B', borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF10' },
    chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, marginBottom: 16 },
    chartBarWrapper: { alignItems: 'center', gap: 8, flex: 1 },
    chartBar: { width: 10, borderRadius: 5, position: 'relative', alignItems: 'center' },
    chartLabel: { fontSize: 11, color: '#71717A', fontWeight: '600' },
    chartTooltip: { position: 'absolute', top: -30, backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
    tooltipText: { fontSize: 10, color: '#000', fontWeight: '800' },
    forecastCaption: { color: '#A1A1AA', fontSize: 13, textAlign: 'center', lineHeight: 20 },

    alertCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: '#18181B', borderRadius: 18, borderWidth: 1, borderColor: '#FFFFFF08' },
    alertIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    alertTitle: { color: '#FFF', fontWeight: '700', fontSize: 14, marginBottom: 2 },
    alertMsg: { color: '#A1A1AA', fontSize: 13, lineHeight: 18 },

    fab: {
        position: 'absolute',
        right: 20,
        width: 54,
        height: 54,
        borderRadius: 27,
        elevation: 8,
        shadowColor: '#8B5CF6',
        shadowOpacity: 0.4,
        shadowRadius: 10
    },
    fabGradient: { flex: 1, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },

    chatOverlay: {
        position: 'absolute',
        right: 20,
        left: 20,
        height: 380,
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#8B5CF660',
        elevation: 12,
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 16
    },
    chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    chatTitle: { color: '#8B5CF6', fontWeight: '800', fontSize: 14 },
    chatMessagesScroll: { flex: 1, marginBottom: 12 },
    chatBubble: { padding: 12, borderRadius: 14, maxWidth: '85%' },
    userBubble: { alignSelf: 'flex-end', backgroundColor: '#6366F1' },
    userBubbleText: { color: '#FFF', fontSize: 13, fontWeight: '500' },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: '#27272A', borderWidth: 1, borderColor: '#3F3F4650' },
    aiBubbleText: { color: '#F4F4F5', fontSize: 13, lineHeight: 18 },

    chatSuggestions: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    suggestionChip: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#27272A', borderRadius: 10, borderWidth: 1, borderColor: '#3F3F46' },
    suggestionText: { color: '#A1A1AA', fontSize: 11, fontWeight: '700' },

    chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chatTextInput: {
        flex: 1,
        height: 40,
        backgroundColor: '#09090B',
        borderRadius: 12,
        paddingHorizontal: 14,
        color: '#FFF',
        fontSize: 13,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
        justifyContent: 'center'
    }
});
