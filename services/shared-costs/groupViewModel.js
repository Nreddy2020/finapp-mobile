/**
 * services/shared-costs/groupViewModel.js
 * 
 * FinLife Shared Costs & Groups Accounting Engine V1 — ViewModel Layer.
 * 
 * Orchestrates domain services, repository operations, UI projections,
 * and demo data seeding tailored to the 12-screen design mockup.
 */

import { GroupRepository } from './groupRepository.js';
import { GroupBalanceEngine } from './groupBalanceEngine.js';
import { SplitCalculator } from './splitCalculator.js';
import { SettlementOptimizer } from './settlementOptimizer.js';
import {
    SPLIT_METHODS,
    GROUP_TYPES,
    MEMBER_ROLES,
    toPaise,
    paiseToRupees,
    toRupeesFormatted
} from './groupContracts.js';

export const GroupViewModel = {
    /**
     * Get dashboard view data for the main Shared Costs screen
     */
    async getDashboardData(currentUserId = 'You') {
        const groups = await GroupRepository.getAllGroups();

        // Calculate user summary
        const userSummary = GroupBalanceEngine.aggregateUserDashboard(
            currentUserId,
            groups.map(g => g.balanceSummary)
        );

        return {
            groups,
            userSummary: {
                ...userSummary,
                youOweFormatted: toRupeesFormatted(userSummary.youOwePaise),
                youAreOwedFormatted: toRupeesFormatted(userSummary.youAreOwedPaise),
                netBalanceFormatted: toRupeesFormatted(userSummary.netBalancePaise)
            },
            hasGroups: groups.length > 0
        };
    },

    /**
     * Get detailed view for a single group
     */
    async getGroupDetail(groupId, currentUserId = 'You') {
        const groupData = await GroupRepository.getGroupById(groupId);
        if (!groupData) return null;

        const { balanceResult } = groupData;
        const projections = balanceResult.projections;

        // User's balance in this specific group
        const userProj = balanceResult.projectionMap[currentUserId] || null;
        const userNetPaise = userProj ? userProj.netBalancePaise : 0n;

        // Debt simplification / settlement recommendations
        const settlementPlan = SettlementOptimizer.simplifyDebts(projections);

        return {
            ...groupData,
            userBalance: {
                netBalancePaise: userNetPaise,
                netBalanceFormatted: toRupeesFormatted(userNetPaise),
                status: userNetPaise > 0n ? 'CREDITOR' : userNetPaise < 0n ? 'DEBTOR' : 'SETTLED'
            },
            settlementPlan
        };
    },

    /**
     * Create a group
     */
    async createGroup({ name, type = 'TRIP', memberNames = [], defaultSplitMethod = 'EQUAL' }) {
        const members = [
            { id: 'You', displayNameSnapshot: 'You', role: MEMBER_ROLES.OWNER }
        ];

        memberNames.forEach((n, idx) => {
            const clean = String(n || '').trim();
            if (clean && clean.toLowerCase() !== 'you') {
                members.push({
                    id: `m_${Date.now()}_${idx}`,
                    displayNameSnapshot: clean,
                    role: MEMBER_ROLES.MEMBER
                });
            }
        });

        return await GroupRepository.createGroup({
            name,
            type,
            members,
            defaultSplitMethod
        });
    },

    /**
     * Create an expense with split calculation
     */
    async addExpense(groupId, {
        title,
        amount,
        splitMethod = SPLIT_METHODS.EQUAL,
        payerMemberId = 'You',
        participantMemberIds = null,
        exactShares = null,
        percentages = null,
        sharesInput = null,
        notes = '',
        category = 'General',
        expenseDate = new Date().toISOString()
    }) {
        const group = await GroupRepository.getGroupById(groupId);
        if (!group) throw new Error(`GROUP_NOT_FOUND: Group '${groupId}' not found`);

        const totalPaise = toPaise(amount);

        // Determine participants
        const participants = Array.isArray(participantMemberIds) && participantMemberIds.length > 0
            ? group.members.filter(m => participantMemberIds.includes(m.id))
            : group.members;

        let splitResult;
        switch (splitMethod) {
            case SPLIT_METHODS.EXACT:
                splitResult = SplitCalculator.splitExact(totalPaise, exactShares);
                break;
            case SPLIT_METHODS.PERCENTAGE:
                splitResult = SplitCalculator.splitPercentage(totalPaise, percentages);
                break;
            case SPLIT_METHODS.SHARES:
                splitResult = SplitCalculator.splitShares(totalPaise, sharesInput);
                break;
            case SPLIT_METHODS.EQUAL:
            default:
                splitResult = SplitCalculator.splitEqual(totalPaise, participants);
                break;
        }

        // Payer
        const payments = [
            {
                id: `pay_${Date.now()}`,
                memberId: payerMemberId,
                amountPaise: totalPaise,
                paymentMethod: 'UPI',
                cashbookBindingId: null
            }
        ];

        return await GroupRepository.addExpense(groupId, {
            title,
            category,
            totalAmountPaise: totalPaise,
            expenseDate,
            splitMethod,
            notes,
            payments,
            shares: splitResult.shares
        });
    },

    /**
     * Settle an individual debt
     */
    async recordSettlement(groupId, { fromMemberId, toMemberId, amount, method = 'UPI', note = '' }) {
        const amountPaise = toPaise(amount);
        return await GroupRepository.recordSettlement(groupId, {
            fromMemberId,
            toMemberId,
            amountPaise,
            method,
            note
        });
    },

    /**
     * One-tap batch settlement: apply all simplified debt suggestions
     */
    async settleAllSuggestions(groupId, suggestions = [], method = 'UPI') {
        const results = [];
        for (const sugg of suggestions) {
            const res = await GroupRepository.recordSettlement(groupId, {
                fromMemberId: sugg.fromMemberId,
                toMemberId: sugg.toMemberId,
                amountPaise: sugg.amountPaise,
                method,
                note: `Batch settlement: ${sugg.description}`
            });
            results.push(res);
        }
        return results;
    },

    /**
     * Seed representative demo data matching the user's 12-screen design mockup
     */
    async seedMockupDemoData() {
        await GroupRepository.clearStore();

        // 1. Goa Trip Group
        const goaGroup = await GroupRepository.createGroup({
            id: 'grp_goa_trip',
            name: 'Goa Trip',
            type: GROUP_TYPES.TRIP,
            description: 'Beach vacation with friends',
            members: [
                { id: 'You', displayNameSnapshot: 'You', role: MEMBER_ROLES.OWNER },
                { id: 'm_ravi', displayNameSnapshot: 'Ravi', role: MEMBER_ROLES.MEMBER },
                { id: 'm_priya', displayNameSnapshot: 'Priya', role: MEMBER_ROLES.MEMBER },
                { id: 'm_amit', displayNameSnapshot: 'Amit', role: MEMBER_ROLES.MEMBER },
                { id: 'm_neha', displayNameSnapshot: 'Neha', role: MEMBER_ROLES.MEMBER }
            ]
        });

        // Expense 1: Flight Tickets (Paid by You, ₹22,500, split equal 5 ways = ₹4,500 each)
        const exp1Split = SplitCalculator.splitEqual(toPaise(22500), goaGroup.members);
        await GroupRepository.addExpense('grp_goa_trip', {
            title: 'Flight Tickets (Goa Roundtrip)',
            category: 'Travel',
            totalAmountPaise: toPaise(22500),
            expenseDate: '2026-08-10T10:00:00.000Z',
            splitMethod: SPLIT_METHODS.EQUAL,
            payments: [{ id: 'pay_goa_1', memberId: 'You', amountPaise: toPaise(22500), paymentMethod: 'CARD' }],
            shares: exp1Split.shares
        });

        // Expense 2: Beachfront Villa Booking (Paid by Ravi, ₹30,000, split equal 5 ways = ₹6,000 each)
        const exp2Split = SplitCalculator.splitEqual(toPaise(30000), goaGroup.members);
        await GroupRepository.addExpense('grp_goa_trip', {
            title: 'Candolim Villa (3 Nights)',
            category: 'Stay',
            totalAmountPaise: toPaise(30000),
            expenseDate: '2026-08-11T14:30:00.000Z',
            splitMethod: SPLIT_METHODS.EQUAL,
            payments: [{ id: 'pay_goa_2', memberId: 'm_ravi', amountPaise: toPaise(30000), paymentMethod: 'UPI' }],
            shares: exp2Split.shares
        });

        // Expense 3: Beach Shack Dinner & Drinks (Paid by Priya, ₹8,750, split equal 5 ways = ₹1,750 each)
        const exp3Split = SplitCalculator.splitEqual(toPaise(8750), goaGroup.members);
        await GroupRepository.addExpense('grp_goa_trip', {
            title: 'Curlies Shack Seafood Dinner',
            category: 'Food',
            totalAmountPaise: toPaise(8750),
            expenseDate: '2026-08-12T21:00:00.000Z',
            splitMethod: SPLIT_METHODS.EQUAL,
            payments: [{ id: 'pay_goa_3', memberId: 'm_priya', amountPaise: toPaise(8750), paymentMethod: 'UPI' }],
            shares: exp3Split.shares
        });

        // Expense 4: Water Sports Package (Paid by You, ₹6,000, split among 4 participants: You, Ravi, Amit, Neha)
        const waterSportsMembers = goaGroup.members.filter(m => m.id !== 'm_priya');
        const exp4Split = SplitCalculator.splitEqual(toPaise(6000), waterSportsMembers);
        await GroupRepository.addExpense('grp_goa_trip', {
            title: 'Scuba & Jet Ski Package',
            category: 'Activities',
            totalAmountPaise: toPaise(6000),
            expenseDate: '2026-08-13T11:00:00.000Z',
            splitMethod: SPLIT_METHODS.EQUAL,
            payments: [{ id: 'pay_goa_4', memberId: 'You', amountPaise: toPaise(6000), paymentMethod: 'UPI' }],
            shares: exp4Split.shares
        });

        // Settlement: Amit paid Ravi ₹5,000 via UPI
        await GroupRepository.recordSettlement('grp_goa_trip', {
            fromMemberId: 'm_amit',
            toMemberId: 'm_ravi',
            amountPaise: toPaise(5000),
            method: 'UPI',
            note: 'Settling flight and villa part'
        });

        // 2. Home Expenses Group
        const homeGroup = await GroupRepository.createGroup({
            id: 'grp_home_expenses',
            name: 'Home Expenses',
            type: GROUP_TYPES.HOME,
            description: 'Flat 402 shared expenses',
            members: [
                { id: 'You', displayNameSnapshot: 'You', role: MEMBER_ROLES.OWNER },
                { id: 'm_vikram', displayNameSnapshot: 'Vikram', role: MEMBER_ROLES.MEMBER },
                { id: 'm_ananya', displayNameSnapshot: 'Ananya', role: MEMBER_ROLES.MEMBER }
            ]
        });

        // Home Expense 1: Groceries (Paid by Vikram, ₹4,500, split 3 ways)
        const home1Split = SplitCalculator.splitEqual(toPaise(4500), homeGroup.members);
        await GroupRepository.addExpense('grp_home_expenses', {
            title: 'Blinkit Monthly Grocery Haul',
            category: 'Groceries',
            totalAmountPaise: toPaise(4500),
            expenseDate: '2026-08-01T12:00:00.000Z',
            splitMethod: SPLIT_METHODS.EQUAL,
            payments: [{ id: 'pay_home_1', memberId: 'm_vikram', amountPaise: toPaise(4500), paymentMethod: 'UPI' }],
            shares: home1Split.shares
        });

        // Home Expense 2: Electricity Bill (Paid by You, ₹2,400, split 3 ways)
        const home2Split = SplitCalculator.splitEqual(toPaise(2400), homeGroup.members);
        await GroupRepository.addExpense('grp_home_expenses', {
            title: 'Bescom Electricity Bill',
            category: 'Utilities',
            totalAmountPaise: toPaise(2400),
            expenseDate: '2026-08-05T09:30:00.000Z',
            splitMethod: SPLIT_METHODS.EQUAL,
            payments: [{ id: 'pay_home_2', memberId: 'You', amountPaise: toPaise(2400), paymentMethod: 'BANK_TRANSFER' }],
            shares: home2Split.shares
        });

        // 3. Office Friends Group
        const officeGroup = await GroupRepository.createGroup({
            id: 'grp_office_friends',
            name: 'Office Friends',
            type: GROUP_TYPES.DINING,
            description: 'Lunch and coffee outings',
            members: [
                { id: 'You', displayNameSnapshot: 'You', role: MEMBER_ROLES.OWNER },
                { id: 'm_karthik', displayNameSnapshot: 'Karthik', role: MEMBER_ROLES.MEMBER },
                { id: 'm_sneha', displayNameSnapshot: 'Sneha', role: MEMBER_ROLES.MEMBER },
                { id: 'm_rahul', displayNameSnapshot: 'Rahul', role: MEMBER_ROLES.MEMBER }
            ]
        });

        // Office Expense 1: Team Buffet (Paid by Sneha, ₹3,600, split 4 ways)
        const off1Split = SplitCalculator.splitEqual(toPaise(3600), officeGroup.members);
        await GroupRepository.addExpense('grp_office_friends', {
            title: 'Friday Buffet Lunch',
            category: 'Dining',
            totalAmountPaise: toPaise(3600),
            expenseDate: '2026-08-08T13:30:00.000Z',
            splitMethod: SPLIT_METHODS.EQUAL,
            payments: [{ id: 'pay_off_1', memberId: 'm_sneha', amountPaise: toPaise(3600), paymentMethod: 'CARD' }],
            shares: off1Split.shares
        });

        return await this.getDashboardData('You');
    }
};
