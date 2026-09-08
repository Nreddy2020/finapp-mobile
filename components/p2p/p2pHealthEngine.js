/**
 * components/p2p/p2pHealthEngine.js
 * 
 * FinLife P2P Network — Deterministic Mathematical Relationship Health Engine.
 * 
 * Mandates:
 * 1. Fixed-point integer arithmetic in Basis Points (bps, 1% = 100 bps).
 * 2. Zero floating-point arithmetic for score determination.
 * 3. Deterministic state classification:
 *    - NO_DATA: Zero historical & zero active loans -> score: null, label: '--'
 *    - ALL_SETTLED: Zero active loans, all historical settled -> score: 100, label: '100%'
 *    - ACTIVE: Active loans present -> computed bps score -> integer percentage
 *    - SOURCE_UNAVAILABLE: Unreachable or unparseable data -> score: null, label: '--'
 * 4. Deterministic counterparty sorting: Risk desc -> Net balance desc -> Name asc.
 */

import { roundHalfUp, toBigIntPaise, P2P_STATE } from './p2pContracts.js';
import { LOAN_STATUS } from './p2pDomainModel.js';

export const HEALTH_WEIGHTS = Object.freeze({
    WEIGHT_ONTIME_BPS: 5000n,  // 50% weight on-time performance
    WEIGHT_OVERDUE_BPS: 3000n, // 30% weight overdue penalty ratio
    WEIGHT_RISK_BPS: 2000n,    // 20% weight counterparty exposure risk
    SCALE_BPS: 10000n          // 100% = 10,000 bps
});

export const HEALTH_THRESHOLDS = Object.freeze({
    HEALTHY_MIN: 80,         // >= 80%
    NEED_FOLLOW_UP_MIN: 50,  // 50% to 79%
    AT_RISK_MAX: 49          // < 50%
});

export const HEALTH_CATEGORY = Object.freeze({
    HEALTHY: 'HEALTHY',
    NEED_FOLLOW_UP: 'NEED_FOLLOW_UP',
    AT_RISK: 'AT_RISK',
    SETTLED: 'SETTLED',
    NO_DATA: 'NO_DATA'
});

/**
 * Computes deterministic relationship health across a portfolio of P2P loans.
 * 
 * @param {Array} loans - List of loan entities
 * @param {Array} repayments - List of repayment entities
 * @param {Object} schedules - Map of loanId -> schedule item array
 * @param {String} asOfDate - ISO date string YYYY-MM-DD
 * @returns {Object} Deterministic health report with score, state, and metrics
 */
