import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TimeModuleHeader() {
    return (
        <View style={styles.headerContainer}>
            <View style={styles.leftCol}>
                <Text style={styles.moduleTitle}>Time Management Module</Text>
                <Text style={styles.moduleSubtitle}>Plan Smarter  ·  Focus Better  ·  Achieve More</Text>
            </View>
            <View style={styles.rightCol}>
                <Text style={styles.tagline}>
                    Your Goals  <Text style={styles.divider}>|</Text>  Our Planning  <Text style={styles.divider}>|</Text>  A Better You
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#0F172A',
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
        gap: 8,
    },
    leftCol: {
        minWidth: 220,
        flex: 1,
    },
    moduleTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#F8FAFC',
        letterSpacing: -0.3,
    },
    moduleSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#94A3B8',
        marginTop: 2,
    },
    rightCol: {
        alignItems: 'flex-end',
    },
    tagline: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        letterSpacing: 0.2,
    },
    divider: {
        color: '#334155',
    },
});
