/**
 * components/cashbook/TransactionRow.js
 * 
 * FinLife Universal Cashbook — Transaction Ledger Row (Screen 3).
 * 
 * Visual Layout:
 * - Left: Category / Type Icon in distinct colored circle
 * - Middle: Title (e.g. "Rent") + Subtitle ("Expense • Bank - HDFC")
 * - Right: Amount ("- ₹ 20,000" in red, "+ ₹ 80,000" in green, "₹ 10,000" in charcoal)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Layers,
    Home,
    ShoppingCart,
    Shield,
    Car,
    Fuel,
    Wallet,
    Sliders,
    Bookmark,
    Ban
} from 'lucide-react-native';
import { TransactionType } from '../../services/cashbook/cashbookContracts.js';
import { getTransactionIconMeta } from '../../services/cashbook/cashbookPresentation.js';

export { getTransactionIconMeta };

function resolveTransactionIconComp(iconKey) {
    switch (iconKey) {
        case 'Ban': return Ban;
        case 'Income': return ArrowDownLeft;
        case 'Transfer': return ArrowLeftRight;
        case 'Rent': return Home;
        case 'Groceries': return ShoppingCart;
        case 'Health': return Shield;
        case 'Fuel': return Car;
        case 'Expense':
        default:
            return ArrowUpRight;
    }
}

export default function TransactionRow({ item, onPress }) {
    const {
        description,
        accountDisplay,
        formattedAmount,
        amountColor,
        isVoided,
        rawTxn
    } = item;

    const iconMeta = getTransactionIconMeta(item);
    const IconComp = resolveTransactionIconComp(iconMeta.iconKey);

    // Build subtitle format: "Type • Account"
    let typeLabel = 'Expense';
    let isTransfer = false;
    let isIncome = false;

    if (rawTxn?.transactionType === TransactionType.INCOME) {
        typeLabel = 'Income';
        isIncome = true;
    } else if (rawTxn?.transactionType === TransactionType.TRANSFER) {
        typeLabel = 'Transfer';
        isTransfer = true;
    } else if (rawTxn?.transactionType === TransactionType.OPENING_BALANCE) {
        typeLabel = 'Opening';
    } else if (rawTxn?.transactionType === TransactionType.ADJUSTMENT) {
        typeLabel = 'Adjustment';
    }

    const subtitle = `${typeLabel} • ${accountDisplay || 'Primary'}`;

    return (
        <TouchableOpacity
            style={[styles.container, isVoided && styles.containerVoided]}
            onPress={() => onPress && onPress(item)}
            activeOpacity={0.7}
        >
            {/* Left Circle Icon */}
            <View style={[styles.iconCircle, { backgroundColor: iconMeta.bg }]}>
                <IconComp size={18} color={iconMeta.color} />
            </View>

            {/* Middle Section: Title & Subtitle */}
            <View style={styles.contentWrap}>
                <View style={styles.titleRow}>
                    <Text
                        style={[styles.title, isVoided && styles.titleVoided]}
                        numberOfLines={1}
                    >
                        {description}
                    </Text>
                    {isVoided && (
                        <View style={styles.voidBadge}>
                            <Text style={styles.voidBadgeText}>VOIDED</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                </Text>
            </View>

            {/* Right Amount */}
            <View style={styles.amountWrap}>
                <Text
                    style={[
                        styles.amount,
                        isIncome && styles.amountIncome,
                        !isIncome && !isTransfer && styles.amountExpense,
                        isTransfer && styles.amountTransfer,
                        isVoided && styles.amountVoided
                    ]}
                >
                    {isTransfer ? formattedAmount.replace('+', '').replace('-', '') : formattedAmount}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    containerVoided: {
        opacity: 0.6
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14
    },
    contentWrap: {
        flex: 1,
        marginRight: 12
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        flexShrink: 1
    },
    titleVoided: {
        color: '#94A3B8',
        textDecorationLine: 'line-through'
    },
    voidBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4
    },
    voidBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#EF4444'
    },
    subtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 3
    },
    amountWrap: {
        alignItems: 'flex-end',
        justifyContent: 'center'
    },
    amount: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.3
    },
    amountIncome: {
        color: '#10B981'
    },
    amountExpense: {
        color: '#EF4444'
    },
    amountTransfer: {
        color: '#0F172A'
    },
    amountVoided: {
        color: '#94A3B8',
        textDecorationLine: 'line-through'
    }
});
