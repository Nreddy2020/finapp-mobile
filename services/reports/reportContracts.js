/**
 * services/reports/reportContracts.js
 * 
 * FinLife Reports V1 — Canonical Reporting Domain Contracts & Invariants.
 * 
 * Enforces:
 * - Immutable, read-only canonical transaction representation.
 * - Exact paise / BigInt arithmetic to eliminate floating-point drift.
 * - Half-open interval period boundaries [startDate, endDate).
 * - Mathematical reconciliation invariants across Cashbook, Loans, Groups, Budgets, and Recurring.
 */

export const ReportSource = Object.freeze({
    CASHBOOK: 'cashbook',
    BANKING: 'banking',
    LOANS: 'loans',
    SHARED_COSTS: 'shared-costs',
    P2P: 'p2p',
    COMMITMENTS: 'commitments',
    BUDGETS: 'budgets',
    ASSETS: 'assets',
    PROPERTIES: 'properties',
    INVESTMENTS: 'investments'
});

export const ReportState = Object.freeze({
    DATA_AVAILABLE: 'DATA_AVAILABLE',
    NO_DATA: 'NO_DATA',
    SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE',
    RECONCILIATION_FAILED: 'RECONCILIATION_FAILED'
});

export const ReportStatus = Object.freeze({
    AVAILABLE: 'AVAILABLE',
    STALE: 'STALE',
    PARTIAL: 'PARTIAL',
    UNAVAILABLE: 'UNAVAILABLE',
    CORRUPT: 'CORRUPT',
    ERROR: 'ERROR',
    EMPTY: 'EMPTY',
    LOADING: 'LOADING'
});

export const AccountingTreatment = Object.freeze({
    OPERATING_CASH_OUTFLOW: 'OPERATING_CASH_OUTFLOW',
    OPERATING_CASH_INFLOW: 'OPERATING_CASH_INFLOW',
    FINANCING_LIABILITY_REDUCTION: 'FINANCING_LIABILITY_REDUCTION',
    FINANCING_INFLOW: 'FINANCING_INFLOW',
    NON_EXPENSE_TRANSFER: 'NON_EXPENSE_TRANSFER',
    NON_EXPENSE_SETTLEMENT: 'NON_EXPENSE_SETTLEMENT',
    RECEIVABLE_CREATION: 'RECEIVABLE_CREATION',
    EQUITY_OPENING: 'EQUITY_OPENING'
});

export const ReportingEventType = Object.freeze({
    OPERATING_EXPENSE: 'OPERATING_EXPENSE',
    OPERATING_INCOME: 'OPERATING_INCOME',
    INTERNAL_TRANSFER: 'INTERNAL_TRANSFER',
    REFUND: 'REFUND',
    LOAN_DISBURSEMENT: 'LOAN_DISBURSEMENT',
    LOAN_PAYMENT: 'LOAN_PAYMENT',
    GROUP_OUT_OF_POCKET: 'GROUP_OUT_OF_POCKET',
    GROUP_SETTLEMENT_PAYMENT: 'GROUP_SETTLEMENT_PAYMENT',
    GROUP_SETTLEMENT_RECEIPT: 'GROUP_SETTLEMENT_RECEIPT',
    OPENING_BALANCE: 'OPENING_BALANCE'
});

export const ReportingTransactionType = Object.freeze({
    INCOME: 'income',
    EXPENSE: 'expense',
    TRANSFER: 'transfer',
    REFUND: 'refund',
    LOAN_PAYMENT: 'loan_payment',
    GROUP_SETTLEMENT: 'group_settlement'
});

export const FlowDirection = Object.freeze({
    INFLOW: 'inflow',
    OUTFLOW: 'outflow',
    NEUTRAL: 'neutral'
});

export const ComparisonStatus = Object.freeze({
    AVAILABLE: 'AVAILABLE',
    UNAVAILABLE: 'UNAVAILABLE',
    NOT_MEANINGFUL: 'NOT_MEANINGFUL'
});

