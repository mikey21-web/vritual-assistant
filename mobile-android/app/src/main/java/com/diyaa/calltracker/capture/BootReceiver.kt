package com.diyaa.calltracker.capture

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.diyaa.calltracker.monitor.MonitorForegroundService
import com.diyaa.calltracker.sync.SyncScheduler

/**
 * Re-initialises background services after a device reboot.
 *
 * Android removes all alarms and stops foreground services when the device powers off,
 * so we need to restart [MonitorForegroundService] and re-enqueue the periodic WorkManager
 * sync once the system is ready.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        MonitorForegroundService.start(context)
        SyncScheduler.schedulePeriodicSync(context)
    }
}
