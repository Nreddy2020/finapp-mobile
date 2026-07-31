import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChitFundCard({ chitFund }) {
    const paidCount = chitFund.members.filter(m => m.paid).length;
    const pendingCount = chitFund.members_count - paidCount;
    const collectionProgress = (paidCount / chitFund.members_count) * 100;

    return (
        <View style={styles.card}>
            <LinearGradient
                colors={['#8B5CF620', '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Users size={24} color="#8B5CF6" strokeWidth={2.5} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.groupName}>{chitFund.name}</Text>
                    <Text style={styles.memberCount}>{chitFund.members_count} members</Text>
                </View>
            </View>

            <View style={styles.poolSection}>
                <Text style={styles.poolLabel}>This Month's Pool</Text>
                <Text style={styles.poolAmount}>₹{chitFund.total_pool.toLocaleString('en-IN')}</Text>
                <Text style={styles.contribution}>
                    ₹{chitFund.monthly_contribution}/member
                </Text>
            </View>

            <View style={styles.recipientSection}>
                <View style={styles.recipientRow}>
                    <Text style={styles.recipientLabel}>Recipient this month:</Text>
                    <Text style={styles.recipientName}>{chitFund.recipient_this_month}</Text>
                </View>
                <View style={styles.recipientRow}>
                    <Text style={styles.recipientLabel}>Next month:</Text>
                    <Text style={styles.nextRecipient}>{chitFund.next_recipient}</Text>
                </View>
            </View>

            <View style={styles.collectionSection}>
                <View style={styles.collectionHeader}>
                    <Text style={styles.collectionTitle}>Collection Status</Text>
                    <Text style={styles.collectionCount}>
                        {paidCount}/{chitFund.members_count} paid
                    </Text>
                </View>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${collectionProgress}%` }
                        ]}
                    />
                </View>
                <View style={styles.statusRow}>
                    <View style={styles.statusItem}>
                        <CheckCircle size={16} color="#10B981" />
                        <Text style={styles.statusText}>{paidCount} Paid</Text>
                    </View>
                    <View style={styles.statusItem}>
                        <Clock size={16} color="#F59E0B" />
                        <Text style={styles.statusText}>{pendingCount} Pending</Text>
                    </View>
                </View>
            </View>

            <View style={styles.statsSection}>
                <View style={styles.statItem}>
                    <TrendingUp size={16} color="#8B5CF6" />
                    <Text style={styles.statLabel}>Monthly</Text>
                    <Text style={styles.statValue}>₹{chitFund.monthly_contribution}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Users size={16} color="#8B5CF6" />
                    <Text style={styles.statLabel}>Members</Text>
                    <Text style={styles.statValue}>{chitFund.members_count}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'relative',
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#8B5CF620',
        overflow: 'hidden',
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#8B5CF620',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    memberCount: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
    },
    poolSection: {
        backgroundColor: '#8B5CF615',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
    },
    poolLabel: {
        fontSize: 11,
        color: '#A1A1AA',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    poolAmount: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    contribution: {
        fontSize: 13,
        color: '#8B5CF6',
        fontWeight: '700',
    },
    recipientSection: {
        backgroundColor: '#FFFFFF05',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    recipientRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    recipientLabel: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
    },
    recipientName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#10B981',
    },
    nextRecipient: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    collectionSection: {
        marginBottom: 12,
    },
    collectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    collectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    collectionCount: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#FFFFFF10',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#8B5CF6',
        borderRadius: 4,
    },
    statusRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#A1A1AA',
    },
    statsSection: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF05',
        borderRadius: 12,
        padding: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    divider: {
        width: 1,
        backgroundColor: '#FFFFFF10',
        marginHorizontal: 12,
    },
    statLabel: {
        fontSize: 11,
        color: '#71717A',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
});
