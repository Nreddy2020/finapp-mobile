import React from 'react';
import { View, StyleSheet } from 'react-native';
import BankingMainView from '../../components/banking/BankingMainView';
import StackHeader from '../../components/ui/StackHeader';

export default function EMIsScreen() {
    return (
        <View style={styles.container}>
            <StackHeader title="Bank EMI & Debt Obligations" />
            <BankingMainView />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#090A14'
    }
});
