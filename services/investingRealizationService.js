/**
 * services/investingRealizationService.js
 * 
 * Stage C.3.5 Dividends, Fees & Tax Realization Engine.
 * 
 * ARCHITECTURAL RESPONSIBILITIES:
 * 1. Record Cash Dividends with tax withheld at source (NO double-counting of tax).
 * 2. Record Stand-alone Investment Fees (Demat AMC, brokerage fees).
 * 3. Record Stand-alone Investment Taxes (STT, capital gains tax).
 * 4. Delegate cash mutations strictly to MoneyFlowEngine.addTransaction().
 * 5. Idempotency enforcement: Reject duplicate event IDs.
 * 6. Dynamic Realization Metrics: Derive dividend income, fees, and taxes dynamically from unified event history.
 * 
 * STRICT INVARIANTS:
 * - Holding quantity and WAC (averageCost) MUST REMAIN 100% UNCHANGED.
 * - Zero direct cash or account balance mutations.
 * - Zero editing of frozen schemas or storage keys.
 */

import { loadInvestmentEvents, saveInvestmentEvents } from './storage.js';
import { createInvestmentEvent, EventType, InvestmentEventStatus } from './investingSchemas.js';
import MoneyFlowEngine from './moneyFlowEngine.js';

export const InvestingRealizationService = {
    /**
     * Records a cash dividend received for a holding/symbol.
     * 
     * TAX WITHHOLDING RULE (No Double-Counting):
     * Gross Dividend ₹2,000 - Tax Withheld ₹200 = Net Cash Received ₹1,800.
     * Only +₹1,800 Net Cash is credited via MoneyFlow income.
     * No separate expense transaction is created for the ₹200 withheld tax.
     */
    async recordDividend(params = {}) {
        const {
            eventId,
            portfolioId = 'default_portfolio',
            holdingId = null,
            symbol,
            grossAmount,
            taxWithheld = 0,
            date = new Date().toISOString().split('T')[0],
            destinationAccountId = null
        } = params;

        if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
            throw new Error('[InvestingRealizationService] eventId is required for idempotency');
        }
        if (!symbol || typeof symbol !== 'string' || !symbol.trim()) {
            throw new Error('[InvestingRealizationService] symbol is required');
        }
        const gross = Number(grossAmount);
        const tax = Number(taxWithheld || 0);

        if (isNaN(gross) || gross <= 0) {
            throw new Error('[InvestingRealizationService] grossAmount must be a positive number');
        }
        if (isNaN(tax) || tax < 0) {
            throw new Error('[InvestingRealizationService] taxWithheld cannot be negative');
        }
        if (tax >= gross) {
            throw new Error('[InvestingRealizationService] taxWithheld cannot be greater than or equal to grossAmount');
        }

        const normSymbol = symbol.trim().toUpperCase();
        const existingEvents = await loadInvestmentEvents();
        if (existingEvents.some(e => e.id === eventId)) {
            throw new Error(`[InvestingRealizationService] Duplicate eventId '${eventId}' rejected`);
        }

        const netDividend = gross - tax;
        const isoDate = new Date(date).toISOString();

        // Step 1: Create PENDING Investment Event (amount = grossAmount, price = netDividend, taxes = taxWithheld)
        const schemaEvent = createInvestmentEvent({
            id: eventId,
            portfolioId,
            holdingId,
            symbol: normSymbol,
            type: EventType.DIVIDEND,
            quantity: 0,
            price: netDividend,
            amount: gross,
            fees: 0,
            taxes: tax,
            date: isoDate,
            status: InvestmentEventStatus.PENDING
        });

        const pendingEvent = {
            ...schemaEvent,
            metadata: {
                grossAmount: gross,
                taxWithheld: tax,
                netDividend,
                destinationAccountId
            }
        };

        // Step 2: Execute MoneyFlow Income Transaction for Net Cash Received
        let mfTx = null;
        try {
            mfTx = await MoneyFlowEngine.addTransaction({
                type: 'income',
                category: 'other_income',
                amount: netDividend,
                accountId: destinationAccountId,
                date: isoDate.split('T')[0],
                note: `Dividend received for ${normSymbol} (Gross: ₹${gross}, Tax Withheld: ₹${tax})`
            });
        } catch (err) {
            throw new Error(`[InvestingRealizationService] MoneyFlow income failed: ${err.message}`);
        }

        // Step 3: Persist Event as CONFIRMED (or FAILED + reconciliation note if storage fails)
        try {
            const confirmedEvent = {
                ...pendingEvent,
                status: InvestmentEventStatus.CONFIRMED,
                metadata: {
                    ...pendingEvent.metadata,
                    moneyFlowTxId: mfTx.id
                },
                updatedAt: new Date().toISOString()
            };
            const currentEvents = await loadInvestmentEvents();
            await saveInvestmentEvents([...currentEvents, confirmedEvent]);
            return {
                status: 'SUCCESS',
                event: confirmedEvent,
                moneyFlowTx: mfTx,
                netDividend
            };
        } catch (err) {
            console.error('[InvestingRealizationService] Event storage failed post-MoneyFlow:', err);
            return {
                status: 'FAILED',
                reconciliationRequired: true,
                error: err.message,
                moneyFlowTx: mfTx
            };
        }
    },

    /**
     * Records a stand-alone investment fee (e.g. Demat AMC, Brokerage fee).
     */
    async recordStandaloneFee(params = {}) {
        const {
            eventId,
            portfolioId = 'default_portfolio',
            holdingId = null,
            symbol = 'PORTFOLIO_FEE',
            feeAmount,
            description = 'Investment Fee',
            date = new Date().toISOString().split('T')[0],
            sourceAccountId = null
        } = params;

        if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
            throw new Error('[InvestingRealizationService] eventId is required for idempotency');
        }
        const fee = Number(feeAmount);
        if (isNaN(fee) || fee <= 0) {
            throw new Error('[InvestingRealizationService] feeAmount must be a positive number');
        }

        const normSymbol = (symbol || 'PORTFOLIO_FEE').trim().toUpperCase();
        const existingEvents = await loadInvestmentEvents();
        if (existingEvents.some(e => e.id === eventId)) {
            throw new Error(`[InvestingRealizationService] Duplicate eventId '${eventId}' rejected`);
        }

        const isoDate = new Date(date).toISOString();

        // Step 1: Create PENDING Event
        const schemaEvent = createInvestmentEvent({
            id: eventId,
            portfolioId,
            holdingId,
            symbol: normSymbol,
            type: EventType.FEE,
            quantity: 0,
            price: 0,
            amount: fee,
            fees: fee,
            taxes: 0,
            date: isoDate,
            status: InvestmentEventStatus.PENDING
        });

        const pendingEvent = {
            ...schemaEvent,
            metadata: {
                feeAmount: fee,
                description,
                sourceAccountId
            }
        };

        // Step 2: Execute MoneyFlow Expense Transaction
        let mfTx = null;
        try {
            mfTx = await MoneyFlowEngine.addTransaction({
                type: 'expense',
                category: 'other_expense',
                amount: fee,
                accountId: sourceAccountId,
                date: isoDate.split('T')[0],
                note: description
            });
        } catch (err) {
            throw new Error(`[InvestingRealizationService] MoneyFlow expense failed: ${err.message}`);
        }

        // Step 3: Persist Event as CONFIRMED
        try {
            const confirmedEvent = {
                ...pendingEvent,
                status: InvestmentEventStatus.CONFIRMED,
                metadata: {
                    ...pendingEvent.metadata,
                    moneyFlowTxId: mfTx.id
                },
                updatedAt: new Date().toISOString()
            };
            const currentEvents = await loadInvestmentEvents();
            await saveInvestmentEvents([...currentEvents, confirmedEvent]);
            return {
                status: 'SUCCESS',
                event: confirmedEvent,
                moneyFlowTx: mfTx,
                feeAmount: fee
            };
        } catch (err) {
            return {
                status: 'FAILED',
                reconciliationRequired: true,
                error: err.message,
                moneyFlowTx: mfTx
            };
        }
    },

    /**
     * Records a stand-alone investment tax (e.g. STT, Capital Gains Tax).
     */
    async recordStandaloneTax(params = {}) {
        const {
            eventId,
            portfolioId = 'default_portfolio',
            holdingId = null,
            symbol = 'PORTFOLIO_TAX',
            taxAmount,
            description = 'Investment Tax',
            date = new Date().toISOString().split('T')[0],
            sourceAccountId = null
        } = params;

        if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
            throw new Error('[InvestingRealizationService] eventId is required for idempotency');
        }
        const tax = Number(taxAmount);
        if (isNaN(tax) || tax <= 0) {
            throw new Error('[InvestingRealizationService] taxAmount must be a positive number');
        }

        const normSymbol = (symbol || 'PORTFOLIO_TAX').trim().toUpperCase();
        const existingEvents = await loadInvestmentEvents();
        if (existingEvents.some(e => e.id === eventId)) {
            throw new Error(`[InvestingRealizationService] Duplicate eventId '${eventId}' rejected`);
        }

        const isoDate = new Date(date).toISOString();

        // Step 1: Create PENDING Event
        const schemaEvent = createInvestmentEvent({
            id: eventId,
            portfolioId,
            holdingId,
            symbol: normSymbol,
            type: EventType.TAX,
            quantity: 0,
            price: 0,
            amount: tax,
            fees: 0,
            taxes: tax,
            date: isoDate,
            status: InvestmentEventStatus.PENDING
        });

        const pendingEvent = {
            ...schemaEvent,
            metadata: {
                taxAmount: tax,
                description,
                sourceAccountId
            }
        };

        // Step 2: Execute MoneyFlow Expense Transaction
        let mfTx = null;
        try {
            mfTx = await MoneyFlowEngine.addTransaction({
                type: 'expense',
                category: 'other_expense',
                amount: tax,
                accountId: sourceAccountId,
                date: isoDate.split('T')[0],
                note: description
            });
        } catch (err) {
            throw new Error(`[InvestingRealizationService] MoneyFlow expense failed: ${err.message}`);
        }

        // Step 3: Persist Event as CONFIRMED
        try {
            const confirmedEvent = {
                ...pendingEvent,
                status: InvestmentEventStatus.CONFIRMED,
                metadata: {
                    ...pendingEvent.metadata,
                    moneyFlowTxId: mfTx.id
                },
                updatedAt: new Date().toISOString()
            };
            const currentEvents = await loadInvestmentEvents();
            await saveInvestmentEvents([...currentEvents, confirmedEvent]);
            return {
                status: 'SUCCESS',
                event: confirmedEvent,
                moneyFlowTx: mfTx,
                taxAmount: tax
            };
        } catch (err) {
            return {
                status: 'FAILED',
                reconciliationRequired: true,
                error: err.message,
                moneyFlowTx: mfTx
            };
        }
    },

    /**
     * Derived Realization Information Query.
     * Computes realization metrics dynamically from event store.
     */
    async getRealizationHistory(filter = {}) {
        const { portfolioId, symbol } = filter;
        const allEvents = await loadInvestmentEvents();

        const realizationEvents = allEvents.filter(e => {
            if (![EventType.DIVIDEND, EventType.FEE, EventType.TAX].includes(e.type)) return false;
            if (e.status !== InvestmentEventStatus.CONFIRMED) return false;
            if (portfolioId && e.portfolioId !== portfolioId) return false;
            if (symbol && e.symbol !== symbol.toUpperCase()) return false;
            return true;
        });

        let totalGrossDividends = 0;
        let totalTaxWithheld = 0;
        let totalNetDividends = 0;
        let totalStandaloneFees = 0;
        let totalStandaloneTaxes = 0;

        realizationEvents.forEach(e => {
            if (e.type === EventType.DIVIDEND) {
                const gross = e.metadata?.grossAmount || e.amount || e.price;
                const tax = e.metadata?.taxWithheld || e.taxes || 0;
                const net = e.metadata?.netDividend || e.price;

                totalGrossDividends += gross;
                totalTaxWithheld += tax;
                totalNetDividends += net;
            } else if (e.type === EventType.FEE) {
                totalStandaloneFees += e.fees || e.metadata?.feeAmount || 0;
            } else if (e.type === EventType.TAX) {
                totalStandaloneTaxes += e.taxes || e.metadata?.taxAmount || 0;
            }
        });

        return {
            events: realizationEvents,
            metrics: {
                totalGrossDividends,
                totalTaxWithheld,
                totalNetDividends,
                totalStandaloneFees,
                totalStandaloneTaxes,
                totalRealizationExpenses: totalStandaloneFees + totalStandaloneTaxes
            }
        };
    }
};

export default InvestingRealizationService;
