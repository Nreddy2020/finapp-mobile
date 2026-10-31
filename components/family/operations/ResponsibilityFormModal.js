import React, { useState, useRef, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet
} from 'react-native';
import { X, AlertCircle } from 'lucide-react-native';
import {
    ResponsibilityCategory,
    validateResponsibility,
    createEmptyResponsibility
} from '../../../services/family/familyContracts.js';

export default function ResponsibilityFormModal({
    visible,
    onClose,
    onSave,
    initialResponsibility = null,
    householdId,
    householdMembers = []
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(ResponsibilityCategory.OTHER);
    const [leadPersonId, setLeadPersonId] = useState('');
    const [backupPersonId, setBackupPersonId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (initialResponsibility) {
            setTitle(initialResponsibility.title || '');
            setDescription(initialResponsibility.description || '');
            setCategory(initialResponsibility.category || ResponsibilityCategory.OTHER);
            setLeadPersonId(initialResponsibility.leadPersonId || '');
            setBackupPersonId(initialResponsibility.backupPersonId || null);
        } else {
            setTitle('');
            setDescription('');
            setCategory(ResponsibilityCategory.HOME_MAINTENANCE);
            setLeadPersonId('');
            setBackupPersonId(null);
        }
        setErrorMessage('');
    }, [initialResponsibility, visible, householdMembers]);

    const saving = useRef(false);
    const handleSave = async () => {
        if (saving.current) return;
        setErrorMessage('');

        const cleanTitle = title.trim();
        if (!cleanTitle) {
            setErrorMessage('Responsibility title is required');
            return;
        }

        if (!leadPersonId) {
            setErrorMessage('Lead responsible member is required');
            return;
        }

        const respData = {
            ...(initialResponsibility || {}),
            householdId,
            title: cleanTitle,
            description: description.trim(),
            category,
            leadPersonId,
            backupPersonId: backupPersonId || null
        };

        try {
            const candidate = createEmptyResponsibility(respData);
            validateResponsibility(candidate);
            saving.current = true;
            await onSave(respData);
        } catch (err) {
            setErrorMessage(err.message);
        } finally { saving.current = false; }
    };

    const categories = [
        { key: ResponsibilityCategory.HOME_MAINTENANCE, label: 'Home Maintenance' },
        { key: ResponsibilityCategory.CHORES_PANTRY, label: 'Chores & Pantry' },
        { key: ResponsibilityCategory.HEALTH_WELLNESS, label: 'Health & Wellness' },
        { key: ResponsibilityCategory.EDUCATION_ACTIVITIES, label: 'Education & Activities' },
        { key: ResponsibilityCategory.FINANCIAL_ADMIN, label: 'Financial Admin' },
        { key: ResponsibilityCategory.VEHICLE_LOGISTICS, label: 'Vehicle & Logistics' },
        { key: ResponsibilityCategory.PET_CARE, label: 'Pet Care' },
        { key: ResponsibilityCategory.OTHER, label: 'Other / General' }
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {initialResponsibility ? 'Edit Responsibility' : 'Add Household Domain'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    {errorMessage ? (
                        <View style={styles.errorBanner}>
                            <AlertCircle size={16} color="#F87171" />
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Title */}
                        <Text style={styles.fieldLabel}>Domain Area Title *</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. Home Maintenance & Repairs"
                            placeholderTextColor="#52525B"
                            value={title}
                            onChangeText={setTitle}
                        />

                        {/* Description */}
                        <Text style={styles.fieldLabel}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Describe household scope or expectations"
                            placeholderTextColor="#52525B"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                        />

                        {/* Category Selector */}
                        <Text style={styles.fieldLabel}>Category Area</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                            {categories.map(c => (
                                <TouchableOpacity
                                    key={c.key}
                                    onPress={() => setCategory(c.key)}
                                    style={[
                                        styles.pillBtn,
                                        category === c.key && styles.pillBtnActive
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.pillBtnText,
                                            category === c.key && styles.pillBtnTextActive
                                        ]}
                                    >
                                        {c.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Lead Person Picker */}
                        <Text style={styles.fieldLabel}>Accountable Lead Member *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                            {householdMembers.map(m => (
                                <TouchableOpacity
                                    key={m.id}
                                    onPress={() => setLeadPersonId(m.id)}
                                    style={[
                                        styles.pillBtn,
                                        leadPersonId === m.id && styles.pillBtnActive
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.pillBtnText,
                                            leadPersonId === m.id && styles.pillBtnTextActive
                                        ]}
                                    >
                                        {m.preferredName || m.fullName}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Backup Person Picker */}
                        <Text style={styles.fieldLabel}>Backup Member (Optional)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                            <TouchableOpacity
                                onPress={() => setBackupPersonId(null)}
                                style={[
                                    styles.pillBtn,
                                    backupPersonId === null && styles.pillBtnActive
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.pillBtnText,
                                        backupPersonId === null && styles.pillBtnTextActive
                                    ]}
                                >
                                    None
                                </Text>
                            </TouchableOpacity>

                            {householdMembers.map(m => (
                                <TouchableOpacity
                                    key={m.id}
                                    onPress={() => setBackupPersonId(m.id)}
                                    style={[
                                        styles.pillBtn,
                                        backupPersonId === m.id && styles.pillBtnActive
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.pillBtnText,
                                            backupPersonId === m.id && styles.pillBtnTextActive
                                        ]}
                                    >
                                        {m.preferredName || m.fullName}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                            <Text style={styles.saveBtnText}>
                                {initialResponsibility ? 'Update Domain' : 'Save Domain'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16
    },
    modalContainer: {
        width: '100%',
        maxHeight: '90%',
        backgroundColor: '#121214',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A',
        overflow: 'hidden'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    closeBtn: {
        padding: 4
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EF444415',
        borderBottomWidth: 1,
        borderBottomColor: '#EF444440',
        paddingHorizontal: 16,
        paddingVertical: 10
    },
    errorText: {
        fontSize: 12,
        color: '#F87171',
        flex: 1,
        fontWeight: '600'
    },
    modalBody: {
        padding: 16
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A1A1AA',
        marginBottom: 6,
        marginTop: 10
    },
    textInput: {
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#FFFFFF'
    },
    textArea: {
        height: 70,
        textAlignVertical: 'top'
    },
    pillScroll: {
        flexDirection: 'row',
        marginBottom: 4
    },
    pillBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        marginRight: 8
    },
    pillBtnActive: {
        backgroundColor: '#8B5CF620',
        borderColor: '#8B5CF6'
    },
    pillBtnText: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    pillBtnTextActive: {
        color: '#A78BFA',
        fontWeight: '700'
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    saveBtn: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8
    },
    saveBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    }
});
