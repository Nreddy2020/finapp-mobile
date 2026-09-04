/**
 * androidSmsReceiverBridge.js
 * 
 * NATIVE ANDROID SMS BROADCAST RECEIVER BRIDGE & SPECIFICATION
 * 
 * Defines the Android Java/Kotlin BroadcastReceiver specification and
 * provides the JavaScript bridge interface for receiving live Android SMS_RECEIVED events.
 * 
 * Android Native Requirements:
 * ----------------------------
 * 1. AndroidManifest.xml permissions:
 *    <uses-permission android:name="android.permission.RECEIVE_SMS" />
 *    <uses-permission android:name="android.permission.READ_SMS" />
 * 
 * 2. BroadcastReceiver registration in AndroidManifest.xml:
 *    <receiver android:name=".sms.FinlifeSmsBroadcastReceiver" android:exported="true"
 *              android:permission="android.permission.BROADCAST_SMS">
 *        <intent-filter android:priority="999">
 *            <action android:name="android.provider.Telephony.SMS_RECEIVED" />
 *        </intent-filter>
 *    </receiver>
 * 
 * 3. Native Java Receiver Implementation:
 *    When an SMS is received, FinlifeSmsBroadcastReceiver extracts:
 *    - pdus (byte arrays) -> SmsMessage.createFromPdu()
 *    - originatingAddress (sender)
 *    - messageBody (body)
 *    - timestampMillis (timestamp)
 *    And emits DeviceEventEmitter event: 'FinlifeSmsReceived' with payload { sender, body, timestamp }.
 */

import { DeviceEventEmitter, Platform } from 'react-native';
import { smsIngestionService } from './smsIngestionService.js';

export const EVENT_NAME_FINLIFE_SMS = 'FinlifeSmsReceived';

/**
 * Initializes and connects the live native SMS listener to the SMS Ingestion Service.
 */
export function startLiveSMSReceiver() {
    if (Platform.OS !== 'android') {
        return () => {};
    }

    // Connect to native DeviceEventEmitter
    let subscription = null;
    try {
        subscription = DeviceEventEmitter.addListener(EVENT_NAME_FINLIFE_SMS, (event) => {
            if (event && event.body) {
                smsIngestionService.processIncomingRawMessage({
                    body: event.body,
                    sender: event.sender || event.originatingAddress || 'BANK',
                    timestamp: event.timestamp || new Date().toISOString()
                });
            }
        });
        smsIngestionService.isListening = true;
    } catch (err) {
        console.warn('[androidSmsReceiverBridge] Failed to attach native SMS listener:', err);
    }

    return () => {
        if (subscription && typeof subscription.remove === 'function') {
            subscription.remove();
        }
        smsIngestionService.isListening = false;
    };
}

export default {
    EVENT_NAME_FINLIFE_SMS,
    startLiveSMSReceiver
};
