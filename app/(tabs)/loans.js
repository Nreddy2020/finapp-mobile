import React from 'react';
import { View, StyleSheet } from 'react-native';
import BankingMainView from '../../components/banking/BankingMainView';
import StackHeader from '../../components/ui/StackHeader';

export default function LoansScreen() {
    return (
        <View style={styles.container}>
            <StackHeader title="Formal Bank Loans & Debt" />
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
