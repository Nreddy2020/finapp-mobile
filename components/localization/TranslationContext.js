import React, { createContext, useState, useContext } from 'react';

const TRANSLATIONS = {
    en: {
        settings: 'Settings',
        language: 'Language',
        theme: 'Theme',
        notifications: 'Notifications',
        privacy: 'Privacy',
        help: 'Help & Support',
        about: 'About',
        logout: 'Log Out',
        home: 'Home',
        expenses: 'Expenses',
        income: 'Income',
        more: 'More',
        welcome: 'Welcome Back',
        balance: 'Total Balance'
    },
    hi: {
        settings: 'सेटिंग्स',
        language: 'भाषा',
        theme: 'थीम',
        notifications: 'सूचनाएं',
        privacy: 'गोपनीयता',
        help: 'सहायता',
        about: 'ऐप के बारे में',
        logout: 'लॉग आउट',
        home: 'होम',
        expenses: 'खर्चे',
        income: 'आय',
        more: 'अधिक',
        welcome: 'वापसी पर स्वागत है',
        balance: 'कुल शेष'
    },
    es: {
        settings: 'Configuración',
        language: 'Idioma',
        theme: 'Tema',
        notifications: 'Notificaciones',
        privacy: 'Privacidad',
        help: 'Ayuda',
        about: 'Acerca de',
        logout: 'Cerrar sesión',
        home: 'Inicio',
        expenses: 'Gastos',
        income: 'Ingresos',
        more: 'Más',
        welcome: 'Bienvenido de nuevo',
        balance: 'Balance Total'
    }
};

const TranslationContext = createContext();

export const TranslationProvider = ({ children }) => {
    const [locale, setLocale] = useState('en');

    const t = (key) => {
        return TRANSLATIONS[locale][key] || key;
    };

    return (
        <TranslationContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslation = () => useContext(TranslationContext);
