/**
 * components/cashbook/DailyClosingView.js
 * 
 * Daily Closing & Physical Cash Denomination Register for FinLife Cashbook.
 * Features:
 * - Date selection and closing status (OPEN, CLOSED, LOCKED).
 * - Day's opening balance, receipts, payments, and calculated cash.
 * - Interactive Denomination Counter (₹500 down to coins).
 * - Real-time shortage / excess detection.
 * - One-tap immutable Day Lock generating an audit log event.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput
} from 'react-native';
import {
    Lock,
    Unlock,
    Calculator,
    AlertCircle,
    CheckCircle2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Coins,
    ShieldAlert
} from 'lucide-react-native';
import {
    STANDARD_DENOMINATIONS,
    DailyClosingStatus,
    formatMoneyPaise,
    createMoneyPaise,
    createDailyClosingRecord,
    rupeesToMoneyPaise
} from '../../services/cashbook/cashbookContracts.js';
import {
    calculateDenominationTotal,
    computeDailyClosingDifference
} from '../../services/cashbook/cashbookEngine.js';

export default function DailyClosingView({
    bookId,
    bookName = 'Cash Register',
    todayDate = new Date().toISOString().split('T')[0],
    existingClosing = null,
    dayOpeningBalance = '0',
    dayMoneyIn = '0',
    dayMoneyOut = '0',
    onSaveClosing,
    onLockClosing
}) {
    const [selectedDate, setSelectedDate] = useState(todayDate);
    const [denominations, setDenominations] = useState(
        existingClosing?.denominations || {
            d500: 0,
            d200: 0,
            d100: 0,
            d50: 0,
            d20: 0,
            d10: 0,
            d5: 0,
            d2: 0,
            d1: 0,
            coins: 0
        }
    );

    const isLocked = existingClosing?.status === DailyClosingStatus.LOCKED;

    // Calculate calculated cash: opening + in - out
    const opBi = BigInt(dayOpeningBalance || '0');
    const inBi = BigInt(dayMoneyIn || '0');
    const outBi = BigInt(dayMoneyOut || '0');
    const calculatedClosingBi = opBi + inBi - outBi;
    const calculatedClosingMoney = createMoneyPaise(calculatedClosingBi >= 0n ? calculatedClosingBi : 0n);

    // Counted cash from denomination inputs
    const countedResult = calculateDenominationTotal(denominations);

    // Difference
    const diffResult = computeDailyClosingDifference({
        calculatedClosingPaise: calculatedClosingMoney,
        countedClosingPaise: countedResult.bigIntPaise
    });

    const updateDenomCount = (key, delta) => {
        if (isLocked) return;
        const current = denominations[key] || 0;
        const next = Math.max(0, current + delta);
        setDenominations({ ...denominations, [key]: next });
    };

    const setDenomDirect = (key, text) => {
        if (isLocked) return;
        const count = parseInt(text, 10) || 0;
        setDenominations({ ...denominations, [key]: Math.max(0, count) });
    };

    const handleLockDay = async () => {
        if (isLocked) return;
        const record = createDailyClosingRecord({
            id: existingClosing?.id || `closing_${bookId}_${selectedDate}`,
            bookId,
            date: selectedDate,
            openingBalance: createMoneyPaise(opBi),
            totalMoneyIn: createMoneyPaise(inBi),
            totalMoneyOut: createMoneyPaise(outBi),
            calculatedClosing: calculatedClosingMoney,
            denominations,
            countedClosing: createMoneyPaise(countedResult.bigIntPaise),
            difference: createMoneyPaise(diffResult.differenceBigIntPaise >= 0n ? diffResult.differenceBigIntPaise : -diffResult.differenceBigIntPaise),
            status: DailyClosingStatus.LOCKED
        });

        if (onSaveClosing) {
            await onSaveClosing(record);
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Date & Status Ribbon */}
            <View style={styles.dateRibbon}>
                <View style={styles.dateLabelRow}>
                    <Calendar size={15} color="#38BDF8" />
                    <Text style={styles.dateLabel}>{selectedDate}</Text>
                </View>

                <View style={[
                    styles.statusBadge,
                    isLocked ? styles.statusBadgeLocked : styles.statusBadgeOpen
                ]}>
                    {isLocked ? <Lock size={12} color="#10B981" /> : <Unlock size={12} color="#F59E0B" />}
                    <Text style={[
                        styles.statusText,
                        isLocked ? styles.statusTextLocked : styles.statusTextOpen
                    ]}>
                        {isLocked ? 'LOCKED' : 'OPEN'}
                    </Text>
                </View>
            </View>

            {isLocked && (
                <View style={styles.lockedBanner}>
                    <ShieldAlert size={16} color="#10B981" />
                    <Text style={styles.lockedBannerText}>
                        This register date is closed and locked as an immutable audit checkpoint.
                    </Text>
                </View>
            )}

            {/* Calculated Cash Summary Cards */}
            <View style={styles.summaryCard}>
                <Text style={styles.cardHeader}>CALCULATED CASH REGISTER</Text>

                <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Opening Cash</Text>
                        <Text style={styles.summaryValue}>{formatMoneyPaise(createMoneyPaise(opBi))}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Cash In (+)</Text>
                        <Text style={[styles.summaryValue, styles.textEmerald]}>{formatMoneyPaise(createMoneyPaise(inBi))}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Cash Out (-)</Text>
                        <Text style={[styles.summaryValue, styles.textRose]}>{formatMoneyPaise(createMoneyPaise(outBi))}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Expected Closing</Text>
                        <Text style={[styles.summaryValue, styles.textCyan]}>{formatMoneyPaise(calculatedClosingMoney)}</Text>
                    </View>
                </View>
            </View>

            {/* Physical Cash Denomination Counter */}
            <View style={styles.denomSection}>
                <View style={styles.denomHeaderRow}>
                    <View style={styles.denomTitleWrap}>
                        <Coins size={16} color="#38BDF8" />
                        <Text style={styles.denomTitle}>PHYSICAL DENOMINATION COUNTER</Text>
                    </View>
                    <Text style={styles.totalNotesCount}>
                        {countedResult.totalCount} Units
                    </Text>
                </View>

                {STANDARD_DENOMINATIONS.map((denom) => {
                    const count = denominations[denom.key] || 0;
                    const subtotal = BigInt(denom.valuePaise) * BigInt(count);

                    return (
                        <View key={denom.key} style={styles.denomRow}>
                            <View style={styles.denomLabelWrap}>
                                <Text style={styles.denomNoteLabel}>{denom.label}</Text>
                            </View>

                            <View style={styles.stepperWrap}>
                                <TouchableOpacity
                                    style={[styles.stepperBtn, isLocked && styles.stepperBtnDisabled]}
                                    onPress={() => updateDenomCount(denom.key, -1)}
                                    disabled={isLocked}
                                >
                                    <Text style={styles.stepperBtnText}>-</Text>
                                </TouchableOpacity>

                                <TextInput
                                    style={styles.denomInput}
                                    keyboardType="number-pad"
                                    value={count.toString()}
                                    onChangeText={(t) => setDenomDirect(denom.key, t)}
                                    editable={!isLocked}
                                />

                                <TouchableOpacity
                                    style={[styles.stepperBtn, isLocked && styles.stepperBtnDisabled]}
                                    onPress={() => updateDenomCount(denom.key, 1)}
                                    disabled={isLocked}
                                >
                                    <Text style={styles.stepperBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.denomSubtotalWrap}>
                                <Text style={styles.denomSubtotalText}>
                                    {formatMoneyPaise(createMoneyPaise(subtotal))}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* Counted vs Calculated Comparison */}
            <View style={styles.comparisonCard}>
                <View style={styles.comparisonRow}>
                    <Text style={styles.compLabel}>Physical Counted Cash:</Text>
                    <Text style={styles.compValue}>{countedResult.formatted}</Text>
                </View>
                <View style={styles.comparisonRow}>
                    <Text style={styles.compLabel}>Calculated System Cash:</Text>
                    <Text style={styles.compValue}>{formatMoneyPaise(calculatedClosingMoney)}</Text>
                </View>

                <View style={[
                    styles.diffBadge,
                    diffResult.isBalanced && styles.diffBadgeBalanced,
                    diffResult.isExcess && styles.diffBadgeExcess,
                    diffResult.isShortage && styles.diffBadgeShortage
                ]}>
                    {diffResult.isBalanced ? (
                        <CheckCircle2 size={16} color="#10B981" />
                    ) : (
                        <AlertCircle size={16} color={diffResult.isExcess ? '#38BDF8' : '#F43F5E'} />
                    )}
                    <Text style={[
                        styles.diffText,
                        diffResult.isBalanced && styles.diffTextBalanced,
                        diffResult.isExcess && styles.diffTextExcess,
                        diffResult.isShortage && styles.diffTextShortage
                    ]}>
                        {diffResult.isBalanced
                            ? 'Balanced (₹0 Difference)'
                            : (diffResult.isExcess ? `Excess Cash: ${diffResult.formatted}` : `Shortage: ${diffResult.formatted}`)}
                    </Text>
                </View>
            </View>

            {/* Lock Action Button */}
            {!isLocked && (
                <TouchableOpacity
                    style={styles.lockDayButton}
                    onPress={handleLockDay}
                    activeOpacity={0.8}
                >
                    <Lock size={16} color="#0F172A" />
                    <Text style={styles.lockDayButtonText}>Close & Lock Day</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 40
    },
    dateRibbon: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12
    },
    dateLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    dateLabel: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700'
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    statusBadgeLocked: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)'
    },
    statusBadgeOpen: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)'
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800'
    },
    statusTextLocked: {
        color: '#10B981'
    },
    statusTextOpen: {
        color: '#F59E0B'
    },
    lockedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12
    },
    lockedBannerText: {
        color: '#A7F3D0',
        fontSize: 12,
        flex: 1,
        fontWeight: '500'
    },
    summaryCard: {
        backgroundColor: '#1E293B',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 14
    },
    cardHeader: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
        marginBottom: 10
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    summaryItem: {
        width: '47%',
        backgroundColor: '#0F172A',
        borderRadius: 10,
        padding: 10
    },
    summaryLabel: {
        color: '#94A3B8',
        fontSize: 11
    },
    summaryValue: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700',
        marginTop: 2
    },
    textEmerald: {
        color: '#10B981'
    },
    textRose: {
        color: '#F43F5E'
    },
    textCyan: {
        color: '#38BDF8'
    },
    denomSection: {
        backgroundColor: '#1E293B',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 14
    },
    denomHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        paddingBottom: 8
    },
    denomTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    denomTitle: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6
    },
    totalNotesCount: {
        color: '#38BDF8',
        fontSize: 12,
        fontWeight: '600'
    },
    denomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#0F172A'
    },
    denomLabelWrap: {
        width: 50
    },
    denomNoteLabel: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '700'
    },
    stepperWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155'
    },
    stepperBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center'
    },
    stepperBtnDisabled: {
        opacity: 0.3
    },
    stepperBtnText: {
        color: '#38BDF8',
        fontSize: 16,
        fontWeight: '700'
    },
    denomInput: {
        width: 44,
        textAlign: 'center',
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600'
    },
    denomSubtotalWrap: {
        width: 80,
        alignItems: 'flex-end'
    },
    denomSubtotalText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600'
    },
    comparisonCard: {
        backgroundColor: '#1E293B',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16
    },
    comparisonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4
    },
    compLabel: {
        color: '#94A3B8',
        fontSize: 13
    },
    compValue: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700'
    },
    diffBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 10
    },
    diffBadgeBalanced: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)'
    },
    diffBadgeExcess: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)'
    },
    diffBadgeShortage: {
        backgroundColor: 'rgba(244, 63, 94, 0.15)'
    },
    diffText: {
        fontSize: 13,
        fontWeight: '700'
    },
    diffTextBalanced: {
        color: '#10B981'
    },
    diffTextExcess: {
        color: '#38BDF8'
    },
    diffTextShortage: {
        color: '#F43F5E'
    },
    lockDayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#38BDF8',
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 30
    },
    lockDayButtonText: {
        color: '#0F172A',
        fontSize: 15,
        fontWeight: '800'
    }
});
