"""Runtime configuration for the backend.

Everything is overridable via environment variables so the exact same code runs
on the user's PC now and on their own server later.
"""
import os
from pathlib import Path

HOST = os.getenv("TM_HOST", "0.0.0.0")
PORT = int(os.getenv("TM_PORT", "8000"))

# Where downloaded audio + caches live. Defaults to a folder next to the code.
DATA_DIR = Path(os.getenv("TM_DATA_DIR", Path(__file__).resolve().parent.parent / "data"))
DOWNLOAD_DIR = DATA_DIR / "downloads"
CACHE_DIR = DATA_DIR / "cache"

# CORS: "*" is fine for LAN/dev. Tighten when moving to a public server.
CORS_ORIGINS = os.getenv("TM_CORS_ORIGINS", "*").split(",")

# How long a resolved stream URL is trusted before we re-resolve it (seconds).
STREAM_URL_TTL = int(os.getenv("TM_STREAM_URL_TTL", "1800"))

# Audio format for downloads: m4a keeps things small and Android-friendly.
DOWNLOAD_AUDIO_FORMAT = os.getenv("TM_DOWNLOAD_FORMAT", "m4a")

# YouTube Data API key — used to fetch public playlists without OAuth.
YOUTUBE_API_KEY = os.getenv("TM_YOUTUBE_API_KEY", "AIzaSyAcLI2nm94mYEb6hWu7eaxez34GQEwIbn8")

YTMUSIC_OAUTH_PATH = DATA_DIR / "oauth.json"

for _d in (DATA_DIR, DOWNLOAD_DIR, CACHE_DIR):
    _d.mkdir(parents=True, exist_ok=True)
