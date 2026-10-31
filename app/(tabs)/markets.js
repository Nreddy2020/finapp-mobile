/**
 * app/(tabs)/markets.js — Markets (Decision Intelligence)
 * Watchlist with your own prices, alerts, concentration and sentiment from your list,
 * honest calculators (SIP, lump sum, required SIP, FD, RD, inflation) and a leverage guard.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, BackHandler } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Screen, Card, Btn, Field, MoneyField, DateField, Choice, Chip, Sheet, Notice, Empty, Badge, Stat, KeyValue, ListItem, useAsyncAction, useMoney, ui, palette, todayLocal, confirm } from '../../components/ui/ModuleUI';
import { MarketsService, positionSummary, concentration, sentiment, evaluateAlerts, sipFutureValue, lumpsumFutureValue, requiredSip, fdMaturity, rdMaturity, inflationAdjusted, realReturn, leverageLoss, INSTRUMENT_TYPES, RISK_PROFILES } from '../../services/intelligence/marketsService';

const TABS = [{ value: 'watchlist', label: 'Watchlist' }, { value: 'alerts', label: 'Alerts' }, { value: 'calculators', label: 'Calculators' }, { value: 'leverage', label: 'Leverage guard' }];

export default function MarketsScreen() {
    const router = useRouter();
    const { tab: initial } = useLocalSearchParams();
    const money = useMoney();
    const { busy, error, setError, run } = useAsyncAction();
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(initial === 'leverage' ? 'leverage' : 'watchlist');
    const [sheet, setSheet] = useState(null);
    const [calc, setCalc] = useState('sip');
    const [c, setC] = useState({ monthly: '5000', amount: '100000', rate: '12', years: '10', target: '1000000', fdRate: '7', inflation: '6' });
    const [lev, setLev] = useState({ collateral: '10000', leverage: '10', move: '-5' });

    useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (sheet) { setSheet(null); return true; } if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); return true; }); return () => sub.remove(); }, [sheet, router]);
    const load = useCallback(async () => { setLoading(true); try { await MarketsService.checkAlerts().catch(() => []); setDoc(await MarketsService.load()); setError(''); } catch (e) { setError(e.message || 'Market data could not be loaded. Retry.'); } finally { setLoading(false); } }, [setError]);
    useFocusEffect(useCallback(() => { load(); }, [load]));
    const act = fn => run(async () => setDoc(await fn()));
    const open = (kind, form, id = null) => { setError(''); setSheet({ kind, form, id }); };
    const setF = patch => setSheet(s => ({ ...s, form: { ...s.form, ...patch } }));
    const conc = useMemo(() => (doc ? concentration(doc.watchlist) : null), [doc]);
    const mood = useMemo(() => (doc ? sentiment(doc.watchlist) : null), [doc]);
    const triggered = useMemo(() => (doc ? evaluateAlerts(doc) : []), [doc]);
    const safe = fn => { try { return fn(); } catch (e) { return { error: e.message }; } };
    const results = {
        sip: safe(() => sipFutureValue({ monthly: c.monthly, annualRatePct: c.rate, years: c.years })),
        lumpsum: safe(() => lumpsumFutureValue({ amount: c.amount, annualRatePct: c.rate, years: c.years })),
        required: safe(() => requiredSip({ target: c.target, annualRatePct: c.rate, years: c.years })),
        fd: safe(() => fdMaturity({ principal: c.amount, annualRatePct: c.fdRate, years: c.years })),
        rd: safe(() => rdMaturity({ monthly: c.monthly, annualRatePct: c.fdRate, years: c.years })),
        inflation: safe(() => inflationAdjusted({ amount: c.amount, years: c.years, inflationPct: c.inflation }))
    };
    const levResult = safe(() => leverageLoss({ collateral: lev.collateral, leverage: lev.leverage, movePct: lev.move }));
    const submit = () => run(async () => {
        const f = sheet.form; let next;
        if (sheet.kind === 'watch') next = sheet.id ? await MarketsService.updateWatch(sheet.id, f) : await MarketsService.addWatch(f);
        if (sheet.kind === 'price') next = await MarketsService.setPrice(sheet.id, f.price, f.date);
        if (sheet.kind === 'alert') next = await MarketsService.addAlert(f);
        setDoc(next); setSheet(null);
    });

    return (
        <Screen title="Markets" subtitle="Track what you own, plan with real maths, avoid the traps." loading={loading} error={error} retry={load} tabs={TABS} tab={tab} onTab={setTab}
            right={tab === 'watchlist' ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add to watchlist" onPress={() => open('watch', { symbol: '', name: '', type: 'stock', quantity: '', buyPrice: '', price: '', notes: '' })} style={ui.back}><Plus color="#F4F4F5" size={22} /></TouchableOpacity> : tab === 'alerts' && doc?.watchlist.length ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add alert" onPress={() => open('alert', { watchId: doc.watchlist[0].id, direction: 'below', price: '' })} style={ui.back}><Plus color="#F4F4F5" size={22} /></TouchableOpacity> : null}>
            {doc && tab === 'watchlist' && <>
                {!!triggered.length && <Notice warning>{`Alert${triggered.length === 1 ? '' : 's'} hit: ${triggered.map(t => `${t.item.symbol} ${t.alert.direction} ${money.format(t.alert.price)}`).join(', ')}.`}</Notice>}
                {mood && <Card title={`Your list feels: ${mood.label}`} subtitle={mood.breadth}><Text style={ui.text}>{mood.advice}</Text></Card>}
                {conc && conc.total > 0 && <Card title="Concentration"><KeyValue label="Tracked value" value={money.format(conc.total)} />{conc.top && <KeyValue label="Largest position" value={`${conc.top.name} · ${conc.topShare}%`} color={conc.topShare > 40 ? palette.warning : undefined} />}{conc.byType.map(t => <KeyValue key={t.type} label={t.type} value={`${t.share}%`} />)}{conc.warning && <Notice warning>{conc.warning}</Notice>}</Card>}
                {!doc.watchlist.length && <Empty title="Nothing tracked yet" body="Add the funds, stocks, gold or deposits you hold or follow. Prices are yours to enter; nothing is fetched from the internet." action="Add first item" onAction={() => open('watch', { symbol: '', name: '', type: 'stock', quantity: '', buyPrice: '', price: '', notes: '' })} />}
                {doc.watchlist.map(w => { const p = positionSummary(w); return (
                    <Card key={w.id} title={`${w.symbol}${w.name ? ` · ${w.name}` : ''}`} subtitle={[w.type, w.priceUpdatedAt ? `price ${money.format(w.price)} on ${w.priceUpdatedAt.slice(0, 10)}` : 'no price yet'].join(' · ')}>
                        {p.value > 0 && <View style={ui.wrap}><Stat label="Value" value={money.format(p.value)} /><Stat label="P&L" value={`${money.format(p.pnl)}${p.pnlPct !== null ? ` (${p.pnlPct}%)` : ''}`} color={p.pnl >= 0 ? palette.success : palette.danger} />{p.dayChangePct !== null && <Stat label="Since last price" value={`${p.dayChangePct}%`} color={p.dayChangePct >= 0 ? palette.success : palette.danger} />}</View>}
                        <View style={ui.wrap}>
                            <Chip label="Update price" onPress={() => open('price', { price: w.price != null ? String(w.price) : '', date: todayLocal() }, w.id)} />
                            <Chip label="Edit" onPress={() => open('watch', { name: w.name, type: w.type, quantity: w.quantity != null ? String(w.quantity) : '', buyPrice: w.buyPrice != null ? String(w.buyPrice) : '', notes: w.notes }, w.id)} />
                            <Chip label="Alert" onPress={() => open('alert', { watchId: w.id, direction: 'below', price: w.price != null ? String(w.price) : '' })} />
                            <Chip label="Remove" onPress={() => confirm('Remove', `Remove ${w.symbol} and its alerts?`, () => act(() => MarketsService.removeWatch(w.id)), 'Remove')} />
                        </View>
                    </Card>
                ); })}
                <Card title="Risk profile"><Choice options={RISK_PROFILES} value={doc.settings.riskProfile} onChange={v => act(() => MarketsService.updateSettings({ riskProfile: v }))} /><Text style={ui.muted}>{{ conservative: 'Capital safety first: deposits, short bonds, small equity slice.', balanced: 'Growth with a cushion: roughly 50–60% equity, rest in safer assets.', aggressive: 'Long horizon, high equity. Only with a full emergency fund.' }[doc.settings.riskProfile]}</Text></Card>
            </>}

            {doc && tab === 'alerts' && <>
                {!doc.alerts.length && <Empty title="No alerts" body="Get told when an item you track crosses a price you set. Alerts check when you update prices." action={doc.watchlist.length ? 'Add alert' : 'Add watchlist item first'} onAction={() => (doc.watchlist.length ? open('alert', { watchId: doc.watchlist[0].id, direction: 'below', price: '' }) : setTab('watchlist'))} />}
                {doc.alerts.map(a => { const item = doc.watchlist.find(w => w.id === a.watchId); return (
                    <ListItem key={a.id}><View style={[ui.row, { justifyContent: 'space-between' }]}><View style={ui.flex}><Text style={[ui.text, { fontWeight: '700' }]}>{item?.symbol || 'Removed'} {a.direction} {money.format(a.price)}</Text><Text style={ui.muted}>{a.triggeredAt ? `Hit on ${a.triggeredAt.slice(0, 10)}` : a.active ? 'Watching' : 'Paused'}</Text></View>{a.triggeredAt && <Badge text="HIT" color={palette.warning} />}</View><View style={ui.wrap}><Chip label={a.active ? 'Pause' : 'Resume'} onPress={() => act(() => MarketsService.toggleAlert(a.id))} /><Chip label="Delete" onPress={() => act(() => MarketsService.removeAlert(a.id))} /></View></ListItem>
                ); })}
            </>}

            {tab === 'calculators' && <>
                <View style={ui.wrap}>{[['sip', 'SIP'], ['lumpsum', 'Lump sum'], ['required', 'Required SIP'], ['fd', 'Fixed deposit'], ['rd', 'Recurring deposit'], ['inflation', 'Inflation']].map(([v, l]) => <Chip key={v} label={l} active={calc === v} onPress={() => setCalc(v)} />)}</View>
                <Card title={{ sip: 'Monthly investing (SIP)', lumpsum: 'One-time investment', required: 'Monthly amount for a target', fd: 'Fixed deposit', rd: 'Recurring deposit', inflation: 'What inflation does' }[calc]}>
                    {['sip', 'rd'].includes(calc) && <MoneyField label="Monthly amount" value={c.monthly} onChangeText={v => setC(s => ({ ...s, monthly: v }))} />}
                    {['lumpsum', 'fd', 'inflation'].includes(calc) && <MoneyField label="Amount" value={c.amount} onChangeText={v => setC(s => ({ ...s, amount: v }))} />}
                    {calc === 'required' && <MoneyField label="Target" value={c.target} onChangeText={v => setC(s => ({ ...s, target: v }))} />}
                    <View style={ui.row}>
                        {['sip', 'lumpsum', 'required'].includes(calc) && <View style={ui.flex}><Field label="Expected return % / yr" numeric value={c.rate} onChangeText={v => setC(s => ({ ...s, rate: v }))} /></View>}
                        {['fd', 'rd'].includes(calc) && <View style={ui.flex}><Field label="Interest % / yr" numeric value={c.fdRate} onChangeText={v => setC(s => ({ ...s, fdRate: v }))} /></View>}
                        {calc === 'inflation' && <View style={ui.flex}><Field label="Inflation % / yr" numeric value={c.inflation} onChangeText={v => setC(s => ({ ...s, inflation: v }))} /></View>}
                        <View style={ui.flex}><Field label="Years" numeric value={c.years} onChangeText={v => setC(s => ({ ...s, years: v }))} /></View>
                    </View>
                    {results[calc].error ? <Notice>{results[calc].error}</Notice> : <>
                        {calc === 'sip' && <><KeyValue label="You invest" value={money.format(results.sip.invested)} /><KeyValue label="Grows to" value={money.format(results.sip.value)} color={palette.success} /><KeyValue label="Gain" value={money.format(results.sip.gain)} /></>}
                        {calc === 'lumpsum' && <><KeyValue label="Grows to" value={money.format(results.lumpsum.value)} color={palette.success} /><KeyValue label="Gain" value={money.format(results.lumpsum.gain)} />{results.lumpsum.doublingYears && <KeyValue label="Doubles every" value={`${results.lumpsum.doublingYears} years`} />}</>}
                        {calc === 'required' && <><KeyValue label="Invest per month" value={money.format(results.required.monthly)} color={palette.success} /><KeyValue label="Total invested" value={money.format(results.required.invested)} /></>}
                        {calc === 'fd' && <><KeyValue label="Maturity" value={money.format(results.fd.maturity)} color={palette.success} /><KeyValue label="Interest" value={money.format(results.fd.interest)} /><KeyValue label="Real return after inflation" value={`${realReturn(c.fdRate, c.inflation)}%`} /></>}
                        {calc === 'rd' && <><KeyValue label="You deposit" value={money.format(results.rd.invested)} /><KeyValue label="Maturity" value={money.format(results.rd.maturity)} color={palette.success} /></>}
                        {calc === 'inflation' && <><KeyValue label={`Same things cost, in ${c.years} years`} value={money.format(results.inflation.futureCost)} color={palette.warning} /><KeyValue label="What this money buys then" value={money.format(results.inflation.purchasingPowerOfSameMoney)} /><Text style={ui.muted}>Money kept idle loses buying power. Returns must beat inflation to grow in real terms.</Text></>}
                    </>}
                </Card>
                <Btn title="Turn a target into a goal" secondary onPress={() => router.push({ pathname: '/(tabs)/todos', params: { tab: 'goals' } })} />
            </>}

            {tab === 'leverage' && <>
                <Card title="Leverage guard" subtitle="See how fast borrowed exposure wipes out margin.">
                    <MoneyField label="Your margin / collateral" value={lev.collateral} onChangeText={v => setLev(l => ({ ...l, collateral: v }))} />
                    <View style={ui.row}><View style={ui.flex}><Field label="Leverage (x)" numeric value={lev.leverage} onChangeText={v => setLev(l => ({ ...l, leverage: v }))} /></View><View style={ui.flex}><Field label="Market move %" numeric value={lev.move} onChangeText={v => setLev(l => ({ ...l, move: v }))} /></View></View>
                    {levResult.error ? <Notice>{levResult.error}</Notice> : <>
                        <KeyValue label="Loss" value={money.format(levResult.loss)} color={palette.danger} />
                        <KeyValue label="Remaining" value={money.format(levResult.remaining)} />
                        <KeyValue label="Wiped out by a move of" value={`${levResult.liquidationMovePct}%`} color={palette.warning} />
                        {levResult.liquidated && <Notice>Total collateral liquidated at this move. A normal bad week does this at 10x or more.</Notice>}
                    </>}
                    <Text style={ui.muted}>Derivatives and margin trading are how most retail traders lose money. Nothing here recommends them.</Text>
                </Card>
            </>}

            <Sheet visible={!!sheet} title={sheet ? ({ watch: sheet.id ? 'Edit item' : 'Add to watchlist', price: 'Update price', alert: 'New price alert' })[sheet.kind] : ''} onClose={() => setSheet(null)}>
                {sheet && <>
                    <Notice>{error}</Notice>
                    {sheet.kind === 'watch' && <>
                        {!sheet.id && <Field label="Symbol or short name" value={sheet.form.symbol} onChangeText={v => setF({ symbol: v })} placeholder="e.g. NIFTYBEES, GOLD, HDFC FD" autoCapitalize="characters" autoFocus />}
                        <Field label="Name" value={sheet.form.name} onChangeText={v => setF({ name: v })} />
                        <Choice label="Type" options={INSTRUMENT_TYPES} value={sheet.form.type} onChange={v => setF({ type: v })} />
                        <View style={ui.row}><View style={ui.flex}><Field label="Quantity held" numeric value={sheet.form.quantity} onChangeText={v => setF({ quantity: v })} /></View><View style={ui.flex}><MoneyField label="Average buy price" value={sheet.form.buyPrice} onChangeText={v => setF({ buyPrice: v })} /></View></View>
                        {!sheet.id && <MoneyField label="Current price" value={sheet.form.price} onChangeText={v => setF({ price: v })} />}
                        <Field label="Notes" value={sheet.form.notes} onChangeText={v => setF({ notes: v })} />
                    </>}
                    {sheet.kind === 'price' && <><MoneyField label="Price" value={sheet.form.price} onChangeText={v => setF({ price: v })} autoFocus /><DateField label="As of" value={sheet.form.date} onChangeText={v => setF({ date: v })} quick={false} /></>}
                    {sheet.kind === 'alert' && <>
                        <Choice label="Item" options={doc.watchlist.map(w => ({ value: w.id, label: w.symbol }))} value={sheet.form.watchId} onChange={v => setF({ watchId: v })} />
                        <Choice label="When price goes" options={[{ value: 'below', label: 'Below' }, { value: 'above', label: 'Above' }]} value={sheet.form.direction} onChange={v => setF({ direction: v })} />
                        <MoneyField label="Price" value={sheet.form.price} onChangeText={v => setF({ price: v })} autoFocus />
                    </>}
                    <Btn title={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={submit} />
                </>}
            </Sheet>
        </Screen>
    );
}
