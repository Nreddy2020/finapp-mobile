/**
 * app/(tabs)/apartment.js — My Apartment (personal)
 * Society dues you pay, your lease, flatmates and shared bills, rent-vs-buy.
 * Honest empty states; nothing is seeded. Society committees use the Business Hub module.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, BackHandler } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Screen, Card, Btn, Field, MoneyField, DateField, Sheet, Notice, Empty, Badge, Stat, KeyValue, ListItem, Chip, useAsyncAction, useMoney, ui, palette, todayLocal, confirm } from '../../components/ui/ModuleUI';
import RentVsBuy from '../../components/housing/RentVsBuy';
import UtilitySplitter from '../../components/housing/UtilitySplitter';
import LeaseManager from '../../components/housing/LeaseManager';
import { ApartmentService, leaseStatus, settleShared } from '../../services/apartment';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function ApartmentScreen() {
    const router = useRouter();
    const money = useMoney();
    const { busy, error, setError, run } = useAsyncAction();
    const [logs, setLogs] = useState([]);
    const [home, setHome] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRentVsBuy, setShowRentVsBuy] = useState(false);
    const [showUtility, setShowUtility] = useState(false);
    const [showLease, setShowLease] = useState(false);
    const [showAddLog, setShowAddLog] = useState(false);
    const [form, setForm] = useState({ month: MONTHS[new Date().getMonth()], year: String(new Date().getFullYear()), amount: '', due_date: '' });
    const today = todayLocal();

    const handleBack = useCallback(() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }, [router]);
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (showRentVsBuy) { setShowRentVsBuy(false); return true; }
            if (showUtility) { setShowUtility(false); return true; }
            if (showLease) { setShowLease(false); return true; }
            if (showAddLog) { setShowAddLog(false); return true; }
            handleBack(); return true;
        });
        return () => sub.remove();
    }, [showRentVsBuy, showUtility, showLease, showAddLog, handleBack]);

    const load = useCallback(async () => { setLoading(true); try { const [l, h] = await Promise.all([ApartmentService.getMaintenanceLogs(), ApartmentService.getHome()]); setLogs(l); setHome(h); setError(''); } catch (e) { setError(e.message || 'Could not load. Retry.'); } finally { setLoading(false); } }, [setError]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const totalUnpaid = logs.filter(m => m.status === 'pending').reduce((sum, m) => sum + Number(m.amount || 0), 0);
    const overdue = logs.filter(m => m.status === 'pending' && m.due_date && m.due_date < today);
    const lease = home?.lease || null;
    const ls = useMemo(() => (lease ? leaseStatus(lease, today) : null), [lease, today]);
    const month = today.slice(0, 7);
    const shared = useMemo(() => (home ? settleShared(home.sharedBills.filter(b => b.month === month), ['You', ...(home.flatmates || [])]) : null), [home, month]);
    const monthlyHousing = (lease?.rent || 0) + (logs.find(m => m.status === 'pending') ? Number(logs[0]?.amount || 0) : 0) + (shared ? shared.perPerson : 0);

    const addLog = () => run(async () => { setLogs(await ApartmentService.addMaintenanceLog({ ...form, status: 'pending' })); setShowAddLog(false); setForm(f => ({ ...f, amount: '', due_date: '' })); });

    return (
        <Screen title="My Apartment" subtitle="Rent, dues, flatmates and the roof over your head." onBack={handleBack} loading={loading} error={error} retry={load}
            right={<TouchableOpacity accessibilityRole="button" accessibilityLabel="Record society dues" onPress={() => setShowAddLog(true)} style={ui.back}><Plus color="#F4F4F5" size={22} /></TouchableOpacity>}>
            <View style={ui.wrap}>
                <Stat label="Dues pending" value={money.format(totalUnpaid)} color={totalUnpaid ? palette.warning : palette.success} />
                <Stat label="Rent" value={lease ? money.format(lease.rent) : '—'} />
                <Stat label="Shared bills, my share" value={shared ? money.format(shared.perPerson) : '—'} />
            </View>
            {!!overdue.length && <Notice warning>{`${overdue.length} society due${overdue.length === 1 ? ' is' : 's are'} past the due date.`}</Notice>}
            <View style={ui.row}>
                <View style={ui.flex}><Btn title="Rent vs buy" secondary onPress={() => setShowRentVsBuy(true)} /></View>
                <View style={ui.flex}><Btn title="Shared bills" secondary onPress={() => setShowUtility(true)} /></View>
                <View style={ui.flex}><Btn title={lease ? 'Lease' : 'Add lease'} secondary onPress={() => setShowLease(true)} /></View>
            </View>
            {lease && ls && <Card title="Lease" subtitle={lease.address}>
                <View style={ui.row}><Badge text={{ active: 'ACTIVE', 'renewal-window': 'RENEWAL WINDOW', ended: 'ENDED', open: 'OPEN-ENDED' }[ls.state]} color={ls.state === 'active' ? palette.success : ls.state === 'ended' ? palette.danger : palette.warning} /></View>
                {ls.nextRentDue && <KeyValue label="Next rent due" value={ls.nextRentDue} />}
                {lease.endDate && <KeyValue label="Ends" value={`${lease.endDate}${ls.daysToEnd !== null && ls.daysToEnd >= 0 ? ` · in ${ls.daysToEnd} days` : ''}`} />}
                {ls.noticeBy && <KeyValue label="Give notice by" value={ls.noticeBy} color={ls.daysToNotice !== null && ls.daysToNotice <= 14 ? palette.danger : undefined} />}
                <KeyValue label="Deposit held" value={money.format(lease.deposit)} />
            </Card>}
            {monthlyHousing > 0 && <Card title="What home costs you"><KeyValue label="Per month (rent + dues + shared bills)" value={money.format(monthlyHousing)} /><KeyValue label="Per year" value={money.format(monthlyHousing * 12)} /><Text style={ui.muted}>A common rule: keep housing under 30–35% of take-home pay.</Text></Card>}
            <Card title="Society dues">
                {!logs.length && <Empty title="No dues recorded" body="Log each month's maintenance so you can see what is pending and what you paid over the year." action="Record dues" onAction={() => setShowAddLog(true)} />}
                {logs.map(m => (
                    <ListItem key={m.id}>
                        <View style={[ui.row, { justifyContent: 'space-between' }]}>
                            <View style={ui.flex}><Text style={[ui.text, { fontWeight: '700' }]}>{m.month} {m.year}</Text><Text style={ui.muted}>{m.due_date ? `Due ${m.due_date}` : 'No due date'}{m.paid_date ? ` · paid ${m.paid_date}` : ''}</Text></View>
                            <View style={{ alignItems: 'flex-end', gap: 6 }}><Text style={[ui.text, { fontWeight: '800' }]}>{money.format(m.amount)}</Text><Badge text={String(m.status || 'pending').toUpperCase()} color={m.status === 'paid' ? palette.success : palette.warning} /></View>
                        </View>
                        <View style={ui.wrap}>
                            {m.status === 'pending' ? <Chip label="Mark paid" onPress={() => run(async () => setLogs(await ApartmentService.updateLogStatus(m.id, 'paid')))} /> : <Chip label="Mark unpaid" onPress={() => run(async () => setLogs(await ApartmentService.updateLogStatus(m.id, 'pending')))} />}
                            <Chip label="Delete" onPress={() => confirm('Delete entry', `Remove ${m.month} ${m.year}?`, () => run(async () => setLogs(await ApartmentService.removeLog(m.id))), 'Delete')} />
                        </View>
                    </ListItem>
                ))}
            </Card>
            <Btn title="Manage a society as a committee (Business Hub)" secondary onPress={() => router.push('/business/apartment')} />

            <Sheet visible={showAddLog} title="Record society dues" onClose={() => setShowAddLog(false)}>
                <Notice>{error}</Notice>
                <Text style={ui.label}>Month</Text>
                <View style={ui.wrap}>{MONTHS.map(mo => <Chip key={mo} label={mo.slice(0, 3)} active={form.month === mo} onPress={() => setForm(f => ({ ...f, month: mo }))} />)}</View>
                <Field label="Year" numeric value={form.year} onChangeText={v => setForm(f => ({ ...f, year: v }))} />
                <MoneyField label="Amount" value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} />
                <DateField label="Due date" value={form.due_date} onChangeText={v => setForm(f => ({ ...f, due_date: v }))} />
                <Btn title={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={addLog} />
            </Sheet>
            <RentVsBuy visible={showRentVsBuy} onClose={() => setShowRentVsBuy(false)} />
            <UtilitySplitter visible={showUtility} onClose={() => setShowUtility(false)} home={home} onSaved={setHome} />
            <LeaseManager visible={showLease} onClose={() => setShowLease(false)} lease={lease} onSaved={setHome} />
        </Screen>
    );
}
