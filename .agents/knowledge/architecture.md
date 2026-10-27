# Architecture

## High-level flow

```
[Phone: Expo RN app] ──HTTP──▶ [Python backend] ──▶ YouTube / YT Music (ytmusicapi, yt-dlp)
       │  ▲                             │
       │  │ play/queue/state            │ stream proxying, downloads, artwork, lyrics
       │  │ (zustand + expo-audio)      ▼
       └──┴────────── offline: SQLite + <document>/downloads/<id>.m4a (+ SAF copy)
```

The phone only talks to the backend — it never touches googlevideo URLs directly. That's
what makes "point the app at your own server later" work with zero code changes.

## Backend

```
server/main.py ──▶ routes/  (thin HTTP: validation + errors only)
                      │
                      ▼
                 services/  (all upstream logic + normalization)
                 ytmusic.py   ytmusicapi: search, radio, lyrics, album_tracks
                 ytdlp.py     yt-dlp: stream URL resolution (TTL cache), downloads
                 models.py    pydantic response shapes ← the contract
```

- `config.py` reads `TM_*` env vars at import and mkdirs `data/downloads` + `data/cache`.
- `stream.py` is a Range-aware proxy: forwards `Range`, strips hop-by-hop headers,
  relays `content-range`/`content-length`, streams 64 KB chunks.
- Blocking yt-dlp/ffmpeg work is off-loaded with `anyio.to_thread.run_sync`.

## App

```
App.tsx ──boot──▶ store/settings.hydrate() → audio/initAudio() → db/initLibrary()
   │
   └─▶ view router (store/ui.ts `view`) renders one of 7 screens
        screens ──▶ components ──▶ theme/terminal.ts (monochrome tokens)
        screens ──▶ audio/actions (playList/shufflePlay)
        screens ──▶ db/library (SQLite + zustand cache)
        api/client.ts ──▶ backend (configurable base URL)
```

- **Playback** (`audio/player.ts`): one global `AudioPlayer` (expo-audio). Queue =
  `queue[]` + `order[]` (indices) + `orderPos`. Shuffle rebuilds `order` around the
  current track. `onStatus` handles position/end; A-B loop wins over everything.
  Autoplay appends radio at queue drain. Lock-screen metadata is best-effort.
- **Persistence**: SQLite `terminalmusic.db` (tables: favorites, pinned, downloads,
  history, playlists, playlist_tracks) for library; AsyncStorage `tm.settings.v1` for
  settings. Downloads = files + DB row; optional SAF copy to a user folder.
- **Platform splits**: `library.ts/.web.ts`, `manager.ts/.web.ts` — native uses SQLite /
  SAF, web uses a store-backed/in-memory equivalent.
- **State stores**: `settings` (persisted prefs), `ui` (view/tab/search/home feed),
  `menu` (open ⋮ track), `player` (playback/queue), `sleep`, `library`, `downloads`.

## Data contract (keep in sync)

| Server model (`services/models.py`) | Client type (`api/client.ts`) |
| --- | --- |
| `Track` | `Track` (client adds `localUri?`) |
| `Album` | `Album` |
| `Artist` | `Artist` |
| `PlaylistItem` | `PlaylistItem` |
| `SearchResponse` | `SearchResponse` |

Field names must match exactly (id, title, artist, album, duration, durationText,
thumbnail, type). When you change one side, change the other in the same change set.

## Data locations

- Server downloads/cache: `data/downloads/`, `data/cache/` (configurable `TM_DATA_DIR`).
- App offline files: `<document>/downloads/<videoId>.m4a`.
- App DB: `terminalmusic.db` (WAL).
- Stream URL cache: in-memory dict in `ytdlp.py`, TTL `TM_STREAM_URL_TTL` (default 1800 s).
