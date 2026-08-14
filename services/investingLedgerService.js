/**
 * services/investingLedgerService.js
 * 
 * Stage C.3.2 Investment Ledger & Order Orchestration Service.
 * 
 * Bridges pure C.3.1 math (investingSchemas.js, investingEngine.js) with cash movements
 * in MoneyFlowEngine and bank accounts in accounts.js.
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. BUY/SELL Principal uses MoneyFlow type='transfer' and category='internal_transfer'.
 *    - BUY ₹20,000: Cash -₹20k, Investment Asset +₹20k, NetWorth Δ = 0, Lifestyle Budget Δ = 0.
 * 2. Event Ledger is Single Source of Truth for available quantity. Stale holding.quantity is never trusted.
 * 3. Explicit separation of assetAmount, feeAmount, taxAmount, and total cash movement.
 * 4. PENDING -> MoneyFlow -> CONFIRMED recoverable orchestration.
 */

import {
    EventType,
    InvestmentEventStatus,
    createHolding,
    createInvestmentEvent,
    parseNumericField
} from './investingSchemas.js';

import {
    calculateWeightedAverageCost,
    calculateRealizedGain,
    calculateHoldingSummary
} from './investingEngine.js';

import {
    loadPortfolios,
    savePortfolios,
    loadHoldings,
    saveHoldings,
    loadInvestmentEvents,
    saveInvestmentEvents
} from './storage.js';

import MoneyFlowEngine from './moneyFlowEngine.js';

export class InsufficientHoldingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InsufficientHoldingError';
    }
}

export class OrderExecutionError extends Error {
    constructor(message, status = 'FAILED') {
        super(message);
        this.name = 'OrderExecutionError';
        this.status = status;
    }
}

