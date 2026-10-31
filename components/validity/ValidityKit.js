/**
 * components/validity/ValidityKit.js
 * Shared UI for Validities (documents) and Expiries (consumables): item rows,
 * summary tiles, and the add / edit / renew sheet.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, Switch } from 'react-native';
import { Card, Btn, Field, MoneyField, DateField, Choice, Chip, Sheet, Notice, Badge, Stat, KeyValue, ListItem, useMoney, ui, palette, todayLocal, confirm } from '../ui/ModuleUI';
import { ValidityService, statusOf, statusLabel, STATUS_COLORS, VALIDITY_CATEGORIES, EXPIRY_CATEGORIES, LAPSE_GUIDANCE, reminderDates } from '../../services/validity/validityService';
import { addExpiryToCalendar } from '../../services/calendar';
import { ReminderScheduler } from '../../services/notificationService';

export function SummaryTiles({ summary, kind }) {
    const money = useMoney();
    return (
        <View style={ui.wrap}>
            <Stat label="Needs action" value={String(summary.needsAction)} color={summary.needsAction ? palette.warning : palette.success} />
            <Stat label="Expired" value={String(summary.expired)} color={summary.expired ? palette.danger : undefined} />
            {kind === 'validity' ? <Stat label="Renewals, 90 days" value={money.format(summary.renewalCost90)} /> : <Stat label="Value at risk, 30d" value={money.format(summary.valueAtRisk)} color={summary.valueAtRisk ? palette.warning : undefined} />}
        </View>
    );
}

export function ItemRow({ item, today, onPress }) {
    const money = useMoney();
    const status = statusOf(item, today);
    return (
        <ListItem>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${item.title}, ${statusLabel(item, today)}`} onPress={() => onPress(item)} style={[ui.row, { alignItems: 'flex-start' }]}>
                <View style={{ width: 10, height: 44, borderRadius: 5, backgroundColor: STATUS_COLORS[status] }} />
                <View style={ui.flex}>
                    <Text style={[ui.text, { fontWeight: '700' }]}>{item.title}</Text>
                    <Text style={ui.muted}>{[item.category, item.holder, item.expiryDate || item.expiryText || 'no date', item.renewalCost ? `renew ${money.format(item.renewalCost)}` : null, item.kind === 'expiry' && item.quantity != null ? `qty ${item.quantity}` : null, item.kind === 'expiry' && item.value ? `worth ${money.format(item.value)}` : null].filter(Boolean).join(' · ')}</Text>
                </View>
                <Badge text={statusLabel(item, today)} color={STATUS_COLORS[status]} />
            </TouchableOpacity>
        </ListItem>
    );
}

const blank = kind => ({ title: '', category: kind === 'expiry' ? 'Medicine' : 'Passport', issueDate: '', expiryDate: '', renewalCost: '', renewalLeadDays: '30', autoRenew: false, holder: '', identifier: '', notes: '', quantity: '', value: '', image: null });

/** Add / edit / renew sheet. `item` null means create. */
export function ItemSheet({ visible, kind, item, onClose, onSaved, busy, run, error }) {
    const money = useMoney();
    const [form, setForm] = useState(blank(kind));
    const [mode, setMode] = useState('view'); // view | edit | renew
    const [renew, setRenew] = useState({ newExpiryDate: '', cost: '', note: '' });
    const today = todayLocal();
    useEffect(() => {
        if (!visible) return;
        if (item) { setForm({ title: item.title, category: item.category, issueDate: item.issueDate || '', expiryDate: item.expiryDate || '', renewalCost: item.renewalCost != null ? String(item.renewalCost) : '', renewalLeadDays: String(item.renewalLeadDays ?? 30), autoRenew: !!item.autoRenew, holder: item.holder || '', identifier: item.identifier || '', notes: item.notes || '', quantity: item.quantity != null ? String(item.quantity) : '', value: item.value != null ? String(item.value) : '', image: item.image || null }); setMode('view'); }
        else { setForm(blank(kind)); setMode('edit'); }
        setRenew({ newExpiryDate: '', cost: '', note: '' });
    }, [visible, item, kind]);
    const set = patch => setForm(f => ({ ...f, ...patch }));
    const categories = kind === 'expiry' ? EXPIRY_CATEGORIES : VALIDITY_CATEGORIES;
    const pickImage = async () => {
        try {
            const ImagePicker = await import('expo-image-picker').catch(() => null);
            if (!ImagePicker) { Alert.alert('Photos unavailable', 'Photo attachments need the image picker module on this build.'); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
            if (!result.canceled) set({ image: result.assets[0].uri });
        } catch { Alert.alert('Could not open photos'); }
    };
    const payload = () => ({ kind, title: form.title, category: form.category, issueDate: form.issueDate || null, expiryDate: form.expiryDate || null, renewalCost: form.renewalCost === '' ? null : form.renewalCost, renewalLeadDays: Number(form.renewalLeadDays || 30), autoRenew: form.autoRenew, holder: form.holder, identifier: form.identifier, notes: form.notes, image: form.image, quantity: kind === 'expiry' ? (form.quantity === '' ? null : Number(form.quantity)) : undefined, value: kind === 'expiry' ? (form.value === '' ? null : form.value) : undefined });
    const save = () => run(async () => {
        const rows = item ? await ValidityService.update(item.id, payload()) : await ValidityService.add(payload());
        const saved = item ? rows.find(r => r.id === item.id) : rows[0];
        await ReminderScheduler.syncItem(saved).catch(() => {});
        onSaved(rows); onClose();
    });
    const doRenew = () => run(async () => { const rows = await ValidityService.renew(item.id, renew); await ReminderScheduler.syncItem(rows.find(r => r.id === item.id)).catch(() => {}); onSaved(rows); onClose(); });
    const remove = () => confirm('Delete', `Remove "${item.title}" permanently?`, () => run(async () => { await ReminderScheduler.cancelItem(item.id).catch(() => {}); onSaved(await ValidityService.remove(item.id)); onClose(); }), 'Delete');
    const archive = () => run(async () => { onSaved(await ValidityService.setArchived(item.id, !item.archived)); onClose(); });
    const consume = () => run(async () => { onSaved(await ValidityService.consume(item.id, 1)); onClose(); });
    const status = item ? statusOf(item, today) : null;
    return (
        <Sheet visible={visible} title={!item ? (kind === 'expiry' ? 'Track something that expires' : 'Add document') : mode === 'renew' ? `Renew ${item.title}` : item.title} onClose={onClose}>
            <Notice>{error}</Notice>
            {item && mode === 'view' && <>
                <View style={ui.row}><Badge text={statusLabel(item, today)} color={STATUS_COLORS[status]} /><Badge text={item.category} color={palette.info} /></View>
                {!!item.image && <Image accessibilityLabel={`${item.title} photo`} source={{ uri: item.image }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" />}
                <Card>
                    {!!item.holder && <KeyValue label="Holder" value={item.holder} />}
                    <KeyValue label="Expires" value={item.expiryDate || item.expiryText || 'Not set'} />
                    {!!item.issueDate && <KeyValue label="Issued" value={item.issueDate} />}
                    {item.renewalCost != null && <KeyValue label="Renewal cost" value={money.format(item.renewalCost)} />}
                    {!!item.identifier && <KeyValue label="Number" value={item.identifier} />}
                    {kind === 'expiry' && item.quantity != null && <KeyValue label="Quantity left" value={String(item.quantity)} />}
                    {kind === 'expiry' && item.value != null && <KeyValue label="Value" value={money.format(item.value)} />}
                    <KeyValue label="Reminders" value={`${item.renewalLeadDays} days before, then 7, 1, 0`} />
                    {item.autoRenew && <KeyValue label="Auto-renews" value="Yes — check the charge" color={palette.warning} />}
                    {!!item.notes && <Text style={ui.text}>{item.notes}</Text>}
                </Card>
                {!!LAPSE_GUIDANCE[item.category] && <Notice warning>{`If this lapses: ${LAPSE_GUIDANCE[item.category]}`}</Notice>}
                {!!item.history.length && <Card title="Renewal history">{item.history.map(h => <KeyValue key={h.id} label={`${h.date}: ${h.previousExpiry || '—'} → ${h.newExpiry}`} value={h.cost != null ? money.format(h.cost) : ''} />)}</Card>}
                {!!item.expiryDate && !!reminderDates(item, today).length && <Text style={ui.muted}>Next reminders: {reminderDates(item, today).map(r => r.date).join(', ')}</Text>}
                <View style={ui.row}>
                    {kind === 'validity' ? <View style={ui.flex}><Btn title="Renewed" onPress={() => setMode('renew')} /></View> : <View style={ui.flex}><Btn title="Used one" onPress={consume} disabled={busy} /></View>}
                    <View style={ui.flex}><Btn title="Edit" secondary onPress={() => setMode('edit')} /></View>
                </View>
                <View style={ui.row}>
                    {!!item.expiryDate && <View style={ui.flex}><Btn title="Add to calendar" secondary onPress={() => addExpiryToCalendar({ item: item.title, expiry_date: item.expiryDate, category: item.category })} /></View>}
                    <View style={ui.flex}><Btn title={item.archived ? 'Unarchive' : 'Archive'} secondary onPress={archive} disabled={busy} /></View>
                </View>
                <Btn title="Delete" danger onPress={remove} disabled={busy} />
            </>}
            {mode === 'renew' && item && <>
                <DateField label="New expiry date" value={renew.newExpiryDate} onChangeText={v => setRenew(r => ({ ...r, newExpiryDate: v }))} />
                <MoneyField label="Amount paid" value={renew.cost} onChangeText={v => setRenew(r => ({ ...r, cost: v }))} />
                <Field label="Note" value={renew.note} onChangeText={v => setRenew(r => ({ ...r, note: v }))} placeholder="Where, reference number" />
                <Btn title={busy ? 'Saving…' : 'Save renewal'} disabled={busy} onPress={doRenew} />
                <Btn title="Back" secondary onPress={() => setMode('view')} />
            </>}
            {mode === 'edit' && <>
                <Field label={kind === 'expiry' ? 'What is it' : 'Document name'} value={form.title} onChangeText={v => set({ title: v })} placeholder={kind === 'expiry' ? 'e.g. Amazon gift card' : 'e.g. Passport, Car insurance'} autoFocus={!item} />
                <Choice label="Category" options={categories} value={form.category} onChange={v => set({ category: v })} />
                <DateField label="Expiry date" value={form.expiryDate} onChangeText={v => set({ expiryDate: v })} />
                {kind === 'validity' && <DateField label="Issue date" value={form.issueDate} onChangeText={v => set({ issueDate: v })} quick={false} />}
                <Field label="Whose is it" value={form.holder} onChangeText={v => set({ holder: v })} placeholder="Me, spouse, parent, child" />
                {kind === 'validity' && <>
                    <MoneyField label="Renewal cost" value={form.renewalCost} onChangeText={v => set({ renewalCost: v })} hint="Helps plan cash for renewals." />
                    <Field label="Document number" value={form.identifier} onChangeText={v => set({ identifier: v })} placeholder="Only the last 4 digits are kept" autoCapitalize="none" />
                    <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.text}>Auto-renews from my account</Text><Switch accessibilityLabel="Auto-renews" value={form.autoRenew} onValueChange={v => set({ autoRenew: v })} trackColor={{ false: '#3F3F46', true: palette.primary }} thumbColor="#FFF" /></View>
                </>}
                {kind === 'expiry' && <View style={ui.row}>
                    <View style={ui.flex}><Field label="Quantity" numeric value={form.quantity} onChangeText={v => set({ quantity: v })} placeholder="e.g. 10" /></View>
                    <View style={ui.flex}><MoneyField label="Value" value={form.value} onChangeText={v => set({ value: v })} /></View>
                </View>}
                <Field label="Remind me this many days before" numeric value={form.renewalLeadDays} onChangeText={v => set({ renewalLeadDays: v })} />
                <Field label="Notes" multiline value={form.notes} onChangeText={v => set({ notes: v })} placeholder="Provider, phone number, where the original is kept" />
                <View style={ui.row}>
                    <View style={ui.flex}><Btn title={form.image ? 'Change photo' : 'Attach photo'} secondary onPress={pickImage} /></View>
                    {!!form.image && <Chip label="Remove photo" onPress={() => set({ image: null })} />}
                </View>
                <Btn title={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={save} />
                {item && <Btn title="Cancel" secondary onPress={() => setMode('view')} />}
            </>}
        </Sheet>
    );
}
