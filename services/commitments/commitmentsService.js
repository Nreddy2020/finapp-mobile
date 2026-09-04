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
    AppMode,
    createMoneyPaise,
    rupeesToMoneyPaise,
    moneyToBigInt,
    validateCommitment
} from './commitmentContracts.js';
import { normalizeToMonthlyPaise, normalizeToYearlyPaise } from './commitmentCalculator.js';
import { generateOccurrences, recordPaymentOccurrence, cancelCommitmentWithOccurrences } from './commitmentEngine.js';
import { createAuditEvent, AuditEventType, AuditSource } from './commitmentAuditTrail.js';

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
        validateCommitment(commitment);
        const activeMode = options.mode || await CommitmentsService.getMode();

        if (activeMode === AppMode.DEMO) {
            // In demo mode, do not write to production storage
            return commitment;
        }

        const commitments = await StorageService.load(STORAGE_KEY_COMMITMENTS) || [];
        const index = commitments.findIndex(c => c.id === commitment.id);

        let previousState = null;
        let eventType = AuditEventType.COMMITMENT_CREATED;

        if (index >= 0) {
            previousState = commitments[index];
            commitments[index] = {
                ...commitment,
                version: (previousState.version || 1) + 1,
                updatedAt: new Date().toISOString()
            };
            eventType = AuditEventType.COMMITMENT_UPDATED;
        } else {
            commitments.push({
                ...commitment,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        await StorageService.save(STORAGE_KEY_COMMITMENTS, commitments);

        // Record audit event
        const auditEvent = createAuditEvent({
            eventType,
            commitmentId: commitment.id,
            previousState,
            newState: commitment,
            source: AuditSource.USER
        });
        await CommitmentsService.appendAuditEvent(auditEvent);

        return commitment;
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
     * Appends an audit event to the persistent audit log.
     */
    appendAuditEvent: async (event) => {
        const log = await StorageService.load(STORAGE_KEY_AUDIT_LOG) || [];
        log.push(event);
        await StorageService.save(STORAGE_KEY_AUDIT_LOG, log);
    }
};
