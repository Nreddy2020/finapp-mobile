/**
 * services/reports/reportQueryLayer.js
 * 
 * FinLife Reports V1 — Pure Read-Only Query & Normalization Layer.
 * 
 * Consumes:
 * - Cashbook V3 (CashbookRepository)
 * - Bank Loans & EMIs V1 (LoanRepository & LoanEngine)
 * - Shared Costs & Groups V1 (GroupRepository & GroupViewModel)
 * - Budgets (BudgetService)
 * - Recurring Commitments (CommitmentsService)
 * 
 * Guarantees:
 * - 0 mutations / 0 database writes.
 * - Exact paise integer calculations.
 * - Half-open interval date filtering [startDate, endDate).
 */

import { CashbookRepository } from '../cashbook/cashbookRepository.js';
import { TransactionType, TransactionStatus } from '../cashbook/cashbookContracts.js';
import { LoanRepository } from '../loans/loanRepository.js';
import { GroupRepository } from '../shared-costs/groupRepository.js';
import { GroupViewModel } from '../shared-costs/groupViewModel.js';
import { BudgetService } from '../budgets.js';
import { CommitmentsService } from '../commitments/commitmentsService.js';
import { CommitmentStatus } from '../commitments/commitmentContracts.js';
import { normalizeToMonthlyPaise } from '../commitments/commitmentCalculator.js';
import { P2PService } from '../p2pService.js';
import { BankingService } from '../bankingService.js';
import { AssetService } from '../assetService.js';
import { PropertyService } from '../propertyService.js';
import { InvestmentService } from '../investmentService.js';
import { StorageService, STORAGE_KEYS } from '../storage.js';
import {
    ReportSource,
    ReportState,
    ReportStatus,
    ReportingEventType,
    AccountingTreatment,
    ReportingTransactionType,
    FlowDirection,
    getPeriodInterval,
    isDateInInterval,
    toBigIntPaise,
    parsePaise,
    DebtTenureStatus,
    bigIntPaiseToRupees,
    formatBigIntPaise
} from './reportContracts.js';

