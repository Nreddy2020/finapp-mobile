/**
 * components/cashbook/LedgerTableView.js
 * 
 * The Traditional Ledger Book View with Chronological Running Balances.
 * Supports:
 * - Mode A: Simple Cashbook (Date | Particulars | Money In | Money Out | Running Balance)
 * - Mode B: Account Ledger (Date | Particulars | Debit | Credit | Running Balance)
 * - Mode C: Multi-Line Split breakdown (for Loans EMI principal/interest, PF provenance)
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity
} from 'react-native';
import {
    BookOpen,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Layers,
    CheckCircle2,
    Calendar
} from 'lucide-react-native';
import { CashbookType } from '../../services/cashbook/cashbookContracts.js';

export default function LedgerTableView({
    ledgerData,
    bookType = CashbookType.SAVINGS,
    onSelectRow
}) {
    const [presentationMode, setPresentationMode] = useState('MODE_A'); // MODE_A (Cashbook) | MODE_B (Debit/Credit) | MODE_C (Detailed)

    if (!ledgerData || !ledgerData.rows) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No ledger entries recorded yet.</Text>
            </View>
        );
    }

    const { rows = [], summary = {} } = ledgerData;

    return (
        <View style={styles.container}>
            {/* Header with Mode Toggles */}
            <View style={styles.headerRow}>
                <View style={styles.headerTitleWrap}>
                    <BookOpen size={16} color="#38BDF8" />
                    <Text style={styles.headerTitle}>LEDGER</Text>
                </View>

                <View style={styles.modeToggleRow}>
                    <TouchableOpacity
                        style={[styles.modePill, presentationMode === 'MODE_A' && styles.modePillActive]}
                        onPress={() => setPresentationMode('MODE_A')}
                    >
                        <Text style={[styles.modePillText, presentationMode === 'MODE_A' && styles.modePillTextActive]}>
                            Cashbook
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.modePill, presentationMode === 'MODE_B' && styles.modePillActive]}
                        onPress={() => setPresentationMode('MODE_B')}
                    >
                        <Text style={[styles.modePillText, presentationMode === 'MODE_B' && styles.modePillTextActive]}>
                            Debit/Credit
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.modePill, presentationMode === 'MODE_C' && styles.modePillActive]}
                        onPress={() => setPresentationMode('MODE_C')}
                    >
                        <Text style={[styles.modePillText, presentationMode === 'MODE_C' && styles.modePillTextActive]}>
                            Splits
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Table Header Row */}
            <View style={styles.tableHeader}>
                <Text style={[styles.colHeader, styles.colDate]}>Date</Text>
                <Text style={[styles.colHeader, styles.colParticulars]}>Particulars</Text>
                {presentationMode === 'MODE_B' ? (
                    <>
                        <Text style={[styles.colHeader, styles.colAmount]}>Debit</Text>
                        <Text style={[styles.colHeader, styles.colAmount]}>Credit</Text>
                    </>
                ) : (
                    <>
                        <Text style={[styles.colHeader, styles.colAmount]}>Money In</Text>
                        <Text style={[styles.colHeader, styles.colAmount]}>Money Out</Text>
                    </>
                )}
                <Text style={[styles.colHeader, styles.colBalance]}>Balance</Text>
            </View>

            {/* Table Body */}
            <ScrollView style={styles.rowsScroll} showsVerticalScrollIndicator={false}>
                {rows.map((row, idx) => {
                    const isEven = idx % 2 === 0;

                    return (
                        <TouchableOpacity
                            key={row.id}
                            style={[
                                styles.tableRow,
                                isEven ? styles.rowEven : styles.rowOdd,
                                row.isVoided && styles.rowVoided,
                                row.isOpening && styles.rowOpening
                            ]}
                            onPress={() => onSelectRow && row.rawTxn && onSelectRow(row.rawTxn)}
                            activeOpacity={0.7}
                            disabled={!row.rawTxn}
                        >
                            {/* Date */}
                            <View style={styles.colDate}>
                                <Text style={styles.dateText}>
                                    {row.date ? row.date.substring(5) : ''}
                                </Text>
                            </View>

                            {/* Particulars */}
                            <View style={styles.colParticulars}>
                                <Text style={[styles.particularsText, row.isVoided && styles.textStrikethrough]} numberOfLines={1}>
                                    {row.particulars}
                                </Text>

                                {/* Badges & Split Indicators */}
                                <View style={styles.badgesRow}>
                                    {row.isOpening && (
                                        <View style={styles.openingBadge}>
                                            <Text style={styles.openingBadgeText}>OPENING</Text>
                                        </View>
                                    )}
                                    {row.isVoided && (
                                        <View style={styles.voidBadge}>
                                            <Text style={styles.voidBadgeText}>VOIDED</Text>
                                        </View>
                                    )}
                                    {row.loanSplit && presentationMode === 'MODE_C' && (
                                        <View style={styles.splitBadge}>
                                            <Text style={styles.splitBadgeText}>
                                                P: ₹{(Number(row.loanSplit.principal.paise) / 100).toLocaleString('en-IN')} | Int: ₹{(Number(row.loanSplit.interest.paise) / 100).toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                    )}
                                    {row.provenance && presentationMode === 'MODE_C' && (
                                        <View style={styles.splitBadge}>
                                            <Text style={styles.splitBadgeText}>
                                                EE: ₹{(Number(row.provenance.employee.paise) / 100).toLocaleString('en-IN')} | ER: ₹{(Number(row.provenance.employer.paise) / 100).toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Money In / Credit */}
                            <View style={styles.colAmount}>
                                {presentationMode === 'MODE_B' ? (
                                    <Text style={styles.debitText}>
                                        {row.debitFormatted || '—'}
                                    </Text>
                                ) : (
                                    <Text style={styles.inflowText}>
                                        {row.moneyInFormatted || '—'}
                                    </Text>
                                )}
                            </View>

                            {/* Money Out / Debit */}
                            <View style={styles.colAmount}>
                                {presentationMode === 'MODE_B' ? (
                                    <Text style={styles.creditText}>
                                        {row.creditFormatted || '—'}
                                    </Text>
                                ) : (
                                    <Text style={styles.outflowText}>
                                        {row.moneyOutFormatted || '—'}
                                    </Text>
                                )}
                            </View>

                            {/* Running Balance */}
                            <View style={styles.colBalance}>
                                <Text style={[
                                    styles.balanceText,
                                    row.isNegative ? styles.balanceNegative : styles.balancePositive
                                ]}>
                                    {row.runningBalanceFormatted}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {/* Footer Totals */}
                <View style={styles.tableFooter}>
                    <View style={styles.footerLabelWrap}>
                        <CheckCircle2 size={14} color="#10B981" />
                        <Text style={styles.footerLabel}>PERIOD CLOSING BALANCE</Text>
                    </View>
                    <Text style={[
                        styles.footerBalance,
                        summary.isNegative ? styles.balanceNegative : styles.balancePositive
                    ]}>
                        {summary.closingBalanceFormatted || '₹0'}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginHorizontal: 16,
        marginBottom: 20,
        overflow: 'hidden'
    },
    emptyContainer: {
        padding: 24,
        alignItems: 'center'
    },
    emptyText: {
        color: '#64748B',
        fontSize: 14
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
        backgroundColor: '#131D31'
    },
    headerTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    headerTitle: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6
    },
    modeToggleRow: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        borderRadius: 8,
        padding: 2
    },
    modePill: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6
    },
    modePillActive: {
        backgroundColor: '#38BDF8'
    },
    modePillText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '600'
    },
    modePillTextActive: {
        color: '#0F172A',
        fontWeight: '700'
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#334155'
    },
    colHeader: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700'
    },
    colDate: {
        width: 50
    },
    colParticulars: {
        flex: 1,
        paddingHorizontal: 4
    },
    colAmount: {
        width: 72,
        alignItems: 'flex-end',
        textAlign: 'right'
    },
    colBalance: {
        width: 82,
        alignItems: 'flex-end',
        textAlign: 'right'
    },
    rowsScroll: {
        maxHeight: 460
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B'
    },
    rowEven: {
        backgroundColor: '#0F172A'
    },
    rowOdd: {
        backgroundColor: '#111C35'
    },
    rowOpening: {
        backgroundColor: 'rgba(56, 189, 248, 0.05)'
    },
    rowVoided: {
        opacity: 0.45
    },
    dateText: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '600'
    },
    particularsText: {
        color: '#F1F5F9',
        fontSize: 12,
        fontWeight: '600'
    },
    textStrikethrough: {
        textDecorationLine: 'line-through'
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 2
    },
    openingBadge: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4
    },
    openingBadgeText: {
        color: '#38BDF8',
        fontSize: 9,
        fontWeight: '700'
    },
    voidBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4
    },
    voidBadgeText: {
        color: '#F87171',
        fontSize: 9,
        fontWeight: '700'
    },
    splitBadge: {
        backgroundColor: 'rgba(168, 85, 247, 0.12)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4
    },
    splitBadgeText: {
        color: '#C084FC',
        fontSize: 9,
        fontWeight: '600'
    },
    inflowText: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: '600'
    },
    outflowText: {
        color: '#F43F5E',
        fontSize: 11,
        fontWeight: '600'
    },
    debitText: {
        color: '#F43F5E',
        fontSize: 11,
        fontWeight: '600'
    },
    creditText: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: '600'
    },
    balanceText: {
        fontSize: 12,
        fontWeight: '700'
    },
    balancePositive: {
        color: '#10B981'
    },
    balanceNegative: {
        color: '#F59E0B'
    },
    tableFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#1E293B',
        borderTopWidth: 1,
        borderTopColor: '#334155'
    },
    footerLabelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    footerLabel: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    footerBalance: {
        fontSize: 15,
        fontWeight: '800'
    }
});
