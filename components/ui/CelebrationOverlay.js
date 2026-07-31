import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Modal, Animated, Easing } from 'react-native';
import { PartyPopper } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY } from '../../constants/theme';

export default function CelebrationOverlay({ visible, message = "Goal Achieved!", onClose }) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    useNativeDriver: true
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                })
            ]).start();

            // Auto close after 3 seconds
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.container}>
                <View style={styles.overlay} />
                <Animated.View style={[styles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.iconContainer}>
                        <PartyPopper size={48} color={COLORS.primary} strokeWidth={2} />
                    </View>
                    <Text style={styles.title}>Congratulations!</Text>
                    <Text style={styles.message}>{message}</Text>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)'
    },
    content: {
        backgroundColor: '#18181B',
        padding: 32,
        borderRadius: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10',
        width: '80%'
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4F46E520',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: 'white',
        marginBottom: 8
    },
    message: {
        fontSize: 16,
        color: '#A1A1AA',
        textAlign: 'center'
    }
});
