/**
 * components/assets/assetIntegrationAdapters.js
 * 
 * FinLife Assets Module — Read-Only Integration Adapters.
 * 
 * Invariant Guarantees:
 * 1. Source Immutability: Adapters are strictly read-only; never mutate authoritative records.
 * 2. Outstanding-Balance Correctness: P2P receivables use current dynamic unamortized balances, never original principal.
 * 3. Vehicle Liability Separation: Vehicle equity uses linked loan balance without creating duplicate asset-module liabilities.
 * 4. Property Separation: Property summaries are separate CFO components and never included in Assets category totals.
 * 5. Investment Deduplication: Linked investment holdings prevent duplicate manual holdings.
 * 6. Unavailable-Source Behavior: Missing/unavailable sources return explicit UNAVAILABLE state, never defaulting to zero.
 * 7. Deterministic Reconciliation: Repeated projections produce identical paise values with zero drift.
 */

import {
    ASSET_CATEGORY,
    SOURCE_TYPE,
    validateAssetPaiseBounds,
    toBigIntPaise,
    roundHalfUp,
    AssetValidationError
} from './assetContracts.js';
import { getP2PNetWorthBalanceSheetProjection } from '../p2p/p2pNetWorthAdapter.js';
import { LoanRepository } from '../../services/loans/loanRepository.js';

export const PROJECTION_STATUS = Object.freeze({
    AVAILABLE:   'AVAILABLE',
    UNAVAILABLE: 'UNAVAILABLE',
    STALE:       'STALE'
});

/**
 * 1. Banking Asset Projection (Cash and Bank Balances)
 * @param {Object} options
 * @param {Array<Object>} options.accounts - Accounts list with balancePaise
 * @param {boolean} options.isAvailable - Availability flag
 * @returns {Object} Banking projection
 */
export function getBankingAssetProjection({ accounts = [], isAvailable = true } = {}) {
    if (!isAvailable) {
        return {
            status: PROJECTION_STATUS.UNAVAILABLE,
            sourceType: SOURCE_TYPE.BANKING,
            isReadOnlyProjection: true,
            assetCategory: ASSET_CATEGORY.MONEY_CASH,
            totalPaise: null,
            accounts: []
        };
    }

    let totalPaise = 0n;
    const projectedAccounts = [];

    for (const acc of accounts) {
        // Exclude liability accounts (e.g. credit cards, loans) from asset cash balances
        if (acc.accountNature === 'LIABILITY' || acc.type === 'CREDIT_CARD' || acc.type === 'LOAN') {
            continue;
        }

        const bal = toBigIntPaise(acc.balancePaise ?? 0n, `account balance for ${acc.id}`);
        totalPaise += bal;
        projectedAccounts.push({
            id: acc.id,
            name: acc.name,
            type: acc.type || 'BANK',
            balancePaise: bal,
            isReadOnlyProjection: true
        });
    }

    return {
        status: PROJECTION_STATUS.AVAILABLE,
        sourceType: SOURCE_TYPE.BANKING,
        isReadOnlyProjection: true,
        assetCategory: ASSET_CATEGORY.MONEY_CASH,
        totalPaise: validateAssetPaiseBounds(totalPaise, { signed: false }),
        accounts: projectedAccounts
    };
}

/**
 * 2. P2P Receivables Projection (Outstanding Principal Only)
 * @param {Object} options
 * @param {string} options.asOfDate
 * @param {boolean} options.isAvailable
 * @param {Function} options.p2pProvider - Optional custom provider for testing
 * @returns {Promise<Object>} P2P projection
 */
export async function getP2PReceivablesProjection({ asOfDate = new Date().toISOString().split('T')[0], isAvailable = true, p2pProvider = null } = {}) {
    if (!isAvailable) {
        return {
            status: PROJECTION_STATUS.UNAVAILABLE,
            sourceType: SOURCE_TYPE.P2P,
            isReadOnlyProjection: true,
            assetCategory: ASSET_CATEGORY.RECEIVABLES,
            outstandingPrincipalPaise: null,
            totalPayablePaise: null
        };
    }

    try {
        const p2pData = p2pProvider 
            ? await p2pProvider(asOfDate) 
            : await getP2PNetWorthBalanceSheetProjection(asOfDate);

        // GUARANTEE: Uses outstandingPrincipalPaise (dynamic unamortized balance), never original principal!
        const outstanding = validateAssetPaiseBounds(p2pData.p2pAssetPaise ?? 0n, { signed: false });
        const payables = validateAssetPaiseBounds(p2pData.p2pLiabilityPaise ?? 0n, { signed: false });

        return {
            status: PROJECTION_STATUS.AVAILABLE,
            sourceType: SOURCE_TYPE.P2P,
            isReadOnlyProjection: true,
            assetCategory: ASSET_CATEGORY.RECEIVABLES,
            outstandingPrincipalPaise: outstanding,
            totalPayablePaise: payables,
            activeGivenCount: p2pData.activeGivenCount || 0,
            activeTakenCount: p2pData.activeTakenCount || 0,
            asOfDate
        };
    } catch (err) {
        return {
            status: PROJECTION_STATUS.UNAVAILABLE,
            sourceType: SOURCE_TYPE.P2P,
            isReadOnlyProjection: true,
            assetCategory: ASSET_CATEGORY.RECEIVABLES,
            outstandingPrincipalPaise: null,
            totalPayablePaise: null,
            error: err.message
        };
    }
}

