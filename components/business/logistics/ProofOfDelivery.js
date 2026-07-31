import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { X, CheckSquare, Camera, PenTool, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProofOfDelivery({ visible, onClose }) {
    const [signed, setSigned] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleConfirm = () => {
        if (!signed) return;
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            onClose();
        }, 1500);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <CheckSquare size={24} color="#10B981" />
                            <Text style={styles.title}>Proof of Delivery</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Digital signature and verification for Shipment #TRK-02.</Text>

                    <View style={styles.box}>
                        <View style={styles.signatureArea}>
                            <TouchableOpacity style={styles.signPad} onPress={() => setSigned(true)}>
                                {signed ? (
                                    <Text style={styles.signature}>Rajesh Kumar</Text>
                                ) : (
                                    <View style={{ alignItems: 'center', gap: 8 }}>
                                        <PenTool size={24} color="#52525B" />
                                        <Text style={styles.placeholder}>Tap to Sign</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.photoBtn}>
                            <Camera size={20} color="#FFF" />
                            <Text style={styles.photoText}>Capture Photo</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={!signed}>
                        <LinearGradient
                            colors={signed ? loading ? ['#059669', '#059669'] : ['#10B981', '#059669'] : ['#27272A', '#27272A']}
                            style={styles.btnGradient}
                        >
                            {loading ? (
                                <Text style={styles.btnText}>Syncing POD...</Text>
                            ) : (
                                <>
                                    <CheckCircle2 size={20} color={signed ? '#FFF' : '#52525B'} />
                                    <Text style={[styles.btnText, { color: signed ? '#FFF' : '#52525B' }]}>Confirm Delivery</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    box: { backgroundColor: '#27272A', borderRadius: 16, padding: 16, gap: 16, marginBottom: 24, borderWidth: 1, borderColor: '#FFFFFF08' },
    signatureArea: { height: 160, backgroundColor: '#18181B', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#52525B', overflow: 'hidden' },
    signPad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    signature: { fontFamily: 'serif', fontSize: 32, fontStyle: 'italic', color: '#10B981' },
    placeholder: { color: '#52525B', fontSize: 14, fontWeight: '600' },
    photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, backgroundColor: '#3F3F46', borderRadius: 12 },
    photoText: { color: '#FFF', fontWeight: '700' },
    confirmBtn: { height: 56, borderRadius: 16, overflow: 'hidden' },
    btnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    btnText: { fontWeight: '700', fontSize: 16 }
});
