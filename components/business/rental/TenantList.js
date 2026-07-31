import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react-native';

export default function TenantList({ tenants }) {
    return (
        <View style={styles.section}>
            {tenants.map((tenant) => (
                <View key={tenant.id} style={styles.tenantCard}>
                    <View style={styles.tenantInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{tenant.name.charAt(0)}</Text>
                        </View>
                        <View>
                            <Text style={styles.tenantName}>{tenant.name}</Text>
                            <Text style={styles.unitText}>Unit {tenant.unit} • Due {tenant.due}</Text>
                        </View>
                    </View>

                    <View style={styles.rentInfo}>
                        <Text style={styles.rentAmount}>₹{tenant.rent.toLocaleString()}</Text>
                        <View style={[
                            styles.statusBadge,
                            tenant.status === 'paid' ? styles.statusPaid :
                                tenant.status === 'overdue' ? styles.statusOverdue : styles.statusPending
                        ]}>
                            {tenant.status === 'paid' && <CheckCircle2 size={12} color="#10B981" />}
                            {tenant.status === 'overdue' && <AlertCircle size={12} color="#EF4444" />}
                            {tenant.status === 'pending' && <Clock size={12} color="#F59E0B" />}
                            <Text style={[
                                styles.statusText,
                                tenant.status === 'paid' ? styles.textPaid :
                                    tenant.status === 'overdue' ? styles.textOverdue : styles.textPending
                            ]}>{tenant.status}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 24
    },
    tenantCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#18181B',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    tenantInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    tenantName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 2
    },
    unitText: {
        fontSize: 12,
        color: '#71717A'
    },
    rentInfo: {
        alignItems: 'flex-end',
        gap: 6
    },
    rentAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1
    },
    statusPaid: { backgroundColor: '#10B98115', borderColor: '#10B98130' },
    statusOverdue: { backgroundColor: '#EF444415', borderColor: '#EF444430' },
    statusPending: { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' },
    statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    textPaid: { color: '#10B981' },
    textOverdue: { color: '#EF4444' },
    textPending: { color: '#F59E0B' }
});
