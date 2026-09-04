import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Home, Car, Heart, GraduationCap, Briefcase, AlertTriangle, CheckCircle2, ChevronRight, Plus, Minus, RotateCcw, Bookmark } from 'lucide-react-native';
import { simulateLifeEventLoan } from '../../services/budget/budgetEngine.js';
import { formatCurrency } from '../../services/budget/budgetViewModel.js';
import { VIABILITY_STATUS } from '../../services/budget/budgetContracts.js';

const LIFE_EVENTS = [
    { id: 'house', name: 'Buy a House', icon: Home, defaultPrice: 9000000, defaultDP: 2000000, defaultRate: 7.1, defaultTenure: 20 },
    { id: 'car', name: 'Car', icon: Car, defaultPrice: 1500000, defaultDP: 300000, defaultRate: 8.5, defaultTenure: 5 },
    { id: 'marriage', name: 'Marriage', icon: Heart, defaultPrice: 1000000, defaultDP: 400000, defaultRate: 10.5, defaultTenure: 3 },
    { id: 'education', name: 'Education', icon: GraduationCap, defaultPrice: 2500000, defaultDP: 500000, defaultRate: 9.0, defaultTenure: 7 },
    { id: 'job', name: 'Job Change', icon: Briefcase, defaultPrice: 500000, defaultDP: 500000, defaultRate: 0, defaultTenure: 1 }
];

