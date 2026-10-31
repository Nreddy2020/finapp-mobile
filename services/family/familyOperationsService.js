/**
 * services/family/familyOperationsService.js
 * 
 * Domain Service for Family Operations, Tasks, and Responsibilities.
 * Enforces:
 * - Strict task lifecycle state-machine transitions
 * - Pure UTC calendar-day due status evaluation
 * - Deterministic recurrence instance advancement & idempotency
 * - Pure UTC ISO-week operational summary calculations
 * - Multi-household isolation & referential integrity
 * - Zero readiness scoring / family health calculations / financial rewards
 */

import { FamilyRepository } from './familyRepository.js';
import {
    createEmptyTask,
    createEmptyResponsibility,
    validateTask,
    validateResponsibility,
    computeTaskDueStatus,
    computeNextRecurrenceDate,
    isTimestampInIsoWeek,
    TaskStatus,
    TaskPriority,
    TaskRecurrence,
    TaskDueStatus,
    ResponsibilityStatus,
    ResponsibilityCategory,
    ALLOWED_TASK_TRANSITIONS
} from './familyContracts.js';

class FamilyOperationsServiceClass {
    // =========================================================================
    // RESPONSIBILITY DOMAIN OPERATIONS
    // =========================================================================

    /**
     * Create or update a household responsibility
     */
    async saveResponsibility(data) {
        let resp = data.id ? await FamilyRepository.getResponsibility(data.id) : null;
        if (!resp) {
            resp = createEmptyResponsibility(data);
        } else {
            resp = {
                ...resp,
                ...data,
                updatedAt: new Date().toISOString()
            };
        }

        validateResponsibility(resp);
        return await FamilyRepository.upsertResponsibility(resp);
    }

    /**
     * Get single responsibility by ID
     */
    async getResponsibility(id) {
        return await FamilyRepository.getResponsibility(id);
    }

    /**
     * List responsibilities with active task counts and member details enriched
     */
    async listResponsibilities(filters = {}) {
        const responsibilities = await FamilyRepository.listResponsibilities(filters);
        const [people, tasks] = await Promise.all([
            FamilyRepository.listPeople({ includeArchived: true }),
            FamilyRepository.listTasks({
                householdId: filters.householdId,
                includeArchived: false
            })
        ]);

        const peopleMap = new Map(people.map(p => [p.id, p]));

        return responsibilities.map(resp => {
            const lead = peopleMap.get(resp.leadPersonId);
            const backup = resp.backupPersonId ? peopleMap.get(resp.backupPersonId) : null;

            const linkedTasks = tasks.filter(t => t.responsibilityId === resp.id);
            const activeTasksCount = linkedTasks.filter(t =>
                t.status === TaskStatus.TODO || t.status === TaskStatus.IN_PROGRESS
            ).length;
            const completedTasksCount = linkedTasks.filter(t =>
                t.status === TaskStatus.COMPLETED
            ).length;

            return {
                ...resp,
                leadPersonName: lead ? (lead.preferredName || lead.fullName || 'Unassigned') : 'Unassigned',
                backupPersonName: backup ? (backup.preferredName || backup.fullName || null) : null,
                activeTasksCount,
                completedTasksCount
            };
        });
    }

    /**
     * Archive a responsibility (preserves historical tasks and links)
     */
    async archiveResponsibility(id) {
        return await FamilyRepository.archiveResponsibility(id);
    }

    /**
     * Physically delete a responsibility (blocked if any linked tasks exist)
     */
    async deleteResponsibility(id) {
        return await FamilyRepository.deleteResponsibility(id);
    }

    // =========================================================================
    // TASK DOMAIN OPERATIONS
    // =========================================================================

    /**
     * Create or update a task
     */
    async saveTask(data) {
        let task = data.id ? await FamilyRepository.getTask(data.id) : null;
        if (!task) {
            task = createEmptyTask(data);
            if (task.recurrence !== TaskRecurrence.NONE && !task.seriesId) {
                task.seriesId = task.id;
            }
        } else {
            task = {
                ...task,
                ...data,
                updatedAt: new Date().toISOString()
            };
            if (task.recurrence !== TaskRecurrence.NONE && !task.seriesId) {
                task.seriesId = task.id;
            }
        }

        validateTask(task);
        return await FamilyRepository.upsertTask(task);
    }