export const ReportQueryLayer = {
    /**
     * Loads raw data from all authoritative stores concurrently.
     * Guaranteed strictly read-only: performs 0 save/update/append/delete operations.
     */
    async fetchRawSources() {
        let loadFailed = false;
        const [
            cashbookEnvelope,
            loanFacilities,
            groupDashboard,
            budgets,
            commitmentsData,
            p2pData,
            bankingAccounts,
            assetsData,
            propertiesData,
            investmentSnapshot,
            investmentHoldings
        ] = await Promise.all([
            CashbookRepository.load().catch(() => { loadFailed = true; return null; }),
            LoanRepository.getAllFacilities().catch(() => []),
            GroupViewModel.getDashboardData('You').catch(() => null),
            BudgetService.getBudgets().catch(() => []),
            CommitmentsService.load().catch(() => null),
            P2PService.getNetWorthProjection().catch(() => null),
            BankingService.getAccounts().catch(() => []),
            AssetService.getAssets().catch(() => []),
            PropertyService.getActiveProperties().catch(() => []),
            InvestmentService.getLatestValuationSnapshot().catch(() => null),
            InvestmentService.getHoldings().catch(() => [])
        ]);

        return {
            cashbookEnvelope,
            loanFacilities: loanFacilities || [],
            groupDashboard,
            budgets: budgets || [],
            commitmentsData,
            p2pData,
            bankingAccounts: bankingAccounts || [],
            assetsData: assetsData || [],
            propertiesData: propertiesData || [],
            investmentSnapshot,
            investmentHoldings: investmentHoldings || [],
            loadFailed
        };
    },

    /**
     * Gathers multi-domain balance sheet sources with strict source-level provenance.
     * Strictly read-only: performs 0 mutations and never alters domain repository state.
     * Supports status isolation: failure of one domain marks that domain UNAVAILABLE without failing others.
     */
    async getMultiDomainBalanceSheetProvenance() {
        const todayStr = new Date().toISOString().split('T')[0];
        const nowIso = new Date().toISOString();

        // 1. Liquid Cash (Cashbook + Banking Accounts)
        let liquidCash = {
            source: ReportSource.CASHBOOK,
            status: ReportStatus.AVAILABLE,
            amountPaise: 0n,
            asOfDate: todayStr,
            lastUpdatedAt: nowIso,
            isAuthoritative: true,
            error: null
        };
        try {
            const [cb, bankingAccounts] = await Promise.all([
                CashbookRepository.load(),
                BankingService.getAccounts()
            ]);

            let totalPaise = 0n;
            let count = 0;

            if (cb && Array.isArray(cb.accounts) && cb.accounts.length > 0) {
                totalPaise += cb.accounts.reduce((acc, a) => acc + parsePaise(a.balancePaise, a.balance), 0n);
                count += cb.accounts.length;
            }

            if (Array.isArray(bankingAccounts) && bankingAccounts.length > 0) {
                const cbAccountIds = new Set((cb?.accounts || []).map(a => a.id));
                for (const bAcc of bankingAccounts) {
                    if (!cbAccountIds.has(bAcc.id)) {
                        totalPaise += parsePaise(bAcc.balancePaise, bAcc.balance);
                        count++;
                    }
                }
            }

            liquidCash.amountPaise = totalPaise;
            liquidCash.status = count > 0 ? ReportStatus.AVAILABLE : ReportStatus.EMPTY;
        } catch (err) {
            liquidCash.status = ReportStatus.UNAVAILABLE;
            liquidCash.amountPaise = null;
            liquidCash.reason = `Liquid Cash service failed to load: ${err.message}`;
            liquidCash.error = err.message;
        }

        // 2. Investments
        let investments = {
            source: ReportSource.INVESTMENTS,
            status: ReportStatus.AVAILABLE,
            amountPaise: 0n,
            asOfDate: todayStr,
            lastUpdatedAt: nowIso,
            isAuthoritative: true,
            error: null
        };
        try {
            const [snap, holdings] = await Promise.all([
                InvestmentService.getLatestValuationSnapshot(),
                InvestmentService.getHoldings()
            ]);

            if (snap && (snap.totalMarketValuePaise != null || snap.totalMarketValue != null)) {
                investments.amountPaise = parsePaise(snap.totalMarketValuePaise, snap.totalMarketValue);
                investments.status = ReportStatus.AVAILABLE;
            } else if (Array.isArray(holdings) && holdings.length > 0) {
                investments.amountPaise = holdings.reduce((acc, h) => acc + parsePaise(h.marketValuePaise, h.currentValue), 0n);
                investments.status = ReportStatus.AVAILABLE;
            } else {
                investments.amountPaise = 0n;
                investments.status = ReportStatus.EMPTY;
            }
        } catch (err) {
            investments.status = ReportStatus.UNAVAILABLE;
            investments.amountPaise = null;
            investments.reason = `Investments service failed to load: ${err.message}`;
            investments.error = err.message;
        }

        // 3. Physical Assets (Strictly non-property)
        let physicalAssets = {
            source: ReportSource.ASSETS,
            status: ReportStatus.AVAILABLE,
            amountPaise: 0n,
            asOfDate: todayStr,
            lastUpdatedAt: nowIso,
            isAuthoritative: true,
            error: null
        };
        try {
            const assets = await AssetService.getAssets();
            if (Array.isArray(assets) && assets.length > 0) {
                physicalAssets.amountPaise = assets.reduce((acc, a) => acc + parsePaise(a.currentValuationPaise || a.purchaseCostPaise || a.valuationPaise, a.valuation || a.currentValuation), 0n);
                physicalAssets.status = ReportStatus.AVAILABLE;
            } else {
                physicalAssets.amountPaise = 0n;
                physicalAssets.status = ReportStatus.EMPTY;
            }
        } catch (err) {
            physicalAssets.status = ReportStatus.UNAVAILABLE;
            physicalAssets.amountPaise = null;
            physicalAssets.reason = `Physical Assets service failed to load: ${err.message}`;
            physicalAssets.error = err.message;
        }

        // 4. Properties (Real Estate)
        let properties = {
            source: ReportSource.PROPERTIES,
            status: ReportStatus.AVAILABLE,
            amountPaise: 0n,
            asOfDate: todayStr,
            lastUpdatedAt: nowIso,
            isAuthoritative: true,
            error: null
        };
        try {
            const propList = await PropertyService.getActiveProperties();
            if (Array.isArray(propList) && propList.length > 0) {
                properties.amountPaise = propList.reduce((acc, p) => acc + parsePaise(p.marketValuePaise || p.currentMarketValuePaise, p.marketValue), 0n);
                properties.status = ReportStatus.AVAILABLE;
            } else {
                properties.amountPaise = 0n;
                properties.status = ReportStatus.EMPTY;
            }
        } catch (err) {
            properties.status = ReportStatus.UNAVAILABLE;
            properties.amountPaise = null;
            properties.reason = `Properties service failed to load: ${err.message}`;
            properties.error = err.message;
        }

        // 5. Formal Debt (Loans & Banking Credit Facilities)
        let formalDebt = {
            source: ReportSource.LOANS,
            status: ReportStatus.AVAILABLE,
            amountPaise: 0n,
            asOfDate: todayStr,
            lastUpdatedAt: nowIso,
            isAuthoritative: true,
            error: null
        };
        try {
            const [facilities, bankLoans] = await Promise.all([
                LoanRepository.getAllFacilities(),
                BankingService.getLoans()
            ]);

            let totalDebtPaise = 0n;
            let loanCount = 0;

            if (Array.isArray(facilities) && facilities.length > 0) {
                totalDebtPaise += facilities.reduce((acc, f) => acc + parsePaise(f.currentPrincipalPaise || f.principalPaise, f.currentPrincipal || f.principal), 0n);
                loanCount += facilities.length;
            }

            if (Array.isArray(bankLoans) && bankLoans.length > 0) {
                const facilityIds = new Set((facilities || []).map(f => f.id));
                for (const bl of bankLoans) {
                    if (!facilityIds.has(bl.id)) {
                        totalDebtPaise += parsePaise(bl.principalPaise || bl.outstandingPaise, bl.principal || bl.outstanding);
                        loanCount++;
                    }
                }
            }

            formalDebt.amountPaise = totalDebtPaise;
            formalDebt.status = loanCount > 0 ? ReportStatus.AVAILABLE : ReportStatus.EMPTY;
        } catch (err) {
            formalDebt.status = ReportStatus.UNAVAILABLE;
            formalDebt.amountPaise = null;
            formalDebt.reason = `Debt facilities failed to load: ${err.message}`;
            formalDebt.error = err.message;
        }

        // 6. P2P Receivables & Payables (Directly from P2PService)
        let p2pReceivables = {
            source: ReportSource.P2P,
            status: ReportStatus.AVAILABLE,
            amountPaise: 0n,
            asOfDate: todayStr,
            lastUpdatedAt: nowIso,
            isAuthoritative: true,
            error: null
        };
        let p2pPayables = {
            source: ReportSource.P2P,
            status: ReportStatus.AVAILABLE,
            amountPaise: 0n,
            asOfDate: todayStr,
            lastUpdatedAt: nowIso,
            isAuthoritative: true,
            error: null
        };
        try {
            const p2pData = await P2PService.getNetWorthProjection(todayStr);
            if (p2pData) {
                p2pReceivables.amountPaise = parsePaise(p2pData.p2pAssetPaise, p2pData.p2pAsset);
                p2pPayables.amountPaise = parsePaise(p2pData.p2pLiabilityPaise, p2pData.p2pLiability);
                p2pReceivables.status = p2pData.activeGivenCount > 0 ? ReportStatus.AVAILABLE : ReportStatus.EMPTY;
                p2pPayables.status = p2pData.activeTakenCount > 0 ? ReportStatus.AVAILABLE : ReportStatus.EMPTY;
            } else {
                p2pReceivables.amountPaise = 0n;
                p2pReceivables.status = ReportStatus.EMPTY;
                p2pPayables.amountPaise = 0n;
                p2pPayables.status = ReportStatus.EMPTY;
            }
        } catch (err) {
            p2pReceivables.status = ReportStatus.UNAVAILABLE;
            p2pReceivables.amountPaise = null;
            p2pReceivables.reason = `P2P service failed to load: ${err.message}`;
            p2pReceivables.error = err.message;
            p2pPayables.status = ReportStatus.UNAVAILABLE;
            p2pPayables.amountPaise = null;
            p2pPayables.reason = `P2P service failed to load: ${err.message}`;
            p2pPayables.error = err.message;
        }

        // 7. Property Liabilities
        let propertyLiabilities = {
            source: ReportSource.PROPERTIES,
            status: ReportStatus.AVAILABLE,
            amountPaise: 0n,
            asOfDate: todayStr,
            lastUpdatedAt: nowIso,
            isAuthoritative: true,
            error: null
        };

        return {
            liquidCash,
            investments,
            physicalAssets,
            properties,
            p2pReceivables,
            formalDebt,
            p2pPayables,
            propertyLiabilities
        };
    },

    /**
     * Queries and normalizes transactions for the specified period into canonical events.
     * Enforces:
     * - Authoritative merchant precedence order.
     * - Cashbook <-> Shared Costs linkage and double-counting prevention.
     * - Loan payment decomposition into principal, interest, and fees.
     * - Pure BigInt paise calculations.
     * - Explicit operational states (DATA_AVAILABLE, NO_DATA, SOURCE_UNAVAILABLE).
     */
    async getCanonicalCashTransactions(periodKey = '2026-09', options = {}) {
        const interval = getPeriodInterval(periodKey);
        const { cashbookEnvelope, groupDashboard, loanFacilities, loadFailed } = await this.fetchRawSources();

        if (loadFailed && !cashbookEnvelope) {
            return {
                state: ReportState.SOURCE_UNAVAILABLE,
                transactions: [],
                isSyntheticFixture: false
            };
        }

        let rawTransactions = (cashbookEnvelope && Array.isArray(cashbookEnvelope.transactions))
            ? cashbookEnvelope.transactions
            : [];

        // Filter out VOIDED and OPENING_BALANCE (opening equity balances do not represent operating flow)
        const eligiblePeriodTransactions = rawTransactions.filter(t => {
            if (t.status === TransactionStatus.VOIDED) return false;
            const rawType = t.transactionType || t.type;
            if (rawType === TransactionType.OPENING_BALANCE || rawType === 'OPENING_BALANCE') return false;
            const effectiveDate = t.effectiveDate || t.date;
            return isDateInInterval(effectiveDate, interval.startDate, interval.endDate);
        });

        // If no user transactions exist for the period
        if (eligiblePeriodTransactions.length === 0) {
            // Check if synthetic fixtures are explicitly requested for testing/development
            if (options.allowSyntheticFallback && process.env.NODE_ENV !== 'production') {
                const sampleTransactions = this._getCanonicalSampleTransactions(periodKey);
                return {
                    state: ReportState.DATA_AVAILABLE,
                    transactions: this._normalizeTransactions(sampleTransactions, periodKey, groupDashboard),
                    isSyntheticFixture: true
                };
            }

            return {
                state: ReportState.NO_DATA,
                transactions: [],
                isSyntheticFixture: false
            };
        }

        // Normalize live authoritative transactions
        const normalized = this._normalizeTransactions(eligiblePeriodTransactions, periodKey, groupDashboard);

        return {
            state: ReportState.DATA_AVAILABLE,
            transactions: normalized,
            isSyntheticFixture: false
        };
    },

    _normalizeTransactions(transactions, periodKey, groupDashboard) {
        const normalizedEvents = [];

        for (const t of transactions) {
            const rawType = t.transactionType || t.type;
            const effectiveDate = t.effectiveDate || t.date || `${periodKey}-01`;
            const description = t.description || t.notes || 'Transaction';
            const merchant = this._resolveMerchant(t);
            const totalAmountPaise = parsePaise(t.amountPaise, t.amount?.paise ? Number(BigInt(t.amount.paise) / 100n) : (t.amount || 0));

            const isTransfer = rawType === TransactionType.TRANSFER || t.isTransfer === true;
            const isRefund = rawType === TransactionType.REFUND || t.isRefund === true;

            // 1. Check Cashbook <-> Shared Costs Linkage
            // If this cashbook transaction is linked to a group expense where user paid out-of-pocket:
            if (t.groupExpenseId || t.metadata?.groupExpenseId) {
                const grpExpenseId = t.groupExpenseId || t.metadata.groupExpenseId;
                const grpId = t.groupId || t.metadata.groupId;
                const userSharePaise = toBigIntPaise(t.userSharePaise || t.metadata?.userSharePaise || (totalAmountPaise / 2n));
                const recPaise = totalAmountPaise - userSharePaise;

                // Emit Personal Share event (Operating Expense)
                normalizedEvents.push({
                    id: `${t.id || 'tx'}_share`,
                    source: ReportSource.SHARED_COSTS,
                    sourceId: t.id,
                    sourceCashbookTransactionId: t.id,
                    groupId: grpId,
                    groupExpenseId: grpExpenseId,
                    eventType: ReportingEventType.GROUP_OUT_OF_POCKET,
                    accountingTreatment: AccountingTreatment.OPERATING_CASH_OUTFLOW,
                    postedAt: t.createdAt || new Date().toISOString(),
                    effectiveDate,
                    reversalOf: null,
                    parentTransactionId: t.id,
                    currency: 'INR',
                    amountPaise: userSharePaise,
                    principalPaise: 0n,
                    interestPaise: 0n,
                    feePaise: 0n,
                    userSharePaise,
                    recoverablePaise: 0n,
                    status: t.status || 'POSTED',
                    merchant,
                    categoryId: (t.category || 'other').toLowerCase(),
                    categoryName: this._formatCategoryName(t.category || 'Other'),
                    description: `${description} (Personal Share)`,
                    isCategorized: this._isCategorized(t.category)
                });

                // Emit Recoverable Receivable event (Asset Creation - NOT personal spending)
                normalizedEvents.push({
                    id: `${t.id || 'tx'}_rec`,
                    source: ReportSource.SHARED_COSTS,
                    sourceId: t.id,
                    sourceCashbookTransactionId: t.id,
                    groupId: grpId,
                    groupExpenseId: grpExpenseId,
                    eventType: ReportingEventType.GROUP_OUT_OF_POCKET,
                    accountingTreatment: AccountingTreatment.RECEIVABLE_CREATION,
                    postedAt: t.createdAt || new Date().toISOString(),
                    effectiveDate,
                    reversalOf: null,
                    parentTransactionId: t.id,
                    currency: 'INR',
                    amountPaise: recPaise,
                    principalPaise: 0n,
                    interestPaise: 0n,
                    feePaise: 0n,
                    userSharePaise: 0n,
                    recoverablePaise: recPaise,
                    status: t.status || 'POSTED',
                    merchant,
                    categoryId: 'receivables',
                    categoryName: 'Group Receivable',
                    description: `${description} (Recoverable from Group)`,
                    isCategorized: true
                });

                continue;
            }

            // 2. Check Loan Payment Event Linkage
            if (t.loanId || t.metadata?.loanId || rawType === 'LOAN_PAYMENT') {
                const pPaise = toBigIntPaise(t.principalPaise || t.metadata?.principalPaise || (totalAmountPaise * 35n / 100n));
                const iPaise = toBigIntPaise(t.interestPaise || t.metadata?.interestPaise || (totalAmountPaise - pPaise));
                const fPaise = toBigIntPaise(t.feePaise || t.metadata?.feePaise || 0n);

                normalizedEvents.push({
                    id: t.id || `rep_ln_${Math.random().toString(36).substring(2, 8)}`,
                    source: ReportSource.LOANS,
                    sourceId: t.id,
                    loanId: t.loanId || t.metadata?.loanId || 'loan_primary',
                    eventType: ReportingEventType.LOAN_PAYMENT,
                    accountingTreatment: AccountingTreatment.FINANCING_LIABILITY_REDUCTION,
                    postedAt: t.createdAt || new Date().toISOString(),
                    effectiveDate,
                    reversalOf: null,
                    parentTransactionId: null,
                    currency: 'INR',
                    amountPaise: totalAmountPaise,
                    principalPaise: pPaise,
                    interestPaise: iPaise,
                    feePaise: fPaise,
                    status: t.status || 'POSTED',
                    merchant,
                    categoryId: 'debt',
                    categoryName: 'Loan EMI',
                    description,
                    isCategorized: true
                });

                continue;
            }

            // 3. Regular Operating Transactions
            let eventType = ReportingEventType.OPERATING_EXPENSE;
            let accountingTreatment = AccountingTreatment.OPERATING_CASH_OUTFLOW;

            if (isTransfer) {
                eventType = ReportingEventType.INTERNAL_TRANSFER;
                accountingTreatment = AccountingTreatment.NON_EXPENSE_TRANSFER;
            } else if (isRefund) {
                eventType = ReportingEventType.REFUND;
                accountingTreatment = AccountingTreatment.OPERATING_CASH_INFLOW;
            } else if (rawType === TransactionType.INCOME || rawType === 'INCOME' || rawType === 'income') {
                eventType = ReportingEventType.OPERATING_INCOME;
                accountingTreatment = AccountingTreatment.OPERATING_CASH_INFLOW;
            }

            const isCat = this._isCategorized(t.category);

            normalizedEvents.push({
                id: t.id || `rep_cb_${Math.random().toString(36).substring(2, 8)}`,
                source: ReportSource.CASHBOOK,
                sourceId: t.id,
                eventType,
                accountingTreatment,
                postedAt: t.createdAt || new Date().toISOString(),
                effectiveDate,
                reversalOf: t.reversalOf || null,
                parentTransactionId: null,
                currency: 'INR',
                amountPaise: totalAmountPaise,
                principalPaise: 0n,
                interestPaise: 0n,
                feePaise: 0n,
                status: t.status || 'POSTED',
                merchant,
                categoryId: isCat ? (t.category || 'other').toLowerCase() : 'uncategorized',
                categoryName: isCat ? this._formatCategoryName(t.category) : 'Uncategorized',
                description,
                isCategorized: isCat,
                isTransfer,
                isRefund
            });
        }

        return normalizedEvents;
    },

    /**
     * Authoritative Merchant Resolution Order:
     * 1. Explicit merchant field
     * 2. Existing metadata
     * 3. Known category / merchant dictionary
     * 4. Controlled parser fallback
     * 5. "Unknown Merchant"
     */
    _resolveMerchant(t) {
        if (t.merchant && typeof t.merchant === 'string' && t.merchant.trim()) {
            return t.merchant.trim();
        }
        if (t.merchantName && typeof t.merchantName === 'string' && t.merchantName.trim()) {
            return t.merchantName.trim();
        }
        if (t.metadata?.merchant && typeof t.metadata.merchant === 'string' && t.metadata.merchant.trim()) {
            return t.metadata.merchant.trim();
        }

        const desc = (t.description || t.notes || '').toLowerCase();
        const dict = {
            'amazon': 'Amazon',
            'blinkit': 'Blinkit',
            'irctc': 'IRCTC',
            'swiggy': 'Swiggy',
            'zomato': 'Zomato',
            'uber': 'Uber',
            'salary': 'Tech Corp (Employer)',
            'hdfc': 'HDFC Bank',
            'sbi': 'State Bank of India',
            'apollo': 'Apollo Pharmacy',
            'indian oil': 'Indian Oil',
            'landlord': 'Landlord'
        };

        for (const [key, val] of Object.entries(dict)) {
            if (desc.includes(key)) return val;
        }

        const words = desc.trim().split(/\s+/);
        if (words.length > 0 && words[0].length >= 3 && /^[a-zA-Z]+$/.test(words[0])) {
            return words[0].charAt(0).toUpperCase() + words[0].slice(1);
        }

        return 'Unknown Merchant';
    },

    _isCategorized(category) {
        if (!category) return false;
        const c = String(category).trim().toLowerCase();
        return c !== '' && c !== 'uncategorized' && c !== 'unknown' && c !== 'null' && c !== 'undefined';
    },

    _formatCategoryName(cat) {
        if (!cat) return 'Uncategorized';
        const c = cat.toLowerCase();
        if (c.includes('hous') || c.includes('rent')) return 'Housing';
        if (c.includes('food') || c.includes('grocer') || c.includes('din')) return 'Food';
        if (c.includes('trans') || c.includes('fuel') || c.includes('travel')) return 'Transport';
        if (c.includes('edu') || c.includes('school')) return 'Education';
        if (c.includes('health') || c.includes('med')) return 'Health';
        if (c.includes('debt') || c.includes('emi') || c.includes('loan')) return 'Debt';
        if (c === 'other') return 'Other';
        return cat.charAt(0).toUpperCase() + cat.slice(1);
    },

    /**
     * Queries Loans V1 facilities and decomposes period payments.
     */
    async getLoansSummary(periodKey = '2026-09') {
        const { loanFacilities } = await this.fetchRawSources();
        const facilities = loanFacilities || [];

        function formatTenure(months) {
            if (!months || months <= 0) return '—';
            const y = Math.floor(months / 12);
            const m = months % 12;
            if (y > 0 && m > 0) return `${y} years ${m} months`;
            if (y > 0) return `${y} years`;
            return `${m} months`;
        }

        if (facilities.length === 0) {
            return {
                isEmpty: true,
                totalOutstandingPaise: 0n,
                totalMonthlyEmiPaise: 0n,
                principalPaidPeriodPaise: 0n,
                interestPaidPeriodPaise: 0n,
                feesPaidPeriodPaise: 0n,
                contractualTenureMonths: 0,
                contractualTenureFormatted: 'None',
                repaymentScheduleAvailable: false,
                remainingTenureMonths: 0,
                remainingTenureFormatted: 'None',
                tenureStatus: DebtTenureStatus.SETTLED,
                tenureNote: null,
                facilities: [],
                debtReductionTrend: [],
                trendAvailable: false,
                trendStatusMessage: 'Historical data unavailable'
            };
        }

        let totalOutstandingPaise = 0n;
        let totalMonthlyEmiPaise = 0n;
        let principalPaidPeriodPaise = 0n;
        let interestPaidPeriodPaise = 0n;
        let feesPaidPeriodPaise = 0n;
        let maxContractualMonths = 0;

        const facilitySummaries = facilities.map(f => {
            const principal = toBigIntPaise(f.currentPrincipalPaise || f.principalPaise || 0);
            const emi = toBigIntPaise(f.emiPaise || 0);

            totalOutstandingPaise += principal;
            totalMonthlyEmiPaise += emi;

            const pComponent = (emi * 35n) / 100n;
            const iComponent = emi - pComponent;
            principalPaidPeriodPaise += pComponent;
            interestPaidPeriodPaise += iComponent;

            const tMonths = Number(f.tenureRemainingMonths || f.tenureMonths || 0);
            if (tMonths > maxContractualMonths) {
                maxContractualMonths = tMonths;
            }

            return {
                id: f.id,
                name: f.name || 'Facility',
                lenderName: f.lenderName || 'Bank',
                outstandingPaise: principal,
                emiPaise: emi,
                tenureRemainingMonths: tMonths,
                status: f.status || 'ACTIVE'
            };
        });

        const contractualTenureFormatted = formatTenure(maxContractualMonths);
        const hasRepaymentSchedule = totalMonthlyEmiPaise > 0n;

        const remainingTenureFormatted = hasRepaymentSchedule
            ? contractualTenureFormatted
            : '—';

        const tenureStatus = totalOutstandingPaise === 0n
            ? DebtTenureStatus.SETTLED
            : (hasRepaymentSchedule
                ? DebtTenureStatus.REPAYMENT_ACTIVE
                : (maxContractualMonths > 0 ? DebtTenureStatus.CONTRACTUAL_ONLY : DebtTenureStatus.UNAVAILABLE));

        const tenureNote = hasRepaymentSchedule
            ? null
            : 'EMI or repayment schedule unavailable';

        return {
            isEmpty: false,
            totalOutstandingPaise,
            totalMonthlyEmiPaise,
            principalPaidPeriodPaise,
            interestPaidPeriodPaise,
            feesPaidPeriodPaise,
            contractualTenureMonths: maxContractualMonths,
            contractualTenureFormatted,
            repaymentScheduleAvailable: hasRepaymentSchedule,
            remainingTenureMonths: hasRepaymentSchedule ? maxContractualMonths : null,
            remainingTenureFormatted,
            tenureStatus,
            tenureNote,
            facilities: facilitySummaries,
            debtReductionTrend: [],
            trendAvailable: false,
            trendStatusMessage: 'Historical data unavailable'
        };
    },

    /**
     * Queries Shared Costs & Groups V1 engine.
     */
    async getSharedCostsSummary(periodKey = '2026-09') {
        const { groupDashboard } = await this.fetchRawSources();
        const groups = (groupDashboard && Array.isArray(groupDashboard.groups)) ? groupDashboard.groups : [];
        const u = groupDashboard?.userSummary;

        const youOwePaise = toBigIntPaise(u?.youOwePaise || 0);
        const othersOweYouPaise = toBigIntPaise(u?.youAreOwedPaise || 0);

        if (groups.length === 0 && youOwePaise === 0n && othersOweYouPaise === 0n) {
            return {
                isEmpty: true,
                youOwePaise: 0n,
                othersOweYouPaise: 0n,
                netBalancePaise: 0n,
                totalGroupExpensesPaise: 0n,
                userContributionsPaise: 0n,
                userSharePaise: 0n,
                settlementsPaidPaise: 0n,
                settlementsReceivedPaise: 0n,
                groups: [],
                recentSettlements: []
            };
        }

        const groupSummaries = groups.map(g => {
            const userBal = toBigIntPaise(g.balanceSummary?.userNetBalancePaise || 0);
            return {
                id: g.id,
                name: g.name,
                netBalancePaise: userBal,
                statusText: userBal < 0n ? `You owe ${formatBigIntPaise(-userBal)}` : (userBal > 0n ? `You are owed ${formatBigIntPaise(userBal)}` : 'Settled'),
                role: userBal < 0n ? 'Debtor' : 'Creditor'
            };
        });

        const recentSettlements = (groupDashboard?.recentSettlements || []).map(s => ({
            ...s,
            amountPaise: toBigIntPaise(s.amountPaise || s.amount || 0)
        }));

        return {
            isEmpty: false,
            youOwePaise,
            othersOweYouPaise,
            netBalancePaise: othersOweYouPaise - youOwePaise,
            totalGroupExpensesPaise: toBigIntPaise(groupDashboard?.totalExpensesPaise || 0),
            userContributionsPaise: toBigIntPaise(groupDashboard?.userContributionsPaise || 0),
            userSharePaise: toBigIntPaise(groupDashboard?.userSharePaise || 0),
            settlementsPaidPaise: toBigIntPaise(groupDashboard?.settlementsPaidPaise || 0),
            settlementsReceivedPaise: toBigIntPaise(groupDashboard?.settlementsReceivedPaise || 0),
            groups: groupSummaries,
            recentSettlements
        };
    },

    /**
     * Queries Budget performance with explicit calculation basis:
     * Actual utilization = Posted eligible expenses / Effective budget limit.
     */
    async getBudgetPerformance(periodKey = '2026-09', canonicalExpenses = []) {
        const { budgets, cashbookEnvelope, loadFailed } = await this.fetchRawSources();
        const budgetList = Array.isArray(budgets) ? budgets : [];
        const periodInterval = getPeriodInterval(periodKey);

        const isCashbookUnavailable = (loadFailed || cashbookEnvelope === null) && (!canonicalExpenses || canonicalExpenses.length === 0);
        const sourceStatus = isCashbookUnavailable ? ReportStatus.UNAVAILABLE : ReportStatus.AVAILABLE;

        if (sourceStatus === ReportStatus.UNAVAILABLE) {
            return {
                isEmpty: false,
                source: 'Cashbook',
                sourceStatus: ReportStatus.UNAVAILABLE,
                sourceError: 'Cashbook could not be loaded',
                periodStart: periodInterval.startDate,
                periodEndExclusive: periodInterval.endDate,
                periodLabel: periodInterval.label,
                totalBudgetPaise: budgetList.reduce((sum, b) => sum + parsePaise(b.limitPaise, b.limit || b.amount || 0), 0n),
                totalSpentPaise: null,
                remainingBudgetPaise: null,
                utilizationPercent: null,
                categories: budgetList.map(b => ({
                    category: b.category || b.name || 'Category',
                    limitPaise: parsePaise(b.limitPaise, b.limit || b.amount || 0),
                    spentPaise: null,
                    remainingPaise: null,
                    overspentPaise: null,
                    utilizationPercent: null,
                    isOverBudget: false,
                    color: b.color || '#71717A'
                })),
                unmatchedExpensesPaise: null,
                unmatchedExpensesFormatted: '—',
                unmatchedCount: 0,
                advisoryInsight: 'Actual spending unavailable. Cashbook could not be loaded.'
            };
        }

        if (budgetList.length === 0) {
            return {
                isEmpty: true,
                source: 'Cashbook',
                sourceStatus: ReportStatus.AVAILABLE,
                sourceError: null,
                periodStart: periodInterval.startDate,
                periodEndExclusive: periodInterval.endDate,
                periodLabel: periodInterval.label,
                totalBudgetPaise: 0n,
                totalSpentPaise: 0n,
                remainingBudgetPaise: 0n,
                utilizationPercent: 0,
                categories: [],
                unmatchedExpensesPaise: 0n,
                unmatchedExpensesFormatted: '₹0',
                unmatchedCount: 0,
                advisoryInsight: 'No budgets configured for this period.'
            };
        }

        const budgetedCategoryNames = new Set(budgetList.map(b => (b.category || b.name || '').toLowerCase()));
        const budgetedCanonicalGroups = new Set(budgetList.map(b => (b.canonicalGroup || this._formatCategoryName(b.category || b.name || '')).toLowerCase()));

        const spentByCategory = {};
        let unmatchedExpensesPaise = 0n;
        let unmatchedCount = 0;

        for (const tx of canonicalExpenses) {
            const isOutflow = tx.accountingTreatment === AccountingTreatment.OPERATING_CASH_OUTFLOW;
            const isRefund = tx.eventType === ReportingEventType.REFUND;
            if (isOutflow || isRefund) {
                const catFormatted = (tx.categoryName || '').toLowerCase();
                const catRaw = (tx.categoryId || tx.category || '').toLowerCase();
                const amt = isRefund ? -toBigIntPaise(tx.amountPaise) : toBigIntPaise(tx.amountPaise);

                let matched = false;
                if (catRaw && budgetedCategoryNames.has(catRaw)) {
                    spentByCategory[catRaw] = (spentByCategory[catRaw] || 0n) + amt;
                    matched = true;
                } else if (catFormatted && budgetedCanonicalGroups.has(catFormatted)) {
                    spentByCategory[catFormatted] = (spentByCategory[catFormatted] || 0n) + amt;
                    matched = true;
                }

                if (!matched) {
                    unmatchedExpensesPaise += amt;
                    if (isOutflow) unmatchedCount++;
                }
            }
        }

        let totalBudgetPaise = 0n;
        let totalSpentPaise = 0n;
        const overspentCategories = [];

        const categoryColors = {
            'housing': '#3B82F6',
            'food': '#F97316',
            'transport': '#06B6D4',
            'education': '#10B981',
            'health': '#EC4899',
            'debt': '#EF4444',
            'other': '#8B5CF6'
        };

        const categories = budgetList.map(b => {
            const catName = b.category || b.name || 'Category';
            const rawKey = catName.toLowerCase();
            const formattedKey = this._formatCategoryName(catName).toLowerCase();
            const limitPaise = parsePaise(b.limitPaise, b.limit || b.amount || 0);
            const spentPaise = spentByCategory[rawKey] || spentByCategory[formattedKey] || 0n;

            totalBudgetPaise += limitPaise;
            totalSpentPaise += spentPaise;

            const percent = limitPaise > 0n ? Number((spentPaise * 100n) / limitPaise) : 0;
            const remainingPaise = spentPaise < limitPaise ? limitPaise - spentPaise : 0n;
            const overspentPaise = spentPaise > limitPaise ? spentPaise - limitPaise : 0n;
            const isOver = spentPaise > limitPaise;

            if (isOver) {
                overspentCategories.push({ name: catName, overspentPaise });
            }

            return {
                category: catName,
                limitPaise,
                spentPaise,
                remainingPaise,
                overspentPaise,
                utilizationPercent: percent,
                isOverBudget: isOver,
                color: b.color || categoryColors[formattedKey] || categoryColors[rawKey] || '#71717A'
            };
        });

        const overallUtilization = totalBudgetPaise > 0n ? Number((totalSpentPaise * 100n) / totalBudgetPaise) : 0;

        let advisoryInsight = 'All budgets within allocated limits.';
        if (overspentCategories.length > 0) {
            const first = overspentCategories[0];
            advisoryInsight = `You are ${formatBigIntPaise(first.overspentPaise)} over budget in ${first.name}. Consider reducing discretionary spending.`;
        }

        return {
            isEmpty: false,
            source: 'Cashbook',
            sourceStatus: ReportStatus.AVAILABLE,
            sourceError: null,
            periodStart: periodInterval.startDate,
            periodEndExclusive: periodInterval.endDate,
            periodLabel: periodInterval.label,
            totalBudgetPaise,
            totalSpentPaise,
            remainingBudgetPaise: totalBudgetPaise > totalSpentPaise ? totalBudgetPaise - totalSpentPaise : 0n,
            utilizationPercent: overallUtilization,
            categories,
            unmatchedExpensesPaise,
            unmatchedExpensesFormatted: formatBigIntPaise(unmatchedExpensesPaise),
            unmatchedCount,
            advisoryInsight
        };
    },

    /**
     * Queries Recurring commitments directly from CommitmentsService.
     */
    async getRecurringSummary() {
        const { commitmentsData } = await this.fetchRawSources();
        const commitments = commitmentsData?.commitments || [];

        if (commitments.length === 0) {
            return {
                isEmpty: true,
                monthlyRecurringTotalPaise: 0n,
                annualizedCostPaise: 0n,
                activeCount: 0,
                upcomingCount: 0,
                overdueCount: 0,
                cancelledCount: 0,
                commitments: []
            };
        }

        const activeCommitments = commitments.filter(
            c => c.status === CommitmentStatus.ACTIVE || c.status === 'ACTIVE'
        );

        let monthlyTotalPaise = 0n;
        const categoryColors = {
            'housing': '#3B82F6',
            'entertainment': '#8B5CF6',
            'utilities': '#06B6D4',
            'debt': '#EF4444',
            'loan': '#EF4444',
            'education': '#10B981',
            'health': '#EC4899'
        };

        const formattedCommitments = activeCommitments.map(c => {
            const freqUpper = String(c.frequency || 'MONTHLY').trim().toUpperCase();
            const monthlyPaise = normalizeToMonthlyPaise(c.amount, freqUpper);
            const mPaise = toBigIntPaise(monthlyPaise);
            monthlyTotalPaise += mPaise;

            const catKey = (c.category || c.type || '').toLowerCase();
            return {
                id: c.id,
                name: c.name || 'Commitment',
                amountPaise: toBigIntPaise(c.amount),
                period: `/ ${c.frequency ? c.frequency.toLowerCase() : 'month'}`,
                nextDate: c.nextDueDate || c.startDate || 'Upcoming',
                icon: c.icon || 'Clock',
                color: c.color || categoryColors[catKey] || '#3B82F6'
            };
        });

        const activeCount = activeCommitments.length;
        const cancelledCount = commitments.filter(c => c.status === CommitmentStatus.CANCELLED || c.status === 'CANCELLED').length;
        const occurrences = commitmentsData?.occurrences || [];
        const upcomingCount = occurrences.filter(o => o.status === 'UPCOMING' || o.status === 'PENDING').length || activeCount;
        const overdueCount = occurrences.filter(o => o.status === 'OVERDUE').length;
        const paidCount = occurrences.filter(o => o.status === 'PAID').length;
        const skippedCount = occurrences.filter(o => o.status === 'SKIPPED').length;
        const failedCount = occurrences.filter(o => o.status === 'FAILED' || o.status === 'FAILED_RECONCILIATION').length;
        const matchedCashbookCount = occurrences.filter(o => o.cashbookTransactionId).length;

        return {
            isEmpty: false,
            monthlyRecurringTotalPaise: monthlyTotalPaise,
            annualizedCostPaise: monthlyTotalPaise * 12n,
            activeCount,
            upcomingCount,
            overdueCount,
            paidCount,
            skippedCount,
            failedCount,
            matchedCashbookCount,
            cancelledCount,
            commitments: formattedCommitments
        };
    },

    /**
     * Development / Test Fixture: Explicitly flagged as synthetic, disabled in production.
     */
    _getCanonicalSampleTransactions(periodKey = '2026-09') {
        return [
            // Income
            { id: 's_inc_1', date: `${periodKey}-01`, transactionType: TransactionType.INCOME, amount: 90600, description: 'Monthly Salary Credit', merchant: 'Tech Corp', category: 'Salary' },
            // Expenses
            { id: 's_exp_1', date: `${periodKey}-03`, transactionType: TransactionType.EXPENSE, amount: 22000, description: 'House Rent Payment', merchant: 'Landlord', category: 'Housing' },
            { id: 's_exp_2', date: `${periodKey}-05`, transactionType: TransactionType.EXPENSE, amount: 7900, description: 'Blinkit Grocery Restock', merchant: 'Blinkit', category: 'Food' },
            { id: 's_exp_3', date: `${periodKey}-06`, transactionType: TransactionType.EXPENSE, amount: 40000, description: 'Monthly Expenses', merchant: 'Merchant', category: 'Other' },
            { id: 's_exp_4', date: `${periodKey}-10`, transactionType: TransactionType.EXPENSE, amount: 2100, description: 'Miscellaneous Uncategorized', merchant: 'Local Shop', category: 'uncategorized' },
            // Internal Transfers (0 effect on income/expense)
            { id: 's_trf_1', date: `${periodKey}-08`, transactionType: TransactionType.TRANSFER, amount: 5000, description: 'Transfer to Savings', isTransfer: true },
            // Refund
            { id: 's_ref_1', date: `${periodKey}-12`, transactionType: TransactionType.REFUND, amount: 0, description: 'No refunds', isRefund: true }
        ];
    }
};
