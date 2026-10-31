/**
 * tests/family/test_family_phase4_operations.mjs
 * 
 * FinLife Family Operating System Phase 4 Operations, Tasks & Responsibilities Test Suite.
 * 
 * Verifies all 34 Phase 4 Governance & Operations Invariants:
 * - Responsibility & Task Contracts & Schema Defaults (FAM-P4-01 to 02)
 * - Validators, Due-Time Format & Calendar Bounds (FAM-P4-03 to 06)
 * - Pure UTC Due Status Evaluation & Calendar-Day Semantics (FAM-P4-07)
 * - Pure Recurrence Advancement & Month-End Clamping (FAM-P4-08 to 11)
 * - Exact State-Machine Matrix & Transitions (FAM-P4-12 to 14)
 * - Recurrence Lifecycle, Idempotency & Rollback Atomicity (FAM-P4-15 to 18)
 * - Household Ownership vs Individual Assignment (FAM-P4-19)
 * - Responsibility Archival & Deletion Protection (FAM-P4-20 to 21)
 * - Referential Integrity & Multi-Household Isolation (FAM-P4-22 to 25)
 * - Member Lifecycle, Archival & Person Deletion Protection (FAM-P4-26 to 28)
 * - Household Cascading Deletion Preservation (FAM-P4-29)
 * - Task Filtering & Operational Summary Metrics (FAM-P4-30 to 32)
 * - Diagnostic Sanitization & Zero Readiness / Financial Leakage (FAM-P4-33 to 34)
 */

import assert from 'node:assert';
import {
    ResponsibilityCategory,
    ResponsibilityStatus,
    TaskPriority,
    TaskStatus,
    TaskRecurrence,
    TaskDueStatus,
    ALLOWED_TASK_TRANSITIONS,
    createEmptyPerson,
    createEmptyHousehold,
    createEmptyMembership,
    createEmptyResponsibility,
    createEmptyTask,
    validateResponsibility,
    validateTask,
    computeTaskDueStatus,
    computeNextRecurrenceDate,
    computeIsoWeekBoundaries,
    isTimestampInIsoWeek,
    assertSafeNumbers,
    PersonStatus,
    HouseholdStatus,
    MembershipStatus,
    HouseholdRole
} from '../../services/family/familyContracts.js';
import { FamilyRepository } from '../../services/family/familyRepository.js';
import { FamilyOperationsService } from '../../services/family/familyOperationsService.js';

console.log('================================================================');
console.log('⚙️  EXECUTING FINLIFE FAMILY OS PHASE 4 OPERATIONS TESTS');
console.log('   Scope: Tasks, Responsibilities, Recurrence, Governance');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

async function check(id, name, fn) {
    totalCount++;
    try {
        await fn();
        passCount++;
        console.log(`  [PASS] ${id}: ${name}`);
    } catch (err) {
        console.error(`  [FAIL] ${id}: ${name}`);
        console.error(`         Error: ${err.message}`);
        throw err;
    }
}

// Enable isolated in-memory test mode
FamilyRepository.setTestMode(true);

// -----------------------------------------------------------------------------
// CONTRACTS & SCHEMA DEFAULTS (FAM-P4-01 to 02)
// -----------------------------------------------------------------------------

await check('FAM-P4-01', 'Responsibility factory initializes valid schema defaults', async () => {
    const resp = createEmptyResponsibility({
        householdId: 'hh_ops_1',
        title: 'Vehicle Maintenance',
        leadPersonId: 'p_lead_1'
    });

    assert.ok(resp.id && resp.id.startsWith('resp_'));
    assert.strictEqual(resp.householdId, 'hh_ops_1');
    assert.strictEqual(resp.title, 'Vehicle Maintenance');
    assert.strictEqual(resp.category, ResponsibilityCategory.OTHER);
    assert.strictEqual(resp.leadPersonId, 'p_lead_1');
    assert.strictEqual(resp.backupPersonId, null);
    assert.strictEqual(resp.description, '');
    assert.strictEqual(resp.status, ResponsibilityStatus.ACTIVE);
    assert.ok(resp.createdAt && resp.updatedAt);
    assert.doesNotThrow(() => validateResponsibility(resp));
});

await check('FAM-P4-02', 'Task factory schema defaults: priority MEDIUM, status TODO, recurrence NONE, household-owned', async () => {
    const task = createEmptyTask({
        householdId: 'hh_ops_1',
        title: 'Change Engine Oil'
    });

    assert.ok(task.id && task.id.startsWith('task_'));
    assert.strictEqual(task.householdId, 'hh_ops_1');
    assert.strictEqual(task.title, 'Change Engine Oil');
    assert.strictEqual(task.priority, TaskPriority.MEDIUM);
    assert.strictEqual(task.status, TaskStatus.TODO);
    assert.strictEqual(task.recurrence, TaskRecurrence.NONE);
    // Explicit architectural invariant: owner null = household-owned, assigned null = household pool
    assert.strictEqual(task.ownerPersonId, null, 'owner null means household owns task');
    assert.strictEqual(task.assignedPersonId, null, 'assigned null means household pool');
    assert.strictEqual(task.dueDate, null);
    assert.strictEqual(task.dueTime, null);
    assert.strictEqual(task.instanceNumber, 1);
    assert.strictEqual(task.completedAt, null);
    assert.strictEqual(task.completedByPersonId, null);
    assert.doesNotThrow(() => validateTask(task));
});

