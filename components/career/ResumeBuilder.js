import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { X, FileText, Briefcase, GraduationCap, Download, Save } from 'lucide-react-native';
import { CareerService } from '../../services/career';

export default function ResumeBuilder({ visible, onClose }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (visible) loadProfile();
    }, [visible]);

    const loadProfile = async () => {
        const data = await CareerService.getResume();
        setName(data.name || '');
        setRole(data.role || '');
    };

    const handleSave = async () => {
        await CareerService.saveResume({ name, role });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <FileText size={24} color="#F59E0B" />
                            <Text style={styles.title}>Resume Builder</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Save your profile for future exports.</Text>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="John Doe" placeholderTextColor="#666" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Target Role</Text>
                            <TextInput style={styles.input} value={role} onChangeText={setRole} placeholder="Software Engineer" placeholderTextColor="#666" />
                        </View>

                        <Text style={styles.sectionHeader}>Quick Add</Text>
                        <View style={styles.row}>
                            <TouchableOpacity style={styles.chip}>
                                <Briefcase size={14} color="#FFF" />
                                <Text style={styles.chipText}>Experience</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.chip}>
                                <GraduationCap size={14} color="#FFF" />
                                <Text style={styles.chipText}>Education</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.preview}>
                        <View style={styles.page}>
                            <View style={styles.pageHeader} />
                            <View style={styles.line} />
                            <View style={styles.line} />
                            <View style={[styles.line, { width: '60%' }]} />
                            <View style={{ height: 10 }} />
                            <View style={styles.line} />
                            <View style={styles.line} />
                        </View>
                        <Text style={styles.previewText}>{name ? name : 'Your Name'}</Text>
                        <Text style={[styles.previewText, { fontSize: 8 }]}>{role ? role : 'Role'}</Text>
                    </View>

                    <TouchableOpacity style={[styles.actionBtn, saved && styles.successBtn]} onPress={handleSave}>
                        {saved ? (
                            <Text style={styles.btnText}>Profile Saved! ✓</Text>
                        ) : (
                            <>
                                <Save size={20} color="#FFF" />
                                <Text style={styles.btnText}>Save Profile</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '65%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    form: { gap: 16, marginBottom: 24 },
    inputGroup: { gap: 6 },
    label: { color: '#71717A', fontSize: 12 },
    input: { backgroundColor: '#27272A', padding: 12, borderRadius: 8, color: '#FFF', borderWidth: 1, borderColor: '#FFFFFF10' },
    sectionHeader: { color: '#A1A1AA', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
    row: { flexDirection: 'row', gap: 12 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3F3F46', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    chipText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
    preview: { flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 24, backgroundColor: '#27272A', borderRadius: 12, padding: 20 },
    page: { width: 60, height: 85, backgroundColor: '#FFF', borderRadius: 2, padding: 8, marginBottom: 8, opacity: 0.8 },
    pageHeader: { height: 8, width: 20, backgroundColor: '#000', marginBottom: 8 },
    line: { height: 2, backgroundColor: '#D4D4D8', marginBottom: 4, width: '100%' },
    previewText: { color: '#71717A', fontSize: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F59E0B', padding: 16, borderRadius: 12 },
    successBtn: { backgroundColor: '#10B981' },
    btnText: { color: '#000', fontWeight: '700' }
});
