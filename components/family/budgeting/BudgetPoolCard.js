import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp, AlertCircle, AlertTriangle, CheckCircle2, DollarSign, Tag, RefreshCw } from 'lucide-react-native';
import FairnessBreakdownCard from './FairnessBreakdownCard.js';

export default function BudgetPoolCard({ pool }) {
    const [expanded, setExpanded] = useState(false);

    if (!pool) return null;

    const {
        name = 'Untitled Pool',
        category = 'GENERAL',
        currency = 'INR',
        monthlyCeiling = 0,
        spent = 0,
        remainingBuffer = 0,
        utilizationPercent = 0,
        status = 'ON_TRACK',
        numericalStatus = 'ON_TRACK',
        reviewRequired = false,
        statusReason = null,
        fairnessBreakdown = null,
        isZeroCap = false
    } = pool;

    const formatAmount = (val) => {
        const sym = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : `${currency} `);
        return `${sym}${Math.abs(val || 0).toLocaleString()}`;
    };

    const getStatusTheme = () => {
        switch (numericalStatus) {
            case 'OVER_BUDGET':
                return { color: '#EF4444', bg: '#EF444420', label: 'OVER BUDGET' };
            case 'APPROACHING_LIMIT':
                return { color: '#F59E0B', bg: '#F59E0B20', label: 'APPROACHING LIMIT' };
            case 'ON_TRACK':
            default:
                return { color: '#10B981', bg: '#10B98120', label: 'ON TRACK' };
        }
    };

    const theme = getStatusTheme();

    return (
        <View style={styles.card}>
            {/* Top Bar */}
            <View style={styles.topRow}>
                <View style={styles.leftInfo}>
                    <View style={styles.titleRow}>
                        <Text style={styles.poolName}>{name}</Text>
                        {isZeroCap && (
                            <View style={styles.zeroCapBadge}>
                                <Text style={styles.zeroCapText}>ZERO-CAP</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.categoryRow}>
                        <Tag size={11} color="#9CA3AF" />
                        <Text style={styles.categoryText}>{category}</Text>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.currencyText}>{currency}</Text>
                    </View>
                </View>

                {/* Status Badges */}
                <View style={styles.statusBadgesCol}>
                    <View style={[styles.statusBadge, { backgroundColor: theme.bg, borderColor: theme.color }]}>
                        <Text style={[styles.statusText, { color: theme.color }]}>{theme.label}</Text>
                    </View>
                    {reviewRequired && (
                        <View style={styles.reviewBadge}>
                            <AlertCircle size={10} color="#F59E0B" />
                            <Text style={styles.reviewText}>REVIEW</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Metric Row */}
            <View style={styles.metricRow}>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Ceiling</Text>
                    <Text style={styles.metricValue}>{formatAmount(monthlyCeiling)}</Text>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Spent</Text>
                    <Text style={[styles.metricValue, { color: spent > monthlyCeiling ? '#EF4444' : '#F3F4F6' }]}>
                        {formatAmount(spent)}
                    </Text>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Buffer</Text>
                    <Text style={[styles.metricValue, { color: remainingBuffer < 0 ? '#EF4444' : '#10B981' }]}>
                        {remainingBuffer < 0 ? '-' : ''}{formatAmount(remainingBuffer)}
                    </Text>
                </View>
            </View>

            {/* Progress Bar (Only if ceiling > 0) */}
            {!isZeroCap && monthlyCeiling > 0 && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressSub}>Spent: {utilizationPercent}% of ceiling</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, {
                            width: `${Math.min(100, Math.max(0, utilizationPercent))}%`,
                            backgroundColor: theme.color
                        }]} />
                    </View>
                </View>
            )}

            {/* Reason notification if review required */}
            {reviewRequired && statusReason && (
                <View style={styles.reasonBanner}>
                    <AlertTriangle size={12} color="#F59E0B" />
                    <Text style={styles.reasonText}>
                        {statusReason === 'ORPHANED_CONTRIBUTOR' ? 'Contributor is no longer an active household member.' :
                         statusReason === 'SPLIT_SUM_NOT_100' ? 'Split ratio percentages do not sum to 100%.' :
                         statusReason === 'NO_SPLIT_VERSIONS_DEFINED' ? 'No contributor splits defined for this period.' :
                         statusReason}
                    </Text>
                </View>
            )}

            {/* Expand / Collapse Button */}
            <TouchableOpacity 
                style={styles.expandToggle}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <Text style={styles.expandText}>
                    {expanded ? 'Hide Contribution Fairness' : 'View Contribution Fairness'}
                </Text>
                {expanded ? <ChevronUp size={14} color="#60A5FA" /> : <ChevronDown size={14} color="#60A5FA" />}
            </TouchableOpacity>

            {/* Expanded Fairness Section */}
            {expanded && (
                <FairnessBreakdownCard 
                    fairnessBreakdown={fairnessBreakdown}
                    currency={currency}
                    reviewRequired={reviewRequired}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#171721',
        borderRadius: 14,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    leftInfo: {
        flex: 1,
        marginRight: 8
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap'
    },
    poolName: {
        color: '#F9FAFB',
        fontSize: 16,
        fontWeight: '700'
    },
    zeroCapBadge: {
        backgroundColor: '#374151',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2
    },
    zeroCapText: {
        color: '#9CA3AF',
        fontSize: 9,
        fontWeight: '700'
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 3
    },
    categoryText: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '500'
    },
    dot: {
        color: '#4B5563',
        fontSize: 10
    },
    currencyText: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '600'
    },
    statusBadgesCol: {
        alignItems: 'flex-end',
        gap: 4
    },
    statusBadge: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    reviewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#78350F30',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: '#F59E0B60'
    },
    reviewText: {
        color: '#F59E0B',
        fontSize: 9,
        fontWeight: '700'
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#252532',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10
    },
    metricItem: {
        alignItems: 'center',
        flex: 1
    },
    metricLabel: {
        color: '#9CA3AF',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 2
    },
    metricValue: {
        color: '#F3F4F6',
        fontSize: 14,
        fontWeight: '700'
    },
    progressContainer: {
        marginBottom: 8
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    progressSub: {
        color: '#9CA3AF',
        fontSize: 10
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: '#374151',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3
    },
    reasonBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#78350F25',
        borderRadius: 6,
        padding: 6,
        marginBottom: 8
    },
    reasonText: {
        color: '#FDE68A',
        fontSize: 10,
        flex: 1
    },
    expandToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 6,
        borderTopWidth: 1,
        borderTopColor: '#1F2937'
    },
    expandText: {
        color: '#60A5FA',
        fontSize: 11,
        fontWeight: '600'
    }
});
