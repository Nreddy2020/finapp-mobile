/**
 * FinLife Banking Relationship Intelligence — Main View (Calm Architecture)
 * 
 * Single source of truth & navigation: Relationships (Default) | Calendar | Insights.
 * Under each Bank Relationship:
 * - Bank Header (Name, Type/Badge, Health Score)
 * - 3-Column Position (Cash held | Total debt | Net position)
 * - Embedded Accounts (Balances, Available, Number)
 * - Embedded Loans (Outstanding, Rate, EMI, Months left)
 * - Next EMI obligation & direct relationship drilldown
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Landmark, CreditCard, Calendar, TrendingUp, Plus, ChevronRight, Activity, Bell, FileText, Wallet, ArrowUpRight } from 'lucide-react-native';
import { BankingService } from '../../services/bankingService';
import { formatPaise, computeBankingOverviewMetrics } from './bankingPresentationAdapter';
import BankDetailView from './BankDetailView';
import BankLoanDetailView from './BankLoanDetailView';
import EMICalendarView from './EMICalendarView';
import BankingInsightsView from './BankingInsightsView';
import AddBankModal from './modals/AddBankModal';
import AddBankAccountModal from './modals/AddBankAccountModal';
import AddBankLoanModal from './modals/AddBankLoanModal';

export default function BankingMainView({ onBack = null }) {
    const [activeTab, setActiveTab] = useState('RELATIONSHIPS'); // 'RELATIONSHIPS' (Default) | 'CALENDAR' | 'INSIGHTS'
    const [bankingData, setBankingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Drilldown State
    const [selectedBank, setSelectedBank] = useState(null);
    const [selectedLoan, setSelectedLoan] = useState(null);

    // Modal States
    const [addBankVisible, setAddBankVisible] = useState(false);
    const [addAccountVisible, setAddAccountVisible] = useState(false);
    const [addLoanVisible, setAddLoanVisible] = useState(false);

    const loadData = async () => {
        try {
            const data = await BankingService.loadAllBankingData();
            if (data.banks.length === 0 && data.loans.length === 0) {
                const seeded = await BankingService.resetToDemoFixture();
                setBankingData(seeded);
            } else {
                setBankingData(data);
            }
        } catch (error) {
            console.error('[Banking Main View] Error loading data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (loading || !bankingData) {
        return (
            <View style={styles.loadingContainer}>
                <Activity size={24} color="#818CF8" />
                <Text style={styles.loadingText}>Loading Banking Relationships...</Text>
            </View>
        );
    }

    // Drilldown 1: Loan Detail View (Priority)
    if (selectedLoan) {
        return (
            <BankLoanDetailView
                loan={selectedLoan}
                bank={bankingData.banks.find(b => b.id === selectedLoan.bankId)}
                projection={bankingData.projection}
                journal={bankingData.journal}
                onBack={() => { setSelectedLoan(null); loadData(); }}
                onDataChanged={loadData}
            />
        );
    }

    // Drilldown 2: Bank Detail View
    if (selectedBank) {
        return (
            <BankDetailView
                bank={selectedBank}
                accounts={bankingData.accounts}
                loans={bankingData.loans}
                projection={bankingData.projection}
                onBack={() => { setSelectedBank(null); loadData(); }}
                onSelectLoan={(loan) => setSelectedLoan(loan)}
                onDataChanged={loadData}
            />
        );
    }

    const overview = computeBankingOverviewMetrics({
        banks: bankingData.banks,
        accounts: bankingData.accounts,
        loans: bankingData.loans,
        projection: bankingData.projection
    });

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818CF8" />}
        >
            {/* Top Navigation Tabs: Relationships (Default) | Calendar | Insights */}
            <View style={styles.navBar}>
                <View style={styles.tabPillContainer}>
                    {[
                        { id: 'RELATIONSHIPS', label: 'Relationships' },
                        { id: 'CALENDAR', label: 'Calendar' },
                        { id: 'INSIGHTS', label: 'Insights' }
                    ].map(tab => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.navPill, activeTab === tab.id && styles.navPillActive]}
                            onPress={() => setActiveTab(tab.id)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.navPillText, activeTab === tab.id && styles.navPillTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* ── 1. RELATIONSHIPS VIEW (DEFAULT & SINGLE SOURCE OF TRUTH) ── */}
            {activeTab === 'RELATIONSHIPS' && (
                <View style={styles.contentContainer}>
                    {/* YOUR BANKING POSITION (Calm 3-Column Summary) */}
                    <View style={styles.positionSection}>
                        <Text style={styles.sectionLabel}>YOUR BANKING POSITION</Text>
                        
                        <View style={styles.positionGrid}>
                            <View style={styles.positionCol}>
                                <Text style={styles.positionDesc}>Cash across banks</Text>
                                <Text style={styles.positionNum}>{overview.totalCashFormatted}</Text>
                                <View style={styles.iconCircleMini}>
                                    <Landmark size={13} color="#818CF8" />
                                </View>
                            </View>
                            <View style={styles.positionCol}>
                                <Text style={styles.positionDesc}>Bank debt</Text>
                                <Text style={[styles.positionNum, { color: '#F87171' }]}>{overview.totalDebtFormatted}</Text>
                                <View style={styles.iconCircleMini}>
                                    <FileText size={13} color="#F87171" />
                                </View>
                            </View>
                            <View style={styles.positionCol}>
                                <Text style={styles.positionDesc}>Net position</Text>
                                <Text style={[styles.positionNum, { color: overview.isNetPositive ? '#10B981' : '#F59E0B' }]}>
                                    {overview.isNetPositive ? '+' : '-'}{overview.netPositionFormatted}
                                </Text>
                                <View style={styles.iconCircleMini}>
                                    <TrendingUp size={13} color={overview.isNetPositive ? '#10B981' : '#F59E0B'} />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* NEXT OBLIGATION */}
                    {overview.nextImmediateObligation && (
                        <View style={styles.obligationSection}>
                            <Text style={styles.sectionLabel}>NEXT OBLIGATION</Text>
                            <TouchableOpacity
                                style={styles.obligationCard}
                                onPress={() => {
                                    const l = bankingData.loans.find(loan => loan.id === overview.nextImmediateObligation.loanId);
                                    if (l) setSelectedLoan(l);
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.obligationLeft}>
                                    <Text style={styles.obligationAmount}>{overview.nextImmediateObligation.expectedTotalFormatted}</Text>
                                    <View style={styles.obligationDescRow}>
                                        <Text style={styles.obligationDesc}>{overview.nextImmediateObligation.loanName}</Text>
                                        <View style={styles.emiTag}>
                                            <Text style={styles.emiTagText}>EMI</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.obligationRight}>
                                    <Text style={styles.obligationDue}>Due {overview.nextImmediateObligation.dueDate}</Text>
                                    <Text style={styles.obligationDays}>{overview.nextImmediateObligation.daysRemaining} days remaining</Text>
                                    <ChevronRight size={16} color="#71717A" style={{ alignSelf: 'flex-end', marginTop: 2 }} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* YOUR BANK RELATIONSHIPS (The Central Container) */}
                    <View style={styles.calmSection}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionLabel}>YOUR BANK RELATIONSHIPS</Text>
                            <TouchableOpacity style={styles.addLink} onPress={() => setAddBankVisible(true)}>
                                <Plus size={13} color="#818CF8" />
                                <Text style={styles.addLinkText}>Add Bank</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ gap: 14 }}>
                            {overview.bankRelationships.map(b => {
                                const bankObj = bankingData.banks.find(bank => bank.id === b.bankId);
                                const bankAccounts = bankingData.accounts.filter(a => a.bankId === b.bankId);
                                const bankLoans = bankingData.loans.filter(l => l.bankId === b.bankId);

                                return (
                                    <View key={b.bankId} style={styles.relationshipMasterCard}>
                                        {/* Bank Header */}
                                        <TouchableOpacity
                                            style={styles.relCardHeader}
                                            onPress={() => setSelectedBank(bankObj)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.relBankInfo}>
                                                <View style={styles.bankAvatar}>
                                                    <Landmark size={20} color="#818CF8" />
                                                </View>
                                                <View>
                                                    <Text style={styles.relBankName}>{b.bankName}</Text>
                                                    <Text style={styles.relBankSub}>Primary Bank</Text>
                                                </View>
                                            </View>
                                            <View style={styles.relHeaderRight}>
                                                {b.health && (
                                                    <View style={styles.healthPill}>
                                                        <Text style={styles.healthPillText}>Health: {b.health.score}/100</Text>
                                                    </View>
                                                )}
                                                <ChevronRight size={18} color="#71717A" />
                                            </View>
                                        </TouchableOpacity>

                                        {/* 3-Column Metrics */}
                                        <View style={styles.relMetricsRow}>
                                            <View style={styles.relMetricCol}>
                                                <Text style={[styles.relMetricVal, { color: '#10B981' }]}>{b.totalCashFormatted}</Text>
                                                <Text style={styles.relMetricLabel}>Cash held</Text>
                                            </View>
                                            <View style={styles.relMetricCol}>
                                                <Text style={[styles.relMetricVal, { color: '#F87171' }]}>{b.totalDebtFormatted}</Text>
                                                <Text style={styles.relMetricLabel}>Total debt</Text>
                                            </View>
                                            <View style={styles.relMetricCol}>
                                                <Text style={[styles.relMetricVal, { color: b.isNetPositive ? '#10B981' : '#F59E0B' }]}>
                                                    {b.isNetPositive ? '+' : '-'}{b.netPositionFormatted}
                                                </Text>
                                                <Text style={styles.relMetricLabel}>Net position</Text>
                                            </View>
                                        </View>

                                        {/* Nested ACCOUNTS Section */}
                                        {bankAccounts.length > 0 && (
                                            <View style={styles.nestedSection}>
                                                <Text style={styles.nestedSectionTitle}>ACCOUNTS ({bankAccounts.length})</Text>
                                                <View style={{ gap: 8 }}>
                                                    {bankAccounts.map(acc => {
                                                        const proj = bankingData.projection?.accounts[acc.id] || {};
                                                        const bal = proj.ledgerBalancePaise !== undefined ? proj.ledgerBalancePaise : acc.openingBalancePaise;
                                                        const mask = acc.maskedAccountNumber || acc.accountNumberMasked || '•••• 4821';
                                                        return (
                                                            <TouchableOpacity
                                                                key={acc.id}
                                                                style={styles.nestedItemRow}
                                                                onPress={() => setSelectedBank(bankObj)}
                                                                activeOpacity={0.7}
                                                            >
                                                                <View style={styles.nestedItemLeft}>
                                                                    <View style={styles.accountIconContainer}>
                                                                        <CreditCard size={16} color="#818CF8" />
                                                                    </View>
                                                                    <View>
                                                                        <Text style={styles.nestedItemName}>{acc.accountName}</Text>
                                                                        <Text style={styles.nestedItemSub}>{acc.accountType || 'Savings'} ••••• {mask.replace(/[^0-9]/g, '') || '4821'}</Text>
                                                                    </View>
                                                                </View>
                                                                <View style={styles.nestedItemRight}>
                                                                    <Text style={styles.nestedItemVal}>{formatPaise(bal)}</Text>
                                                                    <Text style={styles.nestedItemSubVal}>Available: {formatPaise(bal)}</Text>
                                                                </View>
                                                                <ChevronRight size={16} color="#52525B" />
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        )}

                                        {/* Nested LOANS Section */}
                                        {bankLoans.length > 0 && (
                                            <View style={styles.nestedSection}>
                                                <Text style={styles.nestedSectionTitle}>LOANS ({bankLoans.length})</Text>
                                                <View style={{ gap: 8 }}>
                                                    {bankLoans.map(loan => {
                                                        const proj = bankingData.projection?.loans[loan.id] || {};
                                                        const outP = proj.outstandingPrincipalPaise !== undefined ? proj.outstandingPrincipalPaise : loan.originalPrincipalPaise;
                                                        const emiVal = b.nextEMI ? b.nextEMI.amountFormatted : formatPaise(5310531);
                                                        return (
                                                            <TouchableOpacity
                                                                key={loan.id}
                                                                style={styles.nestedItemRow}
                                                                onPress={() => setSelectedLoan(loan)}
                                                                activeOpacity={0.7}
                                                            >
                                                                <View style={styles.nestedItemLeft}>
                                                                    <View style={styles.loanIconContainer}>
                                                                        <FileText size={16} color="#F87171" />
                                                                    </View>
                                                                    <View>
                                                                        <Text style={styles.nestedItemName}>{loan.loanName}</Text>
                                                                        <Text style={styles.nestedItemSub}>{loan.interestRate}% p.a. • EMI {emiVal}</Text>
                                                                    </View>
                                                                </View>
                                                                <View style={styles.nestedItemRight}>
                                                                    <Text style={styles.nestedItemVal}>{formatPaise(outP)}</Text>
                                                                    <Text style={styles.nestedItemSubVal}>{loan.tenureMonths || 60} months left</Text>
                                                                </View>
                                                                <ChevronRight size={16} color="#52525B" />
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        )}

                                        {/* Card Footer */}
                                        <View style={styles.relFooterRow}>
                                            <Text style={styles.relFooterText}>
                                                {b.nextEMI ? (
                                                    <>Next EMI: <Text style={{ color: '#E5E7EB', fontWeight: '700' }}>{b.nextEMI.amountFormatted}</Text> ({b.nextEMI.daysRemaining} days)</>
                                                ) : (
                                                    <Text style={{ color: '#71717A' }}>No active obligations</Text>
                                                )}
                                            </Text>
                                            <TouchableOpacity onPress={() => setSelectedBank(bankObj)}>
                                                <Text style={styles.viewRelLink}>View Relationship</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Decision / Prepayment Opportunity */}
                    {overview.dynamicPrepaymentOpportunity && (
                        <View style={styles.decisionSection}>
                            <Text style={styles.decisionLabel}>DECISION INTELLIGENCE</Text>
                            <View style={styles.decisionCard}>
                                <Text style={styles.decisionTitle}>
                                    💡 Prepaying {overview.dynamicPrepaymentOpportunity.prepaymentAmountFormatted} on {overview.dynamicPrepaymentOpportunity.loanName}
                                </Text>
                                <Text style={styles.decisionSub}>
                                    Potential Interest Saved: <Text style={{ color: '#10B981', fontWeight: '800' }}>{overview.dynamicPrepaymentOpportunity.netBenefitFormatted}</Text> ({overview.dynamicPrepaymentOpportunity.monthsSaved} months earlier debt-free).
                                </Text>
                                <Text style={styles.decisionWhy}>
                                    {overview.dynamicPrepaymentOpportunity.explanation}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* ── 2. CALENDAR VIEW (CROSS-BANK OBLIGATIONS) ── */}
            {activeTab === 'CALENDAR' && (
                <EMICalendarView
                    schedules={bankingData.projection?.schedules || bankingData.schedules}
                    loans={bankingData.loans}
                    banks={bankingData.banks}
                    totalCashPaise={overview.totalCashPaise}
                />
            )}

            {/* ── 3. INSIGHTS VIEW (CFO BRAIN) ── */}
            {activeTab === 'INSIGHTS' && (
                <BankingInsightsView
                    banks={bankingData.banks}
                    accounts={bankingData.accounts}
                    loans={bankingData.loans}
                    projection={bankingData.projection}
                    overview={overview}
                />
            )}

            {/* Modals */}
            <AddBankModal visible={addBankVisible} onClose={() => setAddBankVisible(false)} onBankAdded={loadData} />
            <AddBankAccountModal visible={addAccountVisible} banks={bankingData.banks} onClose={() => setAddAccountVisible(false)} onAccountAdded={loadData} />
            <AddBankLoanModal visible={addLoanVisible} banks={bankingData.banks} accounts={bankingData.accounts} onClose={() => setAddLoanVisible(false)} onLoanAdded={loadData} />

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#070810'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#070810',
        padding: 24,
        gap: 12
    },
    loadingText: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600'
    },
    navBar: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#121424'
    },
    tabPillContainer: {
        flexDirection: 'row',
        backgroundColor: '#101222',
        borderRadius: 22,
        padding: 4,
        gap: 4
    },
    navPill: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center'
    },
    navPillActive: {
        backgroundColor: '#3730A3'
    },
    navPillText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '700'
    },
    navPillTextActive: {
        color: '#FFFFFF'
    },
    contentContainer: {
        padding: 16,
        gap: 16
    },
    sectionLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    positionSection: {
        backgroundColor: '#0C0E1E',
        borderColor: '#181B34',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16
    },
    positionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    positionCol: {
        flex: 1,
        alignItems: 'center'
    },
    positionDesc: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4
    },
    positionNum: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 6
    },
    iconCircleMini: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#14172E',
        alignItems: 'center',
        justifyContent: 'center'
    },
    obligationSection: {
        gap: 4
    },
    obligationCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0C0E1E',
        borderColor: '#181B34',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16
    },
    obligationLeft: {
        gap: 4
    },
    obligationAmount: {
        color: '#F59E0B',
        fontSize: 22,
        fontWeight: '900'
    },
    obligationDescRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    obligationDesc: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '600'
    },
    emiTag: {
        backgroundColor: '#2E1065',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    emiTagText: {
        color: '#C084FC',
        fontSize: 9,
        fontWeight: '800'
    },
    obligationRight: {
        alignItems: 'flex-end',
        gap: 2
    },
    obligationDue: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    obligationDays: {
        color: '#71717A',
        fontSize: 10
    },
    calmSection: {
        gap: 4
    },
    addLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    addLinkText: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '700'
    },
    relationshipMasterCard: {
        backgroundColor: '#0C0E1E',
        borderColor: '#181B34',
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        gap: 14
    },
    relCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    relBankInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    bankAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1E1B4B',
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: '#3730A3',
        borderWidth: 1
    },
    relBankName: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800'
    },
    relBankSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 1
    },
    relHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    healthPill: {
        backgroundColor: '#064E3B',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    healthPillText: {
        color: '#34D399',
        fontSize: 10,
        fontWeight: '800'
    },
    relMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#11142A',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12
    },
    relMetricCol: {
        flex: 1,
        alignItems: 'center'
    },
    relMetricVal: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 2
    },
    relMetricLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '600'
    },
    nestedSection: {
        gap: 8
    },
    nestedSectionTitle: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    nestedItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#11142A',
        borderRadius: 12,
        padding: 12,
        gap: 10
    },
    nestedItemLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    accountIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#2E1065',
        alignItems: 'center',
        justifyContent: 'center'
    },
    loanIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#450A0A',
        alignItems: 'center',
        justifyContent: 'center'
    },
    nestedItemName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    nestedItemSub: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    },
    nestedItemRight: {
        alignItems: 'flex-end'
    },
    nestedItemVal: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    nestedItemSubVal: {
        color: '#71717A',
        fontSize: 9,
        marginTop: 2
    },
    relFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#181B34'
    },
    relFooterText: {
        color: '#71717A',
        fontSize: 11
    },
    viewRelLink: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '700'
    },
    decisionSection: {
        gap: 6
    },
    decisionLabel: {
        color: '#F59E0B',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    decisionCard: {
        backgroundColor: '#1C1917',
        borderColor: '#78350F',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 4
    },
    decisionTitle: {
        color: '#FDE68A',
        fontSize: 12,
        fontWeight: '800'
    },
    decisionSub: {
        color: '#E5E7EB',
        fontSize: 11,
        lineHeight: 16
    },
    decisionWhy: {
        color: '#A8A29E',
        fontSize: 10,
        fontStyle: 'italic',
        marginTop: 2
    }
});
