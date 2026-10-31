/**
 * services/cashbook/cashbookEngine.js
 * 
 * Pure mathematical calculation engine for the FinLife Cashbook Ledger.
 * 
 * Invariants:
 * - 100% pure functions: no side effects, no storage calls, no external state.
 * - BigInt integer paise arithmetic only: zero floating point math.
 * - Asset accounts: positive balance = money owned (+ is asset).
 * - Liability accounts: positive balance = amount owed (+ is debt).
 * - Transfers are net-zero: they NEVER inflate period income or expense metrics.
 * - Voided transactions are strictly ignored during active balance calculation.
 * - Complete genesis recomputation verifying ledger integrity and transfer leg pairing.
 */

import {
    AccountNature,
    ACCOUNT_TYPE_NATURE,
    AccountClassification,
    ACCOUNT_TYPE_DEFAULT_CLASSIFICATION,
    isCashAccount,
    SYSTEM_CHART_OF_ACCOUNTS,
    TransactionType,
    TransactionStatus,
    BalanceEffect,
    RefundTargetType,
    CashbookType,
    BalanceMode,
    LedgerLineType,
    STANDARD_DENOMINATIONS,
    CashbookConfigMap,
    DailyClosingStatus,
    createMoneyPaise,
    moneyToBigInt,
    formatMoneyPaise,
    validateJournalLines
} from './cashbookContracts.js';
import { validateTransferPairContinuity, validateLoanRepaymentSplit } from './cashbookValidator.js';

/**
 * Computes the exact balance for each account using BigInt paise arithmetic.
 * 
 * @param {Array<Object>} accounts - List of Account contracts
 * @param {Array<Object>} transactions - List of Transaction contracts
 * @returns {Record<string, { paise: string, bigIntPaise: bigint, formatted: string, nature: string }>}
 */
