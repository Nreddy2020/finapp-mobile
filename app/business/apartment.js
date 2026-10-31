/**
 * app/business/apartment.js — Apartment / Society Management (Business Hub)
 * Units & residents, monthly maintenance billing, payments and late fees, expenses,
 * vendors & AMC contracts, complaints, notices, meetings, visitors, amenity bookings,
 * reserve funds and collection / P&L reports. Works fully offline; nothing is seeded.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, BackHandler, StyleSheet, ScrollView, Share, Linking } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import {
    Plus, ChevronLeft, ChevronRight, Calendar, CheckCircle2, Wallet,
    ArrowDownLeft, ArrowUpRight, Building, Building2, Shield, Wrench,
    Zap, Droplets, Sparkles, Users, FileText, Landmark, Search, Phone,
    AlertTriangle, Activity, CreditCard, Share2, MessageCircle, Send,
    ExternalLink, Filter, Check, Clock
} from 'lucide-react-native';
import {
    Screen, Card, Btn, Field, MoneyField, DateField, Choice, Chip, Sheet,
    Notice, Empty, Badge, Stat, Progress, ListItem, KeyValue, useAsyncAction,
    useMoney, ui, palette, todayLocal, confirm
} from '../../components/ui/ModuleUI';
import {
    ApartmentSocietyService as S, dashboard, collectionReport, expenseReport,
    profitAndLoss, fundBalances, unitStatement, invoiceBalance, invoicePaid,
    occupancySummary, ticketSummary, vendorAlerts, generateInvoices,
    generateBalanceSheet, seedReferenceSociety, OCCUPANCY, EXPENSE_CATEGORIES,
    TICKET_CATEGORIES, TICKET_STATUS, TICKET_PRIORITY, FUND_TYPES, PAYMENT_MODES,
    ADHOC_CATEGORIES
} from '../../services/business/apartmentSocietyService';

const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'balancesheet', label: 'Balance Sheet' },
    { value: 'units', label: 'Units' },
    { value: 'dues', label: 'Dues' },
    { value: 'expenses', label: 'Expenses' },
    { value: 'tickets', label: 'Complaints' },
    { value: 'community', label: 'Community' },
    { value: 'reports', label: 'Reports' }
];

const STATUS_COLORS = {
    due: palette.warning,
    partial: palette.info,
    paid: palette.success,
    waived: palette.muted,
    open: palette.danger,
    in_progress: palette.warning,
    resolved: palette.success,
    closed: palette.muted
};

const CATEGORY_META = {
    'Salaries': { icon: Users, color: '#A78BFA', bg: '#251D3A', label: 'Salaries & Staff' },
    'Security': { icon: Shield, color: '#60A5FA', bg: '#172842', label: 'Security Agency & Watch' },
    'Electricity (common)': { icon: Zap, color: '#FBBF24', bg: '#362B16', label: 'Common Electricity Meters' },
    'Housekeeping': { icon: Sparkles, color: '#34D399', bg: '#133026', label: 'Sanitation & Housekeeping' },
    'Water': { icon: Droplets, color: '#38BDF8', bg: '#132E42', label: 'Water Management & Pumps' },
    'Repairs': { icon: Wrench, color: '#FB923C', bg: '#382216', label: 'Repairs & Hardware Maintenance' },
    'Festival / Events': { icon: Sparkles, color: '#F43F5E', bg: '#381622', label: 'Festivals & Community Events' },
    'Other': { icon: FileText, color: '#94A3B8', bg: '#1E293B', label: 'Administrative & Stationery' },
    'Lift AMC': { icon: Building, color: '#C084FC', bg: '#29183B', label: 'Lift AMC Maintenance' },
};

const thisMonth = () => todayLocal().slice(0, 7);
function shiftMonth(period, delta) {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return d.toISOString().slice(0, 7);
}

function formatPeriodName(period) {
    if (!period || !period.includes('-')) return period;
    const [y, m] = period.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

async function shareBalanceSheet(doc, bs, period) {
    if (!doc || !bs) return;
    const soc = doc.society || {};
    const periodName = formatPeriodName(period);
    const blkA = bs.receipts.blocks?.['A']?.collected || 0;
    const blkB = bs.receipts.blocks?.['B']?.collected || 0;
    const blkC = bs.receipts.blocks?.['C']?.collected || 0;
    const expLines = (bs.expenditure.categorized || []).map(c => `• ${c.category}: ₹${c.amount.toLocaleString('en-IN')}`).join('\n');

    const text = `🏛️ *${soc.name || 'APARTMENT WELFARE ASSOCIATION'}*
📅 *AUDITED BALANCE SHEET — ${periodName.toUpperCase()}*
📍 ${soc.address || 'Guntur, Andhra Pradesh'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *SUMMARY RECONCILIATION*
• Opening Cash: ₹${bs.openingBalance.toLocaleString('en-IN')}
• Total Inflow: ₹${bs.receipts.totalInflows.toLocaleString('en-IN')}
• Total Outflow: ₹${bs.expenditure.totalExpenditure.toLocaleString('en-IN')}
• Closing Cash: ₹${bs.closingBalance.toLocaleString('en-IN')}
• Audit Status: ✅ AUDITED & BALANCED

📥 *RECEIPTS & COLLECTIONS (Total: ₹${bs.receipts.totalCollections.toLocaleString('en-IN')})*
• A-Block: ₹${blkA.toLocaleString('en-IN')}
• B-Block: ₹${blkB.toLocaleString('en-IN')}
• C-Block: ₹${blkC.toLocaleString('en-IN')}
• Maintenance Advances: ₹${bs.receipts.advances.total.toLocaleString('en-IN')}
• Lift Usage: ₹${bs.receipts.liftCharges.total.toLocaleString('en-IN')}
• Parking Rent: ₹${bs.receipts.parkingRent.total.toLocaleString('en-IN')}

📤 *EXPENDITURES (Total: ₹${bs.expenditure.totalExpenditure.toLocaleString('en-IN')})*
${expLines}

🏦 *CORPUS FUND FIXED DEPOSITS*
• Active FDs: ${bs.termDeposits.items.length}
• Principal: ₹${bs.termDeposits.totalPrincipal.toLocaleString('en-IN')}
• Maturity: ₹${bs.termDeposits.totalMaturity.toLocaleString('en-IN')} (Yield: +₹${bs.termDeposits.totalYield.toLocaleString('en-IN')})

📋 *AMC (ANNUAL CONTRACT)*
• Progress: ${bs.amc.paidCount}/${bs.amc.totalEligibleFlats} flats paid (${bs.amc.paidPercentage}%)
• Pending Flats: ${bs.amc.pendingFlats.join(', ') || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
_Generated via FinLife Apartment & Society Manager_`;

    try {
        await Share.share({ message: text, title: `${soc.name || 'Society'} Balance Sheet ${periodName}` });
    } catch (e) {}
}

async function sendDuesWhatsAppReminder(doc, invoice, unit) {
    if (!doc || !invoice || !unit) return;
    const soc = doc.society || {};
    const bal = invoiceBalance(invoice);
    const periodName = formatPeriodName(invoice.period);
    const uLabel = unit.number ? (unit.block ? `${unit.block}-${unit.number}` : unit.number) : 'your flat';
    const msg = `Dear ${unit.ownerName || 'Resident'},\\n\\nNamaste from *${soc.name || 'Society Management'}*.\\n\\nThis is a friendly reminder that maintenance dues for *Flat ${uLabel}* for *${periodName}* are pending:\\n\\n• Maintenance Amount: ₹${bal.toLocaleString('en-IN')}\\n• Due Date: ${invoice.dueDate}\\n\\nPlease clear the dues at your earliest convenience via UPI or bank transfer to society account.\\n\\nThank you,\\n*${soc.name || 'Management Committee'}*`;

    const phone = unit.ownerPhone || unit.tenantPhone;
    if (phone) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const waUrl = `whatsapp://send?phone=${waPhone}&text=${encodeURIComponent(msg)}`;
        const canOpen = await Linking.canOpenURL(waUrl).catch(() => false);
        if (canOpen) {
            await Linking.openURL(waUrl);
            return;
        }
    }
    await Share.share({ message: msg, title: `Maintenance Dues Reminder — Flat ${uLabel}` }).catch(() => {});
}

async function shareUnitStatement(doc, unit, statement) {
    if (!doc || !unit || !statement) return;
    const soc = doc.society || {};
    const uLabel = unit.number ? (unit.block ? `${unit.block}-${unit.number}` : unit.number) : unit.id;
    const text = `🏛️ *${soc.name || 'SOCIETY MANAGEMENT'}*\\n📋 *ACCOUNT STATEMENT — FLAT ${uLabel}*\\nResident: ${unit.ownerName || 'Owner'} ${unit.ownerPhone ? `(${unit.ownerPhone})` : ''}\\n\\n━━━━━━━━━━━━━━━━━━━━━━━━━━\\n• Total Lifetime Billed: ₹${statement.invoices.reduce((s, i) => s + i.amount + (i.lateFee || 0), 0).toLocaleString('en-IN')}\\n• Total Paid: ₹${statement.totalPaid.toLocaleString('en-IN')}\\n• *Current Outstanding: ₹${statement.totalDue.toLocaleString('en-IN')}*\\n━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n*Recent Invoices:*\\n${statement.invoices.slice(0, 8).map(i => {
        const p = formatPeriodName(i.period);
        const b = invoiceBalance(i);
        return `• ${p}: ₹${i.amount.toLocaleString('en-IN')} [${i.status.toUpperCase()}${b > 0 ? ` - Due: ₹${b.toLocaleString('en-IN')}` : ''}]`;
    }).join('\\n')}\\n\\n_Generated via FinLife Apartment Management_`;

    try {
        await Share.share({ message: text, title: `Statement Flat ${uLabel}` });
    } catch (e) {}
}

async function broadcastOverdueList(doc, period, collection) {
    if (!doc || !collection) return;
    const soc = doc.society || {};
    const periodName = formatPeriodName(period);
    const defaulters = collection.defaulters || [];
    if (!defaulters.length) return;

    const lines = defaulters.map((d, i) => {
        const u = d.unit;
        const uL = u ? (u.block ? `${u.block}-${u.number}` : u.number) : 'Unit';
        return `${i + 1}. Flat ${uL} (${u?.ownerName || 'Owner'}): ₹${d.balance.toLocaleString('en-IN')}`;
    }).join('\\n');

    const msg = `📢 *${soc.name || 'SOCIETY'} — PENDING DUES NOTICE (${periodName.toUpperCase()})*\\n\\nThe following ${defaulters.length} units have maintenance dues pending for ${periodName}:\\n\\n${lines}\\n\\n*Total Outstanding: ₹${collection.outstanding.toLocaleString('en-IN')}*\\n\\nKindly clear the dues via UPI or society bank account.\\n\\nThank you,\\n*${soc.name || 'Management Committee'}*`;

    try {
        await Share.share({ message: msg, title: `Pending Dues ${periodName}` });
    } catch (e) {}
}

async function shareMonthlyReport(doc, period, today) {
    if (!doc) return;
    const pnl = profitAndLoss(doc, period, today);
    const col = collectionReport(doc, period, today);
    const occ = occupancySummary ? occupancySummary(doc) : { total: 0, owner: 0, tenant: 0, vacant: 0, occupancyRate: 0 };
    const funds = fundBalances(doc);
    const soc = doc.society || {};
    const periodName = formatPeriodName(period);
    const isSurplus = (pnl.surplus || 0) >= 0;

    const msg = `📊 *${soc.name || 'SOCIETY WELFARE ASSOCIATION'}*
📅 *MONTHLY PERFORMANCE & P&L REPORT — ${periodName.toUpperCase()}*
📍 ${soc.address || 'Guntur, Andhra Pradesh'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *PROFIT & LOSS / CASH FLOW*
• Maintenance Billed: ₹${(pnl.billed || 0).toLocaleString('en-IN')}
• Collections Received: ₹${(pnl.cashCollected || 0).toLocaleString('en-IN')}
• Other Inflows: ₹${(pnl.otherIncome || 0).toLocaleString('en-IN')}
• Total Expenses: ₹${(pnl.expenses || 0).toLocaleString('en-IN')}
• *Net Monthly ${isSurplus ? 'Surplus' : 'Deficit'}: ₹${Math.abs(pnl.surplus || 0).toLocaleString('en-IN')}*

📈 *COLLECTION PERFORMANCE*
• Efficiency Rate: ${col.efficiency || 0}%
• Collected: ₹${(col.collected || 0).toLocaleString('en-IN')}
• Outstanding Arrears: ₹${(col.outstanding || 0).toLocaleString('en-IN')}
• Overdue Flats: ${col.overdueCount || 0} units

🏦 *RESERVE FUND BALANCES*
• Maintenance Fund: ₹${(funds.maintenance || 0).toLocaleString('en-IN')}
• Corpus Fund (FDs): ₹${(funds.corpus || 0).toLocaleString('en-IN')}
• Sinking Fund: ₹${(funds.sinking || 0).toLocaleString('en-IN')}
• Total Treasury: ₹${((funds.maintenance || 0) + (funds.corpus || 0) + (funds.sinking || 0)).toLocaleString('en-IN')}

🏢 *OCCUPANCY & RESIDENTS*
• Total Flats: ${occ.total} (${occ.owner} Owners, ${occ.tenant} Tenants, ${occ.vacant} Vacant)
• Occupancy Rate: ${occ.occupancyRate ?? 0}%

━━━━━━━━━━━━━━━━━━━━━━━━━━
_Generated via FinLife Apartment & Society Manager_`;

    try {
        await Share.share({ message: msg, title: `${soc.name || 'Society'} Monthly Report ${periodName}` });
    } catch (e) {}
}

export default function ApartmentSocietyScreen() {
    const router = useRouter();
    const money = useMoney();
    const { busy, error, setError, run } = useAsyncAction();
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const [period, setPeriod] = useState(thisMonth());
    const [sheet, setSheet] = useState(null); // {kind, form, id}
    const [unitFilter, setUnitFilter] = useState('all');
    const [blockFilter, setBlockFilter] = useState('all');
    const [unitSearch, setUnitSearch] = useState('');
    const [community, setCommunity] = useState('notices');
    const [duesSearch, setDuesSearch] = useState('');
    const [duesStatusFilter, setDuesStatusFilter] = useState('all');
    const [duesBlockFilter, setDuesBlockFilter] = useState('all');
    const [expenseSearch, setExpenseSearch] = useState('');
    const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
    const [ticketFilter, setTicketFilter] = useState('all');
    const today = todayLocal();

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (sheet) { setSheet(null); return true; }
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/business');
            return true;
        });
        return () => sub.remove();
    }, [sheet, router]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setDoc(await S.load());
            setError('');
        } catch (e) {
            setError(e.message || 'Society data could not be loaded. Retry.');
        } finally {
            setLoading(false);
        }
    }, [setError]);

    useFocusEffect(useCallback(() => { load(); }, [load]));
    const dash = useMemo(() => (doc ? dashboard(doc, today) : null), [doc, today]);
    const bs = useMemo(() => (doc ? generateBalanceSheet(doc, period) : null), [doc, period]);
    const act = fn => run(async () => setDoc(await fn()));
    const open = (kind, form = {}, id = null) => { setError(''); setSheet({ kind, form, id }); };
    const setF = patch => setSheet(s => ({ ...s, form: { ...s.form, ...patch } }));
    const unitLabel = id => {
        const u = doc?.units.find(x => x.id === id);
        return u ? `${u.block ? `${u.block}-` : ''}${u.number}` : 'Common';
    };
    const unitOptions = [{ value: '', label: 'Common / none' }, ...(doc?.units || []).map(u => ({ value: u.id, label: unitLabel(u.id) }))];

    const submit = () => run(async () => {
        const f = sheet.form;
        let next;
        switch (sheet.kind) {
            case 'society': next = await S.updateSociety({ ...f, openingBalances: { maintenance: f.openMaintenance, corpus: f.openCorpus, sinking: f.openSinking } }); break;
            case 'unit': next = sheet.id ? await S.updateUnit(sheet.id, f) : await S.addUnit(f); break;
            case 'payment': next = await S.recordPayment(sheet.id, f); break;
            case 'expense': next = await S.addExpense(f); break;
            case 'vendor': next = await S.addVendor(f); break;
            case 'ticket': next = await S.addTicket(f); break;
            case 'ticketUpdate': next = await S.updateTicket(sheet.id, f); break;
            case 'notice': next = await S.addNotice(f); break;
            case 'meeting': next = await S.addMeeting(f); break;
            case 'decision': next = await S.addDecision(sheet.id, f); break;
            case 'visitor': next = await S.checkInVisitor(f); break;
            case 'amenity': next = await S.addAmenity(f); break;
            case 'booking': next = await S.bookAmenity(f); break;
            case 'fund': next = await S.addFundEntry(f); break;
            case 'termDeposit': next = sheet.id ? await S.updateTermDeposit(sheet.id, f) : await S.addTermDeposit(f); break;
            case 'adhocCharge': next = await S.addAdhocCharge(f); break;
            case 'amcPayment': next = await S.recordAmcPayment(f); break;
            default: return;
        }
        setDoc(next);
        setSheet(null);
    });

    const addFor = {
        units: ['unit', { number: '', block: '', floor: '', sqft: '', ownerName: '', ownerPhone: '', occupancy: 'owner', tenantName: '', tenantPhone: '', parking: '', customAmount: '' }, 'Add unit'],
        expenses: ['expense', { date: today, category: 'Security', description: '', amount: '', paidFrom: 'maintenance', vendorId: '' }, 'Add expense'],
        tickets: ['ticket', { title: '', category: 'Plumbing', priority: 'normal', unitId: '', description: '' }, 'Add complaint'],
        balancesheet: ['termDeposit', { bank: 'State Bank of India', accountOrCertNo: '', depositDate: today, maturityDate: '', principalAmount: '', interestRate: '6.1', maturityAmount: '', fundType: 'corpus', notes: '' }, 'Add Term Deposit'],
        dues: ['adhocCharge', { unitId: '', category: 'lift', amount: '', date: today, description: '' }, 'Record Inflow']
    };

    const right = addFor[tab] ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={addFor[tab][2]} onPress={() => open(addFor[tab][0], addFor[tab][1])} style={ui.back}>
            <Plus color="#F4F4F5" size={22} />
        </TouchableOpacity>
    ) : null;

    const collection = doc ? collectionReport(doc, period, today) : null;
    const invoicesForPeriod = doc ? doc.invoices.filter(i => i.period === period).sort((a, b) => unitLabel(a.unitId).localeCompare(unitLabel(b.unitId), undefined, { numeric: true })) : [];
    const setupDone = doc && doc.society.name && doc.units.length > 0 && (doc.society.maintenanceModel === 'per_sqft' ? doc.society.ratePerSqft > 0 : doc.society.flatAmount > 0);

    const availableBlocks = useMemo(() => {
        if (!doc?.units) return [];
        const set = new Set();
        doc.units.forEach(u => { if (u.block) set.add(u.block); });
        return Array.from(set).sort();
    }, [doc?.units]);

    const filteredUnits = useMemo(() => {
        if (!doc?.units) return [];
        return doc.units.filter(u => {
            const activeMatch = unitFilter === 'all' ? u.active !== false : unitFilter === 'inactive' ? u.active === false : u.active !== false && u.occupancy === unitFilter;
            const blockMatch = blockFilter === 'all' ? true : u.block === blockFilter;
            const searchMatch = !unitSearch.trim() ? true : (
                (u.number && u.number.toLowerCase().includes(unitSearch.toLowerCase())) ||
                (u.ownerName && u.ownerName.toLowerCase().includes(unitSearch.toLowerCase())) ||
                (u.tenantName && u.tenantName.toLowerCase().includes(unitSearch.toLowerCase())) ||
                (u.ownerPhone && u.ownerPhone.includes(unitSearch)) ||
                (u.block && `${u.block}-${u.number}`.toLowerCase().includes(unitSearch.toLowerCase()))
            );
            return activeMatch && blockMatch && searchMatch;
        });
    }, [doc?.units, unitFilter, blockFilter, unitSearch]);

    const filteredInvoices = useMemo(() => {
        if (!invoicesForPeriod) return [];
        return invoicesForPeriod.filter(inv => {
            const u = doc?.units.find(x => x.id === inv.unitId);
            const bal = invoiceBalance(inv);

            // Block filter
            if (duesBlockFilter !== 'all' && u?.block !== duesBlockFilter) return false;

            // Status filter
            if (duesStatusFilter === 'due' && bal <= 0) return false;
            if (duesStatusFilter === 'paid' && inv.status !== 'paid') return false;
            if (duesStatusFilter === 'waived' && inv.status !== 'waived') return false;

            // Unit filter from statement
            if (unitFilter !== 'all' && doc?.units.some(x => x.id === unitFilter) && inv.unitId !== unitFilter) return false;

            // Search
            if (duesSearch.trim()) {
                const q = duesSearch.toLowerCase();
                const uL = unitLabel(inv.unitId).toLowerCase();
                const oN = (u?.ownerName || '').toLowerCase();
                const tN = (u?.tenantName || '').toLowerCase();
                if (!uL.includes(q) && !oN.includes(q) && !tN.includes(q)) return false;
            }

            return true;
        });
    }, [invoicesForPeriod, doc?.units, duesBlockFilter, duesStatusFilter, duesSearch, unitFilter]);

    const filteredExpenses = useMemo(() => {
        if (!doc?.expenses) return [];
        return doc.expenses.filter(e => {
            if (!e.date.startsWith(period)) return false;
            if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) return false;
            if (expenseSearch.trim()) {
                const q = expenseSearch.toLowerCase();
                const desc = (e.description || '').toLowerCase();
                const cat = (e.category || '').toLowerCase();
                const vendor = (doc.vendors.find(v => v.id === e.vendorId)?.name || '').toLowerCase();
                if (!desc.includes(q) && !cat.includes(q) && !vendor.includes(q)) return false;
            }
            return true;
        });
    }, [doc?.expenses, doc?.vendors, period, expenseCategoryFilter, expenseSearch]);

    const filteredTickets = useMemo(() => {
        if (!doc?.tickets) return [];
        return doc.tickets.filter(t => {
            if (ticketFilter === 'open' && t.status !== 'open') return false;
            if (ticketFilter === 'in_progress' && t.status !== 'in_progress') return false;
            if (ticketFilter === 'resolved' && t.status !== 'resolved') return false;
            if (ticketFilter === 'closed' && t.status !== 'closed') return false;
            return true;
        }).sort((a, b) => (a.status === 'open' || a.status === 'in_progress' ? 0 : 1) - (b.status === 'open' || b.status === 'in_progress' ? 0 : 1));
    }, [doc?.tickets, ticketFilter]);

    return (
        <Screen
            title={doc?.society.name || 'Apartment / Society'}
            subtitle="Financial ledger, maintenance, balance sheets & resident community."
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/business'))}
            loading={loading}
            error={error}
            retry={load}
            tabs={TABS}
            tab={tab}
            onTab={setTab}
            right={right}
        >
            <Stack.Screen options={{ headerShown: false }} />

            {/* OVERVIEW TAB */}
            {doc && dash && tab === 'overview' && (
                <>
                    {/* Society Identity Hero Card */}
                    <View style={s.heroCard}>
                        <View style={s.heroTopRow}>
                            <View style={s.heroIconBox}>
                                <Building2 size={24} color="#A78BFA" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={s.heroTitle} numberOfLines={1}>{doc.society.name || 'Apartment Society'}</Text>
                                    <View style={s.verifiedPill}>
                                        <Text style={s.verifiedPillText}>RWA</Text>
                                    </View>
                                </View>
                                <Text style={s.heroAddress} numberOfLines={1}>{doc.society.address || 'Guntur, Andhra Pradesh'}</Text>
                            </View>
                        </View>

                        <View style={s.heroDivider} />

                        <View style={s.heroKpiRow}>
                            <View style={s.heroKpiItem}>
                                <Text style={s.heroKpiLabel}>TOTAL UNITS</Text>
                                <Text style={s.heroKpiVal}>{dash.occupancy.total}</Text>
                            </View>
                            <View style={s.heroKpiDivider} />
                            <View style={s.heroKpiItem}>
                                <Text style={s.heroKpiLabel}>OCCUPANCY</Text>
                                <Text style={[s.heroKpiVal, { color: '#10B981' }]}>{dash.occupancy.occupancyRate === null ? '—' : `${dash.occupancy.occupancyRate}%`}</Text>
                            </View>
                            <View style={s.heroKpiDivider} />
                            <View style={s.heroKpiItem}>
                                <Text style={s.heroKpiLabel}>CASH BALANCE</Text>
                                <Text style={[s.heroKpiVal, { color: '#38BDF8' }]}>{bs ? money.format(bs.closingBalance) : '₹0'}</Text>
                            </View>
                            <View style={s.heroKpiDivider} />
                            <View style={s.heroKpiItem}>
                                <Text style={s.heroKpiLabel}>CORPUS FDs</Text>
                                <Text style={[s.heroKpiVal, { color: '#FBBF24' }]}>{bs ? money.format(bs.termDeposits.totalPrincipal) : '₹0'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Reference Balance Sheet Hero Seeder Card */}
                    <View style={s.featureCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Sparkles size={18} color="#FBBF24" />
                                <Text style={s.featureTitle}>January 2026 Reference Balance Sheet</Text>
                            </View>
                            <View style={s.featureBadge}>
                                <Text style={s.featureBadgeText}>AUDITED DATASET</Text>
                            </View>
                        </View>
                        <Text style={s.featureDesc}>
                            Explore the fully reconciled financial balance sheet matching the uploaded physical statement from Guntur: ₹1.91L total receipts, ₹1.65L itemized expenses, ₹25,869 closing cash, ₹5.84L Corpus FDs @ 6.1%, and AMC tracking.
                        </Text>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Load January 2026 Reference Sheet"
                            style={s.featureBtn}
                            onPress={() => act(async () => {
                                const seeded = await seedReferenceSociety();
                                setPeriod('2026-01');
                                setTab('balancesheet');
                                return seeded;
                            })}
                        >
                            <Sparkles size={16} color="#FFFFFF" />
                            <Text style={s.featureBtnText}>Load January 2026 Reference Sheet</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Quick Action Ribbon */}
                    <Text style={[ui.label, { marginTop: 4 }]}>QUICK ACTIONS</Text>
                    <View style={s.quickActionRow}>
                        <TouchableOpacity style={s.quickActionPill} onPress={() => open('unit', addFor.units[1])}>
                            <Plus size={14} color="#A78BFA" />
                            <Text style={s.quickActionText}>Add Unit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.quickActionPill} onPress={() => open('adhocCharge', addFor.dues[1])}>
                            <CreditCard size={14} color="#34D399" />
                            <Text style={s.quickActionText}>Record Dues</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.quickActionPill} onPress={() => open('expense', addFor.expenses[1])}>
                            <ArrowUpRight size={14} color="#F87171" />
                            <Text style={s.quickActionText}>Add Expense</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={s.quickBalanceSheetBtn} onPress={() => setTab('balancesheet')}>
                        <FileText size={16} color="#FBBF24" />
                        <Text style={s.quickBalanceSheetText}>Balance Sheet</Text>
                    </TouchableOpacity>

                    {/* Mini KPI Radar Grid */}
                    <View style={s.kpiMiniGrid}>
                        <View style={[s.kpiMiniCard, { borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
                            <Text style={s.kpiMiniLabel}>COLLECTED THIS MONTH</Text>
                            <Text style={[s.kpiMiniVal, { color: '#34D399' }]}>{money.format(dash.collection.collected)}</Text>
                            <Text style={s.kpiMiniSub}>Billing period</Text>
                        </View>

                        <View style={[s.kpiMiniCard, { borderColor: 'rgba(244, 63, 94, 0.3)' }]}>
                            <Text style={s.kpiMiniLabel}>OUTSTANDING DUES</Text>
                            <Text style={[s.kpiMiniVal, { color: dash.collection.outstanding ? '#FBBF24' : '#FAFAFF' }]}>{money.format(dash.collection.outstanding)}</Text>
                            <Text style={s.kpiMiniSub}>{dash.collection.defaulters.length} overdue units</Text>
                        </View>

                        <View style={[s.kpiMiniCard, { borderColor: 'rgba(168, 85, 247, 0.3)' }]}>
                            <Text style={s.kpiMiniLabel}>CORPUS IN FDS</Text>
                            <Text style={[s.kpiMiniVal, { color: '#A78BFA' }]}>{bs ? money.format(bs.termDeposits.totalPrincipal) : '₹0'}</Text>
                            <Text style={s.kpiMiniSub}>{bs ? `${bs.termDeposits.items.length} Active Deposits` : 'Reserve'}</Text>
                        </View>

                        <View style={[s.kpiMiniCard, { borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                            <Text style={s.kpiMiniLabel}>CLOSING CASH</Text>
                            <Text style={[s.kpiMiniVal, { color: '#10B981' }]}>{bs ? money.format(bs.closingBalance) : '₹0'}</Text>
                            <Text style={s.kpiMiniSub}>Audited liquid cash</Text>
                        </View>
                    </View>

                    {dash.collection.efficiency !== null && (
                        <Card title={`Collection Progress · ${formatPeriodName(period)}`}>
                            <Progress
                                value={dash.collection.efficiency}
                                color={dash.collection.efficiency >= 90 ? palette.success : dash.collection.efficiency >= 60 ? palette.warning : palette.danger}
                                label={`${dash.collection.efficiency}% collected (${dash.collection.defaulters.length} units overdue)`}
                            />
                            <Btn title="View Monthly Dues & Defaulters" secondary onPress={() => setTab('dues')} />
                        </Card>
                    )}

                    <Card title="Society Reserve Funds">
                        {FUND_TYPES.map(t => (
                            <KeyValue key={t} label={`${t[0].toUpperCase()}${t.slice(1)} fund`} value={money.format(dash.funds[t])} color={dash.funds[t] < 0 ? palette.danger : undefined} />
                        ))}
                        <KeyValue label="Surplus this month" value={money.format(dash.pnl.surplus)} color={dash.pnl.surplus >= 0 ? palette.success : palette.danger} />
                    </Card>

                    {!!dash.vendorAlerts.length && (
                        <Notice warning>{`Contracts ending soon: ${dash.vendorAlerts.map(a => `${a.vendor.name} (${a.daysLeft < 0 ? 'ended' : `${a.daysLeft} days`})`).join(', ')}.`}</Notice>
                    )}

                    {!!dash.pinnedNotices.length && (
                        <Card title="Pinned Notices">
                            {dash.pinnedNotices.map(n => (
                                <ListItem key={n.id}>
                                    <Text style={[ui.text, { fontWeight: '700' }]}>{n.title}</Text>
                                    {!!n.body && <Text style={ui.muted}>{n.body}</Text>}
                                </ListItem>
                            ))}
                        </Card>
                    )}

                    <Btn
                        title="Edit Society Settings"
                        secondary
                        onPress={() => open('society', {
                            name: doc.society.name,
                            address: doc.society.address,
                            maintenanceModel: doc.society.maintenanceModel,
                            flatAmount: String(doc.society.flatAmount || ''),
                            ratePerSqft: String(doc.society.ratePerSqft || ''),
                            dueDay: String(doc.society.dueDay),
                            lateFeeType: doc.society.lateFeeType,
                            lateFeeValue: String(doc.society.lateFeeValue || ''),
                            graceDays: String(doc.society.graceDays || 0),
                            openMaintenance: String(doc.society.openingBalances?.maintenance || 0),
                            openCorpus: String(doc.society.openingBalances?.corpus || 0),
                            openSinking: String(doc.society.openingBalances?.sinking || 0)
                        })}
                    />
                </>
            )}

            {/* BALANCE SHEET TAB */}
            {doc && tab === 'balancesheet' && bs && (
                <>
                    {/* Unified Month Switcher Capsule */}
                    <View style={s.monthCapsule}>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Previous month"
                            style={s.monthNavBtn}
                            onPress={() => setPeriod(shiftMonth(period, -1))}
                        >
                            <ChevronLeft size={20} color="#FAFAFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Current month ${formatPeriodName(period)}`}
                            style={s.monthCenterBtn}
                            onPress={() => setPeriod(thisMonth())}
                        >
                            <Calendar size={16} color="#A78BFA" style={{ marginRight: 6 }} />
                            <Text style={s.monthText}>{formatPeriodName(period)}</Text>
                            {period === '2026-01' && (
                                <View style={s.auditedTag}>
                                    <Text style={s.auditedTagText}>AUDITED</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Next month"
                            style={s.monthNavBtn}
                            onPress={() => setPeriod(shiftMonth(period, 1))}
                        >
                            <ChevronRight size={20} color="#FAFAFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Share Statement Action Button */}
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Share Balance Sheet Statement"
                        style={s.shareBsBtn}
                        onPress={() => shareBalanceSheet(doc, bs, period)}
                    >
                        <Share2 size={16} color="#A78BFA" />
                        <Text style={s.shareBsBtnText}>Share Audited Balance Sheet Statement</Text>
                    </TouchableOpacity>

                    {period !== '2026-01' && (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Jump to January 2026 Reference Sheet"
                            style={s.refJumpBtn}
                            onPress={() => setPeriod('2026-01')}
                        >
                            <Sparkles size={14} color="#FBBF24" />
                            <Text style={s.refJumpText}>Jump to Jan 2026 (Physical Reference Balance Sheet)</Text>
                        </TouchableOpacity>
                    )}

                    {/* 4-Card Financial Summary Ribbon */}
                    <View style={s.metricRibbonGrid}>
                        <View style={[s.metricCard, { borderTopColor: '#38BDF8' }]}>
                            <View style={s.metricCardHeader}>
                                <Text style={s.metricCardLabel}>OPENING CASH</Text>
                                <Wallet size={15} color="#38BDF8" />
                            </View>
                            <Text style={s.metricCardValue}>{money.format(bs.openingBalance)}</Text>
                            <Text style={s.metricCardSub}>B/F from previous</Text>
                        </View>

                        <View style={[s.metricCard, { borderTopColor: '#34D399' }]}>
                            <View style={s.metricCardHeader}>
                                <Text style={s.metricCardLabel}>TOTAL INFLOW</Text>
                                <ArrowDownLeft size={15} color="#34D399" />
                            </View>
                            <Text style={[s.metricCardValue, { color: '#34D399' }]}>{money.format(bs.receipts.totalInflows)}</Text>
                            <Text style={s.metricCardSub}>Cash + Collections</Text>
                        </View>

                        <View style={[s.metricCard, { borderTopColor: '#F87171' }]}>
                            <View style={s.metricCardHeader}>
                                <Text style={s.metricCardLabel}>TOTAL OUTFLOW</Text>
                                <ArrowUpRight size={15} color="#F87171" />
                            </View>
                            <Text style={[s.metricCardValue, { color: '#F87171' }]}>{money.format(bs.expenditure.totalExpenditure)}</Text>
                            <Text style={s.metricCardSub}>Bills & Maintenance</Text>
                        </View>

                        <View style={[s.metricCard, { borderTopColor: '#A78BFA' }]}>
                            <View style={s.metricCardHeader}>
                                <Text style={s.metricCardLabel}>CLOSING CASH</Text>
                                <CheckCircle2 size={15} color="#34D399" />
                            </View>
                            <Text style={[s.metricCardValue, { color: '#34D399' }]}>{money.format(bs.closingBalance)}</Text>
                            <Text style={s.metricCardSub}>Audited Closing</Text>
                        </View>
                    </View>

                    {/* Visual Audit Reconciliation Card */}
                    <View style={s.reconciliationAuditCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Activity size={18} color="#34D399" />
                                <Text style={s.reconTitle}>Reconciliation Audit Equation</Text>
                            </View>
                            <View style={s.reconBadge}>
                                <CheckCircle2 size={13} color="#10B981" />
                                <Text style={s.reconBadgeText}>AUDITED & BALANCED</Text>
                            </View>
                        </View>

                        <View style={s.equationBox}>
                            <View style={s.equationRow}>
                                <Text style={s.equationLabel}>Opening Balance</Text>
                                <Text style={s.equationVal}>{money.format(bs.openingBalance)}</Text>
                            </View>
                            <Text style={s.equationOperator}>+</Text>
                            <View style={s.equationRow}>
                                <Text style={s.equationLabel}>Monthly Collections</Text>
                                <Text style={[s.equationVal, { color: '#34D399' }]}>{money.format(bs.receipts.totalCollections)}</Text>
                            </View>
                            <Text style={s.equationOperator}>−</Text>
                            <View style={s.equationRow}>
                                <Text style={s.equationLabel}>Total Expenditure</Text>
                                <Text style={[s.equationVal, { color: '#F87171' }]}>{money.format(bs.expenditure.totalExpenditure)}</Text>
                            </View>
                            <View style={s.equationDivider} />
                            <View style={s.equationRow}>
                                <Text style={[s.equationLabel, { fontWeight: '700', color: '#FAFAFF' }]}>Closing Cash Balance</Text>
                                <Text style={[s.equationVal, { color: '#34D399', fontSize: 16 }]}>{money.format(bs.closingBalance)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Receipts & Inflows Section */}
                    <Card title="Monthly Receipts & Collections" subtitle={`Total Collections: ${money.format(bs.receipts.totalCollections)} · Available Cash: ${money.format(bs.receipts.totalInflows)}`}>
                        <KeyValue label="Opening Cash Balance" value={money.format(bs.openingBalance)} />

                        <View style={{ marginVertical: 8 }}>
                            <Text style={s.sectionSubtitle}>BLOCK-WISE MAINTENANCE COLLECTIONS</Text>
                            <View style={s.stackedBarContainer}>
                                <View style={[s.stackedSegment, { flex: 33, backgroundColor: '#8B5CF6' }]}><Text style={s.stackedSegmentText}>A Block: ₹52,000</Text></View>
                                <View style={[s.stackedSegment, { flex: 44, backgroundColor: '#06B6D4' }]}><Text style={s.stackedSegmentText}>B Block: ₹68,900</Text></View>
                                <View style={[s.stackedSegment, { flex: 22, backgroundColor: '#F59E0B' }]}><Text style={s.stackedSegmentText}>C Block: ₹34,500</Text></View>
                            </View>
                        </View>

                        {['A', 'B', 'C'].map(block => {
                            const b = bs.receipts.blocks[block] || { count: 0, collected: 0, flatCount: 0 };
                            return (
                                <View key={block} style={s.blockCollectionCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={s.blockTagBadge}>
                                            <Text style={s.blockTagText}>{block} Block</Text>
                                        </View>
                                        <Text style={ui.muted}>{b.count} collections · {b.flatCount} flats</Text>
                                    </View>
                                    <Text style={s.blockAmountText}>{money.format(b.collected)}</Text>
                                </View>
                            );
                        })}

                        {!!bs.receipts.advances.items.length && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={s.sectionSubtitle}>MAINTENANCE ADVANCES</Text>
                                {bs.receipts.advances.items.map(a => (
                                    <View key={a.id} style={s.inflowRow}>
                                        <View style={s.unitPillBadge}><Text style={s.unitPillText}>{a.unitLabel}</Text></View>
                                        <Text style={[ui.text, { flex: 1, marginLeft: 8 }]}>{a.description}</Text>
                                        <Text style={s.inflowAmount}>{money.format(a.amount)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {!!bs.receipts.liftCharges.items.length && (
                            <View style={{ marginTop: 8 }}>
                                <Text style={s.sectionSubtitle}>LIFT USAGE COLLECTIONS</Text>
                                {bs.receipts.liftCharges.items.map(l => (
                                    <View key={l.id} style={s.inflowRow}>
                                        <View style={[s.unitPillBadge, { backgroundColor: '#3B2912', borderColor: '#F59E0B' }]}><Text style={[s.unitPillText, { color: '#FBBF24' }]}>{l.unitLabel}</Text></View>
                                        <Text style={[ui.text, { flex: 1, marginLeft: 8 }]}>{l.description}</Text>
                                        <Text style={s.inflowAmount}>{money.format(l.amount)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {!!bs.receipts.parkingRent.items.length && (
                            <View style={{ marginTop: 8 }}>
                                <Text style={s.sectionSubtitle}>PARKING RENT & ADVANCES</Text>
                                {bs.receipts.parkingRent.items.map(p => (
                                    <View key={p.id} style={s.inflowRow}>
                                        <View style={[s.unitPillBadge, { backgroundColor: '#132F26', borderColor: '#10B981' }]}><Text style={[s.unitPillText, { color: '#34D399' }]}>PARKING</Text></View>
                                        <Text style={[ui.text, { flex: 1, marginLeft: 8 }]} numberOfLines={1}>{p.description}</Text>
                                        <Text style={s.inflowAmount}>{money.format(p.amount)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={s.totalCollectionsBottom}>
                            <KeyValue label="Total Collections This Month" value={money.format(bs.receipts.totalCollections)} />
                            <KeyValue label="Total Available Cash (with Opening)" value={money.format(bs.receipts.totalInflows)} color="#34D399" />
                        </View>

                        <Btn
                            title="+ Record Advance / Lift / Parking Inflow"
                            secondary
                            onPress={() => open('adhocCharge', { unitId: '', category: 'advance', amount: '', date: today, description: '' })}
                        />
                    </Card>

                    {/* Itemized Expenditures Section */}
                    <Card title="Monthly Expenditures (Itemized)" subtitle={`Total Spent: ${money.format(bs.expenditure.totalExpenditure)}`}>
                        {Object.entries(bs.expenditure.grouped).map(([category, items]) => {
                            const meta = CATEGORY_META[category] || { icon: FileText, color: '#94A3B8', bg: '#1E293B', label: category };
                            const IconComponent = meta.icon;
                            const catTotal = items.reduce((s, x) => s + x.amount, 0);
                            const catPct = Math.round((catTotal / bs.expenditure.totalExpenditure) * 100);

                            return (
                                <View key={category} style={s.expenseCategoryCard}>
                                    <View style={s.expenseCategoryHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <IconComponent size={16} color={meta.color} />
                                            <Text style={[s.expenseCategoryTitle, { color: meta.color }]}>{category}</Text>
                                            <View style={s.pctBadge}>
                                                <Text style={s.pctBadgeText}>{catPct}%</Text>
                                            </View>
                                        </View>
                                        <Text style={[s.expenseCategoryTotal, { color: meta.color }]}>{money.format(catTotal)}</Text>
                                    </View>

                                    {items.map(item => (
                                        <View key={item.id} style={s.expenseItemRow}>
                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                <Text style={[ui.text, { fontSize: 13, fontWeight: '600' }]}>{item.description}</Text>
                                                <Text style={[ui.muted, { fontSize: 11 }]}>{item.date}</Text>
                                            </View>
                                            <Text style={[s.expenseItemAmount]}>{money.format(item.amount)}</Text>
                                        </View>
                                    ))}
                                </View>
                            );
                        })}

                        <View style={s.totalExpenditureRow}>
                            <Text style={s.totalExpenditureLabel}>Total Monthly Expenditure</Text>
                            <Text style={s.totalExpenditureVal}>{money.format(bs.expenditure.totalExpenditure)}</Text>
                        </View>

                        <Btn
                            title="+ Add Expenditure"
                            secondary
                            onPress={() => open('expense', addFor.expenses[1])}
                        />
                    </Card>

                    {/* Corpus Fund Term Deposits Section */}
                    <Card title="Corpus Fund Term Deposits (Fixed Deposits)" subtitle={`Total Principal: ${money.format(bs.termDeposits.totalPrincipal)} · Maturity: ${money.format(bs.termDeposits.totalMaturity)}`}>
                        <View style={s.fdSummaryGrid}>
                            <View style={s.fdSummaryCard}>
                                <Text style={s.fdSummaryLabel}>ACTIVE FDS</Text>
                                <Text style={s.fdSummaryVal}>{bs.termDeposits.items.length}</Text>
                            </View>
                            <View style={s.fdSummaryCard}>
                                <Text style={s.fdSummaryLabel}>TOTAL PRINCIPAL</Text>
                                <Text style={[s.fdSummaryVal, { color: '#38BDF8' }]}>{money.format(bs.termDeposits.totalPrincipal)}</Text>
                            </View>
                            <View style={s.fdSummaryCard}>
                                <Text style={s.fdSummaryLabel}>MATURITY VALUE</Text>
                                <Text style={[s.fdSummaryVal, { color: '#34D399' }]}>{money.format(bs.termDeposits.totalMaturity)}</Text>
                            </View>
                            <View style={s.fdSummaryCard}>
                                <Text style={s.fdSummaryLabel}>PROJECTED YIELD</Text>
                                <Text style={[s.fdSummaryVal, { color: '#FBBF24' }]}>+{money.format(bs.termDeposits.totalYield)}</Text>
                            </View>
                        </View>

                        {bs.termDeposits.items.map(fd => {
                            const isUnion = fd.bank.toLowerCase().includes('union');
                            const bankColor = isUnion ? '#F87171' : '#38BDF8';
                            const bankBg = isUnion ? '#38161A' : '#132842';

                            return (
                                <View key={fd.id} style={s.bankCertificateCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={[s.bankBadge, { backgroundColor: bankBg, borderColor: bankColor }]}>
                                            <Landmark size={13} color={bankColor} />
                                            <Text style={[s.bankBadgeText, { color: bankColor }]}>{fd.bank}</Text>
                                        </View>
                                        <Text style={s.certNoText}>{fd.accountOrCertNo}</Text>
                                        <View style={s.rateBadge}>
                                            <Text style={s.rateBadgeText}>{fd.interestRate}% p.a.</Text>
                                        </View>
                                    </View>

                                    <View style={s.fdDetailRow}>
                                        <View>
                                            <Text style={s.fdColLabel}>PRINCIPAL</Text>
                                            <Text style={s.fdColValue}>{money.format(fd.principalAmount)}</Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={s.fdColLabel}>MATURITY</Text>
                                            <Text style={[s.fdColValue, { color: '#34D399' }]}>{money.format(fd.maturityAmount)}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={s.fdColLabel}>YIELD</Text>
                                            <Text style={[s.fdColValue, { color: '#FBBF24' }]}>+{money.format(fd.maturityAmount - fd.principalAmount)}</Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                        <Text style={[ui.muted, { fontSize: 11 }]}>Tenure: {fd.depositDate} → {fd.maturityDate || 'Active'}</Text>
                                        <Chip label="Delete" onPress={() => act(() => S.removeTermDeposit(fd.id))} />
                                    </View>
                                </View>
                            );
                        })}

                        <Btn
                            title="+ Add Term Deposit"
                            secondary
                            onPress={() => open('termDeposit', addFor.balancesheet[1])}
                        />
                    </Card>

                    {/* AMC Tracking Section */}
                    <Card title="Annual Maintenance Contracts (AMC)" subtitle={`Year ${bs.amc.year} · ₹1,000 / flat levy`}>
                        <View style={{ gap: 12 }}>
                            <Progress
                                value={bs.amc.paidPercentage}
                                color="#10B981"
                                label={`${bs.amc.paidPercentage}% · ${bs.amc.paidFlatsCount} of ${bs.amc.totalEligibleFlats} flats paid (${bs.amc.paidPercentage}%)`}
                            />

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <View style={[s.amcMiniCard, { flex: 1 }]}>
                                    <Text style={s.amcMiniLabel}>COLLECTED</Text>
                                    <Text style={[s.amcMiniVal, { color: '#34D399' }]}>{money.format(bs.amc.totalCollected)}</Text>
                                </View>
                                <View style={[s.amcMiniCard, { flex: 1 }]}>
                                    <Text style={s.amcMiniLabel}>FLATS PAID</Text>
                                    <Text style={s.amcMiniVal}>{bs.amc.paidFlatsCount}</Text>
                                </View>
                            </View>

                            <View style={s.amcPendingCard}>
                                <Text style={s.amcMiniLabel}>FLATS PENDING</Text>
                                <Text style={[s.amcMiniVal, { color: '#FBBF24' }]}>{bs.amc.pendingFlatsCount}</Text>
                            </View>

                            {!!bs.amc.pendingFlats.length && (
                                <View style={{ marginTop: 4 }}>
                                    <Text style={s.sectionSubtitle}>PENDING FLATS ({bs.amc.pendingFlats.length}) — TAP TO RECORD</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                        {bs.amc.pendingFlats.map(flat => {
                                            const matchedUnit = doc.units.find(u => `${u.block}-${u.number}` === flat || u.number === flat);
                                            return (
                                                <TouchableOpacity
                                                    key={flat}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Record AMC payment for flat ${flat}`}
                                                    style={s.pendingFlatChip}
                                                    onPress={() => open('amcPayment', {
                                                        unitId: matchedUnit?.id || '',
                                                        year: bs.amc.year,
                                                        amount: '1000',
                                                        status: 'paid',
                                                        receiptNo: '',
                                                        notes: `AMC ${bs.amc.year} ${flat}`
                                                    })}
                                                >
                                                    <AlertTriangle size={12} color="#FBBF24" />
                                                    <Text style={s.pendingFlatText}>{flat}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            <Btn
                                title="+ Record AMC Payment"
                                secondary
                                onPress={() => open('amcPayment', { unitId: '', year: bs.amc.year, amount: '1000', status: 'paid', receiptNo: '', notes: '' })}
                            />
                        </View>
                    </Card>

                    {/* Chronic Multi-Month Defaulters Ledger */}
                    <Card title="Chronic Multi-Month Defaulters Ledger" subtitle="Units with cumulative arrears across past months">
                        {bs.defaultersLedger.map(d => {
                            const isSevere = d.monthCount >= 10;
                            const isHigh = d.monthCount >= 4 && d.monthCount < 10;
                            const severityColor = isSevere ? '#EF4444' : isHigh ? '#F97316' : '#EAB308';
                            const severityLabel = isSevere ? `${d.monthCount} MOS SEVERE` : isHigh ? `${d.monthCount} MOS HIGH` : `${d.monthCount} MO DUE`;
                            const matchedU = doc.units.find(x => x.id === d.unit.id);

                            return (
                                <View key={d.unit.id || d.unitLabel} style={s.defaulterItemCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={[s.unitDoorBadge, { borderColor: severityColor }]}>
                                                <Text style={[s.unitDoorText, { color: severityColor }]}>{d.unitLabel}</Text>
                                            </View>
                                            <View>
                                                <Text style={[ui.text, { fontWeight: '700' }]}>{d.unit.ownerName || `Flat ${d.unitLabel}`}</Text>
                                                <Text style={[ui.muted, { fontSize: 12 }]}>{d.periodRange}</Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                            <Text style={[s.defaulterDueAmount, { color: severityColor }]}>{money.format(d.totalDue)}</Text>
                                            <View style={[s.severityBadge, { backgroundColor: `${severityColor}22` }]}>
                                                <Text style={[s.severityBadgeText, { color: severityColor }]}>{severityLabel}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {d.adhocDue > 0 && (
                                        <View style={s.defaulterBreakdownRow}>
                                            <Text style={s.defaulterBreakdownText}>
                                                Maintenance: {money.format(d.maintenanceDue)} + Function / Other: {money.format(d.adhocDue)}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
                                        <TouchableOpacity
                                            accessibilityRole="button"
                                            accessibilityLabel={`View statement for ${d.unitLabel}`}
                                            style={s.statementBtn}
                                            onPress={() => open('unitStatement', {}, d.unit.id)}
                                        >
                                            <FileText size={13} color="#A78BFA" />
                                            <Text style={s.statementBtnText}>View Ledger Statement</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            accessibilityRole="button"
                                            accessibilityLabel={`Send WhatsApp Notice to ${d.unitLabel}`}
                                            style={[s.statementBtn, { borderColor: '#10B981' }]}
                                            onPress={() => {
                                                if (matchedU) {
                                                    const st = unitStatement(doc, d.unit.id);
                                                    shareUnitStatement(doc, matchedU, st);
                                                }
                                            }}
                                        >
                                            <MessageCircle size={13} color="#10B981" />
                                            <Text style={[s.statementBtnText, { color: '#10B981' }]}>WhatsApp Notice</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                        {!bs.defaultersLedger.length && <Text style={ui.muted}>No overdue units.</Text>}
                    </Card>
                </>
            )}

            {/* UNITS TAB */}
            {doc && tab === 'units' && (
                <>
                    {/* Search & Block Filter Bar */}
                    <View style={s.searchBarContainer}>
                        <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search unit by flat number, block or resident..."
                            placeholderTextColor="#64748B"
                            value={unitSearch}
                            onChangeText={setUnitSearch}
                            clearButtonMode="while-editing"
                        />
                    </View>

                    {/* Filter Pills */}
                    <View style={{ marginVertical: 4 }}>
                        <Text style={s.filterCategoryLabel}>FILTER BY BLOCK</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterPillScroll}>
                            <Chip label={`All Blocks (${doc.units.length})`} active={blockFilter === 'all'} onPress={() => setBlockFilter('all')} />
                            {availableBlocks.map(b => (
                                <Chip key={b} label={`${b} Block (${doc.units.filter(u => u.block === b).length})`} active={blockFilter === b} onPress={() => setBlockFilter(b)} />
                            ))}
                        </ScrollView>

                        <Text style={[s.filterCategoryLabel, { marginTop: 6 }]}>OCCUPANCY STATUS</Text>
                        <View style={ui.wrap}>
                            {[
                                ['all', `All (${doc.units.filter(u => u.active !== false).length})`],
                                ['owner', `Owner (${doc.units.filter(u => u.occupancy === 'owner' && u.active !== false).length})`],
                                ['tenant', `Tenant (${doc.units.filter(u => u.occupancy === 'tenant' && u.active !== false).length})`],
                                ['vacant', `Vacant (${doc.units.filter(u => u.occupancy === 'vacant' && u.active !== false).length})`],
                                ['inactive', `Inactive (${doc.units.filter(u => u.active === false).length})`]
                            ].map(([v, l]) => (
                                <Chip key={v} label={l} active={unitFilter === v} onPress={() => setUnitFilter(v)} />
                            ))}
                        </View>
                    </View>

                    {!doc.units.length && (
                        <Empty title="No units yet" body="Add each flat with its owner or tenant. Maintenance is billed per unit from these records." action="Add unit" onAction={() => open('unit', addFor.units[1])} />
                    )}

                    {filteredUnits.map(u => {
                        const st = unitStatement(doc, u.id);
                        const isOverdue = st.totalDue > 0;
                        const defaultAmount = u.customAmount ?? (doc.society.maintenanceModel === 'per_sqft' ? (u.sqft || 0) * doc.society.ratePerSqft : doc.society.flatAmount);

                        return (
                            <View key={u.id} style={s.unitCard}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View style={s.unitBadgeBox}>
                                            <Text style={s.unitBadgeBoxText}>{unitLabel(u.id)}</Text>
                                        </View>
                                        <View>
                                            <Text style={[ui.text, { fontWeight: '700' }]}>{u.ownerName || 'Unassigned'}</Text>
                                            <Text style={ui.muted}>
                                                {[u.floor ? `Floor ${u.floor}` : null, u.sqft ? `${u.sqft} sq ft` : null, u.parking ? `P: ${u.parking}` : null].filter(Boolean).join(' · ')}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <Badge text={u.occupancy.toUpperCase()} color={u.occupancy === 'vacant' ? palette.muted : palette.info} />
                                        {isOverdue ? (
                                            <Badge text={`DUE ${money.format(st.totalDue)}`} color={palette.danger} />
                                        ) : (
                                            <Badge text="PAID" color={palette.success} />
                                        )}
                                    </View>
                                </View>

                                {u.occupancy === 'tenant' && !!u.tenantName && (
                                    <View style={s.tenantRow}>
                                        <Text style={[ui.muted, { fontSize: 13 }]}>Tenant: {u.tenantName} {u.tenantPhone ? `(${u.tenantPhone})` : ''}</Text>
                                    </View>
                                )}

                                <View style={{ borderTopWidth: 1, borderTopColor: '#2B2B3C', paddingTop: 8, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={[ui.muted, { fontSize: 13 }]}>Maintenance: <Text style={{ color: '#FAFAFF', fontWeight: '700' }}>{money.format(defaultAmount)}/mo</Text></Text>
                                    {!!u.ownerPhone && (
                                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => Linking.openURL(`tel:${u.ownerPhone}`).catch(() => {})}>
                                            <Phone size={13} color="#A78BFA" />
                                            <Text style={[ui.muted, { fontSize: 13, color: '#A78BFA' }]}>{u.ownerPhone}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View style={[ui.wrap, { marginTop: 6 }]}>
                                    <Chip label="Edit Unit" onPress={() => open('unit', { number: u.number, block: u.block, floor: u.floor, sqft: String(u.sqft || ''), ownerName: u.ownerName, ownerPhone: u.ownerPhone, occupancy: u.occupancy, tenantName: u.tenantName, tenantPhone: u.tenantPhone, parking: u.parking, customAmount: u.customAmount != null ? String(u.customAmount) : '' }, u.id)} />
                                    <Chip label="Statement" onPress={() => open('unitStatement', {}, u.id)} />
                                    {isOverdue && (
                                        <Chip label="WhatsApp Reminder" onPress={() => {
                                            const latestUnpaid = st.invoices.find(i => invoiceBalance(i) > 0);
                                            if (latestUnpaid) sendDuesWhatsAppReminder(doc, latestUnpaid, u);
                                        }} />
                                    )}
                                    <Chip label={u.active === false ? 'Reactivate' : 'Mark inactive'} onPress={() => act(() => S.updateUnit(u.id, { active: u.active === false }))} />
                                    <Chip label="Delete" onPress={() => confirm('Delete unit', 'Only units without billing history can be deleted.', () => act(() => S.removeUnit(u.id)), 'Delete')} />
                                </View>
                            </View>
                        );
                    })}
                </>
            )}

            {/* DUES TAB */}
            {doc && tab === 'dues' && (
                <>
                    {/* Month Switcher Capsule */}
                    <View style={s.monthCapsule}>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" style={s.monthNavBtn} onPress={() => setPeriod(shiftMonth(period, -1))}>
                            <ChevronLeft size={20} color="#FAFAFF" />
                        </TouchableOpacity>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Billing month ${formatPeriodName(period)}`} style={s.monthCenterBtn} onPress={() => setPeriod(thisMonth())}>
                            <Calendar size={16} color="#A78BFA" style={{ marginRight: 6 }} />
                            <Text style={s.monthText}>{formatPeriodName(period)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" style={s.monthNavBtn} onPress={() => setPeriod(shiftMonth(period, 1))}>
                            <ChevronRight size={20} color="#FAFAFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Dues 4-Card Summary Ribbon */}
                    <View style={s.metricRibbonGrid}>
                        <View style={[s.metricCard, { borderTopColor: '#A78BFA' }]}>
                            <View style={s.metricCardHeader}>
                                <Text style={s.metricCardLabel}>BILLED</Text>
                                <FileText size={15} color="#A78BFA" />
                            </View>
                            <Text style={s.metricCardValue}>{money.format(collection.billed)}</Text>
                            <Text style={s.metricCardSub}>{invoicesForPeriod.length} invoices</Text>
                        </View>

                        <View style={[s.metricCard, { borderTopColor: '#34D399' }]}>
                            <View style={s.metricCardHeader}>
                                <Text style={s.metricCardLabel}>COLLECTED</Text>
                                <CheckCircle2 size={15} color="#34D399" />
                            </View>
                            <Text style={[s.metricCardValue, { color: '#34D399' }]}>{money.format(collection.collected)}</Text>
                            <Text style={s.metricCardSub}>Received</Text>
                        </View>

                        <View style={[s.metricCard, { borderTopColor: '#F59E0B' }]}>
                            <View style={s.metricCardHeader}>
                                <Text style={s.metricCardLabel}>OUTSTANDING</Text>
                                <AlertTriangle size={15} color="#F59E0B" />
                            </View>
                            <Text style={[s.metricCardValue, { color: collection.outstanding ? '#FBBF24' : '#FAFAFF' }]}>{money.format(collection.outstanding)}</Text>
                            <Text style={s.metricCardSub}>{collection.defaulters.length} overdue</Text>
                        </View>

                        <View style={[s.metricCard, { borderTopColor: '#38BDF8' }]}>
                            <View style={s.metricCardHeader}>
                                <Text style={s.metricCardLabel}>COLLECTION RATE</Text>
                                <Activity size={15} color="#38BDF8" />
                            </View>
                            <Text style={[s.metricCardValue, { color: '#38BDF8' }]}>{collection.efficiency ?? 0}%</Text>
                            <Text style={s.metricCardSub}>Efficiency</Text>
                        </View>
                    </View>

                    {/* Broadcast Overdue Notice Button */}
                    {!!collection.defaulters.length && (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Broadcast Overdue List to WhatsApp"
                            style={s.broadcastBtn}
                            onPress={() => broadcastOverdueList(doc, period, collection)}
                        >
                            <Send size={16} color="#FFFFFF" />
                            <Text style={s.broadcastBtnText}>Broadcast Overdue List to WhatsApp ({collection.defaulters.length} units)</Text>
                        </TouchableOpacity>
                    )}

                    {!invoicesForPeriod.length ? (
                        <Card title={`No dues generated for ${formatPeriodName(period)}`}>
                            <Text style={ui.muted}>
                                {doc.units.length ? `Generate one invoice per active unit using the current maintenance model (${doc.society.maintenanceModel === 'per_sqft' ? `${doc.society.ratePerSqft} per sq ft` : `flat ${money.format(doc.society.flatAmount)}`}). Running it again never duplicates.` : 'Add units first.'}
                            </Text>
                            <Btn title={`Generate dues for ${formatPeriodName(period)}`} disabled={busy || !doc.units.length} onPress={() => act(() => S.generateInvoices(period, today))} />
                        </Card>
                    ) : (
                        <View style={ui.row}>
                            <View style={ui.flex}><Btn title="Generate for new units" secondary disabled={busy} onPress={() => act(() => S.generateInvoices(period, today))} /></View>
                            <View style={ui.flex}><Btn title="Refresh late fees" secondary disabled={busy} onPress={() => act(() => S.refreshLateFees(today))} /></View>
                        </View>
                    )}

                    {/* Search & Dues Filters */}
                    <View style={s.searchBarContainer}>
                        <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search dues by flat number, owner or tenant..."
                            placeholderTextColor="#64748B"
                            value={duesSearch}
                            onChangeText={setDuesSearch}
                            clearButtonMode="while-editing"
                        />
                    </View>

                    <View style={{ marginVertical: 4 }}>
                        <Text style={s.filterCategoryLabel}>FILTER STATUS</Text>
                        <View style={ui.wrap}>
                            {[
                                ['all', `All (${invoicesForPeriod.length})`],
                                ['due', `Overdue / Due (${collection.defaulters.length})`],
                                ['paid', `Paid (${invoicesForPeriod.filter(i => i.status === 'paid').length})`],
                                ['waived', `Waived (${invoicesForPeriod.filter(i => i.status === 'waived').length})`]
                            ].map(([v, l]) => (
                                <Chip key={v} label={l} active={duesStatusFilter === v} onPress={() => setDuesStatusFilter(v)} />
                            ))}
                        </View>

                        <Text style={[s.filterCategoryLabel, { marginTop: 6 }]}>FILTER BY BLOCK</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterPillScroll}>
                            <Chip label="All Blocks" active={duesBlockFilter === 'all'} onPress={() => setDuesBlockFilter('all')} />
                            {availableBlocks.map(b => (
                                <Chip key={b} label={`${b} Block`} active={duesBlockFilter === b} onPress={() => setDuesBlockFilter(b)} />
                            ))}
                        </ScrollView>
                    </View>

                    {filteredInvoices.map(inv => {
                        const bal = invoiceBalance(inv);
                        const matchedU = doc.units.find(u => u.id === inv.unitId);

                        return (
                            <View key={inv.id} style={s.invoiceCard}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={s.unitDoorBadge}>
                                            <Text style={s.unitDoorText}>{unitLabel(inv.unitId)}</Text>
                                        </View>
                                        <View>
                                            <Text style={[ui.text, { fontWeight: '700' }]}>{matchedU?.ownerName || 'Resident'}</Text>
                                            <Text style={[ui.muted, { fontSize: 12 }]}>Due {inv.dueDate}{inv.lateFee ? ` · late fee ${money.format(inv.lateFee)}` : ''}</Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <Badge text={inv.status.toUpperCase()} color={STATUS_COLORS[inv.status]} />
                                        <Text style={[ui.text, { fontWeight: '800' }]}>{money.format(inv.amount + (inv.lateFee || 0))}</Text>
                                    </View>
                                </View>

                                {inv.payments.length > 0 && (
                                    <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#2B2B3C' }}>
                                        <Text style={ui.muted}>Paid {money.format(invoicePaid(inv))}: {inv.payments.map(p => `${p.date} ${money.format(p.amount)} (${p.mode})`).join('; ')}</Text>
                                    </View>
                                )}

                                <View style={[ui.wrap, { marginTop: 8 }]}>
                                    {bal > 0 && (
                                        <Chip label={`Record payment (${money.format(bal)})`} onPress={() => open('payment', { amount: String(bal), date: today, mode: 'upi', reference: '' }, inv.id)} />
                                    )}
                                    {bal > 0 && matchedU && (
                                        <Chip label="WhatsApp Reminder" onPress={() => sendDuesWhatsAppReminder(doc, inv, matchedU)} />
                                    )}
                                    <Chip label="Statement" onPress={() => open('unitStatement', {}, inv.unitId)} />
                                    {bal > 0 && (
                                        <Chip label="Waive" onPress={() => confirm('Waive invoice', 'Mark this invoice as not payable (e.g. vacant unit).', () => act(() => S.waiveInvoice(inv.id, 'Waived by committee')), 'Waive')} />
                                    )}
                                    {!inv.payments.length && (
                                        <Chip label="Delete" onPress={() => act(() => S.removeInvoice(inv.id))} />
                                    )}
                                </View>
                            </View>
                        );
                    })}

                    {doc.units.some(u => u.id === unitFilter) && (
                        <Btn title="Show all units" secondary onPress={() => setUnitFilter('all')} />
                    )}
                </>
            )}

            {/* EXPENSES TAB */}
            {doc && tab === 'expenses' && (
                <>
                    {(() => {
                        const rep = expenseReport(doc, period);
                        return (
                            <>
                                <View style={s.monthCapsule}>
                                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" style={s.monthNavBtn} onPress={() => setPeriod(shiftMonth(period, -1))}>
                                        <ChevronLeft size={20} color="#FAFAFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Month ${formatPeriodName(period)}`} style={s.monthCenterBtn} onPress={() => setPeriod(thisMonth())}>
                                        <Calendar size={16} color="#A78BFA" style={{ marginRight: 6 }} />
                                        <Text style={s.monthText}>{formatPeriodName(period)}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" style={s.monthNavBtn} onPress={() => setPeriod(shiftMonth(period, 1))}>
                                        <ChevronRight size={20} color="#FAFAFF" />
                                    </TouchableOpacity>
                                </View>

                                <View style={s.metricRibbonGrid}>
                                    <View style={[s.metricCard, { borderTopColor: '#F87171' }]}>
                                        <View style={s.metricCardHeader}>
                                            <Text style={s.metricCardLabel}>TOTAL SPENT</Text>
                                            <ArrowUpRight size={15} color="#F87171" />
                                        </View>
                                        <Text style={[s.metricCardValue, { color: '#F87171' }]}>{money.format(rep.total)}</Text>
                                        <Text style={s.metricCardSub}>Monthly outflows</Text>
                                    </View>

                                    <View style={[s.metricCard, { borderTopColor: '#38BDF8' }]}>
                                        <View style={s.metricCardHeader}>
                                            <Text style={s.metricCardLabel}>ENTRIES</Text>
                                            <FileText size={15} color="#38BDF8" />
                                        </View>
                                        <Text style={s.metricCardValue}>{rep.count}</Text>
                                        <Text style={s.metricCardSub}>Itemized bills</Text>
                                    </View>

                                    <View style={[s.metricCard, { borderTopColor: '#FBBF24', flex: 2 }]}>
                                        <View style={s.metricCardHeader}>
                                            <Text style={s.metricCardLabel}>LARGEST CATEGORY</Text>
                                            <Zap size={15} color="#FBBF24" />
                                        </View>
                                        <Text style={[s.metricCardValue, { fontSize: 14 }]} numberOfLines={1}>{rep.byCategory[0]?.category || 'None'}</Text>
                                        <Text style={s.metricCardSub}>{money.format(rep.byCategory[0]?.amount || 0)}</Text>
                                    </View>
                                </View>

                                {/* Search & Category Filters */}
                                <View style={s.searchBarContainer}>
                                    <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={s.searchInput}
                                        placeholder="Search expense description or vendor..."
                                        placeholderTextColor="#64748B"
                                        value={expenseSearch}
                                        onChangeText={setExpenseSearch}
                                        clearButtonMode="while-editing"
                                    />
                                </View>

                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterPillScroll}>
                                    <Chip label="All Categories" active={expenseCategoryFilter === 'all'} onPress={() => setExpenseCategoryFilter('all')} />
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <Chip key={cat} label={cat} active={expenseCategoryFilter === cat} onPress={() => setExpenseCategoryFilter(cat)} />
                                    ))}
                                </ScrollView>
                            </>
                        );
                    })()}

                    {!doc.expenses.length && (
                        <Empty title="No expenses recorded" body="Security, housekeeping, common electricity, water, lift AMC, repairs. Recording them shows the true surplus." action="Add expense" onAction={() => open('expense', addFor.expenses[1])} />
                    )}

                    <Card title={`Entries for ${formatPeriodName(period)}`}>
                        {filteredExpenses.map(e => (
                            <ListItem key={e.id}>
                                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                                    <View style={ui.flex}>
                                        <Text style={[ui.text, { fontWeight: '700' }]}>{e.description}</Text>
                                        <Text style={ui.muted}>{[e.date, e.category, e.paidFrom !== 'maintenance' ? `from ${e.paidFrom} fund` : null, e.vendorId ? doc.vendors.find(v => v.id === e.vendorId)?.name : null].filter(Boolean).join(' · ')}</Text>
                                    </View>
                                    <Text style={[ui.text, { fontWeight: '800' }]}>{money.format(e.amount)}</Text>
                                </View>
                                <Chip label="Delete" onPress={() => act(() => S.removeExpense(e.id))} />
                            </ListItem>
                        ))}
                        {!filteredExpenses.length && <Text style={ui.muted}>No entries found in {formatPeriodName(period)}.</Text>}
                    </Card>

                    <Card title="Vendors & Contracts" subtitle="AMC end dates raise an alert 30 days ahead.">
                        {doc.vendors.map(v => (
                            <ListItem key={v.id}>
                                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                                    <View style={ui.flex}>
                                        <Text style={[ui.text, { fontWeight: '700' }]}>{v.name}</Text>
                                        <Text style={ui.muted}>{[v.service, v.phone, v.contractEnd ? `contract ends ${v.contractEnd}` : null, v.monthlyCost ? `${money.format(v.monthlyCost)}/mo` : null].filter(Boolean).join(' · ')}</Text>
                                    </View>
                                    {v.active === false && <Badge text="INACTIVE" color={palette.muted} />}
                                </View>
                                <View style={ui.wrap}>
                                    {!!v.phone && (
                                        <Chip label={`Call: ${v.phone}`} onPress={() => Linking.openURL(`tel:${v.phone}`).catch(() => {})} />
                                    )}
                                    <Chip label={v.active === false ? 'Reactivate' : 'Deactivate'} onPress={() => act(() => S.updateVendor(v.id, { active: v.active === false }))} />
                                    <Chip label="Delete" onPress={() => act(() => S.removeVendor(v.id))} />
                                </View>
                            </ListItem>
                        ))}
                        <Btn title="+ Add Vendor Contract" secondary onPress={() => open('vendor', { name: '', service: '', phone: '', contractStart: '', contractEnd: '', monthlyCost: '', notes: '' })} />
                    </Card>
                </>
            )}

            {/* COMPLAINTS / TICKETS TAB */}
            {doc && tab === 'tickets' && (
                <>
                    {/* Status Filter Chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterPillScroll}>
                        {[
                            ['all', `All (${doc.tickets.length})`],
                            ['open', `Open (${doc.tickets.filter(t => t.status === 'open').length})`],
                            ['in_progress', `In Progress (${doc.tickets.filter(t => t.status === 'in_progress').length})`],
                            ['resolved', `Resolved (${doc.tickets.filter(t => t.status === 'resolved').length})`],
                            ['closed', `Closed (${doc.tickets.filter(t => t.status === 'closed').length})`]
                        ].map(([v, l]) => (
                            <Chip key={v} label={l} active={ticketFilter === v} onPress={() => setTicketFilter(v)} />
                        ))}
                    </ScrollView>

                    {!doc.tickets.length && (
                        <Empty title="No complaints logged" body="Residents' issues with a category, priority and a visible trail of updates until they are resolved." action="Log complaint" onAction={() => open('ticket', addFor.tickets[1])} />
                    )}

                    {filteredTickets.map(t => {
                        const isUrgent = t.priority === 'urgent';
                        return (
                            <View key={t.id} style={[s.ticketCard, isUrgent && { borderColor: '#EF4444' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Badge text={t.status.replace('_', ' ').toUpperCase()} color={STATUS_COLORS[t.status]} />
                                        <Badge text={t.priority.toUpperCase()} color={isUrgent ? palette.danger : t.priority === 'high' ? palette.warning : palette.muted} />
                                    </View>
                                    <Text style={[ui.muted, { fontSize: 12 }]}>{t.createdAt.slice(0, 10)}</Text>
                                </View>

                                <View style={{ marginTop: 4 }}>
                                    <Text style={[ui.heading, { fontSize: 16 }]}>{t.title}</Text>
                                    <Text style={[ui.muted, { fontSize: 13 }]}>{[unitLabel(t.unitId), t.category].join(' · ')}</Text>
                                </View>

                                {!!t.description && <Text style={[ui.text, { fontSize: 14, marginTop: 4 }]}>{t.description}</Text>}

                                {t.updates.slice(-3).map(u => (
                                    <View key={u.id} style={s.ticketUpdateRow}>
                                        <View style={s.ticketUpdateDot} />
                                        <Text style={[ui.muted, { fontSize: 12, flex: 1 }]}>{u.date.slice(0, 10)} · {u.status.replace('_', ' ')}{u.text ? ` — ${u.text}` : ''}</Text>
                                    </View>
                                ))}

                                <View style={[ui.wrap, { marginTop: 8 }]}>
                                    {t.status === 'open' && <Chip label="Start work" onPress={() => open('ticketUpdate', { status: 'in_progress', note: '' }, t.id)} />}
                                    {(t.status === 'open' || t.status === 'in_progress') && <Chip label="Resolve" onPress={() => open('ticketUpdate', { status: 'resolved', note: '' }, t.id)} />}
                                    {t.status === 'resolved' && <Chip label="Close" onPress={() => act(() => S.updateTicket(t.id, { status: 'closed' }))} />}
                                    {(t.status === 'resolved' || t.status === 'closed') && <Chip label="Reopen" onPress={() => open('ticketUpdate', { status: 'open', note: '' }, t.id)} />}
                                    <Chip label="Add note" onPress={() => open('ticketUpdate', { status: t.status, note: '' }, t.id)} />
                                    <Chip label="Delete" onPress={() => confirm('Delete complaint', 'Remove this complaint and its history?', () => act(() => S.removeTicket(t.id)), 'Delete')} />
                                </View>
                            </View>
                        );
                    })}
                </>
            )}

            {/* COMMUNITY TAB */}
            {doc && tab === 'community' && (
                <>
                    {/* Emergency Contacts Quick Dial Strip */}
                    <View style={s.emergencyCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Phone size={16} color="#FBBF24" />
                            <Text style={s.emergencyTitle}>Emergency & Society Quick Dial</Text>
                        </View>
                        <View style={s.emergencyGrid}>
                            <TouchableOpacity style={s.emergencyBtn} onPress={() => Linking.openURL('tel:9848011223').catch(() => {})}>
                                <Shield size={14} color="#60A5FA" />
                                <Text style={s.emergencyBtnText}>Security Gate</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.emergencyBtn} onPress={() => Linking.openURL('tel:9848011224').catch(() => {})}>
                                <Wrench size={14} color="#FB923C" />
                                <Text style={s.emergencyBtnText}>Plumber/Electrician</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.emergencyBtn} onPress={() => Linking.openURL('tel:08632233445').catch(() => {})}>
                                <Building size={14} color="#C084FC" />
                                <Text style={s.emergencyBtnText}>Johnson Lift AMC</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.emergencyBtn} onPress={() => Linking.openURL('tel:9848011225').catch(() => {})}>
                                <Users size={14} color="#34D399" />
                                <Text style={s.emergencyBtnText}>Supervisor</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={ui.wrap}>
                        {[['notices', 'Notices'], ['meetings', 'Meetings'], ['visitors', 'Visitors'], ['amenities', 'Amenities'], ['funds', 'Funds']].map(([v, l]) => (
                            <Chip key={v} label={l} active={community === v} onPress={() => setCommunity(v)} />
                        ))}
                    </View>

                    {community === 'notices' && (
                        <>
                            <Btn title="+ Post Notice" onPress={() => open('notice', { title: '', body: '', date: today, pinned: false, expiresOn: '' })} />
                            {!doc.notices.length && <Empty title="No notices" body="Water cuts, festival plans, rule changes. Pin the important ones." />}
                            {doc.notices.map(n => (
                                <Card key={n.id} title={n.title} subtitle={`${n.date}${n.expiresOn ? ` · until ${n.expiresOn}` : ''}`}>
                                    {n.pinned && (
                                        <View style={s.pinnedNoticeBadge}>
                                            <Sparkles size={12} color="#FBBF24" />
                                            <Text style={s.pinnedNoticeBadgeText}>OFFICIAL NOTICE</Text>
                                        </View>
                                    )}
                                    {!!n.body && <Text style={ui.text}>{n.body}</Text>}
                                    <View style={ui.wrap}>
                                        <Chip label={n.pinned ? 'Unpin' : 'Pin'} active={n.pinned} onPress={() => act(() => S.togglePin(n.id))} />
                                        <Chip label="Delete" onPress={() => act(() => S.removeNotice(n.id))} />
                                    </View>
                                </Card>
                            ))}
                        </>
                    )}

                    {community === 'meetings' && (
                        <>
                            <Btn title="+ Record Meeting" onPress={() => open('meeting', { date: today, title: '', agenda: '', minutes: '' })} />
                            {!doc.meetings.length && <Empty title="No meetings recorded" body="Agenda, minutes and decisions with owners and due dates keep the committee accountable." />}
                            {doc.meetings.map(m => (
                                <Card key={m.id} title={m.title} subtitle={m.date}>
                                    {!!m.agenda && <Text style={ui.muted}>Agenda: {m.agenda}</Text>}
                                    {!!m.minutes && <Text style={ui.text}>{m.minutes}</Text>}
                                    {m.decisions.map(d => (
                                        <View key={d.id} style={ui.row}>
                                            <Chip label={d.done ? '✓' : '○'} active={d.done} accessibilityLabel={`${d.done ? 'Done' : 'Pending'}: ${d.text}`} onPress={() => act(() => S.toggleDecision(m.id, d.id))} />
                                            <Text style={[ui.text, ui.flex, d.done && { color: palette.muted, textDecorationLine: 'line-through' }]}>
                                                {d.text}{d.ownerName ? ` — ${d.ownerName}` : ''}{d.dueDate ? ` (by ${d.dueDate})` : ''}
                                            </Text>
                                        </View>
                                    ))}
                                    <View style={ui.wrap}>
                                        <Chip label="Add decision" onPress={() => open('decision', { text: '', ownerName: '', dueDate: '' }, m.id)} />
                                        <Chip label="Delete meeting" onPress={() => act(() => S.removeMeeting(m.id))} />
                                    </View>
                                </Card>
                            ))}
                        </>
                    )}

                    {community === 'visitors' && (
                        <>
                            <Btn title="+ Check in Visitor" onPress={() => open('visitor', { name: '', unitId: '', purpose: '', vehicle: '' })} />
                            <Card title={`Inside now (${doc.visitors.filter(v => !v.outAt).length})`}>
                                {doc.visitors.filter(v => !v.outAt).map(v => (
                                    <ListItem key={v.id}>
                                        <KeyValue label={`${v.name} → ${unitLabel(v.unitId)}${v.purpose ? ` · ${v.purpose}` : ''}`} value={v.inAt.slice(11, 16)} />
                                        <Chip label="Check out" onPress={() => act(() => S.checkOutVisitor(v.id))} />
                                    </ListItem>
                                ))}
                                {!doc.visitors.filter(v => !v.outAt).length && <Text style={ui.muted}>Nobody checked in.</Text>}
                            </Card>
                            <Card title="Recent Visitors Log">
                                {doc.visitors.filter(v => v.outAt).slice(0, 15).map(v => (
                                    <KeyValue key={v.id} label={`${v.inAt.slice(0, 10)} ${v.name} → ${unitLabel(v.unitId)}`} value={`${v.inAt.slice(11, 16)}–${v.outAt.slice(11, 16)}`} />
                                ))}
                                {!doc.visitors.filter(v => v.outAt).length && <Text style={ui.muted}>No completed visits yet.</Text>}
                            </Card>
                        </>
                    )}

                    {community === 'amenities' && (
                        <>
                            <View style={ui.row}>
                                <View style={ui.flex}><Btn title="Add amenity" secondary onPress={() => open('amenity', { name: '', fee: '', slots: 'Morning, Afternoon, Evening' })} /></View>
                                <View style={ui.flex}><Btn title="Book" disabled={!doc.amenities.length} onPress={() => open('booking', { amenityId: doc.amenities[0]?.id || '', unitId: '', date: today, slot: doc.amenities[0]?.slots?.[0] || '' })} /></View>
                            </View>
                            {doc.amenities.map(a => (
                                <Card key={a.id} title={a.name} subtitle={`${a.fee ? `${money.format(a.fee)} per slot` : 'Free'} · slots: ${a.slots.join(', ')}`}>
                                    {doc.bookings.filter(b => b.amenityId === a.id && b.status === 'booked' && b.date >= today).sort((x, y) => x.date.localeCompare(y.date)).map(b => (
                                        <View key={b.id} style={[ui.row, { justifyContent: 'space-between' }]}>
                                            <Text style={ui.text}>{b.date} · {b.slot} · {unitLabel(b.unitId)}</Text>
                                            <Chip label="Cancel" onPress={() => act(() => S.cancelBooking(b.id))} />
                                        </View>
                                    ))}
                                    <Chip label="Remove amenity" onPress={() => act(() => S.removeAmenity(a.id))} />
                                </Card>
                            ))}
                        </>
                    )}

                    {community === 'funds' && (
                        <>
                            {(() => {
                                const fb = fundBalances(doc);
                                return (
                                    <View style={ui.wrap}>
                                        {FUND_TYPES.map(t => (
                                            <Stat key={t} label={`${t} fund`} value={money.format(fb[t])} color={fb[t] < 0 ? palette.danger : undefined} />
                                        ))}
                                    </View>
                                );
                            })()}
                            <Btn title="+ Record Fund Entry" onPress={() => open('fund', { type: 'corpus', direction: 'in', date: today, amount: '', note: '', unitId: '' })} />
                            <Card title="Fund Entries">
                                {doc.funds.map(f => (
                                    <ListItem key={f.id}>
                                        <KeyValue label={`${f.date} · ${f.type} · ${f.note || (f.unitId ? unitLabel(f.unitId) : '')}`} value={`${f.direction === 'in' ? '+' : '−'}${money.format(f.amount)}`} color={f.direction === 'in' ? palette.success : palette.danger} />
                                        <Chip label="Delete" onPress={() => act(() => S.removeFundEntry(f.id))} />
                                    </ListItem>
                                ))}
                                {!doc.funds.length && <Text style={ui.muted}>Corpus and sinking fund contributions and withdrawals appear here. Maintenance collections and expenses flow in automatically.</Text>}
                            </Card>
                        </>
                    )}
                </>
            )}

            {/* REPORTS TAB */}
            {doc && tab === 'reports' && (
                <>
                    <View style={s.monthCapsule}>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" style={s.monthNavBtn} onPress={() => setPeriod(shiftMonth(period, -1))}>
                            <ChevronLeft size={20} color="#FAFAFF" />
                        </TouchableOpacity>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Report month ${formatPeriodName(period)}`} style={s.monthCenterBtn} onPress={() => setPeriod(thisMonth())}>
                            <Calendar size={16} color="#A78BFA" style={{ marginRight: 6 }} />
                            <Text style={s.monthText}>{formatPeriodName(period)}</Text>
                            {period === '2026-01' && (
                                <View style={s.auditedTag}>
                                    <Text style={s.auditedTagText}>AUDITED</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" style={s.monthNavBtn} onPress={() => setPeriod(shiftMonth(period, 1))}>
                            <ChevronRight size={20} color="#FAFAFF" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Share Performance Report"
                        style={s.shareBsBtn}
                        onPress={() => shareMonthlyReport(doc, period, today)}
                    >
                        <Share2 size={16} color="#C084FC" />
                        <Text style={s.shareBsBtnText}>Share Monthly Society Performance Report</Text>
                    </TouchableOpacity>

                    {period !== '2026-01' && (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Jump to January 2026 Reference Report"
                            style={s.refJumpBtn}
                            onPress={() => setPeriod('2026-01')}
                        >
                            <Sparkles size={14} color="#FBBF24" />
                            <Text style={s.refJumpText}>Jump to Jan 2026 (Audited Physical Reference Report)</Text>
                        </TouchableOpacity>
                    )}

                    {(() => {
                        const pnl = profitAndLoss(doc, period, today);
                        const col = collectionReport(doc, period, today);
                        const exp = expenseReport(doc, period);
                        const occ = occupancySummary ? occupancySummary(doc) : { total: 0, owner: 0, tenant: 0, vacant: 0, occupancyRate: 0 };
                        const funds = fundBalances(doc);
                        const tix = ticketSummary ? ticketSummary(doc) : { open: 0, urgent: 0, resolvedThisMonth: 0 };
                        const isSurplus = (pnl.surplus || 0) >= 0;

                        return (
                            <>
                                {/* NET SURPLUS / DEFICIT HERO CARD */}
                                <View style={[s.reconciliationAuditCard, { borderColor: isSurplus ? '#10B981' : '#EF4444', backgroundColor: isSurplus ? '#061D15' : '#1F0C0E' }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <Text style={s.reconTitle}>Net Cash Surplus / (Deficit)</Text>
                                        <View style={[s.reconBadge, { backgroundColor: isSurplus ? '#064E3B' : '#7F1D1D' }]}>
                                            {isSurplus ? <CheckCircle2 size={12} color="#34D399" /> : <AlertTriangle size={12} color="#F87171" />}
                                            <Text style={[s.reconBadgeText, { color: isSurplus ? '#34D399' : '#FCA5A5' }]}>
                                                {isSurplus ? 'NET SURPLUS' : 'NET DEFICIT'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={{ fontSize: 26, fontWeight: '800', color: isSurplus ? '#34D399' : '#F87171', marginBottom: 4 }}>
                                        {money.format(pnl.surplus || 0)}
                                    </Text>
                                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                                        {isSurplus
                                            ? `Net positive monthly balance generated in ${formatPeriodName(period)}.`
                                            : `Expenditures exceeded collections in ${formatPeriodName(period)}.`}
                                    </Text>
                                </View>

                                {/* 4-CARD P&L METRIC STRIP */}
                                <View style={s.metricRibbonGrid}>
                                    <View style={[s.metricCard, { borderTopColor: '#A78BFA' }]}>
                                        <View style={s.metricCardHeader}>
                                            <Text style={s.metricCardLabel}>BILLED</Text>
                                            <FileText size={14} color="#A78BFA" />
                                        </View>
                                        <Text style={s.metricCardValue}>{money.format(pnl.billed || 0)}</Text>
                                        <Text style={s.metricCardSub}>Maintenance demand</Text>
                                    </View>
                                    <View style={[s.metricCard, { borderTopColor: '#34D399' }]}>
                                        <View style={s.metricCardHeader}>
                                            <Text style={s.metricCardLabel}>COLLECTED</Text>
                                            <CheckCircle2 size={14} color="#34D399" />
                                        </View>
                                        <Text style={[s.metricCardValue, { color: '#34D399' }]}>{money.format(pnl.cashCollected || 0)}</Text>
                                        <Text style={s.metricCardSub}>{pnl.collectionEfficiency || col.efficiency || 0}% efficiency</Text>
                                    </View>
                                    <View style={[s.metricCard, { borderTopColor: '#F87171' }]}>
                                        <View style={s.metricCardHeader}>
                                            <Text style={s.metricCardLabel}>EXPENSES</Text>
                                            <ArrowUpRight size={14} color="#F87171" />
                                        </View>
                                        <Text style={[s.metricCardValue, { color: '#F87171' }]}>{money.format(pnl.expenses || 0)}</Text>
                                        <Text style={s.metricCardSub}>{exp.count || 0} itemized bills</Text>
                                    </View>
                                    <View style={[s.metricCard, { borderTopColor: '#38BDF8' }]}>
                                        <View style={s.metricCardHeader}>
                                            <Text style={s.metricCardLabel}>OTHER INFLOWS</Text>
                                            <ArrowDownLeft size={14} color="#38BDF8" />
                                        </View>
                                        <Text style={[s.metricCardValue, { color: '#38BDF8' }]}>{money.format(pnl.otherIncome || 0)}</Text>
                                        <Text style={s.metricCardSub}>Advances & misc</Text>
                                    </View>
                                </View>

                                {/* CASH FLOW STATEMENT CARD */}
                                <Card title="Profit & Loss / Cash Flow Summary">
                                    <KeyValue label="Maintenance billed" value={money.format(pnl.billed || 0)} />
                                    <KeyValue label="Collections received" value={money.format(pnl.cashCollected || 0)} color="#34D399" />
                                    {(pnl.otherIncome || 0) > 0 && (
                                        <KeyValue label="Other maintenance fund inflows" value={money.format(pnl.otherIncome)} color="#38BDF8" />
                                    )}
                                    <KeyValue label="Total expenses paid" value={money.format(pnl.expenses || 0)} color="#F87171" />
                                    <KeyValue
                                        label="Net monthly surplus / (deficit)"
                                        value={money.format(pnl.surplus || 0)}
                                        color={isSurplus ? palette.success : palette.danger}
                                    />
                                </Card>

                                {/* COLLECTION & ARREARS REPORT */}
                                <Card title="Collection & Arrears Performance">
                                    <KeyValue label="Collection Efficiency" value={`${col.efficiency || 0}%`} color={(col.efficiency || 0) >= 80 ? '#34D399' : '#FBBF24'} />
                                    <KeyValue label="Total Collected" value={money.format(col.collected || 0)} color="#34D399" />
                                    <KeyValue label="Outstanding Arrears" value={money.format(col.outstanding || 0)} color={(col.outstanding || 0) > 0 ? '#F87171' : '#94A3B8'} />
                                    <KeyValue label="Overdue Units" value={`${col.overdueCount || 0} units`} color={(col.overdueCount || 0) > 0 ? '#FBBF24' : '#94A3B8'} />
                                </Card>

                                {/* RESERVE FUNDS SUMMARY */}
                                <Card title="Society Treasury & Reserve Funds">
                                    <KeyValue label="Maintenance Fund (Operating)" value={money.format(funds.maintenance || 0)} color={(funds.maintenance || 0) >= 0 ? '#34D399' : '#F87171'} />
                                    <KeyValue label="Corpus Fund (Long-term / FDs)" value={money.format(funds.corpus || 0)} color="#A78BFA" />
                                    <KeyValue label="Sinking Fund (Capital Works)" value={money.format(funds.sinking || 0)} color="#38BDF8" />
                                    <KeyValue
                                        label="Total Treasury Balance"
                                        value={money.format((funds.maintenance || 0) + (funds.corpus || 0) + (funds.sinking || 0))}
                                        color="#FAFAFF"
                                    />
                                </Card>

                                {/* OCCUPANCY & COMMUNITY METRICS */}
                                <Card title="Occupancy & Community Metrics">
                                    <KeyValue label="Total Units" value={String(occ.total || 0)} />
                                    <KeyValue label="Owner-occupied" value={String(occ.owner || 0)} />
                                    <KeyValue label="Tenant-occupied" value={String(occ.tenant || 0)} />
                                    <KeyValue label="Vacant" value={String(occ.vacant || 0)} />
                                    <KeyValue label="Occupancy rate" value={occ.occupancyRate === null ? '—' : `${occ.occupancyRate}%`} color={palette.info} />
                                    <KeyValue label="Open Complaints" value={String(tix.open || 0)} color={(tix.open || 0) > 0 ? '#FBBF24' : '#34D399'} />
                                    <KeyValue label="Resolved Complaints (This Month)" value={String(tix.resolvedThisMonth || 0)} color="#34D399" />
                                </Card>
                            </>
                        );
                    })()}
                </>
            )}

            {/* MODAL SHEET */}
            <Sheet
                visible={!!sheet}
                title={sheet ? ({
                    society: 'Society Settings',
                    unit: sheet.id ? 'Edit Unit' : 'Add Unit',
                    payment: 'Record Payment',
                    expense: 'Add Expense',
                    vendor: 'Add Vendor',
                    ticket: 'Log Complaint',
                    ticketUpdate: 'Update Complaint',
                    notice: 'Post Notice',
                    meeting: 'Record Meeting',
                    decision: 'Add Decision',
                    visitor: 'Check In Visitor',
                    amenity: 'Add Amenity',
                    booking: 'Book Amenity',
                    fund: 'Fund Entry',
                    termDeposit: sheet.id ? 'Edit Term Deposit' : 'Add Term Deposit',
                    adhocCharge: 'Record Other Inflow / Advance',
                    amcPayment: 'Record AMC Payment',
                    unitStatement: 'Unit Financial Statement & Ledger'
                })[sheet.kind] : ''}
                onClose={() => setSheet(null)}
            >
                {sheet && (
                    <>
                        <Notice>{error}</Notice>
                        {sheet.kind === 'society' && (
                            <>
                                <Field label="Society name" value={sheet.form.name} onChangeText={v => setF({ name: v })} placeholder="e.g. Sri Venkateswara Enclave" autoFocus />
                                <Field label="Address" value={sheet.form.address} onChangeText={v => setF({ address: v })} />
                                <Choice label="Maintenance charged" options={[{ value: 'flat', label: 'Same amount per unit' }, { value: 'per_sqft', label: 'Per sq ft' }]} value={sheet.form.maintenanceModel} onChange={v => setF({ maintenanceModel: v })} />
                                {sheet.form.maintenanceModel === 'flat' ? (
                                    <MoneyField label="Monthly maintenance per unit" value={sheet.form.flatAmount} onChangeText={v => setF({ flatAmount: v })} />
                                ) : (
                                    <MoneyField label="Rate per sq ft per month" value={sheet.form.ratePerSqft} onChangeText={v => setF({ ratePerSqft: v })} />
                                )}
                                <Field label="Due day of month (1-28)" numeric value={sheet.form.dueDay} onChangeText={v => setF({ dueDay: v })} />
                                <Choice label="Late fee" options={[{ value: 'none', label: 'None' }, { value: 'flat', label: 'Fixed amount' }, { value: 'percent', label: '% of invoice' }]} value={sheet.form.lateFeeType} onChange={v => setF({ lateFeeType: v })} />
                                {sheet.form.lateFeeType !== 'none' && (
                                    <View style={ui.row}>
                                        <View style={ui.flex}><Field label={sheet.form.lateFeeType === 'flat' ? 'Late fee amount' : 'Late fee %'} numeric value={sheet.form.lateFeeValue} onChangeText={v => setF({ lateFeeValue: v })} /></View>
                                        <View style={ui.flex}><Field label="Grace days" numeric value={sheet.form.graceDays} onChangeText={v => setF({ graceDays: v })} /></View>
                                    </View>
                                )}
                                <Text style={ui.label}>Opening balances</Text>
                                <View style={ui.row}>
                                    <View style={ui.flex}><MoneyField label="Maintenance" value={sheet.form.openMaintenance} onChangeText={v => setF({ openMaintenance: v })} /></View>
                                    <View style={ui.flex}><MoneyField label="Corpus" value={sheet.form.openCorpus} onChangeText={v => setF({ openCorpus: v })} /></View>
                                    <View style={ui.flex}><MoneyField label="Sinking" value={sheet.form.openSinking} onChangeText={v => setF({ openSinking: v })} /></View>
                                </View>
                            </>
                        )}
                        {sheet.kind === 'unit' && (
                            <>
                                <View style={ui.row}>
                                    <View style={ui.flex}><Field label="Unit number" value={sheet.form.number} onChangeText={v => setF({ number: v })} placeholder="101" autoFocus /></View>
                                    <View style={ui.flex}><Field label="Block / wing" value={sheet.form.block} onChangeText={v => setF({ block: v })} placeholder="A" /></View>
                                    <View style={ui.flex}><Field label="Floor" value={sheet.form.floor} onChangeText={v => setF({ floor: v })} /></View>
                                </View>
                                <Field label="Area (sq ft)" numeric value={sheet.form.sqft} onChangeText={v => setF({ sqft: v })} />
                                <Choice label="Occupancy" options={OCCUPANCY} value={sheet.form.occupancy} onChange={v => setF({ occupancy: v })} />
                                <View style={ui.row}>
                                    <View style={ui.flex}><Field label="Owner name" value={sheet.form.ownerName} onChangeText={v => setF({ ownerName: v })} /></View>
                                    <View style={ui.flex}><Field label="Owner phone" value={sheet.form.ownerPhone} onChangeText={v => setF({ ownerPhone: v })} keyboardType="phone-pad" /></View>
                                </View>
                                {sheet.form.occupancy === 'tenant' && (
                                    <View style={ui.row}>
                                        <View style={ui.flex}><Field label="Tenant name" value={sheet.form.tenantName} onChangeText={v => setF({ tenantName: v })} /></View>
                                        <View style={ui.flex}><Field label="Tenant phone" value={sheet.form.tenantPhone} onChangeText={v => setF({ tenantPhone: v })} keyboardType="phone-pad" /></View>
                                    </View>
                                )}
                                <Field label="Parking slot" value={sheet.form.parking} onChangeText={v => setF({ parking: v })} placeholder="e.g. P-12" />
                                <MoneyField label="Custom monthly maintenance (leave blank for default model)" value={sheet.form.customAmount} onChangeText={v => setF({ customAmount: v })} />
                            </>
                        )}
                        {sheet.kind === 'payment' && (
                            <>
                                <MoneyField label="Amount paid" value={sheet.form.amount} onChangeText={v => setF({ amount: v })} autoFocus />
                                <DateField label="Payment date" value={sheet.form.date} onChange={v => setF({ date: v })} />
                                <Choice label="Payment mode" options={PAYMENT_MODES} value={sheet.form.mode} onChange={v => setF({ mode: v })} />
                                <Field label="Reference / UPI ID / Receipt #" value={sheet.form.reference} onChangeText={v => setF({ reference: v })} />
                            </>
                        )}
                        {sheet.kind === 'expense' && (
                            <>
                                <DateField label="Date" value={sheet.form.date} onChange={v => setF({ date: v })} />
                                <Choice label="Category" options={EXPENSE_CATEGORIES} value={sheet.form.category} onChange={v => setF({ category: v })} />
                                <Field label="Description" value={sheet.form.description} onChangeText={v => setF({ description: v })} placeholder="e.g. Common electricity bill" autoFocus />
                                <MoneyField label="Amount" value={sheet.form.amount} onChangeText={v => setF({ amount: v })} />
                                <Choice label="Paid from fund" options={FUND_TYPES} value={sheet.form.paidFrom} onChange={v => setF({ paidFrom: v })} />
                                <Choice label="Vendor (optional)" options={[{ value: '', label: 'None' }, ...doc.vendors.map(v => ({ value: v.id, label: v.name }))]} value={sheet.form.vendorId} onChange={v => setF({ vendorId: v })} />
                            </>
                        )}
                        {sheet.kind === 'vendor' && (
                            <>
                                <Field label="Vendor / Company name" value={sheet.form.name} onChangeText={v => setF({ name: v })} placeholder="e.g. SafeGuard Security" autoFocus />
                                <Field label="Service provided" value={sheet.form.service} onChangeText={v => setF({ service: v })} placeholder="Security, lift AMC, housekeeping" />
                                <Field label="Phone" value={sheet.form.phone} onChangeText={v => setF({ phone: v })} keyboardType="phone-pad" />
                                <View style={ui.row}>
                                    <View style={ui.flex}><DateField label="Contract start" value={sheet.form.contractStart} onChange={v => setF({ contractStart: v })} /></View>
                                    <View style={ui.flex}><DateField label="Contract end" value={sheet.form.contractEnd} onChange={v => setF({ contractEnd: v })} /></View>
                                </View>
                                <MoneyField label="Monthly cost" value={sheet.form.monthlyCost} onChangeText={v => setF({ monthlyCost: v })} />
                                <Field label="Notes" value={sheet.form.notes} onChangeText={v => setF({ notes: v })} />
                            </>
                        )}
                        {sheet.kind === 'ticket' && (
                            <>
                                <Choice label="Unit (optional)" options={unitOptions} value={sheet.form.unitId} onChange={v => setF({ unitId: v })} />
                                <Choice label="Category" options={TICKET_CATEGORIES} value={sheet.form.category} onChange={v => setF({ category: v })} />
                                <Choice label="Priority" options={TICKET_PRIORITY} value={sheet.form.priority} onChange={v => setF({ priority: v })} />
                                <Field label="Subject" value={sheet.form.title} onChangeText={v => setF({ title: v })} placeholder="e.g. Water leakage in corridor" autoFocus />
                                <Field label="Details" value={sheet.form.description} onChangeText={v => setF({ description: v })} />
                            </>
                        )}
                        {sheet.kind === 'ticketUpdate' && (
                            <>
                                <Choice label="Status" options={TICKET_STATUS} value={sheet.form.status} onChange={v => setF({ status: v })} />
                                <Field label="Update note" value={sheet.form.note} onChangeText={v => setF({ note: v })} placeholder="e.g. Plumber dispatched" autoFocus />
                            </>
                        )}
                        {sheet.kind === 'notice' && (
                            <>
                                <Field label="Title" value={sheet.form.title} onChangeText={v => setF({ title: v })} placeholder="e.g. Water tank cleaning tomorrow" autoFocus />
                                <DateField label="Date" value={sheet.form.date} onChange={v => setF({ date: v })} />
                                <DateField label="Expires on (optional)" value={sheet.form.expiresOn} onChange={v => setF({ expiresOn: v })} />
                                <Field label="Message" value={sheet.form.body} onChangeText={v => setF({ body: v })} />
                                <Choice label="Pin to top" options={[{ value: true, label: 'Yes, pinned' }, { value: false, label: 'No' }]} value={sheet.form.pinned} onChange={v => setF({ pinned: v })} />
                            </>
                        )}
                        {sheet.kind === 'meeting' && (
                            <>
                                <DateField label="Date" value={sheet.form.date} onChange={v => setF({ date: v })} />
                                <Field label="Meeting title" value={sheet.form.title} onChangeText={v => setF({ title: v })} placeholder="e.g. AGM 2026" autoFocus />
                                <Field label="Agenda" value={sheet.form.agenda} onChangeText={v => setF({ agenda: v })} />
                                <Field label="Minutes & discussion" value={sheet.form.minutes} onChangeText={v => setF({ minutes: v })} />
                            </>
                        )}
                        {sheet.kind === 'decision' && (
                            <>
                                <Field label="Action item / decision" value={sheet.form.text} onChangeText={v => setF({ text: v })} placeholder="e.g. Repair boundary wall" autoFocus />
                                <Field label="Responsible person" value={sheet.form.ownerName} onChangeText={v => setF({ ownerName: v })} />
                                <DateField label="Target completion date" value={sheet.form.dueDate} onChange={v => setF({ dueDate: v })} />
                            </>
                        )}
                        {sheet.kind === 'visitor' && (
                            <>
                                <Field label="Visitor name" value={sheet.form.name} onChangeText={v => setF({ name: v })} autoFocus />
                                <Choice label="Visiting unit" options={unitOptions.filter(u => u.value)} value={sheet.form.unitId} onChange={v => setF({ unitId: v })} />
                                <Field label="Purpose" value={sheet.form.purpose} onChangeText={v => setF({ purpose: v })} placeholder="Delivery, guest, maintenance" />
                                <Field label="Vehicle number (optional)" value={sheet.form.vehicle} onChangeText={v => setF({ vehicle: v })} />
                            </>
                        )}
                        {sheet.kind === 'amenity' && (
                            <>
                                <Field label="Amenity name" value={sheet.form.name} onChangeText={v => setF({ name: v })} placeholder="e.g. Clubhouse, Swimming Pool" autoFocus />
                                <MoneyField label="Booking fee (0 for free)" value={sheet.form.fee} onChangeText={v => setF({ fee: v })} />
                                <Field label="Time slots (comma separated)" value={sheet.form.slots} onChangeText={v => setF({ slots: v })} placeholder="Morning, Afternoon, Evening" />
                            </>
                        )}
                        {sheet.kind === 'booking' && (
                            <>
                                <Choice label="Amenity" options={doc.amenities.map(a => ({ value: a.id, label: a.name }))} value={sheet.form.amenityId} onChange={v => setF({ amenityId: v })} />
                                <Choice label="Unit" options={unitOptions.filter(u => u.value)} value={sheet.form.unitId} onChange={v => setF({ unitId: v })} />
                                <DateField label="Booking date" value={sheet.form.date} onChange={v => setF({ date: v })} />
                                <Choice label="Slot" options={(doc.amenities.find(a => a.id === sheet.form.amenityId)?.slots || ['Default']).map(s => ({ value: s, label: s }))} value={sheet.form.slot} onChange={v => setF({ slot: v })} />
                            </>
                        )}
                        {sheet.kind === 'fund' && (
                            <>
                                <Choice label="Fund type" options={FUND_TYPES} value={sheet.form.type} onChange={v => setF({ type: v })} />
                                <Choice label="Direction" options={[{ value: 'in', label: 'Contribution (+)' }, { value: 'out', label: 'Withdrawal (−)' }]} value={sheet.form.direction} onChange={v => setF({ direction: v })} />
                                <DateField label="Date" value={sheet.form.date} onChange={v => setF({ date: v })} />
                                <MoneyField label="Amount" value={sheet.form.amount} onChangeText={v => setF({ amount: v })} autoFocus />
                                <Field label="Note" value={sheet.form.note} onChangeText={v => setF({ note: v })} placeholder="e.g. Annual sinking contribution" />
                                <Choice label="Unit (optional)" options={unitOptions} value={sheet.form.unitId} onChange={v => setF({ unitId: v })} />
                            </>
                        )}
                        {sheet.kind === 'termDeposit' && (
                            <>
                                <Field label="Bank name" value={sheet.form.bank} onChangeText={v => setF({ bank: v })} placeholder="e.g. State Bank of India" autoFocus />
                                <Field label="FD Account / Certificate #" value={sheet.form.accountOrCertNo} onChangeText={v => setF({ accountOrCertNo: v })} placeholder="e.g. SBI-FD-98214" />
                                <View style={ui.row}>
                                    <View style={ui.flex}><DateField label="Deposit date" value={sheet.form.depositDate} onChange={v => setF({ depositDate: v })} /></View>
                                    <View style={ui.flex}><DateField label="Maturity date" value={sheet.form.maturityDate} onChange={v => setF({ maturityDate: v })} /></View>
                                </View>
                                <View style={ui.row}>
                                    <View style={ui.flex}><MoneyField label="Principal" value={sheet.form.principalAmount} onChangeText={v => setF({ principalAmount: v })} /></View>
                                    <View style={ui.flex}><Field label="Interest % p.a." numeric value={sheet.form.interestRate} onChangeText={v => setF({ interestRate: v })} /></View>
                                </View>
                                <MoneyField label="Maturity value" value={sheet.form.maturityAmount} onChangeText={v => setF({ maturityAmount: v })} />
                                <Choice label="Fund type" options={['corpus', 'sinking', 'reserve']} value={sheet.form.fundType} onChange={v => setF({ fundType: v })} />
                                <Field label="Notes" value={sheet.form.notes} onChangeText={v => setF({ notes: v })} />
                            </>
                        )}
                        {sheet.kind === 'adhocCharge' && (
                            <>
                                <Choice label="Unit" options={unitOptions.filter(u => u.value)} value={sheet.form.unitId} onChange={v => setF({ unitId: v })} />
                                <Choice label="Category" options={ADHOC_CATEGORIES} value={sheet.form.category} onChange={v => setF({ category: v })} />
                                <View style={ui.row}>
                                    <View style={ui.flex}><MoneyField label="Amount" value={sheet.form.amount} onChangeText={v => setF({ amount: v })} autoFocus /></View>
                                    <View style={ui.flex}><DateField label="Date" value={sheet.form.date} onChange={v => setF({ date: v })} /></View>
                                </View>
                                <Field label="Description" value={sheet.form.description} onChangeText={v => setF({ description: v })} placeholder="e.g. Lift usage charges or maintenance advance" />
                                <Choice label="Payment mode" options={PAYMENT_MODES} value={sheet.form.paymentMode} onChange={v => setF({ paymentMode: v })} />
                                <Field label="Notes" value={sheet.form.notes} onChangeText={v => setF({ notes: v })} />
                            </>
                        )}
                        {sheet.kind === 'amcPayment' && (
                            <>
                                <Choice label="Unit" options={unitOptions.filter(u => u.value)} value={sheet.form.unitId} onChange={v => setF({ unitId: v })} />
                                <View style={ui.row}>
                                    <View style={ui.flex}><Field label="Year" value={sheet.form.year} onChangeText={v => setF({ year: v })} /></View>
                                    <View style={ui.flex}><MoneyField label="Amount" value={sheet.form.amount} onChangeText={v => setF({ amount: v })} /></View>
                                </View>
                                <Choice label="Status" options={['paid', 'due']} value={sheet.form.status} onChange={v => setF({ status: v })} />
                                <Field label="Receipt number" value={sheet.form.receiptNo} onChangeText={v => setF({ receiptNo: v })} placeholder="AMC-26-001" />
                                <Field label="Notes" value={sheet.form.notes} onChangeText={v => setF({ notes: v })} />
                            </>
                        )}
                        {sheet.kind === 'unitStatement' && (() => {
                            const u = doc.units.find(x => x.id === sheet.id);
                            if (!u) return null;
                            const st = unitStatement(doc, u.id);
                            const uL = unitLabel(u.id);

                            return (
                                <View style={{ gap: 12 }}>
                                    <View style={{ backgroundColor: '#181826', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2E2E42' }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <View style={s.unitDoorBadge}><Text style={s.unitDoorText}>{uL}</Text></View>
                                                <View>
                                                    <Text style={[ui.text, { fontWeight: '700', fontSize: 16 }]}>{u.ownerName || 'Unassigned'}</Text>
                                                    <Text style={[ui.muted, { fontSize: 12 }]}>{u.occupancy.toUpperCase()} · Floor {u.floor || '1'} · {u.sqft || '—'} sq ft</Text>
                                                </View>
                                            </View>
                                            <Badge text={st.totalDue > 0 ? `DUE ${money.format(st.totalDue)}` : 'PAID'} color={st.totalDue > 0 ? palette.danger : palette.success} />
                                        </View>

                                        {!!u.ownerPhone && (
                                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2B2B3C' }} onPress={() => Linking.openURL(`tel:${u.ownerPhone}`).catch(() => {})}>
                                                <Phone size={14} color="#A78BFA" />
                                                <Text style={{ color: '#A78BFA', fontWeight: '600', fontSize: 13 }}>Call Owner: {u.ownerPhone}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <View style={[s.metricCard, { flex: 1 }]}>
                                            <Text style={s.metricLabel}>LIFETIME BILLED</Text>
                                            <Text style={[s.metricValue, { fontSize: 14, color: '#FAFAFF' }]}>{money.format(st.invoices.reduce((s, i) => s + i.amount + (i.lateFee || 0), 0))}</Text>
                                        </View>
                                        <View style={[s.metricCard, { flex: 1 }]}>
                                            <Text style={s.metricLabel}>LIFETIME PAID</Text>
                                            <Text style={[s.metricValue, { fontSize: 14, color: '#34D399' }]}>{money.format(st.totalPaid)}</Text>
                                        </View>
                                        <View style={[s.metricCard, { flex: 1, borderColor: st.totalDue > 0 ? '#EF4444' : '#2D2D42' }]}>
                                            <Text style={s.metricLabel}>OUTSTANDING</Text>
                                            <Text style={[s.metricValue, { fontSize: 14, color: st.totalDue > 0 ? '#F87171' : '#34D399' }]}>{money.format(st.totalDue)}</Text>
                                        </View>
                                    </View>

                                    <Text style={[ui.label, { marginTop: 4 }]}>Billing & Payment History ({st.invoices.length} invoices)</Text>
                                    <ScrollView style={{ maxHeight: 220 }}>
                                        {st.invoices.map(inv => {
                                            const bal = invoiceBalance(inv);
                                            return (
                                                <View key={inv.id} style={{ backgroundColor: '#13131F', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#232334' }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text style={[ui.text, { fontWeight: '700', fontSize: 13 }]}>{formatPeriodName(inv.period)}</Text>
                                                        <Badge text={inv.status.toUpperCase()} color={STATUS_COLORS[inv.status]} />
                                                    </View>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                                        <Text style={[ui.muted, { fontSize: 12 }]}>Billed: {money.format(inv.amount + (inv.lateFee || 0))}</Text>
                                                        <Text style={{ fontSize: 12, color: bal > 0 ? '#F87171' : '#34D399', fontWeight: '700' }}>{bal > 0 ? `Pending: ${money.format(bal)}` : 'Paid in Full'}</Text>
                                                    </View>
                                                    {inv.payments.length > 0 && (
                                                        <Text style={[ui.muted, { fontSize: 11, marginTop: 2 }]}>
                                                            Paid: {inv.payments.map(p => `${p.date} ${money.format(p.amount)} (${p.mode})`).join(', ')}
                                                        </Text>
                                                    )}
                                                </View>
                                            );
                                        })}
                                        {!st.invoices.length && <Text style={ui.muted}>No invoices generated for this unit.</Text>}
                                    </ScrollView>

                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                        <View style={{ flex: 1 }}>
                                            <Btn title="Share Statement" secondary onPress={() => shareUnitStatement(doc, u, st)} />
                                        </View>
                                        {st.totalDue > 0 && (
                                            <View style={{ flex: 1 }}>
                                                <Btn title="WhatsApp Reminder" onPress={() => {
                                                    const latestUnpaid = st.invoices.find(i => invoiceBalance(i) > 0);
                                                    if (latestUnpaid) sendDuesWhatsAppReminder(doc, latestUnpaid, u);
                                                }} />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })()}
                        {sheet.kind !== 'unitStatement' && (
                            <Btn title={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={submit} />
                        )}
                    </>
                )}
            </Sheet>
        </Screen>
    );
}

const s = StyleSheet.create({
    heroCard: {
        backgroundColor: '#13131E',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2D2D42',
        gap: 12
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    heroIconBox: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: '#231B38',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#3D2F60'
    },
    heroTitle: {
        color: '#FAFAFF',
        fontSize: 17,
        fontWeight: '800'
    },
    heroAddress: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 2
    },
    verifiedPill: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#38BDF8'
    },
    verifiedPillText: {
        color: '#38BDF8',
        fontSize: 10,
        fontWeight: '800'
    },
    heroDivider: {
        height: 1,
        backgroundColor: '#252538'
    },
    heroKpiRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    heroKpiItem: {
        flex: 1,
        alignItems: 'center'
    },
    heroKpiLabel: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 2
    },
    heroKpiVal: {
        color: '#FAFAFF',
        fontSize: 15,
        fontWeight: '800'
    },
    heroKpiDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#252538'
    },
    featureCard: {
        backgroundColor: '#171329',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        borderColor: '#7C3AED',
        marginTop: 12
    },
    featureTitle: {
        color: '#FAFAFF',
        fontSize: 15,
        fontWeight: '800'
    },
    featureBadge: {
        backgroundColor: '#4C1D95',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    featureBadgeText: {
        color: '#E9D5FF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    featureDesc: {
        color: '#CBD5E1',
        fontSize: 12,
        lineHeight: 18,
        marginVertical: 10
    },
    featureBtn: {
        backgroundColor: '#7C3AED',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 10
    },
    featureBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    quickActionRow: {
        flexDirection: 'row',
        gap: 8,
        marginVertical: 8
    },
    quickActionPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#181826',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2A2A3E'
    },
    quickActionText: {
        color: '#FAFAFF',
        fontSize: 12,
        fontWeight: '700'
    },
    quickBalanceSheetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#241D12',
        borderWidth: 1,
        borderColor: '#B45309',
        paddingVertical: 11,
        borderRadius: 10,
        marginBottom: 12
    },
    quickBalanceSheetText: {
        color: '#FBBF24',
        fontSize: 13,
        fontWeight: '700'
    },
    kpiMiniGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12
    },
    kpiMiniCard: {
        width: '48.5%',
        backgroundColor: '#13131E',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1
    },
    kpiMiniLabel: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 4
    },
    kpiMiniVal: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 2
    },
    kpiMiniSub: {
        color: '#94A3B8',
        fontSize: 11
    },
    monthCapsule: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#13131F',
        borderRadius: 12,
        padding: 6,
        borderWidth: 1,
        borderColor: '#252538',
        marginBottom: 12
    },
    monthNavBtn: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#1C1C2C',
        alignItems: 'center',
        justifyContent: 'center'
    },
    monthCenterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
    },
    monthText: {
        color: '#FAFAFF',
        fontSize: 15,
        fontWeight: '700'
    },
    auditedTag: {
        backgroundColor: '#064E3B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8
    },
    auditedTagText: {
        color: '#34D399',
        fontSize: 10,
        fontWeight: '800'
    },
    shareBsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1E1933',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#7C3AED',
        marginBottom: 12
    },
    shareBsBtnText: {
        color: '#C084FC',
        fontSize: 13,
        fontWeight: '700'
    },
    refJumpBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#261C08',
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D97706',
        marginBottom: 12
    },
    refJumpText: {
        color: '#FBBF24',
        fontSize: 12,
        fontWeight: '700'
    },
    broadcastBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#047857',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#059669',
        marginBottom: 12
    },
    broadcastBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    metricRibbonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12
    },
    metricCard: {
        flex: 1,
        minWidth: '47%',
        backgroundColor: '#13131E',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#242436',
        borderTopWidth: 3
    },
    metricCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    metricCardLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    metricCardValue: {
        color: '#FAFAFF',
        fontSize: 18,
        fontWeight: '800',
        marginVertical: 2
    },
    metricCardSub: {
        color: '#64748B',
        fontSize: 11
    },
    reconciliationAuditCard: {
        backgroundColor: '#12161E',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1D3028',
        marginBottom: 12
    },
    reconTitle: {
        color: '#FAFAFF',
        fontSize: 14,
        fontWeight: '700'
    },
    reconBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#0B3524',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    reconBadgeText: {
        color: '#34D399',
        fontSize: 10,
        fontWeight: '800'
    },
    equationBox: {
        backgroundColor: '#0C0F17',
        padding: 12,
        borderRadius: 10,
        gap: 6
    },
    equationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    equationLabel: {
        color: '#94A3B8',
        fontSize: 13
    },
    equationVal: {
        color: '#FAFAFF',
        fontSize: 14,
        fontWeight: '700'
    },
    equationOperator: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
        marginVertical: -2
    },
    equationDivider: {
        height: 1,
        backgroundColor: '#272B38',
        marginVertical: 4
    },
    sectionSubtitle: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 6
    },
    stackedBarContainer: {
        height: 24,
        borderRadius: 6,
        flexDirection: 'row',
        overflow: 'hidden',
        marginVertical: 6
    },
    stackedSegment: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4
    },
    stackedSegmentText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700'
    },
    blockCollectionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#181826',
        borderRadius: 8,
        padding: 10,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#262638'
    },
    blockTagBadge: {
        backgroundColor: '#292040',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#6D28D9'
    },
    blockTagText: {
        color: '#C4B5FD',
        fontSize: 12,
        fontWeight: '800'
    },
    blockAmountText: {
        color: '#34D399',
        fontSize: 14,
        fontWeight: '800'
    },
    inflowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#20202F'
    },
    unitPillBadge: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#38BDF8'
    },
    unitPillText: {
        color: '#38BDF8',
        fontSize: 11,
        fontWeight: '800'
    },
    inflowAmount: {
        color: '#FAFAFF',
        fontSize: 13,
        fontWeight: '700'
    },
    totalCollectionsBottom: {
        borderTopWidth: 1,
        borderTopColor: '#2B2B3C',
        paddingTop: 8,
        marginTop: 8
    },
    expenseCategoryCard: {
        backgroundColor: '#141422',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#242436'
    },
    expenseCategoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1C1C2C',
        marginHorizontal: -10,
        marginTop: -10,
        marginBottom: 8,
        padding: 10,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10
    },
    expenseCategoryTitle: {
        fontSize: 13,
        fontWeight: '700'
    },
    pctBadge: {
        backgroundColor: '#0F172A',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4
    },
    pctBadgeText: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700'
    },
    expenseCategoryTotal: {
        fontSize: 14,
        fontWeight: '800'
    },
    expenseItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#1E1E2C'
    },
    expenseItemAmount: {
        color: '#FAFAFF',
        fontSize: 13,
        fontWeight: '700'
    },
    totalExpenditureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#2B2B3C',
        marginTop: 6
    },
    totalExpenditureLabel: {
        color: '#FAFAFF',
        fontSize: 14,
        fontWeight: '700'
    },
    totalExpenditureVal: {
        color: '#F87171',
        fontSize: 16,
        fontWeight: '800'
    },
    fdSummaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12
    },
    fdSummaryCard: {
        width: '48.5%',
        backgroundColor: '#181826',
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#262638'
    },
    fdSummaryLabel: {
        color: '#64748B',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    fdSummaryVal: {
        color: '#FAFAFF',
        fontSize: 14,
        fontWeight: '800',
        marginTop: 2
    },
    bankCertificateCard: {
        backgroundColor: '#131320',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#26263A'
    },
    bankBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1
    },
    bankBadgeText: {
        fontSize: 11,
        fontWeight: '800'
    },
    certNoText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600'
    },
    rateBadge: {
        backgroundColor: '#35250C',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#B45309'
    },
    rateBadgeText: {
        color: '#FBBF24',
        fontSize: 11,
        fontWeight: '800'
    },
    fdDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#202030'
    },
    fdColLabel: {
        color: '#64748B',
        fontSize: 9,
        fontWeight: '800'
    },
    fdColValue: {
        color: '#FAFAFF',
        fontSize: 13,
        fontWeight: '800',
        marginTop: 2
    },
    amcMiniCard: {
        backgroundColor: '#141422',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#262638'
    },
    amcMiniLabel: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    amcMiniVal: {
        color: '#FAFAFF',
        fontSize: 16,
        fontWeight: '800',
        marginTop: 2
    },
    amcPendingCard: {
        backgroundColor: '#261B10',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#B45309'
    },
    pendingFlatChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#38250C',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#F59E0B'
    },
    pendingFlatText: {
        color: '#FBBF24',
        fontSize: 11,
        fontWeight: '800'
    },
    defaulterItemCard: {
        backgroundColor: '#141422',
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#28283C'
    },
    defaulterDueAmount: {
        fontSize: 15,
        fontWeight: '800'
    },
    severityBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4
    },
    severityBadgeText: {
        fontSize: 9,
        fontWeight: '800'
    },
    defaulterBreakdownRow: {
        marginTop: 4,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#202030'
    },
    defaulterBreakdownText: {
        color: '#94A3B8',
        fontSize: 11
    },
    statementBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#1E1B2C',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#6D28D9'
    },
    statementBtnText: {
        color: '#C4B5FD',
        fontSize: 11,
        fontWeight: '700'
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#13131E',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#262638',
        marginBottom: 8
    },
    searchInput: {
        flex: 1,
        color: '#FAFAFF',
        fontSize: 13,
        padding: 0
    },
    filterCategoryLabel: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 4
    },
    filterPillScroll: {
        gap: 6,
        paddingBottom: 4
    },
    unitCard: {
        backgroundColor: '#13131E',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#252538',
        gap: 6
    },
    unitBadgeBox: {
        backgroundColor: '#261F3D',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#6D28D9'
    },
    unitBadgeBoxText: {
        color: '#C4B5FD',
        fontSize: 12,
        fontWeight: '800'
    },
    tenantRow: {
        backgroundColor: '#191928',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 2
    },
    invoiceCard: {
        backgroundColor: '#13131E',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#252538'
    },
    unitDoorBadge: {
        backgroundColor: '#1F1E33',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#4338CA'
    },
    unitDoorText: {
        color: '#A5B4FC',
        fontSize: 12,
        fontWeight: '800'
    },
    ticketCard: {
        backgroundColor: '#13131E',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#252538'
    },
    ticketUpdateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4
    },
    ticketUpdateDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#A78BFA'
    },
    emergencyCard: {
        backgroundColor: '#1E1710',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#B45309',
        marginBottom: 12
    },
    emergencyTitle: {
        color: '#FBBF24',
        fontSize: 13,
        fontWeight: '800'
    },
    emergencyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4
    },
    emergencyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#2D1E12',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#92400E',
        flexGrow: 1
    },
    emergencyBtnText: {
        color: '#FAFAFF',
        fontSize: 12,
        fontWeight: '700'
    },
    pinnedNoticeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#35250C',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#B45309'
    },
    pinnedNoticeBadgeText: {
        color: '#FBBF24',
        fontSize: 10,
        fontWeight: '800'
    },
    metricLabel: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    metricValue: {
        fontWeight: '800',
        marginTop: 2
    }
});