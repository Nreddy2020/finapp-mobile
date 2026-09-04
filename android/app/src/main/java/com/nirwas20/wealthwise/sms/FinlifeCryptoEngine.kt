package com.nirwas20.wealthwise.sms

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * FinlifeCryptoEngine
 * 
 * Hardware-backed AES-256-GCM Cryptographic Engine using AndroidKeyStore.
 * 
 * Invariants:
 * - 256-bit AES master key stored in AndroidKeyStore.
 * - Authenticated AES/GCM/NoPadding cipher with 128-bit authentication tag.
 * - Unique randomized 12-byte IV per encryption operation.
 * - Tamper detection and confidentiality for all raw SMS payloads at rest.
 */
object FinlifeCryptoEngine {
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "finlife_sms_master_key_v1"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH = 128
    private const val IV_LENGTH = 12
    const val CIPHER_PREFIX = "FL_AES_GCM_V1:"

    enum class CryptoSecurityLevel {
        STRONGBOX_HSM,
        KEYSTORE_TEE,
        UNINITIALIZED,
        FAILED
    }

    var securityLevel: CryptoSecurityLevel = CryptoSecurityLevel.UNINITIALIZED
        private set

    var initializationError: String? = null
        private set

    init {
        ensureMasterKey()
    }

    @Synchronized
    fun ensureMasterKey() {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)
            if (!keyStore.containsAlias(KEY_ALIAS)) {
                val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
                var keyGenerated = false

                // Attempt StrongBox hardware security module first on supported devices (API 28+)
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                    try {
                        val strongBoxSpec = KeyGenParameterSpec.Builder(
                            KEY_ALIAS,
                            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                        )
                            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                            .setKeySize(256)
                            .setRandomizedEncryptionRequired(true)
                            .setIsStrongBoxBacked(true)
                            .build()
                        keyGenerator.init(strongBoxSpec)
                        keyGenerator.generateKey()
                        keyGenerated = true
                        securityLevel = CryptoSecurityLevel.STRONGBOX_HSM
                        android.util.Log.i("FinlifeCryptoEngine", "Sealed 256-bit AES master key in StrongBox Hardware Security Module")
                    } catch (e: Exception) {
                        android.util.Log.w("FinlifeCryptoEngine", "StrongBox chip unavailable on this hardware, falling back to AndroidKeyStore TEE: ${e.message}")
                    }
                }

                if (!keyGenerated) {
                    val standardSpec = KeyGenParameterSpec.Builder(
                        KEY_ALIAS,
                        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                    )
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .setKeySize(256)
                        .setRandomizedEncryptionRequired(true)
                        .build()
                    keyGenerator.init(standardSpec)
                    keyGenerator.generateKey()
                    securityLevel = CryptoSecurityLevel.KEYSTORE_TEE
                    android.util.Log.i("FinlifeCryptoEngine", "Sealed 256-bit AES master key in AndroidKeyStore TEE")
                }
            } else {
                if (securityLevel == CryptoSecurityLevel.UNINITIALIZED) {
                    securityLevel = CryptoSecurityLevel.KEYSTORE_TEE
                }
            }
        } catch (e: Exception) {
            securityLevel = CryptoSecurityLevel.FAILED
            initializationError = e.message
            android.util.Log.e("FinlifeCryptoEngine", "Fatal: Keystore initialization failed: ${e.message}", e)
        }
    }

    fun getDiagnostics(): Map<String, Any?> {
        return mapOf(
            "securityLevel" to securityLevel.name,
            "isStrongBox" to (securityLevel == CryptoSecurityLevel.STRONGBOX_HSM),
            "keyAlias" to KEY_ALIAS,
            "transformation" to TRANSFORMATION,
            "initializationError" to initializationError
        )
    }

    private fun getSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)
        val entry = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry
        return entry?.secretKey ?: throw IllegalStateException("Failed to load FinLife Keystore Master Key (state: $securityLevel)")
    }

    @Synchronized
    fun encrypt(plainText: String): String {
        if (securityLevel == CryptoSecurityLevel.FAILED) {
            throw IllegalStateException("FinlifeCryptoEngine is in FAILED state ($initializationError). Fail-closed: refusing unencrypted persistence.")
        }
        try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, getSecretKey())
            val iv = cipher.iv
            val cipherBytes = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))

            val combined = ByteArray(iv.size + cipherBytes.size)
            System.arraycopy(iv, 0, combined, 0, iv.size)
            System.arraycopy(cipherBytes, 0, combined, iv.size, cipherBytes.size)

            return CIPHER_PREFIX + Base64.encodeToString(combined, Base64.NO_WRAP)
        } catch (e: Exception) {
            throw RuntimeException("AES-256-GCM encryption failed: ${e.message}", e)
        }
    }

    @Synchronized
    fun decrypt(cipherText: String): String {
        // Transparent backward-compatibility migration for legacy obfuscated records
        if (cipherText.startsWith("FL_ENC_V1:")) {
            try {
                val b64 = cipherText.substring("FL_ENC_V1:".length)
                return String(Base64.decode(b64, Base64.NO_WRAP), Charsets.UTF_8)
            } catch (e: Exception) {
                return cipherText
            }
        }

        if (!cipherText.startsWith(CIPHER_PREFIX)) {
            return cipherText
        }
        try {
            val rawBase64 = cipherText.substring(CIPHER_PREFIX.length)
            val combined = Base64.decode(rawBase64, Base64.NO_WRAP)

            val iv = ByteArray(IV_LENGTH)
            val cipherBytes = ByteArray(combined.size - IV_LENGTH)
            System.arraycopy(combined, 0, iv, 0, IV_LENGTH)
            System.arraycopy(combined, IV_LENGTH, cipherBytes, 0, cipherBytes.size)

            val cipher = Cipher.getInstance(TRANSFORMATION)
            val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
            cipher.init(Cipher.DECRYPT_MODE, getSecretKey(), spec)

            val plainBytes = cipher.doFinal(cipherBytes)
            return String(plainBytes, Charsets.UTF_8)
        } catch (e: Exception) {
            throw RuntimeException("AES-256-GCM decryption failed: ${e.message}", e)
        }
    }
}
