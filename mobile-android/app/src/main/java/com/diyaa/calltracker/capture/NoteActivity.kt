package com.diyaa.calltracker.capture

import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diyaa.calltracker.data.ApiClient
import com.diyaa.calltracker.data.UpdateNotesRequest
import com.diyaa.calltracker.data.local.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Compose activity that lets the user type and save notes about a just-ended call.
 *
 * Extras:
 * - [localId] – Room [com.diyaa.calltracker.data.local.CallEntity.localId]
 * - [fromNumber] – Caller/callee display number or name
 * - [direction]  – "INCOMING" or "OUTGOING"
 * - [durationSec] – Call duration in seconds
 * - [source]     – "SIM" or "WHATSAPP"
 */
class NoteActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val localId = intent.getStringExtra(EXTRA_LOCAL_ID) ?: run { finish(); return }
        val fromNumber = intent.getStringExtra(EXTRA_FROM_NUMBER) ?: "Unknown"
        val direction = intent.getStringExtra(EXTRA_DIRECTION) ?: "UNKNOWN"
        val durationSec = intent.getIntExtra(EXTRA_DURATION_SEC, 0)

        setContent {
            MaterialTheme {
                NoteScreen(
                    localId = localId,
                    fromNumber = fromNumber,
                    direction = direction,
                    durationSec = durationSec,
                    activity = this,
                )
            }
        }
    }

    companion object {
        const val EXTRA_LOCAL_ID = "localId"
        const val EXTRA_FROM_NUMBER = "fromNumber"
        const val EXTRA_DIRECTION = "direction"
        const val EXTRA_DURATION_SEC = "durationSec"
        const val EXTRA_SOURCE = "source"
    }
}

// ── Pending-note SharedPreferences helpers ─────────────────────────────────────

/** Saves a note to plain SharedPreferences keyed by [localId]. */
internal fun savePendingNote(context: Context, localId: String, notes: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(localId, notes)
        .apply()
}

/** Removes a pending note after it has been successfully sent to the server. */
internal fun removePendingNote(context: Context, localId: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .remove(localId)
        .apply()
}

/** Reads a pending note (or null) for the given [localId]. */
internal fun getPendingNote(context: Context, localId: String): String? {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getString(localId, null)
}

/** Returns all localIds that have pending notes waiting to be sent. */
internal fun allPendingNoteKeys(context: Context): Set<String> {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    @Suppress("UNCHECKED_CAST")
    return prefs.all.filterValues { it is String }.keys
}

private const val PREFS_NAME = "pending_call_notes"

// ── Composable UI ─────────────────────────────────────────────────────────────

/**
 * Full-screen Compose layout for adding notes about a call.
 *
 * Tries to send notes to the server immediately if the call has already been
 * synced (remoteCallLogId != null). Otherwise saves to SharedPreferences so the
 * [com.diyaa.calltracker.sync.CallSyncWorker] can send them after the next sync.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NoteScreen(
    localId: String,
    fromNumber: String,
    direction: String,
    durationSec: Int,
    activity: ComponentActivity,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var notes by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Call Notes") },
                navigationIcon = {
                    TextButton(onClick = { activity.finish() }) {
                        Text("Cancel")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp, vertical = 16.dp),
        ) {
            // ── Title ────────────────────────────────────────────────────────
            Text(
                text = "Call with $fromNumber",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
            )

            Spacer(Modifier.height(4.dp))

            // ── Subtitle ─────────────────────────────────────────────────────
            Text(
                text = "$direction · ${durationSec}s",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(Modifier.height(20.dp))

            // ── Notes field ──────────────────────────────────────────────────
            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 160.dp),
                label = { Text("Notes") },
                placeholder = { Text("What was discussed in this call?") },
                minLines = 5,
                maxLines = 10,
                enabled = !isSaving,
            )

            // ── Error message ────────────────────────────────────────────────
            if (errorMessage != null) {
                Spacer(Modifier.height(8.dp))
                Text(
                    text = errorMessage!!,
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 14.sp,
                )
            }

            Spacer(Modifier.weight(1f))

            // ── Save button ──────────────────────────────────────────────────
            Button(
                onClick = {
                    if (notes.isBlank()) {
                        Toast.makeText(context, "Notes cannot be empty", Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    isSaving = true
                    errorMessage = null
                    scope.launch {
                        saveNotes(context, localId, notes) { success ->
                            isSaving = false
                            if (success) {
                                Toast.makeText(context, "Notes saved", Toast.LENGTH_SHORT).show()
                                activity.finish()
                            } else {
                                errorMessage = "Failed to save notes. Please try again."
                            }
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                enabled = !isSaving,
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                } else {
                    Text("Save Notes", fontSize = 16.sp)
                }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

/**
 * Saves notes: tries the PATCH API if the call has already synced, otherwise
 * stores locally for the sync worker to send.
 */
private suspend fun saveNotes(
    context: Context,
    localId: String,
    notesText: String,
    onResult: (Boolean) -> Unit,
) {
    withContext(Dispatchers.IO) {
        try {
            // Check if the call already has a server-side callLogId
            val dao = AppDatabase.get(context).callDao()
            val call = dao.getById(localId)

            val callLogId = call?.remoteCallLogId
            if (callLogId != null) {
                // Already synced → send immediately
                val response = ApiClient.api.updateCallNotes(callLogId, UpdateNotesRequest(notesText))
                if (response.isSuccessful) {
                    withContext(Dispatchers.Main) { onResult(true) }
                    return@withContext
                }
            }

            // Not synced yet (or API call failed) → save locally for the sync worker
            savePendingNote(context, localId, notesText)
            withContext(Dispatchers.Main) { onResult(true) }
        } catch (e: Exception) {
            // Network error → save locally for retry
            savePendingNote(context, localId, notesText)
            withContext(Dispatchers.Main) { onResult(true) }
        }
    }
}
