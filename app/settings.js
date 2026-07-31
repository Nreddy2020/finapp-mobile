import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Modal, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Globe, Eye, WifiOff, Lock, User, Bell, ChevronRight, Save, Mail, Phone, Moon } from 'lucide-react-native';
import { useAccessibility, LANGUAGES } from '../components/context/AccessibilityContext';
import { exportUserData } from '../services/dataExport';
import { SettingsService } from '../services/settings';
import { COLORS, SPACING, TYPOGRAPHY, SIZES } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';

export default function SettingsScreen() {
    const router = useRouter();
    const {
        language, setLanguage,
        simpleMode, setSimpleMode,
        offlineMode, setOfflineMode,
        voiceEnabled, setVoiceEnabled,
        colorBlindMode, setColorBlindMode,
        lowDataMode, setLowDataMode,
        anonymousMode, setAnonymousMode,
        hideBalance, setHideBalance,
        t
    } = useAccessibility();

    const [profile, setProfile] = useState({ name: '', email: '', phone: '', notifications: {} });
    const [editProfileVisible, setEditProfileVisible] = useState(false);
    const [tempProfile, setTempProfile] = useState({});

    // Modals
    const [showLangModal, setShowLangModal] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const data = await SettingsService.getSettings();
        setProfile(data);
    };

    const handleSaveProfile = async () => {
        const updated = await SettingsService.updateProfile(tempProfile);
        setProfile(updated);
        setEditProfileVisible(false);
        Alert.alert('Success', 'Profile updated successfully');
    };

    const openEditProfile = () => {
        setTempProfile({ ...profile });
        setEditProfileVisible(true);
    };

    const toggleNotification = async (key) => {
        const newNotifs = { ...profile.notifications, [key]: !profile.notifications[key] };
        const updated = await SettingsService.updateProfile({ notifications: newNotifs });
        setProfile(updated);
    };

    // Helper Renders
    const renderSectionHeader = (title, icon) => (
        <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
                {React.cloneElement(icon, { size: 18, color: COLORS.primary })}
            </View>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );

    const renderToggle = (label, value, onToggle, last = false) => (
        <View style={[styles.toggleRow, !last && styles.toggleBorder]}>
            <Text style={styles.toggleLabel}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: '#3F3F46', true: COLORS.primary }}
                thumbColor={value ? '#FFFFFF' : '#A1A1AA'}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor={COLORS.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>{t('settings')}</Text>
                    <Text style={styles.headerSubtitle}>Manage your profile & preferences</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 24 }}>

                {/* Profile Section */}
                <View style={styles.sectionContainer}>
                    {renderSectionHeader('Profile', <User />)}
                    <TouchableOpacity style={styles.profileCard} onPress={openEditProfile}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{profile.name ? profile.name[0] : 'U'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.profileName}>{profile.name || 'User Name'}</Text>
                            <Text style={styles.profileDetails}>{profile.email || 'No Email Set'}</Text>
                            <Text style={styles.profileDetails}>{profile.phone || 'No Phone Set'}</Text>
                        </View>
                        <ChevronRight size={20} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                </View>

                {/* Notifications */}
                <View style={styles.sectionContainer}>
                    {renderSectionHeader('Notifications', <Bell />)}
                    <View style={styles.card}>
                        {renderToggle('Push Notifications', profile.notifications?.push, () => toggleNotification('push'))}
                        {renderToggle('Email Digests', profile.notifications?.email, () => toggleNotification('email'))}
                        {renderToggle('Offer Alerts', profile.notifications?.offers, () => toggleNotification('offers'), true)}
                    </View>
                </View>

                {/* Accessibility */}
                <View style={styles.sectionContainer}>
                    {renderSectionHeader('Accessibility', <Eye />)}
                    <View style={styles.card}>
                        {renderToggle(t('simpleMode'), simpleMode, setSimpleMode)}
                        {renderToggle(t('voiceCommands'), voiceEnabled, setVoiceEnabled)}
                        {renderToggle('Color Blind Mode', colorBlindMode, setColorBlindMode, true)}
                    </View>
                </View>

                {/* Data & Privacy */}
                <View style={styles.sectionContainer}>
                    {renderSectionHeader('Data & Privacy', <Lock />)}
                    <View style={styles.card}>
                        {renderToggle(t('offlineMode'), offlineMode, setOfflineMode)}
                        {renderToggle('Hide Balance', hideBalance, setHideBalance)}
                        {renderToggle('Anonymous Mode', anonymousMode, setAnonymousMode, true)}
                    </View>
                </View>

            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal visible={editProfileVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>

                        <Text style={styles.inputLabel}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={tempProfile.name}
                            onChangeText={t => setTempProfile({ ...tempProfile, name: t })}
                            placeholder="Your Name"
                            placeholderTextColor="#666"
                        />

                        <Text style={styles.inputLabel}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            value={tempProfile.email}
                            onChangeText={t => setTempProfile({ ...tempProfile, email: t })}
                            placeholder="email@example.com"
                            placeholderTextColor="#666"
                            keyboardType="email-address"
                        />

                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            value={tempProfile.phone}
                            onChangeText={t => setTempProfile({ ...tempProfile, phone: t })}
                            placeholder="+91 99999 99999"
                            placeholderTextColor="#666"
                            keyboardType="phone-pad"
                        />

                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setEditProfileVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleSaveProfile}>
                                <Text style={styles.btnText}>Save Profile</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 24 },
    backButton: { marginRight: 16, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
    headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
    headerSubtitle: { fontSize: 12, color: COLORS.textSecondary },

    sectionContainer: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },

    card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    avatarText: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    profileName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
    profileDetails: { fontSize: 13, color: COLORS.textSecondary },

    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    toggleBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
    toggleLabel: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '500' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    inputLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 4, marginLeft: 4 },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 16 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, backgroundColor: '#333', borderRadius: 16, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 16, backgroundColor: COLORS.primary, borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
