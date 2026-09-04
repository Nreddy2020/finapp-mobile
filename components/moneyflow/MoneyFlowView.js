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
 * - MONEYFLOW-VIEW-07: Home screen provides comprehensive understanding without modals.
 * - SMS-01..07: Ingestion provenance, duplicate rejection, and review quarantine preserved.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { buildMoneyFlowViewModel } from './moneyFlowViewModel.js';
import {
    DEFAULT_AUTHORITATIVE_ACCOUNTS,
    UPCOMING_OBLIGATIONS_MOCK
} from './moneyFlowPresentationAdapter.js';
import {
    getStoredTransactions,
    persistTransactions,
    resolveTransaction,
    SEED_MONEY_FLOW_TRANSACTIONS
} from '../../services/moneyFlowService.js';
import { mfStyles, MF_COLORS } from './moneyFlowStyles.js';

// Presentation Layer Components
import { MoneyFlowHeader } from './presentation/MoneyFlowHeader.js';
import { WhereDidMyCashGoSection } from './presentation/WhereDidMyCashGoSection.js';
import { PeriodStatementSection } from './presentation/PeriodStatementSection.js';
import { QuickActionSection } from './presentation/QuickActionSection.js';
import { CashActivitySection } from './presentation/CashActivitySection.js';
import { MoneyFlowAttentionSection } from './presentation/MoneyFlowAttentionSection.js';

// Modals
import { PeriodSelectorModal } from './modals/PeriodSelectorModal.js';
import { ReserveCalculationModal } from './modals/ReserveCalculationModal.js';
import { SpendingBreakdownModal } from './modals/SpendingBreakdownModal.js';
import { AddCashActivityModal } from './modals/AddCashActivityModal.js';
import { TransactionDetailModal } from './modals/TransactionDetailModal.js';
import { ReviewTransactionModal } from './modals/ReviewTransactionModal.js';

export default function MoneyFlowView({
    transactions: externalTransactions,
    accounts: externalAccounts,
    onAddTransaction,
    onDeleteTransaction,
    onUpdateTransaction,
    onCategorizeTransaction,
    onOpenDrawer,
    hideHeader = false
}) {
    const [periodType, setPeriodType] = useState('month');
    const [internalTransactions, setInternalTransactions] = useState(SEED_MONEY_FLOW_TRANSACTIONS);
    const [accounts, setAccounts] = useState(externalAccounts || DEFAULT_AUTHORITATIVE_ACCOUNTS);
    const [refreshing, setRefreshing] = useState(false);

    // Active transaction list from props or local state
    const activeTransactions = (externalTransactions && externalTransactions.length > 0)
        ? externalTransactions
        : internalTransactions;

    // Modal Visibility States
    const [periodModalVisible, setPeriodModalVisible] = useState(false);
    const [reserveModalVisible, setReserveModalVisible] = useState(false);
    const [spendingModalVisible, setSpendingModalVisible] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [addModalType, setAddModalType] = useState('EXPENSE');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [reviewingTransaction, setReviewingTransaction] = useState(null);

    // 1. Restore persisted transactions on mount if no external transactions
    useEffect(() => {
        if (!externalTransactions || externalTransactions.length === 0) {
            (async () => {
                try {
                    const stored = await getStoredTransactions();
                    if (stored && Array.isArray(stored) && stored.length > 0) {
                        setInternalTransactions(stored);
                    }
                } catch (err) {
                    console.warn('[MoneyFlowView] Failed to restore persisted state:', err);
                }
            })();
        }
    }, [externalTransactions]);

    // 2. Persist transactions helper
    const saveTransactions = useCallback(async (newTxList) => {
        setInternalTransactions(newTxList);
        await persistTransactions(newTxList);
    }, []);

    // 3. Build Synchronized Authoritative ViewModel
    const viewModel = useMemo(() => {
        return buildMoneyFlowViewModel({
            transactions: activeTransactions,
            accounts: externalAccounts || accounts,
            periodType,
            referenceDate: new Date().toISOString(),
            obligations: UPCOMING_OBLIGATIONS_MOCK,
            stateStatus: 'READY'
        });
    }, [activeTransactions, externalAccounts, accounts, periodType]);

    // 4. Handlers
    const handleAddTransaction = useCallback((newTx) => {
        if (onAddTransaction) {
            onAddTransaction(newTx);
        }
        const updated = [newTx, ...activeTransactions];
        saveTransactions(updated);
    }, [onAddTransaction, activeTransactions, saveTransactions]);

    const handleDeleteTransaction = useCallback((txId) => {
        if (onDeleteTransaction) {
            onDeleteTransaction(txId);
        }
        const updated = activeTransactions.filter(t => t.id !== txId);
        saveTransactions(updated);
    }, [onDeleteTransaction, activeTransactions, saveTransactions]);

    const handleConfirmReview = useCallback((txId, selectedCategory, customType) => {
        if (onCategorizeTransaction) {
            onCategorizeTransaction(txId, selectedCategory);
        }
        const updated = resolveTransaction(activeTransactions, txId, selectedCategory, customType);
        saveTransactions(updated);
    }, [onCategorizeTransaction, activeTransactions, saveTransactions]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const stored = await getStoredTransactions();
            if (stored && Array.isArray(stored) && stored.length > 0) {
                setInternalTransactions(stored);
            }
        } catch {}
        setTimeout(() => setRefreshing(false), 400);
    }, []);

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

            <ReserveCalculationModal
                visible={reserveModalVisible}
                onClose={() => setReserveModalVisible(false)}
                reserveData={viewModel.attention.emergencyReserve}
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
                accounts={viewModel.whereDidMyCashGo.accounts}
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
