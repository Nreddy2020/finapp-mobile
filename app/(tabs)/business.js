import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingDown, Building2, ShoppingBag, Utensils, Briefcase, Plus, TrendingUp, Hotel, Factory, Truck } from 'lucide-react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import BusinessCard from '../../components/business/BusinessCard';
import MarketShockSimulator from '../../components/business/MarketShockSimulator';
import LuxuryCard from '../../components/ui/LuxuryCard';

export default function BusinessDashboard() {
    const router = useRouter();

    const businesses = [
        {
            id: 'rental',
            title: 'Rental Properties',
            icon: Building2,
            color: '#8B5CF6', // Violet
            description: 'Manage tenants, rent collection, and property maintenance.',
            route: '/business/rental-property',
            stats: [
                { label: 'Occupancy', value: '92%' },
                { label: 'Monthly Rev', value: '₹4.2L' }
            ]
        },
        {
            id: 'retail',
            title: 'Retail Shop',
            icon: ShoppingBag,
            color: '#EC4899', // Pink
            description: 'Track inventory, daily sales, and profit margins.',
            route: '/business/retail',
            stats: [
                { label: 'Weekly Sales', value: '₹1.8L' },
                {
                    label: 'Low Stock',
                    value: '12 Items',
                    onPress: () => router.push('/business/retail?filter=LOW')
                }
            ]
        },
        {
            id: 'hospitality',
            title: 'Hospitality',
            icon: Hotel,
            color: '#3B82F6', // Blue
            description: 'Room bookings, occupancy rates, and guest services.',
            route: '/business/hospitality',
            stats: [
                { label: 'Occupancy', value: '75%' },
                { label: 'Check-ins', value: '8' }
            ]
        },
        {
            id: 'service',
            title: 'Service Business',
            icon: Briefcase,
            color: '#3B82F6', // Blue
            description: 'Client bookings, service rates, and resource utilization.',
            route: '/business/service',
            stats: [
                { label: 'Active Clients', value: '28' },
                { label: 'Pending', value: '5' }
            ]
        },
        {
            id: 'manufacturing',
            title: 'Manufacturing',
            icon: Factory,
            color: '#D97706', // Amber
            description: 'Track production batches, efficiency, and material costs.',
            route: '/business/manufacturing',
            stats: [
                { label: 'Daily Output', value: '650' },
                { label: 'Efficiency', value: '94%' }
            ]
        },
        {
            id: 'transportation',
            title: 'Logistics',
            icon: Truck,
            color: '#06B6D4', // Cyan
            description: 'Fleet tracking, delivery status, and fuel management.',
            route: '/business/transportation',
            stats: [
                { label: 'Active Trips', value: '12' },
                { label: 'On-Time', value: '96%' }
            ]
        }
    ];

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
                    <View>
                        <Text style={styles.headerLabel}>Management</Text>
                        <Text style={styles.title}>My Businesses</Text>
                    </View>
                    <TouchableOpacity style={styles.addButton}>
                        <Plus size={24} color="#000000" />
                    </TouchableOpacity>
                </View>

                {/* Market Shock Simulator (World Class Feature) */}
                <MarketShockSimulator />

                {/* Business Grid */}
                <View style={styles.grid}>
                    {businesses.map((biz) => (
                        <BusinessCard
                            key={biz.id}
                            title={biz.title}
                            icon={biz.icon}
                            color={biz.color}
                            description={biz.description}
                            stats={biz.stats}
                            onPress={() => router.push(biz.route)}
                        />
                    ))}

                    {/* Add New Placeholder */}
                    <TouchableOpacity style={styles.addNewCard}>
                        <View style={styles.addNewIcon}>
                            <Plus size={24} color="#71717A" />
                        </View>
                        <Text style={styles.addNewText}>Start New Business</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
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
    scrollContent: {
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
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
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center'
    },
    summaryCardWrapper: {
        paddingHorizontal: 24,
        marginBottom: 32
    },
    summaryCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    summaryTitle: {
        fontSize: 14,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B98115',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4
    },
    trendText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981'
    },
    summaryAmount: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 24,
        letterSpacing: -1
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    summaryLabel: {
        fontSize: 12,
        color: '#71717A',
        marginBottom: 4
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: '#FFFFFF10'
    },
    grid: {
        paddingHorizontal: 24
    },
    addNewCard: {
        width: '100%',
        height: 120,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#FFFFFF08',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181B50'
    },
    addNewIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF05',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12
    },
    addNewText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#71717A'
    },
    shockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#27272A',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    shockBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    shockRecessionActive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444'
    },
    shockBoomActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981'
    }
});
