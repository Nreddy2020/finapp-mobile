# FinLife Mobile (Fintech Super App)

A comprehensive, offline-first personal finance, investment, and lifestyle management mobile application built with React Native and Expo. FinLife goes beyond standard expense tracking to provide an end-to-end financial operating system covering daily cash flow, enterprise-grade investment ledger accounting, asset management, debt optimization, and career tools.

---

## 🚀 Key Modules & Capabilities

### 1. Core Cash Flow & Money Management
- **Smart Transactions & Categorization**: Track daily income and expenses with automatic classification.
- **Budgeting Engine**: Category-level monthly spending limits with real-time visual pacing and alerts.
- **Savings Goals**: Milestone-based goal tracking (e.g., Emergency Fund, House Down Payment) with automated progress pacing.
- **Bills, Subscriptions & EMIs**: Recurring bill scheduler, loan EMI tracking, and payment reminders.
- **Multi-Ledger Cashbooks**: Dedicated sub-ledgers for petty cash, business cashbooks, and event expense management.

### 2. Enterprise-Grade Investment Engine (Phase C.3 & C.4)
- **Weighted Average Cost (WAC) Engine**: Exact holding cost basis tracking with fractional share support and immutability rules.
- **Double-Entry Ledger Service**: Synchronized BUY/SELL order execution linked directly to MoneyFlow accounts with atomic balance updates.
- **Market Valuation & Price Feed**: Multi-state quote lifecycle (`LIVE`, `STALE`, `UNAVAILABLE`) with automatic cost-basis fallback.
- **SIP Automation Engine**: Automated Systematic Investment Plan scheduler supporting Daily, Weekly, Monthly, and Quarterly frequencies with price-unavailable deferrals.
- **Dividends & Realization Service**: Corporate dividend distribution tracking with tax withholding isolation, avoiding double-counting in cash flow.
- **Corporate Actions Engine**: Non-cash corporate action support (Stock Splits and Bonus Share issues) with hard cost-basis invariance assertions and state-aware recovery.
- **Portfolio Analytics & P&L Engine**: Real-time valuation aggregation, point-in-time historical SELL P&L reconstruction, net economic return metrics, and quote reliability coverage tracking.

### 3. Assets, Liabilities & Net Worth
- **Real Estate & Property Management**: Track properties, purchase costs, rental yields, and current valuations.
- **Loan & Debt Optimizer**: Loan amortization schedules and debt payoff strategies (Snowball vs. Avalanche).
- **P2P Lending Tracker**: Informal borrower/lender loan tracking with repayment milestones.
- **Consolidated Net Worth**: Real-time aggregation of all liquid cash, investments, properties, and outstanding liabilities.

### 4. Lifestyle & Productivity Tools
- **Family & Group Expenses**: Shared bill splitting and family budget allocation.
- **Business CRM & Sales**: Daily Kirana/retail and service sales tracking with revenue metrics.
- **Hostel & Rental Accommodation**: Bed occupancy, tenant management, and rent tracking.
- **Career & Education Hub**: Skill gap analysis, course tracking, and financial literacy guides.

---

## 🛠 Tech Stack

- **Core Framework**: React Native (Expo SDK 54 / Expo Router v6)
- **Language**: JavaScript (ES6+ / Node.js 20 LTS)
- **Styling**: NativeWind (TailwindCSS v3) & Expo Linear Gradient
- **Icons**: Lucide React Native
- **Storage Layer**: `@react-native-async-storage/async-storage` (Offline-first architecture)
- **Charts & Visualization**: `react-native-svg` (Custom responsive SVG charts)
- **E2E & Testing**: Puppeteer, Node Test Runners, GitHub Actions CI

---

## 📂 Architecture & Directory Structure

```
fintech-mobile/
├── .github/workflows/      # GitHub Actions CI/CD workflows
├── app/                    # File-based routing & UI screens (Expo Router)
│   ├── (tabs)/             # Main tab navigation screens
│   ├── business/           # Business & retail tools
│   ├── cashbook/           # Multi-ledger cashbook views
│   └── ...                 # Feature-specific routes
├── components/             # Reusable UI components
│   ├── ui/                 # Core design system (LuxuryCard, AnimatedScreen)
│   └── charts/             # Custom SVG charts
├── services/               # Core Domain, Ledger & Storage Engines
│   ├── storage.js          # Unified AsyncStorage persistence layer
│   ├── moneyFlowEngine.js  # Cash flow & account balance engine
│   ├── investingEngine.js  # Pure investment mathematics & WAC calculations
│   ├── investingLedgerService.js          # Order execution & MoneyFlow linkage
│   ├── marketDataService.js               # Price feed abstraction & quote caching
│   ├── sipEngine.js                       # SIP automation & scheduling engine
│   ├── investingRealizationService.js     # Dividends, standalone fees & taxes
│   ├── investingCorporateActionsService.js# Stock splits & bonus share issues
│   └── investingAnalyticsEngine.js        # Portfolio valuation & P&L analytics
├── tests/                  # Automated E2E test suites
│   └── e2e/                # Headless Puppeteer E2E tests for CI
└── scripts/                # Verification, seeding & utility scripts
```

---

## 🏃‍♂️ Getting Started

### 1. Prerequisites
- Node.js (v20 or newer)
- npm or yarn
- Expo Go app on mobile (or Android/iOS emulator)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Nreddy2020/finapp-mobile.git
cd finapp-mobile

# Install dependencies
npm install
```

### 3. Running Locally
```bash
# Start Expo development server
npm run start

# Launch on specific targets
npm run android   # Android emulator / connected device
npm run ios       # iOS simulator (macOS only)
npm run web       # Local web browser view
```

### 4. Running Automated Tests & CI
```bash
# Run Headless E2E Test Suite
npm run test:e2e-ci

# Type checking
npm run type-check
```

---

## 🔒 Branch & Quality Protocol

- **`main`**: Protected production baseline containing certified releases.
- **`fintech-using-chatgpt`**: Active development and stage implementation branch.
- **Zero-Code Gate & Contract Freezing**: Core domain engines (WAC, Ledger, Realization, Analytics) enforce strict financial invariants, finite numerical validations, and non-double-counting accounting rules.

---

## 📄 License

Private repository — All rights reserved.
