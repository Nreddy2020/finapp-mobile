/**
 * app/(tabs)/insights.js — Insights (Decision Intelligence)
 * Spending DNA, wealth forecast and alerts from the intelligence engine, plus a Decision
 * Studio: can-I-afford, what-if, subscription audit, savings leaks, goal feasibility,
 * debt payoff, a prioritised action plan, a weekly digest and an assistant that answers
 * from the user's own numbers. Everything runs on-device.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, BackHandler, TextInput } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Send, Sparkles } from 'lucide-react-native';
import { Screen, Card, Btn, Field, MoneyField, Choice, Chip, Notice, Empty, Badge, Stat, Progress, KeyValue, ListItem, useAsyncAction, useMoney, ui, palette, todayLocal } from '../../components/ui/ModuleUI';
import { FinlifeIntelligenceEngine, SPENDING_PERSONAS } from '../../services/intelligence/finlifeIntelligenceEngine.js';
import { loadDecisionContext, affordability, whatIf, subscriptionAudit, savingsLeaks, goalFeasibility, debtPayoff, actionPlan, weeklyDigest, answerQuestion } from '../../services/intelligence/decisionEngine.js';
import { ValidityService, summary as validitySummary } from '../../services/validity/validityService';
import { TodoService } from '../../services/todos';
import { taskStats } from '../../services/life/taskViews';
import { LifeGoalsService, goalPlan } from '../../services/life/lifeGoalsService';

const TABS = [{ value: 'overview', label: 'Overview' }, { value: 'decide', label: 'Decision Studio' }, { value: 'plan', label: 'Action plan' }, { value: 'ask', label: 'Ask' }];
const VERDICT = { comfortable: ['Comfortable', palette.success], stretch: ['A stretch', palette.warning], avoid: ['Wait', palette.danger] };

export default function InsightsScreen() {
    const router = useRouter();
    const money = useMoney();
    const moneyRef = useRef(money); moneyRef.current = money;
    const { error, setError } = useAsyncAction();
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const [ctx, setCtx] = useState(null);
    const [persona, setPersona] = useState(SPENDING_PERSONAS.BALANCED_STRATEGIST);
    const [forecast, setForecast] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [extras, setExtras] = useState({});
    const [tool, setTool] = useState('afford');
    const [afford, setAfford] = useState({ price: '', financed: false, downPayment: '', rate: '12', months: '12' });
    const [wi, setWi] = useState({ incomeDelta: '0', expenseDelta: '0', shock: '', months: '12' });
    const [usage, setUsage] = useState({});
    const [goal, setGoal] = useState({ target: '', saved: '', monthly: '', months: '12', rate: '6' });
    const [extraDebt, setExtraDebt] = useState('');
    const [strategy, setStrategy] = useState('avalanche');
    const [chat, setChat] = useState([]);
    const [input, setInput] = useState('');
    const today = todayLocal();

    useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); return true; }); return () => sub.remove(); }, [router]);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const c = await loadDecisionContext();
            setCtx(c);
            setPersona(FinlifeIntelligenceEngine.computeSpendingDNA(c.snapshot));
            setForecast(FinlifeIntelligenceEngine.computeWealthForecast(c.snapshot, 12));
            setAlerts(FinlifeIntelligenceEngine.generateIntelligenceAlerts(c.snapshot));
            const [validityItems, tasks, goals] = await Promise.all([ValidityService.list().catch(() => []), TodoService.getTodos().catch(() => []), LifeGoalsService.list().catch(() => [])]);
            const plans = goals.filter(g => g.status === 'active').map(g => goalPlan(g, today));
            setExtras({ validity: validitySummary(validityItems, today), tasks: taskStats(tasks, today), goals: { total: plans.length, onTrack: plans.filter(p => p.pace === 'on-track').length, behind: plans.filter(p => p.pace !== 'on-track' && p.pace !== 'achieved').length }, subscriptions: subscriptionAudit(c.recurring.map(r => ({ ...r, usage: usage[r.id] || r.usage }))) });
            setChat(prev => (prev.length ? prev : [{ sender: 'ai', text: `I read your numbers: income ${moneyRef.current.format(c.monthlyIncome)} a month, spending ${moneyRef.current.format(c.monthlyExpenses)}, cash ${moneyRef.current.format(c.liquidCash)}. Ask me things like "can I afford 30,000", "my runway" or "subscriptions".` }]));
            setError('');
        } catch (e) { setError(e.message || 'Insights could not be loaded. Retry.'); }
        finally { setLoading(false); }
    }, [today, usage, setError]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const plan = useMemo(() => (ctx ? actionPlan(ctx.snapshot, { ...extras, tax: extras.tax }) : []), [ctx, extras]);
    const digest = useMemo(() => (ctx ? weeklyDigest(ctx.snapshot, extras) : []), [ctx, extras]);
    const affordResult = useMemo(() => { if (!ctx || !afford.price) return null; try { return affordability({ price: afford.price, monthlyIncome: ctx.monthlyIncome, monthlyExpenses: ctx.monthlyExpenses, liquidCash: ctx.liquidCash, monthlyDebt: ctx.monthlyDebt, financing: afford.financed ? { downPayment: afford.downPayment, annualRatePct: afford.rate, months: afford.months } : null }); } catch (e) { return { error: e.message }; } }, [ctx, afford]);
    const wiResult = useMemo(() => (ctx ? whatIf({ monthlyIncome: ctx.monthlyIncome, monthlyExpenses: ctx.monthlyExpenses, liquidCash: ctx.liquidCash, netWorth: ctx.netWorth, incomeDeltaPct: Number(wi.incomeDelta) || 0, expenseDeltaPct: Number(wi.expenseDelta) || 0, oneTimeShock: Number(wi.shock) || 0, months: Number(wi.months) || 12 }) : null), [ctx, wi]);
    const subs = useMemo(() => (ctx ? subscriptionAudit(ctx.recurring.map(r => ({ ...r, usage: usage[r.id] || r.usage }))) : null), [ctx, usage]);
    const leaks = useMemo(() => (ctx ? savingsLeaks(ctx.transactions) : null), [ctx]);
    const goalResult = useMemo(() => { if (!goal.target) return null; try { return goalFeasibility({ target: goal.target, saved: goal.saved || 0, monthlyContribution: goal.monthly || 0, months: goal.months || 12, annualReturnPct: goal.rate || 0 }); } catch (e) { return { error: e.message }; } }, [goal]);
    const debt = useMemo(() => (ctx ? debtPayoff([...ctx.loans, ...ctx.emis.map(e => ({ name: e.name || 'EMI', balance: e.outstanding ?? e.outstanding_amount, ratePct: e.interest_rate ?? e.rate, minPayment: e.amount }))], Number(extraDebt) || 0, strategy) : null), [ctx, extraDebt, strategy]);
    const maxForecast = forecast.length ? Math.max(...forecast.map(p => p.value), 1) : 1;
    const send = text => { const q = (text ?? input).trim(); if (!q) return; const reply = answerQuestion(q, ctx); setChat(c => [...c, { sender: 'user', text: q }, { sender: 'ai', text: reply }]); setInput(''); };

    return (
        <Screen title="Insights" subtitle="Decisions from your own numbers, not guesses." loading={loading} error={error} retry={load} tabs={TABS} tab={tab} onTab={setTab}
            right={<View style={[ui.row, { gap: 6 }]}><Sparkles size={14} color="#8B5CF6" /><Text style={{ color: '#8B5CF6', fontWeight: '700', fontSize: 12 }}>On-device</Text></View>}>
            {ctx && tab === 'overview' && <>
                {!ctx.snapshot.transactionsCount && !ctx.hasIncomeData && <Notice warning>No transactions or income recorded yet. Add a few in Money Flow or Income so these insights reflect you, not a placeholder.</Notice>}
                <View style={ui.wrap}>
                    <Stat label="Monthly income" value={money.format(ctx.monthlyIncome)} />
                    <Stat label="Monthly spend" value={money.format(ctx.monthlyExpenses)} />
                    <Stat label="Cash runway" value={ctx.monthlyExpenses > 0 ? `${(ctx.liquidCash / ctx.monthlyExpenses).toFixed(1)} mo` : '—'} color={ctx.monthlyExpenses > 0 && ctx.liquidCash / ctx.monthlyExpenses < 3 ? palette.danger : palette.success} />
                    <Stat label="Net worth" value={money.format(ctx.netWorth)} />
                </View>
                {(ctx.snapshot.transactionsCount > 0 || ctx.hasIncomeData) ? <Card title={persona.title} subtitle="Spending DNA"><Text style={ui.text}>{persona.desc}</Text><Text style={ui.muted}>{persona.advice}</Text></Card>
                    : <Card title="Spending DNA" subtitle="Not enough data yet"><Text style={ui.muted}>Your spending style appears after a month of transactions or a declared income.</Text></Card>}
                <Card title="Wealth forecast (5 years at 12%)" subtitle="Compounds your current savings rate. Change the rate in Markets calculators.">
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 }}>
                        {forecast.map((p, i) => <View key={p.year} style={{ alignItems: 'center', flex: 1, gap: 6 }}><View style={{ width: 12, borderRadius: 6, height: `${Math.max(8, Math.round((p.value / maxForecast) * 100))}%`, backgroundColor: i === forecast.length - 1 ? palette.success : '#3F3F46' }} /><Text style={ui.muted}>{p.year}</Text></View>)}
                    </View>
                    {!!forecast.length && <Text style={ui.muted}>Projected net worth {money.format(forecast[forecast.length - 1].value)} by {forecast[forecast.length - 1].year}.</Text>}
                </Card>
                <Card title="Alerts">{alerts.map(a => <ListItem key={a.id}><Text style={[ui.text, { fontWeight: '700', color: a.color }]}>{a.title}</Text><Text style={ui.muted}>{a.msg}</Text></ListItem>)}</Card>
                <Card title="This week in one glance">{digest.map((l, i) => <Text key={i} style={ui.text}>• {l}</Text>)}</Card>
            </>}

            {ctx && tab === 'decide' && <>
                <View style={ui.wrap}>{[['afford', 'Can I afford it?'], ['whatif', 'What if…'], ['subs', 'Subscriptions'], ['leaks', 'Small leaks'], ['goal', 'Reach a goal'], ['debt', 'Pay off debt']].map(([v, l]) => <Chip key={v} label={l} active={tool === v} onPress={() => setTool(v)} />)}</View>
                {tool === 'afford' && <Card title="Can I afford it?" subtitle="Uses your cash, spending, debt payments and a 6-month buffer.">
                    <MoneyField label="Price" value={afford.price} onChangeText={v => setAfford(a => ({ ...a, price: v }))} />
                    <Choice options={[{ value: false, label: 'Pay in full' }, { value: true, label: 'On instalments' }]} value={afford.financed} onChange={v => setAfford(a => ({ ...a, financed: v }))} />
                    {afford.financed && <View style={ui.row}><View style={ui.flex}><MoneyField label="Down payment" value={afford.downPayment} onChangeText={v => setAfford(a => ({ ...a, downPayment: v }))} /></View><View style={ui.flex}><Field label="Rate %" numeric value={afford.rate} onChangeText={v => setAfford(a => ({ ...a, rate: v }))} /></View><View style={ui.flex}><Field label="Months" numeric value={afford.months} onChangeText={v => setAfford(a => ({ ...a, months: v }))} /></View></View>}
                    {affordResult?.error && <Notice>{affordResult.error}</Notice>}
                    {affordResult && !affordResult.error && <>
                        <Badge text={VERDICT[affordResult.verdict][0].toUpperCase()} color={VERDICT[affordResult.verdict][1]} />
                        {affordResult.reasons.map((r, i) => <Text key={i} style={ui.text}>• {r}</Text>)}
                        {affordResult.emi > 0 && <KeyValue label="Monthly instalment" value={money.format(affordResult.emi)} />}
                        <KeyValue label="Cash left after" value={money.format(affordResult.cashAfter)} color={affordResult.cashAfter < 0 ? palette.danger : undefined} />
                        <KeyValue label="Runway after" value={`${affordResult.runwayAfterMonths} months`} />
                        {affordResult.monthsToSaveBeforeBuying > 0 && <KeyValue label="Comfortable if you wait" value={`${affordResult.monthsToSaveBeforeBuying} months`} color={palette.warning} />}
                    </>}
                </Card>}
                {tool === 'whatif' && wiResult && <Card title="What if…" subtitle="Change income or spending, add a one-time shock, and see the path.">
                    <View style={ui.row}><View style={ui.flex}><Field label="Income change %" numeric value={wi.incomeDelta} onChangeText={v => setWi(w => ({ ...w, incomeDelta: v }))} /></View><View style={ui.flex}><Field label="Spending change %" numeric value={wi.expenseDelta} onChangeText={v => setWi(w => ({ ...w, expenseDelta: v }))} /></View></View>
                    <View style={ui.row}><View style={ui.flex}><MoneyField label="One-time shock" value={wi.shock} onChangeText={v => setWi(w => ({ ...w, shock: v }))} /></View><View style={ui.flex}><Field label="Months" numeric value={wi.months} onChangeText={v => setWi(w => ({ ...w, months: v }))} /></View></View>
                    <View style={ui.wrap}><Chip label="Lose job" onPress={() => setWi(w => ({ ...w, incomeDelta: '-100' }))} /><Chip label="Medical bill" onPress={() => setWi(w => ({ ...w, shock: String(Math.round(ctx.monthlyExpenses * 3)) }))} /><Chip label="10% raise" onPress={() => setWi(w => ({ ...w, incomeDelta: '10' }))} /><Chip label="Cut spending 15%" onPress={() => setWi(w => ({ ...w, expenseDelta: '-15' }))} /><Chip label="Reset" onPress={() => setWi({ incomeDelta: '0', expenseDelta: '0', shock: '', months: '12' })} /></View>
                    <KeyValue label="Monthly surplus" value={money.format(wiResult.monthlySurplus)} color={wiResult.monthlySurplus >= 0 ? palette.success : palette.danger} />
                    {wiResult.runsOutInMonth && <KeyValue label="Cash runs out in" value={`month ${wiResult.runsOutInMonth}`} color={palette.danger} />}
                    <KeyValue label={`Cash after ${wiResult.path.length} months`} value={money.format(wiResult.endCash)} />
                    <KeyValue label="Net worth then" value={money.format(wiResult.endNetWorth)} />
                </Card>}
                {tool === 'subs' && subs && <Card title="Subscription audit" subtitle={`${subs.items.length} recurring payments from Recurring Commitments. Mark how much you use each.`}>
                    {!subs.items.length && <Empty title="No recurring payments" body="Add them in Recurring so this audit can find waste." action="Open Recurring" onAction={() => router.push('/(tabs)/recurring')} />}
                    <KeyValue label="Per year" value={money.format(subs.annualTotal)} /><KeyValue label="Per month" value={money.format(subs.monthlyTotal)} />
                    {subs.wastePerYear > 0 && <KeyValue label="Rarely used, per year" value={money.format(subs.wastePerYear)} color={palette.danger} />}
                    {ctx.recurring.map(r => <ListItem key={r.id}><KeyValue label={`${r.name || r.title} · ${r.frequency || 'monthly'}`} value={money.format(r.amount)} /><View style={ui.wrap}>{['daily', 'weekly', 'rarely', 'never'].map(u => <Chip key={u} label={u} active={(usage[r.id] || r.usage) === u} onPress={() => setUsage(s => ({ ...s, [r.id]: u }))} />)}</View></ListItem>)}
                    {subs.suggestions.map((s, i) => <Text key={i} style={ui.text}>• {s}</Text>)}
                </Card>}
                {tool === 'leaks' && leaks && <Card title="Small leaks" subtitle={`Spends under ${money.format(500)} that repeat, over the last ${leaks.days} days.`}>
                    {!leaks.leaks.length && <Text style={ui.muted}>{leaks.considered ? 'No repeating small spends found.' : 'No small transactions recorded in this window.'}</Text>}
                    {leaks.leaks.map(l => <KeyValue key={l.name} label={`${l.name} · ${l.count}× · avg ${money.format(l.average)}`} value={`${money.format(l.monthly)}/mo`} />)}
                    {!!leaks.leaks.length && <KeyValue label="Adds up to, per year" value={money.format(leaks.yearlyTotal)} color={palette.warning} />}
                </Card>}
                {tool === 'goal' && <Card title="Reach a goal" subtitle="How much per month gets you there, and where your current pace lands.">
                    <View style={ui.row}><View style={ui.flex}><MoneyField label="Target" value={goal.target} onChangeText={v => setGoal(g => ({ ...g, target: v }))} /></View><View style={ui.flex}><MoneyField label="Saved so far" value={goal.saved} onChangeText={v => setGoal(g => ({ ...g, saved: v }))} /></View></View>
                    <View style={ui.row}><View style={ui.flex}><MoneyField label="Monthly now" value={goal.monthly} onChangeText={v => setGoal(g => ({ ...g, monthly: v }))} /></View><View style={ui.flex}><Field label="Months" numeric value={goal.months} onChangeText={v => setGoal(g => ({ ...g, months: v }))} /></View><View style={ui.flex}><Field label="Return %" numeric value={goal.rate} onChangeText={v => setGoal(g => ({ ...g, rate: v }))} /></View></View>
                    {goalResult?.error && <Notice>{goalResult.error}</Notice>}
                    {goalResult && !goalResult.error && <><KeyValue label="You would reach" value={money.format(goalResult.projected)} color={goalResult.onTrack ? palette.success : palette.warning} /><KeyValue label="Needed per month" value={money.format(goalResult.requiredMonthly)} />{goalResult.monthsToTargetAtCurrentPace !== null && <KeyValue label="At current pace" value={`${goalResult.monthsToTargetAtCurrentPace} months`} />}</>}
                    <Btn title="Save as a goal in Tasks & Goals" secondary onPress={() => router.push({ pathname: '/(tabs)/todos', params: { tab: 'goals' } })} />
                </Card>}
                {tool === 'debt' && debt && <Card title="Pay off debt" subtitle="From your saved loans and EMIs.">
                    {!debt.order.length && <Empty title="No debt recorded" body="Add loans or EMIs to plan the payoff." action="Open Loans" onAction={() => router.push('/(tabs)/loans')} />}
                    {!!debt.order.length && <>
                        <Choice options={[{ value: 'avalanche', label: 'Highest rate first (cheapest)' }, { value: 'snowball', label: 'Smallest first (motivating)' }]} value={strategy} onChange={setStrategy} />
                        <MoneyField label="Extra per month" value={extraDebt} onChangeText={setExtraDebt} />
                        <KeyValue label="Debt-free in" value={`${debt.months} months`} color={palette.success} /><KeyValue label="Interest paid" value={money.format(debt.totalInterest)} />
                        <Text style={ui.muted}>Order: {debt.order.join(' → ')}</Text>
                    </>}
                </Card>}
            </>}

            {ctx && tab === 'plan' && <>
                <Text style={ui.muted}>Ranked by what protects you most. Each item opens the module where you act.</Text>
                {plan.map((a, i) => <TouchableOpacity key={a.id} accessibilityRole="button" accessibilityLabel={a.title} onPress={() => router.push(a.route)} style={ui.card}><View style={ui.row}><Badge text={`#${i + 1}`} color={a.priority === 1 ? palette.danger : a.priority === 2 ? palette.warning : palette.info} /><Text style={[ui.heading, ui.flex]}>{a.title}</Text></View><Text style={ui.muted}>{a.why}</Text></TouchableOpacity>)}
                {extras.validity && <Card title="Life admin"><KeyValue label="Documents needing action" value={String(extras.validity.needsAction)} color={extras.validity.needsAction ? palette.warning : palette.success} /><KeyValue label="Tasks overdue" value={String(extras.tasks?.overdue ?? 0)} color={extras.tasks?.overdue ? palette.danger : undefined} /><KeyValue label="Goals behind pace" value={String(extras.goals?.behind ?? 0)} /></Card>}
            </>}

            {ctx && tab === 'ask' && <>
                <Card title="Ask about your money" subtitle="Answers come from your saved data, on this device.">
                    {chat.map((m, i) => <View key={i} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', backgroundColor: m.sender === 'user' ? '#6366F1' : '#27272A', padding: 12, borderRadius: 14, maxWidth: '90%' }}><Text style={[ui.text, m.sender === 'user' && { color: '#FFF' }]}>{m.text}</Text></View>)}
                    <View style={ui.wrap}>{['Can I afford 25,000?', 'My runway', 'My debt', 'Subscriptions', 'How much should I save?'].map(q => <Chip key={q} label={q} onPress={() => send(q)} />)}</View>
                    <View style={ui.row}>
                        <TextInput accessibilityLabel="Your question" style={[ui.input, ui.flex]} placeholder="Type a question" placeholderTextColor="#87879C" value={input} onChangeText={setInput} onSubmitEditing={() => send()} returnKeyType="send" />
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send" onPress={() => send()} style={[ui.button, { width: 48, paddingHorizontal: 0 }]}><Send size={18} color="#FFF" /></TouchableOpacity>
                    </View>
                </Card>
            </>}
        </Screen>
    );
}
