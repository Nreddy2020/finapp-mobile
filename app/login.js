import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../components/context/AuthContext';
import { DEMO_MODE_ENABLED } from '../services/runtimeConfig';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import { Lock, Smartphone, ShieldCheck, Fingerprint } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
    const router = useRouter();
    const { login, register } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showConsent, setShowConsent] = useState(false);

    const handleAuth = async () => {
        const normalizedEmail = email.trim();
        if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
            Alert.alert('Invalid email', 'Enter a valid email address.');
            return;
        }

        if (!password || (isRegistering && password.length < 8)) {
            Alert.alert('Invalid password', isRegistering
                ? 'Use at least 8 characters.'
                : 'Enter your password.');
            return;
        }

        if (isRegistering && fullName.trim().length < 2) {
            Alert.alert('Invalid name', 'Enter your full name.');
            return;
        }

        setLoading(true);
        try {
            let result;
            if (isRegistering) {
                result = await register(normalizedEmail, password, fullName.trim());
            } else {
                result = await login(normalizedEmail, password);
            }

            if (result.success) {
                // Navigate to main tabs
                router.replace('/(tabs)');
            }
        } catch (error) {
            Alert.alert(isRegistering ? 'Registration Failed' : 'Login Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConsent = async () => {
        // Here we would save the consent to SecureStore
        // await SecureStore.setItemAsync('user_consent', 'true');
        setShowConsent(false);
        router.replace('/(tabs)');
    };

    return (
        <AnimatedScreen style={styles.container}>
            <LinearGradient
                colors={['#09090B', '#111827', '#000000']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <ShieldCheck size={32} color="#4F46E5" />
                    </View>
                    <Text style={styles.title}>Secure Login</Text>
                    <Text style={styles.subtitle}>Bank-grade security enabled</Text>
                </View>

                <View style={styles.form}>
                    {isRegistering && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="John Doe"
                                placeholderTextColor="#52525B"
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="name@example.com"
                            placeholderTextColor="#52525B"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter password"
                            placeholderTextColor="#52525B"
                            secureTextEntry
                        />
                    </View>

                    <Pressable
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Login')}
                        </Text>
                    </Pressable>

                    <Pressable onPress={() => setIsRegistering(!isRegistering)} style={{ alignItems: 'center', marginTop: 16 }}>
                        <Text style={{ color: '#A1A1AA' }}>
                            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
                            <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>
                                {isRegistering ? 'Login' : 'Sign Up'}
                            </Text>
                        </Text>
                    </Pressable>
                    {DEMO_MODE_ENABLED && !isRegistering && (
                        <Text style={styles.demoHint}>
                            Local demo: admin@example.com / dev_password_123
                        </Text>
                    )}
                </View>
            </View>

            {/* Consent Modal */}
            <Modal
                visible={showConsent}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Lock size={48} color="#4F46E5" style={{ marginBottom: 16 }} />
                        <Text style={styles.modalTitle}>Security & Privacy</Text>
                        <Text style={styles.modalText}>
                            Your financial data is now protected with AES-256-GCM encryption.
                        </Text>
                        <Text style={styles.modalText}>
                            We use strict device binding to ensure your account can only be accessed from this device.
                        </Text>

                        <View style={styles.consentItem}>
                            <Fingerprint size={20} color="#10B981" />
                            <Text style={styles.consentLabel}>Device Fingerprinting Active</Text>
                        </View>

                        <View style={styles.consentItem}>
                            <ShieldCheck size={20} color="#10B981" />
                            <Text style={styles.consentLabel}>Local Storage Encrypted</Text>
                        </View>

                        <Pressable style={styles.consentButton} onPress={handleConsent}>
                            <Text style={styles.consentButtonText}>I Understand & Agree</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    content: { padding: 24, width: '100%' },
    header: { alignItems: 'center', marginBottom: 40 },
    iconContainer: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1, borderColor: 'rgba(79, 70, 229, 0.2)'
    },
    title: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#A1A1AA' },
    form: { gap: 16 },
    inputGroup: { gap: 8 },
    label: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
    input: {
        backgroundColor: '#18181B',
        borderWidth: 1, borderColor: '#27272A',
        borderRadius: 12,
        padding: 16,
        color: '#FFF',
        fontSize: 16
    },
    button: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    demoHint: { color: '#71717A', fontSize: 12, textAlign: 'center', marginTop: 8 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 24 },
    modalContent: {
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 16 },
    modalText: { color: '#A1A1AA', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
    consentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8, backgroundColor: '#27272A', padding: 12, borderRadius: 8, width: '100%' },
    consentLabel: { color: '#E4E4E7', fontWeight: '600' },
    consentButton: {
        backgroundColor: '#4F46E5',
        width: '100%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24
    },
    consentButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
