/**
 * QuickActionSection.js
 * 
 * RAPID CASH ACTIVITY ENTRY SECTION
 * 
 * Invariants:
 * - SMS-04 / MONEYFLOW-VIEW-01: Routes actions to authoritative modal triggers.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export function QuickActionSection({ onOpenAddModal }) {
    return (
        <View style={mfStyles.quickActionCard}>
            {/* Primary Action Button */}
            <TouchableOpacity
                style={mfStyles.primaryActionBtn}
                onPress={() => onOpenAddModal && onOpenAddModal('EXPENSE')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Record cash activity"
            >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={mfStyles.primaryActionBtnText}>Record Cash Activity</Text>
            </TouchableOpacity>

            {/* Quick Specific Type Shortcuts */}
            <View style={mfStyles.quickActionSubRow}>
                <TouchableOpacity
                    style={mfStyles.quickSubBtn}
                    onPress={() => onOpenAddModal && onOpenAddModal('EXPENSE')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Add Expense"
                >
                    <Ionicons name="arrow-up-circle-outline" size={15} color={MF_COLORS.dangerRedLight} />
                    <Text style={mfStyles.quickSubBtnText}>Expense</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={mfStyles.quickSubBtn}
                    onPress={() => onOpenAddModal && onOpenAddModal('INCOME')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Add Income"
                >
                    <Ionicons name="arrow-down-circle-outline" size={15} color={MF_COLORS.successGreenLight} />
                    <Text style={mfStyles.quickSubBtnText}>Income</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={mfStyles.quickSubBtn}
                    onPress={() => onOpenAddModal && onOpenAddModal('TRANSFER')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Add Transfer"
                >
                    <Ionicons name="swap-horizontal-outline" size={15} color={MF_COLORS.primaryBlueLight} />
                    <Text style={mfStyles.quickSubBtnText}>Transfer</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
