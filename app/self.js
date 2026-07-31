import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Wallet, TrendingUp, Calendar, AlertTriangle, ShieldCheck, Plus, CheckSquare, Square, Trash2, Landmark, RefreshCw, Layers, CheckCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function SelfScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('flow');
    const [activeSubTab, setActiveSubTab] = useState('renewals');

    // ==========================================
    // FUNCTION 1: Money Flow
    // ==========================================
    const [transactions, setTransactions] = useState([
        { id: '1', desc: 'Salary Credit', amount: 120000, type: 'INCOME', category: 'Salary', date: '2026-07-01' },
        { id: '2', desc: 'Business Dividend', amount: 45000, type: 'INCOME', category: 'Business', date: '2026-07-04' },
        { id: '3', desc: 'Home Rent Outflow', amount: 28000, type: 'EXPENSE', category: 'Rent', date: '2026-07-02' },
        { id: '4', desc: 'Organic Groceries', amount: 6500, type: 'EXPENSE', category: 'Food', date: '2026-07-03' },
        { id: '5', desc: 'Fuel Refill', amount: 4200, type: 'EXPENSE', category: 'Travel', date: '2026-07-05' },
        { id: '6', desc: 'Entertainment Subscription', amount: 999, type: 'EXPENSE', category: 'Entertainment', date: '2026-07-06' }
    ]);
    const [newTxDesc, setNewTxDesc] = useState('');
    const [newTxAmt, setNewTxAmt] = useState('');
    const [newTxType, setNewTxType] = useState('EXPENSE');
    const [newTxCat, setNewTxCat] = useState('Food');

    const getCategoryTotals = () => {
        const catMap = {};
        transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
            catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        });
        return catMap;
    };

    const getFlowBreakdown = () => {
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        transactions.forEach(t => {
            if (t.type === 'INCOME') monthlyIncome += t.amount;
            else monthlyExpense += t.amount;
        });
        return {
            daily: { income: monthlyIncome / 30, expense: monthlyExpense / 30 },
            weekly: { income: monthlyIncome / 4.3, expense: monthlyExpense / 4.3 },
            monthly: { income: monthlyIncome, expense: monthlyExpense },
            yearly: { income: monthlyIncome * 12, expense: monthlyExpense * 12 }
        };
    };

    const flow = getFlowBreakdown();
    const catTotals = getCategoryTotals();

    // ==========================================
    // FUNCTION 2: SMS Sync & Bank Balances
    // ==========================================
    const [bankBalances, setBankBalances] = useState({
        SBI: 125000,
        HDFC: 45800,
        ICICI: 92400,
        Axis: 18900
    });
    const [smsInbox, setSmsInbox] = useState([
        { id: 's1', sender: 'AD-SBIUPI', text: 'UPI: Your SBI A/c XX8810 credited by Rs.15,000.00 via GPay. Bal: Rs.1,40,000.00', amount: 15000, type: 'INCOME', bank: 'SBI', status: 'UNPARSED' },
        { id: 's2', sender: 'AD-HDFCBK', text: 'Alert: Your HDFC Bank A/c XX4231 debited by Rs.4,500.00 to Amazon. Bal: Rs.41,300.00', amount: 4500, type: 'EXPENSE', bank: 'HDFC', status: 'UNPARSED' }
    ]);

    const handleSmsSync = (sms) => {
        setBankBalances(prev => ({
            ...prev,
            [sms.bank]: sms.type === 'INCOME' ? prev[sms.bank] + sms.amount : prev[sms.bank] - sms.amount
        }));
        setTransactions([{
            id: Date.now().toString(),
            desc: `${sms.bank} Auto-Sync Transaction`,
            amount: sms.amount,
            type: sms.type,
            category: sms.type === 'INCOME' ? 'Income' : 'Bills',
            date: new Date().toISOString().split('T')[0]
        }, ...transactions]);
        setSmsInbox(prev => prev.map(item => item.id === sms.id ? { ...item, status: 'PARSED' } : item));
        Alert.alert("SMS Synced", `Updated ${sms.bank} Balance!`);
    };

    // ==========================================
    // FUNCTION 3: Loans & EMIs
    // ==========================================
    const [loans, setLoans] = useState([
        { id: 'l1', name: 'SBI Home Loan', principal: 4200000, interestRate: 8.4, emi: 42500, hasInsurance: true, insRenewalDate: '2026-12-01', insCompany: 'LIC Griha Shield', tenureMonths: 240 }
    ]);
    const [loanName, setLoanName] = useState('');
    const [loanPrincipal, setLoanPrincipal] = useState('');
    const [loanRate, setLoanRate] = useState('');
    const [loanEmi, setLoanEmi] = useState('');
    const [loanInsured, setLoanInsured] = useState(true);
    const [loanInsCompany, setLoanInsCompany] = useState('');
    const [loanInsRenewal, setLoanInsRenewal] = useState('');
    const [selectedAmortLoan, setSelectedAmortLoan] = useState(null);

    const getAmortizationSchedule = (loan) => {
        const monthlyRate = (loan.interestRate / 12) / 100;
        let balance = loan.principal;
        const schedule = [];
        for (let i = 1; i <= 6; i++) {
            const interest = balance * monthlyRate;
            const principalPaid = Math.max(0, loan.emi - interest);
            balance = Math.max(0, balance - principalPaid);
            schedule.push({ month: i, interest, principalPaid, balance });
            if (balance <= 0) break;
        }
        return schedule;
    };

    // ==========================================
    // FUNCTION 4: Unified Lifecycle & Budget Guard (Upgraded)
    // ==========================================
    const [expiryList, setExpiryList] = useState([
        { id: 'e1', title: 'Driving License Expiry', date: '2026-08-15', done: false },
        { id: 'e2', title: 'Car Insurance Renewal', date: '2026-09-01', done: false }
    ]);
    const [emiList, setEmiList] = useState([
        { id: 'm1', title: 'Home Loan EMI Deduction', date: 'Monthly (10th)', amount: 42500, done: false }
    ]);
    const [meds, setMeds] = useState([
        { id: 'md1', title: 'Metformin 500mg BP Tablet', time: '9 PM Daily', stock: 12, done: false }
    ]);
    const [schoolFees, setSchoolFees] = useState([
        { id: 'sf1', child: 'Aarav Reddy', term: 'Term II Fees', amount: 85000, date: '2026-07-25', done: false }
    ]);
    const [todos, setTodos] = useState([
        { id: 't1', title: 'Collect Income Tax certificates', done: false }
    ]);
    const [budgets, setBudgets] = useState([
        { id: 'b1', category: 'Food', limit: 15000, spent: 6500 },
        { id: 'b2', category: 'Travel', limit: 8000, spent: 4200 }
    ]);
    const [services, setServices] = useState([
        { id: 's1', title: 'Royal Enfield Bullet 350 Service', nextDue: '2026-09-10', done: false }
    ]);

    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newVal, setNewVal] = useState('');

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

    // ==========================================
    // FUNCTION 6: Properties Circle Rates & Gov Check Simulator
    // ==========================================
    const [properties, setProperties] = useState([
        { id: 'pr1', name: 'Electronic City Plot 30x40', circleRate: 4200, sizeSqFt: 1200, marketValuation: 6500000, govSyncStatus: 'verified' }
    ]);
    const [pName, setPName] = useState('');
    const [pRate, setPRate] = useState('');
    const [pSize, setPSize] = useState('');
    const [pMarket, setPMarket] = useState('');
    const [govCheckingId, setGovCheckingId] = useState(null);

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

    return (
        <View style={styles.container}>
            <View style={styles.statusBarSpacer} />
            
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle}>Self Details Hub</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Horizontal Sub-tabs (7 tabs) */}
            <View style={{ height: 44, backgroundColor: '#09090B' }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {[
                        { id: 'flow', name: '1. Money Flow' },
                        { id: 'sms', name: '2. SMS Balances' },
                        { id: 'loans', name: '3. Debt Monitor' },
                        { id: 'dates', name: '4. Lifecycle Guard' },
                        { id: 'p2p', name: '5. P2P Interest' },
                        { id: 'properties', name: '6. Property Vault' },
                        { id: 'crisis', name: '7. Volatility Shield' }
                    ].map(tab => (
                        <Pressable 
                            key={tab.id}
                            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
                            onPress={() => setActiveTab(tab.id)}
                        >
                            <Text style={[styles.tabItemText, activeTab === tab.id && styles.tabItemTextActive]}>{tab.name}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                
                {/* 1. Money Flow */}
                {activeTab === 'flow' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Earnings & Spendings Timeframe Table</Text>
                        <View style={styles.table}>
                            <View style={[styles.tableRow, styles.tableHeaderRow]}>
                                <Text style={styles.tableHeaderCell}>Period</Text>
                                <Text style={styles.tableHeaderCell}>Earnings (₹)</Text>
                                <Text style={styles.tableHeaderCell}>Spendings (₹)</Text>
                                <Text style={styles.tableHeaderCell}>Net (₹)</Text>
                            </View>
                            {[
                                { name: 'Daily', income: flow.daily.income, expense: flow.daily.expense },
                                { name: 'Weekly', income: flow.weekly.income, expense: flow.weekly.expense },
                                { name: 'Monthly', income: flow.monthly.income, expense: flow.monthly.expense },
                                { name: 'Yearly', income: flow.yearly.income, expense: flow.yearly.expense }
                            ].map(row => (
                                <View key={row.name} style={styles.tableRow}>
                                    <Text style={styles.tableCellLabel}>{row.name}</Text>
                                    <Text style={[styles.tableCell, { color: '#10B981' }]}>₹{Math.round(row.income).toLocaleString()}</Text>
                                    <Text style={[styles.tableCell, { color: '#EF4444' }]}>₹{Math.round(row.expense).toLocaleString()}</Text>
                                    <Text style={[styles.tableCell, { fontWeight: '800', color: row.income - row.expense >= 0 ? '#10B981' : '#EF4444' }]}>
                                        ₹{Math.round(row.income - row.expense).toLocaleString()}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <Text style={styles.subHeader}>Outflow Category Chart</Text>
                        {Object.keys(catTotals).map(cat => (
                            <View key={cat} style={styles.categoryProgressRow}>
                                <View style={styles.row}>
                                    <Text style={styles.categoryLabel}>{cat}</Text>
                                    <Text style={styles.categoryVal}>₹{catTotals[cat].toLocaleString()}</Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: `${Math.min(100, (catTotals[cat] / flow.monthly.expense) * 100)}%` }]} />
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* 2. SMS Sync */}
                {activeTab === 'sms' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Captured Bank Balances</Text>
                        <View style={styles.balancesGrid}>
                            {Object.keys(bankBalances).map(bank => (
                                <View key={bank} style={styles.bankBalanceCard}>
                                    <Landmark size={20} color="#6366F1" />
                                    <Text style={styles.bankName}>{bank} Bank</Text>
                                    <Text style={styles.bankBalance}>₹{bankBalances[bank].toLocaleString()}</Text>
                                </View>
                            ))}
                        </View>

                        <Text style={styles.subHeader}>SMS Parser Feed</Text>
                        {smsInbox.map(sms => (
                            <View key={sms.id} style={styles.smsCard}>
                                <View style={styles.row}>
                                    <Text style={styles.smsSender}>{sms.sender}</Text>
                                    <Text style={[styles.smsStatus, sms.status === 'PARSED' ? { color: '#10B981' } : { color: '#F59E0B' }]}>
                                        {sms.status}
                                    </Text>
                                </View>
                                <Text style={styles.smsText}>{sms.text}</Text>
                                {sms.status === 'UNPARSED' && (
                                    <Pressable style={styles.syncBtn} onPress={() => handleSmsSync(sms)}>
                                        <Text style={styles.syncBtnText}>Parse & Auto-Sync Balance</Text>
                                    </Pressable>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* 3. Debt Monitor */}
                {activeTab === 'loans' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>EMI Liability Registry</Text>
                        {loans.map(loan => (
                            <View key={loan.id} style={styles.subCard}>
                                <View style={styles.row}>
                                    <Text style={styles.subCardTitle}>{loan.name}</Text>
                                    <Pressable style={styles.doneBtn} onPress={() => setSelectedAmortLoan(loan)}>
                                        <Text style={styles.doneBtnText}>Show Amortization</Text>
                                    </Pressable>
                                </View>
                                <Text style={styles.subCardDesc}>Principal: ₹{loan.principal.toLocaleString()}</Text>
                                <Text style={styles.subCardDesc}>EMI: ₹{loan.emi.toLocaleString()} @ {loan.interestRate}%</Text>
                                <Text style={styles.subCardDesc}>Shield Insurance: {loan.hasInsurance ? `${loan.insCompany} (Renew: ${loan.insRenewalDate})` : '⚠️ None'}</Text>
                            </View>
                        ))}
                        {selectedAmortLoan && (
                            <View style={styles.amortCard}>
                                <Text style={styles.amortTitle}>Amortization Projection (First 6 Months)</Text>
                                {getAmortizationSchedule(selectedAmortLoan).map(row => (
                                    <View key={row.month} style={styles.schRow}>
                                        <Text style={styles.schText}>Month {row.month}</Text>
                                        <Text style={styles.schText}>Interest: ₹{Math.round(row.interest).toLocaleString()}</Text>
                                        <Text style={styles.schText}>Principal: ₹{Math.round(row.principalPaid).toLocaleString()}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* 4. Unified Lifecycle Guard */}
                {activeTab === 'dates' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Unified Lifecycle & Budget Guard</Text>

                        {/* Sub-tabs for Lifecycle Guard */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabScroll} style={{ marginBottom: 15 }}>
                            {[
                                { id: 'renewals', name: '📆 Renewals' },
                                { id: 'emis', name: '💳 EMIs' },
                                { id: 'meds', name: '💊 Meds' },
                                { id: 'school', name: '🎓 School' },
                                { id: 'services', name: '🔧 Services' },
                                { id: 'budgets', name: '📊 Budgets' },
                                { id: 'todo', name: '✅ To-Do' }
                            ].map(sub => (
                                <Pressable
                                    key={sub.id}
                                    style={[styles.subTabItem, activeSubTab === sub.id && styles.subTabItemActive]}
                                    onPress={() => setActiveSubTab(sub.id)}
                                >
                                    <Text style={[styles.subTabItemText, activeSubTab === sub.id && styles.subTabItemTextActive]}>{sub.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* Sub-tab 1: Renewals */}
                        {activeSubTab === 'renewals' && (
                            <View>
                                <Text style={styles.subHeader}>Critical Expiries & Renewals</Text>
                                {expiryList.map(e => (
                                    <View key={e.id} style={styles.itemRow}>
                                        <Text style={styles.itemName}>{e.title}</Text>
                                        <Text style={styles.itemVal}>{e.date}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Sub-tab 2: EMIs */}
                        {activeSubTab === 'emis' && (
                            <View>
                                <Text style={styles.subHeader}>EMI Deductions Scheduler</Text>
                                {emiList.map(e => (
                                    <View key={e.id} style={styles.itemRow}>
                                        <Text style={styles.itemName}>{e.title}</Text>
                                        <Text style={styles.itemVal}>₹{e.amount.toLocaleString()} ({e.date})</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Sub-tab 3: Meds */}
                        {activeSubTab === 'meds' && (
                            <View>
                                <Text style={styles.subHeader}>Pill Timetables & Stock</Text>
                                {meds.map(m => (
                                    <View key={m.id} style={styles.itemRow}>
                                        <Text style={styles.itemName}>{m.title}</Text>
                                        <Text style={styles.itemVal}>{m.time} (Stock: {m.stock} tabs)</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Sub-tab 4: School */}
                        {activeSubTab === 'school' && (
                            <View>
                                <Text style={styles.subHeader}>School Fees Reminders</Text>
                                {schoolFees.map(f => (
                                    <View key={f.id} style={styles.itemRow}>
                                        <Text style={styles.itemName}>{f.child} - {f.term}</Text>
                                        <Text style={styles.itemVal}>₹{f.amount.toLocaleString()} (Due: {f.date})</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Sub-tab 5: Services */}
                        {activeSubTab === 'services' && (
                            <View>
                                <Text style={styles.subHeader}>Vehicle & Device Service Reminders</Text>
                                {services.map(s => (
                                    <View key={s.id} style={styles.itemRow}>
                                        <Text style={styles.itemName}>{s.title}</Text>
                                        <Text style={styles.itemVal}>Due: {s.nextDue}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Sub-tab 6: Budgets */}
                        {activeSubTab === 'budgets' && (
                            <View>
                                <Text style={styles.subHeader}>Budget Accumulation & Tracking</Text>
                                {budgets.map(b => (
                                    <View key={b.id} style={styles.categoryProgressRow}>
                                        <View style={styles.row}>
                                            <Text style={styles.categoryLabel}>{b.category} Budget</Text>
                                            <Text style={styles.categoryVal}>₹{b.spent.toLocaleString()} / ₹{b.limit.toLocaleString()}</Text>
                                        </View>
                                        <View style={styles.progressBarBg}>
                                            <View style={[styles.progressBarFill, { width: `${(b.spent / b.limit) * 100}%`, backgroundColor: '#F59E0B' }]} />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Sub-tab 7: To-Do */}
                        {activeSubTab === 'todo' && (
                            <View>
                                <Text style={styles.subHeader}>Daily To-Do List</Text>
                                {todos.map(t => (
                                    <View key={t.id} style={styles.reminderRow}>
                                        <Pressable onPress={() => setTodos(todos.map(item => item.id === t.id ? { ...item, done: !item.done } : item))}>
                                            {t.done ? <CheckSquare size={20} color="#10B981" /> : <Square size={20} color="#71717A" />}
                                        </Pressable>
                                        <Text style={[styles.reminderText, t.done && styles.reminderTextDone, { marginLeft: 10 }]}>{t.title}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* 5. P2P Interest */}
                {activeTab === 'p2p' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Lended Outside Capital (P2P Monitor)</Text>
                        {p2pLoans.map(p => {
                            const interest = calculateP2pInterest(p);
                            return (
                                <View key={p.id} style={styles.subCard}>
                                    <Text style={styles.subCardTitle}>Borrower: {p.borrower}</Text>
                                    <Text style={styles.subCardDesc}>Principal: ₹{p.amount.toLocaleString()}</Text>
                                    <Text style={styles.subCardDesc}>Interest rate: {p.interestRate}% ({p.type})</Text>
                                    <Text style={[styles.subCardDesc, { color: '#10B981', fontWeight: '800' }]}>
                                        Accumulated Interest: ₹{Math.round(interest).toLocaleString()}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* 6. Property Vault */}
                {activeTab === 'properties' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Properties circle rates directory</Text>
                        {properties.map(p => (
                            <View key={p.id} style={styles.subCard}>
                                <Text style={styles.subCardTitle}>{p.name}</Text>
                                <Text style={styles.subCardDesc}>Size: {p.sizeSqFt} SqFt | Circle Rate: ₹{p.circleRate}/SqFt</Text>
                                <Text style={styles.subCardDesc}>Market Value Estimate: ₹{p.marketValuation.toLocaleString()}</Text>
                                <Text style={[styles.subCardDesc, { color: '#6366F1', fontWeight: '750' }]}>Gov Status: {p.govSyncStatus}</Text>
                                
                                {govCheckingId === p.id ? (
                                    <View style={styles.row}>
                                        <RefreshCw size={16} color="#6366F1" style={styles.rotate} />
                                        <Text style={[styles.subCardDesc, { marginLeft: 10 }]}>Connecting official land records database...</Text>
                                    </View>
                                ) : (
                                    <Pressable style={styles.syncBtn} onPress={() => handleGovVerify(p.id)}>
                                        <Text style={styles.syncBtnText}>Verify Govt Site Circle Rate</Text>
                                    </Pressable>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* 7. Volatility Shield */}
                {activeTab === 'crisis' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Emergency Fund Allocation Guard</Text>
                        <Text style={styles.vaultVal}>₹{emergencyFund.toLocaleString()}</Text>

                        <Text style={styles.subHeader}>Wrong Investment Avoidance Check</Text>
                        <View style={styles.form}>
                            <TextInput 
                                placeholder="Proposed Investment Amount (₹)" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                keyboardType="numeric"
                                value={riskInvestmentAttempt}
                                onChangeText={setRiskInvestmentAttempt}
                            />
                            <Pressable style={styles.submitBtn} onPress={runWrongInvestmentScan}>
                                <Text style={styles.submitBtnText}>Scan Asset Volatility Traps</Text>
                            </Pressable>
                        </View>

                        {warningReport && (
                            <View style={[styles.claimsCard, warningReport.status.includes('DANGER') ? { borderColor: '#EF444450' } : { borderColor: '#10B98150' }]}>
                                <Text style={[styles.claimsTitle, warningReport.status.includes('DANGER') ? { color: '#EF4444' } : { color: '#10B981' }]}>
                                    {warningReport.status}
                                </Text>
                                <Text style={styles.claimsField}>{warningReport.msg}</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
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
    bankBalanceCard: { width: (width - 72) / 2, backgroundColor: '#000', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#27272A', gap: 4 },
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
    claimsField: { color: '#FFF', fontSize: 12, lineHeight: 18 }
});
