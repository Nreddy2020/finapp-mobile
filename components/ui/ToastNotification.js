import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react-native';

const NOTIFICATION_TYPES = {
    success: { icon: CheckCircle, color: '#10B981', bg: '#10B98115' },
    warning: { icon: AlertTriangle, color: '#F59E0B', bg: '#F59E0B15' },
    info: { icon: Info, color: '#3B82F6', bg: '#3B82F615' },
    error: { icon: AlertTriangle, color: '#EF4444', bg: '#EF444415' }
};

export default function ToastNotification({ visible, message, type = 'info', onClose, duration = 4000 }) {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Show with animation
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                })
            ]).start();

            // Auto-hide
            if (duration > 0) {
                const timer = setTimeout(() => {
                    handleClose();
                }, duration);
                return () => clearTimeout(timer);
            }
        } else {
            // Hide
            hideAnimation();
        }
    }, [visible]);

    const hideAnimation = (callback) => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            })
        ]).start(() => {
            if (callback) callback();
        });
    };

    const handleClose = () => {
        hideAnimation(() => {
            if (onClose) onClose();
        });
    };

    if (!visible) return null;

    const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
    const Icon = config.icon;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY }],
                    opacity
                }
            ]}
        >
            <View style={[styles.content, { backgroundColor: '#18181B', borderColor: config.color }]}>
                <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
                    <Icon size={20} color={config.color} />
                </View>
                <Text style={styles.message} numberOfLines={2}>{message}</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={18} color="#71717A" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 90, // Safe distance from top (StatusBar + Header area)
        left: 20,
        right: 20,
        zIndex: 9999,
        alignItems: 'center'
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        width: '100%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    iconContainer: {
        padding: 8,
        borderRadius: 8,
        marginRight: 12
    },
    message: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        marginRight: 8
    }
});
