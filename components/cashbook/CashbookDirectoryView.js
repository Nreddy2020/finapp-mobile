/**
 * components/cashbook/CashbookDirectoryView.js
 * 
 * FinLife Cashbooks — Master Directory (Screen 1).
 * Lists all purpose-driven financial books with their live balances calculated
 * truthfully from the underlying double-entry ledger.
 * 
 * Features:
 * - Segmented Control: [ My Books | Templates ]
 * - Live computed balances per book (Assets - Liabilities, or Net Debt)
 * - Semantic icons and badges matching FinLife visual specification
 * - Template catalog for quick instantiation of new purpose books
 * - Responsive, clean light-themed UI (#F8FAFC, #FFFFFF, #4F46E5)
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    TextInput
} from 'react-native';
import {
    Plus,
    ArrowLeft,
    Users,
    UserCheck,
    Briefcase,
    Building,
    Layers,
    TrendingUp,
    ShieldCheck,
    Home,
    Wallet,
    CreditCard,
    ArrowRight,
    ChevronRight,
    Sparkles,
    MoreVertical
} from 'lucide-react-native';
import {
    CashbookType,
    AccountNature,
    formatMoneyPaise,
    createMoneyPaise
} from '../../services/cashbook/cashbookContracts.js';
import { computeAccountBalances } from '../../services/cashbook/cashbookEngine.js';
import {
    CASHBOOK_TEMPLATES,
    getBookVisualMeta
} from '../../services/cashbook/cashbookPresentation.js';

export { CASHBOOK_TEMPLATES, getBookVisualMeta };

function resolveIconComp(iconKey) {
    switch (iconKey) {
        case 'Personal': return Users;
        case 'Business': return Briefcase;
        case 'Loans': return Layers;
        case 'Investments': return TrendingUp;
        case 'PF': return ShieldCheck;
        case 'Handy': return Wallet;
        case 'Income': return TrendingUp;
        case 'Custom':
        default:
            return Home;
    }
}

export default function CashbookDirectoryView({
    books = [],
    activeBookId,
    accounts = [],
    transactions = [],
    onSelectBook,
    onCreateBook,
    onOpenCreateModal,
    onRenameBook,
    onDeleteBook,
    onBack,
    topInset = 0
}) {
    const [segment, setSegment] = useState('MY_BOOKS'); // 'MY_BOOKS' | 'TEMPLATES'
    const [busyKey, setBusyKey] = useState(null); // guards against double-tap creating duplicate books

    // Rename state
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [bookToRename, setBookToRename] = useState(null);
    const [renameInput, setRenameInput] = useState('');
    const [renameError, setRenameError] = useState('');
    const [renameSubmitting, setRenameSubmitting] = useState(false);

    // Filter out soft-deleted books
    const visibleBooks = useMemo(() => (books || []).filter(b => b.status !== 'DELETED'), [books]);

    // Compute live balances truthfully from the ledger engine per book
    const bookBalanceMap = useMemo(() => {
        const map = new Map();
        for (const book of visibleBooks) {
            const bookTxns = transactions.filter(t => t.bookId === book.id);
            try {
                const balances = computeAccountBalances(accounts, bookTxns);
                let netPaise = 0n;

                if (book.type === CashbookType.LOANS_TAKEN) {
                    // For loans taken, net balance is outstanding liability (negative debt)
                    let totalDebt = 0n;
                    for (const acc of accounts) {
                        if (acc.nature === AccountNature.LIABILITY) {
                            const b = balances[acc.id];
                            if (b) totalDebt += b.bigIntPaise;
                        }
                    }
                    if (totalDebt > 0n) {
                        map.set(book.id, {
                            formatted: `- ₹ ${formatMoneyPaise(createMoneyPaise(totalDebt)).replace('₹', '').trim()}`,
                            isNegative: true
                        });
                        continue;
                    }
                }

                // Standard net balance: Assets minus Liabilities
                for (const acc of accounts) {
                    const b = balances[acc.id];
                    if (b) {
                        if (acc.nature === AccountNature.ASSET) {
                            netPaise += b.bigIntPaise;
                        } else if (acc.nature === AccountNature.LIABILITY) {
                            netPaise -= b.bigIntPaise;
                        }
                    }
                }

                const isNeg = netPaise < 0n;
                const absPaise = isNeg ? -netPaise : netPaise;
                const formattedNum = formatMoneyPaise(createMoneyPaise(absPaise)).replace('₹', '').trim();
                map.set(book.id, {
                    formatted: `${isNeg ? '- ' : ''}₹ ${formattedNum}`,
                    isNegative: isNeg
                });
            } catch (err) {
                map.set(book.id, { formatted: '₹ 0', isNegative: false });
            }
        }
        return map;
    }, [visibleBooks, accounts, transactions]);

    const handleBookOptions = (book) => {
        Alert.alert(
            book.name,
            'Manage this cashbook',
            [
                {
                    text: 'Rename Book',
                    onPress: () => {
                        setBookToRename(book);
                        setRenameInput(book.name);
                        setRenameError('');
                        setRenameModalVisible(true);
                    }
                },
                {
                    text: 'Delete Book',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            `Delete ${book.name}?`,
                            `This will hide ${book.name} and its history. You can't undo this from the app yet.`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: async () => {
                                        if (onDeleteBook) {
                                            try {
                                                await onDeleteBook(book.id);
                                            } catch (e) {
                                                // Alert handled by parent or caught here
                                            }
                                        }
                                    }
                                }
                            ]
                        );
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleConfirmRename = async () => {
        const trimmed = renameInput.trim();
        if (!trimmed) {
            setRenameError('Please enter a book name');
            return;
        }
        if (trimmed.length < 2) {
            setRenameError('Book name must be at least 2 characters');
            return;
        }
        try {
            setRenameSubmitting(true);
            setRenameError('');
            if (onRenameBook) {
                await onRenameBook(bookToRename.id, trimmed);
            }
            setRenameModalVisible(false);
            setBookToRename(null);
        } catch (err) {
            setRenameError(err.message || 'Failed to rename book');
        } finally {
            setRenameSubmitting(false);
        }
    };

    const handleCreateFromTemplate = async (tmpl) => {
        if (!onCreateBook || busyKey) return;
        setBusyKey(tmpl.name);
        try {
            // The screen builds the full cashbook entity (id, type configuration,
            // unique name) — the directory only supplies the user's choice.
            await onCreateBook({
                name: tmpl.name,
                type: tmpl.type,
                description: tmpl.description
            });
        } catch (err) {
            // Screen already surfaced the error
        } finally {
            setBusyKey(null);
        }
    };

    return (
        <View style={styles.safeContainer}>
            {/* Top Header Bar */}
            <View style={[styles.headerBar, { paddingTop: topInset + 8 }]}>
                {onBack && (
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={onBack}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityLabel="Go back"
                    >
                        <ArrowLeft size={20} color="#0F172A" />
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>Cashbooks</Text>
                <TouchableOpacity
                    style={styles.plusBtn}
                    onPress={onOpenCreateModal || (() => setSegment('TEMPLATES'))}
                    activeOpacity={0.7}
                    accessibilityLabel="Create cashbook"
                >
                    <Plus size={20} color="#0F172A" />
                </TouchableOpacity>
            </View>

            {/* Segmented Control Pills */}
            <View style={styles.segmentedContainer}>
                <TouchableOpacity
                    style={[styles.segmentPill, segment === 'MY_BOOKS' && styles.segmentPillActive]}
                    onPress={() => setSegment('MY_BOOKS')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.segmentText, segment === 'MY_BOOKS' && styles.segmentTextActive]}>
                        My Books
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.segmentPill, segment === 'TEMPLATES' && styles.segmentPillActive]}
                    onPress={() => setSegment('TEMPLATES')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.segmentText, segment === 'TEMPLATES' && styles.segmentTextActive]}>
                        Templates
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Book Cards Content */}
            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {segment === 'MY_BOOKS' ? (
                    <View style={styles.listContainer}>
                        {visibleBooks.length === 0 && (
                            <View style={styles.emptyBooks}>
                                <Text style={styles.emptyBooksTitle}>No cashbooks yet</Text>
                                <Text style={styles.emptyBooksText}>
                                    Create a purpose book (Personal, Business, Loans...) to start tracking money in and out.
                                </Text>
                            </View>
                        )}
                        {visibleBooks.map((book) => {
                            const meta = getBookVisualMeta(book);
                            const IconCmp = resolveIconComp(meta.iconKey);
                            const bal = bookBalanceMap.get(book.id) || { formatted: '₹ 0', isNegative: false };
                            const isActive = book.id === activeBookId;

                            return (
                                <TouchableOpacity
                                    key={book.id}
                                    style={[styles.bookCard, isActive && styles.bookCardActive]}
                                    onPress={() => onSelectBook && onSelectBook(book.id)}
                                    onLongPress={() => handleBookOptions(book)}
                                    activeOpacity={0.7}
                                >
                                    {/* Left Circle Icon */}
                                    <View style={[styles.iconCircle, { backgroundColor: meta.bgColor }]}>
                                        <IconCmp size={20} color={meta.iconColor} />
                                    </View>

                                    {/* Middle Details */}
                                    <View style={styles.detailsCol}>
                                        <Text style={styles.bookTitle} numberOfLines={1}>
                                            {meta.title}
                                        </Text>
                                        <Text style={styles.bookSubtitle} numberOfLines={1}>
                                            {meta.subtitle}
                                        </Text>
                                    </View>

                                    {/* Right Balance */}
                                    <View style={styles.balanceCol}>
                                        {(() => {
                                            const isZero = bal.formatted === '₹ 0' || bal.formatted === '₹0';
                                            return (
                                                <Text style={[
                                                    styles.balanceText,
                                                    bal.isNegative && styles.balanceNegative,
                                                    !bal.isNegative && !isZero && styles.balancePositive,
                                                    isZero && styles.balanceZero
                                                ]}>
                                                    {bal.formatted}
                                                </Text>
                                            );
                                        })()}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Add Custom Book Action Card */}
                        <TouchableOpacity
                            style={styles.addBookCard}
                            onPress={onOpenCreateModal || (() => setSegment('TEMPLATES'))}
                            activeOpacity={0.7}
                        >
                            <View style={styles.addBookIconWrap}>
                                <Plus size={18} color="#6366F1" />
                            </View>
                            <Text style={styles.addBookText}>Create New Purpose Book</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    /* Templates List */
                    <View style={styles.listContainer}>
                        <Text style={styles.templatesNotice}>
                            Choose a ready-to-use purpose book template configured with domain categories and accounting rules.
                        </Text>
                        {CASHBOOK_TEMPLATES.map((tmpl, idx) => (
                            <View key={idx} style={styles.templateCard}>
                                <View style={[styles.iconCircle, { backgroundColor: tmpl.bgColor }]}>
                                    <Sparkles size={18} color={tmpl.iconColor} />
                                </View>
                                <View style={styles.detailsCol}>
                                    <Text style={styles.bookTitle}>{tmpl.name}</Text>
                                    <Text style={styles.bookSubtitle}>{tmpl.description}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.useTemplateBtn}
                                    onPress={() => handleCreateFromTemplate(tmpl)}
                                    activeOpacity={0.8}
                                    disabled={!!busyKey}
                                >
                                    <Text style={styles.useTemplateText}>{busyKey === tmpl.name ? '...' : 'Use'}</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Rename Book Modal */}
            <Modal
                visible={renameModalVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setRenameModalVisible(false)}
            >
                <View style={styles.renameOverlay}>
                    <View style={styles.renameCard}>
                        <Text style={styles.renameTitle}>Rename Cashbook</Text>
                        <Text style={styles.renameSub}>Enter a new name for "{bookToRename?.name}".</Text>
                        <TextInput
                            style={styles.renameInput}
                            value={renameInput}
                            onChangeText={(t) => { setRenameInput(t); setRenameError(''); }}
                            placeholder="Cashbook name"
                            placeholderTextColor="#94A3B8"
                            autoFocus
                        />
                        {renameError ? <Text style={styles.renameErrorText}>{renameError}</Text> : null}
                        <View style={styles.renameActions}>
                            <TouchableOpacity
                                style={styles.renameCancelBtn}
                                onPress={() => setRenameModalVisible(false)}
                                disabled={renameSubmitting}
                            >
                                <Text style={styles.renameCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.renameSaveBtn, renameSubmitting && { opacity: 0.6 }]}
                                onPress={handleConfirmRename}
                                disabled={renameSubmitting}
                            >
                                <Text style={styles.renameSaveText}>{renameSubmitting ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 8
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginRight: 12
    },
    emptyBooks: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center'
    },
    emptyBooksTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4
    },
    emptyBooksText: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18
    },
    headerTitle: {
        flex: 1,
        fontSize: 26,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5
    },
    plusBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    bannerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 12
    },
    bannerText: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 24,
        padding: 4,
        marginHorizontal: 20,
        marginBottom: 16
    },
    segmentPill: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20
    },
    segmentPillActive: {
        backgroundColor: '#6366F1',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 2
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B'
    },
    segmentTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    scrollBody: {
        flex: 1
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 80
    },
    listContainer: {
        gap: 10
    },
    bookCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1
    },
    bookCardActive: {
        borderColor: '#6366F1',
        backgroundColor: '#FAF5FF'
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14
    },
    detailsCol: {
        flex: 1,
        marginRight: 8
    },
    bookTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2
    },
    bookSubtitle: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 16
    },
    balanceCol: {
        alignItems: 'flex-end',
        justifyContent: 'center'
    },
    balanceText: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2
    },
    balancePositive: {
        color: '#10B981'
    },
    balanceNegative: {
        color: '#EF4444'
    },
    balanceZero: {
        color: '#64748B'
    },
    addBookCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        gap: 8,
        marginTop: 6
    },
    addBookIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center'
    },
    addBookText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6366F1'
    },
    templatesNotice: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 8,
        lineHeight: 17
    },
    templateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    useTemplateBtn: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#C7D2FE'
    },
    useTemplateText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4F46E5'
    },
    bookMoreBtn: {
        padding: 6,
        marginLeft: 6
    },
    renameOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24
    },
    renameCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6
    },
    renameTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4
    },
    renameSub: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 16
    },
    renameInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: '#0F172A'
    },
    renameErrorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 6
    },
    renameActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20
    },
    renameCancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: '#F1F5F9'
    },
    renameCancelText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B'
    },
    renameSaveBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#6366F1'
    },
    renameSaveText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF'
    }
});
