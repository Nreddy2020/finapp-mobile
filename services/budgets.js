/**
 * services/budgets.js
 * 
 * FinLife Authoritative Budget Service & Control Center Engine.
 * 
 * Boundaries & Invariants:
 * 1. Separation of Ownership:
 *    - BudgetService owns budget definitions, limits, period keys, and lifecycle (DRAFT -> ACTIVE -> ARCHIVED).
 *    - CashbookRepository owns financial transactions.
 *    - CommitmentsService owns recurring obligations.
 *    - BankingService owns bank accounts and credit facilities.
 * 2. Strict Read-Only Derivation:
 *    - getBudgetsWithActuals() derives spentPaise, utilizationBps, and overspentPaise strictly at runtime.
 *    - It NEVER writes spending values or derived metrics back into stored budget records.
 * 3. Exact Integer-Paise Precision:
 *    - All limits and spending are processed in 64-bit BigInt paise.
 *    - Storage uses string-serialized integers for JSON safety.
 * 4. Atomic Cache Invalidation:
 *    - Successfully persisting budget mutations triggers Reports V1 and Budget cache invalidation.
 *    - If storage commit fails, zero caches are invalidated and previous state is retained.
 */

import { loadData, saveData, STORAGE_KEYS } from './storage.js';
import {
    SourceAvailabilityStatus,
    BudgetLifecycleStatus,
    BUDGET_UTILIZATION_STATUS,
    resolveCanonicalCategoryGroup,
    calculateUtilizationBps,
    getUtilizationStatus,
    resolveBudgetPeriod,
    isDateInPeriod,
    toBigIntPaise,
    parsePaise,
    formatBigIntPaise,
    CATEGORY_TYPE_MAPPING
} from './budget/budgetContracts.js';
import { CashbookRepository } from './cashbook/cashbookRepository.js';
import { CommitmentsService } from './commitments/commitmentsService.js';

let customCacheInvalidationHook = null;

export function registerBudgetCacheInvalidationHook(fn) {
    customCacheInvalidationHook = fn;
}

async function invalidateCachesAfterMutation() {
    try {
        if (typeof customCacheInvalidationHook === 'function') {
            customCacheInvalidationHook();
        }
        const { ReportViewModel } = await import('./reports/reportViewModel.js');
        if (ReportViewModel && typeof ReportViewModel.clearCache === 'function') {
            ReportViewModel.clearCache();
        }
    } catch (_) {
        // Cache invalidation hook is non-fatal
    }
}

/**
 * Hydrates a stored budget entity into a runtime contract object.
 */
function hydrateBudget(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const id = String(raw.id || Date.now().toString());
    const category = String(raw.category || raw.name || 'Uncategorized').trim();
    const canonicalGroup = raw.canonicalGroup || resolveCanonicalCategoryGroup(category) || 'Other';
    
    // Parse limit in paise safely (supporting legacy limit / amount in rupees)
    const limitPaise = parsePaise(raw.limitPaise, raw.limit || raw.amount || 0);

    const periodKey = raw.periodKey || raw.period || null;
    const allocationType = raw.allocationType || raw.type || CATEGORY_TYPE_MAPPING[category] || 'Needs';
    const status = raw.status || BudgetLifecycleStatus.ACTIVE;
    const icon = raw.icon || 'Wallet';
    const color = raw.color || '#3B82F6';
    const createdAt = raw.createdAt || new Date().toISOString();
    const updatedAt = raw.updatedAt || createdAt;

    // Convert to standard rupees for backwards compatibility with legacy UI consumers
    const limitRupees = Number(limitPaise / 100n);

    return {
        id,
        category,
        canonicalGroup,
        limitPaise,
        limit: limitRupees,
        amount: limitRupees,
        periodKey,
        allocationType,
        type: allocationType,
        status,
        icon,
        color,
        createdAt,
        updatedAt,
        version: raw.version || 2
    };
}

/**
 * Serializes a runtime budget entity for storage (guaranteeing JSON BigInt safety).
 */
