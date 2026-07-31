import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Plus } from 'lucide-react-native';
import { getBankAccounts } from '../../services/api';
import BankCard from './BankCard';
import AccountDetailModal from './AccountDetailModal';

export default function AccountsCarousel() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState(null);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const data = await getBankAccounts();
            setAccounts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="small" color="#10B981" style={{ marginVertical: 20 }} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Accounts</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Plus size={16} color="#10B981" />
                    <Text style={styles.addBtnText}>Add New</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                hitSlop={{ top: 20, bottom: 20, left: 0, right: 0 }} // Improved touch area
            >
                {accounts.map((account, index) => (
                    <BankCard
                        key={account.id || index}
                        account={account}
                        onPress={() => setSelectedAccount(account)}
                    />
                ))}

                {/* 'Net Liquid' Summary Card could go here as the last item */}
            </ScrollView>

            <AccountDetailModal
                visible={!!selectedAccount}
                account={selectedAccount}
                onClose={() => setSelectedAccount(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF'
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#10B98110',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    addBtnText: {
        color: '#10B981',
        fontWeight: '600',
        fontSize: 12
    },
    scrollContent: {
        paddingLeft: 24,
        paddingRight: 8 // Padding for the last card
    }
});
