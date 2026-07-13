package com.diyaa.calltracker.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.diyaa.calltracker.data.ApiClient
import com.diyaa.calltracker.data.CallSyncEntry
import com.diyaa.calltracker.data.CallSyncRequest
import com.diyaa.calltracker.data.local.AppDatabase
import com.diyaa.calltracker.data.local.CallEntity
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

/**
 * Pushes queued call rows to POST /call-tracking/sync, then uploads any local recordings for
 * rows that synced successfully. Runs both on the CallStateReceiver/notification-listener
 * trigger and periodically via a WorkManager PeriodicWorkRequest set up at pairing time.
 */
class CallSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val dao = AppDatabase.get(applicationContext).callDao()
        val pending = dao.unsynced()
        if (pending.isEmpty()) {
            uploadPendingRecordings(dao)
            return Result.success()
        }

        val request = CallSyncRequest(calls = pending.map { it.toSyncEntry() })

        return try {
            val response = ApiClient.api.sync(request)
            if (!response.isSuccessful) return Result.retry()

            val results = response.body()?.results.orEmpty()
            val byLocalId = results.associateBy { it.localId }
            for (call in pending) {
                val result = byLocalId[call.localId] ?: continue
                dao.update(call.copy(synced = true, remoteCallLogId = result.callLogId))
            }

            uploadPendingRecordings(dao)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    private suspend fun uploadPendingRecordings(dao: com.diyaa.calltracker.data.local.CallDao) {
        for (call in dao.pendingRecordingUploads()) {
            val callLogId = call.remoteCallLogId ?: continue
            val path = call.localRecordingPath ?: continue
            val file = File(path)
            if (!file.exists()) continue

            try {
                val body = file.asRequestBody("audio/mp4".toMediaType())
                val part = MultipartBody.Part.createFormData("file", file.name, body)
                val response = ApiClient.api.uploadRecording(callLogId, part)
                if (response.isSuccessful) {
                    dao.update(call.copy(recordingUploaded = true))
                }
            } catch (e: Exception) {
                // Left for the next periodic run to retry.
            }
        }
    }

    private fun CallEntity.toSyncEntry() = CallSyncEntry(
        localId = localId,
        fromNumber = fromNumber,
        toNumber = toNumber,
        direction = direction,
        source = source,
        startedAt = startedAt,
        durationSec = durationSec,
        status = status,
        recordingUrl = null,
    )
}
