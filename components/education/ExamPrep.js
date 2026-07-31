import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { X, GraduationCap, RotateCw, Check, X as XIcon } from 'lucide-react-native';

export default function ExamPrep({ visible, onClose }) {
    const [flipped, setFlipped] = useState(false);
    const [current, setCurrent] = useState(0);

    const cards = [
        { q: "What is the P/E Ratio?", a: "Price-to-Earnings Ratio: Determines if a stock is over/undervalued." },
        { q: "Define Compound Interest.", a: "Interest calculated on the initial principal + accumulated interest." },
        { q: "What is an ETF?", a: "Exchange-Traded Fund: A basket of securities that trades like a stock." }
    ];

    const flipCard = () => setFlipped(!flipped);

    const nextCard = () => {
        setFlipped(false);
        setCurrent((prev) => (prev + 1) % cards.length);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <GraduationCap size={24} color="#8B5CF6" />
                            <Text style={styles.title}>Exam Prep: Flashcards</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Tap to flip. Swipe for next.</Text>

                    <TouchableOpacity activeOpacity={0.9} onPress={flipCard} style={styles.cardContainer}>
                        <View style={[styles.card, flipped ? styles.cardBack : styles.cardFront]}>
                            <Text style={styles.cardContent}>
                                {flipped ? cards[current].a : cards[current].q}
                            </Text>
                            <Text style={styles.tapHint}>
                                {flipped ? "(Answer)" : "(Question)"}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.controlBtn} onPress={nextCard}>
                            <XIcon size={24} color="#EF4444" />
                            <Text style={styles.controlText}>Missed</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.flipAction} onPress={flipCard}>
                            <RotateCw size={24} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.controlBtn} onPress={nextCard}>
                            <Check size={24} color="#10B981" />
                            <Text style={styles.controlText}>Got It</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.progress}>Card {current + 1} of {cards.length}</Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'center', padding: 24 },
    container: { backgroundColor: '#18181B', borderRadius: 24, padding: 24, alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 14, marginBottom: 32 },
    cardContainer: { width: '100%', height: 300, marginBottom: 32 },
    card: { flex: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center', padding: 24, borderWidth: 1 },
    cardFront: { backgroundColor: '#27272A', borderColor: '#FFFFFF10' },
    cardBack: { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' },
    cardContent: { color: '#FFF', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
    tapHint: { color: '#A1A1AA', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 32, marginBottom: 24 },
    controlBtn: { alignItems: 'center', gap: 4 },
    controlText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    flipAction: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
    progress: { color: '#52525B', fontSize: 12, fontWeight: '600' }
});
