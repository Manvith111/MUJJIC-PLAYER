"""yt-dlp helpers: resolve a playable audio URL and download audio to disk.

Stream URLs are cached briefly (they expire) so repeated range requests from the
player don't each trigger a fresh extraction.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

from yt_dlp import YoutubeDL

from .. import config

# videoId -> (direct_url, mime, expires_at)
_url_cache: dict[str, tuple[str, str, float]] = {}

_COMMON_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "noplaylist": True,
    "skip_download": True,
}


def _watch_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


def resolve_stream(video_id: str) -> tuple[str, str]:
    """Return (direct_audio_url, mime_type) for an audio-only stream."""
    cached = _url_cache.get(video_id)
    now = time.time()
    if cached and cached[2] > now:
        return cached[0], cached[1]

    opts = {**_COMMON_OPTS, "format": "bestaudio[ext=m4a]/bestaudio/best"}
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(_watch_url(video_id), download=False)

    url = info.get("url")
    if not url:
        # When a merged/multiple format is selected, dig into requested_formats.
        fmts = info.get("requested_formats") or []
        if fmts:
            url = fmts[0].get("url")
    if not url:
        raise RuntimeError(f"Could not resolve stream URL for {video_id}")

    ext = info.get("ext", "m4a")
    mime = {"m4a": "audio/mp4", "webm": "audio/webm", "mp3": "audio/mpeg"}.get(ext, "audio/mp4")
    _url_cache[video_id] = (url, mime, now + config.STREAM_URL_TTL)
    return url, mime


def track_meta(video_id: str) -> dict:
    """Lightweight metadata (title/artist/duration) for a single video."""
    with YoutubeDL(_COMMON_OPTS) as ydl:
        info = ydl.extract_info(_watch_url(video_id), download=False)
    return {
        "id": video_id,
        "title": info.get("track") or info.get("title"),
        "artist": info.get("artist") or info.get("uploader"),
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
    }


def download_audio(video_id: str) -> Path:
    """Download bestaudio, extract to the configured format, return the file path."""
    fmt = config.DOWNLOAD_AUDIO_FORMAT
    out_tmpl = str(config.DOWNLOAD_DIR / "%(id)s.%(ext)s")
    final_path = config.DOWNLOAD_DIR / f"{video_id}.{fmt}"
    if final_path.exists():
        return final_path

    opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "format": "bestaudio/best",
        "outtmpl": out_tmpl,
        "postprocessors": [
            {"key": "FFmpegExtractAudio", "preferredcodec": fmt, "preferredquality": "0"},
            {"key": "FFmpegMetadata"},
            {"key": "EmbedThumbnail"},
        ],
        "writethumbnail": True,
    }
    with YoutubeDL(opts) as ydl:
        ydl.download([_watch_url(video_id)])

    if not final_path.exists():
        raise RuntimeError(f"Download failed for {video_id}")
    return final_path


def downloaded_path(video_id: str) -> Optional[Path]:
    p = config.DOWNLOAD_DIR / f"{video_id}.{config.DOWNLOAD_AUDIO_FORMAT}"
    return p if p.exists() else None
