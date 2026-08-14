/**
 * services/investingEngine.js
 * 
 * Pure Investment Calculation & Accounting Engine for Phase C.3.
 * Consumes canonical schemas from ./investingSchemas.js.
 * 
 * BOUNDARY RULE: This module owns investment-domain mathematics ONLY.
 * It NEVER calculates or owns Cash Balance, Net Worth, Account Balance,
 * Budget, Lifestyle Expenses, or Income.
 */

import {
    EventType,
    createHolding,
    createInvestmentEvent,
    parseNumericField
} from './investingSchemas.js';

/**
 * Calculates the Weighted Average Cost (WAC) for a holding across an array of events.
 * 
 * WAC = (Sum of BUY Quantity * BUY Price) / Total BUY Quantity
 * 
 * SELL events do NOT alter the average unit cost of remaining units.
 * 
 * @param {Array} events List of InvestmentEvent objects
 * @returns {Object} { netQuantity, averageCost, totalInvestedCost }
 */
export const calculateWeightedAverageCost = (events = []) => {
    if (!Array.isArray(events) || events.length === 0) {
        return { netQuantity: 0, averageCost: 0, totalInvestedCost: 0 };
    }

    let netQuantity = 0;
    let totalInvestedCost = 0;

    for (const evt of events) {
        if (!evt || evt.status === 'CANCELLED' || evt.status === 'FAILED') continue;

        const qty = parseNumericField(evt.quantity, 'evt.quantity', 0, false);
        const price = parseNumericField(evt.price, 'evt.price', 0, false);

        if (evt.type === EventType.BUY) {
            netQuantity += qty;
            totalInvestedCost += (qty * price);
        } else if (evt.type === EventType.BONUS) {
            // Bonus shares increase quantity with 0 added cost
            netQuantity += qty;
        } else if (evt.type === EventType.SPLIT) {
            // Stock split adjusts total quantity while preserving total cost
            if (qty > 0) {
                netQuantity = qty;
            }
        } else if (evt.type === EventType.SELL) {
            const currentAvgCost = netQuantity > 0 ? (totalInvestedCost / netQuantity) : 0;
            const sellQty = Math.min(qty, netQuantity);
            netQuantity -= sellQty;
            totalInvestedCost -= (sellQty * currentAvgCost);
        }
    }

    // Guard against floating point imprecision
    if (netQuantity <= 1e-9) {
        netQuantity = 0;
        totalInvestedCost = 0;
    }

    const averageCost = netQuantity > 0 ? (totalInvestedCost / netQuantity) : 0;

    return {
        netQuantity: Number(netQuantity.toFixed(6)),
        averageCost: Number(averageCost.toFixed(4)),
        totalInvestedCost: Number(totalInvestedCost.toFixed(2))
    };
};

/**
 * Calculates Realized P&L on a sale transaction.
 * 
 * Realized Gain = (sellQuantity * sellPrice) - (sellQuantity * weightedAverageCost) - fees - taxes
 * 
 * @param {number} sellQuantity 
 * @param {number} sellPrice 
 * @param {number} weightedAverageCost 
 * @param {number} fees 
 * @param {number} taxes 
 * @returns {Object} { saleProceeds, costBasis, realizedGain, netGain }
 */
export const calculateRealizedGain = (
    sellQuantity = 0,
    sellPrice = 0,
    weightedAverageCost = 0,
    fees = 0,
    taxes = 0
) => {
    const qty = parseNumericField(sellQuantity, 'sellQuantity', 0, false);
    const price = parseNumericField(sellPrice, 'sellPrice', 0, false);
    const wac = parseNumericField(weightedAverageCost, 'weightedAverageCost', 0, false);
    const feeVal = parseNumericField(fees, 'fees', 0, false);
    const taxVal = parseNumericField(taxes, 'taxes', 0, false);

    const saleProceeds = qty * price;
    const costBasis = qty * wac;
    const grossRealizedGain = saleProceeds - costBasis;
    const netRealizedGain = grossRealizedGain - feeVal - taxVal;

    return {
        saleProceeds: Number(saleProceeds.toFixed(2)),
        costBasis: Number(costBasis.toFixed(2)),
        grossRealizedGain: Number(grossRealizedGain.toFixed(2)),
        netRealizedGain: Number(netRealizedGain.toFixed(2))
    };
};

/**
 * Calculates Pure Investment Holding Summary.
 * 
 * Boundary Rule: Returns ONLY investment-domain metrics.
 * Does NOT return cash balances, bank account balances, or Net Worth.
 * 
 * @param {Object} holding Canonical Holding object
 * @param {Array} events List of related InvestmentEvents
 * @returns {Object} Holding summary metrics
 */
