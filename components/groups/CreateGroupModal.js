/**
 * components/groups/CreateGroupModal.js
 * 
 * Modal for creating a new Shared Costs group.
 * Allows choosing group type, name, description, and initial members.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { X, Plus, Users, Compass, Home, Coffee, Briefcase, Tag, Trash2 } from 'lucide-react-native';
import { GROUP_TYPES } from '../../services/shared-costs/groupContracts.js';

export default function CreateGroupModal({ visible, onClose, onCreateGroup }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState(GROUP_TYPES.TRIP);
    const [memberInput, setMemberInput] = useState('');
    const [members, setMembers] = useState(['Ravi', 'Priya']);

    const TYPE_OPTIONS = [
        { key: GROUP_TYPES.TRIP, label: 'Trip', icon: Compass, color: '#F43F5E' },
        { key: GROUP_TYPES.HOME, label: 'Home', icon: Home, color: '#3B82F6' },
        { key: GROUP_TYPES.DINING, label: 'Dining', icon: Coffee, color: '#F59E0B' },
        { key: GROUP_TYPES.BUSINESS, label: 'Business', icon: Briefcase, color: '#10B981' },
        { key: GROUP_TYPES.CUSTOM, label: 'Custom', icon: Tag, color: '#8B5CF6' }
    ];

    const handleAddMember = () => {
        const clean = memberInput.trim();
        if (!clean) return;
        if (members.includes(clean)) {
            Alert.alert('Duplicate Member', `'${clean}' is already in the member list.`);
            return;
        }
        setMembers([...members, clean]);
        setMemberInput('');
    };

    const handleRemoveMember = (indexToRemove) => {
        setMembers(members.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Group Name Required', 'Please provide a name for this group.');
            return;
        }

        onCreateGroup({
            name: name.trim(),
            description: description.trim(),
            type,
            memberNames: members
        });

        // Reset
        setName('');
        setDescription('');
        setType(GROUP_TYPES.TRIP);
        setMembers(['Ravi', 'Priya']);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Create New Group</Text>
                            <Text style={styles.subtitle}>Track shared expenses & settlements</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#94A3B8" />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                        {/* Type Selection */}
                        <Text style={styles.sectionLabel}>Group Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                            {TYPE_OPTIONS.map(opt => {
                                const Icon = opt.icon;
                                const isSelected = type === opt.key;
                                return (
                                    <Pressable
                                        key={opt.key}
                                        style={[
                                            styles.typePill,
                                            isSelected && { backgroundColor: opt.color, borderColor: opt.color }
                                        ]}
                                        onPress={() => setType(opt.key)}
                                    >
                                        <Icon size={16} color={isSelected ? '#FFFFFF' : opt.color} />
                                        <Text style={[styles.typeText, isSelected && styles.typeTextSelected]}>
                                            {opt.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {/* Name Input */}
                        <Text style={styles.sectionLabel}>Group Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Goa Vacation, Flat 402, Team Lunch"
                            placeholderTextColor="#64748B"
                            value={name}
                            onChangeText={setName}
                        />

                        {/* Description */}
                        <Text style={styles.sectionLabel}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                            placeholder="Notes or trip details..."
                            placeholderTextColor="#64748B"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />

                        {/* Members Section */}
                        <Text style={styles.sectionLabel}>Members (You + Friends)</Text>
                        <View style={styles.memberInputRow}>
                            <TextInput
                                style={[styles.input, styles.memberTextInput]}
                                placeholder="Add friend name..."
                                placeholderTextColor="#64748B"
                                value={memberInput}
                                onChangeText={setMemberInput}
                                onSubmitEditing={handleAddMember}
                            />
                            <Pressable style={styles.addMemberBtn} onPress={handleAddMember}>
                                <Plus size={18} color="#FFF" />
                            </Pressable>
                        </View>

                        {/* Current Member Chips */}
                        <View style={styles.memberChipsContainer}>
                            <View style={[styles.memberChip, styles.youChip]}>
                                <Text style={styles.youChipText}>You (Owner)</Text>
                            </View>
                            {members.map((m, idx) => (
                                <View key={idx} style={styles.memberChip}>
                                    <Text style={styles.memberChipText}>{m}</Text>
                                    <Pressable onPress={() => handleRemoveMember(idx)} style={styles.chipRemoveBtn}>
                                        <X size={14} color="#94A3B8" />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Footer Save */}
                    <View style={styles.footer}>
                        <Pressable style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable style={styles.submitBtn} onPress={handleSave}>
                            <Text style={styles.submitText}>Create Group</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        justifyContent: 'flex-end'
    },
    modalContainer: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: '#334155'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    subtitle: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 2
    },
    closeBtn: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: '#0F172A'
    },
    scrollArea: {
        maxHeight: 450
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#CBD5E1',
        marginBottom: 8,
        marginTop: 12
    },
    typeRow: {
        flexDirection: 'row',
        marginBottom: 8
    },
    typePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#0F172A',
        marginRight: 8,
        gap: 6
    },
    typeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8'
    },
    typeTextSelected: {
        color: '#FFFFFF'
    },
    input: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 12,
        color: '#F8FAFC',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#334155'
    },
    memberInputRow: {
        flexDirection: 'row',
        gap: 8
    },
    memberTextInput: {
        flex: 1
    },
    addMemberBtn: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center'
    },
    memberChipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12
    },
    memberChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155'
    },
    youChip: {
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)'
    },
    youChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#60A5FA'
    },
    memberChipText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#E2E8F0',
        marginRight: 6
    },
    chipRemoveBtn: {
        padding: 2
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155'
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#475569',
        alignItems: 'center'
    },
    cancelText: {
        color: '#94A3B8',
        fontWeight: '600',
        fontSize: 14
    },
    submitBtn: {
        flex: 2,
        backgroundColor: '#F43F5E',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    submitText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14
    }
});
