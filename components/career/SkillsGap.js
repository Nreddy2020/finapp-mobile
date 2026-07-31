import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { X, Radar, TrendingUp, CheckCircle, Plus } from 'lucide-react-native';
import { CareerService } from '../../services/career';

export default function SkillsGap({ visible, onClose }) {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible) loadSkills();
    }, [visible]);

    const loadSkills = async () => {
        const data = await CareerService.getSkills();
        setSkills(data);
        setLoading(false);
    };

    const addSkill = async () => {
        // Simple simulation: Add a placeholder or toggle a form. 
        // For speed, let's add a fixed "New Skill" that user can't edit yet (or random).
        // Or better, let's just add "Advanced JS" as a demo.
        const updated = await CareerService.addSkill('New Skill ' + Math.floor(Math.random() * 100), 10, 80);
        setSkills(updated);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TrendingUp size={24} color="#6366F1" />
                            <Text style={styles.title}>Skills Gap Analysis</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Vizualize your path to the next level.</Text>

                    <ScrollView style={styles.list}>
                        {skills.map((skill) => {
                            const gap = skill.target - skill.current;
                            return (
                                <View key={skill.id} style={styles.card}>
                                    <View style={styles.row}>
                                        <Text style={styles.skillName}>{skill.name}</Text>
                                        <Text style={[styles.gapText, { color: gap > 0 ? '#EF4444' : '#10B981' }]}>
                                            {gap > 0 ? `-${gap}% Gap` : 'On Track'}
                                        </Text>
                                    </View>

                                    <View style={styles.barContainer}>
                                        <View style={[styles.marker, { left: `${skill.target}%` }]} />
                                        <View style={[styles.barFill, { width: `${skill.current}%` }]} />
                                    </View>

                                    <View style={styles.labels}>
                                        <Text style={styles.label}>Current: {skill.current}%</Text>
                                        <Text style={styles.label}>Target: {skill.target}%</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>

                    <TouchableOpacity style={styles.addBtn} onPress={addSkill}>
                        <Plus size={20} color="#FFF" />
                        <Text style={styles.addBtnText}>Add Skill (Demo)</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    list: { marginBottom: 16 },
    card: { marginBottom: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    skillName: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    gapText: { fontSize: 12, fontWeight: '700' },
    barContainer: { height: 8, backgroundColor: '#3F3F46', borderRadius: 4, marginBottom: 4, position: 'relative' },
    barFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 4 },
    marker: { position: 'absolute', top: -2, bottom: -2, width: 2, backgroundColor: '#10B981', zIndex: 10 },
    labels: { flexDirection: 'row', justifyContent: 'space-between' },
    label: { color: '#71717A', fontSize: 10 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3F3F46', padding: 16, borderRadius: 12 },
    addBtnText: { color: '#FFF', fontWeight: '700' }
});
