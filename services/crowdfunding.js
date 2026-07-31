import { StorageService, STORAGE_KEYS } from './storage';

export const CrowdfundingService = {
    // Get all campaigns
    getCampaigns: async () => {
        const data = await StorageService.load(STORAGE_KEYS.CROWDFUNDING_CAMPAIGNS);
        /* If empty, seed some mock data for the user to see */
        if (!data || data.length === 0) {
            return [
                {
                    id: '1',
                    title: 'Eco-Friendly Schools',
                    category: 'Education',
                    organizer: 'Green Earth Foundation',
                    target: 500000,
                    raised: 325000,
                    description: 'Building solar panels for rural schools.',
                    image: null,
                    donors: 124,
                },
                {
                    id: '2',
                    title: 'Medical Aid for Ravi',
                    category: 'Medical',
                    organizer: 'Friends of Ravi',
                    target: 1000000,
                    raised: 850000,
                    description: 'Support Ravi\'s heart transplant surgery.',
                    image: null,
                    donors: 312,
                }
            ];
        }
        return data;
    },

    // Create campaign
    createCampaign: async (campaign) => {
        const campaigns = await CrowdfundingService.getCampaigns();
        const newCampaign = {
            id: Date.now().toString(),
            title: campaign.title,
            category: campaign.category,
            organizer: campaign.organizer || 'User',
            target: parseFloat(campaign.target) || 0,
            raised: 0,
            description: campaign.description,
            donors: 0,
        };

        const updated = [newCampaign, ...campaigns];
        await StorageService.save(STORAGE_KEYS.CROWDFUNDING_CAMPAIGNS, updated);
        return updated;
    },

    // Donate (Simulated)
    donateToCampaign: async (id, amount) => {
        const campaigns = await CrowdfundingService.getCampaigns();
        const updated = campaigns.map(c =>
            c.id === id ? {
                ...c,
                raised: c.raised + parseFloat(amount),
                donors: c.donors + 1
            } : c
        );
        await StorageService.save(STORAGE_KEYS.CROWDFUNDING_CAMPAIGNS, updated);
        return updated;
    }
};
