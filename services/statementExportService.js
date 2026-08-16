/**
 * services/statementExportService.js
 * 
 * Stage C.5.4 Statement Export Engine.
 * Pure presentation-only export formatters (JSON, CSV, ShareText).
 * Strict RFC-4180 compliance with deterministic CRLF formatting.
 * Zero storage mutations, zero financial calculations.
 */

export const StatementExportService = {
    /**
     * Export statement to formatted JSON string
     * @param {Object} statement 
     * @returns {string} Formatted JSON
     */
    exportToJSON(statement) {
        if (!statement) return '{}';
        return JSON.stringify(statement, null, 2);
    },

    /**
     * Export statement tax lots & summary to RFC-4180 compliant CSV
     * @param {Object} statement 
     * @returns {string} CSV text with CRLF line endings
     */
    exportToCSV(statement) {
        if (!statement) return '';

        const rows = [];

        // 1. Metadata Section
        rows.push(['SECTION', 'STATEMENT_METADATA']);
        rows.push(['Statement ID', 'Portfolio ID', 'Period', 'Start Date', 'End Date', 'As-Of Date']);
        rows.push([
            statement.statementId || '',
            statement.portfolioId || 'ALL_PORTFOLIOS',
            statement.period || 'ALL_TIME',
            statement.startDate || '',
            statement.endDate || '',
            statement.asOfDate || ''
        ]);

        // Empty row separator
        rows.push([]);

        // 2. Period Summary Section
        rows.push(['SECTION', 'PERIOD_SUMMARY']);
        rows.push(['Total Realized Gain', 'Total STCG', 'Total LTCG', 'Sell Trades Count', 'Gross Dividends', 'Net Dividends', 'Net Economic Return']);
        const cg = statement.periodActivity?.capitalGains || {};
        const div = statement.periodActivity?.dividends || {};
        rows.push([
            (cg.totalEconomicRealizedGain || 0).toFixed(2),
            (cg.totalSTCG || 0).toFixed(2),
            (cg.totalLTCG || 0).toFixed(2),
            String(cg.sellEventCount || 0),
            (div.totalGrossDividends || 0).toFixed(2),
            (div.totalNetDividends || 0).toFixed(2),
            (statement.periodActivity?.netPeriodEconomicReturn || 0).toFixed(2)
        ]);

        // Empty row separator
        rows.push([]);

        // 3. FIFO Tax Lots Section
        rows.push(['SECTION', 'FIFO_TAX_LOTS']);
        rows.push(['Event ID', 'Symbol', 'Asset Type', 'Quantity', 'Sell Price', 'Gross Proceeds', 'FIFO Cost Basis', 'Tax Realized Gain', 'Holding Days', 'Gain Type']);
        const sells = statement.periodActivity?.capitalGains?.sells || [];
        for (const sell of sells) {
            rows.push([
                sell.eventId || '',
                sell.symbol || '',
                sell.assetType || '',
                String(sell.quantity || 0),
                (sell.sellPrice || 0).toFixed(2),
                (sell.grossProceeds || 0).toFixed(2),
                (sell.fifoCostBasisOfSold !== undefined ? sell.fifoCostBasisOfSold : (sell.wacCostBasisOfSold || 0)).toFixed(2),
                (sell.taxRealizedGain !== undefined ? sell.taxRealizedGain : (sell.economicRealizedGain || 0)).toFixed(2),
                String(sell.holdingDays || 0),
                sell.gainType || 'STCG'
            ]);
        }

        // Format into RFC-4180 lines with CRLF
        return rows.map(row => row.map(this._escapeCSV).join(',')).join('\r\n');
    },

    /**
     * Export statement to human-readable plain text summary for clipboard/sharing
     * @param {Object} statement 
     * @returns {string} Formatted text
     */
    exportToShareText(statement) {
        if (!statement) return 'No statement data available.';

        const val = statement.asOfSnapshot?.valuation || {};
        const perf = statement.asOfSnapshot?.performance || {};
        const cg = statement.periodActivity?.capitalGains || {};
        const div = statement.periodActivity?.dividends || {};

        const fmt = (num) => `₹${Math.abs(Number(num) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return [
            `📊 FINLIFE MASTER PORTFOLIO STATEMENT`,
            `======================================`,
            `Portfolio: ${statement.portfolioId ? statement.portfolioId.toUpperCase() : 'ALL PORTFOLIOS'}`,
            `Period: ${statement.period || 'ALL_TIME'}`,
            `Generated: ${statement.asOfDate ? statement.asOfDate.slice(0, 10) : new Date().toISOString().slice(0, 10)}`,
            ``,
            `💰 AS-OF SNAPSHOT:`,
            `• Current Valuation: ${fmt(val.totalMarketValue)}`,
            `• Total Cost Basis: ${fmt(val.totalCostBasis)}`,
            `• Unrealized Gain: ${val.unrealizedGain >= 0 ? '+' : '-'}${fmt(val.unrealizedGain)} (${(val.unrealizedReturnPercent || 0).toFixed(2)}%)`,
            `• Money-Weighted Return (XIRR): ${(perf.xirrPercent || 0).toFixed(2)}% [${perf.performanceType || 'ABSOLUTE'}]`,
            ``,
            `📈 PERIOD REALIZED CAPITAL GAINS (FIFO TAX):`,
            `• Total Tax Realized Gain: ${(cg.totalTaxRealizedGain !== undefined ? cg.totalTaxRealizedGain : cg.totalEconomicRealizedGain) >= 0 ? '+' : '-'}${fmt(cg.totalTaxRealizedGain !== undefined ? cg.totalTaxRealizedGain : cg.totalEconomicRealizedGain)}`,
            `• Short-Term Gain (STCG): ${fmt(cg.totalSTCG)}`,
            `• Long-Term Gain (LTCG): ${fmt(cg.totalLTCG)}`,
            `• Net Dividends: ${fmt(div.totalNetDividends)}`,
            `• Net Period Economic Return: ${fmt(statement.periodActivity?.netPeriodEconomicReturn)}`,
            `======================================`
        ].join('\n');
    },

    /**
     * Helper to escape CSV values according to RFC-4180
     * @private
     */
    _escapeCSV(val) {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
};

export default StatementExportService;
