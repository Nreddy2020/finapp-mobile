import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    Modal, 
    StyleSheet, 
    Alert 
} from 'react-native';
import { X, Check, Lock, Calendar, FileText, User, Users } from 'lucide-react-native';
import { 
    DocumentCategory, 
    validateDocument,
    parseUtcDateOnly 
} from '../../../services/family/familyContracts.js';

const CATEGORIES = [
    DocumentCategory.IDENTITY,
    DocumentCategory.FINANCIAL,
    DocumentCategory.MEDICAL,
    DocumentCategory.LEGAL,
    DocumentCategory.PROPERTY,
    DocumentCategory.VEHICLE,
    DocumentCategory.EDUCATION,
    DocumentCategory.OTHER
];

export default function DocumentFormModal({
    visible,
    document = null,
    householdId,
    activeMembers = [], // [{ id, fullName }] strictly active/provisional members only
    existingLocations = [], // strings
    onClose,
    onSave
}) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState(DocumentCategory.IDENTITY);
    const [documentType, setDocumentType] = useState('');
    const [personId, setPersonId] = useState(null); // null = household wide
    const [identifierNumber, setIdentifierNumber] = useState('');
    const [physicalLocation, setPhysicalLocation] = useState('');
    const [issuedDate, setIssuedDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [formError, setFormError] = useState(null);

    useEffect(() => {
        if (document) {
            setTitle(document.title || '');
            setCategory(document.category || DocumentCategory.IDENTITY);
            setDocumentType(document.documentType || '');
            setPersonId(document.personId || null);
            setIdentifierNumber(document.identifierNumber || '');
            setPhysicalLocation(document.physicalLocation || '');
            setIssuedDate(document.issuedDate || '');
            setExpiryDate(document.expiryDate || '');
            setNotes(document.notes || '');
            setTagsInput(Array.isArray(document.tags) ? document.tags.join(', ') : '');
        } else {
            setTitle('');
            setCategory(DocumentCategory.IDENTITY);
            setDocumentType('');
            setPersonId(null);
            setIdentifierNumber('');
            setPhysicalLocation('');
            setIssuedDate('');
            setExpiryDate('');
            setNotes('');
            setTagsInput('');
        }
        setFormError(null);
    }, [document, visible]);

    const handleSave = async () => {
        setFormError(null);
        if (!title.trim()) {
            setFormError('Document title is required');
            return;
        }

        const cleanIssued = issuedDate.trim() || null;
        const cleanExpiry = expiryDate.trim() || null;

        // Validate date formats
        if (cleanIssued && parseUtcDateOnly(cleanIssued) === null) {
            setFormError('Issued Date must be a valid calendar date (YYYY-MM-DD)');
            return;
        }
        if (cleanExpiry && parseUtcDateOnly(cleanExpiry) === null) {
            setFormError('Expiry Date must be a valid calendar date (YYYY-MM-DD)');
            return;
        }
        if (cleanIssued && cleanExpiry) {
            const issuedUtc = parseUtcDateOnly(cleanIssued);
            const expiryUtc = parseUtcDateOnly(cleanExpiry);
            if (expiryUtc < issuedUtc) {
                setFormError('Expiry Date cannot be earlier than Issued Date');
                return;
            }
        }

        const tags = tagsInput
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);

        const payload = {
            ...(document || {}),
            householdId,
            personId: personId || null,
            title: title.trim(),
            category,
            documentType: documentType.trim() || 'General Document',
            identifierNumber: identifierNumber.trim() || null,
            physicalLocation: physicalLocation.trim() || null,
            issuedDate: cleanIssued,
            expiryDate: cleanExpiry,
            notes: notes.trim(),
            tags
        };

        try {
            await onSave(payload);
            onClose();
        } catch (err) {
            setFormError(err.message || 'Failed to save document');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            {document ? 'Edit Document' : 'Add Family Document'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    {formError && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{formError}</Text>
                        </View>
                    )}

                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        {/* Title */}
                        <Text style={styles.label}>Document Title *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Passport, House Deed, Health Insurance"
                            placeholderTextColor="#71717A"
                            value={title}
                            onChangeText={setTitle}
                        />

                        {/* Category Selector */}
                        <Text style={styles.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                            {CATEGORIES.map(cat => {
                                const isSelected = category === cat;
                                return (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                                        onPress={() => setCategory(cat)}
                                    >
                                        <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Document Type */}
                        <Text style={styles.label}>Document Type</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. National ID, Title Deed, Policy Document"
                            placeholderTextColor="#71717A"
                            value={documentType}
                            onChangeText={setDocumentType}
                        />

                        {/* Member Assignment (Subject) */}
                        <Text style={styles.label}>Assigned Member</Text>
                        <View style={styles.memberSelectionRow}>
                            <TouchableOpacity
                                style={[
                                    styles.memberChip,
                                    personId === null && styles.memberChipSelected
                                ]}
                                onPress={() => setPersonId(null)}
                            >
                                <Users size={13} color={personId === null ? '#60A5FA' : '#A1A1AA'} />
                                <Text style={[
                                    styles.memberChipText,
                                    personId === null && styles.memberChipTextSelected
                                ]}>
                                    Household Wide
                                </Text>
                            </TouchableOpacity>

                            {activeMembers.map(m => {
                                const isSelected = personId === m.id;
                                return (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={[styles.memberChip, isSelected && styles.memberChipSelected]}
                                        onPress={() => setPersonId(m.id)}
                                    >
                                        <User size={13} color={isSelected ? '#60A5FA' : '#A1A1AA'} />
                                        <Text style={[styles.memberChipText, isSelected && styles.memberChipTextSelected]}>
                                            {m.fullName}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Identifier Number */}
                        <Text style={styles.label}>Identifier / Policy Number (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. AB1234567 (Masked in UI)"
                            placeholderTextColor="#71717A"
                            value={identifierNumber}
                            onChangeText={setIdentifierNumber}
                            autoCapitalize="characters"
                        />

                        {/* Physical Location */}
                        <Text style={styles.label}>Physical Storage Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Master Bedroom Safe Box A, Drawer 2"
                            placeholderTextColor="#71717A"
                            value={physicalLocation}
                            onChangeText={setPhysicalLocation}
                        />

                        {/* Quick location chips if available */}
                        {existingLocations.length > 0 && (
                            <View style={styles.quickLocationsRow}>
                                <Text style={styles.quickLocationsLabel}>Suggestions:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {existingLocations.map((loc, idx) => (
                                        <TouchableOpacity
                                            key={`${loc}_${idx}`}
                                            style={styles.locationChip}
                                            onPress={() => setPhysicalLocation(loc)}
                                        >
                                            <Lock size={10} color="#FBBF24" />
                                            <Text style={styles.locationChipText}>{loc}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Dates Row */}
                        <View style={styles.dateInputsRow}>
                            <View style={styles.dateCol}>
                                <Text style={styles.label}>Issued Date</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#71717A"
                                    value={issuedDate}
                                    onChangeText={setIssuedDate}
                                    maxLength={10}
                                />
                            </View>
                            <View style={styles.dateCol}>
                                <Text style={styles.label}>Expiry Date</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#71717A"
                                    value={expiryDate}
                                    onChangeText={setExpiryDate}
                                    maxLength={10}
                                />
                            </View>
                        </View>

                        {/* Notes */}
                        <Text style={styles.label}>Notes</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Additional confidential notes, renewal instructions, etc."
                            placeholderTextColor="#71717A"
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                        />

                        {/* Tags */}
                        <Text style={styles.label}>Tags (Comma separated)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. tax, urgent, renewal, safe"
                            placeholderTextColor="#71717A"
                            value={tagsInput}
                            onChangeText={setTagsInput}
                        />

                        <View style={{ height: 24 }} />
                    </ScrollView>

                    {/* Actions footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Check size={16} color="#000000" />
                            <Text style={styles.saveText}>Save Document</Text>
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
        backgroundColor: '#18181B',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: '#27272A',
        paddingBottom: 24
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    closeBtn: {
        padding: 4
    },
    errorBox: {
        backgroundColor: '#450A0A',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EF4444'
    },
    errorText: {
        color: '#FCA5A5',
        fontSize: 13,
        fontWeight: '500'
    },
    form: {
        paddingHorizontal: 20,
        paddingTop: 12
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A1A1AA',
        marginTop: 12,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    input: {
        backgroundColor: '#09090B',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A',
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FFFFFF',
        fontSize: 14
    },
    textArea: {
        height: 70,
        textAlignVertical: 'top'
    },
    categoryScroll: {
        flexDirection: 'row',
        marginBottom: 4
    },
    categoryChip: {
        backgroundColor: '#27272A',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 6,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#3F3F46'
    },
    categoryChipSelected: {
        backgroundColor: '#1E3A8A',
        borderColor: '#3B82F6'
    },
    categoryText: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '600'
    },
    categoryTextSelected: {
        color: '#FFFFFF'
    },
    memberSelectionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 4
    },
    memberChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#09090B',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    memberChipSelected: {
        borderColor: '#3B82F6',
        backgroundColor: '#1E3A8A30'
    },
    memberChipText: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '500'
    },
    memberChipTextSelected: {
        color: '#60A5FA',
        fontWeight: '700'
    },
    quickLocationsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 8
    },
    quickLocationsLabel: {
        fontSize: 11,
        color: '#71717A'
    },
    locationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#78350F20',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginRight: 6,
        borderWidth: 1,
        borderColor: '#F59E0B30'
    },
    locationChipText: {
        fontSize: 11,
        color: '#FBBF24'
    },
    dateInputsRow: {
        flexDirection: 'row',
        gap: 12
    },
    dateCol: {
        flex: 1
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 12,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3F3F46'
    },
    cancelText: {
        color: '#A1A1AA',
        fontSize: 14,
        fontWeight: '600'
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8
    },
    saveText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '700'
    }
});
