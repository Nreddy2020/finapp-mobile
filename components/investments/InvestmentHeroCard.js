/**
 * @file InvestmentHeroCard.js
 * @description Premium glassmorphic Hero Portfolio Card for FinLife Investments Module V1.
 *
 * Guarantees:
 * - Pure presentational component consuming pre-formatted view model strings.
 * - Zero BigInt values, zero financial math.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Clock, ShieldCheck, AlertTriangle } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';

export default function InvestmentHeroCard({ hero, freshnessBanner }) {
  if (!hero) return null;

  const isPositive = hero.isGain === true;
  const isNeutral = hero.isGain === null;
  const pnlColor = isNeutral ? '#9CA3AF' : (isPositive ? '#10B981' : '#EF4444');
  const PnlIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <LuxuryCard style={styles.card}>
      {/* Top Bar: Title & Price Freshness Badge */}
      <View style={styles.topRow}>
        <Text style={styles.sectionLabel}>TOTAL PORTFOLIO VALUE</Text>
        {freshnessBanner && (
          <View style={[styles.freshnessBadge, { backgroundColor: `${freshnessBanner.color}20`, borderColor: freshnessBanner.color }]}>
            {freshnessBanner.isWarning ? (
              <AlertTriangle size={11} color={freshnessBanner.color} style={styles.badgeIcon} />
            ) : (
              <ShieldCheck size={11} color={freshnessBanner.color} style={styles.badgeIcon} />
            )}
            <Text style={[styles.freshnessText, { color: freshnessBanner.color }]}>
              {freshnessBanner.label}
            </Text>
          </View>
        )}
      </View>

      {/* Main Portfolio Value */}
      <Text style={styles.mainValue}>{hero.totalMarketValueDisplay}</Text>

      {/* Unrealized Gain/Loss Row */}
      <View style={styles.pnlRow}>
        {!isNeutral && <PnlIcon size={16} color={pnlColor} style={styles.pnlIcon} />}
        <Text style={[styles.pnlValue, { color: pnlColor }]}>
          {hero.totalUnrealizedGainLossDisplay} ({hero.gainLossPercentDisplay})
        </Text>
        <Text style={styles.pnlSubtext}>Total Returns</Text>
      </View>

      <View style={styles.divider} />

      {/* Bottom Metrics Grid: Cost Basis, XIRR, CAGR */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>INVESTED BASIS</Text>
          <Text style={styles.metricValue}>{hero.totalCostBasisDisplay}</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>1Y XIRR</Text>
          <Text style={styles.metricValue}>{hero.oneYearXirrDisplay}</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>ALL-TIME CAGR</Text>
          <Text style={styles.metricValue}>{hero.allTimeCagrDisplay}</Text>
        </View>
      </View>
    </LuxuryCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    borderRadius: 20,
    backgroundColor: '#1E222B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: SPACING.md
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: '#9CA3AF'
  },
  freshnessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1
  },
  badgeIcon: {
    marginRight: 4
  },
  freshnessText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  mainValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: -0.5,
    marginVertical: 4
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  pnlIcon: {
    marginRight: 4
  },
  pnlValue: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8
  },
  pnlSubtext: {
    fontSize: 12,
    color: '#6B7280'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: SPACING.sm
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metricItem: {
    flex: 1
  },
  metricLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 2
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E5E7EB'
  }
});
