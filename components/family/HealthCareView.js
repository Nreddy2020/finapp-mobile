import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Activity, Stethoscope, AlertTriangle, Pill, Phone, ShieldCheck, Lock } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function HealthCareView({
    healthOverview = {},
    onSelectMemberHealth = () => {},
    onAddMedicalRecord = () => {}
}) {
    const { profiles = [], doctorsList = [], membersWithChronicConditions = 0, membersWithAllergies = 0 } = healthOverview;

    const handleCallDoctor = (phone) => {
        if (!phone || phone === '—') return;
        Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {});
    };

    return (
        <View style={styles.container}>
            {/* Health Hero Card */}
            <LuxuryCard style={styles.heroCard}>
                <View style={styles.heroHeader}>
                    <View style={styles.heroIconWrap}>
                        <Activity size={22} color="#EF4444" />
                    </View>
                    <View style={styles.heroTextWrap}>
                        <Text style={styles.heroTitle}>Family Medical & Health Registry</Text>
                        <Text style={styles.heroSub}>
                            {profiles.length} Profiles • {doctorsList.length} Linked Doctors
                        </Text>
                    </View>
                </View>

                {/* Health Metrics Strip */}
                <View style={styles.metricsStrip}>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Chronic Care</Text>
                        <Text style={styles.metricVal}>{membersWithChronicConditions} Members</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Allergies</Text>
                        <Text style={styles.metricVal}>{membersWithAllergies} Members</Text>
                    </View>
                </View>
            </LuxuryCard>

            {/* Doctors Directory */}
            {doctorsList.length > 0 && (
                <View style={styles.sectionWrapper}>
                    <Text style={styles.sectionTitle}>TRUSTED FAMILY DOCTORS ({doctorsList.length})</Text>
                    <View style={styles.doctorsStack}>
                        {doctorsList.map(doc => (
                            <LuxuryCard key={doc.id} style={styles.doctorCard}>
                                <View style={styles.doctorRow}>
                                    <View style={styles.doctorIconWrap}>
                                        <Stethoscope size={18} color="#14B8A6" />
                                    </View>
                                    <View style={styles.doctorInfoCol}>
                                        <Text style={styles.doctorName}>{doc.name}</Text>
                                        <Text style={styles.doctorSpec}>{doc.specialization}</Text>
                                    </View>
                                    {doc.phone && doc.phone !== '—' && (
                                        <Pressable style={styles.callDoctorBtn} onPress={() => handleCallDoctor(doc.phone)}>
                                            <Phone size={14} color="#60A5FA" />
                                            <Text style={styles.callDoctorText}>Call</Text>
                                        </Pressable>
                                    )}
                                </View>
                            </LuxuryCard>
                        ))}
                    </View>
                </View>
            )}

            {/* Member Medical Profiles */}
            <View style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>INDIVIDUAL MEDICAL PROFILES</Text>
                <View style={styles.profilesStack}>
                    {profiles.map(p => {
                        const med = p.medicalProfile || {};
                        const isRedacted = med.isRedacted;

                        return (
                            <LuxuryCard key={p.personId} style={styles.profileCard} onPress={() => onSelectMemberHealth(p)}>
                                <View style={styles.profileCardTop}>
                                    <View style={styles.profileNameRow}>
                                        <Text style={styles.profileName}>{p.name}</Text>
                                        <Text style={styles.profileRole}>({p.role})</Text>
                                    </View>
                                    <View style={styles.bloodBadge}>
                                        <Text style={styles.bloodBadgeText}>🩸 {med.bloodGroup || '—'}</Text>
                                    </View>
                                </View>

                                {isRedacted ? (
                                    <View style={styles.confidentialBox}>
                                        <Lock size={12} color="#9CA3AF" />
                                        <Text style={styles.confidentialText}>
                                            Sensitive records quarantined. Authorized care team access required.
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        {/* Allergies Tags */}
                                        {med.allergies?.length > 0 && (
                                            <View style={styles.tagsBlock}>
                                                <Text style={styles.tagsBlockLabel}>Allergies:</Text>
                                                <View style={styles.tagsRow}>
                                                    {med.allergies.map((alg, idx) => (
                                                        <View key={idx} style={styles.allergyChip}>
                                                            <AlertTriangle size={10} color="#EF4444" />
                                                            <Text style={styles.allergyChipText}>{alg}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {/* Chronic Conditions */}
                                        {med.chronicConditions?.length > 0 && (
                                            <View style={styles.tagsBlock}>
                                                <Text style={styles.tagsBlockLabel}>Chronic Conditions:</Text>
                                                <View style={styles.tagsRow}>
                                                    {med.chronicConditions.map((cond, idx) => (
                                                        <View key={idx} style={styles.conditionChip}>
                                                            <Text style={styles.conditionChipText}>{cond}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {/* Medications */}
                                        {med.medications?.length > 0 && (
                                            <View style={styles.tagsBlock}>
                                                <Text style={styles.tagsBlockLabel}>Routine Medications:</Text>
                                                <View style={styles.tagsRow}>
                                                    {med.medications.map((medItem, idx) => (
                                                        <View key={idx} style={styles.medicationChip}>
                                                            <Pill size={10} color="#60A5FA" />
                                                            <Text style={styles.medicationChipText}>{medItem}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {/* Emergency Instructions */}
                                        {med.emergencyNotes ? (
                                            <View style={styles.emergencyNoteBox}>
                                                <ShieldCheck size={12} color="#F59E0B" />
                                                <Text style={styles.emergencyNoteText}>{med.emergencyNotes}</Text>
                                            </View>
                                        ) : null}
                                    </>
                                )}
                            </LuxuryCard>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24
    },
    heroCard: {
        padding: 16,
        marginBottom: 16
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12
    },
    heroIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#EF444420',
        justifyContent: 'center',
        alignItems: 'center'
    },
    heroTextWrap: {
        flex: 1
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    heroSub: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2
    },
    metricsStrip: {
        flexDirection: 'row',
        backgroundColor: '#18181B',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    metricItem: {
        flex: 1,
        alignItems: 'center'
    },
    metricDivider: {
        width: 1,
        backgroundColor: '#27272A'
    },
    metricLabel: {
        color: '#71717A',
        fontSize: 10,
        marginBottom: 2
    },
    metricVal: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    sectionWrapper: {
        marginBottom: 16
    },
    sectionTitle: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 10,
        paddingHorizontal: 4
    },
    doctorsStack: {
        gap: 8
    },
    doctorCard: {
        padding: 12
    },
    doctorRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    doctorIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#14B8A620',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    doctorInfoCol: {
        flex: 1
    },
    doctorName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600'
    },
    doctorSpec: {
        color: '#9CA3AF',
        fontSize: 11,
        marginTop: 1
    },
    callDoctorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#3B82F620',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8
    },
    callDoctorText: {
        color: '#60A5FA',
        fontSize: 12,
        fontWeight: '600'
    },
    profilesStack: {
        gap: 10
    },
    profileCard: {
        padding: 14
    },
    profileCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    profileNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    profileName: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    },
    profileRole: {
        color: '#9CA3AF',
        fontSize: 12
    },
    bloodBadge: {
        backgroundColor: '#EF444420',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    bloodBadgeText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '700'
    },
    tagsBlock: {
        marginBottom: 8
    },
    tagsBlockLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6
    },
    allergyChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EF444415',
        borderWidth: 1,
        borderColor: '#EF444430',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    allergyChipText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '600'
    },
    conditionChip: {
        backgroundColor: '#F59E0B15',
        borderWidth: 1,
        borderColor: '#F59E0B30',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    conditionChipText: {
        color: '#F59E0B',
        fontSize: 11,
        fontWeight: '600'
    },
    medicationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#3B82F615',
        borderWidth: 1,
        borderColor: '#3B82F630',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    medicationChipText: {
        color: '#60A5FA',
        fontSize: 11,
        fontWeight: '500'
    },
    emergencyNoteBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#27272A',
        padding: 8,
        borderRadius: 8,
        marginTop: 4
    },
    emergencyNoteText: {
        color: '#D1D5DB',
        fontSize: 11,
        flex: 1
    },
    confidentialBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#18181B',
        padding: 10,
        borderRadius: 8
    },
    confidentialText: {
        color: '#71717A',
        fontSize: 11,
        flex: 1
    }
});
