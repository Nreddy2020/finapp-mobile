# Stage C.7.4 Architecture Plan: Correlation, Covariance & Cross-Asset Risk Engine

**Stage**: C.7.4  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Status**: ARCHITECTURE PROPOSED — ZERO-CODE GATE ACTIVE 🔒  
**Certified Baseline**: [`4f541b6`](https://github.com/Nreddy2020/finapp-mobile/commit/4f541b6) (Stage C.7.3 Master Certified)  
**Branch**: `fintech-using-chatgpt`  
**Author**: Antigravity AI & Quantitative Risk Systems Architect  

---

## 1. Executive Summary & Problem Statement

### 1.1 Objective
While Stage C.7.2 established concentration/diversification (HHI, entropy) and Stage C.7.3 calculated univariate volatility, drawdown, and VaR/CVaR, **Stage C.7.4 (Correlation, Covariance & Cross-Asset Risk Engine)** creates the analytical multivariate dependency engine (`services/correlationEngine.js`).

It provides mathematically rigorous, deterministic, and auditable cross-asset risk diagnostics:
1. **Pairwise Sample Covariance Matrix ($\mathbf{\Sigma}$)**: Sample covariance of synchronized return series with Bessel's correction $N-1$ and frequency annualization.
2. **Pearson Correlation Matrix ($\mathbf{R}$)**: Normalized linear dependency matrix ($\rho_{ij} \in [-1, 1]$) with strict zero-variance protection.
3. **Portfolio-Weighted Average Correlation ($\bar{\rho}_p$)**: Off-diagonal diversification density index.
4. **Diversification Ratio ($DR_{\text{corr}}$) & Volatility Reduction Multiplier**: Ratio of weighted constituent volatilities to total portfolio volatility ($\frac{\sum w_i \sigma_i}{\sqrt{\mathbf{w}^T \mathbf{\Sigma} \mathbf{w}}}$).
5. **Principal Component Analysis (PCA) & Risk Factor Concentration**:
   - Eigenvalue decomposition of the correlation matrix ($\mathbf{R} = \mathbf{V} \mathbf{\Lambda} \mathbf{V}^T$).
   - Proportion of variance explained by Top-1, Top-2, Top-3 eigenvalues.
   - Effective Number of Independent Risk Factors ($N_{\text{factors}} = \frac{(\sum \lambda_i)^2}{\sum \lambda_i^2} = \frac{N^2}{\sum \lambda_i^2}$).
6. **Cross-Asset Class & Cluster Correlation**: Aggregated 8-class correlation matrix across canonical C.7.1 asset classes.

### 1.2 Non-Goals & Invariants
- ❌ **No UI Development**: Pure analytical calculation engine. UI visualizers will be developed in Stage C.7.8.
- ❌ **No Modification of Certified Engines**: Zero edits to `investingAnalyticsEngine.js`, `targetAllocationService.js`, `rebalancingEngine.js`, `taxOptimizedRebalancingService.js`, `riskTaxonomy.js`, `concentrationEngine.js`, or `volatilityDrawdownEngine.js`.
- ❌ **Zero State Mutation**: 100% read-only diagnostic service. Does not mutate or persist any store data.
- ❌ **Zero Manufactured Returns**: Missing return timestamps are strictly intersected across constituents without interpolating or inventing fake returns.
- ❌ **Zero Wall-Clock Dependencies**: Mandatory `asOfDate` on every public API entry point. Zero `Date.now()` or argument-less `new Date()`.

---

## 2. Mathematical Specifications & Core Contracts

### 2.1 Return Series Synchronization & Intersection Contract

For a portfolio of $N$ holdings with return series $\{ r_{i, t} \}$ for $i \in [1, N]$:
1. **Synchronized Time Grid ($\mathcal{T}_{\text{sync}}$)**:
   $$\mathcal{T}_{\text{sync}} = \bigcap_{i=1}^N \{ t \le \text{asOfDate} \mid r_{i,t} \text{ exists and is finite} \}$$
   Let $T = |\mathcal{T}_{\text{sync}}|$ be the count of synchronized periodic observations.
2. **Observation Thresholds**:
   - Minimum synchronized observations: $T \ge 20$.
   - If $T < 20$: Status is `INSUFFICIENT_HISTORY`, confidence is `UNAVAILABLE`, all matrix outputs return `null`.
   - Recommended observations for full matrix stability: $T \ge 60$.

---

### 2.2 Covariance & Correlation Matrix Formulation

#### A. Sample Covariance Matrix ($\mathbf{\Sigma} \in \mathbb{R}^{N \times N}$)
For holdings $i, j \in [1, N]$:
$$\bar{r}_i = \frac{1}{T} \sum_{t=1}^T r_{i,t}$$
$$\text{Cov}(r_i, r_j) = \frac{1}{T-1} \sum_{t=1}^T (r_{i,t} - \bar{r}_i)(r_{j,t} - \bar{r}_j)$$
$$\mathbf{\Sigma}_{ij}^{\text{ann}} = \text{Cov}(r_i, r_j) \cdot F$$
where $F \in \{252, 52, 12\}$ is the frequency annualization factor.

#### B. Pearson Correlation Matrix ($\mathbf{R} \in \mathbb{R}^{N \times N}$)
$$\mathbf{R}_{ij} = \begin{cases}
1.0 & \text{if } i = j \\
0.0 & \text{if } \sigma_i = 0 \text{ or } \sigma_j = 0 \quad (\text{zero-variance cash/stable asset guard}) \\
\text{clamp}\left(\frac{\text{Cov}(r_i, r_j)}{\sigma_i \sigma_j}, -1.0, 1.0\right) & \text{otherwise}
\end{cases}$$
where $\sigma_i = \sqrt{\text{Cov}(r_i, r_i)}$.

---

### 2.3 Portfolio-Weighted Diversification Metrics

Given portfolio normalized weights $\mathbf{w} = [w_1, w_2, \dots, w_N]^T$ ($\sum w_i = 1.0$):

1. **Portfolio Variance & Volatility from Covariance**:
   $$\sigma_p^2 = \mathbf{w}^T \mathbf{\Sigma}^{\text{ann}} \mathbf{w} = \sum_{i=1}^N \sum_{j=1}^N w_i w_j \mathbf{\Sigma}_{ij}^{\text{ann}}$$
   $$\sigma_p = \sqrt{\max(0, \sigma_p^2)}$$
2. **Weighted Constituent Volatility ($\sigma_{\text{weighted}}$)**:
   $$\sigma_{\text{weighted}} = \sum_{i=1}^N w_i \sigma_{i,\text{ann}}$$
3. **Diversification Ratio ($DR_{\text{corr}}$)**:
   $$DR_{\text{corr}} = \begin{cases}
   1.0 & \text{if } \sigma_p = 0 \text{ or } N = 1 \\
   \frac{\sigma_{\text{weighted}}}{\sigma_p} & \text{otherwise}
   \end{cases}$$
   - When all assets are perfectly correlated ($\rho_{ij} = 1.0$), $DR = 1.0$ (no diversification).
   - When assets are uncorrelated or negatively correlated, $DR > 1.0$.
4. **Diversification Benefit Multiplier ($DBM$)**:
   $$DBM = \begin{cases}
   0.0 & \text{if } \sigma_{\text{weighted}} = 0 \\
   \max\left(0, 1.0 - \frac{\sigma_p}{\sigma_{\text{weighted}}}\right) & \text{otherwise}
   \end{cases} \quad \in [0.0, 1.0)$$
5. **Weighted Average Off-Diagonal Correlation ($\bar{\rho}_p$)**:
   $$\bar{\rho}_p = \begin{cases}
   1.0 & \text{if } N = 1 \text{ or } \sum_{i \ne j} w_i w_j = 0 \\
   \frac{\sum_{i=1}^N \sum_{j \ne i} w_i w_j \mathbf{R}_{ij}}{\sum_{i=1}^N \sum_{j \ne i} w_i w_j} = \frac{\mathbf{w}^T \mathbf{R} \mathbf{w} - \sum w_i^2}{1 - \sum w_i^2} & \text{otherwise}
   \end{cases}$$

---

### 2.4 Principal Component Analysis (PCA) & Factor Concentration

#### A. Eigenvalue Decomposition of $\mathbf{R}$
Solve $\mathbf{R} \mathbf{v}_k = \lambda_k \mathbf{v}_k$ with eigenvalues sorted descendingly:
$$\lambda_1 \ge \lambda_2 \ge \dots \ge \lambda_N \ge 0, \quad \sum_{k=1}^N \lambda_k = N$$

#### B. Variance Explained Ratios ($V_k$)
$$V_k = \frac{\lambda_k}{\sum_{m=1}^N \lambda_m} = \frac{\lambda_k}{N}$$
- **Top-1 Factor Concentration**: $PC_1 = \frac{\lambda_1}{N}$
- **Top-2 Cumulative Variance**: $PC_{1,2} = \frac{\lambda_1 + \lambda_2}{N}$
- **Top-3 Cumulative Variance**: $PC_{1,2,3} = \frac{\lambda_1 + \lambda_2 + \lambda_3}{N}$
- **Components for 80% Variance ($K_{80}$)**: $\min \{ K \mid \sum_{k=1}^K V_k \ge 0.80 \}$
- **Components for 90% Variance ($K_{90}$)**: $\min \{ K \mid \sum_{k=1}^K V_k \ge 0.90 \}$

#### C. Effective Number of Independent Factors ($N_{\text{factors}}$)
$$N_{\text{factors}} = \frac{\left(\sum_{k=1}^N \lambda_k\right)^2}{\sum_{k=1}^N \lambda_k^2} = \frac{N^2}{\sum_{k=1}^N \lambda_k^2} \quad \in [1.0, N]$$
- If all assets are perfectly correlated ($\lambda_1 = N, \lambda_{2\dots N} = 0$), $N_{\text{factors}} = 1.0$.
- If all assets are completely uncorrelated orthogonal assets ($\lambda_k = 1.0 \ \forall k$), $N_{\text{factors}} = N$.

#### D. Positive Semi-Definite (PSD) Repair Contract
If numerical floating-point inaccuracies produce tiny negative eigenvalues ($\lambda_k < -10^{-8}$), the spectral matrix is repaired deterministically:
$$\hat{\lambda}_k = \max(0, \lambda_k), \quad \hat{\mathbf{R}} = \mathbf{V} \text{diag}(\hat{\mathbf{\Lambda}}) \mathbf{V}^T$$
and diagonal elements are re-normalized to exactly $1.0$.

---

### 2.5 Asset-Class Level Cross-Correlation Aggregation

For the 8 canonical C.7.1 asset classes ($\text{EQUITY\_DOMESTIC}$, $\text{EQUITY\_INTERNATIONAL}$, $\text{DEBT\_FIXED\_INCOME}$, $\text{GOLD\_COMMODITIES}$, $\text{REAL\_ESTATE}$, $\text{CASH\_LIQUID}$, $\text{CRYPTO\_SPECULATIVE}$, $\text{ALTERNATIVE}$):
1. Compute asset-class weighted synthetic returns:
   $$R_{\text{class}, c, t} = \sum_{i \in \text{class } c} \frac{w_i}{W_c} r_{i,t}, \quad W_c = \sum_{i \in \text{class } c} w_i$$
2. Compute $8 \times 8$ asset-class correlation matrix $\mathbf{R}_{\text{class}}$.

---

## 3. Versioned Correlation Policy & Canonical DTO Contract

### 3.1 Versioned Policy (`C7_4_V1`)
```javascript
export const CORRELATION_POLICY_VERSION = "C7_4_V1";

export const CORRELATION_POLICY_V1 = Object.freeze({
    observationThresholds: Object.freeze({
        MIN_SYNCHRONIZED_OBSERVATIONS: 20,
        RECOMMENDED_OBSERVATIONS: 60
    }),
    warningThresholds: Object.freeze({
        HIGH_PAIRWISE_CORRELATION: 0.70,
        CRITICAL_PAIRWISE_CORRELATION: 0.85,
        HIGH_PORTFOLIO_AVERAGE_CORRELATION: 0.65,
        CRITICAL_PORTFOLIO_AVERAGE_CORRELATION: 0.80,
        LOW_DIVERSIFICATION_RATIO: 1.15,
        CRITICAL_FACTOR_CONCENTRATION_PC1: 0.60
    }),
    defaults: Object.freeze({
        frequency: 'DAILY',
        psdRepairTolerance: 1e-8
    })
});
```

### 3.2 Canonical DTO Contract
```javascript
export const CorrelationDiagnosticsSchema = {
    portfolioId: 'STRING_OR_NULL',
    asOfDate: 'ISO_DATE_STRING',
    policyVersion: 'C7_4_V1',
    status: 'CorrelationStatus', // 'HEALTHY' | 'INSUFFICIENT_HISTORY' | 'DEGRADED' | 'SINGLE_HOLDING'
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

    // Summary Dependency & Diversification Metrics
    weightedAverageCorrelation: 'FINITE_NUMBER_OR_NULL',
    diversificationRatio: 'FINITE_NUMBER_OR_NULL',
    diversificationBenefitMultiplier: 'FINITE_NUMBER_OR_NULL',
    portfolioAnnualizedVolatility: 'FINITE_NUMBER_OR_NULL',
    weightedConstituentVolatility: 'FINITE_NUMBER_OR_NULL',

    // Principal Component Analysis (PCA)
    eigenvalues: 'ARRAY_OF_NUMBERS_OR_NULL',
    varianceExplainedRatios: 'ARRAY_OF_NUMBERS_OR_NULL',
    top1FactorConcentration: 'FINITE_NUMBER_OR_NULL',
    top2CumulativeVariance: 'FINITE_NUMBER_OR_NULL',
    top3CumulativeVariance: 'FINITE_NUMBER_OR_NULL',
    componentsFor80PercentVariance: 'INTEGER_OR_NULL',
    componentsFor90PercentVariance: 'INTEGER_OR_NULL',
    effectiveFactorCount: 'FINITE_NUMBER_OR_NULL',

    // Asset-Class Correlation Matrix
    assetClasses: 'ARRAY_OF_STRINGS',
    assetClassCorrelationMatrix: 'ARRAY_OF_ARRAYS_OF_NUMBERS_OR_NULL',

    // High Correlation Pairs (for diagnostics)
    highCorrelationPairs: 'ARRAY_OF_OBJECTS', // { holdingIdA, holdingIdB, symbolA, symbolB, correlation, severity }

    // Diagnostics & Warnings
    warnings: 'ARRAY_OF_STRINGS',
    dataQuality: 'RiskMetricDataQualitySchema'
};
```

---

## 4. Acceptance Test Matrix (`tests/test_c74.mjs`)

A comprehensive **32-scenario acceptance suite** will verify all mathematical, boundary, and safety criteria:

### Group 1: Mathematical Formulation & Core Matrices (Tests 1–8)
1. **Single Holding Portfolio ($N = 1$)**: $\mathbf{R} = [[1.0]], \mathbf{\Sigma} = [[\sigma^2]], DR = 1.0, \bar{\rho}_p = 1.0, N_{\text{factors}} = 1.0$.
2. **Two Orthogonal Uncorrelated Holdings ($\rho = 0$)**: Exact $DR = \sqrt{2} \approx 1.4142, \bar{\rho}_p = 0.0, N_{\text{factors}} = 2.0$.
3. **Two Perfectly Correlated Holdings ($\rho = 1.0$)**: Exact $DR = 1.0, \bar{\rho}_p = 1.0, \lambda_1 = 2.0 (100\%), N_{\text{factors}} = 1.0$.
4. **Two Perfectly Inversely Correlated Holdings ($\rho = -1.0$)**: $\sigma_p = 0.0$ for equal weights, $DR \to \infty$ (clamped/safe handling), $\bar{\rho}_p = -1.0$.
5. **Sample Covariance Bessel's Correction ($N-1$)**: Exact mathematical match against analytical covariance.
6. **Annualized Covariance Scaling ($F = 252, 52, 12$)**: Exact scaling verified across frequencies.
7. **Pearson Correlation Normalization ($\rho \in [-1, 1]$)**: Symmetry $\mathbf{R}_{ij} = \mathbf{R}_{ji}$ and diagonal $\mathbf{R}_{ii} = 1.0$.
8. **Zero-Variance Asset Protection (Cash / Stablecoins)**: Constant return yields $\rho_{ij} = 0.0$ and $\mathbf{R}_{ii} = 1.0$ without division-by-zero or `NaN`.

### Group 2: Diversification & Weighted Metrics (Tests 9–14)
9. **Weighted Average Correlation ($\bar{\rho}_p$) Equal Weights**: Exact match against off-diagonal average.
10. **Weighted Average Correlation Non-Equal Weights**: Correct weighting by $w_i w_j$.
11. **Diversification Ratio ($DR_{\text{corr}}$) Mathematical Invariant ($DR \ge 1.0$)**: Verified across diverse synthetic portfolios.
12. **Diversification Benefit Multiplier ($DBM \in [0, 1)$)**: Exact $(1 - \sigma_p / \sigma_{\text{weighted}})$.
13. **Portfolio Volatility Reconciliation**: Confirms $\sqrt{\mathbf{w}^T \mathbf{\Sigma} \mathbf{w}}$ matches portfolio-level return standard deviation.
14. **8 Canonical Asset-Class Aggregation**: Correct decomposition into $8 \times 8$ asset-class matrix.

### Group 3: PCA & Factor Concentration (Tests 15–20)
15. **PCA Eigenvalue Sum Invariant ($\sum \lambda_k = N$)**: Trace theorem verified.
16. **Variance Explained Monotonicity**: $\lambda_1 \ge \lambda_2 \ge \dots \ge \lambda_N \ge 0$.
17. **Effective Number of Independent Factors ($N_{\text{factors}}$)**: Exact calculation across identity and singular correlation structures.
18. **$K_{80}$ and $K_{90}$ Factor Thresholds**: Accurate component counts for cumulative variance.
19. **PSD Spectral Projection Repair**: Numerical negative eigenvalue clamping and re-normalization.
20. **Deterministic Jacobi Eigen-Solver Accuracy**: Verified against known analytical matrices.

### Group 4: Warnings & Diagnostic Alerts (Tests 21–25)
21. **`HIGH_PAIRWISE_CORRELATION` Diagnostic**: Triggered when $|\rho_{ij}| \ge 0.70$.
22. **`CRITICAL_PAIRWISE_CORRELATION` Diagnostic**: Triggered when $|\rho_{ij}| \ge 0.85$.
23. **`HIGH_PORTFOLIO_AVERAGE_CORRELATION` Diagnostic**: Triggered when $\bar{\rho}_p \ge 0.65$.
24. **`LOW_DIVERSIFICATION_BENEFIT` Diagnostic**: Triggered when $DR < 1.15$ for $N \ge 3$.
25. **`DOMINANT_RISK_FACTOR_CONCENTRATION` Diagnostic**: Triggered when $PC_1 \ge 0.60$.

### Group 5: Determinism, Quality, AST Scan & Read-Only Safety (Tests 26–32)
26. **Mandatory Deterministic `asOfDate`**: Missing or invalid `asOfDate` throws explicit error.
27. **AST Wall-Clock Scan**: 0 `Date.now()` and 0 argument-less `new Date()` in `correlationEngine.js`.
28. **Asynchronous Date Synchronization Intersection**: Correct time grid alignment without inventing data.
29. **Insufficient Observation Boundary ($T < 20$)**: Returns `INSUFFICIENT_HISTORY` with safe nulls.
30. **Deep 5-Store Read-Only Safety Guard**: Verified 100% zero state mutations across all 5 stores.
31. **Deterministic Output Repeatability**: Identical inputs yield byte-equivalent DTO outputs.
32. **Full Master System Regression**: 343/343 previous system tests pass with zero regressions.

---

## 5. Repository Boundary & Implementation Gate Status

- **Certified Baseline**: [`4f541b6`](https://github.com/Nreddy2020/finapp-mobile/commit/4f541b6) (Stage C.7.3 Master Certified).
- **Files Modified in this step**:
  - `docs/C7_4_ARCHITECTURE_PLAN.md` (NEW)
  - `docs/AI_PROJECT_STATE.md` (MODIFIED)
- **Implementation Files Created**: **0** 🔒 (Zero-Code Gate Active).
- **Frozen Financial Engines Modified**: **0** 🔒 (`services/` diff is 100% clean).
