import React, { createContext, useState, useContext, useEffect } from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
const AsyncStorage = {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
};
import { translations, LANGUAGES } from './translations';
export { LANGUAGES };
// import * as Speech from 'expo-speech'; // Uncomment when ready to integrate

const AccessibilityContext = createContext();

export const AccessibilityProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');
    const [simpleMode, setSimpleMode] = useState(false);
    const [offlineMode, setOfflineMode] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [colorBlindMode, setColorBlindMode] = useState(false);
    const [lowDataMode, setLowDataMode] = useState(false);
    const [anonymousMode, setAnonymousMode] = useState(false);
    const [hideBalance, setHideBalance] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const storedLang = await AsyncStorage.getItem('appLanguage');
            const storedSimple = await AsyncStorage.getItem('simpleMode');
            const storedOffline = await AsyncStorage.getItem('offlineMode');
            const storedVoice = await AsyncStorage.getItem('voiceEnabled');
            const storedColor = await AsyncStorage.getItem('colorBlindMode');
            const storedLowData = await AsyncStorage.getItem('lowDataMode');
            const storedAnon = await AsyncStorage.getItem('anonymousMode');
            const storedHideBal = await AsyncStorage.getItem('hideBalance');

            if (storedLang) setLanguage(storedLang);
            if (storedSimple) setSimpleMode(JSON.parse(storedSimple));
            if (storedOffline) setOfflineMode(JSON.parse(storedOffline));
            if (storedVoice) setVoiceEnabled(JSON.parse(storedVoice));
            if (storedColor) setColorBlindMode(JSON.parse(storedColor));
            if (storedLowData) setLowDataMode(JSON.parse(storedLowData));
            if (storedAnon) setAnonymousMode(JSON.parse(storedAnon));
            if (storedHideBal) setHideBalance(JSON.parse(storedHideBal));
        } catch (error) {
            console.error('Failed to load settings', error);
        }
    };

    const updateSetting = async (key, value) => {
        try {
            await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            switch (key) {
                case 'appLanguage': setLanguage(value); break;
                case 'simpleMode': setSimpleMode(value); break;
                case 'offlineMode': setOfflineMode(value); break;
                case 'voiceEnabled': setVoiceEnabled(value); break;
                case 'colorBlindMode': setColorBlindMode(value); break;
                case 'lowDataMode': setLowDataMode(value); break;
                case 'anonymousMode': setAnonymousMode(value); break;
                case 'hideBalance': setHideBalance(value); break;
            }
        } catch (error) {
            console.error('Failed to save setting', error);
        }
    };

    const t = (key) => {
        return translations[language]?.[key] || translations['en'][key] || key;
    };

    const speak = (text) => {
        if (voiceEnabled) {
            // Speech.speak(text, { language });
            console.log('Speaking:', text);
        }
    };

    return (
        <AccessibilityContext.Provider value={{
            language,
            setLanguage: (val) => updateSetting('appLanguage', val),
            simpleMode,
            setSimpleMode: (val) => updateSetting('simpleMode', val),
            offlineMode,
            setOfflineMode: (val) => updateSetting('offlineMode', val),
            voiceEnabled,
            setVoiceEnabled: (val) => updateSetting('voiceEnabled', val),
            colorBlindMode,
            setColorBlindMode: (val) => updateSetting('colorBlindMode', val),
            lowDataMode,
            setLowDataMode: (val) => updateSetting('lowDataMode', val),
            anonymousMode,
            setAnonymousMode: (val) => updateSetting('anonymousMode', val),
            hideBalance,
            setHideBalance: (val) => updateSetting('hideBalance', val),
            t,
            speak
        }}>
            {children}
        </AccessibilityContext.Provider>
    );
};

export const useAccessibility = () => useContext(AccessibilityContext);
