/**
 * components/assets/assetCFOAdapter.js
 * 
 * FinLife Assets Module — Personal CFO Consolidated Balance Sheet Adapter.
 * 
 * Invariants & Guarantees:
 * - Deterministic balance sheet aggregation using JavaScript BigInt bounded to signed 64-bit domain.
 * - Single authoritative source per component:
 *   * Liquid Cash: Banking / Cashbook
 *   * Investments: Investment Ledger / Deduplicated Assets
 *   * Physical & Precious Assets: Assets Module
 *   * Receivables: P2P Network (Outstanding Principal Only)
 *   * Properties: Properties Module (Separate Top-Level Component, Never in Assets Categories)
 *   * Liabilities: Loans Module (Formal Debt) + P2P Payables
 * - Zero double-counting.
 * - Missing/unavailable sources report explicit UNAVAILABLE status, never silently defaulting to zero.
 * - Read-only projection boundary: Zero mutating side effects.
 */

import {
    validateAssetPaiseBounds,
    toBigIntPaise,
    ASSET_CATEGORY,
    ASSET_LIFECYCLE_STATUS,
    AssetValidationError
} from './assetContracts.js';
import { PROJECTION_STATUS } from './assetIntegrationAdapters.js';

export function getConsolidatedCFOBalanceSheet({
    assets = [],
    bankingProjection = null,
    investmentProjection = null,
    p2pProjection = null,
    propertiesProjection = null,
    loansProjection = null,
    targetMemberId = 'self',
    asOfDate = new Date().toISOString().split('T')[0]
} = {}) {
    const unavailableSources = [];

    // 1. Liquid Cash (Banking)
    let liquidCashPaise = 0n;
    if (!bankingProjection || bankingProjection.status === PROJECTION_STATUS.UNAVAILABLE) {
        unavailableSources.push('BANKING');
    } else {
        liquidCashPaise = validateAssetPaiseBounds(bankingProjection.totalPaise ?? 0n, { signed: false });
    }

    // 2. Investments
    let investmentsPaise = 0n;
    if (!investmentProjection || investmentProjection.status === PROJECTION_STATUS.UNAVAILABLE) {
        unavailableSources.push('INVESTMENTS');
    } else {
        investmentsPaise = validateAssetPaiseBounds(investmentProjection.totalPaise ?? 0n, { signed: false });
    }

    // 3. Physical & Valuables (Assets Module: Precious Metals, Vehicles, Valuables, Business, Other)
    let physicalAssetsPaise = 0n;
    let personalPhysicalPaise = 0n;

    for (const a of assets) {
        if (a.status === ASSET_LIFECYCLE_STATUS.ARCHIVED || a.status === ASSET_LIFECYCLE_STATUS.SOLD) {
            continue;
        }

        // Exclude properties strictly
        if (a.category === 'PROPERTY' || a.category === 'PROPERTIES') {
            throw new AssetValidationError('ERR_PROPERTY_DISALLOWED', 'Properties cannot be included in Assets module totals');
        }

        // Exclude money/cash and investments if already covered by projections to prevent double-counting
        if (a.category === ASSET_CATEGORY.MONEY_CASH || a.category === ASSET_CATEGORY.INVESTMENTS || a.category === ASSET_CATEGORY.RECEIVABLES) {
            continue;
        }

        const val = validateAssetPaiseBounds(a.currentValuationPaise ?? 0n, { signed: false });
        physicalAssetsPaise += val;

        // Personal allocation
        const selfAlloc = (a.ownership || []).find(o => o.memberId.trim().toLowerCase() === targetMemberId.trim().toLowerCase());
        if (selfAlloc) {
            const shareBps = toBigIntPaise(selfAlloc.shareBps);
            personalPhysicalPaise += (val * shareBps) / 10_000n;
        }
    }

    // 4. Receivables (P2P Network)
    let receivablesPaise = 0n;
    let p2pPayablesPaise = 0n;
    if (!p2pProjection || p2pProjection.status === PROJECTION_STATUS.UNAVAILABLE) {
        unavailableSources.push('P2P');
    } else {
        receivablesPaise = validateAssetPaiseBounds(p2pProjection.outstandingPrincipalPaise ?? 0n, { signed: false });
        p2pPayablesPaise = validateAssetPaiseBounds(p2pProjection.totalPayablePaise ?? 0n, { signed: false });
    }

    // 5. Properties (Properties Module — Strictly Separate Component)
    let propertiesValuationPaise = 0n;
    if (!propertiesProjection || propertiesProjection.status === PROJECTION_STATUS.UNAVAILABLE) {
        unavailableSources.push('PROPERTIES');
    } else {
        propertiesValuationPaise = validateAssetPaiseBounds(propertiesProjection.propertiesValuationPaise ?? 0n, { signed: false });
    }

    // 6. Formal Loans & Liabilities
    let formalLoansPaise = 0n;
    if (!loansProjection || loansProjection.status === PROJECTION_STATUS.UNAVAILABLE) {
        unavailableSources.push('LOANS');
    } else {
        formalLoansPaise = validateAssetPaiseBounds(loansProjection.totalOutstandingPaise ?? loansProjection.totalLiabilitiesPaise ?? 0n, { signed: false });
    }

    // Consolidated Liabilities
    const totalLiabilitiesPaise = validateAssetPaiseBounds(formalLoansPaise + p2pPayablesPaise, { signed: false });

    // Consolidated Assets (Non-Property)
    const nonPropertyAssetsPaise = validateAssetPaiseBounds(
        liquidCashPaise + investmentsPaise + physicalAssetsPaise + receivablesPaise,
        { signed: false }
    );

    // Total Assets (Including Separate Property Projection)
    const totalAssetsPaise = validateAssetPaiseBounds(
        nonPropertyAssetsPaise + propertiesValuationPaise,
        { signed: false }
    );

    // Consolidated Net Worth (Signed 64-bit Domain)
    const netWorthPaise = validateAssetPaiseBounds(
        totalAssetsPaise - totalLiabilitiesPaise,
        { signed: true }
    );

    const isComplete = unavailableSources.length === 0;

    return {
        status: isComplete ? 'COMPLETE' : 'PARTIAL',
        isComplete,
        unavailableSources,

        // Household Consolidated Numbers
        totalAssetsPaise,
        nonPropertyAssetsPaise,
        propertiesValuationPaise,
        liquidCashPaise,
        investmentsPaise,
        physicalAssetsPaise,
        receivablesPaise,
        totalLiabilitiesPaise,
        formalLoansPaise,
        p2pPayablesPaise,
        netWorthPaise,

        // Personal Breakdown
        personalPhysicalPaise,
        targetMemberId,
        asOfDate,
        isReadOnlyProjection: true
    };
}
