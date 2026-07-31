import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from './TranslationContext';

const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
];

export default function LanguageSelector() {
    const { locale, setLocale } = useTranslation();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Select Language</Text>
            <View style={styles.list}>
                {LANGUAGES.map((lang) => (
                    <TouchableOpacity
                        key={lang.code}
                        style={[styles.item, locale === lang.code && styles.activeItem]}
                        onPress={() => setLocale(lang.code)}
                    >
                        <View style={styles.left}>
                            <Text style={styles.flag}>{lang.flag}</Text>
                            <View>
                                <Text style={styles.name}>{lang.name}</Text>
                                <Text style={styles.native}>{lang.native}</Text>
                            </View>
                        </View>
                        {locale === lang.code && (
                            <View style={styles.check}>
                                <Check size={16} color="#000" strokeWidth={3} />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 24 },
    title: { color: '#71717A', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1 },
    list: { backgroundColor: '#18181B', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF10' },
    item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#FFFFFF05' },
    activeItem: { backgroundColor: '#27272A' },
    left: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    flag: { fontSize: 24 },
    name: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    native: { color: '#71717A', fontSize: 13 },
    check: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' }
});