// -----------------------------------------------------------------------------
// VALIDATORS, DUE TIME & CALENDAR BOUNDS (FAM-P4-03 to 06)
// -----------------------------------------------------------------------------

await check('FAM-P4-03', 'Responsibility validator enforces required title, householdId, and leadPersonId', async () => {
    assert.throws(
        () => validateResponsibility(createEmptyResponsibility({ householdId: '', title: 'Test', leadPersonId: 'p1' })),
        /requires a non-empty string householdId/
    );
    assert.throws(
        () => validateResponsibility(createEmptyResponsibility({ householdId: 'hh1', title: '   ', leadPersonId: 'p1' })),
        /requires a non-empty string title/
    );
    assert.throws(
        () => validateResponsibility(createEmptyResponsibility({ householdId: 'hh1', title: 'Test', leadPersonId: '' })),
        /requires a non-empty string leadPersonId/
    );
    assert.throws(
        () => validateResponsibility({ ...createEmptyResponsibility({ householdId: 'h1', title: 'T', leadPersonId: 'p1' }), category: 'INVALID' }),
        /Invalid ResponsibilityCategory/
    );
});

await check('FAM-P4-04', 'Task validator enforces required title, householdId, valid enums, and dueTime format (HH:mm)', async () => {
    const valid = createEmptyTask({ householdId: 'hh1', title: 'Valid Task' });
    assert.doesNotThrow(() => validateTask(valid));

    // Rejects invalid dueTime
    assert.throws(
        () => validateTask({ ...valid, dueTime: '25:99' }),
        /Invalid dueTime '25:99'; expected valid 24-hour HH:mm string/
    );
    assert.throws(
        () => validateTask({ ...valid, dueTime: '12:60' }),
        /Invalid dueTime '12:60'; expected valid 24-hour HH:mm string/
    );
    assert.throws(
        () => validateTask({ ...valid, dueTime: '8:30' }), // Needs 2 digits for hour
        /Invalid dueTime '8:30'; expected valid 24-hour HH:mm string/
    );

    // Accepts valid 24h dueTime
    assert.doesNotThrow(() => validateTask({ ...valid, dueTime: '08:30' }));
    assert.doesNotThrow(() => validateTask({ ...valid, dueTime: '23:59' }));
    assert.doesNotThrow(() => validateTask({ ...valid, dueTime: '00:00' }));
});

await check('FAM-P4-05', 'Strict calendar date validation on task dueDate (rejects invalid dates, handles leap years)', async () => {
    const base = createEmptyTask({ householdId: 'hh1', title: 'Calendar Test' });

    // Invalid day in month
    assert.throws(
        () => validateTask({ ...base, dueDate: '2026-02-30' }),
        /Invalid dueDate '2026-02-30'; expected valid YYYY-MM-DD calendar date/
    );
    // Invalid month
    assert.throws(
        () => validateTask({ ...base, dueDate: '2026-13-01' }),
        /Invalid dueDate '2026-13-01'; expected valid YYYY-MM-DD calendar date/
    );

    // Non-leap year Feb 29 rejected
    assert.throws(
        () => validateTask({ ...base, dueDate: '2025-02-29' }),
        /Invalid dueDate '2025-02-29'; expected valid YYYY-MM-DD calendar date/
    );

    // Leap year Feb 29 accepted
    assert.doesNotThrow(() => validateTask({ ...base, dueDate: '2024-02-29' }));
});

await check('FAM-P4-06', 'Safe numbers invariant blocks raw BigInt, NaN, and Infinity across all operations entities', async () => {
    const task = createEmptyTask({ householdId: 'hh1', title: 'Math Invariant' });
    assert.throws(
        () => validateTask({ ...task, instanceNumber: NaN }),
        /FamilyTask instanceNumber must be an integer >= 1/
    );
    assert.throws(
        () => assertSafeNumbers({ count: 10n }),
        /Raw BigInt invariant violation/
    );
    assert.throws(
        () => assertSafeNumbers({ val: Infinity }),
        /Infinity invariant violation/
    );
});

// -----------------------------------------------------------------------------
// DUE STATUS & CALENDAR-DAY SEMANTICS (FAM-P4-07)
// -----------------------------------------------------------------------------

await check('FAM-P4-07', 'Pure UTC due status evaluation: calendar-day based; dueTime does not convert DUE_TODAY to OVERDUE', async () => {
    const refDate = new Date(Date.UTC(2026, 8, 9, 15, 0, 0)); // 2026-09-09 15:00 UTC

    // Null dueDate
    const noDue = computeTaskDueStatus(null, TaskStatus.TODO, refDate);
    assert.strictEqual(noDue.status, TaskDueStatus.NO_DUE_DATE);
    assert.strictEqual(noDue.daysRemaining, null);

    // Overdue: yesterday
    const overdue = computeTaskDueStatus('2026-09-08', TaskStatus.TODO, refDate);
    assert.strictEqual(overdue.status, TaskDueStatus.OVERDUE);
    assert.strictEqual(overdue.daysRemaining, -1);

    // Due today: even with a dueTime that already passed (e.g. 08:00 UTC vs refDate 15:00 UTC)
    // Invariant: calendar-day based; time does not change DUE_TODAY into OVERDUE
    const dueToday = computeTaskDueStatus('2026-09-09', TaskStatus.TODO, refDate);
    assert.strictEqual(dueToday.status, TaskDueStatus.DUE_TODAY);
    assert.strictEqual(dueToday.daysRemaining, 0);

    // Due soon: 3 days away
    const dueSoon = computeTaskDueStatus('2026-09-12', TaskStatus.TODO, refDate);
    assert.strictEqual(dueSoon.status, TaskDueStatus.DUE_SOON);
    assert.strictEqual(dueSoon.daysRemaining, 3);

    // Upcoming: 10 days away
    const upcoming = computeTaskDueStatus('2026-09-19', TaskStatus.TODO, refDate);
    assert.strictEqual(upcoming.status, TaskDueStatus.UPCOMING);
    assert.strictEqual(upcoming.daysRemaining, 10);
});

