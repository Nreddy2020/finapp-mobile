import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plane, Car, Zap, ShoppingBag, Utensils, Heart, ChevronRight } from 'lucide-react-native';

const ICON_MAP = {
    'Travel': Plane,
    'Transportation': Car,
    'Utilities': Zap,
    'Shopping': ShoppingBag,
    'Food & Dining': Utensils,
    'Healthcare': Heart
};

export default function NeedsAttentionList({ items = [], onSelectCategory, onSeeAll }) {
    if (!items || items.length === 0) return null;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Needs Attention</Text>
                <TouchableOpacity onPress={onSeeAll}>
                    <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
            </View>

            {/* Items */}
            {items.map((item, idx) => {
                const IconComponent = ICON_MAP[item.category] || Zap;
                const isUrgent = item.percentUsed >= 90 || (item.overspendAmount && item.overspendAmount > 0);
                const iconBg = isUrgent ? '#EF444420' : '#F59E0B20';
                const iconColor = isUrgent ? '#EF4444' : '#F59E0B';

                return (
                    <TouchableOpacity
                        key={item.id || idx}
                        style={styles.itemCard}
                        onPress={() => onSelectCategory && onSelectCategory(item.detail || item)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                            <IconComponent size={20} color={iconColor} />
                        </View>

                        <View style={styles.contentCol}>
                            <Text style={styles.categoryName}>{item.category}</Text>
                            <Text style={styles.noteText} numberOfLines={1}>
                                {item.note}
                            </Text>
                        </View>

                        <ChevronRight size={18} color="#64748B" />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 20
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    sectionTitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700'
    },
    seeAllText: {
        color: '#3B82F6',
        fontSize: 13,
        fontWeight: '600'
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    contentCol: {
        flex: 1
    },
    categoryName: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 3
    },
    noteText: {
        color: '#94A3B8',
        fontSize: 12
    }
});
