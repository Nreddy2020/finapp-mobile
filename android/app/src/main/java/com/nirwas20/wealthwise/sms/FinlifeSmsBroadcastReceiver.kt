package com.nirwas20.wealthwise.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * FinlifeSmsBroadcastReceiver
 * 
 * NATIVE ANDROID BROADCAST RECEIVER FOR INCOMING SMS
 * 
 * Invariants:
 * - Listens to android.provider.Telephony.SMS_RECEIVED with high priority.
 * - Extracts sender address, message text, and timestamp.
 * - Emits 'FinlifeSmsReceived' event to React Native JavaScript runtime.
 */
class FinlifeSmsBroadcastReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "FinlifeSmsReceiver"
        const val EVENT_NAME = "FinlifeSmsReceived"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        try {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            if (messages.isNullOrEmpty()) {
                return
            }

            // Group multi-part SMS messages by originating address
            val sender = messages[0].originatingAddress ?: "UNKNOWN"
            val timestamp = messages[0].timestampMillis
            val bodyBuilder = StringBuilder()

            for (sms in messages) {
                bodyBuilder.append(sms.messageBody ?: "")
            }
            val completeBody = bodyBuilder.toString()

            Log.d(TAG, "Received incoming SMS from: $sender")

            // Send event to React Native JavaScript context
            sendEventToReactNative(context, sender, completeBody, timestamp)

        } catch (e: Exception) {
            Log.e(TAG, "Error processing incoming native SMS: ${e.message}", e)
        }
    }

    private fun sendEventToReactNative(context: Context?, sender: String, body: String, timestamp: Long) {
        if (context == null) return

        try {
            val app = context.applicationContext as? ReactApplication ?: return
            val reactNativeHost = app.reactNativeHost
            val reactInstanceManager = reactNativeHost.reactInstanceManager
            val reactContext = reactInstanceManager.currentReactContext

            if (reactContext != null && reactContext.hasActiveReactInstance()) {
                val params = Arguments.createMap().apply {
                    putString("sender", sender)
                    putString("body", body)
                    putDouble("timestamp", timestamp.toDouble())
                }

                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_NAME, params)

                Log.d(TAG, "Successfully emitted $EVENT_NAME to React Native runtime")
            } else {
                Log.w(TAG, "ReactContext is not currently active, message queued")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit SMS event to React Native: ${e.message}", e)
        }
    }
}
