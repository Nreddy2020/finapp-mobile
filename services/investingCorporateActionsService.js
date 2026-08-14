/**
 * services/investingCorporateActionsService.js
 * 
 * Stage C.3.6 Corporate Actions (SPLIT & BONUS Engine).
 * 
 * ARCHITECTURAL RESPONSIBILITIES:
 * 1. Execute Bonus Share Issues (1:1, 1:2, etc.) updating holding quantity & WAC while keeping total cost basis constant.
 * 2. Execute Stock Splits (1:5, 1:10, etc.) updating holding quantity & WAC while keeping total cost basis constant.
 * 3. Enforce Hard Cost-Basis Assertion: Math.abs(oldCostBasis - newCostBasis) <= 0.05.
 * 4. Multi-Portfolio Holding Protection: Scope holding updates strictly by portfolioId + holdingId/symbol.
 * 5. State-Aware Idempotency & Recovery: Re-evaluates BEFORE/AFTER holding state for PENDING/FAILED events before mutating.
 * 6. Audit Metadata Logging: Records before & after snapshot in event.metadata.
 * 7. Storage Failure Result Inspection: Wraps save operations in throw-on-false helpers.
 * 
 * STRICT INVARIANTS:
 * - ZERO MONEYFLOW CALLS (Delta Cash = ₹0, Delta Lifestyle Expenses = ₹0).
 * - Zero modification to frozen files (moneyFlowEngine.js, investingSchemas.js, storage.js, app/(tabs)/*).
 */

import { loadHoldings, saveHoldings, loadInvestmentEvents, saveInvestmentEvents } from './storage.js';
import { createInvestmentEvent, EventType, InvestmentEventStatus } from './investingSchemas.js';

/**
 * Storage safe wrapper to throw if storage returns { success: false }
 */
async function safeSaveInvestmentEvents(events) {
    const res = await saveInvestmentEvents(events);
    if (res && res.success === false) {
        throw new Error(`[Storage] Failed to save investment events: ${res.error || 'Unknown storage error'}`);
    }
    return res;
}

/**
 * Storage safe wrapper to throw if storage returns { success: false }
 */
async function safeSaveHoldings(holdings) {
    const res = await saveHoldings(holdings);
    if (res && res.success === false) {
        throw new Error(`[Storage] Failed to save holdings: ${res.error || 'Unknown storage error'}`);
    }
    return res;
}

