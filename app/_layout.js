import { Stack, SplashScreen } from "expo-router";
import { View, StyleSheet, LogBox } from "react-native";
import { useEffect } from "react";

// Ignore known Expo Go SDK 53 push notification limitation warnings
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Listening to push token changes is not yet fully supported on web',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'Cannot manually set color scheme'
]);

import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AccessibilityProvider } from "../components/context/AccessibilityContext";
import "../global.css";

import { GlobalFinanceProvider } from "../components/context/GlobalFinanceContext";
import { TranslationProvider } from "../components/localization/TranslationContext";
import { AuthProvider } from "../components/context/AuthContext";

/**
 * RootLayout — sets up global providers.
 * Auth-aware navigation is handled inside AuthProvider + AuthGate (child of AuthProvider),
 * so useAuth() is never called outside its provider.
 */
export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GlobalFinanceProvider>
          <TranslationProvider>
            <AccessibilityProvider>
              <View style={styles.container}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="login" />
                </Stack>
                <StatusBar style="light" backgroundColor="#09090B" />
              </View>
            </AccessibilityProvider>
          </TranslationProvider>
        </GlobalFinanceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
});
