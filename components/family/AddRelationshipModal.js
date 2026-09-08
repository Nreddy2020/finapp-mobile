import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    ScrollView,
    Alert
} from 'react-native';
import { X, GitBranch, AlertTriangle, CheckCircle, ArrowRight, Plus } from 'lucide-react-native';
import {
    RelationshipType,
    RelationshipValidationResult
} from '../../services/family/familyContracts';
import {
    validateRelationshipEdge,
    getReciprocalRelationshipType
} from '../../services/family/familyGraphEngine';

const SUPPORTED_TYPES = [
    { type: RelationshipType.SPOUSE_OF, label: 'Spouse of', desc: 'Reciprocal: Spouse' },
    { type: RelationshipType.PARENT_OF, label: 'Parent of', desc: 'Reciprocal: Child' },
    { type: RelationshipType.CHILD_OF, label: 'Child of', desc: 'Reciprocal: Parent' },
    { type: RelationshipType.SIBLING_OF, label: 'Sibling of', desc: 'Reciprocal: Sibling' },
    { type: RelationshipType.GUARDIAN_OF, label: 'Guardian of', desc: 'Reciprocal: Ward' },
    { type: RelationshipType.CARE_PROVIDER_FOR, label: 'Care Provider for', desc: 'Reciprocal: Care Receiver' },
    { type: RelationshipType.DEPENDENT_OF, label: 'Dependent of', desc: 'Reciprocal: Provider' },
    { type: RelationshipType.FRIEND_OF, label: 'Friend of', desc: 'Reciprocal: Friend' },
    { type: RelationshipType.OTHER, label: 'Other', desc: 'Reciprocal: Other' }
];

