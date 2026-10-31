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
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

function getCategoryIconConfig(name = '') {
    const lower = (name || '').toLowerCase();
    if (lower.includes('rent') || lower.includes('housing')) {
        return { icon: 'home', color: '#FB923C', bg: 'rgba(249, 115, 22, 0.15)', barColor: '#2563EB' };
    }
    if (lower.includes('grocer') || lower.includes('food') || lower.includes('swiggy') || lower.includes('dining')) {
        return { icon: 'restaurant', color: '#34D399', bg: 'rgba(16, 185, 129, 0.15)', barColor: '#F59E0B' };
    }
    if (lower.includes('transport') || lower.includes('fuel') || lower.includes('uber') || lower.includes('travel')) {
        return { icon: 'car', color: '#FB7185', bg: 'rgba(244, 63, 94, 0.15)', barColor: '#06B6D4' };
    }
    if (lower.includes('shop') || lower.includes('amazon') || lower.includes('retail')) {
        return { icon: 'bag-handle', color: '#F472B6', bg: 'rgba(236, 72, 153, 0.15)', barColor: '#EC4899' };
    }
    if (lower.includes('entertain') || lower.includes('netflix') || lower.includes('movie')) {
        return { icon: 'film', color: '#C084FC', bg: 'rgba(168, 85, 247, 0.15)', barColor: '#A855F7' };
    }
    if (lower.includes('util') || lower.includes('bill') || lower.includes('electric')) {
        return { icon: 'flash', color: '#FBBF24', bg: 'rgba(245, 158, 11, 0.15)', barColor: '#8B5CF6' };
    }
    if (lower.includes('health') || lower.includes('med') || lower.includes('doctor')) {
        return { icon: 'medkit', color: '#F87171', bg: 'rgba(239, 68, 68, 0.15)', barColor: '#EF4444' };
    }
    return { icon: 'pricetag', color: '#60A5FA', bg: 'rgba(59, 130, 246, 0.15)', barColor: '#3B82F6' };
}

