import React, { createContext, useState, useContext, useEffect } from 'react';
import { IndianRupee, DollarSign, Euro, PoundSterling, JapaneseYen } from 'lucide-react-native';
import { InflationService } from '../../services/inflation';
import { saveItem, getItem } from '../../services/storage';

const GlobalFinanceContext = createContext();

export const CURRENCIES = {
    INR: { code: 'INR', symbol: '₹', rate: 1, icon: IndianRupee, locale: 'en-IN', name: 'Indian Rupee' },
    USD: { code: 'USD', symbol: '$', rate: 0.012, icon: DollarSign, locale: 'en-US', name: 'US Dollar' },
    EUR: { code: 'EUR', symbol: '€', rate: 0.011, icon: Euro, locale: 'de-DE', name: 'Euro' },
    GBP: { code: 'GBP', symbol: '£', rate: 0.0095, icon: PoundSterling, locale: 'en-GB', name: 'British Pound' },
    JPY: { code: 'JPY', symbol: '¥', rate: 1.76, icon: JapaneseYen, locale: 'ja-JP', name: 'Japanese Yen' }
};

export const GlobalFinanceProvider = ({ children }) => {
    // Default to INR for now, can perform geolocation check later
    const [currencyCode, setCurrencyCode] = useState('INR');
    const [inflationRate, setInflationRate] = useState(6); // Default fallback
    const [inflationSource, setInflationSource] = useState('RBI');
    const [categoryInflation, setCategoryInflation] = useState({});
    const [personalizedRate, setPersonalizedRate] = useState(null);
    const [privacyMode, setPrivacyMode] = useState(false);

    // Financial Freedom Settings
    const [freedomGoal, setFreedomGoal] = useState(50000000); // Default 5 Cr
    const [marketReturnRate, setMarketReturnRate] = useState(12); // Default 12%

    const currency = CURRENCIES[currencyCode] || CURRENCIES.INR;

    // LOAD SETTINGS ON MOUNT
    useEffect(() => {
        const loadSettings = async () => {
            const savedCurrency = await getItem('user_currency');
            const savedInflationSource = await getItem('user_inflation_source');
            const savedPrivacy = await getItem('user_privacy');
            const savedFreedom = await getItem('user_freedom_goal');
            const savedReturn = await getItem('user_market_return');

            if (savedCurrency) setCurrencyCode(savedCurrency);
            if (savedInflationSource) setInflationSource(savedInflationSource);
            if (savedPrivacy !== null) setPrivacyMode(savedPrivacy);
            if (savedFreedom) setFreedomGoal(savedFreedom);
            if (savedReturn) setMarketReturnRate(savedReturn);
        };
        loadSettings();
    }, []);

    // LOAD INFLATION DATA FROM API
    useEffect(() => {
        const loadInflationData = async () => {
            // Each call is independently guarded so one failure never blocks the others
            // and the app always renders with safe fallback values.

            // Get current inflation rate
            try {
                const current = await InflationService.getCurrentInflation(inflationSource);
                if (current && current.rate) {
                    setInflationRate(current.rate);
                }
            } catch (error) {
                console.warn('[GlobalFinanceContext] getCurrentInflation failed (offline?), using fallback 6%');
            }

            // Get category-specific inflation
            try {
                const categories = await InflationService.getCategoryInflation(inflationSource);
                if (categories) setCategoryInflation(categories);
            } catch (error) {
                console.warn('[GlobalFinanceContext] getCategoryInflation failed, using empty fallback');
            }

            // Get personalized rate
            try {
                const personalized = await InflationService.getPersonalizedInflation('current_user', inflationSource);
                if (personalized && personalized.personalized_rate) {
                    setPersonalizedRate(personalized.personalized_rate);
                }
            } catch (error) {
                console.warn('[GlobalFinanceContext] getPersonalizedInflation failed, skipping');
            }
        };

        loadInflationData();

        // Set up auto-refresh every 6 hours
        const refreshInterval = setInterval(loadInflationData, 6 * 60 * 60 * 1000);

        return () => clearInterval(refreshInterval);
    }, [inflationSource]);

    // AUTO-SAVE EFFECTS
    useEffect(() => { saveItem('user_currency', currencyCode); }, [currencyCode]);
    useEffect(() => { saveItem('user_inflation_source', inflationSource); }, [inflationSource]);
    useEffect(() => { saveItem('user_privacy', privacyMode); }, [privacyMode]);
    useEffect(() => { saveItem('user_freedom_goal', freedomGoal); }, [freedomGoal]);
    useEffect(() => { saveItem('user_market_return', marketReturnRate); }, [marketReturnRate]);

    // Helper to format any amount globally
    const formatAmount = (amount, fractions = 0) => {
        if (privacyMode) return '••••••';
        if (amount === null || amount === undefined) return currency.symbol + '0';

        // Convert if we had base currency logic, but here we assume 
        // numbers stored are in "User's Selected Currency" for simplicity in V1
        // OR we can assume stored numbers are INR and convert on display:
        // let displayValue = amount * currency.rate; 

        // For V1 "Globalize", let's assume the user enters numbers IN their chosen currency.
        // So no conversion rate application on the raw value itself unless it's a multi-currency wallet.
        // We will treat 'amount' as "units of selected currency".

        return new Intl.NumberFormat(currency.locale, {
            style: 'currency',
            currency: currency.code,
            maximumFractionDigits: fractions,
            minimumFractionDigits: fractions
        }).format(amount);
    };

    const toggleCurrency = () => {
        const keys = Object.keys(CURRENCIES);
        const nextIndex = (keys.indexOf(currencyCode) + 1) % keys.length;
        setCurrencyCode(keys[nextIndex]);
    };

    return (
        <GlobalFinanceContext.Provider value={{
            currency,
            currencyCode,
            setCurrencyCode,
            toggleCurrency,
            formatAmount,
            inflationRate,
            setInflationRate,
            inflationSource,
            setInflationSource,
            categoryInflation,
            personalizedRate,
            privacyMode,
            setPrivacyMode,
            freedomGoal,
            setFreedomGoal,
            marketReturnRate,
            setMarketReturnRate
        }}>
            {children}
        </GlobalFinanceContext.Provider>
    );
};

export const useGlobalFinance = () => useContext(GlobalFinanceContext);
