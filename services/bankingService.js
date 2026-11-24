/**
 * FinLife Banking Relationship Intelligence — Authoritative Business & Persistence Service
 * 
 * Manages encrypted persistent storage, operation logs, immutable double-entry journal commits,
 * and deterministic projection synchronization across the banking subsystem.
 */

import { loadData, saveData, STORAGE_KEYS } from './storage';
import { todayLocal, toLocalDateString } from './cashbook/cashbookDates.js';
import {
    BANKING_JOURNAL_EVENT_TYPES,
    BANK_LOAN_STATUS,
    INSTALLMENT_STATUS,
    toPaise,
    fromPaise,
    getHDFCBankDemoFixture
} from '../components/banking/bankingDomainModel';

import {
    generateBankLoanSchedule,
    calculateContractualEMIPaise,
    calculateForeclosureQuote,
    createDoubleEntryBankingJournalForEvent,
    createBankingReversalJournalEntry
} from '../components/banking/bankingAccountingEngine';

import {
    rebuildBankingProjectionsFromJournal,
    validateBankingFinancialTruth
} from '../components/banking/bankingProjectionEngine';

/**
 * Strict read for read-modify-write paths.
 *
 * The public getters below use non-strict loadData(), which returns the empty default on ANY
 * read/decrypt/parse failure. Every mutation reads the current array, appends, and writes the
 * whole array back, so a masked failure would silently overwrite the recoverable store with just
 * the new record (for the journal, which drives every balance, that destroys the ledger).
 * Mutations therefore read through this helper and fail loudly instead.
 */
const readStrict = async (key, fallback) => {
    try {
        const value = await loadData(key, fallback, { strict: true });
        return value === null || value === undefined ? fallback : value;
    } catch (cause) {
        const err = new Error(
            '[Banking Service] Saved banking data could not be read, so this change was NOT saved and nothing was overwritten. ' +
            'Restart the app or restore from a backup, then try again.'
        );
        err.code = 'BANKING_STORAGE_UNREADABLE';
        err.storageKey = key;
        err.cause = cause;
        throw err;
    }
};

