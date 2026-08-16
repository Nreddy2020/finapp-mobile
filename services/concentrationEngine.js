/**
 * services/concentrationEngine.js
 * 
 * Stage C.7.2 Concentration & Diversification Diagnostics Engine.
 * Computes dual-level HHI (asset-class & holding), effective constituent counts (N_eff),
 * Shannon entropy, diversification ratios, top-k concentration metrics, and diagnostic warnings.
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. Strict Zero-Mutation Boundary: 100% read-only analytical diagnostics.
 * 2. Pure Composition: Consumes certified C.4 valuation output & C.7.1 taxonomy.
 * 3. Mandatory Deterministic asOfDate: Zero wall-clock timestamp dependencies.
 * 4. High Numerical Precision: Unrounded double precision for intermediate sums.
 * 5. Dedicated ConcentrationRiskTier: Orthogonal to C.7.1 RiskSeverity.
 */

import { CANONICAL_ASSET_CLASSES } from './targetAllocationService.js';
import { ConfidenceLevel, DataQualityStatus } from './riskTaxonomy.js';
import InvestingAnalyticsEngine from './investingAnalyticsEngine.js';

// 1. Dedicated Concentration Risk Tier Enum (Contract C7.2-01)
export const ConcentrationRiskTier = Object.freeze({
    BALANCED: 'BALANCED',   // Highly diversified (HHI <= 1500, Top1 <= 20%)
    MODERATE: 'MODERATE',   // Moderate concentration (HHI 1500-3000 or Top1 20-35%)
    HIGH: 'HIGH',           // High concentration (HHI 3000-5000 or Top1 35-50%)
    CRITICAL: 'CRITICAL'    // Extreme concentration (HHI > 5000 or Top1 > 50%)
});

// 2. Authoritative Versioned Concentration Policy (Contract C7.2-07)
export const CONCENTRATION_POLICY_VERSION = 'C7_2_V1';

export const CONCENTRATION_POLICY_V1 = Object.freeze({
    thresholds: Object.freeze({
        // Tier Boundaries
        HHI_BALANCED_MAX: 1500,
        HHI_MODERATE_MAX: 3000,
        HHI_HIGH_MAX: 5000,
        TOP1_BALANCED_MAX: 0.20, // 20%
        TOP1_MODERATE_MAX: 0.35, // 35%
        TOP1_HIGH_MAX: 0.50,     // 50%

        // Diagnostic Warning Limits
        SINGLE_HOLDING_CRITICAL_RATIO: 0.35, // > 35%
        TOP3_HIGH_RATIO: 0.60,               // > 60%
        TOP5_HIGH_RATIO: 0.80,               // > 80%
        CRYPTO_MAX_RATIO: 0.15,              // > 15%
        STOCK_DOMINANCE_RATIO: 0.75,         // > 75% STOCK canonical class
        BROAD_EQUITY_DOMINANCE_RATIO: 0.80,  // > 80% Verified Equity (Stock + Verified Equity MFs/ETFs)
        UNDER_DIVERSIFIED_NEFF_MIN: 3.0,     // N_eff < 3.0 (when N >= 5)
        MIN_CONSTITUENTS_FOR_WARNING: 5
    })
});

