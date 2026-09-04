import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export function MoneyFlowAttentionSection({ attention, onOpenReserveModal }) {
    if (!attention) return null;

    const reserve = attention.emergencyReserve;
    const obligation = attention.upcomingObligation;

    if (!reserve && !obligation) return null;

    return (
        <View style={mfStyles.attentionCard}>
            <View style={mfStyles.sectionTitleRow}>
                <Text style={mfStyles.sectionTitle}>Needs Your Attention</Text>
            </View>

            {reserve && (
                <TouchableOpacity
                    style={mfStyles.attentionItem}
                    onPress={onOpenReserveModal}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="View emergency reserve calculation"
                >
                    <View style={[mfStyles.attentionIconWrap, { backgroundColor: MF_COLORS.purpleBg }]}>
                        <Ionicons name="shield-checkmark" size={18} color={MF_COLORS.purple} />
                    </View>
                    <View style={mfStyles.attentionContent}>
                        <View style={mfStyles.attentionHeaderRow}>
                            <Text style={mfStyles.attentionTitle}>Emergency Reserve</Text>
                            <Text style={mfStyles.attentionValue}>{reserve.amountFormatted}</Text>
                        </View>
                        <Text style={mfStyles.attentionSubtext}>
                            {reserve.runwayMonthsFormatted} runway · {reserve.recommendedTargetText}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={MF_COLORS.textMuted} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
            )}

            {obligation && (
                <View style={[mfStyles.attentionItem, reserve ? mfStyles.attentionItemBorder : null]}>
                    <View style={[mfStyles.attentionIconWrap, { backgroundColor: MF_COLORS.warningAmberBg }]}>
                        <Ionicons name="calendar-outline" size={18} color={MF_COLORS.warningAmber} />
                    </View>
                    <View style={mfStyles.attentionContent}>
                        <View style={mfStyles.attentionHeaderRow}>
                            <Text style={mfStyles.attentionTitle}>{obligation.title}</Text>
                            <Text style={mfStyles.attentionValue}>{obligation.amountFormatted}</Text>
                        </View>
                        <Text style={mfStyles.attentionSubtext}>{obligation.dueDateFormatted}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}
