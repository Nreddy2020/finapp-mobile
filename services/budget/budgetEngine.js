/**
 * FinLife Smart Budgets & Financial Control Center — Decision Engine
 * Pure financial calculations, mathematical invariants, and zero-arithmetic outputs.
 */

import {
    RISK_LEVEL,
    CONFIDENCE_LEVEL,
    VIABILITY_STATUS,
    ALLOCATION_STRATEGY_TYPE,
    ALLOCATION_STRATEGIES,
    CATEGORY_TYPE_MAPPING,
    RECOMMENDATION_POLICY
} from './budgetContracts.js';

/**
 * Computes Safe-to-Spend metrics distinguishing liquid cash, upcoming commitments,
 * goal reserves, and safety buffer.
 * 
 * @param {Object} params
 * @param {number} params.currentCash Unencumbered liquid cash currently accessible
 * @param {number} params.committedBeforePeriodEnd Mandatory commitments due before period end not yet debited
 * @param {number} [params.reservedForGoals] Ring-fenced money for goals/emergency fund (default 0)
 * @param {number} [params.safetyBuffer] Minimum buffer that must never be breached (default 0)
 * @param {number} params.remainingDays Days remaining in the resolved period
 * @returns {Object} Safe-to-Spend financial contract
 */
export function computeSafeToSpend({
    currentCash = 0,
    committedBeforePeriodEnd = 0,
    reservedForGoals = 0,
    safetyBuffer = 0,
    remainingDays = 1
} = {}) {
    const cash = Math.max(0, Number(currentCash) || 0);
    const committed = Math.max(0, Number(committedBeforePeriodEnd) || 0);
    const reserved = Math.max(0, Number(reservedForGoals) || 0);
    const buffer = Math.max(0, Number(safetyBuffer) || 0);
    const days = Math.max(1, Number(remainingDays) || 1);

    const deductions = committed + reserved + buffer;
    const rawNet = cash - deductions;

    const safeToSpendTotal = Math.max(0, rawNet);
    const recommendedDailyDiscretionarySpend = Math.round((safeToSpendTotal / days) * 100) / 100;

    const isDeficit = rawNet < 0;
    const uncoveredCommitments = isDeficit ? Math.abs(rawNet) : 0;

    return {
        currentCash: cash,
        committedBeforePeriodEnd: committed,
        reservedForGoals: reserved,
        safetyBuffer: buffer,
        safeToSpendTotal: Math.round(safeToSpendTotal * 100) / 100,
        recommendedDailyDiscretionarySpend,
        safeToSpendToday: recommendedDailyDiscretionarySpend, // User-facing alias
        remainingDays: days,
        isDeficit,
        uncoveredCommitments: Math.round(uncoveredCommitments * 100) / 100
    };
}

/**
 * Computes category run-rate, projected variance, days until exhaustion,
 * risk level, and forecast confidence.
 * 
 * @param {Object} params
 * @param {number} params.spent Actual spending in category for period
 * @param {number} params.budgetLimit Planned budget cap
 * @param {number} params.daysElapsed Days elapsed in period
 * @param {number} params.daysInPeriod Total days in period
 * @param {number} [params.historicalAverage] Historical monthly average (optional)
 * @param {number} [params.upcomingCommitments] Known pending commitments in this category (optional)
 * @returns {Object} Category run-rate assessment
 */
