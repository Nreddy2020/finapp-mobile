/**
 * components/cashbook/BookHeaderBar.js
 * 
 * Luxury Book Switcher & Header Bar for FinLife Universal Cashbook.
 * Displays active book, type badge, balance mode, and allows instant switching
 * or creating new financial books.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput
} from 'react-native';
import {
    Book,
    ChevronDown,
    Plus,
    Check,
    X,
    Wallet,
    Landmark,
    TrendingUp,
    Shield,
    ArrowDownRight,
    ArrowUpRight,
    Store
} from 'lucide-react-native';
import {
    CashbookType,
    CashbookConfigMap,
    createCashbook
} from '../../services/cashbook/cashbookContracts.js';

function getBookIcon(type) {
    switch (type) {
        case CashbookType.HANDY_CASH:
            return Store;
        case CashbookType.BUSINESS_CASH_AND_OBLIGATIONS:
            return Landmark;
        case CashbookType.LOANS_TAKEN:
            return ArrowDownRight;
        case CashbookType.LOANS_GIVEN:
            return ArrowUpRight;
        case CashbookType.PF:
            return Shield;
        case CashbookType.INVESTMENTS:
            return TrendingUp;
        default:
            return Book;
    }
}

export default function BookHeaderBar({
    activeBook,
    books = [],
    onSelectBook,
    onCreateBook
}) {
    const [modalVisible, setModalVisible] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // New book form state
    const [newBookName, setNewBookName] = useState('');
    const [newBookType, setNewBookType] = useState(CashbookType.SAVINGS);
    const [newBookDesc, setNewBookDesc] = useState('');

    const ActiveIcon = getBookIcon(activeBook?.type);
    const config = CashbookConfigMap[activeBook?.type] || CashbookConfigMap[CashbookType.SAVINGS];

    const handleCreateBook = async () => {
        if (!newBookName.trim()) return;
        const newBook = createCashbook({
            id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: newBookName.trim(),
            type: newBookType,
            description: newBookDesc.trim()
        });

        if (onCreateBook) {
            await onCreateBook(newBook);
        }
        setNewBookName('');
        setNewBookDesc('');
        setIsCreating(false);
        setModalVisible(false);
    };

    return (
        <View style={styles.headerContainer}>
            {/* Active Book Button */}
            <TouchableOpacity
                style={styles.bookSelectorButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
            >
                <View style={styles.iconCircle}>
                    <ActiveIcon size={16} color="#38BDF8" />
                </View>

                <View style={styles.titleColumn}>
                    <View style={styles.titleRow}>
                        <Text style={styles.bookTitle} numberOfLines={1}>
                            {activeBook?.name || 'Personal Savings'}
                        </Text>
                        <ChevronDown size={14} color="#94A3B8" />
                    </View>
                    <Text style={styles.bookSubtitle}>
                        {config.title} • {config.terminology?.balanceLabel || 'Ledger'}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Book Switcher Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleRow}>
                                <Book size={18} color="#38BDF8" />
                                <Text style={styles.modalTitle}>Financial Books</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setModalVisible(false);
                                    setIsCreating(false);
                                }}
                                style={styles.closeBtn}
                            >
                                <X size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        {!isCreating ? (
                            <>
                                {/* Books List */}
                                <ScrollView style={styles.booksList} showsVerticalScrollIndicator={false}>
                                    <Text style={styles.sectionHeading}>SWITCH ACTIVE BOOK</Text>
                                    {books.map((b) => {
                                        const Icon = getBookIcon(b.type);
                                        const isSelected = b.id === activeBook?.id;
                                        const bConfig = CashbookConfigMap[b.type] || CashbookConfigMap[CashbookType.SAVINGS];

                                        return (
                                            <TouchableOpacity
                                                key={b.id}
                                                style={[
                                                    styles.bookItem,
                                                    isSelected && styles.bookItemSelected
                                                ]}
                                                onPress={() => {
                                                    onSelectBook && onSelectBook(b.id);
                                                    setModalVisible(false);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.bookItemLeft}>
                                                    <View style={[
                                                        styles.itemIconWrap,
                                                        isSelected && styles.itemIconWrapSelected
                                                    ]}>
                                                        <Icon size={16} color={isSelected ? '#38BDF8' : '#64748B'} />
                                                    </View>
                                                    <View style={styles.itemMeta}>
                                                        <Text style={[
                                                            styles.itemName,
                                                            isSelected && styles.itemNameSelected
                                                        ]}>
                                                            {b.name}
                                                        </Text>
                                                        <Text style={styles.itemTypeDesc}>
                                                            {bConfig.title}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {isSelected && (
                                                    <View style={styles.checkBadge}>
                                                        <Check size={14} color="#38BDF8" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {/* Action: Add New Book */}
                                <TouchableOpacity
                                    style={styles.newBookBtn}
                                    onPress={() => setIsCreating(true)}
                                    activeOpacity={0.8}
                                >
                                    <Plus size={16} color="#38BDF8" />
                                    <Text style={styles.newBookBtnText}>Create New Book</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            /* New Book Creation Form */
                            <ScrollView style={styles.createForm} showsVerticalScrollIndicator={false}>
                                <Text style={styles.sectionHeading}>CREATE NEW BOOK</Text>

                                <Text style={styles.formLabel}>Book Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Handy Cash Till, Home Loan A/c"
                                    placeholderTextColor="#64748B"
                                    value={newBookName}
                                    onChangeText={setNewBookName}
                                />

                                <Text style={styles.formLabel}>Book Type</Text>
                                <View style={styles.typeGrid}>
                                    {[
                                        { type: CashbookType.SAVINGS, label: 'Savings' },
                                        { type: CashbookType.HANDY_CASH, label: 'Handy Cash' },
                                        { type: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS, label: 'Business' },
                                        { type: CashbookType.LOANS_TAKEN, label: 'Loans Taken' },
                                        { type: CashbookType.LOANS_GIVEN, label: 'Loans Given' },
                                        { type: CashbookType.PF, label: 'Provident Fund' }
                                    ].map((opt) => {
                                        const isOptSelected = newBookType === opt.type;
                                        return (
                                            <TouchableOpacity
                                                key={opt.type}
                                                style={[
                                                    styles.typeOption,
                                                    isOptSelected && styles.typeOptionSelected
                                                ]}
                                                onPress={() => setNewBookType(opt.type)}
                                            >
                                                <Text style={[
                                                    styles.typeOptionText,
                                                    isOptSelected && styles.typeOptionTextSelected
                                                ]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Text style={styles.formLabel}>Description (Optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Daily physical cash counter"
                                    placeholderTextColor="#64748B"
                                    value={newBookDesc}
                                    onChangeText={setNewBookDesc}
                                />

                                <View style={styles.formActionRow}>
                                    <TouchableOpacity
                                        style={styles.cancelFormBtn}
                                        onPress={() => setIsCreating(false)}
                                    >
                                        <Text style={styles.cancelFormText}>Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.submitFormBtn,
                                            !newBookName.trim() && styles.submitFormBtnDisabled
                                        ]}
                                        onPress={handleCreateBook}
                                        disabled={!newBookName.trim()}
                                    >
                                        <Text style={styles.submitFormText}>Create Book</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        marginBottom: 12,
        paddingHorizontal: 16
    },
    bookSelectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    iconCircle: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10
    },
    titleColumn: {
        flex: 1
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    bookTitle: {
        color: '#F8FAFC',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2
    },
    bookSubtitle: {
        color: '#94A3B8',
        fontSize: 11,
        marginTop: 1,
        fontWeight: '500'
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#0F172A',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
        width: '100%',
        maxHeight: '80%',
        padding: 20
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B'
    },
    modalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    modalTitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700'
    },
    closeBtn: {
        padding: 4
    },
    sectionHeading: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginTop: 14,
        marginBottom: 10
    },
    booksList: {
        maxHeight: 280
    },
    bookItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#334155'
    },
    bookItemSelected: {
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.08)'
    },
    bookItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    itemIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center'
    },
    itemIconWrapSelected: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)'
    },
    itemMeta: {
        justifyContent: 'center'
    },
    itemName: {
        color: '#E2E8F0',
        fontSize: 14,
        fontWeight: '600'
    },
    itemNameSelected: {
        color: '#F8FAFC',
        fontWeight: '700'
    },
    itemTypeDesc: {
        color: '#64748B',
        fontSize: 11,
        marginTop: 1
    },
    checkBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    newBookBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderRadius: 12,
        paddingVertical: 12,
        marginTop: 14,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.3)'
    },
    newBookBtnText: {
        color: '#38BDF8',
        fontSize: 14,
        fontWeight: '600'
    },
    createForm: {
        maxHeight: 380
    },
    formLabel: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 10
    },
    textInput: {
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#F8FAFC',
        fontSize: 14
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4
    },
    typeOption: {
        backgroundColor: '#1E293B',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    typeOptionSelected: {
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)'
    },
    typeOptionText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '500'
    },
    typeOptionTextSelected: {
        color: '#38BDF8',
        fontWeight: '700'
    },
    formActionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        marginBottom: 10
    },
    cancelFormBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#1E293B'
    },
    cancelFormText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '600'
    },
    submitFormBtn: {
        flex: 2,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#38BDF8'
    },
    submitFormBtnDisabled: {
        opacity: 0.4
    },
    submitFormText: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '700'
    }
});
