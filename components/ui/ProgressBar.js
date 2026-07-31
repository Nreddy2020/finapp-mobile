import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';

export default function ProgressBar({ progress, color = COLORS.primary, height = 6 }) {
    const widthAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(widthAnim, {
            toValue: progress,
            duration: 1000,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    const widthInterpolated = widthAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%']
    });

    return (
        <View style={[styles.container, { height }]}>
            <Animated.View
                style={[
                    styles.fill,
                    {
                        width: widthInterpolated,
                        backgroundColor: color,
                        shadowColor: color,
                        shadowOpacity: 0.5,
                        shadowRadius: 8
                    }
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#FFFFFF10',
        borderRadius: 4,
        overflow: 'hidden'
    },
    fill: {
        height: '100%',
        borderRadius: 4
    }
});
