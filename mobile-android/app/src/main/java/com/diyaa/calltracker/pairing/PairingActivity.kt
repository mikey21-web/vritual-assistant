package com.diyaa.calltracker.pairing

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.diyaa.calltracker.capture.CapabilityChecker
import com.diyaa.calltracker.settings.SettingsActivity

private val REQUIRED_PERMISSIONS = buildList {
    add(Manifest.permission.READ_CALL_LOG)
    add(Manifest.permission.READ_PHONE_STATE)
    add(Manifest.permission.RECORD_AUDIO)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) add(Manifest.permission.POST_NOTIFICATIONS)
}

class PairingActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                PairingScreen()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PairingScreen(viewModel: PairingViewModel = viewModel()) {
    val state by viewModel.state.collectAsState()
    var grantedPermissions by remember { mutableStateOf(false) }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
        grantedPermissions = results.values.all { it }
    }
    val context = androidx.compose.ui.platform.LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Call Tracker") },
                actions = {
                    TextButton(onClick = {
                        context.startActivity(Intent(context, SettingsActivity::class.java))
                    }) {
                        Text("\u2699", fontSize = 22.sp)
                    }
                },
            )
        },
    ) { padding ->
        Surface(modifier = Modifier.fillMaxSize().padding(padding)) {
            Column(
                modifier = Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                when (val s = state) {
                    is PairingState.Paired -> PairedContent(
                        onUnpair = { viewModel.unpair() },
                    )
                    else -> UnpairedContent(
                        state = s,
                        onRequestPermissions = { permissionLauncher.launch(REQUIRED_PERMISSIONS.toTypedArray()) },
                        onPair = { code -> viewModel.pair(code) },
                    )
                }
            }
        }
    }
}

@Composable
private fun UnpairedContent(state: PairingState, onRequestPermissions: () -> Unit, onPair: (String) -> Unit) {
    var code by remember { mutableStateOf("") }

    Text("Enter the pairing code shown in the dashboard's \"Pair a device\" screen.", textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    Spacer(Modifier.height(16.dp))

    OutlinedTextField(
        value = code,
        onValueChange = { code = it.filter(Char::isDigit).take(6) },
        label = { Text("6-digit code") },
        singleLine = true,
    )
    Spacer(Modifier.height(12.dp))

    Button(onClick = onRequestPermissions) { Text("Grant permissions") }
    Spacer(Modifier.height(8.dp))

    Button(onClick = { onPair(code) }, enabled = state !is PairingState.Pairing) {
        Text(if (state is PairingState.Pairing) "Pairing..." else "Pair device")
    }

    if (state is PairingState.Error) {
        Spacer(Modifier.height(12.dp))
        Text(state.message, color = MaterialTheme.colorScheme.error)
    }
}

@Composable
private fun PairedContent(onUnpair: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val capability = remember { CapabilityChecker.checkSimRecording(context) }

    Text("This device is paired and watching for calls.")
    Spacer(Modifier.height(12.dp))
    Text(
        if (capability.isSupported) "Call recording: supported on this device."
        else "Call recording: not supported on this device — metadata will still sync normally.",
        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
    )
    Spacer(Modifier.height(20.dp))
    OutlinedButton(onClick = onUnpair) { Text("Unpair device") }
}
