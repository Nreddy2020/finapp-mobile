/**
 * FinLife Family Report View Model
 * 9 dedicated family report cards, 9-point Emergency Readiness check, and honest state contracts.
 * Zero BigInt leakage to the UI layer.
 */

import {
    EMERGENCY_READINESS_ITEMS,
    DataAvailabilityState,
    PolicyType,
    PolicyStatus,
    CircleCategory,
    FamilyRole,
    FamilyStatus
} from './familyContracts.js';
import { FamilyProtectionService } from './familyProtectionService.js';
import { FamilyResponsibilityService } from './familyResponsibilityService.js';
import { FamilyEducationService } from './familyEducationService.js';
import { FamilyCareService } from './familyCareService.js';
import { FamilyHealthService } from './familyHealthService.js';
import { FamilyFinancialAdapter } from './familyFinancialAdapter.js';
import { buildFamilyTreeMatrix } from './familyGraphEngine.js';

export const EMERGENCY_READINESS_V1 = 'V1';
export const EMERGENCY_READINESS_V2 = 'V2';
export const EMERGENCY_READINESS_V1_COUNT = 9;
export const EMERGENCY_READINESS_V2_COUNT = 10;

export function evaluateEmergencyReadiness({
    persons = [],
    policies = [],
    documents = [],
    runwayMetrics = null,
    sourceAvailability = DataAvailabilityState.AVAILABLE,
    version = EMERGENCY_READINESS_V1
} = {}) {
    const checkedAt = new Date().toISOString();
    const isV2 = version === EMERGENCY_READINESS_V2;
    const baseTotalCount = isV2 ? EMERGENCY_READINESS_V2_COUNT : EMERGENCY_READINESS_V1_COUNT;

    // If underlying sources are unavailable, readiness cannot be honestly computed
    if (sourceAvailability === DataAvailabilityState.UNAVAILABLE) {
        return {
            completedCount: null,
            totalCount: baseTotalCount,
            readinessBps: null,
            scorePercent: null,
            status: DataAvailabilityState.UNAVAILABLE,
            readinessStatus: DataAvailabilityState.UNAVAILABLE,
            missingItems: ['Source data unavailable for emergency audit'],
            incompleteItemsList: ['Source data unavailable for emergency audit'],
            checklist: [],
            checkedAt,
            sourceAvailability: DataAvailabilityState.UNAVAILABLE,
            version
        };
    }

    const primaryAdults = persons.filter(p => {
        const cat = p.core?.circleCategory || p.circleCategory;
        const role = p.core?.role || p.role;
        return cat === CircleCategory.FAMILY && (role === FamilyRole.HEAD || role === FamilyRole.SPOUSE || role === FamilyRole.CHILD);
    });

    const activePolicies = policies.filter(p => p.status === PolicyStatus.ACTIVE || p.status === PolicyStatus.EXPIRING_SOON);
    const hasHealthPol = activePolicies.some(p => p.policyType === PolicyType.HEALTH);
    const hasTermPol = activePolicies.some(p => p.policyType === PolicyType.TERM_LIFE);

    // 1. Primary contact
    const hasPrimaryContact = persons.some(p => p.emergencyProfile?.isEmergencyContact && p.emergencyProfile?.priorityOrder === 1);

    // 2. Secondary contact
    const hasSecondaryContact = persons.some(p => p.emergencyProfile?.isEmergencyContact && p.emergencyProfile?.priorityOrder === 2);

    // 3. Blood groups for primary members
    const missingBloodGroups = primaryAdults.filter(p => {
        const bg = (p.profile?.bloodGroup || p.medicalProfile?.bloodGroup || '').trim();
        return !bg || bg === '—' || bg.length < 2;
    });
    const bloodGroupsComplete = primaryAdults.length > 0 && missingBloodGroups.length === 0;

    // 4. Emergency doctor
    const doctors = FamilyHealthService.getDoctors(persons);
    const hasDoctor = doctors.length > 0;

    // 5. Active Health Insurance
    const healthInsuranceComplete = hasHealthPol;

    // 6. Active Term Life Insurance
    const lifeInsuranceComplete = hasTermPol;

    // 7. Critical care / allergies updated
    const hasMedicalDetails = persons.some(p => (p.medicalProfile?.allergies?.length > 0 || p.medicalProfile?.chronicConditions?.length > 0 || p.medicalProfile?.emergencyNotes));

    // 8. Essential family documents tagged
    const hasEssentialDocs = Array.isArray(documents) && documents.length > 0;

    // 9. Emergency liquidity reserve >= 3 months
    const reserveComplete = runwayMetrics ? runwayMetrics.meetsThreeMonthStandard : false;

    const checklist = [
        {
            id: 'PRIMARY_CONTACT',
            label: 'Primary Emergency Contact Designated',
            isComplete: hasPrimaryContact,
            detail: hasPrimaryContact ? 'Configured and active' : 'No primary emergency contact set',
            route: 'PeopleTrustedCircle'
        },
        {
            id: 'SECONDARY_CONTACT',
            label: 'Secondary Emergency Contact Designated',
            isComplete: hasSecondaryContact,
            detail: hasSecondaryContact ? 'Configured and active' : 'No secondary emergency contact set',
            route: 'PeopleTrustedCircle'
        },
        {
            id: 'BLOOD_GROUPS',
            label: 'Blood Group Documented for Primary Members',
            isComplete: bloodGroupsComplete,
            detail: bloodGroupsComplete ? 'All primary family blood groups on record' : `${missingBloodGroups.length} member(s) missing blood group`,
            route: 'HealthCare'
        },
        {
            id: 'DOCTOR_CONTACT',
            label: 'Emergency Doctor / Hospital Contact Configured',
            isComplete: hasDoctor,
            detail: hasDoctor ? `${doctors.length} doctor(s) linked` : 'No trusted physician or clinic attached',
            route: 'HealthCare'
        },
        {
            id: 'HEALTH_INSURANCE',
            label: 'Active Health Insurance Coverage in Place',
            isComplete: healthInsuranceComplete,
            detail: healthInsuranceComplete ? 'Active health policy verified' : 'No active family health insurance policy',
            route: 'FamilyProtection'
        },
        {
            id: 'LIFE_INSURANCE',
            label: 'Active Term Life Coverage for Income Earners',
            isComplete: lifeInsuranceComplete,
            detail: lifeInsuranceComplete ? 'Active term life policy verified' : 'No active term insurance found',
            route: 'FamilyProtection'
        },
        {
            id: 'CRITICAL_ALLERGIES',
            label: 'Critical Care / Allergy Records Updated',
            isComplete: hasMedicalDetails,
            detail: hasMedicalDetails ? 'Emergency medical instructions documented' : 'No allergy or emergency notes recorded',
            route: 'HealthCare'
        },
        {
            id: 'ESSENTIAL_DOCS',
            label: 'Essential Family Documents Available / Tagged',
            isComplete: hasEssentialDocs,
            detail: hasEssentialDocs ? `${documents.length} document(s) registered` : 'No family identity or policy documents uploaded',
            route: 'FamilyDocuments'
        },
        {
            id: 'EMERGENCY_RESERVE',
            label: 'Emergency Liquidity Reserve >= 3 Months',
            isComplete: reserveComplete,
            detail: runwayMetrics?.runwayDisplay ? `${runwayMetrics.runwayDisplay} runway available` : 'Runway not configured',
            route: 'FamilyFinancials'
        }
    ];

    if (isV2) {
        const isRunwayConfigured = runwayMetrics?.state === DataAvailabilityState.AVAILABLE && runwayMetrics?.status !== 'NO_COMMITTED_OUTFLOW' && runwayMetrics?.status !== 'NOT_CONFIGURED';
        checklist.push({
            id: 'EMERGENCY_RUNWAY_CONFIGURED',
            label: 'Emergency Runway Configured with Active Commitments',
            isComplete: isRunwayConfigured,
            detail: isRunwayConfigured ? `${runwayMetrics?.runwayDisplay || 'Runway'} active` : 'No active recurring commitments configured',
            route: 'FamilyFinancials'
        });
    }

    const completedCount = checklist.filter(item => item.isComplete).length;
    const totalCount = checklist.length;
    const readinessBps = Math.round((completedCount * 10000) / totalCount);
    const scorePercent = Math.round((completedCount / totalCount) * 100);

    let readinessStatus = 'NEEDS_ATTENTION';
    if (completedCount >= (isV2 ? 9 : 8)) readinessStatus = 'EXCELLENT';
    else if (completedCount >= (isV2 ? 7 : 6)) readinessStatus = 'GOOD';
    else if (completedCount < (isV2 ? 5 : 4)) readinessStatus = 'CRITICAL';

    const incompleteItemsList = checklist.filter(item => !item.isComplete).map(item => item.label);

    return {
        completedCount,
        totalCount,
        readinessBps,
        scorePercent,
        status: readinessStatus,
        readinessStatus,
        missingItems: incompleteItemsList,
        incompleteItemsList,
        checklist,
        checkedAt,
        sourceAvailability: sourceAvailability || DataAvailabilityState.AVAILABLE,
        version: isV2 ? EMERGENCY_READINESS_V2 : EMERGENCY_READINESS_V1
    };
}