function serializeBudget(budget) {
    return {
        id: budget.id,
        category: budget.category,
        canonicalGroup: budget.canonicalGroup,
        limitPaise: budget.limitPaise.toString(),
        limit: budget.limit,
        amount: budget.amount,
        periodKey: budget.periodKey || null,
        allocationType: budget.allocationType,
        type: budget.type,
        status: budget.status,
        icon: budget.icon,
        color: budget.color,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
        version: 2
    };
}

export const BudgetService = {
    /**
     * Retrieves all active budgets matching the specified periodKey.
     * 
     * @param {string} [periodKey] Format 'YYYY-MM'. If omitted, returns all active budgets.
     * @param {Object} [options]
     * @param {boolean} [options.includeArchived] Include ARCHIVED budgets (default false)
     * @returns {Promise<Array<Object>>}
     */
    getBudgets: async (periodKey = null, options = {}) => {
        const rawList = await loadData(STORAGE_KEYS.BUDGETS, []) || [];
        const hydrated = rawList.map(hydrateBudget).filter(Boolean);

        return hydrated.filter(b => {
            if (!options.includeArchived && b.status === BudgetLifecycleStatus.ARCHIVED) {
                return false;
            }
            if (!periodKey) return true;
            return b.periodKey === periodKey || !b.periodKey || b.periodKey === 'RECURRING';
        });
    },

    /**
     * Creates or updates a budget definition atomically.
     * Validates input, prevents duplicate category entries for the same period,
     * persists atomically, and invalidates Reports/Budget caches upon success.
     * 
     * @param {Object} budgetData
     * @returns {Promise<Object>} The saved budget entity
     */
    saveBudget: async (budgetData) => {
        if (!budgetData || typeof budgetData !== 'object') {
            throw new Error('Invalid budget input: object expected');
        }

        const category = String(budgetData.category || budgetData.name || '').trim();
        if (!category) {
            throw new Error('Budget category is required');
        }

        const limitPaise = parsePaise(budgetData.limitPaise, budgetData.limit || budgetData.amount);
        if (limitPaise <= 0n) {
            throw new Error('Budget limit must be greater than zero');
        }

        const canonicalGroup = budgetData.canonicalGroup || resolveCanonicalCategoryGroup(category) || 'Other';
        const periodKey = budgetData.periodKey || budgetData.period || null;
        const allocationType = budgetData.allocationType || budgetData.type || CATEGORY_TYPE_MAPPING[category] || 'Needs';
        const nowIso = new Date().toISOString();

        const currentBudgets = await BudgetService.getBudgets(null, { includeArchived: true });

        // Idempotency: match by ID or (category + periodKey)
        const existingIndex = currentBudgets.findIndex(b => {
            if (budgetData.id && b.id === budgetData.id) return true;
            return (
                b.status === BudgetLifecycleStatus.ACTIVE &&
                b.category.toLowerCase() === category.toLowerCase() &&
                (b.periodKey === periodKey || (!b.periodKey && !periodKey))
            );
        });

        let targetId = budgetData.id || `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        let createdAt = nowIso;

        if (existingIndex >= 0) {
            targetId = currentBudgets[existingIndex].id;
            createdAt = currentBudgets[existingIndex].createdAt;
        }

        const newBudgetEntity = {
            id: targetId,
            category,
            canonicalGroup,
            limitPaise,
            limit: Number(limitPaise / 100n),
            amount: Number(limitPaise / 100n),
            periodKey,
            allocationType,
            type: allocationType,
            status: budgetData.status || BudgetLifecycleStatus.ACTIVE,
            icon: budgetData.icon || 'Wallet',
            color: budgetData.color || '#3B82F6',
            createdAt,
            updatedAt: nowIso,
            version: 2
        };

        let updatedList;
        if (existingIndex >= 0) {
            updatedList = [...currentBudgets];
            updatedList[existingIndex] = newBudgetEntity;
        } else {
            updatedList = [...currentBudgets, newBudgetEntity];
        }

        const serialized = updatedList.map(serializeBudget);
        const saveRes = await saveData(STORAGE_KEYS.BUDGETS, serialized);
        if (saveRes && saveRes.success === false) {
            throw saveRes.error || new Error('Failed to persist budget data');
        }

        // Invalidate caches strictly after successful persistence
        await invalidateCachesAfterMutation();

        return newBudgetEntity;
    },

    /**
     * Alias for saveBudget for backwards compatibility.
     */
    createBudget: async (budgetData) => {
        return await BudgetService.saveBudget(budgetData);
    },

    /**
     * Updates an existing budget definition.
     */
    updateBudget: async (updatedBudget) => {
        if (!updatedBudget || !updatedBudget.id) {
            throw new Error('Budget id is required for update');
        }
        return await BudgetService.saveBudget(updatedBudget);
    },

    /**
     * Archives a budget definition.
     * Preserves historical reporting references while marking it inactive for future periods.
     */
    archiveBudget: async (id) => {
        const currentBudgets = await BudgetService.getBudgets(null, { includeArchived: true });
        const target = currentBudgets.find(b => b.id === id);
        if (!target) {
            throw new Error(`Budget with id ${id} not found`);
        }

        target.status = BudgetLifecycleStatus.ARCHIVED;
        target.updatedAt = new Date().toISOString();

        const serialized = currentBudgets.map(serializeBudget);
        const saveRes = await saveData(STORAGE_KEYS.BUDGETS, serialized);
        if (saveRes && saveRes.success === false) {
            throw saveRes.error || new Error('Failed to persist budget data');
        }

        await invalidateCachesAfterMutation();
        return target;
    },

    /**
     * Deletes a budget definition.
     */
    deleteBudget: async (id) => {
        const currentBudgets = await BudgetService.getBudgets(null, { includeArchived: true });
        const remaining = currentBudgets.filter(b => b.id !== id);

        const serialized = remaining.map(serializeBudget);
        const saveRes = await saveData(STORAGE_KEYS.BUDGETS, serialized);
        if (saveRes && saveRes.success === false) {
            throw saveRes.error || new Error('Failed to persist budget data');
        }

        await invalidateCachesAfterMutation();
        return remaining;
    },

    /**
     * Authoritatively composes budget definitions with actual Cashbook operating expenses.
     * Strictly READ-ONLY: Never writes spending or utilization back into budget records.
     * 
     * @param {string} [periodKey] Format 'YYYY-MM' (default current month)
     * @param {Object} [options]
     * @param {Array} [options.overrideTransactions] Optional transaction list for testing/preview
     * @returns {Promise<Object>} Authoritative budget performance report
     */
    getBudgetsWithActuals: async (periodKey = '2026-09', options = {}) => {
        const period = resolveBudgetPeriod({ selectedMonth: periodKey });
        const budgets = await BudgetService.getBudgets(periodKey, { includeArchived: false });

        if (!budgets || budgets.length === 0) {
            return {
                status: SourceAvailabilityStatus.EMPTY,
                period,
                isEmpty: true,
                totalBudgetPaise: 0n,
                totalSpentPaise: 0n,
                remainingBudgetPaise: 0n,
                totalOverspentPaise: 0n,
                overallUtilizationBps: 0n,
                overallUtilizationPercent: 0,
                overallStatus: BUDGET_UTILIZATION_STATUS.EMPTY,
                categories: [],
                alerts: [],
                unmatchedExpensesPaise: 0n,
                unmatchedTransactions: []
            };
        }

        // 1. Query Cashbook authoritatively
        let rawTransactions = options.overrideTransactions || null;
        let sourceStatus = SourceAvailabilityStatus.AVAILABLE;
        let sourceError = null;

        if (!rawTransactions) {
            try {
                const cb = await CashbookRepository.load({ mode: options.mode });
                if (cb && Array.isArray(cb.transactions)) {
                    rawTransactions = cb.transactions;
                } else {
                    rawTransactions = [];
                }
            } catch (err) {
                sourceStatus = SourceAvailabilityStatus.UNAVAILABLE;
                sourceError = err.message;
            }
        }

        if (sourceStatus === SourceAvailabilityStatus.UNAVAILABLE) {
            return {
                status: SourceAvailabilityStatus.UNAVAILABLE,
                period,
                isEmpty: false,
                totalBudgetPaise: budgets.reduce((sum, b) => sum + b.limitPaise, 0n),
                totalSpentPaise: null,
                remainingBudgetPaise: null,
                totalOverspentPaise: null,
                overallUtilizationBps: null,
                overallUtilizationPercent: null,
                overallStatus: BUDGET_UTILIZATION_STATUS.UNAVAILABLE,
                categories: budgets.map(b => ({
                    ...b,
                    spentPaise: null,
                    remainingPaise: null,
                    overspentPaise: null,
                    utilizationBps: null,
                    utilizationPercent: null,
                    utilizationStatus: BUDGET_UTILIZATION_STATUS.UNAVAILABLE,
                    spentFormatted: '—',
                    remainingFormatted: '—',
                    limitFormatted: formatBigIntPaise(b.limitPaise)
                })),
                alerts: [],
                error: sourceError
            };
        }

        // 2. Filter eligible Cashbook operating expenses within [startDate, endDate)
        // Group by both canonical category group and raw lowercase category
        const spentByCanonicalGroup = {};
        const spentByRawCategory = {};
        let totalCashbookOutflowPaise = 0n;
        let unmatchedExpensesPaise = 0n;
        const unmatchedTransactions = [];

        // Build active category lookup maps
        const budgetedCategoryNames = new Set(budgets.map(b => b.category.toLowerCase()));
        const budgetedCanonicalGroups = new Set(budgets.map(b => b.canonicalGroup.toLowerCase()));

        for (const tx of rawTransactions) {
            if (!tx || !tx.date) continue;
            // Strict half-open boundary check: startDate <= date < endDate
            if (!isDateInPeriod(tx.date, period)) continue;

            // Exclude non-operating transactions (Internal transfers, Investments, Income)
            const typeUpper = (tx.type || '').toUpperCase();
            if (typeUpper === 'INTERNAL_TRANSFER' || typeUpper === 'TRANSFER' || typeUpper === 'INCOME') {
                continue;
            }
            if (tx.isTransfer || tx.accountingTreatment === 'INTERNAL_TRANSFER') {
                continue;
            }

            // Extract amount in paise safely (supporting amountPaise and fallback amount in rupees)
            let txPaise = parsePaise(tx.amountPaise, tx.amount);

            // Handle refunds and reversals: negative expenses reduce spending
            if (typeUpper === 'REFUND' || typeUpper === 'REVERSAL') {
                txPaise = -txPaise;
            }

            totalCashbookOutflowPaise += txPaise;

            // Resolve hierarchical category
            const rawCat = (tx.category || tx.categoryId || tx.categoryName || '').trim();
            const canonicalGroup = resolveCanonicalCategoryGroup(rawCat);
            const lowerRawCat = rawCat.toLowerCase();

            let matched = false;

            if (lowerRawCat && budgetedCategoryNames.has(lowerRawCat)) {
                spentByRawCategory[lowerRawCat] = (spentByRawCategory[lowerRawCat] || 0n) + txPaise;
                matched = true;
            }

            if (canonicalGroup) {
                const lowerGroup = canonicalGroup.toLowerCase();
                spentByCanonicalGroup[lowerGroup] = (spentByCanonicalGroup[lowerGroup] || 0n) + txPaise;
                if (budgetedCanonicalGroups.has(lowerGroup)) {
                    matched = true;
                }
            }

            if (!matched) {
                unmatchedExpensesPaise += txPaise;
                unmatchedTransactions.push(tx);
            }
        }

        // 3. Compute derived metrics per budget category
        let totalBudgetPaise = 0n;
        let totalSpentPaise = 0n;
        let totalOverspentPaise = 0n;
        const alerts = [];

        const categories = budgets.map(b => {
            const rawKey = b.category.toLowerCase();
            const groupKey = b.canonicalGroup.toLowerCase();

            // Match by granular category first, then by canonical group
            let spentPaise = 0n;
            if (spentByRawCategory[rawKey] !== undefined) {
                spentPaise = spentByRawCategory[rawKey];
            } else if (spentByCanonicalGroup[groupKey] !== undefined) {
                spentPaise = spentByCanonicalGroup[groupKey];
            }

            // Handle refund edge-case: clamp negative spending to 0n for display
            const effectiveSpentPaise = spentPaise < 0n ? 0n : spentPaise;
            const remainingPaise = b.limitPaise > effectiveSpentPaise ? b.limitPaise - effectiveSpentPaise : 0n;
            const overspentPaise = effectiveSpentPaise > b.limitPaise ? effectiveSpentPaise - b.limitPaise : 0n;

            totalBudgetPaise += b.limitPaise;
            totalSpentPaise += effectiveSpentPaise;
            totalOverspentPaise += overspentPaise;

            const utilizationBps = calculateUtilizationBps(effectiveSpentPaise, b.limitPaise);
            const utilizationPercent = Number(utilizationBps) / 100;
            const utilizationStatus = getUtilizationStatus(utilizationBps);

            // Generate alert if near limit or over budget
            if (utilizationStatus === BUDGET_UTILIZATION_STATUS.OVER_BUDGET) {
                alerts.push({
                    id: `alert_over_${b.id}`,
                    budgetId: b.id,
                    category: b.category,
                    severity: 'CRITICAL',
                    message: `You are ${formatBigIntPaise(overspentPaise)} over budget in ${b.category}`,
                    overspentPaise,
                    utilizationBps
                });
            } else if (utilizationStatus === BUDGET_UTILIZATION_STATUS.NEAR_LIMIT) {
                alerts.push({
                    id: `alert_near_${b.id}`,
                    budgetId: b.id,
                    category: b.category,
                    severity: 'WARNING',
                    message: `You have used ${utilizationPercent.toFixed(1)}% of your ${b.category} budget`,
                    remainingPaise,
                    utilizationBps
                });
            }

            return {
                ...b,
                spentPaise: effectiveSpentPaise,
                remainingPaise,
                overspentPaise,
                utilizationBps,
                utilizationPercent,
                utilizationStatus,
                isOverBudget: overspentPaise > 0n,
                spentFormatted: formatBigIntPaise(effectiveSpentPaise),
                remainingFormatted: formatBigIntPaise(remainingPaise),
                overspentFormatted: formatBigIntPaise(overspentPaise),
                limitFormatted: formatBigIntPaise(b.limitPaise)
            };
        });

        const overallUtilizationBps = calculateUtilizationBps(totalSpentPaise, totalBudgetPaise);
        const overallUtilizationPercent = Number(overallUtilizationBps) / 100;
        const overallStatus = getUtilizationStatus(overallUtilizationBps);
        const remainingBudgetPaise = totalBudgetPaise > totalSpentPaise ? totalBudgetPaise - totalSpentPaise : 0n;

        return {
            status: SourceAvailabilityStatus.AVAILABLE,
            period,
            isEmpty: false,
            totalBudgetPaise,
            totalSpentPaise,
            totalCashbookOutflowPaise,
            totalCashbookOutflowFormatted: formatBigIntPaise(totalCashbookOutflowPaise),
            remainingBudgetPaise,
            totalOverspentPaise,
            overallUtilizationBps,
            overallUtilizationPercent,
            overallStatus,
            totalBudgetFormatted: formatBigIntPaise(totalBudgetPaise),
            totalSpentFormatted: formatBigIntPaise(totalSpentPaise),
            remainingBudgetFormatted: formatBigIntPaise(remainingBudgetPaise),
            categories,
            alerts,
            unmatchedExpensesPaise,
            unmatchedExpensesFormatted: formatBigIntPaise(unmatchedExpensesPaise),
            unmatchedCount: unmatchedTransactions.length,
            unmatchedTransactions
        };
    },

    /**
     * Calculates Discretionary Safe-to-Spend headroom.
     * Invariant: Prevents double counting of recurring obligations:
     * - Future unpaid commitment occurrences reduce headroom.
     * - Paid occurrences already appear in Cashbook operating spent.
     * - The same payment is NEVER counted twice.
     * Safe-to-Spend = Monthly Income - Unpaid Committed Obligations - Current Operating Spent
     * 
     * @param {object} params
     * @param {string} params.periodKey
     * @param {bigint|string|number} params.monthlyIncomePaise
     * @param {object} params.options
     * @returns {object} Safe-to-Spend Headroom analysis
     */
    getSafeToSpendHeadroom: async (params = {}) => {
        const {
            periodKey = new Date().toISOString().substring(0, 7),
            monthlyIncomePaise = 0n,
            options = {}
        } = params;

        const incomePaise = toBigIntPaise(monthlyIncomePaise);

        // 1. Fetch typed commitment projection (Read-Only)
        const commitmentProj = await CommitmentsService.getCommittedObligationProjection({
            periodKey,
            includeOverdue: true,
            mode: options.mode
        });

        // 2. Fetch budget actuals from Cashbook (Read-Only)
        const budgetActuals = await BudgetService.getBudgetsWithActuals(periodKey, options);

        const unpaidCommittedPaise = commitmentProj.unpaidPaise || 0n;
        const paidCommittedPaise = commitmentProj.paidPaise || 0n;
        const operatingSpentPaise = budgetActuals.totalCashbookOutflowPaise !== undefined
            ? budgetActuals.totalCashbookOutflowPaise
            : (budgetActuals.totalSpentPaise || 0n);

        // Total obligations + actual operating expenditure
        const totalOutflowObligationsPaise = unpaidCommittedPaise + operatingSpentPaise;

        // Discretionary safe-to-spend headroom
        const discretionarySafeToSpendPaise = incomePaise >= totalOutflowObligationsPaise
            ? (incomePaise - totalOutflowObligationsPaise)
            : 0n;

        const deficitPaise = totalOutflowObligationsPaise > incomePaise
            ? (totalOutflowObligationsPaise - incomePaise)
            : 0n;

        const status = commitmentProj.status === 'AVAILABLE' && budgetActuals.status === SourceAvailabilityStatus.AVAILABLE
            ? SourceAvailabilityStatus.AVAILABLE
            : (commitmentProj.status === 'UNAVAILABLE' || budgetActuals.status === SourceAvailabilityStatus.UNAVAILABLE
                ? SourceAvailabilityStatus.UNAVAILABLE
                : SourceAvailabilityStatus.PARTIAL);

        return {
            status,
            periodKey,
            monthlyIncomePaise: incomePaise,
            monthlyIncomeFormatted: formatBigIntPaise(incomePaise),
            unpaidCommittedPaise,
            unpaidCommittedFormatted: formatBigIntPaise(unpaidCommittedPaise),
            paidCommittedPaise,
            paidCommittedFormatted: formatBigIntPaise(paidCommittedPaise),
            operatingSpentPaise,
            operatingSpentFormatted: formatBigIntPaise(operatingSpentPaise),
            totalOutflowObligationsPaise,
            totalOutflowObligationsFormatted: formatBigIntPaise(totalOutflowObligationsPaise),
            discretionarySafeToSpendPaise,
            discretionarySafeToSpendFormatted: formatBigIntPaise(discretionarySafeToSpendPaise),
            deficitPaise,
            deficitFormatted: formatBigIntPaise(deficitPaise),
            isDeficit: deficitPaise > 0n,
            asOfDate: commitmentProj.asOfDate
        };
    },

    // Legacy helper preserved for simulation compatibility
    updateSpending: async (id, amount) => {
        const current = await loadData(STORAGE_KEYS.BUDGETS, []);
        const updated = current.map(b => {
            if (b.id === id) return { ...b, spent: amount };
            return b;
        });
        await saveData(STORAGE_KEYS.BUDGETS, updated);
        return updated;
    }
};
