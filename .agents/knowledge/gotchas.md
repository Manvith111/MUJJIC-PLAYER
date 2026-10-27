# Gotchas & Known Traps

Things that will bite you if you don't know them. Check here before "fixing" something
that looks wrong.

## Expo SDK 57

- **APIs changed vs older SDKs.** `app/AGENTS.md` exists precisely because of this.
  Read `https://docs.expo.dev/versions/v57.0.0/` before writing app code.
- **expo-audio is the audio API** — not `expo-av`, not `react-native-track-player`.
  Old examples for `expo-av` do not apply.
- **expo-file-system is the new File/Directory API** (`expo-file-system`); SAF lives in
  `expo-file-system/legacy` (`StorageAccessFramework`). `downloads/manager.ts` shows the
  split: `File.downloadFileAsync` (new) + `SAF` (legacy).
- **Config plugins only apply in dev builds / APK** — never in Expo Go. Background audio
  and lock-screen controls therefore don't work in Expo Go by design.

## Node / native build

- **Node 20.19.4+ required** for RN 0.86 native builds. README notes 20.19.0 is too old.
  `npx expo run:android` will fail with an old Node.
- `predictiveBackGestureEnabled: false` is set in `app.json` — don't re-enable unless
  you verify gesture handling.

## Docs that lie (currently)

- **Root `README.md` says playback uses `react-native-track-player`.** It actually uses
  **expo-audio** (correct in `app/README.md`). Fix the root README when convenient.
- **`server/main.py` `GET /` endpoint list is stale** — it omits `/lyrics` and
  `/synced` (both exist and are wired in `main.py` routers).
- `start.ps1`/README describe the app as needing Expo Go; the default URL baked into
  `eas.json` is `http://192.168.1.2:8000` (works only on that specific LAN setup).

## Networking / LAN

- Phone must be on the **same Wi-Fi** as the PC; backend must bind `0.0.0.0`.
- Windows Firewall may block the phone — run `./allow-firewall.ps1`.
- Emulator alias is `http://10.0.2.2:8000`; physical phone needs the PC's LAN IP.
- Android cleartext HTTP is enabled via `expo-build-properties`
  (`usesCleartextTraffic: true`) — needed for LAN backend. Don't remove it for the APK.

## Server

- **yt-dlp / ytmusicapi shapes change frequently.** All normalization is in
  `services/ytmusic.py` / `services/ytdlp.py` — if output breaks, fix it there, not in
  routes or the app.
- **ffmpeg is required** for `/download` (FFmpegExtractAudio, FFmpegMetadata,
  EmbedThumbnail). Not needed for streaming.
- Stream URLs expire; `ytdlp._url_cache` respects `TM_STREAM_URL_TTL` (default 1800 s).
  Don't lower it aggressively or range seeks will re-trigger extraction.
- `ytmusic.radio` excludes the seed `video_id` itself.
- Lyrics translation is best-effort via a keyless Google endpoint; never rely on it.
- CORS is `*` — fine on LAN, tighten before public hosting.
- `requirements.txt` pins `yt-dlp>=2026.7.4` — older pinned versions go stale fast.

## App state

- **Never recreate the `AudioPlayer` on screen change** — playback dies. It's module-level.
- A-B loop check runs in `onStatus` before anything else; seek-to-B triggers the bounce.
- `advance` is guarded by `advancing` to avoid double-fire on `didJustFinish`.
- Downloads write **two copies** (app sandbox + SAF folder). Losing SAF permission means
  only the sandbox copy remains; `manager.ts` clears `downloadFolderUri` so it re-asks.
- History grows one row per play (no dedup on write). Keep that in mind for storage.
- Web builds use `.web.ts` platform files — any new native-only module must have a web
  sibling or the web bundle breaks.
