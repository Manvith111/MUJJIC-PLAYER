"""YouTube Music playlist import endpoints.

Fetches public playlists by ID and (when authenticated) the user's library
playlists. Tracks are returned as metadata only — the app searches for them
at playback time.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services import ytmusic
from ..services.models import PlaylistItem, YTMusicPlaylistResponse

router = APIRouter()


@router.get("/yt-playlists/auth/status")
def yt_auth_status():
    return {"authenticated": ytmusic.is_authenticated()}


class OAuthSetupRequest(BaseModel):
    oauth_json: str


@router.post("/yt-playlists/auth/setup")
def yt_auth_setup(body: OAuthSetupRequest):
    ok = ytmusic.setup_oauth(body.oauth_json)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid OAuth JSON")
    return {"authenticated": True}


@router.get("/yt-playlists/public/{playlist_id}", response_model=YTMusicPlaylistResponse)
def fetch_public_playlist(playlist_id: str):
    result = ytmusic.fetch_public_playlist(playlist_id)
    if not result:
        raise HTTPException(status_code=404, detail="Playlist not found or not accessible")
    return result


@router.get("/yt-playlists/library", response_model=list[PlaylistItem])
def list_library_playlists():
    if not ytmusic.is_authenticated():
        raise HTTPException(status_code=503, detail="YouTube Music not authenticated — set up OAuth first")
    return ytmusic.fetch_library_playlists()


@router.get("/yt-playlists/library/{playlist_id}", response_model=YTMusicPlaylistResponse)
def fetch_library_playlist(playlist_id: str):
    if not ytmusic.is_authenticated():
        raise HTTPException(status_code=503, detail="YouTube Music not authenticated — set up OAuth first")
    result = ytmusic.fetch_library_playlist(playlist_id)
    if not result:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return result
