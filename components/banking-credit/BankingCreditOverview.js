/**
 * components/banking-credit/BankingCreditOverview.js
 * 
 * FinLife Banking & Credit — Consolidated Overview Screen.
 * Implements the 5-card financial intelligence dashboard matching product specification:
 * 1. Total Bank Balance (Green) -> navigates to Accounts
 * 2. Total Loan Outstanding (Blue) -> navigates to Loans
 * 3. Upcoming Repayments (Purple) -> navigates to Repayments (Upcoming)
 * 4. Overdue Repayments (Amber) -> navigates to Repayments (Overdue)
 * 5. Net Banking Position (Teal) -> Bank Balance minus Loan Outstanding
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Landmark, FileText, Calendar, AlertTriangle, BarChart2, ChevronRight, ShieldCheck } from 'lucide-react-native';

export default function BankingCreditOverview({
    overview = {},
    diagnostics = null,
    onSelectTab
}) {
    const {
        formattedTotalBankBalance = '₹0',
        formattedTotalLoanOutstanding = '₹0',
        formattedUpcomingRepayments = '₹0',
        nextDueDateLabel = 'No upcoming dues',
        formattedOverdueRepayments = '₹0',
        overdueStatusText = 'All payments up to date',
        formattedNetBankingPosition = '₹0',
        isNetPositive = true
    } = overview;

    return (
        <View style={styles.container}>
            {/* 1. Total Bank Balance Card (Green) */}
            <TouchableOpacity
                style={[styles.metricCard, styles.cardGreen]}
                onPress={() => onSelectTab && onSelectTab('accounts')}
                activeOpacity={0.8}
            >
                <View style={[styles.iconBox, styles.iconGreen]}>
                    <Landmark size={24} color="#10B981" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Total Bank Balance</Text>
                    <Text style={styles.cardValue}>{formattedTotalBankBalance}</Text>
                </View>
                <ChevronRight size={20} color="#10B981" />
            </TouchableOpacity>

            {/* 2. Total Loan Outstanding Card (Blue) */}
            <TouchableOpacity
                style={[styles.metricCard, styles.cardBlue]}
                onPress={() => onSelectTab && onSelectTab('loans')}
                activeOpacity={0.8}
            >
                <View style={[styles.iconBox, styles.iconBlue]}>
                    <FileText size={24} color="#3B82F6" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Total Loan Outstanding</Text>
                    <Text style={styles.cardValue}>{formattedTotalLoanOutstanding}</Text>
                </View>
                <ChevronRight size={20} color="#3B82F6" />
            </TouchableOpacity>

            {/* 3. Upcoming Repayments Card (Purple) */}
            <TouchableOpacity
                style={[styles.metricCard, styles.cardPurple]}
                onPress={() => onSelectTab && onSelectTab('repayments', 'UPCOMING')}
                activeOpacity={0.8}
            >
                <View style={[styles.iconBox, styles.iconPurple]}>
                    <Calendar size={24} color="#8B5CF6" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Upcoming Repayments</Text>
                    <Text style={styles.cardValue}>{formattedUpcomingRepayments}</Text>
                    <Text style={styles.subText}>Next due: {nextDueDateLabel}</Text>
                </View>
                <ChevronRight size={20} color="#8B5CF6" />
            </TouchableOpacity>

            {/* 4. Overdue Repayments Card (Amber/Yellow) */}
            <TouchableOpacity
                style={[styles.metricCard, styles.cardAmber]}
                onPress={() => onSelectTab && onSelectTab('repayments', 'OVERDUE')}
                activeOpacity={0.8}
            >
                <View style={[styles.iconBox, styles.iconAmber]}>
                    <AlertTriangle size={24} color="#F59E0B" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Overdue Repayments</Text>
                    <Text style={styles.cardValue}>{formattedOverdueRepayments}</Text>
                    <Text style={styles.subText}>{overdueStatusText}</Text>
                </View>
                <ChevronRight size={20} color="#F59E0B" />
            </TouchableOpacity>

            {/* 5. Net Banking Position Card (Teal/Dark Cyan) */}
            <View style={[styles.metricCard, styles.cardTeal]}>
                <View style={[styles.iconBox, styles.iconTeal]}>
                    <BarChart2 size={24} color="#06B6D4" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Net Banking Position</Text>
                    <Text style={[styles.cardValue, !isNetPositive && styles.negativeValue]}>
                        {formattedNetBankingPosition}
                    </Text>
                    <Text style={styles.subText}>(Bank Balance − Loan Outstanding)</Text>
                </View>
                <ChevronRight size={20} color="#06B6D4" />
            </View>

            {/* Diagnostics Badge */}
            {diagnostics && diagnostics.allInvariantsSatisfied && (
                <View style={styles.diagnosticsBanner}>
                    <ShieldCheck size={16} color="#10B981" />
                    <Text style={styles.diagnosticsText}>
                        All 12 Banking & Credit invariants satisfied with exact integer paise precision
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24,
        gap: 12
    },
    metricCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        minHeight: 88
    },
    cardContent: {
        flex: 1,
        marginLeft: 14
    },
    cardLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 4
    },
    cardValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#F8FAFC',
        letterSpacing: -0.5
    },
    negativeValue: {
        color: '#F87171'
    },
    subText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 3
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },

    // 1. Green (Bank Balance)
    cardGreen: {
        backgroundColor: '#064E3B15',
        borderColor: '#05966940'
    },
    iconGreen: {
        backgroundColor: '#05966925'
    },

    // 2. Blue (Loan Debt)
    cardBlue: {
        backgroundColor: '#1E3A8A15',
        borderColor: '#2563EB40'
    },
    iconBlue: {
        backgroundColor: '#2563EB25'
    },

    // 3. Purple (Upcoming)
    cardPurple: {
        backgroundColor: '#4C1D9515',
        borderColor: '#7C3AED40'
    },
    iconPurple: {
        backgroundColor: '#7C3AED25'
    },

    // 4. Amber (Overdue)
    cardAmber: {
        backgroundColor: '#78350F15',
        borderColor: '#D9770640'
    },
    iconAmber: {
        backgroundColor: '#D9770625'
    },

    // 5. Teal (Net Position)
    cardTeal: {
        backgroundColor: '#164E6315',
        borderColor: '#0891B240'
    },
    iconTeal: {
        backgroundColor: '#0891B225'
    },

    diagnosticsBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#0F172A',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#10B98130',
        marginTop: 8
    },
    diagnosticsText: {
        flex: 1,
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500'
    }
});
