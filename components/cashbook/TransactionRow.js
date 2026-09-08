/**
 * components/cashbook/TransactionRow.js
 * 
 * Individual transaction row item with status badge, account indicator,
 * formatted currency amount, and void state presentation.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Bookmark,
    Sliders,
    Ban
} from 'lucide-react-native';
import { TransactionType } from '../../services/cashbook/cashbookContracts.js';

export default function TransactionRow({ item, onPress }) {
    const {
        description,
        category,
        accountDisplay,
        formattedAmount,
        amountColor,
        isVoided,
        rawTxn
    } = item;

    const renderIcon = () => {
        if (isVoided) {
            return <Ban size={16} color="#94A3B8" />;
        }
        switch (rawTxn.transactionType) {
            case TransactionType.INCOME:
                return <ArrowDownLeft size={16} color="#10B981" />;
            case TransactionType.EXPENSE:
                return <ArrowUpRight size={16} color="#EF4444" />;
            case TransactionType.TRANSFER:
                return <ArrowLeftRight size={16} color="#3B82F6" />;
            case TransactionType.OPENING_BALANCE:
                return <Bookmark size={16} color="#8B5CF6" />;
            case TransactionType.ADJUSTMENT:
                return <Sliders size={16} color="#F59E0B" />;
            default:
                return <ArrowUpRight size={16} color="#94A3B8" />;
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, isVoided && styles.containerVoided]}
            onPress={() => onPress && onPress(item)}
            activeOpacity={0.7}
        >
            {/* Icon Bubble */}
            <View style={[
                styles.iconBubble,
                isVoided && styles.iconBubbleVoided
            ]}>
                {renderIcon()}
            </View>

            {/* Middle Section: Title, Category, Account */}
            <View style={styles.contentWrap}>
                <View style={styles.topRow}>
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

                <View style={styles.subRow}>
                    {category ? (
                        <View style={styles.categoryChip}>
                            <Text style={styles.categoryText}>{category}</Text>
                        </View>
                    ) : null}
                    <Text style={styles.accountText} numberOfLines={1}>
                        {accountDisplay}
                    </Text>
                </View>
            </View>

            {/* Right Amount */}
            <View style={styles.amountWrap}>
                <Text
                    style={[
                        styles.amount,
                        { color: amountColor },
                        isVoided && styles.amountVoided
                    ]}
                >
                    {formattedAmount}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginHorizontal: 16,
        marginBottom: 6,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#334155'
    },
    containerVoided: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderColor: 'rgba(51, 65, 85, 0.5)'
    },
    iconBubble: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    iconBubbleVoided: {
        backgroundColor: '#1E293B',
        borderColor: '#475569'
    },
    contentWrap: {
        flex: 1,
        marginRight: 10
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F8FAFC',
        flexShrink: 1
    },
    titleVoided: {
        color: '#94A3B8',
        textDecorationLine: 'line-through'
    },
    voidBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    voidBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#EF4444'
    },
    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6
    },
    categoryChip: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'capitalize'
    },
    accountText: {
        fontSize: 11,
        color: '#64748B',
        flexShrink: 1
    },
    amountWrap: {
        alignItems: 'flex-end'
    },
    amount: {
        fontSize: 15,
        fontWeight: '700'
    },
    amountVoided: {
        textDecorationLine: 'line-through'
    }
});
