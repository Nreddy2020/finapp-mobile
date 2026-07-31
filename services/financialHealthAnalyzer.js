// Smart Financial Health Analyzer Engine
// Automatically analyzes existing data without asking questions
import api, { getExpenses, getIncome, getLoans, getSavingsGoals, getBillReminders } from './api';

class FinancialHealthAnalyzer {
    constructor() {
        this.crisisThresholds = {
            critical: { dti: 50, deficit_ratio: 1.2, emergency_days: 10 },
            warning: { dti: 35, deficit_ratio: 1.0, emergency_days: 30 },
            caution: { dti: 20, deficit_ratio: 0.9, emergency_days: 60 }
        };
    }

    // Main analysis function - NO questions asked!
    async analyzeFinancialHealth(userId) {
        try {
            // Fetch all existing data
            const data = await this.fetchUserData(userId);

            // Calculate key metrics
            const metrics = this.calculateMetrics(data);

            // Detect crisis level
            const crisisLevel = this.detectCrisisLevel(metrics);

            // Identify specific problems
            const problems = this.identifyProblems(metrics);

            // Generate actionable solutions
            const solutions = this.generateSolutions(problems, metrics);

            // Calculate confidence score
            const confidence = this.calculateConfidence(data);

            return {
                score: this.calculateHealthScore(metrics),
                level: crisisLevel,
                metrics,
                problems,
                solutions,
                confidence,
                analyzed_at: new Date().toISOString(),
                data_period: `${data.days_of_data} days`
            };
        } catch (error) {
            console.error('Analysis error:', error);
            return this.getQuickStartAnalysis();
        }
    }

    async fetchUserData(userId) {
        // Fetch from all sources
        const [transactions, emis, bills, income, emergencyFund] = await Promise.all([
            this.getTransactions(userId, 30), // Last 30 days
            this.getEMIs(userId),
            this.getBills(userId),
            this.getIncome(userId, 30),
            this.getEmergencyFund(userId)
        ]);

        return {
            transactions,
            emis,
            bills,
            income,
            emergencyFund,
            days_of_data: 30
        };
    }

    calculateMetrics(data) {
        // Income metrics
        const totalIncome = data.income.reduce((sum, i) => sum + i.amount, 0);
        const avgMonthlyIncome = totalIncome / (data.days_of_data / 30);

        // Expense metrics
        const totalExpenses = data.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        const avgMonthlyExpenses = totalExpenses / (data.days_of_data / 30);

        // EMI metrics
        const totalMonthlyEMI = data.emis.reduce((sum, e) => sum + e.monthly_amount, 0);
        const dtiRatio = (totalMonthlyEMI / avgMonthlyIncome) * 100;

        // Emergency fund
        const emergencyFund = data.emergencyFund?.current_amount || 0;
        const monthlyExpenseAvg = avgMonthlyExpenses;
        const daysCovered = (emergencyFund / (monthlyExpenseAvg / 30));

        // Deficit
        const monthlyDeficit = avgMonthlyExpenses - avgMonthlyIncome;
        const deficitRatio = avgMonthlyExpenses / avgMonthlyIncome;

        // Category breakdown
        const categoryExpenses = this.groupByCategory(data.transactions);
        const topCategories = Object.entries(categoryExpenses)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: (amount / totalExpenses) * 100
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        return {
            avgMonthlyIncome,
            avgMonthlyExpenses,
            totalMonthlyEMI,
            dtiRatio,
            emergencyFund,
            daysCovered,
            monthlyDeficit,
            deficitRatio,
            topCategories,
            totalIncome,
            totalExpenses
        };
    }

    detectCrisisLevel(metrics) {
        const { dtiRatio, deficitRatio, daysCovered } = metrics;
        const { critical, warning, caution } = this.crisisThresholds;

        // Critical: Multiple danger signals
        if (dtiRatio >= critical.dti ||
            deficitRatio >= critical.deficit_ratio ||
            daysCovered <= critical.emergency_days) {
            return 'critical';
        }

        // Warning: Some danger signals
        if (dtiRatio >= warning.dti ||
            deficitRatio >= warning.deficit_ratio ||
            daysCovered <= warning.emergency_days) {
            return 'warning';
        }

        // Caution: Minor concerns
        if (dtiRatio >= caution.dti ||
            deficitRatio >= caution.deficit_ratio ||
            daysCovered <= caution.emergency_days) {
            return 'caution';
        }

        return 'good';
    }

