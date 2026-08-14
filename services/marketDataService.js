/**
 * services/marketDataService.js
 * 
 * Stage C.3.3 Market Valuation & Price Feed Abstraction Service.
 * 
 * RESPONSIBILITIES:
 * 1. Price quote fetching, validation, and normalization.
 * 2. Caching and quote freshness lifecycle (LIVE < 15 mins, STALE >= 15 mins, UNAVAILABLE).
 * 3. Provider error handling and isolation (providerStatus: OK | ERROR).
 * 
 * ARCHITECTURAL INVARIANTS:
 * - Does NOT own P&L calculations (delegated to InvestingEngine).
 * - Ownership truth remains strictly in InvestmentEvents & Holdings.
 * - Market quotes are temporary valuation projections only.
 * - Zero MoneyFlow transactions or cash mutations.
 */

import { loadMarketQuotes, saveMarketQuotes } from './storage.js';

// Default Freshness Window: 15 minutes in milliseconds
const FRESHNESS_WINDOW_MS = 15 * 60 * 1000;

// Internal Mock Provider State
const mockPrices = new Map([
    ['NIFTYBEES', 245.50],
    ['TATAMOTORS', 1200.00],
    ['HDFCBANK', 1650.00],
    ['RELIANCE', 2900.00],
    ['GOLD24K', 16000.00]
]);

let mockProviderShouldFail = false;

export const MockFeedProvider = {
    /**
     * Set a mock price for testing price fluctuations.
     */
    setMockPrice(symbol, price) {
        if (!symbol || typeof price !== 'number' || isNaN(price) || price < 0) {
            return false;
        }
        mockPrices.set(symbol.trim().toUpperCase(), Number(price.toFixed(2)));
        return true;
    },

    /**
     * Simulate provider network/API failure for testing error isolation.
     */
    simulateProviderError(shouldFail = true) {
        mockProviderShouldFail = Boolean(shouldFail);
    },

    /**
     * Simulates fetching a live quote from an external provider.
     */
    async fetchLiveQuote(symbol) {
        if (mockProviderShouldFail) {
            throw new Error(`[MockFeedProvider] Simulated network/feed failure for ${symbol}`);
        }

        const normSymbol = (symbol || '').trim().toUpperCase();
        if (!mockPrices.has(normSymbol)) {
            return null; // Provider has no quote for symbol
        }

        const price = mockPrices.get(normSymbol);
        if (typeof price !== 'number' || isNaN(price) || price < 0) {
            return null; // Invalid price returned by provider
        }

        return {
            symbol: normSymbol,
            price,
            currency: 'INR',
            market: 'NSE',
            timestamp: new Date().toISOString(),
            source: 'MockFeedProvider'
        };
    }
};

export const MarketDataService = {

    /**
     * Fetches price quote for a symbol with cache, freshness, and error isolation.
     * 
     * @param {string} symbol 
     * @returns {Object} Canonical Quote Object
     */
    async getQuote(symbol) {
        const normSymbol = (symbol || '').trim().toUpperCase();
        const cachedQuotes = await loadMarketQuotes();
        let cachedQuote = cachedQuotes.find(q => q.symbol === normSymbol);

        let liveQuote = null;
        let providerError = false;

        try {
            liveQuote = await MockFeedProvider.fetchLiveQuote(normSymbol);
        } catch (err) {
            console.warn(`[MarketDataService] Provider fetch error for ${normSymbol}:`, err.message);
            providerError = true;
        }

        const now = Date.now();

        // 1. Live Quote Succeeded
        if (liveQuote && !providerError) {
            const ageMs = now - new Date(liveQuote.timestamp).getTime();
            const quoteStatus = ageMs < FRESHNESS_WINDOW_MS ? 'LIVE' : 'STALE';

            const canonicalQuote = {
                ...liveQuote,
                quoteStatus,
                providerStatus: 'OK',
                valuationBasis: 'MARKET_QUOTE'
            };

            // Update Cache
            const otherQuotes = cachedQuotes.filter(q => q.symbol !== normSymbol);
            await saveMarketQuotes([...otherQuotes, canonicalQuote]);

            return canonicalQuote;
        }

        // 2. Provider Failed, but valid cached quote exists
        if (providerError && cachedQuote && typeof cachedQuote.price === 'number') {
            const ageMs = now - new Date(cachedQuote.timestamp).getTime();
            return {
                ...cachedQuote,
                quoteStatus: ageMs < FRESHNESS_WINDOW_MS ? 'LIVE' : 'STALE',
                providerStatus: 'ERROR', // Retain cached price, flag provider error!
                valuationBasis: 'MARKET_QUOTE'
            };
        }

        // 3. Symbol Unknown or Provider Failed with no cache
        return {
            symbol: normSymbol,
            price: null,
            currency: 'INR',
            market: 'NSE',
            timestamp: new Date().toISOString(),
            source: 'None',
            quoteStatus: 'UNAVAILABLE',
            providerStatus: providerError ? 'ERROR' : 'OK',
            valuationBasis: 'COST_BASIS_FALLBACK'
        };
    },

    /**
     * Batch fetch quotes for an array of symbols.
     */
    async getQuotes(symbols = []) {
        const uniqueSymbols = [...new Set(symbols.map(s => (s || '').trim().toUpperCase()).filter(Boolean))];
        const results = await Promise.all(uniqueSymbols.map(s => this.getQuote(s)));
        const quoteMap = {};
        results.forEach(q => {
            quoteMap[q.symbol] = q;
        });
        return quoteMap;
    },

    /**
     * Test Helper: Forward setMockPrice to internal provider
     */
    setMockPrice(symbol, price) {
        return MockFeedProvider.setMockPrice(symbol, price);
    },

    /**
     * Test Helper: Forward simulateProviderError to internal provider
     */
    simulateProviderError(shouldFail) {
        MockFeedProvider.simulateProviderError(shouldFail);
    }
};

export default MarketDataService;
