/**
 * @file InvestmentHoldingCard.js
 * @description Card rendering an individual security holding with P&L and freshness indicators.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { SPACING } from '../../constants/theme';

export default function InvestmentHoldingCard({ holding, onPress }) {
  if (!holding) return null;

  const isPositive = holding.isGain === true;
  const isNeutral = holding.isGain === null;
  const pnlColor = isNeutral ? '#9CA3AF' : (isPositive ? '#10B981' : '#EF4444');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(holding)}
      activeOpacity={0.7}
    >
      <View style={styles.leftCol}>
        <View style={styles.symbolRow}>
          <Text style={styles.symbol}>{holding.symbol}</Text>
          {holding.statusBadge && (
            <View style={[styles.statusPill, { borderColor: holding.statusBadge.color, backgroundColor: `${holding.statusBadge.color}15` }]}>
              <Text style={[styles.statusText, { color: holding.statusBadge.color }]}>
                {holding.statusBadge.label}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.name} numberOfLines={1}>{holding.name}</Text>
        <Text style={styles.qtyAccount}>
          {holding.quantityDisplay} units • {holding.accountName}
        </Text>
      </View>

      <View style={styles.rightCol}>
        <Text style={styles.marketValue}>{holding.marketValueDisplay}</Text>
        <Text style={[styles.pnl, { color: pnlColor }]}>
          {holding.unrealizedGainLossDisplay} ({holding.unrealizedGainLossPercentDisplay})
        </Text>
        <View style={styles.drilldownRow}>
          <Text style={styles.priceUnit}>@ {holding.currentPriceDisplay}</Text>
          <ChevronRight size={14} color="#6B7280" style={styles.chevron} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E222B',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  leftCol: {
    flex: 1.3,
    paddingRight: SPACING.sm
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  symbol: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F9FAFB',
    marginRight: 6
  },
  statusPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.8
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700'
  },
  name: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4
  },
  qtyAccount: {
    fontSize: 11,
    color: '#6B7280'
  },
  rightCol: {
    flex: 1,
    alignItems: 'flex-end'
  },
  marketValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 2
  },
  pnl: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2
  },
  drilldownRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  priceUnit: {
    fontSize: 11,
    color: '#6B7280'
  },
  chevron: {
    marginLeft: 2
  }
});
