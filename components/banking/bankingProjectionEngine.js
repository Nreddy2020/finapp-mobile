/**
 * FinLife Banking Relationship Intelligence — Projection & Replay Engine
 * 
 * Implements deterministic projection replay from immutable double-entry journal entries,
 * canonical projection hashing, and the Banking Financial Truth Validator.
 */

import {
    fromPaise,
    INSTALLMENT_STATUS,
    BANK_LOAN_STATUS,
    BANKING_JOURNAL_EVENT_TYPES
} from './bankingDomainModel.js';

import {
    generateBankLoanSchedule,
    recalculateScheduleAfterEMIPayment,
    applyPrepaymentToSchedule
} from './bankingAccountingEngine.js';

/**
 * Deterministically rebuilds all Bank, Account, Loan, and Schedule projections from the immutable journal.
 * The UI never owns financial state; everything is derived from journal replay.
 */
export function rebuildBankingProjectionsFromJournal({
    banks = [],
    accounts = [],
    loans = [],
    journalEntries = [],
    schedules = {}
}) {
    // 1. Initialize Account Projections with baseline opening balances
    const accountProjections = {};
    accounts.forEach(acc => {
        const openPaise = Math.round(Number(acc.openingBalancePaise) || 0);
        accountProjections[acc.id] = {
            accountId: acc.id,
            bankId: acc.bankId,
            accountName: acc.accountName,
            accountType: acc.accountType,
            openingBalancePaise: openPaise,
            ledgerBalancePaise: openPaise,
            availableBalancePaise: openPaise,
            totalDebitsPaise: 0,
            totalCreditsPaise: 0,
            lastProjectedJournalId: null,
            projectedAt: new Date().toISOString()
        };
    });

    // 2. Initialize Loan Projections
    const loanProjections = {};
    const scheduleProjections = {};

    loans.forEach(loan => {
        const origPaise = Math.round(Number(loan.originalPrincipalPaise) || 0);
        loanProjections[loan.id] = {
            loanId: loan.id,
            bankId: loan.bankId,
            loanName: loan.loanName,
            loanType: loan.loanType,
            interestRate: loan.interestRate,
            interestMethod: loan.interestMethod,
            tenureMonths: loan.tenureMonths,
            originalPrincipalPaise: origPaise,
            outstandingPrincipalPaise: origPaise,
            principalPaidPaise: 0,
            interestPaidPaise: 0,
            feesPaidPaise: 0,
            penaltiesPaidPaise: 0,
            waiverAmountPaise: 0,
            status: loan.status || BANK_LOAN_STATUS.ACTIVE,
            lastPaymentDate: null
        };

        // If existing schedule provided, clone it; otherwise generate initial schedule
        scheduleProjections[loan.id] = schedules[loan.id]
            ? JSON.parse(JSON.stringify(schedules[loan.id]))
            : generateBankLoanSchedule(loan);
    });

    // 3. Sort Journal Entries chronologically
    const sortedEntries = [...journalEntries].sort((a, b) => {
        const dA = new Date(a.eventDate || a.createdAt).getTime();
        const dB = new Date(b.eventDate || b.createdAt).getTime();
        return dA - dB;
    });

    // 4. Replay Journal Lines
    sortedEntries.forEach(entry => {
        const lines = entry.lines || [];

        lines.forEach(line => {
            // Reconcile Cash Accounts
            const targetAccId = line.bankAccountId || (line.accountId && line.accountId.startsWith('ASSET_BANK_CASH_') ? line.accountId.replace('ASSET_BANK_CASH_', '') : null);
            if (targetAccId && accountProjections[targetAccId] && line.component === 'CASH') {
                const acc = accountProjections[targetAccId];
                acc.totalDebitsPaise += line.debitPaise;
                acc.totalCreditsPaise += line.creditPaise;
                // For Asset accounts: Balance = Opening + Debits - Credits
                acc.ledgerBalancePaise += (line.debitPaise - line.creditPaise);
                acc.availableBalancePaise = acc.ledgerBalancePaise;
                acc.lastProjectedJournalId = entry.id;
            }

            // Reconcile Loans
            if (line.loanId && loanProjections[line.loanId]) {
                const lp = loanProjections[line.loanId];

                if (line.component === 'PRINCIPAL') {
                    if (line.creditPaise > 0 && entry.eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_DISBURSED) {
                        // Disbursement increases liability / principal
                        lp.outstandingPrincipalPaise = line.creditPaise;
                    } else if (line.debitPaise > 0) {
                        // Repayment / Prepayment reduces principal
                        lp.principalPaidPaise += line.debitPaise;
                        lp.outstandingPrincipalPaise = Math.max(0, lp.outstandingPrincipalPaise - line.debitPaise);
                    } else if (line.creditPaise > 0 && entry.eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_REVERSAL) {
                        // Reversal of principal repayment/prepayment restores principal
                        lp.principalPaidPaise = Math.max(0, lp.principalPaidPaise - line.creditPaise);
                        lp.outstandingPrincipalPaise += line.creditPaise;
                    }
                } else if (line.component === 'INTEREST') {
                    if (line.debitPaise > 0) lp.interestPaidPaise += line.debitPaise;
                    else if (line.creditPaise > 0 && entry.eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_REVERSAL) {
                        lp.interestPaidPaise = Math.max(0, lp.interestPaidPaise - line.creditPaise);
                    }
                } else if (line.component === 'FEE') {
                    if (line.debitPaise > 0) lp.feesPaidPaise += line.debitPaise;
                    else if (line.creditPaise > 0 && entry.eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_REVERSAL) {
                        lp.feesPaidPaise = Math.max(0, lp.feesPaidPaise - line.creditPaise);
                    }
                } else if (line.component === 'PENALTY') {
                    if (line.debitPaise > 0) lp.penaltiesPaidPaise += line.debitPaise;
                    else if (line.creditPaise > 0 && entry.eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_REVERSAL) {
                        lp.penaltiesPaidPaise = Math.max(0, lp.penaltiesPaidPaise - line.creditPaise);
                    }
                } else if (line.component === 'WAIVER') {
                    if (line.creditPaise > 0) lp.waiverAmountPaise += line.creditPaise;
                }

                if (entry.eventDate) {
                    lp.lastPaymentDate = entry.eventDate;
                }

                if (lp.outstandingPrincipalPaise === 0) {
                    lp.status = (entry.eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_FORECLOSED)
                        ? BANK_LOAN_STATUS.FORECLOSED
                        : BANK_LOAN_STATUS.CLOSED;
                }
            }
        });

        // Replay Schedule Mutations
        if (entry.entityType === 'BANK_LOAN' && entry.entityId && scheduleProjections[entry.entityId]) {
            const loan = loans.find(l => l.id === entry.entityId);
            if (loan) {
                if (entry.eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_EMI_PAID) {
                    const pLine = (entry.lines || []).find(l => l.component === 'PRINCIPAL');
                    const iLine = (entry.lines || []).find(l => l.component === 'INTEREST');
                    const fLine = (entry.lines || []).find(l => l.component === 'FEE');
                    const totalPaid = (pLine?.debitPaise || 0) + (iLine?.debitPaise || 0) + (fLine?.debitPaise || 0);

                    scheduleProjections[loan.id] = recalculateScheduleAfterEMIPayment({
                        loan,
                        schedule: scheduleProjections[loan.id],
                        installmentId: entry.metadata?.installmentId || null,
                        paymentAmountPaise: totalPaid,
                        paymentDate: entry.eventDate
                    });
                } else if (entry.eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_PRINCIPAL_PREPAID) {
                    const pLine = (entry.lines || []).find(l => l.component === 'PRINCIPAL');
                    if (pLine && pLine.debitPaise > 0) {
                        scheduleProjections[loan.id] = applyPrepaymentToSchedule({
                            loan,
                            schedule: scheduleProjections[loan.id],
                            prepaymentAmountPaise: pLine.debitPaise,
                            prepaymentDate: entry.eventDate,
                            strategy: entry.metadata?.strategy || 'REDUCE_TENURE'
                        });
                    }
                } else if (entry.eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_FORECLOSED) {
                    // Mark all unpaid installments as CLOSED_BY_SETTLEMENT
                    scheduleProjections[loan.id] = scheduleProjections[loan.id].map(item => {
                        if (item.status !== INSTALLMENT_STATUS.PAID) {
                            return { ...item, status: INSTALLMENT_STATUS.CLOSED_BY_SETTLEMENT };
                        }
                        return item;
                    });
                }
            }
        }
    });

    // 5. Aggregate Bank Relationships
    const bankRelationshipProjections = {};
    banks.forEach(b => {
        const bAccounts = Object.values(accountProjections).filter(a => a.bankId === b.id);
        const bLoans = Object.values(loanProjections).filter(l => l.bankId === b.id && l.status === BANK_LOAN_STATUS.ACTIVE);

        const totalCashPaise = bAccounts.reduce((s, a) => s + a.ledgerBalancePaise, 0);
        const totalDebtPaise = bLoans.reduce((s, l) => s + l.outstandingPrincipalPaise, 0);
        const netPositionPaise = totalCashPaise - totalDebtPaise;

        // Compute monthly EMI & monthly interest for this bank
        let monthlyEMIPaise = 0;
        let monthlyInterestPaise = 0;

        bLoans.forEach(l => {
            const sch = scheduleProjections[l.loanId] || [];
            const nextPending = sch.find(s => s.status === INSTALLMENT_STATUS.PENDING || s.status === INSTALLMENT_STATUS.PARTIALLY_PAID || s.status === INSTALLMENT_STATUS.DUE);
            if (nextPending) {
                monthlyEMIPaise += nextPending.expectedTotalPaise;
                monthlyInterestPaise += nextPending.expectedInterestPaise;
            }
        });

        bankRelationshipProjections[b.id] = {
            bankId: b.id,
            bankName: b.name,
            totalCashPaise,
            totalDebtPaise,
            netPositionPaise,
            monthlyEMIPaise,
            monthlyInterestPaise,
            activeAccountsCount: bAccounts.length,
            activeLoansCount: bLoans.length
        };
    });

    return {
        accounts: accountProjections,
        loans: loanProjections,
        schedules: scheduleProjections,
        bankRelationships: bankRelationshipProjections
    };
}

