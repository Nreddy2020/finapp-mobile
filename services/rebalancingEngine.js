/**
 * services/rebalancingEngine.js
 * 
 * Stage C.6.2 Drift & Rebalancing Delta Calculator.
 * Mathematical portfolio drift analysis, fresh-cash denominator scaling,
 * intra-asset holding selection, 8-class quantity rounding, and feasibility evaluation.
 * 
 * Strictly decision-support / read-only. Zero ledger or storage mutations.
 */

import InvestingAnalyticsEngine from './investingAnalyticsEngine.js';
import TargetAllocationService, { CANONICAL_ASSET_CLASSES } from './targetAllocationService.js';
import MarketDataService from './marketDataService.js';

export const ROUNDING_TAXONOMY = Object.freeze({
    STOCK: Object.freeze({ mode: 'FLOOR_WHOLE', tradeable: true, minUnit: 1 }),
    ETF: Object.freeze({ mode: 'FLOOR_WHOLE', tradeable: true, minUnit: 1 }),
    BOND: Object.freeze({ mode: 'FLOOR_WHOLE', tradeable: true, minUnit: 1 }),
    MUTUAL_FUND: Object.freeze({ mode: 'DECIMAL_4', tradeable: true, minUnit: 0.0001 }),
    CRYPTO: Object.freeze({ mode: 'DECIMAL_4', tradeable: true, minUnit: 0.0001 }),
    GOLD: Object.freeze({ mode: 'DECIMAL_4', tradeable: true, minUnit: 0.0001 }),
    REAL_ESTATE: Object.freeze({ mode: 'NONE', tradeable: false, minUnit: 0 }),
    OTHER: Object.freeze({ mode: 'NONE', tradeable: false, minUnit: 0 })
});

