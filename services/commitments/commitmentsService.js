/**
 * services/commitments/commitmentsService.js
 * 
 * Persistence and Data Access Layer for Recurring Commitments & Liabilities.
 * 
 * Invariants:
 * - Strict DEMO vs PRODUCTION data isolation.
 * - Demo data never enters production storage or transaction ledgers.
 * - Demo totals are derived directly from the 18 demo fixtures (not hardcoded).
 * - Safe migration for legacy subscription records.
 */

import { StorageService, STORAGE_KEYS } from '../storage.js';
import {
    FinancialNature,
    CommitmentType,
    AmountMode,
    RecurrenceFrequency,
    CommitmentStatus,
    PaymentOccurrenceStatus,
    CashbookReconciliationStatus,
    EmergencyRunwayStatus,
    AppMode,
    createMoneyPaise,
    rupeesToMoneyPaise,
    moneyToBigInt,
    validateCommitment
} from './commitmentContracts.js';
import { normalizeToMonthlyPaise, normalizeToYearlyPaise, calculateMonthlyCommittedOutflow } from './commitmentCalculator.js';
import {
    generateOccurrences,
    recordPaymentOccurrence,
    preparePaymentOccurrence,
    failReconciliationOccurrence,
    reversePaymentOccurrence,
    cancelCommitmentWithOccurrences
} from './commitmentEngine.js';
import { createAuditEvent, AuditEventType, AuditSource } from './commitmentAuditTrail.js';
import { CashbookRepository } from '../cashbook/cashbookRepository.js';
import { TransactionType } from '../cashbook/cashbookContracts.js';
import { generateRecurringPaymentIdempotencyKey } from '../cashbook/cashbookIdempotency.js';
import { FamilyRepository } from '../family/familyRepository.js';
import { validateFamilyContext } from './familyCommitmentBridge.js';

const STORAGE_KEY_COMMITMENTS = 'FINLIFE_COMMITMENTS_V2';
const STORAGE_KEY_OCCURRENCES = 'FINLIFE_OCCURRENCES_V2';
const STORAGE_KEY_AUDIT_LOG = 'FINLIFE_COMMITMENTS_AUDIT_V2';
const STORAGE_KEY_APP_MODE = 'FINLIFE_COMMITMENTS_APP_MODE';

/**
 * Authoritative 18 Demo Fixtures matching user mockup:
 * - Total Active Commitments: 18
 * - Monthly Committed Outgoing: ₹1,42,500 (14250000 paise)
 * - Yearly Committed Outgoing: ₹17,10,000 (171000000 paise)
 */
