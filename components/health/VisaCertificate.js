import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FileText } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function VisaCertificate() {
    return (
        <LuxuryCard style={styles.section}>
            <View style={styles.container}>
                <View style={styles.left}>
                    <View style={styles.iconContainer}>
                        <FileText size={20} color="#8B5CF6" />
                    </View>
                    <View>
                        <Text style={styles.title}>Visa Certificate</Text>
                        <Text style={styles.subtitle}>Proof of Funds letter (PDF)</Text>
                    </View>
                </View>
                <Pressable
                    style={styles.button}
                    onPress={() => alert('📄 Generating PDF...\n\nCertificate of Net Worth (₹12.5L) downloaded to Documents.\n\nReady for Visa Application.')}
                >
                    <Text style={styles.buttonText}>GENERATE</Text>
                </Pressable>
            </View>
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 24 },
    container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#8B5CF620', justifyContent: 'center', alignItems: 'center' },
    title: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 11 },
    button: { backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    buttonText: { color: '#FFF', fontSize: 12, fontWeight: '700' }
});
