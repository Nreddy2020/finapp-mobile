/**
 * @file InvestmentAssetAllocationCard.js
 * @description Card showing asset class distribution (Equities, Mutual Funds, Gold, REITs, Debt).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { SPACING } from '../../constants/theme';

export default function InvestmentAssetAllocationCard({ allocation = [] }) {
  if (!allocation || allocation.length === 0) return null;

  return (
    <LuxuryCard style={styles.card}>
      <Text style={styles.sectionTitle}>ASSET ALLOCATION</Text>

      {/* Multi-Segment Distribution Bar */}
      <View style={styles.progressBarContainer}>
        {allocation.map((item, idx) => {
          const widthPct = Math.max(item.percentageNum, 2); // Minimum 2% visibility
          return (
            <View
              key={item.type || idx}
              style={[
                styles.progressSegment,
                {
                  backgroundColor: item.color,
                  width: `${widthPct}%`,
                  borderTopLeftRadius: idx === 0 ? 6 : 0,
                  borderBottomLeftRadius: idx === 0 ? 6 : 0,
                  borderTopRightRadius: idx === allocation.length - 1 ? 6 : 0,
                  borderBottomRightRadius: idx === allocation.length - 1 ? 6 : 0
                }
              ]}
            />
          );
        })}
      </View>

      {/* Category List */}
      <View style={styles.categoryList}>
        {allocation.map((item, idx) => (
          <View key={item.type || idx} style={styles.categoryRow}>
            <View style={styles.categoryLabelGroup}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.categoryLabel}>{item.label}</Text>
            </View>
            <View style={styles.categoryValues}>
              <Text style={styles.categoryAmount}>{item.valueDisplay}</Text>
              <Text style={styles.categoryPercent}>{item.percentageDisplay}</Text>
            </View>
          </View>
        ))}
      </View>
    </LuxuryCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E222B',
    borderRadius: 20,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: SPACING.md
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#9CA3AF',
    marginBottom: SPACING.sm
  },
  progressBarContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: SPACING.md
  },
  progressSegment: {
    height: '100%'
  },
  categoryList: {
    gap: 8
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  categoryLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  categoryLabel: {
    fontSize: 13,
    color: '#E5E7EB',
    fontWeight: '600'
  },
  categoryValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F9FAFB'
  },
  categoryPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    width: 46,
    textAlign: 'right'
  }
});
