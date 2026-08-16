# Stage C.7.2 Architecture Plan: Concentration & Diversification Diagnostics Engine

**Stage**: C.7.2  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Status**: ARCHITECTURE PLANNING — HARDENED (Zero-Code Gate Active 🔒)  
**Certified Baseline**: [`d80af93`](https://github.com/Nreddy2020/finapp-mobile/commit/d80af93)  
**Author**: Antigravity AI & System Architect  

---

## 1. Problem Statement & Scope

### 1.1 Objective
While Stage C.4.2 computed simple portfolio asset-class weights and top-1/3/5 metrics, **Stage C.7.2 (Concentration & Diversification Diagnostics Engine)** creates an institutional-grade diagnostic service (`services/concentrationEngine.js`). It quantitatively evaluates concentration risk, constituent breadth, informational entropy, and generates auditable diagnostic warnings for over-concentrated capital allocations.

### 1.2 Mathematical Formulations

#### A. Dual-Level Herfindahl-Hirschman Index (HHI):
1. **Asset-Class HHI**:
   $$\text{HHI}_{\text{class}} = \sum_{c=1}^{8} w_c^2 \times 10,000 \quad \text{where } w_c = \frac{V_c}{V_{\text{total}}}$$
2. **Holding-Level HHI**:
   $$\text{HHI}_{\text{holding}} = \sum_{i=1}^{N} w_i^2 \times 10,000 \quad \text{where } w_i = \frac{V_i}{V_{\text{total}}}$$
3. **Normalized Holding HHI ($HHI^* \in [0, 100]$)**:
   $$HHI^* = \begin{cases} 0 & \text{if } N \le 1 \\ \max\left(0, \min\left(100, \frac{\text{HHI}_{\text{holding}} - \frac{10,000}{N}}{10,000 - \frac{10,000}{N}} \times 100\right)\right) & \text{if } N > 1 \end{cases}$$

#### B. Top-k Concentration Ratios ($Top_1, Top_3, Top_5$):
Sort holdings descendingly with deterministic tie-breaking:
1. `marketValue` DESC
2. `symbol` ASC
3. `holdingId` ASC

$$\text{Top}_1 = w_{(1)}, \quad \text{Top}_3 = \sum_{i=1}^{\min(3, N)} w_{(i)}, \quad \text{Top}_5 = \sum_{i=1}^{\min(5, N)} w_{(i)}$$

#### C. Effective Number of Constituents ($N_{\text{eff}}$):
Quantifies the effective number of equal-sized holdings comprising the portfolio:
$$N_{\text{eff}} = \frac{1}{\sum_{i=1}^{N} w_i^2} = \frac{10,000}{\text{HHI}_{\text{holding}}}$$
- Equal-weighted portfolio ($w_i = 1/N$) $\implies N_{\text{eff}} = N$.
- 100 holdings with 90% dominant asset $\implies N_{\text{eff}} \approx 1.23$.

#### D. Shannon Entropy & Diversification Ratio ($H_{\text{entropy}}, DR$):
Measures allocation dispersion and disorder:
$$H_{\text{entropy}} = - \sum_{i=1}^{N} w_i \ln(w_i) \quad (\text{with } 0 \ln(0) = 0)$$
$$\text{Exponential Entropy } E_{\text{eff}} = \exp(H_{\text{entropy}})$$
$$\text{Normalized Diversification Ratio } DR = \begin{cases} 0 & \text{if } N \le 1 \\ \frac{H_{\text{entropy}}}{\ln(N)} & \text{if } N > 1 \end{cases} \quad (0 \le DR \le 1.0)$$

---

## 2. Dedicated Enums & Versioned Policy Contracts

### 2.1 Dedicated Concentration Risk Tier Enum (Resolving C7.2-01)
To prevent contract collision with C.7.1 `RiskSeverity`, Stage C.7.2 defines an orthogonal, dedicated enum:

```javascript
export const ConcentrationRiskTier = Object.freeze({
    BALANCED: 'BALANCED',   // Highly diversified (HHI <= 1500, Top1 <= 20%)
    MODERATE: 'MODERATE',   // Moderate concentration (HHI 1500-3000 or Top1 20-35%)
    HIGH: 'HIGH',           // High concentration (HHI 3000-5000 or Top1 35-50%)
    CRITICAL: 'CRITICAL'    // Extreme concentration (HHI > 5000 or Top1 > 50%)
});
```

### 2.2 Authoritative Versioned Concentration Policy (Resolving C7.2-07)
```javascript
export const CONCENTRATION_POLICY_VERSION = "C7_2_V1";

export const CONCENTRATION_POLICY_V1 = Object.freeze({
    thresholds: Object.freeze({
        // Tier Boundaries
        HHI_BALANCED_MAX: 1500,
        HHI_MODERATE_MAX: 3000,
        HHI_HIGH_MAX: 5000,
        TOP1_BALANCED_MAX: 0.20, // 20%
        TOP1_MODERATE_MAX: 0.35, // 35%
        TOP1_HIGH_MAX: 0.50,     // 50%

        // Diagnostic Warning Limits
        SINGLE_HOLDING_CRITICAL_RATIO: 0.35, // > 35%
        TOP3_HIGH_RATIO: 0.60,               // > 60%
        TOP5_HIGH_RATIO: 0.80,               // > 80%
        CRYPTO_MAX_RATIO: 0.15,              // > 15%
        STOCK_DOMINANCE_RATIO: 0.75,         // > 75% STOCK canonical class
        BROAD_EQUITY_DOMINANCE_RATIO: 0.80,  // > 80% Verified Equity (Stock + Verified Equity MFs/ETFs)
        UNDER_DIVERSIFIED_NEFF_MIN: 3.0,     // N_eff < 3.0 (when N >= 5)
        MIN_CONSTITUENTS_FOR_WARNING: 5
    })
});
```

### 2.3 Authoritative Source for Equity Exposure (Resolving C7.2-02)
To strictly avoid fabricating subtype classifications:
1. **Canonical Equity Exposure**:
   $$\text{Equity}_{\text{canonical}} = V_{\text{STOCK}}$$
   Flags `STOCK_CLASS_DOMINANCE` if $V_{\text{STOCK}} / V_{\text{total}} > 0.75$.
2. **Verified Broad Equity Exposure**:
   $$\text{Equity}_{\text{broad}} = V_{\text{STOCK}} + \sum_{i \in \text{Verified Equity MFs/ETFs}} V_i$$
   where verified equity MFs/ETFs require explicit `metadata.equitySubtype === 'EQUITY'` or `metadata.category === 'EQUITY'`. If metadata is absent, MFs and ETFs are **not** guessed as equity.
   Flags `BROAD_EQUITY_DOMINANCE` if $\text{Equity}_{\text{broad}} / V_{\text{total}} > 0.80$.

---

## 3. Valuation Invariants & Precision Policy

### 3.1 Valuation & Weight Invariants (Resolving C7.2-03)
- **Positive Portfolio Invariant**: For $V_{\text{total}} > 0$, $\sum_{i=1}^N w_i = 1.0 \pm 10^{-6}$.
- **Non-Negative Value Invariant**: $V_i \ge 0$ for all $i$. Invalid, NaN, or negative valuations are sanitized to $0$ and logged in data quality warnings.
- **Zero-Value Holdings**: Holdings with $V_i = 0$ are included in `holdingCount` with $w_i = 0.0$, but do not contribute to HHI or division-by-zero errors.
- **Empty / Zero-Value Portfolio**: Returns $HHI = 0, N_{\text{eff}} = 0, DR = 0$, `riskTier: 'BALANCED'`, `warnings: ['EMPTY_OR_ZERO_VALUE_PORTFOLIO']`.

### 3.2 Numeric Precision Policy (Resolving C7.2-06)
- **Internal Calculations**: Full IEEE-754 64-bit double precision across all intermediate summations.
- **Never Round Weights Before HHI**: $HHI = \sum \left(\frac{V_i}{V_{\text{total}}}\right)^2 \times 10,000$ directly from raw valuations.
- **DTO Serialization**:
  - Weight ratios ($w_i, Top_1, Top_3, Top_5, DR$): Rounded to 6 decimal places.
  - HHI values ($\text{HHI}_{\text{class}}, \text{HHI}_{\text{holding}}, HHI^*$): Rounded to 2 decimal places.
  - Effective counts ($N_{\text{eff}}, E_{\text{eff}}$): Rounded to 4 decimal places.

### 3.3 Data Quality & Confidence Propagation (Resolving C7.2-05)
Stage C.7.2 propagates data quality from C.4 valuation coverage:
- **`HIGH` Confidence**: 100% of holdings priced via LIVE market quotes.
- **`MODERATE` Confidence**: $80\% - 99\%$ of holdings priced via LIVE quotes, or partial fallback used.
- **`LOW` Confidence**: $< 80\%$ quote coverage.
- **`UNAVAILABLE`**: Missing valuations or unparseable portfolio.

---

## 4. Canonical DTO Contract

```javascript
/**
 * Authoritative Concentration & Diversification Diagnostics DTO
 */
export const ConcentrationDiagnosticsSchema = {
    portfolioId: 'STRING_OR_NULL',
    asOfDate: 'ISO_DATE_STRING', // Mandatory deterministic cutoff
    policyVersion: 'C7_2_V1',
    totalMarketValue: 'FINITE_NUMBER',
    holdingCount: 'INTEGER',
    
    // HHI Metrics
    assetClassHHI: 'FINITE_NUMBER',        // [0.00 - 10000.00]
    holdingHHI: 'FINITE_NUMBER',           // [0.00 - 10000.00]
    normalizedHoldingHHI: 'FINITE_NUMBER', // [0.00 - 100.00]

    // Breadth & Entropy Metrics
    effectiveConstituents: 'FINITE_NUMBER', // N_eff
    shannonEntropy: 'FINITE_NUMBER',        // H_entropy
    exponentialEntropy: 'FINITE_NUMBER',    // E_eff
    diversificationRatio: 'FINITE_NUMBER',  // DR [0.000000 - 1.000000]

    // Top-k Ratios
    top1Ratio: 'FINITE_NUMBER',
    top3Ratio: 'FINITE_NUMBER',
    top5Ratio: 'FINITE_NUMBER',
    
    // Ordered Breakdown Lists
    topHoldings: 'ARRAY_OF_HOLDING_WEIGHT_DTO',
    assetClassBreakdown: 'ARRAY_OF_ASSET_CLASS_WEIGHT_DTO',
    
    // Diagnostics & Governance
    riskTier: 'ConcentrationRiskTier', // 'BALANCED' | 'MODERATE' | 'HIGH' | 'CRITICAL'
    warnings: 'ARRAY_OF_DIAGNOSTIC_WARNING_STRINGS',
    dataQuality: 'RiskMetricDataQualitySchema'
};
```

---

## 5. Required 28-Point Acceptance Suite (`tests/test_c72.mjs`)

1. **Empty Portfolio Handling**: Returns zeros and `BALANCED` tier without NaN.
2. **Single Holding Portfolio ($N=1$)**: $HHI = 10,000, N_{\text{eff}} = 1.0, DR = 0.0, HHI^* = 0.0$.
3. **Two Equal Holdings ($N=2, 50/50$)**: $HHI = 5,000, N_{\text{eff}} = 2.0, DR = 1.0, HHI^* = 0.0$.
4. **8 Equal Canonical Asset Classes**: $\text{HHI}_{\text{class}} = 1,250.00, \text{HHI}_{\text{holding}} = 1,250.00, N_{\text{eff}} = 8.0$.
5. **100 Equal Holdings ($N=100, w_i = 0.01$)**: $HHI = 100.00, N_{\text{eff}} = 100.0, DR = 1.0$.
6. **90% Dominant Holding ($w_1 = 0.90, 10 \text{ holdings}$)**: $HHI > 8100, N_{\text{eff}} \approx 1.23$, `CRITICAL` tier.
7. **Asset-Class HHI vs Holding-Level HHI Decomposition**: Correct segregation.
8. **Normalized HHI ($HHI^*$) Mathematical Range**: Verified in $[0, 100]$.
9. **$N_{\text{eff}}$ Inverse Simpson Calculation**: Verified across asymmetric weights.
10. **Shannon Entropy Calculation Accuracy**: Matches theoretical $- \sum w_i \ln(w_i)$.
11. **Exponential Entropy ($E_{\text{eff}}$)**: Verified $E_{\text{eff}} = \exp(H)$.
12. **Diversification Ratio ($DR$) Range $[0, 1]$**: Verified bounds.
13. **Top-1 Ratio ($Top_1$) Calculation**: Exact largest holding ratio.
14. **Top-3 Ratio ($Top_3$) Calculation**: Exact sum of top 3 holdings.
15. **Top-5 Ratio ($Top_5$) Calculation**: Exact sum of top 5 holdings.
16. **Deterministic Tie-Breaking**: Same market value sorted by `symbol ASC, holdingId ASC`.
17. **`BALANCED` Concentration Tier Boundary**: $HHI \le 1500 \land Top_1 \le 20\%$.
18. **`MODERATE` Concentration Tier Boundary**: $1500 < HHI \le 3000 \lor Top_1 \le 35\%$.
19. **`HIGH` Concentration Tier Boundary**: $3000 < HHI \le 5000 \lor Top_1 \le 50\%$.
20. **`CRITICAL` Concentration Tier Boundary**: $HHI > 5000 \lor Top_1 > 50\%$.
21. **`CRITICAL_SINGLE_HOLDING` Diagnostic Warning**: Triggered when $w_{(1)} > 35\%$.
22. **`HIGH_TOP3_CONCENTRATION` Diagnostic Warning**: Triggered when $Top_3 > 60\%$.
23. **`SPECULATIVE_ASSET_OVERWEIGHT` Diagnostic Warning**: Triggered when Crypto $> 15\%$.
24. **`STOCK_CLASS_DOMINANCE` & `BROAD_EQUITY_DOMINANCE` Warnings**: Authoritative equity exposure evaluation.
25. **`UNDER_DIVERSIFIED_PORTFOLIO` Warning**: Triggered when $N_{\text{eff}} < 3.0$ with $N \ge 5$.
26. **Mandatory Deterministic `asOfDate` & AST Scan**: Zero `Date.now()` / argument-less `new Date()`.
27. **Deep 5-Store Read-Only Safety Guard**: Zero mutations to holdings, events, quotes, txs, wallets.
28. **Full System Regression Matrix**: 275/275 previous tests preserved without regressions.
