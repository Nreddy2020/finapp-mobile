import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SIZES } from '../../constants/theme';
import {
    Bell, Settings as SettingsIcon, TrendingUp, TrendingDown,
    AlertTriangle, Sparkles, Wallet, Target as TargetIcon, ShieldCheck,
    ArrowUpRight, Plus, Menu, Users, Building2 as Building, Briefcase, GraduationCap
} from 'lucide-react-native';

import { useGlobalFinance } from '../../components/context/GlobalFinanceContext';
import { useTranslation } from '../../components/localization/TranslationContext';
import { useDrawer } from './_layout';

// Mock Data / Services
import api from '../../services/api';
import { seedAllModulesComprehensive } from '../../services/seedAllModules';

const { width } = Dimensions.get('window');

// --- Sub-components (Hubs) ---

const HeroSection = ({ netWorth, safeToSpend, currencyFormatter, onSafePress, router, changePercent = 0 }) => (
    <View style={styles.premiumHeroWrap}>
        <LinearGradient colors={['rgba(79,70,229,0.12)', 'transparent']} style={styles.premiumHeroBorder}>
            <View style={styles.premiumHeroInner}>
                <View style={styles.premiumCenter}>
                    <Text style={styles.premiumLabel}>YOUR WEALTH</Text>
                    <Text style={styles.premiumValueBest}>{currencyFormatter(netWorth)}</Text>
                    <Text style={styles.premiumTagline}>A clear view of your financial position</Text>
                </View>

                <View style={styles.premiumRight}> 
                    <Pressable
                        style={({ pressed }) => [styles.safeToSpendChip, { opacity: pressed ? 0.95 : 1 }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onSafePress(); }}
                    >
                        <Text style={styles.chipTitle}>Safe to spend</Text>
                        <Text style={styles.chipValue}>{currencyFormatter(safeToSpend)}</Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.sparklineRowPremium}>
                {([0.35, 0.5, 0.42, 0.7, 0.85, 0.78, 1]).map((h, i) => (
                    <View key={i} style={[styles.sparkBarPremium, { height: 34 * h, backgroundColor: i === 6 ? '#fff' : 'rgba(255,255,255,0.12)', opacity: 0.95 }]} />
                ))}
            </View>
        </LinearGradient>
    </View>
);

