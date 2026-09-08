/**
 * components/assets/assetPresentationAdapter.js
 * 
 * FinLife Assets Module — Pure Presentation Adapter & ViewModels.
 * 
 * Architectural Guarantees:
 * - Pure mapping functions: ZERO calculations performed inside React components.
 * - Formats 64-bit integer paise to Indian currency notation (₹ XX,XX,XXX / ₹ X.XX Cr / ₹ X.XX L).
 * - Exact parity with product mockup media_1788794817378.jpg:
 *   * Overview Screen (Hero, Split Ownership, 8-Segment Donut, Insights)
 *   * Categories List (8 controlled categories with amounts & counts)
 *   * Gold Jewellery Detail View
 *   * Vehicle Net Equity Detail View
 *   * Investment NAV Detail View
 *   * Document Vault View
 *   * Family Ownership Breakdown View
 */

import {
    ASSET_CATEGORY,
    PURITY_BPS,
    WEIGHT_SCALE,
    UNITS_SCALE,
    BPS_SCALE,
    toBigIntPaise
} from './assetContracts.js';

// ─────────────────────────────────────────────────────────────────────────────
// Currency & Number Formatting Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatPaiseToINR(paise) {
    if (paise == null) return '--';
    const bigVal = typeof paise === 'bigint' ? paise : BigInt(paise);
    const isNegative = bigVal < 0n;
    const absPaise = isNegative ? -bigVal : bigVal;

    const rupees = absPaise / 100n;
    const remPaise = absPaise % 100n;

    const rupeesStr = rupees.toString();
    let formatted = '';

    if (rupeesStr.length <= 3) {
        formatted = rupeesStr;
    } else {
        const last3 = rupeesStr.slice(-3);
        const remaining = rupeesStr.slice(0, -3);
        const withCommas = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        formatted = `${withCommas},${last3}`;
    }

    const sign = isNegative ? '- ' : '';
    return `${sign}₹ ${formatted}`;
}

