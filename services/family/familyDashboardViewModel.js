/**
 * FinLife Family Dashboard View-Model Synthesizer
 * Conforms to FinLife Family Operating System Functional Scope V1.
 * Synthesizes all 13 dashboard sections with uniform DASHBOARD_STATE and presentation safety.
 */

import { DASHBOARD_STATE, FamilyRole } from './familyContracts.js';

function formatCurrency(paise) {
    if (paise === null || paise === undefined) return '—';
    const num = Number(paise) / 100;
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function sanitizeForPresentation(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') {
        return Number(obj);
    }
    if (typeof obj === 'number') {
        if (!Number.isFinite(obj)) return null;
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeForPresentation);
    }
    if (typeof obj === 'object') {
        const res = {};
        for (const [k, v] of Object.entries(obj)) {
            res[k] = sanitizeForPresentation(v);
        }
        return res;
    }
    return obj;
}

export const FamilyDashboardViewModel = {
    /**
     * Synthesizes all 13 sections for the complete Family Dashboard.
     */
    build({
        household = null,
        households = [],
        persons = [],
        relationships = [],
        commitments = [],
        occurrences = [],
        commitmentsViewModel = null,
        familyObligations = null,
        safeToSpendDisplay = 'Not configured',
        netWorthSnapshot = null,
        runwayMetrics = null,
        emergencyReadiness = {},
        protectionSummary = {},
        responsibilities = [],
        activityLogs = [],
        educationGoals = [],
        elderCarePlans = []
    } = {}) {
        const now = new Date();
        const nowIso = now.toISOString();
        const hour = now.getHours();
        const timeOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

        const activePersons = (persons || []).filter(p => {
            const stat = p.status || p.core?.status || 'ACTIVE';
            return stat !== 'ARCHIVED' && stat !== 'DELETED';
        });

        // 1. Family Identity & Household Selector
        const activeHh = household || households.find(h => h.isPrimary) || households[0] || null;
        const householdSection = {
            state: activeHh ? DASHBOARD_STATE.AVAILABLE : (households.length === 0 ? DASHBOARD_STATE.NOT_CONFIGURED : DASHBOARD_STATE.EMPTY),
            value: activeHh,
            displayValue: activeHh ? activeHh.name : 'No Household Configured',
            subtitle: activeHh ? `${activePersons.length} member${activePersons.length !== 1 ? 's' : ''} in household` : 'Create your primary family household',
            householdsList: households.map(h => ({ id: h.id, name: h.name, isPrimary: h.isPrimary })),
            source: 'FamilyRepository',
            sourceAvailability: 'ONLINE',
            lastVerifiedAt: nowIso,
            actions: [{ label: 'Switch Household', actionType: 'SELECT_HOUSEHOLD', target: 'modal_household' }]
        };

        // 2. Greeting & Family Status
        const headPerson = activePersons.find(p => (p.role || p.core?.role) === FamilyRole.HEAD) || activePersons[0];
        const surnameMatch = headPerson?.name?.split(' ') || [];
        const familyFamilyLabel = surnameMatch.length > 1 ? `${surnameMatch[surnameMatch.length - 1]} Family` : (activeHh?.name || 'Family');
        const greetingSection = {
            state: DASHBOARD_STATE.AVAILABLE,
            greetingText: `${timeOfDay}, ${familyFamilyLabel}`,
            familyStatusBadge: 'FinLife Family OS • Active',
            isOfflineReady: true,
            source: 'FamilySystem',
            sourceAvailability: 'ONLINE',
            lastVerifiedAt: nowIso
        };

        // 3. Family Health Summary
        const membersWithBloodGroup = activePersons.filter(p => (p.profile?.bloodGroup || p.medicalProfile?.bloodGroup)).length;
        const emergencyContactsCount = activePersons.filter(p => (p.emergencyProfile?.isEmergencyContact || p.isEmergencyContact)).length;
        const doctorsInCircle = activePersons.filter(p => (p.role || p.core?.role) === FamilyRole.DOCTOR).length;
        const hasHealthData = membersWithBloodGroup > 0 || emergencyContactsCount > 0 || doctorsInCircle > 0;

        const healthSummarySection = {
            state: activePersons.length === 0 ? DASHBOARD_STATE.NOT_CONFIGURED : (hasHealthData ? DASHBOARD_STATE.AVAILABLE : DASHBOARD_STATE.EMPTY),
            value: {
                coveredMembersCount: activePersons.length,
                bloodGroupsLoggedCount: membersWithBloodGroup,
                emergencyContactsCount,
                doctorsInCircleCount: doctorsInCircle
            },
            displayValue: hasHealthData ? `${membersWithBloodGroup}/${activePersons.length} Blood Groups On File` : 'Health profile pending configuration',
            subtitle: emergencyContactsCount > 0 ? `${emergencyContactsCount} Emergency Contact${emergencyContactsCount !== 1 ? 's' : ''} Designated` : 'Designate emergency contacts',
            source: 'FamilyHealthFoundation',
            sourceAvailability: activePersons.length > 0 ? 'ONLINE' : 'UNCONFIGURED',
            lastVerifiedAt: nowIso,
            actions: [
                { label: 'Emergency SOS', actionType: 'OPEN_SOS', target: 'modal_sos' },
                { label: 'View Health', actionType: 'NAVIGATE', target: 'Health' }
            ]
        };

        // 4. Needs Attention Stream
        const alerts = [];
        if (protectionSummary.uncoveredMembers?.length > 0) {
            alerts.push({
                id: 'alert_uncovered_members',
                type: 'error',
                title: `${protectionSummary.uncoveredMembers.length} Uncovered Member(s)`,
                subtitle: `${protectionSummary.uncoveredMembers.map(m => m.name).join(', ')} pending health cover`,
                targetTab: 'Protection'
            });
        }
        if (protectionSummary.expiringSoonCount > 0) {
            alerts.push({
                id: 'alert_expiring_policies',
                type: 'warning',
                title: `${protectionSummary.expiringSoonCount} Policy Renewal Soon`,
                subtitle: 'Policy expiry within next 30 days',
                targetTab: 'Protection'
            });
        }
        const overdueTasks = (responsibilities || []).filter(r => r.status === 'OVERDUE' || (r.dueDate && r.dueDate < nowIso.split('T')[0] && r.status !== 'COMPLETED'));
        if (overdueTasks.length > 0) {
            alerts.push({
                id: 'alert_overdue_tasks',
                type: 'warning',
                title: `${overdueTasks.length} Overdue Responsibility`,
                subtitle: `Action needed: ${overdueTasks[0].title}`,
                targetTab: 'Tasks'
            });
        }
        if (commitmentsViewModel?.failed?.length > 0) {
            alerts.push({
                id: 'alert_failed_reconciliation',
                type: 'error',
                title: `${commitmentsViewModel.failed.length} Payment Reconciliation Failed`,
                subtitle: 'Action required to retry payment recording',
                targetTab: 'Dashboard'
            });
        }
        const needsAttentionSection = {
            state: alerts.length > 0 ? DASHBOARD_STATE.NEEDS_REVIEW : DASHBOARD_STATE.EMPTY,
            alerts,
            count: alerts.length,
            source: 'CrossDomainAggregation',
            sourceAvailability: 'ONLINE',
            lastVerifiedAt: nowIso
        };

        // 5. Upcoming Tasks & Renewals
        const upcomingTasks = (responsibilities || [])
            .filter(r => r.status !== 'COMPLETED')
            .slice(0, 3)
            .map(t => ({
                id: t.id,
                title: t.title,
                priority: t.priority || 'MEDIUM',
                dueDate: t.dueDate || 'Pending',
                type: 'TASK'
            }));
        const upcomingObligationsList = (commitmentsViewModel?.upcoming || []).slice(0, 3).map(o => ({
            id: o.id,
            title: o.name,
            dueDate: o.dueInLabel || o.formattedDate,
            amountFormatted: o.amountFormatted,
            type: 'OBLIGATION'
        }));
        const combinedUpcoming = [...upcomingObligationsList, ...upcomingTasks].slice(0, 4);

        const upcomingSection = {
            state: combinedUpcoming.length > 0 ? DASHBOARD_STATE.AVAILABLE : DASHBOARD_STATE.EMPTY,
            items: combinedUpcoming,
            displayValue: combinedUpcoming.length > 0 ? `${combinedUpcoming.length} upcoming item${combinedUpcoming.length !== 1 ? 's' : ''}` : 'All responsibilities up to date',
            subtitle: 'Scheduled payments and responsibilities for the next 30 days',
            source: 'CommitmentsAndTasks',
            sourceAvailability: 'ONLINE',
            lastVerifiedAt: nowIso
        };

        // 6. Financial Obligations
        const hasCommitments = commitments && commitments.length > 0;
        const totalMonthlyPaise = familyObligations?.totalFamilyMonthlyCommitted?.paise || 0n;
        const totalMonthlyDisplay = familyObligations?.totalFamilyMonthlyDisplay || commitmentsViewModel?.hero?.monthlyCommittedFormatted || (hasCommitments ? '₹0' : '₹0');

        const obligationsSection = {
            state: hasCommitments ? DASHBOARD_STATE.AVAILABLE : DASHBOARD_STATE.EMPTY,
            hasObligations: hasCommitments,
            monthlyCommittedFormatted: totalMonthlyDisplay,
            activeCount: commitments.length,
            paidCount: commitmentsViewModel?.recentPaid?.length || 0,
            upcomingCount: commitmentsViewModel?.upcoming?.length || 0,
            failedCount: commitmentsViewModel?.failed?.length || 0,
            upcomingList: commitmentsViewModel?.upcoming || [],
            safeToSpendDisplay: safeToSpendDisplay || 'Not configured',
            source: 'CommitmentsService',
            sourceAvailability: 'ONLINE',
            lastVerifiedAt: nowIso,
            actions: [
                { label: 'Add Obligation', actionType: 'OPEN_MODAL', target: 'modal_obligation' },
                { label: 'View All Recurring Payments', actionType: 'NAVIGATE', target: '/recurring' }
            ]
        };

        // 7. Education Funding Progress (Honest NOT_CONFIGURED in Phase 1 unless goals exist)
        const hasEduGoals = educationGoals && educationGoals.length > 0;
        const educationSection = {
            state: hasEduGoals ? DASHBOARD_STATE.AVAILABLE : DASHBOARD_STATE.NOT_CONFIGURED,
            value: hasEduGoals ? educationGoals.length : null,
            displayValue: hasEduGoals ? `${educationGoals.length} Horizon Goal(s) Modeled` : 'Not configured',
            subtitle: hasEduGoals ? 'Inflation-modeled future college goals' : 'Model inflation-adjusted higher education goals for children',
            goalsCount: hasEduGoals ? educationGoals.length : 0,
            source: 'EducationAdapter',
            sourceAvailability: hasEduGoals ? 'ONLINE' : 'UNCONFIGURED',
            lastVerifiedAt: nowIso,
            actions: [{ label: 'Model Goal', actionType: 'NAVIGATE', target: 'Education' }]
        };

        // 8. Emergency Fund Coverage
        const runwayStatus = runwayMetrics?.status || 'NOT_CONFIGURED';
        const runwayDisplay = runwayMetrics?.runwayDisplay || (runwayStatus === 'NOT_CONFIGURED' ? 'Not configured' : 'Unavailable');
        const emergencyFundSection = {
            state: runwayStatus === 'NOT_CONFIGURED' ? DASHBOARD_STATE.NOT_CONFIGURED : (runwayMetrics?.isAvailable ? DASHBOARD_STATE.AVAILABLE : DASHBOARD_STATE.UNAVAILABLE),
            value: runwayMetrics?.runwayMonths || null,
            displayValue: runwayDisplay,
            subtitle: runwayStatus === 'NOT_CONFIGURED' ? 'Configure recurring commitments to measure liquidity runway' : `${runwayMetrics?.status || 'Active'} liquidity runway`,
            runwayMonths: runwayMetrics?.runwayMonths || null,
            runwayStatus: runwayStatus,
            liquidDisplay: netWorthSnapshot?.liquidDisplay || 'Unavailable',
            source: 'FamilyFinancialAdapter',
            sourceAvailability: runwayMetrics?.isAvailable ? 'ONLINE' : 'UNCONFIGURED',
            lastVerifiedAt: nowIso
        };

        // 9. Family Financial Snapshot (Read-Only)
        const financialSnapshotSection = {
            state: netWorthSnapshot ? DASHBOARD_STATE.AVAILABLE : DASHBOARD_STATE.UNAVAILABLE,
            value: netWorthSnapshot,
            netWorthDisplay: netWorthSnapshot?.netWorthDisplay || 'Unavailable',
            totalAssetsDisplay: netWorthSnapshot?.totalAssetsDisplay || 'Unavailable',
            liquidDisplay: netWorthSnapshot?.liquidDisplay || 'Unavailable',
            totalLiabilitiesDisplay: netWorthSnapshot?.totalLiabilitiesDisplay || 'Unavailable',
            isReadonly: true,
            source: 'FamilyFinancialAdapter',
            sourceAvailability: netWorthSnapshot ? 'ONLINE' : 'UNAVAILABLE',
            lastVerifiedAt: nowIso,
            actions: [{ label: 'View Full Financials', actionType: 'NAVIGATE', target: 'Financials' }]
        };

        // 10. People Summary / Family Roster
        const uncoveredCount = protectionSummary.uncoveredMembers?.length || 0;
        const coveredCount = Math.max(0, activePersons.length - uncoveredCount);
        const peopleRosterSection = {
            state: activePersons.length > 0 ? DASHBOARD_STATE.AVAILABLE : DASHBOARD_STATE.EMPTY,
            totalCount: activePersons.length,
            coveredCount,
            uncoveredCount,
            persons: activePersons.map(p => ({
                id: p.id || p.core?.id,
                name: p.name || p.core?.name || 'Member',
                role: p.role || p.familyRole || p.core?.role || 'MEMBER',
                category: p.circleCategory || p.core?.circleCategory || 'FAMILY',
                bloodGroup: p.profile?.bloodGroup || p.medicalProfile?.bloodGroup || null,
                isUncovered: protectionSummary?.uncoveredMembers?.some(u => u.id === (p.id || p.core?.id))
            })),
            displayValue: `${coveredCount}/${activePersons.length} Protected`,
            subtitle: activePersons.length > 0 ? `${activePersons.length} active family profile${activePersons.length !== 1 ? 's' : ''}` : 'No family members added',
            source: 'FamilyRepository',
            sourceAvailability: 'ONLINE',
            lastVerifiedAt: nowIso,
            actions: [{ label: 'Add Member', actionType: 'OPEN_MODAL', target: 'modal_member' }]
        };

        // 11. Recent Family Changes (Activity Log)
        const recentActivities = (activityLogs || []).slice(0, 4).map(a => ({
            id: a.id,
            actionType: a.actionType,
            description: a.description,
            createdAt: a.createdAt,
            timeLabel: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Recent'
        }));
        const recentChangesSection = {
            state: recentActivities.length > 0 ? DASHBOARD_STATE.AVAILABLE : DASHBOARD_STATE.EMPTY,
            items: recentActivities,
            displayValue: recentActivities.length > 0 ? `${recentActivities.length} recent event${recentActivities.length !== 1 ? 's' : ''}` : 'No recent changes recorded',
            source: 'FamilyActivityLog',
            sourceAvailability: 'ONLINE',
            lastVerifiedAt: nowIso
        };

        // 12. Quick Actions Row
        const quickActionsSection = {
            state: DASHBOARD_STATE.AVAILABLE,
            actions: [
                { id: 'act_add_person', label: 'Add Person', icon: 'UserPlus', actionType: 'OPEN_MODAL', target: 'modal_member' },
                { id: 'act_add_task', label: 'New Task', icon: 'CheckSquare', actionType: 'OPEN_MODAL', target: 'modal_task' },
                { id: 'act_add_obligation', label: 'Add Obligation', icon: 'Plus', actionType: 'OPEN_MODAL', target: 'modal_obligation' },
                { id: 'act_sos', label: 'Emergency SOS', icon: 'PhoneCall', actionType: 'OPEN_SOS', target: 'modal_sos' }
            ],
            source: 'FamilyHubActions',
            sourceAvailability: 'ONLINE',
            lastVerifiedAt: nowIso
        };

        // 13. Family Plan Overview
        const planOverviewSection = {
            state: DASHBOARD_STATE.AVAILABLE,
            planName: 'FinLife Family Standard',
            tierStatus: 'ACTIVE',
            offlineEncryption: 'AES-256 GCM • Local Only',
            membersLimit: 'Unlimited',
            source: 'FamilyConfiguration',
            sourceAvailability: 'ONLINE',
            lastVerifiedAt: nowIso
        };

        // Compile Raw ViewModel
        const rawViewModel = {
            household: householdSection,
            greeting: greetingSection,
            healthSummary: healthSummarySection,
            needsAttention: needsAttentionSection,
            upcoming: upcomingSection,
            obligations: obligationsSection,
            education: educationSection,
            emergencyFund: emergencyFundSection,
            financialSnapshot: financialSnapshotSection,
            peopleRoster: peopleRosterSection,
            recentChanges: recentChangesSection,
            quickActions: quickActionsSection,
            planOverview: planOverviewSection,
            // Protection readiness score
            protectionReadiness: {
                state: DASHBOARD_STATE.AVAILABLE,
                completedCount: emergencyReadiness.completedCount || 0,
                totalCount: emergencyReadiness.totalCount || 9,
                scorePercent: emergencyReadiness.scorePercent || 0,
                readinessStatus: emergencyReadiness.readinessStatus || 'CHECKING',
                source: 'FamilyProtectionService'
            }
        };

        // Apply Presentation Safety (Deep recursive BigInt & Unsafe numeric conversion prevention)
        return sanitizeForPresentation(rawViewModel);
    }
};
