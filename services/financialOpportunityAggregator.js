/**
 * Cross-Domain Opportunity & Vulnerability Aggregator (Stage C.8.4)
 * Master Architectural Standard: C8_V1
 * 
 * Ingests authoritative diagnostic DTOs across certified C.6, C.7, C.8.2, C.8.3,
 * and liabilities modules to produce a standardized, provenance-tracked repository
 * of financial opportunities and vulnerabilities.
 * 
 * STRICT INVARIANTS:
 * 1. Zero Recalculation: Consumes authoritative diagnostic DTOs; never recalculates metrics.
 * 2. Complete Provenance (C8-R6): Every finding records sourceEngine, sourceMetric, sourceValue, and evidenceText.
 * 3. Separation of Concerns: Aggregates findings only; does NOT rank final actions (reserved for C.8.5).
 * 4. Deterministic: Mandatory caller asOfDate; zero wall-clock dependencies.
 * 5. Read-Only: Zero store mutations.
 */

export const OPPORTUNITY_AGGREGATOR_VERSION = 'C8_4_V1';

export const FINDING_TYPES = Object.freeze({
    OPPORTUNITY: 'OPPORTUNITY',     // Value-enhancing or efficiency action (e.g. Tax-loss harvest, rebalance)
    VULNERABILITY: 'VULNERABILITY'  // Downside risk or solvency hazard (e.g. Low runway, sequence risk, debt)
});

export const FINDING_CATEGORIES = Object.freeze({
    REBALANCING: 'REBALANCING',
    TAX_OPTIMIZATION: 'TAX_OPTIMIZATION',
    RISK_MITIGATION: 'RISK_MITIGATION',
    LIQUIDITY_BUFFER: 'LIQUIDITY_BUFFER',
    GOAL_SOLVENCY: 'GOAL_SOLVENCY',
    DEBT_REDUCTION: 'DEBT_REDUCTION',
    GLIDEPATH_ALIGNMENT: 'GLIDEPATH_ALIGNMENT'
});

export const FINDING_SEVERITY = Object.freeze({
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
});

export const SEVERITY_RANK = Object.freeze({
    [FINDING_SEVERITY.CRITICAL]: 1,
    [FINDING_SEVERITY.HIGH]: 2,
    [FINDING_SEVERITY.MEDIUM]: 3,
    [FINDING_SEVERITY.LOW]: 4
});

/**
 * Validates and normalizes a single financial finding record.
 * 
 * @param {Object} rawFinding - Raw finding object
 * @param {string|Date} asOfDate - Reference date
 * @returns {Object} Normalized Finding Record DTO
 */
export function normalizeFindingRecord(rawFinding, asOfDate) {
    if (!asOfDate) {
        throw new Error('Missing mandatory deterministic parameter: asOfDate');
    }
    if (!rawFinding || typeof rawFinding !== 'object') {
        throw new Error('Invalid finding: must be a non-null object');
    }
    if (!rawFinding.findingId || typeof rawFinding.findingId !== 'string' || rawFinding.findingId.trim() === '') {
        throw new Error('Invalid finding: findingId must be a non-empty string');
    }

    const findingType = Object.values(FINDING_TYPES).includes(rawFinding.findingType)
        ? rawFinding.findingType
        : FINDING_TYPES.VULNERABILITY;

    const category = Object.values(FINDING_CATEGORIES).includes(rawFinding.category)
        ? rawFinding.category
        : FINDING_CATEGORIES.RISK_MITIGATION;

    const severity = Object.values(FINDING_SEVERITY).includes(rawFinding.severity)
        ? rawFinding.severity
        : FINDING_SEVERITY.MEDIUM;

    const urgencyScore = Math.max(0.0, Math.min(100.0, Number(rawFinding.urgencyScore || 50.0)));

    return {
        findingId: rawFinding.findingId.trim(),
        findingType,
        category,
        severity,
        severityRank: SEVERITY_RANK[severity] || 3,
        urgencyScore: Math.round(urgencyScore * 10) / 10,
        sourceEngine: rawFinding.sourceEngine || 'UNKNOWN',
        sourceMetric: rawFinding.sourceMetric || 'UNKNOWN_METRIC',
        sourceValue: rawFinding.sourceValue !== undefined ? rawFinding.sourceValue : null,
        thresholdValue: rawFinding.thresholdValue !== undefined ? rawFinding.thresholdValue : null,
        targetEntityId: rawFinding.targetEntityId || null,
        affectedGoalIds: Array.isArray(rawFinding.affectedGoalIds) ? [...rawFinding.affectedGoalIds] : [],
        evidenceText: rawFinding.evidenceText || '',
        createdFromAsOfDate: new Date(asOfDate).toISOString(),
        policyVersion: OPPORTUNITY_AGGREGATOR_VERSION
    };
}