export function buildDemoFixtures(asOfDate = '2026-09-04') {
    const rawDemoList = [
        // 1. Apartment Maintenance (Due in 2 days)
        {
            id: 'demo_apt_maint',
            name: 'Apartment Maintenance',
            type: CommitmentType.UTILITY_BILL,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(8500),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2026-01-05',
            nextDueDate: '2026-09-05',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Housing'
        },
        // 2. Netflix (Due in 5 days)
        {
            id: 'demo_netflix',
            name: 'Netflix',
            type: CommitmentType.SUBSCRIPTION,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(649),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2026-01-08',
            nextDueDate: '2026-09-08',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Entertainment'
        },
        // 3. Internet Bill (Due in 7 days)
        {
            id: 'demo_internet',
            name: 'Internet Bill',
            type: CommitmentType.UTILITY_BILL,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(799),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2026-01-10',
            nextDueDate: '2026-09-10',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Utilities'
        },
        // 4. Home Loan EMI
        {
            id: 'demo_home_loan',
            name: 'Home Loan EMI',
            type: CommitmentType.LOAN_EMI,
            financialNature: FinancialNature.DEBT,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(45000),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2024-09-05',
            nextDueDate: '2026-09-05',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Loans',
            loanPrincipal: '450000000',
            interestRate: '8.4',
            remainingTenureMonths: 180
        },
        // 5. Term Life Insurance (Yearly ₹24,000 -> Monthly ₹2,000)
        {
            id: 'demo_life_insurance',
            name: 'Term Life Insurance',
            type: CommitmentType.INSURANCE,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(24000),
            frequency: RecurrenceFrequency.YEARLY,
            startDate: '2025-11-20',
            nextDueDate: '2026-11-20',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Insurance'
        },
        // 6. Spotify Premium
        {
            id: 'demo_spotify',
            name: 'Spotify Premium',
            type: CommitmentType.SUBSCRIPTION,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(119),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2026-01-12',
            nextDueDate: '2026-09-12',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Entertainment'
        },
        // 7. Car Loan EMI
        {
            id: 'demo_car_loan',
            name: 'Car Loan EMI',
            type: CommitmentType.LOAN_EMI,
            financialNature: FinancialNature.DEBT,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(18500),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2025-03-15',
            nextDueDate: '2026-09-15',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Loans'
        },
        // 8. Child School Tuition (Quarterly ₹60,000 -> Monthly ₹20,000)
        {
            id: 'demo_school_fee',
            name: 'Child School Tuition',
            type: CommitmentType.EDUCATION,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(60000),
            frequency: RecurrenceFrequency.QUARTERLY,
            startDate: '2026-04-01',
            nextDueDate: '2026-10-01',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Education'
        },
        // 9. Health Insurance (Yearly ₹12,000 -> Monthly ₹1,000)
        {
            id: 'demo_health_ins',
            name: 'Family Health Insurance',
            type: CommitmentType.INSURANCE,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(12000),
            frequency: RecurrenceFrequency.YEARLY,
            startDate: '2025-12-10',
            nextDueDate: '2026-12-10',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Insurance'
        },
        // 10. Mutual Fund SIP
        {
            id: 'demo_sip_index',
            name: 'Nifty 50 Index SIP',
            type: CommitmentType.INVESTMENT_SIP,
            financialNature: FinancialNature.INVESTMENT,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(25000),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2024-01-05',
            nextDueDate: '2026-09-05',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Investments'
        },
        // 11. Electricity & Water (Variable/Estimated)
        {
            id: 'demo_electricity',
            name: 'Electricity & Water Bill',
            type: CommitmentType.UTILITY_BILL,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.ESTIMATED,
            amount: rupeesToMoneyPaise(4500),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2026-01-18',
            nextDueDate: '2026-09-18',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Utilities'
        },
        // 12. Mobile Postpaid Family Plan
        {
            id: 'demo_mobile',
            name: 'Airtel Postpaid Family',
            type: CommitmentType.UTILITY_BILL,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(1999),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2026-01-22',
            nextDueDate: '2026-09-22',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Utilities'
        },
        // 13. House Cook / Helper
        {
            id: 'demo_cook',
            name: 'House Help & Cook',
            type: CommitmentType.OTHER,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(8000),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2026-01-01',
            nextDueDate: '2026-09-01',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Home'
        },
        // 14. Gym Membership (Yearly ₹6,000 -> Monthly ₹500)
        {
            id: 'demo_gym',
            name: 'Gold\'s Gym Membership',
            type: CommitmentType.MEMBERSHIP,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(6000),
            frequency: RecurrenceFrequency.YEARLY,
            startDate: '2026-02-15',
            nextDueDate: '2027-02-15',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Fitness'
        },
        // 15. Amazon Prime (Yearly ₹1,500 -> Monthly ₹125)
        {
            id: 'demo_amazon',
            name: 'Amazon Prime',
            type: CommitmentType.SUBSCRIPTION,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(1500),
            frequency: RecurrenceFrequency.YEARLY,
            startDate: '2025-10-15',
            nextDueDate: '2026-10-15',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Shopping'
        },
        // 16. Cloud Storage (Google One)
        {
            id: 'demo_cloud',
            name: 'Google One 200GB',
            type: CommitmentType.SUBSCRIPTION,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(130),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2026-01-14',
            nextDueDate: '2026-09-14',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Software'
        },
        // 17. Newspaper & DTH
        {
            id: 'demo_dth',
            name: 'Tata Play DTH & Print',
            type: CommitmentType.UTILITY_BILL,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(650),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2026-01-25',
            nextDueDate: '2026-09-25',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Utilities'
        },
        // 18. Vehicle Maintenance & Fastag (Monthly ₹5,029) -> Exactly reaches ₹1,42,500!
        {
            id: 'demo_fastag',
            name: 'Fastag & Vehicle Fund',
            type: CommitmentType.OTHER,
            financialNature: FinancialNature.EXPENSE,
            amountMode: AmountMode.FIXED,
            amount: rupeesToMoneyPaise(5029),
            frequency: RecurrenceFrequency.MONTHLY,
            startDate: '2026-01-28',
            nextDueDate: '2026-09-28',
            status: CommitmentStatus.ACTIVE,
            version: 1,
            category: 'Transportation'
        }
    ];

    // Generate occurrences for August - October 2026
    let demoOccurrences = [];
    for (const c of rawDemoList) {
        const occs = generateOccurrences({
            commitment: c,
            existingOccurrences: [],
            startDate: '2026-08-01',
            endDate: '2026-10-31',
            asOfDate
        });
        // Prior month (August) occurrences and early September prior to asOfDate were paid
        const withPastPaid = occs.map(o => {
            if (o.scheduledDate < asOfDate) {
                return {
                    ...o,
                    status: PaymentOccurrenceStatus.PAID,
                    actualAmount: o.expectedAmount,
                    actualPaidDate: o.scheduledDate
                };
            }
            return o;
        });
        demoOccurrences = demoOccurrences.concat(withPastPaid);
    }

    // Set one overdue occurrence for demonstration (Overdue: ₹12,000)
    const overdueOcc = {
        id: 'demo_overdue_maint',
        commitmentId: 'demo_apt_maint',
        commitmentName: 'Quarterly Maintenance Arrears',
        commitmentType: CommitmentType.UTILITY_BILL,
        financialNature: FinancialNature.EXPENSE,
        scheduledDate: '2026-08-15',
        expectedAmount: rupeesToMoneyPaise(12000),
        status: PaymentOccurrenceStatus.OVERDUE,
        idempotencyKey: 'demo_apt_maint:demo_overdue_maint',
        createdAt: '2026-08-01T00:00:00Z'
    };
    demoOccurrences.push(overdueOcc);

    return {
        commitments: rawDemoList,
        occurrences: demoOccurrences
    };
}

