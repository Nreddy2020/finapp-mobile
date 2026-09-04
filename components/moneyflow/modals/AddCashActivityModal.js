import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';
import { parseAndEvaluateArithmetic } from '../mathParser.js';

const TRANSACTION_TYPES = ['EXPENSE', 'INCOME', 'TRANSFER'];
const DEFAULT_CATEGORIES = [
    'Groceries & Food',
    'Rent & Housing',
    'Utilities',
    'Transportation',
    'Entertainment',
    'Health & Medical',
    'Shopping',
    'Investments',
    'Salary / Income',
    'Other'
];

export function AddCashActivityModal({ visible, onClose, onSave, accounts = [], initialType = 'EXPENSE' }) {
    const [type, setType] = useState(initialType || 'EXPENSE');
    const [amountExpr, setAmountExpr] = useState('');
    const [merchant, setMerchant] = useState('');
    const [category, setCategory] = useState('Groceries & Food');
    const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.name || 'HDFC Bank');
    const [toAccount, setToAccount] = useState(accounts[1]?.name || 'SBI Bank');

    React.useEffect(() => {
        if (visible && initialType) {
            setType(initialType);
        }
    }, [visible, initialType]);

    const handleSave = () => {
        let evaluatedAmount = 0;
        try {
            evaluatedAmount = parseAndEvaluateArithmetic(amountExpr);
        } catch (err) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount or math expression (e.g. 500+250).');
            return;
        }

        if (evaluatedAmount <= 0) {
            Alert.alert('Invalid Amount', 'Amount must be greater than 0.');
            return;
        }

        const newTx = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            amount: evaluatedAmount,
            type,
            category: type === 'TRANSFER' ? 'Transfer' : category,
            merchant: merchant.trim() || (type === 'TRANSFER' ? `Transfer to ${toAccount}` : 'General Cash Activity'),
            description: merchant.trim() || 'Manual Entry',
            date: new Date().toISOString(),
            accountName: selectedAccount,
            destinationAccountName: type === 'TRANSFER' ? toAccount : undefined
        };

        onSave(newTx);
        // Reset form
        setAmountExpr('');
        setMerchant('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={mfStyles.modalOverlay}
            >
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={mfStyles.modalContent}>
                    <View style={mfStyles.modalHeader}>
                        <Text style={mfStyles.modalTitle}>Add Cash Activity</Text>
                        <TouchableOpacity onPress={onClose} style={mfStyles.modalCloseBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                            <Ionicons name="close" size={24} color={MF_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Type Switcher */}
                        <View style={styles.typeSwitcher}>
                            {TRANSACTION_TYPES.map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.typeBtn,
                                        type === t && styles.typeBtnActive
                                    ]}
                                    onPress={() => setType(t)}
                                >
                                    <Text
                                        style={[
                                            styles.typeBtnText,
                                            type === t && styles.typeBtnTextActive
                                        ]}
                                    >
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Amount Input with Math support */}
                        <Text style={styles.inputLabel}>Amount (supports e.g. 100+50*2)</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="₹0 or 1500 + 350"
                            placeholderTextColor={MF_COLORS.textMuted}
                            value={amountExpr}
                            onChangeText={setAmountExpr}
                            keyboardType="numbers-and-punctuation"
                        />

                        {/* Merchant / Description */}
                        <Text style={styles.inputLabel}>Description / Merchant</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. Swiggy, DMart, Salary"
                            placeholderTextColor={MF_COLORS.textMuted}
                            value={merchant}
                            onChangeText={setMerchant}
                        />

                        {/* Category Selector (if not transfer) */}
                        {type !== 'TRANSFER' && (
                            <>
                                <Text style={styles.inputLabel}>Category</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                                    {DEFAULT_CATEGORIES.map((cat) => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[
                                                styles.catChip,
                                                category === cat && styles.catChipActive
                                            ]}
                                            onPress={() => setCategory(cat)}
                                        >
                                            <Text
                                                style={[
                                                    styles.catChipText,
                                                    category === cat && styles.catChipTextActive
                                                ]}
                                            >
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        {/* Account Selector */}
                        <Text style={styles.inputLabel}>From Account</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. HDFC Bank"
                            placeholderTextColor={MF_COLORS.textMuted}
                            value={selectedAccount}
                            onChangeText={setSelectedAccount}
                        />

                        {type === 'TRANSFER' && (
                            <>
                                <Text style={styles.inputLabel}>To Account</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. SBI Bank"
                                    placeholderTextColor={MF_COLORS.textMuted}
                                    value={toAccount}
                                    onChangeText={setToAccount}
                                />
                            </>
                        )}

                        {/* Save Button */}
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={styles.saveBtnText}>Save Transaction</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    typeSwitcher: {
        flexDirection: 'row',
        backgroundColor: MF_COLORS.cardBgElevated,
        borderRadius: 10,
        padding: 4,
        marginBottom: 16,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    typeBtnActive: {
        backgroundColor: MF_COLORS.primaryBlue,
    },
    typeBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: MF_COLORS.textMuted,
    },
    typeBtnTextActive: {
        color: '#FFFFFF',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: MF_COLORS.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    textInput: {
        backgroundColor: MF_COLORS.cardBgElevated,
        borderWidth: 1,
        borderColor: MF_COLORS.borderSubtle,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: MF_COLORS.textPrimary,
        fontSize: 15,
        marginBottom: 14,
    },
    categoryScroll: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    catChip: {
        backgroundColor: MF_COLORS.chipBg,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: MF_COLORS.borderSubtle,
    },
    catChipActive: {
        backgroundColor: MF_COLORS.primaryBlue,
        borderColor: MF_COLORS.primaryBlue,
    },
    catChipText: {
        fontSize: 12,
        color: MF_COLORS.textSecondary,
    },
    catChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    saveBtn: {
        backgroundColor: MF_COLORS.primaryBlue,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
