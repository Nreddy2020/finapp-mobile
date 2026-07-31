import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Try to import Reanimated, but fallback gracefully if it fails
let Animated;
let useSharedValue;
let useAnimatedStyle;
let withTiming;
let withDelay;
let Easing;
let reanimatedAvailable = false;

try {
    const ReanimatedModule = require('react-native-reanimated');
    Animated = ReanimatedModule.default;
    useSharedValue = ReanimatedModule.useSharedValue;
    useAnimatedStyle = ReanimatedModule.useAnimatedStyle;
    withTiming = ReanimatedModule.withTiming;
    withDelay = ReanimatedModule.withDelay;
    Easing = ReanimatedModule.Easing;
    reanimatedAvailable = true;
} catch (error) {
    console.log('Reanimated not available, using regular View');
    reanimatedAvailable = false;
}

export default function AnimatedScreen({ children, style, intensity = 0, delay = 0 }) {
    // If Reanimated is not available, use regular View
    if (!reanimatedAvailable) {
        return (
            <View style={[styles.container, style]}>
                <LinearGradient
                    colors={['#000000', '#0a0a0a']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />
                {children}
            </View>
        );
    }

    // Use Reanimated if available
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, {
            duration: 600,
            easing: Easing.out(Easing.quad)
        }));
        translateY.value = withDelay(delay, withTiming(0, {
            duration: 600,
            easing: Easing.out(Easing.quad)
        }));
    }, [delay]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
        };
    });

    return (
        <Animated.View style={[styles.container, style, animatedStyle]}>
            <LinearGradient
                colors={['#000000', '#0a0a0a']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
});
