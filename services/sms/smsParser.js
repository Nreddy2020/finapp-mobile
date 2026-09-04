/**
 * smsParser.js
 * 
 * DETERMINISTIC SMS TRANSACTION PARSER (CASH ONLY)
 * 
 * Extracts financial transaction metadata from standard Indian Bank & UPI SMS messages.
 * Invariants:
 * - SMS-01: Source provenance is preserved.
 * - SMS-07: Parsing errors never throw unhandled exceptions or corrupt existing data.
 */

// Known bank / payment sender identifiers
export const KNOWN_BANK_SENDERS = [
    'HDFCBK', 'SBIINB', 'ICICIB', 'AXISBK', 'KOTAKB', 'PUNJNB', 'BOBTXN',
    'CANBNK', 'UNIONB', 'INDUSB', 'YESBNK', 'IDFCFB', 'CITIBK', 'SCISMS',
    'PAYTM', 'GPAY', 'PHONEPE', 'CRED', 'AMAZONP', 'BHIM'
];

/**
 * Parses raw SMS text and returns extracted transaction candidate.
 * Returns null if the message is not a financial debit/credit transaction.
 */
export function parseRawSMS(messageBody = '', sender = '', timestamp = new Date().toISOString()) {
    if (!messageBody || typeof messageBody !== 'string') return null;

    const text = messageBody.trim();
    const upper = text.toUpperCase();

    // 1. Detect Transaction Type (DEBIT vs CREDIT vs TRANSFER)
    let type = null;
    if (/\b(DEBITED|SPENT|PAID|SENT|CHARGED|WITHDRAWN|PURCHASE|TRANSFERRED TO)\b/i.test(text)) {
        type = 'EXPENSE';
    } else if (/\b(CREDITED|RECEIVED|DEPOSITED|ADDED|REFUNDED|CASHBACK)\b/i.test(text)) {
        type = 'INCOME';
    }

    if (!type) {
        // Not a debit/credit notification
        return null;
    }

    // 2. Extract Amount
    // Matches: Rs. 2,250, Rs 2250.00, INR 500, ₹1,20,000, Rs.500.50
    const amountRegex = /(?:RS\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
    const amountMatch = text.match(amountRegex);
    if (!amountMatch) return null;

    const rawAmountStr = amountMatch[1].replace(/,/g, '');
    const amount = parseFloat(rawAmountStr);
    if (isNaN(amount) || amount <= 0) return null;

    // 3. Extract Account Mask / Number
    // Matches: A/C XX4821, AC ...4821, Card ending 1234, Account **9901
    const accountRegex = /(?:A\/C|AC|ACCT|ACCOUNT|CARD|ACC NO\.?)\s*(?:ENDING\s*)?(?:[X*\.]*)(\d{3,6})\b/i;
    const accountMatch = text.match(accountRegex);
    const maskedAccountNumber = accountMatch ? `•••• ${accountMatch[1]}` : null;

    // 4. Extract Merchant / Recipient
    let rawMerchant = null;
    // Common patterns: "at AMAZON", "to SWIGGY", "vpa swiggy@icici", "info: UBER", "towards STARBUCKS"
    const merchantPatterns = [
        /(?:AT|TO|TOWARDS|INFO[:\-]?|VPA[:\-]?)\s+([A-Z0-9\s._\-&]{2,30}?)(?=\s+(?:ON|REF|UPI|AVAIL|BAL|BALANCE|LIMIT|VIA|DATE|\.|$))/i,
        /(?:PAID TO|TRANSFER TO)\s+([A-Z0-9\s._\-&]{2,30}?)(?=\s+(?:ON|REF|UPI|AVAIL|BAL|\.|$))/i,
        /(?:FROM)\s+([A-Z0-9\s._\-&]{2,30}?)(?=\s+(?:ON|REF|UPI|AVAIL|BAL|\.|$))/i
    ];

    for (const pattern of merchantPatterns) {
        const m = text.match(pattern);
        if (m && m[1]) {
            const candidate = m[1].trim();
            if (!/^(A\/C|ACCOUNT|YOUR|BANK|INR|RS|DATE|TIME)$/i.test(candidate)) {
                rawMerchant = candidate;
                break;
            }
        }
    }

    // 5. Extract Reference / UTR / Transaction ID
    const refRegex = /(?:REF|UTR|TXN|ID|REF NO\.?|TRANSACTION ID)[:\s\-#]*([A-Z0-9]{6,22})/i;
    const refMatch = text.match(refRegex);
    const referenceNumber = refMatch ? refMatch[1].trim() : null;

    // 6. Extract Transaction Date (if present in text, else fallback to timestamp)
    let transactionDate = timestamp;
    const dateRegex = /\b(\d{1,2})[-/.](\d{1,2}|[A-Za-z]{3})[-/.](\d{2,4})\b/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
        try {
            const parsedD = new Date(dateMatch[0]);
            if (!isNaN(parsedD.getTime())) {
                transactionDate = parsedD.toISOString();
            }
        } catch {}
    }

    return {
        amount,
        type,
        rawMerchant: rawMerchant || (type === 'INCOME' ? 'Direct Credit / Deposit' : 'Point of Sale / UPI'),
        maskedAccountNumber,
        referenceNumber,
        transactionDate,
        sender: sender.toUpperCase().trim(),
        rawBody: text
    };
}
