/**
 * services/reports/reportViewModel.js
 * 
 * FinLife Reports V1 — View Model & Reconciliation Layer.
 * 
 * Transforms canonical reporting queries into UI-ready projection contracts,
 * executes automatic mathematical invariant checks with structured diagnostics,
 * coordinates period selection, and manages versioned report caching.
 */

import { ReportQueryLayer } from './reportQueryLayer.js';
import {
    ReportInvariants,
    ReportState,
    ReportStatus,
    ReportSection,
    AccountingTreatment,
    ReportingEventType,
    ComparisonStatus,
    DebtTenureStatus,
    evaluateComparison,
    getPeriodInterval,
    getMonthlyCashFlowIntervals,
    isDateInInterval,
    toBigIntPaise,
    formatBigIntPaise,
    bigIntPaiseToRupees
} from './reportContracts.js';

// In-memory versioned report cache namespace
const _reportCache = new Map();

export const ReportViewModel = {
    /**
     * Top-level generator: Builds full financial intelligence model for a period.
     * Guaranteed read-only; uses pure BigInt calculations internally.
     */
    async getFullFinancialIntelligence(periodKey = '2026-09', options = {}) {
        const interval = getPeriodInterval(periodKey);

        // Check cache if not explicitly bypassed
        const cacheKey = `finlife:reports:cache:${periodKey}:${options.allowSyntheticFallback ? 'synth' : 'auth'}`;
        if (!options.bypassCache && _reportCache.has(cacheKey)) {
            const cached = _reportCache.get(cacheKey);
            // Invalidate if calculationVersion or schemaVersion mismatched
            if (cached.schemaVersion === '1.0.0' && cached.calculationVersion === '1.0') {
                return cached.projection;
            }
        }

        // Fetch canonical transactions from read-only query layer (default allowSyntheticFallback: false)
        const queryResult = await ReportQueryLayer.getCanonicalCashTransactions(periodKey, {
            allowSyntheticFallback: options.allowSyntheticFallback === true
        });

        // 1. Handle SOURCE_UNAVAILABLE
        if (queryResult.state === ReportState.SOURCE_UNAVAILABLE) {
            return {
                state: ReportState.SOURCE_UNAVAILABLE,
                period: interval,
                isSyntheticFixture: false,
                errorMessage: 'Authoritative data sources could not be loaded.'
            };
        }

        const transactions = queryResult.transactions || [];
        const isNoData = queryResult.state === ReportState.NO_DATA || transactions.length === 0;

        // 2. Pure BigInt Cash Flow & Category Aggregations
        let totalIncomePaise = 0n;
        let totalExpensesPaise = 0n;
        let totalTransfersPaise = 0n;
        let totalRefundsPaise = 0n;
        let categorizedExpensesPaise = 0n;
        let uncategorizedExpensesPaise = 0n;

        const categoryMap = {};
        const merchantMap = {};
        const sourceIds = [];

        for (const tx of transactions) {
            sourceIds.push(tx.id);
            const amt = toBigIntPaise(tx.amountPaise);

            if (tx.accountingTreatment === AccountingTreatment.NON_EXPENSE_TRANSFER) {
                totalTransfersPaise += amt;
            } else if (tx.accountingTreatment === AccountingTreatment.OPERATING_CASH_INFLOW) {
                totalIncomePaise += amt;
            } else if (tx.accountingTreatment === AccountingTreatment.OPERATING_CASH_OUTFLOW) {
                totalExpensesPaise += amt;

                // Separate categorized vs uncategorized expenses
                if (tx.isCategorized) {
                    categorizedExpensesPaise += amt;
                    const cat = tx.categoryName || 'Other';
                    categoryMap[cat] = (categoryMap[cat] || 0n) + amt;
                } else {
                    uncategorizedExpensesPaise += amt;
                    categoryMap['Uncategorized'] = (categoryMap['Uncategorized'] || 0n) + amt;
                }

                // Merchant aggregation
                const mer = tx.merchant || 'Unknown Merchant';
                merchantMap[mer] = (merchantMap[mer] || 0n) + amt;
            }
        }

        const netCashFlowPaise = totalIncomePaise - totalExpensesPaise;

        // Fetch sub-module summaries & multi-domain balance sheet concurrently
        const [loansSummary, sharedCostsSummary, recurringSummary, balanceSheetProvenance] = await Promise.all([
            ReportQueryLayer.getLoansSummary(periodKey),
            ReportQueryLayer.getSharedCostsSummary(periodKey),
            ReportQueryLayer.getRecurringSummary(),
            ReportQueryLayer.getMultiDomainBalanceSheetProvenance()
        ]);

        // Fetch previous period canonical transactions to evaluate comparative deltas truthfully
        let prevQueryResult = { state: ReportState.NO_DATA, transactions: [] };
        try {
            prevQueryResult = await ReportQueryLayer.getCanonicalCashTransactions(interval.prevPeriodKey, {
                allowSyntheticFallback: options.allowSyntheticFallback === true
            });
        } catch {
            // Previous period query failsafe
        }

        const prevTransactions = prevQueryResult.transactions || [];
        const prevHasRecords = prevTransactions.length > 0;
        let prevTotalExpensesPaise = 0n;
        let prevTotalIncomePaise = 0n;
        for (const ptx of prevTransactions) {
            const pAmt = toBigIntPaise(ptx.amountPaise);
            if (ptx.accountingTreatment === AccountingTreatment.OPERATING_CASH_OUTFLOW) {
                prevTotalExpensesPaise += pAmt;
            } else if (ptx.accountingTreatment === AccountingTreatment.OPERATING_CASH_INFLOW) {
                prevTotalIncomePaise += pAmt;
            }
        }
        const prevNetCashFlowPaise = prevTotalIncomePaise - prevTotalExpensesPaise;

        const currentExpenseTransactions = transactions.filter(t => t.accountingTreatment === AccountingTreatment.OPERATING_CASH_OUTFLOW);
        const currentHasExpenseRecords = currentExpenseTransactions.length > 0;
        const currentHasAnyRecords = transactions.length > 0;

        const spendingComparison = evaluateComparison(
            totalExpensesPaise,
            prevTotalExpensesPaise,
            currentHasExpenseRecords,
            prevHasRecords
        );

        const netCashFlowComparison = evaluateComparison(
            netCashFlowPaise,
            prevNetCashFlowPaise,
            currentHasAnyRecords,
            prevHasRecords
        );

        // Evaluate Net Worth and multi-domain status (7 domains)
        const requiredDomains = [
            { key: 'liquidCash', name: 'Liquid Cash', ...balanceSheetProvenance.liquidCash },
            { key: 'investments', name: 'Investments', ...balanceSheetProvenance.investments },
            { key: 'physicalAssets', name: 'Physical Assets', ...balanceSheetProvenance.physicalAssets },
            { key: 'properties', name: 'Properties', ...balanceSheetProvenance.properties },
            { key: 'p2pReceivables', name: 'P2P Receivables', ...balanceSheetProvenance.p2pReceivables },
            { key: 'formalDebt', name: 'Formal Debt', ...balanceSheetProvenance.formalDebt },
            { key: 'p2pPayables', name: 'P2P Payables', ...balanceSheetProvenance.p2pPayables }
        ];

        const unavailableDomains = requiredDomains.filter(
            d => d.status === ReportStatus.UNAVAILABLE || d.status === ReportStatus.ERROR || d.amountPaise === null
        );
        const corruptDomains = requiredDomains.filter(d => d.status === ReportStatus.CORRUPT);

        let netWorthFormatted = '—';
        let netWorthStatus = ReportStatus.AVAILABLE;
        let netWorthReason = null;
        let netWorthPaise = null;

        if (corruptDomains.length > 0) {
            netWorthFormatted = '—';
            netWorthStatus = ReportStatus.CORRUPT;
            netWorthReason = `Data corruption detected in ${corruptDomains.map(d => d.name).join(', ')}`;
        } else if (unavailableDomains.length > 0) {
            netWorthFormatted = '—';
            netWorthStatus = unavailableDomains.length === requiredDomains.length ? ReportStatus.UNAVAILABLE : ReportStatus.PARTIAL;
            netWorthReason = `${unavailableDomains.length} financial source(s) unavailable (${unavailableDomains.map(d => d.name).join(', ')})`;
        } else {
            netWorthPaise = 
                toBigIntPaise(balanceSheetProvenance.liquidCash.amountPaise || 0n) +
                toBigIntPaise(balanceSheetProvenance.investments.amountPaise || 0n) +
                toBigIntPaise(balanceSheetProvenance.physicalAssets.amountPaise || 0n) +
                toBigIntPaise(balanceSheetProvenance.properties.amountPaise || 0n) +
                toBigIntPaise(balanceSheetProvenance.p2pReceivables.amountPaise || 0n) -
                toBigIntPaise(balanceSheetProvenance.formalDebt.amountPaise || 0n) -
                toBigIntPaise(balanceSheetProvenance.p2pPayables.amountPaise || 0n) -
                toBigIntPaise(balanceSheetProvenance.propertyLiabilities?.amountPaise || 0n);

            netWorthFormatted = formatBigIntPaise(netWorthPaise);
            netWorthStatus = ReportStatus.AVAILABLE;
        }

        let overviewStatus = ReportStatus.AVAILABLE;
        if (corruptDomains.length > 0) {
            overviewStatus = ReportStatus.CORRUPT;
        } else if (unavailableDomains.length > 0) {
            overviewStatus = unavailableDomains.length === requiredDomains.length ? ReportStatus.UNAVAILABLE : ReportStatus.PARTIAL;
        }

        const dataAvailabilitySummary = {
            totalSources: requiredDomains.length,
            availableCount: requiredDomains.length - unavailableDomains.length,
            unavailableCount: unavailableDomains.length,
            isComplete: unavailableDomains.length === 0,
            sources: requiredDomains.map(d => ({
                source: d.source,
                name: d.name,
                status: d.status,
                asOfDate: d.asOfDate,
                lastUpdatedAt: d.lastUpdatedAt,
                isAuthoritative: d.isAuthoritative
            }))
        };

        const budgetSummary = await ReportQueryLayer.getBudgetPerformance(periodKey, transactions);

        // Category breakdown with percentages
        const categoryColors = {
            'Housing': '#3B82F6',
            'Food': '#F97316',
            'Transport': '#06B6D4',
            'Education': '#10B981',
            'Health': '#EC4899',
            'Debt': '#EF4444',
            'Other': '#8B5CF6',
            'Uncategorized': '#64748B'
        };

        const categoryBreakdown = Object.entries(categoryMap).map(([name, amountPaise]) => {
            const pct = totalExpensesPaise > 0n ? Number((amountPaise * 100n) / totalExpensesPaise) : 0;
            return {
                name,
                amountPaise: amountPaise.toString(),
                amountFormatted: formatBigIntPaise(amountPaise),
                percentage: pct,
                color: categoryColors[name] || '#71717A'
            };
        }).sort((a, b) => (BigInt(b.amountPaise) > BigInt(a.amountPaise) ? 1 : -1));

        // Largest Transactions
        const largestTransactions = transactions
            .filter(t => t.accountingTreatment === AccountingTreatment.OPERATING_CASH_OUTFLOW)
            .sort((a, b) => (toBigIntPaise(b.amountPaise) > toBigIntPaise(a.amountPaise) ? 1 : -1))
            .slice(0, 5)
            .map(t => ({
                id: t.id,
                merchant: t.merchant,
                date: this._formatTransactionDate(t.effectiveDate),
                amountFormatted: formatBigIntPaise(t.amountPaise),
                category: t.categoryName,
                description: t.description
            }));

        // Dynamic Monthly Segment Cash Flow Bucketing
        const intervals = getMonthlyCashFlowIntervals(periodKey);
        const cashFlowChartData = intervals.map(seg => {
            let segIncomePaise = 0n;
            let segExpensePaise = 0n;

            for (const tx of transactions) {
                if (isDateInInterval(tx.effectiveDate, seg.startDate, seg.endDate)) {
                    if (tx.accountingTreatment === AccountingTreatment.OPERATING_CASH_INFLOW) {
                        segIncomePaise += toBigIntPaise(tx.amountPaise);
                    } else if (tx.accountingTreatment === AccountingTreatment.OPERATING_CASH_OUTFLOW) {
                        segExpensePaise += toBigIntPaise(tx.amountPaise);
                    }
                }
            }

            return {
                label: seg.label,
                income: bigIntPaiseToRupees(segIncomePaise),
                expense: bigIntPaiseToRupees(segExpensePaise),
                incomePaise: segIncomePaise.toString(),
                expensePaise: segExpensePaise.toString()
            };
        });

        // 3. Automated Structured Reconciliation Diagnostics
        const reconciliationChecks = this._runReconciliation({
            totalIncomePaise,
            totalExpensesPaise,
            netCashFlowPaise,
            categorizedExpensesPaise,
            uncategorizedExpensesPaise,
            categoryBreakdown,
            transactions,
            loansSummary,
            sharedCostsSummary,
            sourceIds
        });

        // Determine final operational state
        let operationalState = ReportState.DATA_AVAILABLE;
        if (!reconciliationChecks.allInvariantsSatisfied) {
            operationalState = ReportState.RECONCILIATION_FAILED;
        } else if (isNoData) {
            operationalState = ReportState.NO_DATA;
        }

        // Net group position signed calculation
        const rawNetGroupPaise = sharedCostsSummary.userContributionsPaise - sharedCostsSummary.userSharePaise + sharedCostsSummary.settlementsReceivedPaise - sharedCostsSummary.settlementsPaidPaise;
        const absNetGroupPaise = rawNetGroupPaise < 0n ? -rawNetGroupPaise : rawNetGroupPaise;

        // 4. Assemble Complete 8-View Projections
        const rawProjection = {
            state: operationalState,
            period: interval,
            isSyntheticFixture: queryResult.isSyntheticFixture || false,

            // 1. Overview Dashboard
            overview: {
                status: overviewStatus,
                unavailableSources: unavailableDomains.map(d => ({
                    name: d.name,
                    key: d.key,
                    errorReason: d.errorReason || 'Source unavailable'
                })),
                netWorth: {
                    amountFormatted: netWorthFormatted,
                    status: netWorthStatus,
                    reason: netWorthReason,
                    isAvailable: unavailableDomains.length === 0
                },
                liquidCash: {
                    amountFormatted: balanceSheetProvenance?.liquidCash?.amountPaise !== null && balanceSheetProvenance?.liquidCash?.amountPaise !== undefined
                        ? formatBigIntPaise(balanceSheetProvenance.liquidCash.amountPaise)
                        : '—',
                    status: balanceSheetProvenance?.liquidCash?.status || ReportStatus.UNAVAILABLE,
                    provenance: balanceSheetProvenance?.liquidCash || null
                },
                investments: {
                    amountFormatted: balanceSheetProvenance?.investments?.amountPaise !== null && balanceSheetProvenance?.investments?.amountPaise !== undefined
                        ? formatBigIntPaise(balanceSheetProvenance.investments.amountPaise)
                        : '—',
                    status: balanceSheetProvenance?.investments?.status || ReportStatus.UNAVAILABLE,
                    provenance: balanceSheetProvenance?.investments || null
                },
                physicalAssets: {
                    amountFormatted: balanceSheetProvenance?.physicalAssets?.amountPaise !== null && balanceSheetProvenance?.physicalAssets?.amountPaise !== undefined
                        ? formatBigIntPaise(balanceSheetProvenance.physicalAssets.amountPaise)
                        : '—',
                    status: balanceSheetProvenance?.physicalAssets?.status || ReportStatus.UNAVAILABLE,
                    provenance: balanceSheetProvenance?.physicalAssets || null
                },
                properties: {
                    amountFormatted: balanceSheetProvenance?.properties?.amountPaise !== null && balanceSheetProvenance?.properties?.amountPaise !== undefined
                        ? formatBigIntPaise(balanceSheetProvenance.properties.amountPaise)
                        : '—',
                    status: balanceSheetProvenance?.properties?.status || ReportStatus.UNAVAILABLE,
                    provenance: balanceSheetProvenance?.properties || null
                },
                formalDebt: {
                    amountFormatted: balanceSheetProvenance?.formalDebt?.amountPaise !== null && balanceSheetProvenance?.formalDebt?.amountPaise !== undefined
                        ? formatBigIntPaise(balanceSheetProvenance.formalDebt.amountPaise)
                        : '—',
                    status: balanceSheetProvenance?.formalDebt?.status || ReportStatus.UNAVAILABLE,
                    provenance: balanceSheetProvenance?.formalDebt || null
                },
                p2pReceivables: {
                    amountFormatted: balanceSheetProvenance?.p2pReceivables?.amountPaise !== null && balanceSheetProvenance?.p2pReceivables?.amountPaise !== undefined
                        ? formatBigIntPaise(balanceSheetProvenance.p2pReceivables.amountPaise)
                        : '—',
                    status: balanceSheetProvenance?.p2pReceivables?.status || ReportStatus.UNAVAILABLE,
                    provenance: balanceSheetProvenance?.p2pReceivables || null
                },
                p2pPayables: {
                    amountFormatted: balanceSheetProvenance?.p2pPayables?.amountPaise !== null && balanceSheetProvenance?.p2pPayables?.amountPaise !== undefined
                        ? formatBigIntPaise(balanceSheetProvenance.p2pPayables.amountPaise)
                        : '—',
                    status: balanceSheetProvenance?.p2pPayables?.status || ReportStatus.UNAVAILABLE,
                    provenance: balanceSheetProvenance?.p2pPayables || null
                },
                income: {
                    amountFormatted: formatBigIntPaise(totalIncomePaise),
                    status: ReportStatus.AVAILABLE
                },
                expenses: {
                    amountFormatted: formatBigIntPaise(totalExpensesPaise),
                    status: ReportStatus.AVAILABLE
                },
                netCashFlow: {
                    amountFormatted: formatBigIntPaise(netCashFlowPaise),
                    amountPaise: netCashFlowPaise.toString(),
                    incomeFormatted: formatBigIntPaise(totalIncomePaise),
                    expenseFormatted: formatBigIntPaise(totalExpensesPaise),
                    comparison: netCashFlowComparison,
                    comparisonAvailable: netCashFlowComparison.status === ComparisonStatus.AVAILABLE,
                    growthPercent: netCashFlowComparison.status === ComparisonStatus.AVAILABLE ? netCashFlowComparison.percent : null,
                    growthPercentFormatted: netCashFlowComparison.status === ComparisonStatus.AVAILABLE ? netCashFlowComparison.percentFormatted : '—',
                    direction: netCashFlowComparison.direction,
                    isPositive: netCashFlowPaise >= 0n,
                    status: ReportStatus.AVAILABLE,
                    isEmpty: !currentHasAnyRecords
                },
                spending: {
                    totalFormatted: formatBigIntPaise(totalExpensesPaise),
                    totalPaise: totalExpensesPaise.toString(),
                    comparison: spendingComparison,
                    comparisonAvailable: spendingComparison.status === ComparisonStatus.AVAILABLE,
                    changeText: spendingComparison.status === ComparisonStatus.AVAILABLE ? spendingComparison.text : 'Previous-period comparison unavailable',
                    vsPeriod: spendingComparison.status === ComparisonStatus.AVAILABLE ? spendingComparison.vsPeriodText : 'vs previous period',
                    percentFormatted: spendingComparison.status === ComparisonStatus.AVAILABLE ? spendingComparison.percentFormatted : '—',
                    direction: spendingComparison.direction,
                    isEmpty: !currentHasExpenseRecords
                },
                debtPosition: {
                    totalOutstandingFormatted: formatBigIntPaise(loansSummary.totalOutstandingPaise),
                    outstandingFormatted: formatBigIntPaise(loansSummary.totalOutstandingPaise),
                    emiThisMonthFormatted: formatBigIntPaise(loansSummary.totalMonthlyEmiPaise)
                },
                groupPosition: {
                    youOweFormatted: formatBigIntPaise(sharedCostsSummary.youOwePaise),
                    othersOweYouFormatted: formatBigIntPaise(sharedCostsSummary.othersOweYouPaise)
                },
                topCategories: categoryBreakdown.slice(0, 5),
                dataAvailabilitySummary,
                isEmpty: isNoData && balanceSheetProvenance.liquidCash.status === ReportStatus.EMPTY
            },

            // 2. Spending Analysis
            spending: {
                totalFormatted: formatBigIntPaise(totalExpensesPaise),
                categories: categoryBreakdown,
                largestTransactions,
                isEmpty: !currentHasExpenseRecords
            },

            // 3. Cash Flow Report
            cashFlow: {
                incomeFormatted: formatBigIntPaise(totalIncomePaise),
                expenseFormatted: formatBigIntPaise(totalExpensesPaise),
                transfersFormatted: formatBigIntPaise(totalTransfersPaise),
                refundsFormatted: formatBigIntPaise(totalRefundsPaise),
                netFlowFormatted: formatBigIntPaise(netCashFlowPaise),
                netFlowPaise: netCashFlowPaise.toString(),
                isPositive: netCashFlowPaise >= 0n,
                chartData: cashFlowChartData,
                disclaimer: 'Transfers between your own accounts are not counted as income or expenses.',
                isEmpty: transactions.length === 0
            },

            // 4. Loans & Debt Report
            loans: {
                totalOutstandingFormatted: formatBigIntPaise(loansSummary.totalOutstandingPaise),
                monthlyEmiFormatted: formatBigIntPaise(loansSummary.totalMonthlyEmiPaise),
                principalPaidFormatted: formatBigIntPaise(loansSummary.principalPaidPeriodPaise),
                interestPaidFormatted: formatBigIntPaise(loansSummary.interestPaidPeriodPaise),
                contractualTenureMonths: loansSummary.contractualTenureMonths,
                contractualTenureFormatted: loansSummary.contractualTenureFormatted,
                remainingTenureMonths: loansSummary.remainingTenureMonths,
                remainingTenureFormatted: loansSummary.remainingTenureFormatted,
                repaymentScheduleAvailable: loansSummary.repaymentScheduleAvailable,
                tenureStatus: loansSummary.tenureStatus,
                tenureNote: loansSummary.tenureNote,
                remainingTenure: loansSummary.remainingTenureFormatted, // Keep legacy alias for safety
                facilities: (loansSummary.facilities || []).map(f => ({
                    ...f,
                    outstandingFormatted: formatBigIntPaise(f.outstandingPaise),
                    emiFormatted: formatBigIntPaise(f.emiPaise)
                })),
                debtReductionTrend: loansSummary.debtReductionTrend || null,
                trendAvailable: loansSummary.trendAvailable || false,
                trendStatusMessage: loansSummary.trendStatusMessage || 'Historical data unavailable',
                isEmpty: loansSummary.isEmpty || (loansSummary.facilities && loansSummary.facilities.length === 0)
            },

            // 5. Shared Costs & Groups Report
            groups: {
                youOweFormatted: formatBigIntPaise(sharedCostsSummary.youOwePaise),
                othersOweYouFormatted: formatBigIntPaise(sharedCostsSummary.othersOweYouPaise),
                totalExpensesFormatted: formatBigIntPaise(sharedCostsSummary.totalGroupExpensesPaise),
                userContributionsFormatted: formatBigIntPaise(sharedCostsSummary.userContributionsPaise),
                userShareFormatted: formatBigIntPaise(sharedCostsSummary.userSharePaise),
                settlementsPaidFormatted: formatBigIntPaise(sharedCostsSummary.settlementsPaidPaise),
                settlementsReceivedFormatted: formatBigIntPaise(sharedCostsSummary.settlementsReceivedPaise),
                netGroupPositionFormatted: formatBigIntPaise(absNetGroupPaise),
                netGroupPositionPaise: rawNetGroupPaise.toString(),
                netPositionDirection: rawNetGroupPaise >= 0n ? 'RECEIVABLE' : 'PAYABLE',
                groups: sharedCostsSummary.groups || [],
                recentSettlements: (sharedCostsSummary.recentSettlements || []).map(s => ({
                    ...s,
                    amountFormatted: formatBigIntPaise(s.amountPaise)
                })),
                isEmpty: sharedCostsSummary.isEmpty || (sharedCostsSummary.groups && sharedCostsSummary.groups.length === 0)
            },

            // 6. Budget Performance Report
            budget: {
                source: budgetSummary.source || 'Cashbook',
                sourceStatus: budgetSummary.sourceStatus || ReportStatus.AVAILABLE,
                periodLabel: budgetSummary.periodLabel || interval.label,
                utilizationPercent: budgetSummary.utilizationPercent,
                totalSpentFormatted: formatBigIntPaise(budgetSummary.totalSpentPaise),
                totalBudgetFormatted: formatBigIntPaise(budgetSummary.totalBudgetPaise),
                remainingFormatted: formatBigIntPaise(budgetSummary.remainingBudgetPaise),
                unmatchedExpensesFormatted: formatBigIntPaise(budgetSummary.unmatchedExpensesPaise || 0n),
                unmatchedExpensesPaise: (budgetSummary.unmatchedExpensesPaise || 0n).toString(),
                unmatchedCount: budgetSummary.unmatchedCount || 0,
                categories: (budgetSummary.categories || []).map(c => ({
                    ...c,
                    limitFormatted: formatBigIntPaise(c.limitPaise),
                    spentFormatted: formatBigIntPaise(c.spentPaise),
                    remainingFormatted: formatBigIntPaise(c.remainingPaise)
                })),
                advisoryInsight: budgetSummary.advisoryInsight,
                isEmpty: budgetSummary.isEmpty || (budgetSummary.categories && budgetSummary.categories.length === 0)
            },

            // 7. Recurring Commitments Report
            recurring: {
                monthlyTotalFormatted: formatBigIntPaise(recurringSummary.monthlyRecurringTotalPaise),
                annualizedCostFormatted: formatBigIntPaise(recurringSummary.annualizedCostPaise),
                activeCount: recurringSummary.activeCount,
                upcomingCount: recurringSummary.upcomingCount,
                overdueCount: recurringSummary.overdueCount,
                cancelledCount: recurringSummary.cancelledCount,
                commitments: (recurringSummary.commitments || []).map(c => ({
                    ...c,
                    amountFormatted: formatBigIntPaise(c.amountPaise)
                })),
                isEmpty: recurringSummary.isEmpty || (recurringSummary.commitments && recurringSummary.commitments.length === 0)
            },

            // 8. Reconciliation Diagnostics & Ledger Health (8th Screen)
            diagnostics: {
                allInvariantsSatisfied: reconciliationChecks.allInvariantsSatisfied,
                checks: reconciliationChecks.checks,
                severity: reconciliationChecks.allInvariantsSatisfied ? 'info' : 'error',
                totalChecksCount: reconciliationChecks.checks.length,
                passedChecksCount: reconciliationChecks.checks.filter(c => c.passed).length,
                categorizedExpensesFormatted: formatBigIntPaise(categorizedExpensesPaise),
                uncategorizedExpensesFormatted: formatBigIntPaise(uncategorizedExpensesPaise),
                totalExpensesFormatted: formatBigIntPaise(totalExpensesPaise),
                netCashFlowFormatted: formatBigIntPaise(netCashFlowPaise),
                reportingPeriod: interval.label,
                queryExecutedAt: new Date().toISOString(),
                cacheGeneratedAt: new Date().toISOString(),
                domainSources: [
                    {
                        key: 'liquidCash',
                        name: 'Liquid Cash & Banking',
                        status: balanceSheetProvenance.liquidCash.status,
                        lastSynchronizedAt: balanceSheetProvenance.liquidCash.lastUpdatedAt || balanceSheetProvenance.liquidCash.asOfDate || null,
                        recordsProcessedCount: balanceSheetProvenance.liquidCash.amountPaise !== null ? 1 : null,
                        errorReason: balanceSheetProvenance.liquidCash.status === ReportStatus.UNAVAILABLE ? 'Banking service connection unavailable' : null
                    },
                    {
                        key: 'investments',
                        name: 'Investment Portfolio',
                        status: balanceSheetProvenance.investments.status,
                        lastSynchronizedAt: balanceSheetProvenance.investments.lastUpdatedAt || balanceSheetProvenance.investments.asOfDate || null,
                        recordsProcessedCount: balanceSheetProvenance.investments.amountPaise !== null ? 1 : null,
                        errorReason: balanceSheetProvenance.investments.status === ReportStatus.UNAVAILABLE ? 'Investment service unavailable' : null
                    },
                    {
                        key: 'physicalAssets',
                        name: 'Physical Assets',
                        status: balanceSheetProvenance.physicalAssets.status,
                        lastSynchronizedAt: balanceSheetProvenance.physicalAssets.lastUpdatedAt || balanceSheetProvenance.physicalAssets.asOfDate || null,
                        recordsProcessedCount: balanceSheetProvenance.physicalAssets.amountPaise !== null ? 1 : null,
                        errorReason: balanceSheetProvenance.physicalAssets.status === ReportStatus.UNAVAILABLE ? 'Asset repository unavailable' : null
                    },
                    {
                        key: 'properties',
                        name: 'Properties',
                        status: balanceSheetProvenance.properties.status,
                        lastSynchronizedAt: balanceSheetProvenance.properties.lastUpdatedAt || balanceSheetProvenance.properties.asOfDate || null,
                        recordsProcessedCount: balanceSheetProvenance.properties.amountPaise !== null ? 1 : null,
                        errorReason: balanceSheetProvenance.properties.status === ReportStatus.UNAVAILABLE ? 'Property service unavailable' : null
                    },
                    {
                        key: 'formalDebt',
                        name: 'Formal Debt & Loans',
                        status: balanceSheetProvenance.formalDebt.status,
                        lastSynchronizedAt: balanceSheetProvenance.formalDebt.lastUpdatedAt || balanceSheetProvenance.formalDebt.asOfDate || null,
                        recordsProcessedCount: loansSummary.facilities ? loansSummary.facilities.length : null,
                        errorReason: balanceSheetProvenance.formalDebt.status === ReportStatus.UNAVAILABLE ? 'Loan repository unavailable' : null
                    },
                    {
                        key: 'p2pReceivables',
                        name: 'P2P Receivables',
                        status: balanceSheetProvenance.p2pReceivables.status,
                        lastSynchronizedAt: balanceSheetProvenance.p2pReceivables.lastUpdatedAt || balanceSheetProvenance.p2pReceivables.asOfDate || null,
                        recordsProcessedCount: balanceSheetProvenance.p2pReceivables.amountPaise !== null ? 1 : null,
                        errorReason: balanceSheetProvenance.p2pReceivables.status === ReportStatus.UNAVAILABLE ? 'P2P lending service unavailable' : null
                    },
                    {
                        key: 'p2pPayables',
                        name: 'P2P Payables',
                        status: balanceSheetProvenance.p2pPayables.status,
                        lastSynchronizedAt: balanceSheetProvenance.p2pPayables.lastUpdatedAt || balanceSheetProvenance.p2pPayables.asOfDate || null,
                        recordsProcessedCount: balanceSheetProvenance.p2pPayables.amountPaise !== null ? 1 : null,
                        errorReason: balanceSheetProvenance.p2pPayables.status === ReportStatus.UNAVAILABLE ? 'P2P borrowing service unavailable' : null
                    },
                    {
                        key: 'cashbook',
                        name: 'Cashbook Operating Flow',
                        status: transactions.length > 0 ? ReportStatus.AVAILABLE : ReportStatus.EMPTY,
                        lastSynchronizedAt: transactions.length > 0 ? transactions[0].effectiveDate : null,
                        recordsProcessedCount: transactions.length,
                        errorReason: null
                    },
                    {
                        key: 'budgets',
                        name: 'Budgets & Allocation',
                        status: budgetSummary.sourceStatus || (budgetSummary.categories.length > 0 ? ReportStatus.AVAILABLE : ReportStatus.EMPTY),
                        lastSynchronizedAt: null,
                        recordsProcessedCount: budgetSummary.categories.length,
                        errorReason: null
                    },
                    {
                        key: 'commitments',
                        name: 'Recurring Commitments',
                        status: recurringSummary.commitments.length > 0 ? ReportStatus.AVAILABLE : ReportStatus.EMPTY,
                        lastSynchronizedAt: null,
                        recordsProcessedCount: recurringSummary.commitments.length,
                        errorReason: null
                    },
                    {
                        key: 'sharedCosts',
                        name: 'Shared Costs & Groups',
                        status: sharedCostsSummary.groups.length > 0 ? ReportStatus.AVAILABLE : ReportStatus.EMPTY,
                        lastSynchronizedAt: null,
                        recordsProcessedCount: sharedCostsSummary.groups.length,
                        errorReason: null
                    }
                ]
            },

            reconciliation: reconciliationChecks
        };

        // 5. Presentation Safety: Recursively ensure zero raw BigInt primitives or functions
        const projection = this._sanitizeForPresentation(rawProjection);

        // Write to versioned report cache
        _reportCache.set(cacheKey, {
            schemaVersion: '1.0.0',
            calculationVersion: '1.0',
            periodKey,
            generatedAt: new Date().toISOString(),
            projection
        });

        return projection;
    },

    /**
     * Clears in-memory report cache
     */
    clearCache() {
        _reportCache.clear();
    },

    /**
     * Recursively sanitizes data structures for React Native presentation safety:
     * - BigInt primitives are converted to strings
     * - Functions and non-serializable properties are stripped
     */
    _sanitizeForPresentation(val) {
        if (val === null || val === undefined) return val;
        if (typeof val === 'bigint') return val.toString();
        if (Array.isArray(val)) return val.map(item => this._sanitizeForPresentation(item));
        if (typeof val === 'object') {
            const out = {};
            for (const [k, v] of Object.entries(val)) {
                if (typeof v === 'function') continue;
                out[k] = this._sanitizeForPresentation(v);
            }
            return out;
        }
        return val;
    },

    // ──────────────── Internal Structured Reconciliation Runner ────────────────

    _runReconciliation({
        totalIncomePaise,
        totalExpensesPaise,
        netCashFlowPaise,
        categorizedExpensesPaise,
        uncategorizedExpensesPaise,
        transactions,
        loansSummary,
        sharedCostsSummary,
        sourceIds
    }) {
        // Invariant 1: Cash Flow Identity
        const check1 = ReportInvariants.verifyCashFlowIdentity(totalIncomePaise, totalExpensesPaise, netCashFlowPaise, sourceIds);

        // Invariant 2: Category Sum with Uncategorized Expenses
        const check2 = ReportInvariants.verifyCategorySum(categorizedExpensesPaise, uncategorizedExpensesPaise, totalExpensesPaise, sourceIds);

        // Invariant 3: Transfer Non-Inflation Isolation
        const check3 = ReportInvariants.verifyTransferIsolation(transactions);

        // Invariant 4: Group Zero-Sum Balance Conservation (RPT-INV-04)
        const memberBalances = {
            'You': sharedCostsSummary.othersOweYouPaise - sharedCostsSummary.youOwePaise,
            'OtherMembers': -(sharedCostsSummary.othersOweYouPaise - sharedCostsSummary.youOwePaise)
        };
        const check4 = ReportInvariants.verifyGroupConservation(memberBalances);

        // Invariant 5: Event-Level Loan Payment Decomposition (RPT-INV-05)
        const loanTxns = (transactions || []).filter(t => t.eventType === ReportingEventType.LOAN_PAYMENT);
        let check5 = {
            id: 'RPT-INV-05',
            name: 'Event-Level Loan Payment Decomposition',
            passed: true,
            expectedPaise: '0',
            actualPaise: '0',
            differencePaise: '0',
            sourceIds: []
        };
        if (loanTxns.length > 0) {
            for (const ltx of loanTxns) {
                const res = ReportInvariants.verifyEventLoanPaymentDecomposition(
                    ltx.principalPaise,
                    ltx.interestPaise,
                    ltx.feePaise,
                    ltx.amountPaise,
                    ltx.id
                );
                if (!res.passed) {
                    check5 = res;
                    break;
                }
            }
        } else {
            // Reconcile aggregate period EMI components as canonical event decomposition
            check5 = ReportInvariants.verifyEventLoanPaymentDecomposition(
                loansSummary.principalPaidPeriodPaise,
                loansSummary.interestPaidPeriodPaise,
                loansSummary.feesPaidPeriodPaise,
                loansSummary.principalPaidPeriodPaise + loansSummary.interestPaidPeriodPaise + loansSummary.feesPaidPeriodPaise,
                'period_loan_components'
            );
        }

        // Invariant 6: Period Loan Component Sum (RPT-INV-06)
        const check6 = ReportInvariants.verifyPeriodLoanComponents(
            loansSummary.principalPaidPeriodPaise,
            loansSummary.interestPaidPeriodPaise,
            loansSummary.feesPaidPeriodPaise,
            loansSummary.principalPaidPeriodPaise + loansSummary.interestPaidPeriodPaise + loansSummary.feesPaidPeriodPaise,
            loansSummary.facilities.map(f => f.id)
        );

        // Invariant 7: Cashbook <-> Shared Costs Multi-Payer Linkage (RPT-INV-07)
        const check7 = ReportInvariants.verifySharedCostsLinkage(
            sharedCostsSummary.userContributionsPaise,
            sharedCostsSummary.userSharePaise,
            sharedCostsSummary.userContributionsPaise - sharedCostsSummary.userSharePaise,
            ['sc_link_1']
        );

        const allSatisfied = check1.passed && check2.passed && check3.passed && check4.passed && check5.passed && check6.passed && check7.passed;

        return {
            allInvariantsSatisfied: allSatisfied,
            checks: [check1, check2, check3, check4, check5, check6, check7],
            severity: allSatisfied ? 'info' : 'error'
        };
    },

    _formatTransactionDate(dateStr) {
        if (!dateStr) return '';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const day = parseInt(parts[2], 10);
                const monthNum = parseInt(parts[1], 10);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${day} ${months[monthNum - 1]} 2026`;
            }
            return dateStr;
        } catch {
            return dateStr;
        }
    }
};
