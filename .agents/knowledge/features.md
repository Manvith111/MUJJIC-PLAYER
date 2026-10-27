# Features

Everything Terminal Music ("MUJJIC PLAYER") does today. Grouped by area.

## Backend endpoints

| Route | Purpose |
| --- | --- |
| `GET /search?q=&type=songs\|albums\|artists\|playlists&limit=` | YT Music search, filtered per category |
| `GET /stream/{video_id}` | proxied, Range-seekable audio stream (m4a/webm/mp3 mime) |
| `GET /download/{video_id}` | yt-dlp + ffmpeg → m4a file (for offline) |
| `GET /recommend/{video_id}?limit=` | radio/related tracks (autoplay + recommendations) |
| `GET /lyrics/{video_id}` | lyrics `{ original, english, translated, source }` (auto-translated to English) |
| `GET /synced/{video_id}` | time-synced LRC `{ synced, plain }` from lrclib.net |
| `GET /artwork/{video_id}` | album-art thumbnail proxy (maxres→default fallback) |
| `GET /health` | health check |

## Search & discovery

- Search songs / albums / artists / playlists with category tabs and per-category caching.
- Recent searches (last 12, deduped) shown when the query is empty.
- Home feed sections: **Pinned** (speed dial), **Most Listened**, **Quick Plays**
  (history), **Recommended for you** (seeded from what you play, deduped against
  trending/downloads/most-listened), **Trending** ("trending songs 2026"), **Explore**
  (random genre each visit: indie, jazz, electronic, rock, hip hop, classical, r&b,
  lofi, soul, reggae, metal, k-pop).
- Category pills: Trending, Classic, 90s, New, Instrumental, Lo-fi, Party.
- Related tracks panel on Now Playing (radio of current song).

## Playback

- Stream from the backend; **offline downloads take priority** when available.
- Play / pause, next / previous (restart if >3s in, else go back), seek ±10s, tap-to-seek.
- **Shuffle** (keeps current track first), **repeat** off/all/one.
- **A–B loop** (tap to set A, then B, third tap clears).
- **Volume** slider + mute (Settings and player).
- **Queue**: view, jump-to-track, reorder Up Next, remove Up Next / queue items,
  play-next, add-to-queue, drag-reorder, "load more" radio at the end.
- **Autoplay**: when the queue drains, appends radio for the last track (toggleable).
- **Sleep timer**: pause after N minutes, live countdown.
- **Background + lock-screen playback and controls** (expo-audio; needs dev build / APK).
- **Vinyl player**: swipe to change track, spin to scrub (toggleable gesture,
  90 s per turn), spinning with playback.

## Now Playing screen

- Vinyl with artwork (high-res via `/artwork`), title/artist, like button.
- Wave-scrubber (deterministic per track) + time readout.
- Transport controls (shuffle/prev/play/next/repeat).
- Bottom sheet panels: **UP NEXT**, **LYRICS** (plain + synced), **RELATED**.

## Library & persistence (SQLite)

- **Favorites** (♥), **Pinned** (speed-dial), **Play history** (last 100, grouped),
  **Most listened** (top 20 by play count).
- **User playlists**: create, add tracks (search "add-to-playlist" flow), view, delete,
  rename, reorder, covers collage.
- **Downloads / offline**: download track (m4a) for offline playback; file also copied
  to a user-picked folder via SAF so other apps can see it; delete download; offline
  tracks play from local file automatically.
- Settings persisted across restarts (AsyncStorage).

## UI / theme

- Full terminal aesthetic: monochrome black & white, Silkscreen + Space Mono fonts,
  box-drawing accents, `<`/`>` style prompts.
- Screens: Home, Search, Library, Playlist, Now Playing, Queue, Settings.
- Persistent **MiniPlayer** bar + **BottomNav** (Home / Search / Library / Now Playing).
- **Help overlay**, global "⋮" track menu (play, play next, add to queue, add to
  playlist, favorite, pin, download, remove download, sleep timer on Now Playing).
- Album-art rows, collages, deterministic placeholder tints per track id.

## Settings

- **Backend URL** (runtime-configurable) + **test connection**.
- Volume / mute, vinyl gesture toggle, download folder picker, autoplay, repeat,
  shuffle (the last three are player-persisted preferences).

## Deployment / dev ergonomics

- `start.ps1` one-shot launcher: auto venv + npm install, LAN IP detection, backend
  window, Expo with injected `EXPO_PUBLIC_API_URL`.
- `build-apk.ps1`: EAS cloud APK build (no Android Studio).
- `allow-firewall.ps1`: Windows Firewall rule for the backend port.
- Web support via react-native-web (`.web.ts` platform splits).
