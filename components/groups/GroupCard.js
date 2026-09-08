/**
 * components/groups/GroupCard.js
 * 
 * Card component for displaying a group in the Shared Costs dashboard.
 * Displays group name, category badge, member avatar stack, total turnover,
 * and user's net balance status with appropriate badge styling.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Users, Compass, Home, Coffee, Briefcase, Tag, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { toRupeesFormatted, paiseToRupees } from '../../services/shared-costs/groupContracts.js';

export default function GroupCard({ group, onPress, currentUserId = 'You' }) {
    if (!group) return null;

    const balanceSummary = group.balanceSummary;
    const userProj = balanceSummary && balanceSummary.projectionMap 
        ? balanceSummary.projectionMap[currentUserId] 
        : null;

    const netPaise = userProj ? userProj.netBalancePaise : 0n;
    const isOwed = netPaise > 0n;
    const owes = netPaise < 0n;
    const isSettled = netPaise === 0n;

    // Type Icon
    const getTypeIcon = (type) => {
        switch (type) {
            case 'TRIP': return <Compass size={18} color="#F43F5E" />;
            case 'HOME':
            case 'RENT': return <Home size={18} color="#3B82F6" />;
            case 'DINING': return <Coffee size={18} color="#F59E0B" />;
            case 'BUSINESS': return <Briefcase size={18} color="#10B981" />;
            default: return <Tag size={18} color="#94A3B8" />;
        }
    };

    const members = Array.isArray(group.members) ? group.members : [];

    return (
        <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={onPress}
        >
            <View style={styles.topRow}>
                <View style={styles.titleArea}>
                    <View style={styles.iconCircle}>
                        {getTypeIcon(group.type)}
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
                        <Text style={styles.groupMeta}>
                            {group.type} • {members.length} member{members.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                <ChevronRight size={18} color="#64748B" />
            </View>

            <View style={styles.divider} />

            <View style={styles.bottomRow}>
                <View style={styles.avatarsStack}>
                    {members.slice(0, 4).map((m, idx) => (
                        <View
                            key={m.id || idx}
                            style={[
                                styles.avatar,
                                { marginLeft: idx > 0 ? -10 : 0, zIndex: 10 - idx }
                            ]}
                        >
                            <Text style={styles.avatarText}>
                                {(m.displayNameSnapshot || m.name || 'M').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    ))}
                    {members.length > 4 && (
                        <View style={[styles.avatar, styles.moreAvatar, { marginLeft: -10, zIndex: 5 }]}>
                            <Text style={styles.moreAvatarText}>+{members.length - 4}</Text>
                        </View>
                    )}
                </View>

                {/* Net Balance Badge */}
                {isOwed && (
                    <View style={[styles.balanceBadge, styles.badgeOwed]}>
                        <Text style={styles.badgeLabel}>You are owed</Text>
                        <Text style={styles.badgeAmountPositive}>{toRupeesFormatted(netPaise)}</Text>
                    </View>
                )}

                {owes && (
                    <View style={[styles.balanceBadge, styles.badgeOwes]}>
                        <Text style={styles.badgeLabel}>You owe</Text>
                        <Text style={styles.badgeAmountNegative}>{toRupeesFormatted(-netPaise)}</Text>
                    </View>
                )}

                {isSettled && (
                    <View style={[styles.balanceBadge, styles.badgeSettled]}>
                        <CheckCircle2 size={12} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={styles.badgeAmountSettled}>All Settled</Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    cardPressed: {
        backgroundColor: '#27354A',
        borderColor: '#475569'
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    titleArea: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    textContainer: {
        flex: 1
    },
    groupName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    groupMeta: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2
    },
    divider: {
        height: 1,
        backgroundColor: '#334155',
        marginVertical: 12
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    avatarsStack: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#1E293B'
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700'
    },
    moreAvatar: {
        backgroundColor: '#475569'
    },
    moreAvatarText: {
        color: '#E2E8F0',
        fontSize: 10,
        fontWeight: '600'
    },
    balanceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        alignItems: 'flex-end'
    },
    badgeOwed: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderWidth: 1
    },
    badgeOwes: {
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        borderColor: 'rgba(244, 63, 94, 0.3)',
        borderWidth: 1
    },
    badgeSettled: {
        backgroundColor: 'rgba(100, 116, 139, 0.15)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center'
    },
    badgeLabel: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    badgeAmountPositive: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10B981',
        marginTop: 1
    },
    badgeAmountNegative: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F43F5E',
        marginTop: 1
    },
    badgeAmountSettled: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981'
    }
});
