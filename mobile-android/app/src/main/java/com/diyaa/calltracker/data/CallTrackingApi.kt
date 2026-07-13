package com.diyaa.calltracker.data

import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface CallTrackingApi {
    @POST("call-tracking/devices/pair")
    suspend fun pair(@Body body: PairDeviceRequest): Response<PairDeviceResponse>

    @POST("call-tracking/sync")
    suspend fun sync(@Body body: CallSyncRequest): Response<CallSyncResponse>

    @GET("contacts/search")
    suspend fun searchContact(@Query("phone") phone: String): Response<ContactSearchResponse>

    @Multipart
    @POST("call-tracking/recordings/{callLogId}")
    suspend fun uploadRecording(
        @Path("callLogId") callLogId: String,
        @Part file: MultipartBody.Part,
    ): Response<Unit>

    @PATCH("call-tracking/calls/{callLogId}/notes")
    suspend fun updateCallNotes(
        @Path("callLogId") callLogId: String,
        @Body body: UpdateNotesRequest,
    ): Response<Unit>
}