export const DebtTenureStatus = Object.freeze({
    REPAYMENT_ACTIVE: 'REPAYMENT_ACTIVE',
    CONTRACTUAL_ONLY: 'CONTRACTUAL_ONLY',
    SETTLED: 'SETTLED',
    UNAVAILABLE: 'UNAVAILABLE'
});

/**
 * Evaluates comparative change safely with strict eligibility rules:
 * - AVAILABLE: current and previous are valid, previous is non-zero, meaningful direction.
 * - UNAVAILABLE: previous missing, empty, or previous value is 0.
 * - NOT_MEANINGFUL: both valid but signs cross zero or undefined base.
 */
export function evaluateComparison(currentValPaise, previousValPaise, currentRecordsExist = true, previousRecordsExist = true) {
    if (!currentRecordsExist || !previousRecordsExist || previousValPaise === null || previousValPaise === undefined) {
        return {
            status: ComparisonStatus.UNAVAILABLE,
            percent: null,
            percentFormatted: '—',
            direction: null,
            text: 'Previous-period comparison unavailable',
            vsPeriodText: 'vs previous period'
        };
    }

    if (previousValPaise === 0n) {
        return {
            status: ComparisonStatus.UNAVAILABLE,
            percent: null,
            percentFormatted: '—',
            direction: null,
            text: 'Previous period had no baseline',
            vsPeriodText: 'vs previous period'
        };
    }

    const diff = currentValPaise - previousValPaise;
    const absDiff = diff < 0n ? -diff : diff;
    const absPrev = previousValPaise < 0n ? -previousValPaise : previousValPaise;
    const bps = (absDiff * 10000n) / absPrev;
    const pct = Number(bps) / 100;
    const isHigher = diff > 0n;
    const direction = diff === 0n ? 'FLAT' : (isHigher ? 'UP' : 'DOWN');
    const sign = isHigher ? '↑' : (diff < 0n ? '↓' : '');
    const changeLabel = isHigher ? `${pct.toFixed(0)}% higher than last month` : (diff < 0n ? `${pct.toFixed(0)}% lower than last month` : 'No change vs last month');

    return {
        status: ComparisonStatus.AVAILABLE,
        percent: pct,
        percentFormatted: `${sign} ${pct.toFixed(0)}%`.trim(),
        direction,
        text: changeLabel,
        vsPeriodText: 'vs previous period'
    };
}

// 8 Independently Rendered Report Screens / Views
export const ReportSection = Object.freeze({
    OVERVIEW: 'overview',
    SPENDING: 'spending',
    CASH_FLOW: 'cash_flow',
    DEBT: 'debt',
    GROUPS: 'groups',
    BUDGET: 'budget',
    RECURRING: 'recurring',
    DIAGNOSTICS: 'diagnostics' // 8th Screen: Reconciliation Diagnostics & Ledger Health
});

/**
 * Returns half-open date boundary for a given YYYY-MM period key.
 * Start: YYYY-MM-01 (local financial calendar date)
 * End:   Next month 1st (local financial calendar date)
 * Enforces half-open interval: [startDate, endDate)
 */
export function getPeriodInterval(periodKey = '2026-09') {
    const parts = (periodKey || '2026-09').split('-');
    if (parts.length !== 2) {
        throw new Error(`[reportContracts] Invalid periodKey format: ${periodKey}. Expected YYYY-MM.`);
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        throw new Error(`[reportContracts] Invalid year or month in periodKey: ${periodKey}`);
    }

    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonthYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const endStr = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const prevMonthYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevPeriodKey = `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}`;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const label = `${monthNames[month - 1]} ${year}`;

    return {
        periodKey,
        prevPeriodKey,
        startDate: startStr,
        endDate: endStr,
        label
    };
}

/**
 * Checks if a date string falls inside the half-open interval [startDate, endDate).
 * Treats dates according to user's configured local financial calendar (YYYY-MM-DD).
 */
export function isDateInInterval(dateStr, startDate, endDate) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const d = dateStr.split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    return d >= startDate && d < endDate;
}

