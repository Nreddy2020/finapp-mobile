# Fintech Mobile App

A comprehensive, offline-first personal finance and lifestyle management application built with React Native (Expo). This app goes beyond simple expense tracking to cover every aspect of a user's financial life, from daily budgeting to long-term wealth planning, career growth, and education.

## 🚀 Features Overview

The application is structured into 13 major feature batches, providing a holistic "Super App" experience.

### 1. Core Financials
-   **Income & Expenses**: Track daily transactions with smart categorization.
-   **Budgets**: Set monthly limits per category with visual progress bars.
-   **Savings Goals**: Create and track goals (e.g., "New Car", "Vacation") with auto-progress calculation.
-   **Bills & EMIs**: Manage recurring payments, loan EMIs, and utility bills with due date tracking.
-   **Cashbooks**: Manage multiple ledgers for petty cash or specific events.

### 2. Assets & Liabilities
-   **Properties**: Track real estate assets, valuation, and rental income.
-   **Investments**: Manage portfolio (Stocks, Mutual Funds, Gold) with ROI tracking.
-   **Loans**: Track borrowed money, interest rates, and repayment schedules.
-   **Net Worth**: Real-time aggregation of all Assets - Liabilities.

### 3. Life & Lifestyle
-   **Family Expenses**: Split bills, manage family member profiles, and track shared costs.
-   **Career Growth**: Resume builder, skill gap analysis, and career goal tracking.
-   **Education Hub**: Track courses, certifications, and financial literacy progress.
-   **Wellness**: Basic health tracking integration (placeholder for future expansion).
-   **Time Management**: Productivity tools and daily planners.

### 4. Business & Advanced Tools
-   **Business Tools**: Retail/Service daily sales tracker with inventory basics.
-   **Debt Calculator**: Simulate payoff strategies (Snowball vs. Avalanche).
-   **Emergency Fund**: Calculate and track 6-month survival runway.
-   **Income Calendar**: Visual tracker for daily gig/freelance income.
-   **Fee Planner**: School/College fee schedule management.

### 5. Utilities & Intelligence
-   **Reports & Analytics**: Comprehensive dashboard with Income vs Expense charts, Category breakdowns, and Financial Health Score.
-   **Pending Tracker**: Track informal debts (IOUs) - "To Collect" and "To Pay".
-   **Notifications**: Local system for reminders and alerts.
-   **Feedback**: Built-in user feedback mechanism.

## 🛠 Tech Stack

-   **Framework**: React Native (Expo Router)
-   **Styling**: NativeWind (TailwindCSS) + Expo Linear Gradient
-   **Icons**: Lucide React Native
-   **Persistence**: `@react-native-async-storage/async-storage` (Offline-first)
-   **Charts**: `react-native-svg` (Custom implementations)
-   **Navigation**: File-based routing (Expo Router)

## 📂 Project Structure

```
fintech-mobile/
├── app/                    # Screens & Routes (Expo Router)
│   ├── (tabs)/             # Main Tab Navigation
│   ├── business/           # Business Sub-modules
│   ├── cashbook/           # Cashbook Detail Views
│   ├── ...                 # Individual feature screens
├── components/             # Reusable UI Components
│   ├── ui/                 # Core Design System (LuxuryCard, AnimatedScreen)
│   ├── charts/             # Custom SVG Charts
│   ├── ...                 # Feature-specific components
├── services/               # Logic & Persistence Layer
│   ├── storage.js          # AsyncStorage Wrapper
│   ├── [feature].js        # Feature-specific services
├── constants/              # Theme & Config
├── assets/                 # Images & Fonts
```

## 🏃‍♂️ How to Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Development Server**:
    ```bash
    npx expo start
    ```

3.  **Run on Device/Emulator**:
    -   Scan QR code with Expo Go (Android/iOS).
    -   Press `a` for Android Emulator.
    -   Press `i` for iOS Simulator.
    -   Press `w` for Web (limited functionality compared to mobile).

## 💾 Data Persistence

The app uses a **Service-Layer Architecture** to decouple UI from data storage. All data is persisted locally using `AsyncStorage`.
-   **Storage Service**: `services/storage.js` handles raw JSON serialization/encryption.
-   **Feature Services**: Each module (e.g., `services/income.js`) handles business logic and calls Storage Service.

## 🎨 Design System

The app features a **"Luxury Fintech"** aesthetic:
-   **Dark Mode First**: Deep blacks and dark greys (`#000000`, `#18181B`).
-   **Gradients**: Subtle linear gradients for depth.
-   **Motion**: `AnimatedScreen` wrapper for smooth entry animations.
-   **Cards**: `LuxuryCard` component with glassmorphism effects and glow.

## 🤝 Contribution

This project is a comprehensive prototype. Future enhancements could include:
-   Cloud Sync (Supabase/Firebase).
-   Bank API Integration (Account Aggregator).
-   AI Financial Advisor.

---
*Built with ❤️ by Antigravity*
