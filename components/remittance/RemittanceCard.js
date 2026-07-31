import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Send, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function RemittanceCard({ remittance }) {
    const getStatusColor = () => {
        if (remittance.status === 'received') return '#10B981';
        if (remittance.status === 'pending') return '#F59E0B';
        return '#EF4444';
    };

    const getStatusIcon = () => {
        if (remittance.status === 'received') return CheckCircle;
        if (remittance.status === 'pending') return Clock;
        return AlertCircle;
    };

    const color = getStatusColor();
    const StatusIcon = getStatusIcon();

    return (
        <View style={[styles.card, { borderColor: `${color}30` }]}>
            <LinearGradient
                colors={[`${color}15`, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    <Send size={24} color={color} strokeWidth={2.5} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.purpose}>{remittance.purpose}</Text>
                    <Text style={styles.date}>
                        Sent: {new Date(remittance.sent_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
                    <StatusIcon size={16} color={color} strokeWidth={2.5} />
                    <Text style={[styles.statusText, { color }]}>
                        {remittance.status === 'received' ? 'Received' :
                            remittance.status === 'pending' ? 'Pending' : 'Failed'}
                    </Text>
                </View>
            </View>

            <View style={styles.amountSection}>
                <Text style={styles.amountLabel}>Amount Sent</Text>
                <Text style={styles.amount}>₹{remittance.amount.toLocaleString('en-IN')}</Text>
            </View>

            {remittance.status === 'received' && remittance.family_spent !== undefined && (
                <View style={styles.spendingSection}>
                    <View style={styles.spendingRow}>
                        <Text style={styles.spendingLabel}>Family Spent</Text>
                        <Text style={styles.spendingValue}>
                            ₹{remittance.family_spent.toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <View style={styles.spendingRow}>
                        <Text style={styles.spendingLabel}>Remaining</Text>
                        <Text style={[styles.spendingValue, { color: '#10B981' }]}>
                            ₹{remittance.remaining.toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${(remittance.family_spent / remittance.amount) * 100}%` }
                            ]}
                        />
                    </View>
                </View>
            )}

            {remittance.receiver && (
                <View style={styles.footer}>
                    <Text style={styles.footerText}>To: {remittance.receiver}</Text>
                </View>
            )}
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
        borderWidth: 2,
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
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    purpose: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    date: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    amountSection: {
        backgroundColor: '#FFFFFF05',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    amountLabel: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    amount: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    spendingSection: {
        backgroundColor: '#FFFFFF05',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    spendingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    spendingLabel: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
    },
    spendingValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    progressBar: {
        height: 6,
        backgroundColor: '#FFFFFF10',
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 4,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 3,
    },
    footer: {
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#FFFFFF08',
    },
    footerText: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '600',
    },
});
