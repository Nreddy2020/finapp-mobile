import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Shield, FileText, Lock, Eye, Share2 } from 'lucide-react-native';

export default function FamilyVault({ visible, onClose }) {
    const [docs, setDocs] = useState([
        { id: 1, name: 'Life Insurance Policy', type: 'PDF', start: '2023', secure: true },
        { id: 2, name: 'Property Deed - Home', type: 'Scan', start: '2020', secure: true },
        { id: 3, name: 'Last Will & Testament', type: 'Legal', start: '2024', secure: true },
    ]);

    const [unlocked, setUnlocked] = useState(null);

    const handleAccess = (id) => {
        // Simulate biometric auth
        if (unlocked === id) {
            setUnlocked(null);
        } else {
            setUnlocked(id);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Shield size={24} color="#8B5CF6" />
                            <Text style={styles.title}>Family Vault</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Secure storage for critical family documents.</Text>

                    <ScrollView style={styles.list}>
                        {docs.map((doc) => (
                            <View key={doc.id} style={styles.card}>
                                <View style={styles.cardLeft}>
                                    <View style={styles.iconBox}>
                                        <FileText size={20} color="#8B5CF6" />
                                    </View>
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={styles.docName}>{doc.name}</Text>
                                            {doc.secure && <Lock size={12} color="#A1A1AA" />}
                                        </View>
                                        <Text style={styles.docMeta}>{doc.type} • Added {doc.start}</Text>
                                    </View>
                                </View>

                                <View style={styles.actions}>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleAccess(doc.id)}>
                                        {unlocked === doc.id ? (
                                            <Eye size={18} color="#10B981" />
                                        ) : (
                                            <Lock size={18} color="#A1A1AA" />
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconBtn}>
                                        <Share2 size={18} color="#A1A1AA" />
                                    </TouchableOpacity>
                                </View>

                                {unlocked === doc.id && (
                                    <View style={styles.unlockedBanner}>
                                        <Text style={styles.unlockedText}>🔓 Access Granted: Decrypting...</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    list: { gap: 12 },
    card: { backgroundColor: '#27272A', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF08' },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#8B5CF620', alignItems: 'center', justifyContent: 'center' },
    docName: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    docMeta: { color: '#A1A1AA', fontSize: 12 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    iconBtn: { padding: 8, backgroundColor: '#3F3F46', borderRadius: 8 },
    unlockedBanner: { marginTop: 12, backgroundColor: '#10B98110', padding: 8, borderRadius: 8, alignItems: 'center' },
    unlockedText: { color: '#10B981', fontSize: 12, fontWeight: '600' }
});
