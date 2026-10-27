# Terminal Music — Android app

A terminal-styled music player (Expo / React Native) that talks to the Python backend in
[`../server`](../server). Playback is built on **expo-audio** (background + lock-screen
controls, free, first-party). Queue, repeat, shuffle, A–B loop, autoplay, downloads, and
the library are implemented in-app.

## Prerequisites

- **Node 20.19.4+** (0.86 requires it — you currently have 20.19.0; bump it before a native build).
- The **backend running** (see [../README.md](../README.md)).
- To run on a phone: **Android Studio** (emulator) or a physical Android device with USB debugging.

## 1. Point the app at the backend

Open the app → **⚙ Settings** → set **Backend URL**:

- **Android emulator:** `http://10.0.2.2:8000` (default — the emulator's alias for your PC).
- **Physical phone (same Wi-Fi):** your PC's LAN IP, e.g. `http://192.168.1.20:8000`
  (find it with `ipconfig`). Make sure the backend was started with `--host 0.0.0.0`.
- **Your own server later:** just paste its URL here. No code change.

Use **test connection** to confirm it's reachable.

## 2. Run it

### Full features (recommended) — dev build

expo-audio's background playback and lock-screen controls need a **dev build** (not Expo Go):

```bash
cd app
npx expo run:android      # builds & installs the dev app on emulator/device
```

### Quick look — Expo Go

Basic in-app playback works in Expo Go, but **background audio and lock-screen controls
do not** (the config plugin isn't applied in Expo Go):

```bash
cd app
npx expo start            # scan the QR with Expo Go
```

## Features

Search (songs/artists/albums/playlists) · stream · play/pause · next/prev · seek ±10s ·
tap-to-seek · volume · **shuffle** · **repeat** off/all/one · **A–B loop** · **queue**
(view + jump) · **autoplay** (radio when the queue drains) · **recommendations** ·
**download for offline** + offline playback · **favorites** · **playlists** · **history** ·
**sleep timer** · album-art banner · help overlay.

## Project map

```
app/
  App.tsx                 root: hydrate settings, init audio + library, view router
  src/
    api/client.ts         backend calls (configurable base URL)
    audio/player.ts       expo-audio engine + queue/repeat/shuffle/A-B/autoplay
    audio/sleep.ts        sleep timer
    db/library.ts         SQLite: favorites, downloads, history, playlists
    downloads/manager.ts  offline downloads (expo-file-system File API)
    store/                settings + UI/search state (zustand)
    components/           TerminalFrame, TabBar, PlayerBar, SeekBar, Banner, rows…
    screens/              Main, NowPlaying, Queue, Library, Settings
    theme/terminal.ts     palette, mono font, box tokens
```
