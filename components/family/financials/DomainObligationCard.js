import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Layers, Tag } from 'lucide-react-native';

/**
 * DomainObligationCard
 * 
 * Groups and displays commitments allocated to a Responsibility Domain.
 * Also handles the General / Unassigned household domain bucket.
 */
export default function DomainObligationCard({
    domain,
    totalMonthlyRupees
}) {
    if (!domain) return null;

    const monthlyRupees = domain.monthlyAmountRupees ?? domain.monthlyTotalRupees ?? 0;
    const percentage = domain.percentage ?? (totalMonthlyRupees > 0 ? Math.round((monthlyRupees / totalMonthlyRupees) * 100) : 0);
    const count = domain.linkedCount ?? domain.commitmentCount ?? 0;
    const domainColor = domain.color || '#3B82F6';

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <View style={styles.domainGroup}>
                    <View style={[styles.colorBar, { backgroundColor: domainColor }]} />
                    <View>
                        <Text style={styles.domainName}>{domain.name || domain.domainTitle || 'General Domain'}</Text>
                        <Text style={styles.domainCategory}>
                            {domain.responsibilityId ? 'Responsibility Domain' : 'General Household (Unassigned)'}
                        </Text>
                    </View>
                </View>

                <View style={styles.amountGroup}>
                    <Text style={styles.amountText}>₹{formatCurrency(monthlyRupees)}</Text>
                    <Text style={styles.percentageText}>{percentage}%</Text>
                </View>
            </View>

            <View style={styles.bottomRow}>
                <View style={styles.countBadge}>
                    <Tag size={10} color="#71717A" />
                    <Text style={styles.countText}>{count} {count === 1 ? 'Commitment' : 'Commitments'}</Text>
                </View>

                <View style={styles.progressContainer}>
                    <View style={[styles.progressTrack, { width: 80 }]}>
                        <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: domainColor }]} />
                    </View>
                </View>
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
    domainGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    colorBar: {
        width: 4,
        height: 30,
        borderRadius: 2
    },
    domainName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    domainCategory: {
        fontSize: 10,
        color: '#71717A',
        marginTop: 1
    },
    amountGroup: {
        alignItems: 'flex-end'
    },
    amountText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    percentageText: {
        fontSize: 11,
        color: '#71717A',
        marginTop: 1
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingTop: 8
    },
    countBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    countText: {
        fontSize: 11,
        color: '#71717A'
    },
    progressContainer: {
        alignItems: 'center'
    },
    progressTrack: {
        height: 4,
        backgroundColor: '#27272A',
        borderRadius: 2,
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        borderRadius: 2
    }
});
