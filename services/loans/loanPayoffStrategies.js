/**
 * services/loans/loanPayoffStrategies.js
 * 
 * Formal Bank Loans, EMIs & Debt Payoff Engine V1 — Debt Payoff Portfolio Engine.
 * Implements:
 * 1. Avalanche (Highest Effective Interest Rate first) with deterministic tie-breakers.
 * 2. Snowball (Smallest Outstanding Balance first) with deterministic tie-breakers.
 * 3. Cash-Flow Optimizer (Decision-support heuristic with 5 transparent components & versioned default weights).
 */

import { DEFAULT_OPTIMIZER_WEIGHTS, DEBT_PAYOFF_METHOD } from './loanContracts.js';

/**
 * Avalanche Ranking (Highest Rate First)
 * Deterministic Tie-Breakers:
 * 1. Higher effective rate
 * 2. Higher outstanding absolute monthly interest cost
 * 3. Higher outstanding principal
 * 4. Stable facility ID (lexicographical ascending)
 */
export function rankAvalanche(facilities) {
    return [...facilities].sort((a, b) => {
        // 1. Higher effective rate
        const rateA = Number(a.annualRatePercent || 0);
        const rateB = Number(b.annualRatePercent || 0);
        if (rateB !== rateA) return rateB - rateA;

        // 2. Higher monthly interest cost = P * r
        const pA = BigInt(a.outstandingPrincipalPaise || a.principalPaise || 0);
        const pB = BigInt(b.outstandingPrincipalPaise || b.principalPaise || 0);
        const interestCostA = Number(pA) * rateA;
        const interestCostB = Number(pB) * rateB;
        if (interestCostB !== interestCostA) return interestCostB - interestCostA;

        // 3. Higher outstanding principal
        if (pB !== pA) return pB > pA ? 1 : -1;

        // 4. Stable facility ID
        const idA = String(a.id || '');
        const idB = String(b.id || '');
        return idA.localeCompare(idB);
    }).map((facility, index) => ({
        priorityRank: index + 1,
        method: DEBT_PAYOFF_METHOD.AVALANCHE,
        facilityId: facility.id,
        facilityName: facility.name,
        lender: facility.lender,
        annualRatePercent: facility.annualRatePercent,
        outstandingPrincipalPaise: BigInt(facility.outstandingPrincipalPaise || facility.principalPaise || 0),
        monthlyEmiPaise: BigInt(facility.monthlyEmiPaise || 0),
        tenureRemainingMonths: Number(facility.tenureRemainingMonths || facility.tenureMonths || 0),
        reason: `Highest effective rate (${facility.annualRatePercent}% p.a.) minimizes total lifetime interest paid`
    }));
}

/**
 * Snowball Ranking (Smallest Balance First)
 * Deterministic Tie-Breakers:
 * 1. Lower outstanding principal
 * 2. Lower remaining tenure
 * 3. Higher monthly EMI relief
 * 4. Stable facility ID (lexicographical ascending)
 */
export function rankSnowball(facilities) {
    return [...facilities].sort((a, b) => {
        // 1. Lower outstanding principal
        const pA = BigInt(a.outstandingPrincipalPaise || a.principalPaise || 0);
        const pB = BigInt(b.outstandingPrincipalPaise || b.principalPaise || 0);
        if (pA !== pB) return pA < pB ? -1 : 1;

        // 2. Lower remaining tenure
        const tA = Number(a.tenureRemainingMonths || a.tenureMonths || 0);
        const tB = Number(b.tenureRemainingMonths || b.tenureMonths || 0);
        if (tA !== tB) return tA - tB;

        // 3. Higher monthly EMI relief
        const emiA = BigInt(a.monthlyEmiPaise || 0);
        const emiB = BigInt(b.monthlyEmiPaise || 0);
        if (emiB !== emiA) return emiB > emiA ? 1 : -1;

        // 4. Stable facility ID
        const idA = String(a.id || '');
        const idB = String(b.id || '');
        return idA.localeCompare(idB);
    }).map((facility, index) => ({
        priorityRank: index + 1,
        method: DEBT_PAYOFF_METHOD.SNOWBALL,
        facilityId: facility.id,
        facilityName: facility.name,
        lender: facility.lender,
        annualRatePercent: facility.annualRatePercent,
        outstandingPrincipalPaise: BigInt(facility.outstandingPrincipalPaise || facility.principalPaise || 0),
        monthlyEmiPaise: BigInt(facility.monthlyEmiPaise || 0),
        tenureRemainingMonths: Number(facility.tenureRemainingMonths || facility.tenureMonths || 0),
        reason: `Smallest outstanding balance frees up accounts fastest, creating positive psychological momentum`
    }));
}

/**
 * Cash-Flow Optimizer (Decision-Support Heuristic)
 * Multi-component score balancing monthly EMI relief, interest cost, payoff speed, fees, and liquidity.
 * 
 * @param {Array} facilities - Array of active loan facilities
 * @param {Object} [customWeights] - Optional user overridden weights (must sum to 100)
 * @returns {Array} Scored and ranked facilities with full transparent factor disclosure
 */
