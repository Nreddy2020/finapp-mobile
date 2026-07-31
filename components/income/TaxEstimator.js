import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calculator, CheckCircle, Info, TrendingDown, DollarSign } from 'lucide-react-native';

export default function TaxEstimator({ income, currency, formatAmount, customTotalIncome }) {
    const isIndia = currency.code === 'INR';
    const [regime, setRegime] = useState('new'); // 'new' | 'old' | 'flat'
    const [flatRate, setFlatRate] = useState(20); // Default 20% for global

    // Auto-switch to flat rate if not India
    useEffect(() => {
        if (!isIndia) setRegime('flat');
        else setRegime('new');
    }, [isIndia]);

    // Calculate total annual income
    const annualIncome = useMemo(() => {
        if (customTotalIncome !== undefined) return customTotalIncome * 12;
        const totalMonthly = income.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        return totalMonthly * 12;
    }, [income, customTotalIncome]);

    // Simplified Tax Calculation (India FY 2024-25)
    // Note: This is an estimation. 
    const calculateTax = (incomeAmount, taxRegime) => {
        let tax = 0;
        let taxableIncome = incomeAmount;

        if (regime === 'flat') {
            return taxableIncome * (flatRate / 100);
        }

        // Standard Deduction (Only for India)
        const standardDeduction = 75000;
        taxableIncome = Math.max(0, taxableIncome - standardDeduction);

        if (taxRegime === 'new') {
            // New Regime Slabs (FY 24-25)
            // 0-3L: Nil
            // 3-7L: 5%
            // 7-10L: 10%
            // 10-12L: 15%
            // 12-15L: 20%
            // >15L: 30%

            if (taxableIncome <= 300000) return 0;

            // Rebate u/s 87A for income up to 7L
            if (taxableIncome <= 700000) return 0;

            if (taxableIncome > 300000) tax += Math.min(taxableIncome - 300000, 400000) * 0.05;
            if (taxableIncome > 700000) tax += Math.min(taxableIncome - 700000, 300000) * 0.10;
            if (taxableIncome > 1000000) tax += Math.min(taxableIncome - 1000000, 200000) * 0.15;
            if (taxableIncome > 1200000) tax += Math.min(taxableIncome - 1200000, 300000) * 0.20;
            if (taxableIncome > 1500000) tax += (taxableIncome - 1500000) * 0.30;
        } else {
            // Old Regime (Simplified - assuming no other deductions for this basic view)
            // 0-2.5L: Nil
            // 2.5-5L: 5%
            // 5-10L: 20%
            // >10L: 30%

            // Note: Old regime heavily depends on deductions (80C, HRA, etc).
            // This is a worst-case baseline without user inputting deductions.

            if (taxableIncome <= 250000) return 0;
            if (taxableIncome <= 500000) return 0; // Rebate u/s 87A

            if (taxableIncome > 250000) tax += Math.min(taxableIncome - 250000, 250000) * 0.05;
            if (taxableIncome > 500000) tax += Math.min(taxableIncome - 500000, 500000) * 0.20;
            if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.30;
        }

        // Cess 4%
        return tax * 1.04;
    };

    const taxAmount = calculateTax(annualIncome, regime);
    const netIncome = annualIncome - taxAmount;
    const monthlyNet = netIncome / 12;
    const effectiveRate = (taxAmount / annualIncome) * 100;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Regime Switcher */}
            {isIndia ? (
                <View style={styles.regimeContainer}>
                    <TouchableOpacity
                        style={[styles.regimeButton, regime === 'new' && styles.regimeButtonActive]}
                        onPress={() => setRegime('new')}
                    >
                        <Text style={[styles.regimeText, regime === 'new' && styles.regimeTextActive]}>New Regime</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.regimeButton, regime === 'old' && styles.regimeButtonActive]}
                        onPress={() => setRegime('old')}
                    >
                        <Text style={[styles.regimeText, regime === 'old' && styles.regimeTextActive]}>Old Regime</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.regimeContainer}>
                    <View style={styles.regimeButtonActive}>
                        <Text style={styles.regimeTextActive}>Global Flat Rate: {flatRate}%</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
                        <TouchableOpacity onPress={() => setFlatRate(Math.max(0, flatRate - 5))} style={styles.adjustBtn}>
                            <Text style={styles.adjustText}>-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setFlatRate(Math.min(100, flatRate + 5))} style={styles.adjustBtn}>
                            <Text style={styles.adjustText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Main Estimate Card */}
            <View style={styles.estimateCard}>
                <View style={styles.estimateHeader}>
                    <Calculator size={24} color="#F59E0B" />
                    <Text style={styles.estimateTitle}>Estimated Tax FY 24-25</Text>
                </View>

                <View style={styles.amountRow}>
                    <View>
                        <Text style={styles.label}>Annual Income</Text>
                        <Text style={styles.amountValue}>{formatAmount(annualIncome, 0)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>Tax Payable</Text>
                        <Text style={[styles.amountValue, { color: '#EF4444' }]}>{formatAmount(taxAmount, 0)}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.netRow}>
                    <Text style={styles.netLabel}>Net In-Hand (Annual)</Text>
                    <Text style={styles.netValue}>{formatAmount(netIncome, 0)}</Text>
                </View>
                <View style={styles.netRow}>
                    <Text style={styles.subLabel}>~ {formatAmount(monthlyNet, 0)} / month</Text>
                    <Text style={styles.subLabel}>Effective Rate: {effectiveRate.toFixed(1)}%</Text>
                </View>
            </View>

            {/* Smart Suggestions */}
            <Text style={styles.sectionTitle}>Tax Saving Suggestions</Text>

            <View style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                    <CheckCircle size={20} color="#10B981" />
                    <Text style={styles.suggestionTitle}>80C Investments</Text>
                </View>
                <Text style={styles.suggestionText}>
                    Save up to ₹46,800 in tax by investing ₹1.5L in ELSS, PPF, or LIC.
                </Text>
            </View>

            <View style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                    <CheckCircle size={20} color="#3B82F6" />
                    <Text style={styles.suggestionTitle}>Health Insurance (80D)</Text>
                </View>
                <Text style={styles.suggestionText}>
                    Claim deduction up to ₹25,000 for self/family and additional ₹25,000 for parents.
                </Text>
            </View>

            <View style={styles.infoBox}>
                <Info size={16} color="#71717A" />
                <Text style={styles.infoText}>
                    Estimates are indicative based on standard deduction of ₹75,000. Consult a CA for accurate filing.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    regimeContainer: {
        flexDirection: 'row',
        backgroundColor: '#18181B',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    regimeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8
    },
    regimeButtonActive: {
        backgroundColor: '#27272A'
    },
    regimeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#71717A'
    },
    regimeTextActive: {
        color: '#FFFFFF'
    },
    estimateCard: {
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F59E0B20'
    },
    estimateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12
    },
    estimateTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F59E0B'
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    label: {
        fontSize: 12,
        color: '#A1A1AA',
        marginBottom: 4
    },
    amountValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    divider: {
        height: 1,
        backgroundColor: '#FFFFFF10',
        marginVertical: 16
    },
    netRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    netLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    netValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#10B981'
    },
    subLabel: {
        fontSize: 12,
        color: '#71717A'
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#71717A',
        marginBottom: 16,
        letterSpacing: 2,
        textTransform: 'uppercase'
    },
    suggestionCard: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    suggestionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10
    },
    suggestionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    suggestionText: {
        fontSize: 13,
        color: '#A1A1AA',
        lineHeight: 20,
        marginLeft: 30
    },
    infoBox: {
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        backgroundColor: '#27272A',
        borderRadius: 12,
        marginTop: 12,
        alignItems: 'flex-start'
    },
    infoText: {
        flex: 1,
        fontSize: 11,
        color: '#71717A',
        lineHeight: 16
    },
    adjustBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    adjustText: {
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: '600'
    }
});
