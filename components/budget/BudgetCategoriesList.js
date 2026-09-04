import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Plus, Utensils, Car, Film, ShoppingBag, Zap, Heart, Plane, ChevronRight } from 'lucide-react-native';

const CATEGORY_ICONS = {
    'Food & Dining': Utensils,
    'Transportation': Car,
    'Entertainment': Film,
    'Shopping': ShoppingBag,
    'Utilities': Zap,
    'Healthcare': Heart,
    'Travel': Plane
};

const CATEGORY_COLORS = {
    'Food & Dining': '#10B981',
    'Transportation': '#F59E0B',
    'Entertainment': '#8B5CF6',
    'Shopping': '#EC4899',
    'Utilities': '#EF4444',
    'Healthcare': '#06B6D4',
    'Travel': '#3B82F6'
};

export default function BudgetCategoriesList({ categories = [], onSelectCategory, onAddBudget }) {
    const [selectedFilter, setSelectedFilter] = useState('All');

    const filtered = categories.filter(c => {
        if (selectedFilter === 'All') return true;
        return c.type === selectedFilter;
    });

    const filterOptions = ['All', 'Needs', 'Wants', 'Future'];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>All Budget Categories</Text>
                <TouchableOpacity style={styles.addBtn} onPress={onAddBudget} activeOpacity={0.7}>
                    <Plus size={18} color="#F8FAFC" />
                </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {filterOptions.map(opt => {
                    const isSelected = selectedFilter === opt;
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                            onPress={() => setSelectedFilter(opt)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>{opt}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Categories List */}
            <View style={styles.list}>
                {filtered.map((cat, idx) => {
                    const IconComp = CATEGORY_ICONS[cat.category] || Zap;
                    const iconColor = CATEGORY_COLORS[cat.category] || '#3B82F6';
                    const percent = Math.min(100, Math.max(0, cat.percentUsed || 0));

                    return (
                        <TouchableOpacity
                            key={cat.id || idx}
                            style={styles.categoryCard}
                            onPress={() => onSelectCategory && onSelectCategory(cat)}
                            activeOpacity={0.7}
                        >
                            {/* Top row: Icon + Name + Tag ... Limit */}
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
                                    <IconComp size={18} color={iconColor} />
                                </View>

                                <View style={styles.titleCol}>
                                    <View style={styles.nameTagRow}>
                                        <Text style={styles.categoryName}>{cat.category}</Text>
                                        <View style={styles.tagBadge}>
                                            <Text style={styles.tagText}>{cat.type || 'Needs'}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.spentText}>{cat.formattedSpent} spent</Text>
                                </View>

                                <View style={styles.limitCol}>
                                    <Text style={styles.limitAmount}>{cat.formattedLimit}</Text>
                                    <Text style={[styles.percentText, { color: cat.progressColor || '#10B981' }]}>
                                        {percent}%
                                    </Text>
                                </View>

                                <ChevronRight size={16} color="#64748B" style={{ marginLeft: 6 }} />
                            </View>

                            {/* Progress bar */}
                            <View style={styles.progressBarBg}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${percent}%`, backgroundColor: cat.progressColor || '#10B981' }
                                    ]}
                                />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 24
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14
    },
    sectionTitle: {
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: '700'
    },
    addBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155'
    },
    filterRow: {
        gap: 8,
        marginBottom: 16
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#0F172A',
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    filterChipSelected: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6'
    },
    filterText: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600'
    },
    filterTextSelected: {
        color: '#FFFFFF'
    },
    list: {
        gap: 10
    },
    categoryCard: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    titleCol: {
        flex: 1
    },
    nameTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2
    },
    categoryName: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '600'
    },
    tagBadge: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6
    },
    tagText: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '500'
    },
    spentText: {
        color: '#94A3B8',
        fontSize: 12
    },
    limitCol: {
        alignItems: 'flex-end',
        marginRight: 4
    },
    limitAmount: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700'
    },
    percentText: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#1E293B',
        borderRadius: 2,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2
    }
});
