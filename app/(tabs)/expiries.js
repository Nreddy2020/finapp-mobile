/**
 * app/(tabs)/expiries.js — Expiries
 * Medicines, food, gift cards, vouchers, points, recharges and offers: use them
 * before they expire, and see the money at risk.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, BackHandler } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Screen, Card, Btn, Field, Chip, Empty, useAsyncAction, ui, todayLocal } from '../../components/ui/ModuleUI';
import { SummaryTiles, ItemRow, ItemSheet } from '../../components/validity/ValidityKit';
import { ValidityService, summary, sortByUrgency, statusOf, EXPIRY_CATEGORIES } from '../../services/validity/validityService';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function ExpiriesScreen() {
    const router = useRouter();
    const { busy, error, setError, run } = useAsyncAction();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('soon');
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('All');
    const [sheet, setSheet] = useState({ visible: false, item: null });
    const today = todayLocal();

    useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (sheet.visible) { setSheet({ visible: false, item: null }); return true; } if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); return true; }); return () => sub.remove(); }, [sheet.visible, router]);
    const load = useCallback(async () => { setLoading(true); try { setItems(await ValidityService.list('expiry')); setError(''); } catch (e) { setError(e.message || 'Items could not be loaded. Retry.'); } finally { setLoading(false); } }, [setError]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const stats = useMemo(() => summary(items, today, 'expiry'), [items, today]);
    const visible = useMemo(() => {
        const base = tab === 'archived' ? items.filter(i => i.archived) : items.filter(i => !i.archived);
        const q = query.trim().toLowerCase();
        return sortByUrgency(base.filter(i => (category === 'All' || i.category === category) && (!q || [i.title, i.holder, i.notes, i.category].some(v => String(v || '').toLowerCase().includes(q))) && (tab !== 'soon' || ['expired', 'critical', 'expiring', 'unknown'].includes(statusOf(i, today)))), today);
    }, [items, tab, query, category, today]);

    return (
        <ErrorBoundary>
            <Screen title="Expiries" subtitle="Use it before you lose it." loading={loading} error={error} retry={load}
                tabs={[{ value: 'soon', label: `Use soon (${stats.needsAction})` }, { value: 'all', label: 'All' }, { value: 'archived', label: 'Used / archived' }]} tab={tab} onTab={setTab}
                right={<TouchableOpacity accessibilityRole="button" accessibilityLabel="Add item" onPress={() => setSheet({ visible: true, item: null })} style={ui.back}><Plus color="#F4F4F5" size={22} /></TouchableOpacity>}>
                <SummaryTiles summary={stats} kind="expiry" />
                <Field label="Search" value={query} onChangeText={setQuery} placeholder="Name, category, notes" />
                <View style={ui.wrap}>{['All', ...EXPIRY_CATEGORIES.filter(c => items.some(i => i.category === c))].map(c => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />)}</View>
                {!items.length && <Empty title="Nothing tracked yet" body="Medicines, gift cards, vouchers, loyalty points, prepaid recharges and offers all quietly expire. Track them here and get a nudge in time." action="Add first item" onAction={() => setSheet({ visible: true, item: null })} />}
                {!!items.length && <Card title={tab === 'soon' ? 'Use these first' : tab === 'archived' ? 'Used or archived' : `${visible.length} item${visible.length === 1 ? '' : 's'}`}>
                    {!visible.length && <Text style={ui.muted}>{tab === 'soon' ? 'Nothing expiring soon.' : 'Nothing here.'}</Text>}
                    {visible.map(item => <ItemRow key={item.id} item={item} today={today} onPress={i => setSheet({ visible: true, item: i })} />)}
                </Card>}
                <Btn title="Documents and licences are in Validities" secondary onPress={() => router.push('/(tabs)/validity')} />
                <ItemSheet visible={sheet.visible} kind="expiry" item={sheet.item} onClose={() => setSheet({ visible: false, item: null })} onSaved={rows => setItems(rows.filter(r => r.kind === 'expiry'))} busy={busy} run={run} error={error} />
            </Screen>
        </ErrorBoundary>
    );
}
