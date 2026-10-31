/**
 * components/ui/ModuleUI.js
 *
 * Shared, accessible building blocks for the Goals & Life Planning, Business Hub and
 * Decision Intelligence modules. Every control is at least 44dp tall, labelled for
 * screen readers and works without colour alone. Currency formatting always comes
 * from the global finance context so the same screens serve every locale.
 */
import React, { useRef, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
    KeyboardAvoidingView, Platform, Modal, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import { useGlobalFinance } from '../context/GlobalFinanceContext';

export const palette = {
    bg: '#09090F', card: '#171721', border: '#2B2B3C', text: '#FAFAFF', body: '#EEEEF6', muted: '#A8A8BD',
    input: '#101019', inputBorder: '#45455C', primary: '#6D28D9', secondary: '#292938',
    success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6'
};

export const ui = StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#292934' },
    back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#222230', borderRadius: 12 },
    title: { fontSize: 21, fontWeight: '700', color: palette.text },
    subtitle: { fontSize: 13, color: palette.muted, marginTop: 2 },
    content: { padding: 16, paddingBottom: 48, gap: 12 },
    card: { backgroundColor: palette.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: palette.border, gap: 10 },
    heading: { color: palette.text, fontSize: 17, fontWeight: '700' },
    text: { color: palette.body, fontSize: 15, lineHeight: 22 },
    muted: { color: palette.muted, fontSize: 13, lineHeight: 19 },
    label: { color: '#C4C4D5', fontSize: 13, marginBottom: 6, fontWeight: '600' },
    input: { backgroundColor: palette.input, borderWidth: 1, borderColor: palette.inputBorder, borderRadius: 12, padding: 12, color: '#FFFFFF', fontSize: 16, minHeight: 48 },
    button: { minHeight: 46, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: palette.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    secondary: { backgroundColor: palette.secondary },
    danger: { backgroundColor: '#281921', borderColor: '#71313F' },
    buttonText: { color: palette.text, fontSize: 14, fontWeight: '600', textAlign: 'center' },
    row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    flex: { flex: 1, minWidth: 0 },
    error: { backgroundColor: '#3F2028', padding: 14, borderRadius: 12, gap: 10 },
    errorText: { color: '#FECDD3', fontSize: 14, lineHeight: 21 },
    warningText: { color: '#FCD34D', fontSize: 14, lineHeight: 21 },
    chip: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1F1F2B', borderWidth: 1, borderColor: '#3A3A4C', justifyContent: 'center' },
    chipActive: { backgroundColor: '#3B2A6B', borderColor: '#C4B5FD' },
    chipText: { color: '#D4D4DF', fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#FFFFFF' },
    tabBar: { flexGrow: 0, flexShrink: 0, borderBottomWidth: 1, borderBottomColor: '#292934', backgroundColor: palette.bg },
    tab: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#C4B5FD' },
    tabText: { color: palette.muted, fontSize: 13, fontWeight: '700' },
    tabTextActive: { color: palette.text },
    listItem: { borderTopWidth: 1, borderTopColor: '#343441', paddingTop: 12, gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
    badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    stat: { flex: 1, minWidth: 120, backgroundColor: '#1F1F2B', borderRadius: 12, padding: 12, gap: 4 },
    statLabel: { color: palette.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    statValue: { color: palette.text, fontSize: 18, fontWeight: '800' },
    progressTrack: { height: 8, backgroundColor: '#2B2B3C', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#12121A', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', borderWidth: 1, borderColor: palette.border },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#292934' }
});

/** Currency formatting that never throws when the context is unavailable (tests, isolated renders). */
export function useMoney() {
    const ctx = useGlobalFinance();
    const symbol = ctx?.currency?.symbol || '₹';
    const format = (value, fractions = 0) => {
        const amount = Number(value);
        if (!Number.isFinite(amount)) return `${symbol}0`;
        if (ctx?.formatAmount) { try { return ctx.formatAmount(amount, fractions); } catch { /* fall through */ } }
        return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: fractions })}`;
    };
    return { format, symbol, code: ctx?.currencyCode || 'INR' };
}

export function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function shiftDate(date, days) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

export function useAsyncAction() {
    const pending = useRef(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function run(fn) {
        if (pending.current) return false;
        pending.current = true; setBusy(true); setError('');
        try { await fn(); return true; }
        catch (e) { setError(e?.message || 'Could not complete. Please retry.'); return false; }
        finally { pending.current = false; setBusy(false); }
    }
    return { busy, error, setError, run };
}

export function Btn({ title, onPress, secondary = false, danger = false, disabled = false, selected = false, accessibilityLabel, style }) {
    return (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={accessibilityLabel || title} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress}
            style={[ui.button, secondary && ui.secondary, danger && ui.danger, selected && { borderColor: '#C4B5FD' }, disabled && { opacity: 0.45 }, style]}>
            <Text style={ui.buttonText}>{title}</Text>
        </TouchableOpacity>
    );
}

export function Field({ label, hint, numeric = false, multiline = false, ...props }) {
    return (
        <View>
            {!!label && <Text style={ui.label}>{label}</Text>}
            <TextInput accessibilityLabel={label} placeholderTextColor="#87879C" style={[ui.input, multiline && { minHeight: 88, textAlignVertical: 'top' }]}
                keyboardType={numeric ? (Platform.OS === 'ios' ? 'decimal-pad' : 'numeric') : 'default'} multiline={multiline} autoCapitalize={numeric ? 'none' : 'sentences'} {...props} />
            {!!hint && <Text style={[ui.muted, { marginTop: 4 }]}>{hint}</Text>}
        </View>
    );
}

export function MoneyField({ label, value, onChangeText, hint, ...props }) {
    const { symbol } = useMoney();
    return <Field label={label ? `${label} (${symbol})` : `Amount (${symbol})`} numeric value={value} onChangeText={onChangeText} hint={hint} placeholder="0" {...props} />;
}

export function DateField({ label = 'Date', value, onChangeText, quick = true }) {
    return (
        <View>
            <Field label={`${label} (YYYY-MM-DD)`} value={value} onChangeText={onChangeText} placeholder="2026-01-31" autoCapitalize="none" />
            {quick && (
                <View style={[ui.wrap, { marginTop: 8 }]}>
                    {[['Today', 0], ['+7 days', 7], ['+30 days', 30], ['+1 year', 365]].map(([name, days]) => (
                        <Chip key={name} label={name} onPress={() => onChangeText(shiftDate(todayLocal(), days))} />
                    ))}
                    {!!value && <Chip label="Clear" onPress={() => onChangeText('')} />}
                </View>
            )}
        </View>
    );
}

export function Chip({ label, active = false, onPress, accessibilityLabel }) {
    return (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityState={{ selected: active }} onPress={onPress} style={[ui.chip, active && ui.chipActive]}>
            <Text style={[ui.chipText, active && ui.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

export function Choice({ label, options, value, onChange }) {
    return (
        <View>
            {!!label && <Text style={ui.label}>{label}</Text>}
            <View style={ui.wrap}>
                {options.map(option => {
                    const key = typeof option === 'string' ? option : option.value;
                    const text = typeof option === 'string' ? option : option.label;
                    return <Chip key={String(key)} label={text} active={value === key} onPress={() => onChange(key)} />;
                })}
            </View>
        </View>
    );
}

export function Tabs({ tabs, value, onChange }) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ui.tabBar} contentContainerStyle={{ paddingHorizontal: 8, flexDirection: 'row' }}>
            {tabs.map(tab => {
                const key = typeof tab === 'string' ? tab : tab.value;
                const text = typeof tab === 'string' ? tab : tab.label;
                const active = value === key;
                return (
                    <TouchableOpacity key={String(key)} accessibilityRole="tab" accessibilityLabel={`${text} tab`} accessibilityState={{ selected: active }} onPress={() => onChange(key)} style={[ui.tab, active && ui.tabActive]}>
                        <Text style={[ui.tabText, active && ui.tabTextActive]}>{text}</Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

export function Card({ children, style, title, subtitle }) {
    return (
        <View style={[ui.card, style]}>
            {!!title && <Text accessibilityRole="header" style={ui.heading}>{title}</Text>}
            {!!subtitle && <Text style={ui.muted}>{subtitle}</Text>}
            {children}
        </View>
    );
}

export function Notice({ children, retry, warning = false }) {
    if (!children) return null;
    return (
        <View accessibilityRole="alert" style={[ui.error, warning && { backgroundColor: '#3A2E12' }]}>
            <Text style={warning ? ui.warningText : ui.errorText}>{children}</Text>
            {retry && <Btn title="Retry" secondary onPress={retry} />}
        </View>
    );
}

export function Empty({ title, body, action, onAction }) {
    return (
        <View style={[ui.card, { alignItems: 'center', borderStyle: 'dashed' }]}>
            <Text style={ui.heading}>{title}</Text>
            {!!body && <Text style={[ui.muted, { textAlign: 'center' }]}>{body}</Text>}
            {!!action && <Btn title={action} onPress={onAction} />}
        </View>
    );
}

export function Badge({ text, color = palette.info }) {
    return (
        <View style={[ui.badge, { backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}66` }]}>
            <Text style={[ui.badgeText, { color }]}>{text}</Text>
        </View>
    );
}

