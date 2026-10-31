import {StorageService, STORAGE_KEYS} from '../storage.js';
import {validateTodoRecords} from '../todos.js';
import {PLANNER_STORAGE_KEY, validatePlanner} from '../time/plannerContracts.js';
export function validateTimePlanningBackup(domain) {
    if (!domain || domain.schemaVersion !== 1 || !Object.prototype.hasOwnProperty.call(domain, 'planner')) throw new Error('INVALID_TIME_BACKUP: Unsupported or incomplete planning domain.');
    validateTodoRecords(domain.tasks);
    if (domain.planner !== null) validatePlanner(domain.planner);
    return domain;
}
export async function collectTimePlanningBackup() {
    const [tasks, planner] = await Promise.all([StorageService.load(STORAGE_KEYS.TODOS, [], {strict: true}), StorageService.load(PLANNER_STORAGE_KEY, null, {strict: true})]);
    return validateTimePlanningBackup({schemaVersion: 1, tasks, planner});
}
export async function writeTimePlanningBackup(domain) {
    validateTimePlanningBackup(domain);
    const tasks = await StorageService.save(STORAGE_KEYS.TODOS, domain.tasks, {atomic: true});
    if (!tasks?.success) throw new Error('TIME_RESTORE_WRITE_FAILED: tasks');
    const planner = domain.planner === null ? await StorageService.delete(PLANNER_STORAGE_KEY) : await StorageService.save(PLANNER_STORAGE_KEY, domain.planner, {atomic: true});
    if (!planner?.success) throw new Error('TIME_RESTORE_WRITE_FAILED: planner');
}
export const hasTimePlanningData = domain => domain.tasks.length > 0 || domain.planner !== null;
