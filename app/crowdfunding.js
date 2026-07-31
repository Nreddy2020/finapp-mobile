import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, Image, Modal, TextInput, Alert, FlatList } from 'react-native';
import { Heart, ChevronLeft, Share2, Users, TrendingUp, Plus } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import LuxuryEmptyState from '../components/ui/LuxuryEmptyState';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CrowdfundingService } from '../services/crowdfunding';

export default function CrowdfundingScreen() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [target, setTarget] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Medical');

    const [donateModalVisible, setDonateModalVisible] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [donationAmount, setDonationAmount] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await CrowdfundingService.getCampaigns();
        setCampaigns(data);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!title || !target) {
            Alert.alert('Missing Fields', 'Title and Target Amount are required.');
            return;
        }

        const newCampaign = {
            title,
            target,
            description,
            category
        };

        const updated = await CrowdfundingService.createCampaign(newCampaign);
        setCampaigns(updated);
        setModalVisible(false);
        resetForm();
    };

    const resetForm = () => {
        setTitle('');
        setTarget('');
        setDescription('');
        setCategory('Medical');
    };

    const handleDonate = async () => {
        if (!donationAmount) return;
        const updated = await CrowdfundingService.donateToCampaign(selectedCampaign.id, donationAmount);
        setCampaigns(updated);
        setDonateModalVisible(false);
        setDonationAmount('');
        Alert.alert('Thank You!', `You donated ₹${donationAmount} to ${selectedCampaign.title}`);
    };

    const getProgress = (raised, target) => {
        if (target <= 0) return 0;
        const p = (raised / target) * 100;
        return p > 100 ? 100 : p;
    };

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Impact Fund</Text>
                <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Plus color="#FFFFFF" size={24} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {campaigns.length === 0 ? (
                    <LuxuryEmptyState
                        title="No Campaigns"
                        subtitle="Start a fundraiser or donate to a cause."
                        icon={Heart}
                        themeColor="#EC4899"
                    />
                ) : (
                    campaigns.map((camp, index) => {
                        const progress = getProgress(camp.raised, camp.target);

                        return (
                            <LuxuryCard key={camp.id} index={index} style={styles.campaignCard} onPress={() => {
                                setSelectedCampaign(camp);
                                setDonateModalVisible(true);
                            }}>
                                <Image
                                    source={{ uri: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=200&auto=format&fit=crop' }}
                                    style={styles.campaignImage}
                                />
                                <LinearGradient
                                    colors={['transparent', '#000000']}
                                    style={styles.imageOverlay}
                                />
                                <View style={styles.campaignMeta}>
                                    <View style={styles.tag}><Text style={styles.tagText}>{camp.category}</Text></View>
                                    <Text style={styles.campaignTitle}>{camp.title}</Text>
                                    <View style={styles.statsRow}>
                                        <Text style={styles.raised}>₹{camp.raised.toLocaleString()}</Text>
                                        <Text style={styles.target}>of ₹{camp.target.toLocaleString()}</Text>
                                    </View>

                                    <View style={styles.barBg}>
                                        <LinearGradient
                                            colors={['#EC4899', '#8B5CF6']}
                                            style={[styles.barFill, { width: `${progress}%` }]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        />
                                    </View>

                                    <View style={styles.footerRow}>
                                        <Text style={styles.donors}>{camp.donors} donors</Text>
                                        <Pressable style={styles.donateBtnSmall}>
                                            <Text style={styles.donateText}>Donate</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </LuxuryCard>
                        );
                    })
                )}

            </ScrollView>

            {/* Create Modal */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Start Fundraiser</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Title (e.g. Help Ravi)"
                            placeholderTextColor="#666"
                            value={title}
                            onChangeText={setTitle}
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Target (₹)"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={target}
                                onChangeText={setTarget}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Category"
                                placeholderTextColor="#666"
                                value={category}
                                onChangeText={setCategory}
                            />
                        </View>
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleCreate}>
                                <Text style={styles.btnText}>Create</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Donate Modal */}
            <Modal visible={donateModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Donate to {selectedCampaign?.title}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Amount (₹)"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={donationAmount}
                            onChangeText={setDonationAmount}
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setDonateModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleDonate}>
                                <Text style={styles.btnText}>Donate</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#EC4899' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },

    campaignCard: { height: 320, padding: 0, overflow: 'hidden', marginBottom: 24, borderWidth: 0, backgroundColor: '#18181B' },
    campaignImage: { width: '100%', height: '100%' },
    imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 250 },
    campaignMeta: { position: 'absolute', bottom: 20, left: 20, right: 20 },
    tag: { backgroundColor: '#EC4899', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
    tagText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
    campaignTitle: { color: '#FFF', fontSize: 22, fontWeight: '700', lineHeight: 28, marginBottom: 12 },

    statsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 },
    raised: { fontSize: 18, fontWeight: '900', color: '#FFF' },
    target: { fontSize: 13, color: '#A1A1AA' },

    barBg: { height: 6, backgroundColor: '#FFFFFF20', borderRadius: 4, marginBottom: 16, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },

    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    donors: { color: '#10B981', fontSize: 12, fontWeight: '600' },
    donateBtnSmall: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    donateText: { color: '#000', fontWeight: '700', fontSize: 12 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 16 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, backgroundColor: '#333', borderRadius: 16, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 16, backgroundColor: '#EC4899', borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