    identifyProblems(metrics) {
        const problems = [];

        // Problem 1: Debt Trap
        if (metrics.dtiRatio > 50) {
            problems.push({
                type: 'debt_trap',
                severity: 'critical',
                title: 'Debt Trap Danger',
                message: `${Math.round(metrics.dtiRatio)}% of income goes to debt`,
                impact: 'You may not have enough for essentials like food and medicine',
                detected_from: 'EMI analysis',
                metric_value: metrics.dtiRatio,
                threshold: 50
            });
        } else if (metrics.dtiRatio > 35) {
            problems.push({
                type: 'high_debt',
                severity: 'warning',
                title: 'High Debt Load',
                message: `${Math.round(metrics.dtiRatio)}% of income goes to debt`,
                impact: 'Limited flexibility for emergencies',
                detected_from: 'EMI analysis',
                metric_value: metrics.dtiRatio,
                threshold: 35
            });
        }

        // Problem 2: Overspending
        if (metrics.monthlyDeficit > 0) {
            problems.push({
                type: 'overspending',
                severity: 'critical',
                title: 'Spending More Than Earning',
                message: `Spending ₹${Math.round(metrics.monthlyDeficit).toLocaleString('en-IN')} more than earning`,
                impact: 'Debt increasing every month',
                detected_from: 'Transaction analysis',
                metric_value: metrics.monthlyDeficit,
                threshold: 0
            });
        }

        // Problem 3: No Emergency Fund
        if (metrics.daysCovered < 30) {
            problems.push({
                type: 'no_emergency_fund',
                severity: metrics.daysCovered < 10 ? 'critical' : 'warning',
                title: 'Insufficient Emergency Fund',
                message: `Only ${Math.round(metrics.daysCovered)} days of emergency fund`,
                impact: 'One emergency away from financial crisis',
                detected_from: 'Emergency fund check',
                metric_value: metrics.daysCovered,
                threshold: 90
            });
        }

        // Problem 4: High Essential Expenses
        const foodExpense = metrics.topCategories.find(c => c.category === 'Food');
        const medicineExpense = metrics.topCategories.find(c => c.category === 'Medicine');

        if (medicineExpense && medicineExpense.percentage > 15) {
            problems.push({
                type: 'high_medicine_cost',
                severity: 'warning',
                title: 'High Medicine Expenses',
                message: `₹${Math.round(medicineExpense.amount).toLocaleString('en-IN')}/month on medicines`,
                impact: 'Generic alternatives could save 60-80%',
                detected_from: 'Category analysis',
                metric_value: medicineExpense.amount,
                threshold: 0
            });
        }

        return problems;
    }

    generateSolutions(problems, metrics) {
        const solutions = [];

        for (const problem of problems) {
            switch (problem.type) {
                case 'debt_trap':
                case 'high_debt':
                    solutions.push({
                        id: 'refinance_debt',
                        action: 'Switch to bank loan',
                        savings: '₹18,000/year',
                        monthly_savings: 1500,
                        difficulty: 'medium',
                        timeframe: '1 week',
                        impact_score: 9,
                        steps: [
                            'Check your credit score (free on CIBIL)',
                            'Apply for bank personal loan at 14% interest',
                            'Pay off high-interest moneylender loan (36%)',
                            'Save ₹1,500/month on interest difference'
                        ],
                        requirements: ['Credit score > 650', 'Salary slip', 'Bank statements']
                    });
                    break;

                case 'overspending':
                    const topExpense = metrics.topCategories[0];
                    solutions.push({
                        id: 'cut_expenses',
                        action: `Reduce ${topExpense.category} expenses`,
                        savings: `₹${Math.round(topExpense.amount * 0.3).toLocaleString('en-IN')}/month`,
                        monthly_savings: Math.round(topExpense.amount * 0.3),
                        difficulty: 'easy',
                        timeframe: 'immediate',
                        impact_score: 7,
                        steps: [
                            `Current ${topExpense.category} spending: ₹${Math.round(topExpense.amount)}`,
                            `Target: Reduce by 30% = ₹${Math.round(topExpense.amount * 0.7)}`,
                            'Cook at home instead of ordering',
                            'Use public transport instead of cabs'
                        ],
                        requirements: ['Discipline', 'Planning']
                    });
                    break;

                case 'no_emergency_fund':
                    const targetFund = metrics.avgMonthlyExpenses * 3;
                    solutions.push({
                        id: 'build_emergency_fund',
                        action: 'Start emergency fund',
                        savings: `Build ₹${Math.round(targetFund).toLocaleString('en-IN')} in 12 months`,
                        monthly_savings: Math.round(targetFund / 12),
                        difficulty: 'easy',
                        timeframe: '12 months',
                        impact_score: 8,
                        steps: [
                            `Save ₹${Math.round(targetFund / 12)}/month`,
                            'Use round-up savings feature',
                            'Add festival bonuses to fund',
                            'Reach 3-month expense coverage'
                        ],
                        requirements: ['Consistent savings', 'Discipline']
                    });
                    break;

                case 'high_medicine_cost':
                    const medicineSavings = problem.metric_value * 0.7;
                    solutions.push({
                        id: 'generic_medicines',
                        action: 'Switch to generic medicines',
                        savings: `₹${Math.round(medicineSavings).toLocaleString('en-IN')}/month`,
                        monthly_savings: Math.round(medicineSavings),
                        difficulty: 'easy',
                        timeframe: 'immediate',
                        impact_score: 8,
                        steps: [
                            'Ask doctor for generic prescriptions',
                            'Compare prices at 3 pharmacies',
                            'Buy generic versions (same composition)',
                            'Save 60-80% on medicine costs'
                        ],
                        requirements: ['Doctor consultation', 'Pharmacy comparison']
                    });
                    break;
            }
        }

        // Sort by impact score
        return solutions.sort((a, b) => b.impact_score - a.impact_score);
    }

