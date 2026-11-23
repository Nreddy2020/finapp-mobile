/**
 * app/(tabs)/cashbooks.js
 *
 * FinLife Universal Cashbook Experience (V3) — Purpose-Driven Financial Books.
 *
 * 4-Screen Universal Architecture:
 * - Screen 1: Master Directory (My Books / Templates) + Create Book
 * - Screen 2: Book Dashboard (purpose-built per book type)
 * - Screen 3: Transactions Ledger (search, filters, date-grouped list)
 * - Screen 4: Transaction Details (double-entry journal, void with audit reason)
 *
 * Invariants:
 * - Strictly ledger-computed metrics (integer paise / BigInt, no float math)
 * - Strict book isolation
 * - All "today" logic uses the device's LOCAL calendar date (never UTC)
 * - Save handlers THROW so the calling modal can show the error and stay open
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Share,
    ScrollView,
    Modal,
    BackHandler
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import {
    Plus,
    Download,
    Wallet,
    ArrowLeft,
    MoreVertical,
    Users,
    Repeat,
    X
} from 'lucide-react-native';

import {
    CashbookAppMode,
    CashbookType,
    TransactionType,
    CashbookExperienceProfile,
    resolveCashbookExperience,
    createCashbook
} from '../../services/cashbook/cashbookContracts.js';
import { CashbookRepository } from '../../services/cashbook/cashbookRepository.js';
import {
    computePersonalDashboardMetrics,
    computeHandyCashDashboardMetrics,
    computeBusinessDashboardMetrics,
    computeLoanLiabilityDashboardMetrics,
    computeLoanReceivableDashboardMetrics,
    computePFDashboardMetrics
} from '../../services/cashbook/cashbookEngine.js';
import { buildCashbookViewModel, FilterType } from '../../services/cashbook/cashbookViewModel.js';
import { CashbookExport } from '../../services/cashbook/cashbookExport.js';
import { todayLocal } from '../../services/cashbook/cashbookDates.js';
import { getBookVisualMeta } from '../../services/cashbook/cashbookPresentation.js';

// V3 Purpose-Built Screen Components
import CashbookDirectoryView from '../../components/cashbook/CashbookDirectoryView.js';
import PersonalDashboardView from '../../components/cashbook/PersonalDashboardView.js';
import HandyCashDashboardView from '../../components/cashbook/HandyCashDashboardView.js';
import BusinessDashboardView from '../../components/cashbook/BusinessDashboardView.js';
import LoansDashboardView from '../../components/cashbook/LoansDashboardView.js';
import PFDashboardView from '../../components/cashbook/PFDashboardView.js';

import DailyClosingView from '../../components/cashbook/DailyClosingView.js';
import BalanceSummaryCard from '../../components/cashbook/BalanceSummaryCard.js';
import TransactionFilterBar from '../../components/cashbook/TransactionFilterBar.js';
import TransactionList from '../../components/cashbook/TransactionList.js';
import AddTransactionModal from '../../components/cashbook/AddTransactionModal.js';
import TransactionDetailModal from '../../components/cashbook/TransactionDetailModal.js';
import AccountManageModal from '../../components/cashbook/AccountManageModal.js';
import WorkflowActionModal from '../../components/cashbook/WorkflowActionModal.js';
import CreateBookModal from '../../components/cashbook/CreateBookModal.js';

const VALID_TABS = ['DASHBOARD', 'TRANSACTIONS', 'ACCOUNTS', 'REPORTS', 'CLOSING'];

export default function CashbooksScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [appMode, setAppMode] = useState(CashbookAppMode.PRODUCTION);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Local calendar "today" (refreshed whenever the screen regains focus so it
    // never goes stale across midnight).
    const [today, setToday] = useState(todayLocal());

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

    // Sub-tab Navigation within Active Book
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
    const [createBookVisible, setCreateBookVisible] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

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

    const isHandyCashBook = experienceProfile?.profileId === CashbookExperienceProfile.HANDY_CASH_REGISTER;

    // Filter transactions strictly by active book (Strict Book Isolation)
    const activeBookTransactions = useMemo(() => {
        if (!activeBook) return [];
        return (envelope.transactions || []).filter(t => t.bookId === activeBook.id);
    }, [envelope.transactions, activeBook]);

    // Daily closings for the active book only
    const bookClosings = useMemo(() => {
        if (!activeBook) return [];
        return (envelope.dailyClosings || []).filter(c => c.bookId === activeBook.id);
    }, [envelope.dailyClosings, activeBook]);

    // Filter accounts by active book (per-book scoping + legacy fallback)
    const activeBookAccounts = useMemo(() => {
        if (!activeBook) return envelope.accounts || [];
        return (envelope.accounts || []).filter(a => a.bookId === activeBook.id || !a.bookId);
    }, [envelope.accounts, activeBook]);

    // View Model for lists & summaries
    const viewModel = useMemo(() => {
        return buildCashbookViewModel({
            accounts: activeBookAccounts,
            transactions: activeBookTransactions,
            activeFilter,
            selectedAccountId,
            searchQuery
        });
    }, [activeBookAccounts, activeBookTransactions, activeFilter, selectedAccountId, searchQuery]);

    // Till figures for the Daily Closing screen / Handy Cash dashboard.
    // (Previously the closing screen read non-existent summary fields and always showed ₹0.)
    const closingMetrics = useMemo(() => {
        if (!activeBook) return null;
        try {
            return computeHandyCashDashboardMetrics({
                transactions: activeBookTransactions,
                dailyClosings: bookClosings,
                openingBalance: activeBook?.openingBalance,
                currentDate: today
            });
        } catch (err) {
            console.error('Closing metrics error:', err);
            return null;
        }
    }, [activeBook, activeBookTransactions, bookClosings, today]);

    // Specialized V3 Dashboard Metrics
    const dashboardMetrics = useMemo(() => {
        if (!experienceProfile) return null;
        const currentDate = today;
        const personal = () => computePersonalDashboardMetrics({
            transactions: activeBookTransactions,
            accounts: activeBookAccounts,
            openingBalance: activeBook?.openingBalance,
            currentDate
        });

        try {
            switch (experienceProfile.profileId) {
                case CashbookExperienceProfile.PERSONAL_FINANCE_BOOK:
                case CashbookExperienceProfile.REGULAR_INCOME_BOOK:
                    return personal();
                case CashbookExperienceProfile.HANDY_CASH_REGISTER:
                    return closingMetrics;
                case CashbookExperienceProfile.BUSINESS_OPERATIONS_CASHBOOK:
                    return computeBusinessDashboardMetrics({
                        transactions: activeBookTransactions,
                        accounts: activeBookAccounts,
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
                    return personal();
            }
        } catch (err) {
            console.error('Dashboard metrics error:', err);
            return null;
        }
    }, [experienceProfile, activeBookTransactions, activeBookAccounts, activeBook, today, closingMetrics]);

    const appModeRef = useRef(appMode);
    appModeRef.current = appMode;
    const hasLoadedRef = useRef(false);

    const loadLedgerData = useCallback(async (modeToLoad) => {
        const mode = modeToLoad || appModeRef.current;
        try {
            const env = await CashbookRepository.load({ mode });
            setEnvelope(env);
            hasLoadedRef.current = true;
        } catch (err) {
            console.error('Error loading cashbook ledger:', err);
            Alert.alert('Ledger Load Error', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // One-time init (previously re-ran whenever appMode changed => double load).
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const savedMode = await CashbookRepository.getMode();
                if (!active) return;
                setAppMode(savedMode);
                appModeRef.current = savedMode;
                await loadLedgerData(savedMode);
            } catch (err) {
                if (active) {
                    setLoading(false);
                    Alert.alert('Ledger Load Error', err.message);
                }
            }
        })();
        return () => { active = false; };
    }, [loadLedgerData]);

    const resetBookScopedFilters = () => {
        setActiveFilter(FilterType.ALL);
        setSelectedAccountId(null);
        setSearchQuery('');
        setShowFilterPills(false);
    };

    const closeAllModals = () => {
        setAddModalVisible(false);
        setDetailModalVisible(false);
        setSelectedTransaction(null);
        setAccountsModalVisible(false);
        setCreateBookVisible(false);
        setMenuVisible(false);
        setWorkflowModalVisible(false);
        setActiveWorkflowActionId(null);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadLedgerData();
    };

    const handleToggleMode = async () => {
        const nextMode = appMode === CashbookAppMode.DEMO
            ? CashbookAppMode.PRODUCTION
            : CashbookAppMode.DEMO;
        try {
            setLoading(true);
            await CashbookRepository.setMode(nextMode);
            setAppMode(nextMode);
            appModeRef.current = nextMode;
            resetBookScopedFilters();
            setViewMode('DIRECTORY');
            setActiveTab('DASHBOARD');
            await loadLedgerData(nextMode);
        } catch (err) {
            setLoading(false);
            Alert.alert('Mode Switch Error', err.message);
        }
    };

    // Switch Active Book
    const handleSelectBook = async (bookId) => {
        try {
            await CashbookRepository.setActiveBookId(bookId, { mode: appMode });
            await loadLedgerData();
            resetBookScopedFilters();
            setViewMode('BOOK_VIEW');
            setActiveTab('DASHBOARD');
        } catch (err) {
            Alert.alert('Book Switch Error', err.message);
        }
    };

    // Create New Book. Accepts { name, type, description } (id optional).
    // Always goes through createCashbook() so the book carries its full type
    // configuration (balance mode, closing rules, denomination support ...).
    const handleCreateBook = async (input) => {
        try {
            const baseName = (input?.name || '').trim();
            if (!baseName) throw new Error('Book name is required');

            const existing = (envelope.books || []).map(b => (b.name || '').trim().toLowerCase());
            let name = baseName;
            let n = 2;
            while (existing.includes(name.toLowerCase())) {
                name = `${baseName} ${n++}`;
            }

            const book = createCashbook({
                id: input.id || `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name,
                type: input.type || CashbookType.CUSTOM,
                description: input.description || ''
            });
            await CashbookRepository.saveBook(book, { mode: appMode });
            await CashbookRepository.setActiveBookId(book.id, { mode: appMode });
            await loadLedgerData();
            resetBookScopedFilters();
            setViewMode('BOOK_VIEW');
            setActiveTab('DASHBOARD');
        } catch (err) {
            Alert.alert('Create Book Error', err.message);
            throw err;
        }
    };

    // Rename Book
    const handleRenameBook = async (bookId, newName) => {
        try {
            await CashbookRepository.renameBook(bookId, newName, { mode: appMode });
            await loadLedgerData();
        } catch (err) {
            Alert.alert('Rename Error', err.message);
            throw err;
        }
    };

    // Delete Book (Soft delete)
    const handleDeleteBook = async (bookId) => {
        try {
            const res = await CashbookRepository.deleteBook(bookId, { mode: appMode });
            await loadLedgerData();
            if (activeBook?.id === bookId) {
                setViewMode('DIRECTORY');
                setActiveTab('DASHBOARD');
            }
            return res;
        } catch (err) {
            Alert.alert('Delete Error', err.message);
            throw err;
        }
    };

    // Save transaction handler — THROWS on failure so the modal shows the error
    // and keeps the user's input instead of silently closing.
    const handleSaveTransaction = async (txn, isTransfer = false) => {
        if (isTransfer || txn.transactionType === TransactionType.TRANSFER) {
            await CashbookRepository.saveTransfer(txn, { mode: appMode });
        } else {
            await CashbookRepository.saveTransaction(txn, { mode: appMode });
        }
        await loadLedgerData();
    };

    // Save Daily Closing
    const handleSaveDailyClosing = async (record) => {
        try {
            await CashbookRepository.saveDailyClosing(record, { mode: appMode });
            await loadLedgerData();
            Alert.alert('Day Closed', `Register for ${record.date} has been saved and locked.`);
        } catch (err) {
            Alert.alert('Closing Error', err.message);
        }
    };

    // Void transaction handler — THROWS on failure (modal shows "Void Failed")
    const handleVoidTransaction = async (txnId, reason) => {
        await CashbookRepository.voidTransaction(txnId, { voidReason: reason }, { mode: appMode });
        await loadLedgerData();
    };

    // Save account & initial opening balance — THROWS on failure
    const handleSaveAccount = async (account, openingRecord) => {
        await CashbookRepository.saveAccount(account, { mode: appMode });
        if (openingRecord) {
            await CashbookRepository.saveTransaction(
                { ...openingRecord, bookId: openingRecord.bookId || activeBook?.id },
                { mode: appMode }
            );
        }
        await loadLedgerData();
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

    // Dashboards ask for tabs by name; map legacy/unknown names to real tabs
    // (a dashboard asked for 'LEDGER', which rendered a blank screen).
    const handleNavigateTab = (tab, options = {}) => {
        const resolved = tab === 'LEDGER' ? 'TRANSACTIONS' : tab;
        if (options?.filter) {
            if (options.filter === 'INCOME') setActiveFilter(FilterType.INCOME);
            else if (options.filter === 'EXPENSE') setActiveFilter(FilterType.EXPENSE);
            else if (options.filter === 'TRANSFER') setActiveFilter(FilterType.TRANSFER);
            setShowFilterPills(true);
        }
        setActiveTab(VALID_TABS.includes(resolved) ? resolved : 'DASHBOARD');
    };

    const openTransaction = (txn) => {
        setSelectedTransaction(txn);
        setDetailModalVisible(true);
    };

    // Back navigation handler (Hardware back + Header back button)
    const handleBack = useCallback(() => {
        if (menuVisible) { setMenuVisible(false); return true; }
        if (createBookVisible) { setCreateBookVisible(false); return true; }
        if (workflowModalVisible) {
            setWorkflowModalVisible(false);
            setActiveWorkflowActionId(null);
            return true;
        }
        if (addModalVisible) { setAddModalVisible(false); return true; }
        if (detailModalVisible) {
            setDetailModalVisible(false);
            setSelectedTransaction(null);
            return true;
        }
        if (accountsModalVisible) { setAccountsModalVisible(false); return true; }
        if (showFilterPills) { setShowFilterPills(false); return true; }
        if (viewMode === 'BOOK_VIEW') {
            if (activeTab !== 'DASHBOARD') {
                setActiveTab('DASHBOARD');
                return true;
            }
            setViewMode('DIRECTORY');
            setActiveTab('DASHBOARD');
            return true;
        }
        if (router.canGoBack()) {
            router.back();
            return true;
        }
        router.replace('/(tabs)');
        return true;
    }, [menuVisible, createBookVisible, workflowModalVisible, addModalVisible, detailModalVisible, accountsModalVisible, showFilterPills, activeTab, viewMode, router]);

    const handleBackRef = useRef(handleBack);
    handleBackRef.current = handleBack;

    // Hardware back + status bar are bound ONLY while this screen is focused.
    // Tabs keep screens mounted, so a permanent listener used to hijack the
    // Android back button on every other screen.
    useFocusEffect(
        useCallback(() => {
            setStatusBarStyle('dark'); // light page background => dark icons
            setToday(todayLocal());
            if (hasLoadedRef.current) {
                loadLedgerData(); // pick up postings made by other modules
            }
            const subscription = BackHandler.addEventListener('hardwareBackPress', () => handleBackRef.current());
            return () => {
                subscription.remove();
                setStatusBarStyle('light'); // restore the app's dark chrome
                closeAllModals();
            };
        }, [loadLedgerData])
    );

    // Export CSV
    const handleExportCSV = async () => {
        try {
            const csv = CashbookExport.toCSV(envelope.accounts, activeBookTransactions);
            await Share.share({
                title: `FinLife_Cashbook_${activeBook?.name || 'Ledger'}_${todayLocal()}.csv`,
                message: csv
            });
        } catch (err) {
            Alert.alert('Export Failed', err.message);
        }
    };

    const menuItems = [
        { key: 'ledger', label: 'View Transactions Ledger', icon: Repeat, onPress: () => setActiveTab('TRANSACTIONS') },
        { key: 'accounts', label: 'Manage Accounts', icon: Users, onPress: () => setAccountsModalVisible(true) },
        { key: 'reports', label: 'Financial Reports', icon: Wallet, onPress: () => setActiveTab('REPORTS') },
        { key: 'switch', label: 'Switch Book', icon: Repeat, onPress: () => setViewMode('DIRECTORY') },
        { key: 'export', label: 'Export CSV Ledger', icon: Download, onPress: handleExportCSV },
        ...(__DEV__ ? [{
            key: 'mode',
            label: appMode === CashbookAppMode.DEMO ? 'Switch to Production Data' : 'Switch to Demo Data',
            icon: Wallet,
            onPress: handleToggleMode
        }] : [])
    ];

    if (loading && !refreshing) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Loading your cashbooks...</Text>
            </View>
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // Screen 1: Master Directory View
    // ─────────────────────────────────────────────────────────────────
    if (viewMode === 'DIRECTORY') {
        return (
            <View style={styles.container}>
                <CashbookDirectoryView
                    books={envelope.books || []}
                    activeBookId={envelope.activeBookId}
                    accounts={envelope.accounts || []}
                    transactions={envelope.transactions || []}
                    topInset={insets.top}
                    onBack={handleBack}
                    onSelectBook={handleSelectBook}
                    onCreateBook={handleCreateBook}
                    onOpenCreateModal={() => setCreateBookVisible(true)}
                    onRenameBook={handleRenameBook}
                    onDeleteBook={handleDeleteBook}
                />

                <CreateBookModal
                    visible={createBookVisible}
                    existingNames={(envelope.books || []).map(b => b.name)}
                    onClose={() => setCreateBookVisible(false)}
                    onCreate={handleCreateBook}
                />
            </View>
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // Screen 2 & 3: Active Cashbook Experience
    // ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <View style={styles.container}>
                {/* Book Header Bar */}
                <View style={[styles.bookHeaderBar, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ArrowLeft size={20} color="#0F172A" />
                    </TouchableOpacity>

                    <Text style={styles.bookHeaderTitle} numberOfLines={1}>
                        {(() => {
                            const meta = getBookVisualMeta(activeBook);
                            const title = meta?.title || activeBook?.name || 'Personal';
                            return title.toLowerCase().includes('cashbook') ? title : `${title} Cashbook`;
                        })()}
                    </Text>

                    <TouchableOpacity
                        onPress={() => setMenuVisible(true)}
                        style={styles.menuBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityLabel="Book options"
                    >
                        <MoreVertical size={20} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Sub-Tabs for Ledger View (Screen 3): [ Transactions | Accounts | Reports ] */}
                {/* On Screen 2 (DASHBOARD), the tab bar is hidden to match the executive design mockup. */}
                {activeTab !== 'DASHBOARD' && (
                    <View style={styles.subTabBarContainer}>
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

                        {isHandyCashBook && (
                            <TouchableOpacity
                                style={[styles.subTabItem, activeTab === 'CLOSING' && styles.subTabItemActive]}
                                onPress={() => setActiveTab('CLOSING')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.subTabText, activeTab === 'CLOSING' && styles.subTabTextActive]}>
                                    Closing
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Sub-Tab 1: Purpose-Built Dashboard (Screen 2) */}
                {activeTab === 'DASHBOARD' && (
                    <>
                        {experienceProfile?.profileId === CashbookExperienceProfile.HANDY_CASH_REGISTER ? (
                            <HandyCashDashboardView
                                metrics={dashboardMetrics}
                                profile={experienceProfile}
                                onQuickAction={handleQuickAction}
                                onNavigateTab={handleNavigateTab}
                                activeBook={activeBook}
                                recentTransactions={activeBookTransactions}
                                onSelectTransaction={openTransaction}
                            />
                        ) : experienceProfile?.profileId === CashbookExperienceProfile.BUSINESS_OPERATIONS_CASHBOOK ? (
                            <BusinessDashboardView
                                metrics={dashboardMetrics}
                                profile={experienceProfile}
                                onQuickAction={handleQuickAction}
                                onNavigateTab={handleNavigateTab}
                                activeBook={activeBook}
                                recentTransactions={activeBookTransactions}
                                onSelectTransaction={openTransaction}
                            />
                        ) : experienceProfile?.profileId === CashbookExperienceProfile.LOANS_TAKEN_REGISTER ||
                           experienceProfile?.profileId === CashbookExperienceProfile.LOANS_GIVEN_REGISTER ? (
                            <LoansDashboardView
                                metrics={dashboardMetrics}
                                profile={experienceProfile}
                                onQuickAction={handleQuickAction}
                                onNavigateTab={handleNavigateTab}
                                activeBook={activeBook}
                                recentTransactions={activeBookTransactions}
                                onSelectTransaction={openTransaction}
                            />
                        ) : experienceProfile?.profileId === CashbookExperienceProfile.PROVIDENT_FUND_REGISTER ? (
                            <PFDashboardView
                                metrics={dashboardMetrics}
                                profile={experienceProfile}
                                onQuickAction={handleQuickAction}
                                onNavigateTab={handleNavigateTab}
                                activeBook={activeBook}
                                recentTransactions={activeBookTransactions}
                                onSelectTransaction={openTransaction}
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
                                onNavigateTab={handleNavigateTab}
                                onAddTransaction={() => setAddModalVisible(true)}
                                onSelectTransaction={openTransaction}
                            />
                        )}
                    </>
                )}

                {/* Sub-Tab 2: Transactions Ledger (Screen 3) */}
                {activeTab === 'TRANSACTIONS' && (
                    <View style={styles.transactionsTabContainer}>
                        {/* Collapsible Filter Bar ABOVE the transaction list */}
                        {showFilterPills && (
                            <TransactionFilterBar
                                activeFilter={activeFilter}
                                onSelectFilter={setActiveFilter}
                                accounts={viewModel.accounts}
                                selectedAccountId={selectedAccountId}
                                onSelectAccount={setSelectedAccountId}
                            />
                        )}

                        {/* Date Grouped Transaction SectionList with built-in search bar */}
                        <TransactionList
                            sections={viewModel.sections}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            onPressRow={(row) => {
                                setSelectedTransaction(row);
                                setDetailModalVisible(true);
                            }}
                            onAddPress={() => setAddModalVisible(true)}
                            onFilter={() => setShowFilterPills(!showFilterPills)}
                            filterActive={showFilterPills || activeFilter !== FilterType.ALL || !!selectedAccountId}
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
                    <ScrollView
                        style={styles.accountsTabContainer}
                        contentContainerStyle={styles.tabScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
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

                        {viewModel.accounts.length === 0 && (
                            <View style={styles.emptyAccountsBox}>
                                <Text style={styles.emptyAccountsTitle}>No accounts yet</Text>
                                <Text style={styles.emptyAccountsText}>
                                    Add a bank, cash or wallet account to start recording transactions in this book.
                                </Text>
                            </View>
                        )}

                        {viewModel.accounts.map((acc) => {
                            const typeLabels = {
                                BANK: 'Bank Account',
                                CASH: 'Cash in Hand',
                                WALLET: 'UPI / Wallet',
                                CREDIT_CARD: 'Credit Card',
                                LOAN: 'Loan Account',
                                INVESTMENT: 'Investment',
                            };
                            const natureLabels = {
                                ASSET: 'Asset',
                                LIABILITY: 'Liability',
                                EQUITY: 'Equity',
                            };
                            const typeDisplay = typeLabels[acc.type] || acc.type;
                            const natureDisplay = natureLabels[acc.nature] || acc.nature;
                            const isZero = acc.formattedBalance === '₹0' || acc.formattedBalance === '₹ 0';
                            return (
                                <View key={acc.id} style={styles.accountCard}>
                                    <View style={styles.accountCardLeft}>
                                        <View style={styles.accountTypeCircle}>
                                            <Wallet size={16} color="#6366F1" />
                                        </View>
                                        <View>
                                            <Text style={styles.accountCardName}>{acc.name}</Text>
                                            <Text style={styles.accountCardType}>{typeDisplay} • {natureDisplay}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.accountCardRight}>
                                        <Text style={[
                                            styles.accountCardBalance,
                                            acc.isNegative && styles.accountCardBalanceNegative,
                                            isZero && styles.accountCardBalanceZero
                                        ]}>
                                            {acc.formattedBalance || '₹0'}
                                        </Text>
                                        <Text style={styles.accountCardBalanceLabel}>Current Balance</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                )}

                {/* Sub-Tab 4: Reports View */}
                {activeTab === 'REPORTS' && (
                    <ScrollView
                        style={styles.reportsTabContainer}
                        contentContainerStyle={styles.tabScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
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
                        key={`${activeBook?.id}_${today}_${closingMetrics ? closingMetrics.isLocked : ''}`}
                        bookId={activeBook?.id || 'book_personal_savings'}
                        bookName={activeBook?.name || 'Cash Register'}
                        todayDate={today}
                        dayOpeningBalance={closingMetrics?.openingCashPaise || '0'}
                        dayMoneyIn={closingMetrics?.cashReceivedTodayPaise || '0'}
                        dayMoneyOut={closingMetrics?.cashPaidTodayPaise || '0'}
                        existingClosing={bookClosings.find(c => c.date === today) || null}
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
                    onAddAccount={() => {
                        setAddModalVisible(false);
                        setAccountsModalVisible(true);
                    }}
                />

                {/* Transaction Detail Modal (Screen 4 with Double-Entry Table) */}
                <TransactionDetailModal
                    visible={detailModalVisible}
                    transaction={selectedTransaction}
                    accounts={envelope.accounts || []}
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
                    bookId={activeBook?.id}
                    onClose={() => setAccountsModalVisible(false)}
                    onSaveAccount={handleSaveAccount}
                />

                {/* Book options sheet (Alert.alert only shows 3 buttons on Android) */}
                <Modal
                    visible={menuVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setMenuVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.menuOverlay}
                        activeOpacity={1}
                        onPress={() => setMenuVisible(false)}
                    >
                        <View style={[styles.menuSheet, { paddingBottom: insets.bottom + 12 }]}>
                            <View style={styles.menuSheetHeader}>
                                <Text style={styles.menuSheetTitle} numberOfLines={1}>
                                    {activeBook?.name || 'Cashbook'} options
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setMenuVisible(false)}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                    accessibilityLabel="Close menu"
                                >
                                    <X size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            {menuItems.map((item) => {
                                const ItemIcon = item.icon;
                                return (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={styles.menuItem}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            setMenuVisible(false);
                                            setTimeout(item.onPress, 150);
                                        }}
                                    >
                                        <ItemIcon size={18} color="#6366F1" />
                                        <Text style={styles.menuItemText}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                            <Text style={styles.menuFootnote}>
                                Data set: {appMode === CashbookAppMode.DEMO ? 'Demo' : 'Production'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        </View>
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
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 8,
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
    subTabScroll: {
        flexGrow: 0,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0'
    },
    subTabBar: {
        flexDirection: 'row',
        paddingHorizontal: 16
    },
    tabScrollContent: {
        paddingBottom: 48
    },
    emptyAccountsBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        marginBottom: 12
    },
    emptyAccountsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4
    },
    emptyAccountsText: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'flex-end'
    },
    menuSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 16
    },
    menuSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    menuSheetTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginRight: 12
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A'
    },
    menuFootnote: {
        marginTop: 12,
        fontSize: 11,
        color: '#94A3B8',
        textAlign: 'center'
    },
    subTabBarContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingHorizontal: 16
    },
    subTabItem: {
        flex: 1,
        paddingVertical: 12,
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
        bottom: 24,
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
    accountCardBalanceNegative: {
        color: '#EF4444'
    },
    accountCardBalanceZero: {
        color: '#94A3B8'
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
