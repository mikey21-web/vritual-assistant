package com.diyaa.calltracker.capture

import android.content.Context
import android.provider.MediaStore
import android.provider.MediaStore.Audio.Media
import java.io.File

/**
 * Watches for audio files written by the device's built-in (OEM) call recorder.
 *
 * Most Android OEMs (Samsung, Xiaomi/MIUI, Oppo, etc.) include a system dialer that can
 * record calls natively. Those recordings land in well-known public directory paths that this
 * class queries via MediaStore — no special permission beyond READ_MEDIA_AUDIO /
 * READ_EXTERNAL_STORAGE is needed.
 *
 * Usage: call [findRecordingAfter] with the call's start time (epoch ms) shortly after the
 * call ends. Poll if no result; native recorders can take a couple seconds to finalize the
 * file after the call disconnects.
 */
object NativeRecordingWatcher {

    /**
     * Path-fragment patterns used by common OEM dialers.
     * - Call/  — Stock Android / Samsung / OnePlus
     * - CallRecordings/  — Some Xiaomi / custom ROMs
     * - Recordings/Call/  — Oppo / Realme
     * - MIUI/sound_recorder/call_rec/  — MIUI (Xiaomi)
     * - Recordings/  — Broad fallback (last resort)
     */
    private val OEM_PATH_PATTERNS = listOf(
        "Call/",
        "CallRecordings/",
        "Recordings/Call/",
        "MIUI/sound_recorder/call_rec/",
    )

    private val projection = arrayOf(
        Media._ID,
        Media.DATA,
        Media.DATE_ADDED,
        Media.DISPLAY_NAME,
        Media.MIME_TYPE,
    )

    /**
     * Queries MediaStore for an audio file whose relative path matches a known OEM
     * call-recording folder pattern and whose modification time is >= [afterEpochMs]
     * (the call's start time, in milliseconds).
     *
     * Returns the absolute file path of the first match, or null if nothing found.
     */
    fun findRecordingAfter(context: Context, afterEpochMs: Long): String? {
        val selection = "${Media.DATE_ADDED} >= ?"
        val selectionArgs = arrayOf((afterEpochMs / 1000).toString())

        context.contentResolver.query(
            Media.EXTERNAL_CONTENT_URI,
            projection,
            selection,
            selectionArgs,
            "${Media.DATE_ADDED} DESC LIMIT 10",
        )?.use { cursor ->
            while (cursor.moveToNext()) {
                val filePath = cursor.getString(cursor.getColumnIndexOrThrow(Media.DATA)) ?: continue
                val relativePath = extractRelativePath(filePath)
                if (relativePath != null && OEM_PATH_PATTERNS.any { pattern ->
                        relativePath.startsWith(pattern, ignoreCase = true)
                    }) {
                    return filePath
                }
            }
        }
        return null
    }

    /**
     * Polls [findRecordingAfter] up to [maxRetries] times with [delayMs] between attempts.
     * Native recorders can take a moment to finalize their files after the call ends, so a
     * short poll cycle gives them time.
     */
    fun pollForRecording(
        context: Context,
        afterEpochMs: Long,
        maxRetries: Int = 5,
        delayMs: Long = 1500,
    ): String? {
        for (i in 0 until maxRetries) {
            val result = findRecordingAfter(context, afterEpochMs)
            if (result != null) return result
            if (i < maxRetries - 1) {
                try {
                    Thread.sleep(delayMs)
                } catch (_: InterruptedException) {
                    Thread.currentThread().interrupt()
                    return null
                }
            }
        }
        return null
    }

    /**
     * Extracts the relative path from an absolute content path, e.g.
     * "/storage/emulated/0/Call/record_20240101.m4a" -> "Call/record_20240101.m4a"
     *
     * The tricky part is that MediaStore.DATA can point to various roots depending on
     * the device and Android version. We look for the first segment that matches one of
     * our known OEM patterns.
     */
    private fun extractRelativePath(absolutePath: String): String? {
        // Normalise separators — MediaStore always uses '/'
        val normalized = absolutePath.replace(File.separatorChar, '/')
        for (pattern in OEM_PATH_PATTERNS) {
            val idx = normalized.indexOf("/$pattern", ignoreCase = true)
            if (idx >= 0) {
                return normalized.substring(idx + 1)
            }
        }
        // One more try: check if the path itself starts with a known pattern after the
        // last emulated/ directory, e.g. "/storage/emulated/0/Call/..."
        val emulatedIdx = normalized.indexOf("/0/")
        if (emulatedIdx >= 0) {
            val afterEmulated = normalized.substring(emulatedIdx + 3)
            if (OEM_PATH_PATTERNS.any { afterEmulated.startsWith(it, ignoreCase = true) }) {
                return afterEmulated
            }
        }
        return null
    }
}
