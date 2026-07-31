import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Download, Trash2, ArrowLeft, Shield, CheckCircle, ExternalLink, FileText } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { ComplianceService } from '../../services/compliance';
import { resetKeys } from '../../services/crypto';
import { AuthService } from '../../services/auth';

export default function PrivacyScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    const handleExport = async () => {
        setLoading(true);
        try {
            const result = await ComplianceService.exportUserData();
            if (result.success) {
                Alert.alert('Success', 'Your data is ready for export.');
            } else {
                Alert.alert('Error', result.error || 'Failed to export data');
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'DELETE') {
            Alert.alert('Confirmation Failed', 'Please type DELETE in all caps to confirm.');
            return;
        }

        setLoading(true);
        try {
            // 1. Wipe Data
            const result = await ComplianceService.deleteUserAccount();
            if (!result.success) throw new Error(result.error);

            // 2. Wipe Keys
            await resetKeys();

            // 3. Force Logout / Navigate
            // Logic handled in service mostly, but ensuring router state
            Alert.alert('Account Deleted', 'Your data has been permanently removed.', [
                {
                    text: 'OK',
                    onPress: () => router.replace('/login')
                }
            ]);
        } catch (error) {
            Alert.alert('Critical Error', 'Could not fully delete account. Please reinstall the app manually.');
        } finally {
            setLoading(false);
            setShowDeleteModal(false);
        }
    };

    return (
        <AnimatedScreen style={styles.container}>
            <LinearGradient colors={['#09090B', '#000000']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle}>Data & Privacy</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusIcon}>
                        <Shield size={32} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.statusTitle}>Bank-Grade Encryption</Text>
                        <Text style={styles.statusDesc}>Your data is encrypted with AES-256-GCM. We cannot read your financial details.</Text>
                    </View>
                </View>

                {/* Section: Your Rights */}
                <Text style={styles.sectionTitle}>YOUR DATA RIGHTS (GDPR / RBI)</Text>

                {/* Export Data */}
                <Pressable style={styles.actionCard} onPress={handleExport} disabled={loading}>
                    <View style={[styles.iconBox, { backgroundColor: '#3B82F615' }]}>
                        <Download size={24} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>Export My Data</Text>
                        <Text style={styles.actionDesc}>Download a copy of all your data in JSON format.</Text>
                    </View>
                </Pressable>

                {/* Privacy Policy */}
                <Pressable style={styles.actionCard} onPress={() => Alert.alert('Privacy Policy', 'Opening hosted policy...')}>
                    <View style={[styles.iconBox, { backgroundColor: '#F59E0B15' }]}>
                        <FileText size={24} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>Privacy Policy</Text>
                        <Text style={styles.actionDesc}>Read how we handle your data.</Text>
                    </View>
                    <ExternalLink size={16} color="#52525B" />
                </Pressable>

                {/* Terms of Service */}
                <Pressable style={styles.actionCard} onPress={() => Alert.alert('Terms', 'Opening terms of service...')}>
                    <View style={[styles.iconBox, { backgroundColor: '#8B5CF615' }]}>
                        <CheckCircle size={24} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>Terms of Service</Text>
                        <Text style={styles.actionDesc}>User agreement and legal terms.</Text>
                    </View>
                    <ExternalLink size={16} color="#52525B" />
                </Pressable>

                {/* Danger Zone */}
                <Text style={[styles.sectionTitle, { color: '#EF4444', marginTop: 32 }]}>DANGER ZONE</Text>
                <Pressable style={[styles.actionCard, { borderColor: '#EF444430', backgroundColor: '#EF444405' }]} onPress={() => setShowDeleteModal(true)}>
                    <View style={[styles.iconBox, { backgroundColor: '#EF444415' }]}>
                        <Trash2 size={24} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.actionTitle, { color: '#EF4444' }]}>Delete Account</Text>
                        <Text style={styles.actionDesc}>Permanently remove all data and keys. This cannot be undone.</Text>
                    </View>
                </Pressable>

            </ScrollView>

            {/* Delete Confirmation Modal */}
            <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Trash2 size={48} color="#EF4444" style={{ alignSelf: 'center', marginBottom: 16 }} />
                        <Text style={styles.modalTitle}>Delete Everything?</Text>
                        <Text style={styles.modalText}>
                            This will permanently delete your local data, encryption keys, and settings.
                            {"\n\n"}
                            This action is <Text style={{ fontWeight: 'bold', color: '#EF4444' }}>IRREVERSIBLE</Text>.
                        </Text>

                        <Text style={styles.modalLabel}>Type "DELETE" to confirm:</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="DELETE"
                            placeholderTextColor="#52525B"
                            value={deleteConfirmation}
                            onChangeText={setDeleteConfirmation}
                            autoCapitalize="characters"
                        />

                        <Pressable
                            style={[styles.deleteButton, deleteConfirmation !== 'DELETE' && styles.disabledButton]}
                            onPress={handleDeleteAccount}
                            disabled={deleteConfirmation !== 'DELETE'}
                        >
                            <Text style={styles.deleteButtonText}>{loading ? 'Deleting...' : 'Permanently Delete'}</Text>
                        </Pressable>

                        <Pressable style={styles.cancelButton} onPress={() => setShowDeleteModal(false)}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#09090B', borderBottomWidth: 1, borderBottomColor: '#27272A' },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
    content: { padding: 20 },

    statusCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#18181B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#10B98130', marginBottom: 32 },
    statusIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10B98115', justifyContent: 'center', alignItems: 'center' },
    statusTitle: { fontSize: 16, fontWeight: 'bold', color: '#10B981', marginBottom: 4 },
    statusDesc: { fontSize: 13, color: '#A1A1AA', lineHeight: 20 },

    sectionTitle: { fontSize: 12, fontWeight: '700', color: '#71717A', marginBottom: 16, letterSpacing: 1.5, marginLeft: 4 },

    actionCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#18181B', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#27272A' },
    iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    actionTitle: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 2 },
    actionDesc: { fontSize: 13, color: '#71717A' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#EF444450' },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginBottom: 12 },
    modalText: { fontSize: 14, color: '#A1A1AA', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    modalLabel: { fontSize: 12, color: '#FFF', marginBottom: 8, fontWeight: '700' },
    modalInput: { backgroundColor: '#000', borderWidth: 1, borderColor: '#27272A', borderRadius: 12, padding: 16, color: '#FFF', fontSize: 16, marginBottom: 24, textAlign: 'center', fontWeight: 'bold' },

    deleteButton: { backgroundColor: '#EF4444', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
    disabledButton: { opacity: 0.5 },
    deleteButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    cancelButton: { padding: 16, alignItems: 'center' },
    cancelButtonText: { color: '#A1A1AA', fontWeight: '600', fontSize: 16 }
});
