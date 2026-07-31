import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Pill, AlertCircle, TrendingDown, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function MedicineCard({ medicine, onPress }) {
    const daysLeft = medicine.days_left || 0;
    const isUrgent = daysLeft <= 3;
    const isLow = daysLeft > 3 && daysLeft <= 7;

    const getStatusColor = () => {
        if (isUrgent) return '#EF4444'; // Red
        if (isLow) return '#F59E0B'; // Orange
        return '#10B981'; // Green
    };

    const getStatusText = () => {
        if (isUrgent) return 'URGENT';
        if (isLow) return 'LOW';
        return 'OK';
    };

    const savings = medicine.generic_available
        ? (medicine.cost - medicine.generic_cost)
        : 0;

    return (
        <Pressable style={styles.card} onPress={onPress}>
            <LinearGradient
                colors={[`${getStatusColor()}15`, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.glow}
            />

            <View style={styles.iconContainer}>
                <Pill size={24} color={getStatusColor()} strokeWidth={2.5} />
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name}>{medicine.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor() }]}>
                            {getStatusText()}
                        </Text>
                    </View>
                </View>

                <Text style={styles.dosage}>Dosage: {medicine.dosage}</Text>

                <View style={styles.footer}>
                    <View style={styles.daysContainer}>
                        <Calendar size={14} color={getStatusColor()} />
                        <Text style={[styles.daysText, { color: getStatusColor() }]}>
                            {daysLeft} days left
                        </Text>
                    </View>

                    {medicine.generic_available && (
                        <View style={styles.savingsContainer}>
                            <TrendingDown size={14} color="#10B981" />
                            <Text style={styles.savingsText}>
                                Save ₹{savings}
                            </Text>
                        </View>
                    )}
                </View>

                {isUrgent && (
                    <View style={styles.urgentAlert}>
                        <AlertCircle size={16} color="#EF4444" />
                        <Text style={styles.urgentText}>Refill immediately!</Text>
                    </View>
                )}
            </View>

            <View style={styles.priceContainer}>
                <Text style={styles.price}>₹{medicine.cost}</Text>
                {medicine.generic_available && (
                    <Text style={styles.genericPrice}>Generic: ₹{medicine.generic_cost}</Text>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'relative',
        flexDirection: 'row',
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        overflow: 'hidden',
    },
    glow: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 120,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#FFFFFF05',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    dosage: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    daysContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF08',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    daysText: {
        fontSize: 12,
        fontWeight: '700',
    },
    savingsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#10B98115',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    savingsText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },
    urgentAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        backgroundColor: '#EF444415',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    urgentText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#EF4444',
    },
    priceContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    price: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    genericPrice: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
});
