import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, ShieldCheck, Camera, Bell } from 'lucide-react-native';
// Static import removed for fallback support
// import * as ImagePicker from 'expo-image-picker';
import { scheduleExpiryNotifications, cancelDocumentNotifications } from '../../services/notifications';

export default function AddDocumentModal({ visible, onClose, onAdd, editMode = false, initialData = null }) {
    const [name, setName] = useState(initialData?.item || '');
    const [expiryDate, setExpiryDate] = useState(initialData?.expiry_date || ''); // Simple text for now
    const [category, setCategory] = useState(initialData?.category || 'Personal');
    const [imageUri, setImageUri] = useState(initialData?.image || null);
    const [notify, setNotify] = useState(true);

    const pickImage = async () => {
        try {
            const ImagePicker = await import('expo-image-picker').catch(() => null);

            if (!ImagePicker) {
                Alert.alert(
                    'Package Required',
                    'Please install expo-image-picker to upload photos:\n\nnpm install expo-image-picker',
                    [{ text: 'OK' }]
                );
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            console.log('ImagePicker error:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSave = async () => {
        if (!name || !expiryDate) return;

        // Calculate days left (mock logic if date format is simple YYYY-MM-DD or similar)
        // For robustness, let's assume user enters YYYY-MM-DD
        const target = new Date(expiryDate);
        const now = new Date();
        const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

        if (editMode && initialData) {
            // Update existing document
            const updatedItem = {
                ...initialData,
                item: name,
                expiry_date: expiryDate,
                days_left: isNaN(diff) ? 30 : diff,
                category,
                image: imageUri
            };

            // Schedule notifications if enabled
            if (notify && diff > 0) {
                await scheduleExpiryNotifications(name, diff, updatedItem.id);
            } else if (!notify) {
                // Cancel notifications if user disabled them
                await cancelDocumentNotifications(updatedItem.id);
            }

            onAdd(updatedItem);
        } else {
            // Create new document
            const newItem = {
                id: Date.now().toString(),
                item: name,
                expiry_date: expiryDate,
                days_left: isNaN(diff) ? 30 : diff, // Fallback
                category,
                members: ['You'], // Default family sync mock
                auto_renew: false,
                image: imageUri
            };

            // Schedule notifications if enabled
            if (notify && diff > 0) {
                await scheduleExpiryNotifications(name, diff, newItem.id);
            }

            onAdd(newItem);
        }

        setName('');
        setExpiryDate('');
        setImageUri(null);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{editMode ? 'Edit Document' : 'New Document'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Document Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Passport, Insurance"
                                placeholderTextColor="#52525B"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Expiry Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="2026-12-31"
                                placeholderTextColor="#52525B"
                                value={expiryDate}
                                onChangeText={setExpiryDate}
                            />
                        </View>

                        <Text style={styles.label}>Category</Text>
                        <View style={styles.categoryRow}>
                            {['Personal', 'Vehicle', 'Home', 'Work'].map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.catBtn, category === cat && styles.catBtnActive]}
                                    onPress={() => setCategory(cat)}
                                >
                                    <Text style={[styles.catText, category === cat && { color: '#FFF' }]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { marginTop: 20 }]}>Attachments & Alerts</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity style={styles.actionBtn} onPress={pickImage}>
                                <Camera size={20} color={imageUri ? '#10B981' : '#A1A1AA'} />
                                <Text style={styles.actionText}>{imageUri ? 'Image Added' : 'Add Photo'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.actionBtn, notify && { borderColor: '#F59E0B' }]} onPress={() => setNotify(!notify)}>
                                <Bell size={20} color={notify ? '#F59E0B' : '#A1A1AA'} />
                                <Text style={[styles.actionText, notify && { color: '#F59E0B' }]}>Remind Me</Text>
                            </TouchableOpacity>
                        </View>
                        {imageUri && <Image source={{ uri: imageUri }} style={{ width: '100%', height: 150, borderRadius: 12, marginTop: 12 }} />}
                    </ScrollView>

                    <TouchableOpacity style={styles.createBtn} onPress={handleSave}>
                        <ShieldCheck size={20} color="#FFF" />
                        <Text style={styles.createBtnText}>Secure Document</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#18181B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: '#FFFFFF10' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    closeBtn: { padding: 8, backgroundColor: '#27272A', borderRadius: 12 },
    form: { marginBottom: 24 },
    inputGroup: { marginBottom: 16 },
    label: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
    input: { backgroundColor: '#000', borderWidth: 1, borderColor: '#3F3F46', borderRadius: 12, padding: 16, color: '#FFF', fontSize: 16 },
    categoryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    catBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#FFFFFF10' },
    catBtnActive: { backgroundColor: '#06B6D4', borderColor: '#06B6D4' },
    catText: { color: '#A1A1AA', fontWeight: '600', fontSize: 13 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#FFFFFF10' },
    actionText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
    createBtn: { backgroundColor: '#06B6D4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 12 },
    createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});
