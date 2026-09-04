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
        const val KEY_CRYPTO_FAILURE_QUEUE = "finlife_crypto_failure_queue"
        private val PREFS_LOCK = Any()

        /**
         * Reads offline pending SMS queue from SharedPreferences, decrypting payload bodies before passing to JS.
         * Automatically migrates and re-encrypts legacy FL_ENC_V1 records to FL_AES_GCM_V1 at rest.
         *
         * FAIL-CLOSED SECURITY CONTRACT:
         * - If decryption fails, NEVER returns rawJson or raw queue contents to callers.
         * - Preserves the encrypted queue untouched in SharedPreferences for administrative recovery.
         * - Quarantines failure metadata in finlife_crypto_failure_queue without plaintext.
         * - Throws SecurityException to ensure callers reject with an explicit error.
         */
        @JvmStatic
        @Throws(SecurityException::class)
        fun getPendingOfflineQueue(context: Context): String {
            synchronized(PREFS_LOCK) {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val rawJson = prefs.getString(KEY_OFFLINE_QUEUE, "[]") ?: "[]"
                try {
                    val array = JSONArray(rawJson)
                    val decryptedArray = JSONArray()
                    val reencryptedArray = JSONArray()
                    var migratedCount = 0

                    for (i in 0 until array.length()) {
                        val item = array.getJSONObject(i)
                        val rawBody = item.optString("body")
                        val isLegacy = rawBody.startsWith("FL_ENC_V1:")
                        val decryptedBody = FinlifeCryptoEngine.decrypt(rawBody)

                        if (isLegacy) {
                            // Real migration: Re-encrypt legacy FL_ENC_V1 record with modern AES-256-GCM
                            val modernCipher = FinlifeCryptoEngine.encrypt(decryptedBody)
                            val migratedItem = JSONObject(item.toString()).apply {
                                put("body", modernCipher)
                                put("migratedAt", System.currentTimeMillis())
                            }
                            reencryptedArray.put(migratedItem)
                            migratedCount++
                        } else {
                            reencryptedArray.put(item)
                        }

                        val decryptedItem = JSONObject(item.toString()).apply {
                            put("body", decryptedBody)
                        }
                        decryptedArray.put(decryptedItem)
                    }

                    // Only commit re-encryption migration if all items succeeded
                    if (migratedCount > 0) {
                        val committed = prefs.edit().putString(KEY_OFFLINE_QUEUE, reencryptedArray.toString()).commit()
                        Log.i(TAG, "Migrated and re-encrypted $migratedCount legacy FL_ENC_V1 records to FL_AES_GCM_V1 at rest (committed: $committed)")
                    }

                    return decryptedArray.toString()
                } catch (e: Exception) {
                    // Record failure metadata into finlife_crypto_failure_queue WITHOUT plaintext or raw data
                    try {
                        val failureJson = prefs.getString(KEY_CRYPTO_FAILURE_QUEUE, "[]") ?: "[]"
                        val failureArray = JSONArray(failureJson)
                        val failObj = JSONObject().apply {
                            put("operation", "GET_PENDING_OFFLINE_QUEUE_DECRYPTION_FAILED")
                            put("failedAt", System.currentTimeMillis())
                            put("error", e.message ?: "DECRYPTION_ERROR")
                            put("status", "READ_PATH_DECRYPTION_FAILED_CLOSED")
                        }
                        failureArray.put(failObj)
                        prefs.edit().putString(KEY_CRYPTO_FAILURE_QUEUE, failureArray.toString()).commit()
                    } catch (ignore: Exception) {}

                    Log.e(TAG, "SecurityException: Decryption failed on offline queue. Failing closed: refusing to expose raw queue contents: ${e.message}", e)
                    // FAIL CLOSED: NEVER return rawJson. Throw SecurityException to reject caller.
                    throw SecurityException("Fail-closed: offline SMS queue decryption failed (${e.message}). Raw queue contents quarantined.", e)
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
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val offlineMsgId = "off_msg_${UUID.randomUUID()}"
            try {
                // Fail-Closed: Encrypt payload body at rest with AndroidKeyStore AES-256-GCM.
                // If Keystore is in FAILED state or throws, we do NOT write unencrypted plaintext.
                val encryptedBody = FinlifeCryptoEngine.encrypt(body)

                val existingJson = prefs.getString(KEY_OFFLINE_QUEUE, "[]") ?: "[]"
                val array = JSONArray(existingJson)

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
                // Fail-closed quarantine: isolate message metadata into finlife_crypto_failure_queue WITHOUT plaintext body
                try {
                    val failureJson = prefs.getString(KEY_CRYPTO_FAILURE_QUEUE, "[]") ?: "[]"
                    val failureArray = JSONArray(failureJson)
                    val failObj = JSONObject().apply {
                        put("offlineMessageId", offlineMsgId)
                        put("sender", sender)
                        put("timestamp", timestamp)
                        put("failedAt", System.currentTimeMillis())
                        put("error", err.message ?: "ENCRYPTION_FAILURE")
                        put("status", "QUARANTINED_CRYPTO_FAILED")
                        // Explicitly omit body to ensure ZERO unencrypted plaintext at rest
                    }
                    failureArray.put(failObj)
                    prefs.edit().putString(KEY_CRYPTO_FAILURE_QUEUE, failureArray.toString()).commit()
                    Log.e(TAG, "CRITICAL: Encryption failed, quarantined message metadata [$offlineMsgId] to $KEY_CRYPTO_FAILURE_QUEUE without plaintext: ${err.message}", err)
                } catch (qErr: Exception) {
                    Log.e(TAG, "Fatal: failed to write to crypto failure queue: ${qErr.message}", qErr)
                }
            }
        }
    }
}