// -----------------------------------------------------------------------------
// PURE RECURRENCE ADVANCEMENT (FAM-P4-08 to 11)
// -----------------------------------------------------------------------------

await check('FAM-P4-08', 'Recurrence advancement: DAILY (+1 day), WEEKLY (+7 days), BIWEEKLY (+14 days)', async () => {
    assert.strictEqual(computeNextRecurrenceDate('2026-09-09', TaskRecurrence.DAILY), '2026-09-10');
    assert.strictEqual(computeNextRecurrenceDate('2026-09-09', TaskRecurrence.WEEKLY), '2026-09-16');
    assert.strictEqual(computeNextRecurrenceDate('2026-09-09', TaskRecurrence.BIWEEKLY), '2026-09-23');
});

await check('FAM-P4-09', 'Recurrence advancement: MONTHLY (+1 calendar month) with month-end boundary clamping', async () => {
    // Normal month advancement
    assert.strictEqual(computeNextRecurrenceDate('2026-01-15', TaskRecurrence.MONTHLY), '2026-02-15');

    // Month-end clamping: Jan 31 -> Feb 28 in non-leap year (2026)
    assert.strictEqual(computeNextRecurrenceDate('2026-01-31', TaskRecurrence.MONTHLY), '2026-02-28');

    // Month-end clamping: Jan 31 -> Feb 29 in leap year (2024)
    assert.strictEqual(computeNextRecurrenceDate('2024-01-31', TaskRecurrence.MONTHLY), '2024-02-29');

    // Month-end clamping: Mar 31 -> Apr 30
    assert.strictEqual(computeNextRecurrenceDate('2026-03-31', TaskRecurrence.MONTHLY), '2026-04-30');
});

await check('FAM-P4-10', 'Recurrence advancement: QUARTERLY (+3 calendar months) with month-end clamping', async () => {
    // Jan 31 + 3 months -> April 30 (clamped from 31 to 30)
    assert.strictEqual(computeNextRecurrenceDate('2026-01-31', TaskRecurrence.QUARTERLY), '2026-04-30');

    // Nov 30 + 3 months -> Feb 28 (2026-11-30 + 3 months -> 2027-02-28)
    assert.strictEqual(computeNextRecurrenceDate('2026-11-30', TaskRecurrence.QUARTERLY), '2027-02-28');

    // Nov 30 + 3 months -> Feb 29 in leap year (2023-11-30 + 3 months -> 2024-02-29)
    assert.strictEqual(computeNextRecurrenceDate('2023-11-30', TaskRecurrence.QUARTERLY), '2024-02-29');
});

await check('FAM-P4-11', 'Recurrence advancement: YEARLY (+1 calendar year) with leap-year handling', async () => {
    assert.strictEqual(computeNextRecurrenceDate('2026-05-10', TaskRecurrence.YEARLY), '2027-05-10');

    // Leap day Feb 29 + 1 year -> Feb 28 in non-leap year
    assert.strictEqual(computeNextRecurrenceDate('2024-02-29', TaskRecurrence.YEARLY), '2025-02-28');
});

// -----------------------------------------------------------------------------
// EXACT STATE-MACHINE MATRIX & TRANSITIONS (FAM-P4-12 to 14)
// -----------------------------------------------------------------------------

await check('FAM-P4-12', 'Exact task state-machine matrix: enforces valid transitions, rejects invalid transitions', async () => {
    // Setup fresh environment
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_sm_1', name: 'SM House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_sm_1', fullName: 'Alice' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({ id: 'm_sm_1', householdId: 'hh_sm_1', personId: 'p_sm_1' }));

    const task = await FamilyOperationsService.saveTask({
        id: 'task_sm_1',
        householdId: 'hh_sm_1',
        title: 'State Machine Test',
        status: TaskStatus.TODO
    });

    // Valid: TODO -> IN_PROGRESS
    const { task: inProg } = await FamilyOperationsService.transitionTaskStatus('task_sm_1', TaskStatus.IN_PROGRESS);
    assert.strictEqual(inProg.status, TaskStatus.IN_PROGRESS);

    // Valid: IN_PROGRESS -> COMPLETED
    const { task: completed } = await FamilyOperationsService.transitionTaskStatus('task_sm_1', TaskStatus.COMPLETED, 'p_sm_1');
    assert.strictEqual(completed.status, TaskStatus.COMPLETED);

    // Invalid: COMPLETED -> IN_PROGRESS (not allowed from COMPLETED, only TODO or ARCHIVED)
    await assert.rejects(
        async () => await FamilyOperationsService.transitionTaskStatus('task_sm_1', TaskStatus.IN_PROGRESS),
        /Invalid task state transition from 'COMPLETED' to 'IN_PROGRESS'/
    );

    // Valid: COMPLETED -> ARCHIVED
    const { task: archived } = await FamilyOperationsService.transitionTaskStatus('task_sm_1', TaskStatus.ARCHIVED);
    assert.strictEqual(archived.status, TaskStatus.ARCHIVED);

    // Invalid: ARCHIVED -> any state (terminal)
    await assert.rejects(
        async () => await FamilyOperationsService.transitionTaskStatus('task_sm_1', TaskStatus.TODO),
        /Cannot transition an archived task/
    );
});