// ImportantStack: prioritized list of critical items (overdue bills, due soon, over-budget, top insights)
const ImportantStack = ({ bills = [], budgets = [], insights = null, router }) => {
    const today = new Date();

    const parseDate = (d) => {
        try { return new Date(d); } catch { return null; }
    };

    const overdueBills = (bills || []).filter(b => {
        const due = parseDate(b.dueDate || b.date);
        return due && due < today && !b.paid;
    }).map(b => ({
        type: 'overdue-bill',
        title: 'Overdue Bill',
        desc: `${b.name} • ${b.amount ? '₹' + b.amount : ''}`,
        when: b.dueDate,
        payload: b,
        priority: 1,
    }));

    const dueSoon = (bills || []).filter(b => {
        const due = parseDate(b.dueDate || b.date);
        if (!due) return false;
        const diff = (due - today) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7 && !b.paid;
    }).map(b => ({
        type: 'due-soon',
        title: 'Bill Due Soon',
        desc: `${b.name} • ${b.amount ? '₹' + b.amount : ''}`,
        when: b.dueDate,
        payload: b,
        priority: 2,
    }));

    const overBudget = (budgets || []).filter(b => b.spent > b.limit).map(b => ({
        type: 'over-budget',
        title: 'Budget Exceeded',
        desc: `${b.category} • ₹${b.spent} / ₹${b.limit}`,
        payload: b,
        priority: 2,
    }));

    const topInsight = insights?.recommendations?.[0] ? [{
        type: 'insight',
        title: 'Recommendation',
        desc: insights.recommendations[0].description,
        payload: insights.recommendations[0],
        priority: 3,
    }] : [];

    const items = [...overdueBills, ...dueSoon, ...overBudget, ...topInsight]
        .sort((a, b) => (a.priority - b.priority) || (new Date(a.when || 0) - new Date(b.when || 0)))
        .slice(0, 5);

    if (!items.length) return null;

    const iconFor = (type) => {
        if (type === 'overdue-bill') return <AlertTriangle size={18} color="#EF4444" />;
        if (type === 'due-soon') return <AlertTriangle size={18} color="#F59E0B" />;
        if (type === 'over-budget') return <TrendingDown size={18} color="#F59E0B" />;
        return <Sparkles size={18} color="#8B5CF6" />;
    };

    return (
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.importantSection}>
            <Text style={styles.sectionTitle}>IMPORTANT — Action Required</Text>
            <View style={styles.importantList}>
                {items.map((it, i) => (
                    <View key={i} style={styles.importantItem}>
                        <Pressable style={styles.importantLeft} onPress={() => {
                            Haptics.selectionAsync();
                            // deep link to detail view
                            if (it.type.includes('bill')) router.push('/bills');
                            else if (it.type === 'over-budget') router.push('/budgets');
                            else if (it.type === 'insight') router.push('/insights');
                        }}>
                            <View style={styles.importantIcon}>{iconFor(it.type)}</View>
                            <View style={styles.importantMeta}>
                                <Text style={styles.importantTitle}>{it.title}</Text>
                                <Text style={styles.importantDesc} numberOfLines={1}>{it.desc}</Text>
                            </View>
                        </Pressable>

                        <View style={styles.importantRight}>
                            <View style={styles.actionGroup}>
                                {it.type.includes('bill') && (
                                    <Pressable style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => { Haptics.selectionAsync(); router.push('/bills'); }}>
                                        <Text style={styles.actionBtnText}>Pay</Text>
                                    </Pressable>
                                )}
                                {it.type === 'over-budget' && (
                                    <Pressable style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]} onPress={() => { Haptics.selectionAsync(); router.push('/budgets'); }}>
                                        <Text style={styles.actionBtnText}>Adjust</Text>
                                    </Pressable>
                                )}
                                {it.type === 'insight' && (
                                    <Pressable style={[styles.actionBtn, { backgroundColor: '#4F46E5' }]} onPress={() => { Haptics.selectionAsync(); router.push('/insights'); }}>
                                        <Text style={styles.actionBtnText}>Act</Text>
                                    </Pressable>
                                )}
                            </View>

                            <View style={[styles.importantBadge, it.priority === 1 ? { backgroundColor: '#EF4444' } : { backgroundColor: '#F59E0B' }]}> 
                                <Text style={styles.importantBadgeText}>{it.priority === 1 ? 'CRITICAL' : 'HIGH'}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </Animated.View>
    );
};

const HubCard = ({ title, value, subtitle, icon: Icon, color, route, router, index }) => (
    <Animated.View entering={FadeInDown.delay(500 + (index * 100)).springify()} style={{ width: '50%' }}>
        <Pressable
            style={styles.hubCard}
            onPress={() => {
                Haptics.selectionAsync();
                router.push(route);
            }}
        >
            <View style={[styles.hubIcon, { backgroundColor: color + '15' }]}>
                <Icon size={24} color={color} />
            </View>
            <View style={styles.hubContent}>
                <Text style={styles.hubTitle}>{title}</Text>
                <Text style={styles.hubValue}>{value}</Text>
                <Text style={styles.hubSub}>{subtitle}</Text>
            </View>
            <ArrowUpRight size={16} color="#333" style={{ position: 'absolute', top: 16, right: 16 }} />
        </Pressable>
    </Animated.View>
);

const HubRow = ({ title, value, subtitle, icon: Icon, color, route, router }) => (
    <Pressable style={styles.hubRow} onPress={() => { Haptics.selectionAsync(); router.push(route); }}>
        <View style={[styles.rowIcon, { backgroundColor: color + '15' }]}>
            <Icon size={20} color={color} />
        </View>
        <View style={styles.rowContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowValue}>{value}</Text>
            </View>
            <Text style={styles.rowSub}>{subtitle}</Text>
            <View style={styles.rowProgress}>
                <View style={[styles.progressFill, { width: '42%', backgroundColor: color }]} />
            </View>
        </View>
        <ArrowUpRight size={16} color="#444" style={{ marginLeft: 8 }} />
    </Pressable>
);

// --- Main Component ---

