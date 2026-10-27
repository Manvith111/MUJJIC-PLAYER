---
name: local-dev
description: Running, verifying, and building Terminal Music on this Windows machine. Use when starting the backend or app, checking connectivity, rebuilding the APK, or debugging local setup. Covers start.ps1, run-backend.ps1, build-apk.ps1, allow-firewall.ps1 and the LAN IP flow.
---

# Local development (Windows)

Everything runs from PowerShell. The whole flow is: backend on the PC's LAN IP →
app (Expo) connects to it → phone on the same Wi-Fi streams through the backend.

## One-shot launcher

```
./start.ps1              # everything: venv setup, backend window, Expo QR
./start.ps1 -Ip 192.168.1.2   # override auto-detected LAN IP
```

`start.ps1`:
1. Creates `.venv` + `pip install -r server/requirements.txt` if missing; runs
   `npm install` in `app/` if missing.
2. Picks the best LAN IPv4 (prefers Wi-Fi, then 192.168/10 private ranges).
3. Starts `run-backend.ps1` in its own `-NoExit` window.
4. Sets `EXPO_PUBLIC_API_URL=http://<ip>:8000` and runs `npx expo start`.

## Backend only

```
./run-backend.ps1            # uvicorn on 0.0.0.0:8000
./run-backend.ps1 -Port 8001
```

## Verify connectivity

- Open `http://<PC-IP>:8000/health` in the phone's browser — expect
  `{"status":"ok","service":"terminal-music"}`.
- In the app: ⚙ Settings → set Backend URL (e.g. `http://192.168.1.2:8000`) →
  **test connection**.
- Android emulator alias: `http://10.0.2.2:8000`.

## Firewall

`./allow-firewall.ps1` adds a Windows Firewall rule for the backend port so the phone
can reach the PC. Run if the app can't connect on a fresh machine.

## APK build (EAS cloud — no Android Studio needed)

```
./build-apk.ps1
```

Logs into a free Expo account, then `eas build --platform android --profile preview`
(an **APK**, distribution internal). The baked default backend URL lives in
`app/eas.json` (`EXPO_PUBLIC_API_URL`), currently `http://192.168.1.2:8000`. The APK
enables cleartext HTTP (`expo-build-properties`) so it can reach the LAN backend.

## Dev builds (background audio on emulator/device)

```
cd app
npx expo run:android      # full features incl. background + lock screen audio
npx expo start            # Expo Go: basic playback only
```

## Prereqs

- **Python 3.10+** and **ffmpeg** on PATH (needed for downloads).
- **Node 20.19.4+** — RN 0.86 requires it; the README notes 20.19.0 is too old for a
  native build. Check `node --version` before `npx expo run:android`.
- Phone and PC on the **same Wi-Fi**.

## Fast path to check an agent's change

1. `./run-backend.ps1`
2. `curl http://127.0.0.1:8000/health` (or `Invoke-RestMethod`).
3. For app TS changes: `cd app; npx tsc --noEmit`.
4. For server changes: activate `.venv` and run the endpoint directly.
