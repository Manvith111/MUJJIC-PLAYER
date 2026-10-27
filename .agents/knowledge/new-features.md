# New Features to Add

Backlog of features not yet implemented. Priority: **P0** (core polish, do first) →
**P3** (future). Promote an item to `roadmap/ROADMAP.md` when you start it; write a
`plan-<feature>.md` in this folder for anything non-trivial.

## P0 — Core polish

- [ ] **Downloads UI**: batch download (whole playlist/album), per-track progress %,
  queue of downloads, retry on failure, download-all-offline toggle.
- [ ] **Album / Artist / Playlist detail pages** (currently you can only browse search
  results and your own playlists). Needs server support: `GET /album/{browseId}`
  (`ytmusic.album_tracks` already exists but is unexposed), artist, playlist.
- [ ] **Queue persistence across restarts** (save queue + position to AsyncStorage).
- [ ] **Empty-state / offline-first UX**: show cached artwork, "you're offline" banner,
  play from library with no backend.

## P1 — Discovery & playback

- [ ] **Lyrics karaoke highlight** synced to playback position (LRC lines light up).
- [ ] **Smart offline / cache streaming**: ring-buffer cache of streamed songs so
  recently played songs play offline without explicit download.
- [ ] **Playback speed control** (0.5×–2×).
- [ ] **Equalizer / audio effects** (check expo-audio capabilities first; otherwise note
  as platform limitation).
- [ ] **Personalized radio stations** ("Start radio" from any song/album/artist).
- [ ] **Genre/decade browsing** beyond the home "Explore" row (curated category pages).

## P2 — Library & sync

- [ ] **Import from other apps / file picker** (add local files to library).
- [ ] **Playlist export/import** (JSON / share).
- [ ] **Cloud sync of library** (favorites, playlists, history) — needs server accounts.
- [ ] **Song dedup + metadata editing** for downloaded files (mutagen is already a dep).
- [ ] **Favorites/pins sync** across devices via the backend.

## P3 — Scale, distribution, advanced

- [ ] **User accounts + auth on the server** (JWT), per-user playlists/likes.
- [ ] **Public hosting story**: Dockerfile + docker-compose, rate limiting, request
  caching, HTTPS, CORS tightening (currently `*`), reverse-proxy notes.
- [ ] **Tests**: pytest for `server/services` + route handlers; jest/RNTL for
  `audio/player.ts` and screens.
- [ ] **CI/CD**: lint + typecheck + tests on push; EAS build on tags.
- [ ] **Cast / Chromecast** and **Android Auto**.
- [ ] **Widgets** (home-screen now playing) and richer **notifications**.
- [ ] **iOS support** (config is already partial: `UIBackgroundModes` set).
- [ ] **Multiple theme variants** (custom accent, light terminal).
- [ ] **Web app polish** (`.web.ts` splits exist; media session API, PWA).
- [ ] **Keyboard shortcuts / terminal CLI mode** for desktop.

## Ideas backlog (unvetted)

- Podcasts / long-form audio via yt-dlp bestaudio (no music-only filter).
- Share-a-song links (deep links `terminalmusic://`).
- A-B loop presets, gesture to repeat, haptics on vinyl spin.
- Server-side "top tracks for user" analytics.
- Smart playlists (auto rules: recently added, most played, never played).
