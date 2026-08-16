/**
 * services/riskTaxonomy.js
 * 
 * Stage C.7.1 Portfolio Risk Foundation & Risk Taxonomy Service.
 * Defines canonical risk pillars, data contracts, return series adapters, and confidence metrics.
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. 100% Read-Only: Zero state mutations, ledger entries, or storage writes.
 * 2. Pure Composition: Preserves canonical 8 asset classes and certified C.4–C.6 contracts.
 * 3. Deterministic Evaluation: All time-series and risk metrics evaluate strictly <= asOfDate.
 * 4. Zero Manufactured Returns: Incomplete series return degraded confidence, never fake data.
 */

import { CANONICAL_ASSET_CLASSES } from './targetAllocationService.js';

// 1. Canonical Risk Pillars
export const RiskPillar = Object.freeze({
    CONCENTRATION: 'CONCENTRATION',
    VOLATILITY: 'VOLATILITY',
    DRAWDOWN: 'DRAWDOWN',
    LIQUIDITY: 'LIQUIDITY',
    CORRELATION: 'CORRELATION',
    STRESS_TEST: 'STRESS_TEST'
});

// 2. Risk Severity Levels
export const RiskSeverity = Object.freeze({
    LOW: 'LOW',
    MODERATE: 'MODERATE',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
});

// 3. Liquidity Classification Tiers (Independent of Asset Class)
export const LiquidityTier = Object.freeze({
    INSTANT_T0: 'INSTANT_T0',              // T+0 to T+1 (Cash, Overnight debt, Liquid ETFs)
    SHORT_TERM_T2_T3: 'SHORT_TERM_T2_T3',  // T+2 to T+3 (Equities, Open-ended mutual funds)
    MEDIUM_TERM_T4_T7: 'MEDIUM_TERM_T4_T7',// T+4 to T+7 (Physical metals, Fixed deposits with notice)
    LOCKED_OR_ILLIQUID: 'LOCKED_OR_ILLIQUID' // T > 7 (ELSS 3Y lockup, Real estate, Unvested ESOPs)
});

// Default Liquidity Tier Mapping by Canonical Asset Class
export const DEFAULT_ASSET_LIQUIDITY_MAP = Object.freeze({
    STOCK: LiquidityTier.SHORT_TERM_T2_T3,
    MUTUAL_FUND: LiquidityTier.SHORT_TERM_T2_T3,
    ETF: LiquidityTier.INSTANT_T0,
    GOLD: LiquidityTier.MEDIUM_TERM_T4_T7,
    CRYPTO: LiquidityTier.INSTANT_T0,
    BOND: LiquidityTier.SHORT_TERM_T2_T3,
    REAL_ESTATE: LiquidityTier.LOCKED_OR_ILLIQUID,
    OTHER: LiquidityTier.MEDIUM_TERM_T4_T7
});

// 4. Data Quality & Confidence Levels
export const DataQualityStatus = Object.freeze({
    PRISTINE: 'PRISTINE',         // 100% continuous data
    ACCEPTABLE: 'ACCEPTABLE',     // >= 95% observations
    DEGRADED: 'DEGRADED',         // 80% - 94% observations
    INSUFFICIENT: 'INSUFFICIENT'  // < 80% observations
});

export const ConfidenceLevel = Object.freeze({
    HIGH: 'HIGH',                 // Coverage >= 0.95 and valid history
    MODERATE: 'MODERATE',         // Coverage 0.80 - 0.94
    LOW: 'LOW',                   // Coverage < 0.80
    UNAVAILABLE: 'UNAVAILABLE'    // No valid historical data
});

// 5. Unspecified Asset Class Shock Policy (Contract C7-04)
export const UNSPECIFIED_SHOCK_POLICY = 0.0; // 0.0% neutral

