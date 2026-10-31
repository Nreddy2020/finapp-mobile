/**
 * app/(tabs)/cashbooks.js
 * 
 * FinLife Universal Cashbook Experience (V3) — Purpose-Driven Financial Books.
 * 
 * Features:
 * - Purpose-Built Experiences per Book: Personal Savings, Handy Cash Till, Business Operations,
 *   Loans (Liabilities / Receivables), Provident Fund (EPFO), Regular Income.
 * - Purpose-Driven Dashboards with domain metric reducers.
 * - Dynamic context-aware navigation tabs (Dashboard, Passbook / Journal / Till Count, Accounts).
 * - Adaptive Workflow Action Modal: Compiles mathematically balanced LedgerTransactions (Debits === Credits).
 * - Universal underlying Ledger Engine with integer paise arithmetic and hash chain.
 * - Multi-book switching with strict DEMO vs PRODUCTION isolation.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Share,
    Platform,
    ScrollView,
    BackHandler
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    Plus,
    Download,
    RefreshCw,
    BookOpen,
    Layers,
    Calendar,
    Wallet,
    CheckCircle2,
    Home,
    Store,
    Briefcase,
    TrendingUp,
    ArrowDownRight,
    ArrowUpRight,
    Shield,
    ArrowLeft
} from 'lucide-react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';

import {
    CashbookAppMode,
    CashbookType,
    TransactionType,
    CashbookExperienceProfile,
    resolveCashbookExperience,
    formatMoneyPaise,
    createMoneyPaise
} from '../../services/cashbook/cashbookContracts.js';
import { CashbookRepository } from '../../services/cashbook/cashbookRepository.js';
import {
    computeRunningLedger,
    computePersonalDashboardMetrics,
    computeHandyCashDashboardMetrics,
    computeBusinessDashboardMetrics,
    computeLoanLiabilityDashboardMetrics,
    computeLoanReceivableDashboardMetrics,
    computePFDashboardMetrics
} from '../../services/cashbook/cashbookEngine.js';
import { buildCashbookViewModel, FilterType } from '../../services/cashbook/cashbookViewModel.js';
import { CashbookExport } from '../../services/cashbook/cashbookExport.js';

import BookHeaderBar from '../../components/cashbook/BookHeaderBar.js';
import LedgerTableView from '../../components/cashbook/LedgerTableView.js';
import DailyClosingView from '../../components/cashbook/DailyClosingView.js';
import BalanceSummaryCard from '../../components/cashbook/BalanceSummaryCard.js';
import TransactionFilterBar from '../../components/cashbook/TransactionFilterBar.js';
import TransactionList from '../../components/cashbook/TransactionList.js';
import AddTransactionModal from '../../components/cashbook/AddTransactionModal.js';
import TransactionDetailModal from '../../components/cashbook/TransactionDetailModal.js';
import AccountManageModal from '../../components/cashbook/AccountManageModal.js';

// Purpose-Built V3 Components
import PersonalDashboardView from '../../components/cashbook/PersonalDashboardView.js';
import HandyCashDashboardView from '../../components/cashbook/HandyCashDashboardView.js';
import BusinessDashboardView from '../../components/cashbook/BusinessDashboardView.js';
import LoansDashboardView from '../../components/cashbook/LoansDashboardView.js';
import PFDashboardView from '../../components/cashbook/PFDashboardView.js';
import WorkflowActionModal from '../../components/cashbook/WorkflowActionModal.js';

export default function CashbooksScreen() {
    const router = useRouter();
    const [appMode, setAppMode] = useState(CashbookAppMode.PRODUCTION);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Envelope & multi-book state
    const [envelope, setEnvelope] = useState({
        books: [],
        activeBookId: 'book_personal_savings',
        accounts: [],
        transactions: [],
        dailyClosings: [],
        auditLog: []
    });

    // Navigation segment state (Default to DASHBOARD)
    const [activeTab, setActiveTab] = useState('DASHBOARD');

    // UI filters for Overview
    const [activeFilter, setActiveFilter] = useState(FilterType.ALL);
    const [selectedAccountId, setSelectedAccountId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [accountsModalVisible, setAccountsModalVisible] = useState(false);

    // V3 Purpose-Driven Workflow Modal
    const [workflowModalVisible, setWorkflowModalVisible] = useState(false);
    const [activeWorkflowActionId, setActiveWorkflowActionId] = useState(null);

    // Active Book calculation
    const activeBook = useMemo(() => {
        const books = envelope.books || [];
        return books.find(b => b.id === envelope.activeBookId) || books[0] || null;
    }, [envelope.books, envelope.activeBookId]);

    // Resolved Experience Profile for Active Book
    const experienceProfile = useMemo(() => {
        return resolveCashbookExperience(activeBook);
    }, [activeBook]);

    // Ensure activeTab matches profile navigation when book changes
    useEffect(() => {
        if (experienceProfile?.navigation?.length > 0) {
            const validKeys = experienceProfile.navigation.map(n => n.key);
            if (!validKeys.includes(activeTab)) {
                setActiveTab(validKeys[0]);
            }
        }
    }, [experienceProfile]);

    // Filter transactions strictly by active book (Strict Book Isolation)
    const activeBookTransactions = useMemo(() => {
        if (!activeBook) return [];
        return (envelope.transactions || []).filter(t => t.bookId === activeBook.id);
    }, [envelope.transactions, activeBook]);

    // Running balance ledger computation for active book
    const runningLedgerData = useMemo(() => {
        return computeRunningLedger({
            transactions: activeBookTransactions,
            accounts: envelope.accounts,
            bookType: activeBook?.type || CashbookType.SAVINGS
        });
    }, [activeBookTransactions, envelope.accounts, activeBook]);

    // View Model for lists & summaries
    const viewModel = useMemo(() => {
        return buildCashbookViewModel({
            accounts: envelope.accounts,
            transactions: activeBookTransactions,
            activeFilter,
            selectedAccountId,
            searchQuery
        });
    }, [envelope.accounts, activeBookTransactions, activeFilter, selectedAccountId, searchQuery]);

    // Specialized V3 Dashboard Metrics
    const dashboardMetrics = useMemo(() => {
        if (!experienceProfile) return null;
        const currentDate = new Date().toISOString().split('T')[0];

        switch (experienceProfile.profileId) {
            case CashbookExperienceProfile.PERSONAL_FINANCE_BOOK:
            case CashbookExperienceProfile.REGULAR_INCOME_BOOK:
                return computePersonalDashboardMetrics({
                    transactions: activeBookTransactions,
                    accounts: envelope.accounts,
                    openingBalance: activeBook?.openingBalance,
                    currentDate
                });
            case CashbookExperienceProfile.HANDY_CASH_REGISTER:
                return computeHandyCashDashboardMetrics({
                    transactions: activeBookTransactions,
                    dailyClosings: envelope.dailyClosings,
                    openingBalance: activeBook?.openingBalance,
                    currentDate
                });
            case CashbookExperienceProfile.BUSINESS_OPERATIONS_CASHBOOK:
                return computeBusinessDashboardMetrics({
                    transactions: activeBookTransactions,
                    accounts: envelope.accounts,
                    currentDate
                });
            case CashbookExperienceProfile.LOANS_TAKEN_REGISTER:
                return computeLoanLiabilityDashboardMetrics({
                    transactions: activeBookTransactions,
                    currentDate
                });
            case CashbookExperienceProfile.LOANS_GIVEN_REGISTER:
                return computeLoanReceivableDashboardMetrics({
                    transactions: activeBookTransactions,
                    currentDate
                });
            case CashbookExperienceProfile.PROVIDENT_FUND_REGISTER:
                return computePFDashboardMetrics({
                    transactions: activeBookTransactions,
                    currentDate
                });
            default:
                return computePersonalDashboardMetrics({
                    transactions: activeBookTransactions,
                    accounts: envelope.accounts,
                    openingBalance: activeBook?.openingBalance,
                    currentDate
                });
        }
    }, [experienceProfile, activeBookTransactions, envelope.accounts, envelope.dailyClosings, activeBook]);

    const loadLedgerData = useCallback(async (modeToLoad = appMode) => {
        try {
            const env = await CashbookRepository.load({ mode: modeToLoad });
            setEnvelope(env);
        } catch (err) {
            console.error('Error loading cashbook ledger:', err);
            Alert.alert('Ledger Load Error', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [appMode]);

    useEffect(() => {
        const init = async () => {
            const savedMode = await CashbookRepository.getMode();
            setAppMode(savedMode);
            await loadLedgerData(savedMode);
        };
        init();
    }, [loadLedgerData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadLedgerData();
    };

    const handleToggleMode = async () => {
        const nextMode = appMode === CashbookAppMode.DEMO
            ? CashbookAppMode.PRODUCTION
            : CashbookAppMode.DEMO;
        setLoading(true);
        await CashbookRepository.setMode(nextMode);
        setAppMode(nextMode);
        await loadLedgerData(nextMode);
    };

    // Switch Active Book
    const handleSelectBook = async (bookId) => {
        try {
            await CashbookRepository.setActiveBookId(bookId, { mode: appMode });
            await loadLedgerData();
        } catch (err) {
            Alert.alert('Book Switch Error', err.message);
        }
    };

    // Create New Book
    const handleCreateBook = async (book) => {
        try {
            await CashbookRepository.saveBook(book, { mode: appMode });
            await CashbookRepository.setActiveBookId(book.id, { mode: appMode });
            await loadLedgerData();
        } catch (err) {
            Alert.alert('Create Book Error', err.message);
        }
    };

    // Save transaction handler
    const handleSaveTransaction = async (txn, isTransfer = false) => {
        try {
            if (isTransfer || txn.transactionType === TransactionType.TRANSFER) {
                await CashbookRepository.saveTransfer(txn, { mode: appMode });
            } else {
                await CashbookRepository.saveTransaction(txn, { mode: appMode });
            }
            await loadLedgerData();
        } catch (err) {
            Alert.alert('Save Error', err.message);
        }
    };

    // Save Daily Closing
    const handleSaveDailyClosing = async (record) => {
        try {
            await CashbookRepository.saveDailyClosing(record, { mode: appMode });
            Alert.alert('Daily Closing', 'Register for ' + record.date + ' has been saved and locked.');
            await loadLedgerData();
        } catch (err) {
            Alert.alert('Closing Error', err.message);
        }
    };

    // Void transaction handler
    const handleVoidTransaction = async (txnId, reason) => {
        try {
            await CashbookRepository.voidTransaction(txnId, { voidReason: reason }, { mode: appMode });
            await loadLedgerData();
        } catch (err) {
            Alert.alert('Void Error', err.message);
        }
    };

    // Save account & initial opening balance
    const handleSaveAccount = async (account, openingRecord) => {
        try {
            await CashbookRepository.saveAccount(account, { mode: appMode });
            if (openingRecord) {
                await CashbookRepository.saveTransaction(openingRecord, { mode: appMode });
            }
            await loadLedgerData();
        } catch (err) {
            Alert.alert('Account Save Error', err.message);
        }
    };

    // Quick action trigger from purpose dashboards
    const handleQuickAction = (actionId) => {
        console.log('[Cashbook] handleQuickAction called with:', actionId);
        if (actionId === 'COUNT_CASH' || actionId === 'CLOSE_DAY') {
            setActiveTab('CLOSING');
            return;
        }
        setActiveWorkflowActionId(actionId);
        setWorkflowModalVisible(true);
    };

    // Back navigation handler (Hardware back + Header back button)
    const handleBack = useCallback(() => {
        if (workflowModalVisible) {
            setWorkflowModalVisible(false);
            setActiveWorkflowActionId(null);
            return true;
        }
        if (addModalVisible) {
            setAddModalVisible(false);
            return true;
        }
        if (detailModalVisible) {
            setDetailModalVisible(false);
            setSelectedTransaction(null);
            return true;
        }
        if (accountsModalVisible) {
            setAccountsModalVisible(false);
            return true;
        }
        if (activeTab !== 'DASHBOARD') {
            setActiveTab('DASHBOARD');
            return true;
        }
        if (router.canGoBack()) {
            router.back();
            return true;
        }
        router.replace('/(tabs)');
        return true;
    }, [workflowModalVisible, addModalVisible, detailModalVisible, accountsModalVisible, activeTab, router]);

    useEffect(() => {
        const onBackPress = () => handleBack();
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [handleBack]);

    // Export CSV
    const handleExportCSV = async () => {
        try {
            const csv = CashbookExport.toCSV(envelope.accounts, activeBookTransactions);
            await Share.share({
                title: `FinLife_Cashbook_${activeBook?.name || 'Ledger'}_${new Date().toISOString().split('T')[0]}.csv`,
                message: csv
            });
        } catch (err) {
            Alert.alert('Export Failed', err.message);
        }
    };

    // Map tab icon
    const getTabIcon = (key, iconName) => {
        switch (iconName || key) {
            case 'Home':
            case 'DASHBOARD': return Home;
            case 'BookOpen':
            case 'LEDGER': return BookOpen;
            case 'Calendar':
            case 'CLOSING': return Calendar;
            case 'Wallet':
            case 'ACCOUNTS': return Wallet;
            case 'Store': return Store;
            case 'Briefcase': return Briefcase;
            case 'ArrowDownRight': return ArrowDownRight;
            case 'ArrowUpRight': return ArrowUpRight;
            case 'Shield': return Shield;
            case 'TrendingUp': return TrendingUp;
            case 'Layers':
            case 'SECTIONS': return Layers;
            default: return BookOpen;
        }
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={styles.loadingText}>Loading Purpose-Driven Ledger...</Text>
            </SafeAreaView>
        );
    }

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.container}>
                {/* Header Action Bar */}
                <View style={styles.topBar}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            onPress={handleBack}
                            style={styles.backBtn}
                            activeOpacity={0.7}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            accessibilityLabel="Go back"
                            accessibilityRole="button"
                        >
                            <ArrowLeft size={20} color="#F8FAFC" />
                        </TouchableOpacity>
                        <Text style={styles.screenTitle}>FinLife Cashbook</Text>
                    </View>
                    <View style={styles.topActions}>
                        <TouchableOpacity
                            onPress={handleExportCSV}
                            style={styles.iconActionBtn}
                            activeOpacity={0.7}
                        >
                            <Download size={16} color="#94A3B8" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleRefresh}
                            style={styles.iconActionBtn}
                            activeOpacity={0.7}
                        >
                            <RefreshCw size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Book Header Bar (Active Book Switcher) */}
                <BookHeaderBar
                    activeBook={activeBook}
                    books={envelope.books || []}
                    onSelectBook={handleSelectBook}
                    onCreateBook={handleCreateBook}
                />

                {/* Dynamic Segmented Tab Navigation from Experience Profile */}
                <View style={styles.navTabs}>
                    {(experienceProfile?.navigation || [
                        { key: 'DASHBOARD', label: 'Dashboard', iconName: 'Home' },
                        { key: 'LEDGER', label: 'Passbook', iconName: 'BookOpen' },
                        { key: 'CLOSING', label: 'Daily Closing', iconName: 'Calendar' },
                        { key: 'ACCOUNTS', label: 'Accounts', iconName: 'Wallet' }
                    ]).map(tab => {
                        const isActive = activeTab === tab.key;
                        const IconComp = getTabIcon(tab.key, tab.iconName);
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.navTab, isActive && styles.navTabActive]}
                                onPress={() => setActiveTab(tab.key)}
                            >
                                <IconComp size={13} color={isActive ? '#38BDF8' : '#94A3B8'} />
                                <Text style={[styles.navTabText, isActive && styles.navTabTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Tab: Purpose-Built Dashboard */}
                {activeTab === 'DASHBOARD' && (
                    <>
                        {experienceProfile?.profileId === CashbookExperienceProfile.HANDY_CASH_REGISTER ? (
                            <HandyCashDashboardView
                                metrics={dashboardMetrics}
                                profile={experienceProfile}
                                onQuickAction={handleQuickAction}
                                onNavigateTab={setActiveTab}
                                activeBook={activeBook}
                                recentTransactions={activeBookTransactions}
                                onSelectTransaction={(txn) => {
                                    setSelectedTransaction(txn);
                                    setDetailModalVisible(true);
                                }}
                            />
                        ) : experienceProfile?.profileId === CashbookExperienceProfile.BUSINESS_OPERATIONS_CASHBOOK ? (
                            <BusinessDashboardView
                                metrics={dashboardMetrics}
                                profile={experienceProfile}
                                onQuickAction={handleQuickAction}
                                onNavigateTab={setActiveTab}
                                activeBook={activeBook}
                                recentTransactions={activeBookTransactions}
                                onSelectTransaction={(txn) => {
                                    setSelectedTransaction(txn);
                                    setDetailModalVisible(true);
                                }}
                            />
                        ) : experienceProfile?.profileId === CashbookExperienceProfile.LOANS_TAKEN_REGISTER ||
                           experienceProfile?.profileId === CashbookExperienceProfile.LOANS_GIVEN_REGISTER ? (
                            <LoansDashboardView
                                metrics={dashboardMetrics}
                                profile={experienceProfile}
                                onQuickAction={handleQuickAction}
                                onNavigateTab={setActiveTab}
                                activeBook={activeBook}
                                recentTransactions={activeBookTransactions}
                                onSelectTransaction={(txn) => {
                                    setSelectedTransaction(txn);
                                    setDetailModalVisible(true);
                                }}
                            />
                        ) : experienceProfile?.profileId === CashbookExperienceProfile.PROVIDENT_FUND_REGISTER ? (
                            <PFDashboardView
                                metrics={dashboardMetrics}
                                profile={experienceProfile}
                                onQuickAction={handleQuickAction}
                                onNavigateTab={setActiveTab}
                                activeBook={activeBook}
                                recentTransactions={activeBookTransactions}
                                onSelectTransaction={(txn) => {
                                    setSelectedTransaction(txn);
                                    setDetailModalVisible(true);
                                }}
                            />
                        ) : (
                            <PersonalDashboardView
                                metrics={dashboardMetrics}
                                profile={experienceProfile}
                                onQuickAction={handleQuickAction}
                                onNavigateTab={setActiveTab}
                                activeBook={activeBook}
                                recentTransactions={activeBookTransactions}
                                onSelectTransaction={(txn) => {
                                    setSelectedTransaction(txn);
                                    setDetailModalVisible(true);
                                }}
                            />
                        )}
                    </>
                )}

                {/* Tab: Overview (or Household Sections) */}
                {(activeTab === 'OVERVIEW' || activeTab === 'SECTIONS') && (
                    <TransactionList
                        sections={viewModel.sections}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        onPressRow={(row) => {
                            setSelectedTransaction(row);
                            setDetailModalVisible(true);
                        }}
                        onAddPress={() => setAddModalVisible(true)}
                        ListHeaderComponent={
                            <View>
                                <BalanceSummaryCard
                                    summary={viewModel.balanceSummaryCard}
                                    appMode={appMode}
                                    onToggleMode={handleToggleMode}
                                    onManageAccounts={() => setAccountsModalVisible(true)}
                                />

                                <TransactionFilterBar
                                    activeFilter={activeFilter}
                                    onSelectFilter={setActiveFilter}
                                    accounts={viewModel.accounts}
                                    selectedAccountId={selectedAccountId}
                                    onSelectAccount={setSelectedAccountId}
                                    searchQuery={searchQuery}
                                    onSearchChange={setSearchQuery}
                                />
                            </View>
                        }
                    />
                )}

                {/* Tab: Universal Ledger Table View */}
                {activeTab === 'LEDGER' && (
                    <LedgerTableView
                        ledgerData={runningLedgerData}
                        bookType={activeBook?.type || CashbookType.SAVINGS}
                        onSelectRow={(row) => {
                            setSelectedTransaction(row);
                            setDetailModalVisible(true);
                        }}
                    />
                )}

                {/* Tab: Daily Closing Register & Denominations */}
                {activeTab === 'CLOSING' && (
                    <DailyClosingView
                        bookId={activeBook?.id || 'book_personal_savings'}
                        bookName={activeBook?.name || 'Cash Register'}
                        dayOpeningBalance={viewModel.balanceSummaryCard?.openingBalancePaise || '0'}
                        dayMoneyIn={viewModel.balanceSummaryCard?.totalIncomePaise || '0'}
                        dayMoneyOut={viewModel.balanceSummaryCard?.totalExpensePaise || '0'}
                        existingClosing={(envelope.dailyClosings || []).find(c => c.bookId === activeBook?.id && c.date === new Date().toISOString().split('T')[0])}
                        onSaveClosing={handleSaveDailyClosing}
                    />
                )}

                {/* Tab: Accounts & Balances */}
                {activeTab === 'ACCOUNTS' && (
                    <ScrollView style={styles.accountsTabContainer} showsVerticalScrollIndicator={false}>
                        <View style={styles.accountsTabHeader}>
                            <Text style={styles.accountsTabTitle}>REGISTERED ACCOUNTS</Text>
                            <TouchableOpacity
                                style={styles.manageAccountsBtn}
                                onPress={() => setAccountsModalVisible(true)}
                            >
                                <Plus size={14} color="#38BDF8" />
                                <Text style={styles.manageAccountsBtnText}>Add / Edit Account</Text>
                            </TouchableOpacity>
                        </View>

                        {viewModel.accounts.map((acc) => (
                            <View key={acc.id} style={styles.accountCard}>
                                <View style={styles.accountCardLeft}>
                                    <View style={styles.accountTypeCircle}>
                                        <Wallet size={16} color="#38BDF8" />
                                    </View>
                                    <View>
                                        <Text style={styles.accountCardName}>{acc.name}</Text>
                                        <Text style={styles.accountCardType}>{acc.type} • {acc.nature}</Text>
                                    </View>
                                </View>
                                <View style={styles.accountCardRight}>
                                    <Text style={styles.accountCardBalance}>{acc.formattedBalance || '₹0'}</Text>
                                    <Text style={styles.accountCardBalanceLabel}>Current Balance</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}

                {/* Floating Add Button */}
                {(activeTab === 'OVERVIEW' || activeTab === 'LEDGER' || activeTab === 'SECTIONS') && (
                    <TouchableOpacity
                        style={styles.fab}
                        onPress={() => setAddModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Plus size={24} color="#0F172A" />
                    </TouchableOpacity>
                )}

                {/* Adaptive Purpose-Driven Workflow Action Modal */}
                <WorkflowActionModal
                    visible={workflowModalVisible}
                    onClose={() => {
                        setWorkflowModalVisible(false);
                        setActiveWorkflowActionId(null);
                    }}
                    actionId={activeWorkflowActionId}
                    profile={experienceProfile}
                    accounts={viewModel.accounts}
                    activeBook={activeBook}
                    onSaveWorkflow={async (compiledTxn) => {
                        await handleSaveTransaction(compiledTxn);
                    }}
                />

                {/* Add Transaction Modal (Standard fallback) */}
                <AddTransactionModal
                    visible={addModalVisible}
                    onClose={() => setAddModalVisible(false)}
                    accounts={viewModel.accounts}
                    activeBook={activeBook}
                    onSave={handleSaveTransaction}
                />

                {/* Transaction Detail Modal */}
                <TransactionDetailModal
                    visible={detailModalVisible}
                    transaction={selectedTransaction}
                    onClose={() => {
                        setDetailModalVisible(false);
                        setSelectedTransaction(null);
                    }}
                    onVoid={handleVoidTransaction}
                />

                {/* Account Manage Modal */}
                <AccountManageModal
                    visible={accountsModalVisible}
                    accounts={viewModel.accounts}
                    onClose={() => setAccountsModalVisible(false)}
                    onSaveAccount={handleSaveAccount}
                />
            </View>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0F1D'
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0A0F1D',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12
    },
    loadingText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500'
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 36 : 10,
        paddingBottom: 8
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155'
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#F8FAFC',
        letterSpacing: -0.3
    },
    topActions: {
        flexDirection: 'row',
        gap: 10
    },
    iconActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155'
    },
    navTabs: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 3,
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    navTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 8,
        borderRadius: 9
    },
    navTabActive: {
        backgroundColor: '#1E293B'
    },
    navTabText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '600'
    },
    navTabTextActive: {
        color: '#38BDF8',
        fontWeight: '700'
    },
    accountsTabContainer: {
        flex: 1,
        paddingHorizontal: 16
    },
    accountsTabHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    accountsTabTitle: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6
    },
    manageAccountsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    manageAccountsBtnText: {
        color: '#38BDF8',
        fontSize: 12,
        fontWeight: '600'
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1E293B',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },
    accountCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    accountTypeCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center'
    },
    accountCardName: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700'
    },
    accountCardType: {
        color: '#94A3B8',
        fontSize: 11,
        marginTop: 2
    },
    accountCardRight: {
        alignItems: 'flex-end'
    },
    accountCardBalance: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '800'
    },
    accountCardBalanceLabel: {
        color: '#64748B',
        fontSize: 10,
        marginTop: 2
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#38BDF8',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#38BDF8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10
    }
});