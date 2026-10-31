import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, AlertCircle, Link2, Wallet } from 'lucide-react-native';

export default function HouseholdFinancialCard({
    summary,
    activeMonth = new Date().toLocaleDateString('en-IN', {month: 'long', year: 'numeric'})
}) {
    if (!summary) return null;

    const totalPaise = summary.totalMonthlyPaise || (summary.totalMonthlyCommitmentsRupees ? summary.totalMonthlyCommitmentsRupees * 100 : 0);
    const totalRupees = Math.round(totalPaise / 100);
    const incomplete = (summary.missingCommitmentCount || 0) > 0;
    const linkedCount = summary.linkedCommitmentCount || 0;
    const unlinkedCount = summary.unlinkedCommitmentCount || 0;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formattedAmount = formatCurrency(totalRupees);

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <View style={styles.titleContainer}>
                    <View style={styles.iconCircle}>
                        <Wallet size={18} color="#38BDF8" />
                    </View>
                    <View style={{flex: 1, minWidth: 0}}>
                        <Text style={styles.title}>Household Financial Overview</Text>
                        <Text style={styles.subtitle}>{activeMonth} Committed Obligations</Text>
                    </View>
                </View>

                <View style={styles.badge}>
                    <ShieldCheck size={12} color="#10B981" />
                    <Text style={styles.badgeText}>Monthly estimate</Text>
                </View>
            </View>

            <View style={styles.amountRow}>
                <Text style={styles.currencySymbol}>INR</Text>
                <Text style={styles.amountText}>{incomplete ? 'Unavailable' : formattedAmount}</Text>
                <Text style={styles.periodText}>/ month</Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <View style={styles.statIconGroup}>
                        <Link2 size={12} color="#38BDF8" />
                        <Text style={styles.statLabel}>LINKED</Text>
                    </View>
                    <Text style={styles.statValue}>
                        {linkedCount} {linkedCount === 1 ? 'Commitment' : 'Commitments'}
                    </Text>
                </View>

                {incomplete ? <View style={[styles.statBox, styles.statBoxUnlinked]}><Text style={styles.statLabel}>MISSING SOURCE</Text><Text style={[styles.statValue, {color: '#FCD34D'}]}>{summary.missingCommitmentCount} unavailable</Text></View> : unlinkedCount > 0 ? (
                    <View style={[styles.statBox, styles.statBoxUnlinked]}>
                        <View style={styles.statIconGroup}>
                            <AlertCircle size={12} color="#F59E0B" />
                            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>UNASSIGNED</Text>
                        </View>
                        <Text style={[styles.statValue, { color: '#FCD34D' }]}>
                            {unlinkedCount} available
                        </Text>
                    </View>
                ) : (
                    <View style={styles.statBox}>
                        <View style={styles.statIconGroup}>
                            <ShieldCheck size={12} color="#10B981" />
                            <Text style={styles.statLabel}>STATUS</Text>
                        </View>
                        <Text style={[styles.statValue, { color: '#34D399' }]}>All Linked</Text>
                    </View>
                )}
            </View>

            <View style={styles.footerNote}>
                <Text style={styles.footerText}>
                    {incomplete ? 'The monthly total is unavailable until missing linked expenses can be read.' : 'Planning estimate based on linked expenses.'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#27272A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    headerRow: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
        justifyContent: 'space-between',
        marginBottom: 16
    },
    titleContainer: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    subtitle: {
        fontSize: 12,
        color: '#A1A1AA',
        marginTop: 2
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)'
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#10B981',
        letterSpacing: 0.5
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginBottom: 20
    },
    currencySymbol: {
        fontSize: 20,
        fontWeight: '700',
        color: '#38BDF8',
        marginRight: 2
    },
    amountText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1
    },
    periodText: {
        fontSize: 14,
        color: '#71717A',
        fontWeight: '500',
        marginLeft: 4
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 14
    },
    statBox: {
        flex: 1,
        backgroundColor: '#27272A',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#3F3F46'
    },
    statBoxUnlinked: {
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderColor: 'rgba(245, 158, 11, 0.25)'
    },
    statIconGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 4
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#A1A1AA',
        letterSpacing: 0.5
    },
    statValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    footerNote: {
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingTop: 10
    },
    footerText: {
        fontSize: 10,
        color: '#71717A',
        textAlign: 'center'
    }
});
