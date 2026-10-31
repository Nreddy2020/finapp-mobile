/**
 * app/(tabs)/validity.js — Validities
 * Documents, licences, insurance, subscriptions, warranties and agreements with
 * derived status, renewal calendar, cost planning and reminders.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, BackHandler } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Screen, Card, Btn, Field, Chip, Empty, useAsyncAction, useMoney, ui, palette, todayLocal } from '../../components/ui/ModuleUI';
import { SummaryTiles, ItemRow, ItemSheet } from '../../components/validity/ValidityKit';
import { ValidityService, summary, sortByUrgency, renewalCalendar, statusOf, VALIDITY_CATEGORIES } from '../../services/validity/validityService';
import { exportToCSV } from '../../services/export';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function ValidityScreen() {
    const router = useRouter();
    const money = useMoney();
    const { busy, error, setError, run } = useAsyncAction();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('action');
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('All');
    const [sheet, setSheet] = useState({ visible: false, item: null });
    const today = todayLocal();

    useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (sheet.visible) { setSheet({ visible: false, item: null }); return true; } if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); return true; }); return () => sub.remove(); }, [sheet.visible, router]);
    const load = useCallback(async () => { setLoading(true); try { setItems(await ValidityService.list('validity')); setError(''); } catch (e) { setError(e.message || 'Documents could not be loaded. Retry.'); } finally { setLoading(false); } }, [setError]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const live = useMemo(() => items.filter(i => !i.archived), [items]);
    const stats = useMemo(() => summary(items, today, 'validity'), [items, today]);
    const visible = useMemo(() => {
        const base = tab === 'archived' ? items.filter(i => i.archived) : live;
        const q = query.trim().toLowerCase();
        return sortByUrgency(base.filter(i => (category === 'All' || i.category === category) && (!q || [i.title, i.holder, i.notes, i.category].some(v => String(v || '').toLowerCase().includes(q))) && (tab !== 'action' || ['expired', 'critical', 'expiring', 'unknown'].includes(statusOf(i, today)))), today);
    }, [items, live, tab, query, category, today]);
    const calendar = useMemo(() => renewalCalendar(live, today, 12), [live, today]);
    const onSaved = rows => setItems(rows.filter(r => r.kind === 'validity'));

    return (
        <ErrorBoundary>
            <Screen title="Validities" subtitle="Nothing important lapses unnoticed." loading={loading} error={error} retry={load}
                tabs={[{ value: 'action', label: `Needs action (${stats.needsAction})` }, { value: 'all', label: 'All' }, { value: 'calendar', label: 'Calendar' }, { value: 'archived', label: 'Archived' }]} tab={tab} onTab={setTab}
                right={<TouchableOpacity accessibilityRole="button" accessibilityLabel="Add document" onPress={() => setSheet({ visible: true, item: null })} style={ui.back}><Plus color="#F4F4F5" size={22} /></TouchableOpacity>}>
                <SummaryTiles summary={stats} kind="validity" />
                {tab !== 'calendar' && <>
                    <Field label="Search" value={query} onChangeText={setQuery} placeholder="Name, holder, category" />
                    <View style={ui.wrap}>{['All', ...VALIDITY_CATEGORIES.filter(c => items.some(i => i.category === c))].map(c => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />)}</View>
                    {!items.length && <Empty title="No documents tracked yet" body="Add your passport, licences, insurance policies, subscriptions and warranties. You will be reminded before each one runs out, with the cost to renew." action="Add first document" onAction={() => setSheet({ visible: true, item: null })} />}
                    {!!items.length && <Card title={tab === 'action' ? 'Act on these' : tab === 'archived' ? 'Archived' : `${visible.length} document${visible.length === 1 ? '' : 's'}`}>
                        {!visible.length && <Text style={ui.muted}>{tab === 'action' ? 'Everything is valid. Nice.' : 'Nothing here.'}</Text>}
                        {visible.map(item => <ItemRow key={item.id} item={item} today={today} onPress={i => setSheet({ visible: true, item: i })} />)}
                    </Card>}
                    {tab === 'all' && !!items.length && <Btn title="Export as CSV" secondary onPress={exportToCSV} />}
                    <Btn title="Track consumables and vouchers in Expiries" secondary onPress={() => router.push('/(tabs)/expiries')} />
                </>}
                {tab === 'calendar' && <>
                    <Text style={ui.muted}>Renewals in the next 12 months with the cash you will need.</Text>
                    {!calendar.length && <Empty title="No dated renewals" body="Add expiry dates to see them here month by month." />}
                    {calendar.map(group => (
                        <Card key={group.key} title={group.label} subtitle={group.cost ? `Renewal cost ${money.format(group.cost)}` : undefined}>
                            {group.items.map(item => <ItemRow key={item.id} item={item} today={today} onPress={i => setSheet({ visible: true, item: i })} />)}
                        </Card>
                    ))}
                </>}
                <ItemSheet visible={sheet.visible} kind="validity" item={sheet.item} onClose={() => setSheet({ visible: false, item: null })} onSaved={onSaved} busy={busy} run={run} error={error} />
            </Screen>
        </ErrorBoundary>
    );
}
