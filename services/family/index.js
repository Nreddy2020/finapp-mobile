/**
 * services/family/index.js
 * 
 * Public API Barrel for FinLife Family Operating System Phase 1 Foundation.
 */

// Authoritative Contracts and Enums
export * from './familyContracts.js';

// Authoritative Repository
export { FamilyRepository } from './familyRepository.js';

// Domain Services
export { FamilyPersonService } from './familyPersonService.js';
export { FamilyHouseholdService } from './familyHouseholdService.js';
export { FamilyRelationshipService } from './familyRelationshipService.js';
export { FamilyTrustedCircleService } from './familyTrustedCircleService.js';
export { FamilyMigrationService } from './familyMigrationService.js';
export { FamilyDocumentService } from './familyDocumentService.js';
export { FamilyOperationsService } from './familyOperationsService.js';
export { FamilyProtectionService } from './familyProtectionService.js';
export { FamilyFinancialService } from './familyFinancialService.js';
export { FamilyActionService } from './familyActionService.js';
export { FamilyContinuityService } from './familyContinuityService.js';
export { FamilyBudgetPoolService } from './familyBudgetPoolService.js';
export { FamilyForecastService } from './familyForecastService.js';
export { FamilyGoalService } from './familyGoalService.js';
export { FamilyLifeEventService, createLifeEventService, validateLifeEvents } from './familyLifeEventService.js';
export { FamilyLifeEventStore, LIFE_EVENTS_STORAGE_KEY } from './familyLifeEventStore.js';