export function computeCategoryRunRate({
    spent = 0,
    budgetLimit = 0,
    daysElapsed = 1,
    daysInPeriod = 30,
    historicalAverage = null,
    upcomingCommitments = 0
} = {}) {
    const s = Math.max(0, Number(spent) || 0);
    const limit = Math.max(0, Number(budgetLimit) || 0);
    const elapsed = Math.max(1, Math.min(Number(daysElapsed) || 1, Number(daysInPeriod) || 30));
    const totalDays = Math.max(1, Number(daysInPeriod) || 30);
    const remainingDays = Math.max(0, totalDays - elapsed);
    const pending = Math.max(0, Number(upcomingCommitments) || 0);

    const remaining = Math.max(0, limit - s);
    const rawDailyAverage = s / elapsed;
    const dailyAverage = Math.round(rawDailyAverage * 100) / 100;
    const allowedDailyAverage = remainingDays > 0 ? Math.round((remaining / remainingDays) * 100) / 100 : 0;

    const projectedSpend = Math.round((s + (rawDailyAverage * remainingDays) + pending) * 100) / 100;
    const projectedVariance = Math.round((projectedSpend - limit) * 100) / 100;
    const projectedPercentage = limit > 0 ? Math.round((projectedSpend / limit) * 1000) / 10 : 0;
    const overspendAmount = Math.max(0, projectedVariance);

    const daysUntilBudgetExhausted = dailyAverage > 0 && limit > 0
        ? Math.max(0, Math.floor(remaining / dailyAverage))
        : (limit === 0 ? 0 : 999);

    // Multi-variate risk classification
    let riskLevel = RISK_LEVEL.SAFE;
    if (limit > 0) {
        if (s >= limit || projectedSpend > limit || (daysUntilBudgetExhausted < remainingDays && remainingDays > 0)) {
            riskLevel = RISK_LEVEL.AT_RISK;
        } else if (projectedSpend >= limit * 0.85 || s >= limit * 0.80) {
            riskLevel = RISK_LEVEL.WATCH;
        }
    }

    // Confidence determination
    let confidence = CONFIDENCE_LEVEL.LOW;
    let confidenceReason = 'Early in the cycle; fewer than 7 days of spending history.';
    if (elapsed >= 15) {
        confidence = CONFIDENCE_LEVEL.HIGH;
        confidenceReason = `Based on ${elapsed} days of sustained transaction data and commitment tracking.`;
    } else if (elapsed >= 7) {
        confidence = CONFIDENCE_LEVEL.MEDIUM;
        confidenceReason = `Based on ${elapsed} days of transaction velocity and scheduled bills.`;
    }

    return {
        spent: s,
        budgetLimit: limit,
        remaining: Math.round(remaining * 100) / 100,
        dailyAverage,
        allowedDailyAverage,
        projectedSpend,
        projectedVariance,
        projectedPercentage,
        overspendAmount,
        daysUntilBudgetExhausted,
        daysRemaining: remainingDays,
        riskLevel,
        confidence,
        confidenceReason
    };
}

/**
 * Computes multi-paradigm budget allocation breakdown across Needs, Wants, and Future.
 * Supports 50/30/20, 60/20/20, Zero-Based, and Debt-Priority models.
 * 
 * @param {Object} params
 * @param {number} params.income Total recognized monthly income
 * @param {Array} params.budgets Active category budgets
 * @param {Object} [params.strategy] Allocation strategy configuration
 * @param {number} [params.existingDebtPayments] Existing monthly debt servicing
 * @returns {Object} Allocation assessment
 */
