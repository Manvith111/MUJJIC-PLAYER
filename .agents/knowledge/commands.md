# Commands

All paths relative to the repo root (`D:\PROJECTS\terminal music`). PowerShell.

## One-shot / daily

| Command | What it does |
| --- | --- |
| `./start.ps1` | Everything: venv+npm setup, backend in own window, Expo with injected URL |
| `./start.ps1 -Ip 192.168.1.2` | As above, force a specific LAN IP |
| `./run-backend.ps1` | Just the backend (`uvicorn server.main:app --host 0.0.0.0 --port 8000`) |
| `./run-backend.ps1 -Port 8001` | Backend on another port |
| `./build-apk.ps1` | EAS cloud APK build (login + `eas build --platform android --profile preview`) |
| `./allow-firewall.ps1` | Add Windows Firewall rule for the backend port |

`start.bat` is the double-clickable wrapper for `start.ps1`.

## Backend (manual)

```
.venv\Scripts\activate
pip install -r server/requirements.txt
uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload
```

Sanity checks:

```
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod "http://127.0.0.1:8000/search?q=test&type=songs"
```

## App (in `app/`)

| Command | Purpose |
| --- | --- |
| `npm install` | Install deps |
| `npx expo start` | Expo Go dev server (no background audio) |
| `npx expo run:android` | Dev build on emulator/device (full features) |
| `npx expo start --web` | Web (react-native-web) |
| `npx tsc --noEmit` | Typecheck (no test/lint script is configured) |
| `npx expo-doctor` | Validate Expo project health |

## APK / EAS (in `app/`)

```
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview   # APK
npx eas-cli@latest build --platform android                     # production app-bundle
```

## Notes

- No lint/test scripts exist yet (`package.json` has no `lint`/`test`; no pytest).
  Use `npx tsc --noEmit` and a manual smoke test until `knowledge/plans.md` gaps close.
- The backend is launched from `.venv\Scripts\uvicorn.exe` by the scripts; the project
  path contains a space, so scripts use `-File` rather than `-Command`.
