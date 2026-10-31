/**
 * services/time/index.js
 *
 * Public API Barrel for FinLife Time Management System.
 */

// Authoritative Contracts & Planner
export * from './plannerContracts.js';
export { PlannerService } from './plannerService.js';

// Restart-Safe Focus & Habit Streaks
export * from './focusService.js';
export { HabitsService } from './habitsService.js';

// 4 Smart Intelligence Engines
export * from './priorityEngine.js';
export * from './breakProtectionEngine.js';
export * from './deadlineEngine.js';
export * from './estimateLearningEngine.js';

// Intelligent Scheduling & Analytics
export * from './schedulingEngine.js';
export * from './timeAnalyticsService.js';
