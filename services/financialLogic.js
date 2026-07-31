export const calculateMonthlyFixedCommitments = (bills, loans) => {
    // 1. Sum Unpaid Bills
    const unpaidBills = bills.filter(b => !b.paid).reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

    // 2. Sum EMIs (Assuming monthly obligation)
    const totalEMIs = loans.reduce((sum, l) => sum + (parseFloat(l.emi_amount) || parseFloat(l.outstanding_amount) * 0.01 || 0), 0);

    return unpaidBills + totalEMIs;
};

export const calculateDailySafeSpend = (income, expenses, bills, loans, savingsGoal = 0) => {
    const totalIncome = income.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const fixedCommitments = calculateMonthlyFixedCommitments(bills, loans);

    // Calculate total spent SO FAR this month (excluding fixed commitments to avoid double counting if tracked there)
    // For simplicity in Phase 1, we just subtract *all* expenses, but arguably 'Fixed Commitments' are future obligations.
    // Better logic:
    // Disposable = Income - Fixed_Commitments - Savings_Goal
    // Safe_Daily = (Disposable - Variable_Spent_So_Far) / Days_Left

    const currentMonth_VariableSpent = expenses.reduce((sum, t) => {
        // Exclude huge amounts that might be bills/EMIs (heuristic for now)
        // or rely on categorical hierarchy.
        return sum + (parseFloat(t.amount) || 0);
    }, 0);

    const disposableIncome = totalIncome - fixedCommitments - savingsGoal;
    const remainingToSpend = disposableIncome - currentMonth_VariableSpent;

    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - today.getDate() + 1); // +1 to include today

    const dailyLimit = remainingToSpend / daysRemaining;

    return {
        dailyLimit: Math.max(0, dailyLimit),
        remainingToSpend,
        daysRemaining,
        fixedCommitments,
        isOverBudget: remainingToSpend < 0
    };
};

export const analyzeLeakage = (transactions) => {
    // 1. Filter for small, recent expenses
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    // Debug logging
    console.log(`[Leakage] Analyzying ${transactions.length} transactions. 30 days ago: ${thirtyDaysAgo.toISOString()}`);

    const smallExpenses = transactions.filter(t => {
        const amount = parseFloat(t.amount) || 0;
        const date = new Date(t.date);
        return amount < 500 && amount > 0 && date >= thirtyDaysAgo && t.category !== 'Utilities' && t.category !== 'Rent' && t.category !== 'EMI';
    });

    console.log(`[Leakage] Found ${smallExpenses.length} small expenses < 500`);

    // 2. Group by normalized description
    const groups = {};
    smallExpenses.forEach(t => {
        const key = t.description.toLowerCase().trim();
        if (!groups[key]) groups[key] = { count: 0, total: 0, examples: [] };
        groups[key].count++;
        groups[key].total += parseFloat(t.amount);
        groups[key].examples.push(t);
    });

    // 3. Identify Pattern: Frequency > 2
    const leaks = Object.entries(groups)
        .filter(([_, data]) => data.count > 2)
        .map(([name, data]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            frequency: data.count,
            totalLeakage: data.total,
            avgAmount: data.total / data.count,
            projectedYearly: data.total * 12 // Simplified projection
        }))
        .sort((a, b) => b.totalLeakage - a.totalLeakage);

    console.log(`[Leakage] Identified ${leaks.length} leaks:`, leaks);

    return leaks;
};

/**
 * Checks for low balance across accounts
 * @param {Array} accounts - List of account objects with 'balance'
 * @param {number} threshold - Critical limit (default 5000)
 * @returns {Object|null} - Alert object or null
 */
export const checkLowBalance = (accounts, threshold = 5000) => {
    if (!accounts || accounts.length === 0) return null;

    const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);

    if (totalBalance < threshold) {
        return {
            type: 'CRITICAL',
            title: 'Low Balance Alert',
            message: `Total balance is ₹${totalBalance.toLocaleString('en-IN')}. This is below your safety limit of ₹${threshold.toLocaleString('en-IN')}.`,
            action: 'Check Budget'
        };
    }
    return null;
};
