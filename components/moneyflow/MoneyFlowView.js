/**
 * MoneyFlowView.js
 * 
 * AUTHORITATIVE FINLIFE PERSONAL MONEY FLOW (CASH ONLY)
 * Automated Personal Cash-Flow Statement & Decision System
 * 
 * Invariants:
 * - MONEYFLOW-VIEW-01: Every displayed financial value originates strictly from the ViewModel.
 * - MONEYFLOW-VIEW-02: Zero financial arithmetic inside JSX.
 * - MONEYFLOW-VIEW-03: All sections share synchronized period bounds.
 * - MONEYFLOW-VIEW-04: Transfers remain neutral to income/expense/net-movement.
 * - MONEYFLOW-VIEW-05: State updates recompute all sections from the same state.
 * - MONEYFLOW-VIEW-06: Non-ready states never show sample values.
 * - MONEYFLOW-VIEW-07: Pure cash-flow statement semantics (no competing banking dashboard).
 * - SMS-01..07: Ingestion provenance, duplicate rejection, and review quarantine preserved.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { buildMoneyFlowViewModel } from './moneyFlowViewModel.js';
import {
    getStoredTransactions,
    persistTransactions,
    resolveTransaction
} from '../../services/moneyFlowService.js';
import { smsIngestionService } from '../../services/sms/smsIngestionService.js';
import { mfStyles, MF_COLORS } from './moneyFlowStyles.js';

// Presentation Layer Components
import { MoneyFlowHeader } from './presentation/MoneyFlowHeader.js';
import { WhereDidMyCashGoSection } from './presentation/WhereDidMyCashGoSection.js';
import { PeriodStatementSection } from './presentation/PeriodStatementSection.js';
import { QuickActionSection } from './presentation/QuickActionSection.js';
import { CashActivitySection } from './presentation/CashActivitySection.js';

// Modals
import { PeriodSelectorModal } from './modals/PeriodSelectorModal.js';
import { SpendingBreakdownModal } from './modals/SpendingBreakdownModal.js';
import { AddCashActivityModal } from './modals/AddCashActivityModal.js';
import { TransactionDetailModal } from './modals/TransactionDetailModal.js';
import { ReviewTransactionModal } from './modals/ReviewTransactionModal.js';

export default function MoneyFlowView({
    transactions: controlledTransactions,
    accounts: controlledAccounts,
    onAddTransaction,
    onDeleteTransaction,
    onUpdateTransaction,
    onCategorizeTransaction,
    onOpenDrawer,
    hideHeader = false
}) {
    // Mode: Controlled if caller provides `transactions` prop, Uncontrolled otherwise
    const isControlled = controlledTransactions !== undefined;

    const [periodType, setPeriodType] = useState('month');
    const [internalTransactions, setInternalTransactions] = useState([]);
    const [accounts, setAccounts] = useState(controlledAccounts || []);
    const [isLoading, setIsLoading] = useState(!isControlled);
    const [refreshing, setRefreshing] = useState(false);

    // Active transaction list strictly based on controlled vs uncontrolled mode
    const activeTransactions = isControlled ? controlledTransactions : internalTransactions;

    // Modal Visibility States
    const [periodModalVisible, setPeriodModalVisible] = useState(false);
    const [spendingModalVisible, setSpendingModalVisible] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [addModalType, setAddModalType] = useState('EXPENSE');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [reviewingTransaction, setReviewingTransaction] = useState(null);

    // 1. Synchronize authoritative accounts from props into state & SMS Ingestion Service
    useEffect(() => {
        if (controlledAccounts && Array.isArray(controlledAccounts)) {
            setAccounts(controlledAccounts);
            smsIngestionService.setAccounts(controlledAccounts);
        }
    }, [controlledAccounts]);

    // 2. Uncontrolled Mode: Restore persisted transactions on mount & subscribe to live SMS
    useEffect(() => {
        if (!isControlled) {
            let isMounted = true;
            (async () => {
                setIsLoading(true);
                try {
                    const stored = await getStoredTransactions();
                    if (isMounted && stored && Array.isArray(stored)) {
                        setInternalTransactions(stored);
                    }
                } catch (err) {
                    console.warn('[MoneyFlowView] Failed to restore persisted state:', err);
                } finally {
                    if (isMounted) setIsLoading(false);
                }
            })();

            // Configure SMS Ingestion Service with current authoritative accounts
            const currentAccs = controlledAccounts || accounts;
            if (currentAccs && currentAccs.length > 0) {
                smsIngestionService.setAccounts(currentAccs);
            }

            // Subscribe to real-time SMS Ingestion events
            const unsubscribe = smsIngestionService.addListener((event) => {
                if (event.type === 'TRANSACTION_INGESTED' && event.allTransactions) {
                    setInternalTransactions(event.allTransactions);
                }
            });

            return () => {
                isMounted = false;
                unsubscribe();
            };
        }
    }, [isControlled]);

    // 3. Uncontrolled Mode: Persist transactions helper
    const saveTransactions = useCallback(async (newTxList) => {
        setInternalTransactions(newTxList);
        await persistTransactions(newTxList);
    }, []);

    // 3. Build Synchronized Authoritative ViewModel
    const viewModel = useMemo(() => {
        return buildMoneyFlowViewModel({
            transactions: activeTransactions,
            accounts: controlledAccounts || accounts,
            periodType,
            referenceDate: new Date().toISOString(),
            isLoading
        });
    }, [activeTransactions, controlledAccounts, accounts, periodType, isLoading]);

    // 4. Handlers
    const handleAddTransaction = useCallback((newTx) => {
        if (isControlled && onAddTransaction) {
            onAddTransaction(newTx);
            return;
        }
        const updated = [newTx, ...activeTransactions];
        saveTransactions(updated);
    }, [isControlled, onAddTransaction, activeTransactions, saveTransactions]);

    const handleDeleteTransaction = useCallback((txId) => {
        if (isControlled && onDeleteTransaction) {
            onDeleteTransaction(txId);
            return;
        }
        const updated = activeTransactions.filter(t => t.id !== txId);
        saveTransactions(updated);
    }, [isControlled, onDeleteTransaction, activeTransactions, saveTransactions]);

    const handleConfirmReview = useCallback((txId, selectedCategory, customType) => {
        if (isControlled && onCategorizeTransaction) {
            onCategorizeTransaction(txId, selectedCategory);
            return;
        }
        const updated = resolveTransaction(activeTransactions, txId, selectedCategory, customType);
        saveTransactions(updated);
    }, [isControlled, onCategorizeTransaction, activeTransactions, saveTransactions]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (!isControlled) {
            try {
                const stored = await getStoredTransactions();
                if (stored && Array.isArray(stored)) {
                    setInternalTransactions(stored);
                }
            } catch {}
        }
        setTimeout(() => setRefreshing(false), 400);
    }, [isControlled]);

    return (
        <View style={mfStyles.container}>
            {/* Header */}
            {!hideHeader && (
                <MoneyFlowHeader
                    periodLabel={viewModel.period.label}
                    onOpenPeriodModal={() => setPeriodModalVisible(true)}
                    onOpenMenu={onOpenDrawer}
                />
            )}

            <ScrollView
                contentContainerStyle={mfStyles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={MF_COLORS.primaryBlueLight}
                    />
                }
            >
                {/* Layer 1: Primary Visual Anchor - Where Did My Cash Go? */}
                <WhereDidMyCashGoSection
                    data={viewModel.whereDidMyCashGo}
                    onOpenBreakdown={() => setSpendingModalVisible(true)}
                />

                {/* Layer 2: Period Cash Flow Statement */}
                <PeriodStatementSection data={viewModel.periodStatement} />

                {/* Layer 3: Quick Action Section */}
                <QuickActionSection
                    onOpenAddModal={(type) => {
                        setAddModalType(type || 'EXPENSE');
                        setAddModalVisible(true);
                    }}
                />

                {/* Layer 4: Cash Activity Journal with Needs Review Queue */}
                <CashActivitySection
                    data={viewModel.recentActivity}
                    onOpenAddModal={(type) => {
                        setAddModalType(type || 'EXPENSE');
                        setAddModalVisible(true);
                    }}
                    onSelectTransaction={(tx) => setSelectedTransaction(tx)}
                    onReviewTransaction={(tx) => setReviewingTransaction(tx)}
                />
            </ScrollView>

            {/* Modals */}
            <PeriodSelectorModal
                visible={periodModalVisible}
                onClose={() => setPeriodModalVisible(false)}
                selectedPeriod={periodType}
                onSelectPeriod={(p) => setPeriodType(p)}
            />

            <SpendingBreakdownModal
                visible={spendingModalVisible}
                onClose={() => setSpendingModalVisible(false)}
                data={viewModel.spendingBreakdown}
            />

            <AddCashActivityModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onSave={handleAddTransaction}
                accounts={accounts}
                initialType={addModalType}
            />

            <TransactionDetailModal
                visible={Boolean(selectedTransaction)}
                onClose={() => setSelectedTransaction(null)}
                transaction={selectedTransaction}
                onDelete={handleDeleteTransaction}
            />

            <ReviewTransactionModal
                visible={Boolean(reviewingTransaction)}
                onClose={() => setReviewingTransaction(null)}
                transaction={reviewingTransaction}
                onConfirmReview={handleConfirmReview}
            />
        </View>
    );
}
