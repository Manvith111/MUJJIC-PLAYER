"""FastAPI entrypoint for the terminal-music backend.

Run locally:  uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload
"""
import importlib.metadata
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .routes import artwork, download, lyrics, playlists, recommend, search, stream, versions, video

app = FastAPI(title="Terminal Music Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, tags=["search"])
app.include_router(stream.router, tags=["stream"])
app.include_router(download.router, tags=["download"])
app.include_router(recommend.router, tags=["recommend"])
app.include_router(lyrics.router, tags=["lyrics"])
app.include_router(artwork.router, tags=["artwork"])
app.include_router(playlists.router, tags=["playlists"])
app.include_router(versions.router, tags=["versions"])


app.include_router(video.router, tags=["video"])


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "terminal-music",
        "versions": {
            "yt-dlp": _ver("yt_dlp"),
            "ytmusicapi": _ver("ytmusicapi"),
            "fastapi": _ver("fastapi"),
        },
    }


def _ver(package: str) -> str:
    try:
        return importlib.metadata.version(package)
    except importlib.metadata.PackageNotFoundError:
        return "unknown"


@app.get("/")
def root():
    return {
        "service": "terminal-music",
        "endpoints": [
            "/search", "/stream/{id}", "/download/{id}",
            "/recommend/{id}", "/artwork/{id}",
            "/yt-playlists/public/{id}", "/yt-playlists/library",
            "/versions", "/health",
        ],
    }
