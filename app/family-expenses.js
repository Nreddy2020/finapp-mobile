import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FamilyExpensesScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Family Expenses</Text>
            <Text style={styles.subtitle}>Module cleared.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090B',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
    },
    title: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8
    },
    subtitle: {
        color: '#71717A',
        fontSize: 14
    }
});
