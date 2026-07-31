import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { INCOME_CATEGORIES } from './IncomeCategorySelector';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

export default function IncomeCategoryBreakdown({ income, currency, formatAmount }) {
    // Calculate totals by category
    const categoryTotals = income.reduce((acc, item) => {
        const category = item.category || 'salary';
        acc[category] = (acc[category] || 0) + parseFloat(item.amount || 0);
        return acc;
    }, {});

    const totalIncome = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

    // Sort categories by amount (descending)
    const sortedCategories = Object.entries(categoryTotals)
        .map(([key, amount]) => ({
            key,
            amount,
            percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
            ...INCOME_CATEGORIES[key]
        }))
        .sort((a, b) => b.amount - a.amount);

    // Calculate diversity score (0-100)
    // Higher score = more diversified income sources
    const diversityScore = sortedCategories.length > 1
        ? Math.min(100, (sortedCategories.length / Object.keys(INCOME_CATEGORIES).length) * 100 +
            (100 - (sortedCategories[0]?.percentage || 0)))
        : 0;

    return (
        <View style={styles.container}>
            {/* Diversity Score Card */}
            <View style={styles.diversityCard}>
                <LinearGradient
                    colors={['#8B5CF620', '#00000000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.diversityGradient}
                />
                <View style={styles.diversityContent}>
                    <Text style={styles.diversityLabel}>Income Diversity Score</Text>
                    <View style={styles.diversityScoreRow}>
                        <Text style={styles.diversityScore}>{diversityScore.toFixed(0)}</Text>
                        <Text style={styles.diversityOutOf}>/100</Text>
                    </View>
                    <Text style={styles.diversityDescription}>
                        {diversityScore < 40 && 'Consider diversifying your income sources'}
                        {diversityScore >= 40 && diversityScore < 70 && 'Good diversification, keep building'}
                        {diversityScore >= 70 && 'Excellent income diversification!'}
                    </Text>
                </View>
            </View>

            {/* Category Breakdown */}
            <Text style={styles.sectionTitle}>Income by Category</Text>

            {sortedCategories.map((category, index) => {
                const Icon = category.icon;

                return (
                    <View key={category.key} style={styles.categoryCard}>
                        <LinearGradient
                            colors={[`${category.color}10`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.categoryGradient}
                        />

                        <View style={[styles.categoryIconContainer, { backgroundColor: `${category.color}20` }]}>
                            <Icon size={20} color={category.color} strokeWidth={2.5} />
                        </View>

                        <View style={styles.categoryInfo}>
                            <Text style={styles.categoryName}>{category.label}</Text>
                            <View style={styles.progressBarContainer}>
                                <View style={styles.progressBarBg}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            { width: `${category.percentage}%`, backgroundColor: category.color }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.percentageText}>{category.percentage.toFixed(1)}%</Text>
                            </View>
                        </View>

                        <View style={styles.categoryAmount}>
                            <Text style={[styles.amountText, { color: category.color }]}>
                                {formatAmount(category.amount)}
                            </Text>
                        </View>
                    </View>
                );
            })}

            {sortedCategories.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No income data yet</Text>
                    <Text style={styles.emptySubtext}>Add your first income to see breakdown</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24
    },
    diversityCard: {
        position: 'relative',
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        overflow: 'hidden'
    },
    diversityGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    },
    diversityContent: {
        alignItems: 'center'
    },
    diversityLabel: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 12
    },
    diversityScoreRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8
    },
    diversityScore: {
        fontSize: 48,
        fontWeight: '900',
        color: '#8B5CF6',
        letterSpacing: -2
    },
    diversityOutOf: {
        fontSize: 24,
        fontWeight: '700',
        color: '#71717A',
        marginLeft: 4
    },
    diversityDescription: {
        fontSize: 14,
        color: '#A1A1AA',
        fontWeight: '600',
        textAlign: 'center'
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#71717A',
        marginBottom: 16,
        letterSpacing: 2,
        textTransform: 'uppercase'
    },
    categoryCard: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        overflow: 'hidden'
    },
    categoryGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 120
    },
    categoryIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    categoryInfo: {
        flex: 1
    },
    categoryName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: '#27272A',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3
    },
    percentageText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#71717A',
        width: 45,
        textAlign: 'right'
    },
    categoryAmount: {
        alignItems: 'flex-end'
    },
    amountText: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    emptyState: {
        alignItems: 'center',
        padding: 32
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#71717A',
        marginBottom: 8
    },
    emptySubtext: {
        fontSize: 14,
        color: '#52525B',
        fontWeight: '500'
    }
});