// ── CANONICAL PROJECTION HASH (BANK-34) ──────────────────────────────────────

/**
 * Computes a deterministic canonical string and simple fast hash of the projection state.
 * Guarantees Projection A === Projection B on replay.
 */
export function computeBankingProjectionHash(projection) {
    if (!projection) return '0';

    // Normalize keys in sorted order for deterministic stringification
    const canonicalObj = {
        accounts: Object.keys(projection.accounts || {}).sort().map(k => {
            const a = projection.accounts[k];
            return `${a.accountId}:${a.ledgerBalancePaise}`;
        }),
        loans: Object.keys(projection.loans || {}).sort().map(k => {
            const l = projection.loans[k];
            return `${l.loanId}:${l.outstandingPrincipalPaise}:${l.principalPaidPaise}:${l.interestPaidPaise}:${l.status}`;
        }),
        bankRelationships: Object.keys(projection.bankRelationships || {}).sort().map(k => {
            const b = projection.bankRelationships[k];
            return `${b.bankId}:${b.totalCashPaise}:${b.totalDebtPaise}:${b.netPositionPaise}`;
        })
    };

    const str = JSON.stringify(canonicalObj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return `hash_bproj_${Math.abs(hash).toString(16)}`;
}

// ── FINANCIAL TRUTH VALIDATOR (CONTRACT 6 / VALIDATOR) ──────────────────────

/**
 * Financial Truth Validator
 * Verifies that the banking state satisfies all accounting invariants without anomalies.
 */
export function validateBankingFinancialTruth({
    banks = [],
    accounts = [],
    loans = [],
    journalEntries = [],
    schedules = {},
    projection = null
}) {
    const checks = [];
    const errors = [];

    // Check 1: Journal Balance Invariant (Every entry has sum(Debit) === sum(Credit))
    let journalBalanced = true;
    journalEntries.forEach(entry => {
        const lines = entry.lines || [];
        const debits = lines.reduce((s, l) => s + (Number(l.debitPaise) || 0), 0);
        const credits = lines.reduce((s, l) => s + (Number(l.creditPaise) || 0), 0);
        if (debits !== credits) {
            journalBalanced = false;
            errors.push(`Journal entry ${entry.id} is unbalanced: Debits (${debits}) !== Credits (${credits})`);
        }
    });
    checks.push({ name: 'Double-Entry Journal Balance', passed: journalBalanced });

    // Check 2: Principal Conservation Invariant (Original = Paid + Outstanding)
    let principalConserved = true;
    const proj = projection || rebuildBankingProjectionsFromJournal({ banks, accounts, loans, journalEntries, schedules });

    loans.forEach(loan => {
        const lp = proj.loans[loan.id];
        if (lp) {
            const orig = lp.originalPrincipalPaise;
            const paid = lp.principalPaidPaise;
            const out = lp.outstandingPrincipalPaise;
            if (orig !== (paid + out)) {
                principalConserved = false;
                errors.push(`Loan ${loan.id} principal mismatch: Original (${orig}) !== Paid (${paid}) + Outstanding (${out})`);
            }
        }
    });
    checks.push({ name: 'Principal Conservation Invariant', passed: principalConserved });

    // Check 3: Zero Negative Balances
    let noNegativeBalances = true;
    Object.values(proj.accounts).forEach(acc => {
        if (acc.ledgerBalancePaise < 0) {
            noNegativeBalances = false;
            errors.push(`Account ${acc.accountId} has negative ledger balance: ${acc.ledgerBalancePaise} paise`);
        }
    });
    Object.values(proj.loans).forEach(lp => {
        if (lp.outstandingPrincipalPaise < 0) {
            noNegativeBalances = false;
            errors.push(`Loan ${lp.loanId} has negative outstanding principal: ${lp.outstandingPrincipalPaise} paise`);
        }
    });
    checks.push({ name: 'Non-Negative Balances', passed: noNegativeBalances });

    // Check 4: Schedule Zero Phantom Residual (Final closing principal is 0 paise)
    let scheduleIntegrity = true;
    Object.keys(proj.schedules).forEach(loanId => {
        const sch = proj.schedules[loanId] || [];
        if (sch.length > 0) {
            const lastItem = sch[sch.length - 1];
            if (lastItem.closingPrincipalPaise !== 0) {
                scheduleIntegrity = false;
                errors.push(`Loan ${loanId} schedule has phantom residual: closing principal is ${lastItem.closingPrincipalPaise} paise`);
            }
        }
    });
    checks.push({ name: 'Schedule Residual Reconciliation', passed: scheduleIntegrity });

    // Check 5: Deterministic Projection Replay Invariant (Replay 1 === Replay 2)
    const replay1 = rebuildBankingProjectionsFromJournal({ banks, accounts, loans, journalEntries, schedules });
    const replay2 = rebuildBankingProjectionsFromJournal({ banks, accounts, loans, journalEntries, schedules });
    const hash1 = computeBankingProjectionHash(replay1);
    const hash2 = computeBankingProjectionHash(replay2);
    const deterministic = (hash1 === hash2);
    checks.push({ name: 'Deterministic Replay Hash Match', passed: deterministic });

    // Check 6: Passed Projection vs Canonical Journal Replay Match
    let passedProjectionMatchesReplay = true;
    if (projection) {
        const passedHash = computeBankingProjectionHash(projection);
        if (passedHash !== hash1) {
            passedProjectionMatchesReplay = false;
            errors.push(`Passed projection hash (${passedHash}) deviates from canonical journal replay (${hash1}). In-memory tampering or drift detected.`);
        }
    }
    checks.push({ name: 'Projection vs Canonical Journal Replay Match', passed: passedProjectionMatchesReplay });

    const isHealthy = checks.every(c => c.passed);

    return {
        status: isHealthy ? 'HEALTHY' : 'CORRUPTED',
        isHealthy,
        checks,
        errors,
        projectionHash: hash1,
        reconciledAccountsCount: Object.keys(proj.accounts).length,
        reconciledLoansCount: Object.keys(proj.loans).length,
        reconciledEntriesCount: journalEntries.length
    };
}
