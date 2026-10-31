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
import { X, Check, User, Heart, ExternalLink, AlertCircle } from 'lucide-react-native';
import { EmergencyContactType } from '../../../services/family/familyContracts.js';

export default function EmergencyContactModal({
    visible,
    onClose,
    onSave,
    contact = null,
    members = [],
    trustedCircle = []
}) {
    const isEditing = Boolean(contact && contact.id);

    // Form states
    const [sourceType, setSourceType] = useState('EXTERNAL'); // 'MEMBER' | 'TRUSTED' | 'EXTERNAL'
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [selectedTrustedId, setSelectedTrustedId] = useState('');
    const [priorityOrder, setPriorityOrder] = useState('1');
    const [contactType, setContactType] = useState(EmergencyContactType.PRIMARY);
    const [displayName, setDisplayName] = useState('');
    const [relationship, setRelationship] = useState('');
    const [primaryPhone, setPrimaryPhone] = useState('');
    const [secondaryPhone, setSecondaryPhone] = useState('');
    const [email, setEmail] = useState('');
    const [instructions, setInstructions] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        if (contact) {
            if (contact.personId) {
                setSourceType('MEMBER');
                setSelectedPersonId(contact.personId);
                setSelectedTrustedId('');
            } else if (contact.trustedCircleMemberId) {
                setSourceType('TRUSTED');
                setSelectedTrustedId(contact.trustedCircleMemberId);
                setSelectedPersonId('');
            } else {
                setSourceType('EXTERNAL');
                setSelectedPersonId('');
                setSelectedTrustedId('');
            }
            setPriorityOrder(String(contact.priorityOrder || '1'));
            setContactType(contact.contactType || EmergencyContactType.PRIMARY);
            setDisplayName(contact.displayName || '');
            setRelationship(contact.relationship || '');
            setPrimaryPhone(contact.primaryPhone || '');
            setSecondaryPhone(contact.secondaryPhone || '');
            setEmail(contact.email || '');
            setInstructions(contact.instructions || '');
        } else {
            // New contact defaults
            setSourceType('EXTERNAL');
            setSelectedPersonId('');
            setSelectedTrustedId('');
            setPriorityOrder('1');
            setContactType(EmergencyContactType.PRIMARY);
            setDisplayName('');
            setRelationship('');
            setPrimaryPhone('');
            setSecondaryPhone('');
            setEmail('');
            setInstructions('');
        }
        setErrorMsg(null);
    }, [contact, visible]);

    // Handle member selection
    const handleSelectMember = (personId) => {
        setSelectedPersonId(personId);
        const m = members.find(item => item.id === personId);
        if (m) {
            if (!displayName) setDisplayName(m.preferredName || m.fullName || '');
            if (!relationship) setRelationship(m.relationship || 'Family Member');
            if (!primaryPhone && m.phone) setPrimaryPhone(m.phone);
            if (!email && m.email) setEmail(m.email);
        }
    };

    // Handle trusted circle selection
    const handleSelectTrusted = (trustedId) => {
        setSelectedTrustedId(trustedId);
        const t = trustedCircle.find(item => item.id === trustedId);
        if (t) {
            if (!displayName) setDisplayName(t.displayName || t.name || '');
            if (!relationship) setRelationship(t.relationship || 'Trusted Contact');
            if (!primaryPhone && t.phone) setPrimaryPhone(t.phone);
        }
    };

    const saving = useRef(false);
    const handleSave = async () => {
        if(saving.current) return;
        setErrorMsg(null);

        // Validation
        const trimmedName = displayName.trim();
        const trimmedRel = relationship.trim();
        const trimmedPhone = primaryPhone.trim();
        const parsedPriority = parseInt(priorityOrder, 10);

        if (!trimmedName) {
            setErrorMsg('Display name is required');
            return;
        }
        if (!trimmedRel) {
            setErrorMsg('Relationship is required (e.g. Spouse, Doctor, Attorney)');
            return;
        }
        if (!trimmedPhone) {
            setErrorMsg('Primary phone number is required');
            return;
        }
        if (isNaN(parsedPriority) || parsedPriority < 1) {
            setErrorMsg('Priority order must be an integer >= 1');
            return;
        }

        // Clean payload strictly adhering to reference exclusivity
        const payload = {
            id: contact ? contact.id : undefined,
            priorityOrder: parsedPriority,
            contactType,
            personId: sourceType === 'MEMBER' ? (selectedPersonId || null) : null,
            trustedCircleMemberId: sourceType === 'TRUSTED' ? (selectedTrustedId || null) : null,
            displayName: trimmedName,
            relationship: trimmedRel,
            primaryPhone: trimmedPhone,
            secondaryPhone: secondaryPhone.trim() || null,
            email: email.trim() || null,
            instructions: instructions.trim() || ''
        };

        // Safety check for exclusivity
        if (payload.personId && payload.trustedCircleMemberId) {
            setErrorMsg('Contact cannot reference both Household Member and Trusted Circle');
            return;
        }

        saving.current = true;
        try { await onSave(payload); } catch(err) { setErrorMsg(err.message); } finally { saving.current = false; }
    };

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
                            {isEditing ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
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
                        {/* Reference Source Segmented Switcher */}
                        <Text style={styles.fieldLabel}>Contact Source</Text>
                        <View style={styles.segmentedRow}>
                            <TouchableOpacity 
                                style={[styles.segmentBtn, sourceType === 'EXTERNAL' && styles.segmentBtnActive]}
                                onPress={() => { setSourceType('EXTERNAL'); setSelectedPersonId(''); setSelectedTrustedId(''); }}
                                activeOpacity={0.7}
                            >
                                <ExternalLink size={12} color={sourceType === 'EXTERNAL' ? '#FFFFFF' : '#A1A1AA'} />
                                <Text style={[styles.segmentText, sourceType === 'EXTERNAL' && styles.segmentTextActive]}>
                                    External
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.segmentBtn, sourceType === 'MEMBER' && styles.segmentBtnActive]}
                                onPress={() => { setSourceType('MEMBER'); setSelectedTrustedId(''); }}
                                activeOpacity={0.7}
                            >
                                <User size={12} color={sourceType === 'MEMBER' ? '#FFFFFF' : '#A1A1AA'} />
                                <Text style={[styles.segmentText, sourceType === 'MEMBER' && styles.segmentTextActive]}>
                                    Member
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.segmentBtn, sourceType === 'TRUSTED' && styles.segmentBtnActive]}
                                onPress={() => { setSourceType('TRUSTED'); setSelectedPersonId(''); }}
                                activeOpacity={0.7}
                            >
                                <Heart size={12} color={sourceType === 'TRUSTED' ? '#FFFFFF' : '#A1A1AA'} />
                                <Text style={[styles.segmentText, sourceType === 'TRUSTED' && styles.segmentTextActive]}>
                                    Trusted
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Household Member Picker if MEMBER */}
                        {sourceType === 'MEMBER' && members.length > 0 && (
                            <View style={styles.pickerSection}>
                                <Text style={styles.fieldSubLabel}>Select Household Member:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                                    {members.map(m => (
                                        <TouchableOpacity
                                            key={m.id}
                                            style={[styles.chip, selectedPersonId === m.id && styles.chipActive]}
                                            onPress={() => handleSelectMember(m.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.chipText, selectedPersonId === m.id && styles.chipTextActive]}>
                                                {m.preferredName || m.fullName}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Priority & Type row */}
                        <View style={styles.row}>
                            <View style={[styles.col, { flex: 1 }]}>
                                <Text style={styles.fieldLabel}>Dispatch Priority</Text>
                                <TextInput
                                    style={styles.input}
                                    value={priorityOrder}
                                    onChangeText={setPriorityOrder}
                                    keyboardType="numeric"
                                    placeholder="1 (Primary)"
                                    placeholderTextColor="#52525B"
                                />
                            </View>

                            <View style={[styles.col, { flex: 2 }]}>
                                <Text style={styles.fieldLabel}>Contact Type</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                                    {[
                                        { key: EmergencyContactType.PRIMARY, label: 'Primary' },
                                        { key: EmergencyContactType.SECONDARY, label: 'Secondary' },
                                        { key: EmergencyContactType.MEDICAL_PROXY, label: 'Medical' },
                                        { key: EmergencyContactType.LEGAL_PROXY, label: 'Legal' },
                                        { key: EmergencyContactType.OTHER, label: 'Other' }
                                    ].map(item => (
                                        <TouchableOpacity
                                            key={item.key}
                                            style={[styles.chip, contactType === item.key && styles.chipActive]}
                                            onPress={() => setContactType(item.key)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.chipText, contactType === item.key && styles.chipTextActive]}>
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        {/* Display Name */}
                        <Text style={styles.fieldLabel}>Display Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="e.g. Dr. Robert Chen, Sarah Miller"
                            placeholderTextColor="#52525B"
                        />

                        {/* Relationship */}
                        <Text style={styles.fieldLabel}>Relationship *</Text>
                        <TextInput
                            style={styles.input}
                            value={relationship}
                            onChangeText={setRelationship}
                            placeholder="e.g. Spouse, Primary Physician, Sibling"
                            placeholderTextColor="#52525B"
                        />

                        {/* Primary Phone */}
                        <Text style={styles.fieldLabel}>Primary Phone *</Text>
                        <TextInput
                            style={styles.input}
                            value={primaryPhone}
                            onChangeText={setPrimaryPhone}
                            keyboardType="phone-pad"
                            placeholder="+1 (555) 000-0000"
                            placeholderTextColor="#52525B"
                        />

                        {/* Secondary Phone */}
                        <Text style={styles.fieldLabel}>Secondary / Alternate Phone (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={secondaryPhone}
                            onChangeText={setSecondaryPhone}
                            keyboardType="phone-pad"
                            placeholder="Alternate contact number"
                            placeholderTextColor="#52525B"
                        />

                        {/* Email */}
                        <Text style={styles.fieldLabel}>Email Address (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholder="contact@example.com"
                            placeholderTextColor="#52525B"
                        />

                        {/* Instructions */}
                        <Text style={styles.fieldLabel}>Special Instructions / Dispatch Notes</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={instructions}
                            onChangeText={setInstructions}
                            placeholder="e.g. Knows medical history, holds house keys, call during daytime"
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
                            <Text style={styles.saveBtnText}>Save Contact</Text>
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
        maxHeight: '85%',
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
    fieldSubLabel: {
        color: '#A1A1AA',
        fontSize: 11,
        marginBottom: 6
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 6,
        gap: 6
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
    pickerSection: {
        marginTop: 10
    },
    horizontalChips: {
        flexDirection: 'row',
        marginBottom: 4
    },
    chip: {
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
    row: {
        flexDirection: 'row',
        gap: 12
    },
    col: {
        justifyContent: 'flex-start'
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
