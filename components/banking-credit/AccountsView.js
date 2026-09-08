/**
 * components/banking-credit/AccountsView.js
 * 
 * FinLife Banking & Credit — Accounts Tab View.
 * Displays total bank balance banner, bank account cards, and delegated account management.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Landmark, Plus, ChevronRight, CreditCard, ShieldCheck } from 'lucide-react-native';
import AddBankAccountModal from '../banking/modals/AddBankAccountModal';

export default function AccountsView({
    accounts = [],
    totalBankBalanceFormatted = '₹0',
    onAccountPress,
    onAccountAdded
}) {
    const [showAddAccountModal, setShowAddAccountModal] = useState(false);

    return (
        <View style={styles.container}>
            {/* Top Total Bank Balance Banner */}
            <View style={styles.balanceBanner}>
                <View style={styles.bannerIconBox}>
                    <Landmark size={24} color="#10B981" />
                </View>
                <View style={styles.bannerContent}>
                    <Text style={styles.bannerLabel}>Total Bank Balance</Text>
                    <Text style={styles.bannerValue}>{totalBankBalanceFormatted}</Text>
                </View>
            </View>

            {/* Account Cards Header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bank Accounts ({accounts.length})</Text>
                <TouchableOpacity
                    style={styles.addSmallBtn}
                    onPress={() => setShowAddAccountModal(true)}
                    activeOpacity={0.7}
                >
                    <Plus size={16} color="#38BDF8" />
                    <Text style={styles.addSmallBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            {/* Account List */}
            {accounts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Landmark size={40} color="#64748B" />
                    <Text style={styles.emptyTitle}>No Bank Accounts Found</Text>
                    <Text style={styles.emptySubtitle}>Connect your bank account to monitor balances and cash flows.</Text>
                </View>
            ) : (
                <View style={styles.accountsList}>
                    {accounts.map(account => (
                        <TouchableOpacity
                            key={account.id}
                            style={styles.accountCard}
                            onPress={() => onAccountPress && onAccountPress(account)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.accountIconBox}>
                                <Landmark size={20} color="#38BDF8" />
                            </View>
                            <View style={styles.accountDetails}>
                                <Text style={styles.accountBankName}>{account.bankName}</Text>
                                <Text style={styles.accountMeta}>
                                    {account.accountType} · {account.accountNumberMasked}
                                </Text>
                            </View>
                            <View style={styles.accountBalanceCol}>
                                <Text style={styles.accountBalanceText}>{account.formattedBalance}</Text>
                            </View>
                            <ChevronRight size={16} color="#64748B" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Bottom Add Bank Account Button */}
            <TouchableOpacity
                style={styles.addAccountButton}
                onPress={() => setShowAddAccountModal(true)}
                activeOpacity={0.8}
            >
                <Plus size={20} color="#F8FAFC" />
                <Text style={styles.addAccountButtonText}>Add Bank Account</Text>
            </TouchableOpacity>

            {/* Delegated Modal */}
            <AddBankAccountModal
                visible={showAddAccountModal}
                onClose={() => setShowAddAccountModal(false)}
                onAccountCreated={() => {
                    setShowAddAccountModal(false);
                    if (onAccountAdded) onAccountAdded();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 32
    },
    balanceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#064E3B20',
        borderColor: '#05966940',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20
    },
    bannerIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#05966925',
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
        color: '#10B981',
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
        backgroundColor: '#38BDF815'
    },
    addSmallBtnText: {
        fontSize: 12,
        color: '#38BDF8',
        fontWeight: '600'
    },
    accountsList: {
        gap: 10
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderColor: '#1E293B',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14
    },
    accountIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    accountDetails: {
        flex: 1
    },
    accountBankName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 2
    },
    accountMeta: {
        fontSize: 12,
        color: '#64748B',
        textTransform: 'capitalize'
    },
    accountBalanceCol: {
        alignItems: 'flex-end'
    },
    accountBalanceText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC'
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
    addAccountButton: {
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
    addAccountButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F8FAFC'
    }
});
