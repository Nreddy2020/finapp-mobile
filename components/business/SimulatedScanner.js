import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { X, Zap, Loader2 } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function SimulatedScanner({ visible, onClose, onScan, demoProduct }) {
    const [scanning, setScanning] = useState(false);
    const [scanLine] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            setScanning(true);
            startScanAnimation();

            // Artificial delay to simulate finding a code
            const timer = setTimeout(() => {
                setScanning(false);
                if (demoProduct) {
                    onScan(demoProduct.barcode);
                } else {
                    // Fallback random scan if no specific target
                    onScan('8901234567890');
                }
            }, 2500);

            return () => {
                clearTimeout(timer);
                stopScanAnimation();
            };
        }
    }, [visible]);

    const startScanAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanLine, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(scanLine, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ])
        ).start();
    };

    const stopScanAnimation = () => {
        scanLine.setValue(0);
    };

    const translateY = scanLine.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 250] // Scan frame height
    });

    if (!visible) return null;

    return (
        <View style={styles.container}>
            <View style={styles.cameraView}>
                {/* Overlay UI */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Scan Barcode</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.scanFrameContainer}>
                    <View style={styles.scanFrame}>
                        <View style={[styles.corner, styles.tl]} />
                        <View style={[styles.corner, styles.tr]} />
                        <View style={[styles.corner, styles.bl]} />
                        <View style={[styles.corner, styles.br]} />

                        <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
                    </View>
                    <Text style={styles.instruction}>Align code within frame</Text>
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity style={styles.flashBtn}>
                        <Zap size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {scanning && (
                    <View style={styles.processingOverlay}>
                        <Loader2 size={32} color="#EC4899" style={{ marginBottom: 8 }} />
                        <Text style={styles.processingText}>Detecting product...</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: '#000',
        zIndex: 1000,
    },
    cameraView: {
        flex: 1,
        backgroundColor: '#18181B', // Placeholder for camera feed
        justifyContent: 'space-between'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#00000050',
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600'
    },
    scanFrameContainer: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 0,
        position: 'relative'
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#EC4899',
        borderWidth: 4
    },
    tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    scanLine: {
        width: '100%',
        height: 2,
        backgroundColor: '#EC4899',
        opacity: 0.8,
        shadowColor: "#EC4899",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    instruction: {
        color: '#A1A1AA',
        marginTop: 20,
        fontSize: 14
    },
    controls: {
        paddingBottom: 50,
        alignItems: 'center'
    },
    flashBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF20'
    },
    processingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#00000080',
        alignItems: 'center',
        justifyContent: 'center'
    },
    processingText: {
        color: '#FFF',
        marginTop: 10,
        fontWeight: '600'
    }
});
