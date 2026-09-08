/**
 * Test Suite: FinLife Family Phase 4 Financial & Reporting Adapters
 * Verifies read-only financial synthesis, 9-point emergency readiness, and 9 report cards.
 * Uses neutral identities.
 */

import assert from 'node:assert';
import {
    PolicyType,
    PolicyStatus,
    CircleCategory,
    FamilyRole,
    DataAvailabilityState,
    createPerson
} from '../../services/family/familyContracts.js';
import { FamilyFinancialAdapter } from '../../services/family/familyFinancialAdapter.js';
import {
    FamilyReportViewModel,
    evaluateEmergencyReadiness
} from '../../services/family/familyReportViewModel.js';

let totalAssertions = 0;
function check(condition, message) {
    assert.ok(condition, message);
    totalAssertions++;
}

async function runPhase4Tests() {
    console.log('\n--- Running FinLife Family Phase 4 Financial & Reporting Verification ---');

    // 1. Emergency Liquidity Runway Calculations
    const runwayEmpty = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(50000000n, 0n);
    check(runwayEmpty.state === DataAvailabilityState.NOT_CONFIGURED, 'Runway unconfigured when expense is 0');
    check(runwayEmpty.runwayDisplay === '—', 'Runway display is dash for 0 expense');

    // ₹3,00,000 liquid, ₹50,000 monthly expense -> 6.0 months (EXCELLENT)
    const runwayExc = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(30000000n, 5000000n);
    check(runwayExc.state === DataAvailabilityState.AVAILABLE, 'Runway status is AVAILABLE');
    check(runwayExc.runwayMonths === 6.0, 'Runway is exactly 6.0 months');
    check(runwayExc.status === 'EXCELLENT', 'Runway status is EXCELLENT');
    check(runwayExc.meetsThreeMonthStandard === true, 'Meets 3-month standard');

    // ₹1,00,000 liquid, ₹50,000 monthly expense -> 2.0 months (CRITICAL)
    const runwayCrit = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(10000000n, 5000000n);
    check(runwayCrit.runwayMonths === 2.0, 'Runway is 2.0 months');
    check(runwayCrit.status === 'CRITICAL', 'Runway status is CRITICAL');
    check(runwayCrit.meetsThreeMonthStandard === false, 'Does not meet 3-month standard');

    // 2. Net Worth Snapshot (Read-Only)
    const nwSnapshot = await FamilyFinancialAdapter.getFamilyNetWorthSnapshot();
    check(nwSnapshot.state !== undefined, 'Net worth snapshot returned with state');
    check(typeof nwSnapshot.totalAssetsPaiseStr === 'string', 'Assets represented as string for UI safety');

    // 3. 9-Point Emergency Readiness Checklist Evaluation
    const personA = createPerson({
        id: 'person_p4_a',
        name: 'Person A',
        role: FamilyRole.HEAD,
        profile: { bloodGroup: 'A+' },
        emergencyProfile: { isEmergencyContact: true, priorityOrder: 1 }
    });
    const personB = createPerson({
        id: 'person_p4_b',
        name: 'Person B',
        role: FamilyRole.SPOUSE,
        profile: { bloodGroup: 'B+' },
        emergencyProfile: { isEmergencyContact: true, priorityOrder: 2 }
    });
    const doctor1 = createPerson({
        id: 'person_p4_doc',
        name: 'Dr. Family Physician',
        circleCategory: CircleCategory.OTHERS,
        role: FamilyRole.OTHER,
        profile: { occupation: 'Doctor' }
    });

    const policies = [
        {
            id: 'pol_p4_term',
            policyType: PolicyType.TERM_LIFE,
            status: PolicyStatus.ACTIVE,
            coverageAmountPaise: 1000000000n
        },
        {
            id: 'pol_p4_health',
            policyType: PolicyType.HEALTH,
            status: PolicyStatus.ACTIVE,
            coverageAmountPaise: 250000000n
        }
    ];

    const documents = [
        { id: 'doc_p4_1', title: 'Passport' }
    ];

    // Person A has medical details
    personA.medicalProfile.allergies = ['Pollen'];

    const readinessEvaluation = evaluateEmergencyReadiness({
        persons: [personA, personB, doctor1],
        policies,
        documents,
        runwayMetrics: runwayExc
    });

    // All 9 items should be satisfied!
    check(readinessEvaluation.totalCount === 9, 'Evaluates exactly 9 readiness items');
    check(readinessEvaluation.completedCount === 9, 'All 9 items satisfied');
    check(readinessEvaluation.scorePercent === 100, 'Score is 100%');
    check(readinessEvaluation.readinessStatus === 'EXCELLENT', 'Readiness status is EXCELLENT');
    check(readinessEvaluation.incompleteItemsList.length === 0, 'Incomplete items list is empty');

    // Remove secondary contact and test incomplete detection
    personB.emergencyProfile.isEmergencyContact = false;
    const partialReadiness = evaluateEmergencyReadiness({
        persons: [personA, personB, doctor1],
        policies,
        documents,
        runwayMetrics: runwayCrit // Fails 3-month reserve
    });
    check(partialReadiness.completedCount === 7, '7 of 9 items completed');
    check(partialReadiness.readinessStatus === 'GOOD', 'Readiness status is GOOD');
    check(partialReadiness.incompleteItemsList.includes('Secondary Emergency Contact Designated'), 'Identifies missing secondary contact');
    check(partialReadiness.incompleteItemsList.includes('Emergency Liquidity Reserve >= 3 Months'), 'Identifies missing liquidity reserve');

    // 4. Report View Model - 9 Report Cards Generation
    const reportsData = FamilyReportViewModel.buildReportsData({
        persons: [personA, personB, doctor1],
        policies,
        documents,
        netWorthSnapshot: nwSnapshot,
        runwayMetrics: runwayExc
    });

    check(reportsData.reportCards.length === 9, 'Generates exactly 9 family report cards');
    const cardIds = reportsData.reportCards.map(c => c.id);
    check(cardIds.includes('REPORT_HEALTH_PROTECTION'), 'Includes Health & Protection report');
    check(cardIds.includes('REPORT_FAMILY_TREE'), 'Includes Family Tree report');
    check(cardIds.includes('REPORT_TRUSTED_CIRCLE'), 'Includes Trusted Circle report');
    check(cardIds.includes('REPORT_INSURANCE'), 'Includes Insurance report');
    check(cardIds.includes('REPORT_RESPONSIBILITIES'), 'Includes Responsibilities report');
    check(cardIds.includes('REPORT_EDUCATION'), 'Includes Education report');
    check(cardIds.includes('REPORT_ELDER_CARE'), 'Includes Elder Care report');
    check(cardIds.includes('REPORT_MEDICAL_REGISTRY'), 'Includes Medical Registry report');
    check(cardIds.includes('REPORT_FINANCIAL_BLUEPRINT'), 'Includes Financial Blueprint report');

    // Check zero BigInt leakage across reportCards
    const jsonStr = JSON.stringify(reportsData.reportCards);
    check(typeof jsonStr === 'string', 'Report cards serialized safely to JSON without BigInt TypeError');

    console.log(`\n[SUCCESS] Phase 4 Financial & Reporting Adapters Verified: ${totalAssertions}/${totalAssertions} checks passed (100%).\n`);
}

runPhase4Tests().catch(err => {
    console.error('\n[FAIL] Phase 4 Verification Failed:', err);
    process.exit(1);
});
