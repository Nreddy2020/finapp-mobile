/**
 * FinLife Family Responsibility Service
 * Task dispatch, urgency tagging, overdue detection, and category filtering.
 * Strict BigInt safety, zero duplicate transactions.
 */

import {
    ResponsibilityCategory,
    ResponsibilityPriority,
    ResponsibilityStatus,
    DataAvailabilityState
} from './familyContracts.js';
import { FamilyRepository } from './familyRepository.js';
import { parseAmountPaise, formatPaiseToRupees } from './familyProtectionService.js';

const PRIORITY_ORDER = {
    [ResponsibilityPriority.URGENT]: 1,
    [ResponsibilityPriority.HIGH]: 2,
    [ResponsibilityPriority.MEDIUM]: 3,
    [ResponsibilityPriority.LOW]: 4
};

export const FamilyResponsibilityService = {
    async getResponsibilities(filterFn = null) {
        return await FamilyRepository.getResponsibilities(filterFn);
    },

    async getResponsibilityById(id) {
        return await FamilyRepository.getResponsibilityById(id);
    },

    async saveResponsibility(resp) {
        return await FamilyRepository.saveResponsibility(resp);
    },

    async deleteResponsibility(id) {
        return await FamilyRepository.deleteResponsibility(id);
    },

    enrichResponsibility(resp, personsMap = new Map(), today = new Date()) {
        const amtPaise = parseAmountPaise(resp.estimatedAmountPaise);
        const todayStr = today.toISOString().split('T')[0];
        const isDone = resp.status === ResponsibilityStatus.COMPLETED || resp.status === ResponsibilityStatus.CANCELLED;
        const isOverdue = !isDone && resp.dueDate && resp.dueDate < todayStr;

        const assignedPerson = resp.assignedPersonId ? personsMap.get(resp.assignedPersonId) : null;
        const affectedPerson = resp.affectedPersonId ? personsMap.get(resp.affectedPersonId) : null;

        return {
            ...resp,
            estimatedAmountPaiseStr: amtPaise.toString(),
            estimatedAmountDisplay: amtPaise > 0n ? formatPaiseToRupees(amtPaise) : null,
            isOverdue,
            statusBadge: isOverdue ? ResponsibilityStatus.OVERDUE : resp.status,
            assignedPersonName: assignedPerson?.core?.name || assignedPerson?.name || 'Unassigned',
            affectedPersonName: affectedPerson?.core?.name || affectedPerson?.name || 'Family',
            priorityRank: PRIORITY_ORDER[resp.priority] || 99
        };
    },

    getResponsibilitiesView({
        responsibilities = [],
        persons = [],
        filter = 'ALL',
        currentUserId = null,
        personId = null,
        today = new Date()
    } = {}) {
        if (!responsibilities.length) {
            return {
                state: DataAvailabilityState.EMPTY,
                totalCount: 0,
                pendingCount: 0,
                urgentCount: 0,
                overdueCount: 0,
                tasks: []
            };
        }

        const personsMap = new Map();
        persons.forEach(p => {
            const pId = p.core?.id || p.id;
            personsMap.set(pId, p);
        });

        const enriched = responsibilities.map(r => this.enrichResponsibility(r, personsMap, today));

        let filtered = enriched;
        if (filter === 'MY_TASKS' && currentUserId) {
            filtered = enriched.filter(r => r.assignedPersonId === currentUserId);
        } else if (filter === 'BY_PERSON' && personId) {
            filtered = enriched.filter(r => r.assignedPersonId === personId || r.affectedPersonId === personId);
        } else if (filter === 'URGENT') {
            filtered = enriched.filter(r => r.priority === ResponsibilityPriority.URGENT || r.isOverdue);
        } else if (filter === 'PENDING') {
            filtered = enriched.filter(r => r.status !== ResponsibilityStatus.COMPLETED && r.status !== ResponsibilityStatus.CANCELLED);
        }

        // Sort: Active tasks first, then by priority rank, then by due date
        filtered.sort((a, b) => {
            const aDone = a.status === ResponsibilityStatus.COMPLETED || a.status === ResponsibilityStatus.CANCELLED;
            const bDone = b.status === ResponsibilityStatus.COMPLETED || b.status === ResponsibilityStatus.CANCELLED;
            if (aDone !== bDone) return aDone ? 1 : -1;

            if (a.priorityRank !== b.priorityRank) {
                return a.priorityRank - b.priorityRank;
            }

            const dateA = a.dueDate || '9999-12-31';
            const dateB = b.dueDate || '9999-12-31';
            return dateA.localeCompare(dateB);
        });

        const pendingCount = enriched.filter(r => r.status !== ResponsibilityStatus.COMPLETED && r.status !== ResponsibilityStatus.CANCELLED).length;
        const overdueCount = enriched.filter(r => r.isOverdue).length;
        const urgentCount = enriched.filter(r => r.priority === ResponsibilityPriority.URGENT && !r.isDone).length;

        return {
            state: DataAvailabilityState.AVAILABLE,
            totalCount: enriched.length,
            pendingCount,
            urgentCount,
            overdueCount,
            tasks: filtered
        };
    }
};
