import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const MF_COLORS = {
    bgDark: '#030712',
    cardBg: '#081124',
    cardBgElevated: '#0B162C',
    cardBgHighlight: '#0F1E3A',
    border: '#16233B',
    borderSubtle: '#111D33',
    borderActive: '#2563EB',
    primaryBlue: '#2563EB',
    primaryBlueLight: '#38BDF8',
    primaryBlueBg: '#2563EB',
    successGreen: '#10B981',
    successGreenLight: '#34D399',
    successGreenBg: 'rgba(16, 185, 129, 0.14)',
    dangerRed: '#EF4444',
    dangerRedLight: '#F43F5E',
    dangerRedBg: 'rgba(244, 63, 94, 0.14)',
    warningAmber: '#F59E0B',
    warningAmberLight: '#FBBF24',
    warningAmberBg: 'rgba(245, 158, 11, 0.14)',
    purple: '#A855F7',
    purpleBg: 'rgba(168, 85, 247, 0.14)',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textDisabled: '#475569',
    chipBg: '#0D1933',
    chipActiveBg: '#2563EB',
};

export const mfStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: MF_COLORS.bgDark,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 48,
    },

    // Header
    headerContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 14,
        backgroundColor: MF_COLORS.bgDark,
        borderBottomWidth: 1,
        borderBottomColor: MF_COLORS.borderSubtle,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerMenuBtn: {
        padding: 6,
        marginRight: 6,
        marginLeft: -4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: MF_COLORS.textPrimary,
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 13,
        color: MF_COLORS.textSecondary,
        marginBottom: 10,
    },
    headerMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    cashBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.25)',
    },
    cashBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: MF_COLORS.primaryBlueLight,
        letterSpacing: 0.2,
    },
    periodPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0E172A',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    periodPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#60A5FA',
        marginRight: 4,
    },

    // Card Containers
    card: {
        backgroundColor: '#081124',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#16233B',
    },
    heroCard: {
        backgroundColor: '#081124',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#16233B',
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.9,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: MF_COLORS.textMuted,
        marginTop: 2,
    },

    // Layer 1: Where Did My Cash Go Hero Anchor
    heroAnchorTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#38BDF8',
        textTransform: 'uppercase',
        letterSpacing: 0.9,
        marginBottom: 4,
    },
    totalHeroAmount: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    totalHeroSubtext: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 2,
    },

    // Segmented Dimension Switcher
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#0A1325',
        borderRadius: 14,
        padding: 4,
        marginTop: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#16233B',
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    segmentBtnActive: {
        backgroundColor: '#2563EB',
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    segmentTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },

    // Spending Item Bar
    spendingRow: {
        marginBottom: 12,
    },
    spendingTopMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    spendingItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    spendingEmoji: {
        fontSize: 15,
        marginRight: 8,
    },
    spendingItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: MF_COLORS.textPrimary,
        flex: 1,
    },
    spendingItemAmountRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    spendingItemAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: MF_COLORS.textPrimary,
    },
    spendingItemPercentage: {
        fontSize: 12,
        color: MF_COLORS.textMuted,
        marginLeft: 6,
        fontWeight: '600',
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: '#1E293B',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: 6,
        borderRadius: 3,
    },
    viewBreakdownLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 12,
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    viewBreakdownLinkText: {
        fontSize: 13,
        fontWeight: '700',
        color: MF_COLORS.primaryBlueLight,
        marginRight: 4,
    },

    // Layer 2: Period Statement
    statementGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    statementCol: {
        flex: 1,
        paddingHorizontal: 4,
    },
    statementLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: MF_COLORS.textMuted,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statementIncome: {
        fontSize: 16,
        fontWeight: '800',
        color: MF_COLORS.successGreenLight,
    },
    statementExpense: {
        fontSize: 16,
        fontWeight: '800',
        color: MF_COLORS.textPrimary,
    },
    statementTransfer: {
        fontSize: 16,
        fontWeight: '700',
        color: MF_COLORS.textSecondary,
    },
    statementNet: {
        fontSize: 16,
        fontWeight: '800',
    },
    statementDivider: {
        height: 1,
        backgroundColor: MF_COLORS.borderSubtle,
        marginVertical: 10,
    },
    savingsRateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    savingsRateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: MF_COLORS.successGreenBg,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    savingsRateText: {
        fontSize: 12,
        fontWeight: '700',
        color: MF_COLORS.successGreenLight,
    },

    // Layer 3: Quick Action Section
    quickActionCard: {
        backgroundColor: '#081124',
        borderRadius: 20,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#16233B',
    },
    primaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
        height: 50,
        borderRadius: 12,
        marginBottom: 10,
    },
    primaryActionBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    quickActionSubRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    quickSubBtn: {
        flex: 1,
        height: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B162C',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#162644',
    },
    quickSubBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 6,
    },

    // Layer 4: Cash Activity
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    filterTabsScroll: {
        marginBottom: 12,
    },
    filterTabsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: '#0C1830',
        borderWidth: 1,
        borderColor: '#162644',
        marginRight: 8,
    },
    filterTabActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    filterTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8',
    },
    filterTabTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    filterTabBadge: {
        backgroundColor: MF_COLORS.warningAmber,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
        marginLeft: 5,
    },
    filterTabBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#000000',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0B162C',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 46,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#16243E',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#FFFFFF',
        marginLeft: 8,
        padding: 0,
    },

    // Date Group Header
    dateGroupHeader: {
        paddingVertical: 6,
        paddingHorizontal: 2,
        marginTop: 6,
        marginBottom: 4,
    },
    dateGroupHeaderText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Transaction Row Item
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#0E1A2E',
    },
    activityLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    activityEmojiBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        backgroundColor: '#111D33',
    },
    activityEmojiText: {
        fontSize: 18,
    },
    activityMerchant: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    activityDate: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 3,
    },
    activityRight: {
        alignItems: 'flex-end',
        marginLeft: 10,
    },
    activityAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    statusBadgeSorted: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0C1D36',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
    },
    statusBadgeSortedText: {
        fontSize: 11,
        color: '#60A5FA',
        fontWeight: '600',
    },
    statusBadgeReview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.35)',
        marginTop: 4,
    },
    statusBadgeReviewText: {
        fontSize: 11,
        color: '#FBBF24',
        fontWeight: '700',
    },

    // Layer 5: Needs Your Attention
    attentionCard: {
        backgroundColor: MF_COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: MF_COLORS.borderSubtle,
    },
    attentionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    attentionItemBorder: {
        borderTopWidth: 1,
        borderTopColor: MF_COLORS.borderSubtle,
    },
    attentionIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    attentionContent: {
        flex: 1,
    },
    attentionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    attentionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: MF_COLORS.textPrimary,
    },
    attentionValue: {
        fontSize: 14,
        fontWeight: '700',
        color: MF_COLORS.textPrimary,
    },
    attentionSubtext: {
        fontSize: 12,
        color: MF_COLORS.textMuted,
        marginTop: 2,
    },

    // Account rows for Where Did My Cash Go (Account segment)
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: MF_COLORS.borderSubtle,
    },
    accountLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    accountDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: MF_COLORS.primaryBlueLight,
        marginRight: 10,
    },
    accountName: {
        fontSize: 14,
        fontWeight: '600',
        color: MF_COLORS.textPrimary,
    },
    accountMask: {
        fontSize: 12,
        color: MF_COLORS.textMuted,
        marginTop: 1,
    },
    accountBalance: {
        fontSize: 14,
        fontWeight: '700',
        color: MF_COLORS.textPrimary,
    },

    // Modal Common Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: MF_COLORS.cardBg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: MF_COLORS.border,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: MF_COLORS.textPrimary,
    },
    modalCloseBtn: {
        padding: 4,
    },
});
