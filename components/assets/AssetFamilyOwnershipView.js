/**
 * components/assets/AssetFamilyOwnershipView.js
 * 
 * FinLife Assets Module — Family Ownership Breakdown View.
 * Matching Screen 7 in mockup media_1788794817378.jpg.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { User, Users, Heart } from 'lucide-react-native';
import { getFamilyOwnershipViewModel } from './assetPresentationAdapter.js';

function getMemberIcon(member) {
    const size = 18;
    switch (member.toLowerCase()) {
        case 'self':
            return <User size={size} color="#3B82F6" />;
        case 'spouse':
            return <Heart size={size} color="#EC4899" />;
        case 'children':
            return <Users size={size} color="#10B981" />;
        default:
            return <User size={size} color="#F59E0B" />;
    }
}

export default function AssetFamilyOwnershipView({ members = getFamilyOwnershipViewModel() }) {
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Family Ownership</Text>
                <Text style={styles.subtext}>Household Allocation</Text>
            </View>

            <View style={styles.cardList}>
                {members.map((m) => (
                    <View key={m.member} style={styles.memberCard}>
                        <View style={styles.iconBox}>
                            {getMemberIcon(m.member)}
                        </View>
                        <View style={styles.infoCol}>
                            <Text style={styles.memberName}>{m.member}</Text>
                            <Text style={styles.assetCountText}>Assets: {m.assetCount}</Text>
                        </View>
                        <View style={styles.valueCol}>
                            <Text style={styles.valueLabel}>Value</Text>
                            <Text style={styles.amountText}>{m.totalFormatted}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#111827',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    subtext: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500'
    },
    cardList: {
        gap: 10
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#334155'
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    infoCol: {
        flex: 1
    },
    memberName: {
        color: '#F9FAFB',
        fontSize: 14,
        fontWeight: '700'
    },
    assetCountText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2
    },
    valueCol: {
        alignItems: 'flex-end'
    },
    valueLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '500'
    },
    amountText: {
        color: '#38BDF8',
        fontSize: 15,
        fontWeight: '700',
        marginTop: 2
    }
});