/**
 * 3. Vehicle Loan Projection (Vehicle Debt Linked From Loans Module)
 * Guarantees that the liability remains authoritative in Loans and is not created as a second liability.
 * @param {string} linkedLoanId 
 * @param {Object} options
 * @returns {Promise<Object>} Vehicle loan projection
 */
export async function getVehicleLoanProjection(linkedLoanId, { isAvailable = true, loanProvider = null } = {}) {
    if (!linkedLoanId) {
        return {
            status: PROJECTION_STATUS.AVAILABLE,
            linkedLoanId: null,
            outstandingLoanPaise: 0n,
            isReadOnlyProjection: true
        };
    }

    if (!isAvailable) {
        return {
            status: PROJECTION_STATUS.UNAVAILABLE,
            linkedLoanId,
            outstandingLoanPaise: null,
            isReadOnlyProjection: true
        };
    }

    try {
        const facility = loanProvider
            ? await loanProvider(linkedLoanId)
            : await LoanRepository.getFacilityById(linkedLoanId);

        if (!facility) {
            return {
                status: PROJECTION_STATUS.UNAVAILABLE,
                linkedLoanId,
                outstandingLoanPaise: null,
                error: `Loan facility ${linkedLoanId} not found`
            };
        }

        const outstanding = validateAssetPaiseBounds(facility.outstandingPrincipalPaise ?? 0n, { signed: false });

        return {
            status: PROJECTION_STATUS.AVAILABLE,
            linkedLoanId,
            outstandingLoanPaise: outstanding,
            isReadOnlyProjection: true,
            facilityName: facility.name || facility.facilityName,
            statusInLoans: facility.status
        };
    } catch (err) {
        return {
            status: PROJECTION_STATUS.UNAVAILABLE,
            linkedLoanId,
            outstandingLoanPaise: null,
            error: err.message
        };
    }
}

/**
 * 4. Investment Projection & Deduplication
 * Merges linked investments from authoritative investment ledgers with manual holdings,
 * ensuring zero double-counting of identical instruments.
 * @param {Object} options
 * @param {Array<Object>} options.authoritativeHoldings - Holdings from investment ledger
 * @param {Array<Object>} options.manualAssets - Manual asset records
 * @param {boolean} options.isAvailable
 * @returns {Object} Investment projection
 */
export function getInvestmentProjection({ authoritativeHoldings = [], manualAssets = [], isAvailable = true } = {}) {
    if (!isAvailable) {
        return {
            status: PROJECTION_STATUS.UNAVAILABLE,
            sourceType: SOURCE_TYPE.INVESTMENT_LEDGER,
            isReadOnlyProjection: true,
            assetCategory: ASSET_CATEGORY.INVESTMENTS,
            totalPaise: null,
            holdings: []
        };
    }

    let totalPaise = 0n;
    const seenHoldings = new Set();
    const resolvedHoldings = [];

    // 1. Authoritative holdings take precedence
    for (const h of authoritativeHoldings) {
        const key = (h.folioNumber || h.instrumentId || h.id).trim().toLowerCase();
        seenHoldings.add(key);

        const val = validateAssetPaiseBounds(h.currentValuationPaise ?? 0n, { signed: false });
        totalPaise += val;
        resolvedHoldings.push({
            ...h,
            sourceType: SOURCE_TYPE.INVESTMENT_LEDGER,
            isReadOnlyProjection: true,
            currentValuationPaise: val
        });
    }

    // 2. Manual assets included ONLY if not already present in authoritative ledger
    for (const m of manualAssets) {
        if (m.category !== ASSET_CATEGORY.INVESTMENTS) continue;

        const manualKey = (m.metadata?.folioNumber || m.sourceId || m.id).trim().toLowerCase();
        if (seenHoldings.has(manualKey)) {
            // Deduplication triggered: Linked holding already exists, omit duplicate manual entry
            continue;
        }

        const val = validateAssetPaiseBounds(m.currentValuationPaise ?? 0n, { signed: false });
        totalPaise += val;
        resolvedHoldings.push(m);
    }

    return {
        status: PROJECTION_STATUS.AVAILABLE,
        sourceType: SOURCE_TYPE.INVESTMENT_LEDGER,
        isReadOnlyProjection: true,
        assetCategory: ASSET_CATEGORY.INVESTMENTS,
        totalPaise: validateAssetPaiseBounds(totalPaise, { signed: false }),
        holdings: resolvedHoldings
    };
}

/**
 * 5. Properties Summary Projection (Strict Non-Property Boundary)
 * Invariant: Property value is purely a CFO summary component; NEVER an Assets category.
 * @param {Object} options
 * @param {Array<Object>} options.propertiesList - List of property records from Properties module
 * @param {boolean} options.isAvailable
 * @returns {Object} Properties summary projection
 */
export function getPropertiesSummaryProjection({ propertiesList = [], isAvailable = true } = {}) {
    if (!isAvailable) {
        return {
            status: PROJECTION_STATUS.UNAVAILABLE,
            isReadOnlyProjection: true,
            isPropertyModuleOnly: true,
            propertiesValuationPaise: null,
            propertiesCount: 0
        };
    }

    let totalPaise = 0n;
    for (const p of propertiesList) {
        const val = validateAssetPaiseBounds(p.estimatedMarketValuePaise ?? p.currentValuationPaise ?? 0n, { signed: false });
        totalPaise += val;
    }

    return {
        status: PROJECTION_STATUS.AVAILABLE,
        isReadOnlyProjection: true,
        isPropertyModuleOnly: true, // Marker guaranteeing strict exclusion from Assets categories
        propertiesValuationPaise: validateAssetPaiseBounds(totalPaise, { signed: false }),
        propertiesCount: propertiesList.length
    };
}
