/**
 * components/reports/CategoryProgressBar.js
 * 
 * Category spending progress row with percentage and budget limits matching Screen 5.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CategoryProgressBar({
    category = 'Food',
    spentFormatted = '₹18,500',
    limitFormatted = '₹20,000',
    utilizationPercent = 93,
    isOverBudget = false,
    color = '#10B981'
}) {
    const barColor = isOverBudget ? '#EF4444' : color;
    const progressWidth = Math.min(utilizationPercent, 100);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.categoryTitleGroup}>
                    <View style={[styles.dot, { backgroundColor: barColor }]} />
                    <Text style={styles.categoryName}>{category}</Text>
                </View>
                <Text style={[styles.percentText, isOverBudget && styles.percentTextOver]}>
                    {utilizationPercent}%
                </Text>
            </View>

            <View style={styles.amountRow}>
                <Text style={styles.amountText}>{spentFormatted} / {limitFormatted}</Text>
            </View>

            <View style={styles.track}>
                <View
                    style={[
                        styles.fill,
                        {
                            width: `${progressWidth}%`,
                            backgroundColor: barColor
                        }
                    ]}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    categoryTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    percentText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#A1A1AA'
    },
    percentTextOver: {
        color: '#EF4444'
    },
    amountRow: {
        marginBottom: 6
    },
    amountText: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600'
    },
    track: {
        height: 6,
        backgroundColor: '#27272A',
        borderRadius: 3,
        overflow: 'hidden'
    },
    fill: {
        height: '100%',
        borderRadius: 3
    }
});
