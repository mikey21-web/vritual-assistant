package com.diyaa.calltracker.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

// Holds the device's long-lived API key issued by POST /call-tracking/devices/pair.
// Never held in plain SharedPreferences — it's the phone's only credential.
class SecureStorage(context: Context) {
    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "call_tracker_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    /** Non-encrypted preferences for device settings (SIM, office hours, etc.). */
    private val settingsPrefs: SharedPreferences by lazy {
        context.getSharedPreferences("call_tracker_settings", Context.MODE_PRIVATE)
    }

    var apiKey: String?
        get() = prefs.getString(KEY_API_KEY, null)
        set(value) = prefs.edit().putString(KEY_API_KEY, value).apply()

    var deviceId: String?
        get() = prefs.getString(KEY_DEVICE_ID, null)
        set(value) = prefs.edit().putString(KEY_DEVICE_ID, value).apply()

    val isPaired: Boolean get() = !apiKey.isNullOrBlank()

    /**
     * Tracks whether the device's built-in (OEM) call recorder has been detected recently.
     * Starts as null (unknown), set to true after NativeRecordingWatcher finds a recording,
     * set to false after [NATIVE_RECORDER_FAIL_THRESHOLD] consecutive calls with no native
     * recording found, so CallRecordingService (VOICE_CALL fallback) can be attempted.
     */
    var nativeRecorderAvailable: Boolean?
        get() = prefs.getBoolean(KEY_NATIVE_RECORDER_AVAILABLE, true).takeIf { prefs.contains(KEY_NATIVE_RECORDER_AVAILABLE) }
        set(value) {
            if (value != null) {
                prefs.edit().putBoolean(KEY_NATIVE_RECORDER_AVAILABLE, value).apply()
            }
        }

    /** How many consecutive calls with no native recording before we assume it's unavailable. */
    var nativeRecorderMisses: Int
        get() = prefs.getInt(KEY_NATIVE_RECORDER_MISSES, 0)
        set(value) = prefs.edit().putInt(KEY_NATIVE_RECORDER_MISSES, value).apply()

    // ── Settings (plain SharedPreferences) ────────────────────────────────────

    var selectedSim: String
        get() = settingsPrefs.getString(KEY_SELECTED_SIM, "both") ?: "both"
        set(value) = settingsPrefs.edit().putString(KEY_SELECTED_SIM, value).apply()

    var officeHoursStart: String
        get() = settingsPrefs.getString(KEY_OFFICE_HOURS_START, "09:00") ?: "09:00"
        set(value) = settingsPrefs.edit().putString(KEY_OFFICE_HOURS_START, value).apply()

    var officeHoursEnd: String
        get() = settingsPrefs.getString(KEY_OFFICE_HOURS_END, "18:00") ?: "18:00"
        set(value) = settingsPrefs.edit().putString(KEY_OFFICE_HOURS_END, value).apply()

    var officeDays: Int
        get() = settingsPrefs.getInt(KEY_OFFICE_DAYS, DEFAULT_OFFICE_DAYS)
        set(value) = settingsPrefs.edit().putInt(KEY_OFFICE_DAYS, value).apply()

    var officeHoursEnabled: Boolean
        get() = settingsPrefs.getBoolean(KEY_OFFICE_HOURS_ENABLED, false)
        set(value) = settingsPrefs.edit().putBoolean(KEY_OFFICE_HOURS_ENABLED, value).apply()

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_API_KEY = "api_key"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_NATIVE_RECORDER_AVAILABLE = "native_recorder_available"
        private const val KEY_NATIVE_RECORDER_MISSES = "native_recorder_misses"

        // Settings keys
        private const val KEY_SELECTED_SIM = "selected_sim"
        private const val KEY_OFFICE_HOURS_START = "office_hours_start"
        private const val KEY_OFFICE_HOURS_END = "office_hours_end"
        private const val KEY_OFFICE_DAYS = "office_days"
        private const val KEY_OFFICE_HOURS_ENABLED = "office_hours_enabled"

        const val NATIVE_RECORDER_FAIL_THRESHOLD = 3

        /** Bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16 => 31 = Mon–Fri. */
        const val DEFAULT_OFFICE_DAYS = 31
    }
}
