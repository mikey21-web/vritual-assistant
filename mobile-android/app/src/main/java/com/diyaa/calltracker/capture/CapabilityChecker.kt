package com.diyaa.calltracker.capture

import android.app.role.RoleManager
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * Whether call audio recording is realistic on this device. Android has progressively locked
 * down third-party call recording since Android 10 — most OEMs refuse it outright unless the
 * app holds the call-screening/default-dialer role, and even then some manufacturers (Samsung,
 * many Xiaomi builds) block MediaRecorder's VOICE_CALL source regardless. This is a best-effort
 * check surfaced to the user, not a promise.
 */
object CapabilityChecker {

    data class RecordingCapability(
        val hasCallScreeningRole: Boolean,
        val voiceCallSourceAvailable: Boolean,
    ) {
        val isSupported: Boolean get() = hasCallScreeningRole && voiceCallSourceAvailable
    }

    fun checkSimRecording(context: Context): RecordingCapability {
        val hasRole = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = context.getSystemService(RoleManager::class.java)
            roleManager?.isRoleHeld(RoleManager.ROLE_CALL_SCREENING) == true
        } else {
            // Pre-Q devices don't have the role system; recording legality/behavior varies
            // widely by OEM and is not something we can reliably probe.
            false
        }

        val sourceAvailable = probeVoiceCallSource()
        return RecordingCapability(hasCallScreeningRole = hasRole, voiceCallSourceAvailable = sourceAvailable)
    }

    fun hasRecordAudioPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

    private fun probeVoiceCallSource(): Boolean {
        // MediaRecorder.AudioSource.VOICE_CALL is a hidden/OEM-gated source. There is no public
        // API to query support ahead of time; we can only find out by attempting to prepare a
        // recorder against it and see if it throws.
        val recorder = MediaRecorder()
        return try {
            recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_CALL)
            true
        } catch (e: Exception) {
            false
        } finally {
            recorder.release()
        }
    }
}
