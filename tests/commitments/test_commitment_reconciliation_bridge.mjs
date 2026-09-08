/**
 * tests/commitments/test_commitment_reconciliation_bridge.mjs
 * 
 * FinLife Financial Reconciliation & Emergency Runway Bridge Verification Suite.
 * Target: Unpaid vs Paid Separation, Safe-to-Spend Headroom, Zero-Outflow Protection,
 * Runway State Machine, and Versioned Emergency Readiness.
 */

import assert from 'assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService, STORAGE_KEYS } from '../../services/storage.js';
import { CashbookRepository } from '../../services/cashbook/cashbookRepository.js';
import {
    CommitmentType,
    FinancialNature,
    AmountMode,
    RecurrenceFrequency,
    CommitmentStatus,
    PaymentOccurrenceStatus,
    CashbookReconciliationStatus,
    EmergencyRunwayStatus,
    createMoneyPaise,
    rupeesToMoneyPaise,
    moneyToBigInt,
    createCommitmentFinancialProjection
} from '../../services/commitments/commitmentContracts.js';
import {
    normalizeToMonthlyPaise,
    calculateMonthlyCommittedOutflow,
    bigIntDivRound
} from '../../services/commitments/commitmentCalculator.js';
import { CommitmentsService } from '../../services/commitments/commitmentsService.js';
import { BudgetService } from '../../services/budgets.js';
import { FamilyFinancialAdapter } from '../../services/family/familyFinancialAdapter.js';
import {
    evaluateEmergencyReadiness,
    EMERGENCY_READINESS_V1,
    EMERGENCY_READINESS_V2,
    EMERGENCY_READINESS_V1_COUNT,
    EMERGENCY_READINESS_V2_COUNT
} from '../../services/family/familyReportViewModel.js';
import { DataAvailabilityState } from '../../services/family/familyContracts.js';

let totalChecks = 0;
let passedChecks = 0;

function check(desc, condition) {
    totalChecks++;
    if (condition) {
        passedChecks++;
        console.log(`  [PASS] ${desc}`);
    } else {
        console.error(`  [FAIL] ${desc}`);
        throw new Error(`Assertion failed: ${desc}`);
    }
}

