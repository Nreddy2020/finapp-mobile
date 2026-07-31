import { loadData, saveData, STORAGE_KEYS } from './storage';

const VOLATILITY = {
    GOLD: 0.002, // 0.2% variance
    SILVER: 0.005 // 0.5% variance
};

export const MetalsService = {
    // Current base prices (Based on Feb 2026 market rates)
    BASE_PRICES: {
        GOLD_24K: 160000,  // per 10 grams (~₹1,60,000 average across India)
        GOLD_22K: 147000,  // per 10 grams (~₹1,47,000 average)
        SILVER: 350000     // per kilogram (₹3,50,000 - Feb 1, 2026 rate)
    },

    // Get live prices (Simulated with slight jitter)
    getLivePrices: async () => {
        const goldJitter = 1 + (Math.random() * VOLATILITY.GOLD * 2 - VOLATILITY.GOLD);
        const silverJitter = 1 + (Math.random() * VOLATILITY.SILVER * 2 - VOLATILITY.SILVER);

        const gold24k = Math.round(MetalsService.BASE_PRICES.GOLD_24K * goldJitter);
        const gold22k = Math.round(MetalsService.BASE_PRICES.GOLD_22K * goldJitter);
        const silver = Math.round(MetalsService.BASE_PRICES.SILVER * silverJitter);

        const currentPrices = {
            GOLD_24K: gold24k,
            GOLD_22K: gold22k,
            GOLD: gold24k, // For backward compatibility with ticker
            SILVER: silver,
            // Per gram prices for display
            GOLD_24K_PER_GRAM: Math.round(gold24k / 10),
            GOLD_22K_PER_GRAM: Math.round(gold22k / 10),
            SILVER_PER_GRAM: Math.round(silver / 1000),
            timestamp: new Date().toISOString()
        };

        // Record for history
        await MetalsService.recordPrice('GOLD_24K', currentPrices.GOLD_24K);
        await MetalsService.recordPrice('GOLD_22K', currentPrices.GOLD_22K);
        await MetalsService.recordPrice('SILVER', currentPrices.SILVER);

        return currentPrices;
    },

    // Record price to history
    recordPrice: async (symbol, price) => {
        const history = await MetalsService.getHistory();
        const timestamp = new Date().toISOString();

        // Keep only last 100 points for performance
        if (!history[symbol]) history[symbol] = [];
        history[symbol].push({ price, timestamp });

        if (history[symbol].length > 100) {
            history[symbol] = history[symbol].slice(-100);
        }

        await saveData(STORAGE_KEYS.METALS_HISTORY, history);
    },

    // Get historical data
    getHistory: async () => {
        const data = await loadData(STORAGE_KEYS.METALS_HISTORY);
        return data || { GOLD: [], SILVER: [] };
    },

    // Calculate YTD performance
    getPerfomance: async (symbol) => {
        const history = await MetalsService.getHistory();
        const data = history[symbol] || [];
        if (data.length < 2) return 0;

        const first = data[0].price;
        const last = data[data.length - 1].price;
        return ((last - first) / first * 100).toFixed(2);
    }
};
