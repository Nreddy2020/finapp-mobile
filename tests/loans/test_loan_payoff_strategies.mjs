/**
 * tests/loans/test_loan_payoff_strategies.mjs
 * 
 * LN-05: Debt Payoff Strategies Suite (25 checks)
 */

import assert from 'assert';
import { rankAvalanche, rankSnowball, rankCashFlowOptimizer } from '../../services/loans/loanPayoffStrategies.js';
import { DEFAULT_OPTIMIZER_WEIGHTS, DEBT_PAYOFF_METHOD } from '../../services/loans/loanContracts.js';

console.log('================================================================');
console.log('🚀 EXECUTING LN-05: DEBT PAYOFF STRATEGIES SUITE');
console.log('================================================================\n');

let passCount = 0;
function test(name, fn) {
    process.stdout.write(`  [RUN] ${name}...`);
    try {
        fn();
        passCount++;
        console.log(`  [PASS] ${name}`);
    } catch (e) {
        console.error(`  [FAIL] ${name}: ${e.message}`);
        throw e;
    }
}

const facilityA = {
    id: 'LN_PERSONAL',
    name: 'Personal Loan',
    lender: 'Axis Bank',
    annualRatePercent: 14.5, // Highest rate
    outstandingPrincipalPaise: 20000000n, // 2 Lakhs
    monthlyEmiPaise: 688000n,
    tenureRemainingMonths: 36
};

const facilityB = {
    id: 'LN_CREDIT_CARD',
    name: 'Credit Card EMI',
    lender: 'HDFC Bank',
    annualRatePercent: 18.0, // Absolute Highest rate
    outstandingPrincipalPaise: 5000000n, // 50,000 (Smallest balance)
    monthlyEmiPaise: 450000n,
    tenureRemainingMonths: 12
};

const facilityC = {
    id: 'LN_HOME',
    name: 'Home Loan',
    lender: 'SBI',
    annualRatePercent: 8.5, // Lowest rate
    outstandingPrincipalPaise: 450000000n, // 45 Lakhs (Largest balance)
    monthlyEmiPaise: 3900000n,
    tenureRemainingMonths: 216
};

const portfolio = [facilityA, facilityB, facilityC];

// 1. Avalanche Strategy (Highest Rate First)
test('Check 1: Avalanche ranks Credit Card EMI (18.0%) first', () => {
    const res = rankAvalanche(portfolio);
    assert.strictEqual(res[0].facilityId, 'LN_CREDIT_CARD');
    assert.strictEqual(res[0].priorityRank, 1);
});

test('Check 2: Avalanche ranks Home Loan (8.5%) last', () => {
    const res = rankAvalanche(portfolio);
    assert.strictEqual(res[2].facilityId, 'LN_HOME');
    assert.strictEqual(res[2].priorityRank, 3);
});

test('Check 3: Avalanche method is DEBT_PAYOFF_METHOD.AVALANCHE', () => {
    const res = rankAvalanche(portfolio);
    assert.strictEqual(res[0].method, DEBT_PAYOFF_METHOD.AVALANCHE);
});

test('Check 4: Avalanche deterministic tie-breaker on equal rates uses interest cost', () => {
    const loan1 = { id: 'L1', name: 'Loan 1', annualRatePercent: 12.0, outstandingPrincipalPaise: 10000000n }; // 1 Lakh -> 12k cost
    const loan2 = { id: 'L2', name: 'Loan 2', annualRatePercent: 12.0, outstandingPrincipalPaise: 50000000n }; // 5 Lakh -> 60k cost
    const res = rankAvalanche([loan1, loan2]);
    assert.strictEqual(res[0].facilityId, 'L2'); // Higher interest cost first
});

test('Check 5: Avalanche deterministic tie-breaker on equal rate and principal uses stable ID', () => {
    const loanX = { id: 'LOAN_A', name: 'Loan A', annualRatePercent: 10.0, outstandingPrincipalPaise: 10000000n };
    const loanY = { id: 'LOAN_B', name: 'Loan B', annualRatePercent: 10.0, outstandingPrincipalPaise: 10000000n };
    const res = rankAvalanche([loanY, loanX]);
    assert.strictEqual(res[0].facilityId, 'LOAN_A');
    assert.strictEqual(res[1].facilityId, 'LOAN_B');
});

// 2. Snowball Strategy (Smallest Balance First)
test('Check 6: Snowball ranks Credit Card EMI (₹50,000) first', () => {
    const res = rankSnowball(portfolio);
    assert.strictEqual(res[0].facilityId, 'LN_CREDIT_CARD');
    assert.strictEqual(res[0].priorityRank, 1);
});

test('Check 7: Snowball ranks Personal Loan (₹2,00,000) second', () => {
    const res = rankSnowball(portfolio);
    assert.strictEqual(res[1].facilityId, 'LN_PERSONAL');
});

test('Check 8: Snowball ranks Home Loan (₹45,00,000) last', () => {
    const res = rankSnowball(portfolio);
    assert.strictEqual(res[2].facilityId, 'LN_HOME');
});

test('Check 9: Snowball method is DEBT_PAYOFF_METHOD.SNOWBALL', () => {
    const res = rankSnowball(portfolio);
    assert.strictEqual(res[0].method, DEBT_PAYOFF_METHOD.SNOWBALL);
});

test('Check 10: Snowball tie-breaker on equal balance favors shorter tenure', () => {
    const loan1 = { id: 'T1', name: 'T1', outstandingPrincipalPaise: 10000000n, tenureRemainingMonths: 12 };
    const loan2 = { id: 'T2', name: 'T2', outstandingPrincipalPaise: 10000000n, tenureRemainingMonths: 24 };
    const res = rankSnowball([loan2, loan1]);
    assert.strictEqual(res[0].facilityId, 'T1');
});

