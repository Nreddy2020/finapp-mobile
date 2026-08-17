/**
 * FinLife Banking Relationship Intelligence — Payment Plan View
 * 
 * Detailed loan amortization schedule with status filtering,
 * principal/interest components, and quick action payment buttons.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, Clock, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { formatPaise } from './bankingPresentationAdapter';

export default function PaymentPlanView({
    schedule = [],
    loan,
    onRecordPayment
}) {
    const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'PAID' | 'OVERDUE'

    const filteredSchedule = schedule.filter(item => {
        if (filter === 'UPCOMING') return item.status === 'PENDING' || item.status === 'DUE';
        if (filter === 'PAID') return item.status === 'PAID';
        if (filter === 'OVERDUE') return item.status === 'OVERDUE';
        return true;
    });

    return (
        <View style={styles.container}>
            {/* Filter Pills */}
            <View style={styles.filterRow}>
                {['ALL', 'UPCOMING', 'PAID'].map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterPill, filter === f && styles.filterPillActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
                            {f} ({f === 'ALL' ? schedule.length : schedule.filter(s => f === 'PAID' ? s.status === 'PAID' : (s.status === 'PENDING' || s.status === 'DUE')).length})
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Installment List */}
            <View style={{ gap: 8 }}>
                {filteredSchedule.slice(0, 36).map(item => {
                    const isPaid = item.status === 'PAID';
                    const isPending = item.status === 'PENDING' || item.status === 'DUE';

                    return (
                        <View key={item.id} style={[styles.itemCard, isPaid && styles.itemCardPaid]}>
                            <View style={styles.itemHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={[styles.statusIcon, { backgroundColor: isPaid ? '#064E3B40' : '#1E1B4B' }]}>
                                        {isPaid ? <CheckCircle2 size={14} color="#10B981" /> : <Clock size={14} color="#818CF8" />}
                                    </View>
                                    <View>
                                        <Text style={styles.itemTitle}>EMI #{item.installmentNumber}</Text>
                                        <Text style={styles.itemDue}>Due: {item.dueDate}</Text>
                                    </View>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.itemAmount}>{formatPaise(item.expectedTotalPaise)}</Text>
                                    <Text style={[styles.itemStatusText, { color: isPaid ? '#10B981' : '#818CF8' }]}>
                                        {item.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.itemBreakdown}>
                                <Text style={styles.breakdownText}>
                                    P: <Text style={{ color: '#E5E7EB', fontWeight: '700' }}>{formatPaise(item.expectedPrincipalPaise)}</Text>
                                </Text>
                                <Text style={styles.breakdownText}>
                                    I: <Text style={{ color: '#F87171', fontWeight: '700' }}>{formatPaise(item.expectedInterestPaise)}</Text>
                                </Text>
                                <Text style={styles.breakdownText}>
                                    Bal: <Text style={{ color: '#9CA3AF' }}>{formatPaise(item.closingPrincipalPaise, true)}</Text>
                                </Text>
                            </View>

                            {isPending && onRecordPayment && (
                                <TouchableOpacity style={styles.payBtn} onPress={() => onRecordPayment(item)}>
                                    <Text style={styles.payBtnText}>Pay This Installment</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        gap: 10
    },
    filterRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 6
    },
    filterPill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        backgroundColor: '#121324',
        borderWidth: 1,
        borderColor: '#232548'
    },
    filterPillActive: {
        backgroundColor: '#3730A3',
        borderColor: '#6366F1'
    },
    filterPillText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700'
    },
    filterPillTextActive: {
        color: '#FFFFFF'
    },
    itemCard: {
        backgroundColor: '#121324',
        borderColor: '#232548',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12
    },
    itemCardPaid: {
        backgroundColor: '#0F1020',
        opacity: 0.8
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    statusIcon: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center'
    },
    itemTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    itemDue: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 1
    },
    itemAmount: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    itemStatusText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginTop: 1
    },
    itemBreakdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#090A14',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 6,
        marginTop: 8
    },
    breakdownText: {
        color: '#71717A',
        fontSize: 10
    },
    payBtn: {
        marginTop: 8,
        backgroundColor: '#064E3B',
        paddingVertical: 6,
        borderRadius: 6,
        alignItems: 'center'
    },
    payBtnText: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: '700'
    }
});
