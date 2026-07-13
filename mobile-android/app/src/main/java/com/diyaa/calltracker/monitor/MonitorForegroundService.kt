package com.diyaa.calltracker.monitor

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.diyaa.calltracker.CallTrackerApp
import com.diyaa.calltracker.data.local.AppDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * A low-priority persistent notification, required to keep call-state + notification-listener
 * capture reliable in the background on modern Android (without a foreground service, the OS
 * can suspend the app between calls and silently drop the BroadcastReceiver's work).
 */
class MonitorForegroundService : Service() {
    private var job: Job? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification(0))
        job = CoroutineScope(Dispatchers.IO).launch {
            val dao = AppDatabase.get(applicationContext).callDao()
            while (true) {
                val pending = dao.unsyncedCount()
                startForeground(NOTIFICATION_ID, buildNotification(pending))
                delay(15_000)
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        job?.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(pendingCount: Int): Notification =
        NotificationCompat.Builder(this, CallTrackerApp.CHANNEL_MONITOR)
            .setContentTitle("Call Tracker is watching calls")
            .setContentText(if (pendingCount > 0) "$pendingCount call(s) pending sync" else "All calls synced")
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setOngoing(true)
            .build()

    companion object {
        private const val NOTIFICATION_ID = 1

        fun start(context: Context) {
            val intent = Intent(context, MonitorForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, MonitorForegroundService::class.java))
        }
    }
}
