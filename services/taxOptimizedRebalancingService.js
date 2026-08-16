/**
 * services/taxOptimizedRebalancingService.js
 * 
 * Stage C.6.3 Tax-Efficient Rebalancing Optimizer.
 * Composed strictly on top of certified Stage C.6.2 RebalancingEngine.
 * 
 * Implements:
 * 1. Versioned TaxPolicy model with statutory holding periods and loss set-off rules.
 * 2. Deterministic Tax-Minimization Lot Selector (Tier 1 Loss -> Tier 2 LTCG -> Tier 3 STCG).
 * 3. Authoritative Shared Annual LTCG Exemption Allocator.
 * 4. Authoritative Shared Loss Set-Off Allocator.
 * 5. Rounding-aware sell notional reconciliation.
 * 6. Pure read-only decision support (Zero ledger/storage mutations).
 */

import RebalancingEngine, { ROUNDING_TAXONOMY } from './rebalancingEngine.js';
import OpenTaxLotAdapter from './openTaxLotAdapter.js';
import { CANONICAL_ASSET_CLASSES } from './targetAllocationService.js';

export const DEFAULT_TAX_POLICY_IN_FY24_25 = Object.freeze({
    policyId: 'IN_TAX_FY24_25_V1',
    jurisdiction: 'IN',
    effectiveFrom: '2024-04-01T00:00:00.000Z',
    effectiveTo: null,
    annualLtcgExemption: 125000, // ₹1.25L annual LTCG exemption
    exemptionConsumedPrior: 0,
    rules: Object.freeze({
        STOCK: Object.freeze({
            shortTermHoldingDays: 365,
            shortTermRate: 0.20,
            longTermRate: 0.125,
            lossSetOffEligibility: 'SET_OFF_ELIGIBLE',
            allowedLossSetOffCategories: ['STCG', 'LTCG']
        }),
        ETF: Object.freeze({
            shortTermHoldingDays: 365,
            shortTermRate: 0.20,
            longTermRate: 0.125,
            lossSetOffEligibility: 'SET_OFF_ELIGIBLE',
            allowedLossSetOffCategories: ['STCG', 'LTCG']
        }),
        MUTUAL_FUND: Object.freeze({
            shortTermHoldingDays: 365,
            shortTermRate: 0.20,
            longTermRate: 0.125,
            lossSetOffEligibility: 'SET_OFF_ELIGIBLE',
            allowedLossSetOffCategories: ['STCG', 'LTCG']
        }),
        GOLD: Object.freeze({
            shortTermHoldingDays: 730,
            shortTermRate: 0.20,
            longTermRate: 0.125,
            lossSetOffEligibility: 'SET_OFF_ELIGIBLE',
            allowedLossSetOffCategories: ['STCG', 'LTCG']
        }),
        CRYPTO: Object.freeze({
            shortTermHoldingDays: 0,
            shortTermRate: 0.30,
            longTermRate: 0.30,
            lossSetOffEligibility: 'NO_SET_OFF',
            allowedLossSetOffCategories: []
        }),
        BOND: Object.freeze({
            shortTermHoldingDays: 1095,
            shortTermRate: 0.20,
            longTermRate: 0.125,
            lossSetOffEligibility: 'SET_OFF_RESTRICTED',
            allowedLossSetOffCategories: ['LTCG']
        }),
        REAL_ESTATE: Object.freeze({
            shortTermHoldingDays: 730,
            shortTermRate: 0.20,
            longTermRate: 0.125,
            lossSetOffEligibility: 'SET_OFF_ELIGIBLE',
            allowedLossSetOffCategories: ['STCG', 'LTCG']
        }),
        OTHER: Object.freeze({
            shortTermHoldingDays: 1095,
            shortTermRate: 0.20,
            longTermRate: 0.20,
            lossSetOffEligibility: 'SET_OFF_RESTRICTED',
            allowedLossSetOffCategories: ['LTCG']
        })
    })
});

