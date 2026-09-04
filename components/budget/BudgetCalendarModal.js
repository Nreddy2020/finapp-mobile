import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, ChevronLeft, ChevronRight, Home, CreditCard, GraduationCap, Shield, Zap, Wallet, CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '../../services/budget/budgetViewModel.js';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COMMITMENT_ICONS = {
    'Rent': Home,
    'Personal EMI': CreditCard,
    'School Fees': GraduationCap,
    'Insurance': Shield,
    'Utilities': Zap,
    'Salary Expected': Wallet
};

export default function BudgetCalendarModal({ visible, onClose, calendarData, reconciledTotals }) {
    const insets = useSafeAreaInsets();
    const [selectedDay, setSelectedDay] = useState(5);
    const [viewMode, setViewMode] = useState('Calendar'); // 'Calendar' | 'Summary'

    if (!visible || !calendarData) return null;

    const period = calendarData.period || { monthName: 'September', year: 2026, daysInPeriod: 30 };
    const eventsByDay = calendarData.eventsByDay || {};

    // September 2026 starts on Tuesday (offset = 1)
    const startDayOffset = 1;
    const totalSlots = 35; // 5 weeks * 7 days

    const selectedEvents = eventsByDay[selectedDay] || [];

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.container}>
                {/* Header with Safe Area Inset */}
                <View style={[styles.navBar, { paddingTop: Math.max(insets?.top || 0, 48) + 8 }]}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.backBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                        accessibilityLabel="Close calendar"
                        accessibilityRole="button"
                    >
                        <ArrowLeft size={24} color="#F8FAFC" />
                    </TouchableOpacity>

                    <View style={styles.monthNav}>
                        <Text style={styles.navTitle}>{period.monthName} {period.year}</Text>
                        <View style={styles.chevronGroup}>
                            <TouchableOpacity style={styles.navChevron}><ChevronLeft size={16} color="#94A3B8" /></TouchableOpacity>
                            <TouchableOpacity style={styles.navChevron}><ChevronRight size={16} color="#94A3B8" /></TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ width: 24 }} />
                </View>

                {/* Segmented Toggle: [Calendar] [Summary] */}
                <View style={styles.segmentToggle}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, viewMode === 'Calendar' && styles.segmentBtnActive]}
                        onPress={() => setViewMode('Calendar')}
                    >
                        <Text style={[styles.segmentText, viewMode === 'Calendar' && styles.segmentTextActive]}>Calendar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, viewMode === 'Summary' && styles.segmentBtnActive]}
                        onPress={() => setViewMode('Summary')}
                    >
                        <Text style={[styles.segmentText, viewMode === 'Summary' && styles.segmentTextActive]}>Summary</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                    {/* Days of Week Header */}
                    <View style={styles.weekHeader}>
                        {DAYS_OF_WEEK.map(d => (
                            <Text key={d} style={styles.weekDayText}>{d}</Text>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.grid}>
                        {Array.from({ length: totalSlots }).map((_, idx) => {
                            const dayNumber = idx - startDayOffset + 1;
                            const isCurrentMonth = dayNumber >= 1 && dayNumber <= period.daysInPeriod;
                            const displayDay = isCurrentMonth
                                ? dayNumber
                                : (dayNumber < 1 ? 31 + dayNumber : dayNumber - period.daysInPeriod);

                            const hasEvents = isCurrentMonth && eventsByDay[dayNumber] && eventsByDay[dayNumber].length > 0;
                            const isSelected = isCurrentMonth && dayNumber === selectedDay;

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.dayCell,
                                        isSelected && styles.dayCellSelected,
                                        !isCurrentMonth && styles.dayCellInactive
                                    ]}
                                    onPress={() => isCurrentMonth && setSelectedDay(dayNumber)}
                                    disabled={!isCurrentMonth}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.dayNumberText,
                                            isSelected && styles.dayNumberSelected,
                                            !isCurrentMonth && styles.dayNumberInactive
                                        ]}
                                    >
                                        {displayDay}
                                    </Text>
                                    {hasEvents && (
                                        <View style={styles.dotsRow}>
                                            <View style={[styles.eventDot, { backgroundColor: '#F59E0B' }]} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Selected Date Section */}
                    <View style={styles.selectedSection}>
                        <Text style={styles.sectionHeaderTitle}>Selected Date</Text>
                        <Text style={styles.dateSubtitle}>
                            {selectedDay === 5 ? 'Fri, 5 Sep 2026' : `Day ${selectedDay} ${period.monthName} ${period.year}`}
                        </Text>

                        {selectedEvents.length > 0 ? (
                            selectedEvents.map((evt, i) => {
                                const IconComp = COMMITMENT_ICONS[evt.title] || Wallet;
                                return (
                                    <View key={i} style={styles.eventCard}>
                                        <View style={[styles.eventIconBox, { backgroundColor: '#3B82F620' }]}>
                                            <IconComp size={18} color="#3B82F6" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.eventTitle}>{evt.title}</Text>
                                            <Text style={styles.eventTag}>{evt.tag || evt.category}</Text>
                                        </View>
                                        <Text style={[styles.eventAmount, evt.isIncome && { color: '#10B981' }]}>
                                            {formatCurrency(evt.amount)}
                                        </Text>
                                        <ChevronRight size={16} color="#64748B" style={{ marginLeft: 6 }} />
                                    </View>
                                );
                            })
                        ) : (
                            <View style={styles.emptyDateCard}>
                                <Text style={styles.emptyDateText}>No scheduled bills or commitments on this date.</Text>
                            </View>
                        )}
                    </View>

                    {/* Month Summary Card (Reconciled Identically) */}
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>Month Summary</Text>

                        <View style={styles.sumRow}>
                            <Text style={styles.sumLabel}>Total Income</Text>
                            <Text style={styles.sumVal}>{reconciledTotals?.formattedTotalIncome || '₹1,24,000'}</Text>
                        </View>
                        <View style={styles.sumRow}>
                            <Text style={styles.sumLabel}>Total Spending</Text>
                            <Text style={styles.sumVal}>{reconciledTotals?.formattedTotalSpending || '₹86,500'}</Text>
                        </View>
                        <View style={styles.sumRow}>
                            <Text style={styles.sumLabel}>Committed (Upcoming)</Text>
                            <Text style={styles.sumVal}>{reconciledTotals?.formattedCommitted || '₹29,500'}</Text>
                        </View>
                        <View style={[styles.sumRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.sumLabel}>Projected Month End</Text>
                            <Text style={[styles.sumVal, { color: '#10B981', fontWeight: '800' }]}>
                                {reconciledTotals?.formattedProjectedMonthEnd || '₹8,400'}
                            </Text>
                        </View>

                        {/* Status Pill */}
                        <View style={styles.statusPill}>
                            <CheckCircle2 size={16} color="#10B981" />
                            <Text style={styles.statusPillText}>
                                You are expected to end the month with a surplus of {reconciledTotals?.formattedProjectedMonthEnd || '₹8,400'}.
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030712'
    },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12
    },
    backBtn: {
        padding: 4
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    navTitle: {
        color: '#F8FAFC',
        fontSize: 17,
        fontWeight: '700'
    },
    chevronGroup: {
        flexDirection: 'row',
        gap: 2
    },
    navChevron: {
        padding: 4
    },
    segmentToggle: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 4,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8
    },
    segmentBtnActive: {
        backgroundColor: '#1E293B'
    },
    segmentText: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600'
    },
    segmentTextActive: {
        color: '#F8FAFC'
    },
    scrollArea: {
        flex: 1
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40
    },
    weekHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10
    },
    weekDayText: {
        color: '#64748B',
        fontSize: 12,
        width: 38,
        textAlign: 'center'
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 10,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginBottom: 18
    },
    dayCell: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 4
    },
    dayCellSelected: {
        backgroundColor: '#3B82F6'
    },
    dayCellInactive: {
        opacity: 0.3
    },
    dayNumberText: {
        color: '#E2E8F0',
        fontSize: 13,
        fontWeight: '500'
    },
    dayNumberSelected: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    dayNumberInactive: {
        color: '#475569'
    },
    dotsRow: {
        position: 'absolute',
        bottom: 4
    },
    eventDot: {
        width: 4,
        height: 4,
        borderRadius: 2
    },
    selectedSection: {
        marginBottom: 18
    },
    sectionHeaderTitle: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'uppercase'
    },
    dateSubtitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 2,
        marginBottom: 10
    },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginBottom: 8
    },
    eventIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    eventTitle: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '600'
    },
    eventTag: {
        color: '#94A3B8',
        fontSize: 11,
        marginTop: 2
    },
    eventAmount: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700'
    },
    emptyDateCard: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
        alignItems: 'center'
    },
    emptyDateText: {
        color: '#64748B',
        fontSize: 13
    },
    summaryCard: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    summaryTitle: {
        color: '#F8FAFC',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12
    },
    sumRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B50'
    },
    sumLabel: {
        color: '#94A3B8',
        fontSize: 13
    },
    sumVal: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600'
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B98115',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: 14,
        gap: 8,
        borderWidth: 1,
        borderColor: '#10B98130'
    },
    statusPillText: {
        color: '#A7F3D0',
        fontSize: 12,
        fontWeight: '500',
        flex: 1
    }
});