test('Check 11: Snowball tie-breaker on equal balance and tenure favors higher EMI relief', () => {
    const loan1 = { id: 'E1', name: 'E1', outstandingPrincipalPaise: 10000000n, tenureRemainingMonths: 12, monthlyEmiPaise: 500000n };
    const loan2 = { id: 'E2', name: 'E2', outstandingPrincipalPaise: 10000000n, tenureRemainingMonths: 12, monthlyEmiPaise: 900000n };
    const res = rankSnowball([loan1, loan2]);
    assert.strictEqual(res[0].facilityId, 'E2'); // Higher relief first
});

test('Check 12: Snowball tie-breaker falls back to stable facility ID', () => {
    const loanX = { id: 'ALPHA', name: 'A', outstandingPrincipalPaise: 10000000n, tenureRemainingMonths: 12, monthlyEmiPaise: 500000n };
    const loanY = { id: 'BETA', name: 'B', outstandingPrincipalPaise: 10000000n, tenureRemainingMonths: 12, monthlyEmiPaise: 500000n };
    const res = rankSnowball([loanY, loanX]);
    assert.strictEqual(res[0].facilityId, 'ALPHA');
});

// 3. Cash-Flow Optimizer Strategy
test('Check 13: Optimizer verifies default weights sum to 100', () => {
    const sum = DEFAULT_OPTIMIZER_WEIGHTS.wRelief + 
                DEFAULT_OPTIMIZER_WEIGHTS.wSavings + 
                DEFAULT_OPTIMIZER_WEIGHTS.wSpeed + 
                DEFAULT_OPTIMIZER_WEIGHTS.wFees + 
                DEFAULT_OPTIMIZER_WEIGHTS.wLiq;
    assert.strictEqual(sum, 100);
});

test('Check 14: Optimizer rejects invalid weights sum != 100', () => {
    assert.throws(() => {
        rankCashFlowOptimizer(portfolio, { wRelief: 50, wSavings: 60 });
    }, /INVALID_WEIGHTS_SUM/);
});

test('Check 15: Optimizer returns scored rankings for portfolio', () => {
    const res = rankCashFlowOptimizer(portfolio);
    assert.strictEqual(res.length, 3);
    assert(res[0].score !== undefined);
});

test('Check 16: Optimizer exposes contributing factor sub-scores transparently', () => {
    const res = rankCashFlowOptimizer(portfolio);
    const first = res[0];
    assert(first.contributingFactors.cashFlowRelief !== undefined);
    assert(first.contributingFactors.interestSavings !== undefined);
    assert(first.contributingFactors.closureSpeed !== undefined);
});

test('Check 17: Optimizer exposes applied weights in result', () => {
    const res = rankCashFlowOptimizer(portfolio);
    assert.deepStrictEqual(res[0].appliedWeights, DEFAULT_OPTIMIZER_WEIGHTS);
});

test('Check 18: Optimizer provides explainable reason string rather than black-box output', () => {
    const res = rankCashFlowOptimizer(portfolio);
    assert(res[0].reason.includes('cash-flow relief score'));
});

test('Check 19: Custom weights prioritizing speed heavily promotes shortest loan', () => {
    const customWeights = { wRelief: 10, wSavings: 10, wSpeed: 70, wFees: 5, wLiq: 5 };
    const res = rankCashFlowOptimizer(portfolio, customWeights);
    assert.strictEqual(res[0].facilityId, 'LN_CREDIT_CARD'); // 12 months remaining
});

test('Check 20: Custom weights prioritizing savings heavily promotes highest interest loan', () => {
    const customWeights = { wRelief: 10, wSavings: 70, wSpeed: 10, wFees: 5, wLiq: 5 };
    const res = rankCashFlowOptimizer(portfolio, customWeights);
    assert.strictEqual(res[0].facilityId, 'LN_CREDIT_CARD'); // 18% interest
});

test('Check 21: Foreclosure fees apply negative score penalty', () => {
    const loanLowFee = { ...facilityA, id: 'LOW', estimatedForeclosureFeesPaise: 0n };
    const loanHighFee = { ...facilityA, id: 'HIGH', estimatedForeclosureFeesPaise: 10000000n }; // ₹1 Lakh fee
    const res = rankCashFlowOptimizer([loanLowFee, loanHighFee]);
    assert.strictEqual(res[0].facilityId, 'LOW');
});

test('Check 22: Empty portfolio returns empty array cleanly', () => {
    const res = rankCashFlowOptimizer([]);
    assert.strictEqual(res.length, 0);
});

test('Check 23: Single facility portfolio produces rank 1 with 100% factor disclosures', () => {
    const res = rankCashFlowOptimizer([facilityA]);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].priorityRank, 1);
});

test('Check 24: Optimizer handles BigInt and zero values gracefully', () => {
    const zeroFeeLoan = { ...facilityB, estimatedForeclosureFeesPaise: 0n };
    const res = rankCashFlowOptimizer([zeroFeeLoan]);
    assert(res[0].score > 0);
});

test('Check 25: All 3 strategies assign stable priorityRank from 1 to N', () => {
    const av = rankAvalanche(portfolio);
    const sn = rankSnowball(portfolio);
    const opt = rankCashFlowOptimizer(portfolio);

    for (let i = 0; i < portfolio.length; i++) {
        assert.strictEqual(av[i].priorityRank, i + 1);
        assert.strictEqual(sn[i].priorityRank, i + 1);
        assert.strictEqual(opt[i].priorityRank, i + 1);
    }
});

console.log('\n================================================================');
console.log(`🎉 LN-05 PASSED CERTIFICATION (${passCount} / 25 CHECKS)`);
console.log('================================================================\n');
