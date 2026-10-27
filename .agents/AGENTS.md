# Terminal Music — Agent Hub

This directory is the agent knowledge base for **Terminal Music** ("MUJJIC PLAYER"),
a terminal-styled music player: a native Android app (Expo / React Native) backed by a
Python server that searches, streams, downloads, and recommends music from YouTube /
YT Music.

Read this file first, then pull in whatever is relevant to your task.

## Layout

```
.agents/
  AGENTS.md            ← this file: overview + rules
  skills/              ← how-to conventions, loaded per task
    app-development/SKILL.md    app-side work (Expo RN)
    server-development/SKILL.md backend work (FastAPI)
    local-dev/SKILL.md          running/testing on this Windows machine
  knowledge/           ← project facts
    tech-stack.md          versions + key libraries
    features.md            everything the product does today
    plans.md               current build plan + design decisions
    new-features.md        backlog of features to add
    architecture.md        module map + data flow
    commands.md            every dev/run script + command
    gotchas.md             known traps and doc inconsistencies
  roadmap/             ← where things are going
    ROADMAP.md             phased roadmap (next → future)
```

## Rules for working on this project

1. **Expo SDK 57 has changed.** Before writing any app code, read the versioned docs at
   `https://docs.expo.dev/versions/v57.0.0/`. Do not rely on older SDK habits.
2. **Two languages, two halves.** `app/` = TypeScript (Expo / React Native), `server/` =
   Python 3.10+ (FastAPI). Never mix concerns across the API boundary — the app only
   speaks to the server via the endpoints in `knowledge/features.md`.
3. **The API contract is the source of truth for shapes.** The app types in
   `app/src/api/client.ts` must match the server models in `server/services/models.py`.
   Change both together and keep field names identical.
4. **Follow existing conventions.** App modules start with a JSDoc block comment
   explaining purpose; server modules use docstrings. Keep that style. Config stays
   overridable via `TM_*` env vars (server) or the app's Settings screen.
5. **Platform-split files.** When native vs web behavior differs, the app uses
   `.ts` / `.web.ts` sibling files (see `library.ts` / `library.web.ts`,
   `manager.ts` / `manager.web.ts`). Web is supported via react-native-web.
6. **State lives in zustand.** App state: `src/store/` (settings, ui, menu) and
   `src/audio/player.ts` (playback/queue). SQLite persists library data
   (`src/db/library.ts`). Don't introduce a new state library.
7. **Playback is expo-audio**, not react-native-track-player. One `AudioPlayer`
   instance reused app-wide; queue/repeat/shuffle/A–B/autoplay are JS logic on top.
8. **No test suite exists yet** (see `knowledge/plans.md`). Before making sweeping
   changes, run a typecheck/lint to catch regressions — commands in `knowledge/commands.md`.
9. **Update docs when you change the product.** If you add a feature, update
   `knowledge/features.md`, and add it to `knowledge/new-features.md` only if it's a
   future idea, and to `roadmap/ROADMAP.md` if it affects phases.

## Quick reference

| Thing | Where |
| --- | --- |
| App entry | `app/App.tsx` |
| API client | `app/src/api/client.ts` |
| Playback engine | `app/src/audio/player.ts` |
| SQLite library | `app/src/db/library.ts` |
| Downloads (offline) | `app/src/downloads/manager.ts` |
| Screens | `app/src/screens/` (7 screens) |
| Theme (monochrome terminal) | `app/src/theme/terminal.ts` |
| Server entry | `server/main.py` |
| Routes | `server/routes/` (search, stream, download, recommend, lyrics, artwork) |
| Upstream wrappers | `server/services/` (ytmusic.py, ytdlp.py, models.py) |
| Server config | `server/config.py` (`TM_*` env vars) |
| Launcher | `start.ps1` / `start.bat`, `run-backend.ps1`, `build-apk.ps1` |

## Repository layout

```
terminal music/
  server/       Python FastAPI backend (yt-dlp + ytmusicapi)
  app/          Expo React Native Android app (terminal UI)
  data/         downloaded audio + caches (created at runtime)
  *.ps1         dev/run/build launchers
```