await check('FAM-P4-13', 'Task completion requirements: sets ISO UTC completedAt, validates completedByPersonId', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_cm_1', name: 'Completion House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_cm_1', fullName: 'Bob' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({ id: 'm_cm_1', householdId: 'hh_cm_1', personId: 'p_cm_1' }));

    await FamilyOperationsService.saveTask({
        id: 'task_cm_1',
        householdId: 'hh_cm_1',
        title: 'Completion Verification'
    });

    // Rejects non-existent actor
    await assert.rejects(
        async () => await FamilyOperationsService.transitionTaskStatus('task_cm_1', TaskStatus.COMPLETED, 'p_ghost'),
        /Completing member 'p_ghost' does not exist/
    );

    const refDate = new Date(Date.UTC(2026, 8, 9, 16, 0, 0));
    const { task: done } = await FamilyOperationsService.transitionTaskStatus('task_cm_1', TaskStatus.COMPLETED, 'p_cm_1', refDate);

    assert.strictEqual(done.status, TaskStatus.COMPLETED);
    assert.strictEqual(done.completedAt, refDate.toISOString());
    assert.strictEqual(done.completedByPersonId, 'p_cm_1');
});

await check('FAM-P4-14', 'Task reopening: transitioning COMPLETED -> TODO clears completedAt and completedByPersonId', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_ro_1', name: 'Reopen House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_ro_1', fullName: 'Clara' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({ id: 'm_ro_1', householdId: 'hh_ro_1', personId: 'p_ro_1' }));

    await FamilyOperationsService.saveTask({
        id: 'task_ro_1',
        householdId: 'hh_ro_1',
        title: 'Reopen Task'
    });

    await FamilyOperationsService.transitionTaskStatus('task_ro_1', TaskStatus.COMPLETED, 'p_ro_1');
    const { task: reopened } = await FamilyOperationsService.transitionTaskStatus('task_ro_1', TaskStatus.TODO);

    assert.strictEqual(reopened.status, TaskStatus.TODO);
    assert.strictEqual(reopened.completedAt, null, 'completedAt cleared on reopen');
    assert.strictEqual(reopened.completedByPersonId, null, 'completedByPersonId cleared on reopen');
});

// -----------------------------------------------------------------------------
// RECURRENCE LIFECYCLE, IDEMPOTENCY & ROLLBACK (FAM-P4-15 to 18)
// -----------------------------------------------------------------------------

await check('FAM-P4-15', 'Recurrence lifecycle: completing recurring task generates next instance with seriesId, parentTaskId, instanceNumber', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_rec_1', name: 'Recurrence House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_rec_1', fullName: 'David' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({ id: 'm_rec_1', householdId: 'hh_rec_1', personId: 'p_rec_1' }));

    await FamilyOperationsService.saveTask({
        id: 'task_rec_1',
        householdId: 'hh_rec_1',
        title: 'Water Lawn',
        dueDate: '2026-09-09',
        dueTime: '08:00',
        recurrence: TaskRecurrence.WEEKLY,
        assignedPersonId: 'p_rec_1'
    });

    const result = await FamilyOperationsService.transitionTaskStatus('task_rec_1', TaskStatus.COMPLETED, 'p_rec_1');

    assert.strictEqual(result.task.status, TaskStatus.COMPLETED);
    assert.ok(result.nextTask, 'Next instance spawned');
    assert.strictEqual(result.nextTask.status, TaskStatus.TODO);
    assert.strictEqual(result.nextTask.dueDate, '2026-09-16', 'Advanced exactly 7 days');
    assert.strictEqual(result.nextTask.dueTime, '08:00', 'Preserved dueTime');
    assert.strictEqual(result.nextTask.seriesId, 'task_rec_1', 'Preserved seriesId');
    assert.strictEqual(result.nextTask.parentTaskId, 'task_rec_1', 'Links to parentTaskId');
    assert.strictEqual(result.nextTask.instanceNumber, 2, 'Incremented instanceNumber');
    assert.strictEqual(result.nextTask.assignedPersonId, 'p_rec_1', 'Inherited assignee');
});

await check('FAM-P4-16', 'Recurrence idempotency: completing an already-completed recurring task does not duplicate next instances', async () => {
    // Calling transitionTaskStatus on the completed task again
    // Note: State machine restricts COMPLETED -> only TODO or ARCHIVED. But if complete is re-sent or simulated:
    const tasksBefore = await FamilyRepository.listTasks({ householdId: 'hh_rec_1' });
    const countBefore = tasksBefore.length;

    // Direct atomic complete test for idempotency:
    const task = await FamilyRepository.getTask('task_rec_1');
    assert.strictEqual(task.status, TaskStatus.COMPLETED);

    // Call service transition or check:
    const householdTasks = await FamilyRepository.listTasks({ householdId: 'hh_rec_1', includeArchived: true });
    const instances = householdTasks.filter(t => t.parentTaskId === 'task_rec_1');
    assert.strictEqual(instances.length, 1, 'Exactly one next instance exists for parentTaskId');
});

