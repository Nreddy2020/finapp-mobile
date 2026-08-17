/**
 * FinLife P2P Loans — Authoritative Service & Persistence Store
 * Implements Journal-First Financial Architecture, Recoverable Operation Logging,
 * Full Lifecycle Operations (Skip, Advance, Prepayment, Mark Paid, Settlement, Reversal),
 * Person Relationship Netting, and Zero-Burn Money Flow Synchronization.
 */

import { saveData, loadData, STORAGE_KEYS } from './storage';
import {
    LOAN_DIRECTION,
    LOAN_STATUS,
    INTEREST_METHOD,
    INTEREST_ACCRUAL_BASIS,
    REPAYMENT_FREQUENCY,
    REPAYMENT_ALLOCATION,
    SCHEDULE_STATUS,
    JOURNAL_EVENT_TYPES,
    OPERATION_STATUS,
    createPerson,
    createPersonRelationship,
    createP2PLoan,
    createLoanAdvance,
    createLoanRepayment,
    createRepaymentScheduleItem,
    createJournalEntry,
    createLoanComment,
    createGuarantor,
    createLoanReminder,
    createSettlementRecord,
    createP2POperation
} from '../components/p2p/p2pDomainModel';
import {
    calculateLoanDNA,
    generateInitialSchedule,
    allocateRepayment,
    recalculateScheduleAfterPayment,
    recalculateScheduleAfterTopUp,
    skipInstallmentInSchedule,
    payInstallmentInAdvanceInSchedule,
    prepayPrincipalInSchedule,
    calculateInterestTimeline,
    calculateSettlementQuote,
    createDoubleEntryJournalForEvent,
    createReversalJournalEntry,
    rebuildP2PProjectionsFromJournal
} from '../components/p2p/p2pAccountingEngine';
import { mapP2PJournalToMoneyFlowTransactions } from '../components/p2p/p2pCashEventAdapter';