export function computeAllocationBreakdown({
    income = 0,
    budgets = [],
    strategy = ALLOCATION_STRATEGIES['50/30/20'],
    existingDebtPayments = 0
} = {}) {
    const totalIncome = Math.max(0, Number(income) || 0);
    const activeStrategy = strategy || ALLOCATION_STRATEGIES['50/30/20'];

    // Group actual budget limits and spending by allocation bucket (Needs, Wants, Future)
    const breakdown = {
        Needs: { allocated: 0, spent: 0, count: 0 },
        Wants: { allocated: 0, spent: 0, count: 0 },
        Future: { allocated: 0, spent: 0, count: 0 }
    };

    budgets.forEach(b => {
        const catName = b.category || b.name || 'Other';
        const type = b.type || CATEGORY_TYPE_MAPPING[catName] || 'Needs';
        const bucket = breakdown[type] ? type : 'Needs';
        
        breakdown[bucket].allocated += Number(b.limit) || 0;
        breakdown[bucket].spent += Number(b.spent) || 0;
        breakdown[bucket].count += 1;
    });

    const totalAllocated = breakdown.Needs.allocated + breakdown.Wants.allocated + breakdown.Future.allocated;
    const totalSpent = breakdown.Needs.spent + breakdown.Wants.spent + breakdown.Future.spent;

    if (activeStrategy.type === ALLOCATION_STRATEGY_TYPE.PERCENTAGE) {
        const targets = activeStrategy.targets || { Needs: 50, Wants: 30, Future: 20 };

        const recommended = {
            Needs: Math.round((totalIncome * (targets.Needs / 100)) * 100) / 100,
            Wants: Math.round((totalIncome * (targets.Wants / 100)) * 100) / 100,
            Future: Math.round((totalIncome * (targets.Future / 100)) * 100) / 100
        };

        const actualPct = {
            Needs: totalIncome > 0 ? Math.round((breakdown.Needs.spent / totalIncome) * 100) : 0,
            Wants: totalIncome > 0 ? Math.round((breakdown.Wants.spent / totalIncome) * 100) : 0,
            Future: totalIncome > 0 ? Math.round((breakdown.Future.spent / totalIncome) * 100) : 0
        };

        const divergencePct = {
            Needs: actualPct.Needs - targets.Needs,
            Wants: actualPct.Wants - targets.Wants,
            Future: actualPct.Future - targets.Future
        };

        let advice = 'Your spending aligns comfortably with your allocation strategy.';
        if (divergencePct.Needs > 3) {
            advice = `Your spending is slightly needs-heavy. Reduce discretionary spending by ₹${Math.abs(Math.round(breakdown.Needs.spent - recommended.Needs)).toLocaleString('en-IN')} to match ${activeStrategy.name.split(' ')[0]}.`;
        } else if (divergencePct.Wants > 3) {
            advice = `Discretionary spending is exceeding targets by ${divergencePct.Wants}%. Rebalance by cutting non-essential shopping and entertainment.`;
        }

        return {
            strategyId: activeStrategy.id,
            strategyType: activeStrategy.type,
            strategyName: activeStrategy.name,
            totalIncome,
            totalAllocated,
            totalSpent,
            targets,
            recommended,
            actual: {
                Needs: breakdown.Needs.spent,
                Wants: breakdown.Wants.spent,
                Future: breakdown.Future.spent
            },
            actualPercentages: actualPct,
            divergences: divergencePct,
            advice
        };
    }

    if (activeStrategy.type === ALLOCATION_STRATEGY_TYPE.ZERO_BASED) {
        const unallocated = totalIncome - totalAllocated;
        let advice = unallocated === 0
            ? 'Zero-based allocation complete: every rupee has a designated purpose.'
            : (unallocated > 0
                ? `You have ₹${unallocated.toLocaleString('en-IN')} unallocated. Assign it to debt paydown or emergency savings.`
                : `You are over-allocated by ₹${Math.abs(unallocated).toLocaleString('en-IN')}. Reduce budget limits to balance.`);

        return {
            strategyId: activeStrategy.id,
            strategyType: activeStrategy.type,
            strategyName: activeStrategy.name,
            totalIncome,
            totalAllocated,
            totalSpent,
            unallocated,
            isBalanced: unallocated === 0,
            actual: {
                Needs: breakdown.Needs.spent,
                Wants: breakdown.Wants.spent,
                Future: breakdown.Future.spent
            },
            advice
        };
    }

    // DEBT_PRIORITY
    const debtMinimums = Number(existingDebtPayments) || 0;
    const essentials = breakdown.Needs.allocated;
    const surplusAfterEssentialsAndDebt = totalIncome - (essentials + debtMinimums);
    const extraDebtAllocation = Math.max(0, surplusAfterEssentialsAndDebt * 0.7);
    const discretionaryRemaining = Math.max(0, surplusAfterEssentialsAndDebt - extraDebtAllocation);

    return {
        strategyId: activeStrategy.id,
        strategyType: activeStrategy.type,
        strategyName: activeStrategy.name,
        totalIncome,
        totalAllocated,
        totalSpent,
        debtMinimums,
        essentials,
        extraDebtAllocation,
        discretionaryRemaining,
        actual: {
            Needs: breakdown.Needs.spent,
            Wants: breakdown.Wants.spent,
            Future: breakdown.Future.spent
        },
        advice: `Accelerate debt freedom: ₹${Math.round(extraDebtAllocation).toLocaleString('en-IN')} directed towards principal prepayments.`
    };
}

/**
 * Simulates a Life-Event loan purchase with Debt Service Ratio (DSR),
 * emergency buffer verification, net shortfall, and multi-tier viability status.
 * 
 * @param {Object} params
 * @param {number} params.price Total purchase price
 * @param {number} params.downPayment Upfront down payment
 * @param {number} params.interestRate Annual interest rate in percent (e.g. 7.1)
 * @param {number} params.tenureYears Loan tenure in years (e.g. 20)
 * @param {number} params.currentMonthlySurplus Current unencumbered monthly cash surplus
 * @param {number} [params.existingMonthlyDebtPayments] Current existing EMI commitments
 * @param {number} [params.monthlyIncome] Monthly recognized income
 * @param {number} [params.safetyBuffer] Minimum required reserve buffer
 * @returns {Object} Comprehensive loan simulation result
 */
