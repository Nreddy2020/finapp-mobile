/**
 * FinLife P2P Loans — Authoritative Service & Persistence Store
 * Manages encrypted local storage for Persons, Loans, Advances, Repayments, and Journal Entries.
 * Implements isolated demo fixture support and double-entry journal persistence.
 */

import { saveData, loadData, STORAGE_KEYS } from './storage';
import {
    LOAN_DIRECTION,
    LOAN_STATUS,
    INTEREST_METHOD,
    REPAYMENT_FREQUENCY,
    REPAYMENT_ALLOCATION,
    JOURNAL_EVENT_TYPES,
    createPerson,
    createP2PLoan,
    createLoanAdvance,
    createLoanRepayment,
    createRepaymentScheduleItem,
    createJournalEntry
} from '../components/p2p/p2pDomainModel';
import {
    calculateLoanDNA,
    generateInitialSchedule,
    allocateRepayment,
    recalculateScheduleAfterPayment,
    calculateSettlementQuote,
    createDoubleEntryJournalForEvent
} from '../components/p2p/p2pAccountingEngine';

// Default In-Memory Cache
let memoryCache = {
    persons: null,
    loans: null,
    advances: null,
    repayments: null,
    schedules: null,
    journal: null
};

export const P2PService = {
    /**
     * Clear local memory cache (useful in test runs)
     */
    clearMemoryCache: () => {
        memoryCache = {
            persons: null,
            loans: null,
            advances: null,
            repayments: null,
            schedules: null,
            journal: null
        };
    },

    // ── 1. PERSONS ─────────────────────────────────────────────────────────────
    getPersons: async () => {
        if (memoryCache.persons) return memoryCache.persons;
        const loaded = await loadData(STORAGE_KEYS.P2P_PERSONS, []) || [];
        memoryCache.persons = loaded;
        return loaded;
    },

    addPerson: async (personData) => {
        const persons = await P2PService.getPersons();
        const newPerson = createPerson(personData);
        const updated = [...persons, newPerson];
        memoryCache.persons = updated;
        await saveData(STORAGE_KEYS.P2P_PERSONS, updated);
        return newPerson;
    },

    updatePerson: async (updatedPerson) => {
        const persons = await P2PService.getPersons();
        const updated = persons.map(p => p.id === updatedPerson.id ? { ...p, ...updatedPerson, updatedAt: new Date().toISOString() } : p);
        memoryCache.persons = updated;
        await saveData(STORAGE_KEYS.P2P_PERSONS, updated);
        return updatedPerson;
    },

    // ── 2. LOANS ───────────────────────────────────────────────────────────────
    getLoans: async () => {
        if (memoryCache.loans) return memoryCache.loans;
        const loaded = await loadData(STORAGE_KEYS.P2P_LOANS, []) || [];
        memoryCache.loans = loaded;
        return loaded;
    },

    addLoan: async (loanData) => {
        const loans = await P2PService.getLoans();
        const newLoan = createP2PLoan(loanData);

        // 1. Generate initial schedule
        const initialSchedule = generateInitialSchedule(newLoan);
        await P2PService._saveScheduleForLoan(newLoan.id, initialSchedule);

        // 2. Create initial disbursement advance record
        const initialAdvance = createLoanAdvance({
            loanId: newLoan.id,
            amount: newLoan.principal,
            date: newLoan.startDate,
            accountId: newLoan.accountId,
            note: 'Initial Loan Advance / Disbursement',
            isInitial: true
        });
        await P2PService._appendAdvance(initialAdvance);

        // 3. Create double-entry journal entry
        const eventType = newLoan.direction === LOAN_DIRECTION.GIVEN 
            ? JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN 
            : JOURNAL_EVENT_TYPES.P2P_LOAN_TAKEN;
        const journalEntry = createDoubleEntryJournalForEvent({
            eventType,
            loan: newLoan,
            advance: initialAdvance,
            accountId: newLoan.accountId,
            date: newLoan.startDate
        });
        await P2PService._appendJournalEntry(journalEntry);

        const updatedLoans = [...loans, newLoan];
        memoryCache.loans = updatedLoans;
        await saveData(STORAGE_KEYS.P2P_LOANS, updatedLoans);

        return newLoan;
    },

    updateLoan: async (updatedLoan) => {
        const loans = await P2PService.getLoans();
        const updated = loans.map(l => l.id === updatedLoan.id ? { ...l, ...updatedLoan, updatedAt: new Date().toISOString() } : l);
        memoryCache.loans = updated;
        await saveData(STORAGE_KEYS.P2P_LOANS, updated);
        return updatedLoan;
    },

    deleteLoan: async (loanId) => {
        const loans = await P2PService.getLoans();
        const updated = loans.filter(l => l.id !== loanId);
        memoryCache.loans = updated;
        await saveData(STORAGE_KEYS.P2P_LOANS, updated);
        return updated;
    },

    // ── 3. ADVANCES / TOP-UPS ──────────────────────────────────────────────────
    getAdvances: async (loanId = null) => {
        if (!memoryCache.advances) {
            memoryCache.advances = await loadData(STORAGE_KEYS.P2P_ADVANCES, []) || [];
        }
        if (loanId) {
            return memoryCache.advances.filter(a => a.loanId === loanId);
        }
        return memoryCache.advances;
    },

    addAdvance: async ({ loanId, amount, date, accountId, note }) => {
        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`Loan ${loanId} not found.`);

        const advance = createLoanAdvance({
            loanId,
            amount,
            date: date || new Date().toISOString().split('T')[0],
            accountId: accountId || loan.accountId,
            note: note || 'Additional Top-Up Advance',
            isInitial: false
        });

        await P2PService._appendAdvance(advance);

        // Update loan principal
        const newPrincipal = (Number(loan.principal) || 0) + advance.amount;
        await P2PService.updateLoan({ ...loan, principal: newPrincipal });

        // Journal Entry
        const eventType = loan.direction === LOAN_DIRECTION.GIVEN 
            ? JOURNAL_EVENT_TYPES.P2P_ADVANCE_GIVEN 
            : JOURNAL_EVENT_TYPES.P2P_ADVANCE_TAKEN;
        const journalEntry = createDoubleEntryJournalForEvent({
            eventType,
            loan: { ...loan, principal: newPrincipal },
            advance,
            accountId: advance.accountId,
            date: advance.date
        });
        await P2PService._appendJournalEntry(journalEntry);

        return advance;
    },

    // ── 4. REPAYMENTS & SCHEDULES ──────────────────────────────────────────────
    getRepayments: async (loanId = null) => {
        if (!memoryCache.repayments) {
            memoryCache.repayments = await loadData(STORAGE_KEYS.P2P_REPAYMENTS, []) || [];
        }
        if (loanId) {
            return memoryCache.repayments.filter(r => r.loanId === loanId);
        }
        return memoryCache.repayments;
    },

    getSchedule: async (loanId) => {
        const allSchedules = await P2PService._loadAllSchedules();
        return allSchedules[loanId] || [];
    },

    recordRepayment: async ({
        loanId,
        amount,
        date = new Date().toISOString().split('T')[0],
        accountId,
        note = '',
        scheduleItemId = null,
        allocationPolicy = REPAYMENT_ALLOCATION.INTEREST_FIRST
    }) => {
        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`Loan ${loanId} not found.`);

        const advances = await P2PService.getAdvances(loanId);
        const existingRepayments = await P2PService.getRepayments(loanId);
        const existingSchedule = await P2PService.getSchedule(loanId);

        const totalAdvanced = advances.reduce((s, a) => s + (Number(a.amount) || 0), 0) || loan.principal;
        const totalPrincipalPaid = existingRepayments.reduce((s, r) => s + (Number(r.principalComponent) || 0), 0);
        const outstandingPrincipal = Math.max(0, totalAdvanced - totalPrincipalPaid);

        // Compute unpaid accrued interest for current window
        const nextScheduleItem = existingSchedule.find(s => s.id === scheduleItemId || s.status === 'PENDING');
        const unpaidAccruedInterest = nextScheduleItem ? nextScheduleItem.interestComponent : ((outstandingPrincipal * (loan.interestRate / 100)) / 12);

        // Run allocation policy
        const allocation = allocateRepayment({
            loan,
            amount,
            currentOutstandingPrincipal: outstandingPrincipal,
            unpaidAccruedInterest,
            allocationPolicy
        });

        const repayment = createLoanRepayment({
            loanId,
            amount,
            principalComponent: allocation.principalComponent,
            interestComponent: allocation.interestComponent,
            date,
            accountId: accountId || loan.accountId,
            note,
            scheduleItemId
        });

        await P2PService._appendRepayment(repayment);

        // Recalculate schedule
        const updatedSchedule = recalculateScheduleAfterPayment({
            loan,
            existingSchedule,
            repayment,
            asOfDate: date
        });
        await P2PService._saveScheduleForLoan(loanId, updatedSchedule);

        // Check if loan is fully paid
        if (allocation.remainingPrincipalAfter <= 0.01) {
            await P2PService.updateLoan({ ...loan, status: LOAN_STATUS.SETTLED });
        }

        // Journal Entry
        const eventType = loan.direction === LOAN_DIRECTION.GIVEN
            ? JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED
            : JOURNAL_EVENT_TYPES.P2P_REPAYMENT_PAID;
        const journalEntry = createDoubleEntryJournalForEvent({
            eventType,
            loan,
            repayment,
            accountId: repayment.accountId,
            date: repayment.date
        });
        await P2PService._appendJournalEntry(journalEntry);

        return { repayment, allocation, updatedSchedule };
    },

    // ── 5. SETTLEMENT ──────────────────────────────────────────────────────────
    settleLoan: async ({
        loanId,
        waiverAmount = 0,
        date = new Date().toISOString().split('T')[0],
        accountId,
        note = ''
    }) => {
        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`Loan ${loanId} not found.`);

        const advances = await P2PService.getAdvances(loanId);
        const repayments = await P2PService.getRepayments(loanId);

        const quote = calculateSettlementQuote({
            loan,
            advances,
            repayments,
            waiverAmount
        });

        // Mark loan settled
        const updatedLoan = { ...loan, status: LOAN_STATUS.SETTLED, updatedAt: new Date().toISOString() };
        await P2PService.updateLoan(updatedLoan);

        // Generate journal entry
        const journalEntry = createDoubleEntryJournalForEvent({
            eventType: JOURNAL_EVENT_TYPES.P2P_SETTLEMENT,
            loan: updatedLoan,
            settlement: quote,
            accountId: accountId || loan.accountId,
            date,
            note: note || `Settlement of ${loan.direction === LOAN_DIRECTION.GIVEN ? 'Receivable' : 'Payable'}`
        });
        await P2PService._appendJournalEntry(journalEntry);

        return { quote, updatedLoan, journalEntry };
    },

    // ── 6. JOURNAL ENTRIES ─────────────────────────────────────────────────────
    getJournalEntries: async () => {
        if (memoryCache.journal) return memoryCache.journal;
        const loaded = await loadData(STORAGE_KEYS.P2P_JOURNAL, []) || [];
        memoryCache.journal = loaded;
        return loaded;
    },

    // ── 7. DEMO FIXTURE LOADER (ISOLATED) ──────────────────────────────────────
    loadDemoFixtures: async () => {
        await P2PService.resetToCleanState();

        // 1. Create Persons
        const personA = await P2PService.addPerson({
            name: 'Kasapa Reddy Bava',
            phone: '+91 98450 12345',
            notes: 'Family borrower with multiple structured loans.',
            tags: ['Family', 'Preferred']
        });

        const personB = await P2PService.addPerson({
            name: 'ICICI Bank (Private Loan)',
            phone: '1800 200 3344',
            notes: 'Private emergency loan taken.',
            tags: ['Institution', 'Payable']
        });

        const personC = await P2PService.addPerson({
            name: 'Vikram Sharma',
            phone: '+91 98860 54321',
            notes: 'Colleague business bridge loan.',
            tags: ['Business', 'Colleague']
        });

        // 2. Loans for Person A (4 Given Loans)
        const loan85 = await P2PService.addLoan({
            personId: personA.id,
            direction: LOAN_DIRECTION.GIVEN,
            principal: 250000,
            interestRate: 9.99,
            interestMethod: INTEREST_METHOD.SIMPLE,
            tenureMonths: 12,
            startDate: '2026-04-06',
            accountId: 'HDFC Savings Account',
            notes: 'School expenses bridge loan.'
        });

        const loan86 = await P2PService.addLoan({
            personId: personA.id,
            direction: LOAN_DIRECTION.GIVEN,
            principal: 320000,
            interestRate: 10.5,
            interestMethod: INTEREST_METHOD.SIMPLE,
            tenureMonths: 18,
            startDate: '2026-05-10',
            accountId: 'HDFC Savings Account',
            notes: 'Agriculture equipment finance.'
        });

        const loan90 = await P2PService.addLoan({
            personId: personA.id,
            direction: LOAN_DIRECTION.GIVEN,
            principal: 175000,
            interestRate: 12.0,
            interestMethod: INTEREST_METHOD.SIMPLE,
            tenureMonths: 6,
            startDate: '2026-06-15',
            accountId: 'ICICI Current Account',
            notes: 'Working capital top-up.'
        });

        const loan96 = await P2PService.addLoan({
            personId: personA.id,
            direction: LOAN_DIRECTION.GIVEN,
            principal: 136000,
            interestRate: 8.5,
            interestMethod: INTEREST_METHOD.SIMPLE,
            tenureMonths: 12,
            startDate: '2026-07-01',
            accountId: 'SBI Savings Account',
            notes: 'Personal requirement.'
        });

        // 3. Taken Loan for Person B
        const loan110 = await P2PService.addLoan({
            personId: personB.id,
            direction: LOAN_DIRECTION.TAKEN,
            principal: 2500000,
            interestRate: 11.25,
            interestMethod: INTEREST_METHOD.AMORTIZED,
            tenureMonths: 60,
            startDate: '2026-04-06',
            accountId: 'HDFC Savings Account',
            notes: 'Commercial expansion bridge facility.'
        });

        // 4. Sample Repayments on Loan 85 (Given)
        await P2PService.recordRepayment({
            loanId: loan85.id,
            amount: 53529,
            date: '2026-08-06',
            accountId: 'HDFC Savings Account',
            note: 'August Installment Received'
        });

        await P2PService.recordRepayment({
            loanId: loan85.id,
            amount: 53524,
            date: '2026-07-06',
            accountId: 'HDFC Savings Account',
            note: 'July Installment Received'
        });

        await P2PService.recordRepayment({
            loanId: loan85.id,
            amount: 53549,
            date: '2026-06-06',
            accountId: 'HDFC Savings Account',
            note: 'June Installment Received'
        });

        // 5. Sample Repayment on Loan 110 (Taken)
        await P2PService.recordRepayment({
            loanId: loan110.id,
            amount: 53529.13,
            date: '2026-08-06',
            accountId: 'HDFC Savings Account',
            note: 'August EMI Paid'
        });

        return { personA, personB, personC, loan85, loan86, loan90, loan96, loan110 };
    },

    resetToCleanState: async () => {
        P2PService.clearMemoryCache();
        await saveData(STORAGE_KEYS.P2P_PERSONS, []);
        await saveData(STORAGE_KEYS.P2P_LOANS, []);
        await saveData(STORAGE_KEYS.P2P_ADVANCES, []);
        await saveData(STORAGE_KEYS.P2P_REPAYMENTS, []);
        await saveData(STORAGE_KEYS.P2P_JOURNAL, []);
        await saveData('finlife_p2p_schedules_v1', {});
    },

    // ── PRIVATE HELPERS ────────────────────────────────────────────────────────
    _loadAllSchedules: async () => {
        if (!memoryCache.schedules) {
            memoryCache.schedules = await loadData('finlife_p2p_schedules_v1', {}) || {};
        }
        return memoryCache.schedules;
    },

    _saveScheduleForLoan: async (loanId, schedule) => {
        const all = await P2PService._loadAllSchedules();
        all[loanId] = schedule;
        memoryCache.schedules = all;
        await saveData('finlife_p2p_schedules_v1', all);
    },

    _appendAdvance: async (advance) => {
        const advances = await P2PService.getAdvances();
        const updated = [...advances, advance];
        memoryCache.advances = updated;
        await saveData(STORAGE_KEYS.P2P_ADVANCES, updated);
    },

    _appendRepayment: async (repayment) => {
        const repayments = await P2PService.getRepayments();
        const updated = [...repayments, repayment];
        memoryCache.repayments = updated;
        await saveData(STORAGE_KEYS.P2P_REPAYMENTS, updated);
    },

    _appendJournalEntry: async (journalEntry) => {
        const journal = await P2PService.getJournalEntries();
        // Check idempotency
        if (journal.some(j => j.idempotencyKey === journalEntry.idempotencyKey)) {
            return;
        }
        const updated = [...journal, journalEntry];
        memoryCache.journal = updated;
        await saveData(STORAGE_KEYS.P2P_JOURNAL, updated);
    }
};