export const RebalancingEngine = {
    /**
     * Calculate comprehensive portfolio drift and rebalancing recommendations.
     * Pure read-only decision support function.
     * 
     * @param {Object} options
     * @param {string|null} [options.portfolioId=null] - Target portfolio ID (null for all portfolios)
     * @param {Object|string} [options.policy=null] - TargetAllocationPolicy object or policyId
     * @param {string|Date} [options.asOfDate=null] - ISO-8601 deterministic evaluation timestamp
     * @param {number} [options.availableLiquidity=0] - External available cash pool
     * @returns {Promise<Object>} RebalancingSummary DTO
     */
    async calculateRebalancing(options = {}) {
        const portfolioId = options.portfolioId || null;
        const asOfDateObj = options.asOfDate ? new Date(options.asOfDate) : new Date();
        const asOfDateStr = asOfDateObj.toISOString();
        const availableCash = Math.max(0, Number(options.availableLiquidity) || 0);

        // 1. Resolve Target Allocation Policy
        let policy = null;
        if (options.policy && typeof options.policy === 'object') {
            const val = TargetAllocationService.validatePolicy(options.policy);
            if (!val.isValid) {
                throw new Error(`Invalid TargetAllocationPolicy: ${val.errors.join('; ')}`);
            }
            policy = val.normalizedPolicy;
        } else if (typeof options.policy === 'string') {
            policy = await TargetAllocationService.getPolicyById(options.policy);
            if (!policy) {
                throw new Error(`TargetAllocationPolicy not found with ID: ${options.policy}`);
            }
        } else {
            policy = await TargetAllocationService.getPolicyForPortfolio(portfolioId);
        }

        const driftTolerance = Number(policy.driftTolerancePercent || 5.0);

        // 2. Fetch Certified C.4.1 Summary & C.4.2 Allocation Snapshot
        const [portfolioSummary, allocationSummary] = await Promise.all([
            InvestingAnalyticsEngine.getPortfolioSummary({ portfolioId, asOfDate: asOfDateObj }),
            InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId, asOfDate: asOfDateObj })
        ]);

        const investmentPortfolioValue = Number(portfolioSummary.totalMarketValue) || 0;
        const activeHoldings = portfolioSummary.holdings || [];

        // Map current market values and weights per canonical asset class
        const currentClassMap = {};
        for (const cls of CANONICAL_ASSET_CLASSES) {
            currentClassMap[cls] = {
                assetType: cls,
                marketValue: 0,
                weightPercent: 0
            };
        }

        if (allocationSummary && Array.isArray(allocationSummary.assetAllocation)) {
            for (const alloc of allocationSummary.assetAllocation) {
                const cls = alloc.assetType || 'OTHER';
                if (currentClassMap[cls]) {
                    currentClassMap[cls].marketValue = Number(alloc.marketValue) || 0;
                    currentClassMap[cls].weightPercent = Number(alloc.marketWeightPercent) || 0;
                }
            }
        }

        // Defensive: compute exact weights if total market value > 0
        if (investmentPortfolioValue > 0) {
            for (const cls of CANONICAL_ASSET_CLASSES) {
                currentClassMap[cls].weightPercent = Number(((currentClassMap[cls].marketValue / investmentPortfolioValue) * 100).toFixed(4));
            }
        }

        const currentAllocation = CANONICAL_ASSET_CLASSES.map(cls => ({
            assetType: cls,
            marketValue: currentClassMap[cls].marketValue,
            weightPercent: currentClassMap[cls].weightPercent
        }));

        const targetAllocation = CANONICAL_ASSET_CLASSES.map(cls => ({
            assetType: cls,
            targetWeightPercent: Number(policy.assetWeights[cls] || 0)
        }));

        // 3. Post-Cash Denominator & Target Value Scaling (Blocker C6-14)
        // Calculate minimum cash for a pure sell-free rebalance
        let pureCashMin = 0;
        for (const cls of CANONICAL_ASSET_CLASSES) {
            const targetWeight = Number(policy.assetWeights[cls] || 0);
            if (targetWeight > 0) {
                const classVal = currentClassMap[cls].marketValue;
                const requiredTotalForClass = (classVal / targetWeight) * 100;
                if (requiredTotalForClass > investmentPortfolioValue) {
                    const cashNeedForClass = requiredTotalForClass - investmentPortfolioValue;
                    if (cashNeedForClass > pureCashMin) {
                        pureCashMin = cashNeedForClass;
                    }
                }
            }
        }

        let deployedLiquidity = 0;
        if (availableCash >= pureCashMin && pureCashMin > 0) {
            deployedLiquidity = pureCashMin; // Deploy minimum pure-cash threshold to avoid over-deploying
        } else if (availableCash > 0) {
            deployedLiquidity = availableCash;
        }

        const postRebalancePortfolioValue = investmentPortfolioValue + deployedLiquidity;

        // 4. Calculate Drift & Planned Notional Deltas
        const classDeltas = {};
        let plannedBuyNotional = 0;
        let plannedSellNotional = 0;
        let hasAnyDrift = false;

        for (const cls of CANONICAL_ASSET_CLASSES) {
            const currentVal = currentClassMap[cls].marketValue;
            const currentWeight = currentClassMap[cls].weightPercent;
            const targetWeight = Number(policy.assetWeights[cls] || 0);
            const driftPp = Number((currentWeight - targetWeight).toFixed(4));

            // Scaled target value against post-cash denominator
            const targetValPost = postRebalancePortfolioValue * (targetWeight / 100);
            const notionalDelta = targetValPost - currentVal;

            let driftTag = 'BALANCED';
            if (targetWeight === 0 && currentVal > 0) {
                // Zero-target class with existing holdings is 100% overweight divestment (Hardening C6.2-03)
                driftTag = 'OVERWEIGHT';
                hasAnyDrift = true;
            } else if (deployedLiquidity > 0 && notionalDelta > 0.01) {
                // Deployed fresh cash creates buy actions for target classes
                driftTag = 'UNDERWEIGHT';
                hasAnyDrift = true;
            } else if (deployedLiquidity > 0 && notionalDelta < -0.01) {
                driftTag = 'OVERWEIGHT';
                hasAnyDrift = true;
            } else if (driftPp > driftTolerance) {
                driftTag = 'OVERWEIGHT';
                hasAnyDrift = true;
            } else if (driftPp < -driftTolerance) {
                driftTag = 'UNDERWEIGHT';
                hasAnyDrift = true;
            }

            if (notionalDelta > 0 && driftTag === 'UNDERWEIGHT') {
                plannedBuyNotional += notionalDelta;
            } else if (notionalDelta < 0 && driftTag === 'OVERWEIGHT') {
                plannedSellNotional += Math.abs(notionalDelta);
            }

            classDeltas[cls] = {
                currentVal,
                currentWeight,
                targetWeight,
                driftPp,
                targetValPost,
                notionalDelta,
                driftTag
            };
        }

        // 5. Holding Selection, Tradability, and 8-Class Quantity Rounding
        const recommendations = [];
        const feasibilityWarnings = [];
        let hasNonTradeableDrift = false;
        let hasTradeableDrift = false;
        let hasPriceRefreshRequired = false;

        let executableBuyNotional = 0;
        let executableSellNotional = 0;

        for (const cls of CANONICAL_ASSET_CLASSES) {
            const d = classDeltas[cls];
            const rule = ROUNDING_TAXONOMY[cls] || ROUNDING_TAXONOMY.OTHER;

            if (d.driftTag === 'BALANCED') {
                // In-band asset class: produce balanced indicator
                recommendations.push({
                    assetType: cls,
                    symbol: null,
                    portfolioId,
                    currentValue: d.currentVal,
                    currentWeightPercent: d.currentWeight,
                    targetWeightPercent: d.targetWeight,
                    driftPercentagePoints: d.driftPp,
                    action: 'HOLD_BALANCED',
                    tradeability: rule.tradeable ? 'TRADEABLE' : 'NON_TRADEABLE',
                    isExecutable: false,
                    quoteStatus: 'LIVE',
                    referencePrice: 0,
                    requiredNotional: 0,
                    rawEstimatedQuantity: 0,
                    roundedTradeQuantity: 0,
                    roundingMode: rule.mode,
                    estimatedTaxImpact: 0,
                    reason: `Asset class allocation (${d.currentWeight.toFixed(2)}%) is within ±${driftTolerance.toFixed(2)} pp drift tolerance band.`
                });
                continue;
            }

            // Asset class is OVERWEIGHT or UNDERWEIGHT
            if (!rule.tradeable) {
                hasNonTradeableDrift = true;
                const warnMsg = `${cls} ${d.driftTag.toLowerCase()} drift (${d.driftPp > 0 ? '+' : ''}${d.driftPp.toFixed(2)} pp) cannot be executed because asset is non-tradeable.`;
                feasibilityWarnings.push(warnMsg);

                recommendations.push({
                    assetType: cls,
                    symbol: null,
                    portfolioId,
                    currentValue: d.currentVal,
                    currentWeightPercent: d.currentWeight,
                    targetWeightPercent: d.targetWeight,
                    driftPercentagePoints: d.driftPp,
                    action: 'HOLD_NON_TRADEABLE',
                    tradeability: 'NON_TRADEABLE',
                    isExecutable: false,
                    quoteStatus: 'LIVE',
                    referencePrice: 0,
                    requiredNotional: d.notionalDelta,
                    rawEstimatedQuantity: 0,
                    roundedTradeQuantity: 0,
                    roundingMode: 'NONE',
                    estimatedTaxImpact: 0,
                    reason: warnMsg
                });
                continue;
            }

            hasTradeableDrift = true;
            const classHoldings = activeHoldings.filter(h => (h.assetType || 'OTHER').toUpperCase() === cls);

            if (d.driftTag === 'UNDERWEIGHT') {
                // BUY recommendation
                if (classHoldings.length === 0) {
                    // Case B: No existing holding in underweight asset class (C6-10)
                    recommendations.push({
                        assetType: cls,
                        symbol: null,
                        portfolioId,
                        currentValue: 0,
                        currentWeightPercent: 0,
                        targetWeightPercent: d.targetWeight,
                        driftPercentagePoints: d.driftPp,
                        action: 'BUY',
                        tradeability: 'TRADEABLE',
                        isExecutable: false, // Requires user to specify specific asset to buy
                        quoteStatus: 'LIVE',
                        referencePrice: 0,
                        requiredNotional: d.notionalDelta,
                        rawEstimatedQuantity: 0,
                        roundedTradeQuantity: 0,
                        roundingMode: rule.mode,
                        estimatedTaxImpact: 0,
                        reason: `Underweight by ${Math.abs(d.driftPp).toFixed(2)} pp. Allocate ₹${d.notionalDelta.toFixed(2)} across new ${cls} security.`
                    });
                } else {
                    // Case A: Proportional buy allocation across existing holdings (C6-10)
                    const totalClassMktVal = classHoldings.reduce((acc, h) => acc + (Number(h.marketValue) || 0), 0);

                    const sortedHoldings = [...classHoldings].sort((a, b) => {
                        const valA = Number(a.marketValue) || 0;
                        const valB = Number(b.marketValue) || 0;
                        if (valB !== valA) return valB - valA;
                        return String(a.symbol || '').localeCompare(String(b.symbol || ''));
                    });

                    for (const h of sortedHoldings) {
                        const refPrice = Number(h.currentPrice) || Number(h.averageCost) || 0;
                        const hasLiveQuote = h.quoteStatus === 'LIVE' && refPrice > 0;
                        const holdingMktVal = Number(h.marketValue) || 0;
                        const proportion = totalClassMktVal > 0 ? (holdingMktVal / totalClassMktVal) : (1 / sortedHoldings.length);
                        const holdingNotional = d.notionalDelta * proportion;

                        if (refPrice <= 0 || !hasLiveQuote) {
                            // Scoped Quote Staleness (Hardening C6.2-02)
                            hasPriceRefreshRequired = true;
                            recommendations.push({
                                assetType: cls,
                                symbol: h.symbol,
                                portfolioId: h.portfolioId || portfolioId,
                                currentValue: holdingMktVal,
                                currentWeightPercent: investmentPortfolioValue > 0 ? (holdingMktVal / investmentPortfolioValue) * 100 : 0,
                                targetWeightPercent: d.targetWeight * proportion,
                                driftPercentagePoints: d.driftPp,
                                action: 'REQUIRES_PRICE_REFRESH',
                                tradeability: h.valuationBasis === 'COST_BASIS_FALLBACK' ? 'FALLBACK_VALUATION_ONLY' : 'INSUFFICIENT_QUOTE',
                                isExecutable: false,
                                quoteStatus: h.quoteStatus || 'UNAVAILABLE',
                                referencePrice: refPrice,
                                requiredNotional: holdingNotional,
                                rawEstimatedQuantity: 0,
                                roundedTradeQuantity: 0,
                                roundingMode: rule.mode,
                                estimatedTaxImpact: 0,
                                reason: `Live market quote unavailable for ${h.symbol}. Price refresh required before order calculation.`
                            });
                            continue;
                        }

                        const rawQty = holdingNotional / refPrice;
                        let roundedQty = 0;
                        if (rule.mode === 'FLOOR_WHOLE') {
                            roundedQty = Math.floor(rawQty);
                        } else if (rule.mode === 'DECIMAL_4') {
                            roundedQty = Number(rawQty.toFixed(4));
                        }

                        const execNotional = roundedQty * refPrice;
                        executableBuyNotional += execNotional;

                        recommendations.push({
                            assetType: cls,
                            symbol: h.symbol,
                            portfolioId: h.portfolioId || portfolioId,
                            currentValue: holdingMktVal,
                            currentWeightPercent: investmentPortfolioValue > 0 ? (holdingMktVal / investmentPortfolioValue) * 100 : 0,
                            targetWeightPercent: d.targetWeight * proportion,
                            driftPercentagePoints: d.driftPp,
                            action: 'BUY',
                            tradeability: 'TRADEABLE',
                            isExecutable: roundedQty > 0,
                            quoteStatus: 'LIVE',
                            referencePrice: refPrice,
                            requiredNotional: holdingNotional,
                            rawEstimatedQuantity: rawQty,
                            roundedTradeQuantity: roundedQty,
                            roundingMode: rule.mode,
                            estimatedTaxImpact: 0,
                            reason: `Buy ${roundedQty} ${h.symbol} at ₹${refPrice.toFixed(2)} to reduce underweight drift.`
                        });
                    }
                }
            } else if (d.driftTag === 'OVERWEIGHT') {
                // SELL recommendation (Proportional holding reduction in C.6.2; Tax-lot optimization in C.6.3)
                const sellNotionalAbs = Math.abs(d.notionalDelta);

                const sortedHoldings = [...classHoldings].sort((a, b) => {
                    const valA = Number(a.marketValue) || 0;
                    const valB = Number(b.marketValue) || 0;
                    if (valB !== valA) return valB - valA;
                    return String(a.symbol || '').localeCompare(String(b.symbol || ''));
                });

                const totalClassMktVal = sortedHoldings.reduce((acc, h) => acc + (Number(h.marketValue) || 0), 0);

                for (const h of sortedHoldings) {
                    const refPrice = Number(h.currentPrice) || Number(h.averageCost) || 0;
                    const hasLiveQuote = h.quoteStatus === 'LIVE' && refPrice > 0;
                    const holdingMktVal = Number(h.marketValue) || 0;
                    const proportion = totalClassMktVal > 0 ? (holdingMktVal / totalClassMktVal) : (1 / sortedHoldings.length);
                    const holdingSellNotional = sellNotionalAbs * proportion;

                    if (refPrice <= 0 || !hasLiveQuote) {
                        hasPriceRefreshRequired = true;
                        recommendations.push({
                            assetType: cls,
                            symbol: h.symbol,
                            portfolioId: h.portfolioId || portfolioId,
                            currentValue: holdingMktVal,
                            currentWeightPercent: investmentPortfolioValue > 0 ? (holdingMktVal / investmentPortfolioValue) * 100 : 0,
                            targetWeightPercent: d.targetWeight * proportion,
                            driftPercentagePoints: d.driftPp,
                            action: 'REQUIRES_PRICE_REFRESH',
                            tradeability: h.valuationBasis === 'COST_BASIS_FALLBACK' ? 'FALLBACK_VALUATION_ONLY' : 'INSUFFICIENT_QUOTE',
                            isExecutable: false,
                            quoteStatus: h.quoteStatus || 'UNAVAILABLE',
                            referencePrice: refPrice,
                            requiredNotional: -holdingSellNotional,
                            rawEstimatedQuantity: 0,
                            roundedTradeQuantity: 0,
                            roundingMode: rule.mode,
                            estimatedTaxImpact: 0,
                            reason: `Live market quote unavailable for ${h.symbol}. Price refresh required before sell order calculation.`
                        });
                        continue;
                    }

                    const rawQty = holdingSellNotional / refPrice;
                    let roundedQty = 0;
                    if (rule.mode === 'FLOOR_WHOLE') {
                        roundedQty = Math.min(Number(h.quantity) || 0, Math.floor(rawQty));
                    } else if (rule.mode === 'DECIMAL_4') {
                        roundedQty = Math.min(Number(h.quantity) || 0, Number(rawQty.toFixed(4)));
                    }

                    const execNotional = roundedQty * refPrice;
                    executableSellNotional += execNotional;

                    recommendations.push({
                        assetType: cls,
                        symbol: h.symbol,
                        portfolioId: h.portfolioId || portfolioId,
                        currentValue: holdingMktVal,
                        currentWeightPercent: investmentPortfolioValue > 0 ? (holdingMktVal / investmentPortfolioValue) * 100 : 0,
                        targetWeightPercent: d.targetWeight * proportion,
                        driftPercentagePoints: d.driftPp,
                        action: 'SELL',
                        tradeability: 'TRADEABLE',
                        isExecutable: roundedQty > 0,
                        quoteStatus: 'LIVE',
                        referencePrice: refPrice,
                        requiredNotional: -holdingSellNotional,
                        rawEstimatedQuantity: rawQty,
                        roundedTradeQuantity: roundedQty,
                        roundingMode: rule.mode,
                        estimatedTaxImpact: 0,
                        reason: `Sell ${roundedQty} ${h.symbol} at ₹${refPrice.toFixed(2)} to reduce overweight drift.`
                    });
                }
            }
        }

        // 6. Post-Rounding Notional Reconciliation & Rounding Residual (Hardening C6.2-01)
        const roundingResidual = Number((
            Math.abs(plannedBuyNotional - executableBuyNotional) +
            Math.abs(plannedSellNotional - executableSellNotional)
        ).toFixed(2));

        // 7. Realistic Projected Allocation & Residual Drift
        const projectedClassMap = {};
        for (const cls of CANONICAL_ASSET_CLASSES) {
            projectedClassMap[cls] = currentClassMap[cls].marketValue;
        }

        for (const rec of recommendations) {
            if (rec.isExecutable && rec.referencePrice > 0) {
                const deltaVal = rec.roundedTradeQuantity * rec.referencePrice;
                if (rec.action === 'BUY') {
                    projectedClassMap[rec.assetType] += deltaVal;
                } else if (rec.action === 'SELL') {
                    projectedClassMap[rec.assetType] = Math.max(0, projectedClassMap[rec.assetType] - deltaVal);
                }
            }
        }

        const postProjectedTotal = CANONICAL_ASSET_CLASSES.reduce((acc, cls) => acc + projectedClassMap[cls], 0);

        let maxResidualDriftPp = 0;
        const projectedAllocation = CANONICAL_ASSET_CLASSES.map(cls => {
            const projVal = Number(projectedClassMap[cls].toFixed(2));
            const projWeight = postProjectedTotal > 0 ? Number(((projVal / postProjectedTotal) * 100).toFixed(4)) : 0;
            const targetWeight = Number(policy.assetWeights[cls] || 0);
            const resDrift = Math.abs(projWeight - targetWeight);
            if (resDrift > maxResidualDriftPp) {
                maxResidualDriftPp = resDrift;
            }
            return {
                assetType: cls,
                projectedValue: projVal,
                projectedWeightPercent: projWeight
            };
        });

        // 8. Determine Overall Rebalancing Feasibility Status
        let rebalancingStatus = 'BALANCED';
        if (hasPriceRefreshRequired) {
            rebalancingStatus = 'PRICE_REFRESH_REQUIRED';
        } else if (!hasAnyDrift) {
            rebalancingStatus = 'BALANCED';
        } else if (hasNonTradeableDrift && !hasTradeableDrift) {
            rebalancingStatus = 'INFEASIBLE';
        } else if (hasNonTradeableDrift && hasTradeableDrift) {
            rebalancingStatus = 'PARTIALLY_FEASIBLE';
        } else {
            rebalancingStatus = 'ACTION_RECOMMENDED';
        }

        return {
            policyId: policy.policyId,
            asOfDate: asOfDateStr,
            portfolioId,
            investmentPortfolioValue: Number(investmentPortfolioValue.toFixed(2)),
            availableLiquidity: Number(availableCash.toFixed(2)),
            deployedLiquidity: Number(deployedLiquidity.toFixed(2)),
            postRebalancePortfolioValue: Number(postRebalancePortfolioValue.toFixed(2)),
            plannedBuyNotional: Number(plannedBuyNotional.toFixed(2)),
            plannedSellNotional: Number(plannedSellNotional.toFixed(2)),
            executableBuyNotional: Number(executableBuyNotional.toFixed(2)),
            executableSellNotional: Number(executableSellNotional.toFixed(2)),
            roundingResidual,
            currentAllocation,
            targetAllocation,
            recommendations,
            projectedAllocation,
            residualDriftPercentagePoints: Number(maxResidualDriftPp.toFixed(4)),
            rebalancingStatus,
            feasibilityWarnings,
            isConsistent: portfolioSummary.statementIntegrity !== 'INCOMPLETE',
            integrityWarnings: portfolioSummary.integrityWarnings || []
        };
    }
};

export default RebalancingEngine;