export const CommitmentsService = {
    /**
     * Gets the currently active App Mode ('DEMO' | 'PRODUCTION').
     */
    getMode: async () => {
        const mode = await StorageService.load(STORAGE_KEY_APP_MODE);
        return mode === AppMode.DEMO ? AppMode.DEMO : AppMode.PRODUCTION;
    },

    /**
     * Explicitly sets the App Mode ('DEMO' | 'PRODUCTION').
     */
    setMode: async (mode) => {
        if (!Object.values(AppMode).includes(mode)) {
            throw new Error(`Invalid AppMode: ${mode}`);
        }
        await StorageService.save(STORAGE_KEY_APP_MODE, mode);
        return mode;
    },

    /**
     * Loads commitments and occurrences according to mode.
     * @param {{ mode?: 'DEMO'|'PRODUCTION', asOfDate?: string }} options
     */
    load: async (options = {}) => {
        const activeMode = options.mode || await CommitmentsService.getMode();
        const asOfDate = options.asOfDate || new Date().toISOString().split('T')[0];

        if (activeMode === AppMode.DEMO) {
            return buildDemoFixtures(asOfDate);
        }

        // Production Mode: Load real user commitments from storage
        let commitments = await StorageService.load(STORAGE_KEY_COMMITMENTS) || [];
        let occurrences = await StorageService.load(STORAGE_KEY_OCCURRENCES) || [];

        // Check if legacy migration is needed
        if (commitments.length === 0) {
            const legacy = await StorageService.load(STORAGE_KEYS.RECURRING_PAYMENTS);
            if (legacy && Array.isArray(legacy) && legacy.length > 0) {
                const migrated = CommitmentsService.migrateLegacySubscriptions(legacy);
                commitments = migrated;
                await StorageService.save(STORAGE_KEY_COMMITMENTS, commitments);
            }
        }

        return {
            commitments,
            occurrences
        };
    },

    /**
     * Migrates legacy floating-point subscription objects into formal MoneyPaise records.
     */
    migrateLegacySubscriptions: (legacySubs = []) => {
        const list = Array.isArray(legacySubs) ? legacySubs : [];
        return list.map(legacy => {
            const rawAmount = typeof legacy.amount === 'number' ? legacy.amount : parseFloat(legacy.amount || '0');
            const freq = legacy.frequency === 'Yearly' ? RecurrenceFrequency.YEARLY : RecurrenceFrequency.MONTHLY;
            const startDate = legacy.nextDate || new Date().toISOString().split('T')[0];

            return {
                id: legacy.id || `migrated_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: legacy.name || 'Migrated Subscription',
                type: CommitmentType.SUBSCRIPTION,
                financialNature: FinancialNature.EXPENSE,
                amountMode: AmountMode.FIXED,
                amount: rupeesToMoneyPaise(rawAmount),
                frequency: freq,
                startDate,
                nextDueDate: startDate,
                status: legacy.active === false ? CommitmentStatus.CANCELLED : CommitmentStatus.ACTIVE,
                version: 1,
                migratedFromLegacy: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        });
    },

    /**
     * Creates or updates a commitment in production storage.
     */
    saveCommitment: async (commitment, options = {}) => {
        const normalizedCommitment = {
            ...commitment,
            id: commitment?.id || `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            status: commitment?.status || CommitmentStatus.ACTIVE,
            version: commitment?.version || 1,
            nextDueDate: commitment?.nextDueDate || commitment?.startDate
        };
        validateCommitment(normalizedCommitment);
        const activeMode = options.mode || await CommitmentsService.getMode();

        // Validate familyContext against Family Hub if present
        if (normalizedCommitment.familyContext) {
            const familyEnvelope = await FamilyRepository.loadFamilyEnvelope();
            validateFamilyContext(normalizedCommitment.familyContext, familyEnvelope?.data || {}, {
                allowArchivedHistorical: false
            });
        }

        if (activeMode === AppMode.DEMO) {
            // In demo mode, do not write to production storage
            return normalizedCommitment;
        }

        const commitments = await StorageService.load(STORAGE_KEY_COMMITMENTS) || [];
        const index = commitments.findIndex(c => c.id === normalizedCommitment.id);

        let previousState = null;
        let eventType = AuditEventType.COMMITMENT_CREATED;
        let savedCommitment = null;

        if (normalizedCommitment.status === CommitmentStatus.CANCELLED) {
            // Handle cancellation cascade
            previousState = index >= 0 ? commitments[index] : null;
            const existingOccurrences = await StorageService.load(STORAGE_KEY_OCCURRENCES) || [];
            const asOfDate = options.asOfDate || new Date().toISOString().split('T')[0];
            const { updatedCommitment, updatedOccurrences } = cancelCommitmentWithOccurrences(
                normalizedCommitment,
                existingOccurrences,
                asOfDate
            );
            savedCommitment = updatedCommitment;
            if (index >= 0) {
                commitments[index] = updatedCommitment;
            } else {
                commitments.push(updatedCommitment);
            }
            await StorageService.save(STORAGE_KEY_COMMITMENTS, commitments);
            await StorageService.save(STORAGE_KEY_OCCURRENCES, updatedOccurrences);
            eventType = AuditEventType.COMMITMENT_CANCELLED;
        } else {
            if (index >= 0) {
                previousState = commitments[index];
                savedCommitment = {
                    ...normalizedCommitment,
                    version: (previousState.version || 1) + 1,
                    updatedAt: new Date().toISOString()
                };
                commitments[index] = savedCommitment;
                eventType = AuditEventType.COMMITMENT_UPDATED;
            } else {
                savedCommitment = {
                    ...normalizedCommitment,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                commitments.push(savedCommitment);
            }

            await StorageService.save(STORAGE_KEY_COMMITMENTS, commitments);

            // Auto-generate occurrences for scheduling window (startDate to 3 months ahead)
            const existingOccurrences = await StorageService.load(STORAGE_KEY_OCCURRENCES) || [];
            const asOfDate = options.asOfDate || new Date().toISOString().split('T')[0];
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + 3);
            const endDate = futureDate.toISOString().split('T')[0];

            const generated = generateOccurrences({
                commitment: savedCommitment,
                existingOccurrences,
                startDate: savedCommitment.startDate,
                endDate,
                asOfDate
            });

            const otherOccurrences = existingOccurrences.filter(o => o.commitmentId !== savedCommitment.id);
            const mergedOccurrences = [...otherOccurrences, ...generated];
            await StorageService.save(STORAGE_KEY_OCCURRENCES, mergedOccurrences);
        }

        // Record audit event
        const auditEvent = createAuditEvent({
            eventType,
            commitmentId: savedCommitment.id,
            previousState,
            newState: savedCommitment,
            source: AuditSource.USER
        });
        await CommitmentsService.appendAuditEvent(auditEvent);

        return savedCommitment;
    },

    /**
     * Cancels a commitment and all its future upcoming occurrences.
     */
    cancelCommitment: async (commitmentId, options = {}) => {
        const activeMode = options.mode || await CommitmentsService.getMode();
        const data = await CommitmentsService.load({ mode: activeMode });
        const commitment = (data.commitments || []).find(c => c.id === commitmentId);
        if (!commitment) {
            throw new Error(`Commitment not found: ${commitmentId}`);
        }
        return await CommitmentsService.saveCommitment({
            ...commitment,
            status: CommitmentStatus.CANCELLED
        }, options);
    },

    /**
     * Records a payment against an occurrence.
     */
    recordPayment: async (occurrenceId, paymentDetails, options = {}) => {
        const activeMode = options.mode || await CommitmentsService.getMode();
        if (activeMode === AppMode.DEMO) {
            // In demo mode, return mock updated occurrence
            return {
                id: occurrenceId,
                status: PaymentOccurrenceStatus.PAID,
                actualAmount: paymentDetails.actualAmount,
                paidAt: new Date().toISOString()
            };
        }

        const occurrences = await StorageService.load(STORAGE_KEY_OCCURRENCES) || [];
        const index = occurrences.findIndex(o => o.id === occurrenceId);
        if (index < 0) {
            throw new Error(`Occurrence not found: ${occurrenceId}`);
        }

        const previousState = occurrences[index];
        const updated = recordPaymentOccurrence(previousState, paymentDetails);
        occurrences[index] = updated;

        await StorageService.save(STORAGE_KEY_OCCURRENCES, occurrences);

        // Record audit event
        const auditEvent = createAuditEvent({
            eventType: AuditEventType.PAYMENT_RECORDED,
            commitmentId: updated.commitmentId,
            occurrenceId: updated.id,
            previousState,
            newState: updated,
            source: AuditSource.USER
        });
        await CommitmentsService.appendAuditEvent(auditEvent);

        return updated;
    },

    /**
     * Executes atomic and idempotent occurrence payment against the Cashbook ledger.
     * State machine: UPCOMING -> PAID_PENDING_RECONCILIATION -> PAID
     * Failure machine: PAID_PENDING_RECONCILIATION -> FAILED_RECONCILIATION (RETRYABLE)
     * 
     * Invariants:
     * - Exactly one Cashbook transaction created.
     * - Store cashbookTransactionId on occurrence.
     * - Occurrence marked PAID only after successful Cashbook persistence.
     * - Replaying same request returns existing transaction idempotently.
     * - Failed Cashbook write NEVER marks occurrence as PAID.
     * 
     * @param {string} occurrenceId
     * @param {object} paymentDetails { actualAmount, actualPaidDate, accountId, category, description, paymentOperationId, notes }
     * @param {object} options { mode }
     */
    executeOccurrencePayment: async (occurrenceId, paymentDetails = {}, options = {}) => {
        const activeMode = options.mode || await CommitmentsService.getMode();

        if (activeMode === AppMode.DEMO) {
            const demoData = buildDemoFixtures();
            const occ = (demoData.occurrences || []).find(o => o.id === occurrenceId) || {
                id: occurrenceId,
                commitmentId: 'demo_commitment',
                commitmentName: 'Demo Obligation',
                expectedAmount: rupeesToMoneyPaise(1000),
                status: PaymentOccurrenceStatus.UPCOMING
            };
            const updated = recordPaymentOccurrence(occ, {
                ...paymentDetails,
                cashbookTransactionId: `demo_tx_${Date.now()}`
            });
            return {
                success: true,
                occurrence: updated,
                cashbookTransactionId: updated.cashbookTransactionId,
                replayed: false
            };
        }

        const occurrences = await StorageService.load(STORAGE_KEY_OCCURRENCES) || [];
        const index = occurrences.findIndex(o => o.id === occurrenceId);
        if (index < 0) {
            throw new Error(`Occurrence not found: ${occurrenceId}`);
        }

        const currentOcc = occurrences[index];

        // Idempotency check: if already PAID, return existing transaction idempotently
        if (currentOcc.status === PaymentOccurrenceStatus.PAID) {
            return {
                success: true,
                occurrence: currentOcc,
                cashbookTransactionId: currentOcc.cashbookTransactionId || currentOcc.transactionId,
                replayed: true
            };
        }

        // 1. Transition UPCOMING/OVERDUE/FAILED -> PAID_PENDING_RECONCILIATION
        const paymentOpId = paymentDetails.paymentOperationId || `pop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const idempotencyKey = generateRecurringPaymentIdempotencyKey(currentOcc.commitmentId, currentOcc.id, paymentOpId);

        const preparedOcc = preparePaymentOccurrence(currentOcc, {
            paymentOperationId: paymentOpId,
            idempotencyKey
        });
        occurrences[index] = preparedOcc;
        await StorageService.save(STORAGE_KEY_OCCURRENCES, occurrences);

        // 2. Prepare Cashbook transaction payload
        const paiseVal = paymentDetails.actualAmount ? paymentDetails.actualAmount.paise : preparedOcc.expectedAmount.paise;
        if (!paiseVal || typeof paiseVal !== 'string' || !/^\d+$/.test(paiseVal.trim())) {
            throw new Error(`Invalid payment amount paise string: "${paiseVal}". Must be positive integer string.`);
        }
        const bigPaise = BigInt(paiseVal.trim());
        if (bigPaise <= 0n) {
            throw new Error(`Payment amount must be greater than zero. Received: ${paiseVal}`);
        }
        if (bigPaise > 10000000000000n) {
            throw new Error('Payment amount exceeds maximum supported transaction limit (₹100 Crore).');
        }
        const expectedPaise = BigInt(preparedOcc.expectedAmount.paise);
        if (bigPaise < expectedPaise && !paymentDetails.allowPartial) {
            throw new Error(`Partial payment not enabled. Expected ${expectedPaise} paise, received ${bigPaise} paise.`);
        }

        const txDate = paymentDetails.actualPaidDate || new Date().toISOString().split('T')[0];

        let accountId = paymentDetails.accountId;
        const envelope = await CashbookRepository.load({ mode: activeMode });
        if (accountId) {
            const accountExists = (envelope.accounts || []).some(a => a.id === accountId);
            if (!accountExists) {
                throw new Error(`Cashbook account "${accountId}" does not exist in authoritative Cashbook repository`);
            }
        } else {
            accountId = envelope.accounts?.[0]?.id || 'acc_primary_checking';
        }

        const cashbookTxn = {
            id: `tx_rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            transactionType: TransactionType.EXPENSE,
            accountId,
            sourceAccountId: accountId,
            amount: createMoneyPaise(paiseVal),
            amountPaise: paiseVal,
            date: txDate,
            category: paymentDetails.category || preparedOcc.commitmentType || 'Bills & Utilities',
            description: paymentDetails.description || `Recurring: ${preparedOcc.commitmentName || 'Obligation'}`,
            idempotencyKey,
            status: 'POSTED',
            metadata: {
                recurringCommitmentId: preparedOcc.commitmentId,
                occurrenceId: preparedOcc.id,
                paymentOperationId: paymentOpId
            }
        };

        // 3. Post to Cashbook with error safety
        let savedTxn;
        try {
            savedTxn = await CashbookRepository.saveTransaction(cashbookTxn, { mode: activeMode });
        } catch (err) {
            // Cashbook write failed! Invariant: NEVER mark occurrence as PAID.
            const failedOcc = failReconciliationOccurrence(preparedOcc, err.message, {
                errorCode: err.code || 'CASHBOOK_POST_FAILED',
                paymentOperationId: paymentOpId,
                attemptCount: (currentOcc.reconciliationAttempts || 0) + 1,
                idempotencyKey
            });
            occurrences[index] = failedOcc;
            await StorageService.save(STORAGE_KEY_OCCURRENCES, occurrences);

            throw new Error(`CASHBOOK_RECONCILIATION_FAILED: ${err.message}`);
        }

        // 4. Mark occurrence as confirmed PAID with cashbookTransactionId
        const confirmedOcc = recordPaymentOccurrence(preparedOcc, {
            ...paymentDetails,
            cashbookTransactionId: savedTxn.id,
            transactionId: savedTxn.id,
            actualPaidDate: txDate,
            actualAmount: createMoneyPaise(paiseVal)
        });
        occurrences[index] = confirmedOcc;
        await StorageService.save(STORAGE_KEY_OCCURRENCES, occurrences);

        // 5. Append Audit Event
        const auditEvent = createAuditEvent({
            eventType: AuditEventType.PAYMENT_RECORDED,
            commitmentId: confirmedOcc.commitmentId,
            occurrenceId: confirmedOcc.id,
            previousState: currentOcc,
            newState: confirmedOcc,
            source: AuditSource.USER
        });
        await CommitmentsService.appendAuditEvent(auditEvent);

        return {
            success: true,
            occurrence: confirmedOcc,
            cashbookTransactionId: savedTxn.id,
            transaction: savedTxn,
            replayed: false
        };
    },

    /**
     * Reverses a paid occurrence by posting a linked Cashbook REFUND / REVERSAL transaction.
     */
    reverseOccurrencePayment: async (occurrenceId, reversalDetails = {}, options = {}) => {
        const activeMode = options.mode || await CommitmentsService.getMode();
        const occurrences = await StorageService.load(STORAGE_KEY_OCCURRENCES) || [];
        const index = occurrences.findIndex(o => o.id === occurrenceId);
        if (index < 0) {
            throw new Error(`Occurrence not found: ${occurrenceId}`);
        }

        const currentOcc = occurrences[index];
        if (currentOcc.status !== PaymentOccurrenceStatus.PAID) {
            throw new Error(`Only PAID occurrences can be reversed. Current status: ${currentOcc.status}`);
        }

        const originalTxId = currentOcc.cashbookTransactionId || currentOcc.transactionId;
        const reversalTxId = `tx_rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const paiseVal = currentOcc.actualAmount?.paise || currentOcc.expectedAmount?.paise || '0';

        let reversalTxn = null;
        if (activeMode !== AppMode.DEMO && originalTxId) {
            const envelope = await CashbookRepository.load({ mode: activeMode });
            const origTx = envelope.transactions?.find(t => t.id === originalTxId);
            const accountId = origTx?.accountId || envelope.accounts?.[0]?.id || 'acc_primary_checking';

            reversalTxn = await CashbookRepository.saveTransaction({
                id: reversalTxId,
                transactionType: TransactionType.REFUND,
                accountId,
                destinationAccountId: accountId,
                amount: createMoneyPaise(paiseVal),
                amountPaise: paiseVal,
                date: reversalDetails.reversalDate || new Date().toISOString().split('T')[0],
                category: origTx?.category || 'Refunds',
                description: `Reversal of: ${currentOcc.commitmentName} (Tx: ${originalTxId})`,
                idempotencyKey: `reversal:${originalTxId}:${currentOcc.id}`,
                status: 'POSTED',
                metadata: {
                    originalTransactionId: originalTxId,
                    reversalOfOccurrenceId: currentOcc.id
                }
            }, { mode: activeMode });
        }

        const updatedOcc = reversePaymentOccurrence(currentOcc, {
            reversalTransactionId: reversalTxn?.id || reversalTxId,
            reason: reversalDetails.reason || 'Manual user reversal'
        });
        occurrences[index] = updatedOcc;
        await StorageService.save(STORAGE_KEY_OCCURRENCES, occurrences);

        // Record audit event using canonical event name PAYMENT_CORRECTED
        const auditEvent = createAuditEvent({
            eventType: AuditEventType.PAYMENT_CORRECTED,
            commitmentId: updatedOcc.commitmentId,
            occurrenceId: updatedOcc.id,
            previousState: currentOcc,
            newState: updatedOcc,
            source: AuditSource.USER
        });
        await CommitmentsService.appendAuditEvent(auditEvent);

        return {
            success: true,
            occurrence: updatedOcc,
            reversalTransactionId: updatedOcc.reversalTransactionId
        };
    },

    /**
     * Authoritative calculation of normalized monthly committed outflow for Emergency Runway and planning.
     * Distinguishes:
     * - AVAILABLE: active commitments exist and committed outflow > 0n
     * - EMPTY: commitments configured but total committed outflow is 0n
     * - NOT_CONFIGURED: zero commitments configured
     * - UNAVAILABLE: error reading commitments
     */
    getMonthlyCommittedOutflowPaise: async (options = {}) => {
        try {
            const data = await CommitmentsService.load(options);
            const commitments = data.commitments || [];
            
            if (commitments.length === 0) {
                return {
                    status: EmergencyRunwayStatus.NOT_CONFIGURED,
                    monthlyCommittedOutflowPaise: 0n,
                    strictCommittedPaise: 0n,
                    estimatedPaise: 0n,
                    variablePaise: 0n,
                    activeCount: 0,
                    hasOnlyVariable: false,
                    reason: 'No recurring obligations configured'
                };
            }

            const outflow = calculateMonthlyCommittedOutflow(commitments, options);

            if (outflow.totalCommittedPaise === 0n) {
                return {
                    status: EmergencyRunwayStatus.EMPTY,
                    monthlyCommittedOutflowPaise: 0n,
                    strictCommittedPaise: 0n,
                    estimatedPaise: 0n,
                    variablePaise: 0n,
                    activeCount: outflow.activeCount,
                    hasOnlyVariable: outflow.hasOnlyVariable,
                    reason: 'Commitments are configured with zero total committed outflow'
                };
            }

            return {
                status: EmergencyRunwayStatus.AVAILABLE,
                monthlyCommittedOutflowPaise: outflow.totalCommittedPaise,
                strictCommittedPaise: outflow.strictCommittedPaise,
                estimatedPaise: outflow.estimatedPaise,
                variablePaise: outflow.variablePaise,
                activeCount: outflow.activeCount,
                hasOnlyVariable: outflow.hasOnlyVariable,
                assumptionStatus: outflow.assumptionStatus
            };
        } catch (err) {
            return {
                status: EmergencyRunwayStatus.UNAVAILABLE,
                monthlyCommittedOutflowPaise: 0n,
                error: err.message,
                reason: 'Commitments source cannot be read'
            };
        }
    },

    /**
     * Consumed by Budgets and Reports to project commitments for a given period.
     * Prevents double counting:
     * - unpaidPaise: future unpaid commitment occurrences in period (plus overdue if includeOverdue)
     * - paidPaise: occurrences in period that were already paid (accounted for in Cashbook spending)
     * - committedPaise: total scheduled in period (unpaidPaise + paidPaise)
     * - overduePaise: unpaid occurrences prior to period or asOfDate
     * 
     * @param {object} options { periodKey, includeOverdue = true, mode, asOfDate }
     * @returns {object} Typed projection
     */
    getCommittedObligationProjection: async (options = {}) => {
        const {
            periodKey,
            includeOverdue = true,
            asOfDate = new Date().toISOString().split('T')[0]
        } = options;

        try {
            const data = await CommitmentsService.load(options);
            const occurrences = data.occurrences || [];

            let startDate, endDate;
            if (periodKey && /^\d{4}-\d{2}$/.test(periodKey)) {
                startDate = `${periodKey}-01`;
                const [year, month] = periodKey.split('-').map(Number);
                const lastDay = new Date(year, month, 0).getDate();
                endDate = `${periodKey}-${String(lastDay).padStart(2, '0')}`;
            } else {
                const asOfMonth = asOfDate.substring(0, 7);
                startDate = `${asOfMonth}-01`;
                const [year, month] = asOfMonth.split('-').map(Number);
                const lastDay = new Date(year, month, 0).getDate();
                endDate = `${asOfMonth}-${String(lastDay).padStart(2, '0')}`;
            }

            let committedPaise = 0n;
            let paidPaise = 0n;
            let unpaidPaise = 0n;
            let overduePaise = 0n;
            const sourceRecords = [];

            for (const occ of occurrences) {
                if (occ.status === PaymentOccurrenceStatus.CANCELLED) continue;
                const occDate = occ.scheduledDate;
                const amount = occ.actualAmount ? moneyToBigInt(occ.actualAmount) : (occ.expectedAmount ? moneyToBigInt(occ.expectedAmount) : 0n);

                const inPeriod = occDate >= startDate && occDate <= endDate;
                const isOverdue = occDate < asOfDate && occ.status !== PaymentOccurrenceStatus.PAID && occ.status !== PaymentOccurrenceStatus.SKIPPED;

                if (isOverdue) {
                    overduePaise += amount;
                }

                if (inPeriod) {
                    committedPaise += amount;
                    if (occ.status === PaymentOccurrenceStatus.PAID) {
                        paidPaise += amount;
                    } else if (occ.status !== PaymentOccurrenceStatus.SKIPPED) {
                        unpaidPaise += amount;
                    }
                    sourceRecords.push(occ);
                }
            }

            const effectiveUnpaidPaise = includeOverdue ? (unpaidPaise + overduePaise) : unpaidPaise;

            return {
                status: 'AVAILABLE',
                committedPaise,
                paidPaise,
                unpaidPaise: effectiveUnpaidPaise,
                overduePaise,
                sourceRecords,
                unavailableSources: [],
                asOfDate,
                periodKey: periodKey || asOfDate.substring(0, 7)
            };
        } catch (err) {
            return {
                status: 'UNAVAILABLE',
                committedPaise: 0n,
                paidPaise: 0n,
                unpaidPaise: 0n,
                overduePaise: 0n,
                sourceRecords: [],
                unavailableSources: ['Commitments'],
                asOfDate,
                error: err.message
            };
        }
    },

    /**
     * Appends an audit event to the persistent audit log.
     */
    appendAuditEvent: async (event) => {
        const log = await StorageService.load(STORAGE_KEY_AUDIT_LOG) || [];
        log.push(event);
        await StorageService.save(STORAGE_KEY_AUDIT_LOG, log);
    },

    /**
     * Loads all commitments for active mode.
     */
    loadCommitments: async (options = {}) => {
        const data = await CommitmentsService.load(options);
        return data.commitments || [];
    },

    /**
     * Loads all occurrences for active mode.
     */
    loadOccurrences: async (options = {}) => {
        const data = await CommitmentsService.load(options);
        return data.occurrences || [];
    },

    /**
     * Loads complete audit log.
     */
    loadAuditLog: async () => {
        return await StorageService.load(STORAGE_KEY_AUDIT_LOG) || [];
    }
};
