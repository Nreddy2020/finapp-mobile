/**
 * @file InvestmentCFOCard.js
 * @description Personal CFO Consolidated Balance Sheet Integration Card for FinLife Investments Module V1.
 *
 * Invariants & Guarantees:
 * - Displays authoritative investment contribution to total family net worth.
 * - Enforces mandatory null (renders '—') when required modules are UNAVAILABLE or PARTIAL.
 * - Displays explicit unavailable source list and explanation without fabricating values.
 * - Exposes Personal vs Family allocation toggle with exact BPS representation.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShieldCheck, AlertTriangle, HelpCircle, RefreshCw } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { SPACING } from '../../constants/theme';

export default function InvestmentCFOCard({ cfo, ownershipMode, onToggleOwnership, onRefresh }) {
  if (!cfo) return null;

  const isPersonal = ownershipMode === 'PERSONAL';
  const displayNetWorth = isPersonal ? cfo.personalNetWorthDisplay : cfo.familyNetWorthDisplay;
  const isAvailable = cfo.uiState === 'AVAILABLE' || cfo.uiState === 'STALE';
  const isPartialOrUnavailable = cfo.uiState === 'PARTIAL' || cfo.uiState === 'UNAVAILABLE';

  return (
    <LuxuryCard style={styles.card}>
      {/* Header with Title & Status Badge */}
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionLabel}>PERSONAL CFO BALANCE SHEET</Text>
          <Text style={styles.asOfText}>As of {cfo.asOfDate}</Text>
        </View>

        <View style={[styles.statusBadge, { borderColor: cfo.statusBadge.color, backgroundColor: `${cfo.statusBadge.color}15` }]}>
          {cfo.isStale ? (
            <AlertTriangle size={11} color={cfo.statusBadge.color} style={{ marginRight: 4 }} />
          ) : (
            <ShieldCheck size={11} color={cfo.statusBadge.color} style={{ marginRight: 4 }} />
          )}
          <Text style={[styles.statusText, { color: cfo.statusBadge.color }]}>
            {cfo.statusBadge.label}
          </Text>
        </View>
      </View>

      {/* Mode Switcher: Personal vs Family */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, isPersonal && styles.modeBtnActive]}
          onPress={() => onToggleOwnership && onToggleOwnership('PERSONAL')}
        >
          <Text style={[styles.modeBtnText, isPersonal && styles.modeBtnTextActive]}>
            Personal ({cfo.personalBpsPercent})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, !isPersonal && styles.modeBtnActive]}
          onPress={() => onToggleOwnership && onToggleOwnership('FAMILY')}
        >
          <Text style={[styles.modeBtnText, !isPersonal && styles.modeBtnTextActive]}>
            Total Family
          </Text>
        </TouchableOpacity>
      </View>

      {/* Net Worth Figure */}
      <View style={styles.netWorthContainer}>
        <Text style={styles.netWorthLabel}>
          {isPersonal ? 'PERSONAL NET WORTH' : 'FAMILY NET WORTH'}
        </Text>
        <Text style={styles.netWorthValue}>{displayNetWorth}</Text>

        {isPartialOrUnavailable && (
          <View style={styles.warningBox}>
            <AlertTriangle size={14} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.warningText}>
              Net Worth cannot be computed because required modules are missing: {cfo.unavailableSources.join(', ')}. FinLife never calculates partial sums using fabricated ₹0 values.
            </Text>
          </View>
        )}

        {cfo.isStale && (
          <View style={styles.staleBox}>
            <AlertTriangle size={14} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.staleText}>
              Valuation computed with stale quotes from: {cfo.staleSources.join(', ')}.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* Assets & Liabilities Breakdown */}
      {cfo.assets && (
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownHeader}>ASSETS BREAKDOWN</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.assetName}>Authoritative Investments (Securities)</Text>
            <Text style={styles.assetVal}>{cfo.assets.investmentsDisplay}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.assetName}>Liquid Cash & Bank Balances</Text>
            <Text style={styles.assetVal}>{cfo.assets.liquidCashDisplay}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.assetName}>Physical & Precious Assets (minus duplicates)</Text>
            <Text style={styles.assetVal}>{cfo.assets.physicalAssetsDisplay}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.assetName}>Real Estate Properties</Text>
            <Text style={styles.assetVal}>{cfo.assets.propertiesDisplay}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.assetName}>P2P Lending Receivables</Text>
            <Text style={styles.assetVal}>{cfo.assets.p2pReceivablesDisplay}</Text>
          </View>

          <View style={[styles.breakdownRow, styles.subtotalRow]}>
            <Text style={styles.subtotalName}>TOTAL ASSETS</Text>
            <Text style={styles.subtotalVal}>{cfo.assets.totalAssetsDisplay}</Text>
          </View>
        </View>
      )}

      {cfo.liabilities && (
        <View style={[styles.breakdownSection, { marginTop: SPACING.sm }]}>
          <Text style={styles.breakdownHeader}>LIABILITIES</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.assetName}>Formal Bank Loans & Mortgages</Text>
            <Text style={[styles.assetVal, { color: '#EF4444' }]}>
              {cfo.liabilities.formalDebtDisplay}
            </Text>
          </View>

          <View style={[styles.breakdownRow, styles.subtotalRow]}>
            <Text style={styles.subtotalName}>TOTAL LIABILITIES</Text>
            <Text style={[styles.subtotalVal, { color: '#EF4444' }]}>
              {cfo.liabilities.totalLiabilitiesDisplay}
            </Text>
          </View>
        </View>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
          <RefreshCw size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
          <Text style={styles.refreshBtnText}>Re-evaluate Balance Sheet</Text>
        </TouchableOpacity>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#9CA3AF'
  },
  asOfText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 3,
    marginVertical: SPACING.sm
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8
  },
  modeBtnActive: {
    backgroundColor: '#2A2F3D'
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF'
  },
  modeBtnTextActive: {
    color: '#F9FAFB',
    fontWeight: '700'
  },
  netWorthContainer: {
    marginVertical: SPACING.xs
  },
  netWorthLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#6B7280',
    marginBottom: 2
  },
  netWorthValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: -0.5
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    alignItems: 'flex-start'
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: '#FBBF24',
    lineHeight: 16
  },
  staleBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    alignItems: 'center'
  },
  staleText: {
    fontSize: 11,
    color: '#FBBF24'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: SPACING.sm
  },
  breakdownSection: {
    gap: 6
  },
  breakdownHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#6B7280',
    marginBottom: 2
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  assetName: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1.5
  },
  assetVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F9FAFB'
  },
  subtotalRow: {
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 4,
    marginTop: 2
  },
  subtotalName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E5E7EB'
  },
  subtotalVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F9FAFB'
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)'
  },
  refreshBtnText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600'
  }
});
