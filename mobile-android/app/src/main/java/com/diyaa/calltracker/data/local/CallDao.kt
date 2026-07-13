package com.diyaa.calltracker.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update

@Dao
interface CallDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(call: CallEntity): Long

    @Query("SELECT * FROM calls WHERE synced = 0 ORDER BY startedAt ASC LIMIT :limit")
    suspend fun unsynced(limit: Int = 25): List<CallEntity>

    @Query("SELECT COUNT(*) FROM calls WHERE synced = 0")
    suspend fun unsyncedCount(): Int

    @Update
    suspend fun update(call: CallEntity)

    @Query("SELECT * FROM calls WHERE synced = 1 AND localRecordingPath IS NOT NULL AND recordingUploaded = 0")
    suspend fun pendingRecordingUploads(): List<CallEntity>

    // Guards against double-logging: the phone's own CallLog provider is also queried
    // after every state change, so the same system call could otherwise be captured twice.
    @Query("SELECT COUNT(*) FROM calls WHERE fromNumber = :from AND toNumber = :to AND startedAt = :startedAt")
    suspend fun existsForCall(from: String, to: String, startedAt: String): Int
}
