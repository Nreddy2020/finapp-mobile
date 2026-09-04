/**
 * MoneyFlowHeader.js
 * 
 * CONTINUOUS STATEMENT HEADER
 * 
 * Invariants:
 * - Clean typography without competing card borders.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export function MoneyFlowHeader({ periodLabel, onOpenPeriodModal, onOpenMenu }) {
    return (
        <View style={mfStyles.headerContainer}>
            <View style={mfStyles.headerTopRow}>
                <View style={mfStyles.headerLeft}>
                    {onOpenMenu && (
                        <TouchableOpacity
                            style={mfStyles.headerMenuBtn}
                            onPress={onOpenMenu}
                            accessibilityRole="button"
                            accessibilityLabel="Open navigation menu"
                        >
                            <Ionicons name="menu-outline" size={24} color={MF_COLORS.textPrimary} />
                        </TouchableOpacity>
                    )}
                    <Text style={mfStyles.headerTitle}>Personal Money Flow</Text>
                </View>
            </View>
            
            <Text style={mfStyles.headerSubtitle}>Your cash, simply understood</Text>

            <View style={mfStyles.headerMetaRow}>
                <View style={mfStyles.cashBadge}>
                    <Text style={mfStyles.cashBadgeText}>Cash movement only</Text>
                </View>

                <TouchableOpacity
                    style={mfStyles.periodPill}
                    onPress={onOpenPeriodModal}
                    accessibilityRole="button"
                    accessibilityLabel={`Select period, currently ${periodLabel}`}
                >
                    <Text style={mfStyles.periodPillText}>{periodLabel}</Text>
                    <Ionicons name="chevron-down" size={14} color={MF_COLORS.primaryBlueLight} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
