/**
 * FinLife Banking Relationship Intelligence — EMI Calendar View
 * 
 * Obligation-first chronological debt calendar with 30-day cash planning summary.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar as CalendarIcon, ChevronRight, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { formatPaise, formatINR } from './bankingPresentationAdapter';

export default function EMICalendarView({
    schedules = {},
    loans = [],
    banks = [],
    totalCashPaise = 0,
    asOfDate = new Date().toISOString().split('T')[0]
}) {
    const [selectedMonth, setSelectedMonth] = useState('ALL');

    // Aggregate all installments across all active bank loans
    const allObligations = [];
    let next30DaysObligationsPaise = 0;
    const next30Date = new Date(new Date(asOfDate).getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    Object.keys(schedules).forEach(loanId => {
        const sch = schedules[loanId] || [];
        const loan = loans.find(l => l.id === loanId);
        const bank = banks.find(b => b.id === loan?.bankId);

        sch.forEach(item => {
            if (item.status === 'PAID' || item.status === 'CLOSED_BY_SETTLEMENT') return;

            const remaining = Math.max(0, item.expectedTotalPaise - item.paidTotalPaise);
            if (item.dueDate <= next30Date) {
                next30DaysObligationsPaise += remaining;
            }

            allObligations.push({
                ...item,
                loanName: loan?.loanName || 'Bank Loan',
                bankName: bank?.name || 'Bank',
                remainingAmountPaise: remaining
            });
        });
    });

    allObligations.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const projectedSurplusPaise = totalCashPaise - next30DaysObligationsPaise;

    // Group obligations by Year-Month
    const groupedByMonth = {};
    allObligations.forEach(ob => {
        const ym = ob.dueDate.substring(0, 7); // "2026-06"
        if (!groupedByMonth[ym]) groupedByMonth[ym] = [];
        groupedByMonth[ym].push(ob);
    });

    const monthKeys = Object.keys(groupedByMonth).sort();

    return (
        <View style={styles.container}>
            {/* Top 30-Day Cash Planning Summary */}
            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>NEXT 30 DAYS CASH PLANNING</Text>
                
                <View style={styles.summaryGrid}>
                    <View>
                        <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>{formatPaise(next30DaysObligationsPaise, true)}</Text>
                        <Text style={styles.summarySub}>Obligations</Text>
                    </View>
                    <View>
                        <Text style={[styles.summaryVal, { color: '#10B981' }]}>{formatPaise(totalCashPaise, true)}</Text>
                        <Text style={styles.summarySub}>Bank Cash</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.summaryVal, { color: projectedSurplusPaise >= 0 ? '#10B981' : '#F87171' }]}>
                            {formatPaise(projectedSurplusPaise, true)}
                        </Text>
                        <Text style={styles.summarySub}>Projected Surplus</Text>
                    </View>
                </View>
            </View>

            {/* Obligations List */}
            <Text style={styles.sectionHeader}>UPCOMING OBLIGATIONS</Text>

            {allObligations.length === 0 ? (
                <View style={styles.emptyCard}>
                    <CheckCircle2 size={24} color="#10B981" />
                    <Text style={styles.emptyText}>Zero pending EMI obligations across all banks.</Text>
                </View>
            ) : (
                <View style={{ gap: 14 }}>
                    {monthKeys.map(ym => {
                        const items = groupedByMonth[ym];
                        const dateObj = new Date(`${ym}-01`);
                        const monthLabel = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();

                        return (
                            <View key={ym} style={styles.monthGroup}>
                                <Text style={styles.monthHeader}>{monthLabel}</Text>

                                <View style={{ gap: 8 }}>
                                    {items.map(ob => {
                                        const day = ob.dueDate.split('-')[2];
                                        return (
                                            <View key={ob.id} style={styles.obligationItem}>
                                                <View style={styles.dateBadge}>
                                                    <Text style={styles.dateDay}>{day}</Text>
                                                </View>

                                                <View style={{ flex: 1, marginLeft: 10 }}>
                                                    <Text style={styles.obTitle}>{ob.loanName}</Text>
                                                    <Text style={styles.obSub}>{ob.bankName} • Inst #{ob.installmentNumber}</Text>
                                                </View>

                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={styles.obAmount}>{formatPaise(ob.remainingAmountPaise)}</Text>
                                                    <Text style={[styles.obStatus, { color: ob.dueDate < asOfDate ? '#EF4444' : '#F59E0B' }]}>
                                                        {ob.dueDate < asOfDate ? 'OVERDUE' : 'DUE'}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12
    },
    summaryCard: {
        backgroundColor: '#0F1022',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8
    },
    summaryLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    summaryVal: {
        fontSize: 16,
        fontWeight: '800'
    },
    summarySub: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    },
    sectionHeader: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginTop: 4
    },
    monthGroup: {
        gap: 6
    },
    monthHeader: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    obligationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121324',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12
    },
    dateBadge: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: '#1E1B4B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#4338CA'
    },
    dateDay: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900'
    },
    obTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    obSub: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    },
    obAmount: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    obStatus: {
        fontSize: 9,
        fontWeight: '800',
        marginTop: 2
    },
    emptyCard: {
        backgroundColor: '#121324',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        gap: 8
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600'
    }
});
