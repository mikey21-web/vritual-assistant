package com.diyaa.calltracker.capture

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.diyaa.calltracker.CallTrackerApp

/**
 * Shows a high-priority notification when a call ends, prompting the user to add
 * notes about the conversation. The notification opens [NoteActivity] where the
 * user can type and save their notes.
 *
 * Notes are stored in plain SharedPreferences (keyed by the call's [localId])
 * and are uploaded via `PATCH /call-tracking/calls/{callLogId}/notes` once the
 * sync worker returns the server-side [callLogId][com.diyaa.calltracker.data.local.CallEntity.remoteCallLogId].
 *
 * Callers: [CallStateReceiver] (SIM calls) and [WhatsAppCallListenerService] (WhatsApp calls).
 */
object NotePromptManager {

    /**
     * Posts a notification for the just-ended call.
     *
     * @param localId    The [com.diyaa.calltracker.data.local.CallEntity.localId] in Room.
     * @param fromNumber The caller/callee display number or name.
     * @param direction  "INBOUND" or "OUTBOUND".
     * @param durationSec  Call duration in seconds (may be null for missed calls).
     * @param source     "SIM" or "WHATSAPP".
     */
    fun showNotePrompt(
        context: Context,
        localId: String,
        fromNumber: String,
        direction: String,
        durationSec: Int?,
        source: String,
    ) {
        val label = if (direction == "INBOUND") "INCOMING" else "OUTGOING"
        val durationText = if (durationSec != null) "($durationSec sec)" else ""

        // Intent to open NoteActivity
        val noteIntent = Intent(context, NoteActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("localId", localId)
            putExtra("fromNumber", fromNumber)
            putExtra("direction", label)
            putExtra("durationSec", durationSec ?: 0)
            putExtra("source", source)
        }
        val notePendingIntent = PendingIntent.getActivity(
            context,
            localId.hashCode(), // unique request code per call
            noteIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        // Dismiss action
        val dismissIntent = Intent(context, DismissNoteBroadcastReceiver::class.java).apply {
            putExtra("notificationId", localId.hashCode())
        }
        val dismissPendingIntent = PendingIntent.getBroadcast(
            context,
            localId.hashCode() + 1,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, CallTrackerApp.CHANNEL_NOTES)
            .setSmallIcon(android.R.drawable.ic_menu_edit)
            .setContentTitle("Call with $fromNumber")
            .setContentText("Tap to add notes about this $label call $durationText")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(notePendingIntent)
            .addAction(
                android.R.drawable.ic_menu_edit,
                "Add Note",
                notePendingIntent,
            )
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Dismiss",
                dismissPendingIntent,
            )
            .build()

        NotificationManagerCompat.from(context).notify(localId.hashCode(), notification)
    }
}

/**
 * Internal broadcast receiver that cancels a note-prompt notification when the user
 * taps "Dismiss".
 */
class DismissNoteBroadcastReceiver : android.content.BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val notificationId = intent.getIntExtra("notificationId", 0)
        if (notificationId != 0) {
            NotificationManagerCompat.from(context).cancel(notificationId)
        }
    }
}
