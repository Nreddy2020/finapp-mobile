import { StorageService, STORAGE_KEYS } from './storage';

export const AssetsService = {
    // Get all physical assets
    getAssets: async () => {
        const data = await StorageService.load(STORAGE_KEYS.ASSETS);
        return data || [];
    },

    // Add asset
    addAsset: async (asset) => {
        const assets = await AssetsService.getAssets();
        const newAsset = {
            id: Date.now().toString(),
            name: asset.name,
            category: asset.category, // 'Gold', 'Electronics', 'Vehicle', 'Watch', 'Art', 'Other'
            purchasePrice: parseFloat(asset.purchasePrice) || 0,
            currentValue: parseFloat(asset.currentValue) || 0,
            purchaseDate: asset.purchaseDate || new Date().toISOString().split('T')[0],
            description: asset.description || '',
            image: asset.image || null,
        };

        const updated = [newAsset, ...assets];
        await StorageService.save(STORAGE_KEYS.ASSETS, updated);
        return updated;
    },

    // Update asset
    updateAsset: async (id, updates) => {
        const assets = await AssetsService.getAssets();
        const updated = assets.map(a =>
            a.id === id ? { ...a, ...updates } : a
        );
        await StorageService.save(STORAGE_KEYS.ASSETS, updated);
        return updated;
    },

    // Delete asset
    deleteAsset: async (id) => {
        const assets = await AssetsService.getAssets();
        const updated = assets.filter(a => a.id !== id);
        await StorageService.save(STORAGE_KEYS.ASSETS, updated);
        return updated;
    },

    // Calculate total value
    calculateTotalValue: (assets) => {
        return assets.reduce((sum, a) => sum + (parseFloat(a.currentValue) || 0), 0);
    }
};
