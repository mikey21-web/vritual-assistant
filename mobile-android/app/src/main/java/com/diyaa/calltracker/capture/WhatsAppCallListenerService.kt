package com.diyaa.calltracker.capture

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.diyaa.calltracker.data.local.AppDatabase
import com.diyaa.calltracker.data.local.CallEntity
import com.diyaa.calltracker.sync.CallSyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.ConcurrentHashMap

/**
 * Detects WhatsApp call notifications and records them using
 * [MediaRecorder.AudioSource.VOICE_COMMUNICATION].
 *
 * WhatsApp calls use the standard Android VoIP audio pipeline. By recording with
 * VOICE_COMMUNICATION source, this service captures both the microphone input
 * (your voice) and the speaker output (the other party's voice) — the same way any
 * screen recorder with audio capture works. WhatsApp's E2E encryption is not broken;
 * this records the decoded audio after it leaves the WhatsApp process.
 */
class WhatsAppCallListenerService : NotificationListenerService() {

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    /**
     * Tracks active WhatsApp calls keyed by notification tag|id.
     * Stores the CallEntity so [onNotificationRemoved] can calculate duration,
     * detect missed calls, and update the entity in Room.
     */
    private val activeCalls = ConcurrentHashMap<String, CallEntity>()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName != WHATSAPP_PACKAGE) return
        val category = sbn.notification?.category ?: return
        if (category != android.app.Notification.CATEGORY_CALL) return

        val title = sbn.notification.extras?.getCharSequence(android.app.Notification.EXTRA_TITLE)?.toString() ?: "WhatsApp contact"

        // Detect call direction from notification actions:
        // - Incoming WhatsApp calls provide "Answer" / "Decline" action buttons
        // - Outgoing calls have no such buttons (or only a "Dismiss" action)
        val actions = sbn.notification.actions
        val hasAnswerDeclineActions = actions?.any { action ->
            val actionTitle = action.title?.toString() ?: ""
            actionTitle.contains("Answer", ignoreCase = true) ||
                actionTitle.contains("Decline", ignoreCase = true) ||
                actionTitle.contains("Accept", ignoreCase = true) ||
                actionTitle.contains("Reject", ignoreCase = true)
        } ?: false
        val direction = if (hasAnswerDeclineActions) "INBOUND" else "OUTBOUND"

        // Build a unique notification key to track this specific call
        val notificationKey = sbn.tag?.let { "$it|${sbn.id}" } ?: "${sbn.id}"

        CoroutineScope(Dispatchers.IO).launch {
            val dao = AppDatabase.get(applicationContext).callDao()
            // WhatsApp notifications expose the contact's display name, not their phone number,
            // so this can't be matched to a Lead by phone the way SIM calls are — the backend
            // will create/attach a contact keyed on this name string until a better signal exists.
            val entry = CallEntity(
                fromNumber = title,
                toNumber = "self",
                direction = direction,
                source = "WHATSAPP",
                startedAt = isoFormat.format(Date()),
                durationSec = null,
                status = "COMPLETED",
            )
            dao.insert(entry)
            // Keep a reference so onNotificationRemoved can update duration/status
            activeCalls[notificationKey] = entry
            WhatsAppCallRecorderService.start(applicationContext)
            WorkManager.getInstance(applicationContext).enqueue(OneTimeWorkRequestBuilder<CallSyncWorker>().build())
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        if (sbn.packageName != WHATSAPP_PACKAGE) return

        val notificationKey = sbn.tag?.let { "$it|${sbn.id}" } ?: "${sbn.id}"
        val entry = activeCalls.remove(notificationKey) ?: return

        CoroutineScope(Dispatchers.IO).launch {
            val dao = AppDatabase.get(applicationContext).callDao()

            // Stop the recorder and get the recording file path
            WhatsAppCallRecorderService.stop(applicationContext)
            val recordingPath = WhatsAppCallRecorderService.lastRecordingPath(applicationContext)

            val removedTimeMs = System.currentTimeMillis()
            val startedAtMs = isoFormat.parse(entry.startedAt)?.time ?: removedTimeMs
            val durationSec = ((removedTimeMs - startedAtMs) / 1000).toInt().coerceAtLeast(0)

            // If the notification was removed within 30 seconds of being posted,
            // the call was never answered -> mark as MISSED
            val status = if (durationSec < 30) "MISSED" else "COMPLETED"

            val updatedEntry = entry.copy(
                durationSec = durationSec,
                status = status,
                localRecordingPath = recordingPath,
            )
            dao.update(updatedEntry)

            // Show post-call note prompt
            NotePromptManager.showNotePrompt(
                context = applicationContext,
                localId = updatedEntry.localId,
                fromNumber = updatedEntry.fromNumber, // WhatsApp contact display name
                direction = updatedEntry.direction,
                durationSec = durationSec,
                source = updatedEntry.source,
            )

            WorkManager.getInstance(applicationContext).enqueue(OneTimeWorkRequestBuilder<CallSyncWorker>().build())
        }
    }

    companion object {
        private const val WHATSAPP_PACKAGE = "com.whatsapp"
    }
}
