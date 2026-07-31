import { StorageService, STORAGE_KEYS } from './storage';
import { mockProperties } from './mockData';

export const PropertiesService = {
    // Get all properties
    getProperties: async () => {
        let data = await StorageService.load(STORAGE_KEYS.PROPERTIES);
        if (!data || data.length === 0) {
            data = mockProperties;
            await StorageService.save(STORAGE_KEYS.PROPERTIES, data);
        }
        return data || [];
    },

    // Add a new property
    addProperty: async (property) => {
        const properties = await PropertiesService.getProperties();
        const newProperty = {
            id: Date.now().toString(),
            name: property.name,
            type: property.type, // 'Apartment', 'House', 'Land', 'Commercial'
            location: property.location,
            purchasePrice: parseFloat(property.purchasePrice) || 0,
            currentValue: parseFloat(property.currentValue) || 0,
            purchaseDate: property.purchaseDate || new Date().toISOString().split('T')[0],
            isRented: property.isRented || false,
            rentalIncome: parseFloat(property.rentalIncome) || 0,
            description: property.description || '',
            images: property.images || [], // Array of URIs
        };

        const updated = [newProperty, ...properties];
        await StorageService.save(STORAGE_KEYS.PROPERTIES, updated);
        return updated;
    },

    // Update property
    updateProperty: async (id, updates) => {
        const properties = await PropertiesService.getProperties();
        const updated = properties.map(p =>
            p.id === id ? { ...p, ...updates } : p
        );
        await StorageService.save(STORAGE_KEYS.PROPERTIES, updated);
        return updated;
    },

    // Delete property
    deleteProperty: async (id) => {
        const properties = await PropertiesService.getProperties();
        const updated = properties.filter(p => p.id !== id);
        await StorageService.save(STORAGE_KEYS.PROPERTIES, updated);
        return updated;
    },

    // Calculate total portfolio value
    calculateTotalValue: (properties) => {
        return properties.reduce((sum, p) => sum + (parseFloat(p.currentValue) || 0), 0);
    },

    // Calculate total rental yield
    calculateTotalRentalIncome: (properties) => {
        return properties.reduce((sum, p) => sum + (parseFloat(p.rentalIncome) || 0), 0);
    }
};
