package com.nirwas20.wealthwise.sms

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * FinlifeSmsModule
 * 
 * Exposes native Android SharedPreferences offline SMS queue methods
 * to JavaScript for Two-Phase Acknowledgment (2-Phase ACK).
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
}
