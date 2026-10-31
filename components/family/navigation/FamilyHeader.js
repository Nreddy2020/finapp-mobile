import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Home } from 'lucide-react-native';
import { useFamilySelection } from './FamilySelection.js';
import FamilyTopTabBar from './FamilyTopTabBar.js';
import HouseholdContextBanner from './HouseholdContextBanner.js';
import { resolveBackNavigationAction, resolveGlobalHomeNavigationAction, FINLIFE_HOME_ROUTE } from './navigationHelpers.js';
export { resolveBackNavigationAction, resolveGlobalHomeNavigationAction, FINLIFE_HOME_ROUTE };

export default function FamilyHeader({ title = 'Family', subtitle = null, showBack = false, fallbackRoute = '/family', onBack = null, household = null, showContextBanner = true, showTopTabs = true }) {
    const router = useRouter();
    const selection = useFamilySelection();
    const handleBack = () => {
        if (onBack) return onBack();
        const decision = resolveBackNavigationAction(router.canGoBack(), fallbackRoute);
        if (decision.action === 'back') router.back();
        else router.replace(decision.route);
    };
    const handleGlobalHome = () => router.replace(resolveGlobalHomeNavigationAction().route);
    return (
        <View style={styles.wrapper}>
            <View style={styles.topBar}>
                {showBack && <TouchableOpacity onPress={handleBack} style={styles.iconButton} accessibilityLabel="Go back" accessibilityRole="button"><ArrowLeft size={20} color="#F4F4F5" /></TouchableOpacity>}
                <View style={styles.titleContainer}>
                    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
                    {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                {showBack ? (
                    <TouchableOpacity onPress={handleGlobalHome} style={styles.iconButton} accessibilityLabel="FinLife Home" accessibilityRole="button" testID="finlife-home-nested-btn"><Home size={18} color="#F472B6" /></TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={handleGlobalHome} style={[styles.iconButton, styles.homeButton]} accessibilityLabel="FinLife Home" accessibilityRole="button" testID="finlife-home-btn"><Home size={18} color="#F472B6" /><Text style={styles.homeLabel}>FinLife</Text></TouchableOpacity>
                )}
            </View>
            {showContextBanner && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Change household" accessibilityHint="Choose another household" onPress={selection?.changeHousehold} disabled={!selection}><HouseholdContextBanner household={household || selection?.household} canChange={!!selection} /></TouchableOpacity>}
            {showTopTabs && <FamilyTopTabBar />}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { backgroundColor: '#09090F', borderBottomWidth: 1, borderBottomColor: '#272732' },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, minHeight: 64 },
    iconButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#191922', borderWidth: 1, borderColor: '#2B2B38', flexShrink: 0 },
    homeButton: { width: 82, flexDirection: 'row', gap: 6 },
    homeLabel: { color: '#F4F4F5', fontSize: 12, fontWeight: '600' },
    titleContainer: { flex: 1, minWidth: 0, gap: 3 },
    title: { color: '#FAFAFA', fontSize: 18, lineHeight: 23, fontWeight: '700' },
    subtitle: { color: '#A1A1B5', fontSize: 12, lineHeight: 16 }
});
