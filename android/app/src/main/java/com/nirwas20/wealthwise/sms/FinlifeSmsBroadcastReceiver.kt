package com.nirwas20.wealthwise.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.provider.Telephony
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * FinlifeSmsBroadcastReceiver
 * 
 * NATIVE ANDROID BROADCAST RECEIVER FOR INCOMING SMS
 * 
 * Invariants:
 * - Listens to android.provider.Telephony.SMS_RECEIVED with high priority.
 * - Extracts sender address, message text, and timestamp.
 * - Emits 'FinlifeSmsReceived' event to React Native JavaScript runtime when active.
 * - If JS runtime is inactive (app killed/backgrounded), queues message in SharedPreferences disk store.
 * - Offline queue is encrypted at rest using AndroidKeyStore AES-256-GCM (FinlifeCryptoEngine).
 * - Guarantees synchronous disk write (commit) and thread safety across concurrent broadcasts.
 */
class FinlifeSmsBroadcastReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "FinlifeSmsReceiver"
        const val EVENT_NAME = "FinlifeSmsReceived"
        const val PREFS_NAME = "finlife_sms_native_prefs"
        const val KEY_OFFLINE_QUEUE = "pending_offline_sms_queue"
        private val PREFS_LOCK = Any()

        /**
         * Reads offline pending SMS queue from SharedPreferences, decrypting payload bodies before passing to JS.
         */
        @JvmStatic
        fun getPendingOfflineQueue(context: Context): String {
            synchronized(PREFS_LOCK) {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val rawJson = prefs.getString(KEY_OFFLINE_QUEUE, "[]") ?: "[]"
                try {
                    val array = JSONArray(rawJson)
                    val decryptedArray = JSONArray()
                    for (i in 0 until array.length()) {
                        val item = array.getJSONObject(i)
                        val rawBody = item.optString("body")
                        val decryptedBody = FinlifeCryptoEngine.decrypt(rawBody)
                        val newItem = JSONObject(item.toString()).apply {
                            put("body", decryptedBody)
                        }
                        decryptedArray.put(newItem)
                    }
                    return decryptedArray.toString()
                } catch (e: Exception) {
                    Log.w(TAG, "Error decrypting offline queue, returning raw: ${e.message}")
                    return rawJson
                }
            }
        }

        /**
         * Two-Phase Acknowledgment: Removes an offline queue item only after JavaScript durable persistence succeeds.
         */
        @JvmStatic
        fun acknowledgeOfflineMessage(context: Context, messageId: String): Boolean {
            synchronized(PREFS_LOCK) {
                try {
                    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    val existingJson = prefs.getString(KEY_OFFLINE_QUEUE, "[]") ?: "[]"
                    val array = JSONArray(existingJson)
                    val newArray = JSONArray()

                    for (i in 0 until array.length()) {
                        val item = array.getJSONObject(i)
                        if (item.optString("offlineMessageId") != messageId) {
                            newArray.put(item)
                        }
                    }
                    val committed = prefs.edit().putString(KEY_OFFLINE_QUEUE, newArray.toString()).commit()
                    Log.d(TAG, "Acknowledged offline SMS [$messageId]. Committed: $committed. Remaining queue: ${newArray.length()}")
                    return committed
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to acknowledge offline SMS [$messageId]: ${e.message}", e)
                    return false
                }
            }
        }
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

            // Send event to React Native JavaScript context or persist to native offline queue
            sendEventOrQueue(context, sender, completeBody, timestamp)

        } catch (e: Exception) {
            Log.e(TAG, "Error processing incoming native SMS: ${e.message}", e)
        }
    }

    private fun sendEventOrQueue(context: Context?, sender: String, body: String, timestamp: Long) {
        if (context == null) return

        try {
            val app = context.applicationContext as? ReactApplication
            val reactNativeHost = app?.reactNativeHost
            val reactInstanceManager = reactNativeHost?.reactInstanceManager
            val reactContext = reactInstanceManager?.currentReactContext

            if (reactContext != null && reactContext.hasActiveReactInstance()) {
                val params = Arguments.createMap().apply {
                    putString("sender", sender)
                    putString("body", body)
                    putDouble("timestamp", timestamp.toDouble())
                }

                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_NAME, params)

                Log.d(TAG, "Successfully emitted $EVENT_NAME to active React Native runtime")
            } else {
                Log.w(TAG, "ReactContext inactive. Queuing encrypted SMS to native disk SharedPreferences.")
                queueOfflineMessage(context, sender, body, timestamp)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to deliver SMS to React Native, falling back to disk queue: ${e.message}", e)
            queueOfflineMessage(context, sender, body, timestamp)
        }
    }

    private fun queueOfflineMessage(context: Context, sender: String, body: String, timestamp: Long) {
        synchronized(PREFS_LOCK) {
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val existingJson = prefs.getString(KEY_OFFLINE_QUEUE, "[]") ?: "[]"
                val array = JSONArray(existingJson)

                val offlineMsgId = "off_msg_${UUID.randomUUID()}"
                // Encrypt payload body at rest with AndroidKeyStore AES-256-GCM
                val encryptedBody = FinlifeCryptoEngine.encrypt(body)

                val msgObj = JSONObject().apply {
                    put("offlineMessageId", offlineMsgId)
                    put("sender", sender)
                    put("body", encryptedBody)
                    put("timestamp", timestamp)
                    put("queuedAt", System.currentTimeMillis())
                }
                array.put(msgObj)

                val committed = prefs.edit().putString(KEY_OFFLINE_QUEUE, array.toString()).commit()
                Log.d(TAG, "Persisted encrypted offline SMS [$offlineMsgId] to disk (committed: $committed). Queue size: ${array.length()}")
            } catch (err: Exception) {
                Log.e(TAG, "Failed to persist encrypted offline SMS to disk queue: ${err.message}", err)
            }
        }
    }
}
