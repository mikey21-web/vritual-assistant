# Call Tracker (Android)

Companion app for the backend's `call-tracking` module (`backend/src/call-tracking/`). Logs SIM
and (best-effort, metadata-only) WhatsApp calls and syncs them to the CRM so they attach to the
right lead, the same way the dashboard's **Calls** page displays them.

## Setup

1. Open this `mobile-android/` folder directly in Android Studio (Hedgehog+) — it will offer to
   generate the Gradle wrapper jar on first sync since only `gradle-wrapper.properties` is
   checked in.
2. Point the app at your backend: either edit the default in `app/build.gradle.kts`
   (`API_BASE_URL`) or pass `-PapiBaseUrl=https://your-host` on the Gradle command line /
   Android Studio's Gradle args. The emulator default (`http://10.0.2.2:3001`) reaches a backend
   running on your host machine's `localhost:3001`.
3. Build & run on a **physical device** — emulators can't place real phone calls, so metadata
   capture and recording can't be exercised there.
4. In the dashboard, open **Calls → Pair a device** to get a 6-digit code, then enter it in the
   app and grant the requested permissions (call log, phone state, microphone, notifications).
5. Place a test call. Within a few seconds it should show up in the dashboard's Calls page.

## What actually works, and what's best-effort

- **Call metadata (number, direction, duration, timestamp) for SIM calls** — reliable, this is
  the core feature and works via the standard `CallLog` content provider.
- **SIM call audio recording** — best-effort only. Android has progressively locked this down;
  it only has a chance of working if the app holds the call-screening role *and* the device
  accepts `MediaRecorder.AudioSource.VOICE_CALL` (many OEMs — Samsung, several Xiaomi builds —
  block it outright regardless of permissions). `capture/CapabilityChecker.kt` probes this at
  runtime and the pairing screen tells the user plainly whether it's supported on their device.
- **WhatsApp calls** — detection only, via `NotificationListenerService` watching for WhatsApp's
  call notification. There is no legitimate way to capture WhatsApp call audio (it's end-to-end
  encrypted VoIP), and the notification only exposes a contact *name*, not a phone number, so
  attribution to a lead is weaker than SIM calls. Treat this as experimental.

## Structure

- `data/` — Retrofit API client, DTOs mirroring `backend/src/call-tracking/dto/call-tracking.dto.ts`,
  encrypted device-key storage, Room queue (`data/local/`)
- `pairing/` — the app's only screen: enter pairing code, grant permissions, see paired status
- `capture/` — `CallStateReceiver` (SIM call state), `CallLogReader`, `CapabilityChecker`,
  `CallRecordingService` (best-effort), `WhatsAppCallListenerService` (best-effort)
- `sync/` — `CallSyncWorker` (WorkManager) batches queued calls to `POST /call-tracking/sync`
  and uploads any local recordings afterward; `SyncScheduler` sets up the periodic run
- `monitor/` — persistent foreground-service notification required to keep background capture
  reliable on modern Android
