import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { 
    ChevronRight, 
    Calendar, 
    User, 
    DollarSign, 
    FileText, 
    CheckSquare, 
    Shield, 
    AlertCircle, 
    Zap, 
    Clock, 
    Eye 
} from 'lucide-react-native';

/**
 * ActionHorizonItemCard
 * 
 * Renders an individual projected action/renewal item.
 * Includes urgency badge, domain badge, due date, owner badge, and deep-link navigation.
 */
export default function ActionHorizonItemCard({ item }) {
    const router = useRouter();

    if (!item) return null;

    const {
        title,
        subtitle,
        domain,
        dueDate,
        daysRemaining,
        status,
        assignedPersonName = 'Unassigned',
        ownershipRole = 'HOUSEHOLD',
        amount = null,
        currency = null,
        targetRoute,
        priority
    } = item;

    // Urgency styling
    let tierColor = '#8B5CF6';
    let tierLabel = 'Ahead';
    let TierIcon = Eye;

    if (status === 'OVERDUE') {
        tierColor = '#EF4444';
        tierLabel = `${Math.abs(daysRemaining)}d OVERDUE`;
        TierIcon = AlertCircle;
    } else if (status === 'IMMEDIATE') {
        tierColor = '#F59E0B';
        tierLabel = daysRemaining === 0 ? 'DUE TODAY' : `DUE IN ${daysRemaining}d`;
        TierIcon = Zap;
    } else if (status === 'UPCOMING') {
        tierColor = '#3B82F6';
        tierLabel = `In ${daysRemaining} days`;
        TierIcon = Clock;
    } else {
        tierColor = '#8B5CF6';
        tierLabel = `In ${daysRemaining} days`;
        TierIcon = Eye;
    }

    // Domain styling
    let DomainIcon = FileText;
    let domainColor = '#38BDF8';
    if (domain === 'FINANCIAL') {
        DomainIcon = DollarSign;
        domainColor = '#10B981';
    } else if (domain === 'OPERATION') {
        DomainIcon = CheckSquare;
        domainColor = '#F59E0B';
    } else if (domain === 'PROTECTION') {
        DomainIcon = Shield;
        domainColor = '#A855F7';
    }

    return (
        <View style={styles.card}>
            {/* Top Row: Domain Tag + Urgency Badge */}
            <View style={styles.topRow}>
                <View style={[styles.domainBadge, { borderColor: domainColor }]}>
                    <DomainIcon size={12} color={domainColor} />
                    <Text style={[styles.domainLabel, { color: domainColor }]}>{domain}</Text>
                </View>
                <View style={[styles.urgencyBadge, { backgroundColor: `${tierColor}20`, borderColor: tierColor }]}>
                    <TierIcon size={12} color={tierColor} />
                    <Text style={[styles.urgencyLabel, { color: tierColor }]}>{tierLabel}</Text>
                </View>
            </View>

            {/* Title and Subtitle */}
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}

            {/* Details Row: Due Date + Financial Amount (if present) */}
            <View style={styles.detailsRow}>
                <View style={styles.dateCol}>
                    <Calendar size={13} color="#A1A1AA" />
                    <Text style={styles.dateText}>Due: {dueDate}</Text>
                </View>
                {amount !== null && (
                    <View style={styles.amountCol}>
                        <Text style={styles.amountText}>
                            {currency} {Number(amount).toLocaleString()}
                        </Text>
                    </View>
                )}
            </View>

            {/* Footer: Owner info + Deep Link Handoff */}
            <View style={styles.footerRow}>
                <View style={styles.ownerBadge}>
                    <User size={12} color="#D4D4D8" />
                    <Text style={styles.ownerText}>
                        {assignedPersonName} <Text style={styles.roleSub}>({ownershipRole})</Text>
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.deepLinkBtn}
                    onPress={() => router.push(targetRoute)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${title} in ${domain}`}
                >
                    <Text style={styles.deepLinkText}>Open</Text>
                    <ChevronRight size={14} color="#38BDF8" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#18181B',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 10
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    domainBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 6,
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderWidth: 1,
        backgroundColor: 'rgba(24, 24, 27, 0.6)'
    },
    domainLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    urgencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 6,
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderWidth: 1
    },
    urgencyLabel: {
        fontSize: 10,
        fontWeight: '700'
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 2
    },
    subtitle: {
        fontSize: 12,
        color: '#A1A1AA',
        marginBottom: 10
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        marginBottom: 8
    },
    dateCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    dateText: {
        fontSize: 12,
        color: '#D4D4D8'
    },
    amountCol: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderRadius: 6,
        paddingVertical: 2,
        paddingHorizontal: 6
    },
    amountText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981'
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4
    },
    ownerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1
    },
    ownerText: {
        fontSize: 11,
        color: '#E4E4E7',
        fontWeight: '600'
    },
    roleSub: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '400'
    },
    deepLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)'
    },
    deepLinkText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#38BDF8'
    }
});
