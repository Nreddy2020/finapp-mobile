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
import { X, Calendar, Clock, AlertCircle } from 'lucide-react-native';
import {
    TaskPriority,
    TaskRecurrence,
    validateTask,
    createEmptyTask
} from '../../../services/family/familyContracts.js';

export default function TaskFormModal({
    visible,
    onClose,
    onSave,
    initialTask = null,
    householdId,
    householdMembers = [],
    responsibilities = []
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState(TaskPriority.MEDIUM);
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [recurrence, setRecurrence] = useState(TaskRecurrence.NONE);
    const [assignedPersonId, setAssignedPersonId] = useState(null);
    const [responsibilityId, setResponsibilityId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (initialTask) {
            setTitle(initialTask.title || '');
            setDescription(initialTask.description || '');
            setPriority(initialTask.priority || TaskPriority.MEDIUM);
            setDueDate(initialTask.dueDate || '');
            setDueTime(initialTask.dueTime || '');
            setRecurrence(initialTask.recurrence || TaskRecurrence.NONE);
            setAssignedPersonId(initialTask.assignedPersonId || null);
            setResponsibilityId(initialTask.responsibilityId || null);
        } else {
            setTitle('');
            setDescription('');
            setPriority(TaskPriority.MEDIUM);
            setDueDate('');
            setDueTime('');
            setRecurrence(TaskRecurrence.NONE);
            setAssignedPersonId(null);
            setResponsibilityId(null);
        }
        setErrorMessage('');
    }, [initialTask, visible]);

    const saving = useRef(false);
    const handleSaveTaskRecord = async () => {
        if (saving.current) return;
        setErrorMessage('');

        const cleanTitle = title.trim();
        if (!cleanTitle) {
            setErrorMessage('Task title is required');
            return;
        }

        const taskData = {
            ...(initialTask || {}),
            householdId,
            title: cleanTitle,
            description: description.trim(),
            priority,
            dueDate: dueDate.trim() || null,
            dueTime: dueTime.trim() || null,
            recurrence,
            assignedPersonId: assignedPersonId || null,
            ownerPersonId: initialTask ? initialTask.ownerPersonId : null,
            responsibilityId: responsibilityId || null
        };

        try {
            const candidate = createEmptyTask(taskData);
            validateTask(candidate);
            saving.current = true;
            await onSave(taskData);
        } catch (err) {
            setErrorMessage(err.message);
        } finally { saving.current = false; }
    };

    const priorities = [
        { key: TaskPriority.LOW, label: 'Low', color: '#71717A' },
        { key: TaskPriority.MEDIUM, label: 'Med', color: '#3B82F6' },
        { key: TaskPriority.HIGH, label: 'High', color: '#F97316' },
        { key: TaskPriority.URGENT, label: 'Urgent', color: '#EF4444' }
    ];

    const recurrenceOptions = [
        { key: TaskRecurrence.NONE, label: 'None' },
        { key: TaskRecurrence.DAILY, label: 'Daily' },
        { key: TaskRecurrence.WEEKLY, label: 'Weekly' },
        { key: TaskRecurrence.BIWEEKLY, label: 'Biweekly' },
        { key: TaskRecurrence.MONTHLY, label: 'Monthly' },
        { key: TaskRecurrence.QUARTERLY, label: 'Quarterly' },
        { key: TaskRecurrence.YEARLY, label: 'Yearly' }
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
                            {initialTask ? 'Edit Task' : 'Add Family Task'}
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
                        <Text style={styles.fieldLabel}>Task Title *</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. Schedule pediatric checkup"
                            placeholderTextColor="#52525B"
                            value={title}
                            onChangeText={setTitle}
                        />

                        {/* Description */}
                        <Text style={styles.fieldLabel}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Add notes, reminders, or details"
                            placeholderTextColor="#52525B"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                        />

                        {/* Priority Selector */}
                        <Text style={styles.fieldLabel}>Priority</Text>
                        <View style={styles.segmentedRow}>
                            {priorities.map(p => (
                                <TouchableOpacity
                                    key={p.key}
                                    onPress={() => setPriority(p.key)}
                                    style={[
                                        styles.segmentedBtn,
                                        priority === p.key && {
                                            backgroundColor: `${p.color}25`,
                                            borderColor: p.color
                                        }
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.segmentedBtnText,
                                            priority === p.key && { color: p.color, fontWeight: '700' }
                                        ]}
                                    >
                                        {p.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Due Date & Due Time Row */}
                        <View style={styles.dualFieldRow}>
                            <View style={styles.dualFieldCol}>
                                <Text style={styles.fieldLabel}>Due Date</Text>
                                <View style={styles.inputWithIcon}>
                                    <Calendar size={14} color="#71717A" />
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#52525B"
                                        value={dueDate}
                                        onChangeText={setDueDate}
                                    />
                                </View>
                            </View>

                            <View style={styles.dualFieldCol}>
                                <Text style={styles.fieldLabel}>Due Time (24h)</Text>
                                <View style={styles.inputWithIcon}>
                                    <Clock size={14} color="#71717A" />
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="HH:mm (e.g. 14:30)"
                                        placeholderTextColor="#52525B"
                                        value={dueTime}
                                        onChangeText={setDueTime}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Recurrence Selector */}
                        <Text style={styles.fieldLabel}>Recurrence</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                            {recurrenceOptions.map(r => (
                                <TouchableOpacity
                                    key={r.key}
                                    onPress={() => setRecurrence(r.key)}
                                    style={[
                                        styles.pillBtn,
                                        recurrence === r.key && styles.pillBtnActive
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.pillBtnText,
                                            recurrence === r.key && styles.pillBtnTextActive
                                        ]}
                                    >
                                        {r.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Assignee Picker */}
                        <Text style={styles.fieldLabel}>Assign Member</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                            <TouchableOpacity
                                onPress={() => setAssignedPersonId(null)}
                                style={[
                                    styles.pillBtn,
                                    assignedPersonId === null && styles.pillBtnActive
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.pillBtnText,
                                        assignedPersonId === null && styles.pillBtnTextActive
                                    ]}
                                >
                                    Household Pool
                                </Text>
                            </TouchableOpacity>

                            {householdMembers.map(m => (
                                <TouchableOpacity
                                    key={m.id}
                                    onPress={() => setAssignedPersonId(m.id)}
                                    style={[
                                        styles.pillBtn,
                                        assignedPersonId === m.id && styles.pillBtnActive
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.pillBtnText,
                                            assignedPersonId === m.id && styles.pillBtnTextActive
                                        ]}
                                    >
                                        {m.preferredName || m.fullName}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Responsibility Domain Picker */}
                        {responsibilities.length > 0 && (
                            <>
                                <Text style={styles.fieldLabel}>Responsibility Domain</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                                    <TouchableOpacity
                                        onPress={() => setResponsibilityId(null)}
                                        style={[
                                            styles.pillBtn,
                                            responsibilityId === null && styles.pillBtnActive
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.pillBtnText,
                                                responsibilityId === null && styles.pillBtnTextActive
                                            ]}
                                        >
                                            None / General
                                        </Text>
                                    </TouchableOpacity>

                                    {responsibilities.map(r => (
                                        <TouchableOpacity
                                            key={r.id}
                                            onPress={() => setResponsibilityId(r.id)}
                                            style={[
                                                styles.pillBtn,
                                                responsibilityId === r.id && styles.pillBtnActive
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.pillBtnText,
                                                    responsibilityId === r.id && styles.pillBtnTextActive
                                                ]}
                                            >
                                                {r.title}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleSaveTaskRecord} style={styles.saveBtn}>
                            <Text style={styles.saveBtnText}>
                                {initialTask ? 'Update Task' : 'Save Task'}
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
    segmentedRow: {
        flexDirection: 'row',
        gap: 6
    },
    segmentedBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A',
        backgroundColor: '#18181B',
        alignItems: 'center'
    },
    segmentedBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    dualFieldRow: {
        flexDirection: 'row',
        gap: 10
    },
    dualFieldCol: {
        flex: 1
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 8,
        paddingHorizontal: 10
    },
    inlineInput: {
        flex: 1,
        paddingVertical: 8,
        paddingLeft: 8,
        fontSize: 13,
        color: '#FFFFFF'
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
        backgroundColor: '#3B82F620',
        borderColor: '#3B82F6'
    },
    pillBtnText: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    pillBtnTextActive: {
        color: '#60A5FA',
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
        backgroundColor: '#3B82F6',
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
