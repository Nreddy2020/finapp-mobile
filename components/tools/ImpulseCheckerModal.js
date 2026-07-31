import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { X, Check, AlertTriangle, AlertOctagon, HelpCircle, Calculator } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, TYPOGRAPHY, SPACING, SIZES } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function ImpulseCheckerModal({ visible, onClose, dailyLimit, remainingToSpend }) {
    const [price, setPrice] = useState('');
    const [itemName, setItemName] = useState('');
    const [result, setResult] = useState(null);

    // Reset when opening
    useEffect(() => {
        if (visible) {
            setPrice('');
            setItemName('');
            setResult(null);
        }
    }, [visible]);

    const checkAffordability = () => {
        const amount = parseFloat(price);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid price.');
            return;
        }

        const percentageOfDaily = (amount / dailyLimit) * 100;
        const newRemaining = remainingToSpend - amount;

        if (amount > remainingToSpend) {
            setResult({
                status: 'CRITICAL',
                title: 'Cannot Afford Today',
                message: `This purchase exceeds your remaining budget of ₹${remainingToSpend.toLocaleString('en-IN')}.`,
                subMessage: 'Buying this will put you over budget immediately.',
                color: '#EF4444',
                icon: AlertOctagon
            });
        } else if (percentageOfDaily > 50) {
            setResult({
                status: 'CAUTION',
                title: 'Risky Purchase',
                message: `This is ${percentageOfDaily.toFixed(0)}% of your daily limit.`,
                subMessage: `You'll only have ₹${newRemaining.toLocaleString('en-IN')} left for everything else today.`,
                color: '#F59E0B',
                icon: AlertTriangle
            });
        } else {
            setResult({
                status: 'SAFE',
                title: 'Safe to Buy',
                message: `You can afford this comfortably (${percentageOfDaily.toFixed(0)}% of daily limit).`,
                subMessage: `You will still have ₹${newRemaining.toLocaleString('en-IN')} remaining.`,
                color: '#10B981',
                icon: Check
            });
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                </TouchableOpacity>

                <View style={styles.modalContent}>
                    <LinearGradient
                        colors={['#18181B', '#09090B']}
                        style={styles.cardGradient}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerTitleRow}>
                                <Calculator size={20} color={COLORS.primary} />
                                <Text style={styles.title}>Impulse Checker</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        {/* Input Section */}
                        {!result ? (
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>What do you want to buy?</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. New Headphones"
                                    placeholderTextColor="#52525B"
                                    value={itemName}
                                    onChangeText={setItemName}
                                />

                                <Text style={[styles.label, { marginTop: 16 }]}>Price (₹)</Text>
                                <TextInput
                                    style={[styles.input, styles.priceInput]}
                                    placeholder="0"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={price}
                                    onChangeText={setPrice}
                                />

                                <Text style={styles.hint}>
                                    Your Safe Limit Today: <Text style={{ color: COLORS.primary }}>₹{Math.round(dailyLimit).toLocaleString('en-IN')}</Text>
                                </Text>

                                <TouchableOpacity style={styles.checkBtn} onPress={checkAffordability}>
                                    <LinearGradient
                                        colors={[COLORS.primary, '#4F46E5']}
                                        style={styles.btnGradient}
                                    >
                                        <Text style={styles.btnText}>Check Affordability</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            // Result Section
                            <View style={[styles.resultContainer, { borderColor: result.color + '40' }]}>
                                <View style={[styles.resultIconBg, { backgroundColor: result.color + '20' }]}>
                                    <result.icon size={48} color={result.color} />
                                </View>

                                <Text style={[styles.resultTitle, { color: result.color }]}>{result.title}</Text>
                                <Text style={styles.resultMessage}>{result.message}</Text>
                                <Text style={styles.resultSubMessage}>{result.subMessage}</Text>

                                <TouchableOpacity
                                    style={[styles.checkBtn, { marginTop: 24, width: '100%' }]}
                                    onPress={() => setResult(null)}
                                >
                                    <View style={[styles.btnGradient, { backgroundColor: '#27272A' }]}>
                                        <Text style={[styles.btnText, { color: '#FFF' }]}>Check Another Item</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}
                    </LinearGradient>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
    modalContent: {
        width: width * 0.9,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#FFFFFF15',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10
    },
    cardGradient: { padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    closeBtn: { padding: 4, backgroundColor: '#27272A', borderRadius: 12 },

    label: { color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        backgroundColor: '#27272A',
        borderRadius: 16,
        padding: 16,
        color: '#FFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    priceInput: { fontSize: 24, fontWeight: '700', color: '#FFF' },
    hint: { marginTop: 12, color: '#71717A', fontSize: 13, textAlign: 'center' },

    checkBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
    btnGradient: { padding: 16, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

    // Result Styles
    resultContainer: { alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, backgroundColor: '#00000040' },
    resultIconBg: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    resultTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
    resultMessage: { color: '#FFF', fontSize: 16, textAlign: 'center', fontWeight: '600', marginBottom: 4 },
    resultSubMessage: { color: '#A1A1AA', fontSize: 14, textAlign: 'center', lineHeight: 20 }
});
