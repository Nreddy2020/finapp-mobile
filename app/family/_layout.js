import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import FamilySelection from '../../components/family/navigation/FamilySelection.js';
import { Stack } from 'expo-router';

/**
 * app/family/_layout.js
 * 
 * Root Stack Layout for the FinLife Family Operating System.
 * Establishes Expo Router as the single authoritative navigation state.
 */
export default function FamilyStackLayout() {
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const top = insets.top || (height >= width ? initialWindowMetrics?.insets?.top || 0 : 0);
    return (
        <View style={{ flex: 1, paddingTop: top, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: '#09090F' }}>
        <FamilySelection><Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#09090F' },
                animation: 'fade'
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="people" />
            <Stack.Screen name="operations" />
            <Stack.Screen name="protection" />
            <Stack.Screen name="more" />
            <Stack.Screen name="more/resources" />
            <Stack.Screen name="more/financials" />
            <Stack.Screen name="more/readiness" />
            <Stack.Screen name="more/actions" />
            <Stack.Screen name="more/continuity" />
            <Stack.Screen name="more/budgeting" />
            <Stack.Screen name="more/forecast" />
        </Stack></FamilySelection>
        </View>
    );
}
