/**
 * FinLife Banking Relationship Intelligence — Bank Detail View (Relationship Profile)
 * 
 * Rebuilt as a clean relationship profile:
 * 1. Financial facts & net position
 * 2. What you have vs what you owe
 * 3. This month's breakdown
 * 4. Upcoming schedule
 * 5. Dynamic insight
 * 6. Simple visual relationship map
 * 7. Transparent relationship health score
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Landmark, CreditCard, ChevronRight, Info, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react-native';
import { formatPaise, computeBankRelationshipScorecard } from './bankingPresentationAdapter';

export default function BankDetailView({
    bank,
    accounts = [],
    loans = [],
    projection = null,
    onBack,
    onSelectLoan,
    onDataChanged
}) {
    const [showHealthWhy, setShowHealthWhy] = useState(false);

    const scorecard = computeBankRelationshipScorecard({
        bank,
        accounts,
        loans,
        projection
    });

    if (!scorecard) return null;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <ArrowLeft size={16} color="#818CF8" />
                <Text style={styles.backBtnText}>Banking</Text>
            </TouchableOpacity>

            {/* Bank Header */}
            <View style={styles.headerSection}>
                <Text style={styles.bankTitle}>{bank.name}</Text>
                <Text style={styles.bankSub}>{`${bank.type || 'BANK'} • Relationship Status: ${bank.relationshipStatus || 'ACTIVE'}`}</Text>
            </View>

            {/* 1. Your Relationship Summary */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>YOUR RELATIONSHIP</Text>
                
                <View style={styles.factGrid}>
                    <View style={styles.factItem}>
                        <Text style={styles.factLabel}>Cash held</Text>
                        <Text style={[styles.factVal, { color: '#10B981' }]}>{scorecard.totalCashFormatted}</Text>
                    </View>
                    <View style={styles.factItem}>
                        <Text style={styles.factLabel}>Debt owed</Text>
                        <Text style={[styles.factVal, { color: '#F87171' }]}>{scorecard.totalDebtFormatted}</Text>
                    </View>
                    <View style={styles.factItem}>
                        <Text style={styles.factLabel}>Net position</Text>
                        <Text style={[styles.factVal, { color: scorecard.isNetPositive ? '#10B981' : '#F59E0B' }]}>
                            {`${scorecard.isNetPositive ? '+' : '-'}${scorecard.netPositionFormatted}`}
                        </Text>
                    </View>
                </View>
            </View>

            {/* 2. What You Have (Assets) */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>WHAT YOU HAVE</Text>
                <View style={{ gap: 8 }}>
                    {scorecard.accounts.map(acc => (
                        <View key={acc.id} style={styles.rowItem}>
                            <View>
                                <Text style={styles.rowItemName}>{acc.accountName}</Text>
                                <Text style={styles.rowItemSub}>{acc.accountType} • {acc.maskedAccountNumber}</Text>
                            </View>
                            <Text style={[styles.rowItemVal, { color: '#10B981' }]}>{acc.ledgerBalanceFormatted}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* 3. What You Owe (Liabilities) */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>WHAT YOU OWE</Text>
                <View style={{ gap: 8 }}>
                    {scorecard.loans.map(loan => (
                        <TouchableOpacity
                            key={loan.id}
                            style={styles.rowItem}
                            onPress={() => onSelectLoan(loan)}
                            activeOpacity={0.7}
                        >
                            <View>
                                <Text style={styles.rowItemName}>{loan.loanName}</Text>
                                <Text style={styles.rowItemSub}>
                                    {`${loan.interestRate}% p.a. • ${scorecard.monthlyEMIFormatted} EMI`}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.rowItemVal, { color: '#F87171' }]}>{loan.outstandingPrincipalFormatted}</Text>
                                <Text style={styles.linkText}>{'View Loan Hub →'}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* 4. This Month's Debt Service Breakdown */}
            {scorecard.totalDebtPaise > 0 && (
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>THIS MONTH</Text>
                    <View style={styles.factGrid}>
                        <View style={styles.factItem}>
                            <Text style={styles.factLabel}>Principal</Text>
                            <Text style={styles.factValSmall}>{scorecard.monthlyPrincipalFormatted}</Text>
                        </View>
                        <View style={styles.factItem}>
                            <Text style={styles.factLabel}>Interest</Text>
                            <Text style={[styles.factValSmall, { color: '#F87171' }]}>{scorecard.monthlyInterestFormatted}</Text>
                        </View>
                        <View style={styles.factItem}>
                            <Text style={styles.factLabel}>Total EMI</Text>
                            <Text style={[styles.factValSmall, { color: '#818CF8' }]}>{scorecard.monthlyEMIFormatted}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* 5. Dynamic Insight for this Bank */}
            {scorecard.bankPrepaymentInsight && (
                <View style={[styles.sectionCard, { backgroundColor: '#1C1917', borderColor: '#78350F' }]}>
                    <Text style={[styles.sectionHeader, { color: '#F59E0B' }]}>INSIGHT</Text>
                    <Text style={{ color: '#FDE68A', fontSize: 12, fontWeight: '800' }}>
                        {`Prepay ${scorecard.bankPrepaymentInsight.prepaymentAmountFormatted}`}
                    </Text>
                    <Text style={{ color: '#E5E7EB', fontSize: 11, marginTop: 2 }}>
                        {`Potential interest saving: ${scorecard.bankPrepaymentInsight.potentialSavingFormatted} (${scorecard.bankPrepaymentInsight.monthsSaved} months earlier debt-free).`}
                    </Text>
                </View>
            )}

            {/* 6. Visual Relationship Map */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>VISUAL RELATIONSHIP MAP</Text>
                
                <View style={styles.mapContainer}>
                    <View style={styles.mapCenterNode}>
                        <Landmark size={16} color="#818CF8" />
                        <Text style={styles.mapCenterTitle}>{bank.name}</Text>
                    </View>

                    <View style={styles.mapBranchRow}>
                        {/* You Hold */}
                        <View style={[styles.mapBranchBox, { borderColor: '#065F46' }]}>
                            <Text style={[styles.mapBranchLabel, { color: '#10B981' }]}>YOU HOLD</Text>
                            <Text style={[styles.mapBranchAmount, { color: '#10B981' }]}>{scorecard.map.holdTotalFormatted}</Text>
                            {scorecard.map.accounts.map(a => (
                                <Text key={a.id} style={styles.mapItemName} numberOfLines={1}>{a.accountName}</Text>
                            ))}
                        </View>

                        {/* You Owe */}
                        <View style={[styles.mapBranchBox, { borderColor: '#991B1B' }]}>
                            <Text style={[styles.mapBranchLabel, { color: '#F87171' }]}>YOU OWE</Text>
                            <Text style={[styles.mapBranchAmount, { color: '#F87171' }]}>{scorecard.map.oweTotalFormatted}</Text>
                            {scorecard.map.loans.map(l => (
                                <View key={l.id} style={{ alignItems: 'center' }}>
                                    <Text style={styles.mapItemName} numberOfLines={1}>{l.loanName}</Text>
                                    <Text style={styles.mapSubText}>{`${l.interestRate}% · ${scorecard.monthlyEMIFormatted} EMI`}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            {/* 7. Relationship Health & Explainability */}
            {scorecard.health && (
                <View style={styles.sectionCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.sectionHeader}>RELATIONSHIP HEALTH</Text>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                            onPress={() => setShowHealthWhy(!showHealthWhy)}
                        >
                            <Text style={styles.whyLink}>{`Why ${scorecard.health.score}?`}</Text>
                            {showHealthWhy ? <ChevronUp size={12} color="#818CF8" /> : <ChevronDown size={12} color="#818CF8" />}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.healthRow}>
                        <Text style={styles.healthScoreText}>{`${scorecard.health.score} / 100`}</Text>
                        <Text style={styles.healthGradeText}>{`Grade ${scorecard.health.grade}`}</Text>
                    </View>

                    <View style={styles.healthFactorsGrid}>
                        <Text style={styles.healthFactorItem}>{`Liquidity: ${scorecard.health.liquidityStatus}`}</Text>
                        <Text style={styles.healthFactorItem}>{`Debt Cost: ${scorecard.health.costStatus}`}</Text>
                        <Text style={styles.healthFactorItem}>{`Net Leverage: ${scorecard.health.positionStatus}`}</Text>
                        <Text style={styles.healthFactorItem}>{`Prepayment: ${scorecard.health.prepayStatus}`}</Text>
                    </View>

                    {showHealthWhy && (
                        <View style={styles.healthWhyBox}>
                            {scorecard.health.explanations.map((exp, idx) => (
                                <Text key={idx} style={styles.healthWhyText}>{`• ${exp}`}</Text>
                            ))}
                        </View>
                    )}
                </View>
            )}

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
    bankTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900'
    },
    bankSub: {
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
    factGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    factItem: {
        flex: 1
    },
    factLabel: {
        color: '#71717A',
        fontSize: 10,
        marginBottom: 2
    },
    factVal: {
        fontSize: 16,
        fontWeight: '800'
    },
    factValSmall: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    rowItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4
    },
    rowItemName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    rowItemSub: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    },
    rowItemVal: {
        fontSize: 13,
        fontWeight: '800'
    },
    linkText: {
        color: '#818CF8',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2
    },
    mapContainer: {
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4
    },
    mapCenterNode: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1E1B4B',
        borderColor: '#4338CA',
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8
    },
    mapCenterTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    mapBranchRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    mapBranchBox: {
        flex: 1,
        backgroundColor: '#0F1022',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
        gap: 2
    },
    mapBranchLabel: {
        fontSize: 9,
        fontWeight: '800'
    },
    mapBranchAmount: {
        fontSize: 14,
        fontWeight: '800',
        marginVertical: 2
    },
    mapItemName: {
        color: '#E5E7EB',
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center'
    },
    mapSubText: {
        color: '#71717A',
        fontSize: 9,
        textAlign: 'center'
    },
    healthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    healthScoreText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    healthGradeText: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: '700'
    },
    healthFactorsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 2
    },
    healthFactorItem: {
        color: '#94A3B8',
        fontSize: 10,
        backgroundColor: '#090A14',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4
    },
    whyLink: {
        color: '#818CF8',
        fontSize: 10,
        fontWeight: '700'
    },
    healthWhyBox: {
        backgroundColor: '#090A14',
        borderRadius: 8,
        padding: 10,
        gap: 4,
        marginTop: 6
    },
    healthWhyText: {
        color: '#94A3B8',
        fontSize: 10,
        lineHeight: 14
    }
});