/**
 * Ingests authoritative diagnostics across domains and aggregates standardized opportunity and vulnerability records.
 * 
 * @param {Object} params - Ingestion bundle containing authoritative upstream DTOs
 * @param {string|Date} asOfDate - Reference date
 * @returns {Object} Aggregated Opportunities and Vulnerabilities DTO
 */
export function aggregateFinancialOpportunities(params = {}, asOfDate) {
    if (!asOfDate) {
        throw new Error('Missing mandatory deterministic parameter: asOfDate');
    }

    const findings = [];
    const asOfISO = new Date(asOfDate).toISOString();

    const {
        rebalancingDTO,       // from C.6 rebalancingEngine
        taxOptimizerDTO,      // from C.6.3 taxOptimizedRebalancingService
        concentrationDTO,     // from C.7.2 concentrationEngine
        volatilityDTO,        // from C.7.3 volatilityDrawdownEngine
        liquidityDTO,         // from C.7.5 liquidityEngine
        scenarioStressDTO,    // from C.7.6 scenarioStressEngine
        healthScoreDTO,       // from C.7.7 portfolioHealthScoreEngine
        goalSolvencyDTO,      // from C.8.2 wealthProjectionEngine
        goalGlidepathsDTO,    // from C.8.3 goalGlidepathService
        loansOrLiabilities    // array of loan/debt objects
    } = params;

    // 1. Ingest Liquidity Buffer Deficits (C.7.5)
    if (liquidityDTO && liquidityDTO.runwayMonths !== undefined && liquidityDTO.runwayMonths !== null) {
        const runway = Number(liquidityDTO.runwayMonths);
        if (runway < 3.0) {
            findings.push(normalizeFindingRecord({
                findingId: 'VULN_LIQUIDITY_CRITICAL_RUNWAY',
                findingType: FINDING_TYPES.VULNERABILITY,
                category: FINDING_CATEGORIES.LIQUIDITY_BUFFER,
                severity: FINDING_SEVERITY.CRITICAL,
                urgencyScore: 100.0,
                sourceEngine: 'C7_5',
                sourceMetric: 'runwayMonths',
                sourceValue: runway,
                thresholdValue: 3.0,
                evidenceText: `Emergency runway is critically depleted at ${runway.toFixed(1)} months (minimum safe threshold is 6.0 months).`
            }, asOfDate));
        } else if (runway < 6.0) {
            findings.push(normalizeFindingRecord({
                findingId: 'VULN_LIQUIDITY_INSUFFICIENT_RUNWAY',
                findingType: FINDING_TYPES.VULNERABILITY,
                category: FINDING_CATEGORIES.LIQUIDITY_BUFFER,
                severity: FINDING_SEVERITY.HIGH,
                urgencyScore: 85.0,
                sourceEngine: 'C7_5',
                sourceMetric: 'runwayMonths',
                sourceValue: runway,
                thresholdValue: 6.0,
                evidenceText: `Emergency runway is below safe reserves at ${runway.toFixed(1)} months (target is 6.0+ months).`
            }, asOfDate));
        }
    }

    // 2. Ingest High-Interest Debt Vulnerabilities (Liabilities)
    if (Array.isArray(loansOrLiabilities)) {
        for (const loan of loansOrLiabilities) {
            const interestRate = Number(loan.interestRate || loan.rate || 0);
            const loanId = loan.loanId || loan.id || 'loan_unknown';
            const loanName = loan.loanName || loan.name || 'High Interest Loan';
            const principal = Number(loan.outstandingBalance || loan.balance || loan.principal || 0);

            if (interestRate >= 14.0 && principal > 0) {
                findings.push(normalizeFindingRecord({
                    findingId: `VULN_DEBT_HIGH_INTEREST_${loanId}`,
                    findingType: FINDING_TYPES.VULNERABILITY,
                    category: FINDING_CATEGORIES.DEBT_REDUCTION,
                    severity: FINDING_SEVERITY.CRITICAL,
                    urgencyScore: 95.0,
                    sourceEngine: 'LIABILITIES',
                    sourceMetric: 'interestRate',
                    sourceValue: interestRate,
                    thresholdValue: 14.0,
                    targetEntityId: loanId,
                    evidenceText: `${loanName} carries a high interest rate of ${interestRate.toFixed(1)}% p.a. with outstanding balance of ₹${Math.round(principal).toLocaleString('en-IN')}.`
                }, asOfDate));
            } else if (interestRate >= 12.0 && principal > 0) {
                findings.push(normalizeFindingRecord({
                    findingId: `VULN_DEBT_MODERATE_INTEREST_${loanId}`,
                    findingType: FINDING_TYPES.VULNERABILITY,
                    category: FINDING_CATEGORIES.DEBT_REDUCTION,
                    severity: FINDING_SEVERITY.HIGH,
                    urgencyScore: 75.0,
                    sourceEngine: 'LIABILITIES',
                    sourceMetric: 'interestRate',
                    sourceValue: interestRate,
                    thresholdValue: 12.0,
                    targetEntityId: loanId,
                    evidenceText: `${loanName} carries an elevated interest rate of ${interestRate.toFixed(1)}% p.a.`
                }, asOfDate));
            }
        }
    }

    // 3. Ingest Goal Solvency Shortfalls (C.8.2)
    if (goalSolvencyDTO && Array.isArray(goalSolvencyDTO.goalProjections)) {
        for (const gp of goalSolvencyDTO.goalProjections) {
            if (gp.status === 'PAST_DUE') {
                findings.push(normalizeFindingRecord({
                    findingId: `VULN_GOAL_PAST_DUE_${gp.goalId}`,
                    findingType: FINDING_TYPES.VULNERABILITY,
                    category: FINDING_CATEGORIES.GOAL_SOLVENCY,
                    severity: FINDING_SEVERITY.CRITICAL,
                    urgencyScore: 90.0,
                    sourceEngine: 'C8_2',
                    sourceMetric: 'status',
                    sourceValue: 'PAST_DUE',
                    thresholdValue: 'ACTIVE',
                    targetEntityId: gp.goalId,
                    affectedGoalIds: [gp.goalId],
                    evidenceText: `Goal "${gp.name}" target date has elapsed with a funding gap of ₹${Math.round(gp.fundingGap).toLocaleString('en-IN')}.`
                }, asOfDate));
            } else if (gp.status === 'UNDERFUNDED') {
                const score = gp.priorityTier === 'CRITICAL_TIER_1' ? 88.0 : (gp.priorityTier === 'HIGH_TIER_2' ? 78.0 : 65.0);
                findings.push(normalizeFindingRecord({
                    findingId: `VULN_GOAL_UNDERFUNDED_${gp.goalId}`,
                    findingType: FINDING_TYPES.VULNERABILITY,
                    category: FINDING_CATEGORIES.GOAL_SOLVENCY,
                    severity: gp.priorityTier === 'CRITICAL_TIER_1' ? FINDING_SEVERITY.CRITICAL : FINDING_SEVERITY.HIGH,
                    urgencyScore: score,
                    sourceEngine: 'C8_2',
                    sourceMetric: 'fundedRatio',
                    sourceValue: gp.fundedRatio,
                    thresholdValue: 0.60,
                    targetEntityId: gp.goalId,
                    affectedGoalIds: [gp.goalId],
                    evidenceText: `Goal "${gp.name}" is severely underfunded at ${(gp.fundedRatio * 100).toFixed(1)}% funded ratio (requires +₹${Math.round(gp.sipShortfallDelta).toLocaleString('en-IN')}/mo SIP).`
                }, asOfDate));
            } else if (gp.status === 'AT_RISK') {
                findings.push(normalizeFindingRecord({
                    findingId: `VULN_GOAL_AT_RISK_${gp.goalId}`,
                    findingType: FINDING_TYPES.VULNERABILITY,
                    category: FINDING_CATEGORIES.GOAL_SOLVENCY,
                    severity: FINDING_SEVERITY.MEDIUM,
                    urgencyScore: 60.0,
                    sourceEngine: 'C8_2',
                    sourceMetric: 'fundedRatio',
                    sourceValue: gp.fundedRatio,
                    thresholdValue: 0.85,
                    targetEntityId: gp.goalId,
                    affectedGoalIds: [gp.goalId],
                    evidenceText: `Goal "${gp.name}" is at risk with ${(gp.fundedRatio * 100).toFixed(1)}% projected funded ratio.`
                }, asOfDate));
            }
        }
    }

    // 4. Ingest Goal Sequence-of-Returns Vulnerabilities (C.8.3)
    if (goalGlidepathsDTO && Array.isArray(goalGlidepathsDTO.goalGlidepaths)) {
        for (const gg of goalGlidepathsDTO.goalGlidepaths) {
            if (gg.hasSequenceOfReturnsRisk) {
                findings.push(normalizeFindingRecord({
                    findingId: `VULN_GLIDEPATH_SEQUENCE_RISK_${gg.goalId}`,
                    findingType: FINDING_TYPES.VULNERABILITY,
                    category: FINDING_CATEGORIES.GLIDEPATH_ALIGNMENT,
                    severity: FINDING_SEVERITY.HIGH,
                    urgencyScore: 82.0,
                    sourceEngine: 'C8_3',
                    sourceMetric: 'hasSequenceOfReturnsRisk',
                    sourceValue: true,
                    thresholdValue: false,
                    targetEntityId: gg.goalId,
                    affectedGoalIds: [gg.goalId],
                    evidenceText: `Goal "${gg.name}" reaches maturity in ${gg.horizonYears.toFixed(1)} years with excessive equity exposure (${(gg.actualAllocation.actualEquityShare * 100).toFixed(1)}% vs recommended ${(gg.recommendedAllocation.targetEquity * 100).toFixed(1)}%).`
                }, asOfDate));
            }
        }
    }

    // 5. Ingest Portfolio Concentration Risks (C.7.2)
    if (concentrationDTO) {
        if (concentrationDTO.top1HoldingWeight && Number(concentrationDTO.top1HoldingWeight) > 0.35) {
            const top1 = Number(concentrationDTO.top1HoldingWeight);
            findings.push(normalizeFindingRecord({
                findingId: 'VULN_CONCENTRATION_SINGLE_HOLDING',
                findingType: FINDING_TYPES.VULNERABILITY,
                category: FINDING_CATEGORIES.RISK_MITIGATION,
                severity: top1 > 0.50 ? FINDING_SEVERITY.CRITICAL : FINDING_SEVERITY.HIGH,
                urgencyScore: top1 > 0.50 ? 90.0 : 75.0,
                sourceEngine: 'C7_2',
                sourceMetric: 'top1HoldingWeight',
                sourceValue: top1,
                thresholdValue: 0.25,
                evidenceText: `Single holding represents ${(top1 * 100).toFixed(1)}% of total portfolio value (policy threshold is 25.0%).`
            }, asOfDate));
        } else if (concentrationDTO.assetHHI && Number(concentrationDTO.assetHHI) > 4000) {
            const hhi = Number(concentrationDTO.assetHHI);
            findings.push(normalizeFindingRecord({
                findingId: 'VULN_CONCENTRATION_ASSET_HHI',
                findingType: FINDING_TYPES.VULNERABILITY,
                category: FINDING_CATEGORIES.RISK_MITIGATION,
                severity: FINDING_SEVERITY.HIGH,
                urgencyScore: 70.0,
                sourceEngine: 'C7_2',
                sourceMetric: 'assetHHI',
                sourceValue: hhi,
                thresholdValue: 3500,
                evidenceText: `Portfolio asset HHI concentration is high at ${Math.round(hhi)} (safe diversification threshold is <= 2500).`
            }, asOfDate));
        }
    }

    // 6. Ingest Volatility & Downside Stress Risks (C.7.3 & C.7.6)
    if (volatilityDTO && volatilityDTO.annualizedVolatility && Number(volatilityDTO.annualizedVolatility) > 0.30) {
        const vol = Number(volatilityDTO.annualizedVolatility);
        findings.push(normalizeFindingRecord({
            findingId: 'VULN_VOLATILITY_ELEVATED',
            findingType: FINDING_TYPES.VULNERABILITY,
            category: FINDING_CATEGORIES.RISK_MITIGATION,
            severity: FINDING_SEVERITY.MEDIUM,
            urgencyScore: 62.0,
            sourceEngine: 'C7_3',
            sourceMetric: 'annualizedVolatility',
            sourceValue: vol,
            thresholdValue: 0.25,
            evidenceText: `Annualized portfolio volatility is elevated at ${(vol * 100).toFixed(1)}% p.a.`
        }, asOfDate));
    }

    if (scenarioStressDTO && scenarioStressDTO.worstCaseLossPercentage && Number(scenarioStressDTO.worstCaseLossPercentage) > 0.35) {
        const stressLoss = Number(scenarioStressDTO.worstCaseLossPercentage);
        findings.push(normalizeFindingRecord({
            findingId: 'VULN_SCENARIO_STRESS_SEVERE_LOSS',
            findingType: FINDING_TYPES.VULNERABILITY,
            category: FINDING_CATEGORIES.RISK_MITIGATION,
            severity: FINDING_SEVERITY.HIGH,
            urgencyScore: 76.0,
            sourceEngine: 'C7_6',
            sourceMetric: 'worstCaseLossPercentage',
            sourceValue: stressLoss,
            thresholdValue: 0.30,
            evidenceText: `Worst-case historical stress loss projection is ${(stressLoss * 100).toFixed(1)}% of total portfolio value.`
        }, asOfDate));
    }

    // 7. Ingest Rebalancing Drift Opportunities (C.6)
    if (rebalancingDTO && (rebalancingDTO.requiresRebalancing || (Array.isArray(rebalancingDTO.rebalancingOrders) && rebalancingDTO.rebalancingOrders.length > 0))) {
        findings.push(normalizeFindingRecord({
            findingId: 'OPP_REBALANCING_PORTFOLIO_DRIFT',
            findingType: FINDING_TYPES.OPPORTUNITY,
            category: FINDING_CATEGORIES.REBALANCING,
            severity: FINDING_SEVERITY.MEDIUM,
            urgencyScore: 55.0,
            sourceEngine: 'C6',
            sourceMetric: 'requiresRebalancing',
            sourceValue: true,
            thresholdValue: false,
            evidenceText: `Portfolio has breached target asset allocation drift thresholds. Rebalancing would restore target policy alignment.`
        }, asOfDate));
    }

    // 8. Ingest Tax-Loss Harvesting Opportunities (C.6.3)
    if (taxOptimizerDTO && Array.isArray(taxOptimizerDTO.harvestableLossLots) && taxOptimizerDTO.harvestableLossLots.length > 0) {
        const totalHarvestableLoss = Number(taxOptimizerDTO.totalHarvestableLossINR || 0);
        if (totalHarvestableLoss > 10000) {
            findings.push(normalizeFindingRecord({
                findingId: 'OPP_TAX_LOSS_HARVESTING',
                findingType: FINDING_TYPES.OPPORTUNITY,
                category: FINDING_CATEGORIES.TAX_OPTIMIZATION,
                severity: totalHarvestableLoss > 50000 ? FINDING_SEVERITY.HIGH : FINDING_SEVERITY.MEDIUM,
                urgencyScore: totalHarvestableLoss > 50000 ? 68.0 : 48.0,
                sourceEngine: 'C6_3',
                sourceMetric: 'totalHarvestableLossINR',
                sourceValue: totalHarvestableLoss,
                thresholdValue: 10000,
                evidenceText: `Identified ₹${Math.round(totalHarvestableLoss).toLocaleString('en-IN')} in harvestable unrealized tax losses to offset capital gains.`
            }, asOfDate));
        }
    }

    // Deterministic Sorting: UrgencyScore DESC -> SeverityRank ASC -> findingId ASC
    const sortedFindings = findings.sort((a, b) => {
        if (b.urgencyScore !== a.urgencyScore) {
            return b.urgencyScore - a.urgencyScore;
        }
        if (a.severityRank !== b.severityRank) {
            return a.severityRank - b.severityRank;
        }
        return a.findingId.localeCompare(b.findingId);
    });

    const opportunities = sortedFindings.filter(f => f.findingType === FINDING_TYPES.OPPORTUNITY);
    const vulnerabilities = sortedFindings.filter(f => f.findingType === FINDING_TYPES.VULNERABILITY);

    const criticalCount = sortedFindings.filter(f => f.severity === FINDING_SEVERITY.CRITICAL).length;
    const highCount = sortedFindings.filter(f => f.severity === FINDING_SEVERITY.HIGH).length;

    let overallFindingStatus;
    if (sortedFindings.length === 0) {
        overallFindingStatus = 'NO_ACTION_REQUIRED';
    } else if (criticalCount > 0) {
        overallFindingStatus = 'CRITICAL_VULNERABILITIES_DETECTED';
    } else if (highCount > 0) {
        overallFindingStatus = 'ACTION_RECOMMENDED';
    } else {
        overallFindingStatus = 'OPTIMIZATION_OPPORTUNITIES_IDENTIFIED';
    }

    return {
        policyVersion: OPPORTUNITY_AGGREGATOR_VERSION,
        asOfDate: asOfISO,
        status: overallFindingStatus,
        totalFindingsCount: sortedFindings.length,
        opportunitiesCount: opportunities.length,
        vulnerabilitiesCount: vulnerabilities.length,
        criticalCount,
        highCount,
        allFindings: sortedFindings,
        opportunities,
        vulnerabilities,
        meta: {
            policyVersion: OPPORTUNITY_AGGREGATOR_VERSION,
            provenanceStandard: 'C8_R6_STRICT_METRIC_PROVENANCE',
            zeroRecalculationEnforced: true
        }
    };
}
