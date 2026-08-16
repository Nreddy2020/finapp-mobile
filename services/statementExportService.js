/**
 * services/statementExportService.js
 * 
 * Stage C.5.4 Statement Export Engine.
 * Pure presentation-only export formatters (JSON, CSV, ShareText).
 * Consumes Stage C.4.4 generatePortfolioStatement output directly.
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
     * @returns {string} CSV text
     */
    exportToCSV(statement) {
        if (!statement) return '';

        const lines = [];

        // 1. Metadata Header
        lines.push('--- STATEMENT METADATA ---');
        lines.push('Statement ID,Portfolio ID,Period,Start Date,End Date,As-Of Date');
        lines.push([
            statement.statementId || '',
            statement.portfolioId || 'ALL_PORTFOLIOS',
            statement.period || 'ALL_TIME',
            statement.startDate || '',
            statement.endDate || '',
            statement.asOfDate || ''
        ].map(this._escapeCSV).join(','));

        lines.push('');

        // 2. Period Capital Gains & Dividends
        lines.push('--- PERIOD CAPITAL GAINS & DIVIDENDS ---');
        lines.push('Total Realized Gain,Total STCG,Total LTCG,Sell Events Count,Gross Dividends,Net Dividends,Net Economic Return');
        const cg = statement.periodActivity?.capitalGains || {};
        const div = statement.periodActivity?.dividends || {};
        lines.push([
            (cg.totalEconomicRealizedGain || 0).toFixed(2),
            (cg.totalSTCG || 0).toFixed(2),
            (cg.totalLTCG || 0).toFixed(2),
            cg.sellEventCount || 0,
            (div.totalGrossDividends || 0).toFixed(2),
            (div.totalNetDividends || 0).toFixed(2),
            (statement.periodActivity?.netPeriodEconomicReturn || 0).toFixed(2)
        ].map(this._escapeCSV).join(','));

        lines.push('');

        // 3. Realized Sells & FIFO Lot Matching
        lines.push('--- REALIZED SELLS & FIFO TAX LOTS ---');
        lines.push('Event ID,Symbol,Asset Type,Quantity,Sell Price,Gross Proceeds,Cost Basis,Realized Gain,Holding Days,Gain Type');
        const sells = statement.periodActivity?.capitalGains?.sells || [];
        for (const sell of sells) {
            lines.push([
                sell.eventId || '',
                sell.symbol || '',
                sell.assetType || '',
                sell.quantity || 0,
                (sell.sellPrice || 0).toFixed(2),
                (sell.grossProceeds || 0).toFixed(2),
                (sell.fifoCostBasisOfSold || sell.wacCostBasisOfSold || 0).toFixed(2),
                (sell.taxRealizedGain || sell.economicRealizedGain || 0).toFixed(2),
                sell.holdingDays || 0,
                sell.gainType || 'STCG'
            ].map(this._escapeCSV).join(','));
        }

        return lines.join('\r\n');
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
            `📈 PERIOD REALIZED CAPITAL GAINS:`,
            `• Total Realized Gain: ${cg.totalEconomicRealizedGain >= 0 ? '+' : '-'}${fmt(cg.totalEconomicRealizedGain)}`,
            `• Short-Term Gain (STCG): ${fmt(cg.totalSTCG)}`,
            `• Long-Term Gain (LTCG): ${fmt(cg.totalLTCG)}`,
            `• Net Dividends: ${fmt(div.totalNetDividends)}`,
            `• Net Period Return: ${fmt(statement.periodActivity?.netPeriodEconomicReturn)}`,
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
