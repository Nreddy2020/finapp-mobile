import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Pressable, Alert, Share, Modal, TextInput, Dimensions, Image, TouchableOpacity } from 'react-native';
// import * as ImagePicker from 'expo-image-picker'; // Commented out - package not installed
import {
    TrendingDown, Plus, Calendar, Sparkles, Share2, Repeat, X,
    ShoppingBag, Utensils, Home, Car, Heart, Zap, Smartphone,
    Plane, GraduationCap, Gift, Wallet, CreditCard, Banknote, Filter, Search, Camera, Image as ImageIcon, Trash2, PieChart, HelpCircle, Gauge, TrendingUp as TrendingUpIcon, Mic, MapPin, Scan
} from 'lucide-react-native';
import { TransactionsService } from '../../services/transactions';
import { getTransactions } from '../../services/api';
import { useGlobalFinance } from '../../components/context/GlobalFinanceContext';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';

import { saveData, loadData, STORAGE_KEYS } from '../../services/storage';
// Local Audit/Risk/Idempotency services removed in favor of Backend Implementation

const { width } = Dimensions.get('window');

// Category configuration with icons and colors
const CATEGORIES = {
    'Food & Dining': { icon: Utensils, color: '#F59E0B' },
    'Shopping': { icon: ShoppingBag, color: '#EC4899' },
    'Transportation': { icon: Car, color: '#3B82F6' },
    'Housing': { icon: Home, color: '#8B5CF6' },
    'Healthcare': { icon: Heart, color: '#EF4444' },
    'Utilities': { icon: Zap, color: '#10B981' },
    'Entertainment': { icon: Smartphone, color: '#6366F1' },
    'Travel': { icon: Plane, color: '#14B8A6' },
    'Education': { icon: GraduationCap, color: '#F97316' },
    'Gifts': { icon: Gift, color: '#EC4899' },
    'Other': { icon: Wallet, color: '#71717A' },
};

// Payment method configuration
const PAYMENT_METHODS = {
    'Cash': { icon: Banknote, color: '#10B981' },
    'Card': { icon: CreditCard, color: '#3B82F6' },
    'UPI': { icon: Smartphone, color: '#8B5CF6' },
    'Wallet': { icon: Wallet, color: '#BE185D' },
};

// Mock Merchants for Autocomplete
const MERCHANTS = [
    'Starbucks', 'Uber', 'Zomato', 'Swiggy', 'Amazon', 'Flipkart', 'Netflix', 'Spotify',
    'Apple', 'Google', 'Shell', 'Indian Oil', 'Reliance Fresh', 'BigBasket', 'Blinkit',
    'Zepto', 'PharmEasy', 'Apollo Pharmacy', 'Decathlon', 'H&M', 'Zara', 'Uniqlo',
    'KFC', 'Burger King', 'Subway', 'Domino\'s', 'Pizza Hut'
];

// Smart Categorization Map
const MERCHANT_CATEGORY_MAP = {
    'Starbucks': 'Food & Dining', 'Uber': 'Transportation', 'Zomato': 'Food & Dining',
    'Swiggy': 'Food & Dining', 'Netflix': 'Entertainment', 'Spotify': 'Entertainment',
    'Shell': 'Transportation', 'Indian Oil': 'Transportation', 'Reliance Fresh': 'Shopping',
    'BigBasket': 'Shopping', 'Blinkit': 'Shopping', 'Zepto': 'Shopping',
    'PharmEasy': 'Healthcare', 'Apollo Pharmacy': 'Healthcare', 'PVR Cinemas': 'Entertainment',
    'BookMyShow': 'Entertainment', 'Ola': 'Transportation', 'Rapido': 'Transportation',
    'McDonald\'s': 'Food & Dining', 'KFC': 'Food & Dining', 'Burger King': 'Food & Dining',
    'Subway': 'Food & Dining', 'Domino\'s': 'Food & Dining', 'Pizza Hut': 'Food & Dining',
    'Decathlon': 'Shopping', 'H&M': 'Shopping', 'Zara': 'Shopping', 'Uniqlo': 'Shopping'
};

// Auto-Recurring Keywords
const SUBSCRIPTION_KEYWORDS = ['Netflix', 'Spotify', 'Prime', 'Hotstar', 'Gym', 'Rent', 'Wifi', 'Internet', 'Broadband'];

// Default Budgets (Monthly)
const DEFAULT_BUDGETS = {
    global: 20000,
    categories: {
        'Food & Dining': 6000,
        'Shopping': 5000,
        'Transportation': 3000,
        'Entertainment': 2000,
        'Utilities': 3000,
        'Other': 1000
    }
};