    calculateHealthScore(metrics) {
        let score = 100;

        // Deduct for DTI ratio
        if (metrics.dtiRatio > 50) score -= 30;
        else if (metrics.dtiRatio > 35) score -= 20;
        else if (metrics.dtiRatio > 20) score -= 10;

        // Deduct for deficit
        if (metrics.deficitRatio > 1.2) score -= 25;
        else if (metrics.deficitRatio > 1.0) score -= 15;
        else if (metrics.deficitRatio > 0.9) score -= 5;

        // Deduct for emergency fund
        if (metrics.daysCovered < 10) score -= 25;
        else if (metrics.daysCovered < 30) score -= 15;
        else if (metrics.daysCovered < 60) score -= 5;

        // Add bonus for savings
        if (metrics.monthlyDeficit < 0) score += 10; // Saving money

        return Math.max(0, Math.min(100, score));
    }

    calculateConfidence(data) {
        // More data = higher confidence
        const daysOfData = data.days_of_data;
        const transactionCount = data.transactions.length;

        let confidence = 50; // Base confidence

        // Add for days of data
        if (daysOfData >= 90) confidence += 30;
        else if (daysOfData >= 60) confidence += 20;
        else if (daysOfData >= 30) confidence += 15;
        else confidence += 5;

        // Add for transaction count
        if (transactionCount >= 100) confidence += 20;
        else if (transactionCount >= 50) confidence += 15;
        else if (transactionCount >= 20) confidence += 10;
        else confidence += 5;

        return Math.min(100, confidence);
    }

    groupByCategory(transactions) {
        return transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {});
    }

    // Quick start for new users (no data yet)
    getQuickStartAnalysis() {
        return {
            score: 50,
            level: 'unknown',
            metrics: null,
            problems: [],
            solutions: [],
            confidence: 0,
            quick_start: true,
            message: 'Add your income and expenses to get personalized analysis'
        };
    }

    // Implement actual data fetching via centralized API
    async getTransactions(userId, days) {
        try {
            const [expenses, income] = await Promise.all([
                getExpenses(),
                getIncome()
            ]);

            // Normalize and Combine
            const expenseItems = expenses.map(e => ({ ...e, type: 'expense' }));
            const incomeItems = income.map(i => ({ ...i, type: 'income' }));

            return [...expenseItems, ...incomeItems];
        } catch (e) {
            console.warn('Error fetching transactions for analysis:', e);
            return [];
        }
    }

    async getEMIs(userId) {
        try {
            const loans = await getLoans();
            // Map loans to EMI objects if needed, or just return loans that have emi_amount
            return loans.map(l => ({
                monthly_amount: l.emi_amount || 0,
                ...l
            }));
        } catch (e) {
            return [];
        }
    }

    async getBills(userId) {
        try {
            return await getBillReminders();
        } catch (e) {
            return [];
        }
    }

    async getIncome(userId, days) {
        try {
            const income = await getIncome();
            // Ensure they have amount property
            return income;
        } catch (e) {
            return [];
        }
    }

    async getEmergencyFund(userId) {
        try {
            const savings = await getSavingsGoals();
            const emergencyGoal = savings.find(s => s.title.toLowerCase().includes('emergency'));

            if (emergencyGoal) {
                return { current_amount: emergencyGoal.saved };
            }

            // If no specific goal, sum up all savings as a proxy? 
            // Or just return 0 to trigger the "No Emergency Fund" warning which is useful.
            const totalSaved = savings.reduce((sum, s) => sum + (s.saved || 0), 0);
            return { current_amount: totalSaved };
        } catch (e) {
            return { current_amount: 0 };
        }
    }
}

export default new FinancialHealthAnalyzer();
