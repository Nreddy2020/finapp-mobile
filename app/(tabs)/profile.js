import React from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { User, Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();

    const menuItems = [
        { icon: User, label: 'Personal Information', route: '/profile/personal' },
        { icon: Settings, label: 'App Settings', route: '/profile/settings' },
        { icon: Bell, label: 'Notifications', route: '/profile/notifications' },
        { icon: Shield, label: 'Privacy & Security', route: '/profile/privacy' },
        { icon: HelpCircle, label: 'Help & Support', route: '/profile/help' },
    ];

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 40) + 20, paddingBottom: insets.bottom + 150 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={['#4F46E5', '#8B5CF6']}
                            style={styles.avatar}
                        >
                            <Text style={styles.avatarText}>W</Text>
                        </LinearGradient>
                    </View>
                    <Text style={styles.name}>Welcome User</Text>
                    <Text style={styles.email}>user@example.com</Text>
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {menuItems.map((item, index) => (
                        <LuxuryCard
                            key={index}
                            style={styles.menuItem}
                            index={index}
                            onPress={() => { }}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: `${item.icon === User ? '#4F46E5' : item.icon === Settings ? '#10B981' : item.icon === Bell ? '#F59E0B' : item.icon === Shield ? '#EF4444' : '#8B5CF6'}15` }]}>
                                <item.icon size={20} color={item.icon === User ? '#4F46E5' : item.icon === Settings ? '#10B981' : item.icon === Bell ? '#F59E0B' : item.icon === Shield ? '#EF4444' : '#8B5CF6'} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <ChevronRight size={20} color="#71717A" strokeWidth={2.5} />
                        </LuxuryCard>
                    ))}
                </View>

                {/* Logout Button */}
                <LuxuryCard
                    style={styles.logoutButton}
                    onPress={() => { }}
                    index={menuItems.length}
                >
                    <LogOut size={20} color="#EF4444" strokeWidth={2.5} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </LuxuryCard>
            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF20',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    name: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#71717A',
        fontWeight: '500',
    },
    menuSection: {
        gap: 12,
        marginBottom: 24,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#EF444420',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#EF4444',
    },
});
