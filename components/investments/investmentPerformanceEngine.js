/**
 * FinLife Investments Module V1 - Phase 3: Performance Engine
 *
 * Deterministic, read-only performance analytics engine.
 * Pure functional design: Calculates XIRR, CAGR, TWR, and corporate action adjustments.
 * Never mutates tax lots, holdings, transactions, or journal entries.
 */

import {
  XIRR_STATUS,
  PERFORMANCE_STATUS,
  PRICE_STATUS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  PRICE_ADJUSTMENT_TYPE
} from './investmentContracts.js';
import { calculateHoldingValuation } from './investmentValuationEngine.js';

/**
 * Extracts chronological cash flows for XIRR computation.
 *
 * Semantics:
 * - External Outflows (investment buys): Negative cash flow (-amount)
 * - External Inflows (sales/redemptions): Positive cash flow (+amount)
 * - Cash distributions (dividends, interest): Positive cash flow (+amount)
 * - Internal transfers: Flow-neutral (excluded)
 * - Corporate actions (bonus, split): Flow-neutral (excluded)
 * - Terminal Portfolio / Holding Market Value: Treated as final positive cash flow on asOfDate
 */
export function extractPerformanceCashFlows({
  transactions = [],
  terminalValuationPaise = null,
  asOfDate = new Date().toISOString()
}) {
  const flows = [];

  for (const tx of transactions) {
    if (tx.status !== TRANSACTION_STATUS.SETTLED) {
      continue; // Only settled transactions generate performance cash flows
    }

    const txDate = tx.transactionDate || tx.tradeDate;
    if (!txDate) continue;

    // Check transaction type
    switch (tx.type) {
      case TRANSACTION_TYPES.BUY:
      case TRANSACTION_TYPES.SIP_PURCHASE: {
        // Outflow from investor into the asset -> negative
        const amount = Number(tx.netCashOutflowPaise || tx.grossPaise) / 100.0;
        flows.push({
          date: new Date(txDate),
          amount: -Math.abs(amount),
          type: tx.type
        });
        break;
      }
      case TRANSACTION_TYPES.SELL:
      case TRANSACTION_TYPES.REDEMPTION: {
        // Inflow back to investor -> positive
        const amount = Number(tx.netCashInflowPaise || tx.grossPaise) / 100.0;
        flows.push({
          date: new Date(txDate),
          amount: Math.abs(amount),
          type: tx.type
        });
        break;
      }
      case TRANSACTION_TYPES.DIVIDEND:
      case TRANSACTION_TYPES.INTEREST: {
        // Cash distribution received -> positive
        const amount = Number(tx.grossPaise) / 100.0;
        flows.push({
          date: new Date(txDate),
          amount: Math.abs(amount),
          type: tx.type
        });
        break;
      }
      case TRANSACTION_TYPES.TRANSFER_IN:
      case TRANSACTION_TYPES.TRANSFER_OUT:
      case TRANSACTION_TYPES.BONUS:
      case TRANSACTION_TYPES.STOCK_SPLIT:
      case TRANSACTION_TYPES.MERGER:
        // Flow-neutral: zero cash movement from investor's perspective
        break;
      default:
        break;
    }
  }

  // Add terminal valuation if available and positive
  if (terminalValuationPaise !== null && terminalValuationPaise > 0n) {
    flows.push({
      date: new Date(asOfDate),
      amount: Number(terminalValuationPaise) / 100.0,
      type: 'TERMINAL_VALUATION'
    });
  }

  // Sort chronologically ascending
  flows.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Aggregate same-day flows deterministically
  const aggregatedFlows = [];
  for (const flow of flows) {
    const dateStr = flow.date.toISOString().split('T')[0];
    const existing = aggregatedFlows.find(f => f.dateStr === dateStr);
    if (existing) {
      existing.amount += flow.amount;
    } else {
      aggregatedFlows.push({
        date: flow.date,
        dateStr,
        amount: flow.amount
      });
    }
  }

  return aggregatedFlows.map(f => ({ date: f.date, amount: f.amount }));
}

/**
 * Deterministic XIRR calculation using hybrid Newton-Raphson with Bisection fallback.
 *
 * Invariants:
 * 1. Requires at least one positive and one negative cash flow.
 * 2. Domain constraint: r > -1.0 (specifically r >= -0.9999).
 * 3. Max iterations: 100, tolerance: 1e-7.
 */
