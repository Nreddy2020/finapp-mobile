# Stage C.7.2 Architecture Plan: Concentration & Diversification Diagnostics Engine

**Stage**: C.7.2  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Status**: ARCHITECTURE PLANNING (Zero-Code Gate Active 🔒)  
**Certified Baseline**: [`d80af93`](https://github.com/Nreddy2020/finapp-mobile/commit/d80af93)  
**Author**: Antigravity AI & System Architect  

---

## 1. Problem Statement & Scope

### 1.1 Objective
While Stage C.4.2 computed simple portfolio asset-class weights and top-1/3/5 metrics, **Stage C.7.2 (Concentration & Diversification Diagnostics Engine)** elevates this into an institutional-grade diagnostic service (`services/concentrationEngine.js`). It quantitatively assesses concentration risk, constituent breadth, informational entropy, and generates auditable warnings for over-concentrated capital allocations.

### 1.2 Mathematical Specifications

#### A. Dual-Level Herfindahl-Hirschman Index (HHI):
1. **Asset-Class HHI**:
   $$\text{HHI}_{\text{class}} = \sum_{c=1}^{8} w_c^2 \times 10,000 \quad \text{where } w_c = \frac{V_c}{V_{\text{total}}}$$
2. **Individual Holding HHI**:
   $$\text{HHI}_{\text{holding}} = \sum_{i=1}^{N} w_i^2 \times 10,000 \quad \text{where } w_i = \frac{V_i}{V_{\text{total}}}$$
3. **Normalized HHI ($HHI^* \in [0, 100]$)**:
   $$HHI^* = \begin{cases} 0 & \text{if } N \le 1 \\ \max\left(0, \min\left(100, \frac{\text{HHI}_{\text{holding}} - \frac{10,000}{N}}{10,000 - \frac{10,000}{N}} \times 100\right)\right) & \text{if } N > 1 \end{cases}$$

#### B. Top-k Concentration Ratios ($Top_1, Top_3, Top_5$):
Sort holdings descendingly by market value $V_{(1)} \ge V_{(2)} \ge \dots \ge V_{(N)}$:
$$\text{Top}_1 = w_{(1)}, \quad \text{Top}_3 = \sum_{i=1}^{\min(3, N)} w_{(i)}, \quad \text{Top}_5 = \sum_{i=1}^{\min(5, N)} w_{(i)}$$

#### C. Effective Number of Constituents ($N_{\text{eff}}$):
Quantifies the effective number of equal-sized holdings comprising the portfolio:
$$N_{\text{eff}} = \frac{1}{\sum_{i=1}^{N} w_i^2} = \frac{10,000}{\text{HHI}_{\text{holding}}}$$
- For a portfolio of $N$ equal holdings ($w_i = 1/N$), $N_{\text{eff}} = N$.
- For a 100-holding portfolio where 1 holding dominates 90% ($w_1 = 0.9, w_{2..100} \approx 0.001$), $N_{\text{eff}} \approx 1.23$.

#### D. Shannon Entropy & Diversification Ratio ($H_{\text{entropy}}, DR$):
Measures allocation dispersion and disorder:
$$H_{\text{entropy}} = - \sum_{i=1}^{N} w_i \ln(w_i) \quad (\text{with } 0 \ln(0) = 0)$$
$$\text{Exponential Entropy } E_{\text{eff}} = \exp(H_{\text{entropy}})$$
$$\text{Normalized Diversification Ratio } DR = \begin{cases} 0 & \text{if } N \le 1 \\ \frac{H_{\text{entropy}}}{\ln(N)} & \text{if } N > 1 \end{cases} \quad (0 \le DR \le 1.0)$$

#### E. Concentration Risk Tiering & Diagnostic Warning Rules:
- **Concentration Tiers**:
  - `BALANCED`: $\text{HHI}_{\text{holding}} \le 1500 \land Top_1 \le 0.20$
  - `MODERATE`: $1500 < \text{HHI}_{\text{holding}} \le 3000 \lor (0.20 < Top_1 \le 0.35)$
  - `HIGH`: $3000 < \text{HHI}_{\text{holding}} \le 5000 \lor (0.35 < Top_1 \le 0.50)$
  - `CRITICAL`: $\text{HHI}_{\text{holding}} > 5000 \lor Top_1 > 0.50$
- **Diagnostic Warning Flags**:
  - `CRITICAL_SINGLE_HOLDING`: Single holding $w_{(1)} > 35\%$
  - `HIGH_TOP3_CONCENTRATION`: $Top_3 > 60\%$
  - `SPECULATIVE_ASSET_OVERWEIGHT`: Crypto allocation $> 15\%$
  - `EQUITY_DOMINANCE`: Stock + Equity MF $+ \text{Equity ETF} > 80\%$
  - `UNDER_DIVERSIFIED_PORTFOLIO`: $N_{\text{eff}} < 3.0$ (when $N \ge 5$)

---

## 2. Data Contract & DTO Schema

```javascript
/**
 * Canonical Concentration Risk Diagnostics DTO
 */
export const ConcentrationDiagnosticsSchema = {
    portfolioId: 'STRING_OR_NULL',
    asOfDate: 'ISO_DATE_STRING', // Mandatory deterministic cutoff
    totalMarketValue: 'FINITE_NUMBER',
    holdingCount: 'INTEGER',
    
    // HHI Metrics
    assetClassHHI: 'FINITE_NUMBER',      // [0 - 10000]
    holdingHHI: 'FINITE_NUMBER',         // [0 - 10000]
    normalizedHoldingHHI: 'FINITE_NUMBER',// [0 - 100]

    // Breadth & Entropy Metrics
    effectiveConstituents: 'FINITE_NUMBER', // N_eff
    shannonEntropy: 'FINITE_NUMBER',        // H_entropy
    diversificationRatio: 'FINITE_NUMBER',  // DR [0.0 - 1.0]

    // Concentration Ratios
    top1Ratio: 'FINITE_NUMBER', // [0.0 - 1.0]
    top3Ratio: 'FINITE_NUMBER',
    top5Ratio: 'FINITE_NUMBER',
    
    // Breakdown Lists
    topHoldings: 'ARRAY_OF_HOLDING_WEIGHT_DTO',
    assetClassBreakdown: 'ARRAY_OF_ASSET_CLASS_WEIGHT_DTO',
    
    // Risk & Diagnostic Metadata
    riskTier: 'RiskSeverity', // 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
    warnings: 'ARRAY_OF_DIAGNOSTIC_WARNINGS',
    dataQuality: 'RiskMetricDataQualitySchema'
};
```

---

## 3. Architecture Boundary & Invariants

1. **Mandatory `asOfDate`**:
   - Strictly required on all evaluation entry points. Zero `Date.now()` or argument-less `new Date()`.
2. **Strict Zero-Mutation Boundary**:
   - 100% read-only diagnostic service.
3. **Pure Composition Over Certified C.4**:
   - Reuses `InvestingAnalyticsEngine.calculateValuation(...)` and `loadHoldings()`. Zero recalculation of market prices or holdings WAC.
4. **Degraded Data Handling**:
   - For empty portfolios ($N = 0$) or zero market value, gracefully returns finite zeros, `riskTier: 'LOW'`, and empty arrays without `NaN` or crashes.

---

## 4. Planned Files for Stage C.7.2

- `services/concentrationEngine.js` (NEW: Concentration & Diversification Diagnostics Engine)
- `tests/test_c72.mjs` (NEW: 20-Point Automated Acceptance Suite)
- `docs/C7_2_ARCHITECTURE_PLAN.md` (NEW)
- `docs/C7_2_CONSOLIDATED_AUDIT_REPORT.md` (NEW)

---

## 5. Zero-Code Gate Verification Checklist for Stage C.7.2

- [x] Zero implementation files created for C.7.2 until gate approval.
- [x] Certified baseline locked at commit [`d80af93`](https://github.com/Nreddy2020/finapp-mobile/commit/d80af93).
- [x] All 275 existing tests preserved with 100% pass rate.