export default function Dashboard() {
    const router = useRouter();
    const { formatAmount } = useGlobalFinance();
    const { t } = useTranslation();
    const { setIsDrawerOpen } = useDrawer();

    // Dynamic Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning,' : hour < 17 ? 'Good Afternoon,' : 'Good Evening,';

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data states
    const [data, setData] = useState({
        bills: [], budgets: [], insights: null,
        transactions: [], income: [], savings: []
    });
    const [survivalData, setSurvivalData] = useState({ dailyLimit: 0, spentToday: 0 });
    const [investmentsData, setInvestmentsData] = useState({ total: 0, invested: 0, change: 0 });

    const loadData = async () => {
        console.log('DASHBOARD: Starting loadData...');
        try {
            // Add a hard timeout to prevent stuck loading
            const dataPromise = Promise.all([
                api.getTransactions(),
                api.getIncome(),
                api.getBills(),
                api.getBudgets(),
                api.getSavings(),
                api.getInsights()
            ]);

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Data loading timeout')), 5000)
            );

            const [txs, inc, bills, budgets, savings, insights] = await Promise.race([dataPromise, timeoutPromise]);

            setData({
                transactions: txs || [],
                income: inc || [],
                bills: bills || [],
                budgets: budgets || [],
                savings: savings || [],
                insights: insights || null
            });

            // Derive stats
            const spentToday = txs?.filter(t => t.date === new Date().toISOString().split('T')[0])
                .reduce((acc, t) => acc + Number(t.amount || 0), 0) || 0;

            setSurvivalData({
                dailyLimit: 2500, // Mock
                spentToday
            });

            const totalInvested = savings?.reduce((acc, s) => acc + Number(s.currentAmount || 0), 0) || 0;
            setInvestmentsData({
                total: totalInvested + 150000, // Mock addition
                invested: totalInvested,
                change: 2.4
            });

        } catch (e) {
            console.error('Dashboard load error:', e);
            // Don't leave user in infinite loading if API fails
            setData({});
        } finally {
            console.log('DASHBOARD: loadData finished.');
            setLoading(false);
        }
    };

    const runSeedAndReload = async () => {
        try {
            setLoading(true);
            await seedAllModulesComprehensive();
            await loadData();
        } catch (e) {
            console.error('Seed error', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData().then(() => setRefreshing(false));
    }, []);


    if (loading) {

        return (
            <View style={[styles.container, styles.center]}>
                <Sparkles size={48} color={COLORS.primary} />
                <Text style={{ color: '#666', marginTop: 16 }}>Curating your financial pulse...</Text>
            </View>
        );
    }

    const netWorth = (data.income?.reduce((acc, i) => acc + Number(i.amount || 0), 0) || 0) + investmentsData.total;
    const safeToSpend = survivalData.dailyLimit - survivalData.spentToday;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
            <Animated.View entering={FadeInDown.delay(100).springify()} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                {/* Top Row: Hamburger + Greeting + Action Buttons */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Pressable 
                            style={styles.menuBtn} 
                            onPress={() => { 
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); 
                                setIsDrawerOpen(true); 
                            }}
                        >
                            <Menu size={22} color="#FFF" />
                        </Pressable>
                        <View>
                            <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '500' }}>{greeting}</Text>
                            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800' }}>Reddy</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Pressable style={styles.iconBtn} onPress={() => Haptics.selectionAsync()}>
                            <Bell size={20} color="#FFF" />
                        </Pressable>
                        <Pressable
                            style={styles.iconBtn}
                            onPress={() => {
                                Haptics.selectionAsync();
                                router.push('/settings');
                            }}
                        >
                            <SettingsIcon size={20} color="#FFF" />
                        </Pressable>
                        {__DEV__ && (
                            <Pressable style={[styles.iconBtn, { width: 'auto', paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#1E1B4B' }]} onPress={() => runSeedAndReload()}>
                                <Text style={{ color: '#818CF8', fontSize: 11, fontWeight: '700' }}>Seed Data</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Bottom Row: Full-width Search Bar */}
                <Pressable 
                    style={{ backgroundColor: '#0F1015', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#1F2937' }} 
                    onPress={() => { Haptics.selectionAsync(); }}
                >
                    <Text style={{ color: '#6B7280', fontSize: 13 }}>Search transactions, accounts, goals...</Text>
                </Pressable>
            </Animated.View>

            {/* 1. Intelligent Net Worth Hero Card */}
            <View style={{ marginHorizontal: 20, backgroundColor: '#0A0C16', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#1E1B4B' }}>
                <Text style={{ color: '#818CF8', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>INTELLIGENT NET WORTH</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginTop: 8, letterSpacing: -0.5 }}>₹15,62,500</Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1E1B4B' }}>
                    <View>
                        <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '600' }}>Self Ledger</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 4 }}>₹1,50,000</Text>
                    </View>
                    <View>
                        <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '600' }}>Emergency Fund</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 4 }}>₹75,000</Text>
                    </View>
                    <View>
                        <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '600' }}>Biz Assets</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 4 }}>₹8,84,000</Text>
                    </View>
                </View>
            </View>

            {/* 2. Upcoming Payments Section */}
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Upcoming Payments</Text>
                <View style={{ backgroundColor: '#0F1015', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1F2937' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#1F2937' }}>
                        <View>
                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>SBI Home Loan EMI</Text>
                            <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 2 }}>Due in 15 days • Monthly</Text>
                        </View>
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>₹ 45,200</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14 }}>
                        <View>
                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Aarav School Term Fees</Text>
                            <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 2 }}>Due on 2026-07-20</Text>
                        </View>
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>₹ 25,000</Text>
                    </View>
                </View>
            </View>

            {/* 3. Expenses & Income Summary */}
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Expenses & Income Summary</Text>
                <View style={{ backgroundColor: '#0F1015', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1F2937' }}>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                        <View style={{ flex: 1, backgroundColor: '#06130D', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#065F46' }}>
                            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '600' }}>Monthly Inflow</Text>
                            <Text style={{ color: '#10B981', fontSize: 16, fontWeight: '800', marginTop: 4 }}>+ ₹1,50,000</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: '#180B0E', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#991B1B' }}>
                            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '600' }}>Monthly Outflow</Text>
                            <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '800', marginTop: 4 }}>- ₹46,500</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600' }}>Monthly Net Savings Rate</Text>
                        <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>75%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: '75%', backgroundColor: '#10B981', borderRadius: 3 }} />
                    </View>
                </View>
            </View>

            {/* 4. Business & CRM Summary */}
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Business & CRM Summary</Text>
                <View style={{ backgroundColor: '#0F1015', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1F2937', gap: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={{ fontSize: 18 }}>🏪</Text>
                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Kirana Retail Shop</Text>
                        </View>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600' }}>₹580 Sales Today • 2 Low Stock</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={{ fontSize: 18 }}>🏢</Text>
                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Hostel Lodging</Text>
                        </View>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600' }}>4/6 Beds Filled • Rent: ₹18,000</Text>
                    </View>
                </View>
            </View>

            <Pressable style={styles.actionFab} onPress={() => router.push('/transactions')}>
                <Plus size={28} color="#FFF" />
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090B',
    },
    scrollContent: {
        paddingTop: 80,
        paddingBottom: 160,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    menuBtn: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#18181B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF05'
    },
    headerGreeting: {
        color: '#71717A',
        fontSize: 14,
        fontWeight: '500',
    },
    headerName: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#18181B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 35,
    },
    netWorthBlock: {
        flex: 1,
    },
    heroLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 8,
    },
    heroValue: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 6,
    },
    heroChangeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    heroChangeText: {
        color: '#34D399',
        fontSize: 12,
        fontWeight: '600',
    },
    safeToSpendRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        padding: 4,
        backgroundColor: '#18181B',
        // Shadow Medium
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    ringGradient: {
        flex: 1,
        borderRadius: 56,
        padding: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringInner: {
        flex: 1,
        width: '100%',
        borderRadius: 53,
        backgroundColor: '#09090B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringLabel: {
        color: '#71717A',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    ringValue: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
    },
    ringSub: {
        color: '#71717A',
        fontSize: 8,
        fontWeight: '500',
    },
    sectionTitle: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    stackSection: {
        marginBottom: 30,
    },
    importantSection: {
        marginBottom: 22,
    },
    importantList: {
        paddingHorizontal: 20,
        gap: 8,
    },
    importantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#081226',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    importantLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    importantIcon: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginRight: 12,
    },
    importantMeta: {
        flex: 1,
    },
    importantTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    importantDesc: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 4,
    },
    importantRight: {
        marginLeft: 12,
    },
    importantBadge: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 10,
    },
    importantBadgeText: {
        color: '#0b0b0b',
        fontWeight: '800',
        fontSize: 11,
    },
    actionGroup: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        marginBottom: 8,
    },
    actionBtn: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        minWidth: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        color: '#071021',
        fontWeight: '800',
        fontSize: 13,
    },
    stackScroll: {
        paddingHorizontal: 20,
        gap: 12,
    },
    stackCard: {
        width: 240,
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
    },
    stackIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stackTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    stackDesc: {
        color: '#71717A',
        fontSize: 12,
    },
    hubsSection: {
        paddingHorizontal: 0,
    },
    hubsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 14,
        justifyContent: 'space-between',
        gap: 8,
    },
    hubCard: {
        width: '48%',
        padding: 16,
        backgroundColor: '#0f1720',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 0,
        height: 150,
        justifyContent: 'flex-end',
    },
    hubIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 16,
        left: 16,
    },
    searchBar: {
        marginTop: 12,
        backgroundColor: '#0B1220',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        width: Math.min(width - 160, 260),
    },
    searchText: {
        color: '#8b9096',
        fontSize: 13,
    },
    headerLeft: {
        flex: 1,
    },
    /* New hero card styles */
    heroCard: {
        borderRadius: 16,
        padding: 18,
        marginHorizontal: 20,
        backgroundColor: '#071023',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 10,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroBottomRow: {
        marginTop: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heroQuick: {
        flex: 1,
        marginRight: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#071427',
        borderRadius: 10,
        alignItems: 'flex-start',
    },
    heroQuickTitle: {
        color: '#8b9096',
        fontSize: 12,
        fontWeight: '700',
    },
    heroQuickSub: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        marginTop: 6,
    },
    /* Hub card elevation tweaks */
    hubCard: {
        width: '48%',
        padding: 16,
        backgroundColor: '#071427',
        borderRadius: 14,
        marginBottom: 12,
        borderWidth: 0,
        height: 150,
        justifyContent: 'flex-end',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 8,
    },
    /* Premium hero styles */
    premiumHeroWrap: {
        paddingHorizontal: 20,
        marginBottom: 18,
    },
    premiumHeroCard: {
        borderRadius: 16,
        padding: 18,
        backgroundColor: '#071427',
    },
    premiumTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    premiumLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    premiumValue: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
        marginTop: 6,
    },
    premiumMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    premiumChange: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#052e1f',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 12,
    },
    premiumChangeText: {
        color: '#34D399',
        marginLeft: 6,
        fontWeight: '800',
    },
    premiumSmall: {
        color: '#8b9096',
        fontSize: 12,
        marginLeft: 8,
    },
    safeToSpendChip: {
        backgroundColor: '#081829',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'flex-end',
    },
    chipTitle: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '700',
    },
    chipValue: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        marginTop: 6,
    },
    sparklineRow: {
        marginTop: 18,
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 36,
        paddingHorizontal: 6,
    },
    sparkBar: {
        width: 8,
        backgroundColor: '#4F46E5',
        borderRadius: 4,
        marginRight: 6,
    },
    premiumChipsRow: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    premiumChip: {
        flex: 1,
        marginRight: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: 'transparent',
        borderRadius: 10,
    },
    premiumChipTitle: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '700',
    },
    premiumChipVal: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
        marginTop: 6,
    },
    /* Premium - best digital hero tweaks */
    premiumHeroBorder: {
        borderRadius: 18,
        padding: 1,
        marginHorizontal: 18,
        backgroundColor: 'transparent',
    },
    premiumHeroInner: {
        borderRadius: 16,
        padding: 22,
        backgroundColor: 'rgba(3,7,12,0.55)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)'
    },
    premiumCenter: {
        alignItems: 'center',
    },
    premiumValueBest: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '900',
        marginTop: 8,
        textShadowColor: 'rgba(79,70,229,0.18)',
        textShadowOffset: { width: 0, height: 8 },
        textShadowRadius: 28,
    },
    premiumTagline: {
        color: '#9CA3AF',
        marginTop: 8,
        fontSize: 12,
        textAlign: 'center'
    },
    premiumRight: {
        position: 'absolute',
        right: 24,
        top: 24,
    },
    sparklineRowPremium: {
        marginTop: 18,
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 44,
        paddingHorizontal: 10,
        justifyContent: 'center'
    },
    sparkBarPremium: {
        width: 6,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    hubsList: {
        paddingHorizontal: 12,
        gap: 8,
    },
    hubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#071427',
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
    },
    rowIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowContent: {
        flex: 1,
    },
    rowTitle: {
        color: '#9CA3AF',
        fontSize: 13,
        fontWeight: '700',
    },
    rowValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    rowSub: {
        color: '#8b9096',
        fontSize: 12,
        marginTop: 6,
    },
    rowProgress: {
        height: 6,
        backgroundColor: '#0b1620',
        borderRadius: 6,
        marginTop: 10,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 6,
    },
    hubContent: {
        marginTop: 40,
    },
    hubTitle: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    hubValue: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
    hubSub: {
        color: '#71717A',
        fontSize: 10,
    },
    actionFab: {
        position: 'absolute',
        right: 20,
        bottom: 110,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow Large
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
    }
});