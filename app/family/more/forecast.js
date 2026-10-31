import React, { useState, useCallback } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
    FamilyForecastService
} from '../../../services/family/index.js';
import ForecastOverviewCard from '../../../components/family/forecast/ForecastOverviewCard.js';
import RiskIndicatorsList from '../../../components/family/forecast/RiskIndicatorsList.js';
export default function Forecast() {
    const router = useRouter();
    const { householdId, household } = useFamilySelection();
    const [horizon, setHorizon] = useState(30);
    const [data, setData] = useState(null);
    const [members, setMembers] = useState([]);
    const [streams, setStreams] = useState([]);
    const [form, setForm] = useState(null);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [day, setDay] = useState('1');
    const [person, setPerson] = useState(null);
    const [adjustment, setAdjustment] = useState('');
    const [preview, setPreview] = useState(null);
    const { busy, error, run } = useAction();
    const load = async () => {
        const [forecast, people, income] = await Promise.all([
            FamilyForecastService.getHouseholdForecast(householdId, {
                horizonDays: horizon
            }),
            FamilyRepository.getMembers(householdId),
            FamilyRepository.getMemberIncomeStreams(householdId)
        ]);
        setData(forecast);
        setMembers(people);
        setStreams(income);
        setPreview(null);
    };
    useFocusEffect(
        useCallback(() => {
            run(load);
        }, [householdId, horizon])
    );
    function open(stream = {}) {
        setForm(stream);
        setName(stream.sourceName || '');
        setAmount(stream.amount?.toString() || '');
        setCurrency(stream.currency || 'INR');
        setDay(String(stream.payDayOfMonth || 1));
        setPerson(stream.personId || null);
    }
    return (
        <Page
            title="Financial forecast"
            subtitle="Plan with your saved income and expenses"
            household={household}
            loading={busy}
            error={error}
            retry={() => run(load)}
        >
            <Text style={ui.muted}>
                This estimates changes in cash over time, starting from zero. It
                is not your bank balance. Missing records make the forecast
                incomplete.
            </Text>
            <View style={ui.row}>
                {[7, 30, 90, 365].map((d) => (
                    <Action
                        key={d}
                        title={d + ' days'}
                        secondary={horizon !== d}
                        disabled={busy}
                        onPress={() => setHorizon(d)}
                    />
                ))}
            </View>
            {data && (
                <>
                    <ForecastOverviewCard
                        showHorizons={false}
                        summary={data.summary}
                        selectedHorizon={horizon}
                        onSelectHorizon={setHorizon}
                        divergenceWarning={
                            data.summary?.currencyDivergenceWarning
                        }
                    />
                    {data.summary?.confidenceScore?.missingFactors?.length &&
                    !data.riskIndicators?.length ? (
                        <Text style={ui.muted}>
                            More records are needed before cash-flow risks can
                            be assessed.
                        </Text>
                    ) : (
                        <RiskIndicatorsList
                            riskIndicators={data.riskIndicators}
                        />
                    )}
                </>
            )}
            <View style={ui.card}>
                <Text style={ui.heading}>Income schedule</Text>
                {!streams.length && (
                    <Text style={ui.muted}>
                        No income is recorded. Add a schedule to estimate
                        inflows.
                    </Text>
                )}
                {streams.map((s) => (
                    <View key={s.id}>
                        <Text style={ui.text}>
                            {s.sourceName} · {s.currency}{' '}
                            {s.amount} / month
                        </Text>
                        <Action
                            title={'Edit ' + s.sourceName}
                            secondary
                            disabled={busy}
                            onPress={() => open(s)}
                        />
                    </View>
                ))}
                {!form && (
                    <Action
                        title="Add income schedule"
                        onPress={() => open()}
                    />
                )}
                <Action
                    title="Review linked expenses"
                    secondary
                    onPress={() => router.push('/family/more/financials')}
                />
            </View>
            {form && (
                <View style={ui.card}>
                    <Text style={ui.heading}>Income schedule</Text>
                    <Field
                        label="Income source"
                        value={name}
                        onChangeText={setName}
                    />
                    <Field
                        label="Monthly amount"
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
                        label="Pay day (1–31)"
                        value={day}
                        onChangeText={setDay}
                        keyboardType="number-pad"
                    />
                    <Text style={ui.label}>Whose income?</Text>
                    {members.map((p) => (
                        <Action
                            key={p.id}
                            title={p.fullName || p.name}
                            secondary={person !== p.id}
                            onPress={() => setPerson(p.id)}
                        />
                    ))}
                    <Action
                        title="Save income"
                        disabled={busy || !person || !name.trim()}
                        onPress={() =>
                            run(async () => {
                                if (
                                    !Number.isFinite(Number(amount)) ||
                                    Number(amount) <= 0
                                )
                                    throw Error(
                                        'Enter a monthly amount greater than zero.'
                                    );
                                if (
                                    !Number.isInteger(Number(day)) ||
                                    Number(day) < 1 ||
                                    Number(day) > 31
                                )
                                    throw Error(
                                        'Choose a pay day from 1 to 31.'
                                    );
                                if (!/^[A-Z]{3}$/.test(currency))
                                    throw Error(
                                        'Enter a 3-letter currency code.'
                                    );
                                await FamilyRepository.saveMemberIncomeStream(
                                    householdId,
                                    {
                                        ...form,
                                        sourceName: name.trim(),
                                        amount: Number(amount),
                                        currency,
                                        payDayOfMonth: Number(day),
                                        personId: person,
                                        frequency: 'MONTHLY',
                                        status: 'ACTIVE'
                                    }
                                );
                                setForm(null);
                                await load();
                            })
                        }
                    />
                    {form.id && (
                        <Action
                            title="Remove income schedule"
                            secondary
                            disabled={busy}
                            onPress={() =>
                                Alert.alert(
                                    'Remove income schedule?',
                                    'This changes the forecast, not any bank records.',
                                    [
                                        {
                                            text: 'Cancel',
                                            style: 'cancel'
                                        },
                                        {
                                            text: 'Remove',
                                            style: 'destructive',
                                            onPress: () =>
                                                run(async () => {
                                                    await FamilyRepository.deleteMemberIncomeStream(
                                                        householdId,
                                                        form.id
                                                    );
                                                    setForm(null);
                                                    await load();
                                                })
                                        }
                                    ]
                                )
                            }
                        />
                    )}
                    <Action
                        title="Cancel"
                        secondary
                        disabled={busy}
                        onPress={() => setForm(null)}
                    />
                </View>
            )}
            <View style={ui.card}>
                <Text style={ui.heading}>What if income changes?</Text>
                <Text style={ui.muted}>
                    Preview only. Your saved schedules stay as they are.
                </Text>
                <Field
                    label="Income change (%)"
                    value={adjustment}
                    onChangeText={setAdjustment}
                    keyboardType="numbers-and-punctuation"
                />
                <Action
                    title="Preview forecast"
                    disabled={busy || !data}
                    onPress={() =>
                        run(async () => {
                            const value = Number(adjustment);
                            if (
                                !Number.isFinite(value) ||
                                value < -100 ||
                                value > 1000
                            )
                                throw Error(
                                    'Enter a percentage from -100 to 1000.'
                                );
                            setPreview(
                                await FamilyForecastService.simulateScenario(
                                    householdId,
                                    {
                                        name: 'Income change',
                                        incomeAdjustmentPercent: value,
                                        expenseShocks: [],
                                        defaultingContributorId: null
                                    },
                                    {
                                        horizonDays: horizon,
                                        referenceDateUtc:
                                            data.referenceDateUtc ||
                                            data.summary?.referenceDateUtc
                                    }
                                )
                            );
                        })
                    }
                />
                {preview && (
                    <>
                        <Text style={ui.heading}>Preview result</Text>
                        <Text style={ui.text}>
                            {preview.summary?.currency || ''}
                            {preview.summary?.netProjectedLiquidityDelta ===
                            null
                                ? 'Totals unavailable for mixed currencies'
                                : Number(
                                      preview.summary
                                          ?.netProjectedLiquidityDelta || 0
                                  ).toLocaleString()}{' '}
                            projected cash change
                        </Text>
                        <Action
                            title="Clear preview"
                            secondary
                            onPress={() => setPreview(null)}
                        />
                    </>
                )}
            </View>
        </Page>
    );
}
