import {
    mockExpenses,
    mockIncome,
    mockBudgets,
    mockBankAccounts,
    mockSavingsGoals,
    mockInvestments,
    mockProperties,
    mockBillReminders,
    mockRecurringPayments,
    mockAIInsights,
    mockFamilyExpenses
} from './mockData';
import { saveData, STORAGE_KEYS } from './storage';

const uid = () => Math.floor(Math.random() * 1000000);

export async function seedAllModules() {
    // 1. Add an income entry
    mockIncome.unshift({ id: uid(), source: 'Seed: Bonus', amount: 25000, date: new Date().toISOString().split('T')[0], type: 'Bonus' });

    // 2. Add an expense that pays a bill (links to bill)
    const bill = mockBillReminders[0];
    const expenseId = uid();
    mockExpenses.unshift({ id: expenseId, description: `Paid ${bill.name}`, amount: bill.amount || 0, category: bill.category || 'Bills', date: new Date().toISOString().split('T')[0], payment_method: 'UPI' });
    // mark bill as paid
    if (bill) bill.paid = true;

    // 3. Update first bank account balance by reducing amount
    if (mockBankAccounts[0]) {
        mockBankAccounts[0].balance = Math.max(0, mockBankAccounts[0].balance - (bill.amount || 0));
    }

    // 4. Update a budget to reflect the expense
    const foodBudget = mockBudgets.find(b => b.category === 'Food & Dining');
    if (foodBudget) foodBudget.spent = (foodBudget.spent || 0) + (bill.amount || 0);

    // 5. Progress a savings goal
    if (mockSavingsGoals[0]) mockSavingsGoals[0].saved = mockSavingsGoals[0].saved + 5000;

    // 6. Add a small investment
    mockInvestments.unshift({ id: uid(), name: 'Seed ETF', type: 'ETF', invested: 5000, current_value: 5200, returns: 4, risk: 'Low' });

    // 7. Add a property note
    mockProperties.push({ id: uid(), name: 'Seed Condo', type: 'Apartment', location: 'Test City', purchasePrice: 5000000, currentValue: 5200000, purchaseDate: new Date().toISOString().split('T')[0] });

    // 8. Add a recurring payment
    mockRecurringPayments.push({ id: uid(), name: 'Seed Subscription', amount: 299, frequency: 'Monthly', next_date: new Date().toISOString().split('T')[0] });

    // 9. Add a family expense
    if (mockFamilyExpenses) mockFamilyExpenses.unshift({ id: uid(), title: 'Seed Family Expense', amount: 1200, paidBy: '1', splitBetween: ['1', '2'], date: new Date().toISOString().split('T')[0] });

    // 10. Add an AI insight
    if (mockAIInsights && Array.isArray(mockAIInsights.recommendations)) {
        mockAIInsights.recommendations.unshift({ type: 'opportunity', title: 'Seed Insight', description: 'Consider allocating 5% more to investments.', impact: '₹10,000/year' });
    }

    // Persist seed data to local storage so refresh retains it
    await Promise.all([
        saveData(STORAGE_KEYS.TRANSACTIONS, mockExpenses),
        saveData(STORAGE_KEYS.INCOME_SOURCES, mockIncome),
        saveData(STORAGE_KEYS.BUDGETS, mockBudgets),
        saveData(STORAGE_KEYS.ACCOUNTS, mockBankAccounts),
        saveData(STORAGE_KEYS.SAVINGS, mockSavingsGoals),
        saveData(STORAGE_KEYS.INVESTMENTS, mockInvestments),
        saveData(STORAGE_KEYS.PROPERTIES, mockProperties),
        saveData(STORAGE_KEYS.BILLS, mockBillReminders),
        saveData(STORAGE_KEYS.RECURRING_PAYMENTS, mockRecurringPayments),
        saveData(STORAGE_KEYS.FAMILY_EXPENSES, mockFamilyExpenses)
    ]);

    // Return a summary so caller can show a toast if needed
    return {
        success: true,
        added: {
            income: 1,
            expense: 1,
            property: 1,
            investment: 1,
            recurring: 1,
            familyExpense: 1,
            insight: 1
        }
    };
}

export default { seedAllModules };
