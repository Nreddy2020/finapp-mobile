import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

export default function FilterChips({
    options = [],
    selected,
    onSelect,
    color = '#6366F1',
    style
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.container, style]}
            contentContainerStyle={styles.content}
        >
            {options.map((option, index) => {
                const isSelected = selected === option.value;
                return (
                    <Pressable
                        key={index}
                        style={[
                            styles.chip,
                            isSelected && {
                                backgroundColor: `${color}20`,
                                borderColor: `${color}40`,
                            }
                        ]}
                        onPress={() => onSelect(option.value)}
                    >
                        <Text style={[
                            styles.chipText,
                            isSelected && { color: color }
                        ]}>
                            {option.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 0,
    },
    content: {
        gap: 8,
        paddingHorizontal: 24,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#FFFFFF15',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#A1A1AA',
        letterSpacing: 0.5,
    },
});
