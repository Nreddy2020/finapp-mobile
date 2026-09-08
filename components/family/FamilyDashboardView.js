import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import {
    Shield,
    AlertTriangle,
    ArrowRight,
    UserPlus,
    CheckSquare,
    PhoneCall,
    TrendingUp,
    HeartHandshake,
    GraduationCap,
    Plus,
    CheckCircle2,
    Clock,
    Users,
    Home,
    Activity,
    Calendar,
    History,
    Sparkles,
    ChevronDown,
    Lock
} from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { DASHBOARD_STATE } from '../../services/family/familyContracts';

export default function FamilyDashboardView({
    dashboardViewModel = null,
    emergencyReadiness = {},
    protectionSummary = {},
    responsibilitiesSummary = {},
    educationSummary = {},
    careSummary = {},
    netWorthSnapshot = null,
    runwayMetrics = null,
    persons = [],
    commitments = [],
    occurrences = [],
    commitmentsViewModel = null,
    familyObligations = null,
    safeToSpendDisplay = 'Not configured',
    onNavigateTab = () => {},
    onOpenAddMember = () => {},
    onOpenAddTask = () => {},
    onOpenAddObligation = () => {},
    onNavigateToRecurring = () => {},
    onOpenHouseholdSelector = () => {},
    onOpenEmergencySOS = () => {}
}) {
    // ViewModel resolution: Use synthesized dashboardViewModel if supplied
    const vm = dashboardViewModel || {};

    // 1. Household
    const hh = vm.household || {
        state: DASHBOARD_STATE.AVAILABLE,
        displayValue: 'Primary Household',
        subtitle: `${persons.length} members in household`
    };

    // 2. Greeting
    const greeting = vm.greeting || {
        state: DASHBOARD_STATE.AVAILABLE,
        greetingText: 'Family Operating System',
        familyStatusBadge: 'FinLife Family OS • Active'
    };

    // 3. Readiness
    const readiness = vm.protectionReadiness || {
        state: DASHBOARD_STATE.AVAILABLE,
        completedCount: emergencyReadiness.completedCount || 0,
        totalCount: emergencyReadiness.totalCount || 9,
        scorePercent: emergencyReadiness.scorePercent || 0,
        readinessStatus: emergencyReadiness.readinessStatus || 'CHECKING'
    };

    const readinessColor = readiness.readinessStatus === 'EXCELLENT' ? '#10B981' :
        readiness.readinessStatus === 'GOOD' ? '#3B82F6' :
        readiness.readinessStatus === 'NEEDS_ATTENTION' ? '#F59E0B' : '#EF4444';

    // 4. People Roster
    const roster = vm.peopleRoster || {
        state: persons.length > 0 ? DASHBOARD_STATE.AVAILABLE : DASHBOARD_STATE.EMPTY,
        totalCount: persons.length,
        coveredCount: Math.max(0, persons.length - (protectionSummary.uncoveredMembers?.length || 0)),
        uncoveredCount: protectionSummary.uncoveredMembers?.length || 0,
        persons: persons.map(p => ({
            id: p.id || p.core?.id,
            name: p.name || p.core?.name || 'Member',
            role: p.role || p.core?.role || 'MEMBER',
            isUncovered: protectionSummary?.uncoveredMembers?.some(u => u.id === (p.id || p.core?.id))
        }))
    };

    // 5. Financial Obligations
    const obligations = vm.obligations || {
        state: commitments.length > 0 ? DASHBOARD_STATE.AVAILABLE : DASHBOARD_STATE.EMPTY,
        hasObligations: commitments.length > 0,
        monthlyCommittedFormatted: familyObligations?.totalFamilyMonthlyDisplay || commitmentsViewModel?.hero?.monthlyCommittedFormatted || '₹0',
        activeCount: commitments.length,
        paidCount: commitmentsViewModel?.recentPaid?.length || 0,
        upcomingCount: commitmentsViewModel?.upcoming?.length || 0,
        failedCount: commitmentsViewModel?.failed?.length || 0,
        upcomingList: commitmentsViewModel?.upcoming || [],
        safeToSpendDisplay: safeToSpendDisplay || 'Not configured'
    };

    // 6. Needs Attention
    const needsAttention = vm.needsAttention || {
        state: DASHBOARD_STATE.EMPTY,
        alerts: []
    };

    // 7. Upcoming Tasks & Renewals
    const upcoming = vm.upcoming || {
        state: DASHBOARD_STATE.EMPTY,
        items: [],
        displayValue: 'All responsibilities up to date',
        subtitle: 'No pending renewals or obligations'
    };

    // 8. Health Summary
    const healthSummary = vm.healthSummary || {
        state: DASHBOARD_STATE.NOT_CONFIGURED,
        displayValue: 'Health profile pending configuration',
        subtitle: 'Designate emergency contacts and medical records'
    };

    // 9. Education Funding
    const education = vm.education || {
        state: DASHBOARD_STATE.NOT_CONFIGURED,
        displayValue: 'Not configured',
        subtitle: 'Model inflation-adjusted higher education goals for children',
        goalsCount: 0
    };

    // 10. Emergency Fund & Runway
    const runwayStatus = runwayMetrics?.status || 'NOT_CONFIGURED';
    const emergencyFund = vm.emergencyFund || {
        state: runwayStatus === 'NOT_CONFIGURED' ? DASHBOARD_STATE.NOT_CONFIGURED : DASHBOARD_STATE.AVAILABLE,
        displayValue: runwayMetrics?.runwayDisplay || 'Not configured',
        subtitle: 'Configure recurring commitments to measure liquidity runway',
        runwayStatus
    };

    const runwayColor = emergencyFund.runwayStatus === 'EXCELLENT' ? '#10B981' :
        emergencyFund.runwayStatus === 'ADEQUATE' || emergencyFund.runwayStatus === 'GOOD' ? '#3B82F6' :
        emergencyFund.runwayStatus === 'CRITICAL' ? '#EF4444' : '#F59E0B';

    // 11. Financial Snapshot
    const financialSnapshot = vm.financialSnapshot || {
        state: netWorthSnapshot ? DASHBOARD_STATE.AVAILABLE : DASHBOARD_STATE.UNAVAILABLE,
        netWorthDisplay: netWorthSnapshot?.netWorthDisplay || 'Unavailable',
        totalAssetsDisplay: netWorthSnapshot?.totalAssetsDisplay || 'Unavailable',
        liquidDisplay: netWorthSnapshot?.liquidDisplay || 'Unavailable',
        totalLiabilitiesDisplay: netWorthSnapshot?.totalLiabilitiesDisplay || 'Unavailable'
    };

    // 12. Recent Changes
    const recentChanges = vm.recentChanges || {
        state: DASHBOARD_STATE.EMPTY,
        items: []
    };

    // 13. Plan Overview
    const planOverview = vm.planOverview || {
        planName: 'FinLife Family Standard',
        offlineEncryption: 'AES-256 GCM • Local Only'
    };

    return (
        <View style={styles.container}>
            {/* 1. HOUSEHOLD IDENTIFIER & GREETING BAR */}
            <View style={styles.topHeaderBar}>
                <Pressable style={styles.householdSelectorBtn} onPress={onOpenHouseholdSelector}>
                    <View style={styles.householdIconWrap}>
                        <Home size={14} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.householdNameText} numberOfLines={1}>{hh.displayValue}</Text>
                        <Text style={styles.householdSubText}>{hh.subtitle}</Text>
                    </View>
                    <ChevronDown size={14} color="#71717A" />
                </Pressable>

                <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusPillText}>100% Offline</Text>
                </View>
            </View>

            {/* 2. GREETING HERO TEXT */}
            <View style={styles.greetingWrapper}>
                <Text style={styles.greetingTitle}>{greeting.greetingText}</Text>
                <Text style={styles.greetingSubtitle}>Protect, Plan & Care across your entire household</Text>
            </View>

            {/* 3. PROTECTION READINESS HERO CARD */}
            <LuxuryCard style={styles.readinessCard}>
                <View style={styles.readinessHeader}>
                    <View style={styles.readinessTitleRow}>
                        <View style={[styles.iconWrap, { backgroundColor: `${readinessColor}20` }]}>
                            <Shield size={20} color={readinessColor} />
                        </View>
                        <View style={styles.readinessTextCol}>
                            <Text style={styles.readinessTitle}>Family Protection Readiness</Text>
                            <Text style={styles.readinessSubtitle}>
                                {readiness.completedCount} of {readiness.totalCount} Core Standards Fulfilled
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.badgePill, { backgroundColor: `${readinessColor}25` }]}>
                        <Text style={[styles.badgeText, { color: readinessColor }]}>
                            {readiness.readinessStatus}
                        </Text>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarTrack}>
                    <View
                        style={[
                            styles.progressBarFill,
                            {
                                width: `${Math.min(100, Math.max(0, readiness.scorePercent))}%`,
                                backgroundColor: readinessColor
                            }
                        ]}
                    />
                </View>

                <Pressable
                    style={styles.inspectButton}
                    onPress={() => onNavigateTab('Reports')}
                >
                    <Text style={styles.inspectButtonText}>Inspect 9-Point Readiness Checklist</Text>
                    <ArrowRight size={14} color="#60A5FA" />
                </Pressable>
            </LuxuryCard>

            {/* 4. MEMBERS COVERED / FAMILY ROSTER */}
            <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>MEMBERS COVERED</Text>
                    {roster.totalCount > 0 && (
                        <Pressable onPress={onOpenAddMember} style={styles.headerAddBtn}>
                            <Plus size={13} color="#3B82F6" />
                            <Text style={styles.headerAddBtnText}>Add Member</Text>
                        </Pressable>
                    )}
                </View>

                {roster.totalCount === 0 ? (
                    <LuxuryCard style={styles.cardPad}>
                        <View style={styles.memberEmptyRow}>
                            <View style={styles.memberEmptyBadge}>
                                <Text style={styles.memberEmptyScore}>0/0</Text>
                            </View>
                            <View style={styles.memberEmptyTextCol}>
                                <Text style={styles.memberEmptyTitle}>Coverage details pending</Text>
                                <Text style={styles.memberEmptySub}>No members added</Text>
                            </View>
                        </View>
                        <Pressable style={styles.primaryActionButton} onPress={onOpenAddMember}>
                            <UserPlus size={16} color="#FFFFFF" />
                            <Text style={styles.primaryActionButtonText}>Add Member</Text>
                        </Pressable>
                    </LuxuryCard>
                ) : (
                    <LuxuryCard style={styles.cardPad}>
                        <View style={styles.memberCoveredHeaderRow}>
                            <View style={[styles.memberCountBadge, { backgroundColor: roster.coveredCount === roster.totalCount ? '#10B98120' : '#F59E0B20' }]}>
                                <Text style={[styles.memberCountBadgeText, { color: roster.coveredCount === roster.totalCount ? '#10B981' : '#F59E0B' }]}>
                                    {roster.coveredCount}/{roster.totalCount}
                                </Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.memberCoveredTitle}>
                                    {roster.coveredCount === roster.totalCount ? 'All Members Protected' : `${roster.uncoveredCount} Member(s) Pending Coverage`}
                                </Text>
                                <Text style={styles.memberCoveredSub}>
                                    {roster.totalCount} active family profile{roster.totalCount !== 1 ? 's' : ''} in circle
                                </Text>
                            </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberRosterScroll}>
                            {roster.persons.map(p => (
                                <View key={p.id} style={styles.memberChip}>
                                    <View style={[styles.memberChipAvatar, p.isUncovered && styles.memberChipAvatarWarning]}>
                                        <Text style={styles.memberChipAvatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.memberChipName} numberOfLines={1}>{p.name}</Text>
                                        <View style={styles.memberRoleTag}>
                                            <Text style={styles.memberRoleTagText}>{p.role}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </LuxuryCard>
                )}
            </View>

            {/* 5. FINANCIAL OBLIGATIONS */}
            <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>FINANCIAL OBLIGATIONS</Text>
                    {obligations.hasObligations && (
                        <Pressable onPress={onOpenAddObligation} style={styles.headerAddBtn}>
                            <Plus size={13} color="#3B82F6" />
                            <Text style={styles.headerAddBtnText}>Add Obligation</Text>
                        </Pressable>
                    )}
                </View>

                {!obligations.hasObligations ? (
                    <LuxuryCard style={styles.cardPad}>
                        <Text style={styles.emptyObligationsDesc}>
                            No recurring obligations configured. Track school fees, rent, medical care, family support, and other commitments.
                        </Text>

                        <Pressable style={styles.primaryActionButton} onPress={onOpenAddObligation}>
                            <Plus size={16} color="#FFFFFF" />
                            <Text style={styles.primaryActionButtonText}>Add Obligation</Text>
                        </Pressable>

                        <View style={styles.obligationsMetricsGrid}>
                            <View style={styles.obligationMetricBox}>
                                <Text style={styles.obligationMetricLabel}>MONTHLY COMMITMENTS</Text>
                                <Text style={styles.obligationMetricVal}>₹0</Text>
                                <Text style={styles.obligationMetricSub}>No active obligations</Text>
                            </View>

                            <View style={styles.obligationMetricBox}>
                                <Text style={styles.obligationMetricLabel}>SAFE-TO-SPEND</Text>
                                <Text style={[styles.obligationMetricVal, { color: '#9CA3AF' }]}>
                                    {obligations.safeToSpendDisplay || 'Not configured'}
                                </Text>
                                <Text style={styles.obligationMetricSub}>Headroom unconstrained</Text>
                            </View>
                        </View>

                        <Pressable style={styles.viewAllObligationsButton} onPress={onNavigateToRecurring}>
                            <Text style={styles.viewAllObligationsButtonText}>View All Recurring Payments</Text>
                            <ArrowRight size={14} color="#60A5FA" />
                        </Pressable>
                    </LuxuryCard>
                ) : (
                    <LuxuryCard style={styles.cardPad}>
                        {/* Top Hero Row */}
                        <View style={styles.obligationsHeroRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.obligationMetricLabel}>MONTHLY COMMITMENTS</Text>
                                <Text style={styles.obligationsHeroAmount}>
                                    {obligations.monthlyCommittedFormatted}
                                    <Text style={styles.perMonthText}>/mo</Text>
                                </Text>
                                <Text style={styles.obligationMetricSub}>
                                    {obligations.activeCount} active recurring obligation{obligations.activeCount !== 1 ? 's' : ''}
                                </Text>
                            </View>

                            {/* Status Badges */}
                            <View style={styles.obligationBadgesCol}>
                                <View style={[styles.statusBadgePill, { backgroundColor: '#10B98120' }]}>
                                    <CheckCircle2 size={12} color="#10B981" />
                                    <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>
                                        {obligations.paidCount} Paid
                                    </Text>
                                </View>
                                <View style={[styles.statusBadgePill, { backgroundColor: '#3B82F620', marginTop: 4 }]}>
                                    <Clock size={12} color="#3B82F6" />
                                    <Text style={[styles.statusBadgeText, { color: '#3B82F6' }]}>
                                        {obligations.upcomingCount} Upcoming
                                    </Text>
                                </View>
                                {obligations.failedCount > 0 && (
                                    <View style={[styles.statusBadgePill, { backgroundColor: '#EF444420', marginTop: 4 }]}>
                                        <AlertTriangle size={12} color="#EF4444" />
                                        <Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>
                                            {obligations.failedCount} Failed
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Safe-to-Spend & Emergency Runway */}
                        <View style={styles.obligationsMetricsGrid}>
                            <View style={styles.obligationMetricBox}>
                                <Text style={styles.obligationMetricLabel}>SAFE-TO-SPEND IMPACT</Text>
                                <Text style={[styles.obligationMetricVal, { color: '#10B981' }]}>
                                    {obligations.safeToSpendDisplay || 'Active'}
                                </Text>
                                <Text style={styles.obligationMetricSub}>Unpaid obligations deducted</Text>
                            </View>

                            <View style={styles.obligationMetricBox}>
                                <Text style={styles.obligationMetricLabel}>EMERGENCY RUNWAY</Text>
                                <Text style={[styles.obligationMetricVal, { color: runwayColor }]}>
                                    {emergencyFund.displayValue}
                                </Text>
                                <Text style={styles.obligationMetricSub}>
                                    {emergencyFund.runwayStatus}
                                </Text>
                            </View>
                        </View>

                        {/* Upcoming Payments list */}
                        {obligations.upcomingList.length > 0 && (
                            <View style={styles.upcomingPaymentsList}>
                                <Text style={styles.upcomingSectionTitle}>UPCOMING PAYMENTS</Text>
                                {obligations.upcomingList.slice(0, 3).map(item => (
                                    <View key={item.id} style={styles.upcomingPaymentRow}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.upcomingPaymentName} numberOfLines={1}>{item.name}</Text>
                                            <View style={styles.upcomingMetaWrap}>
                                                <Text style={styles.upcomingPaymentDate}>
                                                    {item.dueInLabel || item.formattedDate}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.upcomingPaymentAmount}>{item.amountFormatted}</Text>
                                            <Text style={styles.upcomingReconcileStatus}>Pending Payment</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.obligationsActionRow}>
                            <Pressable style={styles.secondaryActionButton} onPress={onOpenAddObligation}>
                                <Plus size={14} color="#60A5FA" />
                                <Text style={styles.secondaryActionButtonText}>Add Obligation</Text>
                            </Pressable>

                            <Pressable style={styles.viewAllObligationsButton} onPress={onNavigateToRecurring}>
                                <Text style={styles.viewAllObligationsButtonText}>View All Recurring Payments</Text>
                                <ArrowRight size={14} color="#60A5FA" />
                            </Pressable>
                        </View>
                    </LuxuryCard>
                )}
            </View>

            {/* 6. NEEDS ATTENTION STREAM */}
            {needsAttention.alerts.length > 0 && (
                <View style={styles.sectionWrapper}>
                    <Text style={styles.sectionHeader}>NEEDS ATTENTION</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.alertScrollContent}>
                        {needsAttention.alerts.map(a => (
                            <Pressable
                                key={a.id}
                                style={[
                                    styles.alertCard,
                                    a.type === 'error' ? styles.alertCardError : styles.alertCardWarning
                                ]}
                                onPress={() => onNavigateTab(a.targetTab)}
                            >
                                <View style={styles.alertCardTop}>
                                    <AlertTriangle size={16} color={a.type === 'error' ? '#EF4444' : '#F59E0B'} />
                                    <Text style={styles.alertTag}>{a.targetTab.toUpperCase()}</Text>
                                </View>
                                <Text style={styles.alertTitle} numberOfLines={1}>{a.title}</Text>
                                <Text style={styles.alertSubtitle} numberOfLines={2}>{a.subtitle}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* 7. UPCOMING TASKS & RENEWALS UNIFIED TIMELINE */}
            <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>UPCOMING TASKS & RENEWALS</Text>
                    <Pressable onPress={() => onNavigateTab('Tasks')} style={styles.headerAddBtn}>
                        <Text style={styles.headerAddBtnText}>View Tasks</Text>
                        <ArrowRight size={12} color="#3B82F6" />
                    </Pressable>
                </View>

                <LuxuryCard style={styles.cardPad}>
                    {upcoming.items.length === 0 ? (
                        <View style={styles.emptyStateCenter}>
                            <CheckCircle2 size={24} color="#10B981" />
                            <Text style={styles.emptyStateTitle}>All responsibilities up to date</Text>
                            <Text style={styles.emptyStateSub}>No renewals, school fees, or tasks due in the next 30 days</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {upcoming.items.map(item => (
                                <View key={item.id} style={styles.timelineRow}>
                                    <View style={[styles.timelineDot, { backgroundColor: item.type === 'OBLIGATION' ? '#3B82F6' : '#10B981' }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.timelineTitle} numberOfLines={1}>{item.title}</Text>
                                        <Text style={styles.timelineSub}>{item.dueDate} • {item.type === 'OBLIGATION' ? 'Recurring Obligation' : 'Responsibility'}</Text>
                                    </View>
                                    {item.amountFormatted && (
                                        <Text style={styles.timelineAmount}>{item.amountFormatted}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </LuxuryCard>
            </View>

            {/* 8. FAMILY HEALTH SUMMARY */}
            <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>FAMILY HEALTH SUMMARY</Text>
                    <Pressable onPress={() => onNavigateTab('Health')} style={styles.headerAddBtn}>
                        <Text style={styles.headerAddBtnText}>Health Hub</Text>
                        <ArrowRight size={12} color="#3B82F6" />
                    </Pressable>
                </View>

                <LuxuryCard style={styles.cardPad}>
                    <View style={styles.healthSummaryHeader}>
                        <View style={[styles.iconWrap, { backgroundColor: '#EF444420' }]}>
                            <Activity size={20} color="#EF4444" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.healthSummaryTitle}>{healthSummary.displayValue}</Text>
                            <Text style={styles.healthSummarySub}>{healthSummary.subtitle}</Text>
                        </View>
                    </View>

                    <View style={styles.healthActionsRow}>
                        <Pressable style={styles.sosButton} onPress={onOpenEmergencySOS}>
                            <PhoneCall size={14} color="#EF4444" />
                            <Text style={styles.sosButtonText}>Emergency SOS Action</Text>
                        </Pressable>
                        <Pressable style={styles.healthViewBtn} onPress={() => onNavigateTab('Health')}>
                            <Text style={styles.healthViewBtnText}>View Medical Directory</Text>
                        </Pressable>
                    </View>
                </LuxuryCard>
            </View>

            {/* 9. EDUCATION FUNDING PROGRESS (HONEST NOT_CONFIGURED STATE) */}
            <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>EDUCATION FUNDING PROGRESS</Text>
                    <Pressable onPress={() => onNavigateTab('Education')} style={styles.headerAddBtn}>
                        <Text style={styles.headerAddBtnText}>Education Hub</Text>
                        <ArrowRight size={12} color="#3B82F6" />
                    </Pressable>
                </View>

                <LuxuryCard style={styles.cardPad}>
                    <View style={styles.eduHeaderRow}>
                        <View style={[styles.iconWrap, { backgroundColor: '#14B8A620' }]}>
                            <GraduationCap size={20} color="#14B8A6" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.eduTitle}>{education.displayValue}</Text>
                            <Text style={styles.eduSub}>{education.subtitle}</Text>
                        </View>
                    </View>

                    {education.state === DASHBOARD_STATE.NOT_CONFIGURED && (
                        <Pressable style={styles.secondaryActionButton} onPress={() => onNavigateTab('Education')}>
                            <Plus size={14} color="#14B8A6" />
                            <Text style={[styles.secondaryActionButtonText, { color: '#14B8A6' }]}>Model Child Education Goal</Text>
                        </Pressable>
                    )}
                </LuxuryCard>
            </View>

            {/* 10. EMERGENCY FUND COVERAGE */}
            <View style={styles.sectionWrapper}>
                <Text style={styles.sectionHeader}>EMERGENCY FUND COVERAGE</Text>
                <LuxuryCard style={styles.cardPad}>
                    <View style={styles.runwayHeaderRow}>
                        <View style={[styles.iconWrap, { backgroundColor: `${runwayColor}20` }]}>
                            <Shield size={20} color={runwayColor} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.runwayTitle}>
                                {emergencyFund.displayValue}
                            </Text>
                            <Text style={styles.runwaySub}>
                                {emergencyFund.subtitle}
                            </Text>
                        </View>
                    </View>
                </LuxuryCard>
            </View>

            {/* 11. FAMILY FINANCIAL SNAPSHOT (READ-ONLY) */}
            <View style={styles.sectionWrapper}>
                <Text style={styles.sectionHeader}>FAMILY FINANCIAL SNAPSHOT (READ-ONLY)</Text>
                <View style={styles.snapshotGrid}>
                    <LuxuryCard style={styles.snapshotCard} onPress={() => onNavigateTab('Financials')}>
                        <View style={styles.snapIconRow}>
                            <TrendingUp size={16} color="#10B981" />
                            <Text style={styles.snapLabel}>Family Net Worth</Text>
                        </View>
                        <Text style={styles.snapValue}>{financialSnapshot.netWorthDisplay}</Text>
                        <Text style={styles.snapSub}>Assets: {financialSnapshot.totalAssetsDisplay}</Text>
                    </LuxuryCard>

                    <LuxuryCard style={styles.snapshotCard} onPress={() => onNavigateTab('Financials')}>
                        <View style={styles.snapIconRow}>
                            <Shield size={16} color="#3B82F6" />
                            <Text style={styles.snapLabel}>Liquid Reserves</Text>
                        </View>
                        <Text style={styles.snapValue}>{financialSnapshot.liquidDisplay}</Text>
                        <Text style={styles.snapSub}>Debt: {financialSnapshot.totalLiabilitiesDisplay}</Text>
                    </LuxuryCard>
                </View>
            </View>

            {/* 12. RECENT FAMILY CHANGES (ACTIVITY LOG) */}
            <View style={styles.sectionWrapper}>
                <Text style={styles.sectionHeader}>RECENT FAMILY CHANGES</Text>
                <LuxuryCard style={styles.cardPad}>
                    {recentChanges.items.length === 0 ? (
                        <View style={styles.emptyStateCenter}>
                            <History size={20} color="#71717A" />
                            <Text style={styles.emptyStateTitle}>No recent changes recorded</Text>
                            <Text style={styles.emptyStateSub}>Events are recorded when members, tasks, or obligations are updated</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {recentChanges.items.map(item => (
                                <View key={item.id} style={styles.activityLogRow}>
                                    <View style={styles.activityLogDot} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.activityLogDesc}>{item.description}</Text>
                                        <Text style={styles.activityLogTime}>{item.timeLabel}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </LuxuryCard>
            </View>

            {/* 13. QUICK ACTIONS ROW */}
            <View style={styles.quickActionsGrid}>
                <Pressable style={styles.quickActionButton} onPress={onOpenAddMember}>
                    <View style={[styles.actionIconWrap, { backgroundColor: '#3B82F620' }]}>
                        <UserPlus size={18} color="#3B82F6" />
                    </View>
                    <Text style={styles.actionLabel}>Add Person</Text>
                </Pressable>

                <Pressable style={styles.quickActionButton} onPress={onOpenAddTask}>
                    <View style={[styles.actionIconWrap, { backgroundColor: '#10B98120' }]}>
                        <CheckSquare size={18} color="#10B981" />
                    </View>
                    <Text style={styles.actionLabel}>New Task</Text>
                </Pressable>

                <Pressable style={styles.quickActionButton} onPress={onOpenAddObligation}>
                    <View style={[styles.actionIconWrap, { backgroundColor: '#F59E0B20' }]}>
                        <Plus size={18} color="#F59E0B" />
                    </View>
                    <Text style={styles.actionLabel}>Add Obligation</Text>
                </Pressable>

                <Pressable style={styles.quickActionButton} onPress={onOpenEmergencySOS}>
                    <View style={[styles.actionIconWrap, { backgroundColor: '#EF444420' }]}>
                        <PhoneCall size={18} color="#EF4444" />
                    </View>
                    <Text style={styles.actionLabel}>SOS</Text>
                </Pressable>
            </View>

            {/* 14. FAMILY PLAN OVERVIEW FOOTER */}
            <View style={styles.planFooter}>
                <View style={styles.planFooterRow}>
                    <Lock size={12} color="#71717A" />
                    <Text style={styles.planFooterText}>{planOverview.planName} • {planOverview.offlineEncryption}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24
    },
    topHeaderBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 2
    },
    householdSelectorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#27272A',
        flex: 1,
        marginRight: 10
    },
    householdIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#3B82F620',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    householdNameText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    householdSubText: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 1
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        gap: 6
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981'
    },
    statusPillText: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '600'
    },
    greetingWrapper: {
        marginBottom: 16,
        paddingHorizontal: 2
    },
    greetingTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    greetingSubtitle: {
        color: '#9CA3AF',
        fontSize: 13,
        marginTop: 3
    },
    readinessCard: {
        marginBottom: 16,
        padding: 16
    },
    readinessHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14
    },
    readinessTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    readinessTextCol: {
        flex: 1,
        marginLeft: 12
    },
    readinessTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    readinessSubtitle: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2
    },
    badgePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700'
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: '#27272A',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3
    },
    inspectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 4
    },
    inspectButtonText: {
        color: '#60A5FA',
        fontSize: 13,
        fontWeight: '600'
    },
    sectionWrapper: {
        marginBottom: 16
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 4
    },
    sectionHeader: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1
    },
    headerAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    headerAddBtnText: {
        color: '#3B82F6',
        fontSize: 12,
        fontWeight: '600'
    },
    cardPad: {
        padding: 16
    },
    // Members covered
    memberEmptyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14
    },
    memberEmptyBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#27272A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3F3F46'
    },
    memberEmptyScore: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '700'
    },
    memberEmptyTextCol: {
        flex: 1,
        marginLeft: 14
    },
    memberEmptyTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600'
    },
    memberEmptySub: {
        color: '#71717A',
        fontSize: 12,
        marginTop: 2
    },
    primaryActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#2563EB',
        paddingVertical: 12,
        borderRadius: 10
    },
    primaryActionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600'
    },
    memberCoveredHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    memberCountBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    memberCountBadgeText: {
        fontSize: 13,
        fontWeight: '700'
    },
    memberCoveredTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600'
    },
    memberCoveredSub: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2
    },
    memberRosterScroll: {
        gap: 8,
        paddingTop: 4
    },
    memberChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27272A',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 8,
        minWidth: 130
    },
    memberChipAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center'
    },
    memberChipAvatarWarning: {
        backgroundColor: '#F59E0B'
    },
    memberChipAvatarText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    memberChipName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    memberRoleTag: {
        alignSelf: 'flex-start',
        backgroundColor: '#3F3F46',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 2
    },
    memberRoleTagText: {
        color: '#D1D5DB',
        fontSize: 9,
        fontWeight: '700'
    },
    // Obligations
    emptyObligationsDesc: {
        color: '#9CA3AF',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 14
    },
    obligationsMetricsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 14,
        marginBottom: 12
    },
    obligationMetricBox: {
        flex: 1,
        backgroundColor: '#27272A',
        padding: 12,
        borderRadius: 10
    },
    obligationMetricLabel: {
        color: '#9CA3AF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    obligationMetricVal: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        marginTop: 4
    },
    obligationMetricSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    viewAllObligationsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        backgroundColor: '#27272A',
        borderRadius: 10,
        marginTop: 4
    },
    viewAllObligationsButtonText: {
        color: '#60A5FA',
        fontSize: 13,
        fontWeight: '600'
    },
    obligationsHeroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    obligationsHeroAmount: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
        marginTop: 2
    },
    perMonthText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500'
    },
    obligationBadgesCol: {
        alignItems: 'flex-end'
    },
    statusBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700'
    },
    upcomingPaymentsList: {
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingTop: 12
    },
    upcomingSectionTitle: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 8
    },
    upcomingPaymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6
    },
    upcomingPaymentName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    upcomingMetaWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2
    },
    upcomingPaymentDate: {
        color: '#9CA3AF',
        fontSize: 11
    },
    upcomingPaymentAmount: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    upcomingReconcileStatus: {
        color: '#F59E0B',
        fontSize: 10,
        marginTop: 1
    },
    obligationsActionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8
    },
    secondaryActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        backgroundColor: '#27272A',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#3F3F46'
    },
    secondaryActionButtonText: {
        color: '#60A5FA',
        fontSize: 13,
        fontWeight: '600'
    },
    // Needs attention
    alertScrollContent: {
        gap: 10
    },
    alertCard: {
        width: 220,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#18181B',
        borderWidth: 1
    },
    alertCardError: {
        borderColor: '#EF444450'
    },
    alertCardWarning: {
        borderColor: '#F59E0B50'
    },
    alertCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    alertTag: {
        color: '#9CA3AF',
        fontSize: 10,
        fontWeight: '700'
    },
    alertTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4
    },
    alertSubtitle: {
        color: '#A1A1AA',
        fontSize: 11
    },
    // Timeline
    emptyStateCenter: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6
    },
    emptyStateTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    emptyStateSub: {
        color: '#71717A',
        fontSize: 11,
        textAlign: 'center'
    },
    timelineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10
    },
    timelineTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    timelineSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    timelineAmount: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    // Health summary
    healthSummaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    healthSummaryTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600'
    },
    healthSummarySub: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2
    },
    healthActionsRow: {
        flexDirection: 'row',
        gap: 10
    },
    sosButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        backgroundColor: '#EF444420',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EF444450'
    },
    sosButtonText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '700'
    },
    healthViewBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: '#27272A',
        borderRadius: 10
    },
    healthViewBtnText: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600'
    },
    // Education
    eduHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    eduTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600'
    },
    eduSub: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2
    },
    // Runway
    runwayHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    runwayTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    runwaySub: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2
    },
    // Financial snapshot
    snapshotGrid: {
        flexDirection: 'row',
        gap: 12
    },
    snapshotCard: {
        flex: 1,
        padding: 14
    },
    snapIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8
    },
    snapLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '600'
    },
    snapValue: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    snapSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 4
    },
    // Activity log
    activityLogRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8
    },
    activityLogDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#3B82F6',
        marginTop: 6
    },
    activityLogDesc: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500'
    },
    activityLogTime: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 2
    },
    // Quick actions
    quickActionsGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16
    },
    quickActionButton: {
        flex: 1,
        backgroundColor: '#18181B',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    actionIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6
    },
    actionLabel: {
        color: '#D1D5DB',
        fontSize: 10,
        fontWeight: '600'
    },
    planFooter: {
        alignItems: 'center',
        paddingVertical: 8
    },
    planFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    planFooterText: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '500'
    }
});
