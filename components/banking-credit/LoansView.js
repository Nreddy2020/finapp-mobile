/**
 * components/banking-credit/LoansView.js
 * 
 * FinLife Banking & Credit — Loans Tab View.
 * Displays total loan outstanding banner, formal loan facility cards,
 * and delegated loan management workflows.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { FileText, Plus, ChevronRight, Home, Car, User, CreditCard } from 'lucide-react-native';
import AddLoanModal from '../loans/AddLoanModal';
import AmortizationTable from '../loans/AmortizationTable';
import PrepaymentSimulator from '../loans/PrepaymentSimulator';
import { LoanViewModel } from '../../services/loans/loanViewModel';

export default function LoansView({
    loans = [],
    totalLoanOutstandingFormatted = '₹0',
    onLoanPress,
    onLoanAdded
}) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);

    const getLoanIcon = (type = '') => {
        const lower = type.toLowerCase();
        if (lower.includes('home') || lower.includes('housing')) return Home;
        if (lower.includes('car') || lower.includes('auto') || lower.includes('vehicle')) return Car;
        if (lower.includes('personal')) return User;
        return CreditCard;
    };

    const handleViewSchedule = async (loan) => {
        try {
            const data = await LoanViewModel.getFacilitySchedule(loan.id);
            setSelectedSchedule(data);
        } catch (e) {
            Alert.alert('Error', e.message);
        }
    };

    return (
        <View style={styles.container}>
            {/* Top Total Loan Outstanding Banner */}
            <View style={styles.debtBanner}>
                <View style={styles.bannerIconBox}>
                    <FileText size={24} color="#3B82F6" />
                </View>
                <View style={styles.bannerContent}>
                    <Text style={styles.bannerLabel}>Total Loan Outstanding</Text>
                    <Text style={styles.bannerValue}>{totalLoanOutstandingFormatted}</Text>
                </View>
            </View>

            {/* Loans Header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Formal Loans ({loans.length})</Text>
                <TouchableOpacity
                    style={styles.addSmallBtn}
                    onPress={() => setShowAddModal(true)}
                    activeOpacity={0.7}
                >
                    <Plus size={16} color="#60A5FA" />
                    <Text style={styles.addSmallBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            {/* Loans List */}
            {loans.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <FileText size={40} color="#64748B" />
                    <Text style={styles.emptyTitle}>No Formal Loans Found</Text>
                    <Text style={styles.emptySubtitle}>Track bank loans, reducing amortizations, and payoff plans.</Text>
                </View>
            ) : (
                <View style={styles.loansList}>
                    {loans.map(loan => {
                        const IconComp = getLoanIcon(loan.loanType || loan.name);
                        return (
                            <TouchableOpacity
                                key={loan.id}
                                style={styles.loanCard}
                                onPress={() => {
                                    if (onLoanPress) onLoanPress(loan);
                                    else handleViewSchedule(loan);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.loanIconBox}>
                                    <IconComp size={20} color="#60A5FA" />
                                </View>
                                <View style={styles.loanDetails}>
                                    <Text style={styles.loanName}>{loan.name}</Text>
                                    <Text style={styles.loanMeta}>
                                        {loan.lenderName} · {loan.tenureRemainingFormatted}
                                    </Text>
                                </View>
                                <View style={styles.loanAmountCol}>
                                    <Text style={styles.loanAmountText}>{loan.formattedOutstanding}</Text>
                                    <Text style={styles.loanEmiText}>EMI: {loan.formattedMonthlyEmi}</Text>
                                </View>
                                <ChevronRight size={16} color="#64748B" style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Bottom Add Loan Button */}
            <TouchableOpacity
                style={styles.addLoanButton}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.8}
            >
                <Plus size={20} color="#F8FAFC" />
                <Text style={styles.addLoanButtonText}>Add Formal Loan</Text>
            </TouchableOpacity>

            {/* Delegated Modals */}
            <AddLoanModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSave={async () => {
                    setShowAddModal(false);
                    if (onLoanAdded) onLoanAdded();
                }}
            />

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
    debtBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E3A8A20',
        borderColor: '#2563EB40',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20
    },
    bannerIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#2563EB25',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14
    },
    bannerContent: {
        flex: 1
    },
    bannerLabel: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '600',
        marginBottom: 2
    },
    bannerValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#60A5FA',
        letterSpacing: -0.5
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    addSmallBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: '#60A5FA15'
    },
    addSmallBtnText: {
        fontSize: 12,
        color: '#60A5FA',
        fontWeight: '600'
    },
    loansList: {
        gap: 10
    },
    loanCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderColor: '#1E293B',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14
    },
    loanIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    loanDetails: {
        flex: 1
    },
    loanName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 2
    },
    loanMeta: {
        fontSize: 12,
        color: '#64748B'
    },
    loanAmountCol: {
        alignItems: 'flex-end'
    },
    loanAmountText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    loanEmiText: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2
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
    },
    addLoanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 20
    },
    addLoanButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F8FAFC'
    }
});
