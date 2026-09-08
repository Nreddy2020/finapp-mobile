/**
 * FinLife Family Health Service
 * Medical profiles, doctor directory, chronic conditions, and privacy-gated access.
 * Strict privacy enforcement: redacts confidential health records for unauthorized scopes.
 * Prevents inference from aggregates, forged IDs, or emergency-only leaks.
 */

import {
    PrivacyLevel,
    CircleCategory,
    DataAvailabilityState
} from './familyContracts.js';

export function sanitizeMedicalProfile(
    medProfile = {},
    privacy = {},
    viewerScope = 'STANDARD',
    viewerId = null,
    validMemberIds = null
) {
    // Forged viewer ID validation: viewerId must be a verified member if validMemberIds set is provided
    const isVerifiedViewer = viewerId && (!validMemberIds || validMemberIds.has(viewerId));
    const isOwner = isVerifiedViewer && privacy.createdBy === viewerId;
    const isAllowedMember = isVerifiedViewer && Array.isArray(privacy.allowedMemberIds) && privacy.allowedMemberIds.includes(viewerId);
    const isCareTeamOrAdmin = viewerScope === 'ADMIN' || viewerScope === 'CARE_TEAM';
    const isEmergencyOrAdmin = viewerScope === 'ADMIN' || viewerScope === 'EMERGENCY';

    let hasAccess = false;

    if (isOwner || viewerScope === 'ADMIN') {
        hasAccess = true;
    } else if (privacy.visibility === PrivacyLevel.FAMILY_ONLY) {
        hasAccess = viewerScope === 'STANDARD' || isCareTeamOrAdmin;
    } else if (privacy.visibility === PrivacyLevel.CARE_TEAM_ONLY) {
        hasAccess = isCareTeamOrAdmin;
    } else if (privacy.visibility === PrivacyLevel.SELECTED_MEMBERS) {
        hasAccess = isAllowedMember;
    } else if (privacy.visibility === PrivacyLevel.EMERGENCY_ONLY) {
        hasAccess = isEmergencyOrAdmin;
    }

    if (!hasAccess) {
        return {
            bloodGroup: medProfile.bloodGroup || '—',
            allergies: ['[CONFIDENTIAL]'],
            chronicConditions: ['[CONFIDENTIAL]'],
            medications: ['[CONFIDENTIAL]'],
            doctorIds: [],
            insurancePolicyIds: [],
            notes: '[CONFIDENTIAL]',
            emergencyNotes: '[CONFIDENTIAL]',
            isRedacted: true
        };
    }

    return {
        bloodGroup: medProfile.bloodGroup || '—',
        allergies: Array.isArray(medProfile.allergies) ? medProfile.allergies : [],
        chronicConditions: Array.isArray(medProfile.chronicConditions) ? medProfile.chronicConditions : [],
        medications: Array.isArray(medProfile.medications) ? medProfile.medications : [],
        doctorIds: Array.isArray(medProfile.doctorIds) ? medProfile.doctorIds : [],
        insurancePolicyIds: Array.isArray(medProfile.insurancePolicyIds) ? medProfile.insurancePolicyIds : [],
        notes: medProfile.notes || '',
        emergencyNotes: medProfile.emergencyNotes || '',
        isRedacted: false
    };
}

export const FamilyHealthService = {
    getDoctors(persons = []) {
        return persons.filter(p => {
            const occ = (p.profile?.occupation || '').toLowerCase();
            const role = p.core?.role || p.role;
            const name = (p.core?.name || p.name || '').toLowerCase();
            return name.includes('dr.') || occ.includes('physician') || occ.includes('doctor') || occ.includes('pediatrician');
        });
    },

    getHealthOverview(persons = [], viewerScope = 'STANDARD', viewerId = null) {
        if (!persons.length) {
            return {
                state: DataAvailabilityState.EMPTY,
                totalTrackedMembers: 0,
                membersWithChronicConditions: 0,
                membersWithAllergies: 0,
                doctorsCount: 0,
                profiles: []
            };
        }

        const validMemberIds = new Set(persons.map(p => p.core?.id || p.id));
        const doctors = this.getDoctors(persons);
        let chronicCount = 0;
        let allergyCount = 0;

        const profiles = persons
            .filter(p => (p.core?.circleCategory || p.circleCategory) === CircleCategory.FAMILY)
            .map(p => {
                const med = sanitizeMedicalProfile(p.medicalProfile, p.privacy, viewerScope, viewerId, validMemberIds);
                // Only count unredacted conditions, preventing inference of sensitive records from counts
                if (!med.isRedacted) {
                    if (med.chronicConditions.length > 0) chronicCount++;
                    if (med.allergies.length > 0) allergyCount++;
                }
                return {
                    personId: p.core?.id || p.id,
                    name: p.core?.name || p.name,
                    role: p.core?.role || p.role,
                    medicalProfile: med
                };
            });

        return {
            state: DataAvailabilityState.AVAILABLE,
            totalTrackedMembers: profiles.length,
            membersWithChronicConditions: chronicCount,
            membersWithAllergies: allergyCount,
            doctorsCount: doctors.length,
            doctorsList: doctors.map(d => ({
                id: d.core?.id || d.id,
                name: d.core?.name || d.name,
                phone: d.contact?.phone || '—',
                specialization: d.profile?.occupation || 'General Physician'
            })),
            profiles
        };
    }
};
