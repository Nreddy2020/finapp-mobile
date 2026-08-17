import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, Plus, ChevronRight, Phone, Mail, FileText, Tag, Clock, CheckCircle } from 'lucide-react-native';
import { formatINR } from './p2pPresentationAdapter';

export default function P2PPersonDetailView({
    personSummary,
    onBack,
    onSelectLoan,
    onAddLoanForPerson
}) {
    if (!personSummary) return null;
    const { person, subLoans, totalGivenFormatted, totalReceivedFormatted, totalTakenFormatted, totalPaidFormatted, netOutstandingFormatted, nextPayment } = personSummary;

    const isGiven = personSummary.netOutstanding >= 0;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Top Back Navigation Bar */}
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <ArrowLeft size={16} color="#818CF8" />
                <Text style={styles.backBtnText}>Back to Loans</Text>
            </TouchableOpacity>

            {/* Person Hero Profile Card */}
            <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{person.name.substring(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.personName}>{person.name}</Text>
                        <Text style={styles.personSub}>{subLoans.length} Structured Loans</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addLoanQuickBtn}
                        onPress={() => onAddLoanForPerson(person)}
                    >
                        <Plus size={14} color="#FFF" />
                        <Text style={styles.addLoanQuickText}>Add Loan</Text>
                    </TouchableOpacity>
                </View>

                {/* Contact & Tags */}
                <View style={styles.contactRow}>
                    {person.phone ? (
                        <View style={styles.contactChip}>
                            <Phone size={11} color="#A1A1AA" />
                            <Text style={styles.contactChipText}>{person.phone}</Text>
                        </View>
                    ) : null}
                    {(person.tags || []).map(t => (
                        <View key={t} style={styles.tagChip}>
                            <Tag size={10} color="#818CF8" />
                            <Text style={styles.tagChipText}>{t}</Text>
                        </View>
                    ))}
                </View>

                {person.notes ? (
                    <Text style={styles.notesText}>"{person.notes}"</Text>
                ) : null}

                {/* 4-Box Metrics Grid */}
                <View style={styles.metricsGrid}>
                    <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>{isGiven ? 'Total Given' : 'Total Taken'}</Text>
                        <Text style={styles.metricVal}>{isGiven ? totalGivenFormatted : totalTakenFormatted}</Text>
                    </View>
                    <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>{isGiven ? 'Total Received' : 'Total Paid'}</Text>
                        <Text style={[styles.metricVal, { color: '#10B981' }]}>{isGiven ? totalReceivedFormatted : totalPaidFormatted}</Text>
                    </View>
                    <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>Outstanding</Text>
                        <Text style={[styles.metricVal, { color: isGiven ? '#10B981' : '#EF4444' }]}>{netOutstandingFormatted}</Text>
                    </View>
                    <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>Next Due</Text>
                        <Text style={[styles.metricVal, { color: '#F59E0B' }]}>
                            {nextPayment ? formatINR(nextPayment.expectedAmount, true) : 'None'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* List of Individual Loans */}
            <Text style={styles.sectionHeader}>LOANS WITH {person.name.toUpperCase()}</Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
                {subLoans.map(loan => (
                    <TouchableOpacity
                        key={loan.id}
                        style={styles.loanCard}
                        activeOpacity={0.7}
                        onPress={() => onSelectLoan(loan)}
                    >
                        <View style={styles.loanHeaderRow}>
                            <View>
                                <Text style={styles.loanId}>Loan #{loan.id.replace('loan_', '')}</Text>
                                <Text style={styles.loanMeta}>{loan.direction} • {loan.status}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.loanOutstanding, { color: loan.direction === 'GIVEN' ? '#10B981' : '#EF4444' }]}>
                                    {loan.outstandingPrincipalFormatted}
                                </Text>
                                <Text style={styles.loanInitial}>of {formatINR(loan.totalAdvanced)}</Text>
                            </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressRow}>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: `${loan.percentageRepaid}%` }]} />
                            </View>
                            <Text style={styles.progressText}>{loan.percentageRepaid}%</Text>
                        </View>

                        <View style={styles.loanFooterRow}>
                            <Text style={styles.loanRate}>{loan.interestRate}% {loan.interestMethod}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                <Text style={styles.viewDetailText}>View Details</Text>
                                <ChevronRight size={13} color="#818CF8" />
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
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
        marginBottom: 16
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#3730A3',
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900'
    },
    personName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    personSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    addLoanQuickBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#4F46E5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8
    },
    addLoanQuickText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800'
    },
    contactRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10
    },
    contactChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#1E2038',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    contactChipText: {
        color: '#A1A1AA',
        fontSize: 10
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#312E8140',
        borderColor: '#4F46E540',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    tagChipText: {
        color: '#818CF8',
        fontSize: 10,
        fontWeight: '700'
    },
    notesText: {
        color: '#94A3B8',
        fontSize: 11,
        fontStyle: 'italic',
        marginBottom: 12
    },
    metricsGrid: {
        flexDirection: 'row',
        gap: 8
    },
    metricBox: {
        flex: 1,
        backgroundColor: '#161836',
        borderColor: '#2A2C54',
        borderWidth: 1,
        borderRadius: 10,
        padding: 8,
        alignItems: 'center'
    },
    metricLabel: {
        color: '#94A3B8',
        fontSize: 9,
        fontWeight: '700',
        marginBottom: 2
    },
    metricVal: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    sectionHeader: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.8,
        marginBottom: 10,
        paddingHorizontal: 4
    },
    loanCard: {
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8
    },
    loanHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    loanId: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    loanMeta: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    loanOutstanding: {
        fontSize: 15,
        fontWeight: '900'
    },
    loanInitial: {
        color: '#64748B',
        fontSize: 10
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
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
        backgroundColor: '#10B981',
        borderRadius: 3
    },
    progressText: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700',
        width: 32,
        textAlign: 'right'
    },
    loanFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#1E2038'
    },
    loanRate: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '700'
    },
    viewDetailText: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '700'
    }
});
