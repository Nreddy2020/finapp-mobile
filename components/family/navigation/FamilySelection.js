import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FamilyHouseholdService } from '../../../services/family/familyHouseholdService.js';
import { FamilyRepository } from '../../../services/family/familyRepository.js';
import {
    createEmptyHousehold,
    createEmptyPerson,
    createEmptyMembership
} from '../../../services/family/familyContracts.js';
import { StorageService, STORAGE_KEYS } from '../../../services/storage.js';
import { Action, Field, Notice, useAction, ui } from './FamilyUI.js';
const Context = createContext(null);
export const useFamilySelection = () => useContext(Context);
export default function FamilySelection({ children }) {
    const router = useRouter();
    const [households, setHouseholds] = useState([]);
    const [people, setPeople] = useState([]);
    const [selected, setSelected] = useState(null);
    const [choosing, setChoosing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const [personName, setPersonName] = useState('');
    const [personId, setPersonId] = useState(null);
    const { busy, error, run } = useAction();
    async function refresh() {
        const [list, persons] = await Promise.all([
            FamilyHouseholdService.listHouseholds(),
            FamilyRepository.listPeople()
        ]);
        setHouseholds(list.filter((h) => h.status === 'ACTIVE'));
        setPeople(persons);
        return list;
    }
    async function initialize() {
        setLoading(true);
        try {
            const list = await refresh();
            const id = await StorageService.load(STORAGE_KEYS.FAMILY_SELECTION);
            setSelected(
                list.some((h) => h.id === id && h.status === 'ACTIVE')
                    ? id
                    : null
            );
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        run(initialize);
    }, []);
    async function select(id) {
        const list = await refresh();
        if (!list.some((h) => h.id === id && h.status === 'ACTIVE'))
            throw Error('This household is no longer active. Choose another.');
        const result = await StorageService.save(
            STORAGE_KEYS.FAMILY_SELECTION,
            id,
            {
                atomic: true
            }
        );
        if (!result.success)
            throw Error('Could not remember this household. Please retry.');
        setSelected(id);
        setChoosing(false);
        setCreating(false);
    }
    const value = {
        householdId: selected,
        household: households.find((h) => h.id === selected),
        refresh,
        changeHousehold: () => {
            setChoosing(true);
            run(refresh);
        }
    };
    if (loading)
        return (
            <SafeAreaView style={ui.root}>
                <ActivityIndicator
                    color="#F05298"
                    accessibilityLabel="Loading households"
                />
            </SafeAreaView>
        );
    if (!selected || choosing)
        return (
            <Context.Provider value={value}>
                <SafeAreaView style={ui.root} edges={[]}>
                    <ScrollView
                        contentContainerStyle={ui.content}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Action
                            title="FinLife Home"
                            secondary
                            onPress={() => router.replace('/(tabs)')}
                        />
                        <Text style={ui.title}>Your family, together</Text>
                        <Text style={ui.muted}>
                            Choose the household you want to manage. Your choice
                            follows you across Family.
                        </Text>
                        <Notice>{error}</Notice>
                        {error && (
                            <Action
                                title="Retry households"
                                onPress={() => run(initialize)}
                            />
                        )}
                        {!creating && (
                            <>
                                {households.map((h) => (
                                    <Action
                                        key={h.id}
                                        title={h.name}
                                        secondary={h.id !== selected}
                                        disabled={busy}
                                        onPress={() => run(() => select(h.id))}
                                    />
                                ))}
                                {!households.length && (
                                    <Text style={ui.text}>
                                        Start with a household and its first
                                        member.
                                    </Text>
                                )}
                                <Action
                                    title="Create household"
                                    secondary
                                    onPress={() => setCreating(true)}
                                />
                                {selected && (
                                    <Action
                                        title="Keep current household"
                                        secondary
                                        onPress={() => setChoosing(false)}
                                    />
                                )}
                            </>
                        )}
                        {creating && (
                            <View style={ui.card}>
                                <Text style={ui.heading}>New household</Text>
                                <Field
                                    label="Household name"
                                    value={name}
                                    onChangeText={setName}
                                />
                                <Text style={ui.text}>First member</Text>
                                {people.map((p) => (
                                    <Action
                                        key={p.id}
                                        title={
                                            (personId === p.id
                                                ? 'Selected: '
                                                : 'Use existing: ') + p.fullName
                                        }
                                        secondary
                                        disabled={busy}
                                        onPress={() => setPersonId(p.id)}
                                    />
                                ))}
                                <Action
                                    title="Add a new person"
                                    secondary
                                    onPress={() => setPersonId(null)}
                                />
                                {!personId && (
                                    <Field
                                        label="Full name"
                                        value={personName}
                                        onChangeText={setPersonName}
                                    />
                                )}
                                <Action
                                    title="Save household"
                                    disabled={
                                        busy ||
                                        !name.trim() ||
                                        (!personId && !personName.trim())
                                    }
                                    onPress={() =>
                                        run(async () => {
                                            const person = personId
                                                ? people.find(
                                                      (p) => p.id === personId
                                                  )
                                                : createEmptyPerson({
                                                      fullName: personName
                                                  });
                                            const household =
                                                createEmptyHousehold({
                                                    name
                                                });
                                            const membership =
                                                createEmptyMembership({
                                                    householdId: household.id,
                                                    personId: person.id,
                                                    role: 'HEAD'
                                                });
                                            await FamilyRepository.createHouseholdWithMember(
                                                household,
                                                person,
                                                membership
                                            );
                                            setCreating(false);
                                            setName('');
                                            setPersonName('');
                                            await refresh();
                                            await select(household.id);
                                        })
                                    }
                                />
                                <Action
                                    title="Cancel"
                                    secondary
                                    disabled={busy}
                                    onPress={() => setCreating(false)}
                                />
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Context.Provider>
        );
    return (
        <Context.Provider value={value}>
            <React.Fragment key={selected}>{children}</React.Fragment>
        </Context.Provider>
    );
}