// 6. Standardized Canonical Stress Scenarios (Contract C7-03 & C7-04)
export const CANONICAL_STRESS_SCENARIOS = Object.freeze({
    HISTORICAL_GFC_2008: Object.freeze({
        id: 'HISTORICAL_GFC_2008',
        name: '2008 Global Financial Crisis',
        category: 'HISTORICAL_MARKET_CRASH',
        description: 'Severe global liquidity freeze and synchronized equity market collapse.',
        shocks: Object.freeze({
            STOCK: -0.55,
            MUTUAL_FUND: -0.45,
            ETF: -0.50,
            GOLD: +0.25,
            CRYPTO: -0.70,
            BOND: +0.08,
            REAL_ESTATE: -0.30,
            OTHER: -0.20
        })
    }),
    HISTORICAL_COVID_2020: Object.freeze({
        id: 'HISTORICAL_COVID_2020',
        name: '2020 COVID Liquidity Crash',
        category: 'HISTORICAL_MARKET_CRASH',
        description: 'Rapid pandemic lockdown and global asset liquidation shock.',
        shocks: Object.freeze({
            STOCK: -0.38,
            MUTUAL_FUND: -0.32,
            ETF: -0.35,
            GOLD: +0.15,
            CRYPTO: -0.50,
            BOND: +0.04,
            REAL_ESTATE: -0.15,
            OTHER: -0.10
        })
    }),
    MACRO_RATE_SPIKE: Object.freeze({
        id: 'MACRO_RATE_SPIKE',
        name: 'Interest Rate Spike (+200 bps)',
        category: 'MONETARY_TIGHTENING',
        description: 'Aggressive central bank rate hikes compressing bond durations and equity multiples.',
        shocks: Object.freeze({
            STOCK: -0.15,
            MUTUAL_FUND: -0.12,
            ETF: -0.14,
            GOLD: -0.05,
            CRYPTO: -0.30,
            BOND: -0.12,
            REAL_ESTATE: -0.08,
            OTHER: -0.05
        })
    }),
    MACRO_STAGFLATION_SHOCK: Object.freeze({
        id: 'MACRO_STAGFLATION_SHOCK',
        name: 'Stagflation & Supply Shock',
        category: 'MACRO_REGIME',
        description: 'High inflation coupled with economic stagnation favoring commodities over paper assets.',
        shocks: Object.freeze({
            STOCK: -0.10,
            MUTUAL_FUND: -0.08,
            ETF: -0.09,
            GOLD: +0.30,
            CRYPTO: -0.25,
            BOND: -0.18,
            REAL_ESTATE: +0.15,
            OTHER: 0.00
        })
    })
});

// Auxiliary / Sector Scenarios
export const SECTOR_STRESS_SCENARIOS = Object.freeze({
    CRYPTO_WINTER_2022: Object.freeze({
        id: 'CRYPTO_WINTER_2022',
        name: 'Crypto Winter / Tech Sell-Off',
        category: 'SECTOR_MELTDOWN',
        description: 'Severe speculative risk-off liquidation isolated to digital and high-beta tech assets.',
        shocks: Object.freeze({
            STOCK: -0.20,
            MUTUAL_FUND: -0.15,
            ETF: -0.18,
            GOLD: +0.05,
            CRYPTO: -0.80,
            BOND: +0.02,
            REAL_ESTATE: 0.00,
            OTHER: -0.05
        })
    })
});

export const ALL_STRESS_SCENARIOS = Object.freeze({
    ...CANONICAL_STRESS_SCENARIOS,
    ...SECTOR_STRESS_SCENARIOS
});