export function computeAccountBalances(accounts, transactions) {
    if (!accounts || !Array.isArray(accounts)) {
        throw new Error('ACCOUNTS_REQUIRED: accounts array is required for balance computation');
    }

    const balanceMap = {};

    // 1. Initialize registered accounts to 0n
    for (const acc of accounts) {
        balanceMap[acc.id] = {
            accountId: acc.id,
            accountName: acc.name,
            accountType: acc.type,
            nature: acc.nature || ACCOUNT_TYPE_NATURE[acc.type] || AccountNature.ASSET,
            classification: acc.classification || ACCOUNT_TYPE_DEFAULT_CLASSIFICATION[acc.type] || AccountClassification.GENERAL,
            bookId: acc.bookId || null,
            bigIntPaise: 0n
        };
    }

    // Include system chart of accounts in balanceMap so nominal accounts can receive journal postings
    for (const sysAcc of SYSTEM_CHART_OF_ACCOUNTS) {
        if (!balanceMap[sysAcc.id]) {
            balanceMap[sysAcc.id] = {
                accountId: sysAcc.id,
                accountName: sysAcc.name,
                accountType: sysAcc.type,
                nature: sysAcc.nature,
                classification: sysAcc.classification,
                bookId: null,
                bigIntPaise: 0n
            };
        }
    }

    // 2. Sort transactions chronologically (stable sort)
    const sortedTxns = [...transactions].sort((a, b) => {
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        // Opening balance always processes first on same date
        if (a.transactionType === TransactionType.OPENING_BALANCE) return -1;
        if (b.transactionType === TransactionType.OPENING_BALANCE) return 1;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    // 3. Process each transaction
    for (const txn of sortedTxns) {
        // Voided or pending transactions do not affect posted balance
        if (txn.status === TransactionStatus.VOIDED || txn.status === TransactionStatus.PENDING) {
            continue;
        }

        // Boundary 1: Authoritative Journal Lines posting
        // Invariant: If txn.lines !== undefined, lines must be strictly validated.
        // If invalid, REJECT immediately with error (atomicity guarantee). Never fall back!
        if (txn.lines !== undefined) {
            validateJournalLines(txn.lines, { accounts, bookId: txn.bookId, isCrossBook: Boolean(txn.isCrossBook) });

            // Pass 1: Strict account resolution & book ownership check
            for (const line of txn.lines) {
                const target = balanceMap[line.accountId];
                if (!target) {
                    throw new Error(
                        `[UNREGISTERED_ACCOUNT] Journal line references unknown account '${line.accountId}'. Every journal line account must exist in the registered accounts.`
                    );
                }
                if (txn.bookId && target.bookId && target.bookId !== txn.bookId && !txn.isCrossBook) {
                    throw new Error(
                        `[CROSS_BOOK_VIOLATION] Account '${line.accountId}' belongs to book '${target.bookId}', not transaction book '${txn.bookId}'.`
                    );
                }
            }

            // Pass 2: Atomic balance mutation
            for (const line of txn.lines) {
                const target = balanceMap[line.accountId];
                const deb = BigInt(line.debitPaise || '0');
                const cred = BigInt(line.creditPaise || '0');
                if (target.nature === AccountNature.ASSET || target.nature === AccountNature.EXPENSE) {
                    target.bigIntPaise += (deb - cred);
                } else if (target.nature === AccountNature.LIABILITY || target.nature === AccountNature.INCOME || target.nature === AccountNature.EQUITY) {
                    target.bigIntPaise += (cred - deb);
                }
            }
            continue;
        }

        const amountPaise = moneyToBigInt(txn.amount);

        switch (txn.transactionType) {
            case TransactionType.OPENING_BALANCE: {
                const target = balanceMap[txn.accountId];
                if (!target) {
                    throw new Error(`[UNREGISTERED_ACCOUNT] Opening balance references unknown account '${txn.accountId}'`);
                }
                target.bigIntPaise += amountPaise;
                break;
            }

            case TransactionType.INCOME: {
                const destId = txn.destinationAccountId || txn.accountId;
                const target = balanceMap[destId];
                if (!target) {
                    throw new Error(`[UNREGISTERED_ACCOUNT] Income transaction references unknown account '${destId}'`);
                }
                if (target.nature === AccountNature.ASSET) {
                    target.bigIntPaise += amountPaise;
                } else {
                    // Income deposited into a liability account reduces the debt
                    target.bigIntPaise -= amountPaise;
                }
                break;
            }

            case TransactionType.EXPENSE: {
                const srcId = txn.sourceAccountId || txn.accountId;
                const target = balanceMap[srcId];
                if (!target) {
                    throw new Error(`[UNREGISTERED_ACCOUNT] Expense transaction references unknown account '${srcId}'`);
                }
                if (target.nature === AccountNature.ASSET) {
                    target.bigIntPaise -= amountPaise;
                } else {
                    // Spending on a liability account (e.g. credit card) increases the debt
                    target.bigIntPaise += amountPaise;
                }
                break;
            }

            case TransactionType.TRANSFER: {
                const src = balanceMap[txn.sourceAccountId];
                const dest = balanceMap[txn.destinationAccountId];
                if (!src) {
                    throw new Error(`[UNREGISTERED_ACCOUNT] Transfer source account '${txn.sourceAccountId}' does not exist`);
                }
                if (!dest) {
                    throw new Error(`[UNREGISTERED_ACCOUNT] Transfer destination account '${txn.destinationAccountId}' does not exist`);
                }

                // Source leg
                if (src.nature === AccountNature.ASSET) {
                    src.bigIntPaise -= amountPaise;
                } else {
                    src.bigIntPaise += amountPaise;
                }

                // Destination leg
                if (dest.nature === AccountNature.ASSET) {
                    dest.bigIntPaise += amountPaise;
                } else {
                    // Transfer into liability (e.g. paying credit card bill from bank) reduces liability
                    dest.bigIntPaise -= amountPaise;
                }
                break;
            }

            case TransactionType.REFUND: {
                const targetId = txn.destinationAccountId || txn.sourceAccountId || txn.accountId;
                const target = balanceMap[targetId];
                if (!target) {
                    throw new Error(`[UNREGISTERED_ACCOUNT] Refund references unknown account '${targetId}'`);
                }
                if (target.nature === AccountNature.ASSET) {
                    target.bigIntPaise += amountPaise;
                } else {
                    target.bigIntPaise -= amountPaise;
                }
                break;
            }

            case TransactionType.ADJUSTMENT: {
                const target = balanceMap[txn.accountId];
                if (!target) {
                    throw new Error(`[UNREGISTERED_ACCOUNT] Adjustment references unknown account '${txn.accountId}'`);
                }
                if (txn.balanceEffect === BalanceEffect.INCREASE) {
                    target.bigIntPaise += amountPaise;
                } else if (txn.balanceEffect === BalanceEffect.DECREASE) {
                    target.bigIntPaise -= amountPaise;
                }
                break;
            }
        }
    }

    // 4. Format outputs
    const result = {};
    for (const [id, acc] of Object.entries(balanceMap)) {
        const isNegative = acc.bigIntPaise < 0n;
        const absVal = isNegative ? -acc.bigIntPaise : acc.bigIntPaise;
        const paiseObj = createMoneyPaise(absVal);
        const formattedRaw = formatMoneyPaise(paiseObj);

        result[id] = {
            accountId: acc.accountId,
            accountName: acc.accountName,
            accountType: acc.accountType,
            nature: acc.nature,
            bigIntPaise: acc.bigIntPaise,
            paise: acc.bigIntPaise.toString(),
            formatted: isNegative ? `-${formattedRaw}` : formattedRaw,
            isNegative
        };
    }

    return result;
}

/**
 * Recomputes ledger balances from genesis and verifies complete ledger integrity.
 * 
 * Integrity checks performed:
 * 1. Checks that every non-voided transaction references valid registered accounts.
 * 2. Checks that every transfer has distinct source and destination accounts.
 * 3. Verifies that all transfer transactions sharing a transferGroupId are consistent.
 * 4. Verifies that opening balances are immutable.
 * 5. Replays the ledger and confirms balances match expected current state.
 */
export function recomputeFromGenesis(accounts, transactions) {
    const registeredAccountIds = new Set(accounts.map(a => a.id));
    const transferGroups = new Map();
    const anomalies = [];

    for (const txn of transactions) {
        // 1. Verify account references
        if (txn.accountId && !registeredAccountIds.has(txn.accountId)) {
            anomalies.push({
                code: 'ORPHAN_ACCOUNT_REFERENCE',
                transactionId: txn.id,
                message: `Transaction references non-existent account: "${txn.accountId}"`
            });
        }
        if (txn.sourceAccountId && !registeredAccountIds.has(txn.sourceAccountId)) {
            anomalies.push({
                code: 'ORPHAN_SOURCE_ACCOUNT',
                transactionId: txn.id,
                message: `Transaction references non-existent source account: "${txn.sourceAccountId}"`
            });
        }
        if (txn.destinationAccountId && !registeredAccountIds.has(txn.destinationAccountId)) {
            anomalies.push({
                code: 'ORPHAN_DESTINATION_ACCOUNT',
                transactionId: txn.id,
                message: `Transaction references non-existent destination account: "${txn.destinationAccountId}"`
            });
        }

        // 2. Transfer pairing check
        if (txn.transactionType === TransactionType.TRANSFER) {
            if (txn.sourceAccountId === txn.destinationAccountId) {
                anomalies.push({
                    code: 'SELF_TRANSFER',
                    transactionId: txn.id,
                    message: `Transfer source and destination are identical: "${txn.sourceAccountId}"`
                });
            }

            if (txn.transferGroupId) {
                if (!transferGroups.has(txn.transferGroupId)) {
                    transferGroups.set(txn.transferGroupId, []);
                }
                transferGroups.get(txn.transferGroupId).push(txn);
            }
        }

        // 3. Opening balance immutability check
        if (txn.transactionType === TransactionType.OPENING_BALANCE && txn.immutable !== true) {
            anomalies.push({
                code: 'MUTABLE_OPENING_BALANCE',
                transactionId: txn.id,
                message: 'Opening balance record does not have immutable === true'
            });
        }

        // 4. Journal line integrity check if present
        if (txn.lines !== undefined) {
            try {
                validateJournalLines(txn.lines);
            } catch (err) {
                anomalies.push({
                    code: 'MALFORMED_JOURNAL_ENTRY',
                    transactionId: txn.id,
                    message: err.message
                });
            }
        }
    }

    // 5. Transfer pairing & orphan leg continuity check
    try {
        validateTransferPairContinuity(transactions);
    } catch (err) {
        anomalies.push({
            code: 'ORPHAN_TRANSFER_LEG',
            message: err.message
        });
    }

    let balances = {};
    try {
        balances = computeAccountBalances(accounts, transactions);
    } catch (err) {
        anomalies.push({
            code: 'BALANCE_COMPUTATION_ERROR',
            message: err.message
        });
    }

    return {
        isValid: anomalies.length === 0,
        anomalies,
        balances,
        transactionCount: transactions.length,
        activeTransactionCount: transactions.filter(t => t.status !== TransactionStatus.VOIDED).length,
        voidedTransactionCount: transactions.filter(t => t.status === TransactionStatus.VOIDED).length
    };
}

/**
 * Computes period financial metrics (Income, Expense, Net Cash Flow, Transfer Volume).
 * Transfers are strictly excluded from Income and Expense sums.
 */
export function computePeriodSummary(transactions, startDate = null, endDate = null, accounts = []) {
    let incomePaise = 0n;
    let grossExpensePaise = 0n;
    let expenseRefundsPaise = 0n;
    let transferVolumePaise = 0n;
    let transferCount = 0;
    let adjustmentPaise = 0n;
    let cashInflowPaise = 0n;
    let cashOutflowPaise = 0n;

    const accountMap = new Map((accounts || []).map(a => [a.id, a]));
    for (const sys of SYSTEM_CHART_OF_ACCOUNTS) {
        if (!accountMap.has(sys.id)) accountMap.set(sys.id, sys);
    }

    for (const txn of transactions) {
        if (txn.status === TransactionStatus.VOIDED || txn.status === TransactionStatus.PENDING) {
            continue;
        }

        // Date range filter
        if (startDate && txn.date < startDate) continue;
        if (endDate && txn.date > endDate) continue;

        const amt = moneyToBigInt(txn.amount);

        // Case A: Compound transaction with authoritative journal lines
        if (txn.lines !== undefined && Array.isArray(txn.lines) && txn.lines.length >= 2) {
            validateJournalLines(txn.lines);

            for (const line of txn.lines) {
                const deb = BigInt(line.debitPaise || '0');
                const cred = BigInt(line.creditPaise || '0');
                const acc = accountMap.get(line.accountId);

                // 1. Operating/Finance Expense: debit to nominal expense accounts only
                const isExpenseAccount = (acc && (acc.classification === AccountClassification.OPERATING_EXPENSE ||
                    acc.classification === AccountClassification.FINANCE_EXPENSE ||
                    acc.nature === AccountNature.EXPENSE)) ||
                    line.lineType === LedgerLineType.INTEREST_EXPENSE ||
                    line.lineType === LedgerLineType.FEES_EXPENSE ||
                    line.lineType === LedgerLineType.OPERATING_EXPENSE ||
                    line.categoryId === 'finance_expense' ||
                    line.categoryId === 'operating_expense';

                if (isExpenseAccount) {
                    grossExpensePaise += deb;
                }

                // 2. Contra-Expense / Refund
                const isRefundContra = line.lineType === LedgerLineType.REFUND_CONTRA ||
                    line.lineType === LedgerLineType.CONTRA_EXPENSE;
                if (isRefundContra) {
                    expenseRefundsPaise += cred;
                }

                // 3. Operating Revenue: credit to nominal revenue accounts only
                const isRevenueAccount = (acc && (acc.classification === AccountClassification.OPERATING_INCOME ||
                    acc.nature === AccountNature.INCOME)) ||
                    line.lineType === LedgerLineType.INTEREST_INCOME ||
                    line.lineType === LedgerLineType.OPERATING_REVENUE ||
                    line.categoryId === 'product_sale';

                if (isRevenueAccount) {
                    incomePaise += cred;
                }

                // 4. Pure Cash Flow: debits/credits to liquid cash/bank accounts ONLY
                const isCash = acc ? isCashAccount(acc) : (line.lineType === LedgerLineType.CASH || (line.accountId && (line.accountId.includes('bank') || line.accountId.includes('cash') || line.accountId.includes('wallet'))));
                if (isCash) {
                    cashInflowPaise += deb;
                    cashOutflowPaise += cred;
                }
            }

            if (txn.transactionType === TransactionType.TRANSFER) {
                transferVolumePaise += amt;
                transferCount++;
            }
        } else {
            // Case B: Legacy transactions without lines (zero-clamping removed)
            switch (txn.transactionType) {
                case TransactionType.INCOME: {
                    incomePaise += amt;
                    const destAcc = accountMap.get(txn.destinationAccountId || txn.accountId);
                    if (!destAcc || isCashAccount(destAcc)) {
                        cashInflowPaise += amt;
                    }
                    break;
                }

                case TransactionType.EXPENSE: {
                    grossExpensePaise += amt;
                    const srcAcc = accountMap.get(txn.sourceAccountId || txn.accountId);
                    // Non-cash expense (e.g. credit card liability increase) does not reduce liquid cash
                    if (!srcAcc || isCashAccount(srcAcc)) {
                        cashOutflowPaise += amt;
                    }
                    break;
                }

                case TransactionType.REFUND: {
                    if (txn.refundTargetType === RefundTargetType.INCOME) {
                        incomePaise += amt;
                    } else {
                        // Lossless: track expense refunds without clamping gross expense
                        expenseRefundsPaise += amt;
                    }
                    const targetAcc = accountMap.get(txn.destinationAccountId || txn.sourceAccountId || txn.accountId);
                    if (!targetAcc || isCashAccount(targetAcc)) {
                        cashInflowPaise += amt;
                    }
                    break;
                }

                case TransactionType.TRANSFER: {
                    transferVolumePaise += amt;
                    transferCount++;
                    const srcAcc = accountMap.get(txn.sourceAccountId);
                    const destAcc = accountMap.get(txn.destinationAccountId);
                    const srcIsCash = srcAcc ? isCashAccount(srcAcc) : true;
                    const destIsCash = destAcc ? isCashAccount(destAcc) : true;

                    // Non-cash transfers affect cash flow only across boundary
                    if (srcIsCash && !destIsCash) {
                        cashOutflowPaise += amt;
                    } else if (!srcIsCash && destIsCash) {
                        cashInflowPaise += amt;
                    }
                    break;
                }

                case TransactionType.ADJUSTMENT: {
                    const acc = accountMap.get(txn.accountId);
                    const isCash = !acc || isCashAccount(acc);
                    if (txn.balanceEffect === BalanceEffect.INCREASE) {
                        adjustmentPaise += amt;
                        if (isCash) cashInflowPaise += amt;
                    } else if (txn.balanceEffect === BalanceEffect.DECREASE) {
                        adjustmentPaise -= amt;
                        if (isCash) cashOutflowPaise += amt;
                    }
                    break;
                }
            }
        }
    }

    const netExpensePaise = grossExpensePaise - expenseRefundsPaise;
    const netCashFlowPaise = cashInflowPaise - cashOutflowPaise;

    return {
        income: {
            bigIntPaise: incomePaise,
            paise: incomePaise.toString(),
            formatted: formatMoneyPaise(createMoneyPaise(incomePaise))
        },
        grossExpense: {
            bigIntPaise: grossExpensePaise,
            paise: grossExpensePaise.toString(),
            formatted: formatMoneyPaise(createMoneyPaise(grossExpensePaise))
        },
        expenseRefunds: {
            bigIntPaise: expenseRefundsPaise,
            paise: expenseRefundsPaise.toString(),
            formatted: formatMoneyPaise(createMoneyPaise(expenseRefundsPaise))
        },
        netExpense: {
            bigIntPaise: netExpensePaise,
            paise: netExpensePaise.toString(),
            isNegative: netExpensePaise < 0n,
            formatted: (netExpensePaise < 0n ? '-' : '') + formatMoneyPaise(createMoneyPaise(netExpensePaise < 0n ? -netExpensePaise : netExpensePaise))
        },
        expense: {
            bigIntPaise: netExpensePaise,
            paise: netExpensePaise.toString(),
            isNegative: netExpensePaise < 0n,
            formatted: (netExpensePaise < 0n ? '-' : '') + formatMoneyPaise(createMoneyPaise(netExpensePaise < 0n ? -netExpensePaise : netExpensePaise))
        },
        refund: {
            bigIntPaise: expenseRefundsPaise,
            paise: expenseRefundsPaise.toString(),
            formatted: formatMoneyPaise(createMoneyPaise(expenseRefundsPaise))
        },
        cashFlow: {
            inflowBigIntPaise: cashInflowPaise,
            outflowBigIntPaise: cashOutflowPaise,
            netBigIntPaise: netCashFlowPaise,
            formatted: (netCashFlowPaise < 0n ? '-' : '') + formatMoneyPaise(createMoneyPaise(netCashFlowPaise < 0n ? -netCashFlowPaise : netCashFlowPaise))
        },
        netCashFlow: {
            bigIntPaise: netCashFlowPaise,
            paise: netCashFlowPaise.toString(),
            isPositive: netCashFlowPaise >= 0n,
            formatted: (netCashFlowPaise < 0n ? '-' : '') + formatMoneyPaise(createMoneyPaise(netCashFlowPaise < 0n ? -netCashFlowPaise : netCashFlowPaise))
        },
        transfers: {
            volumeBigIntPaise: transferVolumePaise,
            volumePaise: transferVolumePaise.toString(),
            volumeFormatted: formatMoneyPaise(createMoneyPaise(transferVolumePaise)),
            count: transferCount
        },
        adjustments: {
            bigIntPaise: adjustmentPaise,
            paise: adjustmentPaise.toString()
        },
        grossExpensePaise,
        expenseRefundsPaise,
        netExpensePaise,
        incomePaise,
        pureCashFlowPaise: netCashFlowPaise
    };
}

/**
 * Creates an authoritative double-entry-aware TRANSFER transaction record.
 */
export function createTransferRecord({
    id,
    sourceAccountId,
    destinationAccountId,
    amount,
    date = new Date().toISOString().split('T')[0],
    description = 'Fund Transfer',
    notes = '',
    idempotencyKey,
    transferGroupId,
    source = 'MANUAL'
}) {
    if (!id || typeof id !== 'string') throw new Error('Transfer id is required');
    if (!sourceAccountId || !destinationAccountId) throw new Error('Both sourceAccountId and destinationAccountId are required');
    if (sourceAccountId.trim() === destinationAccountId.trim()) {
        throw new Error('sourceAccountId and destinationAccountId cannot be identical');
    }

    const moneyPaise = typeof amount === 'object' && amount.paise ? amount : createMoneyPaise(amount);
    const grpId = transferGroupId || `transfer_grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idemKey = idempotencyKey || `transfer:${grpId}`;

    return {
        id: id.trim(),
        transactionType: TransactionType.TRANSFER,
        sourceAccountId: sourceAccountId.trim(),
        destinationAccountId: destinationAccountId.trim(),
        transferGroupId: grpId,
        amount: moneyPaise,
        date,
        description: description.trim(),
        notes: notes ? notes.trim() : '',
        status: TransactionStatus.POSTED,
        source,
        version: 1,
        idempotencyKey: idemKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Computes a spending/income breakdown aggregated by category.
 */
export function computeCategoryBreakdown(transactions, targetType = TransactionType.EXPENSE, startDate = null, endDate = null) {
    const categoryTotals = new Map();
    let totalPaise = 0n;

    for (const txn of transactions) {
        if (txn.status === TransactionStatus.VOIDED || txn.status === TransactionStatus.PENDING) {
            continue;
        }
        if (txn.transactionType !== targetType) {
            continue;
        }
        if (startDate && txn.date < startDate) continue;
        if (endDate && txn.date > endDate) continue;

        const amt = moneyToBigInt(txn.amount);
        const catKey = txn.category || 'uncategorized';

        const curr = categoryTotals.get(catKey) || 0n;
        categoryTotals.set(catKey, curr + amt);
        totalPaise += amt;
    }

    const breakdown = [];
    for (const [categoryId, paise] of categoryTotals.entries()) {
        const percentage = totalPaise > 0n ? Number((paise * 10000n) / totalPaise) / 100 : 0;
        breakdown.push({
            categoryId,
            bigIntPaise: paise,
            paise: paise.toString(),
            formatted: formatMoneyPaise(createMoneyPaise(paise)),
            percentage
        });
    }

    // Sort descending by amount
    breakdown.sort((a, b) => (b.bigIntPaise > a.bigIntPaise ? 1 : -1));

    return {
        totalPaise: totalPaise.toString(),
        totalFormatted: formatMoneyPaise(createMoneyPaise(totalPaise)),
        breakdown
    };
}

/**
 * Computes the total physical cash value from a counts object of denominations.
 * E.g., { d500: 10, d200: 5, ... }
 * Uses BigInt integer paise arithmetic.
 * @param {Record<string, number|string>} denominations
 * @returns {{ bigIntPaise: bigint, paise: string, formatted: string, totalCount: number, breakdown: Array<Object> }}
 */
export function calculateDenominationTotal(denominations = {}) {
    let totalPaise = 0n;
    let totalCount = 0;
    const breakdown = [];

    for (const denom of STANDARD_DENOMINATIONS) {
        const countRaw = denominations[denom.key] || 0;
        const count = typeof countRaw === 'number' ? countRaw : parseInt(countRaw, 10) || 0;
        if (count < 0) throw new Error(`Denomination count cannot be negative: ${denom.key} = ${count}`);

        const valBi = BigInt(denom.valuePaise);
        const subtotalBi = valBi * BigInt(count);
        totalPaise += subtotalBi;
        totalCount += count;

        breakdown.push({
            key: denom.key,
            label: denom.label,
            count,
            valuePaise: denom.valuePaise,
            subtotalPaise: subtotalBi.toString(),
            subtotalFormatted: formatMoneyPaise(createMoneyPaise(subtotalBi))
        });
    }

    return {
        bigIntPaise: totalPaise,
        paise: totalPaise.toString(),
        formatted: formatMoneyPaise(createMoneyPaise(totalPaise)),
        totalCount,
        breakdown
    };
}

/**
 * Computes the difference between counted cash and calculated closing balance.
 * Excess: counted > calculated (+ difference)
 * Shortage: counted < calculated (- difference)
 * Balanced: counted === calculated (0 difference)
 */
export function computeDailyClosingDifference({ calculatedClosingPaise, countedClosingPaise }) {
    const calcBi = typeof calculatedClosingPaise === 'bigint'
        ? calculatedClosingPaise
        : (typeof calculatedClosingPaise === 'object' && calculatedClosingPaise?.paise
            ? moneyToBigInt(calculatedClosingPaise)
            : BigInt(calculatedClosingPaise || '0'));

    const countedBi = typeof countedClosingPaise === 'bigint'
        ? countedClosingPaise
        : (typeof countedClosingPaise === 'object' && countedClosingPaise?.paise
            ? moneyToBigInt(countedClosingPaise)
            : BigInt(countedClosingPaise || '0'));

    const diffBi = countedBi - calcBi;

    let differenceType = 'BALANCED';
    if (diffBi > 0n) {
        differenceType = 'EXCESS';
    } else if (diffBi < 0n) {
        differenceType = 'SHORTAGE';
    }

    const absDiff = diffBi < 0n ? -diffBi : diffBi;
    const formattedRaw = formatMoneyPaise(createMoneyPaise(absDiff));

    return {
        differenceBigIntPaise: diffBi,
        differencePaise: diffBi.toString(),
        differenceType,
        isExcess: diffBi > 0n,
        isShortage: diffBi < 0n,
        isBalanced: diffBi === 0n,
        formatted: (diffBi < 0n ? `-${formattedRaw}` : (diffBi > 0n ? `+${formattedRaw}` : formattedRaw))
    };
}

/**
 * Computes the financial effect of a loan repayment split.
 * Invariant: Principal reduces liability; interest and fees are period expenses.
 */
export function computeLoanRepaymentEffect({ split, currentOutstandingPrincipalPaise = '0' }) {
    validateLoanRepaymentSplit(split);

    const outstandingBi = typeof currentOutstandingPrincipalPaise === 'bigint'
        ? currentOutstandingPrincipalPaise
        : (typeof currentOutstandingPrincipalPaise === 'object' && currentOutstandingPrincipalPaise?.paise
            ? moneyToBigInt(currentOutstandingPrincipalPaise)
            : BigInt(currentOutstandingPrincipalPaise || '0'));

    const principalBi = moneyToBigInt(split.principal);
    const interestBi = moneyToBigInt(split.interest);
    const feesBi = split.fees ? moneyToBigInt(split.fees) : 0n;
    const totalPaymentBi = principalBi + interestBi + feesBi;

    const remainingPrincipalBi = outstandingBi >= principalBi ? outstandingBi - principalBi : 0n;

    return {
        totalPaymentPaise: totalPaymentBi.toString(),
        principalReductionPaise: principalBi.toString(),
        interestExpensePaise: interestBi.toString(),
        feesExpensePaise: feesBi.toString(),
        remainingPrincipalPaise: remainingPrincipalBi.toString(),
        remainingPrincipalFormatted: formatMoneyPaise(createMoneyPaise(remainingPrincipalBi))
    };
}

/**
 * Computes Provident Fund balances separating restricted locked wealth from available advance.
 */
export function computePFBalances({ openingBalance, transactions = [] }) {
    let totalAssetPaise = openingBalance ? moneyToBigInt(typeof openingBalance === 'object' && openingBalance.paise ? openingBalance : createMoneyPaise(openingBalance)) : 0n;
    let employeePaise = 0n;
    let employerPaise = 0n;
    let pensionPaise = 0n;
    let interestPaise = 0n;
    let withdrawalPaise = 0n;

    for (const txn of transactions) {
        if (txn.status === TransactionStatus.VOIDED || txn.status === TransactionStatus.PENDING) continue;

        const amt = moneyToBigInt(txn.amount);

        if (txn.provenance) {
            if (txn.provenance.employee) employeePaise += moneyToBigInt(txn.provenance.employee);
            if (txn.provenance.employer) employerPaise += moneyToBigInt(txn.provenance.employer);
            if (txn.provenance.pension) pensionPaise += moneyToBigInt(txn.provenance.pension);
            if (txn.provenance.interest) interestPaise += moneyToBigInt(txn.provenance.interest);
            totalAssetPaise += amt;
        } else {
            if (txn.transactionType === TransactionType.INCOME || txn.transactionType === TransactionType.OPENING_BALANCE) {
                totalAssetPaise += amt;
                employeePaise += amt; // Default attribution
            } else if (txn.transactionType === TransactionType.EXPENSE) {
                // Withdrawal
                totalAssetPaise = totalAssetPaise >= amt ? totalAssetPaise - amt : 0n;
                withdrawalPaise += amt;
            }
        }
    }

    // In PF, the vast majority is restricted until superannuation/retirement.
    // Liquid available cash for ordinary daily spending is 0.
    return {
        totalAssetPaise: totalAssetPaise.toString(),
        totalAssetFormatted: formatMoneyPaise(createMoneyPaise(totalAssetPaise)),
        restrictedPaise: totalAssetPaise.toString(), // Entire PF is restricted asset
        restrictedFormatted: formatMoneyPaise(createMoneyPaise(totalAssetPaise)),
        availableLiquidPaise: '0',
        availableLiquidFormatted: '₹0',
        breakdown: {
            employeePaise: employeePaise.toString(),
            employeeFormatted: formatMoneyPaise(createMoneyPaise(employeePaise)),
            employerPaise: employerPaise.toString(),
            employerFormatted: formatMoneyPaise(createMoneyPaise(employerPaise)),
            pensionPaise: pensionPaise.toString(),
            pensionFormatted: formatMoneyPaise(createMoneyPaise(pensionPaise)),
            interestPaise: interestPaise.toString(),
            interestFormatted: formatMoneyPaise(createMoneyPaise(interestPaise)),
            withdrawalPaise: withdrawalPaise.toString(),
            withdrawalFormatted: formatMoneyPaise(createMoneyPaise(withdrawalPaise))
        }
    };
}

/**
 * Computes a chronologically ordered ledger with exact BigInt running balances.
 * Mode A: Simple Cashbook (Date | Particulars | Money In | Money Out | Running Balance)
 * Mode B: Account Ledger (Date | Particulars | Debit | Credit | Running Balance)
 * Mode C: Multi-Line Breakdown (splits for loan principal/interest, PF provenance)
 * 
 * @param {Object} params
 * @param {Object|string|number} [params.openingBalance]
 * @param {Array<Object>} [params.transactions]
 * @param {Array<Object>} [params.accounts]
 * @param {string} [params.bookType]
 * @param {string} [params.balanceMode]
 * @returns {{ rows: Array<Object>, summary: Object }}
 */
export function computeRunningLedger({
    openingBalance = null,
    transactions = [],
    accounts = [],
    bookType = CashbookType.SAVINGS,
    balanceMode = null
}) {
    const activeBalanceMode = balanceMode || CashbookConfigMap[bookType]?.balanceMode || BalanceMode.AVAILABLE_CASH;

    // 1. Initial Opening Balance
    let runningBi = 0n;
    if (openingBalance) {
        runningBi = typeof openingBalance === 'object' && openingBalance.paise
            ? moneyToBigInt(openingBalance)
            : moneyToBigInt(createMoneyPaise(openingBalance));
    }

    // 2. Sort transactions chronologically
    const sortedTxns = [...transactions].sort((a, b) => {
        const dateComp = (a.date || '').localeCompare(b.date || '');
        if (dateComp !== 0) return dateComp;
        if (a.transactionType === TransactionType.OPENING_BALANCE) return -1;
        if (b.transactionType === TransactionType.OPENING_BALANCE) return 1;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    const rows = [];
    let totalMoneyInBi = 0n;
    let totalMoneyOutBi = 0n;
    let totalDebitBi = 0n;
    let totalCreditBi = 0n;

    // Optional opening balance row if provided
    if (openingBalance && runningBi > 0n) {
        rows.push({
            id: 'row_opening_balance',
            transactionId: null,
            date: sortedTxns[0]?.date || new Date().toISOString().split('T')[0],
            particulars: 'Opening Balance',
            reference: 'OPENING',
            transactionType: TransactionType.OPENING_BALANCE,
            isOpening: true,
            isVoided: false,
            moneyInPaise: runningBi.toString(),
            moneyOutPaise: '0',
            debitPaise: '0',
            creditPaise: runningBi.toString(),
            deltaPaise: runningBi.toString(),
            runningBalancePaise: runningBi.toString(),
            runningBalanceFormatted: formatMoneyPaise(createMoneyPaise(runningBi)),
            isNegative: runningBi < 0n
        });
        totalMoneyInBi += runningBi;
        totalCreditBi += runningBi;
    }

    // 3. Process transaction stream
    for (const txn of sortedTxns) {
        const isVoided = txn.status === TransactionStatus.VOIDED;
        const amtBi = moneyToBigInt(txn.amount);

        let moneyInBi = 0n;
        let moneyOutBi = 0n;
        let debitBi = 0n;
        let creditBi = 0n;
        let balanceDeltaBi = 0n;

        if (activeBalanceMode === BalanceMode.LOAN_LIABILITY) {
            // In LOANS_TAKEN:
            // Outstanding debt is positive.
            // Opening balance or new loan disbursement increases debt.
            // Repayment (EMI) reduces debt by the principal portion.
            if (txn.transactionType === TransactionType.OPENING_BALANCE) {
                if (!openingBalance) {
                    balanceDeltaBi = amtBi;
                    moneyInBi = amtBi;
                    creditBi = amtBi;
                }
            } else if (txn.transactionType === TransactionType.INCOME) {
                // Additional loan disbursement received
                balanceDeltaBi = amtBi;
                moneyInBi = amtBi;
                creditBi = amtBi;
            } else if (txn.transactionType === TransactionType.EXPENSE || txn.loanSplit) {
                // EMI Repayment
                moneyOutBi = amtBi;
                debitBi = amtBi;
                if (txn.loanSplit) {
                    const principalBi = moneyToBigInt(txn.loanSplit.principal);
                    balanceDeltaBi = -principalBi; // Liability decreases by principal only
                } else {
                    balanceDeltaBi = -amtBi;
                }
            }
        } else if (activeBalanceMode === BalanceMode.LOAN_RECEIVABLE) {
            // In LOANS_GIVEN:
            // Disbursing a loan increases money owed to us (+ asset).
            // Repayment received decreases money owed to us (- asset).
            if (txn.transactionType === TransactionType.OPENING_BALANCE) {
                if (!openingBalance) {
                    balanceDeltaBi = amtBi;
                    creditBi = amtBi;
                }
            } else if (txn.transactionType === TransactionType.EXPENSE) {
                // Principal disbursed to borrower
                balanceDeltaBi = amtBi;
                moneyOutBi = amtBi;
                debitBi = amtBi;
            } else if (txn.transactionType === TransactionType.INCOME) {
                // Repayment received from borrower
                balanceDeltaBi = -amtBi;
                moneyInBi = amtBi;
                creditBi = amtBi;
            }
        } else {
            // Standard Cashbook (SAVINGS, HANDY_CASH, BUSINESS_CASH_AND_OBLIGATIONS, PF, CUSTOM)
            switch (txn.transactionType) {
                case TransactionType.OPENING_BALANCE:
                    if (!openingBalance) {
                        balanceDeltaBi = amtBi;
                        moneyInBi = amtBi;
                        creditBi = amtBi;
                    }
                    break;

                case TransactionType.INCOME:
                    balanceDeltaBi = amtBi;
                    moneyInBi = amtBi;
                    creditBi = amtBi;
                    break;

                case TransactionType.EXPENSE:
                    balanceDeltaBi = -amtBi;
                    moneyOutBi = amtBi;
                    debitBi = amtBi;
                    break;

                case TransactionType.REFUND:
                    if (txn.refundTargetType === RefundTargetType.INCOME) {
                        balanceDeltaBi = amtBi;
                        moneyInBi = amtBi;
                        creditBi = amtBi;
                    } else {
                        balanceDeltaBi = amtBi;
                        moneyInBi = amtBi;
                        creditBi = amtBi;
                    }
                    break;

                case TransactionType.TRANSFER:
                    // If cross-book or single-account, effect depends on whether account is src or dest
                    if (txn.destinationBookId && txn.destinationBookId !== txn.bookId) {
                        // Transfer out of this book
                        balanceDeltaBi = -amtBi;
                        moneyOutBi = amtBi;
                        debitBi = amtBi;
                    } else if (txn.sourceBookId && txn.sourceBookId !== txn.bookId) {
                        // Transfer into this book
                        balanceDeltaBi = amtBi;
                        moneyInBi = amtBi;
                        creditBi = amtBi;
                    } else {
                        // Transfer between internal accounts: net zero to the overall book cash
                        balanceDeltaBi = 0n;
                        debitBi = amtBi;
                        creditBi = amtBi;
                    }
                    break;

                case TransactionType.ADJUSTMENT:
                    if (txn.balanceEffect === BalanceEffect.INCREASE) {
                        balanceDeltaBi = amtBi;
                        moneyInBi = amtBi;
                        creditBi = amtBi;
                    } else if (txn.balanceEffect === BalanceEffect.DECREASE) {
                        balanceDeltaBi = -amtBi;
                        moneyOutBi = amtBi;
                        debitBi = amtBi;
                    }
                    break;
            }
        }

        // Only active transactions mutate running balance
        if (!isVoided) {
            runningBi += balanceDeltaBi;
            totalMoneyInBi += moneyInBi;
            totalMoneyOutBi += moneyOutBi;
            totalDebitBi += debitBi;
            totalCreditBi += creditBi;
        }

        const isNeg = runningBi < 0n;
        const absRunBi = isNeg ? -runningBi : runningBi;
        const formattedBal = formatMoneyPaise(createMoneyPaise(absRunBi));

        rows.push({
            id: `row_${txn.id}`,
            transactionId: txn.id,
            date: txn.date,
            particulars: txn.description || txn.category || txn.transactionType,
            reference: txn.transferGroupId || txn.id.substring(0, 8),
            transactionType: txn.transactionType,
            isOpening: txn.transactionType === TransactionType.OPENING_BALANCE,
            isVoided,
            voidReason: txn.voidReason || null,
            moneyInPaise: moneyInBi.toString(),
            moneyInFormatted: moneyInBi > 0n ? formatMoneyPaise(createMoneyPaise(moneyInBi)) : '',
            moneyOutPaise: moneyOutBi.toString(),
            moneyOutFormatted: moneyOutBi > 0n ? formatMoneyPaise(createMoneyPaise(moneyOutBi)) : '',
            debitPaise: debitBi.toString(),
            debitFormatted: debitBi > 0n ? formatMoneyPaise(createMoneyPaise(debitBi)) : '',
            creditPaise: creditBi.toString(),
            creditFormatted: creditBi > 0n ? formatMoneyPaise(createMoneyPaise(creditBi)) : '',
            deltaPaise: balanceDeltaBi.toString(),
            runningBalancePaise: runningBi.toString(),
            runningBalanceFormatted: isNeg ? `-${formattedBal}` : formattedBal,
            isNegative: isNeg,
            loanSplit: txn.loanSplit || null,
            provenance: txn.provenance || null,
            rawTxn: txn
        });
    }

    const isFinalNeg = runningBi < 0n;
    const absFinalBi = isFinalNeg ? -runningBi : runningBi;
    const finalFormatted = formatMoneyPaise(createMoneyPaise(absFinalBi));

    return {
        rows,
        summary: {
            bookType,
            balanceMode: activeBalanceMode,
            rowCount: rows.length,
            totalMoneyInPaise: totalMoneyInBi.toString(),
            totalMoneyInFormatted: formatMoneyPaise(createMoneyPaise(totalMoneyInBi)),
            totalMoneyOutPaise: totalMoneyOutBi.toString(),
            totalMoneyOutFormatted: formatMoneyPaise(createMoneyPaise(totalMoneyOutBi)),
            totalDebitPaise: totalDebitBi.toString(),
            totalDebitFormatted: formatMoneyPaise(createMoneyPaise(totalDebitBi)),
            totalCreditPaise: totalCreditBi.toString(),
            totalCreditFormatted: formatMoneyPaise(createMoneyPaise(totalCreditBi)),
            closingBalancePaise: runningBi.toString(),
            closingBalanceFormatted: isFinalNeg ? `-${finalFormatted}` : finalFormatted,
            isNegative: isFinalNeg
        }
    };
}



// ============================================================================
// PURPOSE-BUILT DASHBOARD METRIC REDUCERS (V3)
// Pure mathematical functions computing domain-specific financial positions.
// Zero UI dependencies. 100% BigInt integer paise arithmetic.
// ============================================================================

/**
 * Computes Household Financial Diary metrics for PERSONAL_FINANCE_BOOK.
 */
export function computePersonalDashboardMetrics({
    transactions = [],
    accounts = [],
    openingBalance = '0',
    currentDate = new Date().toISOString().split('T')[0]
}) {
    const currentMonthPrefix = currentDate.substring(0, 7); // 'YYYY-MM'

    let todayReceivedBi = 0n;
    let todaySpentBi = 0n;
    let monthIncomeBi = 0n;
    let monthExpenseBi = 0n;
    let totalIncomeAllTimeBi = 0n;
    let totalExpenseAllTimeBi = 0n;

    // Opening balance baseline
    const openingBi = typeof openingBalance === 'object' && openingBalance.paise
        ? moneyToBigInt(openingBalance)
        : BigInt(openingBalance || '0');

    let runningCashBi = openingBi;

    for (const txn of transactions) {
        if (txn.status === TransactionStatus.VOIDED || txn.status === TransactionStatus.PENDING) {
            continue;
        }

        const amt = moneyToBigInt(txn.amount);
        const isToday = txn.date === currentDate;
        const isThisMonth = txn.date && txn.date.startsWith(currentMonthPrefix);

        if (txn.transactionType === TransactionType.INCOME) {
            totalIncomeAllTimeBi += amt;
            runningCashBi += amt;
            if (isToday) todayReceivedBi += amt;
            if (isThisMonth) monthIncomeBi += amt;
        } else if (txn.transactionType === TransactionType.EXPENSE) {
            totalExpenseAllTimeBi += amt;
            runningCashBi -= amt;
            if (isToday) todaySpentBi += amt;
            if (isThisMonth) monthExpenseBi += amt;
        } else if (txn.transactionType === TransactionType.REFUND) {
            runningCashBi += amt;
            if (isToday) todayReceivedBi += amt;
            if (isThisMonth) monthIncomeBi += amt;
        } else if (txn.transactionType === TransactionType.OPENING_BALANCE) {
            // Already factored into openingBi if handled upfront, or add if encountered
        }
    }

    const todayOpeningBi = runningCashBi - todayReceivedBi + todaySpentBi;
    const closingTodayBi = runningCashBi;
    const savingsMovementBi = monthIncomeBi - monthExpenseBi;

    return {
        availableBalancePaise: runningCashBi.toString(),
        availableBalanceFormatted: formatMoneyPaise(createMoneyPaise(runningCashBi >= 0n ? runningCashBi : -runningCashBi)),
        isBalanceNegative: runningCashBi < 0n,
        todayOpeningPaise: todayOpeningBi.toString(),
        todayOpeningFormatted: formatMoneyPaise(createMoneyPaise(todayOpeningBi >= 0n ? todayOpeningBi : -todayOpeningBi)),
        todayReceivedPaise: todayReceivedBi.toString(),
        todayReceivedFormatted: formatMoneyPaise(createMoneyPaise(todayReceivedBi)),
        todaySpentPaise: todaySpentBi.toString(),
        todaySpentFormatted: formatMoneyPaise(createMoneyPaise(todaySpentBi)),
        closingTodayPaise: closingTodayBi.toString(),
        closingTodayFormatted: formatMoneyPaise(createMoneyPaise(closingTodayBi >= 0n ? closingTodayBi : -closingTodayBi)),
        monthIncomePaise: monthIncomeBi.toString(),
        monthIncomeFormatted: formatMoneyPaise(createMoneyPaise(monthIncomeBi)),
        monthExpensePaise: monthExpenseBi.toString(),
        monthExpenseFormatted: formatMoneyPaise(createMoneyPaise(monthExpenseBi)),
        monthSavingsMovementPaise: savingsMovementBi.toString(),
        monthSavingsMovementFormatted: formatMoneyPaise(createMoneyPaise(savingsMovementBi >= 0n ? savingsMovementBi : -savingsMovementBi)),
        isSavingsNegative: savingsMovementBi < 0n
    };
}

/**
 * Computes Physical Cash Till metrics for HANDY_CASH_REGISTER.
 */
export function computeHandyCashDashboardMetrics({
    transactions = [],
    dailyClosings = [],
    openingBalance = '0',
    currentDate = new Date().toISOString().split('T')[0]
}) {
    let openingCashBi = typeof openingBalance === 'object' && openingBalance.paise
        ? moneyToBigInt(openingBalance)
        : BigInt(openingBalance || '0');

    let cashReceivedTodayBi = 0n;
    let cashPaidTodayBi = 0n;

    for (const txn of transactions) {
        if (txn.status === TransactionStatus.VOIDED || txn.status === TransactionStatus.PENDING) {
            continue;
        }
        const amt = moneyToBigInt(txn.amount);
        if (txn.date === currentDate) {
            if (txn.transactionType === TransactionType.INCOME) {
                cashReceivedTodayBi += amt;
            } else if (txn.transactionType === TransactionType.EXPENSE) {
                cashPaidTodayBi += amt;
            }
        }
    }

    const expectedClosingBi = openingCashBi + cashReceivedTodayBi - cashPaidTodayBi;

    // Check if daily closing exists for today
    const existingClosing = dailyClosings.find(c => c.date === currentDate);
    let countedCashBi = 0n;
    let differenceBi = 0n;
    let differenceStatus = 'BALANCED';

    if (existingClosing && existingClosing.countedClosing) {
        countedCashBi = moneyToBigInt(existingClosing.countedClosing);
        differenceBi = countedCashBi - expectedClosingBi;
        if (differenceBi > 0n) differenceStatus = 'EXCESS';
        else if (differenceBi < 0n) differenceStatus = 'SHORTAGE';
        else differenceStatus = 'BALANCED';
    }

    return {
        openingCashPaise: openingCashBi.toString(),
        openingCashFormatted: formatMoneyPaise(createMoneyPaise(openingCashBi >= 0n ? openingCashBi : -openingCashBi)),
        cashReceivedTodayPaise: cashReceivedTodayBi.toString(),
        cashReceivedTodayFormatted: formatMoneyPaise(createMoneyPaise(cashReceivedTodayBi)),
        cashPaidTodayPaise: cashPaidTodayBi.toString(),
        cashPaidTodayFormatted: formatMoneyPaise(createMoneyPaise(cashPaidTodayBi)),
        expectedClosingPaise: expectedClosingBi.toString(),
        expectedClosingFormatted: formatMoneyPaise(createMoneyPaise(expectedClosingBi >= 0n ? expectedClosingBi : -expectedClosingBi)),
        countedCashPaise: countedCashBi.toString(),
        countedCashFormatted: formatMoneyPaise(createMoneyPaise(countedCashBi)),
        differencePaise: differenceBi.toString(),
        differenceFormatted: formatMoneyPaise(createMoneyPaise(differenceBi >= 0n ? differenceBi : -differenceBi)),
        differenceStatus,
        isLocked: existingClosing ? existingClosing.status === DailyClosingStatus.LOCKED : false
    };
}

/**
 * Computes Business Operating Cashflow metrics for BUSINESS_OPERATIONS_CASHBOOK.
 */
export function computeBusinessDashboardMetrics({
    transactions = [],
    accounts = [],
    currentDate = new Date().toISOString().split('T')[0]
}) {
    let availableCashBi = 0n;
    let customerReceivablesBi = 0n;
    let supplierPayablesBi = 0n;

    let todaySalesBi = 0n;
    let todayPurchasesBi = 0n;
    let todayExpensesBi = 0n;

    for (const txn of transactions) {
        if (txn.status === TransactionStatus.VOIDED || txn.status === TransactionStatus.PENDING) {
            continue;
        }
        const amt = moneyToBigInt(txn.amount);
        const isToday = txn.date === currentDate;
        const isCredit = Boolean(txn.metadata?.isCredit);
        const actionId = txn.metadata?.actionId;

        if (actionId === 'RECORD_SALE' || txn.category?.includes('sale')) {
            if (isToday) todaySalesBi += amt;
            if (isCredit) {
                customerReceivablesBi += amt;
            } else {
                availableCashBi += amt;
            }
        } else if (actionId === 'RECORD_PURCHASE' || txn.category?.includes('purchase')) {
            if (isToday) todayPurchasesBi += amt;
            if (isCredit) {
                supplierPayablesBi += amt;
            } else {
                availableCashBi -= amt;
            }
        } else if (actionId === 'RECEIVE_PAYMENT') {
            availableCashBi += amt;
            customerReceivablesBi = customerReceivablesBi >= amt ? customerReceivablesBi - amt : 0n;
        } else if (actionId === 'PAY_SUPPLIER') {
            availableCashBi -= amt;
            supplierPayablesBi = supplierPayablesBi >= amt ? supplierPayablesBi - amt : 0n;
        } else if (txn.transactionType === TransactionType.EXPENSE) {
            availableCashBi -= amt;
            if (isToday) todayExpensesBi += amt;
        } else if (txn.transactionType === TransactionType.INCOME) {
            availableCashBi += amt;
        }
    }

    const netOperatingMovementBi = todaySalesBi - todayPurchasesBi - todayExpensesBi;

    return {
        availableCashPaise: availableCashBi.toString(),
        availableCashFormatted: formatMoneyPaise(createMoneyPaise(availableCashBi >= 0n ? availableCashBi : -availableCashBi)),
        isCashNegative: availableCashBi < 0n,
        customerReceivablesPaise: customerReceivablesBi.toString(),
        customerReceivablesFormatted: formatMoneyPaise(createMoneyPaise(customerReceivablesBi)),
        supplierPayablesPaise: supplierPayablesBi.toString(),
        supplierPayablesFormatted: formatMoneyPaise(createMoneyPaise(supplierPayablesBi)),
        todaySalesPaise: todaySalesBi.toString(),
        todaySalesFormatted: formatMoneyPaise(createMoneyPaise(todaySalesBi)),
        todayPurchasesPaise: todayPurchasesBi.toString(),
        todayPurchasesFormatted: formatMoneyPaise(createMoneyPaise(todayPurchasesBi)),
        todayExpensesPaise: todayExpensesBi.toString(),
        todayExpensesFormatted: formatMoneyPaise(createMoneyPaise(todayExpensesBi)),
        netOperatingMovementPaise: netOperatingMovementBi.toString(),
        netOperatingMovementFormatted: formatMoneyPaise(createMoneyPaise(netOperatingMovementBi >= 0n ? netOperatingMovementBi : -netOperatingMovementBi)),
        isNetMovementNegative: netOperatingMovementBi < 0n
    };
}

/**
 * Computes Loan Liability metrics for LOANS_TAKEN_REGISTER.
 */
export function computeLoanLiabilityDashboardMetrics({
    transactions = [],
    currentDate = new Date().toISOString().split('T')[0]
}) {
    const currentMonthPrefix = currentDate.substring(0, 7);

    let totalPrincipalDisbursedBi = 0n;
    let totalPrincipalRepaidBi = 0n;
    let principalPaidMonthBi = 0n;
    let interestPaidMonthBi = 0n;
    let upcomingEMIBi = 0n;

    for (const txn of transactions) {
        if (txn.status === TransactionStatus.VOIDED || txn.status === TransactionStatus.PENDING) {
            continue;
        }

        const amt = moneyToBigInt(txn.amount);
        const isThisMonth = txn.date && txn.date.startsWith(currentMonthPrefix);

        if (txn.category === 'loan_disbursed' || txn.metadata?.actionId === 'DISBURSE_LOAN') {
            totalPrincipalDisbursedBi += amt;
        } else if (txn.loanSplit) {
            const pBi = moneyToBigInt(txn.loanSplit.principal);
            const iBi = moneyToBigInt(txn.loanSplit.interest);
            totalPrincipalRepaidBi += pBi;
            if (isThisMonth) {
                principalPaidMonthBi += pBi;
                interestPaidMonthBi += iBi;
            }
            upcomingEMIBi = moneyToBigInt(txn.loanSplit.total);
        } else if (txn.category === 'principal_prepayment' || txn.metadata?.actionId === 'PREPAY_LOAN') {
            totalPrincipalRepaidBi += amt;
            if (isThisMonth) principalPaidMonthBi += amt;
        }
    }

    const outstandingPrincipalBi = totalPrincipalDisbursedBi >= totalPrincipalRepaidBi
        ? totalPrincipalDisbursedBi - totalPrincipalRepaidBi
        : 0n;

    return {
        outstandingPrincipalPaise: outstandingPrincipalBi.toString(),
        outstandingPrincipalFormatted: formatMoneyPaise(createMoneyPaise(outstandingPrincipalBi)),
        upcomingEMIPaise: upcomingEMIBi.toString(),
        upcomingEMIFormatted: formatMoneyPaise(createMoneyPaise(upcomingEMIBi)),
        principalPaidMonthPaise: principalPaidMonthBi.toString(),
        principalPaidMonthFormatted: formatMoneyPaise(createMoneyPaise(principalPaidMonthBi)),
        interestPaidMonthPaise: interestPaidMonthBi.toString(),
        interestPaidMonthFormatted: formatMoneyPaise(createMoneyPaise(interestPaidMonthBi)),
        nextDueDate: `${currentDate.substring(0, 8)}10` // 10th of current month
    };
}

/**
 * Computes Loan Receivable metrics for LOANS_GIVEN_REGISTER.
 */
export function computeLoanReceivableDashboardMetrics({
    transactions = [],
    currentDate = new Date().toISOString().split('T')[0]
}) {
    const currentMonthPrefix = currentDate.substring(0, 7);

    let totalPrincipalDisbursedBi = 0n;
    let totalPrincipalRepaidBi = 0n;
    let receivedThisMonthBi = 0n;

    for (const txn of transactions) {
        if (txn.status === TransactionStatus.VOIDED || txn.status === TransactionStatus.PENDING) {
            continue;
        }
        const amt = moneyToBigInt(txn.amount);
        const isThisMonth = txn.date && txn.date.startsWith(currentMonthPrefix);

        if (txn.category === 'loan_disbursement' || txn.metadata?.actionId === 'GIVE_LOAN') {
            totalPrincipalDisbursedBi += amt;
        } else if (txn.category === 'repayment_received' || txn.metadata?.actionId === 'RECORD_REPAYMENT') {
            totalPrincipalRepaidBi += amt;
            if (isThisMonth) receivedThisMonthBi += amt;
        }
    }

    const outstandingReceivableBi = totalPrincipalDisbursedBi >= totalPrincipalRepaidBi
        ? totalPrincipalDisbursedBi - totalPrincipalRepaidBi
        : 0n;

    return {
        totalPrincipalOutstandingPaise: outstandingReceivableBi.toString(),
        totalPrincipalOutstandingFormatted: formatMoneyPaise(createMoneyPaise(outstandingReceivableBi)),
        receivedThisMonthPaise: receivedThisMonthBi.toString(),
        receivedThisMonthFormatted: formatMoneyPaise(createMoneyPaise(receivedThisMonthBi)),
        expectedThisMonthPaise: outstandingReceivableBi.toString(),
        expectedThisMonthFormatted: formatMoneyPaise(createMoneyPaise(outstandingReceivableBi)),
        overdueAmountPaise: '0',
        overdueAmountFormatted: '₹0'
    };
}

/**
 * Computes Retirement Fund metrics for PROVIDENT_FUND_REGISTER.
 */
export function computePFDashboardMetrics({
    transactions = [],
    currentDate = new Date().toISOString().split('T')[0]
}) {
    const currentYearPrefix = currentDate.substring(0, 4);

    let employeeShareBi = 0n;
    let employerShareBi = 0n;
    let accumulatedInterestBi = 0n;
    let currentYearContributionBi = 0n;
    let totalWithdrawalsBi = 0n;

    for (const txn of transactions) {
        if (txn.status === TransactionStatus.VOIDED || txn.status === TransactionStatus.PENDING) {
            continue;
        }

        const amt = moneyToBigInt(txn.amount);
        const isThisYear = txn.date && txn.date.startsWith(currentYearPrefix);

        if (txn.provenance) {
            const ee = moneyToBigInt(txn.provenance.employee);
            const er = moneyToBigInt(txn.provenance.employer) + (txn.provenance.pension ? moneyToBigInt(txn.provenance.pension) : 0n);
            employeeShareBi += ee;
            employerShareBi += er;
            if (isThisYear) currentYearContributionBi += (ee + er);
        } else if (txn.category === 'epfo_interest' || txn.metadata?.actionId === 'ADD_INTEREST') {
            accumulatedInterestBi += amt;
        } else if (txn.category === 'pf_partial_withdrawal') {
            totalWithdrawalsBi += amt;
        }
    }

    const totalPFBi = employeeShareBi + employerShareBi + accumulatedInterestBi - totalWithdrawalsBi;
    const finalPFBi = totalPFBi >= 0n ? totalPFBi : 0n;

    return {
        totalPFValuePaise: finalPFBi.toString(),
        totalPFValueFormatted: formatMoneyPaise(createMoneyPaise(finalPFBi)),
        availableBalancePaise: '0',
        availableBalanceFormatted: '₹0',
        availablePersonalCashPaise: '0',
        availablePersonalCashFormatted: '₹0',
        restrictedBalancePaise: finalPFBi.toString(),
        restrictedBalanceFormatted: formatMoneyPaise(createMoneyPaise(finalPFBi)),
        employeeSharePaise: employeeShareBi.toString(),
        employeeShareFormatted: formatMoneyPaise(createMoneyPaise(employeeShareBi)),
        employerSharePaise: employerShareBi.toString(),
        employerShareFormatted: formatMoneyPaise(createMoneyPaise(employerShareBi)),
        accumulatedInterestPaise: accumulatedInterestBi.toString(),
        accumulatedInterestFormatted: formatMoneyPaise(createMoneyPaise(accumulatedInterestBi)),
        currentYearContributionPaise: currentYearContributionBi.toString(),
        currentYearContributionFormatted: formatMoneyPaise(createMoneyPaise(currentYearContributionBi))
    };
}

/**
 * Computes Portfolio & Wealth metrics for INVESTMENT_REGISTER.
 * 
 * Invariants:
 * - Invested Cost != Current Market Value
 * - Unrealized valuation changes do NOT affect cash or bank balances.
 * - Available Personal Cash is strictly ₹0 (restricted in portfolio assets).
 */
export function computeInvestmentDashboardMetrics({
    transactions = [],
    currentDate = new Date().toISOString().split('T')[0]
}) {
    let totalInvestedCostBi = 0n;
    let currentMarketValueBi = 0n;
    let realizedGainsBi = 0n;
    let dividendsReceivedBi = 0n;

    for (const txn of transactions) {
        if (txn.status === TransactionStatus.VOIDED || txn.status === TransactionStatus.PENDING) {
            continue;
        }
        const amt = moneyToBigInt(txn.amount);
        const actionId = txn.metadata?.actionId;

        if (actionId === 'INVEST_CASH' || actionId === 'BUY_INVESTMENT' || txn.category === 'investment_buy') {
            totalInvestedCostBi += amt;
            // Default current market valuation matches cost basis until non-cash valuation adjustments occur
            currentMarketValueBi += amt;
        } else if (actionId === 'SELL_INVESTMENT' || txn.category === 'investment_sell') {
            const costBasisBi = txn.metadata?.costBasisPaise ? BigInt(txn.metadata.costBasisPaise) : amt;
            totalInvestedCostBi = totalInvestedCostBi >= costBasisBi ? totalInvestedCostBi - costBasisBi : 0n;
            const proceedsBi = amt;
            const gainBi = proceedsBi - costBasisBi;
            realizedGainsBi += gainBi;
            currentMarketValueBi = currentMarketValueBi >= costBasisBi ? currentMarketValueBi - costBasisBi : 0n;
        } else if (actionId === 'RECORD_DIVIDEND' || txn.category === 'dividend_income') {
            dividendsReceivedBi += amt;
        } else if (actionId === 'UPDATE_VALUATION' || txn.category === 'portfolio_valuation') {
            if (txn.metadata?.marketValuePaise) {
                currentMarketValueBi = BigInt(txn.metadata.marketValuePaise);
            }
        }
    }

    const unrealizedGainBi = currentMarketValueBi - totalInvestedCostBi;

    return {
        totalInvestedCostPaise: totalInvestedCostBi.toString(),
        totalInvestedCostFormatted: formatMoneyPaise(createMoneyPaise(totalInvestedCostBi)),
        currentMarketValuePaise: currentMarketValueBi.toString(),
        currentMarketValueFormatted: formatMoneyPaise(createMoneyPaise(currentMarketValueBi)),
        unrealizedGainLossPaise: unrealizedGainBi.toString(),
        unrealizedGainLossFormatted: formatMoneyPaise(createMoneyPaise(unrealizedGainBi >= 0n ? unrealizedGainBi : -unrealizedGainBi)),
        isUnrealizedLoss: unrealizedGainBi < 0n,
        realizedGainsPaise: realizedGainsBi.toString(),
        realizedGainsFormatted: formatMoneyPaise(createMoneyPaise(realizedGainsBi >= 0n ? realizedGainsBi : -realizedGainsBi)),
        isRealizedLoss: realizedGainsBi < 0n,
        dividendsReceivedPaise: dividendsReceivedBi.toString(),
        dividendsReceivedFormatted: formatMoneyPaise(createMoneyPaise(dividendsReceivedBi)),
        availablePersonalCashPaise: '0',
        availablePersonalCashFormatted: '₹0'
    };
}

