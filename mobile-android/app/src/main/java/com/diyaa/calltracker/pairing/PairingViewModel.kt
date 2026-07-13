package com.diyaa.calltracker.pairing

import android.app.Application
import android.content.Context
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.diyaa.calltracker.data.ApiClient
import com.diyaa.calltracker.data.PairDeviceRequest
import com.diyaa.calltracker.data.SecureStorage
import com.diyaa.calltracker.monitor.MonitorForegroundService
import com.diyaa.calltracker.sync.SyncScheduler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface PairingState {
    data object Unpaired : PairingState
    data object Pairing : PairingState
    data object Paired : PairingState
    data class Error(val message: String) : PairingState
}

class PairingViewModel(application: Application) : AndroidViewModel(application) {
    private val app: Application = application
    private val storage = SecureStorage(app).also { ApiClient.init(it) }

    private val _state = MutableStateFlow<PairingState>(if (storage.isPaired) PairingState.Paired else PairingState.Unpaired)
    val state: StateFlow<PairingState> = _state

    fun pair(code: String) {
        if (code.isBlank()) {
            _state.value = PairingState.Error("Enter the pairing code shown in the dashboard")
            return
        }
        _state.value = PairingState.Pairing
        viewModelScope.launch {
            try {
                val response = ApiClient.api.pair(PairDeviceRequest(pairingCode = code.trim(), model = Build.MODEL))
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    storage.apiKey = body.apiKey
                    storage.deviceId = body.deviceId
                    SyncScheduler.schedulePeriodicSync(app)
                    MonitorForegroundService.start(app)
                    _state.value = PairingState.Paired
                } else {
                    _state.value = PairingState.Error("Pairing code is invalid or expired")
                }
            } catch (e: Exception) {
                _state.value = PairingState.Error(e.message ?: "Network error")
            }
        }
    }

    fun unpair() {
        storage.clear()
        MonitorForegroundService.stop(app)
        _state.value = PairingState.Unpaired
    }
}
