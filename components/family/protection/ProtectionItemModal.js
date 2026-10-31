import React, { useState, useRef, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Modal, 
    TouchableOpacity, 
    TextInput, 
    ScrollView, 
    KeyboardAvoidingView, 
    Platform 
} from 'react-native';
import { X, Check, Shield, AlertCircle, FileText, MapPin } from 'lucide-react-native';
import { ProtectionType, ProtectionStatus } from '../../../services/family/familyContracts.js';

export default function ProtectionItemModal({
    visible,
    onClose,
    onSave,
    item = null,
    members = [],
    documents = []
}) {
    const isEditing = Boolean(item && item.id);

    // Form states
    const [title, setTitle] = useState('');
    const [protectionType, setProtectionType] = useState(ProtectionType.HEALTHCARE_PROXY);
    const [status, setStatus] = useState(ProtectionStatus.ACTIVE);
    const [subjectPersonId, setSubjectPersonId] = useState('');
    const [designatedPersonId, setDesignatedPersonId] = useState('');
    const [designatedBackupPersonId, setDesignatedBackupPersonId] = useState('');
    const [documentId, setDocumentId] = useState('');
    const [institutionOrIssuer, setInstitutionOrIssuer] = useState('');
    const [externalReferenceNumber, setExternalReferenceNumber] = useState('');
    const [physicalLocation, setPhysicalLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        if (item) {
            setTitle(item.title || '');
            setProtectionType(item.protectionType || ProtectionType.HEALTHCARE_PROXY);
            setStatus(item.status || ProtectionStatus.ACTIVE);
            setSubjectPersonId(item.subjectPersonId || '');
            setDesignatedPersonId(item.designatedPersonId || '');
            setDesignatedBackupPersonId(item.designatedBackupPersonId || '');
            setDocumentId(item.documentId || '');
            setInstitutionOrIssuer(item.institutionOrIssuer || '');
            setExternalReferenceNumber(item.externalReferenceNumber || '');
            setPhysicalLocation(item.physicalLocation || '');
            setNotes(item.notes || '');
        } else {
            setTitle('');
            setProtectionType(ProtectionType.HEALTHCARE_PROXY);
            setStatus(ProtectionStatus.ACTIVE);
            setSubjectPersonId('');
            setDesignatedPersonId('');
            setDesignatedBackupPersonId('');
            setDocumentId('');
            setInstitutionOrIssuer('');
            setExternalReferenceNumber('');
            setPhysicalLocation('');
            setNotes('');
        }
        setErrorMsg(null);
    }, [item, visible]);

    const saving = useRef(false);
    const handleSave = async () => {
        if(saving.current) return;
        setErrorMsg(null);
        const trimmedTitle = title.trim();

        if (!trimmedTitle) {
            setErrorMsg('Title is required (e.g. Durable Healthcare Proxy)');
            return;
        }

        const primaryAgent = designatedPersonId.trim() || null;
        const backupAgent = designatedBackupPersonId.trim() || null;

        // Governance designation rules
        if (backupAgent && !primaryAgent) {
            setErrorMsg('Cannot designate a backup agent without a primary agent designated first');
            return;
        }

        if (primaryAgent && backupAgent && primaryAgent === backupAgent) {
            setErrorMsg('Designated backup agent cannot be identical to the primary agent');
            return;
        }

        const payload = {
            id: item ? item.id : undefined,
            title: trimmedTitle,
            protectionType,
            status,
            subjectPersonId: subjectPersonId.trim() || null,
            designatedPersonId: primaryAgent,
            designatedBackupPersonId: backupAgent,
            documentId: documentId.trim() || null,
            institutionOrIssuer: institutionOrIssuer.trim() || null,
            externalReferenceNumber: externalReferenceNumber.trim() || null,
            physicalLocation: physicalLocation.trim() || null,
            notes: notes.trim() || ''
        };

        saving.current = true;
        try { await onSave(payload); } catch(err) { setErrorMsg(err.message); } finally { saving.current = false; }
    };

    const typeOptions = [
        { key: ProtectionType.HEALTHCARE_PROXY, label: 'Healthcare Proxy' },
        { key: ProtectionType.WILL_TRUST, label: 'Will / Trust' },
        { key: ProtectionType.POWER_OF_ATTORNEY, label: 'Power of Attorney' },
        { key: ProtectionType.GUARDIANSHIP_DECLARATION, label: 'Guardianship' },
        { key: ProtectionType.LIFE_INSURANCE_RECORD, label: 'Life Record' },
        { key: ProtectionType.CRITICAL_DIRECTIVE, label: 'Directive' }
    ];

    const statusOptions = [
        { key: ProtectionStatus.ACTIVE, label: 'Active' },
        { key: ProtectionStatus.IN_REVIEW, label: 'In Review' },
        { key: ProtectionStatus.DRAFT, label: 'Draft' }
    ];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {isEditing ? 'Edit Protection Directive' : 'Add Protection Directive'}
                        </Text>
                        <TouchableOpacity 
                            onPress={onClose} 
                            style={styles.closeBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                        >
                            <X size={20} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    {errorMsg && (
                        <View style={styles.errorBanner}>
                            <AlertCircle size={14} color="#EF4444" style={{ marginRight: 6 }} />
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                    )}

                    <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                        {/* Title */}
                        <Text style={styles.fieldLabel}>Directive Title *</Text>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="e.g. Durable Healthcare Proxy, Family Revocable Trust"
                            placeholderTextColor="#52525B"
                        />

                        {/* Protection Type Selector */}
                        <Text style={styles.fieldLabel}>Directive Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                            {typeOptions.map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[styles.chip, protectionType === t.key && styles.chipActive]}
                                    onPress={() => setProtectionType(t.key)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.chipText, protectionType === t.key && styles.chipTextActive]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Status Selector */}
                        <Text style={styles.fieldLabel}>Directive Status</Text>
                        <View style={styles.segmentedRow}>
                            {statusOptions.map(s => (
                                <TouchableOpacity
                                    key={s.key}
                                    style={[styles.segmentBtn, status === s.key && styles.segmentBtnActive]}
                                    onPress={() => setStatus(s.key)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.segmentText, status === s.key && styles.segmentTextActive]}>
                                        {s.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Subject Person */}
                        <Text style={styles.fieldLabel}>Subject (Covered Individual)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                            <TouchableOpacity
                                style={[styles.chip, subjectPersonId === '' && styles.chipActive]}
                                onPress={() => setSubjectPersonId('')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, subjectPersonId === '' && styles.chipTextActive]}>
                                    Household-Wide
                                </Text>
                            </TouchableOpacity>
                            {members.map(m => (
                                <TouchableOpacity
                                    key={m.id}
                                    style={[styles.chip, subjectPersonId === m.id && styles.chipActive]}
                                    onPress={() => setSubjectPersonId(m.id)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.chipText, subjectPersonId === m.id && styles.chipTextActive]}>
                                        {m.preferredName || m.fullName}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Primary Agent Picker */}
                        <Text style={styles.fieldLabel}>Designated Lead Agent</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                            <TouchableOpacity
                                style={[styles.chip, designatedPersonId === '' && styles.chipActive]}
                                onPress={() => setDesignatedPersonId('')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, designatedPersonId === '' && styles.chipTextActive]}>
                                    None
                                </Text>
                            </TouchableOpacity>
                            {members.map(m => (
                                <TouchableOpacity
                                    key={m.id}
                                    style={[styles.chip, designatedPersonId === m.id && styles.chipActive]}
                                    onPress={() => setDesignatedPersonId(m.id)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.chipText, designatedPersonId === m.id && styles.chipTextActive]}>
                                        {m.preferredName || m.fullName}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Backup Agent Picker */}
                        <Text style={styles.fieldLabel}>Designated Backup / Successor Agent</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                            <TouchableOpacity
                                style={[styles.chip, designatedBackupPersonId === '' && styles.chipActive]}
                                onPress={() => setDesignatedBackupPersonId('')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, designatedBackupPersonId === '' && styles.chipTextActive]}>
                                    None
                                </Text>
                            </TouchableOpacity>
                            {members.map(m => (
                                <TouchableOpacity
                                    key={m.id}
                                    style={[styles.chip, designatedBackupPersonId === m.id && styles.chipActive]}
                                    onPress={() => setDesignatedBackupPersonId(m.id)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.chipText, designatedBackupPersonId === m.id && styles.chipTextActive]}>
                                        {m.preferredName || m.fullName}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Linked Document Picker */}
                        {documents.length > 0 && (
                            <View>
                                <Text style={styles.fieldLabel}>Linked Vault Document</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                                    <TouchableOpacity
                                        style={[styles.chip, documentId === '' && styles.chipActive]}
                                        onPress={() => setDocumentId('')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.chipText, documentId === '' && styles.chipTextActive]}>
                                            No Linked Document
                                        </Text>
                                    </TouchableOpacity>
                                    {documents.map(d => (
                                        <TouchableOpacity
                                            key={d.id}
                                            style={[styles.chip, documentId === d.id && styles.chipActive]}
                                            onPress={() => setDocumentId(d.id)}
                                            activeOpacity={0.7}
                                        >
                                            <FileText size={11} color={documentId === d.id ? '#60A5FA' : '#A1A1AA'} style={{ marginRight: 4 }} />
                                            <Text style={[styles.chipText, documentId === d.id && styles.chipTextActive]}>
                                                {d.title}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Canonical Physical Location */}
                        <Text style={styles.fieldLabel}>Physical Storage Location</Text>
                        <TextInput
                            style={styles.input}
                            value={physicalLocation}
                            onChangeText={setPhysicalLocation}
                            placeholder="e.g. Master Bedroom Safe Shelf B, Safe Deposit Box #412"
                            placeholderTextColor="#52525B"
                        />

                        {/* Institution / Issuer */}
                        <Text style={styles.fieldLabel}>Institution or Issuer (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={institutionOrIssuer}
                            onChangeText={setInstitutionOrIssuer}
                            placeholder="e.g. Smith & Law LLC, Kaiser Permanente, Prudential"
                            placeholderTextColor="#52525B"
                        />

                        {/* Reference / Directive Identifier Number */}
                        <Text style={styles.fieldLabel}>Reference / Directive Number (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={externalReferenceNumber}
                            onChangeText={setExternalReferenceNumber}
                            placeholder="e.g. TRUST-2024-998, NOTARY-4819"
                            placeholderTextColor="#52525B"
                        />

                        {/* Notes */}
                        <Text style={styles.fieldLabel}>Notes & Instructions</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Special powers granted, access instructions, revocation conditions"
                            placeholderTextColor="#52525B"
                            multiline={true}
                            numberOfLines={3}
                        />

                        <View style={{ height: 20 }} />
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity 
                            style={styles.cancelBtn} 
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.saveBtn} 
                            onPress={handleSave}
                            activeOpacity={0.7}
                        >
                            <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.saveBtnText}>Save Directive</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end'
    },
    modalContainer: {
        backgroundColor: '#18181B',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 1,
        borderColor: '#27272A',
        maxHeight: '88%',
        paddingBottom: Platform.OS === 'ios' ? 30 : 16
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700'
    },
    closeBtn: {
        padding: 4
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderBottomWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        paddingHorizontal: 20,
        paddingVertical: 10
    },
    errorText: {
        color: '#F87171',
        fontSize: 12,
        fontWeight: '600'
    },
    formScroll: {
        paddingHorizontal: 20,
        paddingTop: 16
    },
    fieldLabel: {
        color: '#D4D4D8',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 12
    },
    segmentedRow: {
        flexDirection: 'row',
        backgroundColor: '#09090B',
        borderRadius: 8,
        padding: 3,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    segmentBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 6
    },
    segmentBtnActive: {
        backgroundColor: '#27272A'
    },
    segmentText: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '600'
    },
    segmentTextActive: {
        color: '#FFFFFF'
    },
    horizontalChips: {
        flexDirection: 'row',
        marginBottom: 4
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27272A',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#3F3F46'
    },
    chipActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.25)',
        borderColor: '#3B82F6'
    },
    chipText: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '500'
    },
    chipTextActive: {
        color: '#60A5FA',
        fontWeight: '700'
    },
    input: {
        backgroundColor: '#09090B',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FFFFFF',
        fontSize: 14
    },
    textArea: {
        minHeight: 70,
        textAlignVertical: 'top'
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#27272A'
    },
    cancelBtnText: {
        color: '#D4D4D8',
        fontSize: 13,
        fontWeight: '600'
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#10B981'
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    }
});
