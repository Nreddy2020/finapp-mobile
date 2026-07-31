import { saveData, loadData, STORAGE_KEYS } from './storage';

export const BillService = {
    /**
     * Get all bills
     * @returns {Promise<Array>}
     */
    getBills: async () => {
        return await loadData(STORAGE_KEYS.BILLS, []) || [];
    },

    /**
     * Add a new bill reminder
     * @param {Object} billData 
     * @returns {Promise<Array>} Updated bills list
     */
    addBill: async (billData) => {
        const bills = await BillService.getBills();
        const newBill = {
            id: Date.now().toString(),
            paid: false,
            ...billData,
            createdAt: new Date().toISOString()
        };
        const updatedBills = [...bills, newBill];
        await saveData(STORAGE_KEYS.BILLS, updatedBills);
        return updatedBills;
    },

    /**
     * Update an existing bill
     * @param {Object} updatedBill 
     * @returns {Promise<Array>} Updated bills list
     */
    updateBill: async (updatedBill) => {
        const bills = await BillService.getBills();
        const updatedBills = bills.map(b => b.id === updatedBill.id ? { ...b, ...updatedBill } : b);
        await saveData(STORAGE_KEYS.BILLS, updatedBills);
        return updatedBills;
    },

    /**
     * Delete a bill
     * @param {string} id 
     * @returns {Promise<Array>} Updated bills list
     */
    deleteBill: async (id) => {
        const bills = await BillService.getBills();
        const updatedBills = bills.filter(b => b.id !== id);
        await saveData(STORAGE_KEYS.BILLS, updatedBills);
        return updatedBills;
    },

    /**
     * Toggle paid status of a bill
     * @param {string} id 
     * @param {boolean} status 
     * @returns {Promise<Array>} Updated bills list
     */
    setPaidStatus: async (id, status) => {
        const bills = await BillService.getBills();
        const updatedBills = bills.map(b => b.id === id ? { ...b, paid: status } : b);
        await saveData(STORAGE_KEYS.BILLS, updatedBills);
        return updatedBills;
    }
};
