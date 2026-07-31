import { StorageService, STORAGE_KEYS } from './storage';

export const ApartmentService = {
    getMaintenanceLogs: async () => {
        return await StorageService.load(STORAGE_KEYS.APARTMENT_DATA) || [];
    },

    addMaintenanceLog: async (log) => {
        const logs = await ApartmentService.getMaintenanceLogs();
        const newLog = {
            id: Date.now().toString(),
            month: log.month,
            year: log.year,
            amount: parseFloat(log.amount),
            status: log.status || 'pending',
            due_date: log.due_date,
            paid_date: log.status === 'paid' ? new Date().toISOString().split('T')[0] : null
        };
        const updated = [newLog, ...logs];
        await StorageService.save(STORAGE_KEYS.APARTMENT_DATA, updated);
        return updated;
    },

    updateLogStatus: async (id, status) => {
        const logs = await ApartmentService.getMaintenanceLogs();
        const updated = logs.map(l =>
            l.id === id ? { ...l, status: status, paid_date: status === 'paid' ? new Date().toISOString().split('T')[0] : null } : l
        );
        await StorageService.save(STORAGE_KEYS.APARTMENT_DATA, updated);
        return updated;
    },

    // Seed defaults if empty
    seedDefaults: async () => {
        const logs = await ApartmentService.getMaintenanceLogs();
        if (logs.length === 0) {
            const defaults = [
                { id: '1', month: 'July', year: '2024', amount: 3500, status: 'pending', due_date: '2024-07-10' },
                { id: '2', month: 'June', year: '2024', amount: 3500, status: 'paid', due_date: '2024-06-10', paid_date: '2024-06-05' }
            ];
            await StorageService.save(STORAGE_KEYS.APARTMENT_DATA, defaults);
            return defaults;
        }
        return logs;
    }
};
