import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart3, TrendingUp, Award, Clock, AlertTriangle } from 'lucide-react-native';

export default function TimeAnalyticsCard({
    totalMinutes = 1175, // ~19h 35m
    categories = [
        { name: 'Study', hours: '12h 0m', percent: 61, color: '#38BDF8' },
        { name: 'Revision', hours: '5h 0m', percent: 25, color: '#2DD4BF' },
        { name: 'Planning', hours: '2h 0m', percent: 10, color: '#10B981' },
        { name: 'Other', hours: '1h 0m', percent: 4, color: '#94A3B8' },
    ],
    mostDelayed = 'Chemistry'
}) {
    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View style={styles.titleWrap}>
                    <BarChart3 size={16} color="#38BDF8" />
                    <Text style={styles.cardTitle}>Time Analytics</Text>
                </View>
                <View style={styles.periodPill}>
                    <Text style={styles.periodPillText}>This Week ▾</Text>
                </View>
            </View>

            {/* Total Productive Time Banner */}
            <View style={styles.productiveTimeRow}>
                <View>
                    <Text style={styles.subLabel}>Total Productive Time</Text>
                    <Text style={styles.totalHoursVal}>19h 35m</Text>
                </View>
                <View style={styles.trendWrap}>
                    <TrendingUp size={14} color="#10B981" />
                    <Text style={styles.trendVal}>12%</Text>
                </View>
            </View>

            {/* Category Breakdown Progress Bars */}
            <View style={styles.categoriesSection}>
                <Text style={styles.categoryHeader}>By Category</Text>
                {categories.map(cat => (
                    <View key={cat.name} style={styles.categoryRow}>
                        <Text style={styles.catName}>{cat.name}</Text>
                        <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${cat.percent}%`, backgroundColor: cat.color }]} />
                        </View>
                        <Text style={styles.catHours}>{cat.hours}</Text>
                    </View>
                ))}
            </View>

            {/* Productivity Trends Sparkline */}
            <View style={styles.trendSection}>
                <Text style={styles.categoryHeader}>Productivity Trends</Text>
                <View style={styles.sparklineContainer}>
                    {/* Visual 7-day trend dots and connectors */}
                    {[
                        { day: 'Mon', h: 30 },
                        { day: 'Tue', h: 55 },
                        { day: 'Wed', h: 85 },
                        { day: 'Thu', h: 60 },
                        { day: 'Fri', h: 75 },
                        { day: 'Sat', h: 65 },
                        { day: 'Sun', h: 45 },
                    ].map((pt, idx) => (
                        <View key={pt.day} style={styles.trendCol}>
                            <View style={[styles.trendDot, { marginBottom: pt.h * 0.4 }]} />
                            <Text style={styles.trendDay}>{pt.day}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* 3 High-Impact Highlights */}
            <View style={styles.highlightsGrid}>
                <View style={styles.highlightCard}>
                    <Award size={14} color="#FBBF24" />
                    <Text style={styles.highlightTitle}>Best Day</Text>
                    <Text style={styles.highlightVal}>Wednesday</Text>
                </View>

                <View style={styles.highlightCard}>
                    <Clock size={14} color="#38BDF8" />
                    <Text style={styles.highlightTitle}>Most Productive</Text>
                    <Text style={styles.highlightVal}>9 AM – 11 AM</Text>
                </View>

                <View style={[styles.highlightCard, { borderColor: '#F43F5E40' }]}>
                    <AlertTriangle size={14} color="#F43F5E" />
                    <Text style={[styles.highlightTitle, { color: '#F43F5E' }]}>Most Delayed</Text>
                    <Text style={styles.highlightVal}>{mostDelayed}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    periodPill: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#334155',
    },
    periodPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    productiveTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B60',
    },
    subLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#94A3B8',
        marginBottom: 2,
    },
    totalHoursVal: {
        fontSize: 22,
        fontWeight: '800',
        color: '#F8FAFC',
        letterSpacing: -0.5,
    },
    trendWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#10B98115',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    trendVal: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },
    categoriesSection: {
        marginBottom: 16,
    },
    categoryHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 10,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    catName: {
        width: 65,
        fontSize: 11,
        fontWeight: '600',
        color: '#E2E8F0',
    },
    barTrack: {
        flex: 1,
        height: 7,
        backgroundColor: '#1E293B',
        borderRadius: 4,
        overflow: 'hidden',
        marginHorizontal: 8,
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },
    catHours: {
        width: 48,
        fontSize: 10,
        fontWeight: '600',
        color: '#94A3B8',
        textAlign: 'right',
    },
    trendSection: {
        marginBottom: 16,
    },
    sparklineContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 60,
        backgroundColor: '#1E293B30',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingBottom: 6,
        borderWidth: 1,
        borderColor: '#33415540',
    },
    trendCol: {
        alignItems: 'center',
    },
    trendDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#38BDF8',
    },
    trendDay: {
        fontSize: 9,
        fontWeight: '600',
        color: '#64748B',
    },
    highlightsGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    highlightCard: {
        flex: 1,
        backgroundColor: '#1E293B50',
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#33415550',
        gap: 4,
    },
    highlightTitle: {
        fontSize: 9,
        fontWeight: '600',
        color: '#94A3B8',
        textAlign: 'center',
    },
    highlightVal: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F8FAFC',
        textAlign: 'center',
    },
});