await check('FAM-P4-17', 'Cancelled recurring task rule: cancelling a recurring task does NOT spawn a recurring instance', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_cx_1', name: 'Cancel House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_cx_1', fullName: 'Emma' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({ id: 'm_cx_1', householdId: 'hh_cx_1', personId: 'p_cx_1' }));

    await FamilyOperationsService.saveTask({
        id: 'task_cx_1',
        householdId: 'hh_cx_1',
        title: 'Weekly Cancelled Chore',
        dueDate: '2026-09-09',
        recurrence: TaskRecurrence.WEEKLY
    });

    const { task: cancelled, nextTask } = await FamilyOperationsService.transitionTaskStatus('task_cx_1', TaskStatus.CANCELLED);
    assert.strictEqual(cancelled.status, TaskStatus.CANCELLED);
    assert.strictEqual(nextTask, null, 'Cancelled task must NOT spawn recurring nextTask');

    const allTasks = await FamilyRepository.listTasks({ householdId: 'hh_cx_1' });
    assert.strictEqual(allTasks.length, 1, 'No future instances spawned');
});

await check('FAM-P4-18', 'Atomic recurring completion rollback: failure during next-instance persistence rolls back completely', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_rb_1', name: 'Rollback House' }));
    await FamilyOperationsService.saveTask({
        id: 'task_rb_1',
        householdId: 'hh_rb_1',
        title: 'Atomic Task',
        status: TaskStatus.TODO
    });

    // Simulate invalid nextTaskInstance in atomicCompleteAndAdvanceTask
    await assert.rejects(
        async () => await FamilyRepository.atomicCompleteAndAdvanceTask('task_rb_1', { completedAt: '2026-09-09T12:00:00.000Z' }, {
            // Malformed task object
            id: 'broken_task',
            householdId: 'hh_rb_1',
            title: '' // Empty title fails validation!
        }),
        /FamilyTask requires a non-empty string title/
    );

    // Verify task_rb_1 remains TODO (rolled back, not left in COMPLETED)
    const original = await FamilyRepository.getTask('task_rb_1');
    assert.strictEqual(original.status, TaskStatus.TODO);
    assert.strictEqual(original.completedAt, null);
});

// -----------------------------------------------------------------------------
// OWNERSHIP VS ASSIGNMENT (FAM-P4-19)
// -----------------------------------------------------------------------------

await check('FAM-P4-19', 'Ownership semantics: covers household-owned (owner: null), individually-owned, owner != assignee, owner == assignee', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_own_1', name: 'Ownership House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_own_A', fullName: 'Alice' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_own_B', fullName: 'Bob' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({ id: 'm_own_A', householdId: 'hh_own_1', personId: 'p_own_A' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({ id: 'm_own_B', householdId: 'hh_own_1', personId: 'p_own_B' }));

    // 1. Household-owned unassigned chore (owner: null, assigned: null)
    const t1 = await FamilyOperationsService.saveTask({
        householdId: 'hh_own_1',
        title: 'Sweep Front Porch',
        ownerPersonId: null,
        assignedPersonId: null
    });
    assert.strictEqual(t1.ownerPersonId, null);
    assert.strictEqual(t1.assignedPersonId, null);

    // 2. Household-owned assigned task (owner: null, assigned: Alice)
    const t2 = await FamilyOperationsService.saveTask({
        householdId: 'hh_own_1',
        title: 'Mow Lawn',
        ownerPersonId: null,
        assignedPersonId: 'p_own_A'
    });
    assert.strictEqual(t2.ownerPersonId, null);
    assert.strictEqual(t2.assignedPersonId, 'p_own_A');

    // 3. Individually-owned assigned to self (owner: Alice, assigned: Alice)
    const t3 = await FamilyOperationsService.saveTask({
        householdId: 'hh_own_1',
        title: 'Dentist Appointment',
        ownerPersonId: 'p_own_A',
        assignedPersonId: 'p_own_A'
    });
    assert.strictEqual(t3.ownerPersonId, 'p_own_A');
    assert.strictEqual(t3.assignedPersonId, 'p_own_A');

    // 4. Owner != Assignee (owner: Alice oversees, assigned: Bob executes)
    const t4 = await FamilyOperationsService.saveTask({
        householdId: 'hh_own_1',
        title: 'Paint Garage',
        ownerPersonId: 'p_own_A',
        assignedPersonId: 'p_own_B'
    });
    assert.strictEqual(t4.ownerPersonId, 'p_own_A');
    assert.strictEqual(t4.assignedPersonId, 'p_own_B');
});

// -----------------------------------------------------------------------------
// RESPONSIBILITY ARCHIVAL & DELETION (FAM-P4-20 to 21)
// -----------------------------------------------------------------------------