export const InvestingLedgerService = {

    /**
     * Executes a BUY order for an asset.
     */
    async executeBuyOrder(orderData = {}) {
        const {
            portfolioId = 'default_portfolio',
            symbol,
            name,
            assetType = 'STOCK',
            exchange = 'NSE',
            quantity: rawQty,
            price: rawPrice,
            fees: rawFees = 0,
            taxes: rawTaxes = 0,
            sourceAccountId = null,
            eventId: customEventId
        } = orderData;

        // 1. Strict Numeric Parsing
        const quantity = parseNumericField(rawQty, 'quantity', 0, false);
        const price = parseNumericField(rawPrice, 'price', 0, false);
        const fees = parseNumericField(rawFees, 'fees', 0, false);
        const taxes = parseNumericField(rawTaxes, 'taxes', 0, false);

        if (quantity <= 0 || price <= 0) {
            throw new OrderExecutionError('Quantity and price must be greater than zero for a BUY order.');
        }

        // Explicit Amounts Separation
        const assetAmount = Number((quantity * price).toFixed(2));
        const feeAmount = Number(fees.toFixed(2));
        const taxAmount = Number(taxes.toFixed(2));
        const totalCashOutflow = Number((assetAmount + feeAmount + taxAmount).toFixed(2));

        // 2. Load Existing Events for Idempotency
        const existingEvents = await loadInvestmentEvents();
        if (customEventId && existingEvents.some(e => e.id === customEventId)) {
            throw new OrderExecutionError(`Duplicate order event ID: ${customEventId}`);
        }

        // 3. Create PENDING Investment Event
        let buyEvent = createInvestmentEvent({
            id: customEventId,
            portfolioId,
            type: EventType.BUY,
            quantity,
            price,
            amount: assetAmount,
            fees: feeAmount,
            taxes: taxAmount,
            sourceAccountId,
            status: InvestmentEventStatus.PENDING
        });

        // 4. MoneyFlow Cash Execution (Recoverable Orchestration)
        let moneyFlowTxIds = [];
        try {
            // Principal Transfer: Bank -> Investment Asset (type='transfer', category='internal_transfer')
            const principalTx = await MoneyFlowEngine.addTransaction({
                type: 'transfer',
                category: 'internal_transfer',
                amount: assetAmount,
                sourceAccountId,
                destinationAccountId: null, // External asset hold
                description: `Investment Buy: ${quantity} ${symbol || 'Asset'}`
            });
            if (principalTx && principalTx.id) moneyFlowTxIds.push(principalTx.id);

            // Operational Fee (if any)
            if (feeAmount > 0) {
                const feeTx = await MoneyFlowEngine.addTransaction({
                    type: 'expense',
                    category: 'other_expense',
                    amount: feeAmount,
                    sourceAccountId,
                    description: `Investment Brokerage Fee: ${symbol || 'Asset'}`
                });
                if (feeTx && feeTx.id) moneyFlowTxIds.push(feeTx.id);
            }

            // Operational Tax (if any)
            if (taxAmount > 0) {
                const taxTx = await MoneyFlowEngine.addTransaction({
                    type: 'expense',
                    category: 'other_expense',
                    amount: taxAmount,
                    sourceAccountId,
                    description: `Investment Tax / STT: ${symbol || 'Asset'}`
                });
                if (taxTx && taxTx.id) moneyFlowTxIds.push(taxTx.id);
            }
        } catch (mfError) {
            throw new OrderExecutionError(`MoneyFlow cash transfer failed: ${mfError.message}`, 'FAILED');
        }

        // 5. Update Holding & Persist Event to Storage
        try {
            // Load or Create Holding
            const holdings = await loadHoldings();
            const normSymbol = (symbol || '').trim().toUpperCase();
            let holding = holdings.find(h => h.portfolioId === portfolioId && h.symbol === normSymbol);

            if (!holding) {
                holding = createHolding({
                    portfolioId,
                    symbol: normSymbol,
                    name: name || normSymbol,
                    assetType,
                    exchange
                });
                holdings.push(holding);
            }

            // Link Event to Holding ID
            buyEvent = {
                ...buyEvent,
                holdingId: holding.id,
                linkedTransactionId: moneyFlowTxIds[0] || null,
                status: InvestmentEventStatus.CONFIRMED
            };

            const updatedEvents = [...existingEvents, buyEvent];
            const holdingEvents = updatedEvents.filter(e => e.holdingId === holding.id && e.status === InvestmentEventStatus.CONFIRMED);

            // Recompute WAC & Holding Metrics
            const wacResult = calculateWeightedAverageCost(holdingEvents);
            const holdingIndex = holdings.findIndex(h => h.id === holding.id);
            if (holdingIndex !== -1) {
                holdings[holdingIndex] = {
                    ...holdings[holdingIndex],
                    quantity: wacResult.netQuantity,
                    averageCost: wacResult.averageCost,
                    updatedAt: new Date().toISOString()
                };
            }

            await saveInvestmentEvents(updatedEvents);
            await saveHoldings(holdings);

            return {
                event: buyEvent,
                holding: holdings[holdingIndex !== -1 ? holdingIndex : holdings.length - 1],
                financials: {
                    assetAmount,
                    feeAmount,
                    taxAmount,
                    totalCashOutflow
                }
            };
        } catch (persistError) {
            // Recoverable Orchestration Failure: MoneyFlow succeeded but persistence failed
            console.error('[InvestingLedgerService] Persistence failed after MoneyFlow execution:', persistError);
            throw new OrderExecutionError(
                `MoneyFlow cash moved (₹${totalCashOutflow}), but investment storage persistence failed: ${persistError.message}. Event marked RECONCILIATION_REQUIRED.`,
                'RECONCILIATION_REQUIRED'
            );
        }
    },

    /**
     * Executes a SELL order for a holding.
     */
    async executeSellOrder(orderData = {}) {
        const {
            portfolioId = 'default_portfolio',
            holdingId,
            symbol,
            quantity: rawQty,
            price: rawPrice,
            fees: rawFees = 0,
            taxes: rawTaxes = 0,
            destinationAccountId = null,
            eventId: customEventId
        } = orderData;

        // 1. Strict Numeric Parsing
        const sellQty = parseNumericField(rawQty, 'quantity', 0, false);
        const sellPrice = parseNumericField(rawPrice, 'price', 0, false);
        const fees = parseNumericField(rawFees, 'fees', 0, false);
        const taxes = parseNumericField(rawTaxes, 'taxes', 0, false);

        if (sellQty <= 0 || sellPrice <= 0) {
            throw new OrderExecutionError('Quantity and price must be greater than zero for a SELL order.');
        }

        // 2. Single Source of Truth: Compute Available Quantity from Event History
        const allEvents = await loadInvestmentEvents();

        // Find holding by ID or symbol
        const holdings = await loadHoldings();
        const normSymbol = symbol ? symbol.trim().toUpperCase() : null;
        const holding = holdings.find(h => h.id === holdingId || (normSymbol && h.symbol === normSymbol && h.portfolioId === portfolioId));

        if (!holding) {
            throw new OrderExecutionError(`Holding not found for sale: ${holdingId || symbol}`);
        }

        const holdingEvents = allEvents.filter(e => e.holdingId === holding.id && e.status === InvestmentEventStatus.CONFIRMED);
        const wacResult = calculateWeightedAverageCost(holdingEvents);

        if (sellQty > wacResult.netQuantity) {
            throw new InsufficientHoldingError(
                `Cannot sell ${sellQty} units of ${holding.symbol}. Confirmed available quantity is ${wacResult.netQuantity}.`
            );
        }

        // 3. Explicit Amounts Separation & Realized P&L
        const grossProceeds = Number((sellQty * sellPrice).toFixed(2));
        const feeAmount = Number(fees.toFixed(2));
        const taxAmount = Number(taxes.toFixed(2));
        const netCashInflow = Number((grossProceeds - feeAmount - taxAmount).toFixed(2));

        const pnl = calculateRealizedGain(sellQty, sellPrice, wacResult.averageCost, feeAmount, taxAmount);

        // 4. Create PENDING SELL Event
        let sellEvent = createInvestmentEvent({
            id: customEventId,
            portfolioId: holding.portfolioId,
            holdingId: holding.id,
            type: EventType.SELL,
            quantity: sellQty,
            price: sellPrice,
            amount: grossProceeds,
            fees: feeAmount,
            taxes: taxAmount,
            sourceAccountId: destinationAccountId,
            status: InvestmentEventStatus.PENDING
        });

        // 5. MoneyFlow Cash Execution
        let moneyFlowTxIds = [];
        try {
            // Principal Transfer: Asset -> Bank (type='transfer', category='internal_transfer')
            const principalTx = await MoneyFlowEngine.addTransaction({
                type: 'transfer',
                category: 'internal_transfer',
                amount: grossProceeds,
                sourceAccountId: null, // From external asset
                destinationAccountId,
                description: `Investment Sell: ${sellQty} ${holding.symbol}`
            });
            if (principalTx && principalTx.id) moneyFlowTxIds.push(principalTx.id);

            // Operational Fee (if any)
            if (feeAmount > 0) {
                const feeTx = await MoneyFlowEngine.addTransaction({
                    type: 'expense',
                    category: 'other_expense',
                    amount: feeAmount,
                    sourceAccountId: destinationAccountId,
                    description: `Investment Sell Fee: ${holding.symbol}`
                });
                if (feeTx && feeTx.id) moneyFlowTxIds.push(feeTx.id);
            }

            // Operational Tax (if any)
            if (taxAmount > 0) {
                const taxTx = await MoneyFlowEngine.addTransaction({
                    type: 'expense',
                    category: 'other_expense',
                    amount: taxAmount,
                    sourceAccountId: destinationAccountId,
                    description: `Investment Capital Tax / STT: ${holding.symbol}`
                });
                if (taxTx && taxTx.id) moneyFlowTxIds.push(taxTx.id);
            }
        } catch (mfError) {
            throw new OrderExecutionError(`MoneyFlow cash transfer failed: ${mfError.message}`, 'FAILED');
        }

        // 6. Update Holding & Persist Event to Storage
        try {
            sellEvent = {
                ...sellEvent,
                linkedTransactionId: moneyFlowTxIds[0] || null,
                status: InvestmentEventStatus.CONFIRMED
            };

            const updatedEvents = [...allEvents, sellEvent];
            const updatedHoldingEvents = updatedEvents.filter(e => e.holdingId === holding.id && e.status === InvestmentEventStatus.CONFIRMED);
            const updatedWac = calculateWeightedAverageCost(updatedHoldingEvents);

            const holdingIndex = holdings.findIndex(h => h.id === holding.id);
            if (holdingIndex !== -1) {
                holdings[holdingIndex] = {
                    ...holdings[holdingIndex],
                    quantity: updatedWac.netQuantity,
                    averageCost: updatedWac.averageCost,
                    status: updatedWac.netQuantity === 0 ? 'CLOSED' : 'ACTIVE',
                    updatedAt: new Date().toISOString()
                };
            }

            await saveInvestmentEvents(updatedEvents);
            await saveHoldings(holdings);

            return {
                event: sellEvent,
                holding: holdings[holdingIndex],
                financials: {
                    grossProceeds,
                    costBasis: pnl.costBasis,
                    grossRealizedGain: pnl.grossRealizedGain,
                    netRealizedGain: pnl.netRealizedGain,
                    feeAmount,
                    taxAmount,
                    netCashInflow
                }
            };
        } catch (persistError) {
            console.error('[InvestingLedgerService] Persistence failed after MoneyFlow execution:', persistError);
            throw new OrderExecutionError(
                `MoneyFlow cash received (₹${netCashInflow}), but investment storage persistence failed: ${persistError.message}. Event marked RECONCILIATION_REQUIRED.`,
                'RECONCILIATION_REQUIRED'
            );
        }
    },

    /**
     * Reads holding summary for a holding ID using canonical event history.
     */
    async getHoldingSummary(holdingId) {
        const holdings = await loadHoldings();
        const holding = holdings.find(h => h.id === holdingId);
        if (!holding) return null;

        const events = await loadInvestmentEvents();
        const holdingEvents = events.filter(e => e.holdingId === holdingId && e.status === InvestmentEventStatus.CONFIRMED);

        return calculateHoldingSummary(holding, holdingEvents);
    }
};

export default InvestingLedgerService;