export function Stat({ label, value, color }) {
    return (
        <View style={ui.stat} accessible accessibilityLabel={`${label}: ${value}`}>
            <Text style={ui.statLabel}>{label}</Text>
            <Text style={[ui.statValue, color && { color }]}>{value}</Text>
        </View>
    );
}

export function Progress({ value = 0, color = palette.primary, label }) {
    const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    return (
        <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }} accessibilityLabel={label || `${pct} percent`} style={{ gap: 4 }}>
            <View style={ui.progressTrack}><View style={[ui.progressFill, { width: `${pct}%`, backgroundColor: color }]} /></View>
            <Text style={ui.muted}>{pct}%{label ? ` · ${label}` : ''}</Text>
        </View>
    );
}

export function ListItem({ children, style }) { return <View style={[ui.listItem, style]}>{children}</View>; }

export function KeyValue({ label, value, color }) {
    return (
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={[ui.muted, { flex: 1 }]}>{label}</Text>
            <Text style={[ui.text, { fontWeight: '700' }, color && { color }]}>{value}</Text>
        </View>
    );
}

export function Sheet({ visible, title, onClose, children }) {
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={ui.sheetOverlay}>
                <TouchableOpacity accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
                <View style={[ui.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <View style={ui.sheetHeader}>
                        <Text accessibilityRole="header" style={ui.heading}>{title}</Text>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                            <X size={22} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12 }}>{children}</ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </View>
        </Modal>
    );
}

export function confirm(title, message, onConfirm, confirmText = 'Confirm') {
    if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
        return;
    }
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: confirmText, style: 'destructive', onPress: onConfirm }]);
}

/**
 * Screen shell with back button, optional tabs, keyboard-safe scrolling, loading and error/retry states.
 */
export function Screen({ title, subtitle, right, tabs, tab, onTab, loading = false, error, retry, children, scrollRef, onBack }) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const back = onBack || (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')));
    return (
        <SafeAreaView style={ui.root} edges={['top', 'left', 'right']}>
            <View style={ui.header}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={back} style={ui.back}><ArrowLeft color="#F4F4F5" size={22} /></TouchableOpacity>
                <View style={ui.flex}>
                    <Text accessibilityRole="header" style={ui.title} numberOfLines={1}>{title}</Text>
                    {!!subtitle && <Text style={ui.subtitle} numberOfLines={2}>{subtitle}</Text>}
                </View>
                {right}
            </View>
            {!!tabs && <Tabs tabs={tabs} value={tab} onChange={onTab} />}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[ui.content, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}>
                    {loading && <ActivityIndicator accessibilityLabel="Loading" color="#A78BFA" />}
                    <Notice retry={retry}>{error}</Notice>
                    {children}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
