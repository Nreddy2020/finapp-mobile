import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, Image, Modal, TouchableOpacity } from 'react-native';
import { BookOpen, GraduationCap, Clock, Play, Pause, Award, Search, ChevronRight, ChevronLeft, Home, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import { EducationService } from '../services/education';

export default function EducationHub() {
    const router = useRouter();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Timer State
    const [timerActive, setTimerActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins

    // Mock Modals (Placeholders for now)
    const [showCourses, setShowCourses] = useState(false);
    const [showScholarships, setShowScholarships] = useState(false);
    const [showExams, setShowExams] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await EducationService.getCourses();
        setCourses(data);
        setLoading(false);
    };

    // Timer Logic
    useEffect(() => {
        let interval;
        if (timerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setTimerActive(false);
        }
        return () => clearInterval(interval);
    }, [timerActive, timeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const toggleTimer = () => setTimerActive(!timerActive);

    // Simulate progress update
    const handleStartCourse = async (courseId) => {
        // Mocking "Starting" a course sets progress to 10%
        const updated = await EducationService.updateProgress(courseId, 10);
        setCourses(updated);
    };

    const scholarships = [
        { id: 1, name: 'Global Tech Grant', amount: '₹5,00,000', deadline: '15 Jan 2026', match: 95 },
        { id: 2, name: 'Future Leaders Scholarship', amount: '₹2,50,000', deadline: '28 Feb 2026', match: 80 },
    ];

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <View>
                    <Text style={styles.headerLabel}>KNOWLEDGE BASE</Text>
                    <Text style={styles.title}>Education Hub</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Tools Section */}
                <View style={styles.toolsSection}>
                    <Pressable style={styles.toolBtn}>
                        <View style={[styles.iconBoxSmall, { backgroundColor: '#EC489920' }]}>
                            <Home size={16} color="#EC4899" />
                        </View>
                        <Text style={styles.toolText}>Hostel vs Home Calc</Text>
                        <ArrowRight size={14} color="#71717A" />
                    </Pressable>
                    <Pressable style={styles.toolBtn}>
                        <View style={[styles.iconBoxSmall, { backgroundColor: '#3B82F620' }]}>
                            <Play size={16} color="#3B82F6" />
                        </View>
                        <Text style={styles.toolText}>Interactive Courses</Text>
                        <ArrowRight size={14} color="#71717A" />
                    </Pressable>
                </View>

                {/* Study Timer Card */}
                <View style={styles.timerCardWrapper}>
                    <View style={styles.timerCard}>
                        <LinearGradient
                            colors={['#06B6D440', '#00000000']}
                            style={styles.cardGlow}
                        />
                        <View style={styles.timerContent}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.timerLabel}>DEEP WORK SESSION</Text>
                                <Text style={styles.timerDisplay}>{formatTime(timeLeft)}</Text>
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                    {[15, 25, 50].map(mins => (
                                        <TouchableOpacity 
                                            key={mins} 
                                            style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: timeLeft === mins * 60 ? '#06B6D430' : '#FFFFFF05', borderWidth: 1, borderColor: timeLeft === mins * 60 ? '#06B6D4' : '#FFFFFF08' }}
                                            onPress={() => { setTimerActive(false); setTimeLeft(mins * 60); }}
                                        >
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: timeLeft === mins * 60 ? '#06B6D4' : '#71717A' }}>{mins}m</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            <Pressable style={styles.playBtn} onPress={toggleTimer}>
                                {timerActive ? <Pause size={24} color="#FFF" fill="#FFF" /> : <Play size={24} color="#FFF" fill="#FFF" />}
                            </Pressable>
                        </View>
                        <View style={styles.timerFooter}>
                            <Clock size={14} color="#06B6D4" />
                            <Text style={styles.timerFooterText}>Pomodoro Technique</Text>
                        </View>
                    </View>
                </View>

                {/* Continue Learning */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Your Courses</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coursesScroll}>
                        {courses.map((course, index) => (
                            <LuxuryCard key={course.id} index={index} style={styles.courseCard} onPress={() => handleStartCourse(course.id)}>
                                <View style={styles.courseIcon}>
                                    <BookOpen size={24} color="#06B6D4" />
                                </View>
                                <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                                <View style={styles.courseProgress}>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: `${course.progress}%` }]} />
                                    </View>
                                    <Text style={styles.progressText}>{course.progress}% Completed</Text>
                                </View>
                            </LuxuryCard>
                        ))}
                    </ScrollView>
                </View>

                {/* Scholarships */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Scholarships</Text>
                    {scholarships.map((item, index) => (
                        <LuxuryCard key={item.id} index={index + 3} style={styles.scholarshipCard}>
                            <View style={styles.scholarshipIcon}>
                                <Award size={24} color="#F59E0B" />
                            </View>
                            <View style={styles.scholarshipContent}>
                                <Text style={styles.scholarshipName}>{item.name}</Text>
                                <Text style={styles.scholarshipDeadline}>Deadline: {item.deadline}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.scholarshipAmount}>{item.amount}</Text>
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4 }}>
                                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B98150' }}>
                                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#10B981' }}>{item.match}% MATCH</Text>
                                    </View>
                                    <ChevronRight size={16} color="#71717A" />
                                </View>
                            </View>
                        </LuxuryCard>
                    ))}
                </View>
            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollContent: { paddingBottom: 100 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 16 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF10' },
    headerLabel: { fontSize: 13, color: '#06B6D4', fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
    title: { fontSize: 32, fontWeight: '900', color: '#FFF' },

    toolsSection: { paddingHorizontal: 24, marginBottom: 24, gap: 12 },
    toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#18181B', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    iconBoxSmall: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    toolText: { color: '#FFF', fontWeight: '600', fontSize: 14, flex: 1 },

    timerCardWrapper: { paddingHorizontal: 24, marginBottom: 32 },
    timerCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#FFFFFF10', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    timerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    timerLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    timerDisplay: { fontSize: 48, fontWeight: '900', color: '#FFF', fontVariant: ['tabular-nums'] },
    playBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#06B6D4', justifyContent: 'center', alignItems: 'center', shadowColor: '#06B6D4', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
    timerFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timerFooterText: { color: '#06B6D4', fontSize: 13, fontWeight: '600' },

    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
    coursesScroll: { paddingHorizontal: 24, gap: 16 },

    courseCard: { width: 160, backgroundColor: '#18181B', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF10' },
    courseIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#06B6D420', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    courseTitle: { fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 12, height: 40 },
    courseProgress: {},
    progressBarBg: { height: 4, backgroundColor: '#FFFFFF10', borderRadius: 2, marginBottom: 6 },
    progressBarFill: { height: '100%', backgroundColor: '#06B6D4', borderRadius: 2 },
    progressText: { fontSize: 11, color: '#71717A' },

    scholarshipCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF10' },
    scholarshipIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F59E0B20', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    scholarshipContent: { flex: 1 },
    scholarshipName: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 4 },
    scholarshipDeadline: { fontSize: 12, color: '#A1A1AA' },
    scholarshipAmount: { fontSize: 16, fontWeight: '800', color: '#10B981', marginBottom: 4 },
});
