# Roadmap

Direction of travel for Terminal Music. Work items map to `knowledge/new-features.md`;
each started item gets a `plan-<feature>.md` in `knowledge/`.

Legend: ✅ done · 🚧 in progress · ⏳ planned.

## Phase 0 — Foundation (done ✅)

- Backend: search, Range streaming, m4a downloads, radio, lyrics (+EN translation),
  synced lyrics, artwork proxy, env-config, LAN-first.
- App: terminal UI, full playback engine, SQLite library, offline downloads + SAF copy,
  settings, help overlay, home feed, APK builds.
- Dev ergonomics: `start.ps1`, `build-apk.ps1`, `allow-firewall.ps1`, web support.

## Phase 1 — Core polish (next)

Goal: make daily listening feel complete on the phone. Pulls from the P0 backlog.

- [ ] Downloads UX: batch download, progress %, queue, retries, offline mode banner.
- [ ] Album / Artist / Playlist detail pages (expose `album_tracks`; add artist/playlist
      browse endpoints).
- [ ] Queue persistence across restarts.
- [ ] Offline-first: cached artwork + graceful no-backend playback.
- [ ] Close the doc debt: fix root README (expo-audio vs track-player), stale `GET /`
      endpoint list.
- [ ] Add a real test scaffold (pytest + jest) before the next feature phase.

Exit criteria: a user on a plane can browse library, play downloads, and never see an
error because the backend is unreachable.

## Phase 2 — Discovery & playback depth

- [ ] Lyric karaoke highlight synced to playback.
- [ ] Smart offline (ring-cache of streamed tracks).
- [ ] Playback speed control.
- [ ] Start-radio from anywhere; genre/decade browsing pages.
- [ ] Playlist export/import; add local files from device storage.

Exit criteria: the app is a credible daily driver for music discovery, not just search.

## Phase 3 — Reliability & distribution

- [ ] Tests in CI (lint, typecheck, unit) + EAS build on tags.
- [ ] Dockerize the server (Dockerfile + compose) and publish run docs.
- [ ] Server hardening: rate limiting, response caching, tightened CORS, HTTPS/reverse
      proxy guide.
- [ ] Optional user accounts + cloud library sync (favorites/playlists/history).

Exit criteria: someone can self-host the backend from a Docker image and the APK ships
from CI.

## Phase 4 — Advanced / future

- [ ] Cast / Chromecast, Android Auto, home-screen widget.
- [ ] iOS build pass (config partially present).
- [ ] Theme variants (custom accent, light mode).
- [ ] Web app polish (media session API, PWA).
- [ ] Smart playlists (auto rules) and deeper analytics.

## Guardrails

- Keep the **single API contract** stable; change client types in lockstep with server
  models.
- Keep the app **configurable at runtime** (Settings → Backend URL) — never hardcode a
  host in the app except as a default.
- Preserve **offline-first** and **background playback** as non-negotiables in any
  feature work.
- Every phase exit criteria is verifiable on the current Windows + Android flow
  (`./start.ps1` / `./build-apk.ps1`).
