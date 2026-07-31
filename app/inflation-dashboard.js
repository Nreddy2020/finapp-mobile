import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, Dimensions, TextInput, Switch, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
    TrendingUp, TrendingDown, ChevronLeft, RefreshCw, Settings, Bell, Info,
    BarChart3, PieChart, Calendar, DollarSign, Globe, AlertTriangle, CheckCircle2
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useGlobalFinance } from '../components/context/GlobalFinanceContext';
import { InflationService } from '../services/inflation';
import LuxuryCard from '../components/ui/LuxuryCard';

const { width } = Dimensions.get('window');

export default function InflationDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { formatAmount, inflationRate, setInflationRate, inflationSource, setInflationSource } = useGlobalFinance();

    // State
    const [currentInflation, setCurrentInflation] = useState(null);
    // Use global source instead of local state
    // const [selectedSource, setSelectedSource] = useState('RBI');
    const [categoryInflation, setCategoryInflation] = useState({});
    const [historicalData, setHistoricalData] = useState([]);
    const [personalizedRate, setPersonalizedRate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Calculator state
    const [calcAmount, setCalcAmount] = useState('100000');
    const [calcYears, setCalcYears] = useState('10');
    const [calcResult, setCalcResult] = useState(null);

    // Preferences state
    const [autoUpdate, setAutoUpdate] = useState(true);
    const [notificationThreshold, setNotificationThreshold] = useState('1.0');

    // Data sources
    const dataSources = [
        { id: 'RBI', name: 'RBI', color: '#10B981', description: 'Reserve Bank of India' },
        { id: 'WorldBank', name: 'World Bank', color: '#3B82F6', description: 'Global Data' },
        { id: 'IMF', name: 'IMF', color: '#8B5CF6', description: 'International' },
        { id: 'Manual', name: 'Custom', color: '#F59E0B', description: 'Manual Entry' }
    ];

    // Load initial data
    useEffect(() => {
        console.log("InflationDashboard: inflationSource changed to:", inflationSource);
        loadInflationData();
    }, [inflationSource]);

    const loadInflationData = async () => {
        setIsLoading(true);
        try {
            console.log("InflationDashboard: Fetching data for source:", inflationSource);
            // Get current inflation
            const current = await InflationService.getCurrentInflation(inflationSource);
            console.log("InflationDashboard: Received current inflation:", current);
            setCurrentInflation(current);
            setInflationRate(current.rate);

            // Get category inflation
            const categories = await InflationService.getCategoryInflation(inflationSource);
            setCategoryInflation(categories);

            // Get historical data (last 12 months)
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const historical = await InflationService.getHistoricalInflation(inflationSource, 'overall', startDate, endDate);
            setHistoricalData(historical.data || []);

            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error loading inflation data:', error);
            Alert.alert('Error', 'Failed to load inflation data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        try {
            await InflationService.refreshInflationData(inflationSource);
            await loadInflationData();
            Alert.alert('Success', 'Inflation data refreshed');
        } catch (error) {
            Alert.alert('Error', 'Failed to refresh data');
        }
    };

    const calculateImpact = async () => {
        const amount = parseFloat(calcAmount);
        const years = parseInt(calcYears);

        if (isNaN(amount) || isNaN(years) || amount <= 0 || years <= 0) {
            Alert.alert('Invalid Input', 'Please enter valid amount and years');
            return;
        }

        try {
            const result = await InflationService.calculateInflationImpact(amount, years, currentInflation?.rate);
            setCalcResult(result);
        } catch (error) {
            Alert.alert('Error', 'Failed to calculate impact');
        }
    };

    const getTrendIcon = () => {
        if (!historicalData || historicalData.length < 2) return null;
        const latest = historicalData[historicalData.length - 1];
        const previous = historicalData[historicalData.length - 2];
        return latest.rate > previous.rate ? TrendingUp : TrendingDown;
    };

    const getTrendColor = () => {
        if (!historicalData || historicalData.length < 2) return '#71717A';
        const latest = historicalData[historicalData.length - 1];
        const previous = historicalData[historicalData.length - 2];
        return latest.rate > previous.rate ? '#EF4444' : '#10B981';
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="#000000" />
            <LinearGradient colors={['#000000', '#09090B']} style={styles.container}>
                {/* Fixed Header with high zIndex */}
                <View style={[styles.header, {
                    paddingTop: Math.max(insets.top, 20) + 10,
                    paddingHorizontal: 20,
                    zIndex: 100,
                    position: 'relative' // Ensure zIndex works
                }]}>
                    <Pressable
                        onPress={() => {
                            console.log('Back button pressed');
                            // Web-specific safe navigation
                            if (Platform.OS === 'web') {
                                router.navigate('/(tabs)/more');
                            } else {
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.navigate('/(tabs)/more');
                                }
                            }
                        }}
                        style={({ pressed }) => [
                            styles.backButton,
                            { opacity: pressed ? 0.7 : 1 }
                        ]}
                    >
                        <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerLabel}>REAL-TIME TRACKING</Text>
                        <Text style={styles.title}>Inflation Dashboard</Text>
                    </View>
                    <Pressable
                        onPress={() => {
                            console.log('Refresh button pressed');
                            handleRefresh();
                        }}
                        style={({ pressed }) => [
                            styles.iconButton,
                            { opacity: pressed ? 0.7 : 1 }
                        ]}
                    >
                        <RefreshCw size={20} color="#FFFFFF" strokeWidth={2.5} />
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.content,
                        { paddingTop: 20, paddingBottom: insets.bottom + 80 }
                    ]}
                    showsVerticalScrollIndicator={false}
                >

                    {/* Data Source Selector */}
                    <View style={styles.sourceSelector}>
                        {dataSources.map((source) => (
                            <Pressable
                                key={source.id}
                                style={[
                                    styles.sourceChip,
                                    inflationSource === source.id && { backgroundColor: source.color + '20', borderColor: source.color }
                                ]}
                                onPress={() => setInflationSource(source.id)}
                            >
                                <Text style={[
                                    styles.sourceChipText,
                                    inflationSource === source.id && { color: source.color }
                                ]}>
                                    {source.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Current Inflation Card */}
                    <LuxuryCard style={styles.currentCard}>
                        <View style={styles.currentHeader}>
                            <View>
                                <Text style={styles.currentLabel}>Current Inflation Rate</Text>
                                <Text style={styles.currentSource}>{dataSources.find(s => s.id === inflationSource)?.description}</Text>
                            </View>
                            {getTrendIcon() && React.createElement(getTrendIcon(), { size: 24, color: getTrendColor() })}
                        </View>

                        <Text style={styles.currentRate}>{currentInflation?.rate?.toFixed(2) || '—'}%</Text>

                        {lastUpdated && (
                            <Text style={styles.lastUpdated}>
                                Last updated: {lastUpdated.toLocaleTimeString()}
                            </Text>
                        )}

                        {currentInflation?.rate > 7 && (
                            <View style={styles.warningBadge}>
                                <AlertTriangle size={14} color="#EF4444" />
                                <Text style={styles.warningText}>High inflation alert</Text>
                            </View>
                        )}
                    </LuxuryCard>

                    {/* Category Inflation */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>CATEGORY BREAKDOWN</Text>
                        <View style={styles.categoryGrid}>
                            {Object.entries(categoryInflation).map(([category, rate]) => {
                                if (!rate) return null;
                                const isHigh = rate > (currentInflation?.rate || 6);
                                return (
                                    <View key={category} style={styles.categoryCard}>
                                        <Text style={styles.categoryName}>{category}</Text>
                                        <Text style={[styles.categoryRate, isHigh && { color: '#EF4444' }]}>
                                            {rate.toFixed(1)}%
                                        </Text>
                                        {isHigh && (
                                            <View style={styles.highBadge}>
                                                <Text style={styles.highBadgeText}>High</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Inflation Impact Calculator */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>INFLATION IMPACT CALCULATOR</Text>
                        <LuxuryCard style={styles.calculatorCard}>
                            <View style={styles.inputRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Amount (₹)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={calcAmount}
                                        onChangeText={setCalcAmount}
                                        keyboardType="numeric"
                                        placeholderTextColor="#52525B"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Years</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={calcYears}
                                        onChangeText={setCalcYears}
                                        keyboardType="numeric"
                                        placeholderTextColor="#52525B"
                                    />
                                </View>
                            </View>

                            <Pressable style={styles.calculateButton} onPress={calculateImpact}>
                                <Text style={styles.calculateButtonText}>Calculate Impact</Text>
                            </Pressable>

                            {calcResult && (
                                <View style={styles.resultCard}>
                                    <View style={styles.resultRow}>
                                        <Text style={styles.resultLabel}>Current Value</Text>
                                        <Text style={styles.resultValue}>{formatAmount(calcResult.current_amount)}</Text>
                                    </View>
                                    <View style={styles.resultRow}>
                                        <Text style={styles.resultLabel}>Future Nominal Value</Text>
                                        <Text style={[styles.resultValue, { color: '#F59E0B' }]}>
                                            {formatAmount(calcResult.future_nominal_value)}
                                        </Text>
                                    </View>
                                    <View style={styles.resultRow}>
                                        <Text style={styles.resultLabel}>Real Value Today</Text>
                                        <Text style={[styles.resultValue, { color: '#EF4444' }]}>
                                            {formatAmount(calcResult.real_value_today)}
                                        </Text>
                                    </View>
                                    <View style={styles.resultRow}>
                                        <Text style={styles.resultLabel}>Purchasing Power Loss</Text>
                                        <Text style={[styles.resultValue, { color: '#EF4444', fontWeight: '900' }]}>
                                            -{formatAmount(calcResult.purchasing_power_loss)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </LuxuryCard>
                    </View>

                    {/* Historical Trend (Simplified) */}
                    {historicalData.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>HISTORICAL TREND (12 MONTHS)</Text>
                            <LuxuryCard style={styles.historyCard}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {historicalData.slice(-12).map((item, index) => {
                                        const date = new Date(item.period_end);
                                        return (
                                            <View key={index} style={styles.historyBar}>
                                                <View style={[styles.bar, { height: `${(item.rate / 10) * 100}%`, backgroundColor: item.rate > 6 ? '#EF4444' : '#10B981' }]} />
                                                <Text style={styles.historyLabel}>{date.toLocaleDateString('en-US', { month: 'short' })}</Text>
                                                <Text style={styles.historyValue}>{item.rate.toFixed(1)}%</Text>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            </LuxuryCard>
                        </View>
                    )}

                    {/* Quick Insights */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>QUICK INSIGHTS</Text>
                        <LuxuryCard style={styles.insightCard}>
                            <View style={styles.insightRow}>
                                <Info size={16} color="#3B82F6" />
                                <Text style={styles.insightText}>
                                    At {currentInflation?.rate?.toFixed(1)}% inflation, ₹100 today will be worth ₹{(100 / Math.pow(1 + (currentInflation?.rate || 6) / 100, 1)).toFixed(2)} in 1 year
                                </Text>
                            </View>
                            <View style={styles.insightRow}>
                                <Info size={16} color="#F59E0B" />
                                <Text style={styles.insightText}>
                                    Your money loses {((currentInflation?.rate || 6) / 365).toFixed(4)}% of its value every day
                                </Text>
                            </View>
                            <View style={styles.insightRow}>
                                <CheckCircle2 size={16} color="#10B981" />
                                <Text style={styles.insightText}>
                                    Investments returning &gt;{currentInflation?.rate?.toFixed(1)}% are beating inflation
                                </Text>
                            </View>
                        </LuxuryCard>
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    content: { paddingHorizontal: 20 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
    backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#18181B', justifyContent: 'center', alignItems: 'center' },
    headerLabel: { fontSize: 11, color: '#71717A', fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
    title: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    iconButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#18181B', justifyContent: 'center', alignItems: 'center' },

    // Source Selector
    sourceSelector: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    sourceChip: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08', alignItems: 'center' },
    sourceChipText: { fontSize: 13, fontWeight: '700', color: '#71717A' },

    // Current Inflation
    currentCard: { backgroundColor: '#18181B', padding: 24, marginBottom: 24 },
    currentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    currentLabel: { fontSize: 13, color: '#A1A1AA', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    currentSource: { fontSize: 11, color: '#52525B', marginTop: 2 },
    currentRate: { fontSize: 56, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2, marginBottom: 8 },
    lastUpdated: { fontSize: 11, color: '#52525B', marginBottom: 12 },
    warningBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EF444410', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
    warningText: { fontSize: 12, color: '#EF4444', fontWeight: '700' },

    // Section
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: '#71717A', letterSpacing: 1.5, marginBottom: 12, paddingHorizontal: 4 },

    // Category Grid
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    categoryCard: { width: (width - 52) / 2, backgroundColor: '#18181B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    categoryName: { fontSize: 13, color: '#A1A1AA', fontWeight: '600', textTransform: 'capitalize', marginBottom: 8 },
    categoryRate: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
    highBadge: { backgroundColor: '#EF444410', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
    highBadgeText: { fontSize: 10, color: '#EF4444', fontWeight: '700' },

    // Calculator
    calculatorCard: { backgroundColor: '#18181B', padding: 20 },
    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    inputLabel: { fontSize: 12, color: '#A1A1AA', fontWeight: '600', marginBottom: 8 },
    input: { backgroundColor: '#27272A', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 16, fontWeight: '600', borderWidth: 1, borderColor: '#FFFFFF08' },
    calculateButton: { backgroundColor: '#F59E0B', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
    calculateButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    resultCard: { backgroundColor: '#27272A', padding: 16, borderRadius: 12, gap: 12 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultLabel: { fontSize: 13, color: '#A1A1AA', fontWeight: '600' },
    resultValue: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },

    // History
    historyCard: { backgroundColor: '#18181B', padding: 20 },
    historyBar: { width: 60, alignItems: 'center', marginRight: 12 },
    bar: { width: 24, backgroundColor: '#10B981', borderRadius: 4, marginBottom: 8 },
    historyLabel: { fontSize: 10, color: '#71717A', fontWeight: '600', marginBottom: 2 },
    historyValue: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },

    // Insights
    insightCard: { backgroundColor: '#18181B', padding: 20, gap: 16 },
    insightRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    insightText: { flex: 1, fontSize: 13, color: '#D4D4D8', lineHeight: 20 }
});