// 7. Schema Validation Helpers
export const RiskTaxonomyService = {

    /**
     * Validates a historical market data point.
     * @param {Object} point 
     * @returns {boolean}
     */
    isValidMarketDataPoint(point) {
        if (!point || typeof point !== 'object') return false;
        if (!point.symbol || typeof point.symbol !== 'string') return false;
        if (typeof point.adjustedClose !== 'number' || isNaN(point.adjustedClose) || point.adjustedClose <= 0) return false;
        const ts = new Date(point.timestamp).getTime();
        if (isNaN(ts) || ts <= 0) return false;
        return true;
    },

    /**
     * Normalizes a sequence of historical market data points into a validated Return Series.
     * Enforces deterministic asOfDate cutoff and coverage ratio calculations.
     * 
     * @param {Object} params
     * @param {string} params.symbol - Asset symbol
     * @param {Array<Object>} params.dataPoints - Historical price points
     * @param {Date|string} params.asOfDate - Evaluation cutoff date
     * @param {number} params.requiredObservations - Target count for lookback (e.g. 252 for 1Y daily)
     * @param {string} params.frequency - 'DAILY' | 'WEEKLY' | 'MONTHLY'
     * @returns {Object} Canonical HistoricalReturnSeries DTO
     */
    normalizeHistoricalReturns({
        symbol,
        dataPoints = [],
        asOfDate = new Date(),
        requiredObservations = 252,
        frequency = 'DAILY'
    }) {
        const normSymbol = (symbol || '').trim().toUpperCase();
        const cutoffTs = new Date(asOfDate).getTime();
        const reqObs = Math.max(1, Number(requiredObservations) || 252);

        // 1. Filter points <= asOfDate and sort chronologically
        const validPoints = dataPoints
            .filter(p => this.isValidMarketDataPoint(p))
            .filter(p => new Date(p.timestamp).getTime() <= cutoffTs)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Deduplicate timestamps
        const dedupedPoints = [];
        const seenDates = new Set();
        for (const pt of validPoints) {
            const dateStr = new Date(pt.timestamp).toISOString().slice(0, 10);
            if (!seenDates.has(dateStr)) {
                seenDates.add(dateStr);
                dedupedPoints.push(pt);
            }
        }

        const count = dedupedPoints.length;
        const coverageRatio = Math.min(1.0, Number((count / reqObs).toFixed(4)));

        // 2. Compute Arithmetic Returns: r_t = (P_t - P_{t-1}) / P_{t-1}
        const returns = [];
        const timestamps = [];
        const missingIntervals = [];

        for (let i = 1; i < count; i++) {
            const prevPrice = dedupedPoints[i - 1].adjustedClose;
            const currPrice = dedupedPoints[i].adjustedClose;
            const r = (currPrice - prevPrice) / prevPrice;
            returns.push(Number(r.toFixed(6)));
            timestamps.push(dedupedPoints[i].timestamp);

            // Detect missing intervals (gap > 4 calendar days for daily frequency)
            const gapDays = (new Date(dedupedPoints[i].timestamp).getTime() - new Date(dedupedPoints[i - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24);
            if (gapDays > 4) {
                missingIntervals.push({
                    startDate: dedupedPoints[i - 1].timestamp,
                    endDate: dedupedPoints[i].timestamp,
                    gapDays: Math.round(gapDays)
                });
            }
        }

        // 3. Determine Data Quality & Confidence
        let qualityStatus = DataQualityStatus.PRISTINE;
        let confidence = ConfidenceLevel.HIGH;

        if (count === 0) {
            qualityStatus = DataQualityStatus.INSUFFICIENT;
            confidence = ConfidenceLevel.UNAVAILABLE;
        } else if (coverageRatio < 0.80 || (reqObs >= 20 && count < 20)) {
            qualityStatus = DataQualityStatus.INSUFFICIENT;
            confidence = ConfidenceLevel.LOW;
        } else if (coverageRatio < 0.95 || missingIntervals.length > 3) {
            qualityStatus = DataQualityStatus.DEGRADED;
            confidence = ConfidenceLevel.MODERATE;
        } else if (missingIntervals.length > 0) {
            qualityStatus = DataQualityStatus.ACCEPTABLE;
            confidence = ConfidenceLevel.HIGH;
        }

        const lookbackStart = count > 0 ? dedupedPoints[0].timestamp : null;
        const lookbackEnd = count > 0 ? dedupedPoints[count - 1].timestamp : null;

        return {
            symbol: normSymbol,
            frequency,
            lookbackStart,
            lookbackEnd,
            asOfDate: new Date(cutoffTs).toISOString(),
            observationCount: count,
            requiredObservationCount: reqObs,
            coverageRatio,
            returns,
            timestamps,
            missingIntervals,
            qualityStatus,
            confidence
        };
    },

    /**
     * Resolves liquidity classification for a holding evaluated strictly at asOfDate.
     * Guaranteed deterministic: zero dependency on wall clock Date.now().
     * 
     * @param {Object} params - Holding object or options bundle
     * @param {Date|string} [asOfDateArg] - Deterministic evaluation cutoff
     * @returns {Object} HoldingLiquidityProfile
     */
    classifyHoldingLiquidity(params, asOfDateArg) {
        let holding = params;
        let asOfDate = asOfDateArg;

        if (params && typeof params === 'object' && params.holding) {
            holding = params.holding;
            asOfDate = params.asOfDate || asOfDateArg;
        }

        const evalTs = asOfDate ? new Date(asOfDate).getTime() : Date.now();

        if (!holding || typeof holding !== 'object') {
            return {
                holdingId: 'unknown',
                symbol: 'UNKNOWN',
                assetType: 'OTHER',
                liquidityTier: LiquidityTier.MEDIUM_TERM_T4_T7,
                estimatedSettlementDays: 5,
                isLocked: false,
                lockupExpiryDate: null,
                exitPenaltyPercent: 0
            };
        }

        const assetType = holding.assetType || 'OTHER';
        const defaultTier = DEFAULT_ASSET_LIQUIDITY_MAP[assetType] || LiquidityTier.MEDIUM_TERM_T4_T7;
        
        let tier = defaultTier;
        let isLocked = false;
        let settlementDays = 2;

        if (tier === LiquidityTier.INSTANT_T0) settlementDays = 0;
        else if (tier === LiquidityTier.SHORT_TERM_T2_T3) settlementDays = 2;
        else if (tier === LiquidityTier.MEDIUM_TERM_T4_T7) settlementDays = 5;
        else if (tier === LiquidityTier.LOCKED_OR_ILLIQUID) {
            settlementDays = 30;
            isLocked = true;
        }

        // Check for holding-specific lockups evaluated strictly at asOfDate
        const lockExpiry = holding.metadata?.lockupExpiryDate || null;
        if (lockExpiry && new Date(lockExpiry).getTime() > evalTs) {
            tier = LiquidityTier.LOCKED_OR_ILLIQUID;
            isLocked = true;
        }

        return {
            holdingId: holding.id || holding.holdingId || 'unknown',
            symbol: (holding.symbol || '').trim().toUpperCase(),
            assetType,
            liquidityTier: tier,
            estimatedSettlementDays: settlementDays,
            isLocked,
            lockupExpiryDate: lockExpiry,
            exitPenaltyPercent: Number(holding.metadata?.exitPenaltyPercent || 0)
        };
    },

    /**
     * Resolves the complete 8-class shock vector for a stress scenario.
     * Applies UNSPECIFIED_SHOCK_POLICY (0.0%) for missing asset classes.
     * 
     * @param {Object|string} scenario - Scenario object or key
     * @returns {Object} Complete 8-class shock vector
     */
    getScenarioShockVector(scenario) {
        let rawShocks = {};
        if (typeof scenario === 'string') {
            const canonical = ALL_STRESS_SCENARIOS[scenario];
            if (canonical) rawShocks = canonical.shocks;
        } else if (scenario && typeof scenario === 'object' && scenario.shocks) {
            rawShocks = scenario.shocks;
        }

        const resolvedShocks = {};
        for (const cls of CANONICAL_ASSET_CLASSES) {
            resolvedShocks[cls] = typeof rawShocks[cls] === 'number' ? rawShocks[cls] : UNSPECIFIED_SHOCK_POLICY;
        }
        return resolvedShocks;
    }
};

export default RiskTaxonomyService;
