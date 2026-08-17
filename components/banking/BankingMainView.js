/**
 * FinLife Banking Relationship Intelligence — Main View (Calm Architecture)
 * 
 * Rebuilt as a calm, typography-led, relationship-first experience.
 * Primary Navigation: Relationships (Default) | Accounts | Loans | Calendar | Insights.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { Landmark, CreditCard, Calendar, TrendingUp, AlertTriangle, Plus, ChevronRight, CheckCircle2, DollarSign, ShieldAlert, ArrowUpRight, ArrowDownLeft, Activity, Info } from 'lucide-react-native';
import { BankingService } from '../../services/bankingService';
import { formatPaise, computeBankingOverviewMetrics, computeBankRelationshipScorecard } from './bankingPresentationAdapter';
import BankDetailView from './BankDetailView';
import BankLoanDetailView from './BankLoanDetailView';
import EMICalendarView from './EMICalendarView';
import BankingInsightsView from './BankingInsightsView';
import AddBankModal from './modals/AddBankModal';
import AddBankAccountModal from './modals/AddBankAccountModal';
import AddBankLoanModal from './modals/AddBankLoanModal';

export default function BankingMainView({ onBack = null }) {
    const [activeTab, setActiveTab] = useState('RELATIONSHIPS'); // 'RELATIONSHIPS' (Default) | 'ACCOUNTS' | 'LOANS' | 'CALENDAR' | 'INSIGHTS'
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
            {/* Top Navigation Tabs: Relationships (Default) | Accounts | Loans | Calendar | Insights */}
            <View style={styles.navBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {[
                        { id: 'RELATIONSHIPS', label: 'Relationships' },
                        { id: 'ACCOUNTS', label: `Accounts (${bankingData.accounts.length})` },
                        { id: 'LOANS', label: `Loans (${overview.activeLoansCount})` },
                        { id: 'CALENDAR', label: 'Calendar' },
                        { id: 'INSIGHTS', label: 'Insights' }
                    ].map(tab => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.navPill, activeTab === tab.id && styles.navPillActive]}
                            onPress={() => setActiveTab(tab.id)}
                        >
                            <Text style={[styles.navPillText, activeTab === tab.id && styles.navPillTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* ── 1. RELATIONSHIPS VIEW (DEFAULT) ── */}
            {activeTab === 'RELATIONSHIPS' && (
                <View style={styles.contentContainer}>
                    {/* Your Banking Position (Calm Typography Summary) */}
                    <View style={styles.positionSection}>
                        <Text style={styles.sectionLabel}>YOUR BANKING POSITION</Text>
                        
                        <View style={styles.positionGrid}>
                            <View style={styles.positionCol}>
                                <Text style={styles.positionNum}>{overview.totalCashFormatted}</Text>
                                <Text style={styles.positionDesc}>Cash across banks</Text>
                            </View>
                            <View style={styles.positionCol}>
                                <Text style={[styles.positionNum, { color: '#F87171' }]}>{overview.totalDebtFormatted}</Text>
                                <Text style={styles.positionDesc}>Bank debt</Text>
                            </View>
                            <View style={styles.positionCol}>
                                <Text style={[styles.positionNum, { color: overview.isNetPositive ? '#10B981' : '#F59E0B' }]}>
                                    {overview.isNetPositive ? '+' : '-'}{overview.netPositionFormatted}
                                </Text>
                                <Text style={styles.positionDesc}>Net position</Text>
                            </View>
                        </View>
                    </View>

                    {/* Next Obligation */}
                    {overview.nextImmediateObligation && (
                        <View style={styles.calmSection}>
                            <Text style={styles.sectionLabel}>NEXT OBLIGATION</Text>
                            <View style={styles.obligationRow}>
                                <View>
                                    <Text style={styles.obligationAmount}>{overview.nextImmediateObligation.expectedTotalFormatted}</Text>
                                    <Text style={styles.obligationDesc}>
                                        {overview.nextImmediateObligation.loanName} ({overview.nextImmediateObligation.bankName})
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.obligationDue}>Due {overview.nextImmediateObligation.dueDate}</Text>
                                    <Text style={styles.obligationDays}>{overview.nextImmediateObligation.daysRemaining} days remaining</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Your Banks (Primary Interactive Navigation Objects) */}
                    <View style={styles.calmSection}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={styles.sectionLabel}>YOUR BANKS</Text>
                            <TouchableOpacity style={styles.addLink} onPress={() => setAddBankVisible(true)}>
                                <Plus size={13} color="#818CF8" />
                                <Text style={styles.addLinkText}>Add Bank</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ gap: 10 }}>
                            {overview.bankRelationships.map(b => (
                                <TouchableOpacity
                                    key={b.bankId}
                                    style={styles.relationshipCard}
                                    onPress={() => setSelectedBank(bankingData.banks.find(bank => bank.id === b.bankId))}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.relCardHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Landmark size={18} color="#818CF8" />
                                            <Text style={styles.relBankName}>{b.bankName}</Text>
                                        </View>
                                        <ChevronRight size={18} color="#71717A" />
                                    </View>

                                    <View style={styles.relNumbersRow}>
                                        <Text style={styles.relNumbersText}>
                                            <Text style={{ color: '#10B981', fontWeight: '700' }}>{b.totalCashFormatted} cash</Text> • <Text style={{ color: '#F87171', fontWeight: '700' }}>{b.totalDebtFormatted} debt</Text>
                                        </Text>
                                        <Text style={[styles.relNetText, { color: b.isNetPositive ? '#10B981' : '#F59E0B' }]}>
                                            Net {b.isNetPositive ? '+' : '-'}{b.netPositionFormatted}
                                        </Text>
                                    </View>

                                    {b.nextEMI && (
                                        <View style={styles.relFooterRow}>
                                            <Text style={styles.relFooterText}>
                                                Next EMI: <Text style={{ color: '#E5E7EB', fontWeight: '700' }}>{b.nextEMI.amountFormatted}</Text> ({b.nextEMI.daysRemaining} days)
                                            </Text>
                                            {b.health && (
                                                <Text style={styles.healthBadge}>Health: {b.health.score}/100</Text>
                                            )}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Decision / Prepayment Opportunity (Dynamic from Engine) */}
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

            {/* ── 2. ACCOUNTS VIEW ── */}
            {activeTab === 'ACCOUNTS' && (
                <View style={styles.contentContainer}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={styles.sectionLabel}>BANK ACCOUNTS</Text>
                        <TouchableOpacity style={styles.addLink} onPress={() => setAddAccountVisible(true)}>
                            <Plus size={13} color="#818CF8" />
                            <Text style={styles.addLinkText}>Add Account</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ gap: 8 }}>
                        {bankingData.accounts.map(acc => {
                            const proj = bankingData.projection?.accounts[acc.id] || {};
                            const bal = proj.ledgerBalancePaise !== undefined ? proj.ledgerBalancePaise : acc.openingBalancePaise;
                            const bank = bankingData.banks.find(b => b.id === acc.bankId);
                            return (
                                <View key={acc.id} style={styles.itemRow}>
                                    <View>
                                        <Text style={styles.itemName}>{acc.accountName}</Text>
                                        <Text style={styles.itemSub}>{bank?.name || 'Bank'} • {acc.accountType} • {acc.maskedAccountNumber}</Text>
                                    </View>
                                    <Text style={[styles.itemVal, { color: '#10B981' }]}>{formatPaise(bal)}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* ── 3. LOANS VIEW ── */}
            {activeTab === 'LOANS' && (
                <View style={styles.contentContainer}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={styles.sectionLabel}>FORMAL BANK LOANS</Text>
                        <TouchableOpacity style={styles.addLink} onPress={() => setAddLoanVisible(true)}>
                            <Plus size={13} color="#818CF8" />
                            <Text style={styles.addLinkText}>Add Loan</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ gap: 8 }}>
                        {bankingData.loans.map(loan => {
                            const proj = bankingData.projection?.loans[loan.id] || {};
                            const outP = proj.outstandingPrincipalPaise !== undefined ? proj.outstandingPrincipalPaise : loan.originalPrincipalPaise;
                            const bank = bankingData.banks.find(b => b.id === loan.bankId);
                            return (
                                <TouchableOpacity key={loan.id} style={styles.itemRow} onPress={() => setSelectedLoan(loan)}>
                                    <View>
                                        <Text style={styles.itemName}>{loan.loanName}</Text>
                                        <Text style={styles.itemSub}>{bank?.name || 'Bank'} • {loan.interestRate}% p.a. • {loan.tenureMonths} Mo</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.itemVal, { color: '#F87171' }]}>{formatPaise(outP)}</Text>
                                        <Text style={styles.itemLink}>{'View Details →'}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* ── 4. CALENDAR VIEW ── */}
            {activeTab === 'CALENDAR' && (
                <EMICalendarView
                    schedules={bankingData.projection?.schedules || bankingData.schedules}
                    loans={bankingData.loans}
                    banks={bankingData.banks}
                    totalCashPaise={overview.totalCashPaise}
                />
            )}

            {/* ── 5. INSIGHTS (CFO BRAIN) VIEW ── */}
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
        backgroundColor: '#090A14'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#090A14',
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
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1A1C30'
    },
    navPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#121324',
        borderWidth: 1,
        borderColor: '#1E2038'
    },
    navPillActive: {
        backgroundColor: '#3730A3',
        borderColor: '#6366F1'
    },
    navPillText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700'
    },
    navPillTextActive: {
        color: '#FFFFFF'
    },
    contentContainer: {
        padding: 16,
        gap: 18
    },
    sectionLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 8
    },
    positionSection: {
        backgroundColor: '#0F1022',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 14,
        padding: 16
    },
    positionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    positionCol: {
        flex: 1
    },
    positionNum: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 2
    },
    positionDesc: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '600'
    },
    calmSection: {
        gap: 4
    },
    obligationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121324',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 12,
        padding: 14
    },
    obligationAmount: {
        color: '#F59E0B',
        fontSize: 17,
        fontWeight: '800'
    },
    obligationDesc: {
        color: '#94A3B8',
        fontSize: 11,
        marginTop: 2
    },
    obligationDue: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    obligationDays: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    },
    relationshipCard: {
        backgroundColor: '#121324',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8
    },
    relCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    relBankName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    relNumbersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    relNumbersText: {
        color: '#94A3B8',
        fontSize: 12
    },
    relNetText: {
        fontSize: 12,
        fontWeight: '800'
    },
    relFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#1A1C30'
    },
    relFooterText: {
        color: '#71717A',
        fontSize: 10
    },
    healthBadge: {
        color: '#818CF8',
        fontSize: 10,
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
        borderRadius: 12,
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
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121324',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 12,
        padding: 14
    },
    itemName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    itemSub: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    },
    itemVal: {
        fontSize: 14,
        fontWeight: '800'
    },
    itemLink: {
        color: '#818CF8',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2
    }
});
