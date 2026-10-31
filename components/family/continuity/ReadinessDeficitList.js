/**
 * components/family/continuity/ReadinessDeficitList.js
 * 
 * Prioritized Resilience Deficit List with Cross-Domain Deep Links.
 * Displays actionable gaps identified by the readiness engine and provides
 * direct deep links to remediate them within owning domain screens.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowUpRight, CheckCircle2 } from 'lucide-react-native';

export default function ReadinessDeficitList({ deficits = [] }) {
    const router = useRouter();

    if (!deficits || deficits.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <CheckCircle2 size={24} color="#10B981" />
                <Text style={styles.emptyTitle}>Zero Readiness Deficits</Text>
                <Text style={styles.emptySubtitle}>
                    All emergency contacts, healthcare proxies, vital documents, and financial safeguards are in place.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={16} color="#F59E0B" />
                    <Text style={styles.title}>ACTIONABLE READINESS GAPS ({deficits.length})</Text>
                </View>
                <Text style={styles.subtitle}>Remediate in Owning Domain</Text>
            </View>

            <View style={styles.listWrap}>
                {deficits.map((d, index) => (
                    <View key={`${d.code}_${index}`} style={styles.deficitCard}>
                        <View style={styles.deficitContent}>
                            <View style={styles.badgeRow}>
                                <Text style={styles.deficitPillarBadge}>Pillar {d.pillar}</Text>
                                <Text style={styles.pointsBadge}>-{d.pointsLost} pts</Text>
                            </View>
                            <Text style={styles.deficitTitle}>{d.title}</Text>
                            <Text style={styles.deficitDesc}>{d.description}</Text>
                        </View>

                        {d.targetRoute && (
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => router.push(d.targetRoute)}
                            >
                                <Text style={styles.actionBtnText}>Fix</Text>
                                <ArrowUpRight size={14} color="#38BDF8" />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 10
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    title: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    subtitle: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '600'
    },
    listWrap: {
        gap: 10
    },
    deficitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121215',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#27272A',
        gap: 12
    },
    deficitContent: {
        flex: 1
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6
    },
    deficitPillarBadge: {
        fontSize: 10,
        fontWeight: '700',
        color: '#A1A1AA',
        backgroundColor: '#18181B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    pointsBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: '#EF4444',
        backgroundColor: '#4C051940',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    deficitTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 3
    },
    deficitDesc: {
        color: '#A1A1AA',
        fontSize: 12,
        lineHeight: 16
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#0C4A6E30',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#0284C7'
    },
    actionBtnText: {
        color: '#38BDF8',
        fontSize: 12,
        fontWeight: '700'
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        marginHorizontal: 16,
        marginVertical: 10,
        backgroundColor: '#061D15',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#059669',
        gap: 6
    },
    emptyTitle: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '800'
    },
    emptySubtitle: {
        color: '#A1A1AA',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 16
    }
});
