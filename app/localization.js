import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LanguageSelector from '../components/localization/LanguageSelector';
import { useTranslation } from '../components/localization/TranslationContext';

export default function LocalizationScreen() {
    const router = useRouter();
    const { t } = useTranslation();

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>{t('language')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <LanguageSelector />

                <View style={styles.previewCard}>
                    <Text style={styles.previewTitle}>Preview</Text>
                    <View style={styles.previewRow}>
                        <Text style={styles.label}>Settings:</Text>
                        <Text style={styles.value}>{t('settings')}</Text>
                    </View>
                    <View style={styles.previewRow}>
                        <Text style={styles.label}>Notifications:</Text>
                        <Text style={styles.value}>{t('notifications')}</Text>
                    </View>
                    <View style={styles.previewRow}>
                        <Text style={styles.label}>Privacy:</Text>
                        <Text style={styles.value}>{t('privacy')}</Text>
                    </View>
                </View>
            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 16, marginBottom: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: '900', color: '#FFF' },
    content: { paddingHorizontal: 24, paddingBottom: 40 },
    previewCard: { backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    previewTitle: { color: '#71717A', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1 },
    previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    label: { color: '#A1A1AA', fontSize: 15 },
    value: { color: '#FFF', fontSize: 15, fontWeight: '600' }
});
