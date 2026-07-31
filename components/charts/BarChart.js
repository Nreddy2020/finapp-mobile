import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

export default function BarChart({ data, width = 300, height = 200, unit = '₹' }) {
    if (!data || data.length === 0) return null;

    const barWidth = 12;
    const spacing = 20;
    const chartWidth = width;
    const chartHeight = height - 40;

    // Find max value for scaling
    const maxValue = Math.max(...data.map(d => Math.max(d.value1, d.value2 || 0)));
    const scale = maxValue > 0 ? chartHeight / maxValue : 0;

    return (
        <View style={styles.container}>
            <Svg width={width} height={height}>
                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
                    <Line
                        key={i}
                        x1="40"
                        y1={chartHeight - (chartHeight * f)}
                        x2={width}
                        y2={chartHeight - (chartHeight * f)}
                        stroke="#333"
                        strokeDasharray="4 4"
                    />
                ))}

                {/* Y Axis Labels */}
                {[0, 0.5, 1].map((f, i) => (
                    <SvgText
                        key={i}
                        x="0"
                        y={chartHeight - (chartHeight * f) + 4}
                        fill="#71717A"
                        fontSize="10"
                        textAnchor="start"
                    >
                        {maxValue >= 1000
                            ? `${(maxValue * f / 1000).toFixed(1)}k`
                            : (maxValue * f).toFixed(0)}
                    </SvgText>
                ))}

                {/* Bars */}
                {data.map((item, index) => {
                    const x = 50 + (index * (barWidth * 2 + spacing));
                    const h1 = item.value1 * scale;
                    const h2 = item.value2 ? item.value2 * scale : 0;

                    return (
                        <React.Fragment key={index}>
                            {/* Bar 1 (Income) */}
                            <Rect
                                x={x}
                                y={chartHeight - h1}
                                width={barWidth}
                                height={h1}
                                fill="#10B981"
                                rx={4}
                            />
                            {/* Bar 2 (Expense) */}
                            {item.value2 !== undefined && (
                                <Rect
                                    x={x + barWidth + 4}
                                    y={chartHeight - h2}
                                    width={barWidth}
                                    height={h2}
                                    fill="#EF4444"
                                    rx={4}
                                />
                            )}
                            {/* X Axis Label */}
                            <SvgText
                                x={x + barWidth}
                                y={height - 10}
                                fill="#A1A1AA"
                                fontSize="10"
                                textAnchor="middle"
                            >
                                {item.label}
                            </SvgText>
                        </React.Fragment>
                    );
                })}
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center' }
});