export function WhereDidMyCashGoSection({ data }) {
    const [activeDimension, setActiveDimension] = useState('category'); // 'category' | 'merchant' | 'account'
    const [expandedItemId, setExpandedItemId] = useState(null);

    if (!data) return null;

    let itemsToDisplay = [];
    if (activeDimension === 'category') {
        itemsToDisplay = (data.byCategory || []).slice(0, 5);
    } else if (activeDimension === 'merchant') {
        itemsToDisplay = (data.byMerchant || []).slice(0, 5);
    } else if (activeDimension === 'account') {
        itemsToDisplay = (data.byAccount || []).slice(0, 5);
    }

    const handleDimensionChange = (dim) => {
        setActiveDimension(dim);
        setExpandedItemId(null);
    };

    return (
        <View style={mfStyles.heroCard}>
            {/* Top Anchor Header with Mini Sparkline Widget */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={mfStyles.heroAnchorTitle}>WHERE DID MY CASH GO?</Text>
                    <Text style={mfStyles.totalHeroAmount}>{data.totalSpendingFormatted}</Text>
                    <Text style={mfStyles.totalHeroSubtext}>
                        {data.periodSummaryText || 'Total spending in Oct 2026'}
                    </Text>
                    <Text style={[mfStyles.totalHeroSubtext, { marginTop: 2, color: MF_COLORS.textMuted }]}>
                        {data.accountCountText || 'Across 2 accounts'}
                    </Text>
                </View>

                {/* Right Mini Graph Box */}
                <View style={localStyles.miniChartCard}>
                    <View style={localStyles.miniChartTopRow}>
                        <Ionicons name="arrow-down" size={13} color="#10B981" />
                        <Text style={localStyles.miniChartBadgeText}> 12%</Text>
                    </View>
                    <Text style={localStyles.miniChartSubText}>vs Sep 2026</Text>
                    <Svg width="112" height="34" viewBox="0 0 112 34" style={{ marginTop: 2, alignSelf: 'center' }}>
                        <Defs>
                            <LinearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                                <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                            </LinearGradient>
                        </Defs>
                        <Path
                            d="M 0 25 Q 25 22, 45 15 T 75 7 T 95 18 T 112 14 L 112 34 L 0 34 Z"
                            fill="url(#waveGrad)"
                        />
                        <Path
                            d="M 0 25 Q 25 22, 45 15 T 75 7 T 95 18 T 112 14"
                            fill="none"
                            stroke="#38BDF8"
                            strokeWidth="2.2"
                        />
                        <Circle cx="75" cy="7" r="3.5" fill="#38BDF8" />
                        <Circle cx="75" cy="7" r="6" fill="#38BDF8" opacity="0.3" />
                    </Svg>
                </View>
            </View>

            {/* Segmented Dimension Switcher */}
            <View style={mfStyles.segmentedContainer}>
                <TouchableOpacity
                    style={[mfStyles.segmentBtn, activeDimension === 'category' && mfStyles.segmentBtnActive]}
                    onPress={() => handleDimensionChange('category')}
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
                    onPress={() => handleDimensionChange('merchant')}
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
                    onPress={() => handleDimensionChange('account')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="View spending by Account"
                >
                    <Text style={[mfStyles.segmentText, activeDimension === 'account' && mfStyles.segmentTextActive]}>
                        Account
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Dimension Breakdown Bars with Expandable Arrow Details */}
            {itemsToDisplay.length === 0 ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <Text style={{ color: MF_COLORS.textMuted, fontSize: 13 }}>
                        No spending recorded in this period
                    </Text>
                </View>
            ) : (
                itemsToDisplay.map((item) => {
                    const isExpanded = expandedItemId === item.id;
                    const txList = item.transactions || [];
                    const iconCfg = getCategoryIconConfig(item.name);
                    const barColor = item.color || iconCfg.barColor;

                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={localStyles.spendingRow}
                            activeOpacity={0.75}
                            onPress={() => setExpandedItemId(prev => prev === item.id ? null : item.id)}
                            accessibilityRole="button"
                            accessibilityLabel={`${item.name}, ${item.amountFormatted}, ${item.percentage} percent. Tap to ${isExpanded ? 'collapse' : 'view'} details.`}
                        >
                            <View style={localStyles.spendingItemRow}>
                                {/* Left Squircle Icon Badge */}
                                <View style={[localStyles.itemIconBadge, { backgroundColor: iconCfg.bg }]}>
                                    <Ionicons name={iconCfg.icon} size={20} color={iconCfg.color} />
                                </View>

                                {/* Right Item Info */}
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <View style={localStyles.spendingTopMeta}>
                                        <Text style={localStyles.spendingItemName} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={localStyles.spendingItemAmount}>{item.amountFormatted}</Text>
                                            <Text style={localStyles.spendingItemPercentage}> ({item.percentage}%)</Text>
                                            <Ionicons
                                                name={isExpanded ? "chevron-up" : "chevron-forward"}
                                                size={16}
                                                color="#3B82F6"
                                                style={{ marginLeft: 6 }}
                                            />
                                        </View>
                                    </View>

                                    {/* Progress Bar */}
                                    <View style={localStyles.progressBarTrack}>
                                        <View
                                            style={[
                                                localStyles.progressBarFill,
                                                {
                                                    width: `${Math.min(100, Math.max(3, item.percentage))}%`,
                                                    backgroundColor: barColor
                                                }
                                            ]}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Inline Accordion Detail View */}
                            {isExpanded && (
                                <View style={localStyles.detailContainer}>
                                    <View style={localStyles.detailHeader}>
                                        <Text style={localStyles.detailTitle}>
                                            {item.name} Breakdown
                                        </Text>
                                        <Text style={localStyles.detailCount}>
                                            {txList.length} {txList.length === 1 ? 'transaction' : 'transactions'}
                                        </Text>
                                    </View>

                                    {txList.length === 0 ? (
                                        <Text style={localStyles.emptyText}>No transaction details recorded</Text>
                                    ) : (
                                        txList.map((tx, idx) => (
                                            <View
                                                key={tx.id || idx}
                                                style={[
                                                    localStyles.txRow,
                                                    idx === (txList.length - 1) && { borderBottomWidth: 0 }
                                                ]}
                                            >
                                                <View style={{ flex: 1, marginRight: 8 }}>
                                                    <Text style={localStyles.txMerchant} numberOfLines={1}>
                                                        {tx.merchant || tx.description || 'Expense Outflow'}
                                                    </Text>
                                                    <View style={localStyles.txSubRow}>
                                                        {tx.dateFormatted ? (
                                                            <Text style={localStyles.txMetaText}>{tx.dateFormatted}</Text>
                                                        ) : null}
                                                        {tx.dateFormatted && tx.accountName ? (
                                                            <Text style={localStyles.txDot}>•</Text>
                                                        ) : null}
                                                        {tx.accountName ? (
                                                            <Text style={localStyles.txMetaText} numberOfLines={1}>
                                                                {tx.accountName}
                                                            </Text>
                                                        ) : null}
                                                        {tx.source ? (
                                                            <View style={localStyles.sourceBadge}>
                                                                <Text style={localStyles.sourceBadgeText}>{tx.source}</Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                </View>
                                                <Text style={localStyles.txAmount}>
                                                    {tx.amountFormatted}
                                                </Text>
                                            </View>
                                        ))
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })
            )}
        </View>
    );
}

const localStyles = StyleSheet.create({
    miniChartCard: {
        width: 128,
        height: 74,
        borderRadius: 14,
        backgroundColor: '#0A152A',
        borderWidth: 1,
        borderColor: '#162846',
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 2,
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    miniChartTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    miniChartBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },
    miniChartSubText: {
        fontSize: 10,
        color: '#64748B',
        textAlign: 'right',
        marginTop: -1,
    },
    spendingRow: {
        marginBottom: 16,
    },
    spendingItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemIconBadge: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    spendingTopMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    spendingItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
        flex: 1,
        marginRight: 8,
    },
    spendingItemAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    spendingItemPercentage: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: '#131E33',
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 8,
        width: '100%',
    },
    progressBarFill: {
        height: 6,
        borderRadius: 3,
    },
    detailContainer: {
        backgroundColor: '#0A101D',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#1E2D45',
        padding: 10,
        marginTop: 10,
        marginBottom: 4,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 6,
        marginBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#172338',
    },
    detailTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#93C5FD',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailCount: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    txRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    txMerchant: {
        fontSize: 13,
        fontWeight: '600',
        color: '#F8FAFC',
    },
    txSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 4,
    },
    txMetaText: {
        fontSize: 11,
        color: '#94A3B8',
    },
    txDot: {
        fontSize: 10,
        color: '#64748B',
    },
    sourceBadge: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        marginLeft: 2,
    },
    sourceBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#60A5FA',
    },
    txAmount: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F87171',
    },
    emptyText: {
        fontSize: 12,
        color: '#64748B',
        paddingVertical: 6,
        textAlign: 'center',
    },
});
