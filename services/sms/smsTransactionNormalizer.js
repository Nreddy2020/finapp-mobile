/**
 * smsTransactionNormalizer.js
 * 
 * CANONICAL TRANSACTION NORMALIZER & CLASSIFIER
 * 
 * Converts raw parsed SMS candidates into canonical FinLife Money Flow transaction models.
 * Invariants:
 * - SMS-01: Maintains complete provenance and confidence score.
 * - SMS-04: Conforms to unified canonical ledger schema.
 */

import { normalizeMerchant } from '../../components/moneyflow/moneyFlowPresentationAdapter.js';

// Canonical Category Rules
const CATEGORY_RULES = [
    { category: 'Groceries & Food', emoji: '🍔', keywords: ['swiggy', 'zomato', 'bigbasket', 'blinkit', 'zepto', 'dmart', 'mcdonald', 'starbucks', 'kfc', 'burger', 'subway', 'domino', 'pizza', 'supermarket', 'food', 'restaurant', 'cafe', 'dining', 'bakery'] },
    { category: 'Rent & Housing', emoji: '🏠', keywords: ['rent', 'society', 'maintenance', 'prestige', 'sobha', 'brigade', 'apartment', 'housing', 'landlord'] },
    { category: 'Utilities', emoji: '⚡', keywords: ['electricity', 'bescom', 'water', 'gas', 'bill', 'airtel', 'jio', 'broadband', 'wifi', 'recharge', 'dth'] },
    { category: 'Travel & Transport', emoji: '✈️', keywords: ['uber', 'ola', 'rapido', 'metro', 'fuel', 'shell', 'petrol', 'diesel', 'indianoil', 'flight', 'indigo', 'makemytrip', 'irctc', 'railways'] },
    { category: 'Shopping', emoji: '🛍️', keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'decathlon', 'retail', 'store', 'mall', 'clothing'] },
    { category: 'Entertainment', emoji: '🎬', keywords: ['netflix', 'spotify', 'prime', 'hotstar', 'bookmyshow', 'pvr', 'cinema', 'youtube', 'apple.com'] },
    { category: 'Health & Medical', emoji: '💊', keywords: ['pharmacy', 'apollo', 'medplus', 'pharmeasy', '1mg', 'hospital', 'clinic', 'doctor', 'lab'] },
    { category: 'Investments', emoji: '📈', keywords: ['zerodha', 'groww', 'mutual fund', 'sip', 'upstox', 'kuvera', 'uti', 'hdfc amc'] },
    { category: 'Salary / Income', emoji: '💰', keywords: ['salary', 'payroll', 'dividend', 'interest credited', 'bonus', 'stipend', 'consulting'] }
];

/**
 * Classifies merchant/description into category and returns confidence score (0.0 to 1.0).
 */
export function classifyTransactionCategory(merchantName = '', rawText = '', type = 'EXPENSE') {
    const combined = `${merchantName} ${rawText}`.toLowerCase();

    for (const rule of CATEGORY_RULES) {
        for (const kw of rule.keywords) {
            if (combined.includes(kw)) {
                return {
                    category: rule.category,
                    emoji: rule.emoji,
                    confidence: 0.95
                };
            }
        }
    }

    // Default fallbacks with lower confidence
    if (type === 'INCOME') {
        return { category: 'Direct Income', emoji: '💰', confidence: 0.60 };
    }
    return { category: 'General Cash Activity', emoji: '📋', confidence: 0.50 };
}

/**
 * Normalizes parsed SMS into a canonical transaction.
 */
export function normalizeSMSTransaction(parsedSms, liquidAccounts = []) {
    if (!parsedSms) return null;

    const canonicalMerchant = normalizeMerchant(parsedSms.rawMerchant || parsedSms.rawBody);
    const classification = classifyTransactionCategory(
        canonicalMerchant,
        parsedSms.rawBody,
        parsedSms.type
    );

    // Map account
    let resolvedAccount = 'Primary Bank Account';
    let matchedAccountId = 'acc_primary';

    if (parsedSms.maskedAccountNumber && Array.isArray(liquidAccounts)) {
        const lastDigits = parsedSms.maskedAccountNumber.replace(/\D/g, '');
        const matched = liquidAccounts.find(acc => {
            const accMask = acc.maskedAccountNumber || acc.accountNumberMasked || acc.id || '';
            return accMask.includes(lastDigits);
        });
        if (matched) {
            resolvedAccount = matched.name || matched.bankName;
            matchedAccountId = matched.id;
        } else if (parsedSms.sender) {
            if (parsedSms.sender.includes('HDFC')) resolvedAccount = 'HDFC Savings Account';
            else if (parsedSms.sender.includes('SBI')) resolvedAccount = 'SBI Savings Account';
            else if (parsedSms.sender.includes('ICICI')) resolvedAccount = 'ICICI Current Account';
        }
    }

    const isConfident = classification.confidence >= 0.85;

    return {
        id: `tx_sms_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        source: 'SMS',
        type: parsedSms.type,
        amount: parsedSms.amount,
        merchant: canonicalMerchant,
        category: classification.category,
        categoryEmoji: classification.emoji,
        date: parsedSms.transactionDate,
        accountName: resolvedAccount,
        accountId: matchedAccountId,
        status: isConfident ? 'COMMITTED' : 'NEEDS_REVIEW',
        confidence: classification.confidence,
        rawSource: {
            sender: parsedSms.sender,
            rawBody: parsedSms.rawBody,
            referenceNumber: parsedSms.referenceNumber,
            maskedAccountNumber: parsedSms.maskedAccountNumber
        }
    };
}
