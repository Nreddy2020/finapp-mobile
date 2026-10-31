import { API_ORIGIN } from './runtimeConfig';
import { getFinancialData, StorageService } from './storage';
import { APARTMENT_SOCIETY_STORAGE_KEY, validateSociety, profitAndLoss } from './business/apartmentSocietyService';

const r0 = n => Math.round(Number(n) || 0);
const SCENARIOS = {
    NORMAL: { revenue: 1, cost: 1, trend: '0.0%', stress: 'NORMAL' },
    RECESSION: { revenue: 0.72, cost: 1.08, trend: '-28.0%', stress: 'HIGH' },
    BOOM: { revenue: 1.22, cost: 1.04, trend: '+22.0%', stress: 'LOW' }
};

/**
 * On-device market shock model. Reads the monthly revenue and expenses the user's
 * business modules have recorded (rental, retail, apartment society, …) and applies
 * a scenario multiplier. Reports how many modules have data so the user knows the
 * basis; it never invents a figure when there is nothing recorded.
 */
export async function simulateMarketShockLocally(scenario = 'NORMAL') {
    const factors = SCENARIOS[scenario] || SCENARIOS.NORMAL;
    let revenue = 0, cost = 0, active = 0;
    try {
        const business = ((await getFinancialData()) || {}).business || {};
        for (const stats of Object.values(business)) {
            const rev = Number(stats?.monthlyRevenue ?? stats?.calculatedRevenue ?? stats?.revenue ?? 0);
            const exp = Number(stats?.monthlyExpenses ?? stats?.expenses ?? 0);
            if (rev > 0 || exp > 0) { active++; revenue += rev; cost += exp; }
        }
    } catch { /* ignore unreadable module stats */ }
    try {
        const society = await StorageService.load(APARTMENT_SOCIETY_STORAGE_KEY, null);
        if (society) {
            validateSociety(society);
            const today = new Date().toISOString().slice(0, 10);
            const pnl = profitAndLoss(society, today.slice(0, 7), today);
            if (pnl.billed > 0 || pnl.expenses > 0) { active++; revenue += pnl.cashCollected + pnl.otherIncome; cost += pnl.expenses; }
        }
    } catch { /* ignore unreadable society data */ }
    const projectedRevenue = r0(revenue * factors.revenue);
    const projectedCost = r0(cost * factors.cost);
    return {
        scenario,
        source: 'device',
        activeCount: active,
        hasData: active > 0,
        revenue: active ? projectedRevenue : null,
        profit: active ? projectedRevenue - projectedCost : null,
        trend: factors.trend,
        stress: active ? factors.stress : 'NO DATA'
    };
}

export const IntelligenceService = {
    /**
     * Simulate Market Shock
     * @param {string} scenario - 'NORMAL', 'RECESSION' or 'BOOM'
     * @returns {Promise<object>} SimulationResult
     */
    simulateMarketShock: async (scenario) => {
        if (API_ORIGIN) {
            try {
                // The network client is loaded only when a server is configured, so the
                // on-device path (and its tests) never pull in auth, device or network modules.
                const { api } = await import('./api');
                const response = await api.post('/intelligence/simulate', null, { params: { scenario } });
                if (response && response.profit !== undefined) return { source: 'server', ...response };
            } catch (error) {
                console.warn('[Intelligence] Server simulation unavailable, using on-device model:', error?.message || error);
            }
        }
        return simulateMarketShockLocally(scenario);
    },
    simulateMarketShockLocally
};
