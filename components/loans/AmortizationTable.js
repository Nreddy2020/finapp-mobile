/**
 * components/loans/AmortizationTable.js
 * 
 * Formal Bank Loans V1 — Amortization Table Modal Component.
 * Renders period-by-period schedule with Opening, Installment,
 * Principal, Interest, and Closing Principal breakdown.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { toRupeesFormatted } from '../../services/loans/loanContracts.js';

export default function AmortizationTable({ visible, scheduleData, onClose }) {
    if (!visible || !scheduleData) return null;

    const { facility, schedule, summary } = scheduleData;

    const renderPeriodRow = ({ item }) => (
        <View style={styles.tableRow}>
            <View style={[styles.col, { flex: 0.8 }]}>
                <Text style={styles.periodText}>#{item.periodNumber}</Text>
                <Text style={styles.dateText}>{item.dueDate}</Text>
            </View>

            <View style={[styles.col, { flex: 1.2 }]}>
                <Text style={styles.amountText}>{toRupeesFormatted(item.installmentPaise)}</Text>
                <Text style={styles.splitText}>
                    P: {toRupeesFormatted(item.principalComponentPaise)}
                </Text>
            </View>

            <View style={[styles.col, { flex: 1.0 }]}>
                <Text style={[styles.amountText, styles.interestText]}>
                    {toRupeesFormatted(item.interestComponentPaise)}
                </Text>
                <Text style={styles.splitText}>Interest</Text>
            </View>

            <View style={[styles.col, { flex: 1.2, alignItems: 'flex-end' }]}>
                <Text style={styles.closingText}>{toRupeesFormatted(item.closingPrincipalPaise)}</Text>
                <Text style={styles.splitText}>Balance</Text>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle}>Amortization Schedule</Text>
                            <Text style={styles.modalSubtitle}>
                                {facility?.name} ({facility?.annualRatePercent}% p.a.)
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Summary Banner */}
                    <View style={styles.summaryBanner}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>TOTAL INTEREST</Text>
                            <Text style={styles.summaryValue}>
                                {toRupeesFormatted(summary?.totalInterestPaidPaise || 0n)}
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>TENURE</Text>
                            <Text style={styles.summaryValue}>{summary?.tenureMonths} Months</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>MATURITY</Text>
                            <Text style={styles.summaryValue}>{summary?.maturityDate}</Text>
                        </View>
                    </View>

                    {/* Table Column Headers */}
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.thText, { flex: 0.8 }]}>PERIOD</Text>
                        <Text style={[styles.thText, { flex: 1.2 }]}>EMI (PRINCIPAL)</Text>
                        <Text style={[styles.thText, { flex: 1.0 }]}>INTEREST</Text>
                        <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>CLOSING</Text>
                    </View>

                    {/* Schedule List */}
                    <FlatList
                        data={schedule || []}
                        keyExtractor={(item) => String(item.periodNumber)}
                        renderItem={renderPeriodRow}
                        contentContainerStyle={styles.listContainer}
                        initialNumToRender={15}
                        maxToRenderPerBatch={20}
                    />

                    {/* Footer Provenance Note */}
                    <View style={styles.footerNote}>
                        <Text style={styles.footerText}>
                            ℹ Mode A: Standard Monthly Reducing-Balance Schedule with final residual absorption.
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#0E101D',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
        paddingTop: 20,
        borderWidth: 1,
        borderColor: '#1E2337'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 14
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800'
    },
    modalSubtitle: {
        color: '#8A92B2',
        fontSize: 12,
        marginTop: 2
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1E2337',
        justifyContent: 'center',
        alignItems: 'center'
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    summaryBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#151829',
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12
    },
    summaryItem: {
        alignItems: 'center'
    },
    summaryLabel: {
        color: '#6F799E',
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 3
    },
    summaryValue: {
        color: '#E1E5F2',
        fontSize: 13,
        fontWeight: '700'
    },
    tableHeaderRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#111322',
        borderBottomWidth: 1,
        borderBottomColor: '#1F243A'
    },
    thText: {
        color: '#6F799E',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#171A2B',
        alignItems: 'center'
    },
    col: {
        justifyContent: 'center'
    },
    periodText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    dateText: {
        color: '#717B9E',
        fontSize: 10,
        marginTop: 2
    },
    amountText: {
        color: '#E1E5F2',
        fontSize: 12,
        fontWeight: '600'
    },
    interestText: {
        color: '#FFA502'
    },
    splitText: {
        color: '#717B9E',
        fontSize: 10,
        marginTop: 1
    },
    closingText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600'
    },
    footerNote: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#1A1E30',
        alignItems: 'center'
    },
    footerText: {
        color: '#656F94',
        fontSize: 11
    }
});
