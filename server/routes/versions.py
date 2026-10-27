"""Dependency version reporting.

Exposes the installed versions of key upstream libraries so the app and the
update-check script can see what's running without inspecting the venv.
"""
import importlib.metadata
from fastapi import APIRouter

router = APIRouter()

# Packages to track — display name → import name (when they differ).
_PACKAGES: dict[str, str] = {
    "fastapi": "fastapi",
    "uvicorn": "uvicorn",
    "yt-dlp": "yt_dlp",
    "ytmusicapi": "ytmusicapi",
    "httpx": "httpx",
    "mutagen": "mutagen",
    "pydantic": "pydantic",
}


def _installed_version(package_name: str) -> str:
    try:
        return importlib.metadata.version(package_name)
    except importlib.metadata.PackageNotFoundError:
        return "not installed"


@router.get("/versions")
def versions():
    """Return installed versions of every tracked dependency."""
    return {name: _installed_version(import_name) for name, import_name in _PACKAGES.items()}