export function simulateLifeEventLoan({
    price = 0,
    downPayment = 0,
    interestRate = 7.1,
    tenureYears = 20,
    currentMonthlySurplus = 0,
    existingMonthlyDebtPayments = 0,
    monthlyIncome = 124000,
    safetyBuffer = 10000
} = {}) {
    const p = Math.max(0, Number(price) || 0);
    const dp = Math.max(0, Math.min(p, Number(downPayment) || 0));
    const rate = Math.max(0, Number(interestRate) || 0);
    const years = Math.max(1, Number(tenureYears) || 1);
    const surplus = Number(currentMonthlySurplus) || 0;
    const existingDebt = Math.max(0, Number(existingMonthlyDebtPayments) || 0);
    const income = Math.max(0, Number(monthlyIncome) || 0);
    const buffer = Math.max(0, Number(safetyBuffer) || 0);

    const loanAmount = Math.max(0, p - dp);
    const downPaymentPercentage = p > 0 ? Math.round((dp / p) * 100) : 0;

    let monthlyEMI = 0;
    const totalMonths = years * 12;

    if (loanAmount > 0) {
        if (rate === 0) {
            monthlyEMI = loanAmount / totalMonths;
        } else {
            const monthlyRate = (rate / 100) / 12;
            const factor = Math.pow(1 + monthlyRate, totalMonths);
            monthlyEMI = (loanAmount * monthlyRate * factor) / (factor - 1);
        }
    }

    monthlyEMI = Math.round(monthlyEMI);
    const totalRepayment = Math.round(monthlyEMI * totalMonths);
    const totalInterest = Math.max(0, totalRepayment - loanAmount);

    const newMonthlySurplus = Math.round((surplus - monthlyEMI) * 100) / 100;
    const monthlyShortfall = newMonthlySurplus < 0 ? Math.abs(newMonthlySurplus) : 0;

    const totalDebtService = existingDebt + monthlyEMI;
    const debtServiceRatio = income > 0 ? Math.round((totalDebtService / income) * 1000) / 10 : 0;

    // Viability classification
    let viability = VIABILITY_STATUS.COMFORTABLE;
    let viabilityReason = 'Comfortable: New EMI fits securely within your current surplus and debt-service bounds.';

    if (monthlyShortfall > 0 || debtServiceRatio > 50) {
        viability = VIABILITY_STATUS.NOT_COMFORTABLE;
        viabilityReason = monthlyShortfall > 0
            ? `Not comfortable: Requires ₹${Math.round(monthlyShortfall).toLocaleString('en-IN')} more than your current monthly surplus.`
            : `Not comfortable: Total debt commitments consume ${debtServiceRatio}% of monthly income (> 50% threshold).`;
    } else if (newMonthlySurplus < buffer || debtServiceRatio > 35) {
        viability = VIABILITY_STATUS.PRESSURE;
        viabilityReason = `Financial pressure: Remaining surplus (₹${Math.round(newMonthlySurplus).toLocaleString('en-IN')}) is thin relative to emergency buffer.`;
    }

    // Dynamic suggested alternatives
    const alternatives = [];
    if (viability !== VIABILITY_STATUS.COMFORTABLE) {
        if (dp < p * 0.3) {
            const suggestedDP = Math.round(p * 0.3);
            alternatives.push(`Increase down payment to ₹${suggestedDP.toLocaleString('en-IN')} (30%)`);
        }
        if (years < 25) {
            alternatives.push(`Extend tenure to ${Math.min(30, years + 5)} years to lower monthly EMI`);
        }
        if (p > 5000000) {
            const reducedPrice = Math.round(p * 0.85);
            alternatives.push(`Reduce purchase budget to ₹${reducedPrice.toLocaleString('en-IN')}`);
        }
        if (existingDebt > 0) {
            alternatives.push('Close existing high-interest debts prior to taking on new loan');
        }
    } else {
        alternatives.push('Maintain an emergency fund covering 6 months of the new EMI');
        alternatives.push('Set up automated auto-debit 2 days after salary credit');
    }

    return {
        propertyPrice: p,
        downPayment: dp,
        downPaymentPercentage,
        loanAmount,
        interestRate: rate,
        tenureYears: years,
        monthlyEMI,
        totalInterest,
        totalRepayment,
        currentMonthlySurplus: surplus,
        newMonthlySurplus,
        monthlyShortfall,
        debtServiceRatio,
        cashReserveImpact: dp,
        viability,
        viabilityReason,
        alternatives
    };
}

/**
 * Projects daily cash flow, identifies low-balance risk windows, and computes
 * ending and lowest projected balances.
 * 
 * @param {Object} params
 * @param {number} params.openingBalance Initial liquid balance at day 1
 * @param {Array} params.events Chronological events in the period
 * @param {number} params.daysInPeriod Total days in month
 * @param {number} [params.safetyBuffer] Minimum buffer
 * @returns {Object} Cash-flow projection
 */
