import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { X, Plus, Briefcase, DollarSign, TrendingUp, Gift, RefreshCw, Sparkles, PiggyBank, Award } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Income Categories with icons and colors
export const INCOME_CATEGORIES = {
    salary: {
        label: 'Salary',
        icon: Briefcase,
        color: '#10B981',
        description: 'Regular employment income'
    },
    freelance: {
        label: 'Freelance',
        icon: Sparkles,
        color: '#F59E0B',
        description: 'Contract and gig work'
    },
    investment: {
        label: 'Investment',
        icon: TrendingUp,
        color: '#3B82F6',
        description: 'Dividends, interest, capital gains'
    },
    passive: {
        label: 'Passive',
        icon: PiggyBank,
        color: '#8B5CF6',
        description: 'Rental, royalties, automated income'
    },
    bonus: {
        label: 'Bonus',
        icon: Award,
        color: '#EC4899',
        description: 'Performance bonuses, incentives'
    },
    gift: {
        label: 'Gift',
        icon: Gift,
        color: '#EF4444',
        description: 'Monetary gifts, inheritance'
    },
    refund: {
        label: 'Refund',
        icon: RefreshCw,
        color: '#14B8A6',
        description: 'Tax refunds, cashback, returns'
    },
    other: {
        label: 'Other',
        icon: DollarSign,
        color: '#71717A',
        description: 'Miscellaneous income'
    }
};

export default function IncomeCategorySelector({ visible, onClose, onSelect, selectedCategory }) {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Category</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.categoriesScroll} showsVerticalScrollIndicator={false}>
                        {Object.entries(INCOME_CATEGORIES).map(([key, category]) => {
                            const Icon = category.icon;
                            const isSelected = selectedCategory === key;

                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                                    onPress={() => onSelect(key)}
                                >
                                    <LinearGradient
                                        colors={isSelected ? [`${category.color}20`, `${category.color}10`] : ['#00000000', '#00000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.categoryGradient}
                                    />
                                    <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
                                        <Icon size={24} color={category.color} strokeWidth={2.5} />
                                    </View>
                                    <View style={styles.categoryInfo}>
                                        <Text style={styles.categoryLabel}>{category.label}</Text>
                                        <Text style={styles.categoryDescription}>{category.description}</Text>
                                    </View>
                                    {isSelected && (
                                        <View style={[styles.selectedBadge, { backgroundColor: category.color }]}>
                                            <Text style={styles.selectedBadgeText}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#18181B',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#FFFFFF10'
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center'
    },
    categoriesScroll: {
        padding: 24
    },
    categoryCard: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27272A',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#FFFFFF08',
        overflow: 'hidden'
    },
    categoryCardSelected: {
        borderColor: '#FFFFFF20',
        backgroundColor: '#27272A'
    },
    categoryGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16
    },
    categoryInfo: {
        flex: 1
    },
    categoryLabel: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4
    },
    categoryDescription: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '500'
    },
    selectedBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    selectedBadgeText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF'
    }
});
