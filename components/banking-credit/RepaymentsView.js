/**
 * components/banking-credit/RepaymentsView.js
 * 
 * FinLife Banking & Credit — Repayments Tab View (formerly EMI Tracker).
 * Displays upcoming, paid, and overdue repayment schedules derived directly from
 * authoritative loan contracts (NOT a second loan ledger).
 * Supports explicit delegated EMI payment actions.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Calendar, CheckCircle, AlertTriangle, ChevronRight, Check } from 'lucide-react-native';
import { LoanRepository } from '../../services/loans/loanRepository';
import { LoanViewModel } from '../../services/loans/loanViewModel';
import AmortizationTable from '../loans/AmortizationTable';

export default function RepaymentsView({
    repayments = [],
    initialFilter = 'UPCOMING',
    onRepaymentPaid
}) {
    const [filter, setFilter] = useState(initialFilter); // 'UPCOMING' | 'PAID' | 'OVERDUE'
    const [selectedSchedule, setSelectedSchedule] = useState(null);

    const filtered = repayments.filter(r => {
        if (filter === 'UPCOMING') return r.category === 'UPCOMING';
        if (filter === 'PAID') return r.category === 'PAID';
        if (filter === 'OVERDUE') return r.category === 'OVERDUE' || r.isOverdue;
        return true;
    });

    const handlePayEmi = (repayment) => {
        Alert.alert(
            'Record EMI Payment',
            `Confirm payment of ${repayment.formattedAmount} for ${repayment.title}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm Pay',
                    onPress: async () => {
                        try {
                            await LoanRepository.recordPayment(repayment.loanId, repayment.amountPaise, {
                                evidence: 'REPAYMENTS_CALENDAR_PAYMENT'
                            });
                            Alert.alert('Success', `Payment recorded for ${repayment.title}`);
                            if (onRepaymentPaid) onRepaymentPaid();
                        } catch (e) {
                            Alert.alert('Error', e.message);
                        }
                    }
                }
            ]
        );
    };

    const handleViewSchedule = async (repayment) => {
        try {
            const data = await LoanViewModel.getFacilitySchedule(repayment.loanId);
            setSelectedSchedule(data);
        } catch (e) {
            Alert.alert('Error', e.message);
        }
    };

    return (
        <View style={styles.container}>
            {/* Filter Tabs: [Upcoming] [Paid] [Overdue] */}
            <View style={styles.filterBar}>
                {[
                    { id: 'UPCOMING', label: 'Upcoming' },
                    { id: 'PAID', label: 'Paid' },
                    { id: 'OVERDUE', label: 'Overdue' }
                ].map(tab => {
                    const isSelected = filter === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.filterTab, isSelected && styles.filterTabActive]}
                            onPress={() => setFilter(tab.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Repayments List */}
            {filtered.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Calendar size={40} color="#64748B" />
                    <Text style={styles.emptyTitle}>No {filter.toLowerCase()} repayments</Text>
                    <Text style={styles.emptySubtitle}>All repayment installments are projected from authoritative loan contracts.</Text>
                </View>
            ) : (
                <View style={styles.repaymentsList}>
                    {filtered.map(item => (
                        <View key={item.id} style={styles.repaymentCard}>
                            <TouchableOpacity
                                style={styles.cardHeader}
                                onPress={() => handleViewSchedule(item)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cardIconBox}>
                                    <Calendar size={20} color="#8B5CF6" />
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>{item.title}</Text>
                                    <Text style={styles.cardDueDate}>Due: {item.dueDate}</Text>
                                </View>
                                <View style={styles.amountCol}>
                                    <Text style={styles.amountText}>{item.formattedAmount}</Text>
                                    {item.isOverdue && (
                                        <Text style={styles.overdueBadge}>OVERDUE</Text>
                                    )}
                                </View>
                                <ChevronRight size={16} color="#64748B" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>

                            {/* Action Row */}
                            {filter !== 'PAID' && (
                                <View style={styles.cardActionRow}>
                                    <TouchableOpacity
                                        style={styles.payButton}
                                        onPress={() => handlePayEmi(item)}
                                        activeOpacity={0.8}
                                    >
                                        <Check size={14} color="#10B981" />
                                        <Text style={styles.payButtonText}>Record Pay</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {selectedSchedule && (
                <AmortizationTable
                    scheduleData={selectedSchedule}
                    onClose={() => setSelectedSchedule(null)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 32
    },
    filterBar: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    filterTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8
    },
    filterTabActive: {
        backgroundColor: '#1E293B'
    },
    filterTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B'
    },
    filterTabTextActive: {
        color: '#F8FAFC'
    },
    repaymentsList: {
        gap: 12
    },
    repaymentCard: {
        backgroundColor: '#0F172A',
        borderColor: '#1E293B',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    cardIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#8B5CF615',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    cardInfo: {
        flex: 1
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 2
    },
    cardDueDate: {
        fontSize: 12,
        color: '#64748B'
    },
    amountCol: {
        alignItems: 'flex-end'
    },
    amountText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    overdueBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: '#EF4444',
        marginTop: 2
    },
    cardActionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#1E293B'
    },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#10B98115',
        borderWidth: 1,
        borderColor: '#10B98130'
    },
    payButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981'
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
        marginTop: 12,
        marginBottom: 6
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18
    }
});
