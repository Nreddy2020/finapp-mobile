import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Plus, Clock } from 'lucide-react-native';

const COLOR_PALETTE = [
    { bg: '#38BDF820', border: '#38BDF860', text: '#38BDF8' }, // Sky
    { bg: '#10B98120', border: '#10B98160', text: '#10B981' }, // Green
    { bg: '#F43F5E20', border: '#F43F5E60', text: '#F43F5E' }, // Rose / Pink
    { bg: '#F59E0B20', border: '#F59E0B60', text: '#F59E0B' }, // Amber
    { bg: '#8B5CF620', border: '#8B5CF660', text: '#8B5CF6' }, // Purple
    { bg: '#06B6D420', border: '#06B6D460', text: '#06B6D4' }, // Cyan
    { bg: '#6366F120', border: '#6366F160', text: '#6366F1' }, // Indigo
];

export default function DailyScheduleTimeline({
    blocks = [],
    tasks = [],
    onAddTask,
    onEditBlock,
    timeZone = 'UTC'
}) {
    // Current time indicator calculation
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const nowFormatted = `${currentHour % 12 || 12}:${currentMinute.toString().padStart(2, '0')}`;

    // Standard hours list from 6 AM to 8 PM
    const HOURS = [
        { label: '6 AM', hour: 6 },
        { label: '8 AM', hour: 8 },
        { label: '9 AM', hour: 9 },
        { label: '10 AM', hour: 10 },
        { label: '11 AM', hour: 11 },
        { label: '12 PM', hour: 12 },
        { label: '1 PM', hour: 13 },
        { label: '2 PM', hour: 14 },
        { label: '3 PM', hour: 15 },
        { label: '4 PM', hour: 16 },
        { label: '5 PM', hour: 17 },
        { label: '6 PM', hour: 18 },
        { label: '8 PM', hour: 20 }
    ];

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View style={styles.titleWrap}>
                    <Clock size={16} color="#38BDF8" />
                    <Text style={styles.cardTitle}>Daily Schedule</Text>
                </View>
                {onAddTask && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Add Task"
                        onPress={onAddTask}
                        style={styles.addButton}
                    >
                        <Plus size={13} color="#FFFFFF" />
                        <Text style={styles.addButtonText}>Add Task</Text>
                    </Pressable>
                )}
            </View>

            {/* Timeline Stream */}
            <View style={styles.timelineContainer}>
                {HOURS.map((h, i) => {
                    // Match blocks falling into this hour
                    const matchingBlocks = blocks.filter(b => {
                        if (!b.startUtc) return false;
                        const d = new Date(b.startUtc);
                        return d.getHours() === h.hour;
                    });

                    const isCurrentHourWindow = currentHour === h.hour;

                    return (
                        <View key={h.label} style={styles.hourRow}>
                            {/* Left Time Label */}
                            <View style={styles.hourLabelCol}>
                                <Text style={styles.hourText}>{h.label}</Text>
                            </View>

                            {/* Middle Timeline Line & Blocks */}
                            <View style={styles.slotsCol}>
                                {/* Red 'Now' Marker */}
                                {isCurrentHourWindow && (
                                    <View style={styles.nowIndicatorWrapper}>
                                        <View style={styles.nowBadge}>
                                            <Text style={styles.nowBadgeText}>Now</Text>
                                        </View>
                                        <View style={styles.nowLine} />
                                    </View>
                                )}

                                {/* Block Chips */}
                                {matchingBlocks.length > 0 ? (
                                    matchingBlocks.map((blk, idx) => {
                                        const c = COLOR_PALETTE[(blk.id ? blk.id.charCodeAt(0) : idx) % COLOR_PALETTE.length];
                                        const title = blk.task?.task || blk.title || 'Focus Task';
                                        return (
                                            <Pressable
                                                key={blk.id || idx}
                                                onPress={() => onEditBlock && onEditBlock(blk.task, blk)}
                                                style={[styles.blockPill, { backgroundColor: c.bg, borderColor: c.border }]}
                                            >
                                                <Text numberOfLines={1} style={[styles.blockTitle, { color: c.text }]}>
                                                    {title}
                                                </Text>
                                                <Text style={styles.blockDuration}>{blk.minutes || 30}m</Text>
                                            </Pressable>
                                        );
                                    })
                                ) : (
                                    <View style={styles.emptySlotLine} />
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#2563EB',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    timelineContainer: {
        paddingTop: 4,
    },
    hourRow: {
        flexDirection: 'row',
        minHeight: 40,
        alignItems: 'flex-start',
    },
    hourLabelCol: {
        width: 50,
        paddingTop: 2,
    },
    hourText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    slotsCol: {
        flex: 1,
        position: 'relative',
        paddingBottom: 6,
        justifyContent: 'center',
    },
    nowIndicatorWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 3,
    },
    nowBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        marginRight: 4,
    },
    nowBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    nowLine: {
        flex: 1,
        height: 2,
        backgroundColor: '#EF4444',
        borderRadius: 1,
    },
    blockPill: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 4,
    },
    blockTitle: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    blockDuration: {
        fontSize: 10,
        fontWeight: '500',
        color: '#94A3B8',
        marginLeft: 8,
    },
    emptySlotLine: {
        height: 1,
        backgroundColor: '#1E293B50',
        marginTop: 10,
    },
});
