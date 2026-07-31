import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Pressable, TouchableOpacity, Alert } from 'react-native';
import { CreditCard, Plus, ArrowUpRight, Sparkles, Building2, AlertTriangle, TrendingDown, Calendar, ShieldAlert, ArrowDownLeft, Calculator, CheckCircle2, Snowflake, TrendingUp, Target, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getIncome } from '../../services/api';
import { NotificationService } from '../../services/notificationService';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import StatCard from '../../components/ui/StatCard';
import CelebrationOverlay from '../../components/ui/CelebrationOverlay';
import AddLoanModal from '../../components/loans/AddLoanModal';
import EMICalculatorModal from '../../components/loans/EMICalculatorModal';
import LoanDetailModal from '../../components/loans/LoanDetailModal';
import { COLORS } from '../../constants/theme';

// Service
import { LoanService } from '../../services/loans';

export default function LoansScreen() {
    const [loans, setLoans] = useState([]);
    const [income, setIncome] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('borrowing'); // 'borrowing' | 'lending'
    const [isSnowballMode, setIsSnowballMode] = useState(false);

    // Modal States
    const [addLoanVisible, setAddLoanVisible] = useState(false);
    const [emiCalcVisible, setEmiCalcVisible] = useState(false);
    const [celebrationVisible, setCelebrationVisible] = useState(false);
    const [celebrationMessage, setCelebrationMessage] = useState('');
    const [selectedLoan, setSelectedLoan] = useState(null);

    const fetchData = async () => {
        try {
            const data = await LoanService.getLoans();
            setLoans(data);

            // Try load real income from the API wrapper or fallback to mock
            const realIncome = await getIncome();
            setIncome(realIncome || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        NotificationService.requestPermissions(); // Ensure we can send reminders
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleAddLoan = async (newLoan) => {
        const updatedLoans = await LoanService.addLoan(newLoan);
        setLoans(updatedLoans);
        setAddLoanVisible(false);

        setCelebrationMessage(newLoan.is_lending ? 'Asset Added!' : 'Loan Added!');
        setCelebrationVisible(true);
    };

    const handlePayOff = async (loanId) => {
        const updatedLoans = await LoanService.deleteLoan(loanId);
        setLoans(updatedLoans);

        setCelebrationMessage('Debt Free! 🎉');
        setCelebrationVisible(true);
    };

    const handlePayment = async (loanId, amount) => {
        const updatedLoans = await LoanService.addPayment(loanId, amount);
        setLoans(updatedLoans);

        if (selectedLoan && selectedLoan.id === loanId) {
            // Update selected loan view if open
            const updatedLoan = updatedLoans.find(l => l.id === loanId);
            setSelectedLoan(updatedLoan);
        }
    };

    const handleAccrueInterest = async () => {
        const updatedLoans = await LoanService.accrueInterest();
        setLoans(updatedLoans);
        Alert.alert('Interest Applied', 'Monthly interest has been added to all active loans/lendings.');
    };

    // Filter Loans
    const borrowingLoans = loans.filter(l => !l.is_lending);
    const lendingLoans = loans.filter(l => l.is_lending);

    let displayedLoans = activeTab === 'borrowing' ? borrowingLoans : lendingLoans;

    // Snowball Logic: Sort by Lowest Balance First
    if (activeTab === 'borrowing' && isSnowballMode) {
        displayedLoans = [...displayedLoans].sort((a, b) => parseFloat(a.outstanding_amount) - parseFloat(b.outstanding_amount));
    }
    const isLending = activeTab === 'lending';

    // Stats Calculation
    const totalOutstanding = displayedLoans.reduce((sum, loan) => sum + parseFloat(loan.outstanding_amount || 0), 0);

    // For Borrowing: Debt to Income Check
    // Use real income if available (sum of all income streams)
    const totalMonthlyIncome = Array.isArray(income)
        ? (income.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) || 1)
        : 50000; // Fallback if format differs

    const estimatedMonthlyEMI = borrowingLoans.reduce((sum, loan) => sum + (parseFloat(loan.emi_amount) || parseFloat(loan.outstanding_amount) * 0.03), 0);
    const dtiRatio = (estimatedMonthlyEMI / totalMonthlyIncome) * 100;
    const isDebtTrap = dtiRatio > 40;

    const THEME_COLOR = isLending ? COLORS.success : (isDebtTrap ? COLORS.error : COLORS.primary);


    // Debt Destroyer Logic (Simulator)
    const [extraEMI, setExtraEMI] = useState(0);
    const [newLoanEMI, setNewLoanEMI] = useState(0); // For Affordability
    const [lumpSum, setLumpSum] = useState(0); // For Foreclosure
    const avgInterestRate = 12; // Assumption for simulator
    const totalPrincipal = totalOutstanding;

    // Derived Debt Stats
    const currentMonthlyInterest = (totalPrincipal * (avgInterestRate / 100)) / 12;
    // Simple amortization approximation
    const currentMonthsToPay = totalPrincipal / ((estimatedMonthlyEMI || 1) - currentMonthlyInterest);

    const newMonthlyPayment = (estimatedMonthlyEMI || 0) + extraEMI;
    const newMonthsToPay = totalPrincipal / (newMonthlyPayment - currentMonthlyInterest);

    const monthsSaved = Math.max(0, currentMonthsToPay - newMonthsToPay);
    const interestSaved = (currentMonthsToPay * estimatedMonthlyEMI) - (newMonthsToPay * newMonthlyPayment);

    // Lending Recovery AI Logic
    const getRecoveryStatus = (loan) => {
        // Simulating "AI" based on random or ID for demo purposes (since we lack full historical data)
        const score = (loan.id * 17) % 100;
        if (score > 80) return { label: 'High Risk', color: '#EF4444', icon: 'AlertTriangle' };
        if (score > 40) return { label: 'Medium Risk', color: '#F59E0B', icon: 'HelpCircle' };
        return { label: 'Likely to Return', color: '#10B981', icon: 'CheckCircle2' };
    };

    // Phase 10: Strategic Foresight Logic
    // 1. Affordability
    const projectedTotalEMI = estimatedMonthlyEMI + newLoanEMI;
    const projectedDTI = (projectedTotalEMI / totalMonthlyIncome) * 100;
    const isProjectedRisky = projectedDTI > 40;

    // 2. Foreclosure vs Invest
    // Interest saved by paying lumpSum now
    const principalAfterLumpSum = Math.max(0, totalPrincipal - lumpSum);
    const monthsToPayWithLumpSum = principalAfterLumpSum / ((estimatedMonthlyEMI || 1) - currentMonthlyInterest);
    const totalPayableWithLumpSum = monthsToPayWithLumpSum * estimatedMonthlyEMI;
    const currentTotalPayable = currentMonthsToPay * estimatedMonthlyEMI;
    const foreclosureInterestSaved = currentTotalPayable - totalPayableWithLumpSum;

    // Investment returns (12% CAGR) over the same period
    const investmentYears = currentMonthsToPay / 12;
    const investmentFutureValue = lumpSum * Math.pow(1.12, investmentYears);
    const investmentGains = investmentFutureValue - lumpSum;

    const bestStrategy = foreclosureInterestSaved > investmentGains ? 'PREPAY DEBT' : 'INVEST IT';
    const strategyColor = bestStrategy === 'PREPAY DEBT' ? '#EF4444' : '#10B981'; // Red/Orange for debt focus (aggressive), Green for invest

    return (
        <AnimatedScreen style={styles.container}>
            {/* ... Modals (Celebration, AddLoan, EMI) ... */}
            <CelebrationOverlay
                visible={celebrationVisible}
                message={celebrationMessage}
                onClose={() => setCelebrationVisible(false)}
            />

            <AddLoanModal
                visible={addLoanVisible}
                onClose={() => setAddLoanVisible(false)}
                onSave={handleAddLoan}
            />

            <EMICalculatorModal
                visible={emiCalcVisible}
                onClose={() => setEmiCalcVisible(false)}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME_COLOR} colors={[THEME_COLOR]} progressBackgroundColor="#18181B" />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* ... Header & Tabs ... */}
                <StackHeader
                    title={isLending ? 'Money Lent' : 'Loans Taken'}
                    subtitle={isLending ? 'Assets' : 'Liabilities'}
                >
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {/* Simulate Interest Accrual */}
                        <TouchableOpacity style={styles.calcButton} onPress={handleAccrueInterest}>
                            <RefreshCw size={24} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.calcButton} onPress={() => setEmiCalcVisible(true)}>
                            <Calculator size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </StackHeader>

                <View style={styles.tabContainer}>
                    <Pressable
                        style={[styles.tab, activeTab === 'borrowing' && styles.activeTab, { borderColor: activeTab === 'borrowing' ? COLORS.primary : 'transparent' }]}
                        onPress={() => setActiveTab('borrowing')}
                    >
                        <Text style={[styles.tabText, activeTab === 'borrowing' && { color: COLORS.primary }]}>Borrowing</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.tab, activeTab === 'lending' && styles.activeTab, { borderColor: activeTab === 'lending' ? COLORS.success : 'transparent' }]}
                        onPress={() => setActiveTab('lending')}
                    >
                        <Text style={[styles.tabText, activeTab === 'lending' && { color: COLORS.success }]}>Lending</Text>
                    </Pressable>
                </View>

                {/* Hero Card */}
                <View style={styles.heroCardWrapper}>
                    <View style={[styles.heroCard, { borderColor: THEME_COLOR + '40' }]}>
                        <LinearGradient
                            colors={[`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>{isLending ? 'Total Money Owed to You' : 'Total Debt'}</Text>
                            <Text style={styles.heroAmount}>₹{totalOutstanding.toLocaleString('en-IN')}</Text>
                            <View style={styles.heroFooter}>
                                <View style={[styles.heroIconBadge, { backgroundColor: THEME_COLOR }]}>
                                    {isLending ? <TrendingDown size={14} color="#FFF" /> : <CreditCard size={14} color="#FFF" />}
                                </View>
                                <Text style={styles.heroSubtext}>
                                    {isLending ? 'Collecting Interest' : (isDebtTrap ? '⚠️ High Debt Risk' : 'Manageable Levels')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Debt Destroyer Simulator (Borrowing Only) */}
                {!isLending && totalOutstanding > 0 && (
                    <LuxuryCard style={styles.simulatorCard}>
                        <View style={styles.simHeader}>
                            <View style={[styles.iconBox, { backgroundColor: '#EF444420' }]}>
                                <Sparkles size={20} color="#EF4444" />
                            </View>
                            <View>
                                <Text style={styles.simTitle}>Debt Destroyer Engine</Text>
                                <Text style={styles.simSubtitle}>Blast your debt away faster 🚀</Text>
                            </View>
                        </View>

                        <View style={styles.sliderSection}>
                            <Text style={styles.sliderLabel}>Add Extra Monthly EMI: <Text style={{ color: '#10B981' }}>₹{extraEMI.toLocaleString()}</Text></Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                                {[0, 1000, 2000, 5000, 10000, 20000].map((val) => (
                                    <TouchableOpacity
                                        key={val}
                                        onPress={() => setExtraEMI(val)}
                                        style={[styles.chip, extraEMI === val && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                                    >
                                        <Text style={[styles.chipText, extraEMI === val && { color: '#FFF' }]}>
                                            {val === 0 ? 'None' : `+₹${val / 1000}k`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {extraEMI > 0 && (
                            <View style={styles.simResults}>
                                <View style={styles.simResultItem}>
                                    <View style={styles.simIconBg}><Calendar size={16} color="#3B82F6" /></View>
                                    <View>
                                        <Text style={styles.simResultLabel}>Freedom Date</Text>
                                        <Text style={[styles.simResultValue, { color: '#3B82F6' }]}>-{Math.ceil(monthsSaved)} Months</Text>
                                    </View>
                                </View>
                                <View style={styles.verticalDivider} />
                                <View style={styles.simResultItem}>
                                    <View style={[styles.simIconBg, { backgroundColor: '#10B98120' }]}><TrendingDown size={16} color="#10B981" /></View>
                                    <View>
                                        <Text style={styles.simResultLabel}>Interest Saved</Text>
                                        <Text style={[styles.simResultValue, { color: '#10B981' }]}>₹{Math.max(0, Math.round(interestSaved)).toLocaleString()}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </LuxuryCard>
                )}


                {/* Phase 10: Strategic Foresight (Borrowing Only) */}
                {!isLending && totalOutstanding > 0 && (
                    <View>
                        {/* 1. Affordability Simulator */}
                        <LuxuryCard style={styles.simulatorCard}>
                            <View style={styles.simHeader}>
                                <View style={[styles.iconBox, { backgroundColor: '#8B5CF620' }]}>
                                    <Target size={20} color="#8B5CF6" />
                                </View>
                                <View>
                                    <Text style={styles.simTitle}>Future Loan Capacity 🔮</Text>
                                    <Text style={styles.simSubtitle}>Can you afford a new Car/Home loan?</Text>
                                </View>
                            </View>

                            <View style={styles.sliderSection}>
                                <Text style={styles.sliderLabel}>New Loan EMI: <Text style={{ color: '#8B5CF6' }}>₹{newLoanEMI.toLocaleString()}</Text></Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                                    {[0, 5000, 10000, 20000, 30000, 50000].map((val) => (
                                        <TouchableOpacity
                                            key={val}
                                            onPress={() => setNewLoanEMI(val)}
                                            style={[styles.chip, newLoanEMI === val && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}
                                        >
                                            <Text style={[styles.chipText, newLoanEMI === val && { color: '#FFF' }]}>
                                                {val === 0 ? 'None' : `₹${val / 1000}k`}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {newLoanEMI > 0 && (
                                <View style={{ marginTop: 12 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 13 }}>Projected DTI Ratio</Text>
                                        <Text style={{ color: isProjectedRisky ? '#EF4444' : '#10B981', fontWeight: '700' }}>
                                            {projectedDTI.toFixed(1)}% {isProjectedRisky ? '(Risky)' : '(Safe)'}
                                        </Text>
                                    </View>
                                    {/* DTI Bar */}
                                    <View style={{ height: 8, backgroundColor: '#27272A', borderRadius: 4, overflow: 'hidden', flexDirection: 'row' }}>
                                        <View style={{ flex: dtiRatio / 100, backgroundColor: '#71717A' }} />
                                        <View style={{ flex: (projectedDTI - dtiRatio) / 100, backgroundColor: isProjectedRisky ? '#EF4444' : '#10B981' }} />
                                    </View>
                                    {isProjectedRisky && (
                                        <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>⚠️ This new loan might push you into a debt trap (&gt;40% income).</Text>
                                    )}
                                </View>
                            )}
                        </LuxuryCard>

                        {/* 2. Foreclosure Strategist */}
                        <LuxuryCard style={styles.simulatorCard}>
                            <View style={styles.simHeader}>
                                <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
                                    <TrendingUp size={20} color="#F59E0B" />
                                </View>
                                <View>
                                    <Text style={styles.simTitle}>Windfall Strategist 💰</Text>
                                    <Text style={styles.simSubtitle}>Got a bonus? Invest or Prepay?</Text>
                                </View>
                            </View>

                            <View style={styles.sliderSection}>
                                <Text style={styles.sliderLabel}>Lump Sum Amount: <Text style={{ color: '#F59E0B' }}>₹{lumpSum.toLocaleString()}</Text></Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                                    {[0, 20000, 50000, 100000, 200000, 500000].map((val) => (
                                        <TouchableOpacity
                                            key={val}
                                            onPress={() => setLumpSum(val)}
                                            style={[styles.chip, lumpSum === val && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }]}
                                        >
                                            <Text style={[styles.chipText, lumpSum === val && { color: '#FFF' }]}>
                                                {val === 0 ? 'None' : `₹${val / 1000}k`}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {lumpSum > 0 && (
                                <View style={styles.simResults}>
                                    <View style={styles.simResultItem}>
                                        <View style={[styles.simIconBg, { backgroundColor: '#EF444420' }]}><ArrowDownLeft size={16} color="#EF4444" /></View>
                                        <View>
                                            <Text style={styles.simResultLabel}>Save Interest</Text>
                                            <Text style={[styles.simResultValue, { color: '#EF4444' }]}>₹{Math.round(foreclosureInterestSaved).toLocaleString()}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.verticalDivider} />
                                    <View style={styles.simResultItem}>
                                        <View style={[styles.simIconBg, { backgroundColor: '#10B98120' }]}><TrendingUp size={16} color="#10B981" /></View>
                                        <View>
                                            <Text style={styles.simResultLabel}>Invest Returns</Text>
                                            <Text style={[styles.simResultValue, { color: '#10B981' }]}>₹{Math.round(investmentGains).toLocaleString()}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {lumpSum > 0 && (
                                <View style={{ marginTop: 16, backgroundColor: strategyColor + '20', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: strategyColor + '40' }}>
                                    <Text style={{ color: strategyColor, fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        RECOMMENDATION: {bestStrategy}
                                    </Text>
                                </View>
                            )}
                        </LuxuryCard>
                    </View>
                )}
                {!isLending && (
                    <View style={styles.section}>
                        {isDebtTrap ? (
                            <LuxuryCard style={styles.warningCard} index={0}>
                                <View style={styles.warningHeader}>
                                    <AlertTriangle size={24} color="#EF4444" strokeWidth={2.5} />
                                    <Text style={styles.warningTitle}>Debt Trap Warning</Text>
                                </View>
                                <Text style={styles.warningText}>
                                    Your Debt-to-Income ratio is {dtiRatio.toFixed(1)}% (Healthy is &lt;40%).
                                    You are spending too much of your income on EMIs.
                                </Text>
                            </LuxuryCard>
                        ) : null}
                    </View>
                )}

                <View style={[styles.section, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{isLending ? 'Active Lendings' : 'Active Loans'}</Text>

                    {!isLending && (displayedLoans.length > 0) && (
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isSnowballMode ? '#3B82F620' : '#27272A', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: isSnowballMode ? '#3B82F6' : '#FFFFFF10' }}
                            onPress={() => setIsSnowballMode(!isSnowballMode)}
                        >
                            <Snowflake size={14} color={isSnowballMode ? '#3B82F6' : '#A1A1AA'} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: isSnowballMode ? '#3B82F6' : '#A1A1AA' }}> Snowball Strategy</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.section}>

                    {displayedLoans.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <Sparkles size={32} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyText}>{isLending ? 'No active lendings' : 'No active loans'}</Text>
                            <Text style={styles.emptySubtext}>{isLending ? 'You haven\'t lent money to anyone' : 'You are currently debt-free'}</Text>
                        </View>
                    ) : (
                        displayedLoans.map((loan, index) => (
                            <LuxuryCard
                                key={index}
                                index={index}
                                style={styles.loanCard}
                                onPress={() => setSelectedLoan(loan)}
                            >
                                <LinearGradient
                                    colors={[`${THEME_COLOR}10`, '#00000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.cardGlow}
                                />
                                <View style={[styles.cardIcon, { backgroundColor: THEME_COLOR + '10', borderColor: THEME_COLOR + '20' }]}>
                                    <Building2 size={24} color={THEME_COLOR} strokeWidth={2.5} />
                                </View>
                                <View style={styles.cardContent}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={styles.loanName}>{loan.provider || loan.name}</Text>
                                        {isLending && (
                                            <View style={{ backgroundColor: getRecoveryStatus(loan).color + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                                <Text style={{ fontSize: 10, color: getRecoveryStatus(loan).color, fontWeight: '700' }}>{getRecoveryStatus(loan).label}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.loanMeta}>
                                        <Text style={styles.loanType}>{loan.type || 'Personal'}</Text>
                                        <Text style={styles.dot}>•</Text>
                                        <Text style={[styles.interestRate, { color: THEME_COLOR }]}>{loan.interest_rate}% p.a.</Text>
                                    </View>
                                </View>
                                <View style={styles.cardRight}>
                                    <Text style={styles.amount}>₹{parseFloat(loan.outstanding_amount).toLocaleString('en-IN')}</Text>

                                    {/* Pay Off Button (Only visible if not lending, or can be 'Collect' if lending) */}
                                    <TouchableOpacity style={styles.payOffBtn} onPress={() => handlePayOff(loan.id)}>
                                        <CheckCircle2 size={16} color={THEME_COLOR} />
                                        <Text style={[styles.payOffText, { color: THEME_COLOR }]}>{isLending ? 'Collected' : 'Pay Off'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </LuxuryCard>
                        ))
                    )}
                </View>

                {/* Add Button */}
                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => setAddLoanVisible(true)}
                    index={displayedLoans.length + 1}
                >
                    <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                    <Text style={styles.addButtonText}>{isLending ? 'Add Lending Record' : 'Add Liability'}</Text>
                </LuxuryCard>

                {/* Detail Modal */}
                <LoanDetailModal
                    visible={!!selectedLoan}
                    loan={selectedLoan}
                    onClose={() => setSelectedLoan(null)}
                    onPayment={handlePayment} // Pass payment handler
                />
            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    calcButton: { padding: 12, backgroundColor: '#27272A', borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF10' },

    tabContainer: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 24, backgroundColor: '#18181B', borderRadius: 16, padding: 4, borderWidth: 1, borderColor: '#FFFFFF10' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
    activeTab: { backgroundColor: '#FFFFFF10' },
    tabText: { color: '#71717A', fontWeight: '700', fontSize: 14 },

    heroCardWrapper: { marginHorizontal: 24, marginBottom: 40 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },

    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },

    loanCard: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 140, opacity: 1 },
    cardIcon: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1 },
    cardContent: { flex: 1 },
    loanName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.3 },
    loanMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    loanType: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    dot: { fontSize: 12, color: '#3F3F46' },
    interestRate: { fontSize: 13, fontWeight: '600' },

    cardRight: { alignItems: 'flex-end', gap: 8 },
    amount: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    payOffBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF05', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FFFFFF10' },
    payOffText: { fontSize: 10, fontWeight: '700' },

    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF05', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#FFFFFF10' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },

    warningCard: { backgroundColor: '#EF444410', borderColor: '#EF444440', padding: 20, borderRadius: 24, marginBottom: 8 },
    warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    warningTitle: { fontSize: 18, fontWeight: '800', color: '#EF4444' },
    warningText: { fontSize: 14, color: '#FFFFFF80', lineHeight: 20, marginBottom: 16 },
    actionRow: { flexDirection: 'row', gap: 12 },
    warningButton: { backgroundColor: '#EF4444', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
    warningButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
    warningButtonOutline: { borderWidth: 1, borderColor: '#EF4444', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
    warningButtonOutlineText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },

    safeCard: { backgroundColor: '#10B98110', borderColor: '#10B98140', padding: 20, borderRadius: 24, marginBottom: 8 },
    safeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    safeTitle: { fontSize: 18, fontWeight: '800', color: '#10B981' },
    safeText: { fontSize: 14, color: '#FFFFFF80', lineHeight: 20 },

    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#FFFFFF10' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },

    // Simulator Styles
    simulatorCard: { backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#3B82F640' },
    simHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    simTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    simSubtitle: { fontSize: 13, color: '#A1A1AA' },
    sliderSection: { marginBottom: 20 },
    sliderLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 12, fontWeight: '600' },
    chipRow: { flexDirection: 'row', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#FFFFFF10' },
    chipText: { fontSize: 12, fontWeight: '600', color: '#A1A1AA' },
    simResults: { flexDirection: 'row', backgroundColor: '#000', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'space-between' },
    simResultItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    simIconBg: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center' },
    simResultLabel: { fontSize: 11, color: '#71717A', fontWeight: '700', textTransform: 'uppercase' },
    simResultValue: { fontSize: 15, fontWeight: '800' },
    verticalDivider: { width: 1, height: 24, backgroundColor: '#3F3F46' },
});
