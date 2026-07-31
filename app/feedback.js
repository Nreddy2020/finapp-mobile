import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import StarRating from '../components/feedback/StarRating';
import FeedbackForm from '../components/feedback/FeedbackForm';
import { FeedbackService } from '../services/feedback';

export default function FeedbackScreen() {
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data) => {
        setIsSubmitting(true);
        // Persist feedback locally using service
        await FeedbackService.submitFeedback(rating, data.feedback);

        setIsSubmitting(false);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <AnimatedScreen style={styles.container}>
                <View style={styles.successContainer}>
                    <CheckCircle2 size={80} color="#10B981" />
                    <Text style={styles.successTitle}>Thank You!</Text>
                    <Text style={styles.successText}>Your feedback has been saved. We appreciate your input!</Text>
                    <TouchableOpacity style={styles.homeBtn} onPress={() => router.back()}>
                        <Text style={styles.homeBtnText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </AnimatedScreen>
        );
    }

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Send Feedback</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.intro}>
                    How was your experience using the app?
                </Text>

                <StarRating rating={rating} onRatingChange={setRating} />

                <FeedbackForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 16, marginBottom: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: '900', color: '#FFF' },
    content: { paddingHorizontal: 24, paddingBottom: 40 },
    intro: { color: '#A1A1AA', fontSize: 16, textAlign: 'center', marginBottom: 20 },

    successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    successTitle: { fontSize: 32, fontWeight: '900', color: '#FFF', marginTop: 24, marginBottom: 16 },
    successText: { color: '#A1A1AA', textAlign: 'center', fontSize: 16, lineHeight: 24, marginBottom: 40 },
    homeBtn: { backgroundColor: '#27272A', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 30 },
    homeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
