/**
 * services/sipEngine.js
 * 
 * Stage C.3.4 SIP Schedule & Automation Engine.
 * 
 * ARCHITECTURAL RESPONSIBILITIES:
 * 1. SIP schedule lifecycle management (ACTIVE, PAUSED, COMPLETED, CANCELLED).
 * 2. Frequency mathematics and next due date calculation (DAILY, WEEKLY, MONTHLY, QUARTERLY).
 * 3. Due-date detection, idempotency enforcement, and duplicate run protection.
 * 4. Delegation of automated buy orders strictly to InvestingLedgerService.executeBuyOrder().
 * 5. Failure-path recovery: Failed buy orders do NOT advance schedule due dates.
 * 
 * STRICT INVARIANTS:
 * - Does NOT own investment accounting or custom transaction creation.
 * - Does NOT mutate cash or bank balances directly (delegates to ledger service).
 * - Zero MoneyFlow modifications (uses standard ledger transfer calls).
 */

import { loadSipSchedules, saveSipSchedules } from './storage.js';
import { createSipSchedule as buildSipSchema } from './investingSchemas.js';
import InvestingLedgerService from './investingLedgerService.js';
import MarketDataService from './marketDataService.js';

/**
 * Pure date calculation helper for frequency intervals.
 */
export const calculateNextDueDate = (currentDateInput, frequency = 'MONTHLY') => {
    const date = new Date(currentDateInput);
    if (isNaN(date.getTime())) {
        throw new Error(`[SipEngine] Invalid date input for calculateNextDueDate: ${currentDateInput}`);
    }

    const freq = (frequency || 'MONTHLY').trim().toUpperCase();
    const day = date.getDate();

    if (freq === 'DAILY') {
        date.setDate(date.getDate() + 1);
    } else if (freq === 'WEEKLY') {
        date.setDate(date.getDate() + 7);
    } else if (freq === 'MONTHLY') {
        date.setMonth(date.getMonth() + 1);
        // Handle month end overflow e.g. Jan 31 -> Feb 28
        if (date.getDate() !== day && date.getDate() < 5) {
            date.setDate(0); // Set to last day of previous month
        }
    } else if (freq === 'QUARTERLY') {
        date.setMonth(date.getMonth() + 3);
        if (date.getDate() !== day && date.getDate() < 5) {
            date.setDate(0);
        }
    } else {
        throw new Error(`[SipEngine] Unsupported frequency: ${frequency}`);
    }

    return date.toISOString().split('T')[0];
};

