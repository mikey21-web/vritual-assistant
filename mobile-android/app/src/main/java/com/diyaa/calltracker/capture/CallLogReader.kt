package com.diyaa.calltracker.capture

import android.content.Context
import android.provider.CallLog
import com.diyaa.calltracker.data.local.CallEntity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object CallLogReader {

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    /** Reads the single most recent entry from the system CallLog (requires READ_CALL_LOG). */
    fun readLatest(context: Context): CallEntity? {
        val projection = arrayOf(
            CallLog.Calls.NUMBER,
            CallLog.Calls.TYPE,
            CallLog.Calls.DATE,
            CallLog.Calls.DURATION,
        )
        context.contentResolver.query(
            CallLog.Calls.CONTENT_URI, projection, null, null, "${CallLog.Calls.DATE} DESC LIMIT 1",
        )?.use { cursor ->
            if (!cursor.moveToFirst()) return null

            val number = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER)) ?: return null
            val type = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE))
            val dateMs = cursor.getLong(cursor.getColumnIndexOrThrow(CallLog.Calls.DATE))
            val durationSec = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION))

            val direction = if (type == CallLog.Calls.INCOMING_TYPE) "INBOUND" else "OUTBOUND"
            val status = when (type) {
                CallLog.Calls.MISSED_TYPE -> "NO_ANSWER"
                CallLog.Calls.REJECTED_TYPE -> "BUSY"
                else -> "COMPLETED"
            }
            // The "own number" side is left blank — the backend only needs the counterpart's
            // number to attribute the call to a lead, matched against fromNumber/toNumber by direction.
            val selfPlaceholder = "self"

            return CallEntity(
                fromNumber = if (direction == "INBOUND") number else selfPlaceholder,
                toNumber = if (direction == "INBOUND") selfPlaceholder else number,
                direction = direction,
                source = "SIM",
                startedAt = isoFormat.format(Date(dateMs)),
                durationSec = durationSec,
                status = status,
            )
        }
        return null
    }
}
