package com.diyaa.calltracker.capture

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.diyaa.calltracker.data.local.AppDatabase
import com.diyaa.calltracker.sync.CallSyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Watches system-wide call state to know when a call has just ended, so we can pull it from
 * CallLog and (if the call-screening role is held) stop any in-progress recording.
 */
class CallStateReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        when (state) {
            TelephonyManager.EXTRA_STATE_OFFHOOK -> onCallActive(context)
            TelephonyManager.EXTRA_STATE_IDLE -> onCallEnded(context)
        }
    }

    private fun onCallActive(context: Context) {
        val capability = CapabilityChecker.checkSimRecording(context)
        if (capability.isSupported && CapabilityChecker.hasRecordAudioPermission(context)) {
            CallRecordingService.start(context)
        }
    }

    private fun onCallEnded(context: Context) {
        CallRecordingService.stop(context)

        val pendingResult = goAsync()
        // CallLog's own write for the just-ended call can lag by a second or two behind the
        // IDLE broadcast; a short delay avoids reading a stale row.
        Handler(Looper.getMainLooper()).postDelayed({
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val entry = CallLogReader.readLatest(context)
                    if (entry != null) {
                        val dao = AppDatabase.get(context).callDao()
                        val alreadyLogged = dao.existsForCall(entry.fromNumber, entry.toNumber, entry.startedAt) > 0
                        if (!alreadyLogged) {
                            dao.insert(entry)
                            WorkManager.getInstance(context).enqueue(OneTimeWorkRequestBuilder<CallSyncWorker>().build())
                        }
                    }
                } finally {
                    pendingResult.finish()
                }
            }
        }, 2000)
    }
}
