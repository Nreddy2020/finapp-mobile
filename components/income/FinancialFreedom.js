import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flag, Rocket } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import ProgressBar from '../ui/ProgressBar';

export default function FinancialFreedom({ currentIncome, potentialIncome, isPotentialMode, freedomGoal = 50000000, marketReturnRate = 12 }) {
    // Logic: Goal & Return passed as props. Assumed Savings Rate = 30%.
    const TARGET = freedomGoal;
    const SAVINGS_RATE = 0.30;
    const ANNUAL_RETURN = marketReturnRate / 100; // Convert 12 to 0.12

    const calculateYearsToFreedom = (annualIncome) => {
        const annualSavings = annualIncome * SAVINGS_RATE;
        if (annualSavings <= 0) return 99;

        let portfolio = 1000000; // Starting Portfolio (Mock)
        let years = 0;

        while (portfolio < TARGET && years < 50) {
            portfolio = (portfolio * (1 + ANNUAL_RETURN)) + annualSavings;
            years++;
        }
        return years;
    };

    const currentYears = calculateYearsToFreedom(currentIncome * 12); // Monthly to Annual
    const potentialYears = calculateYearsToFreedom(potentialIncome * 12);

    const currentFreedomYear = new Date().getFullYear() + currentYears;
    const potentialFreedomYear = new Date().getFullYear() + potentialYears;

    const yearsSaved = currentYears - potentialYears;

    return (
        <LuxuryCard style={styles.card}>
            <View style={styles.header}>
                <Rocket size={20} color={isPotentialMode ? "#F59E0B" : "#10B981"} />
                <Text style={styles.title}>Financial Freedom Timeline</Text>
            </View>

            <View style={styles.timelineContainer}>
                {/* Current Trajectory */}
                <View style={[styles.timelineRow, isPotentialMode && { opacity: 0.5 }]}>
                    <Text style={styles.yearLabel}>Actual Path</Text>
                    <View style={styles.barContainer}>
                        <View style={[styles.bar, { width: '80%', backgroundColor: '#10B981' }]} />
                        <Text style={styles.yearText}>{currentFreedomYear}</Text>
                    </View>
                </View>

                {/* Potential Trajectory */}
                {isPotentialMode && (
                    <View style={styles.timelineRow}>
                        <Text style={[styles.yearLabel, { color: '#F59E0B' }]}>Potential</Text>
                        <View style={styles.barContainer}>
                            <View style={[styles.bar, { width: '60%', backgroundColor: '#F59E0B' }]} />
                            <Text style={[styles.yearText, { color: '#F59E0B' }]}>{potentialFreedomYear}</Text>
                        </View>
                    </View>
                )}
            </View>

            {isPotentialMode && yearsSaved > 0 && (
                <View style={styles.insightBox}>
                    <Text style={styles.insightText}>
                        🚀 These changes could retire you <Text style={{ fontWeight: '700', color: '#FFF' }}>{yearsSaved} years earlier!</Text>
                    </Text>
                </View>
            )}
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    card: { marginHorizontal: 24, padding: 20, marginBottom: 24 },
    header: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    timelineContainer: { gap: 16 },
    timelineRow: { gap: 8 },
    yearLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '600', width: 70 },
    barContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    bar: { height: 8, borderRadius: 4 },
    yearText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    insightBox: { marginTop: 16, backgroundColor: '#F59E0B20', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B40' },
    insightText: { color: '#F59E0B', fontSize: 13, textAlign: 'center' }
});
