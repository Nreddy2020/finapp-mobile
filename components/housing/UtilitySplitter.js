/**
 * components/housing/UtilitySplitter.js
 * Shared bills between flatmates with fair settlement (fewest transfers).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Sheet, Card, Btn, Field, MoneyField, Choice, Chip, Notice, KeyValue, ListItem, useAsyncAction, useMoney, ui, palette, todayLocal } from '../ui/ModuleUI';
import { ApartmentService, settleShared } from '../../services/apartment';

export default function UtilitySplitter({ visible, onClose, home, onSaved }) {
    const money = useMoney();
    const { busy, error, run } = useAsyncAction();
    const [month, setMonth] = useState(todayLocal().slice(0, 7));
    const [newMate, setNewMate] = useState('');
    const [bill, setBill] = useState({ name: '', amount: '', paidBy: '', participants: [] });
    const members = useMemo(() => ['You', ...(home?.flatmates || []).filter(m => m !== 'You')], [home]);
    useEffect(() => { if (visible) setBill(b => ({ ...b, paidBy: b.paidBy || 'You' })); }, [visible]);
    const bills = (home?.sharedBills || []).filter(b => b.month === month);
    const settlement = settleShared(bills, members);
    const shiftMonth = d => { const [y, m] = month.split('-').map(Number); setMonth(new Date(Date.UTC(y, m - 1 + d, 1)).toISOString().slice(0, 7)); };
    return (
        <Sheet visible={visible} title="Shared bills" onClose={onClose}>
            <Notice>{error}</Notice>
            <Card title="Flatmates">
                <View style={ui.wrap}>{members.map(m => <Chip key={m} label={m === 'You' ? 'You' : `${m} ✕`} onPress={() => { if (m !== 'You') run(async () => onSaved(await ApartmentService.setFlatmates(members.filter(x => x !== m && x !== 'You')))); }} accessibilityLabel={m === 'You' ? 'You' : `Remove ${m}`} />)}</View>
                <View style={ui.row}><View style={ui.flex}><Field value={newMate} onChangeText={setNewMate} placeholder="Add flatmate name" /></View><Btn title="Add" secondary disabled={busy || !newMate.trim()} onPress={() => run(async () => { onSaved(await ApartmentService.setFlatmates([...members.filter(x => x !== 'You'), newMate])); setNewMate(''); })} /></View>
            </Card>
            <View style={ui.row}><View style={ui.flex}><Btn title="◀" accessibilityLabel="Previous month" secondary onPress={() => shiftMonth(-1)} /></View><View style={[ui.flex, { flex: 2 }]}><Btn title={month} secondary onPress={() => setMonth(todayLocal().slice(0, 7))} /></View><View style={ui.flex}><Btn title="▶" accessibilityLabel="Next month" secondary onPress={() => shiftMonth(1)} /></View></View>
            <Card title={`Bills · ${month}`} subtitle={`Total ${money.format(settlement.total)} · about ${money.format(settlement.perPerson)} each`}>
                {!bills.length && <Text style={ui.muted}>No shared bills this month.</Text>}
                {bills.map(b => <ListItem key={b.id}><KeyValue label={`${b.name} · paid by ${b.paidBy}${b.participants.length ? ` · split ${b.participants.join(', ')}` : ''}`} value={money.format(b.amount)} /><Chip label="Remove" onPress={() => run(async () => onSaved(await ApartmentService.removeSharedBill(b.id)))} /></ListItem>)}
            </Card>
            {!!settlement.transfers.length && <Card title="Settle up">{settlement.transfers.map((t, i) => <KeyValue key={i} label={`${t.from} pays ${t.to}`} value={money.format(t.amount)} color={palette.warning} />)}</Card>}
            <Card title="Add bill">
                <Field label="Bill" value={bill.name} onChangeText={v => setBill(b => ({ ...b, name: v }))} placeholder="Electricity, WiFi, cook, groceries" />
                <MoneyField label="Amount" value={bill.amount} onChangeText={v => setBill(b => ({ ...b, amount: v }))} />
                <Choice label="Paid by" options={members} value={bill.paidBy} onChange={v => setBill(b => ({ ...b, paidBy: v }))} />
                <Text style={ui.label}>Split between (leave empty for everyone)</Text>
                <View style={ui.wrap}>{members.map(m => <Chip key={m} label={m} active={bill.participants.includes(m)} onPress={() => setBill(b => ({ ...b, participants: b.participants.includes(m) ? b.participants.filter(x => x !== m) : [...b.participants, m] }))} />)}</View>
                <Btn title={busy ? 'Saving…' : 'Add bill'} disabled={busy} onPress={() => run(async () => { onSaved(await ApartmentService.addSharedBill({ ...bill, month })); setBill({ name: '', amount: '', paidBy: 'You', participants: [] }); })} />
            </Card>
        </Sheet>
    );
}
