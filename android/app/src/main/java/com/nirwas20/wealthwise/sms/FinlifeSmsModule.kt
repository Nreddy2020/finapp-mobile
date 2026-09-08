package com.nirwas20.wealthwise.sms

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.content.Context

/**
 * FinlifeSmsModule
 * 
 * Exposes native Android SharedPreferences offline SMS queue methods
 * and AndroidKeyStore AES-256-GCM cryptography to JavaScript for
 * Two-Phase Acknowledgment and hardware-backed data-at-rest encryption.
 */
class FinlifeSmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FinlifeSmsModule"

    @ReactMethod
    fun getPendingOfflineQueue(promise: Promise) {
        try {
            val queueJson = FinlifeSmsBroadcastReceiver.getPendingOfflineQueue(reactApplicationContext)
            promise.resolve(queueJson)
        } catch (e: Exception) {
            promise.reject("FAIL_CLOSED_DECRYPTION_ERROR", "Fail-closed: offline SMS queue decryption failed. Raw queue contents suppressed: ${e.message}", e)
        }
    }

    companion object {
        private const val MAX_PAYLOAD_BYTES = 65536 // 64 KB max payload size
        private const val MAX_MESSAGE_ID_LENGTH = 128
    }

    @ReactMethod
    fun acknowledgeOfflineMessage(messageId: String?, promise: Promise) {
        if (messageId.isNullOrBlank() || messageId.length > MAX_MESSAGE_ID_LENGTH) {
            promise.reject("INVALID_ARGUMENT", "messageId must be a non-empty string <= $MAX_MESSAGE_ID_LENGTH characters")
            return
        }
        try {
            val success = FinlifeSmsBroadcastReceiver.acknowledgeOfflineMessage(reactApplicationContext, messageId)
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("ACKNOWLEDGE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun encryptPayload(plainText: String?, promise: Promise) {
        if (plainText == null) {
            promise.reject("INVALID_ARGUMENT", "plainText cannot be null")
            return
        }
        if (plainText.length > MAX_PAYLOAD_BYTES) {
            promise.reject("PAYLOAD_SIZE_EXCEEDED", "Payload exceeds maximum allowed size of $MAX_PAYLOAD_BYTES characters")
            return
        }
        try {
            val cipherText = FinlifeCryptoEngine.encrypt(plainText)
            promise.resolve(cipherText)
        } catch (e: Exception) {
            promise.reject("ENCRYPT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun decryptPayload(cipherText: String?, promise: Promise) {
        if (cipherText == null) {
            promise.reject("INVALID_ARGUMENT", "cipherText cannot be null")
            return
        }
        if (cipherText.length > MAX_PAYLOAD_BYTES) {
            promise.reject("PAYLOAD_SIZE_EXCEEDED", "Payload exceeds maximum allowed size of $MAX_PAYLOAD_BYTES characters")
            return
        }
        try {
            val plainText = FinlifeCryptoEngine.decrypt(cipherText)
            promise.resolve(plainText)
        } catch (e: Exception) {
            promise.reject("DECRYPT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCryptoDiagnostics(promise: Promise) {
        try {
            val diag = FinlifeCryptoEngine.getDiagnostics()
            val map = Arguments.createMap()
            map.putString("securityLevel", diag["securityLevel"] as? String ?: "UNKNOWN")
            map.putBoolean("isStrongBox", diag["isStrongBox"] as? Boolean ?: false)
            map.putString("keyAlias", diag["keyAlias"] as? String ?: "")
            map.putString("transformation", diag["transformation"] as? String ?: "")
            val initErr = diag["initializationError"] as? String
            if (initErr != null) {
                map.putString("initializationError", initErr)
            } else {
                map.putNull("initializationError")
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("DIAGNOSTICS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCryptoFailureQueue(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(FinlifeSmsBroadcastReceiver.PREFS_NAME, Context.MODE_PRIVATE)
            val failureJson = prefs.getString(FinlifeSmsBroadcastReceiver.KEY_CRYPTO_FAILURE_QUEUE, "[]") ?: "[]"
            promise.resolve(failureJson)
        } catch (e: Exception) {
            promise.reject("CRYPTO_FAILURE_QUEUE_ERROR", e.message, e)
        }
    }
}
