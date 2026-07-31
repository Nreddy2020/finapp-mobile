// Additional mock data for empathy-driven features

export const mockMedicines = [
    {
        id: 1,
        name: 'Metformin 500mg',
        dosage: '1-0-1',
        quantity: 30,
        days_left: 3, // URGENT
        cost: 120,
        generic_available: true,
        generic_cost: 45,
        pharmacy: 'Apollo Pharmacy',
        condition: 'Diabetes Type 2'
    },
    {
        id: 2,
        name: 'Amlodipine 5mg',
        dosage: '0-0-1',
        quantity: 30,
        days_left: 5, // LOW
        cost: 85,
        generic_available: true,
        generic_cost: 32,
        pharmacy: 'MedPlus',
        condition: 'High Blood Pressure'
    },
    {
        id: 3,
        name: 'Atorvastatin 10mg',
        dosage: '0-0-1',
        quantity: 30,
        days_left: 12, // OK
        cost: 150,
        generic_available: true,
        generic_cost: 55,
        pharmacy: '1mg Online',
        condition: 'High Cholesterol'
    },
    {
        id: 4,
        name: 'Paracetamol 500mg',
        dosage: 'As needed (max 3/day)',
        quantity: 10,
        days_left: 2, // URGENT
        cost: 25,
        generic_available: false,
        pharmacy: 'Local Pharmacy',
        condition: 'Pain Relief'
    }
];

export const mockDebtAnalysis = {
    monthly_income: 25000,
    total_monthly_debt: 14500, // 58% DTI - DANGER!
    dti_ratio: 58,
    status: 'danger',
    total_potential_savings: 32400 // per year
};

export const getMedicines = async () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(mockMedicines), 300);
    });
};

export const getDebtAnalysis = async () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(mockDebtAnalysis), 300);
    });
};
