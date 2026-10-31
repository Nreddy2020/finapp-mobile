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
    SafeAreaView,
    Platform
} from 'react-native';
import {
    Plus,
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
    Sparkles
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
    onOpenCreateModal
}) {
    const [segment, setSegment] = useState('MY_BOOKS'); // 'MY_BOOKS' | 'TEMPLATES'

    // Compute live balances truthfully from the ledger engine per book
    const bookBalanceMap = useMemo(() => {
        const map = new Map();
        for (const book of books) {
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
    }, [books, accounts, transactions]);

    const handleCreateFromTemplate = (tmpl) => {
        if (onCreateBook) {
            const newBook = {
                id: `book_${Date.now()}`,
                name: tmpl.name,
                type: tmpl.type,
                description: tmpl.description
            };
            onCreateBook(newBook);
        }
    };

    return (
        <SafeAreaView style={styles.safeContainer}>
            {/* Top Header Bar */}
            <View style={styles.headerBar}>
                <Text style={styles.headerTitle}>Cashbooks</Text>
                <TouchableOpacity
                    style={styles.plusBtn}
                    onPress={onOpenCreateModal}
                    activeOpacity={0.7}
                    accessibilityLabel="Create cashbook"
                >
                    <Plus size={20} color="#0F172A" />
                </TouchableOpacity>
            </View>

            {/* Subtitle Banner */}
            <View style={styles.bannerContainer}>
                <Text style={styles.bannerText}>
                    Track money in and out, manage accounts, and see your financial position — by purpose.
                </Text>
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
                        {books.map((book) => {
                            const meta = getBookVisualMeta(book);
                            const IconCmp = resolveIconComp(meta.iconKey);
                            const bal = bookBalanceMap.get(book.id) || { formatted: '₹ 0', isNegative: false };
                            const isActive = book.id === activeBookId;

                            return (
                                <TouchableOpacity
                                    key={book.id}
                                    style={[styles.bookCard, isActive && styles.bookCardActive]}
                                    onPress={() => onSelectBook && onSelectBook(book.id)}
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
                                        <Text style={[styles.balanceText, bal.isNegative ? styles.balanceNegative : styles.balancePositive]}>
                                            {bal.formatted}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Add Custom Book Action Card */}
                        <TouchableOpacity
                            style={styles.addBookCard}
                            onPress={onOpenCreateModal}
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
                                >
                                    <Text style={styles.useTemplateText}>Use</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
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
        paddingTop: Platform.OS === 'android' ? 38 : 12,
        paddingBottom: 8
    },
    headerTitle: {
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
    }
});