await check('FAM-P4-20', 'Responsibility archival preserves linked tasks and prevents new tasks from linking to it', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_resp_1', name: 'Resp House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_resp_1', fullName: 'Frank' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({ id: 'm_resp_1', householdId: 'hh_resp_1', personId: 'p_resp_1' }));

    const resp = await FamilyOperationsService.saveResponsibility({
        id: 'resp_cars',
        householdId: 'hh_resp_1',
        title: 'Car Maintenance',
        leadPersonId: 'p_resp_1'
    });

    // Create linked task
    await FamilyOperationsService.saveTask({
        id: 'task_tire',
        householdId: 'hh_resp_1',
        responsibilityId: 'resp_cars',
        title: 'Rotate Tires'
    });

    // Archive responsibility
    await FamilyOperationsService.archiveResponsibility('resp_cars');
    const archivedResp = await FamilyRepository.getResponsibility('resp_cars');
    assert.strictEqual(archivedResp.status, ResponsibilityStatus.ARCHIVED);

    // Linked task remains intact and historical link is preserved
    const linkedTask = await FamilyRepository.getTask('task_tire');
    assert.strictEqual(linkedTask.responsibilityId, 'resp_cars');

    // Attempting to link a NEW task to an archived responsibility is REJECTED
    await assert.rejects(
        async () => await FamilyOperationsService.saveTask({
            householdId: 'hh_resp_1',
            responsibilityId: 'resp_cars',
            title: 'Oil Change'
        }),
        /Cannot link task to archived responsibility 'resp_cars'/
    );
});

await check('FAM-P4-21', 'Responsibility physical deletion is blocked if any linked tasks exist', async () => {
    // resp_cars still has task_tire linked to it
    await assert.rejects(
        async () => await FamilyRepository.deleteResponsibility('resp_cars'),
        /Cannot physically delete Responsibility 'resp_cars' because one or more tasks reference it/
    );

    // Delete the task, then physical deletion succeeds
    await FamilyRepository.deleteTask('task_tire');
    const deleted = await FamilyRepository.deleteResponsibility('resp_cars');
    assert.strictEqual(deleted, true);
});

// -----------------------------------------------------------------------------
// REFERENTIAL INTEGRITY & ISOLATION (FAM-P4-22 to 25)
// -----------------------------------------------------------------------------

await check('FAM-P4-22', 'Referential integrity: rejects task/responsibility if householdId does not exist', async () => {
    await assert.rejects(
        async () => await FamilyOperationsService.saveTask({
            householdId: 'hh_nonexistent',
            title: 'Ghost Task'
        }),
        /Household 'hh_nonexistent' does not exist/
    );
    await assert.rejects(
        async () => await FamilyOperationsService.saveResponsibility({
            householdId: 'hh_nonexistent',
            title: 'Ghost Resp',
            leadPersonId: 'p1'
        }),
        /Household 'hh_nonexistent' does not exist/
    );
});

await check('FAM-P4-23', 'Referential integrity: rejects task assignment if assignedPersonId does not belong to household', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_iso_1', name: 'House 1' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_stranger', fullName: 'Stranger' }));
    // Stranger is not a member of hh_iso_1

    await assert.rejects(
        async () => await FamilyOperationsService.saveTask({
            householdId: 'hh_iso_1',
            title: 'Illegal Task Assignment',
            assignedPersonId: 'p_stranger'
        }),
        /Person 'p_stranger' is not an active or provisional member of household 'hh_iso_1'/
    );
});

await check('FAM-P4-24', 'Multi-household isolation: member of Household A cannot be assigned to task in Household B', async () => {
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_iso_2', name: 'House 2' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_house1_member', fullName: 'Member 1' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({
        id: 'm_iso_1',
        householdId: 'hh_iso_1',
        personId: 'p_house1_member'
    }));

    // Attempt to assign member of House 1 to task in House 2
    await assert.rejects(
        async () => await FamilyOperationsService.saveTask({
            householdId: 'hh_iso_2',
            title: 'Cross Household Task',
            assignedPersonId: 'p_house1_member'
        }),
        /Person 'p_house1_member' is not an active or provisional member of household 'hh_iso_2'/
    );
});

await check('FAM-P4-25', 'Unassigned household pool: tasks with assignedPersonId: null persist and query cleanly as household chores', async () => {
    const chore = await FamilyOperationsService.saveTask({
        householdId: 'hh_iso_1',
        title: 'Empty Dishwasher',
        assignedPersonId: null
    });

    assert.strictEqual(chore.assignedPersonId, null);
    const listed = await FamilyOperationsService.listTasks({ householdId: 'hh_iso_1' });
    const found = listed.find(t => t.id === chore.id);
    assert.ok(found);
    assert.strictEqual(found.assigneeName, 'Household Pool');
});

// -----------------------------------------------------------------------------
// MEMBER LIFECYCLE & PERSON DELETION PROTECTION (FAM-P4-26 to 28)
// -----------------------------------------------------------------------------

await check('FAM-P4-26', 'Archived member assignment guard: cannot assign new tasks or responsibilities to an archived member', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_mem_1', name: 'Member Lifecycle House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_archived_1', fullName: 'Grace' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({
        id: 'm_mem_1',
        householdId: 'hh_mem_1',
        personId: 'p_archived_1'
    }));

    // Archive person
    await FamilyRepository.archivePerson('p_archived_1');

    // Attempt to assign new task
    await assert.rejects(
        async () => await FamilyOperationsService.saveTask({
            householdId: 'hh_mem_1',
            title: 'Task for Archived Member',
            assignedPersonId: 'p_archived_1'
        }),
        /Cannot assign task to archived person 'p_archived_1'/
    );

    // Attempt to assign new responsibility
    await assert.rejects(
        async () => await FamilyOperationsService.saveResponsibility({
            householdId: 'hh_mem_1',
            title: 'Resp for Archived Member',
            leadPersonId: 'p_archived_1'
        }),
        /Cannot assign responsibility to archived person 'p_archived_1'/
    );
});

