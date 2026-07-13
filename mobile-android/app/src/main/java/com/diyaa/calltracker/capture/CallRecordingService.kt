package com.diyaa.calltracker.capture

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.diyaa.calltracker.CallTrackerApp
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Best-effort SIM call recorder. Only ever started when [CapabilityChecker] has already
 * confirmed the device both holds the call-screening role and accepts MediaRecorder's
 * VOICE_CALL audio source — many devices will never satisfy that and this service simply
 * won't be started on them. The recorded file's path is attached to the next synced
 * CallEntity by CallStateReceiver/CallSyncWorker, not by this service directly.
 */
class CallRecordingService : Service() {
    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        beginRecording()
        return START_NOT_STICKY
    }

    private fun beginRecording() {
        val dir = File(filesDir, "recordings").apply { mkdirs() }
        val name = "call_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.m4a"
        val file = File(dir, name)
        outputFile = file

        recorder = MediaRecorder().apply {
            try {
                setAudioSource(MediaRecorder.AudioSource.VOICE_CALL)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            } catch (e: Exception) {
                // Device claimed support via the capability probe but rejected it here anyway —
                // stop cleanly rather than crash the foreground service.
                release()
                recorder = null
                stopSelf()
            }
        }
    }

    override fun onDestroy() {
        try {
            recorder?.stop()
        } catch (_: Exception) {
            // stop() throws if start() never actually began recording; the output file is
            // then invalid/empty and simply won't be attached to a synced call.
        }
        recorder?.release()
        recorder = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, CallTrackerApp.CHANNEL_RECORDING)
            .setContentTitle("Recording call")
            .setSmallIcon(android.R.drawable.presence_audio_online)
            .setOngoing(true)
            .build()

    companion object {
        private const val NOTIFICATION_ID = 42

        fun start(context: Context) {
            val intent = Intent(context, CallRecordingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, CallRecordingService::class.java))
        }

        /** Path of the most recently completed recording, if the last call was recorded. */
        fun lastRecordingPath(context: Context): String? {
            val dir = File(context.filesDir, "recordings")
            return dir.listFiles()?.maxByOrNull { it.lastModified() }?.absolutePath
        }
    }
}
