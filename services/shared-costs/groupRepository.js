/**
 * services/shared-costs/groupRepository.js
 * 
 * FinLife Shared Costs & Groups Accounting Engine V1 — Multi-Group Persistence Layer.
 * 
 * Implements atomic save envelopes, SHA-256 store checksums, BigInt serialization,
 * non-destructive revisions/voids, operation logging, and crash projection recovery.
 * 
 * Invariants:
 * - Single source of truth: FINLIFE_SHARED_COSTS_STORE_V1.
 * - Zero hard deletion of financial records (ACTIVE -> VOIDED/REVERSED).
 * - Cryptographic audit trail chaining on every state-altering mutation.
 * - Pure integer arithmetic in BigInt paise across all stored balances.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    GROUP_STATUS,
    EXPENSE_STATUS,
    SETTLEMENT_STATUS,
    MEMBER_ROLES,
    MEMBER_STATUS,
    SPLIT_METHODS,
    bigIntReplacer,
    bigIntReviver,
    toPaise,
    paiseToRupees,
    transitionGroupState,
    transitionExpenseState
} from './groupContracts.js';
import { GroupValidation } from './groupValidation.js';
import { GroupBalanceEngine } from './groupBalanceEngine.js';
import { GroupAudit, GroupAuditEventType } from './groupAudit.js';
import { sha256 } from '../cashbook/cashbookAuditTrail.js';

export const SHARED_COSTS_STORAGE_KEY = 'FINLIFE_SHARED_COSTS_STORE_V1';
export const SHARED_COSTS_SCHEMA_VERSION = 1;

export const GroupRepository = {
    /**
     * Load raw store envelope from AsyncStorage with checksum verification
     */
    async loadEnvelope() {
        const raw = await AsyncStorage.getItem(SHARED_COSTS_STORAGE_KEY);
        if (!raw) {
            return {
                schemaVersion: SHARED_COSTS_SCHEMA_VERSION,
                groups: {},
                expenses: {},
                settlements: {},
                recurringTemplates: {},
                operationLog: [],
                auditTrail: [],
                quarantine: [],
                lastModified: new Date().toISOString()
            };
        }

        try {
            const parsed = JSON.parse(raw, bigIntReviver);
            if (parsed.checksum) {
                const { checksum, ...content } = parsed;
                const contentStr = JSON.stringify(content, bigIntReplacer);
                const computed = sha256(contentStr);
                if (computed !== checksum) {
                    console.warn(`[GroupRepository] Checksum mismatch in Shared Costs store. Quarantining envelope.`);
                    return {
                        schemaVersion: SHARED_COSTS_SCHEMA_VERSION,
                        groups: {},
                        expenses: {},
                        settlements: {},
                        recurringTemplates: {},
                        operationLog: [],
                        auditTrail: [],
                        quarantine: [parsed],
                        lastModified: new Date().toISOString(),
                        quarantineReason: 'CHECKSUM_MISMATCH'
                    };
                }
            }
            return parsed;
        } catch (err) {
            console.error(`[GroupRepository] Corrupted Shared Costs store:`, err);
            return {
                schemaVersion: SHARED_COSTS_SCHEMA_VERSION,
                groups: {},
                expenses: {},
                settlements: {},
                recurringTemplates: {},
                operationLog: [],
                auditTrail: [],
                quarantine: [{ rawData: raw, error: err.message }],
                lastModified: new Date().toISOString(),
                quarantineReason: 'PARSE_ERROR'
            };
        }
    },

    /**
     * Atomically save store envelope with SHA-256 checksum
     */
    async saveEnvelope(envelope) {
        envelope.lastModified = new Date().toISOString();
        const { checksum, ...content } = envelope;
        const contentStr = JSON.stringify(content, bigIntReplacer);
        const computedChecksum = sha256(contentStr);
        const payloadToStore = {
            ...content,
            checksum: computedChecksum
        };
        await AsyncStorage.setItem(SHARED_COSTS_STORAGE_KEY, JSON.stringify(payloadToStore, bigIntReplacer));
        return payloadToStore;
    },

    /**
     * Clear store completely (Dev / Test use only)
     */
    async clearStore() {
        await AsyncStorage.removeItem(SHARED_COSTS_STORAGE_KEY);
    },

    /**
     * Get all groups with balance summaries and status
     */
    async getAllGroups() {
        const envelope = await this.loadEnvelope();
        const groupsList = Object.values(envelope.groups || {});

        return groupsList.map(group => {
            if (group.status === GROUP_STATUS.QUARANTINED) {
                return {
                    ...group,
                    balanceSummary: null,
                    isSettled: false,
                    expenseCount: 0,
                    settlementCount: 0,
                    quarantined: true
                };
            }

            const groupExpenses = Object.values(envelope.expenses || {}).filter(e => e.groupId === group.id);
            const groupSettlements = Object.values(envelope.settlements || {}).filter(s => s.groupId === group.id);
            const balanceResult = GroupBalanceEngine.calculateGroupBalances(group, groupExpenses, groupSettlements);

            return {
                ...group,
                balanceSummary: balanceResult,
                isSettled: balanceResult.isSettled,
                expenseCount: groupExpenses.filter(e => e.status === EXPENSE_STATUS.ACTIVE).length,
                settlementCount: groupSettlements.filter(s => s.status === SETTLEMENT_STATUS.COMPLETED).length
            };
        });
    },

    /**
     * Get a single group by ID with its full dataset (expenses, settlements, balances)
     */
    async getGroupById(groupId) {
        const envelope = await this.loadEnvelope();
        const group = envelope.groups[groupId];
        if (!group) return null;

        const expenses = Object.values(envelope.expenses || {})
            .filter(e => e.groupId === groupId)
            .sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));

        const settlements = Object.values(envelope.settlements || {})
            .filter(s => s.groupId === groupId)
            .sort((a, b) => new Date(b.settlementDate) - new Date(a.settlementDate));

        const recurringTemplates = Object.values(envelope.recurringTemplates || {})
            .filter(t => t.groupId === groupId);

        let balanceResult = null;
        if (group.status !== GROUP_STATUS.QUARANTINED) {
            balanceResult = GroupBalanceEngine.calculateGroupBalances(group, expenses, settlements);
        }

        return {
            ...group,
            expenses,
            settlements,
            recurringTemplates,
            balanceResult
        };
    },

    /**
     * Create a new group
     */
    async createGroup(groupData, actor = 'USER') {
        GroupValidation.validateGroup(groupData);

        const envelope = await this.loadEnvelope();
        const now = new Date().toISOString();
        const groupId = groupData.id || `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        // Normalize members
        const rawMembers = Array.isArray(groupData.members) && groupData.members.length > 0
            ? groupData.members
            : [{ id: 'You', displayNameSnapshot: 'You', role: MEMBER_ROLES.OWNER, status: MEMBER_STATUS.ACTIVE }];

        const members = rawMembers.map((m, idx) => {
            const id = typeof m === 'string' ? m : (m.id || `m_${idx}`);
            const name = typeof m === 'string' ? m : (m.displayNameSnapshot || m.name || id);
            const role = m.role || (idx === 0 ? MEMBER_ROLES.OWNER : MEMBER_ROLES.MEMBER);
            return {
                id,
                groupId,
                personId: m.personId || null,
                displayNameSnapshot: name,
                role,
                status: MEMBER_STATUS.ACTIVE,
                joinedAt: now,
                leftAt: null
            };
        });

        const newGroup = {
            id: groupId,
            name: groupData.name.trim(),
            description: groupData.description ? groupData.description.trim() : '',
            type: groupData.type || 'TRIP',
            currency: groupData.currency || 'INR',
            status: GROUP_STATUS.ACTIVE,
            defaultSplitMethod: groupData.defaultSplitMethod || SPLIT_METHODS.EQUAL,
            createdAt: now,
            updatedAt: now,
            createdBy: actor,
            members,
            metadata: groupData.metadata || {}
        };

        envelope.groups[groupId] = newGroup;

        // Audit Trail
        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.GROUP_CREATED,
            groupId,
            entityId: groupId,
            payload: { name: newGroup.name, type: newGroup.type, memberCount: members.length },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        // Operation Log
        envelope.operationLog.push({
            operationId: `op_${Date.now()}`,
            type: 'CREATE_GROUP',
            groupId,
            timestamp: now,
            actor
        });

        await this.saveEnvelope(envelope);
        return newGroup;
    },

    /**
     * Update group metadata
     */
    async updateGroup(groupId, updates, actor = 'USER') {
        const envelope = await this.loadEnvelope();
        const existing = envelope.groups[groupId];
        if (!existing) {
            throw new Error(`GROUP_NOT_FOUND: Group with ID '${groupId}' does not exist`);
        }

        // Check if group is ARCHIVED or QUARANTINED: mutations are forbidden unless performing a valid state transition
        if (existing.status === GROUP_STATUS.ARCHIVED && (!updates.status || updates.status === GROUP_STATUS.ARCHIVED)) {
            throw new Error(`CANNOT_MUTATE_ARCHIVED_GROUP: Group '${groupId}' is ARCHIVED and read-only`);
        }
        if (existing.status === GROUP_STATUS.QUARANTINED && (!updates.status || updates.status === GROUP_STATUS.QUARANTINED)) {
            throw new Error(`CANNOT_MUTATE_QUARANTINED_GROUP: Group '${groupId}' is QUARANTINED`);
        }

        if (updates.name) {
            existing.name = updates.name.trim();
        }
        if (updates.description !== undefined) {
            existing.description = updates.description.trim();
        }
        if (updates.type) {
            existing.type = updates.type;
        }
        if (updates.defaultSplitMethod) {
            existing.defaultSplitMethod = updates.defaultSplitMethod;
        }
        if (updates.status && updates.status !== existing.status) {
            if (updates.status === GROUP_STATUS.ACTIVE) {
                if (existing.status === GROUP_STATUS.ARCHIVED) {
                    throw new Error(`ILLEGAL_GENERIC_REOPEN: Reopening an ARCHIVED group requires explicit administrative command reopenArchivedGroup()`);
                }
                if (existing.status === GROUP_STATUS.SETTLED) {
                    throw new Error(`ILLEGAL_GENERIC_REOPEN: Reopening a SETTLED group requires explicit administrative command reopenSettledGroup()`);
                }
                if (existing.status === GROUP_STATUS.QUARANTINED) {
                    throw new Error(`ILLEGAL_GENERIC_REOPEN: Recovering a QUARANTINED group requires explicit administrative command recoverQuarantinedGroup()`);
                }
            }

            let hasUnsettledBalances = false;
            if (updates.status === GROUP_STATUS.SETTLED) {
                const groupExpenses = Object.values(envelope.expenses || {}).filter(e => e.groupId === groupId);
                const groupSettlements = Object.values(envelope.settlements || {}).filter(s => s.groupId === groupId);
                const balanceResult = GroupBalanceEngine.calculateGroupBalances(existing, groupExpenses, groupSettlements);
                hasUnsettledBalances = !balanceResult.isSettled;
            }
            const transition = transitionGroupState(existing.status, updates.status, { hasUnsettledBalances });
            existing.status = transition.state;
        }
        existing.updatedAt = new Date().toISOString();

        // Audit
        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.GROUP_UPDATED,
            groupId,
            entityId: groupId,
            payload: updates,
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        await this.saveEnvelope(envelope);
        return existing;
    },

    /**
     * Administrative Command: Reopen an ARCHIVED group back to ACTIVE
     * Requires explicit reason, authorized role, increments revision, records audit event, and supports idempotency.
     */
    async reopenArchivedGroup(groupId, options = {}) {
        const { reason, actor = 'USER', actorRole = MEMBER_ROLES.OWNER, idempotencyKey = null } = options;
        if (!reason || typeof reason !== 'string' || reason.trim() === '') {
            throw new Error(`REOPEN_REASON_REQUIRED: Explicit reason is required to reopen an archived group`);
        }
        if (actorRole !== MEMBER_ROLES.OWNER && actorRole !== MEMBER_ROLES.ADMIN) {
            throw new Error(`UNAUTHORIZED: Only OWNER or ADMIN role can reopen an archived group (got: ${actorRole})`);
        }

        const envelope = await this.loadEnvelope();
        const existing = envelope.groups[groupId];
        if (!existing) {
            throw new Error(`GROUP_NOT_FOUND: Group with ID '${groupId}' does not exist`);
        }
        if (existing.status !== GROUP_STATUS.ARCHIVED) {
            throw new Error(`INVALID_GROUP_STATE: Group '${groupId}' is not ARCHIVED (current: ${existing.status})`);
        }

        // Idempotency check
        if (idempotencyKey && envelope.operationLog.some(op => op.idempotencyKey === idempotencyKey)) {
            return existing;
        }

        const transition = transitionGroupState(existing.status, GROUP_STATUS.ACTIVE);
        existing.status = transition.state;
        existing.revision = (existing.revision || 1) + 1;
        existing.updatedAt = new Date().toISOString();

        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.GROUP_UPDATED,
            groupId,
            entityId: groupId,
            revision: existing.revision,
            operationId: idempotencyKey || `op_reopen_archived_${Date.now()}`,
            payload: {
                action: 'REOPEN_ARCHIVED_GROUP',
                previousStatus: GROUP_STATUS.ARCHIVED,
                newStatus: GROUP_STATUS.ACTIVE,
                reason: reason.trim(),
                idempotencyKey
            },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        envelope.operationLog.push({
            operationId: `op_${Date.now()}`,
            idempotencyKey,
            type: 'REOPEN_ARCHIVED_GROUP',
            groupId,
            timestamp: new Date().toISOString(),
            actor
        });

        await this.saveEnvelope(envelope);
        return existing;
    },

    /**
     * Administrative Command: Reopen a SETTLED group back to ACTIVE
     * Requires explicit reason, authorized role, increments revision, records audit event, and supports idempotency.
     */
    async reopenSettledGroup(groupId, options = {}) {
        const { reason, actor = 'USER', actorRole = MEMBER_ROLES.OWNER, idempotencyKey = null } = options;
        if (!reason || typeof reason !== 'string' || reason.trim() === '') {
            throw new Error(`REOPEN_REASON_REQUIRED: Explicit reason is required to reopen a settled group`);
        }
        if (actorRole !== MEMBER_ROLES.OWNER && actorRole !== MEMBER_ROLES.ADMIN) {
            throw new Error(`UNAUTHORIZED: Only OWNER or ADMIN role can reopen a settled group (got: ${actorRole})`);
        }

        const envelope = await this.loadEnvelope();
        const existing = envelope.groups[groupId];
        if (!existing) {
            throw new Error(`GROUP_NOT_FOUND: Group with ID '${groupId}' does not exist`);
        }
        if (existing.status !== GROUP_STATUS.SETTLED) {
            throw new Error(`INVALID_GROUP_STATE: Group '${groupId}' is not SETTLED (current: ${existing.status})`);
        }

        // Idempotency check
        if (idempotencyKey && envelope.operationLog.some(op => op.idempotencyKey === idempotencyKey)) {
            return existing;
        }

        const transition = transitionGroupState(existing.status, GROUP_STATUS.ACTIVE);
        existing.status = transition.state;
        existing.revision = (existing.revision || 1) + 1;
        existing.updatedAt = new Date().toISOString();

        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.GROUP_UPDATED,
            groupId,
            entityId: groupId,
            revision: existing.revision,
            operationId: idempotencyKey || `op_reopen_settled_${Date.now()}`,
            payload: {
                action: 'REOPEN_SETTLED_GROUP',
                previousStatus: GROUP_STATUS.SETTLED,
                newStatus: GROUP_STATUS.ACTIVE,
                reason: reason.trim(),
                idempotencyKey
            },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        envelope.operationLog.push({
            operationId: `op_${Date.now()}`,
            idempotencyKey,
            type: 'REOPEN_SETTLED_GROUP',
            groupId,
            timestamp: new Date().toISOString(),
            actor
        });

        await this.saveEnvelope(envelope);
        return existing;
    },

    /**
     * Administrative Command: Recover a QUARANTINED group back to ACTIVE
     * Requires explicit reason, authorized role, increments revision, records audit event, and supports idempotency.
     */
    async recoverQuarantinedGroup(groupId, options = {}) {
        const { reason, actor = 'USER', actorRole = MEMBER_ROLES.ADMIN, idempotencyKey = null } = options;
        if (!reason || typeof reason !== 'string' || reason.trim() === '') {
            throw new Error(`RECOVER_REASON_REQUIRED: Explicit reason is required to recover a quarantined group`);
        }
        if (actorRole !== MEMBER_ROLES.OWNER && actorRole !== MEMBER_ROLES.ADMIN) {
            throw new Error(`UNAUTHORIZED: Only OWNER or ADMIN role can recover a quarantined group (got: ${actorRole})`);
        }

        const envelope = await this.loadEnvelope();
        const existing = envelope.groups[groupId];
        if (!existing) {
            throw new Error(`GROUP_NOT_FOUND: Group with ID '${groupId}' does not exist`);
        }
        if (existing.status !== GROUP_STATUS.QUARANTINED) {
            throw new Error(`INVALID_GROUP_STATE: Group '${groupId}' is not QUARANTINED (current: ${existing.status})`);
        }

        // Idempotency check
        if (idempotencyKey && envelope.operationLog.some(op => op.idempotencyKey === idempotencyKey)) {
            return existing;
        }

        const transition = transitionGroupState(existing.status, GROUP_STATUS.ACTIVE);
        existing.status = transition.state;
        existing.revision = (existing.revision || 1) + 1;
        existing.updatedAt = new Date().toISOString();

        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.GROUP_UPDATED,
            groupId,
            entityId: groupId,
            revision: existing.revision,
            operationId: idempotencyKey || `op_recover_quarantine_${Date.now()}`,
            payload: {
                action: 'RECOVER_QUARANTINED_GROUP',
                previousStatus: GROUP_STATUS.QUARANTINED,
                newStatus: GROUP_STATUS.ACTIVE,
                reason: reason.trim(),
                idempotencyKey
            },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        envelope.operationLog.push({
            operationId: `op_${Date.now()}`,
            idempotencyKey,
            type: 'RECOVER_QUARANTINED_GROUP',
            groupId,
            timestamp: new Date().toISOString(),
            actor
        });

        await this.saveEnvelope(envelope);
        return existing;
    },

    /**
     * Add member to existing group
     */
    async addMember(groupId, memberData, actor = 'USER') {
        const envelope = await this.loadEnvelope();
        const group = envelope.groups[groupId];
        if (!group) throw new Error(`GROUP_NOT_FOUND: Group '${groupId}' does not exist`);

        if (group.status === GROUP_STATUS.ARCHIVED) {
            throw new Error(`CANNOT_MUTATE_ARCHIVED_GROUP: Group '${groupId}' is ARCHIVED and read-only`);
        }
        if (group.status === GROUP_STATUS.QUARANTINED) {
            throw new Error(`CANNOT_MUTATE_QUARANTINED_GROUP: Group '${groupId}' is QUARANTINED`);
        }
        if (group.status === GROUP_STATUS.SETTLED) {
            throw new Error(`CANNOT_MUTATE_SETTLED_GROUP: Group '${groupId}' is SETTLED and cannot modify membership`);
        }

        const newId = String(memberData.id || `m_${Date.now()}`);
        if (group.members.some(m => m.id === newId)) {
            throw new Error(`DUPLICATE_MEMBER: Member '${newId}' already exists in group`);
        }

        const newMember = {
            id: newId,
            groupId,
            personId: memberData.personId || null,
            displayNameSnapshot: String(memberData.displayNameSnapshot || memberData.name || newId).trim(),
            role: memberData.role || MEMBER_ROLES.MEMBER,
            status: MEMBER_STATUS.ACTIVE,
            joinedAt: new Date().toISOString(),
            leftAt: null
        };

        group.members.push(newMember);
        group.updatedAt = new Date().toISOString();

        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.MEMBER_ADDED,
            groupId,
            entityId: newId,
            payload: { memberId: newId, name: newMember.displayNameSnapshot },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        await this.saveEnvelope(envelope);
        return newMember;
    },

    /**
     * Remove member from group (fails closed if member has unsettled balance)
     */
    async removeMember(groupId, memberId, actor = 'USER') {
        const envelope = await this.loadEnvelope();
        const group = envelope.groups[groupId];
        if (!group) throw new Error(`GROUP_NOT_FOUND: Group '${groupId}' does not exist`);

        if (group.status === GROUP_STATUS.ARCHIVED) {
            throw new Error(`CANNOT_MUTATE_ARCHIVED_GROUP: Group '${groupId}' is ARCHIVED and read-only`);
        }
        if (group.status === GROUP_STATUS.QUARANTINED) {
            throw new Error(`CANNOT_MUTATE_QUARANTINED_GROUP: Group '${groupId}' is QUARANTINED`);
        }
        if (group.status === GROUP_STATUS.SETTLED) {
            throw new Error(`CANNOT_MUTATE_SETTLED_GROUP: Group '${groupId}' is SETTLED and cannot modify membership`);
        }

        // Check balances
        const expenses = Object.values(envelope.expenses || {}).filter(e => e.groupId === groupId);
        const settlements = Object.values(envelope.settlements || {}).filter(s => s.groupId === groupId);
        const balances = GroupBalanceEngine.calculateGroupBalances(group, expenses, settlements);

        GroupValidation.assertCanRemoveMember(memberId, balances.projectionMap);

        // Mark member as LEFT (non-destructive)
        const target = group.members.find(m => m.id === memberId);
        if (!target) throw new Error(`MEMBER_NOT_FOUND: Member '${memberId}' not in group`);

        target.status = MEMBER_STATUS.LEFT;
        target.leftAt = new Date().toISOString();
        group.updatedAt = new Date().toISOString();

        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.MEMBER_REMOVED,
            groupId,
            entityId: memberId,
            payload: { memberId },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        await this.saveEnvelope(envelope);
        return true;
    },

    /**
     * Add a group expense
     */
    async addExpense(groupId, expenseData, actor = 'USER') {
        GroupValidation.validateExpense(expenseData);

        const envelope = await this.loadEnvelope();
        const group = envelope.groups[groupId];
        if (!group) throw new Error(`GROUP_NOT_FOUND: Group '${groupId}' does not exist`);

        if (group.status !== GROUP_STATUS.ACTIVE) {
            if (group.status === GROUP_STATUS.SETTLED) {
                throw new Error(`CANNOT_ADD_EXPENSE_TO_SETTLED_GROUP: Group '${groupId}' is SETTLED and rejects ordinary expenses`);
            }
            if (group.status === GROUP_STATUS.ARCHIVED) {
                throw new Error(`CANNOT_MUTATE_ARCHIVED_GROUP: Group '${groupId}' is ARCHIVED and read-only`);
            }
            if (group.status === GROUP_STATUS.QUARANTINED) {
                throw new Error(`CANNOT_MUTATE_QUARANTINED_GROUP: Group '${groupId}' is QUARANTINED`);
            }
            throw new Error(`ILLEGAL_GROUP_STATUS_FOR_EXPENSE: Cannot add expense when group status is '${group.status}'`);
        }

        const now = new Date().toISOString();
        const expenseId = expenseData.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const totalAmountPaise = BigInt(expenseData.totalAmountPaise !== undefined ? expenseData.totalAmountPaise : toPaise(expenseData.amount));

        const expense = {
            id: expenseId,
            groupId,
            profileId: expenseData.profileId || 'DEFAULT',
            title: expenseData.title.trim(),
            category: expenseData.category || 'General',
            currency: group.currency || 'INR',
            totalAmountPaise,
            expenseDate: expenseData.expenseDate || now,
            createdAt: now,
            updatedAt: now,
            createdBy: actor,
            status: EXPENSE_STATUS.ACTIVE,
            splitMethod: expenseData.splitMethod || SPLIT_METHODS.EQUAL,
            notes: expenseData.notes ? expenseData.notes.trim() : '',
            attachmentIds: expenseData.attachmentIds || [],
            source: expenseData.source || 'MANUAL',
            revision: 1,
            idempotencyKey: expenseData.idempotencyKey || `exp_${expenseId}`,
            payments: expenseData.payments,
            shares: expenseData.shares
        };

        envelope.expenses[expenseId] = expense;
        group.updatedAt = now;

        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.EXPENSE_CREATED,
            groupId,
            entityId: expenseId,
            payload: { title: expense.title, totalAmountPaise: expense.totalAmountPaise.toString() },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        await this.saveEnvelope(envelope);
        return expense;
    },

    /**
     * Non-destructive edit of an expense.
     * Marks previous version revised, increments revision counter.
     */
    async editExpense(groupId, expenseId, updatedData, actor = 'USER') {
        GroupValidation.validateExpense(updatedData);

        const envelope = await this.loadEnvelope();
        const group = envelope.groups[groupId];
        if (!group) throw new Error(`GROUP_NOT_FOUND: Group '${groupId}' does not exist`);

        if (group.status !== GROUP_STATUS.ACTIVE) {
            if (group.status === GROUP_STATUS.SETTLED) {
                throw new Error(`CANNOT_EDIT_EXPENSE_IN_SETTLED_GROUP: Group '${groupId}' is SETTLED and rejects expense edits`);
            }
            if (group.status === GROUP_STATUS.ARCHIVED) {
                throw new Error(`CANNOT_MUTATE_ARCHIVED_GROUP: Group '${groupId}' is ARCHIVED and read-only`);
            }
            if (group.status === GROUP_STATUS.QUARANTINED) {
                throw new Error(`CANNOT_MUTATE_QUARANTINED_GROUP: Group '${groupId}' is QUARANTINED`);
            }
            throw new Error(`ILLEGAL_GROUP_STATUS_FOR_EXPENSE: Cannot edit expense when group status is '${group.status}'`);
        }

        const existing = envelope.expenses[expenseId];
        if (!existing) throw new Error(`EXPENSE_NOT_FOUND: Expense '${expenseId}' does not exist`);
        if (existing.status !== EXPENSE_STATUS.ACTIVE) {
            throw new Error(`CANNOT_EDIT_INACTIVE_EXPENSE: Expense status is '${existing.status}'`);
        }

        const now = new Date().toISOString();
        const totalAmountPaise = BigInt(updatedData.totalAmountPaise !== undefined ? updatedData.totalAmountPaise : toPaise(updatedData.amount));

        // Archive previous revision snapshot in metadata
        const previousSnapshot = {
            title: existing.title,
            totalAmountPaise: existing.totalAmountPaise,
            payments: existing.payments,
            shares: existing.shares,
            revision: existing.revision,
            updatedAt: existing.updatedAt
        };

        existing.title = updatedData.title.trim();
        existing.category = updatedData.category || existing.category;
        existing.totalAmountPaise = totalAmountPaise;
        existing.splitMethod = updatedData.splitMethod || existing.splitMethod;
        existing.notes = updatedData.notes !== undefined ? updatedData.notes.trim() : existing.notes;
        existing.expenseDate = updatedData.expenseDate || existing.expenseDate;
        existing.payments = updatedData.payments;
        existing.shares = updatedData.shares;
        existing.revision = (existing.revision || 1) + 1;
        existing.updatedAt = now;
        existing.previousRevisions = existing.previousRevisions || [];
        existing.previousRevisions.push(previousSnapshot);

        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.EXPENSE_UPDATED,
            groupId,
            entityId: expenseId,
            payload: { revision: existing.revision, totalAmountPaise: totalAmountPaise.toString() },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        await this.saveEnvelope(envelope);
        return existing;
    },

    /**
     * Non-destructive void of an expense
     */
    async voidExpense(groupId, expenseId, reason = 'User voided', actor = 'USER') {
        const envelope = await this.loadEnvelope();
        const group = envelope.groups[groupId];
        if (group) {
            if (group.status === GROUP_STATUS.ARCHIVED) {
                throw new Error(`CANNOT_MUTATE_ARCHIVED_GROUP: Group '${groupId}' is ARCHIVED and read-only`);
            }
            if (group.status === GROUP_STATUS.QUARANTINED) {
                throw new Error(`CANNOT_MUTATE_QUARANTINED_GROUP: Group '${groupId}' is QUARANTINED`);
            }
        }

        const existing = envelope.expenses[expenseId];
        if (!existing) throw new Error(`EXPENSE_NOT_FOUND: Expense '${expenseId}' does not exist`);

        transitionExpenseState(existing.status, EXPENSE_STATUS.VOIDED);

        existing.status = EXPENSE_STATUS.VOIDED;
        existing.voidedAt = new Date().toISOString();
        existing.voidReason = reason;
        existing.updatedAt = new Date().toISOString();

        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.EXPENSE_VOIDED,
            groupId,
            entityId: expenseId,
            payload: { voidReason: reason },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        await this.saveEnvelope(envelope);
        return existing;
    },

    /**
     * Record a settlement between two group members
     */
    async recordSettlement(groupId, settlementData, actor = 'USER') {
        GroupValidation.validateSettlement(settlementData);

        const envelope = await this.loadEnvelope();
        const group = envelope.groups[groupId];
        if (!group) throw new Error(`GROUP_NOT_FOUND: Group '${groupId}' does not exist`);

        if (group.status === GROUP_STATUS.ARCHIVED) {
            throw new Error(`CANNOT_MUTATE_ARCHIVED_GROUP: Group '${groupId}' is ARCHIVED and read-only`);
        }
        if (group.status === GROUP_STATUS.QUARANTINED) {
            throw new Error(`CANNOT_MUTATE_QUARANTINED_GROUP: Group '${groupId}' is QUARANTINED`);
        }
        if (group.status === GROUP_STATUS.SETTLED) {
            throw new Error(`CANNOT_SETTLE_ALREADY_SETTLED_GROUP: Group '${groupId}' is already SETTLED`);
        }
        if (group.status === GROUP_STATUS.DRAFT) {
            throw new Error(`CANNOT_SETTLE_DRAFT_GROUP: Cannot record settlement in DRAFT group`);
        }

        const now = new Date().toISOString();
        const settlementId = settlementData.id || `stl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const amountPaise = BigInt(settlementData.amountPaise !== undefined ? settlementData.amountPaise : toPaise(settlementData.amount));

        const settlement = {
            id: settlementId,
            groupId,
            fromMemberId: String(settlementData.fromMemberId),
            toMemberId: String(settlementData.toMemberId),
            amountPaise,
            currency: group.currency || 'INR',
            settlementDate: settlementData.settlementDate || now,
            method: settlementData.method || 'UPI',
            note: settlementData.note || '',
            status: SETTLEMENT_STATUS.COMPLETED,
            createdAt: now,
            idempotencyKey: settlementData.idempotencyKey || `stl_${settlementId}`
        };

        envelope.settlements[settlementId] = settlement;
        group.updatedAt = now;

        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.SETTLEMENT_RECORDED,
            groupId,
            entityId: settlementId,
            payload: {
                fromMemberId: settlement.fromMemberId,
                toMemberId: settlement.toMemberId,
                amountPaise: settlement.amountPaise.toString()
            },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        await this.saveEnvelope(envelope);
        return settlement;
    },

    /**
     * Non-destructive voiding of a settlement
     */
    async voidSettlement(groupId, settlementId, reason = 'Voided settlement', actor = 'USER') {
        const envelope = await this.loadEnvelope();
        const group = envelope.groups[groupId];
        if (group) {
            if (group.status === GROUP_STATUS.ARCHIVED) {
                throw new Error(`CANNOT_MUTATE_ARCHIVED_GROUP: Group '${groupId}' is ARCHIVED and read-only`);
            }
            if (group.status === GROUP_STATUS.QUARANTINED) {
                throw new Error(`CANNOT_MUTATE_QUARANTINED_GROUP: Group '${groupId}' is QUARANTINED`);
            }
        }

        const existing = envelope.settlements[settlementId];
        if (!existing) throw new Error(`SETTLEMENT_NOT_FOUND: Settlement '${settlementId}' does not exist`);

        existing.status = SETTLEMENT_STATUS.VOIDED;
        existing.voidedAt = new Date().toISOString();
        existing.voidReason = reason;

        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.SETTLEMENT_VOIDED,
            groupId,
            entityId: settlementId,
            payload: { voidReason: reason },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        await this.saveEnvelope(envelope);
        return existing;
    },

    /**
     * Crash recovery & projection rebuilding
     * Replays active expenses and settlements for every group,
     * verifies conservation invariants bit-for-bit, and audits the rebuild.
     */
    async rebuildProjections(actor = 'SYSTEM_RECOVERY') {
        const envelope = await this.loadEnvelope();
        const groups = Object.values(envelope.groups || {});

        const results = [];
        for (const group of groups) {
            if (group.status === GROUP_STATUS.QUARANTINED) {
                continue; // Quarantined groups cannot participate in normal calculations
            }
            const expenses = Object.values(envelope.expenses || {}).filter(e => e.groupId === group.id);
            const settlements = Object.values(envelope.settlements || {}).filter(s => s.groupId === group.id);
            const balanceResult = GroupBalanceEngine.calculateGroupBalances(group, expenses, settlements);
            results.push(balanceResult);
        }

        const auditEntry = GroupAudit.createAuditEntry({
            eventType: GroupAuditEventType.PROJECTIONS_REBUILT,
            groupId: 'GLOBAL',
            entityId: 'ALL_GROUPS',
            payload: { rebuiltGroupsCount: groups.length },
            actor
        }, envelope.auditTrail);
        envelope.auditTrail.push(auditEntry);

        await this.saveEnvelope(envelope);
        return results;
    }
};
