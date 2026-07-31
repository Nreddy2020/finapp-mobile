import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

export default function PieChart({ data, size = 200 }) {
    if (!data || data.length === 0) return null;

    const radius = size / 2;
    const center = size / 2;
    let startAngle = 0;

    // Helper to calculate arc
    const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <View style={styles.container}>
            <View style={{ position: 'relative', width: size, height: size }}>
                <Svg width={size} height={size}>
                    {data.map((item, index) => {
                        const percent = item.value / total;
                        const endAngle = startAngle + percent;

                        // Calculate path
                        const [startX, startY] = getCoordinatesForPercent(startAngle);
                        const [endX, endY] = getCoordinatesForPercent(endAngle);
                        const largeArcFlag = percent > 0.5 ? 1 : 0;

                        const pathData = [
                            `M ${center} ${center}`,
                            `L ${center + radius * startX} ${center + radius * startY}`,
                            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${center + radius * endX} ${center + radius * endY}`,
                            `Z`
                        ].join(' ');

                        startAngle += percent;

                        return (
                            <Path
                                key={index}
                                d={pathData}
                                fill={item.color}
                            />
                        );
                    })}
                    {/* Inner Circle for Donut Effect */}
                    <Circle cx={center} cy={center} r={radius * 0.6} fill="#000" />
                </Svg>

                {/* Center Text */}
                <View style={[styles.centerText, { width: size, height: size }]}>
                    <Text style={styles.totalValue}>₹{(total / 1000).toFixed(1)}k</Text>
                    <Text style={styles.totalLabel}>Total</Text>
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                {data.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendLabel}>{item.label}</Text>
                        <Text style={styles.legendValue}>{Math.round((item.value / total) * 100)}%</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center' },
    centerText: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
    totalValue: { color: '#FFF', fontSize: 20, fontWeight: '700' },
    totalLabel: { color: '#A1A1AA', fontSize: 12 },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 24 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { color: '#D1D5DB', fontSize: 12 },
    legendValue: { color: '#A1A1AA', fontSize: 12 }
});
