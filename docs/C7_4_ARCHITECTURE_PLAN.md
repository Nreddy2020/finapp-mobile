# Stage C.7.4 Architecture Plan: Correlation, Covariance & Cross-Asset Risk Engine

**Stage**: C.7.4  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Status**: ARCHITECTURE FINAL MICRO-REMEDIATION COMPLETE — ZERO-CODE GATE ACTIVE 🔒  
**Certified Baseline**: [`4f541b6`](https://github.com/Nreddy2020/finapp-mobile/commit/4f541b6) (Stage C.7.3 Master Certified)  
**Branch**: `fintech-using-chatgpt`  
**Author**: Antigravity AI & Quantitative Risk Systems Architect  

---

## 1. Executive Summary & Problem Statement

### 1.1 Objective
While Stage C.7.2 established concentration/diversification (HHI, entropy) and Stage C.7.3 calculated univariate volatility, drawdown, and VaR/CVaR, **Stage C.7.4 (Correlation, Covariance & Cross-Asset Risk Engine)** creates the analytical multivariate dependency engine (`services/correlationEngine.js`).

It provides mathematically rigorous, deterministic, and auditable cross-asset risk diagnostics:
1. **Pairwise Sample Covariance Matrix ($\mathbf{\Sigma}^{\text{ann}}$)**: Sample covariance of synchronized return series with Bessel's correction $N-1$ and frequency annualization factor $F \in \{252, 52, 12\}$.
2. **Pearson Correlation Matrix ($\mathbf{R}$)**: Normalized linear dependency matrix ($\rho_{ij} \in [-1, 1]$) with strict zero-variance protection.
3. **Portfolio-Weighted Average Correlation ($\bar{\rho}_p$)**: Off-diagonal diversification density index.
4. **Diversification Ratio ($DR_{\text{corr}}$) & Volatility Reduction Multiplier ($DBM$)**: Dimensionally consistent ratio of annualized weighted constituent volatilities to total annualized portfolio volatility ($\frac{\sum w_i \sigma_{i,\text{ann}}}{\sqrt{\mathbf{w}^T \mathbf{\Sigma}^{\text{ann}} \mathbf{w}}}$) with explicit zero/degenerate-variance boundaries.
5. **Principal Component Analysis (PCA) & Factor Concentration with Raw vs Effective Spectrum**:
   - 9-step deterministic spectral projection PSD repair with authoritative **final eigen recomputation**.
   - Explicit separation of `FINAL_EIGENVALUES_RAW` (decomposition output) and `FINAL_EIGENVALUES_EFFECTIVE` (tolerance-clamped non-negative spectrum $\ge 0$ used for all PCA DTO metrics).
   - Proportion of variance explained by Top-1, Top-2, Top-3 effective eigenvalues.
   - Effective Number of Independent Risk Factors ($N_{\text{factors}} = \frac{(\sum \lambda_{i,\text{effective}})^2}{\sum (\lambda_{i,\text{effective}})^2} = \frac{N^2}{\sum (\lambda_{i,\text{effective}})^2}$).
6. **Canonical 8-Class Cross-Asset Class Correlation & Strict Constituent Synchronization**:
   - Aggregated $8 \times 8$ correlation matrix across canonical C.7.1 asset classes.
   - Strict intersection synchronization across class constituents (zero manufactured returns, zero dynamic weight renormalization).
   - Explicit null handling for unrepresented classes ($W_c = 0$).
7. **Explicit Empty Portfolio Boundary ($N = 0$)**: Complete deterministic DTO contract returning safe nulls and `'EMPTY_PORTFOLIO'` status.

### 1.2 Non-Goals & Invariants
- ❌ **No UI Development**: Pure analytical calculation engine. UI visualizers will be developed in Stage C.7.8.
- ❌ **No Modification of Certified Engines**: Zero edits to `investingAnalyticsEngine.js`, `targetAllocationService.js`, `rebalancingEngine.js`, `taxOptimizedRebalancingService.js`, `riskTaxonomy.js`, `concentrationEngine.js`, or `volatilityDrawdownEngine.js`.
- ❌ **Zero State Mutation**: 100% read-only diagnostic service. Does not mutate or persist any store data.
- ❌ **Zero Manufactured Returns / Missing Data Integrity**: Missing return timestamps are strictly intersected across constituents without interpolating fake returns. Absent asset classes return `null` correlations (never artificial 0.0).
- ❌ **Zero Wall-Clock Dependencies**: Mandatory `asOfDate` on every public API entry point. Zero `Date.now()` or argument-less `new Date()`.
- ❌ **Long-Only Portfolios**: Strictly long-only ($w_i \ge 0, \sum w_i = 1.0 \pm 10^{-6}$).

---

## 2. Mathematical Specifications & Core Contracts

### 2.1 Return Series Synchronization, Duplicate Detection & Timestamp Contract (C7.4-R4)

For a portfolio of $N$ holdings with return series $\{ r_{i, t} \}$ for $i \in [1, N]$:

1. **Timestamp Normalization & Duplicate Detection**:
   - All input observation timestamps are normalized to canonical ISO instants (e.g. `YYYY-MM-DD` or full ISO string) prior to matching.
   - Each holding $i$ must contain **at most one** observation per canonical timestamp.
   - If duplicate timestamps exist for any holding:
     - The engine **MUST NOT** silently overwrite, average, sum, or pick first/last.
     - The engine immediately returns `status: 'INVALID_INPUT'`, `warnings.push('DUPLICATE_TIMESTAMP_INPUT')`, and dependent calculation outputs are set to `null`.
2. **Synchronized Time Grid ($\mathcal{T}_{\text{sync}}$)**:
   $$\mathcal{T}_{\text{sync}} = \bigcap_{i=1}^N \{ t \le \text{asOfDate} \mid r_{i,t} \text{ exists and is finite} \}$$
   Let $T = |\mathcal{T}_{\text{sync}}|$ be the count of synchronized periodic observations.
3. **Observation Thresholds**:
   - Minimum synchronized observations: $T \ge 20$.
   - If $T < 20$: Status is `INSUFFICIENT_HISTORY`, confidence is `UNAVAILABLE`, all matrix outputs return `null`.
   - Recommended observations for full matrix stability: $T \ge 60$.

---

### 2.2 Portfolio Weight Validation & Long-Only Contract (C7.4-R2)

C.7.4 strictly accepts **long-only** portfolio weights:
1. Every constituent weight $w_i$ must be finite and satisfy $w_i \ge 0.0$.
2. The sum of weights must satisfy $\left| \sum_{i=1}^N w_i - 1.0 \right| \le 10^{-6}$.
3. **Invalid Weight Policy**:
   - If any weight is `NaN`, `Infinity`, negative ($w_i < 0$), non-finite, or if total weight is zero:
     - The engine **MUST NOT** silently normalize or fabricate adjusted weights.
     - The engine returns `status: 'INVALID_INPUT'`, `warnings.push('INVALID_PORTFOLIO_WEIGHTS')`, and all dependent portfolio risk metrics return `null`.

---

### 2.3 Empty Portfolio Contract ($N = 0$) (C7.4-R8)

If holding count $N = 0$:
- `status: 'EMPTY_PORTFOLIO'`
- `observationCount: 0`, `holdingCount: 0`
- `correlationMatrix: null`, `covarianceMatrix: null`, `assetClassCorrelationMatrix: null`
- `weightedAverageCorrelation: null`, `diversificationRatio: null`, `diversificationBenefitMultiplier: null`
- `portfolioAnnualizedVolatility: null`, `weightedConstituentVolatility: null`
- `eigenvalues: null`, `varianceExplainedRatios: null`
- `top1FactorConcentration: null`, `top2CumulativeVariance: null`, `top3CumulativeVariance: null`
- `componentsFor80PercentVariance: null`, `componentsFor90PercentVariance: null`, `effectiveFactorCount: null`
- `warnings: ['EMPTY_PORTFOLIO']`
- `dataQuality.confidenceLevel: 'UNAVAILABLE'`

---

### 2.4 Covariance & Correlation Matrix Formulation

#### A. Annualized Sample Covariance Matrix ($\mathbf{\Sigma}^{\text{ann}} \in \mathbb{R}^{N \times N}$)
For holdings $i, j \in [1, N]$ over $T$ synchronized periods:
$$\bar{r}_i = \frac{1}{T} \sum_{t=1}^T r_{i,t}$$
$$\text{Cov}(r_i, r_j) = \frac{1}{T-1} \sum_{t=1}^T (r_{i,t} - \bar{r}_i)(r_{j,t} - \bar{r}_j)$$
$$\mathbf{\Sigma}_{ij}^{\text{ann}} = \text{Cov}(r_i, r_j) \cdot F$$
where $F \in \{252, 52, 12\}$ is the frequency annualization factor.

#### B. Pearson Correlation Matrix ($\mathbf{R} \in \mathbb{R}^{N \times N}$)
$$\mathbf{R}_{ij} = \begin{cases}
1.0 & \text{if } i = j \\
0.0 & \text{if } \sigma_{i,\text{periodic}} = 0 \text{ or } \sigma_{j,\text{periodic}} = 0 \quad (\text{zero-variance cash/stable asset guard}) \\
\text{clamp}\left(\frac{\text{Cov}(r_i, r_j)}{\sigma_{i,\text{periodic}} \sigma_{j,\text{periodic}}}, -1.0, 1.0\right) & \text{otherwise}
\end{cases}$$
where $\sigma_{i,\text{periodic}} = \sqrt{\text{Cov}(r_i, r_i)}$.

---

### 2.5 Annualized Diversification Metrics & Zero-Volatility Boundary (C7.4-R5 & C7.4-R9)

Define numerical volatility epsilon: $\epsilon_{\text{vol}} = 10^{-12}$.

1. **Annualized Constituent Volatility ($\sigma_{i,\text{ann}}$) (C7.4-R9)**:
   $$\sigma_{i,\text{ann}} = \sqrt{\mathbf{\Sigma}_{ii}^{\text{ann}}} = \sqrt{\text{Cov}(r_i, r_i) \cdot F}$$
2. **Annualized Weighted Constituent Volatility ($\sigma_{\text{weighted}}$)**:
   $$\sigma_{\text{weighted}} = \sum_{i=1}^N w_i \sigma_{i,\text{ann}}$$
3. **Annualized Portfolio Volatility from Covariance ($\sigma_p$)**:
   $$\sigma_p^2 = \mathbf{w}^T \mathbf{\Sigma}^{\text{ann}} \mathbf{w} = \sum_{i=1}^N \sum_{j=1}^N w_i w_j \mathbf{\Sigma}_{ij}^{\text{ann}}$$
   $$\sigma_p = \sqrt{\max(0, \sigma_p^2)}$$
4. **Diversification Ratio ($DR_{\text{corr}}$) & Multiplier ($DBM$) Contract**:
   - **Case 1 (Zero Constituent & Portfolio Volatility)**:
     If $\sigma_{\text{weighted}} \le \epsilon_{\text{vol}}$ AND $\sigma_p \le \epsilon_{\text{vol}}$ (e.g. 100% cash portfolio):
     $$DR_{\text{corr}} = 1.0, \quad DBM = 0.0$$
   - **Case 2 (Degenerate Portfolio Variance)**:
     If $\sigma_p \le \epsilon_{\text{vol}}$ AND $\sigma_{\text{weighted}} > \epsilon_{\text{vol}}$ (e.g. perfect synthetic hedge $\sigma_p \approx 0$):
     $$DR_{\text{corr}} = \text{null}, \quad DBM = \text{null}, \quad \text{warnings.push('DEGENERATE_PORTFOLIO_VARIANCE')}$$
     *(Guarantees dimensional consistency and zero division-by-zero, `NaN`, or artificial `Infinity`)*.
   - **Case 3 (Standard Positive Volatility)**:
     $$DR_{\text{corr}} = \frac{\sigma_{\text{weighted}}}{\sigma_p} = \frac{\sum_{i=1}^N w_i \sigma_{i,\text{ann}}}{\sqrt{\mathbf{w}^T \mathbf{\Sigma}^{\text{ann}} \mathbf{w}}} \ge 1.0$$
     $$DBM = \max\left(0.0, 1.0 - \frac{\sigma_p}{\sigma_{\text{weighted}}}\right) \in [0.0, 1.0)$$
5. **Weighted Average Off-Diagonal Correlation ($\bar{\rho}_p$)**:
   $$\bar{\rho}_p = \begin{cases}
   1.0 & \text{if } N = 1 \text{ or } \sum_{i \ne j} w_i w_j = 0 \\
   \frac{\sum_{i=1}^N \sum_{j \ne i} w_i w_j \mathbf{R}_{ij}}{\sum_{i=1}^N \sum_{j \ne i} w_i w_j} = \frac{\mathbf{w}^T \mathbf{R} \mathbf{w} - \sum w_i^2}{1 - \sum w_i^2} & \text{otherwise}
   \end{cases}$$

---

### 2.6 Principal Component Analysis (PCA), Raw vs Effective Spectrum Contract (C7.4-R1, C7.4-R6, C7.4-R10)

#### A. Authoritative Deterministic Pipeline
```
Input Correlation Matrix R (N x N)
        ↓
1. Symmetrize: R_sym = (R + R^T) / 2
        ↓
2. Eigen Decomposition: R_sym = V Λ V^T
        ↓
3. Check for Negative Eigenvalues: (min(λ_k) < -PSD_REPAIR_TOLERANCE)
        ↓
4. If PSD repair required:
   Clamp negative eigenvalues: λ̂_k = max(0, λ_k)
   Reconstruct: R_recon = V diag(Λ̂) V^T
   Normalize diagonal to 1.0: R_repaired,ij = R_recon,ij / sqrt(R_recon,ii * R_recon,jj)
   Symmetrize again: R_final = (R_repaired + R_repaired^T) / 2
   Execute FINAL Eigen Decomposition: R_final = V_final Λ_final V_final^T
   Else:
   R_final = R_sym, Λ_final = Λ
        ↓
5. Inspect & Derive FINAL Spectrum (C7.4-R10):
   FINAL_EIGENVALUES_RAW = exact eigenvalues returned by decomposition of R_final
   For each λ in FINAL_EIGENVALUES_RAW:
   If λ >= 0:
       λ_effective = λ
   Else if λ < 0 and |λ| <= PSD_REPAIR_TOLERANCE (1e-8):
       λ_effective = 0.0  (floating-point numerical noise)
   Else if λ < -PSD_REPAIR_TOLERANCE:
       Mark status: 'DEGRADED', warning: 'NUMERICALLY_INVALID_NON_PSD_SPECTRUM', PCA metrics = null
   Sort FINAL_EIGENVALUES_EFFECTIVE descendingly: λ_1^eff ≥ λ_2^eff ≥ ... ≥ λ_N^eff ≥ 0
        ↓
6. Use FINAL_EIGENVALUES_EFFECTIVE for ALL Output PCA Metrics
```

#### B. Trace Invariant & Mathematical Metrics
All PCA DTO metrics are strictly computed using `FINAL_EIGENVALUES_EFFECTIVE`:
1. **Effective Trace Invariant**:
   $$\left| \sum_{k=1}^N \lambda_{k,\text{effective}} - N \right| \le 10^{-6}$$
2. **Variance Explained Ratios ($V_k$)**:
   $$V_k = \frac{\lambda_{k,\text{effective}}}{N}$$
   - $PC_1 = \frac{\lambda_{1,\text{effective}}}{N}$
   - $PC_{1,2} = \frac{\lambda_{1,\text{effective}} + \lambda_{2,\text{effective}}}{N}$
   - $PC_{1,2,3} = \frac{\lambda_{1,\text{effective}} + \lambda_{2,\text{effective}} + \lambda_{3,\text{effective}}}{N}$
   - $K_{80} = \min \{ K \mid \sum_{k=1}^K V_k \ge 0.80 \}$
   - $K_{90} = \min \{ K \mid \sum_{k=1}^K V_k \ge 0.90 \}$
3. **Effective Number of Independent Factors ($N_{\text{factors}}$)**:
   $$N_{\text{factors}} = \frac{N^2}{\sum_{k=1}^N (\lambda_{k,\text{effective}})^2} \quad \in [1.0, N]$$

---

### 2.7 Canonical 8-Class Asset Aggregation & Strict Constituent Synchronization (C7.4-R3 & C7.4-R7)

For the 8 canonical C.7.1 asset classes ($\text{EQUITY\_DOMESTIC}$, $\text{EQUITY\_INTERNATIONAL}$, $\text{DEBT\_FIXED\_INCOME}$, $\text{GOLD\_COMMODITIES}$, $\text{REAL\_ESTATE}$, $\text{CASH\_LIQUID}$, $\text{CRYPTO\_SPECULATIVE}$, $\text{ALTERNATIVE}$):

1. **Active Class Weight Calculation**:
   $$W_c = \sum_{i \in \text{class } c} w_i$$
2. **Empty Asset Class Rule ($W_c = 0$)**:
   - If an asset class $c$ is not represented in the portfolio ($W_c = 0$):
     - The class return series is `unavailable` (`null`).
     - The class volatility is `null`.
     - All pairwise correlation entries involving class $c$ (including diagonal $(c, c)$) are strictly **`null`**.
   - **Zero Manufactured Returns Rule**: An absent class **MUST NEVER** be represented as zero return, zero volatility, or zero correlation.
3. **Represented Class Constituent Synchronization (C7.4-R7)**:
   - For each represented class $c$ ($W_c > 0$):
     - Normalized fixed constituent weights: $w_{\text{class}, i} = w_i / W_c$.
     - Build the class return series **ONLY** on timestamps where **every** constituent $i \in c$ has a valid, finite return (strict intersection $\mathcal{T}_{\text{class}, c} = \bigcap_{i \in c} \mathcal{T}_i$).
     - **Strict Prohibitions**:
       - Missing constituent returns are **NEVER** replaced with 0.0.
       - No interpolation, forward-filling, or synthetic imputation.
       - Weights are **NEVER** renormalized dynamically per timestamp.
       - Constituent membership does not change across dates.
     - If a constituent is missing on timestamp $t$, timestamp $t$ is excluded from class $c$'s return series.
     - If the resulting synchronized return series for class $c$ has fewer than 20 observations ($|\mathcal{T}_{\text{class}, c}| < 20$), class $c$'s correlation relationships are marked `null`/unavailable.
     - On synchronized timestamps:
       $$R_{\text{class}, c, t} = \sum_{i \in \text{class } c} w_{\text{class}, i} \cdot r_{i,t}$$
4. **Cross-Class Correlation Matrix**:
   - Pairwise Pearson correlations between active classes are computed across their synchronized return series intersection.

---

## 3. Versioned Policy & Diagnostic Warnings

### 3.1 Versioned Policy (`C7_4_V1`)
```javascript
export const CORRELATION_POLICY_VERSION = "C7_4_V1";

export const CORRELATION_POLICY_V1 = Object.freeze({
    observationThresholds: Object.freeze({
        MIN_SYNCHRONIZED_OBSERVATIONS: 20,
        RECOMMENDED_OBSERVATIONS: 60
    }),
    warningThresholds: Object.freeze({
        HIGH_POSITIVE_CORRELATION: 0.70,
        CRITICAL_POSITIVE_CORRELATION: 0.85,
        STRONG_NEGATIVE_CORRELATION: -0.70,
        HIGH_PORTFOLIO_AVERAGE_CORRELATION: 0.65,
        CRITICAL_PORTFOLIO_AVERAGE_CORRELATION: 0.80,
        LOW_DIVERSIFICATION_RATIO: 1.15,
        CRITICAL_FACTOR_CONCENTRATION_PC1: 0.60
    }),
    tolerances: Object.freeze({
        PORTFOLIO_VOLATILITY_EPSILON: 1e-12,
        WEIGHT_SUM_TOLERANCE: 1e-6,
        TRACE_SUM_TOLERANCE: 1e-6,
        PSD_REPAIR_TOLERANCE: 1e-8
    }),
    defaults: Object.freeze({
        frequency: 'DAILY'
    })
});
```

### 3.2 Canonical DTO Contract
```javascript
export const CorrelationDiagnosticsSchema = {
    portfolioId: 'STRING_OR_NULL',
    asOfDate: 'ISO_DATE_STRING',
    policyVersion: 'C7_4_V1',
    status: 'CorrelationStatus', // 'HEALTHY' | 'INSUFFICIENT_HISTORY' | 'INVALID_INPUT' | 'DEGRADED' | 'SINGLE_HOLDING' | 'EMPTY_PORTFOLIO'
    frequency: 'DAILY | WEEKLY | MONTHLY',
    observationCount: 'INTEGER',
    holdingCount: 'INTEGER',

    // Holdings Order Mapping
    holdingIds: 'ARRAY_OF_STRINGS',
    symbols: 'ARRAY_OF_STRINGS',
    weights: 'ARRAY_OF_NUMBERS',

    // Correlation & Covariance Matrices (2D arrays, 4 decimal places)
    correlationMatrix: 'ARRAY_OF_ARRAYS_OF_NUMBERS_OR_NULL',
    covarianceMatrix: 'ARRAY_OF_ARRAYS_OF_NUMBERS_OR_NULL',

    // Summary Dependency & Annualized Diversification Metrics
    weightedAverageCorrelation: 'FINITE_NUMBER_OR_NULL',
    diversificationRatio: 'FINITE_NUMBER_OR_NULL',
    diversificationBenefitMultiplier: 'FINITE_NUMBER_OR_NULL',
    portfolioAnnualizedVolatility: 'FINITE_NUMBER_OR_NULL',
    weightedConstituentVolatility: 'FINITE_NUMBER_OR_NULL',

    // Principal Component Analysis (PCA) — Based on FINAL_EIGENVALUES_EFFECTIVE
    eigenvalues: 'ARRAY_OF_NUMBERS_OR_NULL',
    varianceExplainedRatios: 'ARRAY_OF_NUMBERS_OR_NULL',
    top1FactorConcentration: 'FINITE_NUMBER_OR_NULL',
    top2CumulativeVariance: 'FINITE_NUMBER_OR_NULL',
    top3CumulativeVariance: 'FINITE_NUMBER_OR_NULL',
    componentsFor80PercentVariance: 'INTEGER_OR_NULL',
    componentsFor90PercentVariance: 'INTEGER_OR_NULL',
    effectiveFactorCount: 'FINITE_NUMBER_OR_NULL',

    // Canonical 8-Class Asset Correlation Matrix (Contains nulls for unrepresented classes)
    assetClasses: 'ARRAY_OF_STRINGS', // 8 canonical classes
    assetClassCorrelationMatrix: 'ARRAY_OF_ARRAYS_OF_NUMBERS_OR_NULL',

    // High Correlation & Negative Correlation Diagnostic Pairs
    highPositiveCorrelationPairs: 'ARRAY_OF_OBJECTS', // { holdingIdA, holdingIdB, symbolA, symbolB, correlation, severity }
    strongNegativeCorrelationPairs: 'ARRAY_OF_OBJECTS', // { holdingIdA, holdingIdB, symbolA, symbolB, correlation, type: 'DIVERSIFIER' }

    // Diagnostics & Warnings
    warnings: 'ARRAY_OF_STRINGS',
    dataQuality: 'RiskMetricDataQualitySchema'
};
```

---

## 4. Expanded 40-Scenario Acceptance Test Matrix (`tests/test_c74.mjs`)

### Group 1: Mathematical Formulation & Core Matrices (Tests 1–8)
1. **Single Holding Portfolio ($N = 1$)**: $\mathbf{R} = [[1.0]], \mathbf{\Sigma} = [[\sigma^2]], DR = 1.0, \bar{\rho}_p = 1.0, N_{\text{factors}} = 1.0$.
2. **Two Orthogonal Uncorrelated Holdings ($\rho = 0$)**: Exact $DR = \sqrt{2} \approx 1.4142, \bar{\rho}_p = 0.0, N_{\text{factors}} = 2.0$.
3. **Two Perfectly Correlated Holdings ($\rho = 1.0$)**: Exact $DR = 1.0, \bar{\rho}_p = 1.0, \lambda_{1,\text{eff}} = 2.0 (100\%), N_{\text{factors}} = 1.0$.
4. **Two Perfectly Inversely Correlated Holdings ($\rho = -1.0$)**: $\sigma_p = 0.0$ for equal weights $\implies DR = \text{null}, DBM = \text{null}$, warning `DEGENERATE_PORTFOLIO_VARIANCE`.
5. **Sample Covariance Bessel's Correction ($N-1$)**: Exact mathematical match against analytical covariance.
6. **Annualized Covariance Scaling ($F = 252, 52, 12$)**: Exact scaling verified across frequencies.
7. **Pearson Correlation Normalization ($\rho \in [-1, 1]$)**: Symmetry $\mathbf{R}_{ij} = \mathbf{R}_{ji}$ and diagonal $\mathbf{R}_{ii} = 1.0$.
8. **Zero-Variance Asset Protection (Cash / Stablecoins)**: Constant return yields $\rho_{ij} = 0.0$ and $\mathbf{R}_{ii} = 1.0$ without division-by-zero or `NaN`.

### Group 2: Annualized Diversification & Weighted Metrics (Tests 9–14)
9. **Annualized Constituent Volatility Match (C7.4-R9)**: $\sigma_{i,\text{ann}} = \sqrt{\mathbf{\Sigma}_{ii}^{\text{ann}}}$ dimensionally consistent with $\sigma_p$.
10. **Weighted Average Correlation ($\bar{\rho}_p$) Equal vs Non-Equal Weights**: Exact match against formula $(\mathbf{w}^T \mathbf{R} \mathbf{w} - \sum w_i^2) / (1 - \sum w_i^2)$.
11. **Diversification Ratio ($DR_{\text{corr}}$) Invariant ($DR \ge 1.0$)**: Numerator and denominator both use annualized units.
12. **Diversification Benefit Multiplier ($DBM \in [0, 1)$)**: Exact $(1 - \sigma_p / \sigma_{\text{weighted}})$.
13. **Portfolio Volatility Reconciliation**: Confirms $\sqrt{\mathbf{w}^T \mathbf{\Sigma}^{\text{ann}} \mathbf{w}}$ matches portfolio-level return standard deviation.
14. **Zero-Variance Portfolio Boundary (100% Cash)**: $\sigma_{p,\text{ann}} = 0, \sigma_{\text{weighted},\text{ann}} = 0 \implies DR = 1.0, DBM = 0.0$.

### Group 3: Canonical 8-Class Asset Aggregation & Synchronization (Tests 15–20)
15. **8-Class Representation Structure**: Exactly 8 canonical asset classes in output array.
16. **Empty Asset Class Null Matrix Contract ($W_c = 0$)**: Absent classes produce `null` rows and columns.
17. **Partially Populated Portfolio (3 Classes Present)**: Valid $3 \times 3$ sub-block, exactly `null` for the 5 absent classes.
18. **Class Constituent Missing Observation Synchronization (C7.4-R7)**: Timestamp omitted when any constituent is missing (no zero substitution).
19. **Fixed Class Weight Integrity**: Class weights $w_i / W_c$ remain strictly constant across all timestamps.
20. **Insufficient Class Observations ($T_{\text{class}} < 20$)**: Class relationship returns `null` with warning.

### Group 4: PCA, Effective Spectrum, Tolerance & PSD Repair (Tests 21–26)
21. **Effective Spectrum Trace Invariant ($\sum \lambda_{k,\text{effective}} = N$)**: Trace sum equals $N \pm 10^{-6}$ on effective spectrum.
22. **Variance Explained Monotonicity**: $\lambda_{1,\text{eff}} \ge \dots \ge \lambda_{N,\text{eff}} \ge 0$.
23. **Raw vs Effective Eigenvalue Treatment (C7.4-R6 & C7.4-R10)**: Raw $-10^{-10} \to \text{effective } 0.0$ for PCA metrics.
24. **Materially Negative Eigenvalue Detection**: Rejects $\lambda_{\text{raw}} < -10^{-8}$ with `DEGRADED` status.
25. **Effective Number of Independent Factors ($N_{\text{factors}}$)**: Exact calculation across identity and singular correlation structures.
26. **$K_{80}$ and $K_{90}$ Factor Thresholds**: Accurate component counts for cumulative variance.

### Group 5: Validation, Input Guards & Warnings (Tests 27–33)
27. **Empty Portfolio Boundary ($N = 0$) (C7.4-R8)**: Returns `EMPTY_PORTFOLIO` status and safe nulls.
28. **Duplicate Timestamp Detection (C7.4-R4)**: Returns `INVALID_INPUT` and `DUPLICATE_TIMESTAMP_INPUT` warning without guessing.
29. **Strict Long-Only Weight Validation (C7.4-R2)**: Rejects negative, NaN, and non-sum-to-1 weights.
30. **`HIGH_POSITIVE_CORRELATION` & `CRITICAL_POSITIVE_CORRELATION` Diagnostics**: Triggered for $\rho \ge 0.70$ and $\ge 0.85$.
31. **`STRONG_NEGATIVE_CORRELATION` Diagnostic**: Triggered for $\rho \le -0.70$ as a diversification relationship (not concentration risk).
32. **`HIGH_PORTFOLIO_AVERAGE_CORRELATION` Diagnostic**: Triggered when $\bar{\rho}_p \ge 0.65$.
33. **`DOMINANT_RISK_FACTOR_CONCENTRATION` Diagnostic**: Triggered when $PC_1 \ge 0.60$.

### Group 6: Determinism, Quality, AST Scan & Read-Only Safety (Tests 34–40)
34. **Mandatory Deterministic `asOfDate`**: Missing or invalid `asOfDate` throws explicit error.
35. **AST Wall-Clock Scan**: 0 `Date.now()` and 0 argument-less `new Date()` in `correlationEngine.js`.
36. **Asynchronous Date Synchronization Intersection**: Correct time grid alignment without inventing data.
37. **Insufficient Observation Boundary ($T < 20$)**: Returns `INSUFFICIENT_HISTORY` with safe nulls.
38. **Deep 5-Store Read-Only Safety Guard**: Verified 100% zero state mutations across all 5 stores.
39. **Deterministic Output Repeatability**: Identical inputs yield byte-equivalent DTO outputs.
40. **Full Master System Regression Preservation**: 343/343 previous system tests pass with zero regressions.

---

## 5. Repository Boundary & Implementation Gate Status

- **Certified Baseline**: [`4f541b6`](https://github.com/Nreddy2020/finapp-mobile/commit/4f541b6) (Stage C.7.3 Master Certified).
- **Files Modified in this step**:
  - `docs/C7_4_ARCHITECTURE_PLAN.md` (MODIFIED)
  - `docs/AI_PROJECT_STATE.md` (MODIFIED)
- **Implementation Files Created**: **0** 🔒 (Zero-Code Gate Active).
- **Frozen Financial Engines Modified**: **0** 🔒 (`services/` diff is 100% clean).
