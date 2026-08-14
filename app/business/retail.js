import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Share, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingBag, TrendingUp, AlertTriangle, Search, Scan, Plus, Package, ArrowLeft, MoreVertical, X, CheckCircle2, ChevronRight } from 'lucide-react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { BusinessService } from '../../services/business';

export default function RetailShopModule() {
    const router = useRouter();
    const { filter } = useLocalSearchParams();

    // Data State
    const [businessData, setBusinessData] = useState({ profile: { name: 'My Business' }, sales: [] });
    const [todaySalesAmount, setTodaySalesAmount] = useState(0);

    // Mock Product Inventory (Could be moved to service later if needed)
    const [products, setProducts] = useState([
        { id: 1, name: 'Premium Basmati Rice', stock: 45, unit: 'kg', price: 120, status: 'ok', barcode: '8901234567890', expiryDate: '2026-12-31' },
        { id: 2, name: 'Sunflower Oil 5L', stock: 4, unit: 'pcs', price: 850, status: 'low', barcode: '8909876543210', expiryDate: '2024-10-20' },
        { id: 3, name: 'Whole Wheat Atta 10kg', stock: 12, unit: 'bags', price: 440, status: 'ok', barcode: '8901122334455', expiryDate: '2026-06-15' },
        { id: 4, name: 'Sugar 1kg Pack', stock: 2, unit: 'pcs', price: 48, status: 'critical', barcode: '8905544332211', expiryDate: '2026-01-20' },
        { id: 5, name: 'Masoor Dal', stock: 25, unit: 'kg', price: 90, status: 'ok', barcode: '8906677889900', expiryDate: '2025-08-20' },
    ]);

    // Modals & UI State
    const [showBillingModal, setShowBillingModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [inventoryFilter, setInventoryFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Billing State
    const [billItems, setBillItems] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [itemWeight, setItemWeight] = useState('');
    const [customerName, setCustomerName] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await BusinessService.getData();
        const safeData = data || { profile: { name: 'My Business' }, sales: [] };
        setBusinessData(safeData);
        calculateTodaySales(safeData.sales);
    };

    const calculateTodaySales = (sales) => {
        const today = new Date().toDateString();
        const total = (sales || [])
            .filter(s => s && s.date && new Date(s.date).toDateString() === today)
            .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
        setTodaySalesAmount(total);
    };

    // --- Actions ---

    const handleCompleteSale = async () => {
        if (billItems.length === 0) return;

        const totalAmount = billItems.reduce((sum, item) => sum + item.totalPrice, 0);

        const newSale = {
            amount: totalAmount,
            expenses: 0, // Simplified for now
            items: billItems,
            customerName: customerName,
            paymentMethod: 'CASH' // Default
        };

        const updatedData = await BusinessService.addEntry(newSale);
        const safeUpdated = updatedData || { profile: { name: 'My Business' }, sales: [] };
        setBusinessData(safeUpdated);
        calculateTodaySales(safeUpdated.sales);

        // Update local inventory mock
        updateInventory(billItems);

        // Reset
        setBillItems([]);
        setCustomerName('');
        setShowBillingModal(false);
        Alert.alert('Success', 'Sale recorded successfully!');
    };

    const updateInventory = (soldItems) => {
        const updatedProducts = products.map(p => {
            const sold = soldItems.find(i => i.product.id === p.id);
            if (sold) {
                const newStock = Math.max(0, p.stock - sold.weight);
                let status = 'ok';
                if (newStock <= 2) status = 'critical';
                else if (newStock <= 5) status = 'low';
                return { ...p, stock: newStock, status };
            }
            return p;
        });
        setProducts(updatedProducts);
    };

    const addToBill = () => {
        if (!selectedProduct || !itemWeight) return;
        const weight = parseFloat(itemWeight);
        const totalPrice = weight * selectedProduct.price;

        setBillItems([...billItems, {
            id: Date.now(),
            product: selectedProduct,
            weight,
            unit: selectedProduct.unit,
            totalPrice
        }]);
        setItemWeight('');
        setSelectedProduct(null);
    };

    // --- Derived Stats ---
    const stats = useMemo(() => {
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        const lowStockCount = products.filter(p => p.stock < 5).length;
        const salesList = businessData?.sales || [];
        const todayStr = new Date().toDateString();
        return {
            inventoryValue: totalValue,
            lowStockItems: lowStockCount,
            totalSalesToday: todaySalesAmount,
            transactionsToday: salesList.filter(s => s && s.date && new Date(s.date).toDateString() === todayStr).length
        };
    }, [products, todaySalesAmount, businessData]);

    return (
        <AnimatedScreen style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>Business Module</Text>
                        <Text style={styles.title}>{businessData.profile.name}</Text>
                    </View>
                </View>

                {/* Hero Card */}
                <LinearGradient
                    colors={['#EC4899', '#DB2777']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroHeader}>
                        <ShoppingBag size={20} color="#FFF" />
                        <Text style={styles.heroTitle}>Retail Dashboard</Text>
                    </View>

                    <View style={styles.mainStat}>
                        <Text style={styles.mainStatLabel}>Today's Sales</Text>
                        <Text style={styles.mainStatValue}>₹{stats.totalSalesToday.toLocaleString()}</Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.miniStat}>
                            <Text style={styles.miniStatLabel}>Orders</Text>
                            <Text style={styles.miniStatValue}>{stats.transactionsToday}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.miniStat}>
                            <Text style={styles.miniStatLabel}>Inv. Value</Text>
                            <Text style={styles.miniStatValue}>₹{(stats.inventoryValue / 1000).toFixed(1)}k</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.miniStat}>
                            <Text style={styles.miniStatLabel}>Low Stock</Text>
                            <Text style={styles.miniStatValue}>{stats.lowStockItems}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowBillingModal(true)}>
                        <LinearGradient colors={['#18181B', '#18181B']} style={styles.actionGradient}>
                            <Plus size={24} color="#EC4899" />
                            <Text style={styles.actionText}>New Sale</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => alert('Feature coming soon')}>
                        <LinearGradient colors={['#18181B', '#18181B']} style={styles.actionGradient}>
                            <TrendingUp size={24} color="#EC4899" />
                            <Text style={styles.actionText}>Analytics</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Recent Sales List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    {businessData.sales.length === 0 ? (
                        <Text style={styles.emptyText}>No sales recorded yet.</Text>
                    ) : (
                        businessData.sales.slice(0, 5).map((sale, index) => (
                            <View key={index} style={styles.saleCard}>
                                <View>
                                    <Text style={styles.saleTime}>{new Date(sale.date).toLocaleString()}</Text>
                                    <Text style={styles.saleCustomer}>{sale.customerName || 'Walk-in'}</Text>
                                </View>
                                <Text style={styles.saleAmount}>+₹{parseFloat(sale.amount).toFixed(2)}</Text>
                            </View>
                        ))
                    )}
                </View>

                {/* Inventory Preview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Inventory</Text>
                    {products.slice(0, 3).map(p => (
                        <View key={p.id} style={styles.productRow}>
                            <View>
                                <Text style={styles.productName}>{p.name}</Text>
                                <Text style={styles.productStock}>{p.stock} {p.unit} left</Text>
                            </View>
                            <Text style={styles.productPrice}>₹{p.price}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Billing Modal */}
            <Modal visible={showBillingModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Sale</Text>
                            <TouchableOpacity onPress={() => setShowBillingModal(false)}>
                                <X size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Customer Name (Optional)"
                            placeholderTextColor="#666"
                            value={customerName}
                            onChangeText={setCustomerName}
                        />

                        {/* Product Selection Simplified */}
                        <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
                            {products.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[styles.productSelect, selectedProduct?.id === p.id && styles.selectedProduct]}
                                    onPress={() => setSelectedProduct(p)}
                                >
                                    <Text style={styles.productSelectName}>{p.name}</Text>
                                    <Text style={styles.productSelectPrice}>₹{p.price}/{p.unit}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {selectedProduct && (
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Quantity/Weight"
                                    placeholderTextColor="#666"
                                    keyboardType="numeric"
                                    value={itemWeight}
                                    onChangeText={setItemWeight}
                                />
                                <TouchableOpacity style={styles.addBtn} onPress={addToBill}>
                                    <Text style={styles.btnText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Bill Items */}
                        <ScrollView style={{ maxHeight: 150, marginBottom: 16 }}>
                            {billItems.map((item, idx) => (
                                <View key={idx} style={styles.billItemRow}>
                                    <Text style={styles.billItemName}>{item.product.name} ({item.weight}{item.unit})</Text>
                                    <Text style={styles.billItemPrice}>₹{item.totalPrice.toFixed(2)}</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total:</Text>
                            <Text style={styles.totalValue}>
                                ₹{billItems.reduce((sum, i) => sum + i.totalPrice, 0).toFixed(2)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.completeBtn, billItems.length === 0 && { opacity: 0.5 }]}
                            onPress={handleCompleteSale}
                            disabled={billItems.length === 0}
                        >
                            <Text style={styles.completeBtnText}>Complete Sale</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, gap: 16 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181B', alignItems: 'center', justifyContent: 'center' },
    headerLabel: { color: '#EC4899', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    title: { color: '#FFF', fontSize: 20, fontWeight: '700' },
    scrollContent: { padding: 20, paddingBottom: 100 },

    heroCard: { padding: 20, borderRadius: 24, marginBottom: 24 },
    heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    heroTitle: { color: '#FFF', fontWeight: '600', fontSize: 14, opacity: 0.9 },
    mainStatLabel: { color: '#FFF', opacity: 0.8, fontSize: 14 },
    mainStatValue: { color: '#FFF', fontSize: 36, fontWeight: '900', marginVertical: 4 },
    statsRow: { flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 12, padding: 12 },
    miniStat: { flex: 1, alignItems: 'center' },
    miniStatLabel: { color: '#FFF', opacity: 0.7, fontSize: 10, textTransform: 'uppercase' },
    miniStatValue: { color: '#FFF', fontWeight: '700', fontSize: 14, marginTop: 4 },
    divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

    actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionButton: { flex: 1 },
    actionGradient: { padding: 16, borderRadius: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#333' },
    actionText: { color: '#FFF', fontWeight: '600', fontSize: 12 },

    section: { marginBottom: 24 },
    sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 16 },
    emptyText: { color: '#555', fontStyle: 'italic' },

    saleCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#18181B', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#333' },
    saleTime: { color: '#71717A', fontSize: 12 },
    saleCustomer: { color: '#FFF', fontWeight: '600', fontSize: 14 },
    saleAmount: { color: '#10B981', fontWeight: '700', fontSize: 16 },

    productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
    productName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
    productStock: { color: '#71717A', fontSize: 12 },
    productPrice: { color: '#FFF', fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#18181B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16 },

    productSelect: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', marginBottom: 8 },
    selectedProduct: { borderColor: '#EC4899', backgroundColor: 'rgba(236,72,153,0.1)' },
    productSelectName: { color: '#FFF', fontWeight: '600' },
    productSelectPrice: { color: '#71717A', fontSize: 12 },

    addBtn: { backgroundColor: '#333', justifyContent: 'center', paddingHorizontal: 24, borderRadius: 12, marginBottom: 16 },
    btnText: { color: '#FFF', fontWeight: '700' },

    billItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
    billItemName: { color: '#D1D5DB' },
    billItemPrice: { color: '#FFF', fontWeight: '700' },

    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 24 },
    totalLabel: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    totalValue: { color: '#EC4899', fontSize: 24, fontWeight: '900' },

    completeBtn: { backgroundColor: '#EC4899', padding: 16, borderRadius: 16, alignItems: 'center' },
    completeBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16, textTransform: 'uppercase' }
});
