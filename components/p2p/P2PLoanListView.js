import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Search, ChevronRight, User, Calendar, Clock, AlertTriangle, CheckCircle2, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { formatINR } from './p2pPresentationAdapter';
import { LOAN_DIRECTION, LOAN_STATUS } from './p2pDomainModel';

export default function P2PLoanListView({
    personSummaries = [],
    activeTab = 'GIVEN',
    onSelectTab,
    onSelectPerson,
    onSelectLoan,
    onAddLoan
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [subFilter, setSubFilter] = useState('ALL'); // 'ALL' | 'DUE_SOON' | 'OVERDUE'

    const filteredPersons = useMemo(() => {
        return personSummaries.filter(summary => {
            // Direction filter
            const hasRelevantLoans = summary.subLoans.some(l => {
                if (activeTab === 'SETTLED') return l.status === LOAN_STATUS.SETTLED;
                if (activeTab === 'GIVEN') return l.direction === LOAN_DIRECTION.GIVEN && l.status === LOAN_STATUS.ACTIVE;
                if (activeTab === 'TAKEN') return l.direction === LOAN_DIRECTION.TAKEN && l.status === LOAN_STATUS.ACTIVE;
                return true;
            });

            if (!hasRelevantLoans) return false;

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = (summary.person.name || '').toLowerCase().includes(q);
                const matchTags = (summary.person.tags || []).some(t => t.toLowerCase().includes(q));
                const matchLoanId = summary.subLoans.some(l => l.id.toLowerCase().includes(q) || (l.notes || '').toLowerCase().includes(q));
                if (!matchName && !matchTags && !matchLoanId) return false;
            }

            return true;
        });
    }, [personSummaries, activeTab, searchQuery, subFilter]);

    return (
        <View style={styles.container}>
            {/* Search Input Bar */}
            <View style={styles.searchBar}>
                <Search size={16} color="#71717A" />
                <TextInput
                    placeholder="Search people, loan ID, amount, tag..."
                    placeholderTextColor="#71717A"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                />
            </View>

            {/* Main Tabs: Given | Taken | Settled */}
            <View style={styles.tabsRow}>
                {[
                    { key: 'GIVEN', label: 'Given' },
                    { key: 'TAKEN', label: 'Taken' },
                    { key: 'SETTLED', label: 'Settled' }
                ].map(tab => {
                    const isSelected = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tabItem, isSelected && styles.tabItemActive]}
                            onPress={() => onSelectTab(tab.key)}
                        >
                            <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Sub-Filters: All | Due Soon | Overdue */}
            <View style={styles.subFilterRow}>
                {[
                    { key: 'ALL', label: 'All' },
                    { key: 'DUE_SOON', label: 'Due Soon' },
                    { key: 'OVERDUE', label: 'Overdue' }
                ].map(f => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.subFilterChip, subFilter === f.key && styles.subFilterChipActive]}
                        onPress={() => setSubFilter(f.key)}
                    >
                        <Text style={[styles.subFilterText, subFilter === f.key && styles.subFilterTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List of Person Grouped Cards */}
            {filteredPersons.length === 0 ? (
                <View style={styles.emptyStateCard}>
                    <Text style={styles.emptyStateIcon}>📋</Text>
                    <Text style={styles.emptyStateTitle}>No {activeTab.toLowerCase()} loans found</Text>
                    <Text style={styles.emptyStateSub}>
                        {searchQuery ? 'Try adjusting your search criteria.' : 'Create a new loan to start tracking P2P money.'}
                    </Text>
                    <TouchableOpacity style={styles.emptyAddBtn} onPress={onAddLoan}>
                        <Text style={styles.emptyAddBtnText}>+ Add P2P Loan</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={{ gap: 12 }}>
                    {filteredPersons.map(summary => {
                        const personLoans = summary.subLoans.filter(l => {
                            if (activeTab === 'SETTLED') return l.status === LOAN_STATUS.SETTLED;
                            if (activeTab === 'GIVEN') return l.direction === LOAN_DIRECTION.GIVEN && l.status === LOAN_STATUS.ACTIVE;
                            if (activeTab === 'TAKEN') return l.direction === LOAN_DIRECTION.TAKEN && l.status === LOAN_STATUS.ACTIVE;
                            return true;
                        });

                        return (
                            <View key={summary.person.id} style={styles.personCard}>
                                {/* Person Header */}
                                <TouchableOpacity
                                    style={styles.personHeader}
                                    activeOpacity={0.7}
                                    onPress={() => onSelectPerson(summary.person)}
                                >
                                    <View style={styles.personAvatar}>
                                        <Text style={styles.avatarText}>
                                            {summary.person.name.substring(0, 2).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.personName}>{summary.person.name}</Text>
                                        <Text style={styles.personSub}>
                                            {personLoans.length} loan{personLoans.length > 1 ? 's' : ''} • {activeTab === 'GIVEN' ? 'Receivable' : activeTab === 'TAKEN' ? 'Payable' : 'Settled'}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.personOutstanding, { color: activeTab === 'GIVEN' ? '#10B981' : activeTab === 'TAKEN' ? '#EF4444' : '#71717A' }]}>
                                            {summary.netOutstandingFormatted}
                                        </Text>
                                        <Text style={styles.personOutstandingLabel}>outstanding</Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Next Payment Pill */}
                                {summary.nextPayment && activeTab !== 'SETTLED' && (
                                    <View style={styles.nextPaymentRow}>
                                        <Clock size={12} color="#F59E0B" />
                                        <Text style={styles.nextPaymentText}>
                                            Next payment: <Text style={{ fontWeight: '800', color: '#FFF' }}>{formatINR(summary.nextPayment.expectedAmount)}</Text> • {summary.nextPayment.dueDate}
                                        </Text>
                                    </View>
                                )}

                                {/* Sub-Loans Snippets */}
                                <View style={styles.subLoansGrid}>
                                    {personLoans.map(loan => (
                                        <TouchableOpacity
                                            key={loan.id}
                                            style={styles.subLoanItem}
                                            activeOpacity={0.7}
                                            onPress={() => onSelectLoan(loan)}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={styles.subLoanId}>Loan #{loan.id.replace('loan_', '')}</Text>
                                                <Text style={styles.subLoanRate}>{loan.interestRate}% {loan.interestMethod}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                                                <Text style={styles.subLoanPrincipal}>{loan.outstandingPrincipalFormatted}</Text>
                                                <Text style={styles.subLoanPct}>{loan.percentageRepaid}% repaid</Text>
                                            </View>
                                            <View style={styles.progressTrack}>
                                                <View style={[styles.progressFill, { width: `${loan.percentageRepaid}%`, backgroundColor: activeTab === 'GIVEN' ? '#10B981' : '#818CF8' }]} />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Action: View Person Profile */}
                                <TouchableOpacity
                                    style={styles.viewLoansBtn}
                                    activeOpacity={0.7}
                                    onPress={() => onSelectPerson(summary.person)}
                                >
                                    <Text style={styles.viewLoansBtnText}>View All Loans with {summary.person.name}</Text>
                                    <ChevronRight size={14} color="#818CF8" />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 13
    },
    tabsRow: {
        flexDirection: 'row',
        backgroundColor: '#121324',
        borderRadius: 10,
        padding: 3,
        marginBottom: 10
    },
    tabItem: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8
    },
    tabItemActive: {
        backgroundColor: '#4F46E5'
    },
    tabText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '700'
    },
    tabTextActive: {
        color: '#FFFFFF',
        fontWeight: '800'
    },
    subFilterRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 14
    },
    subFilterChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#181930',
        borderColor: '#2D2F54',
        borderWidth: 1
    },
    subFilterChipActive: {
        backgroundColor: '#3730A3',
        borderColor: '#6366F1'
    },
    subFilterText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700'
    },
    subFilterTextActive: {
        color: '#FFFFFF'
    },
    personCard: {
        backgroundColor: '#0F1026',
        borderColor: '#25274C',
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 10
    },
    personHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    personAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#312E81',
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarText: {
        color: '#A5B4FC',
        fontSize: 13,
        fontWeight: '900'
    },
    personName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    personSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 1
    },
    personOutstanding: {
        fontSize: 15,
        fontWeight: '900'
    },
    personOutstandingLabel: {
        color: '#64748B',
        fontSize: 9
    },
    nextPaymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#78350F25',
        borderColor: '#F59E0B40',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5
    },
    nextPaymentText: {
        color: '#F59E0B',
        fontSize: 11
    },
    subLoansGrid: {
        gap: 6
    },
    subLoanItem: {
        backgroundColor: '#151638',
        borderColor: '#262854',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10
    },
    subLoanId: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '700'
    },
    subLoanRate: {
        color: '#818CF8',
        fontSize: 10,
        fontWeight: '700'
    },
    subLoanPrincipal: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    subLoanPct: {
        color: '#71717A',
        fontSize: 10
    },
    progressTrack: {
        height: 4,
        backgroundColor: '#27272A',
        borderRadius: 2,
        marginTop: 6,
        overflow: 'hidden'
    },
    progressFill: {
        height: 4,
        borderRadius: 2
    },
    viewLoansBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 6,
        borderTopWidth: 1,
        borderTopColor: '#202242'
    },
    viewLoansBtnText: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '700'
    },
    emptyStateCard: {
        backgroundColor: '#121324',
        borderRadius: 14,
        padding: 24,
        alignItems: 'center',
        gap: 6
    },
    emptyStateIcon: {
        fontSize: 32,
        marginBottom: 4
    },
    emptyStateTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    emptyStateSub: {
        color: '#71717A',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 10
    },
    emptyAddBtn: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8
    },
    emptyAddBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    }
});
