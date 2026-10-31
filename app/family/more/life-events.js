import {useFamilySelection} from '../../../components/family/navigation/FamilySelection.js';
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import FamilyHeader from '../../../components/family/navigation/FamilyHeader.js';
import { FamilyHouseholdService } from '../../../services/family/familyHouseholdService.js';
import { FamilyLifeEventService as service } from '../../../services/family/familyLifeEventService.js';

function Button({ title, onPress, disabled, selected }) {
    return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!disabled, selected: !!selected }} disabled={disabled} onPress={onPress} style={[styles.button, selected && styles.selected, disabled && { opacity: 0.45 }]}><Text style={styles.text}>{title}</Text></TouchableOpacity>;
}
function Field({ label, value, onChangeText }) {
    return <View><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} style={styles.input} value={value} onChangeText={onChangeText} maxLength={200} placeholderTextColor="#71717A" /></View>;
}

export default function LifeEventsScreen() {
    const {householdId: sharedHouseholdId} = useFamilySelection();
    const router = useRouter();
    const [households, setHouseholds] = useState([]);
    const [householdId, setHouseholdId] = useState(sharedHouseholdId);
    const [members, setMembers] = useState([]);
    const [events, setEvents] = useState([]);
    const [eventId, setEventId] = useState(null);
    const [creating, setCreating] = useState(false);
    const [title, setTitle] = useState('Start a New School Year');
    const [targetDate, setTargetDate] = useState('');
    const [coordinator, setCoordinator] = useState(null);
    const [student, setStudent] = useState(null);
    const [preparation, setPreparation] = useState('');
    const [linking, setLinking] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const pending = useRef(false);
    const generation = useRef(0);
    const household = households.find(item => item.id === householdId);
    const event = events.find(item => item.id === eventId);

    const refresh = useCallback(async () => {
        const version = ++generation.current;
        setLoading(true);
        setEvents([]);
        try {
            const list = (await FamilyHouseholdService.listHouseholds()).filter(item => item.status === 'ACTIVE');
            const [people, views] = householdId ? await Promise.all([service.members(householdId), service.listViews(householdId)]) : [[], []];
            if (version !== generation.current) return;
            setHouseholds(list); setMembers(people); setEvents(views);
        } finally {
            if (version === generation.current) setLoading(false);
        }
    }, [householdId]);

    useFocusEffect(useCallback(() => {
        setError('');
        refresh().catch(() => { setEvents([]); setError('Could not load Life Events. Retry to read current data.'); });
        return () => { generation.current++; };
    }, [refresh]));

    async function run(action) {
        if (pending.current) return;
        pending.current = true; setBusy(true); setError('');
        try { await action(); } catch (err) { setError(err.message || 'Could not save. Your input is kept; retry.'); }
        finally { pending.current = false; setBusy(false); }
    }
    function chooseHousehold(id) {
        generation.current++; setHouseholdId(id); setMembers([]); setEvents([]); setEventId(null); setCreating(false); setCoordinator(null); setStudent(null); setLinking(null); setTasks([]); setPreparation('');
    }
    async function chooseTasks(preparationId) {
        setTasks([]); setLinking(preparationId);
        await run(async () => setTasks(await service.listTasks(householdId)));
    }

    return <SafeAreaView style={styles.root} edges={[]}>
        <FamilyHeader title="Life Events" subtitle="Prepare for a new school year" household={household} showContextBanner={!!household} showBack fallbackRoute="/family/more" showTopTabs={false} />
        {error ? <View accessibilityRole="alert" style={styles.error}><Text style={styles.text}>{error}</Text><Button title="Retry refresh" disabled={busy} onPress={() => run(refresh)} /></View> : null}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {(busy || loading) && <ActivityIndicator accessibilityLabel="Loading Life Events" color="#DB2777" />}
            {household && !loading && <>
                {!event && !creating && <>
                    <Text style={styles.heading}>Life events</Text>
                    <Text style={styles.muted}>Plan preparations here. Manage and complete linked tasks in Operations.</Text>
                    {events.map(item => <Button key={item.id} title={`${item.title} · ${item.targetDate}`} onPress={() => { setEventId(item.id); setLinking(null); }} disabled={busy} />)}
                    {!events.length && <Text style={styles.muted}>No life events saved for this household.</Text>}
                    <Button title="Create school-year event" onPress={() => setCreating(true)} disabled={busy || !members.length} />
                    {!members.length && <Text style={styles.muted}>An active household membership is needed for the coordinator and student.</Text>}
                </>}
                {creating && <View style={styles.card}>
                    <Text style={styles.heading}>New school-year event</Text>
                    <Field label="Event title" value={title} onChangeText={setTitle} />
                    <Field label="Target date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} />
                    <Text style={styles.label}>Coordinator</Text>
                    {members.map(person => <Button key={person.id} title={`Coordinator: ${person.preferredName || person.fullName}`} selected={coordinator === person.id} disabled={busy} onPress={() => setCoordinator(person.id)} />)}
                    <Text style={styles.label}>Student</Text>
                    {members.map(person => <Button key={person.id} title={`Student: ${person.preferredName || person.fullName}`} selected={student === person.id} disabled={busy} onPress={() => setStudent(person.id)} />)}
                    <Button title="Save event" disabled={busy || !coordinator || !student} onPress={() => run(async () => {
                        const saved = await service.createEvent({ householdId, title, targetDate, coordinatorPersonId: coordinator, beneficiaryPersonId: student });
                        setCreating(false); setEventId(saved.id); await refresh();
                    })} />
                    <Button title="Cancel" disabled={busy} onPress={() => setCreating(false)} />
                </View>}
                {event && !creating && <>
                    <Button title="All life events" disabled={busy} onPress={() => { setEventId(null); setLinking(null); }} />
                    <View style={styles.card}>
                        <Text style={styles.heading}>{event.title}</Text>
                        <Text style={styles.muted}>Target date: {event.targetDate}</Text>
                        <Text style={styles.muted}>Coordinator: {members.find(p => p.id === event.coordinatorPersonId)?.fullName || 'Unavailable member'}</Text>
                        <Text style={styles.muted}>Student: {members.find(p => p.id === event.beneficiaryPersonId)?.fullName || 'Unavailable member'}</Text>
                        {event.memberReviewRequired && <Text style={styles.warning}>A member is no longer active. Review household membership before adding or linking preparations.</Text>}
                        <Text style={styles.progress}>{event.preparations.filter(item => item.resolved).length} of {event.preparations.length} preparations resolved</Text>
                        <Text style={styles.muted}>Based on current Operations task status.</Text>
                    </View>
                    {event.preparations.map(item => <View key={item.id} style={styles.card}>
                        <Text style={styles.label}>{item.title}</Text>
                        <Text style={item.resolved ? styles.progress : styles.muted}>{item.sourceState === 'UNLINKED' ? 'No task linked' : item.sourceState === 'UNAVAILABLE' ? 'Linked task unavailable · unresolved' : `Operations: ${item.sourceState.replaceAll('_', ' ')}`}</Text>
                        {item.taskTitle && <Text style={styles.text}>{item.taskTitle}</Text>}
                        <Button title={item.taskId ? `Change task for ${item.title}` : `Link existing task for ${item.title}`} disabled={busy || event.memberReviewRequired} onPress={() => chooseTasks(item.id)} />
                        {linking === item.id && <View>
                            <Text style={styles.label}>Choose an existing Operations task</Text>
                            {tasks.map(task => <Button key={task.id} title={`Link: ${task.title} (${task.status})`} disabled={busy} onPress={() => run(async () => {
                                await service.linkTask(householdId, event.id, item.id, task.id);
                                setLinking(null); await refresh();
                            })} />)}
                            {!tasks.length && <Text style={styles.muted}>No tasks loaded. Retry or add a task in Operations.</Text>}
                            <Button title="Reload task choices" disabled={busy} onPress={() => chooseTasks(item.id)} />
                            <Button title="Close task choices" disabled={busy} onPress={() => setLinking(null)} />
                        </View>}
                    </View>)}
                    <View style={styles.card}>
                        <Field label="Preparation title" value={preparation} onChangeText={setPreparation} />
                        <Button title="Add preparation" disabled={busy || event.memberReviewRequired || !preparation.trim()} onPress={() => run(async () => { await service.addPreparation(householdId, event.id, preparation); setPreparation(''); await refresh(); })} />
                    </View>
                    <Button title="Open Operations" disabled={busy} onPress={() => router.push({ pathname: '/family/operations', params: { householdId, fromLifeEvent: '1' } })} />
                    <Button title="Refresh Operations status" disabled={busy} onPress={() => run(refresh)} />
                </>}
            </>}
        </ScrollView>
    </SafeAreaView>;
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#09090F' }, content: { padding: 16, gap: 12, paddingBottom: 64 },
    card: { padding: 16, gap: 12, borderRadius: 14, backgroundColor: '#171721', borderWidth: 1, borderColor: '#27272A' },
    heading: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' }, label: { color: '#F4F4F5', fontSize: 15, fontWeight: '600', marginBottom: 6 },
    text: { color: '#FFFFFF', fontSize: 14 }, muted: { color: '#A1A1AA', fontSize: 14, lineHeight: 21 },
    progress: { color: '#86EFAC', fontSize: 17, fontWeight: '600' }, warning: { color: '#FDE68A', lineHeight: 21 },
    button: { minHeight: 46, padding: 12, borderRadius: 10, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#3F3F46', justifyContent: 'center' },
    selected: { borderColor: '#F472B6', backgroundColor: '#831843' },
    input: { color: '#FFFFFF', backgroundColor: '#09090F', borderWidth: 1, borderColor: '#52525B', padding: 12, borderRadius: 8, minHeight: 48 },
    error: { padding: 14, gap: 10, borderRadius: 10, backgroundColor: '#7F1D1D' }
});
