import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Modal, Pressable, Linking, TouchableOpacity, TextInput } from 'react-native';
import { Users, Plus, Heart, Sparkles, Shield, Phone, Mail, Calendar as CalendarIcon, Droplet, X, CreditCard, TrendingUp, CheckCircle, AlertCircle, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FamilyService } from '../../services/family';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StatCard from '../../components/ui/StatCard';
import StackHeader from '../../components/ui/StackHeader';

export default function FamilyScreen() {
    const [members, setMembers] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Form
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');
    const [age, setAge] = useState('');
    const [birthday, setBirthday] = useState('');

    const fetchMembers = async () => {
        // await FamilyService.seedDefaults(); // Optional: seed if needed
        const data = await FamilyService.getMembers();
        setMembers(data);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMembers();
    };

    const handleAddMember = async () => {
        if (!name || !relation) return;
        await FamilyService.addMember({ name, relation, age, birthday });
        setModalVisible(false);
        setName('');
        setRelation('');
        setAge('');
        setBirthday('');
        fetchMembers();
    };

    const handleDeleteMember = async (id) => {
        await FamilyService.deleteMember(id);
        setSelectedMember(null);
        fetchMembers();
    };

    const totalCovered = members.filter(m => m.coverage).length;
    const totalIncome = members.reduce((sum, m) => sum + (m.income || 0), 0);
    const THEME_COLOR = '#DB2777'; // Pink

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={THEME_COLOR}
                        colors={[THEME_COLOR]}
                        progressBackgroundColor="#18181B"
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                <StackHeader title="Family" subtitle="Loved Ones" />

                {/* Hero Stats */}
                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={[`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>Members Covered</Text>
                            <Text style={styles.heroAmount}>{totalCovered}/{members.length}</Text>
                            <View style={styles.heroFooter}>
                                <View style={[styles.heroIconBadge, { backgroundColor: totalCovered === members.length && members.length > 0 ? '#10B981' : '#F59E0B' }]}>
                                    <Shield size={14} color="#FFFFFF" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.heroSubtext}>
                                    {totalCovered === members.length && members.length > 0 ? 'Full family protection' : 'Coverage details pending'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Member List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Family Roster</Text>

                    {members.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <Users size={32} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyText}>No members added</Text>
                            <Text style={styles.emptySubtext}>Add your family to track coverage</Text>
                        </View>
                    ) : (
                        members.map((member, index) => (
                            <LuxuryCard
                                key={member.id}
                                index={index}
                                style={styles.memberCard}
                                onPress={() => setSelectedMember(member)}
                            >
                                <LinearGradient
                                    colors={[`${THEME_COLOR}10`, '#00000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.cardGlow}
                                />
                                <View style={styles.cardIcon}>
                                    <Heart size={24} color={THEME_COLOR} strokeWidth={2.5} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={styles.memberName}>{member.name}</Text>
                                    <View style={styles.roleContainer}>
                                        <Text style={styles.relation}>{member.relation} • {member.age} yrs</Text>
                                    </View>
                                </View>
                                <View style={styles.cardRight}>
                                    {member.coverage && (
                                        <View style={styles.coverageBadge}>
                                            <Shield size={12} color="#10B981" />
                                            <Text style={styles.coverageText}>INSURED</Text>
                                        </View>
                                    )}
                                </View>
                            </LuxuryCard>
                        ))
                    )}
                </View>

                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                    index={members.length + 1}
                >
                    <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                    <Text style={styles.addButtonText}>Add Member</Text>
                </LuxuryCard>
            </ScrollView>

            {/* Add Member Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Family Member</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Name</Text>
                        <TextInput style={styles.input} placeholder="e.g. Rahul" placeholderTextColor="#52525B" value={name} onChangeText={setName} />

                        <Text style={styles.inputLabel}>Relation</Text>
                        <TextInput style={styles.input} placeholder="e.g. Brother" placeholderTextColor="#52525B" value={relation} onChangeText={setRelation} />

                        <Text style={styles.inputLabel}>Age</Text>
                        <TextInput style={styles.input} placeholder="25" placeholderTextColor="#52525B" keyboardType="numeric" value={age} onChangeText={setAge} />

                        <Text style={styles.inputLabel}>Birthday (Optional)</Text>
                        <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#52525B" value={birthday} onChangeText={setBirthday} />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleAddMember}>
                            <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Detail Modal */}
            <Modal visible={selectedMember !== null} transparent animationType="slide" onRequestClose={() => setSelectedMember(null)}>
                <View style={styles.detailModalOverlay}>
                    <View style={styles.detailModalContent}>
                        <View style={styles.detailHeader}>
                            <View>
                                <Text style={styles.detailTitle}>{selectedMember?.name}</Text>
                                <Text style={styles.detailSubtitle}>{selectedMember?.relation}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteMember(selectedMember.id)} style={styles.deleteBtn}>
                                <Trash2 size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.detailBody}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Age</Text>
                                <Text style={styles.infoValue}>{selectedMember?.age} years</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Birthday</Text>
                                <Text style={styles.infoValue}>{selectedMember?.birthday || 'N/A'}</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.closeDetailBtn} onPress={() => setSelectedMember(null)}>
                            <Text style={styles.closeDetailText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 24 },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    heroCardWrapper: { marginHorizontal: 24, marginBottom: 40 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#DB2777', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },
    memberCard: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 140, opacity: 1 },
    cardIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#DB277710', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1, borderColor: '#DB277720' },
    cardContent: { flex: 1 },
    memberName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.3 },
    roleContainer: { flexDirection: 'row', alignItems: 'center' },
    relation: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    cardRight: { alignItems: 'flex-end' },
    coverageBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B98110', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    coverageText: { fontSize: 10, fontWeight: '800', color: '#10B981', letterSpacing: 0.5 },
    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DB277708', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#DB277715' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#DB277750' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#DB2777', letterSpacing: 0.5 },

    // Add Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#18181B', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#333' },
    modalHeader: { flexDirection: 'row', justifyConent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#FFF' },
    inputLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
    input: { backgroundColor: '#000', color: '#FFF', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#3F3F46' },
    saveBtn: { backgroundColor: '#DB2777', padding: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

    // Detail Modal
    detailModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    detailModalContent: { backgroundColor: '#18181B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32 },
    detailHeader: { flexDirection: 'row', justifyConent: 'space-between', marginBottom: 32 },
    detailTitle: { fontSize: 28, fontWeight: '900', color: '#FFF' },
    detailSubtitle: { fontSize: 16, color: '#A1A1AA', marginTop: 4 },
    deleteBtn: { padding: 8, backgroundColor: '#EF444420', borderRadius: 12, marginLeft: 'auto' },
    detailBody: { marginBottom: 32, gap: 16 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF08' },
    infoLabel: { color: '#71717A', fontSize: 14 },
    infoValue: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    closeDetailBtn: { backgroundColor: '#27272A', padding: 16, borderRadius: 16, alignItems: 'center' },
    closeDetailText: { color: '#FFF', fontWeight: '700' }
});