export default function TransactionsScreen() {
    const { formatAmount, currency, inflationRate } = useGlobalFinance();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInflationAdjusted, setShowInflationAdjusted] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Budget State
    const [budgets, setBudgets] = useState(DEFAULT_BUDGETS);

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [amountRange, setAmountRange] = useState({ min: '', max: '' });

    // Add Expense Form States
    const [newExpense, setNewExpense] = useState({
        amount: '',
        description: '',
        category: 'Food',
        paymentMethod: 'UPI',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        receiptImage: null,
        customCategory: '',
        customPaymentMethod: '',
        isRecurring: false
    });
    const [showCustomCategory, setShowCustomCategory] = useState(false);
    const [showCustomPayment, setShowCustomPayment] = useState(false);
    const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
    const [merchantSuggestions, setMerchantSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [isVoiceListening, setIsVoiceListening] = useState(false); // Simulated Voice State

    // World-Class AI: Auto-Categorization Logic
    const predictCategory = (text) => {
        const lowerText = text.toLowerCase();
        for (const [merchant, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
            if (lowerText.includes(merchant.toLowerCase())) return category;
        }
        if (lowerText.includes('coffee') || lowerText.includes('food')) return 'Food & Dining';
        if (lowerText.includes('uber') || lowerText.includes('taxi')) return 'Transportation';
        return 'Other';
    };

    // Simulated Voice Input Handler
    const handleVoiceInput = () => {
        setIsVoiceListening(true);
        setTimeout(() => {
            setIsVoiceListening(false);
            const mockVoiceText = "Lunch at McDonald's for 350";
            // Simple NLP Parser
            const amountMatch = mockVoiceText.match(/\d+/);
            const amount = amountMatch ? amountMatch[0] : '';
            const description = mockVoiceText.replace(/\d+/, '').replace('for', '').trim();

            setNewExpense(prev => ({
                ...prev,
                amount: amount,
                description: description,
                category: predictCategory(description)
            }));
            setShowAddModal(true);
            Alert.alert("🎙️ AI Voice Parsed", `"${mockVoiceText}"\n\nAuto-filled: ₹${amount} | ${description}`);
        }, 2000);
    };

    const fetchExpenses = async () => {
        try {
            const data = await getTransactions();
            const localData = await loadData(STORAGE_KEYS.TRANSACTIONS, []);
            const sourceData = (Array.isArray(data) && data.length > 0) ? data : (localData.length > 0 ? localData : []);

            const enhancedData = sourceData.map(item => ({
                id: item.transaction_id || item.id,
                amount: item.amount,
                description: item.description || item.category || 'Expense',
                category: item.category || 'Other',
                paymentMethod: item.paymentMethod || 'Card',
                date: item.date || (item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                isRecurring: item.isRecurring || false
            }));

            setExpenses(enhancedData);
            if (enhancedData.length > 0) {
                await saveData(STORAGE_KEYS.TRANSACTIONS, enhancedData);
            }

        } catch (error) {
            console.error('Error fetching expenses:', error);
            const localData = await loadData(STORAGE_KEYS.TRANSACTIONS, []);
            if (localData && localData.length > 0) {
                setExpenses(localData);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchExpenses();
    };

    // Group expenses by date
    const groupExpensesByDate = (expenses) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups = {
            'Today': [],
            'Yesterday': [],
            'This Week': [],
            'Earlier': []
        };

        expenses.forEach(expense => {
            const expenseDate = new Date(expense.date);
            const daysDiff = Math.floor((today - expenseDate) / (1000 * 60 * 60 * 24));

            if (daysDiff === 0) {
                groups['Today'].push(expense);
            } else if (daysDiff === 1) {
                groups['Yesterday'].push(expense);
            } else if (daysDiff <= 7) {
                groups['This Week'].push(expense);
            } else {
                groups['Earlier'].push(expense);
            }
        });

        return groups;
    };

    // Filter expenses
    const getFilteredExpenses = () => {
        let filtered = [...expenses];

        if (selectedCategory) {
            filtered = filtered.filter(e => e.category === selectedCategory);
        }

        if (selectedPaymentMethod) {
            filtered = filtered.filter(e => e.paymentMethod === selectedPaymentMethod);
        }

        if (searchQuery) {
            filtered = filtered.filter(e =>
                e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.category?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Date range filter
        if (dateRange.start) {
            filtered = filtered.filter(e => e.date >= dateRange.start);
        }
        if (dateRange.end) {
            filtered = filtered.filter(e => e.date <= dateRange.end);
        }

        // Amount range filter
        if (amountRange.min) {
            filtered = filtered.filter(e => parseFloat(e.amount) >= parseFloat(amountRange.min));
        }
        if (amountRange.max) {
            filtered = filtered.filter(e => parseFloat(e.amount) <= parseFloat(amountRange.max));
        }

        return filtered;
    };

    const handleShare = async () => {
        try {
            // Calculate summary
            const total = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            const date = new Date().toLocaleDateString();

            Alert.alert(
                'Export Options',
                'Choose how you want to share your expenses',
                [
                    {
                        text: 'Summary Report',
                        onPress: async () => {
                            let message = `📊 *Expense Report - ${date}*\n\n`;
                            message += `Total Spent: ${formatAmount(total)}\n\n`;
                            message += `*Top Transactions:*\n`;

                            expenses.slice(0, 5).forEach((item, index) => {
                                message += `${index + 1}. ${item.description}: ${formatAmount(item.amount)} (${item.category})\n`;
                            });

                            if (expenses.length > 5) {
                                message += `\n...and ${expenses.length - 5} more transactions.\n`;
                            }
                            message += `\nSent via FinTech App 🚀`;
                            await Share.share({ message, title: 'Monthly Expense Report' });
                        }
                    },
                    {
                        text: 'Export JSON Data',
                        onPress: async () => {
                            const jsonData = JSON.stringify(expenses, null, 2);
                            // In a real app, we would write to file here. For now, we share the raw JSON string
                            // or a simplified version if it's too long.
                            await Share.share({
                                message: jsonData,
                                title: `Expenses_Export_${date}.json`
                            });
                        }
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const handleSaveExpense = async () => {
        if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount');
            return;
        }

        try {
            // Call Secure Backend (Idempotency & Fraud checks handled automatically)
            const result = await TransactionsService.create(
                parseFloat(newExpense.amount),
                newExpense.category
            );

            // On success, backend returns the created transaction
            Alert.alert('Success', 'Transaction processed securely!');

            // Refresh list
            onRefresh();

            // Reset Form (Logic from original)
            if (saveAndAddAnother) {
                setNewExpense({
                    amount: '',
                    description: '',
                    category: 'Food & Dining',
                    paymentMethod: 'Card',
                    date: new Date().toISOString().split('T')[0],
                    notes: '',
                    receiptImage: null,
                    customCategory: '',
                    customPaymentMethod: '',
                    isRecurring: false
                });
                setShowCustomCategory(false);
                setShowCustomPayment(false);
            } else {
                setShowAddModal(false);
                setNewExpense({
                    amount: '',
                    description: '',
                    category: 'Food & Dining',
                    paymentMethod: 'Card',
                    date: new Date().toISOString().split('T')[0],
                    notes: '',
                    receiptImage: null,
                    customCategory: '',
                    customPaymentMethod: '',
                    isRecurring: false
                });
                setShowCustomCategory(false);
                setShowCustomPayment(false);
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Transaction Failed', error.message || 'Unknown error occurred');
        }
    };

    const handleDeleteExpense = async (expenseId) => {
        Alert.alert(
            'Delete Expense',
            'Are you sure you want to delete this expense?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const updated = expenses.filter(e => e.id !== expenseId);
                        setExpenses(updated);
                        await saveData(STORAGE_KEYS.TRANSACTIONS, updated);
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        // Placeholder - expo-image-picker not installed
        Alert.alert('Image Picker', 'Install expo-image-picker package to enable this feature:\n\nnpx expo install expo-image-picker');
        /* Original code:
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera roll permissions to upload receipts');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setNewExpense({ ...newExpense, receiptImage: result.assets[0].uri });
        }
        */
    };

    const takePhoto = async () => {
        // Placeholder - expo-image-picker not installed
        Alert.alert('Camera', 'Install expo-image-picker package to enable this feature:\n\nnpx expo install expo-image-picker');
        /* Original code:
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera permissions to take photos');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setNewExpense({ ...newExpense, receiptImage: result.assets[0].uri });
        }
        */
    };

    const removeReceipt = () => {
        setNewExpense({ ...newExpense, receiptImage: null });
    };

    const filteredExpenses = getFilteredExpenses();
    const groupedExpenses = groupExpensesByDate(filteredExpenses);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const activeFiltersCount = [selectedCategory, selectedPaymentMethod, searchQuery].filter(Boolean).length;

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EF4444" colors={['#EF4444']} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <StackHeader title="Expenses" subtitle="Spending">
                    <Pressable style={styles.iconButton} onPress={() => setShowFilters(true)}>
                        <Filter size={20} color="#FFFFFF" />
                        {(selectedCategory || selectedPaymentMethod || dateRange.start || amountRange.min) && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>!</Text>
                            </View>
                        )}
                    </Pressable>
                    <Pressable style={[styles.iconButton, { marginLeft: 10 }]} onPress={() => setShowAnalyticsModal(true)}>
                        <PieChart size={20} color="#FFFFFF" />
                    </Pressable>
                    <Pressable style={styles.iconButton} onPress={handleShare}>
                        <Share2 size={20} color="#FFFFFF" strokeWidth={2.5} />
                    </Pressable>
                </StackHeader>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Search size={18} color="#71717A" strokeWidth={2.5} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search expenses..."
                        placeholderTextColor="#52525B"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <X size={18} color="#71717A" />
                        </Pressable>
                    )}
                </View>

                {/* World-Class AI Actions Row */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 16, gap: 12 }}>
                    <TouchableOpacity
                        style={[styles.aiButton, { flex: 1, backgroundColor: isVoiceListening ? '#EF4444' : '#27272A' }]}
                        onPress={handleVoiceInput}
                    >
                        {isVoiceListening ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Mic size={16} color="#FFF" />
                                <Text style={styles.aiButtonText}>Listening...</Text>
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Mic size={16} color="#A1A1AA" />
                                <Text style={styles.aiButtonText}>Voice Entry</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.aiButton, { flex: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Scan size={16} color="#A1A1AA" />
                            <Text style={styles.aiButtonText}>Scan Bill</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Spending Velocity Speedometer (New World Class Feature) */}
                {(() => {
                    const today = new Date();
                    const hoursElapsed = today.getHours() + (today.getMinutes() / 60) || 1;
                    const todaysExpenses = expenses.filter(e => {
                        const d = new Date(e.date);
                        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                    }).reduce((sum, e) => sum + parseFloat(e.amount), 0);

                    const velocity = todaysExpenses / hoursElapsed; // Rs per hour
                    const safeLimit = 500; // Mock safe limit per hour
                    const isHigh = velocity > safeLimit;

                    return (
                        <View style={{ marginHorizontal: 24, marginBottom: 16, flexDirection: 'row', gap: 12 }}>
                            {/* Velocity Gauge */}
                            <LuxuryCard style={{ flex: 1, backgroundColor: '#18181B', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: isHigh ? '#EF444450' : '#10B98150' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Gauge size={16} color={isHigh ? '#EF4444' : '#10B981'} />
                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Spending Velocity</Text>
                                </View>
                                <Text style={{ fontSize: 22, fontWeight: '900', color: isHigh ? '#EF4444' : '#10B981' }}>
                                    {formatAmount(velocity, 0)}<Text style={{ fontSize: 13, color: '#71717A', fontWeight: '600' }}> /hr</Text>
                                </Text>
                                <View style={{ height: 4, backgroundColor: '#27272A', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
                                    <View style={{ width: `${Math.min((velocity / (safeLimit * 2)) * 100, 100)}%`, height: '100%', backgroundColor: isHigh ? '#EF4444' : '#10B981' }} />
                                </View>
                            </LuxuryCard>

                            {/* Inflation Toggle */}
                            <LuxuryCard
                                style={{ flex: 1, backgroundColor: showInflationAdjusted ? '#F59E0B10' : '#18181B', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: showInflationAdjusted ? '#F59E0B' : '#FFFFFF08' }}
                                onPress={() => setShowInflationAdjusted(!showInflationAdjusted)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <TrendingUpIcon size={16} color={showInflationAdjusted ? '#F59E0B' : '#71717A'} />
                                    <Text style={{ color: showInflationAdjusted ? '#F59E0B' : '#A1A1AA', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Inflation View</Text>
                                </View>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>
                                    {showInflationAdjusted ? 'Future Cost' : 'Actual Cost'}
                                </Text>
                                <Text style={{ fontSize: 10, color: '#71717A', marginTop: 4 }}>
                                    {showInflationAdjusted ? `Adjusted for +${inflationRate}%` : 'Tap to see Future Value'}
                                </Text>
                            </LuxuryCard>
                        </View>
                    );
                })()}

                {/* Total Card */}
                <View style={styles.totalCardWrapper}>
                    <View style={styles.totalCard}>
                        <View style={styles.totalGlow} />
                        <View style={styles.totalContent}>
                            <Text style={styles.totalLabel}>Total Expenses</Text>
                            <Text style={styles.totalAmount}>{formatAmount(totalExpenses)}</Text>
                            <View style={styles.totalFooter}>
                                <Calendar size={14} color="#FFFFFF60" strokeWidth={2.5} />
                                <Text style={styles.totalSubtext}>{filteredExpenses.length} transactions</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Grouped Expenses List */}
                {filteredExpenses.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Sparkles size={48} color="#27272A" strokeWidth={2} />
                        <Text style={styles.emptyText}>No expenses found</Text>
                        <Text style={styles.emptySubtext}>
                            {activeFiltersCount > 0 ? 'Try adjusting your filters' : 'Your transactions will appear here'}
                        </Text>
                    </View>
                ) : (
                    Object.entries(groupedExpenses).map(([group, groupExpenses]) => {
                        if (groupExpenses.length === 0) return null;

                        return (
                            <View key={group} style={styles.section}>
                                <Text style={styles.sectionTitle}>{group}</Text>
                                {groupExpenses.map((item, index) => {
                                    const CategoryIcon = CATEGORIES[item.category]?.icon || Wallet;
                                    const categoryColor = CATEGORIES[item.category]?.color || '#71717A';
                                    const PaymentIcon = PAYMENT_METHODS[item.paymentMethod]?.icon || CreditCard;

                                    return (
                                        <Pressable
                                            key={index}
                                            style={styles.expenseCard}
                                            onPress={() => {
                                                setNewExpense({
                                                    id: item.id,
                                                    amount: item.amount.toString(),
                                                    description: item.description,
                                                    category: item.category,
                                                    paymentMethod: item.paymentMethod,
                                                    date: item.date,
                                                    notes: item.notes || '',
                                                    receiptImage: item.receiptImage || null,
                                                    isRecurring: item.isRecurring || false,
                                                    customCategory: '', // Reset custom fields
                                                    customPaymentMethod: ''
                                                });
                                                setShowAddModal(true);
                                            }}
                                        >
                                            <View style={[styles.expenseIcon, { backgroundColor: categoryColor + '15', borderColor: categoryColor + '30' }]}>
                                                <CategoryIcon size={22} color={categoryColor} strokeWidth={2.5} />
                                            </View>
                                            <View style={styles.expenseContent}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={styles.expenseName}>{item.description}</Text>
                                                    {item.isRecurring && (
                                                        <View style={styles.recurringBadge}>
                                                            <Repeat size={10} color="#EF4444" />
                                                        </View>
                                                    )}
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Text style={styles.expenseCategory}>{item.category}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <PaymentIcon size={12} color="#52525B" strokeWidth={2} />
                                                        <Text style={styles.expensePayment}>{item.paymentMethod}</Text>
                                                    </View>
                                                </View>
                                            </View>

                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={styles.expenseAmount}>-{formatAmount(item.amount)}</Text>
                                                {showInflationAdjusted && (
                                                    <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>
                                                        ≈ {formatAmount(item.amount * Math.pow(1 + (inflationRate / 100), 10))} (10y)
                                                    </Text>
                                                )}
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        );
                    })
                )}

                {/* FAB - Floating Action Button */}
                <Pressable style={styles.fab} onPress={() => {
                    setNewExpense({
                        id: null,
                        amount: '',
                        description: '',
                        category: 'Food & Dining',
                        paymentMethod: 'Card',
                        date: new Date().toISOString().split('T')[0],
                        notes: '',
                        receiptImage: null,
                        customCategory: '',
                        customPaymentMethod: '',
                        isRecurring: false
                    });
                    setShowAddModal(true);
                }}>
                    <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
            </ScrollView >

            {/* Filter Modal */}
            < Modal
                visible={showFilters}
                transparent
                animationType="slide"
                onRequestClose={() => setShowFilters(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filters</Text>
                            <Pressable onPress={() => setShowFilters(false)}>
                                <X size={24} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        {/* Category Filter */}
                        <Text style={styles.filterLabel}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                            <Pressable
                                style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
                                onPress={() => setSelectedCategory(null)}
                            >
                                <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>All</Text>
                            </Pressable>
                            {Object.keys(CATEGORIES).map(cat => (
                                <Pressable
                                    key={cat}
                                    style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* Payment Method Filter */}
                        <Text style={styles.filterLabel}>Payment Method</Text>
                        <View style={styles.paymentGrid}>
                            <Pressable
                                style={[styles.paymentChip, !selectedPaymentMethod && styles.paymentChipActive]}
                                onPress={() => setSelectedPaymentMethod(null)}
                            >
                                <Text style={[styles.paymentChipText, !selectedPaymentMethod && styles.paymentChipTextActive]}>All</Text>
                            </Pressable>
                            {Object.entries(PAYMENT_METHODS).map(([method, config]) => {
                                const Icon = config.icon;
                                return (
                                    <Pressable
                                        key={method}
                                        style={[styles.paymentChip, selectedPaymentMethod === method && styles.paymentChipActive]}
                                        onPress={() => setSelectedPaymentMethod(method)}
                                    >
                                        <Icon size={16} color={selectedPaymentMethod === method ? '#FFFFFF' : '#71717A'} />
                                        <Text style={[styles.paymentChipText, selectedPaymentMethod === method && styles.paymentChipTextActive]}>{method}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Date Range Filter */}
                        <Text style={styles.filterLabel}>Date Range</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                            <TextInput
                                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                                placeholder="Start (YYYY-MM-DD)"
                                placeholderTextColor="#52525B"
                                value={dateRange.start}
                                onChangeText={(text) => setDateRange({ ...dateRange, start: text })}
                            />
                            <TextInput
                                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                                placeholder="End (YYYY-MM-DD)"
                                placeholderTextColor="#52525B"
                                value={dateRange.end}
                                onChangeText={(text) => setDateRange({ ...dateRange, end: text })}
                            />
                        </View>

                        {/* Amount Range Filter */}
                        <Text style={styles.filterLabel}>Amount Range ({currency.symbol})</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                            <TextInput
                                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                                placeholder="Min"
                                placeholderTextColor="#52525B"
                                keyboardType="numeric"
                                value={amountRange.min}
                                onChangeText={(text) => setAmountRange({ ...amountRange, min: text })}
                            />
                            <TextInput
                                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                                placeholder="Max"
                                placeholderTextColor="#52525B"
                                keyboardType="numeric"
                                value={amountRange.max}
                                onChangeText={(text) => setAmountRange({ ...amountRange, max: text })}
                            />
                        </View>

                        {/* Clear Filters */}
                        <Pressable
                            style={styles.clearButton}
                            onPress={() => {
                                setSelectedCategory(null);
                                setSelectedPaymentMethod(null);
                                setSearchQuery('');
                                setDateRange({ start: '', end: '' });
                                setAmountRange({ min: '', max: '' });
                                setShowFilters(false);
                            }}
                        >
                            <Text style={styles.clearButtonText}>Clear All Filters</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal >

            {/* Analytics Modal */}
            < Modal
                visible={showAnalyticsModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAnalyticsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Spending Insights</Text>
                            <Pressable onPress={() => setShowAnalyticsModal(false)}>
                                <X size={24} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Analytics Calculations */}
                            {(() => {
                                const today = new Date();
                                const currentMonth = today.getMonth();
                                const currentYear = today.getFullYear();
                                const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                                const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

                                let currentMonthTotal = 0;
                                let lastMonthTotal = 0;
                                const merchantTotals = {};
                                const categoryTotals = {};

                                expenses.forEach(expense => {
                                    const date = new Date(expense.date);
                                    const rawAmount = expense.amount ? String(expense.amount) : '0';
                                    const amount = parseFloat(rawAmount.replace(/,/g, ''));

                                    // Category Totals
                                    const cat = expense.category || 'Uncategorized';
                                    if (!categoryTotals[cat]) categoryTotals[cat] = 0;
                                    categoryTotals[cat] += amount;

                                    // Merchant Totals
                                    const merchant = expense.description?.trim() || 'Unknown';
                                    if (!merchantTotals[merchant]) merchantTotals[merchant] = 0;
                                    merchantTotals[merchant] += amount;

                                    // Monthly Totals
                                    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                                        currentMonthTotal += amount;
                                    } else if (date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear) {
                                        lastMonthTotal += amount;
                                    }
                                });

                                const trendPercentage = lastMonthTotal > 0
                                    ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
                                    : 0;
                                const daysInMonth = today.getDate(); // Use days elapsed for average
                                const dailyAverage = daysInMonth > 0 ? (currentMonthTotal / daysInMonth) : 0;

                                const topMerchants = Object.entries(merchantTotals)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 3);

                                const totalSpent = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
                                const sortedCategories = Object.entries(categoryTotals)
                                    .sort(([, a], [, b]) => b - a);

                                // Budget Calculations
                                const globalBudget = budgets.global;
                                const globalBudgetUsed = (currentMonthTotal / globalBudget) * 100;
                                const globalBudgetColor = globalBudgetUsed > 100 ? '#EF4444' : globalBudgetUsed > 80 ? '#F59E0B' : '#10B981';

                                return (
                                    <>
                                        {/* Global Budget Overview */}
                                        <View style={{ marginBottom: 24 }}>
                                            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Monthly Budget</Text>
                                            <View style={{ backgroundColor: '#18181B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF10' }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <View>
                                                        <Text style={{ fontSize: 13, color: '#A1A1AA', fontWeight: '600' }}>Total Spend</Text>
                                                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF' }}>{formatAmount(currentMonthTotal)}</Text>
                                                    </View>
                                                    <View style={{ alignItems: 'flex-end' }}>
                                                        <Text style={{ fontSize: 13, color: '#A1A1AA', fontWeight: '600' }}>Limit</Text>
                                                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#71717A' }}>{formatAmount(globalBudget)}</Text>
                                                    </View>
                                                </View>

                                                {/* Global Progress Bar */}
                                                <View style={{ height: 12, backgroundColor: '#27272A', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                                                    <View style={{ height: '100%', width: `${Math.min(globalBudgetUsed, 100)}%`, backgroundColor: globalBudgetColor }} />
                                                </View>

                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ fontSize: 12, color: globalBudgetColor, fontWeight: '700' }}>
                                                        {globalBudgetUsed.toFixed(1)}% Used
                                                    </Text>
                                                    <Text style={{ fontSize: 12, color: '#71717A' }}>
                                                        {globalBudgetUsed > 100 ? `Over by ${formatAmount(currentMonthTotal - globalBudget)}` : `${formatAmount(globalBudget - currentMonthTotal)} left`}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Trends Section */}
                                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                                            <View style={{ flex: 1, backgroundColor: '#18181B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF10' }}>
                                                <Text style={{ fontSize: 11, color: '#71717A', fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 }}>Trends</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    {trendPercentage !== 0 && (
                                                        <TrendingDown
                                                            size={20}
                                                            color={trendPercentage > 0 ? '#EF4444' : '#10B981'}
                                                            style={{ transform: [{ rotate: trendPercentage > 0 ? '180deg' : '0deg' }], marginRight: 8 }}
                                                        />
                                                    )}
                                                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#FFFFFF' }}>
                                                        {Math.abs(trendPercentage).toFixed(0)}%
                                                    </Text>
                                                </View>
                                                <Text style={{ fontSize: 12, color: '#71717A', marginTop: 4, fontWeight: '500' }}>vs last month</Text>
                                            </View>
                                            <View style={{ flex: 1, backgroundColor: '#18181B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF10' }}>
                                                <Text style={{ fontSize: 11, color: '#71717A', fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 }}>Daily Avg</Text>
                                                <Text style={{ fontSize: 20, fontWeight: '900', color: '#FFFFFF' }}>{formatAmount(dailyAverage, 0)}</Text>
                                                <Text style={{ fontSize: 12, color: '#71717A', marginTop: 4, fontWeight: '500' }}>est. {formatAmount(dailyAverage * 30, 0)} /mo</Text>
                                            </View>
                                        </View>

                                        {/* By Category Section */}
                                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Category Budgets</Text>
                                        <View style={{ marginBottom: 24 }}>
                                            {sortedCategories.map(([cat, amount], index) => {
                                                const config = CATEGORIES[cat] || { color: '#71717A', icon: HelpCircle };
                                                const Icon = config.icon || HelpCircle;

                                                // Budget Logic
                                                const catBudget = budgets.categories[cat] || 0;
                                                const hasBudget = catBudget > 0;
                                                const percentage = hasBudget ? (amount / catBudget) * 100 : 0;
                                                const barColor = !hasBudget ? config.color : percentage > 100 ? '#EF4444' : percentage > 80 ? '#F59E0B' : config.color;

                                                return (
                                                    <View key={index} style={{ marginBottom: 16 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: config.color + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                                <Icon size={16} color={config.color} />
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>{cat}</Text>
                                                                    <View style={{ alignItems: 'flex-end' }}>
                                                                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{formatAmount(amount)}</Text>
                                                                        {hasBudget && <Text style={{ fontSize: 10, color: '#71717A' }}>of {formatAmount(catBudget)}</Text>}
                                                                    </View>
                                                                </View>
                                                                <View style={{ height: 6, backgroundColor: '#3F3F46', borderRadius: 3, overflow: 'hidden' }}>
                                                                    <View style={{ height: '100%', width: hasBudget ? `${Math.min(percentage, 100)}%` : '100%', backgroundColor: barColor }} />
                                                                </View>
                                                                {hasBudget && (
                                                                    <Text style={{ color: barColor, fontSize: 11, marginTop: 4, alignSelf: 'flex-end', fontWeight: '600' }}>
                                                                        {percentage.toFixed(0)}% Used {percentage > 100 && '(Over Budget)'}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>

                                        {/* Top Merchants Section */}
                                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Top Merchants</Text>
                                        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                                            {topMerchants.map(([merchant, amount], index) => (
                                                <View key={index} style={{ flex: 1, minWidth: '45%', backgroundColor: '#18181B', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF10' }}>
                                                    <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '600', marginBottom: 4 }}>{merchant}</Text>
                                                    <Text style={{ fontSize: 15, color: '#EF4444', fontWeight: '800' }}>₹{amount.toLocaleString()}</Text>
                                                </View>
                                            ))}
                                            {topMerchants.length === 0 && (
                                                <Text style={{ color: '#71717A', fontStyle: 'italic' }}>No merchant data available</Text>
                                            )}
                                        </View>
                                    </>
                                );
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal >

            {/* Add Expense Modal */}
            < Modal
                visible={showAddModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{newExpense.id ? 'Edit Expense' : 'Add Expense'}</Text>
                            <Pressable onPress={() => setShowAddModal(false)}>
                                <X size={24} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Amount Input */}
                            <Text style={styles.inputLabel}>Amount (₹)</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0"
                                placeholderTextColor="#52525B"
                                keyboardType="numeric"
                                value={newExpense.amount}
                                onChangeText={(text) => setNewExpense({ ...newExpense, amount: text })}
                            />

                            {/* Description Input with Merchant Autocomplete */}
                            <Text style={styles.inputLabel}>Description / Merchant</Text>
                            <View style={{ zIndex: 10 }}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g., Starbucks, Uber, Grocery..."
                                    placeholderTextColor="#52525B"
                                    value={newExpense.description}
                                    onChangeText={(text) => {
                                        setNewExpense({ ...newExpense, description: text });
                                        if (text.length > 0) {
                                            const matches = MERCHANTS.filter(m =>
                                                m.toLowerCase().includes(text.toLowerCase()) &&
                                                m.toLowerCase() !== text.toLowerCase()
                                            );
                                            setMerchantSuggestions(matches.slice(0, 3));
                                            setShowSuggestions(matches.length > 0);
                                        } else {
                                            setShowSuggestions(false);
                                        }
                                    }}
                                    onFocus={() => {
                                        if (newExpense.description.length > 0) setShowSuggestions(true);
                                    }}
                                />
                                {showSuggestions && (
                                    <View style={styles.suggestionsContainer}>
                                        {merchantSuggestions.map((merchant, index) => (
                                            <Pressable
                                                key={index}
                                                style={styles.suggestionItem}
                                                onPress={() => {
                                                    setNewExpense({ ...newExpense, description: merchant });
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                <Text style={styles.suggestionText}>{merchant}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Category Selector */}
                            <Text style={styles.inputLabel}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                                {Object.entries(CATEGORIES).map(([cat, config]) => {
                                    const Icon = config.icon;
                                    const isSelected = newExpense.category === cat;
                                    return (
                                        <Pressable
                                            key={cat}
                                            style={[
                                                styles.categoryOption,
                                                isSelected && { backgroundColor: config.color + '30', borderColor: config.color }
                                            ]}
                                            onPress={() => setNewExpense({ ...newExpense, category: cat })}
                                        >
                                            <Icon size={20} color={isSelected ? config.color : '#71717A'} strokeWidth={2.5} />
                                            <Text style={[styles.categoryOptionText, isSelected && { color: config.color }]}>
                                                {cat}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                                {/* Custom Category Option */}
                                <Pressable
                                    style={[
                                        styles.categoryOption,
                                        showCustomCategory && { backgroundColor: '#EF444430', borderColor: '#EF4444' }
                                    ]}
                                    onPress={() => {
                                        setShowCustomCategory(!showCustomCategory);
                                        if (!showCustomCategory) {
                                            setNewExpense({ ...newExpense, category: 'Custom' });
                                        }
                                    }}
                                >
                                    <Plus size={20} color={showCustomCategory ? '#EF4444' : '#71717A'} strokeWidth={2.5} />
                                    <Text style={[styles.categoryOptionText, showCustomCategory && { color: '#EF4444' }]}>
                                        Custom
                                    </Text>
                                </Pressable>
                            </ScrollView>

                            {/* Custom Category Input */}
                            {showCustomCategory && (
                                <TextInput
                                    style={[styles.textInput, { marginTop: -10 }]}
                                    placeholder="Enter custom category name"
                                    placeholderTextColor="#52525B"
                                    value={newExpense.customCategory}
                                    onChangeText={(text) => setNewExpense({ ...newExpense, customCategory: text, category: text || 'Custom' })}
                                />
                            )}

                            {/* Payment Method Selector */}
                            <Text style={styles.inputLabel}>Payment Method</Text>
                            <View style={styles.paymentGrid}>
                                {Object.entries(PAYMENT_METHODS).map(([method, config]) => {
                                    const Icon = config.icon;
                                    const isSelected = newExpense.paymentMethod === method;
                                    return (
                                        <Pressable
                                            key={method}
                                            style={[
                                                styles.paymentOption,
                                                isSelected && { backgroundColor: config.color + '30', borderColor: config.color }
                                            ]}
                                            onPress={() => setNewExpense({ ...newExpense, paymentMethod: method })}
                                        >
                                            <Icon size={18} color={isSelected ? config.color : '#71717A'} strokeWidth={2.5} />
                                            <Text style={[styles.paymentOptionText, isSelected && { color: config.color }]}>
                                                {method}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                                {/* Custom Payment Method Option */}
                                <Pressable
                                    style={[
                                        styles.paymentOption,
                                        showCustomPayment && { backgroundColor: '#EF444430', borderColor: '#EF4444' }
                                    ]}
                                    onPress={() => {
                                        setShowCustomPayment(!showCustomPayment);
                                        if (!showCustomPayment) {
                                            setNewExpense({ ...newExpense, paymentMethod: 'Custom' });
                                        }
                                    }}
                                >
                                    <Plus size={18} color={showCustomPayment ? '#EF4444' : '#71717A'} strokeWidth={2.5} />
                                    <Text style={[styles.paymentOptionText, showCustomPayment && { color: '#EF4444' }]}>
                                        Custom
                                    </Text>
                                </Pressable>
                            </View>

                            {/* Custom Payment Method Input */}
                            {showCustomPayment && (
                                <TextInput
                                    style={[styles.textInput, { marginTop: -6 }]}
                                    placeholder="Enter custom payment method"
                                    placeholderTextColor="#52525B"
                                    value={newExpense.customPaymentMethod}
                                    onChangeText={(text) => setNewExpense({ ...newExpense, customPaymentMethod: text, paymentMethod: text || 'Custom' })}
                                />
                            )}

                            {/* Date Input */}
                            <Text style={styles.inputLabel}>Date</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#52525B"
                                value={newExpense.date}
                                onChangeText={(text) => setNewExpense({ ...newExpense, date: text })}
                            />

                            {/* Notes Input */}
                            <Text style={styles.inputLabel}>Notes (Optional)</Text>
                            <TextInput
                                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                                placeholder="Add any additional notes..."
                                placeholderTextColor="#52525B"
                                multiline
                                numberOfLines={3}
                                value={newExpense.notes}
                                onChangeText={(text) => setNewExpense({ ...newExpense, notes: text })}
                            />

                            {/* Receipt Upload Section */}
                            <Text style={styles.inputLabel}>Receipt (Optional)</Text>
                            {newExpense.receiptImage ? (
                                <View style={styles.receiptPreview}>
                                    <Image source={{ uri: newExpense.receiptImage }} style={styles.receiptImage} />
                                    <Pressable style={styles.removeReceiptButton} onPress={removeReceipt}>
                                        <Trash2 size={20} color="#FFFFFF" strokeWidth={2.5} />
                                    </Pressable>
                                </View>
                            ) : (
                                <View style={styles.receiptButtons}>
                                    <Pressable style={styles.receiptButton} onPress={takePhoto}>
                                        <Camera size={22} color="#FFFFFF" strokeWidth={2.5} />
                                        <Text style={styles.receiptButtonText}>Camera</Text>
                                    </Pressable>
                                    <Pressable style={styles.receiptButton} onPress={pickImage}>
                                        <ImageIcon size={22} color="#FFFFFF" strokeWidth={2.5} />
                                        <Text style={styles.receiptButtonText}>Gallery</Text>
                                    </Pressable>
                                </View>
                            )}

                            {/* Recurring Expense Toggle */}
                            <Pressable
                                style={styles.checkboxRow}
                                onPress={() => setNewExpense({ ...newExpense, isRecurring: !newExpense.isRecurring })}
                            >
                                <View style={[styles.checkbox, newExpense.isRecurring && styles.checkboxChecked]}>
                                    {newExpense.isRecurring && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={styles.checkboxLabel}>Mark as Recurring (Monthly)</Text>
                            </Pressable>

                            {/* Save & Add Another Checkbox */}
                            <Pressable
                                style={styles.checkboxRow}
                                onPress={() => setSaveAndAddAnother(!saveAndAddAnother)}
                            >
                                <View style={[styles.checkbox, saveAndAddAnother && styles.checkboxChecked]}>
                                    {saveAndAddAnother && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={styles.checkboxLabel}>Save & Add Another</Text>
                            </Pressable>

                            {/* Save Button */}
                            <Pressable style={styles.saveButton} onPress={handleSaveExpense}>
                                <Text style={styles.saveButtonText}>{newExpense.id ? 'Update Expense' : 'Save Expense'}</Text>
                            </Pressable>

                            {newExpense.id && (
                                <Pressable
                                    style={[styles.saveButton, { backgroundColor: '#18181B', marginTop: 0, borderColor: '#EF444450' }]}
                                    onPress={() => {
                                        handleDeleteExpense(newExpense.id);
                                        setShowAddModal(false);
                                    }}
                                >
                                    <Text style={[styles.saveButtonText, { color: '#EF4444' }]}>Delete Expense</Text>
                                </Pressable>
                            )}
                        </ScrollView>
                    </View>
                </View >
            </Modal >
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 100 },

    header: { padding: 20, paddingTop: 56, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLabel: { fontSize: 11, color: '#71717A', marginBottom: 4, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF10', position: 'relative' },
    filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    filterBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', marginHorizontal: 20, marginBottom: 20, padding: 14, borderRadius: 16, gap: 10, borderWidth: 1, borderColor: '#FFFFFF08' },
    searchInput: { flex: 1, fontSize: 15, color: '#FFFFFF', fontWeight: '500' },

    aiButton: {
        height: 44,
        borderRadius: 12,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    aiButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#E4E4E7'
    },
    totalCardWrapper: { marginHorizontal: 20, marginBottom: 24 },
    totalCard: { position: 'relative', borderRadius: 24, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    totalGlow: { position: 'absolute', top: -60, left: -60, right: -60, height: 120, backgroundColor: '#EF4444', opacity: 0.1, borderRadius: 120 },
    totalContent: { padding: 24 },
    totalLabel: { fontSize: 11, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
    totalAmount: { fontSize: 42, fontWeight: '900', color: '#FFFFFF', marginBottom: 12, letterSpacing: -2 },
    totalFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    totalSubtext: { fontSize: 12, color: '#FFFFFF60', fontWeight: '600' },

    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: '#71717A', marginBottom: 12, letterSpacing: 1.5, textTransform: 'uppercase' },

    emptyCard: { backgroundColor: '#18181B', borderRadius: 20, padding: 48, alignItems: 'center', marginHorizontal: 20, borderWidth: 1, borderColor: '#FFFFFF08' },
    emptyText: { fontSize: 16, color: '#A1A1AA', marginTop: 16, fontWeight: '700' },
    emptySubtext: { fontSize: 13, color: '#52525B', marginTop: 4, fontWeight: '500' },

    expenseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#FFFFFF08' },
    expenseIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1 },
    expenseContent: { flex: 1 },
    expenseName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4, letterSpacing: -0.2 },
    expenseCategory: { fontSize: 12, color: '#71717A', fontWeight: '600' },
    expensePayment: { fontSize: 12, color: '#52525B', fontWeight: '500' },
    expenseAmount: { fontSize: 18, fontWeight: '900', color: '#EF4444', letterSpacing: -0.5 },
    recurringBadge: { backgroundColor: '#EF444420', padding: 3, borderRadius: 5 },

    fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },

    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#18181B', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },

    filterLabel: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 12, marginTop: 16, letterSpacing: 1, textTransform: 'uppercase' },
    filterScroll: { marginBottom: 16 },
    filterChip: { backgroundColor: '#27272A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: '#FFFFFF08' },
    filterChipActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    filterChipText: { fontSize: 13, fontWeight: '600', color: '#71717A' },
    filterChipTextActive: { color: '#FFFFFF' },

    paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    paymentChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#27272A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF08' },
    paymentChipActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    paymentChipText: { fontSize: 13, fontWeight: '600', color: '#71717A' },
    paymentChipTextActive: { color: '#FFFFFF' },

    clearButton: { backgroundColor: '#27272A', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#FFFFFF08' },
    clearButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 },

    // Add Expense Modal Styles
    inputLabel: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 10, marginTop: 16, letterSpacing: 1, textTransform: 'uppercase' },
    amountInput: { backgroundColor: '#27272A', padding: 20, borderRadius: 16, fontSize: 36, fontWeight: '900', color: '#FFFFFF', borderWidth: 1, borderColor: '#FFFFFF08', marginBottom: 16, letterSpacing: -1.5 },
    textInput: { backgroundColor: '#27272A', padding: 16, borderRadius: 14, fontSize: 15, color: '#FFFFFF', borderWidth: 1, borderColor: '#FFFFFF08', marginBottom: 16, fontWeight: '500' },

    categoryOption: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#27272A', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginRight: 10, borderWidth: 1, borderColor: '#FFFFFF08' },
    categoryOptionText: { fontSize: 13, fontWeight: '600', color: '#71717A' },

    paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#27272A', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#FFFFFF08', flex: 1, justifyContent: 'center' },
    paymentOptionText: { fontSize: 13, fontWeight: '600', color: '#71717A' },

    saveButton: { backgroundColor: '#EF4444', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 24, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    saveButtonText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },

    // Receipt Upload Styles
    receiptButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    receiptButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#4F46E5', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#FFFFFF10' },
    receiptButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 },
    receiptPreview: { position: 'relative', marginBottom: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF08' },
    receiptImage: { width: '100%', height: 200, resizeMode: 'cover' },
    removeReceiptButton: { position: 'absolute', top: 12, right: 12, backgroundColor: '#EF4444', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },

    // Checkbox Styles
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#52525B', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    checkboxChecked: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    checkmark: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
    checkboxLabel: { fontSize: 15, fontWeight: '600', color: '#A1A1AA' },

    // Autocomplete Styles
    suggestionsContainer: { position: 'absolute', top: 75, left: 0, right: 0, backgroundColor: '#27272A', borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF10', zIndex: 100, elevation: 5 },
    suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF08' },
    suggestionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
});
