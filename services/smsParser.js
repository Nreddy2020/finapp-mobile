// SMS Transaction Parser
// Automatically reads and parses bank/UPI SMS messages

import { PermissionsAndroid, Platform } from 'react-native';

// react-native-get-sms-android is Android-only; guard it so the app doesn't
// crash on iOS, web, or Expo Go where the native module is not linked.
let SmsAndroid = null;
if (Platform.OS === 'android') {
    try {
        SmsAndroid = require('react-native-get-sms-android').default
            || require('react-native-get-sms-android');
    } catch (e) {
        console.warn('[smsParser] react-native-get-sms-android not available:', e.message);
    }
}

class SMSTransactionParser {
    constructor() {
        this.bankSenders = [
            'HDFCBK', 'ICICIB', 'SBIINB', 'AXISBK', 'KOTAKB',
            'PAYTM', 'GPAY', 'PHONEPE', 'AMAZONP', 'BHIM'
        ];

        this.merchantCategories = {
            // Food & Dining
            'SWIGGY': 'Food',
            'ZOMATO': 'Food',
            'DOMINOS': 'Food',
            'MCDONALDS': 'Food',
            'KFC': 'Food',
            'SUBWAY': 'Food',

            // Transport
            'UBER': 'Transport',
            'OLA': 'Transport',
            'RAPIDO': 'Transport',
            'METRO': 'Transport',

            // Shopping
            'AMAZON': 'Shopping',
            'FLIPKART': 'Shopping',
            'MYNTRA': 'Shopping',
            'AJIO': 'Shopping',

            // Medicine
            'APOLLO': 'Medicine',
            'MEDPLUS': 'Medicine',
            'PHARMEASY': 'Medicine',
            '1MG': 'Medicine',
            'NETMEDS': 'Medicine',

            // Entertainment
            'NETFLIX': 'Entertainment',
            'PRIME': 'Entertainment',
            'SPOTIFY': 'Entertainment',
            'HOTSTAR': 'Entertainment',

            // Utilities
            'ELECTRICITY': 'Utilities',
            'WATER': 'Utilities',
            'GAS': 'Utilities',
            'RECHARGE': 'Utilities',

            // Rent
            'RENT': 'Rent',
            'HOUSING': 'Rent'
        };
    }

    async requestPermission() {
        if (Platform.OS !== 'android') {
            return false;
        }

        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_SMS,
                {
                    title: 'SMS Permission',
                    message: 'We need to read your bank SMS to automatically track transactions',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.error('Permission error:', err);
            return false;
        }
    }

    async readBankSMS(days = 30) {
        if (!SmsAndroid) {
            console.warn('[smsParser] SMS reading not available on this platform');
            return [];
        }

        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
            throw new Error('SMS permission denied');
        }

