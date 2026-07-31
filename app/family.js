import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, Plus, Shield, ShieldCheck, Heart, Calendar } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function FamilyScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('tree');

    // 1. Family Tree
    const [members, setMembers] = useState([
        { id: '1', name: 'Reddy', relation: 'Self' },
        { id: '2', name: 'Ananya', relation: 'Spouse' },
        { id: '3', name: 'Aarav', relation: 'Child' },
        { id: '4', name: 'V. R. Reddy', relation: 'Father' }
    ]);
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');

    // 2. Shared Savings
    const [savingsGoal] = useState(500000);
    const [savingsList, setSavingsList] = useState([
        { id: 's1', member: 'Reddy', amount: 150000 },
        { id: 's2', member: 'Ananya', amount: 85000 }
    ]);
    const [saveAmt, setSaveAmt] = useState('');
    const [saveMember, setSaveMember] = useState('');

    // 3. Insurance Coverage
    const [policies, setPolicies] = useState([
        { id: 'p1', name: 'Star Family Optima Health', sum: 1500000, premium: 28000, renewal: '2026-10-15' }
    ]);
    const [newInsName, setNewInsName] = useState('');
    const [newInsSum, setNewInsSum] = useState('');
    const [newInsPremium, setNewInsPremium] = useState('');
    const [newInsRenewal, setNewInsRenewal] = useState('');

    // 4. Family Assets
    const [assets, setAssets] = useState([
        { id: 'a1', name: 'Ancestral Gold (250g)', type: 'Gold', value: 1850000 }
    ]);
    const [newAssetName, setNewAssetName] = useState('');
    const [newAssetVal, setNewAssetVal] = useState('');

    // 5. Health Records
    const [health, setHealth] = useState([
        { id: 'h1', name: 'V. R. Reddy (Father)', bp: '130/85', sugar: '140 mg/dL', notes: 'Bp tablet daily 10 PM' }
    ]);
    const [newHName, setNewHName] = useState('');
    const [newHBP, setNewHBP] = useState('');
    const [newHSugar, setNewHSugar] = useState('');
    const [newHNotes, setNewHNotes] = useState('');

    // 6. Child Care
    const [schoolFees, setSchoolFees] = useState([
        { id: 'f1', term: 'First Term 2026', amount: 85000, status: 'PAID' },
        { id: 'f2', term: 'Second Term 2026', amount: 85000, status: 'UNPAID' }
    ]);

    // 7. Parents Care
    const [pills, setPills] = useState([
        { id: 'p1', name: 'Atorvastatin 10mg', dosage: '1 pill daily', time: '10 PM' }
    ]);

    return (
        <View style={styles.container}>
            <View style={styles.statusBarSpacer} />
            
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle}>Family Circle</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Horizontal Sub-tabs */}
            <View style={{ height: 44, backgroundColor: '#09090B' }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {[
                        { id: 'tree', name: '1. Family Tree' },
                        { id: 'savings', name: '2. Shared Savings' },
                        { id: 'insurance', name: '3. Insurance' },
                        { id: 'assets', name: '4. Family Assets' },
                        { id: 'health', name: '5. Health Vault' },
                        { id: 'childcare', name: '6. Child Care' },
                        { id: 'eldercare', name: '7. Parents Care' }
                    ].map(tab => (
                        <Pressable 
                            key={tab.id}
                            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
                            onPress={() => setActiveTab(tab.id)}
                        >
                            <Text style={[styles.tabItemText, activeTab === tab.id && styles.tabItemTextActive]}>{tab.name}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                {/* 1. Family Tree */}
                {activeTab === 'tree' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Dynamic Family Tree Nodes</Text>
                        
                        <View style={styles.form}>
                            <TextInput 
                                placeholder="Name" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                            />
                            <TextInput 
                                placeholder="Relation (e.g. Spouse, Child)" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={relation}
                                onChangeText={setRelation}
                            />
                            <Pressable 
                                style={styles.submitBtn}
                                onPress={() => {
                                    if (!name || !relation) return;
                                    setMembers([...members, { id: Date.now().toString(), name, relation }]);
                                    setName('');
                                    setRelation('');
                                }}
                            >
                                <Text style={styles.submitBtnText}>Add Member Node</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.subHeader}>Family Structure</Text>
                        {members.map(m => (
                            <View key={m.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>{m.name}</Text>
                                <Text style={styles.itemVal}>{m.relation}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 2. Shared Savings */}
                {activeTab === 'savings' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Joint Family Goal Deposits</Text>
                        <Text style={styles.infoText}>Goal Target: ₹{savingsGoal.toLocaleString()}</Text>

                        <View style={styles.form}>
                            <TextInput 
                                placeholder="Depositer Member" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={saveMember}
                                onChangeText={setSaveMember}
                            />
                            <TextInput 
                                placeholder="Deposit Amount (₹)" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                keyboardType="numeric"
                                value={saveAmt}
                                onChangeText={setSaveAmt}
                            />
                            <Pressable 
                                style={styles.submitBtn}
                                onPress={() => {
                                    if (!saveMember || !saveAmt) return;
                                    setSavingsList([...savingsList, { id: Date.now().toString(), member: saveMember, amount: parseFloat(saveAmt) }]);
                                    setSaveMember('');
                                    setSaveAmt('');
                                }}
                            >
                                <Text style={styles.submitBtnText}>Record Deposit</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.subHeader}>Saving Log</Text>
                        {savingsList.map(s => (
                            <View key={s.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>{s.member}</Text>
                                <Text style={styles.itemVal}>₹{s.amount.toLocaleString()}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 3. Insurance */}
                {activeTab === 'insurance' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Family Insurance Coverage Policies</Text>
                        
                        <View style={styles.form}>
                            <TextInput 
                                placeholder="Insurer / Policy Name" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={newInsName}
                                onChangeText={setNewInsName}
                            />
                            <TextInput 
                                placeholder="Sum Assured (₹)" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                keyboardType="numeric"
                                value={newInsSum}
                                onChangeText={setNewInsSum}
                            />
                            <TextInput 
                                placeholder="Annual Premium (₹)" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                keyboardType="numeric"
                                value={newInsPremium}
                                onChangeText={setNewInsPremium}
                            />
                            <TextInput 
                                placeholder="Next Renewal Date" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={newInsRenewal}
                                onChangeText={setNewInsRenewal}
                            />
                            <Pressable 
                                style={styles.submitBtn}
                                onPress={() => {
                                    if (!newInsName || !newInsSum || !newInsPremium || !newInsRenewal) return;
                                    const newP = {
                                        id: Date.now().toString(),
                                        name: newInsName,
                                        sum: parseFloat(newInsSum),
                                        premium: parseFloat(newInsPremium),
                                        renewal: newInsRenewal
                                    };
                                    setPolicies([...policies, newP]);
                                    setNewInsName('');
                                    setNewInsSum('');
                                    setNewInsPremium('');
                                    setNewInsRenewal('');
                                }}
                            >
                                <Text style={styles.submitBtnText}>Record Policy</Text>
                            </Pressable>
                        </View>

                        {policies.map(p => (
                            <View key={p.id} style={styles.subCard}>
                                <Text style={styles.subCardTitle}>{p.name}</Text>
                                <Text style={styles.subCardDesc}>Sum Assured: ₹{p.sum.toLocaleString()}</Text>
                                <Text style={styles.subCardDesc}>Premium: ₹{p.premium.toLocaleString()} / yr (Renewal: {p.renewal})</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 4. Family Assets */}
                {activeTab === 'assets' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Joint Assets Catalog</Text>

                        <View style={styles.form}>
                            <TextInput 
                                placeholder="Asset Name" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={newAssetName}
                                onChangeText={setNewAssetName}
                            />
                            <TextInput 
                                placeholder="Value (₹)" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                keyboardType="numeric"
                                value={newAssetVal}
                                onChangeText={setNewAssetVal}
                            />
                            <Pressable 
                                style={styles.submitBtn}
                                onPress={() => {
                                    if (!newAssetName || !newAssetVal) return;
                                    setAssets([...assets, { id: Date.now().toString(), name: newAssetName, type: 'Asset', value: parseFloat(newAssetVal) }]);
                                    setNewAssetName('');
                                    setNewAssetVal('');
                                }}
                            >
                                <Text style={styles.submitBtnText}>Save Asset</Text>
                            </Pressable>
                        </View>

                        {assets.map(a => (
                            <View key={a.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>{a.name}</Text>
                                <Text style={styles.itemVal}>₹{a.value.toLocaleString()}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 5. Health Vault */}
                {activeTab === 'health' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Family Health Vault & Records</Text>

                        <View style={styles.form}>
                            <TextInput 
                                placeholder="Member Name" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={newHName}
                                onChangeText={setNewHName}
                            />
                            <TextInput 
                                placeholder="Blood Pressure" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={newHBP}
                                onChangeText={setNewHBP}
                            />
                            <TextInput 
                                placeholder="Sugar Levels" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={newHSugar}
                                onChangeText={setNewHSugar}
                            />
                            <TextInput 
                                placeholder="Prescription / Notes" 
                                placeholderTextColor="#52525B" 
                                style={styles.input}
                                value={newHNotes}
                                onChangeText={setNewHNotes}
                            />
                            <Pressable 
                                style={styles.submitBtn}
                                onPress={() => {
                                    if (!newHName) return;
                                    setHealth([...health, { id: Date.now().toString(), name: newHName, bp: newHBP || 'N/A', sugar: newHSugar || 'N/A', notes: newHNotes || 'None' }]);
                                    setNewHName('');
                                    setNewHBP('');
                                    setNewHSugar('');
                                    setNewHNotes('');
                                }}
                            >
                                <Text style={styles.submitBtnText}>Save Log</Text>
                            </Pressable>
                        </View>

                        {health.map(h => (
                            <View key={h.id} style={styles.subCard}>
                                <Text style={styles.subCardTitle}>{h.name}</Text>
                                <Text style={styles.subCardDesc}>BP: {h.bp} | Sugar: {h.sugar}</Text>
                                <Text style={styles.subCardDesc}>Notes: {h.notes}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 6. Child Care */}
                {activeTab === 'childcare' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Child Care & School Fee Ledger</Text>
                        
                        {schoolFees.map(fee => (
                            <View key={fee.id} style={styles.itemRow}>
                                <Text style={styles.itemName}>{fee.term}</Text>
                                <View style={styles.row}>
                                    <Text style={[styles.itemVal, { marginRight: 10 }]}>₹{fee.amount.toLocaleString()}</Text>
                                    <Pressable 
                                        style={[styles.doneBtn, fee.status === 'PAID' ? { backgroundColor: '#10B981' } : { backgroundColor: '#EF4444' }]}
                                        onPress={() => setSchoolFees(schoolFees.map(f => f.id === fee.id ? { ...f, status: f.status === 'PAID' ? 'UNPAID' : 'PAID' } : f))}
                                    >
                                        <Text style={styles.doneBtnText}>{fee.status}</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* 7. Parents Care */}
                {activeTab === 'eldercare' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Parents Elderly Care Logs</Text>
                        
                        {pills.map(p => (
                            <View key={p.id} style={styles.reminderRow}>
                                <Calendar size={18} color="#EF4444" />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.itemName}>{p.name}</Text>
                                    <Text style={styles.subCardDesc}>{p.dosage}</Text>
                                </View>
                                <Text style={styles.reminderStatus}>{p.time}</Text>
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
    tabItemActive: { backgroundColor: '#EC4899' },
    tabItemText: { color: '#71717A', fontSize: 12, fontWeight: '750' },
    tabItemTextActive: { color: '#FFF' },
    contentScroll: { flex: 1, padding: 20 },
    card: { backgroundColor: '#101012', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#FFFFFF05' },
    cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 16 },
    form: { gap: 12, marginBottom: 20 },
    input: { backgroundColor: '#000', color: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#27272A', fontSize: 13 },
    submitBtn: { backgroundColor: '#EC4899', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    submitBtnText: { color: '#FFF', fontWeight: '800' },
    subHeader: { color: '#FFF', fontSize: 14, fontWeight: '750', marginBottom: 12 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF05', alignItems: 'center' },
    itemName: { color: '#D4D4D8', fontSize: 13, flex: 1 },
    itemVal: { color: '#FFF', fontSize: 13, fontWeight: '750' },
    infoText: { color: '#71717A', fontSize: 12, marginBottom: 16 },
    subCard: { backgroundColor: '#000', padding: 14, borderRadius: 12, gap: 4, marginTop: 12 },
    subCardTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    subCardDesc: { color: '#71717A', fontSize: 12 },
    row: { flexDirection: 'row', alignItems: 'center' },
    doneBtn: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    doneBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    reminderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF05' },
    reminderStatus: { color: '#71717A', fontSize: 12 }
});
