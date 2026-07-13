package com.diyaa.calltracker.data

// Mirrors backend/src/call-tracking/dto/call-tracking.dto.ts — keep these in sync
// if the DTO shapes change.

data class PairDeviceRequest(
    val pairingCode: String,
    val model: String?,
    val platform: String = "android",
)

data class PairDeviceResponse(
    val apiKey: String,
    val deviceId: String,
    val message: String,
)

data class CallSyncEntry(
    val localId: String,
    val fromNumber: String,
    val toNumber: String,
    val direction: String, // INBOUND | OUTBOUND
    val source: String,    // SIM | WHATSAPP
    val startedAt: String, // ISO-8601
    val durationSec: Int?,
    val status: String?,   // COMPLETED | NO_ANSWER | BUSY | FAILED
    val recordingUrl: String? = null,
)

data class CallSyncRequest(val calls: List<CallSyncEntry>)

data class CallSyncResultEntry(val localId: String?, val callLogId: String, val status: String)
data class CallSyncResponse(val results: List<CallSyncResultEntry>)
