import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    ScrollView,
    TextInput,
    Switch,
    Alert
} from 'react-native';
import { X, UserPlus, Save, Lock } from 'lucide-react-native';
import {
    FamilyRole,
    CircleCategory,
    PrivacyLevel,
    calculateAge,
    maskSensitiveIdentifier
} from '../../services/family/familyContracts';

const ROLES = [
    FamilyRole.HEAD,
    FamilyRole.SPOUSE,
    FamilyRole.CHILD,
    FamilyRole.PARENT,
    FamilyRole.GRANDPARENT,
    FamilyRole.SIBLING,
    FamilyRole.MEMBER,
    FamilyRole.DEPENDENT,
    FamilyRole.GUARDIAN,
    FamilyRole.DOCTOR,
    FamilyRole.CAREGIVER,
    FamilyRole.ADVISOR
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function AddEditPersonModal({
    visible = false,
    person = null, // If provided, edit mode; else create mode
    households = [],
    activeHousehold = null,
    onClose = () => {},
    onSave = () => {}
}) {
    const isEdit = Boolean(person);

    const [name, setName] = useState('');
    const [preferredName, setPreferredName] = useState('');
    const [role, setRole] = useState(FamilyRole.MEMBER);
    const [circleCategory, setCircleCategory] = useState(CircleCategory.FAMILY);
    const [householdId, setHouseholdId] = useState('household_primary');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('UNSPECIFIED');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [isSharedAddress, setIsSharedAddress] = useState(true);
    const [bloodGroup, setBloodGroup] = useState('');
    const [isEmergencyContact, setIsEmergencyContact] = useState(false);
    const [emergencyPriority, setEmergencyPriority] = useState(1);
    const [isNominee, setIsNominee] = useState(false);
    const [isGuardian, setIsGuardian] = useState(false);
    const [isDependent, setIsDependent] = useState(false);
    const [privacyVisibility, setPrivacyVisibility] = useState(PrivacyLevel.FAMILY_ONLY);
    const [nationalIdInput, setNationalIdInput] = useState('');

    useEffect(() => {
        if (person) {
            setName(person.name || person.core?.name || '');
            setPreferredName(person.preferredName || person.core?.preferredName || '');
            setRole(person.role || person.familyRole || person.core?.role || FamilyRole.MEMBER);
            setCircleCategory(person.circleCategory || person.relationshipCategory || person.core?.circleCategory || CircleCategory.FAMILY);
            setHouseholdId(person.householdId || person.core?.householdId || activeHousehold?.id || 'household_primary');
            setDob(person.core?.dateOfBirth || person.dateOfBirth || '');
            setGender(person.core?.gender || person.gender || 'UNSPECIFIED');
            setPhone(person.contact?.phone || '');
            setEmail(person.contact?.email || '');
            setAddress(person.contact?.address || '');
            setIsSharedAddress(Boolean(person.contact?.isSharedAddress));
            setBloodGroup(person.profile?.bloodGroup || person.medicalProfile?.bloodGroup || '');
            setIsEmergencyContact(Boolean(person.emergencyProfile?.isEmergencyContact || person.isEmergencyContact));
            setEmergencyPriority(person.emergencyProfile?.priorityOrder || 1);
            setIsNominee(Boolean(person.legalTags?.isNominee || person.role === FamilyRole.NOMINEE));
            setIsGuardian(Boolean(person.isGuardian || person.core?.isGuardian || person.role === FamilyRole.GUARDIAN));
            setIsDependent(Boolean(person.isDependent || person.core?.isDependent || person.role === FamilyRole.DEPENDENT));
            setPrivacyVisibility(person.privacy?.visibility || PrivacyLevel.FAMILY_ONLY);
            setNationalIdInput(person.nationalIdMasked || person.core?.nationalIdMasked || '');
        } else {
            setName('');
            setPreferredName('');
            setRole(FamilyRole.MEMBER);
            setCircleCategory(CircleCategory.FAMILY);
            setHouseholdId(activeHousehold?.id || 'household_primary');
            setDob('');
            setGender('UNSPECIFIED');
            setPhone('');
            setEmail('');
            setAddress('');
            setIsSharedAddress(true);
            setBloodGroup('');
            setIsEmergencyContact(false);
            setEmergencyPriority(1);
            setIsNominee(false);
            setIsGuardian(false);
            setIsDependent(false);
            setPrivacyVisibility(PrivacyLevel.FAMILY_ONLY);
            setNationalIdInput('');
        }
    }, [person, visible, activeHousehold]);

    if (!visible) return null;

    const age = calculateAge(dob);

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Required Field', 'Please enter a legal name for this family member.');
            return;
        }

        // Validate national ID: reject oversized
        if (nationalIdInput.trim() && nationalIdInput.trim().length > 30) {
            Alert.alert('Invalid Identifier', 'Identifier exceeds maximum allowed length.');
            return;
        }

        const safeMasked = nationalIdInput.trim() ? maskSensitiveIdentifier(nationalIdInput.trim()) : null;

        const payload = {
            name: name.trim(),
            preferredName: preferredName.trim(),
            role,
            familyRole: role,
            circleCategory,
            relationshipCategory: circleCategory,
            householdId,
            gender,
            dateOfBirth: dob.trim() || null,
            nationalIdMasked: safeMasked,
            isDependent,
            isGuardian,
            contact: {
                phone: phone.trim(),
                email: email.trim(),
                address: address.trim(),
                isSharedAddress
            },
            profile: {
                bloodGroup: bloodGroup.trim().toUpperCase()
            },
            medicalProfile: {
                bloodGroup: bloodGroup.trim().toUpperCase()
            },
            emergencyProfile: {
                isEmergencyContact,
                priorityOrder: Number(emergencyPriority) || 1
            },
            legalTags: {
                isNominee,
                isGuardian
            },
            privacy: {
                visibility: privacyVisibility
            }
        };

        if (isEdit) {
            payload.id = person.core?.id || person.id;
        }

        onSave(payload, isEdit);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <UserPlus size={18} color="#3B82F6" />
                            <Text style={styles.title}>{isEdit ? 'Edit Family Member' : 'Add Family Member'}</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={18} color="#FFFFFF" />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
                        {/* Section: Identity */}
                        <Text style={styles.fieldSectionHeader}>1. IDENTITY & DEMOGRAPHICS</Text>
                        <Text style={styles.label}>Legal Full Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Nagarjuna Rao"
                            placeholderTextColor="#52525B"
                        />

                        <Text style={styles.label}>Preferred Name / Nickname</Text>
                        <TextInput
                            style={styles.input}
                            value={preferredName}
                            onChangeText={setPreferredName}
                            placeholder="e.g. Naga"
                            placeholderTextColor="#52525B"
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={dob}
                                    onChangeText={setDob}
                                    placeholder="1984-04-12"
                                    placeholderTextColor="#52525B"
                                />
                                {age !== null && (
                                    <Text style={styles.helperText}>Calculated age: {age} years</Text>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Gender</Text>
                                <View style={styles.genderRow}>
                                    {['MALE', 'FEMALE', 'OTHER'].map(g => (
                                        <Pressable
                                            key={g}
                                            style={[styles.genderChip, gender === g && styles.genderChipActive]}
                                            onPress={() => setGender(g)}
                                        >
                                            <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>
                                                {g === 'MALE' ? 'M' : g === 'FEMALE' ? 'F' : 'O'}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Section: Role & Category */}
                        <Text style={styles.fieldSectionHeader}>2. ROLE & CIRCLE</Text>
                        <Text style={styles.label}>Circle Category</Text>
                        <View style={styles.categoryRow}>
                            {[
                                { id: CircleCategory.FAMILY, label: 'Family' },
                                { id: CircleCategory.FRIENDS, label: 'Friends' },
                                { id: CircleCategory.OTHERS, label: 'Care & Advisors' }
                            ].map(cat => (
                                <Pressable
                                    key={cat.id}
                                    style={[styles.catPill, circleCategory === cat.id && styles.catPillActive]}
                                    onPress={() => setCircleCategory(cat.id)}
                                >
                                    <Text style={[styles.catPillText, circleCategory === cat.id && styles.catPillTextActive]}>
                                        {cat.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.label}>Functional Role</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rolesScroll}>
                            {ROLES.map(r => (
                                <Pressable
                                    key={r}
                                    style={[styles.roleChip, role === r && styles.roleChipActive]}
                                    onPress={() => setRole(r)}
                                >
                                    <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                                        {r}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* Section: Household */}
                        <Text style={styles.fieldSectionHeader}>3. HOUSEHOLD RESIDENCE</Text>
                        <Text style={styles.label}>Assign to Household</Text>
                        <View style={styles.hhPickerRow}>
                            {(households.length > 0 ? households : [{ id: 'household_primary', name: 'Primary Household' }]).map(h => (
                                <Pressable
                                    key={h.id}
                                    style={[styles.hhChip, householdId === h.id && styles.hhChipActive]}
                                    onPress={() => setHouseholdId(h.id)}
                                >
                                    <Text style={[styles.hhChipText, householdId === h.id && styles.hhChipTextActive]}>
                                        {h.name}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Section: Contact */}
                        <Text style={styles.fieldSectionHeader}>4. CONTACT DETAILS</Text>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+91 98765 43210"
                            placeholderTextColor="#52525B"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="name@example.com"
                            placeholderTextColor="#52525B"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Residence Address</Text>
                        <TextInput
                            style={styles.input}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Flat / House, Street, City"
                            placeholderTextColor="#52525B"
                        />

                        {/* Section: Medical & Emergency */}
                        <Text style={styles.fieldSectionHeader}>5. MEDICAL & EMERGENCY</Text>
                        <Text style={styles.label}>Blood Group</Text>
                        <View style={styles.bloodGrid}>
                            {BLOOD_GROUPS.map(bg => (
                                <Pressable
                                    key={bg}
                                    style={[styles.bloodChip, bloodGroup === bg && styles.bloodChipActive]}
                                    onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                                >
                                    <Text style={[styles.bloodChipText, bloodGroup === bg && styles.bloodChipTextActive]}>
                                        {bg}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.switchLabel}>Designate as Emergency Contact</Text>
                                <Text style={styles.switchSub}>Appears on SOS drawer and speed dials</Text>
                            </View>
                            <Switch
                                value={isEmergencyContact}
                                onValueChange={setIsEmergencyContact}
                                trackColor={{ false: '#27272A', true: '#EF4444' }}
                            />
                        </View>

                        {isEmergencyContact && (
                            <View style={{ marginTop: 8 }}>
                                <Text style={styles.label}>Emergency Contact Priority</Text>
                                <View style={styles.priorityRow}>
                                    {[1, 2, 3, 4, 5].map(p => (
                                        <Pressable
                                            key={p}
                                            style={[styles.priorityChip, emergencyPriority === p && styles.priorityChipActive]}
                                            onPress={() => setEmergencyPriority(p)}
                                        >
                                            <Text style={[styles.priorityChipText, emergencyPriority === p && styles.priorityChipTextActive]}>
                                                #{p}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Section: Governance Tags */}
                        <Text style={styles.fieldSectionHeader}>6. GOVERNANCE & LEGAL TAGS</Text>
                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.switchLabel}>Policy Nominee</Text>
                                <Text style={styles.switchSub}>Tagged as insurance or financial nominee</Text>
                            </View>
                            <Switch
                                value={isNominee}
                                onValueChange={setIsNominee}
                                trackColor={{ false: '#27272A', true: '#3B82F6' }}
                            />
                        </View>

                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.switchLabel}>Legal Guardian</Text>
                                <Text style={styles.switchSub}>Custody or legal guardianship authority</Text>
                            </View>
                            <Switch
                                value={isGuardian}
                                onValueChange={setIsGuardian}
                                trackColor={{ false: '#27272A', true: '#3B82F6' }}
                            />
                        </View>

                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.switchLabel}>Financial Dependent</Text>
                                <Text style={styles.switchSub}>Receives living support or allowance</Text>
                            </View>
                            <Switch
                                value={isDependent}
                                onValueChange={setIsDependent}
                                trackColor={{ false: '#27272A', true: '#3B82F6' }}
                            />
                        </View>

                        {/* Section: Privacy & Identifier */}
                        <Text style={styles.fieldSectionHeader}>7. PRIVACY & PROTECTED IDENTIFIER</Text>
                        <Text style={styles.label}>National Identifier (Masked at Input)</Text>
                        <View style={styles.protectedInputWrap}>
                            <Lock size={14} color="#10B981" />
                            <TextInput
                                style={[styles.input, { flex: 1, borderWidth: 0, marginBottom: 0 }]}
                                value={nationalIdInput}
                                onChangeText={setNationalIdInput}
                                placeholder="e.g. 1234 (last 4 digits only)"
                                placeholderTextColor="#52525B"
                            />
                        </View>
                        <Text style={styles.helperText}>Protected identifier: only masked suffix is persisted locally.</Text>

                        {/* Save Button */}
                        <Pressable style={styles.saveButton} onPress={handleSave}>
                            <Save size={16} color="#FFFFFF" />
                            <Text style={styles.saveButtonText}>{isEdit ? 'Save Changes' : 'Add to Family'}</Text>
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
        maxHeight: '92%',
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
    fieldSectionHeader: {
        color: '#3B82F6',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginTop: 14,
        marginBottom: 10
    },
    label: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6
    },
    input: {
        backgroundColor: '#121215',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FFFFFF',
        fontSize: 14,
        marginBottom: 12
    },
    helperText: {
        color: '#71717A',
        fontSize: 11,
        marginTop: -8,
        marginBottom: 12
    },
    genderRow: {
        flexDirection: 'row',
        gap: 6
    },
    genderChip: {
        flex: 1,
        backgroundColor: '#18181B',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    genderChipActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6'
    },
    genderChipText: {
        color: '#71717A',
        fontWeight: '700',
        fontSize: 12
    },
    genderChipTextActive: {
        color: '#FFFFFF'
    },
    categoryRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12
    },
    catPill: {
        flex: 1,
        backgroundColor: '#18181B',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    catPillActive: {
        backgroundColor: '#3B82F615',
        borderColor: '#3B82F6'
    },
    catPillText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '600'
    },
    catPillTextActive: {
        color: '#60A5FA',
        fontWeight: '700'
    },
    rolesScroll: {
        marginBottom: 12
    },
    roleChip: {
        backgroundColor: '#18181B',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 6,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    roleChipActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6'
    },
    roleChipText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '600'
    },
    roleChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    hhPickerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12
    },
    hhChip: {
        backgroundColor: '#18181B',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    hhChipActive: {
        backgroundColor: '#3B82F615',
        borderColor: '#3B82F6'
    },
    hhChipText: {
        color: '#71717A',
        fontSize: 12
    },
    hhChipTextActive: {
        color: '#60A5FA',
        fontWeight: '700'
    },
    bloodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12
    },
    bloodChip: {
        width: '22%',
        backgroundColor: '#18181B',
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    bloodChipActive: {
        backgroundColor: '#EF444415',
        borderColor: '#EF4444'
    },
    bloodChipText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '700'
    },
    bloodChipTextActive: {
        color: '#EF4444'
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#18181B'
    },
    switchLabel: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    switchSub: {
        color: '#71717A',
        fontSize: 11
    },
    priorityRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12
    },
    priorityChip: {
        flex: 1,
        backgroundColor: '#18181B',
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    priorityChipActive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444'
    },
    priorityChipText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '700'
    },
    priorityChipTextActive: {
        color: '#FFFFFF'
    },
    protectedInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121215',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 12
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        paddingVertical: 13,
        borderRadius: 10,
        gap: 8,
        marginTop: 20,
        marginBottom: 35
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    }
});
