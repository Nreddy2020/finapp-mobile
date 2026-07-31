import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, MapPin, Clock, Utensils, Camera, Bus } from 'lucide-react-native';

export default function TripItinerary({ visible, onClose }) {
    const [days, setDays] = useState([
        {
            day: 'Day 1', date: '12 Nov', activities: [
                { id: 1, time: '10:00 AM', title: 'Arrival & Check-in', type: 'travel', icon: Bus },
                { id: 2, time: '01:00 PM', title: 'Lunch at City Centre', type: 'food', icon: Utensils },
                { id: 3, time: '04:00 PM', title: 'Sunset Viewpoint', type: 'sight', icon: Camera },
            ]
        },
        {
            day: 'Day 2', date: '13 Nov', activities: [
                { id: 4, time: '09:00 AM', title: 'Museum Tour', type: 'sight', icon: MapPin },
                { id: 5, time: '08:00 PM', title: 'Dinner Cruise', type: 'food', icon: Utensils },
            ]
        }
    ]);

    const [selectedDay, setSelectedDay] = useState('Day 1');

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <MapPin size={24} color="#6366F1" />
                            <Text style={styles.title}>Trip Itinerary</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    {/* Day Selector */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={{ gap: 12 }}>
                        {days.map((d) => (
                            <TouchableOpacity
                                key={d.day}
                                style={[styles.dayTab, selectedDay === d.day && styles.activeDayTab]}
                                onPress={() => setSelectedDay(d.day)}
                            >
                                <Text style={[styles.dayText, selectedDay === d.day && styles.activeDayText]}>{d.day}</Text>
                                <Text style={[styles.dateText, selectedDay === d.day && styles.activeDateText]}>{d.date}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.addDayBtn}>
                            <Text style={styles.addDayText}>+</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Timeline */}
                    <ScrollView style={styles.timeline}>
                        {days.find(d => d.day === selectedDay)?.activities.map((item, index, arr) => {
                            const Icon = item.icon;
                            return (
                                <View key={item.id} style={styles.activityRow}>
                                    <View style={styles.timeCol}>
                                        <Text style={styles.timeText}>{item.time}</Text>
                                    </View>

                                    <View style={styles.timelineLineContainer}>
                                        <View style={[styles.dot, { backgroundColor: item.type === 'food' ? '#F59E0B' : item.type === 'sight' ? '#10B981' : '#3B82F6' }]} />
                                        {index !== arr.length - 1 && <View style={styles.line} />}
                                    </View>

                                    <View style={styles.activityCard}>
                                        <View style={[styles.iconBox, { backgroundColor: item.type === 'food' ? '#F59E0B20' : item.type === 'sight' ? '#10B98120' : '#3B82F620' }]}>
                                            <Icon size={16} color={item.type === 'food' ? '#F59E0B' : item.type === 'sight' ? '#10B981' : '#3B82F6'} />
                                        </View>
                                        <Text style={styles.activityTitle}>{item.title}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>

                    <TouchableOpacity style={styles.addBtn}>
                        <Text style={styles.addBtnText}>+ Add Activity</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    dayScroll: { maxHeight: 60, marginBottom: 24 },
    dayTab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#27272A', alignItems: 'center', minWidth: 70 },
    activeDayTab: { backgroundColor: '#6366F1' },
    dayText: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 2 },
    activeDayText: { color: '#FFF' },
    dateText: { color: '#71717A', fontSize: 10 },
    activeDateText: { color: '#E0E7FF' },
    addDayBtn: { width: 50, borderRadius: 12, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },
    addDayText: { color: '#A1A1AA', fontSize: 20 },
    timeline: { flex: 1 },
    activityRow: { flexDirection: 'row', gap: 12, marginBottom: 0, minHeight: 80 },
    timeCol: { width: 60, alignItems: 'flex-end', paddingTop: 12 },
    timeText: { color: '#71717A', fontSize: 11, fontWeight: '600' },
    timelineLineContainer: { alignItems: 'center', width: 20 },
    dot: { width: 12, height: 12, borderRadius: 6, marginTop: 14, zIndex: 10, borderWidth: 2, borderColor: '#18181B' },
    line: { width: 2, flex: 1, backgroundColor: '#3F3F46', position: 'absolute', top: 14, bottom: -14 },
    activityCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#27272A', borderRadius: 16, padding: 12, marginBottom: 16, height: 60 },
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    activityTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
    addBtn: { backgroundColor: '#3F3F46', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
    addBtnText: { color: '#FFF', fontWeight: '700' }
});
