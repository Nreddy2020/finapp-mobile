/**
 * FinLife Banking Relationship Intelligence — Bank Loan Detail View
 * 
 * Rebuilt according to the authoritative Loan Hub contract:
 * 1. Key Metrics: Outstanding, Rate, EMI, Remaining Months
 * 2. Payment Progress (Principal vs Interest paid)
 * 3. Next Payment breakdown (Principal vs Interest)
 * 4. WHAT CAN YOU DO? (3 Explicit Action Cards: Pay EMI, Prepay Principal, Foreclose Loan)
 * 5. Sub-tabs (Amortization Plan, Interest Breakdown, Journal Ledger)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, CreditCard, Calendar, CheckCircle2, TrendingDown, DollarSign, ShieldAlert, FileText, Activity, AlertCircle, Percent, ArrowUpRight } from 'lucide-react-native';
import { BankingService } from '../../services/bankingService';
import { formatINR, formatPrecisionINR, formatPaise } from './bankingPresentationAdapter';
import PaymentPlanView from './PaymentPlanView';
import InterestIntelligenceView from './InterestIntelligenceView';
import RecordEMIModal from './modals/RecordEMIModal';
import PrepaymentIntelligenceModal from './modals/PrepaymentIntelligenceModal';
import ForeclosureModal from './modals/ForeclosureModal';

export default function BankLoanDetailView({
    loan,
    bank,
    projection = null,
    journal = [],
    onBack,
    onDataChanged
}) {
    const [activeSubTab, setActiveSubTab] = useState('ACTIONS'); // 'ACTIONS' | 'SCHEDULE' | 'INTEREST' | 'LEDGER'

    // Modal Trigger States
    const [recordEMIModalVisible, setRecordEMIModalVisible] = useState(false);
    const [prepayModalVisible, setPrepayModalVisible] = useState(false);
    const [forecloseModalVisible, setForecloseModalVisible] = useState(false);

    const loanProj = projection?.loans?.[loan.id] || {};
    const schedule = projection?.schedules?.[loan.id] || [];

    const outP = loanProj.outstandingPrincipalPaise !== undefined ? loanProj.outstandingPrincipalPaise : loan.originalPrincipalPaise;
    const paidP = loanProj.principalPaidPaise || 0;
    const paidI = loanProj.interestPaidPaise || 0;

    const nextPending = schedule.find(s => s.status === 'PENDING' || s.status === 'PARTIALLY_PAID' || s.status === 'DUE' || s.status === 'OVERDUE');
    const remainingInstallments = schedule.filter(s => s.status !== 'PAID' && s.status !== 'CLOSED_BY_SETTLEMENT');
    const monthsRemaining = remainingInstallments.length > 0 ? remainingInstallments.length : loan.tenureMonths;

    const pctRepaid = loan.originalPrincipalPaise > 0
        ? Math.min(100, Math.round((paidP / loan.originalPrincipalPaise) * 100))
        : 0;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <ArrowLeft size={16} color="#818CF8" />
                <Text style={styles.backBtnText}>{`Back to ${bank?.name || 'Banking'}`}</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.headerSection}>
                <Text style={styles.loanTitle}>{loan.loanName}</Text>
                <Text style={styles.loanSub}>{`${bank?.name || 'Bank'} • ${loan.loanType || 'Loan'} • Account: ${loan.loanNumberMasked || '•••• 0000'}`}</Text>
            </View>

            {/* 1. Key Metrics Grid */}
            <View style={styles.sectionCard}>
                <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                        <Text style={styles.gridValHighlight}>{formatPaise(outP)}</Text>
                        <Text style={styles.gridLabel}>Outstanding</Text>
                    </View>
                    <View style={styles.gridCol}>
                        <Text style={styles.gridVal}>{`${loan.interestRate}% p.a.`}</Text>
                        <Text style={styles.gridLabel}>Interest rate</Text>
                    </View>
                </View>

                <View style={[styles.gridRow, { marginTop: 12 }]}>
                    <View style={styles.gridCol}>
                        <Text style={styles.gridVal}>
                            {nextPending ? formatPaise(nextPending.expectedTotalPaise) : formatPaise(loan.contractualEMIPaise)}
                        </Text>
                        <Text style={styles.gridLabel}>Monthly EMI</Text>
                    </View>
                    <View style={styles.gridCol}>
                        <Text style={styles.gridVal}>{`${monthsRemaining} mo`}</Text>
                        <Text style={styles.gridLabel}>Months remaining</Text>
                    </View>
                </View>
            </View>

            {/* 2. Payment Progress */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>PAYMENT PROGRESS</Text>
                
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${pctRepaid}%` }]} />
                </View>

                <View style={styles.progressFooter}>
                    <Text style={styles.progressText}>
                        Principal paid: <Text style={{ color: '#10B981', fontWeight: '700' }}>{formatPaise(paidP, true)}</Text> ({pctRepaid}%)
                    </Text>
                    <Text style={styles.progressText}>
                        Interest paid: <Text style={{ color: '#F87171', fontWeight: '700' }}>{formatPaise(paidI, true)}</Text>
                    </Text>
                </View>
            </View>

            {/* 3. Next Payment Breakdown */}
            {nextPending && (
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>NEXT PAYMENT</Text>
                    <View style={styles.nextPayRow}>
                        <View>
                            <Text style={styles.nextPayDate}>{`Due ${nextPending.dueDate}`}</Text>
                            <Text style={styles.nextPayAmount}>{formatPaise(nextPending.expectedTotalPaise)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                            <Text style={styles.sliceText}>
                                Principal: <Text style={{ color: '#E5E7EB', fontWeight: '700' }}>{formatPaise(nextPending.expectedPrincipalPaise)}</Text>
                            </Text>
                            <Text style={styles.sliceText}>
                                Interest: <Text style={{ color: '#F87171', fontWeight: '700' }}>{formatPaise(nextPending.expectedInterestPaise)}</Text>
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* 4. WHAT CAN YOU DO? (3 Differentiated Action Cards) */}
            {loanProj.status === 'ACTIVE' && (
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>WHAT CAN YOU DO?</Text>
                    
                    <View style={{ gap: 8 }}>
                        {/* Action 1: Pay EMI */}
                        {nextPending && (
                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => setRecordEMIModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <View>
                                    <Text style={[styles.actionCardTitle, { color: '#10B981' }]}>Pay EMI</Text>
                                    <Text style={styles.actionCardSub}>Next scheduled installment</Text>
                                </View>
                                <Text style={[styles.actionCardAmount, { color: '#10B981' }]}>
                                    {formatPaise(nextPending.expectedTotalPaise)}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Action 2: Prepay Principal */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => setPrepayModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <View>
                                <Text style={[styles.actionCardTitle, { color: '#F59E0B' }]}>Prepay Principal</Text>
                                <Text style={styles.actionCardSub}>Simulate Option A (Tenure) vs Option B (EMI)</Text>
                            </View>
                            <Text style={styles.actionLink}>{'Simulate →'}</Text>
                        </TouchableOpacity>

                        {/* Action 3: Foreclose Loan */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => setForecloseModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <View>
                                <Text style={[styles.actionCardTitle, { color: '#F87171' }]}>Foreclose Loan</Text>
                                <Text style={styles.actionCardSub}>Full early settlement quote</Text>
                            </View>
                            <Text style={[styles.actionLink, { color: '#F87171' }]}>{'Get Quote →'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Sub-Tabs: Amortization Plan | Interest Cost | Journal Ledger */}
            <View style={styles.subNavBar}>
                {[
                    { id: 'ACTIONS', label: 'Overview' },
                    { id: 'SCHEDULE', label: `Amortization (${schedule.length})` },
                    { id: 'INTEREST', label: 'Interest Cost' },
                    { id: 'LEDGER', label: 'Journal Ledger' }
                ].map(t => (
                    <TouchableOpacity
                        key={t.id}
                        style={[styles.subNavPill, activeSubTab === t.id && styles.subNavPillActive]}
                        onPress={() => setActiveSubTab(t.id)}
                    >
                        <Text style={[styles.subNavPillText, activeSubTab === t.id && styles.subNavPillTextActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeSubTab === 'SCHEDULE' && (
                <PaymentPlanView schedule={schedule} originalPrincipalPaise={loan.originalPrincipalPaise} />
            )}

            {activeSubTab === 'INTEREST' && (
                <InterestIntelligenceView loan={loan} schedule={schedule} projection={projection} />
            )}

            {activeSubTab === 'LEDGER' && (
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>IMMUTABLE JOURNAL LEDGER</Text>
                    <View style={{ gap: 6 }}>
                        {journal.filter(j => j.metadata?.loanId === loan.id || j.entityId === loan.id).map(entry => (
                            <View key={entry.id} style={styles.ledgerEntry}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={styles.ledgerType}>{entry.eventType}</Text>
                                    <Text style={styles.ledgerDate}>{entry.timestamp?.split('T')[0]}</Text>
                                </View>
                                <Text style={styles.ledgerDesc}>{entry.description}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Action Modals */}
            {nextPending && (
                <RecordEMIModal
                    visible={recordEMIModalVisible}
                    loan={loan}
                    installment={nextPending}
                    onClose={() => setRecordEMIModalVisible(false)}
                    onSuccess={() => { setRecordEMIModalVisible(false); onDataChanged(); }}
                />
            )}

            <PrepaymentIntelligenceModal
                visible={prepayModalVisible}
                loan={loan}
                outstandingPrincipalPaise={outP}
                contractualEMIPaise={nextPending?.expectedTotalPaise || loan.contractualEMIPaise}
                remainingMonths={monthsRemaining}
                onClose={() => setPrepayModalVisible(false)}
                onSuccess={() => { setPrepayModalVisible(false); onDataChanged(); }}
            />

            <ForeclosureModal
                visible={forecloseModalVisible}
                loan={loan}
                outstandingPrincipalPaise={outP}
                onClose={() => setForecloseModalVisible(false)}
                onSuccess={() => { setForecloseModalVisible(false); onDataChanged(); }}
            />

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#090A14',
        padding: 16
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12
    },
    backBtnText: {
        color: '#818CF8',
        fontSize: 12,
        fontWeight: '700'
    },
    headerSection: {
        marginBottom: 14
    },
    loanTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900'
    },
    loanSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    sectionCard: {
        backgroundColor: '#121324',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        gap: 8
    },
    sectionHeader: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    gridCol: {
        flex: 1
    },
    gridValHighlight: {
        color: '#F87171',
        fontSize: 18,
        fontWeight: '900'
    },
    gridVal: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    gridLabel: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#1E2038',
        borderRadius: 3,
        overflow: 'hidden',
        marginVertical: 4
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 3
    },
    progressFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    progressText: {
        color: '#94A3B8',
        fontSize: 10
    },
    nextPayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    nextPayDate: {
        color: '#71717A',
        fontSize: 10
    },
    nextPayAmount: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        marginTop: 2
    },
    sliceText: {
        color: '#94A3B8',
        fontSize: 10
    },
    actionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0F1022',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12
    },
    actionCardTitle: {
        fontSize: 13,
        fontWeight: '800'
    },
    actionCardSub: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    },
    actionCardAmount: {
        fontSize: 14,
        fontWeight: '800'
    },
    actionLink: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '700'
    },
    subNavBar: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12
    },
    subNavPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: '#121324',
        borderWidth: 1,
        borderColor: '#1E2038'
    },
    subNavPillActive: {
        backgroundColor: '#3730A3',
        borderColor: '#6366F1'
    },
    subNavPillText: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700'
    },
    subNavPillTextActive: {
        color: '#FFFFFF'
    },
    ledgerEntry: {
        backgroundColor: '#0F1022',
        borderRadius: 8,
        padding: 10,
        gap: 2
    },
    ledgerType: {
        color: '#818CF8',
        fontSize: 10,
        fontWeight: '800'
    },
    ledgerDate: {
        color: '#71717A',
        fontSize: 9
    },
    ledgerDesc: {
        color: '#E5E7EB',
        fontSize: 11
    }
});
