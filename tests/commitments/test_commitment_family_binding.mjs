/**
 * tests/commitments/test_commitment_family_binding.mjs
 * 
 * FinLife Commitments & Family Hub Binding Verification Suite.
 * Target: Idempotency, Lifecycle State Machine, Family Context Integrity,
 * Orphan Detection, and Zero-BigInt UI safety.
 */

import assert from 'assert';
import { StorageService } from '../../services/storage.js';
import {
    CommitmentType,
    FinancialNature,
    AmountMode,
    RecurrenceFrequency,
    CommitmentStatus,
    PaymentOccurrenceStatus,
    CashbookReconciliationStatus,
    FamilyObligationCategory,
    createMoneyPaise,
    rupeesToMoneyPaise,
    moneyToBigInt,
    validateCommitment
} from '../../services/commitments/commitmentContracts.js';
import {
    preparePaymentOccurrence,
    recordPaymentOccurrence,
    failReconciliationOccurrence,
    reversePaymentOccurrence,
    generateOccurrences
} from '../../services/commitments/commitmentEngine.js';
import {
    validateFamilyContext,
    enrichCommitmentWithFamilyPresentation,
    getFamilyObligationsBreakdown
} from '../../services/commitments/familyCommitmentBridge.js';
import { CommitmentsService } from '../../services/commitments/commitmentsService.js';
import { FamilyStatus } from '../../services/family/familyContracts.js';

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
    console.log('🧪 FINLIFE COMMITMENTS & FAMILY BINDING SUITE');
    console.log('   Target: Idempotency, State Machine, Family Graph & Integrity');
    console.log('================================================================\n');

    // Setup isolated test storage
    const testStorage = new Map();
    StorageService.load = async (key, def = null) => testStorage.has(key) ? testStorage.get(key) : def;
    StorageService.save = async (key, val) => { testStorage.set(key, val); return val; };

    // Set production mode for clean test environment
    await CommitmentsService.setMode('PRODUCTION');

    // -------------------------------------------------------------
    // SECTION 1: OCCURRENCE PAYMENT STATE MACHINE & IDEMPOTENCY
    // -------------------------------------------------------------
    console.log('--- 1. OCCURRENCE PAYMENT STATE MACHINE & IDEMPOTENCY ---');

    const baseOccurrence = {
        id: 'occ_test_001',
        commitmentId: 'comm_elder_care',
        commitmentName: 'Parent Monthly Healthcare',
        commitmentType: CommitmentType.MEDICAL_CARE,
        financialNature: FinancialNature.EXPENSE,
        scheduledDate: '2026-09-10',
        expectedAmount: rupeesToMoneyPaise(5000),
        status: PaymentOccurrenceStatus.UPCOMING,
        idempotencyKey: 'comm_elder_care:occ_test_001'
    };

    // 1.1 Transition UPCOMING -> PAID_PENDING_RECONCILIATION
    const pendingOcc = preparePaymentOccurrence(baseOccurrence, {
        paymentOperationId: 'pop_001'
    });
    check('Section 1 | Check 1.1: Prepares payment with PAID_PENDING_RECONCILIATION status',
        pendingOcc.status === PaymentOccurrenceStatus.PAID_PENDING_RECONCILIATION);
    check('Section 1 | Check 1.2: Sets idempotency key containing operation ID',
        pendingOcc.idempotencyKey.includes('pop_001'));

    // 1.2 Cashbook persistence failure handling: transition to FAILED_RECONCILIATION (RETRYABLE)
    const failedOcc = failReconciliationOccurrence(pendingOcc, 'Network timeout writing Cashbook');
    check('Section 1 | Check 1.3: Failed reconciliation marks status FAILED_RECONCILIATION',
        failedOcc.status === PaymentOccurrenceStatus.FAILED_RECONCILIATION);
    check('Section 1 | Check 1.4: Invariant: Occurrence is NEVER marked PAID on failed Cashbook write',
        failedOcc.status !== PaymentOccurrenceStatus.PAID);
    check('Section 1 | Check 1.5: Captures reconciliation error reason',
        failedOcc.lastReconciliationError === 'Network timeout writing Cashbook');

    // 1.3 Retry and confirm PAID with cashbookTransactionId
    const confirmedPaidOcc = recordPaymentOccurrence(failedOcc, {
        cashbookTransactionId: 'tx_cashbook_999',
        actualPaidDate: '2026-09-10',
        actualAmount: rupeesToMoneyPaise(5000)
    });
    check('Section 1 | Check 1.6: Successful payment transitions to PAID',
        confirmedPaidOcc.status === PaymentOccurrenceStatus.PAID);
    check('Section 1 | Check 1.7: Stores cashbookTransactionId on confirmed occurrence',
        confirmedPaidOcc.cashbookTransactionId === 'tx_cashbook_999');
    check('Section 1 | Check 1.8: Reconciliation status is MATCHED',
        confirmedPaidOcc.cashbookReconciliationStatus === CashbookReconciliationStatus.MATCHED);

    // 1.4 Idempotent replay: paying same occurrence with same transaction returns existing
    const replayed = recordPaymentOccurrence(confirmedPaidOcc, {
        cashbookTransactionId: 'tx_cashbook_999'
    });
    check('Section 1 | Check 1.9: Replaying payment with identical transaction ID returns occurrence idempotently',
        replayed.id === confirmedPaidOcc.id && replayed.status === PaymentOccurrenceStatus.PAID);

    // 1.5 Duplicate payment with conflicting transaction rejected
    let conflictError = false;
    try {
        recordPaymentOccurrence(confirmedPaidOcc, {
            cashbookTransactionId: 'tx_different_888'
        });
    } catch (e) {
        conflictError = true;
    }
    check('Section 1 | Check 1.10: Paying already paid occurrence with different transaction throws error',
        conflictError === true);

    // 1.6 Occurrence reversal: PAID -> UPCOMING with reversal link
    const reversedOcc = reversePaymentOccurrence(confirmedPaidOcc, {
        reversalTransactionId: 'tx_cashbook_reversal_001',
        reason: 'Duplicate auto-debit reversal'
    });
    check('Section 1 | Check 1.11: Reversal restores UPCOMING status',
        reversedOcc.status === PaymentOccurrenceStatus.UPCOMING);
    check('Section 1 | Check 1.12: Reversal links original reversalTransactionId',
        reversedOcc.reversalTransactionId === 'tx_cashbook_reversal_001');
    check('Section 1 | Check 1.13: Reversal clears actual amount and date',
        reversedOcc.actualAmount === null && reversedOcc.actualPaidDate === null);

    // -------------------------------------------------------------
    // SECTION 2: FAMILY CONTEXT VALIDATION & DOMAIN TARGET INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- 2. FAMILY CONTEXT VALIDATION & INTEGRITY ---');

    const mockFamilyStore = {
        persons: [
            { id: 'mem_dad', core: { id: 'mem_dad', firstName: 'Ramesh' }, profile: { name: 'Ramesh Kumar' }, status: FamilyStatus.ACTIVE },
            { id: 'mem_son', core: { id: 'mem_son', firstName: 'Aarav' }, profile: { name: 'Aarav Kumar' }, status: FamilyStatus.ACTIVE },
            { id: 'mem_archived', core: { id: 'mem_archived', firstName: 'Old' }, profile: { name: 'Old Uncle' }, status: FamilyStatus.ARCHIVED }
        ],
        policies: [
            { id: 'pol_health_01', policyType: 'HEALTH', status: 'ACTIVE' }
        ],
        educationGoals: [
            { id: 'edu_goal_aarav', targetAmount: 2000000 }
        ],
        elderCarePlans: [
            { id: 'care_ramesh', monthlyAllowancePaise: '1500000' }
        ]
    };

    // 2.1 Valid family context passes validation
    const validFC = {
        personId: 'mem_dad',
        familyRole: 'PARENT',
        obligationCategory: FamilyObligationCategory.PARENT_SUPPORT,
        elderCarePlanId: 'care_ramesh'
    };
    check('Section 2 | Check 2.1: Valid family context passes validation',
        validateFamilyContext(validFC, mockFamilyStore) === true);

    // 2.2 Reject non-existent member
    let missingMemberError = false;
    try {
        validateFamilyContext({
            personId: 'mem_ghost',
            familyRole: 'PARENT',
            obligationCategory: FamilyObligationCategory.PARENT_SUPPORT
        }, mockFamilyStore);
    } catch (e) {
        missingMemberError = true;
    }
    check('Section 2 | Check 2.2: Rejects non-existent personId', missingMemberError === true);

    // 2.3 Reject new commitment linking to archived member
    let archivedMemberError = false;
    try {
        validateFamilyContext({
            personId: 'mem_archived',
            familyRole: 'OTHER',
            obligationCategory: FamilyObligationCategory.OTHER_FAMILY
        }, mockFamilyStore, { allowArchivedHistorical: false });
    } catch (e) {
        archivedMemberError = true;
    }
    check('Section 2 | Check 2.3: Rejects new commitment link to archived member', archivedMemberError === true);

    // 2.4 Reject conflicting domain links (e.g. policyId AND elderCarePlanId)
    let conflictingDomainError = false;
    try {
        validateFamilyContext({
            personId: 'mem_dad',
            familyRole: 'PARENT',
            obligationCategory: FamilyObligationCategory.PARENT_SUPPORT,
            policyId: 'pol_health_01',
            elderCarePlanId: 'care_ramesh'
        }, mockFamilyStore);
    } catch (e) {
        conflictingDomainError = true;
    }
    check('Section 2 | Check 2.4: Rejects conflicting domain links (policy + elder care)', conflictingDomainError === true);

    // 2.5 Reject missing domain reference target (policyId not in policies)
    let orphanPolicyError = false;
    try {
        validateFamilyContext({
            personId: 'mem_dad',
            familyRole: 'PARENT',
            obligationCategory: FamilyObligationCategory.FAMILY_PROTECTION,
            policyId: 'pol_nonexistent'
        }, mockFamilyStore);
    } catch (e) {
        orphanPolicyError = true;
    }
    check('Section 2 | Check 2.5: Rejects reference to non-existent policyId', orphanPolicyError === true);

    // -------------------------------------------------------------
    // SECTION 3: DERIVED PRESENTATION & ORPHAN DETECTION
    // -------------------------------------------------------------
    console.log('\n--- 3. DERIVED PRESENTATION & ORPHAN DETECTION ---');

    const activeCommitment = {
        id: 'comm_001',
        name: 'Father Monthly Support',
        amount: rupeesToMoneyPaise(15000),
        frequency: RecurrenceFrequency.MONTHLY,
        status: CommitmentStatus.ACTIVE,
        familyContext: {
            personId: 'mem_dad',
            familyRole: 'PARENT',
            obligationCategory: FamilyObligationCategory.PARENT_SUPPORT
        }
    };

    const enriched = enrichCommitmentWithFamilyPresentation(activeCommitment, mockFamilyStore.persons);
    check('Section 3 | Check 3.1: Enriches with authoritative member name from person profile',
        enriched.familyPresentation.familyMemberName === 'Ramesh Kumar');
    check('Section 3 | Check 3.2: Active member link has isOrphaned = false',
        enriched.familyPresentation.isOrphaned === false);
    check('Section 3 | Check 3.3: Active member link status is LINKED_VERIFIED',
        enriched.familyPresentation.linkStatus === 'LINKED_VERIFIED');

    // 3.2 Member archived: historical commitment marked ORPHANED
    const archivedLinkedCommitment = {
        id: 'comm_002',
        name: 'Archived Uncle Care',
        amount: rupeesToMoneyPaise(5000),
        frequency: RecurrenceFrequency.MONTHLY,
        status: CommitmentStatus.ACTIVE,
        familyContext: {
            personId: 'mem_archived',
            familyRole: 'OTHER',
            obligationCategory: FamilyObligationCategory.OTHER_FAMILY
        }
    };

    const enrichedArchived = enrichCommitmentWithFamilyPresentation(archivedLinkedCommitment, mockFamilyStore.persons);
    check('Section 3 | Check 3.4: Commitment linked to archived member marked isOrphaned = true',
        enrichedArchived.familyPresentation.isOrphaned === true);
    check('Section 3 | Check 3.5: Member name flags (Archived)',
        enrichedArchived.familyPresentation.familyMemberName.includes('(Archived)'));
    check('Section 3 | Check 3.6: Link status is ORPHANED',
        enrichedArchived.familyPresentation.linkStatus === 'ORPHANED');

    // 3.3 Member deleted from store: handled gracefully as ORPHANED
    const deletedLinkedCommitment = {
        id: 'comm_003',
        name: 'Deleted Person Loan',
        amount: rupeesToMoneyPaise(2000),
        frequency: RecurrenceFrequency.MONTHLY,
        status: CommitmentStatus.ACTIVE,
        familyContext: {
            personId: 'mem_completely_deleted',
            familyRole: 'OTHER',
            obligationCategory: FamilyObligationCategory.OTHER_FAMILY
        }
    };

    const enrichedDeleted = enrichCommitmentWithFamilyPresentation(deletedLinkedCommitment, mockFamilyStore.persons);
    check('Section 3 | Check 3.7: Deleted member marked isOrphaned = true',
        enrichedDeleted.familyPresentation.isOrphaned === true);
    check('Section 3 | Check 3.8: Shows Unknown Member',
        enrichedDeleted.familyPresentation.familyMemberName === 'Unknown Member');

    // -------------------------------------------------------------
    // SECTION 4: FAMILY OBLIGATIONS BREAKDOWN & BIGINT SAFETY
    // -------------------------------------------------------------
    console.log('\n--- 4. FAMILY OBLIGATIONS BREAKDOWN & BIGINT SAFETY ---');

    const testCommitments = [
        activeCommitment,
        archivedLinkedCommitment,
        deletedLinkedCommitment,
        {
            id: 'comm_unassigned',
            name: 'Generic Cloud Storage',
            amount: rupeesToMoneyPaise(500),
            frequency: RecurrenceFrequency.MONTHLY,
            status: CommitmentStatus.ACTIVE
            // No familyContext
        }
    ];

    const breakdown = getFamilyObligationsBreakdown({
        commitments: testCommitments,
        familyPersons: mockFamilyStore.persons
    });

    check('Section 4 | Check 4.1: Calculates total family monthly committed paise (15000 + 5000 + 2000 = 22,000)',
        breakdown.totalFamilyMonthlyCommitted.paise === '2200000');
    check('Section 4 | Check 4.2: Formats Indian currency string (₹22,000)',
        breakdown.totalFamilyMonthlyDisplay === '₹22,000');
    check('Section 4 | Check 4.3: Correctly identifies 2 orphaned commitments',
        breakdown.orphanedCount === 2);
    check('Section 4 | Check 4.4: Correctly identifies 1 unassigned commitment',
        breakdown.unassignedCount === 1);

    // Presentation Safety: Zero raw BigInt in breakdown
    const hasRawBigInt = (obj) => {
        if (typeof obj === 'bigint') return true;
        if (obj && typeof obj === 'object') {
            for (const key of Object.keys(obj)) {
                if (hasRawBigInt(obj[key])) return true;
            }
        }
        return false;
    };
    check('Section 4 | Check 4.5: Presentation safety: Zero raw BigInt primitives in breakdown structure',
        hasRawBigInt(breakdown) === false);

    console.log(`\n================================================================`);
    console.log(`[SUCCESS] Family Binding Suite: ${passedChecks} / ${totalChecks} checks passed (100%).`);
    console.log(`================================================================\n`);
}

runSuite().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
