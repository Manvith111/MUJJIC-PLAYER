---
name: app-development
description: Working on the Expo / React Native app in app/. Use when editing screens, components, the playback engine, zustand stores, the SQLite library, downloads, or theme. Covers the app's conventions, file map, and Expo SDK 57 specifics.
---

# App development (Expo / React Native)

The app is a native Android app: **Expo SDK 57**, **React Native 0.86**, **React 19.2.3**,
**TypeScript ~6.0**, state via **zustand**, persistence via **expo-sqlite** +
**AsyncStorage**, audio via **expo-audio**.

> Always read the versioned Expo docs at https://docs.expo.dev/versions/v57.0.0/ before
> writing app code. Expo SDK 57 changed several APIs vs earlier SDKs.

## File map

```
app/
  App.tsx                 root: hydrate settings, init audio + library, view router
  index.ts                entry (registerRootComponent)
  app.json / eas.json     Expo config, plugins, EAS build profiles
  src/
    api/client.ts         backend calls (configurable base URL); source of truth for Track/Album/Artist types
    audio/player.ts       expo-audio engine + queue/repeat/shuffle/A-B/autoplay (zustand store)
    audio/actions.ts      playList / shufflePlay helpers used by screens
    audio/sleep.ts        sleep timer store
    db/library.ts         SQLite: favorites, pinned, downloads, history, playlists (+ zustand cache)
    downloads/manager.ts  offline downloads + SAF copy to user folder
    store/settings.ts     persisted settings (AsyncStorage, key tm.settings.v1)
    store/ui.ts           navigation + search + home feed state, categories
    store/menu.ts         global "⋮" track menu (bottom sheet)
    components/           18 components (TerminalFrame, VinylPlayer, WaveScrubber, SeekBar, …)
    screens/              Home, Search, Library, Playlist, NowPlaying, Queue, Settings
    theme/terminal.ts     monochrome palette, fonts, box tokens
    utils/format.ts       time formatting
```

## Conventions

- **State:** zustand stores only. Do not add Redux/Context for shared state.
- **Persistence:** SQLite (`db/library.ts`) for library data; AsyncStorage
  (`store/settings.ts`) for settings. Downloads are files in
  `<document>/downloads/<videoId>.m4a` with a DB row; optionally copied to a
  user-picked SAF folder.
- **Platform split:** native vs web behavior lives in `name.ts` / `name.web.ts`
  sibling files. Web uses `react-native-web` and the same components.
- **API types:** `api/client.ts` types must match `server/services/models.py`
  field-for-field. If you change one, change the other.
- **Module docs:** every module starts with a JSDoc `/** … */` comment explaining
  purpose. Keep it.
- **Navigation:** there is no nav library. `store/ui.ts` has a `view` string
  (`home | search | library | playlist | nowplaying | queue | settings`); `App.tsx`
  renders the matching screen. `MiniPlayer` + `BottomNav` sit outside the content.
- **Theme:** monochrome black & white. Silkscreen = display/headings, Space Mono =
  body. `colors.accent` is white. Don't add color accents.

## Playback engine (src/audio/player.ts)

- One global `AudioPlayer` from `expo-audio` (`createAudioPlayer`), reused for all
  tracks; `player.replace({ uri })` swaps sources.
- Playback order is `order` (array of queue indices) + `orderPos`; shuffle rebuilds
  order keeping the current track first.
- Offline first: if `track.localUri` or a matching `downloads` row exists, play the
  local file; otherwise stream `{base}/stream/{videoId}`.
- Lock-screen metadata via `p.setActiveForLockScreen(true, { title, artist,
  albumTitle, artworkUrl })` — best-effort.
- `didJustFinish` triggers A-B loop, repeat-one, or `advance()`; autoplay appends
  radio (`api.recommend`) when the queue drains.
- **Never re-create the player on screen change** — that kills playback.

## SQLite schema (db/library.ts)

Tables: `favorites`, `pinned`, `downloads` (all store the track's metadata columns),
`history` (id, title, artist, thumbnail, playedAt), `playlists` (id, name, createdAt),
`playlist_tracks` (playlistId, trackId, …metadata, position). WAL journal mode.

## Settings keys (store/settings.ts)

`baseUrl`, `autoplay`, `volume` (0–1), `repeat` (`off|all|one`), `shuffle`,
`vinylGesture`, `recentSearches`, `downloadFolderUri`. Persisted to `tm.settings.v1`.
`DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000'`.

## Build / run

- `npx expo start` — Expo Go (no background audio / lock screen).
- `npx expo run:android` — dev build (full features).
- `./build-apk.ps1` (repo root) — EAS cloud APK.
- The repo's `app/AGENTS.md` and `app/CLAUDE.md` repeat the Expo 57 warning — honor it.
