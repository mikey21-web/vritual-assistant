package com.diyaa.calltracker.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "calls")
data class CallEntity(
    @PrimaryKey val localId: String = UUID.randomUUID().toString(),
    val fromNumber: String,
    val toNumber: String,
    val direction: String,   // INBOUND | OUTBOUND
    val source: String,      // SIM | WHATSAPP
    val startedAt: String,   // ISO-8601
    val durationSec: Int?,
    val status: String,      // COMPLETED | NO_ANSWER | BUSY | FAILED
    val localRecordingPath: String? = null,
    val remoteCallLogId: String? = null,
    val synced: Boolean = false,
    val recordingUploaded: Boolean = false,
)
