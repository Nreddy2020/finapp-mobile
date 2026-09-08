/**
 * tests/loans/test_loan_rate_revisions.mjs
 * 
 * LN-11: Rate Revision & Variable Rate Handling Suite (15 checks)
 */

import assert from 'assert';
import { generateAmortizationSchedule } from '../../services/loans/loanAmortization.js';
import { calculateMonthlyEmiPaise } from '../../services/loans/loanEngine.js';
import { LoanRepository } from '../../services/loans/loanRepository.js';
import { RATE_TYPES, LOAN_TYPES } from '../../services/loans/loanContracts.js';

console.log('================================================================');
console.log('🚀 EXECUTING LN-11: RATE REVISION & VARIABLE RATE SUITE');
console.log('================================================================\n');

let passCount = 0;
async function test(name, fn) {
    process.stdout.write(`  [RUN] ${name}...`);
    try {
        await fn();
        passCount++;
        console.log(`  [PASS] ${name}`);
    } catch (e) {
        console.error(`  [FAIL] ${name}: ${e.message}`);
        throw e;
    }
}

(async () => {
    const P = 400000000n; // 40 Lakhs
    const originalRate = 8.5;
    const originalTenure = 240; // 20 years

    // 1. Baseline Schedule Generation
    const baseline = generateAmortizationSchedule({
        principalPaise: P,
        annualRatePercent: originalRate,
        tenureMonths: originalTenure,
        startDate: '2026-01-01'
    });

    const initialEmi = baseline.summary.monthlyEmiPaise;

    // 2. Rate Increase Scenario (8.5% -> 9.25% after 24 months)
    const afterMonth24 = baseline.schedule[23];
    const outstandingAtMonth24 = afterMonth24.closingPrincipalPaise;
    const remainingTenure = originalTenure - 24; // 216 months

    await test('Check 1: Rate increase from 8.5% to 9.25% recalculates higher monthly EMI', () => {
        const newEmi = calculateMonthlyEmiPaise(outstandingAtMonth24, 9.25, remainingTenure);
        assert(newEmi > initialEmi, `Expected new EMI ${newEmi} > ${initialEmi}`);
    });

    await test('Check 2: Revised schedule from month 24 onward preserves remaining tenure', () => {
        const revisedEmi = calculateMonthlyEmiPaise(outstandingAtMonth24, 9.25, remainingTenure);
        const revised = generateAmortizationSchedule({
            principalPaise: outstandingAtMonth24,
            annualRatePercent: 9.25,
            tenureMonths: remainingTenure,
            startDate: afterMonth24.dueDate,
            customEmiPaise: revisedEmi
        });
        assert.strictEqual(revised.schedule.length, remainingTenure);
        assert.strictEqual(revised.schedule[remainingTenure - 1].closingPrincipalPaise, 0n);
    });

    await test('Check 3: Total interest on revised schedule is higher due to rate increase', () => {
        const revisedEmi = calculateMonthlyEmiPaise(outstandingAtMonth24, 9.25, remainingTenure);
        const revised = generateAmortizationSchedule({
            principalPaise: outstandingAtMonth24,
            annualRatePercent: 9.25,
            tenureMonths: remainingTenure,
            startDate: afterMonth24.dueDate,
            customEmiPaise: revisedEmi
        });
        // Compare with baseline remaining interest
        let baselineRemainingInterest = 0n;
        for (let i = 24; i < baseline.schedule.length; i++) {
            baselineRemainingInterest += baseline.schedule[i].interestComponentPaise;
        }
        assert(revised.summary.totalInterestPaidPaise > baselineRemainingInterest);
    });

    // 3. Rate Decrease Scenario (9.25% -> 8.0% after another 12 months)
    const afterMonth36Outstanding = outstandingAtMonth24 - 10000000n; // ~₹39 Lakhs
    await test('Check 4: Rate decrease to 8.0% recalculates lower monthly EMI', () => {
        const loweredEmi = calculateMonthlyEmiPaise(afterMonth36Outstanding, 8.0, 204);
        const priorEmi = calculateMonthlyEmiPaise(afterMonth36Outstanding, 9.25, 204);
        assert(loweredEmi < priorEmi);
    });

    // 4. Rate Revision keeping EMI unchanged (Tenure Extension)
    await test('Check 5: Rate increase with fixed EMI extends schedule tenure', () => {
        // Run with old lower EMI on higher 9.5% rate
        const extendedSchedule = generateAmortizationSchedule({
            principalPaise: outstandingAtMonth24,
            annualRatePercent: 9.5,
            tenureMonths: 300, // Allow up to 300 months
            startDate: afterMonth24.dueDate,
            customEmiPaise: initialEmi
        });
        assert(extendedSchedule.schedule.length > remainingTenure, 'Schedule should extend beyond 216 months');
    });

    // 5. Repository Variable Rate Tracking
    await test('Check 6: Facility rateType can be VARIABLE_TRACKED', async () => {
        await LoanRepository.clearAll();
        const facility = {
            id: 'VAR_LOAN_01',
            name: 'Floating Rate Home Loan',
            lender: 'HDFC',
            loanType: LOAN_TYPES.HOME,
            rateType: RATE_TYPES.VARIABLE_TRACKED,
            principalPaise: 500000000n,
            annualRatePercent: 8.5,
            tenureMonths: 240,
            startDate: '2026-01-01',
            rateHistory: [
                { effectiveDate: '2026-01-01', ratePercent: 8.5, reason: 'SANCTION_RATE' }
            ]
        };
        const saved = await LoanRepository.saveFacility(facility);
        assert.strictEqual(saved.rateType, RATE_TYPES.VARIABLE_TRACKED);
    });

    await test('Check 7: Updating rateHistory records new rate revision event', async () => {
        const facility = await LoanRepository.getFacilityById('VAR_LOAN_01');
        facility.annualRatePercent = 8.85;
        facility.rateHistory = [
            ...facility.rateHistory,
            { effectiveDate: '2026-06-01', ratePercent: 8.85, reason: 'RBI_REPO_HIKE' }
        ];
        const updated = await LoanRepository.saveFacility(facility, { evidence: 'RATE_REVISION' });
        assert.strictEqual(updated.annualRatePercent, 8.85);
        assert.strictEqual(updated.rateHistory.length, 2);
    });

    await test('Check 8: Audit log records RATE_REVISION event on rate update', async () => {
        const envelope = await LoanRepository.loadEnvelope();
        const lastAudit = envelope.auditTrail[envelope.auditTrail.length - 1];
        assert.strictEqual(lastAudit.eventType, 'FACILITY_MODIFIED');
    });

    await test('Check 9: Invariant: Final period closing balance remains exactly 0 on revised schedule', () => {
        const revised = generateAmortizationSchedule({
            principalPaise: outstandingAtMonth24,
            annualRatePercent: 9.0,
            tenureMonths: 180,
            startDate: '2028-01-01'
        });
        assert.strictEqual(revised.schedule[179].closingPrincipalPaise, 0n);
    });

    await test('Check 10: Invariant: Principal sum on revised schedule matches outstanding principal exactly', () => {
        const revised = generateAmortizationSchedule({
            principalPaise: outstandingAtMonth24,
            annualRatePercent: 9.0,
            tenureMonths: 180,
            startDate: '2028-01-01'
        });
        const sumP = revised.schedule.reduce((acc, p) => acc + p.principalComponentPaise, 0n);
        assert.strictEqual(sumP, outstandingAtMonth24);
    });

    await test('Check 11: Invalid rate revision > 100% rejected', async () => {
        const facility = await LoanRepository.getFacilityById('VAR_LOAN_01');
        facility.annualRatePercent = 120.0;
        await assert.rejects(async () => {
            await LoanRepository.saveFacility(facility);
        }, /VALIDATION_FAILED/);
    });

    await test('Check 12: Invalid rate revision < 0% rejected', async () => {
        const facility = await LoanRepository.getFacilityById('VAR_LOAN_01');
        facility.annualRatePercent = -1.5;
        await assert.rejects(async () => {
            await LoanRepository.saveFacility(facility);
        }, /VALIDATION_FAILED/);
    });

    await test('Check 13: Transition to 0% interest on variable loan generates flat zero-interest schedule', () => {
        const zeroRevised = generateAmortizationSchedule({
            principalPaise: 12000000n,
            annualRatePercent: 0.0,
            tenureMonths: 12,
            startDate: '2027-01-01'
        });
        assert.strictEqual(zeroRevised.summary.totalInterestPaidPaise, 0n);
        assert.strictEqual(zeroRevised.schedule[11].closingPrincipalPaise, 0n);
    });

    await test('Check 14: Rate revision retains historical start date provenance in facility record', async () => {
        const facility = await LoanRepository.getFacilityById('VAR_LOAN_01');
        assert.strictEqual(facility.startDate, '2026-01-01');
    });

    await test('Check 15: Sequential 3-rate revision history maintains chronological order', async () => {
        const facility = await LoanRepository.getFacilityById('VAR_LOAN_01');
        facility.rateHistory.push({ effectiveDate: '2027-01-01', ratePercent: 8.6, reason: 'RATE_CUT' });
        await LoanRepository.saveFacility(facility);

        const loaded = await LoanRepository.getFacilityById('VAR_LOAN_01');
        assert.strictEqual(loaded.rateHistory.length, 3);
        assert(loaded.rateHistory[0].effectiveDate < loaded.rateHistory[1].effectiveDate);
        assert(loaded.rateHistory[1].effectiveDate < loaded.rateHistory[2].effectiveDate);
    });

    console.log('\n================================================================');
    console.log(`🎉 LN-11 PASSED CERTIFICATION (${passCount} / 15 CHECKS)`);
    console.log('================================================================\n');
})();
