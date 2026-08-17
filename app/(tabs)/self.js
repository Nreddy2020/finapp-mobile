import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Dimensions, TouchableOpacity, Modal, Linking, Image, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Wallet, TrendingUp, Calendar, AlertTriangle, ShieldCheck, Plus, CheckSquare, Square, Trash2, Landmark, RefreshCw, Layers, CheckCircle, Menu, X, Activity, Edit2, Users, Leaf, Sun, CloudRain, Zap, Target, ArrowUpRight, ArrowDownLeft, Calculator, Bell, Building2, GraduationCap, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDrawer } from './_layout';
import { useGlobalFinance } from '../../components/context/GlobalFinanceContext';
import { evaluatePortfolioHealthScore } from '../../services/portfolioHealthScoreEngine';
import { aggregateFinancialOpportunities } from '../../services/financialOpportunityAggregator';
import { prioritizeNextBestActions } from '../../services/actionPrioritizationEngine';
import MoneyFlowView from '../../components/moneyflow/MoneyFlowView';
const { width } = Dimensions.get('window');

const AGENTS_20 = [
    { id: 1, name: 'Property Profile', icon: '🏢' },
    { id: 2, name: 'Legal & Title', icon: '⚖️' },
    { id: 3, name: 'Financial & ROI', icon: '💰' },
    { id: 4, name: 'Market Intel', icon: '📈' },
    { id: 5, name: 'Maintenance Hub', icon: '🛠️' },
    { id: 6, name: 'Rental & Yield', icon: '🔑' },
    { id: 7, name: 'Insurance & Risk', icon: '🛡️' },
    { id: 8, name: 'Document Vault', icon: '📄' },
    { id: 9, name: 'Tax & Compliance', icon: '🏛️' },
    { id: 10, name: 'Govt Records', icon: '🏛️' },
    { id: 11, name: 'Legacy & Estate', icon: '📜' },
    { id: 12, name: 'Predictive Analytics', icon: '🔮' },
    { id: 13, name: 'Smart Alerts', icon: '🔔' },
    { id: 14, name: 'Advisor & Tips', icon: '💡' },
    { id: 15, name: 'Dispute Mgmt', icon: '⚖️' },
    { id: 16, name: 'Portfolio Impact', icon: '📊' },
    { id: 17, name: 'Goal Planning', icon: '🎯' },
    { id: 18, name: 'Growth Engine', icon: '🚀' },
    { id: 19, name: 'Sustainability', icon: '🌱' },
    { id: 20, name: 'Automation', icon: '🤖' }
];

const InlineLoanForm = ({ bank, onSave, allowCustomBank, onCancel }) => {
    const [inlineLoanType, setInlineLoanType] = useState('Personal');
    const [inlineLoanName, setInlineLoanName] = useState('');
    const [inlineLoanPrincipal, setInlineLoanPrincipal] = useState('');
    const [inlineLoanRate, setInlineLoanRate] = useState('');
    const [inlineLoanEmi, setInlineLoanEmi] = useState('');
    const [inlineLoanTenure, setInlineLoanTenure] = useState('120');
    const [inlineLoanMoratorium, setInlineLoanMoratorium] = useState('0');
    const [inlineLoanStartDate, setInlineLoanStartDate] = useState('2026-07-01');
    const [inlineLoanBank, setInlineLoanBank] = useState(bank || '');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleSave = () => {
        if (!inlineLoanName || !inlineLoanPrincipal || !inlineLoanEmi || !inlineLoanRate || !inlineLoanTenure) {
            Alert.alert("Error", "Please fill all required fields.");
            return;
        }
        if (allowCustomBank && !inlineLoanBank.trim()) {
            Alert.alert("Error", "Please enter a Lender / Bank Name.");
            return;
        }
        onSave({
            name: inlineLoanName,
            type: inlineLoanType,
            principal: parseFloat(inlineLoanPrincipal),
            interestRate: parseFloat(inlineLoanRate),
            emi: parseFloat(inlineLoanEmi),
            tenureMonths: parseInt(inlineLoanTenure),
            moratoriumMonths: inlineLoanType === 'Education' ? (parseInt(inlineLoanMoratorium) || 0) : 0,
            startDate: inlineLoanStartDate || new Date().toISOString().split('T')[0]
        }, allowCustomBank ? inlineLoanBank : bank);
    };

    return (
        <View style={{ backgroundColor: '#18181B', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#3F3F46' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>{allowCustomBank ? 'Add Custom Loan' : `Add Loan to ${bank}`}</Text>
                {onCancel && (
                    <TouchableOpacity onPress={onCancel} style={{ padding: 4 }}>
                        <X size={16} color="#A1A1AA" />
                    </TouchableOpacity>
                )}
            </View>
            {allowCustomBank && (
                <View style={{ marginBottom: 10 }}>
                    <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4, fontWeight: '600' }}>Lender / Bank Name</Text>
                    <TextInput placeholder="e.g. Muthoot Finance" placeholderTextColor="#71717A" style={{ backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }} value={inlineLoanBank} onChangeText={setInlineLoanBank} />
                </View>
            )}

            <View style={{ marginBottom: 10 }}>
                <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4, fontWeight: '600' }}>Loan Title</Text>
                <TextInput placeholder="e.g. Car Loan" placeholderTextColor="#71717A" style={{ backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }} value={inlineLoanName} onChangeText={setInlineLoanName} />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4, fontWeight: '600' }}>Principal Amount (₹)</Text>
                    <TextInput placeholder="e.g. 500000" placeholderTextColor="#71717A" style={{ backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }} value={inlineLoanPrincipal} onChangeText={setInlineLoanPrincipal} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4, fontWeight: '600' }}>Monthly EMI (₹)</Text>
                    <TextInput placeholder="e.g. 15000" placeholderTextColor="#71717A" style={{ backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }} value={inlineLoanEmi} onChangeText={setInlineLoanEmi} keyboardType="numeric" />
                </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4, fontWeight: '600' }}>Interest Rate (%)</Text>
                    <TextInput placeholder="e.g. 10.5" placeholderTextColor="#71717A" style={{ backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }} value={inlineLoanRate} onChangeText={setInlineLoanRate} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4, fontWeight: '600' }}>No. of EMIs / Tenure</Text>
                    <TextInput placeholder="e.g. 120" placeholderTextColor="#71717A" style={{ backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }} value={inlineLoanTenure} onChangeText={setInlineLoanTenure} keyboardType="numeric" />
                </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4, fontWeight: '600' }}>Loan Starting Date</Text>
                    <Pressable onPress={() => setShowDatePicker(true)} style={{ backgroundColor: '#18181B', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: inlineLoanStartDate ? '#FFF' : '#71717A', fontSize: 13 }}>{inlineLoanStartDate || 'Select Date'}</Text>
                        <Calendar size={14} color="#71717A" />
                    </Pressable>
                    {showDatePicker && (
                        <DateTimePicker
                            value={inlineLoanStartDate ? new Date(inlineLoanStartDate) : new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) {
                                    setInlineLoanStartDate(selectedDate.toISOString().split('T')[0]);
                                }
                            }}
                        />
                    )}
                </View>
                {inlineLoanType === 'Education' && (
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4, fontWeight: '600' }}>Moratorium (Months)</Text>
                        <TextInput placeholder="e.g. 12" placeholderTextColor="#71717A" style={{ backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }} value={inlineLoanMoratorium} onChangeText={setInlineLoanMoratorium} keyboardType="numeric" />
                    </View>
                )}
            </View>

            <Pressable onPress={handleSave} style={{ backgroundColor: '#10B981', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ color: '#000', fontSize: 13, fontWeight: '800' }}>Save Loan</Text>
            </Pressable>
        </View>
    );
};

export default function SelfScreen() {
    const router = useRouter();
    const { tab } = useLocalSearchParams();

    const { setIsDrawerOpen } = useDrawer();
    const [activeTab, setActiveTab] = useState(tab || 'flow');
    const [activeSubTab, setActiveSubTab] = useState('renewals');

    useEffect(() => {
        if (tab) {
            if (tab === 'sms') {
                setActiveTab('banking');
            } else {
                setActiveTab(tab);
            }
        }
    }, [tab]);

    const { formatAmount } = useGlobalFinance();

    // Stage AX.1 Personal CFO Decision Intelligence Stream
    const [cfoHealthScore, setCfoHealthScore] = useState(null);
    const [cfoHealthGrade, setCfoHealthGrade] = useState('B');
    const [cfoTopAction, setCfoTopAction] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const loadCFOIntelligence = async () => {
            try {
                const asOfDate = new Date().toISOString();
                const healthRes = evaluatePortfolioHealthScore({}, asOfDate);
                const oppsRes = aggregateFinancialOpportunities({ portfolioHealthDTO: healthRes }, asOfDate);
                const nbaRes = prioritizeNextBestActions(oppsRes, asOfDate);
                if (isMounted) {
                    if (healthRes?.totalHealthScore !== undefined) {
                        setCfoHealthScore(healthRes.totalHealthScore.toFixed(1));
                        setCfoHealthGrade(healthRes.healthGrade || 'B');
                    }
                    if (nbaRes?.rankedActions?.[0]) {
                        setCfoTopAction(nbaRes.rankedActions[0]);
                    }
                }
            } catch (e) {
                // Non-blocking graceful fallback
            }
        };
        loadCFOIntelligence();
        return () => { isMounted = false; };
    }, [activeTab]);

    // --- Sub-Hub State Hooks for Financial Hub ---
    const [activeHubTab, setActiveHubTab] = useState('dashboard'); // 'dashboard' | 'loans' | 'split'
    const [loansTab, setLoansTab] = useState('given'); // 'taken' | 'given' | 'settled'
    const [selectedContactId, setSelectedContactId] = useState(null); // string contact name
    const [contactTab, setContactTab] = useState('pending'); // 'pending' | 'history'
    const [selectedSubLoanId, setSelectedSubLoanId] = useState(null); // string sub-loan id
    const [subLoanTab, setSubLoanTab] = useState('summary'); // 'summary' | 'transactions' | 'topups'

    // --- P2P Loans Module State Hooks ---
    const [activeP2PView, setActiveP2PView] = useState('dashboard'); // 'dashboard' | 'loans_list' | 'entity' | 'interest_ledger'
    const [p2pCategoryTab, setP2pCategoryTab] = useState('TAKEN'); // 'TAKEN' | 'GIVEN' | 'SETTLED'
    const [entitySubTab, setEntitySubTab] = useState('Pending'); // 'Pending' | 'History'
    const [entityDetailTab, setEntityDetailTab] = useState('Summary'); // 'Summary' | 'Transactions'
    const [p2pSearchQuery, setP2pSearchQuery] = useState('');

    // Interactive Calculator & Add Loan State
    const [showCalculator, setShowCalculator] = useState(false);
    const [calcActiveTab, setCalcActiveTab] = useState('inputs'); // 'inputs' | 'amortization'
    const [calculatorInput, setCalculatorInput] = useState('');
    const [calculatorResult, setCalculatorResult] = useState('');

    const handleCalcPress = (btn) => {
        if (btn === 'C') {
            setCalculatorInput('');
            setCalculatorResult('');
        } else if (btn === '⌫') {
            setCalculatorInput(prev => (prev ? prev.slice(0, -1) : ''));
        } else if (btn === '=') {
            try {
                const sanitized = calculatorInput
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/')
                    .replace(/[^0-9+\-*/.]/g, '');
                if (!sanitized) return;
                const res = Function(`'use strict'; return (${sanitized})`)();
                if (Number.isFinite(res)) {
                    setCalculatorResult(String(Number(res.toFixed(2))));
                }
            } catch (e) {
                setCalculatorResult('Error');
            }
        } else {
            setCalculatorInput(prev => (prev || '') + btn);
        }
    };
    
    // P2P Pre-Checking Loan Calculator Inputs
    const [calcPrincipal, setCalcPrincipal] = useState('100000');
    const [calcInterestRate, setCalcInterestRate] = useState('12');
    const [calcTermValue, setCalcTermValue] = useState('12');
    const [calcTermUnit, setCalcTermUnit] = useState('Months'); // 'Months' | 'Years'
    const [calcFrequency, setCalcFrequency] = useState('Monthly'); // 'Monthly' | 'Bi-weekly' | 'Weekly' | 'Bullet'
    const [calcPlatformFeePct, setCalcPlatformFeePct] = useState('2');
    const [calcDefaultRatePct, setCalcDefaultRatePct] = useState('3');
    const [calcRiskGrade, setCalcRiskGrade] = useState('B'); // 'A' | 'B' | 'C' | 'Custom'

    const handleApplyRiskGrade = (grade) => {
        setCalcRiskGrade(grade);
        if (grade === 'A') {
            setCalcInterestRate('8.5');
            setCalcDefaultRatePct('1.0');
        } else if (grade === 'B') {
            setCalcInterestRate('13.5');
            setCalcDefaultRatePct('3.5');
        } else if (grade === 'C') {
            setCalcInterestRate('21.0');
            setCalcDefaultRatePct('8.0');
        }
    };

    // Calculate Comprehensive P2P Loan Metrics
    const computeP2PLoanMetrics = () => {
        const P = Math.max(0, parseFloat(calcPrincipal) || 0);
        const annualRate = Math.max(0, parseFloat(calcInterestRate) || 0) / 100;
        const termVal = Math.max(1, parseFloat(calcTermValue) || 1);
        const feePct = Math.max(0, parseFloat(calcPlatformFeePct) || 0) / 100;
        const defaultRate = Math.max(0, parseFloat(calcDefaultRatePct) || 0) / 100;

        let ppy = 12; // payments per year
        if (calcFrequency === 'Bi-weekly') ppy = 26;
        else if (calcFrequency === 'Weekly') ppy = 52;
        else if (calcFrequency === 'Bullet') ppy = 1;

        const totalMonths = calcTermUnit === 'Years' ? termVal * 12 : termVal;
        const n = calcFrequency === 'Bullet' ? 1 : Math.max(1, Math.round((totalMonths / 12) * ppy));

        const r = ppy > 0 ? annualRate / ppy : annualRate;

        let periodicInstallment = 0;
        let totalRepayment = 0;
        let totalInterest = 0;

        if (calcFrequency === 'Bullet') {
            // Lump-sum repayment at end with simple/compound interest for duration
            const durationYears = totalMonths / 12;
            totalInterest = P * annualRate * durationYears;
            totalRepayment = P + totalInterest;
            periodicInstallment = totalRepayment;
        } else {
            if (r > 0) {
                periodicInstallment = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            } else {
                periodicInstallment = P / n;
            }
            totalRepayment = periodicInstallment * n;
            totalInterest = Math.max(0, totalRepayment - P);
        }

        const platformFeeAmount = P * feePct;
        const netHandAmount = Math.max(0, P - platformFeeAmount);
        
        // Net Annualized Yield & Risk-Adjusted Return
        const rawYieldPct = P > 0 ? ((totalInterest - platformFeeAmount) / P) / (totalMonths / 12) * 100 : 0;
        const riskAdjustedYieldPct = rawYieldPct - (defaultRate * 100);

        // Generate Amortization Schedule
        const amortizationSchedule = [];
        let balance = P;
        
        for (let i = 1; i <= n; i++) {
            let interestPaid = 0;
            let principalPaid = 0;
            let feePaid = 0;
            let pmtAmount = 0;

            if (calcFrequency === 'Bullet') {
                interestPaid = totalInterest;
                principalPaid = P;
                feePaid = platformFeeAmount;
                pmtAmount = totalRepayment;
                balance = 0;
            } else {
                interestPaid = balance * r;
                pmtAmount = periodicInstallment;
                principalPaid = pmtAmount - interestPaid;
                feePaid = (platformFeeAmount / n);
                balance = Math.max(0, balance - principalPaid);
            }

            amortizationSchedule.push({
                num: i,
                payment: pmtAmount,
                principal: principalPaid,
                interest: interestPaid,
                fee: feePaid,
                balance: balance
            });
        }

        return {
            P,
            annualRate,
            termMonths: totalMonths,
            periodicInstallment,
            totalInterest,
            totalRepayment,
            platformFeeAmount,
            netHandAmount,
            rawYieldPct,
            riskAdjustedYieldPct,
            amortizationSchedule
        };
    };

    const loanMetrics = computeP2PLoanMetrics();


    // Add Loan Modal & Wizard State
    const [showAddLoanModal, setShowAddLoanModal] = useState(false);
    const [loanWizardTab, setLoanWizardTab] = useState('Loan'); // 'Loan' | 'Interest' | 'Details' | 'Repayment' | 'Review'
    const [newLoanType, setNewLoanType] = useState('GIVEN'); // 'GIVEN' | 'TAKEN'
    const [newLoanName, setNewLoanName] = useState('');
    const [newLoanAmount, setNewLoanAmount] = useState('50000');
    const [newLoanNumber, setNewLoanNumber] = useState(`Loan-${Math.floor(100 + Math.random() * 900)}`);
    const [newLoanGivenDate, setNewLoanGivenDate] = useState('2026-07-31');
    const [newLoanTags, setNewLoanTags] = useState([]);
    const [newLoanAssignTo, setNewLoanAssignTo] = useState('nagarjuna reddy(You)');

    // Interest Tab state
    const [addInterestEnabled, setAddInterestEnabled] = useState(true);
    const [interestMode, setInterestMode] = useState('Rate'); // 'Rate' | 'Amount'
    const [newLoanInterestRate, setNewLoanInterestRate] = useState('9.99');
    const [newLoanInterestInterval, setNewLoanInterestInterval] = useState('per Year'); 
    const [showIntervalDropdown, setShowIntervalDropdown] = useState(false);
    const [isCompounding, setIsCompounding] = useState(false);
    const [isFlatRate, setIsFlatRate] = useState(false);

    // Details Tab state
    const [newLoanDeductionsEnabled, setNewLoanDeductionsEnabled] = useState(false);
    const [newLoanProcessingFee, setNewLoanProcessingFee] = useState('0');
    const [newLoanInsuranceCharges, setNewLoanInsuranceCharges] = useState('0');
    const [newLoanDocumentCharges, setNewLoanDocumentCharges] = useState('0');
    const [newLoanNote, setNewLoanNote] = useState('');
    const [newLoanAttachment, setNewLoanAttachment] = useState(null);
    const [newLoanCollateral, setNewLoanCollateral] = useState('');

    // Repayment Tab state
    const [collectInterestOnly, setCollectInterestOnly] = useState(false);
    const [penaltyForOverdue, setPenaltyForOverdue] = useState('0');
    const [repaymentPlanType, setRepaymentPlanType] = useState('Repayment Plan'); // 'Repayment Plan' | 'One Time Payment'
    const [paymentTenureType, setPaymentTenureType] = useState('Fixed Tenure'); // 'Fixed Payment' | 'Fixed Tenure'
    const [noOfInstallments, setNoOfInstallments] = useState('30');
    const [newLoanRepaymentFrequency, setNewLoanRepaymentFrequency] = useState('Monthly');
    const [firstPaymentDate, setFirstPaymentDate] = useState('2026-08-31');

    // Dynamic loansList state fully mirroring screenshots
    const [loansList, setLoansList] = useState([
        {
            id: 'c-1',
            name: 'ICICI Personal Loan',
            type: 'taken',
            subLoans: [
                {
                    id: 'Loan-110',
                    disbursedDate: '2026-04-06',
                    durationMonths: 3,
                    principal: 2500000,
                    rate: 9.99,
                    interestType: 'SIMPLE',
                    cycle: 'YEARLY',
                    collateral: 'None',
                    description: 'For raja school fees',
                    isLocked: false,
                    guarantors: [],
                    comments: [
                        { sender: 'nagarjuna reddy', text: 'This loan is for raja 2000000', time: 'Yesterday 08:50 PM' },
                        { sender: 'nagarjuna reddy', text: '1.5 for school fees', time: 'Yesterday 08:50 PM' },
                        { sender: 'nagarjuna reddy', text: '3 lakhs given to Anju', time: 'Yesterday 08:50 PM' }
                    ],
                    payments: [
                        { date: '2026-05-06', amount: 53543.76 },
                        { date: '2026-06-06', amount: 53548.86 },
                        { date: '2026-07-06', amount: 53524.29 },
                        { date: '2026-08-06', amount: 53529.13 }
                    ],
                    topups: [
                        { date: '2026-04-06', amount: 2500000 }
                    ]
                },
                {
                    id: 'Loan-111',
                    disbursedDate: '2025-12-25',
                    durationMonths: 7,
                    principal: 1500000,
                    rate: 8.5,
                    interestType: 'SIMPLE',
                    cycle: 'YEARLY',
                    collateral: 'None',
                    description: 'Personal expenses',
                    isLocked: false,
                    guarantors: [],
                    comments: [],
                    payments: [],
                    topups: [
                        { date: '2025-12-25', amount: 1500000 }
                    ]
                }
            ]
        },
        {
            id: 'c-2',
            name: 'Kasapa Reddy Bava',
            type: 'given',
            subLoans: [
                {
                    id: 'Loan-85',
                    disbursedDate: '2026-02-10',
                    durationMonths: 12,
                    principal: 9500000,
                    rate: 12,
                    interestType: 'SIMPLE',
                    cycle: 'YEARLY',
                    collateral: 'Land Property Documents',
                    description: 'Business investment lended',
                    isLocked: false,
                    guarantors: [],
                    comments: [],
                    payments: [],
                    topups: [{ date: '2026-02-10', amount: 9500000 }]
                }
            ]
        },
        {
            id: 'c-3',
            name: 'Mama Pulla Reddy',
            type: 'given',
            subLoans: [
                {
                    id: 'Loan-108',
                    disbursedDate: '2026-05-15',
                    durationMonths: 6,
                    principal: 1667500,
                    rate: 10.5,
                    interestType: 'SIMPLE',
                    cycle: 'YEARLY',
                    collateral: 'Business Shares',
                    description: 'Lended for retail capital',
                    isLocked: false,
                    guarantors: [],
                    comments: [],
                    payments: [],
                    topups: [{ date: '2026-05-15', amount: 1667500 }]
                }
            ]
        },
        {
            id: 'c-4',
            name: 'Niranjan Bava',
            type: 'given',
            subLoans: [
                {
                    id: 'Loan-109',
                    disbursedDate: '2026-06-01',
                    durationMonths: 12,
                    principal: 100000,
                    rate: 9,
                    interestType: 'SIMPLE',
                    cycle: 'YEARLY',
                    collateral: 'None',
                    description: 'Short term loan',
                    isLocked: false,
                    guarantors: [],
                    comments: [],
                    payments: [],
                    topups: [{ date: '2026-06-01', amount: 100000 }]
                }
            ]
        },
        {
            id: 'c-5',
            name: 'BOB GOLD LOAN',
            type: 'taken',
            settled: true,
            subLoans: [
                {
                    id: 'Loan-Gold',
                    disbursedDate: '2025-01-01',
                    durationMonths: 12,
                    principal: 2113440,
                    rate: 7.5,
                    interestType: 'SIMPLE',
                    cycle: 'YEARLY',
                    collateral: 'Gold',
                    description: 'Gold loan',
                    isLocked: false,
                    guarantors: [],
                    comments: [],
                    payments: [{ date: '2025-12-31', amount: 2113440 }],
                    topups: [{ date: '2025-01-01', amount: 2113440 }]
                }
            ]
        }
    ]);

    // Splitwise States
    const [friends, setFriends] = useState([
        { id: 'f-1', name: 'Amit', color: '#3B82F6' },
        { id: 'f-2', name: 'Rahul', color: '#10B981' },
        { id: 'f-3', name: 'Anju', color: '#EC4899' }
    ]);
    const [expenses, setExpenses] = useState([
        { id: 'e-1', desc: 'Meals & Party', total: 1500, paidById: 'you', splitType: 'EQUAL', participants: ['you', 'f-1', 'f-2'], date: '2026-07-28' }
    ]);

    // Add friend/expense states
    const [newFriendName, setNewFriendName] = useState('');
    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expensePaidBy, setExpensePaidBy] = useState('you');
    const [expenseMembers, setExpenseMembers] = useState(['you']);



    const [commentInput, setCommentInput] = useState('');

    // --- Dynamic Interest Calculation Utility ---
    const getInterestStats = (subLoan) => {
        const P = parseFloat(subLoan.principal) || 0;
        const R = parseFloat(subLoan.rate) || 0;
        const start = new Date(subLoan.disbursedDate);
        const now = new Date('2026-07-30'); // Simulating today
        
        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 0;
        let T = diffDays / 365;
        
        let interestIncurred = 0;
        if (subLoan.interestType === 'SIMPLE') {
            interestIncurred = P * (R / 100) * T;
        } else {
            let n = 1;
            if (subLoan.cycle === 'MONTHLY') n = 12;
            if (subLoan.cycle === 'DAILY') n = 365;
            interestIncurred = P * Math.pow(1 + (R / 100) / n, n * T) - P;
        }
        
        interestIncurred = parseFloat(interestIncurred.toFixed(2)) || 0;
        
        // Sum payment values
        const totalPaidAmount = subLoan.payments.reduce((sum, pay) => sum + pay.amount, 0);
        const interestPaidFixed = Math.max(0, parseFloat((totalPaidAmount - (P * (subLoan.payments.length / subLoan.durationMonths))).toFixed(2))) || 0;
        const interestOutstanding = Math.max(0, parseFloat((interestIncurred - interestPaidFixed).toFixed(2))) || 0;
        
        return {
            incurred: interestIncurred,
            paid: interestPaidFixed,
            outstanding: interestOutstanding,
            monthlyInterest: parseFloat(((P * (R / 100)) / 12).toFixed(2)) || 0
        };
    };

    // Calculate aggregated totals
    const getAggregatedLoanBalances = () => {
        let totalReceivable = 0;
        let totalPayable = 0;
        let interestReceivable = 0;
        let interestPayable = 0;

        loansList.forEach(c => {
            if (c.settled) return;
            c.subLoans.forEach(sl => {
                const stats = getInterestStats(sl);
                const totalDue = sl.principal + stats.outstanding;
                const totalPaid = sl.payments.reduce((sum, p) => sum + p.amount, 0);
                const outstandingDue = Math.max(0, totalDue - totalPaid);

                if (c.type === 'given') {
                    totalReceivable += outstandingDue;
                    interestReceivable += stats.monthlyInterest;
                } else {
                    totalPayable += outstandingDue;
                    interestPayable += stats.monthlyInterest;
                }
            });
        });

        return {
            receivable: totalReceivable,
            payable: totalPayable,
            netBalance: totalReceivable - totalPayable,
            interestReceivable,
            interestPayable
        };
    };

    // Splitwise Debts Solver
    const calculateSplits = () => {
        const balances = {};
        balances['you'] = 0;
        friends.forEach(f => { balances[f.id] = 0; });
        
        expenses.forEach(exp => {
            const amount = parseFloat(exp.total) || 0;
            const paidBy = exp.paidById;
            const participants = exp.participants;
            const share = amount / participants.length;
            
            balances[paidBy] += amount;
            participants.forEach(p => {
                balances[p] -= share;
            });
        });
        
        const debtors = [];
        const creditors = [];
        
        Object.keys(balances).forEach(key => {
            const bal = balances[key];
            if (bal < -0.01) {
                debtors.push({ id: key, balance: -bal });
            } else if (bal > 0.01) {
                creditors.push({ id: key, balance: bal });
            }
        });
        
        const transactionsList = [];
        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const settledAmount = Math.min(debtor.balance, creditor.balance);
            
            transactionsList.push({
                from: debtor.id,
                to: creditor.id,
                amount: parseFloat(settledAmount.toFixed(2))
            });
            
            debtor.balance -= settledAmount;
            creditor.balance -= settledAmount;
            
            if (debtor.balance < 0.01) i++;
            if (creditor.balance < 0.01) j++;
        }
        return transactionsList;
    };

    const aggregated = getAggregatedLoanBalances();
    useEffect(() => {
        if (tab) {
            setActiveTab(tab);
        }
    }, [tab]);
    // ==========================================
    // FUNCTION 1: Money Flow
    // ==========================================
    const [transactions, setTransactions] = useState([
        // August 2026 (Current Active Month)
        { id: '1', desc: 'Salary Credit', amount: 120000, type: 'INCOME', category: 'Salary', date: '2026-08-01', syncedFromSms: false, smsBody: null, isLogged: true, merchant: 'HDFC Bank', account: 'HDFC Savings Account' },
        { id: '2', desc: 'Business Dividend', amount: 45000, type: 'INCOME', category: 'Business', date: '2026-08-04', syncedFromSms: false, smsBody: null, isLogged: true, merchant: 'Zerodha Broking', account: 'ICICI Current Account' },
        { id: '3', desc: 'Home Rent Outflow', amount: 28000, type: 'EXPENSE', category: 'Rent', date: '2026-08-02', syncedFromSms: false, smsBody: null, isLogged: true, merchant: 'Prestige Society', account: 'HDFC Savings Account' },
        { id: '4', desc: 'Organic Groceries', amount: 6500, type: 'EXPENSE', category: 'Food', date: '2026-08-03', syncedFromSms: false, smsBody: null, isLogged: true, merchant: 'BigBasket', account: 'HDFC Savings Account' },
        { id: '5', desc: 'Fuel Refill', amount: 4200, type: 'EXPENSE', category: 'Travel', date: '2026-08-05', syncedFromSms: false, smsBody: null, isLogged: true, merchant: 'Shell Fuel', account: 'SBI Savings Account' },
        { id: '6', desc: 'Entertainment Subscription', amount: 999, type: 'EXPENSE', category: 'Entertainment', date: '2026-08-06', syncedFromSms: false, smsBody: null, isLogged: true, merchant: 'Netflix', account: 'HDFC Savings Account' },
        { id: '7', desc: 'Swiggy Dinner Order', amount: 1450, type: 'EXPENSE', category: 'Food', date: '2026-08-10', syncedFromSms: false, smsBody: null, isLogged: true, merchant: 'Swiggy', account: 'HDFC Savings Account' },
        { id: '8', desc: 'Amazon Household Items', amount: 2250, type: 'EXPENSE', category: 'Shopping', date: '2026-08-14', syncedFromSms: true, smsBody: 'UPI: A/c XX8810 debited by Rs.2,250.00 to Amazon', isLogged: true, merchant: 'Amazon', account: 'HDFC Savings Account', smsId: 's8' },
        // July 2026 (Previous Month)
        { id: '9', desc: 'Salary Credit - Jul', amount: 120000, type: 'INCOME', category: 'Salary', date: '2026-07-01', syncedFromSms: false, smsBody: null, isLogged: true, merchant: 'HDFC Bank', account: 'HDFC Savings Account' },
        { id: '10', desc: 'Home Rent - Jul', amount: 28000, type: 'EXPENSE', category: 'Rent', date: '2026-07-02', syncedFromSms: false, smsBody: null, isLogged: true, merchant: 'Prestige Society', account: 'HDFC Savings Account' },
        { id: '11', desc: 'Groceries - Jul', amount: 6500, type: 'EXPENSE', category: 'Food', date: '2026-07-03', syncedFromSms: false, smsBody: null, isLogged: true, merchant: 'BigBasket', account: 'HDFC Savings Account' }
    ]);
    const [newTxDesc, setNewTxDesc] = useState('');
    const [newTxAmt, setNewTxAmt] = useState('');
    const [newTxType, setNewTxType] = useState('EXPENSE');
    const [newTxCat, setNewTxCat] = useState('Food');
    const [newTxCustomCat, setNewTxCustomCat] = useState('');
    const [customCategories, setCustomCategories] = useState([]);
    const [showCatDropdown, setShowCatDropdown] = useState(false);
    const [isWhereMoneyExpanded, setIsWhereMoneyExpanded] = useState(false);
    const [isLoggerExpanded, setIsLoggerExpanded] = useState(false);
    // Date range states for Personal Spending Table
    const calculateDateRange = (timeframe, txs = transactions) => {
        const formatDate = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        // Reference date: current system date (today)
        let refDate = new Date();
        const toDate = formatDate(refDate);
        let fromDate = toDate;

        if (timeframe === 'Daily') {
            fromDate = toDate;
        } else if (timeframe === 'Weekly') {
            const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
            const dayOfWeek = d.getDay();
            const diffToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
            d.setDate(d.getDate() - diffToMonday);
            fromDate = formatDate(d);
        } else if (timeframe === 'Monthly') {
            const d = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
            fromDate = formatDate(d);
        } else if (timeframe === 'Yearly') {
            const d = new Date(refDate.getFullYear(), 0, 1);
            fromDate = formatDate(d);
        } else if (timeframe === 'All Time') {
            let earliest = toDate;
            if (txs && txs.length > 0) {
                txs.forEach(t => {
                    if (t.date && t.date < earliest) {
                        earliest = t.date;
                    }
                });
            } else {
                earliest = '2020-01-01';
            }
            fromDate = earliest;
        } else if (timeframe === 'Custom') {
            return { from: spendFromDate || '2020-01-01', to: spendToDate || toDate };
        }
        return { from: fromDate, to: toDate };
    };
    const [spendTimeframe, setSpendTimeframe] = useState('All Time');
    const [spendFromDate, setSpendFromDate] = useState(() => {
        const today = new Date();
        const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        let earliest = formatDate(today);
        if (transactions && transactions.length > 0) {
            transactions.forEach(t => {
                if (t.date && t.date < earliest) {
                    earliest = t.date;
                }
            });
        } else {
            earliest = '2020-01-01';
        }
        return earliest;
    });
    const [spendToDate, setSpendToDate] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    });
    // Timeframe dropdown states
    const timeframeOptions = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'All Time', 'Custom'];
    const [showSpendTimeframeDropdown, setShowSpendTimeframeDropdown] = useState(false);
    // Active category dropdown for transaction feed items
    const [activeTxCatDropdownId, setActiveTxCatDropdownId] = useState(null);
    // Custom category input states for feed transactions and SMS inbox items
    const [txCustomInputActive, setTxCustomInputActive] = useState({});
    const [smsCustomInputActive, setSmsCustomInputActive] = useState({});
    const [txCustomName, setTxCustomName] = useState({});
    const [smsCustomName, setSmsCustomName] = useState({});
    const handleSpendTimeframeSelect = (tf) => {
        setSpendTimeframe(tf);
        setShowSpendTimeframeDropdown(false);
        if (tf !== 'Custom') {
            const { from, to } = calculateDateRange(tf, transactions);
            setSpendFromDate(from);
            setSpendToDate(to);
        }
    };
    const [selectedTxId, setSelectedTxId] = useState(null);
    const [selectedSmsId, setSelectedSmsId] = useState(null);
    const [expandedCategory, setExpandedCategory] = useState(null);
    // SMS sync specific states
    const [activeSmsCatDropdownId, setActiveSmsCatDropdownId] = useState(null);
    const [smsSelectedCategories, setSmsSelectedCategories] = useState({});
    // Unified feed filter: 'all' | 'auto' | 'manual'
    const [feedFilter, setFeedFilter] = useState('all');
    const [showFeedFilterDropdown, setShowFeedFilterDropdown] = useState(false);
    // Persistent SMS archive — synced data stays even if original SMS is deleted from device
    const [syncedSmsArchive, setSyncedSmsArchive] = useState([]);
    // Known categories that can be auto-matched
    const knownCategories = ['Food', 'Travel', 'Entertainment', 'Rent', 'Shopping', 'Bills', 'Other', 'Income', 'Salary', 'Business', ...customCategories];
    const getDateRangeFlow = (fromDate, toDate) => {
        let totalIncome = 0;
        let totalExpense = 0;
        const normFrom = (fromDate || '').trim();
        const normTo = (toDate || '').trim();
        transactions.forEach(t => {
            const tDate = (t.date || '').trim();
            const matchesFrom = !normFrom || tDate >= normFrom;
            const matchesTo = !normTo || tDate <= normTo;
            if (matchesFrom && matchesTo) {
                if (t.type === 'INCOME') totalIncome += t.amount;
                else totalExpense += t.amount;
            }
        });
        return { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense };
    };
    const getDateRangeCategoryTotals = (fromDate, toDate) => {
        const catMap = {};
        const normFrom = (fromDate || '').trim();
        const normTo = (toDate || '').trim();
        transactions.forEach(t => {
            const tDate = (t.date || '').trim();
            const matchesFrom = !normFrom || tDate >= normFrom;
            const matchesTo = !normTo || tDate <= normTo;
            if (t.type === 'EXPENSE' && matchesFrom && matchesTo) {
                catMap[t.category] = (catMap[t.category] || 0) + t.amount;
            }
        });
        return catMap;
    };
    const flow = getDateRangeFlow(spendFromDate, spendToDate);
    const catTotals = getDateRangeCategoryTotals(spendFromDate, spendToDate);
    // ==========================================
    // FUNCTION 2: SMS Sync & Bank Balances
    // ==========================================
    const [bankBalances, setBankBalances] = useState({
        SBI: 125000,
        HDFC: 45800,
        ICICI: 92400,
        Axis: 18900,
        "Dokra Group": 0
    });
    const [smsInbox, setSmsInbox] = useState([
        { id: 's1', sender: 'AD-SBIUPI', text: 'UPI: Your SBI A/c XX8810 credited by Rs.15,000.00 via GPay. Bal: Rs.1,40,000.00', amount: 15000, type: 'INCOME', bank: 'SBI', status: 'UNPARSED', parsedCategory: 'Income', date: '2026-07-09' },
        { id: 's2', sender: 'AD-HDFCBK', text: 'Alert: Your HDFC Bank A/c XX4231 debited by Rs.4,500.00 to Amazon. Bal: Rs.41,300.00', amount: 4500, type: 'EXPENSE', bank: 'HDFC', status: 'UNPARSED', parsedCategory: 'Shopping', date: '2026-07-10' },
        { id: 's3', sender: 'AD-ICICIB', text: 'Info: ICICI Bank A/c XX9921 debited by Rs.850.00 for Netflix. Ref: 209381', amount: 850, type: 'EXPENSE', bank: 'ICICI', status: 'PARSED', parsedCategory: 'Entertainment', date: '2026-07-06' }
    ]);
    const handleSmsSync = (sms, customCategory) => {
        const finalCategory = customCategory || sms.parsedCategory || (sms.type === 'INCOME' ? 'Income' : 'Bills');
        // Update bank balances
        setBankBalances(prev => ({
            ...prev,
            [sms.bank]: sms.type === 'INCOME' ? prev[sms.bank] + sms.amount : prev[sms.bank] - sms.amount
        }));
        const syncDate = new Date().toISOString().split('T')[0];
        const syncTimestamp = new Date().toISOString();
        // Add to transactions
        setTransactions(prev => [{
            id: Date.now().toString(),
            desc: `${sms.bank} Auto-Sync Transaction`,
            amount: sms.amount,
            type: sms.type,
            category: finalCategory,
            date: syncDate,
            syncedFromSms: true,
            smsBody: sms.text,
            isLogged: true,
            smsId: sms.id
        }, ...prev]);
        // Persist to archive — survives device SMS deletion
        setSyncedSmsArchive(prev => [{
            smsId: sms.id,
            sender: sms.sender,
            body: sms.text,
            amount: sms.amount,
            type: sms.type,
            bank: sms.bank,
            category: finalCategory,
            syncedDate: syncDate,
            syncedAt: syncTimestamp,
            sourceDeleted: false
        }, ...prev]);
        // Update sms status
        setSmsInbox(prev => prev.map(item => item.id === sms.id ? { ...item, status: 'PARSED', parsedCategory: finalCategory } : item));
        Alert.alert("SMS Synced", `Archived & synced under ${finalCategory}. Data will persist even if the original SMS is deleted.`);
    };
    const handleUpdateParsedSmsCategory = (smsId, newCategory) => {
        // If it's already parsed, update the matching transaction's category
        setTransactions(prev => prev.map(t => t.smsId === smsId ? { ...t, category: newCategory } : t));
        setSmsInbox(prev => prev.map(item => item.id === smsId ? { ...item, parsedCategory: newCategory } : item));
        Alert.alert("Success", `Category updated to ${newCategory}!`);
    };
    const handleAddTransaction = () => {
        if (!newTxDesc || !newTxAmt) {
            Alert.alert("Error", "Please enter description and amount.");
            return;
        }
        const amt = parseFloat(newTxAmt);
        if (isNaN(amt) || amt <= 0) {
            Alert.alert("Error", "Please enter a valid amount.");
            return;
        }
        const loggedCat = newTxCat === 'Custom' ? newTxCustomCat : newTxCat;
        if (newTxCat === 'Custom' && !newTxCustomCat.trim()) {
            Alert.alert("Error", "Please enter a custom category name.");
            return;
        }
        const newTx = {
            id: Date.now().toString(),
            desc: newTxDesc,
            amount: amt,
            type: newTxType,
            category: newTxType === 'INCOME' ? 'Income' : loggedCat,
            date: new Date().toISOString().split('T')[0],
            syncedFromSms: false,
            smsBody: null,
            isLogged: true
        };
        if (newTxCat === 'Custom' && !customCategories.includes(loggedCat)) {
            setCustomCategories([...customCategories, loggedCat]);
        }
        setTransactions([newTx, ...transactions]);
        setNewTxDesc('');
        setNewTxAmt('');
        setNewTxCustomCat('');
        Alert.alert("Success", "Transaction logged successfully!");
    };
    const handleDeleteTransaction = (id) => {
        const tx = transactions.find(t => t.id === id);
        if (tx && tx.smsId) {
            setSmsInbox(prev => prev.map(item => item.id === tx.smsId ? { ...item, status: 'UNPARSED' } : item));
        }
        setTransactions(prev => prev.filter(t => t.id !== id));
    };
    // ==========================================
    // FUNCTION 3: Loans & EMIs
    // ==========================================
    const [loans, setLoans] = useState([
        { id: 'l1', name: 'SBI Home Loan', type: 'Home', principal: 4200000, interestRate: 8.4, emi: 42500, hasInsurance: true, insRenewalDate: '2026-12-01', insCompany: 'LIC Griha Shield', tenureMonths: 240, bank: 'SBI', startDate: '2026-01-01', moratoriumMonths: 0, emisPaidCount: 6, prepayments: [], topups: [], isClosed: false },
        { id: 'l2', name: 'HDFC Car Loan', type: 'Personal', principal: 800000, interestRate: 9.2, emi: 16500, hasInsurance: false, insRenewalDate: '', insCompany: '', tenureMonths: 60, bank: 'HDFC', startDate: '2026-03-01', moratoriumMonths: 0, emisPaidCount: 4, prepayments: [], topups: [], isClosed: false },
        { id: 'l3', name: 'DWCRA Rural Loan', type: 'DWCRA', principal: 200000, interestRate: 7.5, emi: 5000, hasInsurance: false, insRenewalDate: '', insCompany: '', tenureMonths: 48, bank: 'Dokra Group', startDate: '2026-02-01', moratoriumMonths: 0, emisPaidCount: 5, prepayments: [], topups: [], isClosed: false }
    ]);
    const handleAddInlineLoan = (loanData, bankName) => {
        const newLoan = {
            id: 'l' + Date.now(),
            ...loanData,
            bank: bankName,
            hasInsurance: false,
            insRenewalDate: '',
            insCompany: '',
            tenureMonths: loanData.tenureMonths || 60,
            emisPaidCount: 0,
            prepayments: [],
            topups: [],
            isClosed: false
        };
        setLoans(prev => [...prev, newLoan]);
        setAddingLoanBank(null);
        setAddingCustomLoan(false);
        if (bankBalances[bankName] === undefined) {
            setBankBalances(prev => ({ ...prev, [bankName]: 0 }));
        }
    };
    const [addingLoanBank, setAddingLoanBank] = useState(null);
    const [addingCustomLoan, setAddingCustomLoan] = useState(false);
    const [showLeakWarning, setShowLeakWarning] = useState(true);
    // ── Finance Hub states ──
    const [fhTab, setFhTab] = useState('banking');
    const [fhP2pLoans, setFhP2pLoans] = useState([
        { id: 'p1', contact: 'Ravi Kumar', type: 'lent', amount: 15000, dueDate: '2026-09-01', note: 'Emergency medical', partialPaid: 5000 },
        { id: 'p2', contact: 'Meena Rao', type: 'borrowed', amount: 8000, dueDate: '2026-08-15', note: 'Festival advance', partialPaid: 0 }
    ]);
    const [newP2pContact, setNewP2pContact] = useState('');
    const [newP2pType, setNewP2pType] = useState('lent');
    const [newP2pAmount, setNewP2pAmount] = useState('');
    const [newP2pDue, setNewP2pDue] = useState('');
    const [newP2pNote, setNewP2pNote] = useState('');
    const [partialPayId, setPartialPayId] = useState(null);
    const [partialPayAmt, setPartialPayAmt] = useState('');
    const [splitGroups, setSplitGroups] = useState([
        { id: 'sg1', name: 'Goa Trip 2026', members: ['Ravi', 'Meena', 'You', 'Arjun'], totalExpense: 24000, yourShare: 6000, settled: false },
        { id: 'sg2', name: 'Office Lunch Pool', members: ['You', 'Neha', 'Kiran'], totalExpense: 4500, yourShare: 1500, settled: true }
    ]);
    const [newSplitName, setNewSplitName] = useState('');
    const [newSplitTotal, setNewSplitTotal] = useState('');
    const [newSplitMembers, setNewSplitMembers] = useState('');
    const [loanName, setLoanName] = useState('');
    const [loanPrincipal, setLoanPrincipal] = useState('');
    const [loanRate, setLoanRate] = useState('');
    const [loanEmi, setLoanEmi] = useState('');
    const [loanInsured, setLoanInsured] = useState(true);
    const [loanInsCompany, setLoanInsCompany] = useState('');
    const [loanInsRenewal, setLoanInsRenewal] = useState('');
    const [selectedAmortLoan, setSelectedAmortLoan] = useState(null);
    const [activeActionLoanId, setActiveActionLoanId] = useState(null);
    const [activeActionType, setActiveActionType] = useState(null);
    const [actionAmount, setActionAmount] = useState('');
    const [actionRate, setActionRate] = useState('');
    const [actionEmi, setActionEmi] = useState('');
    const [actionDate, setActionDate] = useState('2026-07-17');

    const updateBankBalance = (bankName, amountDiff) => {
        if (!bankName) return;
        setBankBalances(prev => {
            const normalizedBank = Object.keys(prev).find(
                key => key.toLowerCase() === bankName.toLowerCase()
            ) || bankName;
            return {
                ...prev,
                [normalizedBank]: Math.max(0, (prev[normalizedBank] || 0) + amountDiff)
            };
        });
    };

    const handleAddPrepayment = (loanId, amount, date) => {
        if (!amount || amount <= 0) {
            Alert.alert("Error", "Please enter a valid amount.");
            return;
        }
        const loan = loans.find(l => l.id === loanId);
        if (loan) {
            updateBankBalance(loan.bank, -amount);
        }
        setLoans(prev => prev.map(l => {
            if (l.id === loanId) {
                return {
                    ...l,
                    prepayments: [...(l.prepayments || []), { id: 'p' + Date.now(), amount, date }]
                };
            }
            return l;
        }));
        setActiveActionLoanId(null);
        setActiveActionType(null);
        setActionAmount('');
        Alert.alert("Success", "Prepayment recorded successfully!");
    };

    const handleAddTopup = (loanId, amount, date) => {
        if (!amount || amount <= 0) {
            Alert.alert("Error", "Please enter a valid amount.");
            return;
        }
        const loan = loans.find(l => l.id === loanId);
        if (loan) {
            updateBankBalance(loan.bank, amount);
        }
        setLoans(prev => prev.map(l => {
            if (l.id === loanId) {
                return {
                    ...l,
                    topups: [...(l.topups || []), { id: 't' + Date.now(), amount, date }]
                };
            }
            return l;
        }));
        setActiveActionLoanId(null);
        setActiveActionType(null);
        setActionAmount('');
        Alert.alert("Success", "Top-up recorded successfully!");
    };

    const handleEditLoanDetails = (loanId, interestRate, emi) => {
        setLoans(prev => prev.map(l => {
            if (l.id === loanId) {
                return { ...l, interestRate, emi };
            }
            return l;
        }));
        setActiveActionLoanId(null);
        setActiveActionType(null);
        setActionRate('');
        setActionEmi('');
        Alert.alert("Success", "Loan details updated successfully!");
    };

    const handlePrecloseLoan = (loanId, outstandingBalance, interestPaid) => {
        const loan = loans.find(l => l.id === loanId);
        if (loan) {
            const stats = calculateLoanStats(loan);
            updateBankBalance(loan.bank, -stats.remainingPrincipal);
        }
        setLoans(prev => prev.map(l => {
            if (l.id === loanId) {
                return {
                    ...l,
                    isClosed: true,
                    closedAmountPaid: outstandingBalance,
                    closedInterestPaid: interestPaid,
                    closedDate: new Date().toISOString().split('T')[0]
                };
            }
            return l;
        }));
        setActiveActionLoanId(null);
        setActiveActionType(null);
        Alert.alert("Success", "Loan pre-closed and recorded successfully!");
    };
    const calculateLoanStats = (loan) => {
        if (loan.isClosed) {
            return {
                remainingPrincipal: 0,
                interestPaidToDate: loan.closedInterestPaid || 0,
                emisPaid: loan.emisPaidCount,
                emisRemaining: 0,
                totalPaidToDate: loan.closedAmountPaid || 0,
                progressPercent: 100,
                earlyMonthsSaved: 0
            };
        }

        const monthlyRate = (loan.interestRate / 100) / 12;
        let balance = loan.principal;

        // Apply Moratorium for Education Loans
        let moratoriumInterest = 0;
        if (loan.type === 'Education' && loan.moratoriumMonths > 0) {
            for (let m = 1; m <= loan.moratoriumMonths; m++) {
                const interest = balance * monthlyRate;
                moratoriumInterest += interest;
                balance += interest;
            }
        }

        let interestPaidToDate = 0;
        let totalPaidToDate = 0;
        let emisPaid = 0;

        for (let i = 1; i <= loan.emisPaidCount; i++) {
            if (balance <= 0) break;
            const interest = balance * monthlyRate;
            interestPaidToDate += interest;
            const principalPaid = Math.min(balance, Math.max(0, loan.emi - interest));
            balance -= principalPaid;
            totalPaidToDate += loan.emi;
            emisPaid++;
        }

        const totalPrepayments = (loan.prepayments || []).reduce((sum, p) => sum + p.amount, 0);
        const totalTopups = (loan.topups || []).reduce((sum, t) => sum + t.amount, 0);

        balance = balance + totalTopups - totalPrepayments;
        totalPaidToDate += totalPrepayments;

        let tempBalance = balance;
        let emisRemaining = 0;
        const maxFutureMonths = 600;
        if (monthlyRate > 0 && loan.emi <= tempBalance * monthlyRate) {
            emisRemaining = 999;
        } else {
            while (tempBalance > 0 && emisRemaining < maxFutureMonths) {
                const interest = tempBalance * monthlyRate;
                const principalPaid = Math.min(tempBalance, Math.max(0, loan.emi - interest));
                tempBalance -= principalPaid;
                emisRemaining++;
            }
        }

        let baseBalance = loan.principal;
        if (loan.type === 'Education' && loan.moratoriumMonths > 0) {
            baseBalance += moratoriumInterest;
        }
        let baseMonthsTotal = 0;
        if (monthlyRate > 0 && loan.emi > baseBalance * monthlyRate) {
            let tempBase = baseBalance;
            while (tempBase > 0 && baseMonthsTotal < maxFutureMonths) {
                const interest = tempBase * monthlyRate;
                const principalPaid = Math.min(tempBase, Math.max(0, loan.emi - interest));
                tempBase -= principalPaid;
                baseMonthsTotal++;
            }
        } else {
            baseMonthsTotal = loan.tenureMonths || 120;
        }
        const earlyMonthsSaved = Math.max(0, baseMonthsTotal - (emisPaid + emisRemaining));
        const progressPercent = totalPaidToDate + balance <= 0 ? 100 : Math.round((totalPaidToDate / (totalPaidToDate + balance)) * 100);

        return {
            remainingPrincipal: Math.max(0, Math.round(balance)),
            interestPaidToDate: Math.round(interestPaidToDate + moratoriumInterest),
            emisPaid,
            emisRemaining,
            totalPaidToDate: Math.round(totalPaidToDate),
            progressPercent: Math.min(100, Math.max(0, progressPercent)),
            earlyMonthsSaved,
            moratoriumInterest: Math.round(moratoriumInterest)
        };
    };

    const getAmortizationSchedule = (loan) => {
        const stats = calculateLoanStats(loan);
        const monthlyRate = (loan.interestRate / 12) / 100;
        let balance = stats.remainingPrincipal;
        const schedule = [];
        const currentDate = new Date();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let i = 1; i <= 6; i++) {
            if (balance <= 0) break;
            const interest = balance * monthlyRate;
            const principalPaid = Math.min(balance, Math.max(0, loan.emi - interest));
            balance = Math.max(0, balance - principalPaid);
            const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            const displayMonth = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
            schedule.push({ month: i, displayMonth, interest, principalPaid, balance });
        }
        return schedule;
    };
    const calculateInterestReport = () => {
        const report = {};
        loans.forEach(loan => {
            if (loan.isClosed) return;
            const stats = calculateLoanStats(loan);
            const monthlyRate = (loan.interestRate / 100) / 12;
            const monthlyInterest = stats.remainingPrincipal * monthlyRate;
            const yearlyInterest = monthlyInterest * 12;
            
            const bankName = loan.bank || 'Other';
            if (!report[bankName]) {
                report[bankName] = { monthly: 0, yearly: 0, loans: [] };
            }
            report[bankName].monthly += monthlyInterest;
            report[bankName].yearly += yearlyInterest;
            report[bankName].loans.push({ name: loan.name, monthly: monthlyInterest, yearly: yearlyInterest });
        });

        let highestBank = null;
        let maxYearly = 0;
        Object.keys(report).forEach(bank => {
            if (report[bank].yearly > maxYearly) {
                maxYearly = report[bank].yearly;
                highestBank = bank;
            }
        });

        return { report, highestBank, maxYearly };
    };

    // ==========================================
    // FUNCTION 4: Unified Lifecycle & Budget Guard (Upgraded)
    // ==========================================
    const EXPIRY_CATEGORIES = [
        'Identity & Legal',
        'Automotive & Transport',
        'Health & Life Insurance',
        'Home & Maintenance',
        'Financial & Banking',
        'Digital Subscriptions',
        'Household & Pet Care',
        'Professional'
    ];

    const [expiries, setExpiries] = useState([
        { id: 'e1', title: 'Driving License Expiry', date: '2026-08-15', category: 'Identity & Legal' },
        { id: 'e2', title: 'Car Insurance Renewal', date: '2026-09-01', category: 'Automotive & Transport' },
        { id: 'e3', title: 'Mediclaim Premium', date: '2026-07-28', category: 'Health & Life Insurance' },
        { id: 'e4', title: 'RO Water Filter Change', date: '2026-11-10', category: 'Home & Maintenance' },
        { id: 'e5', title: 'HDFC Credit Card Expiry', date: '2026-08-31', category: 'Financial & Banking' },
        { id: 'e6', title: 'Netflix Subscription', date: '2026-07-22', category: 'Digital Subscriptions' },
        // Newly added examples for testing:
        { id: 'e7', title: 'Pollution Check (PUC)', date: '2026-07-19', category: 'Automotive & Transport' }, // Urgent
        { id: 'e8', title: 'Passport Renewal', date: '2026-12-10', category: 'Identity & Legal' }, // Safe
        { id: 'e9', title: 'Term Life Premium', date: '2026-08-05', category: 'Health & Life Insurance' }, // Yellow
        { id: 'e10', title: 'Pest Control (Annual)', date: '2026-07-15', category: 'Home & Maintenance' }, // Overdue
        { id: 'e11', title: 'Fixed Deposit Maturity', date: '2027-01-20', category: 'Financial & Banking' }, // Safe
        { id: 'e12', title: 'Amazon Prime', date: '2026-08-02', category: 'Digital Subscriptions' }, // Yellow
        { id: 'e13', title: 'Dog Annual Vaccination', date: '2026-07-25', category: 'Household & Pet Care' }, // Urgent/Yellow
        { id: 'e14', title: 'Chartered Accountant License', date: '2026-11-30', category: 'Professional' } // Safe
    ]);
    const [newExpiryTitle, setNewExpiryTitle] = useState('');
    const [newExpiryDate, setNewExpiryDate] = useState('');
    const [newExpiryCategory, setNewExpiryCategory] = useState('Identity & Legal');
    const [showExpiryCatDropdown, setShowExpiryCatDropdown] = useState(false);
    const [renewingItemId, setRenewingItemId] = useState(null);
    const [renewDateInput, setRenewDateInput] = useState('');
    const [showNewExpiryDatePicker, setShowNewExpiryDatePicker] = useState(false);
    const [showRenewDatePicker, setShowRenewDatePicker] = useState(false);

    const getUrgency = (dateStr) => {
        const expDate = new Date(dateStr);
        const today = new Date();
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return '#EF4444'; // Overdue / Today
        if (diffDays <= 7) return '#EF4444'; // Red (< 7 days)
        if (diffDays <= 30) return '#EAB308'; // Yellow (< 30 days)
        return '#10B981'; // Green (Safe)
    };

    const handleAddExpiry = () => {
        if (!newExpiryTitle || !newExpiryDate) {
            Alert.alert('Error', 'Please enter title and date (YYYY-MM-DD)');
            return;
        }
        setExpiries([...expiries, { id: 'e' + Date.now(), title: newExpiryTitle, date: newExpiryDate, category: newExpiryCategory }]);
        setNewExpiryTitle('');
        setNewExpiryDate('');
        setShowExpiryCatDropdown(false);
    };

    const handleInitRenew = (item) => {
        setRenewingItemId(item.id);
        setRenewDateInput(item.date); 
    };

    const handleSaveRenew = (id) => {
        if (!renewDateInput) {
            Alert.alert('Error', 'Please enter a valid date (YYYY-MM-DD)');
            return;
        }
        setExpiries(prev => prev.map(e => e.id === id ? { ...e, date: renewDateInput } : e));
        setRenewingItemId(null);
        setRenewDateInput('');
    };

    const handleDeleteExpiry = (id) => {
        setExpiries(expiries.filter(e => e.id !== id));
    };
    const [emiList, setEmiList] = useState([
        { id: 'm1', title: 'Home Loan EMI Deduction', date: 'Monthly (10th)', amount: 42500, done: false }
    ]);
    const [medications, setMedications] = useState([
        { id: 'md1', title: 'Metformin 500mg', time: '9 PM Daily', stock: 12, dosage: '1 Tablet' },
        { id: 'md2', title: 'Vitamin D3 60K', time: 'Sundays', stock: 4, dosage: '1 Capsule' }
    ]);
    const [newMedTitle, setNewMedTitle] = useState('');
    const [newMedTime, setNewMedTime] = useState('');
    const [newMedStock, setNewMedStock] = useState('');
    const [newMedDosage, setNewMedDosage] = useState('');

    const [healthVitals, setHealthVitals] = useState({
        bp: { sys: 125, dia: 82, lastChecked: 'Today, 8:00 AM', status: 'Normal' },
        sugar: { level: 98, type: 'Fasting', lastChecked: 'Today, 7:30 AM', status: 'Optimal' },
        weight: { kg: 76.5, goal: 72, lastChecked: 'Yesterday' },
        heartRate: { bpm: 72, lastChecked: '2 hrs ago', status: 'Normal' }
    });

    const [fitness, setFitness] = useState({
        steps: { current: 4500, goal: 10000 },
        activeMinutes: { current: 25, goal: 45 },
        caloriesBurned: { current: 320, goal: 600 },
        sleep: { hours: 6.5, goal: 8 }
    });

    const [nutrition, setNutrition] = useState({
        water: { currentGlasses: 4, goalGlasses: 8 },
        calories: { current: 1250, goal: 2200 },
        protein: { current: 65, goal: 120 }
    });

    const [appointments, setAppointments] = useState([
        { id: 'a1', doc: 'Dr. Sharma (Cardiologist)', date: '2026-08-12', time: '10:30 AM', location: 'City Hospital' }
    ]);

    const [editingVital, setEditingVital] = useState(null); // 'bp', 'sugar', 'weight', 'heartRate'
    const [vitalInput1, setVitalInput1] = useState('');
    const [vitalInput2, setVitalInput2] = useState('');

    const handleSaveVital = (type) => {
        const now = 'Just Now';
        if (type === 'bp') {
            const sys = parseInt(vitalInput1, 10);
            const dia = parseInt(vitalInput2, 10);
            if (!sys || !dia) return;
            let status = 'Normal';
            if (sys >= 130 || dia >= 85) status = 'High';
            if (sys <= 90 || dia <= 60) status = 'Low';
            setHealthVitals(prev => ({ ...prev, bp: { sys, dia, lastChecked: now, status }}));
        } else if (type === 'sugar') {
            const level = parseInt(vitalInput1, 10);
            if (!level) return;
            let status = 'Optimal';
            if (level > 120) status = 'High';
            if (level < 70) status = 'Low';
            setHealthVitals(prev => ({ ...prev, sugar: { ...prev.sugar, level, lastChecked: now, status }}));
        } else if (type === 'weight') {
            const kg = parseFloat(vitalInput1);
            if (!kg) return;
            setHealthVitals(prev => ({ ...prev, weight: { ...prev.weight, kg, lastChecked: now }}));
        } else if (type === 'heartRate') {
            const bpm = parseInt(vitalInput1, 10);
            if (!bpm) return;
            let status = 'Normal';
            if (bpm > 100) status = 'High';
            if (bpm < 60) status = 'Low';
            setHealthVitals(prev => ({ ...prev, heartRate: { ...prev.heartRate, bpm, lastChecked: now, status }}));
        }
        setEditingVital(null);
        setVitalInput1('');
        setVitalInput2('');
    };

    const handleQuickAdd = (type, amount) => {
        if (type === 'steps') setFitness(prev => ({ ...prev, steps: { ...prev.steps, current: prev.steps.current + amount }}));
        if (type === 'water') setNutrition(prev => ({ ...prev, water: { ...prev.water, currentGlasses: prev.water.currentGlasses + amount }}));
        if (type === 'calories') setNutrition(prev => ({ ...prev, calories: { ...prev.calories, current: prev.calories.current + amount }}));
        if (type === 'protein') setNutrition(prev => ({ ...prev, protein: { ...prev.protein, current: prev.protein.current + amount }}));
        if (type === 'sleep') setFitness(prev => ({ ...prev, sleep: { ...prev.sleep, hours: prev.sleep.hours + amount }}));
    };

    const handleAddMedication = () => {
        if (!newMedTitle || !newMedTime || !newMedStock) {
            Alert.alert('Error', 'Please fill required fields (Title, Time, Stock)');
            return;
        }
        setMedications([...medications, { 
            id: 'md' + Date.now(), 
            title: newMedTitle, 
            time: newMedTime, 
            stock: parseInt(newMedStock, 10), 
            dosage: newMedDosage || '1 Unit' 
        }]);
        setNewMedTitle(''); setNewMedTime(''); setNewMedStock(''); setNewMedDosage('');
    };

    const handleTakeMed = (id) => {
        setMedications(prev => prev.map(m => {
            if (m.id === id) {
                if (m.stock > 0) {
                    return { ...m, stock: m.stock - 1 };
                } else {
                    Alert.alert('Out of Stock', `You need to refill ${m.title}!`);
                }
            }
            return m;
        }));
    };
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [isCustomEntryModalVisible, setIsCustomEntryModalVisible] = useState(false);
    const [customEntryCategory, setCustomEntryCategory] = useState('');
    const [customEntrySection, setCustomEntrySection] = useState('');
    const [customEntryKidId, setCustomEntryKidId] = useState(null);
    const [customEntryForm, setCustomEntryForm] = useState({});
    const [userCustomCategories, setUserCustomCategories] = useState([]);
    
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editItemData, setEditItemData] = useState({});
    const [editItemMeta, setEditItemMeta] = useState({ section: '', category: '', kidId: null });

    const openEditModal = (item, section, category, kidId = null) => {
        setEditItemData({...item});
        setEditItemMeta({ section, category, kidId });
        setIsEditModalVisible(true);
    };
    const [familySecurityHub, setFamilySecurityHub] = useState({
        self: {
            termInsurance: [
                { id: 'me_t1', insurer: 'LIC of India', policyNumber: 'POL-987654321', coverageAmount: 50000000, coverageYears: 30, yearsPaid: 5, agentName: 'Ramesh Sharma', agentPhone: '9876543210', claimProcess: 'Contact agent. Nominee: Meera (Wife)', premiumAmount: 32000, nextDueDate: '2026-11-20', status: 'PENDING' }
            ],
            healthInsurance: [
                { id: 'me_h1', insurer: 'HDFC Ergo (Employer)', policyNumber: 'HLT-112233', totalCover: 1000000, amountLeft: 850000, renewalDate: '2027-01-15' }
            ],
            fixedDeposits: [
                { id: 'me_f1', bankName: 'SBI', principalAmount: 500000, maturityAmount: 650000, maturityDate: '2028-05-10', accountNumber: '3029112233', interestRate: 7.1, branch: 'Main Branch' }
            ],
            maintenance: []
        },
        spouse: {
            termInsurance: [
                { id: 'sp_t1', insurer: 'Max Life', policyNumber: 'POL-123456789', coverageAmount: 20000000, coverageYears: 25, yearsPaid: 2, agentName: 'Online', agentPhone: 'N/A', claimProcess: 'Online Claim. Nominee: Nirwan (Husband)', premiumAmount: 18500, nextDueDate: '2026-08-15', status: 'PENDING' }
            ],
            healthInsurance: [],
            fixedDeposits: [],
            maintenance: [
                { id: 'sp_m1', category: 'General Buffer', budget: 15000, spent: 4500 }
            ]
        },
        parents: {
            termInsurance: [],
            healthInsurance: [
                { id: 'p_h1', insurer: 'Star Health (Senior)', policyNumber: 'SH-998877', totalCover: 1500000, amountLeft: 1500000, renewalDate: '2026-10-10', premiumAmount: 42000, status: 'PENDING' }
            ],
            fixedDeposits: [
                { id: 'p_f1', bankName: 'Post Office SCSS', principalAmount: 1500000, maturityAmount: 1500000, maturityDate: '2029-01-01', accountNumber: 'PO-991122', interestRate: 8.2, branch: 'City Center PO' }
            ],
            maintenance: [
                { id: 'p_m1', category: 'Medical Buffer', budget: 10000, spent: 2500 }
            ]
        },
        kids: [
            {
                id: 'k1',
                name: 'Aarav',
                schoolFees: [
                    { id: 'k1_f1', termName: 'Term I', amount: 85000, dueDate: '2026-04-15', paid: true },
                    { id: 'k1_f2', termName: 'Term II', amount: 85000, dueDate: '2026-08-15', paid: false },
                    { id: 'k1_f3', termName: 'Term III', amount: 85000, dueDate: '2026-12-15', paid: false }
                ],
                futureCorpus: [
                    { id: 'k1_c1', fundName: 'College Corpus', target: 5000000, saved: 1200000 }
                ],
                policies: [
                    { id: 'k1_p1', insurer: 'LIC Jeevan Tarun', policyNumber: 'LIC-JT-123', coverageAmount: 2500000, coverageYears: 20, yearsPaid: 4, agentName: 'Ramesh Sharma', agentPhone: '9876543210', claimProcess: 'Maturity at 25 yrs age', premiumAmount: 24000, nextDueDate: '2027-02-10', status: 'PENDING' }
                ],
                maintenance: [
                    { id: 'k1_m1', category: 'Swimming Coaching', budget: 3500, spent: 3500 },
                    { id: 'k1_m2', category: 'Clothes & Apparel', budget: 5000, spent: 1200 }
                ]
            }
        ]
    });

    const toggleCardExpand = (id) => {
        setExpandedCardId(prev => prev === id ? null : id);
    };

    const handleDeepAction = (section, category, id, actionType, kidId = null) => {
        const incrementDate = (dateStr) => {
            if (!dateStr) return dateStr;
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            d.setFullYear(d.getFullYear() + 1);
            return d.toISOString().split('T')[0];
        };

        setFamilySecurityHub(prev => {
            const newState = { ...prev };
            
            if (kidId) {
                const kidIndex = newState.kids.findIndex(k => k.id === kidId);
                if (kidIndex > -1) {
                    newState.kids[kidIndex][category] = newState.kids[kidIndex][category].map(item => {
                        if (item.id === id) {
                            if (actionType === 'MARK_PAID') {
                                const updated = { ...item, status: 'PENDING', paid: true };
                                if (item.nextDueDate) updated.nextDueDate = incrementDate(item.nextDueDate);
                                if (item.renewalDate) updated.renewalDate = incrementDate(item.renewalDate);
                                if (item.yearsPaid !== undefined) updated.yearsPaid = item.yearsPaid + 1;
                                return updated;
                            }
                            if (actionType === 'ADD_FUNDS') return { ...item, saved: Math.min(item.saved + 50000, item.target) };
                        }
                        return item;
                    });
                }
            } else {
                newState[section][category] = newState[section][category].map(item => {
                    if (item.id === id) {
                        if (actionType === 'MARK_PAID') {
                            const updated = { ...item, status: 'PENDING' };
                            if (item.nextDueDate) updated.nextDueDate = incrementDate(item.nextDueDate);
                            if (item.renewalDate) updated.renewalDate = incrementDate(item.renewalDate);
                            if (item.yearsPaid !== undefined) updated.yearsPaid = item.yearsPaid + 1;
                            return updated;
                        }
                    }
                    return item;
                });
            }
            return newState;
        });
    };


    const isPaymentAllowed = (dateStr) => {
        if (!dateStr) return true;
        const d = new Date(dateStr);
        if (isNaN(d)) return true;
        const today = new Date();
        const diffTime = d.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30; 
    };

    const renderTermInsurance = (items, section, kidId = null) => {
        if (!items || items.length === 0) return null;
        return items.map(item => (
            <Pressable key={item.id} onPress={() => toggleCardExpand(item.id)} style={{ backgroundColor: '#18181B', padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#27272A' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '700' }}>{item.insurer}</Text>
                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>{item.coverageAmount >= 10000000 ? `₹${item.coverageAmount/10000000} Cr` : `₹${item.coverageAmount.toLocaleString()}`} Cover</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>₹{item.premiumAmount.toLocaleString()}</Text>
                            <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Due: {item.nextDueDate}</Text>
                        </View>
                        <Pressable onPress={(e) => { e.stopPropagation(); openEditModal(item, section, 'termInsurance', kidId); }} style={{ padding: 4 }}><Edit2 size={16} color="#6366F1" /></Pressable>
                    </View>
                </View>
                {expandedCardId === item.id && (
                    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#27272A', gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#A1A1AA', fontSize: 12 }}>Policy No:</Text><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{item.policyNumber}</Text></View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#A1A1AA', fontSize: 12 }}>Agent:</Text><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{item.agentName} ({item.agentPhone})</Text></View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#A1A1AA', fontSize: 12 }}>Coverage:</Text><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{item.yearsPaid} paid / {item.coverageYears - item.yearsPaid} pending</Text></View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#A1A1AA', fontSize: 12 }}>Claim Process:</Text><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }}>{item.claimProcess}</Text></View>
                        <Pressable disabled={!isPaymentAllowed(item.nextDueDate)} onPress={() => handleDeepAction(section, 'termInsurance', item.id, 'MARK_PAID', kidId)} style={{ backgroundColor: !isPaymentAllowed(item.nextDueDate) ? '#3F3F46' : (item.status === 'PAID' ? '#10B981' : '#3B82F6'), padding: 8, borderRadius: 4, alignItems: 'center', marginTop: 8, opacity: !isPaymentAllowed(item.nextDueDate) ? 0.5 : 1 }}>
                            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{!isPaymentAllowed(item.nextDueDate) ? 'NOT DUE YET' : (item.status === 'PAID' ? 'PREMIUM PAID ✓' : 'MARK PAID')}</Text>
                        </Pressable>
                    </View>
                )}
            </Pressable>
        ));
    };

    const renderHealthInsurance = (items, section, kidId = null) => {
        if (!items || items.length === 0) return null;
        return items.map(item => (
            <Pressable key={item.id} onPress={() => toggleCardExpand(item.id)} style={{ backgroundColor: '#18181B', padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#27272A' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '700' }}>{item.insurer}</Text>
                        <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>₹{item.amountLeft.toLocaleString()} Left</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Renewal: {item.renewalDate}</Text>
                        </View>
                        <Pressable onPress={(e) => { e.stopPropagation(); openEditModal(item, section, 'healthInsurance', kidId); }} style={{ padding: 4 }}><Edit2 size={16} color="#6366F1" /></Pressable>
                    </View>
                </View>
                {expandedCardId === item.id && (
                    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#27272A', gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#A1A1AA', fontSize: 12 }}>Policy No:</Text><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{item.policyNumber}</Text></View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#A1A1AA', fontSize: 12 }}>Total Cover:</Text><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>₹{item.totalCover.toLocaleString()}</Text></View>
                        {item.premiumAmount && (
                            <Pressable disabled={!isPaymentAllowed(item.renewalDate)} onPress={() => handleDeepAction(section, 'healthInsurance', item.id, 'MARK_PAID', kidId)} style={{ backgroundColor: !isPaymentAllowed(item.renewalDate) ? '#3F3F46' : (item.status === 'PAID' ? '#10B981' : '#3B82F6'), padding: 8, borderRadius: 4, alignItems: 'center', marginTop: 8, opacity: !isPaymentAllowed(item.renewalDate) ? 0.5 : 1 }}>
                                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{!isPaymentAllowed(item.renewalDate) ? 'NOT DUE YET' : (item.status === 'PAID' ? 'PREMIUM PAID ✓' : `PAY ₹${item.premiumAmount.toLocaleString()}`)}</Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </Pressable>
        ));
    };

    const renderFDs = (items, section, kidId = null) => {
        if (!items || items.length === 0) return null;
        return items.map(item => (
            <Pressable key={item.id} onPress={() => toggleCardExpand(item.id)} style={{ backgroundColor: '#18181B', padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#27272A' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '700' }}>{item.bankName} FD</Text>
                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Prin: ₹{item.principalAmount.toLocaleString()}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: '#3B82F6', fontSize: 14, fontWeight: '700' }}>Maturity: ₹{item.maturityAmount.toLocaleString()}</Text>
                            <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Date: {item.maturityDate}</Text>
                        </View>
                        <Pressable onPress={(e) => { e.stopPropagation(); openEditModal(item, section, 'fixedDeposits', kidId); }} style={{ padding: 4 }}><Edit2 size={16} color="#6366F1" /></Pressable>
                    </View>
                </View>
                {expandedCardId === item.id && (
                    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#27272A', gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#A1A1AA', fontSize: 12 }}>Account No:</Text><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{item.accountNumber || 'N/A'}</Text></View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#A1A1AA', fontSize: 12 }}>Interest Rate:</Text><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{item.interestRate || 'N/A'}%</Text></View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#A1A1AA', fontSize: 12 }}>Branch/Details:</Text><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{item.branch || 'N/A'}</Text></View>
                    </View>
                )}
            </Pressable>
        ));
    };

    const renderMaintenance = (items, section, kidId = null) => {
        if (!items || items.length === 0) return null;
        return items.map(item => (
            <View key={item.id} style={{ backgroundColor: '#18181B', padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#27272A' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                    <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '700' }}>{item.category}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>₹{item.spent.toLocaleString()} / ₹{item.budget.toLocaleString()}</Text>
                        <Pressable onPress={() => openEditModal(item, section, 'maintenance', kidId)} style={{ padding: 4 }}><Edit2 size={16} color="#6366F1" /></Pressable>
                    </View>
                </View>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${Math.min((item.spent / item.budget) * 100, 100)}%`, backgroundColor: item.spent > item.budget ? '#EF4444' : '#F59E0B' }]} /></View>
            </View>
        ));
    };

    const renderGeneric = (items, section, category, kidId = null) => {
        if (!items || items.length === 0) return null;
        return items.map(item => (
            <View key={item.id} style={{ backgroundColor: '#18181B', padding: 14, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '700' }}>{item.insurer || item.bankName || item.category || item.title || 'Custom Item'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 12 }}>
                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>₹{Number(item.amountLeft || item.premiumAmount || item.target || 0).toLocaleString()}</Text>
                    <Pressable onPress={() => openEditModal(item, section, category, kidId)} style={{ padding: 4 }}><Edit2 size={16} color="#6366F1" /></Pressable>
                </View>
            </View>
        ));
    };

    const renderAddButton = (section, kidId = null) => (
        <Pressable onPress={() => { setIsCustomEntryModalVisible(true); setCustomEntrySection(section); setCustomEntryKidId(kidId); }} style={{ backgroundColor: '#27272A', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: '#3F3F46' }}>
            <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '700' }}>+ Add Custom Entry</Text>
        </Pressable>
    );

    const [todos, setTodos] = useState([
        { id: 't1', title: 'Collect Income Tax certificates', done: false, category: 'Finance', priority: 'High', dueDate: '2026-07-20' },
        { id: 't2', title: 'Schedule car service', done: true, category: 'Personal', priority: 'Medium', dueDate: '2026-07-15' },
        { id: 't3', title: 'Renew health insurance', done: false, category: 'Health', priority: 'High', dueDate: '2026-07-25' }
    ]);
    const [activeTodoFilter, setActiveTodoFilter] = useState('All');
    const [isAddTodoModalVisible, setIsAddTodoModalVisible] = useState(false);
    const [newTodoForm, setNewTodoForm] = useState({ title: '', category: 'Finance', priority: 'Medium', dueDate: '' });
    const [lifeBudget, setLifeBudget] = useState({
        monthlyIncome: 200000,
        needs: [
            { id: 'n1', category: 'Groceries & Daily Essentials', limit: 25000, spent: 18000, icon: '🛒' },
            { id: 'n2', category: 'Housing & Rent', limit: 40000, spent: 40000, icon: '🏠' },
            { id: 'n3', category: 'Utilities & Bills', limit: 10000, spent: 8500, icon: '⚡' },
            { id: 'n4', category: 'Healthcare', limit: 5000, spent: 1200, icon: '💊' }
        ],
        wants: [
            { id: 'w1', category: 'Dining Out', limit: 15000, spent: 12500, icon: '🍽️' },
            { id: 'w2', category: 'Entertainment & Subs', limit: 5000, spent: 3000, icon: '🎬' },
            { id: 'w3', category: 'Travel', limit: 10000, spent: 4200, icon: '✈️' }
        ],
        savings: [
            { id: 's1', category: 'Emergency Fund', target: 20000, allocated: 20000, icon: '🛡️' },
            { id: 's2', category: 'Investments (SIPs)', target: 50000, allocated: 50000, icon: '📈' }
        ]
    });
    const [isEditingLifeBudget, setIsEditingLifeBudget] = useState(false);
    const [draftLifeBudget, setDraftLifeBudget] = useState(null);
    const [isLogLifeExpenseModalVisible, setIsLogLifeExpenseModalVisible] = useState(false);
    const [activeLifeExpense, setActiveLifeExpense] = useState(null);
    const [lifeExpenseAmount, setLifeExpenseAmount] = useState('');
    const [assetServices, setAssetServices] = useState({
        vehicles: [
            { id: 'v1', title: 'Royal Enfield Bullet 350', nextDue: '2026-09-10', frequency: 6, lastServiceCost: 3500, lastServiceDate: '2026-03-10', provider: 'Royal Enfield SC', amcStatus: 'Expired', history: [{date: '2026-03-10', cost: 3500, provider: 'Royal Enfield SC'}], amcDetails: { amountPaid: 0, coverages: '', billUri: null }, contact: { phone: '9876543210' }, checklists: { preService: [{task: 'Check scratches', done: false}, {task: 'Check fuel level', done: false}], postService: [{task: 'Test drive', done: false}, {task: 'Check washing quality', done: false}] } }
        ],
        appliances: [
            { id: 'a1', title: 'LG RO Water Purifier', nextDue: '2026-08-15', frequency: 8, lastServiceCost: 1200, lastServiceDate: '2025-12-15', provider: 'Urban Company', amcStatus: 'Active', history: [], amcDetails: { amountPaid: 2500, coverages: 'Free visits, Part replacement', billUri: null }, contact: { phone: '9876543210' }, checklists: { preService: [{task: 'Check TDS before', done: false}], postService: [{task: 'Check TDS after', done: false}, {task: 'Check leaks', done: false}] } }
        ],
        property: [
            { id: 'p1', title: 'Pest Control', nextDue: '2026-10-01', frequency: 3, lastServiceCost: 1200, lastServiceDate: '2026-07-01', provider: 'HiCare', amcStatus: 'None', history: [], amcDetails: { amountPaid: 0, coverages: '', billUri: null }, contact: { phone: '9876543210' }, checklists: { preService: [{task: 'Empty kitchen cabinets', done: false}], postService: [{task: 'Wipe counters', done: false}] } }
        ],
        digital: [
            { id: 'd1', title: 'Google One 2TB', nextDue: '2026-11-20', frequency: 12, lastServiceCost: 2100, lastServiceDate: '2025-11-20', provider: 'Google', amcStatus: 'Active', history: [], amcDetails: { amountPaid: 2100, coverages: 'Cloud Storage', billUri: null }, contact: { phone: '' }, checklists: { preService: [], postService: [] } }
        ]
    });
    const [isAddAssetModalVisible, setIsAddAssetModalVisible] = useState(false);
    const [newAssetCategory, setNewAssetCategory] = useState('vehicles');
    const [newAssetForm, setNewAssetForm] = useState({});
    
    const [isLogServiceModalVisible, setIsLogServiceModalVisible] = useState(false);
    const [logServiceData, setLogServiceData] = useState({ cost: '', date: '', provider: '', notes: '' });
    const [activeServiceAsset, setActiveServiceAsset] = useState(null);
    // ==========================================
    // FUNCTION 5: Outside Loans given (P2P)
    // ==========================================
    const [p2pLoans, setP2pLoans] = useState([
        { id: 'p1', borrower: 'Ramesh Kumar', amount: 50000, interestRate: 12, months: 12, type: 'SIMPLE' }
    ]);
    const [p2pName, setP2pName] = useState('');
    const [p2pAmt, setP2pAmt] = useState('');
    const [p2pRate, setP2pRate] = useState('');
    const [p2pMonths, setP2pMonths] = useState('');
    const [p2pType, setP2pType] = useState('SIMPLE');
    const calculateP2pInterest = (p) => {
        if (p.type === 'SIMPLE') {
            return (p.amount * p.interestRate * (p.months / 12)) / 100;
        } else {
            return p.amount * Math.pow(1 + (p.interestRate / 100) / 12, 12 * (p.months / 12)) - p.amount;
        }
    };

    const [addingP2p, setAddingP2p] = useState(false);
    const handleAddP2pLoan = () => {
        if (!p2pName || !p2pAmt || !p2pRate || !p2pMonths) return;
        const newLoan = {
            id: 'p-' + Date.now(),
            borrower: p2pName,
            amount: parseFloat(p2pAmt),
            interestRate: parseFloat(p2pRate),
            months: parseInt(p2pMonths),
            type: p2pType
        };
        setP2pLoans(prev => [...prev, newLoan]);
        setP2pName('');
        setP2pAmt('');
        setP2pRate('');
        setP2pMonths('');
        setAddingP2p(false);
    };
    const handleRemoveP2pLoan = (loanId) => {
        setP2pLoans(prev => prev.filter(p => p.id !== loanId));
    };

    const [editingP2pLoanId, setEditingP2pLoanId] = useState(null);
    const [editP2pName, setEditP2pName] = useState('');
    const [editP2pAmt, setEditP2pAmt] = useState('');
    const [editP2pRate, setEditP2pRate] = useState('');
    const [editP2pMonths, setEditP2pMonths] = useState('');
    const [editP2pType, setEditP2pType] = useState('SIMPLE');

    const handleEditP2pLoan = (loanId) => {
        if (!editP2pName || !editP2pAmt || !editP2pRate || !editP2pMonths) return;
        setP2pLoans(prev => prev.map(p => {
            if (p.id === loanId) {
                return {
                    ...p,
                    borrower: editP2pName,
                    amount: parseFloat(editP2pAmt),
                    interestRate: parseFloat(editP2pRate),
                    months: parseInt(editP2pMonths),
                    type: editP2pType
                };
            }
            return p;
        }));
        setEditingP2pLoanId(null);
    };

    const getAssetUrgency = (dateStr) => {
        if (!dateStr) return '#10B981'; // Green
        const expDate = new Date(dateStr);
        const today = new Date();
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return '#EF4444'; // Red
        if (diffDays <= 15) return '#EAB308'; // Yellow
        return '#10B981'; // Green
    };

    const handleSnoozeService = (category, assetId) => {
        setAssetServices(prev => {
            const newState = { ...prev };
            newState[category] = newState[category].map(asset => {
                if (asset.id === assetId) {
                    const d = new Date(asset.nextDue);
                    d.setDate(d.getDate() + 7);
                    return { ...asset, nextDue: d.toISOString().split('T')[0] };
                }
                return asset;
            });
            return newState;
        });
    };

    const getUrgentAssets = () => {
        const urgent = [];
        Object.keys(assetServices).forEach(category => {
            assetServices[category].forEach(asset => {
                if (asset.status === 'Scheduled') return;
                const urgency = getAssetUrgency(asset.nextDue);
                if (urgency === '#EF4444' || urgency === '#EAB308') {
                    urgent.push({ ...asset, category });
                }
            });
        });
        return urgent;
    };

    const handleMarkScheduled = (category, assetId) => {
        setAssetServices(prev => {
            const newState = { ...prev };
            newState[category] = newState[category].map(asset => {
                if (asset.id === assetId) {
                    return { ...asset, status: asset.status === 'Scheduled' ? null : 'Scheduled' };
                }
                return asset;
            });
            return newState;
        });
    };

    const submitServiceLog = () => {
        if (!activeServiceAsset || !logServiceData.cost || !logServiceData.date) {
            Alert.alert('Error', 'Please enter cost and date');
            return;
        }
        setAssetServices(prev => {
            const newState = { ...prev };
            const { category, id } = activeServiceAsset;
            newState[category] = newState[category].map(asset => {
                if (asset.id === id) {
                    const d = new Date(logServiceData.date);
                    d.setMonth(d.getMonth() + (asset.frequency || 12));
                    const nextDue = d.toISOString().split('T')[0];
                    const newLog = { date: logServiceData.date, cost: parseFloat(logServiceData.cost), provider: logServiceData.provider, notes: logServiceData.notes };
                    const history = asset.history ? [...asset.history, newLog] : [newLog];
                    return { ...asset, nextDue, lastServiceCost: parseFloat(logServiceData.cost), lastServiceDate: logServiceData.date, history };
                }
                return asset;
            });
            return newState;
        });
        setIsLogServiceModalVisible(false);
        setActiveServiceAsset(null);
        setLogServiceData({ cost: '', date: '', provider: '', notes: '' });
    };

    const handlePickBill = async (category, assetId) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setAssetServices(prev => {
                const newState = { ...prev };
                newState[category] = newState[category].map(asset => {
                    if (asset.id === assetId) {
                        return { ...asset, amcDetails: { ...asset.amcDetails, billUri: result.assets[0].uri } };
                    }
                    return asset;
                });
                return newState;
            });
        }
    };

    const handleToggleChecklist = (category, assetId, type, taskIndex) => {
        setAssetServices(prev => {
            const newState = { ...prev };
            newState[category] = newState[category].map(asset => {
                if (asset.id === assetId && asset.checklists && asset.checklists[type]) {
                    const newChecklists = { ...asset.checklists };
                    newChecklists[type] = [...newChecklists[type]];
                    newChecklists[type][taskIndex].done = !newChecklists[type][taskIndex].done;
                    return { ...asset, checklists: newChecklists };
                }
                return asset;
            });
            return newState;
        });
    };

    const handleCallProvider = (phone) => {
        if (!phone) { Alert.alert('Error', 'No phone number saved.'); return; }
        Linking.openURL(`tel:${phone}`);
    };

    const handleWhatsAppProvider = (phone) => {
        if (!phone) { Alert.alert('Error', 'No phone number saved.'); return; }
        Linking.openURL(`whatsapp://send?phone=${phone}`);
    };

    const renderAssetCard = (asset, category) => {
        const isScheduled = asset.status === 'Scheduled';
        const urgencyColor = isScheduled ? '#3B82F6' : getAssetUrgency(asset.nextDue);
        return (
            <View key={asset.id} style={{ backgroundColor: '#18181B', padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#27272A' }}>
                <Pressable onPress={() => toggleCardExpand(asset.id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#F4F4F5', fontSize: 15, fontWeight: '700' }}>{asset.title}</Text>
                        <Text style={{ color: '#A1A1AA', fontSize: 12, marginTop: 4 }}>Provider: {asset.provider || 'N/A'} • {asset.frequency}M freq</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: urgencyColor, fontSize: 13, fontWeight: '700' }}>Due: {asset.nextDue} {isScheduled ? '(Scheduled)' : ''}</Text>
                        {asset.amcStatus && asset.amcStatus !== 'None' && (
                            <View style={{ backgroundColor: asset.amcStatus === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, borderWidth: 1, borderColor: asset.amcStatus === 'Active' ? '#10B981' : '#EF4444' }}>
                                <Text style={{ color: asset.amcStatus === 'Active' ? '#10B981' : '#EF4444', fontSize: 10, fontWeight: '700' }}>AMC: {asset.amcStatus}</Text>
                            </View>
                        )}
                    </View>
                </Pressable>
                
                {expandedCardId === asset.id && (
                    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#27272A' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <View>
                                <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Last Service Cost</Text>
                                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>₹{asset.lastServiceCost?.toLocaleString() || '0'}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Last Service Date</Text>
                                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>{asset.lastServiceDate || 'N/A'}</Text>
                            </View>
                        </View>

                        {asset.amcDetails && (
                            <View style={{ marginBottom: 12, backgroundColor: '#09090B', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#27272A' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700' }}>AMC Details</Text>
                                    <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>Paid: ₹{asset.amcDetails.amountPaid?.toLocaleString() || '0'}</Text>
                                </View>
                                {asset.amcDetails.coverages ? <Text style={{ color: '#D4D4D8', fontSize: 12, marginBottom: 8 }}>Coverages: {asset.amcDetails.coverages}</Text> : null}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Pressable onPress={() => handlePickBill(category, asset.id)} style={{ backgroundColor: '#27272A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 }}>
                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>{asset.amcDetails.billUri ? 'Change Bill Pic' : '+ Attach Bill Pic'}</Text>
                                    </Pressable>
                                    {asset.amcDetails.billUri && (
                                        <Image source={{ uri: asset.amcDetails.billUri }} style={{ width: 40, height: 40, borderRadius: 4, borderWidth: 1, borderColor: '#3F3F46' }} />
                                    )}
                                </View>

                                {/* ➕ Add New Loan Action Bar */}
                                <TouchableOpacity
                                    onPress={() => setShowAddLoanModal(true)}
                                    style={{
                                        backgroundColor: '#18181B',
                                        padding: 16,
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: '#6366F1',
                                        borderStyle: 'dashed',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justify: 'center',
                                        gap: 8,
                                        marginTop: 8
                                    }}
                                >
                                    <PlusCircle size={20} color="#6366F1" />
                                    <Text style={{ color: '#6366F1', fontSize: 14, fontWeight: '800' }}>+ Add New P2P Loan / Debt</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {asset.contact && asset.contact.phone ? (
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                <Pressable onPress={() => handleCallProvider(asset.contact.phone)} style={{ flex: 1, backgroundColor: '#27272A', paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#3F3F46' }}>
                                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>📞 CALL</Text>
                                </Pressable>
                                <Pressable onPress={() => handleWhatsAppProvider(asset.contact.phone)} style={{ flex: 1, backgroundColor: '#064E3B', paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#059669' }}>
                                    <Text style={{ color: '#34D399', fontSize: 12, fontWeight: '700' }}>💬 WHATSAPP</Text>
                                </Pressable>
                            </View>
                        ) : null}

                        {asset.checklists && (
                            <View style={{ marginBottom: 12 }}>
                                {asset.checklists.preService && asset.checklists.preService.length > 0 && (
                                    <View style={{ marginBottom: 8 }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Pre-Service Checklist</Text>
                                        {asset.checklists.preService.map((task, idx) => (
                                            <Pressable key={idx} onPress={() => handleToggleChecklist(category, asset.id, 'preService', idx)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                {task.done ? <CheckSquare size={16} color="#10B981" /> : <Square size={16} color="#A1A1AA" />}
                                                <Text style={{ color: task.done ? '#10B981' : '#D4D4D8', fontSize: 12, marginLeft: 8 }}>{task.task}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                                {asset.checklists.postService && asset.checklists.postService.length > 0 && (
                                    <View>
                                        <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Post-Service Checklist</Text>
                                        {asset.checklists.postService.map((task, idx) => (
                                            <Pressable key={idx} onPress={() => handleToggleChecklist(category, asset.id, 'postService', idx)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                {task.done ? <CheckSquare size={16} color="#10B981" /> : <Square size={16} color="#A1A1AA" />}
                                                <Text style={{ color: task.done ? '#10B981' : '#D4D4D8', fontSize: 12, marginLeft: 8 }}>{task.task}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {asset.history && asset.history.length > 0 && (
                            <View style={{ marginBottom: 12, backgroundColor: '#09090B', padding: 8, borderRadius: 6 }}>
                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>Service History</Text>
                                {asset.history.map((h, i) => (
                                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: i !== asset.history.length - 1 ? 1 : 0, borderColor: '#27272A' }}>
                                        <Text style={{ color: '#D4D4D8', fontSize: 11 }}>{h.date}</Text>
                                        <Text style={{ color: '#D4D4D8', fontSize: 11, flex: 1, textAlign: 'center' }} numberOfLines={1}>{h.provider}</Text>
                                        <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '600' }}>₹{h.cost.toLocaleString()}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                            <Pressable onPress={() => { setActiveServiceAsset({ ...asset, category }); setIsLogServiceModalVisible(true); }} style={{ flex: 1, backgroundColor: '#3B82F6', paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}>
                                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>LOG SERVICE ✓</Text>
                            </Pressable>
                            <Pressable onPress={() => handleMarkScheduled(category, asset.id)} style={{ backgroundColor: isScheduled ? '#10B981' : '#EAB308', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, alignItems: 'center' }}>
                                <Text style={{ color: '#000', fontSize: 11, fontWeight: '800' }}>{isScheduled ? 'SCHEDULED ✓' : 'MARK SCHEDULED'}</Text>
                            </Pressable>
                            <Pressable onPress={() => handleSnoozeService(category, asset.id)} style={{ backgroundColor: '#3F3F46', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center' }}>
                                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>SNOOZE</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    // ==========================================
    // FUNCTION 6: Properties Circle Rates & Gov Check Simulator
    // ==========================================
    const [properties, setProperties] = useState([
        { 
            id: 'pr1', 
            name: 'Electronic City Plot 30x40', 
            type: 'Plot',
            location: 'Electronic City Phase 2, Bangalore',
            address: 'Plot 42, Sector 3',
            pincode: '560100',
            financials: {
                purchasePrice: 4000000,
                purchaseDate: '2020-05-15',
                marketValuation: 6500000,
                loan: {
                    active: true,
                    outstandingBalance: 1200000,
                    emi: 15000,
                    interestRate: 8.5
                },
                rental: {
                    active: false,
                    tenantName: '',
                    monthlyRent: 0,
                    leaseExpiry: ''
                },
                expenses: {
                    monthlyMaintenance: 0
                }
            },
            legal: {
                circleRate: 4200, 
                sizeSqFt: 1200,
                govSyncStatus: 'verified',
                taxes: {
                    propertyTaxStatus: 'Due Soon',
                    nextDueDate: '2026-08-15'
                },
                documents: [
                    { name: 'Sale Deed (Original)', secured: true, location: 'Bank Locker A12' },
                    { name: 'Khata Certificate', secured: true, location: 'Home Safe' },
                    { name: 'Encumbrance Certificate (EC)', secured: true, location: 'Digital Drive' },
                    { name: 'Mutation Extract', secured: false, location: '' }
                ],
                nominee: 'Wife (Primary), Son (Secondary)',
                handoverNotes: 'Contact lawyer Mr. Sharma for smooth title transfer if needed.',
                disputes: 'None'
            },
            operations: {
                maintenanceLog: [
                    { date: '2025-10-10', task: 'Boundary Wall Repair', cost: 12000 }
                ],
                insurance: {
                    active: false,
                    provider: '',
                    expiry: ''
                },
                utilities: {
                    electricityBoard: 'BESCOM',
                    waterBoard: 'BWSSB'
                },
                security: 'CCTV Active (Gate 1)'
            },
            market: {
                infrastructureUpdates: 'Metro Line Phase 3 approved 2km away.',
                comparableSales: 'Plot adjacent sold for ₹68L last month.',
                environmentalRisk: 'Low (No flood zones nearby)'
            },
            riskAssessment: {
                floodRisk: 'Low (Zone C)',
                legalRisk: '0% (Clean Title)',
                overallRiskScore: 12,
                heatmapData: [ { category: 'Market Crash', risk: 'Medium' }, { category: 'Tenant Default', risk: 'Low' } ]
            },
            sustainability: {
                solarGeneration: '320 kWh / month',
                waterUsage: '12,000 L / month',
                carbonFootprint: '2.1 tons CO2e',
                efficiencyScore: 78
            },
            predictiveAnalytics: {
                projectedROI5Yr: '85%',
                bestTimeToSell: 'Q3 2028',
                cashFlowTrend: 'Positive Growth'
            },
            goals: {
                targetValue: 10000000,
                timeline: '2030',
                progress: 65
            }
        }
    ]);
    const [isAddPropertyModalVisible, setIsAddPropertyModalVisible] = useState(false);
    const [isManagePropertyModalVisible, setIsManagePropertyModalVisible] = useState(false);
    const [isEditingPropertyProfile, setIsEditingPropertyProfile] = useState(false);
    const [editPropertyForm, setEditPropertyForm] = useState(null);
    const [activePropertyId, setActivePropertyId] = useState(null);
    const [activeAssetTab, setActiveAssetTab] = useState(1);
    const [isAgentDropdownVisible, setIsAgentDropdownVisible] = useState(false);
    const [activeGlobalAgent, setActiveGlobalAgent] = useState(null); // null = Portfolio Agent (Agent 16), 1-20 for other agents
    const [newPropertyForm, setNewPropertyForm] = useState({
        name: '', type: 'Plot', location: '', purchasePrice: '', purchaseDate: '', sizeSqFt: '', marketValuation: '', 
        nominee: '',
        loanActive: false, outstandingBalance: '', emi: '', interestRate: '',
        monthlyRent: '', leaseExpiry: '',
        propertyTaxStatus: 'Paid', nextDueDate: '',
        maintenanceLog: '', insuranceActive: false, insuranceProvider: '', insuranceExpiry: ''
    });
    
    const handleGovVerify = (id) => {
        setGovCheckingId(id);
        setTimeout(() => {
            setProperties(prev => prev.map(p => p.id === id ? { ...p, govSyncStatus: 'GOV SYNCED (Verified via KAVERCOM Portal)' } : p));
            setGovCheckingId(null);
            Alert.alert("Gov Site Sync Success", "Official circle rate and registration boundaries verified via State Land Records database.");
        }, 2000);
    };
    // ==========================================
    // FUNCTION 7: Emergency Fund & Wrong Investment Guard
    // ==========================================
    const [emergencyFund, setEmergencyFund] = useState(150000);
    const [riskInvestmentAttempt, setRiskInvestmentAttempt] = useState('');
    const [warningReport, setWarningReport] = useState(null);
    const runWrongInvestmentScan = () => {
        const amt = parseFloat(riskInvestmentAttempt) || 0;
        if (amt === 0) return;
        if (amt > emergencyFund * 0.5) {
            setWarningReport({
                status: 'DANGER: EXTREME RISK',
                msg: `Proposed allocation of ₹${amt.toLocaleString()} exceeds 50% of your current Volatility Shield Emergency fund (₹${emergencyFund.toLocaleString()}). This leveraged asset is flagged as highly volatile. Guard advisory strongly recommends avoiding this trap.`
            });
        } else {
            setWarningReport({
                status: 'SAFE TO PROCEED',
                msg: 'Transaction conforms to current safe discretionary caps.'
            });
        }
    };

    // --- Life Budget Helpers ---
    const handleSaveLifeBudget = () => {
        if (draftLifeBudget) {
            setLifeBudget(draftLifeBudget);
        }
        setIsEditingLifeBudget(false);
    };

    const handleLogLifeExpenseSubmit = () => {
        if (!activeLifeExpense || !lifeExpenseAmount) return;
        const amount = parseFloat(lifeExpenseAmount);
        if (isNaN(amount) || amount <= 0) return;

        setLifeBudget(prev => {
            const updated = { ...prev };
            const categoryType = activeLifeExpense.type; 
            
            updated[categoryType] = updated[categoryType].map(item => {
                if (item.id === activeLifeExpense.id) {
                    if (categoryType === 'savings') {
                        return { ...item, allocated: (item.allocated || 0) + amount };
                    } else {
                        return { ...item, spent: (item.spent || 0) + amount };
                    }
                }
                return item;
            });
            return updated;
        });
        
        setIsLogLifeExpenseModalVisible(false);
        setLifeExpenseAmount('');
        setActiveLifeExpense(null);
    };

    // --- To-Do Handlers ---
    const handleAddTodoSubmit = () => {
        if (!newTodoForm.title.trim()) return;
        const newTodo = {
            id: 't' + Date.now(),
            title: newTodoForm.title.trim(),
            done: false,
            category: newTodoForm.category || 'Personal',
            priority: newTodoForm.priority || 'Medium',
            dueDate: newTodoForm.dueDate || ''
        };
        setTodos(prev => [...prev, newTodo]);
        setIsAddTodoModalVisible(false);
        setNewTodoForm({ title: '', category: 'Finance', priority: 'Medium', dueDate: '' });
    };

    const handleDeleteTodo = (id) => {
        setTodos(prev => prev.filter(t => t.id !== id));
    };

    const toggleTodoDone = (id) => {
        setTodos(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
    };

    const interestData = calculateInterestReport();
    return (
        <View style={styles.container}>
            <View style={styles.statusBarSpacer} />
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => { setIsDrawerOpen(true); }}>
                    <Menu size={24} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {activeTab === 'flow' && 'Personal Money Flow'}
                    {(activeTab === 'financial_hub' || activeTab === 'sms' || activeTab === 'hub') && 'Financial Hub'}
                    {activeTab === 'banking' && 'Banking & Loans'}
                    {activeTab === 'p2p' && 'P2P Loans'}
                    {activeTab === 'splitwise' && 'Splitwise Expenses'}
                    {activeTab === 'renewals' && 'Renewals & Expiries'}
                    {activeTab === 'meds' && 'Medical Tracker'}
                    {activeTab === 'school' && 'School & Education'}
                    {activeTab === 'services' && 'Services Reminders'}
                    {activeTab === 'budgets' && 'Budgets & Limits'}
                    {activeTab === 'todo' && 'To Do List'}
                    {activeTab === 'properties' && 'Property Vault'}
                    {activeTab === 'crisis' && 'Volatility Shield'}
                </Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* 1. World-Class Personal Financial Decision Assistant */}
                {activeTab === 'flow' && (
                    <MoneyFlowView
                        transactions={transactions}
                        onAddTransaction={(newTx) => setTransactions(prev => [newTx, ...prev])}
                        onCategorizeTransaction={(txId, cat) => {
                            setTransactions(prev => prev.map(t => t.id === txId ? { ...t, category: cat, needsSort: false } : t));
                        }}
                        onDeleteTransaction={(txId) => setTransactions(prev => prev.filter(t => t.id !== txId))}
                        onUpdateTransaction={(updatedTx) => {
                            setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
                        }}
                        asOfDate={new Date().toISOString()}
                    />
                )}

                {/* ── Financial Hub (Banking, P2P, Splitwise) ── */}
                {activeTab === 'sms' && (
                    <View>
                        {/* SMS Parsing Logic */}
                        <View style={{ gap: 12 }}>
                            {(() => {
                                return smsInbox.map((item) => {
                                    const sms = item.data;
                                    const isAutoSorted = item.isAutoSorted;
                                    const selectedCat = smsSelectedCategories[sms.id] || sms.parsedCategory || (sms.type === 'INCOME' ? 'Income' : 'Bills');
                                    
                                    // Accordion/inline collapse for needs sorting
                                    const isSmsSelected = selectedSmsId === sms.id;

                                    return (
                                        <View key={item.feedId} style={{
                                            backgroundColor: '#18181B',
                                            borderRadius: 14,
                                            borderWidth: 1,
                                            borderColor: '#27272A',
                                            borderLeftWidth: 4,
                                            borderLeftColor: isAutoSorted ? '#10B981' : '#EF4444',
                                            overflow: 'hidden',
                                            marginBottom: 4
                                        }}>
                                            <Pressable onPress={() => setSelectedSmsId(isSmsSelected ? null : sms.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isAutoSorted ? '#10B98115' : '#EF444415', justifyContent: 'center', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 16 }}>✉️</Text>
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '750' }}>{sms.sender}</Text>
                                                    <Text style={{ color: '#71717A', fontSize: 11, marginTop: 2 }} numberOfLines={1}>{sms.text}</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                                                    <Text style={{ color: isAutoSorted ? '#10B981' : '#EF4444', fontSize: 10, fontWeight: '800' }}>
                                                        {isAutoSorted ? 'Sorted' : 'Needs Sort 🔴'}
                                                    </Text>
                                                </View>
                                            </Pressable>
                                            
                                            {/* Expanded Context Details */}
                                            {isSmsSelected && (
                                                <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: '#27272A', backgroundColor: '#09090B' }}>
                                                    <Text style={{ color: '#71717A', fontSize: 10, fontWeight: '800' }}>FULL SMS CONTENT</Text>
                                                    <View style={{ backgroundColor: '#18181B', padding: 10, borderRadius: 8, marginVertical: 8, borderWidth: 1, borderColor: '#27272A' }}>
                                                        <Text style={{ color: '#E4E4E7', fontSize: 12, lineHeight: 18 }}>{sms.text || sms.body}</Text>
                                                    </View>
                                                    
                                                    <View style={{ marginTop: 10 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 6 }}>Select Matching Category</Text>
                                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
                                                            {['Custom', 'Food', 'Travel', 'Entertainment', 'Rent', 'Shopping', 'Bills', 'Income', ...customCategories].map(c => (
                                                                <TouchableOpacity
                                                                    key={c}
                                                                    onPress={() => {
                                                                        if (c === 'Custom') {
                                                                            setSmsCustomInputActive(prev => ({ ...prev, [sms.id]: true }));
                                                                        } else {
                                                                            setSmsCustomInputActive(prev => ({ ...prev, [sms.id]: false }));
                                                                            setSmsSelectedCategories({ ...smsSelectedCategories, [sms.id]: c });
                                                                            if (sms.status === 'PARSED') {
                                                                                handleUpdateParsedSmsCategory(sms.id, c);
                                                                            }
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        backgroundColor: selectedCat === c ? '#6366F1' : '#27272A',
                                                                        paddingHorizontal: 12,
                                                                        paddingVertical: 6,
                                                                        borderRadius: 20,
                                                                        borderWidth: 1,
                                                                        borderColor: selectedCat === c ? '#818CF8' : '#3F3F46',
                                                                        marginRight: 6
                                                                    }}
                                                                >
                                                                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{c}</Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </ScrollView>
                                                        {smsCustomInputActive[sms.id] && (
                                                            <View style={{ marginTop: 8 }}>
                                                                <Text style={{ color: '#71717A', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>Enter Custom Category</Text>
                                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                                    <TextInput
                                                                        placeholder="e.g. Health, Tax"
                                                                        placeholderTextColor="#52525B"
                                                                        value={smsCustomName[sms.id] || ''}
                                                                        onChangeText={text => setSmsCustomName(prev => ({ ...prev, [sms.id]: text }))}
                                                                        style={[styles.formInput, { flex: 1, height: 36, paddingVertical: 4, color: '#FFF' }]}
                                                                    />
                                                                    <TouchableOpacity
                                                                        onPress={() => {
                                                                            const finalCat = (smsCustomName[sms.id] || '').trim();
                                                                            if (!finalCat) {
                                                                                Alert.alert("Error", "Category name cannot be empty.");
                                                                                return;
                                                                            }
                                                                            if (!customCategories.includes(finalCat)) {
                                                                                setCustomCategories([...customCategories, finalCat]);
                                                                            }
                                                                            setSmsSelectedCategories(prev => ({ ...prev, [sms.id]: finalCat }));
                                                                            setSmsCustomInputActive(prev => ({ ...prev, [sms.id]: false }));
                                                                            if (sms.status === 'PARSED') {
                                                                                handleUpdateParsedSmsCategory(sms.id, finalCat);
                                                                            }
                                                                            Alert.alert("Success", `Category set to ${finalCat}`);
                                                                        }}
                                                                        style={{ backgroundColor: '#6366F1', paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' }}
                                                                    >
                                                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Save</Text>
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>
                                                        )}
                                                    </View>
                                                    
                                                    {sms.status === 'UNPARSED' ? (
                                                        <TouchableOpacity 
                                                            style={{ marginTop: 14, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }} 
                                                            onPress={() => handleSmsSync(sms, selectedCat)}
                                                        >
                                                            <Text style={{ color: '#000', fontSize: 12, fontWeight: '800' }}>Confirm Sort & Sync under "${selectedCat}"</Text>
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '750' }}>✓ Archived & Synced</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    );
                                });
                            })()}
                        </View>
                            {/* Synced SMS Archive */}
                            {syncedSmsArchive.length > 0 && (
                                <View style={{ marginTop: 20 }}>
                                    <Text style={[styles.subHeader, { marginBottom: 10 }]}>📦 Synced Archive ({syncedSmsArchive.length})</Text>
                                    <Text style={{ color: '#71717A', fontSize: 10, marginBottom: 10, fontStyle: 'italic' }}>
                                        Persisted data — safe even if original SMS is deleted from device
                                    </Text>
                                    {syncedSmsArchive.map((item, idx) => (
                                        <View key={`archive-${idx}`} style={[styles.smsCard, { borderLeftWidth: 3, borderLeftColor: '#10B981' }]}>
                                            <View style={styles.row}>
                                                <Text style={styles.smsSender}>{item.sender}</Text>
                                                <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>ARCHIVED</Text>
                                            </View>
                                            <Text style={styles.smsText} numberOfLines={2}>{item.body}</Text>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                                <Text style={{ color: '#71717A', fontSize: 10 }}>{item.syncedDate || ''}</Text>
                                                <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>{item.category}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                {/* ───────────────────────────────────────────────────────────── */}
                {/* ── 🤝 COMPLETE P2P LOANS MODULE (13 SCREENS SYSTEM) ────── */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === 'p2p' && (
                    <View style={{ gap: 16 }}>
                        {/* P2P Module Sub-View Switcher Bar */}
                        <View style={{ flexDirection: 'row', backgroundColor: '#18181B', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#27272A' }}>
                            {[
                                { key: 'dashboard', label: '📊 Overview' },
                                { key: 'list', label: '📋 Loans List' },
                                { key: 'entity', label: '🧑 Borrower View' }
                            ].map(v => (
                                <TouchableOpacity
                                    key={v.key}
                                    onPress={() => setActiveP2PView(v.key)}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 8,
                                        alignItems: 'center',
                                        borderRadius: 8,
                                        backgroundColor: activeP2PView === v.key ? '#6366F1' : 'transparent'
                                    }}
                                >
                                    <Text style={{ color: activeP2PView === v.key ? '#FFF' : '#A1A1AA', fontSize: 11, fontWeight: '750' }}>{v.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* ── P2P SUB-VIEW 1: GLOBAL DASHBOARD ('dashboard') ── */}
                        {activeP2PView === 'dashboard' && (
                            <View style={{ gap: 16 }}>
                                {/* Top Receivable Card Header */}
                                <View style={{ backgroundColor: '#18181B', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#27272A', gap: 12 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '600' }}>Receivable</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <TouchableOpacity 
                                                onPress={() => setShowAddLoanModal(true)} 
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366F1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                                            >
                                                <Plus size={14} color="#FFF" />
                                                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>Add Loan</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => setShowCalculator(true)} style={{ backgroundColor: '#27272A', padding: 6, borderRadius: 8 }}>
                                                <Calculator size={18} color="#A1A1AA" />
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                onPress={() => Alert.alert('Loan Reminders', 'No active overdue loan alerts right now. Notifications will appear when installments are due.')} 
                                                style={{ backgroundColor: '#27272A', padding: 6, borderRadius: 8 }}
                                            >
                                                <Bell size={18} color="#A1A1AA" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                                        <Text style={{ color: '#10B981', fontSize: 24, fontWeight: '800' }}>₹9,789,625.20</Text>
                                        <Text style={{ color: '#71717A', fontSize: 12 }}>as of today.</Text>
                                    </View>

                                    {/* Dual Breakdown Box */}
                                    <View style={{ flexDirection: 'row', backgroundColor: '#09090B', borderRadius: 12, padding: 14, marginTop: 4, borderWidth: 1, borderColor: '#27272A' }}>
                                        <TouchableOpacity 
                                            onPress={() => {
                                                setP2pCategoryTab('GIVEN');
                                                setActiveP2PView('list');
                                            }}
                                            style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#27272A', paddingRight: 10 }}
                                        >
                                            <Text style={{ color: '#71717A', fontSize: 11 }}>You will get</Text>
                                            <Text style={{ color: '#10B981', fontSize: 15, fontWeight: '800', marginTop: 4 }}>₹22,322,341.64</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={() => {
                                                setP2pCategoryTab('TAKEN');
                                                setActiveP2PView('list');
                                            }}
                                            style={{ flex: 1, paddingLeft: 14 }}
                                        >
                                            <Text style={{ color: '#71717A', fontSize: 11 }}>You will pay</Text>
                                            <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '800', marginTop: 4 }}>₹12,532,716.44</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>


                                {/* This Month Interest Widget */}
                                <View style={{ gap: 8 }}>
                                    <Text style={{ color: '#E4E4E7', fontSize: 13, fontWeight: '700' }}>This Month Interest</Text>
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity 
                                            onPress={() => {
                                                setP2pCategoryTab('GIVEN');
                                                setActiveP2PView('list');
                                            }}
                                            style={{ flex: 1, backgroundColor: '#18181B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                        >
                                            <View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <ArrowDownLeft size={14} color="#10B981" />
                                                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>Receivable</Text>
                                                </View>
                                                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 4 }}>₹218,012.67</Text>
                                            </View>
                                            <Text style={{ color: '#71717A', fontSize: 16 }}>›</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={() => {
                                                setP2pCategoryTab('TAKEN');
                                                setActiveP2PView('list');
                                            }}
                                            style={{ flex: 1, backgroundColor: '#18181B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                        >
                                            <View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <ArrowUpRight size={14} color="#F97316" />
                                                    <Text style={{ color: '#F97316', fontSize: 12, fontWeight: '700' }}>Payable</Text>
                                                </View>
                                                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 4 }}>₹86,387.80</Text>
                                            </View>
                                            <Text style={{ color: '#71717A', fontSize: 16 }}>›</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Loans Due & Collections Banners */}
                                <View style={{ gap: 10 }}>
                                    <Text style={{ color: '#E4E4E7', fontSize: 13, fontWeight: '700' }}>Loans Due</Text>
                                    <TouchableOpacity 
                                        onPress={() => {
                                            setP2pCategoryTab('GIVEN');
                                            setActiveP2PView('list');
                                        }}
                                        style={{ backgroundColor: '#18181B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <Text style={{ fontSize: 18 }}>🧑‍🤝‍🧑</Text>
                                            <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '700' }}>Collections</Text>
                                        </View>
                                        <Text style={{ color: '#71717A', fontSize: 16 }}>›</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        onPress={() => setShowCalculator(true)}
                                        style={{ backgroundColor: '#18181B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                    >
                                        <Text style={{ color: '#D4D4D8', fontSize: 13, fontWeight: '600' }}>You will be debt free</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '700' }}>Check</Text>
                                            <Text style={{ color: '#10B981', fontSize: 14 }}>›</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setActiveTab('reports')} style={{ backgroundColor: '#18181B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <Text style={{ fontSize: 18 }}>📄</Text>
                                            <Text style={{ color: '#EC4899', fontSize: 14, fontWeight: '700' }}>Reports</Text>
                                        </View>
                                        <Text style={{ color: '#71717A', fontSize: 16 }}>›</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* ── P2P SUB-VIEW 2: LOANS LIST VIEW ('list') ── */}
                        {activeP2PView === 'list' && (
                            <View style={{ gap: 14 }}>
                                 {/* Filter Bar & Search & Add Loan Button */}
                                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                    <TouchableOpacity style={{ backgroundColor: '#18181B', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#27272A' }}>
                                        <Layers size={18} color="#A1A1AA" />
                                    </TouchableOpacity>
                                    <TextInput 
                                        placeholder="Search loans..." 
                                        placeholderTextColor="#71717A" 
                                        value={p2pSearchQuery}
                                        onChangeText={setP2pSearchQuery}
                                        style={{ flex: 1, backgroundColor: '#18181B', color: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#27272A', fontSize: 12 }}
                                    />
                                    <TouchableOpacity 
                                        onPress={() => setShowAddLoanModal(true)} 
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366F1', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 }}
                                    >
                                        <Plus size={16} color="#FFF" />
                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>Add Loan</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* TAKEN | GIVEN | SETTLED Category Tabs */}
                                <View style={{ flexDirection: 'row', backgroundColor: '#18181B', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#27272A' }}>
                                    {[
                                        { key: 'TAKEN', label: `TAKEN (${loansList.filter(l => l.type === 'taken').length})` },
                                        { key: 'GIVEN', label: `GIVEN (${loansList.filter(l => l.type === 'given').length})` },
                                        { key: 'SETTLED', label: `SETTLED (${loansList.filter(l => l.type === 'settled').length})` }
                                    ].map(tab => (
                                        <TouchableOpacity 
                                            key={tab.key} 
                                            onPress={() => setP2pCategoryTab(tab.key)}
                                            style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: p2pCategoryTab === tab.key ? '#6366F1' : 'transparent' }}
                                        >
                                            <Text style={{ color: p2pCategoryTab === tab.key ? '#FFF' : '#A1A1AA', fontSize: 11, fontWeight: '700' }}>{tab.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* List of Loan Entity Cards */}
                                <View style={{ gap: 12 }}>
                                    {loansList
                                        .filter(item => p2pCategoryTab === 'SETTLED' ? item.type === 'settled' : item.type === p2pCategoryTab.toLowerCase())
                                        .filter(item => item.name.toLowerCase().includes(p2pSearchQuery.toLowerCase()))
                                        .map(entity => {
                                            const firstLoan = entity.subLoans[0];
                                            const totalPrincipal = entity.subLoans.reduce((sum, l) => sum + l.principal, 0);
                                            const totalDue = totalPrincipal * 1.12;

                                            return (
                                                <TouchableOpacity 
                                                    key={entity.id}
                                                    onPress={() => {
                                                        setSelectedContactId(entity.id);
                                                        if (firstLoan) setSelectedSubLoanId(firstLoan.id);
                                                        setActiveP2PView('entity');
                                                    }}
                                                    style={{ backgroundColor: '#18181B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#27272A', gap: 10 }}
                                                >
                                                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                                                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p2pCategoryTab === 'TAKEN' ? '#F97316' : '#10B981', justifyContent: 'center', alignItems: 'center' }}>
                                                            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>{entity.name.substring(0, 2).toUpperCase()}</Text>
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>{entity.name}</Text>
                                                            <Text style={{ color: '#71717A', fontSize: 11, marginTop: 2 }}>
                                                                {entity.subLoans.length} loan{entity.subLoans.length > 1 ? 's' : ''} ({entity.subLoans.map(s => s.id).join(', ')})
                                                            </Text>
                                                        </View>
                                                        {p2pCategoryTab === 'SETTLED' && (
                                                            <View style={{ backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                                                <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>SETTLED</Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#27272A' }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Net Amount Due:</Text>
                                                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'baseline' }}>
                                                            <Text style={{ color: '#71717A', fontSize: 11, textDecorationLine: 'line-through' }}>₹{totalPrincipal.toLocaleString()}</Text>
                                                            <Text style={{ color: p2pCategoryTab === 'TAKEN' ? '#F87171' : '#34D399', fontSize: 13, fontWeight: '800' }}>₹{Math.round(totalDue).toLocaleString()}</Text>
                                                        </View>
                                                    </View>

                                                    {firstLoan && (
                                                        <Text style={{ color: '#F59E0B', fontSize: 10, fontStyle: 'italic' }}>
                                                            • Upcoming installment of ₹53,518.89 on 06 Sep 2026
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                </View>
                            </View>
                        )}

                        {/* ── P2P SUB-VIEW 3: BORROWER ENTITY DETAIL ('entity') ── */}
                        {activeP2PView === 'entity' && (
                            <View style={{ gap: 14 }}>
                                {/* Top Back Bar */}
                                <TouchableOpacity onPress={() => setActiveP2PView('loans_list')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <ArrowLeft size={16} color="#A1A1AA" />
                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700' }}>Back to Loans List</Text>
                                </TouchableOpacity>

                                {/* Dark Balance Header Card */}
                                <View style={{ backgroundColor: '#09090B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#27272A', gap: 10 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '600' }}>Loan Balance with ICICI Personal Loan</Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '800' }}>₹0.00</Text>
                                            <Text style={{ color: '#71717A', fontSize: 10 }}>Loan Given</Text>
                                        </View>
                                        <Text style={{ color: '#71717A', fontSize: 16 }}>-</Text>
                                        <View>
                                            <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '800' }}>₹4,647,860.50</Text>
                                            <Text style={{ color: '#71717A', fontSize: 10 }}>Loan Taken</Text>
                                        </View>
                                        <Text style={{ color: '#71717A', fontSize: 16 }}>=</Text>
                                        <View>
                                            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '900' }}>₹4,647,860.50</Text>
                                            <Text style={{ color: '#71717A', fontSize: 10 }}>Balance</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Sub Tabs (Pending vs History) */}
                                <View style={{ flexDirection: 'row', backgroundColor: '#18181B', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#27272A' }}>
                                    {['Pending', 'History'].map(tab => (
                                        <TouchableOpacity 
                                            key={tab} 
                                            onPress={() => setEntitySubTab(tab)}
                                            style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: entitySubTab === tab ? '#6366F1' : 'transparent' }}
                                        >
                                            <Text style={{ color: entitySubTab === tab ? '#FFF' : '#A1A1AA', fontSize: 12, fontWeight: '700' }}>{tab}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Pending Sub-Tab Content */}
                                {entitySubTab === 'Pending' && (
                                    <View style={{ gap: 12 }}>
                                        <Text style={{ color: '#E4E4E7', fontSize: 13, fontWeight: '700' }}>Pending Loans (2)</Text>
                                        
                                        {/* Loan 110 Card */}
                                        <View style={{ backgroundColor: '#18181B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#27272A', gap: 10 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center' }}>
                                                        <ArrowDownLeft size={18} color="#EF4444" />
                                                    </View>
                                                    <View>
                                                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>You took a loan</Text>
                                                        <Text style={{ color: '#71717A', fontSize: 11 }}>Taken on 6th Apr, 2026 (3 months)</Text>
                                                    </View>
                                                </View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700' }}>Loan-110</Text>
                                            </View>

                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#27272A' }}>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Amount Due:</Text>
                                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'baseline' }}>
                                                    <Text style={{ color: '#71717A', fontSize: 11, textDecorationLine: 'line-through' }}>₹2,500,000.00</Text>
                                                    <Text style={{ color: '#F87171', fontSize: 14, fontWeight: '800' }}>₹2,964,926.02</Text>
                                                </View>
                                            </View>

                                            <Text style={{ color: '#F59E0B', fontSize: 11 }}>
                                                • Upcoming installment of ₹53,518.89 on 06 Sep 2026
                                            </Text>

                                            {/* Sub Navigation to Summary & Interest Ledger */}
                                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        setSelectedSubLoanId('Loan-110');
                                                        setEntityDetailTab('Summary');
                                                    }}
                                                    style={{ flex: 1, backgroundColor: '#6366F120', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#6366F140' }}
                                                >
                                                    <Text style={{ color: '#818CF8', fontSize: 11, fontWeight: '700' }}>View Summary & Actions</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    onPress={() => setActiveP2PView('interest_ledger')}
                                                    style={{ flex: 1, backgroundColor: '#10B98120', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#10B98140' }}
                                                >
                                                    <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '700' }}>Interest Schedule ›</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* SETTLE UP Floating Action */}
                                        <TouchableOpacity 
                                            onPress={() => Alert.alert('Settle Up', 'Are you sure you want to settle the outstanding balance of ₹4,647,860.50?')}
                                            style={{ backgroundColor: '#F97316', paddingVertical: 14, borderRadius: 12, alignItems: 'center', shadowColor: '#F97316', shadowRadius: 10, shadowOpacity: 0.4 }}
                                        >
                                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>SETTLE UP</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* History Sub-Tab Content */}
                                {entitySubTab === 'History' && (
                                    <View style={{ gap: 10 }}>
                                        <View style={{ backgroundColor: '#18181B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#27272A', gap: 10 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Aug 2026 (1)</Text>
                                                <Text style={{ color: '#F87171', fontSize: 13, fontWeight: '800' }}>₹53,529.13</Text>
                                            </View>
                                            <View style={{ backgroundColor: '#09090B', padding: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <ArrowUpRight size={14} color="#F87171" />
                                                    <Text style={{ color: '#D4D4D8', fontSize: 12 }}>ICICI Personal Loan (06 Aug 2026)</Text>
                                                </View>
                                                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>₹53,529.13</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Summary View Section inside Entity */}
                                {entityDetailTab === 'Summary' && (
                                    <View style={{ gap: 14, marginTop: 8 }}>
                                        {/* Principal Progress Card */}
                                        <View style={{ backgroundColor: '#18181B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#27272A', gap: 10 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <View>
                                                    <Text style={{ color: '#71717A', fontSize: 11 }}>Principal Paid</Text>
                                                    <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '800' }}>₹132,539.99</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={{ color: '#71717A', fontSize: 11 }}>Principal Outstanding</Text>
                                                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>₹2,367,460.01</Text>
                                                </View>
                                            </View>
                                            {/* Progress Bar */}
                                            <View style={{ height: 8, backgroundColor: '#27272A', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                                                <View style={{ width: '5%', height: '100%', backgroundColor: '#10B981' }} />
                                            </View>
                                            <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>5% cleared</Text>
                                        </View>

                                        {/* Financial Breakdown Box */}
                                        <View style={{ backgroundColor: '#18181B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#27272A', gap: 10 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Loan Amount</Text>
                                                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>₹2,500,000.00 ›</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Interest</Text>
                                                    <View style={{ backgroundColor: '#6366F120', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                        <Text style={{ color: '#818CF8', fontSize: 9, fontWeight: '800' }}>SI: 9.99% per Year</Text>
                                                    </View>
                                                </View>
                                                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>₹81,606.05 ›</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Total Repayment</Text>
                                                    <View style={{ backgroundColor: '#27272A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 9, fontWeight: '800' }}>P+I</Text>
                                                    </View>
                                                </View>
                                                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>₹214,146.04 ›</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#27272A' }}>
                                                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>Amount Due:</Text>
                                                <Text style={{ color: '#F87171', fontSize: 15, fontWeight: '900' }}>₹2,964,926.02</Text>
                                            </View>
                                        </View>

                                        {/* Security & Safeguards Section */}
                                        <View style={{ gap: 10 }}>
                                            <Text style={{ color: '#E4E4E7', fontSize: 13, fontWeight: '700' }}>Secure Your Loan</Text>
                                            
                                            {/* Mobile Lock Card */}
                                            <View style={{ backgroundColor: '#18181B', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                                                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#F59E0B20', justifyContent: 'center', alignItems: 'center' }}>
                                                    <ShieldCheck size={20} color="#F59E0B" />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Secure Loans with Mobile Lock</Text>
                                                    <Text style={{ color: '#71717A', fontSize: 10, marginTop: 2 }}>Add a lock to borrower devices to protect your loan.</Text>
                                                </View>
                                            </View>

                                            {/* Guarantor Card */}
                                            <View style={{ backgroundColor: '#18181B', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                                    <Users size={18} color="#6366F1" />
                                                    <View>
                                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Add Guarantor <Text style={{ color: '#71717A', fontSize: 10 }}>(maximum 2)</Text></Text>
                                                        <Text style={{ color: '#71717A', fontSize: 10 }}>Enhance loan security</Text>
                                                    </View>
                                                </View>
                                                <TouchableOpacity style={{ backgroundColor: '#6366F1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                                                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>ADD</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Repayments Control Bar */}
                                        <View style={{ backgroundColor: '#18181B', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#27272A', gap: 10 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Repayments</Text>
                                                <TouchableOpacity onPress={() => setActiveP2PView('interest_ledger')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Text style={{ color: '#6366F1', fontSize: 11, fontWeight: '700' }}>View Payment Plan</Text>
                                                    <Text style={{ color: '#6366F1', fontSize: 12 }}>›</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <View style={{ backgroundColor: '#09090B', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ backgroundColor: '#6366F120', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, alignItems: 'center' }}>
                                                    <Text style={{ color: '#818CF8', fontSize: 14, fontWeight: '900' }}>6</Text>
                                                    <Text style={{ color: '#818CF8', fontSize: 9, fontWeight: '700' }}>Sep'26</Text>
                                                </View>
                                                <View style={{ flex: 1, paddingLeft: 12 }}>
                                                    <Text style={{ color: '#71717A', fontSize: 10 }}>To be paid: <Text style={{ color: '#FFF', fontWeight: '800' }}>₹53,518.89</Text></Text>
                                                    <Text style={{ color: '#71717A', fontSize: 10, marginTop: 2 }}>Remaining Balance: ₹2,333,650.22</Text>
                                                </View>
                                            </View>

                                            {/* Action Buttons: Skip | Paid Partially | Mark as Paid */}
                                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                                <TouchableOpacity 
                                                    onPress={() => Alert.alert('Skip Installment', 'Installment skipped to next billing cycle.')}
                                                    style={{ flex: 1, backgroundColor: '#27272A', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                                                >
                                                    <Text style={{ color: '#D4D4D8', fontSize: 11, fontWeight: '700' }}>Skip</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    onPress={() => Alert.alert('Paid Partially', 'Enter amount paid partially.')}
                                                    style={{ flex: 1, backgroundColor: '#6366F120', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#6366F140' }}
                                                >
                                                    <Text style={{ color: '#818CF8', fontSize: 11, fontWeight: '700' }}>Paid Partially</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    onPress={() => Alert.alert('Mark as Paid', 'Payment of ₹53,518.89 recorded into ledger.')}
                                                    style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                                                >
                                                    <Text style={{ color: '#000', fontSize: 11, fontWeight: '900' }}>Mark as Paid</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Reminders & WhatsApp Trigger */}
                                        <View style={{ backgroundColor: '#18181B', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#27272A', gap: 10 }}>
                                            <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Payment of ₹53,518.89 is due in 1 month, 7 days</Text>
                                            <TouchableOpacity 
                                                onPress={() => Linking.openURL('https://wa.me/?text=Reminder:%20Payment%20of%20Rs.53518.89%20for%20ICICI%20Personal%20Loan%20is%20due.')}
                                                style={{ backgroundColor: '#25D36620', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#25D36640' }}
                                            >
                                                <Text style={{ color: '#25D366', fontSize: 12, fontWeight: '800' }}>Remind now via WhatsApp / SMS ›</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ── P2P SUB-VIEW 4: INTEREST DETAILS LEDGER ('interest_ledger') ── */}
                        {activeP2PView === 'interest_ledger' && (
                            <View style={{ gap: 14 }}>
                                <TouchableOpacity onPress={() => setActiveP2PView('entity')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <ArrowLeft size={16} color="#A1A1AA" />
                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700' }}>Back to Loan Details</Text>
                                </TouchableOpacity>

                                <View style={{ backgroundColor: '#18181B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#27272A', gap: 10 }}>
                                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Interest Details</Text>
                                    <Text style={{ color: '#71717A', fontSize: 11 }}>ICICI Personal Loan (Loan-110)</Text>

                                    <View style={{ backgroundColor: '#09090B', borderRadius: 10, padding: 12, gap: 6, marginTop: 4 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#71717A', fontSize: 11 }}>Simple Interest Rate</Text>
                                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>9.99% per Year</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#71717A', fontSize: 11 }}>Monthly Interest</Text>
                                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>₹19,709.10 (0.83%/mo)</Text>
                                        </View>
                                    </View>

                                    <View style={{ gap: 6, marginTop: 4 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Interest Incurred</Text>
                                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>₹81,606.06</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Interest Paid</Text>
                                            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>₹81,606.05</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Interest Outstanding</Text>
                                            <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '700' }}>₹0.01</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Month by Month Interest Schedule List */}
                                <View style={{ gap: 10 }}>
                                    {/* July - Pay in Advance */}
                                    <View style={{ backgroundColor: '#18181B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>July</Text>
                                            <Text style={{ color: '#71717A', fontSize: 10 }}>06 Jul 2026 - 05 Aug 2026</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>₹19,988.33 <Text style={{ color: '#10B981' }}>₹0.01</Text></Text>
                                            <TouchableOpacity style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                                                <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>Pay in Advance</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Past Paid Months */}
                                    {['June', 'May', 'April'].map((month, idx) => (
                                        <View key={month} style={{ backgroundColor: '#18181B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View>
                                                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{month}</Text>
                                                <Text style={{ color: '#71717A', fontSize: 10 }}>06 {month.substring(0, 3)} 2026 - 05 Aug 2026</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                                <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '700' }}>₹{(20265 + idx * 275).toLocaleString()}.21</Text>
                                                <View style={{ backgroundColor: '#27272A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '800' }}>Paid</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* ── Financial Hub (Banking, P2P, Splitwise) ── */}
                {(activeTab === 'sms' || activeTab === 'banking' || activeTab === 'financial_hub' || activeTab === 'hub') && (
                    <View style={styles.card}>
                        {/* Highest Interest Report Card */}
                        {interestData.highestBank && showLeakWarning && (
                            <View style={{ backgroundColor: '#1E1B4B', padding: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#4338CA', gap: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <AlertTriangle size={18} color="#FBBF24" />
                                        <Text style={{ color: '#FBBF24', fontSize: 13, fontWeight: '800' }}>Interest Leak Warning</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setShowLeakWarning(false)} style={{ padding: 4 }}>
                                        <X size={16} color="#A5B4FC" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={{ color: '#E0E7FF', fontSize: 12, lineHeight: 17 }}>
                                    You are paying the highest interest at <Text style={{ fontWeight: '800', color: '#FFF' }}>{interestData.highestBank} Bank</Text>.
                                    Total interest cost: <Text style={{ fontWeight: '800', color: '#FFF' }}>₹{Math.round(interestData.report[interestData.highestBank].monthly).toLocaleString()}/mo</Text> (₹{Math.round(interestData.report[interestData.highestBank].yearly).toLocaleString()}/yr).
                                </Text>
                                <Text style={{ color: '#A5B4FC', fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>
                                    💡 Actionable Tip: Prioritize prepaying or closing loans under {interestData.highestBank} first to stop this leak!
                                </Text>
                            </View>
                        )}

                        {Object.keys(interestData.report).length > 0 && (
                            <View style={{ backgroundColor: '#18181B', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#27272A' }}>
                                <Text style={{ color: '#E4E4E7', fontSize: 12, fontWeight: '800', marginBottom: 8 }}>🏦 Bank-wise Monthly Interest Cost</Text>
                                {Object.keys(interestData.report).map(bankName => (
                                    <View key={bankName} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#27272A' }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>{bankName} Bank</Text>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '700' }}>₹{Math.round(interestData.report[bankName].monthly).toLocaleString()}/mo</Text>
                                            <Text style={{ color: '#71717A', fontSize: 10 }}>₹{Math.round(interestData.report[bankName].yearly).toLocaleString()}/yr</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={styles.balancesGrid}>
                            {/* Add Custom Loan Global Button */}
                            <View style={{ marginBottom: 16, width: '100%' }}>
                                {!addingCustomLoan ? (
                                    <TouchableOpacity onPress={() => setAddingCustomLoan(true)} style={{ backgroundColor: '#10B981', padding: 12, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                                        <Plus size={16} color="#000" />
                                        <Text style={{ color: '#000', fontSize: 12, fontWeight: '800' }}>Add Custom Loan (New Lender)</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <InlineLoanForm allowCustomBank onSave={handleAddInlineLoan} onCancel={() => setAddingCustomLoan(false)} />
                                )}
                            </View>

                            {Object.keys(bankBalances).map(bank => {
                                const matchingLoans = loans.filter(l => 
                                    (l.bank && l.bank.toLowerCase() === bank.toLowerCase()) ||
                                    (!l.bank && l.name.toLowerCase().includes(bank.toLowerCase()))
                                );
                                return (
                                    <View key={bank} style={styles.bankBalanceCard}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Landmark size={20} color="#6366F1" />
                                                <Text style={styles.bankName}>{bank === 'Dokra Group' ? 'Dokra Group' : bank + ' Bank'}</Text>
                                            </View>
                                            {bank !== 'Dokra Group' && <Text style={styles.bankBalance}>₹{bankBalances[bank].toLocaleString()}</Text>}
                                        </View>
                                        <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#27272A' }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <Text style={{ color: '#E4E4E7', fontSize: 11, fontWeight: '800' }}>
                                                    {matchingLoans.length > 0 ? "🏛️ Active Loans" : "🏛️ No Loans"}
                                                </Text>
                                                <Pressable onPress={() => setAddingLoanBank(addingLoanBank === bank ? null : bank)} style={{ backgroundColor: '#27272A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                                                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{addingLoanBank === bank ? 'Cancel' : '➕ Add Loan'}</Text>
                                                </Pressable>
                                            </View>
                                            {addingLoanBank === bank && (
                                                <InlineLoanForm bank={bank} onSave={handleAddInlineLoan} />
                                            )}
                                            {matchingLoans.map(loan => {
                                                const isAmortSelected = selectedAmortLoan && selectedAmortLoan.id === loan.id;
                                                const stats = calculateLoanStats(loan);
                                                
                                                return (
                                                    <View key={loan.id} style={{ marginTop: 6, backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: loan.isClosed ? '#10B981' : '#3F3F46' }}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>{loan.name}</Text>
                                                                <Text style={{ color: '#71717A', fontSize: 10, marginTop: 2 }}>{loan.type} • {loan.interestRate}% Interest</Text>
                                                            </View>
                                                            <View style={{ alignItems: 'flex-end' }}>
                                                                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>₹{loan.principal.toLocaleString()}</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10, marginTop: 2 }}>EMI: ₹{loan.emi.toLocaleString()}/mo</Text>
                                                            </View>
                                                        </View>
                                                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                                                            <TouchableOpacity onPress={() => setSelectedAmortLoan(isAmortSelected ? null : loan)} style={{ flex: 1, backgroundColor: '#27272A', paddingVertical: 6, borderRadius: 6, alignItems: 'center' }}>
                                                                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{isAmortSelected ? 'Hide Details' : 'Show Details / Actions'}</Text>
                                                            </TouchableOpacity>
                                                            {!loan.isClosed && (
                                                                <TouchableOpacity 
                                                                    onPress={() => {
                                                                        Alert.alert(
                                                                            "Close Loan",
                                                                            "Are you sure you want to mark this loan as fully closed/paid?",
                                                                            [
                                                                                { text: "Cancel" },
                                                                                { 
                                                                                    text: "Confirm Close", 
                                                                                    onPress: () => {
                                                                                        setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, isClosed: true } : l));
                                                                                        Alert.alert("Success", "Loan marked as closed.");
                                                                                    } 
                                                                                }
                                                                            ]
                                                                        );
                                                                    }} 
                                                                    style={{ backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B98140', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, justifyContent: 'center' }}
                                                                >
                                                                    <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>Close</Text>
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>

                                                        {isAmortSelected && (
                                                            <>
                                                                <View style={{ height: 1, backgroundColor: '#27272A', marginVertical: 10 }} />
                                                                <View style={{ gap: 6 }}>
                                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                                        <Text style={{ color: '#71717A', fontSize: 11 }}>Tenure Paid:</Text>
                                                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{loan.emisPaidCount} / {loan.tenureMonths} Months</Text>
                                                                    </View>
                                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                                        <Text style={{ color: '#71717A', fontSize: 11 }}>Prepayments Done:</Text>
                                                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{loan.prepayments.length} (Total: ₹{loan.prepayments.reduce((s, p) => s + p.amount, 0).toLocaleString()})</Text>
                                                                    </View>
                                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                                        <Text style={{ color: '#71717A', fontSize: 11 }}>Topups Taken:</Text>
                                                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{loan.topups.length} (Total: ₹{loan.topups.reduce((s, t) => s + t.amount, 0).toLocaleString()})</Text>
                                                                    </View>
                                                                </View>

                                                                {/* AI Amortization alpha leak analysis */}
                                                                {(() => {
                                                                    const alpha = stats.expectedValue - stats.principal;
                                                                    return (
                                                                        <View style={{ marginTop: 12, padding: 10, backgroundColor: '#6366F110', borderRadius: 10, borderWidth: 1, borderColor: '#6366F125', gap: 4 }}>
                                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                                <Activity size={12} color="#8B5CF6" />
                                                                                <Text style={{ color: '#E9D5FF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>AI CREDIT MONITOR</Text>
                                                                            </View>
                                                                            <Text style={{ color: '#D4D4D8', fontSize: 11, lineHeight: 16 }}>
                                                                                Risk Index: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Low (94% Conf.)</Text> • Benchmarked against FD baseline, this loan generates an extra <Text style={{ color: '#10B981', fontWeight: 'bold' }}>₹{Math.round(alpha).toLocaleString()}</Text> in Alpha.
                                                                            </Text>
                                                                        </View>
                                                                    );
                                                                })()}
                                                            </>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* 4. Flattened Lifecycle Guard Sections */}
                {activeTab === 'renewals' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Comprehensive Life Guard</Text>
                        
                        {/* Add New Expiry Form */}
                        <View style={{ marginBottom: 20, backgroundColor: '#09090B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                            <Text style={{ color: '#E4E4E7', fontSize: 13, fontWeight: '700', marginBottom: 12 }}>+ Add New Tracker</Text>
                            <TextInput
                                placeholder="Title (e.g. Car Insurance)"
                                placeholderTextColor="#71717A"
                                style={{ backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13, marginBottom: 8 }}
                                value={newExpiryTitle}
                                onChangeText={setNewExpiryTitle}
                            />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <TextInput
                                    placeholder="Expiry Date (YYYY-MM-DD)"
                                    placeholderTextColor="#71717A"
                                    style={{ flex: 1, backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }}
                                    value={newExpiryDate}
                                    onChangeText={setNewExpiryDate}
                                />
                                <Pressable onPress={() => setShowNewExpiryDatePicker(true)} style={{ backgroundColor: '#27272A', padding: 10, borderRadius: 8 }}>
                                    <Calendar size={18} color="#FFF" />
                                </Pressable>
                            </View>
                            {showNewExpiryDatePicker && (
                                <DateTimePicker
                                    value={newExpiryDate ? new Date(newExpiryDate) : new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        setShowNewExpiryDatePicker(false);
                                        if (event.type === 'set' && selectedDate) {
                                            setNewExpiryDate(selectedDate.toISOString().split('T')[0]);
                                        }
                                    }}
                                />
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <TextInput
                                    placeholder="Category (e.g. Identity & Legal)"
                                    placeholderTextColor="#71717A"
                                    style={{ flex: 1, backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }}
                                    value={newExpiryCategory}
                                    onChangeText={setNewExpiryCategory}
                                />
                                <Pressable 
                                    onPress={() => setShowExpiryCatDropdown(!showExpiryCatDropdown)}
                                    style={{ backgroundColor: '#27272A', padding: 10, borderRadius: 8, justifyContent: 'center' }}
                                >
                                    <Text style={{ color: '#FFF', fontSize: 12 }}>▼</Text>
                                </Pressable>
                            </View>
                            {showExpiryCatDropdown && (
                                <View style={{ backgroundColor: '#18181B', borderRadius: 8, borderWidth: 1, borderColor: '#27272A', marginBottom: 12 }}>
                                    {EXPIRY_CATEGORIES.map(cat => (
                                        <Pressable key={cat} onPress={() => { setNewExpiryCategory(cat); setShowExpiryCatDropdown(false); }} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#27272A' }}>
                                            <Text style={{ color: '#E4E4E7', fontSize: 12 }}>{cat}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                            <Pressable onPress={handleAddExpiry} style={{ backgroundColor: '#10B981', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                                <Text style={{ color: '#000', fontSize: 13, fontWeight: '800' }}>Save Tracker</Text>
                            </Pressable>
                        </View>

                        {/* Grouped Display */}
                        {Array.from(new Set(expiries.map(e => e.category))).map(category => {
                            const categoryItems = expiries.filter(e => e.category === category).sort((a, b) => new Date(a.date) - new Date(b.date));
                            if (categoryItems.length === 0) return null;
                            return (
                                <View key={category} style={{ marginBottom: 20 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>{category}</Text>
                                    {categoryItems.map(item => {
                                        const urgencyColor = getUrgency(item.date);
                                        return (
                                            <React.Fragment key={item.id}>
                                                {renewingItemId === item.id ? (
                                                    <View style={{ backgroundColor: '#09090B', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#10B981' }}>
                                                        <Text style={{ color: '#E4E4E7', fontSize: 13, fontWeight: '700', marginBottom: 8 }}>Renew: {item.title}</Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                            <TextInput
                                                                placeholder="Enter next expiry (YYYY-MM-DD)"
                                                                placeholderTextColor="#71717A"
                                                                style={{ flex: 1, backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }}
                                                                value={renewDateInput}
                                                                onChangeText={setRenewDateInput}
                                                            />
                                                            <Pressable onPress={() => setShowRenewDatePicker(true)} style={{ backgroundColor: '#27272A', padding: 10, borderRadius: 8 }}>
                                                                <Calendar size={18} color="#FFF" />
                                                            </Pressable>
                                                        </View>
                                                        {showRenewDatePicker && (
                                                            <DateTimePicker
                                                                value={renewDateInput ? new Date(renewDateInput) : new Date()}
                                                                mode="date"
                                                                display="default"
                                                                onChange={(event, selectedDate) => {
                                                                    setShowRenewDatePicker(false);
                                                                    if (event.type === 'set' && selectedDate) {
                                                                        setRenewDateInput(selectedDate.toISOString().split('T')[0]);
                                                                    }
                                                                }}
                                                            />
                                                        )}
                                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                                            <Pressable onPress={() => handleSaveRenew(item.id)} style={{ flex: 1, backgroundColor: '#10B981', padding: 10, borderRadius: 8, alignItems: 'center' }}>
                                                                <Text style={{ color: '#000', fontSize: 13, fontWeight: '800' }}>Save</Text>
                                                            </Pressable>
                                                            <Pressable onPress={() => setRenewingItemId(null)} style={{ flex: 1, backgroundColor: '#27272A', padding: 10, borderRadius: 8, alignItems: 'center' }}>
                                                                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Cancel</Text>
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#18181B', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#27272A' }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: urgencyColor, marginRight: 10 }} />
                                                            <View>
                                                                <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '600' }}>{item.title}</Text>
                                                                <Text style={{ color: urgencyColor, fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                                                                    {new Date(item.date) < new Date() ? 'Overdue: ' : 'Due: '}{item.date}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                                            <Pressable onPress={() => handleInitRenew(item)} style={{ backgroundColor: '#10B98120', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                                                                <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>Renew</Text>
                                                            </Pressable>
                                                            <Pressable onPress={() => handleDeleteExpiry(item.id)} style={{ backgroundColor: '#EF444420', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                                                                <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>Del</Text>
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </View>
                            );
                        })}
                    </View>
                )}

                {activeTab === 'meds' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Comprehensive Health Hub</Text>

                        {/* 1. Health Vitals Dashboard */}
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>Key Vitals</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {/* BP Card */}
                                <Pressable onPress={() => setEditingVital('bp')} style={{ flex: 1, minWidth: '45%', backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Blood Pressure</Text>
                                        <Activity size={14} color="#3B82F6" />
                                    </View>
                                    {editingVital === 'bp' ? (
                                        <View>
                                            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                                                <TextInput style={{ flex: 1, backgroundColor: '#27272A', color: '#FFF', padding: 6, borderRadius: 4, textAlign: 'center' }} placeholder="Sys" placeholderTextColor="#A1A1AA" keyboardType="numeric" value={vitalInput1} onChangeText={setVitalInput1} />
                                                <Text style={{ color: '#A1A1AA', fontSize: 20 }}>/</Text>
                                                <TextInput style={{ flex: 1, backgroundColor: '#27272A', color: '#FFF', padding: 6, borderRadius: 4, textAlign: 'center' }} placeholder="Dia" placeholderTextColor="#A1A1AA" keyboardType="numeric" value={vitalInput2} onChangeText={setVitalInput2} />
                                            </View>
                                            <Pressable onPress={() => handleSaveVital('bp')} style={{ backgroundColor: '#3B82F6', padding: 6, borderRadius: 4, alignItems: 'center' }}><Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Save</Text></Pressable>
                                        </View>
                                    ) : (
                                        <>
                                            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>{healthVitals.bp.sys}/{healthVitals.bp.dia}</Text>
                                            <Text style={{ color: healthVitals.bp.status === 'Normal' ? '#10B981' : '#EF4444', fontSize: 11, marginTop: 4 }}>{healthVitals.bp.status} • {healthVitals.bp.lastChecked}</Text>
                                        </>
                                    )}
                                </Pressable>
                                {/* Sugar Card */}
                                <Pressable onPress={() => setEditingVital('sugar')} style={{ flex: 1, minWidth: '45%', backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Sugar ({healthVitals.sugar.type})</Text>
                                        <Activity size={14} color="#EF4444" />
                                    </View>
                                    {editingVital === 'sugar' ? (
                                        <View>
                                            <TextInput style={{ backgroundColor: '#27272A', color: '#FFF', padding: 6, borderRadius: 4, textAlign: 'center', marginBottom: 8 }} placeholder="mg/dL" placeholderTextColor="#A1A1AA" keyboardType="numeric" value={vitalInput1} onChangeText={setVitalInput1} />
                                            <Pressable onPress={() => handleSaveVital('sugar')} style={{ backgroundColor: '#EF4444', padding: 6, borderRadius: 4, alignItems: 'center' }}><Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Save</Text></Pressable>
                                        </View>
                                    ) : (
                                        <>
                                            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>{healthVitals.sugar.level} <Text style={{ fontSize: 12, color: '#A1A1AA', fontWeight: '500' }}>mg/dL</Text></Text>
                                            <Text style={{ color: healthVitals.sugar.status === 'Optimal' ? '#10B981' : '#F59E0B', fontSize: 11, marginTop: 4 }}>{healthVitals.sugar.status} • {healthVitals.sugar.lastChecked}</Text>
                                        </>
                                    )}
                                </Pressable>
                                {/* Weight Card */}
                                <Pressable onPress={() => setEditingVital('weight')} style={{ flex: 1, minWidth: '45%', backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Weight</Text>
                                        <Activity size={14} color="#8B5CF6" />
                                    </View>
                                    {editingVital === 'weight' ? (
                                        <View>
                                            <TextInput style={{ backgroundColor: '#27272A', color: '#FFF', padding: 6, borderRadius: 4, textAlign: 'center', marginBottom: 8 }} placeholder="kg" placeholderTextColor="#A1A1AA" keyboardType="numeric" value={vitalInput1} onChangeText={setVitalInput1} />
                                            <Pressable onPress={() => handleSaveVital('weight')} style={{ backgroundColor: '#8B5CF6', padding: 6, borderRadius: 4, alignItems: 'center' }}><Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Save</Text></Pressable>
                                        </View>
                                    ) : (
                                        <>
                                            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>{healthVitals.weight.kg} <Text style={{ fontSize: 12, color: '#A1A1AA', fontWeight: '500' }}>kg</Text></Text>
                                            <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 4 }}>Goal: {healthVitals.weight.goal} kg</Text>
                                        </>
                                    )}
                                </Pressable>
                                {/* Heart Rate Card */}
                                <Pressable onPress={() => setEditingVital('heartRate')} style={{ flex: 1, minWidth: '45%', backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Heart Rate</Text>
                                        <Activity size={14} color="#EC4899" />
                                    </View>
                                    {editingVital === 'heartRate' ? (
                                        <View>
                                            <TextInput style={{ backgroundColor: '#27272A', color: '#FFF', padding: 6, borderRadius: 4, textAlign: 'center', marginBottom: 8 }} placeholder="bpm" placeholderTextColor="#A1A1AA" keyboardType="numeric" value={vitalInput1} onChangeText={setVitalInput1} />
                                            <Pressable onPress={() => handleSaveVital('heartRate')} style={{ backgroundColor: '#EC4899', padding: 6, borderRadius: 4, alignItems: 'center' }}><Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Save</Text></Pressable>
                                        </View>
                                    ) : (
                                        <>
                                            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>{healthVitals.heartRate.bpm} <Text style={{ fontSize: 12, color: '#A1A1AA', fontWeight: '500' }}>bpm</Text></Text>
                                            <Text style={{ color: healthVitals.heartRate.status === 'Normal' ? '#10B981' : '#F59E0B', fontSize: 11, marginTop: 4 }}>{healthVitals.heartRate.status} • {healthVitals.heartRate.lastChecked}</Text>
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        </View>

                        {/* 2. Fitness & Nutrition Goals */}
                        <View style={{ marginBottom: 24, backgroundColor: '#18181B', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                            <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '700', marginBottom: 16 }}>Daily Goals</Text>
                            
                            {/* Steps */}
                            <View style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Steps</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{fitness.steps.current} / {fitness.steps.goal}</Text>
                                        <Pressable onPress={() => handleQuickAdd('steps', 500)} style={{ backgroundColor: '#27272A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}><Text style={{ color: '#FFF', fontSize: 11 }}>+500</Text></Pressable>
                                    </View>
                                </View>
                                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${(fitness.steps.current / fitness.steps.goal) * 100}%`, backgroundColor: '#3B82F6' }]} /></View>
                            </View>

                            {/* Sleep */}
                            <View style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Sleep (Hours)</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{fitness.sleep.hours} / {fitness.sleep.goal}</Text>
                                        <Pressable onPress={() => handleQuickAdd('sleep', 0.5)} style={{ backgroundColor: '#27272A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}><Text style={{ color: '#FFF', fontSize: 11 }}>+0.5</Text></Pressable>
                                    </View>
                                </View>
                                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${(fitness.sleep.hours / fitness.sleep.goal) * 100}%`, backgroundColor: '#8B5CF6' }]} /></View>
                            </View>

                            {/* Water */}
                            <View style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Water Intake (Glasses)</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{nutrition.water.currentGlasses} / {nutrition.water.goalGlasses}</Text>
                                        <Pressable onPress={() => handleQuickAdd('water', 1)} style={{ backgroundColor: '#27272A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}><Text style={{ color: '#FFF', fontSize: 11 }}>+1</Text></Pressable>
                                    </View>
                                </View>
                                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${(nutrition.water.currentGlasses / nutrition.water.goalGlasses) * 100}%`, backgroundColor: '#06B6D4' }]} /></View>
                            </View>

                            {/* Calories */}
                            <View style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Calories Consumed</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{nutrition.calories.current} / {nutrition.calories.goal} kcal</Text>
                                        <Pressable onPress={() => handleQuickAdd('calories', 100)} style={{ backgroundColor: '#27272A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}><Text style={{ color: '#FFF', fontSize: 11 }}>+100</Text></Pressable>
                                    </View>
                                </View>
                                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${(nutrition.calories.current / nutrition.calories.goal) * 100}%`, backgroundColor: '#10B981' }]} /></View>
                            </View>

                            {/* Protein */}
                            <View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Protein (g)</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{nutrition.protein.current} / {nutrition.protein.goal} g</Text>
                                        <Pressable onPress={() => handleQuickAdd('protein', 10)} style={{ backgroundColor: '#27272A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}><Text style={{ color: '#FFF', fontSize: 11 }}>+10</Text></Pressable>
                                    </View>
                                </View>
                                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${(nutrition.protein.current / nutrition.protein.goal) * 100}%`, backgroundColor: '#F59E0B' }]} /></View>
                            </View>
                        </View>

                        {/* 3. Interactive Medication Manager */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>Medication & Stock Manager</Text>
                            
                            {/* Add New Med Form */}
                            <View style={{ backgroundColor: '#09090B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', marginBottom: 16 }}>
                                <Text style={{ color: '#E4E4E7', fontSize: 13, fontWeight: '700', marginBottom: 12 }}>+ Add Prescription</Text>
                                <TextInput placeholder="Medicine Name" placeholderTextColor="#71717A" style={{ backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13, marginBottom: 8 }} value={newMedTitle} onChangeText={setNewMedTitle} />
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                    <TextInput placeholder="Schedule (e.g. 9 PM)" placeholderTextColor="#71717A" style={{ flex: 1, backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }} value={newMedTime} onChangeText={setNewMedTime} />
                                    <TextInput placeholder="Stock Qty" placeholderTextColor="#71717A" style={{ width: 100, backgroundColor: '#18181B', color: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', fontSize: 13 }} value={newMedStock} onChangeText={setNewMedStock} keyboardType="numeric" />
                                </View>
                                <Pressable onPress={handleAddMedication} style={{ backgroundColor: '#8B5CF6', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>Save Prescription</Text>
                                </Pressable>
                            </View>

                            {/* Meds List */}
                            {medications.map(m => (
                                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#18181B', padding: 14, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#27272A' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#F4F4F5', fontSize: 15, fontWeight: '700', marginBottom: 4 }}>{m.title}</Text>
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            <Text style={{ color: '#A1A1AA', fontSize: 12 }}>🕒 {m.time}</Text>
                                            <Text style={{ color: m.stock > 5 ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '600' }}>📦 {m.stock} {m.stock === 1 ? 'dose' : 'doses'} left</Text>
                                        </View>
                                    </View>
                                    <Pressable 
                                        onPress={() => handleTakeMed(m.id)} 
                                        style={{ backgroundColor: m.stock > 0 ? '#10B98120' : '#EF444420', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 12 }}
                                    >
                                        <Text style={{ color: m.stock > 0 ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '800' }}>{m.stock > 0 ? 'TAKE' : 'EMPTY'}</Text>
                                    </Pressable>
                                </View>
                            ))}
                        </View>

                        {/* 4. Medical Appointments */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>Upcoming Appointments</Text>
                            {appointments.map(a => (
                                <View key={a.id} style={{ backgroundColor: '#18181B', padding: 14, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#27272A' }}>
                                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 4 }}>{a.doc}</Text>
                                    <View style={{ flexDirection: 'row', gap: 16 }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>📅 {a.date}</Text>
                                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>🕒 {a.time}</Text>
                                    </View>
                                    <Text style={{ color: '#3B82F6', fontSize: 12, marginTop: 8 }}>📍 {a.location}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
                {activeTab === 'school' && (
                    <View>
                        {/* Self Section */}
                        <View style={{ marginBottom: 24, backgroundColor: '#09090B', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                            <Text style={{ color: '#F4F4F5', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>🧔 My Security & Commitments</Text>
                            {renderTermInsurance(familySecurityHub.self.termInsurance, 'self')}
                            {renderHealthInsurance(familySecurityHub.self.healthInsurance, 'self')}
                            {renderFDs(familySecurityHub.self.fixedDeposits, 'self')}
                            {renderMaintenance(familySecurityHub.self.maintenance, 'self')}
                            {Object.keys(familySecurityHub.self).filter(k => !['termInsurance', 'healthInsurance', 'fixedDeposits', 'maintenance'].includes(k)).map(customCat => (
                                <View key={customCat}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, marginTop: 12 }}>{customCat}</Text>
                                    {renderGeneric(familySecurityHub.self[customCat], 'self', customCat)}
                                </View>
                            ))}
                            {renderAddButton('self')}
                        </View>

                        {/* Spouse Section */}
                        <View style={{ marginBottom: 24, backgroundColor: '#09090B', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                            <Text style={{ color: '#F4F4F5', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>👩‍❤️‍👨 Spouse Security</Text>
                            {renderTermInsurance(familySecurityHub.spouse.termInsurance, 'spouse')}
                            {renderHealthInsurance(familySecurityHub.spouse.healthInsurance, 'spouse')}
                            {renderFDs(familySecurityHub.spouse.fixedDeposits, 'spouse')}
                            {renderMaintenance(familySecurityHub.spouse.maintenance, 'spouse')}
                            {Object.keys(familySecurityHub.spouse).filter(k => !['termInsurance', 'healthInsurance', 'fixedDeposits', 'maintenance'].includes(k)).map(customCat => (
                                <View key={customCat}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, marginTop: 12 }}>{customCat}</Text>
                                    {renderGeneric(familySecurityHub.spouse[customCat], 'spouse', customCat)}
                                </View>
                            ))}
                            {renderAddButton('spouse')}
                        </View>

                        {/* Parents Section */}
                        <View style={{ marginBottom: 24, backgroundColor: '#09090B', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                            <Text style={{ color: '#F4F4F5', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>👴👵 Parents Care</Text>
                            {renderTermInsurance(familySecurityHub.parents.termInsurance, 'parents')}
                            {renderHealthInsurance(familySecurityHub.parents.healthInsurance, 'parents')}
                            {renderFDs(familySecurityHub.parents.fixedDeposits, 'parents')}
                            {renderMaintenance(familySecurityHub.parents.maintenance, 'parents')}
                            {Object.keys(familySecurityHub.parents).filter(k => !['termInsurance', 'healthInsurance', 'fixedDeposits', 'maintenance'].includes(k)).map(customCat => (
                                <View key={customCat}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, marginTop: 12 }}>{customCat}</Text>
                                    {renderGeneric(familySecurityHub.parents[customCat], 'parents', customCat)}
                                </View>
                            ))}
                            {renderAddButton('parents')}
                        </View>

                        {/* Kids Section */}
                        <View style={{ marginBottom: 24, backgroundColor: '#09090B', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                            <Text style={{ color: '#F4F4F5', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>👶 Kids' Commitments</Text>
                            {familySecurityHub.kids.map(kid => (
                                <View key={kid.id} style={{ marginBottom: 24 }}>
                                    <Text style={{ color: '#3B82F6', fontSize: 15, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{kid.name}</Text>
                                    
                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4 }}>School Fees</Text>
                                    {kid.schoolFees.map(fee => (
                                        <View key={fee.id} style={{ backgroundColor: '#18181B', padding: 14, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View>
                                                <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '700' }}>{fee.termName}</Text>
                                                <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Due: {fee.dueDate}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 12 }}>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>₹{fee.amount.toLocaleString()}</Text>
                                                    <Pressable onPress={() => handleDeepAction('kids', 'schoolFees', fee.id, 'MARK_PAID', kid.id)} style={{ backgroundColor: fee.paid ? '#10B981' : '#3B82F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginTop: 4 }}>
                                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{fee.paid ? 'PAID ✓' : 'MARK PAID'}</Text>
                                                    </Pressable>
                                                </View>
                                                <Pressable onPress={() => openEditModal(fee, 'kids', 'schoolFees', kid.id)} style={{ padding: 4 }}><Edit2 size={16} color="#6366F1" /></Pressable>
                                            </View>
                                        </View>
                                    ))}

                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, marginTop: 12 }}>Future Corpus</Text>
                                    {kid.futureCorpus.map(corpus => (
                                        <View key={corpus.id} style={{ backgroundColor: '#18181B', padding: 14, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#27272A' }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                                                <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '700' }}>{corpus.fundName}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                    <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '700' }}>₹{corpus.saved.toLocaleString()} <Text style={{ color: '#A1A1AA', fontWeight: '400' }}>/ ₹{corpus.target.toLocaleString()}</Text></Text>
                                                    <Pressable onPress={() => handleDeepAction('kids', 'futureCorpus', corpus.id, 'ADD_FUNDS', kid.id)} style={{ backgroundColor: '#27272A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}><Text style={{ color: '#FFF', fontSize: 11 }}>+ ₹50k</Text></Pressable>
                                                    <Pressable onPress={() => openEditModal(corpus, 'kids', 'futureCorpus', kid.id)} style={{ padding: 4 }}><Edit2 size={16} color="#6366F1" /></Pressable>
                                                </View>
                                            </View>
                                            <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${(corpus.saved / corpus.target) * 100}%`, backgroundColor: '#3B82F6' }]} /></View>
                                        </View>
                                    ))}

                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, marginTop: 12 }}>Policies</Text>
                                    {renderTermInsurance(kid.policies, 'kids', kid.id)}

                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, marginTop: 12 }}>Maintenance Costs</Text>
                                    {renderMaintenance(kid.maintenance, 'kids', kid.id)}
                                    {Object.keys(kid).filter(k => !['id', 'name', 'schoolFees', 'futureCorpus', 'policies', 'maintenance'].includes(k)).map(customCat => (
                                        <View key={customCat}>
                                            <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, marginTop: 12 }}>{customCat}</Text>
                                            {renderGeneric(kid[customCat], 'kids', customCat, kid.id)}
                                        </View>
                                    ))}
                                    {renderAddButton('kids', kid.id)}
                                </View>
                            ))}
                        </View>
                    </View>
                )}
                {activeTab === 'services' && (
                    <View>
                        <Text style={{ color: '#F4F4F5', fontSize: 18, fontWeight: '800', marginBottom: 16 }}>Asset & Maintenance Lifecycle</Text>
                        
                        {(() => {
                            const urgent = getUrgentAssets();
                            if (urgent.length === 0) return null;
                            return (
                                <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 14, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#EF4444' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        <AlertTriangle size={18} color="#EF4444" />
                                        <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '800', marginLeft: 8 }}>URGENT REMINDERS</Text>
                                    </View>
                                    {urgent.map(u => (
                                        <View key={u.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                            <Text style={{ color: '#FCA5A5', fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>• {u.title}</Text>
                                            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700', marginLeft: 8 }}>Due: {u.nextDue}</Text>
                                        </View>
                                    ))}
                                </View>
                            );
                        })()}
                        
                        <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 8, textTransform: 'uppercase' }}>🚗 Vehicles</Text>
                        {assetServices.vehicles.map(a => renderAssetCard(a, 'vehicles'))}

                        <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 12, textTransform: 'uppercase' }}>🔌 Appliances & Gadgets</Text>
                        {assetServices.appliances.map(a => renderAssetCard(a, 'appliances'))}

                        <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 12, textTransform: 'uppercase' }}>🏠 Property Maintenance</Text>
                        {assetServices.property.map(a => renderAssetCard(a, 'property'))}

                        <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 12, textTransform: 'uppercase' }}>🌐 Digital & Subscriptions</Text>
                        {assetServices.digital.map(a => renderAssetCard(a, 'digital'))}

                        <Pressable onPress={() => setIsAddAssetModalVisible(true)} style={{ backgroundColor: '#18181B', padding: 16, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#3F3F46', borderStyle: 'dashed', alignItems: 'center' }}>
                            <Text style={{ color: '#A1A1AA', fontSize: 14, fontWeight: '600' }}>+ ADD NEW ASSET / SERVICE</Text>
                        </Pressable>
                    </View>
                )}
                {activeTab === 'budgets' && (() => {
                    const activeBudget = isEditingLifeBudget && draftLifeBudget ? draftLifeBudget : lifeBudget;
                    const totalNeeds = activeBudget.needs.reduce((sum, item) => sum + item.limit, 0);
                    const totalWants = activeBudget.wants.reduce((sum, item) => sum + item.limit, 0);
                    const totalSavings = activeBudget.savings.reduce((sum, item) => sum + item.target, 0);
                    const unallocated = activeBudget.monthlyIncome - (totalNeeds + totalWants + totalSavings);

                    const needsPct = (totalNeeds / activeBudget.monthlyIncome) * 100;
                    const wantsPct = (totalWants / activeBudget.monthlyIncome) * 100;
                    const savingsPct = (totalSavings / activeBudget.monthlyIncome) * 100;
                    const unallocatedPct = Math.max(0, (unallocated / activeBudget.monthlyIncome) * 100);

                    return (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Monthly Earnings Header */}
                            <View style={{ backgroundColor: '#18181B', padding: 20, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#27272A', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Monthly Earnings</Text>
                                    {!isEditingLifeBudget ? (
                                        <Pressable onPress={() => { setDraftLifeBudget(lifeBudget); setIsEditingLifeBudget(true); }}>
                                            <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '700' }}>EDIT PLAN</Text>
                                        </Pressable>
                                    ) : (
                                        <Pressable onPress={handleSaveLifeBudget}>
                                            <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>SAVE PLAN</Text>
                                        </Pressable>
                                    )}
                                </View>
                                {isEditingLifeBudget ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#6366F1', paddingBottom: 4 }}>
                                        <Text style={{ color: '#FFF', fontSize: 32, fontWeight: '800' }}>₹</Text>
                                        <TextInput 
                                            style={{ color: '#FFF', fontSize: 32, fontWeight: '800', minWidth: 150, textAlign: 'center' }}
                                            keyboardType="numeric"
                                            value={draftLifeBudget.monthlyIncome.toString()}
                                            onChangeText={(val) => setDraftLifeBudget({...draftLifeBudget, monthlyIncome: parseFloat(val) || 0})}
                                        />
                                    </View>
                                ) : (
                                    <Text style={{ color: '#FFF', fontSize: 32, fontWeight: '800' }}>₹{activeBudget.monthlyIncome.toLocaleString()}</Text>
                                )}
                                
                                {/* Allocation Bar */}
                                <View style={{ width: '100%', marginTop: 20 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '600' }}>Unallocated Funds</Text>
                                        <Text style={{ color: unallocated >= 0 ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '800' }}>₹{unallocated.toLocaleString()}</Text>
                                    </View>
                                    <View style={{ height: 12, width: '100%', flexDirection: 'row', borderRadius: 6, overflow: 'hidden', backgroundColor: '#27272A' }}>
                                        <View style={{ width: `${needsPct}%`, backgroundColor: '#10B981' }} />
                                        <View style={{ width: `${wantsPct}%`, backgroundColor: '#F59E0B' }} />
                                        <View style={{ width: `${savingsPct}%`, backgroundColor: '#3B82F6' }} />
                                        <View style={{ width: `${unallocatedPct}%`, backgroundColor: '#3F3F46' }} />
                                    </View>
                                </View>
                            </View>

                            {/* Needs */}
                            <Text style={{ color: '#10B981', fontSize: 16, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', marginTop: 8 }}>Life's Essentials (Needs)</Text>
                            <View style={{ backgroundColor: '#18181B', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#064E3B' }}>
                                {activeBudget.needs.map((b, index) => (
                                    <View key={b.id} style={{ marginBottom: 16 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '700' }}>{b.icon} {b.category}</Text>
                                                {!isEditingLifeBudget && (
                                                    <Pressable onPress={() => { setActiveLifeExpense({...b, type: 'needs'}); setIsLogLifeExpenseModalVisible(true); }} style={{ marginLeft: 8, backgroundColor: '#27272A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '800' }}>+</Text>
                                                    </Pressable>
                                                )}
                                            </View>
                                            {isEditingLifeBudget ? (
                                                <TextInput 
                                                    style={{ color: '#FFF', fontSize: 12, fontWeight: '600', backgroundColor: '#27272A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, minWidth: 80, textAlign: 'right' }}
                                                    keyboardType="numeric"
                                                    value={b.limit.toString()}
                                                    onChangeText={(val) => {
                                                        const newArr = [...draftLifeBudget.needs];
                                                        newArr[index] = {...newArr[index], limit: parseFloat(val) || 0};
                                                        setDraftLifeBudget({...draftLifeBudget, needs: newArr});
                                                    }}
                                                />
                                            ) : (
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '600' }}>₹{b.spent.toLocaleString()} / <Text style={{ color: '#FFF' }}>₹{b.limit.toLocaleString()}</Text></Text>
                                            )}
                                        </View>
                                        {!isEditingLifeBudget && (
                                            <View style={{ height: 8, backgroundColor: '#27272A', borderRadius: 4, overflow: 'hidden' }}>
                                                <View style={{ height: '100%', width: `${(b.spent / b.limit) * 100}%`, backgroundColor: '#10B981', borderRadius: 4 }} />
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>

                            {/* Wants */}
                            <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', marginTop: 8 }}>Quality of Life (Wants)</Text>
                            <View style={{ backgroundColor: '#18181B', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#78350F' }}>
                                {activeBudget.wants.map((b, index) => (
                                    <View key={b.id} style={{ marginBottom: 16 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '700' }}>{b.icon} {b.category}</Text>
                                                {!isEditingLifeBudget && (
                                                    <Pressable onPress={() => { setActiveLifeExpense({...b, type: 'wants'}); setIsLogLifeExpenseModalVisible(true); }} style={{ marginLeft: 8, backgroundColor: '#27272A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '800' }}>+</Text>
                                                    </Pressable>
                                                )}
                                            </View>
                                            {isEditingLifeBudget ? (
                                                <TextInput 
                                                    style={{ color: '#FFF', fontSize: 12, fontWeight: '600', backgroundColor: '#27272A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, minWidth: 80, textAlign: 'right' }}
                                                    keyboardType="numeric"
                                                    value={b.limit.toString()}
                                                    onChangeText={(val) => {
                                                        const newArr = [...draftLifeBudget.wants];
                                                        newArr[index] = {...newArr[index], limit: parseFloat(val) || 0};
                                                        setDraftLifeBudget({...draftLifeBudget, wants: newArr});
                                                    }}
                                                />
                                            ) : (
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '600' }}>₹{b.spent.toLocaleString()} / <Text style={{ color: '#FFF' }}>₹{b.limit.toLocaleString()}</Text></Text>
                                            )}
                                        </View>
                                        {!isEditingLifeBudget && (
                                            <View style={{ height: 8, backgroundColor: '#27272A', borderRadius: 4, overflow: 'hidden' }}>
                                                <View style={{ height: '100%', width: `${(b.spent / b.limit) * 100}%`, backgroundColor: '#F59E0B', borderRadius: 4 }} />
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>

                            {/* Savings */}
                            <Text style={{ color: '#3B82F6', fontSize: 16, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', marginTop: 8 }}>Future Self (Savings)</Text>
                            <View style={{ backgroundColor: '#18181B', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#1E3A8A' }}>
                                {activeBudget.savings.map((b, index) => (
                                    <View key={b.id} style={{ marginBottom: 16 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#F4F4F5', fontSize: 14, fontWeight: '700' }}>{b.icon} {b.category}</Text>
                                                {!isEditingLifeBudget && (
                                                    <Pressable onPress={() => { setActiveLifeExpense({...b, type: 'savings'}); setIsLogLifeExpenseModalVisible(true); }} style={{ marginLeft: 8, backgroundColor: '#27272A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '800' }}>+</Text>
                                                    </Pressable>
                                                )}
                                            </View>
                                            {isEditingLifeBudget ? (
                                                <TextInput 
                                                    style={{ color: '#FFF', fontSize: 12, fontWeight: '600', backgroundColor: '#27272A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, minWidth: 80, textAlign: 'right' }}
                                                    keyboardType="numeric"
                                                    value={b.target.toString()}
                                                    onChangeText={(val) => {
                                                        const newArr = [...draftLifeBudget.savings];
                                                        newArr[index] = {...newArr[index], target: parseFloat(val) || 0};
                                                        setDraftLifeBudget({...draftLifeBudget, savings: newArr});
                                                    }}
                                                />
                                            ) : (
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '600' }}>₹{b.allocated.toLocaleString()} / <Text style={{ color: '#FFF' }}>₹{b.target.toLocaleString()}</Text></Text>
                                            )}
                                        </View>
                                        {!isEditingLifeBudget && (
                                            <View style={{ height: 8, backgroundColor: '#27272A', borderRadius: 4, overflow: 'hidden' }}>
                                                <View style={{ height: '100%', width: `${(b.allocated / b.target) * 100}%`, backgroundColor: '#3B82F6', borderRadius: 4 }} />
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    );
                })()}
                {activeTab === 'todo' && (() => {
                    // Sorting logic: Uncompleted first, then by priority (High > Medium > Low)
                    const priorityScore = { High: 3, Medium: 2, Low: 1 };
                    let sortedTodos = [...todos].sort((a, b) => {
                        if (a.done !== b.done) return a.done ? 1 : -1;
                        const scoreA = priorityScore[a.priority] || 0;
                        const scoreB = priorityScore[b.priority] || 0;
                        return scoreB - scoreA;
                    });
                    
                    if (activeTodoFilter !== 'All') {
                        sortedTodos = sortedTodos.filter(t => t.category === activeTodoFilter);
                    }

                    const completedCount = todos.filter(t => t.done).length;
                    const totalCount = todos.length;
                    const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                    return (
                        <View style={{ flex: 1, minHeight: 600 }}>
                            {/* Progress Dashboard */}
                            <View style={{ backgroundColor: '#18181B', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#27272A' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>Daily Progress</Text>
                                    <Text style={{ color: '#A1A1AA', fontSize: 14, fontWeight: '700' }}>{completedCount} of {totalCount} completed</Text>
                                </View>
                                <View style={{ height: 10, backgroundColor: '#27272A', borderRadius: 5, overflow: 'hidden' }}>
                                    <View style={{ height: '100%', width: `${progressPct}%`, backgroundColor: '#6366F1', borderRadius: 5 }} />
                                </View>
                            </View>

                            {/* Filters */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, maxHeight: 40 }}>
                                {['All', 'Finance', 'Work', 'Personal', 'Health', 'Errands'].map(cat => (
                                    <Pressable 
                                        key={cat} 
                                        onPress={() => setActiveTodoFilter(cat)}
                                        style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: activeTodoFilter === cat ? '#FFF' : '#18181B', marginRight: 8, borderWidth: 1, borderColor: activeTodoFilter === cat ? '#FFF' : '#27272A', justifyContent: 'center' }}
                                    >
                                        <Text style={{ color: activeTodoFilter === cat ? '#000' : '#A1A1AA', fontSize: 12, fontWeight: '700' }}>{cat}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            {/* Task List */}
                            <View style={{ paddingBottom: 80 }}>
                                {sortedTodos.map(t => (
                                    <View key={t.id} style={{ backgroundColor: '#18181B', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', alignItems: 'center' }}>
                                        <Pressable onPress={() => toggleTodoDone(t.id)} style={{ marginRight: 16 }}>
                                            {t.done ? <CheckSquare size={24} color="#10B981" /> : <Square size={24} color="#71717A" />}
                                        </Pressable>
                                        
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: t.done ? '#71717A' : '#FFF', fontSize: 15, fontWeight: '700', textDecorationLine: t.done ? 'line-through' : 'none', marginBottom: 6 }}>{t.title}</Text>
                                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                                <View style={{ backgroundColor: '#27272A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700' }}>{t.category}</Text>
                                                </View>
                                                <View style={{ backgroundColor: t.priority === 'High' ? '#EF444420' : t.priority === 'Medium' ? '#F59E0B20' : '#71717A20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: t.priority === 'High' ? '#EF444450' : t.priority === 'Medium' ? '#F59E0B50' : '#71717A50' }}>
                                                    <Text style={{ color: t.priority === 'High' ? '#EF4444' : t.priority === 'Medium' ? '#F59E0B' : '#A1A1AA', fontSize: 10, fontWeight: '700' }}>{t.priority}</Text>
                                                </View>
                                                {t.dueDate ? (
                                                    <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '600', marginLeft: 4 }}>📅 {t.dueDate}</Text>
                                                ) : null}
                                            </View>
                                        </View>

                                        <Pressable onPress={() => handleDeleteTodo(t.id)} style={{ padding: 8 }}>
                                            <Trash2 size={18} color="#EF4444" />
                                        </Pressable>
                                    </View>
                                ))}
                                {sortedTodos.length === 0 && (
                                    <Text style={{ color: '#71717A', textAlign: 'center', marginTop: 40, fontSize: 14 }}>No tasks found in this category.</Text>
                                )}
                            </View>
                            
                            {/* Floating Add Button */}
                            <Pressable 
                                onPress={() => setIsAddTodoModalVisible(true)}
                                style={{ position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
                            >
                                <Plus size={24} color="#FFF" />
                            </Pressable>
                        </View>
                    );
                })()}

                {/* 6. Property Vault */}
                {activeTab === 'properties' && (() => {
                    const totalMarketValue = properties.reduce((sum, p) => sum + (parseFloat(p.financials.marketValuation) || 0), 0);
                    const totalPurchasePrice = properties.reduce((sum, p) => sum + (parseFloat(p.financials.purchasePrice) || 0), 0);
                    const appreciation = totalPurchasePrice > 0 ? ((totalMarketValue - totalPurchasePrice) / totalPurchasePrice) * 100 : 0;
                    const totalRentalYield = properties.reduce((sum, p) => sum + (parseFloat(p.financials.rental.monthlyRent) || 0), 0);

                    return (
                        <View style={{ flex: 1, minHeight: 600 }}>
                            {/* MASTER PORTFOLIO DASHBOARD (AGENT 16) */}
                            <View style={{ backgroundColor: '#18181B', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#27272A' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={{ fontSize: 16 }}>📊</Text>
                                        <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '800' }}>PORTFOLIO AGENT</Text>
                                    </View>
                                    <View style={{ backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>SYNCED</Text>
                                    </View>
                                </View>
                                <Text style={{ color: '#FFF', fontSize: 36, fontWeight: '900', marginBottom: 12 }}>₹{totalMarketValue.toLocaleString()}</Text>
                                
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ flex: 1, backgroundColor: '#000', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>TOTAL APPRECIATION</Text>
                                        <Text style={{ color: appreciation >= 0 ? '#10B981' : '#EF4444', fontSize: 16, fontWeight: '800' }}>
                                            {appreciation >= 0 ? '+' : ''}{appreciation.toFixed(1)}%
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1, backgroundColor: '#000', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }}>
                                        <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>MONTHLY CASH FLOW</Text>
                                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>₹{totalRentalYield.toLocaleString()}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* SMART ALERTS AGENT (AGENT 13) */}
                            {(() => {
                                const alerts = [];
                                properties.forEach(p => {
                                    if (p.financials.loan.active && p.financials.loan.emi > 0) {
                                        alerts.push(`• EMI of ₹${p.financials.loan.emi.toLocaleString()} due soon for ${p.name}`);
                                    }
                                    if (p.legal.taxes.propertyTaxStatus.toLowerCase().includes('due')) {
                                        alerts.push(`• Property Tax ${p.legal.taxes.propertyTaxStatus.toLowerCase()} for ${p.name} (Due: ${p.legal.taxes.nextDueDate})`);
                                    }
                                    if (p.operations.insurance.active && p.operations.insurance.expiry) {
                                        alerts.push(`• Insurance policy for ${p.name} expires on ${p.operations.insurance.expiry}`);
                                    }
                                    if (p.legal.govSyncStatus !== 'verified') {
                                        alerts.push(`• Govt records sync pending for ${p.name}`);
                                    }
                                });
                                
                                if (alerts.length === 0) alerts.push('• All properties are compliant and up to date.');

                                return (
                                    <View style={{ backgroundColor: '#3F3F46', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: alerts[0].includes('compliant') ? '#10B98150' : '#EF444450', marginBottom: 24 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={{ fontSize: 14 }}>🔔</Text>
                                                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Smart Alert Agent</Text>
                                            </View>
                                            {!alerts[0].includes('compliant') && (
                                                <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                                                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>{alerts.length} ALERTS</Text>
                                                </View>
                                            )}
                                        </View>
                                        {alerts.slice(0, 4).map((alert, idx) => (
                                            <Text key={idx} style={{ color: '#D4D4D8', fontSize: 12, marginBottom: 4 }}>{alert}</Text>
                                        ))}
                                    </View>
                                );
                            })()}
                            {/* Property List (Restored) */}
                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 16 }}>Your Portfolio</Text>
                            <View style={{ paddingBottom: 80 }}>
                                {properties.map((property) => {
                                    const pAppreciation = property.financials.purchasePrice > 0 ? ((property.financials.marketValuation - property.financials.purchasePrice) / property.financials.purchasePrice) * 100 : 0;
                                    return (
                                        <View key={property.id} style={[styles.card, { marginBottom: 16 }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                    <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Text style={{ fontSize: 20 }}>{property.type === 'Plot' ? '🏞️' : '🏠'}</Text>
                                                    </View>
                                                    <View style={{ width: 160 }}>
                                                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }} numberOfLines={1}>{property.name}</Text>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 11 }} numberOfLines={1}>{property.location}</Text>
                                                    </View>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '900' }}>₹{property.financials.marketValuation.toLocaleString()}</Text>
                                                    <Text style={{ color: pAppreciation >= 0 ? '#10B981' : '#EF4444', fontSize: 10, fontWeight: '800' }}>
                                                        {pAppreciation >= 0 ? '▲' : '▼'} {Math.abs(pAppreciation).toFixed(1)}%
                                                    </Text>
                                                </View>
                                            </View>
                                            
                                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                                <View style={{ flex: 1, backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: property.legal.govSyncStatus === 'verified' ? '#10B98150' : '#F59E0B50', justifyContent: 'center' }}>
                                                    <Text style={{ color: property.legal.govSyncStatus === 'verified' ? '#10B981' : '#F59E0B', fontSize: 9, fontWeight: '800', textAlign: 'center' }}>
                                                        GOVT: {property.legal.govSyncStatus.toUpperCase()}
                                                    </Text>
                                                </View>
                                                <Pressable 
                                                    style={{ flex: 1, backgroundColor: '#6366F1', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
                                                    onPress={() => { setActivePropertyId(property.id); setIsManagePropertyModalVisible(true); setIsEditingPropertyProfile(false); setEditPropertyForm(null); }}
                                                >
                                                    <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>COMMAND CENTER</Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Floating Add Button */}
                            <Pressable 
                                onPress={() => setIsAddPropertyModalVisible(true)}
                                style={{ position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
                            >
                                <Plus size={24} color="#FFF" />
                            </Pressable>
                        </View>
                    );
                })()}
                {/* 7. Volatility Shield */}
                {activeTab === 'crisis' && (
                    <View style={{ gap: 20, padding: 16 }}>
                        {/* Top Emergency Fund Shield */}
                        <View style={{ backgroundColor: '#18181B', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#10B98130', alignItems: 'center', overflow: 'hidden' }}>
                            <View style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: '#10B98110' }} />
                            
                            <View style={{ backgroundColor: '#10B98120', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                <ShieldCheck color="#10B981" size={32} strokeWidth={2} />
                            </View>
                            
                            <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>Available Emergency Buffer</Text>
                            <Text style={{ color: '#10B981', fontSize: 40, fontWeight: '900', letterSpacing: -1, marginBottom: 8 }}>₹{(emergencyFund/100000).toFixed(2)}L</Text>
                            <Text style={{ color: '#D4D4D8', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>This is your liquid moat. Any investment drawdowns against this fund will be heavily scrutinized by the AI.</Text>
                        </View>

                        {/* AI Predictive Macro Forecast */}
                        <View style={{ backgroundColor: '#18181B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <Activity color="#8B5CF6" size={18} />
                                <Text style={{ color: '#E9D5FF', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Macro-Economic Forecast</Text>
                            </View>
                            
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1, backgroundColor: '#27272A', padding: 12, borderRadius: 12 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>Q3 2026 INFLATION</Text>
                                    <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '900' }}>6.2%</Text>
                                    <Text style={{ color: '#FCA5A5', fontSize: 10, marginTop: 4 }}>Expected to rise. Keep cash highly liquid.</Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: '#27272A', padding: 12, borderRadius: 12 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>RBI RATE HIKE</Text>
                                    <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '900' }}>72% Prob.</Text>
                                    <Text style={{ color: '#FCD34D', fontSize: 10, marginTop: 4 }}>Avoid floating-rate debt traps.</Text>
                                </View>
                            </View>
                        </View>

                        {/* Investment Scanner */}
                        <View style={{ backgroundColor: '#18181B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#3B82F630' }}>
                            <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>Proposed Investment Scanner</Text>
                            
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272A', borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', paddingHorizontal: 16, marginBottom: 16 }}>
                                <Text style={{ color: '#A1A1AA', fontSize: 18, fontWeight: '600' }}>₹</Text>
                                <TextInput 
                                    placeholder="Enter planned investment amount..." 
                                    placeholderTextColor="#52525B" 
                                    style={{ flex: 1, color: '#FFF', fontSize: 16, paddingVertical: 12, paddingHorizontal: 12, fontWeight: '600' }}
                                    keyboardType="numeric"
                                    value={riskInvestmentAttempt}
                                    onChangeText={setRiskInvestmentAttempt}
                                />
                            </View>

                            <Pressable 
                                style={{ backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8 }} 
                                onPress={runWrongInvestmentScan}
                            >
                                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Run Volatility Stress Test</Text>
                            </Pressable>

                            {warningReport && (
                                <View style={{ marginTop: 16, backgroundColor: warningReport.status.includes('DANGER') ? '#EF444415' : '#10B98115', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: warningReport.status.includes('DANGER') ? '#EF444450' : '#10B98150' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        {warningReport.status.includes('DANGER') ? <AlertTriangle color="#EF4444" size={18} /> : <CheckCircle color="#10B981" size={18} />}
                                        <Text style={{ color: warningReport.status.includes('DANGER') ? '#EF4444' : '#10B981', fontSize: 13, fontWeight: '800' }}>
                                            {warningReport.status}
                                        </Text>
                                    </View>
                                    <Text style={{ color: '#D4D4D8', fontSize: 13, lineHeight: 20 }}>{warningReport.msg}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>
            <Modal visible={isCustomEntryModalVisible} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#101012', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#27272A' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>Add Custom Entry</Text>
                            <Pressable onPress={() => setIsCustomEntryModalVisible(false)}><X size={24} color="#A1A1AA" /></Pressable>
                        </View>
                        <ScrollView style={{ maxHeight: 400, marginBottom: 16 }}>
                            <Text style={{ color: '#A1A1AA', fontSize: 12, marginBottom: 8 }}>Category</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                                {Array.from(new Set([...(customEntryKidId ? ['schoolFees', 'futureCorpus', 'policies', 'maintenance'] : ['termInsurance', 'healthInsurance', 'fixedDeposits', 'maintenance']), ...userCustomCategories, 'Other'])).map(cat => (
                                    <Pressable 
                                        key={cat}
                                        onPress={() => setCustomEntryCategory(cat)}
                                        style={{ backgroundColor: customEntryCategory === cat ? '#6366F1' : '#18181B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: customEntryCategory === cat ? '#6366F1' : '#27272A' }}
                                    >
                                        <Text style={{ color: customEntryCategory === cat ? '#FFF' : '#A1A1AA', fontSize: 12, fontWeight: '700' }}>{cat}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            {customEntryCategory === 'Other' && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12, marginBottom: 8 }}>Custom Category Name</Text>
                                    <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' }} placeholderTextColor="#71717A" placeholder="e.g. Market Shares" value={customEntryForm.customCategoryName} onChangeText={(text) => setCustomEntryForm({...customEntryForm, customCategoryName: text})} />
                                </View>
                            )}

                            <Text style={{ color: '#A1A1AA', fontSize: 12, marginBottom: 8 }}>Title / Name</Text>
                            <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', marginBottom: 16 }} placeholderTextColor="#71717A" placeholder="e.g. HDFC Life" value={customEntryForm.title} onChangeText={(text) => setCustomEntryForm({...customEntryForm, title: text})} />

                            <Text style={{ color: '#A1A1AA', fontSize: 12, marginBottom: 8 }}>Amount / Target (₹)</Text>
                            <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', marginBottom: 16 }} placeholderTextColor="#71717A" placeholder="e.g. 50000" keyboardType="numeric" value={customEntryForm.amount} onChangeText={(text) => setCustomEntryForm({...customEntryForm, amount: text})} />

                            <Text style={{ color: '#A1A1AA', fontSize: 12, marginBottom: 8 }}>Date (Optional)</Text>
                            <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', marginBottom: 16 }} placeholderTextColor="#71717A" placeholder="YYYY-MM-DD" value={customEntryForm.date} onChangeText={(text) => setCustomEntryForm({...customEntryForm, date: text})} />
                        </ScrollView>
                        <Pressable style={{ backgroundColor: '#10B981', padding: 14, borderRadius: 8, alignItems: 'center' }} onPress={() => {
                            const targetCategory = customEntryCategory === 'Other' ? (customEntryForm.customCategoryName || 'Custom') : customEntryCategory;
                            
                            if (customEntryCategory === 'Other' && customEntryForm.customCategoryName && !userCustomCategories.includes(customEntryForm.customCategoryName)) {
                                setUserCustomCategories(prev => [...prev, customEntryForm.customCategoryName]);
                            }

                            setFamilySecurityHub(prev => {
                                const newState = {...prev};
                                const numAmt = Number(customEntryForm.amount || 0);
                                const dateStr = customEntryForm.date || '';

                                const newItem = { 
                                    id: Date.now().toString(), 
                                    insurer: customEntryForm.title || 'New Item', 
                                    bankName: customEntryForm.title || 'New Item', 
                                    category: customEntryForm.title || 'New Item', 
                                    title: customEntryForm.title || 'New Item', 
                                    amountLeft: numAmt, 
                                    coverageAmount: numAmt, 
                                    premiumAmount: numAmt, 
                                    spent: 0, 
                                    budget: numAmt || 10000, 
                                    target: numAmt || 10000, 
                                    current: 0,
                                    nextDueDate: dateStr,
                                    maturityDate: dateStr,
                                    renewalDate: dateStr,
                                    status: 'PENDING'
                                };
                                if (customEntryKidId) {
                                    const kidIndex = newState.kids.findIndex(k => k.id === customEntryKidId);
                                    if (kidIndex > -1) {
                                        if (!newState.kids[kidIndex][targetCategory]) newState.kids[kidIndex][targetCategory] = [];
                                        newState.kids[kidIndex][targetCategory].push(newItem);
                                    }
                                } else if (targetCategory && newState[customEntrySection]) {
                                    if (!newState[customEntrySection][targetCategory]) newState[customEntrySection][targetCategory] = [];
                                    newState[customEntrySection][targetCategory].push(newItem);
                                }
                                return newState;
                            });
                            setIsCustomEntryModalVisible(false);
                            setCustomEntryForm({});
                        }}>
                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Add to Hub</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal visible={isEditModalVisible} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>Edit Details</Text>
                        <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
                            {editItemData && Object.keys(editItemData).filter(k => k !== 'id').map(key => (
                                <View key={key} style={{ marginBottom: 12 }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12, marginBottom: 4 }}>{key}</Text>
                                    <TextInput style={styles.input} value={String(editItemData[key])} onChangeText={(t) => {
                                        const numKeys = ['amount', 'budget', 'spent', 'premiumAmount', 'principalAmount', 'maturityAmount'];
                                        const val = numKeys.includes(key) ? (parseFloat(t) || 0) : t;
                                        setEditItemData(prev => ({ ...prev, [key]: val }));
                                    }} />
                                </View>
                            ))}
                        </ScrollView>
                        <Pressable style={{ backgroundColor: '#6366F1', padding: 12, borderRadius: 8, alignItems: 'center' }} onPress={() => {
                            setFamilySecurityHub(prev => {
                                const newState = { ...prev };
                                if (editItemMeta.kidId) {
                                    const kidIndex = newState.kids.findIndex(k => k.id === editItemMeta.kidId);
                                    if (kidIndex > -1) {
                                        newState.kids[kidIndex][editItemMeta.category] = newState.kids[kidIndex][editItemMeta.category].map(item => item.id === editItemData.id ? editItemData : item);
                                    }
                                } else if (newState[editItemMeta.section] && newState[editItemMeta.section][editItemMeta.category]) {
                                    newState[editItemMeta.section][editItemMeta.category] = newState[editItemMeta.section][editItemMeta.category].map(item => item.id === editItemData.id ? editItemData : item);
                                }
                                return newState;
                            });
                            setIsEditModalVisible(false);
                        }}>
                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Save Changes</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Add Asset Modal */}
            <Modal visible={isAddAssetModalVisible} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>Add New Asset / Service</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                            {['vehicles', 'appliances', 'property', 'digital'].map(cat => (
                                <Pressable key={cat} onPress={() => setNewAssetCategory(cat)} style={{ flex: 1, paddingVertical: 8, backgroundColor: newAssetCategory === cat ? '#6366F1' : '#27272A', borderRadius: 6, alignItems: 'center' }}>
                                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{cat}</Text>
                                </Pressable>
                            ))}
                        </View>
                        <TextInput style={styles.input} placeholderTextColor="#A1A1AA" placeholder="Asset Title (e.g. LG AC)" value={newAssetForm.title || ''} onChangeText={(t) => setNewAssetForm({ ...newAssetForm, title: t })} />
                        <TextInput style={styles.input} placeholderTextColor="#A1A1AA" placeholder="Next Due Date (YYYY-MM-DD)" value={newAssetForm.nextDue || ''} onChangeText={(t) => setNewAssetForm({ ...newAssetForm, nextDue: t })} />
                        <TextInput style={styles.input} placeholderTextColor="#A1A1AA" placeholder="Service Frequency (Months)" keyboardType="number-pad" value={newAssetForm.frequency || ''} onChangeText={(t) => setNewAssetForm({ ...newAssetForm, frequency: t })} />
                        <TextInput style={styles.input} placeholderTextColor="#A1A1AA" placeholder="AMC Status (Active/Expired/None)" value={newAssetForm.amcStatus || ''} onChangeText={(t) => setNewAssetForm({ ...newAssetForm, amcStatus: t })} />
                        
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                            <Pressable style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#27272A', alignItems: 'center' }} onPress={() => setIsAddAssetModalVisible(false)}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Cancel</Text>
                            </Pressable>
                            <Pressable style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#6366F1', alignItems: 'center' }} onPress={() => {
                                setAssetServices(prev => {
                                    const newState = { ...prev };
                                    newState[newAssetCategory].push({
                                        id: 'as' + Date.now(),
                                        title: newAssetForm.title,
                                        nextDue: newAssetForm.nextDue,
                                        frequency: parseInt(newAssetForm.frequency, 10) || 12,
                                        amcStatus: newAssetForm.amcStatus || 'None',
                                        history: []
                                    });
                                    return newState;
                                });
                                setIsAddAssetModalVisible(false);
                                setNewAssetForm({});
                            }}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Add Asset</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Log Service Modal */}
            <Modal visible={isLogServiceModalVisible} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>Log Service: {activeServiceAsset?.title}</Text>
                        <TextInput style={styles.input} placeholderTextColor="#A1A1AA" placeholder="Date (YYYY-MM-DD)" value={logServiceData.date} onChangeText={(t) => setLogServiceData({ ...logServiceData, date: t })} />
                        <TextInput style={styles.input} placeholderTextColor="#A1A1AA" placeholder="Cost (₹)" keyboardType="number-pad" value={logServiceData.cost} onChangeText={(t) => setLogServiceData({ ...logServiceData, cost: t })} />
                        <TextInput style={styles.input} placeholderTextColor="#A1A1AA" placeholder="Provider (e.g. Urban Company)" value={logServiceData.provider} onChangeText={(t) => setLogServiceData({ ...logServiceData, provider: t })} />
                        <TextInput style={styles.input} placeholderTextColor="#A1A1AA" placeholder="Notes (optional)" value={logServiceData.notes} onChangeText={(t) => setLogServiceData({ ...logServiceData, notes: t })} />
                        
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                            <Pressable style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#27272A', alignItems: 'center' }} onPress={() => setIsLogServiceModalVisible(false)}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Cancel</Text>
                            </Pressable>
                            <Pressable style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center' }} onPress={submitServiceLog}>
                                <Text style={{ color: '#FFF', fontWeight: '800' }}>Save Log</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Log Life Expense Modal */}
            <Modal visible={isLogLifeExpenseModalVisible} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>
                            {activeLifeExpense ? `Log ${activeLifeExpense.type === 'savings' ? 'Allocation' : 'Expense'}: ${activeLifeExpense.category}` : 'Log Amount'}
                        </Text>
                        <TextInput
                            style={[styles.input, { fontSize: 24, paddingVertical: 16, textAlign: 'center', marginBottom: 16 }]}
                            placeholder="Enter amount (₹)"
                            placeholderTextColor="#71717A"
                            keyboardType="numeric"
                            value={lifeExpenseAmount}
                            onChangeText={setLifeExpenseAmount}
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <Pressable style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#27272A', alignItems: 'center' }} onPress={() => { setIsLogLifeExpenseModalVisible(false); setLifeExpenseAmount(''); setActiveLifeExpense(null); }}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Cancel</Text>
                            </Pressable>
                            <Pressable style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: activeLifeExpense?.type === 'needs' ? '#10B981' : activeLifeExpense?.type === 'wants' ? '#F59E0B' : '#3B82F6', alignItems: 'center' }} onPress={handleLogLifeExpenseSubmit}>
                                <Text style={{ color: '#FFF', fontWeight: '800' }}>{activeLifeExpense?.type === 'savings' ? 'Add to Savings' : 'Log Expense'}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Todo Modal */}
            <Modal visible={isAddTodoModalVisible} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>Add New Task</Text>
                        
                        <TextInput
                            style={[styles.input, { marginBottom: 16 }]}
                            placeholder="What needs to be done?"
                            placeholderTextColor="#71717A"
                            value={newTodoForm.title}
                            onChangeText={(t) => setNewTodoForm({ ...newTodoForm, title: t })}
                        />

                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 4 }}>CATEGORY</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {['Finance', 'Work', 'Personal', 'Health', 'Errands'].map(cat => (
                                <Pressable 
                                    key={cat} 
                                    onPress={() => setNewTodoForm({ ...newTodoForm, category: cat })}
                                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: newTodoForm.category === cat ? '#6366F1' : '#27272A', marginRight: 8 }}
                                >
                                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{cat}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>PRIORITY</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                            {['High', 'Medium', 'Low'].map(pri => (                                <Pressable 
                                    key={pri} 
                                    onPress={() => setNewTodoForm({ ...newTodoForm, priority: pri })}
                                    style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: newTodoForm.priority === pri ? (pri === 'High' ? '#EF4444' : pri === 'Medium' ? '#F59E0B' : '#71717A') : '#27272A', alignItems: 'center' }}
                                >
                                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{pri}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <Pressable style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#27272A', alignItems: 'center' }} onPress={() => setIsAddTodoModalVisible(false)}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Cancel</Text>
                            </Pressable>
                            <Pressable style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center' }} onPress={handleAddTodoSubmit}>
                                <Text style={{ color: '#FFF', fontWeight: '800' }}>Add Task</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Manage Property Modal */}
            <Modal visible={isManagePropertyModalVisible} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46', maxHeight: '90%', flexShrink: 1 }}>
                        {activePropertyId && properties.find(p => p.id === activePropertyId) && (() => {
                            const p = properties.find(p => p.id === activePropertyId);
                            const pAppreciation = p.financials.purchasePrice > 0 ? ((p.financials.marketValuation - p.financials.purchasePrice) / p.financials.purchasePrice) * 100 : 0;
                            return (
                                <View style={{ flexShrink: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>Command Center: {p.name}</Text>
                                        <Pressable onPress={() => { setIsManagePropertyModalVisible(false); setActivePropertyId(null); }}>
                                            <X size={24} color="#A1A1AA" />
                                        </Pressable>
                                    </View>
                                    
                                    {/* Dropdown Selector */}
                                    <View style={{ marginBottom: 16 }}>
                                        <Pressable 
                                            onPress={() => setIsAgentDropdownVisible(true)}
                                            style={{ backgroundColor: '#27272A', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#3F3F46' }}
                                        >
                                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>
                                                {AGENTS_20.find(a => a.id === activeAssetTab)?.icon} {AGENTS_20.find(a => a.id === activeAssetTab)?.name}
                                            </Text>
                                            <Text style={{ color: '#A1A1AA', fontSize: 12 }}>▼</Text>
                                        </Pressable>
                                    </View>
                                    
                                    <Modal visible={isAgentDropdownVisible} transparent={true} animationType="fade" onRequestClose={() => setIsAgentDropdownVisible(false)}>
                                        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }} activeOpacity={1} onPress={() => setIsAgentDropdownVisible(false)}>
                                            <View style={{ backgroundColor: '#18181B', borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', maxHeight: '70%', overflow: 'hidden' }}>
                                                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#3F3F46', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Select Agent Module</Text>
                                                    <Pressable onPress={() => setIsAgentDropdownVisible(false)}>
                                                        <X size={20} color="#A1A1AA" />
                                                    </Pressable>
                                                </View>
                                                <ScrollView showsVerticalScrollIndicator={false}>
                                                    {AGENTS_20.map(agent => (
                                                        <Pressable 
                                                            key={agent.id} 
                                                            onPress={() => {
                                                                setActiveAssetTab(agent.id);
                                                                setIsAgentDropdownVisible(false);
                                                            }}
                                                            style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#27272A', backgroundColor: activeAssetTab === agent.id ? '#6366F120' : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 12 }}
                                                        >
                                                            <Text style={{ fontSize: 18 }}>{agent.icon}</Text>
                                                            <Text style={{ color: activeAssetTab === agent.id ? '#6366F1' : '#FFF', fontSize: 14, fontWeight: activeAssetTab === agent.id ? '700' : '400' }}>
                                                                {agent.name}
                                                            </Text>
                                                        </Pressable>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        </TouchableOpacity>
                                    </Modal>

                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        
                                        {activeAssetTab === 1 && ( // Property Profile
                                            <View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700' }}>PROPERTY DETAILS</Text>
                                                    {!isEditingPropertyProfile ? (
                                                        <Pressable onPress={() => { setEditPropertyForm(JSON.parse(JSON.stringify(p))); setIsEditingPropertyProfile(true); }}>
                                                            <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '700' }}>EDIT</Text>
                                                        </Pressable>
                                                    ) : (
                                                        <Pressable onPress={() => {
                                                            const updatedProps = properties.map(prop => prop.id === p.id ? editPropertyForm : prop);
                                                            setProperties(updatedProps);
                                                            setIsEditingPropertyProfile(false);
                                                        }}>
                                                            <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>SAVE</Text>
                                                        </Pressable>
                                                    )}
                                                </View>

                                                {!isEditingPropertyProfile ? (
                                                    <>
                                                        <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 8 }}>{p.name}</Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 4 }}>Type: <Text style={{ color: '#FFF' }}>{p.type}</Text></Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 4 }}>Location: <Text style={{ color: '#FFF' }}>{p.location}</Text></Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 4 }}>Address: <Text style={{ color: '#FFF' }}>{p.address || 'N/A'}</Text></Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 4 }}>Pincode: <Text style={{ color: '#FFF' }}>{p.pincode || 'N/A'}</Text></Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 13 }}>Size: <Text style={{ color: '#FFF' }}>{p.legal?.sizeSqFt || 'N/A'} SqFt</Text></Text>
                                                        </View>
                                                        
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>OWNERSHIP & STATUS</Text>
                                                        <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 13 }}>Govt Registration</Text>
                                                                <Text style={{ color: p.legal?.govSyncStatus === 'verified' ? '#10B981' : '#F59E0B', fontSize: 13, fontWeight: '800' }}>
                                                                    {p.legal?.govSyncStatus === 'verified' ? 'VERIFIED' : 'PENDING'}
                                                                </Text>
                                                            </View>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 13 }}>Circle Rate</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>
                                                                    ₹{p.legal?.circleRate ? p.legal.circleRate.toLocaleString() : 'N/A'} / SqFt
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>PRIMARY FINANCIALS</Text>
                                                        <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 13 }}>Purchase Price</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>
                                                                    ₹{p.financials?.purchasePrice ? p.financials.purchasePrice.toLocaleString() : '0'}
                                                                </Text>
                                                            </View>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 13 }}>Current Market Val.</Text>
                                                                <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '800' }}>
                                                                    ₹{p.financials?.marketValuation ? p.financials.marketValuation.toLocaleString() : '0'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </>
                                                ) : (
                                                    <>
                                                        <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                            <View style={{ marginBottom: 12 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Property Name</Text>
                                                                <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', fontSize: 14 }} value={editPropertyForm.name} onChangeText={t => setEditPropertyForm({...editPropertyForm, name: t})} />
                                                            </View>
                                                            
                                                            <View style={{ marginBottom: 12 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Type (e.g. Plot, Apartment)</Text>
                                                                <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', fontSize: 14 }} value={editPropertyForm.type} onChangeText={t => setEditPropertyForm({...editPropertyForm, type: t})} />
                                                            </View>
                                                            
                                                            <View style={{ marginBottom: 12 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Location (City/Area)</Text>
                                                                <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', fontSize: 14 }} value={editPropertyForm.location} onChangeText={t => setEditPropertyForm({...editPropertyForm, location: t})} />
                                                            </View>

                                                            <View style={{ marginBottom: 12 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Full Address</Text>
                                                                <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', fontSize: 14, minHeight: 60, textAlignVertical: 'top' }} multiline value={editPropertyForm.address || ''} onChangeText={t => setEditPropertyForm({...editPropertyForm, address: t})} />
                                                            </View>

                                                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Pincode</Text>
                                                                    <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', fontSize: 14 }} value={editPropertyForm.pincode || ''} onChangeText={t => setEditPropertyForm({...editPropertyForm, pincode: t})} keyboardType="numeric" />
                                                                </View>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Size (SqFt)</Text>
                                                                    <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', fontSize: 14 }} value={String(editPropertyForm.legal?.sizeSqFt || '')} onChangeText={t => setEditPropertyForm({...editPropertyForm, legal: {...editPropertyForm.legal, sizeSqFt: Number(t)}})} keyboardType="numeric" />
                                                                </View>
                                                            </View>
                                                        </View>

                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>OWNERSHIP & STATUS</Text>
                                                        <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                            <View style={{ marginBottom: 4 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Circle Rate (₹/SqFt)</Text>
                                                                <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', fontSize: 14 }} value={String(editPropertyForm.legal?.circleRate || '')} onChangeText={t => setEditPropertyForm({...editPropertyForm, legal: {...editPropertyForm.legal, circleRate: Number(t)}})} keyboardType="numeric" />
                                                            </View>
                                                        </View>

                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>PRIMARY FINANCIALS</Text>
                                                        <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                            <View style={{ marginBottom: 12 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Purchase Price (₹)</Text>
                                                                <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', fontSize: 14 }} value={String(editPropertyForm.financials?.purchasePrice || '')} onChangeText={t => setEditPropertyForm({...editPropertyForm, financials: {...editPropertyForm.financials, purchasePrice: Number(t)}})} keyboardType="numeric" />
                                                            </View>
                                                            
                                                            <View style={{ marginBottom: 4 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Market Valuation (₹)</Text>
                                                                <TextInput style={{ backgroundColor: '#18181B', color: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', fontSize: 14 }} value={String(editPropertyForm.financials?.marketValuation || '')} onChangeText={t => setEditPropertyForm({...editPropertyForm, financials: {...editPropertyForm.financials, marketValuation: Number(t)}})} keyboardType="numeric" />
                                                            </View>
                                                        </View>
                                                    </>
                                                )}
                                            </View>
                                        )}
                                        {activeAssetTab === 2 && ( // Legal & Title
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Property Taxes</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 13 }}>Tax Status</Text>
                                                        <Text style={{ color: p.legal?.taxes?.propertyTaxStatus === 'Paid' ? '#10B981' : '#F59E0B', fontSize: 13, fontWeight: '800' }}>
                                                            {p.legal?.taxes?.propertyTaxStatus || 'Unknown'}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 13 }}>Next Due Date</Text>
                                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>
                                                            {p.legal?.taxes?.nextDueDate || 'N/A'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Documents Vault</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    {p.legal?.documents?.map((doc, idx) => (
                                                        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: idx !== p.legal.documents.length - 1 ? 12 : 0, paddingBottom: idx !== p.legal.documents.length - 1 ? 12 : 0, borderBottomWidth: idx !== p.legal.documents.length - 1 ? 1 : 0, borderBottomColor: '#3F3F46' }}>
                                                            <View style={{ flex: 1, paddingRight: 12 }}>
                                                                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>{doc.name}</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11 }}>{doc.location || 'Location Unknown'}</Text>
                                                            </View>
                                                            <View style={{ backgroundColor: doc.secured ? '#10B98120' : '#EF444420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: doc.secured ? '#10B98150' : '#EF444450' }}>
                                                                <Text style={{ color: doc.secured ? '#10B981' : '#EF4444', fontSize: 10, fontWeight: '800' }}>
                                                                    {doc.secured ? 'SECURED' : 'MISSING'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Succession Planning</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>NOMINEES</Text>
                                                    <Text style={{ color: '#FFF', fontSize: 13, marginBottom: 12 }}>{p.legal?.nominee || 'No nominees added'}</Text>
                                                    
                                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>HANDOVER NOTES</Text>
                                                    <Text style={{ color: '#FFF', fontSize: 13 }}>{p.legal?.handoverNotes || 'None'}</Text>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Legal Disputes</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <Text style={{ color: p.legal?.disputes === 'None' ? '#10B981' : '#EF4444', fontSize: 14, fontWeight: '800' }}>Status: {p.legal?.disputes || 'None'}</Text>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 3 && (() => { // Financial & ROI
                                            const pAppreciation = p.financials.purchasePrice > 0 ? ((p.financials.marketValuation - p.financials.purchasePrice) / p.financials.purchasePrice) * 100 : 0;
                                            const absoluteProfit = p.financials.marketValuation - p.financials.purchasePrice;
                                            const netEquity = p.financials.loan.active ? p.financials.marketValuation - p.financials.loan.outstandingBalance : p.financials.marketValuation;
                                            const loanProgress = p.financials.loan.active && p.financials.marketValuation > 0 ? (p.financials.loan.outstandingBalance / p.financials.marketValuation) * 100 : 0;
                                            
                                            return (
                                                <View>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Wealth Generation</Text>
                                                    <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>PURCHASE PRICE</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>₹{p.financials.purchasePrice.toLocaleString()}</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>{p.financials.purchaseDate}</Text>
                                                            </View>
                                                            <View style={{ width: 1, backgroundColor: '#3F3F46', marginHorizontal: 12 }} />
                                                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>CURRENT VALUATION</Text>
                                                                <Text style={{ color: '#10B981', fontSize: 15, fontWeight: '800' }}>₹{p.financials.marketValuation.toLocaleString()}</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>Market Est.</Text>
                                                            </View>
                                                        </View>
                                                        
                                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                                            <View style={{ flex: 1, backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>ABSOLUTE RETURN</Text>
                                                                <Text style={{ color: absoluteProfit >= 0 ? '#10B981' : '#EF4444', fontSize: 14, fontWeight: '800' }}>
                                                                    {absoluteProfit > 0 ? '+' : ''}₹{absoluteProfit.toLocaleString()}
                                                                </Text>
                                                            </View>
                                                            <View style={{ flex: 1, backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>CAGR (GROWTH)</Text>
                                                                <Text style={{ color: pAppreciation >= 0 ? '#10B981' : '#EF4444', fontSize: 14, fontWeight: '800' }}>
                                                                    {pAppreciation > 0 ? '+' : ''}{pAppreciation.toFixed(1)}%
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>

                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Net Equity & Leverage</Text>
                                                    <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: p.financials.loan.active ? 16 : 0 }}>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '700' }}>Net Equity Value</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>₹{netEquity.toLocaleString()}</Text>
                                                        </View>

                                                        {p.financials.loan.active && (
                                                            <>
                                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Debt (Loan Outstanding)</Text>
                                                                    <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>₹{p.financials.loan.outstandingBalance.toLocaleString()}</Text>
                                                                </View>
                                                                
                                                                {/* Progress Bar for Debt vs Equity */}
                                                                <View style={{ height: 6, backgroundColor: '#10B981', borderRadius: 3, flexDirection: 'row', overflow: 'hidden', marginBottom: 12 }}>
                                                                    <View style={{ width: `${100 - Math.min(loanProgress, 100)}%`, backgroundColor: '#10B981' }} />
                                                                    <View style={{ width: `${Math.min(loanProgress, 100)}%`, backgroundColor: '#EF4444' }} />
                                                                </View>
                                                                
                                                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                                                    <View style={{ flex: 1, backgroundColor: '#18181B', padding: 12, borderRadius: 8 }}>
                                                                        <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 2 }}>Monthly EMI</Text>
                                                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>₹{p.financials.loan.emi.toLocaleString()}</Text>
                                                                    </View>
                                                                    <View style={{ flex: 1, backgroundColor: '#18181B', padding: 12, borderRadius: 8 }}>
                                                                        <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 2 }}>Interest Rate</Text>
                                                                        <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '800' }}>{p.financials.loan.interestRate}% p.a.</Text>
                                                                    </View>
                                                                </View>
                                                            </>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })()}
                                        {activeAssetTab === 4 && ( // Market Intel
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Market Developments</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ marginBottom: 16 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>INFRASTRUCTURE UPDATES</Text>
                                                        <Text style={{ color: '#FFF', fontSize: 14 }}>{p.market?.infrastructureUpdates || 'No recent updates'}</Text>
                                                    </View>
                                                    <View style={{ height: 1, backgroundColor: '#3F3F46', marginBottom: 16 }} />
                                                    <View>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>COMPARABLE SALES</Text>
                                                        <Text style={{ color: '#FFF', fontSize: 14 }}>{p.market?.comparableSales || 'No comparable data'}</Text>
                                                    </View>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Risk Analysis</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <View>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 2 }}>ENVIRONMENTAL RISK</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 14 }}>{p.market?.environmentalRisk || 'Unknown'}</Text>
                                                        </View>
                                                        <View style={{ backgroundColor: p.market?.environmentalRisk?.includes('Low') ? '#10B98120' : '#F59E0B20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: p.market?.environmentalRisk?.includes('Low') ? '#10B98150' : '#F59E0B50' }}>
                                                            <Text style={{ color: p.market?.environmentalRisk?.includes('Low') ? '#10B981' : '#F59E0B', fontSize: 12, fontWeight: '800' }}>
                                                                {p.market?.environmentalRisk?.includes('Low') ? 'SAFE' : 'REVIEW'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 5 && ( // Maintenance Hub
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Maintenance History</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    {p.operations?.maintenanceLog?.length > 0 ? (
                                                        p.operations.maintenanceLog.map((log, i) => (
                                                            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: i !== p.operations.maintenanceLog.length - 1 ? 12 : 0, paddingBottom: i !== p.operations.maintenanceLog.length - 1 ? 12 : 0, borderBottomWidth: i !== p.operations.maintenanceLog.length - 1 ? 1 : 0, borderBottomColor: '#3F3F46' }}>
                                                                <View>
                                                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>{log.task}</Text>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 11 }}>{log.date}</Text>
                                                                </View>
                                                                <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '800' }}>-₹{log.cost.toLocaleString()}</Text>
                                                            </View>
                                                        ))
                                                    ) : (
                                                        <Text style={{ color: '#A1A1AA', fontSize: 13 }}>No maintenance history recorded.</Text>
                                                    )}
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Future Expectations (AI Predictive)</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Annual Pest Control</Text>
                                                    </View>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, marginLeft: 16, marginBottom: 4 }}>Due in ~2 months. Estimated cost: <Text style={{ color: '#F59E0B', fontWeight: '800' }}>₹1,500</Text></Text>

                                                    <View style={{ height: 1, backgroundColor: '#3F3F46', marginVertical: 12, marginLeft: 16 }} />

                                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Waterproofing Touchup</Text>
                                                    </View>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, marginLeft: 16 }}>Due before monsoons (~4 months). Estimated cost: <Text style={{ color: '#EF4444', fontWeight: '800' }}>₹8,000</Text></Text>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Utilities & Operations</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700' }}>Electricity Board</Text>
                                                        <Text style={{ color: '#FFF', fontSize: 12 }}>{p.operations?.utilities?.electricityBoard || 'Unknown'}</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700' }}>Water Board</Text>
                                                        <Text style={{ color: '#FFF', fontSize: 12 }}>{p.operations?.utilities?.waterBoard || 'Unknown'}</Text>
                                                    </View>
                                                    <View style={{ height: 1, backgroundColor: '#3F3F46', marginBottom: 12 }} />
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700' }}>Security System</Text>
                                                        <Text style={{ color: p.operations?.security?.includes('Active') ? '#10B981' : '#F59E0B', fontSize: 12, fontWeight: '800' }}>{p.operations?.security || 'None'}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 6 && (() => { // Rental & Yield
                                            const annualRent = p.financials.rental.monthlyRent * 12;
                                            const yieldPercent = p.financials.marketValuation > 0 ? (annualRent / p.financials.marketValuation) * 100 : 0;
                                            
                                            return (
                                                <View>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Current Rental Status</Text>
                                                    <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                                            <View>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>MONTHLY RENT</Text>
                                                                <Text style={{ color: p.financials.rental.active ? '#10B981' : '#A1A1AA', fontSize: 18, fontWeight: '800' }}>
                                                                    {p.financials.rental.active ? `₹${p.financials.rental.monthlyRent.toLocaleString()}` : 'Vacant'}
                                                                </Text>
                                                            </View>
                                                            <View style={{ backgroundColor: p.financials.rental.active ? '#10B98120' : '#EF444420', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: p.financials.rental.active ? '#10B98150' : '#EF444450' }}>
                                                                <Text style={{ color: p.financials.rental.active ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '800' }}>
                                                                    {p.financials.rental.active ? 'OCCUPIED' : 'UNOCCUPIED'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        
                                                        {p.financials.rental.active && (
                                                            <View style={{ backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', flexDirection: 'row', justifyContent: 'space-between' }}>
                                                                <View>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 2 }}>Tenant</Text>
                                                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>{p.financials.rental.tenantName}</Text>
                                                                </View>
                                                                <View style={{ alignItems: 'flex-end' }}>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 2 }}>Lease Expiry</Text>
                                                                    <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700' }}>{p.financials.rental.leaseExpiry}</Text>
                                                                </View>
                                                            </View>
                                                        )}
                                                    </View>

                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Yield Analysis</Text>
                                                    <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                                            <View style={{ flex: 1, backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>ANNUAL INCOME</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>₹{annualRent.toLocaleString()}</Text>
                                                            </View>
                                                            <View style={{ flex: 1, backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>GROSS YIELD</Text>
                                                                <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '800' }}>{yieldPercent.toFixed(2)}%</Text>
                                                            </View>
                                                        </View>
                                                    </View>

                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Future Expectations (AI Predictive)</Text>
                                                    <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' }} />
                                                            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Projected Rental Growth</Text>
                                                        </View>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, marginLeft: 16, marginBottom: 8, lineHeight: 18 }}>
                                                            Based on the new Metro Line Phase 3 development in this area, our AI predicts a <Text style={{ color: '#10B981', fontWeight: '700' }}>+12% to +15%</Text> surge in rental demand over the next 18 months.
                                                        </Text>
                                                        <View style={{ backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', marginLeft: 16 }}>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 11, marginBottom: 2 }}>Expected Rent (2027)</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>₹{(p.financials.rental.monthlyRent > 0 ? p.financials.rental.monthlyRent * 1.15 : 25000).toLocaleString()} / month</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })()}
                                        {activeAssetTab === 7 && ( // Insurance & Risk
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Insurance Coverage</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <View>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>POLICY STATUS</Text>
                                                            <Text style={{ color: p.operations?.insurance?.active ? '#10B981' : '#EF4444', fontSize: 15, fontWeight: '800' }}>
                                                                {p.operations?.insurance?.active ? 'ACTIVE' : 'UNINSURED'}
                                                            </Text>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end' }}>
                                                            {p.operations?.insurance?.active ? (
                                                                <>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>PROVIDER</Text>
                                                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>{p.operations.insurance.provider}</Text>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 10 }}>Exp: {p.operations.insurance.expiry}</Text>
                                                                </>
                                                            ) : (
                                                                <View style={{ backgroundColor: '#EF444420', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#EF444450' }}>
                                                                    <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800' }}>ACTION REQUIRED</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Comprehensive Risk Assessment</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700' }}>Overall Risk Score</Text>
                                                        <Text style={{ color: p.riskAssessment?.overallRiskScore < 20 ? '#10B981' : '#F59E0B', fontSize: 13, fontWeight: '800' }}>{p.riskAssessment?.overallRiskScore || 0}/100 (LOW)</Text>
                                                    </View>
                                                    <View style={{ height: 1, backgroundColor: '#3F3F46', marginBottom: 12 }} />
                                                    
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Flood Risk</Text>
                                                        <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>{p.riskAssessment?.floodRisk || 'Unknown'}</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Legal/Title Risk</Text>
                                                        <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>{p.riskAssessment?.legalRisk || 'Unknown'}</Text>
                                                    </View>
                                                    
                                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                                        {p.riskAssessment?.heatmapData?.map((data, idx) => (
                                                            <View key={idx} style={{ flex: 1, backgroundColor: '#18181B', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4 }}>{data.category}</Text>
                                                                <Text style={{ color: data.risk === 'Low' ? '#10B981' : '#F59E0B', fontSize: 12, fontWeight: '800' }}>{data.risk} Risk</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Future Expectations (AI Predictive)</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Climate Impact by 2030</Text>
                                                    </View>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, marginLeft: 16, marginBottom: 12, lineHeight: 18 }}>
                                                        Predictive climate models indicate a <Text style={{ color: '#F59E0B', fontWeight: '700' }}>15% increase</Text> in severe monsoons over the next decade. While currently 'Low', flood risk in Zone C may elevate to 'Medium'.
                                                    </Text>
                                                    <View style={{ backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B30', marginLeft: 16 }}>
                                                        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '800', marginBottom: 2 }}>AI RECOMMENDATION</Text>
                                                        <Text style={{ color: '#FFF', fontSize: 12, lineHeight: 16 }}>Consider securing comprehensive Property Insurance covering natural disasters within the next 2-3 years.</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 8 && ( // Document Vault
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Secured Documents</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    {p.legal?.documents?.filter(d => d.secured).map((doc, idx) => (
                                                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: idx !== p.legal.documents.filter(d => d.secured).length - 1 ? 16 : 0 }}>
                                                            <View style={{ backgroundColor: '#10B98120', padding: 8, borderRadius: 8, marginRight: 12 }}>
                                                                <CheckSquare size={20} color="#10B981" />
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>{doc.name}</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Location: {doc.location}</Text>
                                                            </View>
                                                            <View style={{ backgroundColor: '#3F3F46', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                                                <Text style={{ color: '#E4E4E7', fontSize: 10, fontWeight: '700' }}>VIEW</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Missing or Incomplete</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EF444450', marginBottom: 16 }}>
                                                    {p.legal?.documents?.filter(d => !d.secured).map((doc, idx) => (
                                                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <View style={{ backgroundColor: '#EF444420', padding: 8, borderRadius: 8, marginRight: 12 }}>
                                                                <Square size={20} color="#EF4444" />
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>{doc.name}</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11 }}>Please upload to complete profile.</Text>
                                                            </View>
                                                            <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                                                                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>UPLOAD</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Future Expectations (AI Predictive)</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' }} />
                                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Document Renewals Forecast</Text>
                                                    </View>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, marginLeft: 16, marginBottom: 12, lineHeight: 18 }}>
                                                        Based on your property type and local regulations, our AI predicts the following documents will need your attention soon:
                                                    </Text>
                                                    
                                                    <View style={{ backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', marginLeft: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                                                        <View>
                                                            <Text style={{ color: '#E4E4E7', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>Encumbrance Certificate (EC)</Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10 }}>Annual update recommended</Text>
                                                        </View>
                                                        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '800' }}>DUE IN 3 MO</Text>
                                                    </View>
                                                    
                                                    <View style={{ backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', marginLeft: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
                                                        <View>
                                                            <Text style={{ color: '#E4E4E7', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>Property Tax Receipt (2026)</Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10 }}>Required by BBMP</Text>
                                                        </View>
                                                        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '800' }}>DUE IN 7 MO</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 9 && ( // Tax & Compliance
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Property Tax Status</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: p.legal.taxes.propertyTaxStatus === 'Paid' ? '#10B98150' : '#F59E0B50', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <View>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>CURRENT STATUS</Text>
                                                            <Text style={{ color: p.legal.taxes.propertyTaxStatus === 'Paid' ? '#10B981' : '#F59E0B', fontSize: 16, fontWeight: '800', textTransform: 'uppercase' }}>
                                                                {p.legal.taxes.propertyTaxStatus}
                                                            </Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 4 }}>Next Due: <Text style={{ color: '#FFF' }}>{p.legal.taxes.nextDueDate}</Text></Text>
                                                        </View>
                                                        {p.legal.taxes.propertyTaxStatus !== 'Paid' ? (
                                                            <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}>
                                                                <Text style={{ color: '#000', fontSize: 12, fontWeight: '800' }}>PAY NOW</Text>
                                                            </View>
                                                        ) : (
                                                            <View style={{ backgroundColor: '#10B98120', padding: 8, borderRadius: 8 }}>
                                                                <CheckSquare size={24} color="#10B981" />
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Future Expectations (AI Predictive)</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Tax Assessment Forecast</Text>
                                                    </View>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, marginLeft: 16, marginBottom: 12, lineHeight: 18 }}>
                                                        Based on the new Metro Phase 3 infrastructure updates, BBMP is likely to reclassify this sector from Zone C to Zone B by late 2026.
                                                    </Text>
                                                    
                                                    <View style={{ backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', marginLeft: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
                                                        <View>
                                                            <Text style={{ color: '#E4E4E7', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>Projected Tax Hike</Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10 }}>Estimated increase</Text>
                                                        </View>
                                                        <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '800' }}>~18 - 25%</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 10 && (() => { // Govt Records
                                            const totalCircleValue = p.legal.circleRate * p.legal.sizeSqFt;
                                            
                                            return (
                                                <View>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Government Database Sync</Text>
                                                    <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: p.legal.govSyncStatus === 'verified' ? '#10B98150' : '#F59E0B50', marginBottom: 16 }}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                                <View style={{ backgroundColor: p.legal.govSyncStatus === 'verified' ? '#10B98120' : '#F59E0B20', padding: 10, borderRadius: 10 }}>
                                                                    <CheckSquare size={20} color={p.legal.govSyncStatus === 'verified' ? '#10B981' : '#F59E0B'} />
                                                                </View>
                                                                <View>
                                                                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700', textTransform: 'uppercase' }}>{p.legal.govSyncStatus === 'verified' ? 'Fully Verified' : 'Pending Sync'}</Text>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 2 }}>Last sync: <Text style={{ color: '#FFF' }}>Today, 09:41 AM</Text></Text>
                                                                </View>
                                                            </View>
                                                            <View style={{ backgroundColor: '#3F3F46', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                                                                <Text style={{ color: '#E4E4E7', fontSize: 10, fontWeight: '800' }}>SYNC NOW</Text>
                                                            </View>
                                                        </View>
                                                    </View>

                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Official Valuation (Circle Rate)</Text>
                                                    <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700' }}>Govt Circle Rate</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>₹{p.legal.circleRate.toLocaleString()} / sqft</Text>
                                                        </View>
                                                        <View style={{ height: 1, backgroundColor: '#3F3F46', marginBottom: 12 }} />
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <View>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700' }}>Total Official Value</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>For {p.legal.sizeSqFt} sqft</Text>
                                                            </View>
                                                            <Text style={{ color: '#10B981', fontSize: 16, fontWeight: '800' }}>₹{totalCircleValue.toLocaleString()}</Text>
                                                        </View>
                                                    </View>

                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Future Expectations (AI Predictive)</Text>
                                                    <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' }} />
                                                            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Master Plan Revision Forecast</Text>
                                                        </View>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 12, marginLeft: 16, marginBottom: 12, lineHeight: 18 }}>
                                                            The state government is drafting a Master Plan revision for Electronic City. AI sentiment analysis on government press releases suggests an upward revision of circle rates.
                                                        </Text>
                                                        <View style={{ backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3F3F46', marginLeft: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
                                                            <View>
                                                                <Text style={{ color: '#E4E4E7', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>Expected Revision</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>FY 2027-28</Text>
                                                            </View>
                                                            <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '800' }}>+15% to +20%</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })()}
                                        {activeAssetTab === 11 && ( // Legacy & Estate
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Registered Nominees</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                                        <View style={{ backgroundColor: '#10B98120', padding: 10, borderRadius: 10, marginRight: 12 }}>
                                                            <Users size={20} color="#10B981" />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{p.legal.nominee.split(',')[0]}</Text>
                                                            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800', marginTop: 2 }}>PRIMARY</Text>
                                                        </View>
                                                    </View>
                                                    
                                                    {p.legal.nominee.includes(',') && (
                                                        <>
                                                            <View style={{ height: 1, backgroundColor: '#3F3F46', marginBottom: 12, marginLeft: 42 }} />
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 42 }}>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={{ color: '#D4D4D8', fontSize: 13, fontWeight: '700' }}>{p.legal.nominee.split(',')[1].trim()}</Text>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginTop: 2 }}>SECONDARY</Text>
                                                                </View>
                                                            </View>
                                                        </>
                                                    )}
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Handover Protocols</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <Text style={{ color: '#E4E4E7', fontSize: 13, lineHeight: 20 }}>
                                                        {p.legal.handoverNotes}
                                                    </Text>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Future Expectations (AI Predictive)</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B5CF6' }} />
                                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Succession Optimization</Text>
                                                    </View>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, marginLeft: 16, marginBottom: 12, lineHeight: 18 }}>
                                                        As this asset's valuation approaches ₹1Cr, standard succession may incur delays. AI projects estate complexities to increase over the next 5 years.
                                                    </Text>
                                                    
                                                    <View style={{ backgroundColor: '#18181B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#8B5CF650', marginLeft: 16 }}>
                                                        <Text style={{ color: '#8B5CF6', fontSize: 11, fontWeight: '800', marginBottom: 2 }}>AI RECOMMENDATION</Text>
                                                        <Text style={{ color: '#FFF', fontSize: 12, lineHeight: 16 }}>Establish a Family Private Trust before 2028 to bypass probate and minimize future inheritance disputes.</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 12 && (() => { // Predictive Analytics
                                            // Real-time calculation based on asset properties
                                            const currentVal = p.financials.marketValuation;
                                            const baseRate = parseFloat(p.financials.cagr) > 0 ? (parseFloat(p.financials.cagr) / 100) : 0.08;
                                            
                                            // Future Predictions (Compound Interest)
                                            const val1Y = currentVal * (1 + baseRate);
                                            const val5Y = currentVal * Math.pow(1 + baseRate, 5);

                                            const formatLakhs = (val) => `₹${(val / 100000).toFixed(1)}L`;

                                            let drivers = ['Infrastructure Development', 'Inflationary Hedging'];
                                            if (p.type.toLowerCase() === 'plot') drivers = ['Peripheral Ring Road Expansion', 'Commercial Zoning Spillover'];
                                            if (p.type.toLowerCase() === 'apartment') drivers = ['Metro Phase 3 Completion', 'Corporate Tech Park Hiring Surge'];
                                            if (p.type.toLowerCase() === 'villa') drivers = ['Eco-Luxury Premium Demand', 'Suburban Wealth Migration'];

                                            return (
                                                <View>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Real-Time Market Predictor</Text>
                                                    
                                                    {/* Predictive Trajectory */}
                                                    <View style={{ backgroundColor: '#18181B', borderRadius: 16, borderWidth: 1, borderColor: '#6366F130', marginBottom: 20, overflow: 'hidden' }}>
                                                        <View style={{ backgroundColor: '#6366F115', padding: 16, borderBottomWidth: 1, borderColor: '#6366F120' }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                                                <Activity color="#6366F1" size={18} />
                                                                <Text style={{ color: '#E0E7FF', fontSize: 13, fontWeight: '800' }}>AI Valuation Trajectory</Text>
                                                                <View style={{ backgroundColor: '#10B98120', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' }}>
                                                                    <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>Live Data</Text>
                                                                </View>
                                                            </View>

                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                                <View style={{ alignItems: 'flex-start' }}>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>NOW</Text>
                                                                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>{formatLakhs(currentVal)}</Text>
                                                                </View>
                                                                <View style={{ flex: 1, height: 1, backgroundColor: '#6366F140', marginHorizontal: 12, marginBottom: 10, borderStyle: 'dashed' }} />
                                                                <View style={{ alignItems: 'center' }}>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>1-YEAR</Text>
                                                                    <Text style={{ color: '#6366F1', fontSize: 16, fontWeight: '900' }}>{formatLakhs(val1Y)}</Text>
                                                                </View>
                                                                <View style={{ flex: 1, height: 1, backgroundColor: '#6366F140', marginHorizontal: 12, marginBottom: 10, borderStyle: 'dashed' }} />
                                                                <View style={{ alignItems: 'flex-end' }}>
                                                                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>5-YEAR</Text>
                                                                    <Text style={{ color: '#6366F1', fontSize: 16, fontWeight: '900' }}>{formatLakhs(val5Y)}</Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                        
                                                        <View style={{ padding: 16, backgroundColor: '#27272A' }}>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 12 }}>REAL-TIME MARKET DRIVERS</Text>
                                                            
                                                            {drivers.map((driver, idx) => (
                                                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                                                                    <View style={{ backgroundColor: '#6366F1', width: 6, height: 6, borderRadius: 3 }} />
                                                                    <Text style={{ color: '#D4D4D8', fontSize: 13, flex: 1 }}>{driver}</Text>
                                                                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>High Impact</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    </View>

                                                    {/* Real-Time Web Analysis */}
                                                    <View style={{ backgroundColor: '#18181B', borderRadius: 16, borderWidth: 1, borderColor: '#3B82F630', overflow: 'hidden' }}>
                                                        <View style={{ backgroundColor: '#3B82F615', padding: 16, borderBottomWidth: 1, borderColor: '#3B82F620', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                            <Activity color="#3B82F6" size={18} />
                                                            <Text style={{ color: '#BFDBFE', fontSize: 13, fontWeight: '800' }}>Live Web Sentiment Analysis</Text>
                                                            <View style={{ backgroundColor: '#3B82F620', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6' }} />
                                                                <Text style={{ color: '#3B82F6', fontSize: 10, fontWeight: '800' }}>Scraping</Text>
                                                            </View>
                                                        </View>
                                                        <View style={{ padding: 16, backgroundColor: '#27272A' }}>
                                                            {p.type.toLowerCase() === 'plot' ? (
                                                                <>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                                                                        <View style={{ backgroundColor: '#10B98120', padding: 8, borderRadius: 8 }}>
                                                                            <TrendingUp color="#10B981" size={16} />
                                                                        </View>
                                                                        <View style={{ flex: 1 }}>
                                                                            <Text style={{ color: '#D4D4D8', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>"Govt fast-tracks Electronic City Metro phase..."</Text>
                                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4 }}>Economic Times • 2 hours ago</Text>
                                                                            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>AI Impact: Bullish (+4.2% local valuation)</Text>
                                                                        </View>
                                                                    </View>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                                                        <View style={{ backgroundColor: '#F59E0B20', padding: 8, borderRadius: 8 }}>
                                                                            <AlertTriangle color="#F59E0B" size={16} />
                                                                        </View>
                                                                        <View style={{ flex: 1 }}>
                                                                            <Text style={{ color: '#D4D4D8', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>"Commercial zoning changes delayed in south sector..."</Text>
                                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4 }}>Deccan Herald • 1 day ago</Text>
                                                                            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '800' }}>AI Impact: Neutral (Short-term hold)</Text>
                                                                        </View>
                                                                    </View>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                                                                        <View style={{ backgroundColor: '#10B98120', padding: 8, borderRadius: 8 }}>
                                                                            <TrendingUp color="#10B981" size={16} />
                                                                        </View>
                                                                        <View style={{ flex: 1 }}>
                                                                            <Text style={{ color: '#D4D4D8', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>"Top tech MNC announces 10,000 new jobs in local hub..."</Text>
                                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4 }}>Mint • 4 hours ago</Text>
                                                                            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>AI Impact: Highly Bullish (+6.5% yield demand)</Text>
                                                                        </View>
                                                                    </View>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                                                        <View style={{ backgroundColor: '#3B82F620', padding: 8, borderRadius: 8 }}>
                                                                            <Activity color="#3B82F6" size={16} />
                                                                        </View>
                                                                        <View style={{ flex: 1 }}>
                                                                            <Text style={{ color: '#D4D4D8', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>"Property registrations up 12% YoY in micro-market..."</Text>
                                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 4 }}>MoneyControl • 18 hours ago</Text>
                                                                            <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '800' }}>AI Impact: Positive Market Velocity</Text>
                                                                        </View>
                                                                    </View>
                                                                </>
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })()}
                                        {activeAssetTab === 13 && ( // Smart Alerts
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Immediate Action Required</Text>
                                                
                                                {/* Dynamic Current Alerts */}
                                                <View style={{ backgroundColor: '#18181B', borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 20, overflow: 'hidden' }}>
                                                    {p.operations.insurance.active === false && (
                                                        <View style={{ backgroundColor: '#EF444415', padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderBottomWidth: 1, borderColor: '#EF444430' }}>
                                                            <AlertTriangle color="#EF4444" size={20} style={{ marginTop: 2 }} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '800', marginBottom: 4 }}>Uninsured Liability Risk</Text>
                                                                <Text style={{ color: '#FCA5A5', fontSize: 11, lineHeight: 16 }}>Property has zero insurance coverage. A single natural disaster could wipe out ₹{(p.financials.marketValuation/100000).toFixed(1)}L in equity. Action required immediately.</Text>
                                                                <TouchableOpacity style={{ backgroundColor: '#EF4444', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginTop: 10 }}>
                                                                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>Get Coverage Now</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    )}
                                                    
                                                    {p.financials.loan.active && (
                                                        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#27272A' }}>
                                                            <Landmark color="#F59E0B" size={20} style={{ marginTop: 2 }} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '800', marginBottom: 4 }}>Active Debt Drain</Text>
                                                                <Text style={{ color: '#D4D4D8', fontSize: 11, lineHeight: 16 }}>EMI of ₹{p.financials.loan.emi.toLocaleString()} is currently draining your monthly cash flow agility. This debt is unoptimized.</Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                    
                                                    {p.legal.taxes.propertyTaxStatus === 'Due' && (
                                                        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#27272A', borderTopWidth: 1, borderColor: '#3F3F46' }}>
                                                            <AlertTriangle color="#EF4444" size={20} style={{ marginTop: 2 }} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '800', marginBottom: 4 }}>Property Tax Arrears</Text>
                                                                <Text style={{ color: '#FCA5A5', fontSize: 11, lineHeight: 16 }}>Pending dues will compound with a 2% monthly penalty if not cleared before the 30th.</Text>
                                                            </View>
                                                        </View>
                                                    )}

                                                    {p.legal.taxes.propertyTaxStatus !== 'Due' && !p.financials.loan.active && p.operations.insurance.active && (
                                                        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#10B98115' }}>
                                                            <CheckCircle color="#10B981" size={20} />
                                                            <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '800' }}>Zero Active Current Alerts</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Predictive Risk Forecasting</Text>
                                                
                                                <View style={{ backgroundColor: '#18181B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    {p.financials.loan.active ? (
                                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                                                            <View style={{ backgroundColor: '#8B5CF620', padding: 8, borderRadius: 8 }}>
                                                                <TrendingUp color="#8B5CF6" size={16} />
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#E9D5FF', fontSize: 13, fontWeight: '800', marginBottom: 4 }}>Interest Rate Refinance Window</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, lineHeight: 16 }}>AI predicts the RBI will drop repo rates by 50bps in Q1 2027. Refinancing your current loan then could save you an estimated <Text style={{ color: '#10B981', fontWeight: 'bold' }}>₹4.2L in interest</Text> over the tenure.</Text>
                                                            </View>
                                                        </View>
                                                    ) : (
                                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                                                            <View style={{ backgroundColor: '#8B5CF620', padding: 8, borderRadius: 8 }}>
                                                                <TrendingUp color="#8B5CF6" size={16} />
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#E9D5FF', fontSize: 13, fontWeight: '800', marginBottom: 4 }}>Macro-Economic Cycle Risk</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, lineHeight: 16 }}>AI predicts the RBI will hike rates in late 2026. This historically causes localized property appreciation to slow by <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>2-3%</Text>. Capital values are currently at peak efficiency.</Text>
                                                            </View>
                                                        </View>
                                                    )}

                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                                        <View style={{ backgroundColor: '#3B82F620', padding: 8, borderRadius: 8 }}>
                                                            <CloudRain color="#3B82F6" size={16} />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ color: '#BFDBFE', fontSize: 13, fontWeight: '800', marginBottom: 4 }}>Climate Risk: 2030 Flood Map</Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 11, lineHeight: 16 }}>Predictive climate models place this sector near a future high-drainage zone. Expect home insurance premiums to spike by ~30% in the next 3-4 years.</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 14 && (() => { // Advisor & Tips
                                            let advisorData = {
                                                title: 'Optimize Holding Strategy',
                                                desc: 'Hold asset. Property values in this sector are expected to surge due to upcoming infrastructure.',
                                                impact: '+12% Capital Value',
                                                actions: [
                                                    'Monitor nearby metro developments',
                                                    'Ensure property taxes are paid on time'
                                                ]
                                            };
                                            
                                            if (p.type.toLowerCase() === 'plot') {
                                                advisorData = {
                                                    title: 'Prevent Encroachment & Maximize Value',
                                                    desc: 'Vacant plots are highly susceptible to encroachment. The local market values secure plots at a 5-8% premium.',
                                                    impact: '+₹8.5L Valuation Bump',
                                                    actions: [
                                                        'Construct a 6ft pre-cast compound wall (Est. Cost: ₹1.2L)',
                                                        'Install a solar-powered CCTV system (Est. Cost: ₹15k)',
                                                        'Lease to a temporary nursery for active use & cash flow'
                                                    ]
                                                };
                                            } else if (p.type.toLowerCase() === 'apartment') {
                                                advisorData = {
                                                    title: 'Yield Optimization Strategy',
                                                    desc: 'Current rental yield is below market average for this society. Premium tenants demand modern aesthetics.',
                                                    impact: '+18% Rental Yield',
                                                    actions: [
                                                        'Upgrade to modular kitchen & smart lighting (Est. Cost: ₹1.5L)',
                                                        'Include high-speed internet & deep cleaning in rent',
                                                        'Target corporate expat leasing programs'
                                                    ]
                                                };
                                            } else if (p.type.toLowerCase() === 'villa') {
                                                advisorData = {
                                                    title: 'Premium Eco-Positioning',
                                                    desc: 'High net-worth individuals pay a premium for self-sustaining, eco-friendly luxury properties.',
                                                    impact: '+22% Resale Premium',
                                                    actions: [
                                                        'Install a 5kW Rooftop Solar Grid (Est. Cost: ₹3L)',
                                                        'Add smart-home automation for climate control',
                                                        'Upgrade landscaping with drought-resistant plants'
                                                    ]
                                                };
                                            }

                                            return (
                                                <View>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Strategic Advisor</Text>
                                                    
                                                    <View style={{ backgroundColor: '#18181B', borderRadius: 16, borderWidth: 1, borderColor: '#F59E0B30', marginBottom: 20, overflow: 'hidden' }}>
                                                        <View style={{ backgroundColor: '#F59E0B15', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                            <View style={{ backgroundColor: '#F59E0B', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#F59E0B', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 8 }}>
                                                                <Text style={{ fontSize: 20 }}>💡</Text>
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>PRIMARY RECOMMENDATION</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900', marginTop: 2 }}>{advisorData.title}</Text>
                                                            </View>
                                                        </View>
                                                        
                                                        <View style={{ padding: 16, backgroundColor: '#27272A', borderTopWidth: 1, borderColor: '#3F3F46' }}>
                                                            <Text style={{ color: '#D4D4D8', fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
                                                                {advisorData.desc}
                                                            </Text>
                                                            
                                                            <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 12 }}>ACTION PLAN (Q3 2026)</Text>
                                                            
                                                            {advisorData.actions.map((act, idx) => (
                                                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 }}>
                                                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B', marginTop: 6 }} />
                                                                    <Text style={{ color: '#FFF', fontSize: 13, flex: 1, lineHeight: 18 }}>{act}</Text>
                                                                </View>
                                                            ))}
                                                            
                                                            <View style={{ marginTop: 16, backgroundColor: '#10B98115', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#10B98130', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>Est. Future Impact:</Text>
                                                                <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '900' }}>{advisorData.impact}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })()}
                                        {activeAssetTab === 15 && ( // Dispute Mgmt
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Legal Title & Clearances</Text>
                                                
                                                {/* Status Banner */}
                                                <View style={{ backgroundColor: '#18181B', borderRadius: 16, borderWidth: 1, borderColor: '#10B98130', marginBottom: 20, overflow: 'hidden' }}>
                                                    <View style={{ backgroundColor: '#10B98115', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                            <View style={{ backgroundColor: '#10B981', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 8 }}>
                                                                <ShieldCheck color="#FFF" size={20} strokeWidth={2.5} />
                                                            </View>
                                                            <View>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>ASSET STATUS</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>Clean Title</Text>
                                                            </View>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end' }}>
                                                            <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>0 DISPUTES</Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, marginTop: 2 }}>Cryptographically Verified</Text>
                                                        </View>
                                                    </View>

                                                    {/* Govt Proofs */}
                                                    <View style={{ padding: 16, backgroundColor: '#27272A', borderTopWidth: 1, borderColor: '#3F3F46' }}>
                                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800', marginBottom: 12 }}>Government Integrations</Text>
                                                        
                                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                                                            <CheckCircle color="#10B981" size={16} style={{ marginTop: 2 }} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#D4D4D8', fontSize: 13, fontWeight: '700' }}>Encumbrance Certificate (EC)</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 2 }}>Synced with Kaveri Online. No active liens or mortgages found.</Text>
                                                                <Text style={{ color: '#3B82F6', fontSize: 10, marginTop: 4, fontWeight: '700' }}>Last Sync: 2 hrs ago</Text>
                                                            </View>
                                                        </View>

                                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                                                            <CheckCircle color="#10B981" size={16} style={{ marginTop: 2 }} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#D4D4D8', fontSize: 13, fontWeight: '700' }}>Land Records (RTC/Pahani)</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 2 }}>Synced with Bhoomi Portal. Mutated to owner's Aadhar seamlessly.</Text>
                                                                <Text style={{ color: '#3B82F6', fontSize: 10, marginTop: 4, fontWeight: '700' }}>A-Khata Validated</Text>
                                                            </View>
                                                        </View>

                                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                                                            <CheckCircle color="#10B981" size={16} style={{ marginTop: 2 }} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#D4D4D8', fontSize: 13, fontWeight: '700' }}>DC Conversion Order</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 2 }}>Revenue Dept verified. Land legally converted for residential use.</Text>
                                                                <Text style={{ color: '#3B82F6', fontSize: 10, marginTop: 4, fontWeight: '700' }}>ALO Verified</Text>
                                                            </View>
                                                        </View>

                                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                                                            <CheckCircle color="#10B981" size={16} style={{ marginTop: 2 }} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#D4D4D8', fontSize: 13, fontWeight: '700' }}>PTCL Endorsement</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 2 }}>Not granted land under SC/ST Act. Safe for general transfer.</Text>
                                                                <Text style={{ color: '#3B82F6', fontSize: 10, marginTop: 4, fontWeight: '700' }}>Tahsildar Digital Sign</Text>
                                                            </View>
                                                        </View>

                                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                                            <CheckCircle color="#10B981" size={16} style={{ marginTop: 2 }} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#D4D4D8', fontSize: 13, fontWeight: '700' }}>BBMP Property Tax Sync</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 2 }}>API integration with BBMP Khajane portal. Zero tax arrears.</Text>
                                                                <Text style={{ color: '#3B82F6', fontSize: 10, marginTop: 4, fontWeight: '700' }}>FY 2026-27 Paid</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Sentinel Monitoring</Text>
                                                
                                                <View style={{ backgroundColor: '#18181B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                                        <View style={{ flex: 1, backgroundColor: '#27272A', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 8 }}>SATELLITE SCAN</Text>
                                                            <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '800' }}>Clear Borders</Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, marginTop: 4 }}>0 Encroachments</Text>
                                                        </View>
                                                        <View style={{ flex: 1, backgroundColor: '#27272A', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 8 }}>LEGAL SCRAPE</Text>
                                                            <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '800' }}>0 Flagged</Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, marginTop: 4 }}>In local civil courts</Text>
                                                        </View>
                                                    </View>

                                                    <View style={{ backgroundColor: '#3B82F615', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#3B82F630' }}>
                                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800', marginBottom: 8 }}>Continuous Defense Active</Text>
                                                        <Text style={{ color: '#D4D4D8', fontSize: 12, lineHeight: 20 }}>
                                                            AI Sentinel is autonomously monitoring Govt portals every 72 hours for unauthorized EC entries. Satellite imagery is scheduled for update in 14 days to verify physical boundaries remain untouched.
                                                        </Text>
                                                        <TouchableOpacity style={{ marginTop: 12, backgroundColor: '#3B82F6', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                                                            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>Download Authenticated Dossier</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 16 && ( // Portfolio Impact
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Allocation</Text>
                                                
                                                {/* Allocation Banner */}
                                                <View style={{ backgroundColor: '#18181B', borderRadius: 16, borderWidth: 1, borderColor: '#F59E0B30', marginBottom: 20, overflow: 'hidden' }}>
                                                    <View style={{ backgroundColor: '#F59E0B15', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, paddingRight: 8 }}>
                                                            <View style={{ backgroundColor: '#F59E0B', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#F59E0B', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 8 }}>
                                                                <Wallet color="#FFF" size={20} strokeWidth={2.5} />
                                                            </View>
                                                            <View style={{ flexShrink: 1 }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>NET WORTH WEIGHT</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>25% <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600' }}>of Total</Text></Text>
                                                            </View>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                                                            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '800', textAlign: 'right' }}>HIGH CONCENTRATION</Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, marginTop: 2, textAlign: 'right' }}>Above 15% threshold</Text>
                                                        </View>
                                                    </View>

                                                    {/* Asset Role & Liquidity */}
                                                    <View style={{ padding: 16, flexDirection: 'row', borderTopWidth: 1, borderColor: '#3F3F46', backgroundColor: '#27272A' }}>
                                                        <View style={{ flex: 1, borderRightWidth: 1, borderColor: '#3F3F46', paddingRight: 12 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                                <Activity color="#10B981" size={12} />
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700' }}>PORTFOLIO ROLE</Text>
                                                            </View>
                                                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Growth Anchor</Text>
                                                        </View>
                                                        <View style={{ flex: 1, paddingLeft: 12 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                                <RefreshCw color="#EF4444" size={12} />
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700' }}>LIQUIDITY PROFILE</Text>
                                                            </View>
                                                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Low (~120 Days)</Text>
                                                        </View>
                                                    </View>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Portfolio Forecast & Rebalancing</Text>
                                                
                                                <View style={{ backgroundColor: '#18181B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                                        <View style={{ flex: 1, backgroundColor: '#27272A', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 8 }}>PROJECTED WT (2028)</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>38%</Text>
                                                            <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginTop: 4 }}>⚠️ Extreme Imbalance</Text>
                                                        </View>
                                                        <View style={{ flex: 1, backgroundColor: '#18181B', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#10B98140' }}>
                                                            <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800', marginBottom: 8 }}>AI RISK PARITY TARGET</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>15 - 20%</Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginTop: 4 }}>Optimal Allocation</Text>
                                                        </View>
                                                    </View>

                                                    <View style={{ backgroundColor: '#27272A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800', marginBottom: 8 }}>AI Capital Routing Strategy</Text>
                                                        <Text style={{ color: '#D4D4D8', fontSize: 12, lineHeight: 20 }}>
                                                            Because this asset is appreciating at 62.5% CAGR, it is rapidly absorbing your portfolio weight. By 2028, it will consume 38% of your net worth, creating a high liquidity risk.
                                                        </Text>
                                                        <View style={{ height: 1, backgroundColor: '#3F3F46', marginVertical: 12 }} />
                                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                                            <View style={{ backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 2 }}>
                                                                <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900' }}>ACTION</Text>
                                                            </View>
                                                            <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 18 }}>
                                                                Suspend all further capital injections into Real Estate. Redirect 100% of new savings into high-liquidity Equity Mutual Funds to restore parity.
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 17 && ( // Goal Planning
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Strategic Goal Alignment</Text>
                                                
                                                {/* Goal Banner */}
                                                <View style={{ backgroundColor: '#18181B', borderRadius: 16, borderWidth: 1, borderColor: '#8B5CF630', marginBottom: 20, overflow: 'hidden' }}>
                                                    <View style={{ backgroundColor: '#8B5CF615', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                            <View style={{ backgroundColor: '#8B5CF6', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 8 }}>
                                                                <Target color="#FFF" size={20} strokeWidth={2.5} />
                                                            </View>
                                                            <View>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>PRIMARY ATTACHED GOAL</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>Retirement 2040</Text>
                                                            </View>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end' }}>
                                                            <Text style={{ color: '#8B5CF6', fontSize: 12, fontWeight: '800' }}>ON TRACK</Text>
                                                            <Text style={{ color: '#10B981', fontSize: 10, marginTop: 2, fontWeight: '700' }}>Ahead by 6 yrs</Text>
                                                        </View>
                                                    </View>

                                                    {/* Progress Section */}
                                                    <View style={{ paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#27272A' }}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                            <View>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>CURRENT VALUE</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>₹{(p.financials.marketValuation/100000).toFixed(1)}L</Text>
                                                            </View>
                                                            <View style={{ alignItems: 'flex-end' }}>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>TARGET CORPUS</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>₹1.5Cr</Text>
                                                            </View>
                                                        </View>
                                                        
                                                        <View style={{ height: 8, backgroundColor: '#3F3F46', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                                                            <View style={{ width: `${Math.min(((p.financials.marketValuation / 15000000) * 100), 100)}%`, height: '100%', backgroundColor: '#8B5CF6', borderRadius: 4 }} />
                                                        </View>
                                                        <Text style={{ color: '#8B5CF6', fontSize: 11, fontWeight: '700', textAlign: 'right' }}>{((p.financials.marketValuation / 15000000) * 100).toFixed(1)}% Funded</Text>
                                                    </View>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Predictive Trajectory</Text>
                                                
                                                <View style={{ backgroundColor: '#18181B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                                        <View style={{ flex: 1, backgroundColor: '#27272A', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 8 }}>TARGET DATE</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>2040</Text>
                                                        </View>
                                                        <View style={{ flex: 1, backgroundColor: '#8B5CF615', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#8B5CF640' }}>
                                                            <Text style={{ color: '#8B5CF6', fontSize: 10, fontWeight: '800', marginBottom: 8 }}>AI EARLY HIT DATE</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>2034</Text>
                                                        </View>
                                                    </View>

                                                    <View style={{ backgroundColor: '#27272A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800', marginBottom: 8 }}>AI Strategy Assessment</Text>
                                                        <Text style={{ color: '#D4D4D8', fontSize: 12, lineHeight: 20 }}>
                                                            Based on current CAGR (62.5%) and regional market trends, this single asset is projected to cross your ₹1.5Cr retirement corpus target <Text style={{ color: '#10B981', fontWeight: 'bold' }}>6 years earlier than planned</Text>. 
                                                        </Text>
                                                        <View style={{ height: 1, backgroundColor: '#3F3F46', marginVertical: 12 }} />
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                            <AlertTriangle color="#F59E0B" size={14} />
                                                            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '600' }}>Illiquid Asset Warning</Text>
                                                        </View>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                                                            Property sales take 4-6 months on average. AI recommends beginning the liquidation process in Q1 2034 to ensure liquid cash availability for your goals.
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 18 && ( // Growth Engine
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Trajectory</Text>
                                                
                                                {/* Performance Banner */}
                                                <View style={{ backgroundColor: '#18181B', borderRadius: 16, borderWidth: 1, borderColor: '#3B82F630', marginBottom: 20, overflow: 'hidden' }}>
                                                    <View style={{ backgroundColor: '#3B82F615', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                            <View style={{ backgroundColor: '#3B82F6', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 8 }}>
                                                                <TrendingUp color="#FFF" size={20} strokeWidth={2.5} />
                                                            </View>
                                                            <View>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>REALIZED CAGR</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>{pAppreciation > 0 ? pAppreciation.toFixed(1) : 0}% <Text style={{ color: '#3B82F6', fontSize: 14, fontWeight: '600' }}>/ yr</Text></Text>
                                                            </View>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end' }}>
                                                            <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '800' }}>BEATING MARKET</Text>
                                                            <Text style={{ color: '#10B981', fontSize: 10, marginTop: 2, fontWeight: '700' }}>+48.5% Alpha</Text>
                                                        </View>
                                                    </View>
                                                    <View style={{ padding: 16, flexDirection: 'row', borderTopWidth: 1, borderColor: '#3F3F46' }}>
                                                        <View style={{ flex: 1, borderRightWidth: 1, borderColor: '#3F3F46' }}>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>PURCHASE VALUE</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>₹{(p.financials.purchasePrice/100000).toFixed(1)}L</Text>
                                                        </View>
                                                        <View style={{ flex: 1, paddingLeft: 16 }}>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>CURRENT VALUE</Text>
                                                            <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '800' }}>₹{(p.financials.marketValuation/100000).toFixed(1)}L</Text>
                                                        </View>
                                                    </View>
                                                </View>

                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Valuation Forecast</Text>
                                                
                                                <View style={{ backgroundColor: '#27272A', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46', marginBottom: 16 }}>
                                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                                                        <TrendingUp color="#8B5CF6" size={18} />
                                                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>5-Year Exponential Track</Text>
                                                    </View>
                                                    
                                                    {/* Forecast Data Grid */}
                                                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                                        <View style={{ flex: 1, backgroundColor: '#18181B', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 8 }}>2028 (METRO LIVE)</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>₹92L</Text>
                                                            <Text style={{ color: '#8B5CF6', fontSize: 11, fontWeight: '700', marginTop: 4 }}>+41% gain</Text>
                                                        </View>
                                                        <View style={{ flex: 1, backgroundColor: '#18181B', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#8B5CF640' }}>
                                                            <Text style={{ color: '#8B5CF6', fontSize: 10, fontWeight: '800', marginBottom: 8 }}>2031 (PEAK EXIT)</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>₹1.4Cr</Text>
                                                            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700', marginTop: 4 }}>+115% gain</Text>
                                                        </View>
                                                    </View>

                                                    {/* Growth Catalysts */}
                                                    <View style={{ backgroundColor: '#18181B', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#3F3F46' }}>
                                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800', marginBottom: 12 }}>Identified Growth Catalysts</Text>
                                                        
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6', marginRight: 8 }} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#D4D4D8', fontSize: 12, fontWeight: '600' }}>Metro Phase 3 Approval (2km)</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>Est. Price Impact: +18% by 2027</Text>
                                                            </View>
                                                        </View>

                                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B', marginRight: 8 }} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#D4D4D8', fontSize: 12, fontWeight: '600' }}>Tech Park Expansion (E-City)</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>Est. Price Impact: +12% by 2029</Text>
                                                            </View>
                                                        </View>
                                                        
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 8 }} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: '#D4D4D8', fontSize: 12, fontWeight: '600' }}>Land Scarcity Premium</Text>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>Est. Price Impact: +8% ongoing</Text>
                                                            </View>
                                                        </View>
                                                    </View>

                                                    {/* AI Recommendation */}
                                                    <View style={{ marginTop: 16, backgroundColor: '#8B5CF615', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#8B5CF630', flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                                                        <View style={{ backgroundColor: '#8B5CF6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>AI ACTION</Text>
                                                        </View>
                                                        <Text style={{ color: '#E9D5FF', fontSize: 13, fontWeight: '700', flex: 1 }}>
                                                            STRONG HOLD. Do not liquidate. Peak appreciation phase is currently active.
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        {activeAssetTab === 19 && (() => { // Sustainability
                                            let sMetrics = [
                                                { label: 'SOLAR PV', val: '360 kWh/mo', sub: 'Off-grid cap', subColor: '#10B981', icon: <Sun color="#10B981" size={14} /> },
                                                { label: 'RWH (SUMP)', val: '4,000 L', sub: 'Harvested/mo', subColor: '#10B981', icon: <CloudRain color="#10B981" size={14} /> },
                                                { label: 'GREYWATER', val: '0 L', sub: 'No STP Active', subColor: '#EF4444', icon: <Layers color="#EF4444" size={14} /> },
                                                { label: 'AERATORS', val: 'None', sub: '12L/min flow', subColor: '#F59E0B', icon: <Activity color="#F59E0B" size={14} /> }
                                            ];
                                            let sUpgrades = [
                                                { title: '3kW SOLAR GRID', capex: '₹1,60,000', savings: '₹2,500', breakeven: '5.3 Yrs', roi: '110%', impactText: 'Grid Independence', impactVal: '85%' },
                                                { title: 'RWH (SUMP RECHARGE)', capex: '₹15,000', savings: '₹600', breakeven: '2.1 Yrs', roi: '340%', impactText: 'Tanker Cost Cut', impactVal: '100%' },
                                                { title: 'COOL-ROOF COATING', capex: '₹8,000', savings: '₹400', breakeven: '1.6 Yrs', roi: '250%', impactText: 'AC Load Reduction', impactVal: '-15%' }
                                            ];

                                            const pType = p.type ? p.type.toLowerCase() : '';
                                            if (pType.includes('apartment')) {
                                                sMetrics = [
                                                    { label: 'EV CHARGER', val: 'Not Rdy', sub: 'Req. by 2028', subColor: '#F59E0B', icon: <Zap color="#F59E0B" size={14} /> },
                                                    { label: 'APPLIANCES', val: 'C-Tier', sub: 'High Power', subColor: '#EF4444', icon: <Activity color="#EF4444" size={14} /> },
                                                    { label: 'LOW-FLOW TAPS', val: 'None', sub: '12L/min flow', subColor: '#EF4444', icon: <CloudRain color="#EF4444" size={14} /> },
                                                    { label: 'COMPOSTING', val: 'None', sub: 'Wet waste mix', subColor: '#F59E0B', icon: <Leaf color="#F59E0B" size={14} /> }
                                                ];
                                                sUpgrades = [
                                                    { title: 'SMART HOME UPGRADE', capex: '₹85,000', savings: '₹1,500', breakeven: '4.7 Yrs', roi: '112%', impactText: 'Premium Rent', impactVal: '+₹2,500/mo' },
                                                    { title: 'EV CHARGING SLOT (15A)', capex: '₹12,000', savings: '₹0', breakeven: 'N/A', roi: '150%', impactText: 'Tenant Desirability', impactVal: '+18%' },
                                                    { title: 'BALCONY COMPOSTER', capex: '₹2,000', savings: '₹0', breakeven: 'Imm.', roi: 'Eco', impactText: 'Waste Diverted', impactVal: '30kg/mo' }
                                                ];
                                            } else if (pType.includes('plot')) {
                                                sMetrics = [
                                                    { label: 'RWH PITS', val: 'Pending', sub: 'Mandatory', subColor: '#F59E0B', icon: <CloudRain color="#F59E0B" size={14} /> },
                                                    { label: 'ECO-BOUNDARY', val: 'None', sub: 'Erosion Risk', subColor: '#EF4444', icon: <Leaf color="#EF4444" size={14} /> },
                                                    { label: 'SOIL TEST', val: 'Overdue', sub: 'Req for build', subColor: '#F59E0B', icon: <Layers color="#F59E0B" size={14} /> },
                                                    { label: 'TREES', val: '0', sub: 'Heat island', subColor: '#EF4444', icon: <Sun color="#EF4444" size={14} /> }
                                                ];
                                                sUpgrades = [
                                                    { title: 'RECHARGE PITS (x2)', capex: '₹45,000', savings: '₹0', breakeven: 'N/A', roi: 'Compliance', impactText: 'BBMP Penalty Avoided', impactVal: '100%' },
                                                    { title: 'BIO-FENCING', capex: '₹20,000', savings: '₹0', breakeven: 'N/A', roi: 'Security', impactText: 'Soil Erosion', impactVal: 'Prevented' }
                                                ];
                                            }

                                            const renderMetric = (m, isLeft) => (
                                                <View style={{ flex: 1, padding: 16, borderRightWidth: isLeft ? 1 : 0, borderColor: '#3F3F46' }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                        {m.icon}
                                                        <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700' }}>{m.label}</Text>
                                                    </View>
                                                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>{m.val}</Text>
                                                    <Text style={{ color: m.subColor, fontSize: 11, marginTop: 4, fontWeight: '600' }}>{m.sub}</Text>
                                                </View>
                                            );

                                            return (
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>ESG Compliance & Green Score</Text>
                                                
                                                <View style={{ backgroundColor: '#18181B', borderRadius: 16, borderWidth: 1, borderColor: '#10B98130', marginBottom: 20, overflow: 'hidden' }}>
                                                    {/* Header Banner */}
                                                    <View style={{ backgroundColor: '#10B98115', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                            <View style={{ backgroundColor: '#10B981', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 8 }}>
                                                                <Leaf color="#FFF" size={20} strokeWidth={2.5} />
                                                            </View>
                                                            <View>
                                                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>CURRENT RATING</Text>
                                                                <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>B+ <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '600' }}>/ A</Text></Text>
                                                            </View>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end' }}>
                                                            <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>TOP 30%</Text>
                                                            <Text style={{ color: '#A1A1AA', fontSize: 10, marginTop: 2 }}>in Bangalore South</Text>
                                                        </View>
                                                    </View>

                                                    <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#27272A' }}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                                            <Text style={{ color: '#D4D4D8', fontSize: 11, fontWeight: '600' }}>Score Progress to A-tier</Text>
                                                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>78 / 85 pts</Text>
                                                        </View>
                                                        <View style={{ height: 6, backgroundColor: '#3F3F46', borderRadius: 3, overflow: 'hidden' }}>
                                                            <View style={{ width: '85%', height: '100%', backgroundColor: '#10B981', borderRadius: 3 }} />
                                                        </View>
                                                    </View>

                                                    {/* Metric Grid - 4 Metrics */}
                                                    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: '#3F3F46' }}>
                                                        {renderMetric(sMetrics[0], true)}
                                                        {renderMetric(sMetrics[1], false)}
                                                    </View>
                                                    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: '#3F3F46' }}>
                                                        {renderMetric(sMetrics[2], true)}
                                                        {renderMetric(sMetrics[3], false)}
                                                    </View>
                                                </View>
                                                
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Actionable Eco-Upgrades (AI Predictive)</Text>
                                                
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ overflow: 'visible', marginBottom: 20 }}>
                                                    {sUpgrades.map((u, idx) => (
                                                        <View key={idx} style={{ backgroundColor: '#18181B', borderRadius: 12, borderWidth: 1, borderColor: '#EAB30840', overflow: 'hidden', width: 280, marginRight: 16 }}>
                                                            <View style={{ backgroundColor: '#EAB30815', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#EAB30820' }}>
                                                                <Text style={{ color: '#EAB308', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }}>{u.title}</Text>
                                                            </View>
                                                            
                                                            <View style={{ padding: 16 }}>
                                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                                                    <View style={{ flex: 1, borderRightWidth: 1, borderColor: '#3F3F46', paddingRight: 12 }}>
                                                                        <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>EST. CAPEX</Text>
                                                                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>{u.capex}</Text>
                                                                    </View>
                                                                    <View style={{ flex: 1, paddingLeft: 12 }}>
                                                                        <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>MONTHLY SAVINGS</Text>
                                                                        <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '800' }}>{u.savings}</Text>
                                                                    </View>
                                                                </View>

                                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                                                    <View style={{ flex: 1, borderRightWidth: 1, borderColor: '#3F3F46', paddingRight: 12 }}>
                                                                        <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>BREAK-EVEN</Text>
                                                                        <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '800' }}>{u.breakeven}</Text>
                                                                    </View>
                                                                    <View style={{ flex: 1, paddingLeft: 12 }}>
                                                                        <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>ROI</Text>
                                                                        <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '800' }}>{u.roi}</Text>
                                                                    </View>
                                                                </View>
                                                                
                                                                <View style={{ backgroundColor: '#27272A', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>{u.impactText}</Text>
                                                                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>{u.impactVal}</Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                            );
                                        })()}
                                        {activeAssetTab === 20 && ( // Automation
                                            <View>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>AUTOMATED TASKS</Text>
                                                <View style={{ backgroundColor: '#27272A', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                                    <Text style={{ color: '#FFF', fontSize: 12 }}>• Auto-pay Property Tax: DISABLED</Text>
                                                    <Text style={{ color: '#FFF', fontSize: 12, marginTop: 4 }}>• Auto-pay EMI: {p.financials.loan.active ? 'ENABLED' : 'N/A'}</Text>
                                                </View>
                                            </View>
                                        )}
</ScrollView>
                                </View>
                            );
                        })()}
                    </View>
                </View>
            </Modal>

            {/* Add Property Modal */}
            <Modal visible={isAddPropertyModalVisible} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#3F3F46', maxHeight: '90%' }}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 16 }}>Add Real Estate Asset</Text>
                            
                            <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>BASIC INFO</Text>
                            <TextInput style={[styles.input, { marginBottom: 12 }]} placeholderTextColor="#A1A1AA" placeholder="Property Name (e.g. Villa 24)" value={newPropertyForm.name} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, name: t })} />
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                {['Plot', 'Apartment', 'Commercial'].map(type => (
                                    <Pressable key={type} onPress={() => setNewPropertyForm({ ...newPropertyForm, type })} style={{ flex: 1, paddingVertical: 8, backgroundColor: newPropertyForm.type === type ? '#6366F1' : '#27272A', borderRadius: 6, alignItems: 'center' }}>
                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{type}</Text>
                                    </Pressable>
                                ))}
                            </View>
                            <TextInput style={[styles.input, { marginBottom: 12 }]} placeholderTextColor="#A1A1AA" placeholder="Location/City" value={newPropertyForm.location} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, location: t })} />
                            <TextInput style={[styles.input, { marginBottom: 12 }]} placeholderTextColor="#A1A1AA" placeholder="Size (SqFt)" keyboardType="numeric" value={newPropertyForm.sizeSqFt} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, sizeSqFt: t })} />
                            
                            <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12 }}>FINANCIALS</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                <TextInput style={[styles.input, { flex: 1 }]} placeholderTextColor="#A1A1AA" placeholder="Purchase Price (₹)" keyboardType="numeric" value={newPropertyForm.purchasePrice} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, purchasePrice: t })} />
                                <TextInput style={[styles.input, { flex: 1 }]} placeholderTextColor="#A1A1AA" placeholder="Current Value (₹)" keyboardType="numeric" value={newPropertyForm.marketValuation} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, marketValuation: t })} />
                            </View>
                            <TextInput style={[styles.input, { marginBottom: 12 }]} placeholderTextColor="#A1A1AA" placeholder="Purchase Date (YYYY-MM-DD)" value={newPropertyForm.purchaseDate} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, purchaseDate: t })} />
                            
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: '#27272A', padding: 12, borderRadius: 8 }}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Active Loan?</Text>
                                <Switch value={newPropertyForm.loanActive} onValueChange={(v) => setNewPropertyForm({ ...newPropertyForm, loanActive: v })} />
                            </View>
                            {newPropertyForm.loanActive && (
                                <View style={{ backgroundColor: '#27272A', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                                    <TextInput style={[styles.input, { marginBottom: 8, backgroundColor: '#18181B' }]} placeholderTextColor="#A1A1AA" placeholder="Outstanding Balance (₹)" keyboardType="numeric" value={newPropertyForm.outstandingBalance} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, outstandingBalance: t })} />
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TextInput style={[styles.input, { flex: 1, backgroundColor: '#18181B' }]} placeholderTextColor="#A1A1AA" placeholder="Monthly EMI (₹)" keyboardType="numeric" value={newPropertyForm.emi} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, emi: t })} />
                                        <TextInput style={[styles.input, { flex: 1, backgroundColor: '#18181B' }]} placeholderTextColor="#A1A1AA" placeholder="Interest Rate (%)" keyboardType="numeric" value={newPropertyForm.interestRate} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, interestRate: t })} />
                                    </View>
                                </View>
                            )}
                            
                            <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12 }}>RENTAL INCOME</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                <TextInput style={[styles.input, { flex: 1 }]} placeholderTextColor="#A1A1AA" placeholder="Monthly Rent (₹)" keyboardType="numeric" value={newPropertyForm.monthlyRent} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, monthlyRent: t })} />
                                <TextInput style={[styles.input, { flex: 1 }]} placeholderTextColor="#A1A1AA" placeholder="Lease Expiry" value={newPropertyForm.leaseExpiry} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, leaseExpiry: t })} />
                            </View>
                            
                            <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12 }}>LEGAL & TAXES</Text>
                            <TextInput style={[styles.input, { marginBottom: 12 }]} placeholderTextColor="#A1A1AA" placeholder="Nominee Name(s)" value={newPropertyForm.nominee} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, nominee: t })} />
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                <TextInput style={[styles.input, { flex: 1 }]} placeholderTextColor="#A1A1AA" placeholder="Tax Status (Paid/Due)" value={newPropertyForm.propertyTaxStatus} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, propertyTaxStatus: t })} />
                                <TextInput style={[styles.input, { flex: 1 }]} placeholderTextColor="#A1A1AA" placeholder="Tax Due Date" value={newPropertyForm.nextDueDate} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, nextDueDate: t })} />
                            </View>
                            
                            <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12 }}>INSURANCE & MAINTENANCE</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: '#27272A', padding: 12, borderRadius: 8 }}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Active Insurance?</Text>
                                <Switch value={newPropertyForm.insuranceActive} onValueChange={(v) => setNewPropertyForm({ ...newPropertyForm, insuranceActive: v })} />
                            </View>
                            {newPropertyForm.insuranceActive && (
                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                    <TextInput style={[styles.input, { flex: 1 }]} placeholderTextColor="#A1A1AA" placeholder="Provider" value={newPropertyForm.insuranceProvider} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, insuranceProvider: t })} />
                                    <TextInput style={[styles.input, { flex: 1 }]} placeholderTextColor="#A1A1AA" placeholder="Expiry Date" value={newPropertyForm.insuranceExpiry} onChangeText={(t) => setNewPropertyForm({ ...newPropertyForm, insuranceExpiry: t })} />
                                </View>
                            )}
                            
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 }}>
                                <Pressable style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#27272A', alignItems: 'center' }} onPress={() => setIsAddPropertyModalVisible(false)}>
                                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Cancel</Text>
                                </Pressable>
                                <Pressable style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center' }} onPress={() => {
                                    if(!newPropertyForm.name) return;
                                    const newProp = {
                                        id: 'pr' + Date.now(),
                                        name: newPropertyForm.name,
                                        type: newPropertyForm.type,
                                        location: newPropertyForm.location,
                                        financials: {
                                            purchasePrice: parseFloat(newPropertyForm.purchasePrice) || 0,
                                            purchaseDate: newPropertyForm.purchaseDate || 'N/A',
                                            marketValuation: parseFloat(newPropertyForm.marketValuation) || 0,
                                            loan: {
                                                active: newPropertyForm.loanActive,
                                                outstandingBalance: parseFloat(newPropertyForm.outstandingBalance) || 0,
                                                emi: parseFloat(newPropertyForm.emi) || 0,
                                                interestRate: parseFloat(newPropertyForm.interestRate) || 0
                                            },
                                            rental: {
                                                active: (parseFloat(newPropertyForm.monthlyRent) > 0),
                                                tenantName: '',
                                                monthlyRent: parseFloat(newPropertyForm.monthlyRent) || 0,
                                                leaseExpiry: newPropertyForm.leaseExpiry
                                            },
                                            expenses: { monthlyMaintenance: 0 }
                                        },
                                        legal: {
                                            circleRate: 0,
                                            sizeSqFt: parseFloat(newPropertyForm.sizeSqFt) || 0,
                                            govSyncStatus: 'pending verification',
                                            taxes: {
                                                propertyTaxStatus: newPropertyForm.propertyTaxStatus,
                                                nextDueDate: newPropertyForm.nextDueDate
                                            },
                                            documents: [{ name: 'Sale Deed', secured: false, location: '' }],
                                            nominee: newPropertyForm.nominee || 'Not Specified',
                                            handoverNotes: '',
                                            disputes: 'None'
                                        },
                                        operations: {
                                            maintenanceLog: [],
                                            insurance: {
                                                active: newPropertyForm.insuranceActive,
                                                provider: newPropertyForm.insuranceProvider,
                                                expiry: newPropertyForm.insuranceExpiry
                                            },
                                            utilities: { electricityBoard: 'Pending', waterBoard: 'Pending' },
                                            security: 'Not Setup'
                                        },
                                        market: { infrastructureUpdates: 'Fetching data...', comparableSales: 'Fetching data...', environmentalRisk: 'Calculating...' },
                                        riskAssessment: { floodRisk: 'Unknown', legalRisk: 'Pending Check', overallRiskScore: 0, heatmapData: [] },
                                        sustainability: { solarGeneration: 'N/A', waterUsage: 'N/A', carbonFootprint: 'N/A', efficiencyScore: 0 },
                                        predictiveAnalytics: { projectedROI5Yr: 'Calculating...', bestTimeToSell: 'Calculating...', cashFlowTrend: 'Stable' },
                                        goals: { targetValue: 0, timeline: 'N/A', progress: 0 }
                                    };
                                    setProperties(prev => [...prev, newProp]);
                                    setIsAddPropertyModalVisible(false);
                                    setNewPropertyForm({
                                        name: '', type: 'Plot', location: '', purchasePrice: '', purchaseDate: '', sizeSqFt: '', marketValuation: '', 
                                        nominee: '', loanActive: false, outstandingBalance: '', emi: '', interestRate: '',
                                        monthlyRent: '', leaseExpiry: '', propertyTaxStatus: 'Paid', nextDueDate: '',
                                        maintenanceLog: '', insuranceActive: false, insuranceProvider: '', insuranceExpiry: ''
                                    });
                                }}>
                                    <Text style={{ color: '#FFF', fontWeight: '800' }}>Add Asset</Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── ➕ CREATE LOAN MODAL (EXACT MATCH WIZARD + REVIEW SCREEN FROM SCREENSHOTS) ── */}
            <Modal
                visible={showAddLoanModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddLoanModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
                    <View style={{ width: '100%', maxHeight: '92%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, overflow: 'hidden' }}>
                        
                        {/* Top Process Steps (Chevron / Arrow Style Wizard Header) */}
                        {loanWizardTab !== 'Review' && (
                            <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 8, padding: 2, marginBottom: 14 }}>
                                {[
                                    { key: 'Loan', label: 'Loan' },
                                    { key: 'Interest', label: 'Interest' },
                                    { key: 'Details', label: 'Details' },
                                    { key: 'Repayment', label: 'Repayment' }
                                ].map((step, idx) => {
                                    const isActive = loanWizardTab === step.key;
                                    return (
                                        <TouchableOpacity
                                            key={step.key}
                                            onPress={() => setLoanWizardTab(step.key)}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 10,
                                                alignItems: 'center',
                                                backgroundColor: isActive ? '#2563EB' : 'transparent',
                                                borderTopLeftRadius: idx === 0 ? 6 : 0,
                                                borderBottomLeftRadius: idx === 0 ? 6 : 0,
                                                borderTopRightRadius: idx === 3 ? 6 : 0,
                                                borderBottomRightRadius: idx === 3 ? 6 : 0,
                                            }}
                                        >
                                            <Text style={{ color: isActive ? '#FFFFFF' : '#475569', fontSize: 12, fontWeight: isActive ? '700' : '600' }}>
                                                {step.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
                            
                            {/* ── STEP 1: LOAN ── */}
                            {loanWizardTab === 'Loan' && (
                                <View style={{ gap: 12 }}>
                                    <View style={{ flexDirection: 'row', backgroundColor: '#CBD5E1', borderRadius: 8, padding: 3 }}>
                                        <TouchableOpacity
                                            onPress={() => setNewLoanType('GIVEN')}
                                            style={{ flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center', backgroundColor: newLoanType === 'GIVEN' ? '#10B981' : 'transparent' }}
                                        >
                                            <Text style={{ color: newLoanType === 'GIVEN' ? '#FFF' : '#334155', fontSize: 13, fontWeight: '800' }}>🟢 LOAN GIVEN</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setNewLoanType('TAKEN')}
                                            style={{ flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center', backgroundColor: newLoanType === 'TAKEN' ? '#EF4444' : 'transparent' }}
                                        >
                                            <Text style={{ color: newLoanType === 'TAKEN' ? '#FFF' : '#334155', fontSize: 13, fontWeight: '800' }}>🔴 LOAN TAKEN</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Borrower / Lender Name</Text>
                                        <TextInput
                                            placeholder="Enter Name..."
                                            placeholderTextColor="#94A3B8"
                                            value={newLoanName}
                                            onChangeText={setNewLoanName}
                                            style={{ backgroundColor: '#F1F5F9', color: '#0F172A', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, fontSize: 14, fontWeight: '600' }}
                                        />
                                    </View>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Loan Amount</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 12 }}>
                                            <Text style={{ color: '#0F172A', fontSize: 15, fontWeight: '800', marginRight: 4 }}>₹</Text>
                                            <TextInput
                                                keyboardType="numeric"
                                                value={newLoanAmount}
                                                onChangeText={setNewLoanAmount}
                                                style={{ flex: 1, color: '#0F172A', paddingVertical: 10, fontSize: 16, fontWeight: '800' }}
                                            />
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                            <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Given on Date</Text>
                                            <TextInput
                                                value={newLoanGivenDate}
                                                onChangeText={setNewLoanGivenDate}
                                                style={{ backgroundColor: '#F1F5F9', color: '#0F172A', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, fontSize: 13, fontWeight: '700' }}
                                            />
                                        </View>
                                        <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                            <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Loan Number</Text>
                                            <TextInput
                                                value={newLoanNumber}
                                                onChangeText={setNewLoanNumber}
                                                style={{ backgroundColor: '#F1F5F9', color: '#2563EB', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, fontSize: 13, fontWeight: '800' }}
                                            />
                                        </View>
                                    </View>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Assign to</Text>
                                        <TextInput
                                            value={newLoanAssignTo}
                                            onChangeText={setNewLoanAssignTo}
                                            style={{ backgroundColor: '#F1F5F9', color: '#0F172A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontSize: 13, fontWeight: '600' }}
                                        />
                                    </View>
                                </View>
                            )}

                            {loanWizardTab === 'Interest' && (
                                <View style={{ gap: 12 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                        <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '700' }}>Add interest on this loan</Text>
                                        <Switch
                                            value={addInterestEnabled}
                                            onValueChange={setAddInterestEnabled}
                                            trackColor={{ false: '#CBD5E1', true: '#2563EB' }}
                                            thumbColor="#FFF"
                                        />
                                    </View>

                                    {addInterestEnabled && (
                                        <>
                                            <View style={{ flexDirection: 'row', backgroundColor: '#CBD5E1', borderRadius: 8, padding: 2 }}>
                                                <TouchableOpacity
                                                    onPress={() => setInterestMode('Rate')}
                                                    style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: interestMode === 'Rate' ? '#2563EB' : 'transparent' }}
                                                >
                                                    <Text style={{ color: interestMode === 'Rate' ? '#FFF' : '#334155', fontSize: 12, fontWeight: '700' }}>Interest Rate</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => setInterestMode('Amount')}
                                                    style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: interestMode === 'Amount' ? '#2563EB' : 'transparent' }}
                                                >
                                                    <Text style={{ color: interestMode === 'Amount' ? '#FFF' : '#334155', fontSize: 12, fontWeight: '700' }}>Interest Amount</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                                {interestMode === 'Rate' ? (
                                                    <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>% Interest Rate</Text>
                                                        <TextInput
                                                            keyboardType="numeric"
                                                            value={newLoanInterestRate}
                                                            onChangeText={setNewLoanInterestRate}
                                                            style={{ color: '#0F172A', fontSize: 14, fontWeight: '700', marginTop: 4 }}
                                                        />
                                                    </View>
                                                ) : (
                                                    <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Interest Amount (₹)</Text>
                                                        <TextInput
                                                            keyboardType="numeric"
                                                            placeholder="0"
                                                            value={newLoanInterestAmount}
                                                            onChangeText={(val) => {
                                                                setNewLoanInterestAmount(val);
                                                                const p = parseFloat(newLoanAmount) || 0;
                                                                const amtVal = parseFloat(val) || 0;
                                                                if (p > 0) {
                                                                    setNewLoanInterestRate(((amtVal / p) * 100).toFixed(2));
                                                                }
                                                            }}
                                                            style={{ color: '#0F172A', fontSize: 14, fontWeight: '700', marginTop: 4 }}
                                                        />
                                                    </View>
                                                )}
                                                <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                                    <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Amt / Interval</Text>
                                                    <TouchableOpacity
                                                        onPress={() => setShowIntervalDropdown(!showIntervalDropdown)}
                                                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}
                                                    >
                                                        <Text style={{ color: '#2563EB', fontSize: 13, fontWeight: '700' }}>{newLoanInterestInterval}</Text>
                                                        <ChevronDown size={16} color="#2563EB" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            {showIntervalDropdown && (
                                                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
                                                    {['Loan Amount 🏅', 'On Interval', 'per Year', 'per Month', 'per Week'].map((item) => (
                                                        <TouchableOpacity
                                                            key={item}
                                                            onPress={() => {
                                                                setNewLoanInterestInterval(item);
                                                                setShowIntervalDropdown(false);
                                                            }}
                                                            style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                                                        >
                                                            <Text style={{ color: newLoanInterestInterval === item ? '#2563EB' : '#475569', fontSize: 12, fontWeight: '600' }}>{item}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            )}

                                            <View style={{ backgroundColor: '#E2E8F0', padding: 10, borderRadius: 8, alignItems: 'center' }}>
                                                <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '800' }}>
                                                    {newLoanInterestInterval === 'per Year' 
                                                        ? `Yearly Interest Amount : ₹${Math.round(((parseFloat(newLoanAmount) || 0) * (parseFloat(newLoanInterestRate) || 0)) / 100).toLocaleString('en-IN')}` 
                                                        : `Monthly Interest Amount : ₹${Math.round((((parseFloat(newLoanAmount) || 0) * (parseFloat(newLoanInterestRate) || 0)) / 100) / 12).toLocaleString('en-IN')}`}
                                                </Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                            )}

                            {loanWizardTab === 'Details' && (
                                <View style={{ gap: 12 }}>
                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '700' }}>Deductions</Text>
                                            <Switch
                                                value={newLoanDeductionsEnabled}
                                                onValueChange={setNewLoanDeductionsEnabled}
                                                trackColor={{ false: '#CBD5E1', true: '#2563EB' }}
                                                thumbColor="#FFF"
                                            />
                                        </View>
                                        <Text style={{ color: '#64748B', fontSize: 11, fontStyle: 'italic' }}>By enabling you can add processing fees, Insurance etc</Text>
                                        
                                        {newLoanDeductionsEnabled && (
                                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={{ color: '#475569', fontSize: 12 }}>Processing Fee (₹)</Text>
                                                    <TextInput keyboardType="numeric" value={newLoanProcessingFee} onChangeText={setNewLoanProcessingFee} style={{ backgroundColor: '#F1F5F9', width: 90, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, textAlign: 'right', fontSize: 12 }} />
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={{ color: '#475569', fontSize: 12 }}>Insurance Charges (₹)</Text>
                                                    <TextInput keyboardType="numeric" value={newLoanInsuranceCharges} onChangeText={setNewLoanInsuranceCharges} style={{ backgroundColor: '#F1F5F9', width: 90, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, textAlign: 'right', fontSize: 12 }} />
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600' }}>Loan Amount</Text>
                                            <Text style={{ color: '#0F172A', fontSize: 15, fontWeight: '800' }}>₹{parseFloat(newLoanAmount || 0).toLocaleString('en-IN')}.00</Text>
                                        </View>
                                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 16 }}>💸</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600' }}>Payout Amount</Text>
                                            <Text style={{ color: '#0F172A', fontSize: 15, fontWeight: '800' }}>₹{(parseFloat(newLoanAmount || 0) - (newLoanDeductionsEnabled ? (parseFloat(newLoanProcessingFee||0)+parseFloat(newLoanInsuranceCharges||0)) : 0)).toLocaleString('en-IN')}.00</Text>
                                        </View>
                                    </View>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Notes</Text>
                                        <TextInput
                                            placeholder="Add purpose of the Loan or any other details"
                                            placeholderTextColor="#94A3B8"
                                            multiline={true}
                                            value={newLoanNote}
                                            onChangeText={setNewLoanNote}
                                            style={{ backgroundColor: '#F1F5F9', color: '#0F172A', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, fontSize: 13, height: 65, textAlignVertical: 'top' }}
                                        />
                                    </View>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>Attachments</Text>
                                        <TouchableOpacity style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                                            <Text style={{ color: '#0F172A', fontSize: 11, fontWeight: '700' }}>Choose file  No file chosen</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity onPress={() => Alert.alert('Collateral', 'You can link real estate or gold collateral.')} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
                                        <Text style={{ color: '#2563EB', fontSize: 13, fontWeight: '700' }}>Add Collateral ↗</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {loanWizardTab === 'Repayment' && (
                                <View style={{ gap: 12 }}>
                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '700' }}>Collect Interest only</Text>
                                            <Switch
                                                value={collectInterestOnly}
                                                onValueChange={(val) => {
                                                    setCollectInterestOnly(val);
                                                    if (val) {
                                                        setRepaymentPlanType('One Time Payment');
                                                    }
                                                }}
                                                trackColor={{ false: '#CBD5E1', true: '#2563EB' }}
                                                thumbColor="#FFF"
                                            />
                                        </View>
                                        <Text style={{ color: '#64748B', fontSize: 11, fontStyle: 'italic' }}>Enable this to collect interest on regular interval</Text>
                                    </View>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>Penalty for Overdue (%)</Text>
                                        <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}>
                                            <TextInput
                                                value={penaltyForOverdue}
                                                onChangeText={(val) => setPenaltyForOverdue(val)}
                                                keyboardType="numeric"
                                                style={{ color: '#2563EB', fontSize: 13, fontWeight: '800', textAlign: 'right', minWidth: 25, padding: 2 }}
                                            />
                                            <Text style={{ color: '#2563EB', fontSize: 13, fontWeight: '800', marginLeft: 2 }}>%</Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 8, padding: 3 }}>
                                        <TouchableOpacity
                                            onPress={() => setRepaymentPlanType('Repayment Plan')}
                                            style={{ flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center', backgroundColor: repaymentPlanType === 'Repayment Plan' ? '#2563EB' : 'transparent' }}
                                        >
                                            <Text style={{ color: repaymentPlanType === 'Repayment Plan' ? '#FFF' : '#334155', fontSize: 12, fontWeight: '800' }}>Repayment Plan</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setRepaymentPlanType('One Time Payment')}
                                            style={{ flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center', backgroundColor: repaymentPlanType === 'One Time Payment' ? '#2563EB' : 'transparent' }}
                                        >
                                            <Text style={{ color: repaymentPlanType === 'One Time Payment' ? '#FFF' : '#334155', fontSize: 12, fontWeight: '800' }}>One Time Payment</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {repaymentPlanType === 'One Time Payment' ? (
                                        <View style={{ gap: 10 }}>
                                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
                                                <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Loan Due Date (Optional)</Text>
                                                <TextInput placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" style={{ color: '#0F172A', fontSize: 13, fontWeight: '600' }} />
                                            </View>
                                            <View style={{ backgroundColor: '#E2E8F0', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                                                <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>Loan duration: NA</Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={{ gap: 10 }}>
                                            <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 8, padding: 3 }}>
                                                <TouchableOpacity
                                                    onPress={() => setPaymentTenureType('Fixed Payment')}
                                                    style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: paymentTenureType === 'Fixed Payment' ? '#2563EB' : 'transparent' }}
                                                >
                                                    <Text style={{ color: paymentTenureType === 'Fixed Payment' ? '#FFF' : '#334155', fontSize: 12, fontWeight: '800' }}>Fixed Payment</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => setPaymentTenureType('Fixed Tenure')}
                                                    style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: paymentTenureType === 'Fixed Tenure' ? '#2563EB' : 'transparent' }}
                                                >
                                                    <Text style={{ color: paymentTenureType === 'Fixed Tenure' ? '#FFF' : '#334155', fontSize: 12, fontWeight: '800' }}>Fixed Tenure</Text>
                                                </TouchableOpacity>
                                            </View>

                                            {paymentTenureType === 'Fixed Tenure' && (
                                                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
                                                    <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>No. of Installments</Text>
                                                    <TextInput
                                                        keyboardType="numeric"
                                                        value={noOfInstallments}
                                                        onChangeText={setNoOfInstallments}
                                                        style={{ color: '#0F172A', fontSize: 14, fontWeight: '700' }}
                                                    />
                                                </View>
                                            )}

                                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
                                                <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Frequency</Text>
                                                <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>{newLoanRepaymentFrequency}</Text>
                                            </View>

                                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
                                                <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>First Payment Date</Text>
                                                <TextInput
                                                    value={firstPaymentDate}
                                                    onChangeText={setFirstPaymentDate}
                                                    style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}
                                                />
                                            </View>

                                            <TouchableOpacity style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
                                                <Text style={{ color: '#2563EB', fontSize: 13, fontWeight: '700' }}>Show Repayments ↗</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}

                            {loanWizardTab === 'Review' && (
                                <View style={{ gap: 12 }}>
                                    <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 4 }}>Review Loan Details</Text>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '700' }}>Payout Amount</Text>
                                        <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800' }}>₹{parseFloat(newLoanAmount || 0).toLocaleString('en-IN')}.00</Text>
                                    </View>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <View>
                                                <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700' }}>Loan Amount</Text>
                                                <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '800' }}>₹{parseFloat(newLoanAmount || 0).toLocaleString('en-IN')}.00</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700' }}>Given on</Text>
                                                <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>{newLoanGivenDate}</Text>
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <View>
                                                <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700' }}>Interest</Text>
                                                <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>{newLoanInterestRate}%</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700' }}>Interest Amount</Text>
                                                <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>₹{Math.round(((parseFloat(newLoanAmount)||0)*(parseFloat(newLoanInterestRate)||0))/100).toLocaleString('en-IN')}.00</Text>
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 }}>
                                            <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Interest Type</Text>
                                            <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '700' }}>Simple Interest Loan</Text>
                                        </View>
                                    </View>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <View>
                                                <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700' }}>Monthly EMI</Text>
                                                <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '800' }}>₹1,906.47</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700' }}>First Payment</Text>
                                                <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>{firstPaymentDate}</Text>
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <View>
                                                <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700' }}>No.of payments</Text>
                                                <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>{noOfInstallments}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700' }}>EST.to close by</Text>
                                                <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '700' }}>31 Jan 2029 (2 Yrs, 5 Mos)</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '700' }}>Assigned to</Text>
                                        <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '700' }}>{newLoanAssignTo}</Text>
                                    </View>

                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                                        <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>Charges and Details ➔</Text>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#64748B', fontSize: 11 }}>Processing fee</Text>
                                            <Text style={{ color: '#0F172A', fontSize: 11, fontWeight: '600' }}>₹{newLoanProcessingFee}.00</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#64748B', fontSize: 11 }}>Insurance Charges</Text>
                                            <Text style={{ color: '#0F172A', fontSize: 11, fontWeight: '600' }}>₹{newLoanInsuranceCharges}.00</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#64748B', fontSize: 11 }}>Document Charges</Text>
                                            <Text style={{ color: '#0F172A', fontSize: 11, fontWeight: '600' }}>₹{newLoanDocumentCharges}.00</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#64748B', fontSize: 11 }}>Penalty for Overdue</Text>
                                            <Text style={{ color: '#0F172A', fontSize: 11, fontWeight: '600' }}>₹{penaltyForOverdue}.00</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                        </ScrollView>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (loanWizardTab === 'Review') setLoanWizardTab('Repayment');
                                    else if (loanWizardTab === 'Repayment') setLoanWizardTab('Details');
                                    else if (loanWizardTab === 'Details') setLoanWizardTab('Interest');
                                    else if (loanWizardTab === 'Interest') setLoanWizardTab('Loan');
                                    else setShowAddLoanModal(false);
                                }}
                                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#CBD5E1' }}
                            >
                                <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>{loanWizardTab === 'Loan' ? 'Cancel' : '← Back'}</Text>
                            </TouchableOpacity>

                            {loanWizardTab !== 'Repayment' && loanWizardTab !== 'Review' && (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (loanWizardTab === 'Loan') setLoanWizardTab('Interest');
                                        else if (loanWizardTab === 'Interest') setLoanWizardTab('Details');
                                        else if (loanWizardTab === 'Details') setLoanWizardTab('Repayment');
                                    }}
                                    style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2563EB' }}
                                >
                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>Next →</Text>
                                </TouchableOpacity>
                            )}

                            {loanWizardTab === 'Repayment' && (
                                <TouchableOpacity
                                    onPress={() => setLoanWizardTab('Review')}
                                    style={{ paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: '#38BDF8', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                >
                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>Review Loan ➔</Text>
                                </TouchableOpacity>
                            )}

                            {loanWizardTab === 'Review' && (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (!newLoanName || !newLoanAmount) {
                                            Alert.alert('Missing Details', 'Please fill in Name and Amount on the Loan tab.');
                                            setLoanWizardTab('Loan');
                                            return;
                                        }
                                        const amt = parseFloat(newLoanAmount) || 0;
                                        const rate = addInterestEnabled ? (parseFloat(newLoanInterestRate) || 0) : 0;
                                        const newEntity = {
                                            id: 'c-' + Date.now(),
                                            name: newLoanName,
                                            type: newLoanType.toLowerCase(),
                                            subLoans: [
                                                {
                                                    id: newLoanNumber || `Loan-${Math.floor(100 + Math.random() * 900)}`,
                                                    disbursedDate: newLoanGivenDate,
                                                    durationMonths: parseInt(noOfInstallments) || 12,
                                                    principal: amt,
                                                    rate: rate,
                                                    interestType: isCompounding ? 'COMPOUND' : 'SIMPLE',
                                                    emi: 1906.47,
                                                    status: 'active',
                                                    payments: []
                                                }
                                            ]
                                        };
                                        setLoansList(prev => [newEntity, ...prev]);
                                        setShowAddLoanModal(false);
                                        setLoanWizardTab('Loan');
                                        Alert.alert('Success', `Loan ${newLoanType} (${newLoanNumber}) created successfully!`);
                                    }}
                                    style={{ paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: '#0066FF', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                >
                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>✓ Save Loan</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                    </View>
                </View>
            </Modal>

            {/* ── 🧮 SIMPLE CALCULATOR MODAL ── */}
            <Modal
                visible={showCalculator}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCalculator(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ width: 320, backgroundColor: '#18181B', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#27272A', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 }}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Calculator size={20} color="#6366F1" />
                                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Quick Calculator</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => setShowCalculator(false)}
                                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#27272A', justifyContent: 'center', alignItems: 'center' }}
                            >
                                <Text style={{ color: '#A1A1AA', fontSize: 14, fontWeight: '800' }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Display Screen */}
                        <View style={{ backgroundColor: '#09090B', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#27272A', minHeight: 70, justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                            <Text style={{ color: '#A1A1AA', fontSize: 14, fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>
                                {calculatorInput || '0'}
                            </Text>
                            <Text style={{ color: '#10B981', fontSize: 24, fontWeight: '900' }} numberOfLines={1}>
                                {calculatorResult ? `= ${calculatorResult}` : ''}
                            </Text>
                        </View>

                        {/* Keypad Buttons Grid */}
                        <View style={{ gap: 10 }}>
                            {[
                                ['C', '÷', '×', '⌫'],
                                ['7', '8', '9', '-'],
                                ['4', '5', '6', '+'],
                                ['1', '2', '3', '='],
                                ['0', '00', '.', '=']
                            ].slice(0, 4).concat([['0', '00', '.', '=']]).map((row, rIdx) => (
                                <View key={rIdx} style={{ flexDirection: 'row', gap: 10 }}>
                                    {row.map((btn, bIdx) => {
                                        const isAction = ['C', '⌫', '÷', '×', '-', '+', '='].includes(btn);
                                        const isEquals = btn === '=';
                                        return (
                                            <TouchableOpacity
                                                key={bIdx}
                                                onPress={() => handleCalcPress(btn)}
                                                style={{
                                                    flex: 1,
                                                    height: 48,
                                                    borderRadius: 12,
                                                    backgroundColor: isEquals ? '#6366F1' : (isAction ? '#27272A' : '#09090B'),
                                                    borderWidth: 1,
                                                    borderColor: isEquals ? '#6366F1' : '#27272A',
                                                    justifyContent: 'center',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Text style={{
                                                    color: isEquals ? '#FFF' : (btn === 'C' ? '#EF4444' : (isAction ? '#818CF8' : '#FFF')),
                                                    fontSize: isAction ? 18 : 16,
                                                    fontWeight: '800'
                                                }}>
                                                    {btn}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', paddingLeft: 0 },
    statusBarSpacer: { height: 40 },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
    backBtn: { padding: 8 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '850' },
    tabScroll: { paddingHorizontal: 16, height: 44, alignItems: 'center' },
    tabItem: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, backgroundColor: '#101012', marginRight: 8 },
    tabItemActive: { backgroundColor: '#6366F1' },
    tabItemText: { color: '#71717A', fontSize: 12, fontWeight: '750' },
    tabItemTextActive: { color: '#FFF' },
    subTabScroll: { height: 36, alignItems: 'center' },
    subTabItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#000', marginRight: 6, borderWidth: 1, borderColor: '#27272A' },
    subTabItemActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    subTabItemText: { color: '#71717A', fontSize: 11, fontWeight: '700' },
    subTabItemTextActive: { color: '#FFF' },
    contentScroll: { flex: 1, padding: 16 },
    card: { backgroundColor: '#101012', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#FFFFFF05' },
    cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 16 },
    table: { borderWidth: 1, borderColor: '#27272A', borderRadius: 10, overflow: 'hidden', marginBottom: 20 },
    tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#27272A' },
    tableHeaderRow: { backgroundColor: '#18181B' },
    tableHeaderCell: { flex: 1, color: '#A1A1AA', fontSize: 11, fontWeight: '700', textAlign: 'center' },
    tableCellLabel: { flex: 1, color: '#FFF', fontSize: 12, fontWeight: '800', textAlign: 'center' },
    tableCell: { flex: 1, color: '#FFF', fontSize: 12, textAlign: 'center' },
    subHeader: { color: '#FFF', fontSize: 14, fontWeight: '750', marginVertical: 12 },
    categoryProgressRow: { marginBottom: 14 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    categoryLabel: { color: '#D4D4D8', fontSize: 12 },
    categoryVal: { color: '#FFF', fontSize: 12, fontWeight: '750' },
    progressBarBg: { height: 6, backgroundColor: '#27272A', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
    progressBarFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 3 },
    form: { gap: 10, marginVertical: 10 },
    input: { backgroundColor: '#000', color: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#27272A', fontSize: 13 },
    typeBtn: { flex: 1, backgroundColor: '#27272A', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    typeBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    submitBtn: { backgroundColor: '#6366F1', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
    submitBtnText: { color: '#FFF', fontWeight: '800' },
    balancesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    bankBalanceCard: { width: '100%', marginBottom: 12, backgroundColor: '#000', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#27272A', gap: 4 },
    bankName: { color: '#A1A1AA', fontSize: 11 },
    bankBalance: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    smsCard: { backgroundColor: '#000', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF03' },
    smsSender: { color: '#A1A1AA', fontSize: 12, fontWeight: '800' },
    smsStatus: { fontSize: 10, fontWeight: '800' },
    smsText: { color: '#FFF', fontSize: 12, marginVertical: 8 },
    syncBtn: { backgroundColor: '#10B981', paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginTop: 4 },
    syncBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    subCard: { backgroundColor: '#000', padding: 14, borderRadius: 12, gap: 4, marginTop: 12, borderWidth: 1, borderColor: '#FFFFFF03' },
    subCardTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    subCardDesc: { color: '#71717A', fontSize: 12 },
    doneBtn: { backgroundColor: '#6366F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    doneBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    amortCard: { backgroundColor: '#000', padding: 16, borderRadius: 14, marginTop: 12, gap: 6, borderWidth: 1, borderColor: '#6366F120' },
    amortTitle: { color: '#6366F1', fontSize: 13, fontWeight: '800', marginBottom: 6 },
    schRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#FFFFFF03' },
    schText: { color: '#A1A1AA', fontSize: 11 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF05', alignItems: 'center' },
    itemName: { color: '#D4D4D8', fontSize: 13, flex: 1 },
    itemVal: { color: '#FFF', fontSize: 13, fontWeight: '750' },
    reminderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF05' },
    reminderText: { color: '#FFF', fontSize: 13 },
    reminderTextDone: { color: '#52525B', textDecorationLine: 'line-through' },
    vaultVal: { color: '#10B981', fontSize: 32, fontWeight: '900', textAlign: 'center', marginVertical: 20 },
    claimsCard: { backgroundColor: '#000', padding: 16, borderRadius: 14, marginTop: 12, gap: 6, borderWidth: 1 },
    claimsTitle: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
    claimsField: { color: '#FFF', fontSize: 12, lineHeight: 18 },
    formContainer: { backgroundColor: '#000', padding: 16, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: '#FFFFFF03', gap: 12 },
    formGroup: { gap: 6 },
    formLabel: { color: '#A1A1AA', fontSize: 11, fontWeight: '700' },
    formInput: { backgroundColor: '#18181B', color: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#27272A', fontSize: 13 },
    formRow: { flexDirection: 'row', alignItems: 'center' },
    dropdownSelectBox: { backgroundColor: '#18181B', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#27272A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 45 },
    dropdownSelectBoxText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    dropdownOptionsContainer: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: '#18181B', borderRadius: 10, borderWidth: 1, borderColor: '#27272A', zIndex: 1000, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
    dropdownOptionItem: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#27272A' },
    dropdownOptionText: { color: '#FFF', fontSize: 12 },
    txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF03', marginBottom: 6 },
    txIconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#18181B', alignItems: 'center', justifyContent: 'center' },
    txDesc: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    txMeta: { color: '#71717A', fontSize: 11, marginTop: 2 },
    txAmt: { fontSize: 13, fontWeight: '900', marginRight: 10 },
    txDeleteBtn: { padding: 6 },
    typeSwitcher: { flexDirection: 'row', gap: 10, marginTop: 4 },
    typeButton: { flex: 1, backgroundColor: '#18181B', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#27272A' },
    typeButtonExpenseActive: { backgroundColor: '#EF444420', borderColor: '#EF4444' },
    typeButtonIncomeActive: { backgroundColor: '#10B98120', borderColor: '#10B981' },
    typeText: { color: '#71717A', fontSize: 13, fontWeight: '800' },
    typeTextActive: { color: '#FFF' },
    yearsCounterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#27272A', marginBottom: 16 },
    yearsCounterLabel: { color: '#FFF', fontSize: 13, fontWeight: '750' },
    counterControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    counterBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', alignItems: 'center', justifyContent: 'center' },
    counterBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    counterValText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    categoryExpandedContainer: { paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#6366F120', marginTop: 10, gap: 8 },
    emptyCatText: { color: '#71717A', fontSize: 11, fontStyle: 'italic', paddingVertical: 6 },
    txItemWrapper: { backgroundColor: '#000', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FFFFFF03' },
    txItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    txDetailBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#27272A', gap: 6 },
    txDetailLabel: { color: '#A1A1AA', fontSize: 11, fontWeight: '750' },
    txDetailText: { color: '#FFF', fontSize: 11, lineHeight: 16 },
    txDetailStatus: { color: '#D4D4D8', fontSize: 10, fontWeight: '750', marginTop: 2 },

    // Financial Hub Extensions (State of the art Styles)
    subHubTabBar: { 
        flexDirection: 'row', 
        backgroundColor: '#101012', 
        borderRadius: 16, 
        padding: 4, 
        marginBottom: 16, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    subHubTabButton: { 
        flex: 1, 
        paddingVertical: 10, 
        borderRadius: 12, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    subHubTabButtonActive: { 
        backgroundColor: '#1E1E24' 
    },
    subHubTabText: { 
        color: '#71717A', 
        fontSize: 13, 
        fontWeight: '750' 
    },
    subHubTabTextActive: { 
        color: '#FFF' 
    },
    dashboardProfileHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
    },
    profileInfo: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12 
    },
    profileAvatarBox: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        backgroundColor: '#10B981', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    profileAvatarText: { 
        color: '#FFF', 
        fontSize: 16, 
        fontWeight: '800' 
    },
    profileNameText: { 
        color: '#FFF', 
        fontSize: 16, 
        fontWeight: '800' 
    },
    profileRoleText: { 
        color: '#71717A', 
        fontSize: 12, 
        marginTop: 2 
    },
    headerActionRow: { 
        flexDirection: 'row', 
        gap: 10 
    },
    iconActionBtn: { 
        width: 38, 
        height: 38, 
        borderRadius: 10, 
        backgroundColor: '#101012', 
        borderWidth: 1, 
        borderColor: '#FFFFFF05', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    calcPanel: { 
        backgroundColor: '#101012', 
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 16, 
        borderWidth: 1, 
        borderColor: '#6366F120' 
    },
    calcHeader: { 
        color: '#FFF', 
        fontWeight: '800', 
        marginBottom: 10, 
        fontSize: 13 
    },
    calcInput: { 
        backgroundColor: '#09090B', 
        color: '#FFF', 
        fontSize: 13, 
        padding: 10, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    calcBtn: { 
        backgroundColor: '#6366F1', 
        paddingVertical: 8, 
        paddingHorizontal: 16, 
        borderRadius: 8, 
        alignItems: 'center' 
    },
    calcResultText: { 
        color: '#10B981', 
        fontSize: 13, 
        fontWeight: '800', 
        marginTop: 10 
    },
    netPositionCard: { 
        backgroundColor: '#101012', 
        borderRadius: 20, 
        padding: 20, 
        marginBottom: 16, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    netPositionHeader: { 
        color: '#A1A1AA', 
        fontSize: 11, 
        fontWeight: '700' 
    },
    netPositionAmount: { 
        color: '#FFF', 
        fontSize: 28, 
        fontWeight: '850', 
        marginVertical: 10 
    },
    netStatsSplitRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        borderTopWidth: 1, 
        borderTopColor: '#FFFFFF05', 
        paddingTop: 10 
    },
    splitText: { 
        fontSize: 12, 
        fontWeight: '750' 
    },
    gridActionRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginBottom: 16, 
        gap: 8 
    },
    gridActionItem: { 
        flex: 1, 
        backgroundColor: '#101012', 
        borderRadius: 16, 
        padding: 12, 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    gridIconContainer: { 
        width: 36, 
        height: 36, 
        borderRadius: 10, 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 8 
    },
    gridActionName: { 
        color: '#FFF', 
        fontSize: 11, 
        fontWeight: '800', 
        textAlign: 'center' 
    },
    gridActionDesc: { 
        color: '#52525B', 
        fontSize: 9, 
        marginTop: 2, 
        textAlign: 'center' 
    },
    interestSplitRow: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    interestBox: { 
        flex: 1, 
        alignItems: 'center' 
    },
    interestBoxTitle: { 
        color: '#71717A', 
        fontSize: 11, 
        fontWeight: '700' 
    },
    interestBoxVal: { 
        fontSize: 15, 
        fontWeight: '850', 
        marginTop: 6 
    },
    interestVerticalSeparator: { 
        width: 1, 
        height: 40, 
        backgroundColor: '#FFFFFF05' 
    },
    collectionCard: { 
        backgroundColor: '#101012', 
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 12, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05', 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    collectionCardTitle: { 
        color: '#FFF', 
        fontWeight: '800', 
        fontSize: 13 
    },
    debtFreeCard: { 
        backgroundColor: '#101012', 
        borderRadius: 16, 
        padding: 16, 
        borderWidth: 1, 
        borderColor: '#10B98120' 
    },
    loansTabHeaderRow: { 
        flexDirection: 'row', 
        gap: 8, 
        marginBottom: 12 
    },
    loanHeaderTabBtn: { 
        flex: 1, 
        paddingVertical: 8, 
        borderRadius: 10, 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: '#FFFFFF05', 
        backgroundColor: '#101012' 
    },
    loanHeaderTabBtnActive: { 
        backgroundColor: '#1E1E24' 
    },
    loanHeaderTabBtnText: { 
        color: '#71717A', 
        fontSize: 11, 
        fontWeight: '800' 
    },
    loanHeaderTabBtnTextActive: { 
        color: '#FFF' 
    },
    loanContactCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#101012', 
        padding: 16, 
        borderRadius: 16, 
        marginBottom: 10, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    contactAvatarBox: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: '#6366F115', 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderWidth: 1, 
        borderColor: '#6366F130' 
    },
    contactAvatarText: { 
        color: '#6366F1', 
        fontWeight: '800', 
        fontSize: 14 
    },
    contactCardName: { 
        color: '#FFF', 
        fontSize: 14, 
        fontWeight: '800' 
    },
    contactCardSub: { 
        color: '#71717A', 
        fontSize: 11, 
        marginTop: 2 
    },
    floatingAddBtn: { 
        position: 'absolute', 
        right: 16, 
        bottom: 100, 
        width: 56, 
        height: 56, 
        borderRadius: 28, 
        backgroundColor: '#3B82F6', 
        alignItems: 'center', 
        justifyContent: 'center', 
        elevation: 8, 
        shadowColor: '#000', 
        shadowOpacity: 0.3, 
        shadowOffset: { width: 0, height: 4 } 
    },
    level2Header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 16 
    },
    backBtn: { 
        padding: 6, 
        borderRadius: 8, 
        backgroundColor: '#101012', 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    level2Title: { 
        color: '#FFF', 
        fontSize: 16, 
        fontWeight: '850', 
        marginLeft: 12 
    },
    balanceFormulaCard: { 
        backgroundColor: '#101012', 
        borderRadius: 20, 
        padding: 16, 
        marginBottom: 16, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    balanceFormulaSub: { 
        color: '#A1A1AA', 
        fontSize: 11, 
        fontWeight: '700', 
        textAlign: 'center', 
        marginBottom: 12 
    },
    balanceFormulaRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    formulaElement: { 
        alignItems: 'center', 
        flex: 1 
    },
    formulaVal: { 
        color: '#FFF', 
        fontSize: 13, 
        fontWeight: '800' 
    },
    formulaLabel: { 
        color: '#71717A', 
        fontSize: 10, 
        marginTop: 4 
    },
    formulaSymbol: { 
        color: '#A1A1AA', 
        fontSize: 14, 
        fontWeight: '800', 
        marginHorizontal: 4 
    },
    contactTabSelectorRow: { 
        flexDirection: 'row', 
        backgroundColor: '#101012', 
        borderRadius: 12, 
        padding: 3, 
        marginBottom: 12, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    contactTabBtn: { 
        flex: 1, 
        paddingVertical: 8, 
        borderRadius: 9, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    contactTabBtnActive: { 
        backgroundColor: '#1E1E24' 
    },
    contactTabBtnText: { 
        color: '#71717A', 
        fontSize: 11, 
        fontWeight: '800' 
    },
    contactTabBtnTextActive: { 
        color: '#FFF' 
    },
    pendingSubLoanCard: { 
        backgroundColor: '#101012', 
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 12, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    settleUpOrangeBtn: { 
        backgroundColor: '#F59E0B', 
        borderRadius: 16, 
        paddingVertical: 14, 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginTop: 16, 
        marginBottom: 32 
    },
    historyPaymentRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#101012', 
        padding: 14, 
        borderRadius: 14, 
        marginBottom: 8, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    historyArrowContainer: { 
        width: 32, 
        height: 32, 
        borderRadius: 8, 
        backgroundColor: '#10B98115', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    clearanceCard: { 
        backgroundColor: '#101012', 
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 16, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    clearanceBarBG: { 
        height: 8, 
        backgroundColor: '#1E1E24', 
        borderRadius: 4, 
        overflow: 'hidden' 
    },
    clearanceBarFill: { 
        height: '100%', 
        backgroundColor: '#10B981', 
        borderRadius: 4 
    },
    paramsGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 10, 
        marginBottom: 16 
    },
    paramGridBox: { 
        width: '48%', 
        backgroundColor: '#101012', 
        borderRadius: 14, 
        padding: 12, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    paramBoxLabel: { 
        color: '#71717A', 
        fontSize: 10, 
        fontWeight: '700' 
    },
    paramBoxVal: { 
        color: '#FFF', 
        fontSize: 13, 
        fontWeight: '800', 
        marginTop: 4 
    },
    repaymentCard: { 
        backgroundColor: '#101012', 
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 16, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    dateBadge: { 
        width: 44, 
        height: 44, 
        borderRadius: 10, 
        backgroundColor: '#3B82F615', 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderWidth: 1, 
        borderColor: '#3B82F630' 
    },
    dateBadgeDay: { 
        color: '#3B82F6', 
        fontSize: 14, 
        fontWeight: '800' 
    },
    dateBadgeMonth: { 
        color: '#3B82F6', 
        fontSize: 9, 
        marginTop: 1 
    },
    repaymentBtnRow: { 
        flexDirection: 'row', 
        gap: 8, 
        marginTop: 14 
    },
    repayBtn: { 
        flex: 1, 
        paddingVertical: 8, 
        borderRadius: 10, 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: '#FFFFFF05', 
        backgroundColor: '#09090B' 
    },
    commentSendBtn: { 
        backgroundColor: '#6366F1', 
        paddingHorizontal: 16, 
        borderRadius: 10, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    remindBtn: { 
        backgroundColor: '#10B981', 
        borderRadius: 14, 
        paddingVertical: 12, 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 20 
    },
    payerChip: { 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 8, 
        backgroundColor: '#101012', 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    payerChipActive: { 
        backgroundColor: '#6366F1', 
        borderColor: '#6366F1' 
    },
    splitRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingVertical: 10, 
        borderBottomWidth: 1, 
        borderBottomColor: '#FFFFFF05' 
    },
    settleMiniBtn: { 
        backgroundColor: '#10B981', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 8 
    },
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20 
    },
    modalContent: { 
        width: '100%', 
        backgroundColor: '#101012', 
        borderRadius: 20, 
        padding: 20, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05' 
    },
    modalHeaderRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
    },
    modalTitleText: { 
        color: '#FFF', 
        fontSize: 16, 
        fontWeight: '800' 
    },
    modalInput: { 
        backgroundColor: '#09090B', 
        color: '#FFF', 
        fontSize: 13, 
        padding: 10, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: '#FFFFFF05', 
        marginBottom: 10 
    },
    loanTypeBtn: { 
        flex: 1, 
        paddingVertical: 10, 
        borderRadius: 10, 
        backgroundColor: '#27272A', 
        alignItems: 'center' 
    },
    modalSubmitBtn: { 
        backgroundColor: '#3B82F6', 
        borderRadius: 12, 
        paddingVertical: 12, 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginTop: 10 
    },
});
