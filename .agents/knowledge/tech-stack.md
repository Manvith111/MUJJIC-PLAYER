# Tech Stack

## Overview

Two halves, one API contract. The Python backend does all the YouTube work; the app is a
thin terminal-styled client that streams through the backend.

## Backend (`server/`)

| Layer | Choice | Version / note |
| --- | --- | --- |
| Language | Python | 3.10+ |
| Framework | FastAPI | 0.115.6 |
| ASGI server | uvicorn | 0.34.0 (`uvicorn[standard]`) |
| YT Music API | ytmusicapi | ≥1.12.1 (search, radio, lyrics) |
| Video/audio extractor | yt-dlp | ≥2026.7.4 (stream URLs, downloads) |
| HTTP client | httpx | 0.28.1 |
| Audio tagging | mutagen | 1.47.0 |
| Validation | pydantic | 2.10.5 |
| Async blocking-offload | anyio | via `to_thread.run_sync` |
| System deps | ffmpeg | required on PATH (downloads + thumbnail embed) |
| Data dirs | files | `data/downloads/`, `data/cache/` (auto-created) |
| Config | env vars | `TM_HOST`, `TM_PORT`, `TM_DATA_DIR`, `TM_CORS_ORIGINS`, `TM_STREAM_URL_TTL`, `TM_DOWNLOAD_FORMAT` |

## App (`app/`)

| Layer | Choice | Version / note |
| --- | --- | --- |
| Framework | Expo | SDK 57 (`expo ~57.0.10`) |
| UI | React Native | 0.86.2 |
| Language | TypeScript | ~6.0.3 (React 19.2.3) |
| Audio | expo-audio | ~57.0.3 (background + lock-screen; config plugin) |
| Local DB | expo-sqlite | ~57.0.1 (WAL mode) |
| Files | expo-file-system | ~57.0.1 (File API + `legacy` SAF) |
| Settings store | AsyncStorage | 2.2.0 (`@react-native-async-storage/async-storage`) |
| State | zustand | ^5.0.14 |
| Icons | @expo/vector-icons | ^15.0.2 (Ionicons, MaterialIcons) |
| SVG | react-native-svg | 15.15.4 (vinyl, wave, collage) |
| Web | react-native-web | ^0.21.2 (+ `@expo/metro-runtime`) |
| Fonts | @expo-google-fonts/silkscreen, space-mono | Silkscreen (display), Space Mono (body) |
| Build | expo-build-properties | ~57.0.8 (Android cleartext HTTP) |
| Dist | EAS Build | profiles: `preview` (APK), `production` (app-bundle) |
| Assets | expo-asset, expo-font | ~57.0.x |

## Runtime layout

```
data/            server-side downloads + caches
app/android/     generated native project (dev build)
app/.expo/       Expo tooling cache
```

## Version pins that matter

- Node **20.19.4+** required for RN 0.86 native builds.
- Python **3.10+** and **ffmpeg** on PATH.
- Expo SDK 57 docs are the only valid reference for app APIs.