export function calculateXIRR(cashFlows = [], options = {}) {
  const maxIterations = options.maxIterations || 100;
  const tolerance = options.tolerance || 1e-7;

  if (!cashFlows || cashFlows.length < 2) {
    return {
      status: XIRR_STATUS.NOT_COMPUTABLE,
      rate: null,
      iterations: 0,
      method: null,
      reason: 'INSUFFICIENT_CASH_FLOWS'
    };
  }

  // Guard: Must contain at least one positive and one negative cash flow
  let hasPositive = false;
  let hasNegative = false;
  for (const cf of cashFlows) {
    if (cf.amount > 0) hasPositive = true;
    if (cf.amount < 0) hasNegative = true;
  }

  if (!hasPositive || !hasNegative) {
    return {
      status: XIRR_STATUS.NOT_COMPUTABLE,
      rate: null,
      iterations: 0,
      method: null,
      reason: 'ALL_CASH_FLOWS_SAME_SIGN'
    };
  }

  const d0 = cashFlows[0].date.getTime();

  // Helper: Evaluates f(r) = sum(C_i / (1+r)^((d_i - d0)/365))
  const f = (r) => {
    let sum = 0.0;
    for (const cf of cashFlows) {
      const dt = (cf.date.getTime() - d0) / (1000.0 * 3600.0 * 24.0 * 365.0);
      sum += cf.amount / Math.pow(1.0 + r, dt);
    }
    return sum;
  };

  // Helper: Evaluates f'(r)
  const df = (r) => {
    let sum = 0.0;
    for (const cf of cashFlows) {
      const dt = (cf.date.getTime() - d0) / (1000.0 * 3600.0 * 24.0 * 365.0);
      sum += -dt * cf.amount / Math.pow(1.0 + r, dt + 1.0);
    }
    return sum;
  };

  // 1. Try Newton-Raphson starting at r = 0.1 (10%)
  let r = 0.1;
  let newtonConverged = false;
  let iter = 0;

  for (iter = 0; iter < maxIterations; iter++) {
    const fVal = f(r);
    if (Math.abs(fVal) < tolerance) {
      newtonConverged = true;
      break;
    }

    const dfVal = df(r);
    if (Math.abs(dfVal) < 1e-12) {
      // Derivative too small; Newton cannot proceed cleanly
      break;
    }

    const nextR = r - fVal / dfVal;

    // Check domain boundary: r must remain > -1.0
    if (nextR <= -0.9999 || isNaN(nextR) || !isFinite(nextR)) {
      break;
    }

    if (Math.abs(nextR - r) < tolerance) {
      r = nextR;
      newtonConverged = true;
      break;
    }

    r = nextR;
  }

  if (newtonConverged && r > -0.9999 && isFinite(r)) {
    return {
      status: XIRR_STATUS.COMPUTED,
      rate: r,
      iterations: iter + 1,
      method: 'NEWTON_RAPHSON'
    };
  }

  // 2. Fallback to Bisection in bounded interval [-0.9999, 10.0]
  let low = -0.9999;
  let high = 10.0;
  let fLow = f(low);
  let fHigh = f(high);

  // If signs do not alternate, attempt bracket expansion up to high = 50.0
  if (fLow * fHigh > 0) {
    for (let expand = 20.0; expand <= 100.0; expand += 20.0) {
      high = expand;
      fHigh = f(high);
      if (fLow * fHigh <= 0) break;
    }
  }

  if (fLow * fHigh > 0) {
    return {
      status: XIRR_STATUS.NO_CONVERGENCE,
      rate: null,
      iterations: iter,
      method: null,
      reason: 'BISECTION_NO_BRACKET'
    };
  }

  let bisectIter = 0;
  for (bisectIter = 0; bisectIter < maxIterations; bisectIter++) {
    const mid = (low + high) / 2.0;
    const fMid = f(mid);

    if (Math.abs(fMid) < tolerance || (high - low) / 2.0 < tolerance) {
      return {
        status: XIRR_STATUS.COMPUTED,
        rate: mid,
        iterations: iter + bisectIter + 1,
        method: 'BISECTION'
      };
    }

    if (fLow * fMid <= 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return {
    status: XIRR_STATUS.NO_CONVERGENCE,
    rate: null,
    iterations: iter + bisectIter,
    method: null,
    reason: 'MAX_ITERATIONS_EXCEEDED'
  };
}

/**
 * Deterministic Compound Annual Growth Rate (CAGR).
 *
 * Invariants:
 * 1. initialValuePaise > 0n
 * 2. finalValuePaise > 0n
 * 3. endDate > startDate (days > 0)
 */
export function calculateCAGR({
  initialValuePaise,
  finalValuePaise,
  startDate,
  endDate
}) {
  if (initialValuePaise === undefined || initialValuePaise === null || typeof initialValuePaise !== 'bigint' || initialValuePaise <= 0n) {
    return {
      status: PERFORMANCE_STATUS.NOT_COMPUTABLE,
      cagr: null,
      reason: 'NON_POSITIVE_INITIAL_VALUE'
    };
  }

  if (finalValuePaise === undefined || finalValuePaise === null || typeof finalValuePaise !== 'bigint' || finalValuePaise <= 0n) {
    return {
      status: PERFORMANCE_STATUS.NOT_COMPUTABLE,
      cagr: null,
      reason: 'NON_POSITIVE_FINAL_VALUE'
    };
  }

  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();

  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    return {
      status: PERFORMANCE_STATUS.NOT_COMPUTABLE,
      cagr: null,
      reason: 'INVALID_DATE_RANGE'
    };
  }

  const days = (endMs - startMs) / (1000.0 * 3600.0 * 24.0);
  const years = days / 365.0;

  const ratio = Number(finalValuePaise) / Number(initialValuePaise);
  const cagr = Math.pow(ratio, 1.0 / years) - 1.0;

  return {
    status: PERFORMANCE_STATUS.COMPUTED,
    cagr,
    years,
    days
  };
}

/**
 * Deterministic Time-Weighted Return (TWR) across discrete sub-periods.
 *
 * Invariants:
 * 1. Flow-neutral: External capital additions/withdrawals bound sub-periods.
 * 2. Formula: 1 + R_TWR = product_k ((V_end,k - C_k) / V_start,k)
 * 3. Internal transfers and corporate actions do not alter return.
 */
export function calculateTWR({ subPeriods = [] }) {
  if (!subPeriods || subPeriods.length === 0) {
    return {
      status: PERFORMANCE_STATUS.NOT_COMPUTABLE,
      twr: null,
      reason: 'EMPTY_SUB_PERIODS'
    };
  }

  let compoundFactor = 1.0;

  for (let i = 0; i < subPeriods.length; i++) {
    const sp = subPeriods[i];
    const startVal = Number(sp.startValuePaise) / 100.0;
    const endVal = Number(sp.endValuePaise) / 100.0;
    const externalFlow = Number(sp.externalFlowPaise || 0n) / 100.0;

    if (startVal <= 0.0) {
      return {
        status: PERFORMANCE_STATUS.NOT_COMPUTABLE,
        twr: null,
        subPeriodIndex: i,
        reason: 'NON_POSITIVE_SUB_PERIOD_START_VAL'
      };
    }

    // Sub-period return: (V_end - externalFlow) / V_start
    const periodReturn = (endVal - externalFlow) / startVal;
    compoundFactor *= periodReturn;
  }

  const twr = compoundFactor - 1.0;

  return {
    status: PERFORMANCE_STATUS.COMPUTED,
    twr,
    subPeriodsCount: subPeriods.length
  };
}

/**
 * Calculates corporate action price adjustment neutrality.
 * Verifies that immediately post-action, (Quantity * Price) preserves total economic value.
 */
export function verifyCorporateActionPriceNeutrality({
  preActionQuantityMicros,
  preActionPricePaise,
  postActionQuantityMicros,
  postActionPricePaise,
  priceAdjustmentType = PRICE_ADJUSTMENT_TYPE.CORPORATE_ACTION_ADJUSTED
}) {
  if (priceAdjustmentType !== PRICE_ADJUSTMENT_TYPE.CORPORATE_ACTION_ADJUSTED) {
    return {
      isNeutral: false,
      reason: 'PRICE_NOT_ADJUSTED'
    };
  }

  const preValue = (preActionQuantityMicros * preActionPricePaise + 500000n) / 1000000n;
  const postValue = (postActionQuantityMicros * postActionPricePaise + 500000n) / 1000000n;

  // Exact paise difference
  const deltaPaise = postValue - preValue;
  const isNeutral = deltaPaise === 0n;

  return {
    isNeutral,
    deltaPaise,
    preValue,
    postValue
  };
}

/**
 * Pure projection bundling holding valuation and performance analytics.
 */
export function calculateHoldingPerformance({
  holding,
  transactions = [],
  priceQuote,
  instrumentType = 'DEFAULT',
  asOfDate = new Date().toISOString(),
  allowStale = true
}) {
  const valuation = calculateHoldingValuation({
    holding,
    priceQuote,
    instrumentType,
    asOfDate,
    allowStale
  });

  // If price is UNAVAILABLE or INVALID -> performance is NOT_COMPUTABLE
  if (valuation.priceStatus === PRICE_STATUS.UNAVAILABLE || valuation.priceStatus === PRICE_STATUS.INVALID) {
    return Object.freeze({
      valuation,
      xirr: { status: XIRR_STATUS.NOT_COMPUTABLE, rate: null, reason: 'PRICE_UNAVAILABLE_OR_INVALID' },
      performanceStatus: PERFORMANCE_STATUS.NOT_COMPUTABLE
    });
  }

  const cashFlows = extractPerformanceCashFlows({
    transactions,
    terminalValuationPaise: valuation.marketValuePaise,
    asOfDate
  });

  const xirr = calculateXIRR(cashFlows);

  let performanceStatus = PERFORMANCE_STATUS.COMPUTED;
  if (valuation.isStale) {
    performanceStatus = PERFORMANCE_STATUS.STALE_DATA;
  } else if (xirr.status !== XIRR_STATUS.COMPUTED) {
    performanceStatus = PERFORMANCE_STATUS.NOT_COMPUTABLE;
  }

  return Object.freeze({
    valuation,
    xirr,
    performanceStatus,
    isStale: valuation.isStale
  });
}
