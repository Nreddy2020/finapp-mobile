/**
 * FinLife P2P Loans — Presentation Adapter & ViewModels
 * Computes authoritative position metrics, person aggregations, search filters, and formatting.
 */

import { LOAN_DIRECTION, LOAN_STATUS } from './p2pDomainModel.js';
import { calculateLoanDNA, calculateInterestTimeline } from './p2pAccountingEngine.js';
import { formatPaiseToINR, toBigIntPaise, rupeesToPaise, paiseToRupees } from './p2pContracts.js';
import { computePortfolioHealth, sortCounterpartiesDeterministically } from './p2pHealthEngine.js';


export function formatINR(val, compact = false) {
    const num = Number(val) || 0;
    if (compact) {
        if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
        if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
        if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
        return `₹${Math.round(num)}`;
    }
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

export function formatPrecisionINR(val) {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(val) {
    const num = Number(val) || 0;
    return `${num}%`;
}

/**
 * Computes global P2P position metrics across all loans
 */
export function computeP2POverviewMetrics(loans = [], advances = [], repayments = [], schedules = {}, asOfDate = new Date().toISOString().split('T')[0]) {
    let totalReceivablePaise = 0n;
    let totalPayablePaise = 0n;
    let upcomingReceiptsPaise = 0n;
    let upcomingPaymentsPaise = 0n;
    let overdueAmountPaise = 0n;
    let dueNext30DaysPaise = 0n;
    let activeGivenCount = 0;
    let activeTakenCount = 0;
    let settledCount = 0;
    let originalPrincipalPaise = 0n;
    let accruedInterestPaise = 0n;
    let unallocatedOverpaymentPaise = 0n;

    const safeAdvances = Array.isArray(advances) ? advances : [];
    const safeRepayments = Array.isArray(repayments) ? repayments : [];
    const safeSchedules = (schedules && typeof schedules === 'object') ? schedules : {};
    const next30Date = addDaysToDate(asOfDate, 30);
    const peopleGivenSet = new Set();
    const peopleTakenSet = new Set();
    const overdueLoansSet = new Set();

    loans.forEach(loan => {
        if (loan.status === LOAN_STATUS.CANCELLED) return;
        if (loan.status === LOAN_STATUS.SETTLED) {
            settledCount++;
            return;
        }

        const isGiven = (loan.direction === LOAN_DIRECTION.GIVEN || loan.type === 'GIVEN');
        if (isGiven) {
            activeGivenCount++;
            if (loan.personId) peopleGivenSet.add(loan.personId);
        } else {
            activeTakenCount++;
            if (loan.personId) peopleTakenSet.add(loan.personId);
        }

        const loanAdvances = safeAdvances.filter(a => a.loanId === loan.id);
        const loanRepayments = safeRepayments.filter(r => r.loanId === loan.id);
        const loanSchedule = safeSchedules[loan.id] || [];

        const totalAdvPaise = loanAdvances.reduce((s, a) => s + toBigIntPaise(a.amountPaise !== undefined ? a.amountPaise : rupeesToPaise(a.amount)), 0n) 
            || toBigIntPaise(loan.principalPaise !== undefined ? loan.principalPaise : rupeesToPaise(loan.principal));

        originalPrincipalPaise += totalAdvPaise;

        const principalPaidPaise = loanRepayments.reduce((s, r) => s + toBigIntPaise(r.principalComponentPaise !== undefined ? r.principalComponentPaise : (r.principalPaidPaise !== undefined ? r.principalPaidPaise : rupeesToPaise(r.principalComponent || r.principalPaid || 0))), 0n);

        const outstandingPrincipalPaise = loanRepayments.length > 0
            ? (totalAdvPaise > principalPaidPaise ? totalAdvPaise - principalPaidPaise : 0n)
            : (loan.outstandingPrincipalPaise !== undefined && loan.outstandingPrincipalPaise !== null
                ? toBigIntPaise(loan.outstandingPrincipalPaise)
                : (loan.outstandingPrincipal !== undefined && loan.outstandingPrincipal !== null
                    ? rupeesToPaise(loan.outstandingPrincipal)
                    : (totalAdvPaise > principalPaidPaise ? totalAdvPaise - principalPaidPaise : 0n)));

        if (loan.unallocatedOverpaymentPaise) {
            unallocatedOverpaymentPaise += toBigIntPaise(loan.unallocatedOverpaymentPaise);
        }
        if (loan.accruedInterestPaise) {
            accruedInterestPaise += toBigIntPaise(loan.accruedInterestPaise);
        }

        if (outstandingPrincipalPaise <= 0n) {
            return;
        }

        if (isGiven) {
            totalReceivablePaise += outstandingPrincipalPaise;
        } else {
            totalPayablePaise += outstandingPrincipalPaise;
        }

        // Schedule check for upcoming & overdue
        loanSchedule.forEach(item => {
            if (item.status === 'PAID') return;
            const expPaise = toBigIntPaise(item.expectedAmountPaise !== undefined ? item.expectedAmountPaise : (item.expectedTotalPaise !== undefined ? item.expectedTotalPaise : rupeesToPaise(item.expectedAmount || item.expectedTotal || 0)));
            const paidPaise = toBigIntPaise(item.paidAmountPaise !== undefined ? item.paidAmountPaise : (item.paidTotalPaise !== undefined ? item.paidTotalPaise : rupeesToPaise(item.paidAmount || item.paidTotal || 0)));
            const remainingItemPaise = expPaise > paidPaise ? expPaise - paidPaise : 0n;

            if (item.dueDate < asOfDate) {
                overdueAmountPaise += remainingItemPaise;
                overdueLoansSet.add(loan.id);
            } else if (item.dueDate <= next30Date) {
                dueNext30DaysPaise += remainingItemPaise;
                if (isGiven) {
                    upcomingReceiptsPaise += remainingItemPaise;
                } else {
                    upcomingPaymentsPaise += remainingItemPaise;
                }
            }
        });
    });

    const netPositionPaise = totalReceivablePaise - totalPayablePaise;
    const totalReceivable = paiseToRupees(totalReceivablePaise);
    const totalPayable = paiseToRupees(totalPayablePaise);
    const netPosition = paiseToRupees(netPositionPaise);
    const upcomingReceipts = paiseToRupees(upcomingReceiptsPaise);
    const upcomingPayments = paiseToRupees(upcomingPaymentsPaise);
    const overdueAmount = paiseToRupees(overdueAmountPaise);
    const dueNext30Days = paiseToRupees(dueNext30DaysPaise);

    const plainLanguageNetText = netPositionPaise > 0n 
        ? 'You are owed more than you owe' 
        : (netPositionPaise < 0n ? 'You owe more than you are owed' : 'All obligations are balanced');

    return {
        totalReceivablePaise,
        totalPayablePaise,
        originalPrincipalPaise,
        outstandingPrincipalPaise: totalReceivablePaise,
        accruedInterestPaise,
        unallocatedOverpaymentPaise,
        netPositionPaise,
        upcomingReceiptsPaise,
        upcomingPaymentsPaise,
        overdueAmountPaise,
        dueNext30DaysPaise,
        totalReceivable,
        totalReceivableFormatted: formatINR(totalReceivable, true),
        totalReceivableFullFormatted: formatINR(totalReceivable),
        totalPayable,
        totalPayableFormatted: formatINR(totalPayable, true),
        totalPayableFullFormatted: formatINR(totalPayable),
        netPosition,
        netPositionFormatted: `${netPosition >= 0 ? '+' : '-'}${formatINR(Math.abs(netPosition), true)}`,
        netPositionColor: netPosition >= 0 ? '#10B981' : '#EF4444',
        plainLanguageNetText,
        upcomingReceipts,
        upcomingReceiptsFormatted: formatINR(upcomingReceipts, true),
        upcomingPayments,
        upcomingPaymentsFormatted: formatINR(upcomingPayments, true),
        overdueAmount,
        overdueAmountFormatted: formatINR(overdueAmount),
        overdueCount: overdueLoansSet.size,
        dueNext30Days,
        dueNext30DaysFormatted: formatINR(dueNext30Days),
        activeGivenCount,
        activeTakenCount,
        peopleGivenCount: peopleGivenSet.size,
        peopleTakenCount: peopleTakenSet.size,
        settledCount,
        activePeopleCount: new Set([...peopleGivenSet, ...peopleTakenSet]).size,
        atRiskCount: overdueLoansSet.size,
        needFollowUpCount: (overdueLoansSet.size > 0 ? 1 : 0) + (dueNext30DaysPaise > 0n ? 1 : 0),
        relationshipHealthPct: (() => {
            const h = computePortfolioHealth(loans, safeRepayments, safeSchedules, asOfDate);
            return h.score !== null ? h.score : 100;
        })(),
        relationshipHealthState: (() => {
            const h = computePortfolioHealth(loans, safeRepayments, safeSchedules, asOfDate);
            return h.state;
        })(),
        relationshipHealthDisplay: (() => {
            const h = computePortfolioHealth(loans, safeRepayments, safeSchedules, asOfDate);
            return h.displayPct;
        })(),
        relationshipHealthReport: computePortfolioHealth(loans, safeRepayments, safeSchedules, asOfDate)
    };
}

export const computeP2PPositionMetrics = computeP2POverviewMetrics;
export { sortCounterpartiesDeterministically };


/**
 * Computes aggregate summary for a single Person
 */
export function computePersonP2PSummary(person, loans = [], advances = [], repayments = [], schedules = {}, asOfDate = new Date().toISOString().split('T')[0]) {
    const personLoans = loans.filter(l => l.personId === person.id);
    let totalGiven = 0;
    let totalTaken = 0;
    let totalReceived = 0;
    let totalPaid = 0;
    let netOutstanding = 0;
    let nextPayment = null;

    const subLoans = personLoans.map(loan => {
        const loanAdv = advances.filter(a => a.loanId === loan.id);
        const loanRep = repayments.filter(r => r.loanId === loan.id);
        const loanSch = schedules[loan.id] || [];

        const totalAdv = loanAdv.reduce((s, a) => s + (Number(a.amount) || 0), 0) || loan.principal;
        const pPaid = loanRep.reduce((s, r) => s + (Number(r.principalComponent || r.principalPaid) || 0), 0);
        const iPaid = loanRep.reduce((s, r) => s + (Number(r.interestComponent || r.interestPaid) || 0), 0);
        const outstandingP = loan.outstandingPrincipal !== undefined ? Number(loan.outstandingPrincipal) : Math.max(0, totalAdv - pPaid);

        if (loan.direction === LOAN_DIRECTION.GIVEN || loan.type === 'GIVEN') {
            totalGiven += totalAdv;
            totalReceived += (pPaid + iPaid);
            netOutstanding += outstandingP;
        } else {
            totalTaken += totalAdv;
            totalPaid += (pPaid + iPaid);
            netOutstanding -= outstandingP;
        }

        // Find next pending schedule item
        const nextPending = loanSch.find(s => s.status === 'PENDING' || s.status === 'PARTIALLY_PAID');
        if (nextPending && (!nextPayment || nextPending.dueDate < nextPayment.dueDate)) {
            nextPayment = {
                dueDate: nextPending.dueDate,
                expectedAmount: nextPending.expectedAmount - (nextPending.paidAmount || 0),
                loanId: loan.id
            };
        }

        const pctRepaid = totalAdv > 0 ? Math.min(100, Math.round((pPaid / totalAdv) * 100)) : 0;

        return {
            ...loan,
            totalAdvanced: totalAdv,
            principalRepaid: pPaid,
            interestRepaid: iPaid,
            outstandingPrincipal: outstandingP,
            outstandingPrincipalFormatted: formatINR(outstandingP),
            percentageRepaid: pctRepaid,
            nextPendingItem: nextPending
        };
    });

    return {
        person,
        loansCount: personLoans.length,
        subLoans,
        totalGiven,
        totalGivenFormatted: formatINR(totalGiven, true),
        totalReceived,
        totalReceivedFormatted: formatINR(totalReceived, true),
        totalTaken,
        totalTakenFormatted: formatINR(totalTaken, true),
        totalPaid,
        totalPaidFormatted: formatINR(totalPaid, true),
        netOutstanding,
        netOutstandingFormatted: formatINR(Math.abs(netOutstanding), true),
        netOutstandingColor: netOutstanding >= 0 ? '#10B981' : '#EF4444',
        nextPayment
    };
}

/**
 * Groups a list of loans by person/counterparty
 */
export function groupLoansByPerson(loans = []) {
    const map = new Map();

    loans.forEach(loan => {
        const pId = loan.personId || loan.personName || 'unknown';
        const pName = loan.personName || (loan.person ? loan.person.name : 'Unknown Counterparty');

        if (!map.has(pId)) {
            map.set(pId, {
                personId: pId,
                personName: pName,
                loans: [],
                totalPrincipal: 0,
                totalOutstanding: 0,
                activeCount: 0
            });
        }

        const group = map.get(pId);
        group.loans.push(loan);
        const p = Number(loan.principal) || 0;
        const out = loan.outstandingPrincipal !== undefined ? Number(loan.outstandingPrincipal) : p;
        group.totalPrincipal += p;
        group.totalOutstanding += out;
        if (loan.status === LOAN_STATUS.ACTIVE || !loan.status) {
            group.activeCount++;
        }
    });

    return Array.from(map.values());
}

/**
 * Filter loans by category tab (ALL, GIVEN, TAKEN, SETTLED) and search query
 */
export function filterLoans(loans = [], { category = 'ALL', searchQuery = '' } = {}) {
    let result = [...loans];

    if (category === 'GIVEN') {
        result = result.filter(l => (l.direction === 'GIVEN' || l.type === 'GIVEN') && l.status !== 'SETTLED');
    } else if (category === 'TAKEN') {
        result = result.filter(l => (l.direction === 'TAKEN' || l.type === 'TAKEN') && l.status !== 'SETTLED');
    } else if (category === 'SETTLED') {
        result = result.filter(l => l.status === 'SETTLED');
    }

    if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        result = result.filter(l => {
            const name = (l.personName || (l.person && l.person.name) || '').toLowerCase();
            const loanName = (l.name || l.id || '').toLowerCase();
            const notes = (l.notes || '').toLowerCase();
            return name.includes(query) || loanName.includes(query) || notes.includes(query);
        });
    }

    return result;
}

function addDaysToDate(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}
