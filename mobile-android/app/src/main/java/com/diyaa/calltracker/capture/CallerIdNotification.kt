package com.diyaa.calltracker.capture

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.diyaa.calltracker.BuildConfig
import com.diyaa.calltracker.CallTrackerApp
import com.diyaa.calltracker.data.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Looks up an incoming caller number against the CRM backend and posts a
 * high-priority notification with the contact name (or "Unknown caller").
 *
 * This is designed to be called from a [android.content.BroadcastReceiver]
 * via a coroutine — see [CallStateReceiver].
 */
object CallerIdNotification {

    private const val NOTIFICATION_ID = 100

    /**
     * Fetches contact info from the backend and shows the notification.
     * Must be called from a coroutine context (e.g. [Dispatchers.IO]).
     */
    suspend fun show(context: Context, phoneNumber: String) {
        val response = withContext(Dispatchers.IO) {
            try {
                ApiClient.api.searchContact(phoneNumber)
            } catch (_: Exception) {
                null
            }
        }

        val contact = response?.body()

        if (contact != null && contact.found && contact.name != null) {
            showKnownCaller(
                context = context,
                name = contact.name,
                company = contact.company,
                number = phoneNumber,
            )
        } else {
            showUnknownCaller(context, phoneNumber)
        }
    }

    private fun showKnownCaller(
        context: Context,
        name: String,
        company: String?,
        number: String,
    ) {
        val dashboardUrl = BuildConfig.API_BASE_URL.trimEnd('/')

        val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse(dashboardUrl)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val body = buildString {
            append("Incoming call from $name")
            if (company != null) append(" · $company")
        }

        val notification = NotificationCompat.Builder(context, CallTrackerApp.CHANNEL_CALLER_ID)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle(name)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .addAction(
                android.R.drawable.ic_menu_view,
                "View in CRM",
                pendingIntent,
            )
            .build()

        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    }

    private fun showUnknownCaller(context: Context, number: String) {
        val notification = NotificationCompat.Builder(context, CallTrackerApp.CHANNEL_CALLER_ID)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle("Unknown caller")
            .setContentText("Incoming call from $number")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID + 1, notification)
    }
}
