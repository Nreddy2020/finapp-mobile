# Stage C.7.1 Architecture Plan: Portfolio Risk Foundation & Risk Taxonomy

**Stage**: C.7.1  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Status**: IMPLEMENTED & AUDITED 🟢  
**Certified Baseline**: [`5fdfb36`](https://github.com/Nreddy2020/finapp-mobile/commit/5fdfb36)  
**Author**: Antigravity AI & System Architect  

---

## 1. Stage C.7.1 Scope & Objective

Stage C.7.1 establishes the canonical risk data foundation and taxonomy for Phase C.7:
1. **Canonical Risk Pillars**: 6 frozen pillars (`CONCENTRATION`, `VOLATILITY`, `DRAWDOWN`, `LIQUIDITY`, `CORRELATION`, `STRESS_TEST`).
2. **Risk Severity Levels**: 4 levels (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
3. **Liquidity Classification Taxonomy**: 4 independent tiers (`INSTANT_T0`, `SHORT_TERM_T2_T3`, `MEDIUM_TERM_T4_T7`, `LOCKED_OR_ILLIQUID`) preserving the canonical 8-class asset taxonomy.
4. **Standardized Stress Scenarios**: 4 canonical scenarios (`HISTORICAL_GFC_2008`, `HISTORICAL_COVID_2020`, `MACRO_RATE_SPIKE`, `MACRO_STAGFLATION_SHOCK`) with full 8-class shock vectors and `UNSPECIFIED_SHOCK_POLICY` (0.0%).
5. **Historical Return Series Adapter**: Enforces deterministic `asOfDate` cutoff, arithmetic return calculations ($r_t = (P_t - P_{t-1}) / P_{t-1}$), coverage ratio metrics, missing interval reporting, and zero manufactured returns.
6. **Data Quality & Confidence Metadata**: Formally categorizes data into `PRISTINE`, `ACCEPTABLE`, `DEGRADED`, `INSUFFICIENT` and confidence levels `HIGH`, `MODERATE`, `LOW`, `UNAVAILABLE`.

---

## 2. File Boundary Contracts

| File | Type | Purpose |
| :--- | :---: | :--- |
| `services/riskTaxonomy.js` | **[NEW]** | Risk taxonomy constants, schema validators, return series adapter, liquidity classifier. |
| `tests/test_c71.mjs` | **[NEW]** | 20-point automated acceptance suite validating taxonomy contracts, determinism, and read-only invariants. |
| `services/investingAnalyticsEngine.js` | **[FROZEN]** 🔒 | 100% Untouched C.4 financial engine. |
| `services/targetAllocationService.js` | **[FROZEN]** 🔒 | 100% Untouched C.6.1 policy engine. |
| `services/rebalancingEngine.js` | **[FROZEN]** 🔒 | 100% Untouched C.6.2 delta calculator. |
| `services/taxOptimizedRebalancingService.js` | **[FROZEN]** 🔒 | 100% Untouched C.6.3 optimizer. |