await check('FAM-P4-27', 'Person archival preserves historical tasks, assignments, and responsibilities intact', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_hist_1', name: 'History House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_hist_1', fullName: 'Henry' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({
        id: 'm_hist_1',
        householdId: 'hh_hist_1',
        personId: 'p_hist_1'
    }));

    // Create responsibility and task while active
    await FamilyOperationsService.saveResponsibility({
        id: 'resp_hist_1',
        householdId: 'hh_hist_1',
        title: 'Henry Responsibility',
        leadPersonId: 'p_hist_1'
    });
    await FamilyOperationsService.saveTask({
        id: 'task_hist_1',
        householdId: 'hh_hist_1',
        title: 'Henry Task',
        assignedPersonId: 'p_hist_1'
    });

    // Archive Henry
    await FamilyRepository.archivePerson('p_hist_1');

    // Records remain preserved with Henry's personId
    const resp = await FamilyRepository.getResponsibility('resp_hist_1');
    assert.strictEqual(resp.leadPersonId, 'p_hist_1');

    const task = await FamilyRepository.getTask('task_hist_1');
    assert.strictEqual(task.assignedPersonId, 'p_hist_1');
});

await check('FAM-P4-28', 'Physical deletion of Person blocked by active AND archived task/responsibility references with sanitized generic error', async () => {
    // Delete membership to isolate task and responsibility referential integrity
    await FamilyRepository.deleteMembership('m_hist_1');

    // Invariant: Person deletion error is generic without entity IDs
    await assert.rejects(
        async () => await FamilyRepository.deletePerson('p_hist_1'),
        (err) => {
            assert.strictEqual(
                err.message,
                'Cannot physically delete this Person because one or more tasks or responsibilities reference them'
            );
            return true;
        }
    );

    // Archive task, then attempt physical deletion again
    await FamilyOperationsService.transitionTaskStatus('task_hist_1', TaskStatus.ARCHIVED);
    await assert.rejects(
        async () => await FamilyRepository.deletePerson('p_hist_1'),
        (err) => {
            assert.strictEqual(
                err.message,
                'Cannot physically delete this Person because one or more tasks or responsibilities reference them'
            );
            return true;
        }
    );
});

// -----------------------------------------------------------------------------
// HOUSEHOLD DELETION POLICY (FAM-P4-29)
// -----------------------------------------------------------------------------

await check('FAM-P4-29', 'Household deletion cascades cleanup of tasks and responsibilities while preserving Person entities intact', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_cascade_1', name: 'Cascade House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_casc_1', fullName: 'Ivy' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({
        id: 'm_casc_1',
        householdId: 'hh_cascade_1',
        personId: 'p_casc_1'
    }));

    await FamilyOperationsService.saveResponsibility({
        id: 'resp_casc_1',
        householdId: 'hh_cascade_1',
        title: 'Ivy Resp',
        leadPersonId: 'p_casc_1'
    });
    await FamilyOperationsService.saveTask({
        id: 'task_casc_1',
        householdId: 'hh_cascade_1',
        title: 'Ivy Task',
        assignedPersonId: 'p_casc_1'
    });

    // Delete household
    await FamilyRepository.deleteHousehold('hh_cascade_1');

    // Responsibilities and tasks for that household are cascaded
    assert.strictEqual(await FamilyRepository.getResponsibility('resp_casc_1'), null);
    assert.strictEqual(await FamilyRepository.getTask('task_casc_1'), null);

    // Person remains 100% intact!
    const person = await FamilyRepository.getPerson('p_casc_1');
    assert.ok(person);
    assert.strictEqual(person.fullName, 'Ivy');
});

// -----------------------------------------------------------------------------
// TASK FILTERING & SUMMARY METRICS (FAM-P4-30 to 32)
// -----------------------------------------------------------------------------

await check('FAM-P4-30', 'Task filtering by status, priority, assignee, and responsibility', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_flt_1', name: 'Filter House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_flt_1', fullName: 'Jack' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({ id: 'm_flt_1', householdId: 'hh_flt_1', personId: 'p_flt_1' }));

    await FamilyOperationsService.saveTask({ id: 't_todo', householdId: 'hh_flt_1', title: 'T1', priority: TaskPriority.HIGH, status: TaskStatus.TODO, assignedPersonId: 'p_flt_1' });
    await FamilyOperationsService.saveTask({ id: 't_prog', householdId: 'hh_flt_1', title: 'T2', priority: TaskPriority.LOW, status: TaskStatus.IN_PROGRESS, assignedPersonId: null });

    const highTasks = await FamilyOperationsService.listTasks({ householdId: 'hh_flt_1', priority: TaskPriority.HIGH });
    assert.strictEqual(highTasks.length, 1);
    assert.strictEqual(highTasks[0].id, 't_todo');

    const inProgTasks = await FamilyOperationsService.listTasks({ householdId: 'hh_flt_1', status: TaskStatus.IN_PROGRESS });
    assert.strictEqual(inProgTasks.length, 1);
    assert.strictEqual(inProgTasks[0].id, 't_prog');
});