export function computePortfolioHealth(loans = [], repayments = [], schedules = {}, asOfDate = new Date().toISOString().split('T')[0]) {
    if (!loans || !Array.isArray(loans)) {
        return {
            state: P2P_STATE.SOURCE_UNAVAILABLE,
            score: null,
            scoreBps: null,
            displayPct: '--',
            category: HEALTH_CATEGORY.NO_DATA,
            activePeopleCount: 0,
            needFollowUpCount: 0,
            atRiskCount: 0,
            settledCount: 0
        };
    }

    const nonCancelled = loans.filter(l => l.status !== LOAN_STATUS.CANCELLED);
    const activeLoans = nonCancelled.filter(l => l.status !== LOAN_STATUS.SETTLED);
    const settledLoans = nonCancelled.filter(l => l.status === LOAN_STATUS.SETTLED);

    // Rule 3.1: Zero active and zero historical loans -> NO_DATA
    if (nonCancelled.length === 0) {
        return {
            state: P2P_STATE.NO_DATA,
            score: null,
            scoreBps: null,
            displayPct: '--',
            category: HEALTH_CATEGORY.NO_DATA,
            activePeopleCount: 0,
            needFollowUpCount: 0,
            atRiskCount: 0,
            settledCount: 0
        };
    }

    // Rule 3.2: Zero active loans, all historical loans settled normally -> 100%
    if (activeLoans.length === 0 && settledLoans.length > 0) {
        return {
            state: 'ALL_SETTLED',
            score: 100,
            scoreBps: 10000n,
            displayPct: '100%',
            category: HEALTH_CATEGORY.HEALTHY,
            activePeopleCount: 0,
            needFollowUpCount: 0,
            atRiskCount: 0,
            settledCount: settledLoans.length
        };
    }

    // Rule 3.3: Active loans exist -> Calculate using fixed-point integer basis points
    let totalScheduleItems = 0n;
    let onTimeScheduleItems = 0n;
    let overdueScheduleItems = 0n;
    let overdueLoansCount = 0;

    const peopleSet = new Set();
    const needFollowUpPeopleSet = new Set();
    const atRiskPeopleSet = new Set();

    activeLoans.forEach(loan => {
        if (loan.personId) peopleSet.add(loan.personId);

        const schedule = (schedules && schedules[loan.id]) ? schedules[loan.id] : [];
        let hasOverdueItem = false;

        schedule.forEach(item => {
            if (item.status === 'PAID') {
                totalScheduleItems++;
                onTimeScheduleItems++;
                return;
            }

            totalScheduleItems++;
            if (item.dueDate < asOfDate) {
                overdueScheduleItems++;
                hasOverdueItem = true;
            } else {
                onTimeScheduleItems++;
            }
        });

        if (hasOverdueItem) {
            overdueLoansCount++;
            if (loan.personId) atRiskPeopleSet.add(loan.personId);
        }
    });

    const activeCount = BigInt(activeLoans.length);

    // Ratio 1: On-Time Performance Ratio in bps [0n, 10000n]
    const rOnTimeBps = totalScheduleItems > 0n
        ? roundHalfUp(onTimeScheduleItems * 10000n, totalScheduleItems)
        : 10000n;

    // Ratio 2: Overdue Penalty Ratio in bps [0n, 10000n]
    const rOverdueBps = totalScheduleItems > 0n
        ? roundHalfUp(overdueScheduleItems * 10000n, totalScheduleItems)
        : 0n;

    // Ratio 3: Loan Risk Exposure Ratio in bps [0n, 10000n]
    const rRiskBps = activeCount > 0n
        ? roundHalfUp(BigInt(overdueLoansCount) * 10000n, activeCount)
        : 0n;

    // Fixed-point weighted calculation:
    // Score_bps = (W_ontime * R_ontime + W_overdue * (10000 - R_overdue) + W_risk * (10000 - R_risk)) / 10000
    const termOntime = HEALTH_WEIGHTS.WEIGHT_ONTIME_BPS * rOnTimeBps;
    const termOverdue = HEALTH_WEIGHTS.WEIGHT_OVERDUE_BPS * (10000n - rOverdueBps);
    const termRisk = HEALTH_WEIGHTS.WEIGHT_RISK_BPS * (10000n - rRiskBps);

    const rawScoreBps = roundHalfUp(termOntime + termOverdue + termRisk, HEALTH_WEIGHTS.SCALE_BPS);
    const clampedScoreBps = rawScoreBps < 0n ? 0n : (rawScoreBps > 10000n ? 10000n : rawScoreBps);

    // Integer percentage: roundHalfUp(scoreBps, 100n)
    const scorePct = Number(roundHalfUp(clampedScoreBps, 100n));

    // Category mapping
    let category = HEALTH_CATEGORY.HEALTHY;
    if (scorePct < HEALTH_THRESHOLDS.NEED_FOLLOW_UP_MIN) {
        category = HEALTH_CATEGORY.AT_RISK;
    } else if (scorePct < HEALTH_THRESHOLDS.HEALTHY_MIN) {
        category = HEALTH_CATEGORY.NEED_FOLLOW_UP;
    }

    const activePeopleCount = peopleSet.size;
    const atRiskCount = atRiskPeopleSet.size;
    const needFollowUpCount = Math.max(0, overdueLoansCount > 0 ? atRiskCount : 0);

    return {
        state: 'ACTIVE',
        score: scorePct,
        scoreBps: clampedScoreBps,
        displayPct: `${scorePct}%`,
        category,
        activePeopleCount,
        needFollowUpCount,
        atRiskCount,
        settledCount: settledLoans.length,
        metrics: {
            totalScheduleItems: Number(totalScheduleItems),
            onTimeScheduleItems: Number(onTimeScheduleItems),
            overdueScheduleItems: Number(overdueScheduleItems),
            overdueLoansCount
        }
    };
}

/**
 * Deterministically sorts counterparties:
 * 1. Risk severity descending (AT_RISK -> NEED_FOLLOW_UP -> HEALTHY -> SETTLED)
 * 2. Absolute net balance descending
 * 3. Name ascending
 */
export function sortCounterpartiesDeterministically(people = []) {
    if (!Array.isArray(people)) return [];

    const riskRank = {
        [HEALTH_CATEGORY.AT_RISK]: 4,
        [HEALTH_CATEGORY.NEED_FOLLOW_UP]: 3,
        [HEALTH_CATEGORY.HEALTHY]: 2,
        [HEALTH_CATEGORY.SETTLED]: 1,
        [HEALTH_CATEGORY.NO_DATA]: 0
    };

    return [...people].sort((a, b) => {
        const rankA = riskRank[a.riskCategory || HEALTH_CATEGORY.HEALTHY] || 0;
        const rankB = riskRank[b.riskCategory || HEALTH_CATEGORY.HEALTHY] || 0;
        if (rankA !== rankB) return rankB - rankA;

        const balA = typeof a.netBalancePaise === 'bigint' 
            ? (a.netBalancePaise < 0n ? -a.netBalancePaise : a.netBalancePaise)
            : BigInt(Math.abs(Math.round(a.netBalance || 0)));
        const balB = typeof b.netBalancePaise === 'bigint'
            ? (b.netBalancePaise < 0n ? -b.netBalancePaise : b.netBalancePaise)
            : BigInt(Math.abs(Math.round(b.netBalance || 0)));

        if (balA !== balB) return balA > balB ? -1 : 1;

        return (a.name || '').localeCompare(b.name || '');
    });
}
