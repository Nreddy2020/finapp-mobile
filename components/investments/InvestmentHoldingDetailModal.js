/**
 * @file InvestmentHoldingDetailModal.js
 * @description Drilldown inspector modal for security holdings and underlying tax lots.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X, Layers, AlertCircle, Sparkles } from 'lucide-react-native';
import { SPACING } from '../../constants/theme';

export default function InvestmentHoldingDetailModal({ visible, detail, onClose }) {
  if (!visible || !detail) return null;

  const isPositive = detail.isGain === true;
  const isNeutral = detail.isGain === null;
  const pnlColor = isNeutral ? '#9CA3AF' : (isPositive ? '#10B981' : '#EF4444');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <View style={styles.symbolRow}>
                <Text style={styles.symbol}>{detail.symbol}</Text>
                {detail.statusBadge && (
                  <View style={[styles.statusPill, { borderColor: detail.statusBadge.color, backgroundColor: `${detail.statusBadge.color}15` }]}>
                    <Text style={[styles.statusText, { color: detail.statusBadge.color }]}>
                      {detail.statusBadge.label}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.name}>{detail.name}</Text>
              <Text style={styles.meta}>
                ISIN: {detail.isin} • {detail.accountName}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Top Metrics Grid */}
            <View style={styles.metricsBox}>
              <View style={styles.metricRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>TOTAL QUANTITY</Text>
                  <Text style={styles.metricValue}>{detail.quantityDisplay} units</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>CURRENT PRICE</Text>
                  <Text style={styles.metricValue}>{detail.currentPriceDisplay}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metricRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>MARKET VALUE</Text>
                  <Text style={styles.metricValue}>{detail.marketValueDisplay}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>TOTAL COST BASIS</Text>
                  <Text style={styles.metricValue}>{detail.costBasisDisplay}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metricRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>UNREALIZED P&L</Text>
                  <Text style={[styles.metricValue, { color: pnlColor }]}>
                    {detail.unrealizedGainLossDisplay} ({detail.unrealizedGainLossPercentDisplay})
                  </Text>
                </View>
              </View>
            </View>

            {/* Tax Lots Section */}
            <View style={styles.lotsHeaderRow}>
              <View style={styles.lotsTitleGroup}>
                <Layers size={16} color="#60A5FA" style={{ marginRight: 6 }} />
                <Text style={styles.lotsSectionTitle}>TAX LOTS INSPECTOR (FIFO)</Text>
              </View>
              <Text style={styles.lotsCountBadge}>{detail.lots?.length || 0} Lots</Text>
            </View>

            {!detail.hasLots ? (
              <View style={styles.emptyLotsBox}>
                <AlertCircle size={20} color="#9CA3AF" style={{ marginBottom: 6 }} />
                <Text style={styles.emptyLotsText}>No active acquisition tax lots found for this security.</Text>
              </View>
            ) : (
              detail.lots.map((lot, idx) => (
                <View key={lot.lotId || idx} style={styles.lotCard}>
                  <View style={styles.lotTopRow}>
                    <Text style={styles.lotDate}>Bought {lot.acquisitionDate}</Text>
                    {lot.statusBadge && (
                      <View style={[styles.lotStatusPill, { borderColor: lot.statusBadge.color, backgroundColor: `${lot.statusBadge.color}15` }]}>
                        <Text style={[styles.lotStatusText, { color: lot.statusBadge.color }]}>
                          {lot.statusBadge.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {lot.bonusTag && (
                    <View style={styles.bonusTagRow}>
                      <Sparkles size={11} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={styles.bonusTagText}>{lot.bonusTag}</Text>
                    </View>
                  )}

                  <View style={styles.lotDetailsGrid}>
                    <View style={styles.lotDetailCol}>
                      <Text style={styles.lotLabel}>Remaining Units</Text>
                      <Text style={styles.lotVal}>{lot.remainingQuantityDisplay} / {lot.originalQuantityDisplay}</Text>
                    </View>
                    <View style={styles.lotDetailCol}>
                      <Text style={styles.lotLabel}>Unit Cost</Text>
                      <Text style={styles.lotVal}>{lot.costPerUnitDisplay}</Text>
                    </View>
                    <View style={styles.lotDetailCol}>
                      <Text style={styles.lotLabel}>Cost Basis</Text>
                      <Text style={styles.lotVal}>{lot.costBasisDisplay}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    backgroundColor: '#161920',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  headerTitleCol: {
    flex: 1
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  symbol: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F9FAFB',
    marginRight: 8
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  name: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4
  },
  meta: {
    fontSize: 11,
    color: '#6B7280'
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)'
  },
  scrollBody: {
    padding: SPACING.md
  },
  metricsBox: {
    backgroundColor: '#1E222B',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: SPACING.lg
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metricItem: {
    flex: 1
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#6B7280',
    marginBottom: 2
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F9FAFB'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: SPACING.sm
  },
  lotsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  lotsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  lotsSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#9CA3AF'
  },
  lotsCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA'
  },
  emptyLotsBox: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E222B',
    borderRadius: 12
  },
  emptyLotsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center'
  },
  lotCard: {
    backgroundColor: '#1E222B',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  lotTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  lotDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E5E7EB'
  },
  lotStatusPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.8
  },
  lotStatusText: {
    fontSize: 9,
    fontWeight: '700'
  },
  bonusTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  bonusTagText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '600'
  },
  lotDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  lotDetailCol: {
    flex: 1
  },
  lotLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2
  },
  lotVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F3F4F6'
  }
});
