import {
    INCOME_CATEGORIES,
    EXPENSE_CATEGORIES,
    TRANSFER_CATEGORIES
} from './financialCategories';

export const ClassificationEngine = {
    // Initial deterministic rules using canonical IDs
    incomeCategories: INCOME_CATEGORIES.map(c => c.id),
    expenseCategories: EXPENSE_CATEGORIES.map(c => c.id),
    transferCategories: TRANSFER_CATEGORIES.map(c => c.id),

    merchantMap: {
        'swiggy': { type: 'expense', category: 'food' },
        'zomato': { type: 'expense', category: 'food' },
        'mcdonalds': { type: 'expense', category: 'food' },
        'kfc': { type: 'expense', category: 'food' },
        
        'amazon': { type: 'expense', category: 'shopping' },
        'flipkart': { type: 'expense', category: 'shopping' },
        'myntra': { type: 'expense', category: 'shopping' },
        
        'uber': { type: 'expense', category: 'transport' },
        'ola': { type: 'expense', category: 'transport' },
        'petrol': { type: 'expense', category: 'transport' },
        
        'netflix': { type: 'expense', category: 'subscription' },
        'spotify': { type: 'expense', category: 'subscription' },
        'prime': { type: 'expense', category: 'subscription' },
        
        'electricity': { type: 'expense', category: 'utilities' },
        'water': { type: 'expense', category: 'utilities' },
        
        'emi': { type: 'expense', category: 'loan_emi' },
        'loan payment': { type: 'expense', category: 'loan_emi' },
        
        'salary': { type: 'income', category: 'salary' },
        'interest credited': { type: 'income', category: 'interest' },
        'refund': { type: 'income', category: 'refund' },
        
        'upi transfer to own account': { type: 'transfer', category: 'internal_transfer' }
    },

    /**
     * Given a raw description or merchant name, returns a deterministic classification
     * @param {string} rawText 
     * @returns {{type: string, category: string, confidence: number}}
     */
    suggestClassification: (rawText) => {
        if (!rawText) return { type: 'unclassified', category: null, confidence: 0 };
        const lowerText = rawText.toLowerCase();

        for (const [key, mapping] of Object.entries(ClassificationEngine.merchantMap)) {
            if (lowerText.includes(key)) {
                return {
                    type: mapping.type,
                    category: mapping.category,
                    confidence: 0.9 // Deterministic high confidence
                };
            }
        }
        
        // Fallback default
        return { type: 'unclassified', category: null, confidence: 0.1 };
    }
};

export default ClassificationEngine;
