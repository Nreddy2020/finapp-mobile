import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ShoppingBag, Utensils, Bus, Heart, Home, Zap, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const CATEGORY_ICONS = {
    'Food': Utensils,
    'Transport': Bus,
    'Medicine': Heart,
    'Rent': Home,
    'Utilities': Zap,
    'Other': ShoppingBag,
};

const ESSENTIAL_CATEGORIES = ['Food', 'Medicine', 'Rent', 'Utilities', 'Transport'];

export default function QuickExpenseButton({ category, amount, onPress, dailyBudget, todaySpent }) {
    const Icon = CATEGORY_ICONS[category] || ShoppingBag;
    const isEssential = ESSENTIAL_CATEGORIES.includes(category);
    const remainingBudget = dailyBudget - todaySpent;
    const canAfford = remainingBudget >= amount;

    const getColor = () => {
        if (!canAfford) return '#EF4444'; // Red - can't afford
        if (isEssential) return '#10B981'; // Green - essential
        return '#F59E0B'; // Orange - non-essential
    };

    const color = getColor();

    return (
        <Pressable
            style={[styles.button, !canAfford && styles.buttonDisabled]}
            onPress={onPress}
            disabled={!canAfford}
        >
            <LinearGradient
                colors={[`${color}20`, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                <Icon size={20} color={color} strokeWidth={2.5} />
            </View>

            <View style={styles.content}>
                <Text style={styles.category}>{category}</Text>
                <Text style={styles.amount}>₹{amount}</Text>
                {isEssential && (
                    <View style={styles.essentialBadge}>
                        <Text style={styles.essentialText}>Essential</Text>
                    </View>
                )}
            </View>

            {!canAfford && (
                <View style={styles.warningContainer}>
                    <AlertCircle size={16} color="#EF4444" />
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        overflow: 'hidden',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    category: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    amount: {
        fontSize: 16,
        fontWeight: '800',
        color: '#A1A1AA',
    },
    essentialBadge: {
        backgroundColor: '#10B98120',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    essentialText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#10B981',
        letterSpacing: 0.5,
    },
    warningContainer: {
        marginLeft: 8,
    },
});