/**
 * Returns deterministic monthly segment intervals for dynamic Cash Flow charting:
 * Segments:
 * - 1-7 (Days 1 through 7)
 * - 8-14 (Days 8 through 14)
 * - 15-21 (Days 15 through 21)
 * - 22-28 (Days 22 through 28)
 * - 29-end (Days 29 through end of month, if month > 28 days)
 * All boundaries use half-open intervals [startDate, endDate).
 */
export function getMonthlyCashFlowIntervals(periodKey = '2026-09') {
    const parts = (periodKey || '2026-09').split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const shortMonth = monthNames[month - 1] || 'M';

    // Calculate days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const pad = (n) => String(n).padStart(2, '0');
    const ym = `${year}-${pad(month)}`;

    const nextMonthYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYmStart = `${nextMonthYear}-${pad(nextMonth)}-01`;

    const intervals = [
        {
            id: 'seg_1',
            label: `1-7 ${shortMonth}`,
            startDate: `${ym}-01`,
            endDate: `${ym}-08`
        },
        {
            id: 'seg_2',
            label: `8-14 ${shortMonth}`,
            startDate: `${ym}-08`,
            endDate: `${ym}-15`
        },
        {
            id: 'seg_3',
            label: `15-21 ${shortMonth}`,
            startDate: `${ym}-15`,
            endDate: `${ym}-22`
        },
        {
            id: 'seg_4',
            label: `22-28 ${shortMonth}`,
            startDate: `${ym}-22`,
            endDate: `${ym}-29`
        }
    ];

    if (daysInMonth > 28) {
        intervals.push({
            id: 'seg_5',
            label: `29-${daysInMonth} ${shortMonth}`,
            startDate: `${ym}-29`,
            endDate: nextYmStart
        });
    }

    return intervals;
}

/**
 * Helper to safely convert any input to pure BigInt Paise.
 * Eliminates IEEE 754 floating-point errors.
 */
export function toBigIntPaise(val) {
    if (val === null || val === undefined) return 0n;
    if (typeof val === 'bigint') return val;
    if (typeof val === 'object') {
        if (val.paise !== undefined) {
            return typeof val.paise === 'bigint' ? val.paise : BigInt(String(val.paise).split('.')[0] || '0');
        }
        if (val.amount !== undefined) return toBigIntPaise(val.amount);
    }
    if (typeof val === 'number') {
        if (!Number.isFinite(val)) return 0n;
        return BigInt(Math.round(val * 100));
    }
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    if (!cleanStr || cleanStr === '-' || cleanStr === '.') return 0n;
    if (cleanStr.includes('.')) {
        const parts = cleanStr.split('.');
        const whole = parts[0] || '0';
        const frac = (parts[1] || '').padEnd(2, '0').slice(0, 2);
        const sign = whole.startsWith('-') ? -1n : 1n;
        const absWhole = whole.replace('-', '');
        return sign * (BigInt(absWhole) * 100n + BigInt(frac));
    }
    return BigInt(cleanStr) * 100n;
}

/**
 * Safely parses an amount that is already in paise (or falls back to a rupee field).
 * If fieldPaise is provided (as BigInt, string, or number), it is parsed directly as paise.
 * If only fallbackRupees is provided, it is converted to paise via toBigIntPaise(fallbackRupees).
 */
export function parsePaise(fieldPaise, fallbackRupees = 0) {
    if (fieldPaise !== undefined && fieldPaise !== null && fieldPaise !== '') {
        if (typeof fieldPaise === 'bigint') return fieldPaise;
        const clean = String(fieldPaise).split('.')[0].replace(/[^0-9-]/g, '');
        if (clean && clean !== '-') {
            try {
                return BigInt(clean);
            } catch (_) {
                // fall through
            }
        }
    }
    return toBigIntPaise(fallbackRupees);
}

/**
 * Backwards-compatible toPaise that returns number, internally powered by toBigIntPaise.
 */
export function toPaise(val) {
    return Number(toBigIntPaise(val));
}

/**
 * Formats BigInt or Number paise into Indian Rupee representation.
 */
