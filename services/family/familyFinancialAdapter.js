/**
 * FinLife Family Financial Adapter
 * Strict read-only financial consumer querying authoritative domains.
 * Zero duplicate transactions/investments/loans/commitments written to storage.
 */

import { StorageService, STORAGE_KEYS } from '../storage.js';
import {
    DataAvailabilityState,
    FinancialLinkStatus
} from './familyContracts.js';
import { parseAmountPaise, formatPaiseToRupees } from './familyProtectionService.js';

export const FamilyFinancialAdapter = {
    async getFamilyNetWorthSnapshot() {
        try {
            const [
                assetsData,
                propertiesData,
                investmentsData,
                savingsData,
                accountsData,
                loansData,
                bankingLoansData,
                p2pLoansData
            ] = await Promise.all([
                StorageService.load(STORAGE_KEYS.ASSETS).catch(() => []),
                StorageService.load(STORAGE_KEYS.PROPERTIES).catch(() => []),
                StorageService.load(STORAGE_KEYS.INVESTMENT_HOLDINGS).catch(() => []),
                StorageService.load(STORAGE_KEYS.SAVINGS).catch(() => []),
                StorageService.load(STORAGE_KEYS.ACCOUNTS).catch(() => []),
                StorageService.load(STORAGE_KEYS.LOANS).catch(() => []),
                StorageService.load(STORAGE_KEYS.BANKING_LOANS).catch(() => []),
                StorageService.load(STORAGE_KEYS.P2P_LOANS).catch(() => [])
            ]);

            const assetsList = Array.isArray(assetsData) ? assetsData : [];
            const propertiesList = Array.isArray(propertiesData) ? propertiesData : [];
            const investmentsList = Array.isArray(investmentsData) ? investmentsData : [];
            const savingsList = Array.isArray(savingsData) ? savingsData : [];
            const accountsList = Array.isArray(accountsData) ? accountsData : [];
            const loansList = Array.isArray(loansData) ? loansData : [];
            const bankingLoansList = Array.isArray(bankingLoansData) ? bankingLoansData : [];
            const p2pLoansList = Array.isArray(p2pLoansData) ? p2pLoansData : [];

            let liquidPaise = 0n;
            let investmentsPaise = 0n;
            let propertiesPaise = 0n;
            let physicalAssetsPaise = 0n;
            let liabilitiesPaise = 0n;

            // Liquid cash & bank balances
            for (const acc of accountsList) {
                const bal = acc.balancePaise || acc.balance;
                liquidPaise += parseAmountPaise(bal);
            }
            for (const s of savingsList) {
                const amt = s.currentAmount || s.saved || s.balance || s.amount;
                liquidPaise += parseAmountPaise(amt);
            }

            // Investments
            for (const inv of investmentsList) {
                const val = inv.currentValuePaise || inv.marketValuePaise || inv.currentValue || inv.invested;
                investmentsPaise += parseAmountPaise(val);
            }

            // Properties
            for (const prop of propertiesList) {
                const val = prop.currentValuationPaise || prop.currentValue || prop.value;
                propertiesPaise += parseAmountPaise(val);
            }

            // Physical Assets
            for (const ast of assetsList) {
                const val = ast.valuePaise || ast.value || ast.currentValue;
                physicalAssetsPaise += parseAmountPaise(val);
            }

            // Liabilities
            for (const l of loansList) {
                const bal = l.outstandingPrincipalPaise || l.amount || l.outstanding;
                liabilitiesPaise += parseAmountPaise(bal);
            }
            for (const bl of bankingLoansList) {
                const bal = bl.outstandingPrincipalPaise || bl.amount || bl.outstanding;
                liabilitiesPaise += parseAmountPaise(bal);
            }
            for (const p2p of p2pLoansList) {
                const bal = p2p.outstandingPrincipalPaise || p2p.amount || p2p.principal;
                liabilitiesPaise += parseAmountPaise(bal);
            }

            const totalAssetsPaise = liquidPaise + investmentsPaise + propertiesPaise + physicalAssetsPaise;
            const netWorthPaise = totalAssetsPaise >= liabilitiesPaise ? (totalAssetsPaise - liabilitiesPaise) : -(liabilitiesPaise - totalAssetsPaise);

            const hasAnyData = (totalAssetsPaise > 0n) || (liabilitiesPaise > 0n);

            return {
                state: hasAnyData ? DataAvailabilityState.AVAILABLE : DataAvailabilityState.EMPTY,
                totalAssetsPaiseStr: totalAssetsPaise.toString(),
                totalAssetsDisplay: formatPaiseToRupees(totalAssetsPaise),
                totalLiabilitiesPaiseStr: liabilitiesPaise.toString(),
                totalLiabilitiesDisplay: formatPaiseToRupees(liabilitiesPaise),
                netWorthPaiseStr: netWorthPaise.toString(),
                netWorthDisplay: formatPaiseToRupees(netWorthPaise),
                liquidPaiseStr: liquidPaise.toString(),
                liquidDisplay: formatPaiseToRupees(liquidPaise),
                investmentsPaiseStr: investmentsPaise.toString(),
                investmentsDisplay: formatPaiseToRupees(investmentsPaise),
                propertiesPaiseStr: propertiesPaise.toString(),
                propertiesDisplay: formatPaiseToRupees(propertiesPaise),
                physicalAssetsPaiseStr: physicalAssetsPaise.toString(),
                physicalAssetsDisplay: formatPaiseToRupees(physicalAssetsPaise)
            };
        } catch (err) {
            console.error('[FamilyFinancialAdapter] getFamilyNetWorthSnapshot error:', err);
            return {
                state: DataAvailabilityState.UNAVAILABLE,
                totalAssetsPaiseStr: '0',
                totalAssetsDisplay: '—',
                totalLiabilitiesPaiseStr: '0',
                totalLiabilitiesDisplay: '—',
                netWorthPaiseStr: '0',
                netWorthDisplay: '—',
                liquidPaiseStr: '0',
                liquidDisplay: '—'
            };
        }
    },

    computeEmergencyLiquidityRunway(liquidPaise, monthlyExpensePaise, options = {}) {
        // Handle UNAVAILABLE source condition
        if (options.status === 'UNAVAILABLE' || options.sourceAvailability === DataAvailabilityState.UNAVAILABLE || liquidPaise === null && monthlyExpensePaise === null) {
            return {
                state: DataAvailabilityState.UNAVAILABLE,
                runwayMonths: null,
                runwayDisplay: '—',
                status: 'UNAVAILABLE',
                liquidDisplay: '—',
                monthlyExpenseDisplay: '—',
                meetsThreeMonthStandard: false,
                reason: 'Cash or Commitments source cannot be read'
            };
        }

        // Handle PARTIAL source condition
        if (options.status === 'PARTIAL' || options.sourceAvailability === DataAvailabilityState.PARTIAL) {
            const liquidVal = liquidPaise !== null && liquidPaise !== undefined ? parseAmountPaise(liquidPaise) : 0n;
            return {
                state: DataAvailabilityState.PARTIAL,
                runwayMonths: null,
                runwayDisplay: '—',
                status: 'PARTIAL',
                liquidDisplay: formatPaiseToRupees(liquidVal),
                monthlyExpenseDisplay: '—',
                missingSource: options.missingSource || 'Required source unavailable',
                meetsThreeMonthStandard: false
            };
        }

        // Handle NOT_CONFIGURED condition
        if (options.status === 'NOT_CONFIGURED' || options.commitmentsCount === 0) {
            const liquidVal = liquidPaise !== null && liquidPaise !== undefined ? parseAmountPaise(liquidPaise) : 0n;
            return {
                state: DataAvailabilityState.NOT_CONFIGURED,
                runwayMonths: null,
                runwayDisplay: '—',
                status: 'NOT_CONFIGURED',
                liquidDisplay: formatPaiseToRupees(liquidVal),
                monthlyExpenseDisplay: '—',
                meetsThreeMonthStandard: false,
                reason: 'User has not configured recurring obligations'
            };
        }

        const liquid = parseAmountPaise(liquidPaise);
        const expense = parseAmountPaise(monthlyExpensePaise);

        if (expense <= 0n) {
            const isZeroOutflowConfigured = options.status === 'NO_COMMITTED_OUTFLOW' || options.status === 'EMPTY';
            return {
                state: isZeroOutflowConfigured ? DataAvailabilityState.EMPTY : DataAvailabilityState.NOT_CONFIGURED,
                runwayMonths: null,
                runwayDisplay: '—',
                status: isZeroOutflowConfigured ? 'NO_COMMITTED_OUTFLOW' : 'NOT_CONFIGURED',
                liquidDisplay: formatPaiseToRupees(liquid),
                monthlyExpenseDisplay: isZeroOutflowConfigured ? formatPaiseToRupees(0n) : '—',
                meetsThreeMonthStandard: false,
                reason: isZeroOutflowConfigured ? 'No active committed outflow is configured' : 'User has not configured recurring obligations'
            };
        }

        const runwayMonths = Number(liquid) / Number(expense);
        let status = 'ADEQUATE';
        if (runwayMonths >= 6.0) {
            status = 'EXCELLENT';
        } else if (runwayMonths < 3.0) {
            status = 'CRITICAL';
        }

        return {
            state: DataAvailabilityState.AVAILABLE,
            runwayMonths: Number(runwayMonths.toFixed(1)),
            runwayDisplay: `${runwayMonths.toFixed(1)} Months`,
            status,
            liquidDisplay: formatPaiseToRupees(liquid),
            monthlyExpenseDisplay: formatPaiseToRupees(expense),
            meetsThreeMonthStandard: runwayMonths >= 3.0
        };
    },

    async resolveFinancialReference(finRef) {
        if (!finRef || !finRef.sourceRecordId) {
            return {
                sourceType: finRef?.sourceType || 'UNKNOWN',
                sourceRecordId: finRef?.sourceRecordId || '',
                sourceDomain: finRef?.sourceDomain || '',
                linkStatus: FinancialLinkStatus.UNLINKED,
                lastVerifiedAt: finRef?.lastVerifiedAt || null,
                sourceAvailability: DataAvailabilityState.NOT_CONFIGURED,
                isResolved: false,
                resolvedRecord: null
            };
        }

        try {
            const domain = (finRef.sourceDomain || '').toLowerCase();
            let sourceItems = null;

            if (domain.includes('invest')) {
                sourceItems = await StorageService.load(STORAGE_KEYS.INVESTMENT_HOLDINGS, []).catch(() => null);
            } else if (domain.includes('loan')) {
                sourceItems = await StorageService.load(STORAGE_KEYS.LOANS, []).catch(() => null);
            } else if (domain.includes('commit') || domain.includes('bill') || domain.includes('recurring')) {
                // First query authoritative Commitments storage
                try {
                    const commitList = await StorageService.load('FINLIFE_COMMITMENTS_V2', []).catch(() => null);
                    const occList = await StorageService.load('FINLIFE_OCCURRENCES_V2', []).catch(() => null);
                    if (commitList || occList) {
                        sourceItems = [...(commitList || []), ...(occList || [])];
                    }
                } catch (_) {}

                // Fallback to legacy BILLS storage key if not found
                if (!sourceItems || sourceItems.length === 0) {
                    sourceItems = await StorageService.load(STORAGE_KEYS.BILLS, []).catch(() => null);
                }
            } else if (domain.includes('prop')) {
                sourceItems = await StorageService.load(STORAGE_KEYS.PROPERTIES, []).catch(() => null);
            } else if (domain.includes('cashbook')) {
                sourceItems = await StorageService.load(STORAGE_KEYS.CASHBOOKS, []).catch(() => null);
            }

            if (sourceItems === null) {
                return {
                    sourceType: finRef.sourceType,
                    sourceRecordId: finRef.sourceRecordId,
                    sourceDomain: finRef.sourceDomain,
                    linkStatus: FinancialLinkStatus.SOURCE_UNAVAILABLE,
                    lastVerifiedAt: finRef.lastVerifiedAt || null,
                    sourceAvailability: DataAvailabilityState.UNAVAILABLE,
                    isResolved: false,
                    resolvedRecord: null
                };
            }

            const record = (sourceItems || []).find(item => item.id === finRef.sourceRecordId);
            if (record) {
                const isPartial = record.amount === undefined && record.value === undefined && record.currentValue === undefined;
                return {
                    sourceType: finRef.sourceType,
                    sourceRecordId: finRef.sourceRecordId,
                    sourceDomain: finRef.sourceDomain,
                    linkStatus: FinancialLinkStatus.LINKED_VERIFIED,
                    lastVerifiedAt: new Date().toISOString(),
                    sourceAvailability: isPartial ? DataAvailabilityState.PARTIAL : DataAvailabilityState.AVAILABLE,
                    isResolved: true,
                    resolvedRecord: record
                };
            }

            return {
                sourceType: finRef.sourceType,
                sourceRecordId: finRef.sourceRecordId,
                sourceDomain: finRef.sourceDomain,
                linkStatus: FinancialLinkStatus.LINKED_UNVERIFIED,
                lastVerifiedAt: finRef.lastVerifiedAt || null,
                sourceAvailability: DataAvailabilityState.EMPTY,
                isResolved: false,
                resolvedRecord: null
            };
        } catch {
            return {
                sourceType: finRef.sourceType,
                sourceRecordId: finRef.sourceRecordId,
                sourceDomain: finRef.sourceDomain,
                linkStatus: FinancialLinkStatus.SOURCE_UNAVAILABLE,
                lastVerifiedAt: finRef.lastVerifiedAt || null,
                sourceAvailability: DataAvailabilityState.UNAVAILABLE,
                isResolved: false,
                resolvedRecord: null
            };
        }
    }
};