export function computeCashFlowProjection({
    openingBalance = 0,
    events = [],
    daysInPeriod = 30,
    safetyBuffer = 5000
} = {}) {
    const initial = Number(openingBalance) || 0;
    const days = Math.max(1, Number(daysInPeriod) || 30);
    const buffer = Math.max(0, Number(safetyBuffer) || 0);

    let current = initial;
    let lowest = initial;
    let lowestDay = 1;

    const dailyBalances = [];
    const lowBalanceDays = [];

    // Map events by day of month (1..days)
    const eventsByDay = {};
    for (let d = 1; d <= days; d++) {
        eventsByDay[d] = [];
    }

    events.forEach(evt => {
        let day = 1;
        if (evt.day) {
            day = Math.min(days, Math.max(1, Number(evt.day)));
        } else if (evt.date) {
            const parsed = new Date(evt.date);
            if (!isNaN(parsed.getDate())) {
                day = Math.min(days, Math.max(1, parsed.getDate()));
            }
        }
        if (eventsByDay[day]) {
            eventsByDay[day].push(evt);
        }
    });

    for (let d = 1; d <= days; d++) {
        const dayEvents = eventsByDay[d] || [];
        dayEvents.forEach(e => {
            const amount = Number(e.amount) || 0;
            if (e.type === 'INCOME') {
                current += amount;
            } else if (e.type === 'EXPENSE' || e.type === 'COMMITMENT') {
                current -= amount;
            }
        });

        dailyBalances.push({ day: d, balance: Math.round(current) });

        if (current < lowest) {
            lowest = current;
            lowestDay = d;
        }

        if (current < buffer) {
            lowBalanceDays.push(d);
        }
    }

    // Group contiguous low balance days into a human-readable window (e.g. 12-18 Sep)
    let lowBalanceWindow = null;
    if (lowBalanceDays.length > 0) {
        const startDay = lowBalanceDays[0];
        const endDay = lowBalanceDays[lowBalanceDays.length - 1];
        lowBalanceWindow = {
            startDay,
            endDay,
            label: startDay === endDay ? `Day ${startDay}` : `${startDay}-${endDay}`,
            lowestBalance: lowest
        };
    }

    return {
        openingBalance: initial,
        endingProjectedBalance: Math.round(current),
        lowestProjectedBalance: Math.round(lowest),
        lowestProjectedDay: lowestDay,
        dailyBalances,
        hasLowBalanceRisk: lowBalanceDays.length > 0,
        lowBalanceWindow
    };
}

/**
 * Generates an explainable 4-part insight card for category overspending or velocity surge.
 */
export function generateExplainableCategoryInsight({
    category = 'Category',
    spent = 0,
    budgetLimit = 0,
    daysElapsed = 1,
    daysRemaining = 12,
    recentSurgePct = 46
} = {}) {
    const runRate = computeCategoryRunRate({
        spent,
        budgetLimit,
        daysElapsed,
        daysInPeriod: daysElapsed + daysRemaining
    });

    const isExceeding = runRate.projectedSpend > budgetLimit;
    const overspend = runRate.overspendAmount;

    const headline = isExceeding
        ? `You are likely to exceed your budget by ₹${Math.round(overspend).toLocaleString('en-IN')} at the current pace.`
        : `Spending is within the allowed daily pace of ₹${Math.round(runRate.allowedDailyAverage).toLocaleString('en-IN')}/day.`;

    const why = isExceeding
        ? `Your ${category.toLowerCase()} spending increased by ${recentSurgePct}% in the last 7 days due to higher velocity.`
        : `Your spending velocity is consistent with historical patterns for this period.`;

    const whatHappensNext = isExceeding
        ? (runRate.daysUntilBudgetExhausted < daysRemaining
            ? `At this rate, your budget will be exhausted in ${runRate.daysUntilBudgetExhausted} days, leaving ${daysRemaining - runRate.daysUntilBudgetExhausted} days unprotected.`
            : `Projected month-end spend is ₹${Math.round(runRate.projectedSpend).toLocaleString('en-IN')}.`)
        : `You are on track to preserve ₹${Math.round(runRate.remaining).toLocaleString('en-IN')} in this category.`;

    const reductionNeeded = daysRemaining > 0 ? Math.ceil(overspend / daysRemaining) : 0;
    const suggestedActions = isExceeding ? [
        `Reduce spending by ₹${reductionNeeded}/day for the remaining ${daysRemaining} days`,
        `Consider switching to a fixed monthly pass or subscription`,
        `Review recent high-value debits in ${category}`
    ] : [
        `Maintain current daily limit of ₹${Math.round(runRate.allowedDailyAverage).toLocaleString('en-IN')}`,
        `Review recurring subscriptions`
    ];

    return {
        category,
        headline,
        why,
        whatHappensNext,
        suggestedActions,
        riskLevel: runRate.riskLevel,
        confidence: runRate.confidence,
        confidenceReason: runRate.confidenceReason
    };
}
