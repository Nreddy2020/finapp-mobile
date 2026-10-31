import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Maximize2, Pause, Play, Square, Shield } from 'lucide-react-native';

export default function FocusModeWidget({
    activeSession,
    activeTask,
    onPause,
    onResume,
    onStop,
    onStartQuick
}) {
    const [distractionBlocker, setDistractionBlocker] = useState(true);

    // Derived timestamps
    const isRunning = activeSession?.state === 'running';
    const isPaused = activeSession?.state === 'paused';
    const hasActive = isRunning || isPaused;

    // Target duration in minutes
    const targetMinutes = activeSession?.targetMinutes || 50;
    
    // Elapsed seconds derived strictly from timestamps
    let elapsedSeconds = 0;
    if (activeSession?.startUtc) {
        const start = Date.parse(activeSession.startUtc);
        const now = isPaused && activeSession.lastPauseUtc ? Date.parse(activeSession.lastPauseUtc) : Date.now();
        const pauseAcc = (activeSession.accumulatedPauseSeconds || 0) * 1000;
        elapsedSeconds = Math.max(0, Math.floor((now - start - pauseAcc) / 1000));
    }

    const totalTargetSeconds = targetMinutes * 60;
    const remainingSeconds = Math.max(0, totalTargetSeconds - elapsedSeconds);

    const formatTime = (totalSec) => {
        const safe = Math.max(0, Math.floor(totalSec || 0));
        const m = Math.floor(safe / 60);
        const s = safe % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const taskName = activeTask?.task || activeSession?.taskTitle || 'Focus Session';

    // SVG Circular Meter Math
    const radius = 54;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const percent = Math.min(100, Math.max(0, Math.round((elapsedSeconds / totalTargetSeconds) * 100)));
    const strokeDashoffset = circumference - (circumference * percent) / 100;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Text style={styles.cardTitle}>Focus Mode</Text>
                <Maximize2 size={16} color="#94A3B8" />
            </View>

            {/* Current Subject */}
            <View style={styles.subjectContainer}>
                <Text numberOfLines={1} style={styles.subjectText}>{taskName}</Text>
                <Text style={styles.sessionType}>Focus Session</Text>
            </View>

            {/* Circular Timer Display */}
            <View style={styles.circleContainer}>
                <Svg width={140} height={140} viewBox="0 0 130 130">
                    <Circle
                        cx="65"
                        cy="65"
                        r={radius}
                        stroke="#1E293B"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    <Circle
                        cx="65"
                        cy="65"
                        r={radius}
                        stroke="#10B981"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="none"
                        transform="rotate(-90 65 65)"
                    />
                </Svg>
                <View style={styles.timerCenter}>
                    <Text style={styles.timerLargeText}>
                        {hasActive ? formatTime(remainingSeconds) : '25:00'}
                    </Text>
                    <Text style={styles.timerTargetText}>
                        / {formatTime(totalTargetSeconds)}
                    </Text>
                </View>
            </View>

            {/* Controls */}
            <View style={styles.controlsRow}>
                {hasActive ? (
                    <>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={isRunning ? 'Pause session' : 'Resume session'}
                            onPress={isRunning ? onPause : onResume}
                            style={styles.pauseButton}
                        >
                            {isRunning ? <Pause size={14} color="#F8FAFC" /> : <Play size={14} color="#F8FAFC" />}
                            <Text style={styles.pauseButtonText}>{isRunning ? 'Pause' : 'Resume'}</Text>
                        </Pressable>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Finish session"
                            onPress={onStop}
                            style={styles.finishButton}
                        >
                            <Square size={14} color="#FFFFFF" />
                            <Text style={styles.finishButtonText}>Finish</Text>
                        </Pressable>
                    </>
                ) : (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Start Focus session"
                        onPress={onStartQuick}
                        style={styles.startButton}
                    >
                        <Play size={14} color="#FFFFFF" />
                        <Text style={styles.startButtonText}>Start Focus (25m)</Text>
                    </Pressable>
                )}
            </View>

            {/* Distraction Blocker Toggle */}
            <View style={styles.blockerRow}>
                <View style={styles.blockerLabelWrap}>
                    <Shield size={14} color={distractionBlocker ? '#10B981' : '#64748B'} />
                    <Text style={styles.blockerText}>Distraction Blocker</Text>
                </View>
                <Switch
                    value={distractionBlocker}
                    onValueChange={setDistractionBlocker}
                    trackColor={{ false: '#334155', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                />
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
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    subjectContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    subjectText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
        textAlign: 'center',
    },
    sessionType: {
        fontSize: 11,
        fontWeight: '500',
        color: '#94A3B8',
        marginTop: 2,
    },
    circleContainer: {
        position: 'relative',
        width: 140,
        height: 140,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    timerCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerLargeText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#F8FAFC',
        letterSpacing: -0.5,
    },
    timerTargetText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 2,
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    pauseButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#1E293B',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },
    pauseButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#F8FAFC',
    },
    finishButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#EF4444',
        paddingVertical: 10,
        borderRadius: 10,
    },
    finishButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    startButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#10B981',
        paddingVertical: 11,
        borderRadius: 10,
    },
    startButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    blockerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E293B50',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#33415550',
    },
    blockerLabelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    blockerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#E2E8F0',
    },
});
