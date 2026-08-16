/**
 * components/investments/ValuationStatusBadge.js
 * 
 * Stage C.5.1 Visual badge representing Portfolio-Level Valuation Basis
 * (MARKET_QUOTE, PARTIAL_FALLBACK, COST_BASIS_FALLBACK, EMPTY).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, AlertTriangle, HelpCircle, ShieldAlert } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';

export default function ValuationStatusBadge({ valuationBasis = 'EMPTY', quoteCoverage = null }) {
    let badgeConfig = {
        label: 'No Holdings',
        bgColor: 'rgba(113, 113, 122, 0.15)',
        textColor: '#A1A1AA',
        borderColor: 'rgba(113, 113, 122, 0.3)',
        Icon: HelpCircle,
        accessibilityLabel: 'Valuation Status: No active holdings'
    };

    if (valuationBasis === 'MARKET_QUOTE') {
        badgeConfig = {
            label: 'Live Market Quotes',
            bgColor: 'rgba(16, 185, 129, 0.15)',
            textColor: '#10B981',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            Icon: CheckCircle2,
            accessibilityLabel: 'Valuation Status: 100% Live Market Quotes'
        };
    } else if (valuationBasis === 'PARTIAL_FALLBACK') {
        const coverageText = quoteCoverage && quoteCoverage.totalHoldings > 0
            ? `${quoteCoverage.marketValued}/${quoteCoverage.totalHoldings} Valued`
            : 'Partial Quotes';
        badgeConfig = {
            label: `Partial Fallback (${coverageText})`,
            bgColor: 'rgba(245, 158, 11, 0.15)',
            textColor: '#F59E0B',
            borderColor: 'rgba(245, 158, 11, 0.3)',
            Icon: AlertTriangle,
            accessibilityLabel: `Valuation Status: Partial market fallback, ${coverageText}`
        };
    } else if (valuationBasis === 'COST_BASIS_FALLBACK') {
        badgeConfig = {
            label: 'Cost Basis Fallback',
            bgColor: 'rgba(100, 116, 139, 0.15)',
            textColor: '#94A3B8',
            borderColor: 'rgba(100, 116, 139, 0.3)',
            Icon: ShieldAlert,
            accessibilityLabel: 'Valuation Status: Market quotes unavailable, evaluating on cost basis'
        };
    }

    const { label, bgColor, textColor, borderColor, Icon, accessibilityLabel } = badgeConfig;

    return (
        <View
            style={[styles.badge, { backgroundColor: bgColor, borderColor }]}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={accessibilityLabel}
        >
            <Icon size={12} color={textColor} style={styles.icon} />
            <Text style={[styles.badgeText, { color: textColor }]}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: SPACING.xs,
        borderRadius: 12,
        borderWidth: 1,
        alignSelf: 'flex-start'
    },
    icon: {
        marginRight: 4
    },
    badgeText: {
        fontSize: TYPOGRAPHY.caption || 11,
        fontWeight: '600',
        letterSpacing: 0.2
    }
});
