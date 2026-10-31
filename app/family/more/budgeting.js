import { hasSamplePoolData } from '../../../services/family/familySourceQuality.js';
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
    FamilyBudgetPoolService
} from '../../../services/family/index.js';
import BudgetPoolCard from '../../../components/family/budgeting/BudgetPoolCard.js';
export default function BudgetPools() {
    const { householdId, household } = useFamilySelection();
    const [pools, setPools] = useState([]);
    const [raw, setRaw] = useState([]);
    const [members, setMembers] = useState([]);
    const [form, setForm] = useState(null);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [shares, setShares] = useState({});
    const { busy, error, run } = useAction();
    const load = async () => {
        const [evaluation, records, people] = await Promise.all([
            FamilyBudgetPoolService.getHouseholdBudgetPools(householdId),
            FamilyRepository.getBudgetPools(householdId),
            FamilyRepository.getMembers(householdId)
        ]);
        setPools(evaluation.evaluatedPools.map(pool => ({ ...pool, id: pool.poolId })));
        setRaw(records);
        setMembers(people);
    };
    useFocusEffect(
        useCallback(() => {
            run(load);
        }, [householdId])
    );
    function open(pool = {}) {
        setForm(pool);
        setName(pool.name || '');
        setAmount(pool.monthlyCeiling?.toString() || '');
        setCurrency(pool.currency || 'INR');
        const versions = pool.contributorSplitVersions || [];
        setShares(
            Object.fromEntries(
                (versions[versions.length - 1]?.contributorSplits || []).map(
                    (s) => [s.personId, String(s.targetRatioPercent)]
                )
            )
        );
    }
    return (
        <Page
            title="Shared budgets"
            subtitle="Plan spending and who contributes"
            household={household}
            loading={busy}
            error={error}
            retry={() => run(load)}
        >
            <Text style={ui.muted}>
                Set a monthly spending limit and agree on contribution shares.
            </Text>
            {!form && (
                <Action title="Create budget pool" onPress={() => open()} />
            )}
            {!pools.length && !busy && (
                <View style={ui.card}>
                    <Text style={ui.heading}>Start a shared budget</Text>
                    <Text style={ui.muted}>
                        Choose a real expense category, such as groceries or
                        household utilities.
                    </Text>
                </View>
            )}
            {form && (
                <View style={ui.card}>
                    <Field
                        label="Pool name"
                        value={name}
                        onChangeText={setName}
                    />
                    <Field
                        label="Monthly limit"
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
                    <Text style={ui.muted}>
                        Shares must total 100%. Changes apply from this month.
                    </Text>
                    {members.map((p) => (
                        <Field
                            key={p.id}
                            label={(p.fullName || p.name) + ' share (%)'}
                            value={shares[p.id] || ''}
                            keyboardType="decimal-pad"
                            onChangeText={(v) =>
                                setShares({
                                    ...shares,
                                    [p.id]: v
                                })
                            }
                        />
                    ))}
                    <Action
                        title="Save budget pool"
                        disabled={busy || !name.trim()}
                        onPress={() =>
                            run(async () => {
                                const ceiling = Number(amount);
                                if (
                                    !amount.trim() ||
                                    !Number.isFinite(ceiling) ||
                                    ceiling < 0
                                )
                                    throw Error(
                                        'Enter a monthly limit of zero or more.'
                                    );
                                if (!/^[A-Z]{3}$/.test(currency))
                                    throw Error(
                                        'Enter a 3-letter currency code.'
                                    );
                                if (
                                    form.id &&
                                    currency !== form.currency &&
                                    form.linkedExpenses?.length
                                )
                                    throw Error(
                                        'Currency cannot change while expenses are linked.'
                                    );
                                const contributorSplits = members
                                    .filter((m) => Number(shares[m.id]) > 0)
                                    .map((m) => ({
                                        personId: m.id,
                                        targetRatioPercent: Number(shares[m.id])
                                    }));
                                if (
                                    members.some(
                                        (m) =>
                                            shares[m.id] &&
                                            (!Number.isFinite(
                                                Number(shares[m.id])
                                            ) ||
                                                Number(shares[m.id]) < 0)
                                    ) ||
                                    Math.abs(
                                        contributorSplits.reduce(
                                            (sum, s) =>
                                                sum + s.targetRatioPercent,
                                            0
                                        ) - 100
                                    ) > 0.001
                                )
                                    throw Error(
                                        'Contribution shares must total 100%.'
                                    );
                                const effectivePeriod = new Date()
                                    .toISOString()
                                    .slice(0, 7);
                                const versions = (
                                    form.contributorSplitVersions || []
                                ).filter(
                                    (v) => v.effectivePeriod !== effectivePeriod
                                );
                                await FamilyBudgetPoolService.savePool(
                                    householdId,
                                    {
                                        ...form,
                                        name: name.trim(),
                                        monthlyCeiling: ceiling,
                                        currency,
                                        contributorSplitVersions: [
                                            ...versions,
                                            {
                                                effectivePeriod,
                                                contributorSplits
                                            }
                                        ]
                                    }
                                );
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
            {pools
                .filter((p) => !p.isArchived)
                .map((p) => (
                    <View
                        key={p.id}
                        style={{
                            gap: 8
                        }}
                    >
                        {hasSamplePoolData(
                            raw.find((record) => record.id === p.id) || {}
                        ) ? (
                            <View style={ui.card}>
                                <Text style={ui.heading}>{p.name}</Text>
                                <Text style={ui.muted}>
                                    This saved pool contains sample entries from
                                    an earlier version. It is excluded from
                                    forecasts. Archive it and create a budget
                                    using your own figures.
                                </Text>
                            </View>
                        ) : (
                            <BudgetPoolCard pool={p} />
                        )}
                        <Action
                            title={'Edit ' + p.name}
                            secondary
                            onPress={() => open(raw.find((r) => r.id === p.id))}
                        />
                        <Action
                            title={'Archive ' + p.name}
                            secondary
                            disabled={busy}
                            onPress={() =>
                                Alert.alert(
                                    'Archive budget pool?',
                                    'The pool and its linked expense records remain saved.',
                                    [
                                        {
                                            text: 'Cancel',
                                            style: 'cancel'
                                        },
                                        {
                                            text: 'Archive',
                                            onPress: () =>
                                                run(async () => {
                                                    await FamilyBudgetPoolService.archivePool(
                                                        householdId,
                                                        p.id
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
