import React, { useState, useCallback } from 'react';
import { View, Text, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
    Page,
    Action,
    Field,
    ui,
    useAction
} from '../../../components/family/navigation/FamilyUI.js';
import { useFamilySelection } from '../../../components/family/navigation/FamilySelection.js';
import {
    FamilyRepository,
    FamilyGoalService,
    simulateGoalScenarioPure
} from '../../../services/family/index.js';
import GoalCard from '../../../components/family/goals/GoalCard.js';
import GoalScenarioSimulatorCard from '../../../components/family/goals/GoalScenarioSimulatorCard.js';
function dateValue(text) {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
        Number.isNaN(Date.parse(text)) ||
        new Date(text).toISOString().slice(0, 10) !== text
    )
        throw Error('Use a valid date in YYYY-MM-DD format.');
    return text + 'T12:00:00.000Z';
}
export default function Goals() {
    const { householdId, household } = useFamilySelection();
    const [goals, setGoals] = useState([]);
    const [members, setMembers] = useState([]);
    const [form, setForm] = useState(null);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [date, setDate] = useState('');
    const [entry, setEntry] = useState(null);
    const [person, setPerson] = useState(null);
    const [entryAmount, setEntryAmount] = useState('');
    const [entryName, setEntryName] = useState('');
    const [entryDate, setEntryDate] = useState('');
    const [simulation, setSimulation] = useState(null);
    const { busy, error, run } = useAction();
    const load = async () => {
        const [data, people] = await Promise.all([
            FamilyGoalService.getHouseholdGoals(householdId),
            FamilyRepository.getMembers(householdId)
        ]);
        setGoals(data.goals);
        setMembers(people);
    };
    useFocusEffect(
        useCallback(() => {
            run(load);
        }, [householdId])
    );
    function open(goal = {}) {
        setForm(goal);
        setTitle(goal.title || '');
        setAmount(goal.targetAmount?.toString() || '');
        setCurrency(goal.currency || 'INR');
        setDate(goal.targetDateUtc?.slice(0, 10) || '');
        setEntry(null);
    }
    function openEntry(goal, kind) {
        setEntry({
            goal,
            kind
        });
        setEntryAmount('');
        setEntryName('');
        setEntryDate('');
        setPerson(null);
        setForm(null);
    }
    return (
        <Page
            title="Goals and milestones"
            subtitle="Turn family plans into steady progress"
            household={household}
            loading={busy}
            error={error}
            retry={() => run(load)}
        >
            <Text style={ui.muted}>
                Track targets, member pledges and amounts you record. No money
                is moved.
            </Text>
            {!form && !entry && (
                <Action title="Create goal" onPress={() => open()} />
            )}
            {!goals.length && !busy && (
                <View style={ui.card}>
                    <Text style={ui.heading}>
                        What would you like to work towards?
                    </Text>
                    <Text style={ui.muted}>
                        Start with an education fund, a reserve for emergencies
                        or another family priority.
                    </Text>
                </View>
            )}
            {form && (
                <View style={ui.card}>
                    <Text style={ui.heading}>
                        {form.id ? 'Edit goal' : 'New goal'}
                    </Text>
                    <Field
                        label="Goal title"
                        value={title}
                        onChangeText={setTitle}
                    />
                    <Field
                        label="Target amount"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                    />
                    <Field
                        label="Currency (3 letters)"
                        value={currency}
                        onChangeText={(v) => setCurrency(v.toUpperCase())}
                        maxLength={3}
                    />
                    <Field
                        label="Target date (YYYY-MM-DD)"
                        value={date}
                        onChangeText={setDate}
                    />
                    <Action
                        title="Save goal"
                        disabled={busy || !title.trim()}
                        onPress={() =>
                            run(async () => {
                                if (
                                    !Number.isFinite(Number(amount)) ||
                                    Number(amount) <= 0
                                )
                                    throw Error(
                                        'Enter a target greater than zero.'
                                    );
                                if (!/^[A-Z]{3}$/.test(currency))
                                    throw Error(
                                        'Enter a 3-letter currency code.'
                                    );
                                if (
                                    form.id &&
                                    currency !== form.currency &&
                                    (form.accumulations?.length ||
                                        form.pledges?.length)
                                )
                                    throw Error(
                                        'Currency cannot change after progress or pledges are recorded.'
                                    );
                                await FamilyGoalService.saveGoal(householdId, {
                                    ...form,
                                    title: title.trim(),
                                    targetAmount: Number(amount),
                                    currency,
                                    targetDateUtc: dateValue(date)
                                });
                                setForm(null);
                                await load();
                            })
                        }
                    />
                    <Action
                        title="Cancel"
                        secondary
                        disabled={busy}
                        onPress={() => setForm(null)}
                    />
                </View>
            )}
            {entry && (
                <View style={ui.card}>
                    <Text style={ui.heading}>
                        {entry.kind} · {entry.goal.title}
                    </Text>
                    <Field
                        label={'Amount (' + entry.goal.currency + ')'}
                        value={entryAmount}
                        onChangeText={setEntryAmount}
                        keyboardType="decimal-pad"
                    />
                    {entry.kind === 'Milestone' ? (
                        <>
                            <Field
                                label="Milestone name"
                                value={entryName}
                                onChangeText={setEntryName}
                            />
                            <Field
                                label="Milestone date (YYYY-MM-DD)"
                                value={entryDate}
                                onChangeText={setEntryDate}
                            />
                        </>
                    ) : (
                        <>
                            <Text style={ui.label}>Member</Text>
                            {members.map((p) => (
                                <Action
                                    key={p.id}
                                    title={p.fullName || p.name}
                                    secondary={person !== p.id}
                                    onPress={() => setPerson(p.id)}
                                />
                            ))}
                        </>
                    )}
                    <Action
                        title="Save entry"
                        disabled={busy}
                        onPress={() =>
                            run(async () => {
                                const value = Number(entryAmount);
                                if (!Number.isFinite(value) || value <= 0)
                                    throw Error(
                                        'Enter an amount greater than zero.'
                                    );
                                if (entry.kind !== 'Milestone' && !person)
                                    throw Error(
                                        'Choose the member for this entry.'
                                    );
                                if (entry.kind === 'Progress')
                                    await FamilyGoalService.recordAccumulation(
                                        householdId,
                                        entry.goal.id,
                                        {
                                            amount: value,
                                            personId: person,
                                            currency: entry.goal.currency
                                        }
                                    );
                                else if (entry.kind === 'Monthly pledge')
                                    await FamilyGoalService.savePledge(
                                        householdId,
                                        entry.goal.id,
                                        {
                                            amount: value,
                                            personId: person,
                                            currency: entry.goal.currency,
                                            frequency: 'MONTHLY'
                                        }
                                    );
                                else {
                                    if (value > entry.goal.targetAmount)
                                        throw Error(
                                            'A milestone cannot exceed the goal target.'
                                        );
                                    if (!entryName.trim())
                                        throw Error('Enter a milestone name.');
                                    await FamilyGoalService.saveMilestone(
                                        householdId,
                                        entry.goal.id,
                                        {
                                            name: entryName.trim(),
                                            targetAmount: value,
                                            targetDateUtc: dateValue(entryDate)
                                        }
                                    );
                                }
                                setEntry(null);
                                await load();
                            })
                        }
                    />
                    <Action
                        title="Cancel"
                        secondary
                        disabled={busy}
                        onPress={() => setEntry(null)}
                    />
                </View>
            )}
            {simulation && (
                <GoalScenarioSimulatorCard
                    key={simulation.goal.id}
                    goalWithEval={simulation}
                    onClose={() => setSimulation(null)}
                    onSimulate={(input) =>
                        simulateGoalScenarioPure(
                            simulation.evaluation,
                            simulation.goal,
                            input,
                            new Date().toISOString()
                        )
                    }
                />
            )}
            {goals.map((item) => (
                <View
                    key={item.goal.id}
                    style={{
                        gap: 10
                    }}
                >
                    <GoalCard
                        goalWithEval={item}
                        onSimulate={() => setSimulation(item)}
                    />
                    <View style={ui.row}>
                        <Action
                            title={'Edit ' + item.goal.title}
                            secondary
                            disabled={busy}
                            onPress={() => open(item.goal)}
                        />
                        <Action
                            title="Record progress"
                            secondary
                            disabled={busy}
                            onPress={() => openEntry(item.goal, 'Progress')}
                        />
                        <Action
                            title="Add monthly pledge"
                            secondary
                            disabled={busy}
                            onPress={() =>
                                openEntry(item.goal, 'Monthly pledge')
                            }
                        />
                        <Action
                            title="Add milestone"
                            secondary
                            disabled={busy}
                            onPress={() => openEntry(item.goal, 'Milestone')}
                        />
                    </View>
                    <Action
                        title={'Delete ' + item.goal.title}
                        danger
                        secondary
                        disabled={busy}
                        onPress={() =>
                            Alert.alert(
                                'Delete goal?',
                                'This removes its recorded progress, pledges and milestones.',
                                [
                                    {
                                        text: 'Cancel',
                                        style: 'cancel'
                                    },
                                    {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: () =>
                                            run(async () => {
                                                await FamilyGoalService.deleteGoal(
                                                    householdId,
                                                    item.goal.id
                                                );
                                                await load();
                                            })
                                    }
                                ]
                            )
                        }
                    />
                </View>
            ))}
        </Page>
    );
}