    /**
     * Get single task by ID
     */
    async getTask(id) {
        return await FamilyRepository.getTask(id);
    }

    /**
     * Transition a task through the strict lifecycle state machine.
     * Enforces:
     * - Allowed transition matrix
     * - Completion timestamp & member verification
     * - Recurrence advancement & idempotency
     * - Reopening clears completion metadata
     * - Cancelled tasks do not spawn recurrence
     * - Archived tasks cannot transition
     */
    async transitionTaskStatus(taskId, targetStatus, actorPersonId = null, referenceDate = new Date()) {
        const task = await FamilyRepository.getTask(taskId);
        if (!task) {
            throw new Error(`Task with id '${taskId}' not found`);
        }

        const currentStatus = task.status;

        if (currentStatus === TaskStatus.ARCHIVED) {
            throw new Error(`Cannot transition an archived task`);
        }

        const allowedNext = ALLOWED_TASK_TRANSITIONS[currentStatus] || [];
        if (!allowedNext.includes(targetStatus)) {
            throw new Error(`Invalid task state transition from '${currentStatus}' to '${targetStatus}'`);
        }

        // ARCHIVE transition
        if (targetStatus === TaskStatus.ARCHIVED) {
            const archived = await FamilyRepository.archiveTask(taskId);
            return { task: archived, nextTask: null };
        }

        // REOPEN transition: COMPLETED or CANCELLED -> TODO
        if (targetStatus === TaskStatus.TODO) {
            const reopened = {
                ...task,
                status: TaskStatus.TODO,
                completedAt: null,
                completedByPersonId: null,
                updatedAt: new Date().toISOString()
            };
            validateTask(reopened);
            const saved = await FamilyRepository.upsertTask(reopened);
            return { task: saved, nextTask: null };
        }

        // CANCEL transition: does NOT spawn a recurring instance
        if (targetStatus === TaskStatus.CANCELLED) {
            const cancelled = {
                ...task,
                status: TaskStatus.CANCELLED,
                updatedAt: new Date().toISOString()
            };
            validateTask(cancelled);
            const saved = await FamilyRepository.upsertTask(cancelled);
            return { task: saved, nextTask: null };
        }

        // IN_PROGRESS transition
        if (targetStatus === TaskStatus.IN_PROGRESS) {
            const inProgress = {
                ...task,
                status: TaskStatus.IN_PROGRESS,
                updatedAt: new Date().toISOString()
            };
            validateTask(inProgress);
            const saved = await FamilyRepository.upsertTask(inProgress);
            return { task: saved, nextTask: null };
        }

        // COMPLETE transition: handles recurrence & idempotency
        if (targetStatus === TaskStatus.COMPLETED) {
            const completedAt = new Date(referenceDate).toISOString();

            // Validate actor if provided
            if (actorPersonId) {
                const people = await FamilyRepository.listPeople({ includeArchived: true });
                const actor = people.find(p => p.id === actorPersonId);
                if (!actor) {
                    throw new Error(`Completing member '${actorPersonId}' does not exist`);
                }
            }

            const isRecurring = task.recurrence && task.recurrence !== TaskRecurrence.NONE;

            if (isRecurring) {
                // Recurrence Idempotency Check:
                // Check if a next instance has already been spawned for this task occurrence
                const householdTasks = await FamilyRepository.listTasks({
                    householdId: task.householdId,
                    includeArchived: true
                });

                const existingNext = householdTasks.find(t =>
                    t.parentTaskId === task.id ||
                    (t.seriesId === (task.seriesId || task.id) && t.instanceNumber === (task.instanceNumber + 1))
                );

                if (existingNext) {
                    // Idempotent: already has next instance, update only current task
                    const res = await FamilyRepository.atomicCompleteAndAdvanceTask(task.id, {
                        completedAt,
                        completedByPersonId: actorPersonId
                    }, null);
                    return { task: res.completedTask, nextTask: existingNext };
                }

                // Compute next UTC calendar due date
                const nextDueDate = computeNextRecurrenceDate(task.dueDate, task.recurrence, task.recurrenceConfig);

                let nextTaskInstance = null;
                if (nextDueDate) {
                    nextTaskInstance = createEmptyTask({
                        householdId: task.householdId,
                        responsibilityId: task.responsibilityId,
                        title: task.title,
                        description: task.description,
                        priority: task.priority,
                        status: TaskStatus.TODO,
                        assignedPersonId: task.assignedPersonId,
                        ownerPersonId: task.ownerPersonId,
                        dueDate: nextDueDate,
                        dueTime: task.dueTime,
                        recurrence: task.recurrence,
                        recurrenceConfig: task.recurrenceConfig,
                        seriesId: task.seriesId || task.id,
                        parentTaskId: task.id,
                        instanceNumber: (task.instanceNumber || 1) + 1
                    });
                }

                // Atomic commit: complete current task + create next instance
                const res = await FamilyRepository.atomicCompleteAndAdvanceTask(task.id, {
                    completedAt,
                    completedByPersonId: actorPersonId
                }, nextTaskInstance);

                return { task: res.completedTask, nextTask: res.nextTask };
            }

            // Non-recurring completion
            const res = await FamilyRepository.atomicCompleteAndAdvanceTask(task.id, {
                completedAt,
                completedByPersonId: actorPersonId
            }, null);

            return { task: res.completedTask, nextTask: null };
        }

        throw new Error(`Unhandled task status transition: ${targetStatus}`);
    }

