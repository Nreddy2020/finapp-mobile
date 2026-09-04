/**
 * WhereDidMyCashGoSection.js
 * 
 * PRIMARY VISUAL ANCHOR FOR PERSONAL MONEY FLOW
 * 
 * Invariants:
 * - MONEYFLOW-VIEW-01: Every displayed financial value originates strictly from the ViewModel.
 * - MONEYFLOW-VIEW-02: Zero financial arithmetic inside JSX.
 * - Zero presentation bias across Category, Merchant, and Account views.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export function WhereDidMyCashGoSection({ data, onOpenBreakdown }) {
    const [activeDimension, setActiveDimension] = useState('category'); // 'category' | 'merchant' | 'account'

    if (!data) return null;

    let itemsToDisplay = [];
    if (activeDimension === 'category') {
        itemsToDisplay = (data.byCategory || []).slice(0, 5);
    } else if (activeDimension === 'merchant') {
        itemsToDisplay = (data.byMerchant || []).slice(0, 5);
    } else if (activeDimension === 'account') {
        itemsToDisplay = (data.byAccount || []).slice(0, 5);
    }

    return (
        <View style={mfStyles.heroCard}>
            {/* Anchor Title */}
            <Text style={mfStyles.heroAnchorTitle}>WHERE DID MY CASH GO?</Text>
            
            {/* Total Spending Amount */}
            <Text style={mfStyles.totalHeroAmount}>{data.totalSpendingFormatted}</Text>
            <Text style={mfStyles.totalHeroSubtext}>
                Total spending this period · {data.accountSummaryText}
            </Text>

            {/* Segmented Dimension Switcher */}
            <View style={mfStyles.segmentedContainer}>
                <TouchableOpacity
                    style={[mfStyles.segmentBtn, activeDimension === 'category' && mfStyles.segmentBtnActive]}
                    onPress={() => setActiveDimension('category')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="View spending by Category"
                >
                    <Text style={[mfStyles.segmentText, activeDimension === 'category' && mfStyles.segmentTextActive]}>
                        Category
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[mfStyles.segmentBtn, activeDimension === 'merchant' && mfStyles.segmentBtnActive]}
                    onPress={() => setActiveDimension('merchant')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="View spending by Merchant"
                >
                    <Text style={[mfStyles.segmentText, activeDimension === 'merchant' && mfStyles.segmentTextActive]}>
                        Merchant
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[mfStyles.segmentBtn, activeDimension === 'account' && mfStyles.segmentBtnActive]}
                    onPress={() => setActiveDimension('account')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="View spending by Account"
                >
                    <Text style={[mfStyles.segmentText, activeDimension === 'account' && mfStyles.segmentTextActive]}>
                        Account
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Dimension Breakdown Bars */}
            {itemsToDisplay.length === 0 ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <Text style={{ color: MF_COLORS.textMuted, fontSize: 13 }}>
                        No spending recorded in this period
                    </Text>
                </View>
            ) : (
                itemsToDisplay.map((item) => (
                    <View key={item.id} style={mfStyles.spendingRow}>
                        <View style={mfStyles.spendingTopMeta}>
                            <View style={mfStyles.spendingItemLeft}>
                                <Text style={mfStyles.spendingEmoji}>{item.emoji || '💳'}</Text>
                                <Text style={mfStyles.spendingItemName} numberOfLines={1}>
                                    {item.name}
                                </Text>
                            </View>
                            <View style={mfStyles.spendingItemAmountRow}>
                                <Text style={mfStyles.spendingItemAmount}>{item.amountFormatted}</Text>
                                <Text style={mfStyles.spendingItemPercentage}>({item.percentage}%)</Text>
                            </View>
                        </View>
                        <View style={mfStyles.progressBarTrack}>
                            <View
                                style={[
                                    mfStyles.progressBarFill,
                                    {
                                        width: `${Math.min(100, Math.max(4, item.percentage))}%`,
                                        backgroundColor: item.color || MF_COLORS.primaryBlueLight
                                    }
                                ]}
                            />
                        </View>
                    </View>
                ))
            )}

            {/* View Full Breakdown CTA */}
            {onOpenBreakdown && (
                <TouchableOpacity
                    style={mfStyles.viewBreakdownLink}
                    onPress={onOpenBreakdown}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="View full spending breakdown"
                >
                    <Text style={mfStyles.viewBreakdownLinkText}>View full breakdown</Text>
                    <Ionicons name="arrow-forward" size={14} color={MF_COLORS.primaryBlueLight} />
                </TouchableOpacity>
            )}
        </View>
    );
}
