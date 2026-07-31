import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function LuxuryCard({
    children,
    onPress,
    style,
    index = 0,
    disabled = false
}) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);
    const scale = useSharedValue(1);

    useEffect(() => {
        const delay = index * 80; // Staggered delay
        opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
        translateY.value = withDelay(delay, withTiming(0, { duration: 500 }));
    }, [index]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [
                { translateY: translateY.value },
                { scale: scale.value }
            ],
        };
    });

    const handlePressIn = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withSpring(0.97, { damping: 10, stiffness: 300 });
    };

    const handlePressOut = () => {
        if (disabled) return;
        scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    };

    const Container = onPress ? AnimatedPressable : Animated.View;

    return (
        <Container
            onPress={onPress}
            onPressIn={onPress ? handlePressIn : undefined}
            onPressOut={onPress ? handlePressOut : undefined}
            style={[styles.container, style, animatedStyle]}
            disabled={disabled}
        >
            {children}
        </Container>
    );
}

const styles = StyleSheet.create({
    container: {
        // Base styles can be overridden by props
    },
});
