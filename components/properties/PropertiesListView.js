/**
 * @file PropertiesListView.js
 * @description Screen 2: Properties Portfolio List View.
 * Displays filterable property items, status badges, historical terminal tags,
 * and personal share highlights.
 *
 * Invariant: ZERO financial calculations performed in this component.
 * Consumes pre-computed ViewModels from propertyPresentationAdapter.js.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  Building2,
  Filter,
  MapPin,
  ChevronRight,
  Archive,
  CreditCard,
  Key
} from 'lucide-react-native';
import { PROPERTY_TYPES } from './propertyContracts.js';

export default function PropertiesListView({
  viewModel,
  onSelectProperty,
  onSelectFilter,
  currentFilter = 'ALL'
}) {
  if (!viewModel) return null;

  const { items } = viewModel;

  const filterChips = [
    { id: 'ALL', label: 'All' },
    { id: PROPERTY_TYPES.RESIDENTIAL_HOUSE, label: 'Houses' },
    { id: PROPERTY_TYPES.APARTMENT, label: 'Flats' },
    { id: PROPERTY_TYPES.PLOT, label: 'Plots' },
    { id: PROPERTY_TYPES.COMMERCIAL_PROPERTY, label: 'Commercial' },
    { id: 'RENTED', label: 'Rented' },
    { id: 'SOLD', label: 'Sold' }
  ];

  return (
    <View style={styles.container}>
      {/* Filter Horizontal Scroll */}
      <View style={styles.filterRowContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterChips.map((chip) => {
            const isSelected = currentFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                onPress={() => onSelectFilter && onSelectFilter(chip.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Property Cards List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={40} color="#475569" />
            <Text style={styles.emptyTitle}>No Properties Found</Text>
            <Text style={styles.emptySub}>No properties match the selected filter category.</Text>
          </View>
        ) : (
          items.map((item) => (
            <TouchableOpacity
              key={item.propertyId}
              style={[styles.itemCard, item.isTerminal && styles.terminalCard]}
              onPress={() => onSelectProperty && onSelectProperty(item.propertyId)}
              activeOpacity={0.7}
            >
              {item.historicalIndicator && (
                <View style={styles.historicalBanner}>
                  <Archive size={12} color="#94A3B8" />
                  <Text style={styles.historicalText}>{item.historicalIndicator}</Text>
                </View>
              )}

              <View style={styles.itemHeader}>
                <View style={[styles.typePill, { backgroundColor: item.typeColor + '20' }]}>
                  <Text style={[styles.typePillText, { color: item.typeColor }]}>{item.typeLabel}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.badgeColor }]}>
                  <Text style={styles.statusBadgeText}>{item.statusLabel}</Text>
                </View>
              </View>

              <Text style={styles.itemTitle}>{item.displayName}</Text>

              <View style={styles.itemMetaRow}>
                <Text style={styles.itemMetaText}>{item.areaLabel}</Text>
                {item.hasLinkedLoan && (
                  <View style={styles.iconTag}>
                    <CreditCard size={12} color="#F59E0B" />
                    <Text style={styles.iconTagText}>Mortgaged</Text>
                  </View>
                )}
                {item.isRented && (
                  <View style={styles.iconTag}>
                    <Key size={12} color="#06B6D4" />
                    <Text style={[styles.iconTagText, { color: '#06B6D4' }]}>Rented</Text>
                  </View>
                )}
              </View>

              <View style={styles.itemBottomRow}>
                <View>
                  <Text style={styles.valSubText}>Market Value</Text>
                  <Text style={styles.valAmountText}>{item.marketValueLabel}</Text>
                </View>
                <View style={styles.rightAlign}>
                  <Text style={styles.valSubText}>Personal Stake</Text>
                  <Text style={styles.shareAmountText}>{item.personalShareLabel}</Text>
                </View>
                <ChevronRight size={18} color="#64748B" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A'
  },
  filterRowContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F1629'
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B'
  },
  filterChipSelected: {
    backgroundColor: '#3B82F6'
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  filterChipTextSelected: {
    color: '#FFFFFF'
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  itemCard: {
    backgroundColor: '#121829',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12
  },
  terminalCard: {
    opacity: 0.85,
    backgroundColor: '#0F1626'
  },
  historicalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10
  },
  historicalText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700'
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12
  },
  itemMetaText: {
    color: '#64748B',
    fontSize: 12
  },
  iconTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  iconTagText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '600'
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B'
  },
  valSubText: {
    color: '#64748B',
    fontSize: 10,
    marginBottom: 1
  },
  valAmountText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  rightAlign: {
    alignItems: 'flex-end'
  },
  shareAmountText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240
  }
});
