import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Dimensions } from 'react-native';
import { X, TrendingDown, Receipt, AlertTriangle, Calendar } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function NotificationCenterModal({ visible, onClose, recentExpenses = [], upcomingBills = [], alerts = [] }) {
    const [activeTab, setActiveTab] = useState('activity');

    const tabs = [
        { id: 'activity', label: 'Activity', count: recentExpenses.length },
        { id: 'bills', label: 'Bills', count: upcomingBills.length },
        { id: 'alerts', label: 'Alerts', count: alerts.length }
    ];

    const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <LinearGradient
                    colors={['#000000', '#0a0a0a', '#121212']}
                    style={styles.modalContent}
                >
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Notifications</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#FFF" />
                        </Pressable>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsContainer}>
                        {tabs.map(tab => (
                            <Pressable
                                key={tab.id}
                                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                                onPress={() => setActiveTab(tab.id)}
                            >
                                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                                    {tab.label}
                                </Text>
                                {tab.count > 0 && (
                                    <View style={styles.tabBadge}>
                                        <Text style={styles.tabBadgeText}>{tab.count}</Text>
                                    </View>
                                )}
                            </Pressable>
                        ))}
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                        {activeTab === 'activity' && (
                            <View style={styles.contentContainer}>
                                {recentExpenses.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <TrendingDown size={48} color="#333" />
                                        <Text style={styles.emptyText}>No recent activity</Text>
                                    </View>
                                ) : (
                                    recentExpenses.map((item, idx) => (
                                        <View key={idx} style={styles.notificationItem}>
                                            <View style={styles.notifIcon}>
                                                <Text style={{ fontSize: 20 }}>🛍️</Text>
                                            </View>
                                            <View style={styles.notifContent}>
                                                <Text style={styles.notifTitle}>{item.description}</Text>
                                                <Text style={styles.notifSubtitle}>
                                                    {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </Text>
                                            </View>
                                            <Text style={styles.notifAmount}>-{formatCurrency(item.amount)}</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}

                        {activeTab === 'bills' && (
                            <View style={styles.contentContainer}>
                                {upcomingBills.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Receipt size={48} color="#333" />
                                        <Text style={styles.emptyText}>No upcoming bills</Text>
                                    </View>
                                ) : (
                                    upcomingBills.map((bill, idx) => (
                                        <View key={idx} style={styles.notificationItem}>
                                            <View style={[styles.notifIcon, { backgroundColor: COLORS.warning + '15' }]}>
                                                <Receipt size={20} color={COLORS.warning} />
                                            </View>
                                            <View style={styles.notifContent}>
                                                <Text style={styles.notifTitle}>{bill.name}</Text>
                                                <Text style={[styles.notifSubtitle, { color: COLORS.warning }]}>
                                                    Due {new Date(bill.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </Text>
                                            </View>
                                            <Text style={styles.notifAmount}>{formatCurrency(bill.amount)}</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}

                        {activeTab === 'alerts' && (
                            <View style={styles.contentContainer}>
                                {alerts.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <AlertTriangle size={48} color="#333" />
                                        <Text style={styles.emptyText}>No alerts</Text>
                                    </View>
                                ) : (
                                    alerts.map((alert, idx) => (
                                        <View key={idx} style={styles.notificationItem}>
                                            <View style={[styles.notifIcon, { backgroundColor: COLORS.error + '15' }]}>
                                                <AlertTriangle size={20} color={COLORS.error} />
                                            </View>
                                            <View style={styles.notifContent}>
                                                <Text style={styles.notifTitle}>{alert.title}</Text>
                                                <Text style={styles.notifSubtitle}>{alert.message}</Text>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}
                    </ScrollView>
                </LinearGradient>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: height * 0.85,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '700',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        marginBottom: 20,
        gap: 12,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: '#111',
        gap: 8,
    },
    tabActive: {
        backgroundColor: COLORS.primary + '20',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    tabText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    tabTextActive: {
        color: COLORS.primary,
    },
    tabBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    tabBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    contentScroll: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#0a0a0a',
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    notifIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    notifContent: {
        flex: 1,
    },
    notifTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    notifSubtitle: {
        color: '#666',
        fontSize: 13,
    },
    notifAmount: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
        marginTop: 16,
    },
});
