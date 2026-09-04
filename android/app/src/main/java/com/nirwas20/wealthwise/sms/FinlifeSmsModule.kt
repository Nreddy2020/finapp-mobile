package com.nirwas20.wealthwise.sms

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

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
            promise.reject("OFFLINE_QUEUE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun acknowledgeOfflineMessage(messageId: String, promise: Promise) {
        try {
            val success = FinlifeSmsBroadcastReceiver.acknowledgeOfflineMessage(reactApplicationContext, messageId)
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("ACKNOWLEDGE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun encryptPayload(plainText: String, promise: Promise) {
        try {
            val cipherText = FinlifeCryptoEngine.encrypt(plainText)
            promise.resolve(cipherText)
        } catch (e: Exception) {
            promise.reject("ENCRYPT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun decryptPayload(cipherText: String, promise: Promise) {
        try {
            val plainText = FinlifeCryptoEngine.decrypt(cipherText)
            promise.resolve(plainText)
        } catch (e: Exception) {
            promise.reject("DECRYPT_ERROR", e.message, e)
        }
    }
}
