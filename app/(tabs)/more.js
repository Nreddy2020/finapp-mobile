import React from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
    Wallet, Calendar, Bell, Building2, Users, Repeat, DollarSign,
    Home, Gem, TrendingUp, Plane, Clock, FileText,
    CheckSquare, Users as UsersIcon, BarChart3, Sparkles, Shield, Brain,
    LayoutGrid, ChevronRight, Target, Building, PieChart, Settings, Music, Pill, Calculator, Eye, Globe, MessageSquare
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useGlobalFinance } from '../../components/context/GlobalFinanceContext';
import { AuthService } from '../../services/auth';

const { width } = Dimensions.get('window');

export default function MoreScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { currency, currencyCode, toggleCurrency, privacyMode, setPrivacyMode } = useGlobalFinance();

    const modules = [
        {
            category: 'Quick Access',
            items: [
                { name: 'Expenses', route: '/transactions', icon: Wallet, color: '#EF4444' },
                { name: 'Income', route: '/income', icon: TrendingUp, color: '#10B981' },
                { name: 'Income Tracker', route: '/income-calendar', icon: Calendar, color: '#10B981' },
                { name: 'Budgets', route: '/budgets', icon: PieChart, color: '#F59E0B' },
                { name: 'Financial Health', route: '/financial-health', icon: Brain, color: '#10B981' },
            ]
        },
        {
            category: 'Finance Management',
            items: [
                { name: 'Bank Accounts', route: '/accounts', icon: Building2, color: '#4F46E5' },
                { name: 'Cash Books', route: '/cashbooks', icon: DollarSign, color: '#F59E0B' },
                { name: 'Loans', route: '/loans', icon: Wallet, color: '#8B5CF6' },
                { name: 'EMIs', route: '/emis', icon: Calendar, color: '#A855F7' },
                { name: 'Bill Reminders', route: '/bills', icon: Bell, color: '#F59E0B' },
                { name: 'Recurring', route: '/recurring', icon: Repeat, color: '#8B5CF6' },
                { name: 'Group Expenses', route: '/group-expenses', icon: Users, color: '#EC4899' },
                { name: 'Community Savings', route: '/community-savings', icon: Users, color: '#4F46E5' },
                { name: 'Pending Payments', route: '/pending-tracker', icon: TrendingUp, color: '#F59E0B' },
                { name: 'Refinance Calculator', route: '/debt-calculator', icon: Calculator, color: '#F59E0B' },
            ]
        },
        {
            category: 'Assets & Wealth',
            items: [
                { name: 'Properties', route: '/properties', icon: Home, color: '#8B5CF6' },
                { name: 'Property & Assets', route: '/property-assets', icon: Home, color: '#8B5CF6' },
                { name: 'Assets', route: '/assets', icon: Gem, color: '#14B8A6' },
                { name: 'Investments', route: '/investments', icon: TrendingUp, color: '#10B981' },
            ]
        },
        {
            category: 'Life & Planning',
            items: [
                { name: 'Gamification Zone', route: '/gamification', icon: Target, color: '#F59E0B' },
                { name: 'Emergency Fund', route: '/emergency', icon: Shield, color: '#EF4444' },
                { name: 'Travel Plans', route: '/travel', icon: Plane, color: '#3B82F6' },
                { name: 'Apartment & Hostel', route: '/apartment', icon: Building, color: '#EC4899' },
                { name: 'Hostel Management', route: '/hostel', icon: Home, color: '#8B5CF6' },
                { name: 'Validity Tracker', route: '/validity', icon: Clock, color: '#F59E0B' },
                { name: 'Tax Reminders', route: '/tax', icon: FileText, color: '#EF4444' },
                { name: 'Family Tree', route: '/family', icon: UsersIcon, color: '#EC4899' },
                { name: 'Education Hub', route: '/education-hub', icon: FileText, color: '#EC4899' },
                { name: 'Financial Literacy', route: '/financial-literacy', icon: Brain, color: '#3B82F6' },
                { name: 'Raise Funds', route: '/crowdfunding', icon: Users, color: '#E11D48' },
                { name: 'Fee Planner', route: '/fee-planner', icon: Calendar, color: '#F59E0B' },
                { name: 'Career Growth', route: '/career-growth', icon: TrendingUp, color: '#10B981' },
            ]
        },
        {
            category: 'Goals & Productivity',
            items: [
                { name: 'Savings Goals', route: '/savings-goals', icon: Target, color: '#EC4899' },
                { name: 'Time Management', route: '/time-management', icon: Clock, color: '#3B82F6' },
                { name: 'Todo List', route: '/todos', icon: CheckSquare, color: '#8B5CF6' },
                { name: 'Career Goals', route: '/career', icon: Target, color: '#4F46E5' },
            ]
        },
        {
            category: 'Analytics & Verification',
            items: [
                { name: 'In-App Testing Hub', route: '/(tabs)/testing', icon: ShieldCheck, color: '#10B981' },
                { name: 'Insights', route: '/insights', icon: Sparkles, color: '#4F46E5' },
                { name: 'Reports', route: '/reports', icon: BarChart3, color: '#52525B' },
            ]
        },
        {
            category: 'Health & Wellness',
            items: [
                { name: 'Medicine Tracker', route: '/medicine-tracker', icon: Pill, color: '#EC4899' },
                { name: 'Health Stats', route: '/health-stats', icon: TrendingUp, color: '#10B981' },
                { name: 'Gratitude Log', route: '/gratitude-log', icon: Sparkles, color: '#10B981' },
                { name: 'Affirmations', route: '/affirmations', icon: Brain, color: '#8B5CF6' },
                { name: 'Rewire Mindset', route: '/affirmations', icon: Brain, color: '#A855F7' },
            ]
        },
        {
            category: 'Lifestyle',
            items: [
                { name: 'Music Library', route: '/music', icon: Music, color: '#EC4899' },
                { name: 'Fitness', route: '/fitness', icon: TrendingUp, color: '#10B981' },
            ]
        },
        {
            category: 'System & Preferences',
            items: [
                {
                    name: `Currency: ${currency.name} (${currencyCode})`,
                    icon: DollarSign,
                    color: '#10B981',
                    action: toggleCurrency,
                    value: currency.symbol
                },
                {
                    name: `Privacy Mode: ${privacyMode ? 'On' : 'Off'}`,
                    icon: Shield,
                    color: '#6366F1',
                    action: () => setPrivacyMode(!privacyMode),
                    value: privacyMode ? 'Show' : 'Hide'
                },
                { name: 'Inflation Dashboard', route: '/inflation-dashboard', icon: TrendingUp, color: '#F59E0B' },
                { name: 'Language', route: '/localization', icon: Globe, color: '#10B981' },
                { name: 'Feedback', route: '/feedback', icon: MessageSquare, color: '#F43F5E' },
                { name: 'Accessibility', route: '/accessibility', icon: Eye, color: '#3B82F6' },
                { name: 'App Settings', route: '/settings', icon: LayoutGrid, color: '#71717A' },
                { name: 'Data & Privacy', route: '/settings/privacy', icon: Shield, color: '#10B981' },
                {
                    name: 'Logout Securely',
                    icon: Shield,
                    color: '#EF4444',
                    action: async () => {
                        await AuthService.logout();
                        router.replace('/login');
                    },
                    value: 'Exit'
                }
            ]
        }
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="#000000" />
            <LinearGradient colors={['#000000', '#09090B']} style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 40) + 10, paddingBottom: insets.bottom + 120 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerLabel}>ENTIRE ECOSYSTEM</Text>
                            <Text style={styles.title}>All Modules</Text>
                        </View>
                        <View style={styles.iconCircle}>
                            <LayoutGrid size={24} color="#FFFFFF" strokeWidth={2} />
                        </View>
                    </View>

                    {/* Module Categories */}
                    {modules.map((section, sectionIndex) => (
                        <View key={sectionIndex} style={styles.categorySection}>
                            <Text style={styles.categoryHeader}>{section.category.toUpperCase()}</Text>

                            <View style={styles.moduleList}>
                                {section.items.map((module, index) => {
                                    const Icon = module.icon;
                                    const isLast = index === section.items.length - 1;

                                    return (
                                        <Pressable
                                            key={index}
                                            style={({ pressed }) => [
                                                styles.listItem,
                                                !isLast && styles.listItemBorder,
                                                pressed && styles.listItemPressed
                                            ]}
                                            onPress={() => module.action ? module.action() : router.push(module.route)}
                                        >
                                            <View style={[styles.listIcon, { backgroundColor: module.color + '10' }]}>
                                                <Icon size={20} color={module.color} strokeWidth={2.5} />
                                            </View>
                                            <Text style={styles.listText}>{module.name}</Text>
                                            {module.value ? (
                                                <Text style={{ color: '#52525B', fontSize: 13, fontWeight: '600' }}>{module.value}</Text>
                                            ) : (
                                                <ChevronRight size={20} color="#52525B" strokeWidth={2} />
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    headerLabel: { fontSize: 11, color: '#71717A', fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
    title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#18181B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272A' },

    // Category Section
    categorySection: { marginBottom: 32 },
    categoryHeader: { fontSize: 11, fontWeight: '700', color: '#71717A', letterSpacing: 1.5, marginBottom: 12, paddingHorizontal: 4 },

    // Module List
    moduleList: { backgroundColor: '#0a0a0a', borderRadius: 16, borderWidth: 1, borderColor: '#18181B', overflow: 'hidden' },
    listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    listItemBorder: { borderBottomWidth: 1, borderBottomColor: '#18181B' },
    listItemPressed: { backgroundColor: '#18181B' },
    listIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    listText: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