export const TaxOptimizedRebalancingService = {
    /**
     * Calculate tax-optimized rebalancing recommendations.
     * Pure read-only decision support function.
     * 
     * @param {Object} options
     * @param {string|null} [options.portfolioId=null] - Target portfolio ID
     * @param {Object|string} [options.policy=null] - TargetAllocationPolicy object or ID
     * @param {string|Date} options.asOfDate - Mandatory deterministic ISO-8601 evaluation timestamp
     * @param {number} [options.availableLiquidity=0] - External cash pool
     * @param {Object} [options.taxPolicy=null] - Versioned TaxPolicy object
     * @returns {Promise<Object>} TaxOptimizedRebalancingSummary DTO
     */
    async calculateTaxOptimizedRebalancing(options = {}) {
        if (!options.asOfDate) {
            throw new Error('asOfDate is mandatory for deterministic tax-optimized rebalancing.');
        }

        const asOfDateObj = new Date(options.asOfDate);
        if (isNaN(asOfDateObj.getTime())) {
            throw new Error(`Invalid asOfDate provided: ${options.asOfDate}`);
        }

        const portfolioId = options.portfolioId || null;
        const taxPolicy = options.taxPolicy || DEFAULT_TAX_POLICY_IN_FY24_25;
        const annualExemption = Math.max(0, Number(taxPolicy.annualLtcgExemption) || 0);
        const priorExemption = Math.max(0, Number(taxPolicy.exemptionConsumedPrior) || 0);
        let remainingAnnualExemption = Math.max(0, annualExemption - priorExemption);

        // 1. Execute Certified Stage C.6.2 Rebalancing Engine
        const c62Summary = await RebalancingEngine.calculateRebalancing({
            portfolioId,
            policy: options.policy,
            asOfDate: asOfDateObj,
            availableLiquidity: options.availableLiquidity
        });

        // 2. Fetch Open Tax Lots via Pure Read-Only Adapter
        const allOpenLots = await OpenTaxLotAdapter.getOpenTaxLots({
            portfolioId,
            asOfDate: asOfDateObj,
            taxPolicy
        });

        // Map open lots with accurate statutory tax category and rates under TaxPolicy
        for (const lot of allOpenLots) {
            const rule = taxPolicy.rules[lot.assetType] || taxPolicy.rules.OTHER;
            const isLongTerm = lot.holdingPeriodDays >= rule.shortTermHoldingDays;

            if (lot.unrealizedGain < 0) {
                lot.taxCategory = 'LOSS';
                lot.applicableTaxRate = 0;
            } else if (isLongTerm) {
                lot.taxCategory = 'LTCG';
                lot.applicableTaxRate = rule.longTermRate;
            } else {
                lot.taxCategory = 'STCG';
                lot.applicableTaxRate = rule.shortTermRate;
            }
            lot.lossSetOffEligibility = rule.lossSetOffEligibility;
            lot.marginalTaxPerProceeds = lot.currentPrice > 0 ? (lot.applicableTaxRate * Math.max(0, lot.unrealizedGainPerUnit)) / lot.currentPrice : 0;
        }

        // 3. Extract Overweight Classes with Executable Sell Needs
        const sellRecommendations = c62Summary.recommendations.filter(r => r.action === 'SELL' && r.isExecutable);
        const requestedSellNotional = c62Summary.executableSellNotional || 0;

        if (requestedSellNotional <= 0 || sellRecommendations.length === 0) {
            return {
                policyId: c62Summary.policyId,
                taxPolicyId: taxPolicy.policyId,
                asOfDate: c62Summary.asOfDate,
                portfolioId,
                sourceRebalancingSummary: c62Summary,
                requestedSellNotional: 0,
                selectedSellNotional: 0,
                unfilledSellNotional: 0,
                sellNotionalResidual: 0,
                naiveEstimatedTaxLiability: 0,
                optimizedEstimatedTaxLiability: 0,
                estimatedTaxSavings: 0,
                taxDragPercentage: 0,
                harvestedLosses: 0,
                effectiveOffsettableLosses: 0,
                nonOffsettableLosses: 0,
                taxBenefitFromLosses: 0,
                annualLtcgExemption: annualExemption,
                exemptionConsumedPrior: priorExemption,
                exemptionConsumedCurrent: 0,
                remainingExemptionAfterSale: remainingAnnualExemption,
                selectedTaxLots: [],
                optimizationStatus: c62Summary.rebalancingStatus === 'PRICE_REFRESH_REQUIRED' ? 'PRICE_REFRESH_REQUIRED' : 'ZERO_SELLS_REQUIRED',
                optimizationWarnings: c62Summary.feasibilityWarnings || []
            };
        }

        // Group sell needs by canonical asset class
        const classSellNeeds = {};
        for (const rec of sellRecommendations) {
            const cls = rec.assetType;
            const notional = (rec.roundedTradeQuantity || 0) * (rec.referencePrice || 0);
            classSellNeeds[cls] = (classSellNeeds[cls] || 0) + notional;
        }

        // 4. Deterministic Lot Selection per Overweight Class
        const selectedTaxLots = [];
        let totalSelectedSellNotional = 0;
        let totalUnfilledSellNotional = 0;
        const optimizationWarnings = [...(c62Summary.feasibilityWarnings || [])];

        for (const [cls, requiredNotional] of Object.entries(classSellNeeds)) {
            const rule = ROUNDING_TAXONOMY[cls] || ROUNDING_TAXONOMY.OTHER;
            const candidateLots = allOpenLots.filter(l => l.assetType === cls && l.remainingQuantity > 0.0001);

            // Deterministic Lot Tiering & Marginal Tax Sorting (Blocker C6.3-06)
            candidateLots.sort((a, b) => {
                const tierRank = { LOSS: 1, LTCG: 2, STCG: 3 };
                const rankA = tierRank[a.taxCategory] || 3;
                const rankB = tierRank[b.taxCategory] || 3;
                if (rankA !== rankB) return rankA - rankB;

                if (a.taxCategory === 'LOSS') {
                    // Larger loss rate sold first
                    const lossRateA = a.currentPrice > 0 ? (a.buyPrice - a.currentPrice) / a.currentPrice : 0;
                    const lossRateB = b.currentPrice > 0 ? (b.buyPrice - b.currentPrice) / b.currentPrice : 0;
                    if (lossRateB !== lossRateA) return lossRateB - lossRateA;
                } else {
                    // Lower gain rate sold first
                    if (a.marginalTaxPerProceeds !== b.marginalTaxPerProceeds) {
                        return a.marginalTaxPerProceeds - b.marginalTaxPerProceeds;
                    }
                }

                // Deterministic Tie-Breakers: symbol ASC, buyDate ASC, lotId ASC
                if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
                const timeA = new Date(a.buyDate).getTime();
                const timeB = new Date(b.buyDate).getTime();
                if (timeA !== timeB) return timeA - timeB;
                return a.lotId.localeCompare(b.lotId);
            });

            let classRemainingNeed = requiredNotional;

            for (const lot of candidateLots) {
                if (classRemainingNeed <= 0.01) break;
                if (lot.currentPrice <= 0) continue;

                const rawNeededQty = classRemainingNeed / lot.currentPrice;
                const availableQty = lot.remainingQuantity;

                let soldQty = 0;
                if (rule.mode === 'FLOOR_WHOLE') {
                    soldQty = Math.min(availableQty, Math.floor(rawNeededQty));
                    if (soldQty === 0 && rawNeededQty > 0 && availableQty >= 1 && classRemainingNeed >= lot.currentPrice * 0.5) {
                        soldQty = 1; // Take at least 1 unit if need is substantial
                    }
                } else {
                    soldQty = Math.min(availableQty, Number(rawNeededQty.toFixed(4)));
                }

                if (soldQty <= 0) continue;

                const soldProceeds = Number((soldQty * lot.currentPrice).toFixed(2));
                const soldCostBasis = Number((soldQty * lot.buyPrice).toFixed(2));
                const realizedGain = Number((soldProceeds - soldCostBasis).toFixed(2));
                const remQtyAfterSale = Number((lot.remainingQuantity - soldQty).toFixed(4));

                classRemainingNeed = Math.max(0, classRemainingNeed - soldProceeds);
                totalSelectedSellNotional += soldProceeds;

                selectedTaxLots.push({
                    lotId: lot.lotId,
                    symbol: lot.symbol,
                    portfolioId: lot.portfolioId,
                    assetType: lot.assetType,
                    buyDate: lot.buyDate,
                    holdingPeriodDays: lot.holdingPeriodDays,
                    taxCategory: lot.taxCategory,
                    originalRemainingQuantity: lot.remainingQuantity,
                    soldQuantity: soldQty,
                    remainingQuantityAfterSale: remQtyAfterSale,
                    buyPrice: lot.buyPrice,
                    currentPrice: lot.currentPrice,
                    soldProceeds,
                    soldCostBasis,
                    realizedGain,
                    applicableTaxRate: lot.applicableTaxRate,
                    grossTaxLiability: Math.max(0, realizedGain) * lot.applicableTaxRate,
                    exemptionApplied: 0,
                    netTaxLiability: 0,
                    selectionTier: lot.taxCategory === 'LOSS' ? 'TIER_1_LOSS' : (lot.taxCategory === 'LTCG' ? 'TIER_2_LTCG' : 'TIER_3_STCG'),
                    selectionReason: lot.taxCategory === 'LOSS' 
                        ? `Harvested loss of ₹${Math.abs(realizedGain).toFixed(2)} (0 tax)`
                        : `Realized ${lot.taxCategory} of ₹${realizedGain.toFixed(2)} at ${(lot.applicableTaxRate * 100).toFixed(1)}% rate`
                });
            }

            if (classRemainingNeed > 1.0) {
                totalUnfilledSellNotional += classRemainingNeed;
                optimizationWarnings.push(`Insufficient available holding inventory in ${cls} to fully satisfy sell delta (unfilled: ₹${classRemainingNeed.toFixed(2)}).`);
            }
        }

        // 5. Authoritative Shared Loss Set-Off & Exemption Allocation Pipeline (Blockers C6.3-07 & C6.3-08)
        let grossSTCL = 0;
        let grossLTCL = 0;
        let grossSTCG = 0;
        let grossLTCG = 0;
        let nonOffsettableLosses = 0;
        let cryptoGains = 0;

        for (const lot of selectedTaxLots) {
            const rule = taxPolicy.rules[lot.assetType] || taxPolicy.rules.OTHER;
            if (rule.lossSetOffEligibility === 'NO_SET_OFF') {
                if (lot.realizedGain < 0) {
                    nonOffsettableLosses += Math.abs(lot.realizedGain);
                } else {
                    cryptoGains += lot.realizedGain;
                }
            } else if (lot.realizedGain < 0) {
                if (lot.taxCategory === 'LOSS' && lot.holdingPeriodDays < rule.shortTermHoldingDays) {
                    grossSTCL += Math.abs(lot.realizedGain);
                } else {
                    grossLTCL += Math.abs(lot.realizedGain);
                }
            } else {
                if (lot.taxCategory === 'LTCG') {
                    grossLTCG += lot.realizedGain;
                } else {
                    grossSTCG += lot.realizedGain;
                }
            }
        }

        // Statutory Loss Set-Off:
        // STCL offsets STCG first, then LTCG
        const stclToStcg = Math.min(grossSTCL, grossSTCG);
        const stclRem = grossSTCL - stclToStcg;
        const stclToLtcg = Math.min(stclRem, grossLTCG);
        const ltcgRem = grossLTCG - stclToLtcg;
        // LTCL offsets LTCG only
        const ltclToLtcg = Math.min(grossLTCL, ltcgRem);

        const harvestedLosses = grossSTCL + grossLTCL + nonOffsettableLosses;
        const effectiveOffsettableLosses = stclToStcg + stclToLtcg + ltclToLtcg;

        const netTaxableSTCG = Math.max(0, grossSTCG - stclToStcg);
        const netEligibleLTCG = Math.max(0, grossLTCG - stclToLtcg - ltclToLtcg);

        // Shared LTCG Exemption Allocation
        const exemptionConsumedCurrent = Math.min(remainingAnnualExemption, netEligibleLTCG);
        const remainingExemptionAfterSale = remainingAnnualExemption - exemptionConsumedCurrent;
        const netTaxableLTCG = Math.max(0, netEligibleLTCG - exemptionConsumedCurrent);

        // Compute Authoritative Optimized Tax Liability
        const equityStcgRate = taxPolicy.rules.STOCK?.shortTermRate || 0.20;
        const equityLtcgRate = taxPolicy.rules.STOCK?.longTermRate || 0.125;
        const cryptoRate = taxPolicy.rules.CRYPTO?.shortTermRate || 0.30;

        const optimizedEstimatedTaxLiability = Number((
            (netTaxableSTCG * equityStcgRate) +
            (netTaxableLTCG * equityLtcgRate) +
            (cryptoGains * cryptoRate)
        ).toFixed(2));

        const taxBenefitFromLosses = Number((
            (stclToStcg * equityStcgRate) +
            ((stclToLtcg + ltclToLtcg) * equityLtcgRate)
        ).toFixed(2));

        // Allocate per-lot net tax for auditability
        let remExempToDistribute = exemptionConsumedCurrent;
        for (const lot of selectedTaxLots) {
            if (lot.taxCategory === 'LTCG' && lot.realizedGain > 0 && remExempToDistribute > 0) {
                const exApplied = Math.min(remExempToDistribute, lot.realizedGain);
                lot.exemptionApplied = exApplied;
                remExempToDistribute -= exApplied;
                const taxableGain = Math.max(0, lot.realizedGain - exApplied);
                lot.netTaxLiability = Number((taxableGain * lot.applicableTaxRate).toFixed(2));
            } else if (lot.realizedGain > 0) {
                lot.netTaxLiability = Number((lot.realizedGain * lot.applicableTaxRate).toFixed(2));
            } else {
                lot.netTaxLiability = 0;
            }
        }

        // 6. Compute Naive FIFO Tax Liability for Comparison
        // Pure FIFO sell order across the same required notional
        let naiveTax = 0;
        let naiveExemptionRem = remainingAnnualExemption;
        for (const [cls, reqNotional] of Object.entries(classSellNeeds)) {
            const naiveLots = allOpenLots.filter(l => l.assetType === cls && l.remainingQuantity > 0.0001)
                .sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime());

            let naiveRemaining = reqNotional;
            for (const lot of naiveLots) {
                if (naiveRemaining <= 0.01) break;
                const soldQ = Math.min(lot.remainingQuantity, naiveRemaining / lot.currentPrice);
                const gain = soldQ * (lot.currentPrice - lot.buyPrice);
                naiveRemaining -= (soldQ * lot.currentPrice);

                if (gain > 0) {
                    if (lot.taxCategory === 'LTCG') {
                        const ex = Math.min(naiveExemptionRem, gain);
                        naiveExemptionRem -= ex;
                        naiveTax += (gain - ex) * lot.applicableTaxRate;
                    } else {
                        naiveTax += gain * lot.applicableTaxRate;
                    }
                }
            }
        }

        const naiveEstimatedTaxLiability = Number(naiveTax.toFixed(2));
        const estimatedTaxSavings = Number(Math.max(0, naiveEstimatedTaxLiability - optimizedEstimatedTaxLiability).toFixed(2));
        const taxDragPercentage = totalSelectedSellNotional > 0 
            ? Number(((optimizedEstimatedTaxLiability / totalSelectedSellNotional) * 100).toFixed(2)) 
            : 0;

        const sellNotionalResidual = Number(Math.abs(requestedSellNotional - totalSelectedSellNotional).toFixed(2));
        const optimizationStatus = totalUnfilledSellNotional > 1.0 ? 'PARTIAL_FILL' : 'OPTIMAL';

        return {
            policyId: c62Summary.policyId,
            taxPolicyId: taxPolicy.policyId,
            asOfDate: c62Summary.asOfDate,
            portfolioId,
            sourceRebalancingSummary: c62Summary,
            requestedSellNotional: Number(requestedSellNotional.toFixed(2)),
            selectedSellNotional: Number(totalSelectedSellNotional.toFixed(2)),
            unfilledSellNotional: Number(totalUnfilledSellNotional.toFixed(2)),
            sellNotionalResidual,
            naiveEstimatedTaxLiability,
            optimizedEstimatedTaxLiability,
            estimatedTaxSavings,
            taxDragPercentage,
            harvestedLosses: Number(harvestedLosses.toFixed(2)),
            effectiveOffsettableLosses: Number(effectiveOffsettableLosses.toFixed(2)),
            nonOffsettableLosses: Number(nonOffsettableLosses.toFixed(2)),
            taxBenefitFromLosses,
            annualLtcgExemption: annualExemption,
            exemptionConsumedPrior: priorExemption,
            exemptionConsumedCurrent: Number(exemptionConsumedCurrent.toFixed(2)),
            remainingExemptionAfterSale: Number(remainingExemptionAfterSale.toFixed(2)),
            selectedTaxLots,
            optimizationStatus,
            optimizationWarnings
        };
    }
};

export default TaxOptimizedRebalancingService;
