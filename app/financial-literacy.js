import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, Video, Award, Search, ExternalLink, CheckCircle, Sparkles, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import { LiteracyService } from '../services/literacy';

export default function FinancialLiteracy() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('learn');
    const [content, setContent] = useState({ articles: [], quizzes: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await LiteracyService.getContent();
        setContent(data);
        setLoading(false);
    };

    const handleQuizFinish = async (quizId) => {
        // Mock scoring 10/10 for now
        const updated = await LiteracyService.saveScore(quizId, 10);
        setContent(updated);
        alert('You scored 10/10!');
    };

    const THEME_COLOR = '#F59E0B';

    const renderLearn = () => (
        <View style={styles.section}>
            {/* Daily Tip */}
            <LuxuryCard style={styles.tipCard} index={1}>
                <View style={styles.tipHeader}>
                    <Sparkles size={20} color={THEME_COLOR} />
                    <Text style={styles.tipTitle}>TIP OF THE DAY</Text>
                </View>
                <Text style={styles.tipText}>
                    "Pay yourself first. Before paying bills, transfer 10% of your income to savings."
                </Text>
            </LuxuryCard>

            <Text style={styles.sectionHeader}>Read Articles</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.videoScroll}>
                {content.articles.map((article, index) => (
                    <LuxuryCard key={article.id} index={index + 2} style={styles.videoCard}>
                        <View style={[styles.videoThumbnail, { backgroundColor: '#8B5CF620' }]}>
                            <BookOpen size={24} color="#8B5CF6" />
                        </View>
                        <Text style={styles.videoTitle} numberOfLines={2}>{article.title}</Text>
                        <Text style={styles.videoDuration}>{article.readTime} read</Text>
                    </LuxuryCard>
                ))}
            </ScrollView>

            <Text style={styles.sectionHeader}>Take a Quiz</Text>
            {content.quizzes.map((quiz, index) => (
                <LuxuryCard key={quiz.id} style={styles.quizCard} index={index + 5}>
                    <LinearGradient
                        colors={['#1e3a8a', '#172554']}
                        style={styles.quizGradient}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.quizTitle}>{quiz.title}</Text>
                            {quiz.bestScore !== null && <Text style={{ color: '#4ade80' }}>Best: {quiz.bestScore}/10</Text>}
                        </View>
                        <Text style={styles.quizQuestion}>{quiz.questions} Questions</Text>
                        <Pressable style={styles.quizBtn} onPress={() => handleQuizFinish(quiz.id)}>
                            <Text style={styles.quizBtnText}>Start Quiz</Text>
                        </Pressable>
                    </LinearGradient>
                </LuxuryCard>
            ))}
        </View>
    );

    // ... Schemes and Stories sections remain static for now as they are less dynamic ...
    const renderSchemes = () => (
        <View style={styles.list}>
            {/* Static Mock Data for Schemes */}
            {[1, 2, 3].map((_, i) => (
                <LuxuryCard key={i} index={i} style={styles.card}>
                    <Text style={{ color: '#FFF' }}>Govt Scheme #{i + 1}</Text>
                </LuxuryCard>
            ))}
        </View>
    );
    const renderStories = () => (
        <View style={styles.list}>
            {/* Static Mock Data for Stories */}
            {[1, 2].map((_, i) => (
                <LuxuryCard key={i} index={i} style={styles.card}>
                    <Text style={{ color: '#FFF' }}>Success Story #{i + 1}</Text>
                </LuxuryCard>
            ))}
        </View>
    );

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <View>
                    <Text style={styles.headerLabel}>LEARN & GROW</Text>
                    <Text style={styles.headerTitle}>Financial Literacy</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsWrapper}>
                {['learn', 'schemes', 'stories'].map((tab) => (
                    <Pressable
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab.toUpperCase()}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {activeTab === 'learn' && renderLearn()}
                {activeTab === 'schemes' && renderSchemes()}
                {activeTab === 'stories' && renderStories()}
            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 16 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF10' },
    headerLabel: { fontSize: 13, color: '#F59E0B', fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#FFF' },

    tabsWrapper: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 24 },
    tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF10' },
    activeTab: { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' },
    tabText: { color: '#71717A', fontWeight: '700', fontSize: 12 },
    activeTabText: { color: '#F59E0B' },

    content: { paddingHorizontal: 24, paddingBottom: 40 },
    section: { gap: 24 },

    tipCard: { padding: 24, backgroundColor: '#F59E0B10', borderColor: '#F59E0B40' },
    tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    tipTitle: { color: '#F59E0B', fontWeight: '800', letterSpacing: 1 },
    tipText: { color: '#FFF', fontSize: 16, fontStyle: 'italic', lineHeight: 24 },

    sectionHeader: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    videoScroll: { gap: 16 },
    videoCard: { width: 160, padding: 16 },
    videoThumbnail: { width: '100%', height: 80, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    videoTitle: { color: '#FFF', fontWeight: '700', marginBottom: 4, height: 40 },
    videoDuration: { color: '#71717A', fontSize: 12 },

    quizCard: { padding: 0, overflow: 'hidden' },
    quizGradient: { padding: 24 },
    quizTitle: { color: '#93C5FD', fontWeight: '700', marginBottom: 8 },
    quizQuestion: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 16 },
    quizBtn: { backgroundColor: '#3B82F6', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    quizBtnText: { color: '#FFF', fontWeight: '700' },

    list: { gap: 16 },
    card: { padding: 16 },
});
