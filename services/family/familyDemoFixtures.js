/**
 * FinLife Family Demo Fixtures
 * Strictly isolated dev/preview fixtures.
 * In production or when demo mode is disabled, fixture loading is blocked.
 */

import {
    CircleCategory,
    FamilyRole,
    PrivacyLevel,
    PolicyType,
    PolicyStatus,
    ResponsibilityCategory,
    ResponsibilityPriority,
    ResponsibilityStatus,
    CareHealthStatus,
    RelationshipType,
    FinancialLinkStatus,
    createPerson,
    createFinancialReference
} from './familyContracts.js';

let _familyDemoModeEnabled = false;

export function isFamilyDemoModeEnabled() {
    return _familyDemoModeEnabled;
}

export function setFamilyDemoMode(enabled) {
    _familyDemoModeEnabled = Boolean(enabled);
}

export function getFamilyDemoFixtures() {
    // Only return demo data if demo mode is enabled or in development
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
    if (!isDev && !_familyDemoModeEnabled) {
        return null;
    }

    const persons = [
        createPerson({
            id: 'person_demo_nagarjuna',
            name: 'Nagarjuna Rao',
            preferredName: 'Nagarjuna',
            gender: 'MALE',
            dateOfBirth: '1984-04-12',
            circleCategory: CircleCategory.FAMILY,
            role: FamilyRole.HEAD,
            color: '#3B82F6',
            contact: {
                phone: '+91 98765 43210',
                email: 'nagarjuna.rao@example.com',
                address: 'Flat 402, Green Meadows, Hyderabad',
                isSharedAddress: true
            },
            profile: {
                occupation: 'VP Engineering',
                employer: 'TechCorp India',
                bloodGroup: 'O_POSITIVE',
                notes: 'Primary earner and plan administrator'
            },
            privacy: {
                visibility: PrivacyLevel.FAMILY_ONLY,
                accessScope: 'ADMIN'
            },
            medicalProfile: {
                bloodGroup: 'O_POSITIVE',
                allergies: ['Penicillin'],
                chronicConditions: ['Mild Hypertension'],
                medications: ['Telmisartan 20mg daily'],
                doctorIds: ['person_demo_dr_verma'],
                insurancePolicyIds: ['pol_demo_term_nagarjuna', 'pol_demo_health_floater'],
                emergencyNotes: 'Allergic to penicillin. Carries emergency health card.'
            },
            emergencyProfile: {
                isEmergencyContact: true,
                priorityOrder: 1,
                reachable24x7: true,
                notes: 'Primary household contact'
            }
        }),
        createPerson({
            id: 'person_demo_priya',
            name: 'Priya Rao',
            preferredName: 'Priya',
            gender: 'FEMALE',
            dateOfBirth: '1987-08-23',
            circleCategory: CircleCategory.FAMILY,
            role: FamilyRole.SPOUSE,
            color: '#EC4899',
            contact: {
                phone: '+91 98765 43211',
                email: 'priya.rao@example.com',
                address: 'Flat 402, Green Meadows, Hyderabad',
                isSharedAddress: true
            },
            profile: {
                occupation: 'Architect / Consultant',
                employer: 'Self-employed',
                bloodGroup: 'B_POSITIVE',
                notes: 'Care coordinator for children and elder care'
            },
            privacy: {
                visibility: PrivacyLevel.FAMILY_ONLY,
                accessScope: 'ADMIN'
            },
            medicalProfile: {
                bloodGroup: 'B_POSITIVE',
                allergies: [],
                chronicConditions: [],
                medications: ['Multivitamins'],
                doctorIds: ['person_demo_dr_verma'],
                insurancePolicyIds: ['pol_demo_health_floater'],
                emergencyNotes: 'No known drug allergies'
            },
            emergencyProfile: {
                isEmergencyContact: true,
                priorityOrder: 2,
                reachable24x7: true,
                notes: 'Secondary emergency contact'
            }
        }),
        createPerson({
            id: 'person_demo_arjun',
            name: 'Arjun Rao',
            preferredName: 'Arjun',
            gender: 'MALE',
            dateOfBirth: '2012-06-15',
            circleCategory: CircleCategory.FAMILY,
            role: FamilyRole.CHILD,
            color: '#10B981',
            contact: {
                isSharedAddress: true
            },
            profile: {
                occupation: 'Student - Grade 9',
                employer: 'Delhi Public School, Hyderabad',
                bloodGroup: 'O_POSITIVE',
                notes: 'Passionate about robotics and computer science'
            },
            privacy: {
                visibility: PrivacyLevel.FAMILY_ONLY
            },
            medicalProfile: {
                bloodGroup: 'O_POSITIVE',
                allergies: ['Peanuts'],
                chronicConditions: [],
                medications: [],
                doctorIds: ['person_demo_dr_verma'],
                insurancePolicyIds: ['pol_demo_health_floater'],
                emergencyNotes: 'Severe peanut allergy! EpiPen in school bag.'
            },
            emergencyProfile: {
                isEmergencyContact: false
            }
        }),
        createPerson({
            id: 'person_demo_ananya',
            name: 'Ananya Rao',
            preferredName: 'Ananya',
            gender: 'FEMALE',
            dateOfBirth: '2018-09-10',
            circleCategory: CircleCategory.FAMILY,
            role: FamilyRole.CHILD,
            color: '#F59E0B',
            contact: {
                isSharedAddress: true
            },
            profile: {
                occupation: 'Student - Grade 3',
                employer: 'Delhi Public School, Hyderabad',
                bloodGroup: 'B_POSITIVE',
                notes: 'Loves painting and classical dance'
            },
            privacy: {
                visibility: PrivacyLevel.FAMILY_ONLY
            },
            medicalProfile: {
                bloodGroup: 'B_POSITIVE',
                allergies: [],
                chronicConditions: [],
                medications: [],
                doctorIds: ['person_demo_dr_verma'],
                insurancePolicyIds: ['pol_demo_health_floater'],
                emergencyNotes: 'Routine vaccinations up to date'
            },
            emergencyProfile: {
                isEmergencyContact: false
            }
        }),
        createPerson({
            id: 'person_demo_rajesh',
            name: 'Rajesh Rao',
            preferredName: 'Rajesh',
            gender: 'MALE',
            dateOfBirth: '1955-03-18',
            circleCategory: CircleCategory.FAMILY,
            role: FamilyRole.PARENT,
            color: '#6366F1',
            contact: {
                phone: '+91 94400 12345',
                address: 'House 12, Senior Enclave, Bangalore',
                isSharedAddress: false
            },
            profile: {
                occupation: 'Retired Government Officer',
                bloodGroup: 'A_POSITIVE',
                notes: 'Elderly father, living in Bangalore'
            },
            privacy: {
                visibility: PrivacyLevel.FAMILY_ONLY
            },
            medicalProfile: {
                bloodGroup: 'A_POSITIVE',
                allergies: ['Sulfa drugs'],
                chronicConditions: ['Type 2 Diabetes', 'Hypertension'],
                medications: ['Metformin 500mg BD', 'Amlodipine 5mg OD'],
                doctorIds: ['person_demo_dr_verma'],
                insurancePolicyIds: ['pol_demo_health_senior_rajesh'],
                emergencyNotes: 'Diabetic history. Monitor fasting blood glucose.'
            },
            emergencyProfile: {
                isEmergencyContact: true,
                priorityOrder: 3,
                reachable24x7: false,
                notes: 'Bangalore contact'
            }
        }),
        createPerson({
            id: 'person_demo_savitri',
            name: 'Savitri Rao',
            preferredName: 'Savitri',
            gender: 'FEMALE',
            dateOfBirth: '1959-11-04',
            circleCategory: CircleCategory.FAMILY,
            role: FamilyRole.PARENT,
            color: '#8B5CF6',
            contact: {
                phone: '+91 94400 12346',
                address: 'House 12, Senior Enclave, Bangalore',
                isSharedAddress: false
            },
            profile: {
                occupation: 'Homemaker',
                bloodGroup: 'O_POSITIVE',
                notes: 'Elderly mother, living in Bangalore'
            },
            privacy: {
                visibility: PrivacyLevel.FAMILY_ONLY
            },
            medicalProfile: {
                bloodGroup: 'O_POSITIVE',
                allergies: [],
                chronicConditions: ['Osteoarthritis (Knees)', 'Hypothyroidism'],
                medications: ['Thyronorm 50mcg OD', 'Calcium + Vit D3'],
                doctorIds: ['person_demo_dr_verma'],
                insurancePolicyIds: ['pol_demo_health_senior_savitri'],
                emergencyNotes: 'Mobility support needed for stairs'
            },
            emergencyProfile: {
                isEmergencyContact: false
            }
        }),
        createPerson({
            id: 'person_demo_dr_verma',
            name: 'Dr. Anand Verma',
            preferredName: 'Dr. Verma',
            gender: 'MALE',
            circleCategory: CircleCategory.OTHERS,
            role: FamilyRole.OTHER,
            color: '#14B8A6',
            contact: {
                phone: '+91 99887 76655',
                email: 'dr.verma@citycareclinic.org',
                address: 'City Care Hospital, Banjara Hills, Hyderabad',
                isSharedAddress: false
            },
            profile: {
                occupation: 'Senior Physician & Family Pediatrician',
                employer: 'City Care Hospital',
                notes: 'Trusted family doctor for 12 years'
            },
            privacy: {
                visibility: PrivacyLevel.CARE_TEAM_ONLY,
                accessScope: 'CARE_TEAM'
            },
            emergencyProfile: {
                isEmergencyContact: true,
                priorityOrder: 4,
                reachable24x7: true,
                notes: 'Hospital emergency desk available 24x7'
            }
        })
    ];

    const relationships = [
        { id: 'rel_demo_1', fromPersonId: 'person_demo_nagarjuna', toPersonId: 'person_demo_priya', relationshipType: RelationshipType.SPOUSE_OF },
        { id: 'rel_demo_2', fromPersonId: 'person_demo_arjun', toPersonId: 'person_demo_nagarjuna', relationshipType: RelationshipType.CHILD_OF },
        { id: 'rel_demo_3', fromPersonId: 'person_demo_arjun', toPersonId: 'person_demo_priya', relationshipType: RelationshipType.CHILD_OF },
        { id: 'rel_demo_4', fromPersonId: 'person_demo_ananya', toPersonId: 'person_demo_nagarjuna', relationshipType: RelationshipType.CHILD_OF },
        { id: 'rel_demo_5', fromPersonId: 'person_demo_ananya', toPersonId: 'person_demo_priya', relationshipType: RelationshipType.CHILD_OF },
        { id: 'rel_demo_6', fromPersonId: 'person_demo_nagarjuna', toPersonId: 'person_demo_rajesh', relationshipType: RelationshipType.CHILD_OF },
        { id: 'rel_demo_7', fromPersonId: 'person_demo_nagarjuna', toPersonId: 'person_demo_savitri', relationshipType: RelationshipType.CHILD_OF },
        { id: 'rel_demo_8', fromPersonId: 'person_demo_rajesh', toPersonId: 'person_demo_savitri', relationshipType: RelationshipType.SPOUSE_OF }
    ];

    const policies = [
        {
            id: 'pol_demo_term_nagarjuna',
            provider: 'HDFC Life',
            policyName: 'Click 2 Protect Super',
            policyNumber: 'HDFC-TERM-984210',
            policyType: PolicyType.TERM_LIFE,
            status: PolicyStatus.ACTIVE,
            insuredPersonIds: ['person_demo_nagarjuna'],
            nomineePersonIds: ['person_demo_priya'],
            coverageAmountPaise: 2000000000n,
            premiumAmountPaise: 3600000n,
            renewalDate: '2026-11-15',
            coverageStartDate: '2020-11-15',
            coverageEndDate: '2050-11-15',
            deductiblePaise: 0n,
            nomineeCompleteness: true,
            claimStatus: 'NONE',
            financialReference: createFinancialReference({
                sourceType: 'COMMITMENT',
                sourceRecordId: 'comm_hdfc_term_nagarjuna',
                sourceDomain: 'Commitments',
                linkStatus: FinancialLinkStatus.LINKED_VERIFIED,
                label: 'HDFC Life Annual Premium'
            })
        },
        {
            id: 'pol_demo_health_floater',
            provider: 'Care Health Insurance',
            policyName: 'Care Advantage Family Floater',
            policyNumber: 'CARE-FLT-772911',
            policyType: PolicyType.HEALTH,
            status: PolicyStatus.ACTIVE,
            insuredPersonIds: ['person_demo_nagarjuna', 'person_demo_priya', 'person_demo_arjun', 'person_demo_ananya'],
            nomineePersonIds: ['person_demo_priya'],
            coverageAmountPaise: 250000000n,
            premiumAmountPaise: 4200000n,
            renewalDate: '2026-10-01',
            coverageStartDate: '2021-10-01',
            coverageEndDate: '2026-10-01',
            deductiblePaise: 0n,
            nomineeCompleteness: true,
            claimStatus: 'NONE',
            financialReference: createFinancialReference({
                sourceType: 'COMMITMENT',
                sourceRecordId: 'comm_care_health_floater',
                sourceDomain: 'Commitments',
                linkStatus: FinancialLinkStatus.LINKED_VERIFIED,
                label: 'Care Health Floater'
            })
        },
        {
            id: 'pol_demo_health_senior_rajesh',
            provider: 'Star Health',
            policyName: 'Senior Citizens Red Carpet',
            policyNumber: 'STAR-SR-441209',
            policyType: PolicyType.HEALTH,
            status: PolicyStatus.ACTIVE,
            insuredPersonIds: ['person_demo_rajesh'],
            nomineePersonIds: ['person_demo_nagarjuna'],
            coverageAmountPaise: 100000000n,
            premiumAmountPaise: 4800000n,
            renewalDate: '2026-09-28',
            coverageStartDate: '2022-09-28',
            coverageEndDate: '2026-09-28',
            deductiblePaise: 5000000n,
            nomineeCompleteness: true,
            claimStatus: 'NONE',
            financialReference: createFinancialReference({
                sourceType: 'COMMITMENT',
                sourceRecordId: 'comm_star_health_rajesh',
                sourceDomain: 'Commitments',
                linkStatus: FinancialLinkStatus.LINKED_VERIFIED,
                label: 'Star Health Senior (Rajesh)'
            })
        },
        {
            id: 'pol_demo_health_senior_savitri',
            provider: 'Star Health',
            policyName: 'Senior Citizens Red Carpet',
            policyNumber: 'STAR-SR-441210',
            policyType: PolicyType.HEALTH,
            status: PolicyStatus.ACTIVE,
            insuredPersonIds: ['person_demo_savitri'],
            nomineePersonIds: ['person_demo_nagarjuna'],
            coverageAmountPaise: 100000000n,
            premiumAmountPaise: 4500000n,
            renewalDate: '2026-09-28',
            coverageStartDate: '2022-09-28',
            coverageEndDate: '2026-09-28',
            deductiblePaise: 5000000n,
            nomineeCompleteness: true,
            claimStatus: 'NONE',
            financialReference: createFinancialReference({
                sourceType: 'COMMITMENT',
                sourceRecordId: 'comm_star_health_savitri',
                sourceDomain: 'Commitments',
                linkStatus: FinancialLinkStatus.LINKED_VERIFIED,
                label: 'Star Health Senior (Savitri)'
            })
        }
    ];

    const responsibilities = [
        {
            id: 'resp_demo_1',
            title: "Arjun's DPS Term 2 School Fees",
            category: ResponsibilityCategory.EDUCATION,
            assignedPersonId: 'person_demo_nagarjuna',
            affectedPersonId: 'person_demo_arjun',
            priority: ResponsibilityPriority.URGENT,
            status: ResponsibilityStatus.PENDING,
            dueDate: '2026-09-15',
            estimatedAmountPaise: 8500000n,
            notes: 'Pay via net banking before due date to avoid late fine',
            financialReference: createFinancialReference({
                sourceType: 'CASHBOOK_BILL',
                sourceDomain: 'Cashbook',
                linkStatus: FinancialLinkStatus.LINKED_UNVERIFIED,
                label: 'DPS School Fee Invoice'
            })
        },
        {
            id: 'resp_demo_2',
            title: "Rajesh Rao Star Health Policy Renewal",
            category: ResponsibilityCategory.HEALTHCARE,
            assignedPersonId: 'person_demo_nagarjuna',
            affectedPersonId: 'person_demo_rajesh',
            priority: ResponsibilityPriority.HIGH,
            status: ResponsibilityStatus.PENDING,
            dueDate: '2026-09-28',
            estimatedAmountPaise: 4800000n,
            notes: 'Senior Citizen Red Carpet renewal due in 20 days'
        },
        {
            id: 'resp_demo_3',
            title: "Savitri Knee Specialist Consultation",
            category: ResponsibilityCategory.CARE,
            assignedPersonId: 'person_demo_priya',
            affectedPersonId: 'person_demo_savitri',
            priority: ResponsibilityPriority.MEDIUM,
            status: ResponsibilityStatus.IN_PROGRESS,
            dueDate: '2026-09-22',
            notes: 'Appointment booked with Dr. Verma / Orthopedic referral'
        },
        {
            id: 'resp_demo_4',
            title: "Ananya Vaccination - Booster Shot",
            category: ResponsibilityCategory.HEALTHCARE,
            assignedPersonId: 'person_demo_priya',
            affectedPersonId: 'person_demo_ananya',
            priority: ResponsibilityPriority.MEDIUM,
            status: ResponsibilityStatus.PENDING,
            dueDate: '2026-10-10',
            notes: 'Annual pediatric booster'
        }
    ];

    const educationGoals = [
        {
            id: 'edu_demo_arjun',
            childPersonId: 'person_demo_arjun',
            goalTitle: 'Arjun B.Tech / Undergraduate Engineering',
            targetYear: 2029,
            currentCostPaise: 250000000n,
            inflationRateBps: 800,
            linkedInvestmentAccountId: 'inv_acc_child_arjun_equity',
            financialReference: createFinancialReference({
                sourceType: 'INVESTMENT_GOAL',
                sourceRecordId: 'goal_inv_arjun_education',
                sourceDomain: 'InvestmentService',
                linkStatus: FinancialLinkStatus.LINKED_VERIFIED,
                label: 'Arjun Education SIP'
            })
        },
        {
            id: 'edu_demo_ananya',
            childPersonId: 'person_demo_ananya',
            goalTitle: 'Ananya Higher Education Fund',
            targetYear: 2035,
            currentCostPaise: 350000000n,
            inflationRateBps: 800,
            linkedInvestmentAccountId: 'inv_acc_child_ananya_sip',
            financialReference: createFinancialReference({
                sourceType: 'INVESTMENT_GOAL',
                sourceRecordId: 'goal_inv_ananya_education',
                sourceDomain: 'InvestmentService',
                linkStatus: FinancialLinkStatus.LINKED_VERIFIED,
                label: 'Ananya Education Portfolio'
            })
        }
    ];

    const elderCarePlans = [
        {
            id: 'elder_demo_rajesh',
            parentPersonId: 'person_demo_rajesh',
            careCoordinatorId: 'person_demo_nagarjuna',
            careStatus: CareHealthStatus.MONITORING,
            monthlySupportBudgetPaise: 2500000n,
            livingArrangement: 'Independent Home (Bangalore)',
            emergencyEscalationPlan: 'Neighbor Mr. Murthy (+91 94488 11223) has spare key; Dr. Verma hospital network',
            financialReference: createFinancialReference({
                sourceType: 'COMMITMENT',
                sourceRecordId: 'comm_parents_monthly_support',
                sourceDomain: 'Commitments',
                linkStatus: FinancialLinkStatus.LINKED_VERIFIED,
                label: 'Parents Monthly Living Allowance'
            })
        },
        {
            id: 'elder_demo_savitri',
            parentPersonId: 'person_demo_savitri',
            careCoordinatorId: 'person_demo_priya',
            careStatus: CareHealthStatus.STABLE,
            monthlySupportBudgetPaise: 1500000n,
            livingArrangement: 'Independent Home with Rajesh (Bangalore)',
            emergencyEscalationPlan: 'Priya coordinates telehealth visits'
        }
    ];

    const documents = [
        {
            id: 'doc_demo_1',
            title: 'HDFC Term Insurance Policy Bond',
            category: 'INSURANCE',
            personId: 'person_demo_nagarjuna',
            documentNumber: 'HDFC-TERM-984210',
            uploadedDate: '2024-01-10',
            privacyLevel: PrivacyLevel.FAMILY_ONLY,
            verificationStatus: 'VERIFIED'
        },
        {
            id: 'doc_demo_2',
            title: 'Arjun Birth Certificate & Passport',
            category: 'IDENTITY',
            personId: 'person_demo_arjun',
            uploadedDate: '2023-05-12',
            privacyLevel: PrivacyLevel.FAMILY_ONLY,
            verificationStatus: 'VERIFIED'
        },
        {
            id: 'doc_demo_3',
            title: 'Rajesh Rao Cardiology Health Report 2026',
            category: 'MEDICAL',
            personId: 'person_demo_rajesh',
            uploadedDate: '2026-06-15',
            privacyLevel: PrivacyLevel.CARE_TEAM_ONLY,
            verificationStatus: 'VERIFIED'
        }
    ];

    return {
        persons,
        relationships,
        policies,
        responsibilities,
        educationGoals,
        elderCarePlans,
        documents
    };
}
