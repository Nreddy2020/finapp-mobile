import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Landmark, Lock, Gem, Hexagon, Eye, EyeOff, TrendingUp, CreditCard } from 'lucide-react-native';
import { useGlobalFinance } from '../context/GlobalFinanceContext';

const ICON_MAP = {
    Landmark: Landmark,
    Lock: Lock,
    Gem: Gem,
    Hexagon: Hexagon,
    CreditCard: CreditCard
};

export default function BankCard({ account, onPress }) {
    const { formatAmount, privacyMode } = useGlobalFinance();
    const [liveBalance, setLiveBalance] = useState(account.balance);
    const [localPrivacy, setLocalPrivacy] = useState(true);

    const Icon = ICON_MAP[account.logo] || Landmark;

    // Real-time Interest Simulation
    useEffect(() => {
        if (!account.interest_rate || account.interest_rate === 0) return;

        // Interest per second = Principal * (Rate/100) / 365 / 24 / 3600
        const ratePerSecond = (account.balance * (account.interest_rate / 100)) / 31536000;

        const interval = setInterval(() => {
            setLiveBalance(prev => prev + ratePerSecond);
        }, 1000);

        return () => clearInterval(interval);
    }, [account.balance, account.interest_rate]);

    const displayBalance = (privacyMode || localPrivacy) ? '••••••' : formatAmount(liveBalance, 2);
    const accountNumber = (privacyMode || localPrivacy) ? `•••• ${account.account_number.slice(-4)}` : account.account_number;

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
            <View style={styles.cardContainer}>
                {/* Bank Card Background */}
                <LinearGradient
                    colors={account.color || ['#18181B', '#27272A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                >
                    {/* Glassmorphic Overlay Pattern */}
                    <View style={styles.patternOverlay} />

                    {/* Header: Bank Name & Icon */}
                    <View style={styles.header}>
                        <View style={styles.bankIdentity}>
                            <View style={styles.iconContainer}>
                                <Icon size={20} color="#FFF" />
                            </View>
                            <View>
                                <Text style={styles.bankName}>{account.bank_name}</Text>
                                <Text style={styles.accountType}>{account.type}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => setLocalPrivacy(!localPrivacy)} style={styles.eyeButton}>
                            {localPrivacy ? <EyeOff size={16} color="#FFFFFF80" /> : <Eye size={16} color="#FFFFFF80" />}
                        </TouchableOpacity>
                    </View>

                    {/* Middle: Live Interest Ticker (Enhanced) */}
                    {account.interest_rate > 0 && !privacyMode && !localPrivacy && (
                        <View style={styles.tickerContainer}>
                            <View style={[styles.iconContainer, { width: 24, height: 24, backgroundColor: '#10B98120', borderColor: '#10B98140' }]}>
                                <TrendingUp size={14} color="#10B981" />
                            </View>
                            <View>
                                <Text style={styles.tickerLabel}>Passive Income (Live)</Text>
                                <Text style={styles.tickerText}>
                                    +₹{((liveBalance - account.balance).toFixed(6))}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Footer: Balance & Number */}
                    <View style={styles.footer}>
                        <View>
                            <Text style={styles.label}>Available Balance</Text>
                            <Text style={styles.balance}>{displayBalance}</Text>
                        </View>
                        <View style={styles.numberContainer}>
                            <Text style={styles.accountNumber}>{accountNumber}</Text>
                        </View>
                    </View>

                    {/* Decorative Chip */}
                    <View style={styles.chip} />

                </LinearGradient>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        width: 320,
        height: 190,
        marginRight: 16,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    cardGradient: {
        flex: 1,
        borderRadius: 24,
        padding: 24,
        justifyContent: 'space-between',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#FFFFFF20'
    },
    patternOverlay: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#FFFFFF05',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    bankIdentity: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center'
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFFFFF20',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF30'
    },
    bankName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    accountType: {
        color: '#FFFFFF80',
        fontSize: 12,
        fontWeight: '600'
    },
    eyeButton: {
        padding: 8,
        backgroundColor: '#00000030',
        borderRadius: 20
    },
    tickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#00000060',
        alignSelf: 'flex-start',
        paddingRight: 12,
        paddingLeft: 4,
        paddingVertical: 4,
        borderRadius: 20,
        marginLeft: 4,
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    tickerLabel: {
        color: '#A1A1AA',
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase'
    },
    tickerText: {
        color: '#10B981',
        fontSize: 13,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
        letterSpacing: 0.5
    },
    footer: {
        marginTop: 12 // Adjusted for sizing
    },
    label: {
        color: '#FFFFFF80',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4
    },
    balance: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFF',
        fontVariant: ['tabular-nums']
    },
    numberContainer: {
        marginTop: 8,
        alignSelf: 'flex-end'
    },
    accountNumber: {
        color: '#FFFFFF90',
        fontSize: 14,
        fontFamily: 'monospace',
        letterSpacing: 2
    },
    chip: {
        position: 'absolute',
        top: 80,
        right: 24,
        width: 36,
        height: 28,
        borderRadius: 6,
        backgroundColor: '#FFD700', // Gold chip color
        opacity: 0.8,
        // Linear gradient simulated with opacity
        borderWidth: 1,
        borderColor: '#FFFFFF40'
    }
});
