/**
 * FinLife Banking Relationship Intelligence — Presentation & Intelligence Adapter
 * 
 * Computes presentation-ready ViewModels, scorecards, relationship health scores,
 * relationship graphs, CFO insights, and Indian currency formatters.
 */

import { fromPaise } from './bankingDomainModel.js';
import { calculatePrepaymentIntelligence } from './bankingAccountingEngine.js';

// ── CURRENCY FORMATTING ──────────────────────────────────────────────────────

export function formatINR(amount, compact = false) {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    const num = Math.abs(Number(amount));
    const sign = Number(amount) < 0 ? '-' : '';

    if (compact) {
        if (num >= 10000000) {
            const cr = (num / 10000000).toFixed(2);
            return `${sign}₹${cr.endsWith('.00') ? cr.slice(0, -3) : cr}Cr`;
        }
        if (num >= 100000) {
            const l = (num / 100000).toFixed(2);
            return `${sign}₹${l.endsWith('.00') ? l.slice(0, -3) : l}L`;
        }
        if (num >= 1000) {
            const k = (num / 1000).toFixed(1);
            return `${sign}₹${k.endsWith('.0') ? k.slice(0, -2) : k}K`;
        }
    }

    const parts = num.toFixed(0).split('.');
    let intPart = parts[0];
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    if (otherNumbers !== '') {
        intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    } else {
        intPart = lastThree;
    }

    return `${sign}₹${intPart}`;
}

export function formatPrecisionINR(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
    const num = Math.abs(Number(amount));
    const sign = Number(amount) < 0 ? '-' : '';
    const parts = num.toFixed(2).split('.');
    let intPart = parts[0];
    const decimalPart = parts[1];
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    if (otherNumbers !== '') {
        intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    } else {
        intPart = lastThree;
    }
    return `${sign}₹${intPart}.${decimalPart}`;
}

export function formatPaise(paise, compact = false) {
    return formatINR(fromPaise(paise), compact);
}

// ── BANK RELATIONSHIP HEALTH SCORING ENGINE ─────────────────────────────────

/**
 * Computes transparent, explainable Relationship Health (0 - 100) for a bank.
 * Derived from 5 mathematical factors:
 * 1. Liquidity Coverage (Cash vs next 90-day obligations)
 * 2. Net Position / Debt-to-Cash Ratio
 * 3. Overdue / Delinquency Status
 * 4. Cost of Debt (Interest Rate burden)
 * 5. Prepayment Optimization Potential
 */
