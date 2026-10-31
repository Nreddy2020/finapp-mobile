import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, Shield, Info } from 'lucide-react-native';

/**
 * MemberObligationCard
 * 
 * Displays monthly financial allocation for each household member.
 * Enforces Option A contract:
 * - Lead payer receives 100% of the linked commitment obligation.
 * - Backup payer receives 0% financial allocation (informational designation).
 */
export default function MemberObligationCard({
    member,
    totalMonthlyRupees
}) {
    if (!member) return null;

    const monthlyRupees = member.monthlyAmountRupees ?? member.monthlyObligationRupees ?? 0;
    const percentage = member.percentage ?? (totalMonthlyRupees > 0 ? Math.round((monthlyRupees / totalMonthlyRupees) * 100) : 0);
    const leadCount = member.asLeadCount ?? member.linkedCount ?? 0;
    const backupCount = member.asBackupCount ?? 0;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <View style={styles.personGroup}>
                    <View style={styles.avatarBox}>
                        <User size={14} color="#38BDF8" />
                    </View>
                    <View>
                        <Text style={styles.personName}>{member.name || member.personName || 'Household Member'}</Text>
                        <Text style={styles.personRole}>{member.role || 'MEMBER'}</Text>
                    </View>
                </View>

                <View style={styles.amountGroup}>
                    <Text style={styles.amountText}>₹{formatCurrency(monthlyRupees)}</Text>
                    <Text style={styles.percentageText}>{percentage}% of total</Text>
                </View>
            </View>

            {/* Progress bar representing member obligation percentage */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%` }]} />
            </View>

            {/* Allocation role pills */}
            <View style={styles.metaRow}>
                {leadCount > 0 ? (
                    <View style={styles.leadPill}>
                        <Shield size={10} color="#38BDF8" />
                        <Text style={styles.leadPillText}>Lead Payer: {leadCount} {leadCount === 1 ? 'bill' : 'bills'} (100%)</Text>
                    </View>
                ) : (
                    <View style={styles.zeroPill}>
                        <Text style={styles.zeroPillText}>No Lead Commitments</Text>
                    </View>
                )}

                {backupCount > 0 && (
                    <View style={styles.backupPill}>
                        <Info size={10} color="#A1A1AA" />
                        <Text style={styles.backupPillText}>{backupCount} as Backup (0%)</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#18181B',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    personGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    avatarBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    personName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    personRole: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 1
    },
    amountGroup: {
        alignItems: 'flex-end'
    },
    amountText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    percentageText: {
        fontSize: 11,
        color: '#71717A',
        marginTop: 1
    },
    progressTrack: {
        height: 4,
        backgroundColor: '#27272A',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 10
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#38BDF8',
        borderRadius: 2
    },
    metaRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center'
    },
    leadPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)'
    },
    leadPillText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#38BDF8'
    },
    zeroPill: {
        backgroundColor: '#27272A',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    zeroPillText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#71717A'
    },
    backupPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(161, 161, 170, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(161, 161, 170, 0.2)'
    },
    backupPillText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#A1A1AA'
    }
});
