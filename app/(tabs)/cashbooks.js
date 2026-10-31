/**
 * app/(tabs)/cashbooks.js
 * 
 * FinLife Universal Cashbook Experience (V3) — Purpose-Driven Financial Books.
 * 
 * Implements the complete 4-Screen Universal Architecture:
 * - Screen 1: Master Directory (Cashbooks / My Books / Templates)
 * - Screen 2: Book Dashboard (Hero Closing Balance, 2x2 Metric Grid, Account Balances, Add Pill)
 * - Screen 3: Transactions Ledger (Sub-tabs, Search with Filter Funnel, Date-grouped List)
 * - Screen 4: Transaction Details (Hero, Key-Value Metadata, Expandable Double-Entry Table & Balanced Entry Status)
 * 
 * Invariants:
 * - Strictly truthful ledger-computed metrics (no arbitrary floating point calculations)
 * - Strict book isolation
 * - Non-lossy double-entry journal lines validation & presentation
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
    TextInput,
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
    ArrowLeft,
    MoreVertical,
    Search,
    Filter,
    X
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

// V3 Purpose-Built Screen Components
import CashbookDirectoryView from '../../components/cashbook/CashbookDirectoryView.js';
import PersonalDashboardView from '../../components/cashbook/PersonalDashboardView.js';
import HandyCashDashboardView from '../../components/cashbook/HandyCashDashboardView.js';
import BusinessDashboardView from '../../components/cashbook/BusinessDashboardView.js';
import LoansDashboardView from '../../components/cashbook/LoansDashboardView.js';
import PFDashboardView from '../../components/cashbook/PFDashboardView.js';

import BookHeaderBar from '../../components/cashbook/BookHeaderBar.js';
import LedgerTableView from '../../components/cashbook/LedgerTableView.js';
import DailyClosingView from '../../components/cashbook/DailyClosingView.js';
import BalanceSummaryCard from '../../components/cashbook/BalanceSummaryCard.js';
import TransactionFilterBar from '../../components/cashbook/TransactionFilterBar.js';
import TransactionList from '../../components/cashbook/TransactionList.js';
import AddTransactionModal from '../../components/cashbook/AddTransactionModal.js';
import TransactionDetailModal from '../../components/cashbook/TransactionDetailModal.js';
import AccountManageModal from '../../components/cashbook/AccountManageModal.js';
import WorkflowActionModal from '../../components/cashbook/WorkflowActionModal.js';

export default function CashbooksScreen() {
    const router = useRouter();
    const [appMode, setAppMode] = useState(CashbookAppMode.PRODUCTION);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // View Hierarchy: 'DIRECTORY' (Screen 1) | 'BOOK_VIEW' (Screen 2 / 3)
    const [viewMode, setViewMode] = useState('DIRECTORY');

    // Envelope & multi-book state
    const [envelope, setEnvelope] = useState({
        books: [],
        activeBookId: 'book_personal_savings',
        accounts: [],
        transactions: [],
        dailyClosings: [],
        auditLog: []
    });

    // Sub-tab Navigation within Active Book: 'DASHBOARD' | 'TRANSACTIONS' | 'ACCOUNTS' | 'REPORTS'
    const [activeTab, setActiveTab] = useState('DASHBOARD');

    // UI filters & Search for Transactions Ledger
    const [activeFilter, setActiveFilter] = useState(FilterType.ALL);
    const [selectedAccountId, setSelectedAccountId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilterPills, setShowFilterPills] = useState(false);

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
            setViewMode('BOOK_VIEW');
            setActiveTab('DASHBOARD');
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
            setViewMode('BOOK_VIEW');
            setActiveTab('DASHBOARD');
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
        if (viewMode === 'BOOK_VIEW') {
            if (activeTab !== 'DASHBOARD') {
                setActiveTab('DASHBOARD');
                return true;
            }
            setViewMode('DIRECTORY');
            return true;
        }
        if (router.canGoBack()) {
            router.back();
            return true;
        }
        router.replace('/(tabs)');
        return true;
    }, [workflowModalVisible, addModalVisible, detailModalVisible, accountsModalVisible, activeTab, viewMode, router]);

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

    const handleOpenBookMenu = () => {
        Alert.alert(
            `${activeBook?.name || 'Cashbook'} Options`,
            `Active Book: ${activeBook?.name}\nMode: ${appMode}`,
            [
                { text: 'Switch Book (Directory)', onPress: () => setViewMode('DIRECTORY') },
                { text: 'Export CSV Ledger', onPress: handleExportCSV },
                {
                    text: appMode === CashbookAppMode.DEMO ? 'Switch to Production' : 'Switch to Demo',
                    onPress: handleToggleMode
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Loading Purpose-Driven Ledger...</Text>
            </SafeAreaView>
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // Screen 1: Master Directory View
    // ─────────────────────────────────────────────────────────────────
    if (viewMode === 'DIRECTORY') {
        return (
            <AnimatedScreen style={styles.container}>
                <CashbookDirectoryView
                    books={envelope.books || []}
                    activeBookId={envelope.activeBookId}
                    accounts={envelope.accounts || []}
                    transactions={envelope.transactions || []}
                    onSelectBook={handleSelectBook}
                    onCreateBook={handleCreateBook}
                    onOpenCreateModal={() => setAccountsModalVisible(true)}
                />

                {/* Account & New Book Modal */}
                <AccountManageModal
                    visible={accountsModalVisible}
                    accounts={viewModel.accounts}
                    onClose={() => setAccountsModalVisible(false)}
                    onSaveAccount={handleSaveAccount}
                />
            </AnimatedScreen>
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // Screen 2 & 3: Active Cashbook Experience
    // ─────────────────────────────────────────────────────────────────
    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.container}>
                {/* Book Header Bar */}
                <View style={styles.bookHeaderBar}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ArrowLeft size={20} color="#0F172A" />
                    </TouchableOpacity>

                    <Text style={styles.bookHeaderTitle} numberOfLines={1}>
                        {activeBook?.name ? `${activeBook.name} Cashbook` : 'Personal Cashbook'}
                    </Text>

                    <TouchableOpacity
                        onPress={handleOpenBookMenu}
                        style={styles.menuBtn}
                        activeOpacity={0.7}
                    >
                        <MoreVertical size={20} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Sub-Tabs: [ Dashboard | Transactions | Accounts | Reports ] */}
                <View style={styles.subTabBar}>
                    <TouchableOpacity
                        style={[styles.subTabItem, activeTab === 'DASHBOARD' && styles.subTabItemActive]}
                        onPress={() => setActiveTab('DASHBOARD')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.subTabText, activeTab === 'DASHBOARD' && styles.subTabTextActive]}>
                            Dashboard
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.subTabItem, activeTab === 'TRANSACTIONS' && styles.subTabItemActive]}
                        onPress={() => setActiveTab('TRANSACTIONS')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.subTabText, activeTab === 'TRANSACTIONS' && styles.subTabTextActive]}>
                            Transactions
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.subTabItem, activeTab === 'ACCOUNTS' && styles.subTabItemActive]}
                        onPress={() => setActiveTab('ACCOUNTS')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.subTabText, activeTab === 'ACCOUNTS' && styles.subTabTextActive]}>
                            Accounts
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.subTabItem, activeTab === 'REPORTS' && styles.subTabItemActive]}
                        onPress={() => setActiveTab('REPORTS')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.subTabText, activeTab === 'REPORTS' && styles.subTabTextActive]}>
                            Reports
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Sub-Tab 1: Purpose-Built Dashboard (Screen 2) */}
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
                                summary={viewModel.balanceSummaryCard}
                                profile={experienceProfile}
                                activeBook={activeBook}
                                accounts={viewModel.accounts}
                                recentTransactions={activeBookTransactions}
                                onQuickAction={handleQuickAction}
                                onNavigateTab={setActiveTab}
                                onAddTransaction={() => setAddModalVisible(true)}
                                onSelectTransaction={(txn) => {
                                    setSelectedTransaction(txn);
                                    setDetailModalVisible(true);
                                }}
                            />
                        )}
                    </>
                )}

                {/* Sub-Tab 2: Transactions Ledger (Screen 3) */}
                {activeTab === 'TRANSACTIONS' && (
                    <View style={styles.transactionsTabContainer}>
                        {/* Search & Filter Funnel Bar */}
                        <View style={styles.searchBarRow}>
                            <View style={styles.searchInputContainer}>
                                <Search size={16} color="#94A3B8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search transactions..."
                                    placeholderTextColor="#94A3B8"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <X size={14} color="#94A3B8" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.filterFunnelBtn, showFilterPills && styles.filterFunnelBtnActive]}
                                onPress={() => setShowFilterPills(!showFilterPills)}
                                activeOpacity={0.7}
                            >
                                <Filter size={18} color={showFilterPills ? '#6366F1' : '#64748B'} />
                            </TouchableOpacity>
                        </View>

                        {/* Collapsible Filter Bar */}
                        {showFilterPills && (
                            <TransactionFilterBar
                                activeFilter={activeFilter}
                                onSelectFilter={setActiveFilter}
                                accounts={viewModel.accounts}
                                selectedAccountId={selectedAccountId}
                                onSelectAccount={setSelectedAccountId}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                            />
                        )}

                        {/* Date Grouped Transaction SectionList */}
                        <TransactionList
                            sections={viewModel.sections}
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            onPressRow={(row) => {
                                setSelectedTransaction(row);
                                setDetailModalVisible(true);
                            }}
                            onAddPress={() => setAddModalVisible(true)}
                        />

                        {/* Floating Add Pill Button */}
                        <TouchableOpacity
                            style={styles.floatingAddPill}
                            onPress={() => setAddModalVisible(true)}
                            activeOpacity={0.85}
                        >
                            <Plus size={18} color="#FFFFFF" />
                            <Text style={styles.floatingAddPillText}>Add Transaction</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Sub-Tab 3: Accounts View */}
                {activeTab === 'ACCOUNTS' && (
                    <ScrollView style={styles.accountsTabContainer} showsVerticalScrollIndicator={false}>
                        <View style={styles.accountsTabHeader}>
                            <Text style={styles.accountsTabTitle}>REGISTERED ACCOUNTS</Text>
                            <TouchableOpacity
                                style={styles.manageAccountsBtn}
                                onPress={() => setAccountsModalVisible(true)}
                            >
                                <Plus size={14} color="#6366F1" />
                                <Text style={styles.manageAccountsBtnText}>Add / Edit Account</Text>
                            </TouchableOpacity>
                        </View>

                        {viewModel.accounts.map((acc) => (
                            <View key={acc.id} style={styles.accountCard}>
                                <View style={styles.accountCardLeft}>
                                    <View style={styles.accountTypeCircle}>
                                        <Wallet size={16} color="#6366F1" />
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

                {/* Sub-Tab 4: Reports View */}
                {activeTab === 'REPORTS' && (
                    <ScrollView style={styles.reportsTabContainer} showsVerticalScrollIndicator={false}>
                        <BalanceSummaryCard
                            summary={viewModel.balanceSummaryCard}
                            appMode={appMode}
                            onToggleMode={handleToggleMode}
                            onManageAccounts={() => setAccountsModalVisible(true)}
                        />
                        <View style={styles.exportSection}>
                            <TouchableOpacity
                                style={styles.exportBtn}
                                onPress={handleExportCSV}
                                activeOpacity={0.8}
                            >
                                <Download size={16} color="#6366F1" />
                                <Text style={styles.exportBtnText}>Export Book CSV (Ledger)</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                )}

                {/* Sub-Tab 5: Daily Closing */}
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

                {/* Add Transaction Modal */}
                <AddTransactionModal
                    visible={addModalVisible}
                    onClose={() => setAddModalVisible(false)}
                    accounts={viewModel.accounts}
                    activeBook={activeBook}
                    onSave={handleSaveTransaction}
                />

                {/* Transaction Detail Modal (Screen 4 with Double-Entry Table) */}
                <TransactionDetailModal
                    visible={detailModalVisible}
                    transaction={selectedTransaction}
                    accounts={viewModel.accounts}
                    bookName={activeBook?.name || 'Personal'}
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
        backgroundColor: '#F8FAFC'
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12
    },
    loadingText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600'
    },
    bookHeaderBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 38 : 12,
        paddingBottom: 8,
        backgroundColor: '#F8FAFC'
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    bookHeaderTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.3
    },
    menuBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center'
    },
    subTabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingHorizontal: 16
    },
    subTabItem: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    subTabItemActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#6366F1'
    },
    subTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B'
    },
    subTabTextActive: {
        color: '#6366F1',
        fontWeight: '700'
    },
    transactionsTabContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    searchBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 10,
        backgroundColor: '#F8FAFC'
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: '#0F172A',
        padding: 0
    },
    filterFunnelBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    filterFunnelBtnActive: {
        borderColor: '#6366F1',
        backgroundColor: '#EEF2FF'
    },
    floatingAddPill: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 5
    },
    floatingAddPillText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    accountsTabContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16
    },
    accountsTabHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    accountsTabTitle: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.6
    },
    manageAccountsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    manageAccountsBtnText: {
        color: '#6366F1',
        fontSize: 12,
        fontWeight: '700'
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    accountCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    accountTypeCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center'
    },
    accountCardName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A'
    },
    accountCardType: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2
    },
    accountCardRight: {
        alignItems: 'flex-end'
    },
    accountCardBalance: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10B981'
    },
    accountCardBalanceLabel: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 2
    },
    reportsTabContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16
    },
    exportSection: {
        marginTop: 16,
        alignItems: 'center',
        marginBottom: 40
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#C7D2FE'
    },
    exportBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4F46E5'
    }
});
