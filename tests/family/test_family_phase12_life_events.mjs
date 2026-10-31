import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLifeEventService, validateLifeEvents } from '../../services/family/familyLifeEventService.js';
import { FamilyLifeEventStore, LIFE_EVENTS_STORAGE_KEY } from '../../services/family/familyLifeEventStore.js';
import { FamilyRepository as repository } from '../../services/family/familyRepository.js';
import { FamilyOperationsService as operations } from '../../services/family/familyOperationsService.js';
import { createEmptyHousehold, createEmptyPerson, createEmptyMembership } from '../../services/family/familyContracts.js';

repository.setTestMode(true);
await repository.upsertHousehold(createEmptyHousehold({ id: 'school-home', name: 'School test household' }));
await repository.upsertHousehold(createEmptyHousehold({ id: 'other-home', name: 'Other household' }));
for (const id of ['parent', 'student']) {
    await repository.upsertPerson(createEmptyPerson({ id, fullName: id }));
    await repository.upsertMembership(createEmptyMembership({ householdId: 'school-home', personId: id }));
}
let persisted = [], failSave = false, failLoad = false, writeCount = 0;
const store = {
    async load() { if (failLoad) throw Error('read failed'); return structuredClone(persisted); },
    async save(value) { if (failSave) throw Error('save failed'); writeCount++; persisted = structuredClone(value); }
};
const service = createLifeEventService({ store });
const input = { householdId: 'school-home', title: 'Start a New School Year', targetDate: '2027-06-10', coordinatorPersonId: 'parent', beneficiaryPersonId: 'student' };
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.log(`PASS ${name}`); }
let event, task;
await check('Explicit household is required', () => assert.rejects(service.createEvent({ ...input, householdId: undefined })));
await check('Invalid calendar date is rejected', () => assert.rejects(service.createEvent({ ...input, targetDate: '2027-02-29' })));
await check('Cross-household coordinator rejected', () => assert.rejects(service.createEvent({ ...input, householdId: 'other-home' })));
await check('School event uses existing people and memberships', async () => { event = await service.createEvent(input); assert.equal(event.kind, 'SCHOOL_YEAR'); assert.equal((await service.members('school-home')).length, 2); });
await check('Add preparation', async () => { event = await service.addPreparation('school-home', event.id, 'Uniforms ready'); assert.equal(event.preparations[0].taskId, null); });
await check('Link an existing Operations task', async () => {
    task = await operations.saveTask({ householdId: 'school-home', title: 'Arrange school uniforms' });
    await service.linkTask('school-home', event.id, event.preparations[0].id, task.id);
    assert.equal((await service.listViews('school-home'))[0].preparations[0].sourceState, 'TODO');
});
await check('Completion in real Operations is authoritative', async () => {
    await operations.transitionTaskStatus(task.id, 'COMPLETED', 'parent');
    assert.equal((await service.listViews('school-home'))[0].preparations[0].resolved, true);
});
await check('Event storage contains no task completion, assignee, title or due date', async () => {
    assert.deepEqual(Object.keys(persisted[0].preparations[0]).sort(), ['id', 'taskId', 'title']);
    const raw = JSON.stringify(persisted);
    for (const forbidden of ['COMPLETED', 'assignedPersonId', 'completedAt', 'dueDate', 'Arrange school uniforms']) assert.equal(raw.includes(forbidden), false);
});
await check('Fresh service reloads persisted references and source status', async () => {
    assert.equal((await createLifeEventService({ store }).listViews('school-home'))[0].preparations[0].resolved, true);
});
await check('Reopening Operations immediately makes preparation unresolved', async () => {
    await operations.transitionTaskStatus(task.id, 'TODO');
    assert.equal((await service.listViews('school-home'))[0].preparations[0].resolved, false);
});
await check('Duplicate link keeps one association', async () => {
    await service.linkTask('school-home', event.id, event.preparations[0].id, task.id);
    assert.equal(persisted[0].preparations.length, 1);
});
await check('Foreign source rejected without altering saved association', async () => {
    const foreign = await operations.saveTask({ householdId: 'other-home', title: 'Foreign task' });
    await assert.rejects(service.linkTask('school-home', event.id, event.preparations[0].id, foreign.id));
    assert.equal(persisted[0].preparations[0].taskId, task.id);
    assert.equal((await service.listTasks('school-home')).some(t => t.id === foreign.id), false);
});
await check('Wrong household cannot mutate or read an event', async () => {
    await assert.rejects(service.addPreparation('other-home', event.id, 'Hidden'));
    assert.deepEqual(await service.listViews('other-home'), []);
});
await check('Failed association preserves original task and retries without duplication', async () => {
    const replacement = await operations.saveTask({ householdId: 'school-home', title: 'Buy school shoes' });
    const before = await repository.listTasks({ householdId: 'school-home' });
    failSave = true;
    await assert.rejects(service.linkTask('school-home', event.id, event.preparations[0].id, replacement.id));
    assert.equal(persisted[0].preparations[0].taskId, task.id);
    failSave = false;
    await service.linkTask('school-home', event.id, event.preparations[0].id, replacement.id);
    assert.deepEqual(await repository.listTasks({ householdId: 'school-home' }), before);
    assert.equal(persisted[0].preparations[0].taskId, replacement.id);
});
await check('Failed read never overwrites stored events', async () => {
    const before = JSON.stringify(persisted); failLoad = true;
    await assert.rejects(service.createEvent(input)); failLoad = false;
    assert.equal(JSON.stringify(persisted), before);
});
await check('Malformed saved data is rejected', async () => {
    assert.throws(() => validateLifeEvents({}));
    assert.throws(() => validateLifeEvents([{ ...persisted[0], completed: true }]));
});
await check('Concurrent preparations are serialized without lost writes', async () => {
    await Promise.all(['Books', 'Transport'].map(title => service.addPreparation('school-home', event.id, title)));
    assert.equal(persisted[0].preparations.length, 3);
});
await check('Reading projections writes neither events nor Operations', async () => {
    const count = writeCount; const before = await repository.listTasks({ householdId: 'school-home' });
    await service.listViews('school-home'); assert.equal(writeCount, count);
    assert.deepEqual(await repository.listTasks({ householdId: 'school-home' }), before);
});
await check('Unavailable source produces no private task metadata and remains unresolved', async () => {
    const broken = createLifeEventService({ store, operations: { getTask: async () => { throw Error('private source detail'); } } });
    const view = (await broken.listViews('school-home'))[0].preparations[0];
    assert.equal(view.sourceState, 'UNAVAILABLE'); assert.equal(view.resolved, false); assert.equal(view.taskTitle, undefined);
});
await check('Archived source preserves link and becomes unavailable', async () => {
    const id = persisted[0].preparations[0].taskId;
    await operations.transitionTaskStatus(id, 'ARCHIVED');
    const view = (await service.listViews('school-home'))[0].preparations[0];
    assert.equal(view.sourceState, 'UNAVAILABLE'); assert.equal(view.taskId, id);
});
await check('Recurring completion remains tied to the exact occurrence', async () => {
    const recurring = await operations.saveTask({ householdId: 'school-home', title: 'Weekly preparation', recurrence: 'WEEKLY', dueDate: '2027-06-01' });
    await service.linkTask('school-home', event.id, persisted[0].preparations[1].id, recurring.id);
    const result = await operations.transitionTaskStatus(recurring.id, 'COMPLETED');
    assert.ok(result.nextTask); assert.equal(result.nextTask.status, 'TODO');
    const view = (await service.listViews('school-home'))[0].preparations[1];
    assert.equal(view.resolved, true); assert.equal(view.taskId, recurring.id);
});
await check('Failed first link preserves the task and retries without creating a task', async () => {
    const preparationId = persisted[0].preparations[2].id;
    assert.equal(persisted[0].preparations[2].taskId, null);
    const before = await repository.listTasks({ householdId: 'school-home' });
    failSave = true;
    await assert.rejects(service.linkTask('school-home', event.id, preparationId, task.id));
    failSave = false;
    assert.equal(persisted[0].preparations[2].taskId, null);
    assert.deepEqual(await repository.listTasks({ householdId: 'school-home' }), before);
    await service.linkTask('school-home', event.id, preparationId, task.id);
    assert.equal(persisted[0].preparations[2].taskId, task.id);
    assert.deepEqual(await repository.listTasks({ householdId: 'school-home' }), before);
});
await check('Archived person preserves history and blocks new associations', async () => {
    await repository.archivePerson('student');
    assert.equal((await service.listViews('school-home'))[0].memberReviewRequired, true);
    await assert.rejects(service.addPreparation('school-home', event.id, 'Another'));
});
await check('Production adapter encrypts persisted events and reloads them', async () => {
    await FamilyLifeEventStore.save(persisted);
    const raw = await AsyncStorage.getItem(LIFE_EVENTS_STORAGE_KEY);
    assert.equal(raw.includes('Start a New School Year'), false);
    assert.deepEqual(await FamilyLifeEventStore.load(), persisted);
});
await check('Production adapter rejects corrupt stored data without resetting it', async () => {
    await AsyncStorage.setItem(LIFE_EVENTS_STORAGE_KEY, 'broken');
    await assert.rejects(FamilyLifeEventStore.load());
    assert.equal(await AsyncStorage.getItem(LIFE_EVENTS_STORAGE_KEY), 'broken');
});
await check('Production adapter propagates failed writes and permits retry', async () => {
    const original = AsyncStorage.setItem;
    try {
        AsyncStorage.setItem = async () => { throw Error('storage failure'); };
        await assert.rejects(FamilyLifeEventStore.save(persisted));
    } finally { AsyncStorage.setItem = original; }
    await FamilyLifeEventStore.save(persisted);
    assert.deepEqual(await FamilyLifeEventStore.load(), persisted);
});
console.log(`ALL ${checks} LIFE EVENTS INTEGRATION CHECKS PASSED`);