export function computeBankRelationshipHealth({
    bank,
    accounts = [],
    loans = [],
    projection = null,
    asOfDate = new Date().toISOString().split('T')[0]
}) {
    if (!bank) return null;

    const accProj = projection?.accounts || {};
    const loanProj = projection?.loans || {};
    const schProj = projection?.schedules || {};

    const bAccounts = accounts.filter(a => a.bankId === bank.id);
    const bLoans = loans.filter(l => l.bankId === bank.id);

    const totalCashPaise = bAccounts.reduce((sum, a) => {
        const p = accProj[a.id];
        return sum + (p ? Math.max(0, p.ledgerBalancePaise) : a.openingBalancePaise);
    }, 0);

    const activeLoans = bLoans.filter(l => {
        const lp = loanProj[l.id];
        return (lp ? lp.status : l.status) === 'ACTIVE';
    });

    const totalDebtPaise = activeLoans.reduce((sum, l) => {
        const lp = loanProj[l.id];
        return sum + (lp ? lp.outstandingPrincipalPaise : l.originalPrincipalPaise);
    }, 0);

    // Factor 1: Liquidity Coverage (next 90 days)
    const next90Date = new Date(new Date(asOfDate).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let obligations90DaysPaise = 0;
    let overduePaise = 0;

    activeLoans.forEach(l => {
        const sch = schProj[l.id] || [];
        sch.forEach(item => {
            if (item.status === 'PAID' || item.status === 'CLOSED_BY_SETTLEMENT') return;
            const remaining = Math.max(0, item.expectedTotalPaise - item.paidTotalPaise);
            if (item.dueDate < asOfDate) overduePaise += remaining;
            else if (item.dueDate <= next90Date) obligations90DaysPaise += remaining;
        });
    });

    const totalObligationsPaise = obligations90DaysPaise + overduePaise;
    const coverageRatio = totalObligationsPaise > 0 ? (totalCashPaise / totalObligationsPaise) : 10;

    let liquidityPoints = 25;
    let liquidityStatus = 'Strong';
    if (overduePaise > 0) {
        liquidityPoints = 5;
        liquidityStatus = 'Overdue Risk';
    } else if (coverageRatio >= 3.0) {
        liquidityPoints = 25;
        liquidityStatus = 'Strong';
    } else if (coverageRatio >= 1.0) {
        liquidityPoints = 18;
        liquidityStatus = 'Adequate';
    } else {
        liquidityPoints = 10;
        liquidityStatus = 'Tight';
    }

    // Factor 2: Net Position Balance
    let positionPoints = 25;
    let positionStatus = 'Strong';
    if (totalDebtPaise === 0) {
        positionPoints = 25;
        positionStatus = 'Zero Debt';
    } else if (totalCashPaise >= totalDebtPaise) {
        positionPoints = 25;
        positionStatus = 'Net Positive';
    } else if (totalCashPaise >= totalDebtPaise * 0.5) {
        positionPoints = 18;
        positionStatus = 'Moderate Leverage';
    } else {
        positionPoints = 12;
        positionStatus = 'High Leverage';
    }

    // Factor 3: Cost of Debt
    let costPoints = 25;
    let costStatus = 'Low Cost';
    const highestRate = activeLoans.reduce((max, l) => Math.max(max, l.interestRate || 0), 0);
    if (activeLoans.length === 0) {
        costPoints = 25;
        costStatus = 'No Debt';
    } else if (highestRate <= 8.5) {
        costPoints = 25;
        costStatus = 'Competitive (≤ 8.5%)';
    } else if (highestRate <= 11.0) {
        costPoints = 20;
        costStatus = 'Moderate (8.5% - 11%)';
    } else {
        costPoints = 12;
        costStatus = 'High Cost (> 11%)';
    }

    // Factor 4: Prepayment Potential & Progress
    let prepayPoints = 25;
    let prepayStatus = 'High Potential';
    if (activeLoans.length === 0) {
        prepayPoints = 25;
        prepayStatus = 'Optimal';
    } else if (totalCashPaise > 20000000 && highestRate >= 9.5) {
        prepayPoints = 22;
        prepayStatus = 'High Saving Opportunity';
    } else {
        prepayPoints = 20;
        prepayStatus = 'Normal';
    }

    const totalScore = Math.min(100, Math.max(0, liquidityPoints + positionPoints + costPoints + prepayPoints));

    const explanations = [
        `Cash held with ${bank.name} is ${formatPaise(totalCashPaise, true)} against 90-day EMI commitments of ${formatPaise(totalObligationsPaise, true)} (${coverageRatio.toFixed(1)}× coverage).`,
        totalDebtPaise > 0
            ? `Net position is ${totalCashPaise >= totalDebtPaise ? '+' : '-'}${formatPaise(Math.abs(totalCashPaise - totalDebtPaise), true)} with highest loan rate at ${highestRate}% p.a.`
            : `Zero outstanding debt owed to ${bank.name}.`,
        overduePaise > 0
            ? `⚠️ Warning: ${formatPaise(overduePaise)} in overdue obligations detected.`
            : `All past obligations with ${bank.name} are in good standing.`
    ];

    return {
        score: totalScore,
        grade: totalScore >= 80 ? 'A' : (totalScore >= 65 ? 'B' : 'C'),
        rating: totalScore >= 80 ? 'Strong' : (totalScore >= 65 ? 'Moderate' : 'Attention'),
        liquidityStatus,
        positionStatus,
        costStatus,
        prepayStatus,
        factors: {
            liquidityScore: liquidityPoints,
            leverageScore: positionPoints,
            costScore: costPoints,
            delinquencyScore: overduePaise > 0 ? 0 : 20,
            prepayScore: prepayPoints
        },
        coverageRatio: Number(coverageRatio.toFixed(1)),
        explanations
    };
}

// ── BANKING OVERVIEW & RELATIONSHIP METRICS ──────────────────────────────────

/**
 * Computes high-level calm decision intelligence for the Banking Hub
 */
export function computeBankingOverviewMetrics({
    banks = [],
    accounts = [],
    loans = [],
    projection = null,
    asOfDate = new Date().toISOString().split('T')[0]
}) {
    const accProj = projection?.accounts || {};
    const loanProj = projection?.loans || {};
    const schProj = projection?.schedules || {};

    // 1. Total Cash Available Across All Banks
    let totalCashPaise = 0;
    Object.values(accProj).forEach(a => {
        totalCashPaise += Math.max(0, a.ledgerBalancePaise);
    });

    // 2. Total Bank Debt Owed & Next Scheduled EMI
    let totalDebtPaise = 0;
    let totalMonthlyEMIPaise = 0;
    let totalMonthlyPrincipalPaise = 0;
    let totalMonthlyInterestPaise = 0;
    let nextImmediateObligation = null;

    const activeLoans = Object.values(loanProj).filter(l => l.status === 'ACTIVE');

    activeLoans.forEach(l => {
        totalDebtPaise += l.outstandingPrincipalPaise;

        const sch = schProj[l.loanId] || [];
        const nextPending = sch.find(s => s.status === 'PENDING' || s.status === 'PARTIALLY_PAID' || s.status === 'DUE' || s.status === 'OVERDUE');
        if (nextPending) {
            totalMonthlyEMIPaise += nextPending.expectedTotalPaise;
            totalMonthlyPrincipalPaise += nextPending.expectedPrincipalPaise;
            totalMonthlyInterestPaise += nextPending.expectedInterestPaise;

            if (!nextImmediateObligation || nextPending.dueDate < nextImmediateObligation.dueDate) {
                const b = banks.find(bk => bk.id === l.bankId);
                const daysRemaining = Math.max(0, Math.ceil((new Date(nextPending.dueDate).getTime() - new Date(asOfDate).getTime()) / (1000 * 60 * 60 * 24)));
                nextImmediateObligation = {
                    loanId: l.loanId,
                    loanName: l.loanName,
                    bankName: b?.name || 'Bank',
                    dueDate: nextPending.dueDate,
                    daysRemaining,
                    expectedTotalPaise: nextPending.expectedTotalPaise,
                    expectedPrincipalPaise: nextPending.expectedPrincipalPaise,
                    expectedInterestPaise: nextPending.expectedInterestPaise,
                    expectedTotalFormatted: formatPaise(nextPending.expectedTotalPaise),
                    installmentNumber: nextPending.installmentNumber
                };
            }
        }
    });

    const netPositionPaise = totalCashPaise - totalDebtPaise;

    // 3. Next 30-Day Obligations & Cash Pressure
    const next30Date = new Date(new Date(asOfDate).getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let obligationsNext30DaysPaise = 0;
    let overdueObligationsPaise = 0;

    Object.keys(schProj).forEach(loanId => {
        const sch = schProj[loanId] || [];
        sch.forEach(item => {
            if (item.status === 'PAID' || item.status === 'CLOSED_BY_SETTLEMENT') return;
            const remainingItemPaise = Math.max(0, item.expectedTotalPaise - item.paidTotalPaise);

            if (item.dueDate < asOfDate) {
                overdueObligationsPaise += remainingItemPaise;
            } else if (item.dueDate <= next30Date) {
                obligationsNext30DaysPaise += remainingItemPaise;
            }
        });
    });

    const totalUpcomingObligationsPaise = obligationsNext30DaysPaise + overdueObligationsPaise;
    const projectedSurplusPaise = totalCashPaise - totalUpcomingObligationsPaise;

    // 4. Cost of Debt Analytics & Highest Cost Bank
    let weightedRateSum = 0;
    let highestRateLoan = null;

    activeLoans.forEach(l => {
        weightedRateSum += (l.outstandingPrincipalPaise * (l.interestRate || 0));
        if (!highestRateLoan || (l.interestRate || 0) > (highestRateLoan.interestRate || 0)) {
            highestRateLoan = l;
        }
    });

    const averageEffectiveRate = totalDebtPaise > 0
        ? Number((weightedRateSum / totalDebtPaise).toFixed(2))
        : 0;

    // 5. Dynamic Prepayment Decision Recommendation (Never Hardcoded!)
    let dynamicPrepaymentOpportunity = null;
    if (highestRateLoan && highestRateLoan.outstandingPrincipalPaise > 0) {
        const samplePrepayPaise = Math.min(10000000, highestRateLoan.outstandingPrincipalPaise); // ₹1L or full balance
        const sim = calculatePrepaymentIntelligence({
            outstandingPrincipalPaise: highestRateLoan.outstandingPrincipalPaise,
            annualRate: highestRateLoan.interestRate,
            remainingTenureMonths: highestRateLoan.tenureMonths,
            contractualEMIPaise: nextImmediateObligation?.expectedTotalPaise || 5000000,
            prepaymentAmountPaise: samplePrepayPaise,
            prepaymentPenaltyPct: 0
        });

        if (sim && sim.valid && sim.optionA) {
            dynamicPrepaymentOpportunity = {
                loanName: highestRateLoan.loanName,
                prepaymentAmountPaise: samplePrepayPaise,
                prepaymentAmountFormatted: formatPaise(samplePrepayPaise, true),
                grossInterestSavedPaise: sim.optionA.grossInterestSavedPaise,
                netBenefitPaise: sim.optionA.netBenefitPaise,
                netBenefitFormatted: formatPaise(sim.optionA.netBenefitPaise),
                monthsSaved: sim.optionA.monthsSaved,
                explanation: `Your ${highestRateLoan.loanName} costs ${highestRateLoan.interestRate}% p.a. Prepaying ${formatPaise(samplePrepayPaise, true)} principal reduces the balance before future compound interest accrues.`
            };
        }
    }

    // 6. Bank Relationship Cards (Primary Objects)
    const bankRelationships = banks.map(b => {
        const bLoans = activeLoans.filter(l => l.bankId === b.id);
        const bAccs = Object.values(accProj).filter(a => a.bankId === b.id);

        const bDebtPaise = bLoans.reduce((s, l) => s + l.outstandingPrincipalPaise, 0);
        const bCashPaise = bAccs.reduce((s, a) => s + a.ledgerBalancePaise, 0);

        let bNextEMI = null;
        bLoans.forEach(l => {
            const sch = schProj[l.loanId] || [];
            const nextP = sch.find(s => s.status === 'PENDING' || s.status === 'PARTIALLY_PAID' || s.status === 'DUE');
            if (nextP && (!bNextEMI || nextP.dueDate < bNextEMI.dueDate)) {
                const days = Math.max(0, Math.ceil((new Date(nextP.dueDate).getTime() - new Date(asOfDate).getTime()) / (1000 * 60 * 60 * 24)));
                bNextEMI = {
                    dueDate: nextP.dueDate,
                    daysRemaining: days,
                    amountPaise: nextP.expectedTotalPaise,
                    amountFormatted: formatPaise(nextP.expectedTotalPaise)
                };
            }
        });

        const health = computeBankRelationshipHealth({
            bank: b,
            accounts,
            loans,
            projection,
            asOfDate
        });

        return {
            bankId: b.id,
            bankName: b.name,
            shortName: b.shortName,
            type: b.type,
            relationshipStatus: b.relationshipStatus,
            totalCashPaise: bCashPaise,
            totalDebtPaise: bDebtPaise,
            netPositionPaise: bCashPaise - bDebtPaise,
            totalCashFormatted: formatPaise(bCashPaise, true),
            totalDebtFormatted: formatPaise(bDebtPaise, true),
            netPositionFormatted: formatPaise(Math.abs(bCashPaise - bDebtPaise), true),
            isNetPositive: (bCashPaise - bDebtPaise) >= 0,
            nextEMI: bNextEMI,
            health,
            accountsCount: bAccs.length,
            loansCount: bLoans.length
        };
    });

    return {
        totalCashPaise,
        totalCashFormatted: formatPaise(totalCashPaise, true),
        totalCashPrecise: formatPaise(totalCashPaise),

        totalDebtPaise,
        totalDebtFormatted: formatPaise(totalDebtPaise, true),
        totalDebtPrecise: formatPaise(totalDebtPaise),

        netPositionPaise,
        netPositionFormatted: formatPaise(Math.abs(netPositionPaise), true),
        netPositionPrecise: formatPaise(Math.abs(netPositionPaise)),
        isNetPositive: netPositionPaise >= 0,

        totalMonthlyEMIPaise,
        totalMonthlyEMIFormatted: formatPaise(totalMonthlyEMIPaise),
        totalMonthlyPrincipalPaise,
        totalMonthlyPrincipalFormatted: formatPaise(totalMonthlyPrincipalPaise),
        totalMonthlyInterestPaise,
        totalMonthlyInterestFormatted: formatPaise(totalMonthlyInterestPaise),

        nextImmediateObligation,
        obligationsNext30DaysPaise,
        obligationsNext30DaysFormatted: formatPaise(totalUpcomingObligationsPaise, true),
        projectedSurplusPaise,
        projectedSurplusFormatted: formatPaise(projectedSurplusPaise, true),

        averageEffectiveRate,
        highestCostLoan: highestRateLoan,
        dynamicPrepaymentOpportunity,
        bankRelationships,
        activeBanksCount: banks.length,
        activeAccountsCount: accounts.length,
        activeLoansCount: activeLoans.length
    };
}

// ── BANK RELATIONSHIP SCORECARD & PROFILE ────────────────────────────────────

/**
 * Computes relationship profile data for a single bank drilldown
 */
export function computeBankRelationshipScorecard({
    bank,
    accounts = [],
    loans = [],
    projection = null,
    asOfDate = new Date().toISOString().split('T')[0]
}) {
    if (!bank) return null;

    const accProj = projection?.accounts || {};
    const loanProj = projection?.loans || {};
    const schProj = projection?.schedules || {};

    const bAccounts = accounts.filter(a => a.bankId === bank.id).map(a => {
        const proj = accProj[a.id] || {};
        const bal = proj.ledgerBalancePaise !== undefined ? proj.ledgerBalancePaise : a.openingBalancePaise;
        return {
            ...a,
            ledgerBalancePaise: bal,
            ledgerBalanceFormatted: formatPaise(bal, true),
            ledgerBalancePrecise: formatPaise(bal)
        };
    });

    const bLoans = loans.filter(l => l.bankId === bank.id).map(l => {
        const proj = loanProj[l.id] || {};
        const outP = proj.outstandingPrincipalPaise !== undefined ? proj.outstandingPrincipalPaise : l.originalPrincipalPaise;
        const paidP = proj.principalPaidPaise || 0;
        const paidI = proj.interestPaidPaise || 0;

        const sch = schProj[l.id] || [];
        const nextPending = sch.find(s => s.status === 'PENDING' || s.status === 'PARTIALLY_PAID' || s.status === 'DUE');
        const remainingSchedule = sch.filter(s => s.status !== 'PAID' && s.status !== 'CLOSED_BY_SETTLEMENT');

        const pctRepaid = l.originalPrincipalPaise > 0
            ? Math.min(100, Math.round((paidP / l.originalPrincipalPaise) * 100))
            : 0;

        return {
            ...l,
            outstandingPrincipalPaise: outP,
            outstandingPrincipalFormatted: formatPaise(outP, true),
            outstandingPrincipalPrecise: formatPaise(outP),
            principalPaidPaise: paidP,
            interestPaidPaise: paidI,
            principalPaidFormatted: formatPaise(paidP, true),
            interestPaidFormatted: formatPaise(paidI, true),
            percentageRepaid: pctRepaid,
            remainingMonths: remainingSchedule.length,
            nextPendingItem: nextPending
        };
    });

    const totalCashPaise = bAccounts.reduce((s, a) => s + a.ledgerBalancePaise, 0);
    const totalDebtPaise = bLoans.filter(l => l.status === 'ACTIVE').reduce((s, l) => s + l.outstandingPrincipalPaise, 0);
    const netPositionPaise = totalCashPaise - totalDebtPaise;

    let monthlyEMIPaise = 0;
    let monthlyPrincipalPaise = 0;
    let monthlyInterestPaise = 0;
    let nextDueDate = null;

    bLoans.filter(l => l.status === 'ACTIVE').forEach(l => {
        if (l.nextPendingItem) {
            monthlyEMIPaise += l.nextPendingItem.expectedTotalPaise;
            monthlyPrincipalPaise += l.nextPendingItem.expectedPrincipalPaise;
            monthlyInterestPaise += l.nextPendingItem.expectedInterestPaise;
            if (!nextDueDate || l.nextPendingItem.dueDate < nextDueDate) {
                nextDueDate = l.nextPendingItem.dueDate;
            }
        }
    });

    // Dynamic Prepayment Insight for this bank
    let bankPrepaymentInsight = null;
    const activeBLoans = bLoans.filter(l => l.status === 'ACTIVE');
    if (activeBLoans.length > 0) {
        const topLoan = activeBLoans[0];
        const prepaySample = 10000000; // ₹1L
        const sim = calculatePrepaymentIntelligence({
            outstandingPrincipalPaise: topLoan.outstandingPrincipalPaise,
            annualRate: topLoan.interestRate,
            remainingTenureMonths: topLoan.remainingMonths || topLoan.tenureMonths,
            contractualEMIPaise: topLoan.nextPendingItem?.expectedTotalPaise || monthlyEMIPaise,
            prepaymentAmountPaise: prepaySample,
            prepaymentPenaltyPct: topLoan.prepaymentPenaltyPct || 0
        });

        if (sim && sim.valid && sim.optionA) {
            bankPrepaymentInsight = {
                prepaymentAmountFormatted: formatPaise(prepaySample, true),
                potentialSavingFormatted: formatPaise(sim.optionA.netBenefitPaise),
                monthsSaved: sim.optionA.monthsSaved
            };
        }
    }

    const health = computeBankRelationshipHealth({
        bank,
        accounts,
        loans,
        projection,
        asOfDate
    });

    // Simple 2-second comprehension Relationship Map data
    const map = {
        bankName: bank.name,
        holdTotalFormatted: formatPaise(totalCashPaise, true),
        oweTotalFormatted: formatPaise(totalDebtPaise, true),
        accounts: bAccounts,
        loans: bLoans
    };

    return {
        bank,
        totalCashPaise,
        totalCashFormatted: formatPaise(totalCashPaise, true),
        totalCashPrecise: formatPaise(totalCashPaise),
        totalDebtPaise,
        totalDebtFormatted: formatPaise(totalDebtPaise, true),
        totalDebtPrecise: formatPaise(totalDebtPaise),
        netPositionPaise,
        netPositionFormatted: formatPaise(Math.abs(netPositionPaise), true),
        netPositionPrecise: formatPaise(Math.abs(netPositionPaise)),
        isNetPositive: netPositionPaise >= 0,
        monthlyEMIPaise,
        monthlyEMIFormatted: formatPaise(monthlyEMIPaise),
        monthlyPrincipalFormatted: formatPaise(monthlyPrincipalPaise),
        monthlyInterestFormatted: formatPaise(monthlyInterestPaise),
        nextDueDate,
        bankPrepaymentInsight,
        accounts: bAccounts,
        loans: bLoans,
        health,
        map
    };
}
