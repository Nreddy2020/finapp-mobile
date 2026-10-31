import { FamilyRepository } from './familyRepository.js';
import { FamilyOperationsService } from './familyOperationsService.js';
import { FamilyLifeEventStore } from './familyLifeEventStore.js';

const clone = value => JSON.parse(JSON.stringify(value));
const text = (value, label) => {
    if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error(`${label} is required (up to 200 characters).`);
    return value.trim();
};
const date = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Enter a valid target date as YYYY-MM-DD.');
    return value;
};
const exactKeys = (value, keys) => value && Object.keys(value).every(key => keys.includes(key));
export function validateLifeEvents(events) {
    if (!Array.isArray(events)) throw new Error('Saved Life Events are invalid. No changes were saved.');
    const ids = new Set();
    for (const event of events) {
        if (!exactKeys(event, ['id', 'householdId', 'kind', 'title', 'targetDate', 'coordinatorPersonId', 'beneficiaryPersonId', 'preparations', 'createdAt']) || event.kind !== 'SCHOOL_YEAR' || !Array.isArray(event.preparations)) throw new Error('Invalid saved life event.');
        for (const key of ['id', 'householdId', 'title', 'coordinatorPersonId', 'beneficiaryPersonId', 'createdAt']) text(event[key], key);
        date(event.targetDate);
        if (ids.has(event.id)) throw new Error('Duplicate saved event.');
        ids.add(event.id);
        const preparationIds = new Set();
        for (const preparation of event.preparations) {
            if (!exactKeys(preparation, ['id', 'title', 'taskId'])) throw new Error('Invalid saved preparation.');
            text(preparation.id, 'Preparation ID'); text(preparation.title, 'Preparation');
            if (preparation.taskId !== null) text(preparation.taskId, 'Task reference');
            if (preparationIds.has(preparation.id)) throw new Error('Duplicate saved preparation.');
            preparationIds.add(preparation.id);
        }
    }
    return events;
}

export function createLifeEventService({ repository = FamilyRepository, operations = FamilyOperationsService, store = FamilyLifeEventStore, makeId = () => `life_${Date.now()}_${Math.random().toString(36).slice(2)}` } = {}) {
    let writes = Promise.resolve();
    async function household(id) {
        text(id, 'Choose a household');
        const record = await repository.getHousehold(id);
        if (!record || record.status !== 'ACTIVE') throw new Error('Choose an active household.');
        return record;
    }
    async function members(householdId) {
        await household(householdId);
        const memberships = await repository.listMemberships({ householdId, status: 'ACTIVE' });
        const people = await repository.listPeople({ includeArchived: false });
        return people.filter(person => person.status === 'ACTIVE' && memberships.some(member => member.personId === person.id));
    }
    async function validatePeople(event) {
        const people = await members(event.householdId);
        if (![event.coordinatorPersonId, event.beneficiaryPersonId].every(id => people.some(person => person.id === id))) throw new Error('Choose an active household member for coordinator and student.');
    }
    async function read() { return clone(validateLifeEvents(await store.load())); }
    function mutate(action) {
        const pending = writes.then(async () => {
            const events = await read();
            const result = await action(events);
            validateLifeEvents(events);
            await store.save(events);
            return clone(result);
        });
        writes = pending.catch(() => {});
        return pending;
    }
    function find(events, householdId, eventId) {
        const event = events.find(item => item.id === eventId && item.householdId === householdId);
        if (!event) throw new Error('Event unavailable in this household.');
        return event;
    }
    async function source(householdId, taskId) {
        const task = await operations.getTask(taskId);
        if (!task || task.householdId !== householdId || task.status === 'ARCHIVED') throw new Error('Task unavailable. Choose another task or retry.');
        return task;
    }
    return {
        members,
        async createEvent(input) {
            return mutate(async events => {
                const event = { id: makeId(), householdId: text(input.householdId, 'Choose a household'), kind: 'SCHOOL_YEAR', title: text(input.title, 'Event title'), targetDate: date(input.targetDate), coordinatorPersonId: input.coordinatorPersonId, beneficiaryPersonId: input.beneficiaryPersonId, preparations: [], createdAt: new Date().toISOString() };
                await validatePeople(event);
                events.push(event);
                return event;
            });
        },
        async addPreparation(householdId, eventId, title) {
            return mutate(async events => {
                await household(householdId);
                const event = find(events, householdId, eventId);
                await validatePeople(event);
                event.preparations.push({ id: makeId(), title: text(title, 'Preparation'), taskId: null });
                return event;
            });
        },
        async linkTask(householdId, eventId, preparationId, taskId) {
            return mutate(async events => {
                await household(householdId);
                const event = find(events, householdId, eventId);
                await validatePeople(event);
                const preparation = event.preparations.find(item => item.id === preparationId);
                if (!preparation) throw new Error('Preparation unavailable.');
                await source(householdId, text(taskId, 'Task'));
                preparation.taskId = taskId;
                return event;
            });
        },
        async listTasks(householdId) {
            await household(householdId);
            const tasks = await operations.listTasks({ householdId, includeArchived: false });
            return tasks.filter(task => task.householdId === householdId && task.status !== 'ARCHIVED').map(({ id, title, status }) => ({ id, title, status }));
        },
        async listViews(householdId) {
            await household(householdId);
            await writes;
            const events = (await read()).filter(item => item.householdId === householdId);
            const people = await members(householdId);
            return Promise.all(events.map(async event => ({
                ...event,
                memberReviewRequired: ![event.coordinatorPersonId, event.beneficiaryPersonId].every(id => people.some(person => person.id === id)),
                preparations: await Promise.all(event.preparations.map(async preparation => {
                    if (!preparation.taskId) return { ...preparation, sourceState: 'UNLINKED', resolved: false };
                    try {
                        const task = await source(householdId, preparation.taskId);
                        return { ...preparation, sourceState: task.status, taskTitle: task.title, resolved: task.status === 'COMPLETED' };
                    } catch {
                        return { ...preparation, sourceState: 'UNAVAILABLE', resolved: false };
                    }
                }))
            })));
        }
    };
}

export const FamilyLifeEventService = createLifeEventService();