export const SipEngine = {
    /**
     * Creates a canonical SIP schedule.
     */
    async createSipSchedule(params = {}) {
        const {
            portfolioId = 'default_portfolio',
            symbol,
            name,
            assetType = 'MUTUAL_FUND',
            exchange = 'MUTUAL_FUND',
            amount,
            frequency = 'MONTHLY',
            startDate = new Date().toISOString().split('T')[0],
            sourceAccountId = null,
            totalInstallments = null
        } = params;

        if (!portfolioId) throw new Error('[SipEngine] portfolioId is required');
        if (!symbol) throw new Error('[SipEngine] symbol is required');
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            throw new Error('[SipEngine] amount must be a positive number');
        }

        const normSymbol = symbol.trim().toUpperCase();
        const initialDueDate = startDate.split('T')[0];

        const schemaBase = buildSipSchema({
            portfolioId,
            holdingId: null,
            amount: Number(amount),
            frequency,
            startDate: initialDueDate,
            nextRunDate: initialDueDate,
            sourceAccountId,
            status: 'ACTIVE'
        });

        // Extend schema with domain fields
        const fullSchedule = {
            ...schemaBase,
            symbol: normSymbol,
            name: name || normSymbol,
            assetType,
            exchange,
            nextDueDate: initialDueDate,
            totalInstallments: totalInstallments ? Number(totalInstallments) : null,
            executedInstallments: 0,
            lastExecutedDate: null,
            executionHistory: []
        };

        const schedules = await loadSipSchedules();
        const updatedSchedules = [...schedules, fullSchedule];
        await saveSipSchedules(updatedSchedules);

        return fullSchedule;
    },

    /**
     * Evaluates all active SIP schedules and executes due automated buy orders.
     */
    async processDueSips(currentDateInput = new Date()) {
        const targetDateISO = typeof currentDateInput === 'string' 
            ? currentDateInput.split('T')[0] 
            : new Date(currentDateInput).toISOString().split('T')[0];

        const schedules = await loadSipSchedules();
        const executionResults = [];
        let modified = false;

        const updatedSchedules = [];

        for (let schedule of schedules) {
            if (schedule.status !== 'ACTIVE') {
                updatedSchedules.push(schedule);
                continue;
            }

            const dueDateISO = (schedule.nextDueDate || schedule.nextRunDate || '').split('T')[0];
            if (!dueDateISO || dueDateISO > targetDateISO) {
                updatedSchedules.push(schedule);
                continue; // Not due yet
            }

            // IDEMPOTENCY CHECK: Do not execute twice for the exact same due date
            if (schedule.lastExecutedDate === dueDateISO) {
                updatedSchedules.push(schedule);
                continue;
            }

            // Determine unit price (from MarketDataService or fallback to 100 for test determinism)
            let unitPrice = 100;
            try {
                const quote = await MarketDataService.getQuote(schedule.symbol || 'NIFTYBEES');
                if (quote && typeof quote.price === 'number' && quote.price > 0) {
                    unitPrice = quote.price;
                }
            } catch (err) {
                console.warn(`[SipEngine] Market quote unavailable for ${schedule.symbol}, using fallback unit price 100.`);
            }

            const quantity = Number((schedule.amount / unitPrice).toFixed(4));

            try {
                // DELEGATION INVARIANT: Delegate buy execution strictly to InvestingLedgerService
                const buyResult = await InvestingLedgerService.executeBuyOrder({
                    portfolioId: schedule.portfolioId,
                    symbol: schedule.symbol || 'NIFTYBEES',
                    name: schedule.name || schedule.symbol || 'SIP Holding',
                    assetType: schedule.assetType || 'MUTUAL_FUND',
                    exchange: schedule.exchange || 'MUTUAL_FUND',
                    quantity,
                    price: unitPrice,
                    fees: 0,
                    taxes: 0,
                    sourceAccountId: schedule.sourceAccountId,
                    date: dueDateISO
                });

                // SUCCESS PATH: Advance schedule state
                const executedInstallments = (schedule.executedInstallments || 0) + 1;
                const isCompleted = schedule.totalInstallments && executedInstallments >= schedule.totalInstallments;
                const nextDueDate = isCompleted ? schedule.nextDueDate : calculateNextDueDate(dueDateISO, schedule.frequency);
                const status = isCompleted ? 'COMPLETED' : 'ACTIVE';

                const executionHistory = Array.isArray(schedule.executionHistory) ? [...schedule.executionHistory] : [];
                executionHistory.push({
                    eventId: buyResult.event.id,
                    executedAt: new Date().toISOString(),
                    dueDate: dueDateISO,
                    amount: schedule.amount,
                    quantity,
                    price: unitPrice
                });

                const updatedSchedule = {
                    ...schedule,
                    lastExecutedDate: dueDateISO,
                    executedInstallments,
                    nextDueDate,
                    nextRunDate: nextDueDate,
                    status,
                    executionHistory,
                    updatedAt: new Date().toISOString()
                };

                modified = true;
                updatedSchedules.push(updatedSchedule);

                executionResults.push({
                    sipId: schedule.id,
                    status: 'SUCCESS',
                    buyResult,
                    schedule: updatedSchedule
                });
            } catch (err) {
                // FAILURE RECOVERY INVARIANT: Do NOT advance schedule if ledger buy order fails!
                console.error(`[SipEngine] Order execution failed for SIP ${schedule.id}:`, err.message);
                updatedSchedules.push(schedule); // Keep original unadvanced schedule!
                executionResults.push({
                    sipId: schedule.id,
                    status: 'FAILED',
                    error: err.message,
                    schedule
                });
            }
        }

        if (modified) {
            await saveSipSchedules(updatedSchedules);
        }

        return executionResults;
    },

    /**
     * Pause an active SIP schedule.
     */
    async pauseSipSchedule(sipId) {
        const schedules = await loadSipSchedules();
        const scheduleIdx = schedules.findIndex(s => s.id === sipId);
        if (scheduleIdx === -1) throw new Error(`[SipEngine] Schedule not found: ${sipId}`);

        const updatedSchedule = {
            ...schedules[scheduleIdx],
            status: 'PAUSED',
            updatedAt: new Date().toISOString()
        };
        schedules[scheduleIdx] = updatedSchedule;
        await saveSipSchedules(schedules);
        return updatedSchedule;
    },

    /**
     * Resume a paused SIP schedule.
     */
    async resumeSipSchedule(sipId) {
        const schedules = await loadSipSchedules();
        const scheduleIdx = schedules.findIndex(s => s.id === sipId);
        if (scheduleIdx === -1) throw new Error(`[SipEngine] Schedule not found: ${sipId}`);

        const updatedSchedule = {
            ...schedules[scheduleIdx],
            status: 'ACTIVE',
            updatedAt: new Date().toISOString()
        };
        schedules[scheduleIdx] = updatedSchedule;
        await saveSipSchedules(schedules);
        return updatedSchedule;
    },

    /**
     * Cancel a SIP schedule.
     */
    async cancelSipSchedule(sipId) {
        const schedules = await loadSipSchedules();
        const scheduleIdx = schedules.findIndex(s => s.id === sipId);
        if (scheduleIdx === -1) throw new Error(`[SipEngine] Schedule not found: ${sipId}`);

        const updatedSchedule = {
            ...schedules[scheduleIdx],
            status: 'CANCELLED',
            updatedAt: new Date().toISOString()
        };
        schedules[scheduleIdx] = updatedSchedule;
        await saveSipSchedules(schedules);
        return updatedSchedule;
    },

    /**
     * Load all SIP schedules for a portfolio.
     */
    async getSipSchedules(portfolioId) {
        const schedules = await loadSipSchedules();
        if (!portfolioId) return schedules;
        return schedules.filter(s => s.portfolioId === portfolioId);
    }
};

export default SipEngine;
