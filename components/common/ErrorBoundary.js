import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        // Attempt to navigate to safe harbor (home)
        try {
            router.replace('/(tabs)');
        } catch (e) {
            console.log("Navigation reset failed", e);
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <LinearGradient
                        colors={['#18181B', '#000000']}
                        style={StyleSheet.absoluteFill}
                    />

                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <AlertTriangle size={48} color="#EF4444" />
                        </View>

                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.subtitle}>
                            Our top financial engineers have been notified. Please try reloading the app.
                        </Text>

                        {this.state.error && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>
                                    {this.state.error.toString()}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                            <RefreshCw size={20} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Reload Application</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => router.replace('/(tabs)')}>
                            <Home size={20} color="#A1A1AA" />
                            <Text style={[styles.buttonText, { color: '#A1A1AA' }]}>Go to Dashboard</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#000000',
    },
    content: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EF444420',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#EF444440',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#A1A1AA',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    errorBox: {
        backgroundColor: '#27272A',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#3F3F46',
    },
    errorText: {
        color: '#EF4444',
        fontFamily: 'monospace',
        fontSize: 12,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EF4444',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        width: '100%',
        gap: 12,
        marginBottom: 12,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#3F3F46',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ErrorBoundary;
