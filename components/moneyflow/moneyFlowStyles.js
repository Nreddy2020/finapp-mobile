import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const MF_COLORS = {
    bgDark: '#0B0F17',
    cardBg: '#131A26',
    cardBgElevated: '#1A2332',
    cardBgHighlight: '#1E293B',
    border: '#1F2C3F',
    borderSubtle: '#182230',
    borderActive: '#3B82F6',
    primaryBlue: '#2563EB',
    primaryBlueLight: '#3B82F6',
    primaryBlueBg: 'rgba(59, 130, 246, 0.12)',
    successGreen: '#10B981',
    successGreenLight: '#34D399',
    successGreenBg: 'rgba(16, 185, 129, 0.12)',
    dangerRed: '#EF4444',
    dangerRedLight: '#F87171',
    dangerRedBg: 'rgba(239, 68, 68, 0.12)',
    warningAmber: '#F59E0B',
    warningAmberLight: '#FBBF24',
    warningAmberBg: 'rgba(245, 158, 11, 0.14)',
    purple: '#8B5CF6',
    purpleBg: 'rgba(139, 92, 246, 0.12)',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textDisabled: '#475569',
    chipBg: '#162030',
    chipActiveBg: '#1D2D44',
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
        justifyContent: 'space-between',
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
        backgroundColor: MF_COLORS.cardBgElevated,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: MF_COLORS.border,
    },
    periodPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: MF_COLORS.primaryBlueLight,
        marginRight: 4,
    },

    // Card Containers
    card: {
        backgroundColor: MF_COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: MF_COLORS.borderSubtle,
    },
    heroCard: {
        backgroundColor: '#121A2A',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E2D45',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
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
        color: MF_COLORS.textSecondary,
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
        color: '#60A5FA',
        textTransform: 'uppercase',
        letterSpacing: 1.1,
        marginBottom: 6,
    },
    totalHeroAmount: {
        fontSize: 32,
        fontWeight: '900',
        color: MF_COLORS.textPrimary,
        letterSpacing: -0.6,
    },
    totalHeroSubtext: {
        fontSize: 13,
        color: MF_COLORS.textMuted,
        marginTop: 2,
        marginBottom: 16,
    },

    // Segmented Dimension Switcher
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#0E1522',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: MF_COLORS.borderSubtle,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 7,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    segmentBtnActive: {
        backgroundColor: '#2563EB',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 2,
    },
    segmentText: {
        fontSize: 12,
        fontWeight: '600',
        color: MF_COLORS.textMuted,
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
        backgroundColor: MF_COLORS.cardBg,
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: MF_COLORS.borderSubtle,
    },
    primaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: MF_COLORS.primaryBlue,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: MF_COLORS.primaryBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryActionBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        marginLeft: 6,
    },
    quickActionSubRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    quickSubBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: MF_COLORS.cardBgElevated,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: MF_COLORS.borderSubtle,
    },
    quickSubBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: MF_COLORS.textSecondary,
        marginLeft: 4,
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: MF_COLORS.cardBgElevated,
        borderWidth: 1,
        borderColor: MF_COLORS.borderSubtle,
    },
    filterTabActive: {
        backgroundColor: MF_COLORS.primaryBlueBg,
        borderColor: MF_COLORS.primaryBlueLight,
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: MF_COLORS.textMuted,
    },
    filterTabTextActive: {
        color: MF_COLORS.primaryBlueLight,
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
        backgroundColor: MF_COLORS.cardBgElevated,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: MF_COLORS.borderSubtle,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: MF_COLORS.textPrimary,
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
        fontSize: 11,
        fontWeight: '800',
        color: MF_COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },

    // Transaction Row Item
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: MF_COLORS.borderSubtle,
    },
    activityLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    activityEmojiBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    activityEmojiText: {
        fontSize: 17,
    },
    activityMerchant: {
        fontSize: 14,
        fontWeight: '600',
        color: MF_COLORS.textPrimary,
    },
    activityDate: {
        fontSize: 11,
        color: MF_COLORS.textMuted,
        marginTop: 2,
    },
    activityRight: {
        alignItems: 'flex-end',
        marginLeft: 10,
    },
    activityAmount: {
        fontSize: 14,
        fontWeight: '700',
    },
    statusBadgeSorted: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 3,
    },
    statusBadgeSortedText: {
        fontSize: 10,
        color: MF_COLORS.textSecondary,
        fontWeight: '600',
    },
    statusBadgeReview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: MF_COLORS.warningAmberBg,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.4)',
        marginTop: 3,
    },
    statusBadgeReviewText: {
        fontSize: 10,
        color: MF_COLORS.warningAmberLight,
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
