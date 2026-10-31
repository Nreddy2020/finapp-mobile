import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
    Page,
    Action,
    ui,
    useAction
} from '../../components/family/navigation/FamilyUI.js';
import { useFamilySelection } from '../../components/family/navigation/FamilySelection.js';
import {
    FamilyOperationsService,
    FamilyHouseholdService,
    FamilyRepository
} from '../../services/family/index.js';
export default function FamilyHome() {
    const router = useRouter();
    const { householdId, household } = useFamilySelection();
    const [data, setData] = useState(null);
    const { error, run, busy } = useAction();
    const refresh = useCallback(
        () =>
            run(async () => {
                const [summary, members, contacts, goals] = await Promise.all([
                    FamilyOperationsService.getOperationalSummary(householdId),
                    FamilyHouseholdService.getHouseholdWithMembers(householdId),
                    FamilyRepository.listEmergencyContacts(householdId),
                    FamilyRepository.getGoals(householdId)
                ]);
                setData({
                    summary,
                    members,
                    contacts,
                    goals
                });
            }),
        [householdId]
    );
    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );
    return (
        <Page
            title="Family Home"
            subtitle="Care for today. Plan for tomorrow."
            household={household}
            topTabs
            loading={busy}
            error={error}
            retry={refresh}
        >
            <View style={{ gap: 6, paddingVertical: 4 }}>
                <Text style={ui.title}>Welcome home</Text>
                <Text style={ui.muted}>
                    Keep the people, plans and responsibilities that matter in
                    one place.
                </Text>
            </View>
            {data && (
                <>
                    <View style={ui.card}>
                        <Text style={ui.heading}>Today and next</Text>
                        <Text style={ui.text}>
                            {data.summary.overdueTasks || 0} overdue ·{' '}
                            {data.summary.dueToday || 0} tasks due today
                        </Text>
                        <Action
                            title="View tasks"
                            onPress={() => router.push('/family/operations')}
                        />
                        {!data.contacts.length && (
                            <>
                                <Text style={ui.muted}>
                                    Add an emergency contact so help is easy to
                                    find.
                                </Text>
                                <Action
                                    title="Add emergency contacts"
                                    secondary
                                    onPress={() =>
                                        router.push('/family/protection')
                                    }
                                />
                            </>
                        )}
                    </View>
                    <View style={ui.card}>
                        <Text style={ui.heading}>Your household</Text>
                        <Text style={ui.text}>
                            {`${data.members?.confirmedCount || 0} confirmed ${data.members?.confirmedCount === 1 ? 'member' : 'members'}`}
                            {data.members?.provisionalCount
                                ? ` · ${data.members.provisionalCount} awaiting confirmation`
                                : ''}
                        </Text>
                        <Action
                            title="Manage people"
                            secondary
                            onPress={() => router.push('/family/people')}
                        />
                    </View>
                    <View style={ui.card}>
                        <Text style={ui.heading}>
                            Make room for what is next
                        </Text>
                        <Text style={ui.muted}>
                            {`${data.goals.length} saved ${data.goals.length === 1 ? 'goal' : 'goals'}.`} Plan a school year,
                            review upcoming renewals or set a savings target.
                        </Text>
                        <Action
                            title="Plan a life event"
                            onPress={() =>
                                router.push('/family/more/life-events')
                            }
                        />
                        <Action
                            title="Goals and milestones"
                            secondary
                            onPress={() => router.push('/family/more/goals')}
                        />
                    </View>
                </>
            )}
        </Page>
    );
}
