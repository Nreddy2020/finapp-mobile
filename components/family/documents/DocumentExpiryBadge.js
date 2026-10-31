import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ExpiryStatus } from '../../../services/family/familyContracts.js';

export default function DocumentExpiryBadge({ expiryStatus, daysRemaining }) {
    if (!expiryStatus || expiryStatus === ExpiryStatus.NO_EXPIRY) {
        return (
            <View style={[styles.badge, styles.noExpiryBadge]}>
                <Text style={[styles.badgeText, styles.noExpiryText]}>No Expiry</Text>
            </View>
        );
    }

    if (expiryStatus === ExpiryStatus.EXPIRED) {
        const absDays = Math.abs(daysRemaining || 0);
        const label = absDays === 0 ? 'Expired today' : `Expired ${absDays}d ago`;
        return (
            <View style={[styles.badge, styles.expiredBadge]}>
                <Text style={[styles.badgeText, styles.expiredText]}>{label}</Text>
            </View>
        );
    }

    if (expiryStatus === ExpiryStatus.EXPIRING_SOON) {
        const label = daysRemaining === 0 ? 'Expires today' : `Expires in ${daysRemaining}d`;
        const isUrgent = daysRemaining <= 30;
        return (
            <View style={[styles.badge, isUrgent ? styles.urgentBadge : styles.expiringSoonBadge]}>
                <Text style={[styles.badgeText, isUrgent ? styles.urgentText : styles.expiringSoonText]}>
                    {label}
                </Text>
            </View>
        );
    }

    // VALID (> 90 days)
    return (
        <View style={[styles.badge, styles.validBadge]}>
            <Text style={[styles.badgeText, styles.validText]}>Valid ({daysRemaining}d)</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        alignSelf: 'flex-start'
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3
    },
    noExpiryBadge: {
        backgroundColor: '#27272A20',
        borderColor: '#3F3F46'
    },
    noExpiryText: {
        color: '#A1A1AA'
    },
    validBadge: {
        backgroundColor: '#064E3B20',
        borderColor: '#05966960'
    },
    validText: {
        color: '#34D399'
    },
    expiringSoonBadge: {
        backgroundColor: '#78350F20',
        borderColor: '#D9770660'
    },
    expiringSoonText: {
        color: '#FBBF24'
    },
    urgentBadge: {
        backgroundColor: '#7C2D1225',
        borderColor: '#EA580C60'
    },
    urgentText: {
        color: '#FB923C'
    },
    expiredBadge: {
        backgroundColor: '#88133725',
        borderColor: '#E11D4860'
    },
    expiredText: {
        color: '#F43F5E'
    }
});
