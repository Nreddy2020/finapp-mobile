import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { ArrowLeft, CheckCircle2, Clock, Plus, Tag, ArrowDownLeft, ArrowUpRight, DollarSign, Calendar, Info, Layers, RefreshCw } from 'lucide-react-native';
import { formatINR, formatPrecisionINR } from './p2pPresentationAdapter';
import { calculateLoanDNA, calculateInterestTimeline } from './p2pAccountingEngine';
import { LOAN_DIRECTION, LOAN_STATUS } from './p2pDomainModel';

export default function P2PLoanDetailView({
    loan,
    person,
    advances = [],
    repayments = [],
    schedule = [],
    onBack,
    onRecordPayment,
    onAddTopUp,
    onSettleLoan,
    onUpdateNotesTags
}) {
    if (!loan || !person) return null;

    const [activeTab, setActiveTab] = useState('SUMMARY'); // 'SUMMARY' | 'TIMELINE' | 'REPAYMENTS' | 'LEDGER' | 'TOPUPS'
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [noteInput, setNoteInput] = useState(loan.notes || '');

    const dna = useMemo(() => calculateLoanDNA(loan), [loan]);

    const totalAdvanced = useMemo(() => {
        return advances.reduce((s, a) => s + (Number(a.amount) || 0), 0) || loan.principal;
    }, [advances, loan.principal]);

    const principalRepaid = useMemo(() => {
        return repayments.reduce((s, r) => s + (Number(r.principalComponent) || 0), 0);
    }, [repayments]);

    const interestPaid = useMemo(() => {
        return repayments.reduce((s, r) => s + (Number(r.interestComponent) || 0), 0);
    }, [repayments]);

    const outstandingPrincipal = Math.max(0, totalAdvanced - principalRepaid);
    const pctRepaid = totalAdvanced > 0 ? Math.min(100, Math.round((principalRepaid / totalAdvanced) * 100)) : 0;

    const interestTimeline = useMemo(() => {
        return calculateInterestTimeline({ loan, advances, repayments });
    }, [loan, advances, repayments]);

    const nextPendingItem = useMemo(() => {
        return schedule.find(s => s.status === 'PENDING' || s.status === 'PARTIALLY_PAID');
    }, [schedule]);

    const isGiven = loan.direction === LOAN_DIRECTION.GIVEN;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Top Back Navigation Bar */}
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <ArrowLeft size={16} color="#818CF8" />
                <Text style={styles.backBtnText}>Back to {person.name}</Text>
            </TouchableOpacity>

            {/* Hero Loan Header Card */}
            <View style={styles.heroCard}>
                <View style={styles.heroHeaderRow}>
                    <View>
                        <Text style={styles.heroPersonName}>{person.name}</Text>
                        <Text style={styles.heroLoanId}>Loan #{loan.id.replace('loan_', '')} • {loan.direction} • {loan.status}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: loan.status === 'ACTIVE' ? '#10B98120' : '#71717A20', borderColor: loan.status === 'ACTIVE' ? '#10B981' : '#71717A' }]}>
                        <Text style={[styles.statusBadgeText, { color: loan.status === 'ACTIVE' ? '#10B981' : '#71717A' }]}>
                            {loan.status}
                        </Text>
                    </View>
                </View>

                <View style={{ marginVertical: 10 }}>
                    <Text style={styles.heroOutstandingLabel}>Outstanding Principal</Text>
                    <Text style={[styles.heroOutstandingVal, { color: isGiven ? '#10B981' : '#EF4444' }]}>
                        {formatINR(outstandingPrincipal)}
                    </Text>
                    <Text style={styles.heroOriginalPrincipal}>
                        Original Principal: {formatINR(totalAdvanced)}
                    </Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pctRepaid}%`, backgroundColor: isGiven ? '#10B981' : '#818CF8' }]} />
                    </View>
                    <Text style={styles.progressText}>{pctRepaid}% Repaid</Text>
                </View>
            </View>

            {/* Tab Navigation Switcher (Summary | Interest Timeline | Repayments | Ledger | Top-ups) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
                {[
                    { key: 'SUMMARY', label: 'Summary' },
                    { key: 'TIMELINE', label: 'Interest Timeline' },
                    { key: 'REPAYMENTS', label: 'Repayments' },
                    { key: 'LEDGER', label: 'Transactions' },
                    { key: 'TOPUPS', label: 'Top-Ups' }
                ].map(tab => {
                    const isSelected = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.navTabItem, isSelected && styles.navTabItemActive]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Text style={[styles.navTabText, isSelected && styles.navTabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* ── SUB-VIEW 1: SUMMARY ── */}
            {activeTab === 'SUMMARY' && (
                <View style={styles.contentSection}>
                    {/* Principal Block */}
                    <Text style={styles.groupHeader}>PRINCIPAL</Text>
                    <View style={styles.breakdownTable}>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Principal {isGiven ? 'Given' : 'Taken'}</Text>
                            <Text style={styles.breakdownVal}>{formatINR(totalAdvanced)}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Principal Repaid</Text>
                            <Text style={[styles.breakdownVal, { color: '#10B981' }]}>{formatINR(principalRepaid)}</Text>
                        </View>
                        <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.breakdownLabel}>Principal Outstanding</Text>
                            <Text style={[styles.breakdownVal, { color: isGiven ? '#10B981' : '#EF4444', fontWeight: '900' }]}>
                                {formatINR(outstandingPrincipal)}
                            </Text>
                        </View>
                    </View>

                    {/* Interest Block */}
                    <Text style={[styles.groupHeader, { marginTop: 14 }]}>INTEREST ({dna.method})</Text>
                    <View style={styles.breakdownTable}>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Annual Interest Rate</Text>
                            <Text style={[styles.breakdownVal, { color: '#818CF8' }]}>{loan.interestRate}% / year</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Total Accrued</Text>
                            <Text style={styles.breakdownVal}>{formatINR(interestTimeline.totalAccrued)}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Total Paid</Text>
                            <Text style={[styles.breakdownVal, { color: '#10B981' }]}>{formatINR(interestPaid)}</Text>
                        </View>
                        <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.breakdownLabel}>Outstanding Interest</Text>
                            <Text style={[styles.breakdownVal, { color: interestTimeline.outstandingInterest > 0 ? '#F59E0B' : '#FFF' }]}>
                                {formatINR(interestTimeline.outstandingInterest)}
                            </Text>
                        </View>
                    </View>

                    {/* Total Expected */}
                    <Text style={[styles.groupHeader, { marginTop: 14 }]}>TOTAL CONTRACT</Text>
                    <View style={styles.breakdownTable}>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Total Expected Repayment</Text>
                            <Text style={[styles.breakdownVal, { fontWeight: '900' }]}>{formatINR(dna.totalExpectedRepayment)}</Text>
                        </View>
                        <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.breakdownLabel}>Linked Cash Account</Text>
                            <Text style={styles.breakdownVal}>{loan.accountId}</Text>
                        </View>
                    </View>

                    {/* Notes & Tags */}
                    <View style={styles.notesCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={styles.notesTitle}>Notes & Tags</Text>
                            <TouchableOpacity onPress={() => setIsEditingNotes(!isEditingNotes)}>
                                <Text style={{ color: '#818CF8', fontSize: 11, fontWeight: '700' }}>
                                    {isEditingNotes ? 'Done' : 'Edit'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {isEditingNotes ? (
                            <TextInput
                                value={noteInput}
                                onChangeText={setNoteInput}
                                onBlur={() => onUpdateNotesTags && onUpdateNotesTags({ ...loan, notes: noteInput })}
                                placeholder="Add notes about this loan..."
                                placeholderTextColor="#71717A"
                                style={styles.notesInput}
                                multiline
                            />
                        ) : (
                            <Text style={styles.notesText}>{loan.notes || 'No notes added.'}</Text>
                        )}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {(loan.tags || []).map(t => (
                                <View key={t} style={styles.tagChip}>
                                    <Tag size={10} color="#818CF8" />
                                    <Text style={styles.tagChipText}>{t}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            )}

            {/* ── SUB-VIEW 2: INTEREST TIMELINE ── */}
            {activeTab === 'TIMELINE' && (
                <View style={styles.contentSection}>
                    <View style={styles.interestSummaryGrid}>
                        <View style={styles.interestSummaryBox}>
                            <Text style={styles.interestSummaryLabel}>Annual Rate</Text>
                            <Text style={styles.interestSummaryVal}>{interestTimeline.annualRate}%</Text>
                        </View>
                        <View style={styles.interestSummaryBox}>
                            <Text style={styles.interestSummaryLabel}>Monthly Rate</Text>
                            <Text style={styles.interestSummaryVal}>{interestTimeline.monthlyRatePct}%</Text>
                        </View>
                        <View style={styles.interestSummaryBox}>
                            <Text style={styles.interestSummaryLabel}>Accrued</Text>
                            <Text style={[styles.interestSummaryVal, { color: '#818CF8' }]}>{formatINR(interestTimeline.totalAccrued)}</Text>
                        </View>
                        <View style={styles.interestSummaryBox}>
                            <Text style={styles.interestSummaryLabel}>Paid</Text>
                            <Text style={[styles.interestSummaryVal, { color: '#10B981' }]}>{formatINR(interestTimeline.totalPaid)}</Text>
                        </View>
                    </View>

                    <Text style={styles.groupHeader}>MONTHLY ACCRUAL TIMELINE</Text>
                    <View style={{ gap: 8 }}>
                        {interestTimeline.timeline.map(item => (
                            <View key={item.monthIndex} style={styles.timelineItem}>
                                <View>
                                    <Text style={styles.timelinePeriod}>{item.periodLabel}</Text>
                                    <Text style={styles.timelineDates}>{item.periodStart} to {item.periodEnd}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                    <Text style={styles.timelineAmount}>{formatINR(item.accruedAmount)}</Text>
                                    <View style={[
                                        styles.timelineBadge,
                                        item.status === 'Paid' && { backgroundColor: '#10B98120', borderColor: '#10B98150' },
                                        item.status === 'Upcoming' && { backgroundColor: '#818CF820', borderColor: '#818CF850' },
                                        item.status === 'Overdue' && { backgroundColor: '#EF444420', borderColor: '#EF444450' }
                                    ]}>
                                        <Text style={[
                                            styles.timelineBadgeText,
                                            item.status === 'Paid' && { color: '#10B981' },
                                            item.status === 'Upcoming' && { color: '#818CF8' },
                                            item.status === 'Overdue' && { color: '#EF4444' }
                                        ]}>{item.status}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* ── SUB-VIEW 3: REPAYMENTS & SCHEDULE ── */}
            {activeTab === 'REPAYMENTS' && (
                <View style={styles.contentSection}>
                    {loan.status === 'ACTIVE' && (
                        <View style={styles.actionsContainer}>
                            <Text style={styles.groupHeader}>FINANCIAL ACTIONS & PAYMENTS</Text>

                            {/* 1. Pay Next Installment (🟢 Green Action) */}
                            {nextPendingItem && (
                                <View style={styles.actionCardNext}>
                                    <View style={styles.actionCardHeader}>
                                        <View style={[styles.actionIconBadge, { backgroundColor: '#10B98120' }]}>
                                            <CheckCircle2 size={16} color="#10B981" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.actionCardTitle}>1. Pay Next Installment</Text>
                                            <Text style={styles.actionCardSub}>
                                                Installment #{nextPendingItem.installmentNumber} • Due {nextPendingItem.dueDate}
                                            </Text>
                                        </View>
                                        <Text style={[styles.actionCardAmount, { color: '#10B981' }]}>
                                            {formatINR(nextPendingItem.expectedAmount - (nextPendingItem.paidAmount || 0))}
                                        </Text>
                                    </View>

                                    <View style={styles.actionBreakdownRow}>
                                        <Text style={styles.actionBreakdownItem}>
                                            Principal: <Text style={{ color: '#FFF', fontWeight: '700' }}>{formatINR(nextPendingItem.principalComponent)}</Text>
                                        </Text>
                                        <Text style={styles.actionBreakdownItem}>
                                            Interest: <Text style={{ color: '#818CF8', fontWeight: '700' }}>{formatINR(nextPendingItem.interestComponent)}</Text>
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
                                        onPress={() => onRecordPayment(loan, nextPendingItem)}
                                    >
                                        <CheckCircle2 size={14} color="#FFF" />
                                        <Text style={styles.primaryActionBtnText}>
                                            Pay Next Installment — {formatINR(nextPendingItem.expectedAmount - (nextPendingItem.paidAmount || 0))}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* 2. Prepay Principal (🟠 Amber Action) */}
                            <View style={styles.actionCardPrepay}>
                                <View style={styles.actionCardHeader}>
                                    <View style={[styles.actionIconBadge, { backgroundColor: '#F59E0B20' }]}>
                                        <DollarSign size={16} color="#F59E0B" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.actionCardTitle}>2. Prepay Principal (Lump-Sum)</Text>
                                        <Text style={styles.actionCardSub}>
                                            Reduces opening balance & re-amortizes future schedule
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={[styles.primaryActionBtn, { backgroundColor: '#F59E0B' }]}
                                    onPress={() => onRecordPayment(loan, null, { isPrincipalPrepayment: true })}
                                >
                                    <Text style={[styles.primaryActionBtnText, { color: '#000' }]}>
                                        Prepay Principal (e.g. ₹1,00,000)
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* 3. Settle & Close Loan (🔴 Red Action) */}
                            <View style={styles.actionCardSettle}>
                                <View style={styles.actionCardHeader}>
                                    <View style={[styles.actionIconBadge, { backgroundColor: '#EF444420' }]}>
                                        <RefreshCw size={16} color="#EF4444" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.actionCardTitle}>3. Settle & Close Loan</Text>
                                        <Text style={styles.actionCardSub}>
                                            Full closure with waiver reconciliation
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={[styles.primaryActionBtn, { backgroundColor: '#EF4444' }]}
                                    onPress={() => onSettleLoan(loan)}
                                >
                                    <Text style={styles.primaryActionBtnText}>
                                        Settle & Close Loan — {formatINR(outstandingPrincipal)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <Text style={[styles.groupHeader, { marginTop: 16 }]}>AMORTIZATION SCHEDULE</Text>
                    <View style={{ gap: 8 }}>
                        {schedule.map(item => (
                            <View key={item.id} style={styles.scheduleRow}>
                                <View>
                                    <Text style={styles.scheduleNumber}>#{item.installmentNumber} • {item.dueDate}</Text>
                                    <Text style={styles.scheduleSub}>
                                        Principal: {formatINR(item.principalComponent)} • Interest: {formatINR(item.interestComponent)}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                    <Text style={styles.scheduleAmount}>{formatINR(item.expectedAmount)}</Text>
                                    <Text style={[styles.scheduleStatus, item.status === 'PAID' ? { color: '#10B981' } : item.status === 'PARTIALLY_PAID' ? { color: '#F59E0B' } : item.status === 'PREPAID' ? { color: '#818CF8' } : item.status === 'SKIPPED' ? { color: '#EC4899' } : { color: '#71717A' }]}>
                                        {item.status}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* ── SUB-VIEW 4: TRANSACTIONS LEDGER ── */}
            {activeTab === 'LEDGER' && (
                <View style={styles.contentSection}>
                    <Text style={styles.groupHeader}>DOUBLE-ENTRY TRANSACTION LEDGER</Text>
                    {repayments.length === 0 && advances.length === 0 ? (
                        <Text style={{ color: '#71717A', fontStyle: 'italic' }}>No transactions recorded.</Text>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {advances.map(adv => (
                                <View key={adv.id} style={styles.ledgerRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={[styles.ledgerIcon, { backgroundColor: isGiven ? '#EF444420' : '#10B98120' }]}>
                                            {isGiven ? <ArrowUpRight size={14} color="#EF4444" /> : <ArrowDownLeft size={14} color="#10B981" />}
                                        </View>
                                        <View>
                                            <Text style={styles.ledgerDesc}>{adv.note || 'Loan Advance'}</Text>
                                            <Text style={styles.ledgerDate}>{adv.date} • {adv.accountId}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.ledgerAmt, { color: isGiven ? '#EF4444' : '#10B981' }]}>
                                        {isGiven ? '-' : '+'}{formatINR(adv.amount)}
                                    </Text>
                                </View>
                            ))}
                            {repayments.map(rep => (
                                <View key={rep.id} style={styles.ledgerRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={[styles.ledgerIcon, { backgroundColor: isGiven ? '#10B98120' : '#EF444420' }]}>
                                            {isGiven ? <ArrowDownLeft size={14} color="#10B981" /> : <ArrowUpRight size={14} color="#EF4444" />}
                                        </View>
                                        <View>
                                            <Text style={styles.ledgerDesc}>{rep.note || 'Loan Repayment'}</Text>
                                            <Text style={styles.ledgerDate}>
                                                {rep.date} • P: {formatINR(rep.principalComponent)} / I: {formatINR(rep.interestComponent)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.ledgerAmt, { color: isGiven ? '#10B981' : '#EF4444' }]}>
                                        {isGiven ? '+' : '-'}{formatINR(rep.amount)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* ── SUB-VIEW 5: TOP-UPS ── */}
            {activeTab === 'TOPUPS' && (
                <View style={styles.contentSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={styles.groupHeader}>ADVANCES & TOP-UPS</Text>
                        <TouchableOpacity
                            style={styles.addTopUpBtn}
                            onPress={() => onAddTopUp(loan)}
                        >
                            <Plus size={13} color="#FFF" />
                            <Text style={styles.addTopUpBtnText}>Add Top-Up</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ gap: 8 }}>
                        {advances.map(a => (
                            <View key={a.id} style={styles.topUpCard}>
                                <View>
                                    <Text style={styles.topUpTitle}>{a.isInitial ? 'Initial Advance' : 'Additional Advance'}</Text>
                                    <Text style={styles.topUpDate}>{a.date} • {a.accountId}</Text>
                                </View>
                                <Text style={styles.topUpAmount}>{formatINR(a.amount)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        paddingVertical: 4
    },
    backBtnText: {
        color: '#818CF8',
        fontSize: 12,
        fontWeight: '700'
    },
    heroCard: {
        backgroundColor: '#0F1026',
        borderColor: '#2B2D5C',
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12
    },
    heroHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    heroPersonName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    heroLoanId: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800'
    },
    heroOutstandingLabel: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700'
    },
    heroOutstandingVal: {
        fontSize: 24,
        fontWeight: '900',
        marginVertical: 2
    },
    heroOriginalPrincipal: {
        color: '#71717A',
        fontSize: 11
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6
    },
    progressTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#27272A',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressFill: {
        height: 6,
        borderRadius: 3
    },
    progressText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700'
    },
    tabScroll: {
        flexDirection: 'row',
        marginBottom: 14
    },
    navTabItem: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: '#121324',
        marginRight: 6,
        borderColor: '#232542',
        borderWidth: 1
    },
    navTabItemActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#818CF8'
    },
    navTabText: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700'
    },
    navTabTextActive: {
        color: '#FFFFFF',
        fontWeight: '800'
    },
    contentSection: {
        marginBottom: 20
    },
    groupHeader: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.8,
        marginBottom: 8,
        paddingHorizontal: 2
    },
    breakdownTable: {
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#1E2038'
    },
    breakdownLabel: {
        color: '#94A3B8',
        fontSize: 12
    },
    breakdownVal: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    notesCard: {
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginTop: 14
    },
    notesTitle: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '800'
    },
    notesText: {
        color: '#D4D4D8',
        fontSize: 12,
        lineHeight: 16
    },
    notesInput: {
        color: '#FFFFFF',
        fontSize: 12,
        backgroundColor: '#181930',
        borderRadius: 8,
        padding: 8,
        minHeight: 50
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#312E8140',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    tagChipText: {
        color: '#818CF8',
        fontSize: 10,
        fontWeight: '700'
    },
    interestSummaryGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14
    },
    interestSummaryBox: {
        flex: 1,
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 10,
        padding: 8,
        alignItems: 'center'
    },
    interestSummaryLabel: {
        color: '#94A3B8',
        fontSize: 9,
        fontWeight: '700',
        marginBottom: 2
    },
    interestSummaryVal: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    timelineItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10
    },
    timelinePeriod: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    timelineDates: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    },
    timelineAmount: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    timelineBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1
    },
    timelineBadgeText: {
        fontSize: 9,
        fontWeight: '800'
    },
    nextPayCard: {
        backgroundColor: '#161836',
        borderColor: '#3730A3',
        borderWidth: 1.5,
        borderRadius: 14,
        padding: 14,
        marginBottom: 14
    },
    nextPayTitle: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '800'
    },
    nextPayDate: {
        color: '#F59E0B',
        fontSize: 13,
        fontWeight: '800',
        marginTop: 2
    },
    nextPayAmount: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        marginVertical: 4
    },
    nextPayRemaining: {
        color: '#71717A',
        fontSize: 11
    },
    recordPayBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#4F46E5',
        borderRadius: 10,
        paddingVertical: 10
    },
    recordPayBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    settleBtn: {
        backgroundColor: '#F9731620',
        borderColor: '#F97316',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    settleBtnText: {
        color: '#F97316',
        fontSize: 12,
        fontWeight: '800'
    },
    scheduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10
    },
    scheduleNumber: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    scheduleSub: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    },
    scheduleAmount: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    scheduleStatus: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase'
    },
    ledgerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10
    },
    ledgerIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    ledgerDesc: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    ledgerDate: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 1
    },
    ledgerAmt: {
        fontSize: 13,
        fontWeight: '800'
    },
    addTopUpBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#4F46E5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6
    },
    addTopUpBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800'
    },
    actionsContainer: {
        marginBottom: 16,
        gap: 10
    },
    actionCardNext: {
        backgroundColor: '#0A261A',
        borderColor: '#10B98150',
        borderWidth: 1.5,
        borderRadius: 14,
        padding: 14
    },
    actionCardPrepay: {
        backgroundColor: '#261C0A',
        borderColor: '#F59E0B50',
        borderWidth: 1.5,
        borderRadius: 14,
        padding: 14
    },
    actionCardSettle: {
        backgroundColor: '#260A0A',
        borderColor: '#EF444450',
        borderWidth: 1.5,
        borderRadius: 14,
        padding: 14
    },
    actionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8
    },
    actionIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
    actionCardTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    actionCardSub: {
        color: '#94A3B8',
        fontSize: 11,
        marginTop: 1
    },
    actionCardAmount: {
        fontSize: 16,
        fontWeight: '900'
    },
    actionBreakdownRow: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#00000040',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 10
    },
    actionBreakdownItem: {
        color: '#94A3B8',
        fontSize: 11
    },
    primaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 10,
        paddingVertical: 10
    },
    primaryActionBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    topUpCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10
    },
    topUpTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    topUpDate: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 1
    },
    topUpAmount: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '800'
    }
});

