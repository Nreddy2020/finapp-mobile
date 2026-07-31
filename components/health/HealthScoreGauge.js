import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedProps, withTiming, withDelay, Easing } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function HealthScoreGauge({ score = 75 }) {
    const progress = useSharedValue(0);
    const radius = 60;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        progress.value = withDelay(500, withTiming(score / 100, { duration: 2000, easing: Easing.out(Easing.exp) }));
    }, [score]);

    const animatedProps = useAnimatedProps(() => {
        const strokeDashoffset = circumference * (1 - progress.value);
        return { strokeDashoffset };
    });

    const getScoreColor = (s) => {
        if (s >= 80) return ['#34D399', '#10B981']; // Green
        if (s >= 50) return ['#FBBF24', '#F59E0B']; // Yellow
        return ['#F87171', '#EF4444']; // Red
    };

    const colors = getScoreColor(score);

    return (
        <View style={styles.container}>
            <Svg width={radius * 2 + strokeWidth} height={radius * 2 + strokeWidth}>
                <Defs>
                    <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={colors[0]} stopOpacity="1" />
                        <Stop offset="1" stopColor={colors[1]} stopOpacity="1" />
                    </LinearGradient>
                </Defs>

                {/* Background Circle */}
                <Circle
                    cx="50%"
                    cy="50%"
                    r={radius}
                    stroke="#27272A"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />

                {/* Animated Progress Circle */}
                <AnimatedCircle
                    cx="50%"
                    cy="50%"
                    r={radius}
                    stroke="url(#grad)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    animatedProps={animatedProps}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${radius + strokeWidth / 2}, ${radius + strokeWidth / 2}`}
                />
            </Svg>

            <View style={styles.scoreContainer}>
                <Text style={[styles.scoreValue, { color: colors[1] }]}>{score}</Text>
                <Text style={styles.scoreLabel}>{score >= 80 ? 'EXCELLENT' : (score >= 50 ? 'GOOD' : 'NEEDS ACTION')}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
    scoreContainer: { position: 'absolute', alignItems: 'center' },
    scoreValue: { fontSize: 36, fontWeight: '900' },
    scoreLabel: { color: '#71717A', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: -4 }
});
