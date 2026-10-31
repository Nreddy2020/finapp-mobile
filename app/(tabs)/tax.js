/**
 * app/(tabs)/tax.js — Tax (Decision Intelligence)
 * Both regimes side by side on your numbers, deduction room, HRA, capital gains,
 * the advance-tax calendar and a filing checklist. Planning aid, not a filing tool.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, BackHandler } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Card, Btn, Field, MoneyField, Choice, Chip, Sheet, Notice, Badge, Stat, Progress, KeyValue, useAsyncAction, useMoney, ui, palette, todayLocal } from '../../components/ui/ModuleUI';
import { TaxService } from '../../services/tax';
import { compareRegimes, deductionOpportunities, advanceTaxSchedule, filingChecklist, hraExemption, FINANCIAL_YEARS } from '../../services/tax/taxEngine';

const TABS = [{ value: 'summary', label: 'Summary' }, { value: 'deductions', label: 'Deductions' }, { value: 'gains', label: 'Capital gains' }, { value: 'advance', label: 'Advance tax' }, { value: 'checklist', label: 'Checklist' }];
const num = v => (v === '' || v === null || v === undefined ? 0 : Number(String(v).replace(/[,\s]/g, '')) || 0);

export default function TaxScreen() {
    const router = useRouter();
    const money = useMoney();
    const { busy, error, setError, run } = useAsyncAction();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('summary');
    const [sheet, setSheet] = useState(null);
    const [checked, setChecked] = useState({});
    const today = todayLocal();

    useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (sheet) { setSheet(null); return true; } if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); return true; }); return () => sub.remove(); }, [sheet, router]);
    const load = useCallback(async () => { setLoading(true); try { setProfile(await TaxService.getProfile()); setError(''); } catch (e) { setError(e.message || 'Tax profile could not be loaded. Retry.'); } finally { setLoading(false); } }, [setError]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const cmp = useMemo(() => (profile ? compareRegimes(profile) : null), [profile]);
    const chosen = cmp ? cmp[profile.regime === 'Old' ? 'old' : 'new'] : null;
    const opps = useMemo(() => (profile ? deductionOpportunities(profile) : null), [profile]);
    const adv = useMemo(() => (profile ? advanceTaxSchedule(profile, null, today) : null), [profile, today]);
    const checklist = useMemo(() => (profile ? filingChecklist(profile) : []), [profile]);
    const save = changes => run(async () => setProfile(await TaxService.saveProfile({ ...profile, ...changes })));
    const openSheet = (kind) => {
        setError('');
        if (kind === 'income') setSheet({ kind, form: { income: String(profile.income || ''), otherIncome: String(profile.otherIncome || ''), interestIncome: String(profile.interestIncome || ''), rentalIncome: String(profile.rentalIncome || ''), age: String(profile.age || 30), salaried: profile.salaried, tdsPaid: String(profile.tdsPaid || ''), advanceTaxPaid: String(profile.advanceTaxPaid || '') } });
        if (kind === 'deductions') setSheet({ kind, form: { ...Object.fromEntries(Object.entries(profile.deductions).map(([k, v]) => [k, String(v || '')])), parentsSenior: profile.parentsSenior, hraBasic: String(profile.hra.basic || ''), hraReceived: String(profile.hra.hraReceived || ''), rentPaid: String(profile.hra.rentPaid || ''), metro: profile.hra.metro } });
        if (kind === 'gains') setSheet({ kind, form: Object.fromEntries(Object.entries(profile.capitalGains).map(([k, v]) => [k, String(v || '')])) });
    };
    const setF = patch => setSheet(s => ({ ...s, form: { ...s.form, ...patch } }));
    const submit = () => {
        const f = sheet.form;
        if (sheet.kind === 'income') return save({ income: num(f.income), otherIncome: num(f.otherIncome), interestIncome: num(f.interestIncome), rentalIncome: num(f.rentalIncome), age: num(f.age), salaried: f.salaried, tdsPaid: num(f.tdsPaid), advanceTaxPaid: num(f.advanceTaxPaid) }).then(() => setSheet(null));
        if (sheet.kind === 'deductions') { const { parentsSenior, hraBasic, hraReceived, rentPaid, metro, ...ded } = f; return save({ deductions: Object.fromEntries(Object.entries(ded).map(([k, v]) => [k, num(v)])), parentsSenior, hra: { basic: num(hraBasic), hraReceived: num(hraReceived), rentPaid: num(rentPaid), metro } }).then(() => setSheet(null)); }
        if (sheet.kind === 'gains') return save({ capitalGains: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, num(v)])) }).then(() => setSheet(null));
    };

    return (
        <Screen title="Tax" subtitle="Pay what you owe, not a rupee more." loading={loading} error={error} retry={load} tabs={TABS} tab={tab} onTab={setTab} right={profile ? <Badge text={`FY ${profile.fy}`} color={palette.info} /> : null}>
            {profile && cmp && chosen && tab === 'summary' && <>
                <View style={ui.wrap}>
                    <Stat label={`${profile.regime} regime tax`} value={money.format(chosen.totalTax)} color={palette.warning} />
                    <Stat label="Per month" value={money.format(chosen.monthlyTax)} />
                    <Stat label="Effective rate" value={`${chosen.effectiveRatePercent}%`} />
                    <Stat label={chosen.refundDue ? 'Refund due' : 'Balance payable'} value={money.format(chosen.refundDue || chosen.balancePayable)} color={chosen.refundDue ? palette.success : chosen.balancePayable ? palette.danger : palette.success} />
                </View>
                {!profile.income && !profile.otherIncome && <Notice warning>Enter your income to see real numbers. Everything is computed on this device.</Notice>}
                <Card title="Old vs New regime" subtitle={`On your numbers the ${cmp.recommended} regime is cheaper by ${money.format(cmp.saving)}.`}>
                    <View style={ui.row}>
                        {[['Old', cmp.old], ['New', cmp.new]].map(([name, r]) => <View key={name} style={[ui.stat, profile.regime === name && { borderWidth: 1, borderColor: '#C4B5FD' }]}><Text style={ui.statLabel}>{name} regime{cmp.recommended === name ? ' ★' : ''}</Text><Text style={ui.statValue}>{money.format(r.totalTax)}</Text><Text style={ui.muted}>taxable {money.format(r.taxableIncome)}</Text></View>)}
                    </View>
                    <Choice label="Regime you will file under" options={[{ value: 'New', label: 'New' }, { value: 'Old', label: 'Old' }]} value={profile.regime} onChange={v => save({ regime: v })} />
                    <Choice label="Financial year" options={FINANCIAL_YEARS.map(fy => ({ value: fy, label: fy }))} value={profile.fy} onChange={v => save({ fy: v })} />
                </Card>
                <Card title="Breakdown">
                    <KeyValue label="Gross income" value={money.format(chosen.grossIncome)} />
                    <KeyValue label="Deductions applied" value={money.format(chosen.totalDeductions)} />
                    <KeyValue label="Taxable income" value={money.format(chosen.taxableIncome)} />
                    <KeyValue label="Slab tax" value={money.format(chosen.slabTax)} />
                    {chosen.rebate > 0 && <KeyValue label="Rebate u/s 87A" value={`− ${money.format(chosen.rebate)}`} color={palette.success} />}
                    {chosen.capitalGains.total > 0 && <KeyValue label="Capital gains tax" value={money.format(chosen.capitalGains.total)} />}
                    {chosen.surcharge > 0 && <KeyValue label="Surcharge" value={money.format(chosen.surcharge)} />}
                    <KeyValue label="Cess 4%" value={money.format(chosen.cess)} />
                    <KeyValue label="Total tax" value={money.format(chosen.totalTax)} color={palette.warning} />
                    <KeyValue label="TDS + advance paid" value={money.format(chosen.taxPaid)} />
                </Card>
                <Btn title="Edit income & TDS" onPress={() => openSheet('income')} />
                <Btn title="Edit deductions & HRA" secondary onPress={() => openSheet('deductions')} />
                <Text style={ui.muted}>Rules encoded for FY 2024-25 and 2025-26 (individual). Check the final return with the official portal or a professional.</Text>
            </>}

            {profile && opps && tab === 'deductions' && <>
                <Card title="Room you have not used" subtitle={opps.note}>
                    {!opps.items.length && <Text style={ui.muted}>Every cap is used. Nice.</Text>}
                    {opps.items.map(i => <View key={i.section} style={{ gap: 4 }}><KeyValue label={`${i.section}${i.cap ? ` · used ${money.format(i.used)} of ${money.format(i.cap)}` : ''}`} value={i.room !== null ? money.format(i.room) : ''} color={palette.warning} />{i.cap && <Progress value={i.cap ? (i.used / i.cap) * 100 : 0} />}<Text style={ui.muted}>{i.how}</Text></View>)}
                    {opps.totalRoom > 0 && <KeyValue label={`Potential saving at ${opps.marginalRatePercent}% + cess`} value={money.format(opps.potentialSaving)} color={palette.success} />}
                </Card>
                <Card title="HRA check"><KeyValue label="Exempt HRA (computed)" value={money.format(hraExemption(profile.hra))} /><Text style={ui.muted}>Least of HRA received, rent minus 10% of basic, and 50% (metro) or 40% of basic.</Text></Card>
                <Btn title="Edit deductions & HRA" onPress={() => openSheet('deductions')} />
                <Btn title="Track policies and receipts in Validities" secondary onPress={() => router.push('/(tabs)/validity')} />
            </>}

            {profile && chosen && tab === 'gains' && <>
                <Card title="Capital gains" subtitle="Rates after 23 July 2024: equity STCG 20%, equity LTCG 12.5% above 1.25 lakh, other LTCG 12.5%.">
                    <KeyValue label="Equity short-term gains" value={money.format(profile.capitalGains.equityStcg)} />
                    <KeyValue label="Equity long-term gains" value={money.format(profile.capitalGains.equityLtcg)} />
                    <KeyValue label="Taxable equity LTCG after exemption" value={money.format(chosen.capitalGains.equityLtcgTaxable)} />
                    <KeyValue label="Other long-term gains" value={money.format(profile.capitalGains.otherLtcg)} />
                    <KeyValue label="Other short-term gains (at slab)" value={money.format(profile.capitalGains.otherStcg)} />
                    <KeyValue label="Tax on gains (before cess)" value={money.format(chosen.capitalGains.total)} color={palette.warning} />
                    <Text style={ui.muted}>Tip: realising equity LTCG up to the 1.25 lakh exemption each year is tax-free.</Text>
                </Card>
                <Btn title="Edit capital gains" onPress={() => openSheet('gains')} />
                <Btn title="Investments" secondary onPress={() => router.push('/(tabs)/investments')} />
            </>}

            {profile && adv && tab === 'advance' && <>
                <Card title={adv.required ? 'Advance tax is due' : 'Advance tax not required'} subtitle={adv.note}>
                    <KeyValue label="Tax after TDS" value={money.format(adv.liability)} />
                    <KeyValue label="Advance tax paid" value={money.format(adv.paid)} />
                    <KeyValue label="Remaining" value={money.format(adv.remaining)} color={adv.remaining ? palette.warning : palette.success} />
                    {adv.instalments.map(i => <KeyValue key={i.dueDate} label={`${i.label} (${i.sharePercent}% cumulative · ${i.dueDate})`} value={`${money.format(i.amount)} · ${i.status}`} color={i.status === 'overdue' ? palette.danger : i.status === 'paid' ? palette.success : undefined} />)}
                </Card>
                <Btn title="Record TDS / advance tax paid" onPress={() => openSheet('income')} />
            </>}

            {profile && tab === 'checklist' && <>
                <Card title="Before you file" subtitle="Based on what you entered.">
                    {checklist.map(i => <View key={i.id} style={ui.row}><Chip label={checked[i.id] ? '✓' : '○'} active={!!checked[i.id]} accessibilityLabel={`${checked[i.id] ? 'Done' : 'To do'}: ${i.label}`} onPress={() => setChecked(c => ({ ...c, [i.id]: !c[i.id] }))} /><Text style={[ui.text, ui.flex, checked[i.id] && { color: palette.muted, textDecorationLine: 'line-through' }]}>{i.label}</Text></View>)}
                    <Text style={ui.muted}>ITR due date for most individuals is 31 July after the financial year ends.</Text>
                </Card>
            </>}

            <Sheet visible={!!sheet} title={sheet ? ({ income: 'Income & tax paid', deductions: 'Deductions & HRA', gains: 'Capital gains' })[sheet.kind] : ''} onClose={() => setSheet(null)}>
                {sheet && <>
                    <Notice>{error}</Notice>
                    {sheet.kind === 'income' && <>
                        <MoneyField label="Salary / business income (gross, yearly)" value={sheet.form.income} onChangeText={v => setF({ income: v })} autoFocus />
                        <Choice label="Salaried (standard deduction applies)" options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} value={sheet.form.salaried} onChange={v => setF({ salaried: v })} />
                        <MoneyField label="Interest income (savings, deposits)" value={sheet.form.interestIncome} onChangeText={v => setF({ interestIncome: v })} />
                        <MoneyField label="Rental income (net)" value={sheet.form.rentalIncome} onChangeText={v => setF({ rentalIncome: v })} />
                        <MoneyField label="Other income" value={sheet.form.otherIncome} onChangeText={v => setF({ otherIncome: v })} />
                        <Field label="Age" numeric value={sheet.form.age} onChangeText={v => setF({ age: v })} />
                        <View style={ui.row}><View style={ui.flex}><MoneyField label="TDS deducted" value={sheet.form.tdsPaid} onChangeText={v => setF({ tdsPaid: v })} /></View><View style={ui.flex}><MoneyField label="Advance tax paid" value={sheet.form.advanceTaxPaid} onChangeText={v => setF({ advanceTaxPaid: v })} /></View></View>
                    </>}
                    {sheet.kind === 'deductions' && <>
                        {[['80C', '80C (PPF, EPF, ELSS, LIC, tuition)'], ['80CCD1B', '80CCD(1B) extra NPS'], ['80CCD2', '80CCD(2) employer NPS'], ['80D', '80D health insurance (self & family)'], ['80D_parents', '80D parents'], ['80E', '80E education-loan interest'], ['80G', '80G donations (eligible amount)'], ['80TTA', '80TTA/80TTB deposit interest'], ['24B', '24(b) home-loan interest']].map(([k, l]) => <MoneyField key={k} label={l} value={sheet.form[k]} onChangeText={v => setF({ [k]: v })} />)}
                        <Choice label="Parents are senior citizens" options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} value={sheet.form.parentsSenior} onChange={v => setF({ parentsSenior: v })} />
                        <Text style={ui.label}>HRA (leave blank if not applicable)</Text>
                        <View style={ui.row}><View style={ui.flex}><MoneyField label="Basic salary / yr" value={sheet.form.hraBasic} onChangeText={v => setF({ hraBasic: v })} /></View><View style={ui.flex}><MoneyField label="HRA received / yr" value={sheet.form.hraReceived} onChangeText={v => setF({ hraReceived: v })} /></View></View>
                        <MoneyField label="Rent paid / yr" value={sheet.form.rentPaid} onChangeText={v => setF({ rentPaid: v })} />
                        <Choice label="Metro city" options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} value={sheet.form.metro} onChange={v => setF({ metro: v })} />
                    </>}
                    {sheet.kind === 'gains' && <>
                        <MoneyField label="Equity short-term gains" value={sheet.form.equityStcg} onChangeText={v => setF({ equityStcg: v })} autoFocus />
                        <MoneyField label="Equity long-term gains" value={sheet.form.equityLtcg} onChangeText={v => setF({ equityLtcg: v })} />
                        <MoneyField label="Other long-term gains" value={sheet.form.otherLtcg} onChangeText={v => setF({ otherLtcg: v })} />
                        <MoneyField label="Other short-term gains" value={sheet.form.otherStcg} onChangeText={v => setF({ otherStcg: v })} />
                    </>}
                    <Btn title={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={submit} />
                </>}
            </Sheet>
        </Screen>
    );
}
