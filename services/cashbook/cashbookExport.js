/**
 * services/cashbook/cashbookExport.js
 * 
 * Auditable CSV and JSON exports for the FinLife Cashbook Ledger.
 */

import { moneyToRupees, canonicalJsonStringify } from './cashbookContracts.js';
import { sha256 } from './cashbookAuditTrail.js';

export const CashbookExport = {
    /**
     * Generates an auditable CSV representation of transactions.
     */
    toCSV: (accounts, transactions) => {
        const accountMap = new Map(accounts.map(a => [a.id, a.name]));

        const headers = [
            'Transaction ID',
            'Date',
            'Type',
            'Status',
            'Source Account',
            'Destination Account',
            'Amount (INR)',
            'Category',
            'Subcategory',
            'Description',
            'Transfer Group ID',
            'Source',
            'Idempotency Key',
            'Void Reason'
        ];

        const rows = transactions.map(t => {
            const srcAcc = t.sourceAccountId ? (accountMap.get(t.sourceAccountId) || t.sourceAccountId) : (t.accountId ? accountMap.get(t.accountId) : '');
            const destAcc = t.destinationAccountId ? (accountMap.get(t.destinationAccountId) || t.destinationAccountId) : '';
            const amountInr = moneyToRupees(t.amount);

            return [
                t.id,
                t.date,
                t.transactionType,
                t.status,
                `"${(srcAcc || '').replace(/"/g, '""')}"`,
                `"${(destAcc || '').replace(/"/g, '""')}"`,
                amountInr.toFixed(2),
                `"${(t.category || '').replace(/"/g, '""')}"`,
                `"${(t.subcategory || '').replace(/"/g, '""')}"`,
                `"${(t.description || '').replace(/"/g, '""')}"`,
                t.transferGroupId || '',
                t.source || '',
                t.idempotencyKey || '',
                `"${(t.voidReason || '').replace(/"/g, '""')}"`
            ].join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    },

    /**
     * Generates a tamper-verifiable JSON ledger export.
     */
    toJSON: (envelope) => {
        const payload = {
            version: envelope.version,
            exportedAt: new Date().toISOString(),
            accounts: envelope.accounts,
            transactions: envelope.transactions,
            auditLog: envelope.auditLog,
            auditEventCount: envelope.auditLog.length
        };
        const checksum = sha256(canonicalJsonStringify(payload));
        return JSON.stringify({ ...payload, checksum }, null, 2);
    }
};
