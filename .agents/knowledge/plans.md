# Plans

Where the project stands and how it got here. Detailed feature-plan files should live in
this folder (e.g. `plan-*.md`) so they sit next to this index; add a link below when you
write one.

## Current state (done)

- **Backend**: search, streaming (Range proxy), downloads (m4a + tags + thumbnail),
  radio, lyrics (+ English translation), synced lyrics (lrclib), artwork proxy, health.
  Fully env-configurable; nothing host-specific so it can move to a user's server.
- **App**: full terminal UI, all playback features (queue/shuffle/repeat/A–B/autoplay/
  sleep), SQLite library (favorites, pinned, history, most-listened, playlists),
  offline downloads (with SAF copy), lyrics view, settings, APK build.
- **Dev flow**: `start.ps1` one-shot launcher, `build-apk.ps1` EAS cloud builds,
  firewall script, web support.

## Design decisions (keep these in mind)

1. **One API contract** (`app/src/api/client.ts` ↔ `server/services/models.py`). All
   upstream (ytmusicapi/yt-dlp) shape handling is isolated in `server/services/`.
2. **Server proxies everything** (stream, artwork) so the app only ever talks to one
   stable host — works on LAN now, your server later, zero app changes.
3. **expo-audio over react-native-track-player**: first-party, free, background + lock
   screen via config plugin; needs dev build/APK (not Expo Go).
4. **Offline-first playback**: downloads play from disk automatically when present.
5. **Downloads write two copies**: app sandbox (guaranteed playback) + user SAF folder
   (visible to file managers / other apps).
6. **zustand everywhere** for app state; SQLite + AsyncStorage for persistence.
7. **Monochrome terminal theme** is deliberate (MUSIC2D-inspired) — no color accents.

## Known gaps / tech debt

- **No automated tests** (no pytest, no jest). Risk area: `audio/player.ts` queue logic
  (order/shuffle/autoplay), `services/ytmusic.py` mappers, `library.ts` SQL.
- `server/main.py` `GET /` endpoint list omits `/lyrics` and `/synced` (stale).
- README inconsistency: root `README.md` says playback uses `react-native-track-player`;
  it actually uses `expo-audio` (see `app/README.md`). Fix the root README.
- `start.ps1` uses `EXPO_PUBLIC_API_URL` injection; `app/eas.json` bakes a hardcoded IP
  (`http://192.168.1.2:8000`) for APK preview builds.
- No rate limiting / auth / caching on the server (fine for LAN, matters when public).
- History stores one row per play (grows); only read side dedupes.

## Plan-file conventions

- One file per plan: `plan-<feature>.md`.
- Each plan: goal, scope, files touched, API changes (server model + client type), edge
  cases, verification steps.
- Link every plan here so agents can find them.
