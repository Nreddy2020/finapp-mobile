import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FamilyHeader from './FamilyHeader.js';
export const ui = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#09090F'
    },
    content: {
        padding: 16,
        paddingBottom: 48,
        gap: 14
    },
    card: {
        backgroundColor: '#171721',
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2B2B3C',
        gap: 10
    },
    title: {
        color: '#FAFAFF',
        fontSize: 22,
        fontWeight: '700'
    },
    heading: {
        color: '#FAFAFF',
        fontSize: 17,
        fontWeight: '700'
    },
    text: {
        color: '#EEEEF6',
        fontSize: 15,
        lineHeight: 22
    },
    muted: {
        color: '#A8A8BD',
        fontSize: 14,
        lineHeight: 21
    },
    input: {
        backgroundColor: '#101019',
        borderWidth: 1,
        borderColor: '#45455C',
        borderRadius: 12,
        padding: 12,
        color: '#FFFFFF',
        fontSize: 16,
        minHeight: 48
    },
    button: {
        minHeight: 46,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#BD1E63',
        borderRadius: 12,
        justifyContent: 'center'
    },
    secondary: {
        backgroundColor: '#292938'
    },
    label: {
        color: '#C4C4D5',
        fontSize: 13,
        marginBottom: 7
    },
    error: {
        backgroundColor: '#401F29',
        padding: 14,
        borderRadius: 12
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    }
});
export function Action({
    title,
    onPress,
    disabled = false,
    secondary = false,
    danger = false
}) {
    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={title}
            disabled={disabled}
            onPress={onPress}
            style={[
                ui.button,
                secondary && ui.secondary,
                danger && { backgroundColor: '#281921', borderWidth: 1, borderColor: '#71313F' },
                disabled && {
                    opacity: 0.45
                }
            ]}
        >
            <Text
                style={[
                    ui.text,
                    {
                        fontWeight: '600',
                        textAlign: 'center'
                    }
                ]}
            >
                {title}
            </Text>
        </TouchableOpacity>
    );
}
export function Field({ label, ...props }) {
    return (
        <View>
            <Text style={ui.label}>{label}</Text>
            <TextInput
                accessibilityLabel={label}
                placeholderTextColor="#87879C"
                style={ui.input}
                maxLength={200}
                {...props}
            />
        </View>
    );
}
export function Notice({ children }) {
    return children ? (
        <View accessibilityRole="alert" style={ui.error}>
            <Text style={ui.text}>{children}</Text>
        </View>
    ) : null;
}
export function useAction() {
    const pending = useRef(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function run(fn) {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError('');
        try {
            await fn();
        } catch (e) {
            setError(e.message || 'Could not save. Please retry.');
        } finally {
            pending.current = false;
            setBusy(false);
        }
    }
    return {
        busy,
        error,
        setError,
        run
    };
}
export function Page({
    title,
    subtitle,
    household,
    children,
    topTabs = false,
    loading = false,
    error,
    retry
}) {
    const insets = useSafeAreaInsets();
    return (
        <SafeAreaView style={ui.root} edges={[]}>
            <FamilyHeader
                title={title}
                subtitle={subtitle}
                household={household}
                showTopTabs={topTabs}
                showBack={!topTabs}
            />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                contentContainerStyle={[ui.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                {loading && <View style={{ height: 24, justifyContent: 'center' }}><ActivityIndicator color="#F05298" /></View>}
                <Notice>{error}</Notice>
                {error && retry && <Action title="Retry" onPress={retry} />}
                {children}
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
