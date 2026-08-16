import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { TrendingUp, TrendingDown, PieChart, DollarSign, Activity, Globe, ArrowUpRight, ArrowDownLeft, Wallet, Briefcase, Bitcoin, BrainCircuit, AlertTriangle, Zap, X, Save, Layers } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import { COLORS } from '../../constants/theme';
import { getLoans, getMetalPrices } from '../../services/api';
import { loadData, saveData, STORAGE_KEYS, loadHoldings, loadInvestmentEvents, loadMarketQuotes } from '../../services/storage';
import { InvestmentsService } from '../../services/investments';
import InvestingAnalyticsEngine from '../../services/investingAnalyticsEngine';
import MarketDataService from '../../services/marketDataService';
import { useGlobalFinance } from '../../components/context/GlobalFinanceContext';
import PortfolioOverviewCard from '../../components/investments/PortfolioOverviewCard';
import PortfolioHeader from '../../components/investments/PortfolioHeader';
import AssetAllocationCard from '../../components/investments/AssetAllocationCard';
import PerformanceGrowthTimelineCard from '../../components/investments/PerformanceGrowthTimelineCard';

export default function InvestmentsScreen() {
    const { inflationRate, formatAmount } = useGlobalFinance();
    const [netWorth, setNetWorth] = useState(0);
    const [portfolioValue, setPortfolioValue] = useState(0);
    const [cashBalance, setCashBalance] = useState(150000);
    const [refreshing, setRefreshing] = useState(false);
    const [isCrisisMode, setIsCrisisMode] = useState(false);
    const [loading, setLoading] = useState(true);

    // Stage C.5.1, C.5.2 & C.5.3 Portfolio Analytics State
    const [selectedPortfolioId, setSelectedPortfolioId] = useState(null); // null = ALL_PORTFOLIOS
    const [availablePortfolios, setAvailablePortfolios] = useState([]);
    const [portfolioSummary, setPortfolioSummary] = useState(null);
    const [allocationSummary, setAllocationSummary] = useState(null);
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    const [performanceTimeline, setPerformanceTimeline] = useState([]);
    const [lastRefreshTime, setLastRefreshTime] = useState(null);
    const requestIdRef = useRef(0);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [newInv, setNewInv] = useState({ name: '', type: 'Stock', quantity: '', investedAmount: '' });

    // Live Market Data
    const [marketData, setMarketData] = useState([
        { symbol: 'NIFTY 50', price: 24500, change: 1.2, isUp: true },
        { symbol: 'SENSEX', price: 81200, change: 1.1, isUp: true },
        { symbol: 'GOLD', price: 160000, change: -0.4, isUp: false },
        { symbol: 'SILVER', price: 350000, change: 0.8, isUp: true },
        { symbol: 'BTC', price: 68000, change: 2.5, isUp: true },
        { symbol: 'ETH', price: 3400, change: -1.2, isUp: false },
    ]);

    // Holdings
    const [holdings, setHoldings] = useState([]);

    const fetchData = async (targetPortfolioId = selectedPortfolioId) => {
        const currentReqId = ++requestIdRef.current;
        try {
            // 1. Discover unique portfolios from holdings & events
            const allHoldings = await loadHoldings();
            const allEvents = await loadInvestmentEvents();

            const pIdSet = new Set();
            allHoldings.forEach(h => { if (h.portfolioId) pIdSet.add(h.portfolioId); });
            allEvents.forEach(e => { if (e.portfolioId) pIdSet.add(e.portfolioId); });

            const discoveredPortfolios = Array.from(pIdSet).map(id => ({
                id,
                name: id === 'default' ? 'Main Account' : (id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '))
            }));

            // 2. Compute C.4.1 Portfolio Summary, C.4.2 Allocation Summary & C.4.3 Performance Snapshots
            const now = new Date();
            const t0 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            const t1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            const t2 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            const tNow = now;

            const [summary, allocSummary, perfNow, perfT0, perfT1, perfT2] = await Promise.all([
                InvestingAnalyticsEngine.getPortfolioSummary({
                    portfolioId: targetPortfolioId
                }),
                InvestingAnalyticsEngine.getAssetAllocationSummary({
                    portfolioId: targetPortfolioId
                }),
                InvestingAnalyticsEngine.getPerformanceMetrics({
                    portfolioId: targetPortfolioId,
                    asOfDate: tNow
                }),
                InvestingAnalyticsEngine.getPerformanceMetrics({
                    portfolioId: targetPortfolioId,
                    asOfDate: t0
                }),
                InvestingAnalyticsEngine.getPerformanceMetrics({
                    portfolioId: targetPortfolioId,
                    asOfDate: t1
                }),
                InvestingAnalyticsEngine.getPerformanceMetrics({
                    portfolioId: targetPortfolioId,
                    asOfDate: t2
                })
            ]);

            // Construct timeline points with monotonic ordering and explicit deduplication
            const rawPoints = [
                { date: t0.toISOString().slice(0, 10), timestamp: t0.getTime(), ...perfT0 },
                { date: t1.toISOString().slice(0, 10), timestamp: t1.getTime(), ...perfT1 },
                { date: t2.toISOString().slice(0, 10), timestamp: t2.getTime(), ...perfT2 },
                { date: tNow.toISOString().slice(0, 10), timestamp: tNow.getTime(), ...perfNow }
            ];

            const sortedPoints = rawPoints
                .map(pt => ({
                    date: pt.date,
                    timestamp: pt.timestamp,
                    terminalMarketValue: pt.cashFlowSummary?.terminalMarketValue || 0,
                    historicalOutflows: pt.cashFlowSummary?.historicalOutflows || 0,
                    historicalInflows: pt.cashFlowSummary?.historicalInflows || 0,
                    xirrPercent: pt.xirrPercent || 0,
                    cagrPercent: pt.cagrPercent || 0,
                    absoluteReturnPercent: pt.absoluteReturnPercent || 0,
                    performanceType: pt.performanceType || 'ABSOLUTE',
                    valuationBasis: pt.valuationBasis || 'EMPTY'
                }))
                .sort((a, b) => a.timestamp - b.timestamp);

            const timeline = [];
            const seenTimestamps = new Set();
            for (const pt of sortedPoints) {
                const key = pt.date || String(pt.timestamp);
                if (!seenTimestamps.has(key)) {
                    seenTimestamps.add(key);
                    timeline.push(pt);
                }
            }


            // 3. Sourced Quote Timestamps
            const cachedQuotes = await loadMarketQuotes();
            let latestQuoteTime = null;
            if (cachedQuotes && cachedQuotes.length > 0) {
                const timestamps = cachedQuotes.map(q => new Date(q.timestamp).getTime()).filter(t => !isNaN(t));
                if (timestamps.length > 0) {
                    latestQuoteTime = Math.max(...timestamps);
                }
            }

            // Load legacy holdings for bottom list view
            const currentHoldings = await InvestmentsService.getInvestments();

            // Guard against race conditions: discard out-of-order async responses
            if (currentReqId !== requestIdRef.current) {
                return;
            }

            setAvailablePortfolios(discoveredPortfolios);
            setPortfolioSummary(summary);
            setAllocationSummary(allocSummary);
            setPerformanceMetrics(perfNow);
            setPerformanceTimeline(timeline);
            setLastRefreshTime(latestQuoteTime);
            setHoldings(currentHoldings);

            const investValue = summary.totalMarketValue || 0;
            setPortfolioValue(investValue);
            setNetWorth((cashBalance + investValue) - 0);

        } catch (error) {
            console.error('[InvestmentsScreen] Error loading portfolio summary:', error);
        } finally {
            if (currentReqId === requestIdRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    };


    const handleSelectPortfolio = (pId) => {

        setSelectedPortfolioId(pId);
        fetchData(pId);
    };


    // Keep a ref so we can safely clear the interval on unmount
    const intervalRef = useRef(null);

    const refreshMetals = useCallback(async () => {
        try {
            const liveMetals = await getMetalPrices();
            setMarketData(prev => prev.map(item => {
                if (item.symbol === 'GOLD') {
                    const diff = liveMetals.GOLD - item.price;
                    return { ...item, price: liveMetals.GOLD, change: (diff / 160000) * 100, isUp: diff >= 0 };
                }
                if (item.symbol === 'SILVER') {
                    const diff = liveMetals.SILVER - item.price;
                    return { ...item, price: liveMetals.SILVER, change: (diff / 350000) * 100, isUp: diff >= 0 };
                }
                // Simulated random-walk for non-metal symbols
                const jitter = Math.random() * 0.001 - 0.0005;
                return { ...item, price: item.price * (1 + jitter), isUp: jitter >= 0 };
            }));
        } catch {
            // Silently ignore — stale prices are fine here
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Fetch metals on mount, then refresh every 30 s (API-friendly)
        refreshMetals();
        intervalRef.current = setInterval(refreshMetals, 30_000);
        return () => clearInterval(intervalRef.current);
    }, [refreshMetals]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            // 1. Fetch live quotes for all holding symbols via MarketDataService
            const allHoldings = await loadHoldings();
            const symbolsToRefresh = Array.from(new Set(allHoldings.map(h => h.symbol).filter(Boolean)));
            if (symbolsToRefresh.length > 0) {
                await Promise.all(symbolsToRefresh.map(sym => MarketDataService.getQuote(sym)));
            }

            // 2. Refresh metals & market pulse ticker
            await refreshMetals();

            // 3. Re-fetch portfolio summary and valuation snapshot
            await fetchData(selectedPortfolioId);
        } catch (err) {
            console.warn('[InvestmentsScreen] Error refreshing quotes via MarketDataService:', err);
        } finally {
            setRefreshing(false);
        }
    };


    const handleBuy = async () => {
        if (!newInv.name || !newInv.investedAmount) {
            Alert.alert('Error', 'Please enter Name and Amount');
            return;
        }

        await InvestmentsService.addInvestment({
            ...newInv,
            currentValue: newInv.investedAmount, // Start at cost
            purchaseDate: new Date().toISOString()
        });

        setModalVisible(false);
        setNewInv({ name: '', type: 'Stock', quantity: '', investedAmount: '' });
        fetchData();
        Alert.alert('Success', 'Order Executed');
    };

    const handleSell = async (id) => {
        Alert.alert(
            "Sell Holding",
            "Liquidate this position?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sell",
                    style: "destructive",
                    onPress: async () => {
                        await InvestmentsService.deleteInvestment(id);
                        fetchData();
                        Alert.alert("Sold", "Funds added to cash balance (simulated)");
                    }
                }
            ]
        );
    };

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} progressBackgroundColor="#18181B" />}
            >
                {/* Header */}
                <StackHeader title="Investments" subtitle="Wealth Command Center">
                    {/* Crisis Mode Toggle */}
                    <TouchableOpacity
                        onPress={() => {
                            setIsCrisisMode(!isCrisisMode);
                            alert(isCrisisMode ? '😌 Market Normalizing...' : '🚨 CRISIS MODE ACTIVATED!\n\nSimulating -20% Market Crash. Hedging protocols initiated.');
                        }}
                        style={{ backgroundColor: isCrisisMode ? '#EF444420' : '#18181B', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: isCrisisMode ? '#EF4444' : '#FFFFFF10' }}
                    >
                        <AlertTriangle size={24} color={isCrisisMode ? '#EF4444' : '#71717A'} />
                    </TouchableOpacity>
                </StackHeader>

                {/* Net Worth Hero Card */}
                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            pointerEvents="none"
                            colors={['#4F46E560', '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>TOTAL NET WORTH</Text>
                            <Text style={styles.heroAmount}>₹{netWorth.toLocaleString('en-IN')}</Text>
                            <View style={styles.heroFooter}>
                                <View style={[styles.heroIconBadge, { backgroundColor: '#4F46E5' }]}>
                                    <Globe size={14} color="#FFF" />
                                </View>
                                <Text style={styles.heroSubtext}>Across all assets & liabilities</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Market Pulse Ticker */}
                <View style={styles.tickerContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 24 }}>
                        {marketData.map((item, index) => (
                            <View key={index} style={styles.tickerItem}>
                                <Text style={styles.tickerSymbol}>{item.symbol}</Text>
                                <Text style={styles.tickerPrice}>
                                    {['BTC', 'ETH'].includes(item.symbol) ? '$' : '₹'}
                                    {item.price.toLocaleString(undefined, { maximumFractionDigits: item.symbol.includes('BTC') ? 0 : 0 })}
                                </Text>
                                <Text style={[styles.tickerChange, { color: item.isUp ? '#10B981' : '#EF4444' }]}>
                                    {item.isUp ? '▲' : '▼'}{Math.abs(item.change).toFixed(2)}%
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Metal Analytics Module */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={styles.sectionTitle}>Precision Metals</Text>
                        <View style={{ backgroundColor: '#F59E0B20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '800' }}>LIVE TRACKING</Text>
                        </View>
                    </View>

                    {/* Gold Cards Row */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                        <LuxuryCard style={{ flex: 1, padding: 16 }}>
                            <Text style={{ color: '#71717A', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>GOLD 24K</Text>
                            <Text style={{ color: '#9CA3AF', fontSize: 9, marginBottom: 8 }}>per 10 grams</Text>
                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>₹{marketData.find(m => m.symbol === 'GOLD')?.price.toLocaleString()}</Text>
                            <Text style={{ color: '#71717A', fontSize: 10, marginTop: 4 }}>₹{Math.round(marketData.find(m => m.symbol === 'GOLD')?.price / 10).toLocaleString()}/g</Text>
                            <View style={{ height: 2, backgroundColor: '#FFFFFF10', marginVertical: 12 }} />
                            <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>+8.4% YTD</Text>
                        </LuxuryCard>
                        <LuxuryCard style={{ flex: 1, padding: 16 }}>
                            <Text style={{ color: '#71717A', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>GOLD 22K</Text>
                            <Text style={{ color: '#9CA3AF', fontSize: 9, marginBottom: 8 }}>per 10 grams</Text>
                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>₹{Math.round((marketData.find(m => m.symbol === 'GOLD')?.price || 160000) * 0.9167).toLocaleString()}</Text>
                            <Text style={{ color: '#71717A', fontSize: 10, marginTop: 4 }}>₹{Math.round((marketData.find(m => m.symbol === 'GOLD')?.price || 160000) * 0.9167 / 10).toLocaleString()}/g</Text>
                            <View style={{ height: 2, backgroundColor: '#FFFFFF10', marginVertical: 12 }} />
                            <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>+7.9% YTD</Text>
                        </LuxuryCard>
                    </View>

                    {/* Silver Card */}
                    <LuxuryCard style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#71717A', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>SILVER 999</Text>
                                <Text style={{ color: '#9CA3AF', fontSize: 9, marginBottom: 8 }}>per kilogram</Text>
                                <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>₹{marketData.find(m => m.symbol === 'SILVER')?.price.toLocaleString()}</Text>
                                <Text style={{ color: '#71717A', fontSize: 10, marginTop: 4 }}>₹{Math.round((marketData.find(m => m.symbol === 'SILVER')?.price || 350000) / 1000).toLocaleString()}/g</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>-1.2% YTD</Text>
                            </View>
                        </View>
                    </LuxuryCard>
                </View>

                {/* Stage C.5.1 Executive Portfolio Dashboard */}
                <View style={styles.section}>
                    <PortfolioHeader
                        selectedPortfolioId={selectedPortfolioId}
                        availablePortfolios={availablePortfolios}
                        onSelectPortfolio={handleSelectPortfolio}
                        lastRefreshTime={lastRefreshTime}
                    />

                    <PortfolioOverviewCard
                        portfolioSummary={portfolioSummary}
                        loading={loading}
                        refreshing={refreshing}
                        onAddHolding={() => setModalVisible(true)}
                        onRefresh={onRefresh}
                    />

                    {/* Stage C.5.2 Asset Allocation & Risk Concentration Visualizer */}
                    <AssetAllocationCard
                        allocationSummary={allocationSummary}
                        loading={loading}
                    />

                    {/* Stage C.5.3 Performance & XIRR Growth Timeline Visualizer */}
                    <PerformanceGrowthTimelineCard
                        performanceMetrics={performanceMetrics}
                        timeline={performanceTimeline}
                        loading={loading}
                    />
                </View>




                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Actions</Text>
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(true)}>
                            <View pointerEvents="none" style={{ alignItems: 'center', gap: 8 }}>
                                <View style={[styles.actionIcon, { backgroundColor: '#10B98120' }]}>
                                    <ArrowDownLeft size={24} color="#10B981" />
                                </View>
                                <Text style={styles.actionText}>Buy</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Sell', 'Long press any holding in your portfolio to sell it.')}>
                            <View pointerEvents="none" style={{ alignItems: 'center', gap: 8 }}>
                                <View style={[styles.actionIcon, { backgroundColor: '#EF444420' }]}>
                                    <ArrowUpRight size={24} color="#EF4444" />
                                </View>
                                <Text style={styles.actionText}>Sell</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <View pointerEvents="none" style={{ alignItems: 'center', gap: 8 }}>
                                <View style={[styles.actionIcon, { backgroundColor: '#3B82F620' }]}>
                                    <Activity size={24} color="#3B82F6" />
                                </View>
                                <Text style={styles.actionText}>Analyze</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>

            {/* Buy Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Investment</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Asset Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Tata Motors"
                                placeholderTextColor="#52525B"
                                value={newInv.name}
                                onChangeText={(text) => setNewInv({ ...newInv, name: text })}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Type</Text>
                            <View style={styles.categoryRow}>
                                {['Stock', 'Crypto', 'MF', 'Gold'].map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.categoryChip,
                                            newInv.type === cat && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                                        ]}
                                        onPress={() => setNewInv({ ...newInv, type: cat })}
                                    >
                                        <Text style={[
                                            styles.categoryText,
                                            newInv.type === cat && { color: '#000' }
                                        ]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Amount Invested (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newInv.investedAmount}
                                    onChangeText={(text) => setNewInv({ ...newInv, investedAmount: text })}
                                />
                            </View>
                            <View style={{ width: 16 }} />
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Quantity</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newInv.quantity}
                                    onChangeText={(text) => setNewInv({ ...newInv, quantity: text })}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: COLORS.primary }]} onPress={handleBuy}>
                            <Save size={20} color="#000000" />
                            <Text style={styles.saveButtonText}>Execute Order</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollContent: { paddingBottom: 100 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 16 },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },

    heroCardWrapper: { marginHorizontal: 24, marginBottom: 24 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 48, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },

    tickerContainer: { marginBottom: 32 },
    tickerItem: { backgroundColor: '#18181B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF08', flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 0 },
    tickerSymbol: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    tickerPrice: { color: '#A1A1AA', fontSize: 13 },
    tickerChange: { fontSize: 12, fontWeight: '600' },

    section: { paddingHorizontal: 24, marginBottom: 32 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },

    portfolioCard: { padding: 20, backgroundColor: '#18181B', borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF08' },
    portfolioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    portfolioLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 4 },
    portfolioValue: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
    pnlBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },

    holdingsList: { gap: 16 },
    holdingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    holdingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    holdingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    holdingName: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    holdingQty: { color: '#71717A', fontSize: 12 },
    holdingRight: { alignItems: 'flex-end' },
    holdingValue: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    holdingPnl: { fontSize: 12, fontWeight: '600' },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    actionButton: { flex: 1, alignItems: 'center', gap: 8 },
    actionIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },
    actionText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#18181B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: 400, borderTopWidth: 1, borderColor: '#FFFFFF10' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    inputContainer: { marginBottom: 20 },
    inputLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: '#000000', borderRadius: 16, padding: 16, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    row: { flexDirection: 'row' },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF20', backgroundColor: '#000000' },
    categoryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 24, marginTop: 20, gap: 10 },
    saveButtonText: { color: '#000000', fontSize: 16, fontWeight: '800' }
});