export const BankingService = {
    // ── READ ENTITIES ────────────────────────────────────────────────────────

    getBanks: async (options = {}) => {
        if (options?.strict) return await readStrict(STORAGE_KEYS.BANKING_BANKS, []);
        return await loadData(STORAGE_KEYS.BANKING_BANKS, []) || [];
    },

    getAccounts: async (options = {}) => {
        if (options?.strict) return await readStrict(STORAGE_KEYS.BANKING_ACCOUNTS, []);
        return await loadData(STORAGE_KEYS.BANKING_ACCOUNTS, []) || [];
    },

    getLoans: async (options = {}) => {
        if (options?.strict) return await readStrict(STORAGE_KEYS.BANKING_LOANS, []);
        return await loadData(STORAGE_KEYS.BANKING_LOANS, []) || [];
    },

    getJournal: async (options = {}) => {
        if (options?.strict) return await readStrict(STORAGE_KEYS.BANKING_JOURNAL, []);
        return await loadData(STORAGE_KEYS.BANKING_JOURNAL, []) || [];
    },

    getSchedules: async (options = {}) => {
        if (options?.strict) return await readStrict(STORAGE_KEYS.BANKING_SCHEDULES, {});
        return await loadData(STORAGE_KEYS.BANKING_SCHEDULES, {}) || {};
    },

    getDocuments: async (options = {}) => {
        if (options?.strict) return await readStrict(STORAGE_KEYS.BANKING_DOCUMENTS, []);
        return await loadData(STORAGE_KEYS.BANKING_DOCUMENTS, []) || [];
    },

    getOperations: async (options = {}) => {
        if (options?.strict) return await readStrict(STORAGE_KEYS.BANKING_OPERATIONS, []);
        return await loadData(STORAGE_KEYS.BANKING_OPERATIONS, []) || [];
    },

    // ── MASTER DATA & PROJECTION LOADER ──────────────────────────────────────

    loadAllBankingData: async (options = {}) => {
        const [banks, accounts, loans, journal, schedules, documents, operations] = await Promise.all([
            BankingService.getBanks(options),
            BankingService.getAccounts(options),
            BankingService.getLoans(options),
            BankingService.getJournal(options),
            BankingService.getSchedules(options),
            BankingService.getDocuments(options),
            BankingService.getOperations(options)
        ]);

        const projection = rebuildBankingProjectionsFromJournal({
            banks,
            accounts,
            loans,
            journalEntries: journal,
            schedules
        });

        const validation = validateBankingFinancialTruth({
            banks,
            accounts,
            loans,
            journalEntries: journal,
            schedules,
            projection
        });

        return {
            banks,
            accounts,
            loans,
            journal,
            schedules,
            documents,
            operations,
            projection,
            validation
        };
    },

    // ── ENTITY CRUD MUTATIONS ────────────────────────────────────────────────

    saveBank: async (bank) => {
        const banks = await readStrict(STORAGE_KEYS.BANKING_BANKS, []);
        const existingIdx = banks.findIndex(b => b.id === bank.id);
        const updated = existingIdx >= 0
            ? banks.map(b => b.id === bank.id ? { ...b, ...bank, updatedAt: new Date().toISOString() } : b)
            : [...banks, { ...bank, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];

        await saveData(STORAGE_KEYS.BANKING_BANKS, updated);
        return updated;
    },

    saveAccount: async (account, initialBalancePaise = 0) => {
        const accounts = await readStrict(STORAGE_KEYS.BANKING_ACCOUNTS, []);
        const existingIdx = accounts.findIndex(a => a.id === account.id);
        const isNew = existingIdx === -1;

        const updatedAccounts = isNew
            ? [...accounts, account]
            : accounts.map(a => a.id === account.id ? { ...a, ...account, updatedAt: new Date().toISOString() } : a);

        await saveData(STORAGE_KEYS.BANKING_ACCOUNTS, updatedAccounts);

        // If new account with initial balance, create opening journal entry
        if (isNew && initialBalancePaise > 0) {
            const entry = createDoubleEntryBankingJournalForEvent({
                eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_ACCOUNT_OPENED,
                bankId: account.bankId,
                bankAccountId: account.id,
                amountPaise: initialBalancePaise,
                date: account.createdAt ? toLocalDateString(new Date(account.createdAt)) : todayLocal()
            });
            const journal = await readStrict(STORAGE_KEYS.BANKING_JOURNAL, []);
            await saveData(STORAGE_KEYS.BANKING_JOURNAL, [...journal, entry]);
        }

        return updatedAccounts;
    },

    saveLoan: async (loan) => {
        const loans = await readStrict(STORAGE_KEYS.BANKING_LOANS, []);
        const isNew = !loans.some(l => l.id === loan.id);

        const updatedLoans = isNew
            ? [...loans, loan]
            : loans.map(l => l.id === loan.id ? { ...l, ...loan, updatedAt: new Date().toISOString() } : l);

        await saveData(STORAGE_KEYS.BANKING_LOANS, updatedLoans);

        // If new loan, generate initial schedule & commit loan disbursement journal entry
        if (isNew) {
            const initialSchedule = generateBankLoanSchedule(loan);
            const schedules = await readStrict(STORAGE_KEYS.BANKING_SCHEDULES, {});
            schedules[loan.id] = initialSchedule;
            await saveData(STORAGE_KEYS.BANKING_SCHEDULES, schedules);

            const disbEntry = createDoubleEntryBankingJournalForEvent({
                eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_DISBURSED,
                bankId: loan.bankId,
                bankAccountId: loan.repaymentAccountId || null,
                loanId: loan.id,
                amountPaise: loan.originalPrincipalPaise,
                date: loan.startDate
            });
            const journal = await readStrict(STORAGE_KEYS.BANKING_JOURNAL, []);
            await saveData(STORAGE_KEYS.BANKING_JOURNAL, [...journal, disbEntry]);
        }

        return updatedLoans;
    },

    // ── FINANCIAL OPERATIONS & THREE-ACTION EXECUTION ────────────────────────

    /**
     * Action 1: 🟢 Pay Scheduled EMI
     */
    payScheduledEMI: async ({
        loanId,
        installmentId = null,
        amountPaise,
        principalPaise = 0,
        interestPaise = 0,
        feePaise = 0,
        penaltyPaise = 0,
        bankAccountId = null,
        date = todayLocal(),
        note = ''
    }) => {
        const loans = await readStrict(STORAGE_KEYS.BANKING_LOANS, []);
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`[Banking Service] Loan ${loanId} not found.`);

        const finalAccountId = bankAccountId || loan.repaymentAccountId;
        const entry = createDoubleEntryBankingJournalForEvent({
            eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_EMI_PAID,
            bankId: loan.bankId,
            bankAccountId: finalAccountId,
            loanId: loan.id,
            principalPaise,
            interestPaise,
            feePaise,
            penaltyPaise,
            date,
            metadata: { installmentId, note }
        });

        const journal = await readStrict(STORAGE_KEYS.BANKING_JOURNAL, []);
        const updatedJournal = [...journal, entry];
        await saveData(STORAGE_KEYS.BANKING_JOURNAL, updatedJournal);

        return await BankingService.loadAllBankingData();
    },

    /**
     * Action 2: 🟠 Prepay Principal (Lump-Sum)
     */
    prepayPrincipal: async ({
        loanId,
        prepaymentAmountPaise,
        penaltyFeePaise = 0,
        bankAccountId = null,
        strategy = 'REDUCE_TENURE',
        date = todayLocal(),
        note = ''
    }) => {
        const loans = await readStrict(STORAGE_KEYS.BANKING_LOANS, []);
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`[Banking Service] Loan ${loanId} not found.`);

        const finalAccountId = bankAccountId || loan.repaymentAccountId;
        const entry = createDoubleEntryBankingJournalForEvent({
            eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_PRINCIPAL_PREPAID,
            bankId: loan.bankId,
            bankAccountId: finalAccountId,
            loanId: loan.id,
            principalPaise: prepaymentAmountPaise,
            feePaise: penaltyFeePaise,
            date,
            metadata: { strategy, note }
        });

        const journal = await readStrict(STORAGE_KEYS.BANKING_JOURNAL, []);
        const updatedJournal = [...journal, entry];
        await saveData(STORAGE_KEYS.BANKING_JOURNAL, updatedJournal);

        return await BankingService.loadAllBankingData();
    },

    /**
     * Action 3: 🔴 Foreclose / Close Loan
     */
    forecloseLoan: async ({
        loanId,
        accruedInterestPaise = 0,
        prepaymentPenaltyPct = 0,
        waiverPaise = 0,
        bankAccountId = null,
        date = todayLocal(),
        note = ''
    }) => {
        const { projection, loans } = await BankingService.loadAllBankingData();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`[Banking Service] Loan ${loanId} not found.`);

        const loanProj = projection.loans[loanId];
        const outstandingP = loanProj ? loanProj.outstandingPrincipalPaise : loan.originalPrincipalPaise;

        const quote = calculateForeclosureQuote({
            outstandingPrincipalPaise: outstandingP,
            accruedInterestPaise,
            prepaymentPenaltyPct,
            waiverAmountPaise: waiverPaise
        });

        const finalAccountId = bankAccountId || loan.repaymentAccountId;
        const entry = createDoubleEntryBankingJournalForEvent({
            eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_FORECLOSED,
            bankId: loan.bankId,
            bankAccountId: finalAccountId,
            loanId: loan.id,
            foreclosureQuote: quote,
            date,
            metadata: { note, quote }
        });

        const journal = await readStrict(STORAGE_KEYS.BANKING_JOURNAL, []);
        const updatedJournal = [...journal, entry];
        await saveData(STORAGE_KEYS.BANKING_JOURNAL, updatedJournal);

        return await BankingService.loadAllBankingData();
    },

    /**
     * Reversal of any Banking Journal Entry (BANK-31)
     */
    reverseJournalEntry: async ({ journalEntryId, reason = 'User requested reversal' }) => {
        const journal = await readStrict(STORAGE_KEYS.BANKING_JOURNAL, []);
        const origEntry = journal.find(j => j.id === journalEntryId);
        if (!origEntry) throw new Error(`[Banking Service] Journal entry ${journalEntryId} not found.`);

        const revEntry = createBankingReversalJournalEntry({
            originalJournalEntry: origEntry,
            reversalReason: reason
        });

        const updatedJournal = [...journal, revEntry];
        await saveData(STORAGE_KEYS.BANKING_JOURNAL, updatedJournal);

        return await BankingService.loadAllBankingData();
    },

    // ── STORAGE HEALTH PROBE ─────────────────────────────────────────────────

    /**
     * Distinguishes "genuinely empty" from "unreadable" banking storage. Read-only.
     * Callers must never treat an empty read as licence to seed or reset.
     *
     * @returns {Promise<{ hasData: boolean, unreadable: string[], isGenuinelyEmpty: boolean }>}
     */
    probeStorage: async () => {
        const keys = [
            STORAGE_KEYS.BANKING_BANKS,
            STORAGE_KEYS.BANKING_ACCOUNTS,
            STORAGE_KEYS.BANKING_LOANS,
            STORAGE_KEYS.BANKING_JOURNAL,
            STORAGE_KEYS.BANKING_SCHEDULES,
            STORAGE_KEYS.BANKING_DOCUMENTS,
            STORAGE_KEYS.BANKING_OPERATIONS
        ];
        const unreadable = [];
        let hasData = false;
        for (const key of keys) {
            try {
                const value = await loadData(key, null, { strict: true });
                if (Array.isArray(value) ? value.length > 0 : (value && Object.keys(value).length > 0)) hasData = true;
            } catch (e) {
                unreadable.push(key);
            }
        }
        return { hasData, unreadable, isGenuinelyEmpty: !hasData && unreadable.length === 0 };
    },

    // ── RESET TO DEMO FIXTURE (DESTRUCTIVE, DEV ONLY) ────────────────────────
    // Overwrites banks, accounts, loans, schedules, journal, documents and operations.
    // Never call from a data-load path; only from an explicit, confirmed, __DEV__-gated action.

    resetToDemoFixture: async () => {
        const fixture = getHDFCBankDemoFixture();
        const banks = fixture.banks || [fixture.bank];
        await saveData(STORAGE_KEYS.BANKING_BANKS, banks);
        await saveData(STORAGE_KEYS.BANKING_ACCOUNTS, fixture.accounts);
        await saveData(STORAGE_KEYS.BANKING_LOANS, fixture.loans);

        const initialSchedule = generateBankLoanSchedule(fixture.loans[0]);
        await saveData(STORAGE_KEYS.BANKING_SCHEDULES, { [fixture.loans[0].id]: initialSchedule });

        // Seed initial opening balance and disbursement journals
        const openHdfcAccEntry = createDoubleEntryBankingJournalForEvent({
            eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_ACCOUNT_OPENED,
            bankId: fixture.accounts[0].bankId,
            bankAccountId: fixture.accounts[0].id,
            amountPaise: fixture.accounts[0].openingBalancePaise,
            date: '2026-04-01'
        });

        const openIciciAccEntry = fixture.accounts[1] ? createDoubleEntryBankingJournalForEvent({
            eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_ACCOUNT_OPENED,
            bankId: fixture.accounts[1].bankId,
            bankAccountId: fixture.accounts[1].id,
            amountPaise: fixture.accounts[1].openingBalancePaise,
            date: '2026-04-01'
        }) : null;

        const disbLoanEntry = createDoubleEntryBankingJournalForEvent({
            eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_DISBURSED,
            bankId: fixture.bank.id,
            bankAccountId: fixture.accounts[0].id,
            loanId: fixture.loans[0].id,
            amountPaise: fixture.loans[0].originalPrincipalPaise,
            date: '2026-05-01'
        });

        const journalEntries = [openHdfcAccEntry, ...(openIciciAccEntry ? [openIciciAccEntry] : []), disbLoanEntry];
        await saveData(STORAGE_KEYS.BANKING_JOURNAL, journalEntries);
        await saveData(STORAGE_KEYS.BANKING_DOCUMENTS, []);
        await saveData(STORAGE_KEYS.BANKING_OPERATIONS, []);

        return await BankingService.loadAllBankingData();
    }
};
