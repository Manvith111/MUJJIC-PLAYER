---
name: server-development
description: Working on the Python FastAPI backend in server/. Use when editing routes, services, models, config, or anything touching yt-dlp / ytmusicapi / httpx. Covers structure, endpoint contract, and upstream-lib isolation.
---

# Server development (FastAPI)

The backend is **Python 3.10+ / FastAPI** that wraps **ytmusicapi** (search, radio,
lyrics) and **yt-dlp** (stream URL resolution, downloads). It proxies audio so the app
never talks to expiring/IP-locked googlevideo URLs. Requires **ffmpeg** on PATH for
downloads.

## Structure

```
server/
  main.py            FastAPI app: CORS, include routers, /health, /
  config.py          env-driven config (TM_* vars); creates data/ dirs at import
  routes/            thin HTTP layer only
    search.py         GET /search?q=&type=songs|albums|artists|playlists&limit=
    stream.py         GET /stream/{video_id}  — Range-aware proxy (streams audio)
    download.py       GET /download/{video_id} — yt-dlp+ffmpeg → m4a FileResponse
    recommend.py      GET /recommend/{video_id}?limit=  — radio/autoplay tracks
    lyrics.py         GET /lyrics/{video_id} and GET /synced/{video_id}
    artwork.py        GET /artwork/{video_id} — thumbnail proxy w/ resolution fallback
  services/
    models.py        pydantic models: Track, Album, Artist, PlaylistItem, SearchResponse
    ytmusic.py       ytmusicapi wrapper + mappers (all upstream shape handling here)
    ytdlp.py         stream URL resolution (cached TTL) + downloads
  requirements.txt   fastapi, uvicorn, yt-dlp, ytmusicapi, httpx, mutagen, pydantic
```

## Rules

- **Routes stay thin.** Any ytmusicapi/yt-dlp shape handling belongs in
  `services/`. Catch upstream errors and raise `HTTPException(502)` with a clean
  message (mirrors existing routes).
- **The API contract is sacred.** Responses serialize the pydantic models in
  `services/models.py`; the app's `src/api/client.ts` types mirror them. Changing a
  field means changing both sides.
- **Blocking calls off the event loop.** yt-dlp / ffmpeg run via
  `anyio.to_thread.run_sync` (see `download.py`).
- **Config via env.** Add anything new to `config.py` with a `TM_`-prefixed env var
  and a sensible default (e.g. `TM_STREAM_URL_TTL`, `TM_DOWNLOAD_FORMAT`).
- **Cache expensive resolutions.** Stream URLs are cached with a TTL
  (`config.STREAM_URL_TTL`) in `ytdlp._url_cache`; the `YTMusic` instance is cached
  with `lru_cache` in `ytmusic._yt`.
- **Keep upstream libs isolated.** If ytmusicapi/yt-dlp change their output shapes,
  only `services/ytmusic.py` / `services/ytdlp.py` need edits.

## Streaming notes (stream.py)

- Forwards the client's `Range` header upstream and relays `content-range` /
  `content-length` so the player can seek.
- Hop-by-hop headers (`content-encoding`, `transfer-encoding`, …) are stripped.
- Streams in 64 KB chunks; both client and upstream are closed in `finally`.

## Downloads (ytdlp.download_audio)

- Format: `bestaudio/best` → `FFmpegExtractAudio` to m4a, plus `FFmpegMetadata` and
  `EmbedThumbnail`. Output: `data/downloads/<videoId>.m4a` (already-downloaded files
  are returned as-is).

## Lyrics

- `ytmusic.lyrics`: YT Music browseId → lyrics, then best-effort translate to English
  via the free Google endpoint (optional; returns original on failure).
- `ytmusic.synced_lyrics`: matched from **lrclib.net** by title/artist/duration with a
  fuzzy-search fallback. Returns `{ synced, plain }`.

## Running

- Dev: `.venv\Scripts\uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload`
  (see `knowledge/commands.md`).
- Health: `GET /health` → `{"status":"ok","service":"terminal-music"}`.
