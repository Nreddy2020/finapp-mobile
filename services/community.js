import { StorageService, STORAGE_KEYS } from './storage';

export const CommunityService = {
    // Get all pools
    getPools: async () => {
        const data = await StorageService.load(STORAGE_KEYS.COMMUNITY_POOLS);
        return data || [];
    },

    // Create a new pool
    createPool: async (pool) => {
        const pools = await CommunityService.getPools();
        const newPool = {
            id: Date.now().toString(),
            name: pool.name,
            targetAmount: parseFloat(pool.targetAmount) || 0,
            monthlyContribution: parseFloat(pool.monthlyContribution) || 0,
            durationMonths: parseInt(pool.durationMonths) || 12,
            members: pool.members || [], // Array of names
            currentCycle: 1,
            startDate: new Date().toISOString().split('T')[0],
            status: 'Active', // Active, Completed
            payoutHistory: [], // [{ cycle, member, amount }]
            contributions: {}, // { cycle: { member: amount } }
        };

        const updated = [newPool, ...pools];
        await StorageService.save(STORAGE_KEYS.COMMUNITY_POOLS, updated);
        return updated;
    },

    // Delete pool
    deletePool: async (id) => {
        const pools = await CommunityService.getPools();
        const updated = pools.filter(p => p.id !== id);
        await StorageService.save(STORAGE_KEYS.COMMUNITY_POOLS, updated);
        return updated;
    },

    // Calculate details
    getPoolDetails: (pool) => {
        const totalCollected = pool.monthlyContribution * pool.members.length * (pool.currentCycle - 1); // Mock calculation for now
        const potValue = pool.monthlyContribution * pool.members.length;

        return {
            totalCollected,
            potValue,
            nextPayout: potValue, // Simplified ROSCA logic
        };
    }
};
