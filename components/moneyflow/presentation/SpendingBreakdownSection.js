import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export function SpendingBreakdownSection({ data, onOpenSpendingModal }) {
    if (!data || !data.categories || data.categories.length === 0) return null;

    // Display top 3 categories inline
    const topCategories = data.categories.slice(0, 3);

    return (
        <View style={mfStyles.card}>
            <View style={mfStyles.sectionTitleRow}>
                <Text style={mfStyles.sectionTitle}>Spending Breakdown</Text>
                {onOpenSpendingModal && (
                    <TouchableOpacity
                        onPress={onOpenSpendingModal}
                        accessibilityRole="button"
                        accessibilityLabel="View full spending breakdown"
                    >
                        <Text style={{ fontSize: 13, color: MF_COLORS.primaryBlueLight, fontWeight: '600' }}>
                            View All
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {topCategories.map((cat, idx) => (
                <View key={idx} style={mfStyles.spendingBarContainer}>
                    <View style={mfStyles.spendingCategoryRow}>
                        <Text style={mfStyles.spendingCategoryName}>{cat.name}</Text>
                        <Text style={mfStyles.spendingCategoryAmount}>{cat.amountFormatted} ({cat.percentage}%)</Text>
                    </View>
                    <View style={mfStyles.spendingBarTrack}>
                        <View
                            style={[
                                mfStyles.spendingBarFill,
                                {
                                    width: `${Math.min(100, Math.max(4, cat.percentage))}%`,
                                    backgroundColor: cat.color || MF_COLORS.primaryBlue
                                }
                            ]}
                        />
                    </View>
                </View>
            ))}
        </View>
    );
}
