# Terminal Music — Backend (server bundle)

This is the Python backend for the **MUJJIC PLAYER** Android app. It searches,
streams, downloads, and recommends music via YouTube / YT Music. Copy this whole
folder to your server PC and run it there.

## 1. Requirements (install once on the server PC)

- **Python 3.11 or newer** — https://www.python.org/downloads/
  During install, tick **"Add python.exe to PATH"**.
- **ffmpeg** — needed to produce downloadable `.m4a` files.
  Easiest: open PowerShell and run `winget install Gyan.FFmpeg`, then reopen the window.
  (Streaming works without ffmpeg; **downloads do not**.)

## 2. Run it

**Option A — double-click:** `run-backend.bat`

**Option B — PowerShell:** right-click `run-backend.ps1` → *Run with PowerShell*
(or `./run-backend.ps1 -Port 8000`).

The **first** run creates a local `.venv`, installs dependencies (takes a minute),
then starts the server. Later runs start immediately. Leave the window open while
you use the app; press **Ctrl+C** to stop.

When it starts it prints the exact address to use, e.g.:

```
In the MUJJIC PLAYER app -> Settings -> Backend URL, set:
    http://192.168.1.50:8000
```

## 3. Point the app at this PC

In the app: **Settings → Backend URL →** enter `http://<this-pc-ip>:8000` and save.
If the server PC's IP changes (DHCP), just update this value again. A DHCP
reservation / static IP avoids that.

## 4. If the phone can't reach the server

Other devices on the Wi-Fi must be allowed through Windows Firewall. Run once,
elevated (right-click → Run as administrator):

```
powershell -ExecutionPolicy Bypass -File .\allow-firewall.ps1
```

Make sure the phone and the server PC are on the **same network**.

## 5. Configuration (optional env vars)

All overridable with `TM_*` environment variables (set before launching):

| Variable | Default | Meaning |
| --- | --- | --- |
| `TM_PORT` | `8000` | Port to serve on (or pass `-Port` to the script). |
| `TM_HOST` | `0.0.0.0` | Bind address (0.0.0.0 = reachable on the LAN). |
| `TM_DATA_DIR` | `./data` | Where downloaded audio + caches are stored. |
| `TM_DOWNLOAD_FORMAT` | `m4a` | Audio format for downloads. |
| `TM_CORS_ORIGINS` | `*` | Tighten when exposing beyond your LAN. |
| `TM_YOUTUBE_API_KEY` | (built-in) | Your own YouTube Data API key (public-playlist fetch). |

## 6. Downloads failing for some songs?

YouTube changes often. If certain tracks fail to download/stream, update yt-dlp:

```
.\.venv\Scripts\python -m pip install -U yt-dlp
```

Newer yt-dlp may also warn about needing a JavaScript runtime for some videos —
installing **Deno** (`winget install DenoLand.Deno`) resolves those cases.

## 7. Keep it running after reboot (optional)

Simplest: add a shortcut to `run-backend.bat` to your Startup folder
(`shell:startup`). For a true background service, use NSSM or Task Scheduler
pointed at `.venv\Scripts\uvicorn.exe server.main:app --host 0.0.0.0 --port 8000`
with this folder as the working directory.

## Health check

Open `http://localhost:8000/health` in a browser on the server PC — you should
see a small JSON status with the yt-dlp / fastapi versions.
