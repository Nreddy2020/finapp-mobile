/**
 * FinLife Banking Relationship Intelligence — Authoritative Business & Persistence Service
 * 
 * Manages encrypted persistent storage, operation logs, immutable double-entry journal commits,
 * and deterministic projection synchronization across the banking subsystem.
 */

import { loadData, saveData, STORAGE_KEYS } from './storage';
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

export const BankingService = {
    // ── READ ENTITIES ────────────────────────────────────────────────────────

    getBanks: async () => {
        return await loadData(STORAGE_KEYS.BANKING_BANKS, []) || [];
    },

    getAccounts: async () => {
        return await loadData(STORAGE_KEYS.BANKING_ACCOUNTS, []) || [];
    },

    getLoans: async () => {
        return await loadData(STORAGE_KEYS.BANKING_LOANS, []) || [];
    },

    getJournal: async () => {
        return await loadData(STORAGE_KEYS.BANKING_JOURNAL, []) || [];
    },

    getSchedules: async () => {
        return await loadData(STORAGE_KEYS.BANKING_SCHEDULES, {}) || {};
    },

    getDocuments: async () => {
        return await loadData(STORAGE_KEYS.BANKING_DOCUMENTS, []) || [];
    },

    getOperations: async () => {
        return await loadData(STORAGE_KEYS.BANKING_OPERATIONS, []) || [];
    },

    // ── MASTER DATA & PROJECTION LOADER ──────────────────────────────────────

    loadAllBankingData: async () => {
        const [banks, accounts, loans, journal, schedules, documents, operations] = await Promise.all([
            BankingService.getBanks(),
            BankingService.getAccounts(),
            BankingService.getLoans(),
            BankingService.getJournal(),
            BankingService.getSchedules(),
            BankingService.getDocuments(),
            BankingService.getOperations()
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
        const banks = await BankingService.getBanks();
        const existingIdx = banks.findIndex(b => b.id === bank.id);
        const updated = existingIdx >= 0
            ? banks.map(b => b.id === bank.id ? { ...b, ...bank, updatedAt: new Date().toISOString() } : b)
            : [...banks, { ...bank, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];

        await saveData(STORAGE_KEYS.BANKING_BANKS, updated);
        return updated;
    },

    saveAccount: async (account, initialBalancePaise = 0) => {
        const accounts = await BankingService.getAccounts();
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
                date: account.createdAt ? account.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
            });
            const journal = await BankingService.getJournal();
            await saveData(STORAGE_KEYS.BANKING_JOURNAL, [...journal, entry]);
        }

        return updatedAccounts;
    },

    saveLoan: async (loan) => {
        const loans = await BankingService.getLoans();
        const isNew = !loans.some(l => l.id === loan.id);

        const updatedLoans = isNew
            ? [...loans, loan]
            : loans.map(l => l.id === loan.id ? { ...l, ...loan, updatedAt: new Date().toISOString() } : l);

        await saveData(STORAGE_KEYS.BANKING_LOANS, updatedLoans);

        // If new loan, generate initial schedule & commit loan disbursement journal entry
        if (isNew) {
            const initialSchedule = generateBankLoanSchedule(loan);
            const schedules = await BankingService.getSchedules();
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
            const journal = await BankingService.getJournal();
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
        date = new Date().toISOString().split('T')[0],
        note = ''
    }) => {
        const loans = await BankingService.getLoans();
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

        const journal = await BankingService.getJournal();
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
        date = new Date().toISOString().split('T')[0],
        note = ''
    }) => {
        const loans = await BankingService.getLoans();
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

        const journal = await BankingService.getJournal();
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
        date = new Date().toISOString().split('T')[0],
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

        const journal = await BankingService.getJournal();
        const updatedJournal = [...journal, entry];
        await saveData(STORAGE_KEYS.BANKING_JOURNAL, updatedJournal);

        return await BankingService.loadAllBankingData();
    },

    /**
     * Reversal of any Banking Journal Entry (BANK-31)
     */
    reverseJournalEntry: async ({ journalEntryId, reason = 'User requested reversal' }) => {
        const journal = await BankingService.getJournal();
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

    // ── SEEDING & RESET TO DEMO FIXTURE ──────────────────────────────────────

    resetToDemoFixture: async () => {
        const fixture = getHDFCBankDemoFixture();
        await saveData(STORAGE_KEYS.BANKING_BANKS, [fixture.bank]);
        await saveData(STORAGE_KEYS.BANKING_ACCOUNTS, fixture.accounts);
        await saveData(STORAGE_KEYS.BANKING_LOANS, fixture.loans);

        const initialSchedule = generateBankLoanSchedule(fixture.loans[0]);
        await saveData(STORAGE_KEYS.BANKING_SCHEDULES, { [fixture.loans[0].id]: initialSchedule });

        // Seed initial opening balance and disbursement journals
        const openAccEntry = createDoubleEntryBankingJournalForEvent({
            eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_ACCOUNT_OPENED,
            bankId: fixture.bank.id,
            bankAccountId: fixture.accounts[0].id,
            amountPaise: fixture.accounts[0].openingBalancePaise,
            date: '2026-04-01'
        });

        const disbLoanEntry = createDoubleEntryBankingJournalForEvent({
            eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_DISBURSED,
            bankId: fixture.bank.id,
            bankAccountId: fixture.accounts[0].id,
            loanId: fixture.loans[0].id,
            amountPaise: fixture.loans[0].originalPrincipalPaise,
            date: '2026-05-01'
        });

        await saveData(STORAGE_KEYS.BANKING_JOURNAL, [openAccEntry, disbLoanEntry]);
        await saveData(STORAGE_KEYS.BANKING_DOCUMENTS, []);
        await saveData(STORAGE_KEYS.BANKING_OPERATIONS, []);

        return await BankingService.loadAllBankingData();
    }
};
