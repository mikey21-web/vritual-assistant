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
 * Records WhatsApp VoIP calls using [MediaRecorder.AudioSource.VOICE_COMMUNICATION].
 *
 * Unlike [CallRecordingService] (which targets cellular SIM calls via VOICE_CALL and requires
 * the call-screening role), this service uses VOICE_COMMUNICATION — the standard audio source
 * for VoIP apps like WhatsApp. On most devices this captures both the microphone input (your
 * voice) and the speaker output (the other party's voice) mixed together.
 *
 * Limitations (same as any non-root call recorder):
 * - Android 14+ restricts VOICE_COMMUNICATION for accessibility services; the user must
 *   manually grant the "Record audio" permission.
 * - Some OEMs (Xiaomi, OPPO) may route only the mic side unless "Speakerphone" is active.
 * - The audio file is an unencrypted mix of both streams — WhatsApp's E2E encryption is not
 *   broken; this records what the speaker plays, the same as a screen recorder with audio.
 */
class WhatsAppCallRecorderService : Service() {
    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        beginRecording()
        return START_NOT_STICKY
    }

    private fun beginRecording() {
        val dir = File(filesDir, "whatsapp_recordings").apply { mkdirs() }
        val name = "wa_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.m4a"
        val file = File(dir, name)
        outputFile = file

        recorder = MediaRecorder().apply {
            try {
                setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            } catch (e: Exception) {
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
        }
        recorder?.release()
        recorder = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, CallTrackerApp.CHANNEL_RECORDING)
            .setContentTitle("Recording WhatsApp call")
            .setContentText("Recording audio via VOICE_COMMUNICATION source")
            .setSmallIcon(android.R.drawable.presence_audio_online)
            .setOngoing(true)
            .build()

    companion object {
        private const val NOTIFICATION_ID = 43

        fun start(context: Context) {
            val intent = Intent(context, WhatsAppCallRecorderService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, WhatsAppCallRecorderService::class.java))
        }

        fun lastRecordingPath(context: Context): String? {
            val dir = File(context.filesDir, "whatsapp_recordings")
            return dir.listFiles()?.maxByOrNull { it.lastModified() }?.absolutePath
        }
    }
}