// In-Memory Fast Query Cache
let memoryCache = {
    persons: null,
    loans: null,
    advances: null,
    repayments: null,
    schedules: null,
    journal: null,
    operations: null,
    comments: null,
    guarantors: null,
    reminders: null
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
            journal: null,
            operations: null,
            comments: null,
            guarantors: null,
            reminders: null
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

    getPersonById: async (personId) => {
        const persons = await P2PService.getPersons();
        return persons.find(p => p.id === personId) || null;
    },

    getPersonRelationship: async (personId) => {
        const persons = await P2PService.getPersons();
        const loans = await P2PService.getLoans();
        const journal = await P2PService.getJournalEntries();

        const replay = rebuildP2PProjectionsFromJournal({
            journalEntries: journal,
            persons,
            loans
        });

        return replay.relationships[personId] || createPersonRelationship({ personId });
    },

    getAllPersonRelationships: async () => {
        const persons = await P2PService.getPersons();
        const loans = await P2PService.getLoans();
        const journal = await P2PService.getJournalEntries();

        const replay = rebuildP2PProjectionsFromJournal({
            journalEntries: journal,
            persons,
            loans
        });

        return replay.relationships;
    },

    // ── 2. LOANS ───────────────────────────────────────────────────────────────
    getLoans: async () => {
        if (memoryCache.loans) return memoryCache.loans;
        const loaded = await loadData(STORAGE_KEYS.P2P_LOANS, []) || [];
        memoryCache.loans = loaded;
        return loaded;
    },

    getLoanById: async (loanId) => {
        const loans = await P2PService.getLoans();
        return loans.find(l => l.id === loanId) || null;
    },

    updateLoan: async (updatedLoan) => {
        const loans = await P2PService.getLoans();
        const updated = loans.map(l => l.id === updatedLoan.id ? { ...l, ...updatedLoan, updatedAt: new Date().toISOString() } : l);
        memoryCache.loans = updated;
        await saveData(STORAGE_KEYS.P2P_LOANS, updated);
        return updatedLoan;
    },

    addLoan: async (loanData) => {
        const opId = `p2p_op_create_${Date.now()}`;
        const op = createP2POperation({ id: opId, operationType: 'CREATE_LOAN', payload: loanData });
        await P2PService._logOperation(op);

        const newLoan = createP2PLoan(loanData);

        // 1. Generate initial schedule
        const initialSchedule = generateInitialSchedule(newLoan);
        await P2PService._saveScheduleForLoan(newLoan.id, initialSchedule);

        // 2. Create initial disbursement advance record
        const initialAdvance = createLoanAdvance({
            loanId: newLoan.id,
            amount: newLoan.principal,
            date: newLoan.startDate,
            effectiveDate: newLoan.startDate,
            accountId: newLoan.accountId,
            note: 'Initial Loan Disbursement'
        });
        await P2PService._appendAdvance(initialAdvance);

        // 3. Create Double-Entry Journal Entry
        const eventType = newLoan.direction === LOAN_DIRECTION.GIVEN
            ? JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN
            : JOURNAL_EVENT_TYPES.P2P_LOAN_TAKEN;

        const journalEntry = createDoubleEntryJournalForEvent({
            eventType,
            operationId: opId,
            loan: newLoan,
            advance: initialAdvance,
            accountId: newLoan.accountId,
            date: newLoan.startDate,
            note: `Initial disbursement for Loan #${newLoan.id}`
        });
        await P2PService._appendJournalEntry(journalEntry);

        // 4. Save Loan Master Data
        const loans = await P2PService.getLoans();
        const updatedLoans = [...loans, newLoan];
        memoryCache.loans = updatedLoans;
        await saveData(STORAGE_KEYS.P2P_LOANS, updatedLoans);

        // 5. Link loan to Person
        const persons = await P2PService.getPersons();
        const person = persons.find(p => p.id === newLoan.personId);
        if (person) {
            const updatedLoanIds = Array.from(new Set([...(person.loanIds || []), newLoan.id]));
            await P2PService.updatePerson({ ...person, loanIds: updatedLoanIds });
        }

        // 6. Commit Operation & Sync Money Flow
        await P2PService._commitOperation(opId, journalEntry.id);
        await P2PService.syncMoneyFlowFromJournal();

        return newLoan;
    },

    // ── 3. ADVANCES / TOP-UPS ──────────────────────────────────────────────────
    getAdvances: async (loanId = null) => {
        if (!memoryCache.advances) {
            memoryCache.advances = await loadData(STORAGE_KEYS.P2P_ADVANCES, []) || [];
        }
        if (!loanId) return memoryCache.advances;
        return memoryCache.advances.filter(a => a.loanId === loanId);
    },

    addTopUpAdvance: async ({
        loanId,
        amount,
        date = new Date().toISOString().split('T')[0],
        effectiveDate = null,
        accountId,
        note = ''
    }) => {
        const opId = `p2p_op_topup_${Date.now()}`;
        const op = createP2POperation({ id: opId, operationType: 'TOPUP_ADVANCE', payload: { loanId, amount } });
        await P2PService._logOperation(op);

        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`Loan ${loanId} not found.`);

        const advance = createLoanAdvance({
            loanId,
            amount,
            date,
            effectiveDate: effectiveDate || date,
            accountId: accountId || loan.accountId,
            note: note || `Top-up advance of ₹${Number(amount).toLocaleString()}`
        });
        await P2PService._appendAdvance(advance);

        // Re-amortize future schedule
        const currentSchedule = await P2PService.getSchedule(loanId);
        const updatedSchedule = recalculateScheduleAfterTopUp({
            loan,
            schedule: currentSchedule,
            topUpAmount: amount,
            topUpDate: advance.effectiveDate
        });
        await P2PService._saveScheduleForLoan(loanId, updatedSchedule);

        // Journal Entry
        const eventType = loan.direction === LOAN_DIRECTION.GIVEN
            ? JOURNAL_EVENT_TYPES.P2P_ADVANCE_GIVEN
            : JOURNAL_EVENT_TYPES.P2P_ADVANCE_TAKEN;

        const journalEntry = createDoubleEntryJournalForEvent({
            eventType,
            operationId: opId,
            loan,
            advance,
            accountId: advance.accountId,
            date: advance.date,
            note: advance.note
        });
        await P2PService._appendJournalEntry(journalEntry);

        await P2PService._commitOperation(opId, journalEntry.id);
        await P2PService.syncMoneyFlowFromJournal();

        return advance;
    },

    // ── 4. REPAYMENTS & LIFECYCLE ──────────────────────────────────────────────
    getRepayments: async (loanId = null) => {
        if (!memoryCache.repayments) {
            memoryCache.repayments = await loadData(STORAGE_KEYS.P2P_REPAYMENTS, []) || [];
        }
        if (!loanId) return memoryCache.repayments;
        return memoryCache.repayments.filter(r => r.loanId === loanId);
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
        const opId = `p2p_op_repay_${Date.now()}`;
        const op = createP2POperation({ id: opId, operationType: 'RECORD_REPAYMENT', payload: { loanId, amount } });
        await P2PService._logOperation(op);

        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`Loan ${loanId} not found.`);

        const advances = await P2PService.getAdvances(loanId);
        const existingRepayments = await P2PService.getRepayments(loanId);
        const existingSchedule = await P2PService.getSchedule(loanId);

        const totalAdvanced = advances.reduce((s, a) => s + (Number(a.amount) || 0), 0) || loan.principal;
        const totalPrincipalPaid = existingRepayments.reduce((s, r) => s + (Number(r.principalComponent) || 0), 0);
        const outstandingPrincipal = Math.max(0, totalAdvanced - totalPrincipalPaid);

        // Target schedule item
        const nextScheduleItem = existingSchedule.find(s => s.id === scheduleItemId || s.status === SCHEDULE_STATUS.PENDING || s.status === SCHEDULE_STATUS.PARTIALLY_PAID || s.status === SCHEDULE_STATUS.OVERDUE);
        const unpaidAccruedInterest = nextScheduleItem ? nextScheduleItem.expectedInterest : ((outstandingPrincipal * (loan.interestRate / 100)) / 12);
        const unpaidFees = nextScheduleItem ? (nextScheduleItem.expectedFees || 0) : 0;

        // Run allocation policy
        const allocation = allocateRepayment({
            loan,
            amount,
            currentOutstandingPrincipal: outstandingPrincipal,
            unpaidAccruedInterest,
            unpaidFees,
            allocationPolicy
        });

        const repayment = createLoanRepayment({
            loanId,
            amount,
            principalComponent: allocation.principalComponent,
            interestComponent: allocation.interestComponent,
            feeComponent: allocation.feePaid,
            date,
            accountId: accountId || loan.accountId,
            note,
            scheduleItemId: nextScheduleItem?.id || scheduleItemId
        });
        await P2PService._appendRepayment(repayment);

        // Recalculate schedule with dynamic future re-amortization
        const updatedSchedule = recalculateScheduleAfterPayment({
            loan,
            existingSchedule,
            repayment,
            asOfDate: date,
            allocationPolicy
        });
        await P2PService._saveScheduleForLoan(loanId, updatedSchedule);

        // Journal Entry
        const eventType = loan.direction === LOAN_DIRECTION.GIVEN
            ? JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED
            : JOURNAL_EVENT_TYPES.P2P_REPAYMENT_PAID;

        const journalEntry = createDoubleEntryJournalForEvent({
            eventType,
            operationId: opId,
            loan,
            repayment,
            accountId: repayment.accountId,
            date: repayment.date,
            note: repayment.note
        });
        await P2PService._appendJournalEntry(journalEntry);

        // Check if loan is fully paid: Require both principal and interest <= 0.01
        if (allocation.remainingPrincipalAfter <= 0.01 && allocation.remainingInterestAfter <= 0.01) {
            await P2PService.updateLoan({ ...loan, status: LOAN_STATUS.SETTLED });
        }

        await P2PService._commitOperation(opId, journalEntry.id);
        await P2PService.syncMoneyFlowFromJournal();

        return { repayment, allocation, updatedSchedule };
    },

    skipInstallment: async ({
        loanId,
        installmentNumber = 1,
        date = new Date().toISOString().split('T')[0]
    }) => {
        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`Loan ${loanId} not found.`);

        const currentSchedule = await P2PService.getSchedule(loanId);
        const updatedSchedule = skipInstallmentInSchedule({
            loan,
            schedule: currentSchedule,
            installmentNumber,
            skipDate: date
        });
        await P2PService._saveScheduleForLoan(loanId, updatedSchedule);

        return updatedSchedule;
    },

    payInstallmentInAdvance: async ({
        loanId,
        installmentNumber = 1,
        paymentAmount = null,
        date = new Date().toISOString().split('T')[0],
        accountId
    }) => {
        const opId = `p2p_op_advance_${Date.now()}`;
        const op = createP2POperation({ id: opId, operationType: 'PAY_ADVANCE', payload: { loanId, installmentNumber } });
        await P2PService._logOperation(op);

        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`Loan ${loanId} not found.`);

        const currentSchedule = await P2PService.getSchedule(loanId);
        const item = currentSchedule.find(s => s.installmentNumber === installmentNumber || s.id === installmentNumber);
        if (!item) throw new Error(`Installment ${installmentNumber} not found.`);

        const payAmt = paymentAmount !== null ? Number(paymentAmount) : (item.expectedTotal || item.expectedAmount);
        const pComponent = item.expectedPrincipal;
        const iComponent = item.expectedInterest;

        const repayment = createLoanRepayment({
            loanId,
            amount: payAmt,
            principalComponent: pComponent,
            interestComponent: iComponent,
            date,
            accountId: accountId || loan.accountId,
            scheduleItemId: item.id,
            isAdvancePayment: true,
            note: `Advance installment #${installmentNumber} payment`
        });
        await P2PService._appendRepayment(repayment);

        const updatedSchedule = payInstallmentInAdvanceInSchedule({
            loan,
            schedule: currentSchedule,
            installmentNumber,
            paymentAmount: payAmt,
            paymentDate: date
        });
        await P2PService._saveScheduleForLoan(loanId, updatedSchedule);

        const eventType = loan.direction === LOAN_DIRECTION.GIVEN
            ? JOURNAL_EVENT_TYPES.P2P_PREPAYMENT_RECEIVED
            : JOURNAL_EVENT_TYPES.P2P_PREPAYMENT_PAID;

        const journalEntry = createDoubleEntryJournalForEvent({
            eventType,
            operationId: opId,
            loan,
            repayment,
            accountId: repayment.accountId,
            date,
            note: repayment.note
        });
        await P2PService._appendJournalEntry(journalEntry);

        await P2PService._commitOperation(opId, journalEntry.id);
        await P2PService.syncMoneyFlowFromJournal();

        return { repayment, updatedSchedule };
    },

    prepayPrincipal: async ({
        loanId,
        amount,
        date = new Date().toISOString().split('T')[0],
        accountId,
        note = ''
    }) => {
        const opId = `p2p_op_prepay_p_${Date.now()}`;
        const op = createP2POperation({ id: opId, operationType: 'PREPAY_PRINCIPAL', payload: { loanId, amount } });
        await P2PService._logOperation(op);

        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`Loan ${loanId} not found.`);

        const repayment = createLoanRepayment({
            loanId,
            amount,
            principalComponent: amount,
            interestComponent: 0,
            date,
            accountId: accountId || loan.accountId,
            isPrincipalPrepayment: true,
            note: note || `Principal prepayment of ₹${Number(amount).toLocaleString()}`
        });
        await P2PService._appendRepayment(repayment);

        const currentSchedule = await P2PService.getSchedule(loanId);
        const updatedSchedule = prepayPrincipalInSchedule({
            loan,
            schedule: currentSchedule,
            prepaymentAmount: amount,
            prepaymentDate: date
        });
        await P2PService._saveScheduleForLoan(loanId, updatedSchedule);

        const eventType = loan.direction === LOAN_DIRECTION.GIVEN
            ? JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED
            : JOURNAL_EVENT_TYPES.P2P_REPAYMENT_PAID;

        const journalEntry = createDoubleEntryJournalForEvent({
            eventType,
            operationId: opId,
            loan,
            repayment,
            accountId: repayment.accountId,
            date,
            note: repayment.note
        });
        await P2PService._appendJournalEntry(journalEntry);

        await P2PService._commitOperation(opId, journalEntry.id);
        await P2PService.syncMoneyFlowFromJournal();

        return { repayment, updatedSchedule };
    },

    markAsPaid: async ({
        loanId,
        installmentNumber = 1,
        date = new Date().toISOString().split('T')[0],
        accountId,
        isExternalAcknowledgment = false
    }) => {
        const schedule = await P2PService.getSchedule(loanId);
        const item = schedule.find(s => s.installmentNumber === installmentNumber || s.id === installmentNumber);
        if (!item) throw new Error(`Installment ${installmentNumber} not found.`);

        if (isExternalAcknowledgment) {
            // Acknowledge schedule settlement without generating double-counting cash movements
            item.status = SCHEDULE_STATUS.PAID;
            item.paidDate = date;
            item.paidAmount = item.expectedAmount;
            item.paidPrincipal = item.expectedPrincipal;
            item.paidInterest = item.expectedInterest;
            item.remainingTotal = 0;
            await P2PService._saveScheduleForLoan(loanId, schedule);
            return { item, cashGenerated: false };
        }

        // Standard payment with cash movement
        return P2PService.recordRepayment({
            loanId,
            amount: item.expectedAmount,
            date,
            accountId,
            scheduleItemId: item.id,
            note: `Installment #${installmentNumber} Marked as Paid`
        });
    },

    // ── 5. SETTLEMENT ──────────────────────────────────────────────────────────
    settleLoan: async ({
        loanId,
        waiverAmount = 0,
        date = new Date().toISOString().split('T')[0],
        accountId,
        note = ''
    }) => {
        const opId = `p2p_op_settle_${Date.now()}`;
        const op = createP2POperation({ id: opId, operationType: 'SETTLE_LOAN', payload: { loanId, waiverAmount } });
        await P2PService._logOperation(op);

        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`Loan ${loanId} not found.`);

        const advances = await P2PService.getAdvances(loanId);
        const repayments = await P2PService.getRepayments(loanId);
        const schedule = await P2PService.getSchedule(loanId);

        const quote = calculateSettlementQuote({
            loan,
            advances,
            repayments,
            schedule,
            waiverAmount,
            settlementDate: date
        });

        // Mark all future pending schedule items as CLOSED_BY_SETTLEMENT
        const updatedSchedule = schedule.map(item => {
            if (item.status === SCHEDULE_STATUS.PENDING || item.status === SCHEDULE_STATUS.PARTIALLY_PAID || item.status === SCHEDULE_STATUS.OVERDUE) {
                return { ...item, status: SCHEDULE_STATUS.CLOSED_BY_SETTLEMENT, paidDate: date };
            }
            return item;
        });
        await P2PService._saveScheduleForLoan(loanId, updatedSchedule);

        // Mark loan settled
        const updatedLoan = { ...loan, status: LOAN_STATUS.SETTLED, updatedAt: new Date().toISOString() };
        await P2PService.updateLoan(updatedLoan);

        // Generate journal entry
        const journalEntry = createDoubleEntryJournalForEvent({
            eventType: JOURNAL_EVENT_TYPES.P2P_SETTLEMENT,
            operationId: opId,
            loan: updatedLoan,
            settlement: quote,
            accountId: accountId || loan.accountId,
            date,
            note: note || `Full Settlement of Loan #${loan.id}`
        });
        await P2PService._appendJournalEntry(journalEntry);

        const settlementRecord = createSettlementRecord({
            loanId: loan.id,
            personId: loan.personId,
            settlementDate: date,
            principalOutstanding: quote.principalOutstanding,
            interestOutstanding: quote.interestOutstanding,
            feesOutstanding: quote.feesOutstanding,
            waiverAmount: quote.waiverAmount,
            finalSettlementAmount: quote.finalSettlementAmount,
            settlementAccount: accountId || loan.accountId,
            journalEntryId: journalEntry.id,
            direction: loan.direction
        });

        await P2PService._commitOperation(opId, journalEntry.id);
        await P2PService.syncMoneyFlowFromJournal();

        return { quote, updatedLoan, settlementRecord, journalEntry };
    },

    settlePersonRelationship: async ({
        personId,
        waiverAmount = 0,
        date = new Date().toISOString().split('T')[0],
        accountId = 'HDFC Savings Account',
        note = ''
    }) => {
        const opId = `p2p_op_rel_settle_${Date.now()}`;
        const op = createP2POperation({ id: opId, operationType: 'RELATIONSHIP_SETTLE', payload: { personId } });
        await P2PService._logOperation(op);

        const persons = await P2PService.getPersons();
        const person = persons.find(p => p.id === personId);
        if (!person) throw new Error(`Person ${personId} not found.`);

        const loans = await P2PService.getLoans();
        const activeLoans = loans.filter(l => l.personId === personId && l.status === LOAN_STATUS.ACTIVE);

        let grossReceivable = 0;
        let grossPayable = 0;
        const closedLoanIds = [];

        for (const l of activeLoans) {
            const adv = await P2PService.getAdvances(l.id);
            const rep = await P2PService.getRepayments(l.id);
            const sch = await P2PService.getSchedule(l.id);
            const quote = calculateSettlementQuote({ loan: l, advances: adv, repayments: rep, schedule: sch });

            if (l.direction === LOAN_DIRECTION.GIVEN) {
                grossReceivable += quote.settlementAmount;
            } else {
                grossPayable += quote.settlementAmount;
            }
            closedLoanIds.push(l.id);

            // Close loan & schedule
            await P2PService.updateLoan({ ...l, status: LOAN_STATUS.SETTLED });
            const closedSch = sch.map(s => s.status === 'PAID' ? s : { ...s, status: SCHEDULE_STATUS.CLOSED_BY_SETTLEMENT, paidDate: date });
            await P2PService._saveScheduleForLoan(l.id, closedSch);
        }

        const netBalance = grossReceivable - grossPayable;
        const finalNetCash = Math.max(0, Math.abs(netBalance) - Number(waiverAmount || 0));
        const direction = netBalance >= 0 ? LOAN_DIRECTION.GIVEN : LOAN_DIRECTION.TAKEN;

        const relSettlementData = {
            personId,
            grossReceivableClosed: grossReceivable,
            grossPayableClosed: grossPayable,
            settlementAmount: finalNetCash,
            direction,
            closedLoanIds,
            waiverAmount: Number(waiverAmount || 0)
        };

        const journalEntry = createDoubleEntryJournalForEvent({
            eventType: JOURNAL_EVENT_TYPES.RELATIONSHIP_SETTLEMENT,
            operationId: opId,
            relationshipSettlement: relSettlementData,
            accountId,
            date,
            note: note || `Relationship Settle-Up with ${person.name}`
        });
        await P2PService._appendJournalEntry(journalEntry);

        await P2PService._commitOperation(opId, journalEntry.id);
        await P2PService.syncMoneyFlowFromJournal();

        return { relSettlementData, journalEntry };
    },

    // ── 6. REVERSALS (IMMUTABLE JOURNAL REVERSAL) ──────────────────────────────
    reverseJournalEntry: async ({
        journalEntryId,
        reversalReason = 'User correction',
        reversedBy = 'FINLIFE_USER',
        date = new Date().toISOString().split('T')[0]
    }) => {
        const journal = await P2PService.getJournalEntries();
        const originalEntry = journal.find(j => j.id === journalEntryId || j.journalEntryId === journalEntryId);
        if (!originalEntry) throw new Error(`Journal entry ${journalEntryId} not found.`);

        const reversalEntry = createReversalJournalEntry({
            originalJournalEntry: originalEntry,
            reversalReason,
            reversedBy,
            date
        });
        await P2PService._appendJournalEntry(reversalEntry);

        // Replay projections
        await P2PService.rebuildAllProjections();
        await P2PService.syncMoneyFlowFromJournal();

        return reversalEntry;
    },

    // ── 7. PROJECTIONS & REBUILD ENGINE ────────────────────────────────────────
    getJournalEntries: async () => {
        if (memoryCache.journal) return memoryCache.journal;
        const loaded = await loadData(STORAGE_KEYS.P2P_JOURNAL, []) || [];
        memoryCache.journal = loaded;
        return loaded;
    },

    getOperations: async () => {
        if (memoryCache.operations) return memoryCache.operations;
        const loaded = await loadData(STORAGE_KEYS.P2P_OPERATIONS, []) || [];
        memoryCache.operations = loaded;
        return loaded;
    },

    rebuildAllProjections: async () => {
        const journal = await P2PService.getJournalEntries();
        const persons = await P2PService.getPersons();
        const loans = await P2PService.getLoans();

        return rebuildP2PProjectionsFromJournal({
            journalEntries: journal,
            persons,
            loans
        });
    },

    syncMoneyFlowFromJournal: async () => {
        const journal = await P2PService.getJournalEntries();
        const persons = await P2PService.getPersons();
        const loans = await P2PService.getLoans();

        const p2pTransactions = mapP2PJournalToMoneyFlowTransactions(journal, persons, loans);

        // Merge into STORAGE_KEYS.TRANSACTIONS with deterministic IDs
        const existingTx = await loadData(STORAGE_KEYS.TRANSACTIONS, []) || [];
        const nonP2PTx = existingTx.filter(t => !t.isP2P && !t.id?.startsWith('mf_p2p_'));

        const updatedTx = [...nonP2PTx, ...p2pTransactions];
        await saveData(STORAGE_KEYS.TRANSACTIONS, updatedTx);

        return p2pTransactions;
    },

    // ── 8. METADATA: COMMENTS, GUARANTORS, REMINDERS ───────────────────────────
    getComments: async (loanId) => {
        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        return loan?.comments || [];
    },

    addComment: async ({ loanId, text, authorId = 'user_self' }) => {
        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`Loan ${loanId} not found.`);

        const comment = createLoanComment({ loanId, text, authorId });
        const updatedComments = [...(loan.comments || []), comment];
        await P2PService.updateLoan({ ...loan, comments: updatedComments });
        return comment;
    },

    getGuarantors: async (loanId) => {
        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        return loan?.guarantors || [];
    },

    addGuarantor: async ({ loanId, name, phone = '', relationship = 'Guarantor', notes = '' }) => {
        const loans = await P2PService.getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error(`Loan ${loanId} not found.`);

        const currentGuarantors = loan.guarantors || [];
        if (currentGuarantors.length >= 2) {
            throw new Error('Maximum of 2 guarantors allowed per loan.');
        }

        const guarantor = createGuarantor({ loanId, name, phone, relationship, notes });
        const updatedGuarantors = [...currentGuarantors, guarantor];
        await P2PService.updateLoan({ ...loan, guarantors: updatedGuarantors });
        return guarantor;
    },

    getReminders: async (loanId) => {
        const allReminders = await loadData(STORAGE_KEYS.NOTIFICATIONS, []) || [];
        return allReminders.filter(r => r.loanId === loanId);
    },

    scheduleReminder: async ({ loanId, installmentId = null, dueDate, remindAt = null, channel = 'IN_APP' }) => {
        const reminder = createLoanReminder({
            loanId,
            installmentId,
            dueDate,
            remindAt: remindAt || dueDate,
            channel
        });
        const existing = await loadData(STORAGE_KEYS.NOTIFICATIONS, []) || [];
        await saveData(STORAGE_KEYS.NOTIFICATIONS, [...existing, reminder]);
        return reminder;
    },

    // ── 9. INTERNAL STORAGE HELPERS ────────────────────────────────────────────
    _appendJournalEntry: async (entry) => {
        const journal = await P2PService.getJournalEntries();
        const updated = [...journal, entry];
        memoryCache.journal = updated;
        await saveData(STORAGE_KEYS.P2P_JOURNAL, updated);
        return entry;
    },

    _appendAdvance: async (advance) => {
        const advances = await P2PService.getAdvances();
        const updated = [...advances, advance];
        memoryCache.advances = updated;
        await saveData(STORAGE_KEYS.P2P_ADVANCES, updated);
        return advance;
    },

    _appendRepayment: async (repayment) => {
        const repayments = await P2PService.getRepayments();
        const updated = [...repayments, repayment];
        memoryCache.repayments = updated;
        await saveData(STORAGE_KEYS.P2P_REPAYMENTS, updated);
        return repayment;
    },

    _loadAllSchedules: async () => {
        if (memoryCache.schedules) return memoryCache.schedules;
        const loaded = await loadData(STORAGE_KEYS.P2P_SCHEDULES, {}) || {};
        memoryCache.schedules = loaded;
        return loaded;
    },

    _saveScheduleForLoan: async (loanId, schedule) => {
        const all = await P2PService._loadAllSchedules();
        all[loanId] = schedule;
        memoryCache.schedules = all;
        await saveData(STORAGE_KEYS.P2P_SCHEDULES, all);
        return schedule;
    },

    _logOperation: async (op) => {
        const ops = await P2PService.getOperations();
        const updated = [...ops, op];
        memoryCache.operations = updated;
        await saveData(STORAGE_KEYS.P2P_OPERATIONS, updated);
    },

    _commitOperation: async (opId, journalEntryId) => {
        const ops = await P2PService.getOperations();
        const updated = ops.map(o => o.id === opId ? { ...o, status: OPERATION_STATUS.COMMITTED, journalEntryId, committedAt: new Date().toISOString() } : o);
        memoryCache.operations = updated;
        await saveData(STORAGE_KEYS.P2P_OPERATIONS, updated);
    },

    // ── 10. DEMO FIXTURE LOADER (ISOLATED DEV ACTION) ──────────────────────────
    loadDemoFixtures: async () => {
        await P2PService.resetToCleanState();

        // 1. Create Person: Kasapa Reddy Bava
        const personKasapa = await P2PService.addPerson({
            id: 'demo_person_kasapa',
            name: 'Kasapa Reddy Bava',
            phone: '+91 98480 12345',
            notes: 'Brother-in-Law with family loan accounts',
            relationship: 'Brother-in-Law',
            tags: ['Family', 'Preferred']
        });

        // 2. Loan-110 (ICICI Personal Loan - Active)
        const loan110 = await P2PService.addLoan({
            id: 'Loan-110',
            personId: personKasapa.id,
            name: 'ICICI Personal Loan',
            direction: LOAN_DIRECTION.GIVEN,
            principal: 2500000,
            interestRate: 9.99,
            interestMethod: INTEREST_METHOD.SIMPLE,
            tenureMonths: 60,
            startDate: '2026-04-06',
            accountId: 'HDFC Savings Account',
            tags: ['Personal', 'Emergency']
        });

        // Record 4 historical repayments on Loan-110
        await P2PService.recordRepayment({ loanId: loan110.id, amount: 53529.13, date: '2026-05-06', note: 'May Installment' });
        await P2PService.recordRepayment({ loanId: loan110.id, amount: 53529.13, date: '2026-06-06', note: 'June Installment' });
        await P2PService.recordRepayment({ loanId: loan110.id, amount: 53529.13, date: '2026-07-06', note: 'July Installment' });
        await P2PService.recordRepayment({ loanId: loan110.id, amount: 53529.13, date: '2026-08-06', note: 'August Installment' });

        // Add demo comment & guarantor
        await P2PService.addComment({ loanId: loan110.id, text: 'This loan is for raja 2000000, 1.5 for school fees, 3 lakhs given to Anju' });
        await P2PService.addGuarantor({ loanId: loan110.id, name: 'Srinivas Reddy', phone: '+91 98490 54321', relationship: 'Uncle' });

        // 3. Loan-85 (Taken Loan)
        const loan85 = await P2PService.addLoan({
            id: 'Loan-85',
            personId: personKasapa.id,
            name: 'Private Borrowing',
            direction: LOAN_DIRECTION.TAKEN,
            principal: 400000,
            interestRate: 8.5,
            interestMethod: INTEREST_METHOD.SIMPLE,
            tenureMonths: 12,
            startDate: '2026-06-01',
            accountId: 'SBI Savings Account'
        });

        await P2PService.syncMoneyFlowFromJournal();
        return { success: true, personKasapa, loan110, loan85 };
    },

    resetToCleanState: async () => {
        P2PService.clearMemoryCache();
        await saveData(STORAGE_KEYS.P2P_PERSONS, []);
        await saveData(STORAGE_KEYS.P2P_LOANS, []);
        await saveData(STORAGE_KEYS.P2P_ADVANCES, []);
        await saveData(STORAGE_KEYS.P2P_REPAYMENTS, []);
        await saveData(STORAGE_KEYS.P2P_SCHEDULES, {});
        await saveData(STORAGE_KEYS.P2P_JOURNAL, []);
        await saveData(STORAGE_KEYS.P2P_OPERATIONS, []);

        // Clean out P2P transactions from Money Flow
        const existingTx = await loadData(STORAGE_KEYS.TRANSACTIONS, []) || [];
        const nonP2PTx = existingTx.filter(t => !t.isP2P && !t.id?.startsWith('mf_p2p_'));
        await saveData(STORAGE_KEYS.TRANSACTIONS, nonP2PTx);
    }
};
