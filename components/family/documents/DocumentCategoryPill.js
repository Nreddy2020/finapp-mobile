import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DocumentCategory } from '../../../services/family/familyContracts.js';

const CATEGORY_THEMES = {
    [DocumentCategory.IDENTITY]: { label: 'Identity', bg: '#1E3A8A25', border: '#3B82F640', text: '#60A5FA' },
    [DocumentCategory.FINANCIAL]: { label: 'Financial', bg: '#064E3B25', border: '#10B98140', text: '#34D399' },
    [DocumentCategory.MEDICAL]: { label: 'Medical', bg: '#88133725', border: '#F43F5E40', text: '#FB7185' },
    [DocumentCategory.LEGAL]: { label: 'Legal', bg: '#78350F25', border: '#F59E0B40', text: '#FBBF24' },
    [DocumentCategory.PROPERTY]: { label: 'Property', bg: '#4C1D9525', border: '#8B5CF640', text: '#A78BFA' },
    [DocumentCategory.VEHICLE]: { label: 'Vehicle', bg: '#7C2D1225', border: '#F9731640', text: '#FB923C' },
    [DocumentCategory.EDUCATION]: { label: 'Education', bg: '#134E4A25', border: '#14B8A640', text: '#2DD4BF' },
    [DocumentCategory.OTHER]: { label: 'Other', bg: '#27272A25', border: '#71717A40', text: '#A1A1AA' }
};

export default function DocumentCategoryPill({ category, size = 'medium' }) {
    const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES[DocumentCategory.OTHER];
    const isSmall = size === 'small';

    return (
        <View style={[
            styles.pill,
            { backgroundColor: theme.bg, borderColor: theme.border },
            isSmall && styles.pillSmall
        ]}>
            <Text style={[
                styles.text,
                { color: theme.text },
                isSmall && styles.textSmall
            ]}>
                {theme.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        alignSelf: 'flex-start'
    },
    pillSmall: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    text: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3
    },
    textSmall: {
        fontSize: 10
    }
});
