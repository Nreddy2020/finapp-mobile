import { loadData, saveData, STORAGE_KEYS } from './storage';
import { mockCareerGoals, mockRoiHistory } from './mockData';

export const CareerService = {
    // Get all data
    getData: async () => {
        let goals = await loadData(STORAGE_KEYS.CAREER_GOALS, []);
        let roiHistory = await loadData(STORAGE_KEYS.CAREER_DOI, []);

        if (!goals || goals.length === 0) {
            goals = mockCareerGoals;
            await saveData(STORAGE_KEYS.CAREER_GOALS, goals);
        }

        if (!roiHistory || roiHistory.length === 0) {
            roiHistory = mockRoiHistory;
            await saveData(STORAGE_KEYS.CAREER_DOI, roiHistory);
        }

        return { goals, roiHistory };
    },

    // Add a career goal
    addGoal: async (title, targetDate, type = 'Skill') => {
        const goals = await loadData(STORAGE_KEYS.CAREER_GOALS, []);
        const newGoal = {
            id: Date.now().toString(),
            title,
            targetDate, // e.g., "Dec 2026"
            type, // Skill, Role, Income
            completed: false,
            createdAt: new Date().toISOString()
        };
        const updated = [newGoal, ...goals];
        await saveData(STORAGE_KEYS.CAREER_GOALS, updated);
        return updated;
    },

    // Toggle goal completion
    toggleGoal: async (id) => {
        const goals = await loadData(STORAGE_KEYS.CAREER_GOALS, []);
        const updated = goals.map(g => {
            if (g.id === id) return { ...g, completed: !g.completed };
            return g;
        });
        await saveData(STORAGE_KEYS.CAREER_GOALS, updated);
        return updated;
    },

    // Delete goal
    deleteGoal: async (id) => {
        const goals = await loadData(STORAGE_KEYS.CAREER_GOALS, []);
        const updated = goals.filter(g => g.id !== id);
        await saveData(STORAGE_KEYS.CAREER_GOALS, updated);
        return updated;
    },

    // Save ROI Calculation
    saveROI: async (skillName, cost, salaryHike, monthsToRecover) => {
        const history = await loadData(STORAGE_KEYS.CAREER_DOI, []);
        const entry = {
            id: Date.now().toString(),
            skillName,
            cost,
            salaryHike,
            monthsToRecover,
            date: new Date().toLocaleDateString()
        };
        const updated = [entry, ...history];
        await saveData(STORAGE_KEYS.CAREER_DOI, updated);
        return updated;
    },

    // --- SKILLS ---
    getSkills: async () => {
        return await loadData('CAREER_SKILLS', [
            { id: 1, name: 'Data Analysis', current: 70, target: 90 },
            { id: 2, name: 'Project Mgmt', current: 50, target: 80 }
        ]);
    },
    addSkill: async (name, current, target) => {
        const skills = await loadData('CAREER_SKILLS', []);
        const newSkill = { id: Date.now(), name, current: parseInt(current), target: parseInt(target) };
        const updated = [...skills, newSkill];
        await saveData('CAREER_SKILLS', updated);
        return updated;
    },

    // --- RESUME ---
    getResume: async () => {
        return await loadData('CAREER_RESUME', { name: '', role: '' });
    },
    saveResume: async (data) => {
        await saveData('CAREER_RESUME', data);
        return data;
    },

    // --- MENTORS ---
    getMentors: async () => {
        return await loadData('CAREER_MENTORS', [
            { id: 1, name: 'Anjali Gupta', role: 'Product Manager', company: 'Google', status: 'connect', avatar: '👩‍💼' },
            { id: 2, name: 'Rajiv Kumar', role: 'Senior Dev', company: 'Microsoft', status: 'pending', avatar: '👨‍💻' },
            { id: 3, name: 'Sarah Lee', role: 'Data Scientist', company: 'Netflix', status: 'connected', avatar: '👩‍🔬' },
        ]);
    },
    updateMentorStatus: async (id, newStatus) => {
        const mentors = await loadData('CAREER_MENTORS', []); // load current or default
        // Note: if default was just loaded, we need to ensure we don't overwrite if it was empty. 
        // Logic: if storage empty, use default, then update.
        // Actually storage.js loadData(key, default) handles this. 
        // Wait, if I call loadData above with default, it returns default but DOES NOT save it.
        // So here I must do the same default logic or rely on a helper.
        // Let's rely on the fact that if I want to update, I should fetch what's there.
        // If it's the first time, I need that default list.
        let current = await loadData('CAREER_MENTORS', null);
        if (!current) {
            current = [
                { id: 1, name: 'Anjali Gupta', role: 'Product Manager', company: 'Google', status: 'connect', avatar: '👩‍💼' },
                { id: 2, name: 'Rajiv Kumar', role: 'Senior Dev', company: 'Microsoft', status: 'pending', avatar: '👨‍💻' },
                { id: 3, name: 'Sarah Lee', role: 'Data Scientist', company: 'Netflix', status: 'connected', avatar: '👩‍🔬' },
            ];
        }

        const updated = current.map(m => m.id === id ? { ...m, status: newStatus } : m);
        await saveData('CAREER_MENTORS', updated);
        return updated;
    }
};
