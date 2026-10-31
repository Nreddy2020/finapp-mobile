import React, { useState, useCallback } from 'react';
import { View, Text, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
    Page,
    Action,
    Field,
    Notice,
    ui,
    useAction
} from '../../components/family/navigation/FamilyUI.js';
import { useFamilySelection } from '../../components/family/navigation/FamilySelection.js';
import {
    FamilyHouseholdService,
    FamilyPersonService,
    FamilyRepository
} from '../../services/family/index.js';
import {
    createEmptyPerson,
    createEmptyMembership,
    HouseholdRole
} from '../../services/family/familyContracts.js';
const readable = (value) => value.toLowerCase().replaceAll('_', ' ');
export default function FamilyPeople() {
    const {
        householdId,
        household,
        refresh: refreshContext
    } = useFamilySelection();
    const [members, setMembers] = useState([]);
    const [people, setPeople] = useState([]);
    const [form, setForm] = useState(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('MEMBER');
    const [existingId, setExistingId] = useState(null);
    const { busy, error, run } = useAction();
    const load = async () => {
        const [hh, all] = await Promise.all([
            FamilyHouseholdService.getHouseholdWithMembers(householdId),
            FamilyRepository.listPeople()
        ]);
        setMembers(hh?.members || []);
        setPeople(all);
        await refreshContext();
    };
    useFocusEffect(
        useCallback(() => {
            run(load);
        }, [householdId])
    );
    function open(member) {
        setForm(member || {});
        setName(member?.fullName || '');
        setPhone(member?.person?.phone || '');
        setRole(member?.role || 'MEMBER');
        setExistingId(null);
    }
    async function save() {
        if (form.personId) {
            await FamilyPersonService.updatePerson(form.personId, {
                fullName: name,
                phone
            });
            if (form.role !== role)
                await FamilyHouseholdService.updateMembershipRole(
                    form.membershipId,
                    role
                );
        } else {
            const person = existingId
                ? people.find((p) => p.id === existingId)
                : createEmptyPerson({
                      fullName: name,
                      phone
                  });
            await FamilyRepository.addPersonToHousehold(
                person,
                createEmptyMembership({
                    householdId,
                    personId: person.id,
                    role
                })
            );
        }
        setForm(null);
        await load();
    }
    return (
        <Page
            title="People"
            subtitle="Family and household members"
            household={household}
            topTabs
            loading={busy}
            error={error}
            retry={() => run(load)}
        >
            <Text style={ui.title}>Your people</Text>
            <Text style={ui.muted}>
                A person can belong to more than one household. Reuse their
                existing profile to keep details together.
            </Text>
            {!form && <Action title="Add member" onPress={() => open()} />}
            {form && (
                <View style={ui.card}>
                    <Text style={ui.heading}>
                        {form.personId
                            ? 'Edit member'
                            : 'Add a household member'}
                    </Text>
                    {!form.personId &&
                        people
                            .filter(
                                (p) => !members.some((m) => m.personId === p.id)
                            )
                            .map((p) => (
                                <Action
                                    key={p.id}
                                    secondary
                                    title={
                                        (existingId === p.id
                                            ? 'Selected: '
                                            : 'Use existing: ') + p.fullName
                                    }
                                    onPress={() => setExistingId(p.id)}
                                    disabled={busy}
                                />
                            ))}
                    {!form.personId && existingId && (
                        <Action
                            title="Create a new person instead"
                            secondary
                            onPress={() => setExistingId(null)}
                        />
                    )}
                    {!existingId && (
                        <>
                            <Field
                                label="Full name"
                                value={name}
                                onChangeText={setName}
                            />
                            <Field
                                label="Phone (optional)"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </>
                    )}
                    <Text style={ui.label}>Household role</Text>
                    <View style={ui.row}>
                        {Object.values(HouseholdRole).map((r) => (
                            <Action
                                key={r}
                                title={readable(r)}
                                secondary={role !== r}
                                disabled={busy}
                                onPress={() => setRole(r)}
                            />
                        ))}
                    </View>
                    <Action
                        title="Save member"
                        disabled={busy || (!existingId && !name.trim())}
                        onPress={() => run(save)}
                    />
                    <Action
                        title="Cancel"
                        secondary
                        disabled={busy}
                        onPress={() => setForm(null)}
                    />
                </View>
            )}
            {!members.length && !busy && (
                <Text style={ui.muted}>
                    No members yet. Add the people who belong to this household.
                </Text>
            )}
            {members.map((m) => (
                <View key={m.membershipId} style={ui.card}>
                    <Text style={ui.heading}>{m.fullName}</Text>
                    <Text style={ui.muted}>
                        {readable(m.role)} ·{' '}
                        {m.status === 'ACTIVE'
                            ? 'Confirmed'
                            : 'Awaiting confirmation'}
                    </Text>
                    {m.person?.phone && (
                        <Text style={ui.text}>{m.person.phone}</Text>
                    )}
                    <Action
                        title={'Edit ' + m.fullName}
                        secondary
                        disabled={busy}
                        onPress={() => open(m)}
                    />
                    {m.status === 'PROVISIONAL_PENDING_CONFIRMATION' && (
                        <Action
                            title={'Confirm ' + m.fullName}
                            disabled={busy}
                            onPress={() =>
                                run(async () => {
                                    await FamilyHouseholdService.confirmProvisionalMembership(
                                        m.membershipId
                                    );
                                    await load();
                                })
                            }
                        />
                    )}
                    <Action
                        title={'Remove ' + m.fullName + ' from household'}
                        danger
                        secondary
                        disabled={busy}
                        onPress={() =>
                            Alert.alert(
                                'Remove household membership?',
                                'Their profile and records remain saved. Assigned work may need review.',
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
                                                await FamilyHouseholdService.archiveMembership(
                                                    m.membershipId
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
