/**
 * components/loans/LoanFacilityCard.js
 * 
 * Formal Bank Loans V1 — Facility Card Component.
 * Displays principal, outstanding balance, monthly EMI, interest rate,
 * progress bar, status badges, and action triggers.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { toRupeesFormatted } from '../../services/loans/loanContracts.js';

export default function LoanFacilityCard({ facility, onSimulatePrepayment, onViewSchedule, onRecordPayment }) {
    if (!facility) return null;

    const principal = BigInt(facility.principalPaise || 0);
    const outstanding = BigInt(facility.outstandingPrincipalPaise !== undefined ? facility.outstandingPrincipalPaise : principal);
    const emi = BigInt(facility.monthlyEmiPaise || 0);

    // Calculate percentage repaid
    const paid = principal > outstanding ? principal - outstanding : 0n;
    const progressPercent = principal > 0n ? Math.min(100, Math.round(Number(paid * 100n / principal))) : 0;

    const isClosed = facility.status === 'CLOSED';

    return (
        <View style={[styles.card, isClosed && styles.cardClosed]}>
            {/* Header: Title, Lender, and Status Badge */}
            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.loanName}>{facility.name}</Text>
                    <Text style={styles.lenderText}>{facility.lender} • {facility.loanType}</Text>
                </View>
                <View style={[styles.statusBadge, isClosed ? styles.statusClosed : styles.statusActive]}>
                    <Text style={styles.statusText}>{facility.status || 'ACTIVE'}</Text>
                </View>
            </View>

            {/* Balances */}
            <View style={styles.metricRow}>
                <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>OUTSTANDING</Text>
                    <Text style={[styles.metricValue, styles.outstandingValue]}>
                        {toRupeesFormatted(outstanding)}
                    </Text>
                </View>
                <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>MONTHLY EMI</Text>
                    <Text style={styles.metricValue}>
                        {toRupeesFormatted(emi)}
                    </Text>
                </View>
                <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>RATE</Text>
                    <Text style={styles.metricValue}>
                        {facility.annualRatePercent}% p.a.
                    </Text>
                </View>
            </View>

            {/* Repayment Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Repaid: {toRupeesFormatted(paid)}</Text>
                    <Text style={styles.progressPercent}>{progressPercent}%</Text>
                </View>
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
            </View>

            {/* Actions */}
            {!isClosed && (
                <View style={styles.actionsRow}>
                    <TouchableOpacity 
                        style={styles.actionButtonSecondary} 
                        onPress={() => onViewSchedule && onViewSchedule(facility)}
                    >
                        <Text style={styles.actionTextSecondary}>Schedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionButtonSecondary} 
                        onPress={() => onSimulatePrepayment && onSimulatePrepayment(facility)}
                    >
                        <Text style={styles.actionTextSecondary}>⚡ Prepay</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionButtonPrimary} 
                        onPress={() => onRecordPayment && onRecordPayment(facility)}
                    >
                        <Text style={styles.actionTextPrimary}>Pay EMI</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#121422',
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#1F2438'
    },
    cardClosed: {
        opacity: 0.7,
        borderColor: '#181C2E'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14
    },
    loanName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2
    },
    lenderText: {
        color: '#8A92B2',
        fontSize: 12,
        marginTop: 2
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    statusActive: {
        backgroundColor: 'rgba(52, 199, 89, 0.15)',
        borderColor: 'rgba(52, 199, 89, 0.3)',
        borderWidth: 1
    },
    statusClosed: {
        backgroundColor: 'rgba(142, 142, 147, 0.15)',
        borderColor: 'rgba(142, 142, 147, 0.3)',
        borderWidth: 1
    },
    statusText: {
        color: '#34C759',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase'
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#0A0C16',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12
    },
    metricBox: {
        alignItems: 'center'
    },
    metricLabel: {
        color: '#656F94',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4
    },
    metricValue: {
        color: '#E1E5F2',
        fontSize: 14,
        fontWeight: '700'
    },
    outstandingValue: {
        color: '#FF6B6B'
    },
    progressContainer: {
        marginBottom: 14
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    progressLabel: {
        color: '#8A92B2',
        fontSize: 11
    },
    progressPercent: {
        color: '#6C5CE7',
        fontSize: 11,
        fontWeight: '700'
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: '#1E2337',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: 6,
        backgroundColor: '#6C5CE7',
        borderRadius: 3
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#1A1E30',
        paddingTop: 12
    },
    actionButtonSecondary: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#1A1E30'
    },
    actionTextSecondary: {
        color: '#B0B8D9',
        fontSize: 12,
        fontWeight: '600'
    },
    actionButtonPrimary: {
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: '#6C5CE7'
    },
    actionTextPrimary: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    }
});
