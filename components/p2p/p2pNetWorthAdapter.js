/**
 * components/p2p/p2pNetWorthAdapter.js
 * 
 * FinLife P2P Network — Personal CFO Net Worth Balance Sheet Projection Adapter
 * 
 * Invariants Enforced:
 * [P2P-INV-19] Personal CFO Net Worth Balance Sheet: Asset = Active Given loans, Liability = Active Taken loans.
 * [P2P-INV-21] Zero Double-Counting With Cashbook: Cash and P2P receivables form an asset swap without double-counting.
 * [P2P-INV-23] Isolated Projection Read-Only Boundary: Never mutates core ledger or storage state.
 */

import { P2PService } from '../../services/p2pService.js';
import { computeP2POverviewMetrics } from './p2pPresentationAdapter.js';
import { formatPaiseToINR, paiseToRupees } from './p2pContracts.js';

export async function getP2PNetWorthBalanceSheetProjection(asOfDate = new Date().toISOString().split('T')[0]) {
    const [loans, advances, repayments] = await Promise.all([
        P2PService.getLoans(),
        P2PService.getAdvances(),
        P2PService.getRepayments()
    ]);

    const metrics = computeP2POverviewMetrics(loans, advances, repayments, {}, asOfDate);

    const p2pAssetPaise = metrics.totalReceivablePaise;
    const p2pLiabilityPaise = metrics.totalPayablePaise;
    const p2pNetWorthContributionPaise = metrics.netPositionPaise;

    return {
        // Authoritative BigInt paise
        // GUARANTEE: p2pAssetPaise strictly uses current outstanding principal and contractually accrued applicable amounts — never original loan principal!
        p2pAssetPaise,
        p2pLiabilityPaise,
        p2pNetWorthContributionPaise,

        // Explicit breakdown semantics
        originalPrincipalPaise: metrics.originalPrincipalPaise,
        outstandingPrincipalPaise: metrics.totalReceivablePaise,
        accruedInterestPaise: metrics.accruedInterestPaise,
        unallocatedOverpaymentPaise: metrics.unallocatedOverpaymentPaise,

        // Presentation numbers (Rupees)
        p2pAssetRupees: paiseToRupees(p2pAssetPaise),
        p2pLiabilityRupees: paiseToRupees(p2pLiabilityPaise),
        p2pNetWorthContributionRupees: paiseToRupees(p2pNetWorthContributionPaise),

        // Exact formatted INR strings
        p2pAssetFormatted: formatPaiseToINR(p2pAssetPaise),
        p2pLiabilityFormatted: formatPaiseToINR(p2pLiabilityPaise),
        p2pNetWorthFormatted: formatPaiseToINR(p2pNetWorthContributionPaise),

        // Counts
        activeGivenCount: metrics.activeGivenCount,
        activeTakenCount: metrics.activeTakenCount,
        asOfDate
    };
}
