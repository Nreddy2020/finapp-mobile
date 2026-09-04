/**
 * components/commitments/CommitmentCard.js
 * 
 * Reusable luxury card component for commitments.
 * Supports both:
 * 1. Occurrence View: "Upcoming Liabilities" (due countdown, quick pay action)
 * 2. Commitment View: "Active Commitments" (frequency badge, normalized monthly, nature tag)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
    Repeat,
    Calendar,
    CheckCircle,
    AlertCircle,
    Clock,
    CreditCard,
    Home,
    Shield,
    TrendingUp,
    Tv,
    Zap,
    GraduationCap,
    HeartHandshake,
    Landmark,
    Wifi
} from 'lucide-react-native';

const ICON_MAP = {
    home: Home,
    building: Home,
    creditCard: CreditCard,
    shield: Shield,
    zap: Zap,
    wifi: Wifi,
    'trending-up': TrendingUp,
    trendingUp: TrendingUp,
    tv: Tv,
    netflix: Tv,
    spotify: Repeat,
    graduation: GraduationCap,
    landmark: Landmark,
    users: HeartHandshake,
    repeat: Repeat
};

export default function CommitmentCard({
    item,
    isOccurrence = false,
    onPress,
    onQuickPay
}) {
    if (!item) return null;

    const iconKey = (item.visualMeta?.icon || item.visual?.icon || item.visualMeta?.iconName || '').toLowerCase();
    const IconComponent = ICON_MAP[iconKey] || Repeat;
    const iconColor = item.visualMeta?.color || item.visual?.color || '#D946EF';

    if (isOccurrence) {
        const isOverdue = item.isOverdue;

        return (
            <TouchableOpacity
                style={[styles.card, isOverdue && styles.cardOverdue]}
                onPress={() => onPress && onPress(item)}
                activeOpacity={0.75}
            >
                <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
                    <IconComponent size={20} color={iconColor} />
                </View>

                <View style={styles.contentWrap}>
                    <View style={styles.topRow}>
                        <Text style={styles.name} numberOfLines={1}>
                            {item.commitmentName}
                        </Text>
                        <Text style={styles.amount}>
                            {item.amountFormatted}
                        </Text>
                    </View>

                    <View style={styles.bottomRow}>
                        <View style={styles.dateWrap}>
                            <Clock size={12} color={isOverdue ? '#EF4444' : '#94A3B8'} />
                            <Text style={[styles.dateText, isOverdue && styles.dateTextOverdue]}>
                                {item.scheduledDateFormatted} • {item.dueLabel}
                            </Text>
                        </View>

                        {onQuickPay && (
                            <TouchableOpacity
                                style={styles.quickPayButton}
                                onPress={() => onQuickPay(item)}
                                activeOpacity={0.7}
                            >
                                <CheckCircle size={12} color="#10B981" />
                                <Text style={styles.quickPayText}>Pay</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    // Active Commitment View
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress && onPress(item)}
            activeOpacity={0.75}
        >
            <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
                <IconComponent size={20} color={iconColor} />
            </View>

            <View style={styles.contentWrap}>
                <View style={styles.topRow}>
                    <View style={styles.titleWithBadge}>
                        <Text style={styles.name} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <View style={[
                            styles.natureBadge,
                            item.financialNature === 'DEBT' && styles.natureBadgeDebt,
                            item.financialNature === 'INVESTMENT' && styles.natureBadgeInvest
                        ]}>
                            <Text style={styles.natureBadgeText}>{item.financialNature}</Text>
                        </View>
                    </View>
                    <Text style={styles.amount}>
                        {item.amountFormatted}
                    </Text>
                </View>

                <View style={styles.bottomRow}>
                    <View style={styles.tagGroup}>
                        <View style={styles.freqBadge}>
                            <Text style={styles.freqBadgeText}>{item.frequencyLabel}</Text>
                        </View>
                        {item.normalizedMonthlyNote && (
                            <Text style={styles.normalizedNote}>
                                {item.normalizedMonthlyNote}
                            </Text>
                        )}
                    </View>

                    <Text style={styles.nextDateText}>
                        Next: {item.nextDueDate}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#161426',
        borderRadius: 16,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#242038'
    },
    cardOverdue: {
        borderColor: 'rgba(239, 68, 68, 0.4)',
        backgroundColor: '#1E1420'
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    contentWrap: {
        flex: 1
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    titleWithBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
        gap: 6
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F8FAFC',
        flexShrink: 1
    },
    natureBadge: {
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    natureBadgeDebt: {
        backgroundColor: 'rgba(139, 92, 246, 0.15)'
    },
    natureBadgeInvest: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)'
    },
    natureBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#CBD5E1',
        letterSpacing: 0.5
    },
    amount: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    dateWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    dateText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500'
    },
    dateTextOverdue: {
        color: '#EF4444',
        fontWeight: '600'
    },
    quickPayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    quickPayText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#10B981'
    },
    tagGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    freqBadge: {
        backgroundColor: '#242038',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    freqBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#A78BFA'
    },
    normalizedNote: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500'
    },
    nextDateText: {
        fontSize: 12,
        color: '#64748B'
    }
});
