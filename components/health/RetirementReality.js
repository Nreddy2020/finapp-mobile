import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function RetirementReality({ metrics }) {
    const [retireAge, setRetireAge] = useState(60);
    const [currentAge, setCurrentAge] = useState(30); // Default assumption

    const calculateSurvivalAge = () => {
        if (!metrics) return 0;

        let assets = metrics.totalAssets - metrics.totalDebt; // Net Worth
        let monthlyBurn = metrics.monthlyExpenses; // Base burn

        // Growth Phase
        const yearsToRetire = retireAge - currentAge;
        for (let i = 0; i < yearsToRetire; i++) {
            assets = assets * 1.08; // 8% growth
            assets += (metrics.monthlyIncome - monthlyBurn) * 12; // Add yearly savings
        }

        // Withdrawal Phase
        let age = retireAge;
        while (assets > 0 && age < 100) {
            assets = assets * 1.04; // 4% conservative growth in retirement
            assets -= (monthlyBurn * 12); // Yearly withdrawal
            assets = assets * 0.94; // Inflation hit (6%) - Real value calc
            age++;
        }

        return age;
    };

    const moneyLastsUntil = calculateSurvivalAge();
    const isSafe = moneyLastsUntil >= 85;

    return (
        <LuxuryCard style={styles.section}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
                    <Sparkles size={16} color="#8B5CF6" />
                </View>
                <View>
                    <Text style={styles.title}>Retirement Reality Check</Text>
                    <Text style={styles.subtitle}>Will you outlive your money?</Text>
                </View>
            </View>

            <View style={{ marginBottom: 20 }}>
                <View style={styles.row}>
                    <Text style={styles.label}>Retire at Age</Text>
                    <Text style={styles.ageValue}>{retireAge}</Text>
                </View>

                {/* Custom Slider Track */}
                <View style={styles.sliderContainer}>
                    {[40, 50, 55, 60, 65, 70].map(age => (
                        <Pressable
                            key={age}
                            onPress={() => setRetireAge(age)}
                            style={[
                                styles.sliderButton,
                                { backgroundColor: retireAge === age ? '#8B5CF6' : 'transparent' }
                            ]}
                        >
                            <Text style={[styles.sliderText, { color: retireAge === age ? '#FFF' : '#71717A' }]}>{age}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={[styles.impactBox, { backgroundColor: isSafe ? '#10B98110' : '#EF444410', borderColor: isSafe ? '#10B98130' : '#EF444430' }]}>
                <Text style={[styles.impactLabel, { color: isSafe ? '#10B981' : '#EF4444' }]}>
                    MONEY LASTS UNTIL AGE
                </Text>
                <Text style={[styles.impactValue, { color: isSafe ? '#10B981' : '#EF4444' }]}>
                    {moneyLastsUntil >= 100 ? '100+' : moneyLastsUntil}
                </Text>
                <Text style={[styles.impactDesc, { color: isSafe ? '#10B98180' : '#EF444480' }]}>
                    {isSafe ? "You are financially free! 🎉" : "CRITICAL: You will run out of money. Plan to retire later or save more."}
                </Text>
            </View>
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    label: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    ageValue: { color: '#8B5CF6', fontWeight: '700', fontSize: 16 },
    sliderContainer: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#27272A', borderRadius: 20, paddingHorizontal: 4 },
    sliderButton: { width: 40, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    sliderText: { fontWeight: '700', fontSize: 12 },
    impactBox: { padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginTop: 8 },
    impactLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 },
    impactValue: { fontSize: 36, fontWeight: '900' },
    impactDesc: { fontSize: 12, fontWeight: '600' }
});
