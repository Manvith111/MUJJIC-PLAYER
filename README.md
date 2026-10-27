# Terminal Music

A terminal-styled music player: a **native Android app** (Expo / React Native) backed by a
small **Python** server that searches, streams, downloads, and recommends music from
YouTube / YT Music.

```
terminal music/
  server/   Python FastAPI backend (yt-dlp + ytmusicapi)
  app/      Expo React Native Android app (terminal UI)
  data/     downloaded audio + caches (created at runtime)
```

## Install on your phone as a real app (APK)

Expo Go for SDK 57 isn't on the Play Store yet, so the way to run this on a phone is to
build a standalone **APK** (this also unlocks background + lock-screen audio, which Expo Go
can't do). The build runs in Expo's cloud — no Android Studio needed.

```powershell
./build-apk.ps1
```

It logs you in to a **free Expo account** (one prompt), then builds in the cloud (~10–20
min) and gives you a **link/QR to install the APK** on your phone. On the phone you'll need
to allow "install from unknown sources" once.

After installing:

1. Start the backend on this PC (leave the window open):
   ```powershell
   ./run-backend.ps1
   ```
2. Open the app. It defaults to `http://192.168.1.2:8000`. If your PC's IP differs, set it in
   **⚙ Settings → Backend URL** and tap **test connection**. Phone must share the PC's Wi-Fi.

The APK build has cleartext HTTP enabled (`expo-build-properties`) so it can reach the LAN
backend; the baked default URL lives in `app/eas.json` (`EXPO_PUBLIC_API_URL`).

## Quick start (one command)

From the project root in PowerShell:

```powershell
./start.ps1
```

(or double-click **start.bat**). It auto-installs anything missing, starts the backend on
your PC's LAN IP, injects that URL into the app, and launches Expo with a QR code. Scan the
QR with **Expo Go** on your phone (same Wi-Fi) to try it. It prints the exact link, e.g.
`http://192.168.1.2:8000` — open `http://<that-ip>:8000/health` in your phone's browser to
confirm the phone can reach the backend.

> Expo Go plays audio but **not** in the background / lock screen (that needs a dev build:
> `cd app; npx expo run:android`). Everything else works in Expo Go.

## Backend (run this first)

Requires Python 3.10+ and **ffmpeg** on PATH.

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r server/requirements.txt
uvicorn server.main:app --host 0.0.0.0 --port 8000
```

Endpoints:

| Route | Purpose |
| --- | --- |
| `GET /search?q=&type=songs\|albums\|artists\|playlists` | search YT Music |
| `GET /stream/{videoId}` | proxied, range-seekable audio stream |
| `GET /download/{videoId}` | download audio as m4a (for offline) |
| `GET /recommend/{videoId}` | related / radio tracks (autoplay) |
| `GET /artwork/{videoId}` | album-art thumbnail |
| `GET /health` | health check |

Config via env vars: `TM_HOST`, `TM_PORT`, `TM_DATA_DIR`, `TM_CORS_ORIGINS`,
`TM_STREAM_URL_TTL`, `TM_DOWNLOAD_FORMAT`.

### Moving to your own server later

Nothing in the code is host-specific. Run the same commands on your server and point the
app's API base URL at it (in-app Settings, or `app/.env`). No code changes needed.

## App

See [app/README.md](app/README.md). Needs an Expo **dev build** (not Expo Go) because it
uses `react-native-track-player`.
