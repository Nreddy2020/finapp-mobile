import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import { X, Check, AlertCircle, Link2, User, Shield, Layers } from 'lucide-react-native';

/**
 * LinkCommitmentModal
 * 
 * Allows users to link an existing commitment from CommitmentsService
 * to a Household Lead Payer, optional Backup Payer, and Responsibility Domain.
 */
export default function LinkCommitmentModal({
    visible,
    onClose,
    onSave,
    householdId,
    unlinkedCommitments = [],
    householdMembers = [],
    responsibilities = []
}) {
    const [selectedCommitmentId, setSelectedCommitmentId] = useState('');
    const [selectedLeadPayerId, setSelectedLeadPayerId] = useState('');
    const [selectedBackupPayerId, setSelectedBackupPayerId] = useState('');
    const [selectedResponsibilityId, setSelectedResponsibilityId] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setError('');
            setNotes('');
            setSelectedBackupPayerId('');
            setSelectedResponsibilityId('');
            
            // Auto-select first available commitment if only one
            if (unlinkedCommitments.length > 0) {
                setSelectedCommitmentId(unlinkedCommitments[0].id);
            } else {
                setSelectedCommitmentId('');
            }

            // Auto-select head/first member as lead payer
            if (householdMembers.length > 0) {
                const head = householdMembers.find(m => m.role === 'HEAD');
                setSelectedLeadPayerId(head ? head.id : householdMembers[0].id);
            } else {
                setSelectedLeadPayerId('');
            }
        }
    }, [visible, unlinkedCommitments, householdMembers]);

    const handleSave = async () => {
        setError('');
        if (!selectedCommitmentId) {
            setError('Please select a commitment to link');
            return;
        }
        if (!selectedLeadPayerId) {
            setError('Please select a lead payer for this obligation');
            return;
        }
        if (selectedBackupPayerId && selectedBackupPayerId === selectedLeadPayerId) {
            setError('Backup payer cannot be the same Person as the lead payer');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                householdId,
                commitmentId: selectedCommitmentId,
                leadPayerPersonId: selectedLeadPayerId,
                backupPayerPersonId: selectedBackupPayerId || null,
                responsibilityId: selectedResponsibilityId || null,
                notes: notes.trim()
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to link commitment');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <View style={styles.headerIcon}>
                                <Link2 size={16} color="#38BDF8" />
                            </View>
                            <Text style={styles.title}>Link Household Commitment</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={18} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    {error ? (
                        <View style={styles.errorBox}>
                            <AlertCircle size={14} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                        {/* Step 1: Choose Commitment */}
                        <Text style={styles.sectionLabel}>Select Commitment</Text>
                        {unlinkedCommitments.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>All commitments are currently linked to this household.</Text>
                            </View>
                        ) : (
                            <View style={styles.chipContainer}>
                                {unlinkedCommitments.map(c => {
                                    const isSelected = c.id === selectedCommitmentId;
                                    const name = c.name || c.title || 'Untitled Commitment';
                                    const freq = c.frequency || 'MONTHLY';
                                    return (
                                        <TouchableOpacity
                                            key={c.id}
                                            style={[styles.commitmentChip, isSelected && styles.commitmentChipActive]}
                                            onPress={() => setSelectedCommitmentId(c.id)}
                                        >
                                            <View style={styles.chipTextGroup}>
                                                <Text style={[styles.chipTitle, isSelected && styles.chipTitleActive]}>
                                                    {name}
                                                </Text>
                                                <Text style={styles.chipSub}>
                                                    {c.category || 'General'} • {freq}
                                                </Text>
                                            </View>
                                            {isSelected && <Check size={14} color="#38BDF8" />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {/* Step 2: Lead Payer (100% allocation) */}
                        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Lead Payer (100% Obligation)</Text>
                        <Text style={styles.sectionHelper}>
                            Assigned member will carry 100% of this commitment in their household allocation.
                        </Text>
                        <View style={styles.chipContainer}>
                            {householdMembers.map(m => {
                                const isSelected = m.id === selectedLeadPayerId;
                                const name = m.fullName || m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim();
                                return (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={[styles.memberChip, isSelected && styles.memberChipActive]}
                                        onPress={() => {
                                            setSelectedLeadPayerId(m.id);
                                            if (selectedBackupPayerId === m.id) {
                                                setSelectedBackupPayerId('');
                                            }
                                        }}
                                    >
                                        <User size={12} color={isSelected ? '#38BDF8' : '#71717A'} />
                                        <Text style={[styles.memberChipText, isSelected && styles.memberChipTextActive]}>
                                            {name}
                                        </Text>
                                        {isSelected && <Check size={12} color="#38BDF8" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Step 3: Optional Backup Payer (0% informational) */}
                        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Backup Payer (Optional • 0%)</Text>
                        <Text style={styles.sectionHelper}>
                            Secondary member designated for continuity. Receives 0% financial allocation.
                        </Text>
                        <View style={styles.chipContainer}>
                            <TouchableOpacity
                                style={[styles.memberChip, !selectedBackupPayerId && styles.memberChipActive]}
                                onPress={() => setSelectedBackupPayerId('')}
                            >
                                <Text style={[styles.memberChipText, !selectedBackupPayerId && styles.memberChipTextActive]}>
                                    None
                                </Text>
                            </TouchableOpacity>

                            {householdMembers
                                .filter(m => m.id !== selectedLeadPayerId)
                                .map(m => {
                                    const isSelected = m.id === selectedBackupPayerId;
                                    const name = m.fullName || m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim();
                                    return (
                                        <TouchableOpacity
                                            key={m.id}
                                            style={[styles.memberChip, isSelected && styles.memberChipActive]}
                                            onPress={() => setSelectedBackupPayerId(m.id)}
                                        >
                                            <Shield size={12} color={isSelected ? '#38BDF8' : '#71717A'} />
                                            <Text style={[styles.memberChipText, isSelected && styles.memberChipTextActive]}>
                                                {name}
                                            </Text>
                                            {isSelected && <Check size={12} color="#38BDF8" />}
                                        </TouchableOpacity>
                                    );
                                })}
                        </View>

                        {/* Step 4: Responsibility Domain */}
                        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Responsibility Domain (Optional)</Text>
                        <Text style={styles.sectionHelper}>
                            Categorize this bill under a shared household domain.
                        </Text>
                        <View style={styles.chipContainer}>
                            <TouchableOpacity
                                style={[styles.memberChip, !selectedResponsibilityId && styles.memberChipActive]}
                                onPress={() => setSelectedResponsibilityId('')}
                            >
                                <Text style={[styles.memberChipText, !selectedResponsibilityId && styles.memberChipTextActive]}>
                                    General Household
                                </Text>
                            </TouchableOpacity>

                            {responsibilities.map(r => {
                                const isSelected = r.id === selectedResponsibilityId;
                                const title = r.title || r.name || 'Domain';
                                return (
                                    <TouchableOpacity
                                        key={r.id}
                                        style={[styles.memberChip, isSelected && styles.memberChipActive]}
                                        onPress={() => setSelectedResponsibilityId(r.id)}
                                    >
                                        <Layers size={12} color={r.color || '#3B82F6'} />
                                        <Text style={[styles.memberChipText, isSelected && styles.memberChipTextActive]}>
                                            {title}
                                        </Text>
                                        {isSelected && <Check size={12} color="#38BDF8" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Step 5: Notes */}
                        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Coordination Notes (Optional)</Text>
                        <TextInput
                            style={styles.notesInput}
                            placeholder="e.g. Paid via Alice's ICICI bank autopay"
                            placeholderTextColor="#52525B"
                            value={notes}
                            onChangeText={setNotes}
                            multiline={true}
                            numberOfLines={2}
                        />
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, (!selectedCommitmentId || !selectedLeadPayerId) && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={saving || !selectedCommitmentId || !selectedLeadPayerId}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#000000" />
                            ) : (
                                <Text style={styles.saveText}>Link Commitment</Text>
                            )}
                        </TouchableOpacity>
                    </View>
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
    container: {
        backgroundColor: '#121215',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '90%',
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    headerIcon: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    closeBtn: {
        padding: 6
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)'
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '500',
        flex: 1
    },
    formScroll: {
        maxHeight: 450
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E4E4E7',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4
    },
    sectionHelper: {
        fontSize: 11,
        color: '#71717A',
        marginBottom: 8
    },
    emptyBox: {
        backgroundColor: '#18181B',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    emptyText: {
        color: '#71717A',
        fontSize: 12
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    commitmentChip: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#18181B',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    commitmentChipActive: {
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.08)'
    },
    chipTextGroup: {
        flex: 1
    },
    chipTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF'
    },
    chipTitleActive: {
        color: '#38BDF8'
    },
    chipSub: {
        fontSize: 11,
        color: '#71717A',
        marginTop: 2
    },
    memberChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#18181B',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    memberChipActive: {
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)'
    },
    memberChipText: {
        fontSize: 12,
        color: '#A1A1AA'
    },
    memberChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '600'
    },
    notesInput: {
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 8,
        padding: 10,
        color: '#FFFFFF',
        fontSize: 12,
        textAlignVertical: 'top'
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#27272A'
    },
    cancelText: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '600'
    },
    saveBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#38BDF8',
        justifyContent: 'center',
        alignItems: 'center'
    },
    saveBtnDisabled: {
        opacity: 0.5
    },
    saveText: {
        color: '#000000',
        fontSize: 13,
        fontWeight: '700'
    }
});