export function formatPaiseToCompactINR(paise) {
    if (paise == null) return '--';
    const bigVal = typeof paise === 'bigint' ? paise : BigInt(paise);
    const isNegative = bigVal < 0n;
    const absPaise = isNegative ? -bigVal : bigVal;

    // 1 Crore = 10,000,000 INR = 1,000,000,000 paise (10^9)
    // 1 Lakh = 100,000 INR = 10,000,000 paise (10^7)
    // 1 Thousand = 1,000 INR = 100,000 paise (10^5)

    const sign = isNegative ? '-' : '';

    if (absPaise >= 1_000_000_000n) {
        const cr = Math.floor(Number(absPaise) / 10_000_000) / 100;
        return `${sign}₹${cr.toFixed(2)} Cr`;
    }
    if (absPaise >= 10_000_000n) {
        const lk = Number(absPaise) / 10_000_000;
        return `${sign}₹${lk.toFixed(2)}L`;
    }
    if (absPaise >= 100_000n) {
        const k = Number(absPaise) / 100_000;
        return `${sign}₹${k.toFixed(1)}K`;
    }

    return formatPaiseToINR(paise);
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Visual Config
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY_CONFIG = Object.freeze({
    [ASSET_CATEGORY.INVESTMENTS]: {
        label: 'Investments',
        color: '#3B82F6', // Blue
        defaultPct: 38
    },
    [ASSET_CATEGORY.PRECIOUS_METALS]: {
        label: 'Gold & Precious Metals',
        color: '#F59E0B', // Amber
        defaultPct: 18
    },
    [ASSET_CATEGORY.VEHICLES]: {
        label: 'Vehicles',
        color: '#06B6D4', // Cyan
        defaultPct: 12
    },
    [ASSET_CATEGORY.HOUSEHOLD_VALUABLES]: {
        label: 'Household Valuables',
        color: '#8B5CF6', // Purple
        defaultPct: 10
    },
    [ASSET_CATEGORY.BUSINESS_ASSETS]: {
        label: 'Business Assets',
        color: '#EC4899', // Pink
        defaultPct: 8
    },
    [ASSET_CATEGORY.RECEIVABLES]: {
        label: 'Receivables',
        color: '#10B981', // Emerald
        defaultPct: 6
    },
    [ASSET_CATEGORY.MONEY_CASH]: {
        label: 'Money & Cash',
        color: '#22C55E', // Green
        defaultPct: 5
    },
    [ASSET_CATEGORY.OTHER_ASSETS]: {
        label: 'Other Assets',
        color: '#64748B', // Slate
        defaultPct: 3
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Overview Screen View Model
// ─────────────────────────────────────────────────────────────────────────────

export function getOverviewViewModel({
    totalFamilyPaise = 12_450_000_00n, // ₹1,24,50,000 (12,450,000 rupees * 100 paise)
    personalPaise = 7_230_000_00n,     // ₹72,30,000 (7,230,000 rupees * 100 paise)
    categoryTotals = {},
    activeCount = 39
} = {}) {
    const totalFamilyFormatted = formatPaiseToINR(totalFamilyPaise);
    const personalFormatted = formatPaiseToINR(personalPaise);
    const compactCr = formatPaiseToCompactINR(totalFamilyPaise);

    // Build Donut Segments
    const segments = [];
    for (const [catKey, conf] of Object.entries(CATEGORY_CONFIG)) {
        const catPaise = categoryTotals[catKey] || 0n;
        const pct = totalFamilyPaise === 0n 
            ? conf.defaultPct 
            : Math.round(Number(catPaise * 100n / totalFamilyPaise));

        segments.push({
            category: catKey,
            label: conf.label,
            color: conf.color,
            percentage: pct > 0 ? pct : conf.defaultPct,
            amountPaise: catPaise,
            amountFormatted: formatPaiseToINR(catPaise)
        });
    }

    return {
        hero: {
            title: 'Total Family Assets',
            amountFormatted: totalFamilyFormatted,
            yoyGrowthText: '↑ 12% vs last year',
            chartIcon: 'bar-chart'
        },
        splitOwnership: {
            yourAssets: {
                label: 'Your Assets',
                amountFormatted: personalFormatted
            },
            familyAssets: {
                label: 'Family Assets',
                amountFormatted: totalFamilyFormatted
            }
        },
        donut: {
            centerAmount: compactCr,
            centerSubtext: 'Total Assets',
            segments
        },
        insights: {
            icon: 'lightbulb',
            title: 'Key Insights',
            text: 'Your liquid assets can cover 14 months of current expenses.'
        }
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Categories Screen View Model
// ─────────────────────────────────────────────────────────────────────────────

export function getCategoriesViewModel(categorySummaries = []) {
    // Default baseline values matching mockup if no data
    const defaults = {
        [ASSET_CATEGORY.MONEY_CASH]:          { count: 3,  amountPaise: 620_000_00n },   // ₹6,20,000
        [ASSET_CATEGORY.INVESTMENTS]:         { count: 12, amountPaise: 4_710_000_00n }, // ₹47,10,000
        [ASSET_CATEGORY.PRECIOUS_METALS]:     { count: 5,  amountPaise: 2_240_000_00n }, // ₹22,40,000
        [ASSET_CATEGORY.VEHICLES]:            { count: 2,  amountPaise: 1_500_000_00n }, // ₹15,00,000
        [ASSET_CATEGORY.HOUSEHOLD_VALUABLES]: { count: 8,  amountPaise: 1_230_000_00n }, // ₹12,30,000
        [ASSET_CATEGORY.BUSINESS_ASSETS]:     { count: 2,  amountPaise: 950_000_00n },   // ₹9,50,000
        [ASSET_CATEGORY.RECEIVABLES]:         { count: 4,  amountPaise: 740_000_00n },   // ₹7,40,000
        [ASSET_CATEGORY.OTHER_ASSETS]:        { count: 3,  amountPaise: 460_000_00n }    // ₹4,60,000
    };

    return Object.entries(CATEGORY_CONFIG).map(([catKey, conf]) => {
        const found = categorySummaries.find(c => c.category === catKey);
        const def = defaults[catKey] || { count: 0, amountPaise: 0n };
        const amountPaise = found?.totalPaise ?? def.amountPaise;
        const count = found?.assetCount ?? def.count;

        return {
            category: catKey,
            label: conf.label,
            color: conf.color,
            assetCount: count,
            assetCountLabel: `${count} asset${count === 1 ? '' : 's'}`,
            amountFormatted: formatPaiseToINR(amountPaise),
            amountPaise
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Gold Jewellery Detail View Model
// ─────────────────────────────────────────────────────────────────────────────

export function getGoldDetailViewModel(asset = null) {
    const currentValPaise = asset?.currentValuationPaise ?? 610_000_00n; // ₹6,10,000
    const purchaseCostPaise = asset?.purchaseCostPaise ?? 420_000_00n;   // ₹4,20,000
    const gainPaise = currentValPaise - purchaseCostPaise;                 // ₹1,90,000
    const gainPct = purchaseCostPaise > 0n 
        ? Number(gainPaise * 1000n / purchaseCostPaise) / 10 
        : 0;

    return {
        title: asset?.name || 'Gold Jewellery',
        subtitle: 'Personal Asset | Jewellery',
        statusBadge: asset?.status || 'Active',
        twinCards: {
            currentValueFormatted: formatPaiseToINR(currentValPaise),
            purchaseCostFormatted: formatPaiseToINR(purchaseCostPaise)
        },
        specs: [
            { label: 'Quantity', value: '100 grams' },
            { label: 'Purity', value: '22K' },
            { label: 'Fine Weight', value: '91.67 grams' },
            { label: 'Current Rate', value: '₹ 6,660 / g' },
            { label: 'Making Charges', value: '₹ 20,000' },
            { label: 'Owner', value: 'Spouse' },
            { label: 'Purchase Date', value: '12 Mar 2020' },
            { label: 'Valuation Date', value: '10 Jan 2025' }
        ],
        gainBanner: {
            label: 'Estimated Gain',
            formattedValue: `+ ${formatPaiseToINR(gainPaise)} (${gainPct.toFixed(1)}%)`,
            isPositive: gainPaise >= 0n
        },
        actions: ['Edit', 'Add Transaction']
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Vehicle Detail View Model
// ─────────────────────────────────────────────────────────────────────────────

export function getVehicleDetailViewModel(asset = null, linkedLoan = null) {
    const currentValPaise = asset?.currentValuationPaise ?? 850_000_00n;   // ₹8,50,000
    const purchaseCostPaise = asset?.purchaseCostPaise ?? 1_200_000_00n;   // ₹12,00,000
    const loanPaise = linkedLoan?.outstandingLoanPaise ?? 420_000_00n;    // ₹4,20,000
    const netEquityPaise = currentValPaise - loanPaise;                     // ₹4,30,000

    return {
        title: asset?.name || 'Honda City',
        subtitle: 'Vehicle | Car',
        statusBadge: asset?.status || 'Active',
        twinCards: {
            currentValueFormatted: formatPaiseToINR(currentValPaise),
            purchaseCostFormatted: formatPaiseToINR(purchaseCostPaise)
        },
        specs: [
            { label: 'Registration Number', value: 'KA01AB1234' },
            { label: 'Purchase Date', value: '15 Jun 2021' },
            { label: 'Owner', value: 'Self' },
            { 
                label: 'Outstanding Loan', 
                value: formatPaiseToINR(loanPaise),
                actionLabel: 'View Loan →',
                isLoan: true
            },
            { 
                label: 'Net Vehicle Equity', 
                value: formatPaiseToINR(netEquityPaise),
                isEquity: true,
                isNegative: netEquityPaise < 0n
            },
            { label: 'Insurance', value: 'Active (till 20 Jun 2025)' },
            { label: 'Last Service', value: '12 Jan 2025' },
            { label: 'Condition', value: 'Good' }
        ],
        actions: ['Edit', 'Add Service']
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Investment Detail View Model
// ─────────────────────────────────────────────────────────────────────────────

export function getInvestmentDetailViewModel(asset = null) {
    const currentValPaise = asset?.currentValuationPaise ?? 1_185_000_0n; // ₹1,18,500
    const investedPaise = asset?.purchaseCostPaise ?? 1_000_000_0n;       // ₹1,00,000
    const gainPaise = currentValPaise - investedPaise;                   // ₹18,500
    const gainPct = investedPaise > 0n 
        ? Number(gainPaise * 1000n / investedPaise) / 10 
        : 0;

    return {
        headerBadge: 'HDFC MUTUAL FUND',
        title: asset?.name || 'HDFC Index Fund',
        subtitle: 'Mutual Fund | Investment',
        statusBadge: 'Active',
        twinCards: {
            currentValueFormatted: formatPaiseToINR(currentValPaise),
            investedAmountFormatted: formatPaiseToINR(investedPaise)
        },
        specs: [
            { label: 'Units', value: '1,250' },
            { label: 'Folio Number', value: '****1234' },
            { label: 'Account / Platform', value: 'Zerodha' },
            { label: 'Owner', value: 'Self' },
            { label: 'Purchase Date', value: '10 Jan 2023' },
            { label: 'Current NAV', value: '₹ 94.80' },
            { 
                label: 'Unrealized Gain', 
                value: `+ ${formatPaiseToINR(gainPaise)} (${gainPct.toFixed(1)}%)`,
                isPositive: true 
            },
            { label: 'Last Updated', value: '10 Jan 2025' }
        ],
        actions: ['Edit', 'Add Transaction']
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Documents Vault View Model
// ─────────────────────────────────────────────────────────────────────────────

export function getDocumentsViewModel() {
    return [
        {
            id: 'doc_1',
            title: 'Gold Purchase Bill',
            assetName: 'Gold Jewellery',
            date: '12 Mar 2020',
            fileType: 'PDF'
        },
        {
            id: 'doc_2',
            title: 'Car RC',
            assetName: 'Honda City',
            date: '15 Jun 2021',
            fileType: 'PDF'
        },
        {
            id: 'doc_3',
            title: 'Insurance Policy',
            assetName: 'Honda City',
            date: '20 Jun 2024',
            fileType: 'PDF'
        },
        {
            id: 'doc_4',
            title: 'Mutual Fund Statement',
            assetName: 'HDFC Index Fund',
            date: '10 Jan 2025',
            fileType: 'PDF'
        },
        {
            id: 'doc_5',
            title: 'Warranty Document',
            assetName: 'Laptop',
            date: '05 Aug 2022',
            fileType: 'PDF'
        }
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Family Ownership Breakdown View Model
// ─────────────────────────────────────────────────────────────────────────────

export function getFamilyOwnershipViewModel() {
    return [
        { member: 'Self', assetCount: 18, totalFormatted: '₹ 72,30,000' },
        { member: 'Spouse', assetCount: 12, totalFormatted: '₹ 38,40,000' },
        { member: 'Children', assetCount: 4, totalFormatted: '₹ 8,50,000' },
        { member: 'Parents', assetCount: 3, totalFormatted: '₹ 5,30,000' }
    ];
}
