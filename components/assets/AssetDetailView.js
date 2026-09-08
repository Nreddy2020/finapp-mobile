/**
 * components/assets/AssetDetailView.js
 * 
 * FinLife Assets Module — Specialized Asset Detail View.
 * Matches Screens 3, 4, and 5 in mockup media_1788794817378.jpg:
 * - Gold Jewellery Detail
 * - Vehicle Net Equity Detail
 * - Investment NAV Detail
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, ChevronRight, Gem, Car, TrendingUp } from 'lucide-react-native';

export default function AssetDetailView({ model, onBack, onAction, subtabs = ['Overview', 'Details', 'History', 'Documents'] }) {
    const [activeSubtab, setActiveSubtab] = useState(subtabs[0]);

    if (!model) return null;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header with Back Button */}
            <View style={styles.navHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={22} color="#F9FAFB" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>{model.title}</Text>
                <View style={{ width: 22 }} />
            </View>

            {/* Asset Identity Card */}
            <View style={styles.identityCard}>
                <View style={styles.titleRow}>
                    <View style={styles.titleCol}>
                        {model.headerBadge && (
                            <Text style={styles.headerBadgeText}>{model.headerBadge}</Text>
                        )}
                        <Text style={styles.assetTitle}>{model.title}</Text>
                        <Text style={styles.assetSubtitle}>{model.subtitle}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{model.statusBadge}</Text>
                    </View>
                </View>

                {/* Subtabs Pill Switcher */}
                <View style={styles.subtabsContainer}>
                    {subtabs.map((tab) => {
                        const isActive = activeSubtab === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.subtabBtn, isActive && styles.subtabBtnActive]}
                                onPress={() => setActiveSubtab(tab)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.subtabText, isActive && styles.subtabTextActive]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Twin Value Cards */}
            {model.twinCards && (
                <View style={styles.twinCardsRow}>
                    <View style={styles.twinCard}>
                        <Text style={styles.twinCardLabel}>Current Value</Text>
                        <Text style={styles.twinCardValue}>{model.twinCards.currentValueFormatted}</Text>
                    </View>
                    <View style={styles.twinCard}>
                        <Text style={styles.twinCardLabel}>
                            {model.twinCards.investedAmountFormatted ? 'Invested Amount' : 'Purchase Cost'}
                        </Text>
                        <Text style={styles.twinCardValue}>
                            {model.twinCards.investedAmountFormatted || model.twinCards.purchaseCostFormatted}
                        </Text>
                    </View>
                </View>
            )}

            {/* Gain Banner if Present */}
            {model.gainBanner && (
                <View style={styles.gainBanner}>
                    <Text style={styles.gainLabel}>{model.gainBanner.label}</Text>
                    <Text style={styles.gainValue}>{model.gainBanner.formattedValue}</Text>
                </View>
            )}

            {/* Specifications List */}
            <View style={styles.specsContainer}>
                {model.specs.map((spec, index) => (
                    <View 
                        key={spec.label} 
                        style={[
                            styles.specRow,
                            index === model.specs.length - 1 && { borderBottomWidth: 0 },
                            spec.isEquity && styles.equityRow
                        ]}
                    >
                        <Text style={styles.specLabel}>{spec.label}</Text>
                        <View style={styles.specValueGroup}>
                            <Text style={[
                                styles.specValue,
                                spec.isEquity && (spec.isNegative ? styles.negativeEquityText : styles.positiveEquityText),
                                spec.isPositive && styles.positiveText
                            ]}>
                                {spec.value}
                            </Text>
                            {spec.actionLabel && (
                                <TouchableOpacity activeOpacity={0.7}>
                                    <Text style={styles.specActionLabel}>{spec.actionLabel}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}
            </View>

            {/* Bottom Actions */}
            {model.actions && (
                <View style={styles.actionsRow}>
                    {model.actions.map((act, i) => (
                        <TouchableOpacity 
                            key={act}
                            style={[styles.actionBtn, i === 1 && styles.primaryActionBtn]}
                            onPress={() => onAction && onAction(act)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.actionBtnText, i === 1 && styles.primaryActionBtnText]}>
                                {act}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090B'
    },
    content: {
        paddingBottom: 40
    },
    navHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8
    },
    backBtn: {
        padding: 6
    },
    navTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    identityCard: {
        backgroundColor: '#111827',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    titleCol: {
        flex: 1
    },
    headerBadgeText: {
        color: '#3B82F6',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 2
    },
    assetTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800'
    },
    assetSubtitle: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2
    },
    statusBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },
    statusText: {
        color: '#22C55E',
        fontSize: 12,
        fontWeight: '700'
    },
    subtabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 4,
        gap: 4
    },
    subtabBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8
    },
    subtabBtnActive: {
        backgroundColor: '#3B82F6'
    },
    subtabText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600'
    },
    subtabTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    twinCardsRow: {
        flexDirection: 'row',
        gap: 12,
        marginHorizontal: 16,
        marginBottom: 10
    },
    twinCard: {
        flex: 1,
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    twinCardLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4
    },
    twinCardValue: {
        color: '#F9FAFB',
        fontSize: 20,
        fontWeight: '800'
    },
    gainBanner: {
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        borderRadius: 14,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)'
    },
    gainLabel: {
        color: '#D1D5DB',
        fontSize: 13,
        fontWeight: '600'
    },
    gainValue: {
        color: '#22C55E',
        fontSize: 14,
        fontWeight: '800'
    },
    specsContainer: {
        backgroundColor: '#111827',
        borderRadius: 16,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937'
    },
    equityRow: {
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderRadius: 8,
        paddingHorizontal: 8
    },
    specLabel: {
        color: '#9CA3AF',
        fontSize: 13,
        fontWeight: '500'
    },
    specValueGroup: {
        alignItems: 'flex-end'
    },
    specValue: {
        color: '#F3F4F6',
        fontSize: 13,
        fontWeight: '600'
    },
    specActionLabel: {
        color: '#3B82F6',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2
    },
    positiveEquityText: {
        color: '#22C55E',
        fontWeight: '700'
    },
    negativeEquityText: {
        color: '#EF4444',
        fontWeight: '700'
    },
    positiveText: {
        color: '#22C55E',
        fontWeight: '700'
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginHorizontal: 16,
        marginTop: 16
    },
    actionBtn: {
        flex: 1,
        backgroundColor: '#1F2937',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    actionBtnText: {
        color: '#F9FAFB',
        fontSize: 14,
        fontWeight: '600'
    },
    primaryActionBtn: {
        backgroundColor: '#10B981' // Green
    },
    primaryActionBtnText: {
        color: '#FFFFFF',
        fontWeight: '700'
    }
});
