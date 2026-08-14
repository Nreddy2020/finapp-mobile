/**
 * services/sipEngine.js
 * 
 * Stage C.3.4 SIP Schedule & Automation Engine (ADR-005 Compliant).
 * 
 * ARCHITECTURAL RESPONSIBILITIES:
 * 1. SIP schedule lifecycle management (ACTIVE, PAUSED, COMPLETED, CANCELLED).
 * 2. Frequency mathematics and next due date calculation (DAILY, WEEKLY, MONTHLY, QUARTERLY).
 * 3. Due-date detection, idempotency enforcement, and duplicate run protection.
 * 4. Delegation of automated buy orders strictly to InvestingLedgerService.executeBuyOrder().
 * 5. PRICE_UNAVAILABLE Deferral Invariant: Missing/error market quotes do NOT execute orders or advance due dates.
 * 6. Failure-path recovery: Failed buy orders do NOT advance schedule due dates.
 * 
 * STRICT INVARIANTS:
 * - NO FABRICATED PRICE FALLBACKS (Zero unitPrice = 100 fallback).
 * - Does NOT own investment accounting or custom transaction creation.
 * - Does NOT mutate cash or bank balances directly (delegates to ledger service).
 * - Zero MoneyFlow modifications (uses standard ledger transfer calls).
 */

import { loadSipSchedules, saveSipSchedules } from './storage.js';
import { createSipSchedule as buildSipSchema, SipFrequency } from './investingSchemas.js';
import InvestingLedgerService from './investingLedgerService.js';
import MarketDataService from './marketDataService.js';

/**
 * Strict ISO Date string validator.
 */
const validateIsoDate = (dateInput, label = 'date') => {
    if (!dateInput) {
        throw new Error(`[SipEngine] ${label} is required`);
    }
    const dateStr = typeof dateInput === 'string' ? dateInput.split('T')[0] : new Date(dateInput).toISOString().split('T')[0];
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new Error(`[SipEngine] Invalid ${label} input: '${dateInput}'. Expected valid YYYY-MM-DD format.`);
    }
    return dateStr;
};

/**
 * Pure date calculation helper for frequency intervals.
 */
export const calculateNextDueDate = (currentDateInput, frequency = 'MONTHLY') => {
    const dateStr = validateIsoDate(currentDateInput, 'currentDateInput');
    const date = new Date(dateStr);
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
     * Creates a canonical SIP schedule with strict validations.
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
        if (!symbol || typeof symbol !== 'string' || !symbol.trim()) {
            throw new Error('[SipEngine] symbol is required');
        }
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            throw new Error('[SipEngine] amount must be a positive number');
        }

        // Validate totalInstallments: null/undefined = unlimited; otherwise positive integer only
        let parsedInstallments = null;
        if (totalInstallments !== null && totalInstallments !== undefined) {
            const num = Number(totalInstallments);
            if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
                throw new Error(`[SipEngine] totalInstallments must be a positive integer or null/undefined, received: ${totalInstallments}`);
            }
            parsedInstallments = num;
        }

        // Validate startDate
        const validStartDate = validateIsoDate(startDate, 'startDate');
        const normSymbol = symbol.trim().toUpperCase();
        const normFreq = Object.values(SipFrequency).includes(frequency) ? frequency : SipFrequency.MONTHLY;

        const schemaBase = buildSipSchema({
            portfolioId,
            holdingId: null,
            amount: Number(amount),
            frequency: normFreq,
            startDate: validStartDate,
            nextRunDate: validStartDate,
            sourceAccountId,
            status: 'ACTIVE'
        });

        // Extend schema with domain execution projection
        const fullSchedule = {
            ...schemaBase,
            symbol: normSymbol,
            name: name || normSymbol,
            assetType,
            exchange,
            frequency: normFreq,
            nextDueDate: validStartDate,
            totalInstallments: parsedInstallments,
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
        const targetDateISO = validateIsoDate(currentDateInput, 'currentDateInput');

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

            // PRICE_UNAVAILABLE INVARIANT: Fetch market quote from MarketDataService. NO FABRICATED PRICE FALLBACK!
            let quote = null;
            try {
                quote = await MarketDataService.getQuote(schedule.symbol);
            } catch (err) {
                console.warn(`[SipEngine] Market quote provider error for ${schedule.symbol}:`, err.message);
            }

            if (!quote || quote.quoteStatus === 'UNAVAILABLE' || quote.providerStatus === 'ERROR' || typeof quote.price !== 'number' || isNaN(quote.price) || quote.price <= 0) {
                console.warn(`[SipEngine] Market quote unavailable for ${schedule.symbol}. Deferring execution.`);
                executionResults.push({
                    sipId: schedule.id,
                    status: 'PRICE_UNAVAILABLE',
                    message: `Market price quote unavailable for ${schedule.symbol}. SIP remains ACTIVE and unadvanced.`,
                    schedule
                });
                updatedSchedules.push(schedule); // Keep schedule 100% UNCHANGED (lastExecutedDate and nextDueDate unadvanced)!
                continue;
            }

            const unitPrice = quote.price;
            // Explicit Fractional Quantity Policy: 4 decimal places
            const quantity = Number((schedule.amount / unitPrice).toFixed(4));

            try {
                // DELEGATION INVARIANT: Delegate buy execution strictly to InvestingLedgerService
                const buyResult = await InvestingLedgerService.executeBuyOrder({
                    portfolioId: schedule.portfolioId,
                    symbol: schedule.symbol,
                    name: schedule.name || schedule.symbol,
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
