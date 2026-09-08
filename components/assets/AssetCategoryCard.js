/**
 * components/assets/AssetCategoryCard.js
 * 
 * FinLife Assets Module — Category Item Card.
 * Matching Screen 2 in mockup media_1788794817378.jpg.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
    Coins, 
    TrendingUp, 
    Gem, 
    Car, 
    Laptop, 
    Briefcase, 
    ArrowDownLeft, 
    Package,
    ChevronRight 
} from 'lucide-react-native';
import { ASSET_CATEGORY } from './assetContracts.js';

function getCategoryIcon(category, color) {
    const size = 20;
    switch (category) {
        case ASSET_CATEGORY.MONEY_CASH:
            return <Coins size={size} color={color} />;
        case ASSET_CATEGORY.INVESTMENTS:
            return <TrendingUp size={size} color={color} />;
        case ASSET_CATEGORY.PRECIOUS_METALS:
            return <Gem size={size} color={color} />;
        case ASSET_CATEGORY.VEHICLES:
            return <Car size={size} color={color} />;
        case ASSET_CATEGORY.HOUSEHOLD_VALUABLES:
            return <Laptop size={size} color={color} />;
        case ASSET_CATEGORY.BUSINESS_ASSETS:
            return <Briefcase size={size} color={color} />;
        case ASSET_CATEGORY.RECEIVABLES:
            return <ArrowDownLeft size={size} color={color} />;
        default:
            return <Package size={size} color={color} />;
    }
}

export default function AssetCategoryCard({ item, onPress }) {
    if (!item) return null;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            {/* Left: Category Icon */}
            <View style={[styles.iconBox, { backgroundColor: `${item.color}1A` }]}>
                {getCategoryIcon(item.category, item.color)}
            </View>

            {/* Middle: Name & Count */}
            <View style={styles.infoCol}>
                <Text style={styles.categoryLabel}>{item.label}</Text>
                <Text style={styles.amount}>{item.amountFormatted}</Text>
                <Text style={styles.countText}>{item.assetCountLabel}</Text>
            </View>

            {/* Right: Chevron */}
            <ChevronRight size={20} color="#6B7280" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14
    },
    infoCol: {
        flex: 1
    },
    categoryLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2
    },
    amount: {
        color: '#F9FAFB',
        fontSize: 18,
        fontWeight: '800'
    },
    countText: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2
    }
});
