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

/**
 * WhatsApp calls are end-to-end encrypted VoIP — there is no API, public or private, that lets
 * a third-party app capture their audio. This service only *detects that a call notification
 * appeared* (best-effort, heuristic, and will break if WhatsApp changes its notification
 * shape) and logs it as metadata-only. Do not extend this to attempt audio capture.
 */
class WhatsAppCallListenerService : NotificationListenerService() {

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName != WHATSAPP_PACKAGE) return
        val category = sbn.notification?.category ?: return
        if (category != android.app.Notification.CATEGORY_CALL) return

        val title = sbn.notification.extras?.getCharSequence(android.app.Notification.EXTRA_TITLE)?.toString() ?: "WhatsApp contact"

        CoroutineScope(Dispatchers.IO).launch {
            val dao = AppDatabase.get(applicationContext).callDao()
            // WhatsApp notifications expose the contact's display name, not their phone number,
            // so this can't be matched to a Lead by phone the way SIM calls are — the backend
            // will create/attach a contact keyed on this name string until a better signal exists.
            val entry = CallEntity(
                fromNumber = title,
                toNumber = "self",
                direction = "INBOUND",
                source = "WHATSAPP",
                startedAt = isoFormat.format(Date()),
                durationSec = null,
                status = "COMPLETED",
            )
            dao.insert(entry)
            WorkManager.getInstance(applicationContext).enqueue(OneTimeWorkRequestBuilder<CallSyncWorker>().build())
        }
    }

    companion object {
        private const val WHATSAPP_PACKAGE = "com.whatsapp"
    }
}
