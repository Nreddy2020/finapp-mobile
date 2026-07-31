import React, { useState, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Tabs, useRouter, usePathname, useNavigation } from 'expo-router';
import {
    LayoutDashboard, User, Users, Building2, TrendingUp, X, ChevronDown, ChevronUp,
    Wallet, Landmark, Calendar, MessageSquare, ShieldCheck, Heart, CreditCard, Activity, GraduationCap, Wrench, PieChart, CheckSquare
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DrawerContext = createContext();

export function useDrawer() {
    return useContext(DrawerContext);
}

function CustomDrawerOverlay({ onClose, state, navigation }) {
    const insets = useSafeAreaInsets();
    const [isPersonalExpanded, setIsPersonalExpanded] = useState(true);
    const [isFamilyExpanded, setIsFamilyExpanded] = useState(false);
    const [isBusinessExpanded, setIsBusinessExpanded] = useState(false);
    const [isMarketsExpanded, setIsMarketsExpanded] = useState(false);

    const activeRouteIndex = state?.index ?? 0;
    const activeRouteName = state?.routes[activeRouteIndex]?.name ?? 'index';

    const navigateTab = (name, params) => {
        console.log('[DRAWER] navigateTab called for name:', name, 'params:', params);
        const targetRoute = state?.routes?.find(r => r.name === name);
        console.log('[DRAWER] targetRoute found:', targetRoute?.key);
        if (!targetRoute) return;

        const event = navigation.emit({
            type: 'tabPress',
            target: targetRoute.key,
            canPreventDefault: true,
        });

        if (!event.defaultPrevented) {
            navigation.navigate({ name: targetRoute.name, merge: true, params: params });
        }
    };

    const personalSubTabs = [
        { id: 'flow', name: 'Money Flow', icon: Wallet },
        { id: 'financial_hub', name: 'Financial Hub', icon: CreditCard },
        { id: 'banking', name: 'Banking & Loans', icon: CreditCard, parent: 'financial_hub' },
        { id: 'p2p', name: 'P2P Loans', icon: Users, parent: 'financial_hub' },
        { id: 'splitwise', name: 'Splitwise', icon: PieChart, parent: 'financial_hub' },
        { id: 'renewals', name: 'Renewals', icon: Calendar },
        { id: 'meds', name: 'Health Hub', icon: Activity },
        { id: 'school', name: 'Family Security Hub', icon: ShieldCheck },
        { id: 'services', name: 'Services', icon: Wrench },
        { id: 'budgets', name: 'Budgets', icon: PieChart },
        { id: 'todo', name: 'To Do', icon: CheckSquare },
        { id: 'properties', name: 'Property Vault', icon: Building2 },
        { id: 'crisis', name: 'Volatility Shield', icon: ShieldCheck }
    ];

    const familySubTabs = [
        { id: 'tree', name: 'Family Tree', icon: Users },
        { id: 'savings', name: 'Shared Savings', icon: Wallet },
        { id: 'insurance', name: 'Insurance Hub', icon: ShieldCheck },
        { id: 'assets', name: 'Family Assets', icon: Building2 },
        { id: 'health', name: 'Health Vault', icon: Heart },
        { id: 'childcare', name: 'Child Care', icon: Calendar },
        { id: 'eldercare', name: 'Parents Care', icon: Calendar }
    ];

    const businessSubTabs = [
        { id: 'kirana', name: 'Kirana Shop', icon: Building2 },
        { id: 'hostel', name: 'Hostel Lodging', icon: Building2 },
        { id: 'apartment', name: 'Apartment CRM', icon: Building2 },
        { id: 'sweet', name: 'Sweet Shop', icon: Building2 },
        { id: 'farmer', name: 'Farmer Yield', icon: Landmark },
        { id: 'fruits', name: 'Fruit Trade', icon: Landmark },
        { id: 'clothes', name: 'Boutique CRM', icon: Landmark },
        { id: 'milk', name: 'Milk Dairy', icon: Landmark },
        { id: 'realestate', name: 'Real Estate', icon: Landmark },
        { id: 'hospital', name: 'Hospital OP', icon: Landmark }
    ];

    const marketsSubTabs = [
        { id: 'sentiment', name: 'Sentiment Advisor', icon: TrendingUp },
        { id: 'leverage', name: 'Leverage Guard', icon: ShieldCheck }
    ];

    const drawerRoutes = [
        { name: 'index', label: 'Dashboard', icon: LayoutDashboard },
        { name: 'self', label: 'Personal Details', icon: User },
        { name: 'family', label: 'Family Circle', icon: Users },
        { name: 'business', label: 'Business CRM', icon: Building2 },
        { name: 'markets', label: 'Markets & Guard', icon: TrendingUp }
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
                        <Text style={styles.logoText}>WealthWise</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.drawerMenu}>
                        {drawerRoutes.map((route) => {
                            const isFocused = activeRouteName === route.name;
                            const IconComponent = route.icon;
                            const label = route.label;

                            // Accordion Expanders for Subcategories
                            if (route.name === 'self') {
                                return (
                                    <View key={route.name}>
                                        <TouchableOpacity
                                            onPress={() => setIsPersonalExpanded(!isPersonalExpanded)}
                                            style={[styles.menuItem, isFocused && styles.menuItemActive, { justifyContent: 'space-between' }]}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <IconComponent size={22} color={isFocused ? '#FFF' : '#71717A'} strokeWidth={2.5} />
                                                <Text style={[styles.menuLabel, isFocused && styles.menuLabelActive]}>
                                                    {label}
                                                </Text>
                                            </View>
                                            {isPersonalExpanded ? (
                                                <ChevronUp size={16} color="#71717A" />
                                            ) : (
                                                <ChevronDown size={16} color="#71717A" />
                                            )}
                                        </TouchableOpacity>

                                        {isPersonalExpanded && (
                                            <View style={styles.subItemsContainer}>
                                                {personalSubTabs.map(sub => {
                                                    const SubIcon = sub.icon;
                                                    const isChild = !!sub.parent;
                                                    const onSubPress = () => {
                                                        console.log('[DRAWER] onSubPress clicked for personal sub:', sub.id);
                                                        navigateTab('self', { tab: sub.id });
                                                        onClose();
                                                    };
                                                    return (
                                                        <TouchableOpacity
                                                            key={sub.id}
                                                            onPress={onSubPress}
                                                            style={[styles.subMenuItem, isChild && { paddingLeft: 34 }]}
                                                        >
                                                            {isChild ? (
                                                                <Text style={{ color: '#6366F1', fontSize: 12, marginRight: 6, fontWeight: '700' }}>└</Text>
                                                            ) : null}
                                                            <SubIcon size={16} color={isChild ? '#818CF8' : '#71717A'} />
                                                            <Text style={[styles.subMenuLabel, isChild && { color: '#E4E4E7', fontSize: 12, fontWeight: '600' }]}>
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

                            if (route.name === 'family') {
                                return (
                                    <View key={route.name}>
                                        <TouchableOpacity
                                            onPress={() => setIsFamilyExpanded(!isFamilyExpanded)}
                                            style={[styles.menuItem, isFocused && styles.menuItemActive, { justifyContent: 'space-between' }]}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <IconComponent size={22} color={isFocused ? '#FFF' : '#71717A'} strokeWidth={2.5} />
                                                <Text style={[styles.menuLabel, isFocused && styles.menuLabelActive]}>
                                                    {label}
                                                </Text>
                                            </View>
                                            {isFamilyExpanded ? (
                                                <ChevronUp size={16} color="#71717A" />
                                            ) : (
                                                <ChevronDown size={16} color="#71717A" />
                                            )}
                                        </TouchableOpacity>

                                        {isFamilyExpanded && (
                                            <View style={styles.subItemsContainer}>
                                                {familySubTabs.map(sub => {
                                                    const SubIcon = sub.icon;
                                                    const onSubPress = () => {
                                                        console.log('[DRAWER] onSubPress clicked for family sub:', sub.id);
                                                        navigateTab('family', { tab: sub.id });
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

                            if (route.name === 'business') {
                                return (
                                    <View key={route.name}>
                                        <TouchableOpacity
                                            onPress={() => setIsBusinessExpanded(!isBusinessExpanded)}
                                            style={[styles.menuItem, isFocused && styles.menuItemActive, { justifyContent: 'space-between' }]}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <IconComponent size={22} color={isFocused ? '#FFF' : '#71717A'} strokeWidth={2.5} />
                                                <Text style={[styles.menuLabel, isFocused && styles.menuLabelActive]}>
                                                    {label}
                                                </Text>
                                            </View>
                                            {isBusinessExpanded ? (
                                                <ChevronUp size={16} color="#71717A" />
                                            ) : (
                                                <ChevronDown size={16} color="#71717A" />
                                            )}
                                        </TouchableOpacity>

                                        {isBusinessExpanded && (
                                            <View style={styles.subItemsContainer}>
                                                {businessSubTabs.map(sub => {
                                                    const SubIcon = sub.icon;
                                                    const onSubPress = () => {
                                                        console.log('[DRAWER] onSubPress clicked for business sub:', sub.id);
                                                        navigateTab('business', { tab: sub.id });
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

                            if (route.name === 'markets') {
                                return (
                                    <View key={route.name}>
                                        <TouchableOpacity
                                            onPress={() => setIsMarketsExpanded(!isMarketsExpanded)}
                                            style={[styles.menuItem, isFocused && styles.menuItemActive, { justifyContent: 'space-between' }]}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <IconComponent size={22} color={isFocused ? '#FFF' : '#71717A'} strokeWidth={2.5} />
                                                <Text style={[styles.menuLabel, isFocused && styles.menuLabelActive]}>
                                                    {label}
                                                </Text>
                                            </View>
                                            {isMarketsExpanded ? (
                                                <ChevronUp size={16} color="#71717A" />
                                            ) : (
                                                <ChevronDown size={16} color="#71717A" />
                                            )}
                                        </TouchableOpacity>

                                        {isMarketsExpanded && (
                                            <View style={styles.subItemsContainer}>
                                                {marketsSubTabs.map(sub => {
                                                    const SubIcon = sub.icon;
                                                    const onSubPress = () => {
                                                        console.log('[DRAWER] onSubPress clicked for markets sub:', sub.id);
                                                        navigateTab('markets', { tab: sub.id });
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

                            const onPress = () => {
                                navigateTab(route.name);
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
                    <Tabs.Screen name="self" />
                    <Tabs.Screen name="family" />
                    <Tabs.Screen name="business" />
                    <Tabs.Screen name="markets" />

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
