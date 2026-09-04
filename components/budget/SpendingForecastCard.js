import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { Info, ChevronRight, TrendingUp, ShoppingBag, Shield } from 'lucide-react-native';

const REC_ICONS = {
    'TrendingUp': TrendingUp,
    'ShoppingBag': ShoppingBag,
    'Shield': Shield
};

export default function SpendingForecastCard({ forecast, onSelectRecommendation, onSeeAll }) {
    if (!forecast) return null;

    const width = 300;
    const height = 110;

    // SVG coordinates for smooth forecast curve
    // Actual curve: 1 Sep (0, 100) -> 10 Sep (100, 75) -> 18 Sep (180, 50)
    // Projected curve: 18 Sep (180, 50) -> 30 Sep (290, 25)
    // Budget line at y = 35
    const actualAreaPath = "M 10 100 L 90 80 L 170 55 L 170 100 L 10 100 Z";
    const actualLinePath = "M 10 100 L 90 80 L 170 55";
    const projectedLinePath = "M 170 55 L 230 40 L 290 28";

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View style={styles.titleWithIcon}>
                    <Text style={styles.cardTitle}>Spending Forecast</Text>
                    <Info size={16} color="#64748B" />
                </View>
            </View>

            {/* Total Monthly Spending Metric */}
            <Text style={styles.subLabel}>Total Monthly Spending</Text>
            <View style={styles.spendComparisonRow}>
                <View style={styles.spendCol}>
                    <Text style={styles.amountMain}>{forecast.formattedCurrentSpent || '₹78,100'}</Text>
                    <Text style={styles.amountLabel}>Current</Text>
                </View>

                <View style={styles.spendColRight}>
                    <View style={styles.projectedBadgeRow}>
                        <Text style={styles.amountMain}>{forecast.formattedProjectedSpent || '₹86,800'}</Text>
                        <View style={styles.varianceBadge}>
                            <Text style={styles.varianceText}>{forecast.variancePercentage || '+11%'}</Text>
                        </View>
                    </View>
                    <Text style={styles.amountLabel}>Projected</Text>
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendText}>Actual</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.legendText}>Projected</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={styles.budgetDashedDot} />
                    <Text style={styles.legendText}>Budget</Text>
                </View>
            </View>

            {/* SVG Chart */}
            <View style={styles.chartWrapper}>
                <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
                    {/* Budget Target Guideline (dashed) */}
                    <Line
                        x1="10"
                        y1="38"
                        x2="290"
                        y2="38"
                        stroke="#475569"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                    />

                    {/* Shaded Area under actual */}
                    <Path
                        d={actualAreaPath}
                        fill="#10B98115"
                    />

                    {/* Actual solid green curve */}
                    <Path
                        d={actualLinePath}
                        stroke="#10B981"
                        strokeWidth="2.5"
                        fill="none"
                    />

                    {/* Projected dashed blue curve */}
                    <Path
                        d={projectedLinePath}
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        fill="none"
                    />

                    {/* Intersection marker */}
                    <Circle cx="170" cy="55" r="4" fill="#3B82F6" />
                </Svg>

                {/* X-axis labels */}
                <View style={styles.xAxisRow}>
                    <Text style={styles.axisDateText}>1 Sep</Text>
                    <Text style={styles.axisDateText}>10 Sep</Text>
                    <Text style={styles.axisDateText}>20 Sep</Text>
                    <Text style={styles.axisDateText}>30 Sep</Text>
                </View>
            </View>

            {/* Top Recommendations */}
            <View style={[styles.headerRow, { marginTop: 22, marginBottom: 12 }]}>
                <Text style={styles.cardTitle}>Top Recommendations</Text>
                <TouchableOpacity onPress={onSeeAll}>
                    <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.recommendationsList}>
                {(forecast.recommendations || []).map((rec, i) => {
                    const IconComp = REC_ICONS[rec.icon] || TrendingUp;

                    return (
                        <TouchableOpacity
                            key={rec.id || i}
                            style={styles.recCard}
                            onPress={() => onSelectRecommendation && onSelectRecommendation(rec)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.recIconBox, { backgroundColor: `${rec.color}20` }]}>
                                <IconComp size={18} color={rec.color} />
                            </View>

                            <View style={styles.recContent}>
                                <Text style={styles.recTitle}>{rec.title}</Text>
                                <Text style={styles.recDesc} numberOfLines={2}>{rec.description}</Text>
                            </View>

                            <ChevronRight size={16} color="#64748B" />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0F172A',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginHorizontal: 16,
        marginBottom: 16
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    titleWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    cardTitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700'
    },
    subLabel: {
        color: '#94A3B8',
        fontSize: 12,
        marginBottom: 4
    },
    spendComparisonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14
    },
    spendCol: {},
    spendColRight: {
        alignItems: 'flex-end'
    },
    amountMain: {
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: '800'
    },
    amountLabel: {
        color: '#64748B',
        fontSize: 11,
        marginTop: 2
    },
    projectedBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    varianceBadge: {
        backgroundColor: '#EF444420',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    varianceText: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: '700'
    },
    legendRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 10
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    budgetDashedDot: {
        width: 10,
        height: 2,
        backgroundColor: '#64748B'
    },
    legendText: {
        color: '#94A3B8',
        fontSize: 11
    },
    chartWrapper: {
        marginTop: 6
    },
    xAxisRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
        paddingHorizontal: 10
    },
    axisDateText: {
        color: '#64748B',
        fontSize: 10
    },
    seeAllText: {
        color: '#3B82F6',
        fontSize: 13,
        fontWeight: '600'
    },
    recommendationsList: {
        gap: 8
    },
    recCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B40',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    recIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    recContent: {
        flex: 1,
        marginRight: 8
    },
    recTitle: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2
    },
    recDesc: {
        color: '#94A3B8',
        fontSize: 11,
        lineHeight: 15
    }
});
