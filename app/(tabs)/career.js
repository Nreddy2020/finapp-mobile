/**
 * app/(tabs)/career.js — Career
 * Overview, goals with milestones, skills gap, learning with ROI, certifications,
 * job pipeline, income history and a negotiation planner. All user-entered.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, BackHandler } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, CheckCircle2, Circle } from 'lucide-react-native';
import { Screen, Card, Btn, Field, MoneyField, DateField, Choice, Chip, Sheet, Notice, Empty, Badge, Stat, Progress, ListItem, KeyValue, useAsyncAction, useMoney, ui, palette, todayLocal, confirm } from '../../components/ui/ModuleUI';
import { CareerOsService, careerSummary, goalProgress, learningRoi, negotiationPlan, skillGap, GOAL_TYPES, LEARNING_STATUSES, APPLICATION_STAGES } from '../../services/career/careerOsService';

const TABS = [{ value: 'overview', label: 'Overview' }, { value: 'goals', label: 'Goals' }, { value: 'skills', label: 'Skills' }, { value: 'learning', label: 'Learning' }, { value: 'jobs', label: 'Jobs' }, { value: 'income', label: 'Income' }];
const STAGE_COLORS = { saved: palette.muted, applied: palette.info, interview: palette.warning, offer: palette.success, accepted: palette.success, rejected: palette.danger, withdrawn: palette.muted };

export default function CareerScreen() {
    const router = useRouter();
    const money = useMoney();
    const { busy, error, setError, run } = useAsyncAction();
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const [sheet, setSheet] = useState(null); // {kind, form, id?}
    const [roi, setRoi] = useState({ cost: '', increase: '' });
    const [nego, setNego] = useState({ low: '', high: '', raise: '20' });
    const [milestoneText, setMilestoneText] = useState('');
    const today = todayLocal();

    useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (sheet) { setSheet(null); return true; } if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); return true; }); return () => sub.remove(); }, [sheet, router]);
    const load = useCallback(async () => { setLoading(true); try { setDoc(await CareerOsService.load()); setError(''); } catch (e) { setError(e.message || 'Career data could not be loaded. Retry.'); } finally { setLoading(false); } }, [setError]);
    useFocusEffect(useCallback(() => { load(); }, [load]));
    const summary = useMemo(() => (doc ? careerSummary(doc, today) : null), [doc, today]);
    const act = fn => run(async () => setDoc(await fn()));
    const open = (kind, form, id = null) => { setError(''); setSheet({ kind, form, id }); };
    const setF = patch => setSheet(s => ({ ...s, form: { ...s.form, ...patch } }));
    const submit = () => run(async () => {
        const f = sheet.form;
        let next;
        if (sheet.kind === 'profile') next = await CareerOsService.updateProfile(f);
        if (sheet.kind === 'goal') next = sheet.id ? await CareerOsService.updateGoal(sheet.id, f) : await CareerOsService.addGoal(f);
        if (sheet.kind === 'skill') next = sheet.id ? await CareerOsService.updateSkill(sheet.id, f) : await CareerOsService.addSkill(f);
        if (sheet.kind === 'learning') next = await CareerOsService.addLearning(f);
        if (sheet.kind === 'cert') next = await CareerOsService.addCertification(f);
        if (sheet.kind === 'job') next = await CareerOsService.addApplication(f);
        if (sheet.kind === 'income') next = await CareerOsService.addIncomeRecord(f);
        setDoc(next); setSheet(null);
    });
    const addButton = (kind, form, label) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={() => open(kind, form)} style={ui.back}><Plus color="#F4F4F5" size={22} /></TouchableOpacity>;
    const rightFor = { overview: null, goals: addButton('goal', { title: '', type: 'promotion', targetDate: '', notes: '' }, 'Add goal'), skills: addButton('skill', { name: '', current: '3', target: '8', evidence: '' }, 'Add skill'), learning: addButton('learning', { title: '', provider: '', cost: '', hours: '', status: 'planned', monthlyIncrease: '', notes: '' }, 'Add learning'), jobs: addButton('job', { company: '', role: '', stage: 'saved', appliedDate: '', offeredMonthly: '', notes: '' }, 'Add application'), income: addButton('income', { date: today, monthlyAmount: '', note: '' }, 'Add income record') };
    const roiResult = (() => { try { return roi.cost && roi.increase ? learningRoi({ cost: roi.cost, monthlyIncrease: roi.increase }) : null; } catch { return null; } })();
    const negoResult = (() => { try { return doc?.profile.monthlyIncome && nego.low && nego.high ? negotiationPlan({ currentMonthly: doc.profile.monthlyIncome, marketLow: nego.low, marketHigh: nego.high, targetRaisePercent: Number(nego.raise) || 0 }) : null; } catch (e) { return { error: e.message }; } })();

    return (
        <Screen title="Career" subtitle="Grow income, skills and options on purpose." loading={loading} error={error} retry={load} tabs={TABS} tab={tab} onTab={setTab} right={rightFor[tab]}>
            {doc && summary && tab === 'overview' && <>
                <Card title={doc.profile.role || 'Set up your profile'} subtitle={[doc.profile.company, doc.profile.industry, doc.profile.startDate ? `since ${doc.profile.startDate}` : null].filter(Boolean).join(' · ') || 'Role, company and income make every other number here meaningful.'}>
                    <View style={ui.wrap}>
                        <Stat label="Monthly income" value={doc.profile.monthlyIncome != null ? money.format(doc.profile.monthlyIncome) : '—'} />
                        <Stat label="Target income" value={doc.profile.targetMonthlyIncome != null ? money.format(doc.profile.targetMonthlyIncome) : '—'} color={palette.success} />
                        {summary.incomeGapToTarget != null && <Stat label="Gap to target" value={money.format(summary.incomeGapToTarget)} color={summary.incomeGapToTarget > 0 ? palette.warning : palette.success} />}
                    </View>
                    <Btn title="Edit profile" secondary onPress={() => open('profile', { role: doc.profile.role, company: doc.profile.company, industry: doc.profile.industry, startDate: doc.profile.startDate || '', monthlyIncome: doc.profile.monthlyIncome != null ? String(doc.profile.monthlyIncome) : '', targetMonthlyIncome: doc.profile.targetMonthlyIncome != null ? String(doc.profile.targetMonthlyIncome) : '', notes: doc.profile.notes })} />
                </Card>
                <View style={ui.wrap}>
                    <Stat label="Active goals" value={String(summary.activeGoals)} />
                    <Stat label="Applications live" value={String(summary.activeApplications)} />
                    <Stat label="Learning hours" value={String(summary.learningHours)} />
                    <Stat label="Learning spend" value={money.format(summary.learningSpend)} />
                </View>
                {summary.nextGoal && <Card title="Next goal" subtitle={summary.nextGoal.targetDate ? `Target ${summary.nextGoal.targetDate}` : 'No date set'}><Text style={ui.text}>{summary.nextGoal.title}</Text><Progress value={goalProgress(summary.nextGoal)} /></Card>}
                {summary.biggestGap && <Card title="Biggest skill gap"><Text style={ui.text}>{summary.biggestGap.name}: {summary.biggestGap.current} → {summary.biggestGap.target}</Text><Text style={ui.muted}>Close it with one course or one project in Learning.</Text></Card>}
                {!!summary.expiringCerts.length && <Notice warning>{`${summary.expiringCerts.length} certification${summary.expiringCerts.length === 1 ? '' : 's'} expire within 60 days: ${summary.expiringCerts.map(c => c.name).join(', ')}.`}</Notice>}
                {summary.growth.growthPercent !== null && <Card title="Income growth"><KeyValue label={`Since ${summary.growth.first.date}`} value={`${summary.growth.growthPercent}%`} color={summary.growth.growthPercent >= 0 ? palette.success : palette.danger} /><KeyValue label="Yearly growth rate" value={`${summary.growth.cagrPercent}%`} /></Card>}
                <Card title="Is this course worth it?" subtitle="Payback from an income increase you believe is realistic.">
                    <View style={ui.row}><View style={ui.flex}><MoneyField label="Cost" value={roi.cost} onChangeText={v => setRoi(r => ({ ...r, cost: v }))} /></View><View style={ui.flex}><MoneyField label="Extra per month" value={roi.increase} onChangeText={v => setRoi(r => ({ ...r, increase: v }))} /></View></View>
                    {roiResult && <><KeyValue label="Pays back in" value={roiResult.paybackMonths === null ? 'Never at this increase' : `${roiResult.paybackMonths} months`} color={roiResult.worthIt ? palette.success : palette.danger} /><KeyValue label="Net gain over 5 years" value={money.format(roiResult.netOverYears)} /></>}
                </Card>
                <Btn title="Older career tools (skills gap, resume, mentors)" secondary onPress={() => router.push('/career-growth')} />
            </>}

            {doc && tab === 'goals' && <>
                {!doc.goals.length && <Empty title="No career goals" body="A promotion, a switch, a certification or an income target. Add milestones so progress is visible." action="Add goal" onAction={() => open('goal', { title: '', type: 'promotion', targetDate: '', notes: '' })} />}
                {doc.goals.map(g => (
                    <Card key={g.id} title={g.title} subtitle={[g.type, g.targetDate ? `by ${g.targetDate}` : null].filter(Boolean).join(' · ')}>
                        <View style={ui.row}><Badge text={g.status.toUpperCase()} color={g.status === 'achieved' ? palette.success : g.status === 'active' ? palette.info : palette.muted} /></View>
                        <Progress value={goalProgress(g)} />
                        {g.milestones.map(m => <View key={m.id} style={ui.row}><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: m.done }} accessibilityLabel={m.title} disabled={busy} onPress={() => act(() => CareerOsService.toggleMilestone(g.id, m.id))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>{m.done ? <CheckCircle2 size={22} color={palette.success} /> : <Circle size={22} color="#71717A" />}</TouchableOpacity><Text style={[ui.text, ui.flex, m.done && { color: palette.muted, textDecorationLine: 'line-through' }]}>{m.title}</Text></View>)}
                        <View style={ui.row}><View style={ui.flex}><Field value={milestoneText} onChangeText={setMilestoneText} placeholder="Add milestone" /></View><Btn title="Add" secondary disabled={busy || !milestoneText.trim()} onPress={() => act(async () => { const d = await CareerOsService.addMilestone(g.id, milestoneText); setMilestoneText(''); return d; })} /></View>
                        {!!g.notes && <Text style={ui.muted}>{g.notes}</Text>}
                        <View style={ui.wrap}>
                            {g.status !== 'achieved' && <Chip label="Mark achieved" onPress={() => act(() => CareerOsService.updateGoal(g.id, { status: 'achieved' }))} />}
                            {g.status === 'active' && <Chip label="Drop" onPress={() => act(() => CareerOsService.updateGoal(g.id, { status: 'dropped' }))} />}
                            {g.status !== 'active' && <Chip label="Reactivate" onPress={() => act(() => CareerOsService.updateGoal(g.id, { status: 'active' }))} />}
                            <Chip label="Edit" onPress={() => open('goal', { title: g.title, type: g.type, targetDate: g.targetDate || '', notes: g.notes }, g.id)} />
                            <Chip label="Delete" onPress={() => confirm('Delete goal', `Remove "${g.title}"?`, () => act(() => CareerOsService.removeGoal(g.id)), 'Delete')} />
                        </View>
                    </Card>
                ))}
            </>}

            {doc && tab === 'skills' && <>
                {!doc.skills.length && <Empty title="No skills mapped" body="Rate where you are and where the next role needs you to be. Be honest; this is only for you." action="Add skill" onAction={() => open('skill', { name: '', current: '3', target: '8', evidence: '' })} />}
                {[...doc.skills].sort((a, b) => skillGap(b) - skillGap(a)).map(s => (
                    <Card key={s.id} title={s.name} subtitle={s.evidence || undefined}>
                        <KeyValue label="Now → target" value={`${s.current} → ${s.target}`} color={skillGap(s) > 3 ? palette.warning : palette.success} />
                        <Progress value={s.target ? (s.current / s.target) * 100 : 0} label={`gap ${skillGap(s)}`} />
                        <View style={ui.wrap}>
                            <Chip label="+1 level" onPress={() => act(() => CareerOsService.updateSkill(s.id, { current: Math.min(10, s.current + 1) }))} />
                            <Chip label="Edit" onPress={() => open('skill', { name: s.name, current: String(s.current), target: String(s.target), evidence: s.evidence }, s.id)} />
                            <Chip label="Delete" onPress={() => confirm('Delete skill', `Remove "${s.name}"?`, () => act(() => CareerOsService.removeSkill(s.id)), 'Delete')} />
                        </View>
                    </Card>
                ))}
            </>}

            {doc && tab === 'learning' && <>
                {!doc.learning.length && !doc.certifications.length && <Empty title="No learning planned" body="Courses, books, certifications. Add the cost and hours so you can see what learning really costs and returns." action="Add learning" onAction={() => open('learning', { title: '', provider: '', cost: '', hours: '', status: 'planned', monthlyIncrease: '', notes: '' })} />}
                {doc.learning.map(l => { const r = l.monthlyIncrease ? learningRoi({ cost: l.cost, monthlyIncrease: l.monthlyIncrease }) : null; return (
                    <Card key={l.id} title={l.title} subtitle={[l.provider, `${money.format(l.cost)}`, `${l.hours} h`, l.skillId ? doc.skills.find(s => s.id === l.skillId)?.name : null].filter(Boolean).join(' · ')}>
                        <View style={ui.row}><Badge text={l.status.toUpperCase()} color={l.status === 'done' ? palette.success : l.status === 'in-progress' ? palette.info : palette.muted} />{r && <Badge text={r.paybackMonths === null ? 'No payback' : `Pays back in ${r.paybackMonths} mo`} color={r.worthIt ? palette.success : palette.danger} />}</View>
                        <Choice options={LEARNING_STATUSES} value={l.status} onChange={v => act(() => CareerOsService.updateLearning(l.id, { status: v }))} />
                        <Chip label="Delete" onPress={() => confirm('Delete', `Remove "${l.title}"?`, () => act(() => CareerOsService.removeLearning(l.id)), 'Delete')} />
                    </Card>
                ); })}
                <Card title="Certifications" subtitle="Track expiry so renewals never surprise you.">
                    {doc.certifications.map(c => <ListItem key={c.id}><View style={[ui.row, { justifyContent: 'space-between' }]}><View style={ui.flex}><Text style={[ui.text, { fontWeight: '700' }]}>{c.name}</Text><Text style={ui.muted}>{[c.issuer, c.obtainedDate ? `obtained ${c.obtainedDate}` : null, c.expiryDate ? `expires ${c.expiryDate}` : 'no expiry'].filter(Boolean).join(' · ')}</Text></View><Chip label="Remove" onPress={() => act(() => CareerOsService.removeCertification(c.id))} /></View></ListItem>)}
                    <Btn title="Add certification" secondary onPress={() => open('cert', { name: '', issuer: '', obtainedDate: '', expiryDate: '', cost: '' })} />
                    <Btn title="Track renewals in Validities" secondary onPress={() => router.push('/(tabs)/validity')} />
                </Card>
            </>}

            {doc && tab === 'jobs' && <>
                <View style={ui.wrap}>{APPLICATION_STAGES.filter(s => summary.pipeline[s]).map(s => <Badge key={s} text={`${s} ${summary.pipeline[s]}`} color={STAGE_COLORS[s]} />)}</View>
                {!doc.applications.length && <Empty title="No applications tracked" body="Keep every opportunity in one place with its stage and offer, so you negotiate from facts." action="Add application" onAction={() => open('job', { company: '', role: '', stage: 'saved', appliedDate: '', offeredMonthly: '', notes: '' })} />}
                {doc.applications.map(a => (
                    <Card key={a.id} title={`${a.role} · ${a.company}`} subtitle={[a.appliedDate ? `applied ${a.appliedDate}` : null, a.offeredMonthly ? `offer ${money.format(a.offeredMonthly)}/mo` : null].filter(Boolean).join(' · ') || undefined}>
                        <Choice options={APPLICATION_STAGES} value={a.stage} onChange={v => act(() => CareerOsService.setApplicationStage(a.id, v))} />
                        {!!a.notes && <Text style={ui.muted}>{a.notes}</Text>}
                        <Chip label="Delete" onPress={() => confirm('Delete', `Remove ${a.company}?`, () => act(() => CareerOsService.removeApplication(a.id)), 'Delete')} />
                    </Card>
                ))}
                <Card title="Negotiation planner" subtitle="Enter the market range you researched; the plan gives you an anchor, a target and a walk-away.">
                    {doc.profile.monthlyIncome == null && <Text style={ui.muted}>Add your current monthly income in the profile first.</Text>}
                    <View style={ui.row}><View style={ui.flex}><MoneyField label="Market low" value={nego.low} onChangeText={v => setNego(n => ({ ...n, low: v }))} /></View><View style={ui.flex}><MoneyField label="Market high" value={nego.high} onChangeText={v => setNego(n => ({ ...n, high: v }))} /></View></View>
                    <Field label="Raise you want (%)" numeric value={nego.raise} onChangeText={v => setNego(n => ({ ...n, raise: v }))} />
                    {negoResult?.error && <Notice>{negoResult.error}</Notice>}
                    {negoResult && !negoResult.error && <>
                        <KeyValue label="Anchor (ask first)" value={money.format(negoResult.anchor)} color={palette.success} />
                        <KeyValue label="Target" value={money.format(negoResult.target)} />
                        <KeyValue label="Walk-away" value={money.format(negoResult.walkAway)} color={palette.warning} />
                        {negoResult.talkingPoints.map((t, i) => <Text key={i} style={ui.muted}>• {t}</Text>)}
                    </>}
                </Card>
            </>}

            {doc && tab === 'income' && <>
                {summary.growth.growthPercent !== null && <View style={ui.wrap}><Stat label="Total growth" value={`${summary.growth.growthPercent}%`} color={palette.success} /><Stat label="Per year" value={`${summary.growth.cagrPercent}%`} /></View>}
                {!doc.incomeHistory.length && <Empty title="No income history" body="Record each salary change. Growth over time tells you whether to push, switch or stay." action="Add record" onAction={() => open('income', { date: today, monthlyAmount: '', note: '' })} />}
                <Card title="History">
                    {[...doc.incomeHistory].reverse().map(r => <ListItem key={r.id}><View style={[ui.row, { justifyContent: 'space-between' }]}><View style={ui.flex}><Text style={[ui.text, { fontWeight: '700' }]}>{money.format(r.monthlyAmount)} / month</Text><Text style={ui.muted}>{r.date}{r.note ? ` · ${r.note}` : ''}</Text></View><Chip label="Remove" onPress={() => act(() => CareerOsService.removeIncomeRecord(r.id))} /></View></ListItem>)}
                </Card>
                <Btn title="See how income compares with spending in Insights" secondary onPress={() => router.push('/(tabs)/insights')} />
            </>}

            <Sheet visible={!!sheet} title={sheet ? ({ profile: 'Profile', goal: sheet.id ? 'Edit goal' : 'New career goal', skill: sheet.id ? 'Edit skill' : 'New skill', learning: 'New learning', cert: 'New certification', job: 'New application', income: 'Income record' })[sheet.kind] : ''} onClose={() => setSheet(null)}>
                {sheet && <>
                    <Notice>{error}</Notice>
                    {sheet.kind === 'profile' && <>
                        <Field label="Current role" value={sheet.form.role} onChangeText={v => setF({ role: v })} placeholder="e.g. Nurse, Driver, Analyst" />
                        <Field label="Company / employer" value={sheet.form.company} onChangeText={v => setF({ company: v })} />
                        <Field label="Industry" value={sheet.form.industry} onChangeText={v => setF({ industry: v })} />
                        <DateField label="Started on" value={sheet.form.startDate} onChangeText={v => setF({ startDate: v })} quick={false} />
                        <MoneyField label="Monthly income (take-home)" value={sheet.form.monthlyIncome} onChangeText={v => setF({ monthlyIncome: v })} />
                        <MoneyField label="Target monthly income" value={sheet.form.targetMonthlyIncome} onChangeText={v => setF({ targetMonthlyIncome: v })} />
                        <Field label="Notes" multiline value={sheet.form.notes} onChangeText={v => setF({ notes: v })} />
                    </>}
                    {sheet.kind === 'goal' && <>
                        <Field label="Goal" value={sheet.form.title} onChangeText={v => setF({ title: v })} placeholder="e.g. Get promoted to team lead" autoFocus />
                        <Choice label="Type" options={GOAL_TYPES} value={sheet.form.type} onChange={v => setF({ type: v })} />
                        <DateField label="Target date" value={sheet.form.targetDate} onChangeText={v => setF({ targetDate: v })} />
                        <Field label="Notes" multiline value={sheet.form.notes} onChangeText={v => setF({ notes: v })} />
                    </>}
                    {sheet.kind === 'skill' && <>
                        <Field label="Skill" value={sheet.form.name} onChangeText={v => setF({ name: v })} placeholder="e.g. Spoken English, Excel, Welding" autoFocus />
                        <View style={ui.row}><View style={ui.flex}><Field label="Now (0-10)" numeric value={sheet.form.current} onChangeText={v => setF({ current: v })} /></View><View style={ui.flex}><Field label="Target (0-10)" numeric value={sheet.form.target} onChangeText={v => setF({ target: v })} /></View></View>
                        <Field label="Evidence" value={sheet.form.evidence} onChangeText={v => setF({ evidence: v })} placeholder="How you know your level" />
                    </>}
                    {sheet.kind === 'learning' && <>
                        <Field label="Course / book / programme" value={sheet.form.title} onChangeText={v => setF({ title: v })} autoFocus />
                        <Field label="Provider" value={sheet.form.provider} onChangeText={v => setF({ provider: v })} />
                        <View style={ui.row}><View style={ui.flex}><MoneyField label="Cost" value={sheet.form.cost} onChangeText={v => setF({ cost: v })} /></View><View style={ui.flex}><Field label="Hours" numeric value={sheet.form.hours} onChangeText={v => setF({ hours: v })} /></View></View>
                        <MoneyField label="Extra income per month it could unlock" value={sheet.form.monthlyIncrease} onChangeText={v => setF({ monthlyIncrease: v })} hint="Optional, used for payback." />
                        {!!doc.skills.length && <Choice label="Builds skill" options={[{ value: '', label: 'None' }, ...doc.skills.map(s => ({ value: s.id, label: s.name }))]} value={sheet.form.skillId || ''} onChange={v => setF({ skillId: v || null })} />}
                        <Choice label="Status" options={LEARNING_STATUSES} value={sheet.form.status} onChange={v => setF({ status: v })} />
                    </>}
                    {sheet.kind === 'cert' && <>
                        <Field label="Certification" value={sheet.form.name} onChangeText={v => setF({ name: v })} autoFocus />
                        <Field label="Issuer" value={sheet.form.issuer} onChangeText={v => setF({ issuer: v })} />
                        <DateField label="Obtained on" value={sheet.form.obtainedDate} onChangeText={v => setF({ obtainedDate: v })} quick={false} />
                        <DateField label="Expires on" value={sheet.form.expiryDate} onChangeText={v => setF({ expiryDate: v })} />
                        <MoneyField label="Cost" value={sheet.form.cost} onChangeText={v => setF({ cost: v })} />
                    </>}
                    {sheet.kind === 'job' && <>
                        <Field label="Company" value={sheet.form.company} onChangeText={v => setF({ company: v })} autoFocus />
                        <Field label="Role" value={sheet.form.role} onChangeText={v => setF({ role: v })} />
                        <Choice label="Stage" options={APPLICATION_STAGES} value={sheet.form.stage} onChange={v => setF({ stage: v })} />
                        <DateField label="Applied on" value={sheet.form.appliedDate} onChangeText={v => setF({ appliedDate: v })} />
                        <MoneyField label="Offered monthly (if any)" value={sheet.form.offeredMonthly} onChangeText={v => setF({ offeredMonthly: v })} />
                        <Field label="Notes" multiline value={sheet.form.notes} onChangeText={v => setF({ notes: v })} />
                    </>}
                    {sheet.kind === 'income' && <>
                        <DateField label="From" value={sheet.form.date} onChangeText={v => setF({ date: v })} quick={false} />
                        <MoneyField label="Monthly income" value={sheet.form.monthlyAmount} onChangeText={v => setF({ monthlyAmount: v })} autoFocus />
                        <Field label="Note" value={sheet.form.note} onChangeText={v => setF({ note: v })} placeholder="Raise, new job, side income" />
                    </>}
                    <Btn title={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={submit} />
                </>}
            </Sheet>
        </Screen>
    );
}