export default function AddRelationshipModal({
    visible = false,
    sourcePerson = null,
    allPersons = [],
    existingRelationships = [],
    onClose = () => {},
    onSave = () => {}
}) {
    if (!visible) return null;

    const [selectedTargetId, setSelectedTargetId] = useState('');
    const [selectedType, setSelectedType] = useState(RelationshipType.SPOUSE_OF);

    const srcId = sourcePerson?.core?.id || sourcePerson?.id || allPersons[0]?.id;
    const srcName = sourcePerson?.core?.name || sourcePerson?.name || 'Selected Person';

    // Candidate target persons (exclude source person)
    const targetCandidates = allPersons.filter(p => (p.core?.id || p.id) !== srcId);

    const targetPerson = targetCandidates.find(p => (p.core?.id || p.id) === selectedTargetId) || targetCandidates[0];
    const targetId = targetPerson?.core?.id || targetPerson?.id;
    const targetName = targetPerson?.core?.name || targetPerson?.name || 'Target';

    // Compute live reciprocal type
    const reciprocalType = getReciprocalRelationshipType(selectedType);

    // Live validation
    const candidateEdge = {
        fromPersonId: srcId,
        toPersonId: targetId,
        relationshipType: selectedType
    };

    const validation = useMemo(() => {
        if (!srcId || !targetId) {
            return { isValid: false, reason: 'Select both persons.' };
        }
        return validateRelationshipEdge(candidateEdge, existingRelationships);
    }, [srcId, targetId, selectedType, existingRelationships]);

    const handleSave = () => {
        if (!validation.isValid) {
            Alert.alert('Cannot Link Relationship', validation.reason);
            return;
        }

        onSave({
            fromPersonId: srcId,
            toPersonId: targetId,
            relationshipType: selectedType
        });
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <GitBranch size={18} color="#3B82F6" />
                            <Text style={styles.title}>Link Relationship Edge</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={18} color="#FFFFFF" />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
                        {/* Relationship Entity Preview Box */}
                        <View style={styles.connectionHero}>
                            <View style={styles.entityBox}>
                                <Text style={styles.entityName} numberOfLines={1}>{srcName}</Text>
                                <Text style={styles.entityRole}>Source</Text>
                            </View>
                            <View style={styles.arrowWrap}>
                                <Text style={styles.relTagSmall}>{selectedType}</Text>
                                <ArrowRight size={16} color="#3B82F6" />
                            </View>
                            <View style={styles.entityBox}>
                                <Text style={styles.entityName} numberOfLines={1}>{targetName}</Text>
                                <Text style={styles.entityRole}>Target</Text>
                            </View>
                        </View>

                        {/* Reciprocal Preview Banner */}
                        <View style={styles.reciprocalBanner}>
                            <CheckCircle size={14} color="#10B981" />
                            <Text style={styles.reciprocalText}>
                                Inferred Reciprocal: {targetName} will automatically be recognized as {reciprocalType} of {srcName}.
                            </Text>
                        </View>

                        {/* Validation Error Banner */}
                        {!validation.isValid && (
                            <View style={styles.errorBanner}>
                                <AlertTriangle size={15} color="#EF4444" />
                                <Text style={styles.errorBannerText}>{validation.reason}</Text>
                            </View>
                        )}

                        {/* Target Person Picker */}
                        <Text style={styles.sectionHeader}>SELECT TARGET PERSON</Text>
                        <View style={styles.candidateRow}>
                            {targetCandidates.length === 0 ? (
                                <Text style={styles.emptyPrompt}>No other active family members available.</Text>
                            ) : (
                                targetCandidates.map(p => {
                                    const pId = p.core?.id || p.id;
                                    const pName = p.core?.name || p.name;
                                    const isSelected = (selectedTargetId || targetId) === pId;
                                    return (
                                        <Pressable
                                            key={pId}
                                            style={[styles.targetChip, isSelected && styles.targetChipActive]}
                                            onPress={() => setSelectedTargetId(pId)}
                                        >
                                            <Text style={[styles.targetChipName, isSelected && styles.targetChipNameActive]}>
                                                {pName}
                                            </Text>
                                            <Text style={styles.targetChipRole}>
                                                {p.role || p.core?.role}
                                            </Text>
                                        </Pressable>
                                    );
                                })
                            )}
                        </View>

                        {/* Relationship Type Selector */}
                        <Text style={styles.sectionHeader}>RELATIONSHIP TYPE</Text>
                        <View style={styles.typesGrid}>
                            {SUPPORTED_TYPES.map(st => {
                                const isSelected = selectedType === st.type;
                                return (
                                    <Pressable
                                        key={st.type}
                                        style={[styles.typeCard, isSelected && styles.typeCardActive]}
                                        onPress={() => setSelectedType(st.type)}
                                    >
                                        <Text style={[styles.typeLabel, isSelected && styles.typeLabelActive]}>
                                            {st.label}
                                        </Text>
                                        <Text style={styles.typeDesc}>{st.desc}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Submit Button */}
                        <Pressable
                            style={[styles.submitButton, !validation.isValid && styles.submitButtonDisabled]}
                            onPress={handleSave}
                            disabled={!validation.isValid}
                        >
                            <Plus size={16} color="#FFFFFF" />
                            <Text style={styles.submitButtonText}>Confirm Relationship</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end'
    },
    modalCard: {
        backgroundColor: '#09090B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 24,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#18181B'
    },
    title: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700'
    },
    closeBtn: {
        padding: 6,
        borderRadius: 16,
        backgroundColor: '#18181B'
    },
    scrollBody: {
        paddingHorizontal: 20,
        paddingTop: 14
    },
    connectionHero: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#121215',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 12
    },
    entityBox: {
        flex: 1,
        alignItems: 'center'
    },
    entityName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center'
    },
    entityRole: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    arrowWrap: {
        alignItems: 'center',
        paddingHorizontal: 8
    },
    relTagSmall: {
        color: '#60A5FA',
        fontSize: 9,
        fontWeight: '700',
        marginBottom: 2
    },
    reciprocalBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B98110',
        borderWidth: 1,
        borderColor: '#10B98130',
        padding: 10,
        borderRadius: 8,
        gap: 8,
        marginBottom: 12
    },
    reciprocalText: {
        color: '#A7F3D0',
        fontSize: 12,
        flex: 1
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF444415',
        borderWidth: 1,
        borderColor: '#EF444440',
        padding: 10,
        borderRadius: 8,
        gap: 8,
        marginBottom: 12
    },
    errorBannerText: {
        color: '#FCA5A5',
        fontSize: 12,
        fontWeight: '600',
        flex: 1
    },
    sectionHeader: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginTop: 10,
        marginBottom: 8
    },
    candidateRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14
    },
    targetChip: {
        backgroundColor: '#18181B',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    targetChipActive: {
        backgroundColor: '#3B82F615',
        borderColor: '#3B82F6'
    },
    targetChipName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    targetChipNameActive: {
        color: '#60A5FA'
    },
    targetChipRole: {
        color: '#71717A',
        fontSize: 10
    },
    emptyPrompt: {
        color: '#71717A',
        fontSize: 12,
        fontStyle: 'italic'
    },
    typesGrid: {
        gap: 8,
        marginBottom: 16
    },
    typeCard: {
        backgroundColor: '#121215',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#1F1F24'
    },
    typeCardActive: {
        backgroundColor: '#3B82F610',
        borderColor: '#3B82F6'
    },
    typeLabel: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    typeLabelActive: {
        color: '#60A5FA'
    },
    typeDesc: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        paddingVertical: 13,
        borderRadius: 10,
        gap: 8,
        marginTop: 10,
        marginBottom: 35
    },
    submitButtonDisabled: {
        opacity: 0.35
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    }
});