// 3. Core Engine Implementation
export const ConcentrationEngine = {

    /**
     * Calculates comprehensive concentration and diversification diagnostics for a portfolio.
     * 
     * @param {Object} params
     * @param {string|null} [params.portfolioId=null] - Target portfolio ID (or null for all)
     * @param {Date|string} params.asOfDate - Mandatory evaluation cutoff date
     * @param {Array<Object>} [params.holdingsOverride=null] - In-memory holdings for unit testing
     * @param {Object} [params.quotesOverride=null] - In-memory quotes for unit testing
     * @returns {Promise<Object>} Canonical ConcentrationDiagnostics DTO
     */
    async calculateConcentrationDiagnostics({
        portfolioId = null,
        asOfDate,
        holdingsOverride = null,
        quotesOverride = null
    }) {
        if (!asOfDate) {
            throw new Error('asOfDate is required for deterministic concentration diagnostics');
        }
        const cutoffTs = new Date(asOfDate).getTime();
        if (Number.isNaN(cutoffTs) || cutoffTs <= 0) {
            throw new Error('Invalid asOfDate provided for concentration diagnostics');
        }

        // 1. Fetch valuation from certified C.4 Engine or in-memory override
        let totalMarketValue = 0.0;
        let rawHoldings = [];
        let summary = null;

        if (Array.isArray(holdingsOverride)) {
            // In-memory override for unit testing / simulation
            rawHoldings = holdingsOverride.map(h => {
                const qty = Number(h.quantity) || 0;
                const price = (quotesOverride && quotesOverride[h.symbol]?.currentPrice !== undefined)
                    ? Number(quotesOverride[h.symbol].currentPrice)
                    : (Number(h.currentPrice) || Number(h.averageCost) || 0);
                const mv = qty * price;
                return {
                    ...h,
                    currentMarketValue: mv
                };
            });
            totalMarketValue = rawHoldings.reduce((sum, h) => sum + (Number(h.currentMarketValue) || 0), 0);
        } else {
            summary = await InvestingAnalyticsEngine.getPortfolioSummary({
                portfolioId,
                asOfDate
            });
            totalMarketValue = Math.max(0, Number(summary?.totalMarketValue) || 0);
            rawHoldings = Array.isArray(summary?.holdings) ? summary.holdings : [];
        }

        // 2. Filter & Sanitize Valid Holdings (Contract C7.2-03)
        const sanitizedHoldings = [];
        for (const h of rawHoldings) {
            const mv = Math.max(0, Number(h.currentMarketValue) || 0);
            sanitizedHoldings.push({
                holdingId: String(h.id || h.holdingId || 'unknown'),
                symbol: String(h.symbol || 'UNKNOWN').trim().toUpperCase(),
                assetType: String(h.assetType || 'OTHER').trim().toUpperCase(),
                marketValue: mv,
                rawHolding: h
            });
        }

        const holdingCount = sanitizedHoldings.length;

        // 3. Handle Empty or Zero-Value Portfolio Edge Case
        if (holdingCount === 0 || totalMarketValue <= 0) {
            return {
                portfolioId,
                asOfDate: new Date(cutoffTs).toISOString(),
                policyVersion: CONCENTRATION_POLICY_VERSION,
                totalMarketValue: 0.0,
                holdingCount: 0,
                assetClassHHI: 0.0,
                holdingHHI: 0.0,
                normalizedHoldingHHI: 0.0,
                effectiveConstituents: 0.0,
                shannonEntropy: 0.0,
                exponentialEntropy: 0.0,
                diversificationRatio: 0.0,
                top1Ratio: 0.0,
                top3Ratio: 0.0,
                top5Ratio: 0.0,
                topHoldings: [],
                assetClassBreakdown: CANONICAL_ASSET_CLASSES.map(cls => ({
                    assetType: cls,
                    marketValue: 0.0,
                    weight: 0.0
                })),
                riskTier: ConcentrationRiskTier.BALANCED,
                warnings: ['EMPTY_OR_ZERO_VALUE_PORTFOLIO'],
                dataQuality: {
                    status: DataQualityStatus.PRISTINE,
                    confidence: ConfidenceLevel.HIGH,
                    observationCount: 0,
                    requiredObservationCount: 0,
                    coverageRatio: 1.0,
                    asOfDate: new Date(cutoffTs).toISOString(),
                    policyVersion: CONCENTRATION_POLICY_VERSION,
                    warnings: ['EMPTY_OR_ZERO_VALUE_PORTFOLIO']
                }
            };
        }

        // 4. Compute Holding Weights with Full IEEE-754 Precision (Contract C7.2-06)
        const holdingWeights = [];
        let holdingHHI_raw = 0.0;
        let shannonEntropy_raw = 0.0;

        for (const h of sanitizedHoldings) {
            const w_i = h.marketValue / totalMarketValue; // Full double precision
            holdingWeights.push({
                holdingId: h.holdingId,
                symbol: h.symbol,
                assetType: h.assetType,
                marketValue: h.marketValue,
                weight: w_i,
                rawHolding: h.rawHolding
            });

            // HHI summation: w_i^2 * 10,000
            holdingHHI_raw += Math.pow(w_i, 2) * 10000;

            // Shannon Entropy summation: - w_i * ln(w_i) (0 * ln(0) = 0)
            if (w_i > 0) {
                shannonEntropy_raw -= w_i * Math.log(w_i);
            }
        }

        // 5. Deterministic Top-k Sorting with Tie-Breaking (Contract C7.2-04)
        // Sort order: 1. marketValue DESC, 2. symbol ASC, 3. holdingId ASC
        holdingWeights.sort((a, b) => {
            if (b.marketValue !== a.marketValue) return b.marketValue - a.marketValue;
            if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
            return a.holdingId.localeCompare(b.holdingId);
        });

        // 6. Compute Top-k Concentration Ratios
        const top1Ratio_raw = holdingWeights.length >= 1 ? holdingWeights[0].weight : 0.0;
        let top3Ratio_raw = 0.0;
        for (let i = 0; i < Math.min(3, holdingWeights.length); i++) {
            top3Ratio_raw += holdingWeights[i].weight;
        }
        let top5Ratio_raw = 0.0;
        for (let i = 0; i < Math.min(5, holdingWeights.length); i++) {
            top5Ratio_raw += holdingWeights[i].weight;
        }

        // 7. Compute Asset-Class Breakdown and Asset-Class HHI
        const classValueMap = {};
        for (const cls of CANONICAL_ASSET_CLASSES) {
            classValueMap[cls] = 0.0;
        }
        for (const h of sanitizedHoldings) {
            const cls = CANONICAL_ASSET_CLASSES.includes(h.assetType) ? h.assetType : 'OTHER';
            classValueMap[cls] = (classValueMap[cls] || 0.0) + h.marketValue;
        }

        let assetClassHHI_raw = 0.0;
        const assetClassBreakdown = [];
        for (const cls of CANONICAL_ASSET_CLASSES) {
            const val = classValueMap[cls] || 0.0;
            const w_c = val / totalMarketValue;
            assetClassHHI_raw += Math.pow(w_c, 2) * 10000;
            assetClassBreakdown.push({
                assetType: cls,
                marketValue: Number(val.toFixed(2)),
                weight: Number(w_c.toFixed(6))
            });
        }

        // 8. Effective Number of Constituents & Entropy Metrics
        const effectiveConstituents_raw = holdingHHI_raw > 0 ? 10000.0 / holdingHHI_raw : 0.0;
        const exponentialEntropy_raw = Math.exp(shannonEntropy_raw);
        const diversificationRatio_raw = holdingCount > 1
            ? Math.max(0.0, Math.min(1.0, shannonEntropy_raw / Math.log(holdingCount)))
            : 0.0;

        // Normalized Holding HHI (HHI* in [0, 100])
        let normalizedHoldingHHI_raw = 0.0;
        if (holdingCount > 1) {
            const minHHI = 10000.0 / holdingCount;
            const denom = 10000.0 - minHHI;
            if (denom > 0) {
                normalizedHoldingHHI_raw = Math.max(0.0, Math.min(100.0, ((holdingHHI_raw - minHHI) / denom) * 100));
            }
        }

        // 9. Evaluate Concentration Risk Tier (Contract C7.2-01 & C7.2-07)
        const cfg = CONCENTRATION_POLICY_V1.thresholds;
        let riskTier = ConcentrationRiskTier.BALANCED;

        if (holdingHHI_raw > cfg.HHI_HIGH_MAX || top1Ratio_raw > cfg.TOP1_HIGH_MAX) {
            riskTier = ConcentrationRiskTier.CRITICAL;
        } else if (holdingHHI_raw > cfg.HHI_MODERATE_MAX || top1Ratio_raw > cfg.TOP1_MODERATE_MAX) {
            riskTier = ConcentrationRiskTier.HIGH;
        } else if (holdingHHI_raw > cfg.HHI_BALANCED_MAX || top1Ratio_raw > cfg.TOP1_BALANCED_MAX) {
            riskTier = ConcentrationRiskTier.MODERATE;
        }

        // 10. Generate Diagnostic Warning Flags (Contract C7.2-02 & C7.2-07)
        const warnings = [];

        // Single holding critical ratio (> 35%)
        if (top1Ratio_raw > cfg.SINGLE_HOLDING_CRITICAL_RATIO) {
            warnings.push('CRITICAL_SINGLE_HOLDING');
        }

        // Top 3 high ratio (> 60%)
        if (top3Ratio_raw > cfg.TOP3_HIGH_RATIO && holdingCount >= 3) {
            warnings.push('HIGH_TOP3_CONCENTRATION');
        }

        // Top 5 high ratio (> 80%)
        if (top5Ratio_raw > cfg.TOP5_HIGH_RATIO && holdingCount >= 5) {
            warnings.push('HIGH_TOP5_CONCENTRATION');
        }

        // Speculative Crypto allocation (> 15%)
        const cryptoWeight = (classValueMap.CRYPTO || 0.0) / totalMarketValue;
        if (cryptoWeight > cfg.CRYPTO_MAX_RATIO) {
            warnings.push('SPECULATIVE_ASSET_OVERWEIGHT');
        }

        // Canonical Stock Class Dominance (> 75%)
        const stockWeight = (classValueMap.STOCK || 0.0) / totalMarketValue;
        if (stockWeight > cfg.STOCK_DOMINANCE_RATIO) {
            warnings.push('STOCK_CLASS_DOMINANCE');
        }

        // Verified Broad Equity Dominance (> 80%)
        let verifiedEquityValue = classValueMap.STOCK || 0.0;
        for (const h of sanitizedHoldings) {
            if (h.assetType === 'MUTUAL_FUND' || h.assetType === 'ETF') {
                const sub = (h.rawHolding?.metadata?.equitySubtype || h.rawHolding?.metadata?.category || '').toUpperCase();
                if (sub === 'EQUITY' || sub === 'EQUITY_MF' || sub === 'EQUITY_ETF') {
                    verifiedEquityValue += h.marketValue;
                }
            }
        }
        const broadEquityWeight = verifiedEquityValue / totalMarketValue;
        if (broadEquityWeight > cfg.BROAD_EQUITY_DOMINANCE_RATIO) {
            warnings.push('BROAD_EQUITY_DOMINANCE');
        }

        // Under-diversified portfolio (N_eff < 3.0 when N >= 5)
        if (effectiveConstituents_raw < cfg.UNDER_DIVERSIFIED_NEFF_MIN && holdingCount >= cfg.MIN_CONSTITUENTS_FOR_WARNING) {
            warnings.push('UNDER_DIVERSIFIED_PORTFOLIO');
        }

        // 11. Propagate Data Quality from C.4 Valuation (Contract C7.2-05)
        let dataQualityStatus = DataQualityStatus.PRISTINE;
        let confidence = ConfidenceLevel.HIGH;
        const qualityWarnings = [];

        if (summary?.valuationBasis === 'PARTIAL_FALLBACK') {
            dataQualityStatus = DataQualityStatus.DEGRADED;
            confidence = ConfidenceLevel.MODERATE;
            qualityWarnings.push('VALUATION_PARTIAL_QUOTE_FALLBACK');
        } else if (summary?.valuationBasis === 'COST_BASIS_FALLBACK') {
            dataQualityStatus = DataQualityStatus.INSUFFICIENT;
            confidence = ConfidenceLevel.LOW;
            qualityWarnings.push('VALUATION_FULL_COST_BASIS_FALLBACK');
        }

        const quoteCoverage = summary?.quoteCoverage;
        const coverageRatio = quoteCoverage && quoteCoverage.totalHoldings > 0
            ? Number((quoteCoverage.marketValued / quoteCoverage.totalHoldings).toFixed(4))
            : 1.0;

        if (coverageRatio < 0.80) {
            dataQualityStatus = DataQualityStatus.INSUFFICIENT;
            confidence = ConfidenceLevel.LOW;
        } else if (coverageRatio < 1.0 && confidence === ConfidenceLevel.HIGH) {
            dataQualityStatus = DataQualityStatus.DEGRADED;
            confidence = ConfidenceLevel.MODERATE;
        }

        return {
            portfolioId,
            asOfDate: new Date(cutoffTs).toISOString(),
            policyVersion: CONCENTRATION_POLICY_VERSION,
            totalMarketValue: Number(totalMarketValue.toFixed(2)),
            holdingCount,

            // HHI Metrics (2 decimal places)
            assetClassHHI: Number(assetClassHHI_raw.toFixed(2)),
            holdingHHI: Number(holdingHHI_raw.toFixed(2)),
            normalizedHoldingHHI: Number(normalizedHoldingHHI_raw.toFixed(2)),

            // Breadth & Entropy Metrics (4-6 decimal places)
            effectiveConstituents: Number(effectiveConstituents_raw.toFixed(4)),
            shannonEntropy: Number(shannonEntropy_raw.toFixed(6)),
            exponentialEntropy: Number(exponentialEntropy_raw.toFixed(4)),
            diversificationRatio: Number(diversificationRatio_raw.toFixed(6)),

            // Top-k Ratios (6 decimal places)
            top1Ratio: Number(top1Ratio_raw.toFixed(6)),
            top3Ratio: Number(top3Ratio_raw.toFixed(6)),
            top5Ratio: Number(top5Ratio_raw.toFixed(6)),

            // Breakdown Lists
            topHoldings: holdingWeights.map(h => ({
                holdingId: h.holdingId,
                symbol: h.symbol,
                assetType: h.assetType,
                marketValue: Number(h.marketValue.toFixed(2)),
                weight: Number(h.weight.toFixed(6))
            })),
            assetClassBreakdown,

            // Risk Tier & Warnings
            riskTier,
            warnings,
            dataQuality: {
                status: dataQualityStatus,
                confidence,
                observationCount: holdingCount,
                requiredObservationCount: holdingCount,
                coverageRatio,
                asOfDate: new Date(cutoffTs).toISOString(),
                policyVersion: CONCENTRATION_POLICY_VERSION,
                warnings: qualityWarnings
            }
        };
    }
};

export default ConcentrationEngine;
