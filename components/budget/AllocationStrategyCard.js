import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Lightbulb, ChevronRight, X, Check } from 'lucide-react-native';
import { ALLOCATION_STRATEGIES } from '../../services/budget/budgetContracts.js';

export default function AllocationStrategyCard({ allocation, onChangeStrategy }) {
    const [modalVisible, setModalVisible] = useState(false);
    if (!allocation) return null;

    const size = 150;
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    // Arcs for Needs, Wants, Future
    // Needs 54%, Wants 30%, Future 16%
    const needsPct = (allocation.needs?.actualPct || 54) / 100;
    const wantsPct = (allocation.wants?.actualPct || 30) / 100;
    const futurePct = (allocation.future?.actualPct || 16) / 100;

    const needsLength = circumference * needsPct;
    const wantsLength = circumference * wantsPct;
    const futureLength = circumference * futurePct;

    // Stroke dash offsets
    const needsOffset = 0;
    const wantsOffset = -needsLength;
    const futureOffset = -(needsLength + wantsLength);

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.cardTitle}>Allocation Strategy</Text>
                    <Text style={styles.strategyName}>{allocation.strategyName || '50/30/20'}</Text>
                </View>
                <TouchableOpacity
                    style={styles.changeBtn}
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
            </View>

            {/* Donut Chart with 3 Colored Segments */}
            <View style={styles.donutContainer}>
                <View style={{ width: size, height: size, position: 'relative' }}>
                    <Svg width={size} height={size}>
                        {/* Track */}
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke="#1E293B"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        {/* Needs Segment (Green) */}
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={allocation.needs?.color || '#10B981'}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${needsLength} ${circumference}`}
                            strokeDashoffset={needsOffset}
                            strokeLinecap="round"
                            fill="none"
                            transform={`rotate(-90 ${center} ${center})`}
                        />
                        {/* Wants Segment (Cyan) */}
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={allocation.wants?.color || '#06B6D4'}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${wantsLength} ${circumference}`}
                            strokeDashoffset={wantsOffset}
                            strokeLinecap="round"
                            fill="none"
                            transform={`rotate(-90 ${center} ${center})`}
                        />
                        {/* Future Segment (Purple) */}
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={allocation.future?.color || '#8B5CF6'}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${futureLength} ${circumference}`}
                            strokeDashoffset={futureOffset}
                            strokeLinecap="round"
                            fill="none"
                            transform={`rotate(-90 ${center} ${center})`}
                        />
                    </Svg>
                    {/* Inner Label */}
                    <View style={styles.donutInner}>
                        <Text style={styles.totalIncomeText}>{allocation.formattedTotalIncome}</Text>
                        <Text style={styles.totalIncomeSub}>Total Income</Text>
                    </View>
                </View>
            </View>

            {/* Breakdown Rows */}
            <View style={styles.breakdownContainer}>
                {/* Needs */}
                <View style={styles.breakdownRow}>
                    <View style={styles.labelCol}>
                        <View style={[styles.dot, { backgroundColor: allocation.needs?.color || '#10B981' }]} />
                        <Text style={styles.breakdownLabel}>{allocation.needs?.label || 'Needs (50%)'}</Text>
                    </View>
                    <View style={styles.amountCol}>
                        <Text style={styles.breakdownAmount}>{allocation.needs?.formattedAmount}</Text>
                        <View style={styles.subRow}>
                            <Text style={styles.actualText}>Actual {allocation.needs?.actualPct}%</Text>
                            <View style={[styles.divergenceBadge, { backgroundColor: `${allocation.needs?.divergenceBadgeColor}20` }]}>
                                <Text style={[styles.divergenceText, { color: allocation.needs?.divergenceBadgeColor }]}>
                                    {allocation.needs?.divergenceText}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Wants */}
                <View style={styles.breakdownRow}>
                    <View style={styles.labelCol}>
                        <View style={[styles.dot, { backgroundColor: allocation.wants?.color || '#06B6D4' }]} />
                        <Text style={styles.breakdownLabel}>{allocation.wants?.label || 'Wants (30%)'}</Text>
                    </View>
                    <View style={styles.amountCol}>
                        <Text style={styles.breakdownAmount}>{allocation.wants?.formattedAmount}</Text>
                        <View style={styles.subRow}>
                            <Text style={styles.actualText}>Actual {allocation.wants?.actualPct}%</Text>
                            <View style={[styles.divergenceBadge, { backgroundColor: `${allocation.wants?.divergenceBadgeColor}20` }]}>
                                <Text style={[styles.divergenceText, { color: allocation.wants?.divergenceBadgeColor }]}>
                                    {allocation.wants?.divergenceText}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Future */}
                <View style={styles.breakdownRow}>
                    <View style={styles.labelCol}>
                        <View style={[styles.dot, { backgroundColor: allocation.future?.color || '#8B5CF6' }]} />
                        <Text style={styles.breakdownLabel}>{allocation.future?.label || 'Future (20%)'}</Text>
                    </View>
                    <View style={styles.amountCol}>
                        <Text style={styles.breakdownAmount}>{allocation.future?.formattedAmount}</Text>
                        <View style={styles.subRow}>
                            <Text style={styles.actualText}>Actual {allocation.future?.actualPct}%</Text>
                            <View style={[styles.divergenceBadge, { backgroundColor: `${allocation.future?.divergenceBadgeColor}20` }]}>
                                <Text style={[styles.divergenceText, { color: allocation.future?.divergenceBadgeColor }]}>
                                    {allocation.future?.divergenceText}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* Smart Tip Card */}
            {allocation.advice && (
                <View style={styles.tipCard}>
                    <Lightbulb size={16} color="#F59E0B" style={styles.tipIcon} />
                    <Text style={styles.tipText}>{allocation.advice}</Text>
                </View>
            )}

            {/* Strategy Switcher Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Allocation Strategy</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={20} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        {Object.values(ALLOCATION_STRATEGIES).map(strat => {
                            const isSelected = strat.id === allocation.strategyId;
                            return (
                                <TouchableOpacity
                                    key={strat.id}
                                    style={[styles.strategyOption, isSelected && styles.strategyOptionSelected]}
                                    onPress={() => {
                                        onChangeStrategy && onChangeStrategy(strat.id);
                                        setModalVisible(false);
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.stratName, isSelected && { color: '#3B82F6' }]}>{strat.name}</Text>
                                        <Text style={styles.stratDesc}>{strat.description}</Text>
                                    </View>
                                    {isSelected && <Check size={18} color="#3B82F6" />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0F172A',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginHorizontal: 16,
        marginBottom: 16
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    cardTitle: {
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: '700'
    },
    strategyName: {
        color: '#94A3B8',
        fontSize: 13,
        marginTop: 2
    },
    changeBtn: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    changeBtnText: {
        color: '#3B82F6',
        fontSize: 12,
        fontWeight: '600'
    },
    donutContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10
    },
    donutInner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center'
    },
    totalIncomeText: {
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: '800'
    },
    totalIncomeSub: {
        color: '#94A3B8',
        fontSize: 11,
        marginTop: 2
    },
    breakdownContainer: {
        marginTop: 16,
        gap: 12
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B50'
    },
    labelCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    breakdownLabel: {
        color: '#E2E8F0',
        fontSize: 14,
        fontWeight: '500'
    },
    amountCol: {
        alignItems: 'flex-end'
    },
    breakdownAmount: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700'
    },
    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2
    },
    actualText: {
        color: '#94A3B8',
        fontSize: 11
    },
    divergenceBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6
    },
    divergenceText: {
        fontSize: 10,
        fontWeight: '700'
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B15',
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#F59E0B30'
    },
    tipIcon: {
        marginRight: 8
    },
    tipText: {
        color: '#FDE68A',
        fontSize: 12,
        flex: 1,
        lineHeight: 16
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 20
    },
    modalBox: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700'
    },
    strategyOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#1E293B',
        marginBottom: 8
    },
    strategyOptionSelected: {
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F610'
    },
    stratName: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '600'
    },
    stratDesc: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 2
    }
});
