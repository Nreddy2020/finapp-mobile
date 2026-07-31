import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View, ScrollView, RefreshControl, Text, StyleSheet, TouchableOpacity, TextInput, Switch, Linking, Alert } from 'react-native';
import { Book, Plus, ArrowUpRight, ArrowDownLeft, Sparkles, Activity, AlertTriangle, Globe, Coins, Calculator, Store, User, Handshake, Plane, Share2, FileText, Send, CheckCircle2, Trash2, Download, Upload } from 'lucide-react-native';
import CashTallyModal from '../../components/cashbooks/CashTallyModal';
import CreateBookModal from '../../components/cashbooks/CreateBookModal';
import { LinearGradient } from 'expo-linear-gradient';
import { loadData, saveData, STORAGE_KEYS } from '../../services/storage'; // Updated import
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import ErrorBoundary from '../../components/ErrorBoundary';
import { exportCashbooksBackup, importCashbooksBackup } from '../../services/backup';

export default function CashbooksScreen() {
    const router = useRouter();
    const [cashbooks, setCashbooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchCashbooks = async () => {
        try {
            const data = await loadData(STORAGE_KEYS.CASHBOOKS, []);
            setCashbooks(data || []);
        } catch (error) {
            console.error('Error fetching cashbooks:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCashbooks();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCashbooks();
    };

    const [tickerBalance, setTickerBalance] = useState(0);
    const [currency, setCurrency] = useState('₹'); // Multi-currency support
    const [riskRate, setRiskRate] = useState(0); // 0-50%
    const [searchQuery, setSearchQuery] = useState(''); // Search state
    const [haggleMode, setHaggleMode] = useState(false);
    const [hagglePrice, setHagglePrice] = useState('');
    const [haggleCost, setHaggleCost] = useState('');
    const [tallyVisible, setTallyVisible] = useState(false);
    const [createVisible, setCreateVisible] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingBook, setEditingBook] = useState(null);

    // Load Risk Rate Persistence
    useEffect(() => {
        loadData(STORAGE_KEYS.SETTINGS, { riskRate: 0 }).then(settings => {
            if (settings?.riskRate) setRiskRate(settings.riskRate);
        });
    }, []);

    const saveRiskRate = async (rate) => {
        setRiskRate(rate);
        await saveData(STORAGE_KEYS.SETTINGS, { riskRate: rate });
    };

    // World-Class Feature: WhatsApp Payment Link Generator
    const handleGeneratePaymentLink = async (book) => {
        const amount = Math.abs(parseFloat(book.balance || 0));
        const currencySymbol = book.currency || currency;
        const type = parseFloat(book.balance) < 0 ? 'owe you' : 'you owe me';

        // Real WhatsApp Deep Linking
        const message = `Hello! This is a reminder that ${type} ${currencySymbol}${amount.toLocaleString()} for "${book.name}". Please pay soon! 🔗 Pay here: https://pay.fintech.app/${book.id}`;
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

        try {
            const canOpen = await Linking.canOpenURL(whatsappUrl);

            if (canOpen) {
                await Linking.openURL(whatsappUrl);
            } else {
                // Fallback: Try web WhatsApp
                const webUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                await Linking.openURL(webUrl);
            }
        } catch (error) {
            Alert.alert('Error', 'WhatsApp not installed or unable to open');
        }
    };

    // World-Class Feature: Legal PDF Generator
    const handleGenerateLegalPdf = async (book) => {
        try {
            // Dynamic import to handle missing packages gracefully
            const Print = await import('expo-print').catch(() => null);
            const Sharing = await import('expo-sharing').catch(() => null);

            if (!Print || !Sharing) {
                Alert.alert(
                    'Package Required',
                    'Please install expo-print and expo-sharing:\n\nnpm install expo-print expo-sharing',
                    [{ text: 'OK' }]
                );
                return;
            }

            const currentDate = new Date().toLocaleDateString('en-IN');
            const amount = Math.abs(parseFloat(book.balance || 0));
            const currencySymbol = book.currency || currency;

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Promissory Note - ${book.name}</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; }
                        h1 { text-align: center; text-decoration: underline; margin-bottom: 30px; }
                        .header { text-align: center; margin-bottom: 40px; }
                        .content { margin: 20px 0; }
                        .signature { margin-top: 60px; }
                        .signature-line { border-top: 1px solid #000; width: 200px; margin-top: 40px; }
                        .footer { margin-top: 60px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>PROMISSORY NOTE</h1>
                        <p><strong>Date:</strong> ${currentDate}</p>
                    </div>
                    
                    <div class="content">
                        <p><strong>Cashbook Reference:</strong> ${book.name}</p>
                        <p><strong>Amount:</strong> ${currencySymbol}${amount.toLocaleString('en-IN')}</p>
                        <p><strong>Type:</strong> ${book.type || 'General'}</p>
                        
                        <p style="margin-top: 30px;">
                            This document serves as a record of the financial transaction(s) recorded in the cashbook titled "${book.name}".
                        </p>
                        
                        <p>
                            <strong>Total Inflow:</strong> ${currencySymbol}${parseFloat(book.total_in || 0).toLocaleString('en-IN')}<br>
                            <strong>Total Outflow:</strong> ${currencySymbol}${parseFloat(book.total_out || 0).toLocaleString('en-IN')}<br>
                            <strong>Current Balance:</strong> ${currencySymbol}${parseFloat(book.balance || 0).toLocaleString('en-IN')}
                        </p>
                        
                        <p style="margin-top: 30px;">
                            <strong>Jurisdiction:</strong> India<br>
                            <strong>Last Updated:</strong> ${book.last_updated || currentDate}
                        </p>
                    </div>
                    
                    <div class="signature">
                        <p>Authorized Signatory:</p>
                        <div class="signature-line"></div>
                        <p style="margin-top: 5px;">Name & Signature</p>
                    </div>
                    
                    <div class="footer">
                        <p>Generated by Fintech Mobile App on ${currentDate}</p>
                        <p>This is a computer-generated document and does not require a physical signature for record-keeping purposes.</p>
                    </div>
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Legal Document - ${book.name}`,
                UTI: 'com.adobe.pdf'
            });
        } catch (error) {
            console.error('PDF Generation Error:', error);
            Alert.alert('Error', 'Failed to generate PDF. Please try again.');
        }
    };

    const handleCreateBook = useCallback(async (newBook) => {
        const updatedBooks = [newBook, ...cashbooks];
        setCashbooks(updatedBooks);
        await saveData(STORAGE_KEYS.CASHBOOKS, updatedBooks);
    }, [cashbooks]);

    const handleDeleteBook = useCallback(async (id) => {
        const updatedBooks = cashbooks.filter(b => b.id !== id);
        setCashbooks(updatedBooks);
        await saveData(STORAGE_KEYS.CASHBOOKS, updatedBooks);
    }, [cashbooks]);

    const handleEditBook = useCallback((book) => {
        setEditingBook(book);
        setEditMode(true);
        setCreateVisible(true);
    }, []);

    const handleSaveEdit = useCallback(async (updatedBook) => {
        const updatedBooks = cashbooks.map(b => b.id === updatedBook.id ? updatedBook : b);
        setCashbooks(updatedBooks);
        await saveData(STORAGE_KEYS.CASHBOOKS, updatedBooks);
        setEditMode(false);
        setEditingBook(null);
    }, [cashbooks]);

    const getBookIcon = useCallback((type) => {
        switch (type) {
            case 'shop': return <Store size={24} color="#F59E0B" />;
            case 'personal': return <User size={24} color="#10B981" />;
            case 'credit': return <Handshake size={24} color="#EF4444" />;
            case 'trip': return <Plane size={24} color="#3B82F6" />;
            default: return <Book size={24} color="#4F46E5" />;
        }
    }, []);

    // Derived Financials (Memoized for performance)
    const totalBalance = useMemo(() =>
        cashbooks.reduce((sum, cb) => sum + parseFloat(cb.balance || 0), 0),
        [cashbooks]
    );

    const totalOutflow = useMemo(() =>
        cashbooks.reduce((sum, cb) => sum + parseFloat(cb.total_out || 0), 0),
        [cashbooks]
    );

    const avgDailyOutflow = useMemo(() =>
        totalOutflow / 30 || 1,
        [totalOutflow]
    );

    const runwayDays = useMemo(() =>
        Math.floor(tickerBalance / avgDailyOutflow),
        [tickerBalance, avgDailyOutflow]
    );

    // Business Health Grade (Memoized)
    const health = useMemo(() => {
        if (runwayDays > 60) return { grade: 'A+', color: '#10B981', label: 'Fortress' };
        if (runwayDays > 30) return { grade: 'B', color: '#3B82F6', label: 'Stable' };
        if (runwayDays > 15) return { grade: 'C', color: '#F59E0B', label: 'Monitor' };
        return { grade: 'D', color: '#EF4444', label: 'Critical' };
    }, [runwayDays]);

    // Ticker Logic
    useEffect(() => {
        setTickerBalance(totalBalance);
        // Only run if there is a balance to animate
        if (totalBalance === 0) return;

        const interval = setInterval(() => {
            // Simulate slight cash velocity for "Pulse" effect
            const velocity = (Math.random() * 2 - 0.5) * 0.5;
            setTickerBalance(prev => prev + velocity);
        }, 1000);
        return () => clearInterval(interval);
    }, [totalBalance]);

    const RiskBalance = tickerBalance * (1 - riskRate / 100);
    const THEME_COLOR = '#4F46E5'; // Indigo

    const QUICK_ACTIONS = [
        { label: 'Fuel', icon: '⛽' },
        { label: 'Food', icon: '🍔' },
        { label: 'Travel', icon: '🚕' },
        { label: 'Stock', icon: '📦' },
    ];

    return (
        <ErrorBoundary>
            <AnimatedScreen style={styles.container}>
                <CashTallyModal
                    visible={tallyVisible}
                    onClose={() => setTallyVisible(false)}
                    systemBalance={totalBalance}
                    currency={currency}
                />

                <CreateBookModal
                    visible={createVisible}
                    onClose={() => {
                        setCreateVisible(false);
                        setEditMode(false);
                        setEditingBook(null);
                    }}
                    onCreate={editMode ? handleSaveEdit : handleCreateBook}
                    editMode={editMode}
                    initialData={editingBook}
                />

                <View style={{ paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF10' }}>
                    <TextInput
                        style={{ backgroundColor: '#18181B', color: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46' }}
                        placeholder="🔍 Search Cashbooks..."
                        placeholderTextColor="#52525B"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={THEME_COLOR}
                            colors={[THEME_COLOR]}
                            progressBackgroundColor="#18181B"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerLabel}>Financial Command Center</Text>
                            <Text style={styles.title}>Headquarters</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                onPress={async () => {
                                    const success = await importCashbooksBackup();
                                    if (success) fetchCashbooks();
                                }}
                                style={styles.headerBtn}
                                accessibilityLabel="Restore backup"
                                accessibilityHint="Import cashbooks from backup file"
                                accessibilityRole="button"
                            >
                                <Upload size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={exportCashbooksBackup}
                                style={styles.headerBtn}
                                accessibilityLabel="Create backup"
                                accessibilityHint="Export cashbooks to backup file"
                                accessibilityRole="button"
                            >
                                <Download size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setCreateVisible(true)}
                                style={[styles.headerBtn, { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }]}
                                accessibilityLabel="Create new cashbook"
                                accessibilityHint="Opens a modal to create a new cashbook"
                                accessibilityRole="button"
                            >
                                <Plus size={24} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setTallyVisible(true)}
                                style={styles.headerBtn}
                                accessibilityLabel="Open cash tally calculator"
                                accessibilityHint="Opens calculator to tally physical cash"
                                accessibilityRole="button"
                            >
                                <Calculator size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setCurrency(prev => prev === '₹' ? '$' : '₹')}
                                style={styles.currencyBtn}
                                accessibilityLabel={`Switch currency, currently ${currency === '₹' ? 'Indian Rupees' : 'US Dollars'}`}
                                accessibilityHint="Toggles between Rupees and Dollars"
                                accessibilityRole="button"
                            >
                                <Globe size={20} color={currency === '₹' ? '#FFFFFF' : '#10B981'} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Quick Actions Grid (Universal Speed) */}
                    <View style={styles.quickActionGrid}>
                        {QUICK_ACTIONS.map((action, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.quickActionBtn}
                                accessibilityLabel={`Quick action: ${action.label}`}
                                accessibilityRole="button"
                            >
                                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                                <Text style={styles.quickActionLabel}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Hero: Real-Time Liquidity Pulse */}
                    <View style={styles.heroCardWrapper}>
                        <View style={styles.heroCard}>
                            <LinearGradient
                                colors={[`${THEME_COLOR}60`, '#00000000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.heroGlow}
                            />
                            <View style={styles.heroContent}>
                                <View style={styles.heroTop}>
                                    <Text style={styles.heroLabel}>Real-Time Liquidity</Text>
                                    <View style={[styles.healthBadge, { backgroundColor: `${health.color}20`, borderColor: `${health.color}40` }]}>
                                        <Activity size={12} color={health.color} />
                                        <Text style={[styles.healthText, { color: health.color }]}>Health: {health.grade}</Text>
                                    </View>
                                </View>

                                <Text style={styles.heroAmount}>
                                    {currency}{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>

                                <View style={styles.runwayRow}>
                                    <Text style={styles.runwayLabel}>Runway Forecast:</Text>
                                    <Text style={[styles.runwayValue, { color: health.color }]}>{runwayDays} Days</Text>
                                </View>
                            </View>

                            {/* Risk Simulator Overlay */}
                            <View style={styles.riskSection}>
                                <View style={styles.riskHeader}>
                                    <AlertTriangle size={14} color="#F59E0B" />
                                    <Text style={styles.riskTitle}>Credit Risk Simulator (Bad Debt)</Text>
                                </View>
                                <View style={styles.sliderContainer}>
                                    {[0, 10, 20, 30].map(val => (
                                        <TouchableOpacity
                                            key={val}
                                            onPress={() => saveRiskRate(val)}
                                            style={[styles.sliderBtn, riskRate === val && styles.sliderBtnActive]}
                                        >
                                            <Text style={[styles.sliderText, riskRate === val && { color: '#FFF' }]}>{val}%</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {riskRate > 0 && (
                                    <Text style={styles.riskImpact}>
                                        Projected Loss: -{currency}{(totalBalance - RiskBalance).toFixed(0)}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Haggle Helper (World Class Utility) */}
                    <LuxuryCard style={styles.utilityCard}>
                        <View style={styles.utilityHeader}>
                            <View style={styles.iconBox}>
                                <Coins size={20} color="#10B981" />
                            </View>
                            <View>
                                <Text style={styles.utilityTitle}>Haggle Helper</Text>
                                <Text style={styles.utilityDesc}>Instant Margin Calculator</Text>
                            </View>
                            <Switch
                                value={haggleMode}
                                onValueChange={setHaggleMode}
                                trackColor={{ false: '#27272A', true: '#10B981' }}
                            />
                        </View>

                        {haggleMode && (
                            <View style={styles.haggleForm}>
                                <View style={styles.inputRow}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>My Cost</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="0"
                                            placeholderTextColor="#52525B"
                                            keyboardType="numeric"
                                            value={haggleCost}
                                            onChangeText={setHaggleCost}
                                        />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Offer Price</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="0"
                                            placeholderTextColor="#52525B"
                                            keyboardType="numeric"
                                            value={hagglePrice}
                                            onChangeText={setHagglePrice}
                                        />
                                    </View>
                                </View>

                                {haggleCost && hagglePrice && (
                                    <View style={[
                                        styles.marginDisplay,
                                        (parseFloat(hagglePrice) - parseFloat(haggleCost)) > 0 ? styles.profit : styles.loss
                                    ]}>
                                        <Text style={styles.marginText}>
                                            Margin: {(((parseFloat(hagglePrice) - parseFloat(haggleCost)) / parseFloat(hagglePrice)) * 100).toFixed(1)}%
                                        </Text>
                                        <Text style={styles.profitText}>
                                            {currency}{(parseFloat(hagglePrice) - parseFloat(haggleCost)).toFixed(2)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </LuxuryCard>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Your Ledgers ({currency})</Text>



                        {cashbooks.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                            <View style={styles.emptyCard}>
                                <View style={styles.emptyIconContainer}>
                                    <Sparkles size={32} color={THEME_COLOR} strokeWidth={2.5} />
                                </View>
                                <Text style={styles.emptyText}>No cashbooks found</Text>
                                <Text style={styles.emptySubtext}>Create your first ledger or try a different search.</Text>
                                {searchQuery === '' && (
                                    <TouchableOpacity style={styles.addButton} onPress={() => setCreateVisible(true)}>
                                        <Plus size={20} color="#4F46E5" />
                                        <Text style={styles.addButtonText}>Create Cashbook</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View style={styles.grid}>
                                {cashbooks.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())).map((book) => (
                                    <LuxuryCard
                                        key={book.id}
                                        style={styles.bookCard}
                                        onPress={() => router.push(`/cashbook/${book.id}`)}
                                    >
                                        <View style={styles.bookHeader}>
                                            <View style={[styles.bookIcon, { backgroundColor: '#4F46E510' }]}>
                                                {/* Using safe icon rendering */}
                                                {getBookIcon ? getBookIcon(book.type) : <Book size={24} color="#4F46E5" />}
                                            </View>
                                            <View>
                                                <Text style={styles.bookName}>{book.name}</Text>
                                                <Text style={styles.bookDate}>Updated {book.last_updated}</Text>
                                            </View>
                                            <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 12 }}>
                                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleEditBook(book) }} style={{ padding: 4 }}>
                                                    <FileText size={18} color="#A1A1AA" />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteBook(book.id) }} style={{ padding: 4 }}>
                                                    <Trash2 size={18} color="#52525B" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.bookBalance}>
                                            <Text style={styles.balanceLabel}>Balance</Text>
                                            <Text style={[styles.balanceValue, { color: book.balance < 0 ? '#EF4444' : '#10B981' }]}>
                                                {book.currency || currency}{parseFloat(book.balance || 0).toLocaleString('en-IN')}
                                            </Text>
                                        </View>

                                        <View style={styles.bookStats}>
                                            <View style={styles.statItem}>
                                                <ArrowDownLeft size={16} color="#10B981" />
                                                <Text style={styles.statText}>In: {book.currency || currency}{parseFloat(book.total_in || 0).toLocaleString('en-IN')}</Text>
                                            </View>
                                            <View style={styles.statItem}>
                                                <ArrowUpRight size={16} color="#EF4444" />
                                                <Text style={styles.statText}>Out: {book.currency || currency}{parseFloat(book.total_out || 0).toLocaleString('en-IN')}</Text>
                                            </View>
                                        </View>

                                        {/* World-Class Quick Actions */}
                                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#FFFFFF10' }}>
                                            <TouchableOpacity
                                                style={[styles.miniActionBtn, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleGeneratePaymentLink(book);
                                                }}
                                                accessibilityLabel={`Share payment link for ${book.name} via WhatsApp`}
                                                accessibilityHint="Opens WhatsApp with pre-filled payment message"
                                                accessibilityRole="button"
                                            >
                                                <Send size={14} color="#10B981" />
                                                <Text style={[styles.miniActionText, { color: '#10B981' }]}>WhatsApp Link</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.miniActionBtn, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleGenerateLegalPdf(book);
                                                }}
                                                accessibilityLabel={`Generate legal PDF for ${book.name}`}
                                                accessibilityHint="Creates and shares a legal promissory note document"
                                                accessibilityRole="button"
                                            >
                                                <FileText size={14} color="#3B82F6" />
                                                <Text style={[styles.miniActionText, { color: '#3B82F6' }]}>Legal PDF</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </LuxuryCard>
                                ))}
                            </View>
                        )}
                    </View>

                    <LuxuryCard
                        style={styles.addButton}
                        onPress={() => { }}
                        index={cashbooks.length + 1}
                    >
                        <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                        <Text style={styles.addButtonText}>Create New Book</Text>
                    </LuxuryCard>
                </ScrollView >
            </AnimatedScreen >
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 24 },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    heroCardWrapper: { marginHorizontal: 24, marginBottom: 40 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },
    cashbookCard: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 140, opacity: 1 },
    cardIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#4F46E510', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1, borderColor: '#4F46E520' },
    cardContent: { flex: 1 },
    bookName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.3 },
    statsRow: { flexDirection: 'row', gap: 12 },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statValue: { fontSize: 12, fontWeight: '700' },
    cardRight: { alignItems: 'flex-end' },
    balance: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#4F46E508', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#4F46E515' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    headerRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#18181B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },
    currencyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },
    quickActionGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 24 },
    quickActionBtn: { flex: 1, backgroundColor: '#18181B', padding: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08' },
    quickActionIcon: { fontSize: 24, marginBottom: 8 },
    quickActionLabel: { color: '#A1A1AA', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    healthBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    healthText: { fontSize: 12, fontWeight: '700' },
    runwayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: '#00000030', padding: 12, borderRadius: 12 },
    runwayLabel: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
    runwayValue: { fontSize: 13, fontWeight: '700' },
    riskSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#FFFFFF10' },
    riskHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    riskTitle: { color: '#F59E0B', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
    sliderContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    sliderBtn: { flex: 1, paddingVertical: 8, backgroundColor: '#27272A', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },
    sliderBtnActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
    sliderText: { color: '#71717A', fontSize: 12, fontWeight: '700' },
    riskImpact: { textAlign: 'center', color: '#EF4444', fontWeight: '700', fontSize: 13 },
    utilityCard: { marginHorizontal: 24, marginBottom: 24, padding: 20, backgroundColor: '#18181B', borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF08' },
    utilityHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 0 },
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center' },
    utilityTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    utilityDesc: { color: '#71717A', fontSize: 12 },
    haggleForm: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#FFFFFF10' },
    inputRow: { flexDirection: 'row', gap: 12 },
    inputGroup: { flex: 1 },
    inputLabel: { color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
    input: { backgroundColor: '#000', color: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', fontWeight: '700', fontSize: 16 },
    marginDisplay: { marginTop: 12, padding: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    profit: { backgroundColor: '#10B98110' },
    loss: { backgroundColor: '#EF444410' },
    marginText: { fontWeight: '700', fontSize: 14, color: '#FFFFFF' },
    profitText: { fontWeight: '800', fontSize: 16, color: '#FFFFFF' },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#4F46E550' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#4F46E5', letterSpacing: 0.5 },
    miniActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
    miniActionText: { fontSize: 12, fontWeight: '700' },
});
