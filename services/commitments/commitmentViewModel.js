/**
 * services/commitments/commitmentViewModel.js
 * 
 * Presentation Adapter for Recurring Commitments & Liabilities.
 * 
 * Invariants:
 * - UI contains ZERO financial arithmetic.
 * - All calculations are performed by commitmentCalculator.
 * - All currency amounts are formatted into human-readable INR strings.
 * - Groups and filters items into presentation-ready collections.
 */

import {
    CommitmentType,
    FinancialNature,
    RecurrenceFrequency,
    CommitmentStatus,
    PaymentOccurrenceStatus,
    formatMoneyPaise,
    moneyToRupees,
    moneyToBigInt
} from './commitmentContracts.js';
import {
    normalizeToMonthlyPaise,
    normalizeToYearlyPaise,
    computeCommitmentMetrics
} from './commitmentCalculator.js';

export const FilterPill = Object.freeze({
    ALL: 'All',
    SUBSCRIPTIONS: 'Subscriptions',
    LOANS: 'Loans',
    BILLS: 'Bills',
    ANNUAL: 'Annual'
});

export const CommitmentFilterPill = FilterPill;

export const PeriodFilter = Object.freeze({
    THIS_MONTH: 'This Month',
    NEXT_MONTH: 'Next Month',
    NEXT_3_MONTHS: 'Next 3 Months',
    THIS_YEAR: 'This Year'
});

/**
 * Maps commitment type to UI theme color and icon identifier
 */
export function getCommitmentVisualMeta(commitment) {
    const nameLower = (commitment.name || '').toLowerCase();
    
    // Brand overrides
    if (nameLower.includes('netflix')) {
        return { icon: 'netflix', color: '#E50914', bg: '#E5091415' };
    }
    if (nameLower.includes('spotify')) {
        return { icon: 'spotify', color: '#1DB954', bg: '#1DB95415' };
    }
    if (nameLower.includes('internet') || nameLower.includes('wifi')) {
        return { icon: 'wifi', color: '#8B5CF6', bg: '#8B5CF615' };
    }
    if (nameLower.includes('maintenance') || nameLower.includes('apartment')) {
        return { icon: 'building', color: '#EC4899', bg: '#EC489915' };
    }
    if (nameLower.includes('loan') || nameLower.includes('emi')) {
        return { icon: 'landmark', color: '#10B981', bg: '#10B98115' };
    }
    if (nameLower.includes('insurance')) {
        return { icon: 'shield', color: '#3B82F6', bg: '#3B82F615' };
    }
    if (nameLower.includes('school') || nameLower.includes('tuition') || nameLower.includes('college')) {
        return { icon: 'graduation', color: '#F59E0B', bg: '#F59E0B15' };
    }

    // Fallback by type
    switch (commitment.type) {
        case CommitmentType.SUBSCRIPTION:
            return { icon: 'repeat', color: '#EC4899', bg: '#EC489915' };
        case CommitmentType.LOAN_EMI:
            return { icon: 'landmark', color: '#10B981', bg: '#10B98115' };
        case CommitmentType.UTILITY_BILL:
            return { icon: 'zap', color: '#8B5CF6', bg: '#8B5CF615' };
        case CommitmentType.INSURANCE:
            return { icon: 'shield', color: '#3B82F6', bg: '#3B82F615' };
        case CommitmentType.EDUCATION:
            return { icon: 'graduation', color: '#F59E0B', bg: '#F59E0B15' };
        case CommitmentType.MEMBERSHIP:
            return { icon: 'users', color: '#06B6D4', bg: '#06B6D415' };
        case CommitmentType.INVESTMENT_SIP:
            return { icon: 'trending-up', color: '#10B981', bg: '#10B98115' };
        default:
            return { icon: 'credit-card', color: '#71717A', bg: '#71717A15' };
    }
}

/**
 * Builds the unified ViewModel for the Recurring Commitments screen.
 */