export const FamilyReportViewModel = {
    buildReportsData({
        persons = [],
        relationships = [],
        policies = [],
        responsibilities = [],
        educationGoals = [],
        elderCarePlans = [],
        documents = [],
        netWorthSnapshot = null,
        runwayMetrics = null,
        sourceAvailability = DataAvailabilityState.AVAILABLE
    } = {}) {
        const emergencyReadiness = evaluateEmergencyReadiness({
            persons,
            policies,
            documents,
            runwayMetrics,
            sourceAvailability
        });

        const protectionSummary = FamilyProtectionService.getProtectionSummary(persons, policies);
        const responsibilitiesSummary = FamilyResponsibilityService.getResponsibilitiesView({
            responsibilities,
            persons,
            filter: 'ALL'
        });
        const educationSummary = FamilyEducationService.getEducationSummary(educationGoals, persons);
        const careSummary = FamilyCareService.getCareSummary(elderCarePlans, persons);
        const healthSummary = FamilyHealthService.getHealthOverview(persons);
        const treeMatrix = buildFamilyTreeMatrix(persons, relationships);

        const reportCards = [
            {
                id: 'REPORT_HEALTH_PROTECTION',
                title: 'Family Health Score & Protection Readiness',
                icon: 'Shield',
                color: '#10B981',
                summary: emergencyReadiness.completedCount !== null
                    ? `${emergencyReadiness.completedCount} of ${emergencyReadiness.totalCount} standards fulfilled (${(emergencyReadiness.readinessBps / 100).toFixed(1)}%)`
                    : 'Emergency audit unavailable',
                badge: emergencyReadiness.status,
                scorePercent: emergencyReadiness.scorePercent,
                readinessBps: emergencyReadiness.readinessBps,
                missingItems: emergencyReadiness.missingItems,
                incompleteList: emergencyReadiness.incompleteItemsList
            },
            {
                id: 'REPORT_FAMILY_TREE',
                title: 'Comprehensive Family Tree & Kinship Graph',
                icon: 'GitBranch',
                color: '#3B82F6',
                summary: `${treeMatrix.totalMembers} active members across ${treeMatrix.tiers.length} generational tiers`,
                badge: treeMatrix.totalMembers > 0 ? 'ACTIVE' : 'EMPTY',
                tiersCount: treeMatrix.tiers.length
            },
            {
                id: 'REPORT_TRUSTED_CIRCLE',
                title: 'Trusted Circle & Household Directory',
                icon: 'Users',
                color: '#8B5CF6',
                summary: `${persons.length} trusted contacts in circle`,
                badge: persons.length > 0 ? 'AVAILABLE' : 'EMPTY'
            },
            {
                id: 'REPORT_INSURANCE',
                title: 'Insurance & Protection Portfolio',
                icon: 'Umbrella',
                color: '#EC4899',
                summary: `${protectionSummary.activePoliciesCount} active policies (${protectionSummary.totalTermCoverageDisplay} Term, ${protectionSummary.totalHealthCoverageDisplay} Health)`,
                badge: protectionSummary.readinessScoreBadge
            },
            {
                id: 'REPORT_RESPONSIBILITIES',
                title: 'Responsibilities & Task Execution Status',
                icon: 'CheckSquare',
                color: '#F59E0B',
                summary: `${responsibilitiesSummary.pendingCount} pending tasks (${responsibilitiesSummary.urgentCount} urgent, ${responsibilitiesSummary.overdueCount} overdue)`,
                badge: responsibilitiesSummary.overdueCount > 0 ? 'ATTENTION_REQUIRED' : 'ON_TRACK'
            },
            {
                id: 'REPORT_EDUCATION',
                title: 'Children & Education Horizon',
                icon: 'GraduationCap',
                color: '#14B8A6',
                summary: `${educationSummary.goalsCount} goal(s) modeled (${educationSummary.totalProjectedCostDisplay} projected)`,
                badge: educationSummary.state
            },
            {
                id: 'REPORT_ELDER_CARE',
                title: 'Parents & Elder Care Framework',
                icon: 'HeartHandshake',
                color: '#6366F1',
                summary: `${careSummary.totalEldersUnderCare} elder(s) under family care (${careSummary.totalMonthlySupportBudgetDisplay}/mo)`,
                badge: careSummary.needsAttentionCount > 0 ? 'ATTENTION_NEEDED' : 'STABLE'
            },
            {
                id: 'REPORT_MEDICAL_REGISTRY',
                title: 'Family Medical & Health Registry',
                icon: 'Activity',
                color: '#EF4444',
                summary: `${healthSummary.totalTrackedMembers} medical profiles (${healthSummary.doctorsCount} linked doctors)`,
                badge: healthSummary.state
            },
            {
                id: 'REPORT_FINANCIAL_BLUEPRINT',
                title: 'Family Financial Blueprint & Emergency Runway',
                icon: 'TrendingUp',
                color: '#10B981',
                summary: netWorthSnapshot ? `Net Worth: ${netWorthSnapshot.netWorthDisplay} (Runway: ${runwayMetrics?.runwayDisplay || '—'})` : 'Financial sources unlinked',
                badge: runwayMetrics?.status || 'UNCONFIGURED'
            }
        ];

        return {
            emergencyReadiness,
            reportCards,
            protectionSummary,
            responsibilitiesSummary,
            educationSummary,
            careSummary,
            healthSummary,
            treeMatrix,
            netWorthSnapshot
        };
    }
};
