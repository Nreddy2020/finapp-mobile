import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { seedAllModulesComprehensive } from './seedAllModules';

/**
 * DEMO DATA LOADER COMPONENT
 * Use this to populate the app with comprehensive demo data
 * Add it to your app's debug or settings screen
 */
export const DemoDataLoaderScreen = () => {
    const [loading, setLoading] = useState(false);
    const [seedStatus, setSeedStatus] = useState(null);
    const [completedModules, setCompletedModules] = useState([]);

    const handleLoadDemoData = async () => {
        setLoading(true);
        setSeedStatus(null);
        setCompletedModules([]);

        try {
            const result = await seedAllModulesComprehensive();
            
            if (result.success) {
                setCompletedModules([
                    '✅ Transactions',
                    '✅ Income Sources',
                    '✅ Budgets',
                    '✅ Bank Accounts',
                    '✅ Savings Goals',
                    '✅ Investments',
                    '✅ Properties',
                    '✅ Loans & EMI',
                    '✅ Pending Items',
                    '✅ Bills & Recurring',
                    '✅ Business Data',
                    '✅ Family Expenses',
                    '✅ Education & Career',
                    '✅ Travel Data',
                    '✅ Medicine Tracking',
                    '✅ Gamification',
                    '✅ Notifications',
                    '✅ Feedback',
                    '✅ Financial Health',
                    '✅ Settings'
                ]);
                setSeedStatus({
                    success: true,
                    message: result.message,
                    duration: result.duration
                });
                Alert.alert(
                    '🎉 Success',
                    `All demo data loaded successfully!\n\n${result.message}`,
                    [{ text: 'OK', onPress: () => {} }]
                );
            } else {
                setSeedStatus({ success: false, message: result.error });
                Alert.alert('❌ Error', result.error);
            }
        } catch (error) {
            setSeedStatus({ success: false, message: error.message });
            Alert.alert('❌ Error', `Failed to load demo data: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10 }}>
                    📊 Demo Data Loader
                </Text>
                <Text style={{ fontSize: 14, color: '#aaa', marginBottom: 20 }}>
                    Load comprehensive demo data across ALL 25+ modules for a complete app showcase
                </Text>

                {/* Load Button */}
                <TouchableOpacity
                    onPress={handleLoadDemoData}
                    disabled={loading}
                    style={{
                        backgroundColor: loading ? '#666' : '#007AFF',
                        paddingVertical: 16,
                        paddingHorizontal: 20,
                        borderRadius: 12,
                        alignItems: 'center',
                        marginBottom: 20,
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 10 }}>
                                Seeding Data...
                            </Text>
                        </View>
                    ) : (
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                            🌱 Load All Demo Data
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Status */}
                {seedStatus && (
                    <View
                        style={{
                            backgroundColor: seedStatus.success ? '#1a4d1a' : '#4d1a1a',
                            padding: 16,
                            borderRadius: 8,
                            marginBottom: 20,
                            borderLeftWidth: 4,
                            borderLeftColor: seedStatus.success ? '#4ade80' : '#ef4444'
                        }}
                    >
                        <Text style={{ color: seedStatus.success ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>
                            {seedStatus.success ? '✅ Success' : '❌ Failed'}
                        </Text>
                        <Text style={{ color: '#fff', marginTop: 8 }}>
                            {seedStatus.message}
                        </Text>
                        {seedStatus.duration && (
                            <Text style={{ color: '#aaa', marginTop: 8, fontSize: 12 }}>
                                ⏱️ Completed in {seedStatus.duration.toFixed(2)} seconds
                            </Text>
                        )}
                    </View>
                )}

                {/* Completed Modules List */}
                {completedModules.length > 0 && (
                    <View style={{ backgroundColor: '#1a1a1a', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 12 }}>
                            📋 Seeded Modules:
                        </Text>
                        {completedModules.map((module, index) => (
                            <Text key={index} style={{ color: '#4ade80', marginBottom: 8, fontSize: 13 }}>
                                {module}
                            </Text>
                        ))}
                    </View>
                )}

                {/* Info Section */}
                <View style={{ backgroundColor: '#1a2332', padding: 16, borderRadius: 8 }}>
                    <Text style={{ color: '#60a5fa', fontWeight: 'bold', marginBottom: 10 }}>
                        ℹ️ What's Included:
                    </Text>
                    <View>
                        <Text style={{ color: '#aaa', marginBottom: 8, fontSize: 13 }}>
                            • 100+ transaction records
                        </Text>
                        <Text style={{ color: '#aaa', marginBottom: 8, fontSize: 13 }}>
                            • Multiple income sources
                        </Text>
                        <Text style={{ color: '#aaa', marginBottom: 8, fontSize: 13 }}>
                            • Complete budget tracking
                        </Text>
                        <Text style={{ color: '#aaa', marginBottom: 8, fontSize: 13 }}>
                            • Investment portfolio (₹8.5 lakh+)
                        </Text>
                        <Text style={{ color: '#aaa', marginBottom: 8, fontSize: 13 }}>
                            • Loan & EMI records
                        </Text>
                        <Text style={{ color: '#aaa', marginBottom: 8, fontSize: 13 }}>
                            • Family expense tracking
                        </Text>
                        <Text style={{ color: '#aaa', marginBottom: 8, fontSize: 13 }}>
                            • Business sales data
                        </Text>
                        <Text style={{ color: '#aaa', marginBottom: 8, fontSize: 13 }}>
                            • Education & career goals
                        </Text>
                        <Text style={{ color: '#aaa', marginBottom: 8, fontSize: 13 }}>
                            • Gamification points & badges
                        </Text>
                        <Text style={{ color: '#aaa', marginBottom: 8, fontSize: 13 }}>
                            • Travel & health tracking
                        </Text>
                        <Text style={{ color: '#aaa', fontSize: 13 }}>
                            • Financial health analytics
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

export default DemoDataLoaderScreen;
