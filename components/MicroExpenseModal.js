import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Mic, Check, DollarSign, Coffee, Car, ShoppingBag, Sparkles, Repeat } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

export default function MicroExpenseModal({ visible, onClose, onSave }) {
    const [type, setType] = useState('expense'); // 'expense' | 'income'
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [category, setCategory] = useState('Food');
    const [isListening, setIsListening] = useState(false);
    const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'online'
    const [necessity, setNecessity] = useState('need'); // 'need' | 'want'
    const [recurring, setRecurring] = useState(false);

    const isExpense = type === 'expense';
    const themeColor = isExpense ? '#EF4444' : '#10B981';

    const handleSave = () => {
        if (!amount) return;
        onSave({ type, amount, note, category, paymentMode, necessity, recurring });
        setAmount('');
        setNote('');
        setType('expense');
        setPaymentMode('cash');
        setNecessity('need');
        setRecurring(false);
        onClose();
    };

    const toggleVoice = () => {
        setIsListening(!isListening);
        if (!isListening) {
            setTimeout(() => {
                setNote(isExpense ? 'Cutting Chai' : 'Daily Wage');
                setAmount(isExpense ? '45' : '850');
                setCategory(isExpense ? 'Food' : 'Salary');
                setPaymentMode('cash');
                setNecessity('want');
                setIsListening(false);
            }, 2000);
        }
    };

    const categories = isExpense ? [
        { id: 'Food', icon: Coffee, label: 'Food' },
        { id: 'Travel', icon: Car, label: 'Travel' },
        { id: 'Shopping', icon: ShoppingBag, label: 'Shop' },
    ] : [
        { id: 'Salary', icon: DollarSign, label: 'Wage' },
        { id: 'Gig', icon: Sparkles, label: 'Gig' },
        { id: 'Gift', icon: Check, label: 'Gift' },
    ];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalContainer}
            >
                <Pressable style={styles.backdrop} onPress={onClose} />

                <LinearGradient
                    colors={['#18181B', '#000000']}
                    style={styles.contentContainer}
                >
                    <View style={styles.header}>
                        {/* Type Toggle */}
                        <View style={styles.toggleContainer}>
                            <Pressable
                                style={[styles.toggleBtn, isExpense && styles.toggleActiveExp]}
                                onPress={() => setType('expense')}
                            >
                                <Text style={[styles.toggleText, isExpense && styles.toggleTextActive]}>Expense</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.toggleBtn, !isExpense && styles.toggleActiveInc]}
                                onPress={() => setType('income')}
                            >
                                <Text style={[styles.toggleText, !isExpense && styles.toggleTextActive]}>Income</Text>
                            </Pressable>
                        </View>

                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X color="#A1A1AA" size={20} />
                        </Pressable>
                    </View>

                    {/* Amount Input */}
                    <View style={styles.inputWrapper}>
                        <Text style={[styles.currencySymbol, { color: themeColor }]}>₹</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0"
                            placeholderTextColor="#52525B"
                            keyboardType="numeric"
                            autoFocus
                        />
                    </View>

                    {/* Attributes Row (Cash/Online, Need/Want, Recurring) */}
                    <View style={styles.attributesRow}>
                        <Pressable
                            style={[styles.attrBtn, paymentMode === 'cash' && { backgroundColor: themeColor + '20', borderColor: themeColor }]}
                            onPress={() => setPaymentMode(paymentMode === 'cash' ? 'online' : 'cash')}
                        >
                            <Text style={[styles.attrText, paymentMode === 'cash' && { color: themeColor }]}>
                                {paymentMode === 'cash' ? '💵 Cash' : '💳 Online'}
                            </Text>
                        </Pressable>

                        {isExpense && (
                            <>
                                <Pressable
                                    style={[styles.attrBtn, necessity === 'need' && { backgroundColor: themeColor + '20', borderColor: themeColor }]}
                                    onPress={() => setNecessity(necessity === 'need' ? 'want' : 'need')}
                                >
                                    <Text style={[styles.attrText, necessity === 'need' && { color: themeColor }]}>
                                        {necessity === 'need' ? '🩸 Need' : '🍿 Want'}
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.attrBtn, recurring && { backgroundColor: themeColor + '20', borderColor: themeColor }]}
                                    onPress={() => setRecurring(!recurring)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Repeat size={12} color={recurring ? themeColor : '#A1A1AA'} />
                                        <Text style={[styles.attrText, recurring && { color: themeColor }]}>
                                            {recurring ? 'Repeat' : 'Once'}
                                        </Text>
                                    </View>
                                </Pressable>
                            </>
                        )}
                    </View>

                    {/* Voice Input Trigger */}
                    <Pressable
                        style={[styles.voiceBtn, isListening && { backgroundColor: `${themeColor}15`, borderColor: `${themeColor}30` }]}
                        onPress={toggleVoice}
                    >
                        {isListening ? (
                            <View style={styles.listeningContainer}>
                                <Text style={[styles.listeningText, { color: themeColor }]}>Listening...</Text>
                            </View>
                        ) : (
                            <>
                                <Mic color={themeColor} size={20} />
                                <Text style={[styles.voiceText, { color: themeColor }]}>Tap to Speak</Text>
                            </>
                        )}
                    </Pressable>

                    {/* Category Selection */}
                    <View style={styles.categoriesRow}>
                        {categories.map((cat) => (
                            <Pressable
                                key={cat.id}
                                style={[styles.catChip, category === cat.id && { backgroundColor: themeColor, borderColor: themeColor }]}
                                onPress={() => setCategory(cat.id)}
                            >
                                <cat.icon size={16} color={category === cat.id ? '#FFF' : '#A1A1AA'} />
                                <Text style={[styles.catLabel, category === cat.id && styles.catLabelActive]}>
                                    {cat.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Note Input */}
                    <TextInput
                        style={styles.noteInput}
                        value={note}
                        onChangeText={setNote}
                        placeholder={isExpense ? "What did you buy?" : "Source of income?"}
                        placeholderTextColor="#52525B"
                    />

                    {/* Save Button */}
                    <Pressable style={styles.saveBtn} onPress={handleSave}>
                        <LinearGradient
                            colors={isExpense ? ['#EF4444', '#DC2626'] : ['#10B981', '#059669']}
                            style={styles.saveGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Check color="#FFF" size={20} />
                            <Text style={styles.saveText}>Save {isExpense ? 'Expense' : 'Income'}</Text>
                        </LinearGradient>
                    </Pressable>

                </LinearGradient>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000080' },
    contentContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#FFFFFF10' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    toggleContainer: { flexDirection: 'row', backgroundColor: '#18181B', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#FFFFFF10' },
    toggleBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
    toggleActiveExp: { backgroundColor: '#EF444420' },
    toggleActiveInc: { backgroundColor: '#10B98120' },
    toggleText: { color: '#A1A1AA', fontWeight: '600', fontSize: 13 },
    toggleTextActive: { color: '#FFF' },
    closeBtn: { padding: 4 },
    inputWrapper: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    currencySymbol: { fontSize: 32, fontWeight: '700', marginRight: 4 },
    amountInput: { fontSize: 48, fontWeight: '700', color: '#FFF', minWidth: 100, textAlign: 'center' },
    attributesRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
    attrBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF10' },
    attrText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    voiceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF05', padding: 12, borderRadius: 30, marginBottom: 24, borderWidth: 1, borderColor: '#FFFFFF10' },
    voiceText: { fontWeight: '600', marginLeft: 8 },
    listeningContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    listeningText: { fontWeight: '600', marginLeft: 6 },
    categoriesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 8 },
    catChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF10', gap: 6 },
    catLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    catLabelActive: { color: '#FFF' },
    noteInput: { backgroundColor: '#18181B', borderRadius: 12, padding: 16, color: '#FFF', marginBottom: 24, borderWidth: 1, borderColor: '#FFFFFF10' },
    saveBtn: { borderRadius: 16, overflow: 'hidden' },
    saveGradient: { padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    saveText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