export const calculateHoldingSummary = (holding = {}, events = []) => {
    const validEvents = Array.isArray(events) ? events : [];
    const wacResult = calculateWeightedAverageCost(validEvents);

    let totalFees = 0;
    let totalTaxes = 0;
    let totalDividendsReceived = 0;
    let totalRealizedGain = 0;

    for (const evt of validEvents) {
        if (!evt || evt.status === 'CANCELLED' || evt.status === 'FAILED') continue;

        totalFees += parseNumericField(evt.fees, 'evt.fees', 0, false);
        totalTaxes += parseNumericField(evt.taxes, 'evt.taxes', 0, false);

        if (evt.type === EventType.DIVIDEND) {
            totalDividendsReceived += parseNumericField(evt.amount, 'evt.amount', 0, false);
        } else if (evt.type === EventType.SELL) {
            // Compute realized gain for this sell event
            const sellQty = parseNumericField(evt.quantity, 'evt.quantity', 0, false);
            const sellPrice = parseNumericField(evt.price, 'evt.price', 0, false);
            const pnl = calculateRealizedGain(sellQty, sellPrice, wacResult.averageCost, evt.fees, evt.taxes);
            totalRealizedGain += pnl.netRealizedGain;
        }
    }

    return {
        holdingId: holding.id || 'unknown',
        symbol: holding.symbol || 'UNKNOWN',
        quantity: wacResult.netQuantity,
        averageCost: wacResult.averageCost,
        totalInvestedCost: wacResult.totalInvestedCost,
        totalFees: Number(totalFees.toFixed(2)),
        totalTaxes: Number(totalTaxes.toFixed(2)),
        totalDividendsReceived: Number(totalDividendsReceived.toFixed(2)),
        totalRealizedGain: Number(totalRealizedGain.toFixed(2))
    };
};

/**
 * Pure Mathematical Unrealized P&L Helper.
 * 
 * @param {number} quantity 
 * @param {number} averageCost 
 * @param {number} currentPrice 
 * @returns {Object} { currentMarketValue, costBasis, unrealizedGain, percentageReturn }
 */
export const calculateUnrealizedGain = (quantity = 0, averageCost = 0, currentPrice = 0) => {
    const qty = parseNumericField(quantity, 'quantity', 0, false);
    const avgCost = parseNumericField(averageCost, 'averageCost', 0, false);
    const mktPrice = parseNumericField(currentPrice, 'currentPrice', 0, false);

    const costBasis = qty * avgCost;
    const currentMarketValue = qty * mktPrice;
    const unrealizedGain = currentMarketValue - costBasis;
    const percentageReturn = costBasis > 0 ? ((unrealizedGain / costBasis) * 100) : 0;

    return {
        costBasis: Number(costBasis.toFixed(2)),
        currentMarketValue: Number(currentMarketValue.toFixed(2)),
        unrealizedGain: Number(unrealizedGain.toFixed(2)),
        percentageReturn: Number(percentageReturn.toFixed(2))
    };
};

/**
 * Verification Suite for Stage C.3.1
 * Can be called during tests to verify core math and invariants.
 */
export const runDomainVerificationTests = () => {
    const results = [];

    // Test 1: WAC Calculation
    const events = [
        createInvestmentEvent({ type: EventType.BUY, quantity: 100, price: 100 }),
        createInvestmentEvent({ type: EventType.BUY, quantity: 100, price: 200 })
    ];
    const wac1 = calculateWeightedAverageCost(events);
    const pass1 = wac1.netQuantity === 200 && wac1.averageCost === 150 && wac1.totalInvestedCost === 30000;
    results.push({ test: 'WAC Buy Calculation', pass: pass1, details: wac1 });

    // Test 2: Partial Sell Calculation
    const sellGain = calculateRealizedGain(50, 250, 150, 0, 0);
    const pass2 = sellGain.costBasis === 7500 && sellGain.saleProceeds === 12500 && sellGain.netRealizedGain === 5000;
    results.push({ test: 'Partial Sell Realized P&L', pass: pass2, details: sellGain });

    // Test 3: Post-Sell Remaining WAC Preserving
    events.push(createInvestmentEvent({ type: EventType.SELL, quantity: 50, price: 250 }));
    const wac2 = calculateWeightedAverageCost(events);
    const pass3 = wac2.netQuantity === 150 && wac2.averageCost === 150 && wac2.totalInvestedCost === 22500;
    results.push({ test: 'Post-Sell Remaining WAC Preservation', pass: pass3, details: wac2 });

    return {
        allPassed: results.every(r => r.pass),
        results
    };
};
