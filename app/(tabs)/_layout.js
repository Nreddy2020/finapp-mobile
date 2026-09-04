import React, { useState, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Tabs, useRouter, usePathname, useNavigation } from 'expo-router';
import { LayoutDashboard, User, Users, Building2, TrendingUp, X, ChevronDown, ChevronUp, Wallet, Landmark, CalendarDays as Calendar, MessageSquare, ShieldCheck, Heart, CreditCard, Activity, GraduationCap, Wrench, PieChart, CheckSquare } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DrawerContext = createContext();

export function useDrawer() {
    return useContext(DrawerContext);
}

function CustomDrawerOverlay({ onClose, state, navigation }) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [isMoneyExpanded, setIsMoneyExpanded] = useState(false);
    const [isWealthExpanded, setIsWealthExpanded] = useState(false);
    const [isLifeExpanded, setIsLifeExpanded] = useState(false);
    const [isBusinessExpanded, setIsBusinessExpanded] = useState(false);
    const [isIntelligenceExpanded, setIsIntelligenceExpanded] = useState(false);
    const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);

    const activeRouteIndex = state?.index ?? 0;
    const activeRouteName = state?.routes[activeRouteIndex]?.name ?? 'index';

    const toggleGroup = (setter, currentVal) => {
        setIsMoneyExpanded(false);
        setIsWealthExpanded(false);
        setIsLifeExpanded(false);
        setIsBusinessExpanded(false);
        setIsIntelligenceExpanded(false);
        setIsSecurityExpanded(false);
        setter(!currentVal);
    };

    const moneySubTabs = [
        { id: 'flow', name: 'Money Flow', icon: Wallet, route: '/(tabs)/self?tab=flow' },
        { id: 'budgets', name: 'Budget', icon: PieChart, route: '/budgets' },
        { id: 'recurring', name: 'Recurring', icon: Calendar, route: '/recurring' },
        { id: 'cashbooks', name: 'Cashbooks', icon: Wallet, route: '/cashbooks' },
        { id: 'group-expenses', name: 'Group Exp', icon: Users, route: '/group-expenses' },
        { id: 'reports', name: 'Reports', icon: TrendingUp, route: '/reports' }
    ];

    const wealthSubTabs = [
        { id: 'banking', name: 'Banking', icon: Landmark, route: '/(tabs)/self?tab=banking' },
        { id: 'loans', name: 'Formal Loans', icon: CreditCard, route: '/(tabs)/self?tab=banking' },
        { id: 'emis', name: 'EMI Tracker', icon: Calendar, route: '/(tabs)/self?tab=banking' },
        { id: 'p2p', name: 'P2P Network', icon: Users, route: '/(tabs)/self?tab=p2p' },
        { id: 'assets', name: 'Assets', icon: Building2, route: '/assets' },
        { id: 'properties', name: 'Property', icon: Building2, route: '/properties' },
        { id: 'investments', name: 'Investments', icon: TrendingUp, route: '/investments' }
    ];

    const lifeSubTabs = [
        { id: 'family', name: 'Family', icon: Users, route: '/family' },
        { id: 'time-management', name: 'Time Mgmt', icon: CheckSquare, route: '/time-management' },
        { id: 'todos', name: 'Tasks / Goals', icon: CheckSquare, route: '/todos' },
        { id: 'career', name: 'Career', icon: Wrench, route: '/career' },
        { id: 'travel', name: 'Travel', icon: Heart, route: '/travel' }
    ];
    
    const intelligenceSubTabs = [
        { id: 'insights', name: 'Insights', icon: TrendingUp, route: '/insights' },
        { id: 'markets', name: 'Markets', icon: TrendingUp, route: '/markets' },
        { id: 'financial-health', name: 'Fin Health', icon: Heart, route: '/financial-health' },
        { id: 'tax', name: 'Tax', icon: Wallet, route: '/tax' },
        { id: 'testing', name: 'In-App Test Hub', icon: Activity, route: '/(tabs)/testing' }
    ];
    
    const securitySubTabs = [
        { id: 'validity', name: 'Validity/Docs', icon: ShieldCheck, route: '/validity' },
        { id: 'emergency', name: 'Emergency', icon: ShieldCheck, route: '/emergency' },
        { id: 'profile', name: 'Profile', icon: User, route: '/profile' },
        { id: 'more', name: 'More', icon: Wrench, route: '/more' }
    ];

    const drawerRoutes = [
        { name: 'index', label: 'Personal CFO (Home)', icon: LayoutDashboard },
        { name: 'money', label: 'Money Flow & Cash', icon: Wallet, state: isMoneyExpanded, setState: setIsMoneyExpanded, subTabs: moneySubTabs },
        { name: 'wealth', label: 'Wealth & Portfolio', icon: Landmark, state: isWealthExpanded, setState: setIsWealthExpanded, subTabs: wealthSubTabs },
        { name: 'life', label: 'Goals & Life Planning', icon: Heart, state: isLifeExpanded, setState: setIsLifeExpanded, subTabs: lifeSubTabs },
        { name: 'business', label: 'Business Hub', icon: Building2 },
        { name: 'intelligence', label: 'Decision Intelligence', icon: Activity, state: isIntelligenceExpanded, setState: setIsIntelligenceExpanded, subTabs: intelligenceSubTabs, isGroup: true },
        { name: 'security', label: 'Privacy & Security', icon: ShieldCheck, state: isSecurityExpanded, setState: setIsSecurityExpanded, subTabs: securitySubTabs, isGroup: true }
    ];

    return (
        <View style={styles.drawerBackdrop}>
            <Pressable style={styles.backdropPressable} onPress={onClose} />
            <View style={styles.drawerContainer}>
                <ScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.drawerHeader}>
                        <Text style={styles.logoText}>FinLife</Text>
                        <Text style={styles.logoSubtitle}>Your financial life, connected</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.drawerMenu}>
                        {drawerRoutes.map((route) => {
                            const isFocused = activeRouteName === route.name && !route.isGroup;
                            const IconComponent = route.icon;
                            const label = route.label;

                            // If route has subTabs (Accordion)
                            if (route.subTabs) {
                                return (
                                    <View key={route.name}>
                                        <TouchableOpacity
                                            onPress={() => toggleGroup(route.setState, route.state)}
                                            style={[styles.menuItem, isFocused && styles.menuItemActive, { justifyContent: 'space-between' }]}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <IconComponent size={22} color={isFocused ? '#FFF' : '#71717A'} strokeWidth={2.5} />
                                                <Text style={[styles.menuLabel, isFocused && styles.menuLabelActive]}>
                                                    {label}
                                                </Text>
                                            </View>
                                            {route.state ? (
                                                <ChevronUp size={16} color="#71717A" />
                                            ) : (
                                                <ChevronDown size={16} color="#71717A" />
                                            )}
                                        </TouchableOpacity>

                                        {route.state && (
                                            <View style={styles.subItemsContainer}>
                                                {route.subTabs.map(sub => {
                                                    const SubIcon = sub.icon;
                                                    const onSubPress = () => {
                                                        router.push(sub.route);
                                                        onClose();
                                                    };
                                                    return (
                                                        <TouchableOpacity
                                                            key={sub.id}
                                                            onPress={onSubPress}
                                                            style={styles.subMenuItem}
                                                        >
                                                            <SubIcon size={16} color="#71717A" />
                                                            <Text style={styles.subMenuLabel}>
                                                                {sub.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                );
                            }

                            // Standard non-accordion items (Dashboard, Business)
                            const onPress = () => {
                                router.push(`/(tabs)/${route.name === 'index' ? '' : route.name}`);
                                onClose();
                            };

                            return (
                                <TouchableOpacity
                                    key={route.name}
                                    onPress={onPress}
                                    style={[styles.menuItem, isFocused && styles.menuItemActive]}
                                >
                                    <IconComponent size={22} color={isFocused ? '#FFF' : '#71717A'} strokeWidth={2.5} />
                                    <Text style={[styles.menuLabel, isFocused && styles.menuLabelActive]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

function CustomTabBar(props) {
    const { isDrawerOpen, setIsDrawerOpen } = useDrawer();

    return (
        <View style={isDrawerOpen ? styles.tabBarContainerOpen : styles.tabBarContainerClosed}>
            {isDrawerOpen && (
                <CustomDrawerOverlay 
                    onClose={() => setIsDrawerOpen(false)} 
                    state={props.state}
                    navigation={props.navigation}
                />
            )}
        </View>
    );
}

export default function TabLayout() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <DrawerContext.Provider value={{ isDrawerOpen, setIsDrawerOpen }}>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                <Tabs
                    tabBar={(props) => <CustomTabBar {...props} />}
                    screenOptions={{
                        headerShown: false,
                        sceneContainerStyle: { backgroundColor: '#000' }
                    }}
                >
                    <Tabs.Screen name="index" />
                    <Tabs.Screen name="self" options={{ href: null }} />
                    <Tabs.Screen name="business" options={{ href: null }} />

                    {/* Hidden tab screens */}
                    <Tabs.Screen name="profile" options={{ href: null }} />
                    <Tabs.Screen name="more" options={{ href: null }} />
                    <Tabs.Screen name="transactions" options={{ href: null }} />
                    <Tabs.Screen name="income" options={{ href: null }} />
                    <Tabs.Screen name="budgets" options={{ href: null }} />
                    <Tabs.Screen name="savings" options={{ href: null }} />
                    <Tabs.Screen name="insights" options={{ href: null }} />
                    <Tabs.Screen name="emergency" options={{ href: null }} />
                    <Tabs.Screen name="financial-health" options={{ href: null }} />
                    <Tabs.Screen name="time-management" options={{ href: null }} />
                    <Tabs.Screen name="loans" options={{ href: null }} />
                    <Tabs.Screen name="emis" options={{ href: null }} />
                    <Tabs.Screen name="accounts" options={{ href: null }} />
                    <Tabs.Screen name="group-expenses" options={{ href: null }} />
                    <Tabs.Screen name="recurring" options={{ href: null }} />
                    <Tabs.Screen name="cashbooks" options={{ href: null }} />
                    <Tabs.Screen name="properties" options={{ href: null }} />
                    <Tabs.Screen name="assets" options={{ href: null }} />
                    <Tabs.Screen name="investments" options={{ href: null }} />
                    <Tabs.Screen name="travel" options={{ href: null }} />
                    <Tabs.Screen name="apartment" options={{ href: null }} />
                    <Tabs.Screen name="hostel" options={{ href: null }} />
                    <Tabs.Screen name="validity" options={{ href: null }} />
                    <Tabs.Screen name="tax" options={{ href: null }} />
                    <Tabs.Screen name="todos" options={{ href: null }} />
                    <Tabs.Screen name="career" options={{ href: null }} />
                    <Tabs.Screen name="reports" options={{ href: null }} />
                    <Tabs.Screen name="affirmations" options={{ href: null }} />
                    <Tabs.Screen name="testing" options={{ href: null }} />
                </Tabs>
            </View>
        </DrawerContext.Provider>
    );
}

const styles = StyleSheet.create({
    tabBarContainerOpen: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 10000
    },
    tabBarContainerClosed: {
        position: 'absolute',
        width: 0,
        height: 0,
        zIndex: -1
    },
    drawerBackdrop: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 10000,
        flexDirection: 'row'
    },
    backdropPressable: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
    },
    drawerContainer: {
        width: 280,
        height: '100%',
        backgroundColor: '#09090B',
        borderRightWidth: 1,
        borderRightColor: '#27272A',
        paddingHorizontal: 20,
        zIndex: 10001
    },
    drawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30
    },
    logoSubtitle: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2,
        fontWeight: '600',
    },
    logoText: {
        color: '#6366F1',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -1
    },
    closeBtn: {
        padding: 6
    },
    drawerMenu: {
        gap: 12
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 12,
        backgroundColor: 'transparent'
    },
    menuItemActive: {
        backgroundColor: '#6366F120',
        borderWidth: 1,
        borderColor: '#6366F150'
    },
    menuLabel: {
        color: '#71717A',
        fontSize: 14,
        fontWeight: '800'
    },
    menuLabelActive: {
        color: '#FFF'
    },
    subItemsContainer: {
        paddingLeft: 36,
        marginTop: 4,
        marginBottom: 8,
        gap: 8
    },
    subMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 10
    },
    subMenuLabel: {
        color: '#D4D4D8',
        fontSize: 13,
        fontWeight: '600'
    }
});
