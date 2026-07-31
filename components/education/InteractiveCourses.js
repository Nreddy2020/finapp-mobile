import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { X, PlayCircle, CheckCircle, Lock, BookOpen } from 'lucide-react-native';

export default function InteractiveCourses({ visible, onClose }) {
    const [lessons, setLessons] = useState([
        { id: 1, title: 'Introduction to Stocks', duration: '5:00', status: 'completed' },
        { id: 2, title: 'Understanding Risk', duration: '8:30', status: 'playing' },
        { id: 3, title: 'Diversification Strategy', duration: '12:00', status: 'locked' },
        { id: 4, title: 'Advanced Charts', duration: '15:45', status: 'locked' },
    ]);

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <BookOpen size={24} color="#3B82F6" />
                            <Text style={styles.title}>Interactive Courses</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    {/* Video Player Placeholder */}
                    <View style={styles.videoPlayer}>
                        <View style={styles.playOverlay}>
                            <PlayCircle size={48} color="#FFF" />
                            <Text style={styles.playingText}>Playing: Understanding Risk</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Course Content</Text>

                    <ScrollView style={styles.list}>
                        {lessons.map((lesson) => (
                            <TouchableOpacity key={lesson.id} style={[styles.lessonRow, lesson.status === 'playing' && styles.activeRow]}>
                                <View style={styles.rowLeft}>
                                    {lesson.status === 'completed' ? (
                                        <CheckCircle size={20} color="#10B981" />
                                    ) : lesson.status === 'locked' ? (
                                        <Lock size={20} color="#52525B" />
                                    ) : (
                                        <PlayCircle size={20} color="#3B82F6" />
                                    )}
                                    <View>
                                        <Text style={[styles.lessonTitle, lesson.status === 'locked' && { color: '#52525B' }]}>
                                            {lesson.title}
                                        </Text>
                                        <Text style={styles.lessonDuration}>{lesson.duration}</Text>
                                    </View>
                                </View>
                                {lesson.status === 'playing' && (
                                    <View style={styles.playingIndicator}>
                                        <View style={styles.bar} />
                                        <View style={[styles.bar, { height: 8 }]} />
                                        <View style={styles.bar} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.quizBtn}>
                        <Text style={styles.quizBtnText}>Take Chapter Quiz</Text>
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
    videoPlayer: { height: 180, backgroundColor: '#27272A', borderRadius: 16, marginBottom: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    playOverlay: { alignItems: 'center', gap: 8 },
    playingText: { color: '#FFF', fontWeight: '600' },
    sectionTitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    list: { flex: 1 },
    lessonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#27272A' },
    activeRow: { backgroundColor: '#3B82F620', borderColor: '#3B82F6', borderWidth: 1 },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    lessonTitle: { color: '#FFF', fontWeight: '600', fontSize: 14 },
    lessonDuration: { color: '#A1A1AA', fontSize: 12 },
    playingIndicator: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 12 },
    bar: { width: 3, height: '100%', backgroundColor: '#3B82F6', borderRadius: 2 },
    quizBtn: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
    quizBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});
