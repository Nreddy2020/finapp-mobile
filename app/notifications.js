import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, CreditCard, AlertTriangle, CheckCircle2, Check } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationService } from '../services/notifications';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        // Ensure defaults exist
        await NotificationService.seedDefaults();
        const data = await NotificationService.getAll();
        setNotifications(data);
        setRefreshing(false);
    };

    const handleMarkAllRead = async () => {
        const updated = await NotificationService.markAllRead();
        setNotifications(updated);
    };

    const handlePress = async (id, read) => {
        if (!read) {
            const updated = await NotificationService.markAsRead(id);
            setNotifications(updated);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'alert': return AlertTriangle;
            case 'success': return CheckCircle2;
            case 'info': default: return CreditCard;
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'alert': return '#EF4444';
            case 'success': return '#10B981';
            case 'info': default: return '#6366F1';
        }
    };

    const getTimeString = (isoString) => {
        try {
            return formatDistanceToNow(new Date(isoString), { addSuffix: true });
        } catch (e) {
            return 'Just now';
        }
    };

    return (
        <AnimatedScreen style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle}>Notifications</Text>
                <Pressable onPress={handleMarkAllRead} style={styles.readAllBtn}>
                    <Check size={20} color="#6366F1" />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} tintColor="#6366F1" />}
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Bell size={48} color="#27272A" />
                        <Text style={styles.emptyText}>No new notifications</Text>
                    </View>
                ) : (
                    notifications.map((item) => {
                        const Icon = getIcon(item.type);
                        const color = getColor(item.type);

                        return (
                            <Pressable
                                key={item.id}
                                style={[styles.card, !item.read && styles.unreadCard]}
                                onPress={() => handlePress(item.id, item.read)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                                    <Icon size={20} color={color} strokeWidth={2.5} />
                                </View>
                                <View style={styles.cardContent}>
                                    <View style={styles.cardHeader}>
                                        <Text style={[styles.title, !item.read && { color: '#FFF' }]}>{item.title}</Text>
                                        <Text style={styles.time}>{getTimeString(item.time)}</Text>
                                    </View>
                                    <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                                </View>
                                {!item.read && <View style={styles.dot} />}
                            </Pressable>
                        );
                    })
                )}
            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#FFFFFF10' },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF10' },
    readAllBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', borderRadius: 20 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    scrollContent: { padding: 20 },
    card: { flexDirection: 'row', padding: 16, backgroundColor: '#18181B', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF10', alignItems: 'flex-start' },
    unreadCard: { backgroundColor: '#18181B', borderColor: '#6366F140' },
    iconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cardContent: { flex: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    title: { fontSize: 14, fontWeight: '600', color: '#E4E4E7' },
    time: { fontSize: 10, color: '#71717A' },
    message: { fontSize: 12, color: '#A1A1AA', lineHeight: 18 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1', marginLeft: 8, marginTop: 6 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, gap: 16 },
    emptyText: { fontSize: 16, color: '#52525B' }
});