async function runSuite() {
    console.log('================================================================');
    console.log('🧪 FINLIFE COMMITMENTS & RECONCILIATION BRIDGE SUITE');
    console.log('   Target: Safe-to-Spend Headroom, Runway States & V1/V2 Readiness');
    console.log('================================================================\n');

    // Clean storage
    await AsyncStorage.clear();
    await CommitmentsService.setMode('PRODUCTION');
    await CashbookRepository.setMode('PRODUCTION');

    // -------------------------------------------------------------
    // SECTION 1: FINANCIAL RECONCILIATION & SAFE-TO-SPEND HEADROOM
    // -------------------------------------------------------------
    console.log('--- 1. FINANCIAL RECONCILIATION & SAFE-TO-SPEND HEADROOM ---');

    // Setup: 2 commitments (1 Monthly Rent ₹30,000, 1 Monthly Internet ₹1,000)
    const comm1 = {
        id: 'comm_rent',
        name: 'Apartment Rent',
        type: CommitmentType.RENT,
        financialNature: FinancialNature.EXPENSE,
        amountMode: AmountMode.FIXED,
        amount: rupeesToMoneyPaise(30000),
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: '2026-09-01',
        nextDueDate: '2026-09-05',
        status: CommitmentStatus.ACTIVE,
        version: 1
    };

    const comm2 = {
        id: 'comm_internet',
        name: 'Broadband Fiber',
        type: CommitmentType.UTILITY_BILL,
        financialNature: FinancialNature.EXPENSE,
        amountMode: AmountMode.FIXED,
        amount: rupeesToMoneyPaise(1000),
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: '2026-09-01',
        nextDueDate: '2026-09-15',
        status: CommitmentStatus.ACTIVE,
        version: 1
    };

    // Rent was PAID in Cashbook (₹30,000 paid)
    const occRentPaid = {
        id: 'occ_rent_sep',
        commitmentId: 'comm_rent',
        commitmentName: 'Apartment Rent',
        commitmentType: CommitmentType.RENT,
        scheduledDate: '2026-09-05',
        expectedAmount: rupeesToMoneyPaise(30000),
        actualAmount: rupeesToMoneyPaise(30000),
        status: PaymentOccurrenceStatus.PAID,
        cashbookTransactionId: 'tx_rent_paid_001',
        cashbookReconciliationStatus: CashbookReconciliationStatus.MATCHED
    };

    // Internet is UPCOMING (₹1,000 unpaid)
    const occInternetUpcoming = {
        id: 'occ_internet_sep',
        commitmentId: 'comm_internet',
        commitmentName: 'Broadband Fiber',
        commitmentType: CommitmentType.UTILITY_BILL,
        scheduledDate: '2026-09-15',
        expectedAmount: rupeesToMoneyPaise(1000),
        status: PaymentOccurrenceStatus.UPCOMING,
        cashbookReconciliationStatus: CashbookReconciliationStatus.UNMATCHED
    };

    await StorageService.save('FINLIFE_COMMITMENTS_V2', [comm1, comm2]);
    await StorageService.save('FINLIFE_OCCURRENCES_V2', [occRentPaid, occInternetUpcoming]);

    // 1.1 Test getCommittedObligationProjection
    const projection = await CommitmentsService.getCommittedObligationProjection({
        periodKey: '2026-09',
        includeOverdue: true,
        asOfDate: '2026-09-08'
    });

    check('Section 1 | Check 1.1: Total committed scheduled in period: ₹31,000 (3100000n paise)',
        projection.committedPaise === 3100000n);
    check('Section 1 | Check 1.2: Paid commitment separated: ₹30,000 (3000000n paise)',
        projection.paidPaise === 3000000n);
    check('Section 1 | Check 1.3: Unpaid commitment separated: ₹1,000 (100000n paise)',
        projection.unpaidPaise === 100000n);

    // 1.2 Cashbook Ledger setup: Rent transaction ₹30,000 + Groceries ₹5,000
    // Total operating spent in Cashbook = ₹35,000
    const cashbookEnvelope = {
        version: 2,
        activeBookId: 'book_personal',
        accounts: [{ id: 'acc_main', name: 'Main Account', balancePaise: '10000000', accountType: 'SAVINGS' }],
        transactions: [
            {
                id: 'tx_rent_paid_001',
                transactionType: 'EXPENSE',
                accountId: 'acc_main',
                amountPaise: '3000000', // ₹30,000 (the paid rent!)
                date: '2026-09-05',
                category: 'Housing'
            },
            {
                id: 'tx_groceries_002',
                transactionType: 'EXPENSE',
                accountId: 'acc_main',
                amountPaise: '500000', // ₹5,000 (discretionary/operating)
                date: '2026-09-07',
                category: 'Food & Dining'
            }
        ],
        dailyClosings: [],
        auditLog: []
    };
    await StorageService.save('FINLIFE_CASHBOOK_PROD_V1', cashbookEnvelope);

    // Budgets setup
    await BudgetService.saveBudget({ category: 'Housing', limit: 35000, periodKey: '2026-09' });
    await BudgetService.saveBudget({ category: 'Food & Dining', limit: 10000, periodKey: '2026-09' });

    // 1.3 Safe-to-Spend Headroom calculation
    // Monthly income = ₹1,00,000 (10000000n paise)
    // Rule: Safe-to-Spend = Monthly Income - Unpaid Committed (₹1,000) - Operating Spent (₹35,000)
    // Total outflow = ₹36,000. Safe-to-Spend = ₹64,000.
    // Invariant: The paid rent (₹30,000) was in Operating Spent, so it is NOT deducted again as unpaid commitment!
    const headroom = await BudgetService.getSafeToSpendHeadroom({
        periodKey: '2026-09',
        monthlyIncomePaise: 10000000n // ₹1,00,000
    });

    check('Section 1 | Check 1.4: Operating spent accurately derived from Cashbook: ₹35,000',
        headroom.operatingSpentPaise === 3500000n);
    check('Section 1 | Check 1.5: Unpaid commitment accurately derived: ₹1,000',
        headroom.unpaidCommittedPaise === 100000n);
    check('Section 1 | Check 1.6: Total committed + operating obligations: ₹36,000',
        headroom.totalOutflowObligationsPaise === 3600000n);
    check('Section 1 | Check 1.7: Discretionary safe-to-spend headroom: ₹64,000 (no double-counting of paid rent!)',
        headroom.discretionarySafeToSpendPaise === 6400000n);
    check('Section 1 | Check 1.8: Zero deficit when headroom is positive',
        headroom.deficitPaise === 0n && headroom.isDeficit === false);

    // 1.4 Deficit scenario: Income is only ₹30,000, obligations are ₹36,000 -> Deficit ₹6,000
    const deficitHeadroom = await BudgetService.getSafeToSpendHeadroom({
        periodKey: '2026-09',
        monthlyIncomePaise: 3000000n // ₹30,000
    });
    check('Section 1 | Check 1.9: Safe-to-spend clamps to 0n on deficit',
        deficitHeadroom.discretionarySafeToSpendPaise === 0n);
    check('Section 1 | Check 1.10: Accurately calculates deficit of ₹6,000 (600000n paise)',
        deficitHeadroom.deficitPaise === 600000n && deficitHeadroom.isDeficit === true);

    // 1.5 Canonical Financial Reference compatibility
    const projectionRef = createCommitmentFinancialProjection({
        occurrence: occRentPaid,
        commitment: comm1,
        asOfDate: '2026-09-08'
    });
    check('Section 1 | Check 1.11: Canonical financial reference contains sourceType COMMITMENT',
        projectionRef.reference.sourceType === 'COMMITMENT');
    check('Section 1 | Check 1.12: Canonical financial reference contains sourceDomain Commitments',
        projectionRef.reference.sourceDomain === 'Commitments');
    check('Section 1 | Check 1.13: Canonical financial projection exposes amountPaise and currency',
        projectionRef.amountPaise === '3000000' && projectionRef.currency === 'INR');

    // -------------------------------------------------------------
    // SECTION 2: EMERGENCY RUNWAY STATES & ZERO-OUTFLOW PROTECTION
    // -------------------------------------------------------------
    console.log('\n--- 2. EMERGENCY RUNWAY STATES & ZERO-OUTFLOW PROTECTION ---');

    // 2.1 State: AVAILABLE (Liquid ₹3,00,000, Committed Monthly ₹50,000 -> 6.0 Months EXCELLENT)
    const runwayAvail = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(
        30000000n, // ₹3,00,000
        5000000n,  // ₹50,000
        { status: 'AVAILABLE' }
    );
    check('Section 2 | Check 2.1: Available state returns exact 6.0 months',
        runwayAvail.state === DataAvailabilityState.AVAILABLE && runwayAvail.runwayMonths === 6.0);
    check('Section 2 | Check 2.2: Available state returns EXCELLENT status',
        runwayAvail.status === 'EXCELLENT');
    check('Section 2 | Check 2.3: Meets 3-month standard',
        runwayAvail.meetsThreeMonthStandard === true);

    // 2.2 State: EMPTY / NO_COMMITTED_OUTFLOW
    // Invariant: monthlyCommittedOutflowPaise === 0n must NOT produce Infinity or arbitrary large number!
    const runwayZeroOutflow = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(
        30000000n, // ₹3,00,000
        0n,         // ₹0 committed outflow
        { status: 'NO_COMMITTED_OUTFLOW' }
    );
    check('Section 2 | Check 2.4: Zero outflow does NOT produce Infinity',
        runwayZeroOutflow.runwayMonths === null && runwayZeroOutflow.runwayMonths !== Infinity);
    check('Section 2 | Check 2.5: Zero outflow returns NO_COMMITTED_OUTFLOW status',
        runwayZeroOutflow.status === 'NO_COMMITTED_OUTFLOW');
    check('Section 2 | Check 2.6: Zero outflow display is dash (—)',
        runwayZeroOutflow.runwayDisplay === '—');
    check('Section 2 | Check 2.7: Zero outflow includes explicit human reason',
        runwayZeroOutflow.reason.includes('No active committed outflow'));

    // 2.3 State: NOT_CONFIGURED
    const runwayNotConfigured = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(
        30000000n,
        0n,
        { status: 'NOT_CONFIGURED', commitmentsCount: 0 }
    );
    check('Section 2 | Check 2.8: Not configured state returns NOT_CONFIGURED',
        runwayNotConfigured.state === DataAvailabilityState.NOT_CONFIGURED);
    check('Section 2 | Check 2.9: Not configured runwayMonths is null',
        runwayNotConfigured.runwayMonths === null);

    // 2.4 State: UNAVAILABLE
    const runwayUnavail = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(
        null,
        null,
        { status: 'UNAVAILABLE' }
    );
    check('Section 2 | Check 2.10: Unavailable state returns UNAVAILABLE',
        runwayUnavail.state === DataAvailabilityState.UNAVAILABLE && runwayUnavail.runwayMonths === null);

    // 2.5 State: PARTIAL (Liquid available, Commitments unavailable)
    const runwayPartial = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(
        30000000n,
        null,
        { status: 'PARTIAL', missingSource: 'Commitments' }
    );
    check('Section 2 | Check 2.11: Partial state returns PARTIAL with missingSource',
        runwayPartial.state === DataAvailabilityState.PARTIAL && runwayPartial.missingSource === 'Commitments');

    // 2.6 Variable-only commitments: isolated from strict committed baseline
    const variableOnlyComm = [
        {
            id: 'comm_var',
            name: 'Electricity Variable',
            type: CommitmentType.UTILITY_BILL,
            amountMode: AmountMode.VARIABLE,
            amount: rupeesToMoneyPaise(4000),
            frequency: RecurrenceFrequency.MONTHLY,
            status: CommitmentStatus.ACTIVE
        }
    ];
    const variableOutflow = calculateMonthlyCommittedOutflow(variableOnlyComm, {
        includeEstimated: true,
        includeVariable: false
    });
    check('Section 2 | Check 2.12: Strict committed baseline excludes variable commitments (0n)',
        variableOutflow.strictCommittedPaise === 0n);
    check('Section 2 | Check 2.13: Correctly flags hasOnlyVariable = true',
        variableOutflow.hasOnlyVariable === true);
    check('Section 2 | Check 2.14: Conservative outflow includes variable: ₹4,000',
        variableOutflow.conservativeOutflowPaise === 400000n);

    // 2.7 Annual normalization with exact half-up integer rounding
    // ₹25,000 yearly -> (2500000 + 6) / 12 = 208333 paise (₹2,083.33)
    const yearlyNorm = normalizeToMonthlyPaise(rupeesToMoneyPaise(25000), RecurrenceFrequency.YEARLY);
    check('Section 2 | Check 2.15: Annual normalization executes exact half-up integer division: 208333 paise',
        yearlyNorm.paise === '208333');

    // 2.8 Rounding remainder preservation: weekly normalization
    // Weekly ₹1,000 (100000 paise) -> (100000 * 52 + 6) / 12 = 433333 paise (₹4,333.33/mo)
    const weeklyNorm = normalizeToMonthlyPaise(rupeesToMoneyPaise(1000), RecurrenceFrequency.WEEKLY);
    check('Section 2 | Check 2.16: Weekly normalization preserves integer rounding remainder: 433333 paise',
        weeklyNorm.paise === '433333');

    // -------------------------------------------------------------
    // SECTION 3: EMERGENCY READINESS VERSIONING (V1 vs V2)
    // -------------------------------------------------------------
    console.log('\n--- 3. EMERGENCY READINESS VERSIONING (V1 vs V2) ---');

    const samplePersons = [
        {
            id: 'p1',
            core: { circleCategory: 'FAMILY', role: 'HEAD' },
            profile: { bloodGroup: 'O+' },
            emergencyProfile: { isEmergencyContact: true, priorityOrder: 1 },
            medicalProfile: { allergies: ['Penicillin'] }
        },
        {
            id: 'p2',
            core: { circleCategory: 'FAMILY', role: 'SPOUSE' },
            profile: { bloodGroup: 'A+' },
            emergencyProfile: { isEmergencyContact: true, priorityOrder: 2 },
            medicalProfile: {}
        }
    ];

    const samplePolicies = [
        { id: 'pol_h', policyType: 'HEALTH', status: 'ACTIVE' },
        { id: 'pol_t', policyType: 'TERM_LIFE', status: 'ACTIVE' }
    ];

    const sampleDocs = [{ id: 'doc_1', name: 'Will' }];

    // 3.1 V1: Exactly 9-point checklist
    const readinessV1 = evaluateEmergencyReadiness({
        persons: samplePersons,
        policies: samplePolicies,
        documents: sampleDocs,
        runwayMetrics: runwayAvail,
        version: EMERGENCY_READINESS_V1
    });

    check('Section 3 | Check 3.1: V1 emergency readiness checklist has exactly 9 items',
        readinessV1.totalCount === EMERGENCY_READINESS_V1_COUNT && readinessV1.checklist.length === 9);
    check('Section 3 | Check 3.2: V1 version tag is V1',
        readinessV1.version === EMERGENCY_READINESS_V1);

    // 3.2 V2: Exactly 10-point checklist (adds EMERGENCY_RUNWAY_CONFIGURED)
    const readinessV2 = evaluateEmergencyReadiness({
        persons: samplePersons,
        policies: samplePolicies,
        documents: sampleDocs,
        runwayMetrics: runwayAvail,
        version: EMERGENCY_READINESS_V2
    });

    check('Section 3 | Check 3.3: V2 emergency readiness checklist has exactly 10 items',
        readinessV2.totalCount === EMERGENCY_READINESS_V2_COUNT && readinessV2.checklist.length === 10);
    check('Section 3 | Check 3.4: V2 version tag is V2',
        readinessV2.version === EMERGENCY_READINESS_V2);
    check('Section 3 | Check 3.5: V2 includes EMERGENCY_RUNWAY_CONFIGURED check',
        readinessV2.checklist.some(item => item.id === 'EMERGENCY_RUNWAY_CONFIGURED'));
    check('Section 3 | Check 3.6: V2 marks EMERGENCY_RUNWAY_CONFIGURED as complete when active runway is available',
        readinessV2.checklist.find(item => item.id === 'EMERGENCY_RUNWAY_CONFIGURED').isComplete === true);

    // 3.3 V2 with unconfigured runway: 10th check is incomplete
    const readinessV2Unconf = evaluateEmergencyReadiness({
        persons: samplePersons,
        policies: samplePolicies,
        documents: sampleDocs,
        runwayMetrics: runwayZeroOutflow,
        version: EMERGENCY_READINESS_V2
    });
    check('Section 3 | Check 3.7: V2 marks EMERGENCY_RUNWAY_CONFIGURED as incomplete when outflow is ₹0',
        readinessV2Unconf.checklist.find(item => item.id === 'EMERGENCY_RUNWAY_CONFIGURED').isComplete === false);

    console.log(`\n================================================================`);
    console.log(`[SUCCESS] Reconciliation Bridge Suite: ${passedChecks} / ${totalChecks} checks passed (100%).`);
    console.log(`================================================================\n`);
}

runSuite().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