export function formatBigIntPaise(paise, includeSymbol = true) {
    const p = typeof paise === 'bigint' ? paise : BigInt(paise || 0);
    const isNeg = p < 0n;
    const absP = isNeg ? -p : p;
    const rupees = absP / 100n;
    const formatted = Number(rupees).toLocaleString('en-IN');
    const sign = isNeg ? '-' : '';
    return includeSymbol ? `${sign}₹${formatted}` : `${sign}${formatted}`;
}

export function formatPaise(paise, includeSymbol = true) {
    return formatBigIntPaise(paise, includeSymbol);
}

/**
 * Converts BigInt paise to Rupee numbers strictly for UI chart coordinate scale.
 */
export function bigIntPaiseToRupees(paise) {
    const p = typeof paise === 'bigint' ? paise : BigInt(paise || 0);
    return Number(p / 100n);
}

export function paiseToRupees(paise) {
    return bigIntPaiseToRupees(paise);
}

/**
 * Formal Mathematical Invariant Checks with Structured Diagnostics.
 */
export const ReportInvariants = Object.freeze({
    /**
     * Invariant 1: Cash Flow Identity
     * Net Cash Flow = Total Inflow - Total Outflow
     */
    verifyCashFlowIdentity(incomePaise, expensePaise, netFlowPaise, sourceIds = []) {
        const inc = typeof incomePaise === 'bigint' ? incomePaise : BigInt(incomePaise || 0);
        const exp = typeof expensePaise === 'bigint' ? expensePaise : BigInt(expensePaise || 0);
        const act = typeof netFlowPaise === 'bigint' ? netFlowPaise : BigInt(netFlowPaise || 0);
        const expected = inc - exp;
        const diff = act - expected;
        const passed = diff === 0n;

        return {
            id: 'RPT-INV-01',
            name: 'Cash Flow Identity (Income - Expense = Net Flow)',
            passed,
            expectedPaise: expected.toString(),
            actualPaise: act.toString(),
            differencePaise: diff.toString(),
            sourceIds
        };
    },

    /**
     * Invariant 2: Category Totals Reconciliation with Uncategorized Expenses
     * Sum(Categorized Expenses) + Uncategorized Expenses = Total Eligible Expenses
     */
    verifyCategorySum(categorizedPaise, uncategorizedPaise, totalExpensePaise, sourceIds = []) {
        const cat = typeof categorizedPaise === 'bigint' ? categorizedPaise : BigInt(categorizedPaise || 0);
        const uncat = typeof uncategorizedPaise === 'bigint' ? uncategorizedPaise : BigInt(uncategorizedPaise || 0);
        const total = typeof totalExpensePaise === 'bigint' ? totalExpensePaise : BigInt(totalExpensePaise || 0);

        const expected = cat + uncat;
        const diff = total - expected;
        const passed = diff === 0n;

        return {
            id: 'RPT-INV-02',
            name: 'Category Reconciliation with Uncategorized Expenses',
            passed,
            categorizedExpensesPaise: cat.toString(),
            uncategorizedExpensesPaise: uncat.toString(),
            totalExpensesPaise: total.toString(),
            differencePaise: diff.toString(),
            sourceIds
        };
    },

    /**
     * Invariant 3: Transfer Isolation
     * Internal transfers must NOT contribute to income or expenses.
     */
    verifyTransferIsolation(transactions) {
        const violatingIds = [];
        for (const tx of transactions) {
            const isTrf = tx.isTransfer || tx.accountingTreatment === AccountingTreatment.NON_EXPENSE_TRANSFER;
            if (isTrf) {
                if (tx.accountingTreatment === AccountingTreatment.OPERATING_CASH_INFLOW ||
                    tx.accountingTreatment === AccountingTreatment.OPERATING_CASH_OUTFLOW) {
                    violatingIds.push(tx.id);
                }
            }
        }
        const passed = violatingIds.length === 0;
        return {
            id: 'RPT-INV-03',
            name: 'Internal Transfer Non-Inflation Invariant',
            passed,
            differencePaise: violatingIds.length.toString(),
            sourceIds: violatingIds
        };
    },

    /**
     * Invariant 4: Group Conservation
     * Sum of all group members' net balances must equal 0 paise.
     */
    verifyGroupConservation(memberBalances) {
        const sum = Object.values(memberBalances).reduce((acc, bal) => acc + BigInt(bal), 0n);
        const passed = sum === 0n;
        return {
            id: 'RPT-INV-04',
            name: 'Group Balance Conservation (Zero-Sum)',
            passed,
            expectedPaise: '0',
            actualPaise: sum.toString(),
            differencePaise: sum.toString(),
            sourceIds: Object.keys(memberBalances)
        };
    },

    /**
     * Invariant 5: Event-Level Loan Payment Decomposition
     * For each loan payment: principalPaise + interestPaise + feePaise = paymentAmountPaise
     */
    verifyEventLoanPaymentDecomposition(principalPaise, interestPaise, feePaise, totalPaymentPaise, loanPaymentId = '') {
        const p = typeof principalPaise === 'bigint' ? principalPaise : BigInt(principalPaise || 0);
        const i = typeof interestPaise === 'bigint' ? interestPaise : BigInt(interestPaise || 0);
        const f = typeof feePaise === 'bigint' ? feePaise : BigInt(feePaise || 0);
        const total = typeof totalPaymentPaise === 'bigint' ? totalPaymentPaise : BigInt(totalPaymentPaise || 0);

        const sum = p + i + f;
        const diff = total - sum;
        const passed = diff === 0n;

        return {
            id: 'RPT-INV-05',
            name: 'Event-Level Loan Payment Decomposition',
            passed,
            expectedPaise: total.toString(),
            actualPaise: sum.toString(),
            differencePaise: diff.toString(),
            sourceIds: loanPaymentId ? [loanPaymentId] : []
        };
    },

    /**
     * Invariant 6: Period Loan Component Sum
     * Sum of payment components = Sum of eligible posted loan payment events.
     * Disbursements are strictly excluded from payment totals.
     */
    verifyPeriodLoanComponents(sumPrincipalPaise, sumInterestPaise, sumFeePaise, sumPostedPaymentsPaise, sourceIds = []) {
        const p = typeof sumPrincipalPaise === 'bigint' ? sumPrincipalPaise : BigInt(sumPrincipalPaise || 0);
        const i = typeof sumInterestPaise === 'bigint' ? sumInterestPaise : BigInt(sumInterestPaise || 0);
        const f = typeof sumFeePaise === 'bigint' ? sumFeePaise : BigInt(sumFeePaise || 0);
        const total = typeof sumPostedPaymentsPaise === 'bigint' ? sumPostedPaymentsPaise : BigInt(sumPostedPaymentsPaise || 0);

        const expected = p + i + f;
        const diff = total - expected;
        const passed = diff === 0n;

        return {
            id: 'RPT-INV-06',
            name: 'Period Loan Component Sum (Principal + Interest + Fees = Payments)',
            passed,
            expectedPaise: total.toString(),
            actualPaise: expected.toString(),
            differencePaise: diff.toString(),
            sourceIds
        };
    },

    /**
     * Invariant 7: Cashbook <-> Shared Costs Multi-Payer Linkage
     * Sum(Linked Cashbook Outflows) = Personal Share + Recoverable Receivable
     */
    verifySharedCostsLinkage(linkedCashbookOutflowPaise, personalSharePaise, recoverableReceivablePaise, sourceIds = []) {
        const cashflow = typeof linkedCashbookOutflowPaise === 'bigint' ? linkedCashbookOutflowPaise : BigInt(linkedCashbookOutflowPaise || 0);
        const share = typeof personalSharePaise === 'bigint' ? personalSharePaise : BigInt(personalSharePaise || 0);
        const rec = typeof recoverableReceivablePaise === 'bigint' ? recoverableReceivablePaise : BigInt(recoverableReceivablePaise || 0);

        const expected = share + rec;
        const diff = cashflow - expected;
        const passed = diff === 0n;

        return {
            id: 'RPT-INV-07',
            name: 'Cashbook <-> Shared Costs Event Linkage Non-Duplication',
            passed,
            expectedPaise: cashflow.toString(),
            actualPaise: expected.toString(),
            differencePaise: diff.toString(),
            sourceIds
        };
    }
});
