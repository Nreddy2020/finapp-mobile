import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { CrashReportingService } from '../services/crashReporting';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log to Crash Reporting Service
        CrashReportingService.logError(error, {
            componentStack: errorInfo.componentStack,
            boundary: 'GlobalErrorBoundary'
        });
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <AlertTriangle size={64} color="#EF4444" />
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>
                        The app encountered an unexpected error. Don't worry, your data is safe.
                    </Text>
                    <Text style={styles.errorText}>
                        {this.state.error?.message || 'Unknown error'}
                    </Text>
                    <Pressable style={styles.button} onPress={this.handleReload}>
                        <Text style={styles.buttonText}>Reload App</Text>
                    </Pressable>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090B',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 24,
        marginBottom: 12
    },
    message: {
        fontSize: 16,
        color: '#A1A1AA',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24
    },
    errorText: {
        fontSize: 12,
        color: '#71717A',
        fontFamily: 'monospace',
        marginBottom: 32,
        textAlign: 'center'
    },
    button: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold'
    }
});