export function buildRecurringCommitmentsViewModel({
    commitments = [],
    occurrences = [],
    asOfDate = '2026-09-04',
    activeFilter = FilterPill.ALL,
    periodFilter = PeriodFilter.THIS_MONTH,
    appMode = 'PRODUCTION'
}) {
    // 1. Calculate domain metrics
    const metrics = computeCommitmentMetrics(commitments, occurrences, asOfDate);

    // Compute nature breakdown percentages safely via BigInt
    const totalMonthlyBigInt = moneyToBigInt(metrics.monthlyCommitted);
    let expensePct = 0;
    let debtPct = 0;
    let investPct = 0;
    const natureObj = metrics.breakdownByNature || metrics.byNature || {};
    if (totalMonthlyBigInt > 0n) {
        const expBig = natureObj.expense ? moneyToBigInt(natureObj.expense) : 0n;
        const debtBig = natureObj.debt ? moneyToBigInt(natureObj.debt) : 0n;
        expensePct = Math.round(Number((expBig * 100n) / totalMonthlyBigInt));
        debtPct = Math.round(Number((debtBig * 100n) / totalMonthlyBigInt));
        investPct = Math.max(0, 100 - expensePct - debtPct);
    }

    // 2. Format Hero Card Metrics (supporting both nomenclature conventions)
    const heroVM = {
        appMode,
        monthlyObligationFormatted: formatMoneyPaise(metrics.monthlyCommitted),
        monthlyCommittedFormatted: formatMoneyPaise(metrics.monthlyCommitted),
        annualRunRateFormatted: formatMoneyPaise(metrics.yearlyCommitted),
        yearlyCommittedFormatted: formatMoneyPaise(metrics.yearlyCommitted),
        dueThisMonthFormatted: formatMoneyPaise(metrics.dueInPeriod),
        overdueTotalFormatted: formatMoneyPaise(metrics.overdue),
        overdueFormatted: formatMoneyPaise(metrics.overdue),
        activeCountLabel: `${metrics.activeCount} Active Commitments`,
        totalActiveCount: metrics.activeCount,
        hasOverdue: metrics.overdue.paise !== '0',
        breakdownPercentages: {
            expense: expensePct,
            debt: debtPct,
            investment: investPct
        },
        nextDueFormatted: metrics.nextDue ? {
            name: metrics.nextDue.name,
            amountFormatted: formatMoneyPaise(metrics.nextDue.amount),
            daysRemainingLabel: metrics.nextDue.daysRemaining === 0 ? 'Today' :
                metrics.nextDue.daysRemaining === 1 ? 'in 1 day' :
                `in ${metrics.nextDue.daysRemaining} days`,
            scheduledDate: metrics.nextDue.scheduledDate
        } : {
            name: 'None',
            amountFormatted: '₹0',
            daysRemainingLabel: 'No dues',
            scheduledDate: ''
        }
    };

    // 3. Compute Filter Counts
    const activeList = commitments.filter(c => c.status === CommitmentStatus.ACTIVE);
    const filterCounts = {
        all: activeList.length,
        subscriptions: activeList.filter(c => c.type === CommitmentType.SUBSCRIPTION).length,
        loans: activeList.filter(c => c.type === CommitmentType.LOAN_EMI).length,
        bills: activeList.filter(c => c.type === CommitmentType.UTILITY_BILL || c.type === CommitmentType.RENT).length,
        annual: activeList.filter(c => c.frequency === RecurrenceFrequency.YEARLY).length
    };

    // 4. Filter active commitments by Pill
    let filteredCommitments = activeList;
    if (activeFilter === FilterPill.SUBSCRIPTIONS) {
        filteredCommitments = filteredCommitments.filter(c => c.type === CommitmentType.SUBSCRIPTION);
    } else if (activeFilter === FilterPill.LOANS) {
        filteredCommitments = filteredCommitments.filter(c => c.type === CommitmentType.LOAN_EMI);
    } else if (activeFilter === FilterPill.BILLS) {
        filteredCommitments = filteredCommitments.filter(c => c.type === CommitmentType.UTILITY_BILL || c.type === CommitmentType.RENT);
    } else if (activeFilter === FilterPill.ANNUAL) {
        filteredCommitments = filteredCommitments.filter(c => c.frequency === RecurrenceFrequency.YEARLY);
    }

    // 5. Adapt Active Commitments list
    const activeCommitmentsVM = filteredCommitments.map(c => {
        const visual = getCommitmentVisualMeta(c);
        const monthlyPaise = normalizeToMonthlyPaise(c.amount, c.frequency);
        const frequencyLabel = c.frequency === RecurrenceFrequency.YEARLY ? 'year' :
            c.frequency === RecurrenceFrequency.QUARTERLY ? 'quarter' :
            c.frequency === RecurrenceFrequency.WEEKLY ? 'week' : 'month';

        const displayAmountFormatted = formatMoneyPaise(c.amount);
        const normalizedMonthlyFormatted = formatMoneyPaise(monthlyPaise);

        // Progress bar percentage
        let progressPercent = 35;
        if (c.type === CommitmentType.LOAN_EMI) {
            progressPercent = 45;
        } else {
            const dayNum = parseInt((asOfDate.split('-')[2] || '1'), 10);
            progressPercent = Math.min(100, Math.round((dayNum / 30) * 100));
        }

        const normalizedMonthlyNote = c.frequency !== RecurrenceFrequency.MONTHLY
            ? `(${normalizedMonthlyFormatted}/mo)`
            : null;

        return {
            id: c.id,
            name: c.name,
            type: c.type,
            category: c.category,
            financialNature: c.financialNature,
            amountMode: c.amountMode,
            visual,
            visualMeta: visual,
            frequency: c.frequency,
            frequencyLabel: c.frequency,
            frequencyBadge: `${displayAmountFormatted} / ${frequencyLabel}`,
            amount: c.amount,
            amountFormatted: displayAmountFormatted,
            nextDueDate: c.nextDueDate,
            nextDueDateFormatted: c.nextDueDate,
            normalizedMonthlyFormatted,
            normalizedMonthlyNote,
            isNormalizedDifferent: c.frequency !== RecurrenceFrequency.MONTHLY,
            progressPercent,
            status: c.status,
            rawCommitment: c
        };
    });

    // 6. Adapt Upcoming list (Earliest unpaid upcoming occurrences)
    const upcomingOccurrences = occurrences
        .filter(o => o.status === PaymentOccurrenceStatus.UPCOMING && o.scheduledDate >= asOfDate)
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
        .slice(0, 8);

    const upcomingVM = upcomingOccurrences.map(occ => {
        const matchingCommitment = commitments.find(c => c.id === occ.commitmentId) || {};
        const visual = getCommitmentVisualMeta({ ...matchingCommitment, name: occ.commitmentName });
        
        const diffDays = Math.ceil((new Date(occ.scheduledDate).getTime() - new Date(asOfDate).getTime()) / (1000 * 60 * 60 * 24));
        const dueInLabel = diffDays === 0 ? 'Due Today'
            : diffDays === 1 ? 'Due Tomorrow'
            : `Due in ${diffDays} days`;

        // Format date string e.g. "15 Aug 2026"
        const parts = occ.scheduledDate.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;

        return {
            id: occ.id,
            commitmentId: occ.commitmentId,
            commitmentName: occ.commitmentName,
            name: occ.commitmentName,
            visual,
            visualMeta: visual,
            dueLabel: dueInLabel,
            dueInLabel,
            formattedDate,
            scheduledDate: occ.scheduledDate,
            scheduledDateFormatted: formattedDate,
            isOverdue: false,
            subtitle: `${dueInLabel} • ${formattedDate}`,
            expectedAmount: occ.expectedAmount,
            amountFormatted: formatMoneyPaise(occ.expectedAmount),
            rawOccurrence: occ
        };
    });

    // 7. Adapt Overdue list
    const overdueOccurrences = occurrences
        .filter(o => o.status === PaymentOccurrenceStatus.OVERDUE || (o.status === PaymentOccurrenceStatus.UPCOMING && o.scheduledDate < asOfDate))
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

    const overdueVM = overdueOccurrences.map(occ => {
        const matchingCommitment = commitments.find(c => c.id === occ.commitmentId) || {};
        const visual = getCommitmentVisualMeta({ ...matchingCommitment, name: occ.commitmentName });
        const diffDays = Math.ceil((new Date(asOfDate).getTime() - new Date(occ.scheduledDate).getTime()) / (1000 * 60 * 60 * 24));
        const dueInLabel = `Overdue by ${Math.abs(diffDays)} days`;

        const parts = occ.scheduledDate.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;

        return {
            id: occ.id,
            commitmentId: occ.commitmentId,
            commitmentName: occ.commitmentName,
            name: occ.commitmentName,
            visual,
            visualMeta: visual,
            dueLabel: dueInLabel,
            dueInLabel,
            formattedDate,
            scheduledDate: occ.scheduledDate,
            scheduledDateFormatted: formattedDate,
            isOverdue: true,
            subtitle: `${dueInLabel} • ${formattedDate}`,
            expectedAmount: occ.expectedAmount,
            amountFormatted: formatMoneyPaise(occ.expectedAmount),
            rawOccurrence: occ
        };
    });

    return {
        hero: heroVM,
        activeFilter,
        periodFilter,
        upcoming: upcomingVM,
        upcomingOccurrences: upcomingVM,
        overdue: overdueVM,
        overdueOccurrences: overdueVM,
        activeCommitments: activeCommitmentsVM,
        filterCounts,
        isEmpty: commitments.length === 0
    };
}
