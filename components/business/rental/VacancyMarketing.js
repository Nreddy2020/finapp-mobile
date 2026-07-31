import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, Share, Image } from 'react-native';
import { X, Megaphone, CheckCircle2 } from 'lucide-react-native';

export default function VacancyMarketing({ visible, onClose }) {
    const [adDetails, setAdDetails] = useState({
        headline: 'Luxurious 2BHK in City Center',
        rent: '25000',
        platform: 'whatsapp'
    });

    const postAd = async () => {
        const adText = `
🏠 *FOR RENT: ${adDetails.headline}*

✨ Features:
- Spacious 2BHK Unit
- Modern Interiors
- 24/7 Security & Power Backup
- Prime Location

💰 Rent: ₹${adDetails.rent}/month
📞 Contact Owner: 9876543210

#Rental #Apartment #RealEstate
        `.trim();

        try {
            await Share.share({
                message: adText,
                title: 'Vacancy Ad'
            });
            onClose();
        } catch (error) {
            alert('Ad copied!');
            onClose();
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Megaphone size={24} color="#10B981" />
                            <Text style={styles.title}>Vacancy Marketing</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Create and post listings to find tenants faster.</Text>

                    <View style={styles.previewCard}>
                        {/* Placeholder for an image upload UI */}
                        <View style={styles.imagePlaceholder}>
                            <Text style={styles.imageText}>🖼️ Property Image</Text>
                        </View>
                        <TextInput
                            style={styles.headlineInput}
                            value={adDetails.headline}
                            onChangeText={t => setAdDetails({ ...adDetails, headline: t })}
                            placeholder="Ad Headline"
                            placeholderTextColor="#52525B"
                        />
                        <View style={styles.priceTag}>
                            <Text style={styles.priceLabel}>MONTHLY RENT</Text>
                            <TextInput
                                style={styles.priceInput}
                                value={adDetails.rent}
                                onChangeText={t => setAdDetails({ ...adDetails, rent: t })}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Select Platform</Text>
                    <View style={styles.platforms}>
                        <TouchableOpacity style={[styles.platformBtn, styles.activePlatform]}>
                            <Text style={[styles.platformText, { color: '#FFF' }]}>WhatsApp Status</Text>
                            <CheckCircle2 size={16} color="#10B981" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.platformBtn}>
                            <Text style={styles.platformText}>Facebook Marketplace</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.platformBtn}>
                            <Text style={styles.platformText}>Local Groups</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.postBtn} onPress={postAd}>
                        <Text style={styles.postBtnText}>Post Listing Now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    previewCard: { backgroundColor: '#27272A', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#FFFFFF10' },
    imagePlaceholder: { height: 120, backgroundColor: '#18181B', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    imageText: { color: '#52525B', fontSize: 14, fontWeight: '600' },
    headlineInput: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 12 },
    priceTag: { backgroundColor: '#10B98120', alignSelf: 'flex-start', padding: 8, borderRadius: 8 },
    priceLabel: { color: '#10B981', fontSize: 10, fontWeight: '700', marginBottom: 2 },
    priceInput: { color: '#10B981', fontSize: 16, fontWeight: '700', padding: 0 },
    label: { color: '#71717A', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
    platforms: { gap: 8, marginBottom: 24 },
    platformBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27272A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF08' },
    activePlatform: { borderColor: '#10B98150', backgroundColor: '#10B98110' },
    platformText: { color: '#A1A1AA', fontWeight: '600' },
    postBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 16, alignItems: 'center' },
    postBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});
