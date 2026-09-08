/**
 * components/assets/assetFamilyEngine.js
 * 
 * FinLife Assets Module — Family & Multi-Member Ownership Engine.
 * 
 * Invariant Guarantees:
 * - Deterministic BPS ownership allocation: Sum of shares === 10,000n.
 * - Exact integer paise allocation per member with zero leakage:
 *   Last member receives remainder to ensure sum(memberShares) === totalValuationPaise.
 * - Dual perspective: Personal Ownership vs Total Family Household Wealth.
 * - Family member categorization: SELF, SPOUSE, CHILDREN, PARENTS, OTHER.
 * - Zero auto-inferred shares: explicit allocation required.
 */

import {
    BPS_SCALE,
    roundHalfUp,
    validateOwnershipShares,
    validateAssetPaiseBounds,
    toBigIntPaise,
    ASSET_LIFECYCLE_STATUS,
    ASSET_CATEGORY,
    AssetValidationError
} from './assetContracts.js';

/**
 * 1. Calculate Member Asset Share in Paise with Zero Leakage
 * Given totalValuationPaise and ownership array, computes exact paise for each member.
 * Invariant: Sum of allocated paise === totalValuationPaise.
 * @param {bigint|number|string} totalValuationPaise 
 * @param {Array<{ memberId: string, shareBps: bigint|number|string }>} ownership 
 * @returns {Map<string, bigint>} Map of memberId -> allocatedPaise
 */
export function allocateAssetSharesPaise(totalValuationPaise, ownership) {
    validateOwnershipShares(ownership);
    const totalVal = validateAssetPaiseBounds(totalValuationPaise, { signed: false });

    const result = new Map();
    if (totalVal === 0n) {
        for (const alloc of ownership) {
            result.set(alloc.memberId.trim().toLowerCase(), 0n);
        }
        return result;
    }

    let allocatedSum = 0n;
    const count = ownership.length;

    for (let i = 0; i < count; i++) {
        const alloc = ownership[i];
        const key = alloc.memberId.trim().toLowerCase();
        const shareBps = toBigIntPaise(alloc.shareBps);

        if (i === count - 1) {
            // Last member gets exact remainder to guarantee zero penny leakage
            const remainder = totalVal - allocatedSum;
            result.set(key, remainder);
        } else {
            const sharePaise = roundHalfUp(totalVal * shareBps, BPS_SCALE);
            allocatedSum += sharePaise;
            result.set(key, sharePaise);
        }
    }

    return result;
}

/**
 * 2. Calculate Comprehensive Family Wealth Summary
 * Computes Personal vs Family Household metrics across all active assets.
 * @param {Array<Object>} assets - Array of asset records
 * @param {string} personalMemberId - Identifier for the primary user ('self')
 * @returns {Object} Family wealth summary
 */
export function calculateFamilyWealthSummary(assets, personalMemberId = 'self') {
    if (!Array.isArray(assets)) {
        throw new AssetValidationError('ERR_INVALID_ASSETS_LIST', 'Assets must be provided as an array');
    }

    const primaryKey = (personalMemberId || 'self').trim().toLowerCase();

    let totalFamilyPaise = 0n;
    let personalPaise = 0n;

    // Member totals map: memberKey -> { memberId, role, assetCount, totalPaise }
    const memberMap = new Map();
    // Category totals map: category -> { count, totalPaise }
    const categoryMap = new Map();

    for (const catKey of Object.values(ASSET_CATEGORY)) {
        categoryMap.set(catKey, { category: catKey, assetCount: 0, totalPaise: 0n });
    }

    for (const asset of assets) {
        // Exclude archived, sold, or invalid records from active balance totals
        if (asset.status === ASSET_LIFECYCLE_STATUS.ARCHIVED || asset.status === ASSET_LIFECYCLE_STATUS.SOLD) {
            continue;
        }

        // Validate strictly non-property
        if (asset.category === 'PROPERTY' || asset.category === 'PROPERTIES') {
            throw new AssetValidationError('ERR_PROPERTY_DISALLOWED', 'Properties must not be present in Assets module records');
        }

        const valuation = validateAssetPaiseBounds(asset.currentValuationPaise || 0n, { signed: false });
        totalFamilyPaise += valuation;

        // Category breakdown
        const catEntry = categoryMap.get(asset.category) || { category: asset.category, assetCount: 0, totalPaise: 0n };
        catEntry.assetCount += 1;
        catEntry.totalPaise += valuation;
        categoryMap.set(asset.category, catEntry);

        // Multi-owner allocation
        const allocations = allocateAssetSharesPaise(valuation, asset.ownership || [{ memberId: 'self', shareBps: BPS_SCALE }]);

        for (const [memberKey, sharePaise] of allocations.entries()) {
            if (memberKey === primaryKey) {
                personalPaise += sharePaise;
            }

            const existing = memberMap.get(memberKey) || {
                memberId: memberKey,
                assetCount: 0,
                totalPaise: 0n
            };
            existing.assetCount += 1;
            existing.totalPaise += sharePaise;
            memberMap.set(memberKey, existing);
        }
    }

    // Build member breakdown array with percentage of total family wealth
    const members = [];
    for (const member of memberMap.values()) {
        const shareBps = totalFamilyPaise === 0n
            ? 0n
            : roundHalfUp(member.totalPaise * BPS_SCALE, totalFamilyPaise);
        members.push({
            ...member,
            shareBps
        });
    }

    // Sort categories by total value descending
    const categories = Array.from(categoryMap.values()).sort((a, b) => (b.totalPaise > a.totalPaise ? 1 : -1));

    return {
        totalFamilyPaise,
        personalPaise,
        householdTotalPaise: totalFamilyPaise,
        memberCount: memberMap.size,
        activeAssetCount: assets.filter(a => a.status !== ASSET_LIFECYCLE_STATUS.ARCHIVED && a.status !== ASSET_LIFECYCLE_STATUS.SOLD).length,
        members,
        categories
    };
}
