import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Building2, Plus, DollarSign, Users, ClipboardList } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function BusinessScreen() {
    const router = useRouter();
    const [selectedBiz, setSelectedBiz] = useState('kirana');

    // Apartment
    const [flats, setFlats] = useState([
        { id: '101', flatNo: '101', owner: 'Suresh Rao', maintenance: 4500, status: 'PAID' },
        { id: '102', flatNo: '102', owner: 'Vikram Singh', maintenance: 4500, status: 'UNPAID' }
    ]);

    // Kirana Shop
    const [kiranaSales, setKiranaSales] = useState([
        { id: 'k1', item: 'Aashirvaad Atta 5kg', price: 290, qty: 2 }
    ]);
    const [item, setItem] = useState('');
    const [price, setPrice] = useState('');

    // Hostel Business
    const [beds, setBeds] = useState([
        { id: 'b1', room: '101', bed: 'A', status: 'OCCUPIED', tenant: 'Karan Malhotra' },
        { id: 'b2', room: '101', bed: 'B', status: 'VACANT', tenant: '' }
    ]);
    const [hRoom, setHRoom] = useState('');
    const [hBed, setHBed] = useState('');
    const [hTenant, setHTenant] = useState('');

    // Sweet Shop
    const [batches, setBatches] = useState([
        { id: 's1', name: 'Premium Motichoor Ladoo', qty: '15 Kgs', date: 'Today' }
    ]);

    // Farmer
    const [farmerCrops, setFarmerCrops] = useState([
        { id: 'f1', name: 'Basmati Paddy (A-Block)', acreage: 5, status: 'NPK Level: Good' }
    ]);

    // Fruits
    const [shipments, setShipments] = useState([
        { id: 'sh1', type: 'Alphonso Mangoes', crates: 120, status: 'IN_TRANSIT' }
    ]);

    // Clothes
    const [boutique, setBoutique] = useState([
        { id: 'c1', design: 'Red Silk Saree', stock: 12, price: 6500 }
    ]);

    // Milk
    const [milkClients, setMilkClients] = useState([
        { id: 'm1', customer: 'Vilas Villa #12', liters: 4, rate: 62 }
    ]);

    // Real Estate
    const [leads, setLeads] = useState([
        { id: 'l1', name: 'Manoj Bajpayee', plot: 'Meadow Plot #42', budget: 8500000, status: 'VISIT_SCHEDULED' }
    ]);

    // Hospital Outpatient
    const [queue, setQueue] = useState([
        { id: 'q1', patient: 'Srinivas Murthy', token: 12, room: 'Room #3 (Dr. Shastri)' }
    ]);

    return (
        <View style={styles.container}>
            <View style={styles.statusBarSpacer} />
            
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle}>Business CRM</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Horizontal Sub-tabs */}
            <View style={{ height: 44, backgroundColor: '#09090B' }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {[
                        { id: 'kirana', name: '1. Kirana Shop' },
                        { id: 'hostel', name: '2. Hostel' },
                        { id: 'apartment', name: '3. Apartment' },
                        { id: 'sweet', name: '4. Sweet Shop' },
                        { id: 'farmer', name: '5. Farmer Yield' },
                        { id: 'fruits', name: '6. Fruit Trade' },
                        { id: 'clothes', name: '7. Boutique' },
                        { id: 'milk', name: '8. Milk Dairy' },
                        { id: 'realestate', name: '9. Real Estate' },
                        { id: 'hospital', name: '10. Hospital OP' }
                    ].map(tab => (
                        <Pressable 
                            key={tab.id}
                            style={[styles.tabItem, selectedBiz === tab.id && styles.tabItemActive]}
                            onPress={() => setSelectedBiz(tab.id)}
                        >
                            <Text style={[styles.tabItemText, selectedBiz === tab.id && styles.tabItemTextActive]}>{tab.name}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                {/* 1. Kirana Shop */}
                {selectedBiz === 'kirana' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Kirana Sales register</Text>
                        
                        <View style={styles.form}>
                            <TextInput 
                                placeholder="Item Name" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={item}
                                onChangeText={setItem}
                            />
                            <TextInput 
                                placeholder="Price (₹)" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                keyboardType="numeric"
                                value={price}
                                onChangeText={setPrice}
                            />
                            <Pressable 
                                style={styles.submitBtn}
                                onPress={() => {
                                    if (!item || !price) return;
                                    setKiranaSales([...kiranaSales, { id: Date.now().toString(), item, price: parseFloat(price), qty: 1 }]);
                                    setItem('');
                                    setPrice('');
                                }}
                            >
                                <Text style={styles.submitBtnText}>Log Sale</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.subHeader}>Today's sales</Text>
                        {kiranaSales.map(s => (
                            <View key={s.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>{s.item}</Text>
                                <Text style={styles.itemVal}>₹{s.price} x {s.qty}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 2. Hostel */}
                {selectedBiz === 'hostel' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Hostel Room Grid Manager</Text>
                        
                        <View style={styles.form}>
                            <TextInput 
                                placeholder="Room No" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={hRoom}
                                onChangeText={setHRoom}
                            />
                            <TextInput 
                                placeholder="Bed Letter" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={hBed}
                                onChangeText={setHBed}
                            />
                            <TextInput 
                                placeholder="Tenant Name" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={hTenant}
                                onChangeText={setHTenant}
                            />
                            <Pressable 
                                style={styles.submitBtn}
                                onPress={() => {
                                    if (!hRoom || !hBed || !hTenant) return;
                                    setBeds([...beds, { id: Date.now().toString(), room: hRoom, bed: hBed, status: 'OCCUPIED', tenant: hTenant }]);
                                    setHRoom('');
                                    setHBed('');
                                    setHTenant('');
                                }}
                            >
                                <Text style={styles.submitBtnText}>Save Tenant</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.subHeader}>Bed Status</Text>
                        {beds.map(b => (
                            <View key={b.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>Room {b.room} Bed {b.bed}</Text>
                                <Text style={styles.itemVal}>{b.status === 'OCCUPIED' ? b.tenant : 'VACANT'}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 3. Apartment */}
                {selectedBiz === 'apartment' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Maintenance Tracker</Text>
                        {flats.map(f => (
                            <View key={f.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>Flat {f.flatNo} ({f.owner})</Text>
                                <View style={styles.row}>
                                    <Text style={[styles.itemVal, { marginRight: 10 }]}>₹{f.maintenance}</Text>
                                    <Pressable 
                                        style={[styles.doneBtn, f.status === 'PAID' ? { backgroundColor: '#10B981' } : { backgroundColor: '#EF4444' }]}
                                        onPress={() => setFlats(flats.map(item => item.id === f.id ? { ...item, status: item.status === 'PAID' ? 'UNPAID' : 'PAID' } : item))}
                                    >
                                        <Text style={styles.doneBtnText}>{f.status}</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* 4. Sweet Shop */}
                {selectedBiz === 'sweet' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Sweet Batch shelf-life alerts</Text>
                        {batches.map(b => (
                            <View key={b.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>{b.name}</Text>
                                <Text style={styles.itemVal}>{b.qty} ({b.date})</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 5. Farmer Yield */}
                {selectedBiz === 'farmer' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Crops Yield estimator</Text>
                        {farmerCrops.map(c => (
                            <View key={c.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>{c.name}</Text>
                                <Text style={styles.itemVal}>{c.acreage} Acres - {c.status}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 6. Fruit Trade */}
                {selectedBiz === 'fruits' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Wholesale Shipment Logistics</Text>
                        {shipments.map(s => (
                            <View key={s.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>{s.type}</Text>
                                <Text style={styles.itemVal}>{s.crates} Crates - {s.status}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 7. Boutique */}
                {selectedBiz === 'clothes' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Boutique stock inventory</Text>
                        {boutique.map(b => (
                            <View key={b.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>{b.design}</Text>
                                <Text style={styles.itemVal}>{b.stock} left @ ₹{b.price.toLocaleString()}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 8. Milk Dairy */}
                {selectedBiz === 'milk' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Daily dairy supply record</Text>
                        {milkClients.map(m => (
                            <View key={m.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>{m.customer}</Text>
                                <Text style={styles.itemVal}>{m.liters} L/day @ ₹{m.rate}/L</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 9. Real Estate */}
                {selectedBiz === 'realestate' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Real estate site visits booking</Text>
                        {leads.map(l => (
                            <View key={l.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>{l.name}</Text>
                                <Text style={styles.itemVal}>{l.plot} - {l.status}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 10. Hospital OP */}
                {selectedBiz === 'hospital' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Patient OPD Queue dispatcher</Text>
                        {queue.map(q => (
                            <View key={q.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>Token #{q.token}: {q.patient}</Text>
                                <Text style={styles.itemVal}>{q.room}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    statusBarSpacer: { height: 40 },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
    backBtn: { padding: 8 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '850' },
    tabScroll: { paddingHorizontal: 16, height: 44, alignItems: 'center' },
    tabItem: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, backgroundColor: '#101012', marginRight: 8 },
    tabItemActive: { backgroundColor: '#F59E0B' },
    tabItemText: { color: '#71717A', fontSize: 12, fontWeight: '750' },
    tabItemTextActive: { color: '#FFF' },
    contentScroll: { flex: 1, padding: 20 },
    card: { backgroundColor: '#101012', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#FFFFFF05' },
    cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 16 },
    form: { gap: 12, marginBottom: 20 },
    input: { backgroundColor: '#000', color: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#27272A', fontSize: 13 },
    submitBtn: { backgroundColor: '#F59E0B', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    submitBtnText: { color: '#FFF', fontWeight: '800' },
    subHeader: { color: '#FFF', fontSize: 14, fontWeight: '750', marginBottom: 12 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF05', alignItems: 'center' },
    itemName: { color: '#D4D4D8', fontSize: 13, flex: 1 },
    itemVal: { color: '#FFF', fontSize: 13, fontWeight: '750' },
    row: { flexDirection: 'row', alignItems: 'center' },
    doneBtn: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    doneBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' }
});