    /**
     * List tasks enriched with due status, days remaining, and person labels
     */
    async listTasks(filters = {}, referenceDate = new Date()) {
        const tasks = await FamilyRepository.listTasks(filters);
        const [people, responsibilities] = await Promise.all([
            FamilyRepository.listPeople({ includeArchived: true }),
            FamilyRepository.listResponsibilities({ includeArchived: true })
        ]);

        const peopleMap = new Map(people.map(p => [p.id, p]));
        const respMap = new Map(responsibilities.map(r => [r.id, r]));

        return tasks.map(t => {
            const dueInfo = computeTaskDueStatus(t.dueDate, t.status, referenceDate);
            const assignee = t.assignedPersonId ? peopleMap.get(t.assignedPersonId) : null;
            const owner = t.ownerPersonId ? peopleMap.get(t.ownerPersonId) : null;
            const resp = t.responsibilityId ? respMap.get(t.responsibilityId) : null;

            return {
                ...t,
                dueStatus: dueInfo.status,
                daysRemaining: dueInfo.daysRemaining,
                assigneeName: assignee ? (assignee.preferredName || assignee.fullName || 'Household Pool') : 'Household Pool',
                ownerName: owner ? (owner.preferredName || owner.fullName || 'Household') : 'Household',
                responsibilityTitle: resp ? resp.title : null
            };
        });
    }

    /**
     * Computes authoritative operational summary metrics.
     * Strictly excludes archived tasks and responsibilities from active counts.
     * Computes 'completedThisWeek' using pure UTC ISO week boundaries.
     * Zero readiness or family health formulas.
     */
    async getOperationalSummary(householdId, referenceDate = new Date()) {
        const [allTasks, allResp] = await Promise.all([
            FamilyRepository.listTasks({ householdId, includeArchived: true }),
            FamilyRepository.listResponsibilities({ householdId, includeArchived: true })
        ]);

        // Exclude archived tasks from active metrics
        const activeTasks = allTasks.filter(t =>
            t.status === TaskStatus.TODO || t.status === TaskStatus.IN_PROGRESS
        );

        let overdueTasks = 0;
        let dueToday = 0;
        let dueSoon = 0;

        for (const t of activeTasks) {
            const dueInfo = computeTaskDueStatus(t.dueDate, t.status, referenceDate);
            if (dueInfo.status === TaskDueStatus.OVERDUE) {
                overdueTasks++;
            } else if (dueInfo.status === TaskDueStatus.DUE_TODAY) {
                dueToday++;
            } else if (dueInfo.status === TaskDueStatus.DUE_SOON) {
                dueSoon++;
            }
        }

        // Completed this week: ISO-8601 week in UTC (excluding archived)
        const completedThisWeek = allTasks.filter(t =>
            t.status === TaskStatus.COMPLETED &&
            isTimestampInIsoWeek(t.completedAt, referenceDate)
        ).length;

        // Open responsibilities: ACTIVE status
        const openResponsibilities = allResp.filter(r =>
            r.status === ResponsibilityStatus.ACTIVE
        ).length;

        return {
            totalActiveTasks: activeTasks.length,
            overdueTasks,
            dueToday,
            dueSoon,
            completedThisWeek,
            openResponsibilities
        };
    }
}

export const FamilyOperationsService = new FamilyOperationsServiceClass();
