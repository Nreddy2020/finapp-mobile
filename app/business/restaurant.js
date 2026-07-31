import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Utensils, ChefHat, Clock, Plus, ArrowLeft, MoreVertical, Flame, TrendingDown, DollarSign, Users, X, CalendarDays, Filter } from 'lucide-react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { updateBusinessStats } from '../../services/storage';

// New Components
import KitchenDisplay from '../../components/business/restaurant/KitchenDisplay';
import SmartMenu from '../../components/business/restaurant/SmartMenu';
import ReservationSystem from '../../components/business/restaurant/ReservationSystem';

export default function RestaurantModule() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [showKDS, setShowKDS] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showTables, setShowTables] = useState(false);

    // Mock Data State
    const [menuItems, setMenuItems] = useState([
        { id: 1, name: 'Butter Chicken', orders: 42, revenue: 12600, cost: 35, status: 'popular' },
        { id: 2, name: 'Paneer Tikka', orders: 38, revenue: 9500, cost: 28, status: 'popular' },
        { id: 3, name: 'Garlic Naan', orders: 156, revenue: 7800, cost: 15, status: 'stable' },
        { id: 4, name: 'Dal Makhani', orders: 25, revenue: 6250, cost: 40, status: 'warning' },
    ]);

    // New Item Form State
    const [newItem, setNewItem] = useState({ name: '', price: '', cost: '' });

    // Derived Stats
    const stats = useMemo(() => {
        const totalRevenue = menuItems.reduce((sum, item) => sum + item.revenue, 0);
        const totalOrders = menuItems.reduce((sum, item) => sum + item.orders, 0);
        // Weighted average food cost
        const totalCostVal = menuItems.reduce((sum, item) => sum + (item.revenue * (item.cost / 100)), 0);
        const avgFoodCost = totalRevenue > 0 ? Math.round((totalCostVal / totalRevenue) * 100) : 0;
        const avgTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        return {
            todayOrders: totalOrders,
            totalRevenue: totalRevenue,
            avgTicket: avgTicket,
            foodCost: avgFoodCost
        };
    }, [menuItems]);

    // Persist Stats
    React.useEffect(() => {
        updateBusinessStats('restaurant', {
            calculatedRevenue: stats.totalRevenue,
            ...stats
        });
    }, [stats]);

    const handleAddItem = () => {
        if (!newItem.name || !newItem.price || !newItem.cost) return;

        const price = parseFloat(newItem.price);
        const cost = parseFloat(newItem.cost);
        const orders = Math.floor(Math.random() * 20) + 5; // Simulating initial orders for demo
        const revenue = orders * price;

        let status = 'stable';
        if (orders > 15) status = 'popular';
        if (cost > 40) status = 'warning';

        const item = {
            id: Date.now(),
            name: newItem.name,
            orders: orders,
            revenue: revenue,
            cost: cost,
            status: status
        };

        setMenuItems([item, ...menuItems]);
        setNewItem({ name: '', price: '', cost: '' });
        setModalVisible(false);
    };

    return (
        <AnimatedScreen style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>Business Module</Text>
                        <Text style={styles.title}>Restaurant</Text>
                    </View>
                    <TouchableOpacity style={styles.menuButton}>
                        <MoreVertical size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Hero Card */}
                <View style={styles.heroCardWrapper}>
                    <LinearGradient
                        colors={['#F97316', '#EA580C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroHeader}>
                            <View style={styles.iconBadge}>
                                <Utensils size={20} color="#FFFFFF" />
                            </View>
                            <Text style={styles.heroTitle}>Saffron Spice Bistro</Text>
                        </View>

                        <View style={styles.mainStat}>
                            <Text style={styles.mainStatLabel}>Today's Revenue</Text>
                            <Text style={styles.mainStatValue}>₹{stats.totalRevenue.toLocaleString()}</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Orders</Text>
                                <Text style={styles.miniStatValue}>{stats.todayOrders}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Food Cost</Text>
                                <Text style={styles.miniStatValue}>{stats.foodCost}%</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Avg Ticket</Text>
                                <Text style={styles.miniStatValue}>₹{stats.avgTicket}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowKDS(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <ChefHat size={24} color="#F97316" />
                            <Text style={styles.actionText}>KDS</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowMenu(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <Utensils size={24} color="#F97316" />
                            <Text style={styles.actionText}>Menu AI</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowTables(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <CalendarDays size={24} color="#F97316" />
                            <Text style={styles.actionText}>Tables</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Menu Performance */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Menu Performance</Text>
                        <TouchableOpacity style={styles.filterButton} onPress={() => setModalVisible(true)}>
                            <Plus size={14} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.filterText}>Add Dish</Text>
                        </TouchableOpacity>
                    </View>

                    {menuItems.map((item, index) => (
                        <View key={item.id} style={styles.itemCard}>
                            <View style={styles.rankBadge}>
                                <Text style={styles.rankText}>#{index + 1}</Text>
                            </View>

                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <View style={styles.itemMeta}>
                                    <Text style={styles.itemOrders}>{item.orders} Orders</Text>
                                    <View style={styles.dot} />
                                    <Text style={[
                                        styles.itemCost,
                                        item.cost > 35 ? styles.textHighCost : styles.textGoodCost
                                    ]}>{item.cost}% Cost</Text>
                                </View>
                            </View>

                            <View style={styles.revenueInfo}>
                                <Text style={styles.itemRevenue}>₹{item.revenue.toLocaleString()}</Text>
                                {item.status === 'popular' && (
                                    <View style={styles.fireBadge}>
                                        <Flame size={12} color="#F97316" fill="#F97316" />
                                    </View>
                                )}
                                {item.status === 'warning' && (
                                    <TrendingDown size={14} color="#EF4444" />
                                )}
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Add Dish Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Dish</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Dish Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Tandoori Chicken"
                                placeholderTextColor="#52525B"
                                value={newItem.name}
                                onChangeText={(text) => setNewItem({ ...newItem, name: text })}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Price (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newItem.price}
                                    onChangeText={(text) => setNewItem({ ...newItem, price: text })}
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Food Cost %</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="%"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newItem.cost}
                                    onChangeText={(text) => setNewItem({ ...newItem, cost: text })}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleAddItem}
                        >
                            <LinearGradient
                                colors={['#F97316', '#EA580C']}
                                style={styles.saveGradient}
                            >
                                <Text style={styles.saveText}>Add To Menu</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Feature Modals */}
            <KitchenDisplay visible={showKDS} onClose={() => setShowKDS(false)} />
            <SmartMenu visible={showMenu} onClose={() => setShowMenu(false)} />
            <ReservationSystem visible={showTables} onClose={() => setShowTables(false)} />
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
    scrollContent: {
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10',
        marginLeft: 'auto'
    },
    headerLabel: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 4
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    heroCardWrapper: {
        paddingHorizontal: 24,
        marginBottom: 24
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        position: 'relative'
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24
    },
    iconBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    heroTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    mainStat: {
        marginBottom: 24
    },
    mainStatLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 4
    },
    mainStatValue: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 16,
        justifyContent: 'space-between'
    },
    miniStat: {
        alignItems: 'center',
        flex: 1
    },
    miniStatLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: '600'
    },
    miniStatValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    divider: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    actionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 32
    },
    actionButton: {
        flex: 1,
        height: 70,
        borderRadius: 16,
        overflow: 'hidden'
    },
    actionGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#FFFFFF10',
        borderRadius: 16
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    section: {
        paddingHorizontal: 24
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#27272A',
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    filterText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        gap: 16
    },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF05'
    },
    rankText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#71717A'
    },
    itemInfo: {
        flex: 1
    },
    itemName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    itemOrders: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '500'
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#3F3F46'
    },
    itemCost: {
        fontSize: 12,
        fontWeight: '600'
    },
    textGoodCost: { color: '#10B981' },
    textHighCost: { color: '#EF4444' },
    revenueInfo: {
        alignItems: 'flex-end',
        gap: 4
    },
    itemRevenue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    fireBadge: {
        backgroundColor: '#F9731620',
        padding: 4,
        borderRadius: 8
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#18181B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#FFFFFF10'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    inputContainer: {
        marginBottom: 20
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#71717A',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    input: {
        backgroundColor: '#27272A',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    row: {
        flexDirection: 'row',
        gap: 16
    },
    saveButton: {
        marginTop: 12,
        height: 56,
        borderRadius: 16,
        overflow: 'hidden'
    },
    saveGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    saveText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    }
});
