/**
 * components/housing/LeaseManager.js
 * Real lease record: address, landlord, rent, deposit, dates, notice period, escalation.
 * Shows renewal window and notice deadline derived from the saved dates.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Linking } from 'react-native';
import { Sheet, Card, Btn, Field, MoneyField, DateField, Notice, Badge, KeyValue, useAsyncAction, useMoney, ui, palette, todayLocal, confirm } from '../ui/ModuleUI';
import { ApartmentService, leaseStatus } from '../../services/apartment';

const blank = { address: '', landlordName: '', landlordPhone: '', rent: '', deposit: '', startDate: '', endDate: '', noticeDays: '30', rentDueDay: '1', escalationPercent: '0', notes: '' };
export default function LeaseManager({ visible, onClose, lease, onSaved }) {
    const money = useMoney();
    const { busy, error, run } = useAsyncAction();
    const [editing, setEditing] = useState(!lease);
    const [form, setForm] = useState(blank);
    useEffect(() => { if (!visible) return; setEditing(!lease); setForm(lease ? { address: lease.address, landlordName: lease.landlordName, landlordPhone: lease.landlordPhone, rent: String(lease.rent), deposit: String(lease.deposit), startDate: lease.startDate || '', endDate: lease.endDate || '', noticeDays: String(lease.noticeDays), rentDueDay: String(lease.rentDueDay), escalationPercent: String(lease.escalationPercent), notes: lease.notes } : blank); }, [visible, lease]);
    const set = patch => setForm(f => ({ ...f, ...patch }));
    const status = lease ? leaseStatus(lease, todayLocal()) : null;
    const save = () => run(async () => { const doc = await ApartmentService.saveLease(form); onSaved(doc); setEditing(false); });
    const remove = () => confirm('Remove lease', 'Delete the saved lease details?', () => run(async () => { onSaved(await ApartmentService.saveLease(null)); onClose(); }), 'Delete');
    return (
        <Sheet visible={visible} title={editing ? (lease ? 'Edit lease' : 'Add your lease') : 'Lease'} onClose={onClose}>
            <Notice>{error}</Notice>
            {!editing && lease && status && <>
                <View style={ui.row}><Badge text={{ active: 'ACTIVE', 'renewal-window': 'RENEWAL WINDOW', ended: 'ENDED', open: 'OPEN-ENDED' }[status.state]} color={status.state === 'active' ? palette.success : status.state === 'ended' ? palette.danger : palette.warning} /></View>
                <Text style={[ui.text, { fontWeight: '700' }]}>{lease.address}</Text>
                <Card>
                    <KeyValue label="Monthly rent" value={money.format(lease.rent)} />
                    <KeyValue label="Deposit" value={`${money.format(lease.deposit)}${status.depositMonths ? ` (${status.depositMonths} months)` : ''}`} />
                    <KeyValue label="Rent per year" value={money.format(status.yearlyRent)} />
                    {status.nextRentDue && <KeyValue label="Next rent due" value={status.nextRentDue} />}
                    {lease.startDate && <KeyValue label="Started" value={lease.startDate} />}
                    {lease.endDate && <KeyValue label="Ends" value={`${lease.endDate}${status.daysToEnd !== null ? ` (${status.daysToEnd < 0 ? `${-status.daysToEnd} days ago` : `in ${status.daysToEnd} days`})` : ''}`} color={status.state === 'renewal-window' ? palette.warning : undefined} />}
                    {status.noticeBy && <KeyValue label={`Give notice by (${lease.noticeDays} days)`} value={status.noticeBy} color={status.daysToNotice !== null && status.daysToNotice <= 14 ? palette.danger : undefined} />}
                    {status.escalatedRent && <KeyValue label={`Rent after ${lease.escalationPercent}% escalation`} value={money.format(status.escalatedRent)} />}
                    {!!lease.landlordName && <KeyValue label="Landlord" value={`${lease.landlordName}${lease.landlordPhone ? ` · ${lease.landlordPhone}` : ''}`} />}
                    {!!lease.notes && <Text style={ui.muted}>{lease.notes}</Text>}
                </Card>
                {status.state === 'renewal-window' && <Notice warning>Renewal window is open. Decide on renewal terms now; missing the notice date can cost your deposit.</Notice>}
                <View style={ui.row}>
                    {!!lease.landlordPhone && <View style={ui.flex}><Btn title="Call landlord" secondary onPress={() => Linking.openURL(`tel:${lease.landlordPhone}`).catch(() => {})} /></View>}
                    <View style={ui.flex}><Btn title="Edit" secondary onPress={() => setEditing(true)} /></View>
                </View>
                <Btn title="Remove lease" danger onPress={remove} disabled={busy} />
            </>}
            {editing && <>
                <Field label="Address" value={form.address} onChangeText={v => set({ address: v })} placeholder="Flat, building, area" autoFocus={!lease} />
                <View style={ui.row}><View style={ui.flex}><MoneyField label="Monthly rent" value={form.rent} onChangeText={v => set({ rent: v })} /></View><View style={ui.flex}><MoneyField label="Deposit" value={form.deposit} onChangeText={v => set({ deposit: v })} /></View></View>
                <DateField label="Start date" value={form.startDate} onChangeText={v => set({ startDate: v })} quick={false} />
                <DateField label="End date" value={form.endDate} onChangeText={v => set({ endDate: v })} />
                <View style={ui.row}><View style={ui.flex}><Field label="Notice period (days)" numeric value={form.noticeDays} onChangeText={v => set({ noticeDays: v })} /></View><View style={ui.flex}><Field label="Rent due day" numeric value={form.rentDueDay} onChangeText={v => set({ rentDueDay: v })} /></View><View style={ui.flex}><Field label="Yearly increase %" numeric value={form.escalationPercent} onChangeText={v => set({ escalationPercent: v })} /></View></View>
                <View style={ui.row}><View style={ui.flex}><Field label="Landlord name" value={form.landlordName} onChangeText={v => set({ landlordName: v })} /></View><View style={ui.flex}><Field label="Landlord phone" value={form.landlordPhone} onChangeText={v => set({ landlordPhone: v })} keyboardType="phone-pad" /></View></View>
                <Field label="Notes" multiline value={form.notes} onChangeText={v => set({ notes: v })} placeholder="Agreement number, maintenance included, restrictions" />
                <Btn title={busy ? 'Saving…' : 'Save lease'} disabled={busy} onPress={save} />
                {lease && <Btn title="Cancel" secondary onPress={() => setEditing(false)} />}
            </>}
        </Sheet>
    );
}
