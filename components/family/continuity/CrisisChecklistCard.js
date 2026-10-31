/**
 * components/family/continuity/CrisisChecklistCard.js
 * 
 * Step-by-Step Emergency Crisis Checklist & Partitioned Disclosure Card.
 * 
 * Contracts Enforced:
 * 1. Level 1 Summary visible by default (contact names, proxy name, instructions).
 * 2. Level 2 Protected Details unlocked only after explicit authentication trigger.
 * 3. 1-tap call triggers OS phone dialer via Linking.openURL (never automatic calling).
 * 4. Displays mandatory medical/legal boundary disclaimer.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { PhoneCall, Shield, Lock, Unlock, AlertOctagon, FileText, UserCheck, CreditCard } from 'lucide-react-native';

export default function CrisisChecklistCard({
    viewModel,
    isLevel2Unlocked,
    onToggleLevel2
}) {
    if (!viewModel) return null;

    const { emergencySummary = {}, protectedDetails = null } = viewModel;
    const { checklist = [], primaryContactName, primaryDialUri, hasPrimaryDialablePhone, disclaimer } = emergencySummary;

    const handleCallPrimary = () => {
        if (!hasPrimaryDialablePhone || !primaryDialUri) {
            Alert.alert('Phone Unavailable', 'No dialable phone number is recorded for the primary contact.');
            return;
        }

        Alert.alert(
            'Open Device Dialer',
            `Delegating call to ${primaryContactName || 'Primary Contact'}. Your device phone app will open.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Open Dialer',
                    style: 'default',
                    onPress: () => {
                        Linking.openURL(primaryDialUri).catch(() => {
                            Alert.alert('Dialer Error', 'Could not open the device phone dialer.');
                        });
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header & Level 1 / 2 Security Switch */}
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AlertOctagon size={18} color="#EF4444" />
                    <Text style={styles.cardTitle}>EMERGENCY PROTOCOL</Text>
                </View>

                <TouchableOpacity
                    style={[styles.securityToggleBtn, isLevel2Unlocked && styles.securityToggleActive]}
                    onPress={onToggleLevel2}
                >
                    {isLevel2Unlocked ? (
                        <>
                            <Unlock size={12} color="#10B981" />
                            <Text style={[styles.securityToggleText, { color: '#10B981' }]}>Hide details</Text>
                        </>
                    ) : (
                        <>
                            <Lock size={12} color="#A1A1AA" />
                            <Text style={styles.securityToggleText}>Show details</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Quick Action Dial Bar */}
            {primaryContactName && (
                <View style={styles.dialBar}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.dialLabel}>PRIMARY RESPONDER</Text>
                        <Text style={styles.dialName}>{primaryContactName}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.dialBtn, !hasPrimaryDialablePhone && styles.dialBtnDisabled]}
                        onPress={handleCallPrimary}
                        disabled={!hasPrimaryDialablePhone}
                    >
                        <PhoneCall size={14} color="#FFFFFF" />
                        <Text style={styles.dialBtnText}>Call via Dialer</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Step-by-Step Crisis Checklist */}
            <View style={styles.checklistWrap}>
                {checklist.map(item => (
                    <View key={item.step} style={styles.checkItem}>
                        <View style={[styles.stepCircle, item.isCritical && styles.criticalStepCircle]}>
                            <Text style={styles.stepNum}>{item.step}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.stepTitle}>{item.title}</Text>
                            <Text style={styles.stepInstruction}>{item.instruction}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Level 2 Protected Details Disclosure (When Unlocked) */}
            {isLevel2Unlocked && protectedDetails && (
                <View style={styles.level2Container}>
                    <View style={styles.level2Header}>
                        <Shield size={14} color="#10B981" />
                        <Text style={styles.level2Title}>LEVEL 2: PROTECTED DIRECTIVE DETAILS</Text>
                    </View>

                    {/* Contacts with Raw Numbers */}
                    {protectedDetails.contacts?.length > 0 && (
                        <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>Authoritative Contact Records</Text>
                            {protectedDetails.contacts.map(c => (
                                <View key={c.id} style={styles.detailRow}>
                                    <UserCheck size={14} color="#38BDF8" />
                                    <Text style={styles.detailName}>{c.name} ({c.role}):</Text>
                                    <Text style={styles.detailValue}>{c.phone || 'No phone'}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Vital Documents & Locations */}
                    {protectedDetails.vitalDocuments?.length > 0 && (
                        <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>Document Storage References</Text>
                            {protectedDetails.vitalDocuments.map(d => (
                                <View key={d.id} style={styles.detailRow}>
                                    <FileText size={14} color="#F59E0B" />
                                    <Text style={styles.detailName}>{d.title}:</Text>
                                    <Text style={styles.detailValue}>{d.location || 'Document Vault'}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Financial Payers */}
                    {protectedDetails.financialPayers?.length > 0 && (
                        <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>Financial Payer Designations</Text>
                            {protectedDetails.financialPayers.map((p, idx) => (
                                <View key={idx} style={styles.detailRow}>
                                    <CreditCard size={14} color="#818CF8" />
                                    <Text style={styles.detailName}>Obligation:</Text>
                                    <Text style={styles.detailValue}>Lead: {p.leadPayerName} • Backup: {p.backupPayerName}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Mandatory Disclaimer Boundary */}
            <View style={styles.disclaimerBox}>
                <Text style={styles.disclaimerText}>{disclaimer}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#121215',
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    securityToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    securityToggleActive: {
        backgroundColor: '#064E3B20',
        borderColor: '#059669'
    },
    securityToggleText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#A1A1AA'
    },
    dialBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#18181B',
        borderRadius: 14,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    dialLabel: {
        color: '#A1A1AA',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    dialName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        marginTop: 2
    },
    dialBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#059669',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10
    },
    dialBtnDisabled: {
        backgroundColor: '#27272A'
    },
    dialBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    checklistWrap: {
        gap: 12
    },
    checkItem: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#18181B',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    stepCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1
    },
    criticalStepCircle: {
        backgroundColor: '#E11D48'
    },
    stepNum: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    stepTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 3
    },
    stepInstruction: {
        color: '#A1A1AA',
        fontSize: 12,
        lineHeight: 16
    },
    level2Container: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#061D15',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#059669',
        gap: 12
    },
    level2Header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#064E3B',
        paddingBottom: 8
    },
    level2Title: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    detailSection: {
        gap: 4
    },
    detailSectionTitle: {
        color: '#D4D4D8',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 2
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 2
    },
    detailName: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '600'
    },
    detailValue: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        flex: 1
    },
    disclaimerBox: {
        marginTop: 14,
        padding: 10,
        backgroundColor: '#18181B',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    disclaimerText: {
        color: '#71717A',
        fontSize: 10,
        lineHeight: 14,
        textAlign: 'justify'
    }
});
