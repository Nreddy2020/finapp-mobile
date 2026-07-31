// Web-compatible mock for SMS Parser
// This file is automatically resolved by Metro for .web.js extension

class SMSTransactionParser {
    constructor() {
        this.bankSenders = [];
        this.merchantCategories = {};
    }

    async requestPermission() {
        console.warn('SMS reading is not supported on web');
        return false;
    }

    async readBankSMS(days = 30) {
        console.warn('SMS reading is not supported on web');
        return [];
    }

    getStatistics(transactions = []) {
        return {
            total_count: 0,
            total_expenses: 0,
            total_income: 0,
            categories: {},
            banks: {}
        };
    }

    parseMessages(messages) { return []; }
    parseSMS(body, date) { return null; }
}

export default new SMSTransactionParser();