export const InvestingCorporateActionsService = {
    /**
     * Executes a Bonus Share Issue for a specific holding in a portfolio.
     * 
     * FORMULA:
     * bonusShares = oldQuantity * bonusRatio
     * newQuantity = oldQuantity + bonusShares
     * newWAC = oldCostBasis / newQuantity
     * Total Cost Basis remains 100% Constant!
     */
    async executeBonusIssue(params = {}) {
        const {
            eventId,
            portfolioId = 'default_portfolio',
            holdingId = null,
            symbol,
            bonusRatio = 1.0,
            date = new Date().toISOString()
        } = params;

        if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
            throw new Error('[InvestingCorporateActionsService] eventId is required for idempotency');
        }
        if (!symbol || typeof symbol !== 'string' || !symbol.trim()) {
            throw new Error('[InvestingCorporateActionsService] symbol is required');
        }
        const ratio = Number(bonusRatio);
        if (!Number.isFinite(ratio) || ratio <= 0) {
            throw new Error('[InvestingCorporateActionsService] bonusRatio must be a positive finite number');
        }

        const normSymbol = symbol.trim().toUpperCase();
        const allEvents = await loadInvestmentEvents();
        const existingEvent = allEvents.find(e => e.id === eventId);

        if (existingEvent && existingEvent.status === InvestmentEventStatus.CONFIRMED) {
            throw new Error(`[InvestingCorporateActionsService] Duplicate eventId '${eventId}' rejected`);
        }

        // Load holding
        const holdings = await loadHoldings();
        const holdingIndex = holdings.findIndex(h => {
            if (h.portfolioId !== portfolioId) return false;
            if (holdingId) return h.id === holdingId;
            return h.symbol.toUpperCase() === normSymbol;
        });

        if (holdingIndex === -1) {
            throw new Error(`[InvestingCorporateActionsService] Holding not found for portfolio '${portfolioId}' and symbol '${normSymbol}'`);
        }

        const currentHolding = holdings[holdingIndex];
        const oldQty = Number(currentHolding.quantity);
        const oldWAC = Number(currentHolding.averageCost);

        if (!Number.isFinite(oldQty) || oldQty <= 0 || !Number.isFinite(oldWAC) || oldWAC <= 0) {
            throw new Error(`[InvestingCorporateActionsService] Invalid holding quantity or averageCost for '${normSymbol}'`);
        }
        const oldCostBasis = Number((oldQty * oldWAC).toFixed(2));

        const bonusShares = Number((oldQty * ratio).toFixed(4));
        const newQty = Number((oldQty + bonusShares).toFixed(4));
        const newWAC = Number((oldCostBasis / newQty).toFixed(4));
        const newCostBasis = Number((newQty * newWAC).toFixed(2));

        // State-Aware Recovery Check for PENDING/FAILED events
        if (existingEvent && (existingEvent.status === InvestmentEventStatus.PENDING || existingEvent.status === InvestmentEventStatus.FAILED)) {
            const meta = existingEvent.metadata || {};
            const isAlreadyApplied = Math.abs(oldQty - meta.quantityAfter) < 0.001 && Math.abs(oldWAC - meta.averageCostAfter) < 0.05;
            const isUnapplied = Math.abs(oldQty - meta.quantityBefore) < 0.001 && Math.abs(oldWAC - meta.averageCostBefore) < 0.05;

            if (isAlreadyApplied) {
                // Recovery: Holding mutation already happened! Confirm event directly without re-applying.
                console.log(`[InvestingCorporateActionsService] Recovery: Event ${eventId} holding already mutated. Confirming event.`);
                const updatedEvents = allEvents.map(e => e.id === eventId ? { ...e, status: InvestmentEventStatus.CONFIRMED, updatedAt: new Date().toISOString() } : e);
                await safeSaveInvestmentEvents(updatedEvents);
                return {
                    status: 'SUCCESS',
                    recovered: true,
                    event: { ...existingEvent, status: InvestmentEventStatus.CONFIRMED },
                    holding: currentHolding
                };
            } else if (!isUnapplied) {
                throw new Error(`[InvestingCorporateActionsService] State reconciliation required for event '${eventId}'. Holding state does not match before/after metadata.`);
            }
        }

        // Hard Cost-Basis Assertion
        if (Math.abs(oldCostBasis - newCostBasis) > 0.05) {
            throw new Error(`[InvestingCorporateActionsService] Cost basis invariant violation: old ₹${oldCostBasis} vs new ₹${newCostBasis}`);
        }

        const metadata = {
            action: 'BONUS',
            bonusRatio: ratio,
            bonusShares,
            quantityBefore: oldQty,
            quantityAfter: newQty,
            averageCostBefore: oldWAC,
            averageCostAfter: newWAC,
            totalCostBasisBefore: oldCostBasis,
            totalCostBasisAfter: newCostBasis
        };

        // Step 1: Persist PENDING Event
        const pendingSchemaEvent = createInvestmentEvent({
            id: eventId,
            portfolioId,
            holdingId: currentHolding.id,
            symbol: normSymbol,
            type: EventType.BONUS,
            quantity: bonusShares,
            price: 0,
            amount: 0,
            fees: 0,
            taxes: 0,
            date: new Date(date).toISOString(),
            status: InvestmentEventStatus.PENDING
        });

        const pendingEvent = { ...pendingSchemaEvent, metadata };
        const eventsList = existingEvent ? allEvents.map(e => e.id === eventId ? pendingEvent : e) : [...allEvents, pendingEvent];
        await safeSaveInvestmentEvents(eventsList);

        try {
            // Step 2: Persist Updated Holding
            const updatedHolding = {
                ...currentHolding,
                quantity: newQty,
                averageCost: newWAC,
                updatedAt: new Date().toISOString()
            };
            holdings[holdingIndex] = updatedHolding;
            await safeSaveHoldings(holdings);

            // Step 3: Persist CONFIRMED Event Status
            const confirmedEvent = { ...pendingEvent, status: InvestmentEventStatus.CONFIRMED, updatedAt: new Date().toISOString() };
            const confirmedEvents = (await loadInvestmentEvents()).map(e => e.id === eventId ? confirmedEvent : e);
            await safeSaveInvestmentEvents(confirmedEvents);

            return {
                status: 'SUCCESS',
                event: confirmedEvent,
                holding: updatedHolding,
                bonusShares
            };
        } catch (err) {
            console.error('[InvestingCorporateActionsService] Persistence error post-PENDING:', err);
            const failedEvent = {
                ...pendingEvent,
                status: InvestmentEventStatus.FAILED,
                metadata: {
                    ...pendingEvent.metadata,
                    reconciliationNote: `Persistence error: ${err.message}`
                },
                updatedAt: new Date().toISOString()
            };
            try {
                const currentEvts = await loadInvestmentEvents();
                await safeSaveInvestmentEvents(currentEvts.map(e => e.id === eventId ? failedEvent : e));
            } catch (e) {}
            return {
                status: 'FAILED',
                reconciliationRequired: true,
                error: err.message,
                event: failedEvent
            };
        }
    },

    /**
     * Executes a Stock Split for a specific holding in a portfolio.
     * 
     * FORMULA:
     * newQuantity = oldQuantity * splitFactor
     * newWAC = oldAverageCost / splitFactor
     * Total Cost Basis remains 100% Constant!
     */
    async executeStockSplit(params = {}) {
        const {
            eventId,
            portfolioId = 'default_portfolio',
            holdingId = null,
            symbol,
            splitFactor = 2.0,
            date = new Date().toISOString()
        } = params;

        if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
            throw new Error('[InvestingCorporateActionsService] eventId is required for idempotency');
        }
        if (!symbol || typeof symbol !== 'string' || !symbol.trim()) {
            throw new Error('[InvestingCorporateActionsService] symbol is required');
        }
        const factor = Number(splitFactor);
        if (!Number.isFinite(factor) || factor <= 1) {
            throw new Error('[InvestingCorporateActionsService] splitFactor must be a finite number greater than 1');
        }

        const normSymbol = symbol.trim().toUpperCase();
        const allEvents = await loadInvestmentEvents();
        const existingEvent = allEvents.find(e => e.id === eventId);

        if (existingEvent && existingEvent.status === InvestmentEventStatus.CONFIRMED) {
            throw new Error(`[InvestingCorporateActionsService] Duplicate eventId '${eventId}' rejected`);
        }

        // Load holding
        const holdings = await loadHoldings();
        const holdingIndex = holdings.findIndex(h => {
            if (h.portfolioId !== portfolioId) return false;
            if (holdingId) return h.id === holdingId;
            return h.symbol.toUpperCase() === normSymbol;
        });

        if (holdingIndex === -1) {
            throw new Error(`[InvestingCorporateActionsService] Holding not found for portfolio '${portfolioId}' and symbol '${normSymbol}'`);
        }

        const currentHolding = holdings[holdingIndex];
        const oldQty = Number(currentHolding.quantity);
        const oldWAC = Number(currentHolding.averageCost);

        if (!Number.isFinite(oldQty) || oldQty <= 0 || !Number.isFinite(oldWAC) || oldWAC <= 0) {
            throw new Error(`[InvestingCorporateActionsService] Invalid holding quantity or averageCost for '${normSymbol}'`);
        }
        const oldCostBasis = Number((oldQty * oldWAC).toFixed(2));

        const newQty = Number((oldQty * factor).toFixed(4));
        const newWAC = Number((oldWAC / factor).toFixed(4));
        const newCostBasis = Number((newQty * newWAC).toFixed(2));

        // State-Aware Recovery Check for PENDING/FAILED events
        if (existingEvent && (existingEvent.status === InvestmentEventStatus.PENDING || existingEvent.status === InvestmentEventStatus.FAILED)) {
            const meta = existingEvent.metadata || {};
            const isAlreadyApplied = Math.abs(oldQty - meta.quantityAfter) < 0.001 && Math.abs(oldWAC - meta.averageCostAfter) < 0.05;
            const isUnapplied = Math.abs(oldQty - meta.quantityBefore) < 0.001 && Math.abs(oldWAC - meta.averageCostBefore) < 0.05;

            if (isAlreadyApplied) {
                console.log(`[InvestingCorporateActionsService] Recovery: Event ${eventId} holding already mutated. Confirming event.`);
                const updatedEvents = allEvents.map(e => e.id === eventId ? { ...e, status: InvestmentEventStatus.CONFIRMED, updatedAt: new Date().toISOString() } : e);
                await safeSaveInvestmentEvents(updatedEvents);
                return {
                    status: 'SUCCESS',
                    recovered: true,
                    event: { ...existingEvent, status: InvestmentEventStatus.CONFIRMED },
                    holding: currentHolding
                };
            } else if (!isUnapplied) {
                throw new Error(`[InvestingCorporateActionsService] State reconciliation required for event '${eventId}'. Holding state does not match before/after metadata.`);
            }
        }

        // Hard Cost-Basis Assertion
        if (Math.abs(oldCostBasis - newCostBasis) > 0.05) {
            throw new Error(`[InvestingCorporateActionsService] Cost basis invariant violation: old ₹${oldCostBasis} vs new ₹${newCostBasis}`);
        }

        const metadata = {
            action: 'SPLIT',
            splitFactor: factor,
            bonusRatio: null,
            quantityBefore: oldQty,
            quantityAfter: newQty,
            averageCostBefore: oldWAC,
            averageCostAfter: newWAC,
            totalCostBasisBefore: oldCostBasis,
            totalCostBasisAfter: newCostBasis
        };

        // Step 1: Persist PENDING Event
        const pendingSchemaEvent = createInvestmentEvent({
            id: eventId,
            portfolioId,
            holdingId: currentHolding.id,
            symbol: normSymbol,
            type: EventType.SPLIT,
            quantity: newQty - oldQty,
            price: 0,
            amount: 0,
            fees: 0,
            taxes: 0,
            date: new Date(date).toISOString(),
            status: InvestmentEventStatus.PENDING
        });

        const pendingEvent = { ...pendingSchemaEvent, metadata };
        const eventsList = existingEvent ? allEvents.map(e => e.id === eventId ? pendingEvent : e) : [...allEvents, pendingEvent];
        await safeSaveInvestmentEvents(eventsList);

        try {
            // Step 2: Persist Updated Holding
            const updatedHolding = {
                ...currentHolding,
                quantity: newQty,
                averageCost: newWAC,
                updatedAt: new Date().toISOString()
            };
            holdings[holdingIndex] = updatedHolding;
            await safeSaveHoldings(holdings);

            // Step 3: Persist CONFIRMED Event Status
            const confirmedEvent = { ...pendingEvent, status: InvestmentEventStatus.CONFIRMED, updatedAt: new Date().toISOString() };
            const confirmedEvents = (await loadInvestmentEvents()).map(e => e.id === eventId ? confirmedEvent : e);
            await safeSaveInvestmentEvents(confirmedEvents);

            return {
                status: 'SUCCESS',
                event: confirmedEvent,
                holding: updatedHolding
            };
        } catch (err) {
            console.error('[InvestingCorporateActionsService] Persistence error post-PENDING:', err);
            const failedEvent = {
                ...pendingEvent,
                status: InvestmentEventStatus.FAILED,
                metadata: {
                    ...pendingEvent.metadata,
                    reconciliationNote: `Persistence error: ${err.message}`
                },
                updatedAt: new Date().toISOString()
            };
            try {
                const currentEvts = await loadInvestmentEvents();
                await safeSaveInvestmentEvents(currentEvts.map(e => e.id === eventId ? failedEvent : e));
            } catch (e) {}
            return {
                status: 'FAILED',
                reconciliationRequired: true,
                error: err.message,
                event: failedEvent
            };
        }
    },

    /**
     * Queries Corporate Actions history for audit logging.
     */
    async getCorporateActionsHistory(filter = {}) {
        const { portfolioId, symbol } = filter;
        const allEvents = await loadInvestmentEvents();

        const actions = allEvents.filter(e => {
            if (![EventType.BONUS, EventType.SPLIT].includes(e.type)) return false;
            if (e.status !== InvestmentEventStatus.CONFIRMED) return false;
            if (portfolioId && e.portfolioId !== portfolioId) return false;
            if (symbol && e.symbol !== symbol.toUpperCase()) return false;
            return true;
        });

        return {
            events: actions,
            count: actions.length
        };
    }
};

export default InvestingCorporateActionsService;