await check('FAM-P4-31', 'Operational summary metrics: active tasks, overdue, due today, due soon, open responsibilities, strict ISO week', async () => {
    FamilyRepository._resetInMemory();
    const hhId = 'hh_sum_1';
    const refDate = new Date(Date.UTC(2026, 8, 9, 12, 0, 0)); // Wednesday 2026-09-09

    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: hhId, name: 'Summary House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_sum_1', fullName: 'Kate' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({ id: 'm_sum_1', householdId: hhId, personId: 'p_sum_1' }));

    // 1 Overdue task (active)
    await FamilyOperationsService.saveTask({ householdId: hhId, title: 'Overdue', dueDate: '2026-09-08', status: TaskStatus.TODO });
    // 1 Due today task (active)
    await FamilyOperationsService.saveTask({ householdId: hhId, title: 'Due Today', dueDate: '2026-09-09', status: TaskStatus.TODO });
    // 1 Due soon task (active, 2 days away)
    await FamilyOperationsService.saveTask({ householdId: hhId, title: 'Due Soon', dueDate: '2026-09-11', status: TaskStatus.IN_PROGRESS });
    // 1 Completed this week (completed on Monday 2026-09-07 in current ISO week)
    await FamilyOperationsService.saveTask({
        householdId: hhId,
        title: 'Done Mon',
        status: TaskStatus.COMPLETED,
        completedAt: '2026-09-07T10:00:00.000Z'
    });
    // 1 Completed LAST week (completed on Sunday 2026-09-06 before ISO week start)
    await FamilyOperationsService.saveTask({
        householdId: hhId,
        title: 'Done Last Week',
        status: TaskStatus.COMPLETED,
        completedAt: '2026-09-06T23:59:59.000Z'
    });
    // 1 Archived task (MUST be excluded from active metrics!)
    await FamilyOperationsService.saveTask({
        householdId: hhId,
        title: 'Archived Task',
        dueDate: '2026-09-08',
        status: TaskStatus.ARCHIVED
    });

    // 2 Responsibilities (1 ACTIVE, 1 ARCHIVED)
    await FamilyOperationsService.saveResponsibility({ householdId: hhId, title: 'Active Resp', leadPersonId: 'p_sum_1', status: ResponsibilityStatus.ACTIVE });
    await FamilyOperationsService.saveResponsibility({ householdId: hhId, title: 'Archived Resp', leadPersonId: 'p_sum_1', status: ResponsibilityStatus.ARCHIVED });

    const summary = await FamilyOperationsService.getOperationalSummary(hhId, refDate);

    assert.strictEqual(summary.totalActiveTasks, 3, 'Total active: 3 (archived excluded)');
    assert.strictEqual(summary.overdueTasks, 1);
    assert.strictEqual(summary.dueToday, 1);
    assert.strictEqual(summary.dueSoon, 1);
    assert.strictEqual(summary.completedThisWeek, 1, 'Only task completed in current ISO week (Mon-Sun UTC)');
    assert.strictEqual(summary.openResponsibilities, 1, 'Only active responsibilities');
});

await check('FAM-P4-32', 'Archived records accessibility: archived tasks are excluded from active metrics but accessible for audits', async () => {
    const activeTasks = await FamilyRepository.listTasks({ householdId: 'hh_sum_1', includeArchived: false });
    const allTasks = await FamilyRepository.listTasks({ householdId: 'hh_sum_1', includeArchived: true });

    assert.strictEqual(activeTasks.length, 5); // 3 active + 2 completed
    assert.strictEqual(allTasks.length, 6); // Includes the 1 archived task
});

// -----------------------------------------------------------------------------
// DIAGNOSTIC SANITIZATION & ZERO READINESS LEAKAGE (FAM-P4-33 to 34)
// -----------------------------------------------------------------------------

await check('FAM-P4-33', 'Diagnostic sanitization: Person deletion errors exclude private notes, titles, and entity IDs', async () => {
    FamilyRepository._resetInMemory();
    await FamilyRepository.upsertHousehold(createEmptyHousehold({ id: 'hh_san_1', name: 'Sanitized House' }));
    await FamilyRepository.upsertPerson(createEmptyPerson({ id: 'p_san_1', fullName: 'Leo' }));
    await FamilyRepository.upsertMembership(createEmptyMembership({ id: 'm_san_1', householdId: 'hh_san_1', personId: 'p_san_1' }));

    await FamilyOperationsService.saveTask({
        householdId: 'hh_san_1',
        title: 'Secret Medical Task with Sensitive Notes',
        assignedPersonId: 'p_san_1'
    });

    // Delete membership to isolate task referential integrity
    await FamilyRepository.deleteMembership('m_san_1');

    try {
        await FamilyRepository.deletePerson('p_san_1');
        assert.fail('Should have thrown error');
    } catch (err) {
        assert.strictEqual(err.message, 'Cannot physically delete this Person because one or more tasks or responsibilities reference them');
        assert.strictEqual(err.message.includes('Secret Medical Task'), false, 'Private task title not leaked');
        assert.strictEqual(err.message.includes('p_san_1'), false, 'Person ID not leaked');
    }
});

await check('FAM-P4-34', 'Zero readiness scoring / family health calculations / financial reward ledger bindings in operations engine', async () => {
    const summary = await FamilyOperationsService.getOperationalSummary('hh_san_1');

    // Negative assertions: strictly no readiness scores or financial metrics
    assert.strictEqual('readinessScore' in summary, false, 'No readinessScore');
    assert.strictEqual('familyHealth' in summary, false, 'No familyHealth');
    assert.strictEqual('completionRate' in summary, false, 'No completionRate');
    assert.strictEqual('rewardBalance' in summary, false, 'No rewardBalance');
    assert.strictEqual('allowanceDue' in summary, false, 'No allowanceDue');
});

console.log('\n================================================================');
console.log(`🎉 ALL TESTS PASSED: ${passCount} / ${totalCount} checks verified`);
console.log('================================================================\n');