        return new Promise((resolve, reject) => {
            const filter = {
                box: 'inbox',
            };

            console.log('Listing SMS with filter:', JSON.stringify(filter));

            SmsAndroid.list(
                JSON.stringify(filter),
                (fail) => {
                    console.error('SMS List failed:', fail);
                    reject(fail);
                },
                (count, smsList) => {
                    console.log('SMS List success, count:', count);
                    try {
                        const messages = JSON.parse(smsList);
                        const transactions = this.parseMessages(messages);
                        resolve(transactions);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    parseMessages(messages) {
        const transactions = [];

        for (const sms of messages) {
            const parsed = this.parseSMS(sms.body, sms.date);
            if (parsed) {
                transactions.push({
                    ...parsed,
                    sms_id: sms._id,
                    sender: sms.address,
                    raw_message: sms.body
                });
            }
        }

        // Remove duplicates
        return this.deduplicateTransactions(transactions);
    }

    parseSMS(smsBody, timestamp) {
        // Try different bank patterns
        const patterns = [
            this.parseHDFC(smsBody),
            this.parseICICI(smsBody),
            this.parseSBI(smsBody),
            this.parseAxis(smsBody),
            this.parseUPI(smsBody),
            this.parseGeneric(smsBody)
        ];

        for (const result of patterns) {
            if (result) {
                return {
                    ...result,
                    timestamp: timestamp || Date.now(),
                    source: 'sms'
                };
            }
        }

        return null;
    }

    parseHDFC(sms) {
        // Pattern: "Rs 150.00 debited from A/c XX1234 on 27-Dec-25 at SWIGGY BANGALORE. Avl Bal: Rs 5,420.50"
        const pattern = /Rs\s?([\d,]+(?:\.\d{2})?)\s(debited|credited)\sfrom\sA\/c\s(\w+)\son\s([\d-]+)\sat\s([A-Z\s]+)(?:\.\sAvl\sBal:\sRs\s?([\d,]+\.\d{2}))?/i;
        const match = sms.match(pattern);

        if (match) {
            return {
                amount: parseFloat(match[1].replace(',', '')),
                type: match[2].toLowerCase() === 'credited' ? 'income' : 'expense',
                account: match[3],
                date: this.parseDate(match[4]),
                merchant: this.cleanMerchantName(match[5]),
                category: this.categorizeMerchant(match[5]),
                balance: match[6] ? parseFloat(match[6].replace(',', '')) : null,
                bank: 'HDFC'
            };
        }
        return null;
    }

    parseICICI(sms) {
        // Pattern: "Rs.150.00 spent on Card XX1234 at SWIGGY on 27-Dec-25"
        const pattern = /Rs\.([\d,]+\.\d{2})\sspent\son\sCard\s(\w+)\sat\s([A-Z\s]+)\son\s([\d-]+)/i;
        const match = sms.match(pattern);

        if (match) {
            return {
                amount: parseFloat(match[1].replace(',', '')),
                type: 'expense',
                account: match[2],
                merchant: this.cleanMerchantName(match[3]),
                category: this.categorizeMerchant(match[3]),
                date: this.parseDate(match[4]),
                bank: 'ICICI'
            };
        }
        return null;
    }

    parseSBI(sms) {
        // Pattern: "Dear Customer, Rs 150.00 debited from A/c XX1234 on 27Dec25"
        const pattern = /Rs\s?([\d,]+\.\d{2})\s(debited|credited)\sfrom\sA\/c\s(\w+)\son\s([\d\w]+)/i;
        const match = sms.match(pattern);

        if (match) {
            return {
                amount: parseFloat(match[1].replace(',', '')),
                type: match[2].toLowerCase() === 'credited' ? 'income' : 'expense',
                account: match[3],
                date: this.parseDate(match[4]),
                merchant: 'Unknown',
                category: 'Other',
                bank: 'SBI'
            };
        }
        return null;
    }

    parseAxis(sms) {
        // Pattern: "INR 150.00 debited from A/c XX1234 on 27-12-25"
        const pattern = /INR\s([\d,]+\.\d{2})\s(debited|credited)\sfrom\sA\/c\s(\w+)\son\s([\d-]+)/i;
        const match = sms.match(pattern);

        if (match) {
            return {
                amount: parseFloat(match[1].replace(',', '')),
                type: match[2].toLowerCase() === 'credited' ? 'income' : 'expense',
                account: match[3],
                date: this.parseDate(match[4]),
                merchant: 'Unknown',
                category: 'Other',
                bank: 'Axis'
            };
        }
        return null;
    }

    parseUPI(sms) {
        // Pattern: "Rs.150 sent to merchant@paytm UPI Ref no 123456789012"
        const pattern = /Rs\.([\d,]+)\s(sent\sto|received\sfrom)\s([\w@.]+)\sUPI\sRef\sno\s(\d+)/i;
        const match = sms.match(pattern);

        if (match) {
            let merchant = match[3].split('@')[0];

            // Try to look for cleaner names in the raw body if possible, or just clean what we extracted
            merchant = this.cleanMerchantName(merchant);

            return {
                amount: parseFloat(match[1].replace(',', '')),
                type: match[2].includes('sent') ? 'expense' : 'income',
                merchant: merchant,
                category: this.categorizeMerchant(merchant),
                upi_ref: match[4],
                date: new Date().toISOString(),
                bank: 'UPI'
            };
        }
        return null;
    }

    parseGeneric(sms) {
        // Generic pattern to catch any other transactions
        // Keywords: debited, credited, spent, paid, sent, received
        const amountRegex = /(?:Rs\.?|INR|₹)\s?([\d,]+(?:\.\d{2})?)/i;
        const typeRegex = /(debited|credited|spent|paid|sent|received)/i;

        // Ignore OTPs
        if (/otp|verification code|auth code/i.test(sms)) {
            return null;
        }

        const amountMatch = sms.match(amountRegex);
        const typeMatch = sms.match(typeRegex);

        if (amountMatch && typeMatch) {
            const typeStr = typeMatch[1].toLowerCase();
            const type = (typeStr === 'credited' || typeStr === 'received') ? 'income' : 'expense';

            // Try to find merchant/sender
            // Look for "at X", "to X", "from X"
            const merchantMatch = sms.match(/(?:at|to|from)\s+([A-Za-z0-9\s\.]+)/i);
            const rawMerchant = merchantMatch ? merchantMatch[1].trim() : 'Unknown';
            const merchant = this.cleanMerchantName(rawMerchant);

            return {
                amount: parseFloat(amountMatch[1].replace(',', '')),
                type: type,
                merchant: merchant,
                category: this.categorizeMerchant(merchant),
                account: 'Wallet/Card',
                date: new Date().toISOString(),
                bank: 'Other'
            };
        }
        return null;
    }

    categorizeMerchant(merchant) {
        const merchantUpper = merchant.toUpperCase();

        for (const [key, category] of Object.entries(this.merchantCategories)) {
            if (merchantUpper.includes(key)) {
                return category;
            }
        }

        return 'Other';
    }

    parseDate(dateStr) {
        // Handle different date formats
        // "27-Dec-25", "27Dec25", "27-12-25"
        try {
            const formats = [
                /(\d{2})-(\w{3})-(\d{2})/,  // 27-Dec-25
                /(\d{2})(\w{3})(\d{2})/,     // 27Dec25
                /(\d{2})-(\d{2})-(\d{2})/    // 27-12-25
            ];

            for (const format of formats) {
                const match = dateStr.match(format);
                if (match) {
                    // Convert to ISO date
                    const day = match[1];
                    const month = match[2];
                    const year = `20${match[3]}`;

                    // Handle month names
                    const monthMap = {
                        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                    };

                    const monthNum = monthMap[month] || month;
                    return `${year}-${monthNum}-${day}`;
                }
            }
        } catch (error) {
            console.error('Date parsing error:', error);
        }

        return new Date().toISOString().split('T')[0];
    }

    deduplicateTransactions(transactions) {
        const seen = new Set();
        return transactions.filter(t => {
            const key = `${t.amount}_${t.date}_${t.merchant}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    // Get statistics
    getStatistics(transactions) {
        return {
            total_count: transactions.length,
            total_expenses: transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0),
            total_income: transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0),
            categories: this.groupByCategory(transactions),
            banks: this.groupByBank(transactions)
        };
    }

    cleanMerchantName(raw) {
        if (!raw) return 'Unknown';
        return raw.trim()
            .replace(/\s+/g, ' ')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ')
            .substring(0, 30); // truncate
    }

    groupByCategory(transactions) {
        return transactions.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});
    }

    groupByBank(transactions) {
        return transactions.reduce((acc, t) => {
            acc[t.bank] = (acc[t.bank] || 0) + 1;
            return acc;
        }, {});
    }
}

export default new SMSTransactionParser();
