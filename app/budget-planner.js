import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import AdvancedWhatIfPlanner from '../components/budget/AdvancedWhatIfPlanner';

export default function BudgetPlannerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    return (
        <AnimatedScreen style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets?.top || 0, 48) + 8 }]}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <ChevronLeft size={24} color="#F8FAFC" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>What-If Life Event Simulator</Text>
                <View style={{ width: 24 }} />
            </View>

            <AdvancedWhatIfPlanner onBack={handleBack} />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030712'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B'
    },
    backBtn: {
        padding: 4
    },
    headerTitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700'
    }
});
