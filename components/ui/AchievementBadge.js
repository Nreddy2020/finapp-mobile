import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableWithoutFeedback, Animated, Easing } from 'react-native';
import { Award, Star, Trophy, Zap } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function AchievementBadge({ label, icon: Icon = Award, color = COLORS.warning, unlocked = false, onPress }) {
    return (
        <TouchableWithoutFeedback onPress={onPress}>
            <View style={[styles.badge, !unlocked && styles.locked]}>
                <View style={[styles.iconContainer, { backgroundColor: unlocked ? `${color}20` : '#FFFFFF05', borderColor: unlocked ? `${color}50` : '#FFFFFF10' }]}>
                    <Icon size={24} color={unlocked ? color : '#52525B'} />
                </View>
                <Text style={[styles.label, !unlocked && styles.lockedLabel]} numberOfLines={1}>{label}</Text>
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    badge: {
        alignItems: 'center',
        marginRight: 16,
        width: 80
    },
    locked: {
        opacity: 0.6
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
    },
    label: {
        fontSize: 11,
        color: COLORS.textPrimary,
        fontWeight: '600',
        textAlign: 'center'
    },
    lockedLabel: {
        color: COLORS.textSecondary
    }
});
