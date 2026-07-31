import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AnimatedScreen from '../components/ui/AnimatedScreen';

import FontSizeSlider from '../components/accessibility/FontSizeSlider';
import ContrastToggle from '../components/accessibility/ContrastToggle';
import ScreenReaderSim from '../components/accessibility/ScreenReaderSim';

export default function AccessibilityScreen() {
    const router = useRouter();

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Accessibility</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.intro}>
                    Customize your experience. These settings are simulated for verification.
                </Text>

                <FontSizeSlider />
                <ContrastToggle />
                <ScreenReaderSim />
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
    intro: { color: '#A1A1AA', marginBottom: 24, fontSize: 14, lineHeight: 20 }
});