export default function AdvancedWhatIfPlanner({ onBack }) {
    const [selectedEventId, setSelectedEventId] = useState('house');
    const activeEvent = LIFE_EVENTS.find(e => e.id === selectedEventId) || LIFE_EVENTS[0];

    const [price, setPrice] = useState(activeEvent.defaultPrice);
    const [downPayment, setDownPayment] = useState(activeEvent.defaultDP);
    const [interestRate, setInterestRate] = useState(activeEvent.defaultRate);
    const [tenureYears, setTenureYears] = useState(activeEvent.defaultTenure);
    const [savedScenarios, setSavedScenarios] = useState([]);
    const [savedMessage, setSavedMessage] = useState('');

    const handleSelectEvent = (evt) => {
        setSelectedEventId(evt.id);
        setPrice(evt.defaultPrice);
        setDownPayment(evt.defaultDP);
        setInterestRate(evt.defaultRate);
        setTenureYears(evt.defaultTenure);
    };

    // Calculate simulation dynamically
    const simulation = useMemo(() => {
        return simulateLifeEventLoan({
            price,
            downPayment,
            interestRate,
            tenureYears,
            currentMonthlySurplus: 37500,
            existingMonthlyDebtPayments: 0,
            monthlyIncome: 124000,
            safetyBuffer: 10000
        });
    }, [price, downPayment, interestRate, tenureYears]);

    const isNotComfortable = simulation.viability === VIABILITY_STATUS.NOT_COMFORTABLE;

    const handleSaveScenario = () => {
        const newScenario = {
            id: Date.now().toString(),
            name: `${activeEvent.name} - ${formatCurrency(price, { compact: true })}`,
            emi: simulation.monthlyEMI,
            shortfall: simulation.monthlyShortfall
        };
        setSavedScenarios(prev => [newScenario, ...prev]);
        setSavedMessage('Scenario saved successfully!');
        setTimeout(() => setSavedMessage(''), 3000);
    };

    const handleReset = () => {
        setPrice(activeEvent.defaultPrice);
        setDownPayment(activeEvent.defaultDP);
        setInterestRate(activeEvent.defaultRate);
        setTenureYears(activeEvent.defaultTenure);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Advanced Budget Planner</Text>
                <Text style={styles.subtitle}>Simulate life events and see the impact on your finances.</Text>
            </View>

            {/* Event Selector Horizontal Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventPillsRow}>
                {LIFE_EVENTS.map(evt => {
                    const isSelected = evt.id === selectedEventId;
                    return (
                        <TouchableOpacity
                            key={evt.id}
                            style={[styles.eventPill, isSelected && styles.eventPillSelected]}
                            onPress={() => handleSelectEvent(evt)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.eventPillText, isSelected && styles.eventPillTextSelected]}>
                                {evt.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Event Planner Card */}
            <View style={styles.plannerCard}>
                <View style={styles.cardTopRow}>
                    <View style={styles.eventIconBox}>
                        <activeEvent.icon size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.plannerCardTitle}>{activeEvent.name} Planner</Text>
                </View>

                {/* Property Price */}
                <View style={styles.sliderGroup}>
                    <View style={styles.paramLabelRow}>
                        <Text style={styles.paramLabel}>Property Price</Text>
                        <Text style={styles.paramValue}>{formatCurrency(price)}</Text>
                    </View>
                    <View style={styles.stepperRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setPrice(Math.max(100000, price - 500000))}>
                            <Minus size={16} color="#94A3B8" />
                        </TouchableOpacity>
                        <View style={styles.stepBar}>
                            <View style={[styles.stepBarFill, { width: `${Math.min(100, (price / 15000000) * 100)}%` }]} />
                        </View>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setPrice(price + 500000)}>
                            <Plus size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Down Payment */}
                <View style={styles.sliderGroup}>
                    <View style={styles.paramLabelRow}>
                        <Text style={styles.paramLabel}>Down Payment</Text>
                        <Text style={styles.paramValue}>
                            {formatCurrency(downPayment)} <Text style={styles.pctSub}>({simulation.downPaymentPercentage}%)</Text>
                        </Text>
                    </View>
                    <View style={styles.stepperRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setDownPayment(Math.max(0, downPayment - 200000))}>
                            <Minus size={16} color="#94A3B8" />
                        </TouchableOpacity>
                        <View style={styles.stepBar}>
                            <View style={[styles.stepBarFill, { width: `${Math.min(100, (downPayment / Math.max(1, price)) * 100)}%` }]} />
                        </View>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setDownPayment(Math.min(price, downPayment + 200000))}>
                            <Plus size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Loan Amount (Auto-Calculated) */}
                <View style={styles.computedRow}>
                    <Text style={styles.paramLabel}>Loan Amount</Text>
                    <Text style={[styles.paramValue, { color: '#38BDF8' }]}>{formatCurrency(simulation.loanAmount)}</Text>
                </View>

                {/* Interest Rate */}
                <View style={styles.sliderGroup}>
                    <View style={styles.paramLabelRow}>
                        <Text style={styles.paramLabel}>Interest Rate</Text>
                        <Text style={styles.paramValue}>{interestRate.toFixed(1)}%</Text>
                    </View>
                    <View style={styles.stepperRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setInterestRate(Math.max(0, Math.round((interestRate - 0.1) * 10) / 10))}>
                            <Minus size={16} color="#94A3B8" />
                        </TouchableOpacity>
                        <View style={styles.stepBar}>
                            <View style={[styles.stepBarFill, { width: `${Math.min(100, (interestRate / 15) * 100)}%` }]} />
                        </View>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setInterestRate(Math.round((interestRate + 0.1) * 10) / 10)}>
                            <Plus size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tenure */}
                <View style={styles.sliderGroup}>
                    <View style={styles.paramLabelRow}>
                        <Text style={styles.paramLabel}>Tenure</Text>
                        <Text style={styles.paramValue}>{tenureYears} years</Text>
                    </View>
                    <View style={styles.stepperRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setTenureYears(Math.max(1, tenureYears - 1))}>
                            <Minus size={16} color="#94A3B8" />
                        </TouchableOpacity>
                        <View style={styles.stepBar}>
                            <View style={[styles.stepBarFill, { width: `${Math.min(100, (tenureYears / 30) * 100)}%` }]} />
                        </View>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setTenureYears(Math.min(30, tenureYears + 1))}>
                            <Plus size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Result EMI Card */}
            <View style={styles.emiCard}>
                <Text style={styles.emiLabel}>Estimated EMI</Text>
                <Text style={styles.emiAmount}>{formatCurrency(simulation.monthlyEMI)} <Text style={styles.emiPeriod}>/ month</Text></Text>
            </View>

            {/* Impact on Your Budget */}
            <View style={styles.impactCard}>
                <Text style={styles.impactTitle}>Impact on Your Budget</Text>

                <View style={styles.impactRow}>
                    <Text style={styles.impactLabel}>Current Monthly Surplus</Text>
                    <Text style={styles.impactVal}>{formatCurrency(simulation.currentMonthlySurplus)}</Text>
                </View>

                <View style={styles.impactRow}>
                    <Text style={styles.impactLabel}>New EMI</Text>
                    <Text style={[styles.impactVal, { color: '#EF4444' }]}>-{formatCurrency(simulation.monthlyEMI)}</Text>
                </View>

                <View style={[styles.impactRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.impactLabel}>
                        {simulation.monthlyShortfall > 0 ? 'Monthly Shortfall' : 'New Monthly Surplus'}
                    </Text>
                    <Text style={[styles.impactVal, { color: simulation.monthlyShortfall > 0 ? '#EF4444' : '#10B981', fontSize: 16 }]}>
                        {simulation.monthlyShortfall > 0 ? `-${formatCurrency(simulation.monthlyShortfall)}` : formatCurrency(simulation.newMonthlySurplus)}
                    </Text>
                </View>

                {/* Status Banner */}
                <View style={[styles.statusBanner, isNotComfortable ? styles.statusBannerAlert : styles.statusBannerOk]}>
                    {isNotComfortable ? (
                        <AlertTriangle size={18} color="#EF4444" />
                    ) : (
                        <CheckCircle2 size={18} color="#10B981" />
                    )}
                    <Text style={[styles.statusBannerText, { color: isNotComfortable ? '#FCA5A5' : '#A7F3D0' }]}>
                        {isNotComfortable ? 'Not comfortable — This may put pressure on your finances.' : 'Comfortable — Fits comfortably within your cash flow.'}
                    </Text>
                </View>
            </View>

            {/* Suggested Alternatives */}
            {simulation.alternatives && simulation.alternatives.length > 0 && (
                <View style={styles.alternativesCard}>
                    <Text style={styles.altTitle}>Suggested Alternatives</Text>
                    {simulation.alternatives.map((alt, i) => (
                        <View key={i} style={styles.altRow}>
                            <View style={styles.altDot} />
                            <Text style={styles.altText}>{alt}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Scenario Actions */}
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                    <RotateCcw size={16} color="#94A3B8" />
                    <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveScenario}>
                    <Bookmark size={16} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Scenario</Text>
                </TouchableOpacity>
            </View>

            {savedMessage ? <Text style={styles.savedMsgText}>{savedMessage}</Text> : null}

            {/* Saved Scenarios List */}
            {savedScenarios.length > 0 && (
                <View style={styles.savedScenariosCard}>
                    <Text style={styles.savedSectionTitle}>Saved Scenarios ({savedScenarios.length})</Text>
                    {savedScenarios.map(s => (
                        <View key={s.id} style={styles.savedRow}>
                            <Text style={styles.savedName}>{s.name}</Text>
                            <Text style={styles.savedEmi}>EMI: {formatCurrency(s.emi)}/mo</Text>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030712'
    },
    content: {
        padding: 16,
        paddingBottom: 40
    },
    header: {
        marginBottom: 16
    },
    title: {
        color: '#F8FAFC',
        fontSize: 20,
        fontWeight: '700'
    },
    subtitle: {
        color: '#94A3B8',
        fontSize: 13,
        marginTop: 4
    },
    eventPillsRow: {
        gap: 8,
        marginBottom: 18
    },
    eventPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#0F172A',
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    eventPillSelected: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6'
    },
    eventPillText: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600'
    },
    eventPillTextSelected: {
        color: '#FFFFFF'
    },
    plannerCard: {
        backgroundColor: '#0F172A',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginBottom: 14
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16
    },
    eventIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#3B82F620',
        justifyContent: 'center',
        alignItems: 'center'
    },
    plannerCardTitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700'
    },
    sliderGroup: {
        marginBottom: 14
    },
    paramLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    paramLabel: {
        color: '#94A3B8',
        fontSize: 13
    },
    paramValue: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700'
    },
    pctSub: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '400'
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    stepBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center'
    },
    stepBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#1E293B',
        borderRadius: 3,
        overflow: 'hidden'
    },
    stepBarFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 3
    },
    computedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#1E293B',
        marginBottom: 14
    },
    emiCard: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
        alignItems: 'center',
        marginBottom: 14
    },
    emiLabel: {
        color: '#94A3B8',
        fontSize: 12,
        marginBottom: 4
    },
    emiAmount: {
        color: '#10B981',
        fontSize: 24,
        fontWeight: '800'
    },
    emiPeriod: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '500'
    },
    impactCard: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginBottom: 14
    },
    impactTitle: {
        color: '#F8FAFC',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12
    },
    impactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B50'
    },
    impactLabel: {
        color: '#94A3B8',
        fontSize: 13
    },
    impactVal: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600'
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        padding: 12,
        marginTop: 14,
        gap: 8,
        borderWidth: 1
    },
    statusBannerAlert: {
        backgroundColor: '#EF444415',
        borderColor: '#EF444430'
    },
    statusBannerOk: {
        backgroundColor: '#10B98115',
        borderColor: '#10B98130'
    },
    statusBannerText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1
    },
    alternativesCard: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginBottom: 14
    },
    altTitle: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10
    },
    altRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8
    },
    altDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#F59E0B'
    },
    altText: {
        color: '#CBD5E1',
        fontSize: 12
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 14
    },
    resetBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 6
    },
    resetBtnText: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600'
    },
    saveBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 6
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    savedMsgText: {
        color: '#10B981',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 10
    },
    savedScenariosCard: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    savedSectionTitle: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8
    },
    savedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B50'
    },
    savedName: {
        color: '#CBD5E1',
        fontSize: 12
    },
    savedEmi: {
        color: '#38BDF8',
        fontSize: 12,
        fontWeight: '600'
    }
});
