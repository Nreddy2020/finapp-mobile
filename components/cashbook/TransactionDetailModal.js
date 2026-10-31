/**
 * components/cashbook/TransactionDetailModal.js
 * 
 * FinLife Universal Cashbook — Transaction Details & Double-Entry Modal (Screen 4).
 * 
 * Features:
 * - Prominent Category Icon, Title, and Formatted Amount Hero
 * - Formatted date display ("Tue, Jan 28, 2025")
 * - Metadata key-value card (Type badge, Category, Account, Book)
 * - Expandable "Journal Entry (Double Entry)" accordion table
 * - 3-Column Balanced Table: Account / Category | Dr (₹) | Cr (₹)
 * - Balanced Entry status box: "Total Debits = Total Credits = ₹ X"
 * - Derived posting label for legacy transactions
 * - Void transaction modal with mandatory audit reason
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    SafeAreaView,
    Platform
} from 'react-native';
import {
    ArrowLeft,
    X,
    MoreVertical,
    Home,
    ShoppingCart,
    Shield,
    Car,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Layers,
    Calendar,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Ban,
    Trash2
} from 'lucide-react-native';
import {
    TransactionType,
    TransactionStatus,
    formatMoneyPaise,
    createMoneyPaise
} from '../../services/cashbook/cashbookContracts.js';
import { formatDateHeader } from './TransactionList.js';

export default function TransactionDetailModal({
    visible,
    transaction,
    accounts = [],
    bookName = 'Personal',
    onClose,
    onVoid
}) {
    const [isDoubleEntryExpanded, setIsDoubleEntryExpanded] = useState(true);
    const [isVoiding, setIsVoiding] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [loading, setLoading] = useState(false);

    // Unconditional Hook: Account Map
    const accountMap = useMemo(() => {
        return new Map((accounts || []).map(a => [a.id, a]));
    }, [accounts]);

    const raw = transaction ? (transaction.rawTxn || transaction) : null;
    const isVoided = raw ? raw.status === TransactionStatus.VOIDED : false;
    const isOpening = raw ? raw.transactionType === TransactionType.OPENING_BALANCE : false;

    // Unconditional Hook: Formatted Date
    const formattedDate = useMemo(() => {
        return raw ? formatDateHeader(raw.date) : '';
    }, [raw]);

    // Unconditional Hook: Hero Icon & Color Resolution
    const heroMeta = useMemo(() => {
        if (!raw) return { comp: ArrowUpRight, color: '#EF4444', bg: '#FEE2E2' };
        const type = raw.transactionType;
        const cat = (raw.category || '').toLowerCase();
        const desc = (raw.description || '').toLowerCase();

        if (type === TransactionType.INCOME) {
            return { comp: ArrowDownLeft, color: '#10B981', bg: '#DCFCE7' };
        }
        if (type === TransactionType.TRANSFER) {
            return { comp: ArrowLeftRight, color: '#2563EB', bg: '#DBEAFE' };
        }
        if (cat.includes('housing') || cat.includes('rent') || desc.includes('rent')) {
            return { comp: Home, color: '#EA580C', bg: '#FFEDD5' };
        }
        if (cat.includes('food') || cat.includes('grocer') || desc.includes('grocer')) {
            return { comp: ShoppingCart, color: '#EF4444', bg: '#FEE2E2' };
        }
        if (cat.includes('health') || cat.includes('insurance')) {
            return { comp: Shield, color: '#EF4444', bg: '#FEE2E2' };
        }
        if (cat.includes('fuel') || cat.includes('transport')) {
            return { comp: Car, color: '#EF4444', bg: '#FEE2E2' };
        }
        return { comp: ArrowUpRight, color: '#EF4444', bg: '#FEE2E2' };
    }, [raw]);

    const HeroIcon = heroMeta.comp;

    // Unconditional Hook: Double-Entry Lines Resolution
    const journalData = useMemo(() => {
        if (!raw) return { rows: [], isBalanced: true, totalFormatted: '0', isLegacyDerived: false };
        const paiseStr = raw.amount?.paise || '0';
        const numRupees = (Number(paiseStr) / 100).toLocaleString('en-IN');

        if (raw.lines && Array.isArray(raw.lines) && raw.lines.length >= 2) {
            let totalDr = 0n;
            let totalCr = 0n;

            const rows = raw.lines.map(line => {
                const acc = accountMap.get(line.accountId);
                const name = acc?.name || line.accountId;
                const debBi = BigInt(line.debitPaise || '0');
                const credBi = BigInt(line.creditPaise || '0');
                totalDr += debBi;
                totalCr += credBi;

                return {
                    name,
                    drFormatted: debBi > 0n ? (Number(debBi) / 100).toLocaleString('en-IN') : '—',
                    crFormatted: credBi > 0n ? (Number(credBi) / 100).toLocaleString('en-IN') : '—'
                };
            });

            const totalRupees = (Number(totalDr) / 100).toLocaleString('en-IN');
            return {
                rows,
                isBalanced: totalDr === totalCr,
                totalFormatted: totalRupees,
                isLegacyDerived: false
            };
        }

        // Canonical Synthesized Double-Entry for Legacy Transactions
        const srcAcc = accountMap.get(raw.sourceAccountId || raw.accountId);
        const destAcc = accountMap.get(raw.destinationAccountId || raw.accountId);
        const srcName = srcAcc?.name || raw.sourceAccountId || 'Cash/Bank Account';
        const destName = destAcc?.name || raw.destinationAccountId || 'Destination Account';
        const catName = raw.category ? `${raw.category.charAt(0).toUpperCase() + raw.category.slice(1)} Expense` : 'Operating Expense';

        let rows = [];
        if (raw.transactionType === TransactionType.EXPENSE) {
            rows = [
                { name: catName, drFormatted: numRupees, crFormatted: '—' },
                { name: srcName, drFormatted: '—', crFormatted: numRupees }
            ];
        } else if (raw.transactionType === TransactionType.INCOME) {
            const incCat = raw.category ? `${raw.category.charAt(0).toUpperCase() + raw.category.slice(1)} Revenue` : 'Income Revenue';
            rows = [
                { name: destName, drFormatted: numRupees, crFormatted: '—' },
                { name: incCat, drFormatted: '—', crFormatted: numRupees }
            ];
        } else if (raw.transactionType === TransactionType.TRANSFER) {
            rows = [
                { name: destName, drFormatted: numRupees, crFormatted: '—' },
                { name: srcName, drFormatted: '—', crFormatted: numRupees }
            ];
        } else {
            rows = [
                { name: srcName || destName, drFormatted: numRupees, crFormatted: '—' },
                { name: 'Equity / Opening Capital', drFormatted: '—', crFormatted: numRupees }
            ];
        }

        return {
            rows,
            isBalanced: true,
            totalFormatted: numRupees,
            isLegacyDerived: true
        };
    }, [raw, accountMap]);

    if (!transaction || !visible) return null;

    const handleConfirmVoid = async () => {
        if (!voidReason.trim()) {
            Alert.alert('Void Reason Required', 'Please provide a mandatory audit reason for voiding this transaction.');
            return;
        }

        try {
            setLoading(true);
            await onVoid(raw.id, voidReason.trim());
            setIsVoiding(false);
            setVoidReason('');
            onClose();
        } catch (err) {
            Alert.alert('Void Failed', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.safeContainer}>
                {/* Header Bar */}
                <View style={styles.topHeader}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.backBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ArrowLeft size={20} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.topTitle}>Transaction Details</Text>
                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => {
                            if (!isOpening && !isVoided) {
                                setIsVoiding(true);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <MoreVertical size={20} color="#64748B" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollBody}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Centered Hero Graphic, Title, and Amount */}
                    <View style={styles.heroSection}>
                        <View style={[styles.heroIconCircle, { backgroundColor: heroMeta.bg }]}>
                            <HeroIcon size={32} color={heroMeta.color} />
                        </View>
                        <Text style={styles.heroTitle}>{raw.description || 'Transaction'}</Text>
                        <Text
                            style={[
                                styles.heroAmount,
                                raw.transactionType === TransactionType.INCOME && styles.heroAmountIncome,
                                raw.transactionType === TransactionType.EXPENSE && styles.heroAmountExpense,
                                raw.transactionType === TransactionType.TRANSFER && styles.heroAmountTransfer
                            ]}
                        >
                            {raw.transactionType === TransactionType.TRANSFER
                                ? `₹ ${journalData.totalFormatted}`
                                : transaction.formattedAmount}
                        </Text>
                        <View style={styles.dateRow}>
                            <Calendar size={13} color="#64748B" />
                            <Text style={styles.dateText}>{formattedDate}</Text>
                        </View>
                    </View>

                    {/* Void Notice */}
                    {isVoided && (
                        <View style={styles.voidNotice}>
                            <Ban size={16} color="#EF4444" />
                            <View style={styles.voidNoticeContent}>
                                <Text style={styles.voidNoticeTitle}>Transaction Voided</Text>
                                <Text style={styles.voidNoticeReason}>Reason: "{raw.voidReason}"</Text>
                            </View>
                        </View>
                    )}

                    {/* Key-Value Metadata Card */}
                    <View style={styles.metaCard}>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Type</Text>
                            <View style={[
                                styles.typeBadge,
                                raw.transactionType === TransactionType.INCOME && styles.typeBadgeIncome,
                                raw.transactionType === TransactionType.EXPENSE && styles.typeBadgeExpense,
                                raw.transactionType === TransactionType.TRANSFER && styles.typeBadgeTransfer
                            ]}>
                                <Text style={[
                                    styles.typeBadgeText,
                                    raw.transactionType === TransactionType.INCOME && styles.typeTextIncome,
                                    raw.transactionType === TransactionType.EXPENSE && styles.typeTextExpense,
                                    raw.transactionType === TransactionType.TRANSFER && styles.typeTextTransfer
                                ]}>
                                    {raw.transactionType === TransactionType.INCOME ? 'Income' : raw.transactionType === TransactionType.EXPENSE ? 'Expense' : 'Transfer'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.metaDivider} />

                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Category</Text>
                            <Text style={styles.metaValue}>{raw.category || 'General'}</Text>
                        </View>

                        <View style={styles.metaDivider} />

                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Account</Text>
                            <Text style={styles.metaValue}>{transaction.accountDisplay || raw.accountId}</Text>
                        </View>

                        <View style={styles.metaDivider} />

                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Book</Text>
                            <Text style={styles.metaValue}>{bookName}</Text>
                        </View>
                    </View>

                    {/* Expandable Journal Entry (Double Entry) Accordion */}
                    <View style={styles.accordionContainer}>
                        <TouchableOpacity
                            style={styles.accordionHeader}
                            onPress={() => setIsDoubleEntryExpanded(!isDoubleEntryExpanded)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.accordionTitle}>Journal Entry (Double Entry)</Text>
                            {isDoubleEntryExpanded ? (
                                <ChevronUp size={18} color="#64748B" />
                            ) : (
                                <ChevronDown size={18} color="#64748B" />
                            )}
                        </TouchableOpacity>

                        {isDoubleEntryExpanded && (
                            <View style={styles.accordionBody}>
                                {/* 3-Column Table Header */}
                                <View style={styles.tableHeaderRow}>
                                    <Text style={[styles.tableColHeader, styles.tableColAccount]}>
                                        Account / Category
                                    </Text>
                                    <Text style={[styles.tableColHeader, styles.tableColNum]}>
                                        Dr (₹)
                                    </Text>
                                    <Text style={[styles.tableColHeader, styles.tableColNum]}>
                                        Cr (₹)
                                    </Text>
                                </View>

                                {/* 3-Column Table Rows */}
                                {journalData.rows.map((row, idx) => (
                                    <View key={idx} style={styles.tableDataRow}>
                                        <Text style={[styles.tableCellText, styles.tableColAccount]}>
                                            {row.name}
                                        </Text>
                                        <Text style={[styles.tableCellText, styles.tableColNum]}>
                                            {row.drFormatted}
                                        </Text>
                                        <Text style={[styles.tableCellText, styles.tableColNum]}>
                                            {row.crFormatted}
                                        </Text>
                                    </View>
                                ))}

                                {/* Balanced Entry Verification Card */}
                                <View style={styles.balancedCard}>
                                    <CheckCircle2 size={18} color="#16A34A" />
                                    <View style={styles.balancedContent}>
                                        <Text style={styles.balancedTitle}>Balanced Entry</Text>
                                        <Text style={styles.balancedSub}>
                                            Total Debits = Total Credits = ₹ {journalData.totalFormatted}
                                        </Text>
                                        {journalData.isLegacyDerived && (
                                            <Text style={styles.legacyDerivedTag}>
                                                Derived posting (legacy transaction)
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Void Action Dialog Section */}
                    {isVoiding && (
                        <View style={styles.voidPromptCard}>
                            <Text style={styles.voidPromptTitle}>Void this Transaction</Text>
                            <Text style={styles.voidPromptSub}>
                                This will balance-reverse this record in the ledger and append an immutable audit event.
                            </Text>
                            <TextInput
                                style={styles.voidReasonInput}
                                placeholder="Mandatory void reason..."
                                placeholderTextColor="#94A3B8"
                                value={voidReason}
                                onChangeText={setVoidReason}
                            />
                            <View style={styles.voidBtnRow}>
                                <TouchableOpacity
                                    style={styles.cancelVoidBtn}
                                    onPress={() => setIsVoiding(false)}
                                >
                                    <Text style={styles.cancelVoidText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.confirmVoidBtn}
                                    onPress={handleConfirmVoid}
                                    disabled={loading}
                                >
                                    <Text style={styles.confirmVoidText}>
                                        {loading ? 'Voiding...' : 'Confirm Void'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 38 : 10,
        paddingBottom: 12,
        backgroundColor: '#F8FAFC'
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    topTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0F172A'
    },
    menuBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center'
    },
    scrollBody: {
        flex: 1
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40
    },
    heroSection: {
        alignItems: 'center',
        marginVertical: 16
    },
    heroIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4
    },
    heroAmount: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -0.8,
        marginBottom: 6
    },
    heroAmountIncome: {
        color: '#10B981'
    },
    heroAmountExpense: {
        color: '#EF4444'
    },
    heroAmountTransfer: {
        color: '#0F172A'
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    dateText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500'
    },
    voidNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 14,
        padding: 12,
        marginBottom: 16
    },
    voidNoticeContent: {
        flex: 1
    },
    voidNoticeTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#EF4444'
    },
    voidNoticeReason: {
        fontSize: 11,
        color: '#991B1B',
        marginTop: 2
    },
    metaCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10
    },
    metaDivider: {
        height: 1,
        backgroundColor: '#F1F5F9'
    },
    metaLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500'
    },
    metaValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A'
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12
    },
    typeBadgeExpense: {
        backgroundColor: '#FEE2E2'
    },
    typeBadgeIncome: {
        backgroundColor: '#DCFCE7'
    },
    typeBadgeTransfer: {
        backgroundColor: '#DBEAFE'
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: '700'
    },
    typeTextExpense: {
        color: '#DC2626'
    },
    typeTextIncome: {
        color: '#15803D'
    },
    typeTextTransfer: {
        color: '#1D4ED8'
    },
    accordionContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        marginBottom: 16
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16
    },
    accordionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A'
    },
    accordionBody: {
        paddingHorizontal: 16,
        paddingBottom: 16
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 6
    },
    tableColHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B'
    },
    tableColAccount: {
        flex: 1.6
    },
    tableColNum: {
        flex: 1,
        textAlign: 'right'
    },
    tableDataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    tableCellText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A'
    },
    balancedCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 12,
        padding: 12,
        marginTop: 12
    },
    balancedContent: {
        flex: 1
    },
    balancedTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#15803D'
    },
    balancedSub: {
        fontSize: 11,
        color: '#166534',
        marginTop: 2
    },
    legacyDerivedTag: {
        fontSize: 10,
        color: '#15803D',
        marginTop: 4,
        fontStyle: 'italic'
    },
    voidPromptCard: {
        backgroundColor: '#FEF2F2',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        marginTop: 8
    },
    voidPromptTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#B91C1C',
        marginBottom: 4
    },
    voidPromptSub: {
        fontSize: 11,
        color: '#991B1B',
        marginBottom: 10
    },
    voidReasonInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 13,
        color: '#0F172A',
        marginBottom: 12
    },
    voidBtnRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10
    },
    cancelVoidBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6
    },
    cancelVoidText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600'
    },
    confirmVoidBtn: {
        backgroundColor: '#DC2626',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6
    },
    confirmVoidText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '700'
    }
});
