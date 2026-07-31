import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StackHeader({ title, subtitle, children }) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
            <View style={styles.headerContent}>
                <View style={styles.leftSection}>
                    <Pressable
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/');
                            }
                        }}
                        style={({ pressed }) => [
                            styles.backButton,
                            pressed && styles.backButtonPressed
                        ]}
                    >
                        <ArrowLeft size={20} color="#FFF" />
                        <Text style={styles.backText}>Back</Text>
                    </Pressable>
                    <View>
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                        <Text style={styles.title}>{title}</Text>
                    </View>
                </View>

                <View style={styles.rightSection}>
                    {children}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#09090B',
        zIndex: 100,
        borderBottomWidth: 1,
        borderBottomColor: '#FFFFFF10',
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    backButton: {
        flexDirection: 'row',
        height: 40,
        minWidth: 80, // Force width to accommodate text
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#FFFFFF10', // Glassy look
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF20',
        gap: 6
    },
    backButtonPressed: {
        backgroundColor: '#27272A',
        opacity: 0.8,
    },
    backText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        display: Platform.OS === 'web' ? 'flex' : 'none' // Only show text on web/large screens if needed, but here we want visibility
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    subtitle: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600',
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    rightSection: {
        flexDirection: 'row',
        gap: 12,
    }
});
