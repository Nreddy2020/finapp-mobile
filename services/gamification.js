import { StorageService, STORAGE_KEYS } from './storage';

export const GamificationService = {
    // Get stats
    getStats: async () => {
        const points = await StorageService.load(STORAGE_KEYS.USER_POINTS) || { total: 0, history: [] };
        const badges = await StorageService.load(STORAGE_KEYS.USER_BADGES) || [];

        return {
            totalPoints: points.total,
            level: Math.floor(points.total / 1000) + 1,
            nextLevelAt: (Math.floor(points.total / 1000) + 1) * 1000,
            badges,
            history: points.history || []
        };
    },

    // Award points
    awardPoints: async (amount, reason) => {
        const points = await StorageService.load(STORAGE_KEYS.USER_POINTS) || { total: 0, history: [] };

        const newTotal = points.total + amount;
        const newEntry = {
            id: Date.now().toString(),
            amount,
            reason,
            date: new Date().toISOString()
        };

        const updatedPoints = {
            total: newTotal,
            history: [newEntry, ...(points.history || [])]
        };

        await StorageService.save(STORAGE_KEYS.USER_POINTS, updatedPoints);
        await GamificationService.checkBadges(newTotal);

        return updatedPoints;
    },

    // Check and award badges
    checkBadges: async (totalPoints) => {
        let badges = await StorageService.load(STORAGE_KEYS.USER_BADGES) || [];
        const newBadges = [...badges];

        if (totalPoints >= 100 && !badges.includes('novice')) newBadges.push('novice');
        if (totalPoints >= 1000 && !badges.includes('expert')) newBadges.push('expert');
        if (totalPoints >= 5000 && !badges.includes('master')) newBadges.push('master');

        if (newBadges.length > badges.length) {
            await StorageService.save(STORAGE_KEYS.USER_BADGES, newBadges);
        }
    }
};

export const BADGE_DETAILS = {
    novice: { name: 'Bronze Saver', icon: '🥉', desc: 'Earned 100 points' },
    expert: { name: 'Silver Investor', icon: '🥈', desc: 'Earned 1000 points' },
    master: { name: 'Gold Tycoon', icon: '🥇', desc: 'Earned 5000 points' }
};