export function rankCashFlowOptimizer(facilities, customWeights = {}) {
    if (!facilities || facilities.length === 0) return [];

    const weights = {
        wRelief: customWeights.wRelief !== undefined ? Number(customWeights.wRelief) : DEFAULT_OPTIMIZER_WEIGHTS.wRelief,
        wSavings: customWeights.wSavings !== undefined ? Number(customWeights.wSavings) : DEFAULT_OPTIMIZER_WEIGHTS.wSavings,
        wSpeed: customWeights.wSpeed !== undefined ? Number(customWeights.wSpeed) : DEFAULT_OPTIMIZER_WEIGHTS.wSpeed,
        wFees: customWeights.wFees !== undefined ? Number(customWeights.wFees) : DEFAULT_OPTIMIZER_WEIGHTS.wFees,
        wLiq: customWeights.wLiq !== undefined ? Number(customWeights.wLiq) : DEFAULT_OPTIMIZER_WEIGHTS.wLiq
    };

    const sumWeights = weights.wRelief + weights.wSavings + weights.wSpeed + weights.wFees + weights.wLiq;
    if (sumWeights !== 100) {
        throw new Error(`INVALID_WEIGHTS_SUM: Optimizer weights must sum to 100, got ${sumWeights}`);
    }

    // Find maxima for normalization
    let maxEmi = 1n;
    let maxPrincipal = 1n;
    let maxTenure = 1;
    let maxRate = 1.0;

    for (const f of facilities) {
        const emi = BigInt(f.monthlyEmiPaise || 0);
        const p = BigInt(f.outstandingPrincipalPaise || f.principalPaise || 0);
        const t = Number(f.tenureRemainingMonths || f.tenureMonths || 1);
        const r = Number(f.annualRatePercent || 0);

        if (emi > maxEmi) maxEmi = emi;
        if (p > maxPrincipal) maxPrincipal = p;
        if (t > maxTenure) maxTenure = t;
        if (r > maxRate) maxRate = r;
    }

    // Score each facility
    const scored = facilities.map(facility => {
        const emi = BigInt(facility.monthlyEmiPaise || 0);
        const principal = BigInt(facility.outstandingPrincipalPaise || facility.principalPaise || 0);
        const tenure = Number(facility.tenureRemainingMonths || facility.tenureMonths || 1);
        const rate = Number(facility.annualRatePercent || 0);
        const fees = BigInt(facility.estimatedForeclosureFeesPaise || 0);

        // Component sub-scores in [0, 100]
        const sRelief = Number((emi * 100n) / maxEmi);
        const sSavings = (rate / maxRate) * 100;
        const sSpeed = (1 - (tenure / (maxTenure + 1))) * 100;
        const sFees = fees > 0n ? Number((fees * 100n) / (principal > 0n ? principal : 1n)) : 0;
        const sLiq = Number((principal * 100n) / maxPrincipal);

        // Weighted aggregate score
        const totalScore = 
            (weights.wRelief * sRelief) / 100 +
            (weights.wSavings * sSavings) / 100 +
            (weights.wSpeed * sSpeed) / 100 -
            (weights.wFees * sFees) / 100 -
            (weights.wLiq * (sLiq * 0.5)) / 100; // Scaled liquidity penalty

        return {
            facility,
            score: Math.round(totalScore * 100) / 100,
            subScores: {
                cashFlowRelief: Math.round(sRelief),
                interestSavings: Math.round(sSavings),
                closureSpeed: Math.round(sSpeed),
                feePenalty: Math.round(sFees),
                liquidityStrain: Math.round(sLiq)
            }
        };
    });

    // Sort descending by score, tie-break by lower principal, then stable ID
    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const pA = BigInt(a.facility.outstandingPrincipalPaise || a.facility.principalPaise || 0);
        const pB = BigInt(b.facility.outstandingPrincipalPaise || b.facility.principalPaise || 0);
        if (pA !== pB) return pA < pB ? -1 : 1;
        return String(a.facility.id || '').localeCompare(String(b.facility.id || ''));
    });

    return scored.map((item, index) => ({
        priorityRank: index + 1,
        method: DEBT_PAYOFF_METHOD.CASH_FLOW_OPTIMIZER,
        facilityId: item.facility.id,
        facilityName: item.facility.name,
        lender: item.facility.lender,
        annualRatePercent: item.facility.annualRatePercent,
        outstandingPrincipalPaise: BigInt(item.facility.outstandingPrincipalPaise || item.facility.principalPaise || 0),
        monthlyEmiPaise: BigInt(item.facility.monthlyEmiPaise || 0),
        tenureRemainingMonths: Number(item.facility.tenureRemainingMonths || item.facility.tenureMonths || 0),
        score: item.score,
        contributingFactors: item.subScores,
        appliedWeights: weights,
        reason: `Highest cash-flow relief score (${item.score} pts) balances immediate EMI reduction and interest savings`
    }));
}
