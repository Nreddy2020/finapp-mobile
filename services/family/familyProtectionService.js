/**
 * FinLife Family Protection Service
 * Aggregates policy coverage, renewal countdowns, nominee checks, and uncovered member detection.
 * Zero duplicate transactions; strict BigInt safety.
 */

import {
    PolicyType,
    PolicyStatus,
    CircleCategory,
    FamilyStatus,
    DataAvailabilityState,
    maskSensitiveIdentifier
} from './familyContracts.js';
import { FamilyRepository } from './familyRepository.js';

export function parseAmountPaise(val) {
    if (typeof val === 'bigint') return val;
    if (!val) return 0n;
    if (typeof val === 'number') return BigInt(Math.round(val));
    if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '').trim();
        if (!cleaned) return 0n;
        try {
            return BigInt(cleaned);
        } catch {
            return 0n;
        }
    }
    return 0n;
}

export function formatPaiseToRupees(paise) {
    const p = typeof paise === 'bigint' ? paise : parseAmountPaise(paise);
    const rupees = Number(p / 100n);
    if (rupees >= 10000000) {
        return `₹${(rupees / 10000000).toFixed(2)} Cr`;
    }
    if (rupees >= 100000) {
        return `₹${(rupees / 100000).toFixed(2)} L`;
    }
    return `₹${rupees.toLocaleString('en-IN')}`;
}

export const FamilyProtectionService = {
    async getPolicies(filterFn = null) {
        return await FamilyRepository.getPolicies(filterFn);
    },

    async getPolicyById(id) {
        return await FamilyRepository.getPolicyById(id);
    },

    async savePolicy(policy) {
        return await FamilyRepository.savePolicy(policy);
    },

    async deletePolicy(id) {
        return await FamilyRepository.deletePolicy(id);
    },

    computeDaysUntil(dateStr, today = new Date()) {
        if (!dateStr) return null;
        const target = new Date(dateStr);
        if (isNaN(target.getTime())) return null;
        const diffMs = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    },

    getProtectionSummary(persons = [], policies = [], referenceDate = new Date()) {
        if (!persons.length && !policies.length) {
            return {
                state: DataAvailabilityState.EMPTY,
                totalTermCoveragePaiseStr: '0',
                totalTermCoverageDisplay: '₹0',
                totalHealthCoveragePaiseStr: '0',
                totalHealthCoverageDisplay: '₹0',
                totalAnnualPremiumPaiseStr: '0',
                totalAnnualPremiumDisplay: '₹0',
                activePoliciesCount: 0,
                expiringSoonCount: 0,
                uncoveredMembers: [],
                incompleteNomineePolicies: [],
                policiesList: [],
                readinessScoreBadge: 'NOT_CONFIGURED'
            };
        }

        let totalTermPaise = 0n;
        let totalHealthPaise = 0n;
        let totalPremiumPaise = 0n;
        let activePoliciesCount = 0;
        let expiringSoonCount = 0;

        const healthCoveredPersonIds = new Set();
        const incompleteNomineePolicies = [];
        const enrichedPolicies = [];

        for (const pol of policies) {
            const isActive = pol.status === PolicyStatus.ACTIVE || pol.status === PolicyStatus.EXPIRING_SOON;
            const covPaise = parseAmountPaise(pol.coverageAmountPaise);
            const premPaise = parseAmountPaise(pol.premiumAmountPaise);

            const daysUntilRenewal = this.computeDaysUntil(pol.renewalDate, new Date(referenceDate));
            const isExpiringSoon = daysUntilRenewal !== null && daysUntilRenewal >= 0 && daysUntilRenewal <= 30;

            if (isActive) {
                activePoliciesCount++;
                totalPremiumPaise += premPaise;

                if (pol.policyType === PolicyType.TERM_LIFE) {
                    totalTermPaise += covPaise;
                } else if (pol.policyType === PolicyType.HEALTH) {
                    totalHealthPaise += covPaise;
                    (pol.insuredPersonIds || []).forEach(id => healthCoveredPersonIds.add(id));
                }

                if (isExpiringSoon) {
                    expiringSoonCount++;
                }

                const hasNominees = Array.isArray(pol.nomineePersonIds) && pol.nomineePersonIds.length > 0;
                if (!hasNominees || !pol.nomineeCompleteness) {
                    incompleteNomineePolicies.push({
                        policyId: pol.id,
                        policyName: pol.policyName || pol.provider || 'Unnamed Policy',
                        policyNumberMasked: maskSensitiveIdentifier(pol.policyNumber)
                    });
                }
            }

            enrichedPolicies.push({
                ...pol,
                coverageAmountPaiseStr: covPaise.toString(),
                coverageDisplay: formatPaiseToRupees(covPaise),
                premiumAmountPaiseStr: premPaise.toString(),
                premiumDisplay: formatPaiseToRupees(premPaise),
                policyNumberMasked: maskSensitiveIdentifier(pol.policyNumber),
                daysUntilRenewal,
                isExpiringSoon,
                statusBadge: isExpiringSoon ? PolicyStatus.EXPIRING_SOON : pol.status
            });
        }

        // Detect uncovered active family members
        const activeFamilyMembers = persons.filter(p => {
            const cat = p.core?.circleCategory || p.circleCategory;
            const stat = p.core?.status || p.status;
            return cat === CircleCategory.FAMILY && stat === FamilyStatus.ACTIVE;
        });

        const uncoveredMembers = activeFamilyMembers
            .filter(p => !healthCoveredPersonIds.has(p.core?.id || p.id))
            .map(p => ({
                id: p.core?.id || p.id,
                name: p.core?.name || p.name || 'Unknown',
                role: p.core?.role || p.role || 'MEMBER'
            }));

        let readinessScoreBadge = 'ADEQUATE';
        if (uncoveredMembers.length > 0 || incompleteNomineePolicies.length > 0 || expiringSoonCount > 0) {
            readinessScoreBadge = 'NEEDS_ATTENTION';
        } else if (totalTermPaise >= 1000000000n && totalHealthPaise >= 250000000n) {
            readinessScoreBadge = 'EXCELLENT';
        }

        return {
            state: DataAvailabilityState.AVAILABLE,
            totalTermCoveragePaiseStr: totalTermPaise.toString(),
            totalTermCoverageDisplay: formatPaiseToRupees(totalTermPaise),
            totalHealthCoveragePaiseStr: totalHealthPaise.toString(),
            totalHealthCoverageDisplay: formatPaiseToRupees(totalHealthPaise),
            totalAnnualPremiumPaiseStr: totalPremiumPaise.toString(),
            totalAnnualPremiumDisplay: formatPaiseToRupees(totalPremiumPaise),
            activePoliciesCount,
            expiringSoonCount,
            uncoveredMembers,
            incompleteNomineePolicies,
            policiesList: enrichedPolicies,
            readinessScoreBadge
        };
    }
};
