/**
 * components/investments/rebalancingPresentationAdapter.js
 * 
 * Stage C.6.4 Rebalancing Presentation Adapter.
 * Bridges certified financial DTOs (C.6.1, C.6.2, C.6.3) to pure UI presentation tokens.
 * 
 * INVARIANTS:
 * 1. Zero state mutation or transaction logging.
 * 2. Pure functional mapping for visual indicators (e.g. gauge widths, badge tokens).
 * 3. Does not alter underlying financial numbers.
 */

/**
 * Maps residual drift percentage points to a visual gauge fill percentage [0 - 100].
 * @param {number} residualDriftPp - Drift in percentage points
 * @param {number} maxScalePp - Scale maximum (default 20 pp)
 * @returns {number} Visual gauge percentage [0, 100]
 */
export function computeDriftGaugePercentage(residualDriftPp, maxScalePp = 20) {
    const drift = Number(residualDriftPp) || 0;
    const max = Number(maxScalePp) || 20;
    if (max <= 0) return 0;
    const pct = (Math.abs(drift) / max) * 100;
    return Math.min(100, Math.max(0, Number(pct.toFixed(1))));
}

/**
 * Adapts a certified TaxOptimizedRebalancingSummary DTO into a presentation-ready model.
 * @param {Object} rebalancingSummary - Certified C.6.3 summary DTO
 * @returns {Object} Presentation-adapted summary object
 */
export function adaptRebalancingSummary(rebalancingSummary) {
    if (!rebalancingSummary) return null;

    const source = rebalancingSummary.sourceRebalancingSummary || {};
    const driftGaugePercentage = computeDriftGaugePercentage(source.residualDriftPercentagePoints || 0);

    return {
        ...rebalancingSummary,
        driftGaugePercentage
    };
}
